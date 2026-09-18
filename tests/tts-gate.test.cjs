// O botão de "ouvir em voz alta" (🗣️/🔊) só deve aparecer pra quem realmente precisa de apoio de
// leitura/visual/motora — não pra todo mundo. Cobre: aluno sem nenhum apoio (sem botão), aluno já
// com apoio marcado desde o início (com botão), e o próprio aluno ligando/desligando o apoio na
// hora (o botão aparece/some em tempo real, sem precisar recarregar a página).
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

// o botão de voz mudou de um botão solto (com title próprio) pra um item dentro do menu "⚙️
// Ajustes" do cabeçalho — precisa abrir o menu antes de checar se o item existe (o DashboardActionMenu
// só renderiza os itens no DOM quando está aberto)
async function voiceBtnVisible(page) {
  await page.click('button[aria-label="Abrir ajustes do painel do aluno"]');
  await page.waitForTimeout(200);
  const visible = (await page.locator('button:has-text("🗣️ Escolher voz do Nyx")').count()) > 0;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  return visible;
}

async function skipCheckins(page) {
  for (let i = 0; i < 5; i++) {
    const closeSanctuary = page.locator('[aria-label="Fechar Santuário Lunar"]');
    if (await closeSanctuary.count()) { await closeSanctuary.click({ force: true }); await page.waitForTimeout(300); continue; }
    const skip = page.locator('button:has-text("Pular hoje")');
    if (await skip.count()) { await skip.click(); await page.waitForTimeout(300); }
    else break;
  }
}

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoSemApoio', JSON.stringify({
    name: 'AlunoSemApoio', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));
  kvStore.set('student:matutino:AlunoComApoio', JSON.stringify({
    name: 'AlunoComApoio', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, selfSupport: { leitura: true },
  }));

  const browser = await launchBrowser();

  // 1) aluno SEM nenhum apoio: botão de voz não aparece
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('text=☀️ Matutino');
    await page.waitForTimeout(500);
    await page.click('text=AlunoSemApoio');
    await page.waitForTimeout(1200);
    await skipCheckins(page);

    check('Aluno sem nenhum apoio: botão de voz NÃO aparece', !(await voiceBtnVisible(page)));

    // liga "📖 Leitura" pra si mesmo — o botão de voz tem que aparecer NA HORA, sem recarregar
    await page.click('text=Preciso de um ajuste hoje?');
    await page.waitForTimeout(300);
    await page.click('button:has-text("📖 Leitura")');
    await page.waitForTimeout(500);
    check('Depois de ligar "Leitura" sozinho, o botão de voz aparece na hora', await voiceBtnVisible(page));
    check('selfSupport.leitura:true foi salvo', JSON.parse(kvStore.get('student:matutino:AlunoSemApoio')).selfSupport?.leitura === true);

    // desliga de novo — o botão tem que sumir de novo
    await page.click('button:has-text("📖 Leitura")');
    await page.waitForTimeout(500);
    check('Depois de desligar "Leitura", o botão de voz some de novo', !(await voiceBtnVisible(page)));

    check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 2) aluno que JÁ tinha apoio de leitura marcado (selfSupport.leitura:true desde o início):
  // o botão já aparece direto, sem precisar ligar nada
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('text=☀️ Matutino');
    await page.waitForTimeout(500);
    await page.click('text=AlunoComApoio');
    await page.waitForTimeout(1200);
    await skipCheckins(page);

    check('Aluno que já tinha apoio de leitura: botão de voz aparece direto', await voiceBtnVisible(page));
    check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(summary('BOTÃO DE VOZ (TTS) SÓ PRA QUEM PRECISA DE APOIO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
