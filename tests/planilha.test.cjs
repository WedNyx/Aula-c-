// Planilha (CSV/XLSX): coluna de nota da prova + "aluno destaque" geral (soma os dois turnos).
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore({ classDays: ['2026-07-20', '2026-07-24'] });
  // matutino: melhor aluno tira 82 no total (nota de atividade 82, sem prova)
  kvStore.set('student:matutino:AlunoM', JSON.stringify({ name: 'AlunoM', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'int x=1;' }], phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 82 }));
  // vespertino: melhor aluno tira 95 na PROVA (deve ser o destaque geral, maior que os 82 da manhã)
  kvStore.set('student:vespertino:AlunoV', JSON.stringify({ name: 'AlunoV', shift: 'vespertino', avatar: {}, files: [{ name: 'Program.cs', code: 'int y=2;' }], phase: 'coding', lastSeen: Date.now(), nyxPoints: 0, score: 70, examScore: 95 }));

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const jsErrors = await mockRoutes(page, kvStore);

  await loginTeacher(page);
  await page.click('text=👥 Monitoramento');
  await page.waitForTimeout(400);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Exportar planilha")'),
  ]);
  const savePath = path.join(os.tmpdir(), 'planilha_' + download.suggestedFilename());
  await download.saveAs(savePath);

  const unzipDir = path.join(os.tmpdir(), 'planilha_unzipped');
  execSync(`rm -rf "${unzipDir}" && mkdir -p "${unzipDir}" && unzip -o "${savePath}" -d "${unzipDir}"`);
  // esse xlsxBlob() usa strings inline no próprio sheet1.xml (sem sharedStrings.xml)
  const sheetXmlPath = fs.existsSync(`${unzipDir}/xl/sharedStrings.xml`)
    ? `${unzipDir}/xl/sharedStrings.xml`
    : `${unzipDir}/xl/worksheets/sheet1.xml`;
  const sheetXml = fs.readFileSync(sheetXmlPath, 'utf8');

  check('Planilha baixada com sucesso', fs.existsSync(savePath));
  check('Cabeçalho "NOTA DA PROVA" existe na planilha', sheetXml.includes('NOTA DA PROVA'));
  check('Valor da prova do AlunoV (95) aparece', sheetXml.includes('95'));
  const destaqueCount = (sheetXml.match(/Aluno destaque/g) || []).length;
  check('Só 1 "Aluno destaque" na planilha inteira (geral, não 1 por turno)', destaqueCount === 1, `encontrados: ${destaqueCount}`);
  check('O texto do destaque menciona "Manhã + Tarde" (geral)', sheetXml.includes('Manhã + Tarde'));

  check('SEM erro JS', jsErrors.length === 0, jsErrors.join(' | '));

  await ctx.close();
  await browser.close();
  process.exit(summary('PLANILHA: NOTA DA PROVA + DESTAQUE GERAL') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
