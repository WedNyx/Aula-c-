// Inicializa o banco Supabase.
// Tenta criar a tabela via Postgres direto (DATABASE_PASSWORD).
// Se não conseguir, retorna o SQL para o usuário rodar no Supabase.

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS kv_store (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  // Extrai o project ref para montar o link do SQL Editor
  const projectRef = SUPABASE_URL.match(/([a-z0-9]+)\.supabase\.co/)?.[1] || ''
  const sqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : 'https://supabase.com/dashboard'

  // Se nem SUPABASE_URL está configurado, retorna erro básico
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({
      ok: false,
      error: 'SUPABASE_URL e SUPABASE_SERVICE_KEY não estão configuradas no Vercel.',
    })
  }

  // Tenta criar via pg (precisa de DATABASE_PASSWORD ou DATABASE_URL)
  const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || ''
  let pgUrl = process.env.DATABASE_URL || ''
  if (!pgUrl && projectRef && DATABASE_PASSWORD) {
    pgUrl = `postgresql://postgres:${encodeURIComponent(DATABASE_PASSWORD)}@db.${projectRef}.supabase.co:5432/postgres`
  }

  if (pgUrl) {
    try {
      const pgPkg = await import('pg')
      const Client = pgPkg.default?.Client || pgPkg.Client
      const client = new Client({ connectionString: pgUrl, ssl: { rejectUnauthorized: false } })
      await client.connect()
      try {
        await client.query(CREATE_SQL)
        // Smoke test
        await client.query(
          `INSERT INTO kv_store(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(key) DO UPDATE SET value=$2,updated_at=NOW()`,
          ['setup:ping', String(Date.now())]
        )
        const r = await client.query(`SELECT value FROM kv_store WHERE key='setup:ping'`)
        if (!r.rows[0]?.value) throw new Error('Leitura pós-criação falhou.')
        return res.json({ ok: true, message: 'Tabela criada e conexão verificada!' })
      } finally {
        await client.end().catch(() => {})
      }
    } catch (e) {
      // Se pg falhou, cai no fluxo de SQL manual abaixo
    }
  }

  // Sem pg disponível → verifica se a tabela já existe via Supabase JS
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
    const { error } = await supabase.from('kv_store').select('key').limit(1)
    if (!error) {
      return res.json({ ok: true, message: 'Conexão OK! Tabela kv_store já existe.' })
    }
  } catch {}

  // Tabela não existe e não temos pg → retorna o SQL para o usuário rodar
  return res.json({
    ok: false,
    needsSQL: true,
    sqlEditorUrl,
    sql: CREATE_SQL,
    message: 'Execute o SQL abaixo no Supabase SQL Editor para criar a tabela.',
  })
}
