const fs = require("fs");

const app = fs.readFileSync("src/App.jsx", "utf8");
const display = fs.readFileSync("src/components/NyxDisplay.jsx", "utf8");
const css = fs.readFileSync("src/redesign.css", "utf8");

const checks = [
  ["o Prisma Orbital é o corpo padrão do Nyx", display.includes("return <NyxPrismaOrbital") && !display.includes("StandardNyx")],
  ["o painel possui abas separadas para Nyx e perfil", app.includes('setCompanionTab("nyx")') && app.includes('setCompanionTab("profile")')],
  ["as abas usam semântica acessível", app.includes('role="tablist"') && app.includes('role="tabpanel"') && app.includes("aria-selected")],
  ["o pet fica somente no painel do perfil", app.indexOf("<PetCompanion", app.indexOf('companionTab === "nyx"')) > app.indexOf('role="tabpanel" aria-label="Meu perfil"')],
  ["as abas têm identidade visual própria", css.includes(".student-companion-tabs") && css.includes(".student-profile-stage")],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} contratos passaram.`);
process.exit(failed ? 1 : 0);
