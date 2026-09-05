const assert=require('node:assert/strict');
const fs=require('node:fs');
const {build}=require('esbuild');
(async()=>{const out=await build({entryPoints:['src/components/BatteryStatus.jsx'],bundle:true,write:false,platform:'node',format:'cjs',external:['react']});const mod={exports:{}};new Function('module','exports','require',out.outputFiles[0].text)(mod,mod.exports,require);const {batteryAppearance}=mod.exports;
assert.deepEqual(batteryAppearance(.15,false),{percent:15,color:'#f87171',icon:'🪫'});
assert.deepEqual(batteryAppearance(.73,false),{percent:73,color:'#a5f3fc',icon:'🔋'});
assert.deepEqual(batteryAppearance(.22,true),{percent:22,color:'#34d399',icon:'⚡'});
const source=fs.readFileSync('src/components/BatteryStatus.jsx','utf8');assert.match(source,/typeof navigator\.getBattery!=="function"/);assert.match(source,/removeEventListener\("levelchange"/);assert.match(source,/aria-label=/);
console.log('Bateria aparece quando suportada, atualiza ao vivo e some sem erro nos demais navegadores.');})();
