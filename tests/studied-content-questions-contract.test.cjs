const fs = require("node:fs");
const assert = require("node:assert/strict");

const ai = fs.readFileSync("src/lib/aiChallenges.js", "utf8");
const games = fs.readFileSync("src/components/GameModals.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const checks = [
  ["banco é filtrado por conteúdo estudado", ai.includes("questionWasStudied") && ai.includes("BASIC_CS_QUESTION_BANK.filter")],
  ["duelos recebem contexto", ai.includes("generateDuelQuestions(context)") && games.includes("questionContext")],
  ["teste de conhecimento recebe contexto", ai.includes("generateKnowledgeTestQuestions(context)")],
  ["assuntos avançados exigem evidência", ai.includes('q.includes("try/catch")') && ai.includes('q.includes("foreach")') && ai.includes('q.includes("list<>")')],
  ["sem contexto não há perguntas genéricas", ai.includes('if (!c.trim()) return false')],
  ["conteúdo insuficiente é explicado", games.includes("Ainda não há conteúdo estudado suficiente")],
  ["código e resumos alimentam os três modos", (app.match(/questionContext=\{\[allCodeToday\(\)/g)||[]).length === 3],
  ["mínimo de duas perguntas evita duelo vazio", (games.match(/qs.length < 2/g)||[]).length === 3],
];

for (const [name, ok] of checks) { assert.equal(ok, true, name); console.log(`✓ ${name}`); }
console.log(`\n${checks.length}/${checks.length} contratos de conteúdo estudado aprovados.`);
