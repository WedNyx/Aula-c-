// O relatório .docx oficial ganhou uma linha "SITUAÇÃO DO CÓDIGO" por aluno, individual, baseada
// no errorHistory (Fase 2) + no resultado da última análise do Nyx — cobre os 4 casos possíveis.
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  const presencas = { '2026-07-20': 'present' };

  // 1) nunca teve erro registrado, já foi analisado (ok:true)
  kvStore.set('student:matutino:AlunoSemErro', JSON.stringify({
    name: 'AlunoSemErro', shift: 'matutino', avatar: {}, cpf: '111.111.111-11',
    files: [{ name: 'Program.cs', code: 'int x = 1;' }], phase: 'coding', lastSeen: Date.now(),
    score: 80, attendance: presencas, feedback: { ok: true, message: 'Certo!' }, hasError: false,
  }));
  // 2) errou 3 vezes ao longo de 2 dias, mas o código está certo AGORA (corrigiu)
  kvStore.set('student:matutino:AlunoCorrigiu', JSON.stringify({
    name: 'AlunoCorrigiu', shift: 'matutino', avatar: {}, cpf: '222.222.222-22',
    files: [{ name: 'Program.cs', code: 'int y = 2;' }], phase: 'coding', lastSeen: Date.now(),
    score: 75, attendance: presencas, feedback: { ok: true, message: 'Certo!' }, hasError: false,
    errorHistory: { '2026-07-19': 2, '2026-07-20': 1 },
  }));
  // 3) errou e a ÚLTIMA verificação ainda está com pendência
  kvStore.set('student:matutino:AlunoPendente', JSON.stringify({
    name: 'AlunoPendente', shift: 'matutino', avatar: {}, cpf: '333.333.333-33',
    files: [{ name: 'Program.cs', code: 'int z = ' }], phase: 'coding', lastSeen: Date.now(),
    score: 40, attendance: presencas, feedback: { ok: false, message: 'Falta ;' }, hasError: true,
    errorHistory: { '2026-07-20': 2 },
  }));
  // 4) nunca chegou a rodar a análise do Nyx
  kvStore.set('student:matutino:AlunoSemAnalise', JSON.stringify({
    name: 'AlunoSemAnalise', shift: 'matutino', avatar: {}, cpf: '444.444.444-44',
    files: [{ name: 'Program.cs', code: '' }], phase: 'coding', lastSeen: Date.now(),
    score: 0, attendance: presencas,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.click('text=🗓️ Calendário');
  await page.waitForTimeout(600);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click('button:has-text("Gerar Relatório de Comprovação")'),
  ]);
  const savePath = path.join(require('os').tmpdir(), `relatorio-codigo-status-${Date.now()}.docx`);
  await download.saveAs(savePath);
  check('SEM erro de JS gerando o relatório', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  const zip = await JSZip.loadAsync(fs.readFileSync(savePath));
  const documentXml = await zip.file('word/document.xml').async('string');

  const sliceAfter = (marker) => {
    const i = documentXml.indexOf(marker);
    return i === -1 ? '' : documentXml.slice(i, i + 4000);
  };

  const semErro = sliceAfter('ALUNO: AlunoSemErro');
  check('Sem erro nenhum: menciona que escreveu corretamente', semErro.includes('escreveu o código corretamente') && semErro.includes('sem nenhum erro'), semErro.slice(0, 300));

  const corrigiu = sliceAfter('ALUNO: AlunoCorrigiu');
  check('Corrigiu ao longo da turma: conta os 3 erros em 2 dias', corrigiu.includes('registrou 3 erro(s)') && corrigiu.includes('2 dia(s)'), corrigiu.slice(0, 300));
  check('Corrigiu ao longo da turma: termina dizendo que corrigiu (não fica em aberto)', corrigiu.includes('corrigindo e terminando com o código certo'), corrigiu.slice(0, 300));

  const pendente = sliceAfter('ALUNO: AlunoPendente');
  check('Ainda com pendência: avisa que a última verificação não passou', pendente.includes('ainda com pendência na última verificação'), pendente.slice(0, 300));

  const semAnalise = sliceAfter('ALUNO: AlunoSemAnalise');
  check('Nunca analisado: não inventa erro nem acerto', semAnalise.includes('sem análises de código registradas'), semAnalise.slice(0, 300));

  fs.unlinkSync(savePath);
  await ctx.close();
  await browser.close();
  process.exit(summary('RELATÓRIO: SITUAÇÃO DO CÓDIGO POR ALUNO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
