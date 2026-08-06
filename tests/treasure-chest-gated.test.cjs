// O baú de tesouro escondido só devia existir pra quem já desbloqueou o Chapéu Pirata (o segredo
// "nyx pirata" digitado no Terminal) — antes dessa correção, o ícone do baú ficava sempre no DOM
// (só com opacidade baixíssima), então qualquer aluno podia achar e clicar nele sem nunca ter
// descoberto o segredo do chapéu.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore();
  kvStore.set('student:matutino:SemChapeu', JSON.stringify({
    name: 'SemChapeu', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x = 1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, nyxOwned: [], treasureFound: false,
  }));
  kvStore.set('student:matutino:ComChapeu', JSON.stringify({
    name: 'ComChapeu', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x = 1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 100, nyxOwned: ['chapeuPirata'], treasureFound: false,
  }));

  const browser = await launchBrowser();

  // ── 1) aluno SEM o chapéu pirata desbloqueado: o baú não pode nem existir na tela ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('text=☀️ Matutino');
    await page.waitForTimeout(500);
    await page.waitForSelector('text=SemChapeu', { timeout: 10000 });
    await page.click('text=SemChapeu');
    await page.waitForTimeout(1500);

    check('SEM erro de JS (aluno sem chapéu)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    check('Baú NÃO existe no DOM pra quem nunca desbloqueou o Chapéu Pirata',
      (await page.locator('span:text-is("🏴‍☠️")').count()) === 0);

    await ctx.close();
  }

  // ── 2) aluno COM o chapéu pirata: o baú existe e funciona normalmente ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('text=☀️ Matutino');
    await page.waitForTimeout(500);
    await page.waitForSelector('text=ComChapeu', { timeout: 10000 });
    await page.click('text=ComChapeu');
    await page.waitForTimeout(1500);

    const chest = page.locator('span:text-is("🏴‍☠️")');
    check('Baú EXISTE no DOM pra quem já tem o Chapéu Pirata', (await chest.count()) > 0);
    // o baú fica encostado no canto extremo inferior da tela (16x16px, opacidade quase invisível de
    // propósito, é um easter egg) — dispatchEvent em vez de click() evita falso-negativo de
    // "fora da viewport visível" só por estar colado na borda
    await chest.first().dispatchEvent('click');
    await page.waitForTimeout(500);

    check('SEM erro de JS (aluno com chapéu)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    const after = JSON.parse(kvStore.get('student:matutino:ComChapeu'));
    check('Clicar no baú marca treasureFound e soma 700 pontos', after.treasureFound === true && after.nyxPoints === 800, `treasureFound=${after.treasureFound} nyxPoints=${after.nyxPoints}`);

    await ctx.close();
  }

  await browser.close();
  process.exit(summary('BAÚ DE TESOURO SÓ EXISTE COM O CHAPÉU PIRATA DESBLOQUEADO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
