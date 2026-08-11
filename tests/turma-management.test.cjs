// Professor com duas turmas no MESMO turno (ex: duas de tarde) precisa conseguir criar uma turma
// extra, sem mexer em nada do que já existe: SHIFTS virou uma lista dinâmica (turmas:list no KV),
// com as 2 turmas de sempre como padrão enquanto o professor nunca mexeu nisso. Este teste cobre o
// caminho completo: criar a turma pela tela de ajustes, ela aparecer no seletor do login, e um
// aluno conseguir entrar nela ficando isolado da turma "vespertino" original.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:vespertino:AlunoOriginal', JSON.stringify({
    name: 'AlunoOriginal', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), score: 50,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.click('text=🗓️ Calendário');
  await page.waitForTimeout(400);

  check('Card "🏫 Turmas" aparece na aba Calendário', (await page.locator('text=🏫 Turmas').count()) > 0);
  check('As 2 turmas padrão (matutino/vespertino) já aparecem listadas', (await page.locator('text=☀️ Matutino').count()) > 0 && (await page.locator('text=🌙 Vespertino').count()) > 0);

  await page.fill('input[placeholder="Nome da turma (ex: Vespertino B)"]', 'Vespertino B');
  await page.selectOption('select', 'vespertino');
  await page.click('button:has-text("+ Criar turma")');
  await page.waitForTimeout(500);

  check('Turma nova aparece na lista depois de criada', (await page.locator('text=🌙 Vespertino B').count()) > 0);
  const stored = JSON.parse(kvStore.get('turmas:list'));
  check('turmas:list no servidor tem 3 turmas', stored.length === 3, JSON.stringify(stored));
  const nova = stored.find(t => t.label === 'Vespertino B');
  check('Turma nova tem id derivado do nome, período tarde e não está arquivada', !!nova && nova.id === 'vespertino-b' && nova.period === 'vespertino' && nova.archived === false, JSON.stringify(nova));

  check('SEM erro de JS (professor)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  await ctx.close();

  // ── aluno: a turma nova aparece no seletor de login e fica isolada da vespertino original ──
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page2 = await ctx2.newPage();
  const jsErrors2 = await mockRoutes(page2, kvStore);
  await page2.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(700);
  await page2.click('text=Aluno');
  await page2.waitForTimeout(500);

  check('Seletor de turma do login mostra a turma nova', (await page2.locator('button:has-text("🌙 Vespertino B")').count()) > 0);
  await page2.click('button:has-text("🌙 Vespertino B")');
  await page2.waitForTimeout(300);
  check('Não mostra o perfil da turma "vespertino" original (turma nova começa vazia)', (await page2.locator('text=AlunoOriginal').count()) === 0);

  await page2.fill('input[placeholder="Seu nome completo"]', 'AlunoNovaTurma');
  await page2.click('button:has-text("Avançar")');
  await page2.waitForTimeout(400);
  await page2.click('button:has-text("Criar perfil e entrar")');
  await page2.waitForTimeout(1200);

  check('SEM erro de JS (aluno)', jsErrors2.length === 0, jsErrors2.slice(0, 3).join(' | '));
  check('Perfil do aluno foi salvo com o id da turma nova (isolado da vespertino original)', kvStore.has('student:vespertino-b:AlunoNovaTurma'));
  check('A turma "vespertino" original continua com só o aluno dela (não ganhou o novo por engano)', kvStore.has('student:vespertino:AlunoOriginal') && !kvStore.has('student:vespertino:AlunoNovaTurma'));

  await ctx2.close();
  await browser.close();
  process.exit(summary('MÚLTIPLAS TURMAS NO MESMO TURNO: CRIAR, APARECER NO LOGIN, FICAR ISOLADA') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
