# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

### Changed
- Set credential expiry behavior to non-expiring by default (`disableCredentialExpiry: true`) for both API and CLI unless explicitly disabled.
- Return UDP-only ICE URLs from native service output to match current runtime transport support.
- Validate relay port range options strictly: `minPort` and `maxPort` must be provided together.
- Add stricter CLI env parsing for numeric values:
  - `TURN_PORT`, `TURN_MIN_PORT`, `TURN_MAX_PORT` must be integers between `1` and `65535`.
  - `TTURN_TTL_SEC` must be a positive integer.

### Added
- Native Rust regression tests for:
  - partial relay range rejection,
  - valid relay range acceptance,
  - UDP-only ICE URL generation.
- Documentation updates in English and Chinese READMEs for:
  - paired `minPort` / `maxPort` requirement,
  - UDP-only transport note.
