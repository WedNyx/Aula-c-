// O painel de Monitoramento já calculava um horário de última atualização (setLastUpdate, dentro
// do load() que roda a cada 8s) mas nunca mostrava esse valor em lugar nenhum da tela — o estado
// era gravado e nunca lido, então o professor não tinha como saber se a lista de alunos que está
// vendo é recente ou ficou parada. Este teste garante que o rótulo "Atualizado às" aparece de
// verdade no card "NYX DE OLHO" do Monitoramento.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho' });
  kvStore.set('student:matutino:AlunoMonitor', JSON.stringify({
    name: 'AlunoMonitor', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);
  await loginTeacher(page);
  await page.click('text=Monitoramento');
  await page.waitForTimeout(1200);

  check('Card "NYX DE OLHO" mostra o horário da última atualização', (await page.locator('text=/Atualizado às \\d{1,2}:\\d{2}:\\d{2}/').count()) > 0);
  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('MONITORAMENTO MOSTRA O HORÁRIO DA ÚLTIMA ATUALIZAÇÃO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
