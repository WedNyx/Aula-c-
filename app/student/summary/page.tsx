'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { generateFullReport } from '@/lib/csharpAnalyzer'
import { BookOpen, CheckCircle, XCircle, Award, ArrowRight, Home, ChevronLeft } from 'lucide-react'

function SummaryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const { currentStudent, sessions, updateSession, updateStudentActivity } = useAppStore()
  const [phase, setPhase] = useState<'summary' | 'questions' | 'feedback'>('summary')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [report, setReport] = useState<ReturnType<typeof generateFullReport> | null>(null)

  const session = sessions.find(s => s.id === sessionId)

  useEffect(() => {
    if (!currentStudent) { router.push('/student/profile'); return }
    if (!session) { router.push('/student/editor'); return }
    if (!session.summary) {
      const r = generateFullReport(session.code, currentStudent.fullName)
      setReport(r)
      updateSession(session.id, { summary: r.summary, questions: r.questions, studentFeedback: r.analysis.feedback, teacherFeedback: r.teacherFeedback, status: 'summary' })
    } else {
      setReport({ analysis: { isValid: true, errors: [], warnings: [], feedback: session.studentFeedback, robotMessage: '', concepts: [] }, summary: session.summary, questions: session.questions, teacherFeedback: session.teacherFeedback })
    }
    updateStudentActivity(currentStudent.id, 'resumo')
  }, [currentStudent, session])

  const handleSubmitQuestions = () => {
    if (!session || !report) return
    setSubmitted(true)
    updateSession(session.id, { status: 'questions' })
    updateStudentActivity(currentStudent!.id, 'atividades')
  }

  const handleFinish = () => {
    if (!session) return
    updateSession(session.id, { status: 'done' })
    updateStudentActivity(currentStudent!.id, 'concluido')
    setPhase('feedback')
  }

  const score = submitted ? report?.questions.filter((q) => answers[q.id] === q.correctIndex).length || 0 : 0
  const total = report?.questions.length || 0

  if (!currentStudent || !report) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1117' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#238636', borderTopColor: 'transparent' }} />
        <p style={{ color: '#8b949e' }}>Gerando resumo...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#0d1117' }}>
      <div className="border-b px-6 py-3 flex items-center justify-between" style={{ background: '#161b22', borderColor: '#30363d' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/student/editor')} style={{ color: '#8b949e' }}><ChevronLeft size={20} /></button>
          <BookOpen size={18} color="#1f6feb" />
          <span className="font-semibold" style={{ color: '#e6edf3' }}>Resumo da Aula — {currentStudent.fullName}</span>
        </div>
        <div className="flex gap-2">
          {(['summary', 'questions', 'feedback'] as const).map((p, i) => (
            <button key={p} onClick={() => phase !== 'feedback' && setPhase(p)} className="text-xs px-3 py-1 rounded-full" style={{ background: phase === p ? '#1f6feb' : '#21262d', color: phase === p ? 'white' : '#8b949e' }}>
              {i + 1}. {p === 'summary' ? 'Resumo' : p === 'questions' ? 'Atividades' : 'Feedback'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        {phase === 'summary' && (
          <div className="space-y-4">
            <div className="p-6 rounded-xl border" style={{ background: '#161b22', borderColor: '#30363d' }}>
              {report.summary.split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-0 mb-3" style={{ color: '#e6edf3' }}>{line.replace('## ', '')}</h2>
                if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold mt-4 mb-2" style={{ color: '#1f6feb' }}>{line.replace('### ', '')}</h3>
                if (line.startsWith('- **')) {
                  const match = line.match(/- \*\*(.+?)\*\*(.*)/)
                  return match ? <div key={i} className="flex items-start gap-2 text-sm my-1"><span style={{ color: '#238636' }}>•</span><span><strong style={{ color: '#e6edf3' }}>{match[1]}</strong><span style={{ color: '#8b949e' }}>{match[2]}</span></span></div> : null
                }
                if (line.startsWith('- ')) return <div key={i} className="flex items-start gap-2 text-sm my-1"><span style={{ color: '#238636' }}>•</span><span style={{ color: '#8b949e' }}>{line.replace('- ', '')}</span></div>
                if (line.match(/^\d+\./)) return <p key={i} className="text-sm my-1" style={{ color: '#8b949e' }}>{line}</p>
                if (line.trim()) return <p key={i} className="text-sm" style={{ color: '#8b949e' }}>{line}</p>
                return <br key={i} />
              })}
            </div>
            <button onClick={() => setPhase('questions')} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-medium" style={{ background: '#238636', color: 'white' }}>Ir para as Atividades <ArrowRight size={16} /></button>
          </div>
        )}

        {phase === 'questions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#e6edf3' }}>Atividades</h2>
              {submitted && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: score >= total * 0.7 ? '#23863620' : '#f8514920', border: '1px solid ' + (score >= total * 0.7 ? '#238636' : '#f85149') }}>
                  <Award size={16} color={score >= total * 0.7 ? '#238636' : '#f85149'} />
                  <span className="font-bold" style={{ color: score >= total * 0.7 ? '#3fb950' : '#f85149' }}>{score}/{total} corretas</span>
                </div>
              )}
            </div>
            {report.questions.map((q, i) => (
              <div key={q.id} className="p-4 rounded-xl border" style={{ background: '#161b22', borderColor: '#30363d' }}>
                <p className="font-medium mb-3 text-sm" style={{ color: '#e6edf3' }}>
                  <span className="text-xs px-1.5 py-0.5 rounded mr-2" style={{ background: '#1f6feb20', color: '#1f6feb' }}>{i + 1}</span>{q.text}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, j) => {
                    const isSelected = answers[q.id] === j
                    const isCorrect = j === q.correctIndex
                    let bgColor = '#0d1117', borderColor = '#30363d', textColor = '#8b949e'
                    if (submitted) {
                      if (isCorrect) { bgColor = '#23863620'; borderColor = '#238636'; textColor = '#3fb950' }
                      else if (isSelected && !isCorrect) { bgColor = '#f8514920'; borderColor = '#f85149'; textColor = '#f85149' }
                    } else if (isSelected) { bgColor = '#1f6feb20'; borderColor = '#1f6feb'; textColor = '#1f6feb' }
                    return (
                      <button key={j} onClick={() => !submitted && setAnswers(prev => ({ ...prev, [q.id]: j }))} disabled={submitted}
                        className="w-full text-left p-3 rounded-lg border text-sm flex items-center gap-2 transition-all" style={{ background: bgColor, borderColor, color: textColor }}>
                        {submitted && isCorrect && <CheckCircle size={14} />}
                        {submitted && isSelected && !isCorrect && <XCircle size={14} />}
                        {!submitted && <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs" style={{ borderColor }}>{String.fromCharCode(65 + j)}</span>}
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {!submitted ? (
              <button onClick={handleSubmitQuestions} disabled={Object.keys(answers).length < report.questions.length} className="w-full p-3 rounded-xl font-medium disabled:opacity-50" style={{ background: '#238636', color: 'white' }}>Enviar Respostas ({Object.keys(answers).length}/{report.questions.length})</button>
            ) : (
              <button onClick={handleFinish} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-medium" style={{ background: '#1f6feb', color: 'white' }}>Ver Feedback Final <ArrowRight size={16} /></button>
            )}
          </div>
        )}

        {phase === 'feedback' && (
          <div className="space-y-4">
            <div className="p-6 rounded-xl border" style={{ background: '#161b22', borderColor: '#30363d' }}>
              {report.analysis.feedback.split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-0 mb-3" style={{ color: '#e6edf3' }}>{line.replace('## ', '')}</h2>
                if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold mt-4 mb-2" style={{ color: '#1f6feb' }}>{line.replace('### ', '')}</h3>
                if (line.match(/^[✅❌💪🌟👍]/)) return <p key={i} className="text-sm my-1" style={{ color: '#e6edf3' }}>{line}</p>
                if (line.startsWith('- ')) return <div key={i} className="flex items-start gap-2 text-sm my-1"><span style={{ color: '#238636' }}>•</span><span style={{ color: '#8b949e' }}>{line.replace('- ', '')}</span></div>
                if (line.trim()) return <p key={i} className="text-sm" style={{ color: '#8b949e' }}>{line}</p>
                return <br key={i} />
              })}
            </div>
            <div className="p-4 rounded-xl border" style={{ background: '#0d1117', borderColor: '#30363d' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#8b949e' }}>Resultado das atividades:</p>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold" style={{ color: score >= total * 0.7 ? '#3fb950' : '#f85149' }}>{score}/{total}</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#e6edf3' }}>{score >= total * 0.7 ? 'Ótimo resultado!' : 'Continue praticando!'}</p>
                  <p className="text-xs" style={{ color: '#8b949e' }}>{Math.round((score / total) * 100)}% de acerto</p>
                </div>
              </div>
            </div>
            <button onClick={() => router.push('/student/editor')} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-medium" style={{ background: '#21262d', color: '#e6edf3' }}>
              <Home size={16} />Voltar ao Editor
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1117' }}><p style={{ color: '#8b949e' }}>Carregando...</p></div>}>
      <SummaryContent />
    </Suspense>
  )
}
