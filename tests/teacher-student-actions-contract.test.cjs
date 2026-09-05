const assert=require('node:assert/strict');const fs=require('node:fs');
const app=fs.readFileSync('src/App.jsx','utf8'),css=fs.readFileSync('src/redesign.css','utf8');
assert.match(app,/const \[studentMenuOpen,setStudentMenuOpen\]/);assert.match(app,/aria-expanded=\{studentMenuOpen===studentKey\(s\)\}/);assert.match(app,/role="menu"/);assert.match(app,/⚙️ Ver detalhes/);assert.match(app,/👀 Chamar atenção/);assert.match(app,/📖 Enviar resumo de hoje/);assert.match(app,/✅ Marcar presença hoje/);assert.match(app,/✕ Tirar presença de hoje/);assert.match(css,/\.teacher-student-actions/);
console.log('Menu de três pontos reúne ações rápidas e mantém gestão delicada nos detalhes.');
