// "Aquecimento do dia" era a ÚNICA chamada ao Nyx no app inteiro que disparava sozinha, sem
// NINGUÉM (nem aluno nem professor) clicar em nada — a pedido do professor, foi desligada de
// propósito (WARMUP_ENABLED=false em App.jsx) pra economizar créditos. Este teste confirma que,
// mesmo com todas as condições que ANTES disparavam o aquecimento (resumo de ontem existente,
// aluno recém-logado), nem o modal abre nem o /api/claude é chamado com o prompt de aquecimento.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-08-11', '2026-08-12'] });
  kvStore.set('student:matutino:AlunoAquecimento', JSON.stringify({
    name: 'AlunoAquecimento', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
    // resumo de ontem, com seções — exatamente a condição que antes fazia o aquecimento aparecer hoje
    summaryHistory: { '2026-08-11': { intro: 'Aprendeu variáveis', secoes: [{ titulo: 'Variáveis', explicacao: 'Guardam valores.' }], dica: 'Continue!' } },
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  const claudePrompts = [];
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    const body = JSON.parse(route.request().postData() || '{}');
    claudePrompts.push(body.prompt || '');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: '{"ok":true,"frases":["ok"]}' }] }) });
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoAquecimento', { timeout: 10000 });
  await page.click('text=AlunoAquecimento');
  // espera generosa — tempo de sobra pro efeito antigo já ter disparado, se ainda existisse
  await page.waitForTimeout(4000);

  check('O modal "Aquecimento do dia" NUNCA abre sozinho', (await page.locator('text=Aquecimento do dia').count()) === 0);
  check('Nenhuma chamada ao Nyx pediu um "aquecimento" de revisão', !claudePrompts.some(p => p.includes('aquecimento')), JSON.stringify(claudePrompts.slice(0, 3)));
  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('AQUECIMENTO AUTOMÁTICO DESLIGADO (economia de créditos)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
