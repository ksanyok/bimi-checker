import { resolveTxt as dnsResolveTxt } from 'node:dns/promises';
import { X509Certificate } from 'node:crypto';
import { isBimi, parseBimi } from './parse.js';
import { lintSvg } from './svg.js';

export { isBimi, parseBimi } from './parse.js';
export { lintSvg } from './svg.js';

const MARK_OIDS = { '1.3.6.1.4.1.53087.1.1': 'VMC', '1.3.6.1.4.1.53087.4.1': 'CMC' };

async function defaultResolveTxt(name) {
  return (await dnsResolveTxt(name)).map((chunks) => chunks.join(''));
}

async function txtOrEmpty(resolveTxt, name) {
  try { return await resolveTxt(name); } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') return [];
    throw err;
  }
}

function cleanDomain(input) {
  const s = String(input || '').trim().toLowerCase();
  if (!s) throw new TypeError('A domain is required');
  return s.replace(/^[a-z]+:\/\//, '').replace(/[/?#].*$/, '').replace(/\.$/, '');
}

const orgDomain = (d) => d.split('.').slice(/\.(co|com|org|net|gov|ac)\.[a-z]{2}$/.test(d) ? -3 : -2).join('.');

/**
 * Inspect a PEM bundle from a= : the leaf certificate's validity, subject and mark type.
 * @param {string} pem
 */
export function inspectCertificate(pem, now = new Date()) {
  const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || [];
  if (!blocks.length) return { ok: false, issues: [{ level: 'error', code: 'cert-invalid', message: 'a= does not contain a PEM certificate.' }] };
  const cert = new X509Certificate(blocks[0]);
  const issues = [];
  const from = new Date(cert.validFrom);
  const to = new Date(cert.validTo);
  if (now < from) issues.push({ level: 'error', code: 'cert-not-yet-valid', message: `The certificate is valid only from ${from.toISOString().slice(0, 10)}.` });
  if (now > to) issues.push({ level: 'error', code: 'cert-expired', message: `The certificate expired on ${to.toISOString().slice(0, 10)}.` });
  else if ((to - now) / 864e5 < 30) issues.push({ level: 'warning', code: 'cert-expiring', message: `The certificate expires on ${to.toISOString().slice(0, 10)}.` });
  const der = cert.raw.toString('latin1');
  const type = Object.entries(MARK_OIDS).find(([oid]) => der.includes(encodeOid(oid)))?.[1] || null;
  if (!type) issues.push({ level: 'warning', code: 'cert-not-mark', message: 'The certificate does not look like a Verified or Common Mark Certificate.' });
  return { ok: !issues.some((i) => i.level === 'error'), type, subject: cert.subject, issuer: cert.issuer, validFrom: from.toISOString(), validTo: to.toISOString(), chain: blocks.length, issues };
}

function encodeOid(oid) {
  const [a, b, ...rest] = oid.split('.').map(Number);
  const bytes = [40 * a + b];
  for (const n of rest) {
    const enc = [n & 0x7f];
    for (let v = n >> 7; v > 0; v >>= 7) enc.unshift((v & 0x7f) | 0x80);
    bytes.push(...enc);
  }
  return Buffer.from(bytes).toString('latin1');
}

/**
 * Check a domain's BIMI record, its DMARC prerequisite, the SVG logo and the mark certificate.
 * @param {string} domain
 * @param {{selector?: string, resolveTxt?: Function, fetch?: typeof fetch, fetchAssets?: boolean}} [options]
 */
export async function checkBimi(domain, options = {}) {
  const resolveTxt = options.resolveTxt || defaultResolveTxt;
  const doFetch = options.fetch || globalThis.fetch;
  const selector = options.selector || 'default';
  const host = cleanDomain(domain);
  const issues = [];
  const add = (level, code, message) => issues.push({ level, code, message });
  const report = { domain: host, selector, record: null, tags: {}, dmarc: null, logo: null, certificate: null, issues };

  let name = `${selector}._bimi.${host}`;
  let records = (await txtOrEmpty(resolveTxt, name)).filter(isBimi);
  if (!records.length && orgDomain(host) !== host) {
    name = `${selector}._bimi.${orgDomain(host)}`;
    records = (await txtOrEmpty(resolveTxt, name)).filter(isBimi);
  }

  const dmarcHost = (await txtOrEmpty(resolveTxt, `_dmarc.${host}`)).length ? host : orgDomain(host);
  const dmarc = (await txtOrEmpty(resolveTxt, `_dmarc.${dmarcHost}`)).find((t) => /^v\s*=\s*DMARC1/i.test(t.trim())) || null;
  const tag = (t) => new RegExp(`(?:^|;)\\s*${t}\\s*=\\s*([^;\\s]+)`, 'i').exec(dmarc || '')?.[1]?.toLowerCase();
  report.dmarc = dmarc ? { record: dmarc, p: tag('p') || null, pct: tag('pct') ? +tag('pct') : 100 } : null;
  if (!dmarc) add('error', 'no-dmarc', 'BIMI requires DMARC, but the domain has no DMARC record.');
  else if (!['quarantine', 'reject'].includes(report.dmarc.p)) add('error', 'dmarc-not-enforced', `BIMI requires DMARC p=quarantine or p=reject; found p=${report.dmarc.p}.`);
  else if (report.dmarc.pct < 100) add('error', 'dmarc-pct', `BIMI requires DMARC pct=100; found pct=${report.dmarc.pct}.`);

  if (!records.length) { add('error', 'no-bimi', `No BIMI record at ${selector}._bimi.${host}.`); return { ...report, ok: false }; }
  if (records.length > 1) add('error', 'multiple-bimi', `${name} has ${records.length} BIMI records.`);
  report.record = records[0];
  report.recordName = name;
  const parsed = parseBimi(records[0]);
  report.tags = parsed.tags;
  for (const e of parsed.errors) add('error', 'syntax', e);
  if (parsed.declined) add('info', 'declined', 'The record explicitly declines BIMI (empty l=).');
  if (!parsed.tags.a) add('warning', 'no-certificate', 'No a= certificate: Gmail and Apple Mail show the logo only with a VMC or CMC.');

  if (options.fetchAssets !== false && doFetch) {
    if (parsed.tags.l && /^https:/i.test(parsed.tags.l)) {
      try {
        const res = await doFetch(parsed.tags.l, { redirect: 'follow' });
        const body = await res.text();
        report.logo = { url: parsed.tags.l, status: res.status, contentType: res.headers.get('content-type'), bytes: Buffer.byteLength(body) };
        if (!res.ok) add('error', 'logo-http', `The logo URL returned HTTP ${res.status}.`);
        else issues.push(...lintSvg(body, report.logo.bytes));
      } catch (err) { add('error', 'logo-fetch', `Could not download the logo: ${err.message}`); }
    }
    if (parsed.tags.a && /^https:/i.test(parsed.tags.a)) {
      try {
        const res = await doFetch(parsed.tags.a, { redirect: 'follow' });
        if (!res.ok) add('error', 'cert-http', `The certificate URL returned HTTP ${res.status}.`);
        else {
          report.certificate = inspectCertificate(await res.text());
          issues.push(...report.certificate.issues);
        }
      } catch (err) { add('error', 'cert-fetch', `Could not download or read the certificate: ${err.message}`); }
    }
  }
  return { ...report, ok: !issues.some((i) => i.level === 'error') };
}
