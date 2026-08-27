# Onedark Zed

> Local maintenance branch: `local/zed-aligned`. The color theme is exposed to
> VS Code as **Zed One Dark Local**. Run `npm run sync:theme` after changing
> `themes/zed-syntax-mapping.json`, then run `npm test` before committing.

<p align="center">
  <img src="images/icon.png" width="128" height="128" alt="Onedark Zed extension icon" />
</p>

Source: **[github.com/premier213/one-dark-zed](https://github.com/premier213/one-dark-zed)** · clone with `git clone https://github.com/premier213/one-dark-zed.git`

A dark UI theme and file icon set for [Visual Studio Code](https://code.visualstudio.com/) and compatible editors (including [Cursor](https://cursor.com/)). The color palette follows **One Dark** conventions while tuning accents and surfaces to feel closer to the **Zed** editor’s dark mode.

## Preview

VS Code with **Onedark Zed** (color theme, file icons, and integrated terminal):

![Onedark Zed theme preview in VS Code](docs/preview.png)

## What’s included

| Contribution        | Id / label                                  | Description                                                      |
| ------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| **Color theme**     | **Onedark Zed**                             | Dark editor and workbench colors, semantic highlighting enabled. |
| **File icon theme** | **Onedark Zed Icons** (`onedark-zed-icons`) | SVG icons for common languages, tools, and folders.              |

Theme definition: `themes/onedark-zed-color-theme.json`.  
Icon theme definition: `icons/onedark-zed-icon-theme.json` (assets under `icons/icons/file_icons/`).

## Install

**From a VSIX or unpacked folder**

1. In VS Code / Cursor, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Run **Extensions: Install from VSIX…** and choose the packaged `.vsix`, or use **Developer: Install Extension from Location…** and point at this repository folder if you develop locally.

**From source (development)**

Clone [the repository](https://github.com/premier213/one-dark-zed), open the folder in the editor, press `F5` (or run the **Extension** launch configuration in `.vscode/launch.json`) to open a new window with this extension loaded.

## Use the theme and icons

1. Open the Command Palette.
2. For colors: **Preferences: Color Theme** → choose **Onedark Zed**.
3. For icons: **Preferences: File Icon Theme** → choose **Onedark Zed Icons**.

You can also set them in `settings.json`:

```json
{
  "workbench.colorTheme": "Onedark Zed",
  "workbench.iconTheme": "onedark-zed-icons"
}
```

## Requirements

Editor engine compatible with **VS Code `^1.74.0`** or newer (see `package.json` → `engines`). This extension only ships theme JSON; newer-only color keys are ignored on older versions without breaking install.

## Font (optional)

This extension **does not ship fonts**; the editor font is whatever you configure in the workbench.

[Zed](https://zed.dev/)’s built-in monospace default is **Lilex** (documented as the font behind the `.ZedMono` setting). To get a similar look in VS Code or Cursor on **any OS**, install [Lilex](https://github.com/mishamyrt/Lilex) from the [releases](https://github.com/mishamyrt/Lilex/releases) page, then set `editor.fontFamily` as below. If the family name does not appear, use **Developer: Reload Window** after installing.

**Install on your system**

- **Windows** — Unzip the release, select the `.ttf` files you want, right-click → **Install** (or **Install for all users**). Alternatively open **Settings → Personalization → Fonts** and drag the files in.
- **macOS** — Open each `.ttf` (or the whole set) and click **Install Font** in Font Book, or copy the files into `~/Library/Fonts/`.
- **Linux** — Copy the `.ttf` files (for example from the `variable` folder) into `~/.local/share/fonts/`, then run `fc-cache -fv`. Package managers may also ship Lilex; use whatever name they register (`fc-list | grep -i lilex`).

Editor settings (same on every platform):

```json
{
  "editor.fontFamily": "Lilex",
  "editor.fontLigatures": true
}
```

## Best experience (optional)

These values tune font size, line height, letter spacing, and gutter width so the editor feels balanced with **Onedark Zed** (syntax contrast and workbench chrome). Add them to your user or workspace `settings.json` in VS Code or Cursor:

```json
{
  "editor.fontSize": 15,
  "editor.lineDecorationsWidth": 36,
  "editor.lineHeight": 24,
  "editor.letterSpacing": 0.2
}
```

## Copyright and third-party licenses

| What                          | Notes                                                                                                                                                                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Icons in this repo**        | Some file icons trace to [Lucide](https://lucide.dev/). The full copyright and permission text (ISC) is in [`icons/icons/LICENSES`](icons/icons/LICENSES), including Feather / Lucide contributor notices.                                                                              |
| **Lilex (if you install it)** | Not bundled here. Lilex is maintained separately and is distributed under the **SIL Open Font License 1.1**; see the [Lilex repository](https://github.com/mishamyrt/Lilex).                                                                                                            |
| **Color theme**               | The JSON theme in this repository is an original work of editor styling. It is **visually inspired** by common **One Dark**–style palettes and Zed-like dark accents; it does **not** redistribute Zed, Atom, or proprietary theme binaries.                                            |
| **This extension (source & package)** | The project is licensed under the **MIT License**; see [`LICENSE`](LICENSE) (copyright as stated in that file). Third-party notices still apply where noted below. |

## Project layout

```
LICENSE                               # MIT — extension source and packaged theme
images/icon.png                      # Extension / marketplace logo (128×128)
docs/preview.png                      # README / marketplace preview screenshot
themes/onedark-zed-color-theme.json   # UI + syntax colors
icons/onedark-zed-icon-theme.json     # Icon theme manifest
icons/icons/file_icons/*.svg          # Per-file-type icons
package.json                          # Extension manifest
```

## License

- **Extension** — [MIT](LICENSE); include the license text when redistributing as required by MIT.
- **Bundled icons** — Portions under [Lucide / ISC](icons/icons/LICENSES); keep that notice where your distribution or marketplace rules require it.

See **Copyright and third-party licenses** for Lilex (optional, not bundled) and theme inspiration notes.
