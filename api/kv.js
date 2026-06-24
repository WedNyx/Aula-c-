// Acessa o Redis via REST — funciona com Vercel KV (KV_REST_API_URL/KV_REST_API_TOKEN)
// ou Upstash direto (UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN)
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
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command]),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => String(resp.status))
    throw new Error(`Redis ${resp.status}: ${text}`)
  }
  const [res] = await resp.json()
  if (res.error) throw new Error(res.error)
  return res.result
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, key, value, prefix } = req.body || {}

  // Retorna apenas se as variáveis de ambiente estão presentes (sem fazer chamada ao Redis)
  if (action === 'check') {
    return res.json({
      hasUrl: !!REDIS_URL,
      hasToken: !!REDIS_TOKEN,
      configured: !!(REDIS_URL && REDIS_TOKEN),
    })
  }

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(503).json({
      error: 'storage_not_configured',
      message:
        'Armazenamento não configurado. Adicione KV_REST_API_URL e KV_REST_API_TOKEN ' +
        'nas variáveis de ambiente do Vercel (crie um banco de dados KV em vercel.com/dashboard → Storage).',
    })
  }

  try {
    switch (action) {
      case 'set':
        await redis('SET', key, value)
        return res.json({ ok: true })

      case 'get': {
        const val = await redis('GET', key)
        return res.json({ value: val })
      }

      case 'list_with_values': {
        const ks = await redis('KEYS', `${prefix}*`)
        if (!ks || ks.length === 0) return res.json({ items: [] })
        const vals = await redis('MGET', ...ks)
        return res.json({ items: ks.map((k, i) => ({ key: k, value: vals[i] })) })
      }

      case 'delete':
        await redis('DEL', key)
        return res.json({ ok: true })

      case 'delete_by_prefix': {
        const ks = await redis('KEYS', `${prefix}*`)
        if (ks && ks.length > 0) await redis('DEL', ...ks)
        return res.json({ ok: true })
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
