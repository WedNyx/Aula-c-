// Quando o servidor de IA (/api/claude) trava ou dá timeout, a Vercel devolve a página de erro DA
// PLATAFORMA (texto não-JSON, tipo "An error occurred with your deployment...") em vez do JSON que
// api/claude.js normalmente escreveria. Antes disso quebrava feio: `resp.json()` estourava
// "Unexpected token 'A'... is not valid JSON" e esse erro técnico ia parar direto na tela do
// professor. Agora: (1) askClaude trata resposta não-JSON como falha comum, com mensagem amigável;
// (2) "Gerar nome do conteúdo" tenta de novo automaticamente 1x antes de desistir.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher, mockClaudeBody } = require('./helpers.cjs');

(async () => {
  const browser = await launchBrowser();

  // ── cenário 1: primeira chamada falha (resposta não-JSON, como o timeout da Vercel), segunda
  // chamada funciona normalmente — a retentativa automática deve resolver sozinha, sem o aluno/
  // professor nunca ver o erro técnico ──
  {
    const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
    kvStore.set('student:matutino:AlunoCodigo', JSON.stringify({
      name: 'AlunoCodigo', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x = 1;' }],
      code: 'int x = 1;\nConsole.WriteLine(x);', phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 80,
    }));

    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);

    let calls = 0;
    await page.unroute('**/api/claude');
    await page.route('**/api/claude', async (route) => {
      if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
      calls++;
      if (calls === 1) {
        // simula a página de erro da própria Vercel (timeout/crash da função) — texto, não JSON
        await route.fulfill({ status: 500, contentType: 'text/plain', body: 'An error occurred with your deployment\n\nFUNCTION_INVOCATION_TIMEOUT' });
        return;
      }
      const body = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: mockClaudeBody(body.prompt) }] }) });
    });

    await loginTeacher(page);
    await page.waitForTimeout(500);
    await page.click('text=👨‍💻 Meu código');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Gerar nome do conteúdo (Matutino)")');
    await page.waitForTimeout(1500);

    const msg = await page.locator('p', { hasText: /^✅ Conteúdo de hoje|^Não consegui/ }).first().innerText();
    check('Depois da retentativa automática, o nome do conteúdo aparece normalmente (sucesso)', msg.startsWith('✅ Conteúdo de hoje'), msg);
    check('O erro técnico cru NUNCA aparece na tela (retentativa escondeu a falha)', !msg.includes('Unexpected token') && !msg.includes('is not valid JSON'));
    check('O /api/claude foi chamado 2x (1 falha + 1 retentativa que deu certo)', calls === 2, String(calls));
    check('SEM erro de JS não-tratado (a falha da 1ª chamada foi pega internamente)', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

    await ctx.close();
  }

  // ── cenário 2: TODAS as chamadas falham (não-JSON) — mesmo depois da retentativa, a mensagem
  // final pro professor precisa continuar amigável, nunca o erro técnico cru ──
  {
    const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
    kvStore.set('student:matutino:AlunoCodigo2', JSON.stringify({
      name: 'AlunoCodigo2', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int y = 2;' }],
      code: 'int y = 2;\nConsole.WriteLine(y);', phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 80,
    }));

    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);

    await page.unroute('**/api/claude');
    await page.route('**/api/claude', async (route) => {
      if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
      await route.fulfill({ status: 500, contentType: 'text/plain', body: 'An error occurred with your deployment\n\nFUNCTION_INVOCATION_TIMEOUT' });
    });

    await loginTeacher(page);
    await page.waitForTimeout(500);
    await page.click('text=👨‍💻 Meu código');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Gerar nome do conteúdo (Matutino)")');
    await page.waitForTimeout(1500);

    const msg2 = await page.locator('p', { hasText: /^✅ Conteúdo de hoje|^Não consegui/ }).first().innerText();
    check('Mesmo falhando sempre, a mensagem final é amigável (não o erro técnico cru)', msg2.includes('Não consegui falar com o Nyx agora'), msg2);
    check('O erro técnico cru NUNCA aparece na tela, nem depois de esgotar a retentativa', !msg2.includes('Unexpected token') && !msg2.includes('is not valid JSON'));
    check('SEM erro de JS não-tratado', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

    await ctx.close();
  }

  await browser.close();
  process.exit(summary('RESILIÊNCIA DE "GERAR NOME DO CONTEÚDO" A TIMEOUT/ERRO NÃO-JSON DA IA') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
