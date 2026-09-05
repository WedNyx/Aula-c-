const fs = require('node:fs');
const assert = require('node:assert/strict');

const app = fs.readFileSync('src/App.jsx', 'utf8');
const sidebar = fs.readFileSync('src/components/DashboardSidebar.jsx', 'utf8');

assert.ok(app.includes('DashboardMobileNav, DashboardSidebar'), 'painel deve importar as duas apresentações da navegação compartilhada');
assert.ok(app.includes('<DashboardMobileNav ariaLabel="Áreas do painel do professor" groups={teacherSidebarGroups} />'), 'navegação móvel deve consumir a mesma configuração da lateral');
assert.ok(!app.includes('<button style={styles.tab(tab==="monitor")}'), 'lista móvel duplicada não deve permanecer no painel');
assert.ok(sidebar.includes('groups.flatMap'), 'componente móvel deve derivar seus itens dos grupos');
assert.ok(sidebar.includes('item.mobileLabel || item.label'), 'rótulo móvel curto deve ser opcional sem alterar o desktop');
assert.ok(sidebar.includes('aria-current={item.active ? "page" : undefined}'), 'item ativo deve ser comunicado nas duas navegações');
assert.ok(sidebar.includes('dashboard-mobile-badge'), 'badges devem ser preservados no celular');

console.log('Desktop e celular compartilham uma única fonte de navegação do professor.');
