const assert=require('node:assert/strict');
const {build}=require('esbuild');
(async()=>{
  const output=await build({entryPoints:['src/lib/materialDelivery.js'],bundle:true,write:false,platform:'node',format:'cjs'});
  const mod={exports:{}};new Function('module','exports','require',output.outputFiles[0].text)(mod,mod.exports,require);
  const {materialSelectionDefaults,selectMaterialParts,materialSelectionSummary}=mod.exports;
  const original={intro:'Introdução',secoes:[{titulo:'A'},{titulo:'B'}],dica:'Dica',atividade:[{q:'Q1',opts:['a','b']},{q:'Q2',opts:['c','d']}]};
  const defaults=materialSelectionDefaults(original);
  assert.deepEqual(defaults.sections,[0,1]);assert.deepEqual(defaults.questions,[0,1]);
  const partial=selectMaterialParts(original,{intro:false,tip:true,sections:[1],questions:[0]});
  assert.equal(partial.intro,'');assert.deepEqual(partial.secoes,[{titulo:'B'}]);assert.equal(partial.atividade[0].q,'Q1');
  partial.secoes[0].titulo='Mudou';partial.atividade[0].opts[0]='x';
  assert.equal(original.secoes[1].titulo,'B');assert.equal(original.atividade[0].opts[0],'a');
  assert.equal(selectMaterialParts(original,{intro:false,tip:false,sections:[],questions:[]}),null);
  assert.equal(materialSelectionSummary(original,{intro:false,tip:true,sections:[1],questions:[0]}),'1 seção, 1 questão, dica final');
  console.log('Seleção cria uma cópia parcial do material sem alterar o original do professor.');
})().catch(error=>{console.error(error);process.exitCode=1;});
