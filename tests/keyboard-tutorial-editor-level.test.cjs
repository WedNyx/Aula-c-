// Tutorial de teclado (Fase 7): novo nível "Editor de código" — usa o VSEditor de verdade (o
// mesmo editor que o aluno usa pra programar) pra ensinar o comportamento que uma tecla isolada
// não explica: parênteses/aspas/chaves fechando sozinhos, Tab indentando, Enter organizando
// blocos {} e Backspace apagando pares junto. Avança pros primeiros 7 níveis via eventos de
// teclado sintéticos (mais rápido e confiável que apertar tecla física por tecla física ~85 vezes),
// depois interage de verdade com o editor via Playwright pros 6 desafios do nível novo.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

async function fireWindowKey(page, key, opts = {}) {
  await page.evaluate(({ key, opts }) => {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey: !!opts.shift, ctrlKey: !!opts.ctrl });
    window.dispatchEvent(ev);
  }, { key, opts });
}

async function completePhraseIfPresent(page) {
  const ph = page.locator('[data-testid="kb-phrase-input"]');
  for (let i = 0; i < 30; i++) {
    if (await ph.count()) break;
    await page.waitForTimeout(50);
  }
  if (await ph.count()) {
    // digita de volta a MESMA frase mostrada (banco fixo por nível, sem IA) — garante que bate
    const frase = await page.locator('[data-testid="kb-phrase-text"]').innerText();
    await ph.fill(frase);
    await page.waitForTimeout(120);
  }
}

async function passTarget(page, key, opts) {
  await fireWindowKey(page, key, opts);
  await completePhraseIfPresent(page);
}

// avança pelos 7 primeiros níveis (tudo que já existia antes da Fase 7) pra chegar no nível
// novo "Editor de código" (8º) — replica o gabarito de cada nível em src/KeyboardTutorial.jsx
async function skipToEditorLevel(page) {
  for (const ch of 'abcdefghijklmnopqrstuvwxyz0123456789') await passTarget(page, ch);
  for (const ch of [' ', 'Enter', 'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) await passTarget(page, ch);
  for (const ch of 'NYXCODAR') await passTarget(page, ch, { shift: true });
  for (const ch of ['c', 'v', 'z', 'a']) await passTarget(page, ch, { ctrl: true });
  for (const ch of ['(', ')', '[', ']', '{', '}', '"', ';', '_', '=', '.', ',', '<', '>']) await passTarget(page, ch);
  for (const ch of ['+', '*', '/', '%', '!', '?', ':', "'", '\\', '&', '@', '$']) await passTarget(page, ch);
  for (const ch of ['ç', 'á', 'ã']) await passTarget(page, ch);
}

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoEditorKb', JSON.stringify({
    name: 'AlunoEditorKb', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
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
  await page.click('text=AlunoEditorKb');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skip = page.locator('button:has-text("Pular hoje")');
    if (await skip.count()) { await skip.click(); await page.waitForTimeout(300); }
    else break;
  }

  await page.click('button:has-text("⌨️ Tutorial de Teclado")');
  await page.waitForTimeout(500);

  await skipToEditorLevel(page);
  check('Chegou no nível "Editor de código"', (await page.locator('b:has-text("Editor de código")').count()) > 0);

  const editor = page.locator('[data-testid="kb-editor-wrapper"] textarea');
  check('O editor de verdade (VSEditor) aparece nesse nível', (await editor.count()) > 0);

  // desafio 1: parêntese fecha sozinho
  await editor.click();
  await editor.press('(');
  await page.waitForTimeout(200);
  check('Desafio 1 (parêntese): fechou sozinho e avançou pro desafio 2', (await editor.inputValue()) === '');

  // desafio 2: aspas fecham sozinhas
  await editor.press('"');
  await page.waitForTimeout(200);
  check('Desafio 2 (aspas): avançou pro desafio 3', (await editor.inputValue()) === '');

  // desafio 3: chaves fecham sozinhas
  await editor.press('{');
  await page.waitForTimeout(200);

  // desafio 4: Tab indenta
  await editor.press('Tab');
  await page.waitForTimeout(200);

  // desafio 5: chave + Enter expande o bloco
  await editor.press('{');
  await page.waitForTimeout(200);
  await editor.press('Enter');
  await page.waitForTimeout(200);

  // desafio 6: parêntese + Backspace apaga os dois, depois "x" termina o nível
  await editor.press('(');
  await page.waitForTimeout(200);
  await editor.press('Backspace');
  await page.waitForTimeout(200);
  await editor.press('x');
  await page.waitForTimeout(300);

  check('Depois dos 6 desafios, saiu do nível "Editor de código" (foi pro Teste final)', (await page.locator('text=Última etapa!').count()) > 0);
  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('TUTORIAL DE TECLADO: NÍVEL "EDITOR DE CÓDIGO" (FASE 7)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
