import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import gsap from "gsap";
import { Toaster, toast } from "sonner";
import { saveStudent, getStudent, setNudge, getNudge, listStudents, checkReset, resetAll, getTeacherMeta, saveTeacherMeta, saveTeacherCode, getTeacherCode, setCodeSend, getCodeSend, clearCodeSend, reportAiHealth, getAiHealth, getAiHealthByProvider, diagnose, getExamState, setExamState, getExamStateForStudent, gradeExam, getDailyCuriosity, setDailyCuriosity, setDuel, getDuel, clearDuel, listDuels, getNyxLocks, setNyxLocks, patchStudent, deleteStudentProfile, setKick, checkKick, setScoreFix, getScoreFix, clearScoreFix, getAccessMode, setAccessMode, getSupport, setSupport, listAllSupport, exportAllData, triggerBackupNow, getBackupList, getTeacherLessons, saveTeacherLessons, getBoss, setBoss, clearBoss, getTourney, setTourney, clearTourney, getInspection, setInspection, getHallOfFame, saveHallOfFame, setKeyboardLaunch, getKeyboardLaunch, setPartner, getPartner, clearPartner, listPartners, getQuizThemes, saveQuizThemes, getQuizRoom, setQuizRoom, clearQuizRoom, setCheckin, getCheckin, listCheckinsForDate, setTeamDuel, getTeamDuel, clearTeamDuel, listTeamDuels, reportClientError, getRecentErrors } from "./storage.js";
import { xlsxBlob, colLetter } from "./xlsx.js";
import { hexToRgb, shade, isLight } from "./lib/colors.js";
import { FONT, PAGE_BG, LIGHT_BG, SPARTAN_BG, customBg, pageBgFor } from "./lib/theme.js";
import { setSoundsCalm, playSound, setSoundsMuted, loadSoundsMuted, CONFETTI_COLORS, fireConfetti } from "./lib/sound.js";
import { codeBackupKey, saveCodeBackupLocal, loadCodeBackupLocal } from "./lib/codeBackup.js";
import { listPtVoices, bestPtVoice, useSpeech } from "./lib/speech.js";
import { VoicePickerModal } from "./components/VoicePickerModal.jsx";
import { KEY_IMAGES, KeyVisual } from "./components/KeyVisual.jsx";
import { NYX_ITEMS, DEFAULT_NYX_GEAR, NyxRobot } from "./components/NyxRobot.jsx";
import { PerformanceChart } from "./components/PerformanceChart.jsx";
import { DEFAULT_AVATAR, Avatar, AvatarPreview, AvatarControls, AvatarBuilder } from "./components/Avatar.jsx";
import { VSEditor, CodeBlock, GUIDED_BLOCKS, GUIDED_PARTICIPATION_QUIZ } from "./components/CodeEditor.jsx";
import { Terminal } from "./components/Terminal.jsx";
import { NyxChat } from "./components/NyxChat.jsx";
import { TOUR_STEPS, TEACHER_TOUR_STEPS, TourOverlay } from "./components/TourOverlay.jsx";
import { codeForSpeech, useViewportWidth, computeStreak, shuffleQuestions, isDoneActive, gradeInfo, quickCheck } from "./lib/utils.js";
import { ACHIEVEMENTS, ALL_EGG_ACHIEVEMENT_IDS, achievementInfo, visibleAchievements, CLASS_GOALS, classGoalProgress } from "./lib/achievements.js";
import { generateRelatorioDocx, downloadRelatorioDocx } from "./lib/reportDocx.js";
import { CS_SYSTEM, RUN_SYSTEM, nyxPrefsInstruction, NYX_FUN_SYSTEM, NYX_GUIDED_SYSTEM } from "./lib/ai-prompts.js";
import { STUDY_LANGUAGES, langById, reviewChecklistFor, buildPreviewDoc, otherFilesCtx, findLineIndex } from "./lib/languages.js";
import { BRACKET_COLORS, highlight, highlightCSharp, highlightJS, highlightPHP, highlightCSS, highlightHTML } from "./lib/highlight.jsx";
import { ANALYZE_PROVIDERS, PARTNER_REWARD, isOffline, isNetworkError, askClaude, extractJson, askClaudeJson, buildSummaryRequest, buildContinuationSummaryRequest, mergeSummaryContinuation, recentDifficultyHint, adaptiveDifficultyTier } from "./lib/ai.js";
import { requestFS, goFullscreen, todayKey, weekKey, dateKeyOf, hmToMin, nowMin, classStatus } from "./lib/schedule.js";
import { SHIFTS, TEST_SHIFT, TEST_SHIFT_PASSWORD, LANG_SHIFT, LANG_SHIFT_PASSWORD, shiftMeta, shiftLabel, isSameDayTs, contentNameFor, withContentName } from "./lib/shifts.js";










// ════════════════════════════════════════════════════════════════════════════
//  TOUR DE ERRO DO NYX  (quando "Analisar meu código" encontra erro, aponta pro editor e explica
//  passo a passo cada erro encontrado, igual ao tour de onboarding — mas com destaque vermelho)
// ════════════════════════════════════════════════════════════════════════════
// realça o editor com uma borda vermelha enquanto há erro sinalizado — sem escurecer a tela nem tampar
// o código (a explicação de verdade fica num card na coluna lateral, ao lado do editor, sempre)
function ErrorHighlightRing({ active }) {
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
function ErrorWalkthroughCard({ errors, step, onNext, onPrev, onVerify, onClose, verifying }) {
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
function FloatingErrorBubble({ errors, step, activeCode, onNext, onPrev, onVerify, onClose, verifying }) {
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
//  LOJA DO NYX  (troca pontos de acerto por acessórios cosméticos)
// ════════════════════════════════════════════════════════════════════════════
function NyxShop({ wallet, owned, gear, onEquip, onBuy, isTestShift, onClose }) {
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
function RetroOverlay({ name, stats, gear, onClose }) {
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

// ════════════════════════════════════════════════════════════════════════════
//  FEEDBACK ANIMADO DO NYX  (aparece quando o aluno termina a atividade)
// ════════════════════════════════════════════════════════════════════════════
function NyxFeedbackModal({ score, loading, feedback, onClose }) {
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
function ErrorExplainModal({ sections, encouragement, onClose }) {
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

// ════════════════════════════════════════════════════════════════════════════
//  CONQUISTAS, RANKING, META DA TURMA, CURIOSIDADE  (gamificação leve)
// ════════════════════════════════════════════════════════════════════════════
function AchievementToast({ achievement }) {
  const boxRef = useRef(null);
  useEffect(() => {
    if (!achievement || !boxRef.current) return;
    gsap.fromTo(boxRef.current,
      { scale:0.3, opacity:0, rotate:-8 },
      { scale:1, opacity:1, rotate:0, duration:0.6, ease:"elastic.out(1,0.55)" }
    );
  }, [achievement]);
  if (!achievement) return null;
  return (
    <div ref={boxRef} style={{ position:"fixed", top:16, right:16, zIndex:1300, background:"linear-gradient(135deg,#fbbf24,#f59e0b)", color:"#1c1206", borderRadius:16, padding:"14px 18px", boxShadow:"0 14px 40px rgba(0,0,0,.45)", display:"flex", alignItems:"center", gap:12, maxWidth:320 }}>
      <div style={{ fontSize:34 }}>{achievement.emoji}</div>
      <div>
        <div style={{ fontWeight:900, fontSize:13 }}>🎖️ Conquista desbloqueada!</div>
        <div style={{ fontWeight:800, fontSize:14 }}>{achievement.label}</div>
        <div style={{ fontSize:11.5, opacity:0.85 }}>{achievement.desc}</div>
      </div>
    </div>
  );
}

function AchievementsModal({ unlocked, onClose, isLangRoom }) {
  const list = visibleAchievements(isLangRoom);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:520, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#fbbf24,#f59e0b)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🎖️ Conquistas</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>{unlocked.filter(id=>list.some(a=>a.id===id)).length} de {list.length} desbloqueadas</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
          {list.map(a => {
            const got = unlocked.includes(a.id);
            return (
              <div key={a.id} style={{ background:got?"#fbbf2418":"#171026", border:`1px solid ${got?"#fbbf24":"#241f38"}`, borderRadius:14, padding:"12px 14px", display:"flex", gap:10, alignItems:"center", opacity:got?1:0.55 }}>
                <div style={{ fontSize:26, filter:got?"none":"grayscale(1)" }}>{a.secret && !got ? "❓" : a.emoji}</div>
                <div>
                  <div style={{ color:"#f0e9fb", fontWeight:800, fontSize:13 }}>{a.secret && !got ? "???" : a.label}</div>
                  <div style={{ color:"#776798", fontSize:11.5 }}>{a.secret && !got ? "Um segredo espera por quem explora o terminal..." : a.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RankingModal({ shift, myName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [top, setTop] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const all = await listStudents();
      const mine = all.filter(s => (s.shift || "sem-turno") === (shift || "sem-turno"));
      const sorted = mine.sort((a,b)=>(b.nyxPoints||0)-(a.nyxPoints||0)).slice(0, 5);
      if (alive) { setTop(sorted); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [shift]);
  const medals = ["🥇","🥈","🥉","🏅","🏅"];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:440, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#22d3ee,#c084fc)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📊 Ranking da Turma</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Os 5 com mais pontos do Nyx na sua turma</p>
        {loading ? <p style={{ color:"#776798", fontSize:13 }}>Carregando...</p> : top.length === 0 ? (
          <p style={{ color:"#776798", fontSize:13 }}>Ninguém tem pontos ainda — seja o primeiro!</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {top.map((s, i) => (
              <div key={s.name} style={{ display:"flex", alignItems:"center", gap:10, background: s.name===myName ? "#c084fc22" : "#171026", border:`1px solid ${s.name===myName?"#c084fc":"#3b2a58"}`, borderRadius:12, padding:"8px 12px" }}>
                <span style={{ fontSize:20, width:28, textAlign:"center" }}>{medals[i]}</span>
                <Avatar cfg={s.avatar} size={32} />
                <span style={{ flex:1, fontWeight:700, fontSize:13.5, color: s.name===myName ? "#c7d2fe" : "#f0e9fb" }}>{s.name}{s.name===myName?" (você)":""}</span>
                <span style={{ color:"#fbbf24", fontWeight:900, fontSize:14 }}>{s.nyxPoints||0} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClassGoalBar({ sum }) {
  const g = classGoalProgress(sum);
  return (
    <div style={{ marginTop:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#a99ac9", marginBottom:4 }}>
        <span>🎯 Meta da turma · nível {g.level}</span>
        <span>{sum}{g.next ? `/${g.next}` : ""} pts</span>
      </div>
      <div className="bar-glow" style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:20, height:10, overflow:"hidden" }}>
        <div style={{ width:`${g.pct}%`, height:"100%", background:"linear-gradient(90deg,#c084fc,#22d3ee)", transition:"width .5s ease" }} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TELÃO DA TURMA — tela cheia só de visualização, pra projetar durante a aula
// ════════════════════════════════════════════════════════════════════════════
// 🏟️ torneio: perguntas reservas usadas quando o Nyx (IA) está offline — básicas de propósito
const TOURNEY_FALLBACK_QUESTIONS = [
  { pergunta:"O que o Console.WriteLine faz?", alternativas:["Escreve algo na tela","Apaga a tela","Cria uma variável","Fecha o programa"], correta:0 },
  { pergunta:"Qual tipo guarda números inteiros?", alternativas:["int","string","bool","char"], correta:0 },
  { pergunta:"Qual tipo guarda textos?", alternativas:["string","int","double","bool"], correta:0 },
  { pergunta:"Como termina uma instrução em C#?", alternativas:["Com ;","Com .","Com !","Com ,"], correta:0 },
  { pergunta:"O que guarda apenas verdadeiro ou falso?", alternativas:["bool","int","string","double"], correta:0 },
  { pergunta:"O que o Console.ReadLine faz?", alternativas:["Lê o que a pessoa digitou","Escreve na tela","Soma dois números","Toca um som"], correta:0 },
  { pergunta:"Qual símbolo compara se dois valores são iguais?", alternativas:["==","=","!=",">="], correta:0 },
  { pergunta:"Qual tipo aceita números com vírgula?", alternativas:["double","int","bool","char"], correta:0 },
  { pergunta:"O que o if faz no código?", alternativas:["Testa uma condição e escolhe um caminho","Repete um bloco várias vezes","Cria uma nova variável","Encerra o programa"], correta:0 },
  { pergunta:"O que o else faz?", alternativas:["Executa quando o if é falso","Executa sempre, junto com o if","Cria um método novo","Compara dois textos"], correta:0 },
  { pergunta:"Para que serve o laço for?", alternativas:["Repetir um bloco um número certo de vezes","Guardar um texto","Comparar dois números","Ler o teclado"], correta:0 },
  { pergunta:"Para que serve o laço while?", alternativas:["Repetir ENQUANTO uma condição for verdadeira","Escrever na tela uma única vez","Somar dois números","Criar uma classe"], correta:0 },
  { pergunta:"O que é um método em C#?", alternativas:["Um pedaço de código com nome, que pode ser chamado","Um tipo de variável","Um símbolo de comparação","Um jeito de comentar o código"], correta:0 },
  { pergunta:"Para que serve uma List<>?", alternativas:["Guardar vários valores juntos","Guardar só um número","Comparar dois textos","Repetir um bloco de código"], correta:0 },
  { pergunta:"O que $\"Oi {nome}\" faz (interpolação de string)?", alternativas:["Coloca o valor da variável dentro do texto","Cria uma lista","Repete o texto duas vezes","Apaga a variável"], correta:0 },
  { pergunta:"O que int.Parse(texto) faz?", alternativas:["Converte um texto digitado em número inteiro","Escreve um número na tela","Cria uma lista de números","Compara dois números"], correta:0 },
  { pergunta:"Qual símbolo representa 'diferente de' em C#?", alternativas:["!=","==","<>","=!"], correta:0 },
  { pergunta:"O que faz x++ (incremento)?", alternativas:["Soma 1 ao valor de x","Subtrai 1 do valor de x","Zera o valor de x","Dobra o valor de x"], correta:0 },
  { pergunta:"O que uma classe representa em C#?", alternativas:["Um molde que descreve algo do programa","Um número decimal","Um comentário no código","Um símbolo de comparação"], correta:0 },
  { pergunta:"Para que serve o foreach?", alternativas:["Passar por cada item de uma lista, um de cada vez","Criar uma variável nova","Ler o teclado","Comparar dois booleanos"], correta:0 },
  { pergunta:"O que os { } (chaves) delimitam em C#?", alternativas:["O início e o fim de um bloco de código","Um comentário","Um número decimal","Uma lista de textos"], correta:0 },
  { pergunta:"O que o operador && (e) faz numa condição?", alternativas:["Só é verdadeiro se as duas partes forem verdadeiras","É verdadeiro se qualquer uma das partes for verdadeira","Inverte o valor da condição","Soma os dois valores"], correta:0 },
];
const BOSS_PRESETS = [
  { name: "Bugzilla", emoji: "👾" },
  { name: "Null Pointer", emoji: "🐉" },
  { name: "Lag Monstro", emoji: "🦑" },
  { name: "Stack Overlord", emoji: "🤖" },
];

// popup rápido de "situação da turma" — pensado pra abrir de dentro da aba "Meu código" (onde o
// professor costuma dar zoom na tela pra turma copiar) sem precisar trocar de aba e perder o zoom
function QuickStatusModal({ students, onClose }) {
  const withStatus = students.map(s => ({ s, d: difficultyOf(s) }));
  const dif = withStatus.filter(x => x.d.level === "dif");
  const bem = withStatus.filter(x => x.d.level === "bem");
  const neutro = withStatus.filter(x => x.d.level === "neutro");
  const Group = ({ title, color, items }) => items.length > 0 && (
    <div style={{ marginBottom:14 }}>
      <div style={{ color, fontWeight:800, fontSize:12.5, marginBottom:6, letterSpacing:.5 }}>{title} · {items.length}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {items.map(({ s, d }) => (
          <div key={s.name} style={{ background:"#171026", border:`1px solid ${color}44`, borderRadius:10, padding:"7px 10px", display:"flex", alignItems:"center", gap:8 }}>
            <Avatar cfg={s.avatar} size={24} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#f0e9fb" }}>{s.name}</div>
              <div style={{ fontSize:11.5, color:"#a99ac9", lineHeight:1.4 }}>{d.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1400, padding:16 }} onClick={onClose}>
      <div className="pop" onClick={e=>e.stopPropagation()} style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:20, padding:"20px 22px", maxWidth:420, width:"100%", maxHeight:"82vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:900, color:"#fbbf24" }}>👀 Situação da turma</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        {students.length === 0 ? <p style={{ color:"#776798", fontSize:13 }}>Nenhum aluno nesta turma ainda.</p> : (
          <>
            <Group title="⚠ Precisando de ajuda" color="#f87171" items={dif} />
            <Group title="✍️ Escrevendo" color="#fbbf24" items={neutro} />
            <Group title="✅ Indo bem" color="#34d399" items={bem} />
          </>
        )}
      </div>
    </div>
  );
}

function TelaoModal({ students, shift, onClose, teacherAuth }) {
  const [telaoShift, setTelaoShift] = useState(shift && shift !== "all" ? shift : "matutino");
  // 👾 chefão da turma: HP = dano que a turma precisa causar; cada ponto ganho desde a invocação = 1 de dano
  const [boss, setBossState] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = async () => { const b = await getBoss(); if (alive) setBossState(b && b.status === "active" ? b : null); };
    load();
    const iv = setInterval(load, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  // ⏳ 10min de estudo antes da batalha começar de verdade — dá tempo da turma revisar o que
  // aprendeu antes do chefão aparecer pra valer
  const STUDY_MS = 10 * 60 * 1000;
  const summonBoss = async (maxHp) => {
    const preset = BOSS_PRESETS[Math.floor(Math.random() * BOSS_PRESETS.length)];
    const baseline = {};
    (students || []).filter(s => (s.shift||"") !== TEST_SHIFT.id).forEach(s => { baseline[`${s.shift||"sem-turno"}:${s.name}`] = s.nyxPoints || 0; });
    const b = { status: "active", ...preset, maxHp, baseline, startedAt: Date.now(), studyUntil: Date.now() + STUDY_MS };
    await setBoss(b, teacherAuth);
    setBossState(b);
  };
  const skipStudy = async () => {
    if (!boss) return;
    const b = { ...boss, studyUntil: 0 };
    await setBoss(b, teacherAuth);
    setBossState(b);
  };
  // 🎁 bônus de participação: todo mundo que causou dano de verdade ganha uns pontos extras
  // quando o chefão é derrotado — recompensa a turma inteira, não só quem terminou por cima
  const BOSS_DEFEAT_BONUS = 3;
  const endBoss = async () => {
    if (bossDefeated && boss) {
      const contributors = (students || []).filter(s => (s.shift||"") !== TEST_SHIFT.id)
        .filter(s => ((s.nyxPoints || 0) - (boss.baseline?.[`${s.shift||"sem-turno"}:${s.name}`] ?? 0)) > 0);
      await Promise.all(contributors.map(s => setScoreFix(s.shift, s.name, { kind: "boss-bonus", amount: BOSS_DEFEAT_BONUS }, teacherAuth)));
    }
    await clearBoss(teacherAuth);
    setBossState(null);
  };

  // 🏟️ torneio da turma: chaveamento eliminatório iniciado AQUI pelo professor — cada dupla
  // responde o mesmo mini-quiz na própria tela, e o telão apura os placares e avança as rodadas
  const [tourney, setTourneyState] = useState(null);
  const [tourneyBusy, setTourneyBusy] = useState(false);
  const [tourneyMsg, setTourneyMsg] = useState("");
  useEffect(() => {
    let alive = true;
    const load = async () => { const t = await getTourney(); if (alive) setTourneyState(t); };
    load();
    const iv = setInterval(load, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  // usedQuestions guarda o texto de TODAS as perguntas já usadas nesse torneio (acumulado rodada a
  // rodada) — tanto o pedido à IA quanto o banco de reserva evitam repetir qualquer uma delas
  const genTourneyQuestions = async (usedQuestions = []) => {
    const usedList = usedQuestions.length ? `\n\nEstas perguntas JÁ foram usadas neste mesmo torneio — NÃO repita nenhuma delas, nem uma versão reformulada da mesma pergunta:\n${usedQuestions.map(q=>`- ${q}`).join("\n")}` : "";
    try {
      const data = await askClaudeJson(
        `Crie EXATAMENTE 5 perguntas de múltipla escolha bem rápidas e VARIADAS sobre C# básico para um torneio entre alunos iniciantes, cobrindo temas diferentes entre si (ex: Console.WriteLine/ReadLine, variáveis e tipos, operadores e comparações, if/else, for, while, métodos, listas, interpolação de string). Cada uma com 4 alternativas curtas.${usedList}\nResponda APENAS JSON puro: { "perguntas": [ { "pergunta": "...", "alternativas": ["a","b","c","d"], "correta": 0 } ] }`,
        "Você cria quizzes de C# para iniciantes, sempre variando o tema e nunca repetindo (nem reformulando) uma pergunta já usada antes. Português simples. Responda APENAS JSON puro válido.",
        { temperature: 1 }
      );
      const qs = Array.isArray(data?.perguntas) ? data.perguntas.filter(q => q && q.pergunta && Array.isArray(q.alternativas) && q.alternativas.length >= 2 && q.alternativas[q.correta] != null && !usedQuestions.includes(q.pergunta)).slice(0, 5) : [];
      if (qs.length >= 3) return qs;
    } catch {}
    // banco de reserva: prioriza perguntas ainda não usadas neste torneio; só repete se esgotar o banco
    const unused = TOURNEY_FALLBACK_QUESTIONS.filter(q => !usedQuestions.includes(q.pergunta));
    const pool = unused.length >= 5 ? unused : [...unused, ...TOURNEY_FALLBACK_QUESTIONS.filter(q => usedQuestions.includes(q.pergunta))];
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
  };
  const startTourney = async () => {
    setTourneyBusy(true); setTourneyMsg("");
    const elegiveis = mine.filter(s => Date.now() - (s.lastSeen || 0) < 2 * 60 * 1000).map(s => s.name);
    if (elegiveis.length < 2) {
      setTourneyMsg("⚠ Precisa de pelo menos 2 alunos online nesse turno.");
      setTourneyBusy(false);
      return;
    }
    const ordem = [...elegiveis].sort(() => Math.random() - 0.5);
    const matches = [];
    for (let i = 0; i < ordem.length; i += 2) matches.push({ round: 1, a: ordem[i], b: ordem[i + 1] ?? null });
    const questions = await genTourneyQuestions();
    const t = { status: "active", shift: telaoShift, id: Date.now(), round: 1, questions: { 1: questions }, matches, usedQuestions: questions.map(q=>q.pergunta) };
    await setTourney(t, teacherAuth);
    setTourneyState(t);
    setTourneyBusy(false);
  };
  const tourneyAnswerOf = (name) => {
    if (!tourney) return null;
    const s = (students || []).find(x => x.name === name && (x.shift || "") === tourney.shift);
    const a = s && s.tourneyAnswer;
    return (a && a.id === tourney.id && a.round === tourney.round) ? a : null;
  };
  const currentMatches = tourney ? (tourney.matches || []).filter(m => m.round === tourney.round) : [];
  const matchWinner = (m) => {
    if (m.winner) return m.winner;
    if (!m.b) return m.a; // sem par: passa direto
    const aa = tourneyAnswerOf(m.a), bb = tourneyAnswerOf(m.b);
    if (!aa || !bb) return null;
    if (aa.score !== bb.score) return aa.score > bb.score ? m.a : m.b;
    return (aa.at || 0) <= (bb.at || 0) ? m.a : m.b; // empate: quem terminou primeiro
  };
  const allResolved = currentMatches.length > 0 && currentMatches.every(m => matchWinner(m));
  const advanceTourney = async () => {
    if (!tourney || !allResolved) return;
    setTourneyBusy(true);
    const winners = currentMatches.map(m => matchWinner(m));
    const resolvedMatches = (tourney.matches || []).map(m => m.round === tourney.round ? { ...m, winner: matchWinner(m) } : m);
    let t2;
    if (winners.length === 1) {
      t2 = { ...tourney, matches: resolvedMatches, status: "done", champion: winners[0] };
    } else {
      const nextRound = tourney.round + 1;
      const newMatches = [];
      for (let i = 0; i < winners.length; i += 2) newMatches.push({ round: nextRound, a: winners[i], b: winners[i + 1] ?? null });
      const qs = await genTourneyQuestions(tourney.usedQuestions || []);
      t2 = { ...tourney, matches: [...resolvedMatches, ...newMatches], round: nextRound, questions: { ...tourney.questions, [nextRound]: qs }, usedQuestions: [...(tourney.usedQuestions || []), ...qs.map(q=>q.pergunta)] };
    }
    await setTourney(t2, teacherAuth);
    setTourneyState(t2);
    setTourneyBusy(false);
  };
  const endTourney = async () => { await clearTourney(teacherAuth); setTourneyState(null); };

  const [telaoNow, setTelaoNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setTelaoNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  const bossStudying = boss && boss.studyUntil && telaoNow < boss.studyUntil;
  const bossDamage = boss ? (students || []).filter(s => (s.shift||"") !== TEST_SHIFT.id)
    .reduce((sum, s) => sum + Math.max(0, (s.nyxPoints || 0) - (boss.baseline?.[`${s.shift||"sem-turno"}:${s.name}`] ?? 0)), 0) : 0;
  const bossHp = boss ? Math.max(0, boss.maxHp - bossDamage) : 0;
  const bossDefeated = boss && bossHp === 0;
  // 🗣️ o chefão provoca a turma de um jeito diferente conforme a vida vai caindo — deixa a
  // barra de HP menos abstrata, dá a sensação de que ele está reagindo de verdade
  const bossTaunt = (() => {
    if (!boss || bossDefeated) return null;
    const pct = boss.maxHp ? (bossHp / boss.maxHp) * 100 : 100;
    if (pct > 75) return "Vocês vão precisar de muito mais que isso!";
    if (pct > 50) return "Ainda de pé! Continuem acertando!";
    if (pct > 25) return "Argh... estou ficando fraco... não parem agora!";
    return "Não pode ser... quase lá, mais um empurrão!!";
  })();
  // 🗡️ quem mais causou dano até agora — mostrado ao vivo pra dar mais emoção à batalha
  const topContributors = boss ? (students || []).filter(s => (s.shift||"") !== TEST_SHIFT.id)
    .map(s => ({ name: s.name, dmg: Math.max(0, (s.nyxPoints||0) - (boss.baseline?.[`${s.shift||"sem-turno"}:${s.name}`] ?? 0)) }))
    .filter(x => x.dmg > 0)
    .sort((a,b) => b.dmg - a.dmg)
    .slice(0, 5) : [];
  useEffect(() => { goFullscreen(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const mine = (students || []).filter(s => (s.shift || "sem-turno") === telaoShift && (s.shift || "") !== TEST_SHIFT.id);
  const ranking = [...mine].sort((a,b)=>(b.nyxPoints||0)-(a.nyxPoints||0)).slice(0, 8);
  const sum = mine.reduce((n,s)=>n+(s.nyxPoints||0), 0);
  const g = classGoalProgress(sum);
  const combo8 = mine.filter(s => (s.achievements||[]).includes("combo-8"));
  const combo5 = mine.filter(s => (s.achievements||[]).includes("combo-5") && !combo8.includes(s));
  const medals = ["🥇","🥈","🥉","🏅","🏅","🏅","🏅","🏅"];
  return (
    <div data-testid="telao-modal" className="telao-wrap" style={{ position:"fixed", inset:0, background:"#0b0614", zIndex:2000, display:"flex", flexDirection:"column", padding:"36px 48px", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:14 }}>
        <span className="shine" style={{ fontSize:"clamp(22px, 5vw, 32px)", fontWeight:900, background:"linear-gradient(120deg,#fbbf24,#fb923c,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🖥️ Telão da Turma</span>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          {SHIFTS.map(sh => (
            <button key={sh.id} onClick={()=>setTelaoShift(sh.id)} style={{ background: telaoShift===sh.id ? "#fbbf24" : "#231636", color: telaoShift===sh.id ? "#1c1400" : "#a99ac9", border:`2px solid ${telaoShift===sh.id?"#fbbf24":"#3b2a58"}`, borderRadius:12, padding:"10px 20px", fontSize:16, fontWeight:800, cursor:"pointer" }}>{sh.emoji} {sh.label}</button>
          ))}
          <button onClick={onClose} style={{ background:"#3b2a58", color:"#fff", border:"none", borderRadius:12, padding:"10px 18px", fontSize:16, cursor:"pointer", fontWeight:800 }}>✕ Sair (Esc)</button>
        </div>
      </div>
      {/* 👾 chefão da turma */}
      {boss && bossStudying ? (
        <div className="telao-card" style={{ position:"relative", background:"linear-gradient(135deg,#3b0764,#1e1b4b)", border:"2px solid #a855f7", borderRadius:24, padding:"22px 28px", marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:18, flexWrap:"wrap" }}>
            <span style={{ fontSize:"clamp(40px, 8vw, 64px)" }}>🧠</span>
            <div style={{ flex:"1 1 240px", minWidth:0 }}>
              <h2 style={{ margin:0, fontSize:"clamp(18px, 4.5vw, 26px)", color:"#e9d5ff" }}>A turma está estudando...</h2>
              <p style={{ margin:"4px 0 10px", color:"#c4b5fd", fontSize:"clamp(12px, 3vw, 14px)" }}>
                {boss.name} aparece em <b style={{ color:"#fff" }}>{Math.ceil((boss.studyUntil - telaoNow) / 60000)} min</b> — cada aluno está revisando o próprio código na tela dele.
              </p>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={skipStudy} style={{ background:"#3b0764", color:"#e9d5ff", border:"1px solid #a855f7", borderRadius:12, padding:"10px 16px", fontSize:14, cursor:"pointer", fontWeight:800 }}>⏭ Pular estudo</button>
              <button onClick={endBoss} style={{ background:"#3b2a58", color:"#fff", border:"none", borderRadius:12, padding:"10px 16px", fontSize:14, cursor:"pointer", fontWeight:800 }}>✕ Dispensar chefão</button>
            </div>
          </div>
        </div>
      ) : boss ? (
        <div className="telao-card" style={{ position:"relative", background: bossDefeated ? "linear-gradient(135deg,#14532d,#166534)" : "linear-gradient(135deg,#3b0764,#1e1b4b)", border:`2px solid ${bossDefeated ? "#34d399" : "#a855f7"}`, borderRadius:24, padding:"22px 28px", marginBottom:24 }}>
          {bossDefeated && <ConfettiParty level={1} />}
          <div style={{ display:"flex", alignItems:"center", gap:18, flexWrap:"wrap" }}>
            <span style={{ fontSize:"clamp(40px, 8vw, 64px)", animation: bossDefeated ? "none" : "nyx-shake 2.2s ease-in-out infinite" }}>{bossDefeated ? "💀" : boss.emoji}</span>
            <div style={{ flex:"1 1 240px", minWidth:0 }}>
              <h2 style={{ margin:0, fontSize:"clamp(18px, 4.5vw, 26px)", color: bossDefeated ? "#bbf7d0" : "#e9d5ff" }}>
                {bossDefeated ? `${boss.name} FOI DERROTADO! 🎉` : `${boss.name} invadiu a aula!`}
              </h2>
              <p style={{ margin:"4px 0 10px", color: bossDefeated ? "#86efac" : "#c4b5fd", fontSize:"clamp(12px, 3vw, 14px)" }}>
                {bossDefeated ? `A turma venceu junta — todo mundo que causou dano ganha +${BOSS_DEFEAT_BONUS} pts de bônus! 🎁` : "Cada resposta certa da turma tira vida dele. Ao ataque!"}
              </p>
              {bossTaunt && (
                <p key={bossTaunt} className="rise" style={{ margin:"0 0 10px", color:"#fca5a5", fontSize:"clamp(12px, 3vw, 13.5px)", fontWeight:800, fontStyle:"italic" }}>
                  💬 "{bossTaunt}"
                </p>
              )}
              <div className="bar-glow" style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:20, height:24, overflow:"hidden" }}>
                <div style={{ width:`${boss.maxHp ? (bossHp / boss.maxHp) * 100 : 0}%`, height:"100%", background: bossDefeated ? "#14532d" : "linear-gradient(90deg,#ef4444,#a855f7)", transition:"width .8s ease" }} />
              </div>
              <p style={{ margin:"6px 0 0", color:"#f0e9fb", fontWeight:900, fontSize:"clamp(13px, 3.5vw, 16px)" }}>❤️ {bossHp}/{boss.maxHp} · dano da turma: {Math.min(bossDamage, boss.maxHp)}</p>
              {topContributors.length > 0 && (
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10 }}>
                  {topContributors.map((c, i) => (
                    <span key={c.name} style={{ background:"#ffffff14", border:"1px solid #ffffff28", borderRadius:20, padding:"4px 12px", fontSize:"clamp(11px, 2.4vw, 12.5px)", color:"#f0e9fb", fontWeight:700 }}>
                      {["🥇","🥈","🥉"][i] || "⚔️"} {c.name} · {c.dmg}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={endBoss} style={{ background:"#3b2a58", color:"#fff", border:"none", borderRadius:12, padding:"10px 16px", fontSize:14, cursor:"pointer", fontWeight:800 }}>{bossDefeated ? "🏁 Encerrar festa" : "✕ Dispensar chefão"}</button>
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          <span style={{ color:"#a99ac9", fontSize:14, fontWeight:800 }}>👾 Invocar chefão (a turma derrota ganhando pontos):</span>
          {[["Fácil", 30], ["Médio", 60], ["Épico", 120]].map(([label, hp]) => (
            <button key={hp} onClick={()=>summonBoss(hp)} style={{ background:"#3b0764", color:"#e9d5ff", border:"1px solid #a855f7", borderRadius:12, padding:"8px 16px", fontSize:13, fontWeight:800, cursor:"pointer" }}>{label} · {hp} HP</button>
          ))}
        </div>
      )}

      {/* 🏟️ torneio da turma: chaveamento eliminatório de mini-quizzes */}
      {tourney && tourney.status === "done" ? (
        <div className="telao-card" style={{ position:"relative", background:"linear-gradient(135deg,#713f12,#b45309)", border:"2px solid #fbbf24", borderRadius:24, padding:"24px 28px", marginBottom:24, textAlign:"center" }}>
          <ConfettiParty level={1} />
          <div style={{ fontSize:"clamp(44px, 9vw, 72px)" }}>🏆</div>
          <h2 style={{ margin:"4px 0", fontSize:"clamp(22px, 5vw, 34px)", color:"#fff" }}>{tourney.champion} é o CAMPEÃO do torneio!</h2>
          <p style={{ color:"#fde68a", fontSize:"clamp(13px, 3vw, 16px)", margin:"0 0 14px" }}>Palmas pra ele — e pra todo mundo que batalhou! 👏</p>
          <button onClick={endTourney} style={{ background:"#3b2a58", color:"#fff", border:"none", borderRadius:12, padding:"10px 18px", fontSize:14, cursor:"pointer", fontWeight:800 }}>🏁 Encerrar torneio</button>
        </div>
      ) : tourney && tourney.status === "active" ? (
        <div className="telao-card" style={{ background:"linear-gradient(135deg,#1d1436,#1a1029)", border:"2px solid #22d3ee", borderRadius:24, padding:"22px 28px", marginBottom:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:14 }}>
            <h2 style={{ margin:0, fontSize:"clamp(18px, 4.5vw, 26px)", color:"#a5f3fc" }}>🏟️ TORNEIO DA TURMA — Rodada {tourney.round}</h2>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={advanceTourney} disabled={!allResolved || tourneyBusy} style={{ background: allResolved ? "#22d3ee" : "#2a1a42", color: allResolved ? "#062a30" : "#776798", border:"none", borderRadius:12, padding:"10px 16px", fontSize:14, cursor: allResolved ? "pointer" : "default", fontWeight:800, opacity: tourneyBusy ? 0.6 : 1 }}>
                {tourneyBusy ? "..." : currentMatches.filter(m=>matchWinner(m)).length === 1 && currentMatches.length === 1 ? "👑 Coroar campeão" : "➡️ Avançar rodada"}
              </button>
              <button onClick={endTourney} style={{ background:"#3b2a58", color:"#fff", border:"none", borderRadius:12, padding:"10px 16px", fontSize:14, cursor:"pointer", fontWeight:800 }}>✕ Cancelar</button>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
            {currentMatches.map((m, i) => {
              const aa = tourneyAnswerOf(m.a), bb = m.b ? tourneyAnswerOf(m.b) : null;
              const w = matchWinner(m);
              return (
                <div key={i} style={{ background:"#171026", border:`2px solid ${w ? "#34d399" : "#3b2a58"}`, borderRadius:16, padding:"12px 16px" }}>
                  {!m.b ? (
                    <p style={{ margin:0, color:"#f0e9fb", fontSize:"clamp(13px, 3vw, 16px)", fontWeight:800 }}>🎟️ {m.a} <span style={{ color:"#776798", fontWeight:600 }}>passa direto dessa rodada</span></p>
                  ) : (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, fontSize:"clamp(13px, 3vw, 16px)" }}>
                      <span style={{ fontWeight: w===m.a ? 900 : 600, color: w===m.a ? "#34d399" : "#f0e9fb", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{w===m.a ? "👑 " : ""}{m.a}</span>
                      <span style={{ color:"#fbbf24", fontWeight:900, whiteSpace:"nowrap" }}>{aa ? aa.score : "…"} × {bb ? bb.score : "…"}</span>
                      <span style={{ fontWeight: w===m.b ? 900 : 600, color: w===m.b ? "#34d399" : "#f0e9fb", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"right" }}>{w===m.b ? "👑 " : ""}{m.b}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ margin:"12px 0 0", color:"#776798", fontSize:"clamp(11px, 2.5vw, 13px)" }}>Cada dupla responde o mesmo mini-quiz na própria tela. Quando todos os placares saírem, avance a rodada. Empate: vence quem terminou primeiro.</p>
        </div>
      ) : (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          <span style={{ color:"#a99ac9", fontSize:14, fontWeight:800 }}>🏟️ Torneio da turma (chaveamento de mini-quizzes entre os alunos online):</span>
          <button onClick={startTourney} disabled={tourneyBusy} style={{ background:"#0e7490", color:"#cffafe", border:"1px solid #22d3ee", borderRadius:12, padding:"8px 16px", fontSize:13, fontWeight:800, cursor:"pointer", opacity: tourneyBusy ? 0.6 : 1 }}>{tourneyBusy ? "Montando..." : `Iniciar torneio (${SHIFTS.find(sh=>sh.id===telaoShift)?.label || telaoShift})`}</button>
          {tourneyMsg && <span style={{ color:"#fbbf24", fontSize:13, fontWeight:700 }}>{tourneyMsg}</span>}
        </div>
      )}

      <div className="telao-grid" style={{ display:"grid", gridTemplateColumns: "1.3fr 1fr", gap:28, flex:1 }}>
        <div className="telao-card" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", borderRadius:24, border:"1px solid #3e2d5e", padding:32 }}>
          <h2 style={{ margin:"0 0 20px", fontSize:"clamp(20px, 4.5vw, 26px)", color:"#22d3ee" }}>📊 Ranking ao vivo</h2>
          {ranking.length===0 ? <p style={{ color:"#776798", fontSize:18 }}>Ninguém pontuou ainda nessa turma.</p> : (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {ranking.map((s,i)=>(
                <div key={s.name} style={{ display:"flex", alignItems:"center", gap:16, background:"#171026", border:"1px solid #3b2a58", borderRadius:16, padding:"14px 20px" }}>
                  <span style={{ fontSize:30, width:44, textAlign:"center" }}>{medals[i]}</span>
                  <Avatar cfg={s.avatar} size={48} />
                  <span style={{ flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:800, fontSize:"clamp(15px, 3.5vw, 22px)", color:"#f0e9fb" }}>{s.name}</span>
                  <span style={{ color:"#fbbf24", fontWeight:900, fontSize:"clamp(16px, 4vw, 24px)", whiteSpace:"nowrap" }}>{s.nyxPoints||0} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
          <div className="telao-card" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", borderRadius:24, border:"1px solid #3e2d5e", padding:32 }}>
            <h2 style={{ margin:"0 0 16px", fontSize:"clamp(19px, 4.5vw, 24px)", color:"#c084fc" }}>🎯 Meta da turma</h2>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, color:"#d6c9ec", marginBottom:8 }}>
              <span>Nível {g.level}</span>
              <span>{sum}{g.next?`/${g.next}`:""} pts</span>
            </div>
            <div className="bar-glow" style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:20, height:22, overflow:"hidden" }}>
              <div style={{ width:`${g.pct}%`, height:"100%", background:"linear-gradient(90deg,#c084fc,#22d3ee)", transition:"width .6s ease" }} />
            </div>
          </div>
          <div className="telao-card" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", borderRadius:24, border:"1px solid #3e2d5e", padding:32, flex:1 }}>
            <h2 style={{ margin:"0 0 16px", fontSize:"clamp(19px, 4.5vw, 24px)", color:"#fbbf24" }}>⚡ Combos da turma</h2>
            {combo5.length===0 && combo8.length===0 ? <p style={{ color:"#776798", fontSize:16 }}>Ninguém acertou uma sequência de questões ainda.</p> : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {combo8.map(s => (
                  <div key={"c8-"+s.name} style={{ display:"flex", alignItems:"center", gap:10, fontSize:"clamp(14px, 3.5vw, 18px)", flexWrap:"wrap" }}>
                    <span style={{ fontSize:22 }}>🚀</span><b style={{ color:"#f0e9fb" }}>{s.name}</b><span style={{ color:"#a99ac9" }}>— Combo Insano (8 seguidas)</span>
                  </div>
                ))}
                {combo5.map(s => (
                  <div key={"c5-"+s.name} style={{ display:"flex", alignItems:"center", gap:10, fontSize:"clamp(14px, 3.5vw, 18px)", flexWrap:"wrap" }}>
                    <span style={{ fontSize:22 }}>⚡</span><b style={{ color:"#f0e9fb" }}>{s.name}</b><span style={{ color:"#a99ac9" }}>— Combo Elétrico (5 seguidas)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CADERNO DE RESUMOS + FESTA DA META DA TURMA
// ════════════════════════════════════════════════════════════════════════════
// renderização bonita de um resumo salvo (mesmo estilo da tela de resumo da aula)
function SummaryPretty({ sum }) {
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

// ── 👾 chefão: tela de estudo de 10min antes da batalha — mostra o código atual do aluno e os
// resumos/explicações de tudo que ele já aprendeu, com contagem regressiva até o chefão aparecer ──
function BossStudyModal({ studyUntil, clockNow, files, summaryHistory, detailedSummaryHistory }) {
  const msLeft = Math.max(0, studyUntil - clockNow);
  const mm = Math.floor(msLeft / 60000);
  const ss = Math.floor((msLeft % 60000) / 1000);
  const dates = Object.keys(summaryHistory || {}).sort((a, b) => b.localeCompare(a));
  const codedFiles = (files || []).filter(f => (f.code || "").trim());
  return (
    <div style={{ position:"fixed", inset:0, background:"#0b0614", zIndex:1500, overflowY:"auto", padding:"32px 20px 60px" }}>
      <div style={{ maxWidth:820, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:26 }}>
          <div style={{ fontSize:52, animation:"nyx-shake 2.2s ease-in-out infinite" }}>🧠</div>
          <h1 style={{ color:"#e9d5ff", fontSize:24, margin:"8px 0 4px", fontWeight:900 }}>Hora de estudar!</h1>
          <p style={{ color:"#c4b5fd", fontSize:14, margin:"0 0 14px", lineHeight:1.6 }}>
            Um chefão está chegando — revise seu código e o que você já aprendeu antes da batalha começar!
          </p>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#3b0764", border:"1px solid #a855f7", borderRadius:20, padding:"8px 20px" }}>
            <span style={{ fontSize:18 }}>⏳</span>
            <span style={{ color:"#e9d5ff", fontWeight:900, fontSize:20, fontVariantNumeric:"tabular-nums" }}>{String(mm).padStart(2,"0")}:{String(ss).padStart(2,"0")}</span>
          </div>
        </div>
        <div className="cardfx" style={{ background:"#1a1029", border:"1px solid #3e2d5e", borderRadius:16, padding:18, marginBottom:16 }}>
          <h3 style={{ color:"#22d3ee", margin:"0 0 10px", fontSize:15 }}>💻 Seu código até agora</h3>
          {codedFiles.length === 0 ? (
            <p style={{ color:"#776798", fontSize:13 }}>Você ainda não escreveu nenhum código.</p>
          ) : codedFiles.map((f, i) => (
            <div key={i} style={{ marginBottom:10 }}>
              <p style={{ color:"#a99ac9", fontSize:12, fontWeight:700, margin:"0 0 4px" }}>📄 {f.name}</p>
              <pre style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:10, padding:12, color:"#a5f3fc", fontFamily:"'Courier New',monospace", fontSize:13, overflowX:"auto", whiteSpace:"pre-wrap", margin:0 }}>{f.code}</pre>
            </div>
          ))}
        </div>
        <div className="cardfx" style={{ background:"#1a1029", border:"1px solid #3e2d5e", borderRadius:16, padding:18 }}>
          <h3 style={{ color:"#22d3ee", margin:"0 0 10px", fontSize:15 }}>📚 O que você já aprendeu</h3>
          {dates.length === 0 ? (
            <p style={{ color:"#776798", fontSize:13 }}>Ainda não tem resumo de aula guardado — estude pelo código acima mesmo!</p>
          ) : dates.map(d => {
            const [, m, dd] = d.split("-");
            const sum = (detailedSummaryHistory && detailedSummaryHistory[d]) || summaryHistory[d];
            return (
              <div key={d} style={{ marginBottom:18 }}>
                <p style={{ color:"#fbbf24", fontWeight:800, fontSize:13, margin:"0 0 8px" }}>📅 {dd}/{m}</p>
                <SummaryPretty sum={sum} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// caderno: lista os resumos por data e mostra o escolhido
// ── 🔮 Nyx Vidente: previsão do dia, maluca e personalizada (determinística: nome+data → mesma previsão o dia todo) ──
const VIDENTE_PREVISOES = [
  "{nome}, os astros dizem que hoje você não vai esquecer NENHUM ponto e vírgula. Nenhum!",
  "Sinto uma energia de nota 100 vindo na sua direção, {nome}... ela está próxima!",
  "{nome}, a bola de cristal mostrou você encontrando um bug... e derrotando ele em segundos. 🐛⚔️",
  "Hoje o universo conspira a favor das suas chaves { }. Elas vão fechar sozinhas, {nome}!",
  "Vejo... vejo um combo de acertos seguidos no seu futuro, {nome}. As cartas não mentem!",
  "{nome}, Mercúrio saiu do modo retrógrado do seu código: hoje TUDO compila de primeira!",
  "Os espíritos do C# sussurram: '{nome} vai impressionar o professor hoje.' Eu só repito o que ouço!",
  "Cuidado, {nome}: previsão de chuva de pontos do Nyx na sua conta ainda hoje. Leve um balde!",
  "{nome}, hoje sua variável favorita será o double. Não me pergunte como eu sei. 🔮",
  "A sorte do dia diz: quem digita com calma, como você fará hoje {nome}, erra menos que o compilador espera.",
  "Vejo você descobrindo algo escondido na plataforma, {nome}... explore com atenção! 👀",
  "{nome}, hoje seu Console.WriteLine vai imprimir coisas LENDÁRIAS. A bola de cristal nunca erra (quase).",
  "Alerta cósmico: {nome} está 87% mais inteligente hoje. Os outros 13% chegam depois do lanche.",
  "As estrelas formaram um 'if' no céu essa noite, {nome}. É um sinal: suas decisões de código serão perfeitas.",
  "{nome}, sinto que um loop infinito tentará te pegar hoje... mas você vai escapar com um break elegante!",
  "Previsão do dia: {nome} termina a atividade e ainda sobra tempo pra ajudar um colega. Que nobre!",
  "O oráculo do .NET falou, {nome}: 'hoje é dia de código limpo e mente tranquila.'",
  "{nome}, vejo pontos... muitos pontos... e um item novo da loja no seu futuro próximo! 🛍️",
  "Hmm... a bola de cristal embaçou. Só consegui ver isto: {nome} + teclado = magia. ✨",
  "Segundo meu horóscopo binário, {nome}, seu número da sorte hoje é 01000001. (É um 'A' de Aprovado!)",
];
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

// ── 🎁 presente misterioso do dia (aparece ao concluir a atividade, 1x por dia) ──
const GIFT_TIERS = [
  { chance: 0.55, pts: 3,  label: "Presente comum",  emoji: "💝", color: "#34d399" },
  { chance: 0.30, pts: 6,  label: "Presente RARO",   emoji: "💎", color: "#22d3ee" },
  { chance: 0.15, pts: 12, label: "Presente ÉPICO",  emoji: "👑", color: "#fbbf24" },
];
function rollGift() {
  const r = Math.random();
  if (r < GIFT_TIERS[0].chance) return GIFT_TIERS[0];
  if (r < GIFT_TIERS[0].chance + GIFT_TIERS[1].chance) return GIFT_TIERS[1];
  return GIFT_TIERS[2];
}

// ── 🏁 corrida de digitação: digitar um trecho C# exato contra o relógio ──
const TYPING_SNIPPETS = [
  'Console.WriteLine("Olá, mundo!");',
  'int idade = 14;\nConsole.WriteLine(idade);',
  'string nome = "Nyx";\nConsole.WriteLine($"Oi, {nome}!");',
  'double preco = 9.99;\nConsole.WriteLine(preco * 2);',
  'int soma = 7 + 8;\nConsole.WriteLine($"Total: {soma}");',
  'if (nota >= 60)\n{\n    Console.WriteLine("Passou!");\n}',
  'for (int i = 1; i <= 5; i++)\n{\n    Console.WriteLine(i);\n}',
  'string resposta = Console.ReadLine();\nConsole.WriteLine(resposta);',
];

// ⌨️ Tutorial de teclado (ABNT2, réplica do notebook Lenovo) — movido pra src/KeyboardTutorial.jsx
// e carregado sob demanda (React.lazy) só quando o aluno abre o tutorial, pra não pesar o pacote inicial.
const KeyboardTutorialModal = lazy(() => import("./KeyboardTutorial.jsx"));

// ── 📋 justificar falta: o aluno escreve o motivo de um dia que faltou, o professor aprova depois ──
function JustifyModal({ absences, onSubmit, onClose }) {
  // "congela" a lista no momento em que o modal abre — depois de justificar uma falta ela some
  // de "pendingAbsences" no componente pai, mas aqui a linha precisa continuar visível pra
  // mostrar a confirmação "✅ Justificativa enviada"
  const [frozenAbsences] = useState(absences);
  const [texts, setTexts] = useState({});
  const [sent, setSent] = useState({});
  const send = async (d) => {
    const t = (texts[d] || "").trim();
    if (!t) return;
    await onSubmit(d, t);
    setSent(s => ({ ...s, [d]: true }));
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:520, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#f87171,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>😔 Justificar falta</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Escreva o motivo — o professor vai ver e pode aprovar, virando "justificado" na chamada.</p>
        {frozenAbsences.slice(0, 5).map(d => {
          const [y, m, dd] = d.split("-");
          return (
            <div key={d} style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"10px 12px", marginBottom:10 }}>
              <p style={{ color:"#f0e9fb", fontWeight:800, fontSize:13, margin:"0 0 6px" }}>📅 {dd}/{m}/{y}</p>
              {sent[d] ? (
                <p style={{ color:"#34d399", fontSize:12.5, margin:0 }}>✅ Justificativa enviada — aguardando o professor.</p>
              ) : (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <input value={texts[d]||""} onChange={e=>setTexts(t=>({ ...t, [d]: e.target.value }))} onKeyDown={e=>e.key==="Enter"&&send(d)}
                    placeholder="Ex: fui ao médico" style={{ flex:"1 1 180px", background:"#1a1029", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 10px", color:"#f0e9fb", fontSize:13, outline:"none" }} />
                  <button onClick={()=>send(d)} disabled={!(texts[d]||"").trim()} style={{ background:"linear-gradient(135deg,#f87171,#dc2626)", border:"none", borderRadius:8, color:"#fff", fontWeight:800, padding:"7px 14px", fontSize:12.5, cursor:"pointer", opacity:(texts[d]||"").trim()?1:0.5 }}>Enviar</button>
                </div>
              )}
            </div>
          );
        })}
        {frozenAbsences.length > 5 && <p style={{ color:"#776798", fontSize:12 }}>+{frozenAbsences.length - 5} outra(s) falta(s) — justifique essas primeiro e depois abra de novo.</p>}
      </div>
    </div>
  );
}

// ── 🏆 hall da fama: mural com uma placa por cidade encerrada ──
function HallOfFameModal({ entries, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:600, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#fbbf24,#fb923c)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🏆 Hall da Fama</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Quem se destacou nas cidades por onde a carreta já passou. 🚌✨</p>
        {entries.length === 0 ? (
          <p style={{ color:"#776798", fontSize:13, textAlign:"center", padding:"20px 0" }}>Ainda não tem nenhuma placa aqui — a próxima cidade encerrada entra pra esse mural!</p>
        ) : (
          [...entries].reverse().map((e, i) => (
            <div key={i} className="pop" style={{ background:"linear-gradient(135deg,#fbbf2414,#fb923c10)", border:"1px solid #fbbf2455", borderRadius:14, padding:"14px 16px", marginBottom:12 }}>
              <p style={{ color:"#fbbf24", fontWeight:900, fontSize:15, margin:"0 0 8px" }}>📍 {e.city || "Cidade sem nome"}</p>
              {(e.students||[]).map((s, j) => (
                <div key={j} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, marginBottom:4 }}>
                  <span>{["🥇","🥈","🥉"][j] || "🏅"}</span>
                  <span style={{ flex:1, color:"#f0e9fb", fontWeight:700 }}>{s.name}</span>
                  <span style={{ color:"#a99ac9", fontSize:12 }}>{s.highlight}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── 📊 Visão da Viagem: soma tudo que a carreta já fez, cidade por cidade (só pro professor) ──
function TripOverviewModal({ entries, currentCity, onClose }) {
  const cities = entries.filter(e => e.totalStudents != null || e.avgScore != null || e.totalClasses != null);
  const totalCidades = entries.length;
  const totalAlunos = cities.reduce((n, e) => n + (e.totalStudents || 0), 0);
  const totalAulas = cities.reduce((n, e) => n + (e.totalClasses || 0), 0);
  // 🗺️ mapa da jornada: cidades encerradas que batem com uma região conhecida do DF, na ordem
  // em que a carreta passou por elas (a ordem de "entries" já é cronológica — ver saveHallOfFame)
  const mapped = entries
    .map((e, i) => ({ ...e, order: i + 1, region: matchDfRegion(e.city) }))
    .filter(e => e.region);
  const unmapped = entries.filter(e => !matchDfRegion(e.city));
  const currentRegion = currentCity ? matchDfRegion(currentCity) : null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:680, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#06b6d4,#c084fc)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📊 Visão da Viagem</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>O que a carreta já fez somando todas as cidades encerradas. 🚌</p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
          <div style={{ flex:"1 1 140px", background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
            <div style={{ color:"#a99ac9", fontSize:11.5 }}>Cidades encerradas</div>
            <div style={{ color:"#f0e9fb", fontWeight:900, fontSize:26 }}>{totalCidades}</div>
          </div>
          <div style={{ flex:"1 1 140px", background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
            <div style={{ color:"#a99ac9", fontSize:11.5 }}>Alunos que passaram</div>
            <div style={{ color:"#f0e9fb", fontWeight:900, fontSize:26 }}>{totalAlunos}</div>
          </div>
          <div style={{ flex:"1 1 140px", background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
            <div style={{ color:"#a99ac9", fontSize:11.5 }}>Aulas dadas</div>
            <div style={{ color:"#f0e9fb", fontWeight:900, fontSize:26 }}>{totalAulas}</div>
          </div>
        </div>

        {/* 🗺️ mapa da jornada: o caminho que a carreta já fez pelas regiões do DF */}
        <div className="cardfx" style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:14, padding:14, marginBottom:16 }}>
          <p style={{ color:"#c084fc", fontWeight:700, fontSize:13, margin:"0 0 4px" }}>🗺️ Mapa da jornada pelo DF</p>
          <p style={{ color:"#776798", fontSize:11, margin:"0 0 10px", lineHeight:1.5 }}>Mapa esquemático (não é preciso por GPS) — só pra mostrar mais ou menos o caminho que a carreta já fez. Passe o mouse num ponto pra ver os detalhes.</p>
          <div style={{ position:"relative", width:"100%", paddingTop:"78%", background:"radial-gradient(120% 100% at 50% 0%, #241839, #140d22)", border:"1px solid #3b2a58", borderRadius:12, overflow:"hidden" }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}>
              {DF_CITIES.map(region => {
                const c = DF_REGION_COORDS[region];
                return <circle key={region} cx={c.x} cy={c.y} r={0.9} fill="#3b2a58" />;
              })}
              {mapped.length > 1 && (
                <polyline
                  points={mapped.map(e => `${DF_REGION_COORDS[e.region].x},${DF_REGION_COORDS[e.region].y}`).join(" ")}
                  fill="none" stroke="#c084fc" strokeWidth={0.7} strokeDasharray="2.2,1.6" opacity={0.75}
                />
              )}
            </svg>
            {mapped.map(e => (
              <div key={e.order}
                title={`${e.order}. ${e.city} — ${e.totalStudents || 0} aluno(s), nota média ${e.avgScore || 0}, ${e.totalClasses || 0} aula(s)${e.closedAt ? ` · encerrada em ${new Date(e.closedAt).toLocaleDateString("pt-BR")}` : ""}`}
                style={{ position:"absolute", left:`${DF_REGION_COORDS[e.region].x}%`, top:`${DF_REGION_COORDS[e.region].y}%`, transform:"translate(-50%,-50%)",
                  width:20, height:20, borderRadius:"50%", background:"linear-gradient(135deg,#fbbf24,#fb923c)", border:"2px solid #1a1029",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#1a1029",
                  cursor:"default", boxShadow:"0 2px 8px rgba(0,0,0,.5)" }}>
                {e.order}
              </div>
            ))}
            {currentRegion && (
              <div title={`🚌 Você está aqui agora: ${currentCity}`}
                style={{ position:"absolute", left:`${DF_REGION_COORDS[currentRegion].x}%`, top:`${DF_REGION_COORDS[currentRegion].y}%`, transform:"translate(-50%,-50%)",
                  width:16, height:16, borderRadius:"50%", background:"#34d399", border:"2px solid #1a1029",
                  boxShadow:"0 0 0 6px #34d39933", animation:"pulse-dot 1.4s ease-in-out infinite" }} />
            )}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:10, fontSize:11.5 }}>
            <span style={{ color:"#a99ac9", display:"flex", alignItems:"center", gap:5 }}><span style={{ width:12, height:12, borderRadius:"50%", background:"linear-gradient(135deg,#fbbf24,#fb923c)", display:"inline-block" }} /> cidade já encerrada (ordem da visita)</span>
            {currentRegion && <span style={{ color:"#a99ac9", display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, borderRadius:"50%", background:"#34d399", display:"inline-block" }} /> você está aqui agora</span>}
          </div>
          {unmapped.length > 0 && (
            <p style={{ color:"#776798", fontSize:11, marginTop:8 }}>Não reconheci a região de {unmapped.map(e=>`"${e.city||"?"}"`).join(", ")} pra colocar no mapa, mas conta na jornada mesmo assim.</p>
          )}
        </div>

        {cities.length === 0 ? (
          <p style={{ color:"#776798", fontSize:13, textAlign:"center", padding:"20px 0" }}>Ainda não tem estatísticas de cidade aqui — elas passam a aparecer a partir da próxima cidade encerrada.</p>
        ) : (
          <div className="cardfx" style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:14, padding:14 }}>
            <p style={{ color:"#c084fc", fontWeight:700, fontSize:13, margin:"0 0 10px" }}>📈 Nota média por cidade</p>
            <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:120, overflowX:"auto", paddingBottom:4, borderBottom:"1px solid #3b2a58" }}>
              {cities.map((e, i) => {
                const g = gradeInfo(e.avgScore || 0);
                return (
                  <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, minWidth:52 }}>
                    <span style={{ color:g.color, fontSize:11, fontWeight:800 }}>{e.avgScore || 0}</span>
                    <div style={{ width:30, height:Math.max(4, Math.round((e.avgScore||0) * 0.9)), background:`linear-gradient(180deg, ${g.color}, ${shade(g.color, -0.3)})`, borderRadius:"5px 5px 2px 2px" }} title={`${e.city}: nota média ${e.avgScore||0}, ${e.totalStudents||0} aluno(s)`} />
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:10, marginTop:6 }}>
              {cities.map((e, i) => (
                <span key={i} style={{ color:"#776798", fontSize:10, minWidth:52, textAlign:"center", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={e.city}>{e.city || "?"}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingRaceModal({ onClose, onFinish }) {
  const [target] = useState(() => TYPING_SNIPPETS[Math.floor(Math.random() * TYPING_SNIPPETS.length)]);
  const [typed, setTyped] = useState("");
  const [startAt, setStartAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState(null); // { ms, reward, newRecord }
  const [top, setTop] = useState(null);
  useEffect(() => {
    if (!startAt || result) return;
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, [startAt, result]);
  // pódio: os 3 melhores tempos da turma inteira
  useEffect(() => {
    listStudents().then(all => setTop(
      all.filter(s => s.typingBest && typeof s.typingBest.ms === "number")
        .sort((a, b) => a.typingBest.ms - b.typingBest.ms).slice(0, 3)
    )).catch(() => setTop([]));
  }, [result]);
  const onType = (v) => {
    if (result) return;
    if (!startAt && v.length) setStartAt(Date.now());
    setTyped(v);
    if (v === target) {
      const ms = Date.now() - (startAt || Date.now());
      playSound("combo");
      Promise.resolve(onFinish(ms)).then(r => setResult({ ms, ...(r || {}) }));
    }
  };
  const elapsed = startAt ? ((result ? result.ms : now - startAt) / 1000) : 0;
  const okLen = (() => { let i = 0; while (i < typed.length && typed[i] === target[i]) i++; return i; })();
  const hasError = typed.length > okLen;
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:600, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#f87171,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🏁 Corrida de Digitação</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 12px" }}>Digite o código abaixo EXATAMENTE igual, o mais rápido que conseguir. O relógio começa na primeira tecla — e colar não vale! 😉</p>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ color:"#fbbf24", fontWeight:900, fontSize:22, fontVariantNumeric:"tabular-nums" }}>⏱ {elapsed.toFixed(1)}s</span>
          <span style={{ color: hasError ? "#f87171" : "#34d399", fontSize:12.5, fontWeight:800 }}>{result ? "🏁 Chegada!" : hasError ? "✗ tem uma letra errada aí!" : `${okLen}/${target.length} caracteres`}</span>
        </div>
        <div className="bar-glow" style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:20, height:10, overflow:"hidden", marginBottom:12 }}>
          <div style={{ width:`${(okLen / target.length) * 100}%`, height:"100%", background: hasError ? "#f87171" : "linear-gradient(90deg,#f87171,#fbbf24,#34d399)", transition:"width .15s ease" }} />
        </div>

        <pre style={{ background:"#1e1e1e", border:"1px solid #3e3e42", borderRadius:10, padding:"12px 14px", fontFamily:"'Courier New',monospace", fontSize:15, lineHeight:1.7, margin:"0 0 10px", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
          {target.split("").map((ch, i) => (
            <span key={i} style={{
              color: i < okLen ? "#34d399" : (i < typed.length ? "#171026" : "#d4d4d4"),
              background: i < okLen ? "transparent" : (i < typed.length ? "#f87171" : "transparent"),
              borderRadius: 2,
            }}>{ch}</span>
          ))}
        </pre>

        {!result ? (
          <textarea autoFocus value={typed} onChange={e => onType(e.target.value)} onPaste={e => e.preventDefault()} spellCheck={false} autoCorrect="off" autoCapitalize="off"
            placeholder="Digite aqui... o tempo começa na primeira tecla!"
            style={{ width:"100%", minHeight:90, background:"#171026", border:`2px solid ${hasError ? "#f87171" : "#3b2a58"}`, borderRadius:12, padding:"10px 12px", color:"#f0e9fb", fontFamily:"'Courier New',monospace", fontSize:15, lineHeight:1.7, outline:"none", resize:"vertical" }} />
        ) : (
          <div className="pop" style={{ background:"linear-gradient(135deg,#34d39922,#22d3ee22)", border:"1px solid #34d399", borderRadius:14, padding:"16px 18px", textAlign:"center" }}>
            <div style={{ fontSize:38 }}>🏁</div>
            <p style={{ color:"#f0e9fb", fontWeight:900, fontSize:20, margin:"6px 0 2px" }}>{(result.ms / 1000).toFixed(1)} segundos!</p>
            {result.newRecord && <p style={{ color:"#fbbf24", fontWeight:800, fontSize:14, margin:"2px 0" }}>🌟 NOVO RECORDE PESSOAL!</p>}
            <p style={{ color:"#a99ac9", fontSize:13, margin:"4px 0 0" }}>{result.reward > 0 ? `+${result.reward} ponto${result.reward>1?"s":""} do Nyx pra você!` : "Pontos da corrida já garantidos hoje — mas o recorde continua valendo!"}</p>
            <button onClick={onClose} style={{ marginTop:12, background:"linear-gradient(135deg,#34d399,#059669)", border:"none", borderRadius:10, color:"#fff", fontWeight:800, padding:"9px 22px", cursor:"pointer", fontSize:14 }}>Fechar</button>
          </div>
        )}

        <div style={{ marginTop:14, borderTop:"1px solid #3b2a58", paddingTop:10 }}>
          <p style={{ color:"#fbbf24", fontSize:12.5, fontWeight:800, margin:"0 0 8px" }}>🏆 Pilotos mais rápidos da turma</p>
          {top === null ? <p style={{ color:"#776798", fontSize:12 }}>Carregando pódio...</p>
            : top.length === 0 ? <p style={{ color:"#776798", fontSize:12 }}>Ninguém correu ainda — seja o primeiro do pódio!</p>
            : top.map((s, i) => (
              <div key={s.name} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, marginBottom:4 }}>
                <span>{medals[i]}</span>
                <span style={{ flex:1, color:"#f0e9fb", fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</span>
                <span style={{ color:"#34d399", fontWeight:800, fontVariantNumeric:"tabular-nums" }}>{(s.typingBest.ms / 1000).toFixed(1)}s</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ── 🗺️ Trilha de aprendizado: transforma o caderno de resumos (já existia) numa trilha visual —
// um "checkpoint" por dia de aula, com os conceitos aprendidos naquele dia, ligados por uma linha.
// Não junta dado novo nenhum, só dá uma cara de progresso pro que já tava guardado.
const TRAIL_NODE_COLORS = ["#c084fc","#22d3ee","#34d399","#fbbf24","#f472b6","#818cf8"];
function LearningTrailModal({ history, onClose }) {
  const dates = Object.keys(history || {}).sort((a,b)=>a.localeCompare(b));
  const fmt = (d) => { const [,m,dd] = d.split("-"); return `${dd}/${m}`; };
  const totalConceitos = dates.reduce((n,d) => n + ((history[d]?.secoes||[]).length), 0);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:560, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#c084fc,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🗺️ Trilha de aprendizado</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 18px" }}>{dates.length === 0 ? "Sua trilha começa na sua primeira aula salva!" : `${dates.length} aula${dates.length===1?"":"s"} · ${totalConceitos} conceito${totalConceitos===1?"":"s"} aprendido${totalConceitos===1?"":"s"} até aqui.`}</p>
        {dates.length === 0 ? (
          <p style={{ color:"#776798", fontSize:13 }}>Salve e finalize uma aula pra começar a ver seu caminho aqui.</p>
        ) : (
          <div style={{ position:"relative", paddingLeft:28 }}>
            <div style={{ position:"absolute", left:9, top:8, bottom:8, width:2, background:"linear-gradient(180deg,#3b2a58,#3b2a58 90%,transparent)" }} />
            {dates.map((d, i) => {
              const sum = history[d] || {};
              const secoes = sum.secoes || [];
              const color = TRAIL_NODE_COLORS[i % TRAIL_NODE_COLORS.length];
              return (
                <div key={d} style={{ position:"relative", marginBottom:18 }}>
                  <div style={{ position:"absolute", left:-28, top:2, width:20, height:20, borderRadius:"50%", background:color, border:"3px solid #1a1029", boxShadow:`0 0 0 2px ${color}66`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#1a1029" }}>{i+1}</div>
                  <div style={{ background:"#171026", border:`1px solid ${color}44`, borderRadius:14, padding:"10px 14px" }}>
                    <div style={{ color, fontWeight:800, fontSize:12.5, marginBottom: secoes.length ? 8 : 0 }}>📅 {fmt(d)}</div>
                    {secoes.length > 0 && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {secoes.map((s,j) => (
                          <span key={j} title={s.explicacao||""} style={{ background:`${color}18`, border:`1px solid ${color}55`, color:"#f0e9fb", borderRadius:999, padding:"3px 10px", fontSize:11.5 }}>{s.emoji||"✨"} {s.titulo}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{ position:"relative" }}>
              <div className="avatar-idle" style={{ position:"absolute", left:-28, top:2, width:20, height:20, borderRadius:"50%", background:"#3b2a58", border:"3px dashed #56407e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>🚀</div>
              <p style={{ color:"#776798", fontSize:12.5, paddingTop:2 }}>Sua próxima aula continua a trilha daqui!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── "próximos passos": lista curada de recursos gratuitos pra quem quer continuar aprendendo
// depois da aula (a carreta passa e segue viagem, mas o aprendizado não precisa parar por aqui) ──
const NEXT_STEPS_RESOURCES = [
  { category: "📘 Continue com C# e .NET", items: [
    { title: "Microsoft Learn — trilha de C#", desc: "Curso oficial da Microsoft, 100% gratuito, com certificado de conclusão em cada módulo.", url: "https://learn.microsoft.com/pt-br/training/paths/csharp-first-steps/" },
  ]},
  { category: "🌐 Outras linguagens e programação web", items: [
    { title: "Curso em Vídeo", desc: "Aulas gratuitas em português — lógica de programação, Python, HTML/CSS, JavaScript e mais.", url: "https://www.cursoemvideo.com" },
    { title: "freeCodeCamp", desc: "Cursos gratuitos e baseados em projetos, com certificado — programação web do zero ao avançado.", url: "https://www.freecodecamp.org" },
    { title: "W3Schools", desc: "Referência e tutoriais gratuitos pra consultar sempre que tiver uma dúvida de código.", url: "https://www.w3schools.com" },
  ]},
  { category: "🎓 Cursos e certificados gratuitos", items: [
    { title: "Rocketseat Discover", desc: "Trilha gratuita em português pra quem está começando na programação.", url: "https://www.rocketseat.com.br/discover" },
    { title: "Escola Virtual (Fundação Bradesco)", desc: "Cursos gratuitos com certificado, incluindo programação e tecnologia.", url: "https://www.ev.org.br" },
  ]},
  { category: "💪 Pratique programando", items: [
    { title: "Exercism", desc: "Exercícios de código gratuitos em várias linguagens (incluindo C#), com mentoria da comunidade.", url: "https://exercism.org" },
    { title: "GitHub", desc: "Crie uma conta gratuita e comece a guardar seus projetos lá — é o seu portfólio pra mostrar pro mundo.", url: "https://github.com" },
  ]},
];
function NextStepsModal({ onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:600, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#34d399,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🚀 Próximos passos</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 18px" }}>A carreta segue viagem, mas seu aprendizado não precisa parar por aqui! Recursos gratuitos pra continuar evoluindo:</p>
        {NEXT_STEPS_RESOURCES.map(group => (
          <div key={group.category} style={{ marginBottom:16 }}>
            <p style={{ color:"#fbbf24", fontWeight:800, fontSize:13, margin:"0 0 8px" }}>{group.category}</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {group.items.map(r => (
                <a key={r.title} href={r.url} target="_blank" rel="noopener noreferrer"
                  style={{ display:"block", background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"10px 14px", textDecoration:"none" }}>
                  <div style={{ color:"#f0e9fb", fontWeight:800, fontSize:13.5 }}>{r.title} <span style={{ color:"#22d3ee", fontSize:12 }}>↗</span></div>
                  <div style={{ color:"#a99ac9", fontSize:12, marginTop:2, lineHeight:1.5 }}>{r.desc}</div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotebookModal({ history, detailedHistory, onClose }) {
  const dates = Object.keys(history || {}).sort((a,b)=>b.localeCompare(a));
  const [sel, setSel] = useState(dates[0] || null);
  const [view, setView] = useState("simples");
  const fmt = (d) => { const [y,m,dd] = d.split("-"); return `${dd}/${m}/${y}`; };
  const hasDetailed = sel && detailedHistory && detailedHistory[sel];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:640, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#34d399,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📒 Caderno de resumos</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Todos os resumos das suas aulas, guardados por dia. Ótimo para revisar antes da prova!</p>
        {dates.length === 0 ? (
          <p style={{ color:"#776798", fontSize:13 }}>Nenhum resumo guardado ainda — eles aparecem aqui quando você salva e finaliza uma aula.</p>
        ) : (
          <>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {dates.map(d => (
                <button key={d} onClick={()=>{ setSel(d); setView("simples"); }}
                  style={{ background: sel===d ? "#34d399" : "#171026", color: sel===d ? "#03301f" : "#a99ac9", border:`1px solid ${sel===d?"#34d399":"#3b2a58"}`, borderRadius:10, padding:"6px 12px", cursor:"pointer", fontWeight:800, fontSize:12.5 }}>
                  📅 {fmt(d)}
                </button>
              ))}
            </div>
            {hasDetailed && (
              <div style={{ display:"flex", gap:6, marginBottom:14 }}>
                <button onClick={()=>setView("simples")} style={{ background: view==="simples" ? "#c084fc" : "#171026", color: view==="simples" ? "#fff" : "#a99ac9", border:`1px solid ${view==="simples"?"#c084fc":"#3b2a58"}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", fontWeight:800, fontSize:11.5 }}>🌱 Simples</button>
                <button onClick={()=>setView("detalhado")} style={{ background: view==="detalhado" ? "#c084fc" : "#171026", color: view==="detalhado" ? "#fff" : "#a99ac9", border:`1px solid ${view==="detalhado"?"#c084fc":"#3b2a58"}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", fontWeight:800, fontSize:11.5 }}>📖 Detalhado</button>
              </div>
            )}
            {sel && <SummaryPretty sum={(view==="detalhado" && hasDetailed) ? detailedHistory[sel] : history[sel]} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── 📊 Meu Desempenho: gráfico de notas + destaque/dificuldade + mensagem motivacional do Nyx ──
function motivationalMessage(avg, name) {
  const first = String(name || "").split(" ")[0] || "Programador(a)";
  if (avg == null) return `${first}, você ainda está começando — cada linha de código já é um passo. Continue estudando, porque assim você vai longe! 🚀`;
  if (avg >= 90) return `${first}, seu desempenho está excelente! Continue assim — quem estuda com essa dedicação vai muito longe. 🚀🏆`;
  if (avg >= 75) return `${first}, você está indo muito bem! Continue estudando nesse ritmo, porque assim você vai longe. ⭐`;
  if (avg >= 60) return `${first}, você está no caminho certo! Continue praticando um pouco mais — assim você vai longe. 👍`;
  if (avg >= 40) return `${first}, programar é difícil no começo pra todo mundo. Não desista — continue estudando um pouquinho todo dia, porque assim você vai longe. 💪`;
  return `${first}, todo programador começou exatamente de onde você está agora. Continue tentando e peça ajuda ao Nyx e ao professor sempre que precisar — continue estudando, porque assim você vai longe! 🌱`;
}
// mesmo visual do PerformanceChart (gradiente, Recharts), mas pra média/taxa da TURMA por dia
// (em vez da nota de um aluno só) — usado em "Evolução da turma" (nota) e "Evolução da presença".
// gradId precisa ser único quando os dois gráficos aparecem juntos na mesma tela (ids de <svg>
// duplicados fazem o navegador aplicar sempre o PRIMEIRO gradiente a todas as cópias)
function ClassTrendChart({ trend, unit = "pts", gradId = "classTrendGrad", color = "#c084fc" }) {
  const [RC, setRC] = useState(null);
  useEffect(() => {
    let alive = true;
    import("recharts").then(mod => { if (alive) setRC(mod); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const data = trend.map(({ date, avg, count }) => {
    const [, m, dd] = date.split("-");
    return { date: `${dd}/${m}`, avg, count };
  });
  const fmtVal = (n) => unit === "%" ? `${n}%` : `${n} ${unit}`;

  if (!RC) {
    return (
      <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:110, overflowX:"auto", paddingBottom:4 }}>
        {data.map(({ date, avg }) => {
          const g = gradeInfo(avg);
          return (
            <div key={date} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, minWidth:38 }}>
              <span style={{ color:g.color, fontSize:11, fontWeight:800 }}>{avg}</span>
              <div style={{ width:24, height:Math.max(4, Math.round(avg*0.7)), background:`linear-gradient(180deg, ${g.color}, ${shade(g.color,-0.3)})`, borderRadius:"5px 5px 2px 2px" }} title={`${date}: média ${fmtVal(avg)}`} />
              <span style={{ color:"#776798", fontSize:10 }}>{date}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } = RC;
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const { avg, count } = payload[0].payload;
    const g = gradeInfo(avg);
    return (
      <div style={{ background:"#1e1430", border:`1px solid ${g.color}`, borderRadius:10, padding:"6px 10px", fontSize:12, boxShadow:"0 6px 18px rgba(0,0,0,.4)" }}>
        <div style={{ color:"#a99ac9" }}>{label}</div>
        <div style={{ color:g.color, fontWeight:900 }}>{fmtVal(avg)}</div>
        <div style={{ color:"#776798", fontSize:11 }}>{count} aluno{count>1?"s":""}</div>
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top:8, right:8, left:-20, bottom:0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#3b2a58" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" stroke="#776798" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} stroke="#776798" fontSize={10} tickLine={false} axisLine={false} width={26} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="avg" stroke={color} strokeWidth={2.5} fill={`url(#${gradId})`} dot={{ r:3, fill:color, strokeWidth:0 }} activeDot={{ r:5 }} animationDuration={700} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
// ── 😊 check-in emocional: aparece 1x por dia pro aluno, antes de começar a codar — rapidinho,
// sem nota nem cobrança, só pro professor ter mais contexto sobre a turma naquele dia ──
const CHECKIN_MOODS = [
  { id: "otimo",   emoji: "😄", label: "Empolgado" },
  { id: "bem",     emoji: "🙂", label: "Bem" },
  { id: "neutro",  emoji: "😐", label: "Neutro" },
  { id: "cansado", emoji: "😴", label: "Cansado" },
  { id: "dificil", emoji: "😣", label: "Dia difícil" },
];
function checkinMoodInfo(id) {
  return CHECKIN_MOODS.find(m => m.id === id) || null;
}
function CheckinModal({ shift, studentName, onDone }) {
  const [saving, setSaving] = useState(false);
  const pick = async (mood) => {
    if (saving) return;
    setSaving(true);
    await setCheckin(shift, studentName, todayKey(), mood);
    onDone();
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"26px 24px", maxWidth:420, width:"100%", boxShadow:"0 24px 70px rgba(0,0,0,.55)", textAlign:"center" }}>
        <h2 style={{ margin:"0 0 6px", fontSize:19, fontWeight:900, background:"linear-gradient(135deg,#c084fc,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>Como você tá chegando hoje?</h2>
        <p style={{ color:"#a99ac9", fontSize:12.5, margin:"0 0 18px" }}>Só o professor vê isso. Não vale nota, é rapidinho :)</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(76px,1fr))", gap:8 }}>
          {CHECKIN_MOODS.map(m => (
            <button key={m.id} onClick={()=>pick(m.id)} disabled={saving}
              style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:14, padding:"12px 6px", cursor:saving?"default":"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, opacity:saving?0.6:1 }}
              onMouseEnter={e=>{ if(!saving) e.currentTarget.style.borderColor = "#c084fc"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor = "#3b2a58"; }}>
              <span style={{ fontSize:26 }}>{m.emoji}</span>
              <span style={{ color:"#e6ddf5", fontSize:11, fontWeight:700 }}>{m.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onDone} disabled={saving} style={{ background:"transparent", border:"none", color:"#776798", fontSize:12, marginTop:16, cursor:"pointer", textDecoration:"underline" }}>Pular hoje</button>
      </div>
    </div>
  );
}
function PerformanceModal({ studentName, scoreHistory, achievements, duelWins, typingBest, streakCount, onClose }) {
  const entries = Object.entries(scoreHistory || {}).sort(([a], [b]) => a.localeCompare(b));
  const scores = entries.map(([, n]) => n);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const best = entries.length ? entries.reduce((b, e) => (e[1] > b[1] ? e : b)) : null;
  const worst = entries.length ? entries.reduce((w, e) => (e[1] < w[1] ? e : w)) : null;
  const fmt = (d) => { const [, m, dd] = d.split("-"); return `${dd}/${m}`; };
  const highlight = best
    ? `Sua melhor nota foi ${best[1]} em ${fmt(best[0])} — mandou muito bem! 🌟`
    : achievements?.length
      ? `Você já desbloqueou ${achievements.length} conquista(s) — continue assim!`
      : `Você já deu os primeiros passos no C#. Continue!`;
  const struggle = worst && worst[1] < 60 && entries.length > 1
    ? `No dia ${fmt(worst[0])} você teve mais dificuldade (nota ${worst[1]}) — que tal pedir uma revisão desse conteúdo pro Nyx?`
    : null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:640, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#06b6d4,#c084fc)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📊 Meu Desempenho</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", margin:"10px 0 16px" }}>
          <div style={{ flex:"1 1 100px", background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"10px 12px", textAlign:"center" }}>
            <div style={{ color:"#a99ac9", fontSize:11 }}>Média geral</div>
            <div style={{ color:"#f0e9fb", fontWeight:900, fontSize:20 }}>{avg ?? "—"}</div>
          </div>
          <div style={{ flex:"1 1 100px", background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"10px 12px", textAlign:"center" }}>
            <div style={{ color:"#a99ac9", fontSize:11 }}>Atividades feitas</div>
            <div style={{ color:"#f0e9fb", fontWeight:900, fontSize:20 }}>{entries.length}</div>
          </div>
          <div style={{ flex:"1 1 100px", background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"10px 12px", textAlign:"center" }}>
            <div style={{ color:"#a99ac9", fontSize:11 }}>Conquistas</div>
            <div style={{ color:"#f0e9fb", fontWeight:900, fontSize:20 }}>{achievements?.length || 0}</div>
          </div>
          {streakCount >= 2 && (
            <div style={{ flex:"1 1 100px", background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ color:"#a99ac9", fontSize:11 }}>Sequência 🔥</div>
              <div style={{ color:"#f0e9fb", fontWeight:900, fontSize:20 }}>{streakCount}</div>
            </div>
          )}
        </div>
        {entries.length > 0 ? (
          <div className="cardfx" style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:14, padding:14, marginBottom:14 }}>
            <p style={{ color:"#c084fc", fontWeight:700, fontSize:13, margin:"0 0 10px" }}>📈 Notas ao longo do tempo</p>
            <PerformanceChart entries={entries} />
          </div>
        ) : (
          <p style={{ color:"#776798", fontSize:13, textAlign:"center", padding:"16px 0" }}>Ainda não tem nenhuma atividade concluída — assim que você terminar a primeira, o gráfico aparece aqui!</p>
        )}
        <div className="cardfx" style={{ background:"#34d39912", border:"1px solid #34d399", borderRadius:12, padding:"12px 14px", marginBottom:10 }}>
          <p style={{ color:"#34d399", fontWeight:800, fontSize:13, margin:"0 0 4px" }}>✨ Destaque</p>
          <p style={{ color:"#c7f5df", fontSize:13, margin:0, lineHeight:1.6 }}>{highlight}</p>
        </div>
        {struggle && (
          <div className="cardfx" style={{ background:"#f8717112", border:"1px solid #f87171", borderRadius:12, padding:"12px 14px", marginBottom:10 }}>
            <p style={{ color:"#f87171", fontWeight:800, fontSize:13, margin:"0 0 4px" }}>📚 Pra revisar</p>
            <p style={{ color:"#fca5a5", fontSize:13, margin:0, lineHeight:1.6 }}>{struggle}</p>
          </div>
        )}
        <div className="cardfx" style={{ background:"linear-gradient(120deg,#1e1b4b,#3b0764,#1e1b4b)", border:"1px solid #8b5cf6", borderRadius:12, padding:"14px 16px" }}>
          <p style={{ color:"#c4b5fd", fontWeight:800, fontSize:13, margin:"0 0 4px" }}>💜 Nyx pra você</p>
          <p style={{ color:"#ddd6fe", fontSize:13.5, margin:0, lineHeight:1.7 }}>{motivationalMessage(avg, studentName)}</p>
        </div>
      </div>
    </div>
  );
}

// chuva de confete + banner quando a turma sobe de nível na meta coletiva
function ConfettiParty({ level }) {
  const pieces = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 1.6,
    dur: 2.4 + Math.random() * 2,
    size: 6 + Math.random() * 7,
    color: ["#c084fc","#22d3ee","#34d399","#fbbf24","#ec4899","#f87171"][i % 6],
    rot: Math.random() * 360,
  })), []);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1400, pointerEvents:"none", overflow:"hidden" }}>
      <style>{`@keyframes confete-cai { 0% { transform: translateY(-4vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(106vh) rotate(720deg); opacity: 0.8; } }`}</style>
      {pieces.map((p, i) => (
        <div key={i} style={{ position:"absolute", top:0, left:`${p.left}%`, width:p.size, height:p.size*0.6, background:p.color, borderRadius:2, transform:`rotate(${p.rot}deg)`, animation:`confete-cai ${p.dur}s linear ${p.delay}s both` }} />
      ))}
      <div style={{ position:"absolute", top:"18%", left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,#c084fc,#22d3ee)", color:"#fff", fontWeight:900, padding:"14px 28px", borderRadius:20, boxShadow:"0 14px 44px rgba(0,0,0,.5)", fontSize:17, textAlign:"center", animation:"rise .4s ease both" }}>
        🎉 A TURMA SUBIU DE NÍVEL! 🎉<br/>
        <span style={{ fontSize:13.5, fontWeight:700, opacity:0.95 }}>Meta coletiva: nível {level} alcançado — parabéns a todos!</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  🎉 QUIZ ESTILO KAHOOT  (professor cria sala com código; alunos entram e respondem valendo pontos por velocidade)
// ════════════════════════════════════════════════════════════════════════════
// cores e formas das alternativas, na ordem clássica do Kahoot
const QUIZ_COLORS = [
  { bg: "#e21b3c", shape: "▲" },
  { bg: "#1368ce", shape: "◆" },
  { bg: "#d89e00", shape: "●" },
  { bg: "#26890c", shape: "■" },
];
const QUIZ_QUESTION_SECONDS = 20; // padrão — o professor escolhe outro tempo ao criar a sala
const QUIZ_TIMER_OPTIONS = [10, 15, 20, 30, 45, 60];
const quizSecsOf = (room) => (room && room.secs) || QUIZ_QUESTION_SECONDS;
// pontuação estilo Kahoot: acertou vale 500 + até 500 de bônus por velocidade; pergunta difícil vale em dobro
function quizPoints(isCorrect, elapsedMs, durationMs, hard) {
  if (!isCorrect) return 0;
  const speed = Math.max(0, Math.min(1, 1 - elapsedMs / durationMs));
  const base = 500 + Math.round(500 * speed);
  return hard ? base * 2 : base;
}
const makeQuizCode = () => String(Math.floor(100000 + Math.random() * 900000));
// apura o placar da sala: soma os pontos de cada jogador a partir das respostas gravadas no perfil
// de cada um (quizAnswers, com horário) contra o horário de início de cada pergunta (room.startedAts)
function quizLeaderboard(room, students) {
  const players = (students || []).filter(s => s.quizJoin && s.quizJoin.code === room.code);
  const durationMs = quizSecsOf(room) * 1000;
  return players.map(s => {
    let total = 0;
    (room.questions || []).forEach((q, i) => {
      const ans = (s.quizAnswers || {})[i];
      const startedAt = (room.startedAts || {})[i];
      if (!ans || startedAt == null) return;
      const elapsed = ans.at - startedAt;
      if (elapsed < 0 || elapsed > durationMs) return; // respondeu fora do tempo, não vale
      total += quizPoints(ans.opt === q.correct, elapsed, durationMs, q.hard);
    });
    return { name: s.name, avatar: s.avatar, total };
  }).sort((a, b) => b.total - a.total);
}
// tema pronto de fábrica: "O Jogo da Imitação" (25 perguntas fornecidas pelo professor em PDF) —
// perguntas [Difícil] valem pontos em dobro, e as de Verdadeiro/Falso têm só 2 alternativas
const QUIZ_SEED_THEMES = [
  {
    id: "seed-imitacao",
    title: "🎬 O Jogo da Imitação",
    builtin: true,
    questions: [
      { q: "Quem é o protagonista do filme?", opts: ["Alan Turing", "Winston Churchill", "Hugh Alexander", "John Cairncross"], correct: 0 },
      { q: "Qual era a profissão de Alan Turing?", opts: ["Médico", "Matemático", "Advogado", "Piloto"], correct: 1 },
      { q: "Qual o nome da máquina alemã cujos códigos precisavam ser quebrados?", opts: ["Colossus", "Enigma", "Cipher", "Atlas"], correct: 1, hard: true },
      { q: "Alan Turing trabalhava sozinho durante toda a missão.", opts: ["Verdadeiro", "Falso"], correct: 1 },
      { q: "Em que guerra o filme se passa?", opts: ["Primeira Guerra", "Guerra Fria", "Segunda Guerra Mundial", "Guerra do Vietnã"], correct: 2 },
      { q: "Onde a equipe trabalhava?", opts: ["Oxford", "Bletchley Park", "Cambridge", "Londres Tower"], correct: 1 },
      { q: "Como Alan chamou sua máquina?", opts: ["Joan", "Christopher", "Victory", "Turing"], correct: 1, hard: true },
      { q: "O nome da máquina foi uma homenagem a um amigo de infância.", opts: ["Verdadeiro", "Falso"], correct: 0 },
      { q: "Quem convence Alan a dar uma chance aos colegas?", opts: ["Joan Clarke", "Churchill", "Hugh", "Peter"], correct: 0 },
      { q: "Quem é a única mulher da equipe principal?", opts: ["Margaret", "Joan Clarke", "Helen", "Mary"], correct: 1 },
      { q: "Joan resolve palavras cruzadas para entrar na equipe.", opts: ["Verdadeiro", "Falso"], correct: 0 },
      { q: "O que permitiu reduzir drasticamente as possibilidades da Enigma?", opts: ["Um erro de cálculo", "A palavra repetida nas mensagens", "Um ataque aéreo", "Um mapa"], correct: 1, hard: true },
      { q: "O principal objetivo da equipe era:", opts: ["Construir aviões", "Decifrar mensagens alemãs", "Invadir bases", "Criar rádios"], correct: 1 },
      { q: "A equipe podia agir sobre todas as mensagens decifradas.", opts: ["Verdadeiro", "Falso"], correct: 1 },
      { q: "Por que nem todos os ataques podiam ser impedidos?", opts: ["Faltavam soldados", "Para não revelar que o código havia sido quebrado", "Não havia combustível", "Churchill proibiu"], correct: 1, hard: true },
      { q: "Quem interpretou Alan Turing?", opts: ["Tom Hanks", "Benedict Cumberbatch", "Matt Damon", "Cillian Murphy"], correct: 1 },
      { q: "Quem interpretou Joan Clarke?", opts: ["Keira Knightley", "Emma Watson", "Emily Blunt", "Natalie Portman"], correct: 0 },
      { q: "Alan e Joan chegam a ficar noivos no filme.", opts: ["Verdadeiro", "Falso"], correct: 0 },
      { q: "Alan escondia qual aspecto de sua vida?", opts: ["Era casado", "Sua orientação sexual", "Era espião", "Era militar"], correct: 1 },
      { q: "O que acontece com Alan após a guerra?", opts: ["Vira ministro", "É perseguido judicialmente por ser homossexual", "Vai para outro país", "Entra no exército"], correct: 1, hard: true },
      { q: "O filme mostra que Alan recebeu reconhecimento em vida por seu trabalho.", opts: ["Verdadeiro", "Falso"], correct: 1 },
      { q: "Qual área moderna foi profundamente influenciada por Turing?", opts: ["Medicina", "Computação", "Arquitetura", "Astronomia"], correct: 1 },
      { q: "O teste criado por Turing ficou conhecido como:", opts: ["Teste Alpha", "Teste de Turing", "Teste Enigma", "Teste Binary"], correct: 1, hard: true },
      { q: "O filme é baseado em fatos reais.", opts: ["Verdadeiro", "Falso"], correct: 0 },
      { q: "Aproximadamente quanto tempo a guerra pode ter sido encurtada graças ao trabalho de Bletchley Park, segundo o filme?", opts: ["6 meses", "1 ano", "2 anos", "5 anos"], correct: 2, hard: true },
    ],
  },
];

// ════════════════════════════════════════════════════════════════════════════
//  DUELO ENTRE ALUNOS  (desafio 1x1: convite, aceite, mini-quiz compartilhado, resultado)
// ════════════════════════════════════════════════════════════════════════════
const DUEL_SYSTEM = "Você cria questões de múltipla escolha básicas sobre C# para iniciantes. Responda APENAS JSON puro, sem markdown.";

async function generateDuelQuestions() {
  const res = await askClaude(
    `Crie 5 questões de múltipla escolha RÁPIDAS e BÁSICAS sobre conceitos fundamentais de C# para iniciantes (variáveis, tipos, Console.WriteLine/ReadLine, if/else, for/while, operadores). Nível fácil/médio, boas para um duelo rápido de conhecimento entre dois alunos. Responda APENAS JSON puro:\n{"questions":[{"q":"...","opts":["A","B","C","D"],"correct":0}]}`,
    DUEL_SYSTEM,
    { temperature: 0.7 }
  );
  const parsed = extractJson(res);
  return shuffleQuestions(parsed.questions || []);
}

// 🧠 teste de conhecimento por conta própria: o aluno pode se testar a qualquer momento da aula,
// sem precisar esperar a atividade oficial (que só libera depois de finalizar a aula) — sem dicas,
// pra valer mesmo como autoavaliação
async function generateKnowledgeTestQuestions() {
  const res = await askClaude(
    `Crie 6 questões de múltipla escolha sobre conceitos fundamentais de C# para iniciantes (variáveis, tipos, Console.WriteLine/ReadLine, if/else, for/while, operadores, listas/arrays básicos). Nível fácil/médio, pra um aluno se autoavaliar sobre a matéria a qualquer momento — sem depender do código específico que ele escreveu hoje. Responda APENAS JSON puro:\n{"questions":[{"q":"...","opts":["A","B","C","D"],"correct":0}]}`,
    DUEL_SYSTEM,
    { temperature: 0.7 }
  );
  const parsed = extractJson(res);
  return shuffleQuestions(parsed.questions || []);
}

// ════════════════════════════════════════════════════════════════════════════
//  🏗️ DESAFIO LIVRE DA SEMANA — o aluno propõe algo que quer construir e o Nyx
//  quebra em passos concretos pra guiar (não deixa solto, sem ajuda)
// ════════════════════════════════════════════════════════════════════════════
async function generateFreeBuildPlan(idea, language) {
  const langLabel = language ? language.label : "C#";
  const res = await askClaudeJson(
    `Um aluno iniciante quer construir isso, por conta própria, como desafio pessoal da semana: "${idea}"\n\nCrie um plano de 4 a 6 passos BEM concretos, curtos e em ordem, pra ele conseguir chegar lá sozinho usando ${langLabel}. Cada passo é uma ação prática (não teoria solta) — tipo "Crie uma variável pra guardar X" ou "Use um for pra repetir Y". Adapte pro nível de quem está começando agora, sem pular etapas. Responda APENAS JSON puro: { "steps": ["...", "..."] }`,
    (language ? language.system : CS_SYSTEM) + "\n\nVocê também ajuda o aluno a PLANEJAR projetos livres, quebrando a ideia dele em passos pequenos e alcançáveis — nunca resolva o projeto inteiro por ele, só mostre o caminho.",
    { temperature: 0.6, max_tokens: 1200 }
  );
  return Array.isArray(res.steps) ? res.steps.slice(0, 6) : [];
}

function FreeBuildModal({ weeklyChallenge, onSave, onToggleStep, onFinish, language, onClose }) {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const askNyx = async () => {
    const clean = idea.trim();
    if (clean.length < 6) { setErr("Descreva sua ideia com um pouco mais de detalhe."); return; }
    setLoading(true); setErr("");
    try {
      const steps = await generateFreeBuildPlan(clean, language);
      if (!steps.length) throw new Error("sem passos");
      await onSave({ weekKey: weekKey(), idea: clean, steps, doneSteps: [], status: "building", createdAt: Date.now() });
    } catch { setErr("Não consegui montar o plano agora. Tente de novo em instantes."); }
    setLoading(false);
  };

  const current = weeklyChallenge && weeklyChallenge.weekKey === weekKey() ? weeklyChallenge : null;
  const allDone = current && current.steps.length > 0 && current.doneSteps.length === current.steps.length;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:520, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#34d399,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🏗️ Desafio Livre da Semana</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        {!current && (
          <>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>O que você quer construir essa semana? Pode ser qualquer ideia — um joguinho, uma calculadora, o que quiser. O Nyx te ajuda a planejar como chegar lá, passo a passo.</p>
            <textarea value={idea} onChange={e=>setIdea(e.target.value)} placeholder="Ex: um jogo de forca simples no terminal"
              style={{ width:"100%", minHeight:70, background:"#171026", border:"2px solid #3b2a58", borderRadius:10, color:"#f0e9fb", padding:10, fontSize:14, boxSizing:"border-box", resize:"vertical" }} />
            {err && <p style={{ color:"#f87171", fontSize:12.5, marginTop:8 }}>{err}</p>}
            <button onClick={askNyx} disabled={loading} style={{ background:"linear-gradient(135deg,#34d399,#22d3ee)", color:"#052014", border:"none", borderRadius:10, padding:"10px 18px", cursor:loading?"default":"pointer", fontWeight:800, fontSize:14, width:"100%", marginTop:12, opacity:loading?0.6:1 }}>
              {loading ? "🤔 Nyx está planejando..." : "🤖 Pedir ajuda ao Nyx pra planejar"}
            </button>
          </>
        )}

        {current && (
          <>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 4px" }}>Seu desafio desta semana:</p>
            <p style={{ color:"#f0e9fb", fontWeight:800, fontSize:15, margin:"0 0 14px" }}>{current.idea}</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {current.steps.map((step, i) => {
                const done = current.doneSteps.includes(i);
                return (
                  <button key={i} onClick={()=>onToggleStep(i)} style={{ display:"flex", alignItems:"flex-start", gap:10, background: done ? "#34d39918" : "#171026", border:`2px solid ${done?"#34d399":"#3b2a58"}`, borderRadius:12, padding:"10px 12px", cursor:"pointer", textAlign:"left" }}>
                    <span style={{ fontSize:17, lineHeight:1, marginTop:1 }}>{done ? "✅" : "⬜"}</span>
                    <span style={{ color: done ? "#a7f3d0" : "#f0e9fb", fontSize:13.5, textDecoration: done ? "line-through" : "none" }}>{step}</span>
                  </button>
                );
              })}
            </div>
            <p style={{ color:"#776798", fontSize:11.5, marginTop:12 }}>Ficou com dúvida em algum passo? Pergunta pro Nyx no chat 💬 — ele te ajuda sem fazer por você.</p>
            {allDone && (
              <button onClick={onFinish} style={{ background:"linear-gradient(135deg,#c084fc,#9333ea)", color:"#fff", border:"none", borderRadius:10, padding:"11px 18px", cursor:"pointer", fontWeight:800, fontSize:14, width:"100%", marginTop:14 }}>
                🎉 Concluí o desafio!
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DuelModal({ shift, myName, myAvatar, onAward, onWin, onClose }) {
  const [loading, setLoading] = useState(true);
  const [opponents, setOpponents] = useState([]);
  const [duel, setDuelState] = useState(null);
  const [myAnswers, setMyAnswers] = useState({});
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const lastDuelKey = useRef(null);
  const doneAwardedRef = useRef(null);

  const refresh = async () => {
    try {
      const all = await listStudents();
      const online = all.filter(s => (s.shift||"sem-turno")===(shift||"sem-turno") && s.name!==myName && s.lastSeen && (Date.now()-s.lastSeen)<30000);
      setOpponents(online);
    } catch {}
    try {
      const duels = await listDuels(shift);
      const mine = duels.find(d => d.from===myName || d.to===myName) || null;
      setDuelState(mine);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 8000);
    return () => clearInterval(iv);
  }, [shift, myName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const key = duel ? `${duel.from}__${duel.to}__${duel.createdAt}` : null;
    if (key !== lastDuelKey.current) { setMyAnswers({}); lastDuelKey.current = key; }
  }, [duel]);

  // premia quando o duelo vira "done" — roda uma vez por duelo, pros DOIS jogadores (quem enviou
  // primeiro e quem enviou por último) detectarem sozinhos na própria sessão. Antes disso o prêmio
  // só era dado dentro de submitDuelAnswers() na hora que "bothDone" ficava true, o que só
  // acontecia na sessão de quem enviasse a resposta POR ÚLTIMO — o primeiro a responder nunca
  // recebia os pontos do Nyx, mesmo com a tela de resultado mostrando "+X pontos".
  useEffect(() => {
    if (!duel || duel.status !== "done") return;
    const key = `${duel.from}__${duel.to}__${duel.createdAt}`;
    if (doneAwardedRef.current === key) return;
    doneAwardedRef.current = key;
    const iAmChallenger = duel.from === myName;
    const myScore = iAmChallenger ? duel.scoreFrom : duel.scoreTo;
    const oppScore = iAmChallenger ? duel.scoreTo : duel.scoreFrom;
    const isDraw = myScore === oppScore;
    const iWon = myScore > oppScore;
    onAward(isDraw ? 2 : (iWon ? 3 : 1));
    if (iWon) onWin();
  }, [duel?.status, duel?.createdAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const isChallenger = duel && duel.from === myName;
  const opponentName = duel ? (isChallenger ? duel.to : duel.from) : null;
  const opponentAvatar = duel ? (isChallenger ? duel.toAvatar : duel.fromAvatar) : null;

  const challenge = async (opp) => {
    setCreating(true); setErr("");
    try {
      const qs = await generateDuelQuestions();
      if (!qs.length) throw new Error("sem perguntas");
      const doc = { from:myName, to:opp.name, fromAvatar:myAvatar, toAvatar:opp.avatar, questions:qs, status:"invited", answersFrom:{}, answersTo:{}, scoreFrom:null, scoreTo:null, createdAt:Date.now() };
      await setDuel(shift, myName, opp.name, doc);
      setDuelState(doc);
    } catch { setErr("Não consegui criar o duelo agora. Tente de novo em instantes."); }
    setCreating(false);
  };

  const cancelOrDecline = async () => {
    if (!duel) return;
    await clearDuel(shift, duel.from, duel.to);
    setDuelState(null);
  };

  const accept = async () => {
    const updated = { ...duel, status:"active" };
    await setDuel(shift, duel.from, duel.to, updated);
    setDuelState(updated);
  };

  const submitDuelAnswers = async () => {
    const qs = duel.questions || [];
    let pts = 0;
    qs.forEach((q,i) => { if (myAnswers[i]===q.correct) pts++; });
    const field = isChallenger ? "answersFrom" : "answersTo";
    const scoreField = isChallenger ? "scoreFrom" : "scoreTo";
    const latest = (await getDuel(shift, duel.from, duel.to)) || duel;
    const merged = { ...latest, [field]:myAnswers, [scoreField]:pts };
    const bothDone = merged.scoreFrom != null && merged.scoreTo != null;
    if (bothDone) merged.status = "done";
    await setDuel(shift, duel.from, duel.to, merged);
    setDuelState(merged);
    // premiação agora fica só no useEffect (chave: duel.status==="done"), que roda pros dois
    // jogadores igual — inclusive pra este aqui, quando ele for quem completou o duelo por último
  };

  const closeResult = async () => {
    if (duel) await clearDuel(shift, duel.from, duel.to);
    setDuelState(null);
  };

  let view = "list";
  let myScore = null, oppScore = null;
  if (duel) {
    if (duel.status === "invited") view = isChallenger ? "invited" : "incoming";
    else if (duel.status === "active") {
      myScore = isChallenger ? duel.scoreFrom : duel.scoreTo;
      view = myScore != null ? "waiting-result" : "playing";
    } else if (duel.status === "done") {
      myScore = isChallenger ? duel.scoreFrom : duel.scoreTo;
      oppScore = isChallenger ? duel.scoreTo : duel.scoreFrom;
      view = "result";
    }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:520, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#f87171,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>⚔️ Duelo</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        {loading && <p style={{ color:"#776798", fontSize:13 }}>Carregando...</p>}
        {err && <div style={{ background:"#f8717111", border:"1px solid #f87171", borderRadius:10, padding:10, color:"#f87171", fontSize:13, marginBottom:10 }}>{err}</div>}

        {!loading && view === "list" && (
          <>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Desafie um colega online da sua turma para um mini-quiz de 5 perguntas. Quem acertar mais, ganha!</p>
            {opponents.length === 0 ? (
              <p style={{ color:"#776798", fontSize:13 }}>Nenhum colega online agora. Tente de novo daqui a pouco.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {opponents.map(o => (
                  <button key={o.name} disabled={creating} onClick={()=>challenge(o)} style={{ display:"flex", alignItems:"center", gap:10, background:"#171026", border:"2px solid #3b2a58", borderRadius:12, padding:"8px 12px", cursor:"pointer", color:"#f0e9fb", textAlign:"left" }}>
                    <Avatar cfg={o.avatar} size={32} />
                    <span style={{ flex:1, fontWeight:700, fontSize:13.5 }}>{o.name}</span>
                    <span style={{ color:"#f87171", fontWeight:700, fontSize:12.5 }}>{creating?"Criando...":"⚔️ Desafiar"}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {view === "invited" && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <Avatar cfg={opponentAvatar} size={64} />
            <p style={{ color:"#f0e9fb", fontSize:15, fontWeight:700, marginTop:10 }}>Esperando {opponentName} aceitar...</p>
            <button onClick={cancelOrDecline} style={{ background:"#3b2a58", color:"#f0e9fb", border:"none", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:700, fontSize:13, marginTop:10 }}>Cancelar desafio</button>
          </div>
        )}

        {view === "incoming" && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <Avatar cfg={opponentAvatar} size={64} />
            <p style={{ color:"#f0e9fb", fontSize:15, marginTop:10 }}><b>{opponentName}</b> te desafiou para um duelo de 5 perguntas!</p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:14 }}>
              <button onClick={accept} style={{ background:"linear-gradient(135deg,#34d399,#16a34a)", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontWeight:800, fontSize:14 }}>✅ Aceitar</button>
              <button onClick={cancelOrDecline} style={{ background:"#3b2a58", color:"#f0e9fb", border:"none", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontWeight:700, fontSize:14 }}>Recusar</button>
            </div>
          </div>
        )}

        {view === "playing" && (
          <div>
            <p style={{ color:"#a99ac9", fontSize:13, marginBottom:10 }}>Duelo contra <b style={{ color:"#f0e9fb" }}>{opponentName}</b> — responda as 5 perguntas:</p>
            {(duel.questions||[]).map((q,i)=>(
              <div key={i} style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:12, marginBottom:8 }}>
                <p style={{ color:"#f0e9fb", fontWeight:700, fontSize:13.5, marginBottom:8 }}>{i+1}. {q.q}</p>
                {q.opts.map((opt,j)=>(
                  <button key={j} onClick={()=>setMyAnswers(a=>({...a,[i]:j}))}
                    style={{ display:"block", width:"100%", textAlign:"left", background:myAnswers[i]===j?"#c084fc33":"#1a1029", border:`2px solid ${myAnswers[i]===j?"#c084fc":"#3a2a55"}`, borderRadius:8, padding:"8px 12px", marginBottom:6, color:"#f0e9fb", cursor:"pointer", fontSize:13 }}>
                    {opt}
                  </button>
                ))}
              </div>
            ))}
            <button onClick={submitDuelAnswers} disabled={Object.keys(myAnswers).length < (duel.questions||[]).length}
              style={{ background:"linear-gradient(135deg,#f87171,#fbbf24)", color:"#1c1206", border:"none", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontWeight:800, fontSize:14, width:"100%", marginTop:6 }}>
              Enviar respostas ⚔️
            </button>
          </div>
        )}

        {view === "waiting-result" && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:40 }}>⏳</div>
            <p style={{ color:"#f0e9fb", fontSize:15, marginTop:10 }}>Você já respondeu! Esperando <b>{opponentName}</b> terminar...</p>
          </div>
        )}

        {view === "result" && (
          <div style={{ textAlign:"center", padding:"10px 0" }}>
            <div style={{ fontSize:48 }}>{myScore > oppScore ? "🏆" : myScore === oppScore ? "🤝" : "💪"}</div>
            <h3 style={{ color: myScore > oppScore ? "#34d399" : myScore === oppScore ? "#fbbf24" : "#f87171", fontSize:20, margin:"6px 0" }}>
              {myScore > oppScore ? "Você venceu!" : myScore === oppScore ? "Empate!" : "Você perdeu dessa vez"}
            </h3>
            <p style={{ color:"#a99ac9", fontSize:14 }}>Você: {myScore}/5 · {opponentName}: {oppScore}/5</p>
            <p style={{ color:"#fbbf24", fontSize:13, marginTop:6 }}>+{myScore===oppScore?2:(myScore>oppScore?3:1)} pontos do Nyx</p>
            <button onClick={closeResult} style={{ background:"linear-gradient(135deg,#c084fc,#9333ea)", color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontWeight:800, fontSize:14, width:"100%", marginTop:14 }}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ⚔️🤝 duelo em dupla (2x2): mesmo espírito do duelo 1x1 — mini-quiz de 5 perguntas — só que
// agora em times de 2. O time A soma os acertos dos 2 jogadores contra o time B; quem somar mais
// vence. Convite único pros outros 3 jogadores; cada um aceita/recusa por conta própria e o
// confronto só começa quando todo mundo (menos quem convidou) já aceitou.
function TeamDuelModal({ shift, myName, myAvatar, onAward, onWin, onClose }) {
  const [loading, setLoading] = useState(true);
  const [opponents, setOpponents] = useState([]);
  const [teamDuel, setTeamDuelState] = useState(null);
  const [selPartner, setSelPartner] = useState(null);
  const [selRivals, setSelRivals] = useState([]);
  const [myAnswers, setMyAnswers] = useState({});
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const lastKeyRef = useRef(null);
  const doneAwardedRef = useRef(null);

  const refresh = async () => {
    try {
      const all = await listStudents();
      const online = all.filter(s => (s.shift||"sem-turno")===(shift||"sem-turno") && s.name!==myName && s.lastSeen && (Date.now()-s.lastSeen)<30000);
      setOpponents(online);
    } catch {}
    try {
      const all = await listTeamDuels(shift);
      const mine = all.find(d => (d.players||[]).some(p=>p.name===myName)) || null;
      setTeamDuelState(mine);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 8000);
    return () => clearInterval(iv);
  }, [shift, myName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const key = teamDuel ? teamDuel.players.map(p=>p.name).sort().join("_") + "_" + teamDuel.createdAt : null;
    if (key !== lastKeyRef.current) { setMyAnswers({}); lastKeyRef.current = key; }
  }, [teamDuel]);

  // premia quando o confronto vira "done" — roda uma vez por confronto, pra cada um dos 4 jogadores
  // detectar sozinho na própria sessão (não só quem enviou a última resposta)
  useEffect(() => {
    if (!teamDuel || teamDuel.status !== "done") return;
    const key = teamDuel.players.map(p=>p.name).sort().join("_") + "_" + teamDuel.createdAt;
    if (doneAwardedRef.current === key) return;
    doneAwardedRef.current = key;
    const myTeam = teamDuel.players.find(p=>p.name===myName)?.team;
    if (!myTeam) return;
    const teamTotal = (t) => teamDuel.players.filter(p=>p.team===t).reduce((s,p)=>s+(teamDuel.scores[p.name]||0), 0);
    const myTotal = teamTotal(myTeam);
    const rivalTotal = teamTotal(myTeam==="A" ? "B" : "A");
    const isDraw = myTotal === rivalTotal;
    const weWon = myTotal > rivalTotal;
    onAward(isDraw ? 2 : (weWon ? 3 : 1));
    if (weWon) onWin();
  }, [teamDuel?.status, teamDuel?.createdAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleName = (o) => {
    if (selPartner === o.name) { setSelPartner(null); return; }
    if (selRivals.includes(o.name)) { setSelRivals(r => r.filter(n=>n!==o.name)); return; }
    if (!selPartner) { setSelPartner(o.name); return; }
    if (selRivals.length < 2) { setSelRivals(r => [...r, o.name]); return; }
  };

  const challenge = async () => {
    const partnerObj = opponents.find(o=>o.name===selPartner);
    const rivalObjs = selRivals.map(n=>opponents.find(o=>o.name===n)).filter(Boolean);
    if (!partnerObj || rivalObjs.length !== 2) return;
    setCreating(true); setErr("");
    try {
      const qs = await generateDuelQuestions();
      if (!qs.length) throw new Error("sem perguntas");
      const players = [
        { name: myName, avatar: myAvatar, team: "A" },
        { name: partnerObj.name, avatar: partnerObj.avatar, team: "A" },
        { name: rivalObjs[0].name, avatar: rivalObjs[0].avatar, team: "B" },
        { name: rivalObjs[1].name, avatar: rivalObjs[1].avatar, team: "B" },
      ];
      const doc = { from: myName, players, status: "invited", accepted: { [myName]: true }, questions: qs, answers: {}, scores: {}, createdAt: Date.now() };
      await setTeamDuel(shift, players.map(p=>p.name), doc);
      setTeamDuelState(doc);
      setSelPartner(null); setSelRivals([]);
    } catch { setErr("Não consegui criar o duelo em dupla agora. Tente de novo em instantes."); }
    setCreating(false);
  };

  const cancelOrDecline = async () => {
    if (!teamDuel) return;
    await clearTeamDuel(shift, teamDuel.players.map(p=>p.name));
    setTeamDuelState(null);
  };

  const accept = async () => {
    const latest = (await getTeamDuel(shift, teamDuel.players.map(p=>p.name))) || teamDuel;
    const accepted = { ...latest.accepted, [myName]: true };
    const others = latest.players.filter(p=>p.name!==latest.from).map(p=>p.name);
    const allAccepted = others.every(n => accepted[n]);
    const updated = { ...latest, accepted, status: allAccepted ? "active" : latest.status };
    await setTeamDuel(shift, updated.players.map(p=>p.name), updated);
    setTeamDuelState(updated);
  };

  const submitAnswers = async () => {
    const qs = teamDuel.questions || [];
    let pts = 0;
    qs.forEach((q,i) => { if (myAnswers[i]===q.correct) pts++; });
    const latest = (await getTeamDuel(shift, teamDuel.players.map(p=>p.name))) || teamDuel;
    const scores = { ...latest.scores, [myName]: pts };
    const answers = { ...latest.answers, [myName]: myAnswers };
    const allDone = latest.players.every(p => scores[p.name] != null);
    const merged = { ...latest, scores, answers, status: allDone ? "done" : latest.status };
    await setTeamDuel(shift, merged.players.map(p=>p.name), merged);
    setTeamDuelState(merged);
  };

  const closeResult = async () => {
    if (teamDuel) await clearTeamDuel(shift, teamDuel.players.map(p=>p.name));
    setTeamDuelState(null);
  };

  const myPlayer = teamDuel?.players.find(p=>p.name===myName);
  const myTeam = myPlayer?.team;
  const teammate = teamDuel?.players.find(p=>p.team===myTeam && p.name!==myName);
  const rivals = teamDuel ? teamDuel.players.filter(p=>p.team!==myTeam) : [];
  const amInitiator = teamDuel?.from === myName;

  let view = "list";
  let myTeamTotal = null, rivalTeamTotal = null;
  if (teamDuel) {
    if (teamDuel.status === "invited") view = (amInitiator || teamDuel.accepted[myName]) ? "invited-wait" : "incoming";
    else if (teamDuel.status === "active") view = teamDuel.scores[myName] != null ? "waiting-result" : "playing";
    else if (teamDuel.status === "done") {
      const teamTotal = (t) => teamDuel.players.filter(p=>p.team===t).reduce((s,p)=>s+(teamDuel.scores[p.name]||0), 0);
      myTeamTotal = teamTotal(myTeam);
      rivalTeamTotal = teamTotal(myTeam==="A" ? "B" : "A");
      view = "result";
    }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:540, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#f87171,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🤝⚔️ Duelo em Dupla</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        {loading && <p style={{ color:"#776798", fontSize:13 }}>Carregando...</p>}
        {err && <div style={{ background:"#f8717111", border:"1px solid #f87171", borderRadius:10, padding:10, color:"#f87171", fontSize:13, marginBottom:10 }}>{err}</div>}

        {!loading && view === "list" && (
          <>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Escolha <b style={{ color:"#f0e9fb" }}>1 parceiro</b> e <b style={{ color:"#f0e9fb" }}>2 rivais</b> online — 5 perguntas, os pontos das duplas somam e quem tiver mais, vence!</p>
            {opponents.length < 3 ? (
              <p style={{ color:"#776798", fontSize:13 }}>Precisa de pelo menos 3 colegas online pra montar um 2x2. Tente de novo daqui a pouco.</p>
            ) : (
              <>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                  {opponents.map(o => {
                    const role = selPartner===o.name ? "🤝 Parceiro" : selRivals.includes(o.name) ? `⚔️ Rival ${selRivals.indexOf(o.name)+1}` : null;
                    return (
                      <button key={o.name} onClick={()=>toggleName(o)} style={{ display:"flex", alignItems:"center", gap:10, background: role ? (role.includes("Parceiro")?"#34d39922":"#f8717122") : "#171026", border:`2px solid ${role ? (role.includes("Parceiro")?"#34d399":"#f87171") : "#3b2a58"}`, borderRadius:12, padding:"8px 12px", cursor:"pointer", color:"#f0e9fb", textAlign:"left" }}>
                        <Avatar cfg={o.avatar} size={32} />
                        <span style={{ flex:1, fontWeight:700, fontSize:13.5 }}>{o.name}</span>
                        {role && <span style={{ fontWeight:800, fontSize:12, color: role.includes("Parceiro")?"#34d399":"#f87171" }}>{role}</span>}
                      </button>
                    );
                  })}
                </div>
                <button onClick={challenge} disabled={creating || !selPartner || selRivals.length!==2}
                  style={{ background:"linear-gradient(135deg,#f87171,#fbbf24)", color:"#1c1206", border:"none", borderRadius:10, padding:"10px 18px", cursor:(!selPartner||selRivals.length!==2)?"not-allowed":"pointer", fontWeight:800, fontSize:14, width:"100%", opacity:(!selPartner||selRivals.length!==2)?0.5:1 }}>
                  {creating ? "Criando..." : "⚔️ Desafiar dupla"}
                </button>
              </>
            )}
          </>
        )}

        {view === "invited-wait" && (
          <div style={{ textAlign:"center", padding:"14px 0" }}>
            <p style={{ color:"#f0e9fb", fontSize:14, fontWeight:700, marginBottom:12 }}>Esperando todo mundo aceitar...</p>
            <div style={{ display:"flex", justifyContent:"center", gap:18, flexWrap:"wrap" }}>
              {teamDuel.players.filter(p=>p.name!==myName).map(p => (
                <div key={p.name} style={{ textAlign:"center" }}>
                  <Avatar cfg={p.avatar} size={48} />
                  <p style={{ color:"#f0e9fb", fontSize:12, fontWeight:700, margin:"6px 0 2px" }}>{p.name}</p>
                  <span style={{ fontSize:11, color: teamDuel.accepted[p.name] ? "#34d399" : "#776798", fontWeight:700 }}>{teamDuel.accepted[p.name] ? "✅ Aceitou" : "⏳ Esperando"}</span>
                </div>
              ))}
            </div>
            <button onClick={cancelOrDecline} style={{ background:"#3b2a58", color:"#f0e9fb", border:"none", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:700, fontSize:13, marginTop:16 }}>Cancelar</button>
          </div>
        )}

        {view === "incoming" && (
          <div style={{ textAlign:"center", padding:"14px 0" }}>
            <p style={{ color:"#f0e9fb", fontSize:15, marginBottom:14 }}><b>{teamDuel.from}</b> te chamou pra um duelo em dupla!</p>
            <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:14, flexWrap:"wrap" }}>
              <div>
                <p style={{ color:"#34d399", fontSize:11.5, fontWeight:800, marginBottom:6 }}>SUA DUPLA</p>
                <div style={{ display:"flex", gap:10 }}>
                  {teamDuel.players.filter(p=>p.team===myTeam).map(p => (
                    <div key={p.name} style={{ textAlign:"center" }}><Avatar cfg={p.avatar} size={44} /><p style={{ color:"#f0e9fb", fontSize:11.5, margin:"4px 0 0" }}>{p.name}</p></div>
                  ))}
                </div>
              </div>
              <span style={{ color:"#776798", fontWeight:900, fontSize:16 }}>VS</span>
              <div>
                <p style={{ color:"#f87171", fontSize:11.5, fontWeight:800, marginBottom:6 }}>DUPLA RIVAL</p>
                <div style={{ display:"flex", gap:10 }}>
                  {rivals.map(p => (
                    <div key={p.name} style={{ textAlign:"center" }}><Avatar cfg={p.avatar} size={44} /><p style={{ color:"#f0e9fb", fontSize:11.5, margin:"4px 0 0" }}>{p.name}</p></div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:16 }}>
              <button onClick={accept} style={{ background:"linear-gradient(135deg,#34d399,#16a34a)", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontWeight:800, fontSize:14 }}>✅ Aceitar</button>
              <button onClick={cancelOrDecline} style={{ background:"#3b2a58", color:"#f0e9fb", border:"none", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontWeight:700, fontSize:14 }}>Recusar</button>
            </div>
          </div>
        )}

        {view === "playing" && (
          <div>
            <p style={{ color:"#a99ac9", fontSize:13, marginBottom:10 }}>Você + <b style={{ color:"#34d399" }}>{teammate?.name}</b> contra <b style={{ color:"#f87171" }}>{rivals.map(r=>r.name).join(" + ")}</b> — responda as 5 perguntas:</p>
            {(teamDuel.questions||[]).map((q,i)=>(
              <div key={i} style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:12, marginBottom:8 }}>
                <p style={{ color:"#f0e9fb", fontWeight:700, fontSize:13.5, marginBottom:8 }}>{i+1}. {q.q}</p>
                {q.opts.map((opt,j)=>(
                  <button key={j} onClick={()=>setMyAnswers(a=>({...a,[i]:j}))}
                    style={{ display:"block", width:"100%", textAlign:"left", background:myAnswers[i]===j?"#c084fc33":"#1a1029", border:`2px solid ${myAnswers[i]===j?"#c084fc":"#3a2a55"}`, borderRadius:8, padding:"8px 12px", marginBottom:6, color:"#f0e9fb", cursor:"pointer", fontSize:13 }}>
                    {opt}
                  </button>
                ))}
              </div>
            ))}
            <button onClick={submitAnswers} disabled={Object.keys(myAnswers).length < (teamDuel.questions||[]).length}
              style={{ background:"linear-gradient(135deg,#f87171,#fbbf24)", color:"#1c1206", border:"none", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontWeight:800, fontSize:14, width:"100%", marginTop:6 }}>
              Enviar respostas ⚔️
            </button>
          </div>
        )}

        {view === "waiting-result" && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:40 }}>⏳</div>
            <p style={{ color:"#f0e9fb", fontSize:15, marginTop:10 }}>Você já respondeu! Esperando o resto da galera terminar...</p>
          </div>
        )}

        {view === "result" && (
          <div style={{ textAlign:"center", padding:"10px 0" }}>
            <div style={{ fontSize:48 }}>{myTeamTotal > rivalTeamTotal ? "🏆" : myTeamTotal === rivalTeamTotal ? "🤝" : "💪"}</div>
            <h3 style={{ color: myTeamTotal > rivalTeamTotal ? "#34d399" : myTeamTotal === rivalTeamTotal ? "#fbbf24" : "#f87171", fontSize:20, margin:"6px 0" }}>
              {myTeamTotal > rivalTeamTotal ? "Sua dupla venceu!" : myTeamTotal === rivalTeamTotal ? "Empate!" : "Perderam dessa vez"}
            </h3>
            <p style={{ color:"#a99ac9", fontSize:14 }}>Você + {teammate?.name}: {myTeamTotal}/10 · {rivals.map(r=>r.name).join(" + ")}: {rivalTeamTotal}/10</p>
            <p style={{ color:"#fbbf24", fontSize:13, marginTop:6 }}>+{myTeamTotal===rivalTeamTotal?2:(myTeamTotal>rivalTeamTotal?3:1)} pontos do Nyx</p>
            <button onClick={closeResult} style={{ background:"linear-gradient(135deg,#c084fc,#9333ea)", color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontWeight:800, fontSize:14, width:"100%", marginTop:14 }}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 🧠 teste de conhecimento por conta própria — o aluno pode se autoavaliar a qualquer momento da
// aula, sem esperar a atividade oficial (que só libera depois de finalizar) e sem nenhuma dica: só
// gera as perguntas, ele responde, e vê o resultado na hora. Não mexe na fase da aula nem na nota oficial
function KnowledgeTestModal({ onAward, onFirstToday, onClose }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  // clicar "Enviar respostas" 2x bem rápido (antes do "done" virar true no re-render) chamava
  // submit() de novo e disparava onAward()/onFirstToday() duas vezes — ref é atualizada na hora
  // (não espera re-render), então a segunda chamada síncrona já vê o bloqueio
  const submittedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const qs = await generateKnowledgeTestQuestions();
        if (!qs.length) throw new Error("sem perguntas");
        setQuestions(qs);
      } catch { setErr("Não consegui gerar o teste agora. Tente de novo em instantes."); }
      setLoading(false);
    })();
  }, []);

  const pick = (qi, oi) => { if (!done) setAnswers(a => ({ ...a, [qi]: oi })); };
  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i] != null);

  const submit = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    setScore(correct);
    setDone(true);
    const firstToday = onFirstToday();
    if (firstToday && correct > 0) await onAward(correct * 2);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:560, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#818cf8,#6366f1)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🧠 Testar Conhecimento</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        {!done && <p style={{ color:"#a99ac9", fontSize:12.5, margin:"0 0 14px" }}>Sem dicas, pra valer mesmo — é só pra você se autoavaliar. Pode fazer quando quiser, sem precisar finalizar a aula.</p>}

        {loading && <p style={{ color:"#a99ac9", fontSize:14 }}>🤔 Gerando as perguntas...</p>}
        {err && <p style={{ color:"#f87171", fontSize:13 }}>{err}</p>}

        {!loading && !err && !done && questions.map((q, i) => (
          <div key={i} data-q={i} className="cardfx" style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:14, marginBottom:10, padding:14 }}>
            <p style={{ fontWeight:700, margin:"0 0 10px", fontSize:14 }}>{i+1}. {q.q}</p>
            {q.opts.map((opt, j) => (
              <button key={j} data-opt={j} onClick={()=>pick(i,j)} style={{ display:"block", width:"100%", background:answers[i]===j?"#6366f133":"#171026", border:`2px solid ${answers[i]===j?"#6366f1":"#3b2a58"}`, borderRadius:10, padding:"10px 14px", color:"#f0e9fb", textAlign:"left", cursor:"pointer", marginBottom:6, fontSize:13 }}>
                <span style={{ color:"#818cf8", fontWeight:700, marginRight:8 }}>{["A","B","C","D"][j]}.</span>{opt}
              </button>
            ))}
          </div>
        ))}

        {!loading && !err && !done && questions.length > 0 && (
          <button onClick={submit} disabled={!allAnswered} style={{ background:"#6366f1", border:"none", borderRadius:12, color:"#fff", fontWeight:800, cursor:allAnswered?"pointer":"not-allowed", width:"100%", padding:"12px 0", fontSize:14, opacity:allAnswered?1:0.5, marginTop:6 }}>
            {allAnswered ? "Enviar respostas →" : "Responda tudo pra enviar"}
          </button>
        )}

        {done && (
          <div style={{ textAlign:"center", padding:"10px 0" }}>
            <div style={{ fontSize:44 }}>{score===questions.length ? "🏆" : score >= questions.length/2 ? "👍" : "📚"}</div>
            <h3 style={{ color:"#f0e9fb", margin:"8px 0 4px" }}>Você acertou {score} de {questions.length}</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:16, textAlign:"left" }}>
              {questions.map((q, i) => {
                const ok = answers[i] === q.correct;
                return (
                  <div key={i} style={{ background: ok ? "#34d39918" : "#f8717118", border:`1px solid ${ok?"#34d399":"#f87171"}`, borderRadius:10, padding:"10px 12px" }}>
                    <p style={{ margin:"0 0 4px", fontSize:12.5, color:"#f0e9fb", fontWeight:700 }}>{ok?"✅":"❌"} {q.q}</p>
                    <p style={{ margin:0, fontSize:12, color:"#a99ac9" }}>Certa: {q.opts[q.correct]}</p>
                  </div>
                );
              })}
            </div>
            <button onClick={onClose} style={{ background:"#6366f1", border:"none", borderRadius:12, color:"#fff", fontWeight:800, cursor:"pointer", width:"100%", padding:"11px 0", fontSize:14, marginTop:16 }}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
}




// ════════════════════════════════════════════════════════════════════════════
//  ALUNO
// ════════════════════════════════════════════════════════════════════════════
function StudentView({ studentName, initialAvatar, shift, onLogout, isNew, initialBirthDate, initialCpf }) {
  const vw = useViewportWidth();
  // 🎛️ preferência de como o Nyx interage/explica — perguntada só pra perfil novo, antes até da
  // apresentação do Nyx e do tour, porque cada aluno (mais novo ou mais velho) prefere de um jeito
  const [showNyxPrefs, setShowNyxPrefs] = useState(!!isNew);
  const [nyxPrefs, setNyxPrefs] = useState({ tom:"divertido", estilo:"detalhada" });
  // 🎓 dado sensível pro certificado (data de nascimento/CPF) — só pego uma vez, na criação do perfil,
  // NUNCA exibido em nenhuma tela do aluno depois disso; só o professor vê isso, e só na planilha.
  // Pra quem já tinha perfil (isNew=false), é recarregado do servidor (ver profile-load effect) —
  // sem isso, salvar de novo apagaria o dado já cadastrado.
  const [birthDate, setBirthDate] = useState(isNew ? (initialBirthDate || "") : "");
  const [cpf, setCpf] = useState(isNew ? (initialCpf || "") : "");
  const [showIntro, setShowIntro] = useState(!!isNew);
  // 🌐 sala de linguagens (extra, fora da turma de C#): qual linguagem este aluno escolheu estudar
  // (HTML/CSS/PHP/JS) — null pra qualquer aluno da turma normal, que continua sendo sempre C#
  const isLangRoom = shift === LANG_SHIFT.id;
  const [programmingLanguage, setProgrammingLanguage] = useState(null);
  const [showLangPicker, setShowLangPicker] = useState(false);
  // histórico de linguagens já estudadas (código + resumos arquivados ao trocar de linguagem)
  const [languageHistory, setLanguageHistory] = useState([]);
  const studyLang = isLangRoom ? langById(programmingLanguage) : null;
  const [files, setFiles] = useState([{ name:"Program.cs", code:"" }]);
  const [active, setActive] = useState(0);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [avatar, setAvatar] = useState(initialAvatar || DEFAULT_AVATAR);
  const [feedback, setFeedback] = useState(null);
  const [robotState, setRobotState] = useState("idle");
  const [robotMsg, setRobotMsg] = useState("");
  const [keysToShow, setKeysToShow] = useState([]);
  const [phase, setPhase] = useState("coding");
  const [answers, setAnswers] = useState({});
  const [revealedHints, setRevealedHints] = useState({}); // 💡 dicas da dificuldade adaptativa que o aluno já abriu, por questão
  const [score, setScore] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const lastProviderRef = useRef("nvidia"); // lembra o último modelo escolhido, pra reverificação automática usar o mesmo
  // 🔌 modo offline total: quando a análise ou o "Salvar e Finalizar" não rolam por falta de
  // internet (não uma simples instabilidade), fica marcado aqui pra tentar de novo sozinho assim
  // que a conexão voltar — o aluno não precisa ficar clicando até funcionar
  const pendingAnalyzeRef = useRef(false);
  const pendingSaveRef = useRef(false);
  // erros da última análise (linha sublinhada de vermelho até corrigir) + tour do Nyx explicando cada um
  const [codeErrors, setCodeErrors] = useState([]);
  const [showErrorWalkthrough, setShowErrorWalkthrough] = useState(false);
  const [errorWalkStep, setErrorWalkStep] = useState(0);
  const [dynamicSummary, setDynamicSummary] = useState("");
  const [dynamicActivity, setDynamicActivity] = useState(null);
  const [generatingMsg, setGeneratingMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(null);
  const [justReconnected, setJustReconnected] = useState(false);
  const prevConnectedRef = useRef(null);
  const [finalFeedback, setFinalFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [saveWarn, setSaveWarn] = useState("");
  // tema do fundo: 'dark' | 'light' | cor hex escolhida pelo Nyx
  const [theme, setTheme] = useState("dark");
  // tema de antes de virar Espartano (pra poder voltar) + se já achou o baú do tesouro escondido
  const [themeBeforeSpartan, setThemeBeforeSpartan] = useState(null);
  const [treasureFound, setTreasureFound] = useState(false);
  const [spartanIntroShown, setSpartanIntroShown] = useState(false);
  // tour guiado do Nyx
  const [tourStep, setTourStep] = useState(-1);
  // 🔥 aquecimento do dia: 3 perguntinhas de revisão sobre a aula ANTERIOR, logo que o aluno entra
  const [warmup, setWarmup] = useState(null);           // { questions:[{pergunta, alternativas, correta, explicacao}] }
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [warmupStep, setWarmupStep] = useState(0);
  const [warmupPicked, setWarmupPicked] = useState(null);
  const [warmupCorrect, setWarmupCorrect] = useState(0);
  const [warmupDay, setWarmupDay] = useState(null);     // último dia em que o aquecimento foi concluído (persistido)
  const warmupRequestedRef = useRef(false);
  // 🎁 retrospectiva do mês (estilo "Wrapped"): o professor libera por turno; cada aluno vê a sua uma vez
  const [retroActive, setRetroActive] = useState(null); // id/data da liberação atual do professor (ou null)
  const [retroSeen, setRetroSeen] = useState(null);     // id da última retrospectiva que ESTE aluno já viu (persistido)
  const [showRetro, setShowRetro] = useState(false);
  // 🏟️ torneio da turma (iniciado pelo professor no telão): o aluno responde o quiz da rodada aqui
  // 🎉 quiz estilo Kahoot: sala aberta pelo professor (polling) + minha participação nela
  const [quizRoomInfo, setQuizRoomInfo] = useState(null); // sala ativa lida do servidor (ou null)
  const [quizJoin, setQuizJoin] = useState(null);         // { code, at } quando entrei numa sala (persistido)
  const [quizAnswers, setQuizAnswers] = useState({});     // { qIndex: { opt, at } } (persistido — o professor apura)
  const [showQuizJoin, setShowQuizJoin] = useState(false);
  const [quizCodeInput, setQuizCodeInput] = useState("");
  const [quizCodeError, setQuizCodeError] = useState("");
  const [tourneyInfo, setTourneyInfo] = useState(null);   // estado do torneio lido do servidor
  const [tourneyQuiz, setTourneyQuiz] = useState(null);   // { id, round, opponent, questions[] } do quiz aberto
  const [tourneyStep, setTourneyStep] = useState(0);
  const [tourneyPicked, setTourneyPicked] = useState(null);
  const [tourneyCorrect, setTourneyCorrect] = useState(0);
  const [tourneyAnswer, setTourneyAnswer] = useState(null);   // { id, round, score, at } (persistido — o telão apura)
  const [tourneyClaimed, setTourneyClaimed] = useState(null); // id do torneio cujo prêmio de campeão já foi recebido
  // explicações do Nyx sobre os erros da atividade (passo a passo, num modal)
  const [errorSections, setErrorSections] = useState([]);
  const [errorEncouragement, setErrorEncouragement] = useState("");
  const [showErrorExplain, setShowErrorExplain] = useState(false);
  const [explainFailMsg, setExplainFailMsg] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [fsMsg, setFsMsg] = useState("");
  // avaliação da aula (aluno → professor)
  const [classRating, setClassRating] = useState(0);
  const [classText, setClassText] = useState("");
  const [classSent, setClassSent] = useState(false);
  const [classFb, setClassFb] = useState(null);
  // aviso do professor + dica automática de "preste atenção"
  const [nudge, setNudge2] = useState(null);
  const [nudgeSeenAt, setNudgeSeenAt] = useState(0);
  const [idleHint, setIdleHint] = useState(false);
  // prova (exame)
  const [examInfo, setExamInfo] = useState({ status: 'idle' });
  const [examReady, setExamReady] = useState(false);
  const [examScore, setExamScore] = useState(null);
  const [examAnswers, setExamAnswers] = useState({});
  const [examDone, setExamDone] = useState(false);
  const [examCurrentQ, setExamCurrentQ] = useState(0);
  // anti-cola: saídas da aba durante a prova (cada uma desconta 10 pts) + defesa do aluno no fim
  const [examExits, setExamExits] = useState(0);
  const [examScoreRaw, setExamScoreRaw] = useState(null);
  const [examAppeal, setExamAppeal] = useState(null);
  // aluno já viu a tela de nota da prova e voltou pra plataforma (não mexe em examDone)
  const [examScoreSeen, setExamScoreSeen] = useState(false);
  // alunos do Modo Guiado escolhem se querem fazer a prova ou continuar no Modo Guiado —
  // null = ainda não escolheu, true = vai fazer, false = prefere não fazer
  const [examOptIn, setExamOptIn] = useState(null);
  // quem é do Modo Guiado e topou participar faz uma versão bem mais simples, sobre os próprios
  // blocos do Modo Guiado — é só participação, NÃO vira nota oficial (não entra no boletim/ranking)
  const [examGuidedMode, setExamGuidedMode] = useState(false);
  const [examGuidedQuestions, setExamGuidedQuestions] = useState(null);
  const [examGuidedAnswers, setExamGuidedAnswers] = useState({});
  const [examGuidedCurrentQ, setExamGuidedCurrentQ] = useState(0);
  const [examGuidedCorrect, setExamGuidedCorrect] = useState(0);
  // ✋ pedir ajuda: acende o tile do aluno no monitoramento do professor
  const [helpAt, setHelpAt] = useState(null);
  // 🙋 pedir um parceiro de código sozinho (sem esperar o professor notar) — o professor ainda faz
  // o pareamento de verdade (não deixa aluno escolher/parear direto com outro, por segurança)
  const [wantsPartner, setWantsPartner] = useState(null);
  // 🤝 parceiro de código: pareamento sugerido/aprovado pelo professor entre um aluno com dificuldade
  // (ajudado) e um colega livre (ajudante). partnerHelped = registro em que EU sou o ajudado;
  // partnerHelping = registro em que EU fui escalado pra ajudar um colega (vejo o código dele, só leitura)
  const [partnerHelped, setPartnerHelped] = useState(null);
  const [partnerHelping, setPartnerHelping] = useState(null);
  const [partnerToast, setPartnerToast] = useState("");
  const [showPartnerHelp, setShowPartnerHelp] = useState(false);
  const [partnerPeerCode, setPartnerPeerCode] = useState(null);
  const [partnerViewActive, setPartnerViewActive] = useState(0);
  const partnerResolvedSeenRef = useRef(false);
  // 👾 chefão da turma ativo (evento do telão) — aqui só aparece o aviso motivador
  const [bossInfo, setBossInfo] = useState(null);
  // 🕐 horário automático de aula (do turno) + vistoria (libera este aluno específico fora do horário)
  const [mySchedule, setMySchedule] = useState({});
  const [myAllowWeekend, setMyAllowWeekend] = useState(false);
  const [myInspection, setMyInspection] = useState(false);
  const [myClassDays, setMyClassDays] = useState([]);
  const [myContentNames, setMyContentNames] = useState({});
  const [streakCount, setStreakCount] = useState(0);
  const [showPerformance, setShowPerformance] = useState(false);
  // ⚠️ erro em produção: avisa o professor sem o aluno precisar reclamar (espelha o pedido de ajuda)
  const [errorAt, setErrorAt] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const lastErrorReportRef = useRef(0);
  // evita que dois ticks (12s cada) processem o código enviado pelo professor ao mesmo tempo
  // enquanto a mesclagem por IA do tick anterior ainda está em andamento
  const codeSendHandledRef = useRef(false);
  // 📋 retomada da aula passada (dispensável; lembrada por dia no navegador, por ALUNO — o
  // notebook da carreta é compartilhado entre vários alunos no mesmo dia, então a chave não pode
  // valer só pra data, senão o primeiro que dispensar esconde o aviso dos próximos também)
  const [recapDismissed, setRecapDismissed] = useState(() => {
    try { return localStorage.getItem(`nyx_recap_${todayKey()}_${shift}_${studentName}`) === "1"; } catch { return false; }
  });
  // 😊 check-in emocional: mesmo esquema de dispensa por dia+turno+aluno dos outros avisos (notebook
  // compartilhado entre vários alunos no mesmo dia)
  const [checkinDismissed, setCheckinDismissed] = useState(() => {
    try { return localStorage.getItem(`nyx_checkin_${todayKey()}_${shift}_${studentName}`) === "1"; } catch { return false; }
  });
  const dismissCheckin = () => { setCheckinDismissed(true); try { localStorage.setItem(`nyx_checkin_${todayKey()}_${shift}_${studentName}`, "1"); } catch {} };
  const [breakEndMsg, setBreakEndMsg] = useState("");
  const breakEndNotifiedRef = useRef(null);
  const breakStartNotifiedRef = useRef(null);
  // 📋 falta a justificar + horário do 1º acesso do dia (pra marcar atrasado na chamada)
  const [justifications, setJustifications] = useState({});
  const attendanceFirstRef = useRef({});
  const createdAtRef = useRef(Date.now());
  const [showJustify, setShowJustify] = useState(false);
  // ⌨️ tutorial de teclado (ABNT2): sempre disponível + pode ser "empurrado" pelo professor
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardDone, setKeyboardDone] = useState(false);
  const kbLaunchSeenRef = useRef(null);
  // 🌟 portfólio público: opt-in do próprio aluno — gera um link (sem dados sensíveis) pra
  // compartilhar avatar/conquistas/progresso com a família; o professor pode desativar se precisar
  const [portfolioPublic, setPortfolioPublic] = useState(false);
  const [portfolioCopyMsg, setPortfolioCopyMsg] = useState("");
  const [showSelfSupport, setShowSelfSupport] = useState(false);
  // 🏆 hall da fama: placas de cidades anteriores
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [hallEntries, setHallEntries] = useState([]);
  // relógio próprio (1x por segundo) só pra a contagem regressiva do intervalo/fim de aula ficar fluida
  const [clockNow, setClockNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setClockNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  // 🔮 previsão do dia (dispensável; lembrada por dia no navegador, por ALUNO — mesmo motivo do
  // aviso de retomada acima: o notebook da carreta é compartilhado entre vários alunos por dia)
  const [videnteDismissed, setVidenteDismissed] = useState(() => {
    try { return localStorage.getItem(`nyx_vidente_${todayKey()}_${shift}_${studentName}`) === "1"; } catch { return false; }
  });
  const [kbSuggestDismissed, setKbSuggestDismissed] = useState(() => {
    try { return localStorage.getItem(`nyx_kbsuggest_${todayKey()}_${shift}_${studentName}`) === "1"; } catch { return false; }
  });
  // 🏁 corrida de digitação
  const [showRace, setShowRace] = useState(false);
  const [typingBest, setTypingBest] = useState(null);
  const [typingRewardDay, setTypingRewardDay] = useState(null);
  // 🧠 teste de conhecimento por conta própria — disponível a qualquer momento, sem finalizar a aula
  const [showKnowledgeTest, setShowKnowledgeTest] = useState(false);
  const [knowledgeTestRewardDay, setKnowledgeTestRewardDay] = useState(null);
  // 🩺 saúde do Nyx pro aluno também ver — mesmo aviso "Reconectando" e os pontinhos por
  // modelo (Nemotron/Laguna) que já existiam só no painel do professor
  const [aiDown, setAiDown] = useState(false);
  const [providerHealth, setProviderHealth] = useState({ nvidia:null, laguna:null });
  useEffect(() => {
    let active = true;
    const check = async () => {
      const [h, nvidia, laguna] = await Promise.all([getAiHealth(), getAiHealthByProvider("nvidia"), getAiHealthByProvider("laguna")]);
      if (!active) return;
      setAiDown(!!h && h.ok === false && Date.now() - h.at < 5 * 60 * 1000);
      setProviderHealth({ nvidia, laguna });
    };
    check();
    const iv = setInterval(check, 10000);
    return () => { active = false; clearInterval(iv); };
  }, []);
  // 🎁 presente misterioso do dia (na tela de atividade concluída)
  const [giftLastClaim, setGiftLastClaim] = useState(null);
  const [giftReveal, setGiftReveal] = useState(null);
  // loja do Nyx: nyxPoints = pontos GANHOS (ranking/meta usam este); nyxSpent = total gasto na loja
  // carteira disponível = nyxPoints - nyxSpent; nyxOwned = itens comprados
  const [nyxPoints, setNyxPoints] = useState(0);
  const [nyxSpent, setNyxSpent] = useState(0);
  const [nyxOwned, setNyxOwned] = useState([]);
  const [nyxGear, setNyxGear] = useState(DEFAULT_NYX_GEAR);
  const [showNyxShop, setShowNyxShop] = useState(false);
  // anti-cola geral: true quando o professor está escrevendo em "Meu código" AGORA (não faz muito tempo)
  const [teacherWriting, setTeacherWriting] = useState(false);
  const [duelWins, setDuelWins] = useState(0);
  const [showFreeBuild, setShowFreeBuild] = useState(false);
  const [weeklyChallenge, setWeeklyChallenge] = useState(null);
  // conquistas, ranking, meta da turma, curiosidade do dia, duelo, sons
  const [achievements, setAchievements] = useState([]);
  const [newAchievement, setNewAchievement] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [classPointsSum, setClassPointsSum] = useState(0);
  const [curiosity, setCuriosity] = useState(null);
  const [curiosityDismissed, setCuriosityDismissed] = useState(false);
  const [muted, setMuted] = useState(() => loadSoundsMuted());
  const [showDuel, setShowDuel] = useState(false);
  const [showTeamDuel, setShowTeamDuel] = useState(false);
  const [duelDoc, setDuelDoc] = useState(null);
  // travas acionadas pelo professor (zek = tela bloqueada; zeker = duelos bloqueados)
  const [nyxLocks, setNyxLocksState] = useState({ zek: false, zeker: false });
  // quando a atividade de hoje foi concluída (mantém o status até as 9h do dia seguinte)
  const [doneAt, setDoneAt] = useState(null);
  // histórico por dia: notas das atividades e resumos das aulas (caderno)
  const [scoreHistory, setScoreHistory] = useState({});
  const [summaryHistory, setSummaryHistory] = useState({});
  // versão detalhada do resumo (pedida sob demanda — alguns alunos preferem o resumo mais completo)
  const [detailedSummary, setDetailedSummary] = useState("");
  const [detailedSummaryHistory, setDetailedSummaryHistory] = useState({});
  const [summaryView, setSummaryView] = useState("simples"); // "simples" | "detalhado"
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFailMsg, setDetailFailMsg] = useState("");
  const [showNotebook, setShowNotebook] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [showNextSteps, setShowNextSteps] = useState(false);
  // seletor de voz da leitura em voz alta (🗣️ no cabeçalho)
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  // festa quando a turma sobe de nível na meta coletiva
  const [goalParty, setGoalParty] = useState(null);
  const goalLevelRef = useRef(null);

  // text-to-speech para acessibilidade
  const { speak, pause, resume, stop: stopSpeech, isSpeaking, isSupported: ttsSupported } = useSpeech();
  const [currentSpeakingFor, setCurrentSpeakingFor] = useState(null);
  // accessibility: large UI mode for motor-impaired students
  const [largeUiMode, setLargeUiMode] = useState(() => {
    try { return localStorage.getItem("nyx_large_ui") === "1"; } catch { return false; }
  });
  const uiScale = largeUiMode ? 1.3 : 1;
  // modo guiado (acessibilidade): ligado pelo professor por aluno — troca o editor por blocos clicáveis
  const [accessMode, setAccessModeState] = useState(false);
  // perfis de apoio (educação inclusiva), marcados pelo professor por aluno:
  // sensorial = modo calmo · foco = esconde competição · leitura = texto espaçado · ritmo = atividade reduzida
  const [supportFlags, setSupportFlags] = useState({});
  // o PRÓPRIO aluno também pode pedir qualquer um desses ajustes pra si mesmo, sem depender do
  // professor notar — fica guardado no perfil dele (mesmo canal sem senha que já salva nota/fase/
  // código), então funciona igual ao pedir ajuda: só o aluno decide, o professor só acompanha.
  // O efeito é sempre a UNIÃO dos dois (professor OU aluno liga = ajuste ativo)
  const [selfSupport, setSelfSupport] = useState({});
  const calmMode = !!supportFlags.sensorial || !!selfSupport.sensorial;
  const focusMode = !!supportFlags.foco || !!selfSupport.foco;
  const easyRead = !!supportFlags.leitura || !!selfSupport.leitura;
  const ownPace = !!supportFlags.ritmo || !!selfSupport.ritmo;
  const highContrast = !!supportFlags.visual || !!selfSupport.visual;
  useEffect(() => { setSoundsCalm(calmMode); return () => setSoundsCalm(false); }, [calmMode]);
  const [guidedBlocks, setGuidedBlocks] = useState([]);
  const [pendingBlock, setPendingBlock] = useState(null);
  // arrastar e soltar os blocos do Modo Guiado pra reordenar (mais tátil que os botões ⬆️⬇️, que continuam
  // funcionando junto — quem não conseguir arrastar com precisão ainda reordena pelos botões)
  const [guidedDragIdx, setGuidedDragIdx] = useState(null);
  const [guidedOverIdx, setGuidedOverIdx] = useState(null);
  const [guidedJustDropped, setGuidedJustDropped] = useState(null);
  const guidedRowRefs = useRef([]);
  const guidedDragFromRef = useRef(null);
  // "Nyx te ensina" no Modo Guiado: mini-lições geradas sob demanda (C# explicado com exemplos de jogos)
  const [guidedLessons, setGuidedLessons] = useState([]);
  const [guidedLessonLoading, setGuidedLessonLoading] = useState(false);

  const sessionStart = useRef(Date.now());
  const stateRef = useRef({});
  const attendanceRef = useRef({});
  // "foto" do código no primeiro acesso do dia: o resumo da aula cobre só o que foi escrito DEPOIS dela
  const daySnapshotRef = useRef(null);
  // "foto" do código no momento em que o ÚLTIMO resumo foi gerado — se o professor passar mais
  // código depois e o aluno salvar de novo, o próximo resumo é uma CONTINUAÇÃO (só o que é novo),
  // não substitui o que já tinha sido criado antes
  const summarySnapshotRef = useRef(null);
  const activeCode = files[active]?.code || "";

  useEffect(() => {
    stateRef.current = { files, code:activeCode, avatar, phase, score, answers, feedback, dynamicActivity, dynamicSummary, finalFeedback, classFeedback: classFb, examReady, examScore, examAnswers, examDone, examExits, examScoreRaw, examAppeal, examScoreSeen, examOptIn, examGuidedMode, examGuidedQuestions, examGuidedAnswers, examGuidedCorrect, helpAt, wantsPartner, selfSupport, typingBest, typingRewardDay, knowledgeTestRewardDay, giftLastClaim, theme, themeBeforeSpartan, treasureFound, spartanIntroShown, warmupDay, retroSeen, tourneyAnswer, tourneyClaimed, nyxPoints, nyxSpent, nyxOwned, nyxGear, nyxPrefs, birthDate, cpf, achievements, doneAt, scoreHistory, summaryHistory, detailedSummary, detailedSummaryHistory, duelWins, weeklyChallenge, guidedBlocks, guidedLessons, justifications, keyboardDone, portfolioPublic, errorAt, errorMsg, programmingLanguage, languageHistory, quizJoin, quizAnswers };
  });

  // se o professor bloquear os duelos com o modal aberto, fecha na hora
  useEffect(() => { if (nyxLocks.zeker && showDuel) setShowDuel(false); }, [nyxLocks.zeker, showDuel]);
  useEffect(() => { if (nyxLocks.zeker && showTeamDuel) setShowTeamDuel(false); }, [nyxLocks.zeker, showTeamDuel]);

  // ── início do intervalo: som suave uma vez só por intervalo ──
  const classStatusNow = classStatus(mySchedule, myAllowWeekend);
  useEffect(() => {
    const bStart = mySchedule?.breakStart && mySchedule?.breakMin ? `${todayKey()}-${mySchedule.breakStart}-${mySchedule.breakMin}` : null;
    if (!bStart) return;
    if (classStatusNow.inBreak && breakStartNotifiedRef.current !== bStart) {
      breakStartNotifiedRef.current = bStart;
      playSound("recesso");
    }
  }, [classStatusNow.inBreak, mySchedule?.breakStart, mySchedule?.breakMin]);

  // ── fim do intervalo: sininho + aviso, uma vez só por intervalo (não repete a cada nova checagem) ──
  useEffect(() => {
    const bEnd = mySchedule?.breakStart && mySchedule?.breakMin ? `${todayKey()}-${mySchedule.breakStart}-${mySchedule.breakMin}` : null;
    if (!bEnd) return;
    if (!classStatusNow.inBreak && classStatusNow.configured && breakEndNotifiedRef.current !== bEnd) {
      // só dispara se JÁ passou do horário do intervalo hoje (evita disparar antes de começar)
      const bStartMin = hmToMin(mySchedule.breakStart);
      if (bStartMin != null && nowMin() >= bStartMin + Number(mySchedule.breakMin || 0)) {
        breakEndNotifiedRef.current = bEnd;
        playSound("bell");
        setBreakEndMsg("🔔 Intervalo acabou! Hora de voltar aos estudos.");
        setTimeout(() => setBreakEndMsg(""), 8000);
      }
    }
  }, [classStatusNow.inBreak, classStatusNow.configured, mySchedule?.breakStart, mySchedule?.breakMin]);


  const persist = useCallback(async (extra = {}) => {
    const s = stateRef.current;
    // presença do dia: "present" se já fez algo de verdade hoje, senão "idle" (entrou mas parado)
    const tk = todayKey();
    const didWork = (s.code && s.code.trim().length >= 10) || (s.phase && s.phase !== "coding") || (s.score != null) || (s.answers && Object.keys(s.answers).length > 0);
    // o dia em que o perfil foi criado conta como presença automática, mesmo que o aluno não
    // escreva nada nesse primeiro acesso (ex: dia de apresentação/cadastro) — vale tanto pra quem
    // começa no primeiro dia de aula quanto pra quem entra na turma depois (dias ANTERIORES ao
    // cadastro dele já não contam como falta em nenhum lugar — ver dayCell/boletim/tendência —
    // então a partir do momento que ele entra, o dia de entrada em si também não pode virar falta)
    const isEnrollmentDay = tk === dateKeyOf(createdAtRef.current);
    attendanceRef.current = { ...attendanceRef.current, [tk]: (didWork || isEnrollmentDay || attendanceRef.current[tk] === "present") ? "present" : "idle" };
    // guarda o horário do PRIMEIRO acesso de hoje (uma vez só) — usado pra marcar "atrasado" na chamada
    if (!attendanceFirstRef.current[tk]) attendanceFirstRef.current = { ...attendanceFirstRef.current, [tk]: Date.now() };
    const ok = await saveStudent(shift, studentName, {
      name: studentName,
      shift: shift || "sem-turno",
      avatar: s.avatar || DEFAULT_AVATAR,
      joinedAt: sessionStart.current,
      createdAt: createdAtRef.current,
      lastSeen: Date.now(),
      attendance: attendanceRef.current,
      attendanceFirst: attendanceFirstRef.current,
      justifications: s.justifications || {},
      keyboardDone: s.keyboardDone || false,
      portfolioPublic: s.portfolioPublic || false,
      files: s.files || [{name:"Program.cs",code:""}],
      code: s.code || "",
      phase: s.phase,
      score: s.score,
      answers: s.answers || {},
      dynamicActivity: s.dynamicActivity || null,
      dynamicSummary: s.dynamicSummary || null,
      feedback: s.feedback || null,
      hasError: s.feedback ? !s.feedback.ok : false,
      finalFeedback: s.finalFeedback || "",
      classFeedback: s.classFeedback || null,
      examReady: s.examReady || false,
      examScore: s.examScore ?? null,
      examAnswers: s.examAnswers || {},
      examDone: s.examDone || false,
      examExits: s.examExits || 0,
      examScoreRaw: s.examScoreRaw ?? null,
      examAppeal: s.examAppeal || null,
      examScoreSeen: s.examScoreSeen || false,
      examOptIn: typeof s.examOptIn === "boolean" ? s.examOptIn : null,
      examGuidedMode: s.examGuidedMode || false,
      examGuidedQuestions: s.examGuidedQuestions || null,
      examGuidedAnswers: s.examGuidedAnswers || {},
      examGuidedCorrect: s.examGuidedCorrect || 0,
      helpAt: s.helpAt || null,
      wantsPartner: s.wantsPartner || null,
      selfSupport: s.selfSupport || {},
      errorAt: s.errorAt || null,
      errorMsg: s.errorMsg || "",
      typingBest: s.typingBest || null,
      typingRewardDay: s.typingRewardDay || null,
      knowledgeTestRewardDay: s.knowledgeTestRewardDay || null,
      giftLastClaim: s.giftLastClaim || null,
      theme: s.theme || "dark",
      themeBeforeSpartan: s.themeBeforeSpartan || null,
      treasureFound: s.treasureFound || false,
      spartanIntroShown: s.spartanIntroShown || false,
      warmupDay: s.warmupDay || null,
      retroSeen: s.retroSeen || null,
      tourneyAnswer: s.tourneyAnswer || null,
      tourneyClaimed: s.tourneyClaimed || null,
      nyxPoints: s.nyxPoints || 0,
      nyxSpent: s.nyxSpent || 0,
      nyxOwned: s.nyxOwned || [],
      nyxGear: s.nyxGear || DEFAULT_NYX_GEAR,
      nyxPrefs: s.nyxPrefs || { tom:"divertido", estilo:"detalhada" },
      birthDate: s.birthDate || "",
      cpf: s.cpf || "",
      achievements: s.achievements || [],
      duelWins: s.duelWins || 0,
      weeklyChallenge: s.weeklyChallenge || null,
      doneAt: s.doneAt || null,
      daySnapshot: daySnapshotRef.current || null,
      summarySnapshot: summarySnapshotRef.current || null,
      scoreHistory: s.scoreHistory || {},
      summaryHistory: s.summaryHistory || {},
      detailedSummary: s.detailedSummary || null,
      detailedSummaryHistory: s.detailedSummaryHistory || {},
      guidedBlocks: s.guidedBlocks || [],
      guidedLessons: s.guidedLessons || [],
      programmingLanguage: s.programmingLanguage || null,
      languageHistory: s.languageHistory || [],
      quizJoin: s.quizJoin || null,
      quizAnswers: s.quizAnswers || {},
      ...extra,
    });
    setConnected(ok);
    return ok;
  }, [studentName, shift]);

  // 📶 resiliência de internet: quando a conexão VOLTA depois de cair, re-salva na hora (sem
  // esperar o próximo tick) e mostra rapidinho o "tudo salvo"; os eventos do navegador aceleram
  // a detecção da queda/volta pra não depender só do heartbeat de 3s
  useEffect(() => {
    const was = prevConnectedRef.current;
    prevConnectedRef.current = connected;
    if (was === false && connected === true) {
      setJustReconnected(true);
      const t = setTimeout(() => setJustReconnected(false), 6000);
      return () => clearTimeout(t);
    }
  }, [connected]);
  useEffect(() => {
    const onOffline = () => setConnected(false);
    const onOnline = () => { persist(); };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => { window.removeEventListener("offline", onOffline); window.removeEventListener("online", onOnline); };
  }, [persist]);

  // 🌐 sala de linguagens: depois da preferência do Nyx (e antes da apresentação/tour), quem ainda
  // não escolheu uma linguagem pra estudar (HTML/CSS/PHP/JS) vê a tela de escolha
  useEffect(() => {
    if (!loaded || !isLangRoom || showNyxPrefs) return;
    setShowLangPicker(!programmingLanguage);
  }, [loaded, isLangRoom, showNyxPrefs, programmingLanguage]);

  // 👁️ prévia ao vivo (só HTML/CSS/JS, PHP precisa de servidor): recalcula com um pequeno atraso
  // pra não recarregar o iframe a cada tecla digitada
  const [showPreview, setShowPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState("");
  useEffect(() => {
    if (!showPreview || !studyLang?.preview) return;
    const t = setTimeout(() => setPreviewDoc(buildPreviewDoc(files, programmingLanguage)), 400);
    return () => clearTimeout(t);
  }, [showPreview, studyLang, files, programmingLanguage]);

  const chooseLanguage = async (langId) => {
    const lang = langById(langId);
    if (!lang) return;
    const newFiles = [{ name: lang.fileName, code: lang.starter }];
    setProgrammingLanguage(langId);
    setFiles(newFiles);
    setActive(0);
    setShowLangPicker(false);
    await persist({ programmingLanguage: langId, files: newFiles, code: lang.starter });
  };

  // 🔁 trocar de linguagem: arquiva o código e os resumos da linguagem atual no histórico (igual o
  // caderno de resumos) e volta pra tela de escolha, começando do zero na próxima linguagem
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const switchLanguage = async () => {
    const archived = { language: programmingLanguage, files: files.map(f => ({ ...f })), summaryHistory, detailedSummaryHistory, endedAt: Date.now() };
    const newHistory = [...languageHistory, archived];
    setLanguageHistory(newHistory);
    setProgrammingLanguage(null);
    setFiles([{ name:"Program.cs", code:"" }]);
    setSummaryHistory({});
    setDetailedSummaryHistory({});
    setDynamicSummary(""); setDynamicActivity(null); setAnswers({}); setRevealedHints({}); setScore(null); setDoneAt(null);
    setPhase("coding");
    setShowSwitchConfirm(false);
    setShowLangPicker(true);
    await persist({
      languageHistory: newHistory, programmingLanguage: null, files: [{ name:"Program.cs", code:"" }], code: "",
      summaryHistory: {}, detailedSummaryHistory: {}, dynamicSummary: null, dynamicActivity: null, answers: {},
      score: null, doneAt: null, phase: "coding",
    });
  };

  // 🗺️ poliglota: junta a linguagem atual + todas as já arquivadas no histórico — se cobrir as 4, desbloqueia
  useEffect(() => {
    if (!isLangRoom) return;
    const distinct = new Set([...languageHistory.map(h => h.language), programmingLanguage].filter(Boolean));
    if (distinct.size >= STUDY_LANGUAGES.length) unlockAchievement("poliglota");
  }, [isLangRoom, languageHistory, programmingLanguage]);

  // 🎉 quiz: fica de olho se o professor abriu uma sala — enquanto tiver sala, o botão brilhante
  // aparece; depois que eu entro, esse mesmo polling move minha tela junto com a do professor
  useEffect(() => {
    if (!loaded) return;
    let active = true;
    let timer = null;
    // enquanto NÃO tem sala aberta, checa devagar (a maior parte do dia não tem quiz rolando);
    // assim que uma sala existe, acelera pra manter a experiência ao vivo do jogo
    const check = async () => {
      if (!active) return;
      const r = await getQuizRoom();
      if (!active) return;
      setQuizRoomInfo(r);
      timer = setTimeout(check, r ? 2500 : 10000);
    };
    check();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [loaded]);

  const joinQuiz = async () => {
    if (!quizRoomInfo) return;
    if (quizCodeInput.trim() !== quizRoomInfo.code) { setQuizCodeError("Código errado! Confere no telão e tenta de novo."); return; }
    const join = { code: quizRoomInfo.code, at: Date.now() };
    setQuizJoin(join);
    setQuizAnswers({});
    setShowQuizJoin(false);
    setQuizCodeInput(""); setQuizCodeError("");
    playSound("enter");
    await persist({ quizJoin: join, quizAnswers: {} });
  };

  const answerQuiz = async (optIdx) => {
    const room = quizRoomInfo;
    if (!room || room.status !== "question") return;
    const qi = room.qIndex;
    if (quizAnswers[qi] != null) return; // já respondeu esta pergunta
    const startedAt = (room.startedAts || {})[qi];
    if (startedAt == null || Date.now() > startedAt + quizSecsOf(room) * 1000) return; // tempo esgotado
    const next = { ...quizAnswers, [qi]: { opt: optIdx, at: Date.now() } };
    setQuizAnswers(next);
    playSound("click");
    await persist({ quizAnswers: next });
  };

  const leaveQuiz = async () => {
    setQuizJoin(null);
    setQuizAnswers({});
    await persist({ quizJoin: null, quizAnswers: {} });
  };

  // 🤝 parceiro de código: fica de olho se o professor me pareou com alguém (como ajudado OU como
  // ajudante). Quando o ajudante marca como resolvido, o AJUDADO detecta na próxima verificação,
  // ganha os pontos e limpa o registro (o ajudante já ganhou os dele na hora de marcar) — mesmo
  // padrão de "self-report" usado no resto do app (torneio, chefão etc.)
  useEffect(() => {
    let active = true;
    const check = async () => {
      const list = await listPartners(shift);
      if (!active) return;
      const mineHelping = list.find(p => p.helper === studentName && p.status === "active");
      setPartnerHelping(mineHelping || null);
      const mineHelped = list.find(p => p.helped === studentName);
      if (mineHelped && mineHelped.status === "resolved") {
        if (!partnerResolvedSeenRef.current) {
          partnerResolvedSeenRef.current = true;
          const np = (stateRef.current.nyxPoints || 0) + PARTNER_REWARD;
          setNyxPoints(np);
          await persist({ nyxPoints: np });
          setPartnerToast(`🎉 ${mineHelped.helper} te ajudou! +${PARTNER_REWARD} pontos.`);
          setTimeout(() => setPartnerToast(""), 8000);
          await clearPartner(shift, studentName);
        }
        setPartnerHelped(null);
        return;
      }
      partnerResolvedSeenRef.current = false;
      setPartnerHelped(mineHelped && mineHelped.status === "active" ? mineHelped : null);
    };
    check();
    const iv = setInterval(check, 12000);
    return () => { active = false; clearInterval(iv); };
  }, [shift, studentName, persist]);

  // enquanto o ajudante está com a janela de "ver código do colega" aberta, atualiza o código dele
  // periodicamente (só leitura) — fecha sozinho se a parceria acabar nesse meio tempo
  useEffect(() => {
    if (!showPartnerHelp || !partnerHelping) return;
    let active = true;
    const loadPeer = async () => {
      const st = await getStudent(shift, partnerHelping.helped);
      if (!active) return;
      if (!st) { setShowPartnerHelp(false); return; }
      setPartnerPeerCode({ name: st.name, files: (st.files && st.files.length) ? st.files : [{ name:"Program.cs", code: st.code||"" }] });
    };
    loadPeer();
    const iv = setInterval(loadPeer, 6000);
    return () => { active = false; clearInterval(iv); };
  }, [showPartnerHelp, partnerHelping, shift]);

  const resolvePartner = async () => {
    if (!partnerHelping) return;
    await setPartner(shift, partnerHelping.helped, { ...partnerHelping, status: "resolved", resolvedAt: Date.now() });
    const np = (stateRef.current.nyxPoints || 0) + PARTNER_REWARD;
    setNyxPoints(np);
    await persist({ nyxPoints: np });
    setShowPartnerHelp(false);
    setPartnerPeerCode(null);
    setPartnerToast(`🎉 Você ajudou ${partnerHelping.helped}! +${PARTNER_REWARD} pontos.`);
    setTimeout(() => setPartnerToast(""), 8000);
    setPartnerHelping(null);
  };

  // 🔥 aquecimento do dia (revisão espaçada): assim que o aluno entra — depois do onboarding e do
  // tour — o Nyx monta 3 perguntinhas rápidas sobre o resumo da aula ANTERIOR. Concluiu, ganha
  // pontos e não aparece de novo no dia; "Agora não" também silencia pelo resto do dia.
  useEffect(() => {
    if (!loaded || accessMode || phase !== "coding") return;
    if (showNyxPrefs || showIntro || tourStep >= 0) return;
    if (warmupRequestedRef.current) return;
    const tk = todayKey();
    if (warmupDay === tk) return;
    try { if (localStorage.getItem(`nyx_warmup_skip_${tk}_${shift}_${studentName}`) === "1") return; } catch {}
    // resumo mais recente ANTERIOR a hoje (quem nunca teve aula ainda não tem aquecimento)
    const days = Object.keys(summaryHistory || {}).filter(d => d < tk).sort();
    const lastDay = days[days.length - 1];
    if (!lastDay) return;
    const sum = (detailedSummaryHistory || {})[lastDay] || summaryHistory[lastDay];
    if (!sum || !Array.isArray(sum.secoes) || !sum.secoes.length) return;
    warmupRequestedRef.current = true;
    (async () => {
      try {
        const conceitos = sum.secoes.map(sec => `- ${sec.titulo}: ${sec.explicacao || ""}`).join("\n");
        const data = await askClaudeJson(
          `Este foi o resumo da última aula de C# de um aluno iniciante:\n${sum.intro || ""}\n${conceitos}\n\nCrie um "aquecimento" de revisão com EXATAMENTE 3 perguntas de múltipla escolha BEM RÁPIDAS e diretas sobre esses conceitos (nível fácil — o objetivo é relembrar, não pegar ninguém). Cada pergunta com 4 alternativas curtas.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{ "perguntas": [ { "pergunta": "texto curto", "alternativas": ["a","b","c","d"], "correta": 0, "explicacao": "1 frase simples relembrando o porquê" } ] }`,
          "Você é o Nyx, robô-tutor de C# para adolescentes iniciantes. Português simples e correto. Responda APENAS JSON puro válido."
        );
        const qs = Array.isArray(data?.perguntas) ? data.perguntas.filter(q => q && q.pergunta && Array.isArray(q.alternativas) && q.alternativas.length >= 2 && q.alternativas[q.correta] != null) : [];
        if (!qs.length) return;
        // embaralha as alternativas de cada pergunta (guardando onde a certa foi parar)
        const shuffled = qs.slice(0, 3).map(q => {
          const idx = q.alternativas.map((_, i) => i).sort(() => Math.random() - 0.5);
          return { pergunta: q.pergunta, alternativas: idx.map(i => q.alternativas[i]), correta: idx.indexOf(q.correta), explicacao: q.explicacao || "" };
        });
        setWarmup({ questions: shuffled });
        setWarmupStep(0); setWarmupPicked(null); setWarmupCorrect(0);
        setWarmupOpen(true);
      } catch { /* Nyx offline: hoje fica sem aquecimento, sem drama */ }
    })();
  }, [loaded, accessMode, phase, showNyxPrefs, showIntro, tourStep, warmupDay, summaryHistory, detailedSummaryHistory, shift, studentName]);

  const finishWarmup = async () => {
    const earned = warmupCorrect; // 1 ponto por acerto
    const newPoints = (stateRef.current.nyxPoints || 0) + earned;
    setWarmupOpen(false);
    setWarmupDay(todayKey());
    if (earned > 0) {
      setNyxPoints(newPoints);
      checkPointsAchievements(newPoints);
      await persist({ warmupDay: todayKey(), nyxPoints: newPoints });
    } else {
      await persist({ warmupDay: todayKey() });
    }
  };
  const skipWarmup = () => {
    try { localStorage.setItem(`nyx_warmup_skip_${todayKey()}_${shift}_${studentName}`, "1"); } catch {}
    setWarmupOpen(false);
  };

  // 🏟️ torneio: se estou numa partida da rodada atual e ainda não respondi o quiz DESTA rodada,
  // ele abre sozinho (o professor iniciou pelo telão — é o evento da turma naquele momento)
  useEffect(() => {
    if (!loaded || !tourneyInfo || tourneyInfo.status !== "active") { if (!tourneyInfo) setTourneyQuiz(null); return; }
    const m = (tourneyInfo.matches || []).find(x => x.round === tourneyInfo.round && !x.winner && x.b && (x.a === studentName || x.b === studentName));
    if (!m) { setTourneyQuiz(null); return; }
    const already = tourneyAnswer && tourneyAnswer.id === tourneyInfo.id && tourneyAnswer.round === tourneyInfo.round;
    if (already) return;
    if (tourneyQuiz && tourneyQuiz.id === tourneyInfo.id && tourneyQuiz.round === tourneyInfo.round) return; // já está aberto
    const qs = (tourneyInfo.questions || {})[tourneyInfo.round];
    if (!Array.isArray(qs) || !qs.length) return;
    // embaralha as alternativas localmente (guardando onde a certa foi parar)
    const shuffled = qs.map(q => {
      const idx = q.alternativas.map((_, i) => i).sort(() => Math.random() - 0.5);
      return { pergunta: q.pergunta, alternativas: idx.map(i => q.alternativas[i]), correta: idx.indexOf(q.correta) };
    });
    setTourneyQuiz({ id: tourneyInfo.id, round: tourneyInfo.round, opponent: m.a === studentName ? m.b : m.a, questions: shuffled });
    setTourneyStep(0); setTourneyPicked(null); setTourneyCorrect(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, tourneyInfo, tourneyAnswer, studentName]);
  const submitTourneyQuiz = async () => {
    if (!tourneyQuiz) return;
    const score = tourneyCorrect;
    const ans = { id: tourneyQuiz.id, round: tourneyQuiz.round, score, at: Date.now() };
    const newPts = (stateRef.current.nyxPoints || 0) + score; // 1 ponto do Nyx por acerto, como nos duelos
    setTourneyAnswer(ans);
    setTourneyQuiz(null);
    if (score > 0) { setNyxPoints(newPts); checkPointsAchievements(newPts); }
    setRobotState("ok");
    setRobotMsg(`🏟️ Respostas enviadas! Você fez ${score} ponto${score===1?"":"s"} — olha no telão quem venceu a rodada!`);
    setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 8000);
    await persist(score > 0 ? { tourneyAnswer: ans, nyxPoints: newPts } : { tourneyAnswer: ans });
  };

  // 🎁 retrospectiva: abre sozinha quando o professor libera e este aluno ainda não viu ESTA liberação
  useEffect(() => {
    if (!loaded || !retroActive) return;
    if (retroSeen === retroActive) return;
    if (showNyxPrefs || showIntro || tourStep >= 0 || warmupOpen) return;
    setShowRetro(true);
  }, [loaded, retroActive, retroSeen, showNyxPrefs, showIntro, tourStep, warmupOpen]);
  const closeRetro = async () => {
    setShowRetro(false);
    setRetroSeen(retroActive);
    await persist({ retroSeen: retroActive });
  };

  // ── anti-cola: durante a prova ativa, cada saída da aba é contada (e desconta 10 pts no fim) ──
  // ninguém do Modo Guiado é penalizado por trocar de aba — quem recusou nem vê a prova, e quem
  // topou faz a versão de participação simplificada, que não vale nota (não tem o que descontar)
  const examActive = examInfo.status === 'active' && !examDone && !accessMode;
  // shuffle único do quiz simplificado de participação, guardado pra sobreviver a um F5 no meio
  useEffect(() => {
    if (examInfo.status !== 'active' || !accessMode || examOptIn !== true || examGuidedQuestions || examDone) return;
    const shuffled = shuffleQuestions(GUIDED_PARTICIPATION_QUIZ);
    setExamGuidedQuestions(shuffled);
    persist({ examGuidedQuestions: shuffled });
  }, [examInfo.status, accessMode, examOptIn, examGuidedQuestions, examDone, persist]);
  useEffect(() => {
    if (!examActive) return;
    const registerExit = () => setExamExits(n => {
      const next = n + 1;
      setTimeout(() => persist({ examExits: next }), 0);
      return next;
    });
    // se a aba foi FECHADA e reaberta no meio da prova, o sessionStorage some mas as
    // respostas continuam no servidor — isso entrega que a prova foi interrompida
    try {
      if (!sessionStorage.getItem("nyx_exam_open")) {
        sessionStorage.setItem("nyx_exam_open", "1");
        if (Object.keys(stateRef.current.examAnswers || {}).length > 0) registerExit();
      }
    } catch {}
    const onVis = () => { if (document.hidden) registerExit(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [examActive, persist]);

  // ── ✋ pedir ajuda: acende o tile do aluno no monitoramento do professor (expira em 15 min lá) ──
  const askHelp = async () => { const t = Date.now(); setHelpAt(t); await persist({ helpAt: t }); };
  const cancelHelp = async () => { setHelpAt(null); await persist({ helpAt: null }); };
  // 🙋 pedir um parceiro sozinho — o professor decide quem pareia (não é o aluno que escolhe),
  // por isso isso só "levanta a mão"; quem realmente pareia é sempre o professor
  const askPartner = async () => { const t = Date.now(); setWantsPartner(t); await persist({ wantsPartner: t }); };
  const cancelPartnerRequest = async () => { setWantsPartner(null); await persist({ wantsPartner: null }); };
  // 🧩 o próprio aluno liga/desliga um ajuste de apoio pra si mesmo — some com o professor, é a
  // UNIÃO dos dois (se qualquer um dos dois ligar, o ajuste vale)
  const toggleSelfSupport = (flag) => { const next = { ...selfSupport, [flag]: !selfSupport[flag] }; setSelfSupport(next); persist({ selfSupport: next }); };

  // ── ⚠️ erro em produção: se a tela do aluno der um erro de JS de verdade, avisa o professor
  // sozinho (mesmo painel de Monitoramento), sem o aluno precisar levantar a mão e reclamar.
  // limitado a 1 relato por minuto pra uma tempestade de erros repetidos não spammar o servidor ──
  useEffect(() => {
    const reportError = (msg) => {
      const now = Date.now();
      if (now - lastErrorReportRef.current < 60000) return;
      lastErrorReportRef.current = now;
      const clipped = String(msg || "Erro desconhecido").slice(0, 200);
      setErrorAt(now); setErrorMsg(clipped);
      persist({ errorAt: now, errorMsg: clipped });
    };
    const onError = (e) => reportError(e.message ? `${e.message} (${e.filename||""}:${e.lineno||""})` : String(e));
    const onRejection = (e) => reportError(`Promise rejeitada: ${e.reason?.message || e.reason || "motivo desconhecido"}`);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, [persist]);

  // 📋 dias de aula sem presença registrada, entre a criação do perfil e hoje — ainda sem justificativa
  const pendingAbsences = myClassDays
    .filter(d => d < todayKey() && d >= dateKeyOf(createdAtRef.current))
    .filter(d => !attendanceRef.current[d] && !justifications[d])
    .sort().reverse();
  const submitJustification = async (dateKey, text) => {
    if (!text || !text.trim()) return;
    const next = { ...justifications, [dateKey]: { text: text.trim(), status: "pending", at: Date.now() } };
    setJustifications(next);
    await persist({ justifications: next });
  };

  // ⌨️ conclui o tutorial de teclado: pontos + conquista, 1x (pode repetir o treino, mas não
  // repontua) — lê/escreve via stateRef (não os closures de keyboardDone/nyxPoints), mesmo motivo
  // do handleBuyItem/openGift: dois disparos bem próximos não podem passar os dois pela checagem
  // com o mesmo estado "antigo" e um pisar no ponto do outro
  const finishKeyboardTutorial = async () => {
    const s = stateRef.current;
    if (s.keyboardDone) return;
    const np = (s.nyxPoints||0) + 5;
    stateRef.current = { ...s, keyboardDone: true, nyxPoints: np };
    setKeyboardDone(true);
    setNyxPoints(np);
    await persist({ keyboardDone: true, nyxPoints: np });
    unlockAchievement("teclado-mestre");
    checkPointsAchievements(np);
  };

  // ── 🏁 fim da corrida de digitação: pontos 1x por dia (+1 bônus por recorde pessoal) ──
  const finishTypingRace = async (ms) => {
    const s = stateRef.current;
    const today = todayKey();
    const firstToday = s.typingRewardDay !== today;
    const newRecord = !s.typingBest || ms < s.typingBest.ms;
    const reward = (firstToday ? 2 : 0) + (newRecord ? 1 : 0);
    const best = newRecord ? { ms, at: Date.now() } : s.typingBest;
    const newTypingRewardDay = firstToday ? today : s.typingRewardDay;
    if (reward > 0) {
      const np = (s.nyxPoints||0) + reward;
      stateRef.current = { ...s, typingBest: best, typingRewardDay: newTypingRewardDay, nyxPoints: np };
      if (newRecord) setTypingBest(best);
      if (firstToday) setTypingRewardDay(today);
      setNyxPoints(np);
      await persist({ nyxPoints: np, typingBest: best, typingRewardDay: newTypingRewardDay });
      checkPointsAchievements(np);
    } else {
      // reward<=0 só acontece quando newRecord e firstToday são os dois false — nada novo pra
      // guardar em stateRef/estado além do que já estava lá
      await persist({ typingBest: best });
    }
    return { reward, newRecord };
  };

  // ── 🎁 abre o presente misterioso do dia (sorteio de raridade) ──
  // lê/escreve via stateRef (não os closures de giftLastClaim/nyxPoints) pelo mesmo motivo do
  // handleBuyItem: dois toques rápidos seguidos (comum no touch da carreta) passavam os dois pela
  // checagem com o mesmo "giftLastClaim" ainda desatualizado, e o aluno ganhava o presente 2x
  const openGift = async () => {
    const s = stateRef.current;
    if (s.giftLastClaim === todayKey()) return;
    const tier = rollGift();
    const np = (s.nyxPoints||0) + tier.pts;
    stateRef.current = { ...s, nyxPoints: np, giftLastClaim: todayKey() };
    setGiftReveal(tier);
    setGiftLastClaim(todayKey());
    setNyxPoints(np);
    playSound("combo");
    await persist({ nyxPoints: np, giftLastClaim: todayKey() });
    checkPointsAchievements(np);
  };

  // carrega perfil salvo (nome + código + avatar + tudo)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const prev = await getStudent(shift, studentName);
        if (alive && prev) {
          if (prev.attendance) attendanceRef.current = prev.attendance;
          // tira \r de código salvo ANTES da correção (colado do Windows/Visual Studio) — sem isso o
          // editor ficava com a marcação colorida desalinhada do cursor de verdade nessas linhas
          if (Array.isArray(prev.files) && prev.files.length) setFiles(prev.files.map(f => ({ ...f, code: String(f.code||"").replace(/\r/g, "") })));
          else if (typeof prev.code === "string") setFiles([{ name:"Program.cs", code:prev.code.replace(/\r/g, "") }]);
          if (prev.programmingLanguage) setProgrammingLanguage(prev.programmingLanguage);
          if (Array.isArray(prev.languageHistory)) setLanguageHistory(prev.languageHistory);
          if (prev.quizJoin) setQuizJoin(prev.quizJoin);
          if (prev.quizAnswers) setQuizAnswers(prev.quizAnswers);
          if (prev.avatar) setAvatar(prev.avatar);
          if (prev.score != null) setScore(prev.score);
          if (prev.answers) setAnswers(prev.answers);
          if (prev.dynamicActivity) setDynamicActivity(prev.dynamicActivity);
          if (prev.dynamicSummary) setDynamicSummary(prev.dynamicSummary);
          if (prev.finalFeedback) setFinalFeedback(prev.finalFeedback);
          if (prev.phase && prev.phase !== "generating") setPhase(prev.phase);
          if (prev.classFeedback) {
            setClassFb(prev.classFeedback);
            // o feedback só "trava" a tela se já foi enviado NESTA aula (mesmo dia) — em uma aula nova, pode enviar de novo
            if (isSameDayTs(prev.classFeedback.at)) { setClassRating(prev.classFeedback.rating||0); setClassText(prev.classFeedback.text||""); setClassSent(true); }
          }
          if (prev.feedback) { setFeedback(prev.feedback); setRobotMsg(prev.feedback.message||""); setRobotState(prev.feedback.ok?"ok":"error"); setKeysToShow(prev.feedback.missingChars||[]); }
          if (prev.examReady) setExamReady(true);
          if (prev.examScore != null) setExamScore(prev.examScore);
          if (prev.examAnswers) setExamAnswers(prev.examAnswers);
          if (prev.examDone) setExamDone(true);
          if (prev.examExits) setExamExits(prev.examExits);
          if (prev.examScoreRaw != null) setExamScoreRaw(prev.examScoreRaw);
          if (prev.examAppeal) setExamAppeal(prev.examAppeal);
          if (prev.examScoreSeen) setExamScoreSeen(true);
          if (typeof prev.examOptIn === "boolean") setExamOptIn(prev.examOptIn);
          if (prev.examGuidedMode) setExamGuidedMode(true);
          if (Array.isArray(prev.examGuidedQuestions)) setExamGuidedQuestions(prev.examGuidedQuestions);
          if (prev.examGuidedAnswers) setExamGuidedAnswers(prev.examGuidedAnswers);
          if (prev.examGuidedCorrect) setExamGuidedCorrect(prev.examGuidedCorrect);
          if (prev.helpAt) setHelpAt(prev.helpAt);
          if (prev.wantsPartner) setWantsPartner(prev.wantsPartner);
          if (prev.selfSupport) setSelfSupport(prev.selfSupport);
          if (prev.errorAt) { setErrorAt(prev.errorAt); setErrorMsg(prev.errorMsg || ""); }
          if (prev.typingBest) setTypingBest(prev.typingBest);
          if (prev.typingRewardDay) setTypingRewardDay(prev.typingRewardDay);
          if (prev.knowledgeTestRewardDay) setKnowledgeTestRewardDay(prev.knowledgeTestRewardDay);
          if (prev.giftLastClaim) setGiftLastClaim(prev.giftLastClaim);
          if (prev.theme) setTheme(prev.theme);
          if (prev.themeBeforeSpartan) setThemeBeforeSpartan(prev.themeBeforeSpartan);
          if (prev.treasureFound) setTreasureFound(true);
          if (prev.spartanIntroShown) setSpartanIntroShown(true);
          if (prev.warmupDay) setWarmupDay(prev.warmupDay);
          if (prev.retroSeen) setRetroSeen(prev.retroSeen);
          if (prev.tourneyAnswer) setTourneyAnswer(prev.tourneyAnswer);
          if (prev.tourneyClaimed) setTourneyClaimed(prev.tourneyClaimed);
          if (prev.nyxPoints) setNyxPoints(prev.nyxPoints);
          if (prev.nyxSpent) setNyxSpent(prev.nyxSpent);
          if (prev.duelWins) setDuelWins(prev.duelWins);
          if (prev.weeklyChallenge) setWeeklyChallenge(prev.weeklyChallenge);
          if (prev.nyxGear) {
            // migra quem já tinha o escudo equipado ANTES da correção (quando ele dividia o mesmo
            // slot da espada/arco) pro slot próprio "shield" — sem isso o escudo some da tela dele
            const loadedGear = { ...DEFAULT_NYX_GEAR, ...prev.nyxGear };
            if (loadedGear.hand === "escudo") { loadedGear.hand = null; loadedGear.shield = loadedGear.shield || "escudo"; }
            setNyxGear(loadedGear);
          }
          if (prev.nyxPrefs) setNyxPrefs(prev.nyxPrefs);
          if (prev.birthDate) setBirthDate(prev.birthDate);
          if (prev.cpf) setCpf(prev.cpf);
          // inventário: migra quem já usava itens antes da loja cobrar — o que está equipado vira comprado (de graça)
          {
            const equipped = Object.values(prev.nyxGear || {}).filter(Boolean);
            const owned = Array.isArray(prev.nyxOwned) ? prev.nyxOwned : [];
            setNyxOwned([...new Set([...owned, ...equipped])]);
          }
          if (Array.isArray(prev.achievements)) setAchievements(prev.achievements.filter(id => achievementInfo(id)));
          if (prev.doneAt) setDoneAt(prev.doneAt);
          if (prev.scoreHistory) setScoreHistory(prev.scoreHistory);
          if (prev.summaryHistory) setSummaryHistory(prev.summaryHistory);
          if (prev.detailedSummary) setDetailedSummary(prev.detailedSummary);
          if (prev.detailedSummaryHistory) setDetailedSummaryHistory(prev.detailedSummaryHistory);
          if (Array.isArray(prev.guidedBlocks)) setGuidedBlocks(prev.guidedBlocks);
          if (Array.isArray(prev.guidedLessons)) setGuidedLessons(prev.guidedLessons);
          if (prev.createdAt) createdAtRef.current = prev.createdAt; // preserva a data ORIGINAL de criação (não a da sessão atual)
          if (prev.attendanceFirst) attendanceFirstRef.current = prev.attendanceFirst;
          if (prev.justifications) setJustifications(prev.justifications);
          if (prev.keyboardDone) setKeyboardDone(true);
          if (prev.portfolioPublic) setPortfolioPublic(true);
        }
        // rede de segurança: se um backup local recente tem MAIS código do que o servidor, uma queda de
        // conexão bem na hora de salvar deve ter perdido esse trecho — restaura e resalva pra reconciliar
        try {
          const backup = loadCodeBackupLocal(shift, studentName);
          // janela de 24h: cobre até "a internet caiu no fim da aula e ele só voltou no dia seguinte"
          // (a comparação de tamanho logo abaixo continua impedindo sobrescrever progresso mais novo)
          const backupIsRecent = backup && (Date.now() - backup.at) < 24 * 60 * 60 * 1000;
          if (alive && backupIsRecent && Array.isArray(backup.files) && backup.files.length) {
            const serverFiles = (prev && Array.isArray(prev.files) && prev.files.length) ? prev.files : [];
            const backupLen = backup.files.reduce((n,f) => n + (f.code||"").length, 0);
            const serverLen = serverFiles.reduce((n,f) => n + (f.code||"").length, 0);
            if (backupLen > serverLen) {
              setFiles(backup.files);
              persist({ files: backup.files });
            }
          }
        } catch {}
        try { setAccessModeState(await getAccessMode(shift, studentName)); } catch {}
        try { setSupportFlags(await getSupport(shift, studentName)); } catch {}
        // foto do código do início do dia: se a salva for de outro dia (ou não existir), tira uma nova agora
        {
          const tk = todayKey();
          if (prev?.daySnapshot && prev.daySnapshot.date === tk) {
            daySnapshotRef.current = prev.daySnapshot;
          } else {
            const baseFiles = (prev && Array.isArray(prev.files) && prev.files.length) ? prev.files : [{ name:"Program.cs", code:"" }];
            daySnapshotRef.current = { date: tk, files: baseFiles.map(f => ({ name: f.name, code: f.code || "" })) };
          }
          // foto do código na hora do ÚLTIMO resumo gerado hoje (se existir) — usada pra saber o
          // que é realmente NOVO se o aluno salvar de novo depois do professor passar mais código
          if (prev?.summarySnapshot && prev.summarySnapshot.date === tk) {
            summarySnapshotRef.current = prev.summarySnapshot;
          }
        }
        const es = await getExamStateForStudent(shift);
        if (alive) setExamInfo(es);
      } finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, [studentName, shift]);

  // grava o código no navegador (localStorage) a cada mudança — não depende de internet, então
  // continua funcionando mesmo se a conexão cair bem na hora de salvar no servidor
  useEffect(() => {
    if (!loaded) return; // só depois de carregar o que já existia, pra não sobrescrever um backup bom com o estado inicial vazio
    saveCodeBackupLocal(shift, studentName, files);
  }, [files, loaded, shift, studentName]);

  // busca a curiosidade do dia (gerada uma única vez por dia, reaproveitada por todos os alunos)
  useEffect(() => {
    let alive = true;
    (async () => {
      const today = todayKey();
      let c = await getDailyCuriosity(today);
      if (!c && alive) {
        try {
          // pega as curiosidades dos últimos 14 dias pra IA não repetir sempre a mesma "clássica"
          const past = [];
          const d = new Date();
          for (let i = 1; i <= 14; i++) {
            d.setDate(d.getDate() - 1);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
            past.push(key);
          }
          const prevCuriosities = (await Promise.all(past.map(k => getDailyCuriosity(k))))
            .map(x => x?.text).filter(Boolean);
          const text = await askClaude(
            `Dê UMA curiosidade curta (1-2 frases), divertida e surpreendente sobre programação, C#, tecnologia ou história da computação, para adolescentes que estão começando a programar agora. Sem introdução, direto na curiosidade.` +
            (prevCuriosities.length ? `\n\nCuriosidades já usadas nos últimos dias (NÃO repita nenhuma delas, nem outra bem parecida — traga algo diferente):\n${prevCuriosities.map(t=>`- ${t}`).join("\n")}` : ""),
            NYX_FUN_SYSTEM,
            { temperature: 1 }
          );
          c = { text: text.trim() };
          if (c.text) await setDailyCuriosity(today, c.text);
        } catch { c = null; }
      }
      if (alive && c?.text) setCuriosity(c.text);
    })();
    return () => { alive = false; };
  }, []);

  // ranking e meta da turma: soma/ordena os pontos de todo mundo da mesma turma
  useEffect(() => {
    let alive = true;
    const loadClass = async () => {
      try {
        const all = await listStudents();
        const mine = all.filter(s => (s.shift || "sem-turno") === (shift || "sem-turno"));
        const total = mine.reduce((sum, s) => sum + (s.nyxPoints || 0), 0);
        if (!alive) return;
        setClassPointsSum(total);
        // a turma subiu de nível na meta? festa com confete para todo mundo online 🎉
        const lvl = classGoalProgress(total).level;
        if (goalLevelRef.current != null && lvl > goalLevelRef.current) {
          setGoalParty(lvl);
          playSound("achievement");
          setTimeout(() => setGoalParty(null), 6500);
        }
        goalLevelRef.current = lvl;
      } catch {}
    };
    loadClass();
    const iv = setInterval(loadClass, 15000);
    return () => { alive = false; clearInterval(iv); };
  }, [shift]);

  // heartbeat: registra na hora + atualiza a cada 3s + observa reset, avisos e inatividade
  useEffect(() => {
    if (!loaded) return;
    let active2 = true;
    let currentClassDays = myClassDays;
    const tick = async () => {
      if (!active2) return;
      if (await checkReset(shift, sessionStart.current)) { active2 = false; onLogout(); return; }
      // aviso do professor
      try {
        const n = await getNudge(shift, studentName);
        if (n && n.at && n.at > sessionStart.current) setNudge2(n);
      } catch {}
      // dica automática: entrou mas está parado há mais de 90s sem código
      const s = stateRef.current;
      const codeLen = (s.code || "").trim().length;
      setIdleHint(s.phase === "coding" && codeLen < 10 && (Date.now() - sessionStart.current) > 90000);
      // prova: busca o estado do turno deste aluno (ou a prova combinada, se houver uma)
      try {
        const es = await getExamStateForStudent(shift);
        // alunos do Modo Guiado que escolheram NÃO fazer a prova ficam de fora do cálculo de nota
        // (senão levariam zero quando o professor encerrasse, mesmo sem nunca ter entrado na prova)
        const isGuidedNow = await getAccessMode(shift, studentName).catch(() => false);
        const optedOutOfExam = isGuidedNow && s.examOptIn === false;
        // quem é do Modo Guiado e topou participar faz a versão simplificada — não vale nota
        // oficial, então nunca entra no cálculo de pontuação/ranking da prova de verdade
        const isGuidedParticipant = isGuidedNow && s.examOptIn === true;
        if (es.status === 'done' && !s.examDone && !optedOutOfExam) {
          if (isGuidedParticipant) {
            // só conta os acertos pra dar um feedback simpático — não afeta nota nem ranking
            const gq = s.examGuidedQuestions || GUIDED_PARTICIPATION_QUIZ;
            const ga = s.examGuidedAnswers || {};
            let gpts = 0;
            gq.forEach((q, i) => { if (ga[i] === q.correct) gpts++; });
            try { sessionStorage.removeItem("nyx_exam_open"); } catch {}
            setExamGuidedCorrect(gpts); setExamGuidedMode(true); setExamDone(true);
            const newNyxPoints = (s.nyxPoints || 0) + 10; // bônus fixo por participar, sem ligar pro acerto
            setNyxPoints(newNyxPoints);
            await persist({ examGuidedCorrect: gpts, examGuidedMode: true, examDone: true, nyxPoints: newNyxPoints });
          } else {
            // professor encerrou, calcula pontuação parcial
            const qs = es.questions || [];
            const curA = s.examAnswers || {};
            let pts = 0;
            qs.forEach((q, i) => { if (curA[i] === q.correct) pts++; });
            const rawPartial = pts * 10;
            const penalty = Math.min(rawPartial, (s.examExits || 0) * 10);
            const partial = rawPartial - penalty;
            try { sessionStorage.removeItem("nyx_exam_open"); } catch {}
            setExamScore(partial); setExamScoreRaw(rawPartial); setExamDone(true);
            const newNyxPoints = (s.nyxPoints || 0) + Math.round(partial / 10);
            setNyxPoints(newNyxPoints);
            await persist({ examScore: partial, examScoreRaw: rawPartial, examExits: s.examExits || 0, examDone: true, nyxPoints: newNyxPoints });
            checkPointsAchievements(newNyxPoints);
            if (qs.length && pts / qs.length >= 0.8) unlockAchievement("prova-mestre");
            if (qs.length && pts === qs.length) unlockAchievement("prova-100");
          }
        } else if (es.status === 'idle' && (s.examDone || s.examOptIn != null)) {
          // professor resetou a prova (ou encerrou uma que o aluno tinha optado por não fazer)
          setExamReady(false); setExamScore(null); setExamAnswers({}); setExamDone(false); setExamCurrentQ(0);
          setExamExits(0); setExamScoreRaw(null); setExamAppeal(null); setExamScoreSeen(false); setExamOptIn(null);
          setExamGuidedMode(false); setExamGuidedQuestions(null); setExamGuidedAnswers({}); setExamGuidedCurrentQ(0); setExamGuidedCorrect(0);
          try { sessionStorage.removeItem("nyx_exam_open"); } catch {}
          await persist({ examReady: false, examScore: null, examAnswers: {}, examDone: false, examExits: 0, examScoreRaw: null, examAppeal: null, examScoreSeen: false, examOptIn: null, examGuidedMode: false, examGuidedQuestions: null, examGuidedAnswers: {}, examGuidedCorrect: 0 });
        }
        setExamInfo(es);
      } catch {}
      // travas do professor (zek / zeker)
      try {
        const locks = await getNyxLocks();
        setNyxLocksState({ zek: !!locks.zek, zeker: !!locks.zeker });
      } catch {}
      // 👾 chefão da turma (evento do telão)
      try {
        const b = await getBoss();
        setBossInfo(b && b.status === "active" ? b : null);
      } catch {}
      // 🏟️ torneio da turma (evento do telão): guarda o estado e, se EU sou o campeão e ainda
      // não recebi o prêmio, celebra e dá o bônus uma única vez
      try {
        const t = await getTourney();
        setTourneyInfo(t && t.shift === shift && (t.status === "active" || t.status === "done") ? t : null);
        if (t && t.status === "done" && t.shift === shift && t.champion === studentName && stateRef.current.tourneyClaimed !== t.id) {
          const bonus = 5;
          const newPts = (stateRef.current.nyxPoints || 0) + bonus;
          setTourneyClaimed(t.id);
          setNyxPoints(newPts);
          unlockAchievement("campeao-torneio");
          checkPointsAchievements(newPts);
          setRobotState("ok");
          setRobotMsg(`🏆 CAMPEÃO DO TORNEIO!! Você venceu a turma toda! +${bonus} pontos de prêmio — que orgulho!`);
          setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 10000);
          await persist({ tourneyClaimed: t.id, nyxPoints: newPts });
        }
      } catch {}
      // 🕐 horário automático da turma + 🔍 vistoria (libera este aluno específico fora do horário)
      try {
        const m = await getTeacherMeta();
        setMySchedule((m.schedule || {})[shift] || {});
        setMyAllowWeekend(!!m.allowWeekend);
        setMyInspection(await getInspection(shift, studentName));
        currentClassDays = m.classDays || [];
        setMyClassDays(currentClassDays);
        setMyContentNames(m.contentNames || {});
        // 🎁 retrospectiva do mês liberada pelo professor pra este turno?
        setRetroActive((m.retro || {})[shift] || null);
      } catch {}
      // o professor está escrevendo AGORA em "Meu código"? (salva a cada 1s enquanto ele digita —
      // "escrevendo agora" = salvou nos últimos 6s) usado pro anti-cola: se o aluno estiver
      // distraído em vez de copiando enquanto o professor passa o código, o Nyx traz ele de volta
      try {
        const tc = await getTeacherCode(shift);
        setTeacherWriting(!!(tc && tc.at && Date.now() - tc.at < 6000));
      } catch {}
      // ⌨️ o professor "empurrou" a abertura do tutorial de teclado pra este aluno
      try {
        const launchedAt = await getKeyboardLaunch(shift, studentName);
        if (launchedAt && kbLaunchSeenRef.current !== launchedAt) {
          kbLaunchSeenRef.current = launchedAt;
          setShowKeyboard(true);
        }
      } catch {}
      // modo guiado (acessibilidade) — o professor pode ligar/desligar por aluno a qualquer momento
      try {
        setAccessModeState(await getAccessMode(shift, studentName));
      } catch {}
      // perfis de apoio (calmo/foco/leitura/ritmo) — idem, valem na hora
      try {
        setSupportFlags(await getSupport(shift, studentName));
      } catch {}
      // professor renomeou/moveu/excluiu este perfil → sai da sessão antiga
      try {
        if (await checkKick(shift, studentName, sessionStart.current)) { active2 = false; onLogout(); return; }
      } catch {}
      // professor corrigiu a nota da atividade → aplica e limpa a flag
      try {
        const fix = await getScoreFix(shift, studentName);
        if (fix && fix.kind === "exam" && typeof fix.score === "number") {
          // professor ACEITOU a defesa: devolve os pontos descontados da prova
          const ap = { ...(stateRef.current.examAppeal || {}), status: "accepted" };
          setExamScore(fix.score); setExamAppeal(ap);
          await clearScoreFix(shift, studentName);
          await persist({ examScore: fix.score, examAppeal: ap });
        } else if (fix && fix.kind === "help-attended") {
          // professor marcou o pedido de ajuda como atendido
          setHelpAt(null);
          await clearScoreFix(shift, studentName);
          await persist({ helpAt: null });
        } else if (fix && fix.kind === "partner-request-cleared") {
          // professor pareou (ou dispensou) o pedido de parceiro — desliga o "levantei a mão"
          setWantsPartner(null);
          await clearScoreFix(shift, studentName);
          await persist({ wantsPartner: null });
        } else if (fix && fix.kind === "exam-appeal-rejected") {
          // professor RECUSOU a defesa: desconto mantido
          const ap = { ...(stateRef.current.examAppeal || {}), status: "rejected" };
          setExamAppeal(ap);
          await clearScoreFix(shift, studentName);
          await persist({ examAppeal: ap });
        } else if (fix && fix.kind === "justify-approved" && fix.dateKey) {
          // professor aprovou a justificativa de uma falta — aplica no estado local antes que o
          // próprio autosave periódico sobrescreva o registro inteiro com a versão local desatualizada
          const cur = stateRef.current.justifications || {};
          const nextJ = { ...cur, [fix.dateKey]: { ...cur[fix.dateKey], status: "approved" } };
          setJustifications(nextJ);
          await clearScoreFix(shift, studentName);
          await persist({ justifications: nextJ });
        } else if (fix && fix.kind === "boss-bonus" && typeof fix.amount === "number") {
          // 👾 bônus de pontos por ter causado dano no chefão quando ele foi derrotado
          const np = (stateRef.current.nyxPoints || 0) + fix.amount;
          setNyxPoints(np);
          await clearScoreFix(shift, studentName);
          await persist({ nyxPoints: np });
          checkPointsAchievements(np);
        } else if (fix && typeof fix.score === "number") {
          setScore(fix.score);
          await clearScoreFix(shift, studentName);
          await persist({ score: fix.score });
        }
      } catch {}
      // professor selecionou este aluno e enviou o código da turma → completa só o que falta e
      // corrige o que já existia, sem apagar o que o aluno mesmo escreveu (nunca sobrescreve tudo).
      // Roda em segundo plano (sem "await" aqui) porque a mesclagem por IA pode demorar alguns
      // segundos — sem isso, o tick() inteiro ficava travado esperando, atrasando TODO o resto
      // (avisos do professor, chefão, torneio, nota corrigida etc.) até a IA responder, e se o tick
      // demorasse mais de 12s o próximo já disparava por cima, duplicando efeitos.
      if (!codeSendHandledRef.current) {
        codeSendHandledRef.current = true;
        (async () => {
          try {
            const sent = await getCodeSend(shift, studentName);
            if (sent && Array.isArray(sent.files) && sent.files.length) {
              const currentFiles = stateRef.current.files || files;
              const hasOwnCode = currentFiles.some(f => (f.code||"").trim().length >= 10);
              let mergedFiles = sent.files;
              let mergeSucceeded = false;
              if (hasOwnCode) {
                setRobotMsg("🤖 O professor enviou código novo — só um instante enquanto completo o que falta no seu, sem apagar nada...");
                setRobotState("thinking");
                try {
                  // teto de 35s pra mesclagem (função do servidor tem 30s de maxDuration — ver
                  // vercel.json — o cliente espera um pouco mais que isso pra dar tempo do servidor
                  // responder por conta própria em vez de desistir primeiro por engano). ANTES esse
                  // teto era de só 12s: como a função do servidor nem tinha maxDuration configurado
                  // (ficava no padrão de 10s do Vercel) e o prompt de mesclagem é pesado (2 arquivos
                  // de código inteiros + max_tokens:4000), a mesclagem quase sempre estourava o
                  // tempo e caía no fallback abaixo — SUBSTITUINDO o código do aluno pelo do
                  // professor, exatamente o comportamento que essa função inteira existe pra evitar.
                  const merged = await Promise.race([
                    askClaudeJson(
                      `O professor passou este código pra turma copiar:\n${sent.files.map(f=>`// ===== ${f.name} =====\n${f.code}`).join("\n\n")}\n\nEste aluno JÁ tinha escrito isto no perfil dele (pode estar incompleto ou ter pequenos erros):\n${currentFiles.map(f=>`// ===== ${f.name} =====\n${f.code}`).join("\n\n")}\n\nCrie a versão final dos arquivos: MANTENHA tudo que o aluno já escreveu (não reescreva do zero nem mude o estilo do que já está certo), só ACRESCENTE o que estiver faltando (comparando com o código do professor) e CORRIJA erros de sintaxe/digitação que já existiam no que ele tinha.\n\nResponda APENAS em JSON puro, sem markdown: {"files":[{"name":"nome do arquivo","code":"código final"}]}`,
                      "Você funde com cuidado o código de um aluno com o material novo do professor, sem apagar o esforço dele. Responda APENAS JSON puro.",
                      { max_tokens: 4000 }
                    ),
                    new Promise((_, rej) => setTimeout(() => rej(new Error("merge_timeout")), 35000)),
                  ]);
                  if (Array.isArray(merged.files) && merged.files.length) { mergedFiles = merged.files; mergeSucceeded = true; }
                } catch {}
              }
              setFiles(mergedFiles);
              setActive(0);
              await clearCodeSend(shift, studentName);
              setRobotMsg(mergeSucceeded
                ? "✅ O professor enviou código novo — completei o que faltava no seu, sem apagar o que você já tinha feito!"
                : hasOwnCode
                  ? "✅ O professor enviou código novo! Não consegui mesclar automaticamente a tempo, então apliquei o código dele direto."
                  : "✅ O professor enviou um código novo pra você! Você pode modificar como quiser.");
              setRobotState("ok");
              await persist({ files: mergedFiles });
              setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 5000);
            }
          } catch {}
          codeSendHandledRef.current = false;
        })();
      }
      await persist();
      const streak = computeStreak(attendanceRef.current, currentClassDays);
      setStreakCount(streak);
      if (streak >= 3) unlockAchievement("sequencia-3");
      if (streak >= 7) unlockAchievement("sequencia-7");
      if (streak >= 14) unlockAchievement("sequencia-14");
      const presences = Object.values(attendanceRef.current).filter(v => v === "present").length;
      if (presences >= 5) unlockAchievement("presencas-5");
      if (presences >= 15) unlockAchievement("presencas-15");
      // 🏗️ Arquiteto de Código: 100 linhas de verdade (não vazias) somando todos os arquivos
      const totalLines = (s.files || []).reduce((n, f) => n + (f.code ? f.code.split("\n").filter(l => l.trim()).length : 0), 0);
      if (totalLines >= 100) unlockAchievement("cem-linhas");
    };
    tick();
    const iv = setInterval(tick, 12000);
    return () => { active2 = false; clearInterval(iv); };
  }, [loaded, persist, onLogout, shift, studentName]);

  // robô: só analisa quando o aluno clica no botão (limpa o aviso se apagar o código)
  useEffect(() => {
    const trimmed = activeCode.trim();
    if (trimmed.length < 12) { setRobotState("idle"); setRobotMsg(""); setKeysToShow([]); setFeedback(null); }
  }, [activeCode]);

  // modo guiado: monta o código real a partir da lista de blocos que o aluno clicou (sem precisar digitar)
  const regenerateGuidedCode = (blocks) => blocks.map(b=>b.code).join("\n\n");

  const addGuidedBlock = (block, value) => {
    const code = block.template(value);
    const newBlock = { uid: `${Date.now()}-${Math.random().toString(36).slice(2)}`, id: block.id, emoji: block.emoji, label: block.label, code };
    const updated = [...guidedBlocks, newBlock];
    setGuidedBlocks(updated);
    const fullCode = regenerateGuidedCode(updated);
    setFiles(prev => { const u=[...prev]; u[0] = { ...u[0], code: fullCode }; return u; });
    persist({ guidedBlocks: updated, code: fullCode });
    playSound("click");
    speak(block.speak ? block.speak(value) : block.label);
    setPendingBlock(null);
  };

  const removeGuidedBlock = (uid) => {
    const updated = guidedBlocks.filter(b=>b.uid!==uid);
    setGuidedBlocks(updated);
    const fullCode = regenerateGuidedCode(updated);
    setFiles(prev => { const u=[...prev]; u[0] = { ...u[0], code: fullCode }; return u; });
    persist({ guidedBlocks: updated, code: fullCode });
  };

  const moveGuidedBlock = (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= guidedBlocks.length) return;
    const updated = [...guidedBlocks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setGuidedBlocks(updated);
    const fullCode = regenerateGuidedCode(updated);
    setFiles(prev => { const u=[...prev]; u[0] = { ...u[0], code: fullCode }; return u; });
    persist({ guidedBlocks: updated, code: fullCode });
  };

  // arrastar e soltar: move o bloco de "from" pra posição de "to" (qualquer distância, não só vizinho)
  const reorderGuidedBlock = (from, to) => {
    if (from == null || to == null || from === to || !guidedBlocks[from]) return;
    const updated = [...guidedBlocks];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setGuidedBlocks(updated);
    const fullCode = regenerateGuidedCode(updated);
    setFiles(prev => { const u=[...prev]; u[0] = { ...u[0], code: fullCode }; return u; });
    persist({ guidedBlocks: updated, code: fullCode });
    playSound("snap");
    setGuidedJustDropped(moved.uid);
    setTimeout(() => setGuidedJustDropped(j => j===moved.uid ? null : j), 320);
  };

  const startGuidedDrag = (index) => {
    guidedDragFromRef.current = index;
    setGuidedDragIdx(index);
    setGuidedOverIdx(index);
  };

  // durante o arrasto, acha a fileira de bloco mais próxima do ponteiro (pelo centro vertical de cada
  // uma) — os blocos só trocam de posição de verdade quando o dedo/mouse solta (onUp), nunca durante
  useEffect(() => {
    if (guidedDragIdx == null) return;
    const findClosestIndex = (y) => {
      let closest = null, closestDist = Infinity;
      guidedRowRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const dist = Math.abs(y - mid);
        if (dist < closestDist) { closestDist = dist; closest = i; }
      });
      return closest;
    };
    const onMove = (e) => {
      const y = e.touches ? e.touches[0]?.clientY : e.clientY;
      if (y == null) return;
      if (e.cancelable) e.preventDefault();
      const closest = findClosestIndex(y);
      if (closest != null) setGuidedOverIdx(closest);
    };
    const onUp = () => {
      const from = guidedDragFromRef.current;
      setGuidedOverIdx(currentOver => {
        if (from != null && currentOver != null && currentOver !== from) reorderGuidedBlock(from, currentOver);
        return null;
      });
      guidedDragFromRef.current = null;
      setGuidedDragIdx(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guidedDragIdx]);

  // "Nyx te ensina" no Modo Guiado: gera uma mini-lição nova sob demanda, com o C# explicado através de
  // exemplos de criação de jogos — o professor mantém o Modo Guiado ligado durante a aula toda, e o aluno
  // pode pedir quantas lições quiser nesse tempo (é o "Nyx cria coisas até o final da aula")
  const generateGuidedLesson = async () => {
    if (guidedLessonLoading) return;
    setGuidedLessonLoading(true);
    try {
      const usedBlocks = guidedBlocks.map(b=>b.label).join(", ") || "nenhum bloco ainda";
      const already = guidedLessons.map(l=>l.titulo).join(", ") || "nenhuma";
      const lesson = await askClaudeJson(
        `O aluno já usou estes blocos no programa dele: ${usedBlocks}.\nLições que ele já recebeu antes (NÃO repita o mesmo assunto): ${already}.\n\nCrie UMA mini-lição nova sobre um conceito simples de C#, explicado através de um exemplo de CRIAÇÃO DE JOGOS. Responda APENAS em JSON puro, sem markdown:\n{"emoji":"emoji que combine","titulo":"nome bem curto do conceito","codigo":"1 a 3 linhas de código C# de exemplo (use \\n pra quebrar linha)","oQueFaz":"1 a 2 frases bem simples explicando o que esse código faz","exemploJogo":"1 a 2 frases dando um exemplo de jogo onde isso apareceria"}`,
        NYX_GUIDED_SYSTEM + "\nResponda APENAS JSON puro válido, sem markdown."
      );
      const newLesson = { id:`${Date.now()}-${Math.random().toString(36).slice(2)}`, ...lesson };
      const updated = [newLesson, ...guidedLessons];
      setGuidedLessons(updated);
      await persist({ guidedLessons: updated });
      const speech = [lesson.titulo, lesson.codigo ? `O código é: ${codeForSpeech(lesson.codigo)}` : null, lesson.oQueFaz, lesson.exemploJogo].filter(Boolean).join(". ");
      speak(speech);
    } catch {}
    setGuidedLessonLoading(false);
  };

  // analisa o código tentando os modelos disponíveis em sequência — se o primeiro falhar por
  // qualquer motivo (chave não configurada, instabilidade, etc.), tenta o outro automaticamente
  // e SEM avisar o aluno no meio do caminho; só mostra erro se os dois falharem
  const analyzeCode = async () => {
    const trimmed = activeCode.trim();
    if (trimmed.length < 12 || analyzing) return;
    setRobotState("thinking"); setAnalyzing(true);
    const quick = quickCheck(activeCode);
    if (quick) {
      const fb = { ok:false, message:quick.message, missingChars:quick.missing||[] };
      setRobotState("error"); setRobotMsg(quick.message); setKeysToShow(quick.missing||[]); setFeedback(fb);
      setCodeErrors([]); setShowErrorWalkthrough(false);
      await persist({ feedback:fb, hasError:true });
      setAnalyzing(false);
      return;
    }
    // 🔌 sem internet nenhuma agora: nem tenta chamar a IA (ia falhar de qualquer jeito) — avisa
    // com carinho e marca pra verificar sozinho assim que a conexão voltar
    if (isOffline()) {
      setRobotState("error");
      setRobotMsg("📡 Sem internet agora — seu código já está salvo neste computador. Assim que a conexão voltar, eu verifico automaticamente!");
      pendingAnalyzeRef.current = true;
      setAnalyzing(false);
      return;
    }
    // tenta os dois modelos gratuitos primeiro (na ordem de sempre) e, só se os DOIS falharem de
    // verdade (é aí que aparece "Reconectando Nyx"), usa a Anthropic (Sonnet 5) como último recurso —
    // assim o aluno não fica travado esperando o gratuito voltar, mas o gasto pago só entra quando precisa
    const order = [lastProviderRef.current, ANALYZE_PROVIDERS.find(p => p !== lastProviderRef.current), "anthropic"];
    let lastErr = null;
    for (const provider of order) {
      try {
        const parsed = await askClaudeJson(
          `Revise o código ${studyLang ? studyLang.label : "C#"} de um aluno iniciante como um COMPILADOR faria, linha por linha.\n\n${otherFilesCtx(files, active, studyLang)}Arquivo em edição — é ESTE e SÓ ESTE que você deve revisar (${files[active]?.name || "Program.cs"}):\n\`\`\`${studyLang ? studyLang.codeLang : "csharp"}\n${activeCode}\n\`\`\`\n\nO que verificar (nesta ordem):\n${reviewChecklistFor(studyLang)}\n\nLembretes IMPORTANTES:\n- Os "Outros arquivos" (se houver) são SÓ contexto, pra você saber que existem e podem ser usados no arquivo em edição — NUNCA os revise, NUNCA aponte erro neles, e NUNCA copie um "trecho" retirado deles. Cada "trecho" de erro tem que ser uma linha que existe literalmente no arquivo em edição.${studyLang ? "" : "\n- Top-level statements (código sem class/Main) e ausência de using System são VÁLIDOS — não são erro.\n- Não aponte classe/método \"inexistente\" se estiver definido em outro arquivo do projeto."}\n- NÃO invente erro em código correto. Na dúvida real, prefira ok=true.\n\nResponda APENAS em JSON puro, sem markdown, com os campos NESTA ordem:\n{"analise": "sua verificação rápida linha a linha, citando o que conferiu (máx 3 frases — o aluno não vê isto)", "ok": true ou false, "message": "se tudo certo: elogio bem curto; se houver erro: onde está (linha/trecho) e como corrigir mostrando a forma certa, em 1 a 3 frases gentis", "missingChars": ["só símbolos que faltam, ex: ; } ) — vazio se nenhum"], "errors": ["se ok for false: uma lista com CADA erro encontrado no arquivo em edição (pode ter mais de um). Cada item é um objeto {\\"trecho\\": a linha EXATA e completa como aparece no ARQUIVO EM EDIÇÃO (nunca nos outros arquivos), copiada literalmente, sem espaços extras no início; \\"explicacao\\": por que está errado e como corrigir, 1 a 2 frases bem simples e gentis; \\"exemplo\\": a mesma linha já corrigida}. Lista vazia se ok for true."]}`,
          (studyLang ? studyLang.system : CS_SYSTEM) + "\nResponda APENAS JSON puro, sem markdown." + nyxPrefsInstruction(nyxPrefs),
          { temperature: 0, provider }
        );
        // só lembra o modelo GRATUITO que funcionou (pra próxima vez tentar ele primeiro de novo) —
        // o Sonnet 5 é só reserva de emergência, não deve virar o preferido
        if (provider !== "anthropic") lastProviderRef.current = provider;
        setRobotState(parsed.ok?"ok":"error"); setRobotMsg(parsed.message); setKeysToShow(parsed.missingChars||[]); setFeedback(parsed);
        await persist({ feedback:parsed, hasError:!parsed.ok });
        if (parsed.ok) {
          unlockAchievement("codigo-limpo");
          setCodeErrors([]); setShowErrorWalkthrough(false);
        } else {
          const errs = (Array.isArray(parsed.errors) ? parsed.errors : []).filter(e => e && e.trecho && findLineIndex(activeCode, e.trecho) >= 0);
          setCodeErrors(errs);
          if (errs.length > 0) { setErrorWalkStep(0); setShowErrorWalkthrough(true); }
        }
        lastErr = null;
        break; // deu certo — não precisa tentar o próximo modelo
      } catch (e) {
        lastErr = e; // guarda e tenta o próximo modelo da lista, sem avisar o aluno ainda
      }
    }
    if (lastErr) {
      if (lastErr.message === 'ROBOTKEY_MISSING') {
        setRobotState("error");
        setRobotMsg(lastErr.userMsg || "🔑 Nyx está offline: o professor precisa configurar a chave da IA no painel do Vercel. A verificação básica do código continua funcionando!");
      } else if (isNetworkError(lastErr)) {
        setRobotState("error");
        setRobotMsg("📡 A internet caiu bem na hora de verificar — mas seu código está salvo! Assim que a conexão voltar, eu verifico automaticamente.");
        pendingAnalyzeRef.current = true;
      } else {
        setRobotState("error");
        setRobotMsg(`😵 Nyx tentou analisar com todos os modelos disponíveis e nenhum respondeu agora. Tente de novo em instantes.\n\n🔧 Detalhe técnico (pra mostrar ao Vegapunk): ${lastErr.message || lastErr}`);
      }
    }
    setAnalyzing(false);
  };

  // enquanto houver erros sinalizados, sublinha em vermelho a linha correspondente no editor — some sozinho
  // quando o aluno edita a linha (e, se todos sumirem por edição, o Nyx reanalisa sozinho pra confirmar)
  const errorLinesForEditor = codeErrors.map(e => findLineIndex(activeCode, e.trecho)).filter(i => i >= 0);
  const [pendingAutoVerify, setPendingAutoVerify] = useState(false);
  useEffect(() => {
    if (!codeErrors.length) return;
    const stillPresent = codeErrors.filter(e => findLineIndex(activeCode, e.trecho) >= 0);
    if (stillPresent.length !== codeErrors.length) {
      setCodeErrors(stillPresent);
      if (stillPresent.length === 0) {
        setShowErrorWalkthrough(false);
        setPendingAutoVerify(true); // todas as linhas sinalizadas foram editadas -> arma a reverificação
      } else {
        setErrorWalkStep(s => Math.min(s, stillPresent.length - 1));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCode]);
  // debounce da reverificação automática: reagenda a CADA tecla enquanto estiver pendente, pra sempre usar
  // o código mais atual (sem isso, o timer poderia disparar com um estado intermediário desatualizado,
  // por exemplo bem no meio de um Ctrl+A+Delete + digitar de novo)
  useEffect(() => {
    if (!pendingAutoVerify) return;
    const t = setTimeout(() => { setPendingAutoVerify(false); analyzeCode(); }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCode, pendingAutoVerify]);

  // auto-análise silenciosa: se o aluno ficar 5 minutos inteiros sem digitar nada, o Nyx confere
  // o código sozinho — sem avisar antes que vai analisar, só reagenda o timer a cada tecla
  useEffect(() => {
    if (analyzing || activeCode.trim().length < 12) return;
    const t = setTimeout(() => { analyzeCode(); }, 5 * 60000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCode, analyzing]);

  // anti-cola geral: o professor está passando código pra copiar (escrevendo em "Meu código" agora)
  // e este aluno está distraído (loja, teclado ou duelo) em vez de copiar — depois de 10s parado
  // nessa distração, o Nyx traz ele de volta sozinho pro editor, sem avisar nada antes
  useEffect(() => {
    const distracted = showNyxShop || showKeyboard || showDuel || showTeamDuel;
    if (!teacherWriting || !distracted) return;
    const t = setTimeout(() => {
      setShowNyxShop(false);
      setShowKeyboard(false);
      setShowDuel(false);
      setShowTeamDuel(false);
    }, 10000);
    return () => clearTimeout(t);
  }, [teacherWriting, showNyxShop, showKeyboard, showDuel, showTeamDuel]);

  // arquivos — na sala de linguagens a extensão padrão acompanha a linguagem escolhida (.html/.css/.php/.js)
  const fileExt = studyLang ? `.${studyLang.fileName.split(".").pop()}` : ".cs";
  const updateActiveCode = (newCode) => setFiles(fs => fs.map((f,i)=> i===active ? { ...f, code:newCode } : f));
  const uniqueName = (base, ignoreIdx=-1) => {
    let name = base, n = 2;
    const extRe = new RegExp(`\\${fileExt}$`, "i");
    while (files.some((f,i)=> i!==ignoreIdx && f.name.toLowerCase()===name.toLowerCase())) {
      name = base.replace(extRe, "") + n + fileExt; n++;
    }
    return name;
  };
  const addFile = () => {
    const name = uniqueName(`Arquivo${files.length+1}${fileExt}`);
    const newIdx = files.length;
    setFiles(fs => [...fs, { name, code:"" }]);
    setActive(newIdx);
    setRenaming(newIdx);           // já abre para o aluno nomear
    setRenameValue(name.replace(new RegExp(`\\${fileExt}$`, "i"), ""));
  };
  const deleteFile = (idx) => {
    if (files.length <= 1) return;
    setFiles(fs => fs.filter((_,i)=>i!==idx));
    setActive(a => (idx<=a ? Math.max(0,a-1) : a));
  };
  const openRename = (idx) => { setRenaming(idx); setRenameValue((files[idx]?.name || "").replace(new RegExp(`\\${fileExt}$`, "i"), "")); };
  const confirmRename = () => {
    if (renaming == null) return;
    let base = String(renameValue).trim().replace(/["'\/\\]/g, "");
    if (!base) base = `Arquivo${renaming+1}`;
    let name = new RegExp(`\\${fileExt}$`, "i").test(base) ? base : base + fileExt;
    name = uniqueName(name, renaming);
    const idx = renaming;
    setFiles(fs => fs.map((f,i)=> i===idx ? { ...f, name } : f));
    setRenaming(null); setRenameValue("");
  };
  const cancelRename = () => { setRenaming(null); setRenameValue(""); };

  const setThemeAndSave = (t) => { setTheme(t); persist({ theme: t }); };
  const handleNyxTheme = (t) => { setThemeAndSave(t); if (String(t).startsWith("#")) unlockAchievement("artista"); };

  // 🌟 portfólio público: só o próprio aluno liga (opt-in) — o professor pode desligar se precisar
  const togglePortfolioPublic = () => { const next = !portfolioPublic; setPortfolioPublic(next); persist({ portfolioPublic: next }); };
  const portfolioLink = `${typeof window !== "undefined" ? window.location.origin : ""}/portfolio/${encodeURIComponent(shift || "matutino")}/${encodeURIComponent(studentName)}`;
  const copyPortfolioLink = async () => {
    try { await navigator.clipboard.writeText(portfolioLink); setPortfolioCopyMsg("🔗 Link copiado!"); }
    catch { setPortfolioCopyMsg(portfolioLink); }
    setTimeout(() => setPortfolioCopyMsg(""), 4000);
  };

  // desbloqueia as conquistas de pontos acumulados (nyxPoints é o total GANHO, nunca diminui)
  const checkPointsAchievements = (total) => {
    if (total >= 10) unlockAchievement("pontos-10");
    if (total >= 50) unlockAchievement("pontos-50");
    if (total >= 100) unlockAchievement("pontos-100");
    if (total >= 250) unlockAchievement("pontos-250");
  };

  const toggleMuted = () => { setMuted(m => { setSoundsMuted(!m); return !m; }); };

  // desbloqueia a conquista "Caçador Lendário" quando TODOS os Easter Eggs já tiverem sido achados
  const checkAllEggsFound = () => {
    const current = stateRef.current.achievements || [];
    if (ALL_EGG_ACHIEVEMENT_IDS.every(id => current.includes(id))) unlockAchievement("todos-segredos");
  };

  // desbloqueia uma conquista (se ainda não tiver) e mostra o aviso animado
  // lê/escreve via stateRef para funcionar mesmo chamada de dentro de closures "velhas" (ex: o heartbeat)
  const unlockAchievement = (id) => {
    const current = stateRef.current.achievements || [];
    if (current.includes(id)) return;
    const next = [...current, id];
    stateRef.current.achievements = next;
    setAchievements(next);
    persist({ achievements: next });
    setNewAchievement(achievementInfo(id));
    playSound("achievement");
    fireConfetti("achievement");
    setTimeout(() => setNewAchievement(null), 4000);
  };

  // 🏗️ desafio livre da semana: o aluno propõe uma ideia, o Nyx quebra em passos e o progresso
  // fica salvo no próprio perfil — reseta sozinho quando a semana (ISO, segunda a domingo) vira
  const saveWeeklyChallenge = async (challenge) => {
    setWeeklyChallenge(challenge);
    await persist({ weeklyChallenge: challenge });
  };
  const toggleChallengeStep = async (i) => {
    if (!weeklyChallenge) return;
    const doneSteps = weeklyChallenge.doneSteps.includes(i) ? weeklyChallenge.doneSteps.filter(x=>x!==i) : [...weeklyChallenge.doneSteps, i];
    const updated = { ...weeklyChallenge, doneSteps };
    setWeeklyChallenge(updated);
    await persist({ weeklyChallenge: updated });
  };
  const finishWeeklyChallenge = async () => {
    const s = stateRef.current;
    if (!s.weeklyChallenge || s.weeklyChallenge.status === "done") return;
    const updated = { ...s.weeklyChallenge, status: "done", completedAt: Date.now() };
    const np = (s.nyxPoints||0) + 10; // bônus generoso — é um desafio da semana inteira, não uma atividade rápida
    stateRef.current = { ...s, weeklyChallenge: updated, nyxPoints: np };
    setWeeklyChallenge(updated);
    setNyxPoints(np);
    await persist({ weeklyChallenge: updated, nyxPoints: np });
    checkPointsAchievements(np);
    unlockAchievement("livre-pensador");
    setShowFreeBuild(false);
  };

  // ⚔️🛡️ espada + escudo equipados juntos: o Nyx vira um Espartano. No instante em que o combo se
  // forma, troca sozinho o tema de fundo pro tema Espartano (guardando o de antes) — o aluno decide
  // depois, no botão do cabeçalho, se fica com ele ou volta pro tema de sempre; nada disso mexe no
  // editor de código em si, só no fundo da página.
  const isSpartan = nyxGear?.hand === "espada" && nyxGear?.shield === "escudo";
  useEffect(() => {
    if (isSpartan && theme !== "spartan") {
      const prevTheme = themeBeforeSpartan || theme;
      setThemeBeforeSpartan(prevTheme);
      setTheme("spartan");
      persist({ theme: "spartan", themeBeforeSpartan: prevTheme });
      unlockAchievement("espartano");
      checkAllEggsFound();
    }
    // fala de guerreiro Espartano só na primeira vez que o combo é formado NA VIDA do aluno —
    // depois disso, mesmo desequipando e equipando de novo, ela não repete
    if (isSpartan && !spartanIntroShown) {
      setSpartanIntroShown(true);
      persist({ spartanIntroShown: true });
      setRobotState("ok");
      setRobotMsg("🛡️ ISTO... É... C#!! Nenhum erro de compilação assusta um guerreiro Espartano. Vamos à batalha pelo código perfeito!");
      setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 10000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpartan]);

  // 🥚 segredos escondidos na área do aluno (antigos comandos de terminal, agora achados clicando)
  const HIDDEN_EGG_ACHIEVEMENTS = { sanduiche:"segredo-sanduiche", cafe:"segredo-cafe", "42":"segredo-42", rm:"segredo-rm" };
  const triggerEgg = (kind) => {
    unlockAchievement("segredo");
    if (HIDDEN_EGG_ACHIEVEMENTS[kind]) unlockAchievement(HIDDEN_EGG_ACHIEVEMENTS[kind]);
    checkAllEggsFound();
    const msgs = {
      sanduiche: ["🥪 Ei! Achou a migalha escondida... aqui está seu lanchinho imaginário. Bora continuar codando!", 6000],
      cafe:      ["☕ Aaah, muito obrigado pelo café! Bora codar com tudo agora!", 6000],
      "42":      ["🌌 A resposta para a vida, o universo e tudo mais... é 42! (Se não entendeu, pesquise 'O Guia do Mochileiro das Galáxias')", 7000],
      rm:        ["😅 Boa tentativa! Mas esse cantinho aqui é só de mentirinha — nada se apaga de verdade.", 6000],
    };
    const found = msgs[kind];
    if (found) { setRobotState("ok"); setRobotMsg(found[0]); setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, found[1]); }
  };

  // 🏴‍☠️ baú do tesouro escondido: só concede os 500 pontos uma única vez por aluno — lê/escreve
  // via stateRef, mesmo motivo do openGift (clique duplo bem rápido no ícone escondido)
  const findTreasure = () => {
    const s = stateRef.current;
    if (s.treasureFound) return;
    const np = (s.nyxPoints||0) + 500;
    stateRef.current = { ...s, treasureFound: true, nyxPoints: np };
    setTreasureFound(true);
    setNyxPoints(np);
    playSound("achievement");
    persist({ treasureFound: true, nyxPoints: np });
    unlockAchievement("tesouro");
    checkAllEggsFound();
    checkPointsAchievements(np);
    setRobotState("ok");
    setRobotMsg("🏴‍☠️ VOCÊ ACHOU O TESOURO ESCONDIDO! +500 pontos do Nyx! Muito bem, caçador(a)!");
    setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 8000);
  };

  // segredos do Terminal que reagem na tela do aluno (os outros só mostram texto no próprio terminal)
  const TERMINAL_EGG_ACHIEVEMENTS = { moo:"segredo-vaca", dance:"segredo-danca", matrix:"segredo-matrix", piada:"segredo-piada", piratahat:"segredo-pirata" };
  const handleEasterEgg = (egg) => {
    unlockAchievement("segredo");
    if (TERMINAL_EGG_ACHIEVEMENTS[egg]) unlockAchievement(TERMINAL_EGG_ACHIEVEMENTS[egg]);
    checkAllEggsFound();
    if (egg === "dance") { setRobotState("ok"); setRobotMsg("💃 Você achou meu passo de dança secreto! Não conta pra ninguém... ou conta, vai ser divertido."); setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 6000); }
    if (egg === "piratahat") {
      if (!nyxOwned.includes("chapeuPirata")) {
        const newOwned = [...nyxOwned, "chapeuPirata"];
        setNyxOwned(newOwned);
        persist({ nyxOwned: newOwned });
      }
      setRobotState("ok");
      setRobotMsg("🏴‍☠️ Arrr! Você desbloqueou o Chapéu Pirata na Loja do Nyx! Vá até a loja pra vestir.");
      setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 6000);
    }
  };

  // ao equipar o Chapéu Pirata, o Nyx pega um baú e solta a fala clássica — só na hora em que veste
  const handleEquipGear = (newGear) => {
    const wasPirateHat = nyxGear.head === "chapeuPirata";
    setNyxGear(newGear);
    persist({ nyxGear: newGear });
    if (newGear.head === "chapeuPirata" && !wasPirateHat) {
      setRobotState("ok");
      setRobotMsg("🏴‍☠️ Argh! Olhem só, um chapéu de pirata!\n\n\"Quer o meu tesouro? Procure-o... nele há tudo o que essa plataforma pode oferecer.\"");
      setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 10000);
    }
  };

  // 🥚 os segredos escondidos ficam espalhados por TODA a área do aluno (programar, resumo,
  // atividade, tela de "concluído") — não só a tela de código — sempre com position:fixed pra
  // existirem em qualquer uma dessas telas sem nunca atrapalhar o que está em primeiro plano
  const renderHiddenEggs = () => (
    <>
      <span onClick={()=>triggerEgg("sanduiche")} title="" style={{ position:"fixed", bottom:8, left:8, fontSize:17, opacity:0.16, zIndex:3, cursor:"default", userSelect:"none" }}>🥪</span>
      <span onClick={()=>triggerEgg("cafe")} title="" style={{ position:"fixed", right:8, top:"50%", transform:"translateY(-50%)", fontSize:17, opacity:0.15, zIndex:3, cursor:"default", userSelect:"none" }}>☕</span>
      <span onClick={()=>triggerEgg("42")} title="" style={{ position:"fixed", bottom:8, right:8, fontSize:17, opacity:0.16, zIndex:3, cursor:"default", userSelect:"none" }}>🌌</span>
      <span onClick={()=>triggerEgg("rm")} title="" style={{ position:"fixed", left:8, top:"50%", transform:"translateY(-50%)", fontSize:17, opacity:0.15, zIndex:3, cursor:"default", userSelect:"none" }}>🗑️</span>
      <span onClick={findTreasure} title="" style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:16, height:16, lineHeight:"16px", textAlign:"center", fontSize:12, opacity:0.07, zIndex:3, cursor:"default", userSelect:"none" }}>🏴‍☠️</span>
    </>
  );

  // compra um item na Loja do Nyx: gasta os pontos (nyxSpent), entra pro inventário e já equipa
  // lê/escreve via stateRef (não os closures de nyxOwned/nyxSpent/nyxGear) pra dois cliques bem
  // rápidos seguidos (comum na tela touch da carreta) não passarem os dois pela checagem com o
  // mesmo estado "antigo" e um deles sobrescrever o outro sem gastar/registrar o item direito
  const handleBuyItem = async (item) => {
    const s = stateRef.current;
    if ((s.nyxOwned||[]).includes(item.id) || ((s.nyxPoints||0) - (s.nyxSpent||0)) < item.cost) return;
    const newSpent = (s.nyxSpent||0) + item.cost;
    const newOwned = [...(s.nyxOwned||[]), item.id];
    const newGear = { ...(s.nyxGear||DEFAULT_NYX_GEAR), [item.slot]: item.id };
    stateRef.current = { ...s, nyxSpent: newSpent, nyxOwned: newOwned, nyxGear: newGear };
    setNyxSpent(newSpent);
    setNyxOwned(newOwned);
    setNyxGear(newGear);
    playSound("achievement");
    await persist({ nyxSpent: newSpent, nyxOwned: newOwned, nyxGear: newGear });
    unlockAchievement("comprador");
    if (newOwned.length >= 4) unlockAchievement("colecionador");
  };

  // Nyx explica os erros da atividade — gera tudo de uma vez (rápido) e depois revela passo a passo num modal
  const explainErrors = async () => {
    const activity = dynamicActivity || [];
    // a questão bônus nunca entra na explicação de erros — errar ou pular ela não é "erro de verdade"
    const wrong = activity.map((q,i)=>({ q, i })).filter(({ q, i }) => !q.bonus && answers[i] !== q.correct);
    if (!wrong.length || explaining) return;
    setExplaining(true);
    setExplainFailMsg("");
    try {
      const list = wrong.map(({ q, i }) => `Pergunta: ${q.q}\nO aluno respondeu: ${q.opts[answers[i]] ?? "(não respondeu)"}\nResposta correta: ${q.opts[q.correct]}`).join("\n\n");
      const langName = studyLang ? studyLang.label : "C#";
      const parsed = await askClaudeJson(
        `Um aluno iniciante errou estas questões sobre o próprio código ${langName} dele:\n\n${list}\n\nPara CADA questão errada, crie uma seção explicando o conceito de forma simples e gentil: por que a resposta certa é a certa e onde ele provavelmente se confundiu, seguida de um EXEMPLO CURTO de código ${langName} correto que ilustre bem o conceito (pode ser um exemplo didático, não precisa ser do código dele). No final, escreva UMA mensagem curta e encorajadora olhando o desempenho geral dele.\n\nResponda APENAS em JSON puro, sem markdown:\n{"secoes":[{"emoji":"emoji que combine com o conceito","titulo":"nome curto do conceito","explicacao":"1 a 3 frases simples e gentis","exemplo":"código ${langName} curto e correto (use \\n para quebrar linha)"}],"encorajamento":"mensagem final motivadora, 1 a 2 frases"}`,
        (studyLang ? studyLang.system : CS_SYSTEM) + "\nResponda APENAS JSON puro, sem markdown." + nyxPrefsInstruction(nyxPrefs),
        { temperature: 0.5 }
      );
      const secoes = Array.isArray(parsed.secoes) ? parsed.secoes : [];
      if (!secoes.length) throw new Error("sem seções");
      setErrorSections(secoes);
      setErrorEncouragement(parsed.encorajamento || "Continue praticando, você está indo muito bem!");
      setShowErrorExplain(true);
    } catch { setExplainFailMsg("Não consegui gerar as explicações agora. Tente de novo em instantes."); }
    setExplaining(false);
  };

  // todo o código do projeto do aluno, em TODOS os arquivos (não só a aba aberta)
  const allCodeToday = () => (files||[]).filter(f=>(f.code||"").trim()).map(f=>`// ===== ${f.name} =====\n${f.code}`).join("\n\n");

  // compara o código atual com uma "foto" anterior (do início do dia, ou do último resumo gerado)
  // e devolve só as linhas que ainda não estavam lá — usado tanto pro resumo do dia quanto pra
  // saber o que é realmente NOVO se o aluno salvar de novo depois do professor passar mais código
  const codeWrittenSince = (snapshotFiles) => {
    const oldByName = Object.fromEntries((snapshotFiles || []).map(f => [f.name, f.code || ""]));
    return (files || [])
      .map(f => {
        const oldCode = oldByName[f.name];
        if (oldCode == null || !oldCode.trim()) return { name: f.name, code: f.code || "" }; // arquivo novo (ou vazio antes): tudo é novo
        const oldLines = new Set(oldCode.split("\n").map(l => l.trim()).filter(Boolean));
        const newLines = (f.code || "").split("\n").filter(l => l.trim() && !oldLines.has(l.trim()));
        return { name: f.name, code: newLines.join("\n") };
      })
      .filter(f => (f.code || "").trim())
      .map(f => `// ===== ${f.name} =====\n${f.code}`)
      .join("\n\n");
  };
  // só o que foi escrito HOJE: compara o código atual com a "foto" tirada no primeiro acesso do dia
  const codeWrittenToday = () => codeWrittenSince(daySnapshotRef.current?.files);
  // só o que foi escrito DEPOIS do último resumo gerado hoje (pra continuação do resumo)
  const codeWrittenSinceLastSummary = () => codeWrittenSince(summarySnapshotRef.current?.files);

  const handleSave = async () => {
    const fullCode = allCodeToday();
    if (fullCode.trim().length < 10) { setSaveWarn("✏️ Escreva algum código antes de salvar!"); setTimeout(()=>setSaveWarn(""), 4000); return; }
    // 🔌 sem internet nenhuma: nem entra na tela de "gerando" (que ia travar esperando uma resposta
    // que nunca chega) — avisa que o código está salvo e tenta de novo sozinho quando a conexão voltar
    if (isOffline()) {
      pendingSaveRef.current = true;
      setSaveWarn("📡 Sem internet agora — seu código já está salvo! Assim que a conexão voltar, gero o resumo e a atividade automaticamente.");
      setTimeout(()=>setSaveWarn(""), 7000);
      return;
    }
    setAnswers({});
    setDetailedSummary(""); setSummaryView("simples"); setDetailFailMsg(""); // aula nova: zera a versão detalhada da aula anterior
    setPhase("generating");
    setGeneratingMsg("📖 Lendo seu código...");
    await persist({ phase:"generating", answers:{} });
    try {
      setGeneratingMsg("📚 Criando o resumo e a atividade da sua aula...");
      const todayCode = codeWrittenToday();
      const hasTodayDiff = todayCode.trim().length >= 10 && todayCode.trim() !== fullCode.trim();
      // se já existe um resumo de hoje (o aluno salvou antes e o professor passou mais código
      // depois), o próximo resumo é uma CONTINUAÇÃO — só as seções novas, sem repetir o que já tinha
      const existingSummary = summaryHistory[todayKey()];
      const isContinuation = existingSummary && typeof existingSummary === "object" && Array.isArray(existingSummary.secoes) && existingSummary.secoes.length > 0;
      const novoCode = isContinuation ? codeWrittenSinceLastSummary() : "";
      const simpleReq = isContinuation
        ? buildContinuationSummaryRequest(existingSummary, novoCode.trim() ? novoCode : todayCode, fullCode, studyLang, nyxPrefs)
        : buildSummaryRequest("simples", hasTodayDiff, todayCode, fullCode, studyLang, nyxPrefs);
      const difficultyHint = recentDifficultyHint(scoreHistory);
      // 🎯 dificuldade adaptativa: quem está com dificuldade ganha uma "dica" em cada questão (ajuda
      // a pensar no conceito certo sem entregar a resposta); quem está indo muito bem ganha uma
      // questão BÔNUS extra, opcional, mais desafiadora — não atrapalha nem penaliza quem não é nenhum dos dois
      const adaptiveTier = adaptiveDifficultyTier(scoreHistory);
      const adaptiveExtra =
        adaptiveTier === "baixa" ? `\n\nComo esse aluno tem tido dificuldade, adicione em CADA questão um campo "dica": uma frase curta que ajuda a lembrar do conceito certo SEM entregar qual alternativa é a correta.` :
        adaptiveTier === "alta" ? `\n\nComo esse aluno tem ido muito bem, crie TAMBÉM UMA questão BÔNUS a mais (além das ${ownPace ? "4" : "8"} normais), mais desafiadora que as outras, marcada com "bonus": true no JSON — ela é opcional pro aluno, vale um ponto extra se acertar e não desconta nada se ele pular ou errar.` :
        "";
      // resumo e atividade são pedidos ao Nyx AO MESMO TEMPO (não um depois do outro) para não somar o tempo de espera dos dois
      const [summaryResult, activityResult] = await Promise.all([
        askClaude(simpleReq.prompt, simpleReq.system),
        askClaude(
          `Um aluno de ${studyLang ? studyLang.label : "C#"} escreveu este código na aula de hoje (pode ter mais de um arquivo, todos do mesmo projeto):\n\`\`\`${studyLang ? studyLang.codeLang : "csharp"}\n${fullCode}\n\`\`\`\n\nCrie ${ownPace ? "4" : "8"} questões de múltipla escolha${ownPace ? " BEM diretas e fáceis (uma ideia por questão, frases curtas)" : ""} focadas em CONCEITOS DE CÓDIGO que aparecem no que ele escreveu, olhando TODOS os arquivos: o que faz cada palavra-chave/instrução, para que serve cada estrutura, o papel de cada símbolo, a função de cada tipo de dado, e o que acontece ao executar cada parte. Varie a dificuldade (algumas fáceis, algumas médias). NÃO faça perguntas de matemática.${difficultyHint || ""}${adaptiveExtra}\n\nResponda APENAS JSON puro sem markdown:\n{"questions":[{"q":"pergunta","opts":["A","B","C","D"],"correct":0,"dica":"(opcional, só se pedido acima) dica que não entrega a resposta","bonus":false}]}`,
          `Crie questões sobre conceitos de código ${studyLang ? studyLang.label : "C#"}, não matemática. APENAS JSON puro.`
        ),
      ]);
      let summaryData;
      try { summaryData = extractJson(summaryResult); }
      catch {
        // primeira resposta veio malformada — insiste uma vez em JSON puro em vez de cair pro texto
        // cru da IA (era isso que aparecia como "escrita confusa" pro aluno)
        try {
          const retryResult = await askClaude(simpleReq.prompt + "\n\nATENÇÃO: responda SOMENTE o objeto JSON válido, sem nenhum texto antes ou depois.", simpleReq.system);
          summaryData = extractJson(retryResult);
        } catch { summaryData = null; }
      }
      const finalSummary = isContinuation && summaryData
        ? mergeSummaryContinuation(existingSummary, summaryData)
        : (isContinuation ? existingSummary : (summaryData || { secoes: [] })); // se a continuação falhar, mantém o resumo que já existia (nunca perde o que já tinha)
      setDynamicSummary(finalSummary);
      const parsed = extractJson(activityResult);
      const questions = shuffleQuestions(parsed.questions);
      setDynamicActivity(questions);
      // guarda o resumo de hoje no caderno (para o aluno rever depois) e a "foto" do código
      // usada da próxima vez pra saber o que é realmente novo, se o professor passar mais coisa
      const newSummaryHistory = { ...summaryHistory, [todayKey()]: finalSummary };
      setSummaryHistory(newSummaryHistory);
      summarySnapshotRef.current = { date: todayKey(), files: (files||[]).map(f => ({ name:f.name, code:f.code||"" })) };
      await persist({ phase:"summary", dynamicActivity:questions, dynamicSummary:finalSummary, summaryHistory: newSummaryHistory, summarySnapshot: summarySnapshotRef.current });
      setPhase("summary");
      if (isLangRoom) unlockAchievement("primeira-pagina");
    } catch (e) {
      if (isNetworkError(e)) {
        pendingSaveRef.current = true;
        setGeneratingMsg("📡 A internet caiu bem nessa hora — seu código está salvo! Vou gerar o resumo e a atividade sozinho assim que a conexão voltar.");
      } else {
        setGeneratingMsg("❌ Erro ao gerar. Tente novamente.");
      }
      setTimeout(() => { setPhase("coding"); persist({ phase:"coding" }); }, 2500);
    }
  };

  // 🔌 modo offline total: assim que a internet voltar, tenta sozinho de novo o que ficou pendente
  // (análise ou salvar/gerar atividade) — o aluno não precisa perceber que caiu e clicar de novo
  useEffect(() => {
    const onBackOnline = () => {
      if (pendingAnalyzeRef.current) { pendingAnalyzeRef.current = false; analyzeCode(); }
      if (pendingSaveRef.current) { pendingSaveRef.current = false; handleSave(); }
    };
    window.addEventListener("online", onBackOnline);
    return () => window.removeEventListener("online", onBackOnline);
  }, [analyzeCode, handleSave]);

  // versão detalhada do resumo, pedida sob demanda (só quando o aluno clica) — gerada uma vez e guardada
  const fetchDetailedSummary = async () => {
    if (detailedSummary) { setSummaryView("detalhado"); return; }
    setDetailLoading(true); setDetailFailMsg("");
    try {
      const fullCode = allCodeToday();
      const todayCode = codeWrittenToday();
      const hasTodayDiff = todayCode.trim().length >= 10 && todayCode.trim() !== fullCode.trim();
      const { prompt, system } = buildSummaryRequest("detalhado", hasTodayDiff, todayCode, fullCode, studyLang, nyxPrefs);
      const data = await askClaudeJson(prompt, system);
      setDetailedSummary(data);
      const newDetailedHistory = { ...detailedSummaryHistory, [todayKey()]: data };
      setDetailedSummaryHistory(newDetailedHistory);
      await persist({ detailedSummary: data, detailedSummaryHistory: newDetailedHistory });
      setSummaryView("detalhado");
    } catch (e) {
      setDetailFailMsg(e.message === "ROBOTKEY_MISSING" ? `O Nyx está offline: ${e.userMsg || "peça pro professor configurar a IA."}` : "Não consegui gerar a versão detalhada agora. Tente de novo em instantes.");
    }
    setDetailLoading(false);
  };

  const handleStartActivity = async () => { setRevealedHints({}); setPhase("activity"); await persist({ phase:"activity" }); };

  // só marca a alternativa escolhida — certo/errado só aparece depois de Enviar Atividade
  const pickAnswer = (i, j) => {
    setAnswers(a => ({ ...a, [i]: j }));
    playSound("click");
  };

  // atalho de teclado (A/B/C/D) para responder a atividade sem precisar clicar — só ativo na fase de atividade
  useEffect(() => {
    if (phase !== "activity") return;
    const activity = dynamicActivity || [];
    const handleKeyDown = (e) => {
      if (!activity.length) return;
      const optionKey = e.key.toUpperCase().charCodeAt(0) - 65;
      if (optionKey >= 0 && optionKey < 4) {
        // todas as questões ficam na mesma página (o aluno pode clicar em qualquer uma, fora de
        // ordem) — usar Object.keys(answers).length como "questão atual" respondia a questão ERRADA
        // sempre que uma resposta por clique não seguia a ordem; mira sempre na primeira sem resposta
        const currentQ = activity.findIndex((_, i) => answers[i] == null);
        if (currentQ !== -1) {
          pickAnswer(currentQ, optionKey);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, answers, dynamicActivity]);

  // maior sequência de acertos seguidos, calculada só no envio (não dá mais pra saber "ao vivo" se acertou)
  const maxCorrectStreak = (activity, ans) => {
    let max = 0, cur = 0;
    activity.forEach((q, i) => {
      if (ans[i] === q.correct) { cur++; if (cur > max) max = cur; }
      else cur = 0;
    });
    return max;
  };

  const handleSubmitActivity = async () => {
    const activity = dynamicActivity || [];
    // a questão bônus (dificuldade adaptativa) NUNCA entra na conta da nota — só rende ponto
    // extra se acertada, e não desconta nada se ficar em branco ou errada
    const required = activity.filter(q=>!q.bonus);
    let pts = 0;
    required.forEach((q,i)=>{ if(answers[activity.indexOf(q)]===q.correct) pts++; });
    const bonusIdx = activity.findIndex(q=>q.bonus);
    const bonusHit = bonusIdx >= 0 && answers[bonusIdx] === activity[bonusIdx].correct;
    const finalScore = Math.round((pts/required.length)*100);
    const completedAt = Date.now();
    setScore(finalScore);
    setDoneAt(completedAt);
    setPhase("done");
    fireConfetti("activity");
    setShowFeedbackModal(true);
    setFeedbackLoading(true);
    const newNyxPoints = (stateRef.current.nyxPoints||0) + pts + (bonusHit ? 1 : 0);
    setNyxPoints(newNyxPoints);
    const newScoreHistory = { ...stateRef.current.scoreHistory, [todayKey()]: finalScore };
    setScoreHistory(newScoreHistory);
    stateRef.current = { ...stateRef.current, nyxPoints: newNyxPoints, scoreHistory: newScoreHistory };
    await persist({ phase:"done", score:finalScore, answers, nyxPoints: newNyxPoints, doneAt: completedAt, scoreHistory: newScoreHistory });
    checkPointsAchievements(newNyxPoints);
    unlockAchievement("primeira-atividade");
    if (finalScore >= 100) unlockAchievement("nota-cem");
    const doneCount = Object.keys(newScoreHistory).length;
    if (doneCount >= 5) unlockAchievement("atividades-5");
    if (doneCount >= 15) unlockAchievement("atividades-15");
    const hundredCount = Object.values(newScoreHistory).filter(v => v === 100).length;
    if (hundredCount >= 3) unlockAchievement("tres-100");
    const requiredAnswers = Object.fromEntries(required.map((q,ri)=>[ri, answers[activity.indexOf(q)]]));
    const streak = maxCorrectStreak(required, requiredAnswers);
    if (streak >= 5) unlockAchievement("combo-5");
    if (streak >= 8) unlockAchievement("combo-8");
    try {
      const list = activity.map((q,i)=>`- ${q.q} → ${answers[i]===q.correct?"acertou":"errou"}`).join("\n");
      const fbData = await askClaudeJson(
        `Um aluno iniciante de ${studyLang ? studyLang.label : "C#"} escreveu este código na aula de hoje:\n\`\`\`${studyLang ? studyLang.codeLang : "csharp"}\n${allCodeToday()}\n\`\`\`\n\nDepois respondeu uma atividade de ${activity.length} perguntas e acertou ${pts} (nota ${finalScore}).\nResultado pergunta a pergunta:\n${list}\n\nCrie um feedback gentil e motivador para ESTE aluno, baseado no código que ele escreveu E no desempenho.\n\nResponda APENAS em JSON puro, sem markdown:\n{\n  "intro": "1 frase curta e calorosa resumindo como ele foi nesta aula",\n  "secoes": [\n    { "emoji": "emoji que combine", "titulo": "O que você mandou bem (curto)", "explicacao": "1 a 2 frases concretas sobre o que ele acertou, citando o código ou o desempenho dele" },\n    { "emoji": "emoji que combine", "titulo": "Um ponto para melhorar (curto)", "explicacao": "1 a 2 frases gentis sobre um ponto específico a melhorar — se não houver nada relevante a melhorar, foque em um próximo passo desafiador em vez disso" }\n  ],\n  "dica": "se foi bem (nota alta e código sem erros): uma curiosidade ou próximo passo mais avançado para se desafiar. Se teve dificuldade: uma dica simples e prática para o que errou. 1 a 2 frases."\n}\n\nFrases curtas, uma ideia por vez, sem jargão técnico desnecessário, tom acolhedor. Garanta JSON válido.`,
        (studyLang ? studyLang.system : CS_SYSTEM) + "\nResponda APENAS JSON puro válido, sem markdown." + nyxPrefsInstruction(nyxPrefs)
      );
      setFinalFeedback(fbData);
      await persist({ phase:"done", score:finalScore, answers, finalFeedback:fbData });
    } catch { setFinalFeedback(""); }
    setFeedbackLoading(false);
  };

  const handleExamReady = async () => {
    setExamReady(true);
    await persist({ examReady: true });
  };

  const handleExamAnswer = async (qIdx, optIdx) => {
    // já concluída (protege contra clicar 2x bem rápido na última resposta e disparar o bloco de
    // finalização/premiação duas vezes) — lê via stateRef, não o closure de examDone
    if (stateRef.current.examDone) return;
    const newAnswers = { ...examAnswers, [qIdx]: optIdx };
    setExamAnswers(newAnswers);
    const qs = examInfo.questions || [];
    // só finaliza quando TODAS as questões têm resposta — os pontinhos de navegação deixam o aluno
    // pular pra qualquer questão fora de ordem, então responder a última da lista primeiro não pode
    // encerrar a prova sozinho contando as anteriores (ainda não vistas) como erradas
    const allAnswered = qs.every((_, i) => newAnswers[i] != null);
    if (!allAnswered) {
      stateRef.current = { ...stateRef.current, examAnswers: newAnswers };
      const nextUnanswered = qs.findIndex((_, i) => newAnswers[i] == null);
      setExamCurrentQ(nextUnanswered !== -1 ? nextUnanswered : Math.min(qIdx + 1, qs.length - 1));
      await persist({ examAnswers: newAnswers });
    } else {
      // a correção agora acontece no SERVIDOR (não mais aqui no navegador): o gabarito de cada
      // questão nunca chega até o cliente, então não tem mais como calcular "pts" localmente
      // comparando com "q.correct" — isso é exatamente o que fechou a brecha de segurança onde
      // qualquer aluno conseguia ver as respostas certas antes de responder, olhando a aba de rede
      // do navegador. Manda só as respostas escolhidas + quantas vezes saiu da aba; tenta de novo
      // 1x se falhar (rede instável), e só desiste de vez se a segunda tentativa também falhar.
      const exits = stateRef.current.examExits || 0;
      let result = await gradeExam(examInfo.shift || shift, newAnswers, exits);
      if (!result) result = await gradeExam(examInfo.shift || shift, newAnswers, exits);
      stateRef.current = { ...stateRef.current, examAnswers: newAnswers };
      if (!result) {
        setRobotMsg("⚠ Não consegui enviar sua prova agora (conexão?). Suas respostas estão salvas — tente clicar na última pergunta de novo em instantes.");
        setRobotState("thinking");
        await persist({ examAnswers: newAnswers });
        return;
      }
      const { finalScore, raw, total } = result;
      const pts = raw / 10;
      try { sessionStorage.removeItem("nyx_exam_open"); } catch {}
      const newNyxPoints = (stateRef.current.nyxPoints||0) + Math.round(finalScore / 10);
      stateRef.current = { ...stateRef.current, examAnswers: newAnswers, examDone: true, nyxPoints: newNyxPoints };
      setExamScore(finalScore); setExamScoreRaw(raw); setExamDone(true);
      setNyxPoints(newNyxPoints);
      await persist({ examAnswers: newAnswers, examScore: finalScore, examScoreRaw: raw, examExits: exits, examDone: true, nyxPoints: newNyxPoints });
      checkPointsAchievements(newNyxPoints);
      if (total && pts / total >= 0.8) unlockAchievement("prova-mestre");
      if (total && pts === total) unlockAchievement("prova-100");
    }
  };

  // versão simplificada da prova pra quem é do Modo Guiado e topou participar — não vale nota
  // oficial (não entra em ranking/boletim), então termina sozinha assim que responder tudo, sem
  // precisar esperar o professor encerrar a prova de verdade
  const handleGuidedAnswer = async (qIdx, optIdx) => {
    // mesma proteção do handleExamAnswer: sem isso, clicar 2x bem rápido na última resposta
    // disparava o bloco de finalização/premiação duas vezes
    if (stateRef.current.examDone) return;
    const newAnswers = { ...examGuidedAnswers, [qIdx]: optIdx };
    setExamGuidedAnswers(newAnswers);
    const gq = examGuidedQuestions || GUIDED_PARTICIPATION_QUIZ;
    const allAnswered = gq.every((_, i) => newAnswers[i] != null);
    if (!allAnswered) {
      stateRef.current = { ...stateRef.current, examGuidedAnswers: newAnswers };
      const nextUnanswered = gq.findIndex((_, i) => newAnswers[i] == null);
      setExamGuidedCurrentQ(nextUnanswered !== -1 ? nextUnanswered : Math.min(qIdx + 1, gq.length - 1));
      await persist({ examGuidedAnswers: newAnswers });
    } else {
      let gpts = 0;
      gq.forEach((q, i) => { if (newAnswers[i] === q.correct) gpts++; });
      try { sessionStorage.removeItem("nyx_exam_open"); } catch {}
      const newNyxPoints = (stateRef.current.nyxPoints||0) + 10;
      stateRef.current = { ...stateRef.current, examGuidedAnswers: newAnswers, examGuidedCorrect: gpts, examGuidedMode: true, examDone: true, nyxPoints: newNyxPoints };
      setExamGuidedCorrect(gpts); setExamGuidedMode(true); setExamDone(true);
      setNyxPoints(newNyxPoints);
      await persist({ examGuidedAnswers: newAnswers, examGuidedCorrect: gpts, examGuidedMode: true, examDone: true, nyxPoints: newNyxPoints });
    }
  };

  const tryFullscreen = () => {
    requestFS().then(()=>setFsMsg("")).catch(()=>{
      setFsMsg("Seu navegador ou aparelho não permite tela cheia aqui (no iPhone, por exemplo, não dá).");
      setTimeout(()=>setFsMsg(""), 6000);
    });
  };

  const sendClassFeedback = async () => {
    const cf = { rating:classRating, text:classText.trim(), at:Date.now() };
    setClassFb(cf);
    setClassSent(true);
    await persist({ classFeedback:cf });
  };

  const dismissNudge = () => { if (nudge) setNudgeSeenAt(nudge.at); setNudge2(null); };
  const showNudge = nudge && nudge.at > nudgeSeenAt;

  // ── estilos ──
  const scaleSize = (size) => Math.round(size * uiScale);
  const scalePx = (val) => Math.round(val * uiScale);
  const styles = {
    container:{ minHeight:"100vh", background:pageBgFor(theme), color:"#f0e9fb", fontFamily:FONT, fontSize:`${scaleSize(16)}px` },
    header:{ background:"rgba(17,21,42,.85)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", padding:`${scalePx(10)}px ${scalePx(18)}px`, display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #3b2a58", boxShadow:"0 1px 0 #c084fc33, 0 8px 24px rgba(3,5,16,.35)", position:"sticky", top:0, zIndex:40, flexWrap:"wrap", gap:8 },
    card:{ background:"linear-gradient(180deg,#231636,#1a1029)", borderRadius:16, padding:scalePx(16), margin:"10px 0", border:"1px solid #3a2a55", boxShadow:"0 8px 24px rgba(3,5,16,.35)", animation:"rise .35s ease both" },
    btn:(c)=>({ background:`linear-gradient(135deg, ${c}, ${shade(c,-0.18)})`, color:"#fff", border:"none", borderRadius:10, padding:`${scalePx(10)}px ${scalePx(18)}px`, cursor:"pointer", fontWeight:800, fontSize:scaleSize(14), boxShadow:`0 4px 14px ${c}44` }),
    opt:(sel)=>({ background:sel?"#c084fc22":"#1a1029", border:`2px solid ${sel?"#c084fc":"#3a2a55"}`, borderRadius:10, padding:`${scalePx(10)}px ${scalePx(14)}px`, marginBottom:8, cursor:"pointer", color:"#f0e9fb", textAlign:"left", width:"100%", fontSize:scaleSize(14), minHeight:scaleSize(44) }),
  };
  const Stars = ({ value, onChange }) => (
    <div style={{ display:"flex", gap:4 }}>
      {[1,2,3,4,5].map(n=>(
        <button key={n} type="button" onClick={()=>onChange(n)} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:26, color:n<=value?"#fbbf24":"#776798", padding:0 }}>★</button>
      ))}
    </div>
  );

  if (!loaded) return (<div style={{ ...styles.container, display:"flex", alignItems:"center", justifyContent:"center" }}><p style={{ color:"#a99ac9" }}>Carregando seu perfil...</p></div>);

  // ── ZEK: o professor pediu atenção — o Nyx toma a tela inteira e bloqueia tudo até o /hiberne ──
  if (nyxLocks.zek) return (
    <div style={{ ...styles.container, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"2px solid #f87171", borderRadius:22, padding:"34px 28px", maxWidth:460, width:"100%", textAlign:"center", boxShadow:"0 24px 70px rgba(0,0,0,.6), 0 0 60px #f8717133" }}>
        <div style={{ animation:"nyx-shake .55s ease infinite" }}>
          <NyxRobot state="error" size={120} showName={false} gear={nyxGear} />
        </div>
        <h2 style={{ color:"#f87171", fontSize:24, fontWeight:900, margin:"14px 0 6px" }}>👀 Atenção na aula!</h2>
        <p style={{ color:"#d6c9ec", fontSize:15, lineHeight:1.7, margin:0 }}>
          O professor pediu a atenção de todo mundo agora. Olhos no quadro! A tela volta ao normal quando ele liberar.
        </p>
      </div>
    </div>
  );

  // ── HORÁRIO AUTOMÁTICO: fora do horário configurado, a sala fica fechada (a vistoria do professor libera na hora) ──
  if (classStatusNow.configured && !classStatusNow.open && !myInspection) return (
    <div style={{ ...styles.container, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"2px solid #c084fc", borderRadius:22, padding:"34px 28px", maxWidth:460, width:"100%", textAlign:"center", boxShadow:"0 24px 70px rgba(0,0,0,.6), 0 0 60px #c084fc22" }}>
        <div style={{ animation:"nyx-float 3s ease-in-out infinite" }}>
          <NyxRobot state="idle" size={110} showName={false} gear={nyxGear} />
        </div>
        <h2 style={{ color:"#c084fc", fontSize:23, fontWeight:900, margin:"14px 0 6px" }}>{classStatusNow.isWeekend ? "🎉 Fim de semana, sem aula!" : classStatusNow.before ? "⏰ A aula ainda não começou" : "👋 A aula de hoje já encerrou"}</h2>
        <p style={{ color:"#d6c9ec", fontSize:15, lineHeight:1.7, margin:0 }}>
          {classStatusNow.isWeekend
            ? "A turma só tem aula de segunda a sexta. Aproveite o descanso e até a próxima aula! 😊"
            : classStatusNow.before
            ? `A turma ${shiftMeta(shift).label} começa às ${mySchedule.start}. Até já!`
            : "Até a próxima aula! Seu código já está salvo, então pode ficar tranquilo(a)."}
        </p>
      </div>
    </div>
  );

  // 📋 retomada: lembra o conteúdo da aula passada (o dia de aula anterior a hoje, não simplesmente
  // "ontem" no calendário) pra ajudar a turma a voltar de onde parou
  const recapText = (() => {
    const prevClassDay = [...myClassDays].filter(d => d < todayKey()).sort().pop();
    if (!prevClassDay) return null;
    const title = contentNameFor((myContentNames||{})[prevClassDay], shift);
    if (!title) return null;
    const [, m, dd] = prevClassDay.split("-");
    return `Na aula passada (${dd}/${m}) vocês viram "${title}". Bora continuar de onde paramos!`;
  })();

  // classes de apoio (aplicadas em todas as telas do aluno) + rotina visual da aula
  const supportClass = [calmMode && "calm", easyRead && "easy-read", highContrast && "high-contrast"].filter(Boolean).join(" ") || undefined;
  const showRoutine = accessMode || calmMode || focusMode || easyRead || ownPace;
  // barrinha fixa com os passos do dia: previsibilidade ajuda muito quem é autista/TDAH —
  // o aluno sempre sabe em que passo está e o que vem depois
  const routineBar = showRoutine ? (() => {
    const steps = [["📝","Programar"],["💾","Salvar"],["📚","Resumo"],["🎯","Atividade"]];
    const idx = phase==="coding" ? 0 : phase==="generating" ? 1 : phase==="summary" ? 2 : phase==="activity" ? 3 : 4;
    return (
      <div style={{ position:"fixed", bottom:10, left:"50%", transform:"translateX(-50%)", zIndex:900, background:"rgba(13,17,34,.96)", border:"1px solid #3b2a58", borderRadius:20, padding:"7px 14px", display:"flex", gap:8, alignItems:"center", boxShadow:"0 8px 24px rgba(0,0,0,.45)", flexWrap:"wrap", justifyContent:"center", maxWidth:"calc(100vw - 16px)" }}>
        <span style={{ color:"#776798", fontSize:11.5, fontWeight:800 }}>Minha aula:</span>
        {steps.map(([emoji, label], i) => (
          <span key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12.5, fontWeight:800, color: i < idx ? "#34d399" : i === idx ? "#f0e9fb" : "#776798", background: i === idx ? "#c084fc33" : "transparent", border: i === idx ? "1px solid #c084fc" : "1px solid transparent", borderRadius:14, padding:"3px 9px" }}>
            {i < idx ? "✓" : emoji} {label}
          </span>
        ))}
      </div>
    );
  })() : null;

  // ── PROVA: telas de exame têm prioridade ──
  if (examDone && !examScoreSeen && examGuidedMode) return (
    <div className={supportClass} style={styles.container}>
      <AchievementToast achievement={newAchievement} />
        {goalParty && !calmMode && <ConfettiParty level={goalParty} />}
      <div style={styles.header}><span>🎉 Participação na Prova — {studentName}</span></div>
      <div style={{ maxWidth:500, margin:"50px auto", textAlign:"center", padding:"0 16px" }}>
        <div style={{ background:"linear-gradient(135deg,#22d3ee,#0891b2)", borderRadius:18, padding:32, boxShadow:"0 12px 30px #22d3ee44" }}>
          <div style={{ fontSize:52 }}>🎉</div>
          <h1 style={{ color:"#fff", fontSize:26, margin:"12px 0" }}>Você participou, {studentName}!</h1>
          <div style={{ fontSize:56, fontWeight:900, color:"#fff", margin:"8px 0" }}>{examGuidedCorrect}/{(examGuidedQuestions||GUIDED_PARTICIPATION_QUIZ).length}</div>
          <p style={{ color:"#cffafe", fontSize:15 }}>perguntas certas — muito bem! 🎮</p>
        </div>
        <p style={{ color:"#a99ac9", marginTop:20, fontSize:14, lineHeight:1.6 }}>Essa é a versão simples da prova, só de participação — <b>não vale nota</b> e não entra no boletim nem no ranking da turma. O importante foi você ter topado participar! 🥳</p>
        <button onClick={async ()=>{ setExamScoreSeen(true); await persist({ examScoreSeen: true }); }}
          style={{ ...styles.btn("#8b5cf6"), width:"100%", marginTop:14, padding:"11px 0", fontSize:14 }}>
          ← Voltar à tela inicial
        </button>
      </div>
    </div>
  );

  if (examDone && !examScoreSeen) return (
    <div className={supportClass} style={styles.container}>
      <AchievementToast achievement={newAchievement} />
        {goalParty && !calmMode && <ConfettiParty level={goalParty} />}
      <div style={styles.header}><span>🏆 Prova Concluída — {studentName}</span></div>
      <div style={{ maxWidth:500, margin:"50px auto", textAlign:"center", padding:"0 16px" }}>
        <div style={{ background:"linear-gradient(135deg,#34d399,#16a34a)", borderRadius:18, padding:32, boxShadow:"0 12px 30px #34d39944" }}>
          <div style={{ fontSize:52 }}>🏆</div>
          <h1 style={{ color:"#fff", fontSize:26, margin:"12px 0" }}>Parabéns, {studentName}!</h1>
          <div style={{ fontSize:56, fontWeight:900, color:"#fff", margin:"8px 0" }}>{examScore ?? 0}</div>
          <p style={{ color:"#d1fae5", fontSize:15 }}>pontos de {(examInfo.questions||[]).length * 10}</p>
        </div>
        {examExits > 0 && (
          <div style={{ background:"#1e1430", border:"1px solid #f87171", borderRadius:14, padding:"14px 16px", marginTop:16, textAlign:"left" }}>
            <p style={{ color:"#fca5a5", fontSize:13.5, lineHeight:1.7, margin:0 }}>
              ⚠ Você saiu da prova <b>{examExits}x</b> — desconto de <b>{Math.max(0, (examScoreRaw ?? examScore ?? 0) - (examScore ?? 0))} pontos</b> (nota sem desconto: {examScoreRaw ?? examScore}).
            </p>
            {!examAppeal && (
              <button onClick={async ()=>{ const ap = { at: Date.now(), status:"pending" }; setExamAppeal(ap); await persist({ examAppeal: ap }); }}
                style={{ ...styles.btn("#fbbf24"), width:"100%", marginTop:10, padding:"9px 0", fontSize:13 }}>
                ✋ Foi sem querer (a aba fechou sozinha) — avisar o professor
              </button>
            )}
            {examAppeal?.status === "pending" && <p style={{ color:"#fbbf24", fontSize:13, margin:"10px 0 0", fontWeight:700 }}>✋ Aviso enviado — o professor vai decidir se devolve os pontos.</p>}
            {examAppeal?.status === "accepted" && <p style={{ color:"#34d399", fontSize:13, margin:"10px 0 0", fontWeight:700 }}>✅ O professor aceitou sua explicação — pontos devolvidos!</p>}
            {examAppeal?.status === "rejected" && <p style={{ color:"#a99ac9", fontSize:13, margin:"10px 0 0", fontWeight:700 }}>O professor analisou e manteve o desconto.</p>}
          </div>
        )}
        <p style={{ color:"#a99ac9", marginTop:20, fontSize:14, lineHeight:1.6 }}>Aguarde o professor encerrar a prova para ver o ranking da turma! Ou, se preferir, já pode voltar pra plataforma — sua nota fica salva.</p>
        <button onClick={async ()=>{ setExamScoreSeen(true); await persist({ examScoreSeen: true }); }}
          style={{ ...styles.btn("#8b5cf6"), width:"100%", marginTop:14, padding:"11px 0", fontSize:14 }}>
          ← Voltar à tela inicial
        </button>
      </div>
    </div>
  );

  const examHappening = examInfo.status === 'review' || examInfo.status === 'active';
  // alunos do Modo Guiado escolhem se querem entrar na prova junto com a turma, ou continuar no
  // Modo Guiado normalmente — só perguntamos uma vez por prova (examOptIn começa null a cada nova)
  if (accessMode && examHappening && examOptIn == null) return (
    <div className={supportClass} style={styles.container}>
      <div style={styles.header}><span>📝 Prova da Turma — {studentName}</span></div>
      <div style={{ maxWidth:520, margin:"60px auto", textAlign:"center", padding:"0 16px" }}>
        <div style={{ background:"linear-gradient(135deg,#c084fc,#8b5cf6)", borderRadius:18, padding:32, boxShadow:"0 12px 30px #c084fc55" }}>
          <div style={{ fontSize:48 }}>🤔</div>
          <h1 style={{ color:"#fff", fontSize:22, margin:"12px 0" }}>A turma vai fazer uma prova!</h1>
          <p style={{ color:"#e0e7ff", fontSize:14.5, lineHeight:1.7 }}>Você quer participar de uma versão bem mais simples da prova (sobre os blocos que você já usou, só de boa, sem valer nota), ou prefere continuar no Modo Guiado enquanto os outros fazem a prova?</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:18 }}>
          <button onClick={async ()=>{ setExamOptIn(true); await persist({ examOptIn: true }); }}
            style={{ ...styles.btn("#34d399"), padding:"14px 0", fontSize:15 }}>
            ✅ Sim, quero participar
          </button>
          <button onClick={async ()=>{ setExamOptIn(false); await persist({ examOptIn: false }); }}
            style={{ ...styles.btn("#8b5cf6"), padding:"14px 0", fontSize:15 }}>
            🧩 Não, prefiro continuar no Modo Guiado
          </button>
        </div>
        <p style={{ color:"#a99ac9", marginTop:16, fontSize:12.5, lineHeight:1.6 }}>Não tem problema nenhum escolher não fazer — isso não desconta pontos nem nada.</p>
      </div>
    </div>
  );

  if (examInfo.status === 'review' && !(accessMode && examOptIn === false)) return (
    <div className={supportClass} style={styles.container}>
      <div style={styles.header}><span>📝 Revisão — {studentName}</span></div>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"22px 16px 36px" }}>
        <div style={{ background:"linear-gradient(135deg,#c084fc,#8b5cf6)", borderRadius:18, padding:"24px 22px", textAlign:"center", boxShadow:"0 12px 30px #c084fc55" }}>
          <div style={{ fontSize:44 }}>📝</div>
          <h1 style={{ color:"#fff", fontSize:24, margin:"8px 0" }}>Hora da Prova!</h1>
          <p style={{ color:"#e0e7ff", fontSize:14, lineHeight:1.6 }}>Revise o conteúdo abaixo e entre na sala quando estiver pronto.</p>
          {examInfo.studyUntil && clockNow < examInfo.studyUntil && (() => {
            const msLeft = Math.max(0, examInfo.studyUntil - clockNow);
            const mm = Math.floor(msLeft / 60000), ss = Math.floor((msLeft % 60000) / 1000);
            return (
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(0,0,0,.2)", borderRadius:20, padding:"7px 18px", marginTop:6 }}>
                <span style={{ fontSize:16 }}>⏳</span>
                <span style={{ color:"#fff", fontWeight:900, fontSize:17, fontVariantNumeric:"tabular-nums" }}>{String(mm).padStart(2,"0")}:{String(ss).padStart(2,"0")}</span>
                <span style={{ color:"#e0e7ff", fontSize:12.5 }}>de estudo</span>
              </div>
            );
          })()}
        </div>
        {accessMode && examOptIn === true && (
          <div className="cardfx" style={{ ...styles.card, marginTop:14, background:"#0e293344", border:"1px solid #22d3ee" }}>
            <p style={{ color:"#67e8f9", fontSize:13.5, lineHeight:1.7, margin:0 }}>🧩 Você vai fazer a versão simples da prova, com perguntas sobre os blocos que já usou — <b>não vale nota</b>, é só participação!</p>
          </div>
        )}
        <div className="cardfx" style={{ ...styles.card, marginTop:14 }}>
          <h3 style={{ color:"#c084fc", marginBottom:10 }}>📚 Resumo de Revisão</h3>
          <div style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.9, whiteSpace:"pre-wrap" }}>{examInfo.summary || "Preparando o resumo..."}</div>
        </div>
        {examReady ? (
          <div className="cardfx" style={{ ...styles.card, textAlign:"center", padding:24 }}>
            <div style={{ fontSize:36 }}>✅</div>
            <p style={{ color:"#34d399", fontWeight:700, fontSize:16 }}>Você está na sala!</p>
            <p style={{ color:"#a99ac9", fontSize:13 }}>Aguardando o professor iniciar a prova...</p>
          </div>
        ) : (
          <button onClick={handleExamReady} style={{ ...styles.btn("#34d399"), width:"100%", padding:"16px 0", fontSize:16, marginTop:14 }}>
            ✅ Entrar na Sala da Prova
          </button>
        )}
      </div>
    </div>
  );

  if (examInfo.status === 'active' && accessMode && examOptIn === true) {
    const gq = examGuidedQuestions || GUIDED_PARTICIPATION_QUIZ;
    const gQuestion = gq[examGuidedCurrentQ];
    return (
      <div className={supportClass} style={styles.container}>
        <div style={styles.header}>
          <span>🧩 Participação na Prova — {studentName}</span>
          <span style={{ color:"#a99ac9", fontSize:13 }}>Pergunta {examGuidedCurrentQ+1} de {gq.length}</span>
        </div>
        <div style={{ maxWidth:620, margin:"30px auto", padding:"0 16px" }}>
          <div style={{ background:"#0e293344", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#67e8f9", lineHeight:1.6 }}>
            🧩 Isso não vale nota — é só pra você participar da prova junto com a turma!
          </div>
          <div style={{ background:"#1e1430", borderRadius:14, padding:22, border:"1px solid #3b2a58" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ color:"#22d3ee", fontWeight:700 }}>Pergunta {examGuidedCurrentQ+1}/{gq.length}</span>
            </div>
            <p style={{ color:"#f0e9fb", fontSize:16, lineHeight:1.7, marginBottom:18 }}>{gQuestion ? gQuestion.q : "Carregando..."}</p>
            {gQuestion && gQuestion.opts.map((opt, oi) => (
              <button key={oi} onClick={() => handleGuidedAnswer(examGuidedCurrentQ, oi)}
                style={{ display:"block", width:"100%", background:examGuidedAnswers[examGuidedCurrentQ]===oi?"#22d3ee33":"#171026", border:`2px solid ${examGuidedAnswers[examGuidedCurrentQ]===oi?"#22d3ee":"#3b2a58"}`, borderRadius:10, padding:"12px 16px", color:"#f0e9fb", textAlign:"left", cursor:"pointer", marginBottom:8, fontSize:14 }}>
                <span style={{ color:"#22d3ee", fontWeight:700, marginRight:8 }}>{["A","B","C","D"][oi]}.</span>{opt}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
            {gq.map((_,i) => (
              <div key={i} style={{ width:28, height:28, borderRadius:6, background:i===examGuidedCurrentQ?"#22d3ee":examGuidedAnswers[i]!=null?"#3b2a58":"#1e1430", border:`1px solid ${i===examGuidedCurrentQ?"#22d3ee":examGuidedAnswers[i]!=null?"#22d3ee":"#3b2a58"}`, display:"flex", alignItems:"center", justifyContent:"center", color:examGuidedAnswers[i]!=null?"#f0e9fb":"#776798", fontSize:12, cursor:"pointer" }} onClick={() => setExamGuidedCurrentQ(i)}>{i+1}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (examInfo.status === 'active' && !(accessMode && examOptIn === false)) {
    const qs = examInfo.questions || [];
    const q = qs[examCurrentQ];
    return (
      <div className={supportClass} style={styles.container}>
        <div style={styles.header}>
          <span>🏆 Prova — {studentName}</span>
          <span style={{ color:"#a99ac9", fontSize:13 }}>Questão {examCurrentQ+1} de {qs.length}</span>
        </div>
        <div style={{ maxWidth:620, margin:"30px auto", padding:"0 16px" }}>
          {examExits > 0 && (
            <div style={{ background:"#f8717118", border:"1px solid #f87171", borderRadius:12, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#fca5a5", lineHeight:1.6 }}>
              ⚠ <b>Saída da prova detectada ({examExits}x).</b> Cada saída da aba desconta <b>10 pontos</b> da sua nota. Fique na prova!
            </div>
          )}
          <div style={{ background:"#1e1430", borderRadius:14, padding:22, border:"1px solid #3b2a58" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ color:"#c084fc", fontWeight:700 }}>Questão {examCurrentQ+1}/{qs.length}</span>
              <span style={{ color:"#fbbf24", fontWeight:700 }}>10 pts cada</span>
            </div>
            <p style={{ color:"#f0e9fb", fontSize:16, lineHeight:1.7, marginBottom:18 }}>{q ? q.q : "Carregando..."}</p>
            {q && q.opts.map((opt, oi) => (
              <button key={oi} onClick={() => handleExamAnswer(examCurrentQ, oi)}
                style={{ display:"block", width:"100%", background:examAnswers[examCurrentQ]===oi?"#c084fc33":"#171026", border:`2px solid ${examAnswers[examCurrentQ]===oi?"#c084fc":"#3b2a58"}`, borderRadius:10, padding:"12px 16px", color:"#f0e9fb", textAlign:"left", cursor:"pointer", marginBottom:8, fontSize:14 }}>
                <span style={{ color:"#c084fc", fontWeight:700, marginRight:8 }}>{["A","B","C","D"][oi]}.</span>{opt}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
            {qs.map((_,i) => (
              <div key={i} style={{ width:28, height:28, borderRadius:6, background:i===examCurrentQ?"#c084fc":examAnswers[i]!=null?"#3b2a58":"#1e1430", border:`1px solid ${i===examCurrentQ?"#c084fc":examAnswers[i]!=null?"#c084fc":"#3b2a58"}`, display:"flex", alignItems:"center", justifyContent:"center", color:examAnswers[i]!=null?"#f0e9fb":"#776798", fontSize:12, cursor:"pointer" }} onClick={() => setExamCurrentQ(i)}>{i+1}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 👾 chefão: os 10 minutos de estudo antes da batalha tomam a tela inteira (menos durante a
  // prova, já tratada acima) — quando o tempo acaba, a tela normal volta sozinha e o banner de
  // batalha (mais abaixo) aparece
  if (bossInfo && bossInfo.studyUntil && clockNow < bossInfo.studyUntil) return (
    <BossStudyModal studyUntil={bossInfo.studyUntil} clockNow={clockNow} files={files} summaryHistory={summaryHistory} detailedSummaryHistory={detailedSummaryHistory} />
  );

  if (phase==="generating") return (
    <div className={supportClass} style={styles.container}>
      {routineBar}
      <div style={styles.header}><span>⏳ Preparando — {studentName}</span></div>
      <div className="pop" style={{ maxWidth:440, margin:"70px auto", textAlign:"center", padding:24 }}>
        <NyxRobot state="thinking" size={116} showName={false} />
        <h2 style={{ color:"#c084fc", margin:"14px 0 6px" }}>Nyx está preparando seu conteúdo...</h2>
        <p style={{ color:"#a99ac9", lineHeight:1.7 }}>{generatingMsg}</p>
        <div style={{ marginTop:24, display:"flex", justifyContent:"center", gap:8 }}>
          {[0,1,2].map(i=><div key={i} style={{ width:10,height:10,borderRadius:"50%",background:"#c084fc",animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
        </div>
      </div>
    </div>
  );

  if (phase==="summary") {
    const sum = summaryView === "detalhado" && detailedSummary ? detailedSummary : dynamicSummary;
    const structured = sum && typeof sum === "object" && Array.isArray(sum.secoes) && sum.secoes.length > 0;
    const ACCENTS = ["#c084fc","#34d399","#fbbf24","#06b6d4","#ec4899","#8b5cf6","#f87171"];
    const handleSpeakSummary = (text) => {
      setCurrentSpeakingFor(text === (structured && sum.intro ? sum.intro : "Aqui está tudo o que você aprendeu hoje, explicado passo a passo. 📒 Anote no caderno!") ? "intro" : text);
      speak(text);
    };
    return (
      <div className={supportClass} style={styles.container}>
      {routineBar}
      {renderHiddenEggs()}
        <div style={styles.header}><span>📚 Resumo da Aula — {studentName}</span></div>
        <div style={{ maxWidth:740, margin:"0 auto", padding:`${scalePx(22)}px ${scalePx(16)}px ${scalePx(36)}px` }}>
          {/* topo em destaque */}
          <div style={{ background:"linear-gradient(135deg,#c084fc,#8b5cf6)", borderRadius:18, padding:`${scalePx(24)}px ${scalePx(22)}px`, textAlign:"center", boxShadow:"0 12px 30px #c084fc55" }}>
            <div style={{ fontSize:scaleSize(44) }}>📚</div>
            <h1 style={{ color:"#fff", fontSize:scaleSize(25), margin:`${scalePx(4)}px 0 ${scalePx(8)}px` }}>Resumo da sua aula</h1>
            <p style={{ color:"#e0e7ff", fontSize:scaleSize(15), maxWidth:560, margin:"0 auto", lineHeight:1.6, marginBottom:12 }}>
              {structured && sum.intro ? sum.intro : "Aqui está tudo o que você aprendeu hoje, explicado passo a passo. 📒 Anote no caderno!"}
            </p>
            {ttsSupported && <button onClick={() => handleSpeakSummary(structured && sum.intro ? sum.intro : "Aqui está tudo o que você aprendeu hoje, explicado passo a passo. Anote no caderno!")} style={{ background:isSpeaking && currentSpeakingFor==="intro" ? "#fff" : "rgba(255,255,255,0.2)", color:isSpeaking && currentSpeakingFor==="intro" ? "#c084fc" : "#fff", border:"none", borderRadius:8, padding:`${scalePx(10)}px ${scalePx(18)}px`, fontSize:scaleSize(13), fontWeight:700, cursor:"pointer", minHeight:scaleSize(44) }}>{isSpeaking && currentSpeakingFor==="intro" ? "⏸ Pausando" : "🔊 Ouvir intro"}</button>}
            <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:14 }}>
              <button onClick={()=>setSummaryView("simples")} style={{ background: summaryView==="simples" ? "#fff" : "rgba(255,255,255,0.16)", color: summaryView==="simples" ? "#c084fc" : "#fff", border:"none", borderRadius:20, padding:`${scalePx(8)}px ${scalePx(16)}px`, fontSize:scaleSize(12.5), fontWeight:800, cursor:"pointer" }}>🌱 Resumo simples</button>
              <button onClick={fetchDetailedSummary} disabled={detailLoading} style={{ background: summaryView==="detalhado" ? "#fff" : "rgba(255,255,255,0.16)", color: summaryView==="detalhado" ? "#c084fc" : "#fff", border:"none", borderRadius:20, padding:`${scalePx(8)}px ${scalePx(16)}px`, fontSize:scaleSize(12.5), fontWeight:800, cursor: detailLoading ? "wait" : "pointer", opacity: detailLoading ? 0.7 : 1 }}>{detailLoading ? "⏳ Gerando..." : "📖 Resumo detalhado"}</button>
            </div>
            {detailFailMsg && <p style={{ color:"#ffd7d7", fontSize:12.5, marginTop:8 }}>{detailFailMsg}</p>}
          </div>

          {structured ? (
            <div style={{ marginTop:18 }}>
              {sum.secoes.map((s,i)=>{
                const c = ACCENTS[i % ACCENTS.length];
                const sectionText = `${s.titulo}. ${s.explicacao || ''}${s.exemplo ? '. Exemplo: ' + s.exemplo : ''}`;
                return (
                  <div key={i} style={{ background:"#1e1430", borderRadius:14, padding:18, margin:"0 0 14px", border:"1px solid #3b2a58", borderLeft:`5px solid ${c}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, justifyContent:"space-between" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{s.emoji || "📌"}</span>
                        <div>
                          <div style={{ color:c, fontSize:11, fontWeight:800, letterSpacing:1 }}>PARTE {i+1}</div>
                          <h3 style={{ color:"#f0e9fb", fontSize:17, margin:0 }}>{s.titulo}</h3>
                        </div>
                      </div>
                      {ttsSupported && <button onClick={() => { setCurrentSpeakingFor(`section-${i}`); speak(sectionText); }} style={{ background:isSpeaking && currentSpeakingFor===`section-${i}` ? c : c+"33", border:`1px solid ${c}`, color:c, padding:"6px 12px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", minWidth:"max-content" }}>{isSpeaking && currentSpeakingFor===`section-${i}` ? "⏸" : "🔊"}</button>}
                    </div>
                    {s.explicacao && <p style={{ color:"#d6c9ec", fontSize:15, lineHeight:1.75, margin:"0 0 4px" }}>{s.explicacao}</p>}
                    {s.exemplo && <CodeBlock code={s.exemplo} />}
                  </div>
                );
              })}
              {sum.dica && (
                <div style={{ background:"#fbbf2416", border:"1px solid #fbbf24", borderRadius:14, padding:18, margin:"4px 0 0", display:"flex", gap:12, justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:26, lineHeight:1, marginBottom:4 }}>💡</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <h4 style={{ color:"#fbbf24", margin:"0 0 4px" }}>Dica do Nyx</h4>
                    <p style={{ color:"#fcd9a0", fontSize:15, lineHeight:1.7, margin:0 }}>{sum.dica}</p>
                  </div>
                  {ttsSupported && <button onClick={() => { setCurrentSpeakingFor("dica"); speak(sum.dica); }} style={{ background:isSpeaking && currentSpeakingFor==="dica" ? "#fbbf24" : "rgba(251,191,36,0.2)", border:"1px solid #fbbf24", color:isSpeaking && currentSpeakingFor==="dica" ? "#000" : "#fbbf24", padding:"6px 12px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", minWidth:"max-content" }}>{isSpeaking && currentSpeakingFor==="dica" ? "⏸" : "🔊"}</button>}
                </div>
              )}
            </div>
          ) : (
            <div className="cardfx" style={{ ...styles.card, marginTop:18 }}>
              <pre style={{ whiteSpace:"pre-wrap", fontFamily:"inherit", fontSize:14, lineHeight:1.9, color:"#d6c9ec", margin:0 }}>{typeof sum==="string" ? sum : (sum && sum.raw) || "O resumo não carregou. Volte e clique em Salvar novamente."}</pre>
            </div>
          )}

          <div style={{ textAlign:"center", marginTop:22 }}>
            {accessMode ? (
              <>
                <p style={{ color:"#a99ac9", marginBottom:12 }}>Quando terminar de ouvir o resumo, volte para o código! 🎮</p>
                <button style={{ ...styles.btn("#c084fc"), padding:"12px 26px", fontSize:16 }} onClick={async()=>{ setPhase("coding"); await persist({ phase:"coding" }); }}>← Voltar para o código</button>
              </>
            ) : (
              <>
                <p style={{ color:"#a99ac9", marginBottom:12 }}>Quando terminar de anotar, vá para a atividade! ✍️</p>
                <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
                  <button style={{ ...styles.btn("#3b2a58"), padding:"12px 22px", fontSize:15 }} onClick={async()=>{ setPhase("coding"); await persist({ phase:"coding" }); }}>← Voltar para o código</button>
                  <button style={{ ...styles.btn("#c084fc"), padding:"12px 26px", fontSize:16 }} onClick={handleStartActivity}>Fazer Atividade →</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (phase==="activity") {
    const activity = dynamicActivity||[];
    const handleSpeakQuestion = (q, i) => {
      const qText = `Questão ${i+1}: ${q.q}. Opções: ${q.opts.map((o, idx) => `${String.fromCharCode(65+idx)}: ${o}`).join('. ')}`;
      setCurrentSpeakingFor(`q-${i}`);
      speak(qText);
    };
    return (
      <div className={supportClass} style={styles.container}>
      {routineBar}
      {renderHiddenEggs()}
        <AchievementToast achievement={newAchievement} />
        {goalParty && !calmMode && <ConfettiParty level={goalParty} />}
        <div style={styles.header}><span>📝 Atividade — {studentName}</span></div>
        <div style={{ maxWidth:640, margin:"0 auto", padding:24 }}>
          <h2 style={{ color:"#c084fc", fontSize:scaleSize(20) }}>Atividade da Aula</h2>
          <p style={{ color:"#a99ac9", fontSize:scaleSize(13), marginBottom:16 }}>Baseada no código que você escreveu hoje! Marque a alternativa que você acha certa — o resultado só aparece depois de enviar.</p>
          {activity.map((q,i)=>{
            return (
              <div key={i} data-q={i} className="cardfx" style={{...styles.card, padding:scalePx(18), ...(q.bonus ? { borderColor:"#fbbf24" } : {})}}>
                <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:12, justifyContent:"space-between" }}>
                  <p style={{ fontWeight:600, margin:0, flex:1, fontSize:scaleSize(16) }}>
                    {q.bonus && <span style={{ background:"#fbbf2422", border:"1px solid #fbbf24", color:"#fbbf24", borderRadius:20, padding:"2px 9px", fontSize:scaleSize(11), fontWeight:800, marginRight:8, whiteSpace:"nowrap" }}>⭐ Bônus opcional</span>}
                    {i+1}. {q.q}
                  </p>
                  {ttsSupported && <button onClick={() => handleSpeakQuestion(q, i)} style={{ background:isSpeaking && currentSpeakingFor===`q-${i}` ? "#c084fc" : "#c084fc33", border:"1px solid #c084fc", color:"#c084fc", padding:`${scalePx(8)}px ${scalePx(12)}px`, borderRadius:6, fontSize:scaleSize(11), fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", minWidth:"max-content" }}>{isSpeaking && currentSpeakingFor===`q-${i}` ? "⏸" : "🔊"}</button>}
                </div>
                {q.opts.map((opt,j)=>{
                  const picked = answers[i]===j;
                  return (
                    <button key={j} data-opt={j} style={{...styles.opt(picked), minHeight:scalePx(56)}} onClick={()=>pickAnswer(i,j)}>
                      {opt}
                    </button>
                  );
                })}
                {/* 💡 dificuldade adaptativa: dica opcional que ajuda a pensar sem entregar a resposta */}
                {q.dica && (
                  revealedHints[i] ? (
                    <div className="pop" style={{ marginTop:10, background:"#fbbf2416", border:"1px solid #fbbf24", borderRadius:10, padding:"9px 12px", display:"flex", gap:8, alignItems:"flex-start" }}>
                      <span style={{ fontSize:15 }}>💡</span>
                      <p style={{ color:"#fcd9a0", fontSize:scaleSize(12.5), lineHeight:1.6, margin:0 }}>{q.dica}</p>
                    </div>
                  ) : (
                    <button onClick={()=>setRevealedHints(h=>({...h,[i]:true}))} style={{ marginTop:10, background:"transparent", border:"1px dashed #fbbf24", color:"#fbbf24", borderRadius:10, padding:"6px 12px", fontSize:scaleSize(12), fontWeight:700, cursor:"pointer" }}>💡 Quer uma dica?</button>
                  )
                )}
              </div>
            );
          })}
          <div style={{ textAlign:"right" }}>
            <button style={{...styles.btn("#c084fc"), padding:`${scalePx(12)}px ${scalePx(26)}px`, fontSize:scaleSize(15), marginTop:scalePx(16) }} onClick={handleSubmitActivity} disabled={activity.some((q,i)=>!q.bonus && answers[i]==null)}>Enviar Atividade →</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase==="done") {
    const activity = dynamicActivity||[];
    const g = gradeInfo(score);
    const backToHome = async () => { setPhase("coding"); await persist({ phase:"coding" }); };
    const fbStructured = finalFeedback && typeof finalFeedback === "object" && Array.isArray(finalFeedback.secoes) && finalFeedback.secoes.length > 0;
    const fbSpeechText = fbStructured
      ? [finalFeedback.intro, ...finalFeedback.secoes.map(s=>`${s.titulo}. ${s.explicacao}`), finalFeedback.dica].filter(Boolean).join(". ")
      : (typeof finalFeedback === "string" ? finalFeedback : "");
    const FB_ACCENTS = ["#34d399","#fbbf24"];
    return (
      <div className={supportClass} style={styles.container}>
      {routineBar}
      {renderHiddenEggs()}
        <AchievementToast achievement={newAchievement} />
        {goalParty && !calmMode && <ConfettiParty level={goalParty} />}
        {showFeedbackModal && (
          <NyxFeedbackModal score={score} loading={feedbackLoading} feedback={finalFeedback} onClose={()=>{
            setShowFeedbackModal(false);
            // quem errou alguma questão já cai direto na explicação do Nyx, sem precisar clicar em nada
            if ((dynamicActivity||[]).some((q,i)=>!q.bonus && answers[i]!==q.correct)) explainErrors();
          }} />
        )}
        {showErrorExplain && (
          <ErrorExplainModal sections={errorSections} encouragement={errorEncouragement} onClose={()=>setShowErrorExplain(false)} />
        )}
        <div style={styles.header}>
          <span>🎓 Aula Concluída — {studentName}</span>
          <button onClick={backToHome} style={{ background:"transparent", border:"1px solid #3b2a58", color:"#a99ac9", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12.5, fontWeight:700 }}>← Voltar à tela inicial</button>
        </div>
        <div style={{ maxWidth:580, margin:"40px auto", textAlign:"center", padding:24 }}>
          <div ref={el => { if (el) gsap.fromTo(el, { scale:0.2, opacity:0, rotate:-15 }, { scale:1, opacity:1, rotate:0, duration:0.7, ease:"elastic.out(1,0.5)" }); }} style={{ fontSize:72 }}>{g.emoji}</div>
          <h2 ref={el => { if (el) gsap.fromTo(el, { y:16, opacity:0 }, { y:0, opacity:1, duration:0.5, delay:0.15, ease:"back.out(1.7)" }); }} style={{ color:g.color, fontSize:26, fontWeight:900 }}>{g.label} — Você fez {score} pontos!</h2>

          {/* 🎁 presente misterioso do dia: recompensa por concluir a atividade, 1x por dia */}
          {giftReveal ? (
            <div className="pop" style={{ margin:"18px auto 0", maxWidth:340, background:`linear-gradient(135deg, ${giftReveal.color}22, ${giftReveal.color}0a)`, border:`2px solid ${giftReveal.color}`, borderRadius:18, padding:"18px 20px", boxShadow:`0 0 34px ${giftReveal.color}44` }}>
              <div style={{ fontSize:46 }}>{giftReveal.emoji}</div>
              <p style={{ color:giftReveal.color, fontWeight:900, fontSize:17, margin:"6px 0 2px" }}>{giftReveal.label}!</p>
              <p style={{ color:"#f0e9fb", fontWeight:800, fontSize:15, margin:0 }}>+{giftReveal.pts} pontos do Nyx ✨</p>
            </div>
          ) : giftLastClaim !== todayKey() ? (
            <button onClick={openGift} className="pop" title="Um presente por dia pra quem conclui a atividade!"
              style={{ margin:"18px auto 0", display:"block", background:"linear-gradient(135deg,#3b0764,#1e1b4b)", border:"2px dashed #a855f7", borderRadius:18, padding:"14px 26px", cursor:"pointer", boxShadow:"0 0 26px #a855f733" }}>
              <span style={{ fontSize:42, display:"inline-block", animation:"gift-wiggle 1.6s ease-in-out infinite" }}>🎁</span>
              <span style={{ display:"block", color:"#e9d5ff", fontWeight:900, fontSize:14, marginTop:4 }}>Presente misterioso do dia — toque pra abrir!</span>
            </button>
          ) : null}

          <div style={{ marginTop:18, textAlign:"left" }}>
            {/* topo em destaque, mesma estética do Resumo da Aula */}
            <div style={{ background:"linear-gradient(135deg,#c084fc,#8b5cf6)", borderRadius:18, padding:"20px 20px", textAlign:"center", boxShadow:"0 12px 30px #c084fc55" }}>
              <div style={{ fontSize:38 }}>🤖</div>
              <h3 style={{ color:"#fff", fontSize:19, margin:"4px 0 8px" }}>Feedback do Nyx para você</h3>
              {feedbackLoading ? (
                <p style={{ color:"#e0e7ff", fontSize:14 }}>Analisando seu código e sua atividade...</p>
              ) : (
                <p style={{ color:"#e0e7ff", fontSize:14, maxWidth:460, margin:"0 auto", lineHeight:1.6 }}>
                  {fbStructured ? finalFeedback.intro : (typeof finalFeedback === "string" && finalFeedback) ? finalFeedback : "Parabéns por concluir a aula de hoje!"}
                </p>
              )}
              {!feedbackLoading && ttsSupported && fbSpeechText && (
                <button onClick={() => { setCurrentSpeakingFor("feedback"); speak(fbSpeechText); }} style={{ marginTop:10, background:isSpeaking && currentSpeakingFor==="feedback" ? "#fff" : "rgba(255,255,255,0.2)", color:isSpeaking && currentSpeakingFor==="feedback" ? "#c084fc" : "#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  {isSpeaking && currentSpeakingFor==="feedback" ? "⏸ Pausando" : "🔊 Ouvir feedback"}
                </button>
              )}
            </div>

            {fbStructured && (
              <div style={{ marginTop:14 }}>
                {finalFeedback.secoes.map((s,i)=>{
                  const c = FB_ACCENTS[i % FB_ACCENTS.length];
                  return (
                    <div key={i} style={{ background:"#1e1430", borderRadius:14, padding:16, margin:"0 0 12px", border:"1px solid #3b2a58", borderLeft:`5px solid ${c}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:38, height:38, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19 }}>{s.emoji || "📌"}</span>
                        <h4 style={{ color:"#f0e9fb", fontSize:15, margin:0 }}>{s.titulo}</h4>
                      </div>
                      {s.explicacao && <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.7, margin:0 }}>{s.explicacao}</p>}
                    </div>
                  );
                })}
                {finalFeedback.dica && (
                  <div style={{ background:"#fbbf2416", border:"1px solid #fbbf24", borderRadius:14, padding:16, display:"flex", gap:10 }}>
                    <div style={{ fontSize:22, lineHeight:1 }}>💡</div>
                    <div>
                      <h4 style={{ color:"#fbbf24", margin:"0 0 4px", fontSize:14 }}>Dica do Nyx</h4>
                      <p style={{ color:"#fcd9a0", fontSize:13.5, lineHeight:1.7, margin:0 }}>{finalFeedback.dica}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="cardfx" style={{ ...styles.card, marginTop:14, textAlign:"left" }}>
            <h4 style={{ color:"#c084fc", marginBottom:10 }}>📝 Revisão da atividade</h4>
            {activity.map((q,i)=>{
              // a questão bônus nunca aparece como "erro" — ficar sem responder ou errar não conta contra o aluno
              const hit = answers[i]===q.correct;
              const skipped = q.bonus && answers[i]==null;
              const color = skipped ? "#776798" : hit ? "#34d399" : q.bonus ? "#a99ac9" : "#f87171";
              const icon = skipped ? "⭐" : hit ? (q.bonus ? "⭐✅" : "✅") : (q.bonus ? "⭐" : "❌");
              return (
                <div key={i} style={{ marginBottom:12 }}>
                  <b style={{ color }}>{icon} {q.q}</b>
                  {skipped && <div style={{ color:"#776798", fontSize:13, marginTop:2 }}>Bônus não respondido — sem problema, não conta contra você.</div>}
                  {!skipped && !hit && <div style={{ color:"#a99ac9", fontSize:13, marginTop:2 }}>Correto: {q.opts[q.correct]}</div>}
                </div>
              );
            })}
          </div>

          {(dynamicActivity||[]).some((q,i)=>!q.bonus && answers[i]!==q.correct) && (
            <div className="cardfx" style={{ ...styles.card, marginTop:14, textAlign:"left", borderColor:"#c084fc" }}>
              <h4 style={{ color:"#c084fc", marginBottom:8 }}>🤖 Não entendeu algum erro?</h4>
              <p style={{ color:"#a99ac9", fontSize:13, lineHeight:1.6, marginBottom:10 }}>O Nyx pode explicar cada questão que você errou, com calma e do seu jeito.</p>
              <button style={{ ...styles.btn("#c084fc"), opacity:explaining?0.6:1 }} onClick={explainErrors} disabled={explaining}>{explaining ? "Nyx está escrevendo..." : errorSections.length ? "↻ Ver explicação de novo" : "✨ Nyx, me explica meus erros!"}</button>
              {explainFailMsg && <p style={{ color:"#f87171", fontSize:13, marginTop:8 }}>{explainFailMsg}</p>}
            </div>
          )}

          {/* Avaliação da aula → professor */}
          <div className="cardfx" style={{ ...styles.card, marginTop:14, textAlign:"left", borderColor:"#fbbf24" }}>
            <h4 style={{ color:"#fbbf24", marginBottom:8 }}>💬 O que você achou da aula?</h4>
            {classSent ? (
              <p style={{ color:"#34d399", fontSize:14 }}>✅ Obrigado! Seu recado foi enviado para o professor.</p>
            ) : (
              <>
                <Stars value={classRating} onChange={setClassRating} />
                <textarea value={classText} onChange={e=>setClassText(e.target.value)} placeholder="Escreva um recado para o professor (opcional)..."
                  style={{ width:"100%", marginTop:10, background:"#171026", border:"2px solid #3b2a58", borderRadius:8, color:"#f0e9fb", padding:10, fontSize:14, minHeight:70, boxSizing:"border-box", resize:"vertical" }} />
                <div style={{ textAlign:"right", marginTop:8 }}>
                  <button style={styles.btn("#fbbf24")} onClick={sendClassFeedback} disabled={classRating===0}>Enviar avaliação</button>
                </div>
              </>
            )}
          </div>

          <button onClick={backToHome} style={{ ...styles.btn("#c084fc"), marginTop:20 }}>← Voltar à tela inicial</button>
        </div>
      </div>
    );
  }

  // um único botão — o Nyx tenta o primeiro modelo e, se falhar por qualquer motivo, tenta o
  // outro sozinho por trás dos panos, sem o aluno precisar escolher nem clicar de novo
  const analyzeButtons = (
    <button title={activeCode.trim().length<12 ? "Escreva um pouco mais de código neste arquivo antes de pedir a análise" : ""} style={{ ...styles.btn("#c084fc"), opacity:(analyzing||activeCode.trim().length<12)?0.55:1 }} onClick={()=>analyzeCode()} disabled={analyzing||activeCode.trim().length<12}>
      {analyzing ? "🔍 Analisando..." : "✨ Analisar código"}
    </button>
  );

  // ── CODING ──
  return (
    <div className={supportClass} style={styles.container}>
      {routineBar}
      {renderHiddenEggs()}
      {/* pergunta de preferência de interação do Nyx — perfil novo, antes até da apresentação e do tour */}
      {showNyxPrefs && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1001, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"26px 24px", maxWidth:460, width:"100%", boxShadow:"0 24px 70px rgba(0,0,0,.55), 0 0 44px #c084fc22" }}>
            <div style={{ textAlign:"center" }}>
              <NyxRobot state="idle" size={80} showName={false} />
              <p style={{ color:"#f0e9fb", fontSize:16.5, fontWeight:800, margin:"10px 0 4px" }}>Antes de começar, {String(studentName).split(" ")[0]}...</p>
              <p style={{ color:"#a99ac9", fontSize:13, margin:0, lineHeight:1.6 }}>Me conta como você prefere que eu converse e explique as coisas — cada pessoa gosta de um jeito!</p>
            </div>
            <div style={{ marginTop:18 }}>
              <p style={{ color:"#c084fc", fontWeight:700, fontSize:13, marginBottom:8 }}>Meu jeito de conversar:</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[["divertido","😄 Animado e brincalhão"],["serio","🎯 Sério e direto ao ponto"]].map(([v,label])=>(
                  <button key={v} onClick={()=>setNyxPrefs(p=>({...p, tom:v}))}
                    style={{ flex:"1 1 180px", padding:"10px 12px", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:700, textAlign:"center",
                      background: nyxPrefs.tom===v ? "linear-gradient(135deg,#c084fc,#9333ea)" : "#171026",
                      color: nyxPrefs.tom===v ? "#fff" : "#d6c9ec",
                      border: nyxPrefs.tom===v ? "2px solid #c084fc" : "2px solid #3b2a58" }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop:16 }}>
              <p style={{ color:"#c084fc", fontWeight:700, fontSize:13, marginBottom:8 }}>Como eu explico as coisas:</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[["detalhada","📖 Bem explicado, com detalhes"],["direta","⚡ Direto ao ponto, menos texto"]].map(([v,label])=>(
                  <button key={v} onClick={()=>setNyxPrefs(p=>({...p, estilo:v}))}
                    style={{ flex:"1 1 180px", padding:"10px 12px", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:700, textAlign:"center",
                      background: nyxPrefs.estilo===v ? "linear-gradient(135deg,#c084fc,#9333ea)" : "#171026",
                      color: nyxPrefs.estilo===v ? "#fff" : "#d6c9ec",
                      border: nyxPrefs.estilo===v ? "2px solid #c084fc" : "2px solid #3b2a58" }}>{label}</button>
                ))}
              </div>
            </div>
            <p style={{ color:"#776798", fontSize:11.5, margin:"14px 0 0", textAlign:"center" }}>Não se preocupe, dá pra mudar depois quando quiser.</p>
            <button onClick={async ()=>{ setShowNyxPrefs(false); await persist({ nyxPrefs }); }} style={{ ...styles.btn("#c084fc"), width:"100%", padding:"13px 0", fontSize:15, marginTop:16 }}>
              Continuar →
            </button>
          </div>
        </div>
      )}
      {/* 🌐 sala de linguagens: escolha de HTML/CSS/PHP/JS antes de conhecer o Nyx */}
      {!showNyxPrefs && showLangPicker && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1001, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"26px 24px", maxWidth:480, width:"100%", boxShadow:"0 24px 70px rgba(0,0,0,.55), 0 0 44px #22d3ee22" }}>
            <div style={{ textAlign:"center" }}>
              <NyxRobot state="idle" size={80} showName={false} />
              <p style={{ color:"#f0e9fb", fontSize:16.5, fontWeight:800, margin:"10px 0 4px" }}>E aí, {String(studentName).split(" ")[0]}! 🌐</p>
              <p style={{ color:"#a99ac9", fontSize:13, margin:0, lineHeight:1.6 }}>Você está na sala de linguagens — qual você quer estudar? Eu viro especialista nela pra te ajudar.</p>
            </div>
            <div style={{ marginTop:18, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {STUDY_LANGUAGES.map(l => (
                <button key={l.id} onClick={()=>chooseLanguage(l.id)}
                  style={{ background:"#171026", border:"2px solid #3b2a58", borderRadius:14, padding:"18px 10px", cursor:"pointer", textAlign:"center", color:"#f0e9fb" }}>
                  <span style={{ display:"block", fontSize:30, marginBottom:6 }}>{l.emoji}</span>
                  <span style={{ display:"block", fontWeight:800, fontSize:14.5 }}>{l.label}</span>
                </button>
              ))}
            </div>
            <p style={{ color:"#776798", fontSize:11.5, margin:"16px 0 0", textAlign:"center" }}>Dá pra trocar de linguagem depois, quando quiser — seu código antigo fica guardado no histórico.</p>
          </div>
        </div>
      )}
      {/* apresentação do Nyx no primeiro acesso */}
      {!showNyxPrefs && !showLangPicker && showIntro && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"26px 24px", maxWidth:440, width:"100%", textAlign:"center", boxShadow:"0 24px 70px rgba(0,0,0,.55), 0 0 44px #c084fc22" }}>
            <div style={{ animation:"nyx-float 3s ease-in-out .8s infinite" }}>
              <NyxRobot state="ok" size={112} showName={false} />
            </div>
            <div style={{ fontWeight:900, fontSize:14, letterSpacing:3, color:"#c084fc", marginTop:4 }}>NYX</div>
            {/* balão de fala */}
            <div style={{ position:"relative", background:"#171026", border:"1px solid #3e2d5e", borderRadius:16, padding:"16px 18px", marginTop:16, textAlign:"left" }}>
              <div style={{ position:"absolute", top:-8, left:"50%", width:14, height:14, background:"#171026", borderLeft:"1px solid #3e2d5e", borderTop:"1px solid #3e2d5e", transform:"translateX(-50%) rotate(45deg)" }} />
              <p style={{ color:"#f0e9fb", fontSize:16.5, fontWeight:800, margin:0, animation:"rise .5s ease .3s both" }}>
                Oi, {String(studentName).split(" ")[0]}! Eu sou o <span style={{color:"#c084fc"}}>Nyx</span> 🤖
              </p>
              <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.7, margin:"10px 0 0", animation:"rise .5s ease 1s both" }}>
                Eu fico do lado do seu editor conferindo o código enquanto você escreve.
              </p>
              <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.7, margin:"10px 0 0", animation:"rise .5s ease 1.7s both" }}>
                Se algo estiver errado, eu mostro <b style={{color:"#fbbf24"}}>onde está</b> e <b style={{color:"#34d399"}}>como corrigir</b> — até as teclas que você precisa apertar!
              </p>
            </div>
            <button onClick={()=>{ setShowIntro(false); setTourStep(0); }} style={{ ...styles.btn("#c084fc"), width:"100%", padding:"13px 0", fontSize:15, marginTop:16, animation:"rise .5s ease 2.4s both" }}>
              Conhecer minha sala! ✨
            </button>
          </div>
        </div>
      )}
      {aiDown && (
        <div style={{ position:"fixed", top:12, left:12, zIndex:1200, background:"#231636", border:"1px solid #fbbf24", borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
          <span style={{ display:"inline-block", width:9, height:9, borderRadius:"50%", background:"#fbbf24", animation:"nyx-antenna 1s ease-in-out infinite" }} />
          <span style={{ color:"#fbbf24", fontSize:12.5, fontWeight:700 }}>🔄 Reconectando Nyx...</span>
        </div>
      )}
      <div style={styles.header}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={()=>setShowAvatarEdit(true)} title="Editar meu boneco"
            style={{ background:"transparent", border:"none", padding:0, cursor:"pointer", position:"relative", lineHeight:0 }}>
            <Avatar cfg={avatar} size={34} animated={!calmMode} />
            <span style={{ position:"absolute", right:-4, bottom:-4, background:"#c084fc", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, boxShadow:"0 1px 3px rgba(0,0,0,.5)" }}>✏️</span>
          </button>
          <span className="shine" style={{ fontWeight:900, fontSize:17, background:"linear-gradient(120deg,#c084fc,#22d3ee,#c084fc)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>💻 Aula C#</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color: connected===false?"#f87171":connected?"#34d399":"#a99ac9" }}>
            {connected===null ? "● conectando..." : connected ? "● conectado" : "● sem conexão"}
          </span>
          <span style={{ display:"inline-flex", alignItems:"center", gap:8, fontSize:11 }}>
            {[["nvidia","✨ Nemotron"],["laguna","🌊 Laguna"]].map(([key,label]) => {
              const h = providerHealth[key];
              const recent = h && Date.now() - h.at < 5 * 60 * 1000;
              const color = !recent ? "#5d679c" : h.ok ? "#34d399" : "#f87171";
              const title = !recent ? `${label}: sem dados recentes` : h.ok ? `${label}: respondendo normalmente` : `${label}: não respondeu na última tentativa`;
              return (
                <span key={key} title={title} style={{ display:"inline-flex", alignItems:"center", gap:4, color:"#a99ac9" }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:color, display:"inline-block", boxShadow: recent && h.ok ? `0 0 5px ${color}` : "none" }} />
                  {label}
                </span>
              );
            })}
          </span>
          <span style={{ background:"#c084fc22", padding:"4px 12px", borderRadius:20, fontSize:13 }}>👤 {studentName}</span>
          <span style={{ background:"#171026", border:"1px solid #3b2a58", padding:"4px 10px", borderRadius:20, fontSize:12, color:"#a99ac9" }}>{shiftLabel(shift)}</span>
          {streakCount >= 2 && <span title="Dias de aula seguidos que você participou" style={{ background:"#f8717122", border:"1px solid #f87171", padding:"4px 10px", borderRadius:20, fontSize:12, color:"#fca5a5", fontWeight:800 }}>🔥 {streakCount} dias seguidos</span>}
          <button data-tour="tema" style={{ ...styles.btn("#3b2a58"), padding:"6px 12px", fontSize:12 }} onClick={()=>setThemeAndSave(theme==="light"?"dark":"light")} title="Mudar tema do fundo">{theme==="light"?"🌙 Escuro":"☀️ Claro"}</button>
          {isSpartan && (
            <button style={{ ...styles.btn("#b45309"), padding:"6px 12px", fontSize:12 }}
              onClick={()=>setThemeAndSave(theme==="spartan" ? (themeBeforeSpartan||"dark") : "spartan")}
              title="Espada + escudo equipados: use o tema exclusivo do Espartano ou volte ao seu tema de sempre, é você quem escolhe">
              {theme==="spartan" ? "🎨 Tema normal" : "🛡️ Tema Espartano"}
            </button>
          )}
          <button style={{ ...styles.btn("#3b2a58"), padding:"6px 12px", fontSize:12 }} onClick={toggleMuted} title={muted?"Ativar sons":"Silenciar sons"}>{muted?"🔇":"🔊"}</button>
          <button data-tour="acessibilidade" style={{ ...styles.btn(largeUiMode?"#06b6d4":"#3b2a58"), padding:"6px 12px", fontSize:12 }} onClick={()=>{ setLargeUiMode(!largeUiMode); try { localStorage.setItem("nyx_large_ui", !largeUiMode?"1":"0"); } catch {} }} title={largeUiMode?"Desativar modo acessível":"Ativar modo acessível (letras maiores)"}>♿</button>
          {ttsSupported && <button style={{ ...styles.btn("#3b2a58"), padding:"6px 12px", fontSize:12 }} onClick={()=>setShowVoicePicker(true)} title="Escolher a voz do Nyx (leitura em voz alta)">🗣️</button>}
          <button style={{ ...styles.btn("#3b2a58"), padding:"6px 12px", fontSize:12 }} onClick={tryFullscreen}>⛶ Tela cheia</button>
          <button style={{ ...styles.btn("#f87171"), padding:"6px 12px", fontSize:12 }} onClick={onLogout}>Sair</button>
        </div>
      </div>

      <AchievementToast achievement={newAchievement} />
        {goalParty && !calmMode && <ConfettiParty level={goalParty} />}

      {showNudge && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#fbbf2418", border:"2px solid #fbbf24", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:26 }}>📣</span>
            <div style={{ flex:1 }}>
              <b style={{ color:"#fbbf24" }}>Recado do professor</b>
              <p style={{ color:"#fcd9a0", fontSize:14, margin:"2px 0 0", lineHeight:1.5 }}>{nudge.text}</p>
            </div>
            <button onClick={dismissNudge} style={{ ...styles.btn("#fbbf24"), padding:"6px 12px", fontSize:13 }}>Entendi</button>
          </div>
        </div>
      )}

      {idleHint && !showNudge && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#c084fc18", border:"1px solid #c084fc", color:"#c7d2fe", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>👀</span>
            <span>Bora começar? Escreva seu primeiro código no editor — o Nyx te ajuda assim que você parar de digitar.</span>
          </div>
        </div>
      )}

      {fsMsg && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#1e1430", border:"1px solid #fbbf24", color:"#fbbf24", borderRadius:10, padding:"8px 14px", fontSize:13 }}>⛶ {fsMsg}</div>
        </div>
      )}

      {bossInfo && phase==="coding" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"linear-gradient(90deg,#3b076422,#1e1b4b44)", border:"1px solid #a855f7", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20, animation:"nyx-shake 2.2s ease-in-out infinite" }}>{bossInfo.emoji}</span>
            <span style={{ flex:1, color:"#e9d5ff" }}><b style={{ color:"#c4b5fd" }}>{bossInfo.name} invadiu a aula!</b> Cada resposta certa da turma tira vida dele — acompanhe a batalha no telão! ⚔️</span>
          </div>
        </div>
      )}

      {classStatusNow.inBreak && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"linear-gradient(90deg,#0e749922,#22d3ee22)", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>🍎</span>
            <span style={{ flex:1, color:"#a5f3fc" }}><b style={{ color:"#22d3ee" }}>Hora do intervalo!</b> Volta em {classStatusNow.minutesToBreakEnd} min. Pode continuar mexendo no código se quiser — é só descanso, sem pressa. 😊</span>
          </div>
        </div>
      )}
      {classStatusNow.warnEnd && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#fbbf2418", border:"1px solid #fbbf24", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>⏰</span>
            <span style={{ flex:1, color:"#fcd9a0" }}><b style={{ color:"#fbbf24" }}>Faltam {classStatusNow.minutesToEnd} minuto{classStatusNow.minutesToEnd!==1?"s":""} pra aula acabar!</b> Já pode ir salvando seu trabalho.</span>
          </div>
        </div>
      )}
      {breakEndMsg && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#22d3ee18", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", fontSize:13, color:"#a5f3fc", fontWeight:700 }}>{breakEndMsg}</div>
        </div>
      )}
      {/* 🎉 quiz: sala aberta pelo professor — botão brilhante pra entrar com o código */}
      {quizRoomInfo && quizRoomInfo.status !== "podium" && (!quizJoin || quizJoin.code !== quizRoomInfo.code) && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <button onClick={()=>{ setShowQuizJoin(true); setQuizCodeInput(""); setQuizCodeError(""); }}
            style={{ width:"100%", background:"linear-gradient(120deg,#7c3aed,#c026d3,#7c3aed)", backgroundSize:"200% auto", border:"2px solid #c084fc", borderRadius:14, padding:"14px 18px", color:"#fff", fontWeight:900, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, animation:"glow-ring 1.3s ease-in-out infinite, shine 3s linear infinite" }}>
            <span style={{ fontSize:22, animation:"pulse-dot 1.1s ease-in-out infinite" }}>🎉</span>
            Quiz valendo! Toque aqui e entre com o código
          </button>
        </div>
      )}
      {/* 🤝 parceiro de código: alguém foi designado pra me ajudar */}
      {partnerHelped && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#22d3ee18", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>🤝</span>
            <span style={{ flex:1, color:"#a5f3fc" }}><b style={{ color:"#22d3ee" }}>{partnerHelped.helper}</b> vai te ajudar agora! Ele(a) pode ver seu código pra te dar uma força.</span>
          </div>
        </div>
      )}
      {partnerToast && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div className="pop" style={{ background:"#34d39918", border:"1px solid #34d399", borderRadius:12, padding:"10px 14px", fontSize:13, color:"#c7f5df", fontWeight:700 }}>{partnerToast}</div>
        </div>
      )}

      {/* 📶 internet caiu: tranquiliza o aluno — o trabalho está guardado neste computador e
          o próprio heartbeat re-salva tudo sozinho assim que a conexão voltar */}
      {connected === false && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#fbbf2418", border:"1px solid #fbbf24", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>📶</span>
            <span style={{ flex:1, color:"#fde68a", lineHeight:1.6 }}><b style={{ color:"#fbbf24" }}>A internet caiu — mas pode continuar programando!</b> Seu código está guardado neste computador e vai ser salvo sozinho assim que a conexão voltar. Não precisa fazer nada.</span>
          </div>
        </div>
      )}
      {justReconnected && connected && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div className="pop" style={{ background:"#34d39918", border:"1px solid #34d399", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>✅</span>
            <span style={{ flex:1, color:"#c7f5df", fontWeight:700 }}>Conexão de volta — todo o seu trabalho foi salvo!</span>
          </div>
        </div>
      )}

      {!recapDismissed && recapText && phase==="coding" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#34d39918", border:"1px solid #34d399", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>📋</span>
            <span style={{ flex:1, color:"#c7f5df" }}><b style={{ color:"#34d399" }}>Retomando:</b> {recapText}</span>
            <button onClick={()=>{ setRecapDismissed(true); try { localStorage.setItem(`nyx_recap_${todayKey()}_${shift}_${studentName}`, "1"); } catch {} }} style={{ background:"transparent", border:"none", color:"#34d399", fontSize:16, cursor:"pointer", flexShrink:0 }}>✕</button>
          </div>
        </div>
      )}

      {!videnteDismissed && !focusMode && phase==="coding" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ position:"relative", background:"linear-gradient(120deg,#1e1b4b,#3b0764,#1e1b4b)", border:"1px solid #8b5cf6", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10, overflow:"hidden" }}>
            <span style={{ fontSize:22, animation:"nyx-float 3s ease-in-out infinite", flexShrink:0 }}>🔮</span>
            <span style={{ flex:1, color:"#ddd6fe", lineHeight:1.6 }}>
              <b className="shine" style={{ background:"linear-gradient(120deg,#c4b5fd,#f0abfc,#c4b5fd)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>Nyx Vidente prevê:</b>{" "}
              {VIDENTE_PREVISOES[hashStr(studentName + todayKey()) % VIDENTE_PREVISOES.length].replace("{nome}", String(studentName).split(" ")[0])} ✨
            </span>
            <button onClick={()=>{ setVidenteDismissed(true); try { localStorage.setItem(`nyx_vidente_${todayKey()}_${shift}_${studentName}`, "1"); } catch {} }} style={{ background:"transparent", border:"none", color:"#8b5cf6", fontSize:16, cursor:"pointer", flexShrink:0 }}>✕</button>
          </div>
        </div>
      )}

      {!kbSuggestDismissed && !keyboardDone && (easyRead || supportFlags.motora || selfSupport.motora) && phase==="coding" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"linear-gradient(90deg,#0e749922,#22d3ee22)", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>⌨️</span>
            <span style={{ flex:1, color:"#a5f3fc" }}><b style={{ color:"#22d3ee" }}>Quer treinar o teclado?</b> O Nyx te mostra tecla por tecla, no seu ritmo — pode fazer quando quiser.</span>
            <button onClick={()=>{ setShowKeyboard(true); setKbSuggestDismissed(true); try { localStorage.setItem(`nyx_kbsuggest_${todayKey()}_${shift}_${studentName}`, "1"); } catch {} }} style={{ ...styles.btn("#22d3ee"), padding:"6px 12px", fontSize:12.5 }}>Treinar agora</button>
            <button onClick={()=>{ setKbSuggestDismissed(true); try { localStorage.setItem(`nyx_kbsuggest_${todayKey()}_${shift}_${studentName}`, "1"); } catch {} }} style={{ background:"transparent", border:"none", color:"#22d3ee", fontSize:16, cursor:"pointer", flexShrink:0 }}>✕</button>
          </div>
        </div>
      )}

      {curiosity && !curiosityDismissed && !focusMode && phase==="coding" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#22d3ee18", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>💡</span>
            <span style={{ flex:1, color:"#c7f5f9" }}><b style={{ color:"#22d3ee" }}>Curiosidade do dia:</b> {curiosity}</span>
            <button onClick={()=>setCuriosityDismissed(true)} style={{ background:"transparent", border:"none", color:"#776798", fontSize:16, cursor:"pointer" }}>✕</button>
          </div>
        </div>
      )}

      {renaming != null && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#1e1430", border:"2px solid #c084fc", borderRadius:16, padding:24, maxWidth:380, width:"100%" }}>
            <h3 style={{ color:"#c084fc", margin:"0 0 4px" }}>✎ Renomear arquivo</h3>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 12px" }}>Escolha um nome para o arquivo (o "{fileExt}" é colocado sozinho).</p>
            <div style={{ display:"flex", alignItems:"center", background:"#171026", border:"2px solid #3b2a58", borderRadius:10, padding:"0 12px" }}>
              <input autoFocus value={renameValue} onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") confirmRename(); if(e.key==="Escape") cancelRename(); }}
                placeholder="ex: MeuPrograma" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#f0e9fb", fontSize:15, padding:"11px 0" }} />
              <span style={{ color:"#776798", fontSize:14 }}>.cs</span>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={cancelRename} style={{ ...styles.btn("#3b2a58"), flex:1 }}>Cancelar</button>
              <button onClick={confirmRename} style={{ ...styles.btn("#c084fc"), flex:1 }}>Salvar nome</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:14, padding:14, maxWidth:1180, margin:"0 auto", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 560px", minWidth:320 }}>
          {accessMode ? (
            <div className="cardfx" style={{ ...styles.card, borderColor:"#22d3ee" }}>
              <h3 style={{ color:"#22d3ee", marginBottom:4, fontSize:scaleSize(19) }}>🧩 Modo Guiado — Monte seu programa!</h3>
              <p style={{ color:"#a99ac9", fontSize:scaleSize(13), marginBottom:14 }}>Clique nos blocos abaixo para montar seu programa, um passo de cada vez! {ttsSupported && "O Nyx explica cada bloco em voz alta pra você."}</p>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
                {GUIDED_BLOCKS.map(block => (
                  <button key={block.id} onClick={()=> block.needsInput ? setPendingBlock({ block, value:"" }) : addGuidedBlock(block)}
                    style={{ background:"#1e1430", border:"2px solid #3b2a58", borderRadius:12, padding:"14px 10px", cursor:"pointer", color:"#f0e9fb", textAlign:"center", minHeight:scalePx(92) }}>
                    <div style={{ fontSize:scaleSize(30) }}>{block.emoji}</div>
                    <div style={{ fontSize:scaleSize(12.5), fontWeight:700, marginTop:6 }}>{block.label}</div>
                  </button>
                ))}
              </div>

              {pendingBlock && (
                <div style={{ marginTop:16, background:"#171026", border:"2px solid #22d3ee", borderRadius:12, padding:16 }}>
                  <p style={{ color:"#22d3ee", fontWeight:700, marginBottom:8, fontSize:scaleSize(14) }}>{pendingBlock.block.emoji} {pendingBlock.block.inputLabel}</p>
                  <input autoFocus value={pendingBlock.value} onChange={e=>setPendingBlock({ ...pendingBlock, value:e.target.value })}
                    placeholder={pendingBlock.block.placeholder}
                    onKeyDown={e=>{ if (e.key==="Enter" && pendingBlock.value.trim()) addGuidedBlock(pendingBlock.block, pendingBlock.value); }}
                    style={{ width:"100%", background:"#1e1430", border:"1px solid #3b2a58", borderRadius:8, padding:`${scalePx(10)}px ${scalePx(12)}px`, color:"#f0e9fb", fontSize:scaleSize(15), boxSizing:"border-box" }} />
                  <div style={{ display:"flex", gap:8, marginTop:10 }}>
                    <button onClick={()=>setPendingBlock(null)} style={{ ...styles.btn("#3b2a58"), flex:1 }}>Cancelar</button>
                    <button onClick={()=>addGuidedBlock(pendingBlock.block, pendingBlock.value)} disabled={!pendingBlock.value.trim()} style={{ ...styles.btn("#22d3ee"), flex:1, opacity:pendingBlock.value.trim()?1:0.5 }}>Adicionar ✅</button>
                  </div>
                </div>
              )}

              {/* Nyx te ensina: mini-lições de C# geradas sob demanda, sempre com exemplo de jogo — o professor mantém
                  o Modo Guiado ligado durante a aula toda, e o aluno pode pedir quantas lições quiser nesse período */}
              <div style={{ marginTop:20, background:"linear-gradient(135deg,#c084fc22,#8b5cf622)", border:"1px solid #c084fc55", borderRadius:14, padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:scaleSize(26) }}>🎮</span>
                    <div>
                      <h4 style={{ color:"#d6c9ec", margin:0, fontSize:scaleSize(15) }}>Nyx te ensina a programar jogos!</h4>
                      <p style={{ color:"#a99ac9", margin:"2px 0 0", fontSize:scaleSize(12) }}>Peça quantas lições quiser — o Nyx sempre explica com exemplo de jogo.</p>
                    </div>
                  </div>
                  <button onClick={generateGuidedLesson} disabled={guidedLessonLoading} style={{ ...styles.btn("#c084fc"), opacity:guidedLessonLoading?0.6:1, whiteSpace:"nowrap" }}>
                    {guidedLessonLoading ? "🤔 Pensando..." : "✨ Me ensina um truque novo!"}
                  </button>
                </div>
                {guidedLessons.length > 0 && (
                  <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:10 }}>
                    {guidedLessons.map((l,i)=>{
                      const LC = ["#34d399","#fbbf24","#06b6d4","#ec4899","#8b5cf6"];
                      const c = LC[i % LC.length];
                      const lessonSpeech = [l.titulo, l.codigo ? `O código é: ${codeForSpeech(l.codigo)}` : null, l.oQueFaz, l.exemploJogo].filter(Boolean).join(". ");
                      return (
                        <div key={l.id} style={{ background:"#1e1430", borderRadius:12, padding:14, border:"1px solid #3b2a58", borderLeft:`5px solid ${c}` }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:34, height:34, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>{l.emoji || "🎮"}</span>
                              <h5 style={{ color:"#f0e9fb", margin:0, fontSize:scaleSize(14) }}>{l.titulo}</h5>
                            </div>
                            {ttsSupported && <button onClick={() => { setCurrentSpeakingFor(`lesson-${l.id}`); speak(lessonSpeech); }} style={{ background:isSpeaking && currentSpeakingFor===`lesson-${l.id}` ? c : c+"33", border:`1px solid ${c}`, color:c, padding:"5px 10px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>{isSpeaking && currentSpeakingFor===`lesson-${l.id}` ? "⏸" : "🔊"}</button>}
                          </div>
                          {l.codigo && <CodeBlock code={l.codigo} />}
                          {l.oQueFaz && <p style={{ color:"#d6c9ec", fontSize:scaleSize(13), lineHeight:1.7, margin:"6px 0 0" }}>{l.oQueFaz}</p>}
                          {l.exemploJogo && <p style={{ color:"#a5b4fc", fontSize:scaleSize(12.5), lineHeight:1.7, margin:"4px 0 0", fontStyle:"italic" }}>🎮 {l.exemploJogo}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginTop:20 }}>
                <h4 style={{ color:"#c084fc", marginBottom:8, fontSize:scaleSize(15) }}>📜 Seu programa (nesta ordem)</h4>
                {guidedBlocks.length===0 ? (
                  <p style={{ color:"#776798", fontSize:scaleSize(13) }}>Clique num bloco acima para começar!</p>
                ) : (
                  <>
                  {guidedBlocks.length > 1 && <p style={{ color:"#776798", fontSize:scaleSize(11.5), margin:"0 0 8px" }}>🖐️ Arraste pelo <b style={{color:"#a99ac9"}}>⠿</b> pra reordenar, ou use as setinhas.</p>}
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {guidedBlocks.map((b,i)=>{
                      const isDragging = guidedDragIdx === i;
                      const isOver = guidedOverIdx === i && guidedDragIdx != null && guidedDragIdx !== i;
                      return (
                      <div key={b.uid} ref={el => guidedRowRefs.current[i]=el}
                        style={{
                          display:"flex", alignItems:"center", gap:10, background:"#1e1430",
                          border: isOver ? "2px dashed #22d3ee" : "1px solid #3b2a58", borderRadius:8, padding:"8px 12px",
                          opacity: isDragging ? 0.45 : 1,
                          transform: isDragging ? "scale(1.03)" : "scale(1)",
                          boxShadow: isDragging ? "0 8px 20px rgba(0,0,0,.35)" : "none",
                          transition: "border-color .12s, transform .12s, opacity .12s",
                          animation: guidedJustDropped === b.uid ? "guided-snap .32s ease" : "none",
                          touchAction: guidedDragIdx != null ? "none" : "auto",
                        }}>
                        <span onPointerDown={(e)=>{ e.preventDefault(); startGuidedDrag(i); }} onTouchStart={()=>startGuidedDrag(i)}
                          title="Arraste pra reordenar" style={{ cursor: guidedDragIdx===i ? "grabbing" : "grab", color:"#776798", fontSize:scaleSize(18), padding:"2px 4px", userSelect:"none", touchAction:"none" }}>⠿</span>
                        <span style={{ fontSize:scaleSize(20) }}>{b.emoji}</span>
                        <span style={{ flex:1, fontSize:scaleSize(13) }}>{i+1}. {b.label}</span>
                        <button onClick={()=>moveGuidedBlock(i,-1)} disabled={i===0} style={{ background:"transparent", border:"none", color:"#a99ac9", cursor:"pointer", opacity:i===0?0.3:1, fontSize:scaleSize(15), minWidth:scaleSize(32) }}>⬆️</button>
                        <button onClick={()=>moveGuidedBlock(i,1)} disabled={i===guidedBlocks.length-1} style={{ background:"transparent", border:"none", color:"#a99ac9", cursor:"pointer", opacity:i===guidedBlocks.length-1?0.3:1, fontSize:scaleSize(15), minWidth:scaleSize(32) }}>⬇️</button>
                        <button onClick={()=>removeGuidedBlock(b.uid)} style={{ background:"transparent", border:"none", color:"#f87171", cursor:"pointer", fontSize:scaleSize(16), minWidth:scaleSize(32) }}>✕</button>
                      </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>

              {activeCode.trim() && (
                <div style={{ marginTop:16 }}>
                  <p style={{ color:"#776798", fontSize:scaleSize(12), marginBottom:2 }}>👀 Assim fica o código de verdade (o Nyx e o professor conseguem ver):</p>
                  <CodeBlock code={activeCode} />
                </div>
              )}

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16, flexWrap:"wrap", gap:8 }}>
                <span style={{ color: saveWarn ? "#fbbf24" : "#776798", fontSize:scaleSize(12) }}>{saveWarn || (analyzing ? "🔍 Verificando..." : activeCode.trim().length < 12 ? "✍️ Escreva um pouco mais de código neste arquivo para poder pedir a análise do Nyx" : "✨ Peça ao Nyx quando quiser que ele confira seu código")}</span>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {analyzeButtons}
                  <button data-tour="salvar" style={styles.btn("#34d399")} onClick={handleSave}>💾 Salvar e Finalizar Aula</button>
                </div>
              </div>

              <Terminal files={files} dataTour="terminal" onEasterEgg={handleEasterEgg} />
            </div>
          ) : (
            <>
              {/* abas de arquivos */}
              <div data-tour="arquivos" style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                {files.map((f,i)=>(
                  <div key={i} onClick={()=>setActive(i)} style={{ display:"flex", alignItems:"center", gap:6, background:i===active?"#1e1e1e":"#101425", border:`1px solid ${i===active?"#c084fc":"#3b2a58"}`, color:i===active?"#fff":"#a99ac9", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>
                    <span>📄 {f.name}</span>
                    <span onClick={(e)=>{e.stopPropagation();openRename(i);}} title="Renomear" style={{ color:"#c084fc", fontWeight:700 }}>✎</span>
                    {files.length>1 && <span onClick={(e)=>{e.stopPropagation();deleteFile(i);}} title="Apagar" style={{ color:"#f87171", fontWeight:700 }}>✕</span>}
                  </div>
                ))}
                <button onClick={addFile} style={{ background:"#171026", border:"1px dashed #c084fc", color:"#c084fc", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>＋ Novo arquivo</button>
              </div>

              <div data-tour="editor">
                <VSEditor value={activeCode} onChange={updateActiveCode} filename={files[active]?.name} errorLines={errorLinesForEditor} locked={analyzing} />
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8, flexWrap:"wrap", gap:8 }}>
                <span style={{ color: saveWarn ? "#fbbf24" : "#776798", fontSize:12 }}>{saveWarn || (analyzing ? "🔍 Verificando..." : activeCode.trim().length < 12 ? "✍️ Escreva um pouco mais de código neste arquivo para poder pedir a análise do Nyx" : "✨ Peça ao Nyx quando quiser que ele confira seu código")}</span>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {analyzeButtons}
                  <button data-tour="salvar" style={styles.btn("#34d399")} onClick={handleSave}>💾 Salvar e Finalizar Aula</button>
                </div>
              </div>

              <Terminal files={files} dataTour="terminal" onEasterEgg={handleEasterEgg} />
            </>
          )}
        </div>

        {/* Robô + atalhos — fica "grudado" na tela conforme rola a página, com scroll próprio se o conteúdo for mais alto que a tela */}
        <div className="side-col side-col-sticky" style={{ width:250, flex:"0 0 250px" }}>
          {showErrorWalkthrough && codeErrors.length > 0 && (
            vw > 700 ? (
              <FloatingErrorBubble
                errors={codeErrors}
                step={Math.min(errorWalkStep, codeErrors.length-1)}
                activeCode={activeCode}
                verifying={analyzing}
                onPrev={()=>setErrorWalkStep(s=>Math.max(0,s-1))}
                onNext={()=>setErrorWalkStep(s=>Math.min(codeErrors.length-1,s+1))}
                onVerify={analyzeCode}
                onClose={()=>setShowErrorWalkthrough(false)}
              />
            ) : (
              <ErrorWalkthroughCard
                errors={codeErrors}
                step={Math.min(errorWalkStep, codeErrors.length-1)}
                verifying={analyzing}
                onPrev={()=>setErrorWalkStep(s=>Math.max(0,s-1))}
                onNext={()=>setErrorWalkStep(s=>Math.min(codeErrors.length-1,s+1))}
                onVerify={analyzeCode}
                onClose={()=>setShowErrorWalkthrough(false)}
              />
            )
          )}
          <div data-tour="nyx" className="cardfx" style={styles.card}>
            <NyxRobot state={robotState} size={88} gear={nyxGear} />
            {robotMsg&&(<div style={{ background:robotState==="error"?"#f8717111":"#34d39911", border:`1px solid ${robotState==="error"?"#f87171":"#34d399"}`, borderRadius:8, padding:12, marginTop:10, fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap" }}>
              {robotMsg}
              {ttsSupported && <div style={{ marginTop:8 }}><button onClick={()=>speak(robotMsg)} style={{ background:"transparent", border:`1px solid ${robotState==="error"?"#f87171":"#34d399"}`, color:robotState==="error"?"#f87171":"#34d399", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>🔊 Ouvir</button></div>}
            </div>)}
            {keysToShow.length>0&&(<div style={{ marginTop:10 }}><p style={{ color:"#fbbf24", fontSize:12, fontWeight:600, marginBottom:4 }}>Teclas para usar:</p>{keysToShow.map((k,i)=><KeyVisual key={i} char={k}/>)}</div>)}
            {helpAt
              ? <button data-tour="ajuda" onClick={cancelHelp} style={{ ...styles.btn("#34d399"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="O professor já foi avisado — clique pra cancelar o pedido">✋ Professor avisado! (cancelar)</button>
              : <button data-tour="ajuda" onClick={askHelp} style={{ ...styles.btn("#fbbf24"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Acende seu nome no painel do professor pra ele vir te ajudar">✋ Pedir ajuda do professor</button>}
            {!partnerHelped && (wantsPartner
              ? <button onClick={cancelPartnerRequest} style={{ ...styles.btn("#22d3ee"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Clique pra cancelar o pedido">🙋 Parceiro pedido! (cancelar)</button>
              : <button onClick={askPartner} style={{ ...styles.btn("#3b2a58"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Avisa o professor que você quer um colega pra ajudar você — ele escolhe quem, por segurança">🤝 Pedir um parceiro pra me ajudar</button>)}
            {partnerHelping && (
              <button onClick={()=>{ setPartnerViewActive(0); setShowPartnerHelp(true); }} style={{ ...styles.btn("#22d3ee"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Veja o código dele(a) (só leitura) e marque como resolvido quando ajudar">
                🤝 Ajudar {partnerHelping.helped} · ver código
              </button>
            )}
            {!focusMode && <button data-tour="loja" onClick={()=>setShowNyxShop(true)} style={{ ...styles.btn("#c084fc"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }}>
              🎁 Loja do Nyx · {nyxPoints - nyxSpent} pts
            </button>}
            {studyLang?.preview && (
              <button onClick={()=>setShowPreview(true)} style={{ ...styles.btn("#34d399"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Veja o resultado do seu código rodando de verdade">
                👁️ Prévia ao vivo
              </button>
            )}
            {isLangRoom && studyLang && (
              <button onClick={()=>setShowSwitchConfirm(true)} style={{ ...styles.btn("#3b2a58"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Guarda o código e os resumos de agora no histórico e começa outra linguagem do zero">
                🔁 Trocar linguagem
              </button>
            )}
            <button data-tour="teclado" onClick={()=>setShowKeyboard(true)} style={{ ...styles.btn("#22d3ee"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Aprenda onde fica cada tecla, no seu ritmo — pode treinar quando quiser">
              ⌨️ Tutorial de Teclado
            </button>
            <button data-tour="hall" onClick={()=>{ setShowHallOfFame(true); getHallOfFame().then(setHallEntries); }} style={{ ...styles.btn("#fbbf24"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Veja quem se destacou nas cidades por onde a carreta já passou">
              🏆 Hall da Fama
            </button>
            {pendingAbsences.length>0 && (
              <button onClick={()=>setShowJustify(true)} style={{ ...styles.btn("#f87171"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Justifique uma falta pro professor avaliar">
                😔 Justificar falta ({pendingAbsences.length})
              </button>
            )}
          </div>
          <div data-tour="turma" className="cardfx" style={styles.card}>
            <p style={{ color:"#fbbf24", fontWeight:700, marginBottom:8, fontSize:13 }}>🏆 Turma & Você</p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {!focusMode && <button onClick={()=>setShowRanking(true)} style={{ ...styles.btn("#22d3ee"), fontSize:12, padding:"7px 0" }}>📊 Ranking da turma</button>}
              <button onClick={()=>setShowAchievements(true)} style={{ ...styles.btn("#a855f7"), fontSize:12, padding:"7px 0" }}>🎖️ Conquistas · {achievements.filter(id=>visibleAchievements(isLangRoom).some(a=>a.id===id)).length}/{visibleAchievements(isLangRoom).length}</button>
              <button onClick={()=>setShowNotebook(true)} style={{ ...styles.btn("#34d399"), fontSize:12, padding:"7px 0" }}>📒 Caderno de resumos</button>
              <button onClick={()=>setShowTrail(true)} style={{ ...styles.btn("#fbbf24"), fontSize:12, padding:"7px 0" }}>🗺️ Trilha de aprendizado</button>
              <button onClick={()=>setShowNextSteps(true)} style={{ ...styles.btn("#34d399"), fontSize:12, padding:"7px 0" }}>🚀 Próximos passos</button>
              <button onClick={()=>setShowPerformance(true)} style={{ ...styles.btn("#06b6d4"), fontSize:12, padding:"7px 0" }}>📊 Meu Desempenho</button>
              {!focusMode && <button onClick={()=>{ if (!nyxLocks.zeker) setShowDuel(true); }} disabled={nyxLocks.zeker} title={nyxLocks.zeker ? "O professor bloqueou os duelos por enquanto" : ""}
                style={{ ...styles.btn("#f87171"), fontSize:12, padding:"7px 0", opacity:nyxLocks.zeker?0.45:1, cursor:nyxLocks.zeker?"not-allowed":"pointer" }}>
                {nyxLocks.zeker ? "🔒 Duelos bloqueados" : "⚔️ Duelo entre alunos"}
              </button>}
              {!focusMode && <button onClick={()=>{ if (!nyxLocks.zeker) setShowTeamDuel(true); }} disabled={nyxLocks.zeker} title={nyxLocks.zeker ? "O professor bloqueou os duelos por enquanto" : "Chame 1 parceiro pra jogar em dupla contra outros 2 colegas"}
                style={{ ...styles.btn("#fb7185"), fontSize:12, padding:"7px 0", opacity:nyxLocks.zeker?0.45:1, cursor:nyxLocks.zeker?"not-allowed":"pointer" }}>
                {nyxLocks.zeker ? "🔒 Duelos bloqueados" : "🤝⚔️ Duelo em Dupla (2x2)"}
              </button>}
              {!focusMode && <button onClick={()=>setShowRace(true)} title="Digite um trecho de código contra o relógio — pontos 1x por dia e pódio da turma"
                style={{ ...styles.btn("#fb923c"), fontSize:12, padding:"7px 0" }}>🏁 Corrida de digitação{typingBest ? ` · ${(typingBest.ms/1000).toFixed(1)}s` : ""}</button>}
              {!focusMode && <button onClick={()=>setShowKnowledgeTest(true)} title="Teste seu conhecimento da matéria, sem dicas — pode fazer quando quiser, sem precisar finalizar a aula"
                style={{ ...styles.btn("#6366f1"), fontSize:12, padding:"7px 0" }}>🧠 Testar Conhecimento</button>}
              {!focusMode && <button onClick={()=>setShowFreeBuild(true)} title="Proponha algo que você quer construir e o Nyx te ajuda a planejar como chegar lá"
                style={{ ...styles.btn("#34d399"), fontSize:12, padding:"7px 0" }}>🏗️ Desafio Livre da Semana{weeklyChallenge && weeklyChallenge.weekKey===weekKey() && weeklyChallenge.status==="done" ? " ✅" : ""}</button>}
            </div>
            <div style={{ borderTop:"1px solid #3b2a58", marginTop:10, paddingTop:10 }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                <input type="checkbox" checked={portfolioPublic} onChange={togglePortfolioPublic} style={{ width:16, height:16, accentColor:"#c084fc", cursor:"pointer" }} />
                <span style={{ color:"#a99ac9", fontSize:12 }}>🌟 Criar link público do meu progresso (pra mandar pra família)</span>
              </label>
              {portfolioPublic && (
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8, flexWrap:"wrap" }}>
                  <button onClick={copyPortfolioLink} style={{ ...styles.btn("#c084fc"), fontSize:11.5, padding:"6px 12px", width:"auto" }}>📋 Copiar link</button>
                  {portfolioCopyMsg && <span style={{ color:"#34d399", fontSize:11.5 }}>{portfolioCopyMsg}</span>}
                </div>
              )}
            </div>
            <div style={{ borderTop:"1px solid #3b2a58", marginTop:10, paddingTop:10 }}>
              <button onClick={()=>setShowSelfSupport(v=>!v)} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:12, cursor:"pointer", padding:0, textAlign:"left" }}>
                🧩 Preciso de um ajuste hoje? {showSelfSupport ? "▴" : "▾"}
              </button>
              {showSelfSupport && (
                <div style={{ marginTop:8 }}>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {[
                      ["sensorial", "🧘 Sensorial", "Desliga sons, confete e animações de festa — pra quando os estímulos estão demais."],
                      ["foco", "🎯 Foco", "Some com ranking, loja, duelos e curiosidade — sobra só o essencial pra você se concentrar."],
                      ["leitura", "📖 Leitura", "Deixa as letras e linhas mais espaçadas na sua tela."],
                      ["ritmo", "🐢 Ritmo próprio", "A atividade do dia fica com 4 questões em vez de 8."],
                      ["motora", "🖐️ Motora", "Te sugere o tutorial de teclado, pra ajudar a digitar."],
                      ["visual", "👁️ Visual", "Alto contraste + letras maiores na sua tela."],
                    ].map(([flag, label, hint]) => (
                      <button key={flag} onClick={()=>toggleSelfSupport(flag)} title={hint}
                        style={{ background: selfSupport[flag] ? "#3b82f6" : "#171026", color: selfSupport[flag] ? "#fff" : "#a99ac9", border:`1px solid ${selfSupport[flag] ? "#3b82f6" : "#3b2a58"}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", fontWeight:800, fontSize:11.5 }}>
                        {selfSupport[flag] ? "✓ " : ""}{label}
                      </button>
                    ))}
                  </div>
                  <p style={{ color:"#776798", fontSize:11, margin:"6px 0 0" }}>Só você decide — liga e desliga quando quiser, sem precisar pedir pro professor.</p>
                </div>
              )}
            </div>
            {!focusMode && <ClassGoalBar sum={classPointsSum} />}
          </div>
          <div className="cardfx" style={{ ...styles.card, fontSize:12, color:"#776798", lineHeight:1.8 }}>
            <p style={{ color:"#c084fc", fontWeight:600, marginBottom:6 }}>⌨️ Atalhos do editor</p>
            <div><code style={{color:"#FFD700"}}>{"{"}</code> → abre e fecha sozinho</div>
            <div><code style={{color:"#DA70D6"}}>(</code> → abre e fecha sozinho</div>
            <div><code style={{color:"#ce9178"}}>"</code> → abre e fecha sozinho</div>
            <div><code style={{color:"#d4d4d4"}}>Tab</code> → empurra o texto para a direita</div>
            <div><code style={{color:"#d4d4d4"}}>Enter</code> → começa uma linha nova já no lugar certo</div>
          </div>
        </div>
      </div>

      {/* 🎁 retrospectiva do mês: liberada pelo professor, os números vêm do próprio perfil */}
      {showRetro && (() => {
        const totalLines = (files || []).reduce((n, f) => n + (f.code ? f.code.split("\n").filter(l => l.trim()).length : 0), 0);
        const presencas = Object.values(attendanceRef.current || {}).filter(v => v === "present").length;
        const best = Object.entries(scoreHistory || {}).reduce((b, [d, v]) => (v != null && (b == null || v > b.v)) ? { d, v } : b, null);
        const eggs = ALL_EGG_ACHIEVEMENT_IDS.filter(id => (achievements || []).includes(id)).length;
        const stats = { totalLines, presencas, best, conquistas: (achievements || []).length, eggs, pontos: (nyxPoints || 0) + (nyxSpent || 0), duelWins: duelWins || 0 };
        return <RetroOverlay name={studentName} stats={stats} gear={nyxGear} onClose={closeRetro} />;
      })()}

      {/* 🏟️ quiz do torneio: abre quando o professor inicia o torneio no telão e eu tenho partida */}
      {tourneyQuiz && (() => {
        const finished = tourneyStep >= tourneyQuiz.questions.length;
        const q = tourneyQuiz.questions[tourneyStep];
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.88)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1060, padding:16 }}>
            <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #22d3ee66", borderRadius:22, padding:"24px 24px", maxWidth:480, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55), 0 0 50px #22d3ee22" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <span style={{ fontSize:30 }}>🏟️</span>
                <div style={{ flex:1 }}>
                  <h2 style={{ margin:0, fontSize:19, fontWeight:900, background:"linear-gradient(135deg,#22d3ee,#c084fc)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>Torneio da Turma — Rodada {tourneyQuiz.round}</h2>
                  <div style={{ color:"#a99ac9", fontSize:12 }}>{finished ? "quiz concluído!" : `você × ${tourneyQuiz.opponent} · pergunta ${tourneyStep+1} de ${tourneyQuiz.questions.length}`}</div>
                </div>
              </div>
              {!finished && (
                <>
                  <p style={{ color:"#f0e9fb", fontSize:15, fontWeight:700, lineHeight:1.6, margin:"6px 0 12px" }}>{q.pergunta}</p>
                  <div style={{ display:"grid", gap:8 }}>
                    {q.alternativas.map((alt, i) => {
                      const picked = tourneyPicked != null;
                      const isRight = i === q.correta;
                      const isMine = tourneyPicked === i;
                      return (
                        <button key={i} disabled={picked} onClick={() => { setTourneyPicked(i); if (i === q.correta) setTourneyCorrect(c => c + 1); }}
                          style={{ textAlign:"left", background: picked ? (isRight ? "#34d39922" : isMine ? "#f8717122" : "#171026") : "#171026",
                            border: `2px solid ${picked ? (isRight ? "#34d399" : isMine ? "#f87171" : "#241f38") : "#3b2a58"}`,
                            borderRadius:12, padding:"11px 14px", color:"#f0e9fb", fontSize:13.5, cursor: picked ? "default" : "pointer" }}>
                          {picked && isRight ? "✅ " : picked && isMine ? "❌ " : ""}{alt}
                        </button>
                      );
                    })}
                  </div>
                  {tourneyPicked != null && (
                    <button onClick={() => { setTourneyStep(s => s + 1); setTourneyPicked(null); }} style={{ ...styles.btn("#22d3ee"), width:"100%", padding:"11px 0", fontSize:14, marginTop:12 }}>
                      {tourneyStep + 1 >= tourneyQuiz.questions.length ? "Finalizar →" : "Próxima →"}
                    </button>
                  )}
                </>
              )}
              {finished && (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:46, lineHeight:1 }}>{tourneyCorrect >= 4 ? "🔥" : tourneyCorrect >= 2 ? "💪" : "🍀"}</div>
                  <p style={{ color:"#f0e9fb", fontSize:16, fontWeight:800, margin:"10px 0 4px" }}>{tourneyCorrect} de {tourneyQuiz.questions.length} certas!</p>
                  <p style={{ color:"#a99ac9", fontSize:13, lineHeight:1.6, margin:"0 0 12px" }}>Agora é torcer: o placar da sua partida aparece no telão. Boa sorte! 🤞</p>
                  <button onClick={submitTourneyQuiz} style={{ ...styles.btn("#22d3ee"), width:"100%", padding:"12px 0", fontSize:14.5 }}>Enviar respostas 🏟️</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 🔥 aquecimento do dia: 3 perguntinhas sobre a aula anterior, com pontos por acerto */}
      {warmupOpen && warmup && (() => {
        const finished = warmupStep >= warmup.questions.length;
        const q = warmup.questions[warmupStep];
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1050, padding:16 }}>
            <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #fb923c66", borderRadius:22, padding:"24px 24px", maxWidth:480, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55), 0 0 50px #fb923c22" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <span style={{ fontSize:30, animation:"nyx-float 3s ease-in-out infinite" }}>🔥</span>
                <div style={{ flex:1 }}>
                  <h2 style={{ margin:0, fontSize:19, fontWeight:900, background:"linear-gradient(135deg,#fb923c,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>Aquecimento do dia</h2>
                  <div style={{ color:"#a99ac9", fontSize:12 }}>{finished ? "revisão concluída!" : `relembrando a última aula · ${warmupStep+1} de ${warmup.questions.length}`}</div>
                </div>
                {!finished && <button onClick={skipWarmup} title="Pular o aquecimento de hoje" style={{ background:"transparent", border:"1px solid #56407e", borderRadius:8, color:"#a99ac9", fontSize:12, padding:"4px 10px", cursor:"pointer", flexShrink:0 }}>Agora não</button>}
              </div>
              {!finished && (
                <>
                  <p style={{ color:"#f0e9fb", fontSize:15, fontWeight:700, lineHeight:1.6, margin:"6px 0 12px" }}>{q.pergunta}</p>
                  <div style={{ display:"grid", gap:8 }}>
                    {q.alternativas.map((alt, i) => {
                      const picked = warmupPicked != null;
                      const isRight = i === q.correta;
                      const isMine = warmupPicked === i;
                      return (
                        <button key={i} disabled={picked} onClick={() => { setWarmupPicked(i); if (i === q.correta) setWarmupCorrect(c => c + 1); }}
                          style={{ textAlign:"left", background: picked ? (isRight ? "#34d39922" : isMine ? "#f8717122" : "#171026") : "#171026",
                            border: `2px solid ${picked ? (isRight ? "#34d399" : isMine ? "#f87171" : "#241f38") : "#3b2a58"}`,
                            borderRadius:12, padding:"11px 14px", color:"#f0e9fb", fontSize:13.5, cursor: picked ? "default" : "pointer" }}>
                          {picked && isRight ? "✅ " : picked && isMine ? "❌ " : ""}{alt}
                        </button>
                      );
                    })}
                  </div>
                  {warmupPicked != null && (
                    <div className="pop" style={{ marginTop:12 }}>
                      {q.explicacao && <p style={{ color:"#a99ac9", fontSize:13, lineHeight:1.6, margin:"0 0 10px" }}>💡 {q.explicacao}</p>}
                      <button onClick={() => { setWarmupStep(s => s + 1); setWarmupPicked(null); }} style={{ ...styles.btn("#fb923c"), width:"100%", padding:"11px 0", fontSize:14 }}>
                        {warmupStep + 1 >= warmup.questions.length ? "Ver resultado →" : "Próxima →"}
                      </button>
                    </div>
                  )}
                </>
              )}
              {finished && (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:46, lineHeight:1 }}>{warmupCorrect === warmup.questions.length ? "🏆" : warmupCorrect > 0 ? "💪" : "🌱"}</div>
                  <p style={{ color:"#f0e9fb", fontSize:16, fontWeight:800, margin:"10px 0 4px" }}>
                    {warmupCorrect} de {warmup.questions.length} na revisão!
                  </p>
                  <p style={{ color:"#a99ac9", fontSize:13, lineHeight:1.6, margin:"0 0 6px" }}>
                    {warmupCorrect === warmup.questions.length ? "Memória de elefante! O conteúdo de ontem está fresquinho." : warmupCorrect > 0 ? "Boa! Revisar assim é o que faz o conteúdo ficar de vez na cabeça." : "Tudo bem! Relembrar é exatamente pra isso — agora ficou mais fresco."}
                  </p>
                  {warmupCorrect > 0 && <p style={{ color:"#fbbf24", fontSize:14, fontWeight:900, margin:"0 0 12px" }}>+{warmupCorrect} ponto{warmupCorrect>1?"s":""} do Nyx! 💰</p>}
                  <button onClick={finishWarmup} style={{ ...styles.btn("#fb923c"), width:"100%", padding:"12px 0", fontSize:14.5 }}>Bora programar! 🚀</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {tourStep >= 0 && tourStep < TOUR_STEPS.length && (
        <TourOverlay step={tourStep} onNext={()=>setTourStep(s => (s+1 >= TOUR_STEPS.length ? -1 : s+1))} />
      )}

      <ErrorHighlightRing active={showErrorWalkthrough && codeErrors.length > 0} />

      {showNyxShop && (
        <NyxShop
          wallet={nyxPoints - nyxSpent}
          owned={nyxOwned}
          gear={nyxGear}
          onEquip={handleEquipGear}
          onBuy={handleBuyItem}
          isTestShift={shift === TEST_SHIFT.id}
          onClose={()=>setShowNyxShop(false)}
        />
      )}

      {showAvatarEdit && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:680, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#c084fc,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🎨 Editar meu boneco</h2>
              <button onClick={()=>{ setShowAvatarEdit(false); persist({}); }} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
            </div>
            <AvatarBuilder value={avatar} onChange={setAvatar} />
            <button onClick={()=>{ setShowAvatarEdit(false); persist({}); }} style={{ ...styles.btn("#c084fc"), width:"100%", marginTop:16 }}>💾 Salvar e fechar</button>
          </div>
        </div>
      )}

      {showAchievements && <AchievementsModal unlocked={achievements} onClose={()=>setShowAchievements(false)} isLangRoom={isLangRoom} />}
      {showRanking && <RankingModal shift={shift} myName={studentName} onClose={()=>setShowRanking(false)} />}
      {/* 🎉 quiz: modal de entrar com o código */}
      {showQuizJoin && quizRoomInfo && (!quizJoin || quizJoin.code !== quizRoomInfo.code) && (
        <div style={{ position:"fixed", inset:0, background:"#000000bb", zIndex:1200, display:"flex", alignItems:"center", justifyContent:"center", padding:14 }} onClick={()=>setShowQuizJoin(false)}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"2px solid #c084fc", borderRadius:20, padding:"24px 22px", maxWidth:380, width:"100%", textAlign:"center" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:40 }}>🎉</div>
            <h3 style={{ color:"#c084fc", margin:"6px 0 4px" }}>Entrar no Quiz</h3>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Digite o código que está na tela do professor:</p>
            <input autoFocus value={quizCodeInput} inputMode="numeric" maxLength={6}
              onChange={e=>{ setQuizCodeInput(e.target.value.replace(/\D/g,"")); setQuizCodeError(""); }}
              onKeyDown={e=>e.key==="Enter"&&joinQuiz()} placeholder="000000"
              style={{ width:"100%", background:"#171026", border:"2px solid #3b2a58", borderRadius:12, padding:"12px 14px", color:"#f0e9fb", fontSize:26, fontWeight:900, letterSpacing:8, textAlign:"center", outline:"none", boxSizing:"border-box" }} />
            {quizCodeError && <p style={{ color:"#f87171", fontSize:12.5, margin:"8px 0 0" }}>{quizCodeError}</p>}
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button onClick={()=>setShowQuizJoin(false)} style={{ ...styles.btn("#3b2a58"), flex:1, padding:"11px 0", fontSize:13.5 }}>Cancelar</button>
              <button onClick={joinQuiz} disabled={quizCodeInput.length<6} style={{ ...styles.btn("#c084fc"), flex:1, padding:"11px 0", fontSize:13.5, opacity:quizCodeInput.length<6?0.5:1 }}>Entrar →</button>
            </div>
          </div>
        </div>
      )}
      {/* 🎉 quiz: tela do jogador (cobre tudo enquanto o quiz rola, estilo Kahoot) */}
      {quizRoomInfo && quizJoin && quizJoin.code === quizRoomInfo.code && (() => {
        const room = quizRoomInfo;
        const durationMs = quizSecsOf(room) * 1000;
        const myTotal = (room.questions || []).reduce((sum, q, i) => {
          const ans = quizAnswers[i]; const st = (room.startedAts||{})[i];
          if (!ans || st == null) return sum;
          const el = ans.at - st;
          if (el < 0 || el > durationMs) return sum;
          return sum + quizPoints(ans.opt === q.correct, el, durationMs, q.hard);
        }, 0);
        let body;
        if (room.status === "lobby") {
          body = (
            <div style={{ textAlign:"center" }}>
              <div style={{ animation:"nyx-float 2.5s ease-in-out infinite" }}><NyxRobot state="ok" size={90} showName={false} /></div>
              <h3 style={{ color:"#34d399", fontSize:22, margin:"10px 0 4px" }}>Você tá dentro! 🎉</h3>
              <p style={{ color:"#a99ac9", fontSize:14 }}>Sala <b style={{ color:"#c084fc", letterSpacing:3 }}>{room.code}</b> · {room.themeTitle}</p>
              <p style={{ color:"#776798", fontSize:13, marginTop:14 }}>Esperando o professor começar<span className="shine">...</span></p>
            </div>
          );
        } else if (room.status === "question" || room.status === "reveal") {
          const q = room.questions[room.qIndex];
          const startedAt = (room.startedAts||{})[room.qIndex];
          const myAns = quizAnswers[room.qIndex];
          const remaining = Math.max(0, Math.ceil((startedAt + durationMs - clockNow)/1000));
          const timedOut = room.status === "question" && remaining <= 0;
          const chip = (c) => ({ background:c+"22", color:c, padding:"2px 10px", borderRadius:12, fontSize:11.5, fontWeight:700 });
          body = (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, flexWrap:"wrap", gap:6 }}>
                <span style={chip("#c084fc")}>Pergunta {room.qIndex+1}/{room.questions.length}</span>
                {q.hard && <span style={chip("#fbbf24")}>⭐ Vale em dobro</span>}
                {room.status==="question" && <span style={{ fontSize:22, fontWeight:900, color: remaining<=5?"#f87171":"#34d399", fontVariantNumeric:"tabular-nums" }}>⏱ {remaining}s</span>}
              </div>
              {room.status==="question" && (
                <div className="bar-glow" style={{ height:10, background:"#171026", border:"1px solid #3b2a58", borderRadius:20, overflow:"hidden", marginBottom:12 }}>
                  <div style={{ height:"100%", width:`${Math.max(0, Math.min(100, (remaining/quizSecsOf(room))*100))}%`, background: remaining<=5?"#f87171":"#34d399", transition:"width 1s linear" }} />
                </div>
              )}
              <h3 style={{ color:"#f0e9fb", fontSize:"clamp(16px, 4vw, 21px)", lineHeight:1.45, margin:"0 0 14px" }}>{q.q}</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {q.opts.map((opt,i) => {
                  const picked = myAns && myAns.opt === i;
                  const isCorrect = i === q.correct;
                  const showResult = room.status === "reveal";
                  const dim = (showResult && !isCorrect) || (myAns && !picked) || timedOut;
                  return (
                    <button key={i} onClick={()=>answerQuiz(i)} disabled={!!myAns || room.status!=="question" || timedOut}
                      style={{ background:QUIZ_COLORS[i].bg, opacity:dim?0.35:1, borderRadius:12, padding:"18px 12px", color:"#fff", fontWeight:800, fontSize:15, display:"flex", alignItems:"center", gap:10, border: picked || (showResult && isCorrect) ? "3px solid #fff" : "3px solid transparent", cursor: (!!myAns || room.status!=="question" || timedOut) ? "default" : "pointer", textAlign:"left" }}>
                      <span style={{ fontSize:19 }}>{QUIZ_COLORS[i].shape}</span>
                      <span style={{ flex:1 }}>{opt}</span>
                      {showResult && isCorrect && <span>✅</span>}
                      {picked && !showResult && <span>👆</span>}
                    </button>
                  );
                })}
              </div>
              {room.status==="question" && myAns && <p style={{ color:"#34d399", fontWeight:800, textAlign:"center", marginTop:14 }}>✔ Resposta enviada! Aguarde...</p>}
              {room.status==="question" && !myAns && timedOut && <p style={{ color:"#f87171", fontWeight:800, textAlign:"center", marginTop:14 }}>⏰ Tempo esgotado!</p>}
              {room.status==="reveal" && (() => {
                if (!myAns) return <p style={{ color:"#f87171", fontWeight:800, textAlign:"center", marginTop:14 }}>⏰ Você não respondeu essa.</p>;
                const el = myAns.at - startedAt;
                const pts = (el >= 0 && el <= durationMs) ? quizPoints(myAns.opt === q.correct, el, durationMs, q.hard) : 0;
                return myAns.opt === q.correct
                  ? <p style={{ color:"#34d399", fontWeight:900, fontSize:18, textAlign:"center", marginTop:14 }} className="pop">✅ Acertou! +{pts} pontos</p>
                  : <p style={{ color:"#f87171", fontWeight:800, textAlign:"center", marginTop:14 }}>❌ Não foi dessa vez — a certa era "{q.opts[q.correct]}"</p>;
              })()}
              <p style={{ color:"#a99ac9", fontSize:13, textAlign:"center", marginTop:10 }}>Seus pontos: <b style={{ color:"#fbbf24" }}>{myTotal}</b></p>
            </div>
          );
        } else {
          body = (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:52 }}>🏁</div>
              <h3 style={{ color:"#fbbf24", fontSize:22, margin:"8px 0 4px" }}>Quiz encerrado!</h3>
              <p style={{ color:"#f0e9fb", fontSize:16 }}>Você fez <b style={{ color:"#fbbf24" }}>{myTotal} pontos</b></p>
              <p style={{ color:"#a99ac9", fontSize:13, marginTop:8 }}>Olha no telão do professor pra ver o pódio! 🏆</p>
              <button onClick={leaveQuiz} style={{ ...styles.btn("#c084fc"), marginTop:16, padding:"11px 28px", fontSize:14 }}>Sair do quiz</button>
            </div>
          );
        }
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.94)", zIndex:1150, display:"flex", alignItems:"center", justifyContent:"center", padding:14, overflowY:"auto" }}>
            <div style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:20, padding:"22px 20px", maxWidth:560, width:"100%", boxShadow:"0 24px 70px rgba(0,0,0,.6)", position:"relative" }}>
              <button onClick={leaveQuiz} title="Sair do quiz" style={{ position:"absolute", top:10, right:12, background:"transparent", border:"none", color:"#776798", fontSize:18, cursor:"pointer" }}>✕</button>
              {body}
            </div>
          </div>
        );
      })()}
      {showPreview && studyLang?.preview && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:14 }} onClick={()=>setShowPreview(false)}>
          <div className="cardfx" style={{ ...styles.card, width:"min(900px, 96vw)", maxHeight:"92vh", display:"flex", flexDirection:"column" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <h3 style={{ color:"#34d399", margin:0 }}>👁️ Prévia ao vivo</h3>
              <button onClick={()=>setShowPreview(false)} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
            <p style={{ color:"#776798", fontSize:12, marginBottom:8 }}>Atualiza sozinha alguns instantes depois de você parar de digitar.</p>
            <iframe title="Prévia ao vivo" srcDoc={previewDoc} sandbox="allow-scripts" style={{ width:"100%", height:"65vh", border:"1px solid #3b2a58", borderRadius:10, background:"#fff" }} />
          </div>
        </div>
      )}
      {showSwitchConfirm && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:14 }} onClick={()=>setShowSwitchConfirm(false)}>
          <div className="cardfx" style={{ ...styles.card, width:"min(420px, 96vw)" }} onClick={e=>e.stopPropagation()}>
            <h3 style={{ color:"#fbbf24", marginBottom:10 }}>🔁 Trocar de linguagem?</h3>
            <p style={{ color:"#d6c9ec", fontSize:13.5, lineHeight:1.6, marginBottom:16 }}>
              Seu código e resumos de <b>{studyLang?.label}</b> vão pro histórico, guardados — você não perde nada.
              Depois você escolhe outra linguagem e começa do zero nela.
            </p>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setShowSwitchConfirm(false)} style={{ ...styles.btn("#3b2a58"), flex:1, padding:"9px 0", fontSize:13 }}>Cancelar</button>
              <button onClick={switchLanguage} style={{ ...styles.btn("#fbbf24"), flex:1, padding:"9px 0", fontSize:13 }}>Sim, trocar</button>
            </div>
          </div>
        </div>
      )}
      {showPartnerHelp && partnerHelping && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:14 }} onClick={()=>setShowPartnerHelp(false)}>
          <div className="cardfx" style={{ ...styles.card, width:"min(720px, 96vw)", maxHeight:"90vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <h3 style={{ color:"#22d3ee", margin:0 }}>🤝 Ajudando {partnerHelping.helped}</h3>
              <button onClick={()=>setShowPartnerHelp(false)} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
            <p style={{ color:"#776798", fontSize:12.5, marginBottom:10 }}>Só leitura — você não pode editar o código dele(a), só ver e ajudar por perto. Quando o problema estiver resolvido, marque abaixo e os dois ganham +{PARTNER_REWARD} pontos.</p>
            {!partnerPeerCode ? (
              <p style={{ color:"#776798", fontSize:13 }}>Carregando código...</p>
            ) : (
              <>
                {partnerPeerCode.files.length > 1 && (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                    {partnerPeerCode.files.map((f,i) => (
                      <button key={f.name} onClick={()=>setPartnerViewActive(i)} style={{ ...styles.btn(partnerViewActive===i?"#22d3ee":"#3b2a58"), padding:"4px 10px", fontSize:11.5 }}>{f.name}</button>
                    ))}
                  </div>
                )}
                <VSEditor
                  value={partnerPeerCode.files[partnerViewActive]?.code ?? partnerPeerCode.files[0]?.code ?? ""}
                  onChange={()=>{}}
                  filename={partnerPeerCode.files[partnerViewActive]?.name ?? partnerPeerCode.files[0]?.name}
                  locked={true}
                />
              </>
            )}
            <button onClick={resolvePartner} style={{ ...styles.btn("#34d399"), width:"100%", marginTop:14, padding:"9px 0", fontSize:13.5, fontWeight:800 }}>✅ Marcar como resolvido (+{PARTNER_REWARD} pts pros dois)</button>
          </div>
        </div>
      )}
      {showNotebook && <NotebookModal history={summaryHistory} detailedHistory={detailedSummaryHistory} onClose={()=>setShowNotebook(false)} />}
      {showTrail && <LearningTrailModal history={summaryHistory} onClose={()=>setShowTrail(false)} />}
      {showNextSteps && <NextStepsModal onClose={()=>setShowNextSteps(false)} />}
      {showVoicePicker && <VoicePickerModal onClose={()=>setShowVoicePicker(false)} />}
      {showRace && <TypingRaceModal onClose={()=>setShowRace(false)} onFinish={finishTypingRace} />}
      {showKnowledgeTest && (
        <KnowledgeTestModal
          onAward={async (pts) => { const s=stateRef.current; const np=(s.nyxPoints||0)+pts; stateRef.current={...s,nyxPoints:np}; setNyxPoints(np); await persist({ nyxPoints: np }); checkPointsAchievements(np); unlockAchievement("autodidata"); }}
          onFirstToday={() => {
            const today = todayKey();
            const first = stateRef.current.knowledgeTestRewardDay !== today;
            if (first) { stateRef.current = { ...stateRef.current, knowledgeTestRewardDay: today }; setKnowledgeTestRewardDay(today); persist({ knowledgeTestRewardDay: today }); }
            return first;
          }}
          onClose={()=>setShowKnowledgeTest(false)}
        />
      )}
      {showKeyboard && (
        <Suspense fallback={
          <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1200 }}>
            <span style={{ color:"#a99ac9", fontSize:14 }}>🤔 Carregando o tutorial de teclado...</span>
          </div>
        }>
          <KeyboardTutorialModal onClose={()=>setShowKeyboard(false)} onFinish={finishKeyboardTutorial} speak={speak} stopSpeech={stopSpeech} accessMode={accessMode} onEggFound={triggerEgg} playSound={playSound} />
        </Suspense>
      )}
      {!checkinDismissed && phase==="coding" && !showJustify && !showNyxPrefs && !showIntro && tourStep < 0 && (
        <CheckinModal shift={shift} studentName={studentName} onDone={dismissCheckin} />
      )}
      {showJustify && <JustifyModal absences={pendingAbsences} onSubmit={submitJustification} onClose={()=>setShowJustify(false)} />}
      {showHallOfFame && <HallOfFameModal entries={hallEntries} onClose={()=>setShowHallOfFame(false)} />}
      {showPerformance && <PerformanceModal studentName={studentName} scoreHistory={scoreHistory} achievements={achievements} duelWins={duelWins} typingBest={typingBest} streakCount={streakCount} onClose={()=>setShowPerformance(false)} />}
      {showDuel && (
        <DuelModal
          shift={shift}
          myName={studentName}
          myAvatar={avatar}
          onAward={async (pts) => { const s=stateRef.current; const np=(s.nyxPoints||0)+pts; stateRef.current={...s,nyxPoints:np}; setNyxPoints(np); await persist({ nyxPoints: np }); checkPointsAchievements(np); }}
          onWin={async () => {
            const nw = (stateRef.current.duelWins||0) + 1;
            stateRef.current = { ...stateRef.current, duelWins: nw };
            setDuelWins(nw);
            await persist({ duelWins: nw });
            unlockAchievement("duelista");
            if (nw >= 3) unlockAchievement("duelista-3");
          }}
          onClose={()=>setShowDuel(false)}
        />
      )}
      {showTeamDuel && (
        <TeamDuelModal
          shift={shift}
          myName={studentName}
          myAvatar={avatar}
          onAward={async (pts) => { const s=stateRef.current; const np=(s.nyxPoints||0)+pts; stateRef.current={...s,nyxPoints:np}; setNyxPoints(np); await persist({ nyxPoints: np }); checkPointsAchievements(np); }}
          onWin={async () => {
            const nw = (stateRef.current.duelWins||0) + 1;
            stateRef.current = { ...stateRef.current, duelWins: nw };
            setDuelWins(nw);
            await persist({ duelWins: nw });
            unlockAchievement("duelista");
            if (nw >= 3) unlockAchievement("duelista-3");
            unlockAchievement("dupla-imbativel");
          }}
          onClose={()=>setShowTeamDuel(false)}
        />
      )}
      {showFreeBuild && (
        <FreeBuildModal
          weeklyChallenge={weeklyChallenge}
          language={studyLang}
          onSave={saveWeeklyChallenge}
          onToggleStep={toggleChallengeStep}
          onFinish={finishWeeklyChallenge}
          onClose={()=>setShowFreeBuild(false)}
        />
      )}

      <NyxChat
        who="student"
        dataTour="chat"
        gear={nyxGear}
        accessMode={accessMode}
        nyxPrefs={nyxPrefs}
        language={studyLang}
        speak={ttsSupported ? speak : null}
        onTheme={handleNyxTheme}
        context={() => `Contexto: você conversa com o aluno ${studentName}. Código atual dele (${files[active]?.name || "Program.cs"}):\n${activeCode || "(vazio ainda)"}\n${robotMsg ? `Seu último aviso sobre o código: ${robotMsg}` : ""}`}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CODE LAB  (editor + terminal + robô, reutilizável — usado pelo professor)
// ════════════════════════════════════════════════════════════════════════════
function CodeLab({ accent = "#fbbf24", files = [{ name:"Program.cs", code:"" }], onChange = ()=>{}, terminalMaxHeight, gear = DEFAULT_NYX_GEAR, onEquip = ()=>{} }) {
  const setFiles = (updater) => onChange(typeof updater === "function" ? updater(files) : updater);
  const [active, setActive] = useState(0);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [robotState, setRobotState] = useState("idle");
  const [robotMsg, setRobotMsg] = useState("");
  const [keysToShow, setKeysToShow] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const activeCode = files[active]?.code || "";

  const updateActiveCode = (newCode) => setFiles(fs => fs.map((f,i)=> i===active ? { ...f, code:newCode } : f));
  const uniqueName = (base, ignoreIdx=-1) => { let name=base, n=2; while (files.some((f,i)=> i!==ignoreIdx && f.name.toLowerCase()===name.toLowerCase())) { name = base.replace(/\.cs$/i,"")+n+".cs"; n++; } return name; };
  const addFile = () => { const name=uniqueName(`Arquivo${files.length+1}.cs`); const idx=files.length; setFiles(fs=>[...fs,{name,code:""}]); setActive(idx); setRenaming(idx); setRenameValue(name.replace(/\.cs$/i,"")); };
  const deleteFile = (idx) => { if (files.length<=1) return; setFiles(fs=>fs.filter((_,i)=>i!==idx)); setActive(a=>(idx<=a?Math.max(0,a-1):a)); };
  const openRename = (idx) => { setRenaming(idx); setRenameValue((files[idx]?.name||"").replace(/\.cs$/i,"")); };
  const confirmRename = () => { if(renaming==null) return; let base=String(renameValue).trim().replace(/["'\/\\]/g,""); if(!base) base=`Arquivo${renaming+1}`; let name=/\.cs$/i.test(base)?base:base+".cs"; name=uniqueName(name,renaming); const idx=renaming; setFiles(fs=>fs.map((f,i)=>i===idx?{...f,name}:f)); setRenaming(null); setRenameValue(""); };
  const cancelRename = () => { setRenaming(null); setRenameValue(""); };

  // robô: só analisa quando clicar no botão
  useEffect(() => {
    const trimmed = activeCode.trim();
    if (trimmed.length < 12) { setRobotState("idle"); setRobotMsg(""); setKeysToShow([]); }
  }, [activeCode]);

  const analyzeCode = async () => {
    const trimmed = activeCode.trim();
    if (trimmed.length < 12 || analyzing) return;
    setRobotState("thinking"); setAnalyzing(true);
    const quick = quickCheck(activeCode);
    if (quick) { setRobotState("error"); setRobotMsg(quick.message); setKeysToShow(quick.missing||[]); setAnalyzing(false); return; }
    try {
      const parsed = await askClaudeJson(
        `Revise este código C# como um compilador faria, linha por linha. Top-level statements e ausência de using System são válidos. Confira pares de chaves/parênteses/aspas no arquivo inteiro antes de acusar falta, e todas as linhas anteriores antes de acusar variável não declarada. Não invente erro em código correto.\n\n${otherFilesCtx(files, active)}Arquivo em edição (${files[active]?.name || "Program.cs"}):\n\`\`\`csharp\n${activeCode}\n\`\`\`\n\nResponda APENAS JSON puro com os campos NESTA ordem: {"analise":"verificação curta linha a linha (interno)","ok":true/false,"message":"elogio curto se ok; se houver erro, onde está e como corrigir em 1-3 frases","missingChars":["símbolos que faltam"]}`,
        CS_SYSTEM + "\nResponda APENAS JSON puro, sem markdown.",
        { temperature: 0 }
      );
      setRobotState(parsed.ok?"ok":"error"); setRobotMsg(parsed.message); setKeysToShow(parsed.missingChars||[]);
    } catch(e) {
      if (e.message === 'ROBOTKEY_MISSING') { setRobotState("error"); setRobotMsg(e.userMsg || "🔑 Nyx está offline: configure a chave da IA no Vercel."); }
      else { setRobotState("error"); setRobotMsg("😵 Nyx não conseguiu analisar agora (falha ao falar com a IA). Tente de novo em alguns instantes."); }
    }
    setAnalyzing(false);
  };

  // robô: analisa sozinho 5s depois que o professor para de escrever (reagenda a cada tecla)
  useEffect(() => {
    if (activeCode.trim().length < 12 || analyzing) return;
    const t = setTimeout(() => { analyzeCode(); }, 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCode]);

  const card = { background:"linear-gradient(180deg,#231636,#1a1029)", borderRadius:16, padding:16, margin:"10px 0", border:"1px solid #3a2a55", boxShadow:"0 8px 24px rgba(3,5,16,.35)" };

  return (
    <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
      {renaming != null && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#1e1430", border:`2px solid ${accent}`, borderRadius:16, padding:24, maxWidth:380, width:"100%" }}>
            <h3 style={{ color:accent, margin:"0 0 4px" }}>✎ Renomear arquivo</h3>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 12px" }}>Escolha um nome (o ".cs" é colocado sozinho).</p>
            <div style={{ display:"flex", alignItems:"center", background:"#171026", border:"2px solid #3b2a58", borderRadius:10, padding:"0 12px" }}>
              <input autoFocus value={renameValue} onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") confirmRename(); if(e.key==="Escape") cancelRename(); }} placeholder="ex: MeuPrograma" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#f0e9fb", fontSize:15, padding:"11px 0" }} />
              <span style={{ color:"#776798", fontSize:14 }}>.cs</span>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={cancelRename} style={{ background:"#3b2a58", color:"#fff", border:"none", borderRadius:8, padding:"10px 0", cursor:"pointer", fontWeight:700, flex:1 }}>Cancelar</button>
              <button onClick={confirmRename} style={{ background:accent, color:"#fff", border:"none", borderRadius:8, padding:"10px 0", cursor:"pointer", fontWeight:700, flex:1 }}>Salvar nome</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex:"1 1 560px", minWidth:320 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
          {files.map((f,i)=>(
            <div key={i} onClick={()=>setActive(i)} style={{ display:"flex", alignItems:"center", gap:6, background:i===active?"#1e1e1e":"#101425", border:`1px solid ${i===active?accent:"#3b2a58"}`, color:i===active?"#fff":"#a99ac9", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>
              <span>📄 {f.name}</span>
              <span onClick={(e)=>{e.stopPropagation();openRename(i);}} title="Renomear" style={{ color:accent, fontWeight:700 }}>✎</span>
              {files.length>1 && <span onClick={(e)=>{e.stopPropagation();deleteFile(i);}} title="Apagar" style={{ color:"#f87171", fontWeight:700 }}>✕</span>}
            </div>
          ))}
          <button onClick={addFile} style={{ background:"#171026", border:`1px dashed ${accent}`, color:accent, borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>＋ Novo arquivo</button>
        </div>

        <VSEditor value={activeCode} onChange={updateActiveCode} filename={files[active]?.name} />

        <div style={{ display:"flex", justifyContent:"flex-start", alignItems:"center", marginTop:8 }}>
          <span style={{ color:"#776798", fontSize:12 }}>{analyzing?"🔍 Verificando...":"✨ Nyx confere seu código 5s depois que você para de escrever"}</span>
        </div>

        <Terminal files={files} maxHeight={terminalMaxHeight} />
      </div>

      <div className="side-col" style={{ width:250, flex:"0 0 250px" }}>
        <div style={card}>
          <NyxRobot state={robotState} size={88} context="teacher" gear={gear} />
          <button style={{ background:"transparent", border:"1px solid #c084fc", color:"#c084fc", borderRadius:8, width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5, cursor:"pointer", fontWeight:700 }} onClick={()=>setShowShop(true)}>🎁 Personalizar o Nyx</button>
          {robotMsg && (<div style={{ background:robotState==="error"?"#f8717111":"#34d39911", border:`1px solid ${robotState==="error"?"#f87171":"#34d399"}`, borderRadius:8, padding:12, marginTop:10, fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{robotMsg}</div>)}
          {keysToShow.length>0 && (<div style={{ marginTop:10 }}><p style={{ color:accent, fontSize:12, fontWeight:600, marginBottom:4 }}>Teclas para usar:</p>{keysToShow.map((k,i)=><KeyVisual key={i} char={k}/>)}</div>)}
        </div>
        {showShop && (
          <NyxShop wallet={9999} owned={NYX_ITEMS.map(i=>i.id)} gear={gear} onEquip={onEquip} onBuy={()=>{}} isTestShift={true} onClose={()=>setShowShop(false)} />
        )}
        <div style={{ ...card, fontSize:12, color:"#776798", lineHeight:1.8 }}>
          <p style={{ color:accent, fontWeight:600, marginBottom:6 }}>👩‍🏫 O exemplo da aula</p>
          <p style={{ color:"#a99ac9" }}>Programe aqui o exemplo de hoje e teste com o ▶ dotnet run. Este código <b>fica salvo</b> e é usado para gerar o nome do conteúdo do dia. Os alunos não veem esta área.</p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CALENDÁRIO (professor)
// ════════════════════════════════════════════════════════════════════════════
function Calendar({ classDays, contentNames = {}, onToggle }) {
  const [view, setView] = useState(() => { const d=new Date(); return { y:d.getFullYear(), m:d.getMonth() }; });
  const first = new Date(view.y, view.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(view.y, view.m+1, 0).getDate();
  const monthName = first.toLocaleDateString("pt-BR",{ month:"long", year:"numeric" });
  const tk = todayKey();
  const keyFor = d => `${view.y}-${String(view.m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const cells = [];
  for (let i=0;i<startDow;i++) cells.push(null);
  for (let d=1;d<=daysInMonth;d++) cells.push(d);
  const prev = () => setView(v => v.m===0 ? {y:v.y-1,m:11} : {y:v.y,m:v.m-1});
  const next = () => setView(v => v.m===11 ? {y:v.y+1,m:0} : {y:v.y,m:v.m+1});
  const wd = ["D","S","T","Q","Q","S","S"];
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <button onClick={prev} style={{ background:"#171026", border:"1px solid #3b2a58", color:"#f0e9fb", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>‹</button>
        <span style={{ color:"#f0e9fb", fontWeight:700, textTransform:"capitalize" }}>{monthName}</span>
        <button onClick={next} style={{ background:"#171026", border:"1px solid #3b2a58", color:"#f0e9fb", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
        {wd.map((d,i)=><div key={"h"+i} style={{ textAlign:"center", color:"#776798", fontSize:12, fontWeight:700 }}>{d}</div>)}
        {cells.map((d,i)=>{
          if (d===null) return <div key={"e"+i}/>;
          const k = keyFor(d);
          const isClass = classDays.includes(k);
          const isToday = k===tk;
          const cname = contentNames[k];
          const title = cname ? `${cname}${isClass?" · dia de aula":""}` : (isClass?"Dia de aula (clique para remover)":"Marcar como dia de aula");
          return (
            <button key={k} onClick={()=>onToggle(k)} title={title}
              style={{ position:"relative", aspectRatio:"1", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:isToday?700:400,
                background:isClass?"#34d399":"#171026", color:isClass?"#062":"#a99ac9",
                border:isToday?"2px solid #c084fc":"1px solid #3b2a58" }}>
              {d}
              {cname && <span style={{ position:"absolute", bottom:3, left:0, right:0, fontSize:9, lineHeight:1 }}>📖</span>}
            </button>
          );
        })}
      </div>
      <p style={{ color:"#776798", fontSize:12, marginTop:10 }}><span style={{ display:"inline-block", width:12, height:12, background:"#34d399", borderRadius:3, verticalAlign:"middle", marginRight:6 }}/>dias de aula &nbsp;·&nbsp; <span style={{ display:"inline-block", width:12, height:12, border:"2px solid #c084fc", borderRadius:3, verticalAlign:"middle", marginRight:6 }}/>hoje &nbsp;·&nbsp; 📖 tem conteúdo</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  PROFESSOR
// ════════════════════════════════════════════════════════════════════════════
const DF_CITIES = ["Plano Piloto (Brasília)","Gama","Taguatinga","Brazlândia","Sobradinho","Planaltina","Paranoá","Núcleo Bandeirante","Ceilândia","Guará","Cruzeiro","Samambaia","Santa Maria","São Sebastião","Recanto das Emas","Lago Sul","Riacho Fundo","Lago Norte","Candangolândia","Águas Claras","Riacho Fundo II","Sudoeste/Octogonal","Varjão","Park Way","SCIA/Estrutural","Sobradinho II","Jardim Botânico","Itapoã","SIA","Vicente Pires","Fercal","Sol Nascente/Pôr do Sol","Arniqueira"];

// ── 🗺️ mapa da jornada: posição ESQUEMÁTICA (não é GPS de verdade) de cada região administrativa
// do DF num grid de 0 a 100, só pra dar noção de mais ou menos onde cada uma fica em relação às
// outras — Plano Piloto no centro, satélites espalhadas ao redor, seguindo o formato real do DF ──
const DF_REGION_COORDS = {
  "Plano Piloto (Brasília)": { x:60, y:42 },
  "Lago Sul": { x:70, y:50 },
  "Lago Norte": { x:66, y:32 },
  "Paranoá": { x:80, y:40 },
  "Itapoã": { x:77, y:36 },
  "Jardim Botânico": { x:78, y:48 },
  "Varjão": { x:63, y:30 },
  "Sudoeste/Octogonal": { x:54, y:48 },
  "Cruzeiro": { x:50, y:46 },
  "SIA": { x:46, y:46 },
  "Guará": { x:44, y:50 },
  "Núcleo Bandeirante": { x:47, y:56 },
  "Candangolândia": { x:49, y:55 },
  "Park Way": { x:45, y:62 },
  "Riacho Fundo": { x:41, y:62 },
  "Riacho Fundo II": { x:39, y:67 },
  "Vicente Pires": { x:41, y:48 },
  "Águas Claras": { x:37, y:53 },
  "Arniqueira": { x:35, y:57 },
  "Taguatinga": { x:30, y:51 },
  "SCIA/Estrutural": { x:39, y:45 },
  "Ceilândia": { x:18, y:47 },
  "Sol Nascente/Pôr do Sol": { x:14, y:49 },
  "Samambaia": { x:21, y:59 },
  "Brazlândia": { x:9, y:24 },
  "Santa Maria": { x:37, y:74 },
  "Gama": { x:35, y:81 },
  "Recanto das Emas": { x:27, y:69 },
  "São Sebastião": { x:74, y:67 },
  "Fercal": { x:54, y:9 },
  "Sobradinho": { x:59, y:17 },
  "Sobradinho II": { x:56, y:21 },
  "Planaltina": { x:84, y:11 },
};
function normalizeCityName(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
// acha a região do DF que bate com o texto livre que o professor digitou (pode não ter acento,
// pode ser só "Brasília" em vez de "Plano Piloto (Brasília)" etc.) — null se não reconhecer nenhuma
function matchDfRegion(cityName) {
  const norm = normalizeCityName(cityName);
  if (!norm) return null;
  for (const region of DF_CITIES) {
    const rn = normalizeCityName(region);
    if (rn === norm || rn.includes(norm) || norm.includes(rn)) return region;
  }
  return null;
}

function difficultyOf(s) {
  if (s.phase==="done") {
    if ((s.score||0) >= 70) return { level:"bem", text:`Concluiu a aula com nota ${s.score}.` };
    return { level:"dif", text:`Concluiu, mas com nota baixa (${s.score}). Vale revisar o conteúdo com ele.` };
  }
  if (s.hasError && s.feedback && s.feedback.message) return { level:"dif", text:"Erro no código → " + s.feedback.message };
  if (s.phase==="activity") return { level:"bem", text:"Está fazendo a atividade." };
  if (s.phase==="summary") return { level:"bem", text:"Está lendo o resumo." };
  if (s.feedback && s.feedback.ok) return { level:"bem", text:"Código sem erros até agora." };
  // 🕰️ travado: já faz um tempo bom que entrou, continua online AGORA (não é aba esquecida aberta)
  // e ainda não escreveu quase nada — o resto da lógica acima só pega quem já ERROU ou já
  // TERMINOU com nota baixa; quem trava sem nem começar nunca aparecia como "precisa de ajuda"
  const onlineNow = s.lastSeen && (Date.now() - s.lastSeen) < 30000;
  const longSession = s.joinedAt && (Date.now() - s.joinedAt) > STUCK_MINUTES * 60000;
  const codeLen = (s.code || "").trim().length;
  if (onlineNow && longSession && codeLen < 10) {
    const mins = Math.round((Date.now() - s.joinedAt) / 60000);
    return { level:"dif", text:`Parece travado(a) — já está há ${mins} min na aula e ainda não escreveu nada.` };
  }
  if (!s.code || s.code.trim().length < 10) return { level:"neutro", text:"Ainda não começou a escrever." };
  return { level:"neutro", text:"Está escrevendo o código." };
}
const STUCK_MINUTES = 8; // quanto tempo sem escrever nada (com a aba online) até o professor ser avisado

// ── biblioteca de aulas prontas: exemplos completos que o professor carrega com 1 clique ──
const LESSON_LIBRARY = [
  { title:"Aula 1 · Olá, mundo!", desc:"O primeiro programa: mostrar texto na tela.", files:[{ name:"Program.cs", code:'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        // Console.WriteLine mostra um texto na tela\n        Console.WriteLine("Olá, mundo!");\n        Console.WriteLine("Bem-vindos à aula de C#!");\n    }\n}' }] },
  { title:"Aula 2 · Variáveis e tipos", desc:"Guardar textos e números: string, int e double.", files:[{ name:"Program.cs", code:'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        // variáveis guardam valores pra usar depois\n        string nome = "Nyx";      // texto\n        int idade = 14;            // número inteiro\n        double altura = 1.62;      // número com vírgula\n\n        Console.WriteLine("Nome: " + nome);\n        Console.WriteLine("Idade: " + idade);\n        Console.WriteLine("Altura: " + altura);\n    }\n}' }] },
  { title:"Aula 3 · Conversando com o programa", desc:"Ler o que a pessoa digita com Console.ReadLine.", files:[{ name:"Program.cs", code:'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        Console.WriteLine("Qual é o seu nome?");\n        string nome = Console.ReadLine(); // espera a pessoa digitar\n\n        Console.WriteLine("Quantos anos você tem?");\n        int idade = int.Parse(Console.ReadLine()); // converte o texto pra número\n\n        // o $ deixa colocar variáveis dentro do texto com { }\n        Console.WriteLine($"Olá, {nome}! Você tem {idade} anos.");\n    }\n}' }] },
  { title:"Aula 4 · Decisões com if/else", desc:"O programa escolhe um caminho conforme a condição.", files:[{ name:"Program.cs", code:'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        Console.WriteLine("Digite a sua nota (0 a 100):");\n        int nota = int.Parse(Console.ReadLine());\n\n        // o if testa uma condição; o else é o "senão"\n        if (nota >= 60)\n        {\n            Console.WriteLine("Parabéns, você passou!");\n        }\n        else\n        {\n            Console.WriteLine("Quase! Vamos estudar mais um pouco.");\n        }\n    }\n}' }] },
  { title:"Aula 5 · Repetição com for", desc:"Repetir um bloco várias vezes sem copiar código.", files:[{ name:"Program.cs", code:'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        // o for repete: começa no 1, vai até 10, somando 1 por vez\n        for (int i = 1; i <= 10; i++)\n        {\n            Console.WriteLine($"Contando: {i}");\n        }\n\n        Console.WriteLine("Fim da contagem!");\n    }\n}' }] },
  { title:"Aula 6 · Enquanto... (while)", desc:"Repetir enquanto uma condição for verdadeira.", files:[{ name:"Program.cs", code:'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        int vidas = 3;\n\n        // o while repete ENQUANTO a condição for verdadeira\n        while (vidas > 0)\n        {\n            Console.WriteLine($"Você tem {vidas} vida(s). Cuidado!");\n            vidas = vidas - 1; // perde uma vida\n        }\n\n        Console.WriteLine("Game over! 😅");\n    }\n}' }] },
  { title:"Aula 7 · Métodos", desc:"Organizar o código em pedaços com nome.", files:[{ name:"Program.cs", code:'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        // métodos são "mini-programas" com nome — é só chamar\n        DarOi("Ana");\n        DarOi("Bruno");\n\n        int soma = Somar(7, 5);\n        Console.WriteLine($"7 + 5 = {soma}");\n    }\n\n    static void DarOi(string nome)\n    {\n        Console.WriteLine($"Oi, {nome}! Tudo bem?");\n    }\n\n    static int Somar(int a, int b)\n    {\n        return a + b; // devolve o resultado pra quem chamou\n    }\n}' }] },
  { title:"Aula 8 · Listas", desc:"Guardar vários valores juntos com List.", files:[{ name:"Program.cs", code:'using System;\nusing System.Collections.Generic;\n\nclass Program\n{\n    static void Main()\n    {\n        // uma lista guarda vários valores do mesmo tipo\n        List<string> turma = new List<string>();\n        turma.Add("Ana");\n        turma.Add("Bruno");\n        turma.Add("Carla");\n\n        Console.WriteLine($"A turma tem {turma.Count} alunos:");\n        foreach (string aluno in turma)\n        {\n            Console.WriteLine("- " + aluno);\n        }\n    }\n}' }] },
  { title:"Aula 9 · Mini projeto: jogo de adivinhação", desc:"Junta tudo: variáveis, while, if e Random.", files:[{ name:"Program.cs", code:'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        // Random sorteia um número secreto de 1 a 20\n        Random sorteio = new Random();\n        int secreto = sorteio.Next(1, 21);\n        int tentativas = 0;\n        int chute = 0;\n\n        Console.WriteLine("Adivinhe o número secreto (1 a 20)!");\n\n        while (chute != secreto)\n        {\n            Console.WriteLine("Seu chute:");\n            chute = int.Parse(Console.ReadLine());\n            tentativas++;\n\n            if (chute < secreto)\n            {\n                Console.WriteLine("É MAIOR! Tente de novo.");\n            }\n            else if (chute > secreto)\n            {\n                Console.WriteLine("É menor! Tente de novo.");\n            }\n        }\n\n        Console.WriteLine($"🎉 Acertou em {tentativas} tentativa(s)!");\n    }\n}' }] },
];

// card que começa fechado (só o título) e abre com um clique — usado pra esconder as ferramentas menos
// usadas do painel do professor (diagnóstico, boletim, retrospectiva...) sem tirar nada do ar, só do
// primeiro olhar. O conteúdo (children) só é montado quando aberto, então nada roda escondido à toa.
function CollapsibleCard({ title, color = "#fbbf24", defaultOpen = false, alertOpen = false, dataTourProf, headerRight, children }) {
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

function TeacherView({ onLogout, teacherAuth }) {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showDupHover, setShowDupHover] = useState(false); // aviso de aluno duplicado — só aparece ao passar o mouse
  // gestão do aluno selecionado (renomear, mover de turno, corrigir nota, excluir)
  const [renameVal, setRenameVal] = useState("");
  const [scoreVal, setScoreVal] = useState("");
  const [struggleNotice, setStruggleNotice] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selAccessMode, setSelAccessMode] = useState(false);
  // perfis de apoio (educação inclusiva) do aluno selecionado + mapa geral pros tiles
  const [selSupport, setSelSupport] = useState({});
  const [supportMap, setSupportMap] = useState({});
  const [checkinMap, setCheckinMap] = useState({}); // 😊 check-in emocional do dia: "turno:nome" → { mood, at }
  useEffect(() => { setRenameVal(""); setScoreVal(""); setConfirmDelete(false); }, [selected]);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetScope, setResetScope] = useState("all");
  const [resetMsg, setResetMsg] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [diag, setDiag] = useState(null);
  // 🚨 erros de JS capturados sozinhos nas sessões dos alunos/professor (ver reportClientError em
  // storage.js e o listener global em App.jsx) — carrega só quando o card é aberto pela 1ª vez
  const [recentErrors, setRecentErrors] = useState(null);
  const [errorsLoading, setErrorsLoading] = useState(false);
  const loadRecentErrors = async () => { setErrorsLoading(true); setRecentErrors(await getRecentErrors(teacherAuth)); setErrorsLoading(false); };
  const [tab, setTab] = useState("monitor");
  const [meta, setMeta] = useState({ city:"", classDays:[], contentNames:{} });
  // horário automático de aula (por turno) + vistoria (libera um aluno específico fora do horário)
  const [schedule, setSchedule] = useState({});
  const [scheduleMsg, setScheduleMsg] = useState("");
  const [selInspection, setSelInspection] = useState(false);
  const [breakEndMsgTeacher, setBreakEndMsgTeacher] = useState("");
  const breakEndNotifiedTeacherRef = useRef({});
  const breakStartNotifiedTeacherRef = useRef({});
  const [cityInput, setCityInput] = useState("");
  // 🏆 hall da fama: encerra a cidade atual e guarda uma placa com quem se destacou
  const [hallMsg, setHallMsg] = useState("");
  const [confirmCloseCity, setConfirmCloseCity] = useState(false);
  const [farewellBusy, setFarewellBusy] = useState(false);
  // 💾 backup AUTOMÁTICO agendado (roda sozinho todo dia via Vercel Cron, fica guardado no próprio
  // banco) — diferente do botão "Baixar backup completo" mais abaixo, que baixa um arquivo pro seu
  // computador na hora; aqui só mostra o status do agendado e permite forçar um na hora também
  const [autoBackupList, setAutoBackupList] = useState(null);
  const [autoBackupBusy, setAutoBackupBusy] = useState(false);
  const [autoBackupMsg, setAutoBackupMsg] = useState("");
  const [showTripOverview, setShowTripOverview] = useState(false);
  const [tripHallEntries, setTripHallEntries] = useState([]);
  const [shiftFilter, setShiftFilter] = useState("all");
  // tour guiado do painel do professor — só começa se o professor clicar em "🧭 Tour" (não some sozinho)
  const [profTourStep, setProfTourStep] = useState(-1);
  // grade de alunos do Monitoramento só aparece com o mouse em cima — menos poluído de cara, mas
  // não esconde nada crítico: ajuda/erro continuam avisados via "Nyx de olho" e "👀 Situação"
  const [monitorHover, setMonitorHover] = useState(false);
  const [genName, setGenName] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
  const [autoNameMsg, setAutoNameMsg] = useState("");
  const autoNameTriedRef = useRef({});
  // ✋ notificação de pedido de ajuda (toast, igual ao "Reconectando Nyx")
  const [helpNotice, setHelpNotice] = useState("");
  const helpSeenRef = useRef({});
  const helpInitRef = useRef(false);
  // ⚠️ notificação de erro em produção na tela de um aluno (mesmo padrão do pedido de ajuda)
  const [errorNotice, setErrorNotice] = useState("");
  const errorSeenRef = useRef({});
  const errorInitRef = useRef(false);
  const [nudged, setNudged] = useState({});
  const metaRef = useRef({ city:"", classDays:[], contentNames:{} });
  // código do professor (aba "Meu código") — um exemplo independente por turno
  const [proFilesByShift, setProFilesByShift] = useState({
    matutino: [{ name:"Program.cs", code:"" }],
    vespertino: [{ name:"Program.cs", code:"" }],
  });
  const [proLoaded, setProLoaded] = useState(false);
  const [codeShift, setCodeShift] = useState("matutino"); // turno em edição/visualização (Meu código + Calendário)
  const proFiles = proFilesByShift[codeShift];
  const setProFiles = (updater) => setProFilesByShift(prev => ({
    ...prev,
    [codeShift]: typeof updater === "function" ? updater(prev[codeShift]) : updater,
  }));
  // prova
  const [examConfig, setExamConfig] = useState({ status: 'idle' });
  const [examGenerating, setExamGenerating] = useState(false);
  const [examMsg, setExamMsg] = useState("");
  // relógio pra contar o tempo de estudo restante na fase de revisão da prova
  const [examNow, setExamNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setExamNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  // cada turno tem sua própria prova independente (ver storage.js) — reaproveita o mesmo filtro de
  // turma (shiftFilter) que já existe pra Monitoramento/Calendário/Feedback, em vez de criar outro
  // seletor: trocar o filtro busca na hora o estado da prova DAQUELE turno, sem esperar o próximo
  // ciclo do polling normal (8s)
  const shiftFilterRef = useRef(shiftFilter);
  useEffect(() => { shiftFilterRef.current = shiftFilter; }, [shiftFilter]);
  useEffect(() => {
    let alive = true;
    (async () => { try { const ec = await getExamState(shiftFilter, teacherAuth); if (alive) setExamConfig(ec); } catch {} })();
    return () => { alive = false; };
  }, [shiftFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirmEndExam, setConfirmEndExam] = useState(false);
  // 🎉 quiz estilo Kahoot: temas salvos + sala ativa (o professor é o único que escreve; os alunos
  // respondem no próprio perfil e o placar é apurado aqui a partir do polling da turma)
  const [quizThemes, setQuizThemes] = useState([]);
  const [quizRoom, setQuizRoomState] = useState(null);
  const [quizNow, setQuizNow] = useState(() => Date.now());
  const [quizNewTitle, setQuizNewTitle] = useState("");
  const [quizSecs, setQuizSecs] = useState(QUIZ_QUESTION_SECONDS); // tempo por pergunta escolhido pra próxima sala
  const [quizEditingTheme, setQuizEditingTheme] = useState(null); // { id?, title, questions } em edição
  const [quizQDraft, setQuizQDraft] = useState({ q:"", opts:["","","",""], correct:0, hard:false });
  useEffect(() => { getQuizThemes().then(ts => setQuizThemes(Array.isArray(ts) ? ts : [])); }, []);
  useEffect(() => { getQuizRoom().then(setQuizRoomState); }, []); // retoma sala aberta após recarregar a página
  useEffect(() => {
    if (!quizRoom || quizRoom.status !== "question") return;
    const iv = setInterval(() => setQuizNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [quizRoom?.status, quizRoom?.qIndex]);
  const quizWrite = async (state) => { setQuizRoomState(state); await setQuizRoom(state, teacherAuth); };
  const startQuizRoom = async (theme) => {
    await quizWrite({ code: makeQuizCode(), themeTitle: theme.title, questions: theme.questions, secs: quizSecs, status: "lobby", qIndex: 0, startedAts: {}, createdAt: Date.now() });
    setTab("quiz");
  };
  const quizNextQuestion = async () => {
    const next = quizRoom.status === "lobby" ? 0 : quizRoom.qIndex + 1;
    if (next >= quizRoom.questions.length) { await quizWrite({ ...quizRoom, status: "podium" }); return; }
    await quizWrite({ ...quizRoom, status: "question", qIndex: next, startedAts: { ...quizRoom.startedAts, [next]: Date.now() } });
  };
  const quizReveal = async () => { await quizWrite({ ...quizRoom, status: "reveal" }); };
  const quizEnd = async () => { setQuizRoomState(null); await clearQuizRoom(teacherAuth); };
  // encerra a pergunta sozinho quando o tempo acabar (o professor também pode encerrar antes no botão)
  useEffect(() => {
    if (!quizRoom || quizRoom.status !== "question") return;
    const startedAt = quizRoom.startedAts[quizRoom.qIndex];
    if (startedAt != null && quizNow >= startedAt + quizSecsOf(quizRoom) * 1000) quizReveal();
  }, [quizNow]);
  const saveQuizTheme = async () => {
    const t = quizEditingTheme;
    if (!t || !t.title.trim() || !t.questions.length) return;
    const next = t.id
      ? quizThemes.map(x => x.id === t.id ? { ...t } : x)
      : [...quizThemes, { ...t, id: `t${Date.now()}` }];
    setQuizThemes(next);
    setQuizEditingTheme(null);
    await saveQuizThemes(next, teacherAuth);
  };
  const deleteQuizTheme = async (id) => {
    const next = quizThemes.filter(t => t.id !== id);
    setQuizThemes(next);
    await saveQuizThemes(next, teacherAuth);
  };
  const [dbSetupMsg, setDbSetupMsg] = useState("");
  const [dbSetupLoading, setDbSetupLoading] = useState(false);
  const [dbSetupSQL, setDbSetupSQL] = useState(null); // { sql, sqlEditorUrl }
  // análise do Nyx (período + prova)
  const [examAnalysis, setExamAnalysis] = useState("");
  const [analyzingExam, setAnalyzingExam] = useState(false);
  // saúde do Nyx: reflete a última chamada de IA de QUALQUER aluno/professor — se foi erro, mostra "Reconectando"
  const [aiDown, setAiDown] = useState(false);
  // telão da turma: tela cheia só de visualização, pra projetar (ranking, meta, combos)
  const [showTelao, setShowTelao] = useState(false);
  const [showQuickStatus, setShowQuickStatus] = useState(false);
  // PDF com o código e o resumo de cada aluno (pra guardar/enviar ao fim do curso)
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfMsg, setPdfMsg] = useState("");
  const [pdfScope, setPdfScope] = useState("all"); // "all" | "matutino" | "vespertino" — qual turno vai no PDF de códigos
  // 📄 PDF do dia: resumo curto do código de HOJE pra mandar pra um aluno específico (ex: quem vai
  // faltar) — o professor confirma/edita o código antes de gerar, pra não depender de "Meu código"
  // estar necessariamente atualizado com o que foi passado hoje
  const [dailyPdfBusy, setDailyPdfBusy] = useState(false);
  const [dailyPdfMsg, setDailyPdfMsg] = useState("");
  // 💌 boletim pros responsáveis (PDF com uma página por aluno do turno)
  const [boletimBusy, setBoletimBusy] = useState(false);
  const [boletimMsg, setBoletimMsg] = useState("");
  const [boletimScope, setBoletimScope] = useState("all"); // "all" | "matutino" | "vespertino" — pra quem vai o boletim em lote
  const [dailyPdfModal, setDailyPdfModal] = useState(null); // { shift, studentName } | null
  const [dailyPdfCode, setDailyPdfCode] = useState("");
  // biblioteca de aulas (as SUAS aulas salvas + modelos de exemplo) + backup completo
  const [showLessons, setShowLessons] = useState(false);
  const [myLessons, setMyLessons] = useState([]);
  const [lessonName, setLessonName] = useState("");
  const [showModels, setShowModels] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);

  const load = useCallback(async () => {
    const arr = await listStudents(teacherAuth);
    setStudents(arr);
    setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
    try { const ec = await getExamState(shiftFilterRef.current, teacherAuth); setExamConfig(ec); } catch {}
    // marca o dia de hoje como aula se houver alunos — não conta fim de semana
    // como aula por padrão (só se o professor liberar em allowWeekend)
    const dowNow = new Date().getDay();
    const isWeekendNow = dowNow === 0 || dowNow === 6;
    if (arr.length > 0 && (!isWeekendNow || metaRef.current.allowWeekend)) {
      const tk = todayKey();
      if (!metaRef.current.classDays.includes(tk)) {
        const nm = { ...metaRef.current, classDays:[...metaRef.current.classDays, tk] };
        metaRef.current = nm; setMeta(nm); saveTeacherMeta(nm, teacherAuth);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => { if (active) await load(); };
    run();
    const iv = setInterval(run, 10000);
    return () => { active = false; clearInterval(iv); };
  }, [load]);

  useEffect(() => { diagnose().then(setDiag); }, []);

  // 🍎 intervalo: status de cada turno (recalcula a cada carregamento da turma, ~2s) + sininho no fim
  const shiftBreakStatuses = SHIFTS.map(sh => ({ ...sh, status: classStatus(schedule[sh.id] || {}, meta.allowWeekend) }));
  useEffect(() => {
    shiftBreakStatuses.forEach(({ id, label, status }) => {
      const sc = schedule[id] || {};
      if (!sc.breakStart || !sc.breakMin) return;
      const bKey = `${todayKey()}-${id}-${sc.breakStart}-${sc.breakMin}`;
      const bStartMin = hmToMin(sc.breakStart);
      if (bStartMin == null) return;
      if (!status.inBreak && status.configured && nowMin() >= bStartMin + Number(sc.breakMin) && breakEndNotifiedTeacherRef.current[bKey] !== true) {
        breakEndNotifiedTeacherRef.current[bKey] = true;
        playSound("bell");
        setBreakEndMsgTeacher(`🔔 Intervalo da turma ${label} acabou!`);
        setTimeout(() => setBreakEndMsgTeacher(""), 8000);
      }
      if (status.inBreak && breakStartNotifiedTeacherRef.current[bKey] !== true) {
        breakStartNotifiedTeacherRef.current[bKey] = true;
        playSound("recesso");
      }
    });
  }, [shiftBreakStatuses.map(s => s.status.inBreak).join(","), schedule]);
  // mapa de perfis de apoio (indicador 💙 nos tiles) — atualiza de vez em quando, não precisa ser ao vivo
  useEffect(() => {
    let active = true;
    const loadSupport = async () => { const m = await listAllSupport(teacherAuth); if (active) setSupportMap(m); };
    loadSupport();
    const iv = setInterval(loadSupport, 20000);
    return () => { active = false; clearInterval(iv); };
  }, [teacherAuth]);
  // 😊 mapa de check-in emocional do dia (indicador nos tiles) — mesma cadência do apoio, não precisa ser ao vivo
  useEffect(() => {
    let active = true;
    const loadCheckin = async () => { const m = await listCheckinsForDate(todayKey(), teacherAuth); if (active) setCheckinMap(m); };
    loadCheckin();
    const iv = setInterval(loadCheckin, 20000);
    return () => { active = false; clearInterval(iv); };
  }, [teacherAuth]);
  // ✨ nome do conteúdo automático: quando TODOS os alunos de um turno (que apareceram hoje) já
  // passaram da fase de codar (estão no resumo, na atividade ou concluíram), gera o nome sozinho —
  // sem o professor precisar lembrar de clicar. Só tenta 1x por turno por dia.
  useEffect(() => {
    const tk = todayKey();
    SHIFTS.forEach(sh => {
      const key = `${tk}-${sh.id}`;
      if (autoNameTriedRef.current[key]) return;
      if (contentNameFor((meta.contentNames||{})[tk], sh.id)) { autoNameTriedRef.current[key] = true; return; }
      const todayList = students.filter(s => (s.shift||"sem-turno")===sh.id && (s.shift||"")!==TEST_SHIFT.id && isSameDayTs(s.lastSeen));
      if (todayList.length === 0) return;
      const allPastCoding = todayList.every(s => ["summary","activity","done"].includes(s.phase));
      if (!allPastCoding) return;
      autoNameTriedRef.current[key] = true;
      computeContentName(sh.id)
        .then(({ title }) => { setAutoNameMsg(`✨ Nome do conteúdo gerado sozinho (${shiftMeta(sh.id).label}): ${title}`); setTimeout(()=>setAutoNameMsg(""), 8000); })
        .catch(() => {}); // sem exemplo do professor nem código de aluno ainda — tenta de novo quando alguém escrever
    });
  }, [students, meta.contentNames]);
  // ✋ toast de pedido de ajuda: dispara na hora que um aluno clica, mesmo se o professor não
  // estiver olhando o Monitoramento — não avisa pedidos que já estavam pendentes ao abrir o painel
  useEffect(() => {
    students.filter(s => (s.shift||"") !== TEST_SHIFT.id).forEach(s => {
      const k = `${s.shift||"sem-turno"}:${s.name}`;
      const prevSeen = helpSeenRef.current[k];
      if (s.helpAt && s.helpAt !== prevSeen) {
        helpSeenRef.current[k] = s.helpAt;
        if (helpInitRef.current && Date.now() - s.helpAt < 20000) {
          playSound("enter");
          setHelpNotice(`✋ ${s.name} pediu ajuda!`);
          setTimeout(() => setHelpNotice(""), 8000);
        }
      } else if (!s.helpAt && prevSeen) {
        helpSeenRef.current[k] = null;
      }
    });
    helpInitRef.current = true;
  }, [students]);
  // ⚠️ toast de erro em produção: mesma lógica do pedido de ajuda, mas pra quando a tela de um
  // aluno quebra sozinha (erro de JS) — o professor fica sabendo sem o aluno precisar reclamar
  useEffect(() => {
    students.filter(s => (s.shift||"") !== TEST_SHIFT.id).forEach(s => {
      const k = `${s.shift||"sem-turno"}:${s.name}`;
      const prevSeen = errorSeenRef.current[k];
      if (s.errorAt && s.errorAt !== prevSeen) {
        errorSeenRef.current[k] = s.errorAt;
        if (errorInitRef.current && Date.now() - s.errorAt < 20000) {
          playSound("wrong");
          setErrorNotice(`⚠️ A tela de ${s.name} deu um erro (${s.errorMsg || "sem detalhes"})`);
          setTimeout(() => setErrorNotice(""), 10000);
        }
      } else if (!s.errorAt && prevSeen) {
        errorSeenRef.current[k] = null;
      }
    });
    errorInitRef.current = true;
  }, [students]);
  // fica de olho na saúde do Nyx: se a última chamada de IA registrada (de qualquer aluno/professor)
  // foi erro e é recente, mostra "Reconectando Nyx"; some assim que uma chamada der certo de novo
  useEffect(() => {
    let active = true;
    const check = async () => {
      const h = await getAiHealth();
      if (!active) return;
      setAiDown(!!h && h.ok === false && Date.now() - h.at < 5 * 60 * 1000);
    };
    check();
    const iv = setInterval(check, 10000);
    return () => { active = false; clearInterval(iv); };
  }, []);
  // 🩺 saúde de CADA modelo separado (Nemotron/Laguna) — pontinho no cabeçalho, pra o professor ver
  // de longe se algum dos dois está fora do ar antes de a turma toda esbarrar nisso
  const [providerHealth, setProviderHealth] = useState({ nvidia:null, laguna:null });
  useEffect(() => {
    let active = true;
    const check = async () => {
      const [nvidia, laguna] = await Promise.all([getAiHealthByProvider("nvidia"), getAiHealthByProvider("laguna")]);
      if (active) setProviderHealth({ nvidia, laguna });
    };
    check();
    const iv = setInterval(check, 10000);
    return () => { active = false; clearInterval(iv); };
  }, []);
  // 🤝 parceiros de código ativos (dos dois turnos) — pra saber quem já está pareado e não sugerir de novo
  const [partners, setPartners] = useState([]);
  useEffect(() => {
    let active = true;
    const load2 = async () => {
      const lists = await Promise.all(SHIFTS.map(sh => listPartners(sh.id)));
      if (active) setPartners(lists.flat());
    };
    load2();
    const iv = setInterval(load2, 10000);
    return () => { active = false; clearInterval(iv); };
  }, []);
  useEffect(() => { getTeacherMeta().then(m => { metaRef.current = m; setMeta(m); setCityInput(m.city||""); setSchedule(m.schedule||{}); }); }, []);
  // carrega o código salvo do professor uma vez, para cada turno
  useEffect(() => {
    (async () => {
      const [m, v] = await Promise.all([getTeacherCode("matutino"), getTeacherCode("vespertino")]);
      // tira \r de código salvo ANTES da correção (colado do Windows/Visual Studio) — ver VSEditor
      const clean = (files) => files.map(f => ({ ...f, code: String(f.code||"").replace(/\r/g, "") }));
      setProFilesByShift(prev => ({
        matutino: (m && Array.isArray(m.files) && m.files.length) ? clean(m.files) : prev.matutino,
        vespertino: (v && Array.isArray(v.files) && v.files.length) ? clean(v.files) : prev.vespertino,
      }));
      setProLoaded(true);
    })();
  }, []);
  // salva o código do professor de cada turno (sem pressa) sempre que ele mexe
  useEffect(() => {
    if (!proLoaded) return;
    const id = setTimeout(() => {
      saveTeacherCode(proFilesByShift.matutino, "matutino", teacherAuth);
      saveTeacherCode(proFilesByShift.vespertino, "vespertino", teacherAuth);
    }, 1000);
    return () => clearTimeout(id);
  }, [proFilesByShift, proLoaded]);

  const saveCity = async () => { const nm = { ...metaRef.current, city:cityInput.trim() }; metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm, teacherAuth); };
  // personalização do Nyx do professor (acessórios cosméticos, sem custo — é só o professor mesmo)
  const saveTeacherGear = async (newGear) => { const nm = { ...metaRef.current, nyxGear:newGear }; metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm, teacherAuth); };
  // 📄 relatório de despedida: um PDF-lembrança da cidade que está sendo encerrada, com o
  // retrato da turma inteira (pódio, conquistas, médias) e uma mensagem de despedida do Nyx
  const generateFarewellPDF = async ({ city, active, podio, totalClasses, avgScore, periodStart, periodEnd }) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    const maxW = pageW - margin * 2;
    let y = margin;
    const hexRgb = (hex) => {
      const h = hex.replace("#", "");
      const n = parseInt(h.length === 3 ? h.split("").map(c=>c+c).join("") : h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const clean = (t) => String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️]/gu, "").replace(/\s+/g, " ").trim();
    const ensureSpace = (needed) => { if (y + needed > pageH - margin - 16) { doc.addPage(); y = margin; } };
    const writeParagraph = (text, opts = {}) => {
      const { size = 10.5, font = "helvetica", style = "normal", color = "#2a2f45", lineGap = 4.5, x = margin, width = maxW, align = "left" } = opts;
      doc.setFont(font, style); doc.setFontSize(size); doc.setTextColor(...hexRgb(color));
      doc.splitTextToSize(String(text || " "), width).forEach(line => {
        ensureSpace(size + lineGap);
        doc.text(line, align === "center" ? x + width / 2 : x, y, align === "center" ? { align: "center" } : undefined);
        y += size + lineGap;
      });
    };
    const statBox = (x, w, label, value, accent) => {
      doc.setFillColor(...hexRgb("#f2f4fc")); doc.setDrawColor(...hexRgb(accent));
      doc.roundedRect(x, y, w, 60, 7, 7, "FD");
      doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(...hexRgb(accent));
      doc.text(String(value), x + w/2, y + 30, { align:"center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...hexRgb("#5b6084"));
      doc.text(clean(label), x + w/2, y + 46, { align:"center" });
    };

    // ── CAPA ──
    doc.setFillColor(...hexRgb("#1d1230")); doc.rect(0, 0, pageW, pageH, "F");
    doc.setFillColor(...hexRgb("#2a1a42"));
    doc.circle(pageW - 60, 90, 130, "F");
    doc.circle(40, pageH - 80, 100, "F");
    doc.setFillColor(...hexRgb("#fbbf24")); doc.roundedRect(margin, 210, 64, 7, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.setTextColor(255, 255, 255);
    doc.text("Relatório de Despedida", margin, 262);
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...hexRgb("#fbbf24"));
    doc.text(clean(city), margin, 292);
    doc.setFont("helvetica", "normal"); doc.setFontSize(13); doc.setTextColor(...hexRgb("#c4b2e2"));
    doc.text(clean(`Aula de C#  •  ${periodStart} a ${periodEnd}`), margin, 316);
    doc.setFont("courier", "normal"); doc.setFontSize(10); doc.setTextColor(...hexRgb("#5e4a86"));
    doc.text('Console.WriteLine("Foi uma honra ensinar aqui!");', margin, pageH - 70);

    // ── NÚMEROS DA TURMA ──
    doc.addPage(); y = margin;
    doc.setFillColor(...hexRgb("#fbbf24")); doc.roundedRect(margin, y - 6, maxW, 40, 8, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255,255,255);
    doc.text("A TURMA EM NÚMEROS", margin + 16, y + 19);
    y += 58;
    const boxW = (maxW - 16) / 3;
    statBox(margin, boxW, "alunos atendidos", active.length, "#c084fc");
    statBox(margin + boxW + 8, boxW, "aulas dadas", totalClasses, "#34d399");
    statBox(margin + (boxW + 8) * 2, boxW, "nota média da turma", avgScore || "-", "#fbbf24");
    y += 84;

    // ── PÓDIO ──
    writeParagraph("Quem mais se destacou", { size: 14, style: "bold", color: "#1f2547" });
    y += 4;
    if (podio.length) {
      const medals = ["1º lugar", "2º lugar", "3º lugar"];
      podio.forEach((p, i) => {
        ensureSpace(34);
        doc.setFillColor(...hexRgb(i===0?"#fbbf24":i===1?"#c7cbe8":"#d99a5b"));
        doc.roundedRect(margin, y - 12, 26, 26, 6, 6, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
        doc.text(String(i+1), margin + 13, y + 4, { align:"center" });
        writeParagraph(`${clean(p.name)} — ${clean(p.highlight)}`, { size: 11, x: margin + 34, width: maxW - 34 });
      });
    } else {
      writeParagraph("Nenhum destaque com nota ou pontos registrados nesta cidade.", { size: 10.5, style:"italic", color:"#8a8fa8" });
    }
    y += 14;

    // ── CONQUISTAS DA TURMA ──
    writeParagraph("Conquistas da turma", { size: 14, style: "bold", color: "#1f2547" });
    y += 2;
    const totalAch = active.reduce((sum,s) => sum + (s.achievements||[]).length, 0);
    const allEggsFinders = active.filter(s => (s.achievements||[]).includes("todos-segredos")).length;
    writeParagraph(clean(`No total, a turma desbloqueou ${totalAch} conquistas. ${allEggsFinders > 0 ? `${allEggsFinders} aluno(s) encontraram TODOS os segredos escondidos do Nyx! 🏆` : ""}`), { size: 10.5 });
    y += 10;

    // ── MENSAGEM DE DESPEDIDA ──
    ensureSpace(90);
    doc.setFillColor(...hexRgb("#fff7e0")); doc.setDrawColor(...hexRgb("#f0d896"));
    const farewellText = clean(`Foi uma honra fazer parte da jornada de vocês em ${city}! Cada linha de código escrita, cada erro corrigido e cada conquista desbloqueada mostra o quanto essa turma cresceu. Continuem curiosos, continuem programando — o Nyx torce por vocês, onde quer que a carreta vá agora. Até a próxima!`);
    const flLines = doc.splitTextToSize(farewellText, maxW - 24);
    const fh = flLines.length * 14 + 20;
    doc.roundedRect(margin, y - 4, maxW, fh, 8, 8, "FD");
    doc.setFont("helvetica", "italic"); doc.setFontSize(10.5); doc.setTextColor(...hexRgb("#8a6d1a"));
    flLines.forEach((ln, j) => doc.text(ln, margin + 12, y + 14 + j * 14));
    y += fh + 10;

    // ── rodapé (pula a capa) ──
    const total = doc.getNumberOfPages();
    for (let p = 2; p <= total; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...hexRgb("#9aa1c2"));
      doc.text("Aula de C#  •  relatório de despedida", margin, pageH - 24);
      doc.text(`${p - 1} / ${total - 1}`, pageW - margin, pageH - 24, { align: "right" });
    }
    doc.save(`despedida-${(city||"cidade").toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${todayKey()}.pdf`);
  };

  // 🏆 encerra a cidade atual: guarda uma placa no Hall da Fama com quem mais se destacou, pra
  // os alunos da PRÓXIMA cidade verem — não apaga nem reseta nada, é só um retrato do fechamento,
  // e também gera um PDF de despedida pro professor guardar/imprimir
  const doCloseCity = async () => {
    setConfirmCloseCity(false);
    if (!meta.city) { setHallMsg("❌ Defina o nome da cidade antes de encerrar."); setTimeout(()=>setHallMsg(""), 5000); return; }
    const active = students.filter(s => (s.shift||"") !== TEST_SHIFT.id);
    const highlightOf = (s) => {
      const notas = [...Object.values(s.scoreHistory||{}), s.score, s.examScore].filter(n => typeof n === "number");
      return notas.length ? Math.max(...notas) : 0;
    };
    const podio = active
      .map(s => ({ name: s.name, nota: highlightOf(s), pts: s.nyxPoints||0 }))
      .filter(s => s.nota > 0 || s.pts > 0)
      .sort((a,b) => (b.nota - a.nota) || (b.pts - a.pts))
      .slice(0, 3)
      .map(s => ({ name: s.name, highlight: s.nota > 0 ? `nota ${s.nota} · ${s.pts} pts do Nyx` : `${s.pts} pts do Nyx` }));
    // estatísticas da cidade inteira, pra "Visão da Viagem" (agregado de todas as cidades encerradas)
    const notasValidas = active.map(highlightOf).filter(n => n > 0);
    const avgScore = notasValidas.length ? Math.round(notasValidas.reduce((a,b)=>a+b,0) / notasValidas.length) : 0;
    const entries = await getHallOfFame();
    // meta.classDays é uma lista que só CRESCE desde sempre (nunca reseta de cidade pra cidade) —
    // "aulas dadas NESTA cidade" precisa ser a diferença desde a última cidade encerrada, senão toda
    // cidade nova soma o histórico inteiro da viagem e o total infla sem parar
    const cumulativeClassDays = (meta.classDays||[]).length;
    const previousCumulative = entries.length ? (entries[entries.length-1].classDaysSnapshot || 0) : 0;
    const totalClasses = Math.max(0, cumulativeClassDays - previousCumulative);
    const next = [...entries, { city: meta.city, students: podio, closedAt: Date.now(), totalStudents: active.length, totalClasses, avgScore, classDaysSnapshot: cumulativeClassDays }];
    await saveHallOfFame(next, teacherAuth);
    // 🔒 fim da turma nesta cidade: os responsáveis já sabiam que isso aconteceria — apaga data de
    // nascimento e CPF de todo mundo (dado sensível só existia pra gerar certificado enquanto durou
    // a turma). Depois disso ninguém mais tem acesso, nem o professor — some da planilha também.
    await Promise.all(active.filter(s => s.birthDate || s.cpf).map(s => patchStudent(s.shift, s.name, { birthDate:"", cpf:"" })));
    setHallMsg(`✅ ${meta.city} entrou pro Hall da Fama! Gerando o relatório de despedida em PDF...`);
    setFarewellBusy(true);
    try {
      const daysThisCity = [...(meta.classDays||[])].sort().slice(-Math.max(totalClasses,1));
      const fmt = (k) => { try { const [y,m,d] = String(k).split("-"); return `${d}/${m}/${y}`; } catch { return k; } };
      const periodStart = daysThisCity.length ? fmt(daysThisCity[0]) : fmt(todayKey());
      const periodEnd = daysThisCity.length ? fmt(daysThisCity[daysThisCity.length-1]) : fmt(todayKey());
      await generateFarewellPDF({ city: meta.city, active, podio, totalClasses, avgScore, periodStart, periodEnd });
      setHallMsg(`✅ ${meta.city} entrou pro Hall da Fama, o relatório de despedida foi baixado, e a data de nascimento/CPF da turma foi apagada.`);
    } catch {
      setHallMsg(`✅ ${meta.city} entrou pro Hall da Fama e a data de nascimento/CPF da turma foi apagada! (Não consegui gerar o PDF de despedida agora — tente de novo se quiser.)`);
    }
    setFarewellBusy(false);
    setTimeout(()=>setHallMsg(""), 9000);
  };
  // 📄 Relatório de Comprovação de Aproveitamento de Aprendizado: reaproveita o modelo oficial
  // (cabeçalho/rodapé/assinaturas intactos), preenchendo cidade/mês e um bloco por turma com
  // ALUNO/CPF/NOTA/ANEXO de cada aluno — só matutino e vespertino (mesmo recorte da turma oficial
  // de C# usado no /impacto; turma de teste e sala de linguagens ficam de fora)
  const [relatorioBusy, setRelatorioBusy] = useState(false);
  const [relatorioMsg, setRelatorioMsg] = useState("");
  const doGerarRelatorio = async () => {
    setRelatorioBusy(true); setRelatorioMsg("");
    try {
      const byName = (a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR");
      const studentsByShift = {
        matutino: students.filter(s => (s.shift || "matutino") === "matutino").sort(byName),
        vespertino: students.filter(s => s.shift === "vespertino").sort(byName),
      };
      const total = studentsByShift.matutino.length + studentsByShift.vespertino.length;
      if (total === 0) { setRelatorioMsg("❌ Nenhum aluno em Matutino/Vespertino ainda pra gerar o relatório."); setRelatorioBusy(false); return; }
      const blob = await generateRelatorioDocx({
        city: meta.city,
        studentsByShift,
        cursoTexto: "C# para iniciantes",
        tipoAvaliacao: "atividades avaliativas e prova sobre C#",
      });
      downloadRelatorioDocx(blob, { city: meta.city });
      setRelatorioMsg(`✅ Relatório gerado com ${total} aluno${total===1?"":"s"} (${studentsByShift.matutino.length} matutino, ${studentsByShift.vespertino.length} vespertino).`);
    } catch (e) {
      setRelatorioMsg(`❌ Não consegui gerar o relatório: ${e?.message || e}`);
    }
    setRelatorioBusy(false);
    setTimeout(() => setRelatorioMsg(""), 9000);
  };
  const loadAutoBackups = async () => { setAutoBackupList(await getBackupList()); };
  const doAutoBackupNow = async () => {
    setAutoBackupBusy(true); setAutoBackupMsg("");
    const r = await triggerBackupNow(teacherAuth);
    setAutoBackupMsg(r.ok ? `✅ Backup feito agora (${r.keys} chaves salvas).` : `❌ Não consegui fazer o backup agora. Tente de novo.`);
    if (r.ok) await loadAutoBackups();
    setAutoBackupBusy(false);
    setTimeout(()=>setAutoBackupMsg(""), 6000);
  };
  const saveSchedule = async () => {
    const nm = { ...metaRef.current, schedule };
    metaRef.current = nm; setMeta(nm);
    await saveTeacherMeta(nm, teacherAuth);
    setScheduleMsg("✅ Horário salvo!");
    setTimeout(()=>setScheduleMsg(""), 4000);
  };
  const toggleClassDay = async (k) => {
    const has = metaRef.current.classDays.includes(k);
    const days = has ? metaRef.current.classDays.filter(d=>d!==k) : [...metaRef.current.classDays, k];
    const nm = { ...metaRef.current, classDays:days }; metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm, teacherAuth);
  };
  // fim de semana fecha por padrão (a turma só funciona seg-sex) — esse toggle libera sábado/domingo
  const toggleAllowWeekend = async () => {
    const nm = { ...metaRef.current, allowWeekend: !metaRef.current.allowWeekend };
    metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm, teacherAuth);
  };

  const doReset = async () => {
    const scope = resetScope; // "all" | "matutino" | "vespertino"
    setConfirmReset(false);
    setResetting(true);
    setResetMsg("");
    // "Todos os turnos" reseta só Matutino + Vespertino (a turma oficial de C#) — turma de teste e
    // sala de linguagens NUNCA são apagadas por esse botão, mesmo escolhendo "todos"
    const ok = scope === "all"
      ? (await Promise.all([resetAll("matutino", teacherAuth), resetAll("vespertino", teacherAuth)])).every(Boolean)
      : await resetAll(scope, teacherAuth);
    setSelected(null);
    await load();
    setResetting(false);
    const alvo = scope === "all" ? "Matutino e Vespertino foram resetados" : `Turma ${shiftMeta(scope).label} resetada`;
    setResetMsg(ok
      ? `✅ ${alvo}! Os alunos online desse grupo serão desconectados em alguns segundos.`
      : "⚠ Não foi possível resetar. O armazenamento só funciona no app publicado — teste pelo link publicado.");
    setTimeout(() => setResetMsg(""), 6000);
  };

  // gera um nome de conteúdo para a aula de hoje, para UM turno específico
  const computeContentName = async (shift) => {
    const tk = todayKey();
    const proCode = (proFilesByShift[shift]||[]).map(f => (f.code||"")).join("\n").trim();
    let source = "", origem = "";
    if (proCode.length > 5) {
      source = (proFilesByShift[shift]||[]).filter(f=>(f.code||"").trim()).map(f=>`// ${f.name}\n${f.code}`).join("\n\n");
      origem = "professor";
    } else {
      const base = students.filter(s => (s.shift||"sem-turno")===shift);
      const codes = base.filter(s => (s.code||"").trim().length > 5).map((s,i)=>`Aluno ${i+1}:\n${s.code}`).join("\n\n---\n\n");
      if (codes) { source = codes; origem = "alunos"; }
    }
    if (!source) throw new Error(`Programe o exemplo de ${shiftMeta(shift).label} na aba "Meu código" (ou espere os alunos dessa turma começarem a escrever).`);
    const ctx = origem === "professor"
      ? "Este é o código C# que o professor escreveu como exemplo na aula de hoje"
      : "Estes são os códigos C# que os alunos escreveram na aula de hoje";
    const out = await askClaude(
      `${ctx}:\n\n${source}\n\nANALISE o código com atenção antes de nomear: identifique quais conceitos aparecem de verdade (tipos usados, estruturas de controle, entrada/saída, métodos, o que o programa FAZ quando roda) e qual deles é o protagonista da aula.\n\nDepois, gere um NOME DE CONTEÚDO criativo e descritivo para esta aula, em português, que dê orgulho de aparecer no calendário do curso. Pode usar até 12 palavras — capriche: nada de nome genérico tipo "Aula de C#". Bons exemplos: "Variáveis e o primeiro diálogo com o usuário", "Tomando decisões: if, else e a nota da prova", "O jogo de adivinhação: while, Random e lógica de tentativas".\n\nResponda APENAS com o nome do conteúdo, sem aspas e sem ponto final.`,
      "Você é um professor criativo que nomeia conteúdos de aulas de C# para iniciantes. Analise o código de verdade e crie um nome específico e caprichado. Responda só com o nome."
    );
    const title = out.replace(/["\n`]/g,"").trim().slice(0,110);
    const nm = { ...metaRef.current, contentNames: withContentName(metaRef.current.contentNames, tk, shift, title) };
    metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm, teacherAuth);
    return { title, origem };
  };

  // usado nas abas "Meu código" e "Calendário" — sempre para o turno selecionado ali
  const generateContentName = async (shift) => {
    setGenName(true); setNameMsg("");
    try {
      const { title, origem } = await computeContentName(shift);
      setNameMsg(`✅ Conteúdo de hoje (${shiftMeta(shift).label}): ${title}${origem==="alunos"?" (gerado pelo código dos alunos)":""}`);
    } catch (e) { setNameMsg(e.message || "Não consegui gerar agora. Tente de novo em instantes."); }
    setGenName(false);
    setTimeout(()=>setNameMsg(""), 6000);
  };

  // usado no Monitoramento — respeita o filtro de turma (gera para os dois se "Todas" estiver selecionada)
  const generateContentNameFiltered = async () => {
    setGenName(true); setNameMsg("");
    const shifts = shiftFilter === "all" ? ["matutino","vespertino"] : [shiftFilter];
    const parts = [];
    for (const sh of shifts) {
      try { const { title } = await computeContentName(sh); parts.push(`${shiftMeta(sh).emoji} ${title}`); }
      catch { parts.push(`${shiftMeta(sh).emoji} não consegui gerar`); }
    }
    setNameMsg(`✅ ${parts.join(" · ")}`);
    setGenName(false);
    setTimeout(()=>setNameMsg(""), 7000);
  };

  // envia um aviso para um aluno específico aparecer na tela dele
  const nudgeStudent = async (s) => {
    const ok = await setNudge(s.shift, s.name, "👀 Preste atenção na aula! Volte para o seu código e continue a atividade de hoje.", teacherAuth);
    if (ok) { setNudged(n => ({ ...n, [s.name]: Date.now() })); setTimeout(()=>setNudged(n=>{ const c={...n}; delete c[s.name]; return c; }), 5000); }
  };

  // ── exporta notas e presenças em .xlsx DE VERDADE (zip+XML, ver src/xlsx.js) ──
  // segue o modelo do professor: ALUNO | DIAS PRESENTES | MAIOR NOTA | SITUAÇÃO | DESTAQUE,
  // agrupado por turno, com cabeçalho colorido e zebra — e sem o aviso de
  // "arquivo pode estar corrompido" que o formato antigo disparava no celular
  const exportCSV = () => {
    const rows = students
      .filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id)
      .sort((a,b)=>((a.shift||"")+a.name).localeCompare((b.shift||"")+b.name,"pt-BR"));
    const maiorNotaOf = (s) => {
      const notas = [...Object.values(s.scoreHistory||{}), s.score, s.examScore].filter(n => typeof n === "number");
      return notas.length ? Math.max(...notas) : null;
    };
    // quem tirou a maior nota entre TODOS os alunos (os dois turnos juntos) é o destaque da turma —
    // só 1 estrela na planilha inteira, não 1 por turno
    let melhorNotaGeral = null;
    rows.forEach(s => {
      const nota = maiorNotaOf(s);
      if (nota == null) return;
      if (melhorNotaGeral == null || nota > melhorNotaGeral) melhorNotaGeral = nota;
    });
    const groups = SHIFTS.map(sh => ({ ...sh, list: rows.filter(s => (s.shift||"sem-turno")===sh.id) })).filter(g => g.list.length > 0);

    // dias de aula (marcados no Calendário) — cada um vira uma coluna com presença/falta/justificado
    const classDays = [...new Set(meta.classDays || [])].sort();
    const dayCell = (s, d) => {
      const enrollFrom = s.createdAt ? dateKeyOf(s.createdAt) : (Object.keys(s.attendance||{}).sort()[0] || null);
      const lastDay = s.lastSeen ? dateKeyOf(s.lastSeen) : null;
      if ((enrollFrom && d < enrollFrom) || (lastDay && d > lastDay)) return { v:"–", st:null }; // fora do período do aluno
      if ((s.attendance||{})[d] === "present") return { v:"✓", st:"present" };
      const just = (s.justifications||{})[d];
      if (just && just.status === "approved") return { v:"J", st:"justified" };
      return { v:"✗", st:"absent" };
    };

    // NASCIMENTO e CPF só entram na planilha (nunca no perfil do aluno) — dados sensíveis pro professor
    // usar no certificado; a formatação de data e o "não sei" do CPF acontecem no cadastro do aluno
    const fmtBirth = (b) => { if (!b) return "—"; const [y,m,d] = String(b).split("-"); return (y&&m&&d) ? `${d}/${m}/${y}` : "—"; };
    const totalCols = 8 + classDays.length; // ALUNO + dias + DIAS PRESENTES + MAIOR NOTA + NOTA DA PROVA + SITUAÇÃO + DESTAQUE + NASCIMENTO + CPF
    const xlsRows = [];
    const merges = [];
    const wide = (st) => Array.from({ length: totalCols }, () => ({ v: "", st })); // linha inteira com o mesmo estilo (pra faixa colorida cobrir a planilha toda)
    const mergeRow = () => merges.push(`A${xlsRows.length}:${colLetter(totalCols-1)}${xlsRows.length}`);

    // título + subtítulo
    let cells = wide({ b:1, sz:15, color:"FFFFFF", fill:"1F2547" });
    cells[0].v = "AULA DE C# — ACOMPANHAMENTO DA TURMA";
    xlsRows.push({ cells, ht: 30 }); mergeRow();
    cells = wide({ i:1, sz:10, color:"C9CFEF", fill:"2E3560" });
    cells[0].v = `${meta.city ? meta.city + "  •  " : ""}gerado em ${new Date().toLocaleDateString("pt-BR")}${classDays.length ? `  •  ✓ presente · ✗ falta · J justificado · – fora do período do aluno` : ""}`;
    xlsRows.push({ cells }); mergeRow();
    xlsRows.push({ cells: [] });

    groups.forEach(g => {
      const bandSt = g.id === "matutino"
        ? { b:1, sz:12, color:"5C4400", fill:"FFE9A8", border:1 }
        : { b:1, sz:12, color:"232A6B", fill:"C9CDFF", border:1 };
      cells = wide(bandSt);
      cells[0].v = `${g.emoji} TURMA ${g.label.toUpperCase()} — ${g.list.length} aluno${g.list.length!==1?"s":""}`;
      xlsRows.push({ cells, ht: 22 }); mergeRow();

      const dayHeaders = classDays.map(d => { const [, m, dd] = d.split("-"); return `${dd}/${m}`; });
      xlsRows.push({ cells: ["ALUNO", ...dayHeaders, "DIAS PRESENTES","MAIOR NOTA","NOTA DA PROVA","SITUAÇÃO","DESTAQUE","NASCIMENTO","CPF"].map((h,i)=>({
        v: h, st: { b:1, sz: i>0&&i<=classDays.length?9:11, color:"FFFFFF", fill:"303869", border:1, align: i>0 ? "center" : "left" },
      })) });

      g.list.forEach((s, i) => {
        const att = Object.values(s.attendance||{}).filter(v=>v==="present").length;
        const maiorNota = maiorNotaOf(s);
        const isDestaque = maiorNota != null && maiorNota === melhorNotaGeral;
        const fill = isDestaque ? "FFF6D6" : (i % 2 ? "F5F6FB" : undefined);
        const situacao = maiorNota == null
          ? { v:"Sem nota ainda", st:{ color:"8A8FA8", fill, border:1, align:"center" } }
          : maiorNota >= 60
            ? { v:"✔ Satisfatório", st:{ b:1, color:"1E8E5A", fill, border:1, align:"center" } }
            : { v:"⚠ Insatisfatório", st:{ b:1, color:"C2410C", fill, border:1, align:"center" } };
        const dayCells = classDays.map(d => {
          const c = dayCell(s, d);
          const color = c.st==="present" ? "1E8E5A" : c.st==="absent" ? "C2410C" : c.st==="justified" ? "B45309" : "AAB0C8";
          return { v: c.v, st:{ b: c.st==="present"||c.st==="absent", color, fill, border:1, align:"center" } };
        });
        xlsRows.push({ cells: [
          { v: s.name, st:{ b:1, color:"1F2547", fill, border:1 } },
          ...dayCells,
          { v: att, st:{ fill, border:1, align:"center" } },
          { v: maiorNota ?? "—", st:{ b:1, sz:12, color:"303869", fill, border:1, align:"center" } },
          { v: s.examScore ?? "—", st:{ b:1, sz:12, color:"6b3fd1", fill, border:1, align:"center" } },
          situacao,
          { v: isDestaque ? "🌟 Aluno destaque (Manhã + Tarde)" : "", st:{ color:"8A6D1A", fill, border:1, align:"center" } },
          { v: fmtBirth(s.birthDate), st:{ color:"5A6183", fill, border:1, align:"center" } },
          { v: s.cpf || "—", st:{ color:"5A6183", fill, border:1, align:"center" } },
        ] });
      });

      const notas = g.list.map(maiorNotaOf).filter(n => n != null);
      const media = notas.length ? Math.round(notas.reduce((a,b)=>a+b,0)/notas.length) : null;
      cells = wide({ i:1, sz:9.5, color:"5A6183", fill:"EEF0FA", border:1 });
      cells[0].v = `Média da turma: ${media ?? "—"}  •  Situação calculada pela maior nota (linha de corte: 60)`;
      xlsRows.push({ cells }); mergeRow();
      xlsRows.push({ cells: [] });
    });

    const colWidths = [34, ...classDays.map(()=>6), 16, 12, 14, 18, 28, 14, 18];
    const blob = xlsxBlob({ sheetName:"Turma", colWidths, rows:xlsRows, merges });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `planilha-aula-csharp-${todayKey()}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  // ── PDF do curso: o código do PROFESSOR (o exemplo da turma) + explicações do Nyx ──
  // sem nome de aluno nenhum — é um material de estudo pra enviar pra todo mundo.
  // jsPDF é importado sob demanda (só quando o professor clica) pra não pesar o app dos alunos
  const exportPDF = async (scope = "all") => {
    setPdfGenerating(true);

    // junta o código do professor por turno (só turnos que têm código) — scope filtra pra só o
    // turno escolhido, pra dar pra mandar o PDF certo pro grupo certo em vez de sempre os dois juntos
    const shiftsWithCode = SHIFTS
      .filter(sh => scope === "all" || sh.id === scope)
      .map(sh => ({ ...sh, files: (proFilesByShift[sh.id]||[]).filter(f => (f.code||"").trim()) }))
      .filter(sh => sh.files.length > 0);
    if (shiftsWithCode.length === 0) {
      setPdfMsg('⚠ Programe o exemplo na aba "Meu código" primeiro — o PDF usa o código do professor, não o dos alunos.');
      setPdfGenerating(false);
      return;
    }

    setPdfMsg("🧠 O Nyx está escrevendo as explicações dos códigos...");
    // explicação de todos os códigos, pedida ao Nyx (um pedido por turno, em paralelo) — o código é
    // CUMULATIVO desde o início do curso (não reseta por dia), então não tem número fixo de seções:
    // cobre tudo que existir, por menor ou maior que seja, sem resumir demais
    let aiOffline = false;
    const explains = await Promise.all(shiftsWithCode.map(async (sh) => {
      const code = sh.files.map(f => `// ===== ${f.name} =====\n${f.code}`).join("\n\n");
      try {
        return await askClaudeJson(
          `Este é o código C# completo que o professor escreveu para a turma ${sh.label} ao longo de todo o curso até agora (pode ter vários arquivos e vários conceitos diferentes, de aulas diferentes):\n\`\`\`csharp\n${code}\n\`\`\`\n\nCrie uma explicação COMPLETA e didática desse código, para iniciantes que vão receber este material por escrito e estudar sozinhos. Percorra o código NA ORDEM em que ele aparece. NÃO resuma demais nem pule partes só porque parecem simples — se apareceu no código, precisa ter uma seção explicando.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "intro": "1 a 2 frases dizendo o que esse código faz como um todo",\n  "secoes": [ { "titulo": "nome curto do conceito/parte", "explicacao": "explicação clara de 2 a 4 frases, em português simples", "exemplo": "trecho C# bem curto ilustrando (opcional — use \\n pra quebrar linha)" } ],\n  "dica": "1 frase final incentivando o estudo"\n}\n\nNão tem número fixo de seções: crie quantas forem necessárias pra cobrir TODOS os conceitos e partes importantes de verdade, mesmo que passe de 10. Garanta JSON válido.`,
          "Você é um professor de C# paciente escrevendo um material de estudo completo por escrito para iniciantes — cobre tudo que foi visto, sem cortar conteúdo pra deixar o material curto. Português correto e simples. Responda APENAS JSON puro válido.",
          { max_tokens: 6000 }
        );
      } catch { aiOffline = true; return null; }
    }));

    setPdfMsg("📄 Montando o PDF...");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      const maxW = pageW - margin * 2;
      let y = margin;

      const hexRgb = (hex) => {
        const h = hex.replace("#", "");
        const n = parseInt(h.length === 3 ? h.split("").map(c=>c+c).join("") : h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      };
      // as fontes padrão do PDF não têm emoji — remove pra não virar caractere quebrado
      const clean = (t) => String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️]/gu, "").replace(/\s+/g, " ").trim();
      const ensureSpace = (needed) => { if (y + needed > pageH - margin - 16) { doc.addPage(); y = margin; } };
      const writeParagraph = (text, opts = {}) => {
        const { size = 10.5, font = "helvetica", style = "normal", color = "#2a2f45", lineGap = 4.5, x = margin, width = maxW } = opts;
        doc.setFont(font, style); doc.setFontSize(size); doc.setTextColor(...hexRgb(color));
        doc.splitTextToSize(String(text || " "), width).forEach(line => {
          ensureSpace(size + lineGap);
          doc.text(line, x, y);
          y += size + lineGap;
        });
      };
      // bloco de código com fundo cinza-azulado, quebrado em pedaços quando não cabe na página
      const writeCodeBlock = (codeText) => {
        doc.setFont("courier", "normal"); doc.setFontSize(8.5);
        const lines = codeText.split("\n").flatMap(l => doc.splitTextToSize(l.length ? l : " ", maxW - 24));
        const lh = 11.5;
        let i = 0;
        while (i < lines.length) {
          ensureSpace(lh * 2 + 16);
          const fit = Math.max(1, Math.floor((pageH - margin - 16 - y - 16) / lh));
          const chunk = lines.slice(i, i + fit);
          const h = chunk.length * lh + 14;
          doc.setFillColor(...hexRgb("#f2f4fc")); doc.setDrawColor(...hexRgb("#d8dcf0"));
          doc.roundedRect(margin, y - 4, maxW, h, 5, 5, "FD");
          doc.setFont("courier", "normal"); doc.setFontSize(8.5); doc.setTextColor(...hexRgb("#33395c"));
          chunk.forEach((ln, j) => doc.text(ln, margin + 12, y + 10 + j * lh));
          y += h + 8;
          i += fit;
        }
      };

      // ── CAPA ──
      doc.setFillColor(...hexRgb("#1d1230")); doc.rect(0, 0, pageW, pageH, "F");
      doc.setFillColor(...hexRgb("#2a1a42"));
      doc.circle(pageW - 60, 90, 130, "F");
      doc.circle(40, pageH - 80, 100, "F");
      doc.setFillColor(...hexRgb("#fbbf24")); doc.roundedRect(margin, 240, 64, 7, 3, 3, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(38); doc.setTextColor(255, 255, 255);
      doc.text("Aula de C#", margin, 292);
      doc.setFont("helvetica", "normal"); doc.setFontSize(16); doc.setTextColor(...hexRgb("#c4b2e2"));
      doc.text("Códigos do curso e explicações do Nyx", margin, 318);
      doc.setFontSize(11.5); doc.setTextColor(...hexRgb("#927fb8"));
      const dataBr = new Date().toLocaleDateString("pt-BR");
      doc.text(clean(`${meta.city ? meta.city + "  •  " : ""}Gerado em ${dataBr}`), margin, 344);
      doc.setFont("courier", "normal"); doc.setFontSize(10); doc.setTextColor(...hexRgb("#5e4a86"));
      doc.text('Console.WriteLine("Bons estudos!");', margin, pageH - 70);

      // ── CONTEÚDO (um capítulo por turno) ──
      shiftsWithCode.forEach((sh, idx) => {
        const accent = sh.id === "matutino" ? "#f59e0b" : "#c084fc";
        doc.addPage(); y = margin;

        // faixa do turno
        doc.setFillColor(...hexRgb(accent));
        doc.roundedRect(margin, y - 6, maxW, 40, 8, 8, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
        doc.text(clean(`Turma ${sh.label}`).toUpperCase(), margin + 16, y + 19);
        y += 58;

        const exp = explains[idx];
        writeParagraph("O que este código ensina", { size: 14, style: "bold", color: "#1f2547" });
        y += 2;
        if (exp && Array.isArray(exp.secoes) && exp.secoes.length) {
          if (exp.intro) { writeParagraph(clean(exp.intro), { size: 11, color: "#4a5170" }); y += 6; }
          exp.secoes.forEach((sec, i) => {
            ensureSpace(40);
            // marcador numerado no lugar de emoji (fonte do PDF não tem emoji)
            doc.setFillColor(...hexRgb(accent));
            doc.roundedRect(margin, y - 10, 18, 18, 5, 5, "F");
            doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
            doc.text(String(i + 1), margin + 9, y + 3, { align: "center" });
            writeParagraph(clean(sec.titulo), { size: 12, style: "bold", color: "#1f2547", x: margin + 26, width: maxW - 26 });
            if (sec.explicacao) writeParagraph(clean(sec.explicacao), { size: 10.5, x: margin + 26, width: maxW - 26 });
            if (sec.exemplo && String(sec.exemplo).trim()) writeParagraph(String(sec.exemplo).replace(/\r/g, ""), { size: 9, font: "courier", color: "#5b3fd1", x: margin + 26, width: maxW - 26 });
            y += 8;
          });
          if (exp.dica) {
            ensureSpace(30);
            doc.setFillColor(...hexRgb("#fff7e0")); doc.setDrawColor(...hexRgb("#f0d896"));
            const dicaLines = doc.splitTextToSize("Dica:  " + clean(exp.dica), maxW - 24);
            const dh = dicaLines.length * 14 + 14;
            doc.roundedRect(margin, y - 4, maxW, dh, 6, 6, "FD");
            doc.setFont("helvetica", "italic"); doc.setFontSize(10.5); doc.setTextColor(...hexRgb("#8a6d1a"));
            dicaLines.forEach((ln, j) => doc.text(ln, margin + 12, y + 12 + j * 14));
            y += dh + 10;
          }
        } else {
          writeParagraph("As explicações automáticas não puderam ser geradas agora (Nyx offline). O código completo está logo abaixo.", { size: 10.5, style: "italic", color: "#8a8fa8" });
          y += 6;
        }

        y += 8;
        writeParagraph("Código completo", { size: 14, style: "bold", color: "#1f2547" });
        y += 4;
        sh.files.forEach(f => {
          ensureSpace(34);
          doc.setFillColor(...hexRgb("#1f2547"));
          doc.roundedRect(margin, y - 4, maxW, 22, 5, 5, "F");
          doc.setFont("courier", "bold"); doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
          doc.text(clean(f.name), margin + 12, y + 10);
          y += 26;
          writeCodeBlock(f.code.replace(/\r/g, ""));
          y += 4;
        });
      });

      // ── rodapé com numeração (pula a capa) ──
      const total = doc.getNumberOfPages();
      for (let p = 2; p <= total; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...hexRgb("#9aa1c2"));
        doc.text("Aula de C#  •  material do curso", margin, pageH - 24);
        doc.text(`${p - 1} / ${total - 1}`, pageW - margin, pageH - 24, { align: "right" });
      }

      doc.save(`codigos-do-curso-${scope}-${todayKey()}.pdf`);
      setPdfMsg(aiOffline ? "✅ PDF gerado (sem as explicações — o Nyx estava offline)." : "✅ PDF gerado!");
    } catch {
      setPdfMsg("❌ Não consegui gerar o PDF agora. Tente de novo.");
    }
    setPdfGenerating(false);
  };

  // ── 📄 PDF do dia: um resumo curto do código de HOJE (aba "Meu código" do turno do aluno) +
  // explicação do Nyx, pronto pra enviar de volta pra um aluno que vai faltar não ficar pra trás ──
  const exportDailyPDF = async (shift, studentName, code) => {
    setDailyPdfBusy(true);
    setDailyPdfMsg("");
    if (!String(code || "").trim()) {
      setDailyPdfMsg("⚠ Escreva o código de hoje antes de gerar.");
      setDailyPdfBusy(false);
      return;
    }
    let explain = null, aiOffline = false;
    try {
      explain = await askClaudeJson(
        `Este é o código C# que o professor ensinou HOJE para a turma ${shiftMeta(shift).label} (pode ter vários arquivos):\n\`\`\`csharp\n${code}\n\`\`\`\n\nCrie uma explicação COMPLETA e didática desse código, para um aluno que FALTOU hoje e vai estudar esse material sozinho em casa. Percorra o código NA ORDEM em que ele aparece, cobrindo TODOS os conceitos importantes do dia — não pode faltar nenhum.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "intro": "1 a 2 frases dizendo o que foi ensinado hoje como um todo",\n  "secoes": [ { "titulo": "nome curto do conceito/parte", "explicacao": "explicação clara de 2 a 4 frases, em português simples", "exemplo": "trecho C# bem curto ilustrando (opcional — use \\n pra quebrar linha)" } ],\n  "dica": "1 frase final encorajando o aluno a estudar em casa e perguntar na próxima aula se tiver dúvida"\n}\n\nFaça uma seção para CADA parte ou conceito importante do código (pode passar de 8 se o dia teve bastante conteúdo — não corte nada pra economizar espaço). Garanta JSON válido.`,
        "Você é um professor de C# escrevendo, com carinho, um resumo por escrito para um aluno que faltou não ficar pra trás. Português correto e simples. Responda APENAS JSON puro válido.",
        { max_tokens: 4000 }
      );
    } catch { aiOffline = true; }

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      const maxW = pageW - margin * 2;
      let y = margin;
      const hexRgb = (hex) => {
        const h = hex.replace("#", "");
        const n = parseInt(h.length === 3 ? h.split("").map(c=>c+c).join("") : h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      };
      const clean = (t) => String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️]/gu, "").replace(/\s+/g, " ").trim();
      const ensureSpace = (needed) => { if (y + needed > pageH - margin - 16) { doc.addPage(); y = margin; } };
      const writeParagraph = (text, opts = {}) => {
        const { size = 10.5, font = "helvetica", style = "normal", color = "#2a2f45", lineGap = 4.5, x = margin, width = maxW } = opts;
        doc.setFont(font, style); doc.setFontSize(size); doc.setTextColor(...hexRgb(color));
        doc.splitTextToSize(String(text || " "), width).forEach(line => {
          ensureSpace(size + lineGap);
          doc.text(line, x, y);
          y += size + lineGap;
        });
      };
      const writeCodeBlock = (codeText) => {
        doc.setFont("courier", "normal"); doc.setFontSize(8.5);
        const lines = codeText.split("\n").flatMap(l => doc.splitTextToSize(l.length ? l : " ", maxW - 24));
        const lh = 11.5;
        let i = 0;
        while (i < lines.length) {
          ensureSpace(lh * 2 + 16);
          const fit = Math.max(1, Math.floor((pageH - margin - 16 - y - 16) / lh));
          const chunk = lines.slice(i, i + fit);
          const h = chunk.length * lh + 14;
          doc.setFillColor(...hexRgb("#f2f4fc")); doc.setDrawColor(...hexRgb("#d8dcf0"));
          doc.roundedRect(margin, y - 4, maxW, h, 5, 5, "FD");
          doc.setFont("courier", "normal"); doc.setFontSize(8.5); doc.setTextColor(...hexRgb("#33395c"));
          chunk.forEach((ln, j) => doc.text(ln, margin + 12, y + 10 + j * lh));
          y += h + 8;
          i += fit;
        }
      };

      // ── cabeçalho ──
      const accent = shift === "matutino" ? "#f59e0b" : "#c084fc";
      doc.setFillColor(...hexRgb(accent)); doc.roundedRect(margin, y - 8, maxW, 56, 10, 10, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(255, 255, 255);
      doc.text(clean(`Resumo da aula de hoje — para ${studentName}`), margin + 16, y + 16);
      const dataBr = new Date().toLocaleDateString("pt-BR");
      const contentName = contentFor(shift);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(255, 255, 255);
      doc.text(clean(`${dataBr} • Turma ${shiftMeta(shift).label}${contentName ? " • " + contentName : ""}`), margin + 16, y + 35);
      y += 74;

      writeParagraph("Oi! Você faltou hoje, mas aqui está tudo o que a turma viu — dá uma olhada com calma e, se ficar com alguma dúvida, é só perguntar na próxima aula. 💜", { size: 11, style: "italic", color: "#4a5170" });
      y += 8;

      if (explain && Array.isArray(explain.secoes) && explain.secoes.length) {
        if (explain.intro) { writeParagraph(clean(explain.intro), { size: 11.5, style: "bold", color: "#1f2547" }); y += 6; }
        explain.secoes.forEach((sec, i) => {
          ensureSpace(40);
          doc.setFillColor(...hexRgb(accent));
          doc.roundedRect(margin, y - 10, 18, 18, 5, 5, "F");
          doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
          doc.text(String(i + 1), margin + 9, y + 3, { align: "center" });
          writeParagraph(clean(sec.titulo), { size: 12, style: "bold", color: "#1f2547", x: margin + 26, width: maxW - 26 });
          if (sec.explicacao) writeParagraph(clean(sec.explicacao), { size: 10.5, x: margin + 26, width: maxW - 26 });
          if (sec.exemplo && String(sec.exemplo).trim()) writeParagraph(String(sec.exemplo).replace(/\r/g, ""), { size: 9, font: "courier", color: "#5b3fd1", x: margin + 26, width: maxW - 26 });
          y += 8;
        });
        if (explain.dica) {
          ensureSpace(30);
          doc.setFillColor(...hexRgb("#fff7e0")); doc.setDrawColor(...hexRgb("#f0d896"));
          const dicaLines = doc.splitTextToSize("Dica:  " + clean(explain.dica), maxW - 24);
          const dh = dicaLines.length * 14 + 14;
          doc.roundedRect(margin, y - 4, maxW, dh, 6, 6, "FD");
          doc.setFont("helvetica", "italic"); doc.setFontSize(10.5); doc.setTextColor(...hexRgb("#8a6d1a"));
          dicaLines.forEach((ln, j) => doc.text(ln, margin + 12, y + 12 + j * 14));
          y += dh + 10;
        }
      } else {
        writeParagraph("A explicação automática não pôde ser gerada agora (Nyx offline). O código completo está logo abaixo.", { size: 10.5, style: "italic", color: "#8a8fa8" });
        y += 6;
      }

      y += 6;
      writeParagraph("Código completo de hoje", { size: 13, style: "bold", color: "#1f2547" });
      y += 4;
      // separa o código por arquivo (marcadores "// ===== Nome.cs =====" do pré-preenchimento)
      // pra escrever o nome de cada arquivo numa faixa própria acima do bloco dele
      const fileParts = [];
      let curPart = null;
      String(code).replace(/\r/g, "").split("\n").forEach(line => {
        const m = line.match(/^\/\/\s*=====\s*(.+?)\s*=====\s*$/);
        if (m) { curPart = { name: m[1], lines: [] }; fileParts.push(curPart); }
        else { if (!curPart) { curPart = { name: null, lines: [] }; fileParts.push(curPart); } curPart.lines.push(line); }
      });
      fileParts.forEach(fp => {
        const codeText = fp.lines.join("\n").replace(/^\n+|\n+$/g, "");
        if (!codeText.trim()) return;
        if (fp.name) {
          ensureSpace(34);
          doc.setFillColor(...hexRgb("#1f2547"));
          doc.roundedRect(margin, y - 4, maxW, 22, 5, 5, "F");
          doc.setFont("courier", "bold"); doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
          doc.text(clean(fp.name), margin + 12, y + 10);
          y += 26;
        }
        writeCodeBlock(codeText);
        y += 4;
      });

      const total = doc.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...hexRgb("#9aa1c2"));
        doc.text("Aula de C#  •  resumo do dia", margin, pageH - 24);
        doc.text(`${p} / ${total}`, pageW - margin, pageH - 24, { align: "right" });
      }

      doc.save(`resumo-hoje-${String(studentName).replace(/[^a-zA-Z0-9]+/g, "-")}-${todayKey()}.pdf`);
      setDailyPdfMsg(aiOffline ? "✅ PDF gerado (sem a explicação — o Nyx estava offline)." : "✅ PDF gerado!");
    } catch {
      setDailyPdfMsg("❌ Não consegui gerar o PDF agora. Tente de novo.");
    }
    setDailyPdfBusy(false);
  };

  // ── 💌 boletim pros responsáveis: UM PDF com uma página por aluno do turno, em linguagem
  // simples pra família — presenças, o que aprendeu (sem termo técnico), conquistas e recado do Nyx ──
  // scope: "all" (todos os alunos dos dois turnos) | id de turno ("matutino"/"vespertino") | um
  // objeto aluno único (gerado direto do painel de Gerenciar aluno) — os três casos viram 1 PDF
  const exportBoletins = async (scope) => {
    setBoletimBusy(true); setBoletimMsg("");
    const isSingleStudent = scope && typeof scope === "object";
    const turma = isSingleStudent
      ? [scope]
      : students
          .filter(s => (s.name||"").trim() && (scope === "all" ? SHIFTS.some(sh=>sh.id===(s.shift||"")) : (s.shift||"") === scope))
          .sort((a,b)=>((a.shift||"")+a.name).localeCompare((b.shift||"")+b.name,"pt-BR"));
    if (!turma.length) { setBoletimMsg("⚠ Nenhum aluno nessa turma ainda."); setBoletimBusy(false); return; }
    const classDays = [...new Set(meta.classDays || [])].sort();

    // "Todos" pode misturar Manhã e Tarde — o conteúdo do mês é por turno, então gera "o que
    // aprendeu" 1 vez PARA CADA turno que aparece na lista, e cada aluno usa o do seu próprio turno
    const turnosPresentes = [...new Set(turma.map(s => s.shift))].filter(sh => SHIFTS.some(x=>x.id===sh));
    setBoletimMsg(turma.length > 1 ? "🧠 O Nyx está escrevendo a parte 'o que seu filho aprendeu'..." : "🧠 O Nyx está escrevendo o boletim...");
    const aprendeuPorTurno = {};
    await Promise.all((turnosPresentes.length ? turnosPresentes : [turma[0].shift]).map(async (sh) => {
      const conteudos = [...new Set(Object.values(meta.contentNames || {}).map(v => contentNameFor(v, sh)).filter(Boolean))];
      let aprendeu = null;
      if (conteudos.length) {
        try {
          const r = await askClaudeJson(
            `Numa carreta-escola itinerante, adolescentes tiveram aulas de programação C# este mês. Os conteúdos foram:\n${conteudos.map(c=>`- ${c}`).join("\n")}\n\nEscreva de 3 a 5 frases curtas explicando O QUE os alunos aprenderam, para os PAIS/RESPONSÁVEIS lerem — pessoas que não sabem nada de programação. Zero termo técnico sem explicar; foco no que o aluno agora sabe FAZER e por que isso é valioso.\n\nResponda APENAS JSON puro: { "frases": ["...", "..."] }`,
            "Você escreve boletins escolares carinhosos e claros para famílias. Português simples e correto. Responda APENAS JSON puro válido."
          );
          if (Array.isArray(r?.frases) && r.frases.length) aprendeu = r.frases.map(f => String(f));
        } catch {}
      }
      aprendeuPorTurno[sh] = aprendeu || (conteudos.length ? conteudos.map(c => `Estudou: ${c}.`) : ["Participou das aulas de introdução à programação em C#, dando os primeiros passos no mundo da tecnologia."]);
    }));

    setBoletimMsg(turma.length > 1 ? "📄 Montando os boletins..." : "📄 Montando o boletim...");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      const maxW = pageW - margin * 2;
      const hexRgb = (hex) => { const h = hex.replace("#",""); const n = parseInt(h.length===3?h.split("").map(c=>c+c).join(""):h,16); return [(n>>16)&255,(n>>8)&255,n&255]; };
      const clean = (t) => String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️]/gu, "").replace(/\s+/g, " ").trim();
      const mesBr = new Date().toLocaleDateString("pt-BR", { month:"long", year:"numeric" });

      turma.forEach((s, idx) => {
        if (idx > 0) doc.addPage();
        let y = margin;
        const accent = s.shift === "matutino" ? "#f59e0b" : "#c084fc";
        const aprendeu = aprendeuPorTurno[s.shift] || aprendeuPorTurno[turnosPresentes[0]] || ["Participou das aulas de introdução à programação em C#."];
        // cabeçalho
        doc.setFillColor(...hexRgb(accent)); doc.roundedRect(margin, y - 8, maxW, 64, 10, 10, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(255,255,255);
        doc.text("Boletim da Aula de C#", margin + 16, y + 16);
        doc.setFont("helvetica", "normal"); doc.setFontSize(11);
        doc.text(clean(`${s.name}  •  ${meta.city ? meta.city + "  •  " : ""}${mesBr}`), margin + 16, y + 38);
        y += 84;
        const writeP = (text, opts = {}) => {
          const { size = 11, style = "normal", color = "#2a2f45", x = margin, width = maxW, gap = 5 } = opts;
          doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...hexRgb(color));
          doc.splitTextToSize(String(text || " "), width).forEach(line => { doc.text(line, x, y); y += size + gap; });
        };
        writeP("Olá, família! Este é um resumo carinhoso do mês do seu filho (ou filha) na carreta da Aula de C#.", { size: 10.5, style:"italic", color:"#4a5170" });
        y += 8;

        // presença
        const enrollFrom = s.createdAt ? dateKeyOf(s.createdAt) : (Object.keys(s.attendance||{}).sort()[0] || null);
        // só dias já passados contam (o dia de HOJE só entra se o aluno já esteve presente —
        // senão uma aula ainda em andamento viraria "falta" injusta no boletim)
        const myDays = classDays.filter(d => (!enrollFrom || d >= enrollFrom) && (d < todayKey() || (s.attendance||{})[d] === "present"));
        const presentes = myDays.filter(d => (s.attendance||{})[d] === "present").length;
        const justificadas = myDays.filter(d => (s.attendance||{})[d] !== "present" && (s.justifications||{})[d]?.status === "approved").length;
        const faltas = Math.max(0, myDays.length - presentes - justificadas);
        writeP("Presença", { size: 13, style:"bold", color:"#1f2547" });
        writeP(myDays.length
          ? `Esteve presente em ${presentes} de ${myDays.length} dia${myDays.length===1?"":"s"} de aula${justificadas ? ` (${justificadas} falta${justificadas===1?"":"s"} justificada${justificadas===1?"":"s"})` : ""}${faltas ? ` e teve ${faltas} falta${faltas===1?"":"s"}` : ""}.`
          : "As presenças deste mês ainda estão sendo registradas.");
        y += 8;

        // o que aprendeu (compartilhado da turma, escrito pra leigos)
        writeP("O que aprendeu este mês", { size: 13, style:"bold", color:"#1f2547" });
        aprendeu.forEach(f => {
          doc.setFillColor(...hexRgb(accent)); doc.circle(margin + 4, y - 3.5, 2.5, "F");
          writeP(clean(f), { x: margin + 14, width: maxW - 14 });
        });
        y += 8;

        // conquistas e números
        const conquistas = (s.achievements || []).map(id => achievementInfo(id)).filter(Boolean);
        const destaque = conquistas.filter(a => !a.secret).slice(0, 3).map(a => a.label);
        const linhas = (s.files || []).reduce((n,f) => n + (f.code ? f.code.split("\n").filter(l=>l.trim()).length : 0), 0);
        const melhorNota = Object.values(s.scoreHistory || {}).reduce((b,v) => (v!=null && (b==null||v>b)) ? v : b, null);
        writeP("Números do mês", { size: 13, style:"bold", color:"#1f2547" });
        writeP(`Escreveu ${linhas} linha${linhas===1?"":"s"} de código de verdade${melhorNota!=null ? `, e a melhor nota nas atividades foi ${melhorNota}` : ""}.${conquistas.length ? ` Desbloqueou ${conquistas.length} medalha${conquistas.length===1?"":"s"} na plataforma${destaque.length ? ` — destaque pra: ${destaque.join(", ")}` : ""}.` : ""}`);
        y += 8;

        // recado do Nyx (robô-tutor) — escolhido pelos números, sem depender de IA
        const recado =
          presentes >= 5 && melhorNota != null && melhorNota >= 70 ? "Que mês! Presença firme e notas ótimas. Programar já está virando coisa natural — continuem incentivando em casa, porque tem futuro aqui." :
          linhas >= 100 ? "Esse aluno escreveu MUITO código este mês. A prática é o que forma programadores de verdade — estou orgulhoso!" :
          presentes >= 3 ? "Foi uma alegria ter esse aluno na carreta. Cada aula foi um passo — e os passos já estão virando caminhada. Até a próxima!" :
          "Todo começo é um mundo novo, e o primeiro passo já foi dado. Espero ver essa evolução continuar — as portas da programação estão abertas!";
        doc.setFillColor(...hexRgb("#f2f4fc")); doc.setDrawColor(...hexRgb("#d8dcf0"));
        const recadoLines = doc.splitTextToSize(`Recado do Nyx (o robô-tutor da turma):  ${recado}`, maxW - 24);
        const rh = recadoLines.length * 15 + 16;
        doc.roundedRect(margin, y - 4, maxW, rh, 8, 8, "FD");
        doc.setFont("helvetica", "italic"); doc.setFontSize(10.5); doc.setTextColor(...hexRgb("#4a5170"));
        recadoLines.forEach((ln, j) => doc.text(ln, margin + 12, y + 13 + j * 15));
        y += rh + 12;

        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...hexRgb("#9aa1c2"));
        doc.text("Aula de C#  •  boletim para a família", margin, pageH - 24);
        doc.text(`${idx + 1} / ${turma.length}`, pageW - margin, pageH - 24, { align:"right" });
      });

      if (isSingleStudent) {
        const slug = (turma[0].name||"aluno").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
        doc.save(`boletim-${slug}-${todayKey()}.pdf`);
        setBoletimMsg(`✅ Boletim de ${turma[0].name} gerado!`);
      } else {
        doc.save(`boletins-${scope}-${todayKey()}.pdf`);
        setBoletimMsg(`✅ Boletins gerados (${turma.length} aluno${turma.length===1?"":"s"}, uma página cada).`);
      }
    } catch {
      setBoletimMsg("❌ Não consegui gerar os boletins agora. Tente de novo.");
    }
    setBoletimBusy(false);
  };

  // ── gestão de alunos: renomear, mover de turno, corrigir nota, excluir ──
  // toast em vez de mensagem fixa: aparece na hora, não importa onde na tela a ação foi disparada
  const flashMgmt = (msg) => {
    if (!msg) return;
    if (msg.startsWith("❌")) toast.error(msg.replace(/^❌\s*/, ""));
    else toast.success(msg.replace(/^✅\s*/, ""));
  };

  const doRenameStudent = async (s) => {
    const newName = renameVal.trim();
    if (!s || !newName || newName === s.name) return;
    if (students.some(x => x.name === newName && (x.shift||"sem-turno") === (s.shift||"sem-turno"))) { flashMgmt("❌ Já existe um aluno com esse nome nessa turma."); return; }
    const saved = await saveStudent(s.shift, newName, { ...s, name: newName });
    if (!saved) { flashMgmt("❌ Não consegui salvar o novo nome agora (conexão?). Tente de novo."); return; }
    const deleted = await deleteStudentProfile(s.shift, s.name, teacherAuth);
    await setKick(s.shift, s.name, teacherAuth); // se estiver online, a sessão antiga sai (ele entra de novo com o nome novo)
    setSelected(`${s.shift||"sem-turno"}::${newName}`); setRenameVal("");
    flashMgmt(deleted
      ? `✅ Renomeado para ${newName}. Se estiver online, ele vai precisar entrar de novo.`
      : `⚠️ Renomeado para ${newName}, mas não consegui apagar o registro antigo (ficou uma cópia com o nome "${s.name}" — pode excluir ela na mesma turma).`);
    load();
  };

  const doMoveStudent = async (s, newShift) => {
    if (!s || !newShift || newShift === (s.shift||"sem-turno")) return;
    const saved = await saveStudent(newShift, s.name, { ...s, shift: newShift });
    if (!saved) { flashMgmt("❌ Não consegui mover agora (conexão?). Tente de novo."); return; }
    const deleted = await deleteStudentProfile(s.shift, s.name, teacherAuth);
    await setKick(s.shift, s.name, teacherAuth);
    flashMgmt(deleted
      ? `✅ Movido para ${shiftLabel(newShift)}. Se estiver online, ele vai precisar entrar de novo.`
      : `⚠️ Movido para ${shiftLabel(newShift)}, mas não consegui apagar a cópia antiga em ${shiftLabel(s.shift||"sem-turno")} (fica um card duplicado lá — pode excluir ele por lá).`);
    load();
  };

  // ✅ presença manual: pra dia sem computador (filme, passeio...) — o professor marca a presença
  // de hoje na mão. Vira "present" normal na chamada e na planilha, e NUNCA conta como atrasado
  // (o atraso só é calculado pelo 1º acesso do aluno, que nem existe quando ele não loga).
  const markPresentToday = async (s) => {
    const ok = await patchStudent(s.shift, s.name, { attendance: { ...(s.attendance||{}), [tk]: "present" } });
    flashMgmt(ok ? `✅ Presença de hoje marcada pra ${s.name}.` : "❌ Não consegui marcar agora. Tente de novo.");
    load();
  };
  const unmarkPresentToday = async (s) => {
    const att = { ...(s.attendance||{}) };
    delete att[tk];
    const ok = await patchStudent(s.shift, s.name, { attendance: att });
    flashMgmt(ok ? `↩️ Presença manual de ${s.name} desfeita.` : "❌ Não consegui desfazer agora. Tente de novo.");
    load();
  };

  // 🎁 retrospectiva do mês: liga/desliga por turno (fica no teachermeta, que os alunos já leem)
  const toggleRetro = async (sh) => {
    const cur = metaRef.current.retro || {};
    const next = { ...cur, [sh]: cur[sh] ? null : todayKey() };
    const nm = { ...metaRef.current, retro: next };
    metaRef.current = nm; setMeta(nm);
    await saveTeacherMeta(nm, teacherAuth);
  };

  const doSetScore = async (s) => {
    const v = parseInt(scoreVal, 10);
    if (!s || isNaN(v)) return;
    const nv = Math.max(0, Math.min(100, v));
    await patchStudent(s.shift, s.name, { score: nv });
    await setScoreFix(s.shift, s.name, nv, teacherAuth); // se estiver online, a sessão dele aplica na hora
    setScoreVal("");
    flashMgmt(`✅ Nota da atividade alterada para ${nv}.`);
    load();
  };

  const doDeleteStudent = async (s) => {
    if (!s) return;
    const deleted = await deleteStudentProfile(s.shift, s.name, teacherAuth);
    await setKick(s.shift, s.name, teacherAuth);
    setSelected(null); setConfirmDelete(false);
    flashMgmt(deleted ? "" : "❌ Não consegui excluir agora (conexão?). Tente de novo.");
    load();
  };

  // envia TODOS os arquivos do código da turma (aba "Meu código") pro aluno selecionado — ele recebe na hora
  const doSendClassCode = async (s) => {
    if (!s) return;
    const files = proFilesByShift[s.shift] || proFilesByShift[codeShift] || [];
    if (!files.some(f => (f.code||"").trim())) { flashMgmt("❌ Escreva o código na aba Meu código antes de enviar."); return; }
    const ok = await setCodeSend(s.shift, s.name, files, teacherAuth);
    flashMgmt(ok ? `✅ Código da turma enviado para ${s.name}!` : "❌ Não consegui enviar agora. Tente de novo.");
  };


  const startExam = async () => {
    const examShifts = shiftFilter === "all" ? ["matutino","vespertino"] : [shiftFilter];
    const proCode = examShifts.flatMap(sh => proFilesByShift[sh]||[]).map(f => (f.code||"")).join("\n").trim();
    const examStudents = shiftFilter === "all" ? students : students.filter(s=>(s.shift||"sem-turno")===shiftFilter);
    // pega o código de TODOS os arquivos que cada aluno escreveu ao longo da aula (não só um trecho) —
    // o teto é bem mais generoso que o de outras chamadas porque aqui é o CONTEXTO de entrada (não a
    // resposta), e o resumo da prova precisa enxergar o código de todo mundo, não só uma amostra
    const studentCodes = examStudents
      .map(s => (Array.isArray(s.files) && s.files.length) ? s.files.map(f=>f.code||"").join("\n") : (s.code||""))
      .filter(c => c.trim().length > 5)
      .join("\n\n")
      .slice(0, 30000);
    const codeCtx = [proCode, studentCodes].filter(Boolean).join("\n\n");
    if (!codeCtx) { setExamMsg(`Escreva o código de exemplo na aba Meu código (turma ${shiftFilter==="all"?"Manhã ou Tarde":shiftMeta(shiftFilter).label}) primeiro!`); return; }
    setExamGenerating(true); setExamMsg("Gerando resumo...");
    try {
      const summaryResult = await askClaude(
        `Aqui está o código C# que a turma inteira escreveu ao longo de TODA a aula de hoje (exemplo do professor e o código de cada aluno, do começo ao fim):\n\`\`\`csharp\n${codeCtx}\n\`\`\`\n\nCrie um RESUMO DE REVISÃO completo e bem elaborado, cobrindo TODOS os conceitos, palavras-chave e estruturas que aparecem nesse código inteiro (não resuma demais nem pule partes só porque parecem simples — se apareceu no código de algum aluno, deve entrar no resumo). Não tem número fixo de tópicos: crie quantos forem necessários pra cobrir de verdade tudo que foi visto, mesmo que passe de 15-20.\n\nPara cada tópico use: emoji + nome do conceito + explicação clara de 2 a 4 frases (contexto de quando/por que se usa, não só uma definição seca) + um exemplo curto tirado do próprio código da turma sempre que possível. Organize os tópicos numa ordem que faça sentido para estudar (do mais básico ao mais avançado). Português simples, direto ao ponto. Sem markdown pesado, use • para cada tópico.`,
        "Você cria resumos de revisão de C# para alunos iniciantes, sendo completo e detalhado — cobre tudo que foi visto, sem cortar conteúdo pra deixar o resumo curto. Português simples.",
        { max_tokens: 4000 }
      );
      setExamMsg("Gerando questões...");
      // 28-32 questões em JSON é a maior resposta pedida em todo o app — precisa de um teto de
      // tokens bem mais alto que o padrão (2000), senão a resposta corta no meio e o parse quebra
      // (era exatamente isso que fazia a criação da prova falhar silenciosamente)
      const parsed = await askClaudeJson(
        `Aqui está o código C# que os PRÓPRIOS ALUNOS escreveram ao longo de TODA a aula de hoje, junto com o exemplo do professor (mas o foco principal são os trechos que os alunos escreveram):\n\`\`\`csharp\n${codeCtx}\n\`\`\`\n\nCrie entre 28 e 32 questões de múltipla escolha cobrindo os CONCEITOS que apareceram no código que os alunos escreveram durante o processo inteiro da aula (não só o trecho final) — o que faz cada palavra-chave/instrução que eles usaram, para que serve cada estrutura, o papel de cada símbolo, o que acontece ao executar cada parte. Priorize perguntar sobre trechos e padrões que aparecem de fato no código dos alunos, não só teoria genérica. Varie a dificuldade e não repita a mesma pergunta com outras palavras. NÃO faça perguntas de matemática.\n\nMuito importante sobre as alternativas: as 3 erradas precisam ser PLAUSÍVEIS — do mesmo tamanho, estilo e nível de detalhe da certa, todas fazendo sentido gramatical com a pergunta. Nada de opção absurda, cômica, vazia ("nenhuma das anteriores" sem necessidade) ou claramente errada só de bater o olho — o objetivo é que só quem realmente entendeu o conceito acerte, não quem eliminou por exclusão óbvia. Use erros comuns e confusões reais de quem tá aprendendo (trocar o nome de um comando parecido, inverter o efeito de algo, confundir um conceito com outro da mesma aula) como base pras alternativas erradas. Responda APENAS JSON puro sem markdown:\n{"questions":[{"q":"pergunta","opts":["A","B","C","D"],"correct":0}]}`,
        "Você cria questões de múltipla escolha sobre C# com alternativas erradas plausíveis (baseadas em erros comuns de iniciante), nunca óbvias ou absurdas. APENAS JSON puro sem markdown.",
        { max_tokens: 6000 }
      );
      // ⏳ 30min de estudo antes da prova poder ser iniciada de verdade — mesmo espírito do
      // chefão: dá tempo pra turma revisar o resumo com calma antes de valer a nota
      const EXAM_STUDY_MS = 30 * 60 * 1000;
      const newConfig = { status: 'review', questions: shuffleQuestions(parsed.questions), summary: summaryResult.trim(), shift: shiftFilter, startedAt: Date.now(), studyUntil: Date.now() + EXAM_STUDY_MS };
      await setExamState(newConfig, teacherAuth, shiftFilter);
      setExamConfig(newConfig);
      setExamMsg("✅ Prova criada! Os alunos têm 30min pra estudar. Quando todos estiverem prontos, clique em Iniciar Agora (ou espere o tempo passar).");
    } catch(e) { setExamMsg("Erro ao gerar a prova. Tente de novo."); }
    setExamGenerating(false);
  };

  const activateExam = async () => {
    const newConfig = { ...examConfig, status: 'active', activatedAt: Date.now() };
    await setExamState(newConfig, teacherAuth, examConfig.shift || shiftFilter);
    setExamConfig(newConfig);
    setExamMsg("✅ Prova iniciada! Os alunos estão respondendo.");
  };
  // ⏳ igual ao chefão: quando o tempo de estudo acaba, a prova começa sozinha — não fica travada
  // esperando o professor lembrar de clicar em "Iniciar Agora". A ref evita disparar de novo a cada
  // tick do relógio (1s) enquanto o activateExam ainda está em andamento (chamada assíncrona).
  const examAutoStartedRef = useRef(null);
  useEffect(() => {
    if (examConfig.status !== 'review' || !examConfig.studyUntil || examNow < examConfig.studyUntil) return;
    if (examAutoStartedRef.current === examConfig.startedAt) return;
    examAutoStartedRef.current = examConfig.startedAt;
    activateExam();
  }, [examConfig.status, examConfig.studyUntil, examConfig.startedAt, examNow]); // eslint-disable-line react-hooks/exhaustive-deps

  const endExam = async () => {
    const newConfig = { ...examConfig, status: 'done', endedAt: Date.now() };
    await setExamState(newConfig, teacherAuth, examConfig.shift || shiftFilter);
    setExamConfig(newConfig);
    setExamMsg("✅ Prova encerrada! Veja o ranking abaixo.");
    setConfirmEndExam(false);
  };

  const resetExam = async () => {
    await setExamState({ status: 'idle' }, teacherAuth, examConfig.shift || shiftFilter);
    setExamConfig({ status: 'idle' });
    setExamMsg("");
  };

  const setupDb = async () => {
    setDbSetupLoading(true);
    setDbSetupMsg("");
    setDbSetupSQL(null);
    try {
      const r = await fetch("/api/setup-db", { method: "POST" });
      const d = await r.json();
      if (d.ok) {
        setDbSetupMsg("✅ " + (d.message || "Banco configurado!"));
        diagnose().then(setDiag);
        load();
      } else if (d.needsSQL) {
        setDbSetupSQL({ sql: d.sql, sqlEditorUrl: d.sqlEditorUrl });
        setDbSetupMsg("Cole o SQL abaixo no Supabase e clique Verificar agora.");
      } else {
        setDbSetupMsg("❌ " + (d.error || "Erro ao configurar banco."));
      }
    } catch (e) {
      setDbSetupMsg("❌ " + String(e.message || e));
    } finally {
      setDbSetupLoading(false);
    }
  };

  // Nyx analisa o desempenho da turma no período + prova
  const nyxExamAnalysis = async () => {
    if (analyzingExam) return;
    setAnalyzingExam(true);
    try {
      // a turma de teste fica fora da análise (é só para testar o sistema); em "Todas", analisa Matutino + Vespertino
      const base = shiftFilter === "all"
        ? students.filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id)
        : students.filter(s => (s.shift||"sem-turno") === shiftFilter);
      const rows = base.map(s => {
        const att = Object.values(s.attendance||{}).filter(v => v === "present").length;
        return `- ${s.name}: presenças com atividade=${att}, nota da atividade do dia=${s.score ?? "não fez"}, nota da prova=${s.examScore ?? "não fez"}, código com erro agora=${s.hasError ? "sim" : "não"}`;
      }).join("\n");
      const out = await askClaude(
        `Você é o Nyx analisando a turma para o PROFESSOR ao final de uma prova.\nDados de cada aluno (período de aulas + prova, provas valem 10 pontos por questão):\n${rows || "(sem alunos)"}\n\nEscreva uma análise curta e útil para o professor:\n• Quem foi bem no período E na prova — cite os números que justificam.\n• Quem se destacou ou surpreendeu (positivo ou negativo).\n• Quem precisa de atenção e em quê, com sugestão prática do que reforçar.\nUse marcadores "•", no máximo ~12 frases no total, sem markdown pesado.`,
        CS_SYSTEM
      );
      setExamAnalysis(out.trim());
    } catch (e) {
      setExamAnalysis(e.message === "ROBOTKEY_MISSING" ? `Nyx está offline: ${e.userMsg || "configure a chave da IA no Vercel."}` : "Não consegui analisar agora. Tente de novo em instantes.");
    }
    setAnalyzingExam(false);
  };

  const now = Date.now();
  const tk = todayKey();
  const isOnline = (s) => s.lastSeen && (now - s.lastSeen) < 30000;
  // a atividade concluída "vale" até as 9h da manhã do dia seguinte, mesmo que o aluno volte à tela inicial
  const effectivePhase = s => (s.phase !== "done" && isDoneActive(s.doneAt)) ? "done" : s.phase;
  const phaseLabel = p => ({coding:"Codando",generating:"Gerando",summary:"No Resumo",activity:"Na Atividade",done:"Concluído"})[p]||"Aguardando";
  const phaseColor = p => ({coding:"#c084fc",generating:"#fbbf24",summary:"#fbbf24",activity:"#3b82f6",done:"#34d399"})[p]||"#a99ac9";
  const hhmm = t => t ? new Date(t).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "—";
  const hhmmss = t => t ? new Date(t).toLocaleTimeString("pt-BR") : "—";
  const dataHora = t => t ? new Date(t).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

  // filtro por turno
  const shown = shiftFilter==="all" ? students : students.filter(s => (s.shift||"sem-turno")===shiftFilter);
  const sorted = [...shown].sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt-BR"));
  // chave composta (turno+nome) — se o mesmo nome existir em mais de um turno (ex: sobrou uma cópia
  // velha de uma mudança de turno que falhou), cada card precisa ser selecionável/identificável
  // separadamente; usar só o nome fazia todo clique cair sempre no primeiro encontrado
  const studentKey = s => `${s.shift||"sem-turno"}::${s.name}`;
  // detecta o mesmo nome aparecendo em mais de um turno — geralmente sobra de uma troca de turno/turma
  // que falhou no meio (o antigo bug de duplicação); avisa o professor pra conferir e excluir a cópia errada
  const duplicateGroups = (() => {
    const byName = new Map();
    for (const s of students) {
      const nm = (s.name||"").trim();
      if (!nm) continue;
      if (!byName.has(nm)) byName.set(nm, []);
      byName.get(nm).push(s);
    }
    return [...byName.entries()]
      .filter(([, list]) => new Set(list.map(s=>s.shift||"sem-turno")).size > 1)
      .map(([name, list]) => ({ name, list }));
  })();
  // erros mais comuns HOJE na turma: olha a última análise de cada aluno (feedback), categoriza
  // pelo texto do erro e junta por categoria — ajuda o professor a saber o que reforçar no fechamento
  const commonErrorsToday = (() => {
    const CATS = [
      { label:"Maiúscula/minúscula (Console.WriteLine etc.)", match:(t)=>/maiúscul|minúscul/i.test(t) },
      { label:"Ponto e vírgula faltando",                     match:(t)=>/ponto.e.v[íi]rgula/i.test(t) },
      { label:"Chaves, parênteses ou colchetes",               match:(t)=>/chave|parêntes|colchete/i.test(t) },
      { label:"Aspas",                                         match:(t)=>/aspas/i.test(t) },
      { label:"Variável usada sem declarar",                   match:(t)=>/declarar|não.declarad/i.test(t) },
      { label:"Palavra-chave ou tipo errado",                  match:(t)=>/palavra-chave|tipo errado|min[úu]sculo/i.test(t) },
      { label:"Comparação com = em vez de ==",                 match:(t)=>/==|comparação/i.test(t) },
    ];
    const tally = {};
    shown.forEach(s => {
      if (!s.hasError || !s.feedback) return;
      const texts = Array.isArray(s.feedback.errors) && s.feedback.errors.length
        ? s.feedback.errors.map(e => e.explicacao || "")
        : [s.feedback.message || ""];
      const seenCatsForStudent = new Set();
      texts.forEach(t => {
        const cat = CATS.find(c => c.match(t));
        const label = cat ? cat.label : "Outros erros";
        if (seenCatsForStudent.has(label)) return; // conta 1 aluno por categoria, não 1 por erro
        seenCatsForStudent.add(label);
        if (!tally[label]) tally[label] = { label, count:0, names:[] };
        tally[label].count++;
        tally[label].names.push(s.name);
      });
    });
    return Object.values(tally).sort((a,b)=>b.count-a.count);
  })();
  const sel = selected ? students.find(s=>studentKey(s)===selected) : null;
  useEffect(() => {
    let alive = true;
    if (sel) getAccessMode(sel.shift, sel.name).then(v => { if (alive) setSelAccessMode(v); });
    else setSelAccessMode(false);
    if (sel) getSupport(sel.shift, sel.name).then(v => { if (alive) setSelSupport(v || {}); });
    else setSelSupport({});
    if (sel) getInspection(sel.shift, sel.name).then(v => { if (alive) setSelInspection(v); });
    else setSelInspection(false);
    return () => { alive = false; };
  }, [sel?.shift, sel?.name]);
  const doToggleAccessMode = async (s) => {
    const next = !selAccessMode;
    await setAccessMode(s.shift, s.name, next, teacherAuth);
    setSelAccessMode(next);
    flashMgmt(next ? `✅ Modo Guiado ativado para ${s.name}.` : `✅ Modo Guiado desativado para ${s.name}.`);
  };
  // perfis de apoio: liga/desliga uma marcação e atualiza o mapa geral (indicador nos tiles)
  const doToggleSupport = async (s, flag, label) => {
    const next = { ...selSupport, [flag]: !selSupport[flag] };
    await setSupport(s.shift, s.name, next, teacherAuth);
    setSelSupport(next);
    setSupportMap(m => ({ ...m, [`${s.shift||"sem-turno"}:${s.name}`]: next }));
    flashMgmt(next[flag] ? `💙 ${label} ativado para ${s.name}.` : `✅ ${label} desativado para ${s.name}.`);
  };
  // ✋ marca o pedido de ajuda como atendido (via canal scorefix, que o aluno online obedece)
  const markHelped = async (s) => {
    await setScoreFix(s.shift, s.name, { kind: "help-attended" }, teacherAuth);
    flashMgmt(`✅ Pedido de ajuda de ${s.name} marcado como atendido.`);
  };
  // 📋 aprova a justificativa de uma falta — vira "justificado" na chamada do aluno
  const doApproveJustification = async (s, dateKey) => {
    const next = { ...(s.justifications || {}), [dateKey]: { ...(s.justifications||{})[dateKey], status: "approved" } };
    await patchStudent(s.shift, s.name, { justifications: next });
    // se o aluno estiver com a aba aberta na hora, o autosave periódico dele reescreve o registro
    // inteiro a partir do estado local (que ainda não sabe da aprovação) e desfaz o patch acima sem
    // querer — o canal scorefix avisa o cliente online pra atualizar o estado local antes de resalvar
    await setScoreFix(s.shift, s.name, { kind: "justify-approved", dateKey }, teacherAuth);
    flashMgmt(`✅ Falta de ${s.name} justificada.`);
    load();
  };
  // 🔍 vistoria: libera este aluno específico mesmo fora do horário automático
  const doToggleInspection = async (s) => {
    const next = !selInspection;
    await setInspection(s.shift, s.name, next, teacherAuth);
    setSelInspection(next);
    flashMgmt(next ? `🔍 Vistoria aberta pra ${s.name} — ele pode entrar mesmo fora do horário.` : "✅ Vistoria concluída.");
  };
  // 🌟 portfólio público: o aluno liga por conta própria (opt-in), mas o professor pode desligar
  // se precisar (moderação) — nunca liga no lugar do aluno
  const doDisablePortfolio = async (s) => {
    await patchStudent(s.shift, s.name, { portfolioPublic: false });
    flashMgmt(`Portfólio público de ${s.name} desativado.`);
    load();
  };
  // 👀 anti-cola: decide a defesa do aluno (aceitar devolve os pontos; recusar mantém o desconto)
  const decideAppeal = async (s, accept) => {
    if (accept) await setScoreFix(s.shift, s.name, { kind: "exam", score: s.examScoreRaw ?? s.examScore ?? 0 }, teacherAuth);
    else await setScoreFix(s.shift, s.name, { kind: "exam-appeal-rejected" }, teacherAuth);
    setExamMsg(accept ? `✅ Pontos da prova devolvidos pra ${s.name}.` : `Desconto mantido pra ${s.name}.`);
    setTimeout(() => setExamMsg(""), 6000);
  };
  // 🤝 parceiro de código: pareia um colega livre (ajudante) com um aluno em dificuldade (ajudado)
  const doPairPartner = async (helped, helperName) => {
    const rec = { helper: helperName, helped: helped.name, shift: helped.shift, status: "active", startedAt: Date.now() };
    await setPartner(helped.shift, helped.name, rec);
    setPartners(prev => [...prev.filter(p => !(p.helped===helped.name && p.shift===helped.shift)), rec]);
    // se o pareamento veio de um pedido do próprio aluno (🙋), avisa o cliente dele pra desligar o "levantei a mão"
    if (helped.wantsPartner) await setScoreFix(helped.shift, helped.name, { kind: "partner-request-cleared" }, teacherAuth);
    flashMgmt(`🤝 ${helperName} vai ajudar ${helped.name}!`);
  };
  // dispensa um pedido de parceiro sem parear ninguém (ex: o aluno já resolveu sozinho)
  const dismissPartnerRequest = async (s) => {
    await setScoreFix(s.shift, s.name, { kind: "partner-request-cleared" }, teacherAuth);
    flashMgmt(`Pedido de parceiro de ${s.name} dispensado.`);
  };
  const doUnpairPartner = async (helped) => {
    await clearPartner(helped.shift, helped.name);
    setPartners(prev => prev.filter(p => !(p.helped===helped.name && p.shift===helped.shift)));
    flashMgmt(`Parceria de ${helped.name} desfeita.`);
  };
  // 📚 aulas salvas pelo professor (o código DELE vira a biblioteca)
  useEffect(() => { getTeacherLessons().then(ls => setMyLessons(Array.isArray(ls) ? ls : [])); }, []);
  const saveCurrentLesson = async () => {
    const files = (proFiles || []).filter(f => (f.code || "").trim());
    if (!files.length) { setNameMsg(`⚠ Programe algo na turma ${shiftMeta(codeShift).label} primeiro — a aula salva é o código que está no editor.`); setTimeout(()=>setNameMsg(""), 6000); return; }
    const title = lessonName.trim() || `Aula de ${new Date().toLocaleDateString("pt-BR")}`;
    const next = [...myLessons, { title, files: files.map(f => ({ ...f })), at: Date.now() }];
    setMyLessons(next);
    setLessonName("");
    await saveTeacherLessons(next, teacherAuth);
    setNameMsg(`✅ "${title}" salva na sua biblioteca!`);
    setTimeout(()=>setNameMsg(""), 6000);
  };
  const deleteLesson = async (idx) => {
    const next = myLessons.filter((_, i) => i !== idx);
    setMyLessons(next);
    await saveTeacherLessons(next, teacherAuth);
  };

  // 📦 backup completo: baixa tudo do banco num JSON (seguro antes de resetar/trocar de cidade)
  const exportBackup = async () => {
    setBackupBusy(true);
    try {
      const data = await exportAllData(teacherAuth);
      const payload = { app: "aula-csharp", exportedAt: new Date().toISOString(), city: meta.city || "", totalKeys: Object.keys(data).length, data };
      const blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `backup-aula-csharp-${todayKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {}
    setBackupBusy(false);
  };

  const present = shown.filter(isOnline).length;
  const goingWell = sorted.filter(s => difficultyOf(s).level==="bem");
  const needHelp  = sorted.filter(s => difficultyOf(s).level==="dif");
  // 🙋 quem pediu um parceiro sozinho e ainda não foi pareado — fica visível de cara, sem o
  // professor precisar clicar aluno por aluno pra descobrir quem pediu
  const wantsPartnerList = sorted.filter(s => s.wantsPartner && !partners.some(p => p.status==="active" && p.helped===s.name && (p.shift||"sem-turno")===(s.shift||"sem-turno")));
  // notificação DE VERDADE na tela do professor (não só um aviso escondido dentro de "Meu código"):
  // toca sempre que um aluno NOVO passa a precisar de ajuda, em qualquer aba que o professor esteja
  const needHelpNames = needHelp.map(s=>s.name).sort().join("|");
  const prevNeedHelpRef = useRef("");
  const mountedNeedHelpRef = useRef(false);
  useEffect(() => {
    const prevNames = new Set(prevNeedHelpRef.current ? prevNeedHelpRef.current.split("|") : []);
    const newOnes = needHelp.filter(s => !prevNames.has(s.name));
    if (mountedNeedHelpRef.current && newOnes.length > 0) {
      setStruggleNotice(newOnes.map(s=>s.name).join(", "));
      setTimeout(() => setStruggleNotice(null), 7000);
    }
    mountedNeedHelpRef.current = true;
    prevNeedHelpRef.current = needHelpNames;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needHelpNames]);
  const feedbacks = sorted
    .filter(s => s.classFeedback && (s.classFeedback.rating || (s.classFeedback.text||"").trim()))
    .sort((a,b) => (b.classFeedback.at||0) - (a.classFeedback.at||0));
  // ── visão do DIA: só conta quem apareceu hoje; notas só das conquistas de hoje ──
  // quem entrou na plataforma hoje (no dia seguinte, antes de alguém entrar, tudo zera)
  const todayStudents = sorted.filter(s => isSameDayTs(s.lastSeen));
  // fase "do dia": concluiu conta até as 9h da manhã seguinte; um "done" velho de outro dia volta a contar como codando
  const dayPhase = (s) => {
    if (isDoneActive(s.doneAt)) return "done";
    if (s.phase === "done") return "coding";
    return s.phase;
  };
  // nota da atividade só vale se foi concluída hoje; nota da prova só se a prova atual começou hoje
  const examIsToday = examConfig?.startedAt && isSameDayTs(examConfig.startedAt);
  const todayScoreOf = (s) => {
    const act = isSameDayTs(s.doneAt) && s.score != null ? s.score : -1;
    const exam = examIsToday && s.examScore != null ? s.examScore : -1;
    return Math.max(act, exam);
  };
  // resumo automático (só agregação dos dados já carregados, sem IA)
  const topEntry = todayStudents
    .map(s => ({ s, val: todayScoreOf(s) }))
    .filter(x => x.val >= 0)
    .sort((a,b) => b.val - a.val)[0];
  const topToday = topEntry ? { ...topEntry.s, todayScore: topEntry.val } : null;

  // presença do dia: present (compareceu e fez algo) · idle (entrou mas parado) · absent (não entrou hoje)
  const attStatus = (s) => {
    const a = s.attendance && s.attendance[tk];
    if (a) return a;
    return isSameDayTs(s.lastSeen) ? "present" : "absent";
  };
  // ⏰ atrasado: só faz sentido se o turno tem horário configurado — compara o 1º acesso de HOJE com o início da aula
  const isLate = (s) => {
    const sched = schedule[s.shift];
    const startMin = sched && hmToMin(sched.start);
    const firstToday = s.attendanceFirst && s.attendanceFirst[tk];
    if (startMin == null || !firstToday) return false;
    const d = new Date(firstToday);
    return (d.getHours() * 60 + d.getMinutes()) > startMin;
  };
  // 📋 faltas pendentes de justificativa (aparecem no detalhe do aluno)
  const pendingJustifications = (s) => Object.entries(s.justifications || {}).filter(([, j]) => j.status === "pending");
  const presentList = sorted.filter(s => attStatus(s)==="present");
  const idleList    = sorted.filter(s => attStatus(s)==="idle");
  const absentList  = sorted.filter(s => attStatus(s)==="absent");
  const contentFor = (sh) => contentNameFor((meta.contentNames||{})[tk], sh);
  const todayContentM = contentFor("matutino");
  const todayContentV = contentFor("vespertino");
  const todayContent = todayContentM || todayContentV; // uso legado (NyxChat, etc.)
  // mapa de conteúdo por dia já resolvido para o turno em foco (usado no Calendário)
  const calContentNames = Object.fromEntries(
    Object.entries(meta.contentNames || {})
      .map(([k, v]) => [k, contentNameFor(v, codeShift)])
      .filter(([, v]) => v)
  );

  // lista de chamada separada por turno (a turma de teste só aparece se filtrada explicitamente)
  const chamadaGroups = [...SHIFTS, TEST_SHIFT]
    .filter(sh => shiftFilter === "all" ? sh.id !== TEST_SHIFT.id : shiftFilter === sh.id)
    .map(sh => {
      const list = students.filter(s => (s.shift||"sem-turno")===sh.id).sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt-BR"));
      return {
        shift: sh,
        list,
        online: list.filter(isOnline).length,
        present: list.filter(s=>attStatus(s)==="present"),
        idle: list.filter(s=>attStatus(s)==="idle"),
        absent: list.filter(s=>attStatus(s)==="absent"),
      };
    });

  const styles = {
    container:{ minHeight:"100vh", background:PAGE_BG, color:"#f0e9fb", fontFamily:FONT },
    header:{ background:"rgba(17,21,42,.85)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #3b2a58", boxShadow:"0 1px 0 #fbbf2433, 0 8px 24px rgba(3,5,16,.35)", position:"sticky", top:0, zIndex:40, flexWrap:"wrap", gap:8 },
    card:{ background:"linear-gradient(180deg,#231636,#1a1029)", borderRadius:16, padding:16, margin:"10px 0", border:"1px solid #3a2a55", boxShadow:"0 8px 24px rgba(3,5,16,.35)", animation:"rise .35s ease both" },
    btn:(c)=>({ background:`linear-gradient(135deg, ${c}, ${shade(c,-0.18)})`, color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:800, boxShadow:`0 4px 14px ${c}44` }),
    badge:(c)=>({ background:c+"22", color:c, padding:"2px 10px", borderRadius:12, fontSize:12, fontWeight:700 }),
    tab:(on)=>({ background:on?"linear-gradient(135deg,#fbbf24,#f59310)":"transparent", color:on?"#1c1400":"#a99ac9", border:`1px solid ${on?"#fbbf24":"#3b2a58"}`, borderRadius:10, padding:"6px 14px", cursor:"pointer", fontWeight:800, fontSize:13, boxShadow:on?"0 4px 12px #fbbf2433":"none" }),
  };
  const dot = (on) => (<span style={{ width:9, height:9, borderRadius:"50%", background:on?"#34d399":"#776798", display:"inline-block", marginRight:6, boxShadow:on?"0 0 6px #34d399":"none", ...(on?{animation:"live-dot 2s ease-in-out infinite"}:{}) }}/>);

  return (
    <div style={styles.container}>
      <Toaster theme="dark" position="top-right" richColors closeButton />
      {struggleNotice && (
        <div style={{ position:"fixed", top:12, right:12, zIndex:1300, background:"linear-gradient(135deg,#f87171,#dc2626)", color:"#fff", borderRadius:14, padding:"12px 16px", boxShadow:"0 14px 40px rgba(0,0,0,.45)", display:"flex", alignItems:"center", gap:10, maxWidth:320 }}>
          <span style={{ fontSize:22 }}>⚠️</span>
          <div>
            <div style={{ fontWeight:900, fontSize:13 }}>Precisando de ajuda</div>
            <div style={{ fontSize:12, marginTop:2, lineHeight:1.4 }}>{struggleNotice}</div>
          </div>
        </div>
      )}
      {aiDown && (
        <div style={{ position:"fixed", top:12, left:12, zIndex:1200, background:"#231636", border:"1px solid #fbbf24", borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
          <span style={{ display:"inline-block", width:9, height:9, borderRadius:"50%", background:"#fbbf24", animation:"nyx-antenna 1s ease-in-out infinite" }} />
          <span style={{ color:"#fbbf24", fontSize:12.5, fontWeight:700 }}>🔄 Reconectando Nyx...</span>
        </div>
      )}
      {shiftBreakStatuses.filter(s => s.status.inBreak).map(s => (
        <div key={s.id} style={{ position:"fixed", top: aiDown ? 54 : 12, right:12, zIndex:1200, background:"#0e1f2e", border:"1px solid #22d3ee", borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
          <span style={{ fontSize:15 }}>🍎</span>
          <span style={{ color:"#a5f3fc", fontSize:12.5, fontWeight:700 }}>Intervalo {s.label} · volta em {s.status.minutesToBreakEnd}min</span>
        </div>
      ))}
      {breakEndMsgTeacher && (
        <div style={{ position:"fixed", top:12, right:12, zIndex:1200, background:"#0e1f2e", border:"1px solid #22d3ee", borderRadius:10, padding:"7px 12px", boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
          <span style={{ color:"#a5f3fc", fontSize:12.5, fontWeight:700 }}>{breakEndMsgTeacher}</span>
        </div>
      )}
      {autoNameMsg && (
        <div style={{ position:"fixed", top: breakEndMsgTeacher ? 54 : 12, right:12, zIndex:1200, background:"#1e1b4b", border:"1px solid #a855f7", borderRadius:10, padding:"7px 12px", boxShadow:"0 8px 24px rgba(0,0,0,.4)", maxWidth:340 }}>
          <span style={{ color:"#ddd6fe", fontSize:12.5, fontWeight:700 }}>{autoNameMsg}</span>
        </div>
      )}
      {helpNotice && (
        <div style={{ position:"fixed", top: (breakEndMsgTeacher?42:0) + (autoNameMsg?42:0) + 12, right:12, zIndex:1200, background:"#2a1a10", border:"1px solid #fbbf24", borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
          <span style={{ fontSize:15 }}>✋</span>
          <span style={{ color:"#fcd9a0", fontSize:12.5, fontWeight:700 }}>{helpNotice}</span>
        </div>
      )}
      {errorNotice && (
        <div style={{ position:"fixed", top: (breakEndMsgTeacher?42:0) + (autoNameMsg?42:0) + (helpNotice?42:0) + 12, right:12, zIndex:1200, background:"#2a1010", border:"1px solid #f87171", borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 24px rgba(0,0,0,.4)", maxWidth:340 }}>
          <span style={{ fontSize:15 }}>⚠️</span>
          <span style={{ color:"#fca5a5", fontSize:12.5, fontWeight:700 }}>{errorNotice}</span>
        </div>
      )}
      <div style={{ ...styles.header, ...(tab==="code" ? { padding:"6px 14px" } : {}) }}>
        <div>
          <span className="shine" style={{ fontWeight:900, fontSize: tab==="code" ? 14 : 18, background:"linear-gradient(120deg,#fbbf24,#fb923c,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>👨‍🏫 Painel do Professor</span>
          {tab!=="code" && (
            <span style={{ color:"#a99ac9", marginLeft:12, fontSize:12 }}>
              ● ao vivo · {lastUpdate}{meta.city?` · 📍 ${meta.city}`:""}
              {(todayContentM||todayContentV) ? ` · 📖 ${[todayContentM&&`☀️ ${todayContentM}`, todayContentV&&`🌙 ${todayContentV}`].filter(Boolean).join(" · ")}` : ""}
            </span>
          )}
          {tab!=="code" && (
            <span data-tour="saude-ia" style={{ marginLeft:12, display:"inline-flex", alignItems:"center", gap:10, fontSize:11.5, verticalAlign:"middle" }}>
              {[["nvidia","✨ Nemotron"],["laguna","🌊 Laguna"]].map(([key,label]) => {
                const h = providerHealth[key];
                const recent = h && Date.now() - h.at < 5 * 60 * 1000;
                const color = !recent ? "#5d679c" : h.ok ? "#34d399" : "#f87171";
                const title = !recent ? `${label}: sem dados recentes` : h.ok ? `${label}: respondendo normalmente` : `${label}: não respondeu na última tentativa`;
                return (
                  <span key={key} title={title} style={{ display:"inline-flex", alignItems:"center", gap:4, color:"#a99ac9" }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:color, display:"inline-block", boxShadow: recent && h.ok ? `0 0 6px ${color}` : "none" }} />
                    {label}
                  </span>
                );
              })}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap: tab==="code" ? 5 : 8, flexWrap:"wrap" }}>
          <button data-tour-prof="monitor" style={{ ...styles.tab(tab==="monitor"), ...(tab==="code"?{padding:"4px 9px",fontSize:12}:{}) }} onClick={()=>setTab("monitor")}>👥 Monitoramento</button>
          <button data-tour-prof="code" style={{ ...styles.tab(tab==="code"), ...(tab==="code"?{padding:"4px 9px",fontSize:12}:{}) }} onClick={()=>setTab("code")}>👨‍💻 Meu código</button>
          <button data-tour-prof="calendar" style={{ ...styles.tab(tab==="calendar"), ...(tab==="code"?{padding:"4px 9px",fontSize:12}:{}) }} onClick={()=>setTab("calendar")}>🗓️ Calendário</button>
          <button data-tour-prof="feedback" style={{ ...styles.tab(tab==="feedback"), ...(tab==="code"?{padding:"4px 9px",fontSize:12}:{}) }} onClick={()=>setTab("feedback")}>💬 Feedback ({feedbacks.length})</button>
          <button data-tour-prof="exam" style={{ ...styles.tab(tab==="exam"), ...(examConfig.status!=='idle' && tab!=="exam" ? {borderColor:"#fbbf24",color:"#fbbf24"} : {}), ...(tab==="code"?{padding:"4px 9px",fontSize:12}:{}) }} onClick={()=>setTab("exam")}>🏆 Prova{examConfig.status!=='idle'?' ●':''}</button>
          <button data-tour-prof="quiz" style={{ ...styles.tab(tab==="quiz"), ...(quizRoom && tab!=="quiz" ? {borderColor:"#c084fc",color:"#c084fc"} : {}), ...(tab==="code"?{padding:"4px 9px",fontSize:12}:{}) }} onClick={()=>setTab("quiz")}>🎉 Quiz{quizRoom?' ●':''}</button>
          <button data-tour-prof="situacao" style={{ ...styles.btn(needHelp.length>0 ? "#f87171" : "#34d399"), ...(tab==="code"?{padding:"4px 10px",fontSize:12}:{}) }} onClick={()=>setShowQuickStatus(true)} title="Veja rapidinho quem está com dificuldade, sem sair desta tela">👀 Situação{needHelp.length>0 ? ` (${needHelp.length})` : ""}</button>
          {tab!=="code" && <button data-tour-prof="telao" style={styles.btn("#22d3ee")} onClick={()=>setShowTelao(true)} title="Tela cheia pra projetar: ranking, meta da turma e combos">🖥️ Telão</button>}
          {tab!=="code" && <button data-tour-prof="reset" style={styles.btn("#f87171")} onClick={()=>{ setResetScope(shiftFilter); setConfirmReset(true); }} disabled={resetting}>{resetting?"Resetando...":"🔄 Resetar"}</button>}
          {tab!=="code" && <button style={styles.btn("#22d3ee")} onClick={()=>{ const first = TEACHER_TOUR_STEPS[0]; if (first.tab) setTab(first.tab); setProfTourStep(0); }} title="Tour guiado por todas as funções do painel do professor, entrando em cada aba pra mostrar de verdade">🧭 Tour</button>}
          <button data-tour-prof="sair" style={{ ...styles.btn("#776798"), fontSize: tab==="code" ? 12 : 13, ...(tab==="code"?{padding:"4px 10px"}:{}) }} onClick={onLogout}>Sair</button>
        </div>
      </div>

      {/* filtro de turno (vale para monitoramento, chamada, situação e feedback) */}
      {tab!=="code" && (
        <div data-tour-prof="turma" style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ color:"#a99ac9", fontSize:13 }}>Turma:</span>
          <button onClick={()=>setShiftFilter("all")} style={styles.tab(shiftFilter==="all")}>Todas ({students.length})</button>
          {SHIFTS.map(sh => (
            <button key={sh.id} onClick={()=>setShiftFilter(sh.id)} style={styles.tab(shiftFilter===sh.id)}>
              {sh.emoji} {sh.label} ({students.filter(s=>(s.shift||"sem-turno")===sh.id).length})
            </button>
          ))}
          {students.some(s=>s.shift===TEST_SHIFT.id) && (
            <button onClick={()=>setShiftFilter(TEST_SHIFT.id)} style={{ ...styles.tab(shiftFilter===TEST_SHIFT.id), opacity:0.75 }}>
              {TEST_SHIFT.emoji} {TEST_SHIFT.label} ({students.filter(s=>s.shift===TEST_SHIFT.id).length})
            </button>
          )}
          {students.some(s=>s.shift===LANG_SHIFT.id) && (
            <button onClick={()=>setShiftFilter(LANG_SHIFT.id)} style={{ ...styles.tab(shiftFilter===LANG_SHIFT.id), opacity:0.75, borderColor: shiftFilter===LANG_SHIFT.id ? undefined : "#22d3ee55" }} title="Amigos estudando outras linguagens (HTML/CSS/PHP/JS), fora da turma de C#">
              {LANG_SHIFT.emoji} {LANG_SHIFT.label} ({students.filter(s=>s.shift===LANG_SHIFT.id).length})
            </button>
          )}
        </div>
      )}

      {/* aviso de resultado do reset */}
      {resetMsg && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#1e1430", border:`1px solid ${resetMsg.startsWith("✅")?"#34d399":"#f87171"}`, color:resetMsg.startsWith("✅")?"#34d399":"#f87171", borderRadius:10, padding:"10px 14px", fontSize:14 }}>{resetMsg}</div>
        </div>
      )}

      {showTelao && <TelaoModal students={students} shift={shiftFilter} onClose={()=>setShowTelao(false)} teacherAuth={teacherAuth} />}
      {showQuickStatus && <QuickStatusModal students={sorted} onClose={()=>setShowQuickStatus(false)} />}
      {showTripOverview && <TripOverviewModal entries={tripHallEntries} currentCity={meta.city} onClose={()=>setShowTripOverview(false)} />}

      {dailyPdfModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:640, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <h2 style={{ margin:0, fontSize:19, fontWeight:900, background:"linear-gradient(135deg,#fbbf24,#fb923c)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📄 Resumo de hoje — {dailyPdfModal.studentName}</h2>
              <button onClick={()=>setDailyPdfModal(null)} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
            </div>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 12px", lineHeight:1.6 }}>
              Confirme (ou cole por cima) o código que você passou HOJE pra turma {shiftLabel(dailyPdfModal.shift)}. O Nyx explica exatamente o que estiver aqui embaixo — só o que já estava salvo em "Meu código" veio pré-preenchido.
            </p>
            <textarea value={dailyPdfCode} onChange={e=>setDailyPdfCode(e.target.value)} disabled={dailyPdfBusy} rows={14} spellCheck={false}
              style={{ width:"100%", background:"#171026", border:"2px solid #3b2a58", borderRadius:12, padding:"10px 12px", color:"#f0e9fb", fontFamily:"'Courier New',monospace", fontSize:12.5, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
            <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
              <button onClick={()=>exportDailyPDF(dailyPdfModal.shift, dailyPdfModal.studentName, dailyPdfCode)} disabled={dailyPdfBusy || !dailyPdfCode.trim()} style={{ ...styles.btn("#fbbf24"), padding:"9px 18px", fontSize:13.5, opacity: (dailyPdfBusy || !dailyPdfCode.trim()) ? 0.6 : 1 }}>
                {dailyPdfBusy ? "⏳ Gerando..." : "✅ Gerar PDF"}
              </button>
              <button onClick={()=>setDailyPdfModal(null)} disabled={dailyPdfBusy} style={{ ...styles.btn("#3b2a58"), padding:"9px 18px", fontSize:13.5 }}>Cancelar</button>
            </div>
            {dailyPdfMsg && <p style={{ color: dailyPdfMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:12.5, marginTop:10 }}>{dailyPdfMsg}</p>}
          </div>
        </div>
      )}

      {/* biblioteca de aulas: as SUAS aulas salvas (o seu código) + modelos de exemplo */}
      {showLessons && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:640, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#34d399,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📚 Minhas aulas</h2>
              <button onClick={()=>setShowLessons(false)} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
            </div>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Sua biblioteca: salve o código que está no editor com um nome e reutilize em qualquer turma, quantas vezes quiser. Carregar uma aula <b>substitui</b> o código atual da turma {shiftMeta(codeShift).label}.</p>

            {/* salvar a aula atual */}
            <div style={{ background:"#171026", border:"1px dashed #34d399", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
              <p style={{ color:"#34d399", fontSize:12.5, fontWeight:800, margin:"0 0 8px" }}>💾 Salvar o código atual ({shiftMeta(codeShift).label}) como aula</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <input value={lessonName} onChange={e=>setLessonName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveCurrentLesson()} placeholder={`Nome da aula (ex: Variáveis e ReadLine)`}
                  style={{ flex:"1 1 220px", background:"#1a1029", border:"1px solid #3b2a58", borderRadius:10, padding:"8px 12px", color:"#f0e9fb", fontSize:13, outline:"none" }} />
                <button onClick={saveCurrentLesson} style={{ ...styles.btn("#34d399"), padding:"8px 14px", fontSize:12.5 }}>💾 Salvar</button>
              </div>
            </div>

            {/* aulas salvas */}
            {myLessons.length === 0 ? (
              <p style={{ color:"#776798", fontSize:13, marginBottom:14 }}>Você ainda não salvou nenhuma aula. Programe na aba Meu código e clique em Salvar acima — ela aparece aqui pra sempre.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                {myLessons.map((lesson, li) => (
                  <div key={li} style={{ display:"flex", alignItems:"center", gap:10, background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"10px 14px", flexWrap:"wrap" }}>
                    <div style={{ flex:"1 1 220px" }}>
                      <p style={{ color:"#f0e9fb", fontWeight:800, fontSize:13.5, margin:0 }}>{lesson.title}</p>
                      <p style={{ color:"#776798", fontSize:11.5, margin:"3px 0 0" }}>salva em {new Date(lesson.at).toLocaleDateString("pt-BR")} · {lesson.files.length} arquivo{lesson.files.length!==1?"s":""}</p>
                    </div>
                    <button onClick={()=>{ setProFiles(lesson.files.map(f => ({ ...f }))); setShowLessons(false); setNameMsg(`✅ "${lesson.title}" carregada na turma ${shiftMeta(codeShift).label}! O código já está no editor.`); setTimeout(()=>setNameMsg(""), 7000); }}
                      style={{ ...styles.btn("#34d399"), padding:"7px 14px", fontSize:12.5 }}>Usar esta aula →</button>
                    <button onClick={()=>deleteLesson(li)} title="Excluir esta aula da biblioteca" style={{ background:"transparent", border:"1px solid #f8717155", color:"#f87171", borderRadius:8, padding:"6px 10px", fontSize:12, cursor:"pointer" }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* modelos de exemplo (secundário, recolhido) */}
            <button onClick={()=>setShowModels(v=>!v)} style={{ background:"transparent", border:"1px solid #3b2a58", color:"#a99ac9", borderRadius:10, padding:"7px 14px", fontSize:12.5, cursor:"pointer", width:"100%" }}>
              {showModels ? "▾" : "▸"} Modelos de exemplo do Nyx ({LESSON_LIBRARY.length}) — ponto de partida, se quiser
            </button>
            {showModels && (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:10 }}>
                {LESSON_LIBRARY.map((lesson, li) => (
                  <div key={li} style={{ display:"flex", alignItems:"center", gap:10, background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"10px 14px", flexWrap:"wrap" }}>
                    <div style={{ flex:"1 1 260px" }}>
                      <p style={{ color:"#f0e9fb", fontWeight:800, fontSize:13.5, margin:0 }}>{lesson.title}</p>
                      <p style={{ color:"#a99ac9", fontSize:12, margin:"3px 0 0" }}>{lesson.desc}</p>
                    </div>
                    <button onClick={()=>{ setProFiles(lesson.files.map(f => ({ ...f }))); setShowLessons(false); setNameMsg(`✅ "${lesson.title}" carregada na turma ${shiftMeta(codeShift).label}! O código já está no editor.`); setTimeout(()=>setNameMsg(""), 7000); }}
                      style={{ ...styles.btn("#3b2a58"), padding:"7px 14px", fontSize:12.5 }}>Usar este modelo →</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* confirmação de reset (dentro do app, sem depender do navegador) */}
      {confirmReset && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#1e1430", border:"2px solid #f87171", borderRadius:16, padding:24, maxWidth:440, width:"100%" }}>
            <div style={{ fontSize:40, textAlign:"center" }}>⚠️</div>
            <h3 style={{ color:"#f87171", textAlign:"center", margin:"8px 0" }}>Resetar perfis dos alunos?</h3>
            <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.6, textAlign:"center" }}>Isso apaga os alunos escolhidos e tudo o que eles fizeram (códigos, atividades e feedbacks). O calendário, a cidade e os nomes de conteúdo <b>não</b> são apagados. Não dá para desfazer.</p>
            <button onClick={exportBackup} disabled={backupBusy} style={{ ...styles.btn("#34d399"), width:"100%", padding:"9px 0", fontSize:13, margin:"10px 0 4px", opacity:backupBusy?0.7:1 }}>
              {backupBusy ? "⏳ Gerando backup..." : "📦 Baixar backup completo antes de apagar (recomendado)"}
            </button>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"14px 0 6px" }}>O que você quer resetar?</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={()=>setResetScope("all")} style={{ ...styles.tab(resetScope==="all"), flex:"1 1 120px" }}>☀️🌙 Matutino + Vespertino</button>
              {SHIFTS.map(sh => (
                <button key={sh.id} onClick={()=>setResetScope(sh.id)} style={{ ...styles.tab(resetScope===sh.id), flex:"1 1 120px" }}>Só {sh.emoji} {sh.label}</button>
              ))}
            </div>
            <p style={{ color:"#776798", fontSize:11.5, margin:"6px 0 0" }}>A turma de teste e a sala de linguagens nunca são apagadas por aqui — se precisar limpar uma delas, é só entrar nela e usar o botão de resetar de dentro dela.</p>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={()=>setConfirmReset(false)} style={{ ...styles.btn("#3b2a58"), flex:1 }}>Cancelar</button>
              <button onClick={doReset} style={{ ...styles.btn("#f87171"), flex:1 }}>{resetScope==="all"?"Resetar Matutino + Vespertino":`Resetar ${shiftMeta(resetScope).label}`}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── MONITORAMENTO ─────────── */}
      {tab==="monitor" && (
        <div style={{ display:"flex", gap:14, padding:14, maxWidth:1180, margin:"0 auto", alignItems:"flex-start", flexWrap:"wrap" }}>
          {/* esquerda */}
          <div className="side-col" style={{ width:300, flex:"0 0 300px" }}>
            {/* Nyx de olho na turma */}
            <div className="cardfx" style={{ ...styles.card, textAlign:"center", borderColor: needHelp.length>0 ? "#f87171" : "#3a2a55" }}>
              <NyxRobot state={needHelp.length>0 ? "error" : shown.length>0 ? "ok" : "idle"} size={64} showName={false} />
              <div style={{ fontWeight:900, letterSpacing:2, fontSize:12, color:"#fbbf24", marginTop:2 }}>NYX DE OLHO</div>
              <p style={{ color: needHelp.length>0 ? "#fca5a5" : "#a99ac9", fontSize:13, lineHeight:1.6, margin:"6px 0 0" }}>
                {needHelp.length > 0
                  ? <>⚠ Atenção com: <b style={{color:"#f0e9fb"}}>{needHelp.slice(0,4).map(s=>String(s.name).split(" ")[0]).join(", ")}{needHelp.length>4 ? ` e mais ${needHelp.length-4}` : ""}</b> — clique no aluno para ver o que houve.</>
                  : shown.length > 0 ? "Turma indo bem! Ninguém travado no momento. 👍" : "Aguardando alunos entrarem..."}
              </p>
            </div>

            {/* Chamada — separada por turno */}
            <CollapsibleCard title="📋 Lista de Chamada" dataTourProf="chamada" headerRight={<>
              <span style={styles.badge("#34d399")}>{present} online / {shown.length}</span>
              <button onClick={async ()=>{ await Promise.all(shown.map(s=>setKeyboardLaunch(s.shift, s.name, teacherAuth))); flashMgmt(`⌨️ Tutorial de teclado aberto pra ${shown.length} aluno(s).`); }} style={{ ...styles.btn("#22d3ee"), padding:"5px 10px", fontSize:12 }} title="Abre o tutorial de teclado na tela de todos os alunos filtrados">⌨️ Abrir teclado pra todos</button>
            </>}>
              {shown.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>Nenhum aluno na chamada ainda.</p> : (
                chamadaGroups.map((g, gi) => (
                  <div key={g.shift.id} style={{ marginTop: gi>0 ? 18 : 0, paddingTop: gi>0 ? 16 : 0, borderTop: gi>0 ? "1px solid #3b2a58" : "none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <b style={{ color:"#f0e9fb", fontSize:14 }}>{g.shift.emoji} {g.shift.label}</b>
                      <span style={styles.badge("#34d399")}>{g.online} online / {g.list.length}</span>
                    </div>
                    {g.list.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>Nenhum aluno nesta turma ainda.</p> : (
                      <>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                          <span style={styles.badge("#34d399")}>✅ {g.present.length} presente{g.present.length!==1?"s":""}</span>
                          <span style={styles.badge("#fbbf24")}>⚠ {g.idle.length} sem atividade</span>
                          <span style={styles.badge("#f87171")}>❌ {g.absent.length} falta{g.absent.length!==1?"s":""}</span>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:8 }}>
                          {g.list.map((s, tileIdx)=>{
                            const st = attStatus(s);
                            const late = (st==="present"||st==="idle") && isLate(s);
                            const stColor = late?"#fb923c":st==="present"?"#34d399":st==="idle"?"#fbbf24":"#f87171";
                            const stLabel = late?"⏰ Atrasado":st==="present"?"✅ Presente":st==="idle"?"⚠ Sem atividade":"❌ Falta";
                            return (
                              <div key={s.name} className="tilefx" style={{ background:"#171026", border:`1px solid ${st==="absent"?"#3f2530":"#3b2a58"}`, borderRadius:8, padding:"8px 10px", opacity:st==="absent"?0.7:1, animationDelay:`${Math.min(tileIdx*45, 500)}ms` }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <Avatar cfg={s.avatar} size={28} />
                                  <span style={{ fontSize:14, flex:1 }}>{dot(isOnline(s))}{s.name}</span>
                                  <span style={{ color:"#776798", fontSize:11 }}>{hhmm(s.joinedAt)}</span>
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, flexWrap:"wrap" }}>
                                  <span style={styles.badge(stColor)}>{stLabel}</span>
                                  {st==="idle" && (
                                    nudged[s.name]
                                      ? <span style={{ color:"#34d399", fontSize:11, fontWeight:600 }}>aviso enviado ✓</span>
                                      : <button onClick={()=>nudgeStudent(s)} style={{ background:"transparent", color:"#fbbf24", border:"1px solid #fbbf24", borderRadius:8, padding:"2px 8px", fontSize:11, fontWeight:600, cursor:"pointer" }}>👀 Enviar aviso</button>
                                  )}
                                  {st!=="present" && (
                                    <button onClick={()=>markPresentToday(s)} title="Marca a presença de hoje na mão (dia de filme, passeio, atividade sem computador...) — conta como presente normal, sem atraso" style={{ background:"transparent", color:"#34d399", border:"1px solid #34d399", borderRadius:8, padding:"2px 8px", fontSize:11, fontWeight:600, cursor:"pointer" }}>✅ Marcar presente</button>
                                  )}
                                  {st==="present" && !isSameDayTs(s.lastSeen) && (
                                    <button onClick={()=>unmarkPresentToday(s)} title="Este aluno foi marcado presente na mão (ele não entrou hoje) — clique pra desfazer" style={{ background:"transparent", color:"#a99ac9", border:"1px solid #56407e", borderRadius:8, padding:"2px 8px", fontSize:11, fontWeight:600, cursor:"pointer" }}>↩️ Desfazer</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </CollapsibleCard>

            <div data-tour-prof="exportar" className="cardfx" style={styles.card}>
              <h4 style={{ color:"#fbbf24", marginBottom:10, fontSize:14 }}>📊 Turma hoje</h4>
              {/* conta só quem entrou HOJE — no dia seguinte, antes de alguém entrar, fica tudo no 0 */}
              {["coding","summary","activity","done"].map(p=>(
                <div key={p} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:phaseColor(p), fontSize:13 }}>{phaseLabel(p)}</span>
                  <span style={styles.badge(phaseColor(p))}>{todayStudents.filter(s=>dayPhase(s)===p).length}</span>
                </div>
              ))}
              <hr style={{ borderColor:"#3b2a58", margin:"8px 0" }}/>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#a99ac9", fontSize:13 }}>Média de hoje</span>
                <span style={{ color:"#34d399", fontWeight:700 }}>{(() => {
                  const done = todayStudents.filter(s => s.score!=null && isSameDayTs(s.doneAt));
                  return done.length > 0 ? Math.round(done.reduce((a,s)=>a+s.score,0)/done.length)+" pts" : "—";
                })()}</span>
              </div>
              <button onClick={exportCSV} style={{ ...styles.btn("#3b2a58"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Baixa uma planilha colorida e organizada por turno (abre no Excel), com presenças, notas e situação de cada aluno (sem a turma de teste)">
                ⬇️ Exportar planilha (Excel)
              </button>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center", marginTop:8 }}>
                <span style={{ color:"#776798", fontSize:11 }}>PDF de:</span>
                {[{ id:"all", emoji:"🏫", label:"Ambos" }, ...SHIFTS].map(sh => (
                  <button key={sh.id} onClick={()=>setPdfScope(sh.id)} style={{ background: pdfScope===sh.id ? "linear-gradient(135deg,#c084fc,#9333ea)" : "#171026", color: pdfScope===sh.id ? "#fff" : "#a99ac9", border:`1px solid ${pdfScope===sh.id?"#c084fc":"#3b2a58"}`, borderRadius:8, padding:"3px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>{sh.emoji} {sh.label}</button>
                ))}
              </div>
              <button onClick={()=>exportPDF(pdfScope)} disabled={pdfGenerating} style={{ ...styles.btn("#c084fc"), width:"100%", marginTop:6, padding:"7px 0", fontSize:12.5, opacity: pdfGenerating ? 0.7 : 1 }} title="Gera um material de estudo em PDF: o código do professor (aba Meu código) com as explicações do Nyx — sem nome de aluno, pronto pra enviar pro turno escolhido">
                {pdfGenerating ? "⏳ Gerando PDF..." : "📄 Exportar PDF (códigos + explicações)"}
              </button>
              {pdfMsg && <p style={{ color: pdfMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:11.5, marginTop:6 }}>{pdfMsg}</p>}
              <button onClick={exportBackup} disabled={backupBusy} style={{ ...styles.btn("#34d399"), width:"100%", marginTop:8, padding:"7px 0", fontSize:12.5, opacity:backupBusy?0.7:1 }} title="Baixa um arquivo com TUDO (alunos, notas, presenças, códigos, configurações) — guarde antes de resetar ou trocar de cidade">
                {backupBusy ? "⏳ Gerando backup..." : "📦 Baixar backup completo"}
              </button>
            </div>

            <CollapsibleCard title="🔧 Conexão" alertOpen={!!diag && (diag.hasStorage === false || diag.hasAI === false)}>
              {diag ? (
                <div style={{ color:"#d6c9ec", lineHeight:1.7 }}>
                  <div>
                    Armazenamento: <b style={{ color:diag.hasStorage?"#34d399":"#f87171" }}>{diag.hasStorage?"OK":"NÃO"}</b>
                    {diag.writeRead!=="—" && <> · <b style={{ color:diag.writeRead==="ok"?"#34d399":"#f87171" }}>{diag.writeRead}</b></>}
                  </div>
                  <div>Nyx (IA): <b style={{ color:diag.hasAI===true?"#34d399":diag.hasAI===false?"#f87171":"#a99ac9" }}>{diag.hasAI===true?"OK":diag.hasAI===false?"NÃO":"—"}</b></div>

                  {!diag.hasStorage && diag.writeRead === "erro" && diag.quotaSuspect && (
                    <div style={{ background:"#fbbf2415", border:"1px solid #fbbf24", borderRadius:8, padding:"10px 12px", marginTop:8, lineHeight:1.9 }}>
                      <b style={{ color:"#fbbf24" }}>⚠ Parece ter estourado a cota do plano grátis</b><br/>
                      <span style={{ color:"#a99ac9" }}>
                        O erro que voltou do banco tem cara de <b style={{color:"#f0e9fb"}}>limite do plano grátis do Supabase</b> (banda/egress, armazenamento ou requisições) — diferente de projeto pausado. Confira em <b style={{color:"#f0e9fb"}}>supabase.com</b> → seu projeto → <b style={{color:"#34d399"}}>Settings → Billing/Usage</b> se algum item está no limite. Se estiver, dá pra esperar renovar no mês seguinte ou fazer upgrade de plano.<br/>
                        Depois clique <b style={{color:"#34d399"}}>↻ Verificar agora</b> abaixo.
                      </span>
                      {diag.err && <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #fbbf2433", color:"#c9b98a", fontSize:11, fontFamily:"monospace", wordBreak:"break-word" }}>Erro técnico: {diag.err}</div>}
                    </div>
                  )}

                  {!diag.hasStorage && diag.writeRead === "erro" && !diag.quotaSuspect && (
                    <div style={{ background:"#f8717115", border:"1px solid #f87171", borderRadius:8, padding:"10px 12px", marginTop:8, lineHeight:1.9 }}>
                      <b style={{ color:"#f87171" }}>❌ Não consegui conectar no banco</b><br/>
                      <span style={{ color:"#a99ac9" }}>
                        Como já funcionava antes, o mais provável é o banco ter <b style={{color:"#f0e9fb"}}>pausado sozinho</b> (comum no plano grátis do Supabase depois de alguns dias sem uso) — os dados continuam salvos, só precisa "acordar" ele:<br/>
                        &nbsp;• Entre em <b style={{color:"#f0e9fb"}}>supabase.com</b>, abra o projeto e clique em <b style={{color:"#34d399"}}>Restore/Resume project</b><br/>
                        &nbsp;• Se não estiver pausado, confira no Vercel → Settings → Environment Variables se <code style={{color:"#60a5fa"}}>SUPABASE_URL</code> e <code style={{color:"#60a5fa"}}>SUPABASE_SERVICE_KEY</code> continuam lá<br/>
                        Depois clique <b style={{color:"#34d399"}}>↻ Verificar agora</b> abaixo.
                      </span>
                      {diag.err && <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #f8717133", color:"#c9a5a5", fontSize:11, fontFamily:"monospace", wordBreak:"break-word" }}>Erro técnico: {diag.err}</div>}
                    </div>
                  )}

                  {!diag.hasStorage && diag.writeRead !== "erro" && (
                    <div style={{ background:"#f8717115", border:"1px solid #f87171", borderRadius:8, padding:"10px 12px", marginTop:8, lineHeight:1.9 }}>
                      <b style={{ color:"#f87171" }}>❌ Banco não configurado</b><br/>
                      <span style={{ color:"#a99ac9" }}>
                        No Supabase → <b style={{color:"#f0e9fb"}}>Settings → API</b>:<br/>
                        &nbsp;• Copie <b style={{color:"#fbbf24"}}>Project URL</b> → adicione no Vercel como <code style={{color:"#60a5fa"}}>SUPABASE_URL</code><br/>
                        &nbsp;• Copie <b style={{color:"#fbbf24"}}>service_role</b> → adicione no Vercel como <code style={{color:"#60a5fa"}}>SUPABASE_SERVICE_KEY</code><br/>
                        Depois clique <b style={{color:"#34d399"}}>Inicializar banco</b> abaixo.
                      </span>
                    </div>
                  )}

                  {/* SQL manual quando não tem DATABASE_PASSWORD */}
                  {dbSetupSQL && (
                    <div style={{ background:"#1e3a5f", border:"1px solid #3b82f6", borderRadius:8, padding:"10px 12px", marginTop:8 }}>
                      <b style={{ color:"#93c5fd", fontSize:12 }}>Execute este SQL no Supabase:</b>
                      <pre style={{ background:"#171026", borderRadius:6, padding:"8px 10px", margin:"6px 0", fontSize:11, color:"#22d3ee", overflowX:"auto", userSelect:"all" }}>{dbSetupSQL.sql}</pre>
                      <a href={dbSetupSQL.sqlEditorUrl} target="_blank" rel="noreferrer"
                        style={{ display:"inline-block", background:"#3b82f6", color:"#fff", borderRadius:6, padding:"4px 12px", fontSize:12, textDecoration:"none", marginRight:8 }}>
                        Abrir SQL Editor →
                      </a>
                      <span style={{color:"#a99ac9",fontSize:11}}>Cole o SQL acima, clique Run, depois ↻ Verificar agora</span>
                    </div>
                  )}

                  {diag.hasAI === false && (
                    <div style={{ background:"#fbbf2415", border:"1px solid #fbbf24", borderRadius:8, padding:"10px 12px", marginTop:8, lineHeight:1.8 }}>
                      <b style={{ color:"#fbbf24" }}>⚠ Nyx (IA) sem chave de API</b><br/>
                      <span style={{ color:"#a99ac9" }}>
                        Escolha UMA opção e adicione no Vercel → Settings → Environment Variables:<br/>
                        &nbsp;• <b style={{color:"#f0e9fb"}}>NVIDIA</b>: build.nvidia.com → adicione <code style={{color:"#60a5fa"}}>NVIDIA_API_KEY</code> + <code style={{color:"#60a5fa"}}>NVIDIA_MODEL</code><br/>
                        &nbsp;• <b style={{color:"#f0e9fb"}}>Claude</b>: console.anthropic.com → adicione <code style={{color:"#60a5fa"}}>ANTHROPIC_API_KEY</code><br/>
                        Depois é só dar <b style={{color:"#f0e9fb"}}>Redeploy</b>.
                      </span>
                    </div>
                  )}
                </div>
              ) : <span style={{ color:"#776798" }}>verificando...</span>}
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
                <button style={{ ...styles.btn("#3b2a58"), padding:"4px 10px", fontSize:12 }} onClick={()=>{ setDbSetupSQL(null); setDbSetupMsg(""); diagnose().then(setDiag); load(); }}>↻ Verificar agora</button>
                <button style={{...styles.btn("#166534"),padding:"4px 10px",fontSize:12,opacity:dbSetupLoading?0.6:1}} onClick={setupDb} disabled={dbSetupLoading}>{dbSetupLoading?"...":"🔧 Inicializar banco"}</button>
              </div>
              {dbSetupMsg && (
                <p style={{color:dbSetupMsg.startsWith("✅")?"#34d399":dbSetupMsg.startsWith("Cole")?"#93c5fd":"#f87171",fontSize:12,marginTop:6}}>{dbSetupMsg}</p>
              )}
            </CollapsibleCard>

            <CollapsibleCard title="🚨 Erros recentes" color="#f87171" headerRight={
              <button style={{ ...styles.btn("#3b2a58"), padding:"3px 10px", fontSize:11.5 }} onClick={loadRecentErrors} disabled={errorsLoading}>{errorsLoading ? "..." : "↻ Verificar"}</button>
            }>
              <p style={{ color:"#776798", fontSize:11.5, lineHeight:1.6, margin:"0 0 8px" }}>
                Erros de JS que quebraram sozinhos na tela de algum aluno ou sua, sem precisar que ninguém perceba e avise. Não mostra código nem dado pessoal — só a mensagem do erro, de onde veio e quando.
              </p>
              {recentErrors === null ? (
                <p style={{ color:"#776798", fontSize:12 }}>Clique em "↻ Verificar" pra carregar.</p>
              ) : recentErrors.length === 0 ? (
                <p style={{ color:"#34d399", fontSize:12.5 }}>✅ Nenhum erro registrado.</p>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:260, overflowY:"auto" }}>
                  {recentErrors.map((e, i) => (
                    <div key={i} style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"8px 10px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:10.5, color:"#776798", marginBottom:3 }}>
                        <span>{e.role === "student" ? "🧑‍🎓 aluno" : e.role === "teacher" ? "🧑‍🏫 professor" : "❔ anônimo"} · {e.url || "?"}</span>
                        <span>{e.at ? new Date(e.at).toLocaleString("pt-BR") : "?"}</span>
                      </div>
                      <p style={{ color:"#f0e9fb", fontSize:12, margin:0, wordBreak:"break-word" }}>{e.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleCard>

            <CollapsibleCard title="📖 Conteúdo de hoje" dataTourProf="conteudo-auto">
              {todayContentM
                ? <p style={{ color:"#34d399", fontSize:13, fontWeight:600, lineHeight:1.5, margin:0 }}>☀️ Manhã: {todayContentM}</p>
                : <p style={{ color:"#a99ac9", fontSize:12.5, lineHeight:1.5, margin:0 }}>☀️ Manhã: ainda não definido</p>}
              {todayContentV
                ? <p style={{ color:"#34d399", fontSize:13, fontWeight:600, lineHeight:1.5, margin:"4px 0 0" }}>🌙 Tarde: {todayContentV}</p>
                : <p style={{ color:"#a99ac9", fontSize:12.5, lineHeight:1.5, margin:"4px 0 0" }}>🌙 Tarde: ainda não definido</p>}
              <p style={{ color:"#776798", fontSize:11.5, lineHeight:1.5, margin:"8px 0 0" }}>Programe o exemplo na aba <b>Meu código</b> e gere um nome automático. (Se ainda não programou, uso o código dos alunos.)</p>
              <button style={{ ...styles.btn("#c084fc"), padding:"6px 12px", fontSize:13, marginTop:8, width:"100%", opacity:genName?0.6:1 }} onClick={generateContentNameFiltered} disabled={genName}>{genName?"Gerando...":"✨ Gerar nome do conteúdo"}</button>
              {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:12, marginTop:8, lineHeight:1.5 }}>{nameMsg}</p>}
            </CollapsibleCard>

            <CollapsibleCard title="💌 Boletim pros responsáveis" color="#f9a8d4" dataTourProf="boletim">
              <p style={{ color:"#776798", fontSize:11.5, lineHeight:1.5, margin:"0 0 8px" }}>Um PDF com uma página por aluno, em linguagem simples pra família: presenças, o que aprendeu, medalhas e um recado do Nyx. Bom pra mandar pra casa no fim do mês. Pra gerar de 1 aluno só, selecione ele no Monitoramento e use o botão no painel de Gerenciar aluno.</p>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center", marginBottom:8 }}>
                <span style={{ color:"#776798", fontSize:11 }}>Boletim de:</span>
                {[{ id:"all", emoji:"🏫", label:"Todos" }, ...SHIFTS].map(sh => (
                  <button key={sh.id} onClick={()=>setBoletimScope(sh.id)} style={{ background: boletimScope===sh.id ? "linear-gradient(135deg,#ec4899,#be185d)" : "#171026", color: boletimScope===sh.id ? "#fff" : "#a99ac9", border:`1px solid ${boletimScope===sh.id?"#ec4899":"#3b2a58"}`, borderRadius:8, padding:"3px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>{sh.emoji} {sh.label}</button>
                ))}
              </div>
              <button onClick={()=>exportBoletins(boletimScope)} disabled={boletimBusy}
                style={{ ...styles.btn("#ec4899"), padding:"6px 12px", fontSize:12.5, width:"100%", opacity: boletimBusy ? 0.6 : 1 }}>
                {boletimBusy ? "Gerando..." : "💌 Gerar boletins"}
              </button>
              {boletimMsg && <p style={{ color: boletimMsg.startsWith("✅") ? "#34d399" : boletimMsg.startsWith("❌") ? "#f87171" : "#fbbf24", fontSize:12, marginTop:8, lineHeight:1.5 }}>{boletimMsg}</p>}
            </CollapsibleCard>

            <CollapsibleCard title="🎁 Retrospectiva do mês" color="#c4b5fd" dataTourProf="retro">
              <p style={{ color:"#776798", fontSize:11.5, lineHeight:1.5, margin:"0 0 8px" }}>Libere no fim do mês: cada aluno vê uma tela especial com os números dele (linhas de código, presenças, conquistas...). Cada um vê a sua uma vez só.</p>
              {SHIFTS.map(sh => {
                const on = !!(meta.retro || {})[sh.id];
                return (
                  <button key={sh.id} onClick={()=>toggleRetro(sh.id)}
                    style={{ ...styles.btn(on ? "#34d399" : "#c084fc"), padding:"6px 12px", fontSize:12.5, width:"100%", marginTop:6 }}>
                    {on ? `✅ Liberada pra turma ${sh.label} — clique pra recolher` : `🎁 Liberar pra turma ${sh.label}`}
                  </button>
                );
              })}
            </CollapsibleCard>

            {commonErrorsToday.length > 0 && (
              <div className="cardfx" style={{ ...styles.card, fontSize:12 }}>
                <h4 style={{ color:"#f87171", fontSize:13, marginBottom:6 }}>🩹 Erros mais comuns agora</h4>
                <p style={{ color:"#776798", fontSize:11.5, lineHeight:1.5, margin:"0 0 8px" }}>Baseado na última verificação do Nyx em cada aluno — bom pra saber o que reforçar no fechamento da aula.</p>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {commonErrorsToday.slice(0, 6).map(c => (
                    <div key={c.label} title={c.names.join(", ")} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"6px 10px" }}>
                      <span style={{ color:"#f0e9fb", fontSize:12 }}>{c.label}</span>
                      <span style={{ background:"#f8717122", border:"1px solid #f87171", color:"#f87171", borderRadius:20, padding:"1px 9px", fontSize:11, fontWeight:800 }}>{c.count} aluno{c.count>1?"s":""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* direita */}
          <div style={{ flex:"1 1 420px", minWidth:300 }}>
            <div data-tour-prof="monitor-grid" className="cardfx" style={styles.card} onMouseEnter={()=>setMonitorHover(true)} onMouseLeave={()=>setMonitorHover(false)}>
              <h3 style={{ color:"#fbbf24", marginBottom:12, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <span>👥 Monitoramento ({shown.length})</span>
                {duplicateGroups.length > 0 && (
                  <div style={{ position:"relative" }} onMouseEnter={()=>setShowDupHover(true)} onMouseLeave={()=>setShowDupHover(false)}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#fbbf2422", border:"1px solid #fbbf24", color:"#fbbf24", borderRadius:20, padding:"4px 10px", fontSize:11.5, fontWeight:700, cursor:"default" }}>
                      ⚠ {duplicateGroups.length} duplicado{duplicateGroups.length!==1?"s":""}
                    </span>
                    {showDupHover && (
                      <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:50, width:300, background:"linear-gradient(180deg,#2a2015,#1a1029)", border:"1px solid #fbbf24", borderRadius:12, padding:"12px 14px", boxShadow:"0 14px 40px rgba(0,0,0,.5)" }}>
                        <p style={{ color:"#a99ac9", fontSize:12, margin:"0 0 8px", lineHeight:1.5 }}>Esse nome aparece em mais de um turno/turma — geralmente sobra de uma troca que falhou no meio. Clique no turno pra abrir e conferir.</p>
                        {duplicateGroups.map(g => (
                          <div key={g.name} style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", padding:"6px 0", borderTop:"1px solid #3b2a5855" }}>
                            <b style={{ color:"#f0e9fb", fontSize:13 }}>{g.name}</b>
                            {g.list.map(s => (
                              <button key={studentKey(s)} onClick={()=>{ setShiftFilter(s.shift||"sem-turno"); setSelected(studentKey(s)); setShowDupHover(false); }} style={{ ...styles.badge("#fbbf24"), cursor:"pointer", border:"1px solid #fbbf24", background:"transparent" }}>{shiftLabel(s.shift)}</button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </h3>
              {shown.length===0 && <p style={{ color:"#776798", fontSize:13 }}>{students.length===0 ? "Aguardando alunos entrarem..." : "Nenhum aluno nesta turma. Veja outra turma no filtro acima."}</p>}
              {shown.length > 0 && !monitorHover && (
                <div style={{ padding:"36px 0", textAlign:"center", color:"#776798", fontSize:13 }}>🖱️ Passe o mouse aqui pra ver os {shown.length} aluno{shown.length!==1?"s":""}</div>
              )}
              {shown.length > 0 && monitorHover && (
              <div style={{ maxHeight:400, overflowY:"auto", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(128px,1fr))", gap:8 }}>
                {sorted.map((s, tileIdx)=>{
                  const d = difficultyOf(s);
                  const hasHand = s.helpAt && Date.now() - s.helpAt < 15 * 60 * 1000; // pedido de ajuda expira em 15 min
                  const hasError = s.errorAt && Date.now() - s.errorAt < 30 * 60 * 1000; // aviso de erro expira em 30 min
                  return (
                    <div key={studentKey(s)} className="tilefx" onClick={()=>setSelected(studentKey(s)===selected?null:studentKey(s))} style={{ position:"relative", background:selected===studentKey(s)?"#c084fc22":hasHand?"#fbbf2415":hasError?"#f8717115":"#171026", border:`2px solid ${selected===studentKey(s)?"#c084fc":hasHand?"#fbbf24":hasError?"#f87171":"#3b2a58"}`, borderRadius:10, padding:"10px 10px 8px", cursor:"pointer", textAlign:"center", animationDelay:`${Math.min(tileIdx*45, 500)}ms` }}>
                      {hasHand && <span title="Pediu ajuda! Clique pra ver e marcar como atendido." style={{ position:"absolute", top:4, right:24, fontSize:15, animation:"pulse-dot 1s ease-in-out infinite" }}>✋</span>}
                      {hasError && <span title={`A tela deu um erro: ${s.errorMsg || "sem detalhes"}`} style={{ position:"absolute", top:4, right: hasHand?42:24, fontSize:15 }}>⚠️</span>}
                      {s.score!=null && isSameDayTs(s.doneAt) && <span style={{ position:"absolute", top:6, left:6, background:"#34d39922", border:"1px solid #34d399", color:"#34d399", borderRadius:6, padding:"1px 6px", fontSize:10.5, fontWeight:800 }}>🏆 {s.score}</span>}
                      {Object.values(supportMap[`${s.shift||"sem-turno"}:${s.name}`] || {}).some(Boolean) && (
                        <span title="Aluno com perfil de apoio ativo (clique pra ver no detalhe)" style={{ position:"absolute", bottom:6, left:6, fontSize:11 }}>💙</span>
                      )}
                      {checkinMap[`${s.shift||"sem-turno"}:${s.name}`] && (() => {
                        const mood = checkinMoodInfo(checkinMap[`${s.shift||"sem-turno"}:${s.name}`].mood);
                        return mood ? <span title={`Chegou hoje: ${mood.label}`} style={{ position:"absolute", bottom:6, right:6, fontSize:13 }}>{mood.emoji}</span> : null;
                      })()}
                      <span style={{ position:"absolute", top:8, right:8 }}>{dot(isOnline(s))}</span>
                      <div style={{ marginTop:s.score!=null?16:4 }}>
                        <Avatar cfg={s.avatar} size={44} />
                      </div>
                      <div style={{ fontWeight:700, fontSize:12.5, marginTop:6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.name}</div>
                      <div style={{ marginTop:4 }}>
                        <span style={{ ...styles.badge(phaseColor(effectivePhase(s))), fontSize:10.5 }}>{phaseLabel(effectivePhase(s))}</span>
                      </div>
                      <div style={{ marginTop:5 }}>
                        <span style={{ ...styles.badge(d.level==="dif"?"#f87171":d.level==="bem"?"#34d399":"#a99ac9"), fontSize:10.5 }}>{d.level==="dif"?"⚠ Com dificuldade":d.level==="bem"?"✅ Indo bem":"• Começando"}</span>
                      </div>
                      <div style={{ color:"#776798", fontSize:10.5, marginTop:5 }}>visto {hhmmss(s.lastSeen)}</div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            {/* Resumo automático (sem clicar em nada — só agregação dos dados) */}
            <div className="cardfx" style={{ ...styles.card, borderColor:"#c084fc" }}>
              <h3 style={{ color:"#c084fc", marginBottom:10 }}>📋 Resumo automático</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:13 }}>
                <div style={{ color: absentList.length ? "#f87171" : "#776798" }}>
                  {absentList.length > 0
                    ? <>🚫 <b>{absentList.length}</b> ausente{absentList.length>1?"s":""} hoje: {absentList.slice(0,5).map(s=>String(s.name).split(" ")[0]).join(", ")}{absentList.length>5?` e mais ${absentList.length-5}`:""}</>
                    : "✅ Ninguém ausente hoje nessa turma"}
                </div>
                <div style={{ color: needHelp.length ? "#fbbf24" : "#776798" }}>
                  {needHelp.length > 0
                    ? <>⚠ <b>{needHelp.length}</b> com dificuldade agora: {needHelp.slice(0,5).map(s=>String(s.name).split(" ")[0]).join(", ")}{needHelp.length>5?` e mais ${needHelp.length-5}`:""}</>
                    : "✅ Ninguém com dificuldade agora"}
                </div>
                {wantsPartnerList.length > 0 && (
                  <div style={{ color:"#a855f7" }}>
                    🙋 <b>{wantsPartnerList.length}</b> pediu{wantsPartnerList.length>1?"ram":""} um parceiro: {wantsPartnerList.slice(0,5).map(s=>String(s.name).split(" ")[0]).join(", ")}{wantsPartnerList.length>5?` e mais ${wantsPartnerList.length-5}`:""} — clique no aluno pra parear
                  </div>
                )}
                {topToday && (
                  <div style={{ color:"#34d399" }}>🌟 Destaque de hoje: <b>{topToday.name}</b> ({topToday.todayScore} pts)</div>
                )}
              </div>
            </div>

            {/* Situação da turma */}
            <div className="cardfx" style={styles.card}>
              <h3 style={{ color:"#fbbf24", marginBottom:10 }}>📈 Situação da turma</h3>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:"1 1 200px" }}>
                  <p style={{ color:"#34d399", fontWeight:700, marginBottom:6 }}>✅ Indo bem ({goingWell.length})</p>
                  {goingWell.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>—</p> : goingWell.map(s=>(
                    <div key={s.name} style={{ fontSize:13, color:"#d6c9ec", marginBottom:4 }}>• <b>{s.name}</b>: {difficultyOf(s).text}</div>
                  ))}
                </div>
                <div style={{ flex:"1 1 200px" }}>
                  <p style={{ color:"#f87171", fontWeight:700, marginBottom:6 }}>⚠ Precisam de ajuda ({needHelp.length})</p>
                  {needHelp.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>—</p> : needHelp.map(s=>(
                    <div key={s.name} style={{ fontSize:13, color:"#d6c9ec", marginBottom:4 }}>• <b>{s.name}</b>: {difficultyOf(s).text}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Evolução da turma ao longo das aulas — média das notas de atividade por dia, juntando todo mundo */}
            {(() => {
              const relevant = shown.filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id);
              const byDate = {};
              relevant.forEach(s => {
                Object.entries(s.scoreHistory||{}).forEach(([d,n]) => {
                  if (typeof n !== "number") return;
                  (byDate[d] = byDate[d] || []).push(n);
                });
              });
              const trend = Object.entries(byDate)
                .map(([date, scores]) => ({ date, avg: Math.round(scores.reduce((a,b)=>a+b,0)/scores.length), count: scores.length }))
                .sort((a,b) => a.date.localeCompare(b.date))
                .slice(-14);
              if (trend.length < 2) return null;
              const delta = trend[trend.length-1].avg - trend[0].avg;
              const trendLabel = delta >= 8 ? { text:"📈 Melhorando", color:"#34d399" } : delta <= -8 ? { text:"📉 Caindo", color:"#f87171" } : { text:"➡ Estável", color:"#a99ac9" };
              return (
                <div className="cardfx" style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                    <h3 style={{ color:"#c084fc", margin:0 }}>📊 Evolução da turma nas últimas aulas</h3>
                    <span style={{ ...styles.badge(trendLabel.color) }}>{trendLabel.text}</span>
                  </div>
                  <p style={{ color:"#776798", fontSize:12, margin:"0 0 12px" }}>Média da nota de atividade de todos os alunos, dia a dia — ajuda a ver se a turma está indo melhor ou pior de uma aula pra outra.</p>
                  <ClassTrendChart trend={trend} />
                </div>
              );
            })()}

            {/* Evolução da PRESENÇA ao longo das aulas — % de quem já tinha entrado na turma
                naquele dia e foi marcado presente, juntando todo mundo (mesmo cálculo usado na
                planilha e no boletim: só conta quem já era da turma naquele dia) */}
            {(() => {
              const relevant = shown.filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id);
              const classDaysList = [...new Set(meta.classDays || [])].sort();
              const byDate = {};
              relevant.forEach(s => {
                const enrollFrom = s.createdAt ? dateKeyOf(s.createdAt) : (Object.keys(s.attendance||{}).sort()[0] || null);
                classDaysList.forEach(d => {
                  if (enrollFrom && d < enrollFrom) return; // ainda não tinha entrado na turma
                  if (d >= todayKey() && !(s.attendance||{})[d]) return; // hoje sem presença marcada ainda não conta como falta
                  const bucket = (byDate[d] = byDate[d] || { present:0, total:0 });
                  bucket.total++;
                  if ((s.attendance||{})[d] === "present") bucket.present++;
                });
              });
              const trend = Object.entries(byDate)
                .filter(([,b]) => b.total > 0)
                .map(([date, b]) => ({ date, avg: Math.round((b.present / b.total) * 100), count: b.total }))
                .sort((a,b) => a.date.localeCompare(b.date))
                .slice(-14);
              if (trend.length < 2) return null;
              const delta = trend[trend.length-1].avg - trend[0].avg;
              const trendLabel = delta >= 8 ? { text:"📈 Melhorando", color:"#34d399" } : delta <= -8 ? { text:"📉 Caindo", color:"#f87171" } : { text:"➡ Estável", color:"#a99ac9" };
              return (
                <div className="cardfx" style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                    <h3 style={{ color:"#199e70", margin:0 }}>🗓️ Evolução da presença nas últimas aulas</h3>
                    <span style={{ ...styles.badge(trendLabel.color) }}>{trendLabel.text}</span>
                  </div>
                  <p style={{ color:"#776798", fontSize:12, margin:"0 0 12px" }}>Porcentagem de alunos presentes a cada aula (só conta quem já tinha entrado na turma naquele dia) — ajuda a perceber cedo se a frequência está caindo.</p>
                  <ClassTrendChart trend={trend} unit="%" gradId="attendanceTrendGrad" color="#199e70" />
                </div>
              );
            })()}

            {/* Detalhe do aluno */}
            {sel ? (
              <>
                <div className="cardfx" style={styles.card}>
                  <h3 style={{ color:"#fbbf24", display:"flex", alignItems:"center", gap:10 }}><Avatar cfg={sel.avatar} size={34} />{dot(isOnline(sel))}{sel.name}</h3>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:8 }}>
                    <span style={styles.badge(phaseColor(effectivePhase(sel)))}>{phaseLabel(effectivePhase(sel))}</span>
                    {sel.score!=null && <span style={styles.badge("#34d399")}>🏆 {sel.score} pts</span>}
                    {(() => { const d=difficultyOf(sel); return <span style={styles.badge(d.level==="dif"?"#f87171":"#34d399")}>{d.level==="dif"?"⚠ "+d.text:"✅ "+d.text}</span>; })()}
                  </div>
                </div>

                {/* 🤝 Parceiro de código: pareia um colega livre com quem está em dificuldade */}
                <div className="cardfx" style={{ ...styles.card, borderColor: sel.wantsPartner ? "#a855f7" : "#22d3ee" }}>
                  <h4 style={{ color:"#22d3ee", marginBottom:12 }}>🤝 Parceiro de código</h4>
                  {sel.wantsPartner && (
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", background:"#a855f710", border:"1px solid #a855f7", borderRadius:8, padding:"8px 10px", marginBottom:10 }}>
                      <span style={{ color:"#a855f7", fontSize:12.5, fontWeight:800, flex:"1 1 180px" }}>🙋 {sel.name} pediu um parceiro às {new Date(sel.wantsPartner).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}!</span>
                      <button onClick={()=>dismissPartnerRequest(sel)} style={{ ...styles.btn("#3b2a58"), padding:"4px 10px", fontSize:11.5 }}>Dispensar</button>
                    </div>
                  )}
                  {(() => {
                    const selShift = sel.shift || "sem-turno";
                    const selPartner = partners.find(p => p.helped===sel.name && (p.shift||"sem-turno")===selShift && p.status==="active");
                    const selHelping = partners.find(p => p.helper===sel.name && p.status==="active");
                    if (selPartner) {
                      return (
                        <div>
                          <p style={{ color:"#d6c9ec", fontSize:13, marginBottom:10 }}>
                            🤝 <b>{selPartner.helper}</b> está ajudando <b>{sel.name}</b> desde {new Date(selPartner.startedAt).toLocaleTimeString("pt-BR")}.
                          </p>
                          <button onClick={()=>doUnpairPartner(sel)} style={{ ...styles.btn("#f87171"), padding:"6px 14px", fontSize:12.5 }}>Desfazer parceria</button>
                        </div>
                      );
                    }
                    if (selHelping) {
                      return <p style={{ color:"#776798", fontSize:13 }}>{sel.name} já está ajudando <b>{selHelping.helped}</b> agora — espere terminar antes de parear de novo.</p>;
                    }
                    const candidates = students
                      .filter(s => s.name!==sel.name && (s.shift||"sem-turno")===selShift && (s.shift||"")!==TEST_SHIFT.id
                        && !partners.some(p => p.status==="active" && (p.helper===s.name || p.helped===s.name)))
                      .sort((a,b) => { const rank = l=>l==="bem"?0:l==="neutro"?1:2; return rank(difficultyOf(a).level)-rank(difficultyOf(b).level); });
                    if (candidates.length===0) return <p style={{ color:"#776798", fontSize:13 }}>Nenhum colega livre no turno agora pra parear.</p>;
                    return (
                      <div>
                        <p style={{ color:"#776798", fontSize:11.5, marginBottom:8 }}>Escolha um colega livre pra ajudar {sel.name} — ele vê o código (só leitura) e os dois ganham pontos quando marcar como resolvido.</p>
                        <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:180, overflowY:"auto" }}>
                          {candidates.map(c => (
                            <div key={c.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"6px 10px" }}>
                              <span style={{ fontSize:12.5 }}>{c.name} {difficultyOf(c).level==="bem" && <span style={{color:"#34d399"}}>· livre</span>}</span>
                              <button onClick={()=>doPairPartner(sel, c.name)} style={{ ...styles.btn("#22d3ee"), padding:"4px 10px", fontSize:11.5 }}>Parear</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Gerenciar aluno: renomear, mover de turno, corrigir nota, excluir */}
                <div className="cardfx" style={{ ...styles.card, borderColor:"#fbbf24" }}>
                  <h4 style={{ color:"#fbbf24", marginBottom:12 }}>⚙️ Gerenciar aluno</h4>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>✏️ Nome:</span>
                      <input value={renameVal} onChange={e=>setRenameVal(e.target.value)} placeholder={sel.name}
                        style={{ flex:1, minWidth:140, background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 10px", color:"#f0e9fb", fontSize:13, outline:"none" }} />
                      <button onClick={()=>doRenameStudent(sel)} disabled={!renameVal.trim()} style={{ ...styles.btn("#c084fc"), padding:"6px 14px", fontSize:12.5, opacity:renameVal.trim()?1:0.5 }}>Renomear</button>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🕑 Turma:</span>
                      {[...SHIFTS, TEST_SHIFT].filter(sh => sh.id !== (sel.shift||"sem-turno")).map(sh => (
                        <button key={sh.id} onClick={()=>doMoveStudent(sel, sh.id)} style={{ ...styles.btn("#3b2a58"), padding:"6px 12px", fontSize:12.5 }}>
                          Mover p/ {sh.emoji} {sh.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🏆 Nota:</span>
                      <input type="number" min={0} max={100} value={scoreVal} onChange={e=>setScoreVal(e.target.value)} placeholder={sel.score!=null?String(sel.score):"—"}
                        style={{ width:90, background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 10px", color:"#f0e9fb", fontSize:13, outline:"none" }} />
                      <button onClick={()=>doSetScore(sel)} disabled={scoreVal===""} style={{ ...styles.btn("#34d399"), padding:"6px 14px", fontSize:12.5, opacity:scoreVal!==""?1:0.5 }}>Alterar nota da atividade</button>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>💌 Boletim:</span>
                      <button onClick={()=>exportBoletins(sel)} disabled={boletimBusy} style={{ ...styles.btn("#ec4899"), padding:"6px 14px", fontSize:12.5, opacity:boletimBusy?0.6:1 }}>{boletimBusy ? "Gerando..." : `Gerar boletim de ${sel.name.split(" ")[0]}`}</button>
                      {boletimMsg && <span style={{ color: boletimMsg.startsWith("✅") ? "#34d399" : boletimMsg.startsWith("❌") ? "#f87171" : "#fbbf24", fontSize:11.5, flex:"1 1 160px" }}>{boletimMsg}</span>}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🧩 Acessibilidade:</span>
                      <button onClick={()=>doToggleAccessMode(sel)} style={{ ...styles.btn(selAccessMode?"#22d3ee":"#3b2a58"), padding:"6px 14px", fontSize:12.5 }}>
                        {selAccessMode ? "✅ Modo Guiado ativado" : "Ativar Modo Guiado"}
                      </button>
                      <span style={{ color:"#776798", fontSize:11.5, flex:"1 1 200px" }}>{selAccessMode ? "O editor de código deste aluno vira uma montagem de blocos clicáveis, com narração por voz." : "Troca o editor de código por blocos clicáveis + narração por voz, para alunos com dificuldade de ler/escrever/digitar."}</span>
                    </div>
                    {(() => {
                      const c = checkinMap[`${sel.shift||"sem-turno"}:${sel.name}`];
                      const mood = c ? checkinMoodInfo(c.mood) : null;
                      return (
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                          <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>😊 Chegou hoje:</span>
                          {mood ? (
                            <span style={{ ...styles.badge("#c084fc"), fontSize:12.5 }}>{mood.emoji} {mood.label} <span style={{ color:"#776798", fontWeight:400 }}>· {new Date(c.at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span></span>
                          ) : (
                            <span style={{ color:"#776798", fontSize:12 }}>Ainda não fez o check-in de hoje.</span>
                          )}
                        </div>
                      );
                    })()}
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-start", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88, paddingTop:6 }}>💙 Apoio:</span>
                      <div style={{ flex:1, minWidth:220 }}>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {[
                            ["sensorial", "🧘 Sensorial", "Modo calmo: sem sons, confete e animações de festa — pra quem se sobrecarrega com estímulos."],
                            ["foco", "🎯 Foco", "Esconde ranking, loja, duelos e curiosidade — sobra só o essencial: editor, Nyx e salvar."],
                            ["leitura", "📖 Leitura", "Letras e linhas mais espaçadas em toda a tela do aluno — ajuda na dislexia."],
                            ["ritmo", "🐢 Ritmo próprio", "Atividade do dia com 4 questões bem diretas em vez de 8 — termina junto com a turma."],
                            ["motora", "🖐️ Motora", "Sugere o tutorial de teclado pra esse aluno automaticamente — ajuda quem tem dificuldade motora pra digitar."],
                            ["visual", "👁️ Visual", "Alto contraste + letras maiores em toda a tela do aluno — ajuda quem tem baixa visão."],
                          ].map(([flag, label, hint]) => {
                            const bySelf = !!(sel.selfSupport && sel.selfSupport[flag]);
                            const active = selSupport[flag] || bySelf;
                            return (
                              <button key={flag} onClick={()=>doToggleSupport(sel, flag, label)} title={bySelf ? `${hint} (o próprio aluno pediu este)` : hint}
                                style={{ background: active ? (bySelf && !selSupport[flag] ? "#a855f7" : "#3b82f6") : "#171026", color: active ? "#fff" : "#a99ac9", border:`1px solid ${active ? (bySelf && !selSupport[flag] ? "#a855f7" : "#3b82f6") : "#3b2a58"}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", fontWeight:800, fontSize:12 }}>
                                {bySelf && !selSupport[flag] ? "🙋 " : active ? "✓ " : ""}{label}
                              </button>
                            );
                          })}
                        </div>
                        <p style={{ color:"#776798", fontSize:11.5, margin:"6px 0 0" }}>Perfis de apoio pra educação inclusiva — a tela do aluno se adapta sozinha. Só você vê essas marcações; os colegas não. <span style={{color:"#a855f7"}}>🙋 roxo</span> = o próprio aluno pediu; clique pra também fixar por sua conta (assim continua ativo mesmo se ele desmarcar).</p>
                      </div>
                    </div>
                    {sel.helpAt && Date.now() - sel.helpAt < 15 * 60 * 1000 && (
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #fbbf24", paddingTop:10, background:"#fbbf2410", borderRadius:8, padding:"10px" }}>
                        <span style={{ color:"#fbbf24", fontSize:13, fontWeight:800 }}>✋ Este aluno pediu ajuda {new Date(sel.helpAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}!</span>
                        <button onClick={()=>markHelped(sel)} style={{ ...styles.btn("#34d399"), padding:"6px 14px", fontSize:12.5 }}>✔ Marcar como atendido</button>
                      </div>
                    )}
                    {sel.errorAt && Date.now() - sel.errorAt < 30 * 60 * 1000 && (
                      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:8, borderTop:"1px solid #f87171", paddingTop:10, background:"#f8717110", borderRadius:8, padding:"10px" }}>
                        <span style={{ color:"#f87171", fontSize:13, fontWeight:800 }}>⚠️ A tela deste aluno deu um erro {new Date(sel.errorAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}: <span style={{ fontWeight:400, color:"#fca5a5" }}>{sel.errorMsg || "sem detalhes"}</span></span>
                      </div>
                    )}
                    {pendingJustifications(sel).length > 0 && (
                      <div style={{ display:"flex", flexDirection:"column", gap:6, borderTop:"1px solid #f87171", paddingTop:10, background:"#f8717110", borderRadius:8, padding:"10px" }}>
                        <span style={{ color:"#f87171", fontSize:13, fontWeight:800 }}>😔 Justificativa(s) de falta pendente(s):</span>
                        {pendingJustifications(sel).map(([d, j]) => {
                          const [y, m, dd] = d.split("-");
                          return (
                            <div key={d} style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                              <span style={{ color:"#f0e9fb", fontSize:12.5 }}>📅 {dd}/{m}/{y}: <i>"{j.text}"</i></span>
                              <button onClick={()=>doApproveJustification(sel, d)} style={{ ...styles.btn("#34d399"), padding:"5px 12px", fontSize:12 }}>✔ Justificar</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>⌨️ Teclado:</span>
                      <button onClick={async ()=>{ await setKeyboardLaunch(sel.shift, sel.name, teacherAuth); flashMgmt(`⌨️ Tutorial de teclado aberto na tela de ${sel.name}.`); }} style={{ ...styles.btn("#22d3ee"), padding:"6px 14px", fontSize:12.5 }}>Abrir na tela do aluno</button>
                      <span style={{ color: sel.keyboardDone ? "#34d399" : "#776798", fontSize:11.5, flex:"1 1 200px" }}>{sel.keyboardDone ? "✅ Já concluiu o tutorial." : "Ainda não concluiu o tutorial."}</span>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🔍 Vistoria:</span>
                      <button onClick={()=>doToggleInspection(sel)} style={{ ...styles.btn(selInspection?"#22d3ee":"#3b2a58"), padding:"6px 14px", fontSize:12.5 }}>
                        {selInspection ? "✅ Vistoria aberta — Encerrar" : "Liberar fora do horário"}
                      </button>
                      <span style={{ color:"#776798", fontSize:11.5, flex:"1 1 200px" }}>{selInspection ? "Esse aluno consegue entrar agora, mesmo fora do horário configurado." : "Se o horário automático estiver fechado, isso libera só ESTE aluno pra você inspecionar o trabalho dele."}</span>
                    </div>
                    {sel.portfolioPublic && (
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                        <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🌟 Portfólio:</span>
                        <span style={{ ...styles.badge("#c084fc"), fontSize:12.5 }}>✅ Link público ativo (ligado pelo aluno)</span>
                        <button onClick={()=>doDisablePortfolio(sel)} style={{ ...styles.btn("#f87171"), padding:"6px 14px", fontSize:12.5 }}>Desativar</button>
                        <span style={{ color:"#776798", fontSize:11.5, flex:"1 1 200px" }}>Qualquer um com o link vê avatar, conquistas e progresso — sem nota comparada, sem dados sensíveis.</span>
                      </div>
                    )}
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>📤 Código:</span>
                      <button onClick={()=>doSendClassCode(sel)} style={{ ...styles.btn("#22d3ee"), padding:"6px 14px", fontSize:12.5 }}>Enviar código da turma</button>
                      <span style={{ color:"#776798", fontSize:11.5, flex:"1 1 200px" }}>Manda todos os arquivos da aba "Meu código" (turno {shiftLabel(sel.shift)}) direto pro editor deste aluno.</span>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>📄 PDF do dia:</span>
                      <button onClick={()=>{
                        const dayFiles = (proFilesByShift[sel.shift] || []).filter(f => (f.code||"").trim());
                        setDailyPdfCode(dayFiles.map(f => `// ===== ${f.name} =====\n${f.code}`).join("\n\n"));
                        setDailyPdfMsg("");
                        setDailyPdfModal({ shift: sel.shift, studentName: sel.name });
                      }} disabled={dailyPdfBusy} style={{ ...styles.btn("#fbbf24"), padding:"6px 14px", fontSize:12.5, opacity: dailyPdfBusy ? 0.7 : 1 }}>
                        {dailyPdfBusy ? "⏳ Gerando..." : "Gerar resumo de hoje em PDF"}
                      </button>
                      <span style={{ color:"#776798", fontSize:11.5, flex:"1 1 200px" }}>Confirme o código de hoje e o Nyx gera a explicação — bom pra mandar pra quem faltou.</span>
                      {dailyPdfMsg && <p style={{ width:"100%", margin:0, color: dailyPdfMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:11.5 }}>{dailyPdfMsg}</p>}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🗑️ Perfil:</span>
                      {confirmDelete ? (
                        <>
                          <span style={{ color:"#f87171", fontSize:13 }}>Excluir <b>{sel.name}</b> e tudo o que ele fez? Não dá para desfazer.</span>
                          <button onClick={()=>doDeleteStudent(sel)} style={{ ...styles.btn("#f87171"), padding:"6px 14px", fontSize:12.5 }}>Sim, excluir</button>
                          <button onClick={()=>setConfirmDelete(false)} style={{ ...styles.btn("#3b2a58"), padding:"6px 14px", fontSize:12.5 }}>Cancelar</button>
                        </>
                      ) : (
                        <button onClick={()=>setConfirmDelete(true)} style={{ ...styles.btn("#f87171"), padding:"6px 14px", fontSize:12.5 }}>Excluir perfil do aluno</button>
                      )}
                    </div>
                  </div>
                </div>
                {Array.isArray(sel.files) && sel.files.length>0 ? sel.files.map((f,i)=>(
                  <div key={i} className="cardfx" style={styles.card}>
                    <h4 style={{ color:"#c084fc", marginBottom:8 }}>📄 {f.name}</h4>
                    <pre style={{ background:"#1e1e1e", padding:12, borderRadius:8, fontFamily:"monospace", fontSize:13, color:"#a5f3fc", overflow:"auto", maxHeight:240, whiteSpace:"pre-wrap" }}>{f.code || "(vazio)"}</pre>
                  </div>
                )) : sel.code && (
                  <div className="cardfx" style={styles.card}>
                    <h4 style={{ color:"#c084fc", marginBottom:8 }}>💻 Código</h4>
                    <pre style={{ background:"#1e1e1e", padding:12, borderRadius:8, fontFamily:"monospace", fontSize:13, color:"#a5f3fc", overflow:"auto", maxHeight:240, whiteSpace:"pre-wrap" }}>{sel.code}</pre>
                  </div>
                )}
                {sel.scoreHistory && Object.keys(sel.scoreHistory).length > 0 && (
                  <div className="cardfx" style={styles.card}>
                    <h4 style={{ color:"#c084fc", marginBottom:12 }}>📈 Histórico de notas (atividades)</h4>
                    <PerformanceChart entries={Object.entries(sel.scoreHistory).sort(([a],[b])=>a.localeCompare(b))} />
                  </div>
                )}
                {sel.feedback && <div className="cardfx" style={styles.card}><h4 style={{ color:"#c084fc", marginBottom:6 }}>🤖 Nyx (último aviso)</h4><p style={{ color:sel.feedback.ok?"#34d399":"#f87171", fontSize:13 }}>{sel.feedback.ok?"✅":"⚠"} {sel.feedback.message}</p></div>}
                {sel.answers && sel.dynamicActivity && (
                  <div className="cardfx" style={styles.card}>
                    <h4 style={{ color:"#c084fc", marginBottom:10 }}>📝 Atividade</h4>
                    {sel.dynamicActivity.map((q,i)=>(
                      <div key={i} style={{ marginBottom:10, background:"#171026", borderRadius:8, padding:"8px 12px" }}>
                        <p style={{ fontSize:13, color:"#a99ac9", marginBottom:4 }}>{i+1}. {q.q}</p>
                        <span style={styles.badge(sel.answers[i]===q.correct?"#34d399":"#f87171")}>{sel.answers[i]===q.correct?"✅ Correto":"❌ Errado"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {sel.finalFeedback && (() => {
                  const fb = sel.finalFeedback;
                  const st = fb && typeof fb === "object" && Array.isArray(fb.secoes);
                  const text = st ? [fb.intro, ...fb.secoes.map(s=>`${s.titulo}: ${s.explicacao}`), fb.dica ? `Dica: ${fb.dica}` : ""].filter(Boolean).join("\n") : (typeof fb === "string" ? fb : "");
                  return text ? <div className="cardfx" style={styles.card}><h4 style={{ color:"#c084fc", marginBottom:8 }}>🤖 Feedback do Nyx ao aluno</h4><p style={{ color:"#d6c9ec", fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{text}</p></div> : null;
                })()}
              </>
            ) : (
              <div className="cardfx" style={{ ...styles.card, textAlign:"center", padding:40 }}>
                <div style={{ fontSize:36 }}>👆</div>
                <p style={{ color:"#776798" }}>Clique em um aluno no monitoramento para ver o código, a atividade e os detalhes.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────── MEU CÓDIGO (exemplo da aula, do professor) — layout expandido tipo "tela cheia" ─────────── */}
      {tab==="code" && (
          <div style={{ padding:"8px 14px 14px" }}>
            <div data-tour-prof="code-info" className="cardfx" style={{ ...styles.card, padding:12, margin:"6px 0" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:"1 1 260px" }}>
                  <h3 style={{ color:"#fbbf24", margin:0, fontSize:15 }}>👨‍💻 Meu código</h3>
                  <p style={{ color:"#a99ac9", fontSize:12.5, margin:"3px 0 0", lineHeight:1.5 }}>Cada turma tem seu próprio exemplo. Programe aqui e gere o nome do conteúdo a partir dele — é isso que aparece no calendário.</p>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button style={{ ...styles.btn("#34d399"), padding:"7px 12px", fontSize:12.5 }} onClick={()=>setShowLessons(true)} title="Sua biblioteca de aulas: salve o código atual com um nome e reutilize quando quiser">📚 Minhas aulas</button>
                  <button style={{ ...styles.btn("#c084fc"), opacity:genName?0.6:1, padding:"7px 12px", fontSize:12.5 }} onClick={()=>generateContentName(codeShift)} disabled={genName}>{genName?"Gerando...":`✨ Gerar nome do conteúdo (${shiftMeta(codeShift).label})`}</button>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                {SHIFTS.map(sh => (
                  <button key={sh.id} onClick={()=>setCodeShift(sh.id)} style={styles.tab(codeShift===sh.id)}>{sh.emoji} {sh.label}</button>
                ))}
              </div>
              {contentFor(codeShift) && <p style={{ color:"#34d399", fontSize:13, fontWeight:600, margin:"8px 0 0" }}>📖 Conteúdo de hoje ({shiftMeta(codeShift).label}): {contentFor(codeShift)}</p>}
              {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:12.5, margin:"8px 0 0", lineHeight:1.5 }}>{nameMsg}</p>}
            </div>
            <CodeLab key={codeShift} accent="#fbbf24" files={proFiles} onChange={setProFiles} terminalMaxHeight={420} gear={meta.nyxGear||DEFAULT_NYX_GEAR} onEquip={saveTeacherGear} />
          </div>
      )}

      {/* ─────────── CALENDÁRIO ─────────── */}
      {tab==="calendar" && (
        <div style={{ display:"flex", gap:14, padding:14, maxWidth:900, margin:"0 auto", alignItems:"flex-start", flexWrap:"wrap" }}>
          <div data-tour-prof="calendar-body" className="cardfx" style={{ ...styles.card, flex:"1 1 380px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:12 }}>
              <h3 style={{ color:"#fbbf24", margin:0 }}>🗓️ Calendário de aulas</h3>
              <div style={{ display:"flex", gap:8 }}>
                {SHIFTS.map(sh => (
                  <button key={sh.id} onClick={()=>setCodeShift(sh.id)} style={styles.tab(codeShift===sh.id)}>{sh.emoji} {sh.label}</button>
                ))}
              </div>
            </div>
            <p style={{ color:"#a99ac9", fontSize:13, marginBottom:12 }}>Os dias com aula ficam em verde (são marcados sozinhos quando há alunos online, e você também pode clicar para marcar/desmarcar). O 📖 indica os dias que já têm conteúdo gerado para a turma {shiftMeta(codeShift).label} — passe o mouse para ver o tema.</p>
            <Calendar classDays={meta.classDays||[]} contentNames={calContentNames} onToggle={toggleClassDay} />
          </div>
          <div data-tour-prof="cidade" className="cardfx" style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:12 }}>📍 Sua cidade no DF</h3>
            <input list="df-cities" value={cityInput} onChange={e=>setCityInput(e.target.value)} onBlur={saveCity} placeholder="Ex: Ceilândia"
              style={{ width:"100%", background:"#171026", border:"2px solid #3b2a58", borderRadius:10, padding:"10px 12px", color:"#f0e9fb", fontSize:15, boxSizing:"border-box" }} />
            <datalist id="df-cities">{DF_CITIES.map(c=><option key={c} value={c} />)}</datalist>
            <button style={{ ...styles.btn("#c084fc"), marginTop:10 }} onClick={saveCity}>Salvar cidade</button>
            {meta.city && <p style={{ color:"#34d399", fontSize:13, marginTop:10 }}>Cidade salva: {meta.city}</p>}
            <hr style={{ borderColor:"#3b2a58", margin:"14px 0" }}/>
            <p style={{ color:"#a99ac9", fontSize:13 }}>Total de dias de aula registrados: <b style={{ color:"#f0e9fb" }}>{(meta.classDays||[]).length}</b></p>
            <hr style={{ borderColor:"#3b2a58", margin:"14px 0" }}/>
            <p style={{ color:"#fbbf24", fontWeight:700, fontSize:13, marginBottom:6 }}>🏆 Hall da Fama</p>
            <p style={{ color:"#a99ac9", fontSize:12.5, lineHeight:1.6, margin:"0 0 10px" }}>Quando a carreta for mudar de cidade, encerre aqui: guarda uma placa com quem mais se destacou, pros alunos da próxima cidade verem, e baixa um relatório de despedida em PDF pra você guardar. Não apaga nada da turma atual — exceto a data de nascimento e o CPF de todos, que somem pra sempre (nem você mais tem acesso).</p>
            {confirmCloseCity ? (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button style={{ ...styles.btn("#fbbf24"), opacity:farewellBusy?0.6:1 }} onClick={doCloseCity} disabled={farewellBusy}>{farewellBusy ? "Gerando relatório..." : `Sim, encerrar ${meta.city || "a cidade"}`}</button>
                <button style={styles.btn("#3b2a58")} onClick={()=>setConfirmCloseCity(false)} disabled={farewellBusy}>Cancelar</button>
              </div>
            ) : (
              <button style={{ ...styles.btn("#fbbf24"), width:"100%" }} onClick={()=>setConfirmCloseCity(true)}>🏆 Encerrar cidade e gerar placa + relatório</button>
            )}
            {hallMsg && <p style={{ color: hallMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:12.5, marginTop:8, lineHeight:1.5 }}>{hallMsg}</p>}
            <button style={{ ...styles.btn("#06b6d4"), width:"100%", marginTop:10 }} onClick={()=>{ getHallOfFame().then(setTripHallEntries); setShowTripOverview(true); }}>📊 Visão da Viagem</button>
          </div>
          <div data-tour-prof="backup" className="cardfx" style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:4 }}>💾 Backup automático</h3>
            <p style={{ color:"#a99ac9", fontSize:12.5, margin:"0 0 12px", lineHeight:1.6 }}>Todo dia de madrugada o Nyx guarda uma cópia de segurança de tudo sozinho, sem precisar fazer nada. Aqui você confere quando foi o último e pode forçar um agora se quiser.</p>
            {autoBackupList === null ? (
              <button style={{ ...styles.btn("#3b2a58"), width:"100%" }} onClick={loadAutoBackups}>Ver backups</button>
            ) : autoBackupList.length === 0 ? (
              <p style={{ color:"#776798", fontSize:12.5 }}>Nenhum backup ainda — o primeiro roda sozinho na próxima madrugada, ou clique abaixo pra fazer um agora.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:120, overflowY:"auto", marginBottom:10 }}>
                {autoBackupList.slice(0,6).map(b => {
                  const dt = b.key.replace("backup:","");
                  const d = new Date(dt);
                  return <span key={b.key} style={{ color:"#a99ac9", fontSize:11.5 }}>🗓️ {isNaN(d) ? dt : d.toLocaleString("pt-BR")} · {(b.size/1024).toFixed(0)}KB</span>;
                })}
              </div>
            )}
            <button style={{ ...styles.btn("#c084fc"), width:"100%", marginTop:8, opacity:autoBackupBusy?0.6:1 }} onClick={doAutoBackupNow} disabled={autoBackupBusy}>{autoBackupBusy ? "Fazendo backup..." : "💾 Fazer backup agora"}</button>
            {autoBackupMsg && <p style={{ color: autoBackupMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:12.5, marginTop:8 }}>{autoBackupMsg}</p>}
          </div>
          <div data-tour-prof="relatorio" className="cardfx" style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:4 }}>📄 Relatório de Comprovação</h3>
            <p style={{ color:"#a99ac9", fontSize:12.5, margin:"0 0 12px", lineHeight:1.6 }}>Gera o relatório oficial (mesmo modelo, só preenchido) com todos os alunos de Matutino e Vespertino: nome, CPF, nota e fotos do código/notas/prova de cada um. Baixa como .docx — dá pra editar depois. Clique no fim do mês.</p>
            <button style={{ ...styles.btn("#fbbf24"), width:"100%", opacity:relatorioBusy?0.6:1 }} onClick={doGerarRelatorio} disabled={relatorioBusy}>{relatorioBusy ? "Gerando relatório..." : "📄 Gerar Relatório de Comprovação"}</button>
            {relatorioMsg && <p style={{ color: relatorioMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:12.5, marginTop:8 }}>{relatorioMsg}</p>}
          </div>
          <div data-tour-prof="horario" className="cardfx" style={{ ...styles.card, flex:"1 1 300px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:4 }}>🕐 Horário da turma ({shiftMeta(codeShift).label})</h3>
            <p style={{ color:"#a99ac9", fontSize:12.5, margin:"0 0 12px", lineHeight:1.6 }}>Defina o horário e o Nyx libera/bloqueia o perfil dos alunos sozinho. Deixe em branco pra não restringir nada.</p>
            {(() => {
              const sc = schedule[codeShift] || {};
              const setSc = (patch) => setSchedule(prev => ({ ...prev, [codeShift]: { ...(prev[codeShift]||{}), ...patch } }));
              const status = classStatus(sc, meta.allowWeekend);
              return (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    <label style={{ fontSize:11.5, color:"#a99ac9" }}>Início da aula
                      <input type="time" value={sc.start||""} onChange={e=>setSc({start:e.target.value})} style={{ width:"100%", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 8px", color:"#f0e9fb", fontSize:13, marginTop:3 }} />
                    </label>
                    <label style={{ fontSize:11.5, color:"#a99ac9" }}>Fim da aula
                      <input type="time" value={sc.end||""} onChange={e=>setSc({end:e.target.value})} style={{ width:"100%", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 8px", color:"#f0e9fb", fontSize:13, marginTop:3 }} />
                    </label>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                    <label style={{ fontSize:11.5, color:"#a99ac9" }}>Início do intervalo
                      <input type="time" value={sc.breakStart||""} onChange={e=>setSc({breakStart:e.target.value})} style={{ width:"100%", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 8px", color:"#f0e9fb", fontSize:13, marginTop:3 }} />
                    </label>
                    <label style={{ fontSize:11.5, color:"#a99ac9" }}>Duração (min)
                      <input type="number" min={0} value={sc.breakMin||""} onChange={e=>setSc({breakMin:e.target.value})} placeholder="ex: 15" style={{ width:"100%", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 8px", color:"#f0e9fb", fontSize:13, marginTop:3, boxSizing:"border-box" }} />
                    </label>
                  </div>
                  <button style={{ ...styles.btn("#c084fc"), width:"100%", padding:"8px 0", fontSize:13 }} onClick={saveSchedule}>💾 Salvar horário</button>
                  {scheduleMsg && <p style={{ color:"#34d399", fontSize:12, margin:"8px 0 0" }}>{scheduleMsg}</p>}
                  <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, fontSize:12.5, color:"#a99ac9", cursor:"pointer" }}>
                    <input type="checkbox" checked={!!meta.allowWeekend} onChange={toggleAllowWeekend} style={{ width:16, height:16, accentColor:"#c084fc" }} />
                    Permitir aulas no fim de semana (por padrão, sábado e domingo ficam fechados)
                  </label>
                  <p style={{ fontSize:12, margin:"10px 0 0", fontWeight:700, color: !status.configured ? "#776798" : status.isWeekend ? "#818cf8" : status.open ? (status.inBreak ? "#22d3ee" : "#34d399") : "#f87171" }}>
                    {!status.configured ? "⚪ Sem restrição — aberto o dia todo" : status.isWeekend ? "🌙 Fechado — fim de semana" : status.inBreak ? `🍎 Em intervalo agora (volta em ${status.minutesToBreakEnd}min)` : status.open ? "🟢 Aula liberada agora" : status.before ? `🔴 Fechado — abre às ${sc.start}` : "🔴 Fechado — aula já encerrou hoje"}
                  </p>
                </>
              );
            })()}
          </div>
          <div className="cardfx" style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:8 }}>📖 Conteúdo de hoje ({shiftMeta(codeShift).label})</h3>
            {contentFor(codeShift)
              ? <p style={{ color:"#34d399", fontSize:16, fontWeight:600, lineHeight:1.5, margin:"4px 0 12px" }}>{contentFor(codeShift)}</p>
              : <p style={{ color:"#a99ac9", fontSize:13, lineHeight:1.6, margin:"4px 0 12px" }}>Ainda não gerado. Programe o exemplo do dia na aba <b>Meu código</b> e clique abaixo para criar um nome automático.</p>}
            <button style={{ ...styles.btn("#c084fc"), width:"100%", opacity:genName?0.6:1 }} onClick={()=>generateContentName(codeShift)} disabled={genName}>{genName?"Gerando...":"✨ Gerar nome do conteúdo de hoje"}</button>
            {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:12, marginTop:10, lineHeight:1.5 }}>{nameMsg}</p>}
          </div>
        </div>
      )}

      {/* ─────────── FEEDBACK DOS ALUNOS ─────────── */}
      {tab==="feedback" && (
        <div style={{ padding:14, maxWidth:760, margin:"0 auto" }}>
          <div data-tour-prof="feedback-body" className="cardfx" style={styles.card}>
            <h3 style={{ color:"#fbbf24", marginBottom:12 }}>💬 Feedback dos alunos sobre as aulas</h3>
            <p style={{ color:"#a99ac9", fontSize:12.5, margin:"-4px 0 12px" }}>Do mais recente para o mais antigo, com a turma de cada aluno.</p>
            {feedbacks.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>Nenhum aluno enviou feedback ainda. Eles podem avaliar ao terminar a aula.</p> : (
              feedbacks.map(s=>(
                <div key={s.name} style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:10, padding:14, marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                    <Avatar cfg={s.avatar} size={30} />
                    <b>{s.name}</b>
                    <span style={{ ...styles.badge(s.shift===TEST_SHIFT.id?"#a855f7":"#c084fc"), fontWeight:700 }}>{shiftLabel(s.shift)}</span>
                    <span style={{ color:"#fbbf24" }}>{"★".repeat(s.classFeedback.rating||0)}{"☆".repeat(5-(s.classFeedback.rating||0))}</span>
                    <span style={{ color:"#776798", fontSize:11, marginLeft:"auto", whiteSpace:"nowrap" }}>🕒 {dataHora(s.classFeedback.at)}</span>
                  </div>
                  {(s.classFeedback.text||"").trim() ? <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.6 }}>{s.classFeedback.text}</p> : <p style={{ color:"#776798", fontSize:13 }}>(sem comentário escrito)</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────── PROVA ─────────── */}
      {tab==="quiz" && (() => {
        const allThemes = [...QUIZ_SEED_THEMES, ...quizThemes];
        const room = quizRoom;
        const players = room ? students.filter(s => s.quizJoin && s.quizJoin.code === room.code) : [];
        const medal = (i) => i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}º`;
        // ── sem sala aberta: lista de temas + editor de tema ──
        if (!room) return (
          <div style={{ padding:14, maxWidth:900, margin:"0 auto" }}>
            <div data-tour-prof="quiz-body" className="cardfx" style={{ ...styles.card, borderColor:"#c084fc" }}>
              <h3 style={{ color:"#c084fc", marginBottom:6 }}>🎉 Quiz da Turma (estilo Kahoot)</h3>
              <p style={{ color:"#a99ac9", fontSize:13, lineHeight:1.6, margin:"0 0 14px" }}>Escolha um tema e crie uma sala: um código aparece na sua tela, e na tela dos alunos acende um botão pra entrar com esse código. Cada pergunta vale até 1000 pontos — quanto mais rápido responder, mais pontos (difíceis valem em dobro).</p>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                <span style={{ color:"#a99ac9", fontSize:13 }}>⏱ Tempo por pergunta:</span>
                {QUIZ_TIMER_OPTIONS.map(s => (
                  <button key={s} onClick={()=>setQuizSecs(s)}
                    style={{ background: quizSecs===s ? "linear-gradient(135deg,#c084fc,#9333ea)" : "#171026", color: quizSecs===s ? "#fff" : "#a99ac9", border:`2px solid ${quizSecs===s?"#c084fc":"#3b2a58"}`, borderRadius:10, padding:"5px 12px", fontSize:13, fontWeight:800, cursor:"pointer" }}>
                    {s}s
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {allThemes.map(t => (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, background:"#171026", border:"1px solid #3b2a58", borderRadius:10, padding:"10px 14px", flexWrap:"wrap" }}>
                    <span style={{ color:"#f0e9fb", fontWeight:700, flex:"1 1 200px" }}>{t.title}</span>
                    <span style={{ ...styles.badge("#a99ac9"), fontSize:11 }}>{t.questions.length} perguntas</span>
                    {t.builtin && <span style={{ ...styles.badge("#22d3ee"), fontSize:11 }}>pronto de fábrica</span>}
                    <button onClick={()=>startQuizRoom(t)} style={{ ...styles.btn("#c084fc"), padding:"7px 16px", fontSize:13 }}>▶ Criar sala</button>
                    {!t.builtin && <button onClick={()=>{ setQuizEditingTheme({ ...t, questions:[...t.questions] }); }} style={{ ...styles.btn("#3b2a58"), padding:"7px 12px", fontSize:13 }}>✏️</button>}
                    {!t.builtin && <button onClick={()=>deleteQuizTheme(t.id)} style={{ ...styles.btn("#f87171"), padding:"7px 12px", fontSize:13 }}>🗑️</button>}
                  </div>
                ))}
              </div>
              {!quizEditingTheme && (
                <button onClick={()=>{ setQuizEditingTheme({ title:"", questions:[] }); setQuizQDraft({ q:"", opts:["","","",""], correct:0, hard:false }); }} style={{ ...styles.btn("#34d399"), marginTop:12, padding:"9px 18px", fontSize:13.5 }}>➕ Novo tema</button>
              )}
            </div>
            {quizEditingTheme && (
              <div className="cardfx" style={{ ...styles.card, borderColor:"#34d399" }}>
                <h4 style={{ color:"#34d399", marginBottom:10 }}>{quizEditingTheme.id ? "✏️ Editando tema" : "➕ Novo tema"}</h4>
                <input value={quizEditingTheme.title} onChange={e=>setQuizEditingTheme(t=>({ ...t, title:e.target.value }))} placeholder="Nome do tema (ex: Sistema Solar)"
                  style={{ width:"100%", background:"#171026", border:"2px solid #3b2a58", borderRadius:10, padding:"10px 12px", color:"#f0e9fb", fontSize:14, outline:"none", boxSizing:"border-box" }} />
                {quizEditingTheme.questions.length > 0 && (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:12 }}>
                    {quizEditingTheme.questions.map((q,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"6px 10px" }}>
                        <span style={{ color:"#d6c9ec", fontSize:12.5, flex:1 }}>{i+1}. {q.q} {q.hard && "⭐"}</span>
                        <span style={{ color:"#34d399", fontSize:11.5 }}>✓ {q.opts[q.correct]}</span>
                        <button onClick={()=>setQuizEditingTheme(t=>({ ...t, questions:t.questions.filter((_,j)=>j!==i) }))} style={{ background:"transparent", border:"none", color:"#f87171", cursor:"pointer", fontSize:14 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background:"#171026", border:"1px dashed #3b2a58", borderRadius:12, padding:14, marginTop:12 }}>
                  <input value={quizQDraft.q} onChange={e=>setQuizQDraft(d=>({ ...d, q:e.target.value }))} placeholder="Pergunta"
                    style={{ width:"100%", background:"#1e1430", border:"2px solid #3b2a58", borderRadius:8, padding:"9px 12px", color:"#f0e9fb", fontSize:13.5, outline:"none", boxSizing:"border-box" }} />
                  <p style={{ color:"#776798", fontSize:11.5, margin:"10px 0 6px" }}>Alternativas (deixe as duas últimas em branco pra fazer Verdadeiro/Falso) — clique na forma pra marcar a certa:</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {quizQDraft.opts.map((opt,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <button onClick={()=>setQuizQDraft(d=>({ ...d, correct:i }))} title="Marcar como correta"
                          style={{ background:QUIZ_COLORS[i].bg, opacity:quizQDraft.correct===i?1:0.35, border:quizQDraft.correct===i?"2px solid #fff":"2px solid transparent", borderRadius:8, width:34, height:34, color:"#fff", fontWeight:900, cursor:"pointer", flexShrink:0 }}>{quizQDraft.correct===i?"✓":QUIZ_COLORS[i].shape}</button>
                        <input value={opt} onChange={e=>setQuizQDraft(d=>({ ...d, opts:d.opts.map((o,j)=>j===i?e.target.value:o) }))} placeholder={`Alternativa ${i+1}${i>=2?" (opcional)":""}`}
                          style={{ flex:1, background:"#1e1430", border:"2px solid #3b2a58", borderRadius:8, padding:"8px 10px", color:"#f0e9fb", fontSize:12.5, outline:"none", minWidth:0 }} />
                      </div>
                    ))}
                  </div>
                  <label style={{ display:"flex", alignItems:"center", gap:6, marginTop:10, fontSize:12.5, color:"#fbbf24", cursor:"pointer" }}>
                    <input type="checkbox" checked={quizQDraft.hard} onChange={e=>setQuizQDraft(d=>({ ...d, hard:e.target.checked }))} />
                    ⭐ Difícil (vale pontos em dobro)
                  </label>
                  <button onClick={()=>{
                    const opts = quizQDraft.opts.map(o=>o.trim());
                    while (opts.length > 2 && !opts[opts.length-1]) opts.pop();
                    if (!quizQDraft.q.trim() || opts.some(o=>!o) || quizQDraft.correct >= opts.length) return;
                    setQuizEditingTheme(t=>({ ...t, questions:[...t.questions, { q:quizQDraft.q.trim(), opts, correct:quizQDraft.correct, ...(quizQDraft.hard?{hard:true}:{}) }] }));
                    setQuizQDraft({ q:"", opts:["","","",""], correct:0, hard:false });
                  }} style={{ ...styles.btn("#22d3ee"), marginTop:10, padding:"8px 16px", fontSize:13 }}>＋ Adicionar pergunta</button>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  <button onClick={saveQuizTheme} disabled={!quizEditingTheme.title.trim() || !quizEditingTheme.questions.length}
                    style={{ ...styles.btn("#34d399"), flex:1, padding:"10px 0", fontSize:13.5, opacity:(!quizEditingTheme.title.trim() || !quizEditingTheme.questions.length)?0.5:1 }}>💾 Salvar tema</button>
                  <button onClick={()=>setQuizEditingTheme(null)} style={{ ...styles.btn("#3b2a58"), flex:1, padding:"10px 0", fontSize:13.5 }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        );
        // ── lobby: código gigante + jogadores entrando ──
        if (room.status === "lobby") return (
          <div style={{ padding:14, maxWidth:760, margin:"0 auto" }}>
            <div className="cardfx" style={{ ...styles.card, borderColor:"#c084fc", textAlign:"center" }}>
              <p style={{ color:"#a99ac9", fontSize:14, margin:"6px 0 0" }}>{room.themeTitle} · {room.questions.length} perguntas · ⏱ {quizSecsOf(room)}s por pergunta</p>
              <p style={{ color:"#a99ac9", fontSize:13, margin:"14px 0 4px" }}>Código da sala — fale pra turma digitar:</p>
              <div style={{ fontSize:"clamp(44px, 10vw, 72px)", fontWeight:900, letterSpacing:10, color:"#c084fc", textShadow:"0 0 30px #c084fc66" }}>{room.code}</div>
              <div style={{ marginTop:16 }}>
                <p style={{ color:"#f0e9fb", fontWeight:800, fontSize:15, marginBottom:10 }}>👥 Na sala ({players.length})</p>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center", minHeight:44 }}>
                  {players.length===0 && <span style={{ color:"#776798", fontSize:13 }}>Esperando a galera entrar...</span>}
                  {players.map(p => (
                    <span key={p.name} className="pop" style={{ display:"flex", alignItems:"center", gap:6, background:"#171026", border:"1px solid #c084fc55", borderRadius:20, padding:"5px 12px" }}>
                      <Avatar cfg={p.avatar} size={22} /><span style={{ fontSize:13, fontWeight:700 }}>{String(p.name).split(" ")[0]}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"center" }}>
                <button onClick={quizNextQuestion} disabled={players.length===0} style={{ ...styles.btn("#34d399"), padding:"12px 34px", fontSize:16, opacity:players.length===0?0.5:1 }}>🚀 Começar!</button>
                <button onClick={quizEnd} style={{ ...styles.btn("#f87171"), padding:"12px 20px", fontSize:14 }}>✖ Cancelar sala</button>
              </div>
            </div>
          </div>
        );
        // ── pódio final ──
        if (room.status === "podium") {
          const board = quizLeaderboard(room, students);
          return (
            <div style={{ padding:14, maxWidth:760, margin:"0 auto" }}>
              <div className="cardfx" style={{ ...styles.card, borderColor:"#fbbf24", textAlign:"center" }}>
                <h3 style={{ color:"#fbbf24", fontSize:24, marginBottom:4 }}>🏆 Pódio — {room.themeTitle}</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:14 }}>
                  {board.length===0 && <p style={{ color:"#776798" }}>Ninguém pontuou.</p>}
                  {board.map((p,i) => (
                    <div key={p.name} style={{ display:"flex", alignItems:"center", gap:10, background:i<3?"#fbbf2415":"#171026", border:`1px solid ${i<3?"#fbbf24":"#3b2a58"}`, borderRadius:10, padding:"9px 14px" }}>
                      <span style={{ fontSize:i<3?24:14, width:40, fontWeight:800, color:"#a99ac9" }}>{medal(i)}</span>
                      <Avatar cfg={p.avatar} size={30} />
                      <span style={{ flex:1, textAlign:"left", fontWeight:800, fontSize:15 }}>{p.name}</span>
                      <span style={{ color:"#fbbf24", fontWeight:900, fontSize:16 }}>{p.total} pts</span>
                    </div>
                  ))}
                </div>
                <button onClick={quizEnd} style={{ ...styles.btn("#c084fc"), marginTop:18, padding:"11px 30px", fontSize:14.5 }}>✔ Encerrar quiz</button>
              </div>
            </div>
          );
        }
        // ── pergunta rolando / revelação ──
        const q = room.questions[room.qIndex];
        const startedAt = room.startedAts[room.qIndex];
        const remaining = room.status==="question" ? Math.max(0, Math.ceil((startedAt + quizSecsOf(room)*1000 - quizNow)/1000)) : 0;
        const answeredCount = players.filter(p => (p.quizAnswers||{})[room.qIndex] != null).length;
        const optCount = (i) => players.filter(p => ((p.quizAnswers||{})[room.qIndex]||{}).opt === i).length;
        const board = quizLeaderboard(room, students).slice(0, 5);
        return (
          <div style={{ padding:14, maxWidth:860, margin:"0 auto" }}>
            <div className="cardfx" style={{ ...styles.card, borderColor:"#c084fc" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <span style={{ ...styles.badge("#c084fc") }}>Pergunta {room.qIndex+1} / {room.questions.length}</span>
                {q.hard && <span style={{ ...styles.badge("#fbbf24") }}>⭐ Vale em dobro</span>}
                {room.status==="question"
                  ? <span style={{ fontSize:30, fontWeight:900, color: remaining<=5 ? "#f87171" : "#34d399", fontVariantNumeric:"tabular-nums" }}>⏱ {remaining}s</span>
                  : <span style={{ ...styles.badge("#34d399") }}>Resposta revelada</span>}
              </div>
              <h3 style={{ color:"#f0e9fb", fontSize:"clamp(18px, 3.4vw, 26px)", lineHeight:1.4, margin:"14px 0" }}>{q.q}</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {q.opts.map((opt,i) => {
                  const isCorrect = i === q.correct;
                  const dim = room.status==="reveal" && !isCorrect;
                  return (
                    <div key={i} style={{ background:QUIZ_COLORS[i].bg, opacity:dim?0.3:1, borderRadius:12, padding:"16px 14px", color:"#fff", fontWeight:800, fontSize:15.5, display:"flex", alignItems:"center", gap:10, border: room.status==="reveal" && isCorrect ? "3px solid #fff" : "3px solid transparent" }}>
                      <span style={{ fontSize:20 }}>{QUIZ_COLORS[i].shape}</span>
                      <span style={{ flex:1 }}>{opt}</span>
                      {room.status==="reveal" && <span style={{ background:"#00000044", borderRadius:14, padding:"2px 10px", fontSize:13 }}>{optCount(i)} voto{optCount(i)!==1?"s":""}</span>}
                      {room.status==="reveal" && isCorrect && <span style={{ fontSize:20 }}>✅</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14, flexWrap:"wrap", gap:10 }}>
                <span style={{ color:"#a99ac9", fontSize:14 }}>✋ {answeredCount} de {players.length} responderam</span>
                {room.status==="question"
                  ? <button onClick={quizReveal} style={{ ...styles.btn("#fbbf24"), padding:"10px 22px", fontSize:14 }}>⏹ Encerrar pergunta</button>
                  : <button onClick={quizNextQuestion} style={{ ...styles.btn("#34d399"), padding:"10px 22px", fontSize:14 }}>{room.qIndex+1 < room.questions.length ? "Próxima ▶" : "🏆 Ver pódio"}</button>}
              </div>
            </div>
            {room.status==="reveal" && board.length > 0 && (
              <div className="cardfx" style={{ ...styles.card, borderColor:"#fbbf24" }}>
                <h4 style={{ color:"#fbbf24", marginBottom:10 }}>🏆 Placar parcial</h4>
                {board.map((p,i) => (
                  <div key={p.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 0", borderBottom:"1px solid #241f38" }}>
                    <span style={{ width:34, fontWeight:800, color:"#a99ac9" }}>{medal(i)}</span>
                    <span style={{ flex:1, fontWeight:700, fontSize:14 }}>{p.name}</span>
                    <span style={{ color:"#fbbf24", fontWeight:900 }}>{p.total} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {tab==="exam" && (() => {
        // cada turma tem sua própria prova independente (ver storage.js) — usa o mesmo filtro de
        // turma (shiftFilter) do topo da tela pra saber qual prova mostrar/gerenciar aqui
        const examStudents = (examConfig.shift && examConfig.shift !== "all") ? students.filter(s=>(s.shift||"sem-turno")===examConfig.shift) : students;
        const readyStudents = examStudents.filter(s => s.examReady);
        const doneStudents  = examStudents.filter(s => s.examDone);
        const ranking = [...examStudents].filter(s=>s.examScore!=null).sort((a,b)=>(b.examScore||0)-(a.examScore||0));
        const qLen = (examConfig.questions||[]).length;
        const medal = (i) => i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
        return (
          <div style={{ padding:14, maxWidth:900, margin:"0 auto" }}>
            <p style={{ color:"#776798", fontSize:11.5, margin:"-4px 0 14px" }}>💡 Cada turma (filtro "Turma" lá em cima) tem sua própria prova, independente das outras — pode ter uma em andamento pra manhã e criar outra diferente pra tarde ao mesmo tempo.</p>

            {/* confirmação de encerrar */}
            {confirmEndExam && (
              <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
                <div style={{ background:"#1e1430", border:"2px solid #fbbf24", borderRadius:16, padding:24, maxWidth:400, width:"100%" }}>
                  <div style={{ fontSize:40, textAlign:"center" }}>⚠️</div>
                  <h3 style={{ color:"#fbbf24", textAlign:"center", margin:"8px 0" }}>Encerrar a prova agora?</h3>
                  <p style={{ color:"#d6c9ec", fontSize:14, textAlign:"center", lineHeight:1.6 }}>Os alunos que ainda não terminaram terão a pontuação parcial registrada.</p>
                  <div style={{ display:"flex", gap:10, marginTop:18 }}>
                    <button onClick={()=>setConfirmEndExam(false)} style={{ ...styles.btn("#3b2a58"), flex:1 }}>Cancelar</button>
                    <button onClick={endExam} style={{ ...styles.btn("#f87171"), flex:1 }}>Encerrar</button>
                  </div>
                </div>
              </div>
            )}

            {/* estado: idle */}
            {examConfig.status === 'idle' && (
              <div className="cardfx" style={styles.card}>
                <h3 style={{ color:"#fbbf24", marginBottom:4 }}>🏆 Criar Prova</h3>
                <p style={{ color:"#a99ac9", fontSize:13, marginBottom:14, lineHeight:1.6 }}>A IA gera automaticamente um resumo de revisão e 10 questões de múltipla escolha com base no código de hoje. Os alunos revisam, entram na sala e então você inicia.</p>
                <p style={{ color:"#a99ac9", fontSize:12, marginBottom:10 }}>As questões são geradas a partir do código que você escreveu na aba <b>Meu código</b>. Se não houver, usa o código dos alunos.</p>
                <button onClick={startExam} disabled={examGenerating} style={{ ...styles.btn("#c084fc"), opacity:examGenerating?0.6:1, padding:"12px 24px", fontSize:15 }}>
                  {examGenerating ? "Gerando..." : "🚀 Gerar e Iniciar Prova"}
                </button>
                {examMsg && <p style={{ color:examMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:13, marginTop:10, lineHeight:1.5 }}>{examMsg}</p>}
              </div>
            )}

            {/* estado: review */}
            {examConfig.status === 'review' && (
              <>
                <div className="cardfx" style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <h3 style={{ color:"#fbbf24", margin:"0 0 4px" }}>📝 Fase de Revisão</h3>
                      <p style={{ color:"#a99ac9", fontSize:13 }}>Os alunos estão revisando o conteúdo. Quando estiverem prontos, iniciam a prova.</p>
                      {examConfig.studyUntil && examNow < examConfig.studyUntil && (
                        <p style={{ color:"#c084fc", fontSize:12.5, marginTop:4, fontWeight:700 }}>
                          ⏳ Ainda tem {Math.ceil((examConfig.studyUntil - examNow) / 60000)} min de estudo — pode iniciar antes se a turma já estiver pronta.
                        </p>
                      )}
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={activateExam} style={{ ...styles.btn("#34d399") }}>▶ Iniciar Agora ({readyStudents.length} prontos)</button>
                      <button onClick={resetExam} style={{ ...styles.btn("#776798"), fontSize:13 }}>Cancelar</button>
                    </div>
                  </div>
                  {examMsg && <p style={{ color:"#34d399", fontSize:13, marginTop:10 }}>{examMsg}</p>}
                </div>
                <div className="cardfx" style={styles.card}>
                  <h4 style={{ color:"#fbbf24", marginBottom:10 }}>Alunos prontos ({readyStudents.length}/{examStudents.length})</h4>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {examStudents.map(s=>(
                      <div key={s.name} style={{ display:"flex", alignItems:"center", gap:8, background:"#171026", border:`1px solid ${s.examReady?"#34d399":"#3b2a58"}`, borderRadius:10, padding:"8px 12px" }}>
                        <Avatar cfg={s.avatar} size={26} />
                        <span style={{ fontSize:13 }}>{s.name}</span>
                        <span style={{ fontSize:14 }}>{s.examReady?"✅":"⏳"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* estado: active */}
            {examConfig.status === 'active' && (
              <>
                <div className="cardfx" style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <h3 style={{ color:"#fbbf24", margin:"0 0 4px" }}>🏆 Prova em andamento</h3>
                      <p style={{ color:"#a99ac9", fontSize:13 }}>{doneStudents.length}/{examStudents.length} alunos concluíram · {qLen} questões · {qLen*10} pts no máximo</p>
                    </div>
                    <button onClick={()=>setConfirmEndExam(true)} style={styles.btn("#f87171")}>⏹ Encerrar Prova</button>
                  </div>
                  {examMsg && <p style={{ color:"#34d399", fontSize:13, marginTop:8 }}>{examMsg}</p>}
                </div>
                <div className="cardfx" style={styles.card}>
                  <h4 style={{ color:"#fbbf24", marginBottom:12 }}>📊 Ranking ao vivo</h4>
                  {ranking.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>Aguardando alunos terminarem...</p> : (
                    ranking.map((s,i)=>(
                      <div key={s.name} style={{ background:"#171026", border:`1px solid ${i===0?"#fbbf24":"#3b2a58"}`, borderRadius:10, padding:"10px 14px", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <span style={{ fontSize:22, width:28 }}>{medal(i)||`#${i+1}`}</span>
                          <Avatar cfg={s.avatar} size={28} />
                          <span style={{ flex:1, fontWeight:600 }}>{s.name}</span>
                          <span style={{ color:"#34d399", fontWeight:700, fontSize:16 }}>{s.examScore} pts</span>
                          <span style={styles.badge(s.examDone?"#34d399":"#fbbf24")}>{s.examDone?"Concluído":"Respondendo"}</span>
                        </div>
                        {(s.examExits||0) > 0 && (
                          <p style={{ color:"#f87171", fontSize:12, margin:"6px 0 0 40px", fontWeight:700 }}>🚨 saiu da prova {s.examExits}x — desconto de {Math.min((s.examScoreRaw ?? ((s.examScore||0) + s.examExits*10)), s.examExits*10)} pts</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* estado: done */}
            {examConfig.status === 'done' && (
              <>
                <div className="cardfx" style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <h3 style={{ color:"#34d399", margin:"0 0 4px" }}>✅ Prova Encerrada</h3>
                      <p style={{ color:"#a99ac9", fontSize:13 }}>Resultado final · {doneStudents.length}/{examStudents.length} alunos concluíram</p>
                    </div>
                    <button onClick={resetExam} style={styles.btn("#776798")}>🔄 Nova Prova</button>
                  </div>
                </div>
                <div className="cardfx" style={{ ...styles.card, borderColor:"#c084fc" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <NyxRobot state="thinking" size={44} showName={false} />
                      <div>
                        <h4 style={{ color:"#c084fc", margin:0 }}>Análise do Nyx — período + prova</h4>
                        <p style={{ color:"#a99ac9", fontSize:12, margin:"2px 0 0" }}>Quem foi bem nas aulas e na prova, e quem precisa de atenção — com o porquê.</p>
                      </div>
                    </div>
                    <button onClick={nyxExamAnalysis} disabled={analyzingExam} style={{ ...styles.btn("#c084fc"), fontSize:13, opacity:analyzingExam?0.6:1 }}>
                      {analyzingExam ? "Analisando..." : examAnalysis ? "↻ Refazer análise" : "✨ Pedir análise"}
                    </button>
                  </div>
                  {examAnalysis && <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.8, whiteSpace:"pre-wrap", margin:"12px 0 0" }}>{examAnalysis}</p>}
                </div>
                <div className="cardfx" style={styles.card}>
                  <h4 style={{ color:"#fbbf24", marginBottom:12 }}>🏆 Ranking Final</h4>
                  {ranking.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>Nenhum aluno respondeu.</p> : (
                    ranking.map((s,i)=>(
                      <div key={s.name} style={{ background:i===0?"#fbbf2422":"#171026", border:`2px solid ${i===0?"#fbbf24":i===1?"#a99ac9":i===2?"#c2410c":"#3b2a58"}`, borderRadius:12, padding:"12px 16px", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <span style={{ fontSize:26, width:32 }}>{medal(i)||<span style={{color:"#776798",fontSize:16}}>#{i+1}</span>}</span>
                          <Avatar cfg={s.avatar} size={32} />
                          <span style={{ flex:1, fontWeight:700, fontSize:15 }}>{s.name}</span>
                          <span style={{ color:"#34d399", fontWeight:800, fontSize:20 }}>{s.examScore ?? 0}</span>
                          <span style={{ color:"#a99ac9", fontSize:12 }}>/{qLen*10}</span>
                        </div>
                        {(s.examExits||0) > 0 && (
                          <div style={{ margin:"8px 0 0 44px", padding:"8px 12px", background:"#f8717112", border:"1px solid #f8717155", borderRadius:8 }}>
                            <p style={{ color:"#fca5a5", fontSize:12.5, margin:0, fontWeight:700 }}>
                              🚨 Saiu da prova {s.examExits}x — nota sem desconto: {s.examScoreRaw ?? "—"} · com desconto: {s.examScore ?? 0}
                            </p>
                            {s.examAppeal?.status === "pending" && (
                              <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginTop:8 }}>
                                <span style={{ color:"#fbbf24", fontSize:12.5, fontWeight:700 }}>✋ O aluno alega que foi sem querer (a aba fechou).</span>
                                <button onClick={()=>decideAppeal(s, true)} style={{ ...styles.btn("#34d399"), padding:"5px 12px", fontSize:12 }}>✔ Aceitar (devolver pontos)</button>
                                <button onClick={()=>decideAppeal(s, false)} style={{ ...styles.btn("#f87171"), padding:"5px 12px", fontSize:12 }}>✕ Recusar</button>
                              </div>
                            )}
                            {s.examAppeal?.status === "accepted" && <p style={{ color:"#34d399", fontSize:12, margin:"6px 0 0", fontWeight:700 }}>✅ Defesa aceita — pontos devolvidos.</p>}
                            {s.examAppeal?.status === "rejected" && <p style={{ color:"#a99ac9", fontSize:12, margin:"6px 0 0", fontWeight:700 }}>Defesa recusada — desconto mantido.</p>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {examStudents.filter(s=>!s.examDone && s.examScore==null).length > 0 && (
                    <div style={{ marginTop:12, padding:"10px 14px", background:"#171c33", borderRadius:8 }}>
                      <p style={{ color:"#a99ac9", fontSize:12, marginBottom:6 }}>Não concluíram:</p>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {examStudents.filter(s=>!s.examDone && s.examScore==null).map(s=>(
                          <span key={s.name} style={{ background:"#3b2a58", color:"#a99ac9", borderRadius:8, padding:"4px 10px", fontSize:12 }}>{s.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })()}

      {profTourStep >= 0 && profTourStep < TEACHER_TOUR_STEPS.length && (
        <TourOverlay steps={TEACHER_TOUR_STEPS} step={profTourStep} onNext={()=>setProfTourStep(s => {
          const next = s+1 >= TEACHER_TOUR_STEPS.length ? -1 : s+1;
          // muda de aba ANTES do próximo passo aparecer, pra quem faz o tour ver o conteúdo de
          // verdade daquela aba (não só o botão) — as duas mudanças de estado ficam no mesmo clique,
          // então o React já renderiza a aba nova junto com o passo novo, sem piscar vazio
          if (next >= 0) { const wantTab = TEACHER_TOUR_STEPS[next].tab; if (wantTab) setTab(wantTab); }
          return next;
        })} />
      )}

      <NyxChat
        who="teacher"
        dataTour="chat-prof"
        accent="#fbbf24"
        onCommand={async (t) => {
          const cmd = t.toLowerCase();
          if (cmd === "zek") {
            await setNyxLocks({ zek: true }, teacherAuth);
            return "🔒 Modo ZEK ativado! Estou aparecendo na tela de TODOS os alunos pedindo atenção — tudo bloqueado até você digitar /hiberne.";
          }
          if (cmd === "/hiberne") {
            await setNyxLocks({ zek: false }, teacherAuth);
            return "😴 Zek desativado. As telas dos alunos foram liberadas.";
          }
          if (cmd === "zeker") {
            await setNyxLocks({ zeker: true }, teacherAuth);
            return "⚔️🚫 Duelos bloqueados! Nenhum aluno consegue duelar até você digitar /liberte.";
          }
          if (cmd === "/liberte") {
            await setNyxLocks({ zeker: false }, teacherAuth);
            return "⚔️✅ Duelos liberados! Os alunos já podem se desafiar de novo.";
          }
          return null;
        }}
        context={() => {
          // turma de teste fica fora do contexto do Nyx: é só para testar o sistema, não são alunos reais
          const rows = students.filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id).map(s => {
            const att = Object.values(s.attendance||{}).filter(v => v === "present").length;
            return `- ${s.name} [${shiftLabel(s.shift)}]: fase=${s.phase||"aguardando"}, presenças=${att}, nota atividade=${s.score ?? "—"}, nota prova=${s.examScore ?? "—"}, erro no código agora=${s.hasError ? "sim: " + (s.feedback?.message || "") : "não"}`;
          }).join("\n");
          return `Contexto: você é o assistente do professor. Situação da turma AGORA (turmas Matutino e Vespertino; a turma de teste não entra aqui):\n${rows || "(nenhum aluno entrou ainda)"}\nConteúdo de hoje — Manhã: ${todayContentM || "ainda não definido"} · Tarde: ${todayContentV || "ainda não definido"}.`;
        }}
      />
    </div>
  );
}

// poeira estelar bem sutil atrás do card de login — carrega o tsparticles sob demanda (só nesta
// tela) e respeita "prefers-reduced-motion" não renderizando nada pra quem pediu menos animação
function AmbientParticles() {
  const mountedRef = useRef(true);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    mountedRef.current = true;
    let container = null;
    (async () => {
      const [{ tsParticles }, { loadSlim }] = await Promise.all([
        import("@tsparticles/engine"),
        import("@tsparticles/slim"),
      ]);
      if (!mountedRef.current) return;
      await loadSlim(tsParticles);
      if (!mountedRef.current) return;
      container = await tsParticles.load({
        id: "nyx-ambient-particles",
        options: {
          fullScreen: { enable: false },
          background: { color: "transparent" },
          fpsLimit: 60,
          particles: {
            number: { value: 36, density: { enable: true, area: 900 } },
            color: { value: ["#c084fc", "#22d3ee", "#fefce8"] },
            opacity: { value: { min: 0.12, max: 0.55 }, animation: { enable: true, speed: 0.35, sync: false } },
            size: { value: { min: 1, max: 2.2 } },
            move: { enable: true, speed: 0.25, direction: "top", random: true, straight: false, outModes: { default: "out" } },
            links: { enable: false },
          },
          detectRetina: true,
        },
      }).catch(() => null);
    })();
    return () => { mountedRef.current = false; if (container) container.destroy(); };
  }, []);
  return <div id="nyx-ambient-particles" style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
}

// ════════════════════════════════════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════════════════════════════════════
function Login({ onJoin }) {
  const vw = useViewportWidth();
  const isNarrow = vw < 720; // abaixo disso, a personalização do avatar empilha em vez de ficar em 2 colunas
  const [name, setName] = useState("");
  // 🎓 data de nascimento + CPF — só pedidos na CRIAÇÃO do perfil, nunca aparecem de novo pro aluno depois
  // (ficam escondidos do próprio perfil; o professor só vê isso ao gerar a planilha, pra usar no certificado)
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfUnknown, setCpfUnknown] = useState(false);
  const [role, setRole] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [shift, setShift] = useState(() => new Date().getHours() < 13 ? "matutino" : "vespertino");
  // turma de teste (protegida por senha)
  const [testUnlocking, setTestUnlocking] = useState(false);
  const [testPass, setTestPass] = useState("");
  const [testError, setTestError] = useState("");
  const [teacherChecking, setTeacherChecking] = useState(false);
  // sala de linguagens pra amigos (protegida por senha, mesmo modelo da turma de teste)
  const [langUnlocking, setLangUnlocking] = useState(false);
  const [langPass, setLangPass] = useState("");
  const [langError, setLangError] = useState("");

  const openTestShift = () => { setTestUnlocking(true); setLangUnlocking(false); setTestPass(""); setTestError(""); };
  const confirmTestShift = () => {
    if (testPass === TEST_SHIFT_PASSWORD) { setShift(TEST_SHIFT.id); setTestUnlocking(false); setTestError(""); }
    else setTestError("Senha incorreta!");
  };
  const openLangShift = () => { setLangUnlocking(true); setTestUnlocking(false); setLangPass(""); setLangError(""); };
  const confirmLangShift = () => {
    if (langPass === LANG_SHIFT_PASSWORD) { setShift(LANG_SHIFT.id); setLangUnlocking(false); setLangError(""); }
    else setLangError("Senha incorreta!");
  };

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    const arr = await listStudents();
    setProfiles(arr.sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt-BR")));
    setLoadingProfiles(false);
  }, []);
  useEffect(() => { if (role==="student") loadProfiles(); }, [role, loadProfiles]);

  const enterStudent = (studentName, avatarCfg, shiftId, isNew, regData) => { goFullscreen(); onJoin("student", studentName, avatarCfg, shiftId || "matutino", isNew, null, regData); };
  const handleNewStudent = () => {
    if(!name.trim()){ setError("Digite seu nome!"); return; }
    enterStudent(name.trim(), avatar, shift, true, { birthDate: birthDate || "", cpf: cpfUnknown ? "" : (cpf || "") });
  };
  const openProfile = (p) => enterStudent(p.name, p.avatar, p.shift, false);
  // a senha do professor é validada no SERVIDOR (variável TEACHER_PASSWORD no Vercel) — nunca fica no código do site
  const handleTeacher = async () => {
    if (teacherChecking) return;
    setError(""); setTeacherChecking(true);
    try {
      const r = await fetch("/api/auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ password }) });
      const d = await r.json();
      if (d.ok) onJoin("teacher","Professor",null,null,false,password);
      else setError("Senha incorreta!");
    } catch {
      setError("Não consegui verificar a senha (servidor indisponível). Tente de novo.");
    }
    setTeacherChecking(false);
  };

  const styles = {
    container:{ minHeight:"100vh", background:PAGE_BG, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT, padding:16 },
    // a turma de aluno fica bem mais larga: metade esquerda (turma/perfil/nome/prévia) e metade direita (personalização), lado a lado
    card:{ position:"relative", zIndex:1, background:"linear-gradient(180deg,#231636ee,#1a1029ee)", backdropFilter:"blur(10px)", borderRadius:22, padding:32, width: role==="student" ? 880 : 460, maxWidth:"100%", border:"1px solid #3e2d5e", boxShadow:"0 24px 70px rgba(0,0,0,.5), 0 0 0 1px #c084fc1a" },
    input:{ width:"100%", background:"#171026", border:"2px solid #3b2a58", borderRadius:12, padding:"12px 14px", color:"#f0e9fb", fontSize:15, outline:"none", boxSizing:"border-box" },
    btn:(c)=>({ background:`linear-gradient(135deg, ${c}, ${shade(c,-0.18)})`, color:"#fff", border:"none", borderRadius:12, padding:"12px 0", cursor:"pointer", fontWeight:800, fontSize:15, width:"100%", boxShadow:`0 4px 16px ${c}44` }),
    rBtn:()=>({ background:"#171026", color:"#a99ac9", border:`2px solid #3b2a58`, borderRadius:14, padding:"18px 8px", cursor:"pointer", fontWeight:800, fontSize:14, flex:1 }),
  };

  return (
    <div style={styles.container}>
      <AmbientParticles />
      <div className="pop" style={styles.card}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <NyxRobot state="idle" size={86} showName={false} />
          <h1 className="shine" style={{ fontSize:28, margin:"6px 0 2px", fontWeight:900, background:"linear-gradient(120deg,#c084fc,#22d3ee,#c084fc)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>Aula de C#</h1>
          <p style={{ color:"#776798", fontSize:13, margin:0 }}>Plataforma da turma · com o robô <b style={{ color:"#c084fc" }}>Nyx</b></p>
        </div>

        {!role&&(
          <>
            <p style={{ color:"#a99ac9", textAlign:"center", marginBottom:14 }}>Quem é você?</p>
            <div style={{ display:"flex", gap:12 }}>
              <button style={styles.rBtn()} onClick={()=>setRole("student")}>
                <span style={{ display:"block", fontSize:34, marginBottom:6 }}>🧑‍💻</span>
                <span style={{ display:"block", color:"#f0e9fb", fontSize:15 }}>Aluno</span>
                <span style={{ display:"block", color:"#776798", fontSize:11.5, fontWeight:600, marginTop:2 }}>programar e aprender</span>
              </button>
              <button style={styles.rBtn()} onClick={()=>setRole("teacher")}>
                <span style={{ display:"block", fontSize:34, marginBottom:6 }}>👨‍🏫</span>
                <span style={{ display:"block", color:"#f0e9fb", fontSize:15 }}>Professor</span>
                <span style={{ display:"block", color:"#776798", fontSize:11.5, fontWeight:600, marginTop:2 }}>acompanhar a turma</span>
              </button>
            </div>
          </>
        )}

        {role==="student"&&(
          <>
            <p style={{ color:"#fbbf24", fontWeight:600, marginBottom:10 }}>👤 Entrar como Aluno</p>

            {/* metade esquerda: turma, perfis salvos, nome e prévia do boneco — metade direita: personalização
                (em telas estreitas as duas colunas empilham, senão ficam lado a lado) */}
            <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
              <div style={{ flex: isNarrow ? "1 1 100%" : "1 1 300px", minWidth: isNarrow ? 0 : 260 }}>
                <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 8px" }}>🕑 Qual é a sua turma?</p>
                <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                  {SHIFTS.map(sh => (
                    <button key={sh.id} onClick={()=>{ setShift(sh.id); setTestUnlocking(false); setLangUnlocking(false); }}
                      style={{ ...styles.rBtn(), ...(shift===sh.id ? { borderColor:"#c084fc", color:"#fff", background:"#c084fc22" } : {}) }}>
                      {sh.emoji} {sh.label}
                    </button>
                  ))}
                </div>
                <button onClick={()=> shift===TEST_SHIFT.id ? null : openTestShift()}
                  style={{ background:"transparent", border:"none", color: shift===TEST_SHIFT.id ? "#c084fc" : "#776798", fontSize:12, cursor:"pointer", padding:"2px 0", marginBottom: shift===TEST_SHIFT.id||testUnlocking ? 10 : 18 }}>
                  {shift===TEST_SHIFT.id ? `✓ ${TEST_SHIFT.emoji} Turma de teste selecionada` : `${TEST_SHIFT.emoji} Sou da turma de teste`}
                </button>
                {testUnlocking && shift!==TEST_SHIFT.id && (
                  <div style={{ background:"#171026", border:"2px solid #3b2a58", borderRadius:12, padding:12, marginBottom:18 }}>
                    <p style={{ color:"#a99ac9", fontSize:12, margin:"0 0 8px" }}>Digite a senha da turma de teste:</p>
                    <div style={{ display:"flex", gap:8 }}>
                      <input type="password" autoFocus value={testPass} onChange={e=>setTestPass(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&confirmTestShift()} placeholder="Senha"
                        style={{ ...styles.input, padding:"8px 12px", fontSize:14 }} />
                      <button onClick={confirmTestShift} style={{ ...styles.btn("#c084fc"), width:"auto", padding:"0 16px", flexShrink:0 }}>Entrar</button>
                    </div>
                    {testError && <p style={{ color:"#f87171", fontSize:12, marginTop:6 }}>{testError}</p>}
                  </div>
                )}
                <button onClick={()=> shift===LANG_SHIFT.id ? null : openLangShift()}
                  style={{ background:"transparent", border:"none", color: shift===LANG_SHIFT.id ? "#22d3ee" : "#776798", fontSize:12, cursor:"pointer", padding:"2px 0", marginBottom: shift===LANG_SHIFT.id||langUnlocking ? 10 : 18 }}>
                  {shift===LANG_SHIFT.id ? `✓ ${LANG_SHIFT.emoji} Sala de linguagens selecionada` : `${LANG_SHIFT.emoji} Sou de fora, quero estudar outra linguagem`}
                </button>
                {langUnlocking && shift!==LANG_SHIFT.id && (
                  <div style={{ background:"#171026", border:"2px solid #3b2a58", borderRadius:12, padding:12, marginBottom:18 }}>
                    <p style={{ color:"#a99ac9", fontSize:12, margin:"0 0 8px" }}>Digite a senha da sala de linguagens:</p>
                    <div style={{ display:"flex", gap:8 }}>
                      <input type="password" autoFocus value={langPass} onChange={e=>setLangPass(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&confirmLangShift()} placeholder="Senha"
                        style={{ ...styles.input, padding:"8px 12px", fontSize:14 }} />
                      <button onClick={confirmLangShift} style={{ ...styles.btn("#22d3ee"), width:"auto", padding:"0 16px", flexShrink:0 }}>Entrar</button>
                    </div>
                    {langError && <p style={{ color:"#f87171", fontSize:12, marginTop:6 }}>{langError}</p>}
                  </div>
                )}

                <div style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ color:"#a99ac9", fontSize:13 }}>Já tem um perfil da turma {shiftMeta(shift).label}? Toque no seu nome:</span>
                    <button onClick={loadProfiles} style={{ background:"transparent", border:"none", color:"#c084fc", cursor:"pointer", fontSize:12 }}>↻ atualizar</button>
                  </div>
                  {loadingProfiles ? <p style={{ color:"#776798", fontSize:13 }}>Procurando perfis salvos...</p>
                    : profiles.filter(p => (p.shift||"matutino")===shift).length===0 ? <p style={{ color:"#776798", fontSize:13 }}>Nenhum perfil salvo ainda nesta turma. Crie o seu abaixo 👇</p>
                    : (
                      <div style={{ maxHeight:170, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
                        {profiles.filter(p => (p.shift||"matutino")===shift).map(p=>(
                          <button key={`${p.shift||"x"}:${p.name}`} onClick={()=>openProfile(p)} style={{ display:"flex", alignItems:"center", gap:10, background:"#171026", border:"2px solid #3b2a58", borderRadius:10, padding:"8px 12px", cursor:"pointer", color:"#f0e9fb", textAlign:"left" }}>
                            <Avatar cfg={p.avatar} size={32} />
                            <span style={{ fontWeight:600, flex:1 }}>{p.name}</span>
                            <span style={{ color:"#c084fc", fontSize:13, fontWeight:700 }}>Entrar →</span>
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                <div style={{ display:"flex", alignItems:"center", gap:10, margin:"6px 0 14px" }}>
                  <div style={{ flex:1, height:1, background:"#3b2a58" }}/>
                  <span style={{ color:"#776798", fontSize:12 }}>ou crie um novo perfil na turma {shiftMeta(shift).label}</span>
                  <div style={{ flex:1, height:1, background:"#3b2a58" }}/>
                </div>

                <input style={styles.input} placeholder="Seu nome completo" value={name} onChange={e=>setName(e.target.value)} />
                {shift !== LANG_SHIFT.id && (
                  <>
                    <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                      <div style={{ flex:"1 1 150px" }}>
                        <label style={{ fontSize:11, color:"#a99ac9" }}>Data de nascimento
                          <input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)}
                            style={{ width:"100%", background:"#171026", border:"2px solid #3b2a58", borderRadius:8, padding:"8px 10px", color:"#f0e9fb", fontSize:13, marginTop:3, boxSizing:"border-box" }} />
                        </label>
                      </div>
                      <div style={{ flex:"1 1 150px" }}>
                        <label style={{ fontSize:11, color:"#a99ac9" }}>CPF (opcional)
                          <input value={cpf} disabled={cpfUnknown} placeholder="000.000.000-00" onChange={e=>setCpf(e.target.value)}
                            style={{ width:"100%", background:"#171026", border:"2px solid #3b2a58", borderRadius:8, padding:"8px 10px", color:"#f0e9fb", fontSize:13, marginTop:3, boxSizing:"border-box", opacity:cpfUnknown?0.5:1 }} />
                        </label>
                      </div>
                    </div>
                    <label style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, fontSize:11.5, color:"#a99ac9", cursor:"pointer" }}>
                      <input type="checkbox" checked={cpfUnknown} onChange={e=>{ setCpfUnknown(e.target.checked); if (e.target.checked) setCpf(""); }} />
                      Não sei o CPF
                    </label>
                    <p style={{ color:"#776798", fontSize:10.5, margin:"4px 0 0", lineHeight:1.5 }}>Só o professor vê isso, e só na hora de gerar a planilha pra fazer certificado — nunca aparece no seu perfil.</p>
                  </>
                )}
                <p style={{ color:"#a99ac9", fontSize:13, margin:"14px 0 8px", textAlign:"center" }}>🎨 Seu boneco:</p>
                <AvatarPreview value={avatar} onChange={setAvatar} />
                <AvatarControls value={avatar} onChange={setAvatar} part="basic" />
              </div>

              <div style={{ flex: isNarrow ? "1 1 100%" : "1 1 440px", minWidth: isNarrow ? 0 : 400 }}>
                <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 8px" }}>Personalize:</p>
                <div style={{ columnCount: isNarrow ? 1 : 2, columnGap:20 }}>
                  <AvatarControls value={avatar} onChange={setAvatar} part="rest" />
                </div>
                {error&&<p style={{ color:"#f87171", fontSize:13, marginTop:8 }}>{error}</p>}
                <div style={{ display:"flex", gap:8, marginTop:16 }}>
                  <button style={{ ...styles.btn("#c084fc"), flex:1 }} onClick={handleNewStudent}>Criar perfil e entrar →</button>
                  <button style={{ ...styles.btn("#3b2a58"), width:44, flex:"none" }} onClick={()=>{ setRole(null); setError(""); }}>↩</button>
                </div>
              </div>
            </div>
          </>
        )}

        {role==="teacher"&&(
          <>
            <p style={{ color:"#fbbf24", fontWeight:600, marginBottom:10 }}>👨‍🏫 Entrar como Professor</p>
            <input style={styles.input} type="password" placeholder="Senha do professor" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleTeacher()} />
            {error&&<p style={{ color:"#f87171", fontSize:13, marginTop:6 }}>{error}</p>}
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button style={{ ...styles.btn("#fbbf24"), flex:1, opacity:teacherChecking?0.6:1 }} onClick={handleTeacher} disabled={teacherChecking}>{teacherChecking ? "Verificando..." : "Entrar →"}</button>
              <button style={{ ...styles.btn("#3b2a58"), width:44, flex:"none" }} onClick={()=>{ setRole(null); setError(""); }}>↩</button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  📊 PÁGINA PÚBLICA DE IMPACTO (/impacto) — sem login, pra mostrar pra prefeitura/patrocinador.
//  Só números agregados (nenhum nome de aluno) — pensada especificamente pra evitar qualquer
//  dado pessoal numa página que qualquer pessoa da internet pode abrir.
// ════════════════════════════════════════════════════════════════════════════
function useImpactStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [hall, meta, liveStudents] = await Promise.all([getHallOfFame(), getTeacherMeta(), listStudents()]);
      if (!alive) return;
      const activeStudents = liveStudents.filter(s => (s.shift||"") !== TEST_SHIFT.id && (s.shift||"") !== LANG_SHIFT.id);
      const highlightOf = (s) => { const notas = [...Object.values(s.scoreHistory||{}), s.score, s.examScore].filter(n=>typeof n==="number"); return notas.length ? Math.max(...notas) : 0; };
      const liveNotas = activeStudents.map(highlightOf).filter(n=>n>0);
      const liveAvg = liveNotas.length ? Math.round(liveNotas.reduce((a,b)=>a+b,0)/liveNotas.length) : 0;
      const lastSnapshot = hall.length ? (hall[hall.length-1].classDaysSnapshot||0) : 0;
      const liveClasses = Math.max(0, (meta.classDays||[]).length - lastSnapshot);
      const cities = [
        ...hall.map(h => ({ city: h.city, students: h.totalStudents||0, classes: h.totalClasses||0, avg: h.avgScore||0, active:false })),
        ...(meta.city && activeStudents.length ? [{ city: meta.city, students: activeStudents.length, classes: liveClasses, avg: liveAvg, active:true }] : []),
      ];
      const totalStudents = cities.reduce((a,c)=>a+c.students, 0);
      const totalClasses = cities.reduce((a,c)=>a+c.classes, 0);
      const scored = cities.filter(c=>c.avg>0 && c.students>0);
      const overallAvg = scored.length ? Math.round(scored.reduce((a,c)=>a+c.avg*c.students, 0) / scored.reduce((a,c)=>a+c.students, 0)) : null;
      setStats({ cities, totalStudents, totalCities: cities.length, totalClasses, overallAvg });
    })().catch(() => { if (alive) setStats({ cities:[], totalStudents:0, totalCities:0, totalClasses:0, overallAvg:null }); });
    return () => { alive = false; };
  }, []);
  return stats;
}
function ImpactBarChart({ cities }) {
  const [RC, setRC] = useState(null);
  useEffect(() => {
    let alive = true;
    import("recharts").then(mod => { if (alive) setRC(mod); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const data = cities.filter(c => c.avg > 0).map(c => ({ city: c.city, avg: c.avg }));
  if (!data.length) return null;
  if (!RC) {
    return (
      <div style={{ display:"flex", alignItems:"flex-end", gap:14, height:140, overflowX:"auto", padding:"0 4px" }}>
        {data.map(({ city, avg }) => (
          <div key={city} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, minWidth:56 }}>
            <span style={{ color:"#c084fc", fontSize:13, fontWeight:800 }}>{avg}</span>
            <div style={{ width:30, height:Math.max(6, Math.round(avg*1.1)), background:"linear-gradient(180deg,#c084fc,#7c3aed)", borderRadius:"6px 6px 2px 2px" }} />
            <span style={{ color:"#a99ac9", fontSize:11, textAlign:"center" }}>{city}</span>
          </div>
        ))}
      </div>
    );
  }
  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } = RC;
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:"#1e1430", border:"1px solid #c084fc", borderRadius:10, padding:"6px 10px", fontSize:12, boxShadow:"0 6px 18px rgba(0,0,0,.4)" }}>
        <div style={{ color:"#a99ac9" }}>{label}</div>
        <div style={{ color:"#c084fc", fontWeight:900 }}>{payload[0].value} pts de média</div>
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top:8, right:8, left:-20, bottom:0 }}>
        <CartesianGrid stroke="#3b2a58" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="city" stroke="#a99ac9" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis domain={[0,100]} stroke="#776798" fontSize={10} tickLine={false} axisLine={false} width={28} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill:"#c084fc11" }} />
        <Bar dataKey="avg" radius={[6,6,2,2]} maxBarSize={40}>
          {data.map((d,i) => <Cell key={i} fill="#c084fc" />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
function StatTile({ n, label, color }) {
  return (
    <div style={{ flex:"1 1 160px", background:"linear-gradient(160deg,#231636,#1a1029)", border:"1px solid #3b2a58", borderRadius:18, padding:"20px 18px", textAlign:"center" }}>
      <div style={{ fontSize:"clamp(28px,5vw,40px)", fontWeight:900, color, lineHeight:1.1 }}>{n}</div>
      <div style={{ color:"#a99ac9", fontSize:13, marginTop:6 }}>{label}</div>
    </div>
  );
}
function ImpactPage() {
  const stats = useImpactStats();
  return (
    <div style={{ minHeight:"100vh", background:PAGE_BG, color:"#f0e9fb", fontFamily:FONT, padding:"48px 20px 60px" }}>
      <div style={{ maxWidth:880, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <NyxRobot state="idle" size={72} showName={false} />
          <h1 className="shine" style={{ fontSize:"clamp(26px,5vw,38px)", fontWeight:900, margin:"14px 0 8px", background:"linear-gradient(120deg,#c084fc,#22d3ee,#c084fc)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>Aula de C# na estrada</h1>
          <p style={{ color:"#a99ac9", fontSize:15.5, maxWidth:520, margin:"0 auto", lineHeight:1.6 }}>Uma sala de aula que viaja pelo Distrito Federal ensinando programação de verdade a adolescentes — de graça, cidade após cidade.</p>
        </div>

        {!stats ? (
          <p style={{ textAlign:"center", color:"#776798" }}>Carregando números...</p>
        ) : (
          <>
            <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:28 }}>
              <StatTile n={stats.totalStudents} label="Alunos impactados" color="#c084fc" />
              <StatTile n={stats.totalCities} label="Cidades visitadas" color="#22d3ee" />
              <StatTile n={stats.totalClasses} label="Aulas dadas" color="#fbbf24" />
              <StatTile n={stats.overallAvg != null ? stats.overallAvg : "—"} label="Nota média da turma" color="#34d399" />
            </div>

            {stats.cities.length > 0 && (
              <div className="cardfx" style={{ background:"linear-gradient(160deg,#231636,#1a1029)", border:"1px solid #3b2a58", borderRadius:18, padding:"20px 22px", marginBottom:28 }}>
                <h2 style={{ color:"#f0e9fb", fontSize:17, margin:"0 0 4px" }}>Nota média por cidade</h2>
                <p style={{ color:"#776798", fontSize:12.5, margin:"0 0 14px" }}>Só números agregados — nenhum nome de aluno aparece nesta página.</p>
                <ImpactBarChart cities={stats.cities} />
              </div>
            )}

            <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center" }}>
              {stats.cities.map(c => (
                <span key={c.city} style={{ background:"#171026", border:`1px solid ${c.active ? "#34d399" : "#3b2a58"}`, borderRadius:999, padding:"6px 14px", fontSize:12.5, color: c.active ? "#34d399" : "#d6c9ec" }}>
                  {c.active ? "🟢 " : ""}{c.city}{c.active ? " (em andamento)" : ""}
                </span>
              ))}
            </div>
          </>
        )}

        <p style={{ textAlign:"center", color:"#56407e", fontSize:11.5, marginTop:48 }}>Plataforma "Aula de C#" · com o robô Nyx</p>
      </div>
    </div>
  );
}

// ── portfólio público de um aluno (/portfolio/<turno>/<nome>) — só existe se o PRÓPRIO aluno
// ligou o opt-in (portfolioPublic); mostra avatar/conquistas/progresso, nunca birthDate/cpf nem
// comparação com colegas (cada campo é escolhido a dedo, nunca um dump do registro inteiro) ──
function usePortfolioData(shift, name) {
  const [state, setState] = useState({ loading: true, student: null, classDays: [] });
  useEffect(() => {
    let alive = true;
    (async () => {
      const [student, meta] = await Promise.all([getStudent(shift, name), getTeacherMeta()]);
      if (!alive) return;
      setState({ loading: false, student, classDays: meta?.classDays || [] });
    })().catch(() => { if (alive) setState({ loading: false, student: null, classDays: [] }); });
    return () => { alive = false; };
  }, [shift, name]);
  return state;
}
function PortfolioPage({ shift, name }) {
  const { loading, student, classDays } = usePortfolioData(shift, name);
  if (loading) {
    return <div style={{ minHeight:"100vh", background:PAGE_BG, color:"#776798", fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center" }}>Carregando...</div>;
  }
  if (!student || !student.portfolioPublic) {
    return (
      <div style={{ minHeight:"100vh", background:PAGE_BG, color:"#f0e9fb", fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
        <div>
          <NyxRobot state="idle" size={64} showName={false} />
          <p style={{ color:"#a99ac9", marginTop:16, maxWidth:360, lineHeight:1.6 }}>Esse link não está disponível — o aluno pode não ter ativado o portfólio público ainda.</p>
        </div>
      </div>
    );
  }
  const isLangRoom = shift === LANG_SHIFT.id;
  const unlocked = (student.achievements || []).map(achievementInfo).filter(Boolean).filter(a => visibleAchievements(isLangRoom).some(v => v.id === a.id));
  const totalPossible = visibleAchievements(isLangRoom).length;
  const presencas = Object.values(student.attendance || {}).filter(v => v === "present").length;
  const streak = computeStreak(student.attendance, classDays);
  const notas = [...Object.values(student.scoreHistory || {}), student.score, student.examScore].filter(n => typeof n === "number");
  const bestScore = notas.length ? Math.max(...notas) : null;
  const conceitos = Object.values(student.summaryHistory || {}).reduce((n, d) => n + ((d?.secoes || []).length), 0);
  return (
    <div style={{ minHeight:"100vh", background:PAGE_BG, color:"#f0e9fb", fontFamily:FONT, padding:"48px 20px 60px" }}>
      <div style={{ maxWidth:720, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Avatar cfg={student.avatar} size={104} />
          <h1 className="shine" style={{ fontSize:"clamp(24px,5vw,32px)", fontWeight:900, margin:"14px 0 4px", background:"linear-gradient(120deg,#c084fc,#22d3ee,#c084fc)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>{student.name}</h1>
          <p style={{ color:"#776798", fontSize:13.5 }}>Turma {shiftMeta(shift).label} · Aula de C# na estrada</p>
        </div>

        <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:28, justifyContent:"center" }}>
          <StatTile n={`${unlocked.length}/${totalPossible}`} label="Conquistas" color="#a855f7" />
          <StatTile n={presencas} label="Aulas participadas" color="#22d3ee" />
          <StatTile n={conceitos} label="Conceitos aprendidos" color="#34d399" />
          {streak > 1 && <StatTile n={streak} label="Dias seguidos" color="#fb923c" />}
          {bestScore != null && <StatTile n={bestScore} label="Melhor nota" color="#fbbf24" />}
        </div>

        {unlocked.length > 0 && (
          <div className="cardfx" style={{ background:"linear-gradient(160deg,#231636,#1a1029)", border:"1px solid #3b2a58", borderRadius:18, padding:"20px 22px", marginBottom:24 }}>
            <h2 style={{ color:"#f0e9fb", fontSize:16, margin:"0 0 12px" }}>🎖️ Conquistas desbloqueadas</h2>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {unlocked.map(a => (
                <span key={a.id} title={a.desc} style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"8px 12px", fontSize:12.5, display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:16 }}>{a.emoji}</span> {a.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <p style={{ textAlign:"center", color:"#56407e", fontSize:11.5, marginTop:40 }}>Plataforma "Aula de C#" · com o robô Nyx · link compartilhado pelo próprio aluno</p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(null);
  // 🚨 captura erros de JS que quebram silenciosamente na tela do aluno/professor (sem precisar
  // que alguém perceba e avise) — manda só a mensagem/pilha/URL pro professor ver no painel dele,
  // nunca código ou dado pessoal. Um Set por sessão da página evita mandar a MESMA mensagem
  // repetidas vezes (comum quando um erro dispara dentro de um loop de render)
  const sessionRoleRef = useRef(null);
  useEffect(() => { sessionRoleRef.current = session?.role || null; }, [session]);
  useEffect(() => {
    const reported = new Set();
    const report = (message, stack) => {
      const msg = String(message || "erro desconhecido").slice(0, 500);
      if (reported.has(msg) || reported.size >= 8) return;
      reported.add(msg);
      reportClientError({ message: msg, stack: String(stack || "").slice(0, 1500), url: window.location.pathname, role: sessionRoleRef.current || "anon" });
    };
    const onError = (e) => report(e.message, e.error?.stack);
    const onRejection = (e) => report(e.reason?.message || e.reason, e.reason?.stack);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, []);
  // /impacto é pública (sem login) — pensada pra mostrar pra prefeitura/patrocinador, só números
  // agregados, nenhum dado de aluno específico
  if (typeof window !== "undefined" && window.location.pathname === "/impacto") return <ImpactPage />;
  // /portfolio/<turno>/<nome> é pública (sem login) — só existe conteúdo se o próprio aluno ligou
  // o opt-in "portfolioPublic" no painel dele
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/portfolio/")) {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return <PortfolioPage shift={decodeURIComponent(parts[1] || "")} name={decodeURIComponent(parts[2] || "")} />;
  }
  if (!session) return <Login onJoin={(role,name,avatar,shift,isNew,teacherAuth,regData)=>setSession({role,name,avatar,shift,isNew,teacherAuth,regData})} />;
  if (session.role==="teacher") return <TeacherView onLogout={()=>setSession(null)} teacherAuth={session.teacherAuth} />;
  return <StudentView studentName={session.name} initialAvatar={session.avatar} shift={session.shift||"matutino"} isNew={session.isNew} initialBirthDate={session.regData?.birthDate||""} initialCpf={session.regData?.cpf||""} onLogout={()=>setSession(null)} />;
}
