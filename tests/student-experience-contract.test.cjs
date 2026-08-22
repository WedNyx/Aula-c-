const fs = require("fs");

const read = path => fs.readFileSync(path, "utf8");
const avatar = read("src/components/Avatar.jsx");
const moods = read("src/components/LearningModals.jsx");
const tour = read("src/components/TourOverlay.jsx");
const shop = read("src/components/NyxShop.jsx");
const app = read("src/App.jsx");

const checks = [
  ["os quatro novos pets estão disponíveis", ["Abelha", "Borboleta", "Vagalume", "Cogumelo"].every(x => avatar.includes(`label:\"${x}\"`))],
  ["o check-in oferece onze estados", (moods.match(/id: \"[^\"]+\",\s+emoji:/g) || []).length >= 11],
  ["o tour cobre os principais menus do aluno", ["perfil", "jornada", "conquistas", "ranking", "games", "santuario", "conhecimento", "desafio-livre"].every(x => tour.includes(`data-tour=\"${x}\"`) || tour.includes(`data-tour='${x}'`) || tour.includes(`[data-tour=\"${x}\"]`))],
  ["os alvos novos existem no painel", ["perfil", "jornada", "conquistas", "ranking", "games", "santuario", "conhecimento", "desafio-livre"].every(x => app.includes(`data-tour=\"${x}\"`))],
  ["a loja limita dois acessórios sem contar a aparência", shop.includes("MAX_EQUIPPED_ACCESSORIES = 2") && shop.includes('section.slot !== "skin"')],
  ["o limite também protege compras novas", shop.includes("antes de comprar e vestir outro")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} contratos passaram.`);
process.exitCode = failed ? 1 : 0;
