import { describe, it, expect } from "vitest";
import "../calc.js";

const { calcPBW, calcVtPerKgPBW, wellsScorePE, calcCockcroftGault } = window.RechCalc;

describe("calcPBW (predicted body weight, ARDSNet formula)", () => {
  it("computes PBW for a male reference case (170cm)", () => {
    // 50 + 0.91*(170-152.4) = 66.016
    expect(calcPBW("M", 170)).toBeCloseTo(66.016, 3);
  });

  it("computes PBW for a female reference case (160cm)", () => {
    // 45.5 + 0.91*(160-152.4) = 52.416
    expect(calcPBW("F", 160)).toBeCloseTo(52.416, 3);
  });

  it("uses the male formula's exact offset height (152.4cm) as its zero-adjustment point", () => {
    expect(calcPBW("M", 152.4)).toBeCloseTo(50, 6);
    expect(calcPBW("F", 152.4)).toBeCloseTo(45.5, 6);
  });

  it("clamps to 0 instead of returning a negative PBW for very short heights", () => {
    // 50 + 0.91*(50-152.4) = -43.184 -> clamped to 0
    expect(calcPBW("M", 50)).toBe(0);
  });

  it("returns NaN for a NaN height", () => {
    expect(calcPBW("M", NaN)).toBeNaN();
  });

  it("returns NaN for a non-numeric height (invalid input)", () => {
    expect(calcPBW("M", "abc")).toBeNaN();
    expect(calcPBW("M", undefined)).toBeNaN();
    expect(calcPBW("M", null)).toBeNaN();
  });

  it("treats any non-'M' sex value the same as female (matches original ternary)", () => {
    expect(calcPBW("F", 160)).toBeCloseTo(calcPBW("X", 160), 6);
  });
});

describe("calcVtPerKgPBW (tidal volume per kg predicted body weight)", () => {
  it("computes a reference case (Vt 420mL, PBW 70kg)", () => {
    expect(calcVtPerKgPBW(420, 70)).toBeCloseTo(6, 6);
  });

  it("returns exactly 6 mL/kg at the protective-ventilation boundary", () => {
    expect(calcVtPerKgPBW(360, 60)).toBe(6);
  });

  it("returns exactly 8 mL/kg at the upper boundary", () => {
    expect(calcVtPerKgPBW(480, 60)).toBe(8);
  });

  it("distinguishes values immediately below/above the 6 mL/kg boundary", () => {
    expect(calcVtPerKgPBW(359, 60)).toBeLessThan(6);
    expect(calcVtPerKgPBW(361, 60)).toBeGreaterThan(6);
  });

  it("distinguishes values immediately below/above the 8 mL/kg boundary", () => {
    expect(calcVtPerKgPBW(479, 60)).toBeLessThan(8);
    expect(calcVtPerKgPBW(481, 60)).toBeGreaterThan(8);
  });

  it("returns NaN when PBW is zero or negative (division guard)", () => {
    expect(calcVtPerKgPBW(400, 0)).toBeNaN();
    expect(calcVtPerKgPBW(400, -5)).toBeNaN();
  });

  it("returns NaN when either input is NaN or missing", () => {
    expect(calcVtPerKgPBW(NaN, 70)).toBeNaN();
    expect(calcVtPerKgPBW(400, NaN)).toBeNaN();
  });
});

describe("wellsScorePE (Wells score for PE — 3-tier variant used in RechStudy)", () => {
  const zero = { tvp: 0, altDx: 0, fc: 0, imo: 0, tepTvp: 0, hem: 0, neo: 0 };

  it("classifies score 0 as baixa probabilidade", () => {
    const r = wellsScorePE(zero);
    expect(r.score).toBe(0);
    expect(r.category).toBe("baixa");
    expect(r.msg).toMatch(/BAIXA/);
    expect(r.col).toBe("#34d399");
  });

  it("classifies a full reference case (TVP + alt dx + tachycardia) as alta", () => {
    // 3 + 3 + 1.5 = 7.5 -> alta (>6)
    const r = wellsScorePE({ ...zero, tvp: 3, altDx: 3, fc: 1.5 });
    expect(r.score).toBe(7.5);
    expect(r.category).toBe("alta");
    expect(r.col).toBe("#f87171");
  });

  it("treats score exactly 2 as the low boundary of intermediária (inclusive)", () => {
    const r = wellsScorePE({ ...zero, hem: 1, neo: 1 });
    expect(r.score).toBe(2);
    expect(r.category).toBe("intermediaria");
  });

  it("treats score immediately below 2 as baixa", () => {
    const r = wellsScorePE({ ...zero, neo: 1 });
    expect(r.score).toBe(1);
    expect(r.category).toBe("baixa");
  });

  it("treats score exactly 6 as still intermediária (not alta — boundary is strictly >6)", () => {
    const r = wellsScorePE({ ...zero, tvp: 3, altDx: 3 });
    expect(r.score).toBe(6);
    expect(r.category).toBe("intermediaria");
  });

  it("treats score immediately above 6 as alta", () => {
    const r = wellsScorePE({ ...zero, tvp: 3, altDx: 3, neo: 1 });
    expect(r.score).toBe(7);
    expect(r.category).toBe("alta");
  });

  it("sums fractional (1.5-weighted) criteria correctly", () => {
    const r = wellsScorePE({ ...zero, fc: 1.5, imo: 1.5, tepTvp: 1.5 });
    expect(r.score).toBeCloseTo(4.5, 6);
    expect(r.category).toBe("intermediaria");
  });

  it("reports 'indeterminado' instead of silently defaulting to 'baixa' when an input is NaN (fixed)", () => {
    const r = wellsScorePE({ ...zero, tvp: NaN });
    expect(r.score).toBeNaN();
    expect(r.category).toBe("indeterminado");
    expect(r.msg).toBe("Dados insuficientes para calcular o score.");
    expect(r.col).toBe("#4a7a4a");
  });
});

describe("calcCockcroftGault (creatinine clearance + KDIGO staging)", () => {
  it("computes a reference case (male, 65y, 70kg, Cr 1.2)", () => {
    // ((140-65)*70)/(72*1.2) = 5250/86.4 = 60.7638888...
    const r = calcCockcroftGault({ cr: 1.2, idade: 65, peso: 70, sex: "M" });
    expect(r.clcr).toBeCloseTo(60.763888, 5);
    expect(r.estadio).toBe("G2 — Leve");
  });

  it("applies the 0.85 female-sex multiplier", () => {
    const male = calcCockcroftGault({ cr: 1, idade: 40, peso: 72, sex: "M" });
    const female = calcCockcroftGault({ cr: 1, idade: 40, peso: 72, sex: "F" });
    expect(male.clcr).toBeCloseTo(100, 6);
    expect(female.clcr).toBeCloseTo(85, 6);
    expect(female.estadio).toBe("G2 — Leve");
  });

  it("classifies exactly 90 mL/min as G1 (boundary inclusive)", () => {
    const r = calcCockcroftGault({ cr: 1, idade: 40, peso: 64.8, sex: "M" });
    expect(r.clcr).toBeCloseTo(90, 6);
    expect(r.estadio).toBe("G1 — Normal ou ↑");
    expect(r.col).toBe("#34d399");
  });

  it("classifies just below 90 mL/min as G2", () => {
    const r = calcCockcroftGault({ cr: 1, idade: 40, peso: 64.79, sex: "M" });
    expect(r.clcr).toBeLessThan(90);
    expect(r.estadio).toBe("G2 — Leve");
  });

  it("classifies exactly 60 mL/min as G2 (boundary inclusive)", () => {
    const r = calcCockcroftGault({ cr: 1, idade: 40, peso: 43.2, sex: "M" });
    expect(r.clcr).toBeCloseTo(60, 6);
    expect(r.estadio).toBe("G2 — Leve");
  });

  it("classifies just below 60 mL/min as G3", () => {
    const r = calcCockcroftGault({ cr: 1, idade: 40, peso: 43.19, sex: "M" });
    expect(r.clcr).toBeLessThan(60);
    expect(r.estadio).toBe("G3 — Moderado");
    expect(r.col).toBe("#fbbf24");
  });

  it("classifies exactly 30 mL/min as G3 (boundary inclusive)", () => {
    const r = calcCockcroftGault({ cr: 1, idade: 40, peso: 21.6, sex: "M" });
    expect(r.clcr).toBeCloseTo(30, 6);
    expect(r.estadio).toBe("G3 — Moderado");
  });

  it("classifies just below 30 mL/min as G4", () => {
    const r = calcCockcroftGault({ cr: 1, idade: 40, peso: 21.59, sex: "M" });
    expect(r.clcr).toBeLessThan(30);
    expect(r.estadio).toBe("G4 — Grave");
    expect(r.col).toBe("#f87171");
  });

  it("classifies exactly 15 mL/min as G4 (boundary inclusive)", () => {
    const r = calcCockcroftGault({ cr: 1, idade: 40, peso: 10.8, sex: "M" });
    expect(r.clcr).toBeCloseTo(15, 6);
    expect(r.estadio).toBe("G4 — Grave");
  });

  it("classifies just below 15 mL/min as G5", () => {
    const r = calcCockcroftGault({ cr: 1, idade: 40, peso: 10.79, sex: "M" });
    expect(r.clcr).toBeLessThan(15);
    expect(r.estadio).toBe("G5 — Falência/Diálise");
    expect(r.col).toBe("#f87171");
  });

  it("reports 'Indeterminado' instead of silently defaulting to G5 when clcr is NaN (fixed; renalCalc's own isNaN gate already prevents this from being reached via the UI, so this is a safety net for any other/future caller)", () => {
    const r = calcCockcroftGault({ cr: NaN, idade: 40, peso: 70, sex: "M" });
    expect(r.clcr).toBeNaN();
    expect(r.estadio).toBe("Indeterminado");
    expect(r.col).toBe("#4a7a4a");
  });
});
