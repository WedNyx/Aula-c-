const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('src/App.jsx', 'utf8');
const tour = fs.readFileSync('src/components/TourOverlay.jsx', 'utf8');

assert.match(tour, /export const GUIDED_TOUR_STEPS/);
for (const target of ['guided-blocks', 'guided-lessons', 'guided-program', 'guided-actions', 'terminal', 'ajuda']) {
  assert.ok(tour.includes(`[data-tour=\\"${target}\\"]`) || tour.includes(`[data-tour="${target}"]`), `tour guiado inclui ${target}`);
  assert.ok(app.includes(`data-tour="${target}"`) || target === 'terminal', `a tela inclui o alvo ${target}`);
}
assert.match(app, /accessMode \? GUIDED_TOUR_STEPS : TOUR_STEPS/);
assert.match(app, /steps=\{studentTourSteps\}/);
assert.match(app, /monta seu programa com blocos/);
assert.match(app, /canSpeak=\{ttsSupported && \(accessMode \|\| ttsAllowed\)\}/);
assert.match(tour, /Ouvir esta orientação/);
assert.match(tour, /Parar leitura desta orientação/);
assert.match(tour, /onStop\?\.\(\); onNext\(\)/);

console.log('Tour do Modo Guiado usa percurso próprio e oferece leitura em voz alta controlável.');
