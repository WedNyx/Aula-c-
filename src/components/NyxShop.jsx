import { useState, useEffect, useRef } from "react";
import { NYX_ITEMS } from "./NyxRobot.jsx";
import { NyxPrismaOrbital as NyxRobot } from "./NyxPrismaOrbital.jsx";
import { useViewportWidth } from "../lib/utils.js";

// nomes de exibição dos encaixes na loja — só rótulo visual, o campo "slot" de cada item e o
// objeto de gear guardado por aluno continuam com as mesmas chaves de sempre (head/face/neck/
// hand/shield), então trocar esses nomes não quebra nenhum acessório já comprado por ninguém
const SLOT_SECTIONS = [
  { slot: "skin",   label: "🌙 Aparências" },
  { slot: "head",   label: "🎩 Cabeça" },
  { slot: "face",   label: "🕶️ Rosto" },
  { slot: "neck",   label: "🧣 Pescoço" },
  { slot: "hand",   label: "🌌 Órbita" },
  { slot: "shield", label: "🛡️ Escudo Orbital" },
  { slot: "costas", label: "🦸 Costas" },
];
const secondKey = slot => `${slot}2`;
const equippedInSlot = (gear, slot) => [gear?.[slot], gear?.[secondKey(slot)]].filter(Boolean);
const hasItem = (gear, slot, item) => equippedInSlot(gear, slot).includes(item);
const isPirateSet = (gear = {}) => hasItem(gear,"head","chapeuPirata") && hasItem(gear,"face","vendaPirata") && hasItem(gear,"hand","espada");

// ════════════════════════════════════════════════════════════════════════════
//  LOJA DO NYX  (troca pontos de acerto por acessórios cosméticos)
// ════════════════════════════════════════════════════════════════════════════
export function NyxShop({ wallet, spent = 0, owned, gear, onEquip, onBuy, onRefund = ()=>{}, isTestShift, onClose }) {
  const vw = useViewportWidth();
  const isNarrow = vw < 640; // abaixo disso, o Nyx fica em cima e os acessórios embaixo (empilhado)
  // 🥚 o Nyx da loja também entra no personagem: na hora que o chapéu pirata é vestido ou o combo
  // espartano (espada+escudo) se forma, ele fala a frase do Easter Egg com uma animação própria
  const [eggTalk, setEggTalk] = useState(null); // { kind:"pirata"|"espartano", msg, color }
  const [preview, setPreview] = useState(null); // item sendo pré-visualizado no Nyx (antes de comprar)
  const [refundConfirm, setRefundConfirm] = useState(false);
  const [equipNotice, setEquipNotice] = useState("");
  const prevGearRef = useRef(gear);
  useEffect(() => {
    const prev = prevGearRef.current || {};
    prevGearRef.current = gear;
    const wasSpartan = hasItem(prev,"hand","espada") && hasItem(prev,"shield","escudo");
    const isSpartanNow = hasItem(gear,"hand","espada") && hasItem(gear,"shield","escudo");
    let talk = null;
    if (isSpartanNow && !wasSpartan) {
      talk = { kind:"espartano", color:"#f87171", msg:"🛡️ ISTO... É... C#!! Nenhum erro de compilação assusta um guerreiro Espartano. Vamos à batalha pelo código perfeito!" };
    } else if (isPirateSet(gear) && !isPirateSet(prev)) {
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
    const second = secondKey(item.slot);
    const equippedKey = gear[item.slot] === item.id ? item.slot : gear[second] === item.id ? second : null;
    if (has) {
      if (equippedKey) {
        setEquipNotice("");
        onEquip({ ...gear, [equippedKey]:null });
        return;
      }
      if (item.slot === "skin") { setEquipNotice(""); onEquip({ ...gear, skin:item.id }); return; }
      const target = !gear[item.slot] ? item.slot : !gear[second] ? second : null;
      if (!target) { setEquipNotice(`Você já está usando dois acessórios de ${item.slot}. Tire um deles antes.`); return; }
      setEquipNotice("");
      onEquip({ ...gear, [target]:item.id });
    } else if (wallet >= item.cost) {
      const target = item.slot === "skin" ? "skin" : !gear[item.slot] ? item.slot : !gear[second] ? second : null;
      if (!target) { setEquipNotice(`Você já está usando dois acessórios de ${item.slot}. Tire um deles antes de comprar outro.`); return; }
      setEquipNotice("");
      onBuy(item, target);
    }
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:800, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#c084fc,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🎁 Loja do Nyx</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>
          {isTestShift ? "🧪 Turma de teste: todos os itens estão liberados para você testar!" : "Cada resposta certa vira 1 ponto. Comprar um item GASTA os pontos — mas o item é seu para sempre! (Seu lugar no ranking não muda: ele conta os pontos que você já ganhou.)"}
        </p>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", margin:"-4px 0 14px", padding:"9px 11px", background:"#171026", border:"1px solid #3b2a58", borderRadius:11 }}>
          <span style={{ color:"#d6c9ec", fontSize:12.5 }}>Você pode usar até dois acessórios de cada categoria. A aparência continua separada.</span>
          <b style={{ color:"#34d399", fontSize:12.5 }}>2 espaços por categoria</b>
        </div>
        {equipNotice && <div role="status" style={{ color:"#fbbf24", background:"#fbbf2412", border:"1px solid #fbbf2455", borderRadius:10, padding:"9px 11px", margin:"-5px 0 14px", fontSize:12.5 }}>{equipNotice}</div>}

        {/* Nyx de um lado (com os pontos embaixo dele), acessórios do outro — assim dá pra ver ele
            vestindo cada peça sem perder ele de vista. Fica "grudado" no topo enquanto rola a lista
            de itens ao lado (em telas estreitas empilha: Nyx em cima, acessórios embaixo) */}
        <div style={{ display:"flex", gap:20, alignItems:"flex-start", flexWrap: isNarrow ? "wrap" : "nowrap" }}>
          <div style={{ position: isNarrow ? "static" : "sticky", top:0, flex: isNarrow ? "1 1 100%" : "0 0 190px", zIndex:2 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, background:"#1e1533", border:`1px solid ${eggTalk ? eggTalk.color+"88" : "#3b2a58"}`, borderRadius:16, padding:16, transition:"border-color .3s", boxShadow:"0 10px 20px -6px rgba(3,5,16,.55)" }}>
              <div style={{ animation: eggTalk ? (eggTalk.kind === "pirata" ? "nyx-pirate-sway 2.2s ease-in-out infinite" : "nyx-spartan-idle 2.6s ease-in-out infinite") : "none" }}>
                <NyxRobot state="ok" size={92} showName={false} gear={gear} />
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ color:"#fbbf24", fontWeight:900, fontSize:22 }}>💰 {wallet} pts</div>
                <div style={{ color:"#776798", fontSize:11.5 }}>para gastar · toque num item comprado pra vestir ou tirar</div>
              </div>
            </div>
            {eggTalk && (
              <div className="pop" style={{ marginTop:10, background:"#1e1430", border:`1.5px solid ${eggTalk.color}66`, borderRadius:12, padding:"10px 14px", color:"#f0e9fb", fontSize:13, lineHeight:1.55, fontWeight:600, whiteSpace:"pre-wrap" }}>
                {eggTalk.msg}
              </div>
            )}
          </div>

          <div style={{ flex:"1 1 380px", minWidth: isNarrow ? "100%" : 300 }}>
            {SLOT_SECTIONS.map(({ slot, label }) => {
              const items = NYX_ITEMS.filter(item => item.slot === slot && (!item.secret || isTestShift || owned.includes(item.id)));
              if (!items.length) return null;
              return (
                <div key={slot} style={{ marginBottom:18 }}>
                  <p style={{ color:"#a99ac9", fontSize:11.5, fontWeight:800, textTransform:"uppercase", letterSpacing:0.5, margin:"0 0 8px" }}>{label}</p>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 }}>
                    {items.map(item => {
                      const has = isTestShift || owned.includes(item.id);
                      const canBuy = !has && wallet >= item.cost;
                      const clickable = has || canBuy;
                      const equipped = equippedInSlot(gear,item.slot).includes(item.id);
                      return (
                        <div key={item.id} data-item={item.id} role="button" tabIndex={clickable?0:-1} onClick={()=>clickable && click(item)}
                          style={{
                            background: equipped ? "#c084fc26" : "#171026",
                            border: `2px solid ${equipped ? "#c084fc" : has ? "#34d39966" : canBuy ? "#fbbf2466" : "#241f38"}`,
                            borderRadius:14, padding:"14px 10px", textAlign:"center", cursor: clickable?"pointer":"default",
                            opacity: clickable ? 1 : 0.55, position:"relative",
                          }}>
                          <span onClick={(e)=>{ e.stopPropagation(); setRefundConfirm(false); setPreview(item); }} title="Ver prévia no Nyx antes de comprar"
                            style={{ position:"absolute", top:6, right:6, zIndex:2, width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", background:"#0000004d", fontSize:12, cursor:"pointer", opacity:1 }}>
                            👁️
                          </span>
                          {item.slot === "skin"
                            ? <NyxRobot state="ok" size={54} showName={false} gear={{ ...gear, skin:item.id }} />
                            : <div style={{ fontSize:30, filter: clickable?"none":"grayscale(1)" }}>{item.emoji}</div>}
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {preview && (() => {
        const has = isTestShift || owned.includes(preview.id);
        const equipped = equippedInSlot(gear,preview.slot).includes(preview.id);
        const canBuy = !has && wallet >= preview.cost;
        const clickable = has || canBuy;
        const canRefund = !isTestShift && owned.includes(preview.id) && !preview.secret && preview.cost > 0 && spent >= preview.cost;
        return (
          <div onClick={()=>setPreview(null)} style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.88)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1050, padding:16 }}>
            <div className="pop" onClick={(e)=>e.stopPropagation()} style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:20, padding:"20px 22px", maxWidth:300, width:"100%", textAlign:"center", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <h3 style={{ margin:0, fontSize:14, fontWeight:900, color:"#c084fc" }}>👁️ Prévia · como fica no Nyx</h3>
                <button onClick={()=>setPreview(null)} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:20, cursor:"pointer", lineHeight:1 }}>✕</button>
              </div>
              <NyxRobot state="ok" size={110} showName={false} gear={{ ...gear, [preview.slot]: preview.id }} />
              <div style={{ color:"#f0e9fb", fontWeight:800, fontSize:14.5, marginTop:8 }}>{preview.emoji} {preview.label}</div>
              <button onClick={()=>click(preview)} disabled={!clickable}
                style={{
                  marginTop:14, width:"100%", padding:"10px 0", borderRadius:10, border:"none", fontWeight:800, fontSize:13, cursor: clickable?"pointer":"default", opacity: clickable?1:0.6,
                  background: has ? (equipped ? "#3b2a58" : "linear-gradient(135deg,#c084fc,#9333ea)") : canBuy ? "linear-gradient(135deg,#fbbf24,#d97706)" : "#241f38",
                  color: has ? "#fff" : canBuy ? "#1a1029" : "#776798",
                }}>
                {has ? (equipped ? "Tirar" : "✓ Vestir") : canBuy ? `🛒 Comprar · ${preview.cost} pts` : `🔒 Faltam ${preview.cost - wallet} pts`}
              </button>
              {canRefund && !refundConfirm && (
                <button onClick={()=>setRefundConfirm(true)} style={{ marginTop:8, width:"100%", padding:"9px 0", borderRadius:10, border:"1px solid #fbbf2466", background:"transparent", color:"#fbbf24", fontWeight:800, fontSize:12.5, cursor:"pointer" }}>↩️ Pedir reembolso</button>
              )}
              {canRefund && refundConfirm && (
                <div style={{ marginTop:9, background:"#fbbf2410", border:"1px solid #fbbf2455", borderRadius:11, padding:10 }}>
                  <p style={{ color:"#f0e9fb", fontSize:12, lineHeight:1.45, margin:"0 0 8px" }}>Devolver <b>{preview.label}</b> e receber <b style={{color:"#fbbf24"}}>{preview.cost} pontos</b>?</p>
                  <div style={{ display:"flex", gap:7 }}>
                    <button onClick={()=>setRefundConfirm(false)} style={{ flex:1, border:"1px solid #3b2a58", background:"#171026", color:"#a99ac9", borderRadius:8, padding:7, cursor:"pointer", fontWeight:700 }}>Cancelar</button>
                    <button onClick={()=>{ onRefund(preview); setRefundConfirm(false); setPreview(null); }} style={{ flex:1, border:"none", background:"linear-gradient(135deg,#fbbf24,#d97706)", color:"#1a1029", borderRadius:8, padding:7, cursor:"pointer", fontWeight:900 }}>Confirmar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
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
