// endBoss() não tinha nenhuma trava contra clique duplo (diferente de outras ações parecidas no
// mesmo arquivo) — numa conexão ruim, um segundo clique em "🏁 Encerrar festa" antes do primeiro
// terminar disparava o bônus de derrota (+3 pts) DUAS VEZES pra cada aluno que contribuiu.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  // chefão com HP baixo e o aluno já com pontos suficientes pra já estar derrotado assim que o
  // telão abrir (studyUntil no passado, então nem passa pela tela de estudo)
  kvStore.set('boss:config:matutino', JSON.stringify({
    status: 'active', name: 'Bugzilla', emoji: '👾', maxHp: 10,
    baseline: { 'matutino:AlunoBoss': 0 },
    startedAt: Date.now() - 700000, studyUntil: Date.now() - 600000,
  }));
  kvStore.set('student:matutino:AlunoBoss', JSON.stringify({
    name: 'AlunoBoss', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 15, score: 80,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  let scoreFixSetCount = 0;
  page.on('request', (req) => {
    if (!req.url().includes('/api/kv')) return;
    const body = req.postData() || '';
    if (body.includes('"action":"set"') && body.includes('"key":"scorefix:matutino:AlunoBoss"')) scoreFixSetCount++;
  });

  await loginTeacher(page);
  await page.click('button:has-text("🖥️ Telão")');
  await page.waitForTimeout(1000); // dá tempo do estado do chefão carregar

  check('Chefão aparece derrotado assim que o telão abre', (await page.locator('text=FOI DERROTADO').count()) > 0);
  const endBtn = page.locator('button:has-text("🏁 Encerrar festa")');
  check('Botão "Encerrar festa" está visível', (await endBtn.count()) > 0);

  // dispara os dois cliques o mais próximo possível um do outro, sem esperar o primeiro terminar
  await Promise.all([endBtn.click({ timeout: 5000 }).catch(() => {}), endBtn.click({ timeout: 5000 }).catch(() => {})]);
  await page.waitForTimeout(1000);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  check('O bônus de derrota só foi gravado UMA vez, mesmo com o clique duplo', scoreFixSetCount === 1, `scoreFixSetCount=${scoreFixSetCount}`);

  await ctx.close();
  await browser.close();
  process.exit(summary('CHEFÃO: BÔNUS DE DERROTA NÃO DUPLICA NO CLIQUE DUPLO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
