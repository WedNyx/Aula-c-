// IP do cliente pra bucket de rate-limit/lockout — usado em toda tentativa de senha e limite de uso.
// "x-forwarded-for" pode ter vários IPs separados por vírgula (cada proxy no caminho ACRESCENTA o
// seu). O primeiro da lista é o que o CLIENTE mandou — ou seja, qualquer um pode escrever esse
// cabeçalho com o valor que quiser antes de chegar na borda da Vercel, fingindo ser outro IP pra
// escapar do bloqueio por tentativas seguidas de senha errada. A Vercel sempre ACRESCENTA a conexão
// real no FINAL da lista (não dá pra um cliente sobrescrever isso) — "x-real-ip" é ainda mais direto,
// só esse valor, quando presente. Por isso: x-real-ip primeiro, senão o ÚLTIMO da lista de
// x-forwarded-for, nunca o primeiro.
export function clientIp(req) {
  const realIp = req.headers && req.headers['x-real-ip']
  if (realIp) return String(realIp).trim()
  const xff = req.headers && req.headers['x-forwarded-for']
  if (xff) {
    const parts = String(xff).split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return req.socket?.remoteAddress || 'unknown'
}
