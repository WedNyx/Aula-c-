// "Enviar resumo de hoje" pra UM aluno só (painel "⚙️ Gerenciar aluno"), igual "Enviar código da
// turma" — não deve puxar o resto da turma inteira pra atividade (só entrega no Caderno dele).
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const now = new Date();
  const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const csharpCode = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); } }';

  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('teachercode:matutino', JSON.stringify({ files: [{ name: 'Program.cs', code: csharpCode }], at: Date.now() }));
  kvStore.set('student:matutino:AlunoAlvo', JSON.stringify({
    name: 'AlunoAlvo', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));
  kvStore.set('student:matutino:AlunoOutro', JSON.stringify({
    name: 'AlunoOutro', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));

  const browser = await launchBrowser();
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('text=👨‍💻 Meu código');
  await pageT.waitForTimeout(500);

  // sem resumo gerado ainda: o botão de enviar pra 1 aluno deve avisar que não tem nada pronto
  await pageT.click('text=👥 Monitoramento');
  await pageT.waitForTimeout(500);
  const monitorCard = pageT.locator('h3:has-text("Monitoramento")').locator('xpath=..');
  await monitorCard.hover();
  await pageT.waitForTimeout(700);
  await pageT.click('text=AlunoAlvo');
  await pageT.waitForTimeout(500);
  check('Botão "Enviar resumo de hoje" aparece no painel do aluno', (await pageT.locator('button:has-text("Enviar resumo de hoje")').count()) > 0);
  await pageT.click('button:has-text("Enviar resumo de hoje")');
  await pageT.waitForTimeout(500);
  check('Sem resumo gerado ainda: avisa que não tem nada pronto', (await pageT.locator('text=/Ainda não tem resumo gerado hoje/').count()) > 0);

  // gera o resumo no caderno do professor
  await pageT.click('text=👨‍💻 Meu código');
  await pageT.waitForTimeout(500);
  await pageT.locator('[data-tour-prof="resumo-ritmo"]').locator('button:has-text("Gerar resumo")').click();
  await pageT.waitForTimeout(1200);

  // agora envia só pra AlunoAlvo (a seleção do aluno persiste entre as abas, não precisa clicar de novo)
  await pageT.click('text=👥 Monitoramento');
  await pageT.waitForTimeout(500);
  await monitorCard.hover();
  await pageT.waitForTimeout(700);
  await pageT.click('button:has-text("Enviar resumo de hoje")');
  await pageT.waitForTimeout(500);
  check('Confirmação de envio pro aluno específico', (await pageT.locator('text=/Resumo enviado pro Caderno de AlunoAlvo/').count()) > 0);
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  const fixAlvo = JSON.parse(kvStore.get('scorefix:matutino:AlunoAlvo') || 'null');
  check('scoreFix foi gravado só pro AlunoAlvo', fixAlvo?.kind === 'resumo-broadcast', JSON.stringify(fixAlvo));
  const fixOutro = kvStore.get('scorefix:matutino:AlunoOutro');
  check('AlunoOutro NÃO recebeu nada (envio foi só pra 1 aluno)', !fixOutro, fixOutro);
  check('Gatilho de turma NÃO foi liberado (envio individual não puxa a turma toda pra atividade)', !kvStore.get('resumotrigger:matutino'));

  await ctxT.close();
  await browser.close();
  process.exit(summary('ENVIAR RESUMO PRA UM ALUNO SÓ (SEM AFETAR O RESTO DA TURMA)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
