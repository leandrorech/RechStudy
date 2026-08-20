import { describe, it, expect, vi, beforeEach } from "vitest";
import "../calc.js";
import { loadIndexHtmlFunctions } from "./helpers/extractFromHtml.js";

// Regression test for FIND-04 (RechStudy audit, Issue #8): gerarAtb() used to
// compute ClCr with the patient's age hardcoded to 60 (the ATB form has no
// age field), fabricating a renal-function number handed to the AI prompt.
// The fix removes the fabricated ClCr instead of inventing an age.

const { gerarAtb } = loadIndexHtmlFunctions(["gerarAtb"]);

let capturedPrompt;

beforeEach(() => {
  capturedPrompt = undefined;
  globalThis.S = {
    atbInput: { foco: "Pneumonia", origem: "hospitalar", cr: "2.0", peso: "70" },
    atbLoading: false,
    atbResult: "",
  };
  globalThis.newRun = () => 1;
  globalThis.isRunActive = () => true;
  globalThis.render = () => {};
  globalThis.addSS = () => {};
  globalThis.alert = () => {};
  globalThis.api = vi.fn(async (sys, prompt) => {
    capturedPrompt = prompt;
    return "esquema gerado";
  });
});

describe("gerarAtb() ClCr fabrication (FIND-04)", () => {
  it("never sends a Cockcroft-Gault estimate computed with an assumed age", async () => {
    await gerarAtb();
    expect(capturedPrompt).toBeDefined();
    // The old bug computed Math.round(((140-60)*peso)/(72*cr)) and printed
    // it as "ClCr estimado"/"ClCr ~"; no such fabricated number may appear.
    expect(capturedPrompt).not.toMatch(/ClCr estimado/);
    expect(capturedPrompt).not.toMatch(/ClCr ~\d/);
    expect(capturedPrompt).not.toMatch(/\(\(140-60\)/);
  });

  it("still passes the real creatinine value through, with an explicit no-age-assumed instruction", async () => {
    await gerarAtb();
    expect(capturedPrompt).toContain("CREATININA: 2 mg/dL");
    expect(capturedPrompt).toMatch(/idade.*não informada/i);
    expect(capturedPrompt).toMatch(/NÃO calcular ClCr/i);
  });

  it("still reports the fabrication-free wording in the renal-adjustment heading", async () => {
    await gerarAtb();
    expect(capturedPrompt).toContain("## ⚠️ Ajuste renal");
    expect(capturedPrompt).toMatch(/ClCr não calculável sem idade real/);
  });
});
