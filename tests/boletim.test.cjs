// Boletim: escolher Todos/turno/1 aluno só, com botão de gerar individual no Gerenciar aluno.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ classDays: ['2026-07-20', '2026-07-24'], contentNames: { '2026-07-20': { matutino: 'Variáveis', vespertino: 'Loops' } } });
  kvStore.set('student:matutino:AlunoM', JSON.stringify({ name: 'AlunoM', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }], phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, createdAt: Date.now() - 5 * 86400000, attendance: { '2026-07-20': 'present' } }));
  kvStore.set('student:vespertino:AlunoV', JSON.stringify({ name: 'AlunoV', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: 'int y=2;' }], phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, createdAt: Date.now() - 5 * 86400000, attendance: { '2026-07-20': 'present' } }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.click('text=👥 Monitoramento');
  await page.waitForTimeout(500);

  const boletimCard = page.locator('[data-tour-prof="boletim"]');
  // pode estar fechado por padrão (CollapsibleCard) — abre se precisar
  if (!(await boletimCard.locator('button:has-text("🏫 Todos")').count())) {
    await boletimCard.locator('button:has-text("💌 Boletim pros responsáveis")').click();
    await page.waitForTimeout(300);
  }

  check('Seletor "Todos" existe', (await boletimCard.locator('button:has-text("🏫 Todos")').count()) > 0);
  check('Seletor "Matutino" existe', (await boletimCard.locator('button:has-text("☀️ Matutino")').count()) > 0);

  const [downloadAll] = await Promise.all([
    page.waitForEvent('download'),
    boletimCard.locator('button:has-text("💌 Gerar boletins")').click(),
  ]);
  check('Nome do arquivo "Todos" usa "all"', downloadAll.suggestedFilename().includes('boletins-all-'), downloadAll.suggestedFilename());

  await page.waitForTimeout(500);

  const monitorCard = page.locator('h3:has-text("Monitoramento")').locator('xpath=..');
  await monitorCard.hover();
  await page.waitForTimeout(900);
  await monitorCard.locator('text=AlunoM').click();
  await page.waitForTimeout(400);
  check('Painel Gerenciar aluno mostra botão de boletim individual', (await page.locator('button:has-text("Gerar boletim de AlunoM")').count()) > 0);

  const [downloadOne] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Gerar boletim de AlunoM")'),
  ]);
  check('Nome do arquivo do boletim individual usa o nome do aluno', downloadOne.suggestedFilename().includes('alunom'), downloadOne.suggestedFilename());
  check('Mensagem confirma o boletim de UM aluno só', (await page.locator('text=/Boletim de AlunoM gerado/').count()) > 0);

  check('SEM erro JS', jsErrors.length === 0, jsErrors.join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('BOLETIM: ESCOPO (TODOS/TURNO/ALUNO)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
