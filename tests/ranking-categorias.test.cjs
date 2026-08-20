const { launchBrowser, mockRoutes, baseKvStore, check, summary } = require("/home/user/Aula-c-/tests/helpers.cjs");

function dstr(d) { return d.toISOString().slice(0, 10); }
// pega uma quarta-feira desta semana e uma da semana passada, pra cair certinho nos buckets do weekKey()
function thisWeekDay() {
  const d = new Date();
  const day = d.getDay();
  const diff = 3 - day; // quarta
  d.setDate(d.getDate() + diff);
  return d;
}
const nowWed = thisWeekDay();
const lastWed = new Date(nowWed); lastWed.setDate(lastWed.getDate() - 7);
// turno FIXO (não depende do horário real em que o teste roda — login de aluno já existente,
// selecionando o turno explicitamente pelo botão, em vez de deixar o app escolher pelo relógio)
const SHIFT = 'matutino';

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: [dstr(nowWed), dstr(lastWed)], allowWeekend: true });

  // Evoluiu: semana passada 40, essa semana 90 (delta +50)
  kvStore.set(`student:${SHIFT}:Evoluiu_Silva`, JSON.stringify({
    name: 'Evoluiu Silva', shift: SHIFT, avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), achievements: [], nyxPoints: 10,
    scoreHistory: { [dstr(lastWed)]: 40, [dstr(nowWed)]: 90 },
  }));

  // Sequência: presente hoje E na quarta passada (2 dias seguidos de aula no calendário -> streak>=2)
  kvStore.set(`student:${SHIFT}:Sequencia_Costa`, JSON.stringify({
    name: 'Sequencia Costa', shift: SHIFT, avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), achievements: [], nyxPoints: 10,
    attendance: { [dstr(nowWed)]: 'present', [dstr(lastWed)]: 'present' },
    errorHistory: { [dstr(nowWed)]: 5 },
  }));

  // Ajudante: 3 ajudas essa semana
  kvStore.set(`student:${SHIFT}:Ajudante_Souza`, JSON.stringify({
    name: 'Ajudante Souza', shift: SHIFT, avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), achievements: [], nyxPoints: 10,
  }));

  // Organizado: presente essa semana, zero erros
  kvStore.set(`student:${SHIFT}:Organizado_Lima`, JSON.stringify({
    name: 'Organizado Lima', shift: SHIFT, avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), achievements: [], nyxPoints: 10,
    attendance: { [dstr(nowWed)]: 'present' }, errorHistory: {},
  }));

  // computa a weekKey certa via o próprio app (evita duplicar a lógica) — mas como isso é CJS e
  // schedule.ts é ESM/TS, calculamos a chave ISO-semana manualmente aqui, igual ao weekKey() real
  function isoWeekKey(d) {
    const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
    return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }
  const nowKey = isoWeekKey(nowWed);
  const ajudanteRaw = JSON.parse(kvStore.get(`student:${SHIFT}:Ajudante_Souza`));
  ajudanteRaw.partnerRewards = { [nowKey]: { helper: 3, helped: 0 } };
  kvStore.set(`student:${SHIFT}:Ajudante_Souza`, JSON.stringify(ajudanteRaw));

  const criativoRaw = { name: 'Criativo Alves', shift: SHIFT, avatar: {}, files: [{ name: 'Program.cs', code: '' }], phase: 'coding', lastSeen: Date.now(), achievements: [], nyxPoints: 10, weeklyChallenge: { weekKey: nowKey, status: 'done' } };
  kvStore.set(`student:${SHIFT}:Criativo_Alves`, JSON.stringify(criativoRaw));

  // observador: já existe (não passa pelo onboarding de aluno novo) — 1 erro hoje, pra não empatar
  // com "Organizado Lima" (0 erros) e deixar o teste de "código mais organizado" sem ambiguidade
  kvStore.set(`student:${SHIFT}:Espectador_Teste`, JSON.stringify({
    name: 'Espectador Teste', shift: SHIFT, avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), achievements: [], nyxPoints: 10,
    errorHistory: { [dstr(nowWed)]: 3 },
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await ctx.newPage();
  await mockRoutes(page, kvStore);

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=Espectador Teste', { timeout: 10000 });
  await page.click('text=Espectador Teste');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
    else break;
  }

  await page.click('text=📊 Ranking da turma');
  await page.waitForTimeout(1500);
  const bodyText = await page.locator('body').innerText();

  check('Título do bloco de reconhecimentos aparece', bodyText.includes('Reconhecimentos da semana'));
  check('Maior evolução da semana: Evoluiu', bodyText.includes('Evoluiu'));
  check('Melhor sequência: Sequencia', bodyText.includes('Sequencia'));
  check('Grande ajudante: Ajudante', bodyText.includes('Ajudante') && bodyText.includes('ajudou 3x'));
  check('Código mais organizado: Organizado', bodyText.includes('Organizado') && bodyText.includes('zero erros'));
  check('Desafio criativo: Criativo', bodyText.includes('Criativo'));
  check('"Explorador da semana" NÃO existe (categoria proposital fora)', !bodyText.includes('Explorador'));

  await ctx.close();
  await browser.close();
  process.exit(summary('RECONHECIMENTOS DA SEMANA NO RANKING') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
