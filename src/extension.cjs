"use strict";

const vscode = require("vscode");
const { analyzeGoImports } = require("./go-import-ranges.cjs");
const {
  decodeSemanticTokens,
  findExpressionNamespaceRanges,
} = require("./semantic-namespace-ranges.cjs");

const THEME_NAME = "Zed One Dark";
const UPDATE_DELAY_MS = 125;

function rangeContainsOffset(ranges, offset) {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const range = ranges[middle];
    if (offset < range.start) high = middle - 1;
    else if (offset >= range.end) low = middle + 1;
    else return true;
  }
  return false;
}

function activate(context) {
  const importDecoration = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor("zedOneDark.importStringForeground"),
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
  const packageNamespaceDecoration = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor("zedOneDark.namespaceForeground"),
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
  const expressionNamespaceDecoration = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor("zedOneDark.variableForeground"),
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
  const pendingUpdates = new Map();
  const semanticRequests = new Map();
  const semanticInFlight = new Map();
  const lexicalAnalysisCache = new Map();
  const semanticDecorationCache = new Map();
  let nextSemanticRequest = 0;

  function themeIsActive() {
    return vscode.workspace.getConfiguration("workbench").get("colorTheme") === THEME_NAME;
  }

  function setDocumentDecorations(document, decoration, ranges) {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document === document) editor.setDecorations(decoration, ranges);
    }
  }

  function goImportAnalysis(document, source = document.getText()) {
    const key = document.uri.toString();
    const cached = lexicalAnalysisCache.get(key);
    if (cached?.version === document.version) return cached.analysis;
    const analysis = analyzeGoImports(source);
    lexicalAnalysisCache.set(key, { version: document.version, analysis });
    return analysis;
  }

  async function performSemanticDecorationUpdate(document) {
    const key = document.uri.toString();
    const documentVersion = document.version;
    const request = ++nextSemanticRequest;
    semanticRequests.set(key, request);

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
        semanticRequests.get(key) !== request ||
        document.version !== documentVersion ||
        !themeIsActive()
      ) {
        return;
      }
      if (!legend?.tokenTypes || !semanticTokens?.data) {
        setDocumentDecorations(document, expressionNamespaceDecoration, []);
        return;
      }

      const decodedTokens = decodeSemanticTokens(semanticTokens.data, legend);
      const source = document.getText();
      const expressionNamespaceRangeData = findExpressionNamespaceRanges(
        source,
        decodedTokens,
        document.languageId,
      );
      const expressionNamespaceRanges = expressionNamespaceRangeData.map(
        ({ line, start, end }) => new vscode.Range(line, start, line, end),
      );
      setDocumentDecorations(
        document,
        expressionNamespaceDecoration,
        expressionNamespaceRanges,
      );

      let packageNamespaceRanges = [];
      if (document.languageId === "go") {
        const { stringRanges } = goImportAnalysis(document, source);
        const valueQualifierStarts = new Set(
          expressionNamespaceRangeData.map(({ line, start }) => `${line}:${start}`),
        );
        packageNamespaceRanges = decodedTokens
          .filter((token) => token.type === "namespace")
          .filter((token) => !valueQualifierStarts.has(`${token.line}:${token.start}`))
          .filter((token) => {
            const offset = document.offsetAt(new vscode.Position(token.line, token.start));
            return !rangeContainsOffset(stringRanges, offset);
          })
          .map(
            ({ line, start, length }) =>
              new vscode.Range(line, start, line, start + length),
          );
      }
      setDocumentDecorations(
        document,
        packageNamespaceDecoration,
        packageNamespaceRanges,
      );
      semanticDecorationCache.set(key, {
        version: documentVersion,
        expressionNamespaceRanges,
        packageNamespaceRanges,
      });
    } catch {
      if (
        semanticRequests.get(key) === request &&
        document.version === documentVersion &&
        themeIsActive()
      ) {
        setDocumentDecorations(document, expressionNamespaceDecoration, []);
      }
    }
  }

  function updateSemanticDecorations(document) {
    const key = document.uri.toString();
    const existing = semanticInFlight.get(key);
    if (existing?.version === document.version) return existing.promise;

    const promise = performSemanticDecorationUpdate(document);
    const entry = { version: document.version, promise };
    semanticInFlight.set(key, entry);
    const cleanup = () => {
      if (semanticInFlight.get(key) === entry) semanticInFlight.delete(key);
    };
    void promise.then(cleanup, cleanup);
    return promise;
  }

  function updateLexicalDecorations(editor) {
    if (!themeIsActive()) {
      editor.setDecorations(importDecoration, []);
      editor.setDecorations(packageNamespaceDecoration, []);
      editor.setDecorations(expressionNamespaceDecoration, []);
      return;
    }

    const cached = semanticDecorationCache.get(editor.document.uri.toString());
    const currentCache = cached?.version === editor.document.version ? cached : undefined;
    let lexicalExpressionNamespaceRanges = [];

    if (editor.document.languageId === "go") {
      const source = editor.document.getText();
      const {
        namespaceQualifierRanges,
        valueQualifierRanges,
        stringRanges,
      } = goImportAnalysis(
        editor.document,
        source,
      );
      const ranges = stringRanges.map(
        ({ start, end }) =>
          new vscode.Range(
            editor.document.positionAt(start),
            editor.document.positionAt(end),
          ),
      );
      editor.setDecorations(importDecoration, ranges);
      const packageNamespaceRanges =
        currentCache?.packageNamespaceRanges ??
        namespaceQualifierRanges.map(
          ({ start, end }) =>
            new vscode.Range(
              editor.document.positionAt(start),
              editor.document.positionAt(end),
            ),
        );
      editor.setDecorations(packageNamespaceDecoration, packageNamespaceRanges);
      lexicalExpressionNamespaceRanges = valueQualifierRanges.map(
        ({ start, end }) =>
          new vscode.Range(
            editor.document.positionAt(start),
            editor.document.positionAt(end),
          ),
      );
    } else {
      editor.setDecorations(importDecoration, []);
      editor.setDecorations(packageNamespaceDecoration, []);
    }
    editor.setDecorations(
      expressionNamespaceDecoration,
      currentCache?.expressionNamespaceRanges ?? lexicalExpressionNamespaceRanges,
    );
  }

  function updateVisibleEditors() {
    const documents = new Set();
    for (const editor of vscode.window.visibleTextEditors) {
      updateLexicalDecorations(editor);
      documents.add(editor.document);
    }
    if (!themeIsActive()) return;
    for (const document of documents) void updateSemanticDecorations(document);
  }

  function scheduleDocumentUpdate(document) {
    const key = document.uri.toString();
    clearTimeout(pendingUpdates.get(key));
    pendingUpdates.set(
      key,
      setTimeout(() => {
        pendingUpdates.delete(key);
        let visible = false;
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document !== document) continue;
          visible = true;
          updateLexicalDecorations(editor);
        }
        if (visible && themeIsActive()) void updateSemanticDecorations(document);
      }, UPDATE_DELAY_MS),
    );
  }

  context.subscriptions.push(
    importDecoration,
    packageNamespaceDecoration,
    expressionNamespaceDecoration,
    vscode.window.onDidChangeVisibleTextEditors(updateVisibleEditors),
    vscode.workspace.onDidChangeTextDocument(({ document }) => {
      lexicalAnalysisCache.delete(document.uri.toString());
      semanticDecorationCache.delete(document.uri.toString());
      scheduleDocumentUpdate(document);
    }),
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === "go" && themeIsActive()) {
        void updateSemanticDecorations(document);
      }
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      const key = document.uri.toString();
      semanticDecorationCache.delete(key);
      lexicalAnalysisCache.delete(key);
      semanticRequests.delete(key);
      semanticInFlight.delete(key);
      clearTimeout(pendingUpdates.get(key));
      pendingUpdates.delete(key);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("workbench.colorTheme")) updateVisibleEditors();
    }),
    {
      dispose() {
        for (const timeout of pendingUpdates.values()) clearTimeout(timeout);
        pendingUpdates.clear();
        semanticRequests.clear();
        semanticInFlight.clear();
        lexicalAnalysisCache.clear();
        semanticDecorationCache.clear();
      },
    },
  );

  updateVisibleEditors();
}

module.exports = { activate };
