// A grade de alunos do card "👥 Monitoramento" já teve uma fase em que só aparecia com o MOUSE em
// cima (onMouseEnter/onMouseLeave), o que deixava ela permanentemente escondida em celular/tablet
// (não existe "hover" no toque). Isso foi substituído por um design mais simples: a grade fica
// VISÍVEL por padrão pra todo mundo (mouse ou toque), com um botão comum "▴ Recolher alunos" /
// "👥 Mostrar alunos" pra quem quiser esconder. O aviso "⚠ N duplicado(s)" já é por clique em
// qualquer tela. Este teste confirma que os dois funcionam por toque, sem precisar de hover.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoCelular', JSON.stringify({
    name: 'AlunoCelular', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x = 1;' }],
    phase: 'coding', lastSeen: Date.now(), score: 0,
  }));
  // mesmo nome em dois turnos → dispara o aviso de duplicado
  kvStore.set('student:vespertino:AlunoCelular', JSON.stringify({
    name: 'AlunoCelular', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: 'int y = 2;' }],
    phase: 'coding', lastSeen: Date.now(), score: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);
  await loginTeacher(page);
  await page.waitForTimeout(1200);

  // celular abre no Modo simples — troca pro Modo completo, onde fica o card de Monitoramento
  await page.click('text=🖥️ Modo completo');
  await page.waitForTimeout(500);
  check('Modo completo abriu', (await page.locator('text=Monitoramento').count()) > 0);

  check('Grade de alunos já aparece visível por padrão, sem precisar tocar em nada', (await page.locator('text=AlunoCelular').count()) > 0);
  check('Botão "Recolher alunos" aparece pra quem quiser esconder', (await page.locator('text=▴ Recolher alunos').count()) > 0);

  await page.click('text=▴ Recolher alunos');
  await page.waitForTimeout(300);
  check('Tocar em "Recolher alunos" esconde a grade', (await page.locator('text=AlunoCelular').count()) === 0);
  check('Botão vira "Mostrar alunos"', (await page.locator('text=👥 Mostrar alunos').count()) > 0);

  await page.click('text=👥 Mostrar alunos');
  await page.waitForTimeout(300);
  check('Tocar em "Mostrar alunos" revela a grade de novo', (await page.locator('text=AlunoCelular').count()) > 0);

  // aviso de duplicado: também precisa funcionar por toque
  check('Antes de tocar: popup de duplicado escondido', (await page.locator('text=Esse nome aparece em mais de um turno').count()) === 0);
  await page.click('text=⚠ 1 duplicado');
  await page.waitForTimeout(300);
  check('Depois de tocar: popup de duplicado aparece', (await page.locator('text=Esse nome aparece em mais de um turno').count()) > 0);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('MODO COMPLETO NO CELULAR: GRADE VISÍVEL POR PADRÃO E AVISO DE DUPLICADO POR TOQUE') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
