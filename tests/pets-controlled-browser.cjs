// Revisão isolada dos componentes reais; não acessa contas nem dados de alunos.
const assert = require('node:assert/strict');
const { launchBrowser } = require('./helpers.cjs');
(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { port: 4186, strictPort: true } });
  let browser;
  try {
    await server.listen();
    browser = await launchBrowser({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [], sprites = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', req => { if (req.url().includes('/pets/sprites/')) sprites.push(req.url()); });
    const html = await server.transformIndexHtml('/__pets-qa', `<!doctype html><div id="root"></div><script type="module">
      import React from '/node_modules/.vite/deps/react.js';
      import {createRoot} from '/node_modules/.vite/deps/react-dom_client.js';
      import {Avatar,PetCompanion,PET_FILES} from '/src/components/Avatar.jsx';
      import '/src/theme.css'; import '/src/redesign.css';
      const h=React.createElement, root=createRoot(document.getElementById('root'));
      window.renderPets=(context='idle')=>root.render(h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20,padding:24,background:'#100a20'}},
        Object.entries(PET_FILES).map(([pet,id])=>h('section',{key:id,'data-pet':id,style:{position:'relative',height:190,background:'#211633',color:'white',padding:12}},
          h('div',null,id),h(Avatar,{cfg:{render3d:'feminino-02',pet:''},size:88}),h(PetCompanion,{pet,context})))));
      window.renderPets();
    </script>`);
    await page.route('**/__pets-qa', route => route.fulfill({ contentType:'text/html', body:html }));
    await page.goto('http://localhost:4186/__pets-qa');
    await page.waitForSelector('.pet-controlled');
    assert.equal(await page.locator('.pet-controlled').count(),16);
    await page.waitForFunction(() => [...document.querySelectorAll('.pet-controlled img')].every(i=>i.complete && i.naturalWidth>0));
    for (const card of await page.locator('[data-pet]').all()) {
      const name = await card.getAttribute('data-pet');
      const button = card.locator('.pet-companion-button');
      await button.focus(); await page.keyboard.press('Enter');
      await card.locator('.pet-action-click').waitFor();
      assert.equal(await button.evaluate(el=>el===document.activeElement),true,`${name}: foco preservado`);
      await button.dblclick({force:true});
      await card.locator('.pet-action-special').waitFor({timeout:1500});
    }
    await page.evaluate(()=>window.renderPets('complete'));
    await page.waitForFunction(()=>document.querySelectorAll('.pet-action-complete').length===16);
    await page.waitForTimeout(2900);
    await page.waitForFunction(()=>document.querySelectorAll('.pet-action-idle').length===16);
    await page.evaluate(()=>window.renderPets('idle'));
    await page.waitForTimeout(50);
    await page.evaluate(()=>window.renderPets('complete'));
    await page.waitForFunction(()=>document.querySelectorAll('.pet-action-complete').length===16);
    await page.waitForTimeout(2900);
    await page.waitForFunction(()=>document.querySelectorAll('.pet-action-idle').length===16);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.pet-controlled').evaluateAll(els=>els.flatMap(el=>el.getAnimations({subtree:true})).length),0);
    if(process.env.PET_QA_SCREENSHOT) await page.screenshot({path:process.env.PET_QA_SCREENSHOT,fullPage:true});
    assert.deepEqual(errors,[]); assert.deepEqual(sprites,[]);
    console.log('✓ 16 pets: imagens, teclado, foco, duplo clique, conclusão, retorno, movimento reduzido e zero sheets');
  } finally { if(browser) await browser.close(); await server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
