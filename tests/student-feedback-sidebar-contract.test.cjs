const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('src/App.jsx', 'utf8');
const tour = fs.readFileSync('src/components/TourOverlay.jsx', 'utf8');

assert.match(app, /label:"Feedback da aula"/);
assert.match(app, /tour:"feedback-aula"/);
assert.match(app, /badge:classSent \? "✓" : null/);
assert.match(app, /role="dialog" aria-modal="true" aria-labelledby="class-feedback-title"/);
assert.match(app, /await persist\(\{ classFeedback:cf \}\);\s*setClassFb\(cf\);\s*setClassSent\(true\)/);
assert.match(app, /Seu texto continua aqui/);
assert.match(app, /maxLength=\{500\}/);
assert.match(tour, /\[data-tour="feedback-aula"\]/);

console.log('Feedback da aula está na navegação lateral e só confirma envio após salvar.');
