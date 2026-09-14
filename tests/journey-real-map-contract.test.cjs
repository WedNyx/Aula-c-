const fs=require("node:fs");
const assert=require("node:assert");

const app=fs.readFileSync("src/App.jsx","utf8");
const modal=fs.readFileSync("src/components/TeacherModals.jsx","utf8");
const map=fs.readFileSync("src/components/JourneyMap.jsx","utf8");
const regions=fs.readFileSync("src/lib/dfRegions.ts","utf8");
const css=fs.readFileSync("src/theme.css","utf8");

assert.doesNotMatch(app,/● ao vivo · \{lastUpdate\}/,"hora antiga não deve aparecer no topo do professor");
assert.match(modal,/<JourneyMap/,"Visão da Viagem deve montar o mapa real");
assert.doesNotMatch(modal,/Mapa esquemático/,"mapa esquemático deve ter sido removido");
assert.match(map,/tile\.openstreetmap\.org/,"mapa deve usar mosaicos do OpenStreetMap");
assert.match(map,/openstreetmap\.org\/copyright/,"mapa deve atribuir OpenStreetMap");
assert.match(map,/mapped\.flatMap/,"cidades encerradas devem gerar marcadores");
assert.match(map,/currentRegion/,"localização atual deve aparecer no mapa");
assert.match(regions,/DF_REGION_GEO/,"regiões devem possuir coordenadas geográficas");
assert.match(css,/\.journey-map-marker\.current/,"localização atual deve ter estilo próprio");

console.log("✅ Cabeçalho sem hora duplicada e Visão da Viagem com mapa real");
