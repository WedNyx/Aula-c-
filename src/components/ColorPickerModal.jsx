// ── cor de fundo personalizada: antes só dava pra pedir pro Nyx trocar via chat (gastava uma
// chamada de IA a cada pedido); agora é direto, sem passar pelo Nyx nenhuma vez ──
const PRESET_COLORS = [
  { hex: "#c084fc", label: "Roxo" },
  { hex: "#22d3ee", label: "Ciano" },
  { hex: "#ec4899", label: "Rosa" },
  { hex: "#34d399", label: "Verde" },
  { hex: "#fb923c", label: "Laranja" },
  { hex: "#f87171", label: "Vermelho" },
  { hex: "#60a5fa", label: "Azul" },
  { hex: "#fbbf24", label: "Amarelo" },
];

export function ColorPickerModal({ current, onChoose, onClose }) {
  const isCustom = typeof current === "string" && current.startsWith("#");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:440, width:"100%", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#c084fc,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🎨 Cor do fundo</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Escolha uma cor pronta ou pinte a sua no seletor.</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10, marginBottom:16 }}>
          {PRESET_COLORS.map(c => (
            <button key={c.hex} onClick={()=>onChoose(c.hex)} title={c.label}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, background:"transparent", border:"none", cursor:"pointer", padding:4 }}>
              <span style={{ width:40, height:40, borderRadius:"50%", background:c.hex, border: current===c.hex ? "3px solid #fff" : "2px solid #3b2a58", boxShadow:`0 0 12px ${c.hex}55` }} />
              <span style={{ color:"#a99ac9", fontSize:10.5 }}>{c.label}</span>
            </button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"10px 12px" }}>
          <input type="color" value={isCustom ? current : "#c084fc"} onChange={(e)=>onChoose(e.target.value)}
            style={{ width:44, height:44, border:"none", borderRadius:8, background:"transparent", cursor:"pointer", padding:0 }} />
          <div>
            <div style={{ color:"#f0e9fb", fontSize:13, fontWeight:700 }}>Escolher outra cor</div>
            <div style={{ color:"#776798", fontSize:11.5 }}>Toque no círculo pra abrir o seletor</div>
          </div>
        </div>
        <button onClick={()=>onChoose("dark")} style={{ width:"100%", marginTop:14, background:"transparent", border:"1px solid #3b2a58", color:"#a99ac9", borderRadius:10, padding:"8px 0", fontSize:12.5, fontWeight:700, cursor:"pointer" }}>↺ Voltar pro roxo padrão</button>
      </div>
    </div>
  );
}
