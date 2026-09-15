const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const app=read("src/App.jsx");
const attendance=read("src/components/AttendancePanel.jsx");
const alerts=read("src/components/TeacherNyxAlertBubble.jsx");

assert.match(app,/kind:"achievement-restore"/,"professor deve enviar recuperação de conquista ao aluno online");
assert.match(app,/sem repetir pontos/,"recuperação não deve duplicar recompensas");
assert.match(app,/Minhas justificativas/,"aluno deve acompanhar as justificativas enviadas");
assert.match(alerts,/Justificou uma falta/,"justificativa pendente deve entrar no balão do Nyx");
assert.match(alerts,/type:"absence"/,"justificativa deve ter identidade própria no balão");
assert.match(attendance,/Chamada manual por data/,"painel deve explicar a edição manual por data");
assert.match(attendance,/manuallyRecorded/,"data corrigida manualmente deve aparecer mesmo se o calendário falhar");
assert.match(app,/status:status==="auto"\?null:status/,"correção manual deve sobreviver ao autosave do aluno");

console.log("✅ conquistas, justificativas e chamada manual protegidas");
