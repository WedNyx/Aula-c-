// Tutorial de teclado: a fala da Nyx agora é opcional — cada aluno liga/desliga com o botão
// "🔊 Voz" / "🔇 Voz" no cabeçalho do modal, e a escolha fica salva no aparelho (localStorage),
// sobrevivendo a um F5. Antes disso a Nyx sempre falava, sem opção de desativar.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoVoz', JSON.stringify({
    name: 'AlunoVoz', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();

  // stub do speak() do window.speechSynthesis NATIVO: só troca o método, sem recriar o objeto
  // inteiro (window.speechSynthesis é uma propriedade só-leitura do navegador — reatribuir o
  // objeto inteiro falha silenciosamente; sobrescrever o método nele funciona normalmente)
  await page.addInitScript(() => {
    window.__speakCalls = 0;
    const synth = window.speechSynthesis;
    if (synth) {
      synth.speak = (u) => { window.__speakCalls++; window.__lastSpoken = u && u.text; };
      synth.cancel = () => {};
      synth.pause = () => {};
      synth.resume = () => {};
      synth.getVoices = () => [];
    }
  });

  const jsErrors = await mockRoutes(page, kvStore);

  async function login() {
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('text=☀️ Matutino');
    await page.waitForTimeout(500);
    await page.click('text=AlunoVoz');
    await page.waitForTimeout(1200);
    for (let i = 0; i < 5; i++) {
      const skip = page.locator('button:has-text("Pular hoje")');
      if (await skip.count()) { await skip.click(); await page.waitForTimeout(300); }
      else break;
    }
  }
  async function openTutorial() {
    await page.click('button:has-text("⌨️ Tutorial de Teclado")');
    await page.waitForTimeout(500);
  }

  await login();
  await openTutorial();

  // ── por padrão a voz está ligada, e a Nyx já fala a explicação do 1º alvo ao abrir ──
  check('Botão de voz começa LIGADO ("🔊 Voz")', (await page.locator('button:has-text("🔊 Voz")').count()) > 0);
  const callsOnOpen = await page.evaluate(() => window.__speakCalls);
  check('A Nyx já falou pelo menos 1 vez ao abrir o tutorial (voz ligada por padrão)', callsOnOpen > 0, `callsOnOpen=${callsOnOpen}`);

  // ── desliga a voz: erra uma tecla de propósito e confirma que NÃO fala mais ──
  await page.click('button:has-text("🔊 Voz")');
  await page.waitForTimeout(200);
  check('Depois de clicar, o botão vira "🔇 Voz"', (await page.locator('button:has-text("🔇 Voz")').count()) > 0);
  await page.evaluate(() => { window.__speakCalls = 0; });
  await page.keyboard.press('KeyZ'); // alvo certo é "a", "z" é erro de propósito
  await page.waitForTimeout(300);
  const callsAfterToggleOff = await page.evaluate(() => window.__speakCalls);
  check('Com a voz desligada, errar a tecla NÃO chama speak()', callsAfterToggleOff === 0, `callsAfterToggleOff=${callsAfterToggleOff} lastSpoken=${await page.evaluate(()=>window.__lastSpoken)}`);
  check('Mesmo com a voz desligada, a dica de repetir ainda aparece na tela', (await page.locator('text=Sem pressa').count()) > 0);

  // ── recarrega a página (login de novo — a sessão não persiste sozinha) e confirma que a
  // preferência de voz desligada sobreviveu (fica salva no localStorage do aparelho) ──
  await login();
  await openTutorial();
  check('Depois de recarregar a página, a voz continua desligada ("🔇 Voz")', (await page.locator('button:has-text("🔇 Voz")').count()) > 0);
  const callsAfterReloadOpen = await page.evaluate(() => window.__speakCalls);
  check('Com a voz desligada, abrir o tutorial de novo NÃO fala nada', callsAfterReloadOpen === 0, `callsAfterReloadOpen=${callsAfterReloadOpen}`);

  // ── liga de novo: volta a falar ──
  await page.click('button:has-text("🔇 Voz")');
  await page.waitForTimeout(200);
  check('Clicando de novo, o botão volta pra "🔊 Voz"', (await page.locator('button:has-text("🔊 Voz")').count()) > 0);
  await page.evaluate(() => { window.__speakCalls = 0; });
  await page.keyboard.press('KeyZ');
  await page.waitForTimeout(300);
  check('Com a voz ligada de novo, errar a tecla volta a chamar speak()', (await page.evaluate(() => window.__speakCalls)) > 0);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('TUTORIAL DE TECLADO: BOTÃO DE VOZ OPCIONAL (LIGA/DESLIGA)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
