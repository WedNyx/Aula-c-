// Chefão/Torneio/Quiz do telão agora são independentes por turma — antes eram chaves globais
// únicas (boss:config, tourney:config, quiz:room), então duas turmas do mesmo turno (ou até
// turnos diferentes) sempre viam a MESMA partida, mesmo sem o professor querer isso. Este teste
// inicia um Chefão na turma "vespertino" e confirma que um aluno logado na turma "vespertino-b"
// nunca vê nada dele — nem no polling da própria tela, nem na chave do servidor.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('turmas:list', JSON.stringify([
    { id: 'matutino', label: 'Matutino', emoji: '☀️', period: 'matutino', color: '#f59e0b', createdAt: 0, archived: false },
    { id: 'vespertino', label: 'Vespertino', emoji: '🌙', period: 'vespertino', color: '#c084fc', createdAt: 0, archived: false },
    { id: 'vespertino-b', label: 'Vespertino B', emoji: '🌙', period: 'vespertino', color: '#22d3ee', createdAt: 1, archived: false },
  ]));
  kvStore.set('student:vespertino:AlunoA', JSON.stringify({
    name: 'AlunoA', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 5, score: 70,
  }));
  kvStore.set('student:vespertino-b:AlunoB', JSON.stringify({
    name: 'AlunoB', shift: 'vespertino-b', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 5, score: 70,
  }));

  const browser = await launchBrowser();

  // ── professor inicia um Chefão na turma "vespertino" pelo Telão ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await loginTeacher(page);
    await page.click('button:has-text("🖥️ Telão")');
    await page.waitForTimeout(500);
    // escopado dentro do próprio telão (data-testid="telao-modal") — por baixo dele a aba de
    // Monitoramento continua montada, com um filtro de turma que tem os mesmos textos de botão
    const telao = page.locator('[data-testid="telao-modal"]');
    // troca o telão pra turma "vespertino" (o seletor do telão já é data-driven pela lista de turmas)
    await telao.locator('button:has-text("🌙 Vespertino"):not(:has-text("Vespertino B"))').click();
    await page.waitForTimeout(300);
    const summonBtn = telao.locator('button:has-text("Fácil · 30 HP")').first();
    if (await summonBtn.count()) { await summonBtn.click(); await page.waitForTimeout(500); }
    check('SEM erro de JS ao invocar chefão', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  check('Chave do chefão ficou isolada por turma (boss:config:vespertino existe)', kvStore.has('boss:config:vespertino'));
  check('NÃO existe uma chave global boss:config (sem turma)', !kvStore.has('boss:config'));
  check('NÃO existe boss:config:vespertino-b (a outra turma nunca recebeu o chefão)', !kvStore.has('boss:config:vespertino-b'));

  // ── aluno da turma "vespertino-b" (a OUTRA turma) não deve ver o chefão de jeito nenhum ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('button:has-text("🌙 Vespertino B")');
    await page.waitForTimeout(300);
    await page.click('text=AlunoB');
    await page.waitForTimeout(2000); // dá tempo do tick() ler getBoss/getTourney/getQuizRoom da própria turma

    check('Aluno da turma B NÃO vê a tela de estudo do chefão da outra turma', (await page.locator('text=Um chefão está chegando').count()) === 0);
    check('SEM erro de JS (aluno da turma B)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ── aluno da turma "vespertino" (a turma DONA do chefão) continua vendo normalmente ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('button:has-text("🌙 Vespertino"):not(:has-text("Vespertino B"))');
    await page.waitForTimeout(300);
    await page.click('text=AlunoA');
    await page.waitForTimeout(2000);

    check('Aluno da turma DONA do chefão (vespertino) vê a tela de estudo normalmente', (await page.locator('text=Um chefão está chegando').count()) > 0);
    check('SEM erro de JS (aluno da turma vespertino)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(summary('TELÃO (CHEFÃO/TORNEIO/QUIZ) ISOLADO POR TURMA') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
