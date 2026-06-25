// One-shot endpoint to initialize the database.
// Works when DATABASE_URL (Postgres) is set — creates the kv_store table if needed.
// Also accepts SUPABASE_URL + DATABASE_URL derived from project ref.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const DATABASE_URL = process.env.DATABASE_URL || ''

  if (!DATABASE_URL) {
    return res.status(503).json({
      ok: false,
      error: 'DATABASE_URL não configurada no Vercel.',
      help:
        'Adicione DATABASE_URL nas variáveis de ambiente do Vercel.\n' +
        'Formato: postgresql://postgres:[SENHA]@db.[PROJECT-REF].supabase.co:5432/postgres\n' +
        'O PROJECT-REF aparece na URL do seu projeto no Supabase.',
    })
  }

  try {
    const pgPkg = await import('pg')
    const Client = pgPkg.default?.Client || pgPkg.Client
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
    await client.connect()
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS kv_store (
          key         TEXT PRIMARY KEY,
          value       TEXT,
          updated_at  TIMESTAMPTZ DEFAULT NOW()
        )
      `)
      // Quick smoke test
      await client.query(
        `INSERT INTO kv_store(key,value,updated_at) VALUES($1,$2,NOW())
         ON CONFLICT(key) DO UPDATE SET value=$2,updated_at=NOW()`,
        ['setup:ping', String(Date.now())]
      )
      const r = await client.query(`SELECT value FROM kv_store WHERE key=$1`, ['setup:ping'])
      const ok = !!r.rows[0]?.value
      return res.json({ ok, message: ok ? 'Banco configurado com sucesso!' : 'Tabela criada, mas leitura falhou.' })
    } finally {
      await client.end().catch(() => {})
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
