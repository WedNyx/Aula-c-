const assert=require('node:assert/strict');const fs=require('node:fs');
const app=fs.readFileSync('src/App.jsx','utf8');
assert.doesNotMatch(app,/import \{ QuickStatusModal, TelaoModal/);assert.match(app,/const lazyTeacherModal=name=>lazy/);assert.match(app,/import\("\.\/components\/TeacherModals\.jsx"\)/);assert.match(app,/default:module\[name\]/);assert.match(app,/<Suspense fallback=\{<ModalLoading\/>\}>/);assert.match(app,/aria-live="polite"/);
console.log('Telas especiais do professor são carregadas sob demanda com fallback acessível.');
