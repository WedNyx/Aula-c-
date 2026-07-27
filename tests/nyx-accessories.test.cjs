// Novos acessórios do Nyx (37 itens: cabeça, rosto, pescoço, mão, escudo): aparecem na loja,
// dá pra comprar/equipar, e o robô renderiza sem erro de JS com qualquer combinação.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

const NEW_ITEMS = [
  'touca', 'bone', 'chapeuFesta', 'bandana', 'gorroNatal', 'orelhinhas', 'tiara', 'capaceteObra', 'foneDJ', 'chapeuMago', 'capelo',
  'oculosNerd', 'vendaPirata', 'oculosAviador', 'oculos3d', 'monoculo', 'mascaraHeroi',
  'cachecol', 'golaSocial', 'colarHavaiano', 'gravataBorboleta', 'colarDev', 'medalha',
  'sorvete', 'guardaChuva', 'chaveInglesa', 'bandeiraCorrida', 'microfone', 'martelo', 'grimorio', 'varinha', 'tecladoMini', 'controle', 'trofeu',
  'tampaPanela', 'placaStop', 'livroGrosso',
];

(async () => {
  const kvStore = baseKvStore();
  kvStore.set('student:matutino:AlunoLoja', JSON.stringify({
    name: 'AlunoLoja', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 999,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.click('text=AlunoLoja');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  await page.click('button:has-text("Loja do Nyx")');
  await page.waitForTimeout(600);
  check('Loja do Nyx abriu', (await page.locator('h2:has-text("Loja do Nyx")').count()) > 0);

  check(`Todos os ${NEW_ITEMS.length} itens novos aparecem na loja`, (await Promise.all(NEW_ITEMS.map(id => page.locator(`[data-item="${id}"]`).count()))).every(c => c === 1));

  // um clique já compra E equipa (item novo) — um item de cada encaixe, pra ver o robô com todos ao mesmo tempo
  const sample = ['capelo', 'oculosNerd', 'medalha', 'varinha', 'livroGrosso'];
  for (const id of sample) {
    await page.locator(`[data-item="${id}"]`).click();
    await page.waitForTimeout(200);
  }
  check('Depois de comprar 5 itens novos (um de cada encaixe), item "capelo" está equipado', (await page.locator('[data-item="capelo"]:has-text("Equipado")').count()) > 0);
  check('SEM erro de JS depois de equipar vários itens novos', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await page.click('div.pop button:has-text("✕")').catch(()=>{});
  await page.waitForTimeout(400);
  check('SEM erro de JS no robô com os itens equipados renderizando fora da loja', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('NOVOS ACESSÓRIOS DO NYX (37 ITENS)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
