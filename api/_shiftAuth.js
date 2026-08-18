// Senhas da turma de teste e da sala de linguagens — ficam só aqui, no SERVIDOR, nunca no pacote
// JavaScript que chega ao navegador (antes eram exportadas de src/lib/shifts.ts e comparadas no
// próprio LoginScreen.jsx, o que deixava as duas senhas legíveis por qualquer um que abrisse o
// bundle nas ferramentas do navegador).

const SHIFT_PASSWORDS = {
  teste: process.env.TEST_SHIFT_PASSWORD || 'T3steSystem',
  linguagens: process.env.LANG_SHIFT_PASSWORD || 'MultiLang2026',
}

export function isValidShiftPassword(shiftId, password) {
  const expected = SHIFT_PASSWORDS[shiftId]
  return typeof expected === 'string' && typeof password === 'string' && password === expected
}
