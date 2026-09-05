const assert = require('node:assert/strict');
const { build } = require('esbuild');

(async () => {
  const output = await build({ entryPoints:['src/lib/utils.js'], bundle:true, write:false, platform:'node', format:'cjs' });
  const mod = { exports:{} };
  new Function('module','exports','require',output.outputFiles[0].text)(mod,mod.exports,require);
  const { quickCheck } = mod.exports;

  assert.equal(quickCheck('Console.WriteLine("Oi");'), null);
  assert.match(quickCheck('Console.WriteLine("Oi")').message, /Linha 1.*ponto e vírgula/);
  assert.equal(quickCheck('Console.WriteLine("Oi")').missing[0], ';');
  assert.match(quickCheck('console.writeline("Oi");').message, /Console.*diferente/);
  assert.equal(quickCheck('console.writeline("Oi");').example, 'Console.WriteLine("Oi");');
  assert.match(quickCheck('if (true] { }').message, /fora de ordem/);
  assert.equal(quickCheck('if (true] { }').line, 1);
  assert.match(quickCheck('int idade = 10').example, /;$/);
  assert.equal(quickCheck('// Console.WriteLine("sem ponto")'), null);

  console.log('Detector local explica linha, correção e exemplo sem depender de IA.');
})().catch(error => { console.error(error); process.exitCode=1; });
