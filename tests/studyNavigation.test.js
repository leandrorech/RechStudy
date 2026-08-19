import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,'..','study-navigation.js'),'utf8');

function legacyPaint(){
  const tabs=document.getElementById('tabs');
  tabs.innerHTML=[
    ['revisar','📚 Revisar'],
    ['questoes','❓ Questões'],
    ['simulado','🏆 Simulado'],
    ['flashcards','🃏 Flashcards'],
    ['pontos','🎯 Pontos-chave']
  ].map(([id,label])=>`<button class="tab ${globalThis.S.tab===id?'active':''}" onclick="setTab('${id}')">${label}</button>`).join('');
  document.getElementById('cfg').innerHTML='<div class="panel" id="legacy-config">config legado</div>';
}

function loadNavigation(){
  // The production file is a classic browser script; evaluate it as such.
  new Function(source)();
}

beforeEach(()=>{
  document.body.innerHTML='<div id="tabs"></div><div id="cfg"></div><div id="main"></div>';
  globalThis.S={tab:'questoes'};
  globalThis.cancelPendingRuns=()=>{};
  globalThis.render=legacyPaint;
  globalThis.setTab=(id)=>{globalThis.cancelPendingRuns();globalThis.S.tab=id;globalThis.render();};
});

afterEach(()=>{
  delete globalThis.S;
  delete globalThis.render;
  delete globalThis.setTab;
  delete globalThis.cancelPendingRuns;
  delete window.setQuestionMode;
});

describe('Question hub navigation',()=>{
  it('shows one top-level Questões tab and three internal modes',()=>{
    loadNavigation();
    const top=[...document.querySelectorAll('#tabs .tab')].map(x=>x.textContent.trim());
    expect(top).toEqual(['📚 Revisar','❓ Questões','🎯 Pontos-chave']);
    const modes=[...document.querySelectorAll('#question-mode-nav button')].map(x=>x.textContent.trim());
    expect(modes).toEqual(['❓ Questões avulsas','🏆 Simulado','🃏 Flashcards']);
    expect(document.querySelector('#question-mode-nav button.sel')?.textContent).toContain('Questões avulsas');
  });

  it('keeps legacy simulado state while Questões remains the active top-level tab',()=>{
    loadNavigation();
    window.setQuestionMode('simulado');
    expect(globalThis.S.tab).toBe('simulado');
    expect(document.querySelector('#tabs .tab.active')?.textContent).toContain('Questões');
    expect(document.querySelector('#question-mode-nav button.sel')?.textContent).toContain('Simulado');
    expect(document.getElementById('legacy-config')).not.toBeNull();
  });

  it('keeps legacy flashcards state while Questões remains the active top-level tab',()=>{
    loadNavigation();
    window.setQuestionMode('flashcards');
    expect(globalThis.S.tab).toBe('flashcards');
    expect(document.querySelector('#tabs .tab.active')?.textContent).toContain('Questões');
    expect(document.querySelector('#question-mode-nav button.sel')?.textContent).toContain('Flashcards');
  });
});
