// Quando o professor clica em "Enviar código da turma" pra um aluno que JÁ tem código escrito, o
// sistema não pode simplesmente substituir tudo — precisa analisar o que o aluno já tem, corrigir
// o que faltava (comparando com o código do professor) e completar, sem apagar o esforço dele
// (App.jsx: doSendClassCode + o handler dentro de tick() que chama askClaudeJson pra mesclar).
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });

  // código que o PROFESSOR passou pra turma copiar (mais completo que o do aluno)
  const professorCode = `using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Hello World");

        string nome = "João";
        int idade = 24;
        string cidade = "Santa Maria";
        float peso = 72.4f;
        double altura = 1.75;

        Console.WriteLine("Olá, me chamo " + nome +
        ", tenho " + idade +
        " anos, moro em " + cidade +
        ", peso " + peso + " kg e tenho " + altura + "m de altura");
    }
}`;
  kvStore.set('teachercode:matutino', JSON.stringify({ files: [{ name: 'Program.cs', code: professorCode }], at: Date.now() }));

  // código que o ALUNO já tinha escrito sozinho (incompleto — sem a variável "altura")
  const alunoCode = `using System;

class Program
{
    static void Main(string[]args)
    {
        Console.WriteLine("Hello World");

        string nome = "João";
        int idade = 24;
        string cidade = "Santa Maria";
        float peso = 72.4f;

        Console.WriteLine("Olá, me chamo "+ nome +
        ", tenho "+ idade +
        " anos, moro em "+ cidade +
        " e tenho "+ peso +" kg");
    }
}`;
  kvStore.set('student:matutino:AlunoCodigo', JSON.stringify({
    name: 'AlunoCodigo', shift: 'matutino', avatar: {},
    files: [{ name: 'Program.cs', code: alunoCode }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 0,
  }));

  const browser = await launchBrowser();

  // sessão do professor
  const ctxT = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const pageT = await ctxT.newPage();
  const jsErrorsT = await mockRoutes(pageT, kvStore);

  // sessão do aluno, já dentro da sala de código
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageS = await ctxS.newPage();
  const jsErrorsS = await mockRoutes(pageS, kvStore);
  await pageS.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await pageS.waitForTimeout(700);
  await pageS.click('text=Aluno');
  await pageS.waitForTimeout(500);
  await pageS.click('text=☀️ Matutino');
  await pageS.waitForTimeout(500);
  await pageS.waitForSelector('text=AlunoCodigo', { timeout: 10000 });
  await pageS.click('text=AlunoCodigo');
  await pageS.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    const skipCheckin = pageS.locator('button:has-text("Pular hoje")');
    if (await skipCheckin.count()) { await skipCheckin.click(); await pageS.waitForTimeout(300); }
    else break;
  }
  await pageS.waitForSelector('textarea', { timeout: 10000 });
  const before = await pageS.locator('textarea').inputValue();
  check('Aluno abriu a sala já com o código próprio dele (não vazio)', before.includes('e tenho "+ peso +" kg'));

  // professor: seleciona o aluno e envia o código da turma
  await loginTeacher(pageT);
  await pageT.click('text=👥 Monitoramento');
  await pageT.waitForTimeout(500);
  const monitorCard = pageT.locator('h3:has-text("Monitoramento")').locator('xpath=..');
  await monitorCard.hover();
  await pageT.waitForTimeout(700);
  await pageT.click('text=AlunoCodigo');
  await pageT.waitForTimeout(500);
  check('Botão "Enviar código da turma" aparece no painel do aluno selecionado', (await pageT.locator('button:has-text("Enviar código da turma")').count()) > 0);
  await pageT.click('button:has-text("Enviar código da turma")');
  await pageT.waitForTimeout(500);
  check('Professor recebe confirmação de envio', (await pageT.locator('text=/Código da turma enviado/').count()) > 0);

  // espera o tick() do aluno (a cada 12s) detectar o codesend e mesclar via IA
  await pageS.waitForSelector('text=/completei o que faltava|apliquei o código dele direto/', { timeout: 20000 });
  const successMerge = (await pageS.locator('text=/completei o que faltava/').count()) > 0;
  check('Mesclagem por IA teve sucesso (não caiu no fallback de substituir tudo)', successMerge, successMerge ? '' : 'caiu no fallback — ver texto exibido');

  await pageS.waitForTimeout(500);
  const after = await pageS.locator('textarea').inputValue();
  check('Código do ALUNO (linha que só ele tinha escrito) continua no editor — nada foi apagado', after.includes('e tenho "+ peso +" kg'));
  check('Marcador da "IA" (o que foi completado) aparece no resultado final', after.includes('[MOCK] completado pelo Nyx'));

  const savedStudent = JSON.parse(kvStore.get('student:matutino:AlunoCodigo'));
  const savedCode = (savedStudent.files || []).map(f => f.code).join('\n');
  check('O que foi salvo no banco bate com o que apareceu na tela (persistiu certinho)', savedCode.includes('e tenho "+ peso +" kg') && savedCode.includes('[MOCK] completado pelo Nyx'));
  check('O código enviado (codesend:) foi limpo depois de aplicado', !kvStore.has('codesend:matutino:AlunoCodigo'));

  check('SEM erro de JS (professor)', jsErrorsT.length === 0, jsErrorsT.slice(0, 3).join(' | '));
  check('SEM erro de JS (aluno)', jsErrorsS.length === 0, jsErrorsS.slice(0, 3).join(' | '));

  await ctxT.close();
  await ctxS.close();
  await browser.close();
  process.exit(summary('ENVIAR CÓDIGO DA TURMA: MESCLA EM VEZ DE SUBSTITUIR') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
