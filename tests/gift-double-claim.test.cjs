// Presente misterioso do dia: dois toques BEM rápidos seguidos no botão (comum na tela touch da
// carreta) não podem premiar o aluno 2x. openGift() lia/escrevia nyxPoints/giftLastClaim via
// closure do React state — como dois cliques síncronos entram na função antes do primeiro
// setState ser refletido num novo render, os dois passavam pela checagem "já resgatei hoje?" e o
// aluno ganhava os pontos do presente duas vezes.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoPresente', JSON.stringify({
    name: 'AlunoPresente', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }],
    phase: 'done', lastSeen: Date.now(), nyxPoints: 50, score: 90, doneAt: Date.now(),
    finalFeedback: 'Mandou bem hoje!',
    // giftLastClaim ausente/de outro dia — presente ainda não resgatado hoje
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
  await page.waitForSelector('text=AlunoPresente', { timeout: 10000 });
  await page.click('text=AlunoPresente');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  check('Tela de "Aula Concluída" carregou', (await page.locator('text=🎓 Aula Concluída').count()) > 0);
  check('Botão do presente misterioso aparece', (await page.locator('text=Presente misterioso do dia').count()) > 0);

  // dois cliques SÍNCRONOS no mesmo botão, um logo depois do outro, sem deixar o React re-renderizar
  // entre eles (dispatchEvent síncrono) — é exatamente esse encadeamento que reproduzia o bug
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Presente misterioso do dia'));
    btn.click();
    btn.click();
  });
  await page.waitForTimeout(1000);

  check('Painel de resultado do presente aparece (só 1x, não duplicado)', (await page.locator('text=pontos do Nyx ✨').count()) === 1);

  const after = JSON.parse(kvStore.get('student:matutino:AlunoPresente'));
  check('nyxPoints só aumentou pela quantia de UM presente (não dobrou)', after.nyxPoints > 50 && after.nyxPoints - 50 <= 60, `nyxPoints antes=50 depois=${after.nyxPoints} (+${after.nyxPoints - 50})`);

  // confere contra o valor exibido na tela pra garantir que bate exatamente com 1 presente só
  const shownText = await page.locator('text=/\\+\\d+ pontos do Nyx/').first().textContent();
  const shownPts = Number((shownText.match(/\+(\d+)/) || [])[1]);
  check('Pontos mostrados na tela batem exatamente com o que foi salvo (nenhum resgate "fantasma")', shownPts > 0 && (50 + shownPts) === after.nyxPoints, `mostrado=+${shownPts} salvo=${after.nyxPoints}`);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('PRESENTE DO DIA: SEM RESGATE DUPLICADO NO CLIQUE RÁPIDO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
