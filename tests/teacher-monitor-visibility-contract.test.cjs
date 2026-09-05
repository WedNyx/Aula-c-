const fs = require('node:fs');
const assert = require('node:assert/strict');

const app = fs.readFileSync('src/App.jsx', 'utf8');

assert.ok(app.includes('const [monitorCollapsed, setMonitorCollapsed] = useState(false);'), 'cards devem começar visíveis');
assert.ok(app.includes('aria-expanded={!monitorCollapsed}'), 'controle de recolher deve comunicar seu estado');
assert.ok(app.includes('aria-controls="teacher-student-grid"'), 'controle deve apontar para a grade');
assert.ok(app.includes('id="teacher-student-grid" className="teacher-student-grid"'), 'grade deve possuir alvo acessível');
assert.ok(app.includes('shown.length > 0 && !monitorCollapsed'), 'grade deve depender somente da escolha explícita do professor');
assert.ok(!app.includes('onMouseEnter:()=>setMonitorHover'), 'visualização não deve depender de passar o mouse');
assert.ok(!app.includes('Passe o mouse aqui pra ver'), 'instrução exclusiva de mouse deve ser removida');

console.log('Cards do monitoramento ficam visíveis e podem ser recolhidos com controle acessível.');
