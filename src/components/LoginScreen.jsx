import { useState, useEffect, useCallback } from "react";
import { listStudents } from "../storage.js";
import { shade } from "../lib/colors.ts";
import { FONT, PAGE_BG } from "../lib/theme.ts";
import { useViewportWidth } from "../lib/utils.js";
import { goFullscreen } from "../lib/schedule.ts";
import { SHIFTS, TEST_SHIFT, LANG_SHIFT, shiftMeta, DEFAULT_TURMAS } from "../lib/shifts.ts";
import { DEFAULT_AVATAR, Avatar, AvatarPreview, AvatarControls } from "./Avatar.jsx";
import { NyxPrismaOrbital as NyxRobot } from "./NyxPrismaOrbital.jsx";
import { Sparkles } from "./Sparkles.jsx";

// ════════════════════════════════════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════════════════════════════════════
export function Login({ onJoin, turmas }) {
  const vw = useViewportWidth();
  const isNarrow = vw < 720; // abaixo disso, a personalização do avatar empilha em vez de ficar em 2 colunas
  // pode ter mais de uma turma no mesmo turno (ex: duas de tarde) — turmas vem do professor (ver App.jsx);
  // sem a prop (ou ainda carregando), cai nas 2 turmas padrão pra nunca mostrar a tela vazia
  const activeTurmas = (Array.isArray(turmas) && turmas.length ? turmas : DEFAULT_TURMAS).filter(t => !t.archived);
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
  // criação de perfil novo em 2 passos: 1) nome/nascimento/CPF, 2) personalizar o boneco
  const [newStudentStep, setNewStudentStep] = useState(1);
  // chute inicial pelo horário do dia: pega a primeira turma do período provável (manhã/tarde) —
  // se o professor tiver mais de uma turma nesse período, o aluno escolhe a certa na lista mesmo assim
  const [shift, setShift] = useState(() => {
    const guessPeriod = new Date().getHours() < 13 ? "matutino" : "vespertino";
    const guess = activeTurmas.find(t => t.period === guessPeriod) || activeTurmas[0];
    return guess?.id || guessPeriod;
  });
  // turma de teste (protegida por senha)
  const [testUnlocking, setTestUnlocking] = useState(false);
  const [testPass, setTestPass] = useState("");
  const [testError, setTestError] = useState("");
  const [testChecking, setTestChecking] = useState(false);
  const [teacherChecking, setTeacherChecking] = useState(false);
  // sala de linguagens pra amigos (protegida por senha, mesmo modelo da turma de teste)
  const [langUnlocking, setLangUnlocking] = useState(false);
  const [langPass, setLangPass] = useState("");
  const [langError, setLangError] = useState("");
  const [langChecking, setLangChecking] = useState(false);

  // a senha é verificada no SERVIDOR (api/shift-auth.js) — nunca fica no código que chega ao navegador
  const checkShiftPassword = async (shiftId, pass) => {
    try {
      const r = await fetch("/api/shift-auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ shiftId, password: pass }) });
      const d = await r.json();
      return d.ok === true;
    } catch { return false; }
  };
  const openTestShift = () => { setTestUnlocking(true); setLangUnlocking(false); setTestPass(""); setTestError(""); };
  const confirmTestShift = async () => {
    if (testChecking) return;
    setTestChecking(true);
    const ok = await checkShiftPassword(TEST_SHIFT.id, testPass);
    if (ok) { setShift(TEST_SHIFT.id); setTestUnlocking(false); setTestError(""); }
    else setTestError("Senha incorreta!");
    setTestChecking(false);
  };
  const openLangShift = () => { setLangUnlocking(true); setTestUnlocking(false); setLangPass(""); setLangError(""); };
  const confirmLangShift = async () => {
    if (langChecking) return;
    setLangChecking(true);
    const ok = await checkShiftPassword(LANG_SHIFT.id, langPass);
    if (ok) { setShift(LANG_SHIFT.id); setLangUnlocking(false); setLangError(""); }
    else setLangError("Senha incorreta!");
    setLangChecking(false);
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
    // passo 2 (personalizar o boneco) fica bem mais largo: boneco de um lado, personalização do outro, lado a lado
    card:{ position:"relative", zIndex:1, background:"linear-gradient(145deg,#171029f5,#0e0a1cf5)", backdropFilter:"blur(12px)", borderRadius:22, padding:28, width: role==="teacher" ? 820 : 1060, maxWidth:"100%", maxHeight:"94vh", overflowY:"auto", border:"1px solid #5a427d", boxShadow:"0 28px 90px rgba(0,0,0,.62), 0 0 42px #7c3aed1f" },
    input:{ width:"100%", background:"#171026", border:"2px solid #3b2a58", borderRadius:12, padding:"12px 14px", color:"#f0e9fb", fontSize:15, outline:"none", boxSizing:"border-box" },
    btn:(c)=>({ background:`linear-gradient(135deg, ${c}, ${shade(c,-0.18)})`, color:"#fff", border:"none", borderRadius:12, padding:"12px 0", cursor:"pointer", fontWeight:800, fontSize:15, width:"100%", boxShadow:`0 4px 16px ${c}44` }),
    rBtn:()=>({ background:"#171026", color:"#a99ac9", border:`2px solid #3b2a58`, borderRadius:14, padding:"18px 8px", cursor:"pointer", fontWeight:800, fontSize:14, flex:1 }),
  };

  return (
    <div style={styles.container}>
      <Sparkles />
      <div className="pop login-card" style={styles.card}>
        <div className="login-access-title">
          <span />
          <div><small>PLATAFORMA DA TURMA</small><h1>ACESSO E PERFIL</h1></div>
          <span />
        </div>

        <div className="login-access-layout">
          <aside className="login-nyx-panel">
            <span className="login-step-number">{!role ? "01" : role==="teacher" ? "02" : newStudentStep===1 ? "02" : "03"}</span>
            <NyxRobot state="idle" size={132} showName={false} />
            <strong>Nyx Prisma Orbital</strong>
            <small>{!role ? "Escolha como deseja continuar" : role==="teacher" ? "Acesso ao painel do professor" : newStudentStep===1 ? "Escolha seu perfil ou faça seu cadastro" : "Personalize seu avatar"}</small>
          </aside>

          <section className="login-access-content">
            {role==="student" && <div className="login-steps"><span className={newStudentStep===1?"active":"done"}>1</span><i/><b>Dados e perfil</b><span className={newStudentStep===2?"active":""}>2</span><i/><b>Personalizar avatar</b></div>}

        {!role&&(
          <>
            <p style={{ color:"#a99ac9", textAlign:"center", marginBottom:14 }}>Quem é você?</p>
            <div className="login-role-grid">
              <button className="login-role-card" style={styles.rBtn()} onClick={()=>setRole("student")}>
                <span style={{ display:"block", fontSize:34, marginBottom:6 }}>🧑‍💻</span>
                <span style={{ display:"block", color:"#f0e9fb", fontSize:15 }}>Aluno</span>
                <span style={{ display:"block", color:"#776798", fontSize:11.5, fontWeight:600, marginTop:2 }}>programar e aprender</span>
              </button>
              <button className="login-role-card" style={styles.rBtn()} onClick={()=>setRole("teacher")}>
                <span style={{ display:"block", fontSize:34, marginBottom:6 }}>👨‍🏫</span>
                <span style={{ display:"block", color:"#f0e9fb", fontSize:15 }}>Professor</span>
                <span style={{ display:"block", color:"#776798", fontSize:11.5, fontWeight:600, marginTop:2 }}>acompanhar a turma</span>
              </button>
            </div>
          </>
        )}

        {role==="student"&&newStudentStep===1&&(
          <>
            <p style={{ color:"#fbbf24", fontWeight:600, marginBottom:10 }}>👤 Entrar como Aluno</p>

            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 8px" }}>🕑 Qual é a sua turma?</p>
            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              {activeTurmas.map(sh => (
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
                  <button onClick={confirmTestShift} disabled={testChecking} style={{ ...styles.btn("#c084fc"), width:"auto", padding:"0 16px", flexShrink:0, opacity:testChecking?0.6:1 }}>{testChecking ? "..." : "Entrar"}</button>
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
                  <button onClick={confirmLangShift} disabled={langChecking} style={{ ...styles.btn("#22d3ee"), width:"auto", padding:"0 16px", flexShrink:0, opacity:langChecking?0.6:1 }}>{langChecking ? "..." : "Entrar"}</button>
                </div>
                {langError && <p style={{ color:"#f87171", fontSize:12, marginTop:6 }}>{langError}</p>}
              </div>
            )}

            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ color:"#a99ac9", fontSize:13 }}>Já tem um perfil da turma {shiftMeta(shift, turmas).label}? Toque no seu nome:</span>
                <button onClick={loadProfiles} style={{ background:"transparent", border:"none", color:"#c084fc", cursor:"pointer", fontSize:12 }}>↻ atualizar</button>
              </div>
              {loadingProfiles ? <p style={{ color:"#776798", fontSize:13 }}>Procurando perfis salvos...</p>
                : profiles.filter(p => (p.shift||activeTurmas[0]?.id||"matutino")===shift).length===0 ? <p style={{ color:"#776798", fontSize:13 }}>Nenhum perfil salvo ainda nesta turma. Crie o seu abaixo 👇</p>
                : (
                  <div className="login-profile-grid">
                    {profiles.filter(p => (p.shift||activeTurmas[0]?.id||"matutino")===shift).map(p=>(
                      <button className="login-profile-card" key={`${p.shift||"x"}:${p.name}`} onClick={()=>openProfile(p)}>
                        <Avatar cfg={p.avatar} size={58} />
                        <span style={{ fontWeight:700, flex:1 }}>{p.name}</span>
                        <span style={{ color:"#c084fc", fontSize:13, fontWeight:700 }}>Entrar →</span>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:10, margin:"6px 0 14px" }}>
              <div style={{ flex:1, height:1, background:"#3b2a58" }}/>
              <span style={{ color:"#776798", fontSize:12 }}>ou crie um novo perfil na turma {shiftMeta(shift, turmas).label}</span>
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
            {error&&<p style={{ color:"#f87171", fontSize:13, marginTop:8 }}>{error}</p>}
            <div style={{ display:"flex", gap:8, marginTop:16 }}>
              <button style={{ ...styles.btn("#c084fc"), flex:1 }} onClick={()=>{ if(!name.trim()){ setError("Digite seu nome!"); return; } setError(""); setNewStudentStep(2); }}>Avançar →</button>
              <button style={{ ...styles.btn("#3b2a58"), width:44, flex:"none" }} onClick={()=>{ setRole(null); setError(""); }}>↩</button>
            </div>
          </>
        )}

        {role==="student"&&newStudentStep===2&&(
          <>
            <p style={{ color:"#fbbf24", fontWeight:600, marginBottom:10 }}>🎨 Personalize seu boneco, {name.trim().split(" ")[0]}!</p>

            {/* boneco de um lado, todas as modificações do outro, lado a lado (empilha em telas estreitas) */}
            <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
              <div style={{ flexShrink:0, margin:"0 auto" }}>
                <AvatarPreview value={avatar} onChange={setAvatar} />
              </div>
              <div style={{ flex: isNarrow ? "1 1 100%" : "1 1 440px", minWidth: isNarrow ? 0 : 400 }}>
                <div style={{ columnCount: isNarrow ? 1 : 2, columnGap:20 }}>
                  <AvatarControls value={avatar} onChange={setAvatar} part="all" />
                </div>
              </div>
            </div>
            {error&&<p style={{ color:"#f87171", fontSize:13, marginTop:8 }}>{error}</p>}
            <div style={{ display:"flex", gap:8, marginTop:16 }}>
              <button style={{ ...styles.btn("#c084fc"), flex:1 }} onClick={handleNewStudent}>Criar perfil e entrar →</button>
              <button style={{ ...styles.btn("#3b2a58"), width:44, flex:"none" }} onClick={()=>setNewStudentStep(1)}>↩</button>
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
          </section>
        </div>
      </div>

    </div>
  );
}
