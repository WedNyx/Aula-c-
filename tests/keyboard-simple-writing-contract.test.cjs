const fs = require("node:fs");
const assert = require("node:assert/strict");

const src = fs.readFileSync("src/KeyboardTutorial.jsx", "utf8");
const checks = [
  ["prática extra somente no nível Shift", src.includes("accessMode || level.id !== 3")],
  ["frase de Shift vinculada à tecla atual", src.includes('shiftPracticePhrase(target.char)')],
  ["prática final simples", src.includes('line: "Oi, Nyx! Eu gosto de C#."')],
  ["instrução do Shift simplificada", src.includes("pratique o Shift com esta frase curta")],
  ["instrução final simplificada", src.includes("Digite esta frase curta para revisar")],
  ["frases difíceis antigas removidas", !src.includes('Console.WriteLine("Oi, mundo!")')],
];

for (const [name, ok] of checks) { assert.equal(ok, true, name); console.log(`✓ ${name}`); }
console.log(`\n${checks.length}/${checks.length} contratos do tutorial simplificado aprovados.`);
