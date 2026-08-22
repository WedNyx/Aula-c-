import { useState } from "react";
import { setCheckin } from "../storage.js";
import { todayKey } from "../lib/schedule.ts";
import { PerformanceChart } from "./PerformanceChart.jsx";
import { SummaryPretty } from "./SummaryPretty.jsx";

// ── 👾 chefão: tela de estudo de 10min antes da batalha — mostra o código atual do aluno e os
// resumos/explicações de tudo que ele já aprendeu, com contagem regressiva até o chefão aparecer ──
export function BossStudyModal({ studyUntil, clockNow, files, summaryHistory, detailedSummaryHistory }) {
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

// ── 🗺️ Trilha de aprendizado: transforma o caderno de resumos (já existia) numa trilha visual —
// um "checkpoint" por dia de aula, com os conceitos aprendidos naquele dia, ligados por uma linha.
// Não junta dado novo nenhum, só dá uma cara de progresso pro que já tava guardado.
const TRAIL_NODE_COLORS = ["#c084fc","#22d3ee","#34d399","#fbbf24","#f472b6","#818cf8"];
export function LearningTrailModal({ history, onClose }) {
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
export function NextStepsModal({ onClose }) {
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

export function NotebookModal({ history, detailedHistory, onClose }) {
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
// ── 😊 check-in emocional: aparece 1x por dia pro aluno, antes de começar a codar — rapidinho,
// sem nota nem cobrança, só pro professor ter mais contexto sobre a turma naquele dia ──
export const CHECKIN_MOODS = [
  { id: "otimo",   emoji: "😄", label: "Empolgado" },
  { id: "feliz",   emoji: "😊", label: "Feliz" },
  { id: "bem",     emoji: "🙂", label: "Bem" },
  { id: "calmo",   emoji: "😌", label: "Tranquilo" },
  { id: "neutro",  emoji: "😐", label: "Neutro" },
  { id: "curioso", emoji: "🤔", label: "Curioso" },
  { id: "ansioso", emoji: "😬", label: "Ansioso" },
  { id: "cansado", emoji: "😴", label: "Cansado" },
  { id: "confuso", emoji: "😵‍💫", label: "Confuso" },
  { id: "triste",  emoji: "😔", label: "Triste" },
  { id: "dificil", emoji: "😣", label: "Dia difícil" },
];
export function CheckinModal({ shift, studentName, onDone }) {
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
export function PerformanceModal({ studentName, scoreHistory, achievements, duelWins, typingBest, streakCount, onClose }) {
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
