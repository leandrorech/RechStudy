# Changelog

## Unreleased — Runtime stabilization

### Fixed
- Added the missing `parseFC()` definition (`index.html`), used by `gen()` to parse the flashcard-generation JSON response into `{frente, verso, mecanismo, armadilha, guideline, dificuldade}` objects, mapping from `PF()`'s short JSON keys (`f,v,m,a,g,d`). Previously calling `parseFC()` threw `ReferenceError` on every flashcard generation.
- Added the missing `parseJ()` definition (`index.html`), used by `planejar()` to parse the apostila microblock-plan JSON response (tolerant of ```` ```json ```` fences and surrounding prose). Previously calling `parseJ()` threw `ReferenceError` when planning an Avançado/Expert UTI apostila.
- Fixed `rFC()` (`index.html`) reading the `td` (today's date) filter variable before its `const td=` declaration, which threw a temporal-dead-zone `ReferenceError` on the "hoje" flashcard filter. `td` is now declared before first use.
- Fixed `rHist()` (`index.html`) rendering `s.ts`, a field `addSS()` never writes (it writes `s.data`), which always showed the session timestamp as `undefined` in the histórico tab. `rHist()` now reads `s.data||s.ts||""`, keeping compatibility with any legacy record that used `ts`.

### Tests
- Added `tests/parsingAndHistory.test.js` covering `parseJ()`, `parseFC()`, the `rFC()` "hoje" filter (including the `td`-before-declaration regression), and `rHist()`'s reading of `addSS()`-persisted records (both `s.data` and legacy `s.ts`).
- Extended `tests/helpers/extractFromHtml.js` with `loadIndexHtmlConsts()` to extract and test top-level `const name=(...)=>{...}` arrow-function bindings (`svFC`, `svSS`) directly from `index.html`, verifying they persist to the expected `rs_fc`/`rs_ss` `localStorage` keys.

No changes were made to `calc.js`, calculator formulas, thresholds, roundings, clinical messages, or the beira-leito/ventilation DOM wrappers.
