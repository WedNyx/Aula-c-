// Tutorial de teclado: depois de acertar uma tecla, sorteia uma frasezinha de um banco fixo (sem
// IA) pro aluno digitar de verdade antes de avançar — a comparação ignora quantas linhas o texto
// quebra e ignora o que estiver DENTRO de aspas (só a estrutura em volta precisa bater). No Modo
// Guiado essa etapa é pulada — avança direto depois de acertar a tecla, sem digitar frase.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

async function openTutorial(page) {
  for (let i = 0; i < 5; i++) {
    const skip = page.locator('button:has-text("Pular hoje")');
    if (await skip.count()) { await skip.click(); await page.waitForTimeout(300); }
    else break;
  }
  await page.click('button:has-text("⌨️ Tutorial de Teclado")');
  await page.waitForTimeout(500);
}

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoTeclado', JSON.stringify({
    name: 'AlunoTeclado', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x = 1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));
  kvStore.set('student:matutino:AlunoGuiado', JSON.stringify({
    name: 'AlunoGuiado', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));
  kvStore.set('accessmode:matutino:AlunoGuiado', '1');

  const browser = await launchBrowser();

  // ── 1) fluxo normal: acerta a tecla → aparece a frase → digitar igual (com aspas diferentes) avança ──
  {
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
    await openTutorial(page);

    check('Antes de acertar, não mostra a etapa de frase', (await page.locator('text=Agora pratique digitando').count()) === 0);

    // primeiro alvo do nível 1 é a letra "a"
    await page.keyboard.press('KeyA');
    await page.waitForTimeout(600);
    check('Depois de acertar a tecla, aparece a etapa de digitar a frase', (await page.locator('text=Agora pratique digitando').count()) > 0);
    const fraseEl = page.locator('[data-testid="kb-phrase-text"]');
    const frase = await fraseEl.innerText();
    check('A frase do banco fixo do nível 1 aparece na tela (tem aspas)', frase.includes('"'), frase);
    check('O alvo AINDA NÃO avançou (a frase ainda não foi digitada)', (await page.locator('text=/0\\/36 teclas/').count()) === 0); // a área de teclas nem aparece durante a frase

    const textarea = page.locator('[data-testid="kb-phrase-input"]');
    // digita a MESMA estrutura mas com texto DIFERENTE dentro das aspas — tem que contar como igual
    const fraseComOutrasAspas = frase.replace(/"[^"]*"/, '"outra coisa qualquer"');
    await textarea.fill(fraseComOutrasAspas);
    await page.waitForTimeout(400);
    check('Digitando a mesma estrutura (aspas com conteúdo diferente) avança pro próximo alvo', (await page.locator('text=/1\\/36 teclas/').count()) > 0);
    check('A etapa de frase some depois de avançar', (await page.locator('text=Agora pratique digitando').count()) === 0);

    // segundo ciclo: acerta "b", digita algo com estrutura ERRADA — não pode avançar
    await page.keyboard.press('KeyB');
    await page.waitForTimeout(600);
    check('Novo ciclo: a etapa de frase aparece de novo pro próximo alvo', (await page.locator('text=Agora pratique digitando').count()) > 0);
    const textarea2 = page.locator('[data-testid="kb-phrase-input"]');
    await textarea2.fill('isso aqui não bate com a estrutura esperada');
    await page.waitForTimeout(400);
    check('Estrutura ERRADA não avança (continua 1/36, não vai pra 2/36)', (await page.locator('text=/2\\/36 teclas/').count()) === 0);

    check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ── 2) Modo Guiado: pula a etapa de frase, avança direto depois de acertar a tecla ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('text=☀️ Matutino');
    await page.waitForTimeout(500);
    await page.click('text=AlunoGuiado');
    await page.waitForTimeout(1200);
    await openTutorial(page);

    await page.keyboard.press('KeyA');
    await page.waitForTimeout(600);
    check('Modo Guiado: NÃO mostra a etapa de frase depois de acertar', (await page.locator('text=Agora pratique digitando').count()) === 0);
    check('Modo Guiado: avança direto pro próximo alvo', (await page.locator('text=/1\\/36 teclas/').count()) > 0, await page.locator('p:has-text("teclas neste nível")').first().innerText().catch(()=>'?'));

    check('SEM erro de JS (Modo Guiado)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(summary('TUTORIAL DE TECLADO: FRASE DE PRÁTICA CONTEXTUAL (FASE 6)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
