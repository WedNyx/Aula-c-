// Editor de código (VSEditor): digitar um parêntese/aspas/colchete com um TEXTO SELECIONADO
// precisa ENVOLVER a seleção (igual ao VS Code de verdade), não apagar o que tava selecionado e
// deixar só um par vazio. E apertar Tab com uma seleção de VÁRIAS linhas precisa indentar cada
// linha, não apagar o bloco inteiro selecionado e trocar por um bloco de 4 espaços só.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoEditor', JSON.stringify({
    name: 'AlunoEditor', shift: 'matutino', avatar: {},
    files: [{ name: 'Program.cs', code: 'int nome = 1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoEditor', { timeout: 10000 });
  await page.click('text=AlunoEditor');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  await page.waitForSelector('textarea', { timeout: 10000 });
  check('Editor de código carregou com o código salvo', (await page.locator('textarea').inputValue()) === 'int nome = 1;');

  // ── 1) aspas com seleção: selecionar "nome" e digitar " precisa virar "nome" (envolvendo),
  // não apagar "nome" e deixar só um par de aspas vazio no lugar ──
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    const start = ta.value.indexOf('nome');
    const end = start + 'nome'.length;
    ta.focus();
    ta.setSelectionRange(start, end);
    const ev = new KeyboardEvent('keydown', { key: '"', bubbles: true, cancelable: true });
    ta.dispatchEvent(ev);
  });
  await page.waitForTimeout(300);
  const afterQuote = await page.locator('textarea').inputValue();
  check('Aspas com seleção ENVOLVE o texto selecionado (não apaga)', afterQuote === 'int "nome" = 1;', `valor: ${JSON.stringify(afterQuote)}`);

  // ── 2) parênteses com seleção: mesma lógica, envolvendo em vez de apagar ──
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    const nomeStart = ta.value.indexOf('nome');
    const selStart = nomeStart - 1; // a aspa de abertura, logo antes de "nome"
    const selEnd = selStart + '"nome"'.length; // seleciona `"nome"` inteiro (com as duas aspas)
    ta.focus();
    ta.setSelectionRange(selStart, selEnd);
    const ev = new KeyboardEvent('keydown', { key: '(', bubbles: true, cancelable: true });
    ta.dispatchEvent(ev);
  });
  await page.waitForTimeout(300);
  const afterParen = await page.locator('textarea').inputValue();
  check('Parêntese com seleção ENVOLVE o texto selecionado (não apaga)', afterParen === 'int ("nome") = 1;', `valor: ${JSON.stringify(afterParen)}`);

  // ── 3) Tab com seleção de VÁRIAS linhas: indenta cada linha, não apaga o bloco selecionado ──
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    ta.focus();
    ta.setSelectionRange(0, ta.value.length);
    // substitui o conteúdo por 3 linhas conhecidas, disparando o onChange normal do React
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, 'linha1\nlinha2\nlinha3');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    ta.focus();
    ta.setSelectionRange(0, ta.value.length); // seleciona as 3 linhas inteiras
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    ta.dispatchEvent(ev);
  });
  await page.waitForTimeout(300);
  const afterTab = await page.locator('textarea').inputValue();
  check('Tab com seleção de várias linhas INDENTA cada linha (não apaga o bloco)', afterTab === '    linha1\n    linha2\n    linha3', `valor: ${JSON.stringify(afterTab)}`);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('EDITOR DE CÓDIGO: SELEÇÃO COM ASPAS/PARÊNTESES/TAB') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
