// Página pública de impacto (/impacto): sem login, só números agregados, sem nome de aluno nenhum.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Ceilândia', classDays: ['2026-07-20', '2026-07-22', '2026-07-24'] });
  // uma cidade já encerrada (Hall da Fama) — com nomes de alunos no pódio, que NUNCA podem
  // aparecer na página pública (só os agregados: totalStudents/totalClasses/avgScore)
  kvStore.set('hall:entries', JSON.stringify([
    { city: 'Sobradinho', students: [{ name: 'NomeSecretoQueNaoPodeAparecer', highlight: 'nota 95' }], closedAt: Date.now() - 30 * 86400000, totalStudents: 12, totalClasses: 8, avgScore: 78, classDaysSnapshot: 8 },
  ]));
  kvStore.set('student:matutino:AlunoAtual1', JSON.stringify({ name: 'AlunoAtual1', shift: 'matutino', avatar: {}, score: 85, phase: 'coding', lastSeen: Date.now() }));
  kvStore.set('student:matutino:AlunoAtual2', JSON.stringify({ name: 'AlunoAtual2', shift: 'matutino', avatar: {}, score: 91, phase: 'coding', lastSeen: Date.now() }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await page.goto('http://localhost:4173/impacto', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  check('Não caiu na tela de login normal (título "Aula de C# na estrada" aparece)', (await page.locator('text=Aula de C# na estrada').count()) > 0);
  check('Não pede senha nem escolha de Aluno/Professor', (await page.locator('button:has-text("Professor")').count()) === 0);

  const bodyText = await page.locator('body').innerText();
  check('Total de alunos aparece (12 da cidade encerrada + 2 da atual = 14)', bodyText.includes('14'));
  check('Nome de aluno da cidade ENCERRADA (Hall da Fama) NÃO aparece na página pública', !bodyText.includes('NomeSecretoQueNaoPodeAparecer'));
  check('Nome de aluno da turma ATUAL não aparece na página pública', !bodyText.includes('AlunoAtual1') && !bodyText.includes('AlunoAtual2'));
  check('Nome da cidade atual (Ceilândia) aparece, marcada como em andamento', (await page.locator('text=/Ceilândia/').count()) > 0);
  check('Nome da cidade encerrada (Sobradinho) também aparece', (await page.locator('text=/Sobradinho/').count()) > 0);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('PÁGINA PÚBLICA DE IMPACTO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
