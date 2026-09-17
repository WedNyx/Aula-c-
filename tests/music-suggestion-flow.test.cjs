// A Central de Músicas tinha uma fila de moderação inteira construída do lado do professor
// ("Sugestões aguardando aprovação", com Aprovar/Recusar, atualizando a cada 10s) e o endpoint de
// armazenamento (submitMusicSuggestion) prontos — mas o formulário de sugestão do aluno
// (ClassMusicSuggestionForm, dentro de ClassMusicPlayer) nunca recebia a prop "onSuggest" quando
// renderizado pela Central de Músicas do ALUNO (StudentMusicHub, aba "Playlist da sala"): sem essa
// prop o formulário nunca aparecia, então nenhum aluno jamais conseguia gerar uma sugestão de
// verdade — a fila do professor ficava sempre vazia. Havia ainda um segundo problema: com a
// playlist da turma vazia (o caso mais comum, turma nova), um "return" antecipado escondia o
// componente inteiro, formulário incluso. Este teste cobre o fluxo ponta a ponta depois do
// conserto: aluno sugere uma faixa (turma com playlist vazia) → professor aprova → a faixa entra
// na playlist oficial da sala.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('teachermeta:main', JSON.stringify({
    city: 'Sobradinho', classDays: ['2026-07-20'], contentNames: {}, allowWeekend: true,
    schedule: { matutino: { start: '', end: '' }, vespertino: { start: '', end: '' } },
    musicSettings: { matutino: { enabled: true, studentsCanAdd: true, tracks: [] } },
  }));
  kvStore.set('student:matutino:AlunoMusico', JSON.stringify({
    name: 'AlunoMusico', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));

  const browser = await launchBrowser();

  // ── aluno: abre a Central de Músicas (playlist da sala ainda VAZIA), aba "Playlist da sala", sugere uma faixa ──
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageA = await ctxA.newPage();
  const jsErrorsA = await mockRoutes(pageA, kvStore);
  await pageA.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await pageA.waitForTimeout(700);
  await pageA.click('text=Aluno');
  await pageA.waitForTimeout(500);
  await pageA.click('text=☀️ Matutino');
  await pageA.waitForTimeout(500);
  await pageA.waitForSelector('text=AlunoMusico', { timeout: 10000 });
  await pageA.click('text=AlunoMusico');
  await pageA.waitForTimeout(1500);
  for (let i = 0; i < 8; i++) {
    const closeSanctuary = pageA.locator('[aria-label="Fechar Santuário Lunar"]');
    const skipCheckin = pageA.locator('button:has-text("Pular hoje")');
    if (await closeSanctuary.count()) { await closeSanctuary.click({ force: true }); await pageA.waitForTimeout(400); }
    else if (await skipCheckin.count()) { await skipCheckin.click({ force: true }); await pageA.waitForTimeout(400); }
    else break;
  }

  await pageA.click('text=Central de músicas');
  await pageA.waitForTimeout(500);
  check('Central de músicas do aluno abre', (await pageA.locator('text=🎵 Central de músicas').count()) > 0);
  await pageA.click('button:has-text("👥 Playlist da sala")');
  await pageA.waitForTimeout(400);
  check('Playlist vazia NÃO esconde o formulário de sugestão', (await pageA.locator('text=Sugerir uma faixa ao professor').count()) > 0);

  await pageA.fill('input[aria-label="Nome da música"]', 'Lo-Fi pra Codar');
  await pageA.fill('input[aria-label="Artista (opcional)"]', 'Estudio Nyx');
  await pageA.fill('input[aria-label="Link HTTPS da faixa, YouTube ou Spotify"]', 'https://www.youtube.com/watch?v=lofi123');
  await pageA.click('button:has-text("Enviar para aprovação")');
  await pageA.waitForTimeout(700);
  check('Confirmação de sugestão enviada aparece pro aluno', (await pageA.locator('text=/Sugestão enviada para aprovação/').count()) > 0);
  check('SEM erro de JS (aluno)', jsErrorsA.length === 0, jsErrorsA.slice(0, 3).join(' | '));

  const suggestionKeys = [...kvStore.keys()].filter(k => k.startsWith('musicsuggestion:matutino:'));
  check('Sugestão foi gravada no servidor', suggestionKeys.length === 1, JSON.stringify(suggestionKeys));
  const suggestion = suggestionKeys.length ? JSON.parse(kvStore.get(suggestionKeys[0])) : null;
  check('Sugestão gravada tem os dados certos', suggestion?.title === 'Lo-Fi pra Codar' && suggestion?.studentName === 'AlunoMusico', JSON.stringify(suggestion));

  // ── professor: vê a sugestão na fila de moderação e aprova ──
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('text=Música da turma');
  await pageT.waitForTimeout(700);
  check('Fila de moderação mostra a sugestão do aluno', (await pageT.locator('text=Lo-Fi pra Codar').count()) > 0);
  check('Mostra quem sugeriu', (await pageT.locator('text=/sugerida por AlunoMusico/').count()) > 0);

  await pageT.click('button:has-text("Aprovar")');
  await pageT.waitForTimeout(700);
  check('Mensagem confirma que a playlist foi salva', (await pageT.locator('text=/Configuração musical salva/').count()) > 0);
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  const metaAfter = JSON.parse(kvStore.get('teachermeta:main'));
  const tracksAfter = metaAfter.musicSettings?.matutino?.tracks || [];
  check('Faixa aprovada entrou na playlist oficial da sala', tracksAfter.some(t => t.title === 'Lo-Fi pra Codar' && t.addedBy === 'AlunoMusico'), JSON.stringify(tracksAfter));
  const suggestionKeysAfter = [...kvStore.keys()].filter(k => k.startsWith('musicsuggestion:matutino:'));
  check('Sugestão saiu da fila depois de aprovada', suggestionKeysAfter.length === 0, JSON.stringify(suggestionKeysAfter));

  await ctxA.close();
  await ctxT.close();
  await browser.close();
  process.exit(summary('SUGESTÃO DE MÚSICA: ALUNO SUGERE, PROFESSOR APROVA, ENTRA NA PLAYLIST DA SALA') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
