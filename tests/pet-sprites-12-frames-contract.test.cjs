const assert = require("node:assert/strict");
const fs = require("node:fs");

const avatar = fs.readFileSync("src/components/Avatar.jsx", "utf8");
const theme = fs.readFileSync("src/theme.css", "utf8");
const pets = [
];
const states = ["idle", "click", "complete", "special"];

assert.match(avatar, /file === "dragao"/, "dragão deve usar animação controlada");
assert.match(avatar, /pet-controlled-dragon/, "dragão deve preservar uma única arte estável");
assert.ok(fs.existsSync("public/pets/dragao.webp"), "arte estável do dragão deve existir");
assert.match(avatar, /file === "unicornio"/, "unicórnio deve usar animação controlada");
assert.match(avatar, /pet-controlled-unicorn/, "unicórnio deve preservar uma única arte estável");
assert.ok(fs.existsSync("public/pets/unicornio.webp"), "arte estável do unicórnio deve existir");
assert.match(avatar, /file === "trex"/, "T-Rex deve usar animação controlada");
assert.match(avatar, /pet-controlled-trex/, "T-Rex deve preservar uma única arte estável");
assert.ok(fs.existsSync("public/pets/trex.webp"), "arte estável do T-Rex deve existir");
assert.match(avatar, /file === "aguia"/, "águia deve usar animação controlada");
assert.match(avatar, /pet-controlled-aguia/, "águia deve preservar uma única arte estável");
assert.ok(fs.existsSync("public/pets/aguia.webp"), "arte estável da águia deve existir");
assert.match(avatar, /file === "coruja"/, "coruja deve usar animação controlada");
assert.match(avatar, /pet-controlled-coruja/, "coruja deve preservar uma única arte estável");
assert.ok(fs.existsSync("public/pets/coruja.webp"), "arte estável da coruja deve existir");
assert.match(avatar, /file === "lobo"/, "lobo deve usar animação controlada");
assert.match(avatar, /pet-controlled-lobo/, "lobo deve preservar uma única arte estável");
assert.ok(fs.existsSync("public/pets/lobo.webp"), "arte estável do lobo deve existir");
assert.match(avatar, /file === "raposa"/, "raposa deve usar animação controlada");
assert.match(avatar, /pet-controlled-raposa/, "raposa deve preservar uma única arte estável");
assert.ok(fs.existsSync("public/pets/raposa.webp"), "arte estável da raposa deve existir");
assert.match(avatar, /file === "gato"/, "gato deve usar animação controlada");
assert.match(avatar, /pet-controlled-gato/, "gato deve preservar uma única arte estável");
assert.ok(fs.existsSync("public/pets/gato.webp"), "arte estável do gato deve existir");
assert.match(avatar, /file === "cachorro"/, "cachorro deve usar animação controlada");
assert.match(avatar, /pet-controlled-cachorro/, "cachorro deve preservar uma única arte estável");
assert.ok(fs.existsSync("public/pets/cachorro.webp"), "arte estável do cachorro deve existir");

for (const pet of pets) {
  assert.match(avatar, new RegExp(`:\\"${pet}\\"`), `${pet} deve usar sprites`);
  for (const state of states) {
    const file = `public/pets/sprites/${pet}-${state}.webp`;
    assert.ok(fs.existsSync(file), `${file} deve existir`);
    assert.ok(fs.statSync(file).size > 0, `${file} não pode estar vazio`);
  }
}

assert.match(theme, /background-size:1200% 100%/, "a folha deve conter 12 quadros");
assert.match(theme, /steps\(11,end\)/, "o avanço deve percorrer os 12 quadros sem interpolação");
assert.match(avatar, /file === "coelho"/);
assert.match(avatar, /src="\/pets\/coelho.webp"/);
assert.ok(fs.statSync("public/pets/coelho.webp").size > 0);
const spriteMap = avatar.match(/const PET_SPRITES = \{([\s\S]*?)\};/)[1];
assert.ok(!spriteMap.includes('"coelho"'), "coelho não deve carregar sprites antigas");
for (const state of states) {
  assert.ok(theme.includes(`.pet-coelho.pet-action-${state} .pet-controlled-coelho`));
}
assert.match(theme, /prefers-reduced-motion: reduce\)\{\.pet-controlled-coelho\{animation:none!important;transform:none!important;opacity:1!important/);
assert.match(avatar, /file === "leao"/);
assert.match(avatar, /src="\/pets\/leao.webp"/);
assert.ok(fs.statSync("public/pets/leao.webp").size > 0);
assert.ok(!spriteMap.includes('"leao"'), "leão não deve carregar sprites antigas");
for (const state of states) {
  assert.ok(theme.includes(`.pet-leao.pet-action-${state} .pet-controlled-leao`));
}
assert.match(theme, /prefers-reduced-motion: reduce\)\{\.pet-controlled-leao,\.leao-guard-aura\{animation:none!important;transform:none!important/);
assert.match(avatar, /file === "tartaruga"/);
assert.match(avatar, /src="\/pets\/tartaruga.webp"/);
assert.ok(fs.statSync("public/pets/tartaruga.webp").size > 0);
assert.ok(!spriteMap.includes('"tartaruga"'), "tartaruga não deve carregar sprites antigas");
for (const state of states) {
  assert.ok(theme.includes(`.pet-tartaruga.pet-action-${state} .pet-controlled-tartaruga`));
}
assert.match(theme, /prefers-reduced-motion: reduce\)\{\.pet-controlled-tartaruga,\.tartaruga-sleep\{animation:none!important;transform:none!important/);
assert.match(avatar, /file === "abelha"/);
assert.match(avatar, /src="\/pets\/abelha.webp"/);
assert.ok(fs.statSync("public/pets/abelha.webp").size > 0);
assert.ok(!spriteMap.includes('"abelha"'));
const fileMap = avatar.match(/export const PET_FILES = \{([\s\S]*?)\};/)[1];
assert.ok(fileMap.includes('"🐝":"abelha"'), "abelha deve continuar acessível pelo emoji");
for (const state of states) {
  assert.ok(theme.includes(`.pet-abelha.pet-action-${state} .pet-controlled-abelha`));
}
assert.match(theme, /prefers-reduced-motion: reduce\)\{\.pet-controlled-abelha,\.abelha-heart\{animation:none!important;transform:none!important/);
assert.match(avatar, /file === "borboleta"/);
assert.match(avatar, /src="\/pets\/borboleta.webp"/);
assert.ok(fs.statSync("public/pets/borboleta.webp").size > 0);
assert.ok(!spriteMap.includes('"borboleta"'));
assert.ok(fileMap.includes('"🦋":"borboleta"'));
for (const state of states) {
  assert.ok(theme.includes(`.pet-borboleta.pet-action-${state} .pet-controlled-borboleta`));
}
assert.match(theme, /prefers-reduced-motion: reduce\)\{\.pet-controlled-borboleta,\.borboleta-trail\{animation:none!important;transform:none!important;filter:none!important/);
assert.match(avatar, /file === "vagalume"/);
assert.match(avatar, /src="\/pets\/vagalume.webp"/);
assert.ok(fs.statSync("public/pets/vagalume.webp").size > 0);
assert.ok(!spriteMap.includes('"vagalume"'));
assert.ok(fileMap.includes('"✨":"vagalume"'));
for (const state of states) {
  assert.ok(theme.includes(`.pet-vagalume.pet-action-${state} .pet-controlled-vagalume`));
}
assert.match(theme, /prefers-reduced-motion: reduce\)\{\.pet-controlled-vagalume,\.vagalume-halo,\.vagalume-lights\{animation:none!important;transform:none!important;filter:none!important/);
assert.equal(spriteMap.trim(), '', 'nenhum pet deve carregar sprites antigas');
assert.match(avatar, /file === "cogumelo"/);
assert.match(avatar, /src="\/pets\/cogumelo.webp"/);
assert.ok(fs.statSync('public/pets/cogumelo.webp').size > 0);
assert.ok(fileMap.includes('"🍄":"cogumelo"'));
for (const state of states) {
  assert.ok(theme.includes(`.pet-cogumelo.pet-action-${state} .pet-controlled-cogumelo`));
}
assert.match(theme, /prefers-reduced-motion: reduce\)\{\.pet-controlled-cogumelo,\.cogumelo-particles\{animation:none!important;transform:none!important/);
assert.match(theme, /\.pet-controlled-cogumelo\{opacity:1!important/);
console.log('✓ 16 pets controlados; nenhum pet usa sprites antigas');
