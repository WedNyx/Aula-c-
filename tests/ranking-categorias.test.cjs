const { launchBrowser, mockRoutes, baseKvStore, loginNewStudent, check, summary } = require("/home/user/Aula-c-/tests/helpers.cjs");

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

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: [dstr(nowWed), dstr(lastWed)], allowWeekend: true });

  // Evoluiu: semana passada 40, essa semana 90 (delta +50)
  kvStore.set('student:vespertino:Evoluiu_Silva', JSON.stringify({
    name: 'Evoluiu Silva', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), achievements: [], nyxPoints: 10,
    scoreHistory: { [dstr(lastWed)]: 40, [dstr(nowWed)]: 90 },
  }));

  // Sequência: presente hoje E na quarta passada (2 dias seguidos de aula no calendário -> streak>=2)
  kvStore.set('student:vespertino:Sequencia_Costa', JSON.stringify({
    name: 'Sequencia Costa', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), achievements: [], nyxPoints: 10,
    attendance: { [dstr(nowWed)]: 'present', [dstr(lastWed)]: 'present' },
    errorHistory: { [dstr(nowWed)]: 5 },
  }));

  // Ajudante: 3 ajudas essa semana
  kvStore.set('student:vespertino:Ajudante_Souza', JSON.stringify({
    name: 'Ajudante Souza', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), achievements: [], nyxPoints: 10,
  }));

  // Organizado: presente essa semana, zero erros
  kvStore.set('student:vespertino:Organizado_Lima', JSON.stringify({
    name: 'Organizado Lima', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), achievements: [], nyxPoints: 10,
    attendance: { [dstr(nowWed)]: 'present' }, errorHistory: {},
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await ctx.newPage();
  await mockRoutes(page, kvStore);

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
  const ajudanteRaw = JSON.parse(kvStore.get('student:vespertino:Ajudante_Souza'));
  ajudanteRaw.partnerRewards = { [nowKey]: { helper: 3, helped: 0 } };
  kvStore.set('student:vespertino:Ajudante_Souza', JSON.stringify(ajudanteRaw));

  const criativoRaw = { name: 'Criativo Alves', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: '' }], phase: 'coding', lastSeen: Date.now(), achievements: [], nyxPoints: 10, weeklyChallenge: { weekKey: nowKey, status: 'done' } };
  kvStore.set('student:vespertino:Criativo_Alves', JSON.stringify(criativoRaw));

  await loginNewStudent(page, 'Espectador Teste');
  // dá 1 erro pro próprio observador hoje, pra não empatar com "Organizado Lima" (0 erros) e deixar
  // o teste de "código mais organizado" sem ambiguidade de critério de desempate
  const obsRaw = JSON.parse(kvStore.get('student:vespertino:Espectador_Teste'));
  obsRaw.errorHistory = { [dstr(nowWed)]: 3 };
  kvStore.set('student:vespertino:Espectador_Teste', JSON.stringify(obsRaw));
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
