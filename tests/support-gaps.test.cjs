// Fecha 3 lacunas de apoio a alunos: (1) aluno liga um perfil de apoio pra si mesmo (sem depender
// do professor notar), (2) aluno pede um parceiro sozinho e o professor vê/pareia/dispensa,
// (3) o painel do professor detecta quem está "travado" (online, faz tempo, sem escrever nada).
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:matutino:AlunoApoio', JSON.stringify({
    name: 'AlunoApoio', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
  }));
  kvStore.set('student:matutino:AlunoTravado', JSON.stringify({
    name: 'AlunoTravado', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
    joinedAt: Date.now() - 12 * 60000, code: '',
  }));
  kvStore.set('student:matutino:AlunoOk', JSON.stringify({
    name: 'AlunoOk', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x = 1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0,
    joinedAt: Date.now() - 12 * 60000, code: 'int x = 1;',
  }));

  const browser = await launchBrowser();

  // ══════════════════ 1) ALUNO: apoio pra si mesmo + pedir parceiro ══════════════════
  console.log('\n--- ALUNO: auto-apoio + pedir parceiro ---');
  const ctxA = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const a = await ctxA.newPage();
  const errA = await mockRoutes(a, kvStore);

  await a.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await a.waitForTimeout(700);
  await a.click('text=Aluno');
  await a.waitForTimeout(500);
  await a.click('text=☀️ Matutino');
  await a.waitForTimeout(500);
  await a.click('text=AlunoApoio');
  await a.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = a.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await a.waitForTimeout(300); }
    else break;
  }

  check('Ranking da turma aparece ANTES de ligar o Foco', (await a.locator('button:has-text("Ranking da turma")').count()) > 0);
  await a.click('text=Preciso de um ajuste hoje?');
  await a.waitForTimeout(300);
  await a.click('button:has-text("🎯 Foco")');
  await a.waitForTimeout(500);
  check('selfSupport.foco:true foi salvo no registro do aluno', JSON.parse(kvStore.get('student:matutino:AlunoApoio')).selfSupport?.foco === true);
  check('Ranking da turma SOME depois de ligar o Foco (modo foco ativo)', (await a.locator('button:has-text("Ranking da turma")').count()) === 0);
  await a.click('button:has-text("🎯 Foco")'); // desliga de novo pra não atrapalhar o resto do teste
  await a.waitForTimeout(400);

  check('Botão "Pedir um parceiro" aparece', (await a.locator('button:has-text("Pedir um parceiro pra me ajudar")').count()) > 0);
  await a.click('button:has-text("Pedir um parceiro pra me ajudar")');
  await a.waitForTimeout(500);
  check('Botão vira "Parceiro pedido!" depois de clicar', (await a.locator('button:has-text("Parceiro pedido!")').count()) > 0);
  check('wantsPartner foi salvo no registro do aluno', !!JSON.parse(kvStore.get('student:matutino:AlunoApoio')).wantsPartner);
  check('SEM erro de JS (aluno)', errA.length === 0, errA.slice(0, 3).join(' | '));

  // ══════════════════ 2) PROFESSOR: vê o pedido, o auto-apoio marcado, e quem está travado ══════════════════
  console.log('\n--- PROFESSOR: vê pedidos + detecção de travado ---');
  const ctxP = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const p = await ctxP.newPage();
  const errP = await mockRoutes(p, kvStore);
  await loginTeacher(p);
  await p.click('text=👥 Monitoramento');
  await p.waitForTimeout(500);

  check('Resumo mostra que alguém pediu parceiro', (await p.locator('text=/pediu um parceiro/').count()) > 0);
  check('Resumo mostra AlunoTravado como travado (dificuldade)', (await p.locator('text=/AlunoTravado/').count()) > 0);

  const monitorCard = p.locator('h3:has-text("Monitoramento")').locator('xpath=..');
  await monitorCard.hover();
  await p.waitForTimeout(700);
  await p.click('text=AlunoApoio');
  await p.waitForTimeout(500);
  check('Professor vê o badge de pedido de parceiro do aluno', (await p.locator('text=/pediu um parceiro/').count()) > 0);
  check('Botão "Foco" NÃO aparece marcado como pedido pelo aluno (ele desligou antes)', (await p.locator('button:has-text("🙋 🎯 Foco")').count()) === 0);

  await p.click('button:has-text("Dispensar")');
  await p.waitForTimeout(500);
  check('SEM erro de JS (professor)', errP.length === 0, errP.slice(0, 3).join(' | '));

  await ctxP.close();
  await ctxA.close();

  // ══════════════════ 3) ALUNO: o pedido de parceiro é limpo no próximo ciclo (poll) ══════════════════
  console.log('\n--- ALUNO: pedido de parceiro é limpo depois do professor dispensar ---');
  const ctxB = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const b = await ctxB.newPage();
  const errB = await mockRoutes(b, kvStore);
  await b.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await b.waitForTimeout(700);
  await b.click('text=Aluno');
  await b.waitForTimeout(500);
  await b.click('text=☀️ Matutino');
  await b.waitForTimeout(500);
  await b.click('text=AlunoApoio');
  await b.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = b.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await b.waitForTimeout(300); }
    else break;
  }
  check('Depois que o professor dispensou, o botão volta a ser "Pedir um parceiro" (relogando)', (await b.locator('button:has-text("Pedir um parceiro pra me ajudar")').count()) > 0);
  check('SEM erro de JS (aluno, 2ª sessão)', errB.length === 0, errB.slice(0, 3).join(' | '));
  await ctxB.close();

  await browser.close();
  process.exit(summary('LACUNAS DE APOIO A ALUNOS (auto-apoio, pedir parceiro, detecção de travado)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
