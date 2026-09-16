import { clientIp } from './_ip.js'
import { rateLimitCheck } from './kv.js'

const PROVIDERS = new Set(['weather', 'country', 'wikipedia', 'pokemon', 'trivia', 'placeholder', 'sun', 'dog', 'time', 'nasa', 'openlibrary'])
const PLACEHOLDER_RESOURCES = new Set(['posts', 'comments', 'albums', 'photos', 'todos', 'users'])

function first(value) {
  return Array.isArray(value) ? value[0] : value
}

function text(value, max = 100) {
  return String(first(value) || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
}

function number(value, min, max, fallback) {
  const parsed = Number(first(value))
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

function requiredNumber(value, min, max, name) {
  const parsed = Number(first(value))
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw Object.assign(new Error(`${name} deve estar entre ${min} e ${max}.`), { status: 400 })
  }
  return parsed
}

export function buildProviderRequest(provider, query = {}) {
  if (!PROVIDERS.has(provider)) {
    throw Object.assign(new Error('Provedor não permitido.'), { status: 400 })
  }

  if (provider === 'weather') {
    const latitude = requiredNumber(query.lat, -90, 90, 'lat')
    const longitude = requiredNumber(query.lon, -180, 180, 'lon')
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,apparent_temperature,weather_code,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
      timezone: 'auto',
      forecast_days: String(Math.round(number(query.days, 1, 7, 3))),
    })
    return { url: `https://api.open-meteo.com/v1/forecast?${params}`, attribution: 'Open-Meteo (CC BY 4.0)' }
  }

  if (provider === 'country') {
    const name = text(query.name, 60)
    if (name.length < 2) throw Object.assign(new Error('Informe um país com pelo menos 2 caracteres.'), { status: 400 })
    return {
      url: `https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fields=name,capital,region,subregion,languages,currencies,flags,population,cca2`,
      attribution: 'REST Countries',
    }
  }

  if (provider === 'wikipedia') {
    const search = text(query.q, 100)
    if (search.length < 2) throw Object.assign(new Error('Informe uma pesquisa com pelo menos 2 caracteres.'), { status: 400 })
    const params = new URLSearchParams({
      action: 'query', generator: 'search', gsrsearch: search, gsrlimit: '6',
      prop: 'extracts|pageimages|info', exintro: '1', explaintext: '1',
      exchars: '500', piprop: 'thumbnail', pithumbsize: '240',
      inprop: 'url', redirects: '1', format: 'json', origin: '*',
    })
    return { url: `https://pt.wikipedia.org/w/api.php?${params}`, attribution: 'Wikipédia / Wikimedia' }
  }

  if (provider === 'nasa') {
    const date = text(query.date, 10)
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw Object.assign(new Error('Data da NASA inválida. Use AAAA-MM-DD.'), { status: 400 })
    }
    const params = new URLSearchParams({ api_key: process.env.NASA_API_KEY || 'DEMO_KEY', thumbs: 'true' })
    if (date) params.set('date', date)
    return { url: `https://api.nasa.gov/planetary/apod?${params}`, attribution: 'NASA Astronomy Picture of the Day' }
  }

  if (provider === 'openlibrary') {
    const search = text(query.q, 100)
    if (search.length < 2) throw Object.assign(new Error('Informe um livro ou autor com pelo menos 2 caracteres.'), { status: 400 })
    const params = new URLSearchParams({
      q: search,
      limit: String(Math.round(number(query.limit, 1, 12, 8))),
      fields: 'key,title,author_name,first_publish_year,cover_i,edition_count',
    })
    return { url: `https://openlibrary.org/search.json?${params}`, attribution: 'Open Library' }
  }

  if (provider === 'pokemon') {
    const id = text(query.id, 40).toLowerCase()
    if (!/^[a-z0-9-]{1,40}$/.test(id)) throw Object.assign(new Error('Pokémon inválido.'), { status: 400 })
    return { url: `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(id)}`, attribution: 'PokéAPI' }
  }

  if (provider === 'trivia') {
    const params = new URLSearchParams({
      amount: String(Math.round(number(query.amount, 1, 10, 5))),
      type: text(query.type, 12) === 'boolean' ? 'boolean' : 'multiple',
      encode: 'url3986',
    })
    const difficulty = text(query.difficulty, 10)
    if (['easy', 'medium', 'hard'].includes(difficulty)) params.set('difficulty', difficulty)
    const category = Math.round(number(query.category, 9, 32, 0))
    if (category) params.set('category', String(category))
    return { url: `https://opentdb.com/api.php?${params}`, attribution: 'Open Trivia DB (CC BY-SA 4.0)' }
  }

  if (provider === 'placeholder') {
    const resource = PLACEHOLDER_RESOURCES.has(text(query.resource, 20)) ? text(query.resource, 20) : 'posts'
    const id = Math.round(number(query.id, 1, 5000, 0))
    return {
      url: `https://jsonplaceholder.typicode.com/${resource}${id ? `/${id}` : '?_limit=20'}`,
      attribution: 'JSONPlaceholder',
    }
  }

  if (provider === 'time') {
    return { url: 'https://timeapi.io/api/Time/current/zone?timeZone=America%2FSao_Paulo', attribution: 'TimeAPI.io' }
  }

  if (provider === 'sun') {
    const lat = requiredNumber(query.lat, -90, 90, 'lat')
    const lng = requiredNumber(query.lon, -180, 180, 'lon')
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), formatted: '0' })
    return { url: `https://api.sunrise-sunset.org/json?${params}`, attribution: 'Sunrise-Sunset.org' }
  }

  return { url: 'https://dog.ceo/api/breeds/image/random', attribution: 'Dog CEO API' }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'AulaCSharp/1.0 educational-platform' },
    signal: AbortSignal.timeout(8000),
  })
  const length = Number(response.headers.get('content-length') || 0)
  if (length > 1_000_000) throw Object.assign(new Error('Resposta externa grande demais.'), { status: 502 })
  const body = await response.text()
  if (body.length > 1_000_000) throw Object.assign(new Error('Resposta externa grande demais.'), { status: 502 })
  let data
  try { data = JSON.parse(body) } catch { throw Object.assign(new Error('O serviço externo não retornou JSON válido.'), { status: 502 }) }
  if (!response.ok) throw Object.assign(new Error(`Serviço externo respondeu ${response.status}.`), { status: response.status === 404 ? 404 : 502 })
  return data
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const provider = text(req.query?.provider, 20)
  if (!(await rateLimitCheck(`ratelimit:public-content:${clientIp(req)}`, 60, 60))) {
    return res.status(429).json({ error: 'rate_limited', message: 'Muitas consultas seguidas. Aguarde um minuto.' })
  }

  try {
    const request = buildProviderRequest(provider, req.query)
    const data = await fetchJson(request.url)
    // Horário nunca pode compartilhar o cache de clima/conteúdo: uma resposta
    // guardada faria o relógio nascer vários minutos atrasado.
    res.setHeader('Cache-Control', provider === 'time'
      ? 'private, no-store, max-age=0'
      : provider === 'nasa'
        ? 'public, s-maxage=3600, stale-while-revalidate=86400'
        : 'public, s-maxage=300, stale-while-revalidate=900')
    return res.json({ provider, attribution: request.attribution, data })
  } catch (error) {
    const status = Number(error?.status) || (error?.name === 'TimeoutError' ? 504 : 500)
    return res.status(status).json({
      error: status < 500 ? 'invalid_request' : 'provider_error',
      message: String(error?.message || 'Falha ao consultar o serviço externo.'),
    })
  }
}
