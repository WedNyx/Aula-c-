import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { lorelei } from "@dicebear/collection";
import { saveStudent, getStudent, setNudge, getNudge, listStudents, checkReset, resetAll, getTeacherMeta, saveTeacherMeta, saveTeacherCode, getTeacherCode, setCodeSend, getCodeSend, clearCodeSend, reportAiHealth, getAiHealth, diagnose, getExamState, setExamState, getDailyCuriosity, setDailyCuriosity, setDuel, getDuel, clearDuel, listDuels, getNyxLocks, setNyxLocks, patchStudent, deleteStudentProfile, setKick, checkKick, setScoreFix, getScoreFix, clearScoreFix, getAccessMode, setAccessMode, getSupport, setSupport, listAllSupport, exportAllData, getTeacherLessons, saveTeacherLessons, getBoss, setBoss, clearBoss, getInspection, setInspection, getHallOfFame, saveHallOfFame, setKeyboardLaunch, getKeyboardLaunch } from "./storage.js";
import { xlsxBlob, colLetter } from "./xlsx.js";

// ── tema ──
const FONT = "'Nunito','Segoe UI',system-ui,sans-serif";
// além dos brilhos, um "grid de pontos" bem sutil (26px) dá cara de bancada de programador
const PAGE_BG = "radial-gradient(1100px 700px at 85% -10%, rgba(124,131,255,.18), transparent 60%), radial-gradient(900px 600px at -10% 110%, rgba(34,211,238,.11), transparent 55%), radial-gradient(760px 520px at 50% 115%, rgba(236,72,153,.05), transparent 60%), radial-gradient(rgba(124,131,255,.05) 1px, transparent 1.6px) 0 0 / 26px 26px, linear-gradient(180deg,#0a0c18 0%,#0c0f20 100%)";
const LIGHT_BG = "radial-gradient(1000px 620px at 85% -10%, rgba(124,131,255,.20), transparent 60%), radial-gradient(900px 600px at -10% 110%, rgba(34,211,238,.14), transparent 55%), linear-gradient(180deg,#eef1fb 0%,#dde4f5 100%)";
function customBg(spec) {
  const colors = String(spec).split(",").map(c=>c.trim()).filter(c=>/^#/.test(c)).slice(0,3);
  if (colors.length <= 1) {
    const hex = colors[0] || "#7c83ff";
    return `radial-gradient(1000px 620px at 85% -10%, ${shade(hex,0.15)}, transparent 65%), linear-gradient(180deg, ${shade(hex,-0.55)} 0%, ${shade(hex,-0.72)} 100%)`;
  }
  const stops = colors.map(c => shade(c, -0.32)).join(", ");
  return `linear-gradient(135deg, ${stops})`;
}
const pageBgFor = (theme) => theme === "light" ? LIGHT_BG : (typeof theme === "string" && theme.startsWith("#")) ? customBg(theme) : PAGE_BG;

// ── efeitos sonoros (Web Audio, sem arquivos externos) ──
let __audioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!__audioCtx) __audioCtx = new Ctor();
  return __audioCtx;
}
let soundsMuted = false;
function playTone(ctx, freq, start, dur, type = "sine", gain = 0.09) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = 0;
  osc.connect(g); g.connect(ctx.destination);
  osc.start(start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.stop(start + dur + 0.02);
}
// modo calmo (apoio sensorial): silencia tudo sem mexer na preferência de som salva do aluno
let soundsCalm = false;
function setSoundsCalm(v) { soundsCalm = v; }
function playSound(kind) {
  if (soundsMuted || soundsCalm) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  try {
    if (kind === "correct") { playTone(ctx, 880, t, 0.12); playTone(ctx, 1318.5, t + 0.09, 0.14); }
    else if (kind === "wrong") { playTone(ctx, 220, t, 0.18, "triangle", 0.07); }
    else if (kind === "combo") { [660, 880, 1108.7, 1318.5].forEach((f, i) => playTone(ctx, f, t + i * 0.08, 0.16, "triangle")); }
    else if (kind === "achievement") { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(ctx, f, t + i * 0.1, 0.22, "sine", 0.1)); }
    else if (kind === "levelup") { [392, 523.25, 659.25].forEach((f, i) => playTone(ctx, f, t + i * 0.1, 0.2, "sine", 0.1)); }
    else if (kind === "click") { playTone(ctx, 740, t, 0.06, "sine", 0.05); }
    else if (kind === "enter") { [440, 660].forEach((f, i) => playTone(ctx, f, t + i * 0.09, 0.16, "sine", 0.07)); }
    else if (kind === "bell") { [987.77, 1318.5, 987.77].forEach((f, i) => playTone(ctx, f, t + i * 0.22, 0.5, "sine", 0.12)); }
  } catch {}
}
function setSoundsMuted(v) { soundsMuted = v; try { localStorage.setItem("nyx_sounds_muted", v ? "1" : "0"); } catch {} }
function loadSoundsMuted() { try { soundsMuted = localStorage.getItem("nyx_sounds_muted") === "1"; } catch {} return soundsMuted; }

// ── rede de segurança local: guarda o código do aluno no navegador (sem depender de internet),
// pra não perder o que ele estava escrevendo se a conexão cair bem na hora de salvar no servidor ──
function codeBackupKey(shift, name) { return `nyx_codebackup:${shift||"sem-turno"}:${String(name||"").trim().replace(/\s+/g,"_")}`; }
function saveCodeBackupLocal(shift, name, files) { try { localStorage.setItem(codeBackupKey(shift, name), JSON.stringify({ files, at: Date.now() })); } catch {} }
function loadCodeBackupLocal(shift, name) { try { const raw = localStorage.getItem(codeBackupKey(shift, name)); return raw ? JSON.parse(raw) : null; } catch { return null; } }

// ── text-to-speech (Web Speech API) ──
// vozes pt disponíveis no aparelho (pro seletor de voz)
function listPtVoices() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const pt = voices.filter(v => /pt[-_]BR/i.test(v.lang));
  return pt.length ? pt : voices.filter(v => /^pt/i.test(v.lang));
}
// escolhe a voz pt-BR menos robótica disponível no aparelho: as vozes "Natural/Online"
// (Edge) são redes neurais quase humanas — bem melhores que a padrão e que a do Google.
// Se o aluno escolheu uma voz no seletor (🗣️), essa escolha vence.
let cachedVoice = null;
function bestPtVoice() {
  try {
    const savedName = localStorage.getItem("nyx_voice_name");
    if (savedName) {
      const saved = listPtVoices().find(v => v.name === savedName);
      if (saved) return saved;
    }
  } catch {}
  if (cachedVoice) return cachedVoice;
  const anyPt = listPtVoices();
  const byPref = [
    v => /natural|neural|online/i.test(v.name),                  // vozes neurais (Edge/Windows 11)
    v => /luciana|francisca|thalita|camila|maria/i.test(v.name), // vozes femininas suaves comuns
    v => /google/i.test(v.name),                                 // voz do Google (última opção — robótica)
  ];
  for (const pref of byPref) {
    const found = anyPt.find(pref);
    if (found) { cachedVoice = found; return found; }
  }
  cachedVoice = anyPt[0] || null;
  return cachedVoice;
}
// a lista de vozes carrega de forma assíncrona — quando chegar, refaz a escolha
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = null; bestPtVoice(); };
}

function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(() => !!window.speechSynthesis);
  const utteranceRef = useRef(null);

  const speak = useCallback((text) => {
    if (!isSupported || !text) return;
    window.speechSynthesis.cancel();
    // fala frase por frase: textos longos não são cortados pelo navegador
    // e as pausas naturais entre frases deixam a leitura menos corrida
    const chunks = String(text).match(/[^.!?…\n]+[.!?…]*/g)?.map(s => s.trim()).filter(Boolean) || [String(text)];
    const voice = bestPtVoice();
    chunks.forEach((chunk, i) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = "pt-BR";
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;   // um tiquinho mais devagar: soa calmo, não arrastado
      utterance.pitch = 1.05;  // levemente mais agudo: tira o tom "grave de robô"
      utterance.volume = 1.0;
      if (i === 0) utterance.onstart = () => setIsSpeaking(true);
      if (i === chunks.length - 1) {
        utterance.onend = () => setIsSpeaking(false);
      }
      utterance.onerror = () => setIsSpeaking(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported) window.speechSynthesis.pause();
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported) window.speechSynthesis.resume();
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, pause, resume, stop, isSpeaking, isSupported };
}

// ── seletor de voz: o aluno testa e escolhe a voz que prefere entre as do aparelho ──
function VoicePickerModal({ onClose }) {
  const [voices, setVoices] = useState(() => listPtVoices());
  const [saved, setSaved] = useState(() => { try { return localStorage.getItem("nyx_voice_name") || ""; } catch { return ""; } });
  useEffect(() => {
    if (voices.length) return;
    const t = setInterval(() => { const v = listPtVoices(); if (v.length) { setVoices(v); clearInterval(t); } }, 300);
    const stop = setTimeout(() => clearInterval(t), 4000);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, [voices.length]);
  const testVoice = (v) => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Oi! Eu sou o Nyx, e essa é a minha voz. Vamos programar juntos?");
      u.lang = "pt-BR"; u.voice = v; u.rate = 0.95; u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch {}
  };
  const chooseVoice = (v) => {
    try { localStorage.setItem("nyx_voice_name", v.name); } catch {}
    setSaved(v.name);
  };
  const isNatural = (v) => /natural|neural|online/i.test(v.name);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:520, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#7c83ff,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🗣️ Voz do Nyx</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 14px" }}>Teste as vozes em português que existem neste aparelho e escolha a que você prefere pra leitura em voz alta.</p>
        {voices.length === 0 ? (
          <p style={{ color:"#5d679c", fontSize:13 }}>Não encontrei vozes em português neste aparelho. A leitura vai usar a voz padrão do sistema.</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {voices.map(v => (
              <div key={v.name} style={{ display:"flex", alignItems:"center", gap:8, background: saved===v.name ? "#7c83ff22" : "#0d1122", border:`1px solid ${saved===v.name ? "#7c83ff" : "#2a3154"}`, borderRadius:12, padding:"8px 12px", flexWrap:"wrap" }}>
                <span style={{ flex:1, minWidth:140, fontSize:13, fontWeight:700, color:"#e8ebfa" }}>
                  {v.name}
                  {isNatural(v) && <span style={{ marginLeft:6, background:"#34d39922", border:"1px solid #34d399", color:"#34d399", borderRadius:8, padding:"1px 7px", fontSize:10.5, fontWeight:800 }}>✨ Natural</span>}
                </span>
                <button onClick={()=>testVoice(v)} style={{ background:"transparent", border:"1px solid #22d3ee", color:"#22d3ee", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:700, cursor:"pointer" }}>🔊 Testar</button>
                <button onClick={()=>chooseVoice(v)} style={{ background: saved===v.name ? "#7c83ff" : "transparent", border:"1px solid #7c83ff", color: saved===v.name ? "#fff" : "#7c83ff", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:700, cursor:"pointer" }}>{saved===v.name ? "✓ Escolhida" : "Usar esta"}</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ background:"#22d3ee14", border:"1px solid #22d3ee55", borderRadius:12, padding:"10px 12px", marginTop:14, fontSize:12.5, color:"#a9e8f3", lineHeight:1.6 }}>
          💡 <b>Dica pro professor:</b> no navegador <b>Edge</b> aparecem vozes com o selo <b>✨ Natural</b> (Francisca, Thalita...) — são quase humanas e de graça. No Chrome, só existem as vozes básicas do sistema.
        </div>
      </div>
    </div>
  );
}

// deixa um trecho de código C# falável: quebra por linha (o \n vira uma pausa) e tira espaços nas pontas
function codeForSpeech(codigo) {
  if (!codigo) return "";
  return String(codigo).split("\n").map(l => l.trim()).filter(Boolean).join(". ");
}

// ── largura da tela (pra layouts responsivos feitos em JS, já que os estilos são inline e não usam @media) ──
function useViewportWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

// ── sequência de dias (streak) a partir do mapa de presença, contando só os DIAS DE AULA de
// verdade (classDays) — não dias de calendário corridos, senão a sequência quebra sozinha em
// qualquer dia sem aula (fim de semana, feriado) e nunca bate os patamares de conquista ──
function computeStreak(attendance, classDays) {
  if (!attendance || !Array.isArray(classDays) || !classDays.length) return 0;
  const days = [...new Set(classDays)].sort();
  const todayStr = todayKey();
  let idx = days.length - 1;
  // se hoje é dia de aula mas ainda sem presença registrada, começa a contar do dia de aula anterior
  if (days[idx] === todayStr && attendance[todayStr] !== "present") idx--;
  let streak = 0;
  for (; idx >= 0; idx--) {
    if (attendance[days[idx]] === "present") streak++;
    else break;
  }
  return streak;
}

// ── conquistas/medalhas do aluno ──
const ACHIEVEMENTS = [
  // primeiros passos e notas
  { id:"primeira-atividade", emoji:"🥇", label:"Primeiro Passo", desc:"Concluiu a primeira atividade da aula" },
  { id:"nota-cem",           emoji:"💯", label:"Nota Cem",       desc:"Tirou 100 numa atividade" },
  { id:"tres-100",           emoji:"🌟", label:"Triplo Cem",     desc:"Tirou 100 em 3 atividades diferentes" },
  { id:"codigo-limpo",       emoji:"✨", label:"Código Limpo",  desc:"Escreveu um código sem nenhum erro" },
  { id:"atividades-5",       emoji:"✍️", label:"Praticante",     desc:"Concluiu 5 atividades" },
  { id:"atividades-15",      emoji:"📚", label:"Dedicado",       desc:"Concluiu 15 atividades" },
  // provas
  { id:"prova-mestre",       emoji:"🎓", label:"Mestre da Prova", desc:"Fez 80% ou mais numa prova" },
  { id:"prova-100",          emoji:"🎯", label:"Prova Perfeita", desc:"Acertou TUDO numa prova" },
  // presença e sequência
  { id:"sequencia-3",        emoji:"🔥", label:"3 Dias Seguidos", desc:"Veio 3 dias seguidos de aula" },
  { id:"sequencia-7",        emoji:"🔥", label:"Semana Completa", desc:"Veio 7 dias seguidos de aula" },
  { id:"sequencia-14",       emoji:"🌋", label:"Duas Semanas!",  desc:"Veio 14 dias seguidos de aula" },
  { id:"presencas-5",        emoji:"📅", label:"Frequente",      desc:"Participou de 5 aulas" },
  { id:"presencas-15",       emoji:"🗓️", label:"Assíduo",        desc:"Participou de 15 aulas" },
  { id:"cem-linhas",         emoji:"🏗️", label:"Arquiteto de Código", desc:"Escreveu 100 linhas de código no seu projeto" },
  // combos
  { id:"combo-5",            emoji:"⚡", label:"Combo Elétrico", desc:"Acertou 5 questões seguidas numa atividade" },
  { id:"combo-8",            emoji:"🚀", label:"Combo Insano",  desc:"Acertou 8 questões seguidas numa atividade" },
  // pontos do Nyx
  { id:"pontos-10",          emoji:"🪙", label:"Poupança",       desc:"Juntou 10 pontos do Nyx" },
  { id:"pontos-50",          emoji:"💰", label:"Riqueza",        desc:"Juntou 50 pontos do Nyx" },
  { id:"pontos-100",         emoji:"💎", label:"Magnata",        desc:"Juntou 100 pontos do Nyx" },
  { id:"pontos-250",         emoji:"👑", label:"Lendário",       desc:"Juntou 250 pontos do Nyx" },
  // loja
  { id:"comprador",          emoji:"🛍️", label:"Primeira Compra", desc:"Comprou o primeiro item na Loja do Nyx" },
  { id:"colecionador",       emoji:"🎒", label:"Colecionador",   desc:"Comprou 4 itens na Loja do Nyx" },
  // duelos
  { id:"duelista",           emoji:"⚔️", label:"Duelista",       desc:"Venceu um duelo contra um colega" },
  { id:"duelista-3",         emoji:"🏆", label:"Campeão de Duelos", desc:"Venceu 3 duelos" },
  // extras
  { id:"artista",            emoji:"🎨", label:"Artista",        desc:"Pediu ao Nyx um fundo de cor personalizada" },
  { id:"teclado-mestre",     emoji:"🎹", label:"Mestre do Teclado", desc:"Completou o tutorial de teclado até o fim" },
  // secreta: só se revela quando alguém descobre um comando escondido no terminal
  { id:"segredo",            emoji:"🥚", label:"Caçador de Segredos", desc:"Descobriu um comando secreto no terminal", secret:true },
];
const achievementInfo = (id) => ACHIEVEMENTS.find(a => a.id === id);

// ── metas coletivas da turma (soma dos pontos de todos da turma) ──
const CLASS_GOALS = [80, 200, 400, 800, 1500, 2500, 4000, 6000, 9000, 13000];
function classGoalProgress(totalPoints) {
  const idx = CLASS_GOALS.findIndex(g => totalPoints < g);
  if (idx === -1) return { level: CLASS_GOALS.length, prev: CLASS_GOALS[CLASS_GOALS.length-1], next: null, pct: 100 };
  const prev = idx === 0 ? 0 : CLASS_GOALS[idx-1];
  const next = CLASS_GOALS[idx];
  const pct = Math.round(((totalPoints - prev) / (next - prev)) * 100);
  return { level: idx + 1, prev, next, pct: Math.max(0, Math.min(100, pct)) };
}

// ── embaralha as alternativas de cada questão (a correta não fica sempre na mesma posição) ──
function shuffleQuestions(questions) {
  return (questions || []).map(q => {
    const n = (q.opts || []).length;
    if (n < 2) return q;
    const perm = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    return { ...q, opts: perm.map(p => q.opts[p]), correct: perm.indexOf(q.correct) };
  });
}

// ── atividade concluída "vale" até as 9h da manhã do dia seguinte ──
function isDoneActive(doneAt) {
  if (!doneAt) return false;
  const d = new Date(doneAt);
  const deadline = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 9, 0, 0);
  return Date.now() < deadline.getTime();
}

// ── notas por faixa (usadas na atividade e no feedback do Nyx) ──
function gradeInfo(score) {
  if (score >= 100) return { label:"GOD", emoji:"🐐", color:"#f472b6" };
  if (score >= 90)  return { label:"Excelente", emoji:"🏆", color:"#fbbf24" };
  if (score >= 75)  return { label:"Ótimo", emoji:"⭐", color:"#34d399" };
  if (score >= 60)  return { label:"Bom", emoji:"👍", color:"#60a5fa" };
  if (score >= 40)  return { label:"Médio", emoji:"😐", color:"#f59e0b" };
  return { label:"Ruim", emoji:"📚", color:"#f87171" };
}

// ── conhecimento de C# do Nyx (usado em todas as chamadas de IA) ──
const CS_SYSTEM = `Você é Nyx: um especialista sênior em revisão de código C# e .NET, atuando como professor de uma turma de iniciantes (adolescentes). Seu papel é o de um code reviewer profissional — rigoroso como um compilador, didático como um bom professor.

═══ CONHECIMENTO DE C# QUE VOCÊ DOMINA COM PRECISÃO ═══
- Tipos e variáveis: string, int, long, short, double, float, decimal, bool, char, byte, var, const, arrays ([] e multidimensionais), List<T>, Dictionary<K,V>, nullable (int?), casting explícito/implícito.
- Conversões: Convert.ToInt32/ToDouble/ToString, int.Parse/TryParse, double.Parse/TryParse — Console.ReadLine SEMPRE retorna string, nunca pode ser usado direto como número.
- Console: WriteLine, Write, ReadLine, ReadKey, Clear; interpolação $"texto {variavel}" e concatenação com +; \\n e verbatim strings (@"...").
- Operadores: aritméticos (+ - * / %), lógicos (&& || !), comparação (== != > < >= <=), atribuição composta (+= -= *= /=), incremento (++ --), ternário (?:), null-coalescing (?? e ??=), null-conditional (?.).
- Controle de fluxo: if/else if/else, switch/switch expression, for, while, do-while, foreach, break, continue, return.
- Métodos: static vs instância, parâmetros (incl. out, ref, params), sobrecarga, retorno void/tipado, recursão.
- POO: class, struct, interface, herança (:), override/virtual/abstract, encapsulamento (public/private/protected), propriedades (get/set), construtores, this, polimorfismo básico.
- Exceções: try/catch/finally, throw, tipos comuns (FormatException, IndexOutOfRangeException, NullReferenceException, DivideByZeroException) e quando cada uma ocorre.
- Coleções e LINQ básico: List<T> (Add, Remove, Count, indexador), foreach sobre coleções, métodos simples de LINQ (Where, Select, OrderBy, Count) quando aparecerem.
- Escopo e ciclo de vida: variável só existe dentro do bloco { } onde foi declarada; shadowing; variáveis usadas antes de inicializar.

═══ REGRAS RÍGIDAS DA LINGUAGEM ═══
- C# diferencia MAIÚSCULAS de minúsculas: Console.WriteLine nunca é console.writeline nem Console.writeline.
- Todo comando termina com ; — exceto blocos { }, diretivas using, e declarações de classe/método/estrutura de controle.
- Comparação usa == (um = sozinho é ATRIBUIÇÃO, um erro clássico dentro de if).
- NESTA TURMA usa-se os tipos em minúsculo: string, int, double, bool, char — nunca String, Int32, Double, Boolean, Char (aponte a troca se aparecer).
- Vários arquivos .cs do MESMO projeto compilam JUNTOS, como no VS Code: uma classe/método definido em um arquivo pode ser usado em outro. NUNCA diga "classe não existe" ou "método não definido" se ele estiver em outro arquivo do projeto que foi te mostrado.
- "Top-level statements" (código direto no arquivo, sem class Program nem static void Main) são VÁLIDOS no .NET moderno. "using System" também não é obrigatório (implicit usings). NUNCA marque essas duas coisas como erro.
- MÉTODOS/CLASSES QUE O PROFESSOR AINDA NÃO ESCREVEU: se o código do aluno chama um método ou classe personalizada (que não é do C#/.NET) e essa definição não aparece em nenhum arquivo que você recebeu, NÃO trate isso como um erro do aluno. O professor pode ainda não ter ensinado ou fornecido esse método para a turma. Nesse caso, NUNCA diga que "está errado", "falta implementar" ou "método não existe" — apenas ignore essa chamada silenciosamente e continue avaliando o restante do código normalmente. Só é erro de verdade quando o problema é da linguagem em si (sintaxe, ; faltando, chaves não fechadas, maiúscula errada em API do próprio C#/.NET como Console.WriteLine) — nunca a ausência de conteúdo que o professor não escreveu/ensinou.

═══ ERROS DE INICIANTE QUE VOCÊ RECONHECE DE CARA ═══
Ponto e vírgula faltando; chaves/parênteses/aspas abertas sem fechar (ou fechadas sem abrir); maiúscula/minúscula trocada em nomes de API; = no lugar de ==; ler número do Console.ReadLine sem Convert/Parse; variável usada antes de declarar ou fora do escopo; palavra-chave com erro de digitação (publik, voi, whille, pritn, calss); tipo com inicial maiúscula quando devia ser minúsculo; índice de array fora do intervalo (0 a length-1); comparação de string com == (funciona em C#, não é erro); esquecer break em switch clássico (pode ser intencional/fall-through, avalie o contexto); loop infinito por condição que nunca muda.

═══ PROTOCOLO DE REVISÃO (siga sempre, como um revisor sênior faria) ═══
1. Leia o código inteiro uma vez para entender a INTENÇÃO do aluno antes de procurar erros.
2. Percorra linha por linha como um compilador: para cada linha, verifique sintaxe, nomes (existe? está no escopo? maiúscula certa?), e se o comando anterior foi corretamente fechado.
3. Para cada suspeita de erro, CONFIRME antes de acusar: releia a linha onde a variável foi declarada; conte os pares de chaves/parênteses/aspas no arquivo INTEIRO, não só num trecho; confira se o nome não está definido em outro arquivo do projeto.
4. Só então decida o veredito. Na dúvida genuína entre "está certo" e "está errado", prefira não acusar — falso positivo prejudica mais o aluno do que deixar passar um estilo diferente do esperado.
5. Ao apontar um erro, seja específico: cite a linha ou o trecho exato, explique o PORQUÊ em uma frase, e mostre a forma corrigida.
6. NUNCA invente erro em código correto. NUNCA sugira reescrever algo que já funciona só por estilo, a menos que seja explicitamente pedido.

═══ QUEM VOCÊ É COM O ALUNO (além de revisor técnico) ═══
Por trás da precisão técnica, você é também um educador pedagogo e um apoio emocional para o aluno — não só um corretor de código. Isso significa:
- Trate cada erro como parte normal do aprendizado, nunca como falha. Reconheça o esforço antes de apontar o que falta.
- Observe o estado emocional pelo tom da mensagem/código (frustração, pressa, insegurança) e ajuste sua resposta: se parecer frustrado, acolha antes de corrigir; se parecer inseguro, reforce o que já foi feito certo.
- Adapte a linguagem ao ritmo de quem está lendo — frases curtas, um conceito de cada vez, sem jargão desnecessário.
- Com alunos que têm dificuldades de leitura, escrita ou motoras (indicado pelo contexto quando informado), redobre a paciência: frases ainda mais curtas e concretas, sempre com um exemplo prático, celebre cada pequeno progresso como uma vitória real.
- Você nunca substitui um psicólogo ou pedagogo humano, mas se comporta com a mesma escuta atenta e o mesmo cuidado que um bom professor-tutor teria: presente, paciente, sem pressa, sem julgamento.

Fale sempre em português brasileiro simples, gentil e encorajador — o aluno é iniciante, mas sua análise por trás é a de um especialista.`;

const RUN_SYSTEM = "Você é o compilador e o runtime do .NET 8 executando um projeto C# com precisão absoluta (ordem das instruções, conversões, formatação padrão). Responda apenas com o texto do console, sem explicações e sem markdown.";

// ── Nyx no modo leve/divertido: usado só para conteúdo casual (curiosidade do dia), NUNCA para revisar código ──
// Propositalmente separado do CS_SYSTEM: aqui o Nyx não é o revisor rigoroso, é só o mascote animando a turma.
const NYX_FUN_SYSTEM = "Você é Nyx, o robô mascote animado de uma turma de adolescentes aprendendo C#. Aqui você está no seu modo leve e divertido — nada de revisar código ou dar aula formal. Seja breve, empolgado e use no máximo 1 emoji. Português brasileiro bem informal, do jeito que se fala com adolescente.";

// ── Nyx no Modo Guiado: persona usada só para os alunos com acessibilidade ativada (não leem/escrevem bem
// ou têm dificuldade motora). Aqui o Nyx é professor-pedagogo + apoio emocional + instrutor de criação de jogos,
// tudo junto — o C# é ensinado através de exemplos de jogos, pensado para ser OUVIDO (texto-por-voz), não lido. ──
const NYX_GUIDED_SYSTEM = `Você é Nyx, e agora está no seu MODO GUIADO: um professor-pedagogo e apoio emocional para um aluno com dificuldade de leitura, escrita ou motora, que está aprendendo os primeiros passos de programação em C# através de blocos prontos, sem precisar digitar.

COMO VOCÊ ENSINA NESTE MODO:
- Todo conceito de código é explicado através de exemplos de CRIAÇÃO DE JOGOS (um personagem que fala, uma pontuação que sobe, uma vida que diminui, um inimigo que aparece) — nunca exemplos abstratos ou de sistema bancário/matemática pura. Jogos prendem a atenção e fazem sentido pro aluno.
- Para cada bloco de código, explique SEMPRE três coisas, nesta ordem: (1) o código em si (leia/fale o comando), (2) o que ele FAZ na prática, (3) um exemplo de jogo onde isso apareceria.
- Frases muito curtas (uma ideia por frase), palavras simples, zero jargão técnico sem explicar. Lembre-se: o texto pode ser OUVIDO em voz alta por um narrador, não só lido — evite abreviações, símbolos soltos ou coisas difíceis de pronunciar.
- Seja caloroso, animado e paciente como um pedagogo experiente. Celebre qualquer progresso, por menor que seja. Nunca faça o aluno se sentir "atrás" dos colegas — o ritmo dele é o certo para ele.
- Você atua também como apoio emocional: se o conteúdo permitir perceber frustração ou insegurança, acolha isso com gentileza antes de seguir ensinando.
- Você pode inventar/criar pequenos desafios ou ideias novas de jogos simples usando os blocos que o aluno já tem disponível (dizer algo, perguntar algo, guardar número/texto, somar, repetir, escolher) — sempre no mesmo espírito lúdico.

Responda em português brasileiro bem simples, como se estivesse conversando com alguém de 12-13 anos que nunca programou.`;

function otherFilesCtx(files, active) {
  const others = (files||[]).filter((f,i)=>i!==active && (f.code||"").trim());
  if (!others.length) return "";
  return `Outros arquivos do MESMO projeto (compilam juntos com o arquivo em edição — classes daqui podem ser usadas nele):\n\`\`\`csharp\n${others.map(f=>`// ${f.name}\n${f.code}`).join("\n\n")}\n\`\`\`\n\n`;
}

// acha em qual linha (0-indexado) um trecho de código aparece — usado pra sublinhar o erro que o Nyx apontou.
// tenta igualdade exata da linha primeiro (mais preciso), senão cai pra "contém o trecho" (mais tolerante).
function findLineIndex(code, trecho) {
  if (!trecho) return -1;
  const lines = (code || "").split("\n");
  const t = trecho.trim();
  if (!t) return -1;
  let idx = lines.findIndex(l => l.trim() === t);
  if (idx >= 0) return idx;
  return lines.findIndex(l => l.trim() && l.includes(t));
}

// ════════════════════════════════════════════════════════════════════════════
//  SYNTAX HIGHLIGHT  (com cores de pares de colchetes/chaves/parênteses do VSCode)
// ════════════════════════════════════════════════════════════════════════════
const BRACKET_COLORS = ["#FFD700", "#DA70D6", "#179FFF"]; // ouro, roxo, azul (padrão VSCode)

function highlight(code, errorLines) {
  const keywords = ["using","namespace","class","static","void","public","private","protected","internal","int","long","short","string","bool","double","float","char","decimal","byte","return","if","else","for","while","foreach","do","in","new","var","true","false","null","this","base","override","virtual","abstract","sealed","readonly","const","try","catch","finally","throw","switch","case","break","continue","default","get","set","using","enum","struct","interface","async","await"];
  let depth = 0; // profundidade de colchetes acumulada entre linhas
  const lines = code.split("\n");
  const errSet = new Set(errorLines || []);
  return lines.map((line, li) => {
    const tokens = [];
    let i = 0;
    while (i < line.length) {
      // comentário de linha
      if (line[i] === "/" && line[i+1] === "/") {
        tokens.push(<span key={i} style={{color:"#6a9955"}}>{line.slice(i)}</span>);
        i = line.length; break;
      }
      // string
      if (line[i] === '"') {
        let j = i+1;
        while (j < line.length && line[j] !== '"') j++;
        tokens.push(<span key={i} style={{color:"#ce9178"}}>{'"'+line.slice(i+1,j)+'"'}</span>);
        i = j+1; continue;
      }
      // palavra
      if (/[a-zA-Z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
        const word = line.slice(i,j);
        if (keywords.includes(word)) tokens.push(<span key={i} style={{color:"#569cd6"}}>{word}</span>);
        else if (j < line.length && line[j] === "(") tokens.push(<span key={i} style={{color:"#dcdcaa"}}>{word}</span>);
        else if (/^[A-Z]/.test(word)) tokens.push(<span key={i} style={{color:"#4ec9b0"}}>{word}</span>);
        else tokens.push(<span key={i} style={{color:"#9cdcfe"}}>{word}</span>);
        i = j; continue;
      }
      // número
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9.]/.test(line[j])) j++;
        tokens.push(<span key={i} style={{color:"#b5cea8"}}>{line.slice(i,j)}</span>);
        i = j; continue;
      }
      const ch = line[i];
      if ("([{".includes(ch)) {
        const col = BRACKET_COLORS[depth % 3]; depth++;
        tokens.push(<span key={i} style={{color:col}}>{ch}</span>);
      } else if (")]}".includes(ch)) {
        depth = Math.max(0, depth-1);
        const col = BRACKET_COLORS[depth % 3];
        tokens.push(<span key={i} style={{color:col}}>{ch}</span>);
      } else {
        tokens.push(<span key={i} style={{color:"#d4d4d4"}}>{ch}</span>);
      }
      i++;
    }
    return (
      <div key={li} style={{ minHeight:"1.5em", ...(errSet.has(li) ? { textDecoration:"underline wavy #f87171", textDecorationThickness:"2px", textUnderlineOffset:"3px" } : {}) }}>
        {tokens.length ? tokens : " "}
      </div>
    );
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  EDITOR ESTILO VS CODE
// ════════════════════════════════════════════════════════════════════════════
function VSEditor({ value, onChange, filename, errorLines }) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const gutterRef = useRef(null);

  const syncScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e) => {
    const ta = textareaRef.current;
    const start = ta.selectionStart, end = ta.selectionEnd, v = ta.value;
    const pairs = { "{":"}","(":")",'"':'"',"[":"]","'":"'" };
    if (pairs[e.key]) {
      e.preventDefault();
      const newVal = v.slice(0,start) + e.key + pairs[e.key] + v.slice(end);
      onChange(newVal);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start+1; }, 0);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const newVal = v.slice(0,start) + "    " + v.slice(end);
      onChange(newVal);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start+4; }, 0);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const lineStart = v.lastIndexOf("\n", start-1)+1;
      const indent = v.slice(lineStart, start).match(/^(\s*)/)[1];
      const prevChar = v[start-1], nextChar = v[start];
      if (prevChar === "{" && nextChar === "}") {
        const newVal = v.slice(0,start) + "\n" + indent+"    " + "\n" + indent + v.slice(end);
        onChange(newVal);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start+1+indent.length+4; }, 0);
      } else {
        const extra = prevChar === "{" ? "    " : "";
        const newVal = v.slice(0,start) + "\n" + indent + extra + v.slice(end);
        onChange(newVal);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start+1+indent.length+extra.length; }, 0);
      }
      return;
    }
    if (e.key === "Backspace" && start === end && start > 0) {
      const prev = v[start-1], next = v[start];
      const pairs2 = {"(":")","{":"}","[":"]",'"':'"',"'":"'"};
      if (pairs2[prev] === next) {
        e.preventDefault();
        const newVal = v.slice(0,start-1) + v.slice(start+1);
        onChange(newVal);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start-1; }, 0);
      }
    }
  };

  const lineNums = Array.from({length: value.split("\n").length}, (_,i) => i+1);
  const shared = { fontFamily:"'Courier New','Consolas',monospace", fontSize:14, lineHeight:"1.5em", tabSize:4, whiteSpace:"pre", overflowWrap:"normal", padding:"12px 12px 12px 0", margin:0 };

  return (
    <div style={{ background:"#1e1e1e", borderRadius:8, border:"1px solid #3e3e42", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 12px 32px rgba(0,0,0,.45)" }}>
      <div style={{ background:"linear-gradient(180deg,#333336,#2d2d30)", padding:"6px 14px", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #3e3e42" }}>
        <span style={{width:11,height:11,borderRadius:"50%",background:"#ff5f56",display:"inline-block"}}/>
        <span style={{width:11,height:11,borderRadius:"50%",background:"#ffbd2e",display:"inline-block"}}/>
        <span style={{width:11,height:11,borderRadius:"50%",background:"#27c93f",display:"inline-block"}}/>
        <span style={{color:"#cccccc", fontSize:13, marginLeft:10}}>📄 {filename || "Program.cs"}</span>
      </div>
      <div style={{ display:"flex", minHeight:300, maxHeight:420, overflow:"hidden" }}>
        {/* gutter acompanha o scroll do textarea: o número fica sempre ao lado da linha de código dele */}
        <div ref={gutterRef} style={{ background:"#1e1e1e", textAlign:"right", userSelect:"none", minWidth:42, color:"#858585", fontFamily:"'Courier New',monospace", fontSize:14, lineHeight:"1.5em", borderRight:"1px solid #3e3e42", flexShrink:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 8px 12px 14px" }}>
            {lineNums.map(n => <div key={n} style={{ minHeight:"1.5em" }}>{n}</div>)}
            {/* espaço extra igual ao overscroll do textarea para o fim do arquivo alinhar */}
            <div style={{ height:120 }} />
          </div>
        </div>
        <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
          <div ref={highlightRef} style={{ ...shared, position:"absolute", top:0, left:0, right:0, bottom:0, color:"#d4d4d4", pointerEvents:"none", overflow:"hidden", paddingLeft:14 }}>
            {highlight(value, errorLines)}
          </div>
          <textarea ref={textareaRef} value={value} onChange={e => onChange(e.target.value)} onKeyDown={handleKeyDown} onScroll={syncScroll} spellCheck={false} autoCorrect="off" autoCapitalize="off"
            style={{ ...shared, position:"absolute", top:0, left:0, right:0, bottom:0, background:"transparent", color:"transparent", caretColor:"#aeafad", border:"none", outline:"none", resize:"none", zIndex:1, paddingLeft:14, overflow:"auto" }} />
        </div>
      </div>
      {/* barra de status azul, igual à do VS Code de verdade */}
      <div style={{ background:"#007acc", padding:"3px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, color:"#ffffff", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <span>⚡ C#</span>
        <span style={{ opacity:.9 }}>{value.split("\n").length} linhas · UTF-8 · Aula de C#</span>
      </div>
    </div>
  );
}

// bloco de código colorido (para os exemplos do resumo)
function CodeBlock({ code }) {
  return (
    <div style={{ background:"#1e1e1e", border:"1px solid #3e3e42", borderRadius:8, overflow:"hidden", margin:"10px 0 2px" }}>
      <div style={{ background:"#2d2d30", padding:"4px 12px", fontSize:11, color:"#9aa0a6", borderBottom:"1px solid #3e3e42", display:"flex", alignItems:"center", gap:6 }}>
        <span style={{width:9,height:9,borderRadius:"50%",background:"#ff5f56",display:"inline-block"}}/>
        <span style={{width:9,height:9,borderRadius:"50%",background:"#ffbd2e",display:"inline-block"}}/>
        <span style={{width:9,height:9,borderRadius:"50%",background:"#27c93f",display:"inline-block"}}/>
        <span style={{ marginLeft:6 }}>exemplo</span>
      </div>
      <div style={{ padding:"10px 14px", fontFamily:"'Courier New','Consolas',monospace", fontSize:13.5, lineHeight:"1.6em", overflowX:"auto", whiteSpace:"pre" }}>{highlight(String(code||""))}</div>
    </div>
  );
}

// ── modo guiado (acessibilidade): blocos prontos de código C# que o aluno monta clicando, sem precisar digitar ──
const GUIDED_BLOCKS = [
  { id:"greet",  emoji:"👋", label:"Dizer um Oi",            needsInput:false, template:()=>`Console.WriteLine("Oi! Eu adoro programar!");`, speak:()=>"Isso mostra uma saudação na tela do computador." },
  { id:"print",  emoji:"💬", label:"Mostrar uma mensagem",   needsInput:true,  inputLabel:"O que você quer mostrar na tela?", placeholder:"Ex: Eu sou incrível!", template:(v)=>`Console.WriteLine("${String(v||"").replace(/"/g,"")}");`, speak:(v)=>`Isso vai mostrar a mensagem: ${v}` },
  { id:"ask",    emoji:"❓", label:"Fazer uma pergunta",      needsInput:true,  inputLabel:"O que você quer perguntar?", placeholder:"Ex: Qual é o seu nome?", template:(v)=>`Console.WriteLine("${String(v||"").replace(/"/g,"")}");\nstring resposta = Console.ReadLine();`, speak:(v)=>`Isso vai perguntar: ${v}, e guardar a resposta de quem está usando o programa.` },
  { id:"number", emoji:"🔢", label:"Guardar um número",      needsInput:true,  inputLabel:"Qual número você quer guardar?", placeholder:"Ex: 10", template:(v)=>`int numero = ${parseInt(v)||0};`, speak:(v)=>`Isso guarda o número ${v} numa caixinha chamada numero.` },
  { id:"text",   emoji:"📝", label:"Guardar um texto",        needsInput:true,  inputLabel:"Qual texto você quer guardar?", placeholder:"Ex: Maria", template:(v)=>`string texto = "${String(v||"").replace(/"/g,"")}";`, speak:(v)=>`Isso guarda o texto ${v} numa caixinha chamada texto.` },
  { id:"sum",    emoji:"➕", label:"Somar dois números",      needsInput:false, template:()=>`int soma = 5 + 3;\nConsole.WriteLine(soma);`, speak:()=>"Isso soma o número 5 com o número 3 e mostra o resultado na tela." },
  { id:"loop",   emoji:"🔁", label:"Repetir uma mensagem",    needsInput:true,  inputLabel:"Quantas vezes repetir?", placeholder:"Ex: 3", template:(v)=>`for (int i = 0; i < ${parseInt(v)||3}; i++)\n{\n    Console.WriteLine("Repetindo!");\n}`, speak:(v)=>`Isso repete a mensagem ${v} vezes seguidas.` },
  { id:"if",     emoji:"❔", label:"Fazer uma escolha",       needsInput:false, template:()=>`int numero = 10;\nif (numero > 5)\n{\n    Console.WriteLine("O número é grande!");\n}\nelse\n{\n    Console.WriteLine("O número é pequeno!");\n}`, speak:()=>"Isso faz o programa escolher o que mostrar, dependendo do número." },
];

// ════════════════════════════════════════════════════════════════════════════
//  TECLAS + ROBÔ
// ════════════════════════════════════════════════════════════════════════════
const KEY_IMAGES = {
  "{": { label:"Shift + [", desc:"Segure SHIFT e aperte [" },
  "}": { label:"Shift + ]", desc:"Segure SHIFT e aperte ]" },
  "(": { label:"Shift + 9", desc:"Segure SHIFT e aperte 9" },
  ")": { label:"Shift + 0", desc:"Segure SHIFT e aperte 0" },
  ";": { label:";", desc:"Aperte ; (ponto e vírgula)" },
  ":": { label:"Shift + ;", desc:"Segure SHIFT e aperte ;" },
  '"': { label:'"', desc:"Segure SHIFT e aperte '" },
  "=": { label:"=", desc:"Aperte = (igual)" },
  ".": { label:".", desc:"Aperte . (ponto)" },
  ",": { label:",", desc:"Aperte , (vírgula)" },
  "[": { label:"[", desc:"Aperte [ (colchete)" },
  "]": { label:"]", desc:"Aperte ] (colchete)" },
};
function KeyVisual({ char }) {
  const info = KEY_IMAGES[char] || { label: char, desc: `Aperte ${char}` };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, margin:"6px 0" }}>
      <div style={{ background:"linear-gradient(180deg,#f5f5f5,#d0d0d0)", border:"2px solid #888", borderRadius:6, boxShadow:"0 3px 0 #555", padding:"4px 10px", fontFamily:"monospace", fontWeight:700, fontSize:15, color:"#222", minWidth:40, textAlign:"center", userSelect:"none" }}>{info.label}</div>
      <span style={{ color:"#96a0cc", fontSize:13 }}>{info.desc}</span>
    </div>
  );
}
// ── loja de acessórios do Nyx (desbloqueados com pontos de acerto) ──
const NYX_ITEMS = [
  { id:"fone",   label:"Fone de ouvido", emoji:"🎧", slot:"head", cost:5 },
  { id:"laco",   label:"Laço",           emoji:"🎀", slot:"neck", cost:8 },
  { id:"oculos", label:"Óculos escuros", emoji:"🕶️", slot:"face", cost:10 },
  { id:"chapeu", label:"Cartola",        emoji:"🎩", slot:"head", cost:15 },
  { id:"escudo", label:"Escudo",         emoji:"🛡️", slot:"hand", cost:20 },
  { id:"espada", label:"Espada",         emoji:"⚔️", slot:"hand", cost:30 },
  { id:"coroa",  label:"Coroa",          emoji:"👑", slot:"head", cost:40 },
  { id:"arco",   label:"Arco e flecha",  emoji:"🏹", slot:"hand", cost:50 },
];
const DEFAULT_NYX_GEAR = { head:null, face:null, neck:null, hand:null };

// ── NYX: o robô assistente da turma (SVG + animações CSS) ──
let __nyxSeq = 0;
// 10 animações criativas tocadas aleatoriamente quando o Nyx fica muito tempo parado ("idle") sem nada acontecer
const NYX_IDLE_QUIRKS = [
  { name:"nyx-idle-spin",      dur:1.4 },
  { name:"nyx-idle-peek",      dur:1.6 },
  { name:"nyx-idle-wiggle",    dur:1.2 },
  { name:"nyx-idle-stretch",   dur:1.8 },
  { name:"nyx-idle-sway",      dur:2.2 },
  { name:"nyx-idle-hop",       dur:1.3 },
  { name:"nyx-idle-tilt",      dur:2.4 },
  { name:"nyx-idle-heartbeat", dur:1.6 },
  { name:"nyx-idle-spiral",    dur:1.8 },
  { name:"nyx-idle-nod",       dur:1.5 },
];
// idle exclusivo do Nyx na aba do professor: ele também merece uma pausa entre uma correção e outra
const NYX_TEACHER_IDLE_QUIRKS = [
  { name:"nyx-idle-coffee", dur:2.6, emoji:"☕" },
  { name:"nyx-idle-manga",  dur:2.8, emoji:"📖" },
];
// 10 reações sorteadas quando o Nyx encontra um erro no código
const NYX_ERROR_REACTIONS = [
  { name:"nyx-err-shake",    dur:.6 },
  { name:"nyx-err-wobble",   dur:.7 },
  { name:"nyx-err-droop",    dur:.9 },
  { name:"nyx-err-spinout",  dur:.8 },
  { name:"nyx-err-flinch",   dur:.6 },
  { name:"nyx-err-coverup",  dur:.9 },
  { name:"nyx-err-buzz",     dur:.7 },
  { name:"nyx-err-stumble",  dur:.8 },
  { name:"nyx-err-gasp",     dur:.7 },
  { name:"nyx-err-facepalm", dur:.9 },
];
// 10 reações sorteadas quando o aluno acerta tudo (código ou análise ok)
const NYX_OK_REACTIONS = [
  { name:"nyx-ok-bounce",      dur:1.1 },
  { name:"nyx-ok-cheer",       dur:1.0 },
  { name:"nyx-ok-spin",        dur:1.0 },
  { name:"nyx-ok-wiggledance", dur:1.0 },
  { name:"nyx-ok-doublebounce",dur:1.1 },
  { name:"nyx-ok-twirl",       dur:1.1 },
  { name:"nyx-ok-fistpump",    dur:.9 },
  { name:"nyx-ok-sparkle",     dur:.9 },
  { name:"nyx-ok-victorylap",  dur:1.2 },
  { name:"nyx-ok-salute",      dur:1.0 },
];
// 7 animações sorteadas enquanto o Nyx está analisando ou gerando conteúdo (fica em loop até terminar)
const NYX_THINKING_ANIMS = [
  { name:"nyx-think-float", dur:1.5 },
  { name:"nyx-think-tilt",  dur:1.8 },
  { name:"nyx-think-bob",   dur:1.3 },
  { name:"nyx-think-scan",  dur:1.6 },
  { name:"nyx-think-pulse", dur:1.2 },
  { name:"nyx-think-sway",  dur:1.7 },
  { name:"nyx-think-orbit", dur:1.6 },
];
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
function NyxRobot({ state = "idle", size = 100, showName = true, gear, context = "student" }) {
  const G = { ...DEFAULT_NYX_GEAR, ...(gear||{}) };
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = ++__nyxSeq;
  const uid = "nyx" + idRef.current;
  const MAP = {
    idle:     { main:"#7c83ff", dark:"#575ee0", eye:"#a5f0ff", label:"Pronto para ajudar",  anim:"nyx-float 3.4s ease-in-out infinite" },
    thinking: { main:"#fbbf24", dark:"#d99b0d", eye:"#fff3c4", label:"Analisando...",        anim:"nyx-float 1.5s ease-in-out infinite" },
    ok:       { main:"#34d399", dark:"#0da879", eye:"#d1fae5", label:"Tudo certo!",          anim:"nyx-bounce 1.1s ease" },
    error:    { main:"#f87171", dark:"#dc4848", eye:"#ffe1e1", label:"Encontrei algo!",      anim:"nyx-shake .55s ease" },
  };
  const P = MAP[state] || MAP.idle;
  const antennaSpeed = state === "thinking" ? ".5s" : "1.8s";

  // enquanto parado no estado idle, de vez em quando solta uma animação criativa (bocejo, pulinho, giro...)
  // pra parecer vivo — depois volta pro float calmo de sempre e agenda a próxima aleatoriamente
  const [quirk, setQuirk] = useState(null);
  useEffect(() => {
    if (state !== "idle") { setQuirk(null); return; }
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setQuirk(pickRandom(context === "teacher" ? NYX_TEACHER_IDLE_QUIRKS : NYX_IDLE_QUIRKS));
    }, 7000 + Math.random() * 9000);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [state, quirk]);
  const handleQuirkEnd = (e) => { if (quirk && e.animationName === quirk.name) setQuirk(null); };

  // sempre que o estado muda pra "pensando", "certo" ou "erro", sorteia uma reação nova daquele grupo
  const [reactAnim, setReactAnim] = useState(null);
  useEffect(() => {
    if (state === "error") setReactAnim(pickRandom(NYX_ERROR_REACTIONS));
    else if (state === "ok") setReactAnim(pickRandom(NYX_OK_REACTIONS));
    else if (state === "thinking") setReactAnim(pickRandom(NYX_THINKING_ANIMS));
    else setReactAnim(null);
  }, [state]);

  const wrapperAnim =
    (state === "idle" && quirk) ? `${quirk.name} ${quirk.dur}s ease-in-out` :
    reactAnim ? `${reactAnim.name} ${reactAnim.dur}s ease-in-out${state === "thinking" ? " infinite" : ""}` :
    P.anim;
  return (
    <div style={{ textAlign:"center", padding:4, position:"relative" }}>
      <div style={{ display:"inline-block", animation:wrapperAnim, willChange:"transform", position:"relative" }} onAnimationEnd={handleQuirkEnd}>
        <svg width={size} height={size*1.15} viewBox="0 0 120 138" style={{ display:"block", overflow:"visible" }}>
          <defs>
            <linearGradient id={uid+"h"} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={shade(P.main, 0.25)} />
              <stop offset="1" stopColor={P.main} />
            </linearGradient>
            <linearGradient id={uid+"b"} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={P.main} />
              <stop offset="1" stopColor={P.dark} />
            </linearGradient>
            <radialGradient id={uid+"g"}>
              <stop offset="0" stopColor={P.main} stopOpacity=".5" />
              <stop offset="1" stopColor={P.main} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* aura de luz atrás */}
          <circle cx="60" cy="62" r="55" fill={`url(#${uid}g)`} />

          {/* sombra no chão */}
          <ellipse cx="60" cy="128" rx="26" ry="5" fill="#000" opacity="0.35" />

          {/* orelhas */}
          <rect x="21" y="34" width="9" height="16" rx="4.5" fill={P.dark} />
          <rect x="90" y="34" width="9" height="16" rx="4.5" fill={P.dark} />

          {/* cabeça */}
          <rect x="28" y="20" width="64" height="44" rx="17" fill={`url(#${uid}h)`} />
          <rect x="28" y="20" width="64" height="20" rx="17" fill="#ffffff" opacity="0.12" />

          {/* acessório de cabeça (por cima da cabeça; a antena sempre aparece por cima dele) */}
          {G.head === "fone" && (
            <g>
              <path d="M23 38 Q60 6 97 38" stroke="#20242f" strokeWidth="6" fill="none" strokeLinecap="round" />
              <path d="M28 35 Q60 11 92 35" stroke="#3a4152" strokeWidth="2" fill="none" strokeLinecap="round" />
              <rect x="15" y="31" width="16" height="21" rx="7" fill="#20242f" />
              <rect x="18.5" y="34.5" width="9" height="14" rx="4.5" fill={P.main} />
              <ellipse cx="20" cy="37" rx="2.5" ry="3.5" fill="#ffffff" opacity="0.25" />
              <rect x="89" y="31" width="16" height="21" rx="7" fill="#20242f" />
              <rect x="92.5" y="34.5" width="9" height="14" rx="4.5" fill={P.main} />
              <ellipse cx="94" cy="37" rx="2.5" ry="3.5" fill="#ffffff" opacity="0.25" />
            </g>
          )}
          {G.head === "chapeu" && (
            <g>
              <ellipse cx="60" cy="20" rx="23" ry="4.5" fill="#1c1530" stroke="#8b83b0" strokeWidth="1" />
              <path d="M46 20 L47.5 4 Q60 1 72.5 4 L74 20 Z" fill="#2d2447" stroke="#8b83b0" strokeWidth="1" />
              <ellipse cx="60" cy="4.5" rx="12.5" ry="2.6" fill="#3a2f5c" />
              <rect x="46.8" y="13" width="26.4" height="5" fill={P.main} />
              <path d="M50 6 Q52 12 51.5 18" stroke="#ffffff" strokeWidth="1.6" opacity="0.18" fill="none" strokeLinecap="round" />
            </g>
          )}
          {G.head === "coroa" && (
            <g>
              <path d="M40 20 L40 7 L49 14 L60 3 L71 14 L80 7 L80 20 Z" fill="#fbbf24" stroke="#d99b0d" strokeWidth="1.3" />
              <path d="M44 10 L47 12" stroke="#fff7d6" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
              <rect x="40" y="17" width="40" height="5" rx="2.2" fill="#f59e0b" stroke="#d99b0d" strokeWidth="1" />
              <circle cx="60" cy="9" r="2.4" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
              <circle cx="48" cy="15" r="1.7" fill="#22d3ee" />
              <circle cx="72" cy="15" r="1.7" fill="#22d3ee" />
              <circle cx="60" cy="19.5" r="1.5" fill="#a855f7" />
            </g>
          )}

          {/* antena (sempre por cima) */}
          <line x1="60" y1="22" x2="60" y2="9" stroke={P.dark} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="60" cy="7" r="7" fill={P.main} opacity="0.25" />
          <circle cx="60" cy="7" r="4" fill={P.eye} style={{ animation:`nyx-antenna ${antennaSpeed} ease-in-out infinite` }} />

          {/* visor */}
          <rect x="36" y="29" width="48" height="27" rx="12" fill="#0b0e1d" />
          <rect x="38" y="31" width="44" height="10" rx="6" fill="#ffffff" opacity="0.06" />

          {/* olhos por estado */}
          {state === "idle" && (
            <g style={{ animation:"nyx-blink 4.2s infinite", transformOrigin:"60px 42px" }}>
              <rect x="46" y="36" width="8" height="12" rx="4" fill={P.eye} style={{ filter:`drop-shadow(0 0 3px ${P.eye})` }} />
              <rect x="66" y="36" width="8" height="12" rx="4" fill={P.eye} style={{ filter:`drop-shadow(0 0 3px ${P.eye})` }} />
            </g>
          )}
          {state === "thinking" && (
            <g fill={P.eye}>
              {[49, 60, 71].map((cx, i) => (
                <circle key={cx} cx={cx} cy="42.5" r="3.6" style={{ animation:`pulse-dot 1s ease-in-out ${i*0.18}s infinite` }} />
              ))}
            </g>
          )}
          {state === "ok" && (
            <g stroke={P.eye} strokeWidth="3.6" fill="none" strokeLinecap="round" style={{ filter:`drop-shadow(0 0 3px ${P.eye})` }}>
              <path d="M44 44 q6 -8 12 0" />
              <path d="M64 44 q6 -8 12 0" />
            </g>
          )}
          {state === "error" && (
            <g stroke={P.eye} strokeWidth="3.4" fill="none" strokeLinecap="round">
              <path d="M45 38 l9 8 M54 38 l-9 8" />
              <path d="M66 38 l9 8 M75 38 l-9 8" />
            </g>
          )}

          {/* óculos escuros (cobre os olhos, como acessório de rosto) */}
          {G.face === "oculos" && (
            <g>
              <path d="M29 38 L36 38 M84 38 L91 38" stroke="#1f2430" strokeWidth="2.6" strokeLinecap="round" />
              <rect x="36" y="34" width="21" height="14" rx="7" fill="#0d0f18" stroke="#2a3040" strokeWidth="1.5" />
              <rect x="63" y="34" width="21" height="14" rx="7" fill="#0d0f18" stroke="#2a3040" strokeWidth="1.5" />
              <path d="M57 39 Q60 36.5 63 39" stroke="#2a3040" strokeWidth="2.6" fill="none" />
              <path d="M40 39 q4 -3.5 9 0" stroke="#8be9fd" strokeWidth="1.6" opacity="0.55" fill="none" strokeLinecap="round" />
              <path d="M67 39 q4 -3.5 9 0" stroke="#8be9fd" strokeWidth="1.6" opacity="0.55" fill="none" strokeLinecap="round" />
            </g>
          )}

          {/* pescoço */}
          <rect x="53" y="62" width="14" height="8" rx="3" fill={P.dark} />

          {/* laço no pescoço */}
          {G.neck === "laco" && (
            <g>
              <path d="M60 66 Q51 59 47 62 Q44.5 65 47 69 Q51 73 60 66 Z" fill="#ec4899" stroke="#db2777" strokeWidth="1" />
              <path d="M60 66 Q69 59 73 62 Q75.5 65 73 69 Q69 73 60 66 Z" fill="#ec4899" stroke="#db2777" strokeWidth="1" />
              <path d="M52 63 Q55 64.5 57 66" stroke="#f9a8d4" strokeWidth="1.3" fill="none" strokeLinecap="round" />
              <path d="M68 63 Q65 64.5 63 66" stroke="#f9a8d4" strokeWidth="1.3" fill="none" strokeLinecap="round" />
              <circle cx="60" cy="66" r="3.2" fill="#db2777" stroke="#be185d" strokeWidth="0.8" />
            </g>
          )}

          {/* braços */}
          <rect x="26" y="74" width="10" height="24" rx="5" fill={P.dark} transform={state==="ok" ? "rotate(-38 31 76)" : "rotate(8 31 76)"} style={{ transition:"transform .3s" }} />
          <rect x="84" y="74" width="10" height="24" rx="5" fill={P.dark} transform={state==="ok" ? "rotate(38 89 76)" : "rotate(-8 89 76)"} style={{ transition:"transform .3s" }} />

          {/* item na mão */}
          {G.hand === "escudo" && (
            <g>
              <path d="M12 82 Q12 78 22 76 Q32 78 32 82 L32 92 Q32 101 22 106 Q12 101 12 92 Z" fill="#94a3b8" stroke="#475569" strokeWidth="1.6" />
              <path d="M14.5 83 Q14.5 80 22 78.5 Q29.5 80 29.5 83 L29.5 91.5 Q29.5 98.5 22 102.5 Q14.5 98.5 14.5 91.5 Z" fill="#cbd5e1" stroke="none" opacity="0.5" />
              <path d="M22 84 L24.5 89 L22 97 L19.5 89 Z" fill={P.main} stroke={P.dark} strokeWidth="0.8" />
              <circle cx="22" cy="80.5" r="1.2" fill="#475569" />
              <circle cx="15.5" cy="90" r="1.2" fill="#475569" />
              <circle cx="28.5" cy="90" r="1.2" fill="#475569" />
            </g>
          )}
          {G.hand === "espada" && (
            <g transform="rotate(-25 24 90)">
              <path d="M23.5 62 L26.5 67 L26 94 L21 94 L20.5 67 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
              <line x1="23.5" y1="66" x2="23.5" y2="92" stroke="#94a3b8" strokeWidth="1" />
              <path d="M13 94 Q23.5 90.5 34 94 L34 97 Q23.5 93.5 13 97 Z" fill="#eab308" stroke="#a16207" strokeWidth="0.8" />
              <rect x="21" y="97" width="5" height="10" rx="2" fill="#78350f" />
              <line x1="21.5" y1="100" x2="25.5" y2="100" stroke="#5b2c0c" strokeWidth="1" />
              <line x1="21.5" y1="103" x2="25.5" y2="103" stroke="#5b2c0c" strokeWidth="1" />
              <circle cx="23.5" cy="109.5" r="3" fill="#eab308" stroke="#a16207" strokeWidth="0.8" />
            </g>
          )}
          {G.hand === "arco" && (
            <g transform="rotate(10 20 90)">
              <path d="M16 68 Q34 90 16 112" stroke="#92400e" strokeWidth="3.6" fill="none" strokeLinecap="round" />
              <path d="M17.5 72 Q30 90 17.5 108" stroke="#c2703d" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <line x1="16" y1="68" x2="16" y2="112" stroke="#e5e7eb" strokeWidth="1.2" />
              <line x1="10" y1="90" x2="34" y2="90" stroke="#a16207" strokeWidth="2" />
              <path d="M34 90 L28 86.5 L28 93.5 Z" fill="#64748b" />
              <path d="M10 87 L14 90 L10 93" stroke="#ef4444" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </g>
          )}

          {/* corpo */}
          <rect x="38" y="68" width="44" height="38" rx="14" fill={`url(#${uid}b)`} />
          <rect x="38" y="68" width="44" height="16" rx="14" fill="#ffffff" opacity="0.10" />

          {/* núcleo de energia no peito */}
          <circle cx="60" cy="86" r="9.5" fill="#0b0e1d" />
          <circle cx="60" cy="86" r="6" fill={P.eye} style={{ animation:`nyx-antenna ${antennaSpeed} ease-in-out infinite`, filter:`drop-shadow(0 0 4px ${P.eye})` }} />

          {/* pés */}
          <rect x="43" y="106" width="14" height="10" rx="5" fill={P.dark} />
          <rect x="63" y="106" width="14" height="10" rx="5" fill={P.dark} />
        </svg>
        {quirk?.emoji && (
          <span style={{ position:"absolute", right:size*0.02, bottom:size*0.22, fontSize:size*0.34, filter:"drop-shadow(0 2px 3px rgba(0,0,0,.35))", pointerEvents:"none" }}>{quirk.emoji}</span>
        )}
      </div>
      {showName && (
        <>
          <div style={{ fontWeight:900, fontSize:15, letterSpacing:3, color:P.main, marginTop:2 }}>NYX</div>
          <div style={{ fontSize:11.5, color:"#96a0cc", marginTop:1 }}>{P.label}</div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  AVATAR (boneco personalizável)
// ════════════════════════════════════════════════════════════════════════════
// ── util de cor: clareia/escurece um hex para dar profundidade ao avatar ──
function hexToRgb(hex){ const h=String(hex||"").replace("#",""); const f=h.length===3?h.split("").map(c=>c+c).join(""):h; const n=parseInt(f||"000000",16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function shade(hex,pct){ const [r,g,b]=hexToRgb(hex); const t=pct<0?0:255,p=Math.min(1,Math.abs(pct)); const m=v=>Math.round((t-v)*p)+v; return `rgb(${m(r)},${m(g)},${m(b)})`; }
function isLight(hex){ const [r,g,b]=hexToRgb(hex); return (0.299*r+0.587*g+0.114*b)>165; }

const AVATAR_OPTS = {
  bg:   ["#7c83ff","#34d399","#fbbf24","#f87171","#06b6d4","#ec4899","#8b5cf6","#3b82f6","#14b8a6","#0ea5e9","#f43f5e","#64748b"],
  skin: ["#ffe0bd","#ffd6c0","#f1c27d","#e0ac69","#c68642","#a86b3c","#8d5524","#5c3a21"],
  hair: ["#2b2b2b","#3b2417","#6b3e26","#a0522d","#c2410c","#d9a441","#f0d58c","#cbd5e1","#ec4899","#a855f7","#3b82f6","#06b6d4","#34d399","#f87171"],
  hairV: [
    ["variant11","Repicado"],["variant04","Arrepiado"],["variant01","Curto"],["variant05","Cachinhos"],
    ["variant12","Franja"],["variant42","Ondulado"],["variant16","Longo"],["variant17","Longo repicado"],
    ["variant19","Chanel"],["variant23","Franjinha"],["variant24","Cacheado"],["variant39","Crespo"],
    ["variant26","Coquinhos"],["variant36","Coque"],["variant45","Coque solto"],["variant40","Lateral"],
    ["variant27","Moicano"],["variant47","Raspado"],
  ],
  eyesV: [["variant09","Brilhantes"],["variant04","Grandes"],["variant06","Curiosos"],["variant13","Felizes"],["variant15","Piscada"],["variant24","Sonhadores"]],
  mouthV: [["happy05","Feliz"],["happy01","Sorriso"],["happy02","Sorrisinho"],["happy03","Contente"],["happy07","Sorrisão"],["happy09","Dentinho"]],
  glassesV: [["","Nenhum"],["variant01","Óculos 1"],["variant02","Óculos 2"],["variant03","Óculos 3"],["variant04","Óculos 4"],["variant05","Óculos 5"]],
  earringsV: [["","Nenhum"],["variant01","Brinco 1"],["variant02","Brinco 2"],["variant03","Brinco 3"]],
  pet: [
    { e:"", label:"Nenhum" },
    { e:"🐉", label:"Dragão" },
    { e:"🦄", label:"Unicórnio" },
    { e:"🐲", label:"Dragãozinho" },
    { e:"🦅", label:"Águia" },
    { e:"🦉", label:"Coruja" },
    { e:"🐺", label:"Lobo" },
    { e:"🦊", label:"Raposa" },
    { e:"🐱", label:"Gato" },
    { e:"🐶", label:"Cachorro" },
    { e:"🐰", label:"Coelho" },
    { e:"🦁", label:"Leão" },
    { e:"🐢", label:"Tartaruga" },
  ],
};
const DEFAULT_AVATAR = { bg:"#7c83ff", skin:"#ffd6c0", hair:"#2b2b2b", hairV:"variant11", eyesV:"variant09", mouthV:"happy05", glassesV:"", earringsV:"", flores:false, freckles:false, pet:"", roupa:"" };

// ── roupas e acessórios do avatar (escolhidos na criação do perfil) ──
const ROUPA_ITEMS = [
  { id:"",         label:"Nenhuma" },
  { id:"camiseta", label:"Camiseta",         cor:"#3b82f6" },
  { id:"moletom",  label:"Moletom c/ capuz", cor:"#22c55e" },
  { id:"jaqueta",  label:"Jaqueta",          cor:"#ef4444" },
  { id:"camisa",   label:"Camisa",           cor:"#a855f7" },
  { id:"regata",   label:"Regata",           cor:"#facc15" },
  { id:"casaco",   label:"Casaco",           cor:"#ec4899" },
];

// compatibilidade: converte perfis salvos no formato antigo para o novo estilo
const OLD_HAIR_MAP = { curto:"variant04", longo:"variant16", espetado:"variant27", cacheado:"variant24", afro:"variant39", moicano:"variant27", coque:"variant36", rabo:"variant45", chanel:"variant23", topete:"variant01", careca:"variant47" };
function normalizeAvatar(cfg) {
  const c = { ...DEFAULT_AVATAR, ...(cfg||{}) };
  if (cfg && cfg.hairStyle && !cfg.hairV) {
    c.hairV = OLD_HAIR_MAP[cfg.hairStyle] || DEFAULT_AVATAR.hairV;
    if (cfg.eyewear === "oculos") c.glassesV = "variant01";
    if (cfg.eyewear === "oculos_sol") c.glassesV = "variant04";
    if (cfg.extra === "brinco") c.earringsV = "variant01";
    if (cfg.headwear === "flores" || cfg.extra === "flor") c.flores = true;
  }
  return c;
}

const hx = (h) => String(h||"").replace("#","");

// gera o rosto no estilo anime (Lorelei, por Lisa Wischofsky — CC BY 4.0, via DiceBear)
function loreleiSvg(c) {
  return createAvatar(lorelei, {
    seed: "aluno",
    hair: [c.hairV], hairColor: [hx(c.hair)],
    skinColor: [hx(c.skin)],
    eyes: [c.eyesV],
    mouth: [c.mouthV],
    eyebrows: ["variant03"], nose: ["variant01"], head: ["variant01"],
    beardProbability: 0,
    freckles: ["variant01"], frecklesProbability: c.freckles ? 100 : 0,
    glasses: c.glassesV ? [c.glassesV] : ["variant01"], glassesProbability: c.glassesV ? 100 : 0,
    earrings: c.earringsV ? [c.earringsV] : ["variant01"], earringsProbability: c.earringsV ? 100 : 0,
    hairAccessories: ["flowers"], hairAccessoriesProbability: c.flores ? 100 : 0,
  }).toString();
}

// desenhos das roupas sobre o avatar (viewBox 0 0 100 100; tronco na base do círculo)
// estilo combinando com o traço do personagem: contorno escuro grosso + sombra + brilho
const ROUPA_OUT = "#16162a"; // cor do contorno, igual ao traço do boneco
function RoupaSvg({ tipo, cor }) {
  const dark = shade(cor, -0.32), light = shade(cor, 0.35);
  const torso = "M 15 100 Q 14 76 33 69.5 Q 41.5 66.5 50 66.5 Q 58.5 66.5 67 69.5 Q 86 76 85 100 Z";
  const base = <path d={torso} fill={cor} stroke={ROUPA_OUT} strokeWidth="2.6" strokeLinejoin="round" />;
  const sombra = <path d="M 67 69.5 Q 86 76 85 100 L 71 100 Q 73 83 66 70 Z" fill="#000" opacity="0.14" />;
  const brilho = <path d="M 22 81 Q 26 72.5 35 69.5" fill="none" stroke="#fff" strokeWidth="2.4" opacity="0.4" strokeLinecap="round" />;
  if (tipo === "camiseta") return (
    <g>{base}{sombra}{brilho}
      <path d="M 40 67.5 Q 50 76.5 60 67.5" fill="none" stroke={ROUPA_OUT} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M 42 67 Q 50 74 58 67" fill="none" stroke={dark} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 27 91 q 3 2.5 6 0 M 67 91 q 3 2.5 6 0" stroke={dark} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  );
  if (tipo === "moletom") return (
    <g>
      <path d="M 20 100 Q 18 70 50 63 Q 82 70 80 100 Z" fill={dark} stroke={ROUPA_OUT} strokeWidth="2.6" strokeLinejoin="round" />
      {base}{sombra}{brilho}
      <path d="M 45.5 70.5 Q 44 78 42.5 85.5" fill="none" stroke={light} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M 54.5 70.5 Q 56 78 57.5 85.5" fill="none" stroke={light} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M 37 90 L 63 90 L 59 100 L 41 100 Z" fill={dark} stroke={ROUPA_OUT} strokeWidth="1.8" strokeLinejoin="round" />
    </g>
  );
  if (tipo === "jaqueta") return (
    <g>{base}{sombra}{brilho}
      <line x1="50" y1="67" x2="50" y2="100" stroke={ROUPA_OUT} strokeWidth="3" />
      <line x1="50" y1="69" x2="50" y2="100" stroke={light} strokeWidth="1.2" strokeDasharray="1.6 1.6" />
      <path d="M 41 67.5 L 50 79 L 49.5 66.5 Z" fill={dark} stroke={ROUPA_OUT} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M 59 67.5 L 50 79 L 50.5 66.5 Z" fill={dark} stroke={ROUPA_OUT} strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="48.6" y="81" width="2.8" height="5" rx="1.2" fill={light} stroke={ROUPA_OUT} strokeWidth="0.9" />
      <path d="M 26 88 l 9 2 M 74 88 l -9 2" stroke={ROUPA_OUT} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
  if (tipo === "camisa") return (
    <g>{base}{sombra}
      <path d="M 47.6 76 Q 47.2 88 47.2 100 M 52.4 76 Q 52.8 88 52.8 100" fill="none" stroke={dark} strokeWidth="1.4" />
      <path d="M 41 66.8 L 50 77 L 44.6 64.6 Z" fill="#f6f7fb" stroke={ROUPA_OUT} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M 59 66.8 L 50 77 L 55.4 64.6 Z" fill="#f6f7fb" stroke={ROUPA_OUT} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="50" cy="82" r="1.7" fill="#f6f7fb" stroke={ROUPA_OUT} strokeWidth="0.9" />
      <circle cx="50" cy="89" r="1.7" fill="#f6f7fb" stroke={ROUPA_OUT} strokeWidth="0.9" />
      <circle cx="50" cy="96" r="1.7" fill="#f6f7fb" stroke={ROUPA_OUT} strokeWidth="0.9" />
      {brilho}
    </g>
  );
  if (tipo === "regata") return (
    <g>
      <path d="M 26 100 Q 24 84 32 72.5 L 38.5 68 Q 50 79 61.5 68 L 68 72.5 Q 76 84 74 100 Z" fill={cor} stroke={ROUPA_OUT} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M 40 69.5 Q 50 77.5 60 69.5" fill="none" stroke={dark} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 33 74 Q 27 84 28 100 M 67 74 Q 73 84 72 100" fill="none" stroke={dark} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M 68 72.5 Q 76 84 74 100 L 66 100 Q 68 84 64 72 Z" fill="#000" opacity="0.14" />
      <path d="M 30 80 Q 32 74.5 36 71" fill="none" stroke="#fff" strokeWidth="2.2" opacity="0.4" strokeLinecap="round" />
    </g>
  );
  if (tipo === "casaco") return (
    <g>{base}{sombra}
      <path d="M 43 67.5 Q 46.5 80 47 100 L 40 100 Q 37.5 81 43 67.5 Z" fill={dark} stroke={ROUPA_OUT} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M 57 67.5 Q 53.5 80 53 100 L 60 100 Q 62.5 81 57 67.5 Z" fill={dark} stroke={ROUPA_OUT} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="44" cy="84" r="1.7" fill={light} stroke={ROUPA_OUT} strokeWidth="0.9" />
      <circle cx="44" cy="92" r="1.7" fill={light} stroke={ROUPA_OUT} strokeWidth="0.9" />
      <circle cx="56" cy="84" r="1.7" fill={light} stroke={ROUPA_OUT} strokeWidth="0.9" />
      <circle cx="56" cy="92" r="1.7" fill={light} stroke={ROUPA_OUT} strokeWidth="0.9" />
      {brilho}
    </g>
  );
  return base;
}

function Avatar({ cfg, size=72 }) {
  const c = normalizeAvatar(cfg);
  const key = JSON.stringify(c);
  const uri = useMemo(() => "data:image/svg+xml;utf8," + encodeURIComponent(loreleiSvg(c)), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const roupa = ROUPA_ITEMS.find(r => r.id && r.id === c.roupa);
  return (
    <div className="avatar-pop" style={{ position:"relative", width:size, height:size, display:"inline-block", lineHeight:0, flexShrink:0 }}>
      <div style={{ width:size, height:size, borderRadius:"50%", overflow:"hidden", position:"relative", background:`radial-gradient(circle at 50% 30%, ${shade(c.bg,0.25)}, ${c.bg} 58%, ${shade(c.bg,-0.25)})`, boxShadow:"0 2px 5px rgba(0,0,0,.4), inset 0 0 0 2px rgba(255,255,255,.14)" }}>
        {/* a roupa fica ATRÁS do personagem: a cabeça/queixo cobrem a gola naturalmente */}
        {roupa && (
          <svg width={size} height={size} viewBox="0 0 100 100" style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none" }}>
            <RoupaSvg tipo={roupa.id} cor={roupa.cor} />
          </svg>
        )}
        <img src={uri} width={size} height={size} alt="" draggable={false} style={{ display:"block", position:"relative", zIndex:1 }} />
      </div>
      {c.pet && (
        <span style={{ position:"absolute", right:Math.round(size*-0.14), bottom:Math.round(size*-0.08), fontSize:Math.max(10, Math.round(size*0.34)), lineHeight:1, filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.6))", pointerEvents:"none" }}>{c.pet}</span>
      )}
    </div>
  );
}

// prévia grande do boneco + botão de sortear — fica separada dos controles pra poder ser
// posicionada em outra coluna (ex: metade esquerda da tela na criação de perfil)
function AvatarPreview({ value, onChange }) {
  const v = normalizeAvatar(value);
  const randomize = () => {
    const pick = a => a[Math.floor(Math.random()*a.length)];
    onChange({
      ...v,
      bg:pick(AVATAR_OPTS.bg), skin:pick(AVATAR_OPTS.skin), hair:pick(AVATAR_OPTS.hair),
      hairV:pick(AVATAR_OPTS.hairV)[0], eyesV:pick(AVATAR_OPTS.eyesV)[0], mouthV:pick(AVATAR_OPTS.mouthV)[0],
      glassesV: Math.random()<0.7 ? "" : pick(AVATAR_OPTS.glassesV.slice(1))[0],
      earringsV: Math.random()<0.7 ? "" : pick(AVATAR_OPTS.earringsV.slice(1))[0],
      flores: Math.random()<0.85,
      freckles: Math.random()>=0.75,
      roupa: Math.random()<0.35 ? "" : pick(ROUPA_ITEMS.slice(1)).id,
    });
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{ background:"radial-gradient(circle at 50% 28%, #1d2344, #0d1122)", borderRadius:18, padding:12, border:"1px solid #2c3358", animation:"glow-ring 3s ease-in-out infinite" }}>
        <Avatar cfg={v} size={104} />
      </div>
      <button type="button" onClick={randomize} style={{ background:"#2a3154", color:"#e8ebfa", border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>🎲 Surpresa</button>
    </div>
  );
}

// os controles de personalização (sem a prévia) — separados pra poder ficar numa coluna própria
// part="basic" → só cor de fundo/pele (pra caber do lado da prévia); part="rest" → o resto; part="all" (padrão) → tudo junto
function AvatarControls({ value, onChange, part = "all" }) {
  const v = normalizeAvatar(value);
  const set = (k, val) => onChange({ ...v, [k]: val });
  const Swatches = ({ k }) => (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {AVATAR_OPTS[k].map(col => (
        <button key={col} type="button" onClick={()=>set(k,col)}
          style={{ width:26, height:26, borderRadius:"50%", background:col, border:v[k]===col?"3px solid #fff":"2px solid #5d679c", boxShadow:v[k]===col?"0 0 0 2px #7c83ff":"none", cursor:"pointer", padding:0 }} />
      ))}
    </div>
  );
  const Thumbs = ({ k, field }) => (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {AVATAR_OPTS[k].map(([opt,label]) => (
        <button key={opt||"nenhum"} type="button" onClick={()=>set(field,opt)} title={label}
          style={{ background:v[field]===opt?"#7c83ff33":"#0d1122", border:`2px solid ${v[field]===opt?"#7c83ff":"#2a3154"}`, borderRadius:12, padding:3, cursor:"pointer", lineHeight:0 }}>
          <Avatar cfg={{ ...v, pet:"", [field]:opt }} size={46} />
        </button>
      ))}
    </div>
  );
  const Toggle = ({ field, label }) => (
    <button type="button" onClick={()=>set(field, !v[field])}
      style={{ padding:"5px 12px", borderRadius:10, background:v[field]?"#7c83ff":"#0d1122", color:"#e8ebfa", border:`1px solid ${v[field]?"#7c83ff":"#2a3154"}`, cursor:"pointer", fontSize:12, fontWeight:700 }}>
      {v[field] ? "✓ " : ""}{label}
    </button>
  );
  const Row = ({ label, children }) => (
    <div style={{ marginBottom:10, breakInside:"avoid" }}>
      <p style={{ color:"#96a0cc", fontSize:12, marginBottom:4 }}>{label}</p>
      {children}
    </div>
  );
  const Pets = () => (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {AVATAR_OPTS.pet.map(o=>(
        <button key={o.label} type="button" onClick={()=>set("pet", o.e)} title={o.label}
          style={{ padding:"4px 9px", borderRadius:8, background:v.pet===o.e?"#7c83ff":"#0d1122", color:"#e8ebfa", border:`1px solid ${v.pet===o.e?"#7c83ff":"#2a3154"}`, cursor:"pointer", fontSize:14 }}>
          {o.e ? o.e+" " : ""}{o.label}
        </button>
      ))}
    </div>
  );
  const ItemThumbs = ({ items, field }) => (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {items.map(it => (
        <button key={it.id||"nenhum"} type="button" onClick={()=>set(field, it.id)} title={it.label}
          style={{ background:v[field]===it.id?"#7c83ff33":"#0d1122", border:`2px solid ${v[field]===it.id?"#7c83ff":"#2a3154"}`, borderRadius:12, padding:3, cursor:"pointer", lineHeight:0 }}>
          <Avatar cfg={{ ...v, pet:"", [field]:it.id }} size={46} />
        </button>
      ))}
    </div>
  );
  const showBasic = part === "all" || part === "basic";
  const showRest = part === "all" || part === "rest";
  return (
    <div style={{ minWidth:240 }}>
      {showBasic && (
        <>
          <Row label="Cor de fundo"><Swatches k="bg" /></Row>
          <Row label="Tom de pele"><Swatches k="skin" /></Row>
        </>
      )}
      {showRest && (
        <>
          <Row label="Cor do cabelo"><Swatches k="hair" /></Row>
          <Row label="Estilo do cabelo"><Thumbs k="hairV" field="hairV" /></Row>
          <Row label="Olhos"><Thumbs k="eyesV" field="eyesV" /></Row>
          <Row label="Boca"><Thumbs k="mouthV" field="mouthV" /></Row>
          <Row label="Óculos"><Thumbs k="glassesV" field="glassesV" /></Row>
          <Row label="Brincos"><Thumbs k="earringsV" field="earringsV" /></Row>
          <Row label="Detalhes"><div style={{ display:"flex", gap:6, flexWrap:"wrap" }}><Toggle field="freckles" label="Sardas" /><Toggle field="flores" label="Flores no cabelo" /></div></Row>
          <Row label="👕 Roupa"><ItemThumbs items={ROUPA_ITEMS} field="roupa" /></Row>
          <Row label="🐉 Pet / Animal mitológico"><Pets /></Row>
        </>
      )}
    </div>
  );
}

function AvatarBuilder({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
      <div style={{ flexShrink:0 }}><AvatarPreview value={value} onChange={onChange} /></div>
      <AvatarControls value={value} onChange={onChange} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TERMINAL  (estilo VS Code: digite dotnet run, dotnet build, cls, dir, ajuda)
// ════════════════════════════════════════════════════════════════════════════
const TERM_PROMPT = "C:\\Aula\\MeuProjeto>";

function Terminal({ files, dataTour, maxHeight = 260, onEasterEgg = null }) {
  const [hist, setHist] = useState([
    "Terminal da Aula C#",
    'Digite "ajuda" para ver os comandos disponíveis.',
    "",
  ]);
  const [mode, setMode] = useState("shell"); // shell = digitando comandos | program = programa pedindo entrada
  const [val, setVal] = useState("");
  const [running, setRunning] = useState(false);
  const inputsRef = useRef([]);
  const runStartRef = useRef(0);
  const cmdHistRef = useRef([]);
  const cmdIdxRef = useRef(-1);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [hist, running, mode]);

  const push = (...lines) => setHist(prev => [...prev, ...lines]);
  const projectSrc = () => (files||[]).filter(f => (f.code||"").trim()).map(f => `// ===== ${f.name} =====\n${f.code}`).join("\n\n");

  const simulate = async () => {
    setRunning(true);
    try {
      const ins = inputsRef.current;
      const res = await askClaude(
        `Projeto C# (todos os arquivos abaixo fazem parte do MESMO projeto e compilam juntos — classes de um arquivo podem ser usadas em outro):\n\n${projectSrc()}\n\n` +
        (ins.length ? `O usuário já digitou estas entradas no console, em ordem (uma para cada Console.ReadLine):\n${ins.map((v,i)=>`${i+1}) ${v}`).join("\n")}\n\n` : "") +
        `Execute "dotnet run" (a partir do método Main). Responda APENAS com o texto EXATO que o console mostraria desde o início da execução até agora, incluindo o eco das entradas digitadas nas posições em que foram digitadas. Sem explicações, sem markdown, sem crases.\n` +
        `Se houver erro de compilação, mostre os erros no formato real do compilador (ex: Program.cs(8,32): error CS1002: ; expected).\n` +
        `Depois da saída, escreva UMA última linha contendo exatamente:\n__AGUARDA__ se a execução parou em um Console.ReadLine esperando o usuário digitar\n__FIM__ se o programa terminou (ou se houve erro de compilação)`,
        RUN_SYSTEM,
        { temperature: 0 }
      );
      let t = res.replace(/```/g, "");
      const waiting = /__AGUARDA__/.test(t);
      t = t.replace(/__AGUARDA__/g, "").replace(/__FIM__/g, "").replace(/^\s*\n/, "").replace(/\s+$/, "");
      const outLines = (t || "(sem saída)").split("\n");
      setHist(prev => [...prev.slice(0, runStartRef.current), ...outLines, ...(waiting ? [] : [""])]);
      setMode(waiting ? "program" : "shell");
    } catch (e) {
      setHist(prev => [...prev.slice(0, runStartRef.current),
        e.message === "ROBOTKEY_MISSING" ? `⚠ Terminal offline: ${e.userMsg || "o professor precisa configurar a chave da IA no Vercel."}` : "Não consegui executar agora. Tente de novo.", ""]);
      setMode("shell");
    }
    setRunning(false);
  };

  const doRun = () => {
    if (!projectSrc().trim()) { push("Nenhum código para executar. Escreva algo no editor primeiro.", ""); return; }
    inputsRef.current = [];
    setMode("shell");
    setHist(prev => { runStartRef.current = prev.length; return [...prev, "⏳ compilando..."]; });
    simulate();
  };

  const buildProgram = async () => {
    if (!projectSrc().trim()) { push("Nenhum código para compilar. Escreva algo no editor primeiro.", ""); return; }
    setRunning(true);
    setHist(prev => { runStartRef.current = prev.length; return [...prev, "⏳ compilando..."]; });
    try {
      const res = await askClaude(
        `Projeto C# (arquivos compilam juntos):\n\n${projectSrc()}\n\nAja como o comando "dotnet build". Se o projeto compilar sem erros, responda exatamente:\nBuild succeeded.\n    0 Warning(s)\n    0 Error(s)\nSe houver erros de compilação, mostre-os no formato real do compilador (Arquivo.cs(linha,coluna): error CSxxxx: mensagem) seguidos de "Build FAILED.". Sem markdown, sem explicações.`,
        RUN_SYSTEM,
        { temperature: 0 }
      );
      setHist(prev => [...prev.slice(0, runStartRef.current), ...res.replace(/```/g,"").trim().split("\n"), ""]);
    } catch (e) {
      setHist(prev => [...prev.slice(0, runStartRef.current),
        e.message === "ROBOTKEY_MISSING" ? `⚠ Terminal offline: ${e.userMsg || "o professor precisa configurar a chave da IA no Vercel."}` : "Não consegui compilar agora. Tente de novo.", ""]);
    }
    setRunning(false);
  };

  const execCommand = () => {
    const raw = val;
    const c = raw.trim();
    setVal("");
    setHist(prev => [...prev, TERM_PROMPT + " " + raw]);
    if (!c) return;
    cmdHistRef.current = [...cmdHistRef.current, raw];
    cmdIdxRef.current = -1;
    const low = c.toLowerCase().replace(/\s+/g, " ");
    if (low === "cls" || low === "clear") { setHist([]); return; }
    if (low === "ajuda" || low === "help") {
      push(
        "Comandos disponíveis:",
        "  dotnet run      executa o seu programa",
        "  dotnet build    só compila e mostra os erros",
        "  dir  (ou ls)    lista os arquivos do projeto",
        "  cls  (ou clear) limpa o terminal",
        "  ajuda           mostra esta lista",
        ""
      );
      return;
    }
    if (low === "dir" || low === "ls") {
      push(...(files||[]).map(f => `  ${f.name}${(f.code||"").trim() ? "" : "  (vazio)"}`), "");
      return;
    }
    if (low === "dotnet run") { doRun(); return; }
    if (low === "dotnet build") { buildProgram(); return; }
    // ── comandos secretos: ninguém conta, eles descobrem 🥚 ──
    if (low === "dotnet moo") {
      push("         (__)", "         (oo)", "   /------\\/", "  / |    ||", " *  /\\---/\\", "    ~~   ~~", '"Muuu!" Você encontrou a vaca escondida do .NET! 🐄', "");
      onEasterEgg && onEasterEgg("moo");
      return;
    }
    if (low === "nyx dance") {
      push("♪┏(・o･)┛♪┗ (･o･) ┓♪", "♪┗ (･o･) ┓♪┏(・o･)┛♪", "♪┏(・o･)┛♪┗ (･o･) ┓♪", "O Nyx está DANÇANDO! Olha pro lado! 💃", "");
      onEasterEgg && onEasterEgg("dance");
      return;
    }
    if (low === "matrix") {
      const chars = "01アイウエオカキクケコサシスセソ";
      const rain = Array.from({ length: 10 }, () => Array.from({ length: 46 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
      push(...rain, "Acorde, Neo... a Matrix te achou. 🐇", "");
      onEasterEgg && onEasterEgg("matrix");
      return;
    }
    if (low === "nyx piada") {
      const piadas = [
        "Como o programador pede café? while (true) { café++; }",
        "Por que o C# terminou o namoro com o JavaScript? Porque ele tinha tipos demais... e o JS não tinha nenhum!",
        "O que o int disse pro double? \"Para de aparecer com essas vírgulas!\"",
        "Qual o animal favorito do programador? O polvo, porque tem 8 bits! 🐙",
        "Erro 404: piada não encontrada. (brincadeira, essa era a piada 😅)",
      ];
      push(piadas[Math.floor(Math.random() * piadas.length)], "");
      onEasterEgg && onEasterEgg("piada");
      return;
    }
    if (low === "sudo faça um sanduíche" || low === "sudo faca um sanduiche") {
      push("🥪 Ok.", "(Só funcionou porque você pediu com \"sudo\" — pesquise essa piada com seu professor um dia!)", "");
      onEasterEgg && onEasterEgg("sanduiche");
      return;
    }
    if (low === "nyx café" || low === "nyx cafe") {
      push("        ( (", "         ) )", "      ........", "      |      |]", "      \\      /", "       `----'", "☕ Bem mais desperto agora! Bora codar? 😄", "");
      onEasterEgg && onEasterEgg("cafe");
      return;
    }
    if (low === "42") {
      push("🌌 A resposta para a vida, o universo e tudo mais... é 42!", "(Se você não entendeu essa, é hora de conhecer 'O Guia do Mochileiro das Galáxias' 👽)", "");
      onEasterEgg && onEasterEgg("42");
      return;
    }
    if (low === "rm -rf /" || low === "rm -rf /*") {
      push("😅 Boa tentativa! Mas esse terminal é só de mentirinha — nada aqui se apaga de verdade.", "");
      onEasterEgg && onEasterEgg("rm");
      return;
    }
    if (low === "dotnet" || low.startsWith("dotnet ")) { push("Uso:  dotnet run  |  dotnet build", ""); return; }
    push(`'${c}' não é reconhecido como um comando. Digite "ajuda" para ver os comandos.`, "");
  };

  const submitProgramInput = () => {
    if (running) return;
    inputsRef.current = [...inputsRef.current, val];
    setVal("");
    push(val, "⏳ ...");
    simulate();
  };

  const cancelProgram = () => {
    setMode("shell");
    push("^C", "");
  };

  const onKey = (e) => {
    if (e.key === "Enter") { mode === "shell" ? execCommand() : submitProgramInput(); return; }
    if (mode === "program" && e.key === "c" && e.ctrlKey) { e.preventDefault(); cancelProgram(); return; }
    if (mode === "shell" && e.key === "ArrowUp") {
      e.preventDefault();
      const h = cmdHistRef.current;
      if (!h.length) return;
      cmdIdxRef.current = cmdIdxRef.current === -1 ? h.length - 1 : Math.max(0, cmdIdxRef.current - 1);
      setVal(h[cmdIdxRef.current]);
      return;
    }
    if (mode === "shell" && e.key === "ArrowDown") {
      e.preventDefault();
      const h = cmdHistRef.current;
      if (cmdIdxRef.current === -1) return;
      cmdIdxRef.current = cmdIdxRef.current + 1;
      if (cmdIdxRef.current >= h.length) { cmdIdxRef.current = -1; setVal(""); }
      else setVal(h[cmdIdxRef.current]);
    }
  };

  const mono = { fontFamily:"'Courier New',monospace", fontSize:13 };

  return (
    <div data-tour={dataTour} style={{ background:"#0a0a0a", border:"1px solid #333", borderRadius:10, marginTop:12, overflow:"hidden", boxShadow:"0 10px 28px rgba(0,0,0,.4)" }}>
      <div style={{ background:"linear-gradient(180deg,#1b1b1b,#141414)", padding:"6px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #333" }}>
        <span style={{ color:"#bbb", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ display:"inline-flex", gap:5 }}>
            <span style={{ width:10, height:10, borderRadius:"50%", background:"#ff5f57" }} />
            <span style={{ width:10, height:10, borderRadius:"50%", background:"#febc2e" }} />
            <span style={{ width:10, height:10, borderRadius:"50%", background:"#28c840" }} />
          </span>
          ⌨️ Terminal <span style={{ color:"#555", fontSize:11 }}>· digite os comandos como no VS Code</span>
        </span>
        <div style={{ display:"flex", gap:6 }}>
          {mode === "program" && !running && (
            <button onClick={cancelProgram} style={{ background:"#3a1d1d", border:"1px solid #7f1d1d", color:"#fca5a5", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>■ parar (Ctrl+C)</button>
          )}
          <button onClick={()=>{ setHist([]); setMode("shell"); inputsRef.current = []; }} style={{ background:"#222", border:"1px solid #444", color:"#bbb", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>limpar</button>
          <button onClick={doRun} disabled={running} style={{ background:"#34d399", border:"none", color:"#03301f", borderRadius:6, padding:"3px 12px", cursor:"pointer", fontSize:12, fontWeight:800, opacity:running?0.6:1 }}>{running?"executando...":"▶ dotnet run"}</button>
        </div>
      </div>
      <div ref={boxRef} style={{ minHeight:110, maxHeight, overflow:"auto", padding:12, cursor:"text" }} onClick={()=>{ if (inputRef.current) inputRef.current.focus(); }}>
        <pre style={{ ...mono, margin:0, color:"#d4d4d4", whiteSpace:"pre-wrap" }}>{hist.join("\n")}</pre>
        {!running && (
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {mode === "shell"
              ? <span style={{ ...mono, color:"#d4d4d4", whiteSpace:"nowrap" }}>{TERM_PROMPT}</span>
              : <span style={{ ...mono, color:"#34d399" }}>❯</span>}
            <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)} onKeyDown={onKey}
              spellCheck={false} autoCorrect="off" autoCapitalize="off"
              style={{ ...mono, flex:1, background:"transparent", border:"none", outline:"none", boxShadow:"none", color:mode==="shell"?"#d4d4d4":"#34d399", caretColor:"#d4d4d4", padding:0 }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CHAT COM O NYX  (botão flutuante — aluno e professor)
// ════════════════════════════════════════════════════════════════════════════
function NyxChat({ who = "student", context, onTheme, onCommand, accent = "#7c83ff", dataTour, gear, accessMode = false, speak = null }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [msgs, open, busy]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    const hist = [...msgs, { from:"user", text:t }];
    setMsgs(hist); setText(""); setBusy(true);
    // comandos diretos (ex: zek, /hiberne) — executados na hora, sem passar pela IA
    if (onCommand) {
      try {
        const cmdReply = await onCommand(t);
        if (cmdReply) {
          setMsgs(ms => [...ms, { from:"nyx", text: cmdReply }]);
          setBusy(false);
          return;
        }
      } catch {}
    }
    try {
      const histTxt = hist.slice(-8).map(m => (m.from==="user" ? "Pessoa: " : "Nyx: ") + m.text).join("\n");
      const themeRule = who === "student"
        ? "\nSe (e SOMENTE se) o aluno pedir para mudar a cor ou o tema do fundo, termine sua resposta com uma linha exata: [TEMA:claro] ou [TEMA:escuro] ou [TEMA:#rrggbb] para uma cor só, ou [TEMA:#rrggbb,#rrggbb] / [TEMA:#rrggbb,#rrggbb,#rrggbb] para misturar 2 ou 3 cores num degradê (escolha tons bonitos e combinando com o que ele pediu; NUNCA mais de 3 cores). Nunca use isso em outras situações."
        : "";
      const persona = who === "student"
        ? (accessMode
            ? `Você está conversando com um aluno dentro da plataforma, num chat pequeno, e este aluno está no seu MODO GUIADO (dificuldade de leitura/escrita/motora). Responda MUITO curto (no máximo 3 frases), com palavras bem simples, sempre calorosamente. Se puder, relacione a resposta com exemplos de jogos.${themeRule}`
            : `Você está conversando com um aluno dentro da plataforma, num chat pequeno. Responda CURTO (no máximo 5 frases), simples e animado. Ajude com dúvidas de C#, dicas de estudo e o que ele precisar. Não resolva a atividade por ele — explique o caminho.${themeRule}`)
        : `Você é o assistente pessoal do PROFESSOR dentro da plataforma, num chat pequeno. Responda curto e direto (máximo 6 frases), com base nos dados da turma fornecidos. Sugira a quem dar atenção, ideias de exercícios e próximos passos quando fizer sentido.
COMANDOS DISPONÍVEIS que o professor pode digitar aqui no chat (executados por você na hora):
- "zek" → você aparece na tela de TODOS os alunos, no centro, pedindo atenção, e bloqueia tudo o que eles estiverem fazendo.
- "/hiberne" → desativa o zek e libera as telas dos alunos.
- "zeker" → bloqueia o duelo entre alunos.
- "/liberte" → libera o duelo novamente.
Se o professor perguntar como chamar a atenção da turma ou controlar os duelos, LEMBRE-O desses comandos. Outras ações (mudar nota, renomear, mover de turno ou excluir aluno, ativar Modo Guiado) o professor faz no painel Monitoramento clicando no aluno — indique o caminho quando ele pedir esse tipo de mudança.`;
      const out = await askClaude(
        `${context ? context() : ""}\n\nConversa até agora:\n${histTxt}\n\nResponda como Nyx à última mensagem.`,
        (who === "student" && accessMode ? NYX_GUIDED_SYSTEM : CS_SYSTEM) + "\n\n" + persona,
        { temperature: 0.6 }
      );
      let reply = out.trim();
      const m = reply.match(/\[TEMA:([^\]]+)\]/i);
      if (m && onTheme) {
        const val = m[1].trim().toLowerCase();
        onTheme(val === "claro" ? "light" : val === "escuro" ? "dark" : val);
        reply = reply.replace(/\[TEMA:[^\]]+\]/ig, "").trim() || "Prontinho, fundo novo! 🎨";
      }
      setMsgs(ms => [...ms, { from:"nyx", text:reply }]);
    } catch (e) {
      setMsgs(ms => [...ms, { from:"nyx", text: e.message === "ROBOTKEY_MISSING" ? `Estou offline 😴 — ${e.userMsg || "o professor precisa configurar a chave da IA no Vercel."}` : "Tive um probleminha agora. Tenta de novo?" }]);
    }
    setBusy(false);
  };

  return (
    <>
      <button data-tour={dataTour} onClick={()=>setOpen(o=>!o)} title="Conversar com o Nyx"
        style={{ position:"fixed", right:18, bottom:18, zIndex:900, width:60, height:60, borderRadius:"50%", border:"none", cursor:"pointer", background:`linear-gradient(135deg, ${accent}, ${shade(accent,-0.25)})`, boxShadow:`0 6px 22px ${accent}66`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:25, lineHeight:1 }}>{open ? "✕" : "🤖"}</span>
        {!open && <span style={{ position:"absolute", top:-4, right:-2, background:"#34d399", borderRadius:10, fontSize:9, fontWeight:900, color:"#03301f", padding:"2px 6px" }}>NYX</span>}
      </button>
      {open && (
        <div className="pop" style={{ position:"fixed", right:18, bottom:88, zIndex:900, width:"min(370px, calc(100vw - 36px))", height:"min(460px, calc(100vh - 120px))", background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:18, boxShadow:"0 24px 60px rgba(0,0,0,.55)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"8px 14px", borderBottom:"1px solid #272e52", display:"flex", alignItems:"center", gap:10, background:"#0d1122" }}>
            <NyxRobot state="idle" size={30} showName={false} gear={gear} />
            <div>
              <div style={{ fontWeight:900, letterSpacing:2, fontSize:13, color:accent }}>NYX</div>
              <div style={{ fontSize:11, color:"#96a0cc" }}>{who==="student" ? "seu ajudante de C#" : "assistente do professor"}</div>
            </div>
          </div>
          <div ref={listRef} style={{ flex:1, overflowY:"auto", padding:12 }}>
            {msgs.length === 0 && (
              <div style={{ background:"#0d1122", border:"1px solid #272e52", borderRadius:"12px 12px 12px 4px", padding:"10px 12px", fontSize:13, color:"#c7cfee", lineHeight:1.6, maxWidth:"88%" }}>
                {who === "student"
                  ? "Oi! Pode me perguntar qualquer coisa de C#, pedir uma dica… ou até pedir para mudar a cor do fundo! 🎨"
                  : "Olá, professor! Pergunte sobre a turma, peça sugestões de exercícios ou o que precisar. 👨‍🏫"}
              </div>
            )}
            {msgs.map((m,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:m.from==="user"?"flex-end":"flex-start", marginTop:8, alignItems:"flex-end", gap:5 }}>
                <div style={{ background:m.from==="user"?accent+"2e":"#0d1122", border:`1px solid ${m.from==="user"?accent+"66":"#272e52"}`, borderRadius:m.from==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px", padding:"9px 12px", fontSize:13, color:"#e8ebfa", lineHeight:1.6, maxWidth:"88%", whiteSpace:"pre-wrap" }}>{m.text}</div>
                {m.from!=="user" && speak && (
                  <button onClick={()=>speak(m.text)} title="Ouvir esta resposta" style={{ background:"transparent", border:`1px solid ${accent}55`, color:accent, borderRadius:8, padding:"3px 7px", fontSize:11, cursor:"pointer", flexShrink:0 }}>🔊</button>
                )}
              </div>
            ))}
            {busy && <div style={{ color:"#96a0cc", fontSize:12, marginTop:8 }}>Nyx está digitando…</div>}
          </div>
          <div style={{ display:"flex", gap:8, padding:10, borderTop:"1px solid #272e52", background:"#0d1122" }}>
            <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{ if (e.key==="Enter") send(); }} placeholder="Escreva para o Nyx..."
              style={{ flex:1, background:"#131730", border:"1px solid #2a3154", borderRadius:10, padding:"9px 12px", color:"#e8ebfa", fontSize:13, outline:"none" }} />
            <button onClick={send} disabled={busy} style={{ background:`linear-gradient(135deg, ${accent}, ${shade(accent,-0.25)})`, border:"none", borderRadius:10, color:"#fff", fontWeight:800, padding:"0 16px", cursor:"pointer", opacity:busy?0.6:1 }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TOUR GUIADO DO NYX  (destaca cada área da tela do aluno)
// ════════════════════════════════════════════════════════════════════════════
const TOUR_STEPS = [
  { sel:'[data-tour="editor"]',   emoji:"📝", title:"Seu editor de código",  text:"É aqui que você escreve seus programas em C#. Ele colore o código e fecha chaves, parênteses e aspas sozinho!" },
  { sel:'[data-tour="arquivos"]', emoji:"📄", title:"Seus arquivos",         text:"Crie quantos arquivos .cs quiser. Eles fazem parte do mesmo projeto e funcionam juntos, como no VS Code!" },
  { sel:'[data-tour="nyx"]',      emoji:"🤖", title:"Eu fico aqui!",          text:"Enquanto você escreve, eu confiro seu código. Se algo estiver errado, mostro onde está, como corrigir e até as teclas para apertar." },
  { sel:'[data-tour="loja"]',     emoji:"🎁", title:"Loja do Nyx",            text:"Cada resposta certa nas atividades e provas vira pontos! Use-os aqui para desbloquear e equipar acessórios em mim: chapéu, fone, espada e muito mais." },
  { sel:'[data-tour="terminal"]', emoji:"⌨️", title:"Terminal como o do VS Code", text:"Digite dotnet run e aperte Enter para executar seu programa! Também tem dotnet build, dir, cls e ajuda. Quando o programa pedir algo, é só digitar." },
  { sel:'[data-tour="salvar"]',   emoji:"💾", title:"Salvar e finalizar",    text:"Quando terminar o código do dia, clique aqui: eu crio um resumo da aula e uma atividade feita só para você." },
  { sel:'[data-tour="tema"]',     emoji:"🎨", title:"Tema do fundo",         text:"Prefere claro ou escuro? Troque aqui. Quer outra cor? É só me pedir no chat que eu mudo para você!" },
  { sel:'[data-tour="chat"]',     emoji:"💬", title:"Fale comigo!",          text:"Qualquer dúvida de C#, abre este botão e conversa comigo. Estou sempre por aqui. Bora programar? 🚀" },
];

function TourOverlay({ step, onNext }) {
  const [rect, setRect] = useState(null);
  // "smooth" só na troca de passo (anel desliza bonito de um elemento pro outro);
  // depois disso vira instantâneo, pro anel ficar GRUDADO no elemento quando a página rola
  const [smooth, setSmooth] = useState(true);
  const s = TOUR_STEPS[step];
  useEffect(() => {
    const el = document.querySelector(s.sel);
    if (!el) { setRect(null); return; }
    setSmooth(true);
    el.scrollIntoView({ block:"center" });
    let raf, t2;
    // mede o elemento a cada frame: se a página rolar ou o layout mudar, o anel acompanha na hora
    const track = () => {
      const r = el.getBoundingClientRect();
      setRect(prev => (prev && Math.abs(prev.top-r.top)<0.5 && Math.abs(prev.left-r.left)<0.5 && Math.abs(prev.width-r.width)<0.5 && Math.abs(prev.height-r.height)<0.5)
        ? prev : { top:r.top, left:r.left, width:r.width, height:r.height, bottom:r.bottom });
      raf = requestAnimationFrame(track);
    };
    const t = setTimeout(() => {
      track();
      t2 = setTimeout(() => setSmooth(false), 350); // terminou o deslize do passo → passa a colar no scroll
    }, 150);
    return () => { clearTimeout(t); clearTimeout(t2); cancelAnimationFrame(raf); };
  }, [step, s.sel]);
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const below = rect ? rect.bottom + 200 < vh : true;
  const tipTop = rect ? (below ? Math.min(rect.bottom + 14, vh - 210) : Math.max(rect.top - 206, 10)) : vh/2 - 100;
  const tipLeft = rect ? Math.max(12, Math.min(rect.left + rect.width/2 - 170, vw - 356)) : 20;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:990 }}>
      {rect
        ? <div style={{ position:"fixed", top:rect.top-6, left:rect.left-6, width:rect.width+12, height:rect.height+12, borderRadius:14, border:"3px solid #7c83ff", boxShadow:"0 0 0 9999px rgba(5,7,18,.78), 0 0 24px #7c83ff88", transition: smooth ? "all .3s ease" : "none", pointerEvents:"none" }} />
        : <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.78)" }} />}
      <div className="pop" key={step} style={{ position:"fixed", top:tipTop, left:tipLeft, width:340, maxWidth:"calc(100vw - 24px)", background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #7c83ff66", borderRadius:16, padding:"14px 16px", boxShadow:"0 18px 50px rgba(0,0,0,.6)" }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
          <div style={{ flexShrink:0, marginTop:-6 }}><NyxRobot state="idle" size={46} showName={false} /></div>
          <div>
            <div style={{ fontWeight:800, color:"#e8ebfa", fontSize:14.5 }}>{s.emoji} {s.title}</div>
            <p style={{ color:"#c7cfee", fontSize:13, lineHeight:1.6, margin:"6px 0 0" }}>{s.text}</p>
          </div>
        </div>
        {/* sem botão de pular: aluno novo conhece a sala inteira, passo a passo */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
          <span style={{ color:"#5d679c", fontSize:12 }}>{step+1}/{TOUR_STEPS.length}</span>
          <button onClick={onNext} style={{ background:"linear-gradient(135deg,#7c83ff,#5a61e8)", border:"none", borderRadius:10, color:"#fff", fontWeight:800, padding:"7px 16px", cursor:"pointer", fontSize:13 }}>{step === TOUR_STEPS.length-1 ? "Entendi! 🚀" : "Próximo →"}</button>
        </div>
      </div>
    </div>
  );
}

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
    <div className="pop" key={step} style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #f8717166", borderRadius:16, padding:"14px 16px", boxShadow:"0 10px 28px rgba(0,0,0,.4)", marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span style={{ color:"#f87171", fontSize:12, fontWeight:800, letterSpacing:0.5 }}>⚠ Erro {step+1} de {errors.length}</span>
        <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:18, cursor:"pointer", lineHeight:1 }}>✕</button>
      </div>
      <div style={{ background:"#0d1122", border:"1px solid #2c3358", borderRadius:8, padding:"6px 10px", fontFamily:"'Courier New',monospace", fontSize:12.5, color:"#f87171", overflowX:"auto", whiteSpace:"pre", marginBottom:8 }}>{e.trecho}</div>
      <p style={{ color:"#c7cfee", fontSize:13, lineHeight:1.6, margin:0 }}>{e.explicacao}</p>
      {e.exemplo && <div style={{ marginTop:8 }}><CodeBlock code={e.exemplo} /></div>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, gap:8, flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:6 }}>
          {step > 0 && <button onClick={onPrev} style={{ background:"#2a3154", border:"none", borderRadius:10, color:"#e8ebfa", fontWeight:700, padding:"7px 12px", cursor:"pointer", fontSize:12.5 }}>← Anterior</button>}
          {step < errors.length-1 && <button onClick={onNext} style={{ background:"#2a3154", border:"none", borderRadius:10, color:"#e8ebfa", fontWeight:700, padding:"7px 12px", cursor:"pointer", fontSize:12.5 }}>Próximo →</button>}
        </div>
        <button onClick={onVerify} disabled={verifying} style={{ background:"linear-gradient(135deg,#34d399,#16a34a)", border:"none", borderRadius:10, color:"#fff", fontWeight:800, padding:"8px 14px", cursor:verifying?"default":"pointer", fontSize:12.5, opacity:verifying?0.6:1 }}>
          {verifying ? "🔍 Verificando..." : "✅ Já corrigi, verificar!"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  LOJA DO NYX  (troca pontos de acerto por acessórios cosméticos)
// ════════════════════════════════════════════════════════════════════════════
function NyxShop({ wallet, owned, gear, onEquip, onBuy, isTestShift, onClose }) {
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
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:560, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#7c83ff,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🎁 Loja do Nyx</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 14px" }}>
          {isTestShift ? "🧪 Turma de teste: todos os itens estão liberados para você testar!" : "Cada resposta certa vira 1 ponto. Comprar um item GASTA os pontos — mas o item é seu para sempre! (Seu lugar no ranking não muda: ele conta os pontos que você já ganhou.)"}
        </p>

        <div style={{ display:"flex", alignItems:"center", gap:16, background:"#0d1122", border:"1px solid #2a3154", borderRadius:16, padding:16, marginBottom:16 }}>
          <NyxRobot state="ok" size={72} showName={false} gear={gear} />
          <div>
            <div style={{ color:"#fbbf24", fontWeight:900, fontSize:22 }}>💰 {wallet} pts</div>
            <div style={{ color:"#5d679c", fontSize:12 }}>para gastar · itens comprados: toque para vestir ou tirar</div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
          {NYX_ITEMS.map(item => {
            const has = isTestShift || owned.includes(item.id);
            const canBuy = !has && wallet >= item.cost;
            const clickable = has || canBuy;
            const equipped = gear[item.slot] === item.id;
            return (
              <button key={item.id} data-item={item.id} onClick={()=>click(item)} disabled={!clickable}
                style={{
                  background: equipped ? "#7c83ff26" : "#0d1122",
                  border: `2px solid ${equipped ? "#7c83ff" : has ? "#34d39966" : canBuy ? "#fbbf2466" : "#241f38"}`,
                  borderRadius:14, padding:"14px 10px", textAlign:"center", cursor: clickable?"pointer":"default",
                  opacity: clickable ? 1 : 0.55, position:"relative",
                }}>
                <div style={{ fontSize:30, filter: clickable?"none":"grayscale(1)" }}>{item.emoji}</div>
                <div style={{ color:"#e8ebfa", fontSize:12.5, fontWeight:700, marginTop:6 }}>{item.label}</div>
                {has ? (
                  equipped
                    ? <div style={{ color:"#7c83ff", fontSize:11, fontWeight:800, marginTop:4 }}>✓ Equipado</div>
                    : <div style={{ color:"#34d399", fontSize:11, fontWeight:700, marginTop:4 }}>✓ Seu · toque para vestir</div>
                ) : canBuy ? (
                  <div style={{ color:"#fbbf24", fontSize:11, fontWeight:800, marginTop:4 }}>🛒 Comprar · {item.cost} pts</div>
                ) : (
                  <div style={{ color:"#5d679c", fontSize:11, marginTop:4 }}>🔒 {wallet}/{item.cost} pts</div>
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
//  FEEDBACK ANIMADO DO NYX  (aparece quando o aluno termina a atividade)
// ════════════════════════════════════════════════════════════════════════════
function NyxFeedbackModal({ score, loading, feedback, onClose }) {
  const g = gradeInfo(score);
  const robotState = score>=75 ? "ok" : score>=40 ? "idle" : "error";
  const dica = score < 60 ? "Dica: releia com calma as questões que você errou na revisão abaixo — o Nyx te explica cada uma se você pedir!" : "";
  const structured = feedback && typeof feedback === "object" && Array.isArray(feedback.secoes);
  const feedbackText = structured ? feedback.intro : (typeof feedback === "string" ? feedback : "");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:`1px solid ${g.color}55`, borderRadius:22, padding:"28px 24px", maxWidth:440, width:"100%", textAlign:"center", boxShadow:`0 24px 70px rgba(0,0,0,.55), 0 0 50px ${g.color}22` }}>
        <div style={{ animation:"nyx-float 3s ease-in-out infinite" }}>
          <NyxRobot state={robotState} size={110} showName={false} />
        </div>
        <div style={{ fontSize:44, marginTop:6, lineHeight:1 }}>{g.emoji}</div>
        <h2 style={{ color:g.color, fontSize:26, margin:"4px 0 2px", fontWeight:900 }}>{g.label}!</h2>
        <div style={{ color:"#96a0cc", fontSize:14, marginBottom:14 }}>Você fez {score} pontos na atividade</div>
        <div style={{ background:"#0d1122", border:"1px solid #2c3358", borderRadius:16, padding:"16px 18px", textAlign:"left" }}>
          {loading
            ? <p style={{ color:"#96a0cc", fontSize:14, margin:0 }}>Nyx está analisando seu desempenho...</p>
            : <p style={{ color:"#c7cfee", fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap", margin:0 }}>{feedbackText || "Parabéns por concluir a aula de hoje!"}</p>}
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
  const ACCENTS = ["#7c83ff","#34d399","#fbbf24","#06b6d4","#ec4899","#8b5cf6","#f87171"];
  const c = ACCENTS[step % ACCENTS.length];
  const accent = onFinal ? "#34d399" : c;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:`1px solid ${accent}55`, borderRadius:22, padding:"26px 24px", maxWidth:520, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:`0 24px 70px rgba(0,0,0,.55), 0 0 50px ${accent}22` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ color:"#5d679c", fontSize:12, fontWeight:700, letterSpacing:0.5 }}>{onFinal ? "Pronto!" : `Questão ${step+1} de ${total}`}</span>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:20, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        <div style={{ textAlign:"center" }}>
          <div style={{ display:"inline-block", animation:"nyx-float 3s ease-in-out infinite" }}>
            <NyxRobot state={onFinal ? "ok" : "idle"} size={90} showName={false} />
          </div>
        </div>

        {onFinal ? (
          <div style={{ textAlign:"center", marginTop:6 }}>
            <div style={{ fontSize:40 }}>🎉</div>
            <p style={{ color:"#c7cfee", fontSize:16, lineHeight:1.7, margin:"8px 0 0" }}>{encouragement}</p>
          </div>
        ) : (
          <div style={{ marginTop:12, background:"#151a31", borderRadius:14, padding:18, border:"1px solid #2a3154", borderLeft:`5px solid ${c}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
              <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{s.emoji || "📌"}</span>
              <h3 style={{ color:"#e8ebfa", fontSize:16, margin:0 }}>{s.titulo}</h3>
            </div>
            {s.explicacao && <p style={{ color:"#c7cfee", fontSize:14.5, lineHeight:1.75, margin:"0 0 4px" }}>{s.explicacao}</p>}
            {s.exemplo && <CodeBlock code={s.exemplo} />}
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginTop:18 }}>
          {step > 0 && !onFinal && (
            <button onClick={()=>setStep(v=>v-1)} style={{ background:"#2a3154", color:"#e8ebfa", border:"none", borderRadius:10, padding:"10px 16px", cursor:"pointer", fontWeight:700, fontSize:13.5 }}>← Voltar</button>
          )}
          <button onClick={()=> onFinal ? onClose() : setStep(v=>v+1)}
            style={{ flex:1, background:`linear-gradient(135deg, ${accent}, ${shade(accent,-0.18)})`, color:"#fff", border:"none", borderRadius:10, padding:"10px 16px", cursor:"pointer", fontWeight:800, fontSize:14 }}>
            {onFinal ? "Fechar" : (step === total-1 ? "Terminar →" : "Próximo →")}
          </button>
        </div>

        {!onFinal && total > 1 && (
          <div style={{ display:"flex", gap:5, justifyContent:"center", marginTop:14 }}>
            {sections.map((_,i)=>(
              <div key={i} style={{ width:7, height:7, borderRadius:"50%", background: i===step ? c : "#2a3154" }} />
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
  if (!achievement) return null;
  return (
    <div style={{ position:"fixed", top:16, right:16, zIndex:1300, background:"linear-gradient(135deg,#fbbf24,#f59e0b)", color:"#1c1206", borderRadius:16, padding:"14px 18px", boxShadow:"0 14px 40px rgba(0,0,0,.45)", display:"flex", alignItems:"center", gap:12, maxWidth:320, animation:"rise .35s ease both" }}>
      <div style={{ fontSize:34 }}>{achievement.emoji}</div>
      <div>
        <div style={{ fontWeight:900, fontSize:13 }}>🎖️ Conquista desbloqueada!</div>
        <div style={{ fontWeight:800, fontSize:14 }}>{achievement.label}</div>
        <div style={{ fontSize:11.5, opacity:0.85 }}>{achievement.desc}</div>
      </div>
    </div>
  );
}

function AchievementsModal({ unlocked, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:520, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#fbbf24,#f59e0b)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🎖️ Conquistas</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 14px" }}>{unlocked.length} de {ACHIEVEMENTS.length} desbloqueadas</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
          {ACHIEVEMENTS.map(a => {
            const got = unlocked.includes(a.id);
            return (
              <div key={a.id} style={{ background:got?"#fbbf2418":"#0d1122", border:`1px solid ${got?"#fbbf24":"#241f38"}`, borderRadius:14, padding:"12px 14px", display:"flex", gap:10, alignItems:"center", opacity:got?1:0.55 }}>
                <div style={{ fontSize:26, filter:got?"none":"grayscale(1)" }}>{a.secret && !got ? "❓" : a.emoji}</div>
                <div>
                  <div style={{ color:"#e8ebfa", fontWeight:800, fontSize:13 }}>{a.secret && !got ? "???" : a.label}</div>
                  <div style={{ color:"#5d679c", fontSize:11.5 }}>{a.secret && !got ? "Um segredo espera por quem explora o terminal..." : a.desc}</div>
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
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:440, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#22d3ee,#7c83ff)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📊 Ranking da Turma</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 14px" }}>Os 5 com mais pontos do Nyx na sua turma</p>
        {loading ? <p style={{ color:"#5d679c", fontSize:13 }}>Carregando...</p> : top.length === 0 ? (
          <p style={{ color:"#5d679c", fontSize:13 }}>Ninguém tem pontos ainda — seja o primeiro!</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {top.map((s, i) => (
              <div key={s.name} style={{ display:"flex", alignItems:"center", gap:10, background: s.name===myName ? "#7c83ff22" : "#0d1122", border:`1px solid ${s.name===myName?"#7c83ff":"#2a3154"}`, borderRadius:12, padding:"8px 12px" }}>
                <span style={{ fontSize:20, width:28, textAlign:"center" }}>{medals[i]}</span>
                <Avatar cfg={s.avatar} size={32} />
                <span style={{ flex:1, fontWeight:700, fontSize:13.5, color: s.name===myName ? "#c7d2fe" : "#e8ebfa" }}>{s.name}{s.name===myName?" (você)":""}</span>
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
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#96a0cc", marginBottom:4 }}>
        <span>🎯 Meta da turma · nível {g.level}</span>
        <span>{sum}{g.next ? `/${g.next}` : ""} pts</span>
      </div>
      <div className="bar-glow" style={{ background:"#0d1122", border:"1px solid #2a3154", borderRadius:20, height:10, overflow:"hidden" }}>
        <div style={{ width:`${g.pct}%`, height:"100%", background:"linear-gradient(90deg,#7c83ff,#22d3ee)", transition:"width .5s ease" }} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TELÃO DA TURMA — tela cheia só de visualização, pra projetar durante a aula
// ════════════════════════════════════════════════════════════════════════════
const BOSS_PRESETS = [
  { name: "Bugzilla", emoji: "👾" },
  { name: "Null Pointer", emoji: "🐉" },
  { name: "Lag Monstro", emoji: "🦑" },
  { name: "Stack Overlord", emoji: "🤖" },
];

function TelaoModal({ students, shift, onClose, teacherAuth }) {
  const [telaoShift, setTelaoShift] = useState(shift && shift !== "all" ? shift : "matutino");
  // 👾 chefão da turma: HP = dano que a turma precisa causar; cada ponto ganho desde a invocação = 1 de dano
  const [boss, setBossState] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = async () => { const b = await getBoss(); if (alive) setBossState(b && b.status === "active" ? b : null); };
    load();
    const iv = setInterval(load, 4000);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  const summonBoss = async (maxHp) => {
    const preset = BOSS_PRESETS[Math.floor(Math.random() * BOSS_PRESETS.length)];
    const baseline = {};
    (students || []).filter(s => (s.shift||"") !== TEST_SHIFT.id).forEach(s => { baseline[`${s.shift||"sem-turno"}:${s.name}`] = s.nyxPoints || 0; });
    const b = { status: "active", ...preset, maxHp, baseline, startedAt: Date.now() };
    await setBoss(b, teacherAuth);
    setBossState(b);
  };
  const endBoss = async () => { await clearBoss(teacherAuth); setBossState(null); };
  const bossDamage = boss ? (students || []).filter(s => (s.shift||"") !== TEST_SHIFT.id)
    .reduce((sum, s) => sum + Math.max(0, (s.nyxPoints || 0) - (boss.baseline?.[`${s.shift||"sem-turno"}:${s.name}`] ?? 0)), 0) : 0;
  const bossHp = boss ? Math.max(0, boss.maxHp - bossDamage) : 0;
  const bossDefeated = boss && bossHp === 0;
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
    <div data-testid="telao-modal" className="telao-wrap" style={{ position:"fixed", inset:0, background:"#05070f", zIndex:2000, display:"flex", flexDirection:"column", padding:"36px 48px", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:14 }}>
        <span className="shine" style={{ fontSize:"clamp(22px, 5vw, 32px)", fontWeight:900, background:"linear-gradient(120deg,#fbbf24,#fb923c,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🖥️ Telão da Turma</span>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          {SHIFTS.map(sh => (
            <button key={sh.id} onClick={()=>setTelaoShift(sh.id)} style={{ background: telaoShift===sh.id ? "#fbbf24" : "#181d38", color: telaoShift===sh.id ? "#1c1400" : "#96a0cc", border:`2px solid ${telaoShift===sh.id?"#fbbf24":"#2a3154"}`, borderRadius:12, padding:"10px 20px", fontSize:16, fontWeight:800, cursor:"pointer" }}>{sh.emoji} {sh.label}</button>
          ))}
          <button onClick={onClose} style={{ background:"#2a3154", color:"#fff", border:"none", borderRadius:12, padding:"10px 18px", fontSize:16, cursor:"pointer", fontWeight:800 }}>✕ Sair (Esc)</button>
        </div>
      </div>
      {/* 👾 chefão da turma */}
      {boss ? (
        <div className="telao-card" style={{ position:"relative", background: bossDefeated ? "linear-gradient(135deg,#14532d,#166534)" : "linear-gradient(135deg,#3b0764,#1e1b4b)", border:`2px solid ${bossDefeated ? "#34d399" : "#a855f7"}`, borderRadius:24, padding:"22px 28px", marginBottom:24 }}>
          {bossDefeated && <ConfettiParty level={1} />}
          <div style={{ display:"flex", alignItems:"center", gap:18, flexWrap:"wrap" }}>
            <span style={{ fontSize:"clamp(40px, 8vw, 64px)", animation: bossDefeated ? "none" : "nyx-shake 2.2s ease-in-out infinite" }}>{bossDefeated ? "💀" : boss.emoji}</span>
            <div style={{ flex:"1 1 240px", minWidth:0 }}>
              <h2 style={{ margin:0, fontSize:"clamp(18px, 4.5vw, 26px)", color: bossDefeated ? "#bbf7d0" : "#e9d5ff" }}>
                {bossDefeated ? `${boss.name} FOI DERROTADO! 🎉` : `${boss.name} invadiu a aula!`}
              </h2>
              <p style={{ margin:"4px 0 10px", color: bossDefeated ? "#86efac" : "#c4b5fd", fontSize:"clamp(12px, 3vw, 14px)" }}>
                {bossDefeated ? "A turma venceu junta — parabéns, guerreiros do código!" : "Cada resposta certa da turma tira vida dele. Ao ataque!"}
              </p>
              <div className="bar-glow" style={{ background:"#0d1122", border:"1px solid #2a3154", borderRadius:20, height:24, overflow:"hidden" }}>
                <div style={{ width:`${boss.maxHp ? (bossHp / boss.maxHp) * 100 : 0}%`, height:"100%", background: bossDefeated ? "#14532d" : "linear-gradient(90deg,#ef4444,#a855f7)", transition:"width .8s ease" }} />
              </div>
              <p style={{ margin:"6px 0 0", color:"#e8ebfa", fontWeight:900, fontSize:"clamp(13px, 3.5vw, 16px)" }}>❤️ {bossHp}/{boss.maxHp} · dano da turma: {Math.min(bossDamage, boss.maxHp)}</p>
            </div>
            <button onClick={endBoss} style={{ background:"#2a3154", color:"#fff", border:"none", borderRadius:12, padding:"10px 16px", fontSize:14, cursor:"pointer", fontWeight:800 }}>{bossDefeated ? "🏁 Encerrar festa" : "✕ Dispensar chefão"}</button>
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          <span style={{ color:"#96a0cc", fontSize:14, fontWeight:800 }}>👾 Invocar chefão (a turma derrota ganhando pontos):</span>
          {[["Fácil", 30], ["Médio", 60], ["Épico", 120]].map(([label, hp]) => (
            <button key={hp} onClick={()=>summonBoss(hp)} style={{ background:"#3b0764", color:"#e9d5ff", border:"1px solid #a855f7", borderRadius:12, padding:"8px 16px", fontSize:13, fontWeight:800, cursor:"pointer" }}>{label} · {hp} HP</button>
          ))}
        </div>
      )}

      <div className="telao-grid" style={{ display:"grid", gridTemplateColumns: "1.3fr 1fr", gap:28, flex:1 }}>
        <div className="telao-card" style={{ background:"linear-gradient(180deg,#181d38,#131730)", borderRadius:24, border:"1px solid #2c3358", padding:32 }}>
          <h2 style={{ margin:"0 0 20px", fontSize:"clamp(20px, 4.5vw, 26px)", color:"#22d3ee" }}>📊 Ranking ao vivo</h2>
          {ranking.length===0 ? <p style={{ color:"#5d679c", fontSize:18 }}>Ninguém pontuou ainda nessa turma.</p> : (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {ranking.map((s,i)=>(
                <div key={s.name} style={{ display:"flex", alignItems:"center", gap:16, background:"#0d1122", border:"1px solid #2a3154", borderRadius:16, padding:"14px 20px" }}>
                  <span style={{ fontSize:30, width:44, textAlign:"center" }}>{medals[i]}</span>
                  <Avatar cfg={s.avatar} size={48} />
                  <span style={{ flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:800, fontSize:"clamp(15px, 3.5vw, 22px)", color:"#e8ebfa" }}>{s.name}</span>
                  <span style={{ color:"#fbbf24", fontWeight:900, fontSize:"clamp(16px, 4vw, 24px)", whiteSpace:"nowrap" }}>{s.nyxPoints||0} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
          <div className="telao-card" style={{ background:"linear-gradient(180deg,#181d38,#131730)", borderRadius:24, border:"1px solid #2c3358", padding:32 }}>
            <h2 style={{ margin:"0 0 16px", fontSize:"clamp(19px, 4.5vw, 24px)", color:"#7c83ff" }}>🎯 Meta da turma</h2>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, color:"#c7cfee", marginBottom:8 }}>
              <span>Nível {g.level}</span>
              <span>{sum}{g.next?`/${g.next}`:""} pts</span>
            </div>
            <div className="bar-glow" style={{ background:"#0d1122", border:"1px solid #2a3154", borderRadius:20, height:22, overflow:"hidden" }}>
              <div style={{ width:`${g.pct}%`, height:"100%", background:"linear-gradient(90deg,#7c83ff,#22d3ee)", transition:"width .6s ease" }} />
            </div>
          </div>
          <div className="telao-card" style={{ background:"linear-gradient(180deg,#181d38,#131730)", borderRadius:24, border:"1px solid #2c3358", padding:32, flex:1 }}>
            <h2 style={{ margin:"0 0 16px", fontSize:"clamp(19px, 4.5vw, 24px)", color:"#fbbf24" }}>⚡ Combos da turma</h2>
            {combo5.length===0 && combo8.length===0 ? <p style={{ color:"#5d679c", fontSize:16 }}>Ninguém acertou uma sequência de questões ainda.</p> : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {combo8.map(s => (
                  <div key={"c8-"+s.name} style={{ display:"flex", alignItems:"center", gap:10, fontSize:"clamp(14px, 3.5vw, 18px)", flexWrap:"wrap" }}>
                    <span style={{ fontSize:22 }}>🚀</span><b style={{ color:"#e8ebfa" }}>{s.name}</b><span style={{ color:"#96a0cc" }}>— Combo Insano (8 seguidas)</span>
                  </div>
                ))}
                {combo5.map(s => (
                  <div key={"c5-"+s.name} style={{ display:"flex", alignItems:"center", gap:10, fontSize:"clamp(14px, 3.5vw, 18px)", flexWrap:"wrap" }}>
                    <span style={{ fontSize:22 }}>⚡</span><b style={{ color:"#e8ebfa" }}>{s.name}</b><span style={{ color:"#96a0cc" }}>— Combo Elétrico (5 seguidas)</span>
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
  const ACCENTS = ["#7c83ff","#34d399","#fbbf24","#06b6d4","#ec4899","#8b5cf6","#f87171"];
  if (!structured) return <pre style={{ whiteSpace:"pre-wrap", fontFamily:"inherit", fontSize:14, lineHeight:1.9, color:"#c7cfee", margin:0 }}>{typeof sum==="string" ? sum : (sum && sum.raw) || "(resumo indisponível)"}</pre>;
  return (
    <div>
      {sum.intro && <p style={{ color:"#c7cfee", fontSize:14.5, lineHeight:1.7, margin:"0 0 14px" }}>{sum.intro}</p>}
      {sum.secoes.map((s,i)=>{
        const c = ACCENTS[i % ACCENTS.length];
        return (
          <div key={i} style={{ background:"#151a31", borderRadius:14, padding:16, margin:"0 0 12px", border:"1px solid #2a3154", borderLeft:`5px solid ${c}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:38, height:38, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{s.emoji || "📌"}</span>
              <h3 style={{ color:"#e8ebfa", fontSize:15.5, margin:0 }}>{s.titulo}</h3>
            </div>
            {s.explicacao && <p style={{ color:"#c7cfee", fontSize:14, lineHeight:1.7, margin:"0 0 4px" }}>{s.explicacao}</p>}
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

// ════════════════════════════════════════════════════════════════════════════
//  ⌨️ TUTORIAL DE TECLADO (ABNT2 — réplica do notebook Lenovo da carreta)
//  Desenhado tecla por tecla a partir da FOTO do teclado real enviada pelo
//  professor: mesmas posições, mesmos símbolos nas mesmas teclas — assim o aluno
//  acha no computador exatamente o que vê brilhando na tela. A validação usa o
//  que o navegador reporta do teclado físico, então acompanha o layout de verdade.
// ════════════════════════════════════════════════════════════════════════════
// cada tecla: id (pro destaque), rótulo (com \n vira duas linhas, como as setinhas do Tab),
// símbolo do Shift (canto de cima à esquerda), largura, símbolo do Alt Gr (canto de baixo à
// direita, tipo ¹ ² ³ £ ª º °) e altura — tudo copiado da foto do notebook, tecla por tecla
const kbKey = (id, label, shiftSym, w, altSym, h) => ({ id, label: label ?? id, shiftSym: shiftSym || null, altSym: altSym || null, w: w || 34, h: h || 34 });
const KB_FN_ROW = [
  kbKey("Esc","Esc",null,42,null,20), ...Array.from({ length: 12 }, (_, i) => kbKey(`F${i+1}`,`F${i+1}`,null,34,null,20)),
  kbKey("Insert","Insert",null,42,null,20), kbKey("PrtSc","PrtSc",null,42,null,20), kbKey("Delete","Delete",null,46,null,20),
];
const KB_ROWS = [
  [ kbKey("'", "'", '"'), kbKey("1","1","!",34,"¹"), kbKey("2","2","@",34,"²"), kbKey("3","3","#",34,"³"), kbKey("4","4","$",34,"£"), kbKey("5","5","%",34,"¢"), kbKey("6","6","¨",34,"¬"), kbKey("7","7","&"), kbKey("8","8","*"), kbKey("9","9","("), kbKey("0","0",")"), kbKey("-","-","_"), kbKey("=","=","+",34,"§"), kbKey("Backspace","⌫",null,56) ],
  [ kbKey("Tab","⇤\n⇥",null,50), kbKey("Q"), kbKey("W"), kbKey("E"), kbKey("R"), kbKey("T"), kbKey("Y"), kbKey("U"), kbKey("I"), kbKey("O"), kbKey("P"), kbKey("´","´","`"), kbKey("[","[","{",34,"ª") ],
  [ kbKey("CapsLock","CapsLk",null,50), kbKey("A"), kbKey("S"), kbKey("D"), kbKey("F"), kbKey("G"), kbKey("H"), kbKey("J"), kbKey("K"), kbKey("L"), kbKey("Ç"), kbKey("~","~","^"), kbKey("]","]","}",34,"º") ],
  [ kbKey("ShiftL","⇧",null,48), kbKey("\\","\\","|"), kbKey("Z"), kbKey("X"), kbKey("C"), kbKey("V"), kbKey("B"), kbKey("N"), kbKey("M"), kbKey(",",",","<"), kbKey(".",".",">"), kbKey(";",";",":"), kbKey("ShiftR","⇧",null,88) ],
  [ kbKey("Ctrl","Ctrl",null,44), kbKey("Fn","Fn"), kbKey("Win","⊞"), kbKey("Alt","Alt"), kbKey("Space","",null,176), kbKey("AltGr","AltGr",null,48), kbKey("/","/","?",34,"°") ],
];
// qual tecla física (+ modificador) produz cada símbolo no teclado da carreta (ABNT2)
const SYMBOL_KEYCAP = {
  "(": { key: "9", mod: "shift" },
  ")": { key: "0", mod: "shift" },
  "[": { key: "[", mod: null },
  "]": { key: "]", mod: null },
  "{": { key: "[", mod: "shift" },
  "}": { key: "]", mod: "shift" },
  '"': { key: "'", mod: "shift" },
  ";": { key: ";", mod: null },
  "_": { key: "-", mod: "shift" },
  "=": { key: "=", mod: null },
  ".": { key: ".", mod: null },
  ",": { key: ",", mod: null },
  "<": { key: ",", mod: "shift" },
  ">": { key: ".", mod: "shift" },
  // operadores e símbolos de conta (nível "Operadores e contas")
  "+": { key: "=", mod: "shift" },
  "*": { key: "8", mod: "shift" },
  "/": { key: "/", mod: null },
  "%": { key: "5", mod: "shift" },
  "!": { key: "1", mod: "shift" },
  "?": { key: "/", mod: "shift" },
  ":": { key: ";", mod: "shift" },
  "'": { key: "'", mod: null },
  "\\": { key: "\\", mod: null },
  "&": { key: "7", mod: "shift" },
  "@": { key: "2", mod: "shift" },
  "$": { key: "4", mod: "shift" },
};
// nome falado/escrito de cada tecla — pra quem não conhece o nome do símbolo saber do que se trata
const KEY_NAMES = {
  "[": "colchete", "]": "colchete", "{": "chave", "}": "chave",
  "(": "parêntese", ")": "parêntese", '"': "aspas", "'": "apóstrofo",
  ";": "ponto e vírgula", "_": "traço baixo (underline)", "-": "hífen",
  "=": "igual", ".": "ponto", ",": "vírgula", "<": "menor que", ">": "maior que",
  "9": "nove", "0": "zero", "/": "barra", "\\": "barra invertida",
  "´": "acento agudo", "~": "til", "ç": "cê-cedilha",
  "+": "mais", "*": "asterisco", "%": "porcentagem", "!": "exclamação",
  "?": "interrogação", ":": "dois pontos", "&": "e comercial", "@": "arroba", "$": "cifrão",
  "1": "um", "2": "dois", "4": "quatro", "5": "cinco", "7": "sete", "8": "oito",
};
const keyName = (k) => KEY_NAMES[k] ? `${KEY_NAMES[k]} (${k})` : k;
function comboLabel(sym) {
  const c = SYMBOL_KEYCAP[sym];
  if (!c) return `Aperte a tecla ${keyName(sym)}`;
  if (c.mod === "shift") return `Segure Shift e aperte a tecla ${keyName(c.key)}`;
  if (c.mod === "altgr") return `Segure Alt Gr (à direita da barra de espaço) e aperte a tecla ${keyName(c.key)}`;
  return `Aperte a tecla ${keyName(c.key)} (sem precisar de mais nada)`;
}
const KEYBOARD_LEVELS = [
  { id:1, title:"Letras e números", targets: "abcdefghijklmnopqrstuvwxyz0123456789".split("").map(char => ({ char })) },
  { id:2, title:"Espaço, Enter e companhia", targets: [
    { char:" ",          special:true, display:"espaço",       hint:"A barra comprida embaixo — separa as palavras",                     speakText:"Aperte a barra de espaço, aquela tecla comprida embaixo. Ela separa as palavras." },
    { char:"Enter",      special:true, display:"Enter ⏎",      hint:"Pula pra linha de baixo — no código usamos o tempo todo",           speakText:"Aperte a tecla Enter, à direita. Ela pula para a linha de baixo. No código, a gente usa o Enter o tempo todo." },
    { char:"Backspace",  special:true, display:"⌫ Backspace",  hint:"Apaga a última coisa que você digitou",                             speakText:"Aperte a tecla Backspace, lá no canto de cima, à direita. Ela apaga a última coisa que você digitou." },
    { char:"Tab",        special:true, display:"Tab ⇆",        hint:"Empurra o código pra dentro — deixa tudo organizado (indentação)",  speakText:"Aperte a tecla Tab, à esquerda, em cima do Caps Lock. Ela empurra o código para dentro, deixando tudo organizado." },
    { char:"ArrowLeft",  special:true, display:"←",            hint:"As setas movem o cursor sem apagar nada",                           speakText:"Agora as setas, embaixo à direita. Aperte a seta para a esquerda. As setas movem o cursor pelo texto sem apagar nada." },
    { char:"ArrowRight", special:true, display:"→",            hint:"Move o cursor pra direita",                                         speakText:"Aperte a seta para a direita." },
    { char:"ArrowUp",    special:true, display:"↑",            hint:"Sobe uma linha no código",                                          speakText:"Aperte a seta para cima, ela sobe uma linha." },
    { char:"ArrowDown",  special:true, display:"↓",            hint:"Desce uma linha no código",                                         speakText:"E aperte a seta para baixo, ela desce uma linha." },
  ] },
  { id:3, title:"Shift (maiúsculas)", targets: "NYXCODAR".split("").map(char => ({ char, shift:true })) },
  { id:4, title:"Ctrl (atalhos mágicos)", targets: [
    { char:"c", ctrl:true, label:"Ctrl + C, copiar" },
    { char:"v", ctrl:true, label:"Ctrl + V, colar" },
    { char:"z", ctrl:true, label:"Ctrl + Z, desfazer" },
    { char:"a", ctrl:true, label:"Ctrl + A, selecionar tudo" },
  ] },
  { id:5, title:"Símbolos de programação", targets: ["(",")","[","]","{","}",'"',";","_","=",".",",","<",">"].map(char => ({ char, symbol:true })) },
  { id:6, title:"Operadores e contas", targets: ["+","*","/","%","!","?",":","'","\\","&","@","$"].map(char => ({ char, symbol:true })) },
  { id:7, title:"Acentos do português", targets: [
    { char:"ç", accent:true, keys:["Ç"],     display:"ç", hint:"Aperte a tecla Ç — ela fica ao lado do L",                                        speakText:"Aperte a tecla cê-cedilha. Ela fica ao lado da letra L." },
    { char:"á", accent:true, keys:["´","A"], display:"á", hint:"Aperte o acento agudo (ao lado do P) e DEPOIS a letra A",                          speakText:"Para escrever o A com acento agudo, aperte primeiro o acento agudo, ao lado do P, e depois aperte a letra A." },
    { char:"ã", accent:true, keys:["~","A"], display:"ã", hint:"Aperte o til (ao lado do Ç) e DEPOIS a letra A",                                   speakText:"Para escrever o A com til, aperte primeiro o til, ao lado do cê-cedilha, e depois aperte a letra A." },
  ] },
  { id:8, title:"Teste final", line: 'int x = 10;\nif (x > 5) { Console.WriteLine("Oi!"); }' },
];
// versão simplificada pro Modo Guiado (dificuldade de leitura/escrita/motora): só os níveis sem
// combinação de teclas difícil (fora o Shift, que é bem comum) — sem atalhos de Ctrl, símbolos,
// acentos com tecla morta nem o teste final de digitar uma linha inteira — e treina em loop, sem "fim"
const KEYBOARD_LEVELS_EASY = KEYBOARD_LEVELS.filter(l => l.id <= 3);
function MiniKeyboard({ highlight, zoom = 1 }) {
  // a(s) tecla(s) principais E o(s) modificador(es) brilham juntos — é isso que precisa ser apertado
  // (keys é uma lista pra combinações em sequência, tipo acento agudo + letra A)
  const isActive = (k) => {
    if (!highlight) return false;
    const mods = highlight.mods || [];
    if (k.id === "ShiftL" || k.id === "ShiftR") return mods.includes("shift");
    if (k.id === "Ctrl") return mods.includes("ctrl");
    if (k.id === "AltGr") return mods.includes("altgr");
    return (highlight.keys || []).includes(k.id);
  };
  const keyStyle = (active, w, h) => ({
    position:"relative", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minWidth: w, height: h || 34, padding:"0 4px", boxSizing:"border-box",
    background: active ? "linear-gradient(180deg,#fbbf24,#f59310)" : "linear-gradient(180deg,#2a3154,#1c2140)",
    border:`1px solid ${active?"#fbbf24":"#3a4270"}`, borderRadius:6, color: active?"#1c1400":"#c7cfee",
    fontWeight:800, fontSize:12, fontFamily:"monospace", lineHeight:1.1, boxShadow: active ? "0 0 14px #fbbf2488" : "0 2px 0 #10142866",
    animation: active ? "nyx-shake 0.9s ease-in-out infinite" : "none", transition:"background .15s",
  });
  // legendas nos mesmos cantos das teclas físicas: Shift em cima à esquerda, base embaixo à
  // esquerda, Alt Gr embaixo à direita; letras sozinhas ficam no alto à esquerda, como no Lenovo
  const renderKey = (k, hOverride) => {
    const active = isActive(k);
    const h = hOverride || k.h;
    const iconOnly = ["⌫","↵","⇧","⊞"].includes(k.label);
    const lines = String(k.label).split("\n");
    return (
      <div key={k.id} style={keyStyle(active, k.w, h)} title={k.shiftSym ? `Shift + ${k.label} = ${k.shiftSym}` : k.id === "Space" ? "barra de espaço" : undefined}>
        {k.shiftSym && <span style={{ position:"absolute", top:2, left:5, fontSize:8.5, color: active ? "#1c1400aa" : "#7d87b8" }}>{k.shiftSym}</span>}
        {k.altSym && <span style={{ position:"absolute", bottom:2, right:4, fontSize:7.5, color: active ? "#1c1400aa" : "#5d679c" }}>{k.altSym}</span>}
        {k.shiftSym
          ? <span style={{ position:"absolute", bottom:2, left:5, fontSize:12 }}>{k.label}</span>
          : lines.length > 1
            ? lines.map((l, i) => <span key={i} style={{ fontSize: l.length <= 1 ? 10 : 7.5 }}>{l}</span>)
            : iconOnly || h <= 20
              ? <span style={{ fontSize: iconOnly ? 14 : 8 }}>{k.label}</span>
              : <span style={{ position:"absolute", top:3, left:6, fontSize: k.label.length > 3 ? 9 : 11.5 }}>{k.label}</span>}
      </div>
    );
  };
  return (
    // "zoom" amplia teclas E letras juntas, mantendo as proporções da réplica — pedido do professor
    // pra enxergar melhor as teclas; em telas menores o tutorial encolhe o teclado sozinho
    <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"center", margin:"14px 0", overflowX:"auto", zoom }}>
      {/* fileira de cima: Esc, F1–F12, Insert, PrtSc, Delete (meia altura, como no notebook) */}
      <div style={{ display:"flex", gap:4 }}>{KB_FN_ROW.map(k => renderKey(k))}</div>
      <div style={{ display:"flex", gap:4 }}>{KB_ROWS[0].map(k => renderKey(k))}</div>
      {/* fileiras do meio lado a lado com o Enter ocupando as DUAS, igual ao Enter em L do Lenovo */}
      <div style={{ display:"flex", gap:4, alignItems:"stretch" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <div style={{ display:"flex", gap:4 }}>{KB_ROWS[1].map(k => renderKey(k))}</div>
          <div style={{ display:"flex", gap:4 }}>{KB_ROWS[2].map(k => renderKey(k))}</div>
        </div>
        {renderKey(kbKey("Enter","↵",null,46), 72)}
      </div>
      <div style={{ display:"flex", gap:4 }}>{KB_ROWS[3].map(k => renderKey(k))}</div>
      {/* última fileira + bloco de setas com Home/End/PgUp/PgDn, igual ao notebook da carreta */}
      <div style={{ display:"flex", gap:4, alignItems:"stretch" }}>
        {KB_ROWS[4].map(k => renderKey(k))}
        {renderKey(kbKey("←","←\nHome",null,38))}
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          {renderKey(kbKey("↑","↑ PgUp",null,42,null,16))}
          {renderKey(kbKey("↓","↓ PgDn",null,42,null,16))}
        </div>
        {renderKey(kbKey("→","→\nEnd",null,38))}
      </div>
    </div>
  );
}
function KeyboardTutorialModal({ onClose, onFinish, speak, stopSpeech, accessMode = false }) {
  const levels = accessMode ? KEYBOARD_LEVELS_EASY : KEYBOARD_LEVELS;
  const [levelIdx, setLevelIdx] = useState(0);
  const [targetIdx, setTargetIdx] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [finalTyped, setFinalTyped] = useState("");
  const [done, setDone] = useState(false);
  const level = levels[levelIdx];
  const target = level.targets ? level.targets[targetIdx] : null;
  // teclado grandão pra enxergar bem as teclas; encolhe sozinho se a janela for estreita
  const vw = useViewportWidth();
  const kbZoom = vw >= 1050 ? 1.4 : vw >= 780 ? 1.05 : 0.85;

  useEffect(() => {
    if (done) return;
    if (level.line) { speak("Última etapa! Digite essa linha de código inteira, prestando atenção em cada tecla, sem colar."); return; }
    if (!target) return;
    let text;
    if (target.speakText) text = target.speakText;
    else if (target.symbol) text = `${comboLabel(target.char)}, para escrever o símbolo ${keyName(target.char)}.`;
    else if (target.ctrl) text = `Segure a tecla Ctrl e, ao mesmo tempo, aperte a tecla ${target.char.toUpperCase()}. Isso é o atalho de ${target.label}.`;
    else if (target.shift) text = `Segure a tecla Shift e, ao mesmo tempo, aperte a tecla ${target.char}, pra sair maiúscula.`;
    else text = `Aperte a tecla ${target.char.toUpperCase()}.`;
    speak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIdx, targetIdx, done]);

  useEffect(() => {
    if (done || level.line) return;
    const onKey = (e) => {
      if (!target) return;
      // com o tutorial aberto, Tab/espaço não devem trocar o foco nem rolar a página
      if (["Tab", " "].includes(e.key)) e.preventDefault();
      // segurar a tecla (repetição automática do teclado) não pode "pular" vários alvos de uma vez
      if (e.repeat) return;
      let ok = false;
      if (target.special) { ok = e.key === target.char; if (ok) e.preventDefault(); }
      else if (target.accent) ok = e.key.toLowerCase() === target.char; // o navegador entrega a letra já composta (´+a → "á")
      else if (target.symbol) ok = e.key === target.char;
      else if (target.ctrl) { ok = e.ctrlKey && e.key.toLowerCase() === target.char.toLowerCase(); if (ok) e.preventDefault(); }
      // compara sem diferenciar maiúscula/minúscula: se o Caps Lock estiver ligado sem o aluno perceber,
      // segurar Shift produz a letra MINÚSCULA (Caps Lock inverte o Shift) — não pode travar o nível por isso
      else if (target.shift) ok = e.shiftKey && e.key.toLowerCase() === target.char.toLowerCase();
      else ok = !e.shiftKey && !e.ctrlKey && e.key.toLowerCase() === target.char.toLowerCase();
      if (ok) {
        playSound("correct");
        if (targetIdx + 1 < level.targets.length) setTargetIdx(i => i + 1);
        else if (levelIdx + 1 < levels.length) { setLevelIdx(l => l + 1); setTargetIdx(0); playSound("levelup"); }
        // chegou no fim do último nível de teclas: no Modo Guiado treina pra sempre, voltando pro
        // começo (senão travava aqui — o alvo final ficava "preso" sem nunca avançar nem terminar);
        // fora do Modo Guiado sempre existe um próximo nível (o "Teste final" com .line), então este
        // caminho não roda, mas fica como rede de segurança caso os níveis mudem
        else if (accessMode) { playSound("levelup"); onFinish(); setLevelIdx(0); setTargetIdx(0); }
        else finishAll();
      } else if (!["Shift","Control","Alt","AltGraph","Meta","Tab","CapsLock","Dead"].includes(e.key)) {
        // "Dead" = tecla de acento esperando a letra (´, ~, ^) — não é erro, é o meio do caminho
        playSound("wrong");
        setWrongFlash(true); setTimeout(() => setWrongFlash(false), 300);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [levelIdx, targetIdx, done, level, target]);

  const finishAll = async () => {
    setDone(true);
    stopSpeech?.();
    playSound("achievement");
    await onFinish();
  };
  const onFinalType = (v) => {
    setFinalTyped(v);
    if (v === level.line) finishAll();
  };

  // qual tecla do desenho corresponde a cada tecla especial (id no KB_ROWS/bloco de setas)
  const SPECIAL_KEYCAP = { " ": "Space", "Enter": "Enter", "Backspace": "Backspace", "Tab": "Tab", "ArrowLeft": "←", "ArrowRight": "→", "ArrowUp": "↑", "ArrowDown": "↓" };
  const highlight = (() => {
    if (!target) return null;
    if (target.special) return { keys: [SPECIAL_KEYCAP[target.char]].filter(Boolean), mods: [] };
    if (target.accent) return { keys: target.keys || [], mods: [] };
    if (target.symbol) { const c = SYMBOL_KEYCAP[target.char]; return c ? { keys: [c.key.toUpperCase()], mods: c.mod ? [c.mod] : [] } : null; }
    if (target.ctrl) return { keys: [target.char.toUpperCase()], mods: ["ctrl"] };
    if (target.shift) return { keys: [target.char.toUpperCase()], mods: ["shift"] };
    return { keys: [target.char.toUpperCase()], mods: [] };
  })();

  const totalTargets = levels.filter(l => l.targets).reduce((n, l) => n + l.targets.length, 0);
  const doneTargets = levels.slice(0, levelIdx).reduce((n, l) => n + (l.targets ? l.targets.length : 0), 0) + targetIdx;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.88)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1200, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:980, width:"100%", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#22d3ee,#7c83ff)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>⌨️ Tutorial de Teclado</h2>
          <button onClick={()=>{ stopSpeech?.(); onClose(); }} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        {accessMode && !done && <p style={{ color:"#a5f3fc", fontSize:12, margin:"0 0 10px", fontWeight:700 }}>🧩 Treino do Modo Guiado — só o essencial, e recomeça sozinho pra treinar à vontade.</p>}
        {done ? (
          <div className="pop" style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:44 }}>🎹</div>
            <p style={{ color:"#e8ebfa", fontWeight:900, fontSize:20, margin:"8px 0 4px" }}>Você é um Mestre do Teclado!</p>
            <p style={{ color:"#96a0cc", fontSize:13 }}>Treine de novo sempre que quiser — o botão continua aqui.</p>
            <button onClick={onClose} style={{ marginTop:14, background:"linear-gradient(135deg,#34d399,#059669)", border:"none", borderRadius:10, color:"#fff", fontWeight:800, padding:"9px 22px", cursor:"pointer", fontSize:14 }}>Fechar</button>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
              {levels.map((l, i) => (
                <span key={l.id} style={{ background: i<levelIdx?"#34d39922":i===levelIdx?"#fbbf2422":"#0d1122", color: i<levelIdx?"#34d399":i===levelIdx?"#fbbf24":"#5d679c", border:`1px solid ${i<levelIdx?"#34d399":i===levelIdx?"#fbbf24":"#2a3154"}`, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:800 }}>
                  {i<levelIdx?"✓ ":""}{l.title}
                </span>
              ))}
            </div>
            {level.line ? (
              <>
                <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 10px" }}>Última etapa! Digite essa linha de código inteira, prestando atenção em cada tecla — sem colar. 💪</p>
                <pre style={{ background:"#1e1e1e", border:"1px solid #3e3e42", borderRadius:10, padding:"12px 14px", fontFamily:"'Courier New',monospace", fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{level.line}</pre>
                <textarea autoFocus value={finalTyped} onChange={e=>onFinalType(e.target.value)} onPaste={e=>e.preventDefault()} spellCheck={false} autoCorrect="off" autoCapitalize="off"
                  style={{ width:"100%", minHeight:70, marginTop:8, background:"#0d1122", border:"2px solid #2a3154", borderRadius:12, padding:"10px 12px", color:"#e8ebfa", fontFamily:"'Courier New',monospace", fontSize:14, outline:"none" }} />
              </>
            ) : target && (
              <>
                <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 4px" }}>{targetIdx}/{level.targets.length} teclas neste nível · <b style={{ color:"#fbbf24" }}>{level.title}</b> ({doneTargets}/{totalTargets} no total)</p>
                <div className="pop" style={{ background: wrongFlash ? "#f8717122" : "#0d1122", border:`1px solid ${wrongFlash?"#f87171":"#2a3154"}`, borderRadius:14, padding:"16px", textAlign:"center", transition:"background .15s" }}>
                  <div style={{ fontSize:38, fontWeight:900, fontFamily:"monospace", color: wrongFlash?"#f87171":"#22d3ee" }}>
                    {target.special || target.accent ? (target.display || target.char) : target.symbol ? target.char : target.ctrl ? `Ctrl + ${target.char.toUpperCase()}` : target.shift ? target.char : target.char.toUpperCase()}
                  </div>
                  <p style={{ color:"#c7cfee", fontSize:13, margin:"6px 0 0" }}>
                    {target.hint ? target.hint : target.symbol ? `${comboLabel(target.char)} — isso escreve ${keyName(target.char)}` : target.ctrl ? `Segure Ctrl e aperte ${target.char.toUpperCase()} ao mesmo tempo — ${target.label}` : target.shift ? `Segure Shift e aperte ${target.char} ao mesmo tempo` : `Aperte essa tecla`}
                  </p>
                </div>
                <MiniKeyboard highlight={highlight} zoom={kbZoom} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

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
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:520, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#f87171,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>😔 Justificar falta</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 14px" }}>Escreva o motivo — o professor vai ver e pode aprovar, virando "justificado" na chamada.</p>
        {frozenAbsences.slice(0, 5).map(d => {
          const [y, m, dd] = d.split("-");
          return (
            <div key={d} style={{ background:"#0d1122", border:"1px solid #2a3154", borderRadius:12, padding:"10px 12px", marginBottom:10 }}>
              <p style={{ color:"#e8ebfa", fontWeight:800, fontSize:13, margin:"0 0 6px" }}>📅 {dd}/{m}/{y}</p>
              {sent[d] ? (
                <p style={{ color:"#34d399", fontSize:12.5, margin:0 }}>✅ Justificativa enviada — aguardando o professor.</p>
              ) : (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <input value={texts[d]||""} onChange={e=>setTexts(t=>({ ...t, [d]: e.target.value }))} onKeyDown={e=>e.key==="Enter"&&send(d)}
                    placeholder="Ex: fui ao médico" style={{ flex:"1 1 180px", background:"#131730", border:"1px solid #2a3154", borderRadius:8, padding:"7px 10px", color:"#e8ebfa", fontSize:13, outline:"none" }} />
                  <button onClick={()=>send(d)} disabled={!(texts[d]||"").trim()} style={{ background:"linear-gradient(135deg,#f87171,#dc2626)", border:"none", borderRadius:8, color:"#fff", fontWeight:800, padding:"7px 14px", fontSize:12.5, cursor:"pointer", opacity:(texts[d]||"").trim()?1:0.5 }}>Enviar</button>
                </div>
              )}
            </div>
          );
        })}
        {frozenAbsences.length > 5 && <p style={{ color:"#5d679c", fontSize:12 }}>+{frozenAbsences.length - 5} outra(s) falta(s) — justifique essas primeiro e depois abra de novo.</p>}
      </div>
    </div>
  );
}

// ── 🏆 hall da fama: mural com uma placa por cidade encerrada ──
function HallOfFameModal({ entries, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:600, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#fbbf24,#fb923c)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🏆 Hall da Fama</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 14px" }}>Quem se destacou nas cidades por onde a carreta já passou. 🚌✨</p>
        {entries.length === 0 ? (
          <p style={{ color:"#5d679c", fontSize:13, textAlign:"center", padding:"20px 0" }}>Ainda não tem nenhuma placa aqui — a próxima cidade encerrada entra pra esse mural!</p>
        ) : (
          [...entries].reverse().map((e, i) => (
            <div key={i} className="pop" style={{ background:"linear-gradient(135deg,#fbbf2414,#fb923c10)", border:"1px solid #fbbf2455", borderRadius:14, padding:"14px 16px", marginBottom:12 }}>
              <p style={{ color:"#fbbf24", fontWeight:900, fontSize:15, margin:"0 0 8px" }}>📍 {e.city || "Cidade sem nome"}</p>
              {(e.students||[]).map((s, j) => (
                <div key={j} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, marginBottom:4 }}>
                  <span>{["🥇","🥈","🥉"][j] || "🏅"}</span>
                  <span style={{ flex:1, color:"#e8ebfa", fontWeight:700 }}>{s.name}</span>
                  <span style={{ color:"#96a0cc", fontSize:12 }}>{s.highlight}</span>
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
function TripOverviewModal({ entries, onClose }) {
  const cities = entries.filter(e => e.totalStudents != null || e.avgScore != null || e.totalClasses != null);
  const totalCidades = entries.length;
  const totalAlunos = cities.reduce((n, e) => n + (e.totalStudents || 0), 0);
  const totalAulas = cities.reduce((n, e) => n + (e.totalClasses || 0), 0);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:680, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#06b6d4,#7c83ff)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📊 Visão da Viagem</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 14px" }}>O que a carreta já fez somando todas as cidades encerradas. 🚌</p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
          <div style={{ flex:"1 1 140px", background:"#0d1122", border:"1px solid #2a3154", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
            <div style={{ color:"#96a0cc", fontSize:11.5 }}>Cidades encerradas</div>
            <div style={{ color:"#e8ebfa", fontWeight:900, fontSize:26 }}>{totalCidades}</div>
          </div>
          <div style={{ flex:"1 1 140px", background:"#0d1122", border:"1px solid #2a3154", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
            <div style={{ color:"#96a0cc", fontSize:11.5 }}>Alunos que passaram</div>
            <div style={{ color:"#e8ebfa", fontWeight:900, fontSize:26 }}>{totalAlunos}</div>
          </div>
          <div style={{ flex:"1 1 140px", background:"#0d1122", border:"1px solid #2a3154", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
            <div style={{ color:"#96a0cc", fontSize:11.5 }}>Aulas dadas</div>
            <div style={{ color:"#e8ebfa", fontWeight:900, fontSize:26 }}>{totalAulas}</div>
          </div>
        </div>
        {cities.length === 0 ? (
          <p style={{ color:"#5d679c", fontSize:13, textAlign:"center", padding:"20px 0" }}>Ainda não tem estatísticas de cidade aqui — elas passam a aparecer a partir da próxima cidade encerrada.</p>
        ) : (
          <div className="cardfx" style={{ background:"#0d1122", border:"1px solid #2a3154", borderRadius:14, padding:14 }}>
            <p style={{ color:"#7c83ff", fontWeight:700, fontSize:13, margin:"0 0 10px" }}>📈 Nota média por cidade</p>
            <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:120, overflowX:"auto", paddingBottom:4, borderBottom:"1px solid #2a3154" }}>
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
                <span key={i} style={{ color:"#5d679c", fontSize:10, minWidth:52, textAlign:"center", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={e.city}>{e.city || "?"}</span>
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
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:600, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#f87171,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🏁 Corrida de Digitação</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 12px" }}>Digite o código abaixo EXATAMENTE igual, o mais rápido que conseguir. O relógio começa na primeira tecla — e colar não vale! 😉</p>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ color:"#fbbf24", fontWeight:900, fontSize:22, fontVariantNumeric:"tabular-nums" }}>⏱ {elapsed.toFixed(1)}s</span>
          <span style={{ color: hasError ? "#f87171" : "#34d399", fontSize:12.5, fontWeight:800 }}>{result ? "🏁 Chegada!" : hasError ? "✗ tem uma letra errada aí!" : `${okLen}/${target.length} caracteres`}</span>
        </div>
        <div className="bar-glow" style={{ background:"#0d1122", border:"1px solid #2a3154", borderRadius:20, height:10, overflow:"hidden", marginBottom:12 }}>
          <div style={{ width:`${(okLen / target.length) * 100}%`, height:"100%", background: hasError ? "#f87171" : "linear-gradient(90deg,#f87171,#fbbf24,#34d399)", transition:"width .15s ease" }} />
        </div>

        <pre style={{ background:"#1e1e1e", border:"1px solid #3e3e42", borderRadius:10, padding:"12px 14px", fontFamily:"'Courier New',monospace", fontSize:15, lineHeight:1.7, margin:"0 0 10px", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
          {target.split("").map((ch, i) => (
            <span key={i} style={{
              color: i < okLen ? "#34d399" : (i < typed.length ? "#0d1122" : "#d4d4d4"),
              background: i < okLen ? "transparent" : (i < typed.length ? "#f87171" : "transparent"),
              borderRadius: 2,
            }}>{ch}</span>
          ))}
        </pre>

        {!result ? (
          <textarea autoFocus value={typed} onChange={e => onType(e.target.value)} onPaste={e => e.preventDefault()} spellCheck={false} autoCorrect="off" autoCapitalize="off"
            placeholder="Digite aqui... o tempo começa na primeira tecla!"
            style={{ width:"100%", minHeight:90, background:"#0d1122", border:`2px solid ${hasError ? "#f87171" : "#2a3154"}`, borderRadius:12, padding:"10px 12px", color:"#e8ebfa", fontFamily:"'Courier New',monospace", fontSize:15, lineHeight:1.7, outline:"none", resize:"vertical" }} />
        ) : (
          <div className="pop" style={{ background:"linear-gradient(135deg,#34d39922,#22d3ee22)", border:"1px solid #34d399", borderRadius:14, padding:"16px 18px", textAlign:"center" }}>
            <div style={{ fontSize:38 }}>🏁</div>
            <p style={{ color:"#e8ebfa", fontWeight:900, fontSize:20, margin:"6px 0 2px" }}>{(result.ms / 1000).toFixed(1)} segundos!</p>
            {result.newRecord && <p style={{ color:"#fbbf24", fontWeight:800, fontSize:14, margin:"2px 0" }}>🌟 NOVO RECORDE PESSOAL!</p>}
            <p style={{ color:"#96a0cc", fontSize:13, margin:"4px 0 0" }}>{result.reward > 0 ? `+${result.reward} ponto${result.reward>1?"s":""} do Nyx pra você!` : "Pontos da corrida já garantidos hoje — mas o recorde continua valendo!"}</p>
            <button onClick={onClose} style={{ marginTop:12, background:"linear-gradient(135deg,#34d399,#059669)", border:"none", borderRadius:10, color:"#fff", fontWeight:800, padding:"9px 22px", cursor:"pointer", fontSize:14 }}>Fechar</button>
          </div>
        )}

        <div style={{ marginTop:14, borderTop:"1px solid #2a3154", paddingTop:10 }}>
          <p style={{ color:"#fbbf24", fontSize:12.5, fontWeight:800, margin:"0 0 8px" }}>🏆 Pilotos mais rápidos da turma</p>
          {top === null ? <p style={{ color:"#5d679c", fontSize:12 }}>Carregando pódio...</p>
            : top.length === 0 ? <p style={{ color:"#5d679c", fontSize:12 }}>Ninguém correu ainda — seja o primeiro do pódio!</p>
            : top.map((s, i) => (
              <div key={s.name} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, marginBottom:4 }}>
                <span>{medals[i]}</span>
                <span style={{ flex:1, color:"#e8ebfa", fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</span>
                <span style={{ color:"#34d399", fontWeight:800, fontVariantNumeric:"tabular-nums" }}>{(s.typingBest.ms / 1000).toFixed(1)}s</span>
              </div>
            ))}
        </div>
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
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:640, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#34d399,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📒 Caderno de resumos</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 14px" }}>Todos os resumos das suas aulas, guardados por dia. Ótimo para revisar antes da prova!</p>
        {dates.length === 0 ? (
          <p style={{ color:"#5d679c", fontSize:13 }}>Nenhum resumo guardado ainda — eles aparecem aqui quando você salva e finaliza uma aula.</p>
        ) : (
          <>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {dates.map(d => (
                <button key={d} onClick={()=>{ setSel(d); setView("simples"); }}
                  style={{ background: sel===d ? "#34d399" : "#0d1122", color: sel===d ? "#03301f" : "#96a0cc", border:`1px solid ${sel===d?"#34d399":"#2a3154"}`, borderRadius:10, padding:"6px 12px", cursor:"pointer", fontWeight:800, fontSize:12.5 }}>
                  📅 {fmt(d)}
                </button>
              ))}
            </div>
            {hasDetailed && (
              <div style={{ display:"flex", gap:6, marginBottom:14 }}>
                <button onClick={()=>setView("simples")} style={{ background: view==="simples" ? "#7c83ff" : "#0d1122", color: view==="simples" ? "#fff" : "#96a0cc", border:`1px solid ${view==="simples"?"#7c83ff":"#2a3154"}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", fontWeight:800, fontSize:11.5 }}>🌱 Simples</button>
                <button onClick={()=>setView("detalhado")} style={{ background: view==="detalhado" ? "#7c83ff" : "#0d1122", color: view==="detalhado" ? "#fff" : "#96a0cc", border:`1px solid ${view==="detalhado"?"#7c83ff":"#2a3154"}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", fontWeight:800, fontSize:11.5 }}>📖 Detalhado</button>
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
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:640, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#06b6d4,#7c83ff)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📊 Meu Desempenho</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", margin:"10px 0 16px" }}>
          <div style={{ flex:"1 1 100px", background:"#0d1122", border:"1px solid #2a3154", borderRadius:12, padding:"10px 12px", textAlign:"center" }}>
            <div style={{ color:"#96a0cc", fontSize:11 }}>Média geral</div>
            <div style={{ color:"#e8ebfa", fontWeight:900, fontSize:20 }}>{avg ?? "—"}</div>
          </div>
          <div style={{ flex:"1 1 100px", background:"#0d1122", border:"1px solid #2a3154", borderRadius:12, padding:"10px 12px", textAlign:"center" }}>
            <div style={{ color:"#96a0cc", fontSize:11 }}>Atividades feitas</div>
            <div style={{ color:"#e8ebfa", fontWeight:900, fontSize:20 }}>{entries.length}</div>
          </div>
          <div style={{ flex:"1 1 100px", background:"#0d1122", border:"1px solid #2a3154", borderRadius:12, padding:"10px 12px", textAlign:"center" }}>
            <div style={{ color:"#96a0cc", fontSize:11 }}>Conquistas</div>
            <div style={{ color:"#e8ebfa", fontWeight:900, fontSize:20 }}>{achievements?.length || 0}</div>
          </div>
          {streakCount >= 2 && (
            <div style={{ flex:"1 1 100px", background:"#0d1122", border:"1px solid #2a3154", borderRadius:12, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ color:"#96a0cc", fontSize:11 }}>Sequência 🔥</div>
              <div style={{ color:"#e8ebfa", fontWeight:900, fontSize:20 }}>{streakCount}</div>
            </div>
          )}
        </div>
        {entries.length > 0 ? (
          <div className="cardfx" style={{ background:"#0d1122", border:"1px solid #2a3154", borderRadius:14, padding:14, marginBottom:14 }}>
            <p style={{ color:"#7c83ff", fontWeight:700, fontSize:13, margin:"0 0 10px" }}>📈 Notas ao longo do tempo</p>
            <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120, overflowX:"auto", paddingBottom:4, borderBottom:"1px solid #2a3154" }}>
              {entries.slice(-14).map(([d, n]) => {
                const g = gradeInfo(n);
                return (
                  <div key={d} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, minWidth:38 }}>
                    <span style={{ color:g.color, fontSize:11, fontWeight:800 }}>{n}</span>
                    <div style={{ width:24, height:Math.max(4, Math.round(n * 0.9)), background:`linear-gradient(180deg, ${g.color}, ${shade(g.color, -0.3)})`, borderRadius:"5px 5px 2px 2px" }} title={`${fmt(d)}: ${n} pts`} />
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:6 }}>
              {entries.slice(-14).map(([d]) => (
                <span key={d} style={{ color:"#5d679c", fontSize:10, minWidth:38, textAlign:"center" }}>{fmt(d)}</span>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ color:"#5d679c", fontSize:13, textAlign:"center", padding:"16px 0" }}>Ainda não tem nenhuma atividade concluída — assim que você terminar a primeira, o gráfico aparece aqui!</p>
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
    color: ["#7c83ff","#22d3ee","#34d399","#fbbf24","#ec4899","#f87171"][i % 6],
    rot: Math.random() * 360,
  })), []);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1400, pointerEvents:"none", overflow:"hidden" }}>
      <style>{`@keyframes confete-cai { 0% { transform: translateY(-4vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(106vh) rotate(720deg); opacity: 0.8; } }`}</style>
      {pieces.map((p, i) => (
        <div key={i} style={{ position:"absolute", top:0, left:`${p.left}%`, width:p.size, height:p.size*0.6, background:p.color, borderRadius:2, transform:`rotate(${p.rot}deg)`, animation:`confete-cai ${p.dur}s linear ${p.delay}s both` }} />
      ))}
      <div style={{ position:"absolute", top:"18%", left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,#7c83ff,#22d3ee)", color:"#fff", fontWeight:900, padding:"14px 28px", borderRadius:20, boxShadow:"0 14px 44px rgba(0,0,0,.5)", fontSize:17, textAlign:"center", animation:"rise .4s ease both" }}>
        🎉 A TURMA SUBIU DE NÍVEL! 🎉<br/>
        <span style={{ fontSize:13.5, fontWeight:700, opacity:0.95 }}>Meta coletiva: nível {level} alcançado — parabéns a todos!</span>
      </div>
    </div>
  );
}

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

function DuelModal({ shift, myName, myAvatar, onAward, onWin, onClose }) {
  const [loading, setLoading] = useState(true);
  const [opponents, setOpponents] = useState([]);
  const [duel, setDuelState] = useState(null);
  const [myAnswers, setMyAnswers] = useState({});
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const lastDuelKey = useRef(null);

  const refresh = async () => {
    try {
      const all = await listStudents();
      const online = all.filter(s => (s.shift||"sem-turno")===(shift||"sem-turno") && s.name!==myName && s.lastSeen && (Date.now()-s.lastSeen)<9000);
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
    const iv = setInterval(refresh, 2500);
    return () => clearInterval(iv);
  }, [shift, myName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const key = duel ? `${duel.from}__${duel.to}__${duel.createdAt}` : null;
    if (key !== lastDuelKey.current) { setMyAnswers({}); lastDuelKey.current = key; }
  }, [duel]);

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
    if (bothDone) {
      const myScore = isChallenger ? merged.scoreFrom : merged.scoreTo;
      const oppScore = isChallenger ? merged.scoreTo : merged.scoreFrom;
      const isDraw = myScore === oppScore;
      const iWon = myScore > oppScore;
      onAward(isDraw ? 2 : (iWon ? 3 : 1));
      if (iWon) onWin();
    }
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
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:520, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#f87171,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>⚔️ Duelo</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        {loading && <p style={{ color:"#5d679c", fontSize:13 }}>Carregando...</p>}
        {err && <div style={{ background:"#f8717111", border:"1px solid #f87171", borderRadius:10, padding:10, color:"#f87171", fontSize:13, marginBottom:10 }}>{err}</div>}

        {!loading && view === "list" && (
          <>
            <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 14px" }}>Desafie um colega online da sua turma para um mini-quiz de 5 perguntas. Quem acertar mais, ganha!</p>
            {opponents.length === 0 ? (
              <p style={{ color:"#5d679c", fontSize:13 }}>Nenhum colega online agora. Tente de novo daqui a pouco.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {opponents.map(o => (
                  <button key={o.name} disabled={creating} onClick={()=>challenge(o)} style={{ display:"flex", alignItems:"center", gap:10, background:"#0d1122", border:"2px solid #2a3154", borderRadius:12, padding:"8px 12px", cursor:"pointer", color:"#e8ebfa", textAlign:"left" }}>
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
            <p style={{ color:"#e8ebfa", fontSize:15, fontWeight:700, marginTop:10 }}>Esperando {opponentName} aceitar...</p>
            <button onClick={cancelOrDecline} style={{ background:"#2a3154", color:"#e8ebfa", border:"none", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:700, fontSize:13, marginTop:10 }}>Cancelar desafio</button>
          </div>
        )}

        {view === "incoming" && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <Avatar cfg={opponentAvatar} size={64} />
            <p style={{ color:"#e8ebfa", fontSize:15, marginTop:10 }}><b>{opponentName}</b> te desafiou para um duelo de 5 perguntas!</p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:14 }}>
              <button onClick={accept} style={{ background:"linear-gradient(135deg,#34d399,#16a34a)", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontWeight:800, fontSize:14 }}>✅ Aceitar</button>
              <button onClick={cancelOrDecline} style={{ background:"#2a3154", color:"#e8ebfa", border:"none", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontWeight:700, fontSize:14 }}>Recusar</button>
            </div>
          </div>
        )}

        {view === "playing" && (
          <div>
            <p style={{ color:"#96a0cc", fontSize:13, marginBottom:10 }}>Duelo contra <b style={{ color:"#e8ebfa" }}>{opponentName}</b> — responda as 5 perguntas:</p>
            {(duel.questions||[]).map((q,i)=>(
              <div key={i} style={{ background:"#0d1122", border:"1px solid #2a3154", borderRadius:12, padding:12, marginBottom:8 }}>
                <p style={{ color:"#e8ebfa", fontWeight:700, fontSize:13.5, marginBottom:8 }}>{i+1}. {q.q}</p>
                {q.opts.map((opt,j)=>(
                  <button key={j} onClick={()=>setMyAnswers(a=>({...a,[i]:j}))}
                    style={{ display:"block", width:"100%", textAlign:"left", background:myAnswers[i]===j?"#7c83ff33":"#131730", border:`2px solid ${myAnswers[i]===j?"#7c83ff":"#272e52"}`, borderRadius:8, padding:"8px 12px", marginBottom:6, color:"#e8ebfa", cursor:"pointer", fontSize:13 }}>
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
            <p style={{ color:"#e8ebfa", fontSize:15, marginTop:10 }}>Você já respondeu! Esperando <b>{opponentName}</b> terminar...</p>
          </div>
        )}

        {view === "result" && (
          <div style={{ textAlign:"center", padding:"10px 0" }}>
            <div style={{ fontSize:48 }}>{myScore > oppScore ? "🏆" : myScore === oppScore ? "🤝" : "💪"}</div>
            <h3 style={{ color: myScore > oppScore ? "#34d399" : myScore === oppScore ? "#fbbf24" : "#f87171", fontSize:20, margin:"6px 0" }}>
              {myScore > oppScore ? "Você venceu!" : myScore === oppScore ? "Empate!" : "Você perdeu dessa vez"}
            </h3>
            <p style={{ color:"#96a0cc", fontSize:14 }}>Você: {myScore}/5 · {opponentName}: {oppScore}/5</p>
            <p style={{ color:"#fbbf24", fontSize:13, marginTop:6 }}>+{myScore===oppScore?2:(myScore>oppScore?3:1)} pontos do Nyx</p>
            <button onClick={closeResult} style={{ background:"linear-gradient(135deg,#7c83ff,#5a61e8)", color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontWeight:800, fontSize:14, width:"100%", marginTop:14 }}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  IA + util
// ════════════════════════════════════════════════════════════════════════════
async function askClaude(prompt, system, opts = {}){
  try {
    const resp = await fetch("/api/claude", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ prompt, system, ...opts })
    });
    const data = await resp.json();
    if (data.error === 'missing_api_key') {
      const e = new Error('ROBOTKEY_MISSING');
      e.userMsg = data.message || 'ANTHROPIC_API_KEY não configurada no Vercel.';
      throw e;
    }
    if (!resp.ok) throw new Error(data.error || `API ${resp.status}`);
    reportAiHealth(true); // avisa o painel do professor (em qualquer navegador) que o Nyx está respondendo
    return data.content?.map(b=>b.text||"").join("")||"";
  } catch (e) {
    // chave não configurada não é "fora do ar temporariamente" — é config pendente, não reporta como falha
    if (e.message !== 'ROBOTKEY_MISSING') reportAiHealth(false);
    throw e;
  }
}

// extrai JSON mesmo se vier com texto/markdown em volta
function extractJson(text) {
  const cleaned = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(cleaned.slice(a, b + 1)); } catch {} }
  throw new Error("bad_json");
}

// pede JSON à IA com uma segunda tentativa automática se a resposta vier malformada
async function askClaudeJson(prompt, system, opts = {}) {
  try {
    return extractJson(await askClaude(prompt, system, opts));
  } catch (e) {
    if (e.message === "ROBOTKEY_MISSING") throw e;
    return extractJson(await askClaude(
      prompt + "\n\nATENÇÃO: responda SOMENTE o objeto JSON válido, sem nenhum texto antes ou depois.",
      system, opts
    ));
  }
}
// monta o pedido de resumo da aula pro Nyx — "simples" (padrão, frases curtas) ou "detalhado"
// (mais completo, pra quem quer entender o porquê de cada coisa, não só o quê)
function buildSummaryRequest(detail, hasTodayDiff, todayCode, fullCode) {
  const contextPart = hasTodayDiff
    ? `Projeto C# completo de um aluno iniciante (contexto — inclui código de aulas ANTERIORES):\n\`\`\`csharp\n${fullCode}\n\`\`\`\n\nTRECHOS QUE ELE ESCREVEU HOJE, na aula de hoje (extraídos por comparação com o início do dia):\n\`\`\`csharp\n${todayCode}\n\`\`\`\n\nCrie um resumo da AULA DE HOJE: cubra APENAS os conceitos que aparecem nos trechos escritos hoje. NÃO faça seções sobre conceitos que só existem no código das aulas anteriores — o projeto completo é só contexto para você entender os trechos novos.`
    : `Um aluno iniciante de C# escreveu este código na aula de hoje (pode ter mais de um arquivo, todos fazem parte do mesmo projeto):\n\`\`\`csharp\n${fullCode}\n\`\`\`\n\nCrie um resumo da aula`;
  const codeScope = hasTodayDiff ? "código escrito HOJE" : "código dele, olhando TODOS os arquivos";
  if (detail === "detalhado") {
    return {
      prompt: contextPart + ` bem organizado e didático, em português brasileiro CORRETO (sem erros de digitação), para quem está começando agora.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "intro": "1 ou 2 frases curtas e acolhedoras dizendo o que esta aula ensinou, com base no código dele",\n  "secoes": [\n    { "emoji": "um emoji que combine com o conceito", "titulo": "nome curto e claro do conceito (ex: Mostrar texto na tela)", "explicacao": "explicação bem simples, de 1 a 3 frases, do que isso faz e por quê", "exemplo": "um trecho de código C# curto e correto mostrando o uso (use \\n para quebrar linhas)" }\n  ],\n  "dica": "uma dica final curta, útil e motivadora para o aluno"\n}\n\nFaça uma seção (entre 3 e 7) para cada conceito, palavra-chave ou símbolo importante que aparece no ${codeScope} (ex: using, class, static void Main, string, int, Console.WriteLine, Console.ReadLine, ; , { }). Linguagem bem de iniciante. Exemplos curtos, corretos e fáceis de copiar. Garanta JSON válido (aspas escapadas corretamente).`,
      system: "Você é um professor de C# paciente e organizado, para iniciantes. Português correto e simples. Responda APENAS JSON puro válido.",
    };
  }
  return {
    prompt: contextPart + ` bem organizado, SIMPLES e didático, em português brasileiro CORRETO (sem erros de digitação), para quem está começando agora.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "intro": "1 frase curta e acolhedora dizendo o que esta aula ensinou, com base no código dele",\n  "secoes": [\n    { "emoji": "um emoji que combine com o conceito", "titulo": "nome curto e claro do conceito (ex: Mostrar texto na tela)", "explicacao": "explicação BEM simples, em NO MÁXIMO 2 frases curtas, do que isso faz — sem jargão técnico, como se explicasse para alguém de 13 anos que nunca programou", "exemplo": "um trecho de código C# BEM curto (1 a 3 linhas) e correto mostrando o uso (use \\n para quebrar linhas)" }\n  ],\n  "dica": "uma dica final curta (1 frase), útil e motivadora para o aluno"\n}\n\nFaça uma seção (entre 3 e 7) para cada conceito, palavra-chave ou símbolo importante que aparece no ${codeScope} (ex: using, class, static void Main, string, int, Console.WriteLine, Console.ReadLine, ; , { }). Frases curtas e diretas, uma ideia por vez. Nada de explicações longas ou com vários porquês encadeados. Exemplos curtos e fáceis de copiar. Garanta JSON válido (aspas escapadas corretamente).`,
    system: "Você é um professor de C# paciente, para iniciantes de 13-14 anos que nunca programaram. Explique tudo do jeito MAIS SIMPLES possível: frases curtas, uma ideia por frase, sem jargão técnico desnecessário e sem explicações longas. Português correto e simples. Responda APENAS JSON puro válido.",
  };
}
// dificuldade adaptativa: olha a média das últimas notas do aluno e devolve uma instrução extra pro
// Nyx pesar a atividade pra mais fácil ou mais desafiadora — null quando não há dado suficiente ainda
// ou quando o desempenho está equilibrado (mantém o mix padrão de sempre)
function recentDifficultyHint(scoreHistory) {
  const dates = Object.keys(scoreHistory || {}).sort((a,b)=>b.localeCompare(a)).slice(0,3);
  if (dates.length < 2) return null;
  const avg = dates.reduce((sum,d)=>sum+scoreHistory[d],0) / dates.length;
  if (avg < 55) return `\n\nATENÇÃO — dificuldade: esse aluno tem tirado notas baixas nas últimas atividades (média recente ${Math.round(avg)}/100). Faça a MAIORIA das questões (uns 6 de 8) BEM diretas e fáceis, um conceito de cada vez, e só 2 um pouco mais desafiadoras — o objetivo é ele ganhar confiança sem travar.`;
  if (avg > 85) return `\n\nATENÇÃO — dificuldade: esse aluno tem tirado notas altas nas últimas atividades (média recente ${Math.round(avg)}/100). Inclua mais questões desafiadoras: peça pra comparar conceitos parecidos, prever a saída exata do código, ou notar pegadinhas sutis — não deixe tão fácil.`;
  return null;
}
function requestFS(){
  if (typeof document === "undefined") return Promise.reject(new Error("no-document"));
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (!req) return Promise.reject(new Error("unsupported"));
  try { const r = req.call(el); return (r && r.then) ? r : Promise.resolve(); }
  catch (e) { return Promise.reject(e); }
}
const goFullscreen = () => { requestFS().catch(()=>{}); };
const todayKey = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
// mesma chave "AAAA-MM-DD", mas a partir de um timestamp qualquer (ex: a data de criação do perfil)
const dateKeyOf = (ts) => { const d = new Date(ts||Date.now()); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

// ── horário automático de aula: converte "HH:MM" em minutos desde a meia-noite (hora do próprio
// aparelho — o mesmo relógio que já é usado pra saber "que dia é hoje" no resto do sistema) ──
function hmToMin(hm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm||"").trim());
  if (!m) return null;
  return (+m[1]) * 60 + (+m[2]);
}
function nowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
// calcula a situação da aula AGORA a partir do horário configurado pro turno — sem horário
// definido (start/end vazios), a aula fica sempre aberta (a trava é 100% opt-in)
function classStatus(sched) {
  const start = hmToMin(sched?.start), end = hmToMin(sched?.end);
  if (start == null || end == null) return { configured:false, open:true, inBreak:false, warnEnd:false };
  const n = nowMin();
  const bStart = hmToMin(sched?.breakStart);
  const bMin = Number(sched?.breakMin) || 0;
  const bEnd = (bStart != null && bMin > 0) ? bStart + bMin : null;
  const inBreak = bStart != null && bEnd != null && n >= bStart && n < bEnd;
  const before = n < start, after = n >= end;
  const minutesToEnd = end - n;
  return {
    configured: true, open: !before && !after, before, after, inBreak,
    minutesToEnd, minutesToBreakEnd: inBreak ? (bEnd - n) : null,
    warnEnd: !before && !after && !inBreak && minutesToEnd > 0 && minutesToEnd <= 5,
  };
}

// ── turnos (matutino / vespertino) ──
const SHIFTS = [
  { id:"matutino",   label:"Matutino",   emoji:"☀️" },
  { id:"vespertino", label:"Vespertino", emoji:"🌙" },
];
// turma de teste — só entra quem sabe a senha; fica fora do SHIFTS para não aparecer nos filtros normais
const TEST_SHIFT = { id:"teste", label:"Teste", emoji:"🧪" };
const TEST_SHIFT_PASSWORD = "T3steSystem";
const shiftMeta  = id => SHIFTS.find(s=>s.id===id) || (id===TEST_SHIFT.id ? TEST_SHIFT : { id:id||"", label:"Sem turno", emoji:"" });
const shiftLabel = id => { const m = shiftMeta(id); return `${m.emoji} ${m.label}`.trim(); };
const isSameDayTs = (ts) => !!ts && new Date(ts).toDateString() === new Date().toDateString();

// conteúdo do dia por turno — aceita o formato antigo (string única) como legado
function contentNameFor(value, shift) {
  if (!value) return "";
  if (typeof value === "string") return value; // legado: mesmo texto pros dois turnos
  return value[shift] || "";
}
function withContentName(contentNames, date, shift, title) {
  const prev = (contentNames || {})[date];
  const prevObj = prev && typeof prev === "object" ? prev : {};
  return { ...(contentNames || {}), [date]: { ...prevObj, [shift]: title } };
}

// verificação local instantânea (sem IA)
function quickCheck(code){
  const c = code
    .replace(/\/\*[\s\S]*?\*\//g, "")      // comentários /* */
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')     // conteúdo de strings
    .replace(/'(?:[^'\\]|\\.)'/g, "''")      // chars como '{'
    .replace(/\/\/.*$/gm, "");               // comentários //
  const count = (ch) => c.split(ch).length - 1;
  const pairs = { "{":"}", "(":")", "[":"]" };
  for (const o of Object.keys(pairs)){
    const cl = pairs[o], co = count(o), cc = count(cl);
    if (co > cc) return { ok:false, message:`Você abriu "${o}" e ainda não fechou com "${cl}". Vá até onde abriu e coloque "${cl}".`, missing:[cl] };
    if (cc > co) return { ok:false, message:`Tem um "${cl}" a mais, sem o "${o}" para combinar. Confira e apague o que sobrou.`, missing:[o] };
  }
  if ((c.match(/"/g)||[]).length % 2 !== 0)
    return { ok:false, message:`Tem uma aspa " aberta e sem fechar. Toda aspa que abre precisa fechar: "seu texto".`, missing:['"'] };
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
//  ALUNO
// ════════════════════════════════════════════════════════════════════════════
function StudentView({ studentName, initialAvatar, shift, onLogout, isNew }) {
  const [showIntro, setShowIntro] = useState(!!isNew);
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
  const [score, setScore] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingProvider, setAnalyzingProvider] = useState(null);
  const lastProviderRef = useRef("nvidia"); // lembra o último modelo escolhido, pra reverificação automática usar o mesmo
  // erros da última análise (linha sublinhada de vermelho até corrigir) + tour do Nyx explicando cada um
  const [codeErrors, setCodeErrors] = useState([]);
  const [showErrorWalkthrough, setShowErrorWalkthrough] = useState(false);
  const [errorWalkStep, setErrorWalkStep] = useState(0);
  const [dynamicSummary, setDynamicSummary] = useState("");
  const [dynamicActivity, setDynamicActivity] = useState(null);
  const [generatingMsg, setGeneratingMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(null);
  const [finalFeedback, setFinalFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [saveWarn, setSaveWarn] = useState("");
  // tema do fundo: 'dark' | 'light' | cor hex escolhida pelo Nyx
  const [theme, setTheme] = useState("dark");
  // tour guiado do Nyx
  const [tourStep, setTourStep] = useState(-1);
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
  // ✋ pedir ajuda: acende o tile do aluno no monitoramento do professor
  const [helpAt, setHelpAt] = useState(null);
  // 👾 chefão da turma ativo (evento do telão) — aqui só aparece o aviso motivador
  const [bossInfo, setBossInfo] = useState(null);
  // 🕐 horário automático de aula (do turno) + vistoria (libera este aluno específico fora do horário)
  const [mySchedule, setMySchedule] = useState({});
  const [myInspection, setMyInspection] = useState(false);
  const [myClassDays, setMyClassDays] = useState([]);
  const [myContentNames, setMyContentNames] = useState({});
  const [streakCount, setStreakCount] = useState(0);
  const [showPerformance, setShowPerformance] = useState(false);
  // ⚠️ erro em produção: avisa o professor sem o aluno precisar reclamar (espelha o pedido de ajuda)
  const [errorAt, setErrorAt] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const lastErrorReportRef = useRef(0);
  // 📋 retomada da aula passada (dispensável; lembrada por dia no navegador)
  const [recapDismissed, setRecapDismissed] = useState(() => {
    try { return localStorage.getItem(`nyx_recap_${todayKey()}`) === "1"; } catch { return false; }
  });
  const [breakEndMsg, setBreakEndMsg] = useState("");
  const breakEndNotifiedRef = useRef(null);
  // 📋 falta a justificar + horário do 1º acesso do dia (pra marcar atrasado na chamada)
  const [justifications, setJustifications] = useState({});
  const attendanceFirstRef = useRef({});
  const createdAtRef = useRef(Date.now());
  const [showJustify, setShowJustify] = useState(false);
  // ⌨️ tutorial de teclado (ABNT2): sempre disponível + pode ser "empurrado" pelo professor
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardDone, setKeyboardDone] = useState(false);
  const kbLaunchSeenRef = useRef(null);
  // 🏆 hall da fama: placas de cidades anteriores
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [hallEntries, setHallEntries] = useState([]);
  // relógio próprio (1x por segundo) só pra a contagem regressiva do intervalo/fim de aula ficar fluida
  const [clockNow, setClockNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setClockNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  // 🔮 previsão do dia (dispensável; lembrada por dia no navegador)
  const [videnteDismissed, setVidenteDismissed] = useState(() => {
    try { return localStorage.getItem(`nyx_vidente_${todayKey()}`) === "1"; } catch { return false; }
  });
  const [kbSuggestDismissed, setKbSuggestDismissed] = useState(() => {
    try { return localStorage.getItem(`nyx_kbsuggest_${todayKey()}`) === "1"; } catch { return false; }
  });
  // 🏁 corrida de digitação
  const [showRace, setShowRace] = useState(false);
  const [typingBest, setTypingBest] = useState(null);
  const [typingRewardDay, setTypingRewardDay] = useState(null);
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
  const [duelWins, setDuelWins] = useState(0);
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
  const calmMode = !!supportFlags.sensorial;
  const focusMode = !!supportFlags.foco;
  const easyRead = !!supportFlags.leitura;
  const ownPace = !!supportFlags.ritmo;
  useEffect(() => { setSoundsCalm(calmMode); return () => setSoundsCalm(false); }, [calmMode]);
  const [guidedBlocks, setGuidedBlocks] = useState([]);
  const [pendingBlock, setPendingBlock] = useState(null);
  // "Nyx te ensina" no Modo Guiado: mini-lições geradas sob demanda (C# explicado com exemplos de jogos)
  const [guidedLessons, setGuidedLessons] = useState([]);
  const [guidedLessonLoading, setGuidedLessonLoading] = useState(false);

  const sessionStart = useRef(Date.now());
  const stateRef = useRef({});
  const attendanceRef = useRef({});
  // "foto" do código no primeiro acesso do dia: o resumo da aula cobre só o que foi escrito DEPOIS dela
  const daySnapshotRef = useRef(null);
  const activeCode = files[active]?.code || "";

  useEffect(() => {
    stateRef.current = { files, code:activeCode, avatar, phase, score, answers, feedback, dynamicActivity, dynamicSummary, finalFeedback, classFeedback: classFb, examReady, examScore, examAnswers, examDone, examExits, examScoreRaw, examAppeal, helpAt, typingBest, typingRewardDay, giftLastClaim, theme, nyxPoints, nyxSpent, nyxOwned, nyxGear, achievements, doneAt, scoreHistory, summaryHistory, detailedSummary, detailedSummaryHistory, duelWins, guidedBlocks, guidedLessons, justifications, keyboardDone, errorAt, errorMsg };
  });

  // se o professor bloquear os duelos com o modal aberto, fecha na hora
  useEffect(() => { if (nyxLocks.zeker && showDuel) setShowDuel(false); }, [nyxLocks.zeker, showDuel]);

  // ── fim do intervalo: sininho + aviso, uma vez só por intervalo (não repete a cada nova checagem) ──
  const classStatusNow = classStatus(mySchedule);
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
    attendanceRef.current = { ...attendanceRef.current, [tk]: didWork ? "present" : "idle" };
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
      helpAt: s.helpAt || null,
      errorAt: s.errorAt || null,
      errorMsg: s.errorMsg || "",
      typingBest: s.typingBest || null,
      typingRewardDay: s.typingRewardDay || null,
      giftLastClaim: s.giftLastClaim || null,
      theme: s.theme || "dark",
      nyxPoints: s.nyxPoints || 0,
      nyxSpent: s.nyxSpent || 0,
      nyxOwned: s.nyxOwned || [],
      nyxGear: s.nyxGear || DEFAULT_NYX_GEAR,
      achievements: s.achievements || [],
      duelWins: s.duelWins || 0,
      doneAt: s.doneAt || null,
      daySnapshot: daySnapshotRef.current || null,
      scoreHistory: s.scoreHistory || {},
      summaryHistory: s.summaryHistory || {},
      detailedSummary: s.detailedSummary || null,
      detailedSummaryHistory: s.detailedSummaryHistory || {},
      guidedBlocks: s.guidedBlocks || [],
      guidedLessons: s.guidedLessons || [],
      ...extra,
    });
    setConnected(ok);
    return ok;
  }, [studentName, shift]);

  // ── anti-cola: durante a prova ativa, cada saída da aba é contada (e desconta 10 pts no fim) ──
  const examActive = examInfo.status === 'active' && !examDone;
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

  // ⌨️ conclui o tutorial de teclado: pontos + conquista, 1x (pode repetir o treino, mas não repontua)
  const finishKeyboardTutorial = async () => {
    if (keyboardDone) return;
    setKeyboardDone(true);
    const np = nyxPoints + 5;
    setNyxPoints(np);
    await persist({ keyboardDone: true, nyxPoints: np });
    unlockAchievement("teclado-mestre");
    checkPointsAchievements(np);
  };

  // ── 🏁 fim da corrida de digitação: pontos 1x por dia (+1 bônus por recorde pessoal) ──
  const finishTypingRace = async (ms) => {
    const today = todayKey();
    const firstToday = typingRewardDay !== today;
    const newRecord = !typingBest || ms < typingBest.ms;
    const reward = (firstToday ? 2 : 0) + (newRecord ? 1 : 0);
    const best = newRecord ? { ms, at: Date.now() } : typingBest;
    if (newRecord) setTypingBest(best);
    if (firstToday) setTypingRewardDay(today);
    if (reward > 0) {
      const np = nyxPoints + reward;
      setNyxPoints(np);
      await persist({ nyxPoints: np, typingBest: best, typingRewardDay: firstToday ? today : typingRewardDay });
      checkPointsAchievements(np);
    } else {
      await persist({ typingBest: best });
    }
    return { reward, newRecord };
  };

  // ── 🎁 abre o presente misterioso do dia (sorteio de raridade) ──
  const openGift = async () => {
    if (giftLastClaim === todayKey()) return;
    const tier = rollGift();
    const np = nyxPoints + tier.pts;
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
          if (Array.isArray(prev.files) && prev.files.length) setFiles(prev.files);
          else if (typeof prev.code === "string") setFiles([{ name:"Program.cs", code:prev.code }]);
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
          if (prev.helpAt) setHelpAt(prev.helpAt);
          if (prev.errorAt) { setErrorAt(prev.errorAt); setErrorMsg(prev.errorMsg || ""); }
          if (prev.typingBest) setTypingBest(prev.typingBest);
          if (prev.typingRewardDay) setTypingRewardDay(prev.typingRewardDay);
          if (prev.giftLastClaim) setGiftLastClaim(prev.giftLastClaim);
          if (prev.theme) setTheme(prev.theme);
          if (prev.nyxPoints) setNyxPoints(prev.nyxPoints);
          if (prev.nyxSpent) setNyxSpent(prev.nyxSpent);
          if (prev.duelWins) setDuelWins(prev.duelWins);
          if (prev.nyxGear) setNyxGear({ ...DEFAULT_NYX_GEAR, ...prev.nyxGear });
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
        }
        // rede de segurança: se um backup local recente tem MAIS código do que o servidor, uma queda de
        // conexão bem na hora de salvar deve ter perdido esse trecho — restaura e resalva pra reconciliar
        try {
          const backup = loadCodeBackupLocal(shift, studentName);
          const backupIsRecent = backup && (Date.now() - backup.at) < 60 * 60 * 1000;
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
        }
        const es = await getExamState();
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
      // prova: busca estado global
      try {
        const es = await getExamState();
        if (es.status === 'done' && !s.examDone) {
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
        } else if (es.status === 'idle' && s.examDone) {
          // professor resetou a prova
          setExamReady(false); setExamScore(null); setExamAnswers({}); setExamDone(false); setExamCurrentQ(0);
          setExamExits(0); setExamScoreRaw(null); setExamAppeal(null);
          try { sessionStorage.removeItem("nyx_exam_open"); } catch {}
          await persist({ examReady: false, examScore: null, examAnswers: {}, examDone: false, examExits: 0, examScoreRaw: null, examAppeal: null });
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
      // 🕐 horário automático da turma + 🔍 vistoria (libera este aluno específico fora do horário)
      try {
        const m = await getTeacherMeta();
        setMySchedule((m.schedule || {})[shift] || {});
        setMyInspection(await getInspection(shift, studentName));
        currentClassDays = m.classDays || [];
        setMyClassDays(currentClassDays);
        setMyContentNames(m.contentNames || {});
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
        } else if (fix && typeof fix.score === "number") {
          setScore(fix.score);
          await clearScoreFix(shift, studentName);
          await persist({ score: fix.score });
        }
      } catch {}
      // professor selecionou este aluno e enviou o código da turma → troca TODOS os arquivos e avisa
      try {
        const sent = await getCodeSend(shift, studentName);
        if (sent && Array.isArray(sent.files) && sent.files.length) {
          setFiles(sent.files);
          setActive(0);
          await clearCodeSend(shift, studentName);
          setRobotMsg("✅ O professor enviou um código novo pra você! Você pode modificar como quiser.");
          setRobotState("ok");
          await persist({ files: sent.files });
          setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 4000);
        }
      } catch {}
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
    const iv = setInterval(tick, 3000);
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

  const analyzeCode = async (provider = lastProviderRef.current) => {
    const trimmed = activeCode.trim();
    if (trimmed.length < 12 || analyzing) return;
    lastProviderRef.current = provider;
    setRobotState("thinking"); setAnalyzing(true); setAnalyzingProvider(provider);
    const quick = quickCheck(activeCode);
    if (quick) {
      const fb = { ok:false, message:quick.message, missingChars:quick.missing||[] };
      setRobotState("error"); setRobotMsg(quick.message); setKeysToShow(quick.missing||[]); setFeedback(fb);
      setCodeErrors([]); setShowErrorWalkthrough(false);
      await persist({ feedback:fb, hasError:true });
      setAnalyzing(false); setAnalyzingProvider(null);
      return;
    }
    try {
      const parsed = await askClaudeJson(
        `Revise o código C# de um aluno iniciante como um COMPILADOR faria, linha por linha.\n\n${otherFilesCtx(files, active)}Arquivo em edição (${files[active]?.name || "Program.cs"}):\n\`\`\`csharp\n${activeCode}\n\`\`\`\n\nO que verificar (nesta ordem):\n1. Maiúsculas/minúsculas: Console.WriteLine, Console.ReadLine, Convert.ToInt32, int.Parse — "console.writeline", "Console.writeline" e "Console.Writeline" estão ERRADOS.\n2. Tipos em minúsculo (regra da turma): string, int, double, bool, char — se usou String/Int32/Double/Boolean, avise para trocar pela forma minúscula.\n3. Ponto e vírgula ; faltando no fim de instruções (declarações, chamadas, atribuições).\n4. Chaves { }, parênteses ( ) e aspas " — conte os pares no arquivo INTEIRO antes de acusar falta.\n5. Palavras-chave erradas (publik, voi, whille, pritn, statics, clas).\n6. Variáveis usadas sem declarar (confira TODAS as linhas anteriores antes de acusar) e comparação com = em vez de ==.\n7. Console.ReadLine lido direto para int/double sem Convert/Parse.\n\nLembretes IMPORTANTES:\n- Top-level statements (código sem class/Main) e ausência de using System são VÁLIDOS — não são erro.\n- Não aponte classe/método "inexistente" se estiver definido em outro arquivo do projeto.\n- NÃO invente erro em código correto. Na dúvida real, prefira ok=true.\n\nResponda APENAS em JSON puro, sem markdown, com os campos NESTA ordem:\n{"analise": "sua verificação rápida linha a linha, citando o que conferiu (máx 3 frases — o aluno não vê isto)", "ok": true ou false, "message": "se tudo certo: elogio bem curto; se houver erro: onde está (linha/trecho) e como corrigir mostrando a forma certa, em 1 a 3 frases gentis", "missingChars": ["só símbolos que faltam, ex: ; } ) — vazio se nenhum"], "errors": ["se ok for false: uma lista com CADA erro encontrado (pode ter mais de um). Cada item é um objeto {\\"trecho\\": a linha EXATA e completa como aparece no código, copiada literalmente, sem espaços extras no início; \\"explicacao\\": por que está errado e como corrigir, 1 a 2 frases bem simples e gentis; \\"exemplo\\": a mesma linha já corrigida}. Lista vazia se ok for true."]}`,
        CS_SYSTEM + "\nResponda APENAS JSON puro, sem markdown.",
        { temperature: 0, provider }
      );
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
    } catch(e) {
      if (e.message === 'ROBOTKEY_MISSING') {
        setRobotState("error");
        setRobotMsg(e.userMsg || "🔑 Nyx está offline: o professor precisa configurar a chave da IA no painel do Vercel. A verificação básica do código continua funcionando!");
      } else {
        setRobotState("error");
        setRobotMsg(`😵 Nyx não conseguiu analisar agora com ${provider === "laguna" ? "Laguna" : "Nemotron"}. Tente de novo, ou experimente o outro botão.\n\n🔧 Detalhe técnico (pra mostrar ao Vegapunk): ${e.message || e}`);
      }
    }
    setAnalyzing(false); setAnalyzingProvider(null);
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

  // arquivos
  const updateActiveCode = (newCode) => setFiles(fs => fs.map((f,i)=> i===active ? { ...f, code:newCode } : f));
  const uniqueName = (base, ignoreIdx=-1) => {
    let name = base, n = 2;
    while (files.some((f,i)=> i!==ignoreIdx && f.name.toLowerCase()===name.toLowerCase())) {
      name = base.replace(/\.cs$/i, "") + n + ".cs"; n++;
    }
    return name;
  };
  const addFile = () => {
    const name = uniqueName(`Arquivo${files.length+1}.cs`);
    const newIdx = files.length;
    setFiles(fs => [...fs, { name, code:"" }]);
    setActive(newIdx);
    setRenaming(newIdx);           // já abre para o aluno nomear
    setRenameValue(name.replace(/\.cs$/i, ""));
  };
  const deleteFile = (idx) => {
    if (files.length <= 1) return;
    setFiles(fs => fs.filter((_,i)=>i!==idx));
    setActive(a => (idx<=a ? Math.max(0,a-1) : a));
  };
  const openRename = (idx) => { setRenaming(idx); setRenameValue((files[idx]?.name || "").replace(/\.cs$/i, "")); };
  const confirmRename = () => {
    if (renaming == null) return;
    let base = String(renameValue).trim().replace(/["'\/\\]/g, "");
    if (!base) base = `Arquivo${renaming+1}`;
    let name = /\.cs$/i.test(base) ? base : base + ".cs";
    name = uniqueName(name, renaming);
    const idx = renaming;
    setFiles(fs => fs.map((f,i)=> i===idx ? { ...f, name } : f));
    setRenaming(null); setRenameValue("");
  };
  const cancelRename = () => { setRenaming(null); setRenameValue(""); };

  const setThemeAndSave = (t) => { setTheme(t); persist({ theme: t }); };
  const handleNyxTheme = (t) => { setThemeAndSave(t); if (String(t).startsWith("#")) unlockAchievement("artista"); };

  // desbloqueia as conquistas de pontos acumulados (nyxPoints é o total GANHO, nunca diminui)
  const checkPointsAchievements = (total) => {
    if (total >= 10) unlockAchievement("pontos-10");
    if (total >= 50) unlockAchievement("pontos-50");
    if (total >= 100) unlockAchievement("pontos-100");
    if (total >= 250) unlockAchievement("pontos-250");
  };

  const toggleMuted = () => { setMuted(m => { setSoundsMuted(!m); return !m; }); };

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
    setTimeout(() => setNewAchievement(null), 4000);
  };

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
    const wrong = activity.map((q,i)=>({ q, i })).filter(({ q, i }) => answers[i] !== q.correct);
    if (!wrong.length || explaining) return;
    setExplaining(true);
    setExplainFailMsg("");
    try {
      const list = wrong.map(({ q, i }) => `Pergunta: ${q.q}\nO aluno respondeu: ${q.opts[answers[i]] ?? "(não respondeu)"}\nResposta correta: ${q.opts[q.correct]}`).join("\n\n");
      const parsed = await askClaudeJson(
        `Um aluno iniciante errou estas questões sobre o próprio código C# dele:\n\n${list}\n\nPara CADA questão errada, crie uma seção explicando o conceito de forma simples e gentil: por que a resposta certa é a certa e onde ele provavelmente se confundiu, seguida de um EXEMPLO CURTO de código C# correto que ilustre bem o conceito (pode ser um exemplo didático, não precisa ser do código dele). No final, escreva UMA mensagem curta e encorajadora olhando o desempenho geral dele.\n\nResponda APENAS em JSON puro, sem markdown:\n{"secoes":[{"emoji":"emoji que combine com o conceito","titulo":"nome curto do conceito","explicacao":"1 a 3 frases simples e gentis","exemplo":"código C# curto e correto (use \\n para quebrar linha)"}],"encorajamento":"mensagem final motivadora, 1 a 2 frases"}`,
        CS_SYSTEM + "\nResponda APENAS JSON puro, sem markdown.",
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

  // só o que foi escrito HOJE: compara o código atual com a "foto" tirada no primeiro acesso do dia
  const codeWrittenToday = () => {
    const snapFiles = daySnapshotRef.current?.files || [];
    const oldByName = Object.fromEntries(snapFiles.map(f => [f.name, f.code || ""]));
    return (files || [])
      .map(f => {
        const oldCode = oldByName[f.name];
        if (oldCode == null || !oldCode.trim()) return { name: f.name, code: f.code || "" }; // arquivo novo (ou vazio ontem): tudo é de hoje
        const oldLines = new Set(oldCode.split("\n").map(l => l.trim()).filter(Boolean));
        const newLines = (f.code || "").split("\n").filter(l => l.trim() && !oldLines.has(l.trim()));
        return { name: f.name, code: newLines.join("\n") };
      })
      .filter(f => (f.code || "").trim())
      .map(f => `// ===== ${f.name} =====\n${f.code}`)
      .join("\n\n");
  };

  const handleSave = async () => {
    const fullCode = allCodeToday();
    if (fullCode.trim().length < 10) { setSaveWarn("✏️ Escreva algum código antes de salvar!"); setTimeout(()=>setSaveWarn(""), 4000); return; }
    setAnswers({});
    setDetailedSummary(""); setSummaryView("simples"); setDetailFailMsg(""); // aula nova: zera a versão detalhada da aula anterior
    setPhase("generating");
    setGeneratingMsg("📖 Lendo seu código...");
    await persist({ phase:"generating", answers:{} });
    try {
      setGeneratingMsg("📚 Criando o resumo e a atividade da sua aula...");
      const todayCode = codeWrittenToday();
      const hasTodayDiff = todayCode.trim().length >= 10 && todayCode.trim() !== fullCode.trim();
      const simpleReq = buildSummaryRequest("simples", hasTodayDiff, todayCode, fullCode);
      const difficultyHint = recentDifficultyHint(scoreHistory);
      // resumo e atividade são pedidos ao Nyx AO MESMO TEMPO (não um depois do outro) para não somar o tempo de espera dos dois
      const [summaryResult, activityResult] = await Promise.all([
        askClaude(simpleReq.prompt, simpleReq.system),
        askClaude(
          `Um aluno de C# escreveu este código na aula de hoje (pode ter mais de um arquivo, todos do mesmo projeto):\n\`\`\`csharp\n${fullCode}\n\`\`\`\n\nCrie ${ownPace ? "4" : "8"} questões de múltipla escolha${ownPace ? " BEM diretas e fáceis (uma ideia por questão, frases curtas)" : ""} focadas em CONCEITOS DE CÓDIGO que aparecem no que ele escreveu, olhando TODOS os arquivos: o que faz cada palavra-chave/instrução, para que serve cada estrutura, o papel de cada símbolo, a função de cada tipo de dado, e o que acontece ao executar cada parte. Varie a dificuldade (algumas fáceis, algumas médias). NÃO faça perguntas de matemática.${difficultyHint || ""}\n\nResponda APENAS JSON puro sem markdown:\n{"questions":[{"q":"pergunta","opts":["A","B","C","D"],"correct":0}]}`,
          "Crie questões sobre conceitos de código C#, não matemática. APENAS JSON puro."
        ),
      ]);
      let summaryData;
      try { summaryData = extractJson(summaryResult); }
      catch { summaryData = { raw: summaryResult }; }
      setDynamicSummary(summaryData);
      const parsed = extractJson(activityResult);
      const questions = shuffleQuestions(parsed.questions);
      setDynamicActivity(questions);
      // guarda o resumo de hoje no caderno (para o aluno rever depois)
      const newSummaryHistory = { ...summaryHistory, [todayKey()]: summaryData };
      setSummaryHistory(newSummaryHistory);
      await persist({ phase:"summary", dynamicActivity:questions, dynamicSummary:summaryData, summaryHistory: newSummaryHistory });
      setPhase("summary");
    } catch {
      setGeneratingMsg("❌ Erro ao gerar. Tente novamente.");
      setTimeout(() => { setPhase("coding"); persist({ phase:"coding" }); }, 2500);
    }
  };

  // versão detalhada do resumo, pedida sob demanda (só quando o aluno clica) — gerada uma vez e guardada
  const fetchDetailedSummary = async () => {
    if (detailedSummary) { setSummaryView("detalhado"); return; }
    setDetailLoading(true); setDetailFailMsg("");
    try {
      const fullCode = allCodeToday();
      const todayCode = codeWrittenToday();
      const hasTodayDiff = todayCode.trim().length >= 10 && todayCode.trim() !== fullCode.trim();
      const { prompt, system } = buildSummaryRequest("detalhado", hasTodayDiff, todayCode, fullCode);
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

  const handleStartActivity = async () => { setPhase("activity"); await persist({ phase:"activity" }); };

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
    let pts = 0;
    activity.forEach((q,i)=>{ if(answers[i]===q.correct) pts++; });
    const finalScore = Math.round((pts/activity.length)*100);
    const completedAt = Date.now();
    setScore(finalScore);
    setDoneAt(completedAt);
    setPhase("done");
    setShowFeedbackModal(true);
    setFeedbackLoading(true);
    const newNyxPoints = nyxPoints + pts;
    setNyxPoints(newNyxPoints);
    const newScoreHistory = { ...scoreHistory, [todayKey()]: finalScore };
    setScoreHistory(newScoreHistory);
    await persist({ phase:"done", score:finalScore, answers, nyxPoints: newNyxPoints, doneAt: completedAt, scoreHistory: newScoreHistory });
    checkPointsAchievements(newNyxPoints);
    unlockAchievement("primeira-atividade");
    if (finalScore >= 100) unlockAchievement("nota-cem");
    const doneCount = Object.keys(newScoreHistory).length;
    if (doneCount >= 5) unlockAchievement("atividades-5");
    if (doneCount >= 15) unlockAchievement("atividades-15");
    const hundredCount = Object.values(newScoreHistory).filter(v => v === 100).length;
    if (hundredCount >= 3) unlockAchievement("tres-100");
    const streak = maxCorrectStreak(activity, answers);
    if (streak >= 5) unlockAchievement("combo-5");
    if (streak >= 8) unlockAchievement("combo-8");
    try {
      const list = activity.map((q,i)=>`- ${q.q} → ${answers[i]===q.correct?"acertou":"errou"}`).join("\n");
      const fbData = await askClaudeJson(
        `Um aluno iniciante de C# escreveu este código na aula de hoje:\n\`\`\`csharp\n${allCodeToday()}\n\`\`\`\n\nDepois respondeu uma atividade de ${activity.length} perguntas e acertou ${pts} (nota ${finalScore}).\nResultado pergunta a pergunta:\n${list}\n\nCrie um feedback gentil e motivador para ESTE aluno, baseado no código que ele escreveu E no desempenho.\n\nResponda APENAS em JSON puro, sem markdown:\n{\n  "intro": "1 frase curta e calorosa resumindo como ele foi nesta aula",\n  "secoes": [\n    { "emoji": "emoji que combine", "titulo": "O que você mandou bem (curto)", "explicacao": "1 a 2 frases concretas sobre o que ele acertou, citando o código ou o desempenho dele" },\n    { "emoji": "emoji que combine", "titulo": "Um ponto para melhorar (curto)", "explicacao": "1 a 2 frases gentis sobre um ponto específico a melhorar — se não houver nada relevante a melhorar, foque em um próximo passo desafiador em vez disso" }\n  ],\n  "dica": "se foi bem (nota alta e código sem erros): uma curiosidade ou próximo passo mais avançado para se desafiar. Se teve dificuldade: uma dica simples e prática para o que errou. 1 a 2 frases."\n}\n\nFrases curtas, uma ideia por vez, sem jargão técnico desnecessário, tom acolhedor. Garanta JSON válido.`,
        CS_SYSTEM + "\nResponda APENAS JSON puro válido, sem markdown."
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
    const newAnswers = { ...examAnswers, [qIdx]: optIdx };
    setExamAnswers(newAnswers);
    const qs = examInfo.questions || [];
    // só finaliza quando TODAS as questões têm resposta — os pontinhos de navegação deixam o aluno
    // pular pra qualquer questão fora de ordem, então responder a última da lista primeiro não pode
    // encerrar a prova sozinho contando as anteriores (ainda não vistas) como erradas
    const allAnswered = qs.every((_, i) => newAnswers[i] != null);
    if (!allAnswered) {
      const nextUnanswered = qs.findIndex((_, i) => newAnswers[i] == null);
      setExamCurrentQ(nextUnanswered !== -1 ? nextUnanswered : Math.min(qIdx + 1, qs.length - 1));
      await persist({ examAnswers: newAnswers });
    } else {
      let pts = 0;
      qs.forEach((q, i) => { if (newAnswers[i] === q.correct) pts++; });
      const raw = pts * 10;
      // anti-cola: cada saída da aba desconta 10 pts (o professor pode devolver se o aluno se explicar)
      const exits = stateRef.current.examExits || 0;
      const penalty = Math.min(raw, exits * 10);
      const finalScore = raw - penalty;
      try { sessionStorage.removeItem("nyx_exam_open"); } catch {}
      setExamScore(finalScore); setExamScoreRaw(raw); setExamDone(true);
      const newNyxPoints = nyxPoints + Math.round(finalScore / 10);
      setNyxPoints(newNyxPoints);
      await persist({ examAnswers: newAnswers, examScore: finalScore, examScoreRaw: raw, examExits: exits, examDone: true, nyxPoints: newNyxPoints });
      checkPointsAchievements(newNyxPoints);
      if (qs.length && pts / qs.length >= 0.8) unlockAchievement("prova-mestre");
      if (qs.length && pts === qs.length) unlockAchievement("prova-100");
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
    container:{ minHeight:"100vh", background:pageBgFor(theme), color:"#e8ebfa", fontFamily:FONT, fontSize:`${scaleSize(16)}px` },
    header:{ background:"rgba(17,21,42,.85)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", padding:`${scalePx(10)}px ${scalePx(18)}px`, display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #2a3154", boxShadow:"0 1px 0 #7c83ff33, 0 8px 24px rgba(3,5,16,.35)", position:"sticky", top:0, zIndex:40, flexWrap:"wrap", gap:8 },
    card:{ background:"linear-gradient(180deg,#181d38,#131730)", borderRadius:16, padding:scalePx(16), margin:"10px 0", border:"1px solid #272e52", boxShadow:"0 8px 24px rgba(3,5,16,.35)", animation:"rise .35s ease both" },
    btn:(c)=>({ background:`linear-gradient(135deg, ${c}, ${shade(c,-0.18)})`, color:"#fff", border:"none", borderRadius:10, padding:`${scalePx(10)}px ${scalePx(18)}px`, cursor:"pointer", fontWeight:800, fontSize:scaleSize(14), boxShadow:`0 4px 14px ${c}44` }),
    opt:(sel)=>({ background:sel?"#7c83ff22":"#131730", border:`2px solid ${sel?"#7c83ff":"#272e52"}`, borderRadius:10, padding:`${scalePx(10)}px ${scalePx(14)}px`, marginBottom:8, cursor:"pointer", color:"#e8ebfa", textAlign:"left", width:"100%", fontSize:scaleSize(14), minHeight:scaleSize(44) }),
  };
  const Stars = ({ value, onChange }) => (
    <div style={{ display:"flex", gap:4 }}>
      {[1,2,3,4,5].map(n=>(
        <button key={n} type="button" onClick={()=>onChange(n)} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:26, color:n<=value?"#fbbf24":"#5d679c", padding:0 }}>★</button>
      ))}
    </div>
  );

  if (!loaded) return (<div style={{ ...styles.container, display:"flex", alignItems:"center", justifyContent:"center" }}><p style={{ color:"#96a0cc" }}>Carregando seu perfil...</p></div>);

  // ── ZEK: o professor pediu atenção — o Nyx toma a tela inteira e bloqueia tudo até o /hiberne ──
  if (nyxLocks.zek) return (
    <div style={{ ...styles.container, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"2px solid #f87171", borderRadius:22, padding:"34px 28px", maxWidth:460, width:"100%", textAlign:"center", boxShadow:"0 24px 70px rgba(0,0,0,.6), 0 0 60px #f8717133" }}>
        <div style={{ animation:"nyx-shake .55s ease infinite" }}>
          <NyxRobot state="error" size={120} showName={false} gear={nyxGear} />
        </div>
        <h2 style={{ color:"#f87171", fontSize:24, fontWeight:900, margin:"14px 0 6px" }}>👀 Atenção na aula!</h2>
        <p style={{ color:"#c7cfee", fontSize:15, lineHeight:1.7, margin:0 }}>
          O professor pediu a atenção de todo mundo agora. Olhos no quadro! A tela volta ao normal quando ele liberar.
        </p>
      </div>
    </div>
  );

  // ── HORÁRIO AUTOMÁTICO: fora do horário configurado, a sala fica fechada (a vistoria do professor libera na hora) ──
  if (classStatusNow.configured && !classStatusNow.open && !myInspection) return (
    <div style={{ ...styles.container, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"2px solid #7c83ff", borderRadius:22, padding:"34px 28px", maxWidth:460, width:"100%", textAlign:"center", boxShadow:"0 24px 70px rgba(0,0,0,.6), 0 0 60px #7c83ff22" }}>
        <div style={{ animation:"nyx-float 3s ease-in-out infinite" }}>
          <NyxRobot state="idle" size={110} showName={false} gear={nyxGear} />
        </div>
        <h2 style={{ color:"#7c83ff", fontSize:23, fontWeight:900, margin:"14px 0 6px" }}>{classStatusNow.before ? "⏰ A aula ainda não começou" : "👋 A aula de hoje já encerrou"}</h2>
        <p style={{ color:"#c7cfee", fontSize:15, lineHeight:1.7, margin:0 }}>
          {classStatusNow.before
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
  const supportClass = [calmMode && "calm", easyRead && "easy-read"].filter(Boolean).join(" ") || undefined;
  const showRoutine = accessMode || calmMode || focusMode || easyRead || ownPace;
  // barrinha fixa com os passos do dia: previsibilidade ajuda muito quem é autista/TDAH —
  // o aluno sempre sabe em que passo está e o que vem depois
  const routineBar = showRoutine ? (() => {
    const steps = [["📝","Programar"],["💾","Salvar"],["📚","Resumo"],["🎯","Atividade"]];
    const idx = phase==="coding" ? 0 : phase==="generating" ? 1 : phase==="summary" ? 2 : phase==="activity" ? 3 : 4;
    return (
      <div style={{ position:"fixed", bottom:10, left:"50%", transform:"translateX(-50%)", zIndex:900, background:"rgba(13,17,34,.96)", border:"1px solid #2a3154", borderRadius:20, padding:"7px 14px", display:"flex", gap:8, alignItems:"center", boxShadow:"0 8px 24px rgba(0,0,0,.45)", flexWrap:"wrap", justifyContent:"center", maxWidth:"calc(100vw - 16px)" }}>
        <span style={{ color:"#5d679c", fontSize:11.5, fontWeight:800 }}>Minha aula:</span>
        {steps.map(([emoji, label], i) => (
          <span key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12.5, fontWeight:800, color: i < idx ? "#34d399" : i === idx ? "#e8ebfa" : "#5d679c", background: i === idx ? "#7c83ff33" : "transparent", border: i === idx ? "1px solid #7c83ff" : "1px solid transparent", borderRadius:14, padding:"3px 9px" }}>
            {i < idx ? "✓" : emoji} {label}
          </span>
        ))}
      </div>
    );
  })() : null;

  // ── PROVA: telas de exame têm prioridade ──
  if (examDone) return (
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
          <div style={{ background:"#151a31", border:"1px solid #f87171", borderRadius:14, padding:"14px 16px", marginTop:16, textAlign:"left" }}>
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
            {examAppeal?.status === "rejected" && <p style={{ color:"#96a0cc", fontSize:13, margin:"10px 0 0", fontWeight:700 }}>O professor analisou e manteve o desconto.</p>}
          </div>
        )}
        <p style={{ color:"#96a0cc", marginTop:20, fontSize:14, lineHeight:1.6 }}>Aguarde o professor encerrar a prova para ver o ranking da turma!</p>
      </div>
    </div>
  );

  if (examInfo.status === 'review') return (
    <div className={supportClass} style={styles.container}>
      <div style={styles.header}><span>📝 Revisão — {studentName}</span></div>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"22px 16px 36px" }}>
        <div style={{ background:"linear-gradient(135deg,#7c83ff,#8b5cf6)", borderRadius:18, padding:"24px 22px", textAlign:"center", boxShadow:"0 12px 30px #7c83ff55" }}>
          <div style={{ fontSize:44 }}>📝</div>
          <h1 style={{ color:"#fff", fontSize:24, margin:"8px 0" }}>Hora da Prova!</h1>
          <p style={{ color:"#e0e7ff", fontSize:14, lineHeight:1.6 }}>Revise o conteúdo abaixo e entre na sala quando estiver pronto.</p>
        </div>
        <div className="cardfx" style={{ ...styles.card, marginTop:14 }}>
          <h3 style={{ color:"#7c83ff", marginBottom:10 }}>📚 Resumo de Revisão</h3>
          <div style={{ color:"#c7cfee", fontSize:14, lineHeight:1.9, whiteSpace:"pre-wrap" }}>{examInfo.summary || "Preparando o resumo..."}</div>
        </div>
        {examReady ? (
          <div className="cardfx" style={{ ...styles.card, textAlign:"center", padding:24 }}>
            <div style={{ fontSize:36 }}>✅</div>
            <p style={{ color:"#34d399", fontWeight:700, fontSize:16 }}>Você está na sala!</p>
            <p style={{ color:"#96a0cc", fontSize:13 }}>Aguardando o professor iniciar a prova...</p>
          </div>
        ) : (
          <button onClick={handleExamReady} style={{ ...styles.btn("#34d399"), width:"100%", padding:"16px 0", fontSize:16, marginTop:14 }}>
            ✅ Entrar na Sala da Prova
          </button>
        )}
      </div>
    </div>
  );

  if (examInfo.status === 'active') {
    const qs = examInfo.questions || [];
    const q = qs[examCurrentQ];
    return (
      <div className={supportClass} style={styles.container}>
        <div style={styles.header}>
          <span>🏆 Prova — {studentName}</span>
          <span style={{ color:"#96a0cc", fontSize:13 }}>Questão {examCurrentQ+1} de {qs.length}</span>
        </div>
        <div style={{ maxWidth:620, margin:"30px auto", padding:"0 16px" }}>
          {examExits > 0 && (
            <div style={{ background:"#f8717118", border:"1px solid #f87171", borderRadius:12, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#fca5a5", lineHeight:1.6 }}>
              ⚠ <b>Saída da prova detectada ({examExits}x).</b> Cada saída da aba desconta <b>10 pontos</b> da sua nota. Fique na prova!
            </div>
          )}
          <div style={{ background:"#151a31", borderRadius:14, padding:22, border:"1px solid #2a3154" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ color:"#7c83ff", fontWeight:700 }}>Questão {examCurrentQ+1}/{qs.length}</span>
              <span style={{ color:"#fbbf24", fontWeight:700 }}>10 pts cada</span>
            </div>
            <p style={{ color:"#e8ebfa", fontSize:16, lineHeight:1.7, marginBottom:18 }}>{q ? q.q : "Carregando..."}</p>
            {q && q.opts.map((opt, oi) => (
              <button key={oi} onClick={() => handleExamAnswer(examCurrentQ, oi)}
                style={{ display:"block", width:"100%", background:examAnswers[examCurrentQ]===oi?"#7c83ff33":"#0d1122", border:`2px solid ${examAnswers[examCurrentQ]===oi?"#7c83ff":"#2a3154"}`, borderRadius:10, padding:"12px 16px", color:"#e8ebfa", textAlign:"left", cursor:"pointer", marginBottom:8, fontSize:14 }}>
                <span style={{ color:"#7c83ff", fontWeight:700, marginRight:8 }}>{["A","B","C","D"][oi]}.</span>{opt}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
            {qs.map((_,i) => (
              <div key={i} style={{ width:28, height:28, borderRadius:6, background:i===examCurrentQ?"#7c83ff":examAnswers[i]!=null?"#2a3154":"#151a31", border:`1px solid ${i===examCurrentQ?"#7c83ff":examAnswers[i]!=null?"#7c83ff":"#2a3154"}`, display:"flex", alignItems:"center", justifyContent:"center", color:examAnswers[i]!=null?"#e8ebfa":"#5d679c", fontSize:12, cursor:"pointer" }} onClick={() => setExamCurrentQ(i)}>{i+1}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase==="generating") return (
    <div className={supportClass} style={styles.container}>
      {routineBar}
      <div style={styles.header}><span>⏳ Preparando — {studentName}</span></div>
      <div className="pop" style={{ maxWidth:440, margin:"70px auto", textAlign:"center", padding:24 }}>
        <NyxRobot state="thinking" size={116} showName={false} />
        <h2 style={{ color:"#7c83ff", margin:"14px 0 6px" }}>Nyx está preparando seu conteúdo...</h2>
        <p style={{ color:"#96a0cc", lineHeight:1.7 }}>{generatingMsg}</p>
        <div style={{ marginTop:24, display:"flex", justifyContent:"center", gap:8 }}>
          {[0,1,2].map(i=><div key={i} style={{ width:10,height:10,borderRadius:"50%",background:"#7c83ff",animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
        </div>
      </div>
    </div>
  );

  if (phase==="summary") {
    const sum = summaryView === "detalhado" && detailedSummary ? detailedSummary : dynamicSummary;
    const structured = sum && typeof sum === "object" && Array.isArray(sum.secoes) && sum.secoes.length > 0;
    const ACCENTS = ["#7c83ff","#34d399","#fbbf24","#06b6d4","#ec4899","#8b5cf6","#f87171"];
    const handleSpeakSummary = (text) => {
      setCurrentSpeakingFor(text === (structured && sum.intro ? sum.intro : "Aqui está tudo o que você aprendeu hoje, explicado passo a passo. 📒 Anote no caderno!") ? "intro" : text);
      speak(text);
    };
    return (
      <div className={supportClass} style={styles.container}>
      {routineBar}
        <div style={styles.header}><span>📚 Resumo da Aula — {studentName}</span></div>
        <div style={{ maxWidth:740, margin:"0 auto", padding:`${scalePx(22)}px ${scalePx(16)}px ${scalePx(36)}px` }}>
          {/* topo em destaque */}
          <div style={{ background:"linear-gradient(135deg,#7c83ff,#8b5cf6)", borderRadius:18, padding:`${scalePx(24)}px ${scalePx(22)}px`, textAlign:"center", boxShadow:"0 12px 30px #7c83ff55" }}>
            <div style={{ fontSize:scaleSize(44) }}>📚</div>
            <h1 style={{ color:"#fff", fontSize:scaleSize(25), margin:`${scalePx(4)}px 0 ${scalePx(8)}px` }}>Resumo da sua aula</h1>
            <p style={{ color:"#e0e7ff", fontSize:scaleSize(15), maxWidth:560, margin:"0 auto", lineHeight:1.6, marginBottom:12 }}>
              {structured && sum.intro ? sum.intro : "Aqui está tudo o que você aprendeu hoje, explicado passo a passo. 📒 Anote no caderno!"}
            </p>
            {ttsSupported && <button onClick={() => handleSpeakSummary(structured && sum.intro ? sum.intro : "Aqui está tudo o que você aprendeu hoje, explicado passo a passo. Anote no caderno!")} style={{ background:isSpeaking && currentSpeakingFor==="intro" ? "#fff" : "rgba(255,255,255,0.2)", color:isSpeaking && currentSpeakingFor==="intro" ? "#7c83ff" : "#fff", border:"none", borderRadius:8, padding:`${scalePx(10)}px ${scalePx(18)}px`, fontSize:scaleSize(13), fontWeight:700, cursor:"pointer", minHeight:scaleSize(44) }}>{isSpeaking && currentSpeakingFor==="intro" ? "⏸ Pausando" : "🔊 Ouvir intro"}</button>}
            <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:14 }}>
              <button onClick={()=>setSummaryView("simples")} style={{ background: summaryView==="simples" ? "#fff" : "rgba(255,255,255,0.16)", color: summaryView==="simples" ? "#7c83ff" : "#fff", border:"none", borderRadius:20, padding:`${scalePx(8)}px ${scalePx(16)}px`, fontSize:scaleSize(12.5), fontWeight:800, cursor:"pointer" }}>🌱 Resumo simples</button>
              <button onClick={fetchDetailedSummary} disabled={detailLoading} style={{ background: summaryView==="detalhado" ? "#fff" : "rgba(255,255,255,0.16)", color: summaryView==="detalhado" ? "#7c83ff" : "#fff", border:"none", borderRadius:20, padding:`${scalePx(8)}px ${scalePx(16)}px`, fontSize:scaleSize(12.5), fontWeight:800, cursor: detailLoading ? "wait" : "pointer", opacity: detailLoading ? 0.7 : 1 }}>{detailLoading ? "⏳ Gerando..." : "📖 Resumo detalhado"}</button>
            </div>
            {detailFailMsg && <p style={{ color:"#ffd7d7", fontSize:12.5, marginTop:8 }}>{detailFailMsg}</p>}
          </div>

          {structured ? (
            <div style={{ marginTop:18 }}>
              {sum.secoes.map((s,i)=>{
                const c = ACCENTS[i % ACCENTS.length];
                const sectionText = `${s.titulo}. ${s.explicacao || ''}${s.exemplo ? '. Exemplo: ' + s.exemplo : ''}`;
                return (
                  <div key={i} style={{ background:"#151a31", borderRadius:14, padding:18, margin:"0 0 14px", border:"1px solid #2a3154", borderLeft:`5px solid ${c}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, justifyContent:"space-between" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{s.emoji || "📌"}</span>
                        <div>
                          <div style={{ color:c, fontSize:11, fontWeight:800, letterSpacing:1 }}>PARTE {i+1}</div>
                          <h3 style={{ color:"#e8ebfa", fontSize:17, margin:0 }}>{s.titulo}</h3>
                        </div>
                      </div>
                      {ttsSupported && <button onClick={() => { setCurrentSpeakingFor(`section-${i}`); speak(sectionText); }} style={{ background:isSpeaking && currentSpeakingFor===`section-${i}` ? c : c+"33", border:`1px solid ${c}`, color:c, padding:"6px 12px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", minWidth:"max-content" }}>{isSpeaking && currentSpeakingFor===`section-${i}` ? "⏸" : "🔊"}</button>}
                    </div>
                    {s.explicacao && <p style={{ color:"#c7cfee", fontSize:15, lineHeight:1.75, margin:"0 0 4px" }}>{s.explicacao}</p>}
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
              <pre style={{ whiteSpace:"pre-wrap", fontFamily:"inherit", fontSize:14, lineHeight:1.9, color:"#c7cfee", margin:0 }}>{typeof sum==="string" ? sum : (sum && sum.raw) || "O resumo não carregou. Volte e clique em Salvar novamente."}</pre>
            </div>
          )}

          <div style={{ textAlign:"center", marginTop:22 }}>
            {accessMode ? (
              <>
                <p style={{ color:"#96a0cc", marginBottom:12 }}>Quando terminar de ouvir o resumo, volte para o código! 🎮</p>
                <button style={{ ...styles.btn("#7c83ff"), padding:"12px 26px", fontSize:16 }} onClick={async()=>{ setPhase("coding"); await persist({ phase:"coding" }); }}>← Voltar para o código</button>
              </>
            ) : (
              <>
                <p style={{ color:"#96a0cc", marginBottom:12 }}>Quando terminar de anotar, vá para a atividade! ✍️</p>
                <button style={{ ...styles.btn("#7c83ff"), padding:"12px 26px", fontSize:16 }} onClick={handleStartActivity}>Fazer Atividade →</button>
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
        <AchievementToast achievement={newAchievement} />
        {goalParty && !calmMode && <ConfettiParty level={goalParty} />}
        <div style={styles.header}><span>📝 Atividade — {studentName}</span></div>
        <div style={{ maxWidth:640, margin:"0 auto", padding:24 }}>
          <h2 style={{ color:"#7c83ff", fontSize:scaleSize(20) }}>Atividade da Aula</h2>
          <p style={{ color:"#96a0cc", fontSize:scaleSize(13), marginBottom:16 }}>Baseada no código que você escreveu hoje! Marque a alternativa que você acha certa — o resultado só aparece depois de enviar.</p>
          {activity.map((q,i)=>{
            return (
              <div key={i} data-q={i} className="cardfx" style={{...styles.card, padding:scalePx(18)}}>
                <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:12, justifyContent:"space-between" }}>
                  <p style={{ fontWeight:600, margin:0, flex:1, fontSize:scaleSize(16) }}>{i+1}. {q.q}</p>
                  {ttsSupported && <button onClick={() => handleSpeakQuestion(q, i)} style={{ background:isSpeaking && currentSpeakingFor===`q-${i}` ? "#7c83ff" : "#7c83ff33", border:"1px solid #7c83ff", color:"#7c83ff", padding:`${scalePx(8)}px ${scalePx(12)}px`, borderRadius:6, fontSize:scaleSize(11), fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", minWidth:"max-content" }}>{isSpeaking && currentSpeakingFor===`q-${i}` ? "⏸" : "🔊"}</button>}
                </div>
                {q.opts.map((opt,j)=>{
                  const picked = answers[i]===j;
                  return (
                    <button key={j} data-opt={j} style={{...styles.opt(picked), minHeight:scalePx(56)}} onClick={()=>pickAnswer(i,j)}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            );
          })}
          <div style={{ textAlign:"right" }}>
            <button style={{...styles.btn("#7c83ff"), padding:`${scalePx(12)}px ${scalePx(26)}px`, fontSize:scaleSize(15), marginTop:scalePx(16) }} onClick={handleSubmitActivity} disabled={Object.keys(answers).length<activity.length}>Enviar Atividade →</button>
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
        <AchievementToast achievement={newAchievement} />
        {goalParty && !calmMode && <ConfettiParty level={goalParty} />}
        {showFeedbackModal && (
          <NyxFeedbackModal score={score} loading={feedbackLoading} feedback={finalFeedback} onClose={()=>{
            setShowFeedbackModal(false);
            // quem errou alguma questão já cai direto na explicação do Nyx, sem precisar clicar em nada
            if ((dynamicActivity||[]).some((q,i)=>answers[i]!==q.correct)) explainErrors();
          }} />
        )}
        {showErrorExplain && (
          <ErrorExplainModal sections={errorSections} encouragement={errorEncouragement} onClose={()=>setShowErrorExplain(false)} />
        )}
        <div style={styles.header}>
          <span>🎓 Aula Concluída — {studentName}</span>
          <button onClick={backToHome} style={{ background:"transparent", border:"1px solid #2a3154", color:"#96a0cc", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12.5, fontWeight:700 }}>← Voltar à tela inicial</button>
        </div>
        <div style={{ maxWidth:580, margin:"40px auto", textAlign:"center", padding:24 }}>
          <div style={{ fontSize:72 }}>{g.emoji}</div>
          <h2 style={{ color:g.color, fontSize:26, fontWeight:900 }}>{g.label} — Você fez {score} pontos!</h2>

          {/* 🎁 presente misterioso do dia: recompensa por concluir a atividade, 1x por dia */}
          {giftReveal ? (
            <div className="pop" style={{ margin:"18px auto 0", maxWidth:340, background:`linear-gradient(135deg, ${giftReveal.color}22, ${giftReveal.color}0a)`, border:`2px solid ${giftReveal.color}`, borderRadius:18, padding:"18px 20px", boxShadow:`0 0 34px ${giftReveal.color}44` }}>
              <div style={{ fontSize:46 }}>{giftReveal.emoji}</div>
              <p style={{ color:giftReveal.color, fontWeight:900, fontSize:17, margin:"6px 0 2px" }}>{giftReveal.label}!</p>
              <p style={{ color:"#e8ebfa", fontWeight:800, fontSize:15, margin:0 }}>+{giftReveal.pts} pontos do Nyx ✨</p>
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
            <div style={{ background:"linear-gradient(135deg,#7c83ff,#8b5cf6)", borderRadius:18, padding:"20px 20px", textAlign:"center", boxShadow:"0 12px 30px #7c83ff55" }}>
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
                <button onClick={() => { setCurrentSpeakingFor("feedback"); speak(fbSpeechText); }} style={{ marginTop:10, background:isSpeaking && currentSpeakingFor==="feedback" ? "#fff" : "rgba(255,255,255,0.2)", color:isSpeaking && currentSpeakingFor==="feedback" ? "#7c83ff" : "#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  {isSpeaking && currentSpeakingFor==="feedback" ? "⏸ Pausando" : "🔊 Ouvir feedback"}
                </button>
              )}
            </div>

            {fbStructured && (
              <div style={{ marginTop:14 }}>
                {finalFeedback.secoes.map((s,i)=>{
                  const c = FB_ACCENTS[i % FB_ACCENTS.length];
                  return (
                    <div key={i} style={{ background:"#151a31", borderRadius:14, padding:16, margin:"0 0 12px", border:"1px solid #2a3154", borderLeft:`5px solid ${c}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:38, height:38, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19 }}>{s.emoji || "📌"}</span>
                        <h4 style={{ color:"#e8ebfa", fontSize:15, margin:0 }}>{s.titulo}</h4>
                      </div>
                      {s.explicacao && <p style={{ color:"#c7cfee", fontSize:14, lineHeight:1.7, margin:0 }}>{s.explicacao}</p>}
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
            <h4 style={{ color:"#7c83ff", marginBottom:10 }}>📝 Revisão da atividade</h4>
            {activity.map((q,i)=>(
              <div key={i} style={{ marginBottom:12 }}>
                <b style={{ color:answers[i]===q.correct?"#34d399":"#f87171" }}>{answers[i]===q.correct?"✅":"❌"} {q.q}</b>
                {answers[i]!==q.correct&&<div style={{ color:"#96a0cc", fontSize:13, marginTop:2 }}>Correto: {q.opts[q.correct]}</div>}
              </div>
            ))}
          </div>

          {(dynamicActivity||[]).some((q,i)=>answers[i]!==q.correct) && (
            <div className="cardfx" style={{ ...styles.card, marginTop:14, textAlign:"left", borderColor:"#7c83ff" }}>
              <h4 style={{ color:"#7c83ff", marginBottom:8 }}>🤖 Não entendeu algum erro?</h4>
              <p style={{ color:"#96a0cc", fontSize:13, lineHeight:1.6, marginBottom:10 }}>O Nyx pode explicar cada questão que você errou, com calma e do seu jeito.</p>
              <button style={{ ...styles.btn("#7c83ff"), opacity:explaining?0.6:1 }} onClick={explainErrors} disabled={explaining}>{explaining ? "Nyx está escrevendo..." : errorSections.length ? "↻ Ver explicação de novo" : "✨ Nyx, me explica meus erros!"}</button>
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
                  style={{ width:"100%", marginTop:10, background:"#0d1122", border:"2px solid #2a3154", borderRadius:8, color:"#e8ebfa", padding:10, fontSize:14, minHeight:70, boxSizing:"border-box", resize:"vertical" }} />
                <div style={{ textAlign:"right", marginTop:8 }}>
                  <button style={styles.btn("#fbbf24")} onClick={sendClassFeedback} disabled={classRating===0}>Enviar avaliação</button>
                </div>
              </>
            )}
          </div>

          <button onClick={backToHome} style={{ ...styles.btn("#7c83ff"), marginTop:20 }}>← Voltar à tela inicial</button>
        </div>
      </div>
    );
  }

  // dois botões, um por modelo de IA — o aluno escolhe qual pedir pro Nyx usar nesta análise
  const analyzeButtons = (
    <>
      <button style={{ ...styles.btn("#7c83ff"), opacity:(analyzing||activeCode.trim().length<12)?0.55:1 }} onClick={()=>analyzeCode("nvidia")} disabled={analyzing||activeCode.trim().length<12}>
        {analyzingProvider==="nvidia" ? "🔍 Analisando..." : "✨ Nemotron"}
      </button>
      <button style={{ ...styles.btn("#22d3ee"), opacity:(analyzing||activeCode.trim().length<12)?0.55:1 }} onClick={()=>analyzeCode("laguna")} disabled={analyzing||activeCode.trim().length<12}>
        {analyzingProvider==="laguna" ? "🔍 Analisando..." : "🌊 Laguna"}
      </button>
    </>
  );

  // ── CODING ──
  return (
    <div className={supportClass} style={styles.container}>
      {routineBar}
      {/* apresentação do Nyx no primeiro acesso */}
      {showIntro && (
        <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"26px 24px", maxWidth:440, width:"100%", textAlign:"center", boxShadow:"0 24px 70px rgba(0,0,0,.55), 0 0 44px #7c83ff22" }}>
            <div style={{ animation:"nyx-float 3s ease-in-out .8s infinite" }}>
              <NyxRobot state="ok" size={112} showName={false} />
            </div>
            <div style={{ fontWeight:900, fontSize:14, letterSpacing:3, color:"#7c83ff", marginTop:4 }}>NYX</div>
            {/* balão de fala */}
            <div style={{ position:"relative", background:"#0d1122", border:"1px solid #2c3358", borderRadius:16, padding:"16px 18px", marginTop:16, textAlign:"left" }}>
              <div style={{ position:"absolute", top:-8, left:"50%", width:14, height:14, background:"#0d1122", borderLeft:"1px solid #2c3358", borderTop:"1px solid #2c3358", transform:"translateX(-50%) rotate(45deg)" }} />
              <p style={{ color:"#e8ebfa", fontSize:16.5, fontWeight:800, margin:0, animation:"rise .5s ease .3s both" }}>
                Oi, {String(studentName).split(" ")[0]}! Eu sou o <span style={{color:"#7c83ff"}}>Nyx</span> 🤖
              </p>
              <p style={{ color:"#c7cfee", fontSize:14, lineHeight:1.7, margin:"10px 0 0", animation:"rise .5s ease 1s both" }}>
                Eu fico do lado do seu editor conferindo o código enquanto você escreve.
              </p>
              <p style={{ color:"#c7cfee", fontSize:14, lineHeight:1.7, margin:"10px 0 0", animation:"rise .5s ease 1.7s both" }}>
                Se algo estiver errado, eu mostro <b style={{color:"#fbbf24"}}>onde está</b> e <b style={{color:"#34d399"}}>como corrigir</b> — até as teclas que você precisa apertar!
              </p>
            </div>
            <button onClick={()=>{ setShowIntro(false); setTourStep(0); }} style={{ ...styles.btn("#7c83ff"), width:"100%", padding:"13px 0", fontSize:15, marginTop:16, animation:"rise .5s ease 2.4s both" }}>
              Conhecer minha sala! ✨
            </button>
          </div>
        </div>
      )}
      <div style={styles.header}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={()=>setShowAvatarEdit(true)} title="Editar meu boneco"
            style={{ background:"transparent", border:"none", padding:0, cursor:"pointer", position:"relative", lineHeight:0 }}>
            <Avatar cfg={avatar} size={34} />
            <span style={{ position:"absolute", right:-4, bottom:-4, background:"#7c83ff", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, boxShadow:"0 1px 3px rgba(0,0,0,.5)" }}>✏️</span>
          </button>
          <span className="shine" style={{ fontWeight:900, fontSize:17, background:"linear-gradient(120deg,#7c83ff,#22d3ee,#7c83ff)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>💻 Aula C#</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color: connected===false?"#f87171":connected?"#34d399":"#96a0cc" }}>
            {connected===null ? "● conectando..." : connected ? "● conectado" : "● sem conexão"}
          </span>
          <span style={{ background:"#7c83ff22", padding:"4px 12px", borderRadius:20, fontSize:13 }}>👤 {studentName}</span>
          <span style={{ background:"#0d1122", border:"1px solid #2a3154", padding:"4px 10px", borderRadius:20, fontSize:12, color:"#96a0cc" }}>{shiftLabel(shift)}</span>
          {streakCount >= 2 && <span title="Dias de aula seguidos que você participou" style={{ background:"#f8717122", border:"1px solid #f87171", padding:"4px 10px", borderRadius:20, fontSize:12, color:"#fca5a5", fontWeight:800 }}>🔥 {streakCount} dias seguidos</span>}
          <button data-tour="tema" style={{ ...styles.btn("#2a3154"), padding:"6px 12px", fontSize:12 }} onClick={()=>setThemeAndSave(theme==="light"?"dark":"light")} title="Mudar tema do fundo">{theme==="light"?"🌙 Escuro":"☀️ Claro"}</button>
          <button style={{ ...styles.btn("#2a3154"), padding:"6px 12px", fontSize:12 }} onClick={toggleMuted} title={muted?"Ativar sons":"Silenciar sons"}>{muted?"🔇":"🔊"}</button>
          <button style={{ ...styles.btn(largeUiMode?"#06b6d4":"#2a3154"), padding:"6px 12px", fontSize:12 }} onClick={()=>{ setLargeUiMode(!largeUiMode); try { localStorage.setItem("nyx_large_ui", !largeUiMode?"1":"0"); } catch {} }} title={largeUiMode?"Desativar modo acessível":"Ativar modo acessível (letras maiores)"}>♿</button>
          {ttsSupported && <button style={{ ...styles.btn("#2a3154"), padding:"6px 12px", fontSize:12 }} onClick={()=>setShowVoicePicker(true)} title="Escolher a voz do Nyx (leitura em voz alta)">🗣️</button>}
          <button style={{ ...styles.btn("#2a3154"), padding:"6px 12px", fontSize:12 }} onClick={tryFullscreen}>⛶ Tela cheia</button>
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
          <div style={{ background:"#7c83ff18", border:"1px solid #7c83ff", color:"#c7d2fe", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>👀</span>
            <span>Bora começar? Escreva seu primeiro código no editor — o Nyx te ajuda assim que você parar de digitar.</span>
          </div>
        </div>
      )}

      {fsMsg && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#151a31", border:"1px solid #fbbf24", color:"#fbbf24", borderRadius:10, padding:"8px 14px", fontSize:13 }}>⛶ {fsMsg}</div>
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

      {!recapDismissed && recapText && phase==="coding" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#34d39918", border:"1px solid #34d399", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>📋</span>
            <span style={{ flex:1, color:"#c7f5df" }}><b style={{ color:"#34d399" }}>Retomando:</b> {recapText}</span>
            <button onClick={()=>{ setRecapDismissed(true); try { localStorage.setItem(`nyx_recap_${todayKey()}`, "1"); } catch {} }} style={{ background:"transparent", border:"none", color:"#34d399", fontSize:16, cursor:"pointer", flexShrink:0 }}>✕</button>
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
            <button onClick={()=>{ setVidenteDismissed(true); try { localStorage.setItem(`nyx_vidente_${todayKey()}`, "1"); } catch {} }} style={{ background:"transparent", border:"none", color:"#8b5cf6", fontSize:16, cursor:"pointer", flexShrink:0 }}>✕</button>
          </div>
        </div>
      )}

      {!kbSuggestDismissed && !keyboardDone && (supportFlags.leitura || supportFlags.motora) && phase==="coding" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"linear-gradient(90deg,#0e749922,#22d3ee22)", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>⌨️</span>
            <span style={{ flex:1, color:"#a5f3fc" }}><b style={{ color:"#22d3ee" }}>Quer treinar o teclado?</b> O Nyx te mostra tecla por tecla, no seu ritmo — pode fazer quando quiser.</span>
            <button onClick={()=>{ setShowKeyboard(true); setKbSuggestDismissed(true); try { localStorage.setItem(`nyx_kbsuggest_${todayKey()}`, "1"); } catch {} }} style={{ ...styles.btn("#22d3ee"), padding:"6px 12px", fontSize:12.5 }}>Treinar agora</button>
            <button onClick={()=>{ setKbSuggestDismissed(true); try { localStorage.setItem(`nyx_kbsuggest_${todayKey()}`, "1"); } catch {} }} style={{ background:"transparent", border:"none", color:"#22d3ee", fontSize:16, cursor:"pointer", flexShrink:0 }}>✕</button>
          </div>
        </div>
      )}

      {curiosity && !curiosityDismissed && !focusMode && phase==="coding" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#22d3ee18", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>💡</span>
            <span style={{ flex:1, color:"#c7f5f9" }}><b style={{ color:"#22d3ee" }}>Curiosidade do dia:</b> {curiosity}</span>
            <button onClick={()=>setCuriosityDismissed(true)} style={{ background:"transparent", border:"none", color:"#5d679c", fontSize:16, cursor:"pointer" }}>✕</button>
          </div>
        </div>
      )}

      {renaming != null && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#151a31", border:"2px solid #7c83ff", borderRadius:16, padding:24, maxWidth:380, width:"100%" }}>
            <h3 style={{ color:"#7c83ff", margin:"0 0 4px" }}>✎ Renomear arquivo</h3>
            <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 12px" }}>Escolha um nome para o arquivo (o ".cs" é colocado sozinho).</p>
            <div style={{ display:"flex", alignItems:"center", background:"#0d1122", border:"2px solid #2a3154", borderRadius:10, padding:"0 12px" }}>
              <input autoFocus value={renameValue} onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") confirmRename(); if(e.key==="Escape") cancelRename(); }}
                placeholder="ex: MeuPrograma" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#e8ebfa", fontSize:15, padding:"11px 0" }} />
              <span style={{ color:"#5d679c", fontSize:14 }}>.cs</span>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={cancelRename} style={{ ...styles.btn("#2a3154"), flex:1 }}>Cancelar</button>
              <button onClick={confirmRename} style={{ ...styles.btn("#7c83ff"), flex:1 }}>Salvar nome</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:14, padding:14, maxWidth:1180, margin:"0 auto", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 560px", minWidth:320 }}>
          {accessMode ? (
            <div className="cardfx" style={{ ...styles.card, borderColor:"#22d3ee" }}>
              <h3 style={{ color:"#22d3ee", marginBottom:4, fontSize:scaleSize(19) }}>🧩 Modo Guiado — Monte seu programa!</h3>
              <p style={{ color:"#96a0cc", fontSize:scaleSize(13), marginBottom:14 }}>Clique nos blocos abaixo para montar seu programa, um passo de cada vez! {ttsSupported && "O Nyx explica cada bloco em voz alta pra você."}</p>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
                {GUIDED_BLOCKS.map(block => (
                  <button key={block.id} onClick={()=> block.needsInput ? setPendingBlock({ block, value:"" }) : addGuidedBlock(block)}
                    style={{ background:"#151a31", border:"2px solid #2a3154", borderRadius:12, padding:"14px 10px", cursor:"pointer", color:"#e8ebfa", textAlign:"center", minHeight:scalePx(92) }}>
                    <div style={{ fontSize:scaleSize(30) }}>{block.emoji}</div>
                    <div style={{ fontSize:scaleSize(12.5), fontWeight:700, marginTop:6 }}>{block.label}</div>
                  </button>
                ))}
              </div>

              {pendingBlock && (
                <div style={{ marginTop:16, background:"#0d1122", border:"2px solid #22d3ee", borderRadius:12, padding:16 }}>
                  <p style={{ color:"#22d3ee", fontWeight:700, marginBottom:8, fontSize:scaleSize(14) }}>{pendingBlock.block.emoji} {pendingBlock.block.inputLabel}</p>
                  <input autoFocus value={pendingBlock.value} onChange={e=>setPendingBlock({ ...pendingBlock, value:e.target.value })}
                    placeholder={pendingBlock.block.placeholder}
                    onKeyDown={e=>{ if (e.key==="Enter" && pendingBlock.value.trim()) addGuidedBlock(pendingBlock.block, pendingBlock.value); }}
                    style={{ width:"100%", background:"#151a31", border:"1px solid #2a3154", borderRadius:8, padding:`${scalePx(10)}px ${scalePx(12)}px`, color:"#e8ebfa", fontSize:scaleSize(15), boxSizing:"border-box" }} />
                  <div style={{ display:"flex", gap:8, marginTop:10 }}>
                    <button onClick={()=>setPendingBlock(null)} style={{ ...styles.btn("#2a3154"), flex:1 }}>Cancelar</button>
                    <button onClick={()=>addGuidedBlock(pendingBlock.block, pendingBlock.value)} disabled={!pendingBlock.value.trim()} style={{ ...styles.btn("#22d3ee"), flex:1, opacity:pendingBlock.value.trim()?1:0.5 }}>Adicionar ✅</button>
                  </div>
                </div>
              )}

              {/* Nyx te ensina: mini-lições de C# geradas sob demanda, sempre com exemplo de jogo — o professor mantém
                  o Modo Guiado ligado durante a aula toda, e o aluno pode pedir quantas lições quiser nesse período */}
              <div style={{ marginTop:20, background:"linear-gradient(135deg,#7c83ff22,#8b5cf622)", border:"1px solid #7c83ff55", borderRadius:14, padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:scaleSize(26) }}>🎮</span>
                    <div>
                      <h4 style={{ color:"#c7cfee", margin:0, fontSize:scaleSize(15) }}>Nyx te ensina a programar jogos!</h4>
                      <p style={{ color:"#96a0cc", margin:"2px 0 0", fontSize:scaleSize(12) }}>Peça quantas lições quiser — o Nyx sempre explica com exemplo de jogo.</p>
                    </div>
                  </div>
                  <button onClick={generateGuidedLesson} disabled={guidedLessonLoading} style={{ ...styles.btn("#7c83ff"), opacity:guidedLessonLoading?0.6:1, whiteSpace:"nowrap" }}>
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
                        <div key={l.id} style={{ background:"#151a31", borderRadius:12, padding:14, border:"1px solid #2a3154", borderLeft:`5px solid ${c}` }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:34, height:34, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>{l.emoji || "🎮"}</span>
                              <h5 style={{ color:"#e8ebfa", margin:0, fontSize:scaleSize(14) }}>{l.titulo}</h5>
                            </div>
                            {ttsSupported && <button onClick={() => { setCurrentSpeakingFor(`lesson-${l.id}`); speak(lessonSpeech); }} style={{ background:isSpeaking && currentSpeakingFor===`lesson-${l.id}` ? c : c+"33", border:`1px solid ${c}`, color:c, padding:"5px 10px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>{isSpeaking && currentSpeakingFor===`lesson-${l.id}` ? "⏸" : "🔊"}</button>}
                          </div>
                          {l.codigo && <CodeBlock code={l.codigo} />}
                          {l.oQueFaz && <p style={{ color:"#c7cfee", fontSize:scaleSize(13), lineHeight:1.7, margin:"6px 0 0" }}>{l.oQueFaz}</p>}
                          {l.exemploJogo && <p style={{ color:"#a5b4fc", fontSize:scaleSize(12.5), lineHeight:1.7, margin:"4px 0 0", fontStyle:"italic" }}>🎮 {l.exemploJogo}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginTop:20 }}>
                <h4 style={{ color:"#7c83ff", marginBottom:8, fontSize:scaleSize(15) }}>📜 Seu programa (nesta ordem)</h4>
                {guidedBlocks.length===0 ? (
                  <p style={{ color:"#5d679c", fontSize:scaleSize(13) }}>Clique num bloco acima para começar!</p>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {guidedBlocks.map((b,i)=>(
                      <div key={b.uid} style={{ display:"flex", alignItems:"center", gap:10, background:"#151a31", border:"1px solid #2a3154", borderRadius:8, padding:"8px 12px" }}>
                        <span style={{ fontSize:scaleSize(20) }}>{b.emoji}</span>
                        <span style={{ flex:1, fontSize:scaleSize(13) }}>{i+1}. {b.label}</span>
                        <button onClick={()=>moveGuidedBlock(i,-1)} disabled={i===0} style={{ background:"transparent", border:"none", color:"#96a0cc", cursor:"pointer", opacity:i===0?0.3:1, fontSize:scaleSize(15), minWidth:scaleSize(32) }}>⬆️</button>
                        <button onClick={()=>moveGuidedBlock(i,1)} disabled={i===guidedBlocks.length-1} style={{ background:"transparent", border:"none", color:"#96a0cc", cursor:"pointer", opacity:i===guidedBlocks.length-1?0.3:1, fontSize:scaleSize(15), minWidth:scaleSize(32) }}>⬇️</button>
                        <button onClick={()=>removeGuidedBlock(b.uid)} style={{ background:"transparent", border:"none", color:"#f87171", cursor:"pointer", fontSize:scaleSize(16), minWidth:scaleSize(32) }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeCode.trim() && (
                <div style={{ marginTop:16 }}>
                  <p style={{ color:"#5d679c", fontSize:scaleSize(12), marginBottom:2 }}>👀 Assim fica o código de verdade (o Nyx e o professor conseguem ver):</p>
                  <CodeBlock code={activeCode} />
                </div>
              )}

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16, flexWrap:"wrap", gap:8 }}>
                <span style={{ color: saveWarn ? "#fbbf24" : "#5d679c", fontSize:scaleSize(12) }}>{saveWarn || (analyzing?"🔍 Verificando...":"✨ Peça ao Nyx quando quiser que ele confira seu código")}</span>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {analyzeButtons}
                  <button data-tour="salvar" style={styles.btn("#34d399")} onClick={handleSave}>💾 Salvar e Finalizar Aula</button>
                </div>
              </div>

              <Terminal files={files} dataTour="terminal" onEasterEgg={(egg) => {
                unlockAchievement("segredo");
                if (egg === "dance") { setRobotState("ok"); setRobotMsg("💃 Você achou meu passo de dança secreto! Não conta pra ninguém... ou conta, vai ser divertido."); setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 6000); }
                if (egg === "cafe") { setRobotState("ok"); setRobotMsg("☕ Aaah, muito obrigado pelo café! Bora codar com tudo agora!"); setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 6000); }
              }} />
            </div>
          ) : (
            <>
              {/* abas de arquivos */}
              <div data-tour="arquivos" style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                {files.map((f,i)=>(
                  <div key={i} onClick={()=>setActive(i)} style={{ display:"flex", alignItems:"center", gap:6, background:i===active?"#1e1e1e":"#101425", border:`1px solid ${i===active?"#7c83ff":"#2a3154"}`, color:i===active?"#fff":"#96a0cc", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>
                    <span>📄 {f.name}</span>
                    <span onClick={(e)=>{e.stopPropagation();openRename(i);}} title="Renomear" style={{ color:"#7c83ff", fontWeight:700 }}>✎</span>
                    {files.length>1 && <span onClick={(e)=>{e.stopPropagation();deleteFile(i);}} title="Apagar" style={{ color:"#f87171", fontWeight:700 }}>✕</span>}
                  </div>
                ))}
                <button onClick={addFile} style={{ background:"#0d1122", border:"1px dashed #7c83ff", color:"#7c83ff", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>＋ Novo arquivo</button>
              </div>

              <div data-tour="editor">
                <VSEditor value={activeCode} onChange={updateActiveCode} filename={files[active]?.name} errorLines={errorLinesForEditor} />
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8, flexWrap:"wrap", gap:8 }}>
                <span style={{ color: saveWarn ? "#fbbf24" : "#5d679c", fontSize:12 }}>{saveWarn || (analyzing?"🔍 Verificando...":"✨ Peça ao Nyx quando quiser que ele confira seu código")}</span>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {analyzeButtons}
                  <button data-tour="salvar" style={styles.btn("#34d399")} onClick={handleSave}>💾 Salvar e Finalizar Aula</button>
                </div>
              </div>

              <Terminal files={files} dataTour="terminal" onEasterEgg={(egg) => {
                unlockAchievement("segredo");
                if (egg === "dance") { setRobotState("ok"); setRobotMsg("💃 Você achou meu passo de dança secreto! Não conta pra ninguém... ou conta, vai ser divertido."); setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 6000); }
                if (egg === "cafe") { setRobotState("ok"); setRobotMsg("☕ Aaah, muito obrigado pelo café! Bora codar com tudo agora!"); setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 6000); }
              }} />
            </>
          )}
        </div>

        {/* Robô + atalhos */}
        <div className="side-col" style={{ width:250, flex:"0 0 250px" }}>
          {showErrorWalkthrough && codeErrors.length > 0 && (
            <ErrorWalkthroughCard
              errors={codeErrors}
              step={Math.min(errorWalkStep, codeErrors.length-1)}
              verifying={analyzing}
              onPrev={()=>setErrorWalkStep(s=>Math.max(0,s-1))}
              onNext={()=>setErrorWalkStep(s=>Math.min(codeErrors.length-1,s+1))}
              onVerify={analyzeCode}
              onClose={()=>setShowErrorWalkthrough(false)}
            />
          )}
          <div data-tour="nyx" className="cardfx" style={styles.card}>
            <NyxRobot state={robotState} size={88} gear={nyxGear} />
            {robotMsg&&(<div style={{ background:robotState==="error"?"#f8717111":"#34d39911", border:`1px solid ${robotState==="error"?"#f87171":"#34d399"}`, borderRadius:8, padding:12, marginTop:10, fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap" }}>
              {robotMsg}
              {ttsSupported && <div style={{ marginTop:8 }}><button onClick={()=>speak(robotMsg)} style={{ background:"transparent", border:`1px solid ${robotState==="error"?"#f87171":"#34d399"}`, color:robotState==="error"?"#f87171":"#34d399", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>🔊 Ouvir</button></div>}
            </div>)}
            {keysToShow.length>0&&(<div style={{ marginTop:10 }}><p style={{ color:"#fbbf24", fontSize:12, fontWeight:600, marginBottom:4 }}>Teclas para usar:</p>{keysToShow.map((k,i)=><KeyVisual key={i} char={k}/>)}</div>)}
            {helpAt
              ? <button onClick={cancelHelp} style={{ ...styles.btn("#34d399"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="O professor já foi avisado — clique pra cancelar o pedido">✋ Professor avisado! (cancelar)</button>
              : <button onClick={askHelp} style={{ ...styles.btn("#fbbf24"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Acende seu nome no painel do professor pra ele vir te ajudar">✋ Pedir ajuda do professor</button>}
            {!focusMode && <button data-tour="loja" onClick={()=>setShowNyxShop(true)} style={{ ...styles.btn("#7c83ff"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }}>
              🎁 Loja do Nyx · {nyxPoints - nyxSpent} pts
            </button>}
            <button onClick={()=>setShowKeyboard(true)} style={{ ...styles.btn("#22d3ee"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Aprenda onde fica cada tecla, no seu ritmo — pode treinar quando quiser">
              ⌨️ Tutorial de Teclado
            </button>
            <button onClick={()=>{ setShowHallOfFame(true); getHallOfFame().then(setHallEntries); }} style={{ ...styles.btn("#fbbf24"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Veja quem se destacou nas cidades por onde a carreta já passou">
              🏆 Hall da Fama
            </button>
            {pendingAbsences.length>0 && (
              <button onClick={()=>setShowJustify(true)} style={{ ...styles.btn("#f87171"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Justifique uma falta pro professor avaliar">
                😔 Justificar falta ({pendingAbsences.length})
              </button>
            )}
          </div>
          <div className="cardfx" style={styles.card}>
            <p style={{ color:"#fbbf24", fontWeight:700, marginBottom:8, fontSize:13 }}>🏆 Turma & Você</p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {!focusMode && <button onClick={()=>setShowRanking(true)} style={{ ...styles.btn("#22d3ee"), fontSize:12, padding:"7px 0" }}>📊 Ranking da turma</button>}
              <button onClick={()=>setShowAchievements(true)} style={{ ...styles.btn("#a855f7"), fontSize:12, padding:"7px 0" }}>🎖️ Conquistas · {achievements.length}/{ACHIEVEMENTS.length}</button>
              <button onClick={()=>setShowNotebook(true)} style={{ ...styles.btn("#34d399"), fontSize:12, padding:"7px 0" }}>📒 Caderno de resumos</button>
              <button onClick={()=>setShowPerformance(true)} style={{ ...styles.btn("#06b6d4"), fontSize:12, padding:"7px 0" }}>📊 Meu Desempenho</button>
              {!focusMode && <button onClick={()=>{ if (!nyxLocks.zeker) setShowDuel(true); }} disabled={nyxLocks.zeker} title={nyxLocks.zeker ? "O professor bloqueou os duelos por enquanto" : ""}
                style={{ ...styles.btn("#f87171"), fontSize:12, padding:"7px 0", opacity:nyxLocks.zeker?0.45:1, cursor:nyxLocks.zeker?"not-allowed":"pointer" }}>
                {nyxLocks.zeker ? "🔒 Duelos bloqueados" : "⚔️ Duelo entre alunos"}
              </button>}
              {!focusMode && <button onClick={()=>setShowRace(true)} title="Digite um trecho de código contra o relógio — pontos 1x por dia e pódio da turma"
                style={{ ...styles.btn("#fb923c"), fontSize:12, padding:"7px 0" }}>🏁 Corrida de digitação{typingBest ? ` · ${(typingBest.ms/1000).toFixed(1)}s` : ""}</button>}
            </div>
            {!focusMode && <ClassGoalBar sum={classPointsSum} />}
          </div>
          <div className="cardfx" style={{ ...styles.card, fontSize:12, color:"#5d679c", lineHeight:1.8 }}>
            <p style={{ color:"#7c83ff", fontWeight:600, marginBottom:6 }}>⌨️ Atalhos do editor</p>
            <div><code style={{color:"#FFD700"}}>{"{"}</code> → abre e fecha sozinho</div>
            <div><code style={{color:"#DA70D6"}}>(</code> → abre e fecha sozinho</div>
            <div><code style={{color:"#ce9178"}}>"</code> → abre e fecha sozinho</div>
            <div><code style={{color:"#d4d4d4"}}>Tab</code> → empurra o texto para a direita</div>
            <div><code style={{color:"#d4d4d4"}}>Enter</code> → começa uma linha nova já no lugar certo</div>
          </div>
        </div>
      </div>

      {tourStep >= 0 && tourStep < TOUR_STEPS.length && (
        <TourOverlay step={tourStep} onNext={()=>setTourStep(s => (s+1 >= TOUR_STEPS.length ? -1 : s+1))} />
      )}

      <ErrorHighlightRing active={showErrorWalkthrough && codeErrors.length > 0} />

      {showNyxShop && (
        <NyxShop
          wallet={nyxPoints - nyxSpent}
          owned={nyxOwned}
          gear={nyxGear}
          onEquip={(newGear)=>{ setNyxGear(newGear); persist({ nyxGear: newGear }); }}
          onBuy={handleBuyItem}
          isTestShift={shift === TEST_SHIFT.id}
          onClose={()=>setShowNyxShop(false)}
        />
      )}

      {showAvatarEdit && (
        <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:680, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#7c83ff,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🎨 Editar meu boneco</h2>
              <button onClick={()=>{ setShowAvatarEdit(false); persist({}); }} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
            </div>
            <AvatarBuilder value={avatar} onChange={setAvatar} />
            <button onClick={()=>{ setShowAvatarEdit(false); persist({}); }} style={{ ...styles.btn("#7c83ff"), width:"100%", marginTop:16 }}>💾 Salvar e fechar</button>
          </div>
        </div>
      )}

      {showAchievements && <AchievementsModal unlocked={achievements} onClose={()=>setShowAchievements(false)} />}
      {showRanking && <RankingModal shift={shift} myName={studentName} onClose={()=>setShowRanking(false)} />}
      {showNotebook && <NotebookModal history={summaryHistory} detailedHistory={detailedSummaryHistory} onClose={()=>setShowNotebook(false)} />}
      {showVoicePicker && <VoicePickerModal onClose={()=>setShowVoicePicker(false)} />}
      {showRace && <TypingRaceModal onClose={()=>setShowRace(false)} onFinish={finishTypingRace} />}
      {showKeyboard && <KeyboardTutorialModal onClose={()=>setShowKeyboard(false)} onFinish={finishKeyboardTutorial} speak={speak} stopSpeech={stopSpeech} accessMode={accessMode} />}
      {showJustify && <JustifyModal absences={pendingAbsences} onSubmit={submitJustification} onClose={()=>setShowJustify(false)} />}
      {showHallOfFame && <HallOfFameModal entries={hallEntries} onClose={()=>setShowHallOfFame(false)} />}
      {showPerformance && <PerformanceModal studentName={studentName} scoreHistory={scoreHistory} achievements={achievements} duelWins={duelWins} typingBest={typingBest} streakCount={streakCount} onClose={()=>setShowPerformance(false)} />}
      {showDuel && (
        <DuelModal
          shift={shift}
          myName={studentName}
          myAvatar={avatar}
          onAward={async (pts) => { const np = nyxPoints + pts; setNyxPoints(np); await persist({ nyxPoints: np }); checkPointsAchievements(np); }}
          onWin={async () => {
            const nw = duelWins + 1;
            setDuelWins(nw);
            await persist({ duelWins: nw });
            unlockAchievement("duelista");
            if (nw >= 3) unlockAchievement("duelista-3");
          }}
          onClose={()=>setShowDuel(false)}
        />
      )}

      <NyxChat
        who="student"
        dataTour="chat"
        gear={nyxGear}
        accessMode={accessMode}
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
function CodeLab({ accent = "#fbbf24", files = [{ name:"Program.cs", code:"" }], onChange = ()=>{}, strugglingStudents = [], terminalMaxHeight }) {
  const setFiles = (updater) => onChange(typeof updater === "function" ? updater(files) : updater);
  const [active, setActive] = useState(0);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [robotState, setRobotState] = useState("idle");
  const [robotMsg, setRobotMsg] = useState("");
  const [keysToShow, setKeysToShow] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
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

  const card = { background:"linear-gradient(180deg,#181d38,#131730)", borderRadius:16, padding:16, margin:"10px 0", border:"1px solid #272e52", boxShadow:"0 8px 24px rgba(3,5,16,.35)" };

  return (
    <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
      {renaming != null && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#151a31", border:`2px solid ${accent}`, borderRadius:16, padding:24, maxWidth:380, width:"100%" }}>
            <h3 style={{ color:accent, margin:"0 0 4px" }}>✎ Renomear arquivo</h3>
            <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 12px" }}>Escolha um nome (o ".cs" é colocado sozinho).</p>
            <div style={{ display:"flex", alignItems:"center", background:"#0d1122", border:"2px solid #2a3154", borderRadius:10, padding:"0 12px" }}>
              <input autoFocus value={renameValue} onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") confirmRename(); if(e.key==="Escape") cancelRename(); }} placeholder="ex: MeuPrograma" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#e8ebfa", fontSize:15, padding:"11px 0" }} />
              <span style={{ color:"#5d679c", fontSize:14 }}>.cs</span>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={cancelRename} style={{ background:"#2a3154", color:"#fff", border:"none", borderRadius:8, padding:"10px 0", cursor:"pointer", fontWeight:700, flex:1 }}>Cancelar</button>
              <button onClick={confirmRename} style={{ background:accent, color:"#fff", border:"none", borderRadius:8, padding:"10px 0", cursor:"pointer", fontWeight:700, flex:1 }}>Salvar nome</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex:"1 1 560px", minWidth:320 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
          {files.map((f,i)=>(
            <div key={i} onClick={()=>setActive(i)} style={{ display:"flex", alignItems:"center", gap:6, background:i===active?"#1e1e1e":"#101425", border:`1px solid ${i===active?accent:"#2a3154"}`, color:i===active?"#fff":"#96a0cc", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>
              <span>📄 {f.name}</span>
              <span onClick={(e)=>{e.stopPropagation();openRename(i);}} title="Renomear" style={{ color:accent, fontWeight:700 }}>✎</span>
              {files.length>1 && <span onClick={(e)=>{e.stopPropagation();deleteFile(i);}} title="Apagar" style={{ color:"#f87171", fontWeight:700 }}>✕</span>}
            </div>
          ))}
          <button onClick={addFile} style={{ background:"#0d1122", border:`1px dashed ${accent}`, color:accent, borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>＋ Novo arquivo</button>
        </div>

        <VSEditor value={activeCode} onChange={updateActiveCode} filename={files[active]?.name} />

        <div style={{ display:"flex", justifyContent:"flex-start", alignItems:"center", marginTop:8 }}>
          <span style={{ color:"#5d679c", fontSize:12 }}>{analyzing?"🔍 Verificando...":"✨ Nyx confere seu código 5s depois que você para de escrever"}</span>
        </div>

        <Terminal files={files} maxHeight={terminalMaxHeight} />
      </div>

      <div className="side-col" style={{ width:250, flex:"0 0 250px" }}>
        <div style={card}>
          <NyxRobot state={robotState} size={88} context="teacher" />
          {robotMsg && (<div style={{ background:robotState==="error"?"#f8717111":"#34d39911", border:`1px solid ${robotState==="error"?"#f87171":"#34d399"}`, borderRadius:8, padding:12, marginTop:10, fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{robotMsg}</div>)}
          {keysToShow.length>0 && (<div style={{ marginTop:10 }}><p style={{ color:accent, fontSize:12, fontWeight:600, marginBottom:4 }}>Teclas para usar:</p>{keysToShow.map((k,i)=><KeyVisual key={i} char={k}/>)}</div>)}
        </div>
        {strugglingStudents.length > 0 && (
          <div style={{ ...card, borderColor:"#f87171", background:"linear-gradient(180deg,#2a1620,#1a1023)" }}>
            <p style={{ color:"#f87171", fontWeight:800, marginBottom:6, fontSize:13 }}>⚠️ Nyx avisa: precisam de ajuda</p>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {strugglingStudents.map(s => (
                <span key={s.name} style={{ color:"#fecaca", fontSize:12.5 }}>• <b>{s.name}</b></span>
              ))}
            </div>
          </div>
        )}
        <div style={{ ...card, fontSize:12, color:"#5d679c", lineHeight:1.8 }}>
          <p style={{ color:accent, fontWeight:600, marginBottom:6 }}>👩‍🏫 O exemplo da aula</p>
          <p style={{ color:"#96a0cc" }}>Programe aqui o exemplo de hoje e teste com o ▶ dotnet run. Este código <b>fica salvo</b> e é usado para gerar o nome do conteúdo do dia. Os alunos não veem esta área.</p>
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
        <button onClick={prev} style={{ background:"#0d1122", border:"1px solid #2a3154", color:"#e8ebfa", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>‹</button>
        <span style={{ color:"#e8ebfa", fontWeight:700, textTransform:"capitalize" }}>{monthName}</span>
        <button onClick={next} style={{ background:"#0d1122", border:"1px solid #2a3154", color:"#e8ebfa", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
        {wd.map((d,i)=><div key={"h"+i} style={{ textAlign:"center", color:"#5d679c", fontSize:12, fontWeight:700 }}>{d}</div>)}
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
                background:isClass?"#34d399":"#0d1122", color:isClass?"#062":"#96a0cc",
                border:isToday?"2px solid #7c83ff":"1px solid #2a3154" }}>
              {d}
              {cname && <span style={{ position:"absolute", bottom:3, left:0, right:0, fontSize:9, lineHeight:1 }}>📖</span>}
            </button>
          );
        })}
      </div>
      <p style={{ color:"#5d679c", fontSize:12, marginTop:10 }}><span style={{ display:"inline-block", width:12, height:12, background:"#34d399", borderRadius:3, verticalAlign:"middle", marginRight:6 }}/>dias de aula &nbsp;·&nbsp; <span style={{ display:"inline-block", width:12, height:12, border:"2px solid #7c83ff", borderRadius:3, verticalAlign:"middle", marginRight:6 }}/>hoje &nbsp;·&nbsp; 📖 tem conteúdo</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  PROFESSOR
// ════════════════════════════════════════════════════════════════════════════
const DF_CITIES = ["Plano Piloto (Brasília)","Gama","Taguatinga","Brazlândia","Sobradinho","Planaltina","Paranoá","Núcleo Bandeirante","Ceilândia","Guará","Cruzeiro","Samambaia","Santa Maria","São Sebastião","Recanto das Emas","Lago Sul","Riacho Fundo","Lago Norte","Candangolândia","Águas Claras","Riacho Fundo II","Sudoeste/Octogonal","Varjão","Park Way","SCIA/Estrutural","Sobradinho II","Jardim Botânico","Itapoã","SIA","Vicente Pires","Fercal","Sol Nascente/Pôr do Sol","Arniqueira"];

function difficultyOf(s) {
  if (s.phase==="done") {
    if ((s.score||0) >= 70) return { level:"bem", text:`Concluiu a aula com nota ${s.score}.` };
    return { level:"dif", text:`Concluiu, mas com nota baixa (${s.score}). Vale revisar o conteúdo com ele.` };
  }
  if (s.hasError && s.feedback && s.feedback.message) return { level:"dif", text:"Erro no código → " + s.feedback.message };
  if (s.phase==="activity") return { level:"bem", text:"Está fazendo a atividade." };
  if (s.phase==="summary") return { level:"bem", text:"Está lendo o resumo." };
  if (s.feedback && s.feedback.ok) return { level:"bem", text:"Código sem erros até agora." };
  if (!s.code || s.code.trim().length < 10) return { level:"neutro", text:"Ainda não começou a escrever." };
  return { level:"neutro", text:"Está escrevendo o código." };
}

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

function TeacherView({ onLogout, teacherAuth }) {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  // gestão do aluno selecionado (renomear, mover de turno, corrigir nota, excluir)
  const [renameVal, setRenameVal] = useState("");
  const [scoreVal, setScoreVal] = useState("");
  const [mgmtMsg, setMgmtMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selAccessMode, setSelAccessMode] = useState(false);
  // perfis de apoio (educação inclusiva) do aluno selecionado + mapa geral pros tiles
  const [selSupport, setSelSupport] = useState({});
  const [supportMap, setSupportMap] = useState({});
  useEffect(() => { setRenameVal(""); setScoreVal(""); setConfirmDelete(false); setMgmtMsg(""); }, [selected]);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetScope, setResetScope] = useState("all");
  const [resetMsg, setResetMsg] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [diag, setDiag] = useState(null);
  const [tab, setTab] = useState("monitor");
  const [meta, setMeta] = useState({ city:"", classDays:[], contentNames:{} });
  // horário automático de aula (por turno) + vistoria (libera um aluno específico fora do horário)
  const [schedule, setSchedule] = useState({});
  const [scheduleMsg, setScheduleMsg] = useState("");
  const [selInspection, setSelInspection] = useState(false);
  const [breakEndMsgTeacher, setBreakEndMsgTeacher] = useState("");
  const breakEndNotifiedTeacherRef = useRef({});
  const [cityInput, setCityInput] = useState("");
  // 🏆 hall da fama: encerra a cidade atual e guarda uma placa com quem se destacou
  const [hallMsg, setHallMsg] = useState("");
  const [confirmCloseCity, setConfirmCloseCity] = useState(false);
  const [showTripOverview, setShowTripOverview] = useState(false);
  const [tripHallEntries, setTripHallEntries] = useState([]);
  const [shiftFilter, setShiftFilter] = useState("all");
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
  const [examShift, setExamShift] = useState("all");
  const [confirmEndExam, setConfirmEndExam] = useState(false);
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
  // PDF com o código e o resumo de cada aluno (pra guardar/enviar ao fim do curso)
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfMsg, setPdfMsg] = useState("");
  // biblioteca de aulas (as SUAS aulas salvas + modelos de exemplo) + backup completo
  const [showLessons, setShowLessons] = useState(false);
  const [myLessons, setMyLessons] = useState([]);
  const [lessonName, setLessonName] = useState("");
  const [showModels, setShowModels] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);

  const load = useCallback(async () => {
    const arr = await listStudents();
    setStudents(arr);
    setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
    try { const ec = await getExamState(); setExamConfig(ec); } catch {}
    // marca o dia de hoje como aula se houver alunos
    if (arr.length > 0) {
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
    const iv = setInterval(run, 2000);
    return () => { active = false; clearInterval(iv); };
  }, [load]);

  useEffect(() => { diagnose().then(setDiag); }, []);

  // 🍎 intervalo: status de cada turno (recalcula a cada carregamento da turma, ~2s) + sininho no fim
  const shiftBreakStatuses = SHIFTS.map(sh => ({ ...sh, status: classStatus(schedule[sh.id] || {}) }));
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
    });
  }, [shiftBreakStatuses.map(s => s.status.inBreak).join(","), schedule]);
  // mapa de perfis de apoio (indicador 💙 nos tiles) — atualiza de vez em quando, não precisa ser ao vivo
  useEffect(() => {
    let active = true;
    const loadSupport = async () => { const m = await listAllSupport(); if (active) setSupportMap(m); };
    loadSupport();
    const iv = setInterval(loadSupport, 20000);
    return () => { active = false; clearInterval(iv); };
  }, []);
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
    const iv = setInterval(check, 4000);
    return () => { active = false; clearInterval(iv); };
  }, []);
  useEffect(() => { getTeacherMeta().then(m => { metaRef.current = m; setMeta(m); setCityInput(m.city||""); setSchedule(m.schedule||{}); }); }, []);
  // carrega o código salvo do professor uma vez, para cada turno
  useEffect(() => {
    (async () => {
      const [m, v] = await Promise.all([getTeacherCode("matutino"), getTeacherCode("vespertino")]);
      setProFilesByShift(prev => ({
        matutino: (m && Array.isArray(m.files) && m.files.length) ? m.files : prev.matutino,
        vespertino: (v && Array.isArray(v.files) && v.files.length) ? v.files : prev.vespertino,
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
  // 🏆 encerra a cidade atual: guarda uma placa no Hall da Fama com quem mais se destacou, pra
  // os alunos da PRÓXIMA cidade verem — não apaga nem reseta nada, é só um retrato do fechamento
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
    const next = [...entries, { city: meta.city, students: podio, closedAt: Date.now(), totalStudents: active.length, totalClasses: (meta.classDays||[]).length, avgScore }];
    await saveHallOfFame(next, teacherAuth);
    setHallMsg(`✅ ${meta.city} entrou pro Hall da Fama! Os alunos da próxima cidade já vão poder ver.`);
    setTimeout(()=>setHallMsg(""), 8000);
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

  const doReset = async () => {
    const scope = resetScope; // "all" | "matutino" | "vespertino"
    setConfirmReset(false);
    setResetting(true);
    setResetMsg("");
    const ok = await resetAll(scope === "all" ? null : scope, teacherAuth);
    setSelected(null);
    await load();
    setResetting(false);
    const alvo = scope === "all" ? "Toda a sala foi resetada" : `Turma ${shiftMeta(scope).label} resetada`;
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
    // quem tirou a maior nota em cada turma é quem "se destacou mais" nessa planilha
    const melhorNotaPorTurno = {};
    rows.forEach(s => {
      const nota = maiorNotaOf(s);
      if (nota == null) return;
      const key = s.shift || "sem-turno";
      if (melhorNotaPorTurno[key] == null || nota > melhorNotaPorTurno[key]) melhorNotaPorTurno[key] = nota;
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

    const totalCols = 5 + classDays.length; // ALUNO + dias + DIAS PRESENTES + MAIOR NOTA + SITUAÇÃO + DESTAQUE
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
      xlsRows.push({ cells: ["ALUNO", ...dayHeaders, "DIAS PRESENTES","MAIOR NOTA","SITUAÇÃO","DESTAQUE"].map((h,i)=>({
        v: h, st: { b:1, sz: i>0&&i<=classDays.length?9:11, color:"FFFFFF", fill:"303869", border:1, align: i>0 ? "center" : "left" },
      })) });

      g.list.forEach((s, i) => {
        const att = Object.values(s.attendance||{}).filter(v=>v==="present").length;
        const maiorNota = maiorNotaOf(s);
        const isDestaque = maiorNota != null && maiorNota === melhorNotaPorTurno[g.id];
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
          situacao,
          { v: isDestaque ? "🌟 Aluno destaque da turma" : "", st:{ color:"8A6D1A", fill, border:1, align:"center" } },
        ] });
      });

      const notas = g.list.map(maiorNotaOf).filter(n => n != null);
      const media = notas.length ? Math.round(notas.reduce((a,b)=>a+b,0)/notas.length) : null;
      cells = wide({ i:1, sz:9.5, color:"5A6183", fill:"EEF0FA", border:1 });
      cells[0].v = `Média da turma: ${media ?? "—"}  •  Situação calculada pela maior nota (linha de corte: 60)`;
      xlsRows.push({ cells }); mergeRow();
      xlsRows.push({ cells: [] });
    });

    const colWidths = [34, ...classDays.map(()=>6), 16, 12, 18, 28];
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
  const exportPDF = async () => {
    setPdfGenerating(true);

    // junta o código do professor por turno (só turnos que têm código)
    const shiftsWithCode = SHIFTS
      .map(sh => ({ ...sh, files: (proFilesByShift[sh.id]||[]).filter(f => (f.code||"").trim()) }))
      .filter(sh => sh.files.length > 0);
    if (shiftsWithCode.length === 0) {
      setPdfMsg('⚠ Programe o exemplo na aba "Meu código" primeiro — o PDF usa o código do professor, não o dos alunos.');
      setPdfGenerating(false);
      return;
    }

    setPdfMsg("🧠 O Nyx está escrevendo as explicações dos códigos...");
    // explicação de todos os códigos, pedida ao Nyx (um pedido por turno, em paralelo)
    let aiOffline = false;
    const explains = await Promise.all(shiftsWithCode.map(async (sh) => {
      const code = sh.files.map(f => `// ===== ${f.name} =====\n${f.code}`).join("\n\n");
      try {
        return await askClaudeJson(
          `Este é o código C# de exemplo que o professor escreveu para a turma ${sh.label} (pode ter vários arquivos):\n\`\`\`csharp\n${code}\n\`\`\`\n\nCrie uma explicação COMPLETA e didática desse código, para iniciantes que vão receber este material por escrito e estudar sozinhos. Percorra o código NA ORDEM em que ele aparece.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "intro": "1 a 2 frases dizendo o que esse código faz como um todo",\n  "secoes": [ { "titulo": "nome curto do conceito/parte", "explicacao": "explicação clara de 2 a 4 frases, em português simples", "exemplo": "trecho C# bem curto ilustrando (opcional — use \\n pra quebrar linha)" } ],\n  "dica": "1 frase final incentivando o estudo"\n}\n\nFaça uma seção para cada parte ou conceito importante (entre 4 e 10 seções). Garanta JSON válido.`,
          "Você é um professor de C# paciente escrevendo um material de estudo por escrito para iniciantes. Português correto e simples. Responda APENAS JSON puro válido."
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
      doc.setFillColor(...hexRgb("#12162e")); doc.rect(0, 0, pageW, pageH, "F");
      doc.setFillColor(...hexRgb("#1b2144"));
      doc.circle(pageW - 60, 90, 130, "F");
      doc.circle(40, pageH - 80, 100, "F");
      doc.setFillColor(...hexRgb("#fbbf24")); doc.roundedRect(margin, 240, 64, 7, 3, 3, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(38); doc.setTextColor(255, 255, 255);
      doc.text("Aula de C#", margin, 292);
      doc.setFont("helvetica", "normal"); doc.setFontSize(16); doc.setTextColor(...hexRgb("#aeb6e8"));
      doc.text("Códigos do curso e explicações do Nyx", margin, 318);
      doc.setFontSize(11.5); doc.setTextColor(...hexRgb("#7c86c4"));
      const dataBr = new Date().toLocaleDateString("pt-BR");
      doc.text(clean(`${meta.city ? meta.city + "  •  " : ""}Gerado em ${dataBr}`), margin, 344);
      doc.setFont("courier", "normal"); doc.setFontSize(10); doc.setTextColor(...hexRgb("#4a5388"));
      doc.text('Console.WriteLine("Bons estudos!");', margin, pageH - 70);

      // ── CONTEÚDO (um capítulo por turno) ──
      shiftsWithCode.forEach((sh, idx) => {
        const accent = sh.id === "matutino" ? "#f59e0b" : "#7c83ff";
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

      doc.save(`codigos-do-curso-${todayKey()}.pdf`);
      setPdfMsg(aiOffline ? "✅ PDF gerado (sem as explicações — o Nyx estava offline)." : "✅ PDF gerado!");
    } catch {
      setPdfMsg("❌ Não consegui gerar o PDF agora. Tente de novo.");
    }
    setPdfGenerating(false);
  };

  // ── gestão de alunos: renomear, mover de turno, corrigir nota, excluir ──
  const flashMgmt = (msg) => { setMgmtMsg(msg); setTimeout(()=>setMgmtMsg(""), 6000); };

  const doRenameStudent = async (s) => {
    const newName = renameVal.trim();
    if (!s || !newName || newName === s.name) return;
    if (students.some(x => x.name === newName && (x.shift||"sem-turno") === (s.shift||"sem-turno"))) { flashMgmt("❌ Já existe um aluno com esse nome nessa turma."); return; }
    await saveStudent(s.shift, newName, { ...s, name: newName });
    await deleteStudentProfile(s.shift, s.name, teacherAuth);
    await setKick(s.shift, s.name, teacherAuth); // se estiver online, a sessão antiga sai (ele entra de novo com o nome novo)
    setSelected(newName); setRenameVal("");
    flashMgmt(`✅ Renomeado para ${newName}. Se estiver online, ele vai precisar entrar de novo.`);
    load();
  };

  const doMoveStudent = async (s, newShift) => {
    if (!s || !newShift || newShift === (s.shift||"sem-turno")) return;
    await saveStudent(newShift, s.name, { ...s, shift: newShift });
    await deleteStudentProfile(s.shift, s.name, teacherAuth);
    await setKick(s.shift, s.name, teacherAuth);
    flashMgmt(`✅ Movido para ${shiftLabel(newShift)}. Se estiver online, ele vai precisar entrar de novo.`);
    load();
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
    await deleteStudentProfile(s.shift, s.name, teacherAuth);
    await setKick(s.shift, s.name, teacherAuth);
    setSelected(null); setConfirmDelete(false);
    flashMgmt("");
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
    const examShifts = examShift === "all" ? ["matutino","vespertino"] : [examShift];
    const proCode = examShifts.flatMap(sh => proFilesByShift[sh]||[]).map(f => (f.code||"")).join("\n").trim();
    const examStudents = examShift === "all" ? students : students.filter(s=>(s.shift||"sem-turno")===examShift);
    // pega o código de TODOS os arquivos que cada aluno escreveu ao longo da aula (não só um trecho)
    const studentCodes = examStudents
      .map(s => (Array.isArray(s.files) && s.files.length) ? s.files.map(f=>f.code||"").join("\n") : (s.code||""))
      .filter(c => c.trim().length > 5)
      .join("\n\n")
      .slice(0, 8000);
    const codeCtx = [proCode, studentCodes].filter(Boolean).join("\n\n");
    if (!codeCtx) { setExamMsg(`Escreva o código de exemplo na aba Meu código (turma ${examShift==="all"?"Manhã ou Tarde":shiftMeta(examShift).label}) primeiro!`); return; }
    setExamGenerating(true); setExamMsg("Gerando resumo...");
    try {
      const summaryResult = await askClaude(
        `Aqui está o código C# que a turma escreveu ao longo de toda a aula de hoje (exemplo do professor e/ou código dos alunos):\n\`\`\`csharp\n${codeCtx}\n\`\`\`\n\nCrie um RESUMO DE REVISÃO em tópicos claros (máximo 8 tópicos) cobrindo os principais conceitos vistos durante a aula, para os alunos estudarem antes de uma prova. Cada tópico: emoji + nome do conceito + explicação simples de 1 frase + exemplo curto. Português simples. Sem markdown pesado, use • para tópicos.`,
        "Você cria resumos de revisão de C# para alunos iniciantes. Português simples."
      );
      setExamMsg("Gerando questões...");
      const questionsResult = await askClaude(
        `Aqui está o código C# que a turma escreveu ao longo de TODA a aula de hoje (exemplo do professor e/ou código dos alunos):\n\`\`\`csharp\n${codeCtx}\n\`\`\`\n\nCrie entre 20 e 25 questões de múltipla escolha cobrindo os CONCEITOS que apareceram durante o processo inteiro da aula (não só o trecho final) — o que faz cada palavra-chave/instrução, para que serve cada estrutura, o papel de cada símbolo, o que acontece ao executar cada parte. Varie a dificuldade e não repita a mesma pergunta com outras palavras. NÃO faça perguntas de matemática. Responda APENAS JSON puro sem markdown:\n{"questions":[{"q":"pergunta","opts":["A","B","C","D"],"correct":0}]}`,
        "Crie questões de múltipla escolha sobre C#. APENAS JSON puro sem markdown."
      );
      const parsed = extractJson(questionsResult);
      const newConfig = { status: 'review', questions: shuffleQuestions(parsed.questions), summary: summaryResult.trim(), shift: examShift, startedAt: Date.now() };
      await setExamState(newConfig, teacherAuth);
      setExamConfig(newConfig);
      setExamMsg("✅ Prova criada! Os alunos estão revisando. Quando todos estiverem prontos, clique em Iniciar Agora.");
    } catch(e) { setExamMsg("Erro ao gerar a prova. Tente de novo."); }
    setExamGenerating(false);
  };

  const activateExam = async () => {
    const newConfig = { ...examConfig, status: 'active', activatedAt: Date.now() };
    await setExamState(newConfig, teacherAuth);
    setExamConfig(newConfig);
    setExamMsg("✅ Prova iniciada! Os alunos estão respondendo.");
  };

  const endExam = async () => {
    const newConfig = { ...examConfig, status: 'done', endedAt: Date.now() };
    await setExamState(newConfig, teacherAuth);
    setExamConfig(newConfig);
    setExamMsg("✅ Prova encerrada! Veja o ranking abaixo.");
    setConfirmEndExam(false);
  };

  const resetExam = async () => {
    await setExamState({ status: 'idle' }, teacherAuth);
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
  const isOnline = (s) => s.lastSeen && (now - s.lastSeen) < 9000;
  // a atividade concluída "vale" até as 9h da manhã do dia seguinte, mesmo que o aluno volte à tela inicial
  const effectivePhase = s => (s.phase !== "done" && isDoneActive(s.doneAt)) ? "done" : s.phase;
  const phaseLabel = p => ({coding:"Codando",generating:"Gerando",summary:"No Resumo",activity:"Na Atividade",done:"Concluído"})[p]||"Aguardando";
  const phaseColor = p => ({coding:"#7c83ff",generating:"#fbbf24",summary:"#fbbf24",activity:"#3b82f6",done:"#34d399"})[p]||"#96a0cc";
  const hhmm = t => t ? new Date(t).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "—";
  const hhmmss = t => t ? new Date(t).toLocaleTimeString("pt-BR") : "—";
  const dataHora = t => t ? new Date(t).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

  // filtro por turno
  const shown = shiftFilter==="all" ? students : students.filter(s => (s.shift||"sem-turno")===shiftFilter);
  const sorted = [...shown].sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt-BR"));
  const sel = selected ? students.find(s=>s.name===selected) : null;
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
  // 👀 anti-cola: decide a defesa do aluno (aceitar devolve os pontos; recusar mantém o desconto)
  const decideAppeal = async (s, accept) => {
    if (accept) await setScoreFix(s.shift, s.name, { kind: "exam", score: s.examScoreRaw ?? s.examScore ?? 0 }, teacherAuth);
    else await setScoreFix(s.shift, s.name, { kind: "exam-appeal-rejected" }, teacherAuth);
    setExamMsg(accept ? `✅ Pontos da prova devolvidos pra ${s.name}.` : `Desconto mantido pra ${s.name}.`);
    setTimeout(() => setExamMsg(""), 6000);
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
      const data = await exportAllData();
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
    container:{ minHeight:"100vh", background:PAGE_BG, color:"#e8ebfa", fontFamily:FONT },
    header:{ background:"rgba(17,21,42,.85)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #2a3154", boxShadow:"0 1px 0 #fbbf2433, 0 8px 24px rgba(3,5,16,.35)", position:"sticky", top:0, zIndex:40, flexWrap:"wrap", gap:8 },
    card:{ background:"linear-gradient(180deg,#181d38,#131730)", borderRadius:16, padding:16, margin:"10px 0", border:"1px solid #272e52", boxShadow:"0 8px 24px rgba(3,5,16,.35)", animation:"rise .35s ease both" },
    btn:(c)=>({ background:`linear-gradient(135deg, ${c}, ${shade(c,-0.18)})`, color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:800, boxShadow:`0 4px 14px ${c}44` }),
    badge:(c)=>({ background:c+"22", color:c, padding:"2px 10px", borderRadius:12, fontSize:12, fontWeight:700 }),
    tab:(on)=>({ background:on?"linear-gradient(135deg,#fbbf24,#f59310)":"transparent", color:on?"#1c1400":"#96a0cc", border:`1px solid ${on?"#fbbf24":"#2a3154"}`, borderRadius:10, padding:"6px 14px", cursor:"pointer", fontWeight:800, fontSize:13, boxShadow:on?"0 4px 12px #fbbf2433":"none" }),
  };
  const dot = (on) => (<span style={{ width:9, height:9, borderRadius:"50%", background:on?"#34d399":"#5d679c", display:"inline-block", marginRight:6, boxShadow:on?"0 0 6px #34d399":"none", ...(on?{animation:"live-dot 2s ease-in-out infinite"}:{}) }}/>);

  return (
    <div style={styles.container}>
      {aiDown && (
        <div style={{ position:"fixed", top:12, left:12, zIndex:1200, background:"#181d38", border:"1px solid #fbbf24", borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
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
            <span style={{ color:"#96a0cc", marginLeft:12, fontSize:12 }}>
              ● ao vivo · {lastUpdate}{meta.city?` · 📍 ${meta.city}`:""}
              {(todayContentM||todayContentV) ? ` · 📖 ${[todayContentM&&`☀️ ${todayContentM}`, todayContentV&&`🌙 ${todayContentV}`].filter(Boolean).join(" · ")}` : ""}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap: tab==="code" ? 5 : 8, flexWrap:"wrap" }}>
          <button style={{ ...styles.tab(tab==="monitor"), ...(tab==="code"?{padding:"4px 9px",fontSize:12}:{}) }} onClick={()=>setTab("monitor")}>👥 Monitoramento</button>
          <button style={{ ...styles.tab(tab==="code"), ...(tab==="code"?{padding:"4px 9px",fontSize:12}:{}) }} onClick={()=>setTab("code")}>👨‍💻 Meu código</button>
          <button style={{ ...styles.tab(tab==="calendar"), ...(tab==="code"?{padding:"4px 9px",fontSize:12}:{}) }} onClick={()=>setTab("calendar")}>🗓️ Calendário</button>
          <button style={{ ...styles.tab(tab==="feedback"), ...(tab==="code"?{padding:"4px 9px",fontSize:12}:{}) }} onClick={()=>setTab("feedback")}>💬 Feedback ({feedbacks.length})</button>
          <button style={{ ...styles.tab(tab==="exam"), ...(examConfig.status!=='idle' && tab!=="exam" ? {borderColor:"#fbbf24",color:"#fbbf24"} : {}), ...(tab==="code"?{padding:"4px 9px",fontSize:12}:{}) }} onClick={()=>setTab("exam")}>🏆 Prova{examConfig.status!=='idle'?' ●':''}</button>
          {tab!=="code" && <button style={styles.btn("#22d3ee")} onClick={()=>setShowTelao(true)} title="Tela cheia pra projetar: ranking, meta da turma e combos">🖥️ Telão</button>}
          {tab!=="code" && <button style={styles.btn("#f87171")} onClick={()=>{ setResetScope(shiftFilter); setConfirmReset(true); }} disabled={resetting}>{resetting?"Resetando...":"🔄 Resetar"}</button>}
          <button style={{ ...styles.btn("#5d679c"), fontSize: tab==="code" ? 12 : 13, ...(tab==="code"?{padding:"4px 10px"}:{}) }} onClick={onLogout}>Sair</button>
        </div>
      </div>

      {/* filtro de turno (vale para monitoramento, chamada, situação e feedback) */}
      {tab!=="code" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ color:"#96a0cc", fontSize:13 }}>Turma:</span>
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
        </div>
      )}

      {/* aviso de resultado do reset */}
      {resetMsg && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#151a31", border:`1px solid ${resetMsg.startsWith("✅")?"#34d399":"#f87171"}`, color:resetMsg.startsWith("✅")?"#34d399":"#f87171", borderRadius:10, padding:"10px 14px", fontSize:14 }}>{resetMsg}</div>
        </div>
      )}

      {showTelao && <TelaoModal students={students} shift={shiftFilter} onClose={()=>setShowTelao(false)} teacherAuth={teacherAuth} />}
      {showTripOverview && <TripOverviewModal entries={tripHallEntries} onClose={()=>setShowTripOverview(false)} />}

      {/* biblioteca de aulas: as SUAS aulas salvas (o seu código) + modelos de exemplo */}
      {showLessons && (
        <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:640, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#34d399,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📚 Minhas aulas</h2>
              <button onClick={()=>setShowLessons(false)} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
            </div>
            <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 14px" }}>Sua biblioteca: salve o código que está no editor com um nome e reutilize em qualquer turma, quantas vezes quiser. Carregar uma aula <b>substitui</b> o código atual da turma {shiftMeta(codeShift).label}.</p>

            {/* salvar a aula atual */}
            <div style={{ background:"#0d1122", border:"1px dashed #34d399", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
              <p style={{ color:"#34d399", fontSize:12.5, fontWeight:800, margin:"0 0 8px" }}>💾 Salvar o código atual ({shiftMeta(codeShift).label}) como aula</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <input value={lessonName} onChange={e=>setLessonName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveCurrentLesson()} placeholder={`Nome da aula (ex: Variáveis e ReadLine)`}
                  style={{ flex:"1 1 220px", background:"#131730", border:"1px solid #2a3154", borderRadius:10, padding:"8px 12px", color:"#e8ebfa", fontSize:13, outline:"none" }} />
                <button onClick={saveCurrentLesson} style={{ ...styles.btn("#34d399"), padding:"8px 14px", fontSize:12.5 }}>💾 Salvar</button>
              </div>
            </div>

            {/* aulas salvas */}
            {myLessons.length === 0 ? (
              <p style={{ color:"#5d679c", fontSize:13, marginBottom:14 }}>Você ainda não salvou nenhuma aula. Programe na aba Meu código e clique em Salvar acima — ela aparece aqui pra sempre.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                {myLessons.map((lesson, li) => (
                  <div key={li} style={{ display:"flex", alignItems:"center", gap:10, background:"#0d1122", border:"1px solid #2a3154", borderRadius:12, padding:"10px 14px", flexWrap:"wrap" }}>
                    <div style={{ flex:"1 1 220px" }}>
                      <p style={{ color:"#e8ebfa", fontWeight:800, fontSize:13.5, margin:0 }}>{lesson.title}</p>
                      <p style={{ color:"#5d679c", fontSize:11.5, margin:"3px 0 0" }}>salva em {new Date(lesson.at).toLocaleDateString("pt-BR")} · {lesson.files.length} arquivo{lesson.files.length!==1?"s":""}</p>
                    </div>
                    <button onClick={()=>{ setProFiles(lesson.files.map(f => ({ ...f }))); setShowLessons(false); setNameMsg(`✅ "${lesson.title}" carregada na turma ${shiftMeta(codeShift).label}! O código já está no editor.`); setTimeout(()=>setNameMsg(""), 7000); }}
                      style={{ ...styles.btn("#34d399"), padding:"7px 14px", fontSize:12.5 }}>Usar esta aula →</button>
                    <button onClick={()=>deleteLesson(li)} title="Excluir esta aula da biblioteca" style={{ background:"transparent", border:"1px solid #f8717155", color:"#f87171", borderRadius:8, padding:"6px 10px", fontSize:12, cursor:"pointer" }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* modelos de exemplo (secundário, recolhido) */}
            <button onClick={()=>setShowModels(v=>!v)} style={{ background:"transparent", border:"1px solid #2a3154", color:"#96a0cc", borderRadius:10, padding:"7px 14px", fontSize:12.5, cursor:"pointer", width:"100%" }}>
              {showModels ? "▾" : "▸"} Modelos de exemplo do Nyx ({LESSON_LIBRARY.length}) — ponto de partida, se quiser
            </button>
            {showModels && (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:10 }}>
                {LESSON_LIBRARY.map((lesson, li) => (
                  <div key={li} style={{ display:"flex", alignItems:"center", gap:10, background:"#0d1122", border:"1px solid #2a3154", borderRadius:12, padding:"10px 14px", flexWrap:"wrap" }}>
                    <div style={{ flex:"1 1 260px" }}>
                      <p style={{ color:"#e8ebfa", fontWeight:800, fontSize:13.5, margin:0 }}>{lesson.title}</p>
                      <p style={{ color:"#96a0cc", fontSize:12, margin:"3px 0 0" }}>{lesson.desc}</p>
                    </div>
                    <button onClick={()=>{ setProFiles(lesson.files.map(f => ({ ...f }))); setShowLessons(false); setNameMsg(`✅ "${lesson.title}" carregada na turma ${shiftMeta(codeShift).label}! O código já está no editor.`); setTimeout(()=>setNameMsg(""), 7000); }}
                      style={{ ...styles.btn("#2a3154"), padding:"7px 14px", fontSize:12.5 }}>Usar este modelo →</button>
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
          <div style={{ background:"#151a31", border:"2px solid #f87171", borderRadius:16, padding:24, maxWidth:440, width:"100%" }}>
            <div style={{ fontSize:40, textAlign:"center" }}>⚠️</div>
            <h3 style={{ color:"#f87171", textAlign:"center", margin:"8px 0" }}>Resetar perfis dos alunos?</h3>
            <p style={{ color:"#c7cfee", fontSize:14, lineHeight:1.6, textAlign:"center" }}>Isso apaga os alunos escolhidos e tudo o que eles fizeram (códigos, atividades e feedbacks). O calendário, a cidade e os nomes de conteúdo <b>não</b> são apagados. Não dá para desfazer.</p>
            <button onClick={exportBackup} disabled={backupBusy} style={{ ...styles.btn("#34d399"), width:"100%", padding:"9px 0", fontSize:13, margin:"10px 0 4px", opacity:backupBusy?0.7:1 }}>
              {backupBusy ? "⏳ Gerando backup..." : "📦 Baixar backup completo antes de apagar (recomendado)"}
            </button>
            <p style={{ color:"#96a0cc", fontSize:13, margin:"14px 0 6px" }}>O que você quer resetar?</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={()=>setResetScope("all")} style={{ ...styles.tab(resetScope==="all"), flex:"1 1 120px" }}>Todos os turnos</button>
              {SHIFTS.map(sh => (
                <button key={sh.id} onClick={()=>setResetScope(sh.id)} style={{ ...styles.tab(resetScope===sh.id), flex:"1 1 120px" }}>Só {sh.emoji} {sh.label}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={()=>setConfirmReset(false)} style={{ ...styles.btn("#2a3154"), flex:1 }}>Cancelar</button>
              <button onClick={doReset} style={{ ...styles.btn("#f87171"), flex:1 }}>{resetScope==="all"?"Resetar todos":`Resetar ${shiftMeta(resetScope).label}`}</button>
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
            <div className="cardfx" style={{ ...styles.card, textAlign:"center", borderColor: needHelp.length>0 ? "#f87171" : "#272e52" }}>
              <NyxRobot state={needHelp.length>0 ? "error" : shown.length>0 ? "ok" : "idle"} size={64} showName={false} />
              <div style={{ fontWeight:900, letterSpacing:2, fontSize:12, color:"#fbbf24", marginTop:2 }}>NYX DE OLHO</div>
              <p style={{ color: needHelp.length>0 ? "#fca5a5" : "#96a0cc", fontSize:13, lineHeight:1.6, margin:"6px 0 0" }}>
                {needHelp.length > 0
                  ? <>⚠ Atenção com: <b style={{color:"#e8ebfa"}}>{needHelp.slice(0,4).map(s=>String(s.name).split(" ")[0]).join(", ")}{needHelp.length>4 ? ` e mais ${needHelp.length-4}` : ""}</b> — clique no aluno para ver o que houve.</>
                  : shown.length > 0 ? "Turma indo bem! Ninguém travado no momento. 👍" : "Aguardando alunos entrarem..."}
              </p>
            </div>

            {/* Chamada — separada por turno */}
            <div className="cardfx" style={styles.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                <h3 style={{ color:"#fbbf24" }}>📋 Lista de Chamada</h3>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={styles.badge("#34d399")}>{present} online / {shown.length}</span>
                  <button onClick={async ()=>{ await Promise.all(shown.map(s=>setKeyboardLaunch(s.shift, s.name, teacherAuth))); flashMgmt(`⌨️ Tutorial de teclado aberto pra ${shown.length} aluno(s).`); }} style={{ ...styles.btn("#22d3ee"), padding:"5px 10px", fontSize:12 }} title="Abre o tutorial de teclado na tela de todos os alunos filtrados">⌨️ Abrir teclado pra todos</button>
                </div>
              </div>
              {shown.length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>Nenhum aluno na chamada ainda.</p> : (
                chamadaGroups.map((g, gi) => (
                  <div key={g.shift.id} style={{ marginTop: gi>0 ? 18 : 0, paddingTop: gi>0 ? 16 : 0, borderTop: gi>0 ? "1px solid #2a3154" : "none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <b style={{ color:"#e8ebfa", fontSize:14 }}>{g.shift.emoji} {g.shift.label}</b>
                      <span style={styles.badge("#34d399")}>{g.online} online / {g.list.length}</span>
                    </div>
                    {g.list.length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>Nenhum aluno nesta turma ainda.</p> : (
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
                              <div key={s.name} className="tilefx" style={{ background:"#0d1122", border:`1px solid ${st==="absent"?"#3f2530":"#2a3154"}`, borderRadius:8, padding:"8px 10px", opacity:st==="absent"?0.7:1, animationDelay:`${Math.min(tileIdx*45, 500)}ms` }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <Avatar cfg={s.avatar} size={28} />
                                  <span style={{ fontSize:14, flex:1 }}>{dot(isOnline(s))}{s.name}</span>
                                  <span style={{ color:"#5d679c", fontSize:11 }}>{hhmm(s.joinedAt)}</span>
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, flexWrap:"wrap" }}>
                                  <span style={styles.badge(stColor)}>{stLabel}</span>
                                  {st==="idle" && (
                                    nudged[s.name]
                                      ? <span style={{ color:"#34d399", fontSize:11, fontWeight:600 }}>aviso enviado ✓</span>
                                      : <button onClick={()=>nudgeStudent(s)} style={{ background:"transparent", color:"#fbbf24", border:"1px solid #fbbf24", borderRadius:8, padding:"2px 8px", fontSize:11, fontWeight:600, cursor:"pointer" }}>👀 Enviar aviso</button>
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
            </div>

            <div className="cardfx" style={styles.card}>
              <h4 style={{ color:"#fbbf24", marginBottom:10, fontSize:14 }}>📊 Turma hoje</h4>
              {/* conta só quem entrou HOJE — no dia seguinte, antes de alguém entrar, fica tudo no 0 */}
              {["coding","summary","activity","done"].map(p=>(
                <div key={p} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:phaseColor(p), fontSize:13 }}>{phaseLabel(p)}</span>
                  <span style={styles.badge(phaseColor(p))}>{todayStudents.filter(s=>dayPhase(s)===p).length}</span>
                </div>
              ))}
              <hr style={{ borderColor:"#2a3154", margin:"8px 0" }}/>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#96a0cc", fontSize:13 }}>Média de hoje</span>
                <span style={{ color:"#34d399", fontWeight:700 }}>{(() => {
                  const done = todayStudents.filter(s => s.score!=null && isSameDayTs(s.doneAt));
                  return done.length > 0 ? Math.round(done.reduce((a,s)=>a+s.score,0)/done.length)+" pts" : "—";
                })()}</span>
              </div>
              <button onClick={exportCSV} style={{ ...styles.btn("#2a3154"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Baixa uma planilha colorida e organizada por turno (abre no Excel), com presenças, notas e situação de cada aluno (sem a turma de teste)">
                ⬇️ Exportar planilha (Excel)
              </button>
              <button onClick={exportPDF} disabled={pdfGenerating} style={{ ...styles.btn("#7c83ff"), width:"100%", marginTop:8, padding:"7px 0", fontSize:12.5, opacity: pdfGenerating ? 0.7 : 1 }} title="Gera um material de estudo em PDF: o código do professor (aba Meu código) com as explicações do Nyx — sem nome de aluno, pronto pra enviar pra turma toda">
                {pdfGenerating ? "⏳ Gerando PDF..." : "📄 Exportar PDF (códigos + explicações)"}
              </button>
              {pdfMsg && <p style={{ color: pdfMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:11.5, marginTop:6 }}>{pdfMsg}</p>}
              <button onClick={exportBackup} disabled={backupBusy} style={{ ...styles.btn("#34d399"), width:"100%", marginTop:8, padding:"7px 0", fontSize:12.5, opacity:backupBusy?0.7:1 }} title="Baixa um arquivo com TUDO (alunos, notas, presenças, códigos, configurações) — guarde antes de resetar ou trocar de cidade">
                {backupBusy ? "⏳ Gerando backup..." : "📦 Baixar backup completo"}
              </button>
            </div>

            <div className="cardfx" style={{ ...styles.card, fontSize:12 }}>
              <h4 style={{ color:"#fbbf24", fontSize:13, marginBottom:6 }}>🔧 Conexão</h4>
              {diag ? (
                <div style={{ color:"#c7cfee", lineHeight:1.7 }}>
                  <div>
                    Armazenamento: <b style={{ color:diag.hasStorage?"#34d399":"#f87171" }}>{diag.hasStorage?"OK":"NÃO"}</b>
                    {diag.writeRead!=="—" && <> · <b style={{ color:diag.writeRead==="ok"?"#34d399":"#f87171" }}>{diag.writeRead}</b></>}
                  </div>
                  <div>Nyx (IA): <b style={{ color:diag.hasAI===true?"#34d399":diag.hasAI===false?"#f87171":"#96a0cc" }}>{diag.hasAI===true?"OK":diag.hasAI===false?"NÃO":"—"}</b></div>

                  {!diag.hasStorage && (
                    <div style={{ background:"#f8717115", border:"1px solid #f87171", borderRadius:8, padding:"10px 12px", marginTop:8, lineHeight:1.9 }}>
                      <b style={{ color:"#f87171" }}>❌ Banco não configurado</b><br/>
                      <span style={{ color:"#96a0cc" }}>
                        No Supabase → <b style={{color:"#e8ebfa"}}>Settings → API</b>:<br/>
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
                      <pre style={{ background:"#0d1122", borderRadius:6, padding:"8px 10px", margin:"6px 0", fontSize:11, color:"#22d3ee", overflowX:"auto", userSelect:"all" }}>{dbSetupSQL.sql}</pre>
                      <a href={dbSetupSQL.sqlEditorUrl} target="_blank" rel="noreferrer"
                        style={{ display:"inline-block", background:"#3b82f6", color:"#fff", borderRadius:6, padding:"4px 12px", fontSize:12, textDecoration:"none", marginRight:8 }}>
                        Abrir SQL Editor →
                      </a>
                      <span style={{color:"#96a0cc",fontSize:11}}>Cole o SQL acima, clique Run, depois ↻ Verificar agora</span>
                    </div>
                  )}

                  {diag.hasAI === false && (
                    <div style={{ background:"#fbbf2415", border:"1px solid #fbbf24", borderRadius:8, padding:"10px 12px", marginTop:8, lineHeight:1.8 }}>
                      <b style={{ color:"#fbbf24" }}>⚠ Nyx (IA) sem chave de API</b><br/>
                      <span style={{ color:"#96a0cc" }}>
                        Escolha UMA opção e adicione no Vercel → Settings → Environment Variables:<br/>
                        &nbsp;• <b style={{color:"#e8ebfa"}}>NVIDIA</b>: build.nvidia.com → adicione <code style={{color:"#60a5fa"}}>NVIDIA_API_KEY</code> + <code style={{color:"#60a5fa"}}>NVIDIA_MODEL</code><br/>
                        &nbsp;• <b style={{color:"#e8ebfa"}}>Claude</b>: console.anthropic.com → adicione <code style={{color:"#60a5fa"}}>ANTHROPIC_API_KEY</code><br/>
                        Depois é só dar <b style={{color:"#e8ebfa"}}>Redeploy</b>.
                      </span>
                    </div>
                  )}
                </div>
              ) : <span style={{ color:"#5d679c" }}>verificando...</span>}
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
                <button style={{ ...styles.btn("#2a3154"), padding:"4px 10px", fontSize:12 }} onClick={()=>{ setDbSetupSQL(null); setDbSetupMsg(""); diagnose().then(setDiag); load(); }}>↻ Verificar agora</button>
                <button style={{...styles.btn("#166534"),padding:"4px 10px",fontSize:12,opacity:dbSetupLoading?0.6:1}} onClick={setupDb} disabled={dbSetupLoading}>{dbSetupLoading?"...":"🔧 Inicializar banco"}</button>
              </div>
              {dbSetupMsg && (
                <p style={{color:dbSetupMsg.startsWith("✅")?"#34d399":dbSetupMsg.startsWith("Cole")?"#93c5fd":"#f87171",fontSize:12,marginTop:6}}>{dbSetupMsg}</p>
              )}
            </div>

            <div className="cardfx" style={{ ...styles.card, fontSize:12 }}>
              <h4 style={{ color:"#fbbf24", fontSize:13, marginBottom:6 }}>📖 Conteúdo de hoje</h4>
              {todayContentM
                ? <p style={{ color:"#34d399", fontSize:13, fontWeight:600, lineHeight:1.5, margin:0 }}>☀️ Manhã: {todayContentM}</p>
                : <p style={{ color:"#96a0cc", fontSize:12.5, lineHeight:1.5, margin:0 }}>☀️ Manhã: ainda não definido</p>}
              {todayContentV
                ? <p style={{ color:"#34d399", fontSize:13, fontWeight:600, lineHeight:1.5, margin:"4px 0 0" }}>🌙 Tarde: {todayContentV}</p>
                : <p style={{ color:"#96a0cc", fontSize:12.5, lineHeight:1.5, margin:"4px 0 0" }}>🌙 Tarde: ainda não definido</p>}
              <p style={{ color:"#5d679c", fontSize:11.5, lineHeight:1.5, margin:"8px 0 0" }}>Programe o exemplo na aba <b>Meu código</b> e gere um nome automático. (Se ainda não programou, uso o código dos alunos.)</p>
              <button style={{ ...styles.btn("#7c83ff"), padding:"6px 12px", fontSize:13, marginTop:8, width:"100%", opacity:genName?0.6:1 }} onClick={generateContentNameFiltered} disabled={genName}>{genName?"Gerando...":"✨ Gerar nome do conteúdo"}</button>
              {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:12, marginTop:8, lineHeight:1.5 }}>{nameMsg}</p>}
            </div>
          </div>

          {/* direita */}
          <div style={{ flex:"1 1 420px", minWidth:300 }}>
            <div className="cardfx" style={styles.card}>
              <h3 style={{ color:"#fbbf24", marginBottom:12 }}>👥 Monitoramento ({shown.length})</h3>
              {shown.length===0 && <p style={{ color:"#5d679c", fontSize:13 }}>{students.length===0 ? "Aguardando alunos entrarem..." : "Nenhum aluno nesta turma. Veja outra turma no filtro acima."}</p>}
              <div style={{ maxHeight:400, overflowY:"auto", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(128px,1fr))", gap:8 }}>
                {sorted.map((s, tileIdx)=>{
                  const d = difficultyOf(s);
                  const hasHand = s.helpAt && Date.now() - s.helpAt < 15 * 60 * 1000; // pedido de ajuda expira em 15 min
                  const hasError = s.errorAt && Date.now() - s.errorAt < 30 * 60 * 1000; // aviso de erro expira em 30 min
                  return (
                    <div key={s.name} className="tilefx" onClick={()=>setSelected(s.name===selected?null:s.name)} style={{ position:"relative", background:selected===s.name?"#7c83ff22":hasHand?"#fbbf2415":hasError?"#f8717115":"#0d1122", border:`2px solid ${selected===s.name?"#7c83ff":hasHand?"#fbbf24":hasError?"#f87171":"#2a3154"}`, borderRadius:10, padding:"10px 10px 8px", cursor:"pointer", textAlign:"center", animationDelay:`${Math.min(tileIdx*45, 500)}ms` }}>
                      {hasHand && <span title="Pediu ajuda! Clique pra ver e marcar como atendido." style={{ position:"absolute", top:4, right:24, fontSize:15, animation:"pulse-dot 1s ease-in-out infinite" }}>✋</span>}
                      {hasError && <span title={`A tela deu um erro: ${s.errorMsg || "sem detalhes"}`} style={{ position:"absolute", top:4, right: hasHand?42:24, fontSize:15 }}>⚠️</span>}
                      {s.score!=null && <span style={{ position:"absolute", top:6, left:6, background:"#34d39922", border:"1px solid #34d399", color:"#34d399", borderRadius:6, padding:"1px 6px", fontSize:10.5, fontWeight:800 }}>🏆 {s.score}</span>}
                      {Object.values(supportMap[`${s.shift||"sem-turno"}:${s.name}`] || {}).some(Boolean) && (
                        <span title="Aluno com perfil de apoio ativo (clique pra ver no detalhe)" style={{ position:"absolute", bottom:6, left:6, fontSize:11 }}>💙</span>
                      )}
                      <span style={{ position:"absolute", top:8, right:8 }}>{dot(isOnline(s))}</span>
                      <div style={{ marginTop:s.score!=null?16:4 }}>
                        <Avatar cfg={s.avatar} size={44} />
                      </div>
                      <div style={{ fontWeight:700, fontSize:12.5, marginTop:6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.name}</div>
                      <div style={{ marginTop:4 }}>
                        <span style={{ ...styles.badge(phaseColor(effectivePhase(s))), fontSize:10.5 }}>{phaseLabel(effectivePhase(s))}</span>
                      </div>
                      <div style={{ marginTop:5 }}>
                        <span style={{ ...styles.badge(d.level==="dif"?"#f87171":d.level==="bem"?"#34d399":"#96a0cc"), fontSize:10.5 }}>{d.level==="dif"?"⚠ Com dificuldade":d.level==="bem"?"✅ Indo bem":"• Começando"}</span>
                      </div>
                      <div style={{ color:"#5d679c", fontSize:10.5, marginTop:5 }}>visto {hhmmss(s.lastSeen)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resumo automático (sem clicar em nada — só agregação dos dados) */}
            <div className="cardfx" style={{ ...styles.card, borderColor:"#7c83ff" }}>
              <h3 style={{ color:"#7c83ff", marginBottom:10 }}>📋 Resumo automático</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:13 }}>
                <div style={{ color: absentList.length ? "#f87171" : "#5d679c" }}>
                  {absentList.length > 0
                    ? <>🚫 <b>{absentList.length}</b> ausente{absentList.length>1?"s":""} hoje: {absentList.slice(0,5).map(s=>String(s.name).split(" ")[0]).join(", ")}{absentList.length>5?` e mais ${absentList.length-5}`:""}</>
                    : "✅ Ninguém ausente hoje nessa turma"}
                </div>
                <div style={{ color: needHelp.length ? "#fbbf24" : "#5d679c" }}>
                  {needHelp.length > 0
                    ? <>⚠ <b>{needHelp.length}</b> com dificuldade agora: {needHelp.slice(0,5).map(s=>String(s.name).split(" ")[0]).join(", ")}{needHelp.length>5?` e mais ${needHelp.length-5}`:""}</>
                    : "✅ Ninguém com dificuldade agora"}
                </div>
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
                  {goingWell.length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>—</p> : goingWell.map(s=>(
                    <div key={s.name} style={{ fontSize:13, color:"#c7cfee", marginBottom:4 }}>• <b>{s.name}</b>: {difficultyOf(s).text}</div>
                  ))}
                </div>
                <div style={{ flex:"1 1 200px" }}>
                  <p style={{ color:"#f87171", fontWeight:700, marginBottom:6 }}>⚠ Precisam de ajuda ({needHelp.length})</p>
                  {needHelp.length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>—</p> : needHelp.map(s=>(
                    <div key={s.name} style={{ fontSize:13, color:"#c7cfee", marginBottom:4 }}>• <b>{s.name}</b>: {difficultyOf(s).text}</div>
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
              const trendLabel = delta >= 8 ? { text:"📈 Melhorando", color:"#34d399" } : delta <= -8 ? { text:"📉 Caindo", color:"#f87171" } : { text:"➡ Estável", color:"#96a0cc" };
              return (
                <div className="cardfx" style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                    <h3 style={{ color:"#7c83ff", margin:0 }}>📊 Evolução da turma nas últimas aulas</h3>
                    <span style={{ ...styles.badge(trendLabel.color) }}>{trendLabel.text}</span>
                  </div>
                  <p style={{ color:"#5d679c", fontSize:12, margin:"0 0 12px" }}>Média da nota de atividade de todos os alunos, dia a dia — ajuda a ver se a turma está indo melhor ou pior de uma aula pra outra.</p>
                  <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:110, overflowX:"auto", paddingBottom:4 }}>
                    {trend.map(({date, avg, count}) => {
                      const [, m, dd] = date.split("-");
                      const g = gradeInfo(avg);
                      return (
                        <div key={date} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, minWidth:38 }}>
                          <span style={{ color:g.color, fontSize:11, fontWeight:800 }}>{avg}</span>
                          <div style={{ width:24, height:Math.max(4, Math.round(avg*0.7)), background:`linear-gradient(180deg, ${g.color}, ${shade(g.color,-0.3)})`, borderRadius:"5px 5px 2px 2px" }} title={`${dd}/${m}: média ${avg} pts (${count} aluno${count>1?"s":""})`} />
                          <span style={{ color:"#5d679c", fontSize:10 }}>{dd}/{m}</span>
                        </div>
                      );
                    })}
                  </div>
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

                {/* Gerenciar aluno: renomear, mover de turno, corrigir nota, excluir */}
                <div className="cardfx" style={{ ...styles.card, borderColor:"#fbbf24" }}>
                  <h4 style={{ color:"#fbbf24", marginBottom:12 }}>⚙️ Gerenciar aluno</h4>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ color:"#96a0cc", fontSize:13, minWidth:88 }}>✏️ Nome:</span>
                      <input value={renameVal} onChange={e=>setRenameVal(e.target.value)} placeholder={sel.name}
                        style={{ flex:1, minWidth:140, background:"#0d1122", border:"1px solid #2a3154", borderRadius:8, padding:"7px 10px", color:"#e8ebfa", fontSize:13, outline:"none" }} />
                      <button onClick={()=>doRenameStudent(sel)} disabled={!renameVal.trim()} style={{ ...styles.btn("#7c83ff"), padding:"6px 14px", fontSize:12.5, opacity:renameVal.trim()?1:0.5 }}>Renomear</button>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ color:"#96a0cc", fontSize:13, minWidth:88 }}>🕑 Turma:</span>
                      {[...SHIFTS, TEST_SHIFT].filter(sh => sh.id !== (sel.shift||"sem-turno")).map(sh => (
                        <button key={sh.id} onClick={()=>doMoveStudent(sel, sh.id)} style={{ ...styles.btn("#2a3154"), padding:"6px 12px", fontSize:12.5 }}>
                          Mover p/ {sh.emoji} {sh.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ color:"#96a0cc", fontSize:13, minWidth:88 }}>🏆 Nota:</span>
                      <input type="number" min={0} max={100} value={scoreVal} onChange={e=>setScoreVal(e.target.value)} placeholder={sel.score!=null?String(sel.score):"—"}
                        style={{ width:90, background:"#0d1122", border:"1px solid #2a3154", borderRadius:8, padding:"7px 10px", color:"#e8ebfa", fontSize:13, outline:"none" }} />
                      <button onClick={()=>doSetScore(sel)} disabled={scoreVal===""} style={{ ...styles.btn("#34d399"), padding:"6px 14px", fontSize:12.5, opacity:scoreVal!==""?1:0.5 }}>Alterar nota da atividade</button>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #2a3154", paddingTop:10 }}>
                      <span style={{ color:"#96a0cc", fontSize:13, minWidth:88 }}>🧩 Acessibilidade:</span>
                      <button onClick={()=>doToggleAccessMode(sel)} style={{ ...styles.btn(selAccessMode?"#22d3ee":"#2a3154"), padding:"6px 14px", fontSize:12.5 }}>
                        {selAccessMode ? "✅ Modo Guiado ativado" : "Ativar Modo Guiado"}
                      </button>
                      <span style={{ color:"#5d679c", fontSize:11.5, flex:"1 1 200px" }}>{selAccessMode ? "O editor de código deste aluno vira uma montagem de blocos clicáveis, com narração por voz." : "Troca o editor de código por blocos clicáveis + narração por voz, para alunos com dificuldade de ler/escrever/digitar."}</span>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-start", borderTop:"1px solid #2a3154", paddingTop:10 }}>
                      <span style={{ color:"#96a0cc", fontSize:13, minWidth:88, paddingTop:6 }}>💙 Apoio:</span>
                      <div style={{ flex:1, minWidth:220 }}>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {[
                            ["sensorial", "🧘 Sensorial", "Modo calmo: sem sons, confete e animações de festa — pra quem se sobrecarrega com estímulos."],
                            ["foco", "🎯 Foco", "Esconde ranking, loja, duelos e curiosidade — sobra só o essencial: editor, Nyx e salvar."],
                            ["leitura", "📖 Leitura", "Letras e linhas mais espaçadas em toda a tela do aluno — ajuda na dislexia."],
                            ["ritmo", "🐢 Ritmo próprio", "Atividade do dia com 4 questões bem diretas em vez de 8 — termina junto com a turma."],
                            ["motora", "🖐️ Motora", "Sugere o tutorial de teclado pra esse aluno automaticamente — ajuda quem tem dificuldade motora pra digitar."],
                          ].map(([flag, label, hint]) => (
                            <button key={flag} onClick={()=>doToggleSupport(sel, flag, label)} title={hint}
                              style={{ background: selSupport[flag] ? "#3b82f6" : "#0d1122", color: selSupport[flag] ? "#fff" : "#96a0cc", border:`1px solid ${selSupport[flag] ? "#3b82f6" : "#2a3154"}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", fontWeight:800, fontSize:12 }}>
                              {selSupport[flag] ? "✓ " : ""}{label}
                            </button>
                          ))}
                        </div>
                        <p style={{ color:"#5d679c", fontSize:11.5, margin:"6px 0 0" }}>Perfis de apoio pra educação inclusiva — a tela do aluno se adapta sozinha. Só você vê essas marcações; os colegas não.</p>
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
                              <span style={{ color:"#e8ebfa", fontSize:12.5 }}>📅 {dd}/{m}/{y}: <i>"{j.text}"</i></span>
                              <button onClick={()=>doApproveJustification(sel, d)} style={{ ...styles.btn("#34d399"), padding:"5px 12px", fontSize:12 }}>✔ Justificar</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #2a3154", paddingTop:10 }}>
                      <span style={{ color:"#96a0cc", fontSize:13, minWidth:88 }}>⌨️ Teclado:</span>
                      <button onClick={async ()=>{ await setKeyboardLaunch(sel.shift, sel.name, teacherAuth); flashMgmt(`⌨️ Tutorial de teclado aberto na tela de ${sel.name}.`); }} style={{ ...styles.btn("#22d3ee"), padding:"6px 14px", fontSize:12.5 }}>Abrir na tela do aluno</button>
                      <span style={{ color: sel.keyboardDone ? "#34d399" : "#5d679c", fontSize:11.5, flex:"1 1 200px" }}>{sel.keyboardDone ? "✅ Já concluiu o tutorial." : "Ainda não concluiu o tutorial."}</span>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #2a3154", paddingTop:10 }}>
                      <span style={{ color:"#96a0cc", fontSize:13, minWidth:88 }}>🔍 Vistoria:</span>
                      <button onClick={()=>doToggleInspection(sel)} style={{ ...styles.btn(selInspection?"#22d3ee":"#2a3154"), padding:"6px 14px", fontSize:12.5 }}>
                        {selInspection ? "✅ Vistoria aberta — Encerrar" : "Liberar fora do horário"}
                      </button>
                      <span style={{ color:"#5d679c", fontSize:11.5, flex:"1 1 200px" }}>{selInspection ? "Esse aluno consegue entrar agora, mesmo fora do horário configurado." : "Se o horário automático estiver fechado, isso libera só ESTE aluno pra você inspecionar o trabalho dele."}</span>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #2a3154", paddingTop:10 }}>
                      <span style={{ color:"#96a0cc", fontSize:13, minWidth:88 }}>📤 Código:</span>
                      <button onClick={()=>doSendClassCode(sel)} style={{ ...styles.btn("#22d3ee"), padding:"6px 14px", fontSize:12.5 }}>Enviar código da turma</button>
                      <span style={{ color:"#5d679c", fontSize:11.5, flex:"1 1 200px" }}>Manda todos os arquivos da aba "Meu código" (turno {shiftLabel(sel.shift)}) direto pro editor deste aluno.</span>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #2a3154", paddingTop:10 }}>
                      <span style={{ color:"#96a0cc", fontSize:13, minWidth:88 }}>🗑️ Perfil:</span>
                      {confirmDelete ? (
                        <>
                          <span style={{ color:"#f87171", fontSize:13 }}>Excluir <b>{sel.name}</b> e tudo o que ele fez? Não dá para desfazer.</span>
                          <button onClick={()=>doDeleteStudent(sel)} style={{ ...styles.btn("#f87171"), padding:"6px 14px", fontSize:12.5 }}>Sim, excluir</button>
                          <button onClick={()=>setConfirmDelete(false)} style={{ ...styles.btn("#2a3154"), padding:"6px 14px", fontSize:12.5 }}>Cancelar</button>
                        </>
                      ) : (
                        <button onClick={()=>setConfirmDelete(true)} style={{ ...styles.btn("#f87171"), padding:"6px 14px", fontSize:12.5 }}>Excluir perfil do aluno</button>
                      )}
                    </div>
                  </div>
                  {mgmtMsg && <p style={{ color: mgmtMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:13, marginTop:10 }}>{mgmtMsg}</p>}
                </div>
                {Array.isArray(sel.files) && sel.files.length>0 ? sel.files.map((f,i)=>(
                  <div key={i} className="cardfx" style={styles.card}>
                    <h4 style={{ color:"#7c83ff", marginBottom:8 }}>📄 {f.name}</h4>
                    <pre style={{ background:"#1e1e1e", padding:12, borderRadius:8, fontFamily:"monospace", fontSize:13, color:"#a5f3fc", overflow:"auto", maxHeight:240, whiteSpace:"pre-wrap" }}>{f.code || "(vazio)"}</pre>
                  </div>
                )) : sel.code && (
                  <div className="cardfx" style={styles.card}>
                    <h4 style={{ color:"#7c83ff", marginBottom:8 }}>💻 Código</h4>
                    <pre style={{ background:"#1e1e1e", padding:12, borderRadius:8, fontFamily:"monospace", fontSize:13, color:"#a5f3fc", overflow:"auto", maxHeight:240, whiteSpace:"pre-wrap" }}>{sel.code}</pre>
                  </div>
                )}
                {sel.scoreHistory && Object.keys(sel.scoreHistory).length > 0 && (
                  <div className="cardfx" style={styles.card}>
                    <h4 style={{ color:"#7c83ff", marginBottom:12 }}>📈 Histórico de notas (atividades)</h4>
                    <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:110, overflowX:"auto", paddingBottom:4 }}>
                      {Object.entries(sel.scoreHistory).sort(([a],[b])=>a.localeCompare(b)).slice(-14).map(([d,n])=>{
                        const [, m, dd] = d.split("-");
                        const g = gradeInfo(n);
                        return (
                          <div key={d} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, minWidth:38 }}>
                            <span style={{ color:g.color, fontSize:11, fontWeight:800 }}>{n}</span>
                            <div style={{ width:24, height:Math.max(4, Math.round(n*0.7)), background:`linear-gradient(180deg, ${g.color}, ${shade(g.color,-0.3)})`, borderRadius:"5px 5px 2px 2px" }} title={`${dd}/${m}: ${n} pts`} />
                            <span style={{ color:"#5d679c", fontSize:10 }}>{dd}/{m}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {sel.feedback && <div className="cardfx" style={styles.card}><h4 style={{ color:"#7c83ff", marginBottom:6 }}>🤖 Nyx (último aviso)</h4><p style={{ color:sel.feedback.ok?"#34d399":"#f87171", fontSize:13 }}>{sel.feedback.ok?"✅":"⚠"} {sel.feedback.message}</p></div>}
                {sel.answers && sel.dynamicActivity && (
                  <div className="cardfx" style={styles.card}>
                    <h4 style={{ color:"#7c83ff", marginBottom:10 }}>📝 Atividade</h4>
                    {sel.dynamicActivity.map((q,i)=>(
                      <div key={i} style={{ marginBottom:10, background:"#0d1122", borderRadius:8, padding:"8px 12px" }}>
                        <p style={{ fontSize:13, color:"#96a0cc", marginBottom:4 }}>{i+1}. {q.q}</p>
                        <span style={styles.badge(sel.answers[i]===q.correct?"#34d399":"#f87171")}>{sel.answers[i]===q.correct?"✅ Correto":"❌ Errado"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {sel.finalFeedback && (() => {
                  const fb = sel.finalFeedback;
                  const st = fb && typeof fb === "object" && Array.isArray(fb.secoes);
                  const text = st ? [fb.intro, ...fb.secoes.map(s=>`${s.titulo}: ${s.explicacao}`), fb.dica ? `Dica: ${fb.dica}` : ""].filter(Boolean).join("\n") : (typeof fb === "string" ? fb : "");
                  return text ? <div className="cardfx" style={styles.card}><h4 style={{ color:"#7c83ff", marginBottom:8 }}>🤖 Feedback do Nyx ao aluno</h4><p style={{ color:"#c7cfee", fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{text}</p></div> : null;
                })()}
              </>
            ) : (
              <div className="cardfx" style={{ ...styles.card, textAlign:"center", padding:40 }}>
                <div style={{ fontSize:36 }}>👆</div>
                <p style={{ color:"#5d679c" }}>Clique em um aluno no monitoramento para ver o código, a atividade e os detalhes.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────── MEU CÓDIGO (exemplo da aula, do professor) — layout expandido tipo "tela cheia" ─────────── */}
      {tab==="code" && (() => {
        const strugglingNow = students
          .filter(s => (s.shift||"sem-turno")===codeShift && (s.shift||"sem-turno")!==TEST_SHIFT.id)
          .filter(s => difficultyOf(s).level==="dif");
        return (
          <div style={{ padding:"8px 14px 14px" }}>
            <div className="cardfx" style={{ ...styles.card, padding:12, margin:"6px 0" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:"1 1 260px" }}>
                  <h3 style={{ color:"#fbbf24", margin:0, fontSize:15 }}>👨‍💻 Meu código</h3>
                  <p style={{ color:"#96a0cc", fontSize:12.5, margin:"3px 0 0", lineHeight:1.5 }}>Cada turma tem seu próprio exemplo. Programe aqui e gere o nome do conteúdo a partir dele — é isso que aparece no calendário.</p>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button style={{ ...styles.btn("#34d399"), padding:"7px 12px", fontSize:12.5 }} onClick={()=>setShowLessons(true)} title="Sua biblioteca de aulas: salve o código atual com um nome e reutilize quando quiser">📚 Minhas aulas</button>
                  <button style={{ ...styles.btn("#7c83ff"), opacity:genName?0.6:1, padding:"7px 12px", fontSize:12.5 }} onClick={()=>generateContentName(codeShift)} disabled={genName}>{genName?"Gerando...":`✨ Gerar nome do conteúdo (${shiftMeta(codeShift).label})`}</button>
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
            <CodeLab key={codeShift} accent="#fbbf24" files={proFiles} onChange={setProFiles} strugglingStudents={strugglingNow} terminalMaxHeight={420} />
          </div>
        );
      })()}

      {/* ─────────── CALENDÁRIO ─────────── */}
      {tab==="calendar" && (
        <div style={{ display:"flex", gap:14, padding:14, maxWidth:900, margin:"0 auto", alignItems:"flex-start", flexWrap:"wrap" }}>
          <div className="cardfx" style={{ ...styles.card, flex:"1 1 380px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:12 }}>
              <h3 style={{ color:"#fbbf24", margin:0 }}>🗓️ Calendário de aulas</h3>
              <div style={{ display:"flex", gap:8 }}>
                {SHIFTS.map(sh => (
                  <button key={sh.id} onClick={()=>setCodeShift(sh.id)} style={styles.tab(codeShift===sh.id)}>{sh.emoji} {sh.label}</button>
                ))}
              </div>
            </div>
            <p style={{ color:"#96a0cc", fontSize:13, marginBottom:12 }}>Os dias com aula ficam em verde (são marcados sozinhos quando há alunos online, e você também pode clicar para marcar/desmarcar). O 📖 indica os dias que já têm conteúdo gerado para a turma {shiftMeta(codeShift).label} — passe o mouse para ver o tema.</p>
            <Calendar classDays={meta.classDays||[]} contentNames={calContentNames} onToggle={toggleClassDay} />
          </div>
          <div className="cardfx" style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:12 }}>📍 Sua cidade no DF</h3>
            <input list="df-cities" value={cityInput} onChange={e=>setCityInput(e.target.value)} onBlur={saveCity} placeholder="Ex: Ceilândia"
              style={{ width:"100%", background:"#0d1122", border:"2px solid #2a3154", borderRadius:10, padding:"10px 12px", color:"#e8ebfa", fontSize:15, boxSizing:"border-box" }} />
            <datalist id="df-cities">{DF_CITIES.map(c=><option key={c} value={c} />)}</datalist>
            <button style={{ ...styles.btn("#7c83ff"), marginTop:10 }} onClick={saveCity}>Salvar cidade</button>
            {meta.city && <p style={{ color:"#34d399", fontSize:13, marginTop:10 }}>Cidade salva: {meta.city}</p>}
            <hr style={{ borderColor:"#2a3154", margin:"14px 0" }}/>
            <p style={{ color:"#96a0cc", fontSize:13 }}>Total de dias de aula registrados: <b style={{ color:"#e8ebfa" }}>{(meta.classDays||[]).length}</b></p>
            <hr style={{ borderColor:"#2a3154", margin:"14px 0" }}/>
            <p style={{ color:"#fbbf24", fontWeight:700, fontSize:13, marginBottom:6 }}>🏆 Hall da Fama</p>
            <p style={{ color:"#96a0cc", fontSize:12.5, lineHeight:1.6, margin:"0 0 10px" }}>Quando a carreta for mudar de cidade, encerre aqui: guarda uma placa com quem mais se destacou, pros alunos da próxima cidade verem. Não apaga nada da turma atual.</p>
            {confirmCloseCity ? (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button style={{ ...styles.btn("#fbbf24") }} onClick={doCloseCity}>Sim, encerrar {meta.city || "a cidade"}</button>
                <button style={styles.btn("#2a3154")} onClick={()=>setConfirmCloseCity(false)}>Cancelar</button>
              </div>
            ) : (
              <button style={{ ...styles.btn("#fbbf24"), width:"100%" }} onClick={()=>setConfirmCloseCity(true)}>🏆 Encerrar cidade e gerar placa</button>
            )}
            {hallMsg && <p style={{ color: hallMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:12.5, marginTop:8, lineHeight:1.5 }}>{hallMsg}</p>}
            <button style={{ ...styles.btn("#06b6d4"), width:"100%", marginTop:10 }} onClick={()=>{ getHallOfFame().then(setTripHallEntries); setShowTripOverview(true); }}>📊 Visão da Viagem</button>
          </div>
          <div className="cardfx" style={{ ...styles.card, flex:"1 1 300px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:4 }}>🕐 Horário da turma ({shiftMeta(codeShift).label})</h3>
            <p style={{ color:"#96a0cc", fontSize:12.5, margin:"0 0 12px", lineHeight:1.6 }}>Defina o horário e o Nyx libera/bloqueia o perfil dos alunos sozinho. Deixe em branco pra não restringir nada.</p>
            {(() => {
              const sc = schedule[codeShift] || {};
              const setSc = (patch) => setSchedule(prev => ({ ...prev, [codeShift]: { ...(prev[codeShift]||{}), ...patch } }));
              const status = classStatus(sc);
              return (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    <label style={{ fontSize:11.5, color:"#96a0cc" }}>Início da aula
                      <input type="time" value={sc.start||""} onChange={e=>setSc({start:e.target.value})} style={{ width:"100%", background:"#0d1122", border:"1px solid #2a3154", borderRadius:8, padding:"7px 8px", color:"#e8ebfa", fontSize:13, marginTop:3 }} />
                    </label>
                    <label style={{ fontSize:11.5, color:"#96a0cc" }}>Fim da aula
                      <input type="time" value={sc.end||""} onChange={e=>setSc({end:e.target.value})} style={{ width:"100%", background:"#0d1122", border:"1px solid #2a3154", borderRadius:8, padding:"7px 8px", color:"#e8ebfa", fontSize:13, marginTop:3 }} />
                    </label>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                    <label style={{ fontSize:11.5, color:"#96a0cc" }}>Início do intervalo
                      <input type="time" value={sc.breakStart||""} onChange={e=>setSc({breakStart:e.target.value})} style={{ width:"100%", background:"#0d1122", border:"1px solid #2a3154", borderRadius:8, padding:"7px 8px", color:"#e8ebfa", fontSize:13, marginTop:3 }} />
                    </label>
                    <label style={{ fontSize:11.5, color:"#96a0cc" }}>Duração (min)
                      <input type="number" min={0} value={sc.breakMin||""} onChange={e=>setSc({breakMin:e.target.value})} placeholder="ex: 15" style={{ width:"100%", background:"#0d1122", border:"1px solid #2a3154", borderRadius:8, padding:"7px 8px", color:"#e8ebfa", fontSize:13, marginTop:3, boxSizing:"border-box" }} />
                    </label>
                  </div>
                  <button style={{ ...styles.btn("#7c83ff"), width:"100%", padding:"8px 0", fontSize:13 }} onClick={saveSchedule}>💾 Salvar horário</button>
                  {scheduleMsg && <p style={{ color:"#34d399", fontSize:12, margin:"8px 0 0" }}>{scheduleMsg}</p>}
                  <p style={{ fontSize:12, margin:"10px 0 0", fontWeight:700, color: !status.configured ? "#5d679c" : status.open ? (status.inBreak ? "#22d3ee" : "#34d399") : "#f87171" }}>
                    {!status.configured ? "⚪ Sem restrição — aberto o dia todo" : status.inBreak ? `🍎 Em intervalo agora (volta em ${status.minutesToBreakEnd}min)` : status.open ? "🟢 Aula liberada agora" : status.before ? `🔴 Fechado — abre às ${sc.start}` : "🔴 Fechado — aula já encerrou hoje"}
                  </p>
                </>
              );
            })()}
          </div>
          <div className="cardfx" style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:8 }}>📖 Conteúdo de hoje ({shiftMeta(codeShift).label})</h3>
            {contentFor(codeShift)
              ? <p style={{ color:"#34d399", fontSize:16, fontWeight:600, lineHeight:1.5, margin:"4px 0 12px" }}>{contentFor(codeShift)}</p>
              : <p style={{ color:"#96a0cc", fontSize:13, lineHeight:1.6, margin:"4px 0 12px" }}>Ainda não gerado. Programe o exemplo do dia na aba <b>Meu código</b> e clique abaixo para criar um nome automático.</p>}
            <button style={{ ...styles.btn("#7c83ff"), width:"100%", opacity:genName?0.6:1 }} onClick={()=>generateContentName(codeShift)} disabled={genName}>{genName?"Gerando...":"✨ Gerar nome do conteúdo de hoje"}</button>
            {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:12, marginTop:10, lineHeight:1.5 }}>{nameMsg}</p>}
          </div>
        </div>
      )}

      {/* ─────────── FEEDBACK DOS ALUNOS ─────────── */}
      {tab==="feedback" && (
        <div style={{ padding:14, maxWidth:760, margin:"0 auto" }}>
          <div className="cardfx" style={styles.card}>
            <h3 style={{ color:"#fbbf24", marginBottom:12 }}>💬 Feedback dos alunos sobre as aulas</h3>
            <p style={{ color:"#96a0cc", fontSize:12.5, margin:"-4px 0 12px" }}>Do mais recente para o mais antigo, com a turma de cada aluno.</p>
            {feedbacks.length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>Nenhum aluno enviou feedback ainda. Eles podem avaliar ao terminar a aula.</p> : (
              feedbacks.map(s=>(
                <div key={s.name} style={{ background:"#0d1122", border:"1px solid #2a3154", borderRadius:10, padding:14, marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                    <Avatar cfg={s.avatar} size={30} />
                    <b>{s.name}</b>
                    <span style={{ ...styles.badge(s.shift===TEST_SHIFT.id?"#a855f7":"#7c83ff"), fontWeight:700 }}>{shiftLabel(s.shift)}</span>
                    <span style={{ color:"#fbbf24" }}>{"★".repeat(s.classFeedback.rating||0)}{"☆".repeat(5-(s.classFeedback.rating||0))}</span>
                    <span style={{ color:"#5d679c", fontSize:11, marginLeft:"auto", whiteSpace:"nowrap" }}>🕒 {dataHora(s.classFeedback.at)}</span>
                  </div>
                  {(s.classFeedback.text||"").trim() ? <p style={{ color:"#c7cfee", fontSize:14, lineHeight:1.6 }}>{s.classFeedback.text}</p> : <p style={{ color:"#5d679c", fontSize:13 }}>(sem comentário escrito)</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────── PROVA ─────────── */}
      {tab==="exam" && (() => {
        const examStudents = shiftFilter==="all" ? students : students.filter(s=>(s.shift||"sem-turno")===shiftFilter);
        const readyStudents = examStudents.filter(s => s.examReady);
        const doneStudents  = examStudents.filter(s => s.examDone);
        const ranking = [...examStudents].filter(s=>s.examScore!=null).sort((a,b)=>(b.examScore||0)-(a.examScore||0));
        const qLen = (examConfig.questions||[]).length;
        const medal = (i) => i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
        return (
          <div style={{ padding:14, maxWidth:900, margin:"0 auto" }}>
            {/* confirmação de encerrar */}
            {confirmEndExam && (
              <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
                <div style={{ background:"#151a31", border:"2px solid #fbbf24", borderRadius:16, padding:24, maxWidth:400, width:"100%" }}>
                  <div style={{ fontSize:40, textAlign:"center" }}>⚠️</div>
                  <h3 style={{ color:"#fbbf24", textAlign:"center", margin:"8px 0" }}>Encerrar a prova agora?</h3>
                  <p style={{ color:"#c7cfee", fontSize:14, textAlign:"center", lineHeight:1.6 }}>Os alunos que ainda não terminaram terão a pontuação parcial registrada.</p>
                  <div style={{ display:"flex", gap:10, marginTop:18 }}>
                    <button onClick={()=>setConfirmEndExam(false)} style={{ ...styles.btn("#2a3154"), flex:1 }}>Cancelar</button>
                    <button onClick={endExam} style={{ ...styles.btn("#f87171"), flex:1 }}>Encerrar</button>
                  </div>
                </div>
              </div>
            )}

            {/* estado: idle */}
            {examConfig.status === 'idle' && (
              <div className="cardfx" style={styles.card}>
                <h3 style={{ color:"#fbbf24", marginBottom:4 }}>🏆 Criar Prova</h3>
                <p style={{ color:"#96a0cc", fontSize:13, marginBottom:14, lineHeight:1.6 }}>A IA gera automaticamente um resumo de revisão e 10 questões de múltipla escolha com base no código de hoje. Os alunos revisam, entram na sala e então você inicia.</p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                  <span style={{ color:"#96a0cc", fontSize:13, alignSelf:"center" }}>Turma:</span>
                  <button onClick={()=>setExamShift("all")} style={styles.tab(examShift==="all")}>Todas</button>
                  {SHIFTS.map(sh=>(
                    <button key={sh.id} onClick={()=>setExamShift(sh.id)} style={styles.tab(examShift===sh.id)}>{sh.emoji} {sh.label}</button>
                  ))}
                </div>
                <p style={{ color:"#96a0cc", fontSize:12, marginBottom:10 }}>As questões são geradas a partir do código que você escreveu na aba <b>Meu código</b>. Se não houver, usa o código dos alunos.</p>
                <button onClick={startExam} disabled={examGenerating} style={{ ...styles.btn("#7c83ff"), opacity:examGenerating?0.6:1, padding:"12px 24px", fontSize:15 }}>
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
                      <p style={{ color:"#96a0cc", fontSize:13 }}>Os alunos estão revisando o conteúdo. Quando estiverem prontos, iniciam a prova.</p>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={activateExam} style={{ ...styles.btn("#34d399") }}>▶ Iniciar Agora ({readyStudents.length} prontos)</button>
                      <button onClick={resetExam} style={{ ...styles.btn("#5d679c"), fontSize:13 }}>Cancelar</button>
                    </div>
                  </div>
                  {examMsg && <p style={{ color:"#34d399", fontSize:13, marginTop:10 }}>{examMsg}</p>}
                </div>
                <div className="cardfx" style={styles.card}>
                  <h4 style={{ color:"#fbbf24", marginBottom:10 }}>Alunos prontos ({readyStudents.length}/{examStudents.length})</h4>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {examStudents.map(s=>(
                      <div key={s.name} style={{ display:"flex", alignItems:"center", gap:8, background:"#0d1122", border:`1px solid ${s.examReady?"#34d399":"#2a3154"}`, borderRadius:10, padding:"8px 12px" }}>
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
                      <p style={{ color:"#96a0cc", fontSize:13 }}>{doneStudents.length}/{examStudents.length} alunos concluíram · {qLen} questões · {qLen*10} pts no máximo</p>
                    </div>
                    <button onClick={()=>setConfirmEndExam(true)} style={styles.btn("#f87171")}>⏹ Encerrar Prova</button>
                  </div>
                  {examMsg && <p style={{ color:"#34d399", fontSize:13, marginTop:8 }}>{examMsg}</p>}
                </div>
                <div className="cardfx" style={styles.card}>
                  <h4 style={{ color:"#fbbf24", marginBottom:12 }}>📊 Ranking ao vivo</h4>
                  {ranking.length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>Aguardando alunos terminarem...</p> : (
                    ranking.map((s,i)=>(
                      <div key={s.name} style={{ background:"#0d1122", border:`1px solid ${i===0?"#fbbf24":"#2a3154"}`, borderRadius:10, padding:"10px 14px", marginBottom:8 }}>
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
                      <p style={{ color:"#96a0cc", fontSize:13 }}>Resultado final · {doneStudents.length}/{examStudents.length} alunos concluíram</p>
                    </div>
                    <button onClick={resetExam} style={styles.btn("#5d679c")}>🔄 Nova Prova</button>
                  </div>
                </div>
                <div className="cardfx" style={{ ...styles.card, borderColor:"#7c83ff" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <NyxRobot state="thinking" size={44} showName={false} />
                      <div>
                        <h4 style={{ color:"#7c83ff", margin:0 }}>Análise do Nyx — período + prova</h4>
                        <p style={{ color:"#96a0cc", fontSize:12, margin:"2px 0 0" }}>Quem foi bem nas aulas e na prova, e quem precisa de atenção — com o porquê.</p>
                      </div>
                    </div>
                    <button onClick={nyxExamAnalysis} disabled={analyzingExam} style={{ ...styles.btn("#7c83ff"), fontSize:13, opacity:analyzingExam?0.6:1 }}>
                      {analyzingExam ? "Analisando..." : examAnalysis ? "↻ Refazer análise" : "✨ Pedir análise"}
                    </button>
                  </div>
                  {examAnalysis && <p style={{ color:"#c7cfee", fontSize:14, lineHeight:1.8, whiteSpace:"pre-wrap", margin:"12px 0 0" }}>{examAnalysis}</p>}
                </div>
                <div className="cardfx" style={styles.card}>
                  <h4 style={{ color:"#fbbf24", marginBottom:12 }}>🏆 Ranking Final</h4>
                  {ranking.length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>Nenhum aluno respondeu.</p> : (
                    ranking.map((s,i)=>(
                      <div key={s.name} style={{ background:i===0?"#fbbf2422":"#0d1122", border:`2px solid ${i===0?"#fbbf24":i===1?"#96a0cc":i===2?"#c2410c":"#2a3154"}`, borderRadius:12, padding:"12px 16px", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <span style={{ fontSize:26, width:32 }}>{medal(i)||<span style={{color:"#5d679c",fontSize:16}}>#{i+1}</span>}</span>
                          <Avatar cfg={s.avatar} size={32} />
                          <span style={{ flex:1, fontWeight:700, fontSize:15 }}>{s.name}</span>
                          <span style={{ color:"#34d399", fontWeight:800, fontSize:20 }}>{s.examScore ?? 0}</span>
                          <span style={{ color:"#96a0cc", fontSize:12 }}>/{qLen*10}</span>
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
                            {s.examAppeal?.status === "rejected" && <p style={{ color:"#96a0cc", fontSize:12, margin:"6px 0 0", fontWeight:700 }}>Defesa recusada — desconto mantido.</p>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {examStudents.filter(s=>!s.examDone && s.examScore==null).length > 0 && (
                    <div style={{ marginTop:12, padding:"10px 14px", background:"#171c33", borderRadius:8 }}>
                      <p style={{ color:"#96a0cc", fontSize:12, marginBottom:6 }}>Não concluíram:</p>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {examStudents.filter(s=>!s.examDone && s.examScore==null).map(s=>(
                          <span key={s.name} style={{ background:"#2a3154", color:"#96a0cc", borderRadius:8, padding:"4px 10px", fontSize:12 }}>{s.name}</span>
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

      <NyxChat
        who="teacher"
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

// ════════════════════════════════════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════════════════════════════════════
function Login({ onJoin }) {
  const vw = useViewportWidth();
  const isNarrow = vw < 720; // abaixo disso, a personalização do avatar empilha em vez de ficar em 2 colunas
  const [name, setName] = useState("");
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

  const openTestShift = () => { setTestUnlocking(true); setTestPass(""); setTestError(""); };
  const confirmTestShift = () => {
    if (testPass === TEST_SHIFT_PASSWORD) { setShift(TEST_SHIFT.id); setTestUnlocking(false); setTestError(""); }
    else setTestError("Senha incorreta!");
  };

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    const arr = await listStudents();
    setProfiles(arr.sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt-BR")));
    setLoadingProfiles(false);
  }, []);
  useEffect(() => { if (role==="student") loadProfiles(); }, [role, loadProfiles]);

  const enterStudent = (studentName, avatarCfg, shiftId, isNew) => { goFullscreen(); onJoin("student", studentName, avatarCfg, shiftId || "matutino", isNew, null); };
  const handleNewStudent = () => {
    if(!name.trim()){ setError("Digite seu nome!"); return; }
    enterStudent(name.trim(), avatar, shift, true);
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
    card:{ background:"linear-gradient(180deg,#181d38ee,#131730ee)", backdropFilter:"blur(10px)", borderRadius:22, padding:32, width: role==="student" ? 880 : 460, maxWidth:"100%", border:"1px solid #2c3358", boxShadow:"0 24px 70px rgba(0,0,0,.5), 0 0 0 1px #7c83ff1a" },
    input:{ width:"100%", background:"#0d1122", border:"2px solid #2a3154", borderRadius:12, padding:"12px 14px", color:"#e8ebfa", fontSize:15, outline:"none", boxSizing:"border-box" },
    btn:(c)=>({ background:`linear-gradient(135deg, ${c}, ${shade(c,-0.18)})`, color:"#fff", border:"none", borderRadius:12, padding:"12px 0", cursor:"pointer", fontWeight:800, fontSize:15, width:"100%", boxShadow:`0 4px 16px ${c}44` }),
    rBtn:()=>({ background:"#0d1122", color:"#96a0cc", border:`2px solid #2a3154`, borderRadius:14, padding:"18px 8px", cursor:"pointer", fontWeight:800, fontSize:14, flex:1 }),
  };

  return (
    <div style={styles.container}>
      <div className="pop" style={styles.card}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <NyxRobot state="idle" size={86} showName={false} />
          <h1 className="shine" style={{ fontSize:28, margin:"6px 0 2px", fontWeight:900, background:"linear-gradient(120deg,#7c83ff,#22d3ee,#7c83ff)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>Aula de C#</h1>
          <p style={{ color:"#5d679c", fontSize:13, margin:0 }}>Plataforma da turma · com o robô <b style={{ color:"#7c83ff" }}>Nyx</b></p>
        </div>

        {!role&&(
          <>
            <p style={{ color:"#96a0cc", textAlign:"center", marginBottom:14 }}>Quem é você?</p>
            <div style={{ display:"flex", gap:12 }}>
              <button style={styles.rBtn()} onClick={()=>setRole("student")}>
                <span style={{ display:"block", fontSize:34, marginBottom:6 }}>🧑‍💻</span>
                <span style={{ display:"block", color:"#e8ebfa", fontSize:15 }}>Aluno</span>
                <span style={{ display:"block", color:"#5d679c", fontSize:11.5, fontWeight:600, marginTop:2 }}>programar e aprender</span>
              </button>
              <button style={styles.rBtn()} onClick={()=>setRole("teacher")}>
                <span style={{ display:"block", fontSize:34, marginBottom:6 }}>👨‍🏫</span>
                <span style={{ display:"block", color:"#e8ebfa", fontSize:15 }}>Professor</span>
                <span style={{ display:"block", color:"#5d679c", fontSize:11.5, fontWeight:600, marginTop:2 }}>acompanhar a turma</span>
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
                <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 8px" }}>🕑 Qual é a sua turma?</p>
                <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                  {SHIFTS.map(sh => (
                    <button key={sh.id} onClick={()=>{ setShift(sh.id); setTestUnlocking(false); }}
                      style={{ ...styles.rBtn(), ...(shift===sh.id ? { borderColor:"#7c83ff", color:"#fff", background:"#7c83ff22" } : {}) }}>
                      {sh.emoji} {sh.label}
                    </button>
                  ))}
                </div>
                <button onClick={()=> shift===TEST_SHIFT.id ? null : openTestShift()}
                  style={{ background:"transparent", border:"none", color: shift===TEST_SHIFT.id ? "#7c83ff" : "#5d679c", fontSize:12, cursor:"pointer", padding:"2px 0", marginBottom: shift===TEST_SHIFT.id||testUnlocking ? 10 : 18 }}>
                  {shift===TEST_SHIFT.id ? `✓ ${TEST_SHIFT.emoji} Turma de teste selecionada` : `${TEST_SHIFT.emoji} Sou da turma de teste`}
                </button>
                {testUnlocking && shift!==TEST_SHIFT.id && (
                  <div style={{ background:"#0d1122", border:"2px solid #2a3154", borderRadius:12, padding:12, marginBottom:18 }}>
                    <p style={{ color:"#96a0cc", fontSize:12, margin:"0 0 8px" }}>Digite a senha da turma de teste:</p>
                    <div style={{ display:"flex", gap:8 }}>
                      <input type="password" autoFocus value={testPass} onChange={e=>setTestPass(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&confirmTestShift()} placeholder="Senha"
                        style={{ ...styles.input, padding:"8px 12px", fontSize:14 }} />
                      <button onClick={confirmTestShift} style={{ ...styles.btn("#7c83ff"), width:"auto", padding:"0 16px", flexShrink:0 }}>Entrar</button>
                    </div>
                    {testError && <p style={{ color:"#f87171", fontSize:12, marginTop:6 }}>{testError}</p>}
                  </div>
                )}

                <div style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ color:"#96a0cc", fontSize:13 }}>Já tem um perfil da turma {shiftMeta(shift).label}? Toque no seu nome:</span>
                    <button onClick={loadProfiles} style={{ background:"transparent", border:"none", color:"#7c83ff", cursor:"pointer", fontSize:12 }}>↻ atualizar</button>
                  </div>
                  {loadingProfiles ? <p style={{ color:"#5d679c", fontSize:13 }}>Procurando perfis salvos...</p>
                    : profiles.filter(p => (p.shift||"matutino")===shift).length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>Nenhum perfil salvo ainda nesta turma. Crie o seu abaixo 👇</p>
                    : (
                      <div style={{ maxHeight:170, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
                        {profiles.filter(p => (p.shift||"matutino")===shift).map(p=>(
                          <button key={`${p.shift||"x"}:${p.name}`} onClick={()=>openProfile(p)} style={{ display:"flex", alignItems:"center", gap:10, background:"#0d1122", border:"2px solid #2a3154", borderRadius:10, padding:"8px 12px", cursor:"pointer", color:"#e8ebfa", textAlign:"left" }}>
                            <Avatar cfg={p.avatar} size={32} />
                            <span style={{ fontWeight:600, flex:1 }}>{p.name}</span>
                            <span style={{ color:"#7c83ff", fontSize:13, fontWeight:700 }}>Entrar →</span>
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                <div style={{ display:"flex", alignItems:"center", gap:10, margin:"6px 0 14px" }}>
                  <div style={{ flex:1, height:1, background:"#2a3154" }}/>
                  <span style={{ color:"#5d679c", fontSize:12 }}>ou crie um novo perfil na turma {shiftMeta(shift).label}</span>
                  <div style={{ flex:1, height:1, background:"#2a3154" }}/>
                </div>

                <input style={styles.input} placeholder="Seu nome completo" value={name} onChange={e=>setName(e.target.value)} />
                <p style={{ color:"#96a0cc", fontSize:13, margin:"14px 0 8px", textAlign:"center" }}>🎨 Seu boneco:</p>
                <AvatarPreview value={avatar} onChange={setAvatar} />
                <AvatarControls value={avatar} onChange={setAvatar} part="basic" />
              </div>

              <div style={{ flex: isNarrow ? "1 1 100%" : "1 1 440px", minWidth: isNarrow ? 0 : 400 }}>
                <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 8px" }}>Personalize:</p>
                <div style={{ columnCount: isNarrow ? 1 : 2, columnGap:20 }}>
                  <AvatarControls value={avatar} onChange={setAvatar} part="rest" />
                </div>
                {error&&<p style={{ color:"#f87171", fontSize:13, marginTop:8 }}>{error}</p>}
                <div style={{ display:"flex", gap:8, marginTop:16 }}>
                  <button style={{ ...styles.btn("#7c83ff"), flex:1 }} onClick={handleNewStudent}>Criar perfil e entrar →</button>
                  <button style={{ ...styles.btn("#2a3154"), width:44, flex:"none" }} onClick={()=>{ setRole(null); setError(""); }}>↩</button>
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
              <button style={{ ...styles.btn("#2a3154"), width:44, flex:"none" }} onClick={()=>{ setRole(null); setError(""); }}>↩</button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(null);
  if (!session) return <Login onJoin={(role,name,avatar,shift,isNew,teacherAuth)=>setSession({role,name,avatar,shift,isNew,teacherAuth})} />;
  if (session.role==="teacher") return <TeacherView onLogout={()=>setSession(null)} teacherAuth={session.teacherAuth} />;
  return <StudentView studentName={session.name} initialAvatar={session.avatar} shift={session.shift||"matutino"} isNew={session.isNew} onLogout={()=>setSession(null)} />;
}
