// Backup agendado: o Vercel Cron chama este endpoint sozinho (veja "crons" no vercel.json) e o
// professor também pode disparar na mão pelo painel. Grava uma cópia de tudo dentro do MESMO
// banco (não é backup fora do banco — se o banco inteiro sumir, some junto), mas já protege
// contra bug/ação errada apagando ou corrompendo alguma chave específica.
import { createBackupSnapshot, listBackups, loginFailCount, recordLoginFailure, clearLoginFailures, rateLimitCheck } from './kv.js'
import { isValidTeacherPassword, teacherLoginFailBucket } from './_teacherAuth.js'
import { clientIp } from './_ip.js'

// aceita DUAS formas de autorização: o Cron da própria Vercel (cabeçalho Authorization com o
// CRON_SECRET configurado no projeto) OU o professor disparando na mão pelo painel (senha normal)
async function isAuthorized(req) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const header = req.headers['authorization'] || ''
    if (header === `Bearer ${cronSecret}`) return { ok: true, trusted: true }
  }
  const bodyAuth = (req.body && req.body.auth) || req.query?.auth
  if (bodyAuth) {
    // alguém está de fato tentando a senha do professor (não é o Cron, que usa o header acima) —
    // esse endpoint verificava a senha sem NENHUM atraso ou bloqueio por tentativa errada, diferente
    // de todo outro lugar que checa essa mesma senha. Mesmo atraso crescente por IP dos outros.
    const ip = clientIp(req)
    const bucketKey = teacherLoginFailBucket(ip)
    const fails = await loginFailCount(bucketKey)
    if (fails > 0) await new Promise(r => setTimeout(r, Math.min(400 + fails * 500, 6000)))
    const ok = isValidTeacherPassword(bodyAuth)
    if (ok) { await clearLoginFailures(bucketKey); return { ok: true, trusted: true } }
    await recordLoginFailure(bucketKey, 600)
    return { ok: false, trusted: false }
  }
  // Sem CRON_SECRET, o backup agendado deve falhar fechado. Aceitar GET anônimo permitiria que
  // qualquer pessoa disparasse uma varredura e uma gravação completas do banco.
  return { ok: false, trusted: false }
}

export default async function handler(req, res) {
  const { ok: authorized, trusted } = await isAuthorized(req)
  // esse endpoint faz um scan completo do banco a cada chamada (createBackupSnapshot/listBackups) —
  // o mais caro de toda a API — mas nunca teve limite de uso. Não limita quem provou identidade de
  // verdade (Cron com CRON_SECRET, ou professor com a senha certa); limita só o caminho SEM
  // credencial confirmada — senha errada/ausente, ou o fallback sem CRON_SECRET configurado (que
  // hoje libera GET sem senha nenhuma) — que é onde um script sem credencial nenhuma podia bater.
  if (!trusted) {
    const withinLimit = await rateLimitCheck(`ratelimit:backup:${clientIp(req)}`, 5, 600)
    if (!withinLimit) return res.status(429).json({ error: 'rate_limited', message: 'Muitas chamadas de backup seguidas. Aguarde um pouco e tente de novo.' })
  }
  if (req.method === 'GET' && req.query?.list === '1') {
    // listar os backups existentes (nome/tamanho) também precisa da mesma autorização — antes
    // disso qualquer um sem senha via quando e com que frequência o backup roda
    if (!authorized) return res.status(401).json({ error: 'unauthorized' })
    return res.json({ backups: await listBackups() })
  }
  if (!authorized) return res.status(401).json({ error: 'unauthorized' })
  try {
    const result = await createBackupSnapshot(14)
    return res.json(result)
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
