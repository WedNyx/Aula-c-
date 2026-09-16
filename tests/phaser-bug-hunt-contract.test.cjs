const assert = require("node:assert/strict");
const fs = require("node:fs");

const game = fs.readFileSync("src/components/BugHuntGame.jsx", "utf8");
const sanctuary = fs.readFileSync("src/components/LunarSanctuary.jsx", "utf8");
const engine = fs.readFileSync("src/lib/gameEngine.js", "utf8");

assert.match(game, /mountNyxGame/, "Caça aos Bugs deve usar o motor Phaser compartilhado");
assert.match(game, /phaserApi/, "jogo deve carregar Phaser sob demanda");
assert.match(game, /score >= 500/, "jogo deve ter objetivo de vitória claro");
assert.match(game, /this\.combo/, "jogo deve possuir sistema de combo");
assert.match(game, /this\.lives = 3/, "jogo deve possuir vidas");
assert.match(game, /this\.remaining = 30/, "jogo deve possuir cronômetro");
assert.match(game, /prefers-reduced-motion/, "jogo deve respeitar preferência de movimento reduzido");
assert.match(game, /Pausar/, "jogo deve permitir pausa");
assert.match(game, /Nova rodada/, "jogo deve permitir reinício");
assert.match(game, /playSound/, "jogo deve fornecer feedback sonoro");
assert.match(sanctuary, /BugHuntGame/, "Santuário deve abrir o novo jogo");
assert.match(sanctuary, /Caça aos Bugs/, "novo jogo deve aparecer na lista de desafios");
assert.match(engine, /parent\.__nyxGame = game/, "motor deve expor controle da instância apenas no elemento montado");
assert.match(engine, /delete parent\.__nyxGame/, "motor deve limpar referência ao desmontar");

console.log("✅ Caça aos Bugs usa Phaser com objetivo, combo, acessibilidade e ciclo completo");
