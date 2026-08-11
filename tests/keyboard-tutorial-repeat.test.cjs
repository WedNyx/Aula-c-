// Tutorial de teclado: quando o aluno erra a tecla, a Nyx repete a explicação em voz alta (indicado
// na tela com "🔊 Sem pressa...") e o alvo NÃO avança até ele acertar — repete quantas vezes precisar.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoTeclado', JSON.stringify({
    name: 'AlunoTeclado', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.click('text=AlunoTeclado');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skip = page.locator('button:has-text("Pular hoje")');
    if (await skip.count()) { await skip.click(); await page.waitForTimeout(300); }
    else break;
  }

  await page.click('button:has-text("⌨️ Tutorial de Teclado")');
  await page.waitForTimeout(500);
  check('Tutorial abriu (nível 1: Letras e números)', (await page.locator('text=Letras e números').count()) > 0);

  check('Antes de errar, não mostra a mensagem de repetição', (await page.locator('text=Sem pressa').count()) === 0);
  check('0/36 teclas no começo do nível 1', (await page.locator('text=/0\\/36 teclas/').count()) > 0);

  // primeiro alvo do nível 1 é a letra "a" — aperta uma tecla ERRADA de propósito
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(300);
  check('Depois de errar, aparece a mensagem de repetição da Nyx', (await page.locator('text=Sem pressa').count()) > 0);
  check('O alvo NÃO avançou (continua 0/36)', (await page.locator('text=/0\\/36 teclas/').count()) > 0);

  // erra de novo — continua sem avançar, mensagem continua lá
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(300);
  check('Depois de errar DUAS vezes, ainda não avançou', (await page.locator('text=/0\\/36 teclas/').count()) > 0);

  // agora acerta a tecla certa
  await page.keyboard.press('KeyA');
  await page.waitForTimeout(300);
  check('Depois de acertar, avança pro próximo alvo (1/36)', (await page.locator('text=/1\\/36 teclas/').count()) > 0);
  check('A mensagem de repetição some depois de acertar', (await page.locator('text=Sem pressa').count()) === 0);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('TUTORIAL DE TECLADO: NYX REPETE A DICA ATÉ O ALUNO ACERTAR') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
