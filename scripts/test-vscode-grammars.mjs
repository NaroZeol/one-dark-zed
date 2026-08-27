import { strict as assert } from "node:assert";
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import oniguruma from "vscode-oniguruma";
import textmate from "vscode-textmate";

const { OnigScanner, OnigString, loadWASM } = oniguruma;
const { INITIAL, Registry, parseRawGrammar } = textmate;
const require = createRequire(import.meta.url);
const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = JSON.parse(await readFile(resolve(repoDir, "tests/vscode-syntax-cases.json"), "utf8"));
const theme = JSON.parse(
  await readFile(resolve(repoDir, "themes/onedark-zed-color-theme.json"), "utf8"),
);
const extensionManifest = JSON.parse(await readFile(resolve(repoDir, "package.json"), "utf8"));
const upstream = JSON.parse(
  await readFile(resolve(repoDir, "themes/zed-one-theme.upstream.json"), "utf8"),
);
const zedStyle = upstream.themes.find(({ name }) => name === "One Dark").style;
const appRoot = process.env.VSCODE_APP_ROOT;

assert(appRoot, "set VSCODE_APP_ROOT to VS Code's resources/app directory");
const product = JSON.parse(await readFile(resolve(appRoot, "product.json"), "utf8"));
assert.equal(product.commit, fixture.vscodeCommit, "VS Code grammar snapshot changed; review fixtures first");

await loadWASM(await readFile(require.resolve("vscode-oniguruma/release/onig.wasm")));

async function grammarFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await grammarFiles(path)));
    } else if (/\.tmLanguage(?:\.json)?$/i.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

const grammarPaths = new Map();
for (const path of await grammarFiles(resolve(appRoot, "extensions"))) {
  try {
    const definition = parseRawGrammar(await readFile(path, "utf8"), path);
    if (definition.scopeName && !grammarPaths.has(definition.scopeName)) {
      grammarPaths.set(definition.scopeName, path);
    }
  } catch {
    // Some extension resources resemble TextMate files but are not standalone grammars.
  }
}
grammarPaths.set("source.go", resolve(repoDir, "grammars/go.tmLanguage.json"));
const injectionsByTarget = new Map();
for (const contribution of extensionManifest.contributes.grammars) {
  if (!contribution.injectTo) continue;
  grammarPaths.set(contribution.scopeName, resolve(repoDir, contribution.path));
  for (const target of contribution.injectTo) {
    const injections = injectionsByTarget.get(target) ?? [];
    injections.push(contribution.scopeName);
    injectionsByTarget.set(target, injections);
  }
}

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
const loadedGrammarScopes = new Set();

const registry = new Registry({
  theme: rawTheme,
  onigLib: Promise.resolve({
    createOnigScanner: (patterns) => new OnigScanner(patterns),
    createOnigString: (value) => new OnigString(value),
  }),
  loadGrammar: async (scopeName) => {
    const path = grammarPaths.get(scopeName);
    if (!path) return null;
    loadedGrammarScopes.add(scopeName);
    return parseRawGrammar(await readFile(path, "utf8"), path);
  },
  getInjections: (scopeName) => injectionsByTarget.get(scopeName),
});

function textOffset(line, text, occurrence = 1) {
  let offset = -1;
  let from = 0;
  for (let index = 0; index < occurrence; index += 1) {
    offset = line.indexOf(text, from);
    assert.notEqual(offset, -1, `missing ${JSON.stringify(text)} in ${JSON.stringify(line)}`);
    from = offset + text.length;
  }
  return offset;
}

function metadataAt(tokens, offset) {
  let metadata = tokens[1];
  for (let index = 0; index < tokens.length; index += 2) {
    if (tokens[index] > offset) break;
    metadata = tokens[index + 1];
  }
  return metadata;
}

function scopeAt(tokens, offset) {
  return tokens.find(({ startIndex, endIndex }) => startIndex <= offset && endIndex > offset)?.scopes;
}

function expectedStyle(styleName) {
  const style = zedStyle.syntax[styleName] ?? { color: zedStyle[styleName] };
  assert(style?.color, `unknown Zed style ${styleName}`);
  return {
    color: style.color.toLowerCase(),
    italic: style.font_style === "italic",
    bold: Number(style.font_weight ?? 0) >= 700,
  };
}

const failures = [];
let assertionCount = 0;

for (const language of fixture.languages) {
  const grammar = await registry.loadGrammar(language.scopeName);
  assert(grammar, `failed to load ${language.scopeName}`);
  let scopeStack = INITIAL;
  let colorStack = INITIAL;
  const tokenized = language.lines.map((line) => {
    const scoped = grammar.tokenizeLine(line, scopeStack);
    const colored = grammar.tokenizeLine2(line, colorStack);
    scopeStack = scoped.ruleStack;
    colorStack = colored.ruleStack;
    return { line, scoped: scoped.tokens, colored: colored.tokens };
  });

  for (const expectation of language.expect) {
    assertionCount += 1;
    const tokenizedLine = tokenized[expectation.line ?? 0];
    const offset = textOffset(tokenizedLine.line, expectation.text, expectation.occurrence ?? 1);
    const metadata = metadataAt(tokenizedLine.colored, offset);
    const foregroundId = (metadata >>> 15) & 0x1ff;
    const actual = {
      color: registry.getColorMap()[foregroundId].toLowerCase(),
      italic: Boolean(((metadata >>> 11) & 0xf) & 1),
      bold: Boolean(((metadata >>> 11) & 0xf) & 2),
    };
    const expected = expectedStyle(expectation.style);
    if (
      actual.color !== expected.color ||
      actual.italic !== expected.italic ||
      actual.bold !== expected.bold
    ) {
      failures.push({
        language: language.id,
        token: expectation.text,
        occurrence: expectation.occurrence ?? 1,
        expectedStyle: expectation.style,
        expected,
        actual,
        scopes: scopeAt(tokenizedLine.scoped, offset),
      });
    }
  }
}

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  throw new Error(`${failures.length}/${assertionCount} VS Code grammar color checks failed`);
}

console.log(
  `VS Code grammar integration passed: ${assertionCount} tokens across ${fixture.languages.length} languages`,
);
if (process.env.TRACE_GRAMMARS === "1") {
  for (const scopeName of [...loadedGrammarScopes].sort()) {
    console.log(`${scopeName}\t${grammarPaths.get(scopeName)}`);
  }
}
