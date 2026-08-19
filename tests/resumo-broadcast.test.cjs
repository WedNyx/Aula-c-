// Resumo gerado uma vez no painel do professor (a partir do código QUE ELE escreveu) e enviado
// pronto pra turma inteira — em vez de cada aluno pedir o próprio resumo pro Nyx (já que eles só
// copiam o código do professor, é redundante e inconsistente gerar de novo pra cada um).
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('/home/user/Aula-c-/tests/helpers.cjs');

(async () => {
  const csharpCode = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); } }';
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  // professor já tem o código dessa aula salvo pra turma (o que ele "passou" — o que os alunos copiam)
  kvStore.set('teachercode:matutino', JSON.stringify({ files: [{ name: 'Program.cs', code: csharpCode }], at: Date.now() }));
  kvStore.set('student:matutino:AlunoQueCopiou', JSON.stringify({
    name: 'AlunoQueCopiou', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: csharpCode }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));

  const browser = await launchBrowser();

  // ── professor: gera e libera o resumo (deve consultar o Nyx UMA VEZ, com o próprio código) ──
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  let teacherClaudeCalls = 0;
  pageT.on('request', req => {
    if (req.url().includes('/api/claude') && req.method() === 'POST') {
      const body = req.postData() || '';
      if (body.includes('secoes') && !body.includes('CONTINUAÇÃO do resumo') && body.includes('questions') === false) teacherClaudeCalls++;
    }
  });
  await loginTeacher(pageT);
  await pageT.click('text=👨‍💻 Meu código');
  await pageT.waitForTimeout(500);
  await pageT.locator('[data-tour-prof="resumo-ritmo"]').locator('button:has-text("Gerar e liberar resumo pra turma")').click();
  await pageT.waitForTimeout(1200);
  check('Professor: exatamente 1 chamada ao Nyx pra gerar o resumo (uma vez só, não por aluno)', teacherClaudeCalls === 1, `calls=${teacherClaudeCalls}`);
  check('Mensagem confirma que o resumo foi GERADO (não só liberado)', (await pageT.locator('text=/Resumo gerado e liberado/').count()) > 0);
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  const trig = JSON.parse(kvStore.get('resumotrigger:matutino'));
  check('Gatilho salvo já carrega o resumo pronto (não só a data)', trig?.resumo && Array.isArray(trig.resumo.secoes) && trig.resumo.secoes.length > 0, JSON.stringify(trig));

  // ── aluno que copiou o código do professor: recebe o MESMO resumo, sem gerar o próprio ──
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageA = await ctxA.newPage();
  const jsErrorsA = await mockRoutes(pageA, kvStore);
  let studentResumoClaudeCalls = 0;
  pageA.on('request', req => {
    if (req.url().includes('/api/claude') && req.method() === 'POST') {
      const body = req.postData() || '';
      if (body.includes('secoes') && !body.includes('CONTINUAÇÃO do resumo') && body.includes('questions') === false) studentResumoClaudeCalls++;
    }
  });
  await pageA.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await pageA.waitForTimeout(700);
  await pageA.click('text=Aluno');
  await pageA.waitForTimeout(500);
  await pageA.click('text=☀️ Matutino');
  await pageA.waitForTimeout(500);
  await pageA.waitForSelector('text=AlunoQueCopiou', { timeout: 10000 });
  await pageA.click('text=AlunoQueCopiou');
  await pageA.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = pageA.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await pageA.waitForTimeout(300); }
    else break;
  }
  await pageA.waitForSelector('text=Resumo da sua aula', { timeout: 20000 });
  check('Aluno foi pro resumo sozinho', (await pageA.locator('text=Resumo da sua aula').count()) > 0);
  check('Aluno: ZERO chamadas novas ao Nyx pra gerar resumo (reaproveitou o do professor)', studentResumoClaudeCalls === 0, `calls=${studentResumoClaudeCalls}`);
  check('SEM erro de JS (aluno)', jsErrorsA.length === 0, jsErrorsA.slice(0, 3).join(' | '));

  const after = JSON.parse(kvStore.get('student:matutino:AlunoQueCopiou'));
  const savedSummary = after.summaryHistory?.[Object.keys(after.summaryHistory || {})[0]];
  check('Resumo salvo no caderno do aluno é EXATAMENTE o que o professor gerou',
    JSON.stringify(savedSummary) === JSON.stringify(trig.resumo), JSON.stringify(savedSummary));
  check('phase virou "summary"', after.phase === 'summary', after.phase);

  await ctxT.close();
  await ctxA.close();
  await browser.close();
  process.exit(summary('RESUMO GERADO NO PAINEL DO PROFESSOR E ENVIADO PRONTO PRA TURMA') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
