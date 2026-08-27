import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { resolveSemanticStyle } from "./lib/semantic-style.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const bindings = JSON.parse(
  await readFile(resolve(repoRoot, "themes/zed-style-bindings.json"), "utf8"),
).semanticTokenStyles;

let assertionCount = 0;
function expectStyle(type, modifiers, expectedStyle, language) {
  assert.equal(
    resolveSemanticStyle(bindings, { type, modifiers, language }),
    expectedStyle,
    `${type}${modifiers.map((modifier) => `.${modifier}`).join("")} must resolve to ${expectedStyle}`,
  );
  assertionCount += 1;
}

const callableCarrierTypes = ["variable", "parameter", "property", "const", "static"];
const incidentalModifierSets = [
  [],
  ["declaration"],
  ["definition"],
  ["readonly"],
  ["defaultLibrary"],
  ["declaration", "readonly"],
  ["definition", "defaultLibrary"],
  ["declaration", "readonly", "defaultLibrary"],
];

for (const type of callableCarrierTypes) {
  for (const callableModifier of ["signature", "callable"]) {
    for (const incidentalModifiers of incidentalModifierSets) {
      expectStyle(type, [callableModifier, ...incidentalModifiers], "function");
    }
  }
}

for (const [type, expectedStyle] of Object.entries({
  function: "function",
  method: "function",
  member: "function",
  macro: "function",
  variable: "variable",
  parameter: "variable",
  property: "property",
  namespace: "namespace",
  class: "type",
  struct: "type",
  interface: "type",
  enumMember: "variant",
})) {
  expectStyle(type, [], expectedStyle);
}

expectStyle("variable", ["readonly"], "variable");
expectStyle("variable", ["defaultLibrary"], "constant");
expectStyle("variable", ["readonly", "defaultLibrary"], "constant");
expectStyle("property", ["readonly"], "property");
expectStyle("string", ["format"], "string.escape");
expectStyle("string", ["escapeCharacter"], "string.escape");
expectStyle("function", ["decorator"], "attribute");
expectStyle("class", ["decorator"], "attribute");
expectStyle("variable", ["invalid"], "error");
expectStyle("method", ["overridden"], "function");

console.log(`Semantic role model passed: ${assertionCount} precedence contracts`);
