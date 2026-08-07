// Chefão do teclado: o professor pode travar o editor de código de uma turma inteira com um
// clique (ex: pra pedir atenção durante uma explicação) — cada turma trava/libera à parte, igual
// ao Chefão/Torneio. Este teste trava só a turma "matutino" e confirma que só ela é afetada.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoM', JSON.stringify({
    name: 'AlunoM', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x = 1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));
  kvStore.set('student:vespertino:AlunoV', JSON.stringify({
    name: 'AlunoV', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: 'int y = 2;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));

  const browser = await launchBrowser();

  async function loginExisting(page, name, shiftLabel) {
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click(`text=${shiftLabel}`);
    await page.waitForTimeout(500);
    await page.waitForSelector(`text=${name}`, { timeout: 10000 });
    await page.click(`text=${name}`);
    await page.waitForTimeout(1200);
    for (let i = 0; i < 5; i++) {
      const skipCheckin = page.locator('button:has-text("Pular hoje")');
      if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
      else break;
    }
  }

  // ── professor trava o teclado só da turma matutino ──
  const ctxT = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('text=👥 Monitoramento');
  await pageT.waitForTimeout(500);
  const monitorCard = pageT.locator('h3:has-text("Monitoramento")').locator('xpath=..');
  await monitorCard.hover();
  await pageT.waitForTimeout(500);

  // "Lista de Chamada" é um CollapsibleCard — pode estar fechado por padrão
  if ((await pageT.locator('b:has-text("☀️ Matutino")').count()) === 0) {
    await pageT.click('button:has-text("📋 Lista de Chamada")');
    await pageT.waitForTimeout(300);
  }

  const matutinoHeader = pageT.locator('b:has-text("☀️ Matutino")').first();
  const matutinoGroup = matutinoHeader.locator('xpath=..');
  // busca pela POSIÇÃO (único botão desse grupo), não pelo texto — o texto muda pra "Teclado
  // travado" depois do 1º clique, o que quebraria um locator preso ao texto "Travar teclado"
  const lockBtn = matutinoGroup.locator('button').first();
  check('Botão de travar teclado existe no cabeçalho da turma matutino', (await lockBtn.count()) > 0);
  await lockBtn.click();
  await pageT.waitForTimeout(500);
  check('Botão vira "Teclado travado" depois do clique', (await matutinoGroup.locator('button:has-text("Teclado travado")').count()) > 0);
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  // ── aluno da turma matutino: editor travado ──
  const ctxM = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageM = await ctxM.newPage();
  const jsErrorsM = await mockRoutes(pageM, kvStore);
  await loginExisting(pageM, 'AlunoM', '☀️ Matutino');
  await pageM.waitForSelector('textarea', { timeout: 10000 });
  await pageM.waitForTimeout(4500); // dá tempo do polling (a cada 4s) pegar o travamento
  check('Aluno da turma travada vê o aviso de teclado travado', (await pageM.locator('text=/professor travou o teclado/').count()) > 0);
  const textareaM = pageM.locator('textarea').first();
  check('Textarea do aluno da turma travada está readonly', await textareaM.evaluate(el => el.readOnly));
  check('SEM erro de JS (AlunoM)', jsErrorsM.length === 0, jsErrorsM.slice(0, 3).join(' | '));

  // ── aluno de OUTRA turma (vespertino): editor livre, sem aviso nenhum ──
  const ctxV = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageV = await ctxV.newPage();
  const jsErrorsV = await mockRoutes(pageV, kvStore);
  await loginExisting(pageV, 'AlunoV', '🌙 Vespertino');
  await pageV.waitForSelector('textarea', { timeout: 10000 });
  await pageV.waitForTimeout(4500);
  check('Aluno de OUTRA turma NÃO vê o aviso de teclado travado', (await pageV.locator('text=/professor travou o teclado/').count()) === 0);
  const textareaV = pageV.locator('textarea').first();
  check('Textarea do aluno de outra turma continua editável', !(await textareaV.evaluate(el => el.readOnly)));
  check('SEM erro de JS (AlunoV)', jsErrorsV.length === 0, jsErrorsV.slice(0, 3).join(' | '));

  // ── professor libera de novo — aluno da matutino volta a editar ──
  await lockBtn.click();
  await pageT.waitForTimeout(500);
  check('Botão volta a "Travar teclado" depois de liberar', (await matutinoGroup.locator('button:has-text("Travar teclado")').count()) > 0);
  await pageM.waitForTimeout(4500);
  check('Depois de liberado, o aviso some da tela do AlunoM', (await pageM.locator('text=/professor travou o teclado/').count()) === 0);
  check('Depois de liberado, a textarea do AlunoM volta a ser editável', !(await textareaM.evaluate(el => el.readOnly)));

  await ctxT.close();
  await ctxM.close();
  await ctxV.close();
  await browser.close();
  process.exit(summary('TRAVAR TECLADO DOS ALUNOS POR TURMA') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
