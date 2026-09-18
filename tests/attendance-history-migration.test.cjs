const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const shifts = fs.readFileSync(path.join(root, "src/lib/shifts.ts"), "utf8");

// Antes, turmaCalendar() reunia meta.classDays (campo legado, congelado desde a migração pra
// calendário por turma) com per.classDays em TODA leitura — não só na migração. Como o professor
// nunca consegue escrever de volta em meta.classDays depois que byTurma existe, qualquer dia que
// ele removesse do calendário "ressuscitava" sozinho na leitura seguinte (a Lista de Chamada e a
// exportação de planilha continuavam cobrando presença/falta pra um dia já removido). Ver
// investigação: src/lib/shifts.ts, função turmaCalendar.
const perBranch = (shifts.match(/if \(per\) \{[\s\S]*?\n  \}/) || [""])[0];

const checks = [
  ["turmas originais ainda recuperam o calendário legado ANTES da primeira escrita em byTurma (migração)",
    shifts.includes('if (LEGACY_CALENDAR_TURMA_IDS.includes(turmaId)) {') && shifts.includes('classDays: meta.classDays || []')],
  ["depois que a turma já tem calendário próprio (byTurma), a leitura NÃO reúne mais com o campo legado (dia removido não ressuscita)",
    !perBranch.includes("legacyDays") && perBranch.includes("new Set(per.classDays || [])")],
  ["datas do calendário permanecem ordenadas", shifts.includes("])].sort()") || shifts.includes(").sort()")],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed += 1;
}
console.log(`\n${checks.length-failed}/${checks.length} contratos passaram.`);
if (failed) process.exit(1);
