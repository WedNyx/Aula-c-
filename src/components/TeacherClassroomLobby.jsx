import { useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar } from './Avatar.jsx'
import { getClassroomLobby, grantClassroomLobbyStudent, setClassroomLobbyGate } from '../storage.js'

export function TeacherClassroomLobby({ teacherAuth, turmas, shiftFilter = 'all', compact = false }) {
  const [data, setData] = useState({ waiting: [], states: {} })
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    if (document.visibilityState === 'hidden') return
    try { setData(await getClassroomLobby(teacherAuth)); setError('') }
    catch { setError('Não consegui atualizar a sala de embarque.') }
  }, [teacherAuth])
  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, 5000)
    const visible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', visible)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
  }, [refresh])
  const shownTurmas = useMemo(() => turmas.filter(t => shiftFilter === 'all' || t.id === shiftFilter), [turmas, shiftFilter])
  const act = async (id, fn) => { setBusy(id); try { await fn(); await refresh() } finally { setBusy('') } }
  const total = data.waiting?.filter(w => shownTurmas.some(t => t.id === w.turmaId)).length || 0
  return <section className={`teacher-lobby ${compact ? 'teacher-lobby--compact' : ''}`} aria-labelledby="teacher-lobby-title">
    <header><div><small>🚪 SALA DE EMBARQUE</small><h2 id="teacher-lobby-title">{total ? `${total} aluno${total === 1 ? '' : 's'} aguardando` : 'Portões da turma'}</h2></div><span aria-live="polite">{total} na espera</span></header>
    {error && <p className="teacher-lobby-error">{error}</p>}
    <div className="teacher-lobby-groups">{shownTurmas.map(turma => {
      const waiting = (data.waiting || []).filter(w => w.turmaId === turma.id)
      const open = data.states?.[turma.id]?.open === true
      return <article key={turma.id}>
        <div className="teacher-lobby-group-head"><div><b>{turma.emoji || '🌙'} {turma.label}</b><small>{open ? 'Entrada livre' : waiting.length ? 'Esperando sua liberação' : 'Portões fechados'}</small></div><button type="button" disabled={!!busy} className={open ? 'close' : 'open'} onClick={()=>act(`gate:${turma.id}`,()=>setClassroomLobbyGate(turma.id,!open,teacherAuth))}>{busy === `gate:${turma.id}` ? 'Aguarde…' : open ? '🔒 Fechar portões' : '✨ Liberar turma'}</button></div>
        {waiting.length > 0 && <ul>{waiting.map(student => <li key={`${student.turmaId}:${student.name}`}><Avatar cfg={student.avatar} size={38}/><div><b>{student.name}</b><small>Chegou às {new Date(student.joinedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></div><button type="button" disabled={!!busy} onClick={()=>act(`student:${student.name}`,()=>grantClassroomLobbyStudent(student.turmaId,student.name,teacherAuth))}>{busy === `student:${student.name}` ? 'Liberando…' : 'Liberar'}</button></li>)}</ul>}
      </article>
    })}</div>
  </section>
}
