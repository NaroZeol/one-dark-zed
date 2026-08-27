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
3. TextMate scopes are the default classification source, matching Zed's
   default of not applying language-server semantic tokens; a narrowly scoped
   grammar injection is used only when the provider loses information.

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

## Grammar exceptions

Semantic highlighting is disabled globally. A pinned copy of VS Code's Go
grammar distinguishes field access from ordinary variables, and compact
injection grammars restore distinctions exposed by Zed's Tree-sitter queries
but absent from selected built-in TextMate grammars.

- `grammars/go.tmLanguage.upstream.json`: pinned VS Code built-in Go grammar.
- `grammars/go-upstream-metadata.json`: version and normalized hash.
- `scripts/sync-go-grammar.sh`: adds one fallback rule for non-call selectors.
- `grammars/go.tmLanguage.json`: committed, minified runtime grammar.
- `grammars/zed-*.injection.tmLanguage.json`: small, reviewed scope corrections.
- `scripts/test-go-grammar.mjs`: TextMate/Oniguruma regression test.

After updating the upstream grammar:

```sh
npm run sync:grammar
npm test
```

## Validation contract

`npm test` verifies that:

- every JSON artifact parses;
- vendored Zed and Go inputs match their pinned hashes;
- all UI and syntax colors belong to Zed's One Dark palette;
- generated mappings exactly match their inputs;
- selector counts stay within explicit performance budgets;
- high-risk scope precedence remains correct;
- the Go grammar produces the expected token scopes.
- the pinned local VS Code grammar fixture cannot silently lose languages or
  token assertions.

`npm run test:vscode` executes the separate 61-language integration suite when
`VSCODE_APP_ROOT` points to the matching `resources/app` directory.

The extension contains no activation code. Its runtime grammar additions are
bounded by explicit selector and injection tests.

## Known limitations

- Exact token classification is bounded by each VS Code language provider.
- VS Code's reStructuredText TextMate grammar cannot retroactively scope a
  heading line from its underline on the following line; Zed's parser can.
- The Go grammar snapshot must be consciously rebased when VS Code changes its
  built-in grammar; hash validation detects edits but not new releases.
- Visual comparison remains useful for editor decorations that are not theme
  token colors, such as inline blame and document links.

## Change rules

1. Inspect the actual semantic token or TextMate scope before changing a color.
2. Prefer generic selectors where the grammar exposes the right concept.
3. Add language-specific selectors only when a generic selector is incorrect.
4. Patch a grammar only when neither tokens nor existing scopes can express the
   distinction.
5. Regenerate outputs, run `npm test`, package a VSIX, and inspect its contents.
6. Keep upstream copyright and license notices with every distribution.
