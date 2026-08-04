// Cada turma agora tem seu PRÓPRIO calendário (dias de aula + cidade da jornada do DF) — antes
// era um único calendário global compartilhado por todo o sistema. Este teste cria uma segunda
// turma vespertina e confirma que marcar dia de aula / trocar de cidade / encerrar cidade numa
// turma NUNCA mexe na outra, mesmo as duas sendo do mesmo turno (vespertino).
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('turmas:list', JSON.stringify([
    { id: 'matutino', label: 'Matutino', emoji: '☀️', period: 'matutino', color: '#f59e0b', createdAt: 0, archived: false },
    { id: 'vespertino', label: 'Vespertino', emoji: '🌙', period: 'vespertino', color: '#c084fc', createdAt: 0, archived: false },
    { id: 'vespertino-b', label: 'Vespertino B', emoji: '🌙', period: 'vespertino', color: '#22d3ee', createdAt: 1, archived: false },
  ]));
  kvStore.set('student:vespertino:AlunoA', JSON.stringify({
    name: 'AlunoA', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), score: 70,
  }));
  kvStore.set('student:vespertino-b:AlunoB', JSON.stringify({
    name: 'AlunoB', shift: 'vespertino-b', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), score: 70,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.click('text=🗓️ Calendário');
  await page.waitForTimeout(500);

  // escopado dentro do card do calendário (data-tour-prof="calendar-body") — o filtro de turma
  // geral do topo da tela (shiftFilter) também tem botões com o mesmo texto, então precisa desambiguar
  const calBody = page.locator('[data-tour-prof="calendar-body"]');

  // turma "vespertino" (a original) ainda mostra a cidade LEGADA (Sobradinho) — fallback pro
  // valor global antigo, já que ela nunca teve um byTurma próprio até agora
  await calBody.locator('button:has-text("🌙 Vespertino"):not(:has-text("Vespertino B"))').click();
  await page.waitForTimeout(300);
  check('Turma "vespertino" original mostra a cidade legada (Sobradinho)', (await page.locator('text=Cidade salva: Sobradinho').count()) > 0);

  // troca pra "Vespertino B" (turma nova, sem calendário nenhum ainda) e define uma cidade dela
  await calBody.locator('button:has-text("🌙 Vespertino B")').click();
  await page.waitForTimeout(300);
  check('Turma nova "Vespertino B" NÃO herda a cidade da vespertino original', (await page.locator('text=Cidade salva: Sobradinho').count()) === 0);
  await page.fill('input[placeholder="Ex: Ceilândia"]', 'Taguatinga');
  await page.click('button:has-text("Salvar cidade")');
  await page.waitForTimeout(500);
  check('Cidade da turma nova foi salva', (await page.locator('text=Cidade salva: Taguatinga').count()) > 0);

  let meta = JSON.parse(kvStore.get('teachermeta:main'));
  check('teachermeta.byTurma["vespertino-b"].city = Taguatinga', meta.byTurma?.['vespertino-b']?.city === 'Taguatinga', JSON.stringify(meta.byTurma));
  check('A cidade GLOBAL legada (usada só de fallback) não foi mexida', meta.city === 'Sobradinho');

  // encerra a cidade da turma "vespertino-b" — não pode mexer na vespertino original
  await page.click('button:has-text("🏆 Encerrar cidade")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Sim, encerrar Taguatinga")');
  await page.waitForTimeout(2000);

  meta = JSON.parse(kvStore.get('teachermeta:main'));
  check('Encerrar a cidade da "vespertino-b" marca cityClosed só nela', meta.byTurma?.['vespertino-b']?.cityClosed === true, JSON.stringify(meta.byTurma));
  check('A turma "vespertino" ORIGINAL continua sem cityClosed (fallback legado intacto)', !meta.cityClosed);

  const hallB = JSON.parse(kvStore.get('hall:entries:vespertino-b') || '[]');
  check('Hall da Fama da "vespertino-b" recebeu a entrada (com AlunoB)', hallB.length === 1 && hallB[0].city === 'Taguatinga', JSON.stringify(hallB));
  check('AlunoA (da OUTRA turma) não aparece no pódio da "vespertino-b"', !JSON.stringify(hallB).includes('AlunoA'));
  check('Não existe hall:entries:vespertino separado (a original nunca foi encerrada)', !kvStore.has('hall:entries:vespertino'));

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('CALENDÁRIO POR TURMA: DUAS TURMAS DO MESMO TURNO FICAM ISOLADAS') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
