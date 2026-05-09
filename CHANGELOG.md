# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Completing the changelog when you ship

1. **During work** — Add bullets under `## [Unreleased]` using headings like **Added**, **Changed**, **Fixed** ([see categories](https://keepachangelog.com/en/1.1.0/#how)).
2. **On release** — Rename the accumulated `[Unreleased]` block to `## [x.y.z] - YYYY-MM-DD`, set the same `x.y.z` in `package.json`, and leave `[Unreleased]` empty again (or with “Nothing yet”).
3. **Optional** — Add compare links at the bottom ([example](https://keepachangelog.com/en/1.1.0/#effort)).

## [Unreleased]

## [1.0.0] - 2026-05-09

### Added

- Extension marketplace icon (`images/icon.png`, 128×128 PNG).
- **Onedark Zed** dark color theme (`themes/onedark-zed-color-theme.json`).
- **Onedark Zed Icons** file icon theme with SVG assets under `icons/`.
- README with install steps, optional Lilex font notes, preview screenshot (`docs/preview.png`), and license / third-party attribution.
- `LICENSE` (MIT), `package.json` fields for repository, homepage, bugs, and `engines.vscode` `^1.74.0`.
