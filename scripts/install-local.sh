#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_dir="$(mktemp -d "${TMPDIR:-/tmp}/zed-onedark-local.XXXXXX")"
vsix_path="$build_dir/zed-onedark-vscode.vsix"

cleanup() {
  rm -rf -- "$build_dir"
}
trap cleanup EXIT

for editor_cli in code trae; do
  if ! command -v "$editor_cli" >/dev/null 2>&1; then
    printf 'Required editor CLI not found on PATH: %s\n' "$editor_cli" >&2
    exit 1
  fi
done

cd "$repo_root"
npm test
npm run package -- --out "$vsix_path"

code --install-extension "$vsix_path" --force
trae --install-extension "$vsix_path" --force

printf '%s\n' 'Installed the local build in VS Code and Trae CN.'
printf '%s\n' 'Run “Developer: Reload Window” in each open editor window.'
