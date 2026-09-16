import { isValidTeacherPassword } from './_teacherAuth.js'
import { clientIp } from './_ip.js'
import { canStudentUseMusic, rateLimitCheck } from './kv.js'

const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY || ''
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''

function cleanText(value, max = 120) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
}
function durationLabel(ms) {
  const seconds = Math.max(0, Math.round(Number(ms || 0) / 1000))
  return seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : ''
}

async function searchPreviewCatalog(query, requestedProvider, reason = 'credentials_missing') {
  const params = new URLSearchParams({ term:query, media:'music', entity:'song', country:'BR', limit:'8', explicit:'No' })
  const response = await fetch(`https://itunes.apple.com/search?${params}`, { signal:AbortSignal.timeout(10000) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error('Não consegui carregar as prévias gratuitas agora.'), { status:502 })
  return (data.results || []).flatMap(track => {
    if (!track.previewUrl || !track.trackName) return []
    const externalId = String(track.trackId || crypto.randomUUID())
    return [{
      id:`preview:${externalId}`, provider:'preview', requestedProvider, externalId,
      title:cleanText(track.trackName), artist:cleanText(track.artistName, 80),
      album:cleanText(track.collectionName, 100), thumbnail:track.artworkUrl100 || '',
      duration:durationLabel(track.trackTimeMillis), previewUrl:track.previewUrl, url:track.previewUrl,
      externalUrl:track.trackViewUrl || '', catalog:'Prévia gratuita', fallbackReason:reason,
    }]
  })
}

async function searchYouTube(query) {
  if (!YOUTUBE_KEY) return searchPreviewCatalog(query, 'youtube')
  const params = new URLSearchParams({
    part:'snippet', type:'video', videoCategoryId:'10', maxResults:'8', safeSearch:'strict',
    regionCode:'BR', relevanceLanguage:'pt', q:query, key:YOUTUBE_KEY,
  })
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal:AbortSignal.timeout(10000) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) return searchPreviewCatalog(query, 'youtube', `youtube_${response.status}`)
  return (data.items || []).flatMap(item => {
    const id = item?.id?.videoId
    if (!id) return []
    return [{
      id:`youtube:${id}`, provider:'youtube', externalId:id,
      title:cleanText(item?.snippet?.title), artist:cleanText(item?.snippet?.channelTitle, 80),
      thumbnail:item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || '',
      url:`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
      externalUrl:`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`, catalog:'YouTube',
    }]
  })
}

async function spotifyToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return ''
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method:'POST', headers:{ Authorization:`Basic ${credentials}`, 'Content-Type':'application/x-www-form-urlencoded' },
    body:'grant_type=client_credentials', signal:AbortSignal.timeout(8000),
  })
  const data = await response.json().catch(() => ({}))
  return response.ok && data.access_token ? data.access_token : ''
}

async function searchSpotify(query) {
  const token = await spotifyToken()
  if (!token) return searchPreviewCatalog(query, 'spotify')
  const params = new URLSearchParams({ q:query, type:'track', market:'BR', limit:'8' })
  const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers:{ Authorization:`Bearer ${token}` }, signal:AbortSignal.timeout(10000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) return searchPreviewCatalog(query, 'spotify', `spotify_${response.status}`)
  return (data?.tracks?.items || []).filter(track => !track.explicit).map(track => ({
    id:`spotify:${track.id}`, provider:'spotify', externalId:track.id,
    title:cleanText(track.name), artist:cleanText((track.artists || []).map(artist => artist.name).join(', '), 80),
    album:cleanText(track.album?.name, 100), thumbnail:track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
    duration:durationLabel(track.duration_ms), previewUrl:track.preview_url || '',
    url:track.external_urls?.spotify || `https://open.spotify.com/track/${encodeURIComponent(track.id)}`,
    externalUrl:track.external_urls?.spotify || `https://open.spotify.com/track/${encodeURIComponent(track.id)}`, catalog:'Spotify',
  }))
}

export default async function handler(req, res) {
  if (req.method === 'GET') return res.json({
    youtube:!!YOUTUBE_KEY, spotify:!!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET),
    fallback:true, previewCatalog:'iTunes Search API',
  })
  if (req.method !== 'POST') return res.status(405).json({ error:'method_not_allowed' })
  const teacher = isValidTeacherPassword(req.body?.auth)
  const student = teacher ? false : await canStudentUseMusic(req.body?.turmaId, req.body?.studentName)
  if (!teacher && !student) return res.status(403).json({ error:'forbidden', message:'A pesquisa musical não está liberada para este perfil.' })
  const ip = clientIp(req)
  if (!(await rateLimitCheck(`ratelimit:music-search:${ip}`, teacher ? 30 : 15, 60))) return res.status(429).json({ error:'rate_limited', message:'Muitas pesquisas seguidas. Aguarde um minuto.' })
  const provider = req.body?.provider === 'spotify' ? 'spotify' : 'youtube'
  const query = cleanText(req.body?.query, 100)
  if (query.length < 2) return res.status(400).json({ error:'invalid_query', message:'Digite pelo menos dois caracteres.' })
  try {
    const tracks = provider === 'spotify' ? await searchSpotify(query) : await searchYouTube(query)
    return res.json({ provider, query, tracks, official:tracks.some(track => track.provider === provider) })
  } catch (error) {
    return res.status(error.status || 500).json({ error:'provider_error', message:String(error.message || error) })
  }
}
