// A barra de status persistente (relógio/clima/bateria, sempre fixa no rodapé) tinha z-index:5000
// — muito acima de QUALQUER modal ou do tour guiado da plataforma (o maior outro z-index em uso é
// 2100, do Santuário Lunar). Sempre que um botão de um modal ou uma dica do tour caía na mesma
// região da tela (rodapé, centro), a barra de status ficava por CIMA e bloqueava o clique — sem
// nenhuma mensagem de erro, só travava ali, sem forma óbvia de continuar. Reproduzido de verdade
// com o tour guiado: um step aponta pro "⌨️ Tutorial de Teclado" no menu lateral, e o botão
// "Próximo →" da dica ficava embaixo da barra de status, inclicável.
const fs = require('fs');

const css = fs.readFileSync('src/theme.css', 'utf8');
const statusBarMatch = css.match(/\.platform-status-bar\{[^}]*z-index:\s*(\d+)/);
const zIndex = statusBarMatch ? Number(statusBarMatch[1]) : null;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
}

check('A barra de status tem um z-index bem menor que qualquer modal/tour (< 900)', zIndex != null && zIndex < 900, `z-index encontrado: ${zIndex}`);
check('A barra de status continua com z-index (ainda fica acima do conteúdo normal da página)', zIndex != null && zIndex > 0, `z-index encontrado: ${zIndex}`);

console.log(`\n=== BARRA DE STATUS NÃO BLOQUEIA MAIS MODAIS/TOUR: ${pass}/${pass + fail} passed ===`);
process.exit(fail ? 1 : 0);
