import { describe, it, expect, beforeEach } from "vitest";
import { loadIndexHtmlFunctions, loadIndexHtmlConsts } from "./helpers/extractFromHtml.js";

// Regression tests for the runtime-stabilization audit:
// - parseFC()/parseJ() were called from gen()/planejar() but never defined
//   anywhere in index.html (ReferenceError at runtime).
// - rFC() read the `td` filter variable before its `const td=` declaration
//   (TDZ ReferenceError on first render of the Flashcards tab).
// - rHist() rendered `s.ts` while addSS() only ever writes `s.data`.

beforeEach(() => {
  localStorage.clear();
});

describe("parseJ()", () => {
  const { parseJ } = loadIndexHtmlFunctions(["parseJ"]);

  it("parses a clean JSON array response", () => {
    const r = `[{"id":"a"},{"id":"b"}]`;
    expect(parseJ(r)).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("strips ```json code fences around the array", () => {
    const r = "```json\n[{\"id\":\"a\"}]\n```";
    expect(parseJ(r)).toEqual([{ id: "a" }]);
  });

  it("strips leading/trailing prose around the array", () => {
    const r = 'Aqui está o JSON:\n[{"id":"a"}]\nFim.';
    expect(parseJ(r)).toEqual([{ id: "a" }]);
  });

  it("throws a clear error when no array is present", () => {
    expect(() => parseJ("nenhum json aqui")).toThrow();
  });
});

describe("parseFC()", () => {
  const { parseFC } = loadIndexHtmlFunctions(["parseFC", "parseJ"]);

  it("maps PF()'s short JSON keys (f,v,m,a,g,d) to full flashcard fields", () => {
    const r = JSON.stringify([
      { f: "pergunta", v: "resposta", m: "mecanismo", a: "armadilha", g: "guideline", d: "facil" },
    ]);
    expect(parseFC(r)).toEqual([
      {
        frente: "pergunta",
        verso: "resposta",
        mecanismo: "mecanismo",
        armadilha: "armadilha",
        guideline: "guideline",
        dificuldade: "facil",
      },
    ]);
  });

  it("handles fenced JSON and defaults missing keys to empty strings", () => {
    const r = "```json\n[{\"f\":\"q\"}]\n```";
    expect(parseFC(r)).toEqual([
      { frente: "q", verso: "", mecanismo: "", armadilha: "", guideline: "", dificuldade: "" },
    ]);
  });
});

describe("rFC() filters (td declared before first use)", () => {
  const { rFC } = loadIndexHtmlFunctions(["esc", "rFC"]);

  function withState(state, fn) {
    globalThis.S = state;
    try {
      return fn();
    } finally {
      delete globalThis.S;
    }
  }

  it("does not throw and filters 'hoje' cards due today or overdue", () => {
    const today = new Date().toISOString().slice(0, 10);
    const past = "2000-01-01";
    const future = "2999-01-01";
    const state = {
      fc: [
        { frente: "A", _next: past },
        { frente: "B", _next: future },
        { frente: "C", _next: today },
      ],
      fcf: "hoje",
      fci: 0,
      fcfl: false,
      fcm: false,
    };
    let html;
    expect(() => {
      html = withState(state, () => rFC());
    }).not.toThrow();
    expect(html).toContain("1 / 2");
    expect(html).toContain("A");
  });

  it("renders the 'todos' filter without throwing on an empty deck", () => {
    const state = { fc: [], fcf: "todos", fci: 0, fcfl: false, fcm: false };
    expect(() => withState(state, () => rFC())).not.toThrow();
  });
});

describe("rHist() reads addSS()'s persisted field", () => {
  const { addSS, rHist } = loadIndexHtmlFunctions(["esc", "addSS", "rHist"]);

  beforeEach(() => {
    globalThis.svSS = () => {};
  });

  it("shows the timestamp addSS() actually writes (s.data), not undefined", () => {
    const state = { sess: [], tema: "Sepse", nivel: "Avançado", ho: {} };
    globalThis.S = state;
    addSS("flashcards", "conteudo");
    const html = rHist();
    delete globalThis.S;
    delete globalThis.svSS;

    expect(state.sess[0].data).toBeTruthy();
    expect(state.sess[0].ts).toBeUndefined();
    expect(html).not.toContain("undefined");
    expect(html).toContain(state.sess[0].data);
  });

  it("falls back to a legacy s.ts field for records saved before the data/ts fix", () => {
    const state = {
      sess: [{ tipo: "questoes", tema: "IAM", nivel: "Básico", ts: "2024-01-01 10:00", content: "x" }],
      ho: {},
    };
    globalThis.S = state;
    const html = rHist();
    delete globalThis.S;

    expect(html).toContain("2024-01-01 10:00");
    expect(html).not.toContain("undefined");
  });
});

describe("persistence: svFC/svSS write to the expected localStorage keys", () => {
  const { svFC, svSS } = loadIndexHtmlConsts(["svFC", "svSS"]);

  it("svFC() persists S.fc under 'rs_fc'", () => {
    globalThis.S = { fc: [{ frente: "q1" }] };
    svFC();
    delete globalThis.S;
    expect(JSON.parse(localStorage.getItem("rs_fc"))).toEqual([{ frente: "q1" }]);
  });

  it("svSS() persists S.sess under 'rs_ss'", () => {
    globalThis.S = { sess: [{ tipo: "pontos", data: "2026-01-01 00:00" }] };
    svSS();
    delete globalThis.S;
    expect(JSON.parse(localStorage.getItem("rs_ss"))).toEqual([
      { tipo: "pontos", data: "2026-01-01 00:00" },
    ]);
  });
});
