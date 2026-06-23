'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { DF_CITIES } from '@/lib/csharpAnalyzer'
import { Calendar, ChevronLeft, ChevronRight, MapPin, BookOpen, Plus, Pencil } from 'lucide-react'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const CONTENT_SUGGESTIONS = [
  'Introdução ao C# e Variáveis', 'Tipos de Dados e Operadores', 'Estruturas Condicionais (if/else)',
  'Laços de Repetição (for/while)', 'Arrays e Listas', 'Métodos e Funções',
  'Orientação a Objetos - Classes', 'Herança e Polimorfismo', 'Tratamento de Exceções',
  'Leitura e Escrita de Arquivos', 'Coleções (List, Dictionary)', 'LINQ Básico',
  'Interfaces e Classes Abstratas', 'Revisão e Exercícios',
]

export default function TeacherCalendar() {
  const router = useRouter()
  const { calendarEntries, addCalendarEntry, updateCalendarEntry, getTodayEntry } = useAppStore()
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0])
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editCity, setEditCity] = useState('Plano Piloto (Brasília)')
  const today = now.toISOString().split('T')[0]
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }
  const getEntryForDate = (date: string) => calendarEntries.find(e => e.date === date)
  const handleSelectDate = (day: number) => {
    const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(date)
    const existing = getEntryForDate(date)
    setEditContent(existing?.contentName || '')
    setEditCity(existing?.city || 'Plano Piloto (Brasília)')
    setEditMode(false)
  }
  const handleSaveEntry = () => {
    if (!editContent.trim()) return
    const existing = getEntryForDate(selectedDate)
    if (existing) updateCalendarEntry(existing.id, { contentName: editContent, city: editCity })
    else addCalendarEntry(selectedDate, editContent, editCity)
    setEditMode(false)
  }
  const selectedEntry = getEntryForDate(selectedDate)
  const todayEntry = getTodayEntry()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="min-h-screen" style={{ background: '#0d1117' }}>
      <div className="border-b px-6 py-3 flex items-center gap-3" style={{ background: '#161b22', borderColor: '#30363d' }}>
        <button onClick={() => router.push('/teacher')} style={{ color: '#8b949e' }}><ChevronLeft size={20} /></button>
        <Calendar size={18} color="#d29922" />
        <span className="font-semibold" style={{ color: '#e6edf3' }}>Calendário de Aulas</span>
      </div>
      <div className="p-6 max-w-5xl mx-auto">
        {todayEntry && (
          <div className="mb-6 p-4 rounded-xl border flex items-center gap-4" style={{ background: '#1a2e1a', borderColor: '#238636' }}>
            <BookOpen size={20} color="#238636" />
            <div>
              <p className="text-xs font-semibold" style={{ color: '#3fb950' }}>AULA DE HOJE</p>
              <p className="font-bold" style={{ color: '#e6edf3' }}>{todayEntry.contentName}</p>
              <p className="text-xs flex items-center gap-1" style={{ color: '#8b949e' }}><MapPin size={10} /> {todayEntry.city}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border p-4" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-700" style={{ color: '#8b949e' }}><ChevronLeft size={18} /></button>
              <h2 className="font-bold" style={{ color: '#e6edf3' }}>{MONTHS[viewMonth]} {viewYear}</h2>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-700" style={{ color: '#8b949e' }}><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => <div key={d} className="text-center text-xs py-1 font-semibold" style={{ color: '#8b949e' }}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const hasEntry = getEntryForDate(dateStr)
                const isToday = dateStr === today
                const isSelected = dateStr === selectedDate
                return (
                  <button key={day} onClick={() => handleSelectDate(day)}
                    className="aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all"
                    style={{ background: isSelected ? '#1f6feb' : isToday ? '#23863640' : 'transparent', color: isSelected ? 'white' : isToday ? '#3fb950' : '#e6edf3', border: isToday && !isSelected ? '1px solid #238636' : '1px solid transparent' }}
                  >
                    {day}
                    {hasEntry && <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: isSelected ? 'white' : '#d29922' }} />}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="rounded-xl border p-4" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: '#e6edf3' }}>{new Date(selectedDate + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</h3>
              {!editMode && <button onClick={() => { setEditMode(true); setEditContent(selectedEntry?.contentName || ''); setEditCity(selectedEntry?.city || 'Plano Piloto (Brasília)') }} style={{ color: '#8b949e' }}>{selectedEntry ? <Pencil size={14} /> : <Plus size={14} />}</button>}
            </div>
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>Conteúdo da Aula</label>
                  <input type="text" value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Ex: Variáveis e Tipos..."
                    className="w-full p-2 rounded-lg text-sm outline-none" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }}
                  />
                  <div className="mt-1 flex flex-wrap gap-1">
                    {CONTENT_SUGGESTIONS.slice(0, 5).map(s => (
                      <button key={s} onClick={() => setEditContent(s)} className="text-xs px-2 py-0.5 rounded" style={{ background: '#21262d', color: '#8b949e' }}>{s.split(' ').slice(0, 3).join(' ')}...</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>Cidade do DF</label>
                  <select value={editCity} onChange={e => setEditCity(e.target.value)} className="w-full p-2 rounded-lg text-sm outline-none" style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }}>
                    {DF_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)} className="flex-1 p-2 rounded-lg text-xs" style={{ background: '#21262d', color: '#8b949e' }}>Cancelar</button>
                  <button onClick={handleSaveEntry} className="flex-1 p-2 rounded-lg text-xs font-medium" style={{ background: '#238636', color: 'white' }}>Salvar</button>
                </div>
              </div>
            ) : selectedEntry ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg" style={{ background: '#0d1117' }}><p className="text-xs" style={{ color: '#8b949e' }}>Conteúdo:</p><p className="font-medium mt-1" style={{ color: '#e6edf3' }}>{selectedEntry.contentName}</p></div>
                <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: '#0d1117' }}><MapPin size={14} color="#8b949e" /><div><p className="text-xs" style={{ color: '#8b949e' }}>Cidade:</p><p className="text-sm" style={{ color: '#e6edf3' }}>{selectedEntry.city}</p></div></div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar size={32} color="#30363d" className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: '#8b949e' }}>Sem aula planejada</p>
                <button onClick={() => setEditMode(true)} className="mt-2 text-xs underline" style={{ color: '#1f6feb' }}>+ Adicionar aula</button>
              </div>
            )}
            <div className="mt-4 border-t pt-4" style={{ borderColor: '#30363d' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#8b949e' }}>Sugestões de Conteúdo:</p>
              <div className="space-y-1">
                {CONTENT_SUGGESTIONS.slice(0, 8).map(s => (
                  <button key={s} onClick={() => { setEditContent(s); setEditMode(true) }} className="w-full text-left text-xs p-2 rounded-lg hover:bg-gray-700 transition-colors" style={{ color: '#8b949e' }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
