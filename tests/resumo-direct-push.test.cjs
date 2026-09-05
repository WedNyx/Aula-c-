// O resumo gerado no painel do professor entra DIRETO no Caderno de resumos de todo aluno da
// turma assim que fica pronto — não importa a fase dele agora (mesmo sem ter escrito nada ainda,
// mesmo sem passar pela atividade). Usa o mesmo mecanismo de scoreFix já usado pra nota corrigida/
// presença corrigida etc., pra não perder a corrida com o autosave periódico do próprio aluno.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const now = new Date();
  const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const csharpCode = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); } }';

  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('teachercode:matutino', JSON.stringify({ files: [{ name: 'Program.cs', code: csharpCode }], at: Date.now() }));
  // aluno SEM código escrito ainda — o mecanismo antigo (auto-finalizar aula) exige >=10 chars de
  // código pra pegar esse aluno; o push direto não deve depender disso
  kvStore.set('student:matutino:AlunoSemCodigoAinda', JSON.stringify({
    name: 'AlunoSemCodigoAinda', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));

  const browser = await launchBrowser();

  // ── aluno abre o app ANTES do professor gerar o resumo, fica só esperando (fase "coding", sem código) ──
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageA = await ctxA.newPage();
  const jsErrorsA = await mockRoutes(pageA, kvStore);
  await pageA.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await pageA.waitForTimeout(700);
  await pageA.click('text=Aluno');
  await pageA.waitForTimeout(500);
  await pageA.click('text=☀️ Matutino');
  await pageA.waitForTimeout(500);
  await pageA.waitForSelector('text=AlunoSemCodigoAinda', { timeout: 10000 });
  await pageA.click('text=AlunoSemCodigoAinda');
  await pageA.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = pageA.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await pageA.waitForTimeout(300); }
    else break;
  }
  check('Aluno começa na tela de código, sem nada escrito ainda', (await pageA.locator('textarea').count()) > 0);

  // ── professor: gera e libera o resumo ──
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('text=👨‍💻 Meu código');
  await pageT.waitForTimeout(800);
  const ritmoCardT = pageT.locator('[data-tour-prof="resumo-ritmo"]');
  await ritmoCardT.locator('button:has-text("Gerar resumo")').click();
  await pageT.waitForTimeout(1200);
  await ritmoCardT.locator('button:has-text("Enviar pra turma toda")').click();
  await pageT.waitForTimeout(1200);
  check('Mensagem confirma envio direto pro Caderno', (await pageT.locator('text=/Resumo enviado pro Caderno de 1 aluno/').count()) > 0);
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  const fixSaved = JSON.parse(kvStore.get('scorefix:matutino:AlunoSemCodigoAinda') || 'null');
  check('scoreFix "resumo-broadcast" foi gravado pro aluno', fixSaved?.kind === 'resumo-broadcast' && fixSaved?.dateKey === tk && Array.isArray(fixSaved?.resumo?.secoes), JSON.stringify(fixSaved));

  // ── aluno (aba já aberta, sem recarregar) recebe o resumo sozinho, sem sair da tela de código ──
  await pageA.waitForTimeout(14000); // dá tempo do tick (12s) rodar pelo menos 1 vez
  check('Aluno CONTINUA na tela de código (fase não mudou, sem atividade forçada)', (await pageA.locator('textarea').count()) > 0);
  check('SEM erro de JS (aluno)', jsErrorsA.length === 0, jsErrorsA.slice(0, 3).join(' | '));

  const after = JSON.parse(kvStore.get('student:matutino:AlunoSemCodigoAinda'));
  check('phase do aluno continua "coding" (não foi puxado pra atividade/resumo)', after.phase === 'coding', after.phase);
  check('Resumo já está no Caderno (summaryHistory) do aluno, mesmo sem ele ter feito nada', Array.isArray(after.summaryHistory?.[tk]?.secoes) && after.summaryHistory[tk].secoes.length > 0, JSON.stringify(after.summaryHistory));
  check('scoreFix foi limpo depois de aplicado (não fica reaplicando pra sempre)', !kvStore.get('scorefix:matutino:AlunoSemCodigoAinda') || JSON.parse(kvStore.get('scorefix:matutino:AlunoSemCodigoAinda')) === null, kvStore.get('scorefix:matutino:AlunoSemCodigoAinda'));

  await ctxT.close();
  await ctxA.close();
  await browser.close();
  process.exit(summary('RESUMO ENTREGUE DIRETO NO CADERNO, INDEPENDENTE DA FASE DO ALUNO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
