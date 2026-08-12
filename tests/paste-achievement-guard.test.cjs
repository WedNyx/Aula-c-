// A conquista "🏗️ Arquiteto de Código" (100 linhas de código no projeto) era concedida mesmo se o
// aluno só COLASSE um bloco pronto de código no editor, em vez de escrever — um caso real aconteceu
// (aluno colou um código de mais de 100 linhas e ganhou a conquista sem ter escrito nada). Agora o
// editor conta quantas linhas vieram de um Ctrl+V (cumulativo, "pastedLines") e a conquista só
// destrava quando (linhas totais − linhas coladas) chega em 100, ou seja, precisa ter DIGITADO
// o suficiente — colar não trava pra sempre, só não conta como progresso sozinho.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const baseCode = Array.from({ length: 10 }, (_, i) => `int v${i} = ${i};`).join('\n'); // 10 linhas "digitadas" de base
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoColou', JSON.stringify({
    name: 'AlunoColou', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: baseCode }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, achievements: [],
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
  await page.waitForSelector('text=AlunoColou', { timeout: 10000 });
  await page.click('text=AlunoColou');
  await page.waitForTimeout(1500); // carrega o perfil e roda o primeiro tick()

  // simula colar (Ctrl+V) um bloco pronto de 120 linhas não-vazias no editor — dispara o evento
  // "paste" nativo (que o CodeEditor escuta) E insere o texto de verdade, como um paste real faria
  const pastedChunk = '\n' + Array.from({ length: 120 }, (_, i) => `Console.WriteLine(${i});`).join('\n');
  await page.evaluate((text) => {
    const ta = document.querySelector('[data-tour="editor"] textarea');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    const dt = new DataTransfer();
    dt.setData('text', text);
    ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    nativeSetter.call(ta, ta.value + text);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, pastedChunk);
  await page.waitForTimeout(500);

  const editorValue = await page.locator('[data-tour="editor"] textarea').inputValue();
  check('O texto colado realmente entrou no editor (chegou a 100+ linhas no total)', editorValue.split('\n').filter(l => l.trim()).length >= 100);

  // espera o próximo autosave/tick (a cada 12s) reavaliar a conquista com o código já colado
  await page.waitForTimeout(13000);

  const afterPaste = JSON.parse(kvStore.get('student:matutino:AlunoColou'));
  check('Colar 100+ linhas prontas NÃO desbloqueia "Arquiteto de Código" sozinho', !(afterPaste.achievements || []).includes('cem-linhas'), JSON.stringify(afterPaste.achievements));
  check('O contador de linhas coladas registrou o que foi colado', (afterPaste.pastedLines || 0) >= 100, String(afterPaste.pastedLines));

  // agora o aluno digita mais 100 linhas de VERDADE (sem disparar o evento "paste") — a conquista
  // precisa destravar normalmente, confirmando que colar não trava a conquista pra sempre
  const typedExtra = '\n' + Array.from({ length: 100 }, (_, i) => `int extra${i} = ${i};`).join('\n');
  await page.evaluate((text) => {
    const ta = document.querySelector('[data-tour="editor"] textarea');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeSetter.call(ta, ta.value + text);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, typedExtra);
  await page.waitForTimeout(13000);

  const afterTyping = JSON.parse(kvStore.get('student:matutino:AlunoColou'));
  check('Depois de digitar de verdade o suficiente, a conquista destrava normalmente', (afterTyping.achievements || []).includes('cem-linhas'), JSON.stringify(afterTyping.achievements));

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('CONQUISTA "ARQUITETO DE CÓDIGO" IGNORA LINHAS COLADAS') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
