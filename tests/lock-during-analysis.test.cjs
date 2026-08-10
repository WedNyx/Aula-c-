// O professor controla, no painel ("Meu código"), se o editor do aluno fica travado (read-only)
// enquanto o Nyx analisa o código ou se o aluno pode continuar digitando durante a análise.
// Por padrão (sem o professor mexer em nada) o editor trava — esse teste confirma o padrão E
// a troca via checkbox no painel, refletindo no editor do aluno.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

const csharpCode = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); } }';

// resposta do "Analisar código" propositalmente atrasada, só pra dar tempo do teste espiar o
// estado do editor (readOnly) enquanto a análise ainda está em andamento
async function mockClaudeWithDelay(page, kvStore) {
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    const body = JSON.parse(route.request().postData() || '{}');
    if (String(body.prompt || '').includes('"errors"')) {
      await new Promise(r => setTimeout(r, 1500));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify({ analise: 'ok', ok: true, message: 'Mandou bem!', missingChars: [], errors: [] }) }] }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify({ ok: true, frases: ['Aprendeu C# de verdade.'] }) }] }) });
  });
}

(async () => {
  const browser = await launchBrowser();

  // ══════════════ 1) PADRÃO (sem o professor mexer em nada): editor trava durante a análise ══════════════
  {
    const kvStore = baseKvStore();
    kvStore.set('student:matutino:AlunoPadrao', JSON.stringify({
      name: 'AlunoPadrao', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: csharpCode }],
      phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 0,
    }));
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await mockClaudeWithDelay(page, kvStore);
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('text=☀️ Matutino');
    await page.waitForTimeout(500);
    await page.waitForSelector('text=AlunoPadrao', { timeout: 10000 });
    await page.click('text=AlunoPadrao');
    await page.waitForTimeout(1200);
    for (let i = 0; i < 5; i++) {
      const skipCheckin = page.locator('button:has-text("Pular hoje")');
      if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
      else break;
    }

    const editorArea = page.locator('[data-tour="editor"] textarea').first();
    check('Editor do aluno padrão apareceu', (await editorArea.count()) > 0);
    check('Editor NÃO está travado antes de pedir análise', (await editorArea.getAttribute('readonly')) === null);

    await page.click('button:has-text("✨ Analisar código")');
    await page.waitForTimeout(400); // análise ainda em andamento (mock demora 1500ms)
    check('Editor FICA travado (readOnly) enquanto o Nyx analisa, por padrão', (await editorArea.getAttribute('readonly')) !== null);
    await page.waitForSelector('button:has-text("✨ Analisar código"):not(:has-text("Analisando"))', { timeout: 5000 });
    check('Editor destrava de novo depois que a análise termina', (await editorArea.getAttribute('readonly')) === null);
    check('Sem erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ══════════════ 2) PROFESSOR LIBERA: editor continua editável durante a análise ══════════════
  {
    const kvStore = baseKvStore({ lockDuringAnalysis: false });
    kvStore.set('student:matutino:AlunoLivre', JSON.stringify({
      name: 'AlunoLivre', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: csharpCode }],
      phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 0,
    }));
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await mockClaudeWithDelay(page, kvStore);
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('text=☀️ Matutino');
    await page.waitForTimeout(500);
    await page.waitForSelector('text=AlunoLivre', { timeout: 10000 });
    await page.click('text=AlunoLivre');
    await page.waitForTimeout(1200);
    for (let i = 0; i < 5; i++) {
      const skipCheckin = page.locator('button:has-text("Pular hoje")');
      if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
      else break;
    }

    const editorArea = page.locator('[data-tour="editor"] textarea').first();
    await page.click('button:has-text("✨ Analisar código")');
    await page.waitForTimeout(400); // análise ainda em andamento
    check('Editor NÃO trava durante a análise quando o professor liberou', (await editorArea.getAttribute('readonly')) === null);
    await page.waitForSelector('button:has-text("✨ Analisar código"):not(:has-text("Analisando"))', { timeout: 5000 });
    check('Sem erro de JS (aluno livre pra digitar)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ══════════════ 3) PAINEL DO PROFESSOR: o checkbox liga/desliga e grava no servidor ══════════════
  {
    const kvStore = baseKvStore();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await loginTeacher(page);
    await page.click('text=👨‍💻 Meu código');
    await page.waitForTimeout(500);

    const card = page.locator('[data-tour-prof="analise-nyx"]');
    check('Card "Análise de código do Nyx" existe em "Meu código"', (await card.count()) > 0);
    const checkbox = card.locator('input[type="checkbox"]');
    check('Por padrão o checkbox começa DESMARCADO (editor trava, é o padrão)', (await checkbox.isChecked()) === false);

    await checkbox.click();
    await page.waitForTimeout(500);
    check('Checkbox fica marcado depois do clique', (await checkbox.isChecked()) === true);
    const metaAfter = JSON.parse(kvStore.get('teachermeta:main'));
    check('teachermeta:main gravou lockDuringAnalysis:false no servidor', metaAfter.lockDuringAnalysis === false, JSON.stringify(metaAfter.lockDuringAnalysis));

    await checkbox.click();
    await page.waitForTimeout(500);
    check('Clicar de novo desmarca o checkbox', (await checkbox.isChecked()) === false);
    const metaAfter2 = JSON.parse(kvStore.get('teachermeta:main'));
    check('teachermeta:main volta pro padrão (trava) depois do segundo clique', metaAfter2.lockDuringAnalysis !== false, JSON.stringify(metaAfter2.lockDuringAnalysis));

    check('Sem erro de JS (professor)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(summary('PROFESSOR CONTROLA SE O EDITOR TRAVA DURANTE A ANÁLISE DO NYX') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
