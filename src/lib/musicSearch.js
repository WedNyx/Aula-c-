export async function searchMusic(provider, query, auth) {
  const response = await fetch('/api/music-search', {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body:JSON.stringify({ provider, query, auth }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Não foi possível pesquisar agora.')
  return Array.isArray(data.tracks) ? data.tracks : []
}

export function musicEmbed(track) {
  const provider = track?.provider
  const id = String(track?.externalId || '')
  if (provider === 'youtube' && /^[\w-]{6,20}$/.test(id)) return { provider, src:`https://www.youtube-nocookie.com/embed/${id}?rel=0`, title:`YouTube: ${track.title}` }
  if (provider === 'spotify' && /^[A-Za-z0-9]{10,40}$/.test(id)) return { provider, src:`https://open.spotify.com/embed/track/${id}?utm_source=generator`, title:`Spotify: ${track.title}` }
  return null
}
