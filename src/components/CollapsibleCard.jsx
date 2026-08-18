import { useState, useEffect } from "react";

// card que começa fechado (só o título) e abre com um clique — usado pra esconder as ferramentas menos
// usadas do painel do professor (diagnóstico, boletim, retrospectiva...) sem tirar nada do ar, só do
// primeiro olhar. O conteúdo (children) só é montado quando aberto, então nada roda escondido à toa.
export function CollapsibleCard({ title, color = "#fbbf24", defaultOpen = false, alertOpen = false, dataTourProf, headerRight, children }) {
  const [open, setOpen] = useState(defaultOpen);
  // se alertOpen virar true (ex: banco ou IA com problema de verdade), abre sozinho — decluttered
  // quando tá tudo bem, mas não esconde um alerta real atrás de um card fechado
  useEffect(() => { if (alertOpen) setOpen(true); }, [alertOpen]);
  const cardStyle = { background:"linear-gradient(180deg,#231636,#1a1029)", borderRadius:16, margin:"10px 0", border:"1px solid #3a2a55", boxShadow:"0 8px 24px rgba(3,5,16,.35)", animation:"rise .35s ease both", fontSize:12, padding: open ? 16 : "10px 16px" };
  return (
    <div data-tour-prof={dataTourProf} className="cardfx" style={cardStyle}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap", margin: open ? "0 0 6px" : 0 }}>
        <button onClick={()=>setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", cursor:"pointer", padding:0 }}>
          <h4 style={{ color, fontSize:13, margin:0 }}>{title}</h4>
          <span style={{ color:"#776798", fontSize:12, transform: open ? "rotate(180deg)" : "none", transition:"transform .15s ease" }}>▼</span>
        </button>
        {headerRight && <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>{headerRight}</div>}
      </div>
      {open && children}
    </div>
  );
}
