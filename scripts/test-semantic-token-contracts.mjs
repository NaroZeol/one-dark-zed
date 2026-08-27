import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { resolveSemanticStyle } from "./lib/semantic-style.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const bindings = JSON.parse(
  await readFile(resolve(repoRoot, "themes/zed-style-bindings.json"), "utf8"),
).semanticTokenStyles;
const contracts = JSON.parse(
  await readFile(resolve(repoRoot, "tests/semantic-token-contracts.json"), "utf8"),
);
const modifierPolicy = JSON.parse(
  await readFile(resolve(repoRoot, "tests/semantic-modifier-policy.json"), "utf8"),
);
const contextualModifiers = new Set(modifierPolicy.contextual);

let assertionCount = 0;
for (const provider of contracts.providers) {
  for (const [tokenType, expectedStyle] of Object.entries(provider.tokenStyles)) {
    assert.equal(
      bindings[tokenType],
      expectedStyle,
      `${provider.id} token ${tokenType} must map to Zed ${expectedStyle}`,
    );
    assertionCount += 1;
  }
  for (const modifier of provider.modifiers) {
    const roleRules = modifierPolicy.roleRules[modifier];
    if (roleRules) {
      for (const { selector, style } of roleRules) {
        assert.equal(
          bindings[selector],
          style,
          `${provider.id} modifier ${modifier} selector ${selector} must map to ${style}`,
        );
      }
    } else {
      assert(
        contextualModifiers.has(modifier),
        `${provider.id} modifier ${modifier} has no declared policy`,
      );
    }
    assertionCount += 1;
  }
}

for (const [modifier, rules] of Object.entries(modifierPolicy.roleRules)) {
  for (const { selector, style } of rules) {
    const [head] = selector.split(":", 1);
    const [type, ...modifiers] = head.split(".");
    const probeType = type === "*" ? "variable" : type;
    assert.equal(
      resolveSemanticStyle(bindings, { type: probeType, modifiers }),
      style,
      `${modifier} rule ${selector} must resolve to ${style}`,
    );
    assertionCount += 1;
  }
}

for (const combination of modifierPolicy.combinationRules) {
  for (const { selector, style } of combination.rules) {
    assert.equal(bindings[selector], style, `${selector} must map to ${style}`);
    assertionCount += 1;
  }
}

console.log(
  `Semantic token contracts passed: ${assertionCount} custom type and modifier contracts across ${contracts.providers.length} providers`,
);
