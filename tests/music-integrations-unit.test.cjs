const assert=require('node:assert/strict');
const {build}=require('esbuild');
(async()=>{
  const out=await build({entryPoints:['src/lib/classMusic.js','src/lib/musicSearch.js'],bundle:true,write:false,platform:'node',format:'cjs',outdir:'out'});
  const load=file=>{const mod={exports:{}};new Function('module','exports','require',file.text)(mod,mod.exports,require);return mod.exports};
  const classMusic=load(out.outputFiles.find(file=>file.path.endsWith('classMusic.js')));
  const search=load(out.outputFiles.find(file=>file.path.endsWith('musicSearch.js')));
  const youtube=classMusic.sanitizeTrack({title:'Faixa',url:'https://youtu.be/abc123XYZ_-'});
  assert.equal(youtube.provider,'youtube');assert.equal(youtube.externalId,'abc123XYZ_-');assert.match(search.musicEmbed(youtube).src,/youtube-nocookie\.com/);
  const spotify=classMusic.sanitizeTrack({title:'Faixa',url:'https://open.spotify.com/track/1234567890AbCd'});
  assert.equal(spotify.provider,'spotify');assert.equal(spotify.externalId,'1234567890AbCd');assert.match(search.musicEmbed(spotify).src,/open\.spotify\.com\/embed\/track/);
  assert.equal(search.musicEmbed(classMusic.sanitizeTrack({title:'Áudio',url:'https://audio.example/faixa.mp3'})),null);
  console.log('Links do YouTube, Spotify e áudio direto são normalizados com segurança.');
})();
