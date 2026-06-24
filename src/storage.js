const PREFIX = 'student:'
const TEACHER_META_KEY = 'teachermeta:main'
const TEACHER_CODE_KEY = 'teachercode:main'

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

export async function saveTeacherCode(files) {
  try {
    const r = await kvCall({ action: 'set', key: TEACHER_CODE_KEY, value: JSON.stringify({ files, at: Date.now() }) })
    return r.ok === true
  } catch { return false }
}

export async function getTeacherCode() {
  try {
    const r = await kvCall({ action: 'get', key: TEACHER_CODE_KEY })
    return r.value ? JSON.parse(r.value) : null
  } catch { return null }
}

export async function diagnose() {
  const out = { hasStorage: true, configured: true, writeRead: '—', listOk: false, keys: [], err: '' }
  try {
    await kvCall({ action: 'set', key: 'diag:ping', value: String(Date.now()) })
    const r = await kvCall({ action: 'get', key: 'diag:ping' })
    out.writeRead = r.value ? 'ok' : 'leitura vazia'
  } catch (e) {
    out.writeRead = 'erro'
    out.hasStorage = false
    out.configured = false
    out.err = String(e?.message || e)
  }
  try {
    const r = await kvCall({ action: 'list_with_values', prefix: PREFIX })
    out.keys = (r.items || []).map(i => i.key)
    out.listOk = true
  } catch (e) {
    out.err = out.err || String(e?.message || e)
  }
  return out
}
