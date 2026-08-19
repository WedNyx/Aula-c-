import { useState, useEffect, useRef } from "react";
import { shade } from "../lib/colors.ts";
import { gradeInfo } from "../lib/utils.js";
import { findLineIndex } from "../lib/languages.ts";
import { CodeBlock } from "./CodeEditor.jsx";
import { NyxPrismaOrbital as NyxRobot } from "./NyxPrismaOrbital.jsx";

// ════════════════════════════════════════════════════════════════════════════
//  TOUR DE ERRO DO NYX  (quando "Analisar meu código" encontra erro, aponta pro editor e explica
//  passo a passo cada erro encontrado, igual ao tour de onboarding — mas com destaque vermelho)
// ════════════════════════════════════════════════════════════════════════════
// realça o editor com uma borda vermelha enquanto há erro sinalizado — sem escurecer a tela nem tampar
// o código (a explicação de verdade fica num card na coluna lateral, ao lado do editor, sempre)
export function ErrorHighlightRing({ active }) {
  const [rect, setRect] = useState(null);
  // recalcula a posição a cada quadro enquanto ativo, pra borda acompanhar o editor
  // ao rolar a página (position:fixed some do lugar se a gente só calcular uma vez)
  useEffect(() => {
    if (!active) { setRect(null); return; }
    let raf;
    const update = () => {
      const el = document.querySelector('[data-tour="editor"]');
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(prev => (prev && prev.top===r.top && prev.left===r.left && prev.width===r.width && prev.height===r.height)
          ? prev : { top:r.top, left:r.left, width:r.width, height:r.height });
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  if (!active || !rect) return null;
  return (
    <div style={{ position:"fixed", top:rect.top-6, left:rect.left-6, width:rect.width+12, height:rect.height+12, borderRadius:14, border:"3px solid #f87171", boxShadow:"0 0 20px #f8717166", pointerEvents:"none", zIndex:990 }} />
  );
}

// card com a explicação do erro — sempre renderizado na coluna lateral (ao lado do editor), nunca por cima do código
export function ErrorWalkthroughCard({ errors, step, onNext, onPrev, onVerify, onClose, verifying }) {
  const e = errors[step];
  if (!e) return null;
  return (
    <div className="pop" key={step} style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #f8717166", borderRadius:16, padding:"14px 16px", boxShadow:"0 10px 28px rgba(0,0,0,.4)", marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span style={{ color:"#f87171", fontSize:12, fontWeight:800, letterSpacing:0.5 }}>⚠ Erro {step+1} de {errors.length}</span>
        <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:18, cursor:"pointer", lineHeight:1 }}>✕</button>
      </div>
      <div style={{ background:"#171026", border:"1px solid #3e2d5e", borderRadius:8, padding:"6px 10px", fontFamily:"'Courier New',monospace", fontSize:12.5, color:"#f87171", overflowX:"auto", whiteSpace:"pre", marginBottom:8 }}>{e.trecho}</div>
      <p style={{ color:"#d6c9ec", fontSize:13, lineHeight:1.6, margin:0 }}>{e.explicacao}</p>
      {e.exemplo && <div style={{ marginTop:8 }}><CodeBlock code={e.exemplo} /></div>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, gap:8, flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:6 }}>
          {step > 0 && <button onClick={onPrev} style={{ background:"#3b2a58", border:"none", borderRadius:10, color:"#f0e9fb", fontWeight:700, padding:"7px 12px", cursor:"pointer", fontSize:12.5 }}>← Anterior</button>}
          {step < errors.length-1 && <button onClick={onNext} style={{ background:"#3b2a58", border:"none", borderRadius:10, color:"#f0e9fb", fontWeight:700, padding:"7px 12px", cursor:"pointer", fontSize:12.5 }}>Próximo →</button>}
        </div>
        <button onClick={onVerify} disabled={verifying} style={{ background:"linear-gradient(135deg,#34d399,#16a34a)", border:"none", borderRadius:10, color:"#fff", fontWeight:800, padding:"8px 14px", cursor:verifying?"default":"pointer", fontSize:12.5, opacity:verifying?0.6:1 }}>
          {verifying ? "🔍 Verificando..." : "✅ Já corrigi, verificar!"}
        </button>
      </div>
    </div>
  );
}

// balão flutuante com a explicação do erro, ancorado na ALTURA da linha sublinhada no editor (à
// direita dele) — em vez de um card fixo na barra lateral, o balão "segue" a linha certa conforme
// o aluno navega entre os erros ou rola o editor. Nunca fica em cima do código (fica ao lado).
export function FloatingErrorBubble({ errors, step, activeCode, onNext, onPrev, onVerify, onClose, verifying }) {
  const e = errors[step];
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!e) { setPos(null); return; }
    let raf;
    const LINE_H = 21; // 14px * 1.5 — mesma fonte/altura de linha usada no VSEditor
    const PAD_TOP = 12;
    const MARGIN = 12; // respiro mínimo até a borda da tela
    const update = () => {
      const wrap = document.querySelector('[data-tour="editor"]');
      const ta = wrap?.querySelector('textarea');
      if (wrap && ta) {
        const li = findLineIndex(activeCode, e.trecho);
        const wrapRect = wrap.getBoundingClientRect();
        const lineTop = wrapRect.top + PAD_TOP + (li >= 0 ? li : 0) * LINE_H - ta.scrollTop;
        // largura encolhe em telas estreitas, e a posição nunca deixa o balão vazar pra fora da
        // tela (nem em cima do código: sempre começa depois da borda direita do editor)
        const width = Math.min(300, Math.max(220, window.innerWidth - MARGIN * 2));
        const left = Math.min(wrapRect.right + 14, window.innerWidth - width - MARGIN);
        setPos(prev => (prev && prev.top===lineTop && prev.left===left && prev.width===width && prev.wrapBottom===wrapRect.bottom)
          ? prev : { top:lineTop, left, width, wrapTop:wrapRect.top, wrapBottom:wrapRect.bottom });
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [e, step, activeCode]);
  if (!e || !pos) return null;
  const clampedTop = Math.min(Math.max(pos.top, pos.wrapTop), Math.max(pos.wrapTop, pos.wrapBottom - 60));
  return (
    <div className="pop" key={step} style={{ position:"fixed", top:clampedTop, left:pos.left, width:pos.width, maxWidth:"calc(100vw - 24px)", zIndex:995, background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #f8717166", borderRadius:14, padding:"12px 14px", boxShadow:"0 10px 28px rgba(0,0,0,.45)" }}>
      {/* setinha apontando pra linha do editor */}
      <div style={{ position:"absolute", left:-7, top:16, width:12, height:12, background:"#231636", borderLeft:"1px solid #f8717166", borderBottom:"1px solid #f8717166", transform:"rotate(45deg)" }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span style={{ color:"#f87171", fontSize:11.5, fontWeight:800, letterSpacing:0.5 }}>⚠ Erro {step+1} de {errors.length}</span>
        <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:17, cursor:"pointer", lineHeight:1 }}>✕</button>
      </div>
      <div style={{ background:"#171026", border:"1px solid #3e2d5e", borderRadius:8, padding:"5px 9px", fontFamily:"'Courier New',monospace", fontSize:12, color:"#f87171", overflowX:"auto", whiteSpace:"pre", marginBottom:8 }}>{e.trecho}</div>
      <p style={{ color:"#d6c9ec", fontSize:12.5, lineHeight:1.6, margin:0 }}>{e.explicacao}</p>
      {e.exemplo && <div style={{ marginTop:8 }}><CodeBlock code={e.exemplo} /></div>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10, gap:6, flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:5 }}>
          {step > 0 && <button onClick={onPrev} style={{ background:"#3b2a58", border:"none", borderRadius:9, color:"#f0e9fb", fontWeight:700, padding:"6px 10px", cursor:"pointer", fontSize:11.5 }}>← Ant.</button>}
          {step < errors.length-1 && <button onClick={onNext} style={{ background:"#3b2a58", border:"none", borderRadius:9, color:"#f0e9fb", fontWeight:700, padding:"6px 10px", cursor:"pointer", fontSize:11.5 }}>Próx. →</button>}
        </div>
        <button onClick={onVerify} disabled={verifying} style={{ background:"linear-gradient(135deg,#34d399,#16a34a)", border:"none", borderRadius:9, color:"#fff", fontWeight:800, padding:"7px 12px", cursor:verifying?"default":"pointer", fontSize:11.5, opacity:verifying?0.6:1 }}>
          {verifying ? "🔍 Verificando..." : "✅ Corrigi, verificar!"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  FEEDBACK ANIMADO DO NYX  (aparece quando o aluno termina a atividade)
// ════════════════════════════════════════════════════════════════════════════
export function NyxFeedbackModal({ score, loading, feedback, onClose }) {
  const g = gradeInfo(score);
  const robotState = score>=75 ? "ok" : score>=40 ? "idle" : "error";
  const dica = score < 60 ? "Dica: releia com calma as questões que você errou na revisão abaixo — o Nyx te explica cada uma se você pedir!" : "";
  const structured = feedback && typeof feedback === "object" && Array.isArray(feedback.secoes);
  const feedbackText = structured ? feedback.intro : (typeof feedback === "string" ? feedback : "");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:`1px solid ${g.color}55`, borderRadius:22, padding:"28px 24px", maxWidth:440, width:"100%", textAlign:"center", boxShadow:`0 24px 70px rgba(0,0,0,.55), 0 0 50px ${g.color}22` }}>
        <div style={{ animation:"nyx-float 3s ease-in-out infinite" }}>
          <NyxRobot state={robotState} size={110} showName={false} />
        </div>
        <div style={{ fontSize:44, marginTop:6, lineHeight:1 }}>{g.emoji}</div>
        <h2 style={{ color:g.color, fontSize:26, margin:"4px 0 2px", fontWeight:900 }}>{g.label}!</h2>
        <div style={{ color:"#a99ac9", fontSize:14, marginBottom:14 }}>Você fez {score} pontos na atividade</div>
        <div style={{ background:"#171026", border:"1px solid #3e2d5e", borderRadius:16, padding:"16px 18px", textAlign:"left" }}>
          {loading
            ? <p style={{ color:"#a99ac9", fontSize:14, margin:0 }}>Nyx está analisando seu desempenho...</p>
            : <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap", margin:0 }}>{feedbackText || "Parabéns por concluir a aula de hoje!"}</p>}
          {!loading && dica && <p style={{ color:"#fbbf24", fontSize:12.5, lineHeight:1.6, marginTop:10, marginBottom:0 }}>{dica}</p>}
        </div>
        <button onClick={onClose} disabled={loading}
          style={{ background:`linear-gradient(135deg, ${g.color}, ${shade(g.color,-0.18)})`, color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", cursor: loading?"default":"pointer", fontWeight:800, fontSize:14, boxShadow:`0 4px 14px ${g.color}44`, marginTop:18, opacity:loading?0.5:1, width:"100%" }}>
          {loading ? "Aguarde..." : "Entendi, valeu Nyx! →"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  NYX EXPLICA OS ERROS  (revela uma questão errada por vez, com exemplo de código, terminando numa mensagem encorajadora)
// ════════════════════════════════════════════════════════════════════════════
export function ErrorExplainModal({ sections, encouragement, onClose }) {
  const [step, setStep] = useState(0);
  const total = sections.length;
  const onFinal = step >= total;
  const s = sections[step];
  const ACCENTS = ["#c084fc","#34d399","#fbbf24","#06b6d4","#ec4899","#8b5cf6","#f87171"];
  const c = ACCENTS[step % ACCENTS.length];
  const accent = onFinal ? "#34d399" : c;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:`1px solid ${accent}55`, borderRadius:22, padding:"26px 24px", maxWidth:520, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:`0 24px 70px rgba(0,0,0,.55), 0 0 50px ${accent}22` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ color:"#776798", fontSize:12, fontWeight:700, letterSpacing:0.5 }}>{onFinal ? "Pronto!" : `Questão ${step+1} de ${total}`}</span>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:20, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        <div style={{ textAlign:"center" }}>
          <div style={{ display:"inline-block", animation:"nyx-float 3s ease-in-out infinite" }}>
            <NyxRobot state={onFinal ? "ok" : "idle"} size={90} showName={false} />
          </div>
        </div>

        {onFinal ? (
          <div style={{ textAlign:"center", marginTop:6 }}>
            <div style={{ fontSize:40 }}>🎉</div>
            <p style={{ color:"#d6c9ec", fontSize:16, lineHeight:1.7, margin:"8px 0 0" }}>{encouragement}</p>
          </div>
        ) : (
          <div style={{ marginTop:12, background:"#1e1430", borderRadius:14, padding:18, border:"1px solid #3b2a58", borderLeft:`5px solid ${c}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
              <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{s.emoji || "📌"}</span>
              <h3 style={{ color:"#f0e9fb", fontSize:16, margin:0 }}>{s.titulo}</h3>
            </div>
            {s.explicacao && <p style={{ color:"#d6c9ec", fontSize:14.5, lineHeight:1.75, margin:"0 0 4px" }}>{s.explicacao}</p>}
            {s.exemplo && <CodeBlock code={s.exemplo} />}
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginTop:18 }}>
          {step > 0 && !onFinal && (
            <button onClick={()=>setStep(v=>v-1)} style={{ background:"#3b2a58", color:"#f0e9fb", border:"none", borderRadius:10, padding:"10px 16px", cursor:"pointer", fontWeight:700, fontSize:13.5 }}>← Voltar</button>
          )}
          <button onClick={()=> onFinal ? onClose() : setStep(v=>v+1)}
            style={{ flex:1, background:`linear-gradient(135deg, ${accent}, ${shade(accent,-0.18)})`, color:"#fff", border:"none", borderRadius:10, padding:"10px 16px", cursor:"pointer", fontWeight:800, fontSize:14 }}>
            {onFinal ? "Fechar" : (step === total-1 ? "Terminar →" : "Próximo →")}
          </button>
        </div>

        {!onFinal && total > 1 && (
          <div style={{ display:"flex", gap:5, justifyContent:"center", marginTop:14 }}>
            {sections.map((_,i)=>(
              <div key={i} style={{ width:7, height:7, borderRadius:"50%", background: i===step ? c : "#3b2a58" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
