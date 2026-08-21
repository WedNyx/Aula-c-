import { useEffect, useMemo, useRef, useState } from "react";

const newNote = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title: "Nova anotação",
  body: "",
  pinned: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const dateLabel = (timestamp) => {
  if (!timestamp) return "";
  try { return new Date(timestamp).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" }); }
  catch { return ""; }
};

export function TeacherNotesModal({ loadNotes, saveNotes, onClose }) {
  const [compact, setCompact] = useState(() => window.innerWidth < 650);
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("saved");
  const loadedRef = useRef(false);
  const notesRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 650);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let active = true;
    loadNotes().then((saved) => {
      if (!active) return;
      const clean = Array.isArray(saved) ? saved : [];
      setNotes(clean);
      notesRef.current = clean;
      setSelectedId(clean[0]?.id || null);
      setLoading(false);
      loadedRef.current = true;
    });
    return () => { active = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []); // carrega uma vez ao abrir

  const persistSoon = (next) => {
    notesRef.current = next;
    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const ok = await saveNotes(notesRef.current);
      setSaveState(ok ? "saved" : "error");
    }, 650);
  };

  const replaceNotes = (next) => {
    setNotes(next);
    if (loadedRef.current) persistSoon(next);
  };

  const selected = notes.find(n => n.id === selectedId) || null;
  const visibleNotes = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return [...notes]
      .filter(n => !q || `${n.title || ""} ${n.body || ""}`.toLocaleLowerCase("pt-BR").includes(q))
      .sort((a,b) => Number(b.pinned)-Number(a.pinned) || (b.updatedAt||0)-(a.updatedAt||0));
  }, [notes, search]);

  const addNote = () => {
    const note = newNote();
    replaceNotes([note, ...notes]);
    setSelectedId(note.id);
  };

  const updateSelected = (patch) => {
    if (!selected) return;
    replaceNotes(notes.map(n => n.id === selected.id ? { ...n, ...patch, updatedAt:Date.now() } : n));
  };

  const removeSelected = () => {
    if (!selected || !window.confirm(`Excluir a anotação “${selected.title || "Sem título"}”?`)) return;
    const next = notes.filter(n => n.id !== selected.id);
    replaceNotes(next);
    setSelectedId(next[0]?.id || null);
  };

  const closeAndSave = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (loadedRef.current && saveState !== "saved") await saveNotes(notesRef.current);
    onClose();
  };

  return (
    <div onMouseDown={e=>{ if (e.target===e.currentTarget) closeAndSave(); }} style={{ position:"fixed", inset:0, zIndex:1600, background:"rgba(8,4,16,.86)", backdropFilter:"blur(7px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div role="dialog" aria-modal="true" aria-label="Anotações do professor" style={{ width:"min(980px,96vw)", height:"min(700px,90vh)", background:"#171026", border:"1px solid #fbbf2466", borderRadius:18, boxShadow:"0 24px 80px #000a", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <header style={{ padding:"14px 18px", borderBottom:"1px solid #3b2a58", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div>
            <div style={{ color:"#fbbf24", fontWeight:900, fontSize:18 }}>📝 Minhas anotações</div>
            <div style={{ color:saveState==="error"?"#f87171":"#8d7cae", fontSize:11.5, marginTop:2 }}>{saveState==="saving"?"Salvando...":saveState==="error"?"Não foi possível salvar — tente fechar e abrir novamente.":"Salvo automaticamente"}</div>
          </div>
          <button onClick={closeAndSave} aria-label="Fechar anotações" style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:24, cursor:"pointer" }}>×</button>
        </header>

        <div style={{ display:"grid", gridTemplateColumns:compact?"1fr":"minmax(220px,30%) 1fr", gridTemplateRows:compact?"minmax(160px,34%) 1fr":"1fr", minHeight:0, flex:1 }}>
          <aside style={{ borderRight:compact?"none":"1px solid #3b2a58", borderBottom:compact?"1px solid #3b2a58":"none", padding:12, display:"flex", flexDirection:"column", gap:10, minHeight:0 }}>
            <button onClick={addNote} style={{ background:"linear-gradient(135deg,#fbbf24,#f59e0b)", color:"#1c1400", border:0, borderRadius:10, padding:"10px 12px", fontWeight:900, cursor:"pointer" }}>＋ Nova anotação</button>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar..." aria-label="Pesquisar anotações" style={{ background:"#100a1c", color:"#f0e9fb", border:"1px solid #3b2a58", borderRadius:9, padding:"9px 10px", outline:"none" }} />
            <div style={{ overflowY:"auto", display:"flex", flexDirection:"column", gap:7 }}>
              {loading && <div style={{ color:"#8d7cae", fontSize:13, padding:8 }}>Carregando...</div>}
              {!loading && visibleNotes.length===0 && <div style={{ color:"#8d7cae", fontSize:13, padding:8 }}>{search ? "Nenhuma anotação encontrada." : "Você ainda não criou anotações."}</div>}
              {visibleNotes.map(note => (
                <button key={note.id} onClick={()=>setSelectedId(note.id)} style={{ textAlign:"left", background:selectedId===note.id?"#fbbf2418":"#100a1c", border:`1px solid ${selectedId===note.id?"#fbbf24":"#302242"}`, borderRadius:10, padding:"9px 10px", cursor:"pointer", minWidth:0 }}>
                  <div style={{ color:"#f0e9fb", fontWeight:800, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{note.pinned?"📌 ":""}{note.title || "Sem título"}</div>
                  <div style={{ color:"#776798", fontSize:10.5, marginTop:4 }}>{dateLabel(note.updatedAt)}</div>
                </button>
              ))}
            </div>
          </aside>

          <main style={{ padding:16, minWidth:0, minHeight:0, display:"flex", flexDirection:"column", gap:10 }}>
            {!selected ? (
              <div style={{ margin:"auto", textAlign:"center", color:"#8d7cae" }}><div style={{ fontSize:44 }}>🗒️</div><div>Crie uma anotação para começar.</div></div>
            ) : (
              <>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={selected.title || ""} onChange={e=>updateSelected({ title:e.target.value })} maxLength={100} placeholder="Título da anotação" aria-label="Título da anotação" style={{ flex:1, minWidth:0, background:"#100a1c", color:"#f0e9fb", border:"1px solid #3b2a58", borderRadius:10, padding:"11px 12px", fontWeight:800, fontSize:16, outline:"none" }} />
                  <button onClick={()=>updateSelected({ pinned:!selected.pinned })} title={selected.pinned?"Desafixar":"Fixar no topo"} style={{ background:selected.pinned?"#fbbf2422":"#100a1c", color:selected.pinned?"#fbbf24":"#a99ac9", border:`1px solid ${selected.pinned?"#fbbf24":"#3b2a58"}`, borderRadius:10, padding:"8px 12px", cursor:"pointer" }}>📌</button>
                  <button onClick={removeSelected} title="Excluir anotação" style={{ background:"#2a1010", color:"#f87171", border:"1px solid #f8717155", borderRadius:10, padding:"8px 12px", cursor:"pointer" }}>🗑️</button>
                </div>
                <textarea value={selected.body || ""} onChange={e=>updateSelected({ body:e.target.value })} maxLength={20000} placeholder="Escreva aqui lembretes da aula, ideias, observações sobre conteúdos..." aria-label="Conteúdo da anotação" style={{ flex:1, resize:"none", minHeight:220, background:"#100a1c", color:"#e9ddf7", border:"1px solid #3b2a58", borderRadius:12, padding:14, lineHeight:1.6, fontSize:14, fontFamily:"inherit", outline:"none" }} />
                <div style={{ color:"#776798", fontSize:11, display:"flex", justifyContent:"space-between" }}><span>Atualizada em {dateLabel(selected.updatedAt)}</span><span>{(selected.body||"").length.toLocaleString("pt-BR")} / 20.000</span></div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
