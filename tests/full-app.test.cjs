// Ponta a ponta: fluxo completo do aluno (perfil → editor → terminal → salvar → atividade →
// conclusão) e todas as abas principais do painel do professor.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher, loginNewStudent } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore();
  const browser = await launchBrowser();

  // ══════════════════ 1) FLUXO DO ALUNO, DE PONTA A PONTA ══════════════════
  console.log('\n--- ALUNO ---');
  const ctxA = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const a = await ctxA.newPage();
  const errA = await mockRoutes(a, kvStore);

  await loginNewStudent(a, 'Fulano Teste');

  check('Editor de código aparece', (await a.locator('[data-tour="editor"]').count()) > 0);
  check('Terminal aparece', (await a.locator('[data-tour="terminal"]').count()) > 0);
  check('Painel do Nyx aparece', (await a.locator('[data-tour="nyx"]').count()) > 0);

  const editorArea = a.locator('[data-tour="editor"] textarea, [data-tour="editor"] [contenteditable="true"]').first();
  if (await editorArea.count()) {
    await editorArea.click();
    await a.keyboard.type('Console.WriteLine("Ola mundo");', { delay: 5 });
  }
  await a.waitForTimeout(300);

  const termInput = a.locator('[data-tour="terminal"] input').first();
  check('Campo do terminal existe', (await termInput.count()) > 0);
  if (await termInput.count()) {
    await termInput.click();
    await termInput.fill('dotnet run');
    await termInput.press('Enter');
    await a.waitForTimeout(600);
    const termText = await a.locator('[data-tour="terminal"]').innerText();
    check('Terminal mostra alguma saída depois do dotnet run', termText.length > 20, termText.slice(0, 80));
  }

  check('Sem erro de JS até aqui (editor + terminal)', errA.length === 0, errA.slice(0, 3).join(' | '));

  const salvarBtn = a.locator('[data-tour="salvar"]').first();
  if (await salvarBtn.count()) {
    await salvarBtn.click();
    await a.waitForTimeout(3000);
    check('Tela de resumo/atividade apareceu depois de salvar', (await a.locator('text=/Atividade da Aula|resumo/i').count()) > 0);
  }

  const startActivityBtn = a.locator('button:has-text("Fazer Atividade")');
  if (await startActivityBtn.count()) { await startActivityBtn.click(); await a.waitForTimeout(500); }
  const questionCards = a.locator('[data-q]');
  const qCount = await questionCards.count();
  if (qCount > 0) {
    for (let i = 0; i < qCount; i++) {
      await questionCards.nth(i).locator('[data-opt="0"]').click();
      await a.waitForTimeout(80);
    }
    const enviarBtn = a.locator('button:has-text("Enviar Atividade")');
    if (await enviarBtn.count()) {
      await enviarBtn.click();
      await a.waitForTimeout(2500);
      check('Tela de conclusão (nota) aparece depois de enviar a atividade', (await a.locator('text=/nota|parabéns|conclu/i').count()) > 0);
    }
  } else {
    check('Perguntas da atividade renderizaram', false, 'nenhum [data-q] encontrado — fluxo pode ter ficado em outra fase');
  }

  check('Sem erro de JS no fluxo completo do aluno', errA.length === 0, errA.slice(0, 3).join(' | '));
  await ctxA.close();

  // ══════════════════ 2) PAINEL DO PROFESSOR, TODAS AS ABAS PRINCIPAIS ══════════════════
  console.log('\n--- PROFESSOR ---');
  const ctxP = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const p = await ctxP.newPage();
  const errP = await mockRoutes(p, kvStore);

  await loginTeacher(p);
  check('Painel do professor abriu (pós-login)', (await p.locator('text=👥 Monitoramento').count()) > 0);

  const tabs = ['👨‍💻 Meu código', '🏆 Prova', '👥 Monitoramento', '🗓️ Calendário', '💬 Feedback'];
  for (const tab of tabs) {
    const tabBtn = p.locator(`text=${tab}`).first();
    if (await tabBtn.count()) {
      await tabBtn.click();
      await p.waitForTimeout(600);
      check(`Aba "${tab}" abre sem tela em branco`, (await p.locator('body').innerText()).length > 200);
    } else {
      check(`Aba "${tab}" existe no menu`, false);
    }
  }

  check('Sem erro de JS navegando pelas abas do professor', errP.length === 0, errP.slice(0, 3).join(' | '));
  await ctxP.close();

  await browser.close();
  process.exit(summary('TESTE COMPLETO DO APP') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
