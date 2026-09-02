import { createClient } from '@supabase/supabase-js'
import { isValidTeacherPassword, teacherLoginFailBucket } from './_teacherAuth.js'
import { clientIp } from './_ip.js'

const TABLE = 'kv_store'

// ─── proteção das ações só-do-professor ────────────────────────────────────────
// a senha do professor controlava só se a TELA do painel abria — o banco de dados em
// si aceitava qualquer pedido. Agora, as ações que só o professor deveria poder fazer
// (apagar tudo, mexer nas configurações da turma) exigem a senha de verdade aqui no
// servidor, verificada no campo "auth" do pedido.
const SET_PROTECTED_PREFIXES = ['teachercode:', 'teachernotes:', 'teacherreminders:', 'classreminders:', 'nyxlocks:', 'exam:config', 'codesend:', 'accessmode:', 'support:', 'boss:', 'tourney:', 'inspection:', 'kick:', 'scorefix:', 'teachermeta:', 'classroom_reset_flag', 'nudge:', 'hall:', 'kblaunch:', 'kbdlock:', 'resumotrigger:', 'teacherresumo:', 'quiz:', 'backup:', 'turmas:', 'errorlog:', 'adminlog:']
// "errorlog:" e "kbdlock:" faltavam aqui: a leitura já exigia senha (GET_PROTECTED_PREFIXES /
// SET_PROTECTED_PREFIXES respectivamente), mas sem entrar também em DELETE_PROTECTED_PREFIXES
// qualquer sessão anônima podia apagar o log de erros inteiro ou destravar o teclado da turma
// (kbdlock) sem senha nenhuma, chamando "delete" direto — mesmo com o "log_error"/"set" continuando
// devidamente livres pra quem só está registrando um erro de verdade ou o professor travando
const DELETE_PROTECTED_PREFIXES = ['student:', 'teachercode:', 'teachernotes:', 'teacherreminders:', 'classreminders:', 'nyxlocks:', 'exam:config', 'accessmode:', 'support:', 'boss:', 'tourney:', 'inspection:', 'kick:', 'teachermeta:', 'classroom_reset_flag', 'nudge:', 'hall:', 'kblaunch:', 'kbdlock:', 'quiz:', 'backup:', 'turmas:', 'errorlog:', 'adminlog:']
// list_with_values (listagem em massa) é NEGADA por padrão — só esses prefixos continuam
// listáveis sem senha, porque são dados que o próprio app precisa ler sem professor logado
// (seletor de perfil na tela de login, /impacto, portfólio público, estado de duelo/parceiro
// que os alunos usam pra jogar). "student:" ainda passa pela redação de campo sensível
// (redactStudentValue) quando não autorizado — as outras três nunca guardam dado sensível.
const PUBLIC_LIST_PREFIXES = ['student:', 'duel:', 'teamduel:', 'partner:']

// Chaves privadas exigem autenticação. Cadastros públicos têm CPF/nascimento
// removidos tanto na leitura individual quanto nas listagens.
const GET_PROTECTED_PREFIXES = ['backup:', 'errorlog:', 'teachernotes:', 'teacherreminders:']
function needsTeacherAuth(action, key) {
  if (action === 'delete_by_prefix') return true // apaga em massa — sempre só-do-professor
  if (action === 'get_recent_errors') return true // lista os erros de todo mundo — sempre só-do-professor
  if (action === 'get_admin_log') return true // lista as ações administrativas — sempre só-do-professor
  const k = String(key || '')
  if (action === 'set') return SET_PROTECTED_PREFIXES.some(p => k.startsWith(p))
  if (action === 'delete') return DELETE_PROTECTED_PREFIXES.some(p => k.startsWith(p))
  if (action === 'list_with_values') return !PUBLIC_LIST_PREFIXES.some(p => k.startsWith(p))
  if (action === 'get') return GET_PROTECTED_PREFIXES.some(p => k.startsWith(p))
  return false
}

// O servidor preserva CPF/nascimento em atualizações públicas. O cliente não
// precisa receber esses campos para salvar progresso. Apenas o professor pode
// alterar campos privados de um cadastro existente; o cadastro inicial continua permitido.
const SENSITIVE_STUDENT_FIELDS = ['birthDate', 'cpf']
function redactStudentValue(key, value, authorized) {
  if (authorized || value == null || !String(key).startsWith('student:')) return value
  try {
    const obj = studentObject(value)
    let changed = false
    for (const f of SENSITIVE_STUDENT_FIELDS) {
      if (Object.hasOwn(obj, f)) { delete obj[f]; changed = true }
    }
    return changed ? JSON.stringify(obj) : value
  } catch {
    return null // Cadastro inválido não pode devolver texto bruto com dados pessoais.
  }
}

function studentObject(raw) {
  const obj = JSON.parse(raw)
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('invalid_student')
  return obj
}

async function saveStudentPrivate(key, value, authorized) {
  const incoming = studentObject(value)
  for (let attempt = 0; attempt < 8; attempt++) {
    const raw = await store.get(key)
    const current = raw == null ? null : studentObject(raw)
    const next = { ...incoming }
    if (current) for (const field of SENSITIVE_STUDENT_FIELDS) {
      // Autosaves antigos enviam strings vazias: não podem apagar/repor dados privados.
      if (!authorized || !Object.hasOwn(incoming, field)) {
        delete next[field]
        if (Object.hasOwn(current, field)) next[field] = current[field]
      }
    }
    if (await store.compareAndSet(key, raw, JSON.stringify(next))) return true
  }
  return false
}

// ─── gabarito da prova ("exam:config:<turno>") nunca pode ir pro navegador do aluno ──
// a prova era corrigida inteiramente no CLIENTE: o campo "correct" de cada questão viajava junto
// com o resto (pra montar a tela), então qualquer aluno que abrisse a aba de rede do navegador via
// a resposta certa de cada pergunta antes de responder. Esconde "correct" de toda pergunta quando
// quem pediu não é o professor — a correção de verdade agora acontece no servidor (ver action
// "grade_exam" mais abaixo), que é o único lugar que ainda enxerga o valor completo.
function redactExamConfig(key, value, authorized) {
  if (authorized || value == null || !String(key).startsWith('exam:config:')) return value
  try {
    const obj = JSON.parse(value)
    if (!Array.isArray(obj.questions)) return value
    obj.questions = obj.questions.map(q => {
      if (q == null || typeof q !== 'object') return q
      const { correct, ...rest } = q
      return rest
    })
    return JSON.stringify(obj)
  } catch {
    return value
  }
}

// ─── mesma ideia pro Quiz estilo Kahoot ("quiz:room") — mas aqui, diferente da prova, a resposta
// certa É pra aparecer pro aluno depois que a pergunta fecha (revelar é o jeito do jogo funcionar).
// Só esconde "correct" da(s) pergunta(s) que AINDA não fecharam: qualquer índice depois da atual, e
// a atual enquanto o status ainda é "question" (cronômetro rodando) ou "lobby" (nem começou) — a
// partir de "reveal" (aquela pergunta específica) ou "podium" (acabou tudo), libera geral.
function redactQuizRoom(key, value, authorized) {
  if (authorized || value == null || !String(key).startsWith('quiz:room')) return value
  try {
    const obj = JSON.parse(value)
    if (!Array.isArray(obj.questions)) return value
    const qIndex = obj.qIndex ?? -1
    const status = obj.status
    obj.questions = obj.questions.map((q, i) => {
      if (q == null || typeof q !== 'object') return q
      const revealed = i < qIndex || (i === qIndex && (status === 'reveal' || status === 'podium'))
      if (revealed) return q
      const { correct, ...rest } = q
      return rest
    })
    return JSON.stringify(obj)
  } catch {
    return value
  }
}

// ─── e pro Torneio da turma ("tourney:config") — mesma lógica de "só revela depois de fechar",
// mas por RODADA em vez de por pergunta (as 5 perguntas de uma rodada fecham todas juntas quando
// a rodada avança). "correta" de uma rodada ainda em disputa nunca aparece pra quem não é professor.
function redactTourneyConfig(key, value, authorized) {
  if (authorized || value == null || !String(key).startsWith('tourney:config')) return value
  try {
    const obj = JSON.parse(value)
    if (!obj.questions || typeof obj.questions !== 'object') return value
    const currentRound = obj.round
    const roundClosed = (r) => Number(r) < currentRound || (Number(r) === currentRound && obj.status === 'done')
    const redactedQuestions = {}
    for (const round of Object.keys(obj.questions)) {
      const arr = obj.questions[round]
      redactedQuestions[round] = (Array.isArray(arr) && !roundClosed(round))
        ? arr.map(q => {
            if (q == null || typeof q !== 'object') return q
            const { correta, ...rest } = q
            return rest
          })
        : arr
    }
    return JSON.stringify({ ...obj, questions: redactedQuestions })
  } catch {
    return value
  }
}

// ─── duelo 1x1 e em dupla ("duel:"/"teamduel:") — o documento é compartilhado pelos próprios
// jogadores (cada um escreve a própria resposta nele), então desde a hora que o duelo é criado o
// gabarito completo ("correct" de cada questão) já ficava ali dentro, visível pra quem quisesse
// abrir a aba de rede e entrar no duelo do adversário antes de responder. Esconde "correct" de toda
// pergunta quando quem pediu não é o professor — a correção de verdade agora acontece no servidor
// (ver "grade_duel"/"grade_team_duel" mais abaixo), igual à prova e ao torneio.
function redactDuelQuestions(key, value, authorized) {
  if (authorized || value == null) return value
  const k = String(key)
  if (!k.startsWith('duel:') && !k.startsWith('teamduel:')) return value
  try {
    const obj = JSON.parse(value)
    if (!Array.isArray(obj.questions)) return value
    obj.questions = obj.questions.map(q => {
      if (q == null || typeof q !== 'object') return q
      const { correct, ...rest } = q
      return rest
    })
    return JSON.stringify(obj)
  } catch {
    return value
  }
}

// ─── trava a nota do duelo/duelo em dupla contra forjamento direto ──────────────────────────────
// "grade_duel"/"grade_team_duel" existem JUSTAMENTE pra nota nunca ser calculada nem gravada pelo
// cliente (ver comentário deles mais abaixo) — mas a ação genérica "set" (usada de verdade pra
// criar o convite e pra aceitar) aceitava, sem senha nenhuma, um documento "duel:"/"teamduel:"
// inteiro por cima, JÁ COM scoreFrom/scoreTo/scores preenchidos. Bastava um aluno chamar /api/kv
// direto (fora do app) com um "set" contendo a nota que quisesse pra vencer qualquer duelo sem
// responder nada, furando toda a proteção de "grade_duel". O cliente nunca precisa (e nunca
// precisou) mandar essas notas via "set" — só cria o duelo com elas em null e muda "status" no
// aceite — então bloquear qualquer "set" que já venha com nota preenchida não quebra nada legítimo.
function isDuelScoreForgery(key, rawValue) {
  const k = String(key || '')
  if (!k.startsWith('duel:') && !k.startsWith('teamduel:')) return false
  let obj
  try { obj = JSON.parse(rawValue) } catch { return false }
  if (obj == null || typeof obj !== 'object') return false
  if (k.startsWith('duel:')) return obj.scoreFrom != null || obj.scoreTo != null
  return !!(obj.scores && typeof obj.scores === 'object' && Object.keys(obj.scores).length > 0)
}

// ─── grava um merge no documento com releitura-e-repetição, pra "grade_duel"/"grade_team_duel" ──
// entre o "get" já feito acima (usado só pra validar o pedido e calcular a nota) e o "set" que
// grava, outra sessão pode escrever por cima — ex: 3+ jogadores de um duelo em dupla respondendo
// quase no mesmo instante. A primeira versão desta função só reagia a UMA escrita concorrente por
// vez (relia numa base capturada uma única vez no início, só trocando ela quando A PRÓPRIA escrita
// falhava) — com 3+ gravações correndo ao mesmo tempo, dava pra um jogador B escrever por cima da
// nota de A com sucesso (o "set" e a releitura de B batiam certinho), mesmo que a base de B já
// estivesse desatualizada por não incluir a nota de A ainda, apagando A silenciosamente sem que
// NINGUÉM detectasse (nem A, que já tinha confirmado sucesso antes; nem B, que só confere a própria
// nota). Por isso cada TENTATIVA (não só as repetições) relê o documento na hora, bem em cima da
// escrita, encolhendo ao máximo a janela em que outra escrita pode se intrometer — sem precisar de
// um mecanismo de trava no banco (que os 3 backends suportados aqui — Supabase, Postgres direto,
// Redis via Upstash — não expõem de forma unificada).
async function writeMergedWithRetry(key, buildMerge, verifyMerge, maxAttempts = 6) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const raw = await store.get(key)
    if (!raw) return { merged: null, ok: false }
    let config
    try { config = JSON.parse(raw) } catch { return { merged: null, ok: false } }
    const merged = buildMerge(config)
    await store.set(key, JSON.stringify(merged))
    const freshRaw = await store.get(key)
    let fresh
    try { fresh = JSON.parse(freshRaw) } catch { fresh = null }
    if (fresh && verifyMerge(fresh, merged)) return { merged: fresh, ok: true }
    // outra escrita se intrometeu entre o nosso "get" e a releitura — tenta de novo do zero,
    // relendo na hora (não reaproveita nada da tentativa anterior)
  }
  return { merged: null, ok: false }
}

// ─── mesma derivação de chave usada em src/storage.js pra "duel:"/"teamduel:" — duplicada aqui de
// propósito (mesmo padrão já usado pra "exam:config:"/"tourney:config"): o servidor precisa achar o
// documento certo pra corrigir de verdade, sem depender do cliente mandar a chave pronta.
function safeNameForKey(name) {
  return String(name || '').trim().replace(/\s+/g, '_').replace(/["'\/\\:]/g, '')
}
function duelKeyFor(shift, nameA, nameB) {
  const [x, y] = [safeNameForKey(nameA), safeNameForKey(nameB)].sort()
  return `duel:${shift || 'sem-turno'}:${x}__${y}`
}
function teamDuelKeyFor(shift, names) {
  const sorted = (names || []).map(safeNameForKey).sort()
  return `teamduel:${shift || 'sem-turno'}:${sorted.join('__')}`
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
  async compareAndSet(key, expected, value) {
    if (BACKEND === 'supabase') {
      await ensureTable()
      if (expected == null) {
        const { error } = await supabase.from(TABLE).insert({ key, value, updated_at: new Date().toISOString() })
        if (error?.code === '23505') return false
        if (error) throw new Error('student_write_failed')
        return true
      }
      const { data, error } = await supabase.from(TABLE).update({ value, updated_at: new Date().toISOString() }).eq('key', key).eq('value', expected).select('key')
      if (error) throw new Error('student_write_failed')
      return data.length > 0
    }
    if (BACKEND === 'pg') {
      const r = expected == null
        ? await withPg(c => c.query(`INSERT INTO ${TABLE}(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT DO NOTHING RETURNING key`, [key,value]))
        : await withPg(c => c.query(`UPDATE ${TABLE} SET value=$3,updated_at=NOW() WHERE key=$1 AND value=$2 RETURNING key`, [key,expected,value]))
      return r.rowCount > 0
    }
    return Number(await redis('EVAL', `-- student-cas
      local current = redis.call('GET', KEYS[1])
      if (ARGV[1] == 'missing' and not current) or (ARGV[1] == 'present' and current == ARGV[2]) then
        redis.call('SET', KEYS[1], ARGV[3]); return 1
      end
      return 0`, 1, key, expected == null ? 'missing' : 'present', expected ?? '', value)) === 1
  },
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
const BACKUP_EXCLUDE = /^(ratelimit:|ai:health|loginfail:|backup:|errorlog:|adminlog:)/

// ─── log de erros de JS não tratados, mandado sozinho por qualquer sessão (aluno ou professor) —
// ver reportClientError em storage.js / o listener global em App.jsx. Uma lista só, capada nas
// últimas ERROR_LOG_MAX entradas (não precisa de uma chave por erro; ninguém consulta erro
// antigo individualmente, só a lista recente inteira) ──
const ERROR_LOG_KEY = 'errorlog:recent'
const ERROR_LOG_MAX = 50

// ─── auditoria das ações só-do-professor: toda ação que passou pela verificação de senha em
// needsTeacherAuth (apagar, travar teclado, mudar configuração de turma etc.) fica registrada aqui
// — não pra desconfiar do professor, mas pra dar visibilidade de quando alguém mais usou a senha
// (compartilhada sem querer, adivinhada, etc.) e o que foi feito com ela. Mesmo padrão de lista
// única capada do log de erros acima; nunca guarda o valor em si, só a ação/chave/IP/quando ──
const ADMIN_LOG_KEY = 'adminlog:recent'
const ADMIN_LOG_MAX = 300
async function recordAdminAction(action, key, ip) {
  try {
    const raw = await store.get(ADMIN_LOG_KEY)
    let entries = []
    try { entries = raw ? JSON.parse(raw) : [] } catch { entries = [] }
    entries.push({ action: String(action || '').slice(0, 40), key: String(key || '').slice(0, 200), ip: String(ip || '').slice(0, 60), at: Date.now() })
    if (entries.length > ADMIN_LOG_MAX) entries = entries.slice(entries.length - ADMIN_LOG_MAX)
    await store.set(ADMIN_LOG_KEY, JSON.stringify(entries))
  } catch {}
}
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

// ─── verifica a senha do professor com o mesmo atraso crescente por tentativa errada do
// /api/auth, aplicado sempre que uma senha É de fato tentada (campo "auth" não vazio) — inclusive
// em ações que não EXIGEM senha pra funcionar, como "get" de uma chave qualquer. Sem isso, dava pra
// chutar a senha sem limite nenhum usando a redação condicional de "get" como oráculo (gabarito de
// prova/quiz/torneio some ou aparece dependendo só de acertar a senha), sem nunca cair no 403 que
// dispararia o throttle. Quando "auth" está vazio (a esmagadora maioria das leituras anônimas
// normais), devolve false na hora sem gastar nenhuma chamada a mais no banco.
async function checkTeacherAuth(ip, auth) {
  if (!auth) return false
  const bucketKey = teacherLoginFailBucket(ip)
  const fails = await loginFailCount(bucketKey)
  if (fails > 0) await new Promise(r => setTimeout(r, Math.min(400 + fails * 500, 6000)))
  const ok = isValidTeacherPassword(auth)
  if (ok) await clearLoginFailures(bucketKey)
  else await recordLoginFailure(bucketKey, 600)
  return ok
}

// ─── limites generosos de uso pra "set"/"get"/"delete"/"list_with_values" — essas quatro ações
// nunca tiveram NENHUM limite, mesmo sendo o coração de todo o app (autosave, polling de duelo/chefão/
// torneio, etc.), o que deixava um bug em loop (ou um script malicioso) capaz de martelar o banco sem
// nenhum freio. Os números são bem folgados de propósito — uma sala inteira de alunos compartilhando
// o wifi da escola gera bem menos que isso por minuto — servem só pra barrar um loop descontrolado.
const KV_RATE_LIMITS = { kvset: [600, 60], kvget: [1200, 60], kvdelete: [300, 60], kvlist: [300, 60] }
async function checkKvRateLimit(res, bucket, ip) {
  const [max, windowSeconds] = KV_RATE_LIMITS[bucket]
  const within = await rateLimitCheck(`ratelimit:${bucket}:${ip}`, max, windowSeconds)
  if (!within) { res.status(429).json({ error: 'rate_limited', message: 'Muitos pedidos seguidos desse mesmo lugar. Aguarde um pouco e tente de novo.' }); return false }
  return true
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, key, value, prefix, auth } = req.body || {}
  const ip = clientIp(req)

  const authKey = (action === 'delete_by_prefix' || action === 'list_with_values') ? prefix : key
  if (needsTeacherAuth(action, authKey)) {
    if (!(await checkTeacherAuth(ip, auth))) {
      return res.status(403).json({ error: 'forbidden', message: 'Essa ação é só do professor — senha inválida ou ausente.' })
    }
    // ação privilegiada de verdade (senha conferida agora mesmo) — registra quem fez o quê, sem
    // guardar o valor em si. "get_admin_log" fica de fora de propósito: só consultar o próprio log
    // não é uma ação administrativa que valha a pena registrar (senão cada consulta gerava uma
    // entrada nova só de olhar a lista)
    if (action !== 'get_admin_log') await recordAdminAction(action, authKey, ip)
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
      case 'set': {
        if (!(await checkKvRateLimit(res, 'kvset', ip))) return
        if (isDuelScoreForgery(key, value)) {
          return res.status(403).json({ error: 'forbidden', message: 'A nota do duelo só pode ser gravada pelo servidor, ao corrigir as respostas.' })
        }
        if (String(key).startsWith('student:')) {
          try { studentObject(value) } catch { return res.status(400).json({ error: 'invalid_student' }) }
          const authorized = await checkTeacherAuth(ip, auth)
          if (!(await saveStudentPrivate(key, value, authorized))) return res.status(409).json({ error: 'student_write_conflict' })
        } else await store.set(key, value)
        return res.json({ ok: true })
      }
      case 'get': {
        if (!(await checkKvRateLimit(res, 'kvget', ip))) return
        const authorized = await checkTeacherAuth(ip, auth)
        const raw = redactStudentValue(key, await store.get(key), authorized)
        const redacted = redactDuelQuestions(key, redactTourneyConfig(key, redactQuizRoom(key, redactExamConfig(key, raw, authorized), authorized), authorized), authorized)
        return res.json({ value: redacted })
      }
      case 'grade_exam': {
        // corrige a prova no SERVIDOR: o aluno manda só as respostas que escolheu (nunca o
        // gabarito), o servidor lê a config completa (com "correct") direto do banco — sem passar
        // pelo redactExamConfig acima, que é só pra respostas de "get" — calcula a nota e devolve
        // só o número final. Mesma fórmula que existia no cliente antes desta correção: 10 pontos
        // por acerto, descontando 10 por saída de aba registrada (anti-cola).
        // limite de tentativas: a nota devolvida diz QUANTAS respostas acertou (não QUAIS) — sem
        // um limite aqui, alguém poderia enviar respostas repetidas vezes mudando uma de cada vez
        // pra descobrir o gabarito inteiro só olhando a nota subir ou descer.
        const withinLimit = await rateLimitCheck(`ratelimit:gradeexam:${ip}`, 15, 600)
        if (!withinLimit) return res.status(429).json({ error: 'rate_limited', message: 'Muitas tentativas seguidas de enviar a prova. Aguarde um pouco e tente de novo.' })
        const { shift, answers, exits } = req.body || {}
        const raw = await store.get(`exam:config:${shift || 'all'}`)
        if (!raw) return res.status(404).json({ error: 'exam_not_found' })
        let config
        try { config = JSON.parse(raw) } catch { return res.status(500).json({ error: 'exam_config_corrupted' }) }
        const questions = Array.isArray(config.questions) ? config.questions : []
        // defesa em profundidade: se alguma questão foi gerada pela IA sem gabarito válido (correct
        // fora do range de opts), ela nunca conta pra nota nem pro total — sem isso ela zeraria a
        // chance de TODOS os alunos acertarem essa questão, mesmo já validando na criação da prova
        const isValidQuestion = (q) => q && Array.isArray(q.opts) && q.opts.length >= 2 && Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.opts.length
        const validQuestions = questions.filter(isValidQuestion)
        let pts = 0
        questions.forEach((q, i) => { if (isValidQuestion(q) && answers && answers[i] === q.correct) pts++ })
        const rawScore = pts * 10
        const penalty = Math.min(rawScore, Math.max(0, Number(exits) || 0) * 10)
        const finalScore = rawScore - penalty
        return res.json({ finalScore, raw: rawScore, total: validQuestions.length })
      }
      case 'grade_tourney_round': {
        // mesma ideia do grade_exam: o aluno manda só as respostas escolhidas (nunca o gabarito) —
        // aqui em índice ORIGINAL da alternativa, não da posição embaralhada que ele viu na tela
        // (o embaralhamento é só cosmético no cliente, feito sem precisar saber qual é a certa) —
        // o servidor lê a rodada de verdade direto do banco (sem passar pelo redactTourneyConfig,
        // que é só pra "get") e devolve só a pontuação, nunca "correta".
        const withinLimit = await rateLimitCheck(`ratelimit:gradetourney:${ip}`, 15, 600)
        if (!withinLimit) return res.status(429).json({ error: 'rate_limited', message: 'Muitas tentativas seguidas de enviar o torneio. Aguarde um pouco e tente de novo.' })
        const { tourneyId, round, picks, turmaId } = req.body || {}
        const raw = await store.get(`tourney:config:${turmaId || 'sem-turno'}`)
        if (!raw) return res.status(404).json({ error: 'tourney_not_found' })
        let config
        try { config = JSON.parse(raw) } catch { return res.status(500).json({ error: 'tourney_config_corrupted' }) }
        // rodada precisa ser exatamente a que está valendo AGORA — evita nota de uma rodada velha
        // (já avançada) ou de um torneio anterior (id diferente) ser aceita como se fosse a atual
        if (config.id !== tourneyId || config.round !== round) {
          return res.status(409).json({ error: 'stale_round', message: 'Essa rodada não é mais a atual.' })
        }
        const questions = Array.isArray((config.questions || {})[round]) ? config.questions[round] : []
        let score = 0
        questions.forEach((q, i) => { if (picks && picks[i] === q.correta) score++ })
        return res.json({ score, total: questions.length })
      }
      case 'grade_duel': {
        // mesma ideia do grade_exam/grade_tourney_round: o aluno manda só as respostas escolhidas
        // (nunca o gabarito) — o servidor acha o duelo pela dupla de nomes, lê a config completa
        // direto do banco (sem passar pelo redactDuelQuestions acima, que é só pra "get"/
        // "list_with_values") e devolve só a pontuação, nunca "correct". O MERGE (resposta + nota +
        // status) também é gravado aqui, no servidor, com a config PRISTINE (não a redigida) — se o
        // merge fosse feito no cliente (ler com "get", já sem "correct", e regravar o documento
        // inteiro por cima), a segunda pessoa a responder perderia o gabarito de vez, porque a
        // primeira já teria regravado o duelo sem os "correct" nas perguntas.
        const withinLimit = await rateLimitCheck(`ratelimit:gradeduel:${ip}`, 15, 600)
        if (!withinLimit) return res.status(429).json({ error: 'rate_limited', message: 'Muitas tentativas seguidas de enviar o duelo. Aguarde um pouco e tente de novo.' })
        const { shift, from, to, myName, answers } = req.body || {}
        const dKey = duelKeyFor(shift, from, to)
        const raw = await store.get(dKey)
        if (!raw) return res.status(404).json({ error: 'duel_not_found' })
        let config
        try { config = JSON.parse(raw) } catch { return res.status(500).json({ error: 'duel_corrupted' }) }
        if (myName !== config.from && myName !== config.to) {
          return res.status(403).json({ error: 'not_a_player', message: 'Você não faz parte desse duelo.' })
        }
        const scoreField = myName === config.from ? 'scoreFrom' : 'scoreTo'
        const answersField = myName === config.from ? 'answersFrom' : 'answersTo'
        const questions = Array.isArray(config.questions) ? config.questions : []
        // já respondeu esse duelo antes: devolve a nota já registrada em vez de recalcular — sem
        // isso, dava pra reenviar respostas diferentes só pra ver a nota mudar e ir adivinhando
        // o gabarito aos poucos, mesmo dentro do limite de tentativas acima
        if (config[scoreField] != null) return res.json({ score: config[scoreField], total: questions.length, already: true })
        let score = 0
        questions.forEach((q, i) => { if (answers && answers[i] === q.correct) score++ })
        // essa checagem lá em cima não fecha a janela entre VÁRIAS requisições concorrentes do MESMO
        // aluno com respostas DIFERENTES (fácil de automatizar): todas passam no "já respondeu" antes
        // de qualquer uma escrever, cada uma calcularia e devolveria a nota da SUA combinação de
        // respostas, dando pra comparar notas de tentativas paralelas e ir deduzindo o gabarito. Por
        // isso o merge relê o documento a cada tentativa e só grava se AINDA não tiver sido gravado
        // por essa altura — se outra requisição concorrente já gravou primeiro, mantém o valor dela.
        const { ok, merged } = await writeMergedWithRetry(
          dKey,
          (c) => {
            if (c[scoreField] != null) return c
            const m = { ...c, [answersField]: answers || {}, [scoreField]: score }
            if (m.scoreFrom != null && m.scoreTo != null) m.status = 'done'
            return m
          },
          // não basta conferir "ficou gravado algo" — se outra requisição concorrente também achou
          // scoreField vazio (leu ANTES desta escrever) e escreveu por cima logo depois desta, o
          // valor final pode não ser o que ESTA tentativa acabou de gravar. Comparando contra o que
          // ESTA tentativa pretendia (merged), uma sobrescrita alheia é detectada e força um retry —
          // que na próxima volta relê o valor já gravado por quem venceu e para de tentar escrever
          (fresh, merged) => fresh[scoreField] === merged[scoreField]
        )
        if (!ok) return res.status(409).json({ error: 'duel_grade_conflict', message: 'Muita gente respondendo ao mesmo tempo — tente enviar de novo.' })
        // devolve a nota que REALMENTE ficou gravada (pode ser a de outra requisição concorrente do
        // mesmo aluno que chegou primeiro, não necessariamente a desta chamada)
        return res.json({ score: merged[scoreField], total: questions.length })
      }
      case 'grade_team_duel': {
        const withinLimit = await rateLimitCheck(`ratelimit:gradeteamduel:${ip}`, 15, 600)
        if (!withinLimit) return res.status(429).json({ error: 'rate_limited', message: 'Muitas tentativas seguidas de enviar o duelo em dupla. Aguarde um pouco e tente de novo.' })
        const { shift, names, myName, answers } = req.body || {}
        const tKey = teamDuelKeyFor(shift, names)
        const raw = await store.get(tKey)
        if (!raw) return res.status(404).json({ error: 'duel_not_found' })
        let config
        try { config = JSON.parse(raw) } catch { return res.status(500).json({ error: 'duel_corrupted' }) }
        if (!(config.players || []).some(p => p.name === myName)) {
          return res.status(403).json({ error: 'not_a_player', message: 'Você não faz parte desse duelo.' })
        }
        const questions = Array.isArray(config.questions) ? config.questions : []
        if (config.scores && config.scores[myName] != null) {
          return res.json({ score: config.scores[myName], total: questions.length, already: true })
        }
        let score = 0
        questions.forEach((q, i) => { if (answers && answers[i] === q.correct) score++ })
        // mesmo cuidado do grade_duel: só grava se ESTE aluno ainda não tiver nota registrada NA
        // RELEITURA de cada tentativa (não só na checagem lá em cima) — fecha a janela de várias
        // requisições concorrentes do mesmo aluno com respostas diferentes tentando comparar notas
        const { ok, merged } = await writeMergedWithRetry(
          tKey,
          (c) => {
            if (c.scores && c.scores[myName] != null) return c
            const scores = { ...(c.scores || {}), [myName]: score }
            const answersMap = { ...(c.answers || {}), [myName]: answers || {} }
            const allDone = (c.players || []).every(p => scores[p.name] != null)
            return { ...c, scores, answers: answersMap, status: allDone ? 'done' : c.status }
          },
          // mesmo raciocínio do grade_duel: compara contra o que ESTA tentativa pretendia gravar
          // (merged), não só "existe alguma nota" — detecta quando outra requisição concorrente do
          // mesmo aluno sobrescreveu por cima entre o nosso "set" e a releitura, e força um retry
          (fresh, merged) => fresh.scores?.[myName] === merged.scores?.[myName]
        )
        if (!ok) return res.status(409).json({ error: 'duel_grade_conflict', message: 'Muita gente respondendo ao mesmo tempo — tente enviar de novo.' })
        return res.json({ score: merged.scores[myName], total: questions.length })
      }
      case 'log_error': {
        // qualquer sessão (aluno ou professor) pode registrar um erro — sem senha, porque o
        // objetivo é justamente pegar erro de quem nem sabe que precisa avisar o professor.
        // Rate limit generoso: protege contra um bug em loop enchendo o banco de milhares de
        // registros iguais, sem travar o uso normal (um erro de verdade não repete toda hora).
        const withinLimit = await rateLimitCheck(`ratelimit:logerror:${ip}`, 30, 600)
        if (!withinLimit) return res.json({ ok: false, reason: 'rate_limited' })
        const { message, stack, url: pageUrl, role } = req.body || {}
        const raw = await store.get(ERROR_LOG_KEY)
        let entries = []
        try { entries = raw ? JSON.parse(raw) : [] } catch { entries = [] }
        entries.push({
          message: String(message || '').slice(0, 500),
          stack: String(stack || '').slice(0, 1500),
          url: String(pageUrl || '').slice(0, 200),
          role: String(role || 'anon').slice(0, 20),
          at: Date.now(),
        })
        if (entries.length > ERROR_LOG_MAX) entries = entries.slice(entries.length - ERROR_LOG_MAX)
        await store.set(ERROR_LOG_KEY, JSON.stringify(entries))
        return res.json({ ok: true })
      }
      case 'get_recent_errors': {
        // senha já verificada acima (needsTeacherAuth trata "get_recent_errors" como sempre
        // protegida, com o mesmo atraso crescente das outras ações só-do-professor)
        const raw = await store.get(ERROR_LOG_KEY)
        let entries = []
        try { entries = raw ? JSON.parse(raw) : [] } catch { entries = [] }
        return res.json({ errors: entries.slice().reverse() })
      }
      case 'get_admin_log': {
        // senha já verificada acima — mesma proteção de "get_recent_errors"
        const raw = await store.get(ADMIN_LOG_KEY)
        let entries = []
        try { entries = raw ? JSON.parse(raw) : [] } catch { entries = [] }
        return res.json({ actions: entries.slice().reverse() })
      }
      case 'list_with_values': {
        if (!(await checkKvRateLimit(res, 'kvlist', ip))) return
        const items = await store.listWithValues(prefix)
        const authorized = await checkTeacherAuth(ip, auth)
        return res.json({ items: items.map(i => ({ key: i.key, value: redactDuelQuestions(i.key, redactStudentValue(i.key, i.value, authorized), authorized) })) })
      }
      case 'delete': {
        if (!(await checkKvRateLimit(res, 'kvdelete', ip))) return
        await store.delete(key)
        return res.json({ ok: true })
      }
      case 'delete_by_prefix': {
        if (!(await checkKvRateLimit(res, 'kvdelete', ip))) return
        await store.deleteByPrefix(prefix)
        return res.json({ ok: true })
      }
      default: return res.status(400).json({ error: `Unknown action: ${action}` })
    }
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
