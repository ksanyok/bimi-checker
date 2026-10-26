export const isBimi = (txt) => /^v\s*=\s*BIMI1\s*(;|$)/i.test(String(txt).trim());

/** Parse a BIMI assertion record ("v=BIMI1; l=https://…/logo.svg; a=https://…/vmc.pem"). */
export function parseBimi(record) {
  const errors = [];
  const tags = {};
  String(record).split(';').map((s) => s.trim()).filter(Boolean).forEach((part, i) => {
    const eq = part.indexOf('=');
    if (eq < 1) { errors.push(`Malformed tag "${part}" (expected name=value)`); return; }
    const name = part.slice(0, eq).trim().toLowerCase();
    if (i === 0 && name !== 'v') errors.push('The record must start with "v=BIMI1"');
    if (name in tags) errors.push(`Duplicate tag "${name}"`);
    tags[name] = part.slice(eq + 1).trim();
  });
  if (tags.v !== 'BIMI1') errors.push('v must be "BIMI1"');
  if (tags.l === undefined) errors.push('Missing "l=" tag (logo URL); use "l=" with an empty value to opt out explicitly');
  for (const t of ['l', 'a']) {
    if (!tags[t]) continue;
    if (!/^https:\/\/[^\s,]+$/i.test(tags[t])) errors.push(`${t}= must be a single https:// URL, got "${tags[t]}"`);
  }
  if (tags.l && !/\.svg(\?|$)/i.test(tags.l)) errors.push('l= should point to an .svg file');
  if (tags.a && !/\.pem(\?|$)/i.test(tags.a)) errors.push('a= should point to a .pem certificate file');
  const declined = tags.l === '' && !tags.a;
  return { tags, errors, declined };
}
