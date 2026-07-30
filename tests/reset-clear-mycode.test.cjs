// Resetar uma turma agora tem a opção de também limpar o código do professor na aba "Meu código"
// daquele turno — sem marcar a opção, o código continua intacto (comportamento de sempre); com ela
// marcada, só o(s) turno(s) escolhido(s) no reset é(são) limpo(s), o outro turno não é mexido.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('teachercode:matutino', JSON.stringify({ files: [{ name: 'Program.cs', code: 'int x = 1; // codigo da manha' }], at: Date.now() }));
  kvStore.set('teachercode:vespertino', JSON.stringify({ files: [{ name: 'Program.cs', code: 'int y = 2; // codigo da tarde' }], at: Date.now() }));
  kvStore.set('student:matutino:AlunoMat', JSON.stringify({
    name: 'AlunoMat', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), score: 80,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.waitForTimeout(1500); // dá tempo do "Meu código" carregar dos dois turnos antes do reset

  await page.click('text=👥 Monitoramento');
  await page.waitForTimeout(500);
  await page.click('button:has-text("🔄 Resetar")');
  await page.waitForTimeout(400);

  check('Checkbox de limpar "Meu código" aparece no modal de reset', (await page.locator('text=Também limpar o meu código').count()) > 0);
  await page.click('text=Também limpar o meu código');
  await page.click('button:has-text("Só ☀️ Matutino")');
  await page.waitForTimeout(200);
  await page.click('button:has-text("Resetar Matutino")');
  await page.waitForTimeout(1800); // reset + debounce do autosave de "Meu código" (1s)

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  check('Aluno do matutino foi apagado (reset normal continua funcionando)', !kvStore.has('student:matutino:AlunoMat'));

  const matCode = JSON.parse(kvStore.get('teachercode:matutino'));
  const vespCode = JSON.parse(kvStore.get('teachercode:vespertino'));
  check('Código do MATUTINO (turno resetado) foi limpo', (matCode.files[0].code || '') === '', `code="${matCode.files[0].code}"`);
  check('Código do VESPERTINO (turno NÃO resetado) continua intacto', vespCode.files[0].code === 'int y = 2; // codigo da tarde');

  await ctx.close();
  await browser.close();
  process.exit(summary('RESET: OPÇÃO DE LIMPAR "MEU CÓDIGO" JUNTO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
