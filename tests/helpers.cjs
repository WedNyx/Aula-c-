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
  // tutorial de teclado: frase de prática digitada depois de acertar uma tecla (Fase 6) —
  // devolve algo previsível e fácil de testar, incluindo aspas de propósito (pra cobrir o caso
  // de "o que tá dentro das aspas não precisa bater")
  if (p.includes('"frase"')) {
    return JSON.stringify({ frase: 'Console.WriteLine("teste");' });
  }
  if (p.includes('"questions"')) {
    return JSON.stringify({ questions: Array.from({ length: 4 }, (_, i) => ({ q: `Pergunta de teste ${i + 1}?`, opts: ['A', 'B', 'C', 'D'], correct: 0 })) });
  }
  // continuação de resumo (buildContinuationSummaryRequest) — schema sem "intro", só "secoes"+"dica";
  // devolve um título RECONHECÍVEL e diferente do resumo "do zero" abaixo, pra dar pra distinguir
  // nos testes se o caminho de continuação (mesmo dia OU ponte de dias) foi o que realmente rodou
  if (p.includes('CONTINUAÇÃO do resumo')) {
    return JSON.stringify({ secoes: [{ emoji: '🌉', titulo: 'Conceito Novo Depois da Falta', explicacao: 'Isso é novo.', exemplo: 'int y = 2;' }], dica: 'Continue de onde parou!' });
  }
  if (p.includes('"secoes"')) {
    return JSON.stringify({ intro: 'Você aprendeu bastante hoje!', secoes: [{ emoji: '💡', titulo: 'Variáveis', explicacao: 'Guardam valores.', exemplo: 'int x = 1;' }], dica: 'Continue praticando!', encorajamento: 'Mandou bem!' });
  }
  // mesclagem do código enviado pelo professor com o que o aluno já tinha escrito (doSendClassCode
  // + tick() em App.jsx): extrai o trecho "o aluno já tinha escrito" do prompt e devolve ele
  // MANTIDO (mesmo formato de um merge de verdade), só acrescentando um marcador reconhecível —
  // simula a IA "completando o que falta sem apagar nada"
  if (p.includes('"files"')) {
    const m = p.match(/Este aluno JÁ tinha escrito isto no perfil dele[^:]*:\n([\s\S]*?)\n\nCrie a versão final/);
    const alunoBlock = m ? m[1] : '';
    const fm = alunoBlock.match(/\/\/ ===== (.+?) =====\n([\s\S]*)/);
    const fname = fm ? fm[1] : 'Program.cs';
    const fcode = (fm ? fm[2] : alunoBlock).trimEnd();
    return JSON.stringify({ files: [{ name: fname, code: `${fcode}\n// [MOCK] completado pelo Nyx com o que faltava` }] });
  }
  return JSON.stringify({ ok: true, frases: ['Aprendeu C# de verdade.'] });
}

// mesma derivação de chave usada em src/storage.js / api/kv.js pra "duel:"/"teamduel:"
function safeNameMock(name) { return String(name || '').trim().replace(/\s+/g, '_').replace(/["'\/\\:]/g, ''); }
function duelKeyForMock(shift, nameA, nameB) {
  const [x, y] = [safeNameMock(nameA), safeNameMock(nameB)].sort();
  return `duel:${shift || 'sem-turno'}:${x}__${y}`;
}
function teamDuelKeyForMock(shift, names) {
  const sorted = (names || []).map(safeNameMock).sort();
  return `teamduel:${shift || 'sem-turno'}:${sorted.join('__')}`;
}
// mesma redação do servidor de verdade (redactDuelQuestions em api/kv.js): esconde "correct" das
// perguntas de um duelo/duelo em dupla — o mock replica isso pra testar o fluxo completo
function redactDuelCorrectMock(v) {
  try {
    const obj = JSON.parse(v);
    if (!Array.isArray(obj.questions)) return v;
    obj.questions = obj.questions.map(q => { const { correct, ...rest } = q || {}; return rest; });
    return JSON.stringify(obj);
  } catch { return v; }
}

// cria um kvStore (Map) em memória compartilhável entre chamadas do mesmo teste, e liga as rotas
// mockadas numa página do Playwright já criada
async function mockRoutes(page, kvStore) {
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));

  await page.route('**/api/kv', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const { action, key, value, prefix, auth, shift, answers, exits, message, url: errUrl, role, tourneyId, round, picks, turmaId, from, to, myName, names } = body;
    let out;
    if (action === 'check') out = { configured: true };
    else if (action === 'log_error') {
      const list = kvStore.has('errorlog:recent') ? JSON.parse(kvStore.get('errorlog:recent')) : [];
      list.push({ message: String(message || ''), url: String(errUrl || ''), role: String(role || 'anon'), at: Date.now() });
      kvStore.set('errorlog:recent', JSON.stringify(list));
      out = { ok: true };
    }
    else if (action === 'get_recent_errors') {
      out = auth === TEACHER_PASSWORD
        ? { errors: (kvStore.has('errorlog:recent') ? JSON.parse(kvStore.get('errorlog:recent')) : []).slice().reverse() }
        : { errors: [] };
    }
    else if (action === 'set') { kvStore.set(key, value); out = { ok: true }; }
    else if (action === 'get') {
      let v = kvStore.has(key) ? kvStore.get(key) : null;
      // mesma redação do servidor de verdade: gabarito da prova some sem a senha do professor
      // (ver redactExamConfig em api/kv.js) — o mock replica isso pra testar o fluxo completo
      if (v != null && String(key).startsWith('exam:config:') && auth !== TEACHER_PASSWORD) {
        try {
          const obj = JSON.parse(v);
          if (Array.isArray(obj.questions)) obj.questions = obj.questions.map(q => { const { correct, ...rest } = q || {}; return rest; });
          v = JSON.stringify(obj);
        } catch {}
      }
      // mesma redação do servidor de verdade pra duelo/duelo em dupla (ver redactDuelQuestions)
      if (v != null && (String(key).startsWith('duel:') || String(key).startsWith('teamduel:')) && auth !== TEACHER_PASSWORD) {
        v = redactDuelCorrectMock(v);
      }
      out = { value: v };
    }
    else if (action === 'grade_exam') {
      const raw = kvStore.get(`exam:config:${shift || 'all'}`);
      if (!raw) out = { error: 'exam_not_found' };
      else {
        const config = JSON.parse(raw);
        const questions = Array.isArray(config.questions) ? config.questions : [];
        let pts = 0;
        questions.forEach((q, i) => { if (answers && answers[i] === q.correct) pts++; });
        const rawScore = pts * 10;
        const penalty = Math.min(rawScore, Math.max(0, Number(exits) || 0) * 10);
        out = { finalScore: rawScore - penalty, raw: rawScore, total: questions.length };
      }
    }
    else if (action === 'grade_tourney_round') {
      // mesma lógica do servidor de verdade (api/kv.js): lê a rodada por TURMA, nunca devolve "correta"
      const raw = kvStore.get(`tourney:config:${turmaId || 'sem-turno'}`);
      if (!raw) out = { error: 'tourney_not_found' };
      else {
        const config = JSON.parse(raw);
        if (config.id !== tourneyId || config.round !== round) out = { error: 'stale_round' };
        else {
          const questions = Array.isArray((config.questions || {})[round]) ? config.questions[round] : [];
          let score = 0;
          questions.forEach((q, i) => { if (picks && picks[i] === q.correta) score++; });
          out = { score, total: questions.length };
        }
      }
    }
    else if (action === 'grade_duel') {
      // mesma lógica do servidor de verdade (api/kv.js): acha o duelo pela dupla de nomes, nunca
      // devolve "correct" — só a pontuação. O merge (resposta + nota + status) é gravado AQUI, com
      // a config PRISTINE (não a redigida), igual o servidor de verdade faz.
      const dKey = duelKeyForMock(shift, from, to);
      const raw = kvStore.get(dKey);
      if (!raw) out = { error: 'duel_not_found' };
      else {
        const config = JSON.parse(raw);
        if (myName !== config.from && myName !== config.to) out = { error: 'not_a_player' };
        else {
          const scoreField = myName === config.from ? 'scoreFrom' : 'scoreTo';
          const answersField = myName === config.from ? 'answersFrom' : 'answersTo';
          const questions = Array.isArray(config.questions) ? config.questions : [];
          if (config[scoreField] != null) out = { score: config[scoreField], total: questions.length, already: true };
          else {
            let score = 0;
            questions.forEach((q, i) => { if (answers && answers[i] === q.correct) score++; });
            const merged = { ...config, [answersField]: answers || {}, [scoreField]: score };
            if (merged.scoreFrom != null && merged.scoreTo != null) merged.status = 'done';
            kvStore.set(dKey, JSON.stringify(merged));
            out = { score, total: questions.length };
          }
        }
      }
    }
    else if (action === 'grade_team_duel') {
      const tKey = teamDuelKeyForMock(shift, names);
      const raw = kvStore.get(tKey);
      if (!raw) out = { error: 'duel_not_found' };
      else {
        const config = JSON.parse(raw);
        if (!(config.players || []).some(p => p.name === myName)) out = { error: 'not_a_player' };
        else {
          const questions = Array.isArray(config.questions) ? config.questions : [];
          if (config.scores && config.scores[myName] != null) out = { score: config.scores[myName], total: questions.length, already: true };
          else {
            let score = 0;
            questions.forEach((q, i) => { if (answers && answers[i] === q.correct) score++; });
            const scores = { ...(config.scores || {}), [myName]: score };
            const answersMap = { ...(config.answers || {}), [myName]: answers || {} };
            const allDone = (config.players || []).every(p => scores[p.name] != null);
            const merged = { ...config, scores, answers: answersMap, status: allDone ? 'done' : config.status };
            kvStore.set(tKey, JSON.stringify(merged));
            out = { score, total: questions.length };
          }
        }
      }
    }
    else if (action === 'delete') { kvStore.delete(key); out = { ok: true }; }
    else if (action === 'delete_by_prefix') { let n = 0; for (const k of [...kvStore.keys()]) if (k.startsWith(prefix || '')) { kvStore.delete(k); n++; } out = { ok: true, deleted: n }; }
    else if (action === 'list_with_values') {
      out = { items: [...kvStore.entries()].filter(([k]) => k.startsWith(prefix || '')).map(([key, value]) => ({
        key,
        value: (String(key).startsWith('duel:') || String(key).startsWith('teamduel:')) && auth !== TEACHER_PASSWORD ? redactDuelCorrectMock(value) : value,
      })) };
    }
    else out = { ok: true };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) });
  });
  await page.route('**/api/auth', async (route) => {
    const b = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: b.password === TEACHER_PASSWORD }) });
  });
  await page.route('**/api/shift-auth', async (route) => {
    const b = JSON.parse(route.request().postData() || '{}');
    const expected = { teste: 'T3steSystem', linguagens: 'MultiLang2026' }[b.shiftId];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: !!expected && b.password === expected }) });
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
  await page.click('button:has-text("Avançar")'); // passo 1 (nome/nascimento/CPF) → passo 2 (personalizar o boneco)
  await page.waitForTimeout(400);
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
