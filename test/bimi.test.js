import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkBimi, parseBimi, lintSvg, inspectCertificate } from '../src/index.js';

const CERT = readFileSync(new URL('./fixtures/test-cert.pem', import.meta.url), 'utf8');
const GOOD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" version="1.2" baseProfile="tiny-ps" viewBox="0 0 100 100"><title>Example</title><circle cx="50" cy="50" r="40" fill="#8b5cf6"/></svg>';
const codes = (list) => list.map((i) => i.code);
const dns = (map) => async (name) => {
  if (!(name in map)) { const e = new Error('not found'); e.code = 'ENOTFOUND'; throw e; }
  return map[name];
};
const http = (map) => async (url) => {
  if (!(url in map)) return new Response('missing', { status: 404 });
  return new Response(map[url], { status: 200, headers: { 'content-type': 'image/svg+xml' } });
};

test('parses a valid record', () => {
  const p = parseBimi('v=BIMI1; l=https://example.com/logo.svg; a=https://example.com/vmc.pem');
  assert.deepEqual(p.errors, []);
  assert.equal(p.tags.l, 'https://example.com/logo.svg');
});

test('reports record syntax errors', () => {
  const e = parseBimi('l=http://example.com/logo.png; v=BIMI2').errors.join('\n');
  assert.match(e, /start with/);
  assert.match(e, /https/);
  assert.match(e, /\.svg/);
});

test('detects an explicit opt-out', () => {
  assert.equal(parseBimi('v=BIMI1; l=;').declined, true);
});

test('accepts a valid SVG Tiny PS logo', () => {
  assert.deepEqual(lintSvg(GOOD_SVG), []);
});

test('flags SVG profile violations', () => {
  const bad = '<svg xmlns="http://www.w3.org/2000/svg" x="0" y="0" viewBox="0 0 200 100" onload="x()"><script>1</script><image href="https://e.com/a.png"/></svg>';
  const c = codes(lintSvg(bad));
  for (const code of ['svg-version', 'svg-profile', 'svg-xy', 'svg-title', 'svg-script', 'svg-forbidden-element', 'svg-event-handler', 'svg-external-ref', 'svg-not-square']) {
    assert.ok(c.includes(code), code);
  }
  assert.ok(codes(lintSvg('not an svg')).includes('not-svg'));
});

test('inspects certificates and their validity', () => {
  const ok = inspectCertificate(CERT);
  assert.equal(ok.ok, true);
  assert.ok(codes(ok.issues).includes('cert-not-mark'));
  assert.match(ok.subject, /Example Test Mark/);
  const expired = inspectCertificate(CERT, new Date('2200-01-01'));
  assert.ok(codes(expired.issues).includes('cert-expired'));
  assert.ok(codes(inspectCertificate('nothing').issues).includes('cert-invalid'));
});

test('checks a full setup', async () => {
  const r = await checkBimi('example.com', {
    resolveTxt: dns({
      'default._bimi.example.com': ['v=BIMI1; l=https://cdn.test/logo.svg; a=https://cdn.test/vmc.pem'],
      '_dmarc.example.com': ['v=DMARC1; p=reject; rua=mailto:d@example.com'],
    }),
    fetch: http({ 'https://cdn.test/logo.svg': GOOD_SVG, 'https://cdn.test/vmc.pem': CERT }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.logo.status, 200);
  assert.match(r.certificate.subject, /Example/);
});

test('requires DMARC enforcement', async () => {
  const r = await checkBimi('example.com', {
    resolveTxt: dns({ 'default._bimi.example.com': ['v=BIMI1; l=https://cdn.test/logo.svg'], '_dmarc.example.com': ['v=DMARC1; p=none'] }),
    fetchAssets: false,
  });
  assert.equal(r.ok, false);
  assert.ok(codes(r.issues).includes('dmarc-not-enforced'));
  assert.ok(codes(r.issues).includes('no-certificate'));
});

test('missing record and broken logo URL', async () => {
  const none = await checkBimi('example.com', { resolveTxt: dns({ '_dmarc.example.com': ['v=DMARC1; p=reject'] }) });
  assert.ok(codes(none.issues).includes('no-bimi'));
  const broken = await checkBimi('mail.example.com', {
    resolveTxt: dns({ 'default._bimi.example.com': ['v=BIMI1; l=https://cdn.test/gone.svg'], '_dmarc.example.com': ['v=DMARC1; p=reject'] }),
    fetch: http({}),
  });
  assert.equal(broken.recordName, 'default._bimi.example.com');
  assert.ok(codes(broken.issues).includes('logo-http'));
});
