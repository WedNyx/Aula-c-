// Quando o professor encerra a prova com o aluno ainda respondendo, o "heartbeat" (tick a cada
// 12s) precisa corrigir a nota parcial no SERVIDOR — comparar localmente com "q.correct" quebra,
// porque esse campo vem sempre undefined (redactExamConfig esconde o gabarito de quem não é
// professor): questão respondida vira "errada" e questão em branco vira "certa", zerando a nota
// de quem só não deu tempo de terminar. Este teste prova que a versão corrigida bate com o
// gabarito de verdade, não com essa comparação quebrada.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  const questions = [
    { q: 'Q1', opts: ['a0', 'a1', 'a2', 'a3'], correct: 0 }, // aluno respondeu CERTO (0)
    { q: 'Q2', opts: ['b0', 'b1', 'b2', 'b3'], correct: 1 }, // aluno respondeu ERRADO (0, certa era 1)
    { q: 'Q3', opts: ['c0', 'c1', 'c2', 'c3'], correct: 2 }, // aluno NÃO respondeu
    { q: 'Q4', opts: ['d0', 'd1', 'd2', 'd3'], correct: 0 }, // aluno NÃO respondeu
    { q: 'Q5', opts: ['e0', 'e1', 'e2', 'e3'], correct: 3 }, // aluno NÃO respondeu
  ];
  // professor JÁ encerrou a prova (status "done") antes do aluno terminar de responder
  kvStore.set('exam:config:matutino', JSON.stringify({ status: 'done', questions, shift: 'matutino', activatedAt: Date.now() - 60000 }));
  kvStore.set('student:matutino:AlunoAtrasado', JSON.stringify({
    name: 'AlunoAtrasado', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 0,
    examAnswers: { 0: 0, 1: 0 }, examDone: false, examExits: 0,
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
  await page.waitForSelector('text=AlunoAtrasado', { timeout: 10000 });
  await page.click('text=AlunoAtrasado');
  await page.waitForTimeout(2500); // dá tempo do tick() (roda na hora que a sessão abre) chamar o grade_exam

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  const after = JSON.parse(kvStore.get('student:matutino:AlunoAtrasado'));
  check('Prova foi marcada como concluída pelo heartbeat', after.examDone === true);
  // gabarito de verdade: só a Q1 está certa (1 acerto) → raw=10. Se a comparação quebrada (contra
  // "q.correct" undefined) ainda estivesse ativa, as 3 questões em branco contariam como certas e
  // daria raw=30 em vez de 10.
  check('Nota bate com o gabarito de verdade (1 acerto real = 10), não com a comparação quebrada (que daria 30)',
    after.examScoreRaw === 10, `examScoreRaw=${after.examScoreRaw}`);
  check('examScore final também bate (sem saída de aba, igual ao raw)', after.examScore === 10, `examScore=${after.examScore}`);

  await ctx.close();
  await browser.close();
  process.exit(summary('PROVA ENCERRADA PELO PROFESSOR: NOTA PARCIAL DO ALUNO ATRASADO BATE COM O GABARITO DE VERDADE') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
