// Relatório de Comprovação de Aproveitamento de Aprendizado: reaproveita o modelo oficial
// (public/relatorio-modelo.docx) e gera um .docx de verdade com todos os alunos de Matutino e
// Vespertino (nome, CPF, nota, e 3 fotos por aluno: código/notas/prova). Turma de teste e sala de
// linguagens ficam de fora (mesmo recorte do /impacto).
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
  const presencas5 = { '2026-07-06':'present', '2026-07-08':'present', '2026-07-13':'present', '2026-07-15':'present', '2026-07-20':'present' };
  const presencas2 = { '2026-07-15':'present', '2026-07-20':'present' };
  // seedado de propósito FORA de ordem alfabética, pra confirmar que o relatório reordena
  // Zeca: nota boa (50) mas só 2 presenças — tem que dar Insatisfatório mesmo assim
  kvStore.set('student:matutino:ZecaUltimo', JSON.stringify({
    name: 'Zeca Ultimo', shift: 'matutino', avatar: {}, cpf: '999.999.999-99',
    files: [{ name: 'Program.cs', code: 'int z = 1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 50, attendance: presencas2,
  }));
  kvStore.set('student:matutino:AlunoBom', JSON.stringify({
    name: 'AlunoBom', shift: 'matutino', avatar: {}, cpf: '111.111.111-11',
    files: [{ name: 'Program.cs', code: 'Console.WriteLine("ola");' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 85, examScore: 70,
    scoreHistory: { '2026-07-20': 85 }, attendance: presencas5,
  }));
  // nota baixa MESMO com presença em dia — tem que dar Insatisfatório pela nota
  kvStore.set('student:matutino:AlunoFraco', JSON.stringify({
    name: 'AlunoFraco', shift: 'matutino', avatar: {}, cpf: '222.222.222-22',
    files: [{ name: 'Program.cs', code: 'int x = 1;' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 10,
    scoreHistory: { '2026-07-20': 10 }, attendance: presencas5,
  }));
  kvStore.set('student:vespertino:AlunoVesp', JSON.stringify({
    name: 'AlunoVesp', shift: 'vespertino', avatar: {}, cpf: '333.333.333-33',
    files: [{ name: 'Program.cs', code: 'Console.WriteLine("vesp");' }],
    phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 92,
    scoreHistory: { '2026-07-20': 92 }, attendance: presencas5,
  }));
  // turma de teste e sala de linguagens: NÃO podem entrar no relatório
  kvStore.set('student:teste:AlunoTeste', JSON.stringify({
    name: 'AlunoTesteNaoDeveAparecer', shift: 'teste', avatar: {}, cpf: '444.444.444-44',
    files: [{ name: 'Program.cs', code: 'x' }], phase: 'coding', lastSeen: Date.now(), score: 90,
  }));
  kvStore.set('student:linguagens:AlunoLingua', JSON.stringify({
    name: 'AlunoLinguagemNaoDeveAparecer', shift: 'linguagens', avatar: {}, cpf: '555.555.555-55',
    files: [{ name: 'index.html', code: 'x' }], phase: 'coding', lastSeen: Date.now(), score: 90,
  }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.click('text=🗓️ Calendário');
  await page.waitForTimeout(600);

  check('Botão "Gerar Relatório de Comprovação" aparece', (await page.locator('button:has-text("Gerar Relatório de Comprovação")').count()) > 0);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click('button:has-text("Gerar Relatório de Comprovação")'),
  ]);
  const savePath = path.join(require('os').tmpdir(), `relatorio-teste-${Date.now()}.docx`);
  await download.saveAs(savePath);
  check('Nome do arquivo baixado é um .docx', download.suggestedFilename().endsWith('.docx'));
  check('SEM erro de JS gerando o relatório', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  const bytes = fs.readFileSync(savePath);
  check('Arquivo baixado não está vazio', bytes.length > 100000, `${bytes.length} bytes`);

  const zip = await JSZip.loadAsync(bytes);
  const documentXml = await zip.file('word/document.xml').async('string');

  check('Cidade (SOBRADINHO) aparece no relatório', documentXml.includes('SOBRADINHO'));
  check('Nenhum placeholder sobrou sem preencher (__CIDADE1__, __TURMAS__ etc.)', !/__(CIDADE1|CIDADE2|MESANO|TURMAS|DATA_ASSINATURA)__/.test(documentXml));

  check('Aluno bom (matutino) aparece com nota Satisfatório', documentXml.includes('ALUNO: AlunoBom') && documentXml.includes('NOTA: Satisfatório'));
  check('Aluno fraco (matutino) aparece com nota Insatisfatório', documentXml.includes('ALUNO: AlunoFraco') && documentXml.includes('NOTA: Insatisfatório'));

  // Zeca: nota 50 (>= 30) mas só 2 presenças — a REGRA DE FREQUÊNCIA precisa derrubar pra
  // Insatisfatório mesmo com nota "boa" (menos de 4 presenças nunca é Satisfatório)
  {
    const iZeca = documentXml.indexOf('ALUNO: Zeca Ultimo');
    const trecho = documentXml.slice(iZeca, iZeca + 2000);
    check('Zeca (nota 50, só 2 presenças) sai Insatisfatório mesmo com nota acima de 30', trecho.includes('NOTA: Insatisfatório'), trecho.slice(0, 200));
  }
  check('Aluno do vespertino aparece', documentXml.includes('ALUNO: AlunoVesp'));
  check('CPF do aluno bom aparece', documentXml.includes('111.111.111-11'));
  check('"Turma Matutina" aparece', documentXml.includes('Turma Matutina'));
  check('"Turma Vespertina" aparece', documentXml.includes('Turma Vespertina'));
  check('Aluno da turma de TESTE NÃO aparece no relatório', !documentXml.includes('AlunoTesteNaoDeveAparecer'));
  check('Aluno da sala de LINGUAGENS NÃO aparece no relatório', !documentXml.includes('AlunoLinguagemNaoDeveAparecer'));

  // alunos do matutino foram seedados FORA de ordem (Zeca Ultimo, AlunoBom, AlunoFraco) — o
  // relatório precisa reordenar em ordem alfabética
  const posBom = documentXml.indexOf('ALUNO: AlunoBom');
  const posFraco = documentXml.indexOf('ALUNO: AlunoFraco');
  const posZeca = documentXml.indexOf('ALUNO: Zeca Ultimo');
  check('Alunos do matutino aparecem em ordem alfabética (AlunoBom → AlunoFraco → Zeca Ultimo)', posBom > -1 && posFraco > -1 && posZeca > -1 && posBom < posFraco && posFraco < posZeca, `AlunoBom@${posBom} AlunoFraco@${posFraco} Zeca@${posZeca}`);

  // 3 imagens por aluno de Matutino+Vespertino (4 alunos válidos) = 12 imagens embutidas
  const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('word/media/relatorioImg'));
  check('12 imagens embutidas no relatório (3 por aluno × 4 alunos válidos)', mediaFiles.length === 12, `encontrado: ${mediaFiles.length}`);

  // assinaturas e cabeçalho/rodapé originais continuam intactos
  check('Assinatura "Ana Carolina Santana de Meneses" continua intacta', documentXml.includes('Ana Carolina Santana de Meneses'));
  check('Assinatura "Renato da Costa Moutinho" continua intacta', documentXml.includes('Renato da Costa Moutinho'));
  check('Cabeçalho (header1.xml) continua no pacote', !!zip.file('word/header1.xml'));
  check('Rodapé (footer1.xml) continua no pacote', !!zip.file('word/footer1.xml'));

  fs.unlinkSync(savePath);
  await ctx.close();
  await browser.close();
  process.exit(summary('RELATÓRIO DE COMPROVAÇÃO DE APROVEITAMENTO') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
