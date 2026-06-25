// Suporte a dois backends: Supabase (preferido) ou Upstash/Vercel KV (fallback)
// Detecta automaticamente qual está configurado pelas variáveis de ambiente.

// ─── Supabase ────────────────────────────────────────────────────────────────
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''
const TABLE = 'kv_store'

async function supaFetch(method, qs, body) {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}${qs ? '?' + qs : ''}`
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
  }
  const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!resp.ok && resp.status !== 204) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Supabase ${resp.status}: ${text || resp.statusText}`)
  }
  if (resp.status === 204 || method === 'DELETE') return null
  return resp.json()
}

// ─── Upstash / Vercel KV ─────────────────────────────────────────────────────
const REDIS_URL = (
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  ''
).replace(/\/$/, '')
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  ''

async function redis(...command) {
  const resp = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([command]),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    throw new Error(`Redis ${resp.status}: ${t}`)
  }
  const [res] = await resp.json()
  if (res.error) throw new Error(res.error)
  return res.result
}

// ─── Detecta qual backend usar ───────────────────────────────────────────────
const BACKEND =
  SUPABASE_URL && SUPABASE_KEY ? 'supabase' :
  REDIS_URL && REDIS_TOKEN     ? 'redis'    :
  null

// ─── Operações unificadas ────────────────────────────────────────────────────
const store = {
  async set(key, value) {
    if (BACKEND === 'supabase') await supaFetch('POST', null, { key, value })
    else await redis('SET', key, value)
  },
  async get(key) {
    if (BACKEND === 'supabase') {
      const rows = await supaFetch('GET', `key=eq.${encodeURIComponent(key)}&select=value`)
      return rows?.[0]?.value ?? null
    }
    return redis('GET', key)
  },
  async listWithValues(prefix) {
    if (BACKEND === 'supabase') {
      const rows = await supaFetch('GET', `key=like.${prefix}*&select=key,value`)
      return (rows || []).map(r => ({ key: r.key, value: r.value }))
    }
    const ks = await redis('KEYS', `${prefix}*`)
    if (!ks || ks.length === 0) return []
    const vals = await redis('MGET', ...ks)
    return ks.map((k, i) => ({ key: k, value: vals[i] }))
  },
  async delete(key) {
    if (BACKEND === 'supabase') await supaFetch('DELETE', `key=eq.${encodeURIComponent(key)}`)
    else await redis('DEL', key)
  },
  async deleteByPrefix(prefix) {
    if (BACKEND === 'supabase') await supaFetch('DELETE', `key=like.${prefix}*`)
    else {
      const ks = await redis('KEYS', `${prefix}*`)
      if (ks && ks.length > 0) await redis('DEL', ...ks)
    }
  },
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, key, value, prefix } = req.body || {}

  // Informa qual backend está ativo (sem fazer chamada ao banco)
  if (action === 'check') {
    return res.json({
      configured: !!BACKEND,
      backend: BACKEND,
      hasSupabase: !!(SUPABASE_URL && SUPABASE_KEY),
      hasRedis: !!(REDIS_URL && REDIS_TOKEN),
    })
  }

  if (!BACKEND) {
    return res.status(503).json({
      error: 'storage_not_configured',
      message:
        'Banco de dados não configurado. Adicione no Vercel (Settings → Environment Variables):\n' +
        '• Supabase: SUPABASE_URL + SUPABASE_SERVICE_KEY\n' +
        '• Vercel KV / Upstash: KV_REST_API_URL + KV_REST_API_TOKEN',
    })
  }

  try {
    switch (action) {
      case 'set':
        await store.set(key, value)
        return res.json({ ok: true })

      case 'get':
        return res.json({ value: await store.get(key) })

      case 'list_with_values':
        return res.json({ items: await store.listWithValues(prefix) })

      case 'delete':
        await store.delete(key)
        return res.json({ ok: true })

      case 'delete_by_prefix':
        await store.deleteByPrefix(prefix)
        return res.json({ ok: true })

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
