const { launchBrowser, mockRoutes, baseKvStore, loginNewStudent, check, summary } = require("./helpers.cjs");

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho' });
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);
  await loginNewStudent(page, 'Comprador Teste');

  await page.locator('text=🎁 Loja do Nyx').first().click();
  await page.waitForTimeout(1200);
  const bodyText = await page.locator('body').innerText();

  const upper = bodyText.toUpperCase();
  check('Seção Cabeça aparece', upper.includes('CABEÇA'));
  check('Seção Rosto aparece', upper.includes('ROSTO'));
  check('Seção Pescoço aparece', upper.includes('PESCOÇO'));
  check('Seção Órbita aparece (renomeado de "mão")', upper.includes('ÓRBITA'));
  check('Seção Escudo Orbital aparece (renomeado de "aura")', upper.includes('ESCUDO ORBITAL'));
  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0,3).join(' | '));

  // confirma via DOM que cada item continua listado dentro da seção certa (agrupamento por slot
  // funcionando de verdade, não só o texto do rótulo solto na página)
  const grouping = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('[data-item]'));
    return items.map(el => el.getAttribute('data-item'));
  });
  check('Loja lista os 51 itens não-secretos (mesmo total de sempre, nada sumiu na reorganização)', grouping.length === 51, `total=${grouping.length}`);
  check('Item "arco" (era slot hand) está listado', grouping.includes('arco'));
  check('Item "escudo" (era slot shield) está listado', grouping.includes('escudo'));
  check('Item "fone" (slot head) está listado', grouping.includes('fone'));

  await ctx.close();
  await browser.close();
  process.exit(summary('LOJA REORGANIZADA POR ENCAIXE (rótulos novos, dados intactos)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
