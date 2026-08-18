// Tutorial de teclado (Fase 8): revisão leve no final, adaptada por apoio, e pulada inteiramente
// no Modo Guiado (que sai do treino sozinho antes de chegar na revisão).
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

async function completeAllLevels(page) {
  for (const ch of 'abcdefghijklmnopqrstuvwxyz0123456789') await passTarget(page, ch);
  for (const ch of [' ', 'Enter', 'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) await passTarget(page, ch);
  for (const ch of 'NYXCODAR') await passTarget(page, ch, { shift: true });
  for (const ch of ['c', 'v', 'z', 'a']) await passTarget(page, ch, { ctrl: true });
  for (const ch of ['(', ')', '[', ']', '{', '}', '"', ';', '_', '=', '.', ',', '<', '>']) await passTarget(page, ch);
  for (const ch of ['+', '*', '/', '%', '!', '?', ':', "'", '\\', '&', '@', '$']) await passTarget(page, ch);
  for (const ch of ['ç', 'á', 'ã']) await passTarget(page, ch);

  // nível "Editor de código": 6 desafios
  const editor = page.locator('[data-testid="kb-editor-wrapper"] textarea');
  await editor.click();
  await editor.press('(');
  await page.waitForTimeout(200);
  await editor.press('"');
  await page.waitForTimeout(200);
  await editor.press('{');
  await page.waitForTimeout(200);
  await editor.press('Tab');
  await page.waitForTimeout(200);
  await editor.press('{');
  await page.waitForTimeout(200);
  await editor.press('Enter');
  await page.waitForTimeout(200);
  await editor.press('(');
  await page.waitForTimeout(200);
  await editor.press('Backspace');
  await page.waitForTimeout(200);
  await editor.press('x');
  await page.waitForTimeout(300);

  // "Teste final": digita a linha inteira
  const finalTextarea = page.locator('textarea').last();
  await finalTextarea.click();
  await finalTextarea.type('int x = 10;\nif (x > 5) { Console.WriteLine("Oi!"); }');
  await page.waitForTimeout(400);
}

async function openTutorialFor(page, kvStore, name) {
  const ctx = await page.context().browser().newContext({ viewport: { width: 1400, height: 950 } });
  const p = await ctx.newPage();
  const jsErrors = await mockRoutes(p, kvStore);
  await p.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);
  await p.click('text=Aluno');
  await p.waitForTimeout(500);
  await p.click('text=☀️ Matutino');
  await p.waitForTimeout(500);
  await p.click(`text=${name}`);
  await p.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skip = p.locator('button:has-text("Pular hoje")');
    if (await skip.count()) { await skip.click(); await p.waitForTimeout(300); }
    else break;
  }
  await p.click('button:has-text("⌨️ Tutorial de Teclado")');
  await p.waitForTimeout(500);
  return { ctx, page: p, jsErrors };
}

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoNormal', JSON.stringify({
    name: 'AlunoNormal', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));
  kvStore.set('student:matutino:AlunoApoio', JSON.stringify({
    name: 'AlunoApoio', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, selfSupport: { leitura: true },
  }));

  const browser = await launchBrowser();
  const bootstrapCtx = await browser.newContext();
  const bootstrapPage = await bootstrapCtx.newPage();

  // ── 1) aluno SEM apoio: revisão normal (4 perguntas) ──
  {
    const { ctx, page, jsErrors } = await openTutorialFor(bootstrapPage, kvStore, 'AlunoNormal');
    await completeAllLevels(page);
    check('Aluno sem apoio: revisão aparece com 4 perguntas (1/4)', (await page.locator('text=/Revisão rápida \\(1\\/4\\)/').count()) > 0);
    // responde a 1ª pergunta certo
    await page.locator('button:has-text("Backspace")').first().click();
    await page.waitForTimeout(300);
    check('Feedback de acerto aparece', (await page.locator('text=Isso mesmo!').count()) > 0);
    await page.waitForTimeout(1300);
    check('Avança pra pergunta 2/4', (await page.locator('text=/Revisão rápida \\(2\\/4\\)/').count()) > 0);
    check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ── 2) aluno COM apoio: revisão fácil (2 perguntas, mais concretas) ──
  {
    const { ctx, page, jsErrors } = await openTutorialFor(bootstrapPage, kvStore, 'AlunoApoio');
    await completeAllLevels(page);
    check('Aluno com apoio: revisão vem mais curta, só 2 perguntas (1/2)', (await page.locator('text=/Revisão rápida \\(1\\/2\\)/').count()) > 0);
    check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  await bootstrapCtx.close();
  await browser.close();
  process.exit(summary('TUTORIAL DE TECLADO: REVISÃO FINAL ADAPTATIVA (FASE 8)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
