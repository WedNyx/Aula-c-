'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, ClassType } from '@/lib/store'
import { ClipboardList, CheckCircle, XCircle, AlertCircle, RotateCcw, ChevronLeft, Users } from 'lucide-react'

export default function TeacherAttendance() {
  const router = useRouter()
  const { students, attendance, markAttendance, resetAllStudents, sessions } = useAppStore()
  const [filterClass, setFilterClass] = useState<ClassType | 'all'>('all')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const todayAtt = attendance.filter(a => a.date === today)
  const todaySessions = sessions.filter(s => s.date === today)

  const filtered = students
    .filter(s => filterClass === 'all' || s.classType === filterClass)
    .sort((a, b) => a.fullName.localeCompare(b.fullName))

  const getAttStatus = (studentId: string) => {
    return todayAtt.find(a => a.studentId === studentId)?.status
  }

  const getActivityStatus = (studentId: string) => {
    return todaySessions.find(s => s.studentId === studentId)?.status
  }

  const presentCount = todayAtt.filter(a => a.status === 'presente').length
  const absentCount = students.length - todayAtt.filter(a => a.status === 'presente' || a.status === 'inativo').length

  const handleReset = () => {
    resetAllStudents()
    setShowResetConfirm(false)
    router.push('/teacher')
  }

  return (
    <div className="min-h-screen" style={{ background: '#0d1117' }}>
      <div className="border-b px-6 py-3 flex items-center justify-between" style={{ background: '#161b22', borderColor: '#30363d' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/teacher')} style={{ color: '#8b949e' }}>
            <ChevronLeft size={20} />
          </button>
          <ClipboardList size={18} color="#238636" />
          <span className="font-semibold" style={{ color: '#e6edf3' }}>Lista de Chamada</span>
          <span className="text-xs" style={{ color: '#8b949e' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'matutino', 'vespertino'] as const).map(c => (
            <button
              key={c}
              onClick={() => setFilterClass(c)}
              className="text-xs px-3 py-1 rounded-full"
              style={{
                background: filterClass === c ? '#238636' : '#21262d',
                color: filterClass === c ? 'white' : '#8b949e',
              }}
            >
              {c === 'all' ? 'Todas' : c === 'matutino' ? '🌅 Matutino' : '🌇 Vespertino'}
            </button>
          ))}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ml-2"
            style={{ background: '#f8514920', color: '#f85149', border: '1px solid #f8514940' }}
          >
            <RotateCcw size={12} />
            Reset Turma
          </button>
        </div>
      </div>

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: '#00000080' }}>
          <div className="p-6 rounded-xl border max-w-sm w-full mx-4" style={{ background: '#161b22', borderColor: '#f85149' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={20} color="#f85149" />
              <h3 className="font-bold" style={{ color: '#f85149' }}>Confirmar Reset</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: '#8b949e' }}>
              Isso irá <strong style={{ color: '#f85149' }}>remover TODOS os perfis de alunos</strong>, arquivos, sessões e registros de presença. Use apenas ao trocar de turma.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 p-2 rounded-lg text-sm font-medium"
                style={{ background: '#21262d', color: '#e6edf3' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                className="flex-1 p-2 rounded-lg text-sm font-medium"
                style={{ background: '#f85149', color: 'white' }}
              >
                Confirmar Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 max-w-4xl mx-auto">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl border" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <p className="text-2xl font-bold" style={{ color: '#3fb950' }}>{presentCount}</p>
            <p className="text-xs" style={{ color: '#8b949e' }}>Presentes hoje</p>
          </div>
          <div className="p-4 rounded-xl border" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <p className="text-2xl font-bold" style={{ color: '#f85149' }}>{absentCount}</p>
            <p className="text-xs" style={{ color: '#8b949e' }}>Faltas / Não marcado</p>
          </div>
          <div className="p-4 rounded-xl border" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <p className="text-2xl font-bold" style={{ color: '#e6edf3' }}>{filtered.length}</p>
            <p className="text-xs" style={{ color: '#8b949e' }}>Total de alunos</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 rounded-xl border text-center" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <Users size={48} color="#30363d" className="mx-auto mb-3" />
            <p style={{ color: '#8b949e' }}>Nenhum aluno cadastrado nessa turma.</p>
            <p className="text-sm mt-1" style={{ color: '#8b949e' }}>Os alunos aparecem aqui quando criam seus perfis.</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#30363d' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#161b22', borderBottom: '1px solid #30363d' }}>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b949e' }}>#</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b949e' }}>Nome</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b949e' }}>Turma</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b949e' }}>Status Hoje</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b949e' }}>Progresso</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b949e' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student, idx) => {
                  const attStatus = getAttStatus(student.id)
                  const actStatus = getActivityStatus(student.id)

                  return (
                    <tr
                      key={student.id}
                      className="border-t"
                      style={{
                        borderColor: '#30363d',
                        background: idx % 2 === 0 ? '#0d1117' : '#161b22',
                      }}
                    >
                      <td className="p-3 text-sm" style={{ color: '#8b949e' }}>{idx + 1}</td>
                      <td className="p-3">
                        <p className="text-sm font-medium" style={{ color: '#e6edf3' }}>{student.fullName}</p>
                      </td>
                      <td className="p-3">
                        <span className="text-xs capitalize px-2 py-0.5 rounded" style={{ background: '#30363d', color: '#8b949e' }}>
                          {student.classType}
                        </span>
                      </td>
                      <td className="p-3">
                        {attStatus === 'presente' ? (
                          <span className="text-xs flex items-center gap-1" style={{ color: '#3fb950' }}>
                            <CheckCircle size={12} /> Presente
                          </span>
                        ) : attStatus === 'falta' ? (
                          <span className="text-xs flex items-center gap-1" style={{ color: '#f85149' }}>
                            <XCircle size={12} /> Falta
                          </span>
                        ) : attStatus === 'inativo' ? (
                          <span className="text-xs flex items-center gap-1" style={{ color: '#d29922' }}>
                            <AlertCircle size={12} /> Inativo
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: '#8b949e' }}>— Não marcado</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-xs" style={{ color: '#8b949e' }}>
                          {actStatus === 'done' ? '✅ Concluído' :
                           actStatus === 'questions' ? '📝 Atividades' :
                           actStatus === 'summary' ? '📖 Resumo' :
                           actStatus === 'coding' ? '💻 Codando' :
                           '—'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => markAttendance(student.id, 'presente')}
                            className="text-xs px-2 py-1 rounded transition-all"
                            style={{
                              background: attStatus === 'presente' ? '#238636' : '#23863620',
                              color: attStatus === 'presente' ? 'white' : '#3fb950',
                            }}
                          >
                            P
                          </button>
                          <button
                            onClick={() => markAttendance(student.id, 'falta')}
                            className="text-xs px-2 py-1 rounded transition-all"
                            style={{
                              background: attStatus === 'falta' ? '#f85149' : '#f8514920',
                              color: attStatus === 'falta' ? 'white' : '#f85149',
                            }}
                          >
                            F
                          </button>
                          <button
                            onClick={() => markAttendance(student.id, 'inativo')}
                            className="text-xs px-2 py-1 rounded transition-all"
                            style={{
                              background: attStatus === 'inativo' ? '#d29922' : '#d2992220',
                              color: attStatus === 'inativo' ? 'white' : '#d29922',
                            }}
                          >
                            I
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex gap-4 text-xs" style={{ color: '#8b949e' }}>
          <span><span className="font-bold" style={{ color: '#3fb950' }}>P</span> = Presente</span>
          <span><span className="font-bold" style={{ color: '#f85149' }}>F</span> = Falta</span>
          <span><span className="font-bold" style={{ color: '#d29922' }}>I</span> = Inativo (entrou mas não fez nada)</span>
        </div>
      </div>
    </div>
  )
}
