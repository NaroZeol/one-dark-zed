#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
upstream_file="$repo_dir/grammars/go.tmLanguage.upstream.json"
grammar_file="$repo_dir/grammars/go.tmLanguage.json"
generated_file="$repo_dir/grammars/.go.tmLanguage.generated.json"

# VS Code's Go grammar already distinguishes types and calls before falling
# back to generic variables. Extend only that fallback so selectors such as
# a.config.JWT.AdminRoles become properties, while context.Context and
# obj.Method() keep their existing type/function scopes.
jq -c '
  .repository.property_variables as $upstream_property_variables
  | .repository.property_variables = {
      "comment": "Struct literal keys and non-call selectors",
      "patterns": [
        {
          "comment": "Zed parity: selector fields and qualified constants",
          "match": "(?<=\\.)\\w+\\b(?!(?:\\s*\\[[^\\]\\n]*\\])?\\s*\\()",
          "name": "variable.other.property.go"
        },
        $upstream_property_variables
      ]
    }
' "$upstream_file" > "$generated_file"

mv "$generated_file" "$grammar_file"
