const assert=require('node:assert/strict');const fs=require('node:fs');
const app=fs.readFileSync('src/App.jsx','utf8');
assert.doesNotMatch(app,/import \{ ImpactPage, PortfolioPage \}/);assert.match(app,/ImpactPage=lazyNamed/);assert.match(app,/import\("\.\/components\/PublicPages\.jsx"\)/);assert.match(app,/<Suspense fallback=\{<PublicPageLoading\/>\}><ImpactPage/);assert.match(app,/<Suspense fallback=\{<PublicPageLoading\/>\}><PortfolioPage/);assert.match(app,/Carregando página…/);
console.log('Páginas públicas são carregadas somente nas próprias rotas.');
