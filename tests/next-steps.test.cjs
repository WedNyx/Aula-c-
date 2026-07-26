// Lista de "próximos passos" (recursos gratuitos pra continuar aprendendo depois da aula):
// botão no card Turma & Você abre um modal com links agrupados por categoria.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoPassos', JSON.stringify({
    name: 'AlunoPassos', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 80,
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
  await page.click('text=AlunoPassos');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  check('Botão "Próximos passos" aparece no card Turma & Você', (await page.locator('button:has-text("Próximos passos")').count()) > 0);
  await page.click('button:has-text("Próximos passos")');
  await page.waitForTimeout(500);

  check('Modal abriu (título aparece)', (await page.locator('h2:has-text("Próximos passos")').count()) > 0);
  check('Categoria "Continue com C# e .NET" aparece', (await page.locator('text=/Continue com C# e \\.NET/').count()) > 0);
  check('Recurso "Microsoft Learn" aparece com link', (await page.locator('a:has-text("Microsoft Learn")').count()) > 0);
  check('Recurso "freeCodeCamp" aparece com link', (await page.locator('a:has-text("freeCodeCamp")').count()) > 0);
  const link = page.locator('a:has-text("Microsoft Learn")').first();
  check('Link abre em nova aba (target=_blank)', (await link.getAttribute('target')) === '_blank');
  check('Link tem rel="noopener noreferrer" (segurança)', (await link.getAttribute('rel') || '').includes('noopener'));
  check('Link aponta para https', ((await link.getAttribute('href')) || '').startsWith('https://'));

  await page.click('div.pop button:has-text("✕")');
  await page.waitForTimeout(300);
  check('Modal fechou ao clicar no X', (await page.locator('h2:has-text("Próximos passos")').count()) === 0);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('PRÓXIMOS PASSOS (RECURSOS GRATUITOS)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
