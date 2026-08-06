// Botões novos na Lista de Chamada: "📚 Gerar resumo (hoje)" e "📚 Gerar resumo (ontem)" — geram o
// resumo de aula do Nyx em lote pra quem ainda não tem um salvo naquele dia, sem sobrescrever quem
// já tem e sem gastar IA à toa em quem não escreveu nenhum código.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const now = new Date();
  const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const y = new Date(now.getTime() - 86400000);
  const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;

  const kvStore = baseKvStore();
  const csharpCode = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); } }';

  // 1) sem resumo de HOJE, com código -> deve GERAR
  kvStore.set('student:matutino:SemResumoHoje', JSON.stringify({
    name: 'SemResumoHoje', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: csharpCode }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));
  // 2) já TEM resumo de hoje -> não deve mexer
  kvStore.set('student:matutino:JaTinhaHoje', JSON.stringify({
    name: 'JaTinhaHoje', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: csharpCode }],
    phase: 'summary', lastSeen: Date.now(), nyxPoints: 0,
    summaryHistory: { [tk]: { intro: 'já existia', secoes: [{ emoji: '📌', titulo: 'Antigo', explicacao: 'x', exemplo: 'y' }], dica: 'd' } },
  }));
  // 3) sem código nenhum -> deve pular
  kvStore.set('student:matutino:SemCodigo', JSON.stringify({
    name: 'SemCodigo', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));
  // 4) sem resumo de ONTEM, com código -> deve GERAR só quando clicar no botão "ontem"
  kvStore.set('student:matutino:SemResumoOntem', JSON.stringify({
    name: 'SemResumoOntem', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: csharpCode }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, summaryHistory: {},
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.waitForTimeout(1000);
  await page.click('text=📋 Lista de Chamada');
  await page.waitForTimeout(400);
  await page.waitForSelector('text=SemResumoHoje', { timeout: 10000 });

  // ── clica "Gerar resumo (hoje)" ──
  await page.click('button:has-text("📚 Gerar resumo (hoje)")');
  await page.waitForSelector('text=/Resumo de hoje:/', { timeout: 20000 });
  await page.waitForTimeout(300);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  const semResumoHoje = JSON.parse(kvStore.get('student:matutino:SemResumoHoje'));
  check('SemResumoHoje ganhou um resumo de HOJE com seções', Array.isArray(semResumoHoje.summaryHistory?.[tk]?.secoes) && semResumoHoje.summaryHistory[tk].secoes.length > 0);

  const jaTinhaHoje = JSON.parse(kvStore.get('student:matutino:JaTinhaHoje'));
  check('JaTinhaHoje NÃO foi sobrescrito (continua "Antigo")', jaTinhaHoje.summaryHistory[tk].secoes[0].titulo === 'Antigo');

  const semCodigo = JSON.parse(kvStore.get('student:matutino:SemCodigo'));
  check('SemCodigo continua sem resumo de hoje (pulado por falta de código)', !semCodigo.summaryHistory?.[tk]);

  // SemResumoOntem também não tinha resumo de HOJE e tem código, então também é candidato válido
  // do lote de "hoje" — o ponto deste teste é só o de "ontem" (verificado no próximo clique)
  const semResumoOntemAntes = JSON.parse(kvStore.get('student:matutino:SemResumoOntem'));
  check('SemResumoOntem ganhou resumo de HOJE também (não tinha nenhum e tem código, é candidato válido)', Array.isArray(semResumoOntemAntes.summaryHistory?.[tk]?.secoes) && semResumoOntemAntes.summaryHistory[tk].secoes.length > 0);

  // ── clica "Gerar resumo (ontem)" ──
  await page.click('button:has-text("📚 Gerar resumo (ontem)")');
  await page.waitForSelector('text=/Resumo de ontem:/', { timeout: 20000 });
  await page.waitForTimeout(300);

  const semResumoOntemDepois = JSON.parse(kvStore.get('student:matutino:SemResumoOntem'));
  check('SemResumoOntem ganhou um resumo de ONTEM com seções', Array.isArray(semResumoOntemDepois.summaryHistory?.[yk]?.secoes) && semResumoOntemDepois.summaryHistory[yk].secoes.length > 0);

  check('SEM erro de JS (depois do 2º clique)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('RESUMO EM LOTE (BOTÕES DE HOJE E ONTEM)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
