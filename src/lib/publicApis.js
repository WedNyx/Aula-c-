const endpoint = '/api/public-content'

async function request(provider, params = {}, options = {}) {
  const query = new URLSearchParams({ provider })
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  const response = await fetch(`${endpoint}?${query}`, { signal: options.signal })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || `Falha na API (${response.status})`)
  return payload
}

export const publicApis = {
  weather: (lat, lon, days = 3, options) => request('weather', { lat, lon, days }, options),
  country: (name, options) => request('country', { name }, options),
  wikipedia: (q, options) => request('wikipedia', { q }, options),
  pokemon: (id, options) => request('pokemon', { id }, options),
  trivia: (params = {}, options) => request('trivia', params, options),
  placeholder: (resource = 'posts', id, options) => request('placeholder', { resource, id }, options),
  sun: (lat, lon, options) => request('sun', { lat, lon }, options),
  randomDog: options => request('dog', {}, options),
}

export { request as requestPublicApi }
