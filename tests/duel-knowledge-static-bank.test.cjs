// Duelo (1x1/dupla) e Teste de Conhecimento cobrem conceitos fundamentais de C# que não mudam de
// aluno pra aluno nem de dia pra dia — pedir pro Nyx "inventar" essas perguntas de novo toda vez
// era gasto sem necessidade (mesmo espírito do banco de reserva já usado no Torneio). Agora as
// duas usam um banco fixo local (src/lib/aiChallenges.js), sem chamar o Nyx nenhuma vez. Este
// teste substitui o antigo "duel-knowledge-invalid-question.test.cjs" (que testava o filtro de
// questões malformadas vindas da IA — não faz mais sentido, já que essas duas features não pedem
// mais nada à IA).
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoBanco', JSON.stringify({
    name: 'AlunoBanco', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 20,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  const claudePrompts = [];
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    const body = JSON.parse(route.request().postData() || '{}');
    claudePrompts.push(body.prompt || '');
    // se algo AINDA chamar a IA por engano, devolve lixo pra deixar bem visível num teste que falha
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: '{"questions":[]}' }] }) });
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoBanco', { timeout: 10000 });
  await page.click('text=AlunoBanco');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  // ── Teste de Conhecimento: 6 questões, sem chamar o Nyx ──
  const callsBeforeTest = claudePrompts.length;
  await page.click('button:has-text("🧠 Testar Conhecimento")');
  await page.waitForTimeout(800);
  await page.waitForSelector('div[data-q]', { timeout: 10000 });
  const testQCount = await page.locator('div[data-q]').count();
  check('Teste de Conhecimento tem as 6 questões do banco fixo', testQCount === 6, `qCount=${testQCount}`);
  check('Gerar o Teste de Conhecimento NÃO chamou o Nyx', claudePrompts.length === callsBeforeTest, JSON.stringify(claudePrompts.slice(callsBeforeTest)));
  await page.click('button:has-text("✕")').catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});

  // ── Duelo 1x1: abre a lista de alunos pra duelar (precisa de outro aluno online pra desafiar de
  // verdade, então só confirmamos aqui que abrir o modal não gasta Nyx nenhuma — a geração das 5
  // perguntas só acontece ao clicar "Desafiar", coberta indiretamente pelo mesmo generateDuelQuestions) ──
  const callsBeforeDuel = claudePrompts.length;
  await page.click('button:has-text("Duelo entre alunos")').catch(() => {});
  await page.waitForTimeout(500);
  check('Abrir o Duelo NÃO chamou o Nyx', claudePrompts.length === callsBeforeDuel, JSON.stringify(claudePrompts.slice(callsBeforeDuel)));

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('DUELO E TESTE DE CONHECIMENTO USAM BANCO FIXO, SEM CHAMAR O NYX') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
