import { describe, it, expect, beforeEach } from "vitest";
import "../calc.js";
import { loadIndexHtmlFunctions } from "./helpers/extractFromHtml.js";

// These tests exercise the *actual* DOM wrapper functions from index.html
// (extracted at test time, not reimplemented) to confirm the calc.js
// extraction didn't change what gets read from/written to the DOM.

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("wellsCalc() DOM wrapper", () => {
  const { wellsCalc } = loadIndexHtmlFunctions([
    "cN",
    "cV",
    "cSet",
    "cAlrt",
    "cFmt",
    "wellsCalc",
  ]);

  function setupWellsDom(values) {
    const ids = ["w_tvp", "w_alt_dx", "w_fc", "w_imo", "w_tep_tvp", "w_hem", "w_neo"];
    // Real markup uses <select> populated with matching <option> values (cSel());
    // a plain <input> is used here since wellsCalc() only reads el.value via
    // parseFloat and doesn't care about the element type.
    document.body.innerHTML =
      ids.map((id) => `<input id="c_${id}">`).join("") + `<div id="cr_wells"></div>`;
    ids.forEach((id) => {
      document.getElementById(`c_${id}`).value = String(values[id] ?? 0);
    });
  }

  it("reads all 7 select inputs and renders the total score + alta classification", () => {
    setupWellsDom({ w_tvp: 3, w_alt_dx: 3, w_fc: 1.5 });
    wellsCalc();
    const html = document.getElementById("cr_wells").innerHTML;
    expect(html).toContain("7.5");
    expect(html).toContain("Probabilidade ALTA");
    expect(html).toContain("#f87171");
  });

  it("renders baixa classification when all inputs are 0", () => {
    setupWellsDom({});
    wellsCalc();
    const html = document.getElementById("cr_wells").innerHTML;
    expect(html).toContain(">0</strong>");
    expect(html).toContain("Probabilidade BAIXA");
  });

  it("renders intermediária classification at the exact score-6 boundary", () => {
    setupWellsDom({ w_tvp: 3, w_alt_dx: 3 });
    wellsCalc();
    const html = document.getElementById("cr_wells").innerHTML;
    expect(html).toContain(">6</strong>");
    expect(html).toContain("INTERMEDIÁRIA");
  });
});

describe("renalCalc() DOM wrapper", () => {
  const { renalCalc } = loadIndexHtmlFunctions([
    "cN",
    "cV",
    "cSet",
    "cAlrt",
    "cFmt",
    "renalCalc",
  ]);

  function setupRenalDom({ cr, idade, peso, sex }) {
    document.body.innerHTML = `
      <input id="c_cr_cr" value="${cr ?? ""}">
      <input id="c_cr_idade" value="${idade ?? ""}">
      <input id="c_cr_peso" value="${peso ?? ""}">
      <select id="c_cr_sex"><option value="${sex ?? "M"}" selected>${sex ?? "M"}</option></select>
      <div id="cr_renal"></div>`;
  }

  it("computes ClCr and renders KDIGO staging + unit for a reference case", () => {
    setupRenalDom({ cr: 1.2, idade: 65, peso: 70, sex: "M" });
    renalCalc();
    const html = document.getElementById("cr_renal").innerHTML;
    expect(html).toContain("60.8"); // cFmt rounds to 1 decimal
    expect(html).toContain("mL/min");
    expect(html).toContain("G2 — Leve");
  });

  it("shows the low-ClCr dose-adjustment warning below 30 mL/min", () => {
    // ((140-70)*60)/(72*2.5)*0.85 = 19.83... -> G4, still <30 so warning shows
    setupRenalDom({ cr: 2.5, idade: 70, peso: 60, sex: "F" });
    renalCalc();
    const html = document.getElementById("cr_renal").innerHTML;
    expect(html).toContain("G4 — Grave");
    expect(html).toContain("ajuste necessário");
  });

  it("shows the empty-fields message and does not throw when inputs are missing", () => {
    setupRenalDom({ cr: "", idade: "", peso: "", sex: "M" });
    expect(() => renalCalc()).not.toThrow();
    const html = document.getElementById("cr_renal").innerHTML;
    expect(html).toContain("Preencha todos os campos");
  });
});

describe("vmCalcPBW() + vmCalc() DOM wrappers", () => {
  const { vmCalcPBW, vmCalc } = loadIndexHtmlFunctions([
    "g",
    "vmSet",
    "vmFmt",
    "vmAlert",
    "vmCalcPBW",
    "vmCalc",
  ]);

  function setupVmDom({ altura, pp, peep, vt }) {
    document.body.innerHTML = `
      <input id="vm_altura" value="${altura ?? ""}">
      <div id="vm_pbw_display"></div>
      <input id="vm_pp" value="${pp ?? ""}">
      <input id="vm_peep" value="${peep ?? ""}">
      <input id="vm_vt" value="${vt ?? ""}">
      <input id="vm_p01" value="">
      <input id="vm_fr" value="">
      <input id="vm_vtsp" value="">
      <div id="vm_calc_res"></div>`;
    window.vmSex = "M";
  }

  it("computes and displays PBW from height, then feeds it into Vt/kg PBW", () => {
    setupVmDom({ altura: 170, pp: 30, peep: 10, vt: 396 });
    vmCalcPBW();
    expect(document.getElementById("vm_pbw_display").textContent).toBe("66.0 kg");
    expect(window.vmPBW).toBeCloseTo(66.016, 3);

    const html = document.getElementById("vm_calc_res").innerHTML;
    expect(html).toContain("Driving Pressure");
    expect(html).toContain("Vt/kg PBW");
    // 396 / 66.016 ≈ 6.0 mL/kg
    expect(html).toMatch(/6\.0.*mL\/kg/s);
    expect(html).toContain("meta protetora ARDSNet");
  });

  it("flags Vt/kg PBW above the 8 mL/kg threshold", () => {
    setupVmDom({ altura: 170, pp: 30, peep: 10, vt: 600 });
    vmCalcPBW();
    const html = document.getElementById("vm_calc_res").innerHTML;
    expect(html).toMatch(/9\.[0-9].*mL\/kg/s);
    expect(html).toContain("acima do alvo protetor");
  });

  it("shows placeholder text when no fields are filled", () => {
    setupVmDom({});
    vmCalcPBW();
    expect(document.getElementById("vm_pbw_display").textContent).toBe("— kg");
    const html = document.getElementById("vm_calc_res").innerHTML;
    expect(html).toContain("Preencha os campos acima para calcular");
  });
});
