import { createClient } from '@supabase/supabase-js'
import { isValidTeacherPassword } from './_teacherAuth.js'

const TABLE = 'kv_store'

// ─── proteção das ações só-do-professor ────────────────────────────────────────
// a senha do professor controlava só se a TELA do painel abria — o banco de dados em
// si aceitava qualquer pedido. Agora, as ações que só o professor deveria poder fazer
// (apagar tudo, mexer nas configurações da turma) exigem a senha de verdade aqui no
// servidor, verificada no campo "auth" do pedido.
const SET_PROTECTED_PREFIXES = ['teachercode:', 'nyxlocks:', 'exam:config', 'codesend:', 'accessmode:', 'support:', 'boss:', 'tourney:', 'inspection:', 'kick:', 'scorefix:', 'teachermeta:', 'classroom_reset_flag', 'nudge:', 'hall:', 'kblaunch:', 'quiz:', 'backup:']
const DELETE_PROTECTED_PREFIXES = ['student:', 'teachercode:', 'nyxlocks:', 'exam:config', 'accessmode:', 'support:', 'boss:', 'tourney:', 'inspection:', 'kick:', 'teachermeta:', 'classroom_reset_flag', 'hall:', 'kblaunch:', 'quiz:', 'backup:']
// list_with_values (listagem em massa) é NEGADA por padrão — só esses prefixos continuam
// listáveis sem senha, porque são dados que o próprio app precisa ler sem professor logado
// (seletor de perfil na tela de login, /impacto, portfólio público, estado de duelo/parceiro
// que os alunos usam pra jogar). "student:" ainda passa pela redação de campo sensível
// (redactStudentValue) quando não autorizado — as outras três nunca guardam dado sensível.
const PUBLIC_LIST_PREFIXES = ['student:', 'duel:', 'teamduel:', 'partner:']

function needsTeacherAuth(action, key) {
  if (action === 'delete_by_prefix') return true // apaga em massa — sempre só-do-professor
  const k = String(key || '')
  if (action === 'set') return SET_PROTECTED_PREFIXES.some(p => k.startsWith(p))
  if (action === 'delete') return DELETE_PROTECTED_PREFIXES.some(p => k.startsWith(p))
  if (action === 'list_with_values') return !PUBLIC_LIST_PREFIXES.some(p => k.startsWith(p))
  return false
}

// ─── dado sensível de aluno (data de nascimento, CPF) some das LISTAGENS sem senha do professor ──
// antes disso, qualquer um que soubesse o formato da API dava list_with_values com prefix
// "student:" e baixava data de nascimento/CPF de toda a turma, sem senha nenhuma. A leitura
// pontual (action "get", 1 chave só) continua sem essa proteção DE PROPÓSITO: patchStudent() lê o
// registro inteiro, mistura com o patch e regrava tudo — se o "get" tivesse os campos sensíveis
// escondidos, cada patch (nota, fase, código...) apagaria a data de nascimento/CPF do aluno sem
// querer. list_with_values não tem esse problema (só listagens/relatórios usam ela).
const SENSITIVE_STUDENT_FIELDS = ['birthDate', 'cpf']
function redactStudentValue(key, value, authorized) {
  if (authorized || value == null || !String(key).startsWith('student:')) return value
  try {
    const obj = JSON.parse(value)
    let changed = false
    for (const f of SENSITIVE_STUDENT_FIELDS) {
      if (obj[f]) { delete obj[f]; changed = true }
    }
    return changed ? JSON.stringify(obj) : value
  } catch {
    return value
  }
}

// ─── Supabase JS Client ───────────────────────────────────────────────────────
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null

// ─── Postgres (cria a tabela automaticamente) ─────────────────────────────────
// Aceita DATABASE_URL diretamente, ou deriva de SUPABASE_URL + DATABASE_PASSWORD
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

  // Testa se a tabela já existe (pode ter sido criada antes ou via SQL Editor)
  const { error: testErr } = await supabase.from(TABLE).select('key').limit(1)
  if (!testErr) { tableReady = true; return }

  // Tabela não existe — tenta criá-la via pg
  const pgUrl = getPgUrl()
  if (!pgUrl) {
    throw new Error(
      'Tabela kv_store não existe no Supabase. ' +
      'Adicione DATABASE_PASSWORD no Vercel e clique "Inicializar banco" no painel do professor.'
    )
  }

  const pgPkg = await import('pg')
  const Client = pgPkg.default?.Client || pgPkg.Client
  const client = new Client({ connectionString: pgUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${TABLE} (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW())`
    )
    tableReady = true
  } finally {
    await client.end().catch(() => {})
  }
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
      await client.query(
        `CREATE TABLE IF NOT EXISTS ${TABLE} (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW())`
      )
      tableReady = true
    }
    return await fn(client)
  } finally {
    await client.end().catch(() => {})
  }
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
  supabase                   ? 'supabase' :
  getPgUrl()                 ? 'pg'       :
  (REDIS_URL && REDIS_TOKEN) ? 'redis'    :
  null

// ─── Operações unificadas ────────────────────────────────────────────────────
const store = {
  async set(key, value) {
    if (BACKEND === 'supabase') {
      await ensureTable()
      const { error } = await supabase
        .from(TABLE)
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) throw new Error(`Supabase set: ${error.message}`)
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
      if (error) throw new Error(`Supabase get: ${error.message}`)
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
      if (error) throw new Error(`Supabase list: ${error.message}`)
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
      if (error) throw new Error(`Supabase delete: ${error.message}`)
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
      if (error) throw new Error(`Supabase deleteByPrefix: ${error.message}`)
    } else if (BACKEND === 'pg') {
      await withPg(c => c.query(`DELETE FROM ${TABLE} WHERE key LIKE $1`, [`${prefix}%`]))
    } else {
      const ks = await redis('KEYS', `${prefix}*`)
      if (ks?.length) await redis('DEL', ...ks)
    }
  },
}

// ─── limite de uso (rate limit) — usado pelo api/claude.js pra não deixar um bug em loop ou um
// uso indevido esgotar a cota de tokens da IA. O contador fica no MESMO banco de dados, pra
// funcionar mesmo com várias instâncias do servidor rodando ao mesmo tempo (padrão do Vercel) ──
export async function rateLimitCheck(bucketKey, max, windowSeconds) {
  if (!BACKEND) return true // sem banco configurado, não tem onde guardar o contador — deixa passar
  try {
    const now = Date.now()
    const raw = await store.get(bucketKey)
    let data = raw ? JSON.parse(raw) : null
    if (!data || now > data.resetAt) data = { count: 0, resetAt: now + windowSeconds * 1000 }
    data.count++
    await store.set(bucketKey, JSON.stringify(data))
    return data.count <= max
  } catch {
    return true // se o próprio rate limit falhar por algum motivo, não trava o uso normal por causa disso
  }
}

// ─── tentativas de login do professor — NÃO tranca de vez (a carreta inteira às vezes divide um
// único IP/roteador com a turma toda, então um bloqueio duro podia deixar o professor de verdade
// trancado fora por causa de criança curiosa chutando senha). Em vez disso, cada erro seguido
// AUMENTA o atraso da próxima tentativa, o que já torna adivinhação automatizada inviável ──
export async function loginFailCount(bucketKey) {
  if (!BACKEND) return 0
  try {
    const raw = await store.get(bucketKey)
    const data = raw ? JSON.parse(raw) : null
    if (!data || Date.now() > data.resetAt) return 0
    return data.count
  } catch {
    return 0
  }
}
export async function recordLoginFailure(bucketKey, windowSeconds) {
  if (!BACKEND) return
  try {
    const now = Date.now()
    const raw = await store.get(bucketKey)
    let data = raw ? JSON.parse(raw) : null
    if (!data || now > data.resetAt) data = { count: 0, resetAt: now + windowSeconds * 1000 }
    data.count++
    await store.set(bucketKey, JSON.stringify(data))
  } catch {}
}
export async function clearLoginFailures(bucketKey) {
  if (!BACKEND) return
  try { await store.delete(bucketKey) } catch {}
}

// ─── backup automático agendado (chamado pelo Vercel Cron via api/backup.js) — grava uma cópia
// de tudo dentro do MESMO banco, sob uma chave própria por data, e apaga sozinho os snapshots
// mais antigos além do limite. Não é backup "fora do banco" (se o banco inteiro sumir, o backup
// some junto), mas já protege contra bug/ação errada apagando ou corrompendo chaves específicas ──
const BACKUP_PREFIX = 'backup:'
const BACKUP_EXCLUDE = /^(ratelimit:|aihealth|loginfail:|backup:)/
export async function createBackupSnapshot(keep = 14) {
  if (!BACKEND) return { ok: false, reason: 'no_backend' }
  const items = await store.listWithValues('')
  const data = {}
  for (const item of items) {
    if (BACKUP_EXCLUDE.test(item.key)) continue
    data[item.key] = item.value
  }
  const key = `${BACKUP_PREFIX}${new Date().toISOString()}`
  await store.set(key, JSON.stringify(data))
  const backups = (await store.listWithValues(BACKUP_PREFIX)).map(b => b.key).sort()
  const toDelete = backups.slice(0, Math.max(0, backups.length - keep))
  for (const k of toDelete) await store.delete(k)
  return { ok: true, key, keys: Object.keys(data).length, deleted: toDelete.length }
}
export async function listBackups() {
  if (!BACKEND) return []
  const items = await store.listWithValues(BACKUP_PREFIX)
  return items.map(i => ({ key: i.key, size: (i.value || '').length })).sort((a, b) => b.key.localeCompare(a.key))
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, key, value, prefix, auth } = req.body || {}

  const authKey = (action === 'delete_by_prefix' || action === 'list_with_values') ? prefix : key
  if (needsTeacherAuth(action, authKey)) {
    // mesma ideia do /api/auth: sem senha certa não dava pra chamar essas ações mesmo — mas nada
    // impedia alguém de ficar chutando o campo "auth" direto aqui, sem passar pela tela de login
    // (que é quem tinha o atraso crescente). Agora cada erro seguido NESSE endpoint também atrasa
    // a próxima tentativa vinda do mesmo IP — só demora se já teve chute errado antes, então o uso
    // normal do professor (senha certa, sempre) não fica lento.
    const ip = String((req.headers && req.headers['x-forwarded-for']) || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
    const bucketKey = `loginfail:kvaction:${ip}`
    const fails = await loginFailCount(bucketKey)
    if (fails > 0) await new Promise(r => setTimeout(r, Math.min(400 + fails * 500, 6000)))

    if (!isValidTeacherPassword(auth)) {
      await recordLoginFailure(bucketKey, 600)
      return res.status(403).json({ error: 'forbidden', message: 'Essa ação é só do professor — senha inválida ou ausente.' })
    }
    await clearLoginFailures(bucketKey)
  }

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
      case 'list_with_values': {
        const items = await store.listWithValues(prefix)
        const authorized = isValidTeacherPassword(auth)
        return res.json({ items: items.map(i => ({ key: i.key, value: redactStudentValue(i.key, i.value, authorized) })) })
      }
      case 'delete':           await store.delete(key);               return res.json({ ok: true })
      case 'delete_by_prefix': await store.deleteByPrefix(prefix);    return res.json({ ok: true })
      default: return res.status(400).json({ error: `Unknown action: ${action}` })
    }
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
