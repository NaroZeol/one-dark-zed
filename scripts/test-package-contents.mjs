import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const vsce = resolve(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vsce.cmd" : "vsce",
);
const result = spawnSync(vsce, ["ls"], {
  cwd: repoRoot,
  encoding: "utf8",
});
assert.equal(result.status, 0, result.stderr || result.stdout);

const files = new Set(result.stdout.split(/\r?\n/).filter(Boolean));
for (const required of [
  "package.json",
  "grammars/go.tmLanguage.json",
  "src/extension.cjs",
  "src/go-import-ranges.cjs",
  "src/go-lexical.cjs",
  "src/semantic-namespace-ranges.cjs",
  "themes/onedark-zed-color-theme.json",
]) {
  assert(files.has(required), `VSIX file list is missing ${required}`);
}

for (const excludedPrefix of ["scripts/", "tests/", "node_modules/"]) {
  assert(
    [...files].every((file) => !file.startsWith(excludedPrefix)),
    `VSIX file list unexpectedly contains ${excludedPrefix}`,
  );
}

console.log(`Package content regression passed: ${files.size} files`);
