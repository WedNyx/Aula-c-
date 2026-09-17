// NyxPrismaOrbital combina a cor do HUMOR (idle/pensando/certo/erro) com a cor da SKIN equipada —
// mas skinLunar ("Tem novidade para você!" — Santuário Lunar com algo não visto) e skinEclipse
// ("Recursos de IA em pausa") não são skins escolhidas pelo aluno na loja: são AVISOS temporários.
// Antes, o aviso sobrescrevia a cor do humor em QUALQUER estado, travando a cor do Nyx no tom do
// aviso pra sempre — mesmo analisando código, acertando ou errando, a cor nunca mudava. Agora o
// aviso só assume a cor quando o humor está "idle"; um humor ativo tem prioridade visual.
const { check, summary } = require('./helpers.cjs');
const fs = require('fs');
const src = fs.readFileSync('src/components/NyxPrismaOrbital.jsx', 'utf8');

check('isStatusOverlaySkin identifica skinLunar e skinEclipse como avisos, não skins de verdade',
  /isStatusOverlaySkin\s*=\s*selectedSkin\s*===\s*"skinLunar"\s*\|\|\s*selectedSkin\s*===\s*"skinEclipse"/.test(src));
check('skin de aviso só sobrescreve a cor quando o humor está "idle"',
  /isStatusOverlaySkin\s*&&\s*st\s*!==\s*"idle"\s*\)\s*\?\s*\{\}/.test(src));
check('skins de verdade (equipadas pelo aluno) continuam sempre com prioridade sobre o humor',
  /const skinOverride = \(isStatusOverlaySkin && st !== "idle"\) \? \{\} : \(SKINS\[selectedSkin\] \|\| \{\}\)/.test(src));

process.exit(summary('AVISO DE STATUS (SANTUÁRIO/IA EM PAUSA) NÃO TRAVA MAIS A COR DE HUMOR DO NYX') ? 0 : 1);
