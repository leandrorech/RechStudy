import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeEach } from "vitest";

// Regression test for FIND-02 (RechStudy audit, Issue #8): a legacy
// single-provider (Anthropic-only) api()/promptKey()/deleteKey()/
// updateKeyStatus() subsystem used to live in index.html, neutralized only
// by the 3 provider scripts below reassigning those same global names once
// loaded last. That reassignment used to be a bare identifier assignment
// (`api=...`), which only works because the legacy `function api(){}` etc.
// declarations existed beforehand — deleting them without changing the
// provider scripts would break page load with a strict-mode ReferenceError.
//
// The fix makes the provider scripts assign via `window.X=` explicitly, so
// they no longer depend on any prior declaration existing. This test proves
// that loading only the 3 provider scripts (nothing standing in for the
// deleted legacy block) still defines window.api/promptKey/deleteKey/
// updateKeyStatus as functions, with no error thrown.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function runGlobalScript(relPath) {
  const src = fs.readFileSync(path.join(root, relPath), "utf8");
  // Executes the script's source as a global-scope script (matching how a
  // <script src> tag runs it), the same way index.html loads it.
  // eslint-disable-next-line no-new-func
  new Function(src)();
}

beforeEach(() => {
  document.body.innerHTML = "";
  // Minimal stand-ins for what index.html itself defines before these
  // <script> tags in the real page (app state + render loop) — not part of
  // the legacy AI subsystem under test here.
  globalThis.S = {};
  globalThis.render = function render() {};
  delete globalThis.api;
  delete globalThis.promptKey;
  delete globalThis.deleteKey;
  delete globalThis.updateKeyStatus;
});

describe("rech-ai-*.js load order (FIND-02 regression)", () => {
  it("defines window.api/promptKey/deleteKey/updateKeyStatus without any legacy fallback present, and without throwing", () => {
    expect(() => {
      runGlobalScript("rech-ai-config.js");
      runGlobalScript("rech-ai-ui.js");
      runGlobalScript("rech-ai-transport.js");
    }).not.toThrow();

    expect(typeof globalThis.api).toBe("function");
    expect(typeof globalThis.promptKey).toBe("function");
    expect(typeof globalThis.deleteKey).toBe("function");
    expect(typeof globalThis.updateKeyStatus).toBe("function");
  });
});
