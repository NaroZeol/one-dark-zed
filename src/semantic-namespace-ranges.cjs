"use strict";

const NAMESPACE_TYPES = new Set(["namespace", "module", "toolModule"]);

// A qualifier that resolves a type remains a namespace. A qualifier that
// resolves a runtime value behaves like the value carrier used by Zed's
// syntax queries (for example, pkg in pkg.Call()). Keep this list about the
// target's semantic role rather than individual languages.
const TYPE_TARGET_TYPES = new Set([
  "type",
  "class",
  "enum",
  "interface",
  "struct",
  "typeParameter",
  "typeAlias",
  "builtinType",
  "selfTypeKeyword",
  "union",
  "generic",
  "constParameter",
  "recordClass",
  "delegate",
  "recordStruct",
  "referenceType",
  "genericType",
  "valueType",
  "templateType",
]);

function decodeSemanticTokens(data, legend) {
  const tokens = [];
  let line = 0;
  let start = 0;

  for (let index = 0; index + 4 < data.length; index += 5) {
    const deltaLine = data[index];
    const deltaStart = data[index + 1];
    const length = data[index + 2];
    const type = legend.tokenTypes[data[index + 3]];
    const modifierBits = data[index + 4];
    line += deltaLine;
    start = deltaLine === 0 ? start + deltaStart : deltaStart;
    if (type) {
      tokens.push({
        line,
        start,
        length,
        type,
        modifiers: (legend.tokenModifiers ?? []).filter(
          (_, modifierIndex) => modifierBits & 2 ** modifierIndex,
        ),
      });
    }
  }

  return tokens;
}

function findExpressionNamespaceRanges(source, semanticTokens, languageId) {
  const lines = source.split(/\r?\n/);
  const tokenAt = new Map(
    semanticTokens.map((token) => [`${token.line}:${token.start}`, token]),
  );
  const resolutionCache = new Map();

  function qualifiedTarget(token) {
    const line = lines[token.line];
    if (line === undefined) return undefined;
    const after = line.slice(token.start + token.length);
    const separator = /^\s*(?:\.|::|\\)\s*/.exec(after);
    if (!separator) return undefined;
    const targetStart = token.start + token.length + separator[0].length;
    return tokenAt.get(`${token.line}:${targetStart}`);
  }

  function resolvesRuntimeValue(token, visiting = new Set()) {
    const key = `${token.line}:${token.start}`;
    if (resolutionCache.has(key)) return resolutionCache.get(key);
    if (visiting.has(key)) return false;
    visiting.add(key);

    const target = qualifiedTarget(token);
    // The shipped Go configuration deliberately suppresses gopls `variable`
    // tokens because they erase field/property scopes. A missing qualified
    // target in Go therefore represents a runtime value; type and callable
    // targets still have semantic tokens and take the normal branch below.
    let result = languageId === "go" && !target;
    if (target) {
      result = NAMESPACE_TYPES.has(target.type)
        ? resolvesRuntimeValue(target, visiting)
        : !TYPE_TARGET_TYPES.has(target.type);
    }

    visiting.delete(key);
    resolutionCache.set(key, result);
    return result;
  }

  return semanticTokens
    .filter((token) => NAMESPACE_TYPES.has(token.type) && resolvesRuntimeValue(token))
    .map((token) => ({
      line: token.line,
      start: token.start,
      end: token.start + token.length,
    }));
}

module.exports = {
  decodeSemanticTokens,
  findExpressionNamespaceRanges,
};
