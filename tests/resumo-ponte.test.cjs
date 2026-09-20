// Aluno que faltou (ou pulou um dia): quando o professor libera o resumo de hoje pra turma, ele
// recebe o MESMO resumo que todo mundo, quieto no Caderno — sem gerar nada personalizado pra "cobrir
// o que perdeu" (isso existia antes via um gatilho de auto-finalização de aula, que forçava o aluno
// pra uma tela cheia; foi substituído pela entrega direta no Caderno, igual ao código da turma). O
// que importa aqui: o resumo ANTIGO do aluno continua intacto no próprio dia dele, e o de hoje entra
// como uma entrada NOVA, sem apagar nem misturar com o histórico anterior.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const now = new Date();
  const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const csharpCode = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); int y = 2; } }';

  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('teachercode:matutino', JSON.stringify({ files: [{ name: 'Program.cs', code: csharpCode }], at: Date.now() }));
  kvStore.set('student:matutino:AlunoFaltou', JSON.stringify({
    name: 'AlunoFaltou', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: csharpCode }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
    summaryHistory: { '2026-07-20': { intro: 'Aula antiga', secoes: [{ emoji: '📌', titulo: 'ConceitoAntigo', explicacao: 'x', exemplo: 'y' }], dica: 'd' } },
  }));

  const browser = await launchBrowser();

  // ── professor libera o resumo de hoje pra turma ──
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('text=Resumos, atividades e provas');
  await pageT.waitForTimeout(500);
  const ritmoCardT = pageT.locator('[data-tour-prof="resumo-ritmo"]');
  await ritmoCardT.locator('button:has-text("✨ Gerar rascunho com Nyx")').click();
  await pageT.waitForSelector('text=✅ Material pronto para revisão', { timeout: 20000 });
  await ritmoCardT.locator('button:has-text("📤 Escolher e enviar")').click();
  await pageT.waitForTimeout(500);
  await pageT.click('button:has-text("Confirmar envio")');
  await pageT.waitForTimeout(600);
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));
  const trig = JSON.parse(kvStore.get('resumotrigger:matutino'));

  // ── aluno que faltou: recebe o resumo de hoje quieto no Caderno, sem perder o antigo ──
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageA = await ctxA.newPage();
  const jsErrorsA = await mockRoutes(pageA, kvStore);
  await pageA.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await pageA.waitForTimeout(700);
  await pageA.click('text=Aluno');
  await pageA.waitForTimeout(500);
  await pageA.click('text=☀️ Matutino');
  await pageA.waitForTimeout(500);
  await pageA.waitForSelector('text=AlunoFaltou', { timeout: 10000 });
  await pageA.click('text=AlunoFaltou');
  await pageA.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const closeSanctuary = pageA.locator('[aria-label="Fechar Santuário Lunar"]');
    if (await closeSanctuary.count()) { await closeSanctuary.click({ force: true }); await pageA.waitForTimeout(300); continue; }
    const skipCheckin = pageA.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await pageA.waitForTimeout(300); }
    else break;
  }
  await pageA.waitForTimeout(1500);
  check('Aluno que faltou CONTINUA no editor (sem tela cheia forçada)', (await pageA.locator('[data-tour="editor"]').count()) > 0);
  check('SEM erro de JS (AlunoFaltou)', jsErrorsA.length === 0, jsErrorsA.slice(0, 3).join(' | '));

  const after = JSON.parse(kvStore.get('student:matutino:AlunoFaltou'));
  check('Resumo ANTIGO (2026-07-20) continua intacto, com "ConceitoAntigo"',
    after.summaryHistory?.['2026-07-20']?.secoes?.[0]?.titulo === 'ConceitoAntigo', JSON.stringify(after.summaryHistory?.['2026-07-20']));
  check('Resumo de HOJE foi entregue como entrada NOVA, sem apagar o antigo',
    JSON.stringify(after.summaryHistory?.[tk]) === JSON.stringify(trig.resumo), JSON.stringify(after.summaryHistory?.[tk]));
  check('phase continua "coding" (entrega não força fase nenhuma)', after.phase === 'coding', after.phase);

  await ctxT.close();
  await ctxA.close();
  await browser.close();
  process.exit(summary('ALUNO QUE FALTOU RECEBE O RESUMO DE HOJE NO CADERNO, SEM PERDER O HISTÓRICO ANTIGO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
