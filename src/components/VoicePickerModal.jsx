import { useState, useEffect } from "react";
import { listPtVoices } from "../lib/speech.js";

// ── seletor de voz: o aluno testa e escolhe a voz que prefere entre as do aparelho ──
export function VoicePickerModal({ onClose }) {
  const [voices, setVoices] = useState(() => listPtVoices());
  const [saved, setSaved] = useState(() => { try { return localStorage.getItem("nyx_voice_name") || ""; } catch { return ""; } });
  useEffect(() => {
    if (voices.length) return;
    const t = setInterval(() => { const v = listPtVoices(); if (v.length) { setVoices(v); clearInterval(t); } }, 300);
    const stop = setTimeout(() => clearInterval(t), 4000);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, [voices.length]);
  const testVoice = (v) => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Oi! Eu sou o Nyx, e essa é a minha voz. Vamos programar juntos?");
      u.lang = "pt-BR"; u.voice = v; u.rate = 0.95; u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch {}
  };
  const chooseVoice = (v) => {
    try { localStorage.setItem("nyx_voice_name", v.name); } catch {}
    setSaved(v.name);
  };
  const isNatural = (v) => /natural|neural|online/i.test(v.name);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:520, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#c084fc,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🗣️ Voz do Nyx</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Teste as vozes em português que existem neste aparelho e escolha a que você prefere pra leitura em voz alta.</p>
        {voices.length === 0 ? (
          <p style={{ color:"#776798", fontSize:13 }}>Não encontrei vozes em português neste aparelho. A leitura vai usar a voz padrão do sistema.</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {voices.map(v => (
              <div key={v.name} style={{ display:"flex", alignItems:"center", gap:8, background: saved===v.name ? "#c084fc22" : "#171026", border:`1px solid ${saved===v.name ? "#c084fc" : "#3b2a58"}`, borderRadius:12, padding:"8px 12px", flexWrap:"wrap" }}>
                <span style={{ flex:1, minWidth:140, fontSize:13, fontWeight:700, color:"#f0e9fb" }}>
                  {v.name}
                  {isNatural(v) && <span style={{ marginLeft:6, background:"#34d39922", border:"1px solid #34d399", color:"#34d399", borderRadius:8, padding:"1px 7px", fontSize:10.5, fontWeight:800 }}>✨ Natural</span>}
                </span>
                <button onClick={()=>testVoice(v)} style={{ background:"transparent", border:"1px solid #22d3ee", color:"#22d3ee", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:700, cursor:"pointer" }}>🔊 Testar</button>
                <button onClick={()=>chooseVoice(v)} style={{ background: saved===v.name ? "#c084fc" : "transparent", border:"1px solid #c084fc", color: saved===v.name ? "#fff" : "#c084fc", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:700, cursor:"pointer" }}>{saved===v.name ? "✓ Escolhida" : "Usar esta"}</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ background:"#22d3ee14", border:"1px solid #22d3ee55", borderRadius:12, padding:"10px 12px", marginTop:14, fontSize:12.5, color:"#a9e8f3", lineHeight:1.6 }}>
          💡 <b>Dica pro professor:</b> no navegador <b>Edge</b> aparecem vozes com o selo <b>✨ Natural</b> (Francisca, Thalita...) — são quase humanas e de graça. No Chrome, só existem as vozes básicas do sistema.
        </div>
      </div>
    </div>
  );
}
