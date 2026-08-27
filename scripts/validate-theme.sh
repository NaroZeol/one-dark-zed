#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
theme_file="$repo_dir/themes/onedark-zed-color-theme.json"
mapping_file="$repo_dir/themes/zed-syntax-mapping.json"
bindings_file="$repo_dir/themes/zed-style-bindings.json"
ui_bindings_file="$repo_dir/themes/zed-ui-bindings.json"
upstream_file="$repo_dir/themes/zed-one-theme.upstream.json"
upstream_metadata_file="$repo_dir/themes/zed-upstream-metadata.json"
go_grammar_file="$repo_dir/grammars/go.tmLanguage.json"
go_upstream_file="$repo_dir/grammars/go.tmLanguage.upstream.json"
go_upstream_metadata_file="$repo_dir/grammars/go-upstream-metadata.json"

jq empty \
  "$repo_dir/package.json" \
  "$theme_file" \
  "$mapping_file" \
  "$bindings_file" \
  "$ui_bindings_file" \
  "$upstream_file" \
  "$upstream_metadata_file" \
  "$go_grammar_file" \
  "$go_upstream_file" \
  "$go_upstream_metadata_file"

expected_upstream_hash="$(jq -r '.normalizedSha256' "$upstream_metadata_file")"
actual_upstream_hash="$(jq -S . "$upstream_file" | shasum -a 256 | awk '{print $1}')"
test "$actual_upstream_hash" = "$expected_upstream_hash"

expected_go_upstream_hash="$(jq -r '.normalizedSha256' "$go_upstream_metadata_file")"
actual_go_upstream_hash="$(jq -S . "$go_upstream_file" | shasum -a 256 | awk '{print $1}')"
test "$actual_go_upstream_hash" = "$expected_go_upstream_hash"

jq -e '
  .contributes.configurationDefaults["[go]"]["editor.semanticHighlighting.enabled"] == false
  and (.contributes.grammars[]
    | select(.language == "go")
    | .scopeName == "source.go"
      and .path == "./grammars/go.tmLanguage.json")
' "$repo_dir/package.json" >/dev/null

jq -e '
  .repository.property_variables.patterns[0]
  | .name == "variable.other.property.go"
    and (.match | contains("(?<=\\.)"))
    and (.match | contains("\\s*\\("))
' "$go_grammar_file" >/dev/null

jq -e '
  .name == "Zed One Dark"
  and .semanticHighlighting == true
  and .colors["editor.background"] == "#282c33ff"
  and .colors["editor.foreground"] == "#acb2beff"
  and .colors["sideBar.background"] == "#2f343eff"
  and .colors["statusBar.background"] == "#3b414dff"
  and .colors["terminal.background"] == "#282c34ff"
  and .colors["editorGhostText.foreground"] == "#5a6a87ff"
  and .colors["peekViewEditor.background"] == "#2f343ebf"
  and .colors["peekViewEditorGutter.background"] == "#2f343ebf"
  and .colors["peekViewResult.background"] == "#2f343eff"
  and .colors["peekViewTitle.background"] == "#2f343eff"
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

# Keep the static theme footprint bounded. TextMate compiles every selector
# into its matcher; language-by-language exhaustive lists would add startup and
# token matching cost without improving the common path.
textmate_rule_count="$(jq '.tokenColors | length' "$theme_file")"
textmate_selector_count="$(jq '[.tokenColors[].scope | if type == "array" then length else 1 end] | add' "$theme_file")"
semantic_selector_count="$(jq '.semanticTokenColors | length' "$theme_file")"
compound_selector_count="$(jq '[.tokenColors[].scope | if type == "array" then .[] else . end | select(contains(" "))] | length' "$theme_file")"

test "$textmate_rule_count" -le 40
test "$textmate_selector_count" -le 180
test "$semantic_selector_count" -le 80
test "$compound_selector_count" -le 16

# High-risk grammar conflicts must resolve to the same semantic captures used
# by Zed. These are intentionally compact exceptions, not complete grammars.
jq -e '
  def scopes($name):
    [.tokenColors[] | select(.name == $name) | .scope | if type == "array" then .[] else . end];
  (scopes("Zed: strings") | index("entity.name.import.go") != null)
  and (scopes("Zed: namespaces and packages") | index("entity.name.import.go") == null)
  and (scopes("Zed: properties") | index("entity.name.tag.yaml") != null)
  and (scopes("Zed: properties") | index("variable.other.object.property") != null)
  and (scopes("Zed: properties") | index("entity.name.variable.field") != null)
  and (scopes("Zed: properties") | index("meta.attribute.python") != null)
  and (scopes("Zed: parameters") | index("entity.name.variable.parameter") != null)
  and (scopes("Zed: properties") | index("punctuation.support.type.property-name") != null)
  and (scopes("Zed: brackets and delimiters") | index("punctuation.definition.tag") != null)
  and (scopes("Zed: tags") | index("punctuation.definition.tag") == null)
' "$theme_file" >/dev/null

jq -e --slurpfile upstream "$upstream_file" --slurpfile theme "$theme_file" '
  ($upstream[0].themes[] | select(.name == "One Dark") | .style) as $zed
  | all(to_entries[]; $theme[0].colors[.key] == $zed[.value])
' "$ui_bindings_file" >/dev/null

jq -e \
  --slurpfile mapping "$mapping_file" \
  --slurpfile bindings "$bindings_file" \
  --slurpfile upstream "$upstream_file" '
  ($upstream[0].themes[] | select(.name == "One Dark") | .style) as $zed
  | ($bindings[0].semanticTokenStyles
      | to_entries
      | map({key: .key, value: {foreground: ($zed.syntax[.value].color // $zed[.value])}})
      | from_entries) as $expected_semantic
  | ($mapping[0].tokenColors
      | map(
          ($bindings[0].textMateRuleStyles[.name]) as $zed_style
          | .settings.foreground = ($zed.syntax[$zed_style].color // $zed[$zed_style])
        )) as $expected_textmate
  | .semanticTokenColors == $expected_semantic
    and .tokenColors == $expected_textmate
' "$theme_file" >/dev/null

jq -e --slurpfile mapping "$mapping_file" --slurpfile upstream "$upstream_file" '
  ($upstream[0].themes[] | select(.name == "One Dark") | .style) as $zed
  | ([.semanticTokenStyles[], .textMateRuleStyles[]]
      | all(. as $style | ($zed.syntax[$style].color // $zed[$style]) != null))
    and ((.textMateRuleStyles | keys | sort) == ($mapping[0].tokenColors | map(.name) | sort))
' "$bindings_file" >/dev/null

# No visual color may come from outside Zed's built-in One Dark palette.
jq -e --slurpfile upstream "$upstream_file" '
  ($upstream[0].themes[]
    | select(.name == "One Dark")
    | .style
    | [.. | strings | select(test("^#[0-9A-Fa-f]{6,8}$")) | ascii_downcase]
    | unique) as $zed_palette
  | ([
      (.colors | .. | strings),
      (.tokenColors[]?.settings.foreground // empty),
      (.semanticTokenColors[]?.foreground // empty)
    ]
    | map(select(test("^#[0-9A-Fa-f]{6,8}$")) | ascii_downcase)
    | unique
    | . - $zed_palette
    | length == 0)
' "$theme_file" >/dev/null

if rg -n ':not\(' "$theme_file" "$mapping_file" "$bindings_file" "$ui_bindings_file"; then
  echo "Unsupported TextMate selector found" >&2
  exit 1
fi

echo "Theme validation passed"
