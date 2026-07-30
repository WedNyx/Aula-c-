// Um erro de JS que quebra sozinho na tela do aluno precisa aparecer pro professor sem que o
// aluno precise perceber e avisar. Testa o fluxo inteiro: erro real acontece → o listener global
// (App.jsx) manda pro servidor → o professor abre o card "Erros recentes" e vê o registro.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoComErro', JSON.stringify({
    name: 'AlunoComErro', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 0,
  }));

  const browser = await launchBrowser();

  // ── aluno: dispara um erro de JS de verdade (não tratado) ──
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageS = await ctxS.newPage();
  const jsErrorsS = await mockRoutes(pageS, kvStore);

  await pageS.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await pageS.waitForTimeout(700);
  await pageS.click('text=Aluno');
  await pageS.waitForTimeout(500);
  await pageS.click('text=☀️ Matutino');
  await pageS.waitForTimeout(500);
  await pageS.waitForSelector('text=AlunoComErro', { timeout: 10000 });
  await pageS.click('text=AlunoComErro');
  await pageS.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = pageS.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await pageS.waitForTimeout(300); }
    else break;
  }

  const ERROR_MARKER = 'ERRO-DE-TESTE-FORCADO-12345';
  await pageS.evaluate((marker) => { setTimeout(() => { throw new Error(marker); }, 0); }, ERROR_MARKER);
  await pageS.waitForTimeout(1500);

  check('O erro forçado realmente aconteceu na página (Playwright também captou)', jsErrorsS.some(e => e.includes(ERROR_MARKER)));
  const logged = kvStore.has('errorlog:recent') ? JSON.parse(kvStore.get('errorlog:recent')) : [];
  check('O listener global da app registrou o erro no banco', logged.some(e => e.message.includes(ERROR_MARKER)), JSON.stringify(logged));
  check('O registro guarda que veio de uma sessão de aluno', logged.some(e => e.message.includes(ERROR_MARKER) && e.role === 'student'));

  // dispara o MESMO erro de novo — não pode duplicar (dedupe por mensagem dentro da sessão)
  await pageS.evaluate((marker) => { setTimeout(() => { throw new Error(marker); }, 0); }, ERROR_MARKER);
  await pageS.waitForTimeout(1000);
  const loggedAfter = JSON.parse(kvStore.get('errorlog:recent'));
  const countSameMsg = loggedAfter.filter(e => e.message.includes(ERROR_MARKER)).length;
  check('O MESMO erro repetido na mesma sessão não duplica o registro', countSameMsg === 1, `contagem: ${countSameMsg}`);

  await ctxS.close();

  // ── professor: abre o painel e vê o erro registrado ──
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('text=👥 Monitoramento');
  await pageT.waitForTimeout(500);
  check('Card "Erros recentes" aparece no painel do professor', (await pageT.locator('text=🚨 Erros recentes').count()) > 0);
  await pageT.click('text=🚨 Erros recentes');
  await pageT.waitForTimeout(300);
  await pageT.click('button:has-text("↻ Verificar")');
  await pageT.waitForTimeout(500);
  check('O professor vê o erro do aluno no painel', (await pageT.locator(`text=/${ERROR_MARKER}/`).count()) > 0);
  check('SEM erro de JS (painel do professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  await ctxT.close();
  await browser.close();
  process.exit(summary('MONITORAMENTO DE ERROS EM PRODUÇÃO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
