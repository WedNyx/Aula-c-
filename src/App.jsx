import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { lorelei } from "@dicebear/collection";
import { saveStudent, getStudent, setNudge, getNudge, listStudents, checkReset, resetAll, getTeacherMeta, saveTeacherMeta, saveTeacherCode, getTeacherCode, diagnose, getExamState, setExamState, getDailyCuriosity, setDailyCuriosity, setDuel, getDuel, clearDuel, listDuels, getNyxLocks, setNyxLocks, patchStudent, deleteStudentProfile, setKick, checkKick, setScoreFix, getScoreFix, clearScoreFix } from "./storage.js";

// ── tema ──
const FONT = "'Nunito','Segoe UI',system-ui,sans-serif";
const PAGE_BG = "radial-gradient(1000px 620px at 85% -10%, rgba(124,131,255,.16), transparent 60%), radial-gradient(900px 600px at -10% 110%, rgba(34,211,238,.09), transparent 55%), linear-gradient(180deg,#0a0c18 0%,#0c0f20 100%)";
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
function playSound(kind) {
  if (soundsMuted) return;
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
  } catch {}
}
function setSoundsMuted(v) { soundsMuted = v; try { localStorage.setItem("nyx_sounds_muted", v ? "1" : "0"); } catch {} }
function loadSoundsMuted() { try { soundsMuted = localStorage.getItem("nyx_sounds_muted") === "1"; } catch {} return soundsMuted; }

// ── sequência de dias (streak) a partir do mapa de presença ──
function computeStreak(attendance) {
  if (!attendance) return 0;
  let streak = 0;
  const d = new Date();
  // se hoje ainda não tem presença registrada, começa a contar de ontem (não quebra a sequência no meio da aula)
  const todayStr = todayKey();
  if (attendance[todayStr] !== "present") d.setDate(d.getDate() - 1);
  for (;;) {
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (attendance[key] === "present") { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

// ── conquistas/medalhas do aluno ──
const ACHIEVEMENTS = [
  { id:"primeira-atividade", emoji:"🥇", label:"Primeiro Passo", desc:"Concluiu a primeira atividade da aula" },
  { id:"nota-cem",           emoji:"💯", label:"Nota Cem",       desc:"Tirou 100 numa atividade" },
  { id:"codigo-limpo",       emoji:"✨", label:"Código Limpo",  desc:"Escreveu um código sem nenhum erro" },
  { id:"prova-mestre",       emoji:"🎓", label:"Mestre da Prova", desc:"Fez 80% ou mais numa prova" },
  { id:"sequencia-3",        emoji:"🔥", label:"3 Dias Seguidos", desc:"Veio 3 dias seguidos de aula" },
  { id:"sequencia-7",        emoji:"🔥", label:"Semana Completa", desc:"Veio 7 dias seguidos de aula" },
  { id:"combo-5",            emoji:"⚡", label:"Combo Elétrico", desc:"Acertou 5 questões seguidas numa atividade" },
  { id:"combo-8",            emoji:"🚀", label:"Combo Insano",  desc:"Acertou 8 questões seguidas numa atividade" },
  { id:"duelista",           emoji:"⚔️", label:"Duelista",      desc:"Venceu um duelo contra um colega" },
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

Fale sempre em português brasileiro simples, gentil e encorajador — o aluno é iniciante, mas sua análise por trás é a de um especialista.`;

const RUN_SYSTEM = "Você é o compilador e o runtime do .NET 8 executando um projeto C# com precisão absoluta (ordem das instruções, conversões, formatação padrão). Responda apenas com o texto do console, sem explicações e sem markdown.";

// ── Nyx no modo leve/divertido: usado só para conteúdo casual (curiosidade do dia), NUNCA para revisar código ──
// Propositalmente separado do CS_SYSTEM: aqui o Nyx não é o revisor rigoroso, é só o mascote animando a turma.
const NYX_FUN_SYSTEM = "Você é Nyx, o robô mascote animado de uma turma de adolescentes aprendendo C#. Aqui você está no seu modo leve e divertido — nada de revisar código ou dar aula formal. Seja breve, empolgado e use no máximo 1 emoji. Português brasileiro bem informal, do jeito que se fala com adolescente.";

function otherFilesCtx(files, active) {
  const others = (files||[]).filter((f,i)=>i!==active && (f.code||"").trim());
  if (!others.length) return "";
  return `Outros arquivos do MESMO projeto (compilam juntos com o arquivo em edição — classes daqui podem ser usadas nele):\n\`\`\`csharp\n${others.map(f=>`// ${f.name}\n${f.code}`).join("\n\n")}\n\`\`\`\n\n`;
}

// ════════════════════════════════════════════════════════════════════════════
//  SYNTAX HIGHLIGHT  (com cores de pares de colchetes/chaves/parênteses do VSCode)
// ════════════════════════════════════════════════════════════════════════════
const BRACKET_COLORS = ["#FFD700", "#DA70D6", "#179FFF"]; // ouro, roxo, azul (padrão VSCode)

function highlight(code) {
  const keywords = ["using","namespace","class","static","void","public","private","protected","internal","int","long","short","string","bool","double","float","char","decimal","byte","return","if","else","for","while","foreach","do","in","new","var","true","false","null","this","base","override","virtual","abstract","sealed","readonly","const","try","catch","finally","throw","switch","case","break","continue","default","get","set","using","enum","struct","interface","async","await"];
  let depth = 0; // profundidade de colchetes acumulada entre linhas
  const lines = code.split("\n");
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
    return <div key={li} style={{minHeight:"1.5em"}}>{tokens.length ? tokens : " "}</div>;
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  EDITOR ESTILO VS CODE
// ════════════════════════════════════════════════════════════════════════════
function VSEditor({ value, onChange, filename }) {
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
    <div style={{ background:"#1e1e1e", borderRadius:8, border:"1px solid #3e3e42", overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"#2d2d30", padding:"6px 14px", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #3e3e42" }}>
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
            {highlight(value)}
          </div>
          <textarea ref={textareaRef} value={value} onChange={e => onChange(e.target.value)} onKeyDown={handleKeyDown} onScroll={syncScroll} spellCheck={false} autoCorrect="off" autoCapitalize="off"
            style={{ ...shared, position:"absolute", top:0, left:0, right:0, bottom:0, background:"transparent", color:"transparent", caretColor:"#aeafad", border:"none", outline:"none", resize:"none", zIndex:1, paddingLeft:14, overflow:"auto" }} />
        </div>
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
const nyxItemUnlocked = (points, item) => points >= item.cost;

// ── NYX: o robô assistente da turma (SVG + animações CSS) ──
let __nyxSeq = 0;
function NyxRobot({ state = "idle", size = 100, showName = true, gear }) {
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
  return (
    <div style={{ textAlign:"center", padding:4 }}>
      <div style={{ display:"inline-block", animation:P.anim, willChange:"transform" }}>
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

function AvatarBuilder({ value, onChange }) {
  const v = normalizeAvatar(value);
  const set = (k, val) => onChange({ ...v, [k]: val });
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
    <div style={{ marginBottom:10 }}>
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
  return (
    <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
      <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
        <div style={{ background:"radial-gradient(circle at 50% 28%, #1d2344, #0d1122)", borderRadius:18, padding:12, border:"1px solid #2c3358", animation:"glow-ring 3s ease-in-out infinite" }}>
          <Avatar cfg={v} size={104} />
        </div>
        <button type="button" onClick={randomize} style={{ background:"#2a3154", color:"#e8ebfa", border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>🎲 Surpresa</button>
      </div>
      <div style={{ flex:1, minWidth:240 }}>
        <Row label="Cor de fundo"><Swatches k="bg" /></Row>
        <Row label="Tom de pele"><Swatches k="skin" /></Row>
        <Row label="Cor do cabelo"><Swatches k="hair" /></Row>
        <Row label="Estilo do cabelo"><Thumbs k="hairV" field="hairV" /></Row>
        <Row label="Olhos"><Thumbs k="eyesV" field="eyesV" /></Row>
        <Row label="Boca"><Thumbs k="mouthV" field="mouthV" /></Row>
        <Row label="Óculos"><Thumbs k="glassesV" field="glassesV" /></Row>
        <Row label="Brincos"><Thumbs k="earringsV" field="earringsV" /></Row>
        <Row label="Detalhes"><div style={{ display:"flex", gap:6, flexWrap:"wrap" }}><Toggle field="freckles" label="Sardas" /><Toggle field="flores" label="Flores no cabelo" /></div></Row>
        <Row label="👕 Roupa"><ItemThumbs items={ROUPA_ITEMS} field="roupa" /></Row>
        <Row label="🐉 Pet / Animal mitológico"><Pets /></Row>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TERMINAL  (estilo VS Code: digite dotnet run, dotnet build, cls, dir, ajuda)
// ════════════════════════════════════════════════════════════════════════════
const TERM_PROMPT = "C:\\Aula\\MeuProjeto>";

function Terminal({ files, dataTour }) {
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
        e.message === "ROBOTKEY_MISSING" ? "⚠ Terminal offline: o professor precisa configurar a ANTHROPIC_API_KEY no Vercel." : "Não consegui executar agora. Tente de novo.", ""]);
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
    } catch {
      setHist(prev => [...prev.slice(0, runStartRef.current), "Não consegui compilar agora. Tente de novo.", ""]);
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
    <div data-tour={dataTour} style={{ background:"#0a0a0a", border:"1px solid #333", borderRadius:10, marginTop:12, overflow:"hidden" }}>
      <div style={{ background:"#161616", padding:"6px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #333" }}>
        <span style={{ color:"#bbb", fontSize:13 }}>⌨️ Terminal <span style={{ color:"#555", fontSize:11 }}>· digite os comandos como no VS Code</span></span>
        <div style={{ display:"flex", gap:6 }}>
          {mode === "program" && !running && (
            <button onClick={cancelProgram} style={{ background:"#3a1d1d", border:"1px solid #7f1d1d", color:"#fca5a5", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>■ parar (Ctrl+C)</button>
          )}
          <button onClick={()=>{ setHist([]); setMode("shell"); inputsRef.current = []; }} style={{ background:"#222", border:"1px solid #444", color:"#bbb", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>limpar</button>
          <button onClick={doRun} disabled={running} style={{ background:"#34d399", border:"none", color:"#03301f", borderRadius:6, padding:"3px 12px", cursor:"pointer", fontSize:12, fontWeight:800, opacity:running?0.6:1 }}>{running?"executando...":"▶ dotnet run"}</button>
        </div>
      </div>
      <div ref={boxRef} style={{ minHeight:110, maxHeight:260, overflow:"auto", padding:12, cursor:"text" }} onClick={()=>{ if (inputRef.current) inputRef.current.focus(); }}>
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
function NyxChat({ who = "student", context, onTheme, onCommand, accent = "#7c83ff", dataTour, gear }) {
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
        ? `Você está conversando com um aluno dentro da plataforma, num chat pequeno. Responda CURTO (no máximo 5 frases), simples e animado. Ajude com dúvidas de C#, dicas de estudo e o que ele precisar. Não resolva a atividade por ele — explique o caminho.${themeRule}`
        : `Você é o assistente pessoal do PROFESSOR dentro da plataforma, num chat pequeno. Responda curto e direto (máximo 6 frases), com base nos dados da turma fornecidos. Sugira a quem dar atenção, ideias de exercícios e próximos passos quando fizer sentido.
COMANDOS DISPONÍVEIS que o professor pode digitar aqui no chat (executados por você na hora):
- "zek" → você aparece na tela de TODOS os alunos, no centro, pedindo atenção, e bloqueia tudo o que eles estiverem fazendo.
- "/hiberne" → desativa o zek e libera as telas dos alunos.
- "zeker" → bloqueia o duelo entre alunos.
- "/liberte" → libera o duelo novamente.
Se o professor perguntar como chamar a atenção da turma ou controlar os duelos, LEMBRE-O desses comandos. Outras ações (mudar nota, renomear, mover de turno ou excluir aluno) o professor faz no painel Monitoramento clicando no aluno — indique o caminho quando ele pedir esse tipo de mudança.`;
      const out = await askClaude(
        `${context ? context() : ""}\n\nConversa até agora:\n${histTxt}\n\nResponda como Nyx à última mensagem.`,
        CS_SYSTEM + "\n\n" + persona,
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
      setMsgs(ms => [...ms, { from:"nyx", text: e.message === "ROBOTKEY_MISSING" ? "Estou offline 😴 — o professor precisa configurar a ANTHROPIC_API_KEY no Vercel." : "Tive um probleminha agora. Tenta de novo?" }]);
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
              <div key={i} style={{ display:"flex", justifyContent:m.from==="user"?"flex-end":"flex-start", marginTop:8 }}>
                <div style={{ background:m.from==="user"?accent+"2e":"#0d1122", border:`1px solid ${m.from==="user"?accent+"66":"#272e52"}`, borderRadius:m.from==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px", padding:"9px 12px", fontSize:13, color:"#e8ebfa", lineHeight:1.6, maxWidth:"88%", whiteSpace:"pre-wrap" }}>{m.text}</div>
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

function TourOverlay({ step, onNext, onSkip }) {
  const [rect, setRect] = useState(null);
  const s = TOUR_STEPS[step];
  useEffect(() => {
    const el = document.querySelector(s.sel);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block:"center" });
    const t = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setRect({ top:r.top, left:r.left, width:r.width, height:r.height, bottom:r.bottom });
    }, 150);
    return () => clearTimeout(t);
  }, [step, s.sel]);
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const below = rect ? rect.bottom + 200 < vh : true;
  const tipTop = rect ? (below ? Math.min(rect.bottom + 14, vh - 210) : Math.max(rect.top - 206, 10)) : vh/2 - 100;
  const tipLeft = rect ? Math.max(12, Math.min(rect.left + rect.width/2 - 170, vw - 356)) : 20;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:990 }}>
      {rect
        ? <div style={{ position:"fixed", top:rect.top-6, left:rect.left-6, width:rect.width+12, height:rect.height+12, borderRadius:14, border:"3px solid #7c83ff", boxShadow:"0 0 0 9999px rgba(5,7,18,.78), 0 0 24px #7c83ff88", transition:"all .3s ease", pointerEvents:"none" }} />
        : <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.78)" }} />}
      <div className="pop" key={step} style={{ position:"fixed", top:tipTop, left:tipLeft, width:340, maxWidth:"calc(100vw - 24px)", background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #7c83ff66", borderRadius:16, padding:"14px 16px", boxShadow:"0 18px 50px rgba(0,0,0,.6)" }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
          <div style={{ flexShrink:0, marginTop:-6 }}><NyxRobot state="idle" size={46} showName={false} /></div>
          <div>
            <div style={{ fontWeight:800, color:"#e8ebfa", fontSize:14.5 }}>{s.emoji} {s.title}</div>
            <p style={{ color:"#c7cfee", fontSize:13, lineHeight:1.6, margin:"6px 0 0" }}>{s.text}</p>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
          <button onClick={onSkip} style={{ background:"transparent", border:"none", color:"#5d679c", cursor:"pointer", fontSize:12, fontWeight:700 }}>Pular tour</button>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ color:"#5d679c", fontSize:12 }}>{step+1}/{TOUR_STEPS.length}</span>
            <button onClick={onNext} style={{ background:"linear-gradient(135deg,#7c83ff,#5a61e8)", border:"none", borderRadius:10, color:"#fff", fontWeight:800, padding:"7px 16px", cursor:"pointer", fontSize:13 }}>{step === TOUR_STEPS.length-1 ? "Entendi! 🚀" : "Próximo →"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  LOJA DO NYX  (troca pontos de acerto por acessórios cosméticos)
// ════════════════════════════════════════════════════════════════════════════
function NyxShop({ points, gear, onEquip, isTestShift, onClose }) {
  const toggle = (item) => {
    if (!isTestShift && points < item.cost) return;
    const isEquipped = gear[item.slot] === item.id;
    onEquip({ ...gear, [item.slot]: isEquipped ? null : item.id });
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(5,7,18,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#181d38,#131730)", border:"1px solid #2c3358", borderRadius:22, padding:"22px 24px", maxWidth:560, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#7c83ff,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🎁 Loja do Nyx</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#96a0cc", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <p style={{ color:"#96a0cc", fontSize:13, margin:"0 0 14px" }}>
          {isTestShift ? "🧪 Turma de teste: todos os itens estão liberados para você testar!" : "Cada resposta certa nas atividades e provas vira 1 ponto. Use para desbloquear e equipar acessórios no Nyx!"}
        </p>

        <div style={{ display:"flex", alignItems:"center", gap:16, background:"#0d1122", border:"1px solid #2a3154", borderRadius:16, padding:16, marginBottom:16 }}>
          <NyxRobot state="ok" size={72} showName={false} gear={gear} />
          <div>
            <div style={{ color:"#fbbf24", fontWeight:900, fontSize:22 }}>{points} pts</div>
            <div style={{ color:"#5d679c", fontSize:12 }}>Toque num item desbloqueado para vestir ou tirar</div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
          {NYX_ITEMS.map(item => {
            const unlocked = isTestShift || nyxItemUnlocked(points, item);
            const equipped = gear[item.slot] === item.id;
            return (
              <button key={item.id} data-item={item.id} onClick={()=>toggle(item)} disabled={!unlocked}
                style={{
                  background: equipped ? "#7c83ff26" : "#0d1122",
                  border: `2px solid ${equipped ? "#7c83ff" : unlocked ? "#2a3154" : "#241f38"}`,
                  borderRadius:14, padding:"14px 10px", textAlign:"center", cursor: unlocked?"pointer":"default",
                  opacity: unlocked ? 1 : 0.55, position:"relative",
                }}>
                <div style={{ fontSize:30, filter: unlocked?"none":"grayscale(1)" }}>{item.emoji}</div>
                <div style={{ color:"#e8ebfa", fontSize:12.5, fontWeight:700, marginTop:6 }}>{item.label}</div>
                {unlocked ? (
                  equipped
                    ? <div style={{ color:"#7c83ff", fontSize:11, fontWeight:800, marginTop:4 }}>✓ Equipado</div>
                    : <div style={{ color:"#5d679c", fontSize:11, marginTop:4 }}>{item.cost} pts</div>
                ) : (
                  <div style={{ color:"#5d679c", fontSize:11, marginTop:4 }}>🔒 {points}/{item.cost} pts</div>
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
            : <p style={{ color:"#c7cfee", fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap", margin:0 }}>{feedback || "Parabéns por concluir a aula de hoje!"}</p>}
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
                <div style={{ fontSize:26, filter:got?"none":"grayscale(1)" }}>{a.emoji}</div>
                <div>
                  <div style={{ color:"#e8ebfa", fontWeight:800, fontSize:13 }}>{a.label}</div>
                  <div style={{ color:"#5d679c", fontSize:11.5 }}>{a.desc}</div>
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
      <div style={{ background:"#0d1122", border:"1px solid #2a3154", borderRadius:20, height:10, overflow:"hidden" }}>
        <div style={{ width:`${g.pct}%`, height:"100%", background:"linear-gradient(90deg,#7c83ff,#22d3ee)", transition:"width .5s ease" }} />
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
  return data.content?.map(b=>b.text||"").join("")||"";
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
  // loja do Nyx (pontos ganhos por acerto + acessórios equipados)
  const [nyxPoints, setNyxPoints] = useState(0);
  const [nyxGear, setNyxGear] = useState(DEFAULT_NYX_GEAR);
  const [showNyxShop, setShowNyxShop] = useState(false);
  // conquistas, ranking, meta da turma, curiosidade do dia, duelo, sons
  const [achievements, setAchievements] = useState([]);
  const [newAchievement, setNewAchievement] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [classPointsSum, setClassPointsSum] = useState(0);
  const [curiosity, setCuriosity] = useState(null);
  const [curiosityDismissed, setCuriosityDismissed] = useState(false);
  const [comboMsg, setComboMsg] = useState(null);
  const [muted, setMuted] = useState(() => loadSoundsMuted());
  const [showDuel, setShowDuel] = useState(false);
  const [duelDoc, setDuelDoc] = useState(null);
  const streakRef = useRef(0);
  // travas acionadas pelo professor (zek = tela bloqueada; zeker = duelos bloqueados)
  const [nyxLocks, setNyxLocksState] = useState({ zek: false, zeker: false });
  // quando a atividade de hoje foi concluída (mantém o status até as 9h do dia seguinte)
  const [doneAt, setDoneAt] = useState(null);

  const sessionStart = useRef(Date.now());
  const stateRef = useRef({});
  const debounceRef = useRef(null);
  const attendanceRef = useRef({});
  // "foto" do código no primeiro acesso do dia: o resumo da aula cobre só o que foi escrito DEPOIS dela
  const daySnapshotRef = useRef(null);
  const activeCode = files[active]?.code || "";

  useEffect(() => {
    stateRef.current = { files, code:activeCode, avatar, phase, score, answers, feedback, dynamicActivity, dynamicSummary, finalFeedback, classFeedback: classFb, examReady, examScore, examAnswers, examDone, theme, nyxPoints, nyxGear, achievements, doneAt };
  });

  // se o professor bloquear os duelos com o modal aberto, fecha na hora
  useEffect(() => { if (nyxLocks.zeker && showDuel) setShowDuel(false); }, [nyxLocks.zeker, showDuel]);

  const persist = useCallback(async (extra = {}) => {
    const s = stateRef.current;
    // presença do dia: "present" se já fez algo de verdade hoje, senão "idle" (entrou mas parado)
    const tk = todayKey();
    const didWork = (s.code && s.code.trim().length >= 10) || (s.phase && s.phase !== "coding") || (s.score != null) || (s.answers && Object.keys(s.answers).length > 0);
    attendanceRef.current = { ...attendanceRef.current, [tk]: didWork ? "present" : "idle" };
    const ok = await saveStudent(shift, studentName, {
      name: studentName,
      shift: shift || "sem-turno",
      avatar: s.avatar || DEFAULT_AVATAR,
      joinedAt: sessionStart.current,
      lastSeen: Date.now(),
      attendance: attendanceRef.current,
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
      theme: s.theme || "dark",
      nyxPoints: s.nyxPoints || 0,
      nyxGear: s.nyxGear || DEFAULT_NYX_GEAR,
      achievements: s.achievements || [],
      doneAt: s.doneAt || null,
      daySnapshot: daySnapshotRef.current || null,
      ...extra,
    });
    setConnected(ok);
    return ok;
  }, [studentName, shift]);

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
          if (prev.classFeedback) { setClassFb(prev.classFeedback); setClassRating(prev.classFeedback.rating||0); setClassText(prev.classFeedback.text||""); setClassSent(true); }
          if (prev.feedback) { setFeedback(prev.feedback); setRobotMsg(prev.feedback.message||""); setRobotState(prev.feedback.ok?"ok":"error"); setKeysToShow(prev.feedback.missingChars||[]); }
          if (prev.examReady) setExamReady(true);
          if (prev.examScore != null) setExamScore(prev.examScore);
          if (prev.examAnswers) setExamAnswers(prev.examAnswers);
          if (prev.examDone) setExamDone(true);
          if (prev.theme) setTheme(prev.theme);
          if (prev.nyxPoints) setNyxPoints(prev.nyxPoints);
          if (prev.nyxGear) setNyxGear({ ...DEFAULT_NYX_GEAR, ...prev.nyxGear });
          if (Array.isArray(prev.achievements)) setAchievements(prev.achievements);
          if (prev.doneAt) setDoneAt(prev.doneAt);
        }
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

  // busca a curiosidade do dia (gerada uma única vez por dia, reaproveitada por todos os alunos)
  useEffect(() => {
    let alive = true;
    (async () => {
      const today = todayKey();
      let c = await getDailyCuriosity(today);
      if (!c && alive) {
        try {
          const text = await askClaude(
            `Dê UMA curiosidade curta (1-2 frases), divertida e surpreendente sobre programação, C#, tecnologia ou história da computação, para adolescentes que estão começando a programar agora. Sem introdução, direto na curiosidade.`,
            NYX_FUN_SYSTEM,
            { temperature: 0.9 }
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
        if (alive) setClassPointsSum(mine.reduce((sum, s) => sum + (s.nyxPoints || 0), 0));
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
          const partial = pts * 10;
          setExamScore(partial); setExamDone(true);
          const newNyxPoints = (s.nyxPoints || 0) + pts;
          setNyxPoints(newNyxPoints);
          await persist({ examScore: partial, examDone: true, nyxPoints: newNyxPoints });
          if (qs.length && pts / qs.length >= 0.8) unlockAchievement("prova-mestre");
        } else if (es.status === 'idle' && s.examDone) {
          // professor resetou a prova
          setExamReady(false); setExamScore(null); setExamAnswers({}); setExamDone(false); setExamCurrentQ(0);
          await persist({ examReady: false, examScore: null, examAnswers: {}, examDone: false });
        }
        setExamInfo(es);
      } catch {}
      // travas do professor (zek / zeker)
      try {
        const locks = await getNyxLocks();
        setNyxLocksState({ zek: !!locks.zek, zeker: !!locks.zeker });
      } catch {}
      // professor renomeou/moveu/excluiu este perfil → sai da sessão antiga
      try {
        if (await checkKick(shift, studentName, sessionStart.current)) { active2 = false; onLogout(); return; }
      } catch {}
      // professor corrigiu a nota da atividade → aplica e limpa a flag
      try {
        const fix = await getScoreFix(shift, studentName);
        if (fix && typeof fix.score === "number") {
          setScore(fix.score);
          await clearScoreFix(shift, studentName);
          await persist({ score: fix.score });
        }
      } catch {}
      await persist();
      const streak = computeStreak(attendanceRef.current);
      if (streak >= 7) unlockAchievement("sequencia-7");
      else if (streak >= 3) unlockAchievement("sequencia-3");
    };
    tick();
    const iv = setInterval(tick, 3000);
    return () => { active2 = false; clearInterval(iv); };
  }, [loaded, persist, onLogout, shift, studentName]);

  // robô: 5 segundos depois que o aluno para de digitar
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = activeCode.trim();
    if (trimmed.length < 12) { setRobotState("idle"); setRobotMsg(""); setKeysToShow([]); setFeedback(null); return; }
    debounceRef.current = setTimeout(async () => {
      setRobotState("thinking"); setAnalyzing(true);
      const quick = quickCheck(activeCode);
      if (quick) {
        const fb = { ok:false, message:quick.message, missingChars:quick.missing||[] };
        setRobotState("error"); setRobotMsg(quick.message); setKeysToShow(quick.missing||[]); setFeedback(fb);
        await persist({ feedback:fb, hasError:true });
        setAnalyzing(false);
        return;
      }
      try {
        const parsed = await askClaudeJson(
          `Revise o código C# de um aluno iniciante como um COMPILADOR faria, linha por linha.\n\n${otherFilesCtx(files, active)}Arquivo em edição (${files[active]?.name || "Program.cs"}):\n\`\`\`csharp\n${activeCode}\n\`\`\`\n\nO que verificar (nesta ordem):\n1. Maiúsculas/minúsculas: Console.WriteLine, Console.ReadLine, Convert.ToInt32, int.Parse — "console.writeline", "Console.writeline" e "Console.Writeline" estão ERRADOS.\n2. Tipos em minúsculo (regra da turma): string, int, double, bool, char — se usou String/Int32/Double/Boolean, avise para trocar pela forma minúscula.\n3. Ponto e vírgula ; faltando no fim de instruções (declarações, chamadas, atribuições).\n4. Chaves { }, parênteses ( ) e aspas " — conte os pares no arquivo INTEIRO antes de acusar falta.\n5. Palavras-chave erradas (publik, voi, whille, pritn, statics, clas).\n6. Variáveis usadas sem declarar (confira TODAS as linhas anteriores antes de acusar) e comparação com = em vez de ==.\n7. Console.ReadLine lido direto para int/double sem Convert/Parse.\n\nLembretes IMPORTANTES:\n- Top-level statements (código sem class/Main) e ausência de using System são VÁLIDOS — não são erro.\n- Não aponte classe/método "inexistente" se estiver definido em outro arquivo do projeto.\n- NÃO invente erro em código correto. Na dúvida real, prefira ok=true.\n\nResponda APENAS em JSON puro, sem markdown, com os campos NESTA ordem:\n{"analise": "sua verificação rápida linha a linha, citando o que conferiu (máx 3 frases — o aluno não vê isto)", "ok": true ou false, "message": "se tudo certo: elogio bem curto; se houver erro: onde está (linha/trecho) e como corrigir mostrando a forma certa, em 1 a 3 frases gentis", "missingChars": ["só símbolos que faltam, ex: ; } ) — vazio se nenhum"]}`,
          CS_SYSTEM + "\nResponda APENAS JSON puro, sem markdown.",
          { temperature: 0 }
        );
        setRobotState(parsed.ok?"ok":"error"); setRobotMsg(parsed.message); setKeysToShow(parsed.missingChars||[]); setFeedback(parsed);
        await persist({ feedback:parsed, hasError:!parsed.ok });
        if (parsed.ok) unlockAchievement("codigo-limpo");
      } catch(e) {
        if (e.message === 'ROBOTKEY_MISSING') {
          setRobotState("error");
          setRobotMsg("🔑 Nyx está offline: o professor precisa configurar a chave ANTHROPIC_API_KEY no painel do Vercel. A verificação básica do código continua funcionando!");
        } else {
          setRobotState("idle"); setRobotMsg("");
        }
      }
      setAnalyzing(false);
    }, 5000);
  }, [activeCode]);

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
    setPhase("generating");
    setGeneratingMsg("📖 Lendo seu código...");
    await persist({ phase:"generating", answers:{} });
    try {
      setGeneratingMsg("📚 Criando o resumo da sua aula...");
      const todayCode = codeWrittenToday();
      const hasTodayDiff = todayCode.trim().length >= 10 && todayCode.trim() !== fullCode.trim();
      const summaryResult = await askClaude(
        (hasTodayDiff
          ? `Projeto C# completo de um aluno iniciante (contexto — inclui código de aulas ANTERIORES):\n\`\`\`csharp\n${fullCode}\n\`\`\`\n\nTRECHOS QUE ELE ESCREVEU HOJE, na aula de hoje (extraídos por comparação com o início do dia):\n\`\`\`csharp\n${todayCode}\n\`\`\`\n\nCrie um resumo da AULA DE HOJE: cubra APENAS os conceitos que aparecem nos trechos escritos hoje. NÃO faça seções sobre conceitos que só existem no código das aulas anteriores — o projeto completo é só contexto para você entender os trechos novos.`
          : `Um aluno iniciante de C# escreveu este código na aula de hoje (pode ter mais de um arquivo, todos fazem parte do mesmo projeto):\n\`\`\`csharp\n${fullCode}\n\`\`\`\n\nCrie um resumo da aula`) +
        ` bem organizado e didático, em português brasileiro CORRETO (sem erros de digitação), para quem está começando agora.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "intro": "1 ou 2 frases curtas e acolhedoras dizendo o que esta aula ensinou, com base no código dele",\n  "secoes": [\n    { "emoji": "um emoji que combine com o conceito", "titulo": "nome curto e claro do conceito (ex: Mostrar texto na tela)", "explicacao": "explicação bem simples, de 1 a 3 frases, do que isso faz e por quê", "exemplo": "um trecho de código C# curto e correto mostrando o uso (use \\n para quebrar linhas)" }\n  ],\n  "dica": "uma dica final curta, útil e motivadora para o aluno"\n}\n\nFaça uma seção (entre 3 e 7) para cada conceito, palavra-chave ou símbolo importante que aparece no ${hasTodayDiff ? "código escrito HOJE" : "código dele, olhando TODOS os arquivos"} (ex: using, class, static void Main, string, int, Console.WriteLine, Console.ReadLine, ; , { }). Linguagem bem de iniciante. Exemplos curtos, corretos e fáceis de copiar. Garanta JSON válido (aspas escapadas corretamente).`,
        "Você é um professor de C# paciente e organizado, para iniciantes. Português correto e simples. Responda APENAS JSON puro válido."
      );
      let summaryData;
      try { summaryData = extractJson(summaryResult); }
      catch { summaryData = { raw: summaryResult }; }
      setDynamicSummary(summaryData);
      setGeneratingMsg("📝 Criando atividade sobre seu código...");
      const activityResult = await askClaude(
        `Um aluno de C# escreveu este código na aula de hoje (pode ter mais de um arquivo, todos do mesmo projeto):\n\`\`\`csharp\n${fullCode}\n\`\`\`\n\nCrie 8 questões de múltipla escolha focadas em CONCEITOS DE CÓDIGO que aparecem no que ele escreveu, olhando TODOS os arquivos: o que faz cada palavra-chave/instrução, para que serve cada estrutura, o papel de cada símbolo, a função de cada tipo de dado, e o que acontece ao executar cada parte. Varie a dificuldade (algumas fáceis, algumas médias). NÃO faça perguntas de matemática.\n\nResponda APENAS JSON puro sem markdown:\n{"questions":[{"q":"pergunta","opts":["A","B","C","D"],"correct":0}]}`,
        "Crie questões sobre conceitos de código C#, não matemática. APENAS JSON puro."
      );
      const parsed = extractJson(activityResult);
      const questions = shuffleQuestions(parsed.questions);
      setDynamicActivity(questions);
      await persist({ phase:"summary", dynamicActivity:questions, dynamicSummary:summaryData });
      setPhase("summary");
    } catch {
      setGeneratingMsg("❌ Erro ao gerar. Tente novamente.");
      setTimeout(() => { setPhase("coding"); persist({ phase:"coding" }); }, 2500);
    }
  };

  const handleStartActivity = async () => { setPhase("activity"); streakRef.current = 0; await persist({ phase:"activity" }); };

  const COMBO_MESSAGES = { 3:"🔥 3 seguidas! Você tá pegando o jeito!", 5:"⚡ 5 seguidas! Combo elétrico!", 8:"🚀 8 seguidas?! Combo insano!!" };
  const pickAnswer = (i, j) => {
    if (answers[i] != null) return; // trava depois de responder, pra não dar pra "testar" as opções
    const activity = dynamicActivity || [];
    setAnswers(a => ({ ...a, [i]: j }));
    const isCorrect = j === activity[i]?.correct;
    playSound(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      streakRef.current += 1;
      const msg = COMBO_MESSAGES[streakRef.current];
      if (msg) { setComboMsg(msg); playSound("combo"); setTimeout(() => setComboMsg(null), 2600); }
      if (streakRef.current === 8) unlockAchievement("combo-8");
      else if (streakRef.current === 5) unlockAchievement("combo-5");
    } else {
      streakRef.current = 0;
    }
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
    await persist({ phase:"done", score:finalScore, answers, nyxPoints: newNyxPoints, doneAt: completedAt });
    unlockAchievement("primeira-atividade");
    if (finalScore >= 100) unlockAchievement("nota-cem");
    try {
      const list = activity.map((q,i)=>`- ${q.q} → ${answers[i]===q.correct?"acertou":"errou"}`).join("\n");
      const fb = await askClaude(
        `Um aluno iniciante de C# escreveu este código na aula de hoje:\n\`\`\`csharp\n${allCodeToday()}\n\`\`\`\n\nDepois respondeu uma atividade de ${activity.length} perguntas e acertou ${pts} (nota ${finalScore}).\nResultado pergunta a pergunta:\n${list}\n\nEscreva um feedback curto, gentil e motivador em português para ESTE aluno, baseado no código que ele escreveu E no desempenho. Diga o que ele mandou bem e um ponto para melhorar. No final, dê UMA dica interessante e específica para o nível dele: se foi bem (nota alta e código sem erros), traga uma curiosidade ou um próximo passo um pouco mais avançado para se desafiar; se teve dificuldade, traga uma dica simples e prática para melhorar o ponto que ele errou. Máximo 4 frases, sem markdown, sem títulos.`,
        "Você é um professor de C# gentil e motivador, escrevendo direto para um aluno iniciante. Português brasileiro."
      );
      setFinalFeedback(fb);
      await persist({ phase:"done", score:finalScore, answers, finalFeedback:fb });
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
    if (qIdx < qs.length - 1) {
      setExamCurrentQ(qIdx + 1);
      await persist({ examAnswers: newAnswers });
    } else {
      let pts = 0;
      qs.forEach((q, i) => { if (newAnswers[i] === q.correct) pts++; });
      const finalScore = pts * 10;
      setExamScore(finalScore); setExamDone(true);
      const newNyxPoints = nyxPoints + pts;
      setNyxPoints(newNyxPoints);
      await persist({ examAnswers: newAnswers, examScore: finalScore, examDone: true, nyxPoints: newNyxPoints });
      if (qs.length && pts / qs.length >= 0.8) unlockAchievement("prova-mestre");
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
  const styles = {
    container:{ minHeight:"100vh", background:pageBgFor(theme), color:"#e8ebfa", fontFamily:FONT },
    header:{ background:"rgba(17,21,42,.85)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #2a3154", boxShadow:"0 1px 0 #7c83ff33, 0 8px 24px rgba(3,5,16,.35)", position:"sticky", top:0, zIndex:40 },
    card:{ background:"linear-gradient(180deg,#181d38,#131730)", borderRadius:16, padding:16, margin:"10px 0", border:"1px solid #272e52", boxShadow:"0 8px 24px rgba(3,5,16,.35)", animation:"rise .35s ease both" },
    btn:(c)=>({ background:`linear-gradient(135deg, ${c}, ${shade(c,-0.18)})`, color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontWeight:800, fontSize:14, boxShadow:`0 4px 14px ${c}44` }),
    opt:(sel)=>({ background:sel?"#7c83ff22":"#131730", border:`2px solid ${sel?"#7c83ff":"#272e52"}`, borderRadius:10, padding:"10px 14px", marginBottom:8, cursor:"pointer", color:"#e8ebfa", textAlign:"left", width:"100%" }),
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

  // ── PROVA: telas de exame têm prioridade ──
  if (examDone) return (
    <div style={styles.container}>
      <AchievementToast achievement={newAchievement} />
      <div style={styles.header}><span>🏆 Prova Concluída — {studentName}</span></div>
      <div style={{ maxWidth:500, margin:"50px auto", textAlign:"center", padding:"0 16px" }}>
        <div style={{ background:"linear-gradient(135deg,#34d399,#16a34a)", borderRadius:18, padding:32, boxShadow:"0 12px 30px #34d39944" }}>
          <div style={{ fontSize:52 }}>🏆</div>
          <h1 style={{ color:"#fff", fontSize:26, margin:"12px 0" }}>Parabéns, {studentName}!</h1>
          <div style={{ fontSize:56, fontWeight:900, color:"#fff", margin:"8px 0" }}>{examScore ?? 0}</div>
          <p style={{ color:"#d1fae5", fontSize:15 }}>pontos de {(examInfo.questions||[]).length * 10}</p>
        </div>
        <p style={{ color:"#96a0cc", marginTop:20, fontSize:14, lineHeight:1.6 }}>Aguarde o professor encerrar a prova para ver o ranking da turma!</p>
      </div>
    </div>
  );

  if (examInfo.status === 'review') return (
    <div style={styles.container}>
      <div style={styles.header}><span>📝 Revisão — {studentName}</span></div>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"22px 16px 36px" }}>
        <div style={{ background:"linear-gradient(135deg,#7c83ff,#8b5cf6)", borderRadius:18, padding:"24px 22px", textAlign:"center", boxShadow:"0 12px 30px #7c83ff55" }}>
          <div style={{ fontSize:44 }}>📝</div>
          <h1 style={{ color:"#fff", fontSize:24, margin:"8px 0" }}>Hora da Prova!</h1>
          <p style={{ color:"#e0e7ff", fontSize:14, lineHeight:1.6 }}>Revise o conteúdo abaixo e entre na sala quando estiver pronto.</p>
        </div>
        <div style={{ ...styles.card, marginTop:14 }}>
          <h3 style={{ color:"#7c83ff", marginBottom:10 }}>📚 Resumo de Revisão</h3>
          <div style={{ color:"#c7cfee", fontSize:14, lineHeight:1.9, whiteSpace:"pre-wrap" }}>{examInfo.summary || "Preparando o resumo..."}</div>
        </div>
        {examReady ? (
          <div style={{ ...styles.card, textAlign:"center", padding:24 }}>
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
      <div style={styles.container}>
        <div style={styles.header}>
          <span>🏆 Prova — {studentName}</span>
          <span style={{ color:"#96a0cc", fontSize:13 }}>Questão {examCurrentQ+1} de {qs.length}</span>
        </div>
        <div style={{ maxWidth:620, margin:"30px auto", padding:"0 16px" }}>
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
    <div style={styles.container}>
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
    const sum = dynamicSummary;
    const structured = sum && typeof sum === "object" && Array.isArray(sum.secoes) && sum.secoes.length > 0;
    const ACCENTS = ["#7c83ff","#34d399","#fbbf24","#06b6d4","#ec4899","#8b5cf6","#f87171"];
    return (
      <div style={styles.container}>
        <div style={styles.header}><span>📚 Resumo da Aula — {studentName}</span></div>
        <div style={{ maxWidth:740, margin:"0 auto", padding:"22px 16px 36px" }}>
          {/* topo em destaque */}
          <div style={{ background:"linear-gradient(135deg,#7c83ff,#8b5cf6)", borderRadius:18, padding:"24px 22px", textAlign:"center", boxShadow:"0 12px 30px #7c83ff55" }}>
            <div style={{ fontSize:44 }}>📚</div>
            <h1 style={{ color:"#fff", fontSize:25, margin:"4px 0 8px" }}>Resumo da sua aula</h1>
            <p style={{ color:"#e0e7ff", fontSize:15, maxWidth:560, margin:"0 auto", lineHeight:1.6 }}>
              {structured && sum.intro ? sum.intro : "Aqui está tudo o que você aprendeu hoje, explicado passo a passo. 📒 Anote no caderno!"}
            </p>
          </div>

          {structured ? (
            <div style={{ marginTop:18 }}>
              {sum.secoes.map((s,i)=>{
                const c = ACCENTS[i % ACCENTS.length];
                return (
                  <div key={i} style={{ background:"#151a31", borderRadius:14, padding:18, margin:"0 0 14px", border:"1px solid #2a3154", borderLeft:`5px solid ${c}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                      <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{s.emoji || "📌"}</span>
                      <div>
                        <div style={{ color:c, fontSize:11, fontWeight:800, letterSpacing:1 }}>PARTE {i+1}</div>
                        <h3 style={{ color:"#e8ebfa", fontSize:17, margin:0 }}>{s.titulo}</h3>
                      </div>
                    </div>
                    {s.explicacao && <p style={{ color:"#c7cfee", fontSize:15, lineHeight:1.75, margin:"0 0 4px" }}>{s.explicacao}</p>}
                    {s.exemplo && <CodeBlock code={s.exemplo} />}
                  </div>
                );
              })}
              {sum.dica && (
                <div style={{ background:"#fbbf2416", border:"1px solid #fbbf24", borderRadius:14, padding:18, margin:"4px 0 0", display:"flex", gap:12 }}>
                  <div style={{ fontSize:26, lineHeight:1 }}>💡</div>
                  <div>
                    <h4 style={{ color:"#fbbf24", margin:"0 0 4px" }}>Dica do Nyx</h4>
                    <p style={{ color:"#fcd9a0", fontSize:15, lineHeight:1.7, margin:0 }}>{sum.dica}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...styles.card, marginTop:18 }}>
              <pre style={{ whiteSpace:"pre-wrap", fontFamily:"inherit", fontSize:14, lineHeight:1.9, color:"#c7cfee", margin:0 }}>{typeof sum==="string" ? sum : (sum && sum.raw) || "O resumo não carregou. Volte e clique em Salvar novamente."}</pre>
            </div>
          )}

          <div style={{ textAlign:"center", marginTop:22 }}>
            <p style={{ color:"#96a0cc", marginBottom:12 }}>Quando terminar de anotar, vá para a atividade! ✍️</p>
            <button style={{ ...styles.btn("#7c83ff"), padding:"12px 26px", fontSize:16 }} onClick={handleStartActivity}>Fazer Atividade →</button>
          </div>
        </div>
      </div>
    );
  }
  if (phase==="activity") {
    const activity = dynamicActivity||[];
    return (
      <div style={styles.container}>
        <AchievementToast achievement={newAchievement} />
        <div style={styles.header}><span>📝 Atividade — {studentName}</span></div>
        {comboMsg && (
          <div style={{ position:"fixed", top:70, left:"50%", transform:"translateX(-50%)", zIndex:1200, background:"linear-gradient(135deg,#7c83ff,#22d3ee)", color:"#fff", fontWeight:900, padding:"10px 22px", borderRadius:20, boxShadow:"0 10px 30px rgba(0,0,0,.4)", animation:"rise .3s ease both", fontSize:15 }}>
            {comboMsg}
          </div>
        )}
        <div style={{ maxWidth:640, margin:"0 auto", padding:24 }}>
          <h2 style={{ color:"#7c83ff" }}>Atividade da Aula</h2>
          <p style={{ color:"#96a0cc", fontSize:13, marginBottom:16 }}>Baseada no código que você escreveu hoje!</p>
          {activity.map((q,i)=>{
            const answered = answers[i] != null;
            return (
              <div key={i} style={styles.card}>
                <p style={{ fontWeight:600, marginBottom:12 }}>{i+1}. {q.q}</p>
                {q.opts.map((opt,j)=>{
                  const picked = answers[i]===j;
                  const showResult = answered && picked;
                  return (
                    <button key={j} style={styles.opt(picked)} onClick={()=>pickAnswer(i,j)} disabled={answered}>
                      {opt}
                      {showResult && (j===q.correct ? <span style={{ color:"#34d399", fontWeight:800 }}> ✅</span> : <span style={{ color:"#f87171", fontWeight:800 }}> ❌</span>)}
                    </button>
                  );
                })}
              </div>
            );
          })}
          <div style={{ textAlign:"right" }}>
            <button style={styles.btn("#7c83ff")} onClick={handleSubmitActivity} disabled={Object.keys(answers).length<activity.length}>Enviar Atividade →</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase==="done") {
    const activity = dynamicActivity||[];
    const g = gradeInfo(score);
    const backToHome = async () => { setPhase("coding"); await persist({ phase:"coding" }); };
    return (
      <div style={styles.container}>
        <AchievementToast achievement={newAchievement} />
        {showFeedbackModal && (
          <NyxFeedbackModal score={score} loading={feedbackLoading} feedback={finalFeedback} onClose={()=>setShowFeedbackModal(false)} />
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

          <div style={{ ...styles.card, marginTop:18, textAlign:"left", borderColor:"#7c83ff" }}>
            <h4 style={{ color:"#7c83ff", marginBottom:8 }}>🤖 Feedback do Nyx para você</h4>
            {feedbackLoading ? <p style={{ color:"#96a0cc", fontSize:14 }}>Analisando seu código e sua atividade...</p>
              : finalFeedback ? <p style={{ color:"#c7cfee", fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{finalFeedback}</p>
              : <p style={{ color:"#96a0cc", fontSize:14 }}>Parabéns por concluir a aula de hoje!</p>}
          </div>

          <div style={{ ...styles.card, marginTop:14, textAlign:"left" }}>
            <h4 style={{ color:"#7c83ff", marginBottom:10 }}>📝 Revisão da atividade</h4>
            {activity.map((q,i)=>(
              <div key={i} style={{ marginBottom:12 }}>
                <b style={{ color:answers[i]===q.correct?"#34d399":"#f87171" }}>{answers[i]===q.correct?"✅":"❌"} {q.q}</b>
                {answers[i]!==q.correct&&<div style={{ color:"#96a0cc", fontSize:13, marginTop:2 }}>Correto: {q.opts[q.correct]}</div>}
              </div>
            ))}
          </div>

          {(dynamicActivity||[]).some((q,i)=>answers[i]!==q.correct) && (
            <div style={{ ...styles.card, marginTop:14, textAlign:"left", borderColor:"#7c83ff" }}>
              <h4 style={{ color:"#7c83ff", marginBottom:8 }}>🤖 Não entendeu algum erro?</h4>
              <p style={{ color:"#96a0cc", fontSize:13, lineHeight:1.6, marginBottom:10 }}>O Nyx pode explicar cada questão que você errou, com calma e do seu jeito.</p>
              <button style={{ ...styles.btn("#7c83ff"), opacity:explaining?0.6:1 }} onClick={explainErrors} disabled={explaining}>{explaining ? "Nyx está escrevendo..." : "✨ Nyx, me explica meus erros!"}</button>
              {explainFailMsg && <p style={{ color:"#f87171", fontSize:13, marginTop:8 }}>{explainFailMsg}</p>}
            </div>
          )}

          {/* Avaliação da aula → professor */}
          <div style={{ ...styles.card, marginTop:14, textAlign:"left", borderColor:"#fbbf24" }}>
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

  // ── CODING ──
  return (
    <div style={styles.container}>
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
          <span style={{ fontWeight:900, fontSize:17, background:"linear-gradient(135deg,#7c83ff,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>💻 Aula C#</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12, color: connected===false?"#f87171":connected?"#34d399":"#96a0cc" }}>
            {connected===null ? "● conectando..." : connected ? "● conectado" : "● sem conexão"}
          </span>
          <span style={{ background:"#7c83ff22", padding:"4px 12px", borderRadius:20, fontSize:13 }}>👤 {studentName}</span>
          <span style={{ background:"#0d1122", border:"1px solid #2a3154", padding:"4px 10px", borderRadius:20, fontSize:12, color:"#96a0cc" }}>{shiftLabel(shift)}</span>
          <button data-tour="tema" style={{ ...styles.btn("#2a3154"), padding:"6px 12px", fontSize:12 }} onClick={()=>setThemeAndSave(theme==="light"?"dark":"light")} title="Mudar tema do fundo">{theme==="light"?"🌙 Escuro":"☀️ Claro"}</button>
          <button style={{ ...styles.btn("#2a3154"), padding:"6px 12px", fontSize:12 }} onClick={toggleMuted} title={muted?"Ativar sons":"Silenciar sons"}>{muted?"🔇":"🔊"}</button>
          <button style={{ ...styles.btn("#2a3154"), padding:"6px 12px", fontSize:12 }} onClick={tryFullscreen}>⛶ Tela cheia</button>
          <button style={{ ...styles.btn("#f87171"), padding:"6px 12px", fontSize:12 }} onClick={onLogout}>Sair</button>
        </div>
      </div>

      <AchievementToast achievement={newAchievement} />

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

      {curiosity && !curiosityDismissed && phase==="coding" && (
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
            <VSEditor value={activeCode} onChange={updateActiveCode} filename={files[active]?.name} />
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8, flexWrap:"wrap", gap:8 }}>
            <span style={{ color: saveWarn ? "#fbbf24" : "#5d679c", fontSize:12 }}>{saveWarn || (analyzing?"🔍 Verificando...":"✨ Nyx confere seu código 5s depois que você para de escrever")}</span>
            <button data-tour="salvar" style={styles.btn("#34d399")} onClick={handleSave}>💾 Salvar e Finalizar Aula</button>
          </div>

          <Terminal files={files} dataTour="terminal" />
        </div>

        {/* Robô + atalhos */}
        <div style={{ width:250, flex:"0 0 250px" }}>
          <div data-tour="nyx" style={styles.card}>
            <NyxRobot state={robotState} size={88} gear={nyxGear} />
            {robotMsg&&(<div style={{ background:robotState==="error"?"#f8717111":"#34d39911", border:`1px solid ${robotState==="error"?"#f87171":"#34d399"}`, borderRadius:8, padding:12, marginTop:10, fontSize:13, lineHeight:1.6 }}>{robotMsg}</div>)}
            {keysToShow.length>0&&(<div style={{ marginTop:10 }}><p style={{ color:"#fbbf24", fontSize:12, fontWeight:600, marginBottom:4 }}>Teclas para usar:</p>{keysToShow.map((k,i)=><KeyVisual key={i} char={k}/>)}</div>)}
            <button data-tour="loja" onClick={()=>setShowNyxShop(true)} style={{ ...styles.btn("#7c83ff"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }}>
              🎁 Loja do Nyx · {nyxPoints} pts
            </button>
          </div>
          <div style={styles.card}>
            <p style={{ color:"#fbbf24", fontWeight:700, marginBottom:8, fontSize:13 }}>🏆 Turma & Você</p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <button onClick={()=>setShowRanking(true)} style={{ ...styles.btn("#22d3ee"), fontSize:12, padding:"7px 0" }}>📊 Ranking da turma</button>
              <button onClick={()=>setShowAchievements(true)} style={{ ...styles.btn("#a855f7"), fontSize:12, padding:"7px 0" }}>🎖️ Conquistas · {achievements.length}/{ACHIEVEMENTS.length}</button>
              <button onClick={()=>{ if (!nyxLocks.zeker) setShowDuel(true); }} disabled={nyxLocks.zeker} title={nyxLocks.zeker ? "O professor bloqueou os duelos por enquanto" : ""}
                style={{ ...styles.btn("#f87171"), fontSize:12, padding:"7px 0", opacity:nyxLocks.zeker?0.45:1, cursor:nyxLocks.zeker?"not-allowed":"pointer" }}>
                {nyxLocks.zeker ? "🔒 Duelos bloqueados" : "⚔️ Duelo entre alunos"}
              </button>
            </div>
            <ClassGoalBar sum={classPointsSum} />
          </div>
          <div style={{ ...styles.card, fontSize:12, color:"#5d679c", lineHeight:1.8 }}>
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
        <TourOverlay step={tourStep} onSkip={()=>setTourStep(-1)} onNext={()=>setTourStep(s => (s+1 >= TOUR_STEPS.length ? -1 : s+1))} />
      )}

      {showNyxShop && (
        <NyxShop
          points={nyxPoints}
          gear={nyxGear}
          onEquip={(newGear)=>{ setNyxGear(newGear); persist({ nyxGear: newGear }); }}
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
      {showDuel && (
        <DuelModal
          shift={shift}
          myName={studentName}
          myAvatar={avatar}
          onAward={async (pts) => { const np = nyxPoints + pts; setNyxPoints(np); await persist({ nyxPoints: np }); }}
          onWin={() => unlockAchievement("duelista")}
          onClose={()=>setShowDuel(false)}
        />
      )}

      <NyxChat
        who="student"
        dataTour="chat"
        gear={nyxGear}
        onTheme={setThemeAndSave}
        context={() => `Contexto: você conversa com o aluno ${studentName}. Código atual dele (${files[active]?.name || "Program.cs"}):\n${activeCode || "(vazio ainda)"}\n${robotMsg ? `Seu último aviso sobre o código: ${robotMsg}` : ""}`}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CODE LAB  (editor + terminal + robô, reutilizável — usado pelo professor)
// ════════════════════════════════════════════════════════════════════════════
function CodeLab({ accent = "#fbbf24", files = [{ name:"Program.cs", code:"" }], onChange = ()=>{} }) {
  const setFiles = (updater) => onChange(typeof updater === "function" ? updater(files) : updater);
  const [active, setActive] = useState(0);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [robotState, setRobotState] = useState("idle");
  const [robotMsg, setRobotMsg] = useState("");
  const [keysToShow, setKeysToShow] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const debounceRef = useRef(null);
  const activeCode = files[active]?.code || "";

  const updateActiveCode = (newCode) => setFiles(fs => fs.map((f,i)=> i===active ? { ...f, code:newCode } : f));
  const uniqueName = (base, ignoreIdx=-1) => { let name=base, n=2; while (files.some((f,i)=> i!==ignoreIdx && f.name.toLowerCase()===name.toLowerCase())) { name = base.replace(/\.cs$/i,"")+n+".cs"; n++; } return name; };
  const addFile = () => { const name=uniqueName(`Arquivo${files.length+1}.cs`); const idx=files.length; setFiles(fs=>[...fs,{name,code:""}]); setActive(idx); setRenaming(idx); setRenameValue(name.replace(/\.cs$/i,"")); };
  const deleteFile = (idx) => { if (files.length<=1) return; setFiles(fs=>fs.filter((_,i)=>i!==idx)); setActive(a=>(idx<=a?Math.max(0,a-1):a)); };
  const openRename = (idx) => { setRenaming(idx); setRenameValue((files[idx]?.name||"").replace(/\.cs$/i,"")); };
  const confirmRename = () => { if(renaming==null) return; let base=String(renameValue).trim().replace(/["'\/\\]/g,""); if(!base) base=`Arquivo${renaming+1}`; let name=/\.cs$/i.test(base)?base:base+".cs"; name=uniqueName(name,renaming); const idx=renaming; setFiles(fs=>fs.map((f,i)=>i===idx?{...f,name}:f)); setRenaming(null); setRenameValue(""); };
  const cancelRename = () => { setRenaming(null); setRenameValue(""); };

  // robô confere 2s após parar de digitar
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = activeCode.trim();
    if (trimmed.length < 12) { setRobotState("idle"); setRobotMsg(""); setKeysToShow([]); return; }
    debounceRef.current = setTimeout(async () => {
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
        if (e.message === 'ROBOTKEY_MISSING') { setRobotState("error"); setRobotMsg("🔑 Nyx está offline: configure ANTHROPIC_API_KEY no Vercel."); }
        else { setRobotState("idle"); setRobotMsg(""); }
      }
      setAnalyzing(false);
    }, 5000);
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

        <Terminal files={files} />
      </div>

      <div style={{ width:250, flex:"0 0 250px" }}>
        <div style={card}>
          <NyxRobot state={robotState} size={88} />
          {robotMsg && (<div style={{ background:robotState==="error"?"#f8717111":"#34d39911", border:`1px solid ${robotState==="error"?"#f87171":"#34d399"}`, borderRadius:8, padding:12, marginTop:10, fontSize:13, lineHeight:1.6 }}>{robotMsg}</div>)}
          {keysToShow.length>0 && (<div style={{ marginTop:10 }}><p style={{ color:accent, fontSize:12, fontWeight:600, marginBottom:4 }}>Teclas para usar:</p>{keysToShow.map((k,i)=><KeyVisual key={i} char={k}/>)}</div>)}
        </div>
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

function TeacherView({ onLogout }) {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  // gestão do aluno selecionado (renomear, mover de turno, corrigir nota, excluir)
  const [renameVal, setRenameVal] = useState("");
  const [scoreVal, setScoreVal] = useState("");
  const [mgmtMsg, setMgmtMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { setRenameVal(""); setScoreVal(""); setConfirmDelete(false); setMgmtMsg(""); }, [selected]);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetScope, setResetScope] = useState("all");
  const [resetMsg, setResetMsg] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [diag, setDiag] = useState(null);
  const [tab, setTab] = useState("monitor");
  const [meta, setMeta] = useState({ city:"", classDays:[], contentNames:{} });
  const [cityInput, setCityInput] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [genName, setGenName] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
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
        metaRef.current = nm; setMeta(nm); saveTeacherMeta(nm);
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
  useEffect(() => { getTeacherMeta().then(m => { metaRef.current = m; setMeta(m); setCityInput(m.city||""); }); }, []);
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
      saveTeacherCode(proFilesByShift.matutino, "matutino");
      saveTeacherCode(proFilesByShift.vespertino, "vespertino");
    }, 1000);
    return () => clearTimeout(id);
  }, [proFilesByShift, proLoaded]);

  const saveCity = async () => { const nm = { ...metaRef.current, city:cityInput.trim() }; metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm); };
  const toggleClassDay = async (k) => {
    const has = metaRef.current.classDays.includes(k);
    const days = has ? metaRef.current.classDays.filter(d=>d!==k) : [...metaRef.current.classDays, k];
    const nm = { ...metaRef.current, classDays:days }; metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm);
  };

  const doReset = async () => {
    const scope = resetScope; // "all" | "matutino" | "vespertino"
    setConfirmReset(false);
    setResetting(true);
    setResetMsg("");
    const ok = await resetAll(scope === "all" ? null : scope);
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
      `${ctx}:\n\n${source}\n\nGere um TÍTULO curto de conteúdo para esta aula, em português, com no máximo 6 palavras, que resuma o principal tema/conceito trabalhado (ex: "Variáveis e Console.WriteLine", "Condições com if e else", "Entrada de dados com ReadLine"). Responda APENAS com o título, sem aspas e sem ponto final.`,
      "Você nomeia o conteúdo de aulas de C# para iniciantes. Responda só com um título curto."
    );
    const title = out.replace(/["\n`]/g,"").trim().slice(0,80);
    const nm = { ...metaRef.current, contentNames: withContentName(metaRef.current.contentNames, tk, shift, title) };
    metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm);
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
    const ok = await setNudge(s.shift, s.name, "👀 Preste atenção na aula! Volte para o seu código e continue a atividade de hoje.");
    if (ok) { setNudged(n => ({ ...n, [s.name]: Date.now() })); setTimeout(()=>setNudged(n=>{ const c={...n}; delete c[s.name]; return c; }), 5000); }
  };

  // ── gestão de alunos: renomear, mover de turno, corrigir nota, excluir ──
  const flashMgmt = (msg) => { setMgmtMsg(msg); setTimeout(()=>setMgmtMsg(""), 6000); };

  const doRenameStudent = async (s) => {
    const newName = renameVal.trim();
    if (!s || !newName || newName === s.name) return;
    if (students.some(x => x.name === newName && (x.shift||"sem-turno") === (s.shift||"sem-turno"))) { flashMgmt("❌ Já existe um aluno com esse nome nessa turma."); return; }
    await saveStudent(s.shift, newName, { ...s, name: newName });
    await deleteStudentProfile(s.shift, s.name);
    await setKick(s.shift, s.name); // se estiver online, a sessão antiga sai (ele entra de novo com o nome novo)
    setSelected(newName); setRenameVal("");
    flashMgmt(`✅ Renomeado para ${newName}. Se estiver online, ele vai precisar entrar de novo.`);
    load();
  };

  const doMoveStudent = async (s, newShift) => {
    if (!s || !newShift || newShift === (s.shift||"sem-turno")) return;
    await saveStudent(newShift, s.name, { ...s, shift: newShift });
    await deleteStudentProfile(s.shift, s.name);
    await setKick(s.shift, s.name);
    flashMgmt(`✅ Movido para ${shiftLabel(newShift)}. Se estiver online, ele vai precisar entrar de novo.`);
    load();
  };

  const doSetScore = async (s) => {
    const v = parseInt(scoreVal, 10);
    if (!s || isNaN(v)) return;
    const nv = Math.max(0, Math.min(100, v));
    await patchStudent(s.shift, s.name, { score: nv });
    await setScoreFix(s.shift, s.name, nv); // se estiver online, a sessão dele aplica na hora
    setScoreVal("");
    flashMgmt(`✅ Nota da atividade alterada para ${nv}.`);
    load();
  };

  const doDeleteStudent = async (s) => {
    if (!s) return;
    await deleteStudentProfile(s.shift, s.name);
    await setKick(s.shift, s.name);
    setSelected(null); setConfirmDelete(false);
    flashMgmt("");
    load();
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
      await setExamState(newConfig);
      setExamConfig(newConfig);
      setExamMsg("✅ Prova criada! Os alunos estão revisando. Quando todos estiverem prontos, clique em Iniciar Agora.");
    } catch(e) { setExamMsg("Erro ao gerar a prova. Tente de novo."); }
    setExamGenerating(false);
  };

  const activateExam = async () => {
    const newConfig = { ...examConfig, status: 'active', activatedAt: Date.now() };
    await setExamState(newConfig);
    setExamConfig(newConfig);
    setExamMsg("✅ Prova iniciada! Os alunos estão respondendo.");
  };

  const endExam = async () => {
    const newConfig = { ...examConfig, status: 'done', endedAt: Date.now() };
    await setExamState(newConfig);
    setExamConfig(newConfig);
    setExamMsg("✅ Prova encerrada! Veja o ranking abaixo.");
    setConfirmEndExam(false);
  };

  const resetExam = async () => {
    await setExamState({ status: 'idle' });
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
      const base = shiftFilter === "all" ? students : students.filter(s => (s.shift||"sem-turno") === shiftFilter);
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
      setExamAnalysis(e.message === "ROBOTKEY_MISSING" ? "Nyx está offline: configure a ANTHROPIC_API_KEY no Vercel." : "Não consegui analisar agora. Tente de novo em instantes.");
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
  const present = shown.filter(isOnline).length;
  const goingWell = sorted.filter(s => difficultyOf(s).level==="bem");
  const needHelp  = sorted.filter(s => difficultyOf(s).level==="dif");
  const feedbacks = sorted
    .filter(s => s.classFeedback && (s.classFeedback.rating || (s.classFeedback.text||"").trim()))
    .sort((a,b) => (b.classFeedback.at||0) - (a.classFeedback.at||0));
  // resumo automático (só agregação dos dados já carregados, sem IA)
  const topToday = [...sorted]
    .filter(s => s.score != null || s.examScore != null)
    .sort((a,b) => Math.max(b.score||0, b.examScore||0) - Math.max(a.score||0, a.examScore||0))[0];

  // presença do dia: present (compareceu e fez algo) · idle (entrou mas parado) · absent (não entrou hoje)
  const attStatus = (s) => {
    const a = s.attendance && s.attendance[tk];
    if (a) return a;
    return isSameDayTs(s.lastSeen) ? "present" : "absent";
  };
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
      <div style={styles.header}>
        <div>
          <span style={{ fontWeight:900, fontSize:18, background:"linear-gradient(135deg,#fbbf24,#fb923c)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>👨‍🏫 Painel do Professor</span>
          <span style={{ color:"#96a0cc", marginLeft:12, fontSize:12 }}>
            ● ao vivo · {lastUpdate}{meta.city?` · 📍 ${meta.city}`:""}
            {(todayContentM||todayContentV) ? ` · 📖 ${[todayContentM&&`☀️ ${todayContentM}`, todayContentV&&`🌙 ${todayContentV}`].filter(Boolean).join(" · ")}` : ""}
          </span>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button style={styles.tab(tab==="monitor")} onClick={()=>setTab("monitor")}>👥 Monitoramento</button>
          <button style={styles.tab(tab==="code")} onClick={()=>setTab("code")}>👨‍💻 Meu código</button>
          <button style={styles.tab(tab==="calendar")} onClick={()=>setTab("calendar")}>🗓️ Calendário</button>
          <button style={styles.tab(tab==="feedback")} onClick={()=>setTab("feedback")}>💬 Feedback ({feedbacks.length})</button>
          <button style={{ ...styles.tab(tab==="exam"), ...(examConfig.status!=='idle' && tab!=="exam" ? {borderColor:"#fbbf24",color:"#fbbf24"} : {}) }} onClick={()=>setTab("exam")}>🏆 Prova{examConfig.status!=='idle'?' ●':''}</button>
          <button style={styles.btn("#f87171")} onClick={()=>{ setResetScope(shiftFilter); setConfirmReset(true); }} disabled={resetting}>{resetting?"Resetando...":"🔄 Resetar"}</button>
          <button style={{ ...styles.btn("#5d679c"), fontSize:13 }} onClick={onLogout}>Sair</button>
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

      {/* confirmação de reset (dentro do app, sem depender do navegador) */}
      {confirmReset && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#151a31", border:"2px solid #f87171", borderRadius:16, padding:24, maxWidth:440, width:"100%" }}>
            <div style={{ fontSize:40, textAlign:"center" }}>⚠️</div>
            <h3 style={{ color:"#f87171", textAlign:"center", margin:"8px 0" }}>Resetar perfis dos alunos?</h3>
            <p style={{ color:"#c7cfee", fontSize:14, lineHeight:1.6, textAlign:"center" }}>Isso apaga os alunos escolhidos e tudo o que eles fizeram (códigos, atividades e feedbacks). O calendário, a cidade e os nomes de conteúdo <b>não</b> são apagados. Não dá para desfazer.</p>
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
          <div style={{ width:300, flex:"0 0 300px" }}>
            {/* Nyx de olho na turma */}
            <div style={{ ...styles.card, textAlign:"center", borderColor: needHelp.length>0 ? "#f87171" : "#272e52" }}>
              <NyxRobot state={needHelp.length>0 ? "error" : shown.length>0 ? "ok" : "idle"} size={64} showName={false} />
              <div style={{ fontWeight:900, letterSpacing:2, fontSize:12, color:"#fbbf24", marginTop:2 }}>NYX DE OLHO</div>
              <p style={{ color: needHelp.length>0 ? "#fca5a5" : "#96a0cc", fontSize:13, lineHeight:1.6, margin:"6px 0 0" }}>
                {needHelp.length > 0
                  ? <>⚠ Atenção com: <b style={{color:"#e8ebfa"}}>{needHelp.slice(0,4).map(s=>String(s.name).split(" ")[0]).join(", ")}{needHelp.length>4 ? ` e mais ${needHelp.length-4}` : ""}</b> — clique no aluno para ver o que houve.</>
                  : shown.length > 0 ? "Turma indo bem! Ninguém travado no momento. 👍" : "Aguardando alunos entrarem..."}
              </p>
            </div>

            {/* Chamada — separada por turno */}
            <div style={styles.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                <h3 style={{ color:"#fbbf24" }}>📋 Lista de Chamada</h3>
                <span style={styles.badge("#34d399")}>{present} online / {shown.length}</span>
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
                          {g.list.map(s=>{
                            const st = attStatus(s);
                            const stColor = st==="present"?"#34d399":st==="idle"?"#fbbf24":"#f87171";
                            const stLabel = st==="present"?"✅ Presente":st==="idle"?"⚠ Sem atividade":"❌ Falta";
                            return (
                              <div key={s.name} style={{ background:"#0d1122", border:`1px solid ${st==="absent"?"#3f2530":"#2a3154"}`, borderRadius:8, padding:"8px 10px", opacity:st==="absent"?0.7:1 }}>
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

            <div style={styles.card}>
              <h4 style={{ color:"#fbbf24", marginBottom:10, fontSize:14 }}>📊 Turma</h4>
              {["coding","summary","activity","done"].map(p=>(
                <div key={p} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:phaseColor(p), fontSize:13 }}>{phaseLabel(p)}</span>
                  <span style={styles.badge(phaseColor(p))}>{shown.filter(s=>s.phase===p).length}</span>
                </div>
              ))}
              <hr style={{ borderColor:"#2a3154", margin:"8px 0" }}/>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#96a0cc", fontSize:13 }}>Média</span>
                <span style={{ color:"#34d399", fontWeight:700 }}>{shown.filter(s=>s.score!=null).length>0 ? Math.round(shown.filter(s=>s.score!=null).reduce((a,s)=>a+s.score,0)/shown.filter(s=>s.score!=null).length)+" pts" : "—"}</span>
              </div>
            </div>

            <div style={{ ...styles.card, fontSize:12 }}>
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

            <div style={{ ...styles.card, fontSize:12 }}>
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
            <div style={styles.card}>
              <h3 style={{ color:"#fbbf24", marginBottom:12 }}>👥 Monitoramento ({shown.length})</h3>
              {shown.length===0 && <p style={{ color:"#5d679c", fontSize:13 }}>{students.length===0 ? "Aguardando alunos entrarem..." : "Nenhum aluno nesta turma. Veja outra turma no filtro acima."}</p>}
              <div style={{ maxHeight:340, overflowY:"auto" }}>
                {sorted.map(s=>{
                  const d = difficultyOf(s);
                  return (
                    <div key={s.name} onClick={()=>setSelected(s.name===selected?null:s.name)} style={{ background:selected===s.name?"#7c83ff22":"#0d1122", border:`2px solid ${selected===s.name?"#7c83ff":"#2a3154"}`, borderRadius:10, padding:"10px 12px", marginBottom:8, cursor:"pointer" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ display:"flex", alignItems:"center", gap:8, fontWeight:600 }}><Avatar cfg={s.avatar} size={26} />{dot(isOnline(s))}{s.name}</span>
                        <span style={styles.badge(phaseColor(effectivePhase(s)))}>{phaseLabel(effectivePhase(s))}</span>
                      </div>
                      <div style={{ marginTop:6 }}>
                        <span style={styles.badge(d.level==="dif"?"#f87171":d.level==="bem"?"#34d399":"#96a0cc")}>{d.level==="dif"?"⚠ Com dificuldade":d.level==="bem"?"✅ Indo bem":"• Começando"}</span>
                        {s.score!=null && <span style={{ ...styles.badge("#34d399"), marginLeft:6 }}>🏆 {s.score}</span>}
                      </div>
                      <div style={{ color:"#5d679c", fontSize:11, marginTop:4 }}>visto {hhmmss(s.lastSeen)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resumo automático (sem clicar em nada — só agregação dos dados) */}
            <div style={{ ...styles.card, borderColor:"#7c83ff" }}>
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
                  <div style={{ color:"#34d399" }}>🌟 Destaque de hoje: <b>{topToday.name}</b> ({Math.max(topToday.score||0, topToday.examScore||0)} pts)</div>
                )}
              </div>
            </div>

            {/* Situação da turma */}
            <div style={styles.card}>
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

            {/* Detalhe do aluno */}
            {sel ? (
              <>
                <div style={styles.card}>
                  <h3 style={{ color:"#fbbf24", display:"flex", alignItems:"center", gap:10 }}><Avatar cfg={sel.avatar} size={34} />{dot(isOnline(sel))}{sel.name}</h3>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:8 }}>
                    <span style={styles.badge(phaseColor(effectivePhase(sel)))}>{phaseLabel(effectivePhase(sel))}</span>
                    {sel.score!=null && <span style={styles.badge("#34d399")}>🏆 {sel.score} pts</span>}
                    {(() => { const d=difficultyOf(sel); return <span style={styles.badge(d.level==="dif"?"#f87171":"#34d399")}>{d.level==="dif"?"⚠ "+d.text:"✅ "+d.text}</span>; })()}
                  </div>
                </div>

                {/* Gerenciar aluno: renomear, mover de turno, corrigir nota, excluir */}
                <div style={{ ...styles.card, borderColor:"#fbbf24" }}>
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
                  <div key={i} style={styles.card}>
                    <h4 style={{ color:"#7c83ff", marginBottom:8 }}>📄 {f.name}</h4>
                    <pre style={{ background:"#1e1e1e", padding:12, borderRadius:8, fontFamily:"monospace", fontSize:13, color:"#a5f3fc", overflow:"auto", maxHeight:240, whiteSpace:"pre-wrap" }}>{f.code || "(vazio)"}</pre>
                  </div>
                )) : sel.code && (
                  <div style={styles.card}>
                    <h4 style={{ color:"#7c83ff", marginBottom:8 }}>💻 Código</h4>
                    <pre style={{ background:"#1e1e1e", padding:12, borderRadius:8, fontFamily:"monospace", fontSize:13, color:"#a5f3fc", overflow:"auto", maxHeight:240, whiteSpace:"pre-wrap" }}>{sel.code}</pre>
                  </div>
                )}
                {sel.feedback && <div style={styles.card}><h4 style={{ color:"#7c83ff", marginBottom:6 }}>🤖 Nyx (último aviso)</h4><p style={{ color:sel.feedback.ok?"#34d399":"#f87171", fontSize:13 }}>{sel.feedback.ok?"✅":"⚠"} {sel.feedback.message}</p></div>}
                {sel.answers && sel.dynamicActivity && (
                  <div style={styles.card}>
                    <h4 style={{ color:"#7c83ff", marginBottom:10 }}>📝 Atividade</h4>
                    {sel.dynamicActivity.map((q,i)=>(
                      <div key={i} style={{ marginBottom:10, background:"#0d1122", borderRadius:8, padding:"8px 12px" }}>
                        <p style={{ fontSize:13, color:"#96a0cc", marginBottom:4 }}>{i+1}. {q.q}</p>
                        <span style={styles.badge(sel.answers[i]===q.correct?"#34d399":"#f87171")}>{sel.answers[i]===q.correct?"✅ Correto":"❌ Errado"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {sel.finalFeedback && <div style={styles.card}><h4 style={{ color:"#7c83ff", marginBottom:8 }}>🤖 Feedback do Nyx ao aluno</h4><p style={{ color:"#c7cfee", fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{sel.finalFeedback}</p></div>}
              </>
            ) : (
              <div style={{ ...styles.card, textAlign:"center", padding:40 }}>
                <div style={{ fontSize:36 }}>👆</div>
                <p style={{ color:"#5d679c" }}>Clique em um aluno no monitoramento para ver o código, a atividade e os detalhes.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────── MEU CÓDIGO (exemplo da aula, do professor) ─────────── */}
      {tab==="code" && (
        <div style={{ padding:14, maxWidth:1180, margin:"0 auto" }}>
          <div style={styles.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              <div style={{ flex:"1 1 260px" }}>
                <h3 style={{ color:"#fbbf24", margin:0 }}>👨‍💻 Meu código</h3>
                <p style={{ color:"#96a0cc", fontSize:13, margin:"4px 0 0", lineHeight:1.5 }}>Cada turma tem seu próprio exemplo. Programe aqui e gere o nome do conteúdo a partir dele — é isso que aparece no calendário.</p>
              </div>
              <button style={{ ...styles.btn("#7c83ff"), opacity:genName?0.6:1 }} onClick={()=>generateContentName(codeShift)} disabled={genName}>{genName?"Gerando...":`✨ Gerar nome do conteúdo (${shiftMeta(codeShift).label})`}</button>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              {SHIFTS.map(sh => (
                <button key={sh.id} onClick={()=>setCodeShift(sh.id)} style={styles.tab(codeShift===sh.id)}>{sh.emoji} {sh.label}</button>
              ))}
            </div>
            {contentFor(codeShift) && <p style={{ color:"#34d399", fontSize:14, fontWeight:600, margin:"10px 0 0" }}>📖 Conteúdo de hoje ({shiftMeta(codeShift).label}): {contentFor(codeShift)}</p>}
            {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:13, margin:"10px 0 0", lineHeight:1.5 }}>{nameMsg}</p>}
          </div>
          <CodeLab key={codeShift} accent="#fbbf24" files={proFiles} onChange={setProFiles} />
        </div>
      )}

      {/* ─────────── CALENDÁRIO ─────────── */}
      {tab==="calendar" && (
        <div style={{ display:"flex", gap:14, padding:14, maxWidth:900, margin:"0 auto", alignItems:"flex-start", flexWrap:"wrap" }}>
          <div style={{ ...styles.card, flex:"1 1 380px" }}>
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
          <div style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:12 }}>📍 Sua cidade no DF</h3>
            <input list="df-cities" value={cityInput} onChange={e=>setCityInput(e.target.value)} onBlur={saveCity} placeholder="Ex: Ceilândia"
              style={{ width:"100%", background:"#0d1122", border:"2px solid #2a3154", borderRadius:10, padding:"10px 12px", color:"#e8ebfa", fontSize:15, boxSizing:"border-box" }} />
            <datalist id="df-cities">{DF_CITIES.map(c=><option key={c} value={c} />)}</datalist>
            <button style={{ ...styles.btn("#7c83ff"), marginTop:10 }} onClick={saveCity}>Salvar cidade</button>
            {meta.city && <p style={{ color:"#34d399", fontSize:13, marginTop:10 }}>Cidade salva: {meta.city}</p>}
            <hr style={{ borderColor:"#2a3154", margin:"14px 0" }}/>
            <p style={{ color:"#96a0cc", fontSize:13 }}>Total de dias de aula registrados: <b style={{ color:"#e8ebfa" }}>{(meta.classDays||[]).length}</b></p>
          </div>
          <div style={{ ...styles.card, flex:"1 1 260px" }}>
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
          <div style={styles.card}>
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
              <div style={styles.card}>
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
                <div style={styles.card}>
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
                <div style={styles.card}>
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
                <div style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <h3 style={{ color:"#fbbf24", margin:"0 0 4px" }}>🏆 Prova em andamento</h3>
                      <p style={{ color:"#96a0cc", fontSize:13 }}>{doneStudents.length}/{examStudents.length} alunos concluíram · {qLen} questões · {qLen*10} pts no máximo</p>
                    </div>
                    <button onClick={()=>setConfirmEndExam(true)} style={styles.btn("#f87171")}>⏹ Encerrar Prova</button>
                  </div>
                  {examMsg && <p style={{ color:"#34d399", fontSize:13, marginTop:8 }}>{examMsg}</p>}
                </div>
                <div style={styles.card}>
                  <h4 style={{ color:"#fbbf24", marginBottom:12 }}>📊 Ranking ao vivo</h4>
                  {ranking.length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>Aguardando alunos terminarem...</p> : (
                    ranking.map((s,i)=>(
                      <div key={s.name} style={{ display:"flex", alignItems:"center", gap:12, background:"#0d1122", border:`1px solid ${i===0?"#fbbf24":"#2a3154"}`, borderRadius:10, padding:"10px 14px", marginBottom:8 }}>
                        <span style={{ fontSize:22, width:28 }}>{medal(i)||`#${i+1}`}</span>
                        <Avatar cfg={s.avatar} size={28} />
                        <span style={{ flex:1, fontWeight:600 }}>{s.name}</span>
                        <span style={{ color:"#34d399", fontWeight:700, fontSize:16 }}>{s.examScore} pts</span>
                        <span style={styles.badge(s.examDone?"#34d399":"#fbbf24")}>{s.examDone?"Concluído":"Respondendo"}</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* estado: done */}
            {examConfig.status === 'done' && (
              <>
                <div style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <h3 style={{ color:"#34d399", margin:"0 0 4px" }}>✅ Prova Encerrada</h3>
                      <p style={{ color:"#96a0cc", fontSize:13 }}>Resultado final · {doneStudents.length}/{examStudents.length} alunos concluíram</p>
                    </div>
                    <button onClick={resetExam} style={styles.btn("#5d679c")}>🔄 Nova Prova</button>
                  </div>
                </div>
                <div style={{ ...styles.card, borderColor:"#7c83ff" }}>
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
                <div style={styles.card}>
                  <h4 style={{ color:"#fbbf24", marginBottom:12 }}>🏆 Ranking Final</h4>
                  {ranking.length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>Nenhum aluno respondeu.</p> : (
                    ranking.map((s,i)=>(
                      <div key={s.name} style={{ display:"flex", alignItems:"center", gap:12, background:i===0?"#fbbf2422":"#0d1122", border:`2px solid ${i===0?"#fbbf24":i===1?"#96a0cc":i===2?"#c2410c":"#2a3154"}`, borderRadius:12, padding:"12px 16px", marginBottom:8 }}>
                        <span style={{ fontSize:26, width:32 }}>{medal(i)||<span style={{color:"#5d679c",fontSize:16}}>#{i+1}</span>}</span>
                        <Avatar cfg={s.avatar} size={32} />
                        <span style={{ flex:1, fontWeight:700, fontSize:15 }}>{s.name}</span>
                        <span style={{ color:"#34d399", fontWeight:800, fontSize:20 }}>{s.examScore ?? 0}</span>
                        <span style={{ color:"#96a0cc", fontSize:12 }}>/{qLen*10}</span>
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
            await setNyxLocks({ zek: true });
            return "🔒 Modo ZEK ativado! Estou aparecendo na tela de TODOS os alunos pedindo atenção — tudo bloqueado até você digitar /hiberne.";
          }
          if (cmd === "/hiberne") {
            await setNyxLocks({ zek: false });
            return "😴 Zek desativado. As telas dos alunos foram liberadas.";
          }
          if (cmd === "zeker") {
            await setNyxLocks({ zeker: true });
            return "⚔️🚫 Duelos bloqueados! Nenhum aluno consegue duelar até você digitar /liberte.";
          }
          if (cmd === "/liberte") {
            await setNyxLocks({ zeker: false });
            return "⚔️✅ Duelos liberados! Os alunos já podem se desafiar de novo.";
          }
          return null;
        }}
        context={() => {
          const rows = students.map(s => {
            const att = Object.values(s.attendance||{}).filter(v => v === "present").length;
            return `- ${s.name} [${shiftLabel(s.shift)}]: fase=${s.phase||"aguardando"}, presenças=${att}, nota atividade=${s.score ?? "—"}, nota prova=${s.examScore ?? "—"}, erro no código agora=${s.hasError ? "sim: " + (s.feedback?.message || "") : "não"}`;
          }).join("\n");
          return `Contexto: você é o assistente do professor. Situação da turma AGORA:\n${rows || "(nenhum aluno entrou ainda)"}\nConteúdo de hoje — Manhã: ${todayContentM || "ainda não definido"} · Tarde: ${todayContentV || "ainda não definido"}.`;
        }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════════════════════════════════════
function Login({ onJoin }) {
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

  const TEACHER_PASS = "M1n3cr@ft2006";

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

  const enterStudent = (studentName, avatarCfg, shiftId, isNew) => { goFullscreen(); onJoin("student", studentName, avatarCfg, shiftId || "matutino", isNew); };
  const handleNewStudent = () => { if(!name.trim()){ setError("Digite seu nome!"); return; } enterStudent(name.trim(), avatar, shift, true); };
  const handleTeacher = () => { if(password===TEACHER_PASS) onJoin("teacher","Professor"); else setError("Senha incorreta!"); };

  const styles = {
    container:{ minHeight:"100vh", background:PAGE_BG, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT, padding:16 },
    card:{ background:"linear-gradient(180deg,#181d38ee,#131730ee)", backdropFilter:"blur(10px)", borderRadius:22, padding:32, width:460, maxWidth:"100%", border:"1px solid #2c3358", boxShadow:"0 24px 70px rgba(0,0,0,.5), 0 0 0 1px #7c83ff1a" },
    input:{ width:"100%", background:"#0d1122", border:"2px solid #2a3154", borderRadius:12, padding:"12px 14px", color:"#e8ebfa", fontSize:15, outline:"none", boxSizing:"border-box" },
    btn:(c)=>({ background:`linear-gradient(135deg, ${c}, ${shade(c,-0.18)})`, color:"#fff", border:"none", borderRadius:12, padding:"12px 0", cursor:"pointer", fontWeight:800, fontSize:15, width:"100%", boxShadow:`0 4px 16px ${c}44` }),
    rBtn:()=>({ background:"#0d1122", color:"#96a0cc", border:`2px solid #2a3154`, borderRadius:14, padding:"18px 8px", cursor:"pointer", fontWeight:800, fontSize:14, flex:1 }),
  };

  return (
    <div style={styles.container}>
      <div className="pop" style={styles.card}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <NyxRobot state="idle" size={86} showName={false} />
          <h1 style={{ fontSize:28, margin:"6px 0 2px", fontWeight:900, background:"linear-gradient(135deg,#7c83ff,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>Aula de C#</h1>
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
                      <button key={`${p.shift||"x"}:${p.name}`} onClick={()=>enterStudent(p.name, p.avatar, p.shift)} style={{ display:"flex", alignItems:"center", gap:10, background:"#0d1122", border:"2px solid #2a3154", borderRadius:10, padding:"8px 12px", cursor:"pointer", color:"#e8ebfa", textAlign:"left" }}>
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
            <p style={{ color:"#96a0cc", fontSize:13, margin:"14px 0 8px" }}>🎨 Monte seu boneco:</p>
            <AvatarBuilder value={avatar} onChange={setAvatar} />
            {error&&<p style={{ color:"#f87171", fontSize:13, marginTop:8 }}>{error}</p>}
            <div style={{ display:"flex", gap:8, marginTop:16 }}>
              <button style={{ ...styles.btn("#7c83ff"), flex:1 }} onClick={handleNewStudent}>Criar perfil e entrar →</button>
              <button style={{ ...styles.btn("#2a3154"), width:44, flex:"none" }} onClick={()=>{ setRole(null); setError(""); }}>↩</button>
            </div>
          </>
        )}

        {role==="teacher"&&(
          <>
            <p style={{ color:"#fbbf24", fontWeight:600, marginBottom:10 }}>👨‍🏫 Entrar como Professor</p>
            <input style={styles.input} type="password" placeholder="Senha do professor" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleTeacher()} />
            {error&&<p style={{ color:"#f87171", fontSize:13, marginTop:6 }}>{error}</p>}
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button style={{ ...styles.btn("#fbbf24"), flex:1 }} onClick={handleTeacher}>Entrar →</button>
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
  if (!session) return <Login onJoin={(role,name,avatar,shift,isNew)=>setSession({role,name,avatar,shift,isNew})} />;
  if (session.role==="teacher") return <TeacherView onLogout={()=>setSession(null)} />;
  return <StudentView studentName={session.name} initialAvatar={session.avatar} shift={session.shift||"matutino"} isNew={session.isNew} onLogout={()=>setSession(null)} />;
}
