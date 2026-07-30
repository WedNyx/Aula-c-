import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { listStudents } from "../storage.js";
import { visibleAchievements, classGoalProgress } from "../lib/achievements.ts";
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

export function RankingModal({ shift, myName, onClose }) {
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
