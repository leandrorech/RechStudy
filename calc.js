/*
 * Pure calculation functions extracted from index.html.
 * Loaded as a plain classic script (both in the browser via
 * <script src="calc.js"></script> and in tests via `import "../calc.js"`),
 * so it must not use `import`/`export` syntax. It publishes its API on
 * `window.RechCalc` — the DOM wrapper functions in index.html
 * (wellsCalc, renalCalc, vmCalcPBW, vmCalc) call into this object instead
 * of inlining the formulas, but keep doing their own DOM reads/writes.
 *
 * Formulas and thresholds here are copied verbatim from the functions
 * they were extracted from — no clinical value, cutoff, or rounding was
 * changed as part of this extraction.
 */
(function (global) {
  // ---- Predicted Body Weight (ARDSNet) + Vt/kg PBW ----
  // Source: vmCalcPBW() / vmBCalc() in index.html.
  function calcPBW(sex, heightCm) {
    if (typeof heightCm !== "number" || isNaN(heightCm)) return NaN;
    const pbw =
      sex === "M" ? 50 + 0.91 * (heightCm - 152.4) : 45.5 + 0.91 * (heightCm - 152.4);
    return Math.max(pbw, 0);
  }

  // Source: vmCalc() "Vt/kg PBW" block in index.html.
  function calcVtPerKgPBW(vt, pbw) {
    if (typeof vt !== "number" || isNaN(vt)) return NaN;
    if (typeof pbw !== "number" || isNaN(pbw) || pbw <= 0) return NaN;
    return vt / pbw;
  }

  // ---- Wells score for PE (3-tier variant used in RechStudy) ----
  // Source: wellsCalc() in index.html. Thresholds: >6 alta, 2-6 intermediária, <2 baixa.
  function wellsScorePE(values) {
    const parts = [
      values.tvp,
      values.altDx,
      values.fc,
      values.imo,
      values.tepTvp,
      values.hem,
      values.neo,
    ];
    const score = parts.reduce((a, b) => a + b, 0);
    let category, msg, col;
    if (score > 6) {
      category = "alta";
      msg = "Probabilidade ALTA (>6): TC-AP diretamente sem aguardar D-dímero.";
      col = "#f87171";
    } else if (score >= 2) {
      category = "intermediaria";
      msg = "Probabilidade INTERMEDIÁRIA (2-6): D-dímero; se positivo → TC-AP.";
      col = "#fbbf24";
    } else {
      category = "baixa";
      msg =
        "Probabilidade BAIXA (<2): D-dímero; se negativo → exclui TEP com alta sensibilidade.";
      col = "#34d399";
    }
    return { score, category, msg, col };
  }

  // ---- Cockcroft-Gault creatinine clearance ----
  // Source: renalCalc() in index.html. Caller is expected to guard against
  // NaN cr/idade/peso before calling (see index.html's own isNaN gate) —
  // this function does not re-check, matching the original inline logic.
  function calcCockcroftGault(values) {
    const { cr, idade, peso, sex } = values;
    const clcr = ((140 - idade) * peso) / (72 * cr) * (sex === "F" ? 0.85 : 1);
    let estadio, col;
    if (clcr >= 90) {
      estadio = "G1 — Normal ou ↑";
      col = "#34d399";
    } else if (clcr >= 60) {
      estadio = "G2 — Leve";
      col = "#34d399";
    } else if (clcr >= 30) {
      estadio = "G3 — Moderado";
      col = "#fbbf24";
    } else if (clcr >= 15) {
      estadio = "G4 — Grave";
      col = "#f87171";
    } else {
      estadio = "G5 — Falência/Diálise";
      col = "#f87171";
    }
    return { clcr, estadio, col };
  }

  const api = { calcPBW, calcVtPerKgPBW, wellsScorePE, calcCockcroftGault };
  global.RechCalc = api;
})(typeof window !== "undefined" ? window : globalThis);
