// Avatar 2.5D (AvatarStudio3D, substituiu o antigo builder SVG "Big Smile"): renderização dos
// presets masculino/feminino, escolha de companheiro (pet), e compatibilidade com os 3 formatos
// de perfil salvos de migrações anteriores (Avatar.jsx cai pro SVG antigo quando render3d é nulo).
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

  // 1) tela de criação de perfil do aluno — checa se o AvatarStudio3D (presets 2.5D + pet) renderiza sem erro
  const ctx1 = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page1 = await ctx1.newPage();
  const jsErrors1 = await mockRoutes(page1, kvStore);

  await page1.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page1.waitForTimeout(700);
  await page1.click('text=Aluno');
  await page1.waitForTimeout(500);
  const nameInput = page1.locator('input[placeholder*="nome" i], input[placeholder*="Nome" i]').first();
  if (await nameInput.count()) await nameInput.fill('AlunoTesteNovo');
  await page1.click('button:has-text("Avançar")'); // passo 1 (nome/nascimento/CPF) → passo 2 (AvatarStudio3D)
  await page1.waitForTimeout(500);

  const avatarImg = page1.locator('.avatar-studio-stage img.avatar-3d-render');
  check('Avatar 2.5D (preset) renderizado na tela', (await avatarImg.count()) > 0);

  const masculinoThumbs = page1.locator('.avatar-preset-grid button');
  check('8 presets masculinos aparecem por padrão', await masculinoThumbs.count() === 8, `count=${await masculinoThumbs.count()}`);

  await page1.click('button[role="tab"]:has-text("Femininos")');
  await page1.waitForTimeout(200);
  const femininoThumbs = page1.locator('.avatar-preset-grid button');
  check('8 presets femininos aparecem na aba Femininos', await femininoThumbs.count() === 8, `count=${await femininoThumbs.count()}`);

  for (let i = 0; i < await femininoThumbs.count(); i++) { await femininoThumbs.nth(i).click(); await page1.waitForTimeout(50); }
  check('Sem erro de JS depois de clicar em todos os presets femininos', jsErrors1.length === 0, jsErrors1.slice(0, 3).join(' | '));
  check('Último preset clicado fica marcado como selecionado', (await page1.locator('.avatar-preset-grid button[aria-pressed="true"]').count()) > 0);

  // avança pra etapa de companheiro (pet) — ainda não cria o perfil
  await page1.click('button:has-text("Escolher meu companheiro")');
  await page1.waitForTimeout(300);
  check('Etapa de companheiro (pet) abriu', (await page1.locator('.avatar-pet-grid').count()) > 0);

  await page1.click('.avatar-pet-grid button:has-text("Dragão")');
  await page1.waitForTimeout(300);
  check('Companheiro escolhido aparece na prévia', (await page1.locator('.avatar-studio-pet, .avatar-studio-pet-emoji').count()) > 0);
  check('Campo de nome do pet aparece depois de escolher um companheiro', (await page1.locator('input[aria-label="Nome do pet"]').count()) > 0);

  check('Sem erro de JS depois de escolher avatar e companheiro', jsErrors1.length === 0, jsErrors1.slice(0, 3).join(' | '));

  await ctx1.close();

  // 2) painel do professor — alunos com avatar em formatos ANTIGOS (bem antigo / Adventurer / Notionists)
  const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page2 = await ctx2.newPage();
  const jsErrors2 = await mockRoutes(page2, kvStore);

  await loginTeacher(page2);
  await page2.click('text=Monitoramento');
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
  process.exit(summary('AVATAR 2.5D E COMPATIBILIDADE COM FORMATOS ANTIGOS') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });
