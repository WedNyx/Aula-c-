// Duelo 1x1: os pontos do Nyx (+2/+3/+1, dependendo de derrota/empate/vitória) precisam ir pros
// DOIS jogadores quando o duelo termina — antes da correção, só quem enviasse as respostas por
// ÚLTIMO ganhava os pontos (o primeiro a responder via submitDuelAnswers() nunca disparava
// onAward(), mesmo a tela mostrando "+X pontos do Nyx" pra ele também).
const { check, summary, launchBrowser, mockRoutes, baseKvStore } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoDuelA', JSON.stringify({
    name: 'AlunoDuelA', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int a=1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 80,
  }));
  kvStore.set('student:matutino:AlunoDuelB', JSON.stringify({
    name: 'AlunoDuelB', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int b=1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 80,
  }));
  // duelo já ATIVO entre os dois (pula a etapa de desafiar/aceitar) — as mesmas 5 perguntas pros
  // dois, cada uma com o "correct" numa posição diferente
  const questions = Array.from({ length: 5 }, (_, i) => ({ q: `Pergunta ${i + 1}?`, opts: ['A', 'B', 'C', 'D'], correct: i % 4 }));
  kvStore.set('duel:matutino:AlunoDuelA__AlunoDuelB', JSON.stringify({
    from: 'AlunoDuelA', to: 'AlunoDuelB', fromAvatar: {}, toAvatar: {},
    questions, status: 'active', answersFrom: {}, answersTo: {}, scoreFrom: null, scoreTo: null, createdAt: Date.now(),
  }));

  const browser = await launchBrowser();
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  const jsErrorsA = await mockRoutes(pageA, kvStore);
  const jsErrorsB = await mockRoutes(pageB, kvStore);

  async function loginExisting(page, name) {
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.click('text=Aluno');
    await page.waitForTimeout(500);
    await page.click('text=☀️ Matutino');
    await page.waitForTimeout(500);
    await page.waitForSelector(`text=${name}`, { timeout: 10000 });
    await page.click(`text=${name}`);
    await page.waitForTimeout(1200);
    for (let i = 0; i < 5; i++) {
      const skipCheckin = page.locator('button:has-text("Pular hoje")');
      if (await skipCheckin.count()) { await skipCheckin.click(); await page.waitForTimeout(300); }
      else break;
    }
  }

  // clica sempre na 1ª opção de cada pergunta (posição no DOM, não o texto — as opções são
  // sempre "A"/"B"/"C"/"D" embaralhadas, então "clicar na 1ª" é o que garante resposta idêntica
  // pros dois jogadores, sem depender de acertar de verdade)
  async function answerFirstOptionEveryQuestion(page) {
    for (let i = 0; i < 5; i++) {
      await page.evaluate((idx) => {
        const ps = Array.from(document.querySelectorAll('p'));
        const target = ps.find(p => p.textContent.trim().startsWith(`${idx + 1}.`));
        const btn = target && target.parentElement.querySelector('button');
        if (btn) btn.click();
      }, i);
    }
  }

  // Duelo/Duelo em Dupla/Corrida saíram de "Turma & Você" e agora vivem só no menu "🎮 Games"
  // (sidebar ou barra rápida) — abre o menu e clica no jogo específico.
  async function openGame(page, label) {
    await page.click('button:has-text("🎮 Games")');
    await page.waitForTimeout(300);
    // .first() pq "⚔️ Duelo" é substring de "🤝⚔️ Duelo em Dupla" também
    await page.locator(`button:has-text("${label}")`).first().click();
  }

  await loginExisting(pageA, 'AlunoDuelA');
  await loginExisting(pageB, 'AlunoDuelB');

  // AlunoDuelA abre o duelo (já ativo) e responde — SEMPRE a 1ª opção, pra combinar exatamente
  // com o que AlunoDuelB também vai responder (garante empate = +2 pra cada um, sem depender de
  // acertar a pergunta de verdade)
  await openGame(pageA, '⚔️ Duelo');
  await pageA.waitForTimeout(500);
  check('AlunoDuelA cai direto na tela de responder (duelo já ativo)', (await pageA.locator('button:has-text("Enviar respostas")').count()) > 0);
  await answerFirstOptionEveryQuestion(pageA);
  await pageA.click('button:has-text("Enviar respostas")');
  await pageA.waitForTimeout(700);

  check('AlunoDuelA fica esperando o resultado (só ele respondeu até agora)', (await pageA.locator('text=/Esperando.*terminar/').count()) > 0);
  const aAfterOwnSubmit = JSON.parse(kvStore.get('student:matutino:AlunoDuelA'));
  check('AlunoDuelA AINDA não ganhou pontos (o outro ainda não respondeu)', (aAfterOwnSubmit.nyxPoints || 0) === 0, `nyxPoints=${aAfterOwnSubmit.nyxPoints}`);

  // agora AlunoDuelB responde (segundo a responder) — mesma 1ª opção em todas, garantindo empate
  await openGame(pageB, '⚔️ Duelo');
  await pageB.waitForTimeout(500);
  check('AlunoDuelB cai direto na tela de responder (duelo já ativo)', (await pageB.locator('button:has-text("Enviar respostas")').count()) > 0);
  await answerFirstOptionEveryQuestion(pageB);
  await pageB.click('button:has-text("Enviar respostas")');
  await pageB.waitForTimeout(700);

  check('AlunoDuelB (respondeu por ÚLTIMO) vê a tela de resultado', (await pageB.locator('text=Empate!').count()) > 0 || (await pageB.locator('text=Você venceu!').count()) > 0 || (await pageB.locator('text=Você perdeu dessa vez').count()) > 0);
  const bAfter = JSON.parse(kvStore.get('student:matutino:AlunoDuelB'));
  check('AlunoDuelB (respondeu por ÚLTIMO) ganhou pontos do Nyx', (bAfter.nyxPoints || 0) > 0, `nyxPoints=${bAfter.nyxPoints}`);

  // espera o polling de 8s do AlunoDuelA (setInterval em refresh()) pegar o duelo "done" e o
  // useEffect premiar ele também — ESSA é a correção: antes, só quem respondia por último ganhava
  await pageA.waitForTimeout(9000);
  const aFinal = JSON.parse(kvStore.get('student:matutino:AlunoDuelA'));
  check('AlunoDuelA (respondeu PRIMEIRO) também ganhou pontos do Nyx depois que o duelo terminou', (aFinal.nyxPoints || 0) > 0, `nyxPoints=${aFinal.nyxPoints}`);
  check('Os dois ganharam a MESMA quantia de pontos (empate, já que responderam igual)', aFinal.nyxPoints === bAfter.nyxPoints, `A=${aFinal.nyxPoints} B=${bAfter.nyxPoints}`);
  check('AlunoDuelA também vê a tela de resultado depois do polling', (await pageA.locator('text=Empate!').count()) > 0 || (await pageA.locator('text=Você venceu!').count()) > 0 || (await pageA.locator('text=Você perdeu dessa vez').count()) > 0);

  check('SEM erro de JS (AlunoDuelA)', jsErrorsA.length === 0, jsErrorsA.slice(0, 3).join(' | '));
  check('SEM erro de JS (AlunoDuelB)', jsErrorsB.length === 0, jsErrorsB.slice(0, 3).join(' | '));

  await ctxA.close();
  await ctxB.close();
  await browser.close();
  process.exit(summary('DUELO 1x1: OS DOIS JOGADORES GANHAM PONTOS DO NYX') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
