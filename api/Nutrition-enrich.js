'use strict';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MACRO_KEYS = ['kcal','protein','carbs','sugar','fat','saturatedFat','fiber','salt'];
const HARD_BLOCKED = new Set([
  'chloride','iodine','molybdenum','chromium','nickel','fluoride','sulfur',
  'alpha_linolenic_acid','linoleic_acid','arachidonic_acid','omega3_total','omega6_total','epa','dpa','dha',
  'leucine','isoleucine','valine','lysine','methionine','threonine','tryptophan','histidine','phenylalanine',
  'biotin_b7','vitamin_a_rae'
]);

// Conservative sanity ceilings per 100 g edible food. They are guardrails, not reference values.
const CAPS = {
  thiamin_b1: 50, riboflavin_b2: 50, niacin_b3: 200, pantothenic_acid_b5: 50, vitamin_b6: 50,
  folate_total_b9: 5000, vitamin_b12: 1000, vitamin_c: 5000, vitamin_d: 1000,
  alpha_tocopherol: 1000, vitamin_k: 5000, choline: 3000,
  calcium: 5000, phosphorus: 5000, magnesium: 2000, sodium: 50000, potassium: 10000,
  iron: 200, zinc: 100, copper: 20, manganese: 100, selenium: 5000
};

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}
function clean(v, max=300) { return String(v ?? '').trim().slice(0,max); }
function finiteOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v); return Number.isFinite(n) ? n : null;
}
function jsonResponse(res,status,obj){ res.status(status).json(obj); }
function getContent(data){
  const c=data?.choices?.[0]?.message?.content;
  if(typeof c==='string') return c;
  if(Array.isArray(c)) return c.map(x=>x?.text||'').join('');
  return '';
}
function schemaFor(requestedIds){
  const enumIds=requestedIds.length?requestedIds:['__none__'];
  return {
    type:'object', additionalProperties:false,
    properties:{
      label:{
        type:'object', additionalProperties:false,
        properties:Object.fromEntries(MACRO_KEYS.map(k=>[k,{type:['number','null']}])),
        required:MACRO_KEYS
      },
      nutrients:{
        type:'array',
        items:{
          type:'object', additionalProperties:false,
          properties:{
            id:{type:'string',enum:enumIds},
            status:{type:'string',enum:['estimated','not_available']},
            value:{type:['number','null']},
            confidence:{type:'string',enum:['medium','low']},
            note:{type:'string'}
          },
          required:['id','status','value','confidence','note']
        }
      },
      note:{type:'string'}
    },
    required:['label','nutrients','note']
  };
}
function sanitizeLabel(label,known){
  const out={};
  for(const k of MACRO_KEYS){
    if(known[k]!==null){ out[k]=null; continue; }
    const v=finiteOrNull(label?.[k]);
    let ok=v!==null && v>=0;
    if(k==='kcal') ok=ok&&v<=1000;
    else ok=ok&&v<=100;
    out[k]=ok?v:null;
  }
  const carbs=known.carbs ?? out.carbs;
  if(out.sugar!==null && carbs!==null && out.sugar>carbs) out.sugar=null;
  const fat=known.fat ?? out.fat;
  if(out.saturatedFat!==null && fat!==null && out.saturatedFat>fat) out.saturatedFat=null;
  return out;
}

module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST'){ res.setHeader('Allow','POST'); return jsonResponse(res,405,{error:'Metodo non consentito.'}); }
  const apiKey=process.env.OPENROUTER_API_KEY;
  if(!apiKey) return jsonResponse(res,503,{error:'AI non configurata: manca OPENROUTER_API_KEY su Vercel.'});

  const body=getBody(req), food=body.food||{}, name=clean(food.name,180);
  if(!name) return jsonResponse(res,400,{error:'Nome alimento mancante.'});
  const basis=Number(food.servingGrams)>0?Number(food.servingGrams):100;
  const known={}; for(const k of MACRO_KEYS) known[k]=finiteOrNull(food.label?.[k]);

  const reqItems=Array.isArray(body.requested)?body.requested:[];
  const requested=[]; const blocked=[];
  for(const x of reqItems.slice(0,12)){
    const id=clean(x?.id,80), unit=clean(x?.unit,12), display=clean(x?.name,120);
    if(!id||!unit) continue;
    const item={id,unit,name:display,advanced:Boolean(x?.advanced)};
    if(HARD_BLOCKED.has(id)||item.advanced) blocked.push(item); else requested.push(item);
  }
  const requestedIds=[...new Set(requested.map(x=>x.id))];

  const existing=Array.isArray(food.nutrients)?food.nutrients.slice(0,120).map(n=>({
    id:clean(n.canonicalId||'',80), name:clean(n.name,100), amount:finiteOrNull(n.amount), unit:clean(n.unit,12), source:clean(n.source,100)
  })).filter(x=>x.amount!==null):[];

  const prompt={
    food:{name,brand:clean(food.brand,120),reference_basis_g:basis,known_label:known,known_nutrients:existing},
    requested_missing_nutrients:requested.map(x=>({id:x.id,name:x.name,required_unit:x.unit})),
    blocked_nutrients:blocked.map(x=>({id:x.id,name:x.name,reason:'numeric AI estimation disabled by NutriTrace quality policy'}))
  };
  const system=[
    'You are a conservative food-composition gap estimator used only after structured food databases fail.',
    'Never invent precision. Never convert IU, percentages, nutrient equivalents, or concentrations by guessing.',
    'All numeric output is for exactly reference_basis_g grams of edible food in the user input.',
    'Never overwrite a known label value or known nutrient.',
    'For each requested nutrient use exactly the required_unit stated in the input; do not output a unit yourself.',
    'If you do not have a defensible general food-composition benchmark for the exact food/preparation, return not_available and null.',
    'Never use numeric zero to mean unknown, missing, below detection, not reported, or probably absent.',
    'A numeric estimate must have at least medium confidence based on broadly established composition; otherwise return not_available.',
    'Do not infer an amino-acid profile by applying generic percentages to protein.',
    'Do not infer trace minerals or fatty-acid subfractions from generic food categories.',
    'For label fields, return null if known or if not reasonably defensible. Sugar must never exceed carbohydrate and saturated fat must never exceed total fat.',
    'The application will mark every accepted number as an AI estimate, not analytical data.'
  ].join(' ');

  try{
    const response=await fetch(OPENROUTER_URL,{
      method:'POST',
      headers:{
        Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json',
        ...(process.env.OPENROUTER_SITE_URL?{'HTTP-Referer':process.env.OPENROUTER_SITE_URL}:{}),
        'X-Title':process.env.OPENROUTER_APP_NAME||'NutriTrace'
      },
      body:JSON.stringify({
        model:process.env.OPENROUTER_MODEL||'openrouter/free',
        messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(prompt)}],
        temperature:0,
        max_tokens:2600,
        provider:{require_parameters:true},
        response_format:{type:'json_schema',json_schema:{name:'nutrition_estimate',strict:true,schema:schemaFor(requestedIds)}}
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok) return jsonResponse(res,502,{error:data?.error?.message||`OpenRouter API ${response.status}`});
    let parsed; try{ parsed=JSON.parse(getContent(data)); }catch{ return jsonResponse(res,502,{error:'Risposta AI non interpretabile come JSON strutturato.'}); }

    const allowed=new Map(requested.map(x=>[x.id,x]));
    const out=[];
    for(const n of Array.isArray(parsed.nutrients)?parsed.nutrients:[]){
      const spec=allowed.get(n?.id); if(!spec) continue;
      const value=finiteOrNull(n.value), cap=CAPS[n.id] ?? Infinity;
      // Low-confidence and zero estimates are intentionally discarded. Zero must come from a structured source, not inference.
      const accepted=n.status==='estimated' && n.confidence==='medium' && value!==null && value>0 && value<=cap;
      out.push({id:n.id,status:accepted?'estimated':'not_available',value:accepted?value:null,confidence:accepted?'medium':'low',note:accepted?clean(n.note,260):'N/D: stima numerica AI non sufficientemente affidabile secondo i guardrail NutriTrace.'});
    }
    for(const x of requested) if(!out.some(n=>n.id===x.id)) out.push({id:x.id,status:'not_available',value:null,confidence:'low',note:'N/D: il modello non ha fornito una stima sufficientemente supportata.'});
    for(const x of blocked) out.push({id:x.id,status:'not_available',value:null,confidence:'low',note:'N/D: stima AI disabilitata per questo nutriente ad alta variabilità/rischio.'});

    const safeLabel=sanitizeLabel(parsed.label||{},known);
    return jsonResponse(res,200,{label:safeLabel,nutrients:out,note:`AI fallback controllato via OpenRouter (${data?.model||process.env.OPENROUTER_MODEL||'openrouter/free'}). Valori N/D non sono zero.`});
  }catch(e){ return jsonResponse(res,502,{error:`AI non disponibile: ${e.message||'errore di rete'}`}); }
};
