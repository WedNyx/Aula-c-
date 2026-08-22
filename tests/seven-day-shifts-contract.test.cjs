const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");
const shifts = fs.readFileSync(path.join(root, "src/lib/shifts.ts"), "utf8");
const login = fs.readFileSync(path.join(root, "src/components/LoginScreen.jsx"), "utf8");

const checks = [
  ["Teste e Linguagens são turmas de sete dias", shifts.includes("id === TEST_SHIFT.id || id === LANG_SHIFT.id")],
  ["a trava do aluno respeita a exceção", app.includes("myAllowWeekend || isSevenDayShift(shift)")],
  ["a verificação inicial respeita a exceção", app.includes("!!meta.allowWeekend || isSevenDayShift(shift)")],
  ["o acesso usa o Nyx Prisma Orbital", login.includes('NyxPrismaOrbital as NyxRobot')],
  ["o novo fluxo visual possui painéis e etapas", ["login-access-layout", "login-nyx-panel", "login-steps", "login-profile-grid"].every(name => login.includes(name))],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed += 1;
}
console.log(`\n${checks.length-failed}/${checks.length} contratos passaram.`);
if (failed) process.exit(1);
