// Novo fluxo em 2 passos: "Gerar resumo" só guarda no Caderno do PROFESSOR; "Enviar pra turma
// toda" (ou "Enviar resumo de hoje" no painel de um aluno) é que entrega pros alunos.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('/home/user/Aula-c-/tests/helpers.cjs');

(async () => {
  const now = new Date();
  const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const csharpCode = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); } }';

  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('teachercode:matutino', JSON.stringify({ files: [{ name: 'Program.cs', code: csharpCode }], at: Date.now() }));
  kvStore.set('student:matutino:AlunoTeste', JSON.stringify({
    name: 'AlunoTeste', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));

  const browser = await launchBrowser();
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('text=👨‍💻 Meu código');
  await pageT.waitForTimeout(500);

  const ritmoCard = pageT.locator('[data-tour-prof="resumo-ritmo"]');
  check('Card não tem mais o campo de ritmo/cadência', (await ritmoCard.locator('input[type="number"]').count()) === 0);
  check('Botão "Enviar pra turma toda" NÃO existe antes de gerar', (await ritmoCard.locator('button:has-text("Enviar pra turma toda")').count()) === 0);

  // 1) gerar (só vai pro caderno do professor)
  await ritmoCard.locator('button:has-text("Gerar resumo")').click();
  await pageT.waitForTimeout(1200);
  check('Mensagem confirma que foi pro Caderno do professor', (await ritmoCard.locator('text=/guardado no seu Caderno/').count()) > 0);
  check('Ainda NÃO tem gatilho de turma liberado (resumotrigger)', !kvStore.get('resumotrigger:matutino'));
  check('Caderno do professor foi salvo no servidor', !!kvStore.get('teacherresumo:matutino'));
  const teacherHist = JSON.parse(kvStore.get('teacherresumo:matutino'));
  check('Resumo de hoje está no caderno do professor', Array.isArray(teacherHist[tk]?.secoes) && teacherHist[tk].secoes.length > 0, JSON.stringify(teacherHist));

  // aluno ainda NÃO deve ter recebido nada (só gerou, não enviou)
  const beforeSend = JSON.parse(kvStore.get('student:matutino:AlunoTeste'));
  check('Aluno AINDA não recebeu nada (só gerar não envia)', !beforeSend.summaryHistory || Object.keys(beforeSend.summaryHistory).length === 0, JSON.stringify(beforeSend.summaryHistory));

  // 2) abrir o caderno do professor e conferir que aparece lá
  await ritmoCard.locator('button:has-text("Meu Caderno de resumos")').click();
  await pageT.waitForTimeout(600);
  check('Modal do Caderno do professor abre e mostra o resumo', (await pageT.locator('text=📒 Caderno de resumos').count()) > 0);
  await pageT.click('text=✕');
  await pageT.waitForTimeout(300);

  // 3) enviar pra turma toda
  await ritmoCard.locator('button:has-text("Enviar pra turma toda")').click();
  await pageT.waitForTimeout(1200);
  check('Mensagem confirma envio pra turma', (await ritmoCard.locator('text=/Resumo enviado pro Caderno de 1 aluno/').count()) > 0);
  check('Gatilho de turma foi liberado ao ENVIAR (não ao gerar)', !!kvStore.get('resumotrigger:matutino'));
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  const fixSaved = JSON.parse(kvStore.get('scorefix:matutino:AlunoTeste') || 'null');
  check('scoreFix foi gravado pro aluno só depois do envio', fixSaved?.kind === 'resumo-broadcast', JSON.stringify(fixSaved));

  await ctxT.close();
  await browser.close();
  process.exit(summary('FLUXO EM 2 PASSOS: GERAR (caderno do professor) → ENVIAR (caderno dos alunos)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
