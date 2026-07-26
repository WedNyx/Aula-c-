// Portfólio público (/portfolio/<turno>/<nome>): opt-in do aluno, sem login, sem dado sensível.
// 3 cenários: (1) aluno liga o opt-in no próprio painel e o link fica acessível com os dados certos,
// (2) sem opt-in o link mostra "não disponível" em vez do progresso, (3) professor consegue ver e
// desativar o portfólio de um aluno que ligou (moderação).
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher, TEACHER_PASSWORD } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20', '2026-07-22'] });
  kvStore.set('student:matutino:AlunoPortfolio', JSON.stringify({
    name: 'AlunoPortfolio', shift: 'matutino', avatar: { bg: '#c084fc' },
    files: [{ name: 'Program.cs', code: 'int x=1;' }], phase: 'coding', lastSeen: Date.now(),
    nyxPoints: 12, score: 88, examScore: 91, scoreHistory: { '2026-07-20': 70, '2026-07-22': 88 },
    attendance: { '2026-07-20': 'present', '2026-07-22': 'present' },
    achievements: ['primeira-atividade', 'nota-cem'],
    summaryHistory: { '2026-07-20': { secoes: [{ emoji: '💡', titulo: 'Variáveis' }] }, '2026-07-22': { secoes: [{ emoji: '🔁', titulo: 'Laços' }] } },
    portfolioPublic: false, birthDate: '2011-03-01', cpf: '123.456.789-00',
  }));
  kvStore.set('student:matutino:AlunoSemOptin', JSON.stringify({
    name: 'AlunoSemOptin', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int y=2;' }],
    phase: 'coding', lastSeen: Date.now(), score: 60, portfolioPublic: false,
  }));

  const browser = await launchBrowser();

  // ── 1) link SEM opt-in ainda: mostra "não disponível", nunca o progresso do aluno ──
  {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 800 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await page.goto('http://localhost:4173/portfolio/matutino/AlunoSemOptin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    check('Sem opt-in: mensagem de indisponível aparece', (await page.locator('text=/não está disponível/').count()) > 0);
    check('Sem opt-in: nota do aluno NÃO aparece', !(await page.locator('body').innerText()).includes('60'));
    check('Sem opt-in SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ── 2) aluno ativa o opt-in pelo próprio painel, e o link público passa a funcionar ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('text=☀️ Matutino');
    await page.waitForTimeout(500);
    await page.click('text=AlunoPortfolio');
    await page.waitForTimeout(1200);
    for (let i = 0; i < 5; i++) {
      const skipCheckin = page.locator('button:has-text("Pular hoje")');
      if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
      else break;
    }
    check('Checkbox do portfólio aparece desmarcado', !(await page.locator('input[type="checkbox"]').first().isChecked()));
    await page.click('text=Criar link público do meu progresso');
    await page.waitForTimeout(500);
    check('Depois de marcar, botão "Copiar link" aparece', (await page.locator('button:has-text("Copiar link")').count()) > 0);
    check('portfolioPublic:true foi salvo no registro do aluno', JSON.parse(kvStore.get('student:matutino:AlunoPortfolio')).portfolioPublic === true);
    await ctx.close();
  }

  // ── 3) com opt-in ativo, o link público mostra os dados certos e esconde os sensíveis ──
  {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await page.goto('http://localhost:4173/portfolio/matutino/AlunoPortfolio', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const bodyText = await page.locator('body').innerText();
    check('Nome do aluno aparece', bodyText.includes('AlunoPortfolio'));
    check('Contagem de conquistas aparece (2/', bodyText.includes('2/'));
    check('Aulas participadas (2) aparece', (await page.locator('text=Aulas participadas').count()) > 0);
    check('Conceitos aprendidos aparece', (await page.locator('text=Conceitos aprendidos').count()) > 0);
    check('Melhor nota (91) aparece', bodyText.includes('91'));
    check('Conquista "Primeiro Passo" aparece', (await page.locator('text=Primeiro Passo').count()) > 0);
    check('Conquista "Nota Cem" aparece', (await page.locator('text=Nota Cem').count()) > 0);
    check('CPF NÃO aparece na página pública', !bodyText.includes('123.456.789-00'));
    check('Data de nascimento NÃO aparece na página pública', !bodyText.includes('2011-03-01'));
    check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ── 4) professor vê que o portfólio está ativo e consegue desativar (moderação) ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await loginTeacher(page);
    await page.click('text=👥 Monitoramento');
    await page.waitForTimeout(500);
    const monitorCard = page.locator('h3:has-text("Monitoramento")').locator('xpath=..');
    await monitorCard.hover();
    await page.waitForTimeout(900);
    await page.click('text=AlunoPortfolio');
    await page.waitForTimeout(500);
    check('Professor vê o badge de "Link público ativo"', (await page.locator('text=/Link público ativo/').count()) > 0);
    await page.click('button:has-text("Desativar")');
    await page.waitForTimeout(600);
    check('Depois de desativar, portfolioPublic:false no registro', JSON.parse(kvStore.get('student:matutino:AlunoPortfolio')).portfolioPublic === false);
    check('SEM erro de JS (professor)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(summary('PORTFÓLIO PÚBLICO DO ALUNO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
