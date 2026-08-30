const assert = require("node:assert/strict");
const fs = require("node:fs");

const avatar = fs.readFileSync("src/components/Avatar.jsx", "utf8");
const theme = fs.readFileSync("src/theme.css", "utf8");
const pets = [
  "dragao", "unicornio", "trex", "aguia", "coruja", "lobo", "raposa", "gato",
  "cachorro", "coelho", "leao", "tartaruga", "abelha", "borboleta", "vagalume", "cogumelo",
];
const states = ["idle", "click", "complete", "special"];

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
console.log("✓ 16 pets possuem quatro animações de 12 quadros");
