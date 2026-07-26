// Avatar Big Smile: renderização, todas as opções de personalização, posição do pet (sem
// sobrepor o rosto), e compatibilidade com os 3 formatos de perfil salvos de migrações anteriores.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

(async () => {
  const kvStore = baseKvStore();
  // aluno com avatar no formato BEM ANTIGO (pré-hairV)
  kvStore.set('student:matutino:AlunoAntigo', JSON.stringify({ name: 'AlunoAntigo', shift: 'matutino', avatar: { hairStyle: 'cacheado', eyewear: 'oculos_sol', extra: 'brinco' }, files: [{ name: 'Program.cs', code: 'int x=1;' }], phase: 'coding', lastSeen: Date.now(), nyxPoints: 0 }));
  // aluno com avatar no formato Adventurer (hairV="shortNN"/"longNN")
  kvStore.set('student:matutino:AlunoAdventurer', JSON.stringify({ name: 'AlunoAdventurer', shift: 'matutino', avatar: { bg: '#c084fc', hairV: 'short14', eyesV: 'variant07', mouthV: 'variant16', glassesV: 'variant04', pet: '🐱' }, files: [{ name: 'Program.cs', code: 'int y=2;' }], phase: 'coding', lastSeen: Date.now(), nyxPoints: 0 }));
  // aluno com avatar no formato Notionists (hairV="variantNN"/"hat")
  kvStore.set('student:matutino:AlunoNotionists', JSON.stringify({ name: 'AlunoNotionists', shift: 'matutino', avatar: { bg: '#34d399', hairV: 'variant59', eyesV: 'variant03', mouthV: 'variant19', glassesV: 'variant05', pet: '🐉' }, files: [{ name: 'Program.cs', code: 'int z=3;' }], phase: 'coding', lastSeen: Date.now(), nyxPoints: 0 }));

  const browser = await launchBrowser();

  // 1) tela de criação de perfil do aluno — checa se o AvatarBuilder (Big Smile) renderiza sem erro
  const ctx1 = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page1 = await ctx1.newPage();
  const jsErrors1 = await mockRoutes(page1, kvStore);

  await page1.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page1.waitForTimeout(700);
  await page1.click('text=Aluno');
  await page1.waitForTimeout(500);
  const nameInput = page1.locator('input[placeholder*="nome" i], input[placeholder*="Nome" i]').first();
  if (await nameInput.count()) await nameInput.fill('AlunoTesteNovo');
  await page1.waitForTimeout(500);

  const avatarImgs = page1.locator('img[src^="data:image/svg+xml"]');
  check('Avatar SVG (data URI) renderizado na tela', (await avatarImgs.count()) > 0);

  const surpresaBtn = page1.locator('button:has-text("Surpresa")');
  if (await surpresaBtn.count()) { for (let i = 0; i < 8; i++) { await surpresaBtn.click(); await page1.waitForTimeout(150); } }
  check('Sem erro de JS depois de várias sorteadas de avatar', jsErrors1.length === 0, jsErrors1.slice(0, 3).join(' | '));

  const hairThumbs = page1.locator('p:has-text("Estilo do cabelo")').locator('xpath=following-sibling::div[1]').locator('button');
  const hairCount = await hairThumbs.count();
  check('Lista de estilos de cabelo tem 13 itens', hairCount === 13, `count=${hairCount}`);
  for (let i = 0; i < hairCount; i++) { await hairThumbs.nth(i).click(); await page1.waitForTimeout(50); }
  check('Sem erro de JS depois de clicar em todos os estilos de cabelo', jsErrors1.length === 0, jsErrors1.slice(0, 3).join(' | '));

  const acessorioThumbs = page1.locator('p:has-text("Acessório")').locator('xpath=following-sibling::div[1]').locator('button');
  for (let i = 0; i < await acessorioThumbs.count(); i++) { await acessorioThumbs.nth(i).click(); await page1.waitForTimeout(50); }
  check('Sem erro de JS depois de testar todos os acessórios', jsErrors1.length === 0, jsErrors1.slice(0, 3).join(' | '));

  check('"Tom de pele" existe (cor voltou)', (await page1.locator('p:has-text("Tom de pele")').count()) > 0);
  check('"Cor do cabelo" existe (cor voltou)', (await page1.locator('p:has-text("Cor do cabelo")').count()) > 0);

  // pega uma roupa e um pet, testa o badge do pet não sobrepor feio o rosto (checa geometria via bounding box)
  const roupaThumbs = page1.locator('p:has-text("Roupa")').locator('xpath=following-sibling::div[1]').locator('button');
  if (await roupaThumbs.count() > 1) await roupaThumbs.nth(1).click();
  await page1.waitForTimeout(200);
  await page1.locator('button:has-text("Dragão")').click();
  await page1.waitForTimeout(300);

  const petBadge = page1.locator('img.avatar-pet[src*="/pets/dragao"]');
  check('Badge do pet (dragão) aparece', (await petBadge.count()) > 0);
  const previewBox = petBadge.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " avatar-pop ")]').first();
  const avatarCircleBox = await previewBox.locator('div').first().boundingBox();
  const petBox = await petBadge.boundingBox();
  if (avatarCircleBox && petBox) {
    const circleCenterX = avatarCircleBox.x + avatarCircleBox.width / 2;
    const circleCenterY = avatarCircleBox.y + avatarCircleBox.height / 2;
    const petCenterX = petBox.x + petBox.width / 2;
    const petCenterY = petBox.y + petBox.height / 2;
    const r = avatarCircleBox.width / 2;
    const dist = Math.hypot(petCenterX - circleCenterX, petCenterY - circleCenterY);
    check('Centro do badge do pet fica fora/na borda do círculo (não em cima da boca)', dist >= r * 0.75, `dist=${dist.toFixed(1)} raio=${r.toFixed(1)}`);
  } else {
    check('Consegui medir a posição do pet vs avatar', false, 'boundingBox nulo');
  }

  await ctx1.close();

  // 2) painel do professor — alunos com avatar em formatos ANTIGOS (bem antigo / Adventurer / Notionists)
  const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page2 = await ctx2.newPage();
  const jsErrors2 = await mockRoutes(page2, kvStore);

  await loginTeacher(page2);
  await page2.click('text=👥 Monitoramento');
  await page2.waitForTimeout(500);
  const monitorCard = page2.locator('h3:has-text("Monitoramento")').locator('xpath=..');
  await monitorCard.hover();
  await page2.waitForTimeout(900);
  check('Aluno formato BEM antigo aparece sem quebrar', (await page2.locator('text=AlunoAntigo').count()) > 0);
  check('Aluno formato Adventurer aparece sem quebrar', (await page2.locator('text=AlunoAdventurer').count()) > 0);
  check('Aluno formato Notionists aparece sem quebrar', (await page2.locator('text=AlunoNotionists').count()) > 0);
  check('Sem erro de JS ao renderizar avatares de 3 formatos antigos diferentes', jsErrors2.length === 0, jsErrors2.slice(0, 3).join(' | '));

  await ctx2.close();
  await browser.close();
  process.exit(summary('AVATAR BIG SMILE MIGRATION') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
