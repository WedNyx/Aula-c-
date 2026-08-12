// O aviso "🔄 Reconectando Nyx" é compartilhado pela sala INTEIRA (reflete a última chamada de IA
// de qualquer aluno/professor). Antes, UMA falha isolada de UMA chamada — mesmo de um recurso
// secundário sem fallback entre provedores, tipo "Gerar nome do conteúdo" — já acendia o aviso pra
// todo mundo por até 5 minutos. Agora só acende depois de 2 falhas SEGUIDAS (sem sucesso entre
// elas); uma falha isolada só fica registrada (streak:1) sem alarmar a sala, e o contador reseta
// assim que qualquer chamada der certo de novo.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoStreak', JSON.stringify({
    name: 'AlunoStreak', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x = 1;\nConsole.WriteLine(x);' }],
    code: 'int x = 1;\nConsole.WriteLine(x);', phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 80,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  // controla se /api/claude falha (erro JSON de verdade, NÃO a variante não-JSON — essa tem
  // retentativa própria dentro do askClaude e mascararia o teste de streak) ou funciona
  let shouldFail = true;
  await page.unroute('**/api/claude');
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    if (shouldFail) { await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'falha simulada pelo teste' }) }); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: 'Nome de Teste Gerado' }] }) });
  });

  await loginTeacher(page);
  await page.waitForTimeout(500);
  await page.click('text=👨‍💻 Meu código');
  await page.waitForTimeout(500);

  const gerarBtn = () => page.click('button:has-text("Gerar nome do conteúdo (Matutino)")');
  const banner = page.locator('text=🔄 Reconectando Nyx...');

  // 1ª falha isolada: registra streak 1, mas NÃO acende o aviso pra sala
  await gerarBtn();
  await page.waitForTimeout(1000);
  let health = JSON.parse(kvStore.get('ai:health'));
  check('1ª falha isolada: streak fica em 1', health.streak === 1, JSON.stringify(health));
  await page.waitForTimeout(11000); // espera o próximo polling (10s) reavaliar o aviso
  check('1ª falha isolada NÃO acende "Reconectando Nyx" pra sala', (await banner.count()) === 0);

  // 2ª falha seguida (sem sucesso entre elas): streak vira 2, aviso acende
  await gerarBtn();
  await page.waitForTimeout(1000);
  health = JSON.parse(kvStore.get('ai:health'));
  check('2ª falha SEGUIDA: streak vira 2', health.streak === 2, JSON.stringify(health));
  await page.waitForTimeout(11000);
  check('2 falhas seguidas ACENDEM "Reconectando Nyx" pra sala', (await banner.count()) > 0);

  // sucesso: streak reseta e o aviso some
  shouldFail = false;
  await gerarBtn();
  await page.waitForTimeout(1000);
  health = JSON.parse(kvStore.get('ai:health'));
  check('Depois de um sucesso, ok volta a true (streak não importa mais)', health.ok === true, JSON.stringify(health));
  await page.waitForTimeout(11000);
  check('Depois do sucesso, "Reconectando Nyx" some', (await banner.count()) === 0);

  // nova falha isolada DEPOIS do sucesso: streak volta a 1 (não continua de onde parou antes)
  shouldFail = true;
  await gerarBtn();
  await page.waitForTimeout(1000);
  health = JSON.parse(kvStore.get('ai:health'));
  check('Falha isolada depois de um sucesso: streak reinicia em 1 (não acumula com falhas antigas)', health.streak === 1, JSON.stringify(health));

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('"RECONECTANDO NYX" SÓ ACENDE APÓS 2 FALHAS SEGUIDAS') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
