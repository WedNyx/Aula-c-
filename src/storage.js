import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref, set, get, remove } from 'firebase/database'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let db = null
function getDb() {
  if (!db) {
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(config)
    db = getDatabase(app)
  }
  return db
}

export const isConfigured = () => !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_DATABASE_URL
)

function safeName(name) {
  return String(name || '').trim().replace(/\s+/g, '_').replace(/[.#$[\]/"'\\:]/g, '')
}

export async function saveStudent(shift, name, data) {
  if (!isConfigured()) return false
  try {
    await set(ref(getDb(), `students/${shift || 'sem-turno'}/${safeName(name)}`), JSON.stringify(data))
    return true
  } catch { return false }
}

export async function getStudent(shift, name) {
  if (!isConfigured()) return null
  try {
    const snap = await get(ref(getDb(), `students/${shift || 'sem-turno'}/${safeName(name)}`))
    return snap.exists() ? JSON.parse(snap.val()) : null
  } catch { return null }
}

export async function setNudge(shift, name, text) {
  if (!isConfigured()) return false
  try {
    await set(ref(getDb(), `nudges/${shift || 'sem-turno'}/${safeName(name)}`), JSON.stringify({ text, at: Date.now() }))
    return true
  } catch { return false }
}

export async function getNudge(shift, name) {
  if (!isConfigured()) return null
  try {
    const snap = await get(ref(getDb(), `nudges/${shift || 'sem-turno'}/${safeName(name)}`))
    return snap.exists() ? JSON.parse(snap.val()) : null
  } catch { return null }
}

export async function listStudents() {
  if (!isConfigured()) return []
  try {
    const snap = await get(ref(getDb(), 'students'))
    if (!snap.exists()) return []
    const out = []
    snap.forEach(shiftSnap => {
      shiftSnap.forEach(studentSnap => {
        try { out.push(JSON.parse(studentSnap.val())) } catch {}
      })
    })
    return out
  } catch { return [] }
}

export async function checkReset(shift, joinedAt) {
  if (!isConfigured()) return false
  try {
    for (const key of ['resets/all', `resets/${shift || 'sem-turno'}`]) {
      const snap = await get(ref(getDb(), key))
      if (snap.exists() && parseInt(snap.val()) > joinedAt) return true
    }
    return false
  } catch { return false }
}

export async function resetAll(shift) {
  if (!isConfigured()) return false
  try {
    await set(ref(getDb(), `resets/${shift || 'all'}`), String(Date.now()))
    await new Promise(r => setTimeout(r, 400))
    if (shift) {
      await remove(ref(getDb(), `students/${shift}`))
      await remove(ref(getDb(), `nudges/${shift}`))
    } else {
      await remove(ref(getDb(), 'students'))
      await remove(ref(getDb(), 'nudges'))
    }
    await new Promise(r => setTimeout(r, 400))
    if (shift) {
      await remove(ref(getDb(), `students/${shift}`))
      await remove(ref(getDb(), `nudges/${shift}`))
    } else {
      await remove(ref(getDb(), 'students'))
      await remove(ref(getDb(), 'nudges'))
    }
    return true
  } catch { return false }
}

export async function getTeacherMeta() {
  const empty = { city: '', classDays: [], contentNames: {} }
  if (!isConfigured()) return empty
  try {
    const snap = await get(ref(getDb(), 'teacher/meta'))
    return snap.exists() ? { ...empty, ...JSON.parse(snap.val()) } : empty
  } catch { return empty }
}

export async function saveTeacherMeta(meta) {
  if (!isConfigured()) return
  try { await set(ref(getDb(), 'teacher/meta'), JSON.stringify(meta)) } catch {}
}

export async function saveTeacherCode(files) {
  if (!isConfigured()) return false
  try {
    await set(ref(getDb(), 'teacher/code'), JSON.stringify({ files, at: Date.now() }))
    return true
  } catch { return false }
}

export async function getTeacherCode() {
  if (!isConfigured()) return null
  try {
    const snap = await get(ref(getDb(), 'teacher/code'))
    return snap.exists() ? JSON.parse(snap.val()) : null
  } catch { return null }
}

export async function diagnose() {
  const configured = isConfigured()
  const out = { hasStorage: configured, configured, writeRead: '—', listOk: false, keys: [], err: '' }
  if (!configured) {
    out.err = 'Firebase não configurado. Adicione VITE_FIREBASE_API_KEY e VITE_FIREBASE_DATABASE_URL nas variáveis de ambiente do Vercel.'
    return out
  }
  try {
    await set(ref(getDb(), 'diag/ping'), String(Date.now()))
    const snap = await get(ref(getDb(), 'diag/ping'))
    out.writeRead = snap.exists() ? 'ok' : 'leitura vazia'
  } catch (e) {
    out.writeRead = 'erro'
    out.err = String(e?.message || e)
  }
  try {
    await get(ref(getDb(), 'students'))
    out.listOk = true
  } catch (e) {
    out.err = out.err || String(e?.message || e)
  }
  return out
}
