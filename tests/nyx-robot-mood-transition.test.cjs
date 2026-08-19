// O robô Nyx muda de cor suavemente (via GSAP) quando o "humor" muda (idle → thinking → ok/erro) —
// mas o JSX também deixava a cor de vários elementos presa direto a P.main/P.dark/P.eye, então o
// React já escrevia a cor NOVA no SVG antes do GSAP entrar em ação (a própria mudança de estado já
// dispara o re-render). O GSAP então animava "da cor nova pra cor nova": a transição virava um
// no-op silencioso, e a cor só trocava seca, sem a suavidade que o código dizia ter. Este teste
// confirma que agora existe mesmo um período de transição (a cor NÃO chega no valor final
// instantaneamente) e que, depois da duração da transição, ela chega certinho no valor esperado.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

const csharpCode = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); } }';

(async () => {
  const kvStore = baseKvStore();
  kvStore.set('student:matutino:AlunoRobo', JSON.stringify({
    name: 'AlunoRobo', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: csharpCode }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 0,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  // resposta atrasada de propósito, pra dar tempo do teste espiar o robô ainda em "thinking"
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    await new Promise(r => setTimeout(r, 2000));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify({ analise: 'ok', ok: true, message: 'Mandou bem!', missingChars: [], errors: [] }) }] }) });
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoRobo', { timeout: 10000 });
  await page.click('text=AlunoRobo');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  // "pernas" do Nyx (Prisma Orbital) — elemento único no SVG (strokeWidth 28), controlado pelo
  // GSAP e pintado com P.dark (idle="#35296e", thinking="#403078")
  const legs = page.locator('svg path[stroke-width="28"]').first();
  await page.waitForSelector('button:has-text("✨ Analisar código")', { timeout: 10000 });
  await page.waitForTimeout(200); // deixa o firstPaint (gsap.set) assentar

  const before = (await legs.getAttribute('stroke') || '').toLowerCase();
  check('Cor das pernas começa no tom "idle" (#35296e)', before === '#35296e', before);

  await page.click('button:has-text("✨ Analisar código")');
  // logo em seguida (bem antes da transição de 0.65s terminar): a cor NÃO pode já estar no valor
  // final "thinking" — se estiver, é sinal de que trocou seca (o bug voltou)
  await page.waitForTimeout(80);
  const duringTransition = (await legs.getAttribute('stroke') || '').toLowerCase();
  check('Cor das pernas AINDA NÃO chegou no valor final logo após a mudança (existe transição de verdade)', duringTransition !== '#403078', duringTransition);

  // depois da duração da transição (0.65s) + folga: agora sim deve estar no valor final certo
  await page.waitForTimeout(900);
  const after = (await legs.getAttribute('stroke') || '').toLowerCase();
  check('Depois da transição, a cor chega certinho no tom "thinking" (#403078)', after === '#403078', after);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('ROBÔ NYX: TRANSIÇÃO DE COR ENTRE HUMORES ANIMA DE VERDADE (NÃO É MAIS TROCA SECA)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
