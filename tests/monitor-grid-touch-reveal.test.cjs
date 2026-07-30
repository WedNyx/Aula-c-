// A grade de alunos do card "👥 Monitoramento" (Modo completo) só aparecia com o MOUSE em cima
// (onMouseEnter/onMouseLeave) — pensado pra deixar a tela mais limpa no computador. Em celular/tablet
// não existe "hover": a grade ficava permanentemente escondida atrás do aviso "Passe o mouse aqui",
// mesmo pra quem entrasse no Modo completo de propósito numa tela estreita. O mesmo valia pro
// aviso "⚠ N duplicado(s)". Este teste confirma que agora dá pra TOCAR pra revelar os dois.
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
  check('Modo completo abriu', (await page.locator('text=👥 Monitoramento').count()) > 0);

  check('Antes de tocar: grade de alunos ainda escondida', (await page.locator('text=AlunoCelular').count()) === 0);
  check('Aviso mostra a versão de TOQUE (não a de mouse) numa tela estreita', (await page.locator('text=👆 Toque aqui').count()) > 0);

  await page.click('text=👆 Toque aqui');
  await page.waitForTimeout(300);
  check('Depois de tocar: grade de alunos aparece', (await page.locator('text=AlunoCelular').count()) > 0);
  check('Botão "🙈 Ocultar" aparece pra fechar de novo (não tem "mouse leave" no toque)', (await page.locator('text=🙈 Ocultar').count()) > 0);

  await page.click('text=🙈 Ocultar');
  await page.waitForTimeout(300);
  check('Tocar em "Ocultar" esconde a grade de novo', (await page.locator('text=AlunoCelular').count()) === 0);

  // aviso de duplicado: também precisa funcionar por toque
  check('Antes de tocar: popup de duplicado escondido', (await page.locator('text=Esse nome aparece em mais de um turno').count()) === 0);
  await page.click('text=⚠ 1 duplicado');
  await page.waitForTimeout(300);
  check('Depois de tocar: popup de duplicado aparece', (await page.locator('text=Esse nome aparece em mais de um turno').count()) > 0);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('MODO COMPLETO NO CELULAR: GRADE E AVISO DE DUPLICADO REVELADOS POR TOQUE') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
