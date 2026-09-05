const assert=require('node:assert/strict');const fs=require('node:fs');
const app=fs.readFileSync('src/App.jsx','utf8'),panel=fs.readFileSync('src/components/ClassMusicSettings.jsx','utf8'),tour=fs.readFileSync('src/components/TourOverlay.jsx','utf8');
assert.match(app,/label:"Música da turma"/);assert.match(app,/tab==="music" && <ClassMusicSettings/);assert.match(app,/const nm=\{\.\.\.previous,musicSettings\};const ok=await saveTeacherMeta/);
assert.match(panel,/Liberar música nesta turma/);assert.match(panel,/Permitir que alunos sugiram faixas/);assert.match(panel,/painel dos alunos/);assert.match(panel,/painel do professor/);assert.match(panel,/addTrack\(allSettings,turmaId/);assert.match(panel,/removeTrack\(allSettings,turmaId/);assert.match(tour,/tab:"music"/);
console.log('Professor controla permissão, local do player e playlist musical por turma.');
