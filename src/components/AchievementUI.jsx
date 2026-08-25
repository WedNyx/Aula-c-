import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { listStudents, getTeacherMeta } from "../storage.js";
import { visibleAchievements, classGoalProgress } from "../lib/achievements.ts";
import { weekKey } from "../lib/schedule.ts";
import { turmaCalendar } from "../lib/shifts.ts";
import { computeStreak } from "../lib/utils.js";
import { Avatar } from "./Avatar.jsx";

// ════════════════════════════════════════════════════════════════════════════
//  CONQUISTAS, RANKING, META DA TURMA, CURIOSIDADE  (gamificação leve)
// ════════════════════════════════════════════════════════════════════════════
export function AchievementToast({ achievement }) {
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

export function AchievementsModal({ unlocked, onClose, isLangRoom }) {
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
                  <div style={{ color:"#776798", fontSize:11.5 }}>{a.secret && !got ? "Um segredo espera por quem explora a plataforma..." : a.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 🎯 desempenho, não pontos do Nyx: mesma fórmula de mérito já usada no Hall da Fama (Fase 2) —
// constância nas atividades (média do histórico, não o pico isolado) + nota da prova + poucos
// erros de código registrados. Pontos do Nyx não entram — quem estuda mais mas erra pouco/vai bem
// nas atividades sobe no ranking, não quem só acumulou pontos de jogos/extras.
function meritOf(s) {
  const notas = [...Object.values(s.scoreHistory||{}), s.score].filter(n => typeof n === "number");
  const avgScore = notas.length ? notas.reduce((a,b)=>a+b,0) / notas.length : 0;
  const examScore = typeof s.examScore === "number" ? s.examScore : 0;
  const totalErrors = Object.values(s.errorHistory||{}).reduce((a,b)=>a+(typeof b==="number"?b:0), 0);
  const errorScore = Math.max(0, 100 - totalErrors * 10);
  const merit = avgScore * 0.5 + examScore * 0.3 + errorScore * 0.2;
  return { merit, hasActivity: notas.length > 0 || examScore > 0 };
}

// 🏅 reconhecimentos além do Top 5 — pra quem está evoluindo sem chegar no topo também ter um
// jeito de ser notado. Cada categoria usa um sinal que já existe de verdade na plataforma (nunca
// inventa uma métrica fake só pra preencher espaço); "explorador da semana" ficou de fora porque
// não existe hoje nenhum sinal real de "quanto o aluno explorou" pra medir com honestidade.
function categoryWinners(students) {
  const now = weekKey();
  const last = weekKey(new Date(Date.now() - 7 * 24 * 3600 * 1000));

  // 🚀 maior evolução: média das notas desta semana MENOS a média da semana passada — só entra
  // quem tem nota registrada nas duas semanas (sem isso, não dá pra falar em "evolução")
  let evolucao = null;
  for (const s of students) {
    const hist = s.scoreHistory || {};
    const wk = (key) => Object.entries(hist).filter(([d]) => weekKey(new Date(d)) === key).map(([, v]) => v).filter(n => typeof n === "number");
    const nowVals = wk(now), lastVals = wk(last);
    if (!nowVals.length || !lastVals.length) continue;
    const delta = (nowVals.reduce((a, b) => a + b, 0) / nowVals.length) - (lastVals.reduce((a, b) => a + b, 0) / lastVals.length);
    if (delta > 0 && (!evolucao || delta > evolucao.delta)) evolucao = { name: s.name, delta: Math.round(delta) };
  }

  // 🔥 melhor sequência: maior streak ATUAL (mesmo cálculo não-punitivo do resto da plataforma)
  let sequencia = null;
  for (const s of students) {
    const len = s._streak || 0;
    if (len > 1 && (!sequencia || len > sequencia.len)) sequencia = { name: s.name, len };
  }

  // 🤝 grande ajudante: quem mais ajudou colegas ESTA semana (Fase 2: pontos de parceria de código)
  let ajudante = null;
  for (const s of students) {
    const n = (s.partnerRewards && s.partnerRewards[now] && s.partnerRewards[now].helper) || 0;
    if (n > 0 && (!ajudante || n > ajudante.n)) ajudante = { name: s.name, n };
  }

  // 🧹 código mais organizado: menos erros de análise registrados esta semana, entre quem
  // efetivamente esteve presente essa semana (não premia quem simplesmente não apareceu)
  let organizado = null;
  for (const s of students) {
    const presenteEstaSemanaVals = Object.entries(s.attendance || {}).filter(([d, v]) => v === "present" && weekKey(new Date(d)) === now);
    if (!presenteEstaSemanaVals.length) continue;
    const errosEstaSemana = Object.entries(s.errorHistory || {}).filter(([d]) => weekKey(new Date(d)) === now).reduce((a, [, v]) => a + (typeof v === "number" ? v : 0), 0);
    if (!organizado || errosEstaSemana < organizado.erros) organizado = { name: s.name, erros: errosEstaSemana };
  }

  // 🏗️ desafio criativo: quem completou o Desafio Livre da Semana nesta semana
  const criativos = students.filter(s => s.weeklyChallenge && s.weeklyChallenge.weekKey === now && s.weeklyChallenge.status === "done").map(s => s.name);

  return [
    evolucao && { emoji: "🚀", label: "Maior evolução da semana", value: `${evolucao.name} · +${evolucao.delta} de média` },
    sequencia && { emoji: "🔥", label: "Melhor sequência", value: `${sequencia.name} · ${sequencia.len} dias seguidos` },
    ajudante && { emoji: "🤝", label: "Grande ajudante da semana", value: `${ajudante.name} · ajudou ${ajudante.n}x` },
    organizado && { emoji: "🧹", label: "Código mais organizado da semana", value: `${organizado.name} · ${organizado.erros === 0 ? "zero erros" : `${organizado.erros} erro(s)`}` },
    criativos.length > 0 && { emoji: "🏗️", label: "Desafio criativo da semana", value: criativos.join(", ") },
  ].filter(Boolean);
}

export function RankingModal({ shift, myName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [top, setTop] = useState([]);
  const [badges, setBadges] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [all, meta] = await Promise.all([listStudents(), getTeacherMeta()]);
      const classDays = turmaCalendar(meta, shift || "sem-turno").classDays;
      const mine = all
        .filter(s => (s.shift || "sem-turno") === (shift || "sem-turno"))
        .map(s => ({ ...s, _streak: computeStreak(s.attendance, classDays, s.justifications) }));
      const sorted = mine
        .map(s => ({ ...s, ...meritOf(s) }))
        .filter(s => s.hasActivity)
        .sort((a,b)=>b.merit-a.merit)
        .slice(0, 5);
      if (alive) { setTop(sorted); setBadges(categoryWinners(mine)); setLoading(false); }
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
        <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Os 5 com melhor desempenho: notas das atividades, prova e poucos erros de código — não é sobre pontos do Nyx</p>
        {loading ? <p style={{ color:"#776798", fontSize:13 }}>Carregando...</p> : top.length === 0 ? (
          <p style={{ color:"#776798", fontSize:13 }}>Ninguém fez atividade ainda — seja o primeiro!</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {top.map((s, i) => (
              <div key={s.name} style={{ display:"flex", alignItems:"center", gap:10, background: s.name===myName ? "#c084fc22" : "#171026", border:`1px solid ${s.name===myName?"#c084fc":"#3b2a58"}`, borderRadius:12, padding:"8px 12px" }}>
                <span style={{ fontSize:20, width:28, textAlign:"center" }}>{medals[i]}</span>
                <Avatar cfg={s.avatar} size={32} />
                <span style={{ flex:1, fontWeight:700, fontSize:13.5, color: s.name===myName ? "#c7d2fe" : "#f0e9fb" }}>{s.name}{s.name===myName?" (você)":""}</span>
                <span style={{ color:"#22d3ee", fontWeight:900, fontSize:14 }} title="Desempenho: notas + prova + poucos erros">🎯 {Math.round(s.merit)}</span>
              </div>
            ))}
          </div>
        )}
        {!loading && badges.length > 0 && (
          <>
            <p style={{ color:"#a99ac9", fontSize:12, fontWeight:700, margin:"18px 0 8px", borderTop:"1px solid #3b2a58", paddingTop:14 }}>🏅 Reconhecimentos da semana</p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {badges.map(b => (
                <div key={b.label} style={{ display:"flex", alignItems:"center", gap:10, background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"8px 12px" }}>
                  <span style={{ fontSize:18 }}>{b.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ color:"#a99ac9", fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.4 }}>{b.label}</div>
                    <div style={{ color:"#f0e9fb", fontSize:12.5, fontWeight:700 }}>{b.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ClassGoalBar({ sum }) {
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
