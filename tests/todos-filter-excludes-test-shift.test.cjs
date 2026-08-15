// A aba "Todos" do Monitoramento (shiftFilter padrão) deve mostrar só as turmas de verdade
// (Manhã/Tarde) — a turma de TESTE (usada pelo próprio professor pra experimentar o sistema) e a
// Sala de Idiomas têm aba própria de propósito (ver TEST_SHIFT/LANG_SHIFT em lib/shifts.ts) e não
// deveriam poluir contagens/alertas/ranking da turma real quando "Todos" está selecionado. Antes
// dessa correção, "shown" (usado por quase tudo na tela) não excluía esses turnos quando
// shiftFilter==="all", só quando um turno específico era escolhido.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore();
  // aluno de teste "travado" — se vazasse pra "Todos", apareceria na lista "Precisam de ajuda"
  kvStore.set('student:teste:AlunoDeTeste', JSON.stringify({
    name: 'AlunoDeTeste', shift: 'teste', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    code: '', phase: 'coding', joinedAt: Date.now() - 30 * 60000, lastSeen: Date.now(), nyxPoints: 0,
    score: 20, scoreHistory: { [new Date().toISOString().slice(0,10)]: 20 },
  }));
  // aluno normal da turma de verdade — precisa continuar aparecendo normalmente em "Todos"
  kvStore.set('student:matutino:AlunoDeVerdade', JSON.stringify({
    name: 'AlunoDeVerdade', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.waitForTimeout(1000);
  await page.hover('[data-tour-prof="monitor-grid"]');
  await page.waitForSelector('text=AlunoDeVerdade', { timeout: 10000 });

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  check('Na aba "Todos", o aluno da turma de TESTE NÃO aparece no grid de Monitoramento', (await page.locator('.tilefx', { hasText: 'AlunoDeTeste' }).count()) === 0);
  check('Na aba "Todos", o aluno da turma real continua aparecendo normalmente', (await page.locator('.tilefx', { hasText: 'AlunoDeVerdade' }).count()) > 0);
  check('O aluno de teste NÃO entra na lista "Precisam de ajuda" quando "Todos" está selecionado',
    !(await page.locator('text=Precisam de ajuda').locator('xpath=ancestor::div[1]').locator('text=AlunoDeTeste').count()));

  await ctx.close();
  await browser.close();
  process.exit(summary('"TODOS" NÃO MISTURA A TURMA DE TESTE/IDIOMAS NAS CONTAGENS DA TURMA REAL') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
