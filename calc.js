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

  // ---- SOFA (Sepsis-related Organ Failure Assessment) ----
  // Source: sofaCalc() in index.html.
  function sofaScore(scores) {
    const total = scores.reduce((a, b) => a + b, 0);
    let prog, col;
    if (total >= 11) {
      prog = "Mortalidade ~95%";
      col = "#f87171";
    } else if (total >= 9) {
      prog = "Mortalidade ~40-60%";
      col = "#f87171";
    } else if (total >= 7) {
      prog = "Mortalidade ~20-40%";
      col = "#fbbf24";
    } else if (total >= 5) {
      prog = "Mortalidade ~10-20%";
      col = "#fbbf24";
    } else if (total >= 2) {
      prog = "Mortalidade <10%";
      col = "#34d399";
    } else {
      prog = "Sem disfunção significativa";
      col = "#34d399";
    }
    return { total, prog, col };
  }

  // ---- qSOFA ----
  // Source: qsofaCalc() in index.html.
  function qsofaScore(values) {
    const total = [values.fr, values.ecv, values.pas].reduce((a, b) => a + b, 0);
    let msg, col;
    if (total >= 2) {
      msg =
        "qSOFA ≥2 — alto risco de sepse. Avaliar SOFA completo, lactato, culturas, antibiótico.";
      col = "#f87171";
    } else if (total === 1) {
      msg = "qSOFA 1 — monitorar e reavaliar.";
      col = "#34d399";
    } else {
      msg = "qSOFA 0 — baixo risco (triagem negativa).";
      col = "#34d399";
    }
    return { total, msg, col };
  }

  // ---- CHA₂DS₂-VASc ----
  // Source: chaCalc() in index.html.
  function chaVascScore(values) {
    const score = [
      values.ic,
      values.has,
      values.idade,
      values.dm,
      values.avc,
      values.dvasc,
      values.sex,
    ].reduce((a, b) => a + b, 0);
    let msg, col;
    if (score >= 2) {
      msg = "Score ≥2: anticoagulação indicada (exceto contraindicação). Preferir DOAC.";
      col = "#f87171";
    } else if (score === 1) {
      msg =
        "Score 1 (homem): considerar anticoagulação. Score 1 (mulher com só sexo feminino): não anticoagular.";
      col = "#fbbf24";
    } else {
      msg =
        "Score 0 (homem) / 1 (mulher=sexo): baixo risco — anticoagulação geralmente não indicada.";
      col = "#34d399";
    }
    return { score, msg, col };
  }

  // ---- HAS-BLED ----
  // Source: hasbledCalc() in index.html.
  function hasbledScore(values) {
    const score = [
      values.has,
      values.renal,
      values.hepato,
      values.avc,
      values.sang,
      values.labil,
      values.idade,
      values.drug,
    ].reduce((a, b) => a + b, 0);
    let msg, col;
    if (score >= 3) {
      msg =
        "HAS-BLED ≥3: alto risco de sangramento. Não contraindica anticoagulação, mas requer correção de fatores modificáveis e monitorização rigorosa.";
      col = "#f87171";
    } else {
      msg = "HAS-BLED <3: risco moderado/baixo.";
      col = "#34d399";
    }
    return { score, msg, col };
  }

  // ---- sPESI ----
  // Source: spesiCalc() in index.html.
  function spesiScore(values) {
    const score = [
      values.idade,
      values.neo,
      values.card,
      values.fc,
      values.pas,
      values.sat,
    ].reduce((a, b) => a + b, 0);
    let msg, col;
    if (score === 0) {
      msg =
        "sPESI 0: baixo risco (mortalidade 30d ~1%). Considerar alta precoce/tratamento domiciliar em selecionados.";
      col = "#34d399";
    } else {
      msg = `sPESI ${score}: alto risco (mortalidade 30d ~10%). Internação e monitorização necessárias.`;
      col = "#f87171";
    }
    return { score, msg, col };
  }

  // ---- Anion Gap (raw calc shared by agCalc() and agCalcFull()) ----
  // Source: agCalc()/agCalcFull() in index.html — both are live wrapper
  // functions bound to different inputs (agCalc to Na/Cl/HCO3/alb, agCalcFull
  // additionally to pH/PaCO2/lactate) and both write to the same result div,
  // so both are preserved distinctly rather than merged into one.
  function anionGapCore(na, cl, hco3, alb) {
    const ag = na - cl - hco3;
    const agCorr = isNaN(alb) ? ag : ag + 2.5 * (4.0 - alb);
    return { ag, agCorr };
  }

  // Source: agCalc()'s classification (threshold: >12 elevado).
  function classifyAnionGapSimple(agCorr) {
    if (agCorr > 12) {
      return {
        msg:
          "AG elevado → acidose metabólica com AG (MUDPILES: metanol, uremia, DKA, propileno, INH/ferro, lactato, etilenoglicol, salicilato)",
        col: "#f87171",
      };
    }
    return {
      msg: "AG normal (8-12) → acidose hiperclorêmica (diarreia, ATR, NaCl, ureterossigmoidostomia)",
      col: "#34d399",
    };
  }

  // Source: agCalc()'s delta ratio block (only computed when agCorr>12).
  function deltaRatioSimple(agCorr, hco3) {
    const deltaAG = agCorr - 12;
    const deltaHCO3 = 24 - hco3;
    const deltaRatio = deltaAG / Math.max(deltaHCO3, 0.1);
    let msg;
    if (deltaRatio < 0.4) msg = "Acidose metabólica hiperclorêmica coexistente";
    else if (deltaRatio < 1) msg = "Acidose mista (AG + normal)";
    else if (deltaRatio <= 2) msg = "Acidose metabólica pura com AG";
    else msg = "Alcalose metabólica coexistente";
    return { deltaRatio, msg, col: "#c084fc" };
  }

  // Source: agCalcFull()'s classification (thresholds: >20 muito elevado, >12 elevado).
  function classifyAnionGapFull(agCorr) {
    if (agCorr > 20) {
      return { msg: "AG muito elevado — causa grave (lactato, cetose, uremia, intoxicação)", col: "#f87171" };
    }
    if (agCorr > 12) {
      return {
        msg: "AG elevado — MUDPILES: Metanol, Uremia, DKA, Propileno, INH/Fe, Lactato, Etilenoglicol, Salicilato",
        col: "#fbbf24",
      };
    }
    return { msg: "AG normal — acidose hiperclorêmica (diarreia, ATR, SF, ureterossigmoidostomia)", col: "#34d399" };
  }

  // Source: agCalcFull()'s delta ratio block (only computed when agCorr>12).
  function deltaRatioFull(agCorr, hco3) {
    const dAG = agCorr - 12;
    const dHCO3 = 24 - hco3;
    const ratio = dAG / Math.max(dHCO3, 0.1);
    let msg;
    if (ratio < 0.4) msg = "Acidose hiperclorêmica pura ou coexistente";
    else if (ratio < 1.0) msg = "Acidose mista: AG elevado + hiperclorêmica";
    else if (ratio <= 2.0) msg = "Acidose metabólica com AG pura";
    else msg = "⚠️ Alcalose metabólica oculta coexistente — checar se HCO3 esperado > HCO3 medido";
    return { ratio, msg, col: ratio > 2 ? "#f87171" : "#c084fc" };
  }

  // Source: agCalcFull()'s Winter's formula compensation check.
  // (Original also computed an unused `ph_exp` local that was never read
  // by any output — dropped here since it has zero effect on behavior.)
  function wintersFormula(hco3, paco2) {
    const paco2Exp = 1.5 * hco3 + 8;
    const compOK = Math.abs(paco2 - paco2Exp) <= 2;
    return { paco2Exp, compOK };
  }

  // Source: agCalcFull()'s lactate interpretation block.
  function classifyLactate(lac) {
    if (lac > 4) {
      return {
        msg: "⚠️ Lactato muito elevado (>4) — hipoperfusão grave, hepatopatia ou intoxicação. Tratar causa, reavaliar em 2h",
        col: "#f87171",
      };
    }
    if (lac > 2) {
      return {
        msg: "⚠️ Lactato elevado (2-4 mmol/L) — hipoperfusão moderada. Investigar causa, reavaliação precoce",
        col: "#fbbf24",
      };
    }
    return { msg: "✅ Lactato ≤ 2 mmol/L", col: "#34d399" };
  }

  // ---- Biochemical ratios (deltaCalc()) ----
  // Source: deltaCalc()'s ureia/creatinina block (requires cr>0).
  function ureiaCreatininaRatio(ur, cr) {
    const ratio = ur / cr;
    let msg, col;
    if (ratio > 20) {
      msg = "Ureia/Cr >20 — sugere pré-renal ou sangramento GI alto";
      col = "#fbbf24";
    } else if (ratio < 10) {
      msg = "Ureia/Cr <10 — sugere NTA ou doença intrínseca";
      col = "#60a5fa";
    } else {
      msg = "Ureia/Cr 10-20 — zona indeterminada";
      col = "#34d399";
    }
    return { ratio, msg, col };
  }

  // Source: deltaCalc()'s TGO/TGP block (requires tgp>0).
  function tgoTgpRatio(tgo, tgp) {
    const ratio = tgo / tgp;
    let msg, col;
    if (ratio > 2) {
      msg = "TGO/TGP >2 — hepatite alcoólica (sensibilidade ~70%)";
      col = "#fbbf24";
    } else if (ratio > 1) {
      msg = "TGO/TGP 1-2 — inespecífico; pensar álcool, cirrose, NASH";
      col = "#fbbf24";
    } else {
      msg = "TGO/TGP <1 — hepatite viral, medicamentosa, isquêmica";
      col = "#34d399";
    }
    return { ratio, msg, col };
  }

  // Source: deltaCalc()'s BD/BT block (requires bt>0).
  function bdBtPercent(bd, bt) {
    const pct = (bd / bt) * 100;
    let msg, col;
    if (pct > 50) {
      msg = "BD/BT >50% — predomínio colestático/obstrução";
      col = "#fbbf24";
    } else {
      msg = "BD/BT <50% — predomínio de bilirrubina indireta (hemólise, Gilbert, disfunção conjugação)";
      col = "#34d399";
    }
    return { pct, msg, col };
  }

  // ---- Mechanical ventilation mechanics ----
  // Source: vmBCalc() (beira-leito panel) and vmCalc() (VM tab). Both
  // wrappers compute the same underlying mechanics but render distinct
  // wording, so each gets its own classify* function to preserve that
  // wording exactly rather than merging them into one shared message.
  function drivingPressure(pMeasured, peep) {
    return pMeasured - peep;
  }

  function staticCompliance(vt, pMeasured, peep) {
    return vt / (pMeasured - peep);
  }

  function tobinIndex(fr, vtspMl) {
    return fr / (vtspMl / 1000);
  }

  function pfRatio(pao2, fio2) {
    return pao2 / fio2;
  }

  // Source: vmBCalc()'s Driving Pressure block.
  function classifyDPBeiraleito(dp) {
    if (dp > 15) return { msg: "⚠️ DP >15 — revisar Vt/PEEP (só válido em passivo)", col: "#f87171" };
    if (dp > 13) return { msg: "⚠️ DP borderline 13-15", col: "#fbbf24" };
    return { msg: "✅ DP ≤13 cmH₂O", col: "#34d399" };
  }

  // Source: vmCalc()'s Driving Pressure block.
  function classifyDPVentilacao(dp) {
    if (dp > 15) {
      return {
        msg: "⚠️ DP > 15 cmH₂O — gatilho de revisão (Amato 2015). Avaliar: Vt, PEEP total, auto-PEEP, parede torácica. Confiável APENAS em paciente passivo.",
        col: "#f87171",
      };
    }
    if (dp > 13) {
      return { msg: "⚠️ DP 13-15 cmH₂O — zona de atenção. Interpretar com Pplat, complacência e contexto clínico.", col: "#fbbf24" };
    }
    return { msg: "✅ DP ≤ 13 cmH₂O. Meta favorável — manter contexto clínico. Só válido em modo controlado/passivo.", col: "#34d399" };
  }

  // Source: vmBCalc()'s Compliance estática block.
  function classifyComplianceBeiraleito(cst) {
    if (cst < 30) return { msg: "⚠️ Cst <30 — muito rígido (SDRA grave, atelectasia, PTX)", col: "#f87171" };
    if (cst < 50) return { msg: "⚠️ Cst 30-50 — SDRA/restrição", col: "#fbbf24" };
    return { msg: "✅ Cst normal >50", col: "#34d399" };
  }

  // Source: vmCalc()'s Compliance estática block.
  function classifyComplianceVentilacao(cst) {
    if (cst < 30) return { msg: "⚠️ Cst < 30 mL/cmH₂O — pulmão muito rígido. Suspeitar SDRA grave, atelectasia, pneumotórax, derrame.", col: "#f87171" };
    if (cst < 50) return { msg: "⚠️ Cst reduzida (30-50). SDRA leve-moderada ou doença restritiva.", col: "#fbbf24" };
    return { msg: "✅ Cst normal (> 50 mL/cmH₂O).", col: "#34d399" };
  }

  // Source: vmBCalc()'s Vt/kg PBW block.
  function classifyVtKgBeiraleito(vtkg) {
    if (vtkg > 8) return { msg: "⚠️ >8 mL/kg — acima do alvo protetor. Em SDRA: reduzir para 4-6", col: "#f87171" };
    if (vtkg > 6) return { msg: "⚠️ 6-8 mL/kg — aceitável em pulmão saudável", col: "#fbbf24" };
    return { msg: "✅ ≤6 mL/kg PBW — meta ARDSNet", col: "#34d399" };
  }

  // Source: vmCalc()'s Vt/kg PBW block.
  function classifyVtKgVentilacao(vtkg) {
    if (vtkg > 8) {
      return {
        msg: "⚠️ Vt/kg > 8 mL/kg PBW — acima do alvo protetor. Em SDRA: reduzir para 4-6 mL/kg. Vt alto aumenta risco, mas VILI depende também de Pplat, DP e mecânica.",
        col: "#f87171",
      };
    }
    if (vtkg > 6) return { msg: "⚠️ Vt/kg 6-8. Aceitável em pulmão não-SDRA. Em SDRA: reduzir.", col: "#fbbf24" };
    return { msg: "✅ Vt/kg ≤ 6 mL/kg PBW — meta protetora ARDSNet.", col: "#34d399" };
  }

  // Source: vmBCalc()'s P/F block (Berlim 2012).
  function classifyPF(pf) {
    let grau, col;
    if (pf <= 100) {
      grau = "Grave (≤100)";
      col = "#f87171";
    } else if (pf <= 200) {
      grau = "Moderada (101-200)";
      col = "#fbbf24";
    } else if (pf <= 300) {
      grau = "Leve (201-300)";
      col = "#fbbf24";
    } else {
      grau = "Normal (>300)";
      col = "#34d399";
    }
    return { grau, col };
  }

  // Source: vmBCalc()'s Índice de Tobin block.
  function classifyTobinBeiraleito(tobin) {
    if (tobin > 105) return { msg: "⚠️ >105 — alta prob de falha de desmame (Yang & Tobin 1991)", col: "#f87171" };
    return { msg: "✅ ≤105 — favorável ao desmame", col: "#34d399" };
  }

  // Source: vmCalc()'s Índice de Tobin block.
  function classifyTobinVentilacao(tobin) {
    if (tobin > 105) return { msg: "⚠️ Tobin > 105 — alta probabilidade de falha de desmame.", col: "#f87171" };
    return { msg: "✅ Tobin ≤ 105 — favorável ao desmame (Yang & Tobin, 1991).", col: "#34d399" };
  }

  // Source: vmBCalc()'s P0.1 block.
  function classifyP01Beiraleito(p01) {
    if (p01 > 3.5) return { msg: "⚠️ >3.5 — drive alto, risco P-SILI. Avaliar sedação/BNM", col: "#f87171" };
    if (p01 < 0.5) return { msg: "⚠️ <0.5 — drive baixo (sobressedação/fadiga)", col: "#fbbf24" };
    return { msg: "✅ 0.5-3.5 — zona segura", col: "#34d399" };
  }

  // Source: vmCalc()'s P0.1 block.
  function classifyP01Ventilacao(p01) {
    if (p01 > 3.5) return { msg: "⚠️ P0.1 > 3.5 cmH₂O — drive alto. Risco P-SILI. Considerar sedação/bloqueio.", col: "#f87171" };
    if (p01 < 0.5) return { msg: "⚠️ P0.1 < 0.5 — drive baixo. Avaliar sobressedação vs fadiga.", col: "#fbbf24" };
    return { msg: "✅ P0.1 0.5–3.5 cmH₂O — zona segura.", col: "#34d399" };
  }

  const api = {
    calcPBW,
    calcVtPerKgPBW,
    wellsScorePE,
    calcCockcroftGault,
    sofaScore,
    qsofaScore,
    chaVascScore,
    hasbledScore,
    spesiScore,
    anionGapCore,
    classifyAnionGapSimple,
    deltaRatioSimple,
    classifyAnionGapFull,
    deltaRatioFull,
    wintersFormula,
    classifyLactate,
    ureiaCreatininaRatio,
    tgoTgpRatio,
    bdBtPercent,
    drivingPressure,
    staticCompliance,
    tobinIndex,
    pfRatio,
    classifyDPBeiraleito,
    classifyDPVentilacao,
    classifyComplianceBeiraleito,
    classifyComplianceVentilacao,
    classifyVtKgBeiraleito,
    classifyVtKgVentilacao,
    classifyPF,
    classifyTobinBeiraleito,
    classifyTobinVentilacao,
    classifyP01Beiraleito,
    classifyP01Ventilacao,
  };
  global.RechCalc = api;
})(typeof window !== "undefined" ? window : globalThis);
