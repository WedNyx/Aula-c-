'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { analyzeCode } from '@/lib/csharpAnalyzer'
import {
  Play, Save, FilePlus, Pencil, Trash2, Terminal, Bot,
  ChevronRight, CheckCircle, XCircle, AlertCircle, LogOut, FileCode
} from 'lucide-react'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

export default function StudentEditor() {
  const router = useRouter()
  const {
    currentStudent, files, addFile, updateFile, renameFile, deleteFile,
    getStudentFiles, updateStudentActivity, getTodaySession, startSession,
    updateSession
  } = useAppStore()

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['> Terminal C# inicializado.', '> Clique em Executar (▶) para rodar seu código.'])
  const [isRunning, setIsRunning] = useState(false)
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeCode> | null>(null)
  const [showRobot, setShowRobot] = useState(true)
  const [showTerminal, setShowTerminal] = useState(true)
  const [newFileName, setNewFileName] = useState('')
  const [showNewFile, setShowNewFile] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentStudent) { router.push('/student/profile'); return }
    const studentFiles = getStudentFiles(currentStudent.id)
    if (studentFiles.length === 0) {
      const file = addFile(currentStudent.id, 'Programa.cs')
      setSelectedFileId(file.id)
    } else {
      setSelectedFileId(studentFiles[0].id)
    }
    updateStudentActivity(currentStudent.id, 'editor')
  }, [currentStudent])

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight
  }, [terminalOutput])

  const studentFiles = currentStudent ? getStudentFiles(currentStudent.id) : []
  const selectedFile = studentFiles.find(f => f.id === selectedFileId)

  const handleCodeChange = (value: string | undefined) => {
    if (!selectedFileId || !value) return
    updateFile(selectedFileId, value)
    const result = analyzeCode(value, currentStudent?.fullName)
    setAnalysis(result)
  }

  const handleRun = async () => {
    if (!selectedFile) return
    setIsRunning(true)
    setTerminalOutput(prev => [...prev, '', `> Executando ${selectedFile.name}...`])
    try {
      const res = await fetch('/api/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: selectedFile.content }) })
      const data = await res.json()
      if (data.error) {
        setTerminalOutput(prev => [...prev, `❌ Erro: ${data.error}`])
      } else {
        const lines = (data.output || 'Programa executado sem saída.').split('\n')
        setTerminalOutput(prev => [...prev, ...lines])
      }
    } catch {
      setTerminalOutput(prev => [...prev, '❌ Erro de conexão ao executar o código.'])
    }
    setIsRunning(false)
  }

  const handleSave = () => {
    if (!currentStudent || !selectedFile) return
    updateStudentActivity(currentStudent.id, 'resumo')
    const existing = getTodaySession(currentStudent.id)
    if (existing) {
      updateSession(existing.id, { code: selectedFile.content, status: 'summary' })
      router.push(`/student/summary?sessionId=${existing.id}`)
    } else {
      const session = startSession(currentStudent.id, selectedFile.content)
      router.push(`/student/summary?sessionId=${session.id}`)
    }
  }

  const handleNewFile = () => {
    if (!currentStudent || !newFileName.trim()) return
    const name = newFileName.trim().endsWith('.cs') ? newFileName.trim() : newFileName.trim() + '.cs'
    const file = addFile(currentStudent.id, name)
    setSelectedFileId(file.id)
    setNewFileName('')
    setShowNewFile(false)
  }

  const handleStartRename = (fileId: string, currentName: string) => {
    setRenamingId(fileId)
    setRenameValue(currentName.replace('.cs', ''))
  }

  const handleRename = (fileId: string) => {
    if (!renameValue.trim()) return
    renameFile(fileId, renameValue.trim().endsWith('.cs') ? renameValue.trim() : renameValue.trim() + '.cs')
    setRenamingId(null)
  }

  const handleDelete = (fileId: string) => {
    if (studentFiles.length <= 1) return
    deleteFile(fileId)
    if (selectedFileId === fileId) {
      const remaining = studentFiles.filter(f => f.id !== fileId)
      setSelectedFileId(remaining[0]?.id || null)
    }
  }

  if (!currentStudent) return null

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0d1117' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0" style={{ background: '#161b22', borderColor: '#30363d' }}>
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded" style={{ background: '#23863620' }}><FileCode size={18} color="#238636" /></div>
          <span className="font-semibold text-sm" style={{ color: '#e6edf3' }}>Aula de C#</span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1f6feb20', color: '#1f6feb' }}>{currentStudent.fullName}</span>
          <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ background: '#30363d', color: '#8b949e' }}>{currentStudent.classType}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRun} disabled={isRunning} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium" style={{ background: '#238636', color: 'white', opacity: isRunning ? 0.7 : 1 }}>
            <Play size={14} />{isRunning ? 'Executando...' : 'Executar'}
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium" style={{ background: '#1f6feb', color: 'white' }}>
            <Save size={14} />Salvar & Resumo
          </button>
          <button onClick={() => { useAppStore.getState().setCurrentStudent(null); router.push('/') }} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium" style={{ background: '#21262d', color: '#8b949e' }}>
            <LogOut size={14} />Sair
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-52 flex-shrink-0 border-r flex flex-col" style={{ background: '#161b22', borderColor: '#30363d' }}>
          <div className="p-2 border-b flex items-center justify-between" style={{ borderColor: '#30363d' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b949e' }}>Arquivos</span>
            <button onClick={() => setShowNewFile(true)} className="p-1 rounded hover:bg-gray-700" style={{ color: '#8b949e' }}><FilePlus size={14} /></button>
          </div>
          {showNewFile && (
            <div className="p-2 border-b" style={{ borderColor: '#30363d' }}>
              <input autoFocus type="text" value={newFileName} onChange={e => setNewFileName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNewFile(); if (e.key === 'Escape') { setShowNewFile(false); setNewFileName('') } }}
                placeholder="NomeArquivo" className="w-full p-1.5 text-xs rounded outline-none"
                style={{ background: '#0d1117', border: '1px solid #1f6feb', color: '#e6edf3' }} />
              <p className="text-xs mt-1" style={{ color: '#8b949e' }}>.cs será adicionado</p>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-1">
            {studentFiles.map(file => (
              <div key={file.id} className="group flex items-center gap-1 rounded px-2 py-1.5 cursor-pointer"
                style={{ background: selectedFileId === file.id ? '#1f3a5f' : 'transparent' }}
                onClick={() => setSelectedFileId(file.id)}>
                <span className="text-xs" style={{ color: '#4fc1ff' }}>📄</span>
                {renamingId === file.id ? (
                  <input autoFocus type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(file.id)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(file.id); if (e.key === 'Escape') setRenamingId(null) }}
                    className="flex-1 text-xs bg-transparent outline-none border-b" style={{ color: '#e6edf3', borderColor: '#1f6feb' }} />
                ) : (
                  <span className="flex-1 text-xs truncate" style={{ color: '#e6edf3' }}>{file.name}</span>
                )}
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button onClick={e => { e.stopPropagation(); handleStartRename(file.id, file.name) }} className="p-0.5 rounded" style={{ color: '#8b949e' }}><Pencil size={10} /></button>
                  {studentFiles.length > 1 && <button onClick={e => { e.stopPropagation(); handleDelete(file.id) }} className="p-0.5 rounded" style={{ color: '#f85149' }}><Trash2 size={10} /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <MonacoEditor height="100%" language="csharp" theme="vs-dark" value={selectedFile?.content || ''} onChange={handleCodeChange}
              options={{ fontSize: 14, fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace", fontLigatures: true, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on', lineNumbers: 'on', renderLineHighlight: 'line', automaticLayout: true, tabSize: 4, insertSpaces: true, bracketPairColorization: { enabled: true }, padding: { top: 8 } }} />
          </div>
          {showTerminal && (
            <div className="h-40 flex-shrink-0 border-t flex flex-col" style={{ background: '#0d1117', borderColor: '#30363d' }}>
              <div className="flex items-center justify-between px-3 py-1 border-b" style={{ background: '#161b22', borderColor: '#30363d' }}>
                <div className="flex items-center gap-2"><Terminal size={14} color="#8b949e" /><span className="text-xs font-medium" style={{ color: '#8b949e' }}>Terminal</span></div>
                <button onClick={() => setTerminalOutput(['> Terminal limpo.'])} className="text-xs" style={{ color: '#8b949e' }}>Limpar</button>
              </div>
              <div ref={terminalRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs" style={{ color: '#3fb950' }}>
                {terminalOutput.map((line, i) => <div key={i} style={{ color: line.startsWith('❌') ? '#f85149' : '#3fb950' }}>{line || ' '}</div>)}
              </div>
            </div>
          )}
        </div>

        {showRobot && (
          <div className="w-72 flex-shrink-0 border-l flex flex-col" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: '#30363d' }}>
              <div className="flex items-center gap-2"><Bot size={16} color="#238636" /><span className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Robô Assistente</span></div>
              <button onClick={() => setShowRobot(false)} className="text-xs" style={{ color: '#8b949e' }}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="p-3 rounded-lg" style={{ background: '#0d1117', border: '1px solid #30363d' }}>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🤖</span>
                  <p className="text-xs leading-relaxed" style={{ color: '#e6edf3' }}>{analysis?.robotMessage || '👋 Olá! Escreva seu código e eu vou verificar se está correto!'}</p>
                </div>
              </div>
              {analysis && (
                <div className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium" style={{ background: analysis.isValid ? '#23863620' : '#f8514920', border: `1px solid ${analysis.isValid ? '#238636' : '#f85149'}40`, color: analysis.isValid ? '#3fb950' : '#f85149' }}>
                  {analysis.isValid ? <><CheckCircle size={14} /> Código correto!</> : <><XCircle size={14} /> {analysis.errors.length} erro(s) encontrado(s)</>}
                </div>
              )}
              {analysis && analysis.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold" style={{ color: '#f85149' }}>Erros encontrados:</p>
                  {analysis.errors.map((err, i) => (
                    <div key={i} className="p-2 rounded-lg text-xs" style={{ background: '#f8514910', border: '1px solid #f8514930' }}>
                      <p style={{ color: '#f85149' }}>{err.message}</p>
                      <div className="mt-1 flex items-start gap-1">
                        <ChevronRight size={10} color="#3fb950" className="mt-0.5 flex-shrink-0" />
                        <p style={{ color: '#3fb950' }}>{err.fix}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {analysis && analysis.warnings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold" style={{ color: '#d29922' }}>Avisos:</p>
                  {analysis.warnings.map((w, i) => (
                    <div key={i} className="p-2 rounded-lg text-xs" style={{ background: '#d2992210', border: '1px solid #d2992230' }}>
                      <div className="flex items-start gap-1"><AlertCircle size={10} color="#d29922" className="mt-0.5 flex-shrink-0" /><p style={{ color: '#d29922' }}>{w.message}</p></div>
                    </div>
                  ))}
                </div>
              )}
              {analysis && analysis.concepts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#8b949e' }}>Conceitos usados:</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.concepts.map((c, i) => <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: '#1f6feb20', color: '#1f6feb' }}>{c}</span>)}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t" style={{ borderColor: '#30363d' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#8b949e' }}>Botões importantes:</p>
                <div className="space-y-1.5 text-xs" style={{ color: '#8b949e' }}>
                  <div className="flex items-center gap-2"><span className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: '#238636', color: 'white' }}>▶ Executar</span><span>Roda o código</span></div>
                  <div className="flex items-center gap-2"><span className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: '#1f6feb', color: 'white' }}>💾 Salvar</span><span>Salva e vai ao resumo</span></div>
                  <div className="flex items-center gap-2"><span className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: '#30363d', color: '#e6edf3' }}>📄+</span><span>Novo arquivo</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-1 border-t" style={{ background: '#161b22', borderColor: '#30363d' }}>
        <button onClick={() => setShowTerminal(!showTerminal)} className="text-xs flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: showTerminal ? '#30363d' : 'transparent', color: '#8b949e' }}>
          <Terminal size={12} /> Terminal
        </button>
        <button onClick={() => setShowRobot(!showRobot)} className="text-xs flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: showRobot ? '#30363d' : 'transparent', color: '#8b949e' }}>
          <Bot size={12} /> Robô
        </button>
      </div>
    </div>
  )
}
