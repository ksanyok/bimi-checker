#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { checkBimi, parseBimi, lintSvg } from '../src/index.js';

const HELP = `Usage: bimi-checker <domain> [options]
       bimi-checker --record "v=BIMI1; l=https://example.com/logo.svg; a=https://example.com/vmc.pem"
       bimi-checker --svg logo.svg

Checks the BIMI record at <selector>._bimi.<domain>, the DMARC enforcement BIMI
requires, the SVG Tiny PS logo and the Verified/Common Mark Certificate.

Options:
  --selector <s>    BIMI selector (default: "default")
  --record <bimi>   Lint a record string offline instead of querying DNS
  --svg <file>      Lint a local SVG file against the SVG Tiny PS rules
  --no-fetch        Do not download the logo and certificate
  --json            Print the full report as JSON
  --strict          Exit with code 1 on warnings too
  -h, --help        Show this help

Online version (no install): https://promopilot.link/en/tools/bimi-checker.php
`;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
if (!args.length || flag('-h') || flag('--help')) { process.stdout.write(HELP); process.exit(args.length ? 0 : 2); }

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const ICON = { error: c(31, '✖'), warning: c(33, '!'), info: c(36, 'i') };
const valued = new Set(['--selector', '--record', '--svg']);
const domain = args.find((a, i) => !a.startsWith('-') && !valued.has(args[i - 1]));

try {
  let report;
  if (value('--svg')) {
    const svg = readFileSync(value('--svg'), 'utf8');
    const issues = lintSvg(svg);
    report = { file: value('--svg'), issues, ok: !issues.some((i) => i.level === 'error') };
  } else if (value('--record')) {
    const parsed = parseBimi(value('--record'));
    const issues = parsed.errors.map((m) => ({ level: 'error', code: 'syntax', message: m }));
    report = { record: value('--record'), tags: parsed.tags, issues, ok: !issues.length };
  } else {
    report = await checkBimi(domain, { selector: value('--selector'), fetchAssets: !flag('--no-fetch') });
  }
  if (flag('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const line = (k, v) => console.log(`${c(1, k.padEnd(13))} ${v}`);
    if (report.file) line('SVG:', report.file);
    if (report.domain) line('Domain:', report.domain);
    if (report.record !== undefined) line('BIMI record:', report.record || '(none)');
    if (report.domain) line('DMARC:', report.dmarc ? `p=${report.dmarc.p} pct=${report.dmarc.pct}` : '(none)');
    if (report.logo) line('Logo:', `${report.logo.url} (HTTP ${report.logo.status}, ${Math.round(report.logo.bytes / 1024)} KB)`);
    if (report.certificate?.subject) {
      line('Certificate:', `${report.certificate.type || 'unknown type'}, valid until ${report.certificate.validTo.slice(0, 10)}`);
      line('Subject:', report.certificate.subject.split('\n').find((l) => l.startsWith('O=') || l.startsWith('CN='))?.replace(/^\w+=/, '') || '');
    }
    console.log('');
    if (!report.issues.length) console.log(c(32, '✔ BIMI looks good'));
    for (const i of report.issues) console.log(`  ${ICON[i.level]} ${i.message}`);
  }
  const failing = report.issues.filter((i) => i.level === 'error' || (flag('--strict') && i.level === 'warning'));
  process.exit(failing.length ? 1 : 0);
} catch (err) {
  console.error(c(31, `Error: ${err.message}`));
  process.exit(2);
}
