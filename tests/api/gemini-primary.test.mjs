import assert from 'node:assert/strict';

for (const key of ['KV_REST_API_URL','KV_REST_API_TOKEN','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL','DATABASE_PASSWORD']) process.env[key]='';
process.env.GEMINI_API_KEY='fake-gemini';
process.env.GEMINI_MODEL='gemini-test';
process.env.NVIDIA_API_KEY='fake-nvidia';
process.env.NVIDIA_MODEL='nvidia-test';
process.env.ANTHROPIC_API_KEY='';

const originalFetch=globalThis.fetch;
let calls=[],failGemini=false;
globalThis.fetch=async (url,options)=>{
  const provider=url.includes('generativelanguage.googleapis.com')?'gemini':url.includes('nvidia.com')?'nvidia':null;
  assert.ok(provider,`Chamada inesperada: ${url}`);calls.push(provider);
  if(provider==='gemini'){
    assert.equal(options.headers['x-goog-api-key'],'fake-gemini');
    assert.match(url,/gemini-test:generateContent$/);
    if(failGemini)return{ok:false,status:503,json:async()=>({error:{message:'indisponível'}})};
    return{ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:'Resposta Gemini'}]}}]})};
  }
  return{ok:true,status:200,json:async()=>({choices:[{message:{content:'Resposta reserva'}}]})};
};
function response(){return{code:200,status(code){this.code=code;return this},json(body){this.body=body;return this}}}
async function request(handler,method='POST'){calls=[];const res=response();await handler({method,body:{prompt:'Teste'},headers:{},socket:{}},res);return res}

try{
  const{default:handler}=await import('../../api/claude.js?gemini-primary');
  const status=await request(handler,'GET');
  assert.equal(status.body.provider,'gemini');assert.equal(status.body.hasGemini,true);
  assert.equal((await request(handler)).body.content[0].text,'Resposta Gemini');assert.deepEqual(calls,['gemini']);
  failGemini=true;
  assert.equal((await request(handler)).body.content[0].text,'Resposta reserva');assert.deepEqual(calls,['gemini','nvidia']);
  console.log('Gemini principal e fallback para Nemotron: aprovados.');
}finally{globalThis.fetch=originalFetch}
