import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Sentinel tests for clinically-significant static text in index.html that
// isn't exercised by any calculator function — reference tables, protocol
// notes, and disclaimers where the *wording itself* is the deliverable and a
// silent edit could reintroduce a wrong or overclaiming clinical statement.
// These intentionally assert both presence of the corrected wording and
// absence of the specific incorrect wording it replaced.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");

describe("SOFA cardiovascular — epinephrine option labels", () => {
  it("includes adrenalina at the 3pt and 4pt thresholds, alongside noradrenalina", () => {
    expect(html).toMatch(/Adr ≤0,1 \(3pts\)/);
    expect(html).toMatch(/Adr >0,1 \(4pts\)/);
  });
});

describe("Piperacilina-Tazobactam renal dosing table", () => {
  it("distinguishes general indications from nosocomial pneumonia dosing", () => {
    expect(html).toMatch(/Pip-Tazo \(indicações gerais\)[\s\S]{0,20}ClCr 20-40: 2,25g q6h/);
    expect(html).toMatch(/Pip-Tazo \(pneumonia nosocomial\)[\s\S]{0,20}ClCr 20-40: 3,375g q6h/);
  });

  it("gives the labeled hemodialysis supplemental dose (0,75g) instead of a bare 'dose suplementar'", () => {
    expect(html).toMatch(/HD: 2,25g q12h \+ 0,75g suplementar/);
    expect(html).toMatch(/HD: 2,25g q8h \+ 0,75g suplementar/);
  });

  it("separates extended-infusion protocol dosing from the standard-label renal table", () => {
    expect(html).toMatch(/Infusão estendida[\s\S]{0,40}protocolo institucional/);
    expect(html).not.toMatch(/3,375g q8h infusão estendida é para ClCr/);
  });
});

describe("Meropeném hemodialysis note", () => {
  it("hedges HD/DP dosing instead of asserting a universal supplemental dose", () => {
    expect(html).toMatch(/Meropeném[\s\S]{0,120}dados insuficientes para recomendação formal/);
    expect(html).not.toMatch(/Meropeném[\s\S]{0,80}pós-HD: dose suplementar</);
  });
});

describe("Cockcroft-Gault result label", () => {
  it("does not describe the ClCr-based bands as formal KDIGO staging", () => {
    expect(html).not.toMatch(/faixas KDIGO 2012/);
    expect(html).toMatch(/não equivale a eGFR\/estadiamento KDIGO formal/);
  });
});

describe("TTM / temperature note (PCR pós-RCE panel)", () => {
  it("cites the ERC-ESICM 2022 fever threshold and 'insufficient evidence' framing instead of presenting 32-36°C and normothermia as two equivalent options", () => {
    expect(html).toMatch(/prevenir ativamente febre \(>37,7°C\) por ≥72h/);
    expect(html).toMatch(/evidência insuficiente para recomendar a favor ou contra alvo de 32-36°C/);
    expect(html).toMatch(/TTM2 2021: 33°C não foi superior à normotermia/);
  });
});
