# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-26

### Added
- `bimi-checker` CLI with `--json`, `--strict`, `--selector`, `--no-fetch`, offline `--record` and local `--svg` linting
- BIMI record parser with https/.svg/.pem checks and opt-out detection
- DMARC prerequisite check: policy quarantine/reject and pct=100
- SVG Tiny PS lint: version, baseProfile, title, x/y, scripts, external references, forbidden elements, square viewBox, 32 KB size
- VMC/CMC certificate inspection: mark type by OID, subject, issuer, validity and expiry warning
- Library API (`checkBimi`, `parseBimi`, `lintSvg`, `inspectCertificate`) with injectable resolver and fetch, and GitHub Action

[1.0.0]: https://github.com/ksanyok/bimi-checker/releases/tag/v1.0.0
