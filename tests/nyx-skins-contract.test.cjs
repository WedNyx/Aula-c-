const fs = require("node:fs");
const assert = require("node:assert/strict");

const robot = fs.readFileSync("src/components/NyxRobot.jsx", "utf8");
const prisma = fs.readFileSync("src/components/NyxPrismaOrbital.jsx", "utf8");
const shop = fs.readFileSync("src/components/NyxShop.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const display = fs.readFileSync("src/components/NyxDisplay.jsx", "utf8");

const checks = [
  ["sete skins compráveis, incluindo Prisma Orbital", (robot.match(/slot:"skin"/g) || []).length === 7 && robot.includes('id:"skinPrismaOrbital"')],
  ["slot de skin preservado no equipamento", robot.includes("skin:null")],
  ["seção de aparências na loja", shop.includes('label: "🌙 Aparências"')],
  ["miniatura real do Nyx na loja", shop.includes('skin:item.id')],
  ["Prisma Orbital padrão preserva os equipamentos sem troca por data", display.includes('return <NyxPrismaOrbital') && display.includes('gear={gear}') && !prisma.includes("2026-09-01T00:00:00-03:00")],
  ["Nyx Lunar disponível", prisma.includes("skinLunar")],
  ["Nyx Eclipse disponível", prisma.includes("skinEclipse")],
  ["todas as skins cosméticas disponíveis", ["skinOrbita","skinGuardiao","skinAurora","skinLuaNova","skinMare","skinConstelacao"].every(id => prisma.includes(id))],
  ["Eclipse tem prioridade automática", app.includes('aiDown ? "skinEclipse"')],
  ["Lunar aparece para novidade não vista", app.includes('hasNyxNews ? "skinLunar"')],
  ["novidade salva no perfil", app.includes("nyxNewsSeen: NYX_NEWS_VERSION")],
  ["botão de novidades disponível", app.includes("Ver o que tem de novo")],
];

for (const [name, ok] of checks) { assert.equal(ok, true, name); console.log(`✓ ${name}`); }
console.log(`\n${checks.length}/${checks.length} contratos das skins do Nyx aprovados.`);
