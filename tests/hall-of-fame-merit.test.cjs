// O Hall da Fama deixou de premiar só quem teve UM pico de nota alto — agora considera
// constância nas atividades (média do histórico), nota da prova, e poucos erros de código.
// Este teste planta dois perfis propositalmente opostos: um aluno consistente com nota média boa,
// prova boa e quase nenhum erro; e um aluno "sortudo" com um pico de nota bem mais alto num único
// dia, mas inconsistente no resto e com muitos erros registrados — e confere que o CONSISTENTE
// fica em primeiro no pódio, mesmo tendo menos pontos do Nyx e nunca tendo tirado a maior nota.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20', '2026-07-21', '2026-07-22'] });

  kvStore.set('student:matutino:AlunoConsistente', JSON.stringify({
    name: 'AlunoConsistente', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(),
    score: 85, scoreHistory: { '2026-07-20': 80, '2026-07-21': 85, '2026-07-22': 90 },
    examScore: 80, errorHistory: { '2026-07-20': 1 }, nyxPoints: 50,
  }));
  kvStore.set('student:matutino:AlunoPico', JSON.stringify({
    name: 'AlunoPico', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(),
    score: 100, scoreHistory: { '2026-07-20': 20, '2026-07-21': 15, '2026-07-22': 100 },
    examScore: 40, errorHistory: { '2026-07-20': 5, '2026-07-21': 5 }, nyxPoints: 200,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.click('text=🗓️ Calendário');
  await page.waitForTimeout(500);

  await page.click('button:has-text("🏆 Encerrar cidade")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Sim, encerrar Sobradinho")');
  await page.waitForTimeout(2500);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  const raw = kvStore.get('hall:entries:matutino');
  check('Hall da Fama da turma foi salvo', !!raw, String(raw));
  const entries = JSON.parse(raw || '[]');
  const last = entries[entries.length - 1];
  check('A cidade encerrada tem um pódio com os 2 alunos', last && last.students && last.students.length === 2, JSON.stringify(last));

  const names = (last?.students || []).map(s => s.name);
  check(
    'AlunoConsistente (constância + prova + poucos erros) fica em 1º, mesmo com MENOS pontos do Nyx e sem nunca ter tirado a maior nota isolada',
    names[0] === 'AlunoConsistente',
    JSON.stringify(last?.students)
  );
  check('AlunoPico (pico isolado de nota, inconsistente, muitos erros) cai pro 2º lugar', names[1] === 'AlunoPico', JSON.stringify(last?.students));

  const consistenteHighlight = (last?.students || []).find(s => s.name === 'AlunoConsistente')?.highlight || '';
  check('O texto do destaque menciona a média, não só um número de pico', consistenteHighlight.includes('média'), consistenteHighlight);
  check('O texto do destaque menciona a prova', consistenteHighlight.includes('prova'), consistenteHighlight);
  check('O texto do destaque menciona a situação de erros de código', /erro/.test(consistenteHighlight), consistenteHighlight);

  await ctx.close();
  await browser.close();
  process.exit(summary('HALL DA FAMA POR MÉRITO ACADÊMICO (NÃO SÓ PICO DE NOTA)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
