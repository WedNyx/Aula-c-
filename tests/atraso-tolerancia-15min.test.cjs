// A chamada só marca um aluno como "⏰ Atrasado" se o primeiro acesso do dia foi mais de 15 min
// depois do horário de início da turma — antes disso (ex: 5 min de atraso) conta como presença
// normal, sem tolerância nenhuma.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const now = new Date();
  const at = (h, m) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0).getTime();
  const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const kvStore = baseKvStore({ schedule: { matutino: { start: '08:00', end: '11:50' } } });
  // chegou 10 min depois do início — dentro da tolerância de 15 min, NÃO deve aparecer como atrasado
  kvStore.set('student:matutino:AlunoDentroTolerancia', JSON.stringify({
    name: 'AlunoDentroTolerancia', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
    attendance: { [tk]: 'present' }, attendanceFirst: { [tk]: at(8, 10) },
  }));
  // chegou 20 min depois do início — passou da tolerância, DEVE aparecer como atrasado
  kvStore.set('student:matutino:AlunoForaTolerancia', JSON.stringify({
    name: 'AlunoForaTolerancia', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
    attendance: { [tk]: 'present' }, attendanceFirst: { [tk]: at(8, 20) },
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.waitForTimeout(1000);
  // "Lista de Chamada" é um card recolhido por padrão — precisa abrir pra ver os alunos
  await page.click('text=📋 Lista de Chamada');
  await page.waitForTimeout(400);
  await page.waitForSelector('text=AlunoDentroTolerancia', { timeout: 10000 });

  const chamada = page.locator('[data-tour-prof="chamada"]');
  const cardDentro = chamada.locator('div.tilefx', { hasText: 'AlunoDentroTolerancia' });
  const cardFora = chamada.locator('div.tilefx', { hasText: 'AlunoForaTolerancia' });

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  check('Aluno que chegou 10 min depois (dentro da tolerância) NÃO aparece como atrasado',
    (await cardDentro.locator('text=⏰ Atrasado').count()) === 0);
  check('Aluno que chegou 20 min depois (fora da tolerância) aparece como atrasado',
    (await cardFora.locator('text=⏰ Atrasado').count()) > 0);

  await ctx.close();
  await browser.close();
  process.exit(summary('CHAMADA: TOLERÂNCIA DE 15 MIN PARA ATRASO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
