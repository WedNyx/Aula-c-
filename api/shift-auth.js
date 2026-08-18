// Autenticação da turma de teste e da sala de linguagens — mesma ideia do api/auth.js (senha
// verificada no SERVIDOR, nunca no código que chega ao aluno) e mesmo atraso crescente por IP
// contra tentativa repetida, sem travar de vez uma sala inteira atrás do mesmo roteador.

import { isValidShiftPassword } from './_shiftAuth.js'
import { loginFailCount, recordLoginFailure, clearLoginFailures } from './kv.js'
import { clientIp } from './_ip.js'

const WINDOW_SECONDS = 600
const VALID_SHIFT_IDS = ['teste', 'linguagens']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { shiftId, password } = req.body || {}
  if (!VALID_SHIFT_IDS.includes(shiftId)) return res.status(400).json({ error: 'invalid_shift' })

  const ip = clientIp(req)
  const bucketKey = `loginfail:shift:${shiftId}:${ip}`

  const fails = await loginFailCount(bucketKey)
  const delay = Math.min(400 + fails * 500, 6000)
  await new Promise(r => setTimeout(r, delay))

  const ok = isValidShiftPassword(shiftId, password)
  if (ok) await clearLoginFailures(bucketKey)
  else await recordLoginFailure(bucketKey, WINDOW_SECONDS)

  return res.json({ ok })
}
