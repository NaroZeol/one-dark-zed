import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  analyzeGoImports,
  findGoImportStringRanges,
} = require("../src/go-import-ranges.cjs");

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

const roleSource = `package demo

import "example.com/project/dal"

func load(ctx Context, result Result) {
	var baasDal *dal.Instance
	if baasDal, err = dal.FindInstanceById(ctx, result.DefaultBaas.BaasWorkSpaceId, dal.FindInstanceOption{}); err != nil {}
	var generic *dal.Container[string]
	_ = dal.NewContainer[string]()
	_ = dal.Container[string]{}
}
`;
const roleAnalysis = analyzeGoImports(roleSource);
const selected = (ranges) => ranges.map(({ start, end }) => roleSource.slice(start, end));
assert.deepEqual(
  selected(roleAnalysis.namespaceQualifierRanges),
  ["dal", "dal", "dal", "dal"],
  "package qualifiers before types must keep the namespace emphasis",
);
assert.deepEqual(
  selected(roleAnalysis.valueQualifierRanges),
  ["dal", "dal"],
  "package qualifiers before calls and values must use the ordinary variable color",
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
