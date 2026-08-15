// generateDuelQuestions/generateKnowledgeTestQuestions (src/lib/aiChallenges.js) não passavam a
// resposta da IA por filterValidQuestions antes de shuffleQuestions() — diferente do caminho normal
// da atividade diária, que já tinha essa proteção. Se a IA devolvesse uma questão com "correct" fora
// do range das opções (ou sem "correct"), shuffleQuestions() fazia perm.indexOf(q.correct) virar -1,
// tornando aquela questão IMPOSSÍVEL de acertar pra qualquer aluno num duelo ou teste de
// conhecimento. Este teste confirma que questões malformadas são descartadas ANTES de chegar na tela.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoTeste', JSON.stringify({
    name: 'AlunoTeste', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 20,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  // 6 pedidas, mas 2 malformadas de propósito: uma com "correct" fora do range (99) e outra sem
  // "correct" nenhum — só as 4 válidas devem sobrar na tela
  await page.unroute('**/api/claude');
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.prompt.includes('teste de conhecimento') || body.prompt.includes('autoavaliar')) {
      const questions = [
        { q: 'Válida 1?', opts: ['A', 'B', 'C', 'D'], correct: 0 },
        { q: 'Válida 2?', opts: ['A', 'B', 'C', 'D'], correct: 1 },
        { q: 'Sem gabarito válido (fora do range)?', opts: ['A', 'B', 'C', 'D'], correct: 99 },
        { q: 'Sem campo correct nenhum?', opts: ['A', 'B', 'C', 'D'] },
        { q: 'Válida 3?', opts: ['A', 'B', 'C', 'D'], correct: 2 },
        { q: 'Válida 4?', opts: ['A', 'B', 'C', 'D'], correct: 3 },
      ];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify({ questions }) }] }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: '{"ok":true}' }] }) });
    }
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoTeste', { timeout: 10000 });
  await page.click('text=AlunoTeste');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  await page.click('button:has-text("🧠 Testar Conhecimento")');
  await page.waitForTimeout(1000);
  await page.waitForSelector('div[data-q]', { timeout: 10000 });

  const qCount = await page.locator('div[data-q]').count();
  check('As 2 questões malformadas foram descartadas (só 4 das 6 pedidas aparecem)', qCount === 4, `qCount=${qCount}`);
  check('As questões malformadas NÃO aparecem na tela', (await page.locator('text=Sem gabarito válido').count()) === 0 && (await page.locator('text=Sem campo correct nenhum').count()) === 0);
  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('DUELO/TESTE DE CONHECIMENTO: QUESTÕES SEM GABARITO VÁLIDO SÃO DESCARTADAS') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
