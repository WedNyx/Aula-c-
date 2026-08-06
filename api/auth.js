// Autenticação do professor: a senha fica no SERVIDOR (variável de ambiente TEACHER_PASSWORD no Vercel),
// nunca no código que chega ao navegador dos alunos.
// Se a variável não estiver configurada, usa a senha padrão — configure TEACHER_PASSWORD no Vercel para trocá-la.

import { isValidTeacherPassword } from './_teacherAuth.js'
import { loginFailCount, recordLoginFailure, clearLoginFailures } from './kv.js'
import { clientIp } from './_ip.js'

const WINDOW_SECONDS = 600 // 10 minutos — depois disso o contador de erros seguidos zera sozinho

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password } = req.body || {}

  const ip = clientIp(req)
  const bucketKey = `loginfail:teacher:${ip}`

  // atraso cresce a cada erro seguido desse IP (400ms → ... → até 6s) em vez de travar de vez —
  // pensado pra carreta inteira poder compartilhar um único IP/roteador sem um professor de
  // verdade ficar trancado fora por causa de aluno curioso chutando senha
  const fails = await loginFailCount(bucketKey)
  const delay = Math.min(400 + fails * 500, 6000)
  await new Promise(r => setTimeout(r, delay))

  const ok = isValidTeacherPassword(password)
  if (ok) await clearLoginFailures(bucketKey)
  else await recordLoginFailure(bucketKey, WINDOW_SECONDS)

  return res.json({ ok })
}
