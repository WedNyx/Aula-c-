const assert=require('node:assert/strict');const fs=require('node:fs');
const app=fs.readFileSync('src/App.jsx','utf8'),lab=fs.readFileSync('src/components/CodeLab.jsx','utf8');
assert.doesNotMatch(app,/import \{ NyxShop, RetroOverlay \}/);assert.match(app,/NyxShop=lazyNamed/);assert.match(app,/<Suspense fallback=\{<ModalLoading\/>\}><RetroOverlay/);assert.match(lab,/const NyxShop=lazy/);assert.match(lab,/Carregando loja…/);
console.log('Loja do Nyx e retrospectiva são carregadas apenas quando abertas.');
