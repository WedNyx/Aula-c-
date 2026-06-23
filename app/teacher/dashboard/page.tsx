'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, ClassType } from '@/lib/store'
import { Monitor, AlertTriangle, CheckCircle, Clock, Code, BookOpen, HelpCircle, Flag, ChevronLeft } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  editor: { label: 'Codando', color: '#1f6feb', icon: <Code size={14} /> },
  resumo: { label: 'No Resumo', color: '#d29922', icon: <BookOpen size={14} /> },
  atividades: { label: 'Nas Atividades', color: '#bc8cff', icon: <HelpCircle size={14} /> },
  concluido: { label: 'Concluído', color: '#238636', icon: <CheckCircle size={14} /> },
}

export default function TeacherDashboard() {
  const router = useRouter()
  const { students, activeStudentStatuses, sessions, attendance } = useAppStore()
  const [filterClass, setFilterClass] = useState<ClassType | 'all'>('all')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000)
    return () => clearInterval(interval)
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const todayAttendance = attendance.filter(a => a.date === today)
  const filtered = students.filter(s => filterClass === 'all' || s.classType === filterClass)

  const getStudentStatus = (studentId: string) => activeStudentStatuses[studentId] || 'offline'
  const getStudentPerformance = (studentId: string) => sessions.find(s => s.studentId === studentId && s.date === today)

  const presentCount = todayAttendance.filter(a => a.status === 'presente').length
  const doingWork = filtered.filter(s => ['editor', 'resumo', 'atividades', 'concluido'].includes(getStudentStatus(s.id))).length
  const needHelp = filtered.filter(s => { const session = getStudentPerformance(s.id); return session && session.status === 'coding' }).length

  return (
    <div className="min-h-screen" style={{ background: '#0d1117' }}>
      <div className="border-b px-6 py-3 flex items-center justify-between" style={{ background: '#161b22', borderColor: '#30363d' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/teacher')} style={{ color: '#8b949e' }}><ChevronLeft size={20} /></button>
          <Monitor size={18} color="#1f6feb" />
          <span className="font-semibold" style={{ color: '#e6edf3' }}>Dashboard de Monitoramento</span>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#23863620', color: '#3fb950' }}>● Ao vivo</span>
          {(['all', 'matutino', 'vespertino'] as const).map(c => (
            <button key={c} onClick={() => setFilterClass(c)} className="text-xs px-3 py-1 rounded-full"
              style={{ background: filterClass === c ? '#1f6feb' : '#21262d', color: filterClass === c ? 'white' : '#8b949e' }}
            >
              {c === 'all' ? 'Todas' : c === 'matutino' ? 'Matutino' : 'Vespertino'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Alunos Hoje', value: presentCount, color: '#1f6feb', icon: <Monitor size={18} /> },
            { label: 'Fazendo Atividade', value: doingWork, color: '#238636', icon: <CheckCircle size={18} /> },
            { label: 'Precisam de Ajuda', value: needHelp, color: '#d29922', icon: <AlertTriangle size={18} /> },
            { label: 'Total de Alunos', value: filtered.length, color: '#8b949e', icon: <Flag size={18} /> },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-xl border" style={{ background: '#161b22', borderColor: '#30363d' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: stat.color }}>{stat.icon}</span>
                <span className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
              </div>
              <p className="text-xs" style={{ color: '#8b949e' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 rounded-xl border text-center" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <Monitor size={48} color="#30363d" className="mx-auto mb-3" />
            <p style={{ color: '#8b949e' }}>Nenhum aluno cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.sort((a, b) => a.fullName.localeCompare(b.fullName)).map(student => {
              const status = getStudentStatus(student.id)
              const session = getStudentPerformance(student.id)
              const att = todayAttendance.find(a => a.studentId === student.id)
              const statusInfo = STATUS_MAP[status]
              const isInactive = status === 'offline' || !statusInfo
              return (
                <div key={student.id} className="p-4 rounded-xl border"
                  style={{ background: '#161b22', borderColor: isInactive ? '#30363d' : (statusInfo?.color || '#30363d') + '60' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#e6edf3' }}>{student.fullName}</p>
                      <p className="text-xs capitalize" style={{ color: '#8b949e' }}>{student.classType}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: isInactive ? '#21262d' : (statusInfo?.color || '#30363d') + '20', color: isInactive ? '#8b949e' : statusInfo?.color || '#8b949e' }}
                    >
                      {isInactive ? <><Clock size={10} /> Offline</> : <>{statusInfo.icon} {statusInfo.label}</>}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span style={{ color: '#8b949e' }}>Presença:</span>
                      <span style={{ color: att?.status === 'presente' ? '#3fb950' : '#f85149' }}>
                        {att?.status === 'presente' ? '✓ Presente' : att?.status === 'falta' ? '✗ Falta' : '— Não marcado'}
                      </span>
                    </div>
                    {session && (
                      <div className="flex items-center justify-between">
                        <span style={{ color: '#8b949e' }}>Progresso:</span>
                        <span style={{ color: '#e6edf3' }}>
                          {session.status === 'done' ? '✅ Concluído' : session.status === 'questions' ? '📝 Atividades' : session.status === 'summary' ? '📖 Resumo' : '💻 Codando'}
                        </span>
                      </div>
                    )}
                  </div>
                  {att?.status === 'presente' && isInactive && (
                    <div className="mt-2 p-2 rounded text-xs flex items-center gap-1" style={{ background: '#d2992210', color: '#d29922' }}>
                      <AlertTriangle size={10} /> Aluno presente mas não codou hoje
                    </div>
                  )}
                  {session?.status === 'done' && (
                    <div className="mt-2 p-2 rounded text-xs flex items-center gap-1" style={{ background: '#23863620', color: '#3fb950' }}>
                      <CheckCircle size={10} /> Concluiu todas as atividades!
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
