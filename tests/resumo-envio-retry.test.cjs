// setScoreFix (usada pra entregar o resumo no Caderno de cada aluno) não tentava de novo em
// nenhuma falha passageira de rede, e nem devolvia se o envio realmente deu certo — uma turma
// inteira podia "receber" o resumo com alguns alunos silenciosamente de fora, sem o professor
// nem o aluno percederem. Este teste cobre os dois casos depois do conserto: (1) uma falha
// passageira (2 tentativas ruins, a 3ª funciona) se recupera sozinha, sem o professor perceber
// nada de errado; (2) uma falha persistente (todas as tentativas falham) aparece pro professor
// como um aviso honesto, em vez de uma mensagem de sucesso genérica que esconde o problema.
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
  for (const name of ['AlunoOk', 'AlunoFalhaPassageira', 'AlunoQuebrado']) {
    kvStore.set(`student:matutino:${name}`, JSON.stringify({
      name, shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
      phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
    }));
  }

  const browser = await launchBrowser();
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);

  let flakyAttempts = 0;
  let quebradoAttempts = 0;
  await pageT.route('**/api/kv', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'set' && body.key === 'scorefix:matutino:AlunoFalhaPassageira') {
      flakyAttempts++;
      if (flakyAttempts <= 2) { await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'temporary_failure' }) }); return; }
    }
    if (body.action === 'set' && body.key === 'scorefix:matutino:AlunoQuebrado') {
      quebradoAttempts++;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'persistent_failure' }) });
      return;
    }
    await route.fallback();
  });

  await loginTeacher(pageT);
  await pageT.click('text=Resumos, atividades e provas');
  await pageT.waitForTimeout(600);
  await pageT.click('button:has-text("📤 Escolher e enviar")');
  await pageT.waitForTimeout(500);
  await pageT.click('button:has-text("Confirmar envio")');
  await pageT.waitForTimeout(3500); // dá tempo pro retry (até 3 tentativas com espera crescente) terminar

  check('AlunoOk recebeu o scoreFix normalmente', JSON.parse(kvStore.get('scorefix:matutino:AlunoOk') || 'null')?.kind === 'resumo-broadcast');
  check('AlunoFalhaPassageira SE RECUPEROU sozinho depois de 2 falhas (retry funcionou)', JSON.parse(kvStore.get('scorefix:matutino:AlunoFalhaPassageira') || 'null')?.kind === 'resumo-broadcast', `tentativas=${flakyAttempts}`);
  check('setScoreFix tentou pelo menos 3 vezes pro aluno com falha passageira', flakyAttempts >= 3, `tentativas=${flakyAttempts}`);
  check('AlunoQuebrado (falha persistente) NÃO recebeu, mesmo depois de tentar várias vezes', !kvStore.get('scorefix:matutino:AlunoQuebrado'));
  check('Tentou várias vezes pro aluno com falha persistente antes de desistir', quebradoAttempts >= 3, `tentativas=${quebradoAttempts}`);

  check('Mensagem avisa honestamente sobre a falha parcial (não finge que deu tudo certo)', (await pageT.locator('text=/1 de 3 aluno.*não confirmou/').count()) > 0);
  check('SEM erro de JS', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  const histAfter = JSON.parse(kvStore.get('teacherresumo:matutino'));
  const dh = histAfter[tk]?.deliveryHistory || [];
  check('Histórico de entregas registra failedCount honesto (1)', dh.length === 1 && dh[0].failedCount === 1 && dh[0].studentCount === 3, JSON.stringify(dh));

  await ctxT.close();
  await browser.close();
  process.exit(summary('ENVIO DE RESUMO: RETRY SE RECUPERA DE FALHA PASSAGEIRA E AVISA HONESTAMENTE SOBRE FALHA PERSISTENTE') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
