import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import oniguruma from "vscode-oniguruma";
import textmate from "vscode-textmate";

const { OnigScanner, OnigString, loadWASM } = oniguruma;
const { Registry, parseRawGrammar } = textmate;

const require = createRequire(import.meta.url);
const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const theme = JSON.parse(
  await readFile(resolve(repoDir, "themes/onedark-zed-color-theme.json"), "utf8"),
);
const upstream = JSON.parse(
  await readFile(resolve(repoDir, "themes/zed-one-theme.upstream.json"), "utf8"),
);
const zedStyle = upstream.themes.find(({ name }) => name === "One Dark").style;
const wasmPath = require.resolve("vscode-oniguruma/release/onig.wasm");

await loadWASM(await readFile(wasmPath));

const scopeName = "source.hash-comment-test";
const grammarDefinition = {
  scopeName,
  patterns: [
    {
      name: "comment.line.number-sign",
      begin: "(#)",
      beginCaptures: {
        1: { name: "punctuation.definition.comment.hash" },
      },
      end: "$",
    },
  ],
};
const rawTheme = {
  settings: [
    {
      settings: {
        background: theme.colors["editor.background"],
        foreground: theme.colors["editor.foreground"],
      },
    },
    ...theme.tokenColors.map(({ scope, settings }) => ({ scope, settings })),
  ],
};

const registry = new Registry({
  theme: rawTheme,
  onigLib: Promise.resolve({
    createOnigScanner: (patterns) => new OnigScanner(patterns),
    createOnigString: (value) => new OnigString(value),
  }),
  loadGrammar: async (requestedScope) => {
    if (requestedScope !== scopeName) {
      return null;
    }
    return parseRawGrammar(JSON.stringify(grammarDefinition), "hash-comment.tmLanguage.json");
  },
});

const grammar = await registry.loadGrammar(scopeName);
assert(grammar, "failed to load the hash-comment regression grammar");

const line = "# comment text";
const { tokens } = grammar.tokenizeLine2(line);
const colorMap = registry.getColorMap();

function foregroundAt(offset) {
  let metadata = tokens[1];
  for (let index = 0; index < tokens.length; index += 2) {
    if (tokens[index] > offset) {
      break;
    }
    metadata = tokens[index + 1];
  }
  const foregroundId = (metadata >>> 15) & 0x1ff;
  return colorMap[foregroundId].toLowerCase();
}

const markerColor = foregroundAt(0);
const bodyColor = foregroundAt(2);
const expectedCommentColor = zedStyle.syntax.comment.color.toLowerCase();

assert.equal(
  markerColor,
  bodyColor,
  `comment marker uses ${markerColor}, but its text uses ${bodyColor}`,
);
assert.equal(markerColor, expectedCommentColor, "hash comments must use Zed's comment color");

console.log("Theme token color regression passed");
