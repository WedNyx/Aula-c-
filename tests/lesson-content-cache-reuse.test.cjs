// Quando o código que o professor passou HOJE pra uma turma é EXATAMENTE igual ao de uma aula que
// já tem conteúdo pronto salvo em "Minhas aulas", "Gerar nome do conteúdo" reaproveita o nome
// pronto, sem gastar o Nyx de novo.
//
// (O reaproveitamento de RESUMO/ATIVIDADE prontos que existia aqui foi baseado no fluxo antigo de
// "Salvar e Finalizar Aula" do aluno — cada aluno finalizava a própria aula sozinho, e aí sim fazia
// sentido comparar com uma aula salva pra evitar gerar de novo pra CADA UM. Esse fluxo não existe
// mais: agora o professor gera o resumo/atividade UMA VEZ e manda pronto pra turma toda (ver
// resumo-broadcast.test.cjs), o que já evita a repetição por aluno sem precisar de reaproveitamento
// nenhum. A biblioteca "Minhas aulas" continua com seu próprio reaproveitamento de conteúdo pronto,
// mas isso é testado em lesson-content-cache-generate.test.cjs e lesson-content-import.test.cjs.)
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const lessonFiles = [{ name: 'Program.cs', code: 'int x = 1;\nConsole.WriteLine(x);' }];
  const readyLesson = {
    title: 'Aula de Variáveis',
    files: lessonFiles,
    at: Date.now(),
    // aulas agora são filtradas por turno (lessonsForShift) tanto na biblioteca quanto no
    // reaproveitamento automático (findMatchingLesson) — sem "shift", uma aula "sem turno" não bate
    // com o código "de hoje" de um turno específico como matutino
    shift: 'matutino',
    contentName: 'Variáveis e Saída de Texto',
    explain: { intro: 'Explicação pronta.', secoes: [{ titulo: 'Variáveis', explicacao: 'Guardam valores.' }], dica: 'Pratique!' },
    resumo: { intro: 'Resumo pronto da aula de variáveis!', secoes: [{ emoji: '💡', titulo: 'Variáveis prontas', explicacao: 'Conteúdo reaproveitado.', exemplo: 'int x = 1;' }], dica: 'Dica pronta!' },
    atividade: Array.from({ length: 8 }, (_, i) => ({ q: `Pergunta pronta ${i + 1}?`, opts: ['A', 'B', 'C', 'D'], correct: 0 })),
  };

  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('teachercode:lessons', JSON.stringify([readyLesson]));
  // o código que o professor "passou hoje" pra matutino é EXATAMENTE o da aula pronta
  kvStore.set('teachercode:matutino', JSON.stringify({ files: lessonFiles, at: Date.now() }));

  const browser = await launchBrowser();

  let calls = 0;
  const ctxT = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await pageT.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    calls++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: 'isso não devia ter sido chamado' }] }) });
  });
  await loginTeacher(pageT);
  await pageT.waitForTimeout(1000);
  await pageT.click('text=Meu código');
  await pageT.waitForTimeout(500);

  const callsBefore = calls;
  await pageT.click('button:has-text("Gerar nome do conteúdo (Matutino)")');
  await pageT.waitForTimeout(1500);
  check('Gerar nome do conteúdo NÃO chamou o Nyx (reaproveitou o nome pronto)', calls === callsBefore, `calls=${calls - callsBefore}`);
  check('O nome pronto da aula aparece na tela', (await pageT.locator('text=Variáveis e Saída de Texto').count()) > 0);
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  await ctxT.close();
  await browser.close();
  process.exit(summary('MINHAS AULAS: NOME DO CONTEÚDO REAPROVEITADO SEM CHAMAR O NYX') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
