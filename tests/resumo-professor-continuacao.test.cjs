// Resumo do professor com VÁRIOS arquivos .cs: antes, cada clique em "Gerar resumo" resumia TODO
// o código do zero (arriscando um JSON de resposta cortado no meio com o limite de tokens padrão,
// e sempre resumindo o que já tinha sido resumido antes). Agora o Nyx guarda uma "foto" do código
// no momento da última geração e, na próxima vez, resume só o que é NOVO desde então — continuando
// de onde parou, sem repetir os conceitos já cobertos.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const now = new Date();
  const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const programCode = 'using System;\nclass Program { static void Main() { Console.WriteLine("oi"); } }';
  const pessoaCode = 'class Pessoa { public string Nome; }';

  // já nasce com MAIS DE UM arquivo .cs (Program.cs + Pessoa.cs) — o cenário que ficava incompleto
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('teachercode:matutino', JSON.stringify({ files: [{ name: 'Program.cs', code: programCode }, { name: 'Pessoa.cs', code: pessoaCode }], at: Date.now() }));

  const browser = await launchBrowser();
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);
  await loginTeacher(pageT);
  await pageT.click('text=👨‍💻 Meu código');
  await pageT.waitForTimeout(500);
  const ritmoCard = pageT.locator('[data-tour-prof="resumo-ritmo"]');

  // 1) primeira geração: sem resumo/foto anterior, cobre tudo do zero (schema normal, com "intro")
  await ritmoCard.locator('button:has-text("Gerar")').click();
  await pageT.waitForTimeout(1200);
  check('1ª geração: guardada no Caderno do professor', (await ritmoCard.locator('text=/guardado no seu Caderno/').count()) > 0);
  let hist = JSON.parse(kvStore.get('teacherresumo:matutino'));
  check('1ª geração: resumo tem o conceito "Variáveis" (resumo do zero)', hist[tk]?.secoes?.some(s => s.titulo === 'Variáveis'), JSON.stringify(hist[tk]));
  check('1ª geração: só 1 conceito ainda (nada de continuação na primeira vez)', hist[tk]?.secoes?.length === 1, JSON.stringify(hist[tk]));
  const snap1 = JSON.parse(kvStore.get('teacherresumosnapshot:matutino') || 'null');
  check('Foto do código foi salva depois da 1ª geração', snap1?.lastResumoDate === tk && Array.isArray(snap1.files) && snap1.files.length === 2, JSON.stringify(snap1));

  // 2) professor escreve MAIS código (em Pessoa.cs) e gera de novo, no MESMO dia — precisa ser uma
  // CONTINUAÇÃO (só o trecho novo) somada ao resumo de hoje que já existia, não um resumo do zero
  kvStore.set('teachercode:matutino', JSON.stringify({ files: [{ name: 'Program.cs', code: programCode }, { name: 'Pessoa.cs', code: pessoaCode + '\n    public int Idade;' }], at: Date.now() }));
  await ritmoCard.locator('button:has-text("Gerar")').click();
  await pageT.waitForTimeout(1200);
  hist = JSON.parse(kvStore.get('teacherresumo:matutino'));
  check('2ª geração: continua tendo o conceito antigo ("Variáveis")', hist[tk]?.secoes?.some(s => s.titulo === 'Variáveis'), JSON.stringify(hist[tk]));
  check('2ª geração: ganhou o conceito NOVO da continuação, sem resumir tudo de novo', hist[tk]?.secoes?.some(s => s.titulo === 'Conceito Novo Depois da Falta'), JSON.stringify(hist[tk]));
  check('2ª geração: exatamente 2 conceitos (somou, não duplicou nem substituiu)', hist[tk]?.secoes?.length === 2, JSON.stringify(hist[tk]));
  const snap2 = JSON.parse(kvStore.get('teacherresumosnapshot:matutino') || 'null');
  check('Foto do código foi atualizada com os arquivos mais recentes', snap2?.files?.find(f => f.name === 'Pessoa.cs')?.code?.includes('Idade'), JSON.stringify(snap2));

  // 3) gerar de novo SEM escrever nada novo: não deve chamar a IA pra repetir/duplicar, só avisa
  await ritmoCard.locator('button:has-text("Gerar")').click();
  await pageT.waitForTimeout(1200);
  check('3ª geração sem código novo: avisa que não há nada pra acrescentar', (await ritmoCard.locator('text=/Nenhum código novo/').count()) > 0);
  hist = JSON.parse(kvStore.get('teacherresumo:matutino'));
  check('3ª geração sem código novo: NÃO duplicou nem mudou os conceitos já salvos', hist[tk]?.secoes?.length === 2, JSON.stringify(hist[tk]));

  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));

  await ctxT.close();
  await browser.close();
  process.exit(summary('RESUMO DO PROFESSOR CONTINUA DE ONDE PAROU (VÁRIOS ARQUIVOS .cs, SEM REPETIR)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
