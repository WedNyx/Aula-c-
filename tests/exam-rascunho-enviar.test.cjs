// A prova (IA ou manual) agora segue o mesmo padrão do resumo/atividade e do "Enviar código da
// turma": fica como RASCUNHO, guardada só com o professor, e só passa a valer/aparecer pra turma
// depois de um envio explícito ("📤 Enviar para <turma>"). Antes disso, o status "draft" nunca
// pode aparecer pro aluno (getExamStateForStudent trata "draft" como se não houvesse prova).
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const csharpCode = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); } }';
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('teachercode:matutino', JSON.stringify({ files: [{ name: 'Program.cs', code: csharpCode }], at: Date.now() }));
  kvStore.set('student:matutino:AlunoProva', JSON.stringify({
    name: 'AlunoProva', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: csharpCode }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));

  const browser = await launchBrowser();
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('text=Resumos, atividades e provas');
  await pageT.waitForTimeout(400);
  await pageT.click('text=📋 Provas');
  await pageT.waitForTimeout(400);

  // 1) gera com o Nyx — deve virar RASCUNHO, não ir direto pra turma
  await pageT.click('button:has-text("Gerar prova com Nyx")');
  await pageT.waitForTimeout(1500);
  check('Mensagem confirma que é um RASCUNHO (não que já foi liberado pra turma)', (await pageT.locator('text=/Rascunho da prova pronto/').count()) > 0);
  check('Card de revisão do rascunho aparece', (await pageT.locator('text=📄 Rascunho pronto para revisão').count()) > 0);
  check('Card avisa que a turma ainda não vê nada', (await pageT.locator('text=/ainda não vê nada/').count()) > 0);

  const draftSaved = JSON.parse(kvStore.get('exam:config:matutino'));
  check('exam:config já guarda o rascunho no servidor', draftSaved?.status === 'draft', JSON.stringify(draftSaved));
  check('Rascunho ainda não tem startedAt/studyUntil (não começou revisão pra ninguém)', !draftSaved.startedAt && !draftSaved.studyUntil, JSON.stringify(draftSaved));

  // 2) aluno NÃO pode ver a prova enquanto for só rascunho
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageA = await ctxA.newPage();
  const jsErrorsA = await mockRoutes(pageA, kvStore);
  await pageA.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await pageA.waitForTimeout(700);
  await pageA.click('text=Aluno');
  await pageA.waitForTimeout(500);
  await pageA.click('text=☀️ Matutino');
  await pageA.waitForTimeout(500);
  await pageA.waitForSelector('text=AlunoProva', { timeout: 10000 });
  await pageA.click('text=AlunoProva');
  await pageA.waitForTimeout(1500);
  for (let i = 0; i < 8; i++) {
    const closeSanctuary = pageA.locator('[aria-label="Fechar Santuário Lunar"]');
    const skipCheckin = pageA.locator('button:has-text("Pular hoje")');
    if (await closeSanctuary.count()) { await closeSanctuary.click({ force: true }); await pageA.waitForTimeout(400); }
    else if (await skipCheckin.count()) { await skipCheckin.click({ force: true }); await pageA.waitForTimeout(400); }
    else break;
  }
  check('Aluno NÃO vê nenhuma tela de prova/revisão enquanto for rascunho', (await pageA.locator('text=Hora da Prova!').count()) === 0 && (await pageA.locator('text=/questão/i').count()) === 0);
  check('SEM erro de JS (aluno, ainda em rascunho)', jsErrorsA.length === 0, jsErrorsA.slice(0, 3).join(' | '));

  // 3) professor envia o rascunho pra turma
  await pageT.click('button:has-text("📤 Enviar para")');
  await pageT.waitForTimeout(1000);
  check('Mensagem confirma que a prova FOI enviada', (await pageT.locator('text=/Prova enviada!/').count()) > 0);
  check('Fase de Revisão aparece depois do envio', (await pageT.locator('text=📝 Fase de Revisão').count()) > 0);
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  const sentConfig = JSON.parse(kvStore.get('exam:config:matutino'));
  check('exam:config virou "review" só depois do envio explícito', sentConfig.status === 'review', JSON.stringify(sentConfig));
  check('startedAt/studyUntil só foram definidos no envio', !!sentConfig.startedAt && !!sentConfig.studyUntil, JSON.stringify(sentConfig));

  // 4) SÓ agora o aluno vê a fase de revisão (o heartbeat do aluno roda a cada 12s)
  await pageA.waitForSelector('text=Hora da Prova!', { timeout: 30000 });
  check('Aluno agora vê a fase de revisão da prova (depois do envio)', (await pageA.locator('text=Hora da Prova!').count()) > 0);
  check('SEM erro de JS (aluno, depois do envio)', jsErrorsA.length === 0, jsErrorsA.slice(0, 3).join(' | '));

  await ctxT.close();
  await ctxA.close();
  await browser.close();
  process.exit(summary('PROVA: RASCUNHO GUARDADO COM O PROFESSOR, SÓ VISÍVEL PRA TURMA DEPOIS DO ENVIO EXPLÍCITO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
