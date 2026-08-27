"use strict";

function isIdentifierStart(code) {
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95 ||
    code > 127
  );
}

function isIdentifierContinue(code) {
  return isIdentifierStart(code) || (code >= 48 && code <= 57);
}

function nextToken(source, from) {
  let index = from;
  while (index < source.length) {
    const code = source.charCodeAt(index);
    if (code === 9 || code === 10 || code === 13 || code === 32) {
      index += 1;
      continue;
    }

    if (source[index] === "/" && source[index + 1] === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }

    if (source[index] === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }

    const quote = source[index];
    if (quote === '"' || quote === "`") {
      const start = index;
      index += 1;
      let closed = false;
      while (index < source.length) {
        if (source[index] === quote) {
          index += 1;
          closed = true;
          break;
        }
        if (quote === '"' && source[index] === "\\") {
          index = Math.min(index + 2, source.length);
          continue;
        }
        if (quote === '"' && (source[index] === "\n" || source[index] === "\r")) break;
        index += 1;
      }
      return { type: "string", start, end: index, closed };
    }

    if (isIdentifierStart(code)) {
      const start = index;
      index += 1;
      while (index < source.length && isIdentifierContinue(source.charCodeAt(index))) index += 1;
      return { type: "identifier", value: source.slice(start, index), start, end: index };
    }

    return { type: "punctuation", value: source[index], start: index, end: index + 1 };
  }
  return null;
}

function findGoImportStringRanges(source) {
  const ranges = [];
  let index = 0;

  while (true) {
    const token = nextToken(source, index);
    if (!token) break;
    index = token.end;
    if (token.type !== "identifier" || token.value !== "import") continue;

    const first = nextToken(source, index);
    if (!first) break;
    index = first.end;

    if (first.type === "punctuation" && first.value === "(") {
      while (true) {
        const item = nextToken(source, index);
        if (!item) return ranges;
        index = item.end;
        if (item.type === "punctuation" && item.value === ")") break;
        if (item.type === "string" && item.closed) {
          ranges.push({ start: item.start, end: item.end });
        }
      }
      continue;
    }

    if (first.type === "string" && first.closed) {
      ranges.push({ start: first.start, end: first.end });
      continue;
    }

    if (
      first.type === "identifier" ||
      (first.type === "punctuation" && first.value === ".")
    ) {
      const path = nextToken(source, index);
      if (path) index = path.end;
      if (path?.type === "string" && path.closed) {
        ranges.push({ start: path.start, end: path.end });
      }
    }
  }

  return ranges;
}

module.exports = { findGoImportStringRanges };
