/* RechStudy provider UI. Keys are isolated per provider. */
(function(){
'use strict';
const C=window.RECH_AI_CATALOG;
const pk='rs_ai_provider';
const p=()=>C[localStorage.getItem(pk)]?localStorage.getItem(pk):'anthropic';
const mk=x=>`rs_ai_model_${x}`;
const lk=x=>`rs_ai_key_${x}`;
const sk=x=>`rs_ai_key_session_${x}`;
function model(x=p()){
  if(x==='custom')return localStorage.getItem('rs_ai_custom_model')||'custom-model';
  const saved=localStorage.getItem(mk(x));
  return C[x].models.some(([id])=>id===saved)?saved:C[x].models[0][0];
}
window.rechAiProvider=p;
window.rechAiModel=model;
window.rechAiKey=x=>sessionStorage.getItem(sk(x||p()))||localStorage.getItem(lk(x||p()))||'';
window.setRechAiProvider=function(x){if(!C[x])return;localStorage.setItem(pk,x);try{S.model=model(x)}catch{};render()};
window.setRechAiModel=function(x){const prov=p();if(prov==='custom')localStorage.setItem('rs_ai_custom_model',x);else localStorage.setItem(mk(prov),x);try{S.model=x}catch{}};
window.configureCustomProvider=function(){
  const b=prompt('Base URL OpenAI-compatible:',localStorage.getItem('rs_ai_custom_base')||'');if(b===null)return;
  const m=prompt('ID exato do modelo:',localStorage.getItem('rs_ai_custom_model')||'');if(m===null)return;
  localStorage.setItem('rs_ai_custom_base',b.trim());localStorage.setItem('rs_ai_custom_model',m.trim());render();
};
promptKey=function(){
  const prov=p(),cur=rechAiKey(prov);
  const entered=prompt(`API Key — ${C[prov].label}\n\nVazio + OK apaga somente a chave deste provedor.`,cur);if(entered===null)return;
  const key=entered.trim();
  if(!key){localStorage.removeItem(lk(prov));sessionStorage.removeItem(sk(prov));render();return;}
  const persist=confirm('Salvar neste dispositivo?\nOK = persistente\nCancelar = somente nesta sessão (recomendado em PC compartilhado)');
  if(persist){localStorage.setItem(lk(prov),key);sessionStorage.removeItem(sk(prov));}
  else{sessionStorage.setItem(sk(prov),key);localStorage.removeItem(lk(prov));}
  render();
};
deleteKey=function(){const prov=p();if(!confirm(`Apagar a chave de ${C[prov].label}?`))return;localStorage.removeItem(lk(prov));sessionStorage.removeItem(sk(prov));render()};
updateKeyStatus=function(){
  const el=document.getElementById('key-status');if(!el)return;const prov=p(),has=!!rechAiKey(prov),sess=!!sessionStorage.getItem(sk(prov));
  el.innerHTML=has?`<span style="color:${sess?'#fbbf24':'#34d399'}">${sess?'🔑':'✅'} ${C[prov].label}${sess?' · sessão':''}</span> <button onclick="deleteKey()" style="padding:1px 5px;border-radius:3px;border:1px solid #7f1d1d;background:transparent;color:#f87171;font-size:9px;cursor:pointer">🗑</button>`:`<span style="color:#f87171">⚠️ ${C[prov].label} sem key</span>`;
};
function controls(){
  const host=document.getElementById('model-sel-hdr');if(!host)return;const prov=p(),m=model(prov);
  const providers=Object.entries(C).map(([id,c])=>`<option value="${id}" ${id===prov?'selected':''}>${c.label}</option>`).join('');
  const models=prov==='custom'?`<input value="${String(m).replace(/"/g,'&quot;')}" aria-label="Modelo customizado" oninput="setRechAiModel(this.value)" style="width:115px;padding:3px 6px;border-radius:6px;border:1px solid #0d3b18;background:#021a06;color:#7aab7a;font-size:10px">`:`<select aria-label="Modelo de IA" onchange="setRechAiModel(this.value)" style="padding:3px 6px;border-radius:6px;border:1px solid #0d3b18;background:#021a06;color:#7aab7a;font-size:10px">${C[prov].models.map(([id,l])=>`<option value="${id}" ${id===m?'selected':''}>${l}</option>`).join('')}</select>`;
  host.innerHTML=`<span style="display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap"><select aria-label="Provedor de IA" onchange="setRechAiProvider(this.value)" style="padding:3px 6px;border-radius:6px;border:1px solid #0d3b18;background:#021a06;color:#7aab7a;font-size:10px">${providers}</select>${models}${prov==='custom'?'<button class="btn-sm" onclick="configureCustomProvider()">⚙</button>':''}</span>`;
  updateKeyStatus();
}
const oldRender=render;
render=function(){oldRender();controls()};
try{S.model=model()}catch{}
render();
})();
