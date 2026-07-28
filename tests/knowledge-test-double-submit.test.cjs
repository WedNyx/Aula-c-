// Teste de Conhecimento (autoavaliação livre, "🧠 Testar Conhecimento"): clicar 2x bem rápido em
// "Enviar respostas" não pode premiar o aluno 2x. submit() não tinha NENHUM bloqueio contra
// reentrância — dois cliques síncronos chamavam onAward() duas vezes, e como onFirstToday() também
// lia o estado por closure, os dois disparos viam "ainda não fiz hoje" ao mesmo tempo.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoTeste', JSON.stringify({
    name: 'AlunoTeste', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 20, score: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  // shuffleQuestions() embaralha as opções (e o índice "correct" junto) com Math.random() de
  // verdade — sem travar isso, "clicar sempre na opção 0" acerta só ~25% de cada pergunta na
  // média, o que fazia esse teste falhar aleatoriamente (às vezes as 4 perguntas saíam erradas e
  // a premiação nunca disparava, dando um falso negativo). Travando Math.random em 0, o
  // embaralhamento (Fisher-Yates) sempre resulta na MESMA permutação — daí dá pra saber de
  // antemão qual posição vai ser sempre a certa e responder 100% certo, sem depender de sorte.
  await page.addInitScript(() => { Math.random = () => 0; });
  const jsErrors = await mockRoutes(page, kvStore);

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoTeste', { timeout: 10000 });
  await page.click('text=AlunoTeste');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  await page.click('button:has-text("🧠 Testar Conhecimento")');
  await page.waitForTimeout(800);
  check('Modal do teste de conhecimento abriu', (await page.locator('text=Testar Conhecimento').count()) > 0);

  // com Math.random travado em 0, o embaralhamento de shuffleQuestions() sempre resulta na opção
  // de índice 3 sendo a certa (ver conta no comentário lá em cima) — respondendo sempre essa,
  // acerta as 4 de propósito, garantindo correct>0 pra ativar a premiação e expor a corrida
  await page.waitForSelector('div[data-q="0"] button[data-opt="0"]', { timeout: 10000 });
  const qCount = await page.locator('div[data-q]').count();
  for (let i = 0; i < qCount; i++) {
    await page.click(`div[data-q="${i}"] button[data-opt="3"]`);
  }

  const before = JSON.parse(kvStore.get('student:matutino:AlunoTeste'));

  // dois cliques SÍNCRONOS em "Enviar respostas", sem deixar o React re-renderizar (esconder o
  // botão) entre eles — mesma técnica usada pra reproduzir o bug do presente do dia
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Enviar respostas'));
    btn.click();
    btn.click();
  });
  await page.waitForTimeout(1000);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  check('Tela de resultado aparece (só 1x)', (await page.locator('text=/Você acertou \\d+ de \\d+/').count()) === 1);

  const after = JSON.parse(kvStore.get('student:matutino:AlunoTeste'));
  const gained = after.nyxPoints - before.nyxPoints;
  check('Pontos ganhos batem com UM envio só (correct×2, não o dobro disso)', gained > 0 && gained <= qCount * 2, `antes=${before.nyxPoints} depois=${after.nyxPoints} ganhou=${gained} (máx esperado ${qCount * 2})`);

  await ctx.close();
  await browser.close();
  process.exit(summary('TESTE DE CONHECIMENTO: SEM PREMIAÇÃO DUPLICADA NO ENVIO DUPLO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
