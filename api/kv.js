import { kv } from '@vercel/kv'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, key, value, prefix } = req.body

  try {
    switch (action) {
      case 'set':
        await kv.set(key, value)
        return res.json({ ok: true })

      case 'get': {
        const val = await kv.get(key)
        return res.json({ value: val })
      }

      case 'list_with_values': {
        const ks = await kv.keys(`${prefix}*`)
        if (!ks || ks.length === 0) return res.json({ items: [] })
        const vals = await kv.mget(...ks)
        return res.json({ items: ks.map((k, i) => ({ key: k, value: vals[i] })) })
      }

      case 'delete':
        await kv.del(key)
        return res.json({ ok: true })

      case 'delete_by_prefix': {
        const ks = await kv.keys(`${prefix}*`)
        if (ks && ks.length > 0) await kv.del(...ks)
        return res.json({ ok: true })
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
