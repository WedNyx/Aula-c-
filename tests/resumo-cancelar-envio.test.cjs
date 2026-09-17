// "↩️ Cancelar envio" na etapa 3 (ENVIAR) do painel de materiais: depois que o professor manda o
// resumo/atividade (feito por IA OU escrito manualmente, tanto faz — os dois passam pelo mesmo
// enviarResumoParaTurma) pra turma toda, ele pode desfazer esse envio antes que quem ainda não
// recebeu receba. Cobre: o gatilho de turma é derrubado, o scoreFix pendente de quem ainda não
// tinha pego é limpo, um scoreFix pendente de OUTRO tipo (não resumo) não é mexido, o histórico de
// entregas registra o cancelamento, e o botão "Escolher e enviar" volta a aparecer.
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
  kvStore.set('student:matutino:AlunoPendente', JSON.stringify({
    name: 'AlunoPendente', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));
  kvStore.set('student:matutino:AlunoComOutraCorrecao', JSON.stringify({
    name: 'AlunoComOutraCorrecao', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));

  const browser = await launchBrowser();
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('text=Resumos, atividades e provas');
  await pageT.waitForTimeout(600);

  // 1) envia pra turma toda
  await pageT.click('button:has-text("📤 Escolher e enviar")');
  await pageT.waitForTimeout(500);
  await pageT.click('button:has-text("Confirmar envio")');
  await pageT.waitForTimeout(800);
  check('Card mostra "Entregue hoje" depois do envio', (await pageT.locator('text=✅ Entregue hoje').count()) > 0);
  check('Gatilho de turma foi gravado', !!kvStore.get('resumotrigger:matutino'));

  const fixPendenteAntes = JSON.parse(kvStore.get('scorefix:matutino:AlunoPendente') || 'null');
  check('scoreFix do resumo foi gravado pro aluno que ainda não pegou', fixPendenteAntes?.kind === 'resumo-broadcast', JSON.stringify(fixPendenteAntes));

  // simula uma correção NÃO relacionada que chegou pro outro aluno depois do envio (ex: nota
  // corrigida de uma atividade antiga) — o cancelamento não pode apagar isso por engano
  kvStore.set('scorefix:matutino:AlunoComOutraCorrecao', JSON.stringify({ kind: 'help-attended', at: Date.now() }));

  // 2) cancela o envio
  check('Botão "↩️ Cancelar envio" aparece depois do envio', (await pageT.locator('button:has-text("↩️ Cancelar envio")').count()) > 0);
  await pageT.click('button:has-text("↩️ Cancelar envio")');
  await pageT.waitForTimeout(800);
  check('Mensagem confirma o cancelamento', (await pageT.locator('text=/Envio cancelado/').count()) > 0);
  check('Card volta a mostrar "Escolher e enviar" (não fica travado em "Entregue hoje")', (await pageT.locator('button:has-text("📤 Escolher e enviar")').count()) > 0);
  check('SEM erro de JS', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  const trigAfter = JSON.parse(kvStore.get('resumotrigger:matutino') || 'null');
  check('Gatilho de turma foi derrubado (data vazia, não é mais hoje)', trigAfter?.date !== tk, JSON.stringify(trigAfter));

  const fixPendenteDepois = kvStore.get('scorefix:matutino:AlunoPendente');
  check('scoreFix pendente do resumo foi limpo (quem não tinha pego não vai mais receber)', !fixPendenteDepois, fixPendenteDepois);

  const fixOutraCorrecaoDepois = JSON.parse(kvStore.get('scorefix:matutino:AlunoComOutraCorrecao') || 'null');
  check('scoreFix de OUTRO tipo (não resumo) continua intacto pro outro aluno', fixOutraCorrecaoDepois?.kind === 'help-attended', JSON.stringify(fixOutraCorrecaoDepois));

  const histAfter = JSON.parse(kvStore.get('teacherresumo:matutino'));
  const dh = histAfter[tk]?.deliveryHistory || [];
  check('Histórico de entregas registra 1 entrega, marcada como cancelada', dh.length === 1 && !!dh[0].cancelledAt, JSON.stringify(dh));

  // 3) reenvia depois de cancelar (confirma que o cancelamento realmente libera o fluxo de novo)
  await pageT.click('button:has-text("📤 Escolher e enviar")');
  await pageT.waitForTimeout(500);
  await pageT.click('button:has-text("Confirmar envio")');
  await pageT.waitForTimeout(800);
  check('Reenvio depois do cancelamento funciona normalmente', (await pageT.locator('text=✅ Entregue hoje').count()) > 0);
  const trigReenvio = JSON.parse(kvStore.get('resumotrigger:matutino') || 'null');
  check('Gatilho de turma voltou a ter a data de hoje no reenvio', trigReenvio?.date === tk, JSON.stringify(trigReenvio));

  await ctxT.close();
  await browser.close();
  process.exit(summary('CANCELAR ENVIO DO RESUMO/ATIVIDADE PRA TURMA') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
