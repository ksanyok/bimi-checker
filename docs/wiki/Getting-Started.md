# Getting started

## Requirements

Node.js 18 or newer. No other dependencies.

## Install

```bash
# one-off run
npx github:ksanyok/bimi-checker example.com

# global CLI
npm install -g github:ksanyok/bimi-checker

# as a library in your project
npm install github:ksanyok/bimi-checker
```

## First run

```bash
bimi-checker example.com
```

The header lines show the record, the DMARC policy BIMI depends on, the downloaded logo (status and size) and the certificate type and expiry. Problems follow: `✖` errors stop providers from showing the logo, `!` warnings limit where it is shown or will soon break it.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | No errors (warnings allowed unless `--strict`) |
| 1 | Errors found (or warnings with `--strict`) |
| 2 | Bad arguments or the check could not run |

## More examples

**Lint your SVG before uploading it**

```bash
bimi-checker --svg logo.svg
```

**Lint a record before publishing it**

```bash
bimi-checker --record "v=BIMI1; l=https://example.com/bimi/logo.svg; a=https://example.com/bimi/vmc.pem"
```

**A custom selector, DNS only**

```bash
bimi-checker example.com --selector brand2 --no-fetch
```

## Without installing anything

Use the [online BIMI Checker](https://promopilot.link/en/tools/bimi-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=bimi-checker).
