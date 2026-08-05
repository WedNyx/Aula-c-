// Um aluno online há muito tempo sem escrever nada não é mais tratado como "com dificuldade"
// (nível "dif", badge vermelho, entra na lista "Precisam de ajuda" e dispara o aviso de
// "Precisando de ajuda") — vira só um aviso neutro de inatividade.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore();
  // online agora, entrou há 15 min (> STUCK_MINUTES=8) e ainda não escreveu nada de verdade
  kvStore.set('student:matutino:AlunoParado', JSON.stringify({
    name: 'AlunoParado', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    code: '', phase: 'coding', joinedAt: Date.now() - 15 * 60000, lastSeen: Date.now(), nyxPoints: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.waitForTimeout(1000);
  await page.hover('[data-tour-prof="monitor-grid"]');
  await page.waitForSelector('text=AlunoParado', { timeout: 10000 });

  const tile = page.locator('.tilefx', { hasText: 'AlunoParado' });

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  check('Aluno parado NÃO aparece com o rótulo "Com dificuldade"', (await tile.locator('text=Com dificuldade').count()) === 0);
  check('Aluno parado aparece com o rótulo neutro "Começando"', (await tile.locator('text=Começando').count()) > 0);
  check('Aluno parado NÃO entra na lista "Precisam de ajuda"',
    !(await page.locator('text=Precisam de ajuda').locator('xpath=ancestor::div[1]').locator('text=AlunoParado').count()));

  await ctx.close();
  await browser.close();
  process.exit(summary('INATIVIDADE NÃO É TRATADA COMO DIFICULDADE') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
