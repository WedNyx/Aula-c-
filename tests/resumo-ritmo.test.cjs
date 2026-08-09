// Ritmo do resumo (aba "Meu código"): o professor define a cada quantas aulas de código a turma
// tem 1 aula de resumo, e clica em "Liberar resumo pra turma hoje" quando chegar a hora — todo
// aluno conectado que já tem código escrito e ainda está na fase "coding" finaliza a aula sozinho
// (mesmo fluxo de "Salvar e Finalizar Aula"), sem precisar clicar em nada. Substitui os antigos
// botões "Gerar resumo (hoje)/(ontem)" da Lista de Chamada, que somem daqui pra frente.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const now = new Date();
  const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const csharpCode = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); } }';

  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoComCodigo', JSON.stringify({
    name: 'AlunoComCodigo', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: csharpCode }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));
  kvStore.set('student:matutino:AlunoSemCodigo', JSON.stringify({
    name: 'AlunoSemCodigo', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));

  const browser = await launchBrowser();

  // ── professor: aba "Meu código" ──
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('text=👨‍💻 Meu código');
  await pageT.waitForTimeout(500);

  const ritmoCard = pageT.locator('[data-tour-prof="resumo-ritmo"]');
  check('Card de ritmo do resumo existe em "Meu código"', (await ritmoCard.count()) > 0);
  check('Sem ritmo definido por padrão (badge "sem ritmo fixo")', (await ritmoCard.locator('text=Sem ritmo fixo hoje').count()) > 0);

  await ritmoCard.locator('input[type="number"]').fill('2');
  await pageT.waitForTimeout(600);
  const metaAfterCadence = JSON.parse(kvStore.get('teachermeta:main'));
  check('Ritmo (2) foi salvo na turma matutino', metaAfterCadence?.byTurma?.matutino?.resumoCadence === 2, JSON.stringify(metaAfterCadence?.byTurma?.matutino));

  await ritmoCard.locator('button:has-text("Liberar resumo pra turma hoje")').click();
  await pageT.waitForTimeout(600);
  check('Mensagem de sucesso aparece ao liberar o resumo', (await ritmoCard.locator('text=/Resumo liberado/').count()) > 0);
  check('Badge muda pra "Resumo já liberado hoje"', (await ritmoCard.locator('text=Resumo já liberado hoje').count()) > 0);
  check('Chave resumotrigger:matutino foi gravada com a data de hoje', kvStore.get('resumotrigger:matutino') === tk, kvStore.get('resumotrigger:matutino'));

  check('Botão antigo "Gerar resumo (hoje)" NÃO existe mais', (await pageT.locator('button:has-text("Gerar resumo (hoje)")').count()) === 0);
  check('Botão antigo "Gerar resumo (ontem)" NÃO existe mais', (await pageT.locator('button:has-text("Gerar resumo (ontem)")').count()) === 0);
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  // ── aluno COM código: finaliza a aula sozinho, sem clicar em nada ──
  const ctxC = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageC = await ctxC.newPage();
  const jsErrorsC = await mockRoutes(pageC, kvStore);
  await pageC.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await pageC.waitForTimeout(700);
  await pageC.click('text=Aluno');
  await pageC.waitForTimeout(500);
  await pageC.click('text=☀️ Matutino');
  await pageC.waitForTimeout(500);
  await pageC.waitForSelector('text=AlunoComCodigo', { timeout: 10000 });
  await pageC.click('text=AlunoComCodigo');
  await pageC.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = pageC.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await pageC.waitForTimeout(300); }
    else break;
  }
  check('Aluno com código começa na tela de código (ainda não foi puxado)', (await pageC.locator('textarea').count()) > 0);
  await pageC.waitForSelector('text=Resumo da sua aula', { timeout: 20000 });
  check('Aluno com código foi pro Resumo da Aula sozinho, sem clicar em nada', (await pageC.locator('text=Resumo da sua aula').count()) > 0);
  const alunoComCodigoAfter = JSON.parse(kvStore.get('student:matutino:AlunoComCodigo'));
  check('phase do aluno virou "summary" no servidor', alunoComCodigoAfter.phase === 'summary', alunoComCodigoAfter.phase);
  check('SEM erro de JS (AlunoComCodigo)', jsErrorsC.length === 0, jsErrorsC.slice(0, 3).join(' | '));

  // ── aluno SEM código: continua na tela de código (não tem o que resumir ainda) ──
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageS = await ctxS.newPage();
  const jsErrorsS = await mockRoutes(pageS, kvStore);
  await pageS.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await pageS.waitForTimeout(700);
  await pageS.click('text=Aluno');
  await pageS.waitForTimeout(500);
  await pageS.click('text=☀️ Matutino');
  await pageS.waitForTimeout(500);
  await pageS.waitForSelector('text=AlunoSemCodigo', { timeout: 10000 });
  await pageS.click('text=AlunoSemCodigo');
  await pageS.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = pageS.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await pageS.waitForTimeout(300); }
    else break;
  }
  await pageS.waitForTimeout(7000); // dá tempo de um ciclo do poll (5s) passar
  check('Aluno SEM código continua na tela de código (nada pra resumir ainda)', (await pageS.locator('textarea').count()) > 0);
  check('Aluno SEM código NÃO foi puxado pro resumo', (await pageS.locator('text=Resumo da sua aula').count()) === 0);
  const alunoSemCodigoAfter = JSON.parse(kvStore.get('student:matutino:AlunoSemCodigo'));
  check('phase do aluno sem código continua "coding"', alunoSemCodigoAfter.phase === 'coding', alunoSemCodigoAfter.phase);
  check('SEM erro de JS (AlunoSemCodigo)', jsErrorsS.length === 0, jsErrorsS.slice(0, 3).join(' | '));

  await ctxT.close();
  await ctxC.close();
  await ctxS.close();
  await browser.close();
  process.exit(summary('RITMO DO RESUMO: RITMO CONFIGURÁVEL + LIBERAÇÃO AUTOMÁTICA PRA QUEM ESTÁ CONECTADO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
