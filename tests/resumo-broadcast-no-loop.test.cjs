// O vigia de 5s que auto-entrega o resumo liberado pelo professor (ver resumo-broadcast.test.cjs)
// só olhava a FASE do aluno ("coding"?) e a DATA do gatilho — nunca se o aluno JÁ tinha exatamente
// esse resumo no caderno. Depois que o aluno terminava a atividade e clicava "← Voltar para o
// código" (fase volta pra "coding"), o próximo tick do vigia via "fase é coding" + "gatilho de hoje
// continua valendo" e mandava ele pro resumo de novo — um loop, porque handleSave() muda a fase
// sem checar se há algo realmente novo. Este teste garante que isso não acontece mais.
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const now = new Date();
  const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const resumoDoProfessor = {
    intro: 'Você aprendeu bastante hoje!',
    secoes: [{ emoji: '💡', titulo: 'Variáveis', explicacao: 'Guardam valores.', exemplo: 'int x = 1;' }],
    dica: 'Continue praticando!',
  };

  const kvStore = baseKvStore({ city: 'Sobradinho' });
  kvStore.set('resumotrigger:matutino', JSON.stringify({ date: tk, resumo: resumoDoProfessor }));
  // aluno que JÁ terminou a atividade de hoje (mesmo resumo do gatilho salvo no caderno) e já
  // voltou pra tela de código — exatamente o estado depois de clicar "← Voltar para o código"
  kvStore.set('student:matutino:AlunoJaTerminou', JSON.stringify({
    name: 'AlunoJaTerminou', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x = 1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 5, summaryHistory: { [tk]: resumoDoProfessor },
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);
  let claudeSummaryCalls = 0;
  page.on('request', req => {
    if (req.url().includes('/api/claude') && req.method() === 'POST') {
      const body = req.postData() || '';
      if (body.includes('secoes') && body.includes('questions') === false) claudeSummaryCalls++;
    }
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('text=Aluno');
  await page.waitForTimeout(500);
  await page.click('text=☀️ Matutino');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=AlunoJaTerminou', { timeout: 10000 });
  await page.click('text=AlunoJaTerminou');
  await page.waitForTimeout(1200);

  check('Aluno fica na tela de código, NÃO é mandado pro resumo de novo', (await page.locator('text=Resumo da sua aula').count()) === 0);

  // espera o vigia (roda a cada 5s) ter pelo menos uma chance real de disparar de novo
  await page.waitForTimeout(6500);

  check('Depois de esperar o vigia rodar de novo, AINDA está no código (sem loop de volta pro resumo)', (await page.locator('text=Resumo da sua aula').count()) === 0);
  check('Nenhuma chamada nova ao Nyx pra gerar resumo (nada precisava mudar)', claudeSummaryCalls === 0, `calls=${claudeSummaryCalls}`);
  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  const after = JSON.parse(kvStore.get('student:matutino:AlunoJaTerminou'));
  check('Fase continua "coding" no servidor (não foi puxado pra "summary" de novo)', after.phase === 'coding', after.phase);

  await ctx.close();
  await browser.close();
  process.exit(summary('RESUMO JÁ ENTREGUE NÃO VOLTA A PUXAR O ALUNO DE VOLTA (SEM LOOP)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
