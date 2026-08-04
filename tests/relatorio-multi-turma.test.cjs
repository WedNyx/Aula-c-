// O relatório de Comprovação virou um loop sobre TODAS as turmas ativas (não mais hardcoded pra
// matutino+vespertino). Este teste cria uma 3ª turma (vespertino-2, mesmo turno da vespertino
// original) e confirma que os TRÊS blocos aparecem no .docx gerado, cada um com o aluno certo.
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  kvStore.set('turmas:list', JSON.stringify([
    { id: 'matutino', label: 'Matutino', emoji: '☀️', period: 'matutino', color: '#f59e0b', createdAt: 0, archived: false },
    { id: 'vespertino', label: 'Vespertino', emoji: '🌙', period: 'vespertino', color: '#c084fc', createdAt: 0, archived: false },
    { id: 'vespertino-2', label: 'Vespertino Turma 2', emoji: '🌙', period: 'vespertino', color: '#22d3ee', createdAt: 1, archived: false },
  ]));
  const presencas5 = { '2026-07-06':'present', '2026-07-08':'present', '2026-07-13':'present', '2026-07-15':'present', '2026-07-20':'present' };
  kvStore.set('student:matutino:AlunoM', JSON.stringify({
    name: 'AlunoM', shift: 'matutino', avatar: {}, cpf: '111.111.111-11',
    files: [{ name: 'Program.cs', code: 'x' }], phase: 'coding', lastSeen: Date.now(), score: 80, attendance: presencas5,
  }));
  kvStore.set('student:vespertino:AlunoV1', JSON.stringify({
    name: 'AlunoV1', shift: 'vespertino', avatar: {}, cpf: '222.222.222-22',
    files: [{ name: 'Program.cs', code: 'x' }], phase: 'coding', lastSeen: Date.now(), score: 80, attendance: presencas5,
  }));
  kvStore.set('student:vespertino-2:AlunoV2', JSON.stringify({
    name: 'AlunoV2', shift: 'vespertino-2', avatar: {}, cpf: '333.333.333-33',
    files: [{ name: 'Program.cs', code: 'x' }], phase: 'coding', lastSeen: Date.now(), score: 80, attendance: presencas5,
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
  const savePath = path.join(require('os').tmpdir(), `relatorio-multi-turma-${Date.now()}.docx`);
  await download.saveAs(savePath);
  check('SEM erro de JS gerando o relatório com 3 turmas', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  const zip = await JSZip.loadAsync(fs.readFileSync(savePath));
  const documentXml = await zip.file('word/document.xml').async('string');

  check('Nenhum placeholder sobrou sem preencher', !/__(CIDADE1|CIDADE2|MESANO|TURMAS|DATA_ASSINATURA)__/.test(documentXml));
  check('"Turma Matutina" (turma de fábrica) aparece', documentXml.includes('Turma Matutina'));
  check('"Turma Vespertina" (turma de fábrica original) aparece', documentXml.includes('Turma Vespertina'));
  check('"Turma Vespertino Turma 2" (a turma NOVA) também aparece — antes era hardcoded só nas 2 originais', documentXml.includes('Turma Vespertino Turma 2'));
  check('Aluno da turma matutino aparece', documentXml.includes('ALUNO: AlunoM'));
  check('Aluno da turma vespertino (original) aparece', documentXml.includes('ALUNO: AlunoV1'));
  check('Aluno da turma vespertino-2 (nova) aparece', documentXml.includes('ALUNO: AlunoV2'));
  // cada aluno tem 3 imagens (código/desempenho/prova) — 3 alunos válidos × 3 = 9
  const imgCount = (documentXml.match(/<pic:pic /g) || []).length;
  check('9 imagens embutidas (3 por aluno × 3 alunos, um por turma)', imgCount === 9, `imgCount=${imgCount}`);

  await ctx.close();
  await browser.close();
  process.exit(summary('RELATÓRIO DE COMPROVAÇÃO: 3 TURMAS (NÃO SÓ MATUTINO/VESPERTINO)') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
