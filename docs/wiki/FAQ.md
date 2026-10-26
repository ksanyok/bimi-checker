# FAQ

## Do I need a VMC to use BIMI?

Yahoo and some others show a logo from a self-asserted record without a certificate. Gmail and Apple Mail require a Verified Mark Certificate (registered trademark) or a Common Mark Certificate. Without `a=` this tool shows a warning, not an error.

## Why does my exported SVG fail?

Design tools export SVG 1.1 with `x`/`y` on the root, no `<title>` and sometimes embedded bitmaps. BIMI needs SVG Tiny PS: set `version="1.2"` and `baseProfile="tiny-ps"`, add `<title>Brand name</title>`, remove `x`/`y`, scripts and external links, and make it square.

## Is p=none enough for BIMI?

No. BIMI only works with DMARC enforcement: `p=quarantine` or `p=reject`, applied to 100% of mail (`pct=100` or no pct at all).

## Where do I host the logo and certificate?

Anywhere over HTTPS with a valid certificate — your own site or a CDN. Many certificate authorities host them for you.

## I set everything up but Gmail still shows no logo

Gmail caches and also uses sender reputation; logos can take days to appear and need consistent DMARC-passing volume. If this tool reports no errors, the setup itself is correct.
