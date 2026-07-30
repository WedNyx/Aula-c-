import { CodeBlock } from "./CodeEditor.jsx";

// renderização bonita de um resumo salvo (mesmo estilo da tela de resumo da aula) — usada pelo
// estudo do chefão (BossStudyModal) e pelo caderno de resumos (NotebookModal)
export function SummaryPretty({ sum }) {
  const structured = sum && typeof sum === "object" && Array.isArray(sum.secoes) && sum.secoes.length > 0;
  const ACCENTS = ["#c084fc","#34d399","#fbbf24","#06b6d4","#ec4899","#8b5cf6","#f87171"];
  if (!structured) return <pre style={{ whiteSpace:"pre-wrap", fontFamily:"inherit", fontSize:14, lineHeight:1.9, color:"#d6c9ec", margin:0 }}>{typeof sum==="string" ? sum : (sum && sum.raw) || "(resumo indisponível)"}</pre>;
  return (
    <div>
      {sum.intro && <p style={{ color:"#d6c9ec", fontSize:14.5, lineHeight:1.7, margin:"0 0 14px" }}>{sum.intro}</p>}
      {sum.secoes.map((s,i)=>{
        const c = ACCENTS[i % ACCENTS.length];
        return (
          <div key={i} style={{ background:"#1e1430", borderRadius:14, padding:16, margin:"0 0 12px", border:"1px solid #3b2a58", borderLeft:`5px solid ${c}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:38, height:38, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{s.emoji || "📌"}</span>
              <h3 style={{ color:"#f0e9fb", fontSize:15.5, margin:0 }}>{s.titulo}</h3>
            </div>
            {s.explicacao && <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.7, margin:"0 0 4px" }}>{s.explicacao}</p>}
            {s.exemplo && <CodeBlock code={s.exemplo} />}
          </div>
        );
      })}
      {sum.dica && (
        <div style={{ background:"#fbbf2416", border:"1px solid #fbbf24", borderRadius:14, padding:14, display:"flex", gap:10 }}>
          <div style={{ fontSize:22, lineHeight:1 }}>💡</div>
          <p style={{ color:"#fcd9a0", fontSize:14, lineHeight:1.7, margin:0 }}>{sum.dica}</p>
        </div>
      )}
    </div>
  );
}
