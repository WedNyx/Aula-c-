const assert = require("node:assert/strict");
const fs = require("node:fs");

const games = fs.readFileSync("src/components/GameModals.jsx", "utf8");
const sanctuary = fs.readFileSync("src/components/LunarSanctuary.jsx", "utf8");

assert.match(games, /TYPING_LEVELS/, "corrida deve oferecer níveis de dificuldade");
assert.match(games, /Iniciante/, "corrida deve mostrar nível iniciante");
assert.match(games, /Intermediário/, "corrida deve mostrar nível intermediário");
assert.match(games, /Avançado/, "corrida deve mostrar nível avançado");
assert.match(games, /accuracy/, "corrida deve calcular precisão");
assert.match(games, /caracteres por minuto/, "corrida deve mostrar velocidade");
assert.match(games, /Outra corrida/, "corrida deve permitir repetir sem fechar");

assert.match(sanctuary, /Rodada \{round\}\/3/, "sequência deve ter três rodadas");
assert.match(sanctuary, /Vidas/, "sequência deve mostrar vidas");
assert.match(sanctuary, /Rodada \{level\}\/3/, "estrela intrusa deve progredir por três rodadas");
assert.match(sanctuary, /setMistakes/, "estrela intrusa deve contabilizar erros");
assert.match(sanctuary, /Jogadas \{moves\}/, "memória deve contabilizar jogadas");
assert.match(sanctuary, /Pares \{matched\.length\/2\}\/4/, "memória deve mostrar pares encontrados");
assert.match(sanctuary, /Embaralhar novamente/, "memória deve permitir reinício");
assert.match(sanctuary, /playSound\("correct"\)/, "jogos devem responder aos acertos");
assert.match(sanctuary, /playSound\("wrong"\)/, "jogos devem responder aos erros");

console.log("✅ Jogos existentes ganharam progressão, métricas, reinício e feedback");
