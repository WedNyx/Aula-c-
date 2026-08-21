const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const game = fs.readFileSync(path.join(root, "src/components/NyxEclipseGame.jsx"), "utf8");
const app = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src/theme.css"), "utf8");

const checks = [
  ["o jogo aparece no menu Games", app.includes("Nyx: Ecos do Eclipse") && app.includes("setShowNyxEclipseGame(true)")],
  ["o modal do jogo pode ser fechado", app.includes("<NyxEclipseGame onClose=")],
  ["há controles de teclado para mover, pular, atacar e esquivar", ["KeyA", "Space", "KeyJ", "KeyK"].every(k => game.includes(`\"${k}\"`))],
  ["há controles próprios para telas de toque", game.includes("nyx-eclipse-touch") && game.includes("onPointerDown")],
  ["o progresso é salvo localmente", game.includes("nyx_ecos_eclipse_progress_v1") && game.includes("localStorage.setItem")],
  ["a demonstração inclui altar, inimigos e Guardião Astral", ["Altar Lunar", "enemies:", "GUARDIÃO ASTRAL"].every(t => game.includes(t))],
  ["os fragmentos lunares possuem estado persistente", game.includes("collected: [...game.collected]") && game.includes("Fragmento lunar encontrado")],
  ["o layout adapta os controles ao celular", css.includes("(pointer:coarse)") && css.includes(".nyx-eclipse-touch{display:flex}")],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`✓ ${name}`);
  else { console.error(`✗ ${name}`); failed++; }
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} contratos do jogo passaram.`);
