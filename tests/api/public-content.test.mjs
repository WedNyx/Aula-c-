import assert from 'node:assert/strict'
import { buildProviderRequest } from '../../api/public-content.js'

const weather = buildProviderRequest('weather', { lat: -23.55, lon: -46.63, days: 3 })
assert.equal(new URL(weather.url).hostname, 'api.open-meteo.com')
assert.match(weather.attribution, /Open-Meteo/)

const country = buildProviderRequest('country', { name: 'Brasil' })
assert.equal(new URL(country.url).hostname, 'restcountries.com')

const wiki = buildProviderRequest('wikipedia', { q: 'linguagem C sharp' })
assert.equal(new URL(wiki.url).hostname, 'pt.wikipedia.org')

const nasa = buildProviderRequest('nasa', { date: '2026-09-16' })
assert.equal(new URL(nasa.url).hostname, 'api.nasa.gov')
assert.equal(new URL(nasa.url).searchParams.get('date'), '2026-09-16')
assert.ok(new URL(nasa.url).searchParams.get('api_key'))

const library = buildProviderRequest('openlibrary', { q: 'programação C#', limit: 50 })
assert.equal(new URL(library.url).hostname, 'openlibrary.org')
assert.equal(new URL(library.url).searchParams.get('limit'), '8')

const pokemon = buildProviderRequest('pokemon', { id: 'pikachu' })
assert.equal(new URL(pokemon.url).hostname, 'pokeapi.co')

const trivia = buildProviderRequest('trivia', { amount: 99, difficulty: 'hard' })
assert.equal(new URL(trivia.url).searchParams.get('amount'), '5')
assert.equal(new URL(trivia.url).searchParams.get('difficulty'), 'hard')

const placeholder = buildProviderRequest('placeholder', { resource: 'segredos', id: 1 })
assert.equal(new URL(placeholder.url).pathname, '/posts/1')

const sun = buildProviderRequest('sun', { lat: -23.55, lon: -46.63 })
assert.equal(new URL(sun.url).hostname, 'api.sunrise-sunset.org')

assert.equal(new URL(buildProviderRequest('dog').url).hostname, 'dog.ceo')
const time = buildProviderRequest('time')
assert.equal(new URL(time.url).hostname, 'timeapi.io')
assert.equal(new URL(time.url).searchParams.get('timeZone'), 'America/Sao_Paulo')
assert.throws(() => buildProviderRequest('https://evil.example', {}), /não permitido/)
assert.throws(() => buildProviderRequest('weather', { lat: 'x', lon: 0 }), /lat deve estar/)
assert.throws(() => buildProviderRequest('pokemon', { id: '../admin' }), /inválido/)
assert.throws(() => buildProviderRequest('nasa', { date: '16/09/2026' }), /Data da NASA inválida/)
assert.throws(() => buildProviderRequest('openlibrary', { q: 'a' }), /pelo menos 2 caracteres/)

console.log('✅ APIs públicas usam somente provedores permitidos e parâmetros validados')
