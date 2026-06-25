// Cria a tabela kv_store automaticamente.
// Usa DATABASE_URL diretamente, ou deriva de SUPABASE_URL + DATABASE_PASSWORD.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || ''

  let pgUrl = process.env.DATABASE_URL || ''
  if (!pgUrl && SUPABASE_URL && DATABASE_PASSWORD) {
    const ref = SUPABASE_URL.match(/([a-z0-9]+)\.supabase\.co/)?.[1]
    if (ref) pgUrl = `postgresql://postgres:${encodeURIComponent(DATABASE_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`
  }

  if (!pgUrl) {
    return res.status(503).json({
      ok: false,
      error: 'Configuração incompleta.',
      help:
        'Adicione no Vercel (Settings → Environment Variables):\n' +
        '• SUPABASE_URL = URL do projeto (de Settings → API)\n' +
        '• DATABASE_PASSWORD = senha que você escolheu ao criar o projeto',
    })
  }

  try {
    const pgPkg = await import('pg')
    const Client = pgPkg.default?.Client || pgPkg.Client
    const client = new Client({ connectionString: pgUrl, ssl: { rejectUnauthorized: false } })
    await client.connect()
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS kv_store (
          key         TEXT PRIMARY KEY,
          value       TEXT,
          updated_at  TIMESTAMPTZ DEFAULT NOW()
        )
      `)
      await client.query(
        `INSERT INTO kv_store(key,value,updated_at) VALUES($1,$2,NOW())
         ON CONFLICT(key) DO UPDATE SET value=$2,updated_at=NOW()`,
        ['setup:ping', String(Date.now())]
      )
      const r = await client.query(`SELECT value FROM kv_store WHERE key=$1`, ['setup:ping'])
      if (!r.rows[0]?.value) throw new Error('Tabela criada mas leitura falhou.')
      return res.json({ ok: true, message: 'Banco configurado com sucesso! Tabela criada.' })
    } finally {
      await client.end().catch(() => {})
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
