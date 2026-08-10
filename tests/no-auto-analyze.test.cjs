// O Nyx só analisa o código do aluno quando ALGUÉM pede — clicando em "✨ Analisar código" ou no
// botão de reverificar dentro do card de erro. Ele NUNCA mais analisa sozinho: nem periodicamente
// (havia uma checagem silenciosa a cada 15min de inatividade) nem sozinho depois que o aluno edita
// uma linha marcada como erro (havia uma reverificação automática debounced). Esse teste conta
// quantas vezes o /api/claude foi chamado pra análise e confirma que só o clique manual dispara.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

const csharpCodeComErro = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi") } }'; // falta ";"
const csharpCodeCorrigido = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); } }';

(async () => {
  const kvStore = baseKvStore();
  kvStore.set('student:matutino:AlunoSemAuto', JSON.stringify({
    name: 'AlunoSemAuto', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: csharpCodeComErro }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  let analyzeCalls = 0;
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    const body = JSON.parse(route.request().postData() || '{}');
    if (String(body.prompt || '').includes('"errors"')) {
      analyzeCalls++;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify({
        analise: 'falta ;', ok: false, message: 'Falta um ; no fim da linha do Console.WriteLine.', missingChars: [';'],
        errors: [{ trecho: 'Console.WriteLine("oi")', explicacao: 'Falta o ; no fim da linha.', exemplo: 'Console.WriteLine("oi");' }],
      }) }] }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify({ ok: true, frases: ['Aprendeu C# de verdade.'] }) }] }) });
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoSemAuto', { timeout: 10000 });
  await page.click('text=AlunoSemAuto');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  // não digita nada por alguns segundos: nenhuma análise deve disparar sozinha nesse tempo parado
  await page.waitForTimeout(3000);
  check('Nenhuma análise dispara sozinha só de ficar parado (sem clicar em nada)', analyzeCalls === 0, `chamadas: ${analyzeCalls}`);

  // clique manual: dispara UMA análise, que aponta o erro (falta ";")
  await page.click('button:has-text("✨ Analisar código")');
  await page.waitForSelector('button:has-text("✨ Analisar código"):not(:has-text("Analisando"))', { timeout: 10000 });
  check('O clique manual disparou exatamente 1 análise', analyzeCalls === 1, `chamadas: ${analyzeCalls}`);
  check('O erro apontado apareceu (walkthrough do Nyx)', (await page.locator('text=/Falta um ;/').count()) > 0);

  // corrige a linha marcada (edita o código pra remover o erro) — antes, isso disparava uma
  // reverificação automática (debounced) sozinha; agora não deve disparar mais nada sozinho
  const editorArea = page.locator('[data-tour="editor"] textarea').first();
  await editorArea.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(csharpCodeCorrigido, { delay: 5 });
  await page.waitForTimeout(2500); // bem mais que o antigo debounce de 1200ms

  check('Corrigir a linha marcada NÃO dispara uma reverificação automática', analyzeCalls === 1, `chamadas: ${analyzeCalls}`);
  check('O aviso de erro some da tela mesmo sem reverificar (a linha marcada não existe mais)', (await page.locator('text=/Falta um ;/').count()) === 0);

  check('Sem erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  await ctx.close();
  await browser.close();
  process.exit(summary('NYX SÓ ANALISA QUANDO ALGUÉM PEDE — NUNCA MAIS SOZINHO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
