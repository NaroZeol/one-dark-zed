# Local development log

This document records the local maintenance work that diverges from upstream
`premier213/one-dark-zed`. Release-facing details remain in
[`CHANGELOG.md`](../CHANGELOG.md); setup and day-to-day commands remain in
[`README.md`](../README.md).

## Objective

Reproduce Zed's built-in **One Dark** experience in VS Code-compatible editors
without turning the theme into an unmaintainable collection of hand-written
colors and language-specific overrides.

The implementation follows three rules:

1. Zed's vendored One Dark asset is the only color source.
2. Generated files are rebuilt from explicit mappings and pinned upstream
   inputs; do not hand-edit generated colors.
3. Prefer semantic tokens when a language server classifies symbols reliably;
   use a small grammar patch only when the semantic provider loses information.

## Local commit history

The local work lives on `local/zed-aligned`, six commits ahead of upstream
`main` as of 2026-08-27.

| Commit | Change | Design reason |
| --- | --- | --- |
| `46ce2a5` | Introduced the Zed-oriented syntax mapping and generator. | Replaced scattered theme edits with one mapping source and validation. |
| `9237b79` | Vendored Zed 1.17.2 One Dark and bound semantic/TextMate styles to it. | Ensures every emitted color comes from the real Zed palette. |
| `0f20ad0` | Added complete Peek Definition/References surface bindings. | VS Code's default Peek colors did not belong to the Zed surface system. |
| `5abc72b` | Gave Peek a subtle contrast from the normal editor surface. | Preserves spatial distinction without introducing a foreign color. |
| `3edc785` | Corrected Go imports and cross-language HTML/YAML/JSON/Proto scopes. | Fixed high-frequency grammar conflicts while retaining a bounded selector table. |
| `225d991` | Enabled broad semantic highlighting and added the generated Go grammar patch plus token tests. | Mature language servers provide the closest VS Code equivalent to Zed captures; gopls is the exception because it reports fields as generic variables. |

The backup branches are intentional recovery points:

- `backup/pre-go-scope-alignment-20260827` → `5abc72b`
- `backup/pre-cross-language-semantic-alignment-20260827` → `3edc785`

## Architecture

### Zed palette input

- `themes/zed-one-theme.upstream.json`: Zed 1.17.2 embedded One Dark asset.
- `themes/zed-upstream-metadata.json`: source, build, and normalized SHA-256.
- `themes/zed-style-bindings.json`: maps semantic token kinds and TextMate rule
  groups to Zed syntax style names.
- `themes/zed-ui-bindings.json`: maps VS Code workbench color keys to Zed UI
  style names.

### Generated VS Code theme

- `themes/zed-syntax-mapping.json`: the maintained TextMate selector groups.
- `scripts/apply-zed-syntax-map.sh`: resolves all mappings against the vendored
  Zed palette.
- `themes/onedark-zed-color-theme.json`: generated and committed runtime theme.

Run after changing a mapping or binding:

```sh
npm run sync:theme
npm test
```

### Go grammar exception

The theme enables semantic highlighting globally, but `package.json` disables
it for Go. Current gopls semantic tokens distinguish types and calls but report
ordinary fields as generic variables, which prevents Zed-style property color.

- `grammars/go.tmLanguage.upstream.json`: VS Code 1.135.0 built-in Go grammar.
- `grammars/go-upstream-metadata.json`: pinned normalized hash.
- `scripts/sync-go-grammar.sh`: adds one fallback rule for non-call selectors.
- `grammars/go.tmLanguage.json`: generated, minified runtime grammar.
- `scripts/test-go-grammar.mjs`: runs the grammar through VS Code's TextMate and
  Oniguruma engines.

The regression test proves that fields such as `a.config.JWT.AdminRoles` become
properties while `context.Context` remains a type and `obj.Method()` remains a
function.

Run after updating the vendored Go grammar:

```sh
npm run sync:grammar
npm test
```

## Validation contract

`npm test` verifies:

- every JSON artifact parses;
- vendored Zed and Go inputs match their pinned hashes;
- all UI and syntax colors belong to Zed's One Dark palette;
- generated mappings exactly match their source bindings;
- selector counts stay within explicit performance budgets;
- high-risk scope precedence remains correct;
- the Go grammar produces the expected token scopes.

The extension has no runtime JavaScript activation code. The only extra runtime
grammar cost is one Go selector fallback rule.

## Current state

- Branch: `local/zed-aligned`
- Extension version: `1.0.6-local.6`
- Theme label: `Zed One Dark Local`
- Icon theme id: `onedark-zed-icons`
- Last verified command: `npm test`
- Last verified result: theme validation and Go token regression both passed
- Working tree was clean before the migration-document commit

## Known limitations

- Exact 1:1 token classification is bounded by each VS Code language provider.
  Languages with mature semantic providers are close; a weak provider may still
  require a narrowly tested TextMate mapping.
- The Go grammar snapshot must be consciously rebased when VS Code changes its
  built-in grammar. Hash validation detects accidental edits but cannot discover
  a new VS Code release automatically.
- Visual comparison is still useful for UI state such as active lines, inline
  blame, diagnostics, and document links; those decorations are not theme token
  colors.

## Rules for future changes

1. Inspect the actual semantic token or TextMate scope before changing color.
2. Add a generic selector when a grammar already exposes the right concept.
3. Add a language-specific selector only when a generic selector would be wrong.
4. Add a grammar patch only when neither semantic tokens nor existing scopes can
   express the distinction.
5. Regenerate, run `npm test`, package a VSIX, and keep the working tree clean.
6. Never add a `Co-Authored-By` trailer when committing or pushing.
