const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const shifts = fs.readFileSync(path.join(root, "src/lib/shifts.ts"), "utf8");

const checks = [
  ["turmas originais recuperam dias do calendário legado", shifts.includes("const legacyDays = LEGACY_CALENDAR_TURMA_IDS.includes(turmaId) ? (meta.classDays || []) : [];")],
  ["histórico legado e calendário por turma são unidos sem duplicatas", shifts.includes("new Set([...legacyDays, ...(per.classDays || [])])")],
  ["datas da chamada permanecem ordenadas", shifts.includes("])].sort();")],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed += 1;
}
console.log(`\n${checks.length-failed}/${checks.length} contratos passaram.`);
if (failed) process.exit(1);
