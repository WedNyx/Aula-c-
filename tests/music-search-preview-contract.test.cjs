const fs=require("node:fs");
const assert=require("node:assert");

const api=fs.readFileSync("api/music-search.js","utf8");
const settings=fs.readFileSync("src/components/ClassMusicSettings.jsx","utf8");
const player=fs.readFileSync("src/components/ClassMusicPlayer.jsx","utf8");
const client=fs.readFileSync("src/lib/musicSearch.js","utf8");

assert.match(api,/itunes\.apple\.com\/search/,"deve existir catálogo gratuito de prévias");
assert.match(api,/previewUrl/,"resultados devem carregar URL de prévia");
assert.match(api,/thumbnail/,"resultados devem carregar capa");
assert.match(api,/catalog:'YouTube'/,"YouTube oficial deve ser identificado");
assert.match(api,/catalog:'Spotify'/,"Spotify oficial deve ser identificado");
assert.match(settings,/Resultados para/,"a interface deve repetir o termo pesquisado");
assert.match(settings,/Escutar prévia/,"cada resultado deve permitir conferência antes de adicionar");
assert.match(settings,/track\.thumbnail/,"a interface deve mostrar a capa");
assert.match(settings,/providerStatus/,"a interface deve explicar se o provedor é oficial ou fallback");
assert.match(player,/musicEmbed\(track\)/,"players oficiais devem continuar disponíveis");
assert.match(client,/musicSearchStatus/,"cliente deve consultar disponibilidade dos provedores");

console.log("✅ Pesquisa musical exibe resultados ricos e prévias reproduzíveis");
