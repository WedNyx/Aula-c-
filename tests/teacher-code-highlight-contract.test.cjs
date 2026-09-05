const assert = require('node:assert/strict');
const fs = require('node:fs');

const editor = fs.readFileSync('src/components/CodeEditor.jsx', 'utf8');
const mobile = fs.readFileSync('src/components/MobileMonitor.jsx', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');

assert.ok(editor.includes('highlight(String(code||""), [], filename)'), 'CodeBlock deve escolher o realce pela extensão do arquivo');
assert.ok(editor.includes('filename = ""'), 'CodeBlock deve aceitar o nome do arquivo');
assert.ok(mobile.includes('<CodeBlock code={f.code || "(vazio)"} filename={f.name || "Program.cs"} compact wrap />'), 'monitoramento móvel deve usar o realce compartilhado');
assert.ok(app.includes('<CodeBlock code={f.code || "(vazio)"} filename={f.name || "Program.cs"} compact wrap />'), 'monitoramento completo deve usar o realce compartilhado');

console.log('Código observado pelo professor usa o mesmo realce por linguagem do editor.');
