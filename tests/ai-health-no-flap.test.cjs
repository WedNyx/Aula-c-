// "Analisar código" tenta os modelos em sequência (Nemotron → Laguna → Claude) e só usa o próximo
// se o anterior falhar, SEM avisar o aluno no meio do caminho. Antes desta correção, CADA tentativa
// isolada escrevia na chave GERAL de saúde do Nyx (ai:health) — então o primeiro modelo instável
// acendia "🔄 Reconectando Nyx" pra sala inteira mesmo quando o próximo modelo resolvia sozinho no
// mesmo clique. Agora só o resultado FINAL da sequência escreve na chave geral; a saúde POR MODELO
// (ai:health:nvidia / ai:health:laguna) continua sendo registrada em cada tentativa normalmente.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, mockClaudeBody } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore();
  // grava um histórico de toda escrita nas chaves de saúde do Nyx, na ordem em que aconteceram —
  // é isso que prova que a chave GERAL nunca viu um "false" durante a sequência, não só o estado final
  const healthWrites = [];
  const originalSet = kvStore.set.bind(kvStore);
  kvStore.set = (key, value) => {
    if (key === 'ai:health' || key === 'ai:health:nvidia' || key === 'ai:health:laguna' || key === 'ai:health:anthropic') {
      try { healthWrites.push({ key, ...JSON.parse(value) }); } catch { healthWrites.push({ key, raw: value }); }
    }
    return originalSet(key, value);
  };

  kvStore.set('student:matutino:AlunoAnalise', JSON.stringify({
    name: 'AlunoAnalise', shift: 'matutino', avatar: {},
    files: [{ name: 'Program.cs', code: 'int nome = 1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  // sobrepõe o mock genérico de /api/claude: falha só quando o pedido explicitamente pede o modelo
  // "nvidia" (o primeiro da fila) — simula a instabilidade do modelo gratuito. Qualquer outro
  // provider (laguna, anthropic, ou nenhum — chamadas automáticas de fundo tipo curiosidade do dia)
  // responde normalmente.
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.provider === 'nvidia') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'nvidia instável (simulado pelo teste)' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: mockClaudeBody(body.prompt) }] }) });
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoAnalise', { timeout: 10000 });
  await page.click('text=AlunoAnalise');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  await page.waitForSelector('button:has-text("✨ Analisar código")', { timeout: 10000 });
  healthWrites.length = 0; // ignora qualquer chamada de fundo do carregamento da página (curiosidade etc.)
  await page.click('button:has-text("✨ Analisar código")');
  // espera o botão voltar ao normal (a sequência nvidia→laguna já terminou)
  await page.waitForSelector('button:has-text("✨ Analisar código"):not(:has-text("Analisando"))', { timeout: 15000 });
  await page.waitForTimeout(500);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  const globalWrites = healthWrites.filter(w => w.key === 'ai:health');
  check('A chave GERAL (ai:health) nunca recebeu "false" durante a sequência com fallback',
    globalWrites.every(w => w.ok !== false), JSON.stringify(globalWrites));
  check('A chave GERAL registrou o sucesso final (ok:true) depois da sequência',
    globalWrites.some(w => w.ok === true));
  check('A chave POR MODELO do nvidia registrou a falha isolada (ok:false) — diagnóstico continua granular',
    healthWrites.some(w => w.key === 'ai:health:nvidia' && w.ok === false));
  check('A chave POR MODELO do laguna registrou o sucesso (ok:true)',
    healthWrites.some(w => w.key === 'ai:health:laguna' && w.ok === true));

  await ctx.close();
  await browser.close();
  process.exit(summary('SAÚDE DO NYX NÃO PISCA COM FALLBACK ENTRE MODELOS') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
