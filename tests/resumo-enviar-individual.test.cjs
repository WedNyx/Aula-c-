// "📖 Enviar resumo de hoje" pra UM aluno só (menu "•••" do Monitoramento), igual "Enviar código
// da turma" — não deve puxar o resto da turma inteira pra atividade (só entrega no Caderno dele).
// Também é o teste de regressão de um bug real: setScoreFix (a função que entrega o resumo no
// aluno) nunca devolvia se o envio deu certo — SEMPRE retornava undefined, então este fluxo
// SEMPRE mostrava "❌ Não consegui enviar o resumo agora" pro professor, mesmo quando o envio
// funcionava perfeitamente no servidor (e por causa disso, o histórico de entregas nunca era
// atualizado nesse caminho). Este teste confirma que a confirmação de sucesso aparece de verdade.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const now = new Date();
  const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const material = {
    intro: 'Você aprendeu bastante hoje!',
    secoes: [{ emoji: '💡', titulo: 'Variáveis', explicacao: 'Guardam valores.', exemplo: 'int x = 1;' }],
    atividade: [{ q: 'O que é uma variável?', opts: ['Guarda valor', 'B', 'C', 'D'], correct: 0 }],
    dica: 'Continue praticando!',
  };

  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('teacherresumo:matutino', JSON.stringify({ [tk]: material }));
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
  await pageT.click('text=Monitoramento');
  await pageT.waitForTimeout(700);

  await pageT.click('button[aria-label="Abrir opções de AlunoAlvo"]');
  await pageT.waitForTimeout(300);
  check('Menu do aluno mostra "Enviar resumo de hoje"', (await pageT.locator('button:has-text("📖 Enviar resumo de hoje")').count()) > 0);
  await pageT.click('button:has-text("📖 Enviar resumo de hoje")');
  await pageT.waitForTimeout(700);

  check('Confirmação de envio pro aluno específico aparece (não a falsa mensagem de erro)', (await pageT.locator('text=/Resumo enviado pro Caderno de AlunoAlvo/').count()) > 0);
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  const fixAlvo = JSON.parse(kvStore.get('scorefix:matutino:AlunoAlvo') || 'null');
  check('scoreFix foi gravado só pro AlunoAlvo', fixAlvo?.kind === 'resumo-broadcast', JSON.stringify(fixAlvo));
  const fixOutro = kvStore.get('scorefix:matutino:AlunoOutro');
  check('AlunoOutro NÃO recebeu nada (envio foi só pra 1 aluno)', !fixOutro, fixOutro);
  check('Gatilho de turma NÃO foi liberado (envio individual não puxa a turma toda pra atividade)', !kvStore.get('resumotrigger:matutino'));

  const histAfter = JSON.parse(kvStore.get('teacherresumo:matutino'));
  const dh = histAfter[tk]?.deliveryHistory || [];
  check('Histórico de entregas registrou o envio individual (antes nunca chegava aqui)', dh.length === 1 && dh[0].kind === 'aluno' && dh[0].targetLabel === 'AlunoAlvo', JSON.stringify(dh));

  await ctxT.close();
  await browser.close();
  process.exit(summary('ENVIAR RESUMO PRA UM ALUNO SÓ: CONFIRMAÇÃO DE SUCESSO APARECE DE VERDADE') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
