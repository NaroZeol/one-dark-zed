import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import oniguruma from "vscode-oniguruma";
import textmate from "vscode-textmate";

const { OnigScanner, OnigString, loadWASM } = oniguruma;
const { INITIAL, Registry, parseRawGrammar } = textmate;

const require = createRequire(import.meta.url);
const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const grammarPath = resolve(repoDir, "grammars/go.tmLanguage.json");
const wasmPath = require.resolve("vscode-oniguruma/release/onig.wasm");

await loadWASM(await readFile(wasmPath));

const registry = new Registry({
  onigLib: Promise.resolve({
    createOnigScanner: (patterns) => new OnigScanner(patterns),
    createOnigString: (value) => new OnigString(value),
  }),
  loadGrammar: async (scopeName) => {
    if (scopeName !== "source.go") {
      return null;
    }
    return parseRawGrammar(await readFile(grammarPath, "utf8"), grammarPath);
  },
});

const grammar = await registry.loadGrammar("source.go");
assert(grammar, "failed to load patched Go grammar");

const lines = [
  "package demo",
  "import \"context\"",
  "func example(ctx context.Context, a *API) {",
  "    roles := a.config.JWT.AdminRoles",
  "    value := ctx.Value(\"key\")",
  "    ok := slices.Contains(roles, claims.Role)",
  "    status := http.StatusUnauthorized",
  "    user := models.User{Role: claims.Role}",
  "    indexed := a.items[0].Name",
  "    generic := maps.Clone(source)",
  "}",
];

let ruleStack = INITIAL;
const tokenized = lines.map((line) => {
  const result = grammar.tokenizeLine(line, ruleStack);
  ruleStack = result.ruleStack;
  return { line, tokens: result.tokens };
});

function scopesFor(lineIndex, text, occurrence = 1) {
  const { line, tokens } = tokenized[lineIndex];
  let from = 0;
  let start = -1;
  for (let index = 0; index < occurrence; index += 1) {
    start = line.indexOf(text, from);
    assert.notEqual(start, -1, `missing ${text} on line ${lineIndex + 1}`);
    from = start + text.length;
  }
  const token = tokens.find(
    ({ startIndex, endIndex }) => startIndex <= start && endIndex >= start + text.length,
  );
  assert(token, `no token covers ${text} on line ${lineIndex + 1}`);
  return token.scopes;
}

function expectScope(lineIndex, text, expectedScope, occurrence = 1) {
  const scopes = scopesFor(lineIndex, text, occurrence);
  assert(
    scopes.includes(expectedScope),
    `${text} on line ${lineIndex + 1}: expected ${expectedScope}, got ${scopes.join(" ")}`,
  );
}

function expectScopePrefix(lineIndex, text, expectedPrefix, occurrence = 1) {
  const scopes = scopesFor(lineIndex, text, occurrence);
  assert(
    scopes.some((scope) => scope.startsWith(expectedPrefix)),
    `${text} on line ${lineIndex + 1}: expected ${expectedPrefix}*, got ${scopes.join(" ")}`,
  );
}

const propertyScope = "variable.other.property.go";
const functionScopePrefix = "entity.name.function";
const typeScope = "entity.name.type.go";

expectScope(2, "Context", typeScope);
expectScope(2, "API", typeScope);

expectScope(3, "config", propertyScope);
expectScope(3, "JWT", propertyScope);
expectScope(3, "AdminRoles", propertyScope);
expectScope(5, "Role", propertyScope);
expectScope(6, "StatusUnauthorized", propertyScope);
expectScope(7, "Role", propertyScope, 1);
expectScope(7, "Role", propertyScope, 2);
expectScope(8, "items", propertyScope);
expectScope(8, "Name", propertyScope);

expectScopePrefix(4, "Value", functionScopePrefix);
expectScopePrefix(5, "Contains", functionScopePrefix);
expectScopePrefix(9, "Clone", functionScopePrefix);
expectScope(7, "User", typeScope);

console.log("Go grammar token regression passed");
