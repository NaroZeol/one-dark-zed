import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  decodeSemanticTokens,
  findExpressionNamespaceRanges,
} = require("../src/semantic-namespace-ranges.cjs");

function token(line, start, text, type) {
  return { line, start, length: text.length, type };
}

function selectedText(source, tokens, languageId) {
  return findExpressionNamespaceRanges(source, tokens, languageId).map(
    ({ line, start, end }) => source.split("\n")[line].slice(start, end),
  );
}

const source = [
  "type Alias samplepkg.Record",
  "func handle(input samplepkg.Record) samplepkg.Result {",
  "  value := samplepkg.Build(input)",
  "  samplepkg.Shared = value",
  "  local := samplepkg.Record{}",
  "  tree.branch.Execute()",
  "  Platform.Console.WriteLine(value)",
  "  return samplepkg.Result{}",
  "}",
].join("\n");

const semanticTokens = [
  token(0, 11, "samplepkg", "namespace"),
  token(0, 21, "Record", "type"),
  token(1, 18, "samplepkg", "namespace"),
  token(1, 28, "Record", "type"),
  token(1, 36, "samplepkg", "namespace"),
  token(1, 46, "Result", "type"),
  token(2, 11, "samplepkg", "namespace"),
  token(2, 21, "Build", "function"),
  token(3, 2, "samplepkg", "namespace"),
  token(3, 12, "Shared", "variable"),
  token(4, 11, "samplepkg", "namespace"),
  token(4, 21, "Record", "type"),
  token(5, 2, "tree", "namespace"),
  token(5, 7, "branch", "namespace"),
  token(5, 14, "Execute", "function"),
  token(6, 2, "Platform", "namespace"),
  token(6, 11, "Console", "class"),
  token(6, 19, "WriteLine", "method"),
  token(7, 9, "samplepkg", "namespace"),
  token(7, 19, "Result", "type"),
];

assert.deepEqual(selectedText(source, semanticTokens), [
  "samplepkg",
  "samplepkg",
  "tree",
  "branch",
]);
assert.deepEqual(
  selectedText(source, semanticTokens, "go"),
  ["samplepkg", "samplepkg", "tree", "branch"],
  "Go package qualifiers must follow the qualified target role",
);
assert.deepEqual(
  selectedText(
    source,
    semanticTokens.filter(({ type }) => type !== "variable"),
    "go",
  ),
  ["samplepkg", "samplepkg", "tree", "branch"],
  "suppressed gopls variable targets must still classify Go qualifiers as runtime values",
);

const encoded = new Uint32Array([
  0, 2, 4, 0, 0,
  0, 6, 5, 1, 0,
  1, 3, 6, 0, 0,
]);
assert.deepEqual(
  decodeSemanticTokens(encoded, { tokenTypes: ["namespace", "function"] }),
  [
    { line: 0, start: 2, length: 4, type: "namespace", modifiers: [] },
    { line: 0, start: 8, length: 5, type: "function", modifiers: [] },
    { line: 1, start: 3, length: 6, type: "namespace", modifiers: [] },
  ],
);

console.log("Semantic namespace context regression passed");
