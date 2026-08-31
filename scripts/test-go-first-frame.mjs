import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import oniguruma from "vscode-oniguruma";
import textmate from "vscode-textmate";

const { OnigScanner, OnigString, loadWASM } = oniguruma;
const { INITIAL, Registry, parseRawGrammar } = textmate;
const require = createRequire(import.meta.url);
const repoRoot = resolve(import.meta.dirname, "..");
const grammarPath = resolve(repoRoot, "grammars/go.tmLanguage.json");
const manifest = JSON.parse(await readFile(resolve(repoRoot, "package.json"), "utf8"));
const theme = JSON.parse(
  await readFile(resolve(repoRoot, "themes/onedark-zed-color-theme.json"), "utf8"),
);

assert.equal(
  manifest.contributes.configurationDefaults.gopls["ui.semanticTokenTypes"].variable,
  false,
  "gopls variable tokens must not overwrite the final lexical member colors",
);
assert(
  manifest.contributes.grammars.some(
    ({ language, path, scopeName }) =>
      language === "go" && path === "./grammars/go.tmLanguage.json" && scopeName === "source.go",
  ),
  "the production manifest must install the Go grammar used for first-frame colors",
);

await loadWASM(await readFile(require.resolve("vscode-oniguruma/release/onig.wasm")));
const rawGrammar = await readFile(grammarPath, "utf8");
const registry = new Registry({
  theme: {
    settings: [
      { settings: { foreground: theme.colors["editor.foreground"] } },
      ...theme.tokenColors.map(({ scope, settings }) => ({ scope, settings })),
    ],
  },
  onigLib: Promise.resolve({
    createOnigScanner: (patterns) => new OnigScanner(patterns),
    createOnigString: (value) => new OnigString(value),
  }),
  loadGrammar: async (scopeName) =>
    scopeName === "source.go" ? parseRawGrammar(rawGrammar, grammarPath) : null,
});
const grammar = await registry.loadGrammar("source.go");
assert(grammar);

const source = "config.Security.Captcha.Secret";
const scoped = grammar.tokenizeLine(source, INITIAL).tokens;
const colored = grammar.tokenizeLine2(source, INITIAL).tokens;
const colorMap = registry.getColorMap();

function tokenAt(offset) {
  return scoped.find(({ startIndex, endIndex }) => startIndex <= offset && offset < endIndex);
}

function colorAt(offset) {
  let metadata = colored[1];
  for (let index = 0; index < colored.length; index += 2) {
    if (colored[index] > offset) break;
    metadata = colored[index + 1];
  }
  return colorMap[(metadata >>> 15) & 0x1ff].toLowerCase();
}

for (const member of ["Security", "Captcha", "Secret"]) {
  const offset = source.indexOf(member);
  assert(
    tokenAt(offset)?.scopes.includes("variable.other.property.go"),
    `${member} must have a property scope on the first frame`,
  );
  assert.equal(
    colorAt(offset),
    theme.semanticTokenColors.property.foreground.toLowerCase(),
    `${member} must start with its final Zed property color`,
  );
}

assert.equal(
  colorAt(source.indexOf("config")),
  theme.semanticTokenColors.variable.foreground.toLowerCase(),
  "the chain root must remain a normal variable",
);

console.log("Go first-frame color regression passed");
