import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { resolveSemanticStyle } from "./lib/semantic-style.mjs";

const require = createRequire(import.meta.url);
const { findExpressionNamespaceRanges } = require("../src/semantic-namespace-ranges.cjs");

const repoRoot = resolve(import.meta.dirname, "..");
const fixturePath = join(repoRoot, "tests", "semantic-provider-cases.json");
const fixtures = JSON.parse(await readFile(fixturePath, "utf8"));
const modifierPolicy = JSON.parse(
  await readFile(join(repoRoot, "tests", "semantic-modifier-policy.json"), "utf8"),
);
const extensionManifest = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
const styleBindings = JSON.parse(
  await readFile(join(repoRoot, "themes", "zed-style-bindings.json"), "utf8"),
).semanticTokenStyles;
const dumpTokens = process.argv.includes("--dump");
const requestedProviders = new Set(
  process.argv
    .filter((argument) => argument.startsWith("--provider="))
    .map((argument) => argument.slice("--provider=".length)),
);

const standardTokenTypes = [
  "namespace",
  "type",
  "class",
  "enum",
  "interface",
  "struct",
  "typeParameter",
  "parameter",
  "variable",
  "property",
  "enumMember",
  "event",
  "function",
  "method",
  "macro",
  "label",
  "comment",
  "string",
  "keyword",
  "number",
  "regexp",
  "operator",
  "decorator",
  // Common provider-defined types registered by VS Code extensions. Advertising
  // them avoids lossy server fallbacks (for example Rust builtinType -> namespace).
  "member",
  "typeAlias",
  "builtinType",
  "builtinAttribute",
  "attribute",
  "attributeBracket",
  "character",
  "boolean",
  "const",
  "constParameter",
  "selfKeyword",
  "selfTypeKeyword",
  "lifetime",
  "static",
  "union",
  "generic",
  "derive",
  "deriveHelper",
  "procMacro",
  "toolModule",
  "unresolvedReference",
  "escapeSequence",
  "formatSpecifier",
  "invalidEscapeSequence",
  "punctuation",
  "angle",
  "brace",
  "bracket",
  "parenthesis",
  "colon",
  "comma",
  "dot",
  "semicolon",
  "macroBang",
  "arithmetic",
  "bitwise",
  "comparison",
  "logical",
  "negation",
  "jsonComment",
  "jsonKeyword",
  "jsonNumber",
  "jsonOperator",
  "jsonPropertyName",
  "jsonPunctuation",
  "jsonString",
  "markupAttribute",
  "markupAttributeValue",
  "markupComment",
  "markupElement",
  "markupOperator",
  "markupTagDelimiter",
];

const standardTokenModifiers = [
  "declaration",
  "definition",
  "readonly",
  "static",
  "deprecated",
  "abstract",
  "async",
  "modification",
  "documentation",
  "defaultLibrary",
  // Common provider-defined modifiers registered by VS Code language
  // extensions. Without advertising these, servers may collapse a richer
  // classification into a different token type before it reaches the theme.
  "attribute",
  "callable",
  "constant",
  "consuming",
  "controlFlow",
  "crateRoot",
  "injected",
  "intraDocLink",
  "library",
  "macro",
  "mutable",
  "procMacro",
  "public",
  "reference",
  "trait",
  "unsafe",
  "classScope",
  "fileScope",
  "functionScope",
  "globalScope",
];

class LspClient {
  constructor(command, args, cwd) {
    this.child = spawn(command, args, {
      cwd,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.buffer = Buffer.alloc(0);
    this.nextId = 1;
    this.pending = new Map();
    this.stderr = "";
    this.semanticProvider = undefined;

    this.child.stdout.on("data", (chunk) => this.receive(chunk));
    this.child.stderr.on("data", (chunk) => {
      this.stderr += chunk.toString();
    });
    this.child.on("error", (error) => {
      for (const { reject } of this.pending.values()) reject(error);
      this.pending.clear();
    });
    this.child.on("exit", (code, signal) => {
      if (this.pending.size === 0) return;
      const error = new Error(
        `language server exited before replying (code=${code}, signal=${signal})\n${this.stderr}`,
      );
      for (const { reject } of this.pending.values()) reject(error);
      this.pending.clear();
    });
  }

  receive(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) return;
      const header = this.buffer.subarray(0, headerEnd).toString("ascii");
      const lengthMatch = header.match(/Content-Length:\s*(\d+)/i);
      assert(lengthMatch, `missing Content-Length header: ${header}`);
      const length = Number(lengthMatch[1]);
      const bodyStart = headerEnd + 4;
      if (this.buffer.length < bodyStart + length) return;
      const message = JSON.parse(this.buffer.subarray(bodyStart, bodyStart + length).toString());
      this.buffer = this.buffer.subarray(bodyStart + length);
      this.handle(message);
    }
  }

  handle(message) {
    if (message.method === "client/registerCapability") {
      for (const registration of message.params?.registrations ?? []) {
        if (registration.method === "textDocument/semanticTokens") {
          this.semanticProvider = registration.registerOptions;
        }
      }
    }

    if (message.method && message.id !== undefined) {
      let result = null;
      if (message.method === "workspace/configuration") {
        result = (message.params?.items ?? []).map(() => null);
      } else if (message.method === "workspace/workspaceFolders") {
        result = this.workspaceFolders;
      }
      this.send({ jsonrpc: "2.0", id: message.id, result });
      return;
    }

    if (message.id === undefined) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) {
      pending.reject(new Error(`${message.error.message} (${message.error.code})`));
    } else {
      pending.resolve(message.result);
    }
  }

  send(message) {
    const body = JSON.stringify(message);
    this.child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  }

  notify(method, params = {}) {
    this.send({ jsonrpc: "2.0", method, params });
  }

  request(method, params = {}, timeoutMs = 30_000) {
    const id = this.nextId++;
    return new Promise((resolveRequest, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timed out waiting for ${method}\n${this.stderr}`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolveRequest, reject, timer });
      this.send({ jsonrpc: "2.0", id, method, params });
    });
  }

  async initialize(rootUri, initializationOptions) {
    this.workspaceFolders = [{ uri: rootUri, name: "semantic-fixture" }];
    const result = await this.request(
      "initialize",
      {
        processId: process.pid,
        clientInfo: { name: "zed-onedark-semantic-tests", version: "1" },
        rootUri,
        workspaceFolders: this.workspaceFolders,
        initializationOptions,
        capabilities: {
          workspace: { configuration: true, workspaceFolders: true },
          textDocument: {
            semanticTokens: {
              dynamicRegistration: true,
              requests: { range: false, full: true },
              tokenTypes: standardTokenTypes,
              tokenModifiers: standardTokenModifiers,
              formats: ["relative"],
              overlappingTokenSupport: false,
              multilineTokenSupport: false,
            },
          },
          general: { positionEncodings: ["utf-16"] },
        },
      },
      60_000,
    );
    this.semanticProvider = result.capabilities.semanticTokensProvider ?? this.semanticProvider;
    this.notify("initialized");
    return result;
  }

  async stop() {
    try {
      await this.request("shutdown", {}, 5_000);
      this.notify("exit");
    } catch {
      this.child.kill();
    }
  }
}

function decodeTokens(data, legend, source) {
  const lines = source.split("\n");
  const tokens = [];
  let line = 0;
  let start = 0;
  for (let index = 0; index < data.length; index += 5) {
    const [deltaLine, deltaStart, length, tokenType, modifierBits] = data.slice(index, index + 5);
    line += deltaLine;
    start = deltaLine === 0 ? start + deltaStart : deltaStart;
    const modifiers = legend.tokenModifiers.filter((_, bit) => modifierBits & 2 ** bit);
    tokens.push({
      line: line + 1,
      start,
      length,
      text: lines[line]?.slice(start, start + length),
      type: legend.tokenTypes[tokenType],
      modifiers,
    });
  }
  return tokens;
}

function findExpectedToken(tokens, expectation) {
  const candidates = tokens.filter(
    (token) => token.line === expectation.line && token.text === expectation.text,
  );
  return candidates[(expectation.occurrence ?? 1) - 1];
}

async function writeFixture(root, fixture) {
  for (const [relativePath, content] of Object.entries(fixture.files)) {
    const path = join(root, relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
}

async function requestSemanticTokens(client, uri) {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const result = await client.request("textDocument/semanticTokens/full", { textDocument: { uri } });
      if (result?.data?.length) return result.data;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw lastError ?? new Error("semantic token provider returned no tokens");
}

let providerCount = 0;
let documentCount = 0;
let expectationCount = 0;
let lexicalGoVariableCount = 0;

for (const fixture of fixtures.providers) {
  if (requestedProviders.size > 0 && !requestedProviders.has(fixture.id)) continue;
  const fixtureRoot = await mkdtemp(join(tmpdir(), `zed-semantic-${fixture.id}-`));
  let client;
  try {
    await writeFixture(fixtureRoot, fixture);
    const command = fixture.command.replace("${repoRoot}", repoRoot);
    const args = fixture.args.map((argument) => argument.replace("${repoRoot}", repoRoot));
    const rawInitializationOptions = fixture.initializationOptionsFromConfigurationDefault
      ? extensionManifest.contributes?.configurationDefaults?.[
          fixture.initializationOptionsFromConfigurationDefault
        ] ?? {}
      : fixture.initializationOptions ?? {};
    const initializationOptions = JSON.parse(
      JSON.stringify(rawInitializationOptions).replaceAll("${repoRoot}", repoRoot),
    );
    const goVariablesOwnedByGrammar =
      fixture.id === "go" &&
      initializationOptions["ui.semanticTokenTypes"]?.variable === false;
    client = new LspClient(command, args, fixtureRoot);
    const rootUri = pathToFileURL(fixtureRoot).href;
    await client.initialize(rootUri, initializationOptions);
    const provider = client.semanticProvider;
    assert(provider && typeof provider === "object", `${fixture.id} did not advertise semantic tokens`);
    assert(provider.legend, `${fixture.id} did not provide a semantic token legend`);
    const knownModifiers = new Set([
      ...Object.keys(modifierPolicy.roleRules),
      ...modifierPolicy.contextual,
    ]);
    for (const modifier of provider.legend.tokenModifiers) {
      assert(
        knownModifiers.has(modifier),
        `${fixture.id} advertised unclassified semantic modifier ${modifier}`,
      );
    }
    if (dumpTokens) {
      console.log(`\n[${fixture.id}:legend] ${provider.legend.tokenTypes.join(", ")}`);
      console.log(`[${fixture.id}:modifiers] ${provider.legend.tokenModifiers.join(", ")}`);
    }

    for (const document of fixture.documents) {
      const path = join(fixtureRoot, document.path);
      const source = await readFile(path, "utf8");
      const uri = pathToFileURL(path).href;
      client.notify("textDocument/didOpen", {
        textDocument: {
          uri,
          languageId: document.languageId,
          version: 1,
          text: source,
        },
      });
      const data = await requestSemanticTokens(client, uri);
      const tokens = decodeTokens(data, provider.legend, source);
      if (goVariablesOwnedByGrammar) {
        assert.equal(
          tokens.some(({ type }) => type === "variable"),
          false,
          `${fixture.id}:${document.path} must leave variable highlighting to the Go grammar`,
        );
      }
      const expressionNamespaceRanges = new Set(
        findExpressionNamespaceRanges(
          source,
          tokens.map((token) => ({ ...token, line: token.line - 1 })),
          document.languageId,
        ).map(({ line, start }) => `${line}:${start}`),
      );
      for (const token of tokens) {
        assert(
          resolveSemanticStyle(styleBindings, token),
          `${fixture.id}:${document.path}:${token.line} has no theme mapping for ${token.type}${token.modifiers.map((modifier) => `.${modifier}`).join("")}`,
        );
      }

      if (dumpTokens) {
        console.log(`\n[${fixture.id}:${document.path}]`);
        for (const token of tokens) {
          console.log(
            `${String(token.line).padStart(3)}:${String(token.start + 1).padStart(2)} ${token.text} -> ${token.type}${token.modifiers.length ? ` [${token.modifiers.join(",")}]` : ""}`,
          );
        }
      }

      for (const expectation of document.expectations) {
        const token = findExpectedToken(tokens, expectation);
        const expectedTypes = Array.isArray(expectation.type) ? expectation.type : [expectation.type];
        if (!token && goVariablesOwnedByGrammar && expectedTypes.includes("variable")) {
          lexicalGoVariableCount += 1;
          expectationCount += 1;
          continue;
        }
        assert(
          token,
          `${fixture.id}:${document.path}:${expectation.line} missing semantic token ${expectation.text} occurrence ${expectation.occurrence ?? 1}`,
        );
        assert(
          expectedTypes.includes(token.type),
          `${fixture.id}:${document.path}:${expectation.line} ${expectation.text}: expected ${expectedTypes.join("|")}, received ${token.type}`,
        );
        for (const modifier of expectation.modifiers ?? []) {
          assert(
            token.modifiers.includes(modifier),
            `${fixture.id}:${document.path}:${expectation.line} ${expectation.text}: missing ${modifier} modifier`,
          );
        }
        const expectedStyles = Array.isArray(expectation.style)
          ? expectation.style
          : [expectation.style];
        assert(
          expectedStyles.includes(resolveSemanticStyle(styleBindings, token)),
          `${fixture.id}:${document.path}:${expectation.line} ${expectation.text}: ${token.type}${token.modifiers.map((modifier) => `.${modifier}`).join("")} must map to one of ${expectedStyles.join("|")}`,
        );
        if (expectation.contextStyle) {
          const key = `${token.line - 1}:${token.start}`;
          const contextStyle = expressionNamespaceRanges.has(key)
            ? "variable"
            : resolveSemanticStyle(styleBindings, token);
          assert.equal(
            contextStyle,
            expectation.contextStyle,
            `${fixture.id}:${document.path}:${expectation.line} ${expectation.text}: contextual override must map to Zed ${expectation.contextStyle}`,
          );
        }
        expectationCount += 1;
      }
      documentCount += 1;
      client.notify("textDocument/didClose", { textDocument: { uri } });
    }
    providerCount += 1;
  } catch (error) {
    error.message = `${fixture.id}: ${error.message}`;
    if (client?.stderr) error.message += `\n${client.stderr}`;
    throw error;
  } finally {
    await client?.stop();
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

assert(providerCount > 0, "no semantic token providers selected");
if (!dumpTokens) {
  console.log(
    `Semantic provider integration passed: ${expectationCount} symbols across ${documentCount} documents and ${providerCount} language servers${lexicalGoVariableCount ? `; ${lexicalGoVariableCount} Go variables intentionally owned by the grammar` : ""}`,
  );
}
