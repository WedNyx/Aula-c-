const fs = require('node:fs');
const assert = require('node:assert/strict');

const panel = fs.readFileSync('src/components/AttendancePanel.jsx', 'utf8');
const css = fs.readFileSync('src/components/TeacherControls.css', 'utf8');

assert.ok(panel.includes("status === 'present'\n              ? <button"), 'a ação deve depender do estado atual da presença');
assert.equal((panel.match(/aria-label=\{`Dar presença/g) || []).length, 1, 'deve existir uma única ação contextual para dar presença');
assert.equal((panel.match(/aria-label=\{`Tirar presença/g) || []).length, 1, 'deve existir uma única ação contextual para tirar presença');
assert.ok(panel.includes('aria-busy={busy === `${s.shift}:${s.name}`}'), 'o aluno em salvamento deve ser identificado para tecnologia assistiva');
assert.ok(css.includes('.attendance-status--present') && css.includes('.attendance-status--absent'), 'os estados precisam ser diferenciados sem depender apenas do texto dos botões');

console.log('A chamada apresenta estado e somente a ação relevante para cada aluno.');
