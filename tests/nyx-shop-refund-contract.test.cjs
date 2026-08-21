const fs = require("node:fs");
const assert = require("node:assert/strict");

const shop = fs.readFileSync("src/components/NyxShop.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const checks = [
  ["loja oferece pedir reembolso", shop.includes("↩️ Pedir reembolso")],
  ["reembolso exige confirmação", shop.includes("Devolver") && shop.includes("Confirmar")],
  ["turma de teste não reembolsa", shop.includes("!isTestShift")],
  ["item secreto ou gratuito não reembolsa", shop.includes("!preview.secret") && shop.includes("preview.cost > 0")],
  ["valor integral volta à carteira", app.includes("spent - item.cost")],
  ["item sai do inventário", app.includes("owned.filter(id => id !== item.id)")],
  ["item reembolsado é desequipado", app.includes("currentGear[item.slot] = null")],
  ["mudança é persistida no perfil", app.includes("nyxSpent:newSpent, nyxOwned:newOwned, nyxGear:currentGear")],
];

for (const [name, ok] of checks) { assert.equal(ok, true, name); console.log(`✓ ${name}`); }
console.log(`\n${checks.length}/${checks.length} contratos de reembolso aprovados.`);
