"use strict";

const { nextGoToken } = require("./go-lexical.cjs");

function defaultPackageName(source, pathToken) {
  const literal = source.slice(pathToken.start, pathToken.end);
  if (literal.length < 2 || literal.slice(1, -1).includes("\\")) return undefined;
  const importPath = literal.slice(1, -1);
  const name = importPath.slice(importPath.lastIndexOf("/") + 1);
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && !/^v\d+$/.test(name)
    ? name
    : undefined;
}

function tokenAfterBalancedSquare(tokens, from) {
  let depth = 0;
  for (let index = from; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "punctuation") continue;
    if (token.value === "[") depth += 1;
    else if (token.value === "]") {
      depth -= 1;
      if (depth === 0) return tokens[index + 1];
    }
  }
  return undefined;
}

function probableQualifierRole(source, tokens, qualifierIndex) {
  const before = tokens[qualifierIndex - 1];
  const target = tokens[qualifierIndex + 2];
  let after = tokens[qualifierIndex + 3];
  if (!target || target.type !== "identifier") return "value";

  if (after?.type === "punctuation" && after.value === "[") {
    after = tokenAfterBalancedSquare(tokens, qualifierIndex + 3);
  }
  if (after?.type === "punctuation" && after.value === "{") return "namespace";
  if (after?.type === "punctuation" && after.value === "(") return "value";

  if (
    before?.type === "punctuation" &&
    (before.value === "*" || before.value === "]")
  ) {
    return "namespace";
  }
  if (
    before?.type === "identifier" &&
    (before.value === "chan" || before.value === "map" || before.value === "type")
  ) {
    return "namespace";
  }

  const lineStart = source.lastIndexOf("\n", tokens[qualifierIndex].start - 1) + 1;
  const linePrefix = source.slice(lineStart, tokens[qualifierIndex].start);
  if (/\b(?:var|type)\b[^=]*$/.test(linePrefix)) return "namespace";
  return "value";
}

function analyzeGoImports(source) {
  const stringRanges = [];
  const packageNames = new Set();
  let index = 0;
  let bodyStart = source.length;

  function addImport(alias, path) {
    stringRanges.push({ start: path.start, end: path.end });
    if (alias?.type === "identifier") {
      if (alias.value !== "_") packageNames.add(alias.value);
      return;
    }
    if (alias) return;
    const name = defaultPackageName(source, path);
    if (name) packageNames.add(name);
  }

  const packageKeyword = nextGoToken(source, index);
  if (packageKeyword?.type !== "identifier" || packageKeyword.value !== "package") {
    return {
      stringRanges,
      qualifierRanges: [],
      namespaceQualifierRanges: [],
      valueQualifierRanges: [],
    };
  }
  const packageName = nextGoToken(source, packageKeyword.end);
  if (packageName?.type !== "identifier") {
    return {
      stringRanges,
      qualifierRanges: [],
      namespaceQualifierRanges: [],
      valueQualifierRanges: [],
    };
  }
  index = packageName.end;

  while (true) {
    const token = nextGoToken(source, index);
    if (!token) break;
    index = token.end;
    if (token.type === "punctuation" && token.value === ";") continue;
    if (token.type !== "identifier" || token.value !== "import") {
      bodyStart = token.start;
      break;
    }

    const first = nextGoToken(source, index);
    if (!first) break;
    index = first.end;

    if (first.type === "punctuation" && first.value === "(") {
      while (true) {
        const item = nextGoToken(source, index);
        if (!item) break;
        index = item.end;
        if (item.type === "punctuation" && item.value === ")") break;
        if (item.type === "string" && item.closed) {
          addImport(undefined, item);
          continue;
        }
        if (
          item.type === "identifier" ||
          (item.type === "punctuation" && item.value === ".")
        ) {
          const path = nextGoToken(source, index);
          if (path) index = path.end;
          if (path?.type === "string" && path.closed) addImport(item, path);
        }
      }
      continue;
    }

    if (first.type === "string" && first.closed) {
      addImport(undefined, first);
      continue;
    }

    if (
      first.type === "identifier" ||
      (first.type === "punctuation" && first.value === ".")
    ) {
      const path = nextGoToken(source, index);
      if (path) index = path.end;
      if (path?.type === "string" && path.closed) {
        addImport(first, path);
      }
    }
  }

  const candidates = [];
  const shadowedNames = new Set();
  if (packageNames.size > 0) {
    const bodyTokens = [];
    index = bodyStart;
    while (true) {
      const token = nextGoToken(source, index);
      if (!token) break;
      index = token.end;
      bodyTokens.push(token);
    }
    for (let tokenIndex = 0; tokenIndex < bodyTokens.length; tokenIndex += 1) {
      const token = bodyTokens[tokenIndex];
      if (token.type !== "identifier" || !packageNames.has(token.value)) continue;
      const next = bodyTokens[tokenIndex + 1];
      if (next?.type === "punctuation" && next.value === ".") {
        candidates.push({
          name: token.value,
          role: probableQualifierRole(source, bodyTokens, tokenIndex),
          start: token.start,
          end: token.end,
        });
      } else {
        // A Go package cannot be used as a bare value. A bare occurrence of
        // the imported name therefore indicates a local shadow (or incomplete
        // code); suppress its lexical preview and let gopls decide.
        shadowedNames.add(token.value);
      }
    }
  }

  const unshadowedCandidates = candidates.filter(({ name }) => !shadowedNames.has(name));
  const rangesForRole = (role) =>
    unshadowedCandidates
      .filter((candidate) => candidate.role === role)
      .map(({ start, end }) => ({ start, end }));
  return {
    stringRanges,
    qualifierRanges: unshadowedCandidates.map(({ start, end }) => ({ start, end })),
    namespaceQualifierRanges: rangesForRole("namespace"),
    valueQualifierRanges: rangesForRole("value"),
  };
}

function findGoImportStringRanges(source) {
  return analyzeGoImports(source).stringRanges;
}

function findGoProbablePackageQualifierRanges(source) {
  return analyzeGoImports(source).qualifierRanges;
}

module.exports = {
  analyzeGoImports,
  findGoImportStringRanges,
  findGoProbablePackageQualifierRanges,
};
