import { useState, useEffect, useRef } from "react";
import { RUN_SYSTEM } from "../lib/ai-prompts.ts";
import { askClaude } from "../lib/ai.js";

// ════════════════════════════════════════════════════════════════════════════
//  TERMINAL  (estilo VS Code: digite dotnet run, dotnet build, cls, dir, ajuda)
// ════════════════════════════════════════════════════════════════════════════
const TERM_PROMPT = "C:\\Aula\\MeuProjeto>";

export function Terminal({ files, dataTour, maxHeight = 260, onEasterEgg = null }) {
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
    if (low === "nyx pirata") {
      push("🏴‍☠️ Arrrr! Modo pirata ativado...", "Você desbloqueou um item secreto na Loja do Nyx! Vá conferir. 🗺️", "");
      onEasterEgg && onEasterEgg("piratahat");
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

