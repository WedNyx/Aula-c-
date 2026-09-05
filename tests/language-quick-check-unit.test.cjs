const assert = require('node:assert/strict');
const { build } = require('esbuild');

(async () => {
  const output = await build({ entryPoints:['src/lib/languages.ts'], bundle:true, write:false, platform:'node', format:'cjs' });
  const mod = { exports:{} };
  new Function('module','exports','require',output.outputFiles[0].text)(mod,mod.exports,require);
  const { quickCheckLanguage } = mod.exports;

  assert.equal(quickCheckLanguage('<main><h1>Olá</h1></main>', 'html'), null);
  assert.match(quickCheckLanguage('<main><h1>Olá</main>', 'html').message, /fora de ordem/);
  assert.match(quickCheckLanguage('<p class="aviso>Oi</p>', 'html').message, /aspa/);
  assert.equal(quickCheckLanguage('body { color: red; }', 'css'), null);
  assert.match(quickCheckLanguage('body {\n color red;\n}', 'css').message, /dois-pontos/);
  assert.equal(quickCheckLanguage('console.log("Oi");', 'js'), null);
  assert.match(quickCheckLanguage('Console.log("Oi");', 'js').message, /minúscula/);
  assert.equal(quickCheckLanguage('<?php\necho "Oi";\n?>', 'php'), null);
  assert.match(quickCheckLanguage('echo "Oi";', 'php').message, /abertura do PHP/);
  assert.match(quickCheckLanguage('<?php\necho "Oi"\n?>', 'php').message, /ponto e vírgula/);

  console.log('Detector local respeita HTML, CSS, JavaScript e PHP sem aplicar regras de C# por engano.');
})().catch(error => { console.error(error); process.exitCode=1; });
