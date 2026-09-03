import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
for (const k of ['SUPABASE_URL','SUPABASE_SERVICE_KEY','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL','DATABASE_PASSWORD','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN']) process.env[k]='';
process.env.KV_REST_API_URL='http://localhost:8953';
process.env.KV_REST_API_TOKEN='fake';
process.env.TEACHER_PASSWORD='fake-teacher';
process.env.FAKE_REDIS_PORT='8953';
const server=spawn(process.execPath,[fileURLToPath(new URL('./fake-redis-server.mjs',import.meta.url))],{env:process.env,stdio:['ignore','pipe','inherit']});
try {
  await once(server.stdout,'data');
  const {default:handler}=await import('../../api/kv.js');
  const key='student:matutino:Ficticio',date='2026-09-03',auth='fake-teacher';
  async function call(body) {
    const res={code:200,status(c){this.code=c;return this;},json(body){this.body=body;return this;}};
    await handler({method:'POST',body,headers:{},socket:{}},res);return res;
  }
  const write=value=>call({action:'set',key,value:JSON.stringify(value)});
  const read=async()=>JSON.parse((await call({action:'get',key,auth})).body.value);
  const set=(status,token=auth,d=date)=>call({action:'set_attendance',key,date:d,status,auth:token});
  await write({name:'Ficticio',cpf:'ficticio',attendance:{[date]:'present'},attendanceFirst:{[date]:Date.parse(date)},attendanceOverrides:{[date]:{status:'absent'}}});
  assert.deepEqual((await read()).attendanceOverrides,{},'Cadastro público não injeta decisão do professor');
  assert.equal((await set('absent','errado')).code,403);
  assert.equal((await set('absent')).body.ok,true);
  const stale={name:'Ficticio',attendance:{[date]:'present'},attendanceOverrides:{}};
  await write(stale);
  assert.equal((await read()).attendance[date],'absent');
  assert.equal((await read()).cpf,'ficticio');
  assert.equal((await set('present')).body.ok,true);
  await write({...stale,attendance:{[date]:'idle'}});
  assert.equal((await read()).attendance[date],'present');
  await Promise.all([write(stale),set('absent'),write(stale)]);
  assert.equal((await read()).attendance[date],'absent');
  assert.equal((await set('auto')).body.ok,true);
  assert.equal((await read()).attendanceOverrides[date],undefined);
  assert.equal((await read()).attendanceFirst[date],Date.parse(date),'Autosave antigo não apaga o primeiro acesso');
  assert.equal((await read()).attendance[date],'present','Automático recupera presença pelo acesso registrado');
  assert.equal((await set('unknown')).code,400);
  assert.equal((await set('present',auth,'2026-02-30')).code,400);
  assert.equal((await call({action:'set_attendance',key:'student:x:inexistente',date,status:'present',auth})).code,404);
  console.log('Chamada: autenticação, correção persistente, concorrência, campos privados e validação aprovados.');
} finally { server.kill(); }
