// Usa @supabase/supabase-js como backend principal.
// Fallback: Upstash/Vercel KV se Supabase não estiver configurado.
// A tabela kv_store é criada automaticamente via DATABASE_PASSWORD ou DATABASE_URL.

import { createClient } from '@supabase/supabase-js'

const TABLE = 'kv_store'

// ─── Supabase ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null

// ─── Postgres (para criar a tabela automaticamente) ──────────────────────────
// Aceita DATABASE_URL direto, ou deriva a partir de SUPABASE_URL + DATABASE_PASSWORD
function getPgUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const pass = process.env.DATABASE_PASSWORD || ''
  const ref = SUPABASE_URL.match(/([a-z0-9]+)\.supabase\.co/)?.[1]
  if (ref && pass) return `postgresql://postgres:${encodeURIComponent(pass)}@db.${ref}.supabase.co:5432/postgres`
  return ''
}

let tableReady = false

async function ensureTable() {
  if (tableReady) return
  const pgUrl = getPgUrl()
  if (!pgUrl) return
  try {
    const pgPkg = await import('pg')
    const Client = pgPkg.default?.Client || pgPkg.Client
    const client = new Client({ connectionString: pgUrl, ssl: { rejectUnauthorized: false } })
    await client.connect()
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${TABLE} (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW())`
    )
    tableReady = true
    await client.end().catch(() => {})
  } catch { /* tabela já existe ou pg não disponível */ }
}

// ─── pg direto (quando não há Supabase mas há DATABASE_URL) ──────────────────
async function withPg(fn) {
  const pgUrl = getPgUrl()
  const pgPkg = await import('pg')
  const Client = pgPkg.default?.Client || pgPkg.Client
  const client = new Client({ connectionString: pgUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    if (!tableReady) {
      await client.query(`CREATE TABLE IF NOT EXISTS ${TABLE} (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW())`)
      tableReady = true
    }
    return await fn(client)
  } finally {
    await client.end().catch(() => {})
  }
}

// ─── Upstash / Vercel KV ─────────────────────────────────────────────────────
const REDIS_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '')
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''

async function redis(...cmd) {
  const r = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([cmd]),
  })
  if (!r.ok) throw new Error(`Redis ${r.status}: ${await r.text().catch(() => '')}`)
  const [res] = await r.json()
  if (res.error) throw new Error(res.error)
  return res.result
}

// ─── Detecta qual backend usar ───────────────────────────────────────────────
const BACKEND =
  supabase                    ? 'supabase' :
  getPgUrl()                  ? 'pg'       :
  (REDIS_URL && REDIS_TOKEN)  ? 'redis'    :
  null

// ─── Operações unificadas ────────────────────────────────────────────────────
const store = {
  async set(key, value) {
    if (BACKEND === 'supabase') {
      await ensureTable()
      const { error } = await supabase.from(TABLE).upsert({ key, value, updated_at: new Date().toISOString() })
      if (error) throw new Error(error.message)
    } else if (BACKEND === 'pg') {
      await withPg(c => c.query(
        `INSERT INTO ${TABLE}(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(key) DO UPDATE SET value=$2,updated_at=NOW()`,
        [key, value]
      ))
    } else {
      await redis('SET', key, value)
    }
  },

  async get(key) {
    if (BACKEND === 'supabase') {
      await ensureTable()
      const { data, error } = await supabase.from(TABLE).select('value').eq('key', key).maybeSingle()
      if (error) throw new Error(error.message)
      return data?.value ?? null
    }
    if (BACKEND === 'pg') {
      const r = await withPg(c => c.query(`SELECT value FROM ${TABLE} WHERE key=$1`, [key]))
      return r.rows[0]?.value ?? null
    }
    return redis('GET', key)
  },

  async listWithValues(prefix) {
    if (BACKEND === 'supabase') {
      await ensureTable()
      const { data, error } = await supabase.from(TABLE).select('key, value').like('key', `${prefix}%`)
      if (error) throw new Error(error.message)
      return (data || []).map(r => ({ key: r.key, value: r.value }))
    }
    if (BACKEND === 'pg') {
      const r = await withPg(c => c.query(`SELECT key,value FROM ${TABLE} WHERE key LIKE $1`, [`${prefix}%`]))
      return r.rows.map(row => ({ key: row.key, value: row.value }))
    }
    const ks = await redis('KEYS', `${prefix}*`)
    if (!ks?.length) return []
    const vals = await redis('MGET', ...ks)
    return ks.map((k, i) => ({ key: k, value: vals[i] }))
  },

  async delete(key) {
    if (BACKEND === 'supabase') {
      await ensureTable()
      const { error } = await supabase.from(TABLE).delete().eq('key', key)
      if (error) throw new Error(error.message)
    } else if (BACKEND === 'pg') {
      await withPg(c => c.query(`DELETE FROM ${TABLE} WHERE key=$1`, [key]))
    } else {
      await redis('DEL', key)
    }
  },

  async deleteByPrefix(prefix) {
    if (BACKEND === 'supabase') {
      await ensureTable()
      const { error } = await supabase.from(TABLE).delete().like('key', `${prefix}%`)
      if (error) throw new Error(error.message)
    } else if (BACKEND === 'pg') {
      await withPg(c => c.query(`DELETE FROM ${TABLE} WHERE key LIKE $1`, [`${prefix}%`]))
    } else {
      const ks = await redis('KEYS', `${prefix}*`)
      if (ks?.length) await redis('DEL', ...ks)
    }
  },
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, key, value, prefix } = req.body || {}

  if (action === 'check') {
    return res.json({
      configured: !!BACKEND,
      backend: BACKEND,
      hasSupabase: !!supabase,
      hasPg: !!getPgUrl(),
      hasRedis: !!(REDIS_URL && REDIS_TOKEN),
    })
  }

  if (!BACKEND) {
    return res.status(503).json({
      error: 'storage_not_configured',
      message:
        'Banco não configurado. Adicione no Vercel (Settings → Environment Variables):\n' +
        '• Supabase: SUPABASE_URL + SUPABASE_SERVICE_KEY + DATABASE_PASSWORD\n' +
        '• Vercel KV / Upstash: KV_REST_API_URL + KV_REST_API_TOKEN',
    })
  }

  try {
    switch (action) {
      case 'set':              await store.set(key, value);           return res.json({ ok: true })
      case 'get':              return res.json({ value: await store.get(key) })
      case 'list_with_values': return res.json({ items: await store.listWithValues(prefix) })
      case 'delete':           await store.delete(key);               return res.json({ ok: true })
      case 'delete_by_prefix': await store.deleteByPrefix(prefix);    return res.json({ ok: true })
      default: return res.status(400).json({ error: `Unknown action: ${action}` })
    }
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
