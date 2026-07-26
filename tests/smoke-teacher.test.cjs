// Fumaça básica do painel do professor: login, principais abas, grade do Monitoramento.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ classDays: ['2026-07-20', '2026-07-24'] });
  kvStore.set('student:matutino:AlunoA', JSON.stringify({ name: 'AlunoA', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }], phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 90, doneAt: Date.now(), examScore: 82 }));
  kvStore.set('student:vespertino:AlunoB', JSON.stringify({ name: 'AlunoB', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: 'int y=2;' }], phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 70, doneAt: Date.now(), examScore: 95 }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  check('Painel do professor abre', (await page.locator('text=Painel do Professor').count()) > 0);

  await page.click('text=👨‍💻 Meu código');
  await page.waitForTimeout(500);
  check('Aba Meu código abre', (await page.locator('text=Program.cs').count()) > 0);

  await page.click('text=👥 Monitoramento');
  await page.waitForTimeout(500);
  const monitorCard = page.locator('h3:has-text("Monitoramento")').locator('xpath=..');
  await monitorCard.hover();
  await page.waitForTimeout(900);
  check('Grade de alunos aparece com hover', (await page.locator('text=AlunoA').count()) > 0);

  await page.click('text=/🏆 Prova/');
  await page.waitForTimeout(500);
  check('Aba Prova abre', (await page.locator('text=/[Pp]rova/').count()) > 0);

  await page.click('text=👥 Monitoramento');
  await page.waitForTimeout(400);
  const csvBtn = page.locator('button:has-text("CSV"), button:has-text("Exportar")').first();
  check('Botão de exportar CSV existe', (await csvBtn.count()) > 0);

  check('SEM erro JS', jsErrors.length === 0, jsErrors.join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('SMOKE TEST PROFESSOR') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
