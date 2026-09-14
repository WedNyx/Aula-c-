import assert from 'node:assert/strict'
import { buildProviderRequest } from '../../api/public-content.js'

const weather = buildProviderRequest('weather', { lat: -23.55, lon: -46.63, days: 3 })
assert.equal(new URL(weather.url).hostname, 'api.open-meteo.com')
assert.match(weather.attribution, /Open-Meteo/)

const country = buildProviderRequest('country', { name: 'Brasil' })
assert.equal(new URL(country.url).hostname, 'restcountries.com')

const wiki = buildProviderRequest('wikipedia', { q: 'linguagem C sharp' })
assert.equal(new URL(wiki.url).hostname, 'pt.wikipedia.org')

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
assert.throws(() => buildProviderRequest('https://evil.example', {}), /não permitido/)
assert.throws(() => buildProviderRequest('weather', { lat: 'x', lon: 0 }), /lat deve estar/)
assert.throws(() => buildProviderRequest('pokemon', { id: '../admin' }), /inválido/)

console.log('✅ APIs públicas usam somente provedores permitidos e parâmetros validados')
