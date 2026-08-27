# Zed One Dark for VS Code

<p align="center">
  <img src="images/icon.png" width="128" height="128" alt="Zed One Dark extension icon" />
</p>

A community-maintained Visual Studio Code port of Zed's built-in **One Dark**
theme, with a matching file icon theme and carefully aligned syntax colors.

> [!IMPORTANT]
> This repository is a fork of
> [`premier213/one-dark-zed`](https://github.com/premier213/one-dark-zed).
> It is not affiliated with, endorsed by, or maintained by Zed Industries,
> Microsoft, or the original repository owner. “Zed” and “Visual Studio Code”
> are used only to identify compatibility and the source of the ported theme.

## Preview

![Zed One Dark theme in VS Code](docs/preview.png)

## Included

| Contribution | ID / label | Notes |
| --- | --- | --- |
| Color theme | **Zed One Dark** | Workbench, editor, terminal, and TextMate colors generated from a pinned Zed One Dark palette. Semantic colors remain available as an opt-in. |
| File icon theme | **Onedark Zed Icons** (`onedark-zed-icons`) | Icons for common languages, tools, and folders. |
| Go grammar override | `source.go` | A generated, tested fallback that distinguishes property selectors while retaining type and function scopes. |
| Scope corrections | eight scoped grammar injections | Restores narrow distinctions present in Zed's Tree-sitter captures but missing from selected VS Code TextMate grammars. |

The extension has no activation code and executes no runtime JavaScript.

## Install

### VS Code Marketplace

Search for **Zed One Dark** in the Extensions view or run:

```powershell
code --install-extension NaroZeol.zed-onedark-vscode
```

### VSIX

Download a `.vsix` from the repository releases, then run **Extensions: Install
from VSIX…** in the Command Palette. From a terminal:

```powershell
code --install-extension .\zed-onedark-vscode-1.2.0.vsix --force
```

To build the package yourself:

```sh
npm ci
npm test
npm run package -- --out zed-onedark-vscode-1.2.0.vsix
```

## Activate

Choose **Preferences: Color Theme → Zed One Dark** and **Preferences: File Icon
Theme → Onedark Zed Icons**, or add:

```json
{
  "workbench.colorTheme": "Zed One Dark",
  "workbench.iconTheme": "onedark-zed-icons"
}
```

## Optional font settings

Fonts are not bundled. Zed's documented monospace default is
[Lilex](https://github.com/mishamyrt/Lilex), which is available separately
under the SIL Open Font License 1.1. A balanced starting point is:

```json
{
  "editor.fontFamily": "Lilex",
  "editor.fontLigatures": true,
  "editor.fontSize": 15,
  "editor.lineHeight": 24,
  "editor.letterSpacing": 0.2
}
```

## Development

The generated theme deliberately has explicit, reproducible inputs:

- `themes/zed-one-theme.upstream.json` is a pinned snapshot of Zed's built-in
  One Dark theme.
- `themes/zed-style-bindings.json`, `themes/zed-ui-bindings.json`, and
  `themes/zed-syntax-mapping.json` define how Zed styles map to VS Code.
- `grammars/go.tmLanguage.upstream.json` is a pinned VS Code Go grammar used to
  generate the narrow runtime override.

Run the generators only after changing their corresponding inputs:

```sh
npm run sync:theme
npm run sync:grammar
npm test
```

The pinned VS Code 1.135.0 integration suite exercises 310 tokens across 61
bundled grammars. Point it at that VS Code installation's `resources/app`
directory:

```sh
VSCODE_APP_ROOT=/path/to/VSCode/resources/app npm run test:vscode
```

Do not hand-edit generated colors. See
[`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md) for design constraints and
known limitations.

## Provenance and licensing

This fork preserves and extends work from
[`premier213/one-dark-zed`](https://github.com/premier213/one-dark-zed), whose
original portions were published under the MIT License. The palette snapshot
and generated theme incorporate material from
[`zed-industries/zed`](https://github.com/zed-industries/zed), whose unmarked
source and assets are licensed under GPL-3.0-or-later. The Go grammar is derived
from [`microsoft/vscode`](https://github.com/microsoft/vscode) under the MIT
License. Some icons include Lucide/Feather material under ISC/MIT terms.

The combined fork is distributed under **GPL-3.0-or-later**. Required copyright
and permission notices are retained in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
and [`icons/icons/LICENSES`](icons/icons/LICENSES). See [`LICENSE`](LICENSE) for
the full project license.
