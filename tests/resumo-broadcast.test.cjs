// Resumo gerado uma vez no painel do professor (a partir do código QUE ELE escreveu) e enviado
// pronto pra turma inteira — em vez de cada aluno pedir o próprio resumo pro Nyx (já que eles só
// copiam o código do professor, é redundante e inconsistente gerar de novo pra cada um).
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

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
  // painel de materiais atual: "Resumos, atividades e provas" (codeShift já começa em "matutino")
  await pageT.click('text=Resumos, atividades e provas');
  await pageT.waitForTimeout(500);
  const ritmoCardT = pageT.locator('[data-tour-prof="resumo-ritmo"]');
  await ritmoCardT.locator('button:has-text("✨ Gerar rascunho com Nyx")').click();
  await pageT.waitForSelector('text=✅ Material pronto para revisão', { timeout: 20000 });
  check('Professor: exatamente 1 chamada ao Nyx pra gerar o resumo (uma vez só, não por aluno)', teacherClaudeCalls === 1, `calls=${teacherClaudeCalls}`);
  check('Mensagem confirma que o resumo foi guardado no Caderno do professor', (await ritmoCardT.locator('text=/guardado no seu Caderno/').count()) > 0);
  await ritmoCardT.locator('button:has-text("📤 Escolher e enviar")').click();
  await pageT.waitForTimeout(500);
  await pageT.click('button:has-text("Confirmar envio")');
  await pageT.waitForTimeout(800);
  check('Mensagem confirma envio pro Caderno dos alunos', (await pageT.locator('text=/Resumo enviado pro Caderno/').count()) > 0);
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
    const closeSanctuary = pageA.locator('[aria-label="Fechar Santuário Lunar"]');
    if (await closeSanctuary.count()) { await closeSanctuary.click({ force: true }); await pageA.waitForTimeout(300); continue; }
    const skipCheckin = pageA.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await pageA.waitForTimeout(300); }
    else break;
  }
  // resumo chega QUIETO no Caderno — sem tela cheia, sem tirar o aluno do editor
  await pageA.waitForTimeout(1500);
  check('Aluno CONTINUA no editor de código (sem tela cheia forçada)', (await pageA.locator('[data-tour="editor"]').count()) > 0);
  check('Tela de "Resumo da sua aula" NÃO aparece mais (entrega é silenciosa)', (await pageA.locator('text=Resumo da sua aula').count()) === 0);
  check('Bolinha "novo" aparece no Caderno, avisando que chegou material', (await pageA.locator('button[data-tour="caderno"]').innerText()).includes('novo'));
  check('Aluno: ZERO chamadas novas ao Nyx pra gerar resumo (reaproveitou o do professor)', studentResumoClaudeCalls === 0, `calls=${studentResumoClaudeCalls}`);
  check('SEM erro de JS (aluno)', jsErrorsA.length === 0, jsErrorsA.slice(0, 3).join(' | '));

  const after = JSON.parse(kvStore.get('student:matutino:AlunoQueCopiou'));
  const savedSummary = after.summaryHistory?.[Object.keys(after.summaryHistory || {})[0]];
  check('Resumo salvo no caderno do aluno é EXATAMENTE o que o professor gerou',
    JSON.stringify(savedSummary) === JSON.stringify(trig.resumo), JSON.stringify(savedSummary));
  check('phase continua "coding" (entrega não força fase nenhuma)', after.phase === 'coding', after.phase);

  // abre o Caderno e confirma que o resumo aparece lá (este rascunho via IA não tem atividade —
  // só "Escrever manualmente" ou "Minhas aulas" geram atividade junto; ver resumo-direct-push e
  // lesson-content-cache-generate para a atividade aparecendo separada, dentro do Caderno)
  await pageA.click('button[data-tour="caderno"]');
  await pageA.waitForTimeout(600);
  check('Modal do Caderno abre com o resumo', (await pageA.locator('text=📒 Meu caderno').count()) > 0);
  check('Resumo aparece no Caderno', (await pageA.locator('text=Variáveis').count()) > 0);

  await ctxT.close();
  await ctxA.close();
  await browser.close();
  process.exit(summary('RESUMO GERADO NO PAINEL DO PROFESSOR E ENVIADO PRONTO PRA TURMA') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
