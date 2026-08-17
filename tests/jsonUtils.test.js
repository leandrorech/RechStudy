import { describe, it, expect } from 'vitest';
import '../json-utils.js';

const { parseJ } = globalThis;

describe('parseJ',()=>{
  it('parseia JSON puro',()=>{
    expect(parseJ('[{"id":"a"}]')).toEqual([{id:'a'}]);
  });

  it('aceita fence markdown json',()=>{
    expect(parseJ('```json\n[{"id":"a"}]\n```')).toEqual([{id:'a'}]);
  });

  it('recupera o primeiro valor JSON de texto residual',()=>{
    expect(parseJ('Plano:\n[{"id":"a","titulo":"A [B]"}]\nFim.')).toEqual([{id:'a',titulo:'A [B]'}]);
  });

  it('preserva escapes e estruturas aninhadas',()=>{
    expect(parseJ('{"texto":"aspas \\"ok\\"","itens":[1,2]}')).toEqual({texto:'aspas "ok"',itens:[1,2]});
  });

  it('falha de forma explícita quando não há JSON válido',()=>{
    expect(()=>parseJ('sem json')).toThrow(/não contém JSON válido/i);
  });

  it('falha de forma explícita em resposta vazia',()=>{
    expect(()=>parseJ('   ')).toThrow(/vazia/i);
  });
});
