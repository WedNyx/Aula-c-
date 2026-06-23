'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { analyzeCode } from '@/lib/csharpAnalyzer'
import { Play, FilePlus, Pencil, Trash2, Terminal, Bot, ChevronLeft, CheckCircle, XCircle, FileCode } from 'lucide-react'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

export default function TeacherEditor() {
  const router = useRouter()
  const { teacherFiles, addTeacherFile, updateTeacherFile, renameTeacherFile, deleteTeacherFile } = useAppStore()
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['> Terminal do professor.', '> Clique em Executar para rodar o código.'])
  const [isRunning, setIsRunning] = useState(false)
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeCode> | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [showNewFile, setShowNewFile] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (teacherFiles.length === 0) { const file = addTeacherFile('Exemplo.cs'); setSelectedFileId(file.id) }
    else setSelectedFileId(teacherFiles[0].id)
  }, [])

  useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight }, [terminalOutput])

  const selectedFile = teacherFiles.find(f => f.id === selectedFileId)

  const handleCodeChange = (value: string | undefined) => {
    if (!selectedFileId || !value) return
    updateTeacherFile(selectedFileId, value)
    setAnalysis(analyzeCode(value, 'Professor'))
  }

  const handleRun = async () => {
    if (!selectedFile) return
    setIsRunning(true)
    setTerminalOutput(prev => [...prev, '', `> Executando ${selectedFile.name}...`])
    try {
      const res = await fetch('/api/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: selectedFile.content }) })
      const data = await res.json()
      setTerminalOutput(prev => [...prev, ...(data.output || 'Sem saída.').split('\n')])
    } catch { setTerminalOutput(prev => [...prev, '❌ Erro ao executar.']) }
    setIsRunning(false)
  }

  const handleNewFile = () => {
    if (!newFileName.trim()) return
    const name = newFileName.trim().endsWith('.cs') ? newFileName.trim() : newFileName.trim() + '.cs'
    const file = addTeacherFile(name)
    setSelectedFileId(file.id); setNewFileName(''); setShowNewFile(false)
  }

  const handleRename = (id: string) => { if (!renameValue.trim()) return; renameTeacherFile(id, renameValue.trim() + '.cs'); setRenamingId(null) }
  const handleDelete = (id: string) => {
    if (teacherFiles.length <= 1) return
    deleteTeacherFile(id)
    const remaining = teacherFiles.filter(f => f.id !== id)
    setSelectedFileId(remaining[0]?.id || null)
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0d1117' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0" style={{ background: '#161b22', borderColor: '#30363d' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/teacher')} style={{ color: '#8b949e' }}><ChevronLeft size={18} /></button>
          <FileCode size={18} color="#bc8cff" />
          <span className="font-semibold text-sm" style={{ color: '#e6edf3' }}>Editor do Professor</span>
        </div>
        <button onClick={handleRun} disabled={isRunning} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
          style={{ background: '#238636', color: 'white', opacity: isRunning ? 0.7 : 1 }}
        >
          <Play size={14} />{isRunning ? 'Executando...' : 'Executar'}
        </button>
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
                onKeyDown={e => { if (e.key === 'Enter') handleNewFile(); if (e.key === 'Escape') setShowNewFile(false) }}
                placeholder="NomeArquivo" className="w-full p-1.5 text-xs rounded outline-none"
                style={{ background: '#0d1117', border: '1px solid #bc8cff', color: '#e6edf3' }}
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-1">
            {teacherFiles.map(file => (
              <div key={file.id} className="group flex items-center gap-1 rounded px-2 py-1.5 cursor-pointer"
                style={{ background: selectedFileId === file.id ? '#2d1f4f' : 'transparent' }}
                onClick={() => setSelectedFileId(file.id)}
              >
                <span className="text-xs">📄</span>
                {renamingId === file.id ? (
                  <input autoFocus type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(file.id)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(file.id); if (e.key === 'Escape') setRenamingId(null) }}
                    className="flex-1 text-xs bg-transparent outline-none border-b" style={{ color: '#e6edf3', borderColor: '#bc8cff' }}
                  />
                ) : (
                  <span className="flex-1 text-xs truncate" style={{ color: '#e6edf3' }}>{file.name}</span>
                )}
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button onClick={e => { e.stopPropagation(); setRenamingId(file.id); setRenameValue(file.name.replace('.cs', '')) }} className="p-0.5 rounded" style={{ color: '#8b949e' }}><Pencil size={10} /></button>
                  {teacherFiles.length > 1 && <button onClick={e => { e.stopPropagation(); handleDelete(file.id) }} className="p-0.5 rounded" style={{ color: '#f85149' }}><Trash2 size={10} /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              <MonacoEditor height="100%" language="csharp" theme="vs-dark" value={selectedFile?.content || ''} onChange={handleCodeChange}
                options={{ fontSize: 14, fontFamily: "'Cascadia Code', Consolas, monospace", minimap: { enabled: true }, scrollBeyondLastLine: false, wordWrap: 'on', automaticLayout: true, tabSize: 4 }}
              />
            </div>
            <div className="h-36 flex-shrink-0 border-t flex flex-col" style={{ background: '#0d1117', borderColor: '#30363d' }}>
              <div className="flex items-center justify-between px-3 py-1 border-b" style={{ background: '#161b22', borderColor: '#30363d' }}>
                <div className="flex items-center gap-2"><Terminal size={14} color="#8b949e" /><span className="text-xs" style={{ color: '#8b949e' }}>Terminal</span></div>
                <button onClick={() => setTerminalOutput(['> Terminal limpo.'])} className="text-xs" style={{ color: '#8b949e' }}>Limpar</button>
              </div>
              <div ref={terminalRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs" style={{ color: '#3fb950' }}>
                {terminalOutput.map((line, i) => <div key={i} style={{ color: line.startsWith('❌') ? '#f85149' : '#3fb950' }}>{line || ' '}</div>)}
              </div>
            </div>
          </div>
          <div className="w-64 flex-shrink-0 border-l flex flex-col" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: '#30363d' }}>
              <Bot size={16} color="#bc8cff" /><span className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Análise</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {analysis ? (
                <>
                  <div className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium" style={{ background: analysis.isValid ? '#23863620' : '#f8514920', color: analysis.isValid ? '#3fb950' : '#f85149' }}>
                    {analysis.isValid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {analysis.isValid ? 'Código válido' : `${analysis.errors.length} erro(s)`}
                  </div>
                  {analysis.errors.map((e, i) => (
                    <div key={i} className="p-2 rounded-lg text-xs" style={{ background: '#f8514910', border: '1px solid #f8514930' }}>
                      <p style={{ color: '#f85149' }}>{e.message}</p>
                      <p className="mt-1" style={{ color: '#3fb950' }}>→ {e.fix}</p>
                    </div>
                  ))}
                  {analysis.concepts.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#8b949e' }}>Conceitos:</p>
                      {analysis.concepts.map((c, i) => <span key={i} className="text-xs px-2 py-0.5 rounded mr-1 mb-1 inline-block" style={{ background: '#bc8cff20', color: '#bc8cff' }}>{c}</span>)}
                    </div>
                  )}
                </>
              ) : <p className="text-xs" style={{ color: '#8b949e' }}>Escreva código para ver a análise aqui.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
