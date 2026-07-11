// Verificação compartilhada da senha do professor — usada tanto pelo login (api/auth.js)
// quanto pelas ações privilegiadas do banco de dados (api/kv.js), pra garantir que os dois
// lugares concordem sobre qual é a senha válida (variável TEACHER_PASSWORD no Vercel).

const DEFAULT_TEACHER_PASSWORD = 'M1n3cr@ft2006'

export function expectedTeacherPassword() {
  return process.env.TEACHER_PASSWORD || DEFAULT_TEACHER_PASSWORD
}

export function isValidTeacherPassword(password) {
  return typeof password === 'string' && password === expectedTeacherPassword()
}
