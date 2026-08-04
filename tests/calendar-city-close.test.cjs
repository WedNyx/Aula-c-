// Encerrar uma cidade não pode "reativar sozinho" a contagem de dias de aula pra próxima cidade —
// fica pausado (cityClosed) até o professor definir explicitamente o nome da próxima cidade.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  // ── parte 1: clicar em "Encerrar cidade" pela UI marca a cidade como encerrada ──
  {
    const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
    kvStore.set('student:matutino:AlunoMat', JSON.stringify({
      name: 'AlunoMat', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
      phase: 'coding', lastSeen: Date.now(), score: 80, nyxPoints: 30,
    }));

    const browser = await launchBrowser();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);

    await loginTeacher(page);
    await page.click('text=🗓️ Calendário');
    await page.waitForTimeout(500);

    check('Botão de encerrar cidade aparece (cidade ainda ativa)', (await page.locator('button:has-text("🏆 Encerrar cidade")').count()) > 0);
    await page.click('button:has-text("🏆 Encerrar cidade")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Sim, encerrar Sobradinho")');
    await page.waitForTimeout(2500); // Hall da Fama salvo + meta.cityClosed=true (acontece antes do PDF)

    check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    const meta1 = JSON.parse(kvStore.get('teachermeta:main'));
    check('meta.byTurma.matutino.cityClosed vira true ao encerrar (cada turma tem seu próprio calendário)', meta1.byTurma?.matutino?.cityClosed === true, JSON.stringify(meta1));

    await page.waitForTimeout(500);
    check('Aviso de cidade pausada aparece na tela', (await page.locator('text=A contagem de dias de aula está pausada').count()) > 0);
    check('Botão de encerrar some (não dá pra encerrar de novo sem definir a próxima)', (await page.locator('button:has-text("🏆 Encerrar cidade")').count()) === 0);

    await ctx.close();
    await browser.close();
  }

  // ── parte 2: enquanto cityClosed=true, dia de aula NÃO é marcado sozinho; assim que o professor
  // define a próxima cidade, volta a marcar normalmente ──
  {
    const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'], cityClosed: true });
    kvStore.set('student:matutino:AlunoMat2', JSON.stringify({
      name: 'AlunoMat2', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
      phase: 'coding', lastSeen: Date.now(), score: 80,
    }));

    const browser = await launchBrowser();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);

    await loginTeacher(page);
    await page.waitForTimeout(1800); // dá tempo do load() inicial (que roda na hora) rodar pelo menos 1x

    // mesmo cálculo do todayKey() do app (data LOCAL, não UTC — toISOString() dá a data errada
    // perto da virada da meia-noite dependendo do fuso, o que foi exatamente o que quebrou aqui)
    const d = new Date();
    const todayKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    let meta2 = JSON.parse(kvStore.get('teachermeta:main'));
    check('Com a cidade encerrada, o dia de hoje NÃO é marcado sozinho', !(meta2.classDays || []).includes(todayKey), JSON.stringify(meta2.classDays));

    await page.click('text=🗓️ Calendário');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="Ex: Ceilândia"]', 'Planaltina');
    await page.click('button:has-text("Salvar cidade")');
    await page.waitForTimeout(500);

    meta2 = JSON.parse(kvStore.get('teachermeta:main'));
    check('Definir a próxima cidade limpa o cityClosed (na turma matutino, que é a selecionada)', meta2.byTurma?.matutino?.cityClosed === false, JSON.stringify(meta2));
    check('Cidade nova foi salva', meta2.byTurma?.matutino?.city === 'Planaltina');

    // não dá pra usar page.reload() aqui: a sessão do professor só existe em memória (sem
    // localStorage), um reload de verdade jogaria de volta pra tela de login. Em vez disso, espera
    // o load() (que já roda sozinho a cada 10s) rodar de novo — agora sem cityClosed
    await page.waitForTimeout(11000);

    meta2 = JSON.parse(kvStore.get('teachermeta:main'));
    check('Depois de definir a próxima cidade, o dia de hoje volta a ser marcado sozinho', (meta2.byTurma?.matutino?.classDays || []).includes(todayKey), JSON.stringify(meta2.byTurma?.matutino?.classDays));
    check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

    await ctx.close();
    await browser.close();
  }

  process.exit(summary('CALENDÁRIO: ENCERRAR CIDADE NÃO REATIVA SOZINHO A CONTAGEM') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
