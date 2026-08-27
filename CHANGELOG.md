# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Completing the changelog when you ship

1. **During work** — Add bullets under `## [Unreleased]` using headings like **Added**, **Changed**, **Fixed** ([see categories](https://keepachangelog.com/en/1.1.0/#how)).
2. **On release** — Rename the accumulated `[Unreleased]` block to `## [x.y.z] - YYYY-MM-DD`, set the same `x.y.z` in `package.json`, and leave `[Unreleased]` empty again (or with “Nothing yet”).
3. **Optional** — Add compare links at the bottom ([example](https://keepachangelog.com/en/1.1.0/#effort)).

## [Unreleased]

## [1.0.6-local.4] - 2026-08-27

### Changed

- Gave the Peek editor and its gutter a subtle Zed-native contrast by using the translucent active-line surface instead of the normal editor background.

## [1.0.6-local.3] - 2026-08-27

### Fixed

- Added all Peek Definition/References colors and bound them to Zed editor, panel, surface, selection, and search styles instead of inheriting VS Code defaults.

## [1.0.6-local.2] - 2026-08-27

### Changed

- Pinned the palette to the One Dark asset embedded in Zed 1.17.2.
- Generated TextMate and semantic-token colors from Zed syntax style names instead of hand-maintained hex values.
- Matched Zed's default semantic-token classification for macros, events, documentation comments, constants, and default-library symbols.
- Corrected Go, C/C++, JSON, Bash, Python, and Markdown scope mappings.

### Fixed

- Removed six colors that were not present in Zed's One Dark palette.
- Corrected search matches, bracket matches, validation borders, unnecessary code, JSON delimiters, Go built-in constants, and Markdown emphasis.

## [1.0.6] - 2026-05-12

### Changed

- Color theme: added Makefile TextMate scopes for interpolated strings (including variable punctuation), `@` line control, `.PHONY` targets, and recipe blocks so Makefile highlighting matches the rest of the theme.

## [1.0.5] - 2026-05-11

### Fixed

- Updated the color theme release metadata for the current marketplace version.
- Documented the latest theme maintenance release.

## [1.0.0] - 2026-05-09

### Added

- Extension marketplace icon (`images/icon.png`, 128×128 PNG).
- **Onedark Zed** dark color theme (`themes/onedark-zed-color-theme.json`).
- **Onedark Zed Icons** file icon theme with SVG assets under `icons/`.
- README with install steps, optional Lilex font notes, preview screenshot (`docs/preview.png`), and license / third-party attribution.
- `LICENSE` (MIT), `package.json` fields for repository, homepage, bugs, and `engines.vscode` `^1.74.0`.
