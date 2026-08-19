# AUDIT — RechStudy pré-expansão de calculadoras e roadmap funcional

Referente a: [`leandrorech/RechStudy#8`](https://github.com/leandrorech/RechStudy/issues/8) e seus 3 comentários de adendo (UX/Ventilação, migração Antibiótico→RechDrugs, consolidação Questões/Simulado/Flashcards).

**Natureza**: auditoria read-only. Nenhum código foi alterado durante a produção deste relatório. Metodologia: `rech-deep-audit` (perfil CODE, 8 camadas), evidência classificada em escala E0–E5, cada finding com `STATUS` (`CONFIRMED`/`PLAUSIBLE`/`FALSE_POSITIVE`/`INCONCLUSIVE`) desacoplado de força de evidência, mais os rótulos exigidos pela Issue #8 (`[CONFIRMADO]`/`[RISCO]`/`[INTENCIONAL]`/`[NÃO REPRODUZIDO]`).

**Estado verificado em**: commit `d997d6c` (HEAD de `main` no momento da auditoria), branch de trabalho `claude/rechstudy-architecture-roadmap-kaqkf7` (idêntica a `main` até este commit).

---

## 1. Executive summary

O RechStudy funciona e a suíte de `calc.js` está genuinamente bem testada (123 testes, 100% de cobertura de statements/lines/functions). Mas a auditoria confirma, com evidência direta de código (E4), que o app **não está pronto para receber 50–200 calculadoras novas sem mudança estrutural antes**:

- Não existe hoje **nenhum catálogo/metadado de calculadora** — cada calculadora é uma função solta chamada por um wrapper de UI reimplementado à mão por aba. Duas famílias de helpers de DOM (`c*` em Calculadoras/Beira-leito, `vm*` em Ventilação) fazem o mesmo trabalho de forma paralela.
- A duplicação entre "Ventilação" e "Beira-leito" é real e já **divergiu funcionalmente**: um wrapper calcula P/F ratio, o outro não [FIND-03, CONFIRMED].
- Existe um **subsistema inteiro de API single-provider (Anthropic-only) ainda vivo no arquivo**, coexistindo com o multi-provider novo, neutralizado apenas por sobrescrita de escopo global no fim do carregamento de scripts — não removido [FIND-02, CONFIRMED, achado não previsto no escopo original].
- A aba Antibiótico embute no prompt de IA uma estimativa de ClCr com **idade do paciente fixa em 60 anos**, hardcoded, porque o formulário nunca colocou um campo de idade [FIND-04, CONFIRMED] — é um dado clinicamente incorreto sendo apresentado como cálculo, na própria seção que o app promete "nunca omitir ajuste renal".
- Cobertura de teste (100%) existe **apenas para `calc.js`**; toda a lógica de estado, roteamento, geração por IA e persistência em `index.html` (1780 linhas) não tem nenhuma medição de cobertura configurada [FIND-08, CONFIRMED].
- Confirmo, com código real, as 3 premissas dos adendos: a fusão Questões/Simulado é tecnicamente barata (compartilham quase todo o estado e a mesma função de geração); Ventilação×Beira-leito é confusa por duplicação estrutural real, não só percepção; e o conteúdo de Antibiótico hoje é ~100% gerado por IA (não há uma grande base de dados hardcoded para migrar — a migração é mais sobre "onde a lógica/prompt mora" do que sobre "mover uma tabela grande").

**Minha recomendação de sequência** (seção 11) é: primeiro resolver os achados de F (arquitetura/dívida técnica) e a duplicação Ventilação×Beira-leito, só depois abrir espaço para a lista grande de calculadoras — importar 100+ calculadoras em cima da estrutura atual replicaria o padrão de duplicação em escala 10–20×.

---

## 2. Inventário por aba

| Aba (`TABS`, `index.html:158`) | Classificação | Evidência |
|---|---|---|
| `revisar` — Revisão/Apostila Progressiva | IMPLEMENTADA E FUNCIONAL | [CONFIRMADO] E3 — gera conteúdo por nível, persiste em `rs_rev` |
| `base` — Base Própria | IMPLEMENTADA E FUNCIONAL | [CONFIRMADO] E3 — cola texto, persiste em `rs_base`, injeta contexto via `baseContext()` em todo prompt (`rech-ai-transport.js:12`) |
| `questoes` — Questões | IMPLEMENTADA E FUNCIONAL | [CONFIRMADO] E4 — `rQ()`/`gen()`, sem persistência própria (só via histórico) |
| `simulado` — Simulado | IMPLEMENTADA PARCIALMENTE | [CONFIRMADO] E4 — gera e oculta/revela gabarito, mas **não captura resposta do usuário** nem corrige (FIND-05) |
| `flashcards` — Flashcards | IMPLEMENTADA E FUNCIONAL | [CONFIRMADO] E4 — SRS simplificado funcional (`rateFC()`), export Anki |
| `pontos` — Pontos-chave | IMPLEMENTADA E FUNCIONAL | [CONFIRMADO] E3 |
| `vm` — Ventilação | IMPLEMENTADA E FUNCIONAL, com dívida de UX confirmada | [CONFIRMADO] E4 — calcula, mas com carga cognitiva alta e paridade quebrada com Beira-leito VM (FIND-03, FIND-06) |
| `caso` — Caso Clínico | IMPLEMENTADA E FUNCIONAL | [CONFIRMADO] E3 |
| `atb` — Antibiótico | IMPLEMENTADA E FUNCIONAL, com bug de dado confirmado | [CONFIRMADO] E4 — gera esquema por IA; ClCr embutido no prompt está errado para a maioria dos pacientes (FIND-04) |
| `beialeito` — Beira-leito | IMPLEMENTADA E FUNCIONAL, nome ambíguo | [CONFIRMADO] E4 — painel de IA (`rBeiraleitoPanel`) distinto da sub-aba "Beira-leito VM" dentro de Calculadoras; mesmo nome, propósitos diferentes |
| `calc` — Calculadoras | IMPLEMENTADA E FUNCIONAL | [CONFIRMADO] E4 — 8 sub-telas (`sofa,qsofa,aniongap,delta,beialeito,renal,cardio,tep`), sem metadado/catálogo estruturado |
| `revisao_critica` — Revisão Crítica | IMPLEMENTADA E FUNCIONAL | [CONFIRMADO] E3 — fluxo manual de colar revisão de outro modelo e consolidar |
| `historico` — Histórico | IMPLEMENTADA PARCIALMENTE | [CONFIRMADO] E4 — agrega `questoes/simulado/flashcards/pontos/revisao` via `S.sess`/`rs_ss`, mas limitado a 20 itens, sem filtro, sem métrica de acerto/erro |
| Seleção de provider/modelo | IMPLEMENTADA E FUNCIONAL, com legado não removido | [CONFIRMADO] E4 — novo sistema funciona corretamente; sistema antigo Anthropic-only ainda existe no arquivo (FIND-02) |
| Export/import/persistência | IMPLEMENTADA PARCIALMENTE | [CONFIRMADO] E4 — 4 domínios persistem isoladamente em localStorage; **não há backup/restore geral do app**, só export unidirecional de flashcards para Anki (FIND-07) |

Nenhuma aba foi classificada como QUEBRADA/REGRESSÃO ou LEGADO/ÓRFÃO neste nível (a aba em si carrega e responde); os problemas encontrados estão em código *dentro* das abas, detalhados nos findings abaixo.

**Escopo desta seção**: AUDITED para presença/roteamento/fluxo básico de cada aba; PARTIALLY_AUDITED para todos os caminhos de erro e estados vazios de cada uma (não testados manualmente em browser).

---

## 3. Inventário de calculadoras/scores

`calc.js` exporta 34 funções em `window.RechCalc` (`calc.js:499-534`), divididas em:

**Puras/independentes** (sem duplicação): `calcPBW`, `calcVtPerKgPBW`, `wellsScorePE`, `calcCockcroftGault`, `sofaScore`, `qsofaScore`, `chaVascScore`, `hasbledScore`, `spesiScore`, `anionGapCore`, `classifyAnionGapSimple`, `deltaRatioSimple`, `classifyAnionGapFull`, `deltaRatioFull`, `wintersFormula`, `classifyLactate`, `ureiaCreatininaRatio`, `tgoTgpRatio`, `bdBtPercent`, `classifyPF` — 20 funções, cada uma com teste em `tests/calc.test.js` ou `tests/calc2.test.js`.

**Mecânica ventilatória, com duplicação de interpretação intencional documentada** (`calc.js:379-383`): `drivingPressure`, `staticCompliance`, `tobinIndex`, `pfRatio` (matemática compartilhada) + `classifyDPBeiraleito`/`classifyDPVentilacao`, `classifyComplianceBeiraleito`/`classifyComplianceVentilacao`, `classifyVtKgBeiraleito`/`classifyVtKgVentilacao`, `classifyTobinBeiraleito`/`classifyTobinVentilacao`, `classifyP01Beiraleito`/`classifyP01Ventilacao` — 14 funções (4 + 10 pares de interpretação).

Cada wrapper de UI correspondente vive em `index.html`:
- `calcBeiraleito()`/`vmBCalc()` (`index.html:525-587`, helpers `c*`) — sub-aba "Beira-leito VM" dentro de Calculadoras.
- `rVMCalc()`/`vmCalc()`/`vmCalcPBW()` (`index.html:1423-1523`, helpers `vm*`) — aba Ventilação, modo Calculadoras.
- `rCalc()` (`index.html:397-416`) despacha as demais sub-telas (`sofa,qsofa,aniongap,delta,renal,cardio,tep`).

### FIND-03 — Divergência funcional confirmada entre os dois wrappers de mecânica ventilatória

```
FINDING ID: FIND-03
DOMAIN: CODE
STATUS: CONFIRMED
SEVERITY: MEDIUM
CONFIDENCE: Muito Alta

LOCATION: index.html:572 (vmBCalc) vs index.html:1423-1523 (vmCalc/rVMCalc)
AFFECTED SCOPE: Aba Ventilação, modo "Cálculos rápidos"

EVIDENCE:
  FACTS:
    - [FATO, E4] `RechCalc.pfRatio(...)` é chamado uma única vez em todo
      index.html, na linha 572, dentro de `vmBCalc()`.
    - [FATO, E4] Nenhuma chamada a `RechCalc.pfRatio` existe no bloco
      1423-1523 (`vmCalc`/`rVMCalc`, aba Ventilação).
    - [FATO, E4] `classifyPF` (interpretação de P/F, Berlim 2012) também só
      é referenciada uma vez em calc.js, sem par "Ventilacao".

PROBLEM / IMPACT: a sub-aba "Beira-leito VM" calcula e classifica P/F
  ratio; a aba "Ventilação" — que é a fonte que deveria ser canônica para
  mecânica de VM — não. Um médico que usa a aba Ventilação para avaliar
  hipoxemia precisa saber que precisa ir a outra aba para ter P/F, o que é
  exatamente o tipo de fricção que o adendo de UX já relatou como problema.

VERIFICATION / REPRODUCTION: grep direto por `pfRatio`/`P/F` em todo
  index.html (E4) — resultado único, sem contrapartida na aba Ventilação.

RECOMMENDED NEXT STEP: ao unificar os dois wrappers em um componente único
  (ver seção 9), garantir que P/F entre na lista de métricas do modo
  "avaliar paciente em VM" independente de qual aba o usuário abriu.
```

### FIND-04 — ClCr com idade hardcoded em 60 anos na aba Antibiótico

```
FINDING ID: FIND-04
DOMAIN: CODE
STATUS: CONFIRMED
SEVERITY: HIGH
CONFIDENCE: Muito Alta

LOCATION: index.html:970, index.html:983 (gerarAtb); index.html:887-952 (rAtb, formulário)
AFFECTED SCOPE: Estimativa de ClCr mostrada/usada no prompt de esquema
  antibiótico empírico

EVIDENCE:
  FACTS:
    - [FATO, E4] `rAtb()` (887-952) define campos para foco, origem,
      creatinina (`atb_cr`) e peso (`atb_peso`) — nenhum campo de idade.
    - [FATO, E4] `gerarAtb()` calcula
      `Math.round(((140-60)*peso)/(72*cr))` nas linhas 970 e 983 — o `60`
      é um literal numérico, não uma variável de idade do paciente.
    - [FATO, E4] Em contraste, o calculador renal correto
      (`renalCalc()`, index.html:615-619, sub-aba Calculadoras) usa
      `RechCalc.calcCockcroftGault({cr,idade,peso,sex})` com idade real
      capturada de um campo `cr_idade` (linha 594) — ou seja, o app *tem*
      a implementação correta em outro lugar, mas a aba Antibiótico não a
      reutiliza.

PROBLEM / IMPACT: Cockcroft-Gault é altamente sensível à idade
  ((140-idade)×peso/(72×creatinina)). Assumir 60 anos para todo paciente
  gera ClCr superestimado em pacientes mais jovens e subestimado em idosos
  — no extremo, um paciente de 85 anos recebe uma estimativa de função
  renal como se tivesse 60, o que pode levar a **subdosagem por
  superestimação de ClCr real** ou a ajustes desnecessários no sentido
  oposto. O próprio prompt do sistema instrui a IA a "nunca omitir ajuste
  renal quando creatinina fornecida" (linha 963) — mas o número que
  alimenta esse ajuste já nasce sistematicamente incorreto para qualquer
  paciente que não tenha ~60 anos.

RELATED INVARIANT: nenhum formalizado ainda.
CANDIDATE INVARIANT: "Toda estimativa de função renal exibida ao usuário
  deve usar a idade real do paciente, nunca um valor assumido." Considerar
  formalizar após correção.

VERIFICATION / REPRODUCTION: leitura direta do código-fonte nas 3
  localizações citadas (E4) — determinístico, sem necessidade de execução.

RECOMMENDED NEXT STEP: adicionar campo de idade ao formulário de
  Antibiótico e substituir a fórmula inline por
  `RechCalc.calcCockcroftGault`, igual ao calculador renal já existente.
  Isto é uma correção de bug de dado, não uma refatoração — candidato
  direto para `rech-fix` antes mesmo da expansão de calculadoras.
```

### FIND-05 — Simulado não captura resposta do usuário; "revisar erros" inexistente para Questões/Simulado

```
FINDING ID: FIND-05
DOMAIN: CODE
STATUS: CONFIRMED
SEVERITY: MEDIUM
CONFIDENCE: Muito Alta

LOCATION: index.html:1172-1176 (rSim), index.html:1168-1170 (rQ)
AFFECTED SCOPE: Abas Questões e Simulado

EVIDENCE:
  FACTS:
    - [FATO, E4] `rSim()` só alterna `S.gabVis` para revelar/ocultar o
      texto de gabarito já gerado pela IA — não há input de seleção de
      resposta, nem comparação, nem gravação de acerto/erro.
    - [FATO, E4] `rQ()` não tem nenhum mecanismo de interação além de
      copiar/baixar o texto gerado.

PROBLEM / IMPACT: A funcionalidade "Errei"/repetição espaçada já existe
  para Flashcards (`rateFC()`), mas não existe equivalente para Questões
  ou Simulado. Qualquer proposta de consolidar as três abas em
  "Questões" com uma opção futura de "revisar erros" (adendo 3) precisa
  ser construída do zero para esses dois modos — não é uma migração de
  dado existente.

VERIFICATION / REPRODUCTION: leitura direta de `rSim()`/`rQ()` (E4).

RECOMMENDED NEXT STEP: tratar "revisar erros" para Questões/Simulado como
  feature nova na consolidação, não como unificação de dado já existente;
  ver seção 9/11.
```

### Cobertura de teste por grupo

- **20 funções puras independentes**: cobertura de statements/lines/functions 100% (`tests/calc.test.js`, `tests/calc2.test.js`).
- **14 funções de mecânica ventilatória (incl. pares Beiraleito/Ventilacao)**: também 100% statements/lines/functions; branch geral do arquivo é 99,25% (134/135) — 1 branch não coberta, não localizada com precisão nesta auditoria (reportado pelo v8 perto da linha 536, que é a atribuição final `global.RechCalc=api`, portanto provavelmente um branch de guarda de ambiente não exercitado por nenhum teste; **[NÃO REPRODUZIDO]** o mapeamento exato do branch faltante — recomendo rodar `vitest run --coverage --coverage.reporter=html` para localizar visualmente).
- **Wrappers de DOM** (`c*`, `vm*`): parcialmente cobertos por `tests/domWrappers.test.js`, que extrai funções reais de `index.html` via `tests/helpers/extractFromHtml.js` — mas este arquivo de teste não está no escopo de `coverage.include` (`vitest.config.js:10`), então não há número de cobertura real para eles, só a confirmação de que passam.

**Edge cases não testados** (não reproduzidos nesta auditoria — [NÃO REPRODUZIDO], PLAUSIBLE, E1): validação de entradas não finitas/negativas nos formulários de Ventilação e Antibiótico (`isNaN` é usado em alguns wrappers como `renalCalc()` mas não foi confirmado sistematicamente em todos os 8 sub-calculadores de `calc` nem nos 2 de VM); comportamento com PEEP ≥ Pressão medida (driving pressure/complacência ficariam negativos ou `Infinity`/`NaN` sem mensagem de erro dedicada — não reproduzido em execução real).

**Escopo desta seção**: AUDITED para inventário estrutural e para os 2 findings acima (E4); PARTIALLY_AUDITED para varredura exaustiva de edge case por função — recomendo isso como characterization tests futuros (seção 11), não como parte desta rodada.

---

## 4. Matriz implementação × teste × risco

| Área | Implementação | Teste automatizado | Risco residual |
|---|---|---|---|
| Funções puras `calc.js` (20) | Completa | 100% (calc.test.js/calc2.test.js) | Baixo |
| Mecânica VM `calc.js` (14, com par intencional) | Completa | 100% linhas, 99,25% branch | Baixo na matemática; MEDIUM na paridade de UI (FIND-03) |
| Wrappers DOM Calculadoras/Beira-leito (`c*`) | Completa | Parcial (domWrappers.test.js) | Baixo-Médio |
| Wrappers DOM Ventilação (`vm*`) | Completa, mas incompleta em relação ao par (FIND-03) | Parcial | Médio |
| Geração por IA (`gen()`, `gerarAtb()`, `gerarBeiraleito()`, etc.) | Completa | **Nenhum teste automatizado confirmado** | Médio-Alto — mudanças no roteamento de prompt podem regredir silenciosamente |
| Persistência (`svR/svFC/svSS/svBase`, chaves de API) | Completa | **Nenhum teste automatizado confirmado** | Médio — sem teste, sem backup geral (FIND-07) |
| Sistema legado de API single-provider (FIND-02) | Presente, não removido | Nenhum (nem deveria — é código morto) | Médio — risco arquitetural de reativação silenciosa, não de bug ativo hoje |
| Antibiótico — ClCr hardcoded (FIND-04) | Completa, porém incorreta | Nenhum | **Alto** — dado clínico sistematicamente errado |

---

## 5. Bugs confirmados

1. **FIND-04** [CONFIRMADO] — ClCr com idade fixa em 60 anos na aba Antibiótico. Ver seção 3. Este é o único achado desta auditoria que classifico como bug de dado clínico ativo (não apenas dívida arquitetural).
2. **FIND-03** [CONFIRMADO] — P/F ratio ausente na aba Ventilação, presente só em Beira-leito VM. Não é um bug de cálculo (nada retorna valor errado), é uma lacuna funcional que gera a paridade quebrada citada no adendo de UX.

---

## 6. Riscos não confirmados

### FIND-02 — Subsistema de API legado (Anthropic-only) ainda presente e ativo por sobrescrita global

```
FINDING ID: FIND-02
DOMAIN: CODE
STATUS: CONFIRMED (existência do código legado) / PLAUSIBLE (risco de
  reativação silenciosa em cenário futuro)
SEVERITY: MEDIUM
CONFIDENCE: Muito Alta (existência) / Moderada (cenário de risco)

LOCATION: index.html:160 (MODELS), index.html:195-260 (getKey, getKeySession,
  promptKey, deleteKey, errMsg, api — ~65 linhas), index.html:1093-1094
  (dropdown legado); sobrescrito por rech-ai-ui.js (linhas 25,35,36,47-48)
  e rech-ai-transport.js (linha 10, `api=async function(...)` sem
  const/let/var) carregados por último (index.html:1776-1778).
AFFECTED SCOPE: Toda a camada de chamada de IA e seleção de modelo/chave

EVIDENCE:
  FACTS:
    - [FATO, E4] `index.html:221` declara `async function api(sys,user,...)`
      — implementação completa, single-provider Anthropic, com retry
      3x/backoff, usando `getKey()`/`localStorage["rs_apikey"]`.
    - [FATO, E4] `rech-ai-transport.js:10` executa `api=async function(...)`
      (atribuição global simples, sem palavra-chave de declaração),
      substituindo o `api` acima — e só é carregado na última tag
      `<script>` do arquivo (linha 1778), depois do script inline
      principal já ter executado.
    - [FATO, E4] `rech-ai-ui.js:47-48` faz o mesmo padrão para `render`
      (`const oldRender=render; render=function(){oldRender();controls()}`)
      e reatribui `promptKey`/`deleteKey`/`updateKeyStatus` diretamente.
    - [FATO, E4] `getKey()`, `getKeySession()` e `errMsg()` não são
      reatribuídos por nenhum dos três módulos novos — ficam órfãos,
      nunca mais chamados após o carregamento completo da página.
    - [FATO, E4] O modelo de fallback hardcoded na função antiga
      (`index.html:224`, `S.model||"claude-sonnet-4-6"`) é o mesmo ID
      desatualizado presente no array legado `MODELS` (`index.html:160`).
  INFERENCES:
    - [E2] Como o carregamento de scripts é síncrono e sequencial, e
      nenhuma chamada de usuário a `api()`/`promptKey()` pode ocorrer
      antes do parser atingir a linha 1778 (não há `defer`/`async` nas
      tags nem chamada automática entre a definição antiga e a nova),
      o comportamento funcional **hoje** é correto: o usuário sempre
      interage com o sistema multi-provider novo.

PROBLEM / IMPACT: Não é um bug ativo, mas é dívida arquitetural real e um
  risco latente concreto para o próprio objetivo desta auditoria — abrir
  espaço para expansão. Qualquer refatoração futura que divida
  `index.html` em módulos, adicione um `<script defer>`, reordene tags,
  ou mova a inicialização para depois de um evento — cenários prováveis
  justamente ao se preparar o app para dezenas de calculadoras — pode
  reativar silenciosamente o caminho Anthropic-only antigo, o que viola
  diretamente o requisito explícito da Issue #8 de "ausência de fallback
  silencioso" no multi-provider. Também é ~65 linhas de superfície de
  manutenção morta que um editor futuro pode confundir com código vivo.

RELATED INVARIANT: nenhum formalizado.
CANDIDATE INVARIANT: "Deve existir apenas uma implementação de api()/
  gerenciamento de chave no código-fonte; nenhuma reatribuição global
  tácita de funções centrais deve ser o mecanismo de override."

VERIFICATION / REPRODUCTION: leitura direta de ambos os arquivos e da
  ordem das tags `<script>` (E4). Não foi reproduzido em runtime de
  browser real (não abri o app num navegador) — o raciocínio sobre ordem
  de execução é E2/inferência, não observação em runtime. Por isso a
  existência do código legado é CONFIRMED, mas o cenário de risco de
  reativação continua PLAUSIBLE, não CONFIRMED.

RECOMMENDED NEXT STEP: remover completamente `index.html:195-260` e o
  array `MODELS`/dropdown legado (`index.html:160,1093-1094`) — a
  substituição já é 100% funcional. Esse é um `rech-fix` de escopo
  pequeno e seguro (deletar código morto verificadamente não referenciado),
  não uma refatoração de arquitetura.
```

Nenhum outro risco não confirmado relevante foi levantado nesta rodada além dos já listados nas seções 3 e 7. A duplicação de cálculo entre `classify*Beiraleito`/`classify*Ventilacao` está marcada como **[INTENCIONAL]** pelo próprio código (`calc.js:379-383`) e não é tratada aqui como risco — é uma decisão de produto documentada (preservar redação distinta), separada da duplicação de UI/DOM (FIND-03/FIND-06), que é a parte real de dívida técnica.

---

## 7. Dívida arquitetural

1. **Monólito único** — `index.html` concentra UI, estado global (`S`), roteamento, prompts de IA e parte da lógica de persistência em 1780 linhas / 152 KB. `calc.js` já foi extraído como exceção testável — nenhum outro módulo de responsabilidade foi extraído da mesma forma.
2. **Duas famílias paralelas de helpers de DOM para calculadoras** (`c*` vs `vm*`) fazendo o mesmo tipo de trabalho (ler input, formatar output, exibir alerta) sem abstração compartilhada — cada calculadora nova hoje exigiria escolher qual família imitar, perpetuando a duplicação.
3. **Nenhum catálogo/metadado de calculadora** — não existe uma estrutura de dados (nome, categoria, sinônimos, inputs, unidades, fórmula, referência, versão) para nenhuma das 34 funções de `calc.js`. Cada calculadora é uma função solta chamada a partir de HTML escrito à mão.
4. **Sistema de API legado não removido** (FIND-02) — ~65 linhas mortas mascaradas por sobrescrita de escopo global.
5. **"Beira-leito" nomeia duas coisas diferentes** no app (painel de IA de primeiro nível vs. sub-aba de calculadora dentro de "Calculadoras") — colisão de nomenclatura que provavelmente contribui para a confusão relatada no adendo de UX, independente da duplicação de código.
6. **Cobertura de teste desigual** — `calc.js` é exemplar (100%); todo o resto do app (roteamento, geração por IA, persistência, ~1780 linhas) não tem nenhuma cobertura medida nem, aparentemente, testes de integração/E2E.
7. **Ausência de export/import geral** — apenas Flashcards tem exportação (unidirecional, para Anki); os outros 3 domínios de localStorage (`rs_rev`, `rs_ss`, `rs_base`) não têm backup/restore.

---

## 8. Gaps para expansão das calculadoras

Para adicionar 50–200 calculadoras sem repetir os padrões acima em escala, faltam hoje:

- Um **catálogo estruturado** (nome, sinônimos, categoria, inputs tipados, unidades, fórmula/cutoffs, referência, versão, teste vinculado) — nenhuma calculadora tem isso hoje, nem as 34 já existentes.
- Um **componente de UI único** para renderizar formulário+resultado a partir do metadado, substituindo as famílias `c*`/`vm*` por uma implementação (dado que o app é vanilla JS sem framework — a unificação não precisa de um framework novo, só de uma função `renderCalculator(meta)` compartilhada).
- **Testes de característica (characterization tests)** para os wrappers de DOM antes de qualquer migração de UI, para garantir que a unificação não perca comportamento hoje só coberto implicitamente.
- Uma **convenção de categoria/taxonomia** (cardiovascular, respiratório, renal, eletrólitos, ácido-base, infecção, etc.) para organizar o catálogo — hoje as sub-abas de `calc` (`sofa,qsofa,aniongap,delta,beialeito,renal,cardio,tep`) são uma lista plana sem hierarquia.
- Decisão explícita de onde a duplicação **intencional** de redação (`classify*Beiraleito`/`classify*Ventilacao`) deve ou não se repetir no catálogo novo — hoje ela é um precedente ambíguo: útil se o objetivo é preservar nuance por contexto de uso, arriscado se apenas encoraja copy-paste.

---

## 9. Proposta de arquitetura do catálogo de calculadoras

Baseado no que já existe (que deve ser reaproveitado, não descartado):

```
calc.js                          → continua sendo o motor de funções puras
                                    testáveis (100% de cobertura já provado
                                    viável neste projeto)

calc-catalog.js (novo)           → array de metadados, um item por
                                    calculadora:
  { id, nome, sinonimos[], categoria, inputs:[{id,label,unidade,tipo,
    validacao}], fn: RechCalc.<funcaoPura>, classify: RechCalc.<funcaoClassify>,
    referencia, versaoReferencia, testeArquivo }

renderCalculator(meta)  (novo, substitui c*/vm*) → um único componente de
                                    UI que lê o metadado e gera formulário +
                                    resultado + interpretação, eliminando a
                                    necessidade de reimplementar wrapper por
                                    aba
```

A aba "Ventilação" e a sub-aba "Beira-leito VM" deveriam, depois disso, **chamar o mesmo `renderCalculator()`** para as métricas compartilhadas (PBW, Vt/kg, DP, Cst, P/F, Tobin, P0.1) — resolvendo ao mesmo tempo FIND-03 (paridade quebrada) e a duplicação estrutural relatada no adendo de UX. Onde a redação precisar ser propositalmente diferente por contexto clínico (a duplicação hoje marcada `[INTENCIONAL]`), o metadado pode ter uma variante de `classify` por contexto (`beiraleito`/`ventilacao`) sem duplicar o componente de UI inteiro — só a função de interpretação, que é exatamente o padrão que `calc.js` já usa hoje.

Sequência recomendada de implementação: (1) extrair 3-5 calculadoras já existentes para o formato de catálogo como prova de conceito, incluindo as de VM para resolver FIND-03 no processo; (2) só então importar a lista grande do usuário diretamente no formato de catálogo, nunca direto como HTML solto.

---

## 10. Proposta de fluxo "não encontrado → pesquisar"

Pré-requisito direto da seção 9: **sem catálogo estruturado, não há como o app responder "não encontrado"** de forma confiável — hoje "buscar uma calculadora" não existe como conceito no código (confirmado: não há campo de busca textual em nenhuma aba; `TEMAS_LIB`, `index.html:794-824`, é uma lista estática por clique, não busca livre).

Fluxo proposto, condicionado à existência do catálogo:

```
usuário digita termo
        ↓
busca por id/nome/sinônimo no catalog (local, determinístico)
        ↓
   ACHOU                          NÃO ACHOU
   → abre renderCalculator(meta)  → "Não encontrado no catálogo local"
     (resultado determinístico)     [🔎 Pesquisar] (opcional, explícito)
                                          ↓
                                  IA busca/explica fonte, fórmula,
                                  variáveis — sempre rotulado como
                                  conteúdo gerado, nunca como resultado
                                  determinístico
                                          ↓
                                  [Sugerir inclusão no catálogo]
                                  → item vira candidato, só entra no
                                    catalog.js após validação humana +
                                    teste, igual ao que já acontece com
                                    as 34 funções atuais
```

Este fluxo não deve ser implementado antes do catálogo da seção 9 existir — implementá-lo sobre a estrutura atual (funções soltas) só criaria mais um sistema paralelo de busca sem fonte de verdade única.

---

## 11. Sequência recomendada de implementação

1. **Corrigir FIND-04** (ClCr hardcoded em 60 anos) — bug de dado clínico ativo, escopo pequeno, sem dependência de nenhuma refatoração. Candidato imediato a `rech-fix`.
2. **Remover o sistema de API legado** (FIND-02) — deleção de código morto verificado, reduz risco de reativação silenciosa antes de qualquer refatoração maior tocar a área de scripts/carregamento.
3. **Unificar Ventilação × Beira-leito VM** via `renderCalculator()` (seção 9), resolvendo FIND-03 e a queixa de UX do adendo — isso já valida o padrão de catálogo em produção com calculadoras reais antes de escalar.
4. **Extrair `calc-catalog.js`** para as 34 funções existentes, migrando `c*`/`vm*` remanescentes para o componente único.
5. **Consolidar Questões/Simulado/Flashcards** (adendo 3) — tecnicamente barato hoje (estado já compartilhado), mas fazer depois dos passos 1-4 evita mexer em duas frentes de UI ao mesmo tempo.
6. **Implementar captura de resposta + revisar erros** para Questões/Simulado (novo, não migração — FIND-05), como parte da consolidação.
7. **Reorganizar navegação em macroáreas** (Estudar/Praticar/Ferramentas/Base Própria/Histórico) — depois dos passos acima, para não reorganizar navegação em cima de uma estrutura de calculadoras que ainda vai mudar de forma.
8. **Construir o fluxo "não encontrado → pesquisar"** (seção 10) sobre o catálogo já existente.
9. **Só então importar a lista grande de calculadoras**, diretamente no formato de catálogo da seção 9.
10. **Migração Antibiótico → RechDrugs** (adendo 2) pode ocorrer em paralelo a qualquer um dos passos acima — é isolada o suficiente (bloco contíguo, seção 12) para não bloquear nem ser bloqueada pelo resto.

---

## 12. Release gates antes de adicionar a lista grande

Não prosseguir com a importação em massa de calculadoras até:

- [ ] FIND-04 corrigido e coberto por teste de regressão.
- [ ] FIND-02 (sistema de API legado) removido.
- [ ] `calc-catalog.js` existir e conter pelo menos as calculadoras de mecânica ventilatória compartilhadas entre Ventilação e Beira-leito, resolvendo FIND-03.
- [ ] `renderCalculator()` (ou equivalente) substituindo as famílias `c*`/`vm*` para pelo menos essas calculadoras, como prova de conceito.
- [ ] `npm run test:coverage` mantendo 100%/100%/100% em statements/lines/functions para `calc.js` após qualquer mudança (branch coverage: investigar e fechar o gap de 99,25% antes de escalar, para não herdar uma branch não coberta em 34→100+ funções).
- [ ] Decisão explícita registrada (issue/ADR) sobre o padrão de duplicação intencional de redação (`classify*Beiraleito`/`*Ventilacao`) — se o catálogo novo deve ou não repetir esse padrão por contexto clínico.

---

## Anexo — Adendos da Issue #8: avaliação direta

### Adendo 1 — UX/Ventilação

[CONFIRMADO] A duplicação estrutural entre Ventilação e Beira-leito VM é real (FIND-03) e "Beira-leito" nomeia duas coisas diferentes no app (painel de IA de primeiro nível vs. sub-aba de calculadora). Isso é evidência de código, não só percepção do usuário. A causa raiz da queixa de UX ("mal sei mexer") é, com evidência direta, mais estrutural (duplicação + nomenclatura ambígua) do que apenas volume de campos na tela — embora eu não tenha reproduzido a experiência real em browser nesta auditoria (**[NÃO REPRODUZIDO]** teste de usabilidade real; a avaliação de carga cognitiva por tela é PLAUSIBLE/E2-E3, baseada em leitura do HTML gerado, não em observação de uso real).

Minha opinião: a proposta de navegação por tarefa clínica ("O que você quer fazer?") no adendo é a correção certa, mas só deve ser implementada **depois** da unificação técnica da seção 9 — navegar por tarefa sobre dois motores de cálculo divergentes (FIND-03) resolveria a superfície sem resolver a causa.

### Adendo 2 — Antibioticoterapia → RechDrugs [INTENCIONAL]

[CONFIRMADO] O conteúdo da aba Antibiótico hoje é ~100% gerado por prompt de IA em tempo real (`gerarAtb()`) — o único conteúdo hardcoded no código é a pequena tabela de referência de ajuste renal para 6 drogas (`index.html:600-609`) e o bug de ClCr (FIND-04). Isso muda o escopo prático da migração: não há uma grande base de dados para "mover" para RechDrugs — o trabalho real é (a) decidir se o *prompt* de geração de esquema antibiótico passa a consultar RechDrugs como fonte, e (b) migrar essa pequena tabela de ajuste renal e corrigir FIND-04 no processo, já que ambos tratam do mesmo domínio (dose × função renal).

Minha opinião: concordo com a fronteira proposta. Sugiro adiantar a correção de FIND-04 independentemente do timing da migração — é um bug de dado que existe hoje, com ou sem RechDrugs.

### Adendo 3 — Consolidar Questões/Simulado/Flashcards

[CONFIRMADO] Questões e Simulado já compartilham quase todo o estado de configuração (`S.tema/subtema/nivel/foco/estilo/modoEstudo`) e a mesma função `gen()`/`rCfg()` — a fusão dessas duas é de fato barata. Flashcards é estruturalmente mais distante (estado próprio `S.fc`, persistência dedicada, SRS). Histórico já agrega as três por campo `tipo`, então a consolidação de abas não exige migração de histórico. Confirmo também que "revisar erros" para Questões/Simulado (mencionado como possível etapa posterior no adendo) não existe hoje e precisa ser construído do zero (FIND-05) — não é dado a migrar, é feature nova.

Minha opinião: concordo com a consolidação proposta. Recomendo tratá-la como os passos 5-6 da sequência da seção 11 — depois da unificação de calculadoras, não antes, para não ter duas frentes de reorganização de UI abertas ao mesmo tempo.

---

## Escopo de cobertura desta auditoria

```
AUDITED:            calc.js (100% das 34 funções + suíte de teste real
                     executada), estrutura de TABS/roteamento, os 3
                     wrappers de mecânica ventilatória, aba Antibiótico,
                     estado de Questões/Simulado/Flashcards/Histórico,
                     camada multi-provider (rech-ai-*.js) e o sistema de
                     API legado coexistente, persistência em localStorage.

PARTIALLY_AUDITED:  edge cases de validação de input em todos os 34
                     calculadores (verificado amostralmente, não
                     exaustivamente); comportamento real em browser
                     (nenhuma sessão de browser foi aberta nesta
                     auditoria — toda a evidência é leitura estática de
                     código + execução da suíte Vitest/jsdom); a única
                     branch não coberta reportada pelo v8 (~linha 536).

NOT_AUDITED:         desempenho/performance, segurança (XSS/injeção —
                     nenhuma varredura dedicada foi feita, embora o uso
                     de `esc()` em pontos de renderização de conteúdo do
                     usuário sugira alguma mitigação já presente, não
                     verificada a fundo), acessibilidade, comportamento
                     mobile real, os módulos rech-ai-config.js/transport
                     sob falha de rede real (só leitura de código).
```

**Conclusão de cobertura**: os findings confirmados (FIND-02 a FIND-05) e o mapeamento estrutural das seções 2-3 e 7-9 são suficientes para orientar a sequência de trabalho antes da expansão de calculadoras — mas esta auditoria não substitui um teste manual em browser real nem uma varredura de segurança dedicada antes de expor o app a mais tráfego.
