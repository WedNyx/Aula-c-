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

function correctionKeyFor(shift, name) {
  return `correction:${shift || 'sem-turno'}:${safeName(name)}`
}

function teacherCodeKey(shift) {
  return `teachercode:${shift || 'matutino'}`
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

export async function setNudge(shift, name, text) {
  try {
    const r = await kvCall({ action: 'set', key: nudgeKeyFor(shift, name), value: JSON.stringify({ text, at: Date.now() }) })
    return r.ok === true
  } catch { return false }
}

export async function getNudge(shift, name) {
  try {
    const r = await kvCall({ action: 'get', key: nudgeKeyFor(shift, name) })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}

export async function setCorrection(shift, name, data) {
  try {
    const r = await kvCall({ action: 'set', key: correctionKeyFor(shift, name), value: JSON.stringify({ ...data, at: Date.now() }) })
    return r.ok === true
  } catch { return false }
}

export async function getCorrection(shift, name) {
  try {
    const r = await kvCall({ action: 'get', key: correctionKeyFor(shift, name) })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}

export async function clearCorrection(shift, name) {
  try { await kvCall({ action: 'delete', key: correctionKeyFor(shift, name) }) } catch {}
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

export async function resetAll(shift) {
  try {
    await kvCall({ action: 'set', key: resetFlagKey(shift || null), value: String(Date.now()) })
    const studentPrefix = shift ? `${PREFIX}${shift}:` : PREFIX
    const nudgePrefix = shift ? `nudge:${shift}:` : 'nudge:'
    await Promise.all([
      kvCall({ action: 'delete_by_prefix', prefix: studentPrefix }),
      kvCall({ action: 'delete_by_prefix', prefix: nudgePrefix }),
    ])
    await new Promise(r => setTimeout(r, 400))
    await Promise.all([
      kvCall({ action: 'delete_by_prefix', prefix: studentPrefix }),
      kvCall({ action: 'delete_by_prefix', prefix: nudgePrefix }),
    ])
    return true
  } catch { return false }
}

export async function getTeacherMeta() {
  const empty = { city: '', classDays: [], contentNames: {} }
  try {
    const r = await kvCall({ action: 'get', key: TEACHER_META_KEY })
    return r.value ? { ...empty, ...JSON.parse(r.value) } : empty
  } catch { return empty }
}

export async function saveTeacherMeta(meta) {
  try { await kvCall({ action: 'set', key: TEACHER_META_KEY, value: JSON.stringify(meta) }) } catch {}
}

export async function saveTeacherCode(files, shift) {
  try {
    const r = await kvCall({ action: 'set', key: teacherCodeKey(shift), value: JSON.stringify({ files, at: Date.now() }) })
    return r.ok === true
  } catch { return false }
}

export async function getTeacherCode(shift) {
  try {
    const r = await kvCall({ action: 'get', key: teacherCodeKey(shift) })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}

export async function getExamState() {
  try {
    const r = await kvCall({ action: 'get', key: 'exam:config' })
    return r.value ? JSON.parse(r.value) : { status: 'idle' }
  } catch { return { status: 'idle' } }
}

export async function setExamState(state) {
  try {
    await kvCall({ action: 'set', key: 'exam:config', value: JSON.stringify(state) })
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
