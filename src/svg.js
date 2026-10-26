/**
 * Validate an SVG against the practical rules of the BIMI SVG Tiny Portable/Secure profile.
 * This is a static check of the markup, not a full RelaxNG validation.
 * @param {string} svg
 * @param {number} [bytes] size of the file in bytes
 * @returns {{level: 'error'|'warning'|'info', code: string, message: string}[]}
 */
export function lintSvg(svg, bytes = Buffer.byteLength(svg)) {
  const out = [];
  const add = (level, code, message) => out.push({ level, code, message });
  const root = /<svg\b[^>]*>/i.exec(svg)?.[0];
  if (!root) { add('error', 'not-svg', 'The logo file is not an SVG document.'); return out; }
  const attr = (name) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(root)?.[1];
  if (attr('version') !== '1.2') add('error', 'svg-version', `Root <svg> must have version="1.2" (found ${attr('version') ? `"${attr('version')}"` : 'none'}).`);
  if (attr('baseProfile') !== 'tiny-ps') add('error', 'svg-profile', `Root <svg> must have baseProfile="tiny-ps" (found ${attr('baseProfile') ? `"${attr('baseProfile')}"` : 'none'}).`);
  if (attr('x') !== undefined || attr('y') !== undefined) add('error', 'svg-xy', 'Root <svg> must not have x or y attributes.');
  if (!/<title\b[^>]*>[^<]+<\/title>/i.test(svg)) add('error', 'svg-title', 'A non-empty <title> element (the brand name) is required.');
  if (/<script\b/i.test(svg)) add('error', 'svg-script', 'Scripts are not allowed.');
  if (/<(image|foreignObject|animate\w*|set)\b/i.test(svg)) add('error', 'svg-forbidden-element', 'Embedded images, foreignObject and animation elements are not allowed.');
  if (/\s(on\w+)\s*=/i.test(svg)) add('error', 'svg-event-handler', 'Event handler attributes (onload, onclick…) are not allowed.');
  if (/(xlink:)?href\s*=\s*["'](?!#)/i.test(svg)) add('error', 'svg-external-ref', 'References to external resources are not allowed (only #fragment links).');
  const vb = attr('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (!vb || vb.length !== 4 || vb.some(Number.isNaN)) add('warning', 'svg-viewbox', 'No valid viewBox: the logo may be scaled unpredictably.');
  else if (Math.abs(vb[2] - vb[3]) > 0.5) add('warning', 'svg-not-square', `The logo is not square (${vb[2]}×${vb[3]}); mail clients show it in a circle or square.`);
  if (bytes > 32 * 1024) add('warning', 'svg-size', `The SVG is ${Math.round(bytes / 1024)} KB; keep it under 32 KB.`);
  return out;
}
