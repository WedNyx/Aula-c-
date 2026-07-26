// Sala de linguagens (amigos estudando HTML/CSS/PHP/JS fora da turma de C#): confere que as
// funcionalidades novas desta sessão (conquistas langOnly, trilha, portfólio público, próximos
// passos) funcionam certo pra esse tipo de aluno, e que ele fica separado corretamente no painel
// do professor e de FORA da página pública de impacto (que é só sobre a turma oficial de C#).
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('student:linguagens:AlunoLinguagens', JSON.stringify({
    name: 'AlunoLinguagens', shift: 'linguagens', avatar: {}, programmingLanguage: 'html',
    files: [{ name: 'index.html', code: '<h1>Ola</h1>' }], phase: 'coding', lastSeen: Date.now(),
    nyxPoints: 5, achievements: ['primeira-pagina'],
    summaryHistory: { '2026-07-20': { secoes: [{ emoji: '🌐', titulo: 'Estrutura HTML' }] } },
    portfolioPublic: false,
  }));
  // aluno normal de C# (matutino), pra confirmar que o painel do professor separa os dois certinho
  kvStore.set('student:matutino:AlunoCSharp', JSON.stringify({
    name: 'AlunoCSharp', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 80,
  }));

  const browser = await launchBrowser();

  // ══════════════════ 1) ALUNO DA SALA DE LINGUAGENS: conquista, trilha, portfólio, próximos passos ══════════════════
  console.log('\n--- ALUNO DA SALA DE LINGUAGENS ---');
  const ctxA = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const a = await ctxA.newPage();
  const errA = await mockRoutes(a, kvStore);

  await a.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await a.waitForTimeout(700);
  await a.click('text=Aluno');
  await a.waitForTimeout(500);
  await a.click('text=Sou de fora, quero estudar outra linguagem');
  await a.waitForTimeout(400);
  await a.fill('input[placeholder="Senha"]', 'MultiLang2026');
  await a.click('button:has-text("Entrar")');
  await a.waitForTimeout(500);
  check('Turma de linguagens ficou selecionada', (await a.locator('text=/Sala de linguagens selecionada/').count()) > 0);

  await a.waitForSelector('text=AlunoLinguagens', { timeout: 10000 });
  await a.click('text=AlunoLinguagens');
  await a.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = a.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await a.waitForTimeout(300); }
    else break;
  }

  await a.click('button:has-text("Conquistas")');
  await a.waitForTimeout(500);
  const achText = await a.locator('body').innerText();
  check('Conquista "Primeira Página" (langOnly) aparece desbloqueada', achText.includes('Primeira Página'));
  await a.click('div.pop button:has-text("✕")');
  await a.waitForTimeout(300);

  await a.click('button:has-text("Trilha de aprendizado")');
  await a.waitForTimeout(500);
  check('Trilha de aprendizado abre e mostra a aula de HTML', (await a.locator('text=Estrutura HTML').count()) > 0);
  await a.click('div.pop button:has-text("✕")');
  await a.waitForTimeout(300);

  await a.click('button:has-text("Próximos passos")');
  await a.waitForTimeout(500);
  check('Próximos passos abre normalmente pra sala de linguagens', (await a.locator('h2:has-text("Próximos passos")').count()) > 0);
  await a.click('div.pop button:has-text("✕")');
  await a.waitForTimeout(300);

  await a.click('text=Criar link público do meu progresso');
  await a.waitForTimeout(600);
  check('portfolioPublic:true foi salvo (sala de linguagens)', JSON.parse(kvStore.get('student:linguagens:AlunoLinguagens')).portfolioPublic === true);
  check('SEM erro de JS (aluno sala de linguagens)', errA.length === 0, errA.slice(0, 3).join(' | '));
  await ctxA.close();

  // ══════════════════ 2) PORTFÓLIO PÚBLICO VISTO DE FORA (sem login) ══════════════════
  const ctxV = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const v = await ctxV.newPage();
  const errV = await mockRoutes(v, kvStore);
  await v.goto('http://localhost:4173/portfolio/linguagens/AlunoLinguagens', { waitUntil: 'domcontentloaded' });
  await v.waitForTimeout(1200);
  const portfolioText = await v.locator('body').innerText();
  check('Portfólio público mostra o nome do aluno da sala de linguagens', portfolioText.includes('AlunoLinguagens'));
  check('Portfólio mostra a conquista "Primeira Página" (específica da sala de linguagens)', (await v.locator('text=Primeira Página').count()) > 0);
  check('Portfólio NÃO mostra "Poliglota" como conquistada (só "Primeira Página" foi desbloqueada)', !(await v.locator('text=Poliglota').count()));
  check('SEM erro de JS no portfólio público', errV.length === 0, errV.slice(0, 3).join(' | '));
  await ctxV.close();

  // ══════════════════ 3) PAINEL DO PROFESSOR: aba própria + fora do /impacto ══════════════════
  console.log('\n--- PROFESSOR: separação da sala de linguagens ---');
  const ctxP = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const p = await ctxP.newPage();
  const errP = await mockRoutes(p, kvStore);
  await loginTeacher(p);
  await p.click('text=👥 Monitoramento');
  await p.waitForTimeout(500);
  const monitorCard = p.locator('h3:has-text("Monitoramento")').locator('xpath=..');

  await p.click('text=☀️ Matutino');
  await p.waitForTimeout(400);
  await monitorCard.hover();
  await p.waitForTimeout(700);
  check('Aluno de C# aparece na aba Matutino', (await p.locator('text=AlunoCSharp').count()) > 0);
  check('Aluno da sala de linguagens NÃO aparece na aba Matutino', (await p.locator('text=AlunoLinguagens').count()) === 0);

  await p.click('text=/🌐 Linguagens/');
  await p.waitForTimeout(400);
  await monitorCard.hover();
  await p.waitForTimeout(700);
  check('Aluno da sala de linguagens aparece na própria aba "🌐 Linguagens"', (await p.locator('text=AlunoLinguagens').count()) > 0);
  check('Aluno de C# NÃO aparece na aba "🌐 Linguagens"', (await p.locator('text=AlunoCSharp').count()) === 0);
  check('SEM erro de JS no painel do professor', errP.length === 0, errP.slice(0, 3).join(' | '));
  await ctxP.close();

  // página pública de impacto: só sobre a turma oficial de C# — a sala de linguagens fica de fora de propósito
  const ctxI = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
  const i = await ctxI.newPage();
  const errI = await mockRoutes(i, kvStore);
  await i.goto('http://localhost:4173/impacto', { waitUntil: 'domcontentloaded' });
  await i.waitForTimeout(1200);
  check('Aluno da sala de linguagens NÃO aparece na página pública de impacto (é só sobre a turma oficial de C#)', !(await i.locator('text=AlunoLinguagens').count()));
  check('SEM erro de JS na página de impacto', errI.length === 0, errI.slice(0, 3).join(' | '));
  await ctxI.close();

  await browser.close();
  process.exit(summary('SALA DE LINGUAGENS (HTML/CSS/PHP/JS)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
