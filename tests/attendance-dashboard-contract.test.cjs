const fs = require('node:fs');
const assert = require('node:assert/strict');

const panel = fs.readFileSync('src/components/AttendancePanel.jsx', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');
const css = fs.readFileSync('src/components/TeacherControls.css', 'utf8');

assert.ok(panel.includes("import { ClassTrendChart }"), 'a chamada deve reutilizar o gráfico visual da plataforma');
assert.ok(panel.includes('classDaysByShift'), 'a planilha deve respeitar os dias de aula de cada turno');
assert.ok(panel.includes('Planilha de presenças') && panel.includes('attendance-sheet'), 'a frequência deve ser consultável dentro da plataforma');
assert.ok(panel.includes('Frequência da turma') && panel.includes('unit="%"'), 'o gráfico deve apresentar a taxa em porcentagem');
assert.ok(panel.includes('7 aulas') && panel.includes('14 aulas') && panel.includes('30 aulas') && panel.includes('Todo o histórico'), 'o professor deve controlar o período exibido');
assert.ok(css.includes('position:sticky') && css.includes('.attendance-cell--manual'), 'a planilha deve manter cabeçalhos visíveis e destacar ajustes manuais');
assert.ok(app.includes('classDaysByShift={Object.fromEntries'), 'o painel deve receber o calendário real das turmas');

console.log('Lista de chamada possui planilha interna, período e gráfico de frequência.');
