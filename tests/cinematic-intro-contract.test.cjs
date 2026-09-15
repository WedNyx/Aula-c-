const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const component = fs.readFileSync(path.join(root, "src/components/CinematicIntro.jsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src/components/CinematicIntro.css"), "utf8");
const login = fs.readFileSync(path.join(root, "src/components/LoginScreen.jsx"), "utf8");

assert.match(component, /INTRO_DURATION_MS = 4800/, "a abertura deve terminar automaticamente");
assert.match(component, /sessionStorage/, "a abertura deve tocar apenas uma vez por sessão");
assert.match(component, /prefers-reduced-motion: reduce/, "a preferência por menos movimento deve ser respeitada");
assert.match(component, />Pular</, "a abertura deve poder ser pulada");
assert.match(css, /position: fixed/, "a abertura deve ocupar a tela sem mudar o layout do login");
assert.match(css, /z-index: 100000/, "a abertura deve ficar acima do acesso somente enquanto estiver ativa");
assert.match(login, /<CinematicIntro \/>/, "a abertura deve aparecer antes do acesso existente");

console.log("✓ abertura cinematográfica integrada ao login");
