// Quando TODOS os alunos presentes numa turma terminam a atividade do dia, o painel do professor
// mostra uma revelação animada do ranking (pior pra melhor) — em vez de só o badge 🏆 individual
// por tile (que continua existindo do mesmo jeito). Só dispara 1x por turma por dia.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  const now = Date.now();
  kvStore.set('student:matutino:AlunoNota60', JSON.stringify({
    name: 'AlunoNota60', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'done', lastSeen: now, doneAt: now, score: 60, nyxPoints: 0,
  }));
  kvStore.set('student:matutino:AlunoNota100', JSON.stringify({
    name: 'AlunoNota100', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'done', lastSeen: now, doneAt: now, score: 100, nyxPoints: 0,
  }));
  kvStore.set('student:matutino:AlunoNota80', JSON.stringify({
    name: 'AlunoNota80', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'done', lastSeen: now, doneAt: now, score: 80, nyxPoints: 0,
  }));
  // vespertino tem só 1 aluno, mesmo já tendo terminado — "ranking" de 1 pessoa não faz sentido,
  // NÃO pode disparar revelação nenhuma pra essa turma (o badge 🏆 individual do tile já basta)
  kvStore.set('student:vespertino:AlunoSozinho', JSON.stringify({
    name: 'AlunoSozinho', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'done', lastSeen: now, doneAt: now, score: 90, nyxPoints: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.waitForTimeout(2000);

  const modal = page.locator('[data-testid="ranking-reveal-modal"]');
  check('A revelação de ranking aparece sozinha quando a turma inteira termina', (await modal.count()) > 0);
  check('O nome da turma matutino aparece no título', (await modal.locator('text=/Turma Matutino terminou!/').count()) > 0);

  // espera a revelação toda acontecer (3 alunos, ~700ms cada + folga)
  await page.waitForTimeout(2800);
  const modalText = await modal.innerText();
  check('AlunoNota100 (1º lugar) aparece no ranking', modalText.includes('AlunoNota100'));
  check('AlunoNota80 aparece no ranking', modalText.includes('AlunoNota80'));
  check('AlunoNota60 aparece no ranking', modalText.includes('AlunoNota60'));

  // linha com rank=1 (melhor nota) precisa estar ACIMA da linha com rank=3 (pior nota) na tela
  const rank1Row = modal.locator('[data-testid="ranking-row"][data-rank="1"]');
  const rank3Row = modal.locator('[data-testid="ranking-row"][data-rank="3"]');
  const rank1Box = await rank1Row.boundingBox();
  const rank3Box = await rank3Row.boundingBox();
  check('O aluno com maior nota (rank 1) aparece ACIMA do aluno com menor nota (rank 3)', rank1Box && rank3Box && rank1Box.y < rank3Box.y, JSON.stringify({ rank1Box, rank3Box }));
  check('A linha do 1º lugar contém AlunoNota100', (await rank1Row.innerText()).includes('AlunoNota100'));
  check('A linha do 3º lugar contém AlunoNota60', (await rank3Row.innerText()).includes('AlunoNota60'));

  check('O aluno sozinho da turma vespertino NÃO aparece nessa revelação (é de outra turma)', !modalText.includes('AlunoSozinho'));
  check('NÃO existe uma segunda revelação pra vespertino (só 1 aluno lá, "ranking" não faz sentido)', (await page.locator('text=/Turma Vespertino terminou!/').count()) === 0);

  // fecha e confere que não reaparece sozinha de novo (já foi "consumida" pra hoje)
  await modal.locator('button:has-text("✕")').click();
  await page.waitForTimeout(1000);
  check('Depois de fechar, a revelação não reaparece sozinha', (await page.locator('text=/Turma .* terminou!/').count()) === 0);

  // o badge 🏆 individual por tile CONTINUA existindo (coexiste com a revelação, não foi removido)
  await page.click('text=👥 Monitoramento');
  await page.waitForTimeout(500);
  const monitorCard = page.locator('h3:has-text("Monitoramento")').locator('xpath=..');
  await monitorCard.hover();
  await page.waitForTimeout(700);
  check('O badge 🏆 individual por tile continua aparecendo (coexiste com a revelação)', (await page.locator('text=/🏆 100/').count()) > 0);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('REVELAÇÃO ANIMADA DE RANKING NO MONITORAMENTO (FASE 9)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
