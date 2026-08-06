import { useState, useEffect, useRef } from "react";
import { getBoss, setBoss, clearBoss, setScoreFix, getTourney, setTourney, clearTourney } from "../storage.js";
import { TEST_SHIFT, SHIFTS } from "../lib/shifts.ts";
import { askClaudeJson } from "../lib/ai.js";
import { classGoalProgress } from "../lib/achievements.ts";
import { goFullscreen } from "../lib/schedule.ts";
import { gradeInfo } from "../lib/utils.js";
import { shade } from "../lib/colors.ts";
import { DF_CITIES, DF_REGION_COORDS, matchDfRegion } from "../lib/dfRegions.ts";
import { difficultyOf } from "../lib/studentStatus.ts";
import { Avatar } from "./Avatar.jsx";
import { ConfettiParty } from "./ConfettiParty.jsx";

// popup rápido de "situação da turma" — pensado pra abrir de dentro da aba "Meu código" (onde o
// professor costuma dar zoom na tela pra turma copiar) sem precisar trocar de aba e perder o zoom
export function QuickStatusModal({ students, onClose }) {
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

export function TelaoModal({ students, shift, turmas, onClose, teacherAuth }) {
  const turmaList = Array.isArray(turmas) && turmas.length ? turmas : SHIFTS;
  const [telaoShift, setTelaoShift] = useState(shift && shift !== "all" ? shift : (turmaList[0]?.id || "matutino"));
  // 👾 chefão da turma: HP = dano que a turma precisa causar; cada ponto ganho desde a invocação = 1
  // de dano. Cada turma tem seu próprio chefão — troca de telaoShift retoma o DAQUELA turma
  const [boss, setBossState] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = async () => { const b = await getBoss(telaoShift); if (alive) setBossState(b && b.status === "active" ? b : null); };
    load();
    const iv = setInterval(load, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, [telaoShift]);
  // ⏳ 10min de estudo antes da batalha começar de verdade — dá tempo da turma revisar o que
  // aprendeu antes do chefão aparecer pra valer
  const STUDY_MS = 10 * 60 * 1000;
  const summonBoss = async (maxHp) => {
    const preset = BOSS_PRESETS[Math.floor(Math.random() * BOSS_PRESETS.length)];
    const baseline = {};
    // só da turma que está enfrentando ESTE chefão — outra turma não deve nem participar do dano nem do bônus
    (students || []).filter(s => (s.shift||"") === telaoShift).forEach(s => { baseline[`${s.shift||"sem-turno"}:${s.name}`] = s.nyxPoints || 0; });
    const b = { status: "active", ...preset, maxHp, baseline, startedAt: Date.now(), studyUntil: Date.now() + STUDY_MS };
    await setBoss(telaoShift, b, teacherAuth);
    setBossState(b);
  };
  const skipStudy = async () => {
    if (!boss) return;
    const b = { ...boss, studyUntil: 0 };
    await setBoss(telaoShift, b, teacherAuth);
    setBossState(b);
  };
  // 🎁 bônus de participação: todo mundo que causou dano de verdade ganha uns pontos extras
  // quando o chefão é derrotado — recompensa a turma inteira, não só quem terminou por cima
  const BOSS_DEFEAT_BONUS = 3;
  // ref (não state) porque precisa bloquear um segundo clique ANTES do primeiro terminar — numa
  // conexão ruim (a carreta inteira divide um wifi só), o botão "🏁 Encerrar festa" continuava
  // clicável durante toda a ida-e-volta do setScoreFix, e um segundo clique enquanto o primeiro
  // ainda não voltou dava o bônus de +3 pts em dobro pra quem contribuiu
  const endingBossRef = useRef(false);
  const endBoss = async () => {
    if (endingBossRef.current) return;
    endingBossRef.current = true;
    try {
      if (bossDefeated && boss) {
        const contributors = (students || []).filter(s => (s.shift||"") === telaoShift)
          .filter(s => ((s.nyxPoints || 0) - (boss.baseline?.[`${s.shift||"sem-turno"}:${s.name}`] ?? 0)) > 0);
        await Promise.all(contributors.map(s => setScoreFix(s.shift, s.name, { kind: "boss-bonus", amount: BOSS_DEFEAT_BONUS }, teacherAuth)));
      }
      await clearBoss(telaoShift, teacherAuth);
      setBossState(null);
    } finally {
      endingBossRef.current = false;
    }
  };

  // 🏟️ torneio da turma: chaveamento eliminatório iniciado AQUI pelo professor — cada dupla
  // responde o mesmo mini-quiz na própria tela, e o telão apura os placares e avança as rodadas
  const [tourney, setTourneyState] = useState(null);
  const [tourneyBusy, setTourneyBusy] = useState(false);
  const [tourneyMsg, setTourneyMsg] = useState("");
  useEffect(() => {
    let alive = true;
    const load = async () => { const t = await getTourney(telaoShift); if (alive) setTourneyState(t); };
    load();
    const iv = setInterval(load, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, [telaoShift]);
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
    await setTourney(telaoShift, t, teacherAuth);
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
    await setTourney(telaoShift, t2, teacherAuth);
    setTourneyState(t2);
    setTourneyBusy(false);
  };
  const endTourney = async () => { await clearTourney(telaoShift, teacherAuth); setTourneyState(null); };

  const [telaoNow, setTelaoNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setTelaoNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  const bossStudying = boss && boss.studyUntil && telaoNow < boss.studyUntil;
  // só da turma que está enfrentando ESTE chefão — igual ao baseline (summonBoss) e ao ranking
  // (topContributors) logo abaixo. Antes filtrava só "não é a turma de teste", então QUALQUER
  // aluno de QUALQUER outra turma contava: como ele nunca teve baseline aqui, o nyxPoints inteiro
  // dele (não só o ganho desde a invocação) virava "dano" — um chefão podia nascer quase morto,
  // ou já derrotado, só por causa de pontos de alunos que nem estavam nessa turma
  const bossDamage = boss ? (students || []).filter(s => (s.shift||"") === telaoShift)
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
  const topContributors = boss ? (students || []).filter(s => (s.shift||"") === telaoShift)
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
          {turmaList.map(sh => (
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
          <button onClick={startTourney} disabled={tourneyBusy} style={{ background:"#0e7490", color:"#cffafe", border:"1px solid #22d3ee", borderRadius:12, padding:"8px 16px", fontSize:13, fontWeight:800, cursor:"pointer", opacity: tourneyBusy ? 0.6 : 1 }}>{tourneyBusy ? "Montando..." : `Iniciar torneio (${turmaList.find(sh=>sh.id===telaoShift)?.label || telaoShift})`}</button>
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

// ── 📋 justificar falta: o aluno escreve o motivo de um dia que faltou, o professor aprova depois ──
export function JustifyModal({ absences, onSubmit, onClose }) {
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
export function HallOfFameModal({ entries, onClose }) {
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
export function TripOverviewModal({ entries, currentCity, onClose }) {
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
