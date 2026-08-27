#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
theme_file="$repo_dir/themes/onedark-zed-color-theme.json"
mapping_file="$repo_dir/themes/zed-syntax-mapping.json"
bindings_file="$repo_dir/themes/zed-style-bindings.json"
ui_bindings_file="$repo_dir/themes/zed-ui-bindings.json"
upstream_file="$repo_dir/themes/zed-one-theme.upstream.json"
generated_file="$repo_dir/themes/.onedark-zed-color-theme.generated.json"

jq \
  --slurpfile mapping "$mapping_file" \
  --slurpfile bindings "$bindings_file" \
  --slurpfile ui_bindings "$ui_bindings_file" \
  --slurpfile upstream "$upstream_file" '
  ($upstream[0].themes[] | select(.name == "One Dark") | .style) as $zed
  | ($bindings[0].semanticTokenStyles
      | to_entries
      | map({
          key: .key,
          value: { foreground: ($zed.syntax[.value].color // $zed[.value]) }
        })
      | from_entries) as $semantic_colors
  | ($mapping[0].tokenColors
      | map(
          ($bindings[0].textMateRuleStyles[.name]) as $zed_style
          | .settings.foreground = ($zed.syntax[$zed_style].color // $zed[$zed_style])
        )) as $textmate_colors
  | ($ui_bindings[0]
      | to_entries
      | map(
          .value as $path
          | {key: .key, value: (if ($path | type) == "array" then $zed | getpath($path) else $zed[$path] end)}
        )
      | from_entries) as $ui_colors
  # VS Code TextMate grammars do not expose the same syntax-tree information
  # as Zed Tree-sitter queries. Let language providers supply semantic symbol
  # classes, then color those classes with the pinned Zed palette.
  | .semanticHighlighting = true
  | .colors += $ui_colors
  | .semanticTokenColors = $semantic_colors
  | .tokenColors = $textmate_colors
' "$theme_file" > "$generated_file"

mv "$generated_file" "$theme_file"
