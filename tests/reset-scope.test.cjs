// Resetar "Matutino + Vespertino" (a opção "todos os turnos" do modal de reset) precisa apagar SÓ
// esses dois turnos — turma de teste e sala de linguagens nunca podem ser apagadas por esse botão.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoMat', JSON.stringify({
    name: 'AlunoMat', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), score: 80,
  }));
  kvStore.set('student:vespertino:AlunoVesp', JSON.stringify({
    name: 'AlunoVesp', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), score: 80,
  }));
  kvStore.set('student:teste:AlunoTeste', JSON.stringify({
    name: 'AlunoTeste', shift: 'teste', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), score: 80,
  }));
  kvStore.set('student:linguagens:AlunoLinguagens', JSON.stringify({
    name: 'AlunoLinguagens', shift: 'linguagens', avatar: {}, files: [{ name: 'index.html', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), score: 80,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.click('text=👥 Monitoramento');
  await page.waitForTimeout(500);
  await page.click('button:has-text("🔄 Resetar")');
  await page.waitForTimeout(400);

  check('Modal de confirmação abre com opção "Matutino + Vespertino"', (await page.locator('button:has-text("Matutino + Vespertino")').count()) > 0);
  await page.click('button:has-text("Matutino + Vespertino")');
  await page.waitForTimeout(200);
  await page.click('button:has-text("Resetar Matutino + Vespertino")');
  await page.waitForTimeout(1200);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  check('Aluno do matutino foi apagado', !kvStore.has('student:matutino:AlunoMat'));
  check('Aluno do vespertino foi apagado', !kvStore.has('student:vespertino:AlunoVesp'));
  check('Aluno da turma de TESTE continua intacto', kvStore.has('student:teste:AlunoTeste'));
  check('Aluno da sala de LINGUAGENS continua intacto', kvStore.has('student:linguagens:AlunoLinguagens'));

  await ctx.close();
  await browser.close();
  process.exit(summary('RESETAR "TODOS OS TURNOS" = SÓ MATUTINO + VESPERTINO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
