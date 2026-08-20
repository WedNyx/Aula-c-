// Quando o código que o professor passou HOJE pra uma turma é EXATAMENTE igual ao de uma aula que
// já tem conteúdo pronto salvo em "Minhas aulas", tanto "Gerar nome do conteúdo" (professor) quanto
// o resumo/atividade de "Salvar e Finalizar Aula" (aluno) reaproveitam esse conteúdo pronto, sem
// gastar o Nyx de novo — a MESMA aula pronta serve pra turma inteira, quantas vezes for usada.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const lessonFiles = [{ name: 'Program.cs', code: 'int x = 1;\nConsole.WriteLine(x);' }];
  const readyLesson = {
    title: 'Aula de Variáveis',
    files: lessonFiles,
    at: Date.now(),
    contentName: 'Variáveis e Saída de Texto',
    explain: { intro: 'Explicação pronta.', secoes: [{ titulo: 'Variáveis', explicacao: 'Guardam valores.' }], dica: 'Pratique!' },
    resumo: { intro: 'Resumo pronto da aula de variáveis!', secoes: [{ emoji: '💡', titulo: 'Variáveis prontas', explicacao: 'Conteúdo reaproveitado.', exemplo: 'int x = 1;' }], dica: 'Dica pronta!' },
    atividade: Array.from({ length: 8 }, (_, i) => ({ q: `Pergunta pronta ${i + 1}?`, opts: ['A', 'B', 'C', 'D'], correct: 0 })),
  };

  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('teachercode:lessons', JSON.stringify([readyLesson]));
  // o código que o professor "passou hoje" pra matutino é EXATAMENTE o da aula pronta
  kvStore.set('teachercode:matutino', JSON.stringify({ files: lessonFiles, at: Date.now() }));
  kvStore.set('student:matutino:AlunoReaproveita', JSON.stringify({
    name: 'AlunoReaproveita', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int meucodigo = 99;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));

  const browser = await launchBrowser();

  // rastreia TODO pedido de IA feito por qualquer aba, pra confirmar que reaproveitar não gera
  // nenhuma chamada nova além da "curiosidade do dia" (automática, sem relação com o conteúdo)
  const allPrompts = [];
  const trackClaude = async (page) => {
    await page.route('**/api/claude', async (route) => {
      if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
      const body = JSON.parse(route.request().postData() || '{}');
      allPrompts.push(body.prompt || '');
      // o professor gera o resumo no PRÓPRIO painel antes de enviar pra turma (fluxo em 2 passos) —
      // isso precisa de uma resposta com "secoes" de verdade pra chegar a existir; o resto do teste
      // continua conferindo que NENHUMA chamada extra acontece do lado do aluno (reaproveitamento)
      const isResumoReq = (body.prompt || '').includes('"secoes"');
      const text = isResumoReq
        ? JSON.stringify({ intro: 'Resumo gerado pelo professor no painel.', secoes: [{ emoji: '📝', titulo: 'Conceito do professor', explicacao: 'x', exemplo: 'y' }], dica: 'd' })
        : JSON.stringify({ ok: true, frases: ['isso não devia ter sido chamado'] });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text }] }) });
    });
  };

  // ── professor: "Gerar nome do conteúdo" reaproveita o nome pronto, sem chamar o Nyx ──
  const ctxT = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await trackClaude(pageT);
  await loginTeacher(pageT);
  await pageT.waitForTimeout(1000);
  await pageT.click('text=👨‍💻 Meu código');
  await pageT.waitForTimeout(500);

  const callsBeforeContentName = allPrompts.length;
  await pageT.click('button:has-text("Gerar nome do conteúdo (Matutino)")');
  await pageT.waitForTimeout(1500);
  check('Gerar nome do conteúdo NÃO chamou o Nyx (reaproveitou o nome pronto)', allPrompts.length === callsBeforeContentName, JSON.stringify(allPrompts.slice(callsBeforeContentName)));
  check('O nome pronto da aula aparece na tela', (await pageT.locator('text=Variáveis e Saída de Texto').count()) > 0);
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  // ── professor libera o resumo pra turma hoje ──
  await pageT.click('[data-tour-prof="resumo-ritmo"] button:has-text("Gerar resumo")');
  await pageT.waitForTimeout(1200);
  await pageT.click('[data-tour-prof="resumo-ritmo"] button:has-text("Enviar pra turma toda")');
  await pageT.waitForTimeout(600);

  // ── aluno: finaliza a aula sozinho e recebe o resumo/atividade PRONTOS, sem chamar o Nyx ──
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageA = await ctxA.newPage();
  const jsErrorsA = await mockRoutes(pageA, kvStore);
  await trackClaude(pageA);
  await pageA.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await pageA.waitForTimeout(700);
  await pageA.click('text=Aluno');
  await pageA.waitForTimeout(500);
  await pageA.click('text=☀️ Matutino');
  await pageA.waitForTimeout(500);
  await pageA.waitForSelector('text=AlunoReaproveita', { timeout: 10000 });

  const callsBeforeStudent = allPrompts.length;
  await pageA.click('text=AlunoReaproveita');
  await pageA.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = pageA.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await pageA.waitForTimeout(300); }
    else break;
  }
  await pageA.waitForSelector('text=Resumo da sua aula', { timeout: 20000 });

  check('O resumo PRONTO (da aula) aparece pro aluno', (await pageA.locator('text=/Resumo pronto da aula de variáveis|Variáveis prontas/').count()) > 0);
  // chamadas esperadas nesse trecho, sem relação com o resumo/atividade: a "curiosidade do dia"
  // (automática) e a revisão automática do código feita como um compilador (dispara sozinha quando
  // o código do aluno carrega no editor)
  const newPrompts = allPrompts.slice(callsBeforeStudent);
  const unexpected = newPrompts.filter(p => !p.includes('curiosidade') && !p.includes('Revise este código'));
  check('Gerar o resumo/atividade do aluno NÃO chamou o Nyx (reaproveitou o conteúdo pronto)', unexpected.length === 0, JSON.stringify(unexpected));

  const alunoAfter = JSON.parse(kvStore.get('student:matutino:AlunoReaproveita'));
  check('O resumo salvo no perfil do aluno é o pronto da aula', alunoAfter.summaryHistory?.[Object.keys(alunoAfter.summaryHistory)[0]]?.intro === readyLesson.resumo.intro, JSON.stringify(alunoAfter.summaryHistory));
  check('A atividade salva tem as 8 perguntas prontas', Array.isArray(alunoAfter.dynamicActivity) && alunoAfter.dynamicActivity.length === 8 && alunoAfter.dynamicActivity[0].q.startsWith('Pergunta pronta'), JSON.stringify(alunoAfter.dynamicActivity?.[0]));
  check('SEM erro de JS (aluno)', jsErrorsA.length === 0, jsErrorsA.slice(0, 5).join(' | '));

  await ctxT.close();
  await ctxA.close();
  await browser.close();
  process.exit(summary('CONTEÚDO PRONTO DA AULA É REAPROVEITADO (NOME + RESUMO + ATIVIDADE), SEM CHAMAR O NYX') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
