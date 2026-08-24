const fs = require("fs");
const path = require("path");

const read = file => fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
const avatar = read("src/components/Avatar.jsx");
const moods = read("src/components/LearningModals.jsx");
const tour = read("src/components/TourOverlay.jsx");
const shop = read("src/components/NyxShop.jsx");
const app = read("src/App.jsx");
const nyx = read("src/components/NyxPrismaOrbital.jsx");
const theme = read("src/theme.css");

const checks = [
  ["os quatro novos pets estão disponíveis", ["Abelha", "Borboleta", "Vagalume", "Cogumelo"].every(x => avatar.includes(`label:\"${x}\"`))],
  ["o check-in oferece onze estados", (moods.match(/id: \"[^\"]+\",\s+emoji:/g) || []).length >= 11],
  ["o tour cobre os principais menus do aluno", ["perfil", "jornada", "conquistas", "ranking", "games", "santuario", "conhecimento", "desafio-livre"].every(x => tour.includes(`data-tour=\"${x}\"`) || tour.includes(`data-tour='${x}'`) || tour.includes(`[data-tour=\"${x}\"]`))],
  ["os alvos novos existem no painel", ["perfil", "jornada", "conquistas", "ranking", "games", "santuario", "conhecimento", "desafio-livre"].every(x => app.includes(`data-tour=\"${x}\"`))],
  ["a loja permite dois acessórios por categoria sem contar a aparência", shop.includes("2 espaços por categoria") && shop.includes("secondKey")],
  ["o limite por categoria também protege compras novas", shop.includes("dois acessórios de ${item.slot}")],
  ["o Nyx renderiza o segundo acessório de cada categoria", ["head2", "face2", "neck2", "hand2", "shield2", "costas2"].every(slot => nyx.includes(slot))],
  ["o relógio não acumula atraso e sincroniza ao voltar para a aba", app.includes("function useAccurateNow") && app.includes('visibilitychange') && app.includes("Date.now() % resolution")],
  ["o Nyx diferencia quatro tipos de interação", ["single", "double", "triple", "hold"].every(kind => nyx.includes(`kind === \"${kind}\"`))],
  ["a interação do Nyx funciona com mouse, toque e teclado", nyx.includes("onPointerDown={handlePointerDown}") && nyx.includes("onKeyDown=") && nyx.includes('role="button"')],
  ["cada novo pet possui animação própria", ["pet-bee-flight", "pet-butterfly-flight", "pet-firefly-glow", "pet-mushroom-bounce"].every(name => theme.includes(name))],
  ["as animações dos pets respeitam movimento reduzido", theme.includes("prefers-reduced-motion: reduce")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} contratos passaram.`);
process.exitCode = failed ? 1 : 0;
