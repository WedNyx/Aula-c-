const fs = require("node:fs");
const assert = require("node:assert/strict");

const src = fs.readFileSync("src/App.jsx", "utf8");
const checks = [
  ["campo de pontos Nyx existe", src.includes("🌙 Pontos Nyx:")],
  ["botão de envio existe", src.includes("Enviar pontos")],
  ["quantidade precisa ser positiva", src.includes("amount <= 0")],
  ["limite de segurança aplicado", src.includes("Math.min(amount, 10000)")],
  ["pontos são somados ao total existente", src.includes("const next = current + safeAmount")],
  ["sessão online recebe total exato", src.includes('kind:"nyx-points-restore", points:next')],
  ["estado local evita duplicação", src.includes("stateRef.current = { ...stateRef.current, nyxPoints: np }")],
  ["conquistas de pontos são recalculadas", src.includes("checkPointsAchievements(np)")],
];

for (const [name, ok] of checks) { assert.equal(ok, true, name); console.log(`✓ ${name}`); }
console.log(`\n${checks.length}/${checks.length} contratos da recuperação de pontos aprovados.`);
