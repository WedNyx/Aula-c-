// Card de backup automático (aba Calendário): ver histórico + forçar backup na hora.
const { check, summary, launchBrowser, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));

  let backupCalls = 0;
  await page.route('**/api/kv', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const { action, key, value, prefix } = body;
    let out;
    if (action === 'check') out = { configured: true };
    else if (action === 'set') { kvStore.set(key, value); out = { ok: true }; }
    else if (action === 'get') { out = { value: kvStore.has(key) ? kvStore.get(key) : null }; }
    else if (action === 'delete') { kvStore.delete(key); out = { ok: true }; }
    else if (action === 'list_with_values') { out = { items: [...kvStore.entries()].filter(([k]) => k.startsWith(prefix || '')).map(([key, value]) => ({ key, value })) }; }
    else out = { ok: true };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) });
  });
  await page.route('**/api/auth', async (route) => { const b = JSON.parse(route.request().postData() || '{}'); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: b.password === 'M1n3cr@ft2006' }) }); });
  await page.route('**/api/claude', async (route) => { if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; } await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: '{"ok":true}' }] }) }); });
  await page.route('**/api/backup**', async (route) => {
    backupCalls++;
    const url = new URL(route.request().url());
    if (url.searchParams.get('list') === '1') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ backups: [{ key: 'backup:2026-07-25T03:00:00.000Z', size: 45000 }] }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, key: 'backup:now', keys: 12, deleted: 0 }) });
  });
  await page.route('**fonts.googleapis.com/**', route => route.abort());
  await page.route('**fonts.gstatic.com/**', route => route.abort());
  page.setDefaultTimeout(15000);

  await loginTeacher(page);
  await page.click('text=🗓️ Calendário');
  await page.waitForTimeout(500);

  const backupCard = page.locator('[data-tour-prof="backup"]');
  check('Card de backup automático aparece na aba Calendário', (await backupCard.count()) > 0);

  await backupCard.locator('button:has-text("Ver backups")').click();
  await page.waitForTimeout(300);
  check('Lista de backups aparece depois de clicar', (await backupCard.locator('text=/2026|KB/').count()) > 0);

  await backupCard.locator('button:has-text("Fazer backup agora")').click();
  await page.waitForTimeout(500);
  check('Mensagem de sucesso aparece depois de forçar backup', (await backupCard.locator('text=/Backup feito agora/').count()) > 0);
  check('Chamou o endpoint /api/backup pelo menos 2x (listar + forçar)', backupCalls >= 2, `chamadas=${backupCalls}`);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('BACKUP UI') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
