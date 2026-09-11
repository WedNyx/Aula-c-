import assert from 'node:assert/strict';

for (const key of ['KV_REST_API_URL','KV_REST_API_TOKEN','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL','DATABASE_PASSWORD']) process.env[key]='';
process.env.TEACHER_PASSWORD='senha-ficticia';
process.env.YOUTUBE_API_KEY='youtube-fake';
process.env.SPOTIFY_CLIENT_ID='spotify-id-fake';
process.env.SPOTIFY_CLIENT_SECRET='spotify-secret-fake';

const originalFetch=globalThis.fetch;
const calls=[];
globalThis.fetch=async (url,options={})=>{
  calls.push({url:String(url),options});
  if(String(url).includes('youtube/v3/search'))return{ok:true,status:200,json:async()=>({items:[{id:{videoId:'abc123XYZ_-'},snippet:{title:'Música &amp; teste',channelTitle:'Canal'}}]})};
  if(String(url).includes('accounts.spotify.com'))return{ok:true,status:200,json:async()=>({access_token:'token-fake'})};
  if(String(url).includes('api.spotify.com/v1/search'))return{ok:true,status:200,json:async()=>({tracks:{items:[
    {id:'1234567890AbCd',name:'Faixa limpa',explicit:false,artists:[{name:'Artista'}],external_urls:{spotify:'https://open.spotify.com/track/1234567890AbCd'}},
    {id:'explicit12345',name:'Faixa explícita',explicit:true,artists:[{name:'Artista'}],external_urls:{spotify:'https://open.spotify.com/track/explicit12345'}},
  ]}})};
  throw new Error(`Chamada inesperada: ${url}`);
};
function response(){return{code:200,status(code){this.code=code;return this},json(body){this.body=body;return this}}}
async function request(handler,body){const res=response();await handler({method:'POST',body,headers:{'x-forwarded-for':'127.0.0.1'},socket:{}},res);return res}

try{
  const{default:handler}=await import('../../api/music-search.js?search');
  assert.equal((await request(handler,{provider:'youtube',query:'teste',auth:'errada'})).code,403);
  const youtube=await request(handler,{provider:'youtube',query:'teste',auth:'senha-ficticia'});
  assert.equal(youtube.body.tracks[0].provider,'youtube');
  assert.match(calls.at(-1).url,/safeSearch=strict/);assert.match(calls.at(-1).url,/videoCategoryId=10/);
  const spotify=await request(handler,{provider:'spotify',query:'teste',auth:'senha-ficticia'});
  assert.equal(spotify.body.tracks.length,1);assert.equal(spotify.body.tracks[0].title,'Faixa limpa');
  assert.doesNotMatch(JSON.stringify(youtube.body)+JSON.stringify(spotify.body),/fake|secret/i);
  console.log('Pesquisa musical exige professor, filtra conteúdo explícito e não expõe credenciais.');
}finally{globalThis.fetch=originalFetch}
