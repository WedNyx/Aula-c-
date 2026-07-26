// Backup agendado: o Vercel Cron chama este endpoint sozinho (veja "crons" no vercel.json) e o
// professor também pode disparar na mão pelo painel. Grava uma cópia de tudo dentro do MESMO
// banco (não é backup fora do banco — se o banco inteiro sumir, some junto), mas já protege
// contra bug/ação errada apagando ou corrompendo alguma chave específica.
import { createBackupSnapshot, listBackups } from './kv.js'
import { isValidTeacherPassword } from './_teacherAuth.js'

// aceita DUAS formas de autorização: o Cron da própria Vercel (cabeçalho Authorization com o
// CRON_SECRET configurado no projeto) OU o professor disparando na mão pelo painel (senha normal)
function isAuthorized(req) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const header = req.headers['authorization'] || ''
    if (header === `Bearer ${cronSecret}`) return true
  }
  const bodyAuth = (req.body && req.body.auth) || req.query?.auth
  if (isValidTeacherPassword(bodyAuth)) return true
  // sem CRON_SECRET configurado, aceita qualquer chamada do próprio Cron (GET sem senha) —
  // menos seguro, mas não trava o backup agendado só porque a variável não foi configurada ainda
  return !cronSecret && req.method === 'GET'
}

export default async function handler(req, res) {
  if (req.method === 'GET' && req.query?.list === '1') {
    return res.json({ backups: await listBackups() })
  }
  if (!isAuthorized(req)) return res.status(401).json({ error: 'unauthorized' })
  try {
    const result = await createBackupSnapshot(14)
    return res.json(result)
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
