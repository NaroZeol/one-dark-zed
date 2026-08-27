# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Completing the changelog when you ship

1. **During work** — Add bullets under `## [Unreleased]` using headings like **Added**, **Changed**, **Fixed** ([see categories](https://keepachangelog.com/en/1.1.0/#how)).
2. **On release** — Rename the accumulated `[Unreleased]` block to `## [x.y.z] - YYYY-MM-DD`, set the same `x.y.z` in `package.json`, and leave `[Unreleased]` empty again (or with “Nothing yet”).
3. **Optional** — Add compare links at the bottom ([example](https://keepachangelog.com/en/1.1.0/#effort)).

## [Unreleased]

Nothing yet.

## [1.3.0] - 2026-08-28

### Changed

- Adopted a shared semantic-token palette without making any language server a
  runtime dependency of the theme.
- Mapped common provider-defined semantic types from Pylance, C#, C/C++,
  rust-analyzer, and TOML to consistent roles in the pinned Zed syntax palette.

### Added

- Added a real semantic-token integration matrix for Go, TypeScript,
  JavaScript, C, C++, and Rust with 223 symbol contracts across four language
  servers.
- Added 109 static type/modifier rules for five widely used language extensions
  and 102 generated role-precedence contracts.
- Made provider tests fail on unclassified semantic modifiers so new callable
  metadata cannot silently fall back to a generic variable role.
- Added regression coverage for properties on both sides of assignments in
  Go, C, C++, TypeScript, JavaScript, Python, and Rust, plus all six reported Go
  qualified type aliases.
- Expanded the pinned VS Code grammar fallback suite to 334 executable lexical
  checks across 61 languages.
- Added a small, parser-tested Go import decoration so semantic namespace
  overlays cannot split the color of an import string.
- Added a provider-driven namespace context layer: qualifiers that resolve
  types retain the namespace color, while qualifiers that carry runtime
  functions or values use the normal variable color across languages.

### Fixed

- Regenerated the committed theme so readonly variables use the normal Zed
  variable color instead of the stale named-constant color.
- Enabled Go and gopls semantic tokens through the extension manifest so
  packages, types, parameters, and fields remain distinguishable.
- Made the Go provider regression consume the shipped gopls default, preventing
  test-only configuration from masking editor behavior.
- Styled readonly default-library variables as built-in constants, restoring
  visible coloring for values such as Go's `nil`, `true`, and `false`.
- Styled standard-library globals as built-in constants and events as members
  instead of types.
- Styled function-valued variables, parameters, and fields as callable symbols,
  including callbacks used by deferred cleanup.
- Unified ordinary function parameters with normal variable coloring across
  languages; callable parameters still use the higher-priority function role.

### Removed

- Removed the forked Go grammar and all language-specific injection grammars;
  TextMate is now a lexical fallback instead of a replacement semantic parser.

## [1.2.0] - 2026-08-28

### Added

- Added a pinned VS Code 1.135.0 integration suite covering 310 tokens across
  61 bundled language grammars.
- Added narrowly scoped grammar corrections for JavaScript/TypeScript
  constants, JSON/SQL literals, C/Rust types, INI values, WAT symbols,
  Objective-C++ types, Raku symbols, and Visual Basic symbols.

### Changed

- Disabled semantic highlighting by default to match Zed's Tree-sitter-first
  highlighting behavior while retaining an opt-in semantic palette.
- Aligned selection, drag target, modified state, scrollbar, bracket, and
  border colors with the pinned Zed One Dark source.
- Expanded syntax mappings for declarations, regex delimiters, Markdown links,
  CSS selectors, markup, and language-specific scopes backed by Zed queries.

### Fixed

- Made comment delimiters use the same color as their comment body across
  shell, batch, Pug, and other TextMate grammars.
- Prevented lowercase JavaScript/TypeScript constants and type annotations from
  being colored as named constants.

## [1.1.0] - 2026-08-27

### Added

- Added reproducible Zed palette and Go grammar generation with regression tests.
- Added explicit fork provenance and complete third-party licensing notices.
- Added Marketplace-ready metadata and Windows/VSIX installation instructions.
- Added the unique Marketplace extension ID `NaroZeol.zed-onedark-vscode`.

### Changed

- Renamed the published color theme to **Zed One Dark**.
- Consolidated the local development releases into a public fork release.
- Distributed the combined Zed-derived work under GPL-3.0-or-later while
  preserving the original repository, VS Code, and Lucide notices.

### Removed

- Removed machine-transfer and migration instructions from the repository.

## [1.0.6-local.6] - 2026-08-27

### Added

- Added a generated Go grammar patch that classifies non-call selectors as Zed-style properties while preserving type and function scopes.
- Added token-level regression tests using VS Code's TextMate and Oniguruma engines.

### Changed

- Enabled semantic highlighting by default for languages with mature semantic providers; Go remains on the patched TextMate path because gopls does not distinguish fields from generic variables.
- Expanded cross-language TextMate coverage for Python attributes, Java/C++/JavaScript object properties, C# fields/properties/parameters, Lua attributes, inherited types, and enum members.
- Added Zed palette mappings for common Rust, Pylance, C#, JSON, and embedded-markup semantic token types.

## [1.0.6-local.5] - 2026-08-27

### Changed

- Disabled semantic highlighting by default to match Zed's Tree-sitter-first default and reduce language-server color overrides.
- Added a hard performance budget for TextMate rules, TextMate selectors, compound selectors, and optional semantic-token selectors.
- Aligned HTML/XML tag punctuation with Zed brackets and YAML/JSON/Proto field names with Zed properties.

### Fixed

- Colored Go import paths as Zed strings while keeping package aliases and package declarations as namespaces.

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
