const PREFIX = 'student:'
const TEACHER_META_KEY = 'teachermeta:main'

async function kvCall(body) {
  const resp = await fetch('/api/kv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`KV error ${resp.status}`)
  return resp.json()
}

function safeName(name) {
  return String(name || '').trim().replace(/\s+/g, '_').replace(/["'\/\\:]/g, '')
}

function nameToKey(shift, name) {
  return `${PREFIX}${shift || 'sem-turno'}:${safeName(name)}`
}

function nudgeKeyFor(shift, name) {
  return `nudge:${shift || 'sem-turno'}:${safeName(name)}`
}

function teacherCodeKey(shift) {
  return `teachercode:${shift || 'matutino'}`
}

function curiosityKey(dateStr) {
  return `curiosity:${dateStr}`
}

const DUEL_PREFIX = 'duel:'
function duelKeyFor(shift, nameA, nameB) {
  const [x, y] = [safeName(nameA), safeName(nameB)].sort()
  return `${DUEL_PREFIX}${shift || 'sem-turno'}:${x}__${y}`
}

function resetFlagKey(shift) {
  return shift ? `classroom_reset_flag:${shift}` : 'classroom_reset_flag'
}

export async function saveStudent(shift, name, data) {
  try {
    const r = await kvCall({ action: 'set', key: nameToKey(shift, name), value: JSON.stringify(data) })
    return r.ok === true
  } catch { return false }
}

export async function getStudent(shift, name) {
  try {
    const r = await kvCall({ action: 'get', key: nameToKey(shift, name) })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}

export async function setNudge(shift, name, text, auth) {
  try {
    const r = await kvCall({ action: 'set', key: nudgeKeyFor(shift, name), value: JSON.stringify({ text, at: Date.now() }), auth })
    return r.ok === true
  } catch { return false }
}

export async function getNudge(shift, name) {
  try {
    const r = await kvCall({ action: 'get', key: nudgeKeyFor(shift, name) })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}

// ── modo guiado (acessibilidade): flag por aluno, ligada pelo professor — fica numa chave separada
// para o heartbeat do aluno (que resalva o registro inteiro a cada poucos segundos) nunca sobrescrever
// uma mudança feita pelo professor enquanto a aba do aluno já está aberta ──
function accessModeKeyFor(shift, name) {
  return `accessmode:${shift || 'sem-turno'}:${safeName(name)}`
}
export async function getAccessMode(shift, name) {
  try {
    const r = await kvCall({ action: 'get', key: accessModeKeyFor(shift, name) })
    return r.value === '1'
  } catch { return false }
}
export async function setAccessMode(shift, name, value, auth) {
  try {
    const r = await kvCall({ action: 'set', key: accessModeKeyFor(shift, name), value: value ? '1' : '0', auth })
    return r.ok === true
  } catch { return false }
}

// ── perfis de apoio (educação inclusiva): flags por aluno, ligadas pelo professor ──
// sensorial = modo calmo (sem sons/festa) · foco = esconde ranking/loja/duelos ·
// leitura = texto mais espaçado · ritmo = atividade reduzida (4 questões diretas)
function supportKeyFor(shift, name) {
  return `support:${shift || 'sem-turno'}:${safeName(name)}`
}
export async function getSupport(shift, name) {
  try {
    const r = await kvCall({ action: 'get', key: supportKeyFor(shift, name) })
    return r.value ? JSON.parse(r.value) : {}
  } catch { return {} }
}
export async function setSupport(shift, name, flags, auth) {
  try {
    const r = await kvCall({ action: 'set', key: supportKeyFor(shift, name), value: JSON.stringify(flags || {}), auth })
    return r.ok === true
  } catch { return false }
}
// ── chefão da turma (evento do telão): a turma causa "dano" ganhando pontos ──
const BOSS_KEY = 'boss:config'
export async function getBoss() {
  try {
    const r = await kvCall({ action: 'get', key: BOSS_KEY })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}
export async function setBoss(state, auth) {
  try {
    const r = await kvCall({ action: 'set', key: BOSS_KEY, value: JSON.stringify(state), auth })
    return r.ok === true
  } catch { return false }
}
export async function clearBoss(auth) {
  try { await kvCall({ action: 'delete', key: BOSS_KEY, auth }) } catch {}
}

// 🏟️ torneio da turma (chaveamento no telão): só o professor escreve; os alunos leem no tick
// e respondem gravando a pontuação no PRÓPRIO perfil (tourneyAnswer), que o telão apura
const TOURNEY_KEY = 'tourney:config'
export async function getTourney() {
  try {
    const r = await kvCall({ action: 'get', key: TOURNEY_KEY })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}
export async function setTourney(state, auth) {
  try {
    const r = await kvCall({ action: 'set', key: TOURNEY_KEY, value: JSON.stringify(state), auth })
    return r.ok === true
  } catch { return false }
}
export async function clearTourney(auth) {
  try { await kvCall({ action: 'delete', key: TOURNEY_KEY, auth }) } catch {}
}

// 🎉 quiz estilo Kahoot: temas criados pelo professor + a sala ativa (código, pergunta atual, fase).
// Só o professor escreve (prefixo quiz: protegido por senha no servidor); os alunos leem a sala no
// polling e respondem gravando no PRÓPRIO perfil (quizJoin/quizAnswers), que o telão do professor apura
const QUIZ_THEMES_KEY = 'quiz:themes'
const QUIZ_ROOM_KEY = 'quiz:room'
export async function getQuizThemes() {
  try {
    const r = await kvCall({ action: 'get', key: QUIZ_THEMES_KEY })
    return r.value ? JSON.parse(r.value) : []
  } catch { return [] }
}
export async function saveQuizThemes(themes, auth) {
  try {
    const r = await kvCall({ action: 'set', key: QUIZ_THEMES_KEY, value: JSON.stringify(themes || []), auth })
    return r.ok === true
  } catch { return false }
}
export async function getQuizRoom() {
  try {
    const r = await kvCall({ action: 'get', key: QUIZ_ROOM_KEY })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}
export async function setQuizRoom(state, auth) {
  try {
    const r = await kvCall({ action: 'set', key: QUIZ_ROOM_KEY, value: JSON.stringify(state), auth })
    return r.ok === true
  } catch { return false }
}
export async function clearQuizRoom(auth) {
  try { await kvCall({ action: 'delete', key: QUIZ_ROOM_KEY, auth }) } catch {}
}

// backup completo: baixa TODAS as chaves do banco (menos as técnicas) num JSON —
// seguro contra acidente e histórico permanente antes de resetar a turma de uma cidade
export async function exportAllData() {
  const r = await kvCall({ action: 'list_with_values', prefix: '' })
  const data = {}
  for (const item of r.items || []) {
    if (/^(ratelimit:|aihealth)/.test(item.key)) continue // contadores técnicos não interessam
    data[item.key] = item.value
  }
  return data
}

// todos os perfis de apoio de uma vez (pro indicador 💙 nos tiles do monitoramento)
export async function listAllSupport() {
  try {
    const r = await kvCall({ action: 'list_with_values', prefix: 'support:' })
    const map = {}
    for (const item of r.items || []) {
      const flags = JSON.parse(item.value || '{}')
      map[item.key.replace(/^support:/, '')] = flags // chave: "turno:nome"
    }
    return map
  } catch { return {} }
}

// ── vistoria: libera um aluno específico fora do horário automático da aula ──
function inspectionKeyFor(shift, name) {
  return `inspection:${shift || 'sem-turno'}:${safeName(name)}`
}
export async function getInspection(shift, name) {
  try {
    const r = await kvCall({ action: 'get', key: inspectionKeyFor(shift, name) })
    return r.value === '1'
  } catch { return false }
}
export async function setInspection(shift, name, value, auth) {
  try {
    const r = await kvCall({ action: 'set', key: inspectionKeyFor(shift, name), value: value ? '1' : '0', auth })
    return r.ok === true
  } catch { return false }
}

// ── 🏆 Hall da Fama: uma "placa" por cidade encerrada, visível para os alunos das próximas cidades ──
const HALL_KEY = 'hall:entries'
export async function getHallOfFame() {
  try {
    const r = await kvCall({ action: 'get', key: HALL_KEY })
    return r.value ? JSON.parse(r.value) : []
  } catch { return [] }
}
export async function saveHallOfFame(entries, auth) {
  try {
    const r = await kvCall({ action: 'set', key: HALL_KEY, value: JSON.stringify(entries || []), auth })
    return r.ok === true
  } catch { return false }
}

// ── ⌨️ tutorial de teclado: o professor "empurra" a abertura da tela pro aluno específico ──
function kbLaunchKeyFor(shift, name) {
  return `kblaunch:${shift || 'sem-turno'}:${safeName(name)}`
}
export async function setKeyboardLaunch(shift, name, auth) {
  try {
    const r = await kvCall({ action: 'set', key: kbLaunchKeyFor(shift, name), value: String(Date.now()), auth })
    return r.ok === true
  } catch { return false }
}
export async function getKeyboardLaunch(shift, name) {
  try {
    const r = await kvCall({ action: 'get', key: kbLaunchKeyFor(shift, name) })
    return r.value ? parseInt(r.value, 10) : null
  } catch { return null }
}

// ── travas do Nyx acionadas pelo professor no chat (zek / zeker) ──
const NYX_LOCKS_KEY = 'nyxlocks:global'
export async function getNyxLocks() {
  try {
    const r = await kvCall({ action: 'get', key: NYX_LOCKS_KEY })
    return r.value ? JSON.parse(r.value) : { zek: false, zeker: false }
  } catch { return { zek: false, zeker: false } }
}
export async function setNyxLocks(patch, auth) {
  try {
    const cur = await getNyxLocks()
    await kvCall({ action: 'set', key: NYX_LOCKS_KEY, value: JSON.stringify({ ...cur, ...patch, at: Date.now() }), auth })
    return true
  } catch { return false }
}

// ── gestão de alunos pelo professor ──
// nota: patchStudent escreve na MESMA chave que o próprio aluno usa pra salvar o progresso dele
// (student:turno:nome), então essa escrita continua sem exigir senha — do contrário o autosave
// do aluno quebraria. A senha do professor protege as ações que só ELE faz (ver kv.js).
export async function patchStudent(shift, name, patch) {
  try {
    const cur = await getStudent(shift, name)
    if (!cur) return false
    const r = await kvCall({ action: 'set', key: nameToKey(shift, name), value: JSON.stringify({ ...cur, ...patch }) })
    return r.ok === true
  } catch { return false }
}

export async function deleteStudentProfile(shift, name, auth) {
  try {
    await kvCall({ action: 'delete', key: nameToKey(shift, name), auth })
    return true
  } catch { return false }
}

// desloga um aluno específico (usado após renomear/mover/excluir para a sessão antiga não recriar o perfil)
function kickKeyFor(shift, name) {
  return `kick:${shift || 'sem-turno'}:${safeName(name)}`
}
export async function setKick(shift, name, auth) {
  try { await kvCall({ action: 'set', key: kickKeyFor(shift, name), value: String(Date.now()), auth }) } catch {}
}
export async function checkKick(shift, name, joinedAt) {
  try {
    const r = await kvCall({ action: 'get', key: kickKeyFor(shift, name) })
    return !!(r.value && parseInt(r.value) > joinedAt)
  } catch { return false }
}

// correção de nota para aluno online (a sessão dele aplica e limpa a flag)
function scoreFixKeyFor(shift, name) {
  return `scorefix:${shift || 'sem-turno'}:${safeName(name)}`
}
// aceita um número (correção de nota da atividade, uso original) ou um objeto
// (ex: { kind:'exam', score } pra devolver pontos da prova, { kind:'exam-appeal-rejected' } pra recusar defesa)
export async function setScoreFix(shift, name, score, auth) {
  try {
    const payload = (score && typeof score === 'object') ? { ...score, at: Date.now() } : { score, at: Date.now() }
    await kvCall({ action: 'set', key: scoreFixKeyFor(shift, name), value: JSON.stringify(payload), auth })
  } catch {}
}
export async function getScoreFix(shift, name) {
  try {
    const r = await kvCall({ action: 'get', key: scoreFixKeyFor(shift, name) })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}
export async function clearScoreFix(shift, name) {
  try { await kvCall({ action: 'delete', key: scoreFixKeyFor(shift, name) }) } catch {}
}

export async function getDailyCuriosity(dateStr) {
  try {
    const r = await kvCall({ action: 'get', key: curiosityKey(dateStr) })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}

export async function setDailyCuriosity(dateStr, text) {
  try {
    await kvCall({ action: 'set', key: curiosityKey(dateStr), value: JSON.stringify({ text, at: Date.now() }) })
    return true
  } catch { return false }
}

export async function setDuel(shift, nameA, nameB, data) {
  try {
    const r = await kvCall({ action: 'set', key: duelKeyFor(shift, nameA, nameB), value: JSON.stringify(data) })
    return r.ok === true
  } catch { return false }
}

export async function getDuel(shift, nameA, nameB) {
  try {
    const r = await kvCall({ action: 'get', key: duelKeyFor(shift, nameA, nameB) })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}

export async function clearDuel(shift, nameA, nameB) {
  try { await kvCall({ action: 'delete', key: duelKeyFor(shift, nameA, nameB) }) } catch {}
}

export async function listDuels(shift) {
  try {
    const r = await kvCall({ action: 'list_with_values', prefix: `${DUEL_PREFIX}${shift || 'sem-turno'}:` })
    return (r.items || [])
      .map(item => { try { return JSON.parse(item.value) } catch { return null } })
      .filter(Boolean)
  } catch { return [] }
}

export async function listStudents() {
  try {
    const r = await kvCall({ action: 'list_with_values', prefix: PREFIX })
    return (r.items || [])
      .map(item => { try { return JSON.parse(item.value) } catch { return null } })
      .filter(Boolean)
  } catch { return [] }
}

export async function checkReset(shift, joinedAt) {
  try {
    for (const key of [resetFlagKey(null), resetFlagKey(shift)]) {
      const r = await kvCall({ action: 'get', key })
      if (r.value && parseInt(r.value) > joinedAt) return true
    }
    return false
  } catch { return false }
}

export async function resetAll(shift, auth) {
  try {
    await kvCall({ action: 'set', key: resetFlagKey(shift || null), value: String(Date.now()), auth })
    const studentPrefix = shift ? `${PREFIX}${shift}:` : PREFIX
    const nudgePrefix = shift ? `nudge:${shift}:` : 'nudge:'
    await Promise.all([
      kvCall({ action: 'delete_by_prefix', prefix: studentPrefix, auth }),
      kvCall({ action: 'delete_by_prefix', prefix: nudgePrefix, auth }),
    ])
    await new Promise(r => setTimeout(r, 400))
    await Promise.all([
      kvCall({ action: 'delete_by_prefix', prefix: studentPrefix, auth }),
      kvCall({ action: 'delete_by_prefix', prefix: nudgePrefix, auth }),
    ])
    return true
  } catch { return false }
}

// horário padrão das aulas, informado pelo professor — já vem preenchido de fábrica e vale
// enquanto ele não salvar outro no Calendário (o que ele salvar por cidade sempre vence;
// deixar um campo em branco por lá continua desligando a trava daquele turno)
const DEFAULT_SCHEDULE = {
  matutino:   { start: '09:00', end: '11:50', breakStart: '10:45', breakMin: '15' },
  vespertino: { start: '14:00', end: '16:50', breakStart: '15:45', breakMin: '15' },
}

export async function getTeacherMeta() {
  const empty = { city: '', classDays: [], contentNames: {} }
  try {
    const r = await kvCall({ action: 'get', key: TEACHER_META_KEY })
    const m = r.value ? { ...empty, ...JSON.parse(r.value) } : empty
    m.schedule = {
      matutino: { ...DEFAULT_SCHEDULE.matutino, ...((m.schedule || {}).matutino || {}) },
      vespertino: { ...DEFAULT_SCHEDULE.vespertino, ...((m.schedule || {}).vespertino || {}) },
    }
    return m
  } catch { return empty } // sem conexão, sem trava — uma queda de rede não pode trancar aluno
}

export async function saveTeacherMeta(meta, auth) {
  try { await kvCall({ action: 'set', key: TEACHER_META_KEY, value: JSON.stringify(meta), auth }) } catch {}
}

export async function saveTeacherCode(files, shift, auth) {
  try {
    const r = await kvCall({ action: 'set', key: teacherCodeKey(shift), value: JSON.stringify({ files, at: Date.now() }), auth })
    return r.ok === true
  } catch { return false }
}

// ── biblioteca de aulas do PROFESSOR: aulas que ele salvou do próprio editor ──
// (chave sob teachercode: → escrita protegida pela senha do professor no servidor)
const TEACHER_LESSONS_KEY = 'teachercode:lessons'
export async function getTeacherLessons() {
  try {
    const r = await kvCall({ action: 'get', key: TEACHER_LESSONS_KEY })
    return r.value ? JSON.parse(r.value) : []
  } catch { return [] }
}
export async function saveTeacherLessons(lessons, auth) {
  try {
    const r = await kvCall({ action: 'set', key: TEACHER_LESSONS_KEY, value: JSON.stringify(lessons || []), auth })
    return r.ok === true
  } catch { return false }
}

export async function getTeacherCode(shift) {
  try {
    const r = await kvCall({ action: 'get', key: teacherCodeKey(shift) })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}

// ── envio do código da turma para UM aluno específico, escolhido pelo professor ──
function codeSendKeyFor(shift, name) {
  return `codesend:${shift || 'sem-turno'}:${safeName(name)}`
}
export async function setCodeSend(shift, name, files, auth) {
  try {
    const r = await kvCall({ action: 'set', key: codeSendKeyFor(shift, name), value: JSON.stringify({ files, at: Date.now() }), auth })
    return r.ok === true
  } catch { return false }
}
export async function getCodeSend(shift, name) {
  try {
    const r = await kvCall({ action: 'get', key: codeSendKeyFor(shift, name) })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}

// ── saúde do Nyx (IA): toda chamada de qualquer aluno/professor reporta aqui — o painel do
// professor usa isso pra mostrar "Reconectando Nyx" quando a última chamada de alguém falhou ──
const AI_HEALTH_KEY = 'ai:health'
const aiHealthProviderKey = (provider) => `ai:health:${provider}`
// "provider" é opcional — quando informado (chamadas explícitas do botão de análise), também grava
// a saúde DAQUELE modelo específico, pro indicador do painel do professor mostrar Nemotron/Laguna
// separados; a chave geral continua servendo pro aviso "Reconectando Nyx" (qualquer modelo)
export async function reportAiHealth(ok, provider) {
  try { await kvCall({ action: 'set', key: AI_HEALTH_KEY, value: JSON.stringify({ ok, at: Date.now() }) }) } catch {}
  if (provider) {
    try { await kvCall({ action: 'set', key: aiHealthProviderKey(provider), value: JSON.stringify({ ok, at: Date.now() }) }) } catch {}
  }
}
export async function getAiHealth() {
  try {
    const r = await kvCall({ action: 'get', key: AI_HEALTH_KEY })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}
export async function getAiHealthByProvider(provider) {
  try {
    const r = await kvCall({ action: 'get', key: aiHealthProviderKey(provider) })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}
export async function clearCodeSend(shift, name) {
  try { await kvCall({ action: 'delete', key: codeSendKeyFor(shift, name) }) } catch {}
}

// ── 🤝 parceiro de código: pareamento de ajuda sugerido/aprovado pelo professor — o aluno com
// dificuldade vira "ajudado", um colega livre vira "ajudante" e pode ver o código dele (só leitura)
// até marcar como resolvido; os dois ganham pontos. Chave por ALUNO AJUDADO (só uma parceria ativa
// por vez pra ele); sem proteção de senha porque o próprio ajudante precisa poder marcar como
// resolvido de dentro da sessão dele, igual ao duelo (duel:) ──
const PARTNER_PREFIX = 'partner:'
function partnerKeyFor(shift, helpedName) {
  return `${PARTNER_PREFIX}${shift || 'sem-turno'}:${safeName(helpedName)}`
}
export async function setPartner(shift, helpedName, data) {
  try {
    const r = await kvCall({ action: 'set', key: partnerKeyFor(shift, helpedName), value: JSON.stringify(data) })
    return r.ok === true
  } catch { return false }
}
export async function getPartner(shift, helpedName) {
  try {
    const r = await kvCall({ action: 'get', key: partnerKeyFor(shift, helpedName) })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}
export async function clearPartner(shift, helpedName) {
  try { await kvCall({ action: 'delete', key: partnerKeyFor(shift, helpedName) }) } catch {}
}
export async function listPartners(shift) {
  try {
    const r = await kvCall({ action: 'list_with_values', prefix: `${PARTNER_PREFIX}${shift || 'sem-turno'}:` })
    return (r.items || [])
      .map(item => { try { return JSON.parse(item.value) } catch { return null } })
      .filter(Boolean)
  } catch { return [] }
}

export async function getExamState() {
  try {
    const r = await kvCall({ action: 'get', key: 'exam:config' })
    return r.value ? JSON.parse(r.value) : { status: 'idle' }
  } catch { return { status: 'idle' } }
}

export async function setExamState(state, auth) {
  try {
    await kvCall({ action: 'set', key: 'exam:config', value: JSON.stringify(state), auth })
    return true
  } catch { return false }
}

export async function diagnose() {
  const out = { hasStorage: true, configured: true, writeRead: '—', listOk: false, keys: [], err: '', hasAI: null }

  // Verifica variáveis de ambiente (ação rápida, sem gastar nada)
  try {
    const ck = await kvCall({ action: 'check' })
    if (!ck.configured) {
      out.hasStorage = false
      out.configured = false
      out.writeRead = 'não configurado'
      out.err = 'Banco não configurado. Adicione SUPABASE_URL + SUPABASE_SERVICE_KEY + DATABASE_PASSWORD no Vercel.'
    }
  } catch (e) {
    out.hasStorage = false
    out.configured = false
    out.writeRead = 'erro'
    out.err = String(e?.message || e)
  }

  // Testa escrita/leitura só se parece configurado
  if (out.configured) {
    try {
      await kvCall({ action: 'set', key: 'diag:ping', value: String(Date.now()) })
      const r = await kvCall({ action: 'get', key: 'diag:ping' })
      out.writeRead = r.value ? 'ok' : 'leitura vazia'
    } catch (e) {
      out.writeRead = 'erro'
      out.hasStorage = false
      out.err = String(e?.message || e)
    }
  }

  // Verifica se a chave da IA está configurada (GET, sem gastar tokens)
  try {
    const r = await fetch('/api/claude')
    const d = await r.json()
    out.hasAI = !!d.configured
  } catch { out.hasAI = null }

  // Lista chaves existentes
  try {
    const r = await kvCall({ action: 'list_with_values', prefix: PREFIX })
    out.keys = (r.items || []).map(i => i.key)
    out.listOk = true
  } catch (e) {
    out.err = out.err || String(e?.message || e)
  }

  return out
}
