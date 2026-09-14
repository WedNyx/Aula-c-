const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const main = read("src/main.jsx");
const bar = read("src/components/PlatformStatusBar.jsx");
const css = read("src/theme.css");
const api = read("api/public-content.js");

assert.match(main, /<PlatformStatusBar \/>/, "barra deve ser global para aluno e professor");
assert.match(bar, /publicApis\.weather/, "barra deve consultar clima de Brasília");
assert.match(bar, /publicApis\.time/, "barra deve sincronizar horário por API");
assert.match(bar, /navigator\.getBattery/, "barra deve consultar a bateria quando o navegador permitir");
assert.match(bar, /America\/Sao_Paulo/, "horário deve usar fuso de Brasília");
assert.match(bar, /não disponível/, "bateria deve ter fallback explícito");
assert.match(css, /position:fixed/, "barra deve permanecer visível");
assert.match(api, /timeapi\.io/, "gateway deve manter a API de hora na lista segura");

console.log("✅ Barra global: bateria, clima e horário de Brasília");
