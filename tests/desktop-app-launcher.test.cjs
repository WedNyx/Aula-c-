const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const launcher = read("src/components/DesktopAppLauncher.jsx");
const login = read("src/components/LoginScreen.jsx");

assert.match(launcher, /scheme: "roblox:\/\/"/, "atalho deve usar o protocolo instalado do Roblox");
assert.match(launcher, /scheme: "unityhub:\/\/"/, "atalho deve usar o protocolo instalado do Unity Hub");
assert.match(launcher, /window\.location\.assign\(app\.scheme\)/, "clique deve solicitar abertura ao navegador");
assert.match(launcher, /sem escolher jogo ou projeto/, "interface deve explicar que nenhum conteúdo específico será aberto");
assert.match(launcher, /role="status"/, "retorno da tentativa deve ser anunciado de forma acessível");
assert.match(login, /<DesktopAppLauncher \/>/, "atalhos devem aparecer antes da escolha do perfil");

console.log("✅ atalhos de Roblox e Unity Hub protegidos na tela de entrada");
