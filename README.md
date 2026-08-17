# RechStudy

Ferramenta HTML standalone de estudo médico assistido por IA, com abas para revisão de conteúdo, base própria de material, banco de questões, simulado, flashcards, pontos-chave, ventilação mecânica, caso clínico, antibioticoterapia, checklist de beira-leito, calculadoras clínicas, revisão crítica e histórico.

## Estrutura

- `index.html` — aplicação completa (single-file).
- `calc.js` — lógica de cálculo pura extraída do `index.html`, testável isoladamente.
- `tests/` — suite Vitest + jsdom cobrindo `calc.js` e wrappers de DOM.
- `.github/workflows/test.yml` — CI: roda a suite de testes em push/PR para `main`.

## Rodando os testes

```
npm install
npm test
```

## Status

Repositório ativo, com múltiplas branches de feature em andamento (layout desktop, provider multi-IA, estabilização de runtime). `main` reflete o estado consolidado mais recente.
