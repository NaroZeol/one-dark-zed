# Development notes

This document records the architecture and maintenance constraints introduced
by this fork of [`premier213/one-dark-zed`](https://github.com/premier213/one-dark-zed).
Release-facing changes belong in [`CHANGELOG.md`](../CHANGELOG.md).

## Objective

Reproduce Zed's built-in **One Dark** experience in VS Code-compatible editors
without turning the theme into an unmaintainable collection of hand-written
colors and language-specific overrides.

The implementation follows three rules:

1. The pinned Zed One Dark asset is the sole color source.
2. Generated files are rebuilt from explicit mappings and pinned upstream
   inputs; generated colors are not edited by hand.
3. Language providers classify semantic symbols; TextMate scopes remain the
   lexical fallback for keywords, strings, comments, and punctuation.

## Theme generation

- `themes/zed-one-theme.upstream.json`: pinned Zed One Dark input.
- `themes/zed-upstream-metadata.json`: source version and normalized SHA-256.
- `themes/zed-style-bindings.json`: semantic-token and TextMate mappings.
- `themes/zed-ui-bindings.json`: VS Code workbench-color mappings.
- `themes/zed-syntax-mapping.json`: maintained TextMate selector groups.
- `scripts/apply-zed-syntax-map.sh`: deterministic generator.
- `themes/onedark-zed-color-theme.json`: committed runtime output.

UI binding values are either a flat Zed style key or a JSON path array for
nested values such as the primary player's selection and syntax colors.

After changing any mapping or pinned theme input:

```sh
npm run sync:theme
npm test
```

## Classification architecture

VS Code TextMate grammars are regex-based and cannot reproduce Zed's
Tree-sitter syntax trees across every language and corner case. This extension
therefore maps both standard semantic-token types and shared TextMate scopes to
the pinned Zed palette.

The extension contributes no language grammar. Installed language providers
remain responsible for symbol understanding. The manifest enables Go semantic
highlighting and gopls semantic tokens so qualified packages, types, parameters,
and fields do not collapse to the same TextMate scope. Generic TextMate mappings
keep files readable before a provider loads or when a language has no provider.

This boundary is important because semantic-token selectors can match only a
token type, modifiers, and a language. They cannot see the surrounding
TextMate scope. For example, gopls classifies both the package in a qualified
type and the package in a function call as the same unmodified `namespace`.
The activation layer reads the provider's semantic-token stream and inspects
the qualified target role: type targets retain the namespace color, while
function and value targets use the ordinary variable color. This rule is
provider-driven and language-neutral; it is tested with Go, TypeScript, C++,
and Rust rather than implemented as separate parsers.

The other bounded correction is Go-specific because gopls may classify the
final package-name segment inside an import string as `namespace`. A small
lexical decoration restores the whole import literal to the string color.

The optional provider harness speaks LSP directly to gopls,
typescript-language-server, clangd, and rust-analyzer. It verifies Go,
TypeScript, JavaScript, C, C++, and Rust declarations, references, parameters,
types, namespaces, functions, constants, properties, callbacks, function
variables, and closures. A dedicated gopls fixture also retains repeated
qualified type aliases. The Go fixture loads its initialization options from
the shipped manifest:

```sh
npm run test:semantic
```

## Validation contract

`npm test` verifies that:

- every JSON artifact parses;
- the vendored Zed input matches its pinned hash;
- all UI and syntax colors belong to Zed's One Dark palette;
- generated mappings exactly match their inputs;
- selector counts stay within explicit performance budgets;
- high-risk scope precedence remains correct;
- the pinned local VS Code grammar fixture cannot silently lose languages or
  token assertions.

`npm run test:vscode` executes 334 lexical checks across 61 bundled grammars
when `VSCODE_APP_ROOT` points to the matching `resources/app` directory. The
fixture separately records 20 classifications that cannot be inferred from
TextMate scopes alone. `npm run test:semantic` executes 223 provider contracts
across eight documents and four real language servers, plus the focused Go
regression fixture. The base test suite also checks 109 custom semantic-token
type and modifier contracts declared by Pylance, C#, C/C++, rust-analyzer,
and TOML providers, plus 102 generated role-precedence combinations. Any new
modifier advertised by a tested language server fails the suite until it is
classified as a role override or contextual metadata.

The extension contributes no language grammar. Its activation code contains
the bounded Go import-string correction and the language-neutral qualified
namespace role resolver described above. If a document has no semantic-token
provider, both safely leave the normal theme and TextMate fallback untouched.

## Known limitations

- Exact token classification is bounded by each VS Code language provider.
- Open-source Pyright, along with the standalone VS Code JSON, HTML, and CSS
  language servers, does not expose semantic tokens over LSP. Their official
  TextMate fallbacks are tested here; proprietary or editor-hosted overlays
  remain provider-owned behavior.
- VS Code's reStructuredText TextMate grammar cannot retroactively scope a
  heading line from its underline on the following line; Zed's parser can.
- Exact semantic classification depends on the installed language provider.
- Visual comparison remains useful for editor decorations that are not theme
  token colors, such as inline blame and document links.

## Change rules

1. Inspect the actual semantic token or TextMate scope before changing a color.
2. Prefer generic selectors where the grammar exposes the right concept.
3. Do not patch or inject language grammars to emulate semantic analysis.
4. Test semantic behavior at the language-provider seam.
5. Provider tests must consume shipped configuration defaults when editor
   behavior depends on them; do not maintain a separate test-only copy.
6. Regenerate outputs, run `npm test`, package a VSIX, and inspect its contents.
7. Keep upstream copyright and license notices with every distribution.
