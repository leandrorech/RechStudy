/* RechStudy navigation consolidation.
 * Keeps legacy tab ids internally so existing generators/state remain untouched,
 * but presents Questões / Simulado / Flashcards as one top-level Questões hub.
 */
(function(){
'use strict';

const QUESTION_MODES=new Set(['questoes','simulado','flashcards']);
const QUESTION_LABELS={
  questoes:'❓ Questões avulsas',
  simulado:'🏆 Simulado',
  flashcards:'🃏 Flashcards'
};

function isQuestionMode(id){return QUESTION_MODES.has(id);}

function questionModeNav(){
  const buttons=Object.entries(QUESTION_LABELS).map(([id,label])=>
    `<button class="opt ${S.tab===id?'sel':''}" aria-pressed="${S.tab===id?'true':'false'}" onclick="setQuestionMode('${id}')">${label}</button>`
  ).join('');
  return `<div id="question-mode-nav" class="panel" style="margin-bottom:10px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <div>
        <div class="rtag">QUESTÕES</div>
        <div style="font-size:13px;color:#e8f5e9">Escolha como quer praticar</div>
      </div>
      <div class="opts" role="group" aria-label="Modo de questões" style="margin:0">${buttons}</div>
    </div>
  </div>`;
}

function decorateTopTabs(){
  const tabs=document.getElementById('tabs');
  if(!tabs)return;
  let questionButton=null;
  [...tabs.querySelectorAll('button.tab')].forEach(btn=>{
    const action=btn.getAttribute('onclick')||'';
    if(action.includes("setTab('questoes')"))questionButton=btn;
    if(action.includes("setTab('simulado')")||action.includes("setTab('flashcards')"))btn.remove();
  });
  if(questionButton&&isQuestionMode(S.tab)){
    questionButton.classList.add('active');
    questionButton.setAttribute('aria-current','page');
  }
}

function decorateQuestionArea(){
  if(!isQuestionMode(S.tab))return;
  const cfg=document.getElementById('cfg');
  if(!cfg||document.getElementById('question-mode-nav'))return;
  cfg.insertAdjacentHTML('afterbegin',questionModeNav());
}

window.setQuestionMode=function(mode){
  if(!isQuestionMode(mode))return;
  setTab(mode);
};

const legacyRender=render;
render=function(){
  legacyRender();
  decorateTopTabs();
  decorateQuestionArea();
};

// Normalize the first paint when this script is loaded after the main app script.
render();
})();
