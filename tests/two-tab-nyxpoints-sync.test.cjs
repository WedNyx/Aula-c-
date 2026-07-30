// O aluno pode ter duas abas/dispositivos abertos ao mesmo tempo com o MESMO perfil (ex: celular
// e computador da escola). O autosave periódico (tick() a cada 12s) sempre reescrevia o registro
// INTEIRO com a cópia local — se uma aba ganhasse pontos (duelo, torneio, bônus do chefão) enquanto
// a outra aba ficava parada com o valor antigo em memória, a próxima vez que a aba parada salvasse
// apagava silenciosamente os pontos que a outra tinha acabado de ganhar. Este teste simula essa
// segunda aba (mudando o registro no "servidor" mockado por fora, como se fosse outra sessão) e
// confirma que o autosave da aba aberta ADOTA o valor mais novo em vez de sobrescrever com o antigo.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoDuasAbas', JSON.stringify({
    name: 'AlunoDuasAbas', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x = 1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 10, nyxSpent: 0, score: null,
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
  await page.waitForSelector('text=AlunoDuasAbas', { timeout: 10000 });
  await page.click('text=AlunoDuasAbas');
  await page.waitForTimeout(1500); // carrega o perfil (nyxPoints=10) e roda o primeiro tick()

  await page.waitForSelector('text=🎁 Loja do Nyx · 10 pts', { timeout: 10000 });
  check('Estado inicial: mostra os 10 pts carregados do servidor', true);

  // simula a OUTRA aba/dispositivo ganhando pontos (ex: venceu um duelo) e salvando por conta própria
  kvStore.set('student:matutino:AlunoDuasAbas', JSON.stringify({
    name: 'AlunoDuasAbas', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x = 1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 45, nyxSpent: 0, score: null,
  }));

  // espera o próximo autosave periódico desta aba (tick a cada 12s) — SEM esse merge, ele reescreveria
  // o registro inteiro com os 10 pts antigos que ainda estão na memória desta aba, apagando os 45
  await page.waitForTimeout(13000);

  const after = JSON.parse(kvStore.get('student:matutino:AlunoDuasAbas'));
  check('Depois do autosave: o servidor continua com os 45 pts da OUTRA aba (não foi sobrescrito de volta pra 10)',
    after.nyxPoints === 45, `nyxPoints=${after.nyxPoints}`);
  await page.waitForSelector('text=🎁 Loja do Nyx · 45 pts', { timeout: 5000 });
  check('A tela desta aba também atualizou pra mostrar os 45 pts (adotou o valor do servidor)', true);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('SINCRONIZAÇÃO ENTRE DUAS ABAS DO MESMO ALUNO: PONTOS DE OUTRA ABA NÃO SÃO PERDIDOS') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
