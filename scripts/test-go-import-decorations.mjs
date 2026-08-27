import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { findGoImportStringRanges } = require("../src/go-import-ranges.cjs");

function importsIn(source) {
  return findGoImportStringRanges(source).map(({ start, end }) => source.slice(start, end));
}

assert.deepEqual(
  importsIn(`package demo

import "bytes"
import alias "example.com/alias"
import /* between keyword and spec */ . \`example.com/raw\`

import (
  _ "embed"
  named /* between alias and path */ "example.com/named"
  "example.com/toolkit/transport/client"
)

var ordinary = "not an import"
`),
  [
    '"bytes"',
    '"example.com/alias"',
    "`example.com/raw`",
    '"embed"',
    '"example.com/named"',
    '"example.com/toolkit/transport/client"',
  ],
);

assert.deepEqual(
  importsIn(`package demo

// import "commented.example/path"
/* import "blocked.example/path" */
var text = "import \\"inside.example/string\\""
var important = true
`),
  [],
);

assert.deepEqual(
  importsIn(`package demo
import (
  "first"
  /* a comment containing ) and \"ignored\" */
  alias "second"
)
func main() { println("third") }
`),
  ['"first"', '"second"'],
);

console.log("Go import decoration range regression passed");
