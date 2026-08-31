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

Installed language providers remain responsible for symbol understanding. The
manifest enables Go semantic highlighting and gopls semantic tokens for
packages, types, parameters, functions, and methods. It also contributes a
pinned Go grammar for the lexical roles gopls cannot represent accurately.

This boundary is important because semantic-token selectors can match only a
token type, modifiers, and a language. They cannot see the surrounding
TextMate scope. For example, gopls classifies both the package in a qualified
type and the package in a function call as the same unmodified `namespace`.
The activation layer reads the provider's semantic-token stream and inspects
the qualified target role: type targets retain the namespace color, while
function and value targets use the ordinary variable color in languages whose
Zed queries make that distinction. Go follows the same role rule: package
qualifiers are emphasized before types, but dimmed before functions,
constants, and other runtime values. The resolver remains provider-driven and
is tested with Go, TypeScript, C++, and Rust rather than implemented as
separate full parsers.

Current gopls versions advertise no `property` token and emit struct fields,
selectors, qualified constants, composite-literal keys, and ordinary variables
as the same `variable` type. No semantic selector can recover the lost context.
The shipped default disables only `ui.semanticTokenTypes.variable`; the pinned
grammar owns those lexical roles while the rest of the gopls semantic stream
stays enabled. A small decoration still restores import strings when a provider
places a namespace token inside the literal.

Navigation needs a synchronous first-frame path because VS Code intentionally
loads TextMate scopes before semantic tokens. The Go grammar classifies
non-call selector chains immediately, so semantic arrival cannot replace their
property color with a generic variable color. A linear import scan derives
explicit aliases and conventional path-basename package names and pre-colors
package qualifiers according to strong syntax: qualified calls and values use
the ordinary variable color, while pointer types, declarations, and composite
literals retain namespace emphasis. Semantic target roles resolve ambiguous
forms afterward. Decoration results and import analysis remain cached by
document version and shared across visible panes.

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

`npm run test:vscode` executes 340 lexical checks across 61 bundled grammars
when `VSCODE_APP_ROOT` points to the matching `resources/app` directory. The
fixture separately records 18 classifications that cannot be inferred from
TextMate scopes alone. `npm run test:semantic` executes 238 provider contracts
across nine documents and four real language servers, plus the focused Go
regression fixture. The base test suite also checks 109 custom semantic-token
type and modifier contracts declared by Pylance, C#, C/C++, rust-analyzer,
and TOML providers, plus 102 generated role-precedence combinations. Any new
modifier advertised by a tested language server fails the suite until it is
classified as a role override or contextual metadata.

The extension contributes the pinned Go grammar and a bounded activation layer
for import strings, package qualifiers, and the language-neutral qualified
namespace role resolver. It performs no asynchronous Go property repaint. One
semantic request is shared by every visible pane displaying the same document.

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
3. Keep the Go grammar correction limited to roles gopls cannot express; do not
   add language patches where the provider already supplies the right role.
4. Test semantic behavior at the language-provider seam.
5. Provider tests must consume shipped configuration defaults when editor
   behavior depends on them; do not maintain a separate test-only copy.
6. Regenerate outputs, run `npm test`, package a VSIX, and inspect its contents.
7. Keep upstream copyright and license notices with every distribution.

For local iteration, `npm run install:local` performs the base validation,
packages the current tree, and installs the VSIX into both VS Code and Trae CN.
Do not symlink or edit Marketplace-managed extension directories: editor
updates select extensions by ID and version and may replace those paths.
