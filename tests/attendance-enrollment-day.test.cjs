// O dia em que o aluno ENTRA na plataforma pela primeira vez (cria o perfil) conta como presença
// automática, mesmo que ele não escreva nada de código nesse primeiro acesso (dia de
// cadastro/apresentação). Sem essa correção, persist() só marcava "present" se o aluno tivesse
// "feito algo de verdade" (código ≥10 chars, mudado de fase, nota, respostas) — um aluno que só
// entra e não mexe em nada no dia 1 ficava com "idle", que a planilha/relatório trata como falta.
// Dias DEPOIS do primeiro (sem trabalho feito) continuam virando "idle" normalmente — só o dia de
// entrada em si ganha presença garantida.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginNewStudent, loginTeacher } = require('./helpers.cjs');

function todayKeyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

(async () => {
  const today = todayKeyLocal();
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: [today] });

  // ── 1) aluno NOVO, criando o perfil hoje (primeiro dia dele) — sem escrever nenhum código ──
  const browser = await launchBrowser();
  const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page1 = await ctx1.newPage();
  const jsErrors1 = await mockRoutes(page1, kvStore);

  await loginNewStudent(page1, 'AlunoNovoHoje');
  await page1.waitForTimeout(2000); // dá tempo pro tick() inicial rodar e persistir

  // o turno padrão da tela de login depende da hora do sistema (antes das 13h = matutino, senão
  // vespertino) — busca a chave real em vez de assumir "matutino" pra não depender do horário
  const novoKey = [...kvStore.keys()].find(k => k.startsWith('student:') && k.endsWith(':AlunoNovoHoje'));
  const novo = JSON.parse((novoKey && kvStore.get(novoKey)) || '{}');
  check('Aluno novo foi salvo no banco', !!novo.name);
  check('Aluno novo NÃO escreveu código de verdade (confirma que o teste não está mascarando o bug)', !(novo.code||'').trim() || novo.code.trim().length < 10);
  check('Presença do PRIMEIRO DIA (dia de criação do perfil) é "present", mesmo sem código escrito', (novo.attendance || {})[today] === 'present', JSON.stringify(novo.attendance));

  check('SEM erro de JS (aluno novo)', jsErrors1.length === 0, jsErrors1.slice(0, 3).join(' | '));
  await ctx1.close();

  // ── 2) aluno JÁ EXISTENTE (criado ONTEM), voltando hoje sem fazer nada — dia de HOJE não é o
  // dia de entrada dele, então continua "idle" normalmente (a correção não vira uma presença
  // grátis todo dia, só no dia em que ele realmente entrou pela primeira vez) ──
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterdayKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  kvStore.set('student:matutino:AlunoAntigo', JSON.stringify({
    name: 'AlunoAntigo', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: '' }],
    phase: 'coding', lastSeen: Date.now() - 86400000, nyxPoints: 0, score: null,
    createdAt: y.getTime(), attendance: { [yesterdayKey]: 'present' },
  }));

  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page2 = await ctx2.newPage();
  const jsErrors2 = await mockRoutes(page2, kvStore);

  await page2.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(700);
  await page2.click('text=Aluno');
  await page2.waitForTimeout(500);
  await page2.click('text=☀️ Matutino');
  await page2.waitForTimeout(500);
  await page2.waitForSelector('text=AlunoAntigo', { timeout: 10000 });
  await page2.click('text=AlunoAntigo');
  await page2.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = page2.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await page2.waitForTimeout(300); }
    else break;
  }
  await page2.waitForTimeout(2000);

  const antigo = JSON.parse(kvStore.get('student:matutino:AlunoAntigo') || '{}');
  check('Aluno antigo (criado ontem) continua sem código de verdade hoje', !(antigo.code||'').trim() || antigo.code.trim().length < 10);
  check('Presença de HOJE fica "idle" pra quem já foi cadastrado antes e não fez nada hoje (não é dia de entrada)', (antigo.attendance || {})[today] === 'idle', JSON.stringify(antigo.attendance));
  check('Presença de ONTEM (dia real de entrada dele) continua "present"', (antigo.attendance || {})[yesterdayKey] === 'present');

  check('SEM erro de JS (aluno antigo)', jsErrors2.length === 0, jsErrors2.slice(0, 3).join(' | '));

  await ctx2.close();
  await browser.close();
  process.exit(summary('PRESENÇA: DIA DE ENTRADA CONTA COMO PRESENTE') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
