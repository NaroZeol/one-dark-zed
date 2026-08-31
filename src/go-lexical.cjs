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

function nextGoToken(source, from) {
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
    if (quote === '"' || quote === "'" || quote === "`") {
      const start = index;
      index += 1;
      let closed = false;
      while (index < source.length) {
        if (source[index] === quote) {
          index += 1;
          closed = true;
          break;
        }
        if (quote !== "`" && source[index] === "\\") {
          index = Math.min(index + 2, source.length);
          continue;
        }
        if (quote !== "`" && (source[index] === "\n" || source[index] === "\r")) break;
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

function tokenizeGo(source) {
  const tokens = [];
  let index = 0;
  while (true) {
    const token = nextGoToken(source, index);
    if (!token) return tokens;
    tokens.push(token);
    index = token.end;
  }
}

module.exports = { nextGoToken, tokenizeGo };
