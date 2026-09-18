// Bug real: turmaCalendar() reunia meta.classDays (campo legado, congelado desde que o calendário
// virou por turma) com byTurma[turmaId].classDays em TODA LEITURA, não só na migração. Como o
// professor nunca escreve de volta em meta.classDays depois que byTurma passa a existir, um dia
// removido no Calendário "ressuscitava" sozinho na leitura seguinte — o professor NUNCA conseguia
// remover de verdade um dia antigo, e a Lista de Chamada continuava cobrando presença/falta pra
// esse dia mesmo depois dele ser "removido". Este teste reproduz o cenário exato: turma com
// calendário legado (meta.classDays, sem byTurma ainda) e confirma que um clique pra remover um
// dia realmente remove — inclusive depois de trocar de aba e voltar (não é só otimismo da UI).
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const now = new Date();
  const dayKey = (d) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const diaAlvo = dayKey(5);
  const diaQueFica = dayKey(6);

  // calendário LEGADO só (meta.classDays no topo, SEM byTurma ainda) — exatamente o estado de uma
  // turma que nunca teve um dia removido/adicionado desde que a plataforma passou a ter calendário
  // por turma
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: [diaAlvo, diaQueFica] });

  const browser = await launchBrowser();
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('[data-tour-prof="calendar"]');
  await pageT.waitForTimeout(700);

  const diaAlvoBtn = pageT.locator(`button[title="Dia de aula (clique para remover)"]`).first();
  check('Dia do calendário legado aparece marcado como dia de aula', (await diaAlvoBtn.count()) > 0);

  // remove o primeiro dia de aula marcado (diaAlvo, o "5")
  await diaAlvoBtn.click();
  await pageT.waitForTimeout(600);

  const btnDia5DepoisDoClique = pageT.locator(`button[title="Marcar como dia de aula"]:has-text("5")`).first();
  check('Logo após o clique, o dia vira "não é mais dia de aula" (não ressuscita na hora)', (await btnDia5DepoisDoClique.count()) > 0);

  // troca de turma e volta (força reler o meta do zero, como trocar de aba faria) pra garantir que
  // não é só otimismo do estado local em memória — o servidor precisa ter gravado a remoção de vez
  await pageT.click('text=Resumos, atividades e provas');
  await pageT.waitForTimeout(400);
  await pageT.click('[data-tour-prof="calendar"]');
  await pageT.waitForTimeout(700);

  const btnDia5DepoisDeVoltar = pageT.locator(`button[title="Marcar como dia de aula"]:has-text("5")`).first();
  check('Depois de sair e voltar pro Calendário, o dia CONTINUA removido (o bug fazia ele voltar)', (await btnDia5DepoisDeVoltar.count()) > 0);
  const btnDia6AindaMarcado = pageT.locator(`button[title="Dia de aula (clique para remover)"]:has-text("6")`).first();
  check('O outro dia de aula (não mexido) continua marcado normalmente', (await btnDia6AindaMarcado.count()) > 0);
  check('SEM erro de JS', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  const metaAfter = JSON.parse(kvStore.get('teachermeta:main'));
  check('O dia removido não está mais no calendário salvo da turma (byTurma)', !(metaAfter.byTurma?.matutino?.classDays || []).includes(diaAlvo), JSON.stringify(metaAfter.byTurma?.matutino?.classDays));
  check('O outro dia continua salvo no calendário da turma', (metaAfter.byTurma?.matutino?.classDays || []).includes(diaQueFica), JSON.stringify(metaAfter.byTurma?.matutino?.classDays));

  await ctxT.close();
  await browser.close();
  process.exit(summary('CALENDÁRIO: REMOVER UM DIA DO CALENDÁRIO LEGADO REALMENTE REMOVE (NÃO RESSUSCITA)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
