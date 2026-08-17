/* RechStudy AI transports. Credentials are read from rech-ai-ui.js and sent only to the selected provider. */
(function(){
'use strict';
function err(status,body,p){if(status===401||status===403)return`API Key recusada por ${RECH_AI_CATALOG[p].label}`;if(status===429)return`Rate limit de ${RECH_AI_CATALOG[p].label}`;return`Erro HTTP ${status}${body?.error?.message?' — '+body.error.message:''}`}
async function json(url,opt,p){const c=new AbortController(),timer=setTimeout(()=>c.abort(),90000);try{const r=await fetch(url,{...opt,signal:c.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(err(r.status,d,p));return d}catch(e){if(e.name==='AbortError')throw new Error(`Timeout no provedor ${RECH_AI_CATALOG[p].label}`);throw e}finally{clearTimeout(timer)}}
async function anthropic(key,model,sys,user,max){const d=await json('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model,max_tokens:max,system:sys,messages:[{role:'user',content:user}]})},'anthropic');return d.content?.map(x=>x.text||'').join('')||''}
async function compatible(p,url,key,model,sys,user,max,completionTokens=false){const body={model,messages:[{role:'system',content:sys},{role:'user',content:user}]};body[completionTokens?'max_completion_tokens':'max_tokens']=max;const d=await json(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify(body)},p);const c=d.choices?.[0]?.message?.content;return Array.isArray(c)?c.map(x=>x?.text||'').join(''):String(c||'')}
async function gemini(key,model,sys,user,max){const u=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;const d=await json(u,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{maxOutputTokens:max}})},'gemini');return d.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||''}
function customUrl(){let u=(localStorage.getItem('rs_ai_custom_base')||'').trim().replace(/\/+$/,'');if(!u)return'';if(/\/chat\/completions$/i.test(u))return u;if(!/\/v1$/i.test(u))u+='/v1';return u+'/chat/completions'}
api=async function(sys,user,tokensKey='default'){
  const p=rechAiProvider(),key=rechAiKey(p),model=rechAiModel(p);if(!key)throw new Error(`API Key de ${RECH_AI_CATALOG[p].label} não configurada`);
  let ctx='';try{ctx=baseContext()}catch{}if(ctx){sys=String(sys||'')+ctx;user=`${ctx}\n\n--- [TAREFA DO APP] ---\n${user}`}
  const max=(typeof TOKENS!=='undefined'&&(TOKENS[tokensKey]||TOKENS.default))||8000;let out='';
  if(p==='anthropic')out=await anthropic(key,model,sys,user,max);
  else if(p==='openai')out=await compatible(p,'https://api.openai.com/v1/chat/completions',key,model,sys,user,max,true);
  else if(p==='gemini')out=await gemini(key,model,sys,user,max);
  else if(p==='deepseek')out=await compatible(p,'https://api.deepseek.com/chat/completions',key,model,sys,user,max);
  else if(p==='qwen')out=await compatible(p,'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',key,model,sys,user,max);
  else if(p==='kimi')out=await compatible(p,'https://api.moonshot.ai/v1/chat/completions',key,model,sys,user,max);
  else if(p==='custom'){const u=customUrl();if(!u)throw new Error('Configure a Base URL do provider Custom (⚙).');out=await compatible(p,u,key,model,sys,user,max)}
  if(!String(out||'').trim())throw new Error(`Resposta vazia de ${RECH_AI_CATALOG[p].label}`);return String(out).trim();
};
})();
