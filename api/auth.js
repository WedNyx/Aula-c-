// Autenticação do professor: a senha fica no SERVIDOR (variável de ambiente TEACHER_PASSWORD no Vercel),
// nunca no código que chega ao navegador dos alunos.
// Se a variável não estiver configurada, usa a senha padrão — configure TEACHER_PASSWORD no Vercel para trocá-la.

import { isValidTeacherPassword } from './_teacherAuth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password } = req.body || {}
  // pequena espera fixa para dificultar adivinhação por tentativa e erro
  await new Promise(r => setTimeout(r, 400))
  return res.json({ ok: isValidTeacherPassword(password) })
}
