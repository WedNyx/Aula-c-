// PDF de códigos: escolher o turno antes de gerar + explicação sem limite fixo de seções.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore();
  kvStore.set('teachercode:matutino', JSON.stringify({ files: [{ name: 'Program.cs', code: 'using System;\nclass Program { static void Main() { Console.WriteLine("manha"); } }' }], at: Date.now() }));
  kvStore.set('teachercode:vespertino', JSON.stringify({ files: [{ name: 'Program.cs', code: 'using System;\nclass Program { static void Main() { Console.WriteLine("tarde"); } }' }], at: Date.now() }));

  const explainPrompts = [];
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);
  // sobrescreve o mock genérico do /api/claude (registrado por último = tem prioridade no Playwright)
  // pra capturar os prompts de verdade enviados pela geração do PDF
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    const body = JSON.parse(route.request().postData() || '{}');
    explainPrompts.push(body);
    const json = JSON.stringify({ intro: 'Introdução de teste', secoes: [{ titulo: 'Conceito 1', explicacao: 'Explica 1', exemplo: 'int x=1;' }], dica: 'Continue estudando' });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: json }] }) });
  });

  await loginTeacher(page);
  await page.click('text=👥 Monitoramento');
  await page.waitForTimeout(500);

  // escopado dentro do card de exportação (data-tour-prof="exportar") — o filtro de turma geral do
  // topo da tela também tem botões "☀️ Matutino"/"🌙 Vespertino", então precisa desambiguar
  const exportCard = page.locator('[data-tour-prof="exportar"]');
  check('Seletor de turno do PDF existe (Ambos)', (await exportCard.locator('button:has-text("🏫 Todas")').count()) > 0);
  check('Seletor de turno do PDF existe (Matutino)', (await exportCard.locator('button:has-text("☀️ Matutino")').count()) > 0);

  await exportCard.locator('button:has-text("☀️ Matutino")').click();
  await page.waitForTimeout(300);
  const [download1] = await Promise.all([
    page.waitForEvent('download'),
    exportCard.locator('button:has-text("Exportar PDF")').click(),
  ]);
  check('Nome do arquivo indica o turno matutino', download1.suggestedFilename().includes('matutino'), download1.suggestedFilename());
  check('Só 1 chamada de IA feita (só 1 turno = só 1 pedido de explicação)', explainPrompts.length === 1, `chamadas=${explainPrompts.length}`);
  check('Prompt não tem mais o limite fixo de seções (sem "entre 4 e 10")', !explainPrompts[0].prompt.includes('entre 4 e 10'));
  check('Prompt diz que não tem número fixo de seções', explainPrompts[0].prompt.includes('Não tem número fixo de seções'));
  check('max_tokens foi aumentado (6000)', explainPrompts[0].max_tokens === 6000, `max_tokens=${explainPrompts[0].max_tokens}`);

  explainPrompts.length = 0;
  await page.waitForTimeout(500);
  await exportCard.locator('button:has-text("🏫 Todas")').click();
  await page.waitForTimeout(300);
  const [download2] = await Promise.all([
    page.waitForEvent('download'),
    exportCard.locator('button:has-text("Exportar PDF")').click(),
  ]);
  check('PDF "Ambos" gera 2 chamadas de IA (uma por turno)', explainPrompts.length === 2, `chamadas=${explainPrompts.length}`);
  check('Nome do arquivo indica "all" (ambos)', download2.suggestedFilename().includes('-all-'), download2.suggestedFilename());

  check('SEM erro JS', jsErrors.length === 0, jsErrors.join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('PDF DE CÓDIGOS: SELETOR DE TURNO + EXPLICAÇÃO COMPLETA') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
