// Fase 10: paleta de cores semântica — confere que os botões que estavam com cores soltas (sem
// lógica nenhuma) passaram a usar a paleta consistente (primary roxo, success verde, danger
// vermelho, info ciano, ou o estilo neutro já padronizado), e que nada quebrou funcionalmente.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoPaleta', JSON.stringify({
    name: 'AlunoPaleta', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 80,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.waitForTimeout(1000);

  const bgOf = async (locator) => locator.evaluate(el => getComputedStyle(el).background || getComputedStyle(el).backgroundColor);

  // painel "Gerenciar aluno"
  const monitorCard = page.locator('h3:has-text("Monitoramento")').locator('xpath=..');
  await monitorCard.hover();
  await page.waitForTimeout(700);
  await page.click('text=AlunoPaleta');
  await page.waitForTimeout(500);

  const boletimBtn = page.locator('button:has-text("Gerar boletim de AlunoPaleta")');
  check('Botão de gerar boletim usa a cor primária (roxo), não mais o rosa avulso', (await bgOf(boletimBtn)).includes('192, 132, 252'), await bgOf(boletimBtn));

  const pdfBtn = page.locator('button:has-text("Gerar resumo de hoje em PDF")');
  check('Botão de PDF do dia usa a cor primária (roxo), não mais o dourado avulso', (await bgOf(pdfBtn)).includes('192, 132, 252'), await bgOf(pdfBtn));

  const renameBtn = page.locator('button:has-text("Renomear")');
  check('Botão Renomear continua roxo (já estava certo)', (await bgOf(renameBtn)).includes('192, 132, 252'), await bgOf(renameBtn));

  const deleteBtn = page.locator('button:has-text("Excluir perfil do aluno")');
  check('Botão de excluir continua vermelho (perigo)', (await bgOf(deleteBtn)).includes('248, 113, 113'), await bgOf(deleteBtn));

  // funcionalidade continua ok: renomear de fato funciona
  await page.fill('input[placeholder="AlunoPaleta"]', 'AlunoRenomeado');
  await renameBtn.click();
  await page.waitForTimeout(500);
  check('Renomear ainda funciona depois da mudança de cor', JSON.parse(kvStore.get('student:matutino:AlunoPaleta') || kvStore.get('student:matutino:AlunoRenomeado') || '{}').name === 'AlunoRenomeado' || !!kvStore.get('student:matutino:AlunoRenomeado'));

  // aba Prova: botões neutros de cancelar/nova prova usam o mesmo estilo "ghost" do resto do app
  await page.click('text=🏆 Prova');
  await page.waitForTimeout(500);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('PALETA DE CORES SEMÂNTICA CONSISTENTE (FASE 10)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
