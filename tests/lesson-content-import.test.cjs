// "Minhas aulas": o professor pode colar um JSON com conteúdo JÁ ESCRITO (de um PDF de uma turma
// anterior, por exemplo) direto numa aula salva — SEM chamar o Nyx nenhuma vez. E depois, se faltar
// algo (ex: só importou nome+explicação), "Gerar conteúdo pronto"/"Completar conteúdo" só pede ao
// Nyx os campos que ainda faltam, em vez de regerar tudo de novo.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  const lessonFiles = [{ name: 'Program.cs', code: 'int x = 1;\nConsole.WriteLine(x);' }];
  kvStore.set('teachercode:lessons', JSON.stringify([
    { title: 'Aula de Variáveis', files: lessonFiles, at: Date.now() },
  ]));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  let calls = 0;
  const requestedPrompts = [];
  await page.unroute('**/api/claude');
  await page.route('**/api/claude', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"configured":true}' }); return; }
    const body = JSON.parse(route.request().postData() || '{}');
    calls++;
    requestedPrompts.push(body.prompt || '');
    if (body.prompt.includes('Crie 8 questões')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify({ questions: Array.from({ length: 8 }, (_, i) => ({ q: `Pergunta gerada ${i + 1}?`, opts: ['A', 'B', 'C', 'D'], correct: 0 })) }) }] }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify({ intro: 'Resumo gerado.', secoes: [{ titulo: 'X', explicacao: 'Y', exemplo: '' }], dica: 'Z' }) }] }) });
    }
  });

  await loginTeacher(page);
  await page.waitForTimeout(1000);
  await page.click('text=👨‍💻 Meu código');
  await page.waitForTimeout(500);
  await page.click('button:has-text("📚 Minhas aulas")');
  await page.waitForTimeout(500);

  check('Aula ainda sem conteúdo pronto', (await page.locator('text=Sem conteúdo pronto ainda').count()) > 0);

  // ── importa nome + explicação (sem chamar o Nyx) ──
  await page.click('button:has-text("📥 Importar")');
  await page.waitForTimeout(400);
  const importJson = JSON.stringify({
    contentName: 'RPG em Console: Classes, Herança e Polimorfismo',
    explain: { intro: 'Um jogo de RPG em console.', secoes: [{ titulo: 'Ponto de entrada Main', explicacao: 'O método Main é o ponto de partida.', exemplo: 'public static void Main(string[] args) {}' }], dica: 'Estude cada seção com calma.' },
  });
  await page.fill('textarea', importJson);
  await page.click('button:has-text("📥 Importar sem gastar o Nyx")');
  await page.waitForTimeout(700);

  check('Nenhuma chamada ao Nyx foi feita ao importar', calls === 0, String(calls));
  check('Badge muda pra "Conteúdo parcial" (só nome+explicação, falta resumo/atividade)', (await page.locator('text=🧩 Conteúdo parcial').count()) > 0);

  let saved = JSON.parse(kvStore.get('teachercode:lessons'));
  check('contentName foi salvo pelo import', saved[0].contentName === 'RPG em Console: Classes, Herança e Polimorfismo');
  check('explain foi salvo pelo import', saved[0].explain?.secoes?.[0]?.titulo === 'Ponto de entrada Main');
  check('resumo NÃO foi preenchido (não estava no JSON importado)', !saved[0].resumo);
  check('atividade NÃO foi preenchida (não estava no JSON importado)', !saved[0].atividade || saved[0].atividade.length === 0);

  // ── "Completar conteúdo" só deve pedir ao Nyx o que falta (resumo + atividade = 2 chamadas, NÃO 4) ──
  await page.click('button:has-text("🧠 Completar conteúdo")');
  await page.waitForTimeout(1500);

  check('Completar conteúdo chamou o Nyx exatamente 2x (resumo + atividade, não nome/explicação de novo)', calls === 2, String(calls));
  const askedForNameOrExplain = requestedPrompts.some(p => p.includes('NOME DE CONTEÚDO') || p.includes('nome de conteúdo') || p.includes('Crie uma explicação COMPLETA'));
  check('Não pediu nome nem explicação de novo (já importados)', !askedForNameOrExplain, JSON.stringify(requestedPrompts.map(p => p.slice(0, 40))));
  check('Badge agora é "Conteúdo pronto" (tudo completo)', (await page.locator('text=🧠 Conteúdo pronto').count()) > 0);

  saved = JSON.parse(kvStore.get('teachercode:lessons'));
  check('contentName importado continua intacto (não foi sobrescrito)', saved[0].contentName === 'RPG em Console: Classes, Herança e Polimorfismo');
  check('explain importado continua intacto (não foi sobrescrito)', saved[0].explain?.secoes?.[0]?.titulo === 'Ponto de entrada Main');
  check('resumo foi gerado pelo Completar', saved[0].resumo?.intro === 'Resumo gerado.');
  check('atividade foi gerada pelo Completar (8 questões)', Array.isArray(saved[0].atividade) && saved[0].atividade.length === 8);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('MINHAS AULAS: IMPORTAR CONTEÚDO PRONTO SEM CHAMAR O NYX + COMPLETAR SÓ O QUE FALTA') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
