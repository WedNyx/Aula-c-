// Botão "🔍 Analisar turma": em vez de cada aluno precisar clicar "Analisar código" sozinho, o
// professor pode analisar todo mundo que está sendo mostrado no Monitoramento de uma vez só —
// pensado pra ele controlar quando o Nyx é chamado, economizando créditos.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoCertoLote', JSON.stringify({
    name: 'AlunoCertoLote', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int certo = 1;\nConsole.WriteLine(certo);' }],
    code: 'int certo = 1;\nConsole.WriteLine(certo);', phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));
  kvStore.set('student:matutino:AlunoErradoLote', JSON.stringify({
    name: 'AlunoErradoLote', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int errado = ;' }],
    code: 'int errado = ;', phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));
  kvStore.set('student:matutino:AlunoSemCodigoLote', JSON.stringify({
    name: 'AlunoSemCodigoLote', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    code: '', phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  let calls = 0;
  await page.unroute('**/api/claude');
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    const body = JSON.parse(route.request().postData() || '{}');
    calls++;
    const ok = !body.prompt.includes('int errado');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify({ ok, message: ok ? 'Mandou bem!' : 'Falta um valor depois do =.' }) }] }) });
  });

  await loginTeacher(page);
  await page.waitForTimeout(1500);

  const analyzeBtn = page.locator('button:has-text("Analisar turma")');
  await analyzeBtn.click();
  await page.waitForTimeout(2500);

  check('Chamou o Nyx só pros 2 alunos com código (não pro que estava vazio)', calls === 2, String(calls));

  const certo = JSON.parse(kvStore.get('student:matutino:AlunoCertoLote'));
  const errado = JSON.parse(kvStore.get('student:matutino:AlunoErradoLote'));
  const semCodigo = JSON.parse(kvStore.get('student:matutino:AlunoSemCodigoLote'));

  check('AlunoCertoLote foi marcado sem erro (hasError:false)', certo.hasError === false, JSON.stringify(certo.feedback));
  check('AlunoErradoLote foi marcado com erro (hasError:true)', errado.hasError === true, JSON.stringify(errado.feedback));
  check('AlunoErradoLote recebeu a mensagem explicando o erro', (errado.feedback?.message || '').includes('valor'), JSON.stringify(errado.feedback));
  check('AlunoSemCodigoLote não foi tocado (sem código suficiente pra analisar)', semCodigo.feedback === undefined);

  check('Mensagem de status mostra o resultado (1 sem erro, 1 com erro)', (await page.locator('text=/1 sem erro/').count()) > 0);
  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('ANALISAR CÓDIGO DA TURMA TODA DE UMA VEZ (LOTE)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
