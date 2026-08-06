// Quando o professor abre "Vistoria" pra liberar UM aluno específico fora do horário automático da
// turma, essa sessão é só inspeção/correção — não pode virar presença nem dar ponto de atividade de
// verdade pro aluno. Este teste força um horário já ENCERRADO pra turma, libera a vistoria pro
// aluno, e confirma que completar a atividade normalmente NÃO marca presença nem soma nyxPoints/nota.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const now = new Date();
  const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const toHM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const endMin = Math.max(1, nowMin - 5); // horário que já encerrou há 5 min
  const startMin = Math.max(0, endMin - 60);

  const kvStore = baseKvStore({
    schedule: { matutino: { start: toHM(startMin), end: toHM(endMin) }, vespertino: { start: '', end: '' } },
    allowWeekend: true, // não deixa o fim de semana confundir o teste com outro motivo de "fechado"
  });
  // vistoria aberta pra este aluno específico — ele consegue entrar mesmo com a turma "fechada"
  kvStore.set('inspection:matutino:AlunoVistoria', '1');
  kvStore.set('student:matutino:AlunoVistoria', JSON.stringify({
    name: 'AlunoVistoria', shift: 'matutino', avatar: {},
    files: [{ name: 'Program.cs', code: 'int x = 1;' }],
    phase: 'activity', dynamicActivity: [{ q: 'Quanto é 1+1?', opts: ['2', '3'], correct: 0 }], answers: {},
    lastSeen: Date.now(), nyxPoints: 0, score: null, scoreHistory: {}, achievements: [], attendance: {},
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoVistoria', { timeout: 10000 });
  await page.click('text=AlunoVistoria');
  await page.waitForTimeout(1500);

  check('A vistoria deixou o aluno entrar mesmo com a turma fechada (não caiu na tela de "aula encerrada")',
    (await page.locator('text=Atividade da Aula').count()) > 0,
    (await page.locator('text=aula de hoje já encerrou').count()) ? 'caiu na tela de aula encerrada' : 'tela inesperada');

  // responde a única questão certa e envia a atividade normalmente
  await page.click('[data-q="0"] [data-opt="0"]');
  await page.click('button:has-text("Enviar Atividade")');
  await page.waitForTimeout(1500);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  const after = JSON.parse(kvStore.get('student:matutino:AlunoVistoria'));
  check('Presença do dia NÃO foi marcada (vistoria não conta como aula de verdade)',
    after.attendance?.[tk] !== 'present', `attendance[${tk}]=${JSON.stringify(after.attendance?.[tk])}`);
  check('nyxPoints continuam 0 (nenhum ponto vazou da vistoria)', (after.nyxPoints || 0) === 0, `nyxPoints=${after.nyxPoints}`);
  check('Nota de hoje NÃO foi gravada no histórico', !after.scoreHistory?.[tk], JSON.stringify(after.scoreHistory));
  check('Conquista "primeira-atividade" NÃO foi gravada', !(after.achievements || []).includes('primeira-atividade'), JSON.stringify(after.achievements));

  await ctx.close();
  await browser.close();
  process.exit(summary('VISTORIA FORA DO HORÁRIO NÃO DÁ PRESENÇA NEM PONTO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
