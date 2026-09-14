import { rateLimitCheck } from './kv.js'
import { clientIp } from './_ip.js'
import { captureServerError } from './_sentry.js'

const DEFAULT_URL = 'https://judge0-ce.p.rapidapi.com'
const CODE_LIMIT = 50 * 1024
const STDIN_LIMIT = 10 * 1024
const REQUEST_TIMEOUT_MS = 9000
const POLL_ATTEMPTS = 12
const POLL_DELAY_MS = 450
let cachedCsharp = null

function config() {
  return {
    url: (process.env.JUDGE0_API_URL || DEFAULT_URL).replace(/\/$/, ''),
    host: process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com',
    key: process.env.JUDGE0_API_KEY || '',
  }
}

function headers({ host, key }) {
  return { 'Content-Type': 'application/json', 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host }
}

const encode = value => Buffer.from(String(value || ''), 'utf8').toString('base64')
function decode(value) {
  if (value == null || value === '') return null
  try { return Buffer.from(value, 'base64').toString('utf8') } catch { return String(value) }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function safeFiles(files, sourceCode) {
  if (Array.isArray(files)) return files.filter(file => file && typeof file.name === 'string' && typeof file.code === 'string').slice(0, 20).map(file => ({ name: file.name.replace(/[^a-zA-Z0-9_.-]/g, '_'), code: file.code }))
  return [{ name: 'Program.cs', code: String(sourceCode || '') }]
}

// A execução simples recebe um arquivo. Para as aulas atuais, reunimos os arquivos
// trazendo os `using` para o topo; projetos complexos ganharão modo ZIP depois.
function combineCsharpFiles(files) {
  const usings = new Set()
  const bodies = []
  for (const file of files) {
    const body = file.code.replace(/^\s*(global\s+)?using\s+[^;]+;\s*$/gm, line => { usings.add(line.trim()); return '' })
    bodies.push(`// ===== ${file.name} =====\n${body.trim()}`)
  }
  return [...usings, '', ...bodies].join('\n')
}

async function judgeFetch(path, options = {}) {
  const cfg = config()
  const response = await fetch(`${cfg.url}${path}`, { ...options, headers: { ...headers(cfg), ...(options.headers || {}) }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Judge0 respondeu ${response.status}`)
    error.status = response.status
    throw error
  }
  return data
}

function compareVersions(left, right) {
  const parse = value => String(value).match(/\d+(?:\.\d+)*/)?.[0]?.split('.').map(Number) || [0]
  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (b[index] || 0) - (a[index] || 0)
    if (difference) return difference
  }
  return 0
}

async function csharpLanguage() {
  if (cachedCsharp) return cachedCsharp
  const languages = await judgeFetch('/languages')
  const candidates = Array.isArray(languages) ? languages.filter(item => /^C#\s*\(/i.test(String(item?.name || ''))) : []
  candidates.sort((a, b) => compareVersions(a.name, b.name))
  if (!candidates[0]) throw Object.assign(new Error('Esta instância do Judge0 não oferece C#.'), { status: 503 })
  cachedCsharp = candidates[0]
  return cachedCsharp
}

function publicResult(data, mode) {
  return {
    success: Number(data.status?.id) === 3,
    status: data.status?.description || 'Resultado desconhecido',
    statusId: data.status?.id || null,
    stdout: mode === 'build' ? null : decode(data.stdout),
    stderr: decode(data.stderr),
    compileOutput: decode(data.compile_output),
    message: decode(data.message),
    time: data.time ?? null,
    memory: data.memory ?? null,
    buildOnly: mode === 'build',
  }
}

function errorResponse(error) {
  if (error?.name === 'TimeoutError') return { code: 504, body: { error: 'judge0_timeout', message: 'O executor demorou demais para responder.' } }
  if (error?.status === 401 || error?.status === 403) return { code: 503, body: { error: 'judge0_auth', message: 'O Judge0 ainda precisa ser configurado pelo professor.' } }
  if (error?.status === 429) return { code: 429, body: { error: 'judge0_limit', message: 'O limite temporário de execuções foi atingido. Aguarde um pouco.' } }
  return { code: error?.status || 502, body: { error: 'judge0_unavailable', message: 'O executor de código está temporariamente indisponível.' } }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (!config().key) return res.json({ configured: false })
    try {
      const language = await csharpLanguage()
      return res.json({ configured: true, available: true, language: { id: language.id, name: language.name } })
    } catch (error) {
      return res.status(errorResponse(error).code).json({ configured: true, available: false })
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  if (!config().key) return res.status(503).json({ error: 'missing_api_key', message: 'O Judge0 ainda não está configurado.' })
  if (!(await rateLimitCheck(`ratelimit:judge0:${clientIp(req)}`, 30, 60))) return res.status(429).json({ error: 'rate_limited', message: 'Muitas execuções seguidas. Aguarde um minuto.' })

  const { files, sourceCode, stdin = '', language = 'csharp', mode = 'run' } = req.body || {}
  if (language !== 'csharp') return res.status(400).json({ error: 'language_not_allowed', message: 'Nesta primeira versão, apenas C# está liberado.' })
  if (!['run', 'build'].includes(mode)) return res.status(400).json({ error: 'invalid_mode' })
  const code = combineCsharpFiles(safeFiles(files, sourceCode))
  if (!code.trim()) return res.status(400).json({ error: 'empty_code', message: 'Escreva algum código antes de executar.' })
  if (Buffer.byteLength(code, 'utf8') > CODE_LIMIT) return res.status(413).json({ error: 'code_too_large', message: 'O projeto ultrapassa o limite de 50 KB.' })
  if (Buffer.byteLength(String(stdin), 'utf8') > STDIN_LIMIT) return res.status(413).json({ error: 'stdin_too_large', message: 'A entrada ultrapassa o limite de 10 KB.' })

  try {
    const csharp = await csharpLanguage()
    const submission = await judgeFetch('/submissions?base64_encoded=true&wait=false', {
      method: 'POST',
      body: JSON.stringify({ source_code: encode(code), language_id: csharp.id, stdin: encode(stdin), cpu_time_limit: 2, cpu_extra_time: 0.5, wall_time_limit: 5, memory_limit: 128000, max_file_size: 1024, max_processes_and_or_threads: 20, enable_network: false }),
    })
    if (!submission.token) throw new Error('Judge0 não devolveu o token da execução.')
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
      if (attempt) await sleep(POLL_DELAY_MS)
      const result = await judgeFetch(`/submissions/${encodeURIComponent(submission.token)}?base64_encoded=true&fields=stdout,stderr,compile_output,message,status,time,memory`)
      if (![1, 2].includes(Number(result.status?.id))) return res.json(publicResult(result, mode))
    }
    return res.status(504).json({ error: 'execution_timeout', message: 'A execução ainda não terminou. Tente novamente.' })
  } catch (error) {
    captureServerError(error, { route: 'execute-code', provider: 'judge0' })
    const response = errorResponse(error)
    return res.status(response.code).json(response.body)
  }
}
