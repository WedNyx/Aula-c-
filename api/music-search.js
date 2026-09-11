import { isValidTeacherPassword } from './_teacherAuth.js'
import { clientIp } from './_ip.js'
import { rateLimitCheck } from './kv.js'

const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY || ''
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''

function cleanText(value, max = 120) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
}

async function searchYouTube(query) {
  if (!YOUTUBE_KEY) throw Object.assign(new Error('Falta YOUTUBE_API_KEY na Vercel.'), { status:503 })
  const params = new URLSearchParams({
    part:'snippet', type:'video', videoCategoryId:'10', maxResults:'8', safeSearch:'strict',
    regionCode:'BR', relevanceLanguage:'pt', q:query, key:YOUTUBE_KEY,
  })
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal:AbortSignal.timeout(10000) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(data?.error?.message || `YouTube API error ${response.status}`), { status:response.status })
  return (data.items || []).flatMap(item => {
    const id = item?.id?.videoId
    if (!id) return []
    return [{
      id:`youtube:${id}`, provider:'youtube', externalId:id,
      title:cleanText(item?.snippet?.title), artist:cleanText(item?.snippet?.channelTitle, 80),
      url:`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
    }]
  })
}

async function spotifyToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) throw Object.assign(new Error('Faltam SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET na Vercel.'), { status:503 })
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method:'POST', headers:{ Authorization:`Basic ${credentials}`, 'Content-Type':'application/x-www-form-urlencoded' },
    body:'grant_type=client_credentials', signal:AbortSignal.timeout(8000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.access_token) throw Object.assign(new Error(data?.error_description || 'Não consegui autenticar no Spotify.'), { status:response.status || 502 })
  return data.access_token
}

async function searchSpotify(query) {
  const token = await spotifyToken()
  const params = new URLSearchParams({ q:query, type:'track', market:'BR', limit:'8' })
  const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers:{ Authorization:`Bearer ${token}` }, signal:AbortSignal.timeout(10000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(data?.error?.message || `Spotify API error ${response.status}`), { status:response.status })
  return (data?.tracks?.items || []).filter(track => !track.explicit).map(track => ({
    id:`spotify:${track.id}`, provider:'spotify', externalId:track.id,
    title:cleanText(track.name), artist:cleanText((track.artists || []).map(artist => artist.name).join(', '), 80),
    url:track.external_urls?.spotify || `https://open.spotify.com/track/${encodeURIComponent(track.id)}`,
  }))
}

export default async function handler(req, res) {
  if (req.method === 'GET') return res.json({ youtube:!!YOUTUBE_KEY, spotify:!!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET) })
  if (req.method !== 'POST') return res.status(405).json({ error:'method_not_allowed' })
  if (!isValidTeacherPassword(req.body?.auth)) return res.status(403).json({ error:'forbidden', message:'Pesquisa musical disponível somente no painel do professor.' })
  const ip = clientIp(req)
  if (!(await rateLimitCheck(`ratelimit:music-search:${ip}`, 30, 60))) return res.status(429).json({ error:'rate_limited', message:'Muitas pesquisas seguidas. Aguarde um minuto.' })
  const provider = req.body?.provider === 'spotify' ? 'spotify' : 'youtube'
  const query = cleanText(req.body?.query, 100)
  if (query.length < 2) return res.status(400).json({ error:'invalid_query', message:'Digite pelo menos dois caracteres.' })
  try {
    const tracks = provider === 'spotify' ? await searchSpotify(query) : await searchYouTube(query)
    return res.json({ provider, tracks })
  } catch (error) {
    return res.status(error.status || 500).json({ error:'provider_error', message:String(error.message || error) })
  }
}
