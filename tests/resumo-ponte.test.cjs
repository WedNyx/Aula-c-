// Ponte de resumo: se o aluno faltou (ou o ritmo pulou um dia dele) e o último resumo salvo dele é
// de um dia ANTERIOR — não de hoje —, o próximo resumo gerado precisa cobrir o que ficou pendente
// desde então, sem repetir os conceitos já explicados, em vez de resumir só o código de hoje e
// deixar o que ele perdeu pra trás. O resumo antigo continua intacto no próprio dia dele (o
// caderno do aluno não perde nada), e o de hoje é o conteúdo novo/pendente.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const now = new Date();
  const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const csharpCode = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); int y = 2; } }';

  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoFaltou', JSON.stringify({
    name: 'AlunoFaltou', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: csharpCode }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
    summaryHistory: { '2026-07-20': { intro: 'Aula antiga', secoes: [{ emoji: '📌', titulo: 'ConceitoAntigo', explicacao: 'x', exemplo: 'y' }], dica: 'd' } },
  }));

  const browser = await launchBrowser();

  // ── professor libera o resumo de hoje pra turma ──
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('text=👨‍💻 Meu código');
  await pageT.waitForTimeout(500);
  await pageT.locator('[data-tour-prof="resumo-ritmo"]').locator('button:has-text("Liberar resumo pra turma hoje")').click();
  await pageT.waitForTimeout(600);
  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  // ── aluno que faltou: entra e recebe a PONTE, sem clicar em nada ──
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageA = await ctxA.newPage();
  const jsErrorsA = await mockRoutes(pageA, kvStore);
  await pageA.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await pageA.waitForTimeout(700);
  await pageA.click('text=Aluno');
  await pageA.waitForTimeout(500);
  await pageA.click('text=☀️ Matutino');
  await pageA.waitForTimeout(500);
  await pageA.waitForSelector('text=AlunoFaltou', { timeout: 10000 });
  await pageA.click('text=AlunoFaltou');
  await pageA.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = pageA.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await pageA.waitForTimeout(300); }
    else break;
  }
  await pageA.waitForSelector('text=Resumo da sua aula', { timeout: 20000 });
  check('Aluno que faltou foi pro resumo sozinho', (await pageA.locator('text=Resumo da sua aula').count()) > 0);
  check('A tela mostra o conceito NOVO da ponte (não repete "ConceitoAntigo")', (await pageA.locator('text=Conceito Novo Depois da Falta').count()) > 0);
  check('SEM erro de JS (AlunoFaltou)', jsErrorsA.length === 0, jsErrorsA.slice(0, 3).join(' | '));

  const after = JSON.parse(kvStore.get('student:matutino:AlunoFaltou'));
  check('Resumo ANTIGO (2026-07-20) continua intacto, com "ConceitoAntigo"',
    after.summaryHistory?.['2026-07-20']?.secoes?.[0]?.titulo === 'ConceitoAntigo', JSON.stringify(after.summaryHistory?.['2026-07-20']));
  check('Resumo de HOJE é a ponte ("Conceito Novo Depois da Falta"), não repete o antigo',
    after.summaryHistory?.[tk]?.secoes?.some(s => s.titulo === 'Conceito Novo Depois da Falta')
    && !after.summaryHistory?.[tk]?.secoes?.some(s => s.titulo === 'ConceitoAntigo'),
    JSON.stringify(after.summaryHistory?.[tk]));
  check('phase virou "summary"', after.phase === 'summary', after.phase);

  await ctxT.close();
  await ctxA.close();
  await browser.close();
  process.exit(summary('PONTE DE RESUMO: ALUNO QUE FALTOU RECEBE O QUE FICOU PENDENTE, SEM REPETIR') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
