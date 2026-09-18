// Tutorial de teclado: SÓ no nível 3 (Shift/maiúsculas), depois de acertar uma tecla, sorteia uma
// frasezinha de um banco fixo (sem IA) pro aluno digitar de verdade antes de avançar — a
// comparação ignora quantas linhas o texto quebra e ignora o que estiver DENTRO de aspas (só a
// estrutura em volta precisa bater). Nos outros níveis (letras/números, especiais, atalhos,
// símbolos, acentos) o alvo avança direto ao acertar, sem essa etapa extra. No Modo Guiado a
// etapa de frase é pulada sempre — avança direto depois de acertar a tecla.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

// nível 1 (36 alvos: a-z0-9) e nível 2 (8 alvos: espaço/enter/backspace/tab/setas) avançam direto
// ao acertar — usado só pra "andar" até o nível 3, onde a etapa de frase realmente existe
const LEVEL_1_KEYS = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
const LEVEL_2_KEYS = ['Space', 'Enter', 'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
async function advanceToShiftLevel(page) {
  for (const key of [...LEVEL_1_KEYS, ...LEVEL_2_KEYS]) {
    await page.keyboard.press(key);
  }
  await page.waitForTimeout(400);
}

async function openTutorial(page) {
  for (let i = 0; i < 5; i++) {
    const skip = page.locator('button:has-text("Pular hoje")');
    const closeSanctuary = page.locator('[aria-label="Fechar Santuário Lunar"]');
    if (await closeSanctuary.count()) { await closeSanctuary.click({ force: true }); await page.waitForTimeout(300); continue; }
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

    check('Antes de chegar no nível do Shift, não mostra a etapa de frase', (await page.locator('text=Agora pratique').count()) === 0);

    // anda pelos níveis 1 (letras/números) e 2 (especiais) — nenhum dos dois pede frase, avançam
    // direto ao acertar — até chegar no nível 3 (Shift/maiúsculas), onde a frase realmente existe
    await advanceToShiftLevel(page);
    check('Chegou no nível do Shift (0/8 teclas)', (await page.locator('text=/0\\/8 teclas/').count()) > 0);

    // primeiro alvo do nível 3 é a letra "N" maiúscula (Shift + N)
    await page.keyboard.press('Shift+N');
    await page.waitForTimeout(600);
    check('Depois de acertar a tecla do Shift, aparece a etapa de digitar a frase', (await page.locator('text=Agora pratique').count()) > 0);
    const fraseEl = page.locator('[data-testid="kb-phrase-text"]');
    const frase = await fraseEl.innerText();
    check('A frase mostrada é a do banco fixo pra letra N ("Nyx ajuda")', frase.trim() === 'Nyx ajuda', frase);
    check('O alvo AINDA NÃO avançou (a frase ainda não foi digitada)', (await page.locator('text=/1\\/8 teclas/').count()) === 0);

    const textarea = page.locator('[data-testid="kb-phrase-input"]');
    // digita a MESMA frase mas com espaços/quebras de linha extras — a comparação ignora isso
    await textarea.fill(`  ${frase}\n\n `);
    await page.waitForTimeout(400);
    check('Digitando a mesma frase (com espaços/quebras extras) avança pro próximo alvo', (await page.locator('text=/1\\/8 teclas/').count()) > 0);
    check('A etapa de frase some depois de avançar', (await page.locator('text=Agora pratique').count()) === 0);

    // segundo ciclo: acerta "Y" maiúsculo, digita algo com estrutura ERRADA — não pode avançar
    await page.keyboard.press('Shift+Y');
    await page.waitForTimeout(600);
    check('Novo ciclo: a etapa de frase aparece de novo pro próximo alvo', (await page.locator('text=Agora pratique').count()) > 0);
    const textarea2 = page.locator('[data-testid="kb-phrase-input"]');
    await textarea2.fill('isso aqui não bate com a estrutura esperada');
    await page.waitForTimeout(400);
    check('Estrutura ERRADA não avança (continua 1/8, não vai pra 2/8)', (await page.locator('text=/2\\/8 teclas/').count()) === 0);

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

    // Modo Guiado também vai até o nível do Shift (KEYBOARD_LEVELS_EASY inclui até o nível 3) —
    // é o único nível onde a etapa de frase existiria fora do Modo Guiado, então é o teste que
    // realmente prova que o Modo Guiado pula essa etapa (não só "nunca chegou perto dela")
    await advanceToShiftLevel(page);
    check('Modo Guiado também chega no nível do Shift (0/8 teclas)', (await page.locator('text=/0\\/8 teclas/').count()) > 0);

    await page.keyboard.press('Shift+N');
    await page.waitForTimeout(600);
    check('Modo Guiado: NÃO mostra a etapa de frase mesmo acertando a tecla do Shift', (await page.locator('text=Agora pratique').count()) === 0);
    check('Modo Guiado: avança direto pro próximo alvo (1/8)', (await page.locator('text=/1\\/8 teclas/').count()) > 0, await page.locator('p:has-text("teclas neste nível")').first().innerText().catch(()=>'?'));

    check('SEM erro de JS (Modo Guiado)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(summary('TUTORIAL DE TECLADO: FRASE DE PRÁTICA CONTEXTUAL (FASE 6)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
