const assert=require('node:assert/strict');const fs=require('node:fs');
const terminal=fs.readFileSync('src/components/Terminal.jsx','utf8');
assert.match(terminal,/Compilando…/);assert.match(terminal,/Aguardando entrada/);assert.match(terminal,/navigator\.clipboard\.writeText/);assert.match(terminal,/Atalhos do terminal/);assert.match(terminal,/\["Compilar",buildProgram\]/);assert.match(terminal,/e\.ctrlKey && e\.key\.toLowerCase\(\) === "l"/);assert.match(terminal,/mode === "program" && e\.key === "Escape"/);assert.match(terminal,/lineColor\(line\)/);
console.log('Terminal mostra estado, atalhos, cópia e saída com leitura visual melhor.');
