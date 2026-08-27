"use strict";

const vscode = require("vscode");
const { findGoImportStringRanges } = require("./go-import-ranges.cjs");
const {
  decodeSemanticTokens,
  findExpressionNamespaceRanges,
} = require("./semantic-namespace-ranges.cjs");

const THEME_NAME = "Zed One Dark";
const UPDATE_DELAY_MS = 125;

function activate(context) {
  const importDecoration = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor("zedOneDark.importStringForeground"),
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
  const expressionNamespaceDecoration = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor("zedOneDark.variableForeground"),
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
  const pendingUpdates = new Map();
  const semanticRequests = new Map();
  let nextSemanticRequest = 0;

  function themeIsActive() {
    return vscode.workspace.getConfiguration("workbench").get("colorTheme") === THEME_NAME;
  }

  async function updateExpressionNamespaces(editor) {
    const document = editor.document;
    const documentVersion = document.version;
    const request = ++nextSemanticRequest;
    semanticRequests.set(document.uri.toString(), request);

    try {
      const [legend, semanticTokens] = await Promise.all([
        vscode.commands.executeCommand(
          "vscode.provideDocumentSemanticTokensLegend",
          document.uri,
        ),
        vscode.commands.executeCommand(
          "vscode.provideDocumentSemanticTokens",
          document.uri,
        ),
      ]);
      if (
        semanticRequests.get(document.uri.toString()) !== request ||
        document.version !== documentVersion ||
        !themeIsActive()
      ) {
        return;
      }
      if (!legend?.tokenTypes || !semanticTokens?.data) {
        editor.setDecorations(expressionNamespaceDecoration, []);
        return;
      }

      const ranges = findExpressionNamespaceRanges(
        document.getText(),
        decodeSemanticTokens(semanticTokens.data, legend),
      ).map(
        ({ line, start, end }) =>
          new vscode.Range(line, start, line, end),
      );
      editor.setDecorations(expressionNamespaceDecoration, ranges);
    } catch {
      if (
        semanticRequests.get(document.uri.toString()) === request &&
        document.version === documentVersion &&
        themeIsActive()
      ) {
        editor.setDecorations(expressionNamespaceDecoration, []);
      }
    }
  }

  function updateEditor(editor) {
    if (!themeIsActive()) {
      editor.setDecorations(importDecoration, []);
      editor.setDecorations(expressionNamespaceDecoration, []);
      return;
    }

    if (editor.document.languageId === "go") {
      const source = editor.document.getText();
      const ranges = findGoImportStringRanges(source).map(
        ({ start, end }) =>
          new vscode.Range(
            editor.document.positionAt(start),
            editor.document.positionAt(end),
          ),
      );
      editor.setDecorations(importDecoration, ranges);
    } else {
      editor.setDecorations(importDecoration, []);
    }

    void updateExpressionNamespaces(editor);
  }

  function updateVisibleEditors() {
    for (const editor of vscode.window.visibleTextEditors) updateEditor(editor);
  }

  function scheduleDocumentUpdate(document) {
    const key = document.uri.toString();
    clearTimeout(pendingUpdates.get(key));
    pendingUpdates.set(
      key,
      setTimeout(() => {
        pendingUpdates.delete(key);
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document === document) updateEditor(editor);
        }
      }, UPDATE_DELAY_MS),
    );
  }

  context.subscriptions.push(
    importDecoration,
    vscode.window.onDidChangeVisibleTextEditors(updateVisibleEditors),
    vscode.workspace.onDidChangeTextDocument(({ document }) => {
      scheduleDocumentUpdate(document);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("workbench.colorTheme")) updateVisibleEditors();
    }),
    {
      dispose() {
        for (const timeout of pendingUpdates.values()) clearTimeout(timeout);
        pendingUpdates.clear();
        semanticRequests.clear();
      },
    },
  );

  updateVisibleEditors();
}

module.exports = { activate };
