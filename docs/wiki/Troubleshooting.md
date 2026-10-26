# Troubleshooting

## "BIMI requires DMARC p=quarantine or p=reject"

Move your DMARC policy to enforcement first — check it with the [DMARC Checker](https://github.com/ksanyok/dmarc-checker). BIMI has no effect until then.

## "Could not download the logo"

The URL must be reachable over HTTPS without authentication, cookies or a bot challenge. Some CDNs block non-browser clients — make sure mail providers can fetch it.

## "The certificate does not look like a Verified or Common Mark Certificate"

`a=` points to a regular TLS certificate or a chain without the mark certificate first. Use the PEM file your certificate authority issued for BIMI, with the mark certificate as the first block.

## SVG warnings about size or squareness

Keep the logo under 32 KB (remove metadata, simplify paths) and use a square viewBox — providers crop to a circle or square.

## Still stuck?

Open an [issue](https://github.com/ksanyok/bimi-checker/issues/new/choose) with the command, the output (`--json` if possible) and your Node.js version — or compare with the [online version](https://promopilot.link/en/tools/bimi-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=bimi-checker).
