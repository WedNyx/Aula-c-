// markPresentToday/unmarkPresentToday (o professor marcando presença na mão, ex: dia de filme/
// passeio sem computador) escreviam só no servidor via patchStudent — se o aluno estivesse com a
// aba aberta, o autosave periódico dele (a cada 12s, calculando a presença sozinho a partir do
// próprio código/fase) sobrescrevia essa correção manual silenciosamente em segundos, igual ao bug
// já corrigido antes pra nota/justificativa/portfólio (doSetScore/doApproveJustification/
// doDisablePortfolio) — attendance não tinha a mesma proteção via setScoreFix. Este teste simula a
// correção do professor enquanto o aluno está com a aba aberta e SEM ter escrito código nenhum
// (então o cálculo automático dele sozinho diria "idle", não "present") e confirma que a marcação
// manual sobrevive ao próximo autosave em vez de ser desfeita.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

function todayKeyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

(async () => {
  const tk = todayKeyLocal();
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: [tk] });
  const studentKey = 'student:matutino:AlunoChamada';
  kvStore.set(studentKey, JSON.stringify({
    name: 'AlunoChamada', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, attendance: {}, attendanceFirst: {},
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // matriculado há alguns dias, não é o dia de entrada
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoChamada', { timeout: 10000 });
  await page.click('text=AlunoChamada');
  await page.waitForTimeout(1500); // carrega o perfil e roda o primeiro tick — sem código, marca "idle"

  const before = JSON.parse(kvStore.get(studentKey));
  check('Sem código escrito, o próprio cálculo automático marca "idle" (não "present")', before.attendance?.[tk] !== 'present', JSON.stringify(before.attendance));

  // simula exatamente o que markPresentToday faz: corrige a presença no "servidor" E marca a flag
  // que o app usa pra avisar a aba aberta (mesmo mecanismo de doSetScore/doApproveJustification)
  const patched = { ...before, attendance: { ...(before.attendance || {}), [tk]: 'present' } };
  kvStore.set(studentKey, JSON.stringify(patched));
  kvStore.set('scorefix:matutino:AlunoChamada', JSON.stringify({ kind: 'attendance', dateKey: tk, status: 'present', at: Date.now() }));

  // espera o próximo autosave periódico desta aba (tick a cada 12s) — SEM a correção, ele
  // recalcularia a presença sozinho (sem código = "idle") e apagaria a marcação manual do professor
  await page.waitForTimeout(13000);

  const after = JSON.parse(kvStore.get(studentKey));
  check('Depois do autosave: a presença manual do professor sobrevive (continua "present")', after.attendance?.[tk] === 'present', JSON.stringify(after.attendance));
  check('A flag de correção foi consumida e limpa', kvStore.get('scorefix:matutino:AlunoChamada') == null, kvStore.get('scorefix:matutino:AlunoChamada'));
  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('PRESENÇA MARCADA NA MÃO PELO PROFESSOR SOBREVIVE AO AUTOSAVE DO ALUNO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
