const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const { shiftPracticePhrase } = await import('../src/lib/keyboardPractice.js');
  const src = fs.readFileSync('src/KeyboardTutorial.jsx', 'utf8');
  const targets = src.match(/targets: "([A-Z]+)"\.split\(""\)\.map\(char => \(\{ char, shift:true \}\)\)/)[1];
  for (const key of targets) {
    const phrase = shiftPracticePhrase(key);
    assert.ok(phrase.startsWith(key), `${key}: a frase começa pela tecla estudada`);
    assert.ok(phrase.length <= 18, `${key}: frase curta`);
    assert.match(phrase, /^[A-Z][a-z ]+$/, `${key}: sem símbolos ou outras maiúsculas fora do alvo`);
    assert.equal(shiftPracticePhrase(key.toLowerCase()), phrase);
    assert.equal(shiftPracticePhrase(key), phrase, 'Escolha determinística');
  }
  assert.equal(shiftPracticePhrase(''), '');
  assert.equal(shiftPracticePhrase('Backspace'), '');
  assert.match(src, /shiftPracticePhrase\(target.char\)/);
  assert.match(src, /Use Shift \+ \{phraseState.key\}/);
  console.log(`${targets.length} teclas com frases curtas e correspondentes: aprovadas.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
