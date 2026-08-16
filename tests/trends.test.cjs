// Dashboard de tendências: evolução da nota E da presença da turma ao longo das aulas.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const classDays = ['2026-07-13', '2026-07-15', '2026-07-17', '2026-07-20', '2026-07-22'];
  const kvStore = baseKvStore({ classDays });
  // fixo, bem ANTES do primeiro dia de aula do teste (2026-07-13) — não pode ser relativo a
  // Date.now(): como o teste é rodado em sessões que às vezes duram muitas horas seguidas, um
  // "matriculado há 30 dias" calculado na hora podia avançar pra DEPOIS de 13/07 ou 15/07 (se a
  // sessão atravessasse a meia-noite tempo suficiente), fazendo esses dias sumirem do gráfico por
  // engano (contados como "antes de entrar na turma") e mudando a tendência calculada
  const enrolledSince = new Date('2026-06-01T00:00:00Z').getTime();
  // AlunoX: presente em todos os dias, notas subindo (60 → 90) — presença 100%, tendência de nota "Melhorando"
  kvStore.set('student:matutino:AlunoX', JSON.stringify({
    name: 'AlunoX', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }], phase: 'coding',
    lastSeen: Date.now(), nyxPoints: 0, createdAt: enrolledSince,
    scoreHistory: { '2026-07-13': 60, '2026-07-15': 68, '2026-07-17': 75, '2026-07-20': 85, '2026-07-22': 90 },
    attendance: { '2026-07-13': 'present', '2026-07-15': 'present', '2026-07-17': 'present', '2026-07-20': 'present', '2026-07-22': 'present' },
  }));
  // AlunoY: faltou nos 2 últimos dias — presença cai, ajuda a puxar a média de presença pra baixo no final
  kvStore.set('student:matutino:AlunoY', JSON.stringify({
    name: 'AlunoY', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int y=2;' }], phase: 'coding',
    lastSeen: Date.now(), nyxPoints: 0, createdAt: enrolledSince,
    scoreHistory: { '2026-07-13': 70, '2026-07-15': 72 },
    attendance: { '2026-07-13': 'present', '2026-07-15': 'present' },
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1200 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.click('text=👥 Monitoramento');
  await page.waitForTimeout(800);

  check('Card "Evolução da turma" (nota) aparece', (await page.locator('text=📊 Evolução da turma nas últimas aulas').count()) > 0);
  check('Card "Evolução da presença" aparece', (await page.locator('text=🗓️ Evolução da presença nas últimas aulas').count()) > 0);

  // a nota devia estar "Melhorando" (subiu de 60~70 pra 80~90 em média)
  const notaCard = page.locator('text=📊 Evolução da turma nas últimas aulas').locator('xpath=ancestor::div[contains(@class,"cardfx")]');
  check('Tendência de nota mostra "Melhorando"', (await notaCard.locator('text=📈 Melhorando').count()) > 0);

  // a presença devia estar "Caindo" (AlunoY parou de vir, só AlunoX continuou)
  const presencaCard = page.locator('text=🗓️ Evolução da presença nas últimas aulas').locator('xpath=ancestor::div[contains(@class,"cardfx")]');
  check('Tendência de presença mostra "Caindo"', (await presencaCard.locator('text=📉 Caindo').count()) > 0);

  // espera o Recharts carregar (import dinâmico) e confere que o SVG do gráfico realmente desenhou
  await page.waitForTimeout(1500);
  const notaSvg = notaCard.locator('svg.recharts-surface');
  const presencaSvg = presencaCard.locator('svg.recharts-surface');
  check('Gráfico de nota renderizou (SVG do Recharts)', (await notaSvg.count()) > 0);
  check('Gráfico de presença renderizou (SVG do Recharts)', (await presencaSvg.count()) > 0);

  // os dois gráficos não podem compartilhar o mesmo id de gradiente (senão um "rouba" a cor do outro)
  const gradIds = await page.locator('linearGradient').evaluateAll(els => els.map(e => e.id));
  const uniqueIds = new Set(gradIds);
  check('IDs de gradiente dos dois gráficos são únicos (sem colisão de cor)', uniqueIds.size === gradIds.length, JSON.stringify(gradIds));

  await presencaSvg.first().screenshot({ path: '/tmp/trend_attendance.png' }).catch(() => {});
  await notaSvg.first().screenshot({ path: '/tmp/trend_score.png' }).catch(() => {});

  check('SEM erro JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('DASHBOARD DE TENDÊNCIAS (NOTA + PRESENÇA)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
