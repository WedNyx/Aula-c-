'use client'

import { useRouter } from 'next/navigation'
import { BookOpen, GraduationCap, Code2, Users } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)' }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#238636' }}>
              <Code2 size={40} color="white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: '#e6edf3' }}>
            Aula de C#
          </h1>
          <p className="text-lg" style={{ color: '#8b949e' }}>
            Plataforma interativa para aprender programação em C#
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            onClick={() => router.push('/student/profile')}
            className="group p-8 rounded-2xl border text-left transition-all duration-200 hover:scale-105"
            style={{ background: '#161b22', borderColor: '#30363d' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#238636'; e.currentTarget.style.background = '#1a2332' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = '#161b22' }}
          >
            <div className="p-3 rounded-xl w-fit mb-4" style={{ background: '#1f6feb20' }}>
              <GraduationCap size={32} color="#1f6feb" />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#e6edf3' }}>Sou Aluno</h2>
            <p style={{ color: '#8b949e' }}>Acesse sua área de programação, complete atividades e acompanhe seu progresso</p>
            <div className="mt-4 flex items-center gap-2" style={{ color: '#1f6feb' }}>
              <span className="text-sm font-medium">Entrar como aluno</span>
              <span>→</span>
            </div>
          </button>

          <button
            onClick={() => router.push('/teacher')}
            className="group p-8 rounded-2xl border text-left transition-all duration-200 hover:scale-105"
            style={{ background: '#161b22', borderColor: '#30363d' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#238636'; e.currentTarget.style.background = '#1a2332' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = '#161b22' }}
          >
            <div className="p-3 rounded-xl w-fit mb-4" style={{ background: '#23863620' }}>
              <BookOpen size={32} color="#238636" />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#e6edf3' }}>Sou Professor</h2>
            <p style={{ color: '#8b949e' }}>Monitore alunos, gerencie chamada, planeje aulas e acompanhe o progresso da turma</p>
            <div className="mt-4 flex items-center gap-2" style={{ color: '#238636' }}>
              <span className="text-sm font-medium">Entrar como professor</span>
              <span>→</span>
            </div>
          </button>
        </div>

        <div className="mt-8 p-4 rounded-xl flex items-center gap-3" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          <Users size={20} color="#8b949e" />
          <p className="text-sm" style={{ color: '#8b949e' }}>Plataforma educacional desenvolvida para facilitar o aprendizado de C# em sala de aula</p>
        </div>
      </div>
    </div>
  )
}
