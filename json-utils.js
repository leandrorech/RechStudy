(function(root,factory){
'use strict';
const api=factory();
if(root) root.parseJ=api.parseJ;
if(typeof module==='object'&&module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function parseJ(raw){
  const original=String(raw??'').trim();
  if(!original) throw new Error('Resposta da IA vazia; esperado JSON.');

  const cleaned=original
    .replace(/^```(?:json)?\s*/i,'')
    .replace(/\s*```$/,'')
    .trim();

  try{return JSON.parse(cleaned);}catch{}

  for(let start=0;start<cleaned.length;start++){
    const open=cleaned[start];
    if(open!=='['&&open!=='{')continue;
    const close=open==='['?']':'}';
    let depth=0,inString=false,escaped=false;
    for(let i=start;i<cleaned.length;i++){
      const ch=cleaned[i];
      if(inString){
        if(escaped)escaped=false;
        else if(ch==='\\')escaped=true;
        else if(ch==='"')inString=false;
        continue;
      }
      if(ch==='"'){inString=true;continue;}
      if(ch===open)depth++;
      else if(ch===close){
        depth--;
        if(depth===0){
          const candidate=cleaned.slice(start,i+1);
          try{return JSON.parse(candidate);}catch{break;}
        }
      }
    }
  }

  throw new Error('Resposta da IA não contém JSON válido.');
}
return{parseJ};
});
