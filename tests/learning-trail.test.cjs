// Trilha de aprendizado: linha do tempo visual com um "nó" por dia de aula salvo, mostrando os
// conceitos (secoes) daquele dia. Testa aluno já existente (com summaryHistory de 2 dias) abrindo
// o modal a partir do card "Turma & Você".
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20', '2026-07-22'] });
  const summaryHistory = {
    '2026-07-20': { intro: 'Primeira aula!', secoes: [
      { emoji: '💡', titulo: 'Variáveis', explicacao: 'Guardam valores.', exemplo: 'int x = 1;' },
      { emoji: '🔁', titulo: 'Laços', explicacao: 'Repetem código.', exemplo: 'for(...)' },
    ] },
    '2026-07-22': { intro: 'Segunda aula!', secoes: [
      { emoji: '🧩', titulo: 'Funções', explicacao: 'Organizam código.', exemplo: 'void Foo(){}' },
    ] },
  };
  kvStore.set('student:matutino:AlunoTrilha', JSON.stringify({
    name: 'AlunoTrilha', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 80, summaryHistory,
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
  await page.waitForSelector('text=AlunoTrilha', { timeout: 10000 });
  await page.click('text=AlunoTrilha');
  await page.waitForTimeout(1200);

  // dispensa check-in de humor se aparecer (aluno já existente não passa por onboarding/tour)
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  check('Botão "Trilha de aprendizado" aparece no card Turma & Você', (await page.locator('button:has-text("Trilha de aprendizado")').count()) > 0);

  await page.click('button:has-text("Trilha de aprendizado")');
  await page.waitForTimeout(500);

  check('Modal da trilha abriu (título aparece)', (await page.locator('text=Trilha de aprendizado').count()) > 0);
  check('Resumo de contagem aparece (2 aulas · 3 conceitos)', (await page.locator('text=/2 aulas.*3 conceitos/').count()) > 0);
  check('Nó do dia 20/07 aparece', (await page.locator('text=20/07').count()) > 0);
  check('Nó do dia 22/07 aparece', (await page.locator('text=22/07').count()) > 0);
  check('Conceito "Variáveis" aparece', (await page.locator('text=Variáveis').count()) > 0);
  check('Conceito "Laços" aparece', (await page.locator('text=Laços').count()) > 0);
  check('Conceito "Funções" aparece', (await page.locator('text=Funções').count()) > 0);
  check('Nó indicando a próxima aula aparece', (await page.locator('text=/próxima aula continua/').count()) > 0);

  // fecha o modal e confere que sumiu
  await page.click('div.pop button:has-text("✕")');
  await page.waitForTimeout(300);
  check('Modal fechou ao clicar no X', (await page.locator('text=/2 aulas.*3 conceitos/').count()) === 0);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('TRILHA DE APRENDIZADO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
