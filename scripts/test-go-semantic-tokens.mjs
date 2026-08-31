import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const fixtureDir = await mkdtemp(join(tmpdir(), "zed-go-semantic-"));
const packageDir = join(fixtureDir, "sampleapi");
const gopls = process.env.GOPLS_BIN ?? "gopls";

function runGopls(args) {
  const result = spawnSync(gopls, args, {
    cwd: fixtureDir,
    encoding: "utf8",
  });
  if (result.error?.code === "ENOENT") {
    throw new Error(`gopls is required for this test; set GOPLS_BIN or install gopls`);
  }
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function semanticCount(output, token, type) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`/\\*⇒\\d+,${type},\\[[^\\]]*\\]\\*/${escaped}`, "g");
  return output.match(pattern)?.length ?? 0;
}

try {
  await mkdir(packageDir);
  await writeFile(join(fixtureDir, "go.mod"), "module example.com/zed-semantics\n\ngo 1.25\n");
  await writeFile(
    join(packageDir, "types.go"),
    `package sampleapi

type AlphaInput struct{}
type AlphaOutput struct{}
type BetaInput struct{}
type BetaOutput struct{}
type GammaInput struct{}
type GammaOutput struct{}
`,
  );
  const sourcePath = join(fixtureDir, "theme.go");
  await writeFile(
    sourcePath,
    `package theme

import "example.com/zed-semantics/sampleapi"

type LocalAlphaInput sampleapi.AlphaInput
type LocalAlphaOutput sampleapi.AlphaOutput
type LocalBetaInput sampleapi.BetaInput
type LocalBetaOutput sampleapi.BetaOutput
type LocalGammaInput sampleapi.GammaInput
type LocalGammaOutput sampleapi.GammaOutput

type holder struct{ value int }

func assign(target, source holder) {
	target.value = source.value
}
`,
  );

  runGopls(["version"]);
  const output = runGopls(["semtok", sourcePath]);

  for (const typeName of [
    "AlphaInput",
    "AlphaOutput",
    "BetaInput",
    "BetaOutput",
    "GammaInput",
    "GammaOutput",
  ]) {
    assert.equal(
      semanticCount(output, typeName, "type"),
      1,
      `${typeName} must be a type in its qualified reference`,
    );
  }
  for (const typeName of [
    "LocalAlphaInput",
    "LocalAlphaOutput",
    "LocalBetaInput",
    "LocalBetaOutput",
    "LocalGammaInput",
    "LocalGammaOutput",
  ]) {
    assert.equal(semanticCount(output, typeName, "type"), 1);
  }
  assert.equal(semanticCount(output, "sampleapi", "namespace"), 6);
  assert.equal(semanticCount(output, "target", "parameter"), 2);
  assert.equal(semanticCount(output, "source", "parameter"), 2);
  assert.equal(
    semanticCount(output, "value", "property") + semanticCount(output, "value", "variable"),
    3,
    "gopls must expose the field declaration and both assignment sides",
  );

  console.log("Go semantic token integration passed");
} finally {
  await rm(fixtureDir, { recursive: true, force: true });
}
