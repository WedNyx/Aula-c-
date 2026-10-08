import { useEffect, useRef, useState } from 'react'
import { Avatar } from './Avatar.jsx'
import { NyxDisplay } from './NyxDisplay.jsx'
import { joinClassroomLobby, leaveClassroomLobby } from '../storage.js'
import { shiftLabel } from '../lib/shifts.ts'

export function ClassroomLobby({ session, turmas, onGranted, onLogout }) {
  const [status, setStatus] = useState('connecting')
  const [joinedAt, setJoinedAt] = useState(Date.now())
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    let timer
    const check = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const result = await joinClassroomLobby(session.shift, session.name, session.avatar)
        if (!alive.current) return
        if (result.joinedAt) setJoinedAt(result.joinedAt)
        if (result.granted) {
          setStatus('granted')
          window.setTimeout(() => alive.current && onGranted(), 850)
        } else setStatus('waiting')
      } catch { if (alive.current) setStatus('error') }
    }
    const visible = () => { if (document.visibilityState === 'visible') check() }
    check()
    timer = window.setInterval(check, 6000)
    document.addEventListener('visibilitychange', visible)
    return () => { alive.current = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
  }, [session, onGranted])

  const leave = async () => {
    await leaveClassroomLobby(session.shift, session.name)
    onLogout()
  }
  const firstName = String(session.name || 'viajante').split(' ')[0]
  return <main className={`classroom-lobby classroom-lobby--${status}`}>
    <div className="classroom-lobby-stars" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i}/>)}</div>
    <section className="classroom-lobby-card" aria-labelledby="lobby-title">
      <div className="classroom-lobby-orbit" aria-hidden="true"><NyxDisplay variant="prisma" size={112}/></div>
      <small>SALA DE EMBARQUE</small>
      <h1 id="lobby-title">Você chegou, {firstName}!</h1>
      <p className="classroom-lobby-welcome">Seu lugar está reservado. O Nyx avisou ao professor que você está aqui.</p>
      <div className="classroom-lobby-student"><Avatar cfg={session.avatar} size={58} animated/><div><strong>{session.name}</strong><span>{shiftLabel(session.shift, turmas)}</span></div></div>
      <div className="classroom-lobby-status" role="status" aria-live="polite">
        <span className="classroom-lobby-pulse"/>
        <div><b>{status === 'granted' ? 'Portais liberados!' : status === 'error' ? 'Tentando reencontrar a turma…' : 'Aguardando o professor abrir os portões'}</b><small>{status === 'granted' ? 'Preparando seu painel…' : `Na sala desde ${new Date(joinedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`}</small></div>
      </div>
      <p className="classroom-lobby-tip">Enquanto espera, respire fundo. A aula começa no ritmo de todos. ✨</p>
      <button type="button" className="classroom-lobby-leave" onClick={leave}>Voltar e escolher outro perfil</button>
    </section>
  </main>
}
