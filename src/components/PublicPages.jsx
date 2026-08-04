import { useState, useEffect } from "react";
import { getStudent, getTeacherMeta, getOwnHallOfFame, getLegacyHallOfFame, listStudents, getTurmas } from "../storage.js";
import { FONT, PAGE_BG } from "../lib/theme.ts";
import { LANG_SHIFT, shiftMeta, turmaCalendar } from "../lib/shifts.ts";
import { computeStreak } from "../lib/utils.js";
import { achievementInfo, visibleAchievements } from "../lib/achievements.ts";
import { Avatar } from "./Avatar.jsx";
import { NyxRobot } from "./NyxRobot.jsx";

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
      const [meta, liveStudents, turmas] = await Promise.all([getTeacherMeta(), listStudents(), getTurmas()]);
      if (!alive) return;
      const activeTurmas = (turmas || []).filter(t => !t.archived);
      const highlightOf = (s) => { const notas = [...Object.values(s.scoreHistory||{}), s.score, s.examScore].filter(n=>typeof n==="number"); return notas.length ? Math.max(...notas) : 0; };
      // soma o Hall da Fama + calendário de CADA turma — cada uma pode estar numa cidade
      // diferente da jornada, então os números totais somam todas em vez de ler um valor global só.
      // O histórico LEGADO (de antes de existir mais de uma turma) pertence a matutino E vespertino
      // ao mesmo tempo — soma só UMA vez no total, senão conta a mesma cidade encerrada em dobro
      const legacy = await getLegacyHallOfFame();
      let legacyAdded = false;
      const cities = [];
      for (const turma of activeTurmas) {
        const own = await getOwnHallOfFame(turma.id);
        const isLegacyEligible = turma.id === "matutino" || turma.id === "vespertino";
        const merged = isLegacyEligible ? [...legacy, ...own] : own;
        const cal = turmaCalendar(meta, turma.id);
        const turmaStudents = liveStudents.filter(s => (s.shift||"") === turma.id);
        const liveNotas = turmaStudents.map(highlightOf).filter(n=>n>0);
        const liveAvg = liveNotas.length ? Math.round(liveNotas.reduce((a,b)=>a+b,0)/liveNotas.length) : 0;
        const lastSnapshot = merged.length ? (merged[merged.length-1].classDaysSnapshot||0) : 0;
        const liveClasses = Math.max(0, cal.classDays.length - lastSnapshot);
        if (isLegacyEligible && !legacyAdded) {
          cities.push(...legacy.map(h => ({ city: h.city, students: h.totalStudents||0, classes: h.totalClasses||0, avg: h.avgScore||0, active:false })));
          legacyAdded = true;
        }
        cities.push(
          ...own.map(h => ({ city: h.city, students: h.totalStudents||0, classes: h.totalClasses||0, avg: h.avgScore||0, active:false })),
          ...(cal.city && turmaStudents.length ? [{ city: cal.city, students: turmaStudents.length, classes: liveClasses, avg: liveAvg, active:true }] : []),
        );
      }
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
export function ImpactPage() {
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
      setState({ loading: false, student, classDays: turmaCalendar(meta, shift).classDays });
    })().catch(() => { if (alive) setState({ loading: false, student: null, classDays: [] }); });
    return () => { alive = false; };
  }, [shift, name]);
  return state;
}
export function PortfolioPage({ shift, name }) {
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
