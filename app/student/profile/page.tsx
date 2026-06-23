'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, ClassType } from '@/lib/store'
import { UserCircle, Users, ArrowLeft, LogIn, UserPlus } from 'lucide-react'

export default function StudentProfile() {
  const router = useRouter()
  const { students, addStudent, setCurrentStudent } = useAppStore()
  const [mode, setMode] = useState<'choose' | 'create' | 'login'>('choose')
  const [name, setName] = useState('')
  const [classType, setClassType] = useState<ClassType>('matutino')
  const [filterClass, setFilterClass] = useState<ClassType>('matutino')
  const [error, setError] = useState('')

  const handleCreate = () => {
    if (!name.trim() || name.trim().length < 3) {
      setError('Por favor, insira seu nome completo (mínimo 3 caracteres)')
      return
    }
    const existing = students.find(s =>
      s.fullName.toLowerCase() === name.trim().toLowerCase() && s.classType === classType
    )
    if (existing) {
      setError('Já existe um perfil com esse nome nessa turma. Faça login.')
      return
    }
    const student = addStudent(name.trim(), classType)
    setCurrentStudent(student)
    router.push('/student/editor')
  }

  const handleLogin = (student: typeof students[0]) => {
    setCurrentStudent(student)
    router.push('/student/editor')
  }

  const filteredStudents = students.filter(s => s.classType === filterClass)

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center" style={{ background: '#0d1117' }}>
      <div className="w-full max-w-lg">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 mb-6 text-sm hover:text-white transition-colors" style={{ color: '#8b949e' }}>
          <ArrowLeft size={16} /> Voltar
        </button>

        {mode === 'choose' && (
          <div>
            <div className="text-center mb-8">
              <UserCircle size={48} color="#1f6feb" className="mx-auto mb-3" />
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#e6edf3' }}>Área do Aluno</h1>
              <p style={{ color: '#8b949e' }}>Como deseja continuar?</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button onClick={() => setMode('create')} className="p-6 rounded-xl border text-left transition-all hover:scale-[1.02]" style={{ background: '#161b22', borderColor: '#30363d' }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#1f6feb')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#30363d')}>
                <UserPlus size={28} color="#1f6feb" className="mb-3" />
                <h2 className="font-bold text-lg mb-1" style={{ color: '#e6edf3' }}>Criar Perfil</h2>
                <p className="text-sm" style={{ color: '#8b949e' }}>Primeira vez? Crie seu perfil aqui</p>
              </button>
              <button onClick={() => setMode('login')} className="p-6 rounded-xl border text-left transition-all hover:scale-[1.02]" style={{ background: '#161b22', borderColor: '#30363d' }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#238636')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#30363d')}>
                <LogIn size={28} color="#238636" className="mb-3" />
                <h2 className="font-bold text-lg mb-1" style={{ color: '#e6edf3' }}>Entrar no Perfil</h2>
                <p className="text-sm" style={{ color: '#8b949e' }}>Já tem perfil? Selecione seu nome</p>
              </button>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setMode('choose')} style={{ color: '#8b949e' }}><ArrowLeft size={20} /></button>
              <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>Criar Perfil</h1>
            </div>
            <div className="p-6 rounded-xl border" style={{ background: '#161b22', borderColor: '#30363d' }}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: '#8b949e' }}>Nome Completo</label>
                <input type="text" value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="Digite seu nome completo..." className="w-full p-3 rounded-lg text-sm outline-none" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: '#8b949e' }}>Turma</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['matutino', 'vespertino'] as ClassType[]).map(type => (
                    <button key={type} onClick={() => setClassType(type)} className="p-3 rounded-lg border text-sm font-medium transition-all" style={{ background: classType === type ? '#1f6feb20' : '#0d1117', borderColor: classType === type ? '#1f6feb' : '#30363d', color: classType === type ? '#1f6feb' : '#8b949e' }}>
                      {type === 'matutino' ? '🌅 Matutino' : '🌇 Vespertino'}
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#f8514920', color: '#f85149', border: '1px solid #f8514940' }}>{error}</div>}
              <button onClick={handleCreate} className="w-full p-3 rounded-lg font-medium transition-all hover:opacity-90" style={{ background: '#238636', color: 'white' }}>Criar Perfil e Começar</button>
            </div>
          </div>
        )}

        {mode === 'login' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setMode('choose')} style={{ color: '#8b949e' }}><ArrowLeft size={20} /></button>
              <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>Selecionar Perfil</h1>
            </div>
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2">
                {(['matutino', 'vespertino'] as ClassType[]).map(type => (
                  <button key={type} onClick={() => setFilterClass(type)} className="p-2 rounded-lg border text-sm font-medium transition-all" style={{ background: filterClass === type ? '#1f6feb20' : '#161b22', borderColor: filterClass === type ? '#1f6feb' : '#30363d', color: filterClass === type ? '#1f6feb' : '#8b949e' }}>
                    {type === 'matutino' ? '🌅 Matutino' : '🌇 Vespertino'}
                  </button>
                ))}
              </div>
            </div>
            {filteredStudents.length === 0 ? (
              <div className="p-8 rounded-xl border text-center" style={{ background: '#161b22', borderColor: '#30363d' }}>
                <Users size={40} color="#30363d" className="mx-auto mb-3" />
                <p style={{ color: '#8b949e' }}>Nenhum aluno cadastrado nessa turma ainda.</p>
                <button onClick={() => setMode('create')} className="mt-3 text-sm underline" style={{ color: '#1f6feb' }}>Criar perfil</button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredStudents.sort((a, b) => a.fullName.localeCompare(b.fullName)).map(student => (
                  <button key={student.id} onClick={() => handleLogin(student)} className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.01]" style={{ background: '#161b22', borderColor: '#30363d' }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#238636')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#30363d')}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full" style={{ background: '#23863620' }}><UserCircle size={20} color="#238636" /></div>
                      <div>
                        <p className="font-medium" style={{ color: '#e6edf3' }}>{student.fullName}</p>
                        <p className="text-xs" style={{ color: '#8b949e' }}>Último acesso: {new Date(student.lastActiveAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
