#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
theme_file="$repo_dir/themes/onedark-zed-color-theme.json"
mapping_file="$repo_dir/themes/zed-syntax-mapping.json"
generated_file="$repo_dir/themes/.onedark-zed-color-theme.generated.json"

jq --slurpfile mapping "$mapping_file" '
  .semanticHighlighting = true
  | .semanticTokenColors = $mapping[0].semanticTokenColors
  | .tokenColors = $mapping[0].tokenColors
' "$theme_file" > "$generated_file"

mv "$generated_file" "$theme_file"
