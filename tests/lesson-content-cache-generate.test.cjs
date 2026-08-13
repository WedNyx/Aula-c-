// "Minhas aulas": o professor pode gerar, de uma vez, o nome do conteúdo + explicação + resumo +
// atividade prontos pra uma aula salva — fica guardado junto com a aula, pra ser reaproveitado
// depois (ver lesson-content-cache-reuse.test.cjs) em vez de pedir tudo de novo pro Nyx toda vez
// que essa aula for usada.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  const lessonFiles = [{ name: 'Program.cs', code: 'int x = 1;\nConsole.WriteLine(x);' }];
  kvStore.set('teachercode:lessons', JSON.stringify([
    { title: 'Aula de Variáveis', files: lessonFiles, at: Date.now() },
  ]));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  let calls = 0;
  await page.unroute('**/api/claude');
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    const body = JSON.parse(route.request().postData() || '{}');
    calls++;
    if (body.prompt.includes('nome de conteúdo') || body.prompt.includes('NOME DE CONTEÚDO')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: 'Variáveis e Saída de Texto' }] }) });
    } else if (body.prompt.includes('Crie 8 questões')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify({ questions: Array.from({ length: 8 }, (_, i) => ({ q: `Pergunta ${i + 1}?`, opts: ['A', 'B', 'C', 'D'], correct: 0 })) }) }] }) });
    } else {
      // pedidos de explicação/resumo (JSON com secoes)
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify({ intro: 'Você aprendeu variáveis.', secoes: [{ titulo: 'Variáveis', explicacao: 'Guardam valores.', exemplo: 'int x = 1;' }], dica: 'Continue praticando!' }) }] }) });
    }
  });

  await loginTeacher(page);
  await page.waitForTimeout(1000);
  await page.click('text=👨‍💻 Meu código');
  await page.waitForTimeout(500);
  await page.click('button:has-text("📚 Minhas aulas")');
  await page.waitForTimeout(500);

  check('A aula seedada aparece na biblioteca', (await page.locator('text=Aula de Variáveis').count()) > 0);
  check('Aula ainda sem conteúdo pronto', (await page.locator('text=Sem conteúdo pronto ainda').count()) > 0);

  await page.click('button:has-text("Gerar conteúdo pronto")');
  await page.waitForTimeout(2500);

  check('Chamou o Nyx 4x (nome, explicação, resumo, atividade)', calls === 4, String(calls));
  check('Badge "Conteúdo pronto" aparece depois de gerar', (await page.locator('text=🧠 Conteúdo pronto').count()) > 0);

  const saved = JSON.parse(kvStore.get('teachercode:lessons'));
  check('contentName foi salvo na aula', saved[0].contentName === 'Variáveis e Saída de Texto', JSON.stringify(saved[0].contentName));
  check('explain (pro PDF) foi salvo na aula', saved[0].explain?.secoes?.[0]?.titulo === 'Variáveis', JSON.stringify(saved[0].explain));
  check('resumo (pro aluno) foi salvo na aula', saved[0].resumo?.intro === 'Você aprendeu variáveis.', JSON.stringify(saved[0].resumo));
  check('atividade (8 questões) foi salva na aula', Array.isArray(saved[0].atividade) && saved[0].atividade.length === 8, JSON.stringify(saved[0].atividade?.length));
  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('MINHAS AULAS: GERAR CONTEÚDO PRONTO DE UMA VEZ (NOME+EXPLICAÇÃO+RESUMO+ATIVIDADE)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
