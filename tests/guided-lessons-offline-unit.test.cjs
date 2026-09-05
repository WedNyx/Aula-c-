const assert = require('node:assert/strict');
const fs = require('node:fs');
const { build } = require('esbuild');

(async () => {
  const output = await build({ entryPoints:['src/lib/guidedLessons.js'], bundle:true, write:false, platform:'node', format:'cjs' });
  const mod = { exports:{} };
  new Function('module','exports','require',output.outputFiles[0].text)(mod,mod.exports,require);
  const { LOCAL_GUIDED_LESSONS, nextLocalGuidedLesson } = mod.exports;

  const loopLesson = nextLocalGuidedLesson([{ id:'loop' }], []);
  assert.equal(loopLesson.source, 'local');
  assert.ok(loopLesson.relatedBlocks.includes('loop'));
  assert.ok(loopLesson.titulo && loopLesson.codigo && loopLesson.oQueFaz && loopLesson.exemploJogo);

  const received = [];
  for (let i = 0; i < LOCAL_GUIDED_LESSONS.length; i += 1) {
    const lesson = nextLocalGuidedLesson([], received);
    received.push(lesson);
  }
  assert.equal(new Set(received.map(lesson => lesson.localKey)).size, LOCAL_GUIDED_LESSONS.length);

  const app = fs.readFileSync('src/App.jsx', 'utf8');
  assert.match(app, /if \(isOffline\(\)\)/);
  assert.match(app, /nextLocalGuidedLesson\(guidedBlocks, guidedLessons\)/);
  assert.match(app, /disponível sem IA/);

  console.log('Modo Guiado oferece lições relacionadas e sem repetição mesmo sem IA.');
})().catch(error => { console.error(error); process.exitCode=1; });
