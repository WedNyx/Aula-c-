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

// chave ÚNICA do contador de tentativas erradas da senha do professor, compartilhada por TODOS os
// endpoints que checam essa mesma senha (auth.js, kv.js, backup.js, setup-db.js). Cada um tinha seu
// próprio contador isolado antes — um atacante testando a senha em paralelo contra os 4 diluía o
// atraso crescente em ~4x, já que cada endpoint só via 1/4 das tentativas de verdade.
export function teacherLoginFailBucket(ip) {
  return `loginfail:teacher:${ip}`
}
