// O troféu de nota no Monitoramento só pode aparecer no dia da atividade, some no dia seguinte.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore();
  const yesterday = Date.now() - 26 * 60 * 60 * 1000; // bem antes das 9h de hoje, isDoneActive já teria expirado
  kvStore.set('student:matutino:AlunoOntem', JSON.stringify({ name: 'AlunoOntem', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }], phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 88, doneAt: yesterday }));
  kvStore.set('student:matutino:AlunoHoje', JSON.stringify({ name: 'AlunoHoje', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int y=2;' }], phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 77, doneAt: Date.now() }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  const monitorCard = page.locator('h3:has-text("Monitoramento")').locator('xpath=..');
  await monitorCard.hover();
  await page.waitForTimeout(900);

  check('Aluno com nota de HOJE mostra o troféu (🏆 77)', (await page.locator('text=🏆 77').count()) > 0);
  check('Aluno com nota de ONTEM NÃO mostra mais o troféu (🏆 88 sumiu)', (await page.locator('text=🏆 88').count()) === 0);
  check('SEM erro JS', jsErrors.length === 0, jsErrors.join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('TROFÉU SÓ NO DIA DA ATIVIDADE') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
