// Ponta a ponta: fluxo completo do aluno (perfil → editor → terminal → professor libera o resumo →
// atividade → conclusão) e todas as abas principais do painel do professor.
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
  check('Aviso de que o professor libera o resumo aparece (não é mais o aluno quem salva)', (await a.locator('[data-tour="salvar"]').count()) > 0);
  check('Botão "Salvar e Finalizar Aula" NÃO existe mais', (await a.locator('button:has-text("Salvar e Finalizar Aula")').count()) === 0);

  // ══════════════════ 2) PAINEL DO PROFESSOR: libera o resumo pra turma do aluno ══════════════════
  // a tela de login do aluno escolhe o turno sozinha (por horário do dia), então acha no banco em
  // qual turma "Fulano Teste" caiu, pra saber qual turma o professor precisa liberar
  console.log('\n--- PROFESSOR ---');
  let studentShift = null;
  for (const [k, v] of kvStore.entries()) {
    if (!k.startsWith('student:')) continue;
    try { const obj = JSON.parse(v); if (obj.name === 'Fulano Teste') { studentShift = obj.shift; break; } } catch {}
  }
  check('Achou a turma do aluno no banco', !!studentShift, studentShift);

  const ctxP = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const p = await ctxP.newPage();
  const errP = await mockRoutes(p, kvStore);
  await loginTeacher(p);
  await p.click('text=👨‍💻 Meu código');
  await p.waitForTimeout(500);
  const turmaLabel = studentShift === 'vespertino' ? '🌙 Vespertino' : '☀️ Matutino';
  const turmaBtn = p.locator(`button:has-text("${turmaLabel}")`).first();
  if (await turmaBtn.count()) { await turmaBtn.click(); await p.waitForTimeout(300); }
  await p.locator('[data-tour-prof="resumo-ritmo"]').locator('button:has-text("Gerar e liberar resumo pra turma")').click();
  await p.waitForTimeout(600);
  check('Professor liberou o resumo sem erro de JS', errP.length === 0, errP.slice(0, 3).join(' | '));

  // seletor PRECISO (não um regex genérico de "resumo") — o próprio aviso da tela de código já
  // menciona "resumo" ("seu professor libera o resumo..."), então um regex solto casava com esse
  // aviso ainda na fase "coding" e o teste seguia cedo demais, antes da geração de verdade terminar
  await a.waitForSelector('text=Resumo da sua aula', { timeout: 20000 });
  check('Tela de resumo apareceu no aluno depois do professor liberar', (await a.locator('text=Resumo da sua aula').count()) > 0);

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

  // ══════════════════ 3) PAINEL DO PROFESSOR, TODAS AS ABAS PRINCIPAIS ══════════════════
  // reaproveita o mesmo contexto/página do professor já aberto acima (pra liberar o resumo)
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
