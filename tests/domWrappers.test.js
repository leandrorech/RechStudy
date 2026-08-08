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

  it("renders 'dados insuficientes' instead of a NaN score/false classification when an input is unparseable (fixed)", () => {
    setupWellsDom({ w_tvp: "abc" });
    wellsCalc();
    const html = document.getElementById("cr_wells").innerHTML;
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Probabilidade BAIXA");
    expect(html).toContain("Dados insuficientes");
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

  it("shows an invalid-creatinine message instead of 'Infinity mL/min' when cr is 0", () => {
    setupRenalDom({ cr: 0, idade: 40, peso: 70, sex: "M" });
    expect(() => renalCalc()).not.toThrow();
    const html = document.getElementById("cr_renal").innerHTML;
    expect(html).toContain("Creatinina deve ser maior que zero");
    expect(html).not.toContain("Infinity");
  });

  it("shows the same invalid-creatinine message for a negative cr", () => {
    setupRenalDom({ cr: -1, idade: 40, peso: 70, sex: "M" });
    expect(() => renalCalc()).not.toThrow();
    const html = document.getElementById("cr_renal").innerHTML;
    expect(html).toContain("Creatinina deve ser maior que zero");
    expect(html).not.toContain("Infinity");
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

describe("sofaCalc() DOM wrapper", () => {
  const { sofaCalc } = loadIndexHtmlFunctions(["cN", "cV", "cSet", "cAlrt", "cFmt", "sofaCalc"]);
  const ids = ["sofa_resp", "sofa_coag", "sofa_figado", "sofa_cardio", "sofa_neuro", "sofa_renal"];

  function setupSofaDom(values) {
    document.body.innerHTML =
      ids.map((id) => `<input id="c_${id}">`).join("") + `<div id="cr_sofa"></div>`;
    ids.forEach((id, i) => {
      document.getElementById(`c_${id}`).value = String(values[i] ?? 0);
    });
  }

  it("renders total + mortality band + sepsis-criterion note at score >=2", () => {
    setupSofaDom([2, 0, 0, 0, 0, 0]);
    sofaCalc();
    const html = document.getElementById("cr_sofa").innerHTML;
    expect(html).toContain(">2<");
    expect(html).toContain("Mortalidade &lt;10%"); // innerHTML escapes '<'
    expect(html).toContain("critério diagnóstico de sepse");
  });

  it("omits the sepsis-criterion note below score 2", () => {
    setupSofaDom([1, 0, 0, 0, 0, 0]);
    sofaCalc();
    const html = document.getElementById("cr_sofa").innerHTML;
    expect(html).not.toContain("critério diagnóstico de sepse");
  });
});

describe("qsofaCalc() DOM wrapper", () => {
  const { qsofaCalc } = loadIndexHtmlFunctions(["cN", "cV", "cSet", "cAlrt", "cFmt", "qsofaCalc"]);
  const ids = ["qsofa_fr", "qsofa_ecv", "qsofa_pas"];

  function setupQsofaDom(values) {
    document.body.innerHTML =
      ids.map((id) => `<input id="c_${id}">`).join("") + `<div id="cr_qsofa"></div>`;
    ids.forEach((id, i) => {
      document.getElementById(`c_${id}`).value = String(values[i] ?? 0);
    });
  }

  it("renders high-risk classification at total 2", () => {
    setupQsofaDom([1, 1, 0]);
    qsofaCalc();
    const html = document.getElementById("cr_qsofa").innerHTML;
    expect(html).toContain(">2</strong>/3");
    expect(html).toContain("alto risco de sepse");
  });
});

describe("chaCalc() + hasbledCalc() DOM wrappers", () => {
  const { chaCalc, hasbledCalc } = loadIndexHtmlFunctions([
    "cN",
    "cV",
    "cSet",
    "cAlrt",
    "cFmt",
    "chaCalc",
    "hasbledCalc",
  ]);

  it("chaCalc: renders anticoagulation-indicated message at score >=2", () => {
    document.body.innerHTML =
      ["cha_ic", "cha_has", "cha_idade", "cha_dm", "cha_avc", "cha_dvasc", "cha_sex"]
        .map((id) => `<input id="c_${id}" value="0">`)
        .join("") + `<div id="cr_cha"></div>`;
    document.getElementById("c_cha_ic").value = "1";
    document.getElementById("c_cha_has").value = "1";
    chaCalc();
    const html = document.getElementById("cr_cha").innerHTML;
    expect(html).toContain(">2</strong>");
    expect(html).toContain("anticoagulação indicada");
  });

  it("hasbledCalc: renders high-bleeding-risk message at score >=3", () => {
    document.body.innerHTML =
      ["hb_has", "hb_renal", "hb_hepato", "hb_avc", "hb_sang", "hb_labil", "hb_idade", "hb_drug"]
        .map((id) => `<input id="c_${id}" value="0">`)
        .join("") + `<div id="cr_hasbled"></div>`;
    ["hb_has", "hb_renal", "hb_hepato"].forEach((id) => {
      document.getElementById(`c_${id}`).value = "1";
    });
    hasbledCalc();
    const html = document.getElementById("cr_hasbled").innerHTML;
    expect(html).toContain(">3</strong>");
    expect(html).toContain("alto risco de sangramento");
  });
});

describe("agCalc() + agCalcFull() DOM wrappers", () => {
  const { agCalc, agCalcFull } = loadIndexHtmlFunctions([
    "cN",
    "cV",
    "cSet",
    "cAlrt",
    "cFmt",
    "agCalc",
    "agCalcFull",
  ]);

  function setupAgDom({ na, cl, hco3, alb, lac, ph, paco2 }) {
    document.body.innerHTML = `
      <input id="c_na" value="${na ?? ""}">
      <input id="c_cl" value="${cl ?? ""}">
      <input id="c_hco3" value="${hco3 ?? ""}">
      <input id="c_alb" value="${alb ?? ""}">
      <input id="c_ag_lac" value="${lac ?? ""}">
      <input id="c_ag_ph" value="${ph ?? ""}">
      <input id="c_ag_paco2" value="${paco2 ?? ""}">
      <div id="cr_ag"></div>`;
  }

  it("agCalc: renders AG + albumin-corrected AG + delta ratio for an elevated-AG case", () => {
    setupAgDom({ na: 140, cl: 95, hco3: 15, alb: 4.0 });
    agCalc();
    const html = document.getElementById("cr_ag").innerHTML;
    expect(html).toContain("AG elevado");
    expect(html).toContain("Delta ratio");
  });

  it("agCalcFull: renders the richer classification, Winter's formula, and lactate blocks", () => {
    // AG = 140-100-25 = 15 -> "elevado" tier (12 < 15 <= 20), not "muito elevado"
    setupAgDom({ na: 140, cl: 100, hco3: 25, alb: 4.0, lac: 5, ph: 7.2, paco2: 30 });
    agCalcFull();
    const html = document.getElementById("cr_ag").innerHTML;
    expect(html).toContain("MUDPILES");
    expect(html).toContain("Winter");
    expect(html).toContain("Lactato muito elevado");
  });

  it("agCalc and agCalcFull disagree on AG >20 wording for the same inputs (documented, not a bug — see PR notes)", () => {
    setupAgDom({ na: 160, cl: 100, hco3: 10, alb: 4.0 }); // AG = 50 -> agCalc: "elevado"; agCalcFull: "muito elevado"
    agCalc();
    const simpleHtml = document.getElementById("cr_ag").innerHTML;
    agCalcFull();
    const fullHtml = document.getElementById("cr_ag").innerHTML;
    expect(simpleHtml).toContain("AG elevado →");
    expect(fullHtml).toContain("AG muito elevado");
  });
});

describe("deltaCalc() DOM wrapper", () => {
  const { deltaCalc } = loadIndexHtmlFunctions(["cN", "cV", "cSet", "cAlrt", "cFmt", "deltaCalc"]);

  function setupDeltaDom({ ur, cr, tgo, tgp, bd, bt }) {
    document.body.innerHTML = `
      <input id="c_ur" value="${ur ?? ""}">
      <input id="c_cr" value="${cr ?? ""}">
      <input id="c_tgo" value="${tgo ?? ""}">
      <input id="c_tgp" value="${tgp ?? ""}">
      <input id="c_bd" value="${bd ?? ""}">
      <input id="c_bt" value="${bt ?? ""}">
      <div id="cr_delta"></div>`;
  }

  it("renders all three ratios when all fields are filled", () => {
    setupDeltaDom({ ur: 60, cr: 1.2, tgo: 70, tgp: 30, bd: 0.6, bt: 1.0 });
    deltaCalc();
    const html = document.getElementById("cr_delta").innerHTML;
    expect(html).toContain("Ureia/Creatinina");
    expect(html).toContain("TGO/TGP");
    expect(html).toContain("BD/BT");
  });

  it("shows the placeholder message when no fields are filled", () => {
    setupDeltaDom({});
    deltaCalc();
    const html = document.getElementById("cr_delta").innerHTML;
    expect(html).toContain("Preencha os campos para calcular");
  });
});

describe("vmBCalc() DOM wrapper (beira-leito panel)", () => {
  const { vmBCalc } = loadIndexHtmlFunctions(["cN", "cV", "cSet", "cAlrt", "cFmt", "vmBCalc"]);

  function setupVmBDom({ pplat, peep, vt, h, pao2, fio2, fr, p01, vtsp } = {}) {
    document.body.innerHTML = `
      <input id="c_vm_pplat" value="${pplat ?? ""}">
      <input id="c_vm_peep" value="${peep ?? ""}">
      <input id="c_vm_vt" value="${vt ?? ""}">
      <input id="c_vm_h" value="${h ?? ""}">
      <input id="c_vm_pao2" value="${pao2 ?? ""}">
      <input id="c_vm_fio2" value="${fio2 ?? ""}">
      <input id="c_vm_fr" value="${fr ?? ""}">
      <input id="c_vm_p01" value="${p01 ?? ""}">
      <input id="c_vm_vtsp" value="${vtsp ?? ""}">
      <div id="cr_vmb"></div>`;
    window.vmBSex = "M";
  }

  it("renders PBW, driving pressure, compliance, and Vt/kg PBW together", () => {
    setupVmBDom({ pplat: 28, peep: 8, vt: 396, h: 170 });
    vmBCalc();
    const html = document.getElementById("cr_vmb").innerHTML;
    expect(html).toContain("PBW");
    expect(html).toContain("Driving Pressure");
    expect(html).toContain("Compliance estática");
    expect(html).toContain("Vt/kg PBW");
    expect(html).toContain("meta ARDSNet");
  });

  it("clamps PBW to 0 instead of showing a negative weight for an unrealistically short height (fixed: now shares RechCalc.calcPBW's clamp instead of its own unclamped inline formula)", () => {
    setupVmBDom({ h: 50 }); // 50 + 0.91*(50-152.4) = -43.18 pre-fix
    vmBCalc();
    const html = document.getElementById("cr_vmb").innerHTML;
    expect(html).toContain("0.0</strong><span style=\"color:#7aab7a\"> kg</span>");
    expect(html).not.toContain("-43");
  });

  it("renders P/F ratio classification (Berlim 2012) when PaO2/FiO2 are provided", () => {
    setupVmBDom({ pao2: 90, fio2: 0.6 });
    vmBCalc();
    const html = document.getElementById("cr_vmb").innerHTML;
    expect(html).toContain("P/F");
    expect(html).toContain("SDRA Moderada (101-200)");
  });

  it("renders the Tobin index and P0.1 with the beira-leito-specific wording", () => {
    setupVmBDom({ fr: 30, vtsp: 250, p01: 4 });
    vmBCalc();
    const html = document.getElementById("cr_vmb").innerHTML;
    expect(html).toContain("Índice de Tobin");
    expect(html).toContain("alta prob de falha de desmame");
    expect(html).toContain("drive alto, risco P-SILI");
  });

  it("shows the placeholder message when no fields are filled", () => {
    setupVmBDom();
    vmBCalc();
    const html = document.getElementById("cr_vmb").innerHTML;
    expect(html).toContain("Preencha os campos para calcular");
  });
});
