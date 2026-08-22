const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");
const sanctuary = fs.readFileSync(path.join(root, "src/components/LunarSanctuary.jsx"), "utf8");
const editor = fs.readFileSync(path.join(root, "src/components/CodeEditor.jsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src/theme.css"), "utf8");

const checks = [
  ["o Santuário Lunar aparece na área do aluno", app.includes("setShowLunarSanctuary(true)") && app.includes("<LunarSanctuary")],
  ["o jogo antigo saiu do menu Games", !app.includes("setShowNyxEclipseGame(true)")],
  ["as três áreas estão disponíveis", ["Meu Santuário", "Sala de Desafios", "Jornada da Turma"].every(text => sanctuary.includes(text))],
  ["há três desafios sem código", ["Sequência Lunar", "Estrela Intrusa", "Pares do Eclipse"].every(text => sanctuary.includes(text))],
  ["a recompensa diária é separada por aluno e desafio", sanctuary.includes("nyx_lunar_challenge_") && sanctuary.includes("studentName") && sanctuary.includes("id}`")],
  ["a jornada usa os pontos reais da turma", sanctuary.includes("listStudents") && sanctuary.includes("classPoints") && sanctuary.includes("student.nyxPoints")],
  ["o Santuário segue a identidade visual da plataforma", css.includes(".lunar-overlay") && css.includes("#c084fc") && css.includes("#171026")],
  ["o editor possui modo ampliado", editor.includes("data-expanded") && editor.includes("Ampliar editor de código")],
  ["o editor ampliado fecha com Esc", editor.includes('event.key === "Escape"') && editor.includes("setIsExpanded(false)")],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed += 1;
}
console.log(`\n${checks.length - failed}/${checks.length} contratos passaram.`);
if (failed) process.exit(1);
