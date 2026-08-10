import { describe, it, expect } from "vitest";
import "../calc.js";

const {
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
} = window.RechCalc;

describe("sofaScore", () => {
  it("computes a reference total and mortality band", () => {
    const r = sofaScore([2, 1, 0, 1, 0, 1]); // total 5
    expect(r.total).toBe(5);
    expect(r.prog).toBe("Mortalidade ~10-20%");
    expect(r.col).toBe("#fbbf24");
  });

  it("classifies total 0 as 'sem disfunção significativa'", () => {
    const r = sofaScore([0, 0, 0, 0, 0, 0]);
    expect(r.total).toBe(0);
    expect(r.prog).toBe("Sem disfunção significativa");
  });

  it.each([
    [1, "Sem disfunção significativa"],
    [2, "Mortalidade <10%"],
    [4, "Mortalidade <10%"],
    [5, "Mortalidade ~10-20%"],
    [6, "Mortalidade ~10-20%"],
    [7, "Mortalidade ~20-40%"],
    [8, "Mortalidade ~20-40%"],
    [9, "Mortalidade ~40-60%"],
    [10, "Mortalidade ~40-60%"],
    [11, "Mortalidade ~95%"],
    [24, "Mortalidade ~95%"],
  ])("classifies total %i as %s (boundary sweep)", (total, expected) => {
    // distribute the total across the 6 organ systems (each 0-4) to hit it exactly
    const scores = [Math.min(total, 4), Math.max(total - 4, 0), 0, 0, 0, 0];
    expect(sofaScore(scores).prog).toBe(expected);
  });
});

describe("qsofaScore", () => {
  it("flags high risk at total 2 (boundary inclusive)", () => {
    const r = qsofaScore({ fr: 1, ecv: 1, pas: 0 });
    expect(r.total).toBe(2);
    expect(r.col).toBe("#f87171");
    expect(r.msg).toMatch(/alto risco/);
  });

  it("treats total 1 as 'monitorar'", () => {
    const r = qsofaScore({ fr: 1, ecv: 0, pas: 0 });
    expect(r.total).toBe(1);
    expect(r.msg).toMatch(/monitorar/);
  });

  it("treats total 0 as baixo risco", () => {
    const r = qsofaScore({ fr: 0, ecv: 0, pas: 0 });
    expect(r.msg).toMatch(/baixo risco/);
  });
});

describe("chaVascScore (CHA2DS2-VASc)", () => {
  it("indicates anticoagulation at score 2 (boundary inclusive)", () => {
    const r = chaVascScore({ ic: 1, has: 1, idade: 0, dm: 0, avc: 0, dvasc: 0, sex: 0 });
    expect(r.score).toBe(2);
    expect(r.col).toBe("#f87171");
  });

  it("treats score 1 as 'considerar' (yellow)", () => {
    const r = chaVascScore({ ic: 1, has: 0, idade: 0, dm: 0, avc: 0, dvasc: 0, sex: 0 });
    expect(r.score).toBe(1);
    expect(r.col).toBe("#fbbf24");
  });

  it("treats score 0 as low risk", () => {
    const r = chaVascScore({ ic: 0, has: 0, idade: 0, dm: 0, avc: 0, dvasc: 0, sex: 0 });
    expect(r.score).toBe(0);
    expect(r.col).toBe("#34d399");
  });

  it("sums the AVC criterion's +2 weight correctly", () => {
    const r = chaVascScore({ ic: 0, has: 0, idade: 0, dm: 0, avc: 2, dvasc: 0, sex: 0 });
    expect(r.score).toBe(2);
  });
});

describe("hasbledScore", () => {
  it("flags high risk at score 3 (boundary inclusive)", () => {
    const r = hasbledScore({ has: 1, renal: 1, hepato: 1, avc: 0, sang: 0, labil: 0, idade: 0, drug: 0 });
    expect(r.score).toBe(3);
    expect(r.col).toBe("#f87171");
  });

  it("treats score 2 as moderate/low", () => {
    const r = hasbledScore({ has: 1, renal: 1, hepato: 0, avc: 0, sang: 0, labil: 0, idade: 0, drug: 0 });
    expect(r.score).toBe(2);
    expect(r.col).toBe("#34d399");
  });

  it("scores drug and alcohol as independent +1 criteria, reaching the true max of 9", () => {
    const r = hasbledScore({
      has: 1, renal: 1, hepato: 1, avc: 1, sang: 1, labil: 1, idade: 1, drug: 1, alcool: 1,
    });
    expect(r.score).toBe(9);
  });

  it("defaults alcool to 0 for callers that omit it (backward compatible)", () => {
    const r = hasbledScore({ has: 1, renal: 1, hepato: 1, avc: 0, sang: 0, labil: 0, idade: 0, drug: 0 });
    expect(r.score).toBe(3);
  });
});

describe("spesiScore", () => {
  it("treats score 0 as baixo risco", () => {
    const r = spesiScore({ idade: 0, neo: 0, card: 0, fc: 0, pas: 0, sat: 0 });
    expect(r.score).toBe(0);
    expect(r.col).toBe("#34d399");
    expect(r.msg).toMatch(/baixo risco/);
  });

  it("treats score 1 as alto risco and interpolates the score into the message", () => {
    const r = spesiScore({ idade: 1, neo: 0, card: 0, fc: 0, pas: 0, sat: 0 });
    expect(r.score).toBe(1);
    expect(r.col).toBe("#f87171");
    expect(r.msg).toContain("sPESI 1");
  });
});

describe("anionGapCore + classifyAnionGapSimple + deltaRatioSimple (agCalc)", () => {
  it("computes AG and albumin-corrected AG for a reference case", () => {
    const { ag, agCorr } = anionGapCore(140, 105, 20, 3.0);
    expect(ag).toBe(15);
    expect(agCorr).toBeCloseTo(17.5, 6); // 15 + 2.5*(4.0-3.0)
  });

  it("skips albumin correction when albumin is NaN", () => {
    const { ag, agCorr } = anionGapCore(140, 105, 24, NaN);
    expect(ag).toBe(11);
    expect(agCorr).toBe(11);
  });

  it("classifies exactly 12 as normal (boundary is strictly >12)", () => {
    expect(classifyAnionGapSimple(12).col).toBe("#34d399");
  });

  it("classifies just above 12 as elevated", () => {
    expect(classifyAnionGapSimple(12.01).col).toBe("#f87171");
  });

  it("computes the simple delta ratio and maps it to the correct band", () => {
    // agCorr=20, hco3=20 -> deltaAG=8, deltaHCO3=4, ratio=2 -> "<=2" band
    const r = deltaRatioSimple(20, 20);
    expect(r.deltaRatio).toBe(2);
    expect(r.msg).toBe("Acidose metabólica pura com AG");
    expect(r.col).toBe("#c084fc");
  });

  it("guards the delta-HCO3 denominator at 0.1 to avoid division by zero", () => {
    // agCorr=20, hco3=24 -> deltaHCO3=0 -> guarded to 0.1
    const r = deltaRatioSimple(20, 24);
    expect(r.deltaRatio).toBeCloseTo(8 / 0.1, 6);
  });

  it("classifies a delta ratio between 0.4 and 1 as mixed acidosis", () => {
    // agCorr=12.5 -> deltaAG=0.5, hco3=23 -> deltaHCO3=1, ratio=0.5
    const r = deltaRatioSimple(12.5, 23);
    expect(r.deltaRatio).toBe(0.5);
    expect(r.msg).toBe("Acidose mista (AG + normal)");
  });

  it("classifies a delta ratio below 0.4 as coexisting hyperchloremic acidosis", () => {
    // agCorr=15 -> deltaAG=3, hco3=14 -> deltaHCO3=10, ratio=0.3
    const r = deltaRatioSimple(15, 14);
    expect(r.deltaRatio).toBe(0.3);
    expect(r.msg).toBe("Acidose metabólica hiperclorêmica coexistente");
  });
});

describe("classifyAnionGapFull + deltaRatioFull (agCalcFull)", () => {
  it("classifies exactly 20 as elevado (not muito elevado — boundary strictly >20)", () => {
    expect(classifyAnionGapFull(20).msg).toMatch(/AG elevado —/);
  });

  it("classifies just above 20 as muito elevado", () => {
    const r = classifyAnionGapFull(20.01);
    expect(r.msg).toMatch(/muito elevado/);
    expect(r.col).toBe("#f87171");
  });

  it("classifies 12 or below as AG normal", () => {
    const r = classifyAnionGapFull(12);
    expect(r.msg).toMatch(/AG normal/);
    expect(r.col).toBe("#34d399");
  });

  it("uses different thresholds/text than the simple classifier for the same input", () => {
    // agCorr=15 is "elevado" (>12) in BOTH, but full's wording differs from simple's
    expect(classifyAnionGapSimple(15).msg).not.toBe(classifyAnionGapFull(15).msg);
  });

  it("flags a delta ratio above 2 in red instead of purple", () => {
    const r = deltaRatioFull(30, 24); // deltaAG=18, deltaHCO3=0->0.1, ratio=180
    expect(r.ratio).toBeGreaterThan(2);
    expect(r.col).toBe("#f87171");
    expect(r.msg).toMatch(/Alcalose metabólica oculta/);
  });

  it("classifies the full delta ratio's <0.4, <1.0, and <=2.0 bands", () => {
    expect(deltaRatioFull(15, 14).msg).toBe("Acidose hiperclorêmica pura ou coexistente"); // dAG=3, dHCO3=10, ratio=0.3
    expect(deltaRatioFull(12.5, 23).msg).toBe("Acidose mista: AG elevado + hiperclorêmica"); // dAG=0.5, dHCO3=1, ratio=0.5
    expect(deltaRatioFull(20, 20).msg).toBe("Acidose metabólica com AG pura"); // dAG=8, dHCO3=4, ratio=2
  });
});

describe("wintersFormula", () => {
  it("computes expected PaCO2 and flags adequate compensation within ±2 mmHg", () => {
    // hco3=14 -> expected paco2 = 1.5*14+8 = 29
    const r = wintersFormula(14, 30);
    expect(r.paco2Exp).toBe(29);
    expect(r.compOK).toBe(true);
  });

  it("flags a coexisting respiratory disorder when measured PaCO2 deviates >2 mmHg", () => {
    const r = wintersFormula(14, 33);
    expect(r.paco2Exp).toBe(29);
    expect(r.compOK).toBe(false);
  });

  it("treats a deviation of exactly 2 mmHg as still compensated (boundary inclusive)", () => {
    const r = wintersFormula(14, 31);
    expect(r.compOK).toBe(true);
  });
});

describe("classifyLactate", () => {
  it("classifies exactly 4 as elevado (not muito elevado — boundary strictly >4)", () => {
    expect(classifyLactate(4).col).toBe("#fbbf24");
  });
  it("classifies just above 4 as muito elevado", () => {
    expect(classifyLactate(4.01).col).toBe("#f87171");
  });
  it("classifies exactly 2 as normal (boundary strictly >2)", () => {
    expect(classifyLactate(2).col).toBe("#34d399");
  });
});

describe("biochemical ratios (ureia/Cr, TGO/TGP, BD/BT)", () => {
  // Cutoffs are scaled ~2.14x vs. the classic BUN/Cr teaching values (40/20
  // instead of 20/10) because this app uses serum urea, not blood urea
  // nitrogen — see the "Fix (approved)" comment on ureiaCreatininaRatio in
  // calc.js.
  it("ureia/Cr: classifies exactly 40 as indeterminate, just above as pré-renal", () => {
    expect(ureiaCreatininaRatio(40, 1).msg).toMatch(/indeterminada/);
    expect(ureiaCreatininaRatio(40.01, 1).msg).toMatch(/pré-renal/);
  });

  it("ureia/Cr: classifies just below 20 as NTA", () => {
    expect(ureiaCreatininaRatio(19.99, 1).msg).toMatch(/NTA/);
  });

  it("TGO/TGP: classifies exactly 1 as <1 band, just above 1 and exactly 2 as inespecífico (boundary strictly >2)", () => {
    expect(tgoTgpRatio(1, 1).msg).toMatch(/hepatite viral/);
    expect(tgoTgpRatio(1.01, 1).msg).toMatch(/inespecífico/);
    expect(tgoTgpRatio(2, 1).msg).toMatch(/inespecífico/);
    expect(tgoTgpRatio(2.01, 1).msg).toMatch(/hepatite alcoólica/);
  });

  it("BD/BT: classifies exactly 50% as indirect-predominant (boundary strictly >50)", () => {
    expect(bdBtPercent(0.5, 1).pct).toBe(50);
    expect(bdBtPercent(0.5, 1).msg).toMatch(/indireta/);
    expect(bdBtPercent(0.51, 1).msg).toMatch(/colestático/);
  });
});

describe("VM mechanics: driving pressure / compliance / P-F / Tobin / P0.1", () => {
  it("drivingPressure and staticCompliance compute the expected raw numbers", () => {
    expect(drivingPressure(28, 8)).toBe(20);
    expect(staticCompliance(400, 28, 8)).toBe(20);
    expect(tobinIndex(20, 400)).toBe(50);
    expect(pfRatio(90, 0.5)).toBe(180);
  });

  it("classifyDPBeiraleito and classifyDPVentilacao agree on thresholds but differ in wording", () => {
    const a = classifyDPBeiraleito(16);
    const b = classifyDPVentilacao(16);
    expect(a.col).toBe("#f87171");
    expect(b.col).toBe("#f87171");
    expect(a.msg).not.toBe(b.msg);
  });

  it("classifyDPBeiraleito/Ventilacao: borderline band (13-15) and normal band (<=13)", () => {
    expect(classifyDPBeiraleito(14).col).toBe("#fbbf24");
    expect(classifyDPBeiraleito(13).col).toBe("#34d399");
    expect(classifyDPVentilacao(14).col).toBe("#fbbf24");
    expect(classifyDPVentilacao(13).col).toBe("#34d399");
  });

  it("classifyComplianceBeiraleito/Ventilacao: boundary at exactly 30 and 50", () => {
    expect(classifyComplianceBeiraleito(30).col).toBe("#fbbf24");
    expect(classifyComplianceBeiraleito(29.99).col).toBe("#f87171");
    expect(classifyComplianceBeiraleito(50).col).toBe("#34d399");
    expect(classifyComplianceBeiraleito(49.99).col).toBe("#fbbf24");
    expect(classifyComplianceVentilacao(30).col).toBe("#fbbf24");
    expect(classifyComplianceVentilacao(50).col).toBe("#34d399");
  });

  it("classifyVtKgBeiraleito/Ventilacao: boundary at exactly 6 and 8, distinct wording", () => {
    expect(classifyVtKgBeiraleito(6).col).toBe("#34d399");
    expect(classifyVtKgBeiraleito(6.01).col).toBe("#fbbf24");
    expect(classifyVtKgBeiraleito(8).col).toBe("#fbbf24");
    expect(classifyVtKgBeiraleito(8.01).col).toBe("#f87171");
    expect(classifyVtKgVentilacao(6).msg).not.toBe(classifyVtKgBeiraleito(6).msg);
    expect(classifyVtKgVentilacao(7).col).toBe("#fbbf24");
  });

  it("classifyPF: Berlim 2012 boundaries at 100/200/300", () => {
    expect(classifyPF(100).grau).toBe("Grave (≤100)");
    expect(classifyPF(101).grau).toBe("Moderada (101-200)");
    expect(classifyPF(200).grau).toBe("Moderada (101-200)");
    expect(classifyPF(201).grau).toBe("Leve (201-300)");
    expect(classifyPF(300).grau).toBe("Leve (201-300)");
    expect(classifyPF(301).grau).toBe("Normal (>300)");
  });

  it("classifyTobinBeiraleito/Ventilacao: boundary at exactly 105, distinct wording", () => {
    expect(classifyTobinBeiraleito(105).col).toBe("#34d399");
    expect(classifyTobinBeiraleito(105.01).col).toBe("#f87171");
    expect(classifyTobinVentilacao(105).msg).not.toBe(classifyTobinBeiraleito(105).msg);
    expect(classifyTobinVentilacao(105.01).col).toBe("#f87171");
  });

  it("classifyP01Beiraleito/Ventilacao: boundaries at 0.5 and 3.5, distinct wording", () => {
    expect(classifyP01Beiraleito(0.5).col).toBe("#34d399");
    expect(classifyP01Beiraleito(0.49).col).toBe("#fbbf24");
    expect(classifyP01Beiraleito(3.5).col).toBe("#34d399");
    expect(classifyP01Beiraleito(3.51).col).toBe("#f87171");
    expect(classifyP01Ventilacao(3.51).msg).not.toBe(classifyP01Beiraleito(3.51).msg);
    expect(classifyP01Ventilacao(0.49).col).toBe("#fbbf24");
    expect(classifyP01Ventilacao(0.5).col).toBe("#34d399");
  });
});
