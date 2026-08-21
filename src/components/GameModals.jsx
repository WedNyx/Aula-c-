import { useState, useEffect, useRef } from "react";
import { listStudents, listDuels, setDuel, clearDuel, getDuel, gradeDuel, listTeamDuels, getTeamDuel, setTeamDuel, clearTeamDuel, gradeTeamDuel } from "../storage.js";
import { playSound } from "../lib/sound.ts";
import { weekKey } from "../lib/schedule.ts";
import { generateDuelQuestions, generateKnowledgeTestQuestions, generateFreeBuildPlan } from "../lib/aiChallenges.js";
import { Avatar } from "./Avatar.jsx";

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

export function TypingRaceModal({ onClose, onFinish }) {
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

export function FreeBuildModal({ weeklyChallenge, onSave, onToggleStep, onFinish, language, onClose }) {
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

export function DuelModal({ shift, myName, myAvatar, questionContext, onAward, onWin, onClose }) {
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
      const qs = await generateDuelQuestions(questionContext);
      if (qs.length < 2) throw new Error("conteudo_insuficiente");
      const doc = { from:myName, to:opp.name, fromAvatar:myAvatar, toAvatar:opp.avatar, questions:qs, status:"invited", answersFrom:{}, answersTo:{}, scoreFrom:null, scoreTo:null, createdAt:Date.now() };
      await setDuel(shift, myName, opp.name, doc);
      setDuelState(doc);
    } catch(e) { setErr(e.message === "conteudo_insuficiente" ? "Ainda não há conteúdo estudado suficiente para criar um duelo. Continue a aula e tente novamente depois." : "Não consegui criar o duelo agora. Tente de novo em instantes."); }
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
    // corrige no SERVIDOR: manda só as respostas escolhidas, nunca o gabarito (que nem chega mais
    // até aqui — ver redactDuelQuestions em api/kv.js). O próprio servidor já grava a resposta/nota
    // no documento do duelo (usando a config verdadeira, com "correct") — o cliente só recarrega o
    // estado depois. Ele NÃO pode fazer esse merge sozinho: como o cliente só enxerga a versão sem
    // "correct" (redigida), regravar o documento inteiro por cima apagaria o gabarito pra sempre,
    // impedindo o outro jogador de ser corrigido depois.
    const result = await gradeDuel(shift, duel.from, duel.to, myName, myAnswers);
    if (!result) { setErr("Não consegui enviar suas respostas do duelo agora. Tente de novo."); return; }
    const latest = (await getDuel(shift, duel.from, duel.to)) || duel;
    setDuelState(latest);
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
export function TeamDuelModal({ shift, myName, myAvatar, questionContext, onAward, onWin, onClose }) {
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
      const qs = await generateDuelQuestions(questionContext);
      if (qs.length < 2) throw new Error("conteudo_insuficiente");
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
    } catch(e) { setErr(e.message === "conteudo_insuficiente" ? "Ainda não há conteúdo estudado suficiente para criar um duelo. Continue a aula e tente novamente depois." : "Não consegui criar o duelo em dupla agora. Tente de novo em instantes."); }
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
    // corrige no SERVIDOR: manda só as respostas escolhidas, nunca o gabarito. O merge (resposta +
    // nota + status) também é gravado lá — mesmo motivo do duelo 1x1 (ver comentário em
    // submitDuelAnswers): o cliente só enxerga a versão sem "correct", regravar o documento por
    // cima apagaria o gabarito pros outros 3 jogadores que ainda não responderam.
    const names = teamDuel.players.map(p=>p.name);
    const result = await gradeTeamDuel(shift, names, myName, myAnswers);
    if (!result) { setErr("Não consegui enviar suas respostas do duelo em dupla agora. Tente de novo."); return; }
    const latest = (await getTeamDuel(shift, names)) || teamDuel;
    setTeamDuelState(latest);
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
export function KnowledgeTestModal({ questionContext, onAward, onFirstToday, onClose }) {
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
        const qs = await generateKnowledgeTestQuestions(questionContext);
        if (qs.length < 2) throw new Error("conteudo_insuficiente");
        setQuestions(qs);
      } catch(e) { setErr(e.message === "conteudo_insuficiente" ? "Ainda não há conteúdo estudado suficiente para montar o teste. Escreva e salve mais um pouco da aula primeiro." : "Não consegui gerar o teste agora. Tente de novo em instantes."); }
      setLoading(false);
    })();
  }, [questionContext]);

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
