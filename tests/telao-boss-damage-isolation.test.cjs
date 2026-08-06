// O cálculo de "dano da turma" do Chefão (bossDamage, em TeacherModals.jsx) antes filtrava só
// "não é a turma de teste" — então QUALQUER aluno de QUALQUER outra turma contava pro dano, mesmo
// sem nunca ter tido um "baseline" registrado nesse chefão (baseline só é gravado pra quem é da
// turma que invocou). Como o cálculo é nyxPoints atual menos baseline (0 quando não existe), o
// nyxPoints INTEIRO de um aluno de outra turma virava "dano" instantâneo — um chefão de 30 HP podia
// nascer já morto só porque um aluno de outra turma tinha 500+ pontos acumulados. Este teste invoca
// um chefão na turma "vespertino" com um aluno de "vespertino-b" já tendo muito mais pontos que o
// HP do chefão, e confirma que o chefão continua com HP cheio (dano da turma: 0).
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('turmas:list', JSON.stringify([
    { id: 'matutino', label: 'Matutino', emoji: '☀️', period: 'matutino', color: '#f59e0b', createdAt: 0, archived: false },
    { id: 'vespertino', label: 'Vespertino', emoji: '🌙', period: 'vespertino', color: '#c084fc', createdAt: 0, archived: false },
    { id: 'vespertino-b', label: 'Vespertino B', emoji: '🌙', period: 'vespertino', color: '#22d3ee', createdAt: 1, archived: false },
  ]));
  // aluno da turma DONA do chefão, com pontuação baixa — não deveria contar quase nenhum dano
  kvStore.set('student:vespertino:AlunoA', JSON.stringify({
    name: 'AlunoA', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 5, score: 70,
  }));
  // aluno de uma turma DIFERENTE, com pontuação bem maior que o HP do chefão — nunca deveria contar
  kvStore.set('student:vespertino-b:AlunoB', JSON.stringify({
    name: 'AlunoB', shift: 'vespertino-b', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 500, score: 90,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);
  await loginTeacher(page);
  await page.click('button:has-text("🖥️ Telão")');
  await page.waitForTimeout(500);
  const telao = page.locator('[data-testid="telao-modal"]');
  await telao.locator('button:has-text("🌙 Vespertino"):not(:has-text("Vespertino B"))').click();
  await page.waitForTimeout(300);
  const summonBtn = telao.locator('button:has-text("Fácil · 30 HP")').first();
  await summonBtn.click();
  await page.waitForTimeout(500);
  // pula os 10min de "estudo" antes da batalha pra já ver a barra de HP do chefão
  await telao.locator('button:has-text("Pular estudo")').click();
  await page.waitForTimeout(500);

  check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  const fullText = await telao.textContent();
  check('Chefão nasceu com a barra de vida cheia (30/30), sem dano nenhum',
    /❤️ 30\/30 · dano da turma: 0/.test(fullText || ''), `texto do telão: ${fullText}`);

  await ctx.close();
  await browser.close();
  process.exit(summary('DANO DO CHEFÃO NÃO VAZA PONTOS DE OUTRA TURMA') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
