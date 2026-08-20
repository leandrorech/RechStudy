# Auditoria RechStudy — Pré-expansão de Calculadoras e Roadmap Funcional

**Data:** 2026-08-19 → atualizado 2026-08-20
**Versão auditada:** commit `617e94c` (merge PR #10 `fix/rechstudy-safety-cleanup` → `main`)
**Escopo:** read-only + diagnóstico reproduzível
**Testes executados nesta auditoria:** 130 passaram, 0 falhas (`npm test`)
**Cobertura (apenas `calc.js`):** 100% statements/lines/functions · 99,25% branches

---

> **ERRATA — FIND-04 (Cockcroft-Gault):** O texto original desta auditoria invertia o sentido clínico do erro.
> Como `(140-idade)` é decrescente com a idade, assumir `idade=60` **subestima** ClCr em pacientes
> **mais jovens** que 60 e **superestima** ClCr em pacientes **mais idosos** que 60.
> O risco clínico mais relevante está no idoso: ClCr superestimado pode levar a **não reduzir** a
> dose de um fármaco de eliminação renal, com risco de acúmulo e toxicidade.
> Esse bug foi corrigido em PR #10 antes desta errata; o texto abaixo já reflete a versão corrigida.

---

## 1. Executive Summary

O app funciona e `calc.js` está genuinamente bem testado (130 testes, 100% cobertura de statements). Mas **não está pronto para receber 50–200 calculadoras sem mudança estrutural antes**.

### Achados que exigem ação antes da expansão

| ID | Achado | Status |
|----|--------|--------|
| FIND-01 | Dois motores de cálculo VM paralelos com divergência de features | [CONFIRMADO] |
| FIND-02 | Subsistema API legacy Anthropic-only em `index.html` | [CONFIRMADO — CORRIGIDO PR #10] |
| FIND-03 | Zero catálogo/metadado para as 34 calculadoras existentes | [CONFIRMADO] |
| FIND-04 | ClCr fabricado com `idade=60` hardcoded no prompt Antibiótico | [CONFIRMADO — CORRIGIDO PR #10] |
| FIND-05 | `window.calcTab` e `window.vmModo` fora do estado `S` | [CONFIRMADO] |
| FIND-06 | Simulado não captura resposta do usuário — sem revisão de erros | [CONFIRMADO] |
| FIND-07 | Cobertura de `index.html` / `rech-ai-*.js` / `study-navigation.js`: zero | [CONFIRMADO] |
| FIND-08 | `TABS` array inclui simulado/flashcards depois removidos por `study-navigation.js` | [RISCO] |
| FIND-09 | Duas famílias de helpers DOM paralelas (`c*` vs `vm*`) | [CONFIRMADO] |
| FIND-10 | `window.vmBSex` e `window.vmSex` são globals independentes para o mesmo dado | [CONFIRMADO] |

---

## 2. Inventário por Aba

### 2.1 Tabs registradas em `TABS` (`index.html:158`)

```
revisar, base, questoes, simulado, flashcards, pontos,
vm, caso, atb, beialeito, calc, revisao_critica, historico
```

Após `study-navigation.js` carregar: **simulado** e **flashcards** são removidos do
topo como tabs independentes e passam a ser sub-opções internas de **questoes**. Isso significa
que existem 13 ids internos mas apenas 11 botões visíveis.

### 2.2 Classificação por aba

| Aba (id) | Rótulo | Status | Nota |
|----------|--------|--------|------|
| `revisar` | 📚 Revisar | IMPLEMENTADA E FUNCIONAL | Apostila progressiva por blocos + persistência em `rs_rev` |
| `base` | 📄 Base Própria | IMPLEMENTADA E FUNCIONAL | Upload de texto + ancoragem em prompts + persistência |
| `questoes` | ❓ Questões | IMPLEMENTADA E FUNCIONAL | Hub com sub-modos via `study-navigation.js` |
| `simulado` | 🏆 Simulado | IMPLEMENTADA PARCIALMENTE | Funciona; não captura resposta → sem revisão de erros |
| `flashcards` | 🃏 Flashcards | IMPLEMENTADA E FUNCIONAL | SRS básico, exportação Anki |
| `pontos` | 🎯 Pontos-chave | IMPLEMENTADA E FUNCIONAL | Geração por IA por nível |
| `vm` | 🫁 Ventilação | IMPLEMENTADA PARCIALMENTE | 6 sub-modos; calculadoras funcionam; UX por parâmetro, não por tarefa |
| `caso` | 🧠 Caso Clínico | IMPLEMENTADA E FUNCIONAL | Geração + discussão por IA |
| `atb` | 💉 Antibiótico | IMPLEMENTADA PARCIALMENTE | Geração por IA; sem campo de idade (ClCr desabilitado intencionalmente após FIND-04) |
| `beialeito` | 🚑 Beira-leito | IMPLEMENTADA PARCIALMENTE | Só exibe se aba `revisar` gerou conteúdo; estado em `S.blResult` (perdido no reload) |
| `calc` | 🧮 Calculadoras | IMPLEMENTADA E FUNCIONAL | 8 sub-calculadoras; sem catálogo/metadado |
| `revisao_critica` | 🔬 Revisão Crítica | IMPLEMENTADA E FUNCIONAL | Copia prompt para GPT/Gemini; não integra resposta de volta |
| `historico` | 📂 Histórico | IMPLEMENTADA E FUNCIONAL | 20 sessões, export .md/.txt, sem backup global |

---

## 3. Inventário de Calculadoras / Scores

### 3.1 Aba Calculadoras (S.tab = "calc")

Todas as funções determinísticas residem em `calc.js` e são expostas via `RechCalc.*`. Os
wrappers DOM estão em `index.html` e montam HTML inline.

| # | Nome | Função pura (`calc.js`) | Wrapper DOM (`index.html`) | Inputs principais | Cutoffs notáveis | Teste automatizado | Edge cases não testados |
|---|------|-------------------------|---------------------------|-------------------|------------------|--------------------|------------------------|
| 1 | SOFA | `sofaScore` | `calcSOFA / sofaCalc` | 6 parâmetros categorizados | Total 0-24; mortalidade por faixa | ✅ calc.test.js | AG calculado internamente via `agCalcFull()` — divergência possível com `agCalc()` |
| 2 | qSOFA | `qsofaScore` | `calcQSOFA / qsofaCalc` | Glasgow, FR, PAS | ≥2 = alto risco sepse fora UTI | ✅ calc.test.js | Valores extremos (FR=0, PAS=0) |
| 3 | Ânion Gap | `anionGapCore + classifyAnionGapFull + deltaRatioFull` | `calcAnionGap / agCalc` | Na, Cl, HCO3, albumina | AG corr >12 = elevado | ✅ calc2.test.js | Albumina = 0, Na muito baixo |
| 4 | Delta Ratio | `deltaRatioFull` | `calcDelta / deltaCalc` | AG corrigido, HCO3 | Delta <0,4 / 0,4-1 / 1-2 / >2 | ✅ calc2.test.js | AG normal com HCO3 baixo |
| 5 | Beira-leito VM | `calcPBW, drivingPressure, staticCompliance, calcVtPerKgPBW, pfRatio, tobinIndex, classifyDPBeiraleito, classifyComplianceBeiraleito, classifyVtKgBeiraleito, classifyTobinBeiraleito, classifyP01Beiraleito, classifyPF` | `calcBeiraleito / vmBCalc` | Pplat, PEEP, Vt, Altura, Sexo, PaO2, FiO2, FR, P0.1, Vt espontâneo | DP >15 = risco; Compliance <40 = baixa | ✅ domWrappers.test.js | FiO2=0, altura=0, Vt negativo |
| 6 | Renal/Dose | `calcCockcroftGault` | `calcRenal / renalCalc` | Creatinina, idade, peso, sexo | KDIGO 2012 G1-G5 | ✅ calc.test.js | Creatinina muito baixa (<0,1) |
| 7 | CHA₂DS₂-VASc | `chaVascScore` | `calcCardio / chaCalc` | 7 critérios categorizados | Score 0-9 | ✅ calc.test.js | Score máximo = 9 |
| 8 | HAS-BLED | `hasbledScore` | `calcCardio / hasbledCalc` | 8 critérios | ≥3 = alto risco sangramento | ✅ calc.test.js | Todos os critérios = 8 |
| 9 | Wells TEP | `wellsScorePE` | `calcTEP / wellsCalc` | 7 critérios | >4 = alta prob; 2-4 = moderada; <2 = baixa | ✅ calc.test.js | Critério diagnóstico alternativo + todos positivos |
| 10 | sPESI | `spesiScore` | `calcTEP / spesiCalc` | 6 critérios | ≥1 = alto risco | ✅ calc.test.js | Score máximo = 6 |

**Funções em `calc.js` sem wrapper DOM direto (utilitárias ou usadas internamente):**

| Função | Uso atual |
|--------|-----------|
| `wintersFormula` | Usada no cálculo de delta ratio / acidose metabólica (via `agCalcFull`) |
| `classifyLactate` | Usada no SOFA expandido (`agCalcFull`) |
| `ureiaCreatininaRatio` | Usada no painel AG expandido |
| `tgoTgpRatio` | Usada no painel AG expandido |
| `bdBtPercent` | Usada no painel AG expandido |
| `classifyAnionGapSimple` / `deltaRatioSimple` | Versões simplificadas; as Full são usadas no DOM |
| `classifyP01Beiraleito` / `classifyP01Ventilacao` | P0.1 em dois wrappers |

### 3.2 Aba Ventilação — Sub-modo Calculadoras

| Calculadora | Função pura | Wrapper | Diferença em relação ao "Beira-leito VM" da aba Calc |
|-------------|-------------|---------|------------------------------------------------------|
| PBW | `calcPBW` | `vmCalc / vmCalcPBW` | Igual, mas estado do sexo em `window.vmSex` (vs `window.vmBSex`) |
| Driving Pressure | `drivingPressure + classifyDPVentilacao` | `vmCalc` | Usa classificadores `*Ventilacao` com cutoffs diferentes dos `*Beiraleito` |
| Compliance estática | `staticCompliance + classifyComplianceVentilacao` | `vmCalc` | Idem — cutoffs diferentes |
| Vt/kg PBW | `calcVtPerKgPBW + classifyVtKgVentilacao` | `vmCalc` | Idem |
| P0.1 | `classifyP01Ventilacao` | `vmCalc` | Sem P/F ratio neste modo ← **FIND-01** |
| Tobin | `tobinIndex + classifyTobinVentilacao` | `vmCalc` | Idem |

> **[CONFIRMADO] FIND-01:** A calculadora P/F ratio (pfRatio + classifyPF) está presente apenas no
> "Beira-leito VM" da aba **Calculadoras** — não aparece no sub-modo "🧮 Calculadoras" da aba
> **Ventilação**. Esta é divergência de feature entre dois motores que calculam o mesmo paciente.

> **[CONFIRMADO] FIND-09:** Dois sistemas paralelos de helpers DOM:
> - `c*` (cN, cV, cSet, cFmt, cAlrt, cInp, cSel, cRes) — aba Calculadoras
> - `vm*` (g, vmSet, vmFmt, vmAlert, vmInput, vmRes, vmCard) — aba Ventilação
>
> São funcionalmente equivalentes mas incompatíveis. A função `g(id)` (aba Ventilação) duplica
> exatamente `cN(id)` (aba Calculadoras). Qualquer refatoração precisa consolidá-los.

### 3.3 Duplicação de classificadores

Para 5 parâmetros (DP, Compliance, Vt/kg, Tobin, P0.1) existem **dois classificadores** em
`calc.js`: um `*Beiraleito` e um `*Ventilacao`. Os cutoffs diferem deliberadamente — mas:

- A diferença entre classificadores nunca é explicada ao usuário.
- Se os cutoffs científicos forem os mesmos, a duplicação é dívida técnica pura.
- Se forem intencionalmente diferentes (ex.: DP ≤15 como alvo na VM protetora vs DP ≤12 como meta
  mais agressiva em SDRA), essa distinção clínica deve ser documentada e exposta na UI.

**[RISCO]** Sem documentação da intenção, um mantenedor futuro pode unificar os valores erroneamente
ou deixar divergências silenciosas ao editar um dos pares.

---

## 4. Matriz Implementação × Teste × Risco

| Componente | Implementação | Teste unitário | Cobertura E2E | Risco de regressão |
|------------|--------------|----------------|---------------|--------------------|
| `calc.js` — funções puras | ✅ completa | ✅ 130 testes | ❌ sem E2E | Baixo |
| Wrappers DOM calc (c*) | ✅ completa | ✅ domWrappers.test.js | ❌ | Médio |
| Wrappers DOM VM (vm*) | ✅ completa | ❌ sem teste | ❌ | Alto |
| Multi-provider (rech-ai-*.js) | ✅ completa | ✅ scriptLoadOrder | ❌ | Médio |
| Roteamento / state S | ✅ funcional | ❌ sem teste | ❌ | Alto |
| Persistência localStorage | ✅ funcional | ❌ sem teste | ❌ | Alto |
| study-navigation.js | ✅ completa | ✅ studyNavigation | ❌ | Médio |
| Geração por IA (gen/gerarAtb/etc.) | ✅ funcional | Parcial (atbClcrPrompt) | ❌ | Médio |
| Histórico / export | ✅ funcional | ❌ sem teste | ❌ | Médio |
| Revisão Crítica (copyReview) | ✅ funcional | ❌ sem teste | ❌ | Baixo |
| Flashcard SRS | ✅ funcional | ❌ sem teste | ❌ | Médio |
| Simulado captura resposta | ❌ não implementado | n/a | n/a | n/a |

---

## 5. Bugs Confirmados

### BUG-01 — FIND-04: ClCr fabricado na aba Antibiótico [CORRIGIDO — PR #10]

**Localização antes da correção:** `index.html` linhas 970 e 983 (código original).

**Descrição:** O formulário da aba Antibiótico não possui campo de idade. O código original calculava
`Math.round(((140-60)*peso)/(72*cr))` — usando `idade=60` hardcoded — e passava o resultado como
"ClCr estimado" ao prompt da IA. Pacientes mais velhos que 60 teriam ClCr superestimado, levando
a possível subdosagem de ajuste ou **não redução** de fármacos com eliminação renal.

**Correção aplicada (PR #10):** O trecho do prompt agora diz explicitamente:
"Idade do paciente não informada neste formulário — NÃO calcular ClCr por Cockcroft-Gault sem
idade real. Considerar função renal potencialmente reduzida e ajustar doses com margem de segurança."

**Regressão garantida por:** `tests/atbClcrPrompt.test.js` (3 testes).

---

### BUG-02 — FIND-02: Subsistema API single-provider legacy [CORRIGIDO — PR #10]

**Localização antes da correção:** bloco `<script>` em `index.html` (antes dos scripts externos).

**Descrição:** Existia um subsistema Anthropic-only com `function api(){}`, `function promptKey(){}`,
`function deleteKey(){}`, `function updateKeyStatus(){}` declarados como funções hoisted. Os três
scripts externos (`rech-ai-config.js`, `rech-ai-ui.js`, `rech-ai-transport.js`) sobrescreviam esses
nomes — mas usando uma atribuição bare (`api=...`) que depende da declaração prévia existir. Isso
criava risco de reativação silenciosa do provider Anthropic-only caso a ordem dos scripts mudasse.

**Correção aplicada (PR #10):** Os scripts externos agora usam `window.X=` explicitamente, sem
depender de declarações prévias. O subsistema legacy foi removido.

**Regressão garantida por:** `tests/scriptLoadOrder.test.js` (1 teste).

---

### BUG-03 — FIND-01: P/F ratio ausente no sub-modo Calculadoras da aba Ventilação [ABERTO]

**Localização:** `rVMCalc()` vs `calcBeiraleito()` em `index.html`.

**Descrição:** A função `RechCalc.pfRatio` + `RechCalc.classifyPF` está implementada no
"Beira-leito VM" (aba Calculadoras) mas não no sub-modo "🧮 Calculadoras" da aba Ventilação.
Um médico na aba Ventilação avaliando SDRA não verá P/F calculado ali.

**Status:** Não corrigido. Será endereçado em PR B (unificação Ventilação × Beira-leito VM).

---

## 6. Riscos Não Confirmados

| ID | Risco | Label |
|----|-------|-------|
| RISK-01 | Dois classificadores (`*Beiraleito` vs `*Ventilacao`) com cutoffs possivelmente divergentes sem justificativa documentada | [RISCO] |
| RISK-02 | `window.calcTab` e `window.vmModo` são globals soltos — reload sem reload do S pode deixar estado inconsistente | [RISCO] |
| RISK-03 | `TABS` array incluiu simulado/flashcards → `study-navigation.js` remove do DOM — acoplamento frágil: se render() for chamado antes de study-navigation.js carregar, os botões aparecem | [RISCO] |
| RISK-04 | `S.blResult` (Beira-leito) não é persistido — painel gerado é perdido no reload | [RISCO] |
| RISK-05 | Histórico limitado a 20 sessões sem aviso ao usuário sobre a janela de rotação | [RISCO] |
| RISK-06 | `addSS()` salva sessões no histórico mas não valida tamanho do conteúdo — conteúdos muito grandes podem exceder `localStorage` quota sem feedback | [RISCO] |
| RISK-07 | Classificador `classifyP01Beiraleito` usa threshold diferente de `classifyP01Ventilacao` — não verificado se intenção clínica está correta | [RISCO] |

---

## 7. Dívida Arquitetural

### 7.1 Monólito index.html

O arquivo `index.html` tem **1709 linhas** contendo:
- HTML estrutural + CSS embutido (~150 linhas)
- Constantes de estado e prompts (~70 linhas)
- Hidratação de localStorage e funções de persistência (~30 linhas)
- Funções de renderização por aba (rBase, rRev, rCalc, rVM, rAtb, etc.) (~800 linhas)
- Funções de cálculo (wrappers DOM) (~300 linhas)
- Funções de geração por IA (~200 linhas)
- Loop de render + roteamento + exportação (~160 linhas)

Não há separação de responsabilidades. Todas as funções são globais exceto as IIFEs dos scripts
externos. Adicionar 50–200 calculadoras nesta estrutura tornaria o arquivo ilegível e incompatível
com qualquer ferramenta de bundling ou teste automático da UI.

### 7.2 Duplicação de lógica de renderização (VM)

Existem dois conjuntos funcionalmente equivalentes de helpers DOM para calculadoras:

```
cN/cV/cSet/cFmt/cAlrt/cInp/cSel/cRes  →  aba Calculadoras
g/vmSet/vmFmt/vmAlert/vmInput/vmRes/vmCard  →  aba Ventilação
```

A função `g(id)` replica exatamente `cN(id)`. `vmFmt` replica `cFmt`. `vmAlert` replica `cAlrt`.

### 7.3 Estado global misto

O estado principal do app vive em `S` (objeto JavaScript plain). Mas as calculadoras usam:
- `window.calcTab` — sub-aba ativa da aba Calculadoras
- `window.vmModo` — sub-modo ativo da aba Ventilação
- `window.vmBSex` — sexo para cálculo de PBW no "Beira-leito VM"
- `window.vmSex` — sexo para cálculo de PBW no VM-Calculadoras

Nenhum destes está em `S`, portanto não são restaurados por `render()` de forma consistente com o
restante do app.

### 7.4 Zero metadado de calculadoras

Cada calculadora existe apenas como:
1. Uma função `calc*()` retornando HTML como string.
2. Uma função `*Calc()` lendo DOM e chamando `RechCalc.*`.

Não há nenhum objeto de catálogo, metadado, categoria, fonte clínica, tags, versão ou tooltip de
fórmula. Adicionar 50 calculadoras sob este modelo significa 50 funções avulsas sem organização
alguma.

### 7.5 Acoplamento entre IA e estado de aba

`gerarBeiraleito()` muda `S.tab = "beialeito"` diretamente como side-effect do botão da aba
`revisar`. Este tipo de acoplamento cross-tab sem rota explícita dificulta rastreamento de estado.

### 7.6 Render chain frágil

`rech-ai-ui.js` captura a referência `render` e a envolve:
```js
const legacyRender = render;
render = function(){ legacyRender(); controls(); };
```

`study-navigation.js` faz o mesmo. Se um terceiro script repetir o padrão ou se a ordem de
carregamento mudar, a chain de render se rompe silenciosamente. Não há proteção (`render` é
reatribuível a qualquer momento).

---

## 8. Gaps para Expansão das Calculadoras

1. **Sem catálogo estruturado:** não há objeto `{ id, nome, categoria, formula, fonte, inputs, outputs }` — cada calculadora é código procedural solto.
2. **Sem paginação ou busca:** com 8 sub-abas é gerenciável; com 50+ é inutilizável.
3. **Sem agrupamento por especialidade/contexto:** SOFA e qSOFA aparecem lado a lado com calculadoras de TEP, sem hierarquia.
4. **Sem rota `calculadora não encontrada`:** nenhum mecanismo atual permite ao usuário pesquisar uma calculadora ausente.
5. **Sem separação entre calculadora determinística e conteúdo gerado:** a aba Calculadoras atual é 100% determinística, mas não existe uma barreira arquitetural que impeça adicionar futuramente uma "calculadora" gerada por IA sem sinalização visual.
6. **Wrappers DOM não testados:** apenas `domWrappers.test.js` testa alguns deles — `vmBCalc` e os wrappers da aba VM não têm testes.
7. **Tamanho de `index.html` como gargalo:** cada nova calculadora acrescenta ~30–60 linhas; com 200 calculadoras isso seria +10 000 linhas no mesmo arquivo.

---

## 9. Proposta de Arquitetura do Catálogo de Calculadoras

### 9.1 Princípio

Separar completamente:
1. **Dados (metadado):** arquivo JSON ou objeto JS estruturado — descrição, fórmula, fonte, categoria.
2. **Lógica pura (cálculo):** função em `calc.js` ou arquivo equivalente, sem acesso ao DOM.
3. **Renderizador genérico (UI):** componente que recebe a definição da calculadora e monta o HTML.

### 9.2 Estrutura de metadado proposta (por calculadora)

```js
{
  id: "cockcroft-gault",
  nome: "Cockcroft-Gault — ClCr",
  categoria: "renal",
  tags: ["função renal", "dose", "ajuste", "antibiótico"],
  fonte: "Cockcroft & Gault, Nephron 1976",
  funcao: "calcCockcroftGault",        // referência à função em RechCalc
  inputs: [
    { id: "cr", label: "Creatinina", unit: "mg/dL", type: "number", min: 0.1, step: 0.1 },
    { id: "idade", label: "Idade", unit: "anos", type: "number", min: 1, max: 120 },
    { id: "peso", label: "Peso", unit: "kg", type: "number", min: 1 },
    { id: "sex", label: "Sexo", type: "select", options: [["M","Masculino"],["F","Feminino"]] }
  ],
  outputs: [
    { id: "clcr", label: "ClCr", unit: "mL/min" },
    { id: "estadio", label: "Estágio KDIGO" }
  ]
}
```

### 9.3 Renderizador genérico (pseudo-código)

```js
function renderCalculadora(def) {
  const inputs = def.inputs.map(renderInput).join("");
  const result = `<div id="cr_${def.id}"></div>`;
  return `<div class="calc-card" data-calc="${def.id}">${inputs}${result}</div>`;
}

function calcularGenerico(def) {
  const values = Object.fromEntries(def.inputs.map(i => [i.id, getInputValue(i)]));
  const result = RechCalc[def.funcao](values);
  renderOutput(def, result);
}
```

### 9.4 Organização por categoria

```
Sepse / Infecção: SOFA, qSOFA
Respiratório / VM: DP, Compliance, Vt/kg, PBW, P/F, Tobin, P0.1
Nefrologia: Cockcroft-Gault, KDIGO, FENa, FEUreia
Cardio: CHA₂DS₂-VASc, HAS-BLED, HEART, TIMI, GRACE
TEP / Coagulação: Wells, sPESI, Geneva
Neurologia: Glasgow, NIHSS, Hunt-Hess
Gastro / Hepático: Child-Pugh, MELD, Ranson
Equilíbrio ácido-base: Ânion Gap, Delta Ratio, Osmolalidade, Stewart
Nutrição: IMC, Harris-Benedict, NRS-2002
...
```

---

## 10. Proposta de Fluxo "Não Encontrado → Pesquisar"

### 10.1 Princípio fundamental

> Nunca criar silenciosamente uma calculadora executável a partir de texto de IA.

### 10.2 Fluxo proposto

```
Usuário digita nome/busca
        ↓
Busca no catálogo local (fulltext em id/nome/tags)
        ↓
┌──────────────────┬──────────────────────┐
│  ENCONTRADO      │  NÃO ENCONTRADO      │
│  → exibir calc   │  → exibir mensagem:  │
│    determinística│  "Esta calculadora   │
│                  │   não está no catál- │
│                  │   ogo. O que deseja?"│
│                  │                      │
│                  │  [🔬 Pesquisar]      │
│                  │  [❌ Cancelar]       │
└──────────────────┴──────────────────────┘
                          ↓ clica Pesquisar
              Consulta IA selecionada explicitamente
              com prompt: "Descreva a fórmula/score
              [nome], fonte e referência. Resposta
              educacional apenas — não execute cálculo."
                          ↓
              Exibe resultado com label visível:
              ⚠️ CONTEÚDO GERADO — não é calculadora
              validada. Fonte: [AI provider] / [data]
                          ↓
              Botão: [📥 Propor para o catálogo]
              → abre formulário com fórmula/fonte/
                referência para revisão humana
              → NÃO cria calculadora executável
                automaticamente
```

### 10.3 Invariantes de segurança

- O botão "Pesquisar" deve ser explícito — nunca automático.
- O resultado da pesquisa NUNCA é renderizado como calculadora interativa.
- "Propor para o catálogo" cria apenas uma entrada pendente de validação, não uma calculadora ativa.
- A fórmula validada e os testes automatizados são pré-requisito para que uma proposta seja promovida a calculadora ativa.

---

## 11. Sequência Recomendada de Implementação

| # | Tarefa | Branch proposto | Pré-requisito |
|---|--------|-----------------|---------------|
| 1 | ~~Corrigir BUG-01 (ClCr fabricado) + remover API legacy~~ | ~~PR A~~ | **CONCLUÍDO — PR #10** |
| 2 | ~~Consolidar Questões/Simulado/Flashcards~~ | ~~feat/rechstudy-question-hub~~ | **CONCLUÍDO — PR #9** |
| 3 | Unificar Ventilação × Beira-leito VM (FIND-01, FIND-09, FIND-10) | PR B | — |
| 4 | Extrair catálogo estruturado para as 34 calculadoras existentes | PR C | PR B |
| 5 | Adicionar testes para wrappers VM e persistência | PR C ou D | PR B |
| 6 | Reorganizar navegação em macroáreas | PR D | PR C |
| 7 | Construir busca no catálogo + fluxo "não encontrado → pesquisar" | PR E | PR C |
| 8 | **Importar lista grande de calculadoras no formato de catálogo** | PR F+ | PR E |

---

## 12. Release Gates Antes de Adicionar a Lista Grande

Os gates abaixo devem passar antes de qualquer importação de calculadoras em volume:

| Gate | Critério | Status atual |
|------|----------|-------------|
| G1 | Nenhum bug de dado clínico aberto (ClCr fabricado etc.) | ✅ PR #10 |
| G2 | Nenhum sistema legacy sem cobertura de regressão | ✅ PR #10 |
| G3 | Calculadora VM unificada (FIND-01 corrigido) | ❌ |
| G4 | Catálogo de calculadoras com metadado estruturado | ❌ |
| G5 | Renderizador genérico substituindo funções `calc*()` avulsas | ❌ |
| G6 | Busca/filtragem por nome e categoria no catálogo | ❌ |
| G7 | Testes para os wrappers VM | ❌ |
| G8 | `window.calcTab` e `window.vmModo` integrados ao estado `S` | ❌ |
| G9 | Fluxo "não encontrado → pesquisar" com separação explícita | ❌ |
| G10 | index.html abaixo de 800 linhas (lógica migrada para módulos) | ❌ |

**Recomendação:** G1-G5 são pré-requisitos mínimos. G6-G10 são desejáveis antes de escalar.

---

## Seção D — Runtime / Persistência

### D.1 Chaves localStorage

| Chave | Conteúdo | Persiste reload | Observação |
|-------|----------|-----------------|------------|
| `rs_rev` | Estado da revisão (tema, nivel, blocos, conteudos) | ✅ | Hidratado no boot via IIFE |
| `rs_fc` | Array de flashcards | ✅ | Hidratado no boot |
| `rs_ss` | Array de sessões do histórico (até 20) | ✅ | Hidratado no boot |
| `rs_base` | Base Própria (titulo, texto, ativa, strict) | ✅ | Hidratado no boot |
| `rs_ai_provider` | Provider selecionado | ✅ | Lido por `rech-ai-ui.js` |
| `rs_ai_key_{p}` | API key persistente por provider | ✅ | Não exposta a outros providers |
| `rs_ai_model_{p}` | Modelo selecionado por provider | ✅ | Por provider |
| `rs_ai_custom_base` | Base URL do provider custom | ✅ | |
| `rs_ai_custom_model` | Modelo do provider custom | ✅ | |

### D.2 Chaves sessionStorage

| Chave | Conteúdo | Persiste reload | Observação |
|-------|----------|-----------------|------------|
| `rs_ai_key_session_{p}` | API key de sessão por provider | ❌ | Opção "não persistir" no promptKey |

### D.3 Estado volátil (perdido no reload)

| Estado | Variável | Observação |
|--------|----------|------------|
| Resultado da aba Beira-leito | `S.blResult` | **[RISCO]** Não salvo; painel gerado é perdido |
| Sub-aba ativa de Calculadoras | `window.calcTab` | Não em `S`; reset para "sofa" a cada reload |
| Sub-modo ativo de Ventilação | `window.vmModo` | Não em `S`; reset para "🧮 Calculadoras" |
| Sexo para PBW (Beira-leito VM) | `window.vmBSex` | Não em `S` |
| Sexo para PBW (VM tab) | `window.vmSex` | Não em `S` |
| Resultado da geração de caso | `S.casoResult` | Perdido no reload |
| Resultado da geração ATB | `S.atbResult` | Perdido no reload |

### D.4 Export/Import

| Funcionalidade | Implementação | Completude |
|----------------|---------------|------------|
| Export flashcard → Anki | `exportAnki()` → arquivo `.txt` | ✅ |
| Export conteúdo histórico | `.md` e `.txt` por item | ✅ |
| Clipboard do conteúdo principal | `navigator.clipboard.writeText` | ✅ |
| Import/restore completo do app | ❌ Não existe | **[RISCO]** Sem backup global |
| Limpar histórico | Botão com `confirm()` | ✅ |
| Limpar flashcards | Via `S.fc=[]` + re-render | Implícito |

### D.5 Recuperação após reload

O boot executa uma IIFE que hidrata `S` com `JSON.parse(localStorage.getItem(...))` para os 4
domínios persistidos (revisão, flashcards, histórico, base). Se o JSON estiver corrompido, o bloco
`try{}catch{}` ignora silenciosamente sem mensagem ao usuário — **[RISCO]** de estado silenciosamente
vazio após corrupção.

---

## Seção E — Multi-provider

### E.1 Conformidade por provider

| Provider | Seleção explícita | Chave isolada | Modelo selecionável | Endpoint correto | Sem fallback silencioso | Erro visível | Chave isolada de outros |
|----------|-------------------|---------------|---------------------|------------------|------------------------|--------------|------------------------|
| Anthropic (Claude) | ✅ | ✅ `rs_ai_key_anthropic` | ✅ 3 modelos | ✅ `api.anthropic.com/v1/messages` | ✅ throw se sem key | ✅ | ✅ |
| OpenAI | ✅ | ✅ `rs_ai_key_openai` | ✅ 3 modelos | ✅ `api.openai.com/v1/chat/completions` | ✅ | ✅ | ✅ |
| Gemini | ✅ | ✅ `rs_ai_key_gemini` | ✅ 2 modelos | ✅ `generativelanguage.googleapis.com` | ✅ | ✅ | ✅ |
| DeepSeek | ✅ | ✅ `rs_ai_key_deepseek` | ✅ 2 modelos | ✅ `api.deepseek.com` | ✅ | ✅ | ✅ |
| Qwen | ✅ | ✅ `rs_ai_key_qwen` | ✅ 2 modelos | ✅ `dashscope-intl.aliyuncs.com` | ✅ | ✅ | ✅ |
| Kimi | ✅ | ✅ `rs_ai_key_kimi` | ✅ 1 modelo | ✅ `api.moonshot.ai` | ✅ | ✅ | ✅ |
| Custom | ✅ | ✅ `rs_ai_key_custom` | ✅ input livre | ✅ configurável | ✅ | ✅ | ✅ |

### E.2 Riscos remanescentes

- **[RISCO]** A render chain (`render = function(){ legacyRender(); controls(); }`) em `rech-ai-ui.js`
  e `study-navigation.js` usa wrapping sequencial sem proteção. Se um terceiro script fizer o mesmo
  padrão fora de ordem, a cadeia se rompe silenciosamente.
- **[NÃO REPRODUZIDO]** Vazamento de chave de um provider para outro — a leitura via `rechAiKey(p)`
  é isolada por provider; não foi identificado caminho de vazamento.
- **[INTENCIONAL]** O catálogo de providers é definido em `rech-ai-config.js` como `window.RECH_AI_CATALOG`
  e referenciado por `rech-ai-ui.js` e `rech-ai-transport.js` — o acoplamento é explícito e documentado.

---

## Anexo A — UX/Usabilidade Clínica da Ventilação (Adendo 1)

### A.1 Diagnóstico da queixa

O proprietário relata que "mal sabe mexer no jeito que está". A causa raiz não é apenas volume de
campos — é estrutural:

1. **Duplicação real de funcionalidade:** A aba "Calculadoras" (calc tab) tem um sub-modo
   "Beira-leito VM" que calcula DP, Compliance, Vt/kg, P/F, Tobin e P0.1. A aba "Ventilação" tem
   um sub-modo "🧮 Calculadoras" que calcula os mesmos parâmetros — exceto P/F. O usuário que vai
   para "Ventilação" esperando calcular P/F não o encontra ali.

2. **Organização por parâmetro, não por tarefa:** Os sub-modos são
   `Calculadoras | Config Inicial | Hemodinâmica | Assincronia | Desmame | Revisão TEMI`.
   Um médico que chega com a pergunta "meu paciente está em SDRA moderada, como ajusto a VM?"
   precisa visitar múltiplos sub-modos sem um ponto de entrada único orientado à tarefa.

3. **"Beira-leito"** nomeia duas coisas no app: a aba `S.tab="beialeito"` (painel de IA por tema)
   e o sub-modo "Beira-leito VM" dentro da aba Calculadoras. Isso gera confusão semântica.

### A.2 Proposta: navegação por objetivo (wireframe textual)

```
VENTILAÇÃO
┌─────────────────────────────────────────────────────────────────┐
│ 🫁 Ventilação Mecânica — O que você quer fazer?                 │
│                                                                  │
│ [Iniciar / Ajustar VM]  [Mecânica Pulmonar]  [Hipoxemia]        │
│ [Hipercapnia]           [Assincronia]        [Desmame / TRE]    │
│ [SDRA]                  [DPOC / Asma / VNI]  [Cálculos rápidos] │
│ [Estudar / Pesquisar tema]                                       │
└─────────────────────────────────────────────────────────────────┘
        ↓ clica "Mecânica Pulmonar"
┌─────────────────────────────────────────────────────────────────┐
│ ← Mecânica Pulmonar                                              │
│                                                                  │
│ Pplat: [   ] cmH₂O    PEEP: [   ] cmH₂O                        │
│ Vt: [   ] mL          Altura: [   ] cm  [♂][♀]                  │
│ PaO₂: [   ] mmHg      FiO₂: [   ] (0-1)                        │
│ FR: [   ] ipm         Vt espontâneo: [   ] mL    P0.1: [   ]    │
│                                                                  │
│ ──────────────────────────────                                   │
│ PBW: 72,3 kg                                                     │
│ Vt/kg PBW: 5,8 mL/kg ✅                                         │
│ Driving Pressure: 14 cmH₂O ✅                                    │
│ Compliance estática: 45 mL/cmH₂O ✅                             │
│ P/F: 210 — SDRA Leve (Berlim)                                    │
│ Tobin (f/Vt): 58 ipm/L ✅                                        │
│ P0.1: 2,4 cmH₂O ✅                                              │
└─────────────────────────────────────────────────────────────────┘
```

Este wireframe concentra todos os cálculos relevantes numa única tela orientada à tarefa,
reutilizando as mesmas funções determinísticas de `calc.js`.

### A.3 Recomendação de implementação

Implementar a navegação por objetivo **depois** de unificar os dois motores de cálculo (PR B).
Senão a nova navegação mascararia duas implementações divergentes por baixo.

---

## Anexo B — Antibiótico → RechDrugs (Adendo 2)

### B.1 O que existe hoje na aba Antibiótico

O conteúdo da aba Antibiótico é **~100% gerado por IA em tempo real**. Não há base de dados local
de antimicrobianos. O que existe:

| Item | Código | Migração |
|------|--------|----------|
| Geração de esquema empírico | `gerarAtb()` + prompt estruturado | Permanece no Study (educacional) |
| Ajuste renal por droga | Pequena tabela estática HTML (6 drogas: piperacilina, meropenem, vancomicina, ciprofloxacino, amicacina, fluconazol) | Candidata a RechDrugs |
| Estimativa de ClCr | Desabilitada após FIND-04; sem campo de idade | A migrar para RechDrugs |
| Prompt com foco/origem/MDR | Estrutura de prompt em `gerarAtb()` | Permanece como lógica educacional |

### B.2 Fronteira proposta

- **RechStudy:** mantém a geração educacional de raciocínio antibiótico (foco, origem, risco MDR,
  cobertura, descalonamento, duração, culturas). Consome informação de dose/ajuste do RechDrugs
  via referência futura.
- **RechDrugs:** doses, espectro, ajuste renal/hepático, PK/PD, interações, TDM, stewardship.
- **Ação imediata:** não remover a aba na próxima iteração — inventariar, sinalizar como candidata
  a migração e garantir que nenhum conteúdo útil seja perdido.

---

## Anexo C — Consolidação Questões/Simulado/Flashcards (Adendo 3)

### C.1 Estado atual pós-PR #9

A consolidação foi entregue via PR #9 (`feat/rechstudy-question-hub`, `study-navigation.js`).
Os três modos agora aparecem como sub-opções dentro do hub "Questões". Tecnicamente correto.

### C.2 O que ainda falta (feature gap, não regressão)

- **Simulado não captura resposta do usuário:** a resposta do usuário não é salva; não existe
  "ver erros do simulado" porque não há o dado.
- **Sem "Revisar Erradas":** funcionalidade esperada pelo produto, mas que requer a captura de
  resposta (acima) como pré-requisito.
- **Flashcards e Questões têm histórico independente:** não há visão consolidada de desempenho
  cruzado entre os três modos.

### C.3 Sequência para completar a consolidação

1. Adicionar campo de captura de resposta ao Simulado (salvo em estado, não precisa de backend).
2. Após acumular dados: construir tela "Desempenho" com erros/acertos por tema.
3. "Revisar Erradas" como quarto sub-modo do hub Questões.

---

## Referências Técnicas

- Código auditado: `index.html`, `calc.js`, `rech-ai-config.js`, `rech-ai-ui.js`,
  `rech-ai-transport.js`, `study-navigation.js`, `json-utils.js`
- Testes: `tests/calc.test.js`, `tests/calc2.test.js`, `tests/domWrappers.test.js`,
  `tests/scriptLoadOrder.test.js`, `tests/studyNavigation.test.js`,
  `tests/atbClcrPrompt.test.js`, `tests/jsonUtils.test.js`
- Cobertura: `npm run test:coverage` (v8, vitest 4.1.10)
- PR #10: `fix/rechstudy-safety-cleanup` — corrigiu FIND-02 e FIND-04
- PR #9: `feat/rechstudy-question-hub` — consolidou Questões/Simulado/Flashcards
