// Fluxo completo do aluno fazendo a prova, depois da correção que move a nota pro servidor: (1)
// o gabarito nunca aparece na resposta de rede que o navegador do aluno recebe, (2) mesmo assim o
// aluno consegue terminar a prova normalmente e a nota final bate certinho com o gabarito real.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  const questions = [
    { q: 'O que faz Console.WriteLine?', opts: ['Mostra texto na tela', 'Apaga a variável', 'Cria uma classe nova', 'Fecha o programa'], correct: 0 },
    { q: 'Qual tipo guarda números inteiros?', opts: ['string', 'int', 'bool', 'void'], correct: 1 },
    { q: 'O que é uma classe em C#?', opts: ['Um erro de sintaxe', 'Um número decimal', 'Um molde pra criar objetos', 'Um comentário no código'], correct: 2 },
    { q: 'O que faz um laço for?', opts: ['Repete um bloco de código', 'Apaga o bloco de código', 'Comenta o bloco de código', 'Compila o bloco de código'], correct: 0 },
    { q: 'Qual símbolo termina uma instrução em C#?', opts: ['vírgula', 'ponto', 'dois-pontos', 'ponto e vírgula'], correct: 3 },
  ];
  kvStore.set('exam:config:matutino', JSON.stringify({ status: 'active', questions, shift: 'matutino', activatedAt: Date.now() }));
  kvStore.set('student:matutino:AlunoProva', JSON.stringify({
    name: 'AlunoProva', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 10, score: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  // escuta toda resposta de /api/kv com action "get" pra confirmar que o GABARITO nunca trafega
  // pela rede até o navegador do aluno, em nenhum momento da prova
  let sawCorrectFieldOnWire = false;
  page.on('response', async (res) => {
    if (!res.url().includes('/api/kv')) return;
    try {
      const req = res.request();
      const postData = req.postData();
      if (!postData || !postData.includes('"action":"get"')) return;
      const bodyText = await res.text();
      if (bodyText.includes('exam:config') || /"q":"O que faz/.test(bodyText)) {
        if (/"correct"/.test(bodyText)) sawCorrectFieldOnWire = true;
      }
    } catch {}
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoProva', { timeout: 10000 });
  await page.click('text=AlunoProva');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  check('Tela da prova abre automaticamente (prova ativa pro turno do aluno)', (await page.locator('text=🏆 Prova —').count()) > 0);

  // responde as 5 perguntas, sempre acertando — acha o <p> com o texto EXATO da pergunta atual e
  // clica no botão certo dentro do mesmo cartão (por posição, não por texto da opção, já que
  // "ponto" é substring de "ponto e vírgula" e "int" podia bater em outro texto da página) — a
  // tela avança sozinha pra próxima pergunta não respondida a cada clique
  for (const q of questions) {
    await page.waitForSelector(`p:text-is("${q.q}")`, { timeout: 10000 });
    const clicked = await page.evaluate(({ qText, idx }) => {
      const ps = Array.from(document.querySelectorAll('p'));
      const target = ps.find(p => p.textContent.trim() === qText.trim());
      if (!target) return false;
      const buttons = Array.from(target.parentElement.querySelectorAll('button'));
      if (buttons[idx]) { buttons[idx].click(); return true; }
      return false;
    }, { qText: q.q, idx: q.correct });
    check(`Conseguiu responder a pergunta "${q.q.slice(0, 30)}..."`, clicked);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1000);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  check('O gabarito ("correct") NUNCA apareceu numa resposta de rede recebida pelo navegador do aluno', !sawCorrectFieldOnWire);

  const after = JSON.parse(kvStore.get('student:matutino:AlunoProva'));
  check('Prova marcada como concluída (examDone)', after.examDone === true);
  check('Nota final bate com 5/5 corretas (raw=50, sem saídas de aba)', after.examScore === 50 && after.examScoreRaw === 50, `examScore=${after.examScore} examScoreRaw=${after.examScoreRaw}`);
  check('nyxPoints aumentou de acordo com a nota (10 + 5 = 15)', after.nyxPoints === 15, `nyxPoints=${after.nyxPoints}`);

  await ctx.close();
  await browser.close();
  process.exit(summary('PROVA: CORREÇÃO NO SERVIDOR, GABARITO NUNCA VAI PRO NAVEGADOR') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
