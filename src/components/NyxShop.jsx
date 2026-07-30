import { useState, useEffect, useRef } from "react";
import { NYX_ITEMS, NyxRobot } from "./NyxRobot.jsx";

// ════════════════════════════════════════════════════════════════════════════
//  LOJA DO NYX  (troca pontos de acerto por acessórios cosméticos)
// ════════════════════════════════════════════════════════════════════════════
export function NyxShop({ wallet, owned, gear, onEquip, onBuy, isTestShift, onClose }) {
  // 🥚 o Nyx da loja também entra no personagem: na hora que o chapéu pirata é vestido ou o combo
  // espartano (espada+escudo) se forma, ele fala a frase do Easter Egg com uma animação própria
  const [eggTalk, setEggTalk] = useState(null); // { kind:"pirata"|"espartano", msg, color }
  const prevGearRef = useRef(gear);
  useEffect(() => {
    const prev = prevGearRef.current || {};
    prevGearRef.current = gear;
    const wasSpartan = prev.hand === "espada" && prev.shield === "escudo";
    const isSpartanNow = gear.hand === "espada" && gear.shield === "escudo";
    let talk = null;
    if (isSpartanNow && !wasSpartan) {
      talk = { kind:"espartano", color:"#f87171", msg:"🛡️ ISTO... É... C#!! Nenhum erro de compilação assusta um guerreiro Espartano. Vamos à batalha pelo código perfeito!" };
    } else if (gear.head === "chapeuPirata" && prev.head !== "chapeuPirata") {
      talk = { kind:"pirata", color:"#fbbf24", msg:"🏴‍☠️ Argh! Olhem só, um chapéu de pirata!\n\n\"Quer o meu tesouro? Procure-o... nele há tudo o que essa plataforma pode oferecer.\"" };
    }
    if (talk) {
      setEggTalk(talk);
      const t = setTimeout(() => setEggTalk(null), 10000);
      return () => clearTimeout(t);
    }
  }, [gear]);
  const click = (item) => {
    const has = isTestShift || owned.includes(item.id);
    if (has) {
      const isEquipped = gear[item.slot] === item.id;
      onEquip({ ...gear, [item.slot]: isEquipped ? null : item.id });
    } else if (wallet >= item.cost) {
      onBuy(item); // compra: gasta os pontos, entra pro inventário e já equipa
    }
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:560, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#c084fc,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🎁 Loja do Nyx</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>
          {isTestShift ? "🧪 Turma de teste: todos os itens estão liberados para você testar!" : "Cada resposta certa vira 1 ponto. Comprar um item GASTA os pontos — mas o item é seu para sempre! (Seu lugar no ranking não muda: ele conta os pontos que você já ganhou.)"}
        </p>

        <div style={{ display:"flex", alignItems:"center", gap:16, background:"#171026", border:`1px solid ${eggTalk ? eggTalk.color+"88" : "#3b2a58"}`, borderRadius:16, padding:16, marginBottom:16, transition:"border-color .3s" }}>
          <div style={{ flexShrink:0, animation: eggTalk ? (eggTalk.kind === "pirata" ? "nyx-pirate-sway 2.2s ease-in-out infinite" : "nyx-spartan-idle 2.6s ease-in-out infinite") : "none" }}>
            <NyxRobot state="ok" size={72} showName={false} gear={gear} />
          </div>
          {eggTalk ? (
            <div className="pop" style={{ position:"relative", background:"#1e1430", border:`1.5px solid ${eggTalk.color}66`, borderRadius:12, padding:"10px 14px", color:"#f0e9fb", fontSize:13, lineHeight:1.55, fontWeight:600, whiteSpace:"pre-wrap" }}>
              <span style={{ position:"absolute", left:-8, top:"50%", transform:"translateY(-50%)", width:0, height:0, borderTop:"8px solid transparent", borderBottom:"8px solid transparent", borderRight:`8px solid ${eggTalk.color}66` }} />
              {eggTalk.msg}
            </div>
          ) : (
            <div>
              <div style={{ color:"#fbbf24", fontWeight:900, fontSize:22 }}>💰 {wallet} pts</div>
              <div style={{ color:"#776798", fontSize:12 }}>para gastar · itens comprados: toque para vestir ou tirar</div>
            </div>
          )}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
          {NYX_ITEMS.filter(item => !item.secret || isTestShift || owned.includes(item.id)).map(item => {
            const has = isTestShift || owned.includes(item.id);
            const canBuy = !has && wallet >= item.cost;
            const clickable = has || canBuy;
            const equipped = gear[item.slot] === item.id;
            return (
              <button key={item.id} data-item={item.id} onClick={()=>click(item)} disabled={!clickable}
                style={{
                  background: equipped ? "#c084fc26" : "#171026",
                  border: `2px solid ${equipped ? "#c084fc" : has ? "#34d39966" : canBuy ? "#fbbf2466" : "#241f38"}`,
                  borderRadius:14, padding:"14px 10px", textAlign:"center", cursor: clickable?"pointer":"default",
                  opacity: clickable ? 1 : 0.55, position:"relative",
                }}>
                <div style={{ fontSize:30, filter: clickable?"none":"grayscale(1)" }}>{item.emoji}</div>
                <div style={{ color:"#f0e9fb", fontSize:12.5, fontWeight:700, marginTop:6 }}>{item.label}</div>
                {has ? (
                  equipped
                    ? <div style={{ color:"#c084fc", fontSize:11, fontWeight:800, marginTop:4 }}>✓ Equipado</div>
                    : <div style={{ color:"#34d399", fontSize:11, fontWeight:700, marginTop:4 }}>✓ Seu · toque para vestir</div>
                ) : canBuy ? (
                  <div style={{ color:"#fbbf24", fontSize:11, fontWeight:800, marginTop:4 }}>🛒 Comprar · {item.cost} pts</div>
                ) : (
                  <div style={{ color:"#776798", fontSize:11, marginTop:4 }}>🔒 {wallet}/{item.cost} pts</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  🎁 RETROSPECTIVA DO MÊS  (estilo "Wrapped": slides animados com os números do aluno)
// ════════════════════════════════════════════════════════════════════════════
export function RetroOverlay({ name, stats, gear, onClose }) {
  const [step, setStep] = useState(0);
  const first = String(name || "").split(" ")[0];
  const finalPhrase =
    stats.totalLines >= 100 ? `Mais de ${stats.totalLines} linhas de código?! ${first}, você não aprendeu a programar — você VIROU programador(a). Foi uma honra!` :
    stats.best && stats.best.v >= 70 ? `${first}, ver você chegar na nota ${stats.best.v} foi um orgulho enorme. Continue assim que o mundo é seu!` :
    stats.presencas >= 5 ? `${first}, aparecer ${stats.presencas} dias pra aprender já é uma vitória gigante. O resto vem com o tempo — e você já começou!` :
    `${first}, todo programador começou exatamente onde você está. O primeiro passo você já deu — nunca pare!`;
  const slides = [
    { bg:"linear-gradient(135deg,#1e1b4b,#3b0764)", icon:"🎬", title:`${first}, o seu mês na Aula de C#...`, sub:"foi assim 👇 (toque pra ver)", big:null },
    { bg:"linear-gradient(135deg,#052e2b,#065f46)", icon:"📝", title:"Você escreveu", big:`${stats.totalLines}`, sub:stats.totalLines === 1 ? "linha de código de verdade" : "linhas de código de verdade" },
    { bg:"linear-gradient(135deg,#1e3a5f,#0e7490)", icon:"📅", title:"Você esteve aqui em", big:`${stats.presencas}`, sub:stats.presencas === 1 ? "dia de aula" : "dias de aula" },
    ...(stats.best ? [{ bg:"linear-gradient(135deg,#4c1d95,#7c3aed)", icon:"🏆", title:"Sua melhor nota foi", big:`${stats.best.v}`, sub:`na atividade do dia ${String(stats.best.d).split("-").reverse().slice(0,2).join("/")}` }] : []),
    { bg:"linear-gradient(135deg,#713f12,#b45309)", icon:"🎖️", title:"Você desbloqueou", big:`${stats.conquistas}`, sub:`conquista${stats.conquistas===1?"":"s"}${stats.eggs > 0 ? ` — e achou ${stats.eggs} segredo${stats.eggs===1?"":"s"} escondido${stats.eggs===1?"":"s"} 🥚` : ""}` },
    { bg:"linear-gradient(135deg,#7f1d1d,#be123c)", icon:"💰", title:"Você ganhou", big:`${stats.pontos}`, sub:`ponto${stats.pontos===1?"":"s"} do Nyx${stats.duelWins > 0 ? ` — e venceu ${stats.duelWins} duelo${stats.duelWins===1?"":"s"} ⚔️` : ""}` },
    { bg:"linear-gradient(135deg,#0f172a,#1e1b4b)", icon:"💜", title:"Recado do Nyx", big:null, sub:finalPhrase, last:true },
  ];
  const s = slides[Math.min(step, slides.length - 1)];
  const advance = () => { if (!s.last) setStep(v => v + 1); };
  return (
    <div onClick={advance} style={{ position:"fixed", inset:0, background:s.bg, transition:"background .6s ease", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1200, padding:20, cursor: s.last ? "default" : "pointer", overflow:"hidden" }}>
      <div key={step} className="pop" style={{ textAlign:"center", maxWidth:520, width:"100%" }}>
        <div style={{ animation:"nyx-float 3s ease-in-out infinite", display:"inline-block" }}>
          <NyxRobot state="ok" size={s.last ? 110 : 76} showName={false} gear={gear} />
        </div>
        <div style={{ fontSize:44, lineHeight:1, margin:"8px 0" }}>{s.icon}</div>
        <h2 style={{ color:"#fff", fontSize:22, fontWeight:900, margin:"0 0 6px", textShadow:"0 2px 14px rgba(0,0,0,.4)" }}>{s.title}</h2>
        {s.big != null && (
          <div className="shine" style={{ fontSize:84, fontWeight:900, lineHeight:1.1, background:"linear-gradient(120deg,#fff,#fde68a,#fff)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>{s.big}</div>
        )}
        <p style={{ color:"rgba(255,255,255,.85)", fontSize:s.last ? 16 : 14.5, lineHeight:1.7, margin:"6px auto 0", maxWidth:420, fontWeight:600 }}>{s.sub}</p>
        {!s.last && (
          <div style={{ marginTop:22, color:"rgba(255,255,255,.55)", fontSize:12.5 }}>
            {slides.map((_, i) => <span key={i} style={{ display:"inline-block", width:8, height:8, borderRadius:4, margin:"0 3px", background: i <= step ? "#fff" : "rgba(255,255,255,.25)" }} />)}
            <div style={{ marginTop:8 }}>toque pra continuar →</div>
          </div>
        )}
        {s.last && (
          <button onClick={(e)=>{ e.stopPropagation(); onClose(); }} style={{ background:"linear-gradient(135deg,#c084fc,#9333ea)", color:"#fff", border:"none", borderRadius:12, cursor:"pointer", fontWeight:800, boxShadow:"0 4px 18px rgba(124,131,255,.45)", marginTop:22, padding:"13px 28px", fontSize:15 }}>Guardar no coração 💜</button>
        )}
      </div>
    </div>
  );
}
