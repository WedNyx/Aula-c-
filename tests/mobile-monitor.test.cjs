// Painel do professor no celular: entra sozinho no "modo simples" (lista direta de como cada
// aluno está agora) numa tela estreita, com botão pra ir pro modo completo quando precisar. Numa
// tela larga (computador) continua abrindo direto no modo completo de sempre.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoDificuldade', JSON.stringify({
    name: 'AlunoDificuldade', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x = 1;' }],
    phase: 'coding', lastSeen: Date.now(), score: 0, hasError: true, feedback: { message: 'erro de sintaxe na linha 3' },
  }));
  kvStore.set('student:vespertino:AlunoTarde', JSON.stringify({
    name: 'AlunoTarde', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: 'int y = 2;' }],
    phase: 'done', lastSeen: Date.now() - 40 * 60000, score: 92,
  }));

  const browser = await launchBrowser();

  // ── tela larga (computador): continua abrindo direto no modo completo de sempre ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await loginTeacher(page);
    await page.waitForTimeout(1200);
    check('SEM erro de JS (desktop)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    check('Tela larga abre no modo completo (não no modo simples)', (await page.locator('text=👥 Monitoramento').count()) > 0 && (await page.locator('text=👥 Turma agora').count()) === 0);
    await ctx.close();
  }

  // ── tela estreita (celular): abre sozinho no modo simples ──
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);
    await loginTeacher(page);
    await page.waitForTimeout(1200);

    check('SEM erro de JS (mobile)', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    check('Tela estreita abre sozinha no modo simples', (await page.locator('text=👥 Turma agora').count()) > 0);
    check('Aluno com dificuldade aparece na lista', (await page.locator('text=AlunoDificuldade').count()) > 0);
    check('Filtro de turno (Matutino/Vespertino) aparece', (await page.locator('text=☀️ Matutino').count()) > 0 && (await page.locator('text=🌙 Vespertino').count()) > 0);

    // expande o card do aluno com dificuldade e marca presença
    await page.click('text=AlunoDificuldade');
    await page.waitForTimeout(300);
    check('Motivo da dificuldade aparece ao expandir', (await page.locator('text=erro de sintaxe na linha 3').count()) > 0);
    await page.click('text=✅ Marcar presença hoje');
    await page.waitForTimeout(500);
    const afterMark = JSON.parse(kvStore.get('student:matutino:AlunoDificuldade'));
    const now = new Date();
    const tk = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    check('Ação rápida "marcar presença" funciona direto da lista simples', (afterMark.attendance || {})[tk] === 'present', JSON.stringify(afterMark.attendance));

    // troca pro modo completo e confirma que dá pra voltar
    await page.click('text=🖥️ Modo completo');
    await page.waitForTimeout(500);
    check('Botão "Modo completo" leva pro painel de sempre', (await page.locator('text=👥 Monitoramento').count()) > 0);
    check('No modo completo (celular) aparece botão pra voltar ao modo simples', (await page.locator('text=📱 Modo simples').count()) > 0);
    await page.click('text=📱 Modo simples');
    await page.waitForTimeout(500);
    check('Botão "Modo simples" volta pra lista simples', (await page.locator('text=👥 Turma agora').count()) > 0);

    check('SEM erro de JS depois de trocar de modo', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(summary('PAINEL DO PROFESSOR: MODO SIMPLES NO CELULAR') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
