// Quando o professor clica em "⌨️ Abrir teclado pra todos", o tutorial de teclado abre sozinho na
// tela dos alunos daquela turma — mas só naquele dia. Antes, o valor gravado no servidor nunca
// expirava, então o tutorial voltava a abrir sozinho todo santo dia (até semanas depois), mesmo sem
// o professor pedir de novo. Esse teste confirma que um "abrir" de UM DIA ATRÁS não reabre mais
// hoje, e que um "abrir" de HOJE continua abrindo normalmente.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

function kbLaunchKey(shift, name) { return `kblaunch:${shift}:${name.trim().replace(/\s+/g, '_').replace(/["'\/\\:]/g, '')}`; }

async function loginSeededStudent(page, name) {
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector(`text=${name}`, { timeout: 10000 });
  await page.click(`text=${name}`);
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }
}

(async () => {
  const browser = await launchBrowser();

  // ══════════════ 1) Lançado ONTEM: NÃO deve reabrir sozinho hoje ══════════════
  {
    const kvStore = baseKvStore();
    kvStore.set('student:matutino:AlunoOntem', JSON.stringify({
      name: 'AlunoOntem', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
      phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 0,
    }));
    const ontem = Date.now() - 26 * 60 * 60 * 1000; // mais de 1 dia atrás, cruza a virada de data com folga
    kvStore.set(kbLaunchKey('matutino', 'AlunoOntem'), String(ontem));

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await loginSeededStudent(page, 'AlunoOntem');
    await page.waitForTimeout(1500); // dá tempo do poll que checa o "kblaunch" rodar

    check('Tutorial de teclado NÃO abre sozinho (o "abrir pra todos" foi de ontem)', (await page.locator('h2:has-text("Tutorial de Teclado")').count()) === 0);
    check('Sem erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ══════════════ 2) Lançado HOJE: continua abrindo sozinho normalmente ══════════════
  {
    const kvStore = baseKvStore();
    kvStore.set('student:matutino:AlunoHoje', JSON.stringify({
      name: 'AlunoHoje', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
      phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 0,
    }));
    kvStore.set(kbLaunchKey('matutino', 'AlunoHoje'), String(Date.now()));

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    // não usa loginSeededStudent aqui: o tutorial abre automaticamente por cima de tudo (inclusive
    // do check-in), então tentar clicar em "Pular hoje" ficaria bloqueado pelo próprio modal
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('text=☀️ Matutino');
    await page.waitForTimeout(500);
    await page.waitForSelector('text=AlunoHoje', { timeout: 10000 });
    await page.click('text=AlunoHoje');
    await page.waitForTimeout(1500);

    check('Tutorial de teclado ABRE sozinho quando o "abrir pra todos" foi hoje', (await page.locator('h2:has-text("Tutorial de Teclado")').count()) > 0);
    check('Sem erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(summary('TUTORIAL DE TECLADO SÓ ABRE SOZINHO NO DIA QUE O PROFESSOR LANÇOU') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
