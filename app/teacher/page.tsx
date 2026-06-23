'use client'

import { useRouter } from 'next/navigation'
import { Monitor, ClipboardList, Calendar, Code2, BookOpen } from 'lucide-react'

const items = [
  { label: 'Dashboard', desc: 'Monitore alunos em tempo real', icon: Monitor, color: '#1f6feb', path: '/teacher/dashboard' },
  { label: 'Chamada', desc: 'Lista de presença dos alunos', icon: ClipboardList, color: '#238636', path: '/teacher/attendance' },
  { label: 'Calendário', desc: 'Plano de aulas e conteúdos', icon: Calendar, color: '#d29922', path: '/teacher/calendar' },
  { label: 'Meu Editor', desc: 'Ambiente de codificação do professor', icon: Code2, color: '#bc8cff', path: '/teacher/editor' },
]

export default function TeacherHome() {
  const router = useRouter()

  return (
    <div className="min-h-screen p-6" style={{ background: '#0d1117' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl" style={{ background: '#1f6feb20' }}>
            <BookOpen size={28} color="#1f6feb" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#e6edf3' }}>Área do Professor</h1>
            <p className="text-sm" style={{ color: '#8b949e' }}>Gerencie sua turma de C#</p>
          </div>
          <button onClick={() => router.push('/')} className="ml-auto text-sm px-3 py-1.5 rounded-lg" style={{ background: '#21262d', color: '#8b949e' }}>
            ← Início
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {items.map(item => (
            <button key={item.path} onClick={() => router.push(item.path)}
              className="p-6 rounded-xl border text-left transition-all hover:scale-[1.02]"
              style={{ background: '#161b22', borderColor: '#30363d' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = item.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#30363d')}
            >
              <div className="p-3 rounded-xl w-fit mb-4" style={{ background: item.color + '20' }}>
                <item.icon size={28} color={item.color} />
              </div>
              <h2 className="text-lg font-bold mb-1" style={{ color: '#e6edf3' }}>{item.label}</h2>
              <p className="text-sm" style={{ color: '#8b949e' }}>{item.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
