// O chat livre do Nyx foi tirado da tela do ALUNO (cada mensagem enviada custava uma chamada de
// IA) — o professor continua com o chat dele (tem comandos importantes de sala, tipo "zek"). A
// troca de cor do fundo, que antes só dava pra pedir via chat ("muda a cor pra..."), agora tem um
// seletor de cor direto, sem passar pelo Nyx nenhuma vez.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginNewStudent, loginTeacher } = require('./helpers.cjs');

(async () => {
  // ── lado do aluno: sem chat, cor de fundo sem IA ──
  {
    const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
    const browser = await launchBrowser();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);

    const claudePosts = [];
    await page.route('**/api/claude', async (route) => {
      if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
      const body = JSON.parse(route.request().postData() || '{}');
      claudePosts.push(body.prompt || '');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: '{"ok":true}' }] }) });
    });

    await loginNewStudent(page, 'AlunoCores');
    await page.waitForTimeout(500);

    check('O botão de chat do Nyx NÃO existe mais na tela do aluno', (await page.locator('button[title="Conversar com o Nyx"]').count()) === 0);

    await page.click('button[title="Escolher a cor do fundo"]');
    await page.waitForTimeout(400);
    check('O seletor de cor abre', (await page.locator('text=🎨 Cor do fundo').count()) > 0);

    // pega a contagem AQUI (não zero) — a "curiosidade do dia" automática, sem relação com cor,
    // pode ter chamado o Nyx sozinha no carregamento da página; o que importa é que ESCOLHER a cor
    // não soma NENHUMA chamada nova a essa contagem
    const callsBeforeColor = claudePosts.length;
    await page.click('button[title="Verde"]');
    await page.waitForTimeout(1500);
    check('O seletor fecha sozinho depois de escolher', (await page.locator('text=🎨 Cor do fundo').count()) === 0);

    const saved = JSON.parse(kvStore.get('student:matutino:AlunoCores') || '{}');
    check('A cor escolhida foi salva no perfil do aluno', saved.theme === '#34d399', JSON.stringify(saved.theme));
    check('Trocar a cor NÃO chamou o Nyx nenhuma vez', claudePosts.length === callsBeforeColor, JSON.stringify(claudePosts));
    check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

    await ctx.close();
    await browser.close();
  }

  // ── lado do professor: chat continua funcionando normalmente ──
  {
    const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
    const browser = await launchBrowser();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await loginTeacher(page);
    await page.waitForTimeout(800);

    const chatBtn = page.locator('button[title="Conversar com o Nyx"]');
    check('O botão de chat do Nyx CONTINUA existindo pro professor', (await chatBtn.count()) > 0);
    await chatBtn.click();
    await page.waitForTimeout(400);
    await page.fill('input[placeholder="Escreva para o Nyx..."]', 'oi nyx');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    check('O chat do professor ainda responde normalmente', (await page.locator('text=Aprendeu C# de verdade').count()) > 0);
    check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

    await ctx.close();
    await browser.close();
  }

  process.exit(summary('CHAT DO ALUNO REMOVIDO; SELETOR DE COR SEM IA; CHAT DO PROFESSOR INTACTO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
