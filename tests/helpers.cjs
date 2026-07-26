// Utilitários compartilhados pelos testes end-to-end (Playwright contra `vite preview`).
// Cada teste cria sua própria página com setupPage(), que já vem com o /api/kv, /api/auth e
// /api/claude mockados (o app inteiro roda 100% no navegador, sem precisar de banco de verdade).

const fs = require('fs');
const { chromium } = require('playwright');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4173';
const TEACHER_PASSWORD = 'M1n3cr@ft2006';

// alguns ambientes de execução já vêm com um Chromium pré-instalado num caminho fixo (não é o
// build que o Playwright baixaria sozinho) — se existir, usa ele; senão deixa o Playwright achar
// o navegador do jeito normal dele (ex: depois de `npx playwright install`, como no CI)
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium';
function launchBrowser(opts = {}) {
  return chromium.launch(fs.existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM, ...opts } : opts);
}

let pass = 0, fail = 0;
const results = [];
function check(name, cond, extra) {
  if (cond) { pass++; results.push({ name, ok: true }); console.log(`✅ ${name}`); }
  else { fail++; results.push({ name, ok: false, extra }); console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
}
function summary(label) {
  console.log(`\n=== ${label}: ${pass}/${pass + fail} passed ===`);
  return fail === 0;
}
function resetCounters() { pass = 0; fail = 0; results.length = 0; }

// mock genérico do /api/claude: fareja o prompt e devolve o formato de JSON que cada chamada
// espera (perguntas de atividade vs. resumo de aula vs. genérico) — o mesmo em todos os testes
function mockClaudeBody(prompt) {
  const p = String(prompt || '');
  if (p.includes('"questions"')) {
    return JSON.stringify({ questions: Array.from({ length: 4 }, (_, i) => ({ q: `Pergunta de teste ${i + 1}?`, opts: ['A', 'B', 'C', 'D'], correct: 0 })) });
  }
  if (p.includes('"secoes"')) {
    return JSON.stringify({ intro: 'Você aprendeu bastante hoje!', secoes: [{ emoji: '💡', titulo: 'Variáveis', explicacao: 'Guardam valores.', exemplo: 'int x = 1;' }], dica: 'Continue praticando!', encorajamento: 'Mandou bem!' });
  }
  return JSON.stringify({ ok: true, frases: ['Aprendeu C# de verdade.'] });
}

// cria um kvStore (Map) em memória compartilhável entre chamadas do mesmo teste, e liga as rotas
// mockadas numa página do Playwright já criada
async function mockRoutes(page, kvStore) {
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));

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
  await page.route('**/api/auth', async (route) => {
    const b = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: b.password === TEACHER_PASSWORD }) });
  });
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    const body = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: mockClaudeBody(body.prompt) }] }) });
  });
  await page.route('**/api/backup**', async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('list') === '1') { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ backups: [] }) }); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, key: 'backup:now', keys: 0, deleted: 0 }) });
  });
  await page.route('**fonts.googleapis.com/**', route => route.abort());
  await page.route('**fonts.gstatic.com/**', route => route.abort());
  page.setDefaultTimeout(20000);
  return jsErrors;
}

// atalho: cria o teachermeta padrão (allowWeekend:true pra nunca cair na trava de horário durante
// o teste, não importa que dia da semana for quando o CI rodar)
function baseKvStore(extra = {}) {
  const kv = new Map();
  kv.set('teachermeta:main', JSON.stringify({ city: 'Sobradinho', classDays: [], contentNames: {}, allowWeekend: true, schedule: { matutino: { start: '', end: '' }, vespertino: { start: '', end: '' } }, ...extra }));
  return kv;
}

// login rápido do professor, já na tela do painel
async function loginTeacher(page) {
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Professor');
  await page.waitForTimeout(400);
  await page.fill('input[placeholder="Senha do professor"]', TEACHER_PASSWORD);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
}

// cria um perfil de aluno novo e passa por todas as telas de primeiro acesso (preferências do
// Nyx, apresentação, tour guiado sem botão de pular, check-in de humor) até a sala abrir de vez
async function loginNewStudent(page, name) {
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.fill('input[placeholder="Seu nome completo"]', name);
  await page.click('button:has-text("Criar perfil e entrar")');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 25; i++) {
    const doneBtn = page.locator('button:has-text("Entendi! 🚀")');
    const nextBtn = page.locator('button:has-text("Próximo →")');
    const introBtn = page.locator('button:has-text("Conhecer minha sala!")');
    const prefsBtn = page.locator('button:has-text("Continuar →")');
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await doneBtn.count()) { await doneBtn.click(); await page.waitForTimeout(300); }
    else if (await nextBtn.count()) { await nextBtn.click(); await page.waitForTimeout(120); }
    else if (await introBtn.count()) { await introBtn.click(); await page.waitForTimeout(300); }
    else if (await prefsBtn.count()) { await prefsBtn.click(); await page.waitForTimeout(300); }
    else if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }
  await page.waitForTimeout(400);
}

module.exports = { BASE_URL, TEACHER_PASSWORD, launchBrowser, check, summary, resetCounters, mockRoutes, baseKvStore, loginTeacher, loginNewStudent, mockClaudeBody };
