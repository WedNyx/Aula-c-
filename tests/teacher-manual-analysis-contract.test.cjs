const fs = require("node:fs");
const assert = require("node:assert/strict");

const src = fs.readFileSync("src/components/CodeLab.jsx", "utf8");
const checks = [
  ["botão manual existe", src.includes('"✨ Analisar código"')],
  ["botão chama analyzeCode", src.includes("onClick={analyzeCode}")],
  ["botão bloqueia código curto", src.includes("activeCode.trim().length < 12")],
  ["análise automática de cinco segundos removida", !src.includes("analisa sozinho 5s") && !src.includes("setTimeout(() => { analyzeCode(); }, 5000)")],
  ["texto explica análise sob demanda", src.includes("Peça ao Nyx quando quiser")],
];

for (const [name, ok] of checks) { assert.equal(ok, true, name); console.log(`✓ ${name}`); }
console.log(`\n${checks.length}/${checks.length} contratos da análise manual do professor aprovados.`);
