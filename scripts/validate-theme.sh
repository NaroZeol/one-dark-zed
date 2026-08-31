#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
theme_file="$repo_dir/themes/onedark-zed-color-theme.json"
mapping_file="$repo_dir/themes/zed-syntax-mapping.json"
bindings_file="$repo_dir/themes/zed-style-bindings.json"
ui_bindings_file="$repo_dir/themes/zed-ui-bindings.json"
upstream_file="$repo_dir/themes/zed-one-theme.upstream.json"
upstream_metadata_file="$repo_dir/themes/zed-upstream-metadata.json"
vscode_fixture_file="$repo_dir/tests/vscode-syntax-cases.json"
semantic_fixture_file="$repo_dir/tests/semantic-provider-cases.json"
modifier_policy_file="$repo_dir/tests/semantic-modifier-policy.json"

jq empty \
  "$repo_dir/package.json" \
  "$theme_file" \
  "$mapping_file" \
  "$bindings_file" \
  "$ui_bindings_file" \
  "$upstream_file" \
  "$upstream_metadata_file" \
  "$vscode_fixture_file" \
  "$semantic_fixture_file" \
  "$modifier_policy_file"

jq -e '
  .vscodeVersion == "1.135.0"
  and .vscodeCommit == "08d4889f9ec4a1685d257b9b95de036c8e1ce1e5"
  and (.languages | length) >= 61
  and ([.languages[].id] | length == (unique | length))
  and ([.languages[].expect | length] | add) >= 354
  and ([.languages[].expect[] | select(.requiresProvider == true)] | length) == 18
' "$vscode_fixture_file" >/dev/null

jq -e '
  (.providers | length) == 4
  and ([.providers[].id] | sort) == ["cpp", "go", "rust", "typescript"]
  and ([.providers[].documents[]] | length) == 9
  and ([.providers[].documents[].expectations | length] | add) >= 238
  and ([.providers[].documents[].expectations[] | select(.contextStyle != null)] | length) >= 13
  and ([.providers[].documents[].expectations[] | select(.style == null)] | length) == 0
' "$semantic_fixture_file" >/dev/null

expected_upstream_hash="$(jq -r '.normalizedSha256' "$upstream_metadata_file")"
actual_upstream_hash="$(jq -S . "$upstream_file" | shasum -a 256 | awk '{print $1}')"
test "$actual_upstream_hash" = "$expected_upstream_hash"

jq -e '
  .main == "./src/extension.cjs"
  and (.activationEvents | index("onStartupFinished") != null)
  and (.contributes.grammars | length) == 1
  and .contributes.grammars[0].language == "go"
  and .contributes.grammars[0].scopeName == "source.go"
  and .contributes.grammars[0].path == "./grammars/go.tmLanguage.json"
  and (.contributes.colors | any(.id == "zedOneDark.importStringForeground" and .defaults.dark == "#a1c181"))
  and (.contributes.colors | any(.id == "zedOneDark.namespaceForeground" and .defaults.dark == "#dce0e5"))
  and (.contributes.colors | any(.id == "zedOneDark.variableForeground" and .defaults.dark == "#acb2be"))
  and .contributes.configurationDefaults["[go]"]["editor.semanticHighlighting.enabled"] == true
  and .contributes.configurationDefaults.gopls["ui.semanticTokens"] == true
  and .contributes.configurationDefaults.gopls["ui.semanticTokenTypes"].variable == false
' "$repo_dir/package.json" >/dev/null

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
  and .colors["activityBar.activeBackground"] == "#454a56ff"
  and .colors["breadcrumb.foreground"] == "#a9afbcff"
  and .colors["breadcrumbPicker.background"] == "#2f343eff"
  and .colors["button.hoverBackground"] == "#363c46ff"
  and .colors["editorCodeLens.foreground"] == "#a9afbcff"
  and .colors["editorLink.activeForeground"] == "#74ade8ff"
  and .colors["editorRuler.foreground"] == "#c8ccd40d"
  and .colors["gitDecoration.renamedResourceForeground"] == "#74ade8ff"
  and .colors["gitDecoration.untrackedResourceForeground"] == "#a1c181ff"
  and .colors["list.filterMatchBackground"] == "#74ade866"
  and .colors["list.hoverBackground"] == "#363c46ff"
  and .colors["menu.border"] == "#464b57ff"
  and .colors["menu.selectionBackground"] == "#454a56ff"
  and .colors["tab.activeBorder"] == "#00000000"
  and .colors["editor.lineHighlightBorder"] == "#00000000"
  and .colors["editor.selectionHighlightBorder"] == "#00000000"
  and .colors["editorBracketHighlight.foreground1"] == "#b2b9c6ff"
  and .colors["list.filterMatchBorder"] == "#00000000"
  and .colors["panelTitle.activeBorder"] == "#00000000"
  and .colors["scrollbarSlider.activeBackground"] == "#363c46ff"
  and .colors["settings.modifiedItemIndicator"] == "#dec184ff"
  and .colors["sideBar.dropBackground"] == "#83899480"
  and .colors["tab.unfocusedActiveBorder"] == "#00000000"
  and .colors["tab.unfocusedHoverBorder"] == "#00000000"
  and .colors["terminal.selectionBackground"] == "#74ade83d"
  and .colors["toolbar.hoverBackground"] == "#363c46ff"
  and .semanticTokenColors.string.foreground == "#a1c181ff"
  and .semanticTokenColors.function.foreground == "#73ade9ff"
  and .semanticTokenColors.type.foreground == "#6eb4bfff"
  and .semanticTokenColors.property.foreground == "#d07277ff"
  and .semanticTokenColors["variable.readonly"].foreground == "#acb2beff"
  and .semanticTokenColors["variable.readonly.defaultLibrary"].foreground == "#dfc184ff"
  and .semanticTokenColors["variable.defaultLibrary"].foreground == "#dfc184ff"
  and .semanticTokenColors.event.foreground == .semanticTokenColors.property.foreground
  and .semanticTokenColors.parameter.foreground == .semanticTokenColors.variable.foreground
  and .semanticTokenColors.selfParameter.foreground == .semanticTokenColors.variable.foreground
  and .semanticTokenColors.clsParameter.foreground == .semanticTokenColors.variable.foreground
  and .semanticTokenColors.constParameter.foreground == .semanticTokenColors.constant.foreground
  and .semanticTokenColors["*.signature"].foreground == .semanticTokenColors.function.foreground
  and .semanticTokenColors["*.callable"].foreground == .semanticTokenColors.function.foreground
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
test "$textmate_selector_count" -le 220
test "$semantic_selector_count" -le 140
test "$compound_selector_count" -le 32

# High-risk grammar conflicts must resolve to the same semantic captures used
# by Zed. These are intentionally compact exceptions, not complete grammars.
jq -e '
  def scopes($name):
    [.tokenColors[] | select(.name == $name) | .scope | if type == "array" then .[] else . end];
  (scopes("Zed: strings") | index("entity.name.import.go") != null)
  and (scopes("Zed: comments") | index("comment punctuation.definition.comment") != null)
  and (scopes("Zed: comments") | index("comment.line.rem.batchfile keyword.command.rem.batchfile") != null)
  and (scopes("Zed: comments") | index("string.comment.buffered.block.pug") != null)
  and (scopes("Zed: keywords and declarations") | index("storage.type.js") != null)
  and (scopes("Zed: operators") | index("storage.type.function.coffee") != null)
  and (scopes("Zed: regular expressions and special strings") | index("string.regexp punctuation.definition.string") != null)
  and (scopes("Zed: named constants") | index("variable.other.constant") == null)
  and (scopes("Zed: namespaces and packages") | index("entity.name.import.go") == null)
  and (scopes("Zed: properties") | index("entity.name.tag.yaml") != null)
  and (scopes("Zed: properties") | index("variable.other.object.property") != null)
  and (scopes("Zed: properties") | index("entity.name.variable.field") != null)
  and (scopes("Zed: properties") | index("meta.attribute.python") != null)
  and (scopes("Zed: parameters") | index("entity.name.variable.parameter") != null)
  and (scopes("Zed: variables") | index("meta.function.inline.other.handlebars variable.parameter.handlebars") != null)
  and (scopes("Zed: properties") | index("punctuation.support.type.property-name") != null)
  and (scopes("Zed: brackets and delimiters") | index("punctuation.definition.tag") != null)
  and (scopes("Zed: tags") | index("punctuation.definition.tag") == null)
  and (scopes("Zed: markup links") | index("meta.link.inline.markdown string.other.link.title") != null)
  and (scopes("Zed: markup link targets") | index("meta.link.inline.markdown string.other.link") != null)
' "$theme_file" >/dev/null

jq -e --slurpfile upstream "$upstream_file" --slurpfile theme "$theme_file" '
  ($upstream[0].themes[] | select(.name == "One Dark") | .style) as $zed
  | all(to_entries[];
      .value as $path
      | $theme[0].colors[.key]
        == (if ($path | type) == "array" then $zed | getpath($path) else $zed[$path] end))
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
