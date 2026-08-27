#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
theme_file="$repo_dir/themes/onedark-zed-color-theme.json"
mapping_file="$repo_dir/themes/zed-syntax-mapping.json"

jq empty "$repo_dir/package.json" "$theme_file" "$mapping_file"

jq -e '
  .name == "Zed One Dark Local"
  and .semanticHighlighting == true
  and .colors["editor.background"] == "#282c33ff"
  and .colors["editor.foreground"] == "#acb2beff"
  and .colors["sideBar.background"] == "#2f343eff"
  and .colors["statusBar.background"] == "#3b414dff"
  and .colors["terminal.background"] == "#282c34ff"
  and .colors["editorGhostText.foreground"] == "#5a6a87ff"
  and .semanticTokenColors.string.foreground == "#a1c181ff"
  and .semanticTokenColors.function.foreground == "#73ade9ff"
  and .semanticTokenColors.type.foreground == "#6eb4bfff"
  and .semanticTokenColors.property.foreground == "#d07277ff"
  and .semanticTokenColors.keyword.foreground == "#b477cfff"
  and ([.tokenColors[].scope | if type == "array" then .[] else . end] | index("string") != null)
  and ([.tokenColors[].scope | if type == "array" then .[] else . end] | index("entity.name.function") != null)
  and ([.tokenColors[].scope | if type == "array" then .[] else . end] | index("entity.name.type") != null)
  and ([.tokenColors[].scope | if type == "array" then .[] else . end] | index("variable.other.property") != null)
' "$theme_file" >/dev/null

jq -e --slurpfile mapping "$mapping_file" '
  .semanticTokenColors == $mapping[0].semanticTokenColors
  and .tokenColors == $mapping[0].tokenColors
' "$theme_file" >/dev/null

if rg -n ':not\(' "$theme_file" "$mapping_file"; then
  echo "Unsupported TextMate selector found" >&2
  exit 1
fi

echo "Theme validation passed"
