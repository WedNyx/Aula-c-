// A pedido do professor, a "Nyx Vidente" (previsão do dia, texto fixo sem custo de IA) e a
// "Curiosidade do dia" (única chamada automática ao Nyx que sobrava no app, disparada sozinha ao
// aluno entrar) foram removidas por completo. Este teste confirma que nem os banners aparecem mais
// nem nenhuma chamada ao Nyx pedindo uma "curiosidade" acontece sozinha ao logar.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-08-12'] });
  kvStore.set('student:matutino:AlunoSemVidente', JSON.stringify({
    name: 'AlunoSemVidente', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: '{"ok":true}' }] }) });
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoSemVidente', { timeout: 10000 });
  await page.click('text=AlunoSemVidente');
  await page.waitForTimeout(3000);

  check('O banner "Nyx Vidente prevê" NÃO aparece mais', (await page.locator('text=Nyx Vidente prevê').count()) === 0);
  check('O banner "Curiosidade do dia" NÃO aparece mais', (await page.locator('text=Curiosidade do dia').count()) === 0);
  check('Nenhuma chamada ao Nyx pediu uma "curiosidade" sozinha ao logar', !claudePrompts.some(p => p.includes('curiosidade')), JSON.stringify(claudePrompts.slice(0, 3)));
  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('NYX VIDENTE E CURIOSIDADE DO DIA REMOVIDAS') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
