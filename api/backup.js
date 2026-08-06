// Backup agendado: o Vercel Cron chama este endpoint sozinho (veja "crons" no vercel.json) e o
// professor também pode disparar na mão pelo painel. Grava uma cópia de tudo dentro do MESMO
// banco (não é backup fora do banco — se o banco inteiro sumir, some junto), mas já protege
// contra bug/ação errada apagando ou corrompendo alguma chave específica.
import { createBackupSnapshot, listBackups, loginFailCount, recordLoginFailure, clearLoginFailures } from './kv.js'
import { isValidTeacherPassword } from './_teacherAuth.js'
import { clientIp } from './_ip.js'

// aceita DUAS formas de autorização: o Cron da própria Vercel (cabeçalho Authorization com o
// CRON_SECRET configurado no projeto) OU o professor disparando na mão pelo painel (senha normal)
async function isAuthorized(req) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const header = req.headers['authorization'] || ''
    if (header === `Bearer ${cronSecret}`) return true
  }
  const bodyAuth = (req.body && req.body.auth) || req.query?.auth
  if (bodyAuth) {
    // alguém está de fato tentando a senha do professor (não é o Cron, que usa o header acima) —
    // esse endpoint verificava a senha sem NENHUM atraso ou bloqueio por tentativa errada, diferente
    // de todo outro lugar que checa essa mesma senha. Mesmo atraso crescente por IP dos outros.
    const ip = clientIp(req)
    const bucketKey = `loginfail:backup:${ip}`
    const fails = await loginFailCount(bucketKey)
    if (fails > 0) await new Promise(r => setTimeout(r, Math.min(400 + fails * 500, 6000)))
    const ok = isValidTeacherPassword(bodyAuth)
    if (ok) { await clearLoginFailures(bucketKey); return true }
    await recordLoginFailure(bucketKey, 600)
    return false
  }
  // sem CRON_SECRET configurado, aceita qualquer chamada do próprio Cron (GET sem senha) —
  // menos seguro, mas não trava o backup agendado só porque a variável não foi configurada ainda
  return !cronSecret && req.method === 'GET'
}

export default async function handler(req, res) {
  const authorized = await isAuthorized(req)
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
