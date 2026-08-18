'use strict';

const OPENROUTER_URL='https://openrouter.ai/api/v1/chat/completions';
function getBody(req){ if(!req.body)return{}; if(typeof req.body==='object')return req.body; try{return JSON.parse(req.body)}catch{return{}} }
function clean(v,max=500){return String(v??'').trim().slice(0,max)}
function pos(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:null}
function content(data){const c=data?.choices?.[0]?.message?.content;return typeof c==='string'?c:Array.isArray(c)?c.map(x=>x?.text||'').join(''):''}
const schema={
  type:'object',additionalProperties:false,
  properties:{
    mode:{type:'string',enum:['single','recipe']},
    recipe_name:{type:'string'},
    consumed_grams:{type:['number','null']},
    final_recipe_weight_g:{type:['number','null']},
    ingredients:{type:'array',items:{type:'object',additionalProperties:false,properties:{
      raw:{type:'string'},name:{type:'string'},grams:{type:['number','null']},quantity_text:{type:'string'},preparation:{type:'string'},
      ambiguity:{type:'string',enum:['none','needs_detail']},ambiguity_reason:{type:'string'}
    },required:['raw','name','grams','quantity_text','preparation','ambiguity','ambiguity_reason']}},
    errors:{type:'array',items:{type:'string'}}
  },required:['mode','recipe_name','consumed_grams','final_recipe_weight_g','ingredients','errors']
};
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Metodo non consentito.'})}
  const key=process.env.OPENROUTER_API_KEY;if(!key)return res.status(503).json({error:'AI non configurata: manca OPENROUTER_API_KEY su Vercel.'});
  const text=clean(getBody(req).text,3000);if(!text)return res.status(400).json({error:'Testo mancante.'});
  const system=[
    'You parse Italian free-text food diary entries. You NEVER calculate calories or nutrients.',
    'Return a single food or a recipe as structured ingredients for later database lookup.',
    'Only set grams when mass in grams/kg is explicit or can be converted exactly from an explicit metric mass. Never invent mass from pieces, eggs, cups, spoons, slices, handfuls or volume.',
    'If user says 4 uova, keep quantity_text="4 uova", grams=null and add an error asking for grams unless a gram weight is also stated.',
    'If the user says "200 g di torta fatta con ...", consumed_grams is 200 and ingredient masses describe the whole recipe.',
    'final_recipe_weight_g is only an explicitly stated finished/yield weight. Never infer final cooked weight from ingredient sum.',
    'Mark needs_detail only when the food identity materially changes composition. Generic "farina" needs detail (e.g. 00, integrale); generic "zucchero" means ordinary sucrose and is not ambiguous. Common names such as banana, mela, olio extravergine di oliva are acceptable.',
    'Preparation words (raw, cooked, boiled, fried, dried, drained) belong in preparation and should be retained in name when they materially affect database matching.',
    'Do not be pedantic about harmless wording. Do flag genuinely unresolved identity or missing mass that prevents proportional recipe calculation.',
    'Never infer brand, recipe formulation, cooking loss, edible portion or nutrient values.'
  ].join(' ');
  try{
    const response=await fetch(OPENROUTER_URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(process.env.OPENROUTER_SITE_URL?{'HTTP-Referer':process.env.OPENROUTER_SITE_URL}:{}),'X-Title':process.env.OPENROUTER_APP_NAME||'NutriTrace'},body:JSON.stringify({
      model:process.env.OPENROUTER_MODEL||'openrouter/free',messages:[{role:'system',content:system},{role:'user',content:text}],temperature:0,max_tokens:2200,
      provider:{require_parameters:true},response_format:{type:'json_schema',json_schema:{name:'food_entry_parse',strict:true,schema}}
    })});
    const data=await response.json().catch(()=>({}));if(!response.ok)return res.status(502).json({error:data?.error?.message||`OpenRouter API ${response.status}`});
    let p;try{p=JSON.parse(content(data))}catch{return res.status(502).json({error:'Risposta AI non interpretabile.'})}
    const ingredients=(Array.isArray(p.ingredients)?p.ingredients:[]).slice(0,30).map(x=>({
      raw:clean(x.raw,300),name:clean(x.name,180),grams:pos(x.grams),quantity_text:clean(x.quantity_text,120),preparation:clean(x.preparation,100),
      ambiguity:x.ambiguity==='needs_detail'?'needs_detail':'none',ambiguity_reason:clean(x.ambiguity_reason,240)
    })).filter(x=>x.name);
    const errors=(Array.isArray(p.errors)?p.errors:[]).map(x=>clean(x,300)).filter(Boolean).slice(0,20);
    for(const x of ingredients){
      if(!x.grams && !errors.some(e=>e.toLowerCase().includes(x.name.toLowerCase()))) errors.push(`Peso mancante per “${x.name}”: indica i grammi per un calcolo affidabile.`);
      if(x.ambiguity==='needs_detail' && x.ambiguity_reason && !errors.some(e=>e.toLowerCase().includes(x.name.toLowerCase()))) errors.push(`${x.name}: ${x.ambiguity_reason}`);
    }
    return res.status(200).json({mode:p.mode==='recipe'||ingredients.length>1?'recipe':'single',recipe_name:clean(p.recipe_name,180)||'Voce libera',consumed_grams:pos(p.consumed_grams),final_recipe_weight_g:pos(p.final_recipe_weight_g),ingredients,errors,model:data?.model||process.env.OPENROUTER_MODEL||'openrouter/free'});
  }catch(e){return res.status(502).json({error:`AI non disponibile: ${e.message||'errore di rete'}`})}
};
