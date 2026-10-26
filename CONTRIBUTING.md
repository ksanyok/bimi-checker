# Contributing to BIMI Checker

Thanks for taking the time to help!

## Reporting bugs

Open an [issue](https://github.com/ksanyok/bimi-checker/issues/new/choose) with:

- the exact command you ran (or the code that calls the library),
- what you expected and what happened instead,
- your Node.js version (`node -v`) and operating system.

If the problem involves a public website or domain, include it — it makes the bug much easier to reproduce.

## Development

```bash
git clone https://github.com/ksanyok/bimi-checker.git
cd bimi-checker
npm test            # runs the node:test suite, no install needed
node bin/cli.js --help
```

The project has **zero runtime dependencies** and targets Node.js 18+. Please keep it that way:
use the standard library (`fetch`, `node:dns`, `node:test`) instead of adding packages.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Add or update tests in `test/` for any behaviour change.
3. Run `npm test` and make sure it passes.
4. Describe the change and the reason for it in the PR.

By contributing you agree that your contribution is licensed under the MIT License.
