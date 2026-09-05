import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { highlight } from "../lib/highlight.jsx";

// ════════════════════════════════════════════════════════════════════════════
//  EDITOR ESTILO VS CODE
// ════════════════════════════════════════════════════════════════════════════
export function VSEditor({ value, onChange, onPasteText, filename, errorLines, locked, lockMessage, autoFocus = false }) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const gutterRef = useRef(null);
  const pendingSelectionRef = useRef(null);
  const selectionRef = useRef({ start:0, end:0, direction:"none" });
  const isComposingRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!isExpanded) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(current => !current);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const syncScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Em textarea controlado, setTimeout pode disputar com autosave/polling e recolocar o cursor
  // usando a versão anterior do texto. Guardamos a posição desejada e a aplicamos logo após o
  // React confirmar o novo value, antes da pintura da tela.
  useLayoutEffect(() => {
    const pending = pendingSelectionRef.current;
    const ta = textareaRef.current;
    if (!pending || !ta || ta.value !== value) return;
    pendingSelectionRef.current = null;
    ta.setSelectionRange(pending.start, pending.end, pending.direction || "none");
    syncScroll();
  }, [value]);

  const commitEdit = (newValue, start, end = start) => {
    selectionRef.current = { start, end, direction:"none" };
    pendingSelectionRef.current = { start, end, direction:"none" };
    onChange(newValue);
  };

  const rememberSelection = (target = textareaRef.current) => {
    if (!target) return;
    selectionRef.current = {
      start: target.selectionStart ?? 0,
      end: target.selectionEnd ?? target.selectionStart ?? 0,
      direction: target.selectionDirection || "none",
    };
  };

  const handleChange = (event) => {
    if (locked) return;
    const target = event.currentTarget;
    const rawValue = target.value;
    const rawStart = target.selectionStart ?? rawValue.length;
    const rawEnd = target.selectionEnd ?? rawStart;
    const removedBeforeStart = (rawValue.slice(0, rawStart).match(/\r/g) || []).length;
    const removedBeforeEnd = (rawValue.slice(0, rawEnd).match(/\r/g) || []).length;
    const selection = {
      start: rawStart - removedBeforeStart,
      end: rawEnd - removedBeforeEnd,
      direction: target.selectionDirection || "none",
    };

    // Todo input guarda a seleção junto com o texto. Assim, uma renderização disparada por
    // autosave, monitoramento do professor ou realce de sintaxe não consegue recolocar o cursor
    // numa linha anterior entre o keydown e a pintura seguinte.
    selectionRef.current = selection;
    pendingSelectionRef.current = selection;
    onChange(rawValue.replace(/\r/g, ""));
  };

  const handleKeyDown = (e) => {
    if (locked) { e.preventDefault(); return; } // Nyx está analisando: código congelado até terminar
    if (e.isComposing || isComposingRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart, end = ta.selectionEnd, v = ta.value;
    // Não intercepta atalhos do sistema (AltGraph continua permitido para símbolos).
    if (e.metaKey || (e.ctrlKey && !e.getModifierState?.("AltGraph"))) return;
    const pairs = { "{":"}","(":")",'"':'"',"[":"]","'":"'" };
    if (start === end && [")", "]", "}", '"', "'"].includes(e.key) && v[start] === e.key) {
      e.preventDefault();
      ta.setSelectionRange(start + 1, start + 1);
      rememberSelection(ta);
      return;
    }
    if (pairs[e.key]) {
      e.preventDefault();
      if (start !== end) {
        // tem texto selecionado: ENVOLVE a seleção com o par (igual ao VS Code), em vez de apagar
        // o que tava selecionado e sobrar só um par vazio no lugar
        const selected = v.slice(start, end);
        const newVal = v.slice(0,start) + e.key + selected + pairs[e.key] + v.slice(end);
        commitEdit(newVal, start+1, end+1);
        return;
      }
      const newVal = v.slice(0,start) + e.key + pairs[e.key] + v.slice(end);
      commitEdit(newVal, start+1);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (start !== end && v.slice(start, end).includes("\n")) {
        // seleção espalha por mais de uma linha: indenta CADA linha inteira (igual ao VS Code),
        // em vez de apagar todo o bloco selecionado e trocar por um único bloco de 4 espaços
        const selStartLine = v.lastIndexOf("\n", start-1)+1;
        let selEndLine = end;
        if (end > selStartLine && v[end-1] === "\n") selEndLine = end-1; // seleção que termina bem na quebra de linha não indenta a linha seguinte, que o aluno nem tocou
        const before = v.slice(0, selStartLine);
        const middle = v.slice(selStartLine, selEndLine);
        const after = v.slice(selEndLine);
        const indented = middle.split("\n").map(line => "    " + line).join("\n");
        const addedTotal = indented.length - middle.length;
        commitEdit(before + indented + after, start+4, end+addedTotal);
        return;
      }
      const newVal = v.slice(0,start) + "    " + v.slice(end);
      commitEdit(newVal, start+4);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const lineStart = v.lastIndexOf("\n", start-1)+1;
      const indent = v.slice(lineStart, start).match(/^(\s*)/)[1];
      const prevChar = v[start-1], nextChar = v[start];
      if (prevChar === "{" && nextChar === "}") {
        const newVal = v.slice(0,start) + "\n" + indent+"    " + "\n" + indent + v.slice(end);
        commitEdit(newVal, start+1+indent.length+4);
      } else {
        const extra = prevChar === "{" ? "    " : "";
        const newVal = v.slice(0,start) + "\n" + indent + extra + v.slice(end);
        commitEdit(newVal, start+1+indent.length+extra.length);
      }
      return;
    }
    if (e.key === "Backspace" && start === end && start > 0) {
      const prev = v[start-1], next = v[start];
      const pairs2 = {"(":")","{":"}","[":"]",'"':'"',"'":"'"};
      if (pairs2[prev] === next) {
        e.preventDefault();
        const newVal = v.slice(0,start-1) + v.slice(start+1);
        commitEdit(newVal, start-1);
      }
    }
  };

  const lineNums = Array.from({length: value.split("\n").length}, (_,i) => i+1);
  const shared = { fontFamily:"'Courier New','Consolas',monospace", fontSize:14, lineHeight:"1.5em", tabSize:4, whiteSpace:"pre", overflowWrap:"normal", fontVariantLigatures:"none", boxSizing:"border-box", overflowAnchor:"none", padding:"12px 12px 12px 0", margin:0 };

  return (
    <div data-expanded={isExpanded ? "true" : "false"} style={{ background:"#1e1e1e", borderRadius:8, border:"1px solid #3e3e42", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:isExpanded?"0 0 0 100vmax rgba(5,3,12,.82),0 24px 80px rgba(0,0,0,.75)":"0 12px 32px rgba(0,0,0,.45)", ...(isExpanded ? {position:"fixed",inset:16,zIndex:4000,height:"calc(100dvh - 32px)"} : {}) }}>
      <div style={{ background:"linear-gradient(180deg,#333336,#2d2d30)", padding:"6px 14px", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #3e3e42" }}>
        <span style={{width:11,height:11,borderRadius:"50%",background:"#ff5f56",display:"inline-block"}}/>
        <span style={{width:11,height:11,borderRadius:"50%",background:"#ffbd2e",display:"inline-block"}}/>
        <span style={{width:11,height:11,borderRadius:"50%",background:"#27c93f",display:"inline-block"}}/>
        <span style={{color:"#cccccc", fontSize:13, marginLeft:10, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>📄 {filename || "Program.cs"}</span>
        <button type="button" onClick={toggleExpanded} aria-label={isExpanded ? "Reduzir editor de código" : "Ampliar editor de código"} title={isExpanded ? "Reduzir editor (Esc)" : "Ampliar editor"} style={{marginLeft:"auto",border:"1px solid #666",borderRadius:5,background:"#252526",color:"#e5e5e5",width:30,height:26,display:"grid",placeItems:"center",cursor:"pointer",fontSize:16,lineHeight:1}}>
          {isExpanded ? "↙" : "↗"}
        </button>
      </div>
      <div style={{ display:"flex", minHeight:300, maxHeight:isExpanded?"none":420, flex:isExpanded?1:undefined, overflow:"hidden" }}>
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
            {highlight(value, errorLines, filename)}
          </div>
          {/* tira \r de código colado (ex: do Windows/Visual Studio, que usa quebra de linha \r\n) —
              sem isso, esse caractere invisível sobra escondido no texto e a camada colorida (que só
              existe pra pintar as palavras) desenha uma letra a mais que o cursor de verdade não tem,
              indo empurrando a marcação visual pra direita conforme a linha afetada cresce */}
          <textarea ref={textareaRef} value={value} readOnly={locked} onChange={handleChange} onKeyDown={handleKeyDown} onSelect={e => rememberSelection(e.currentTarget)} onClick={e => rememberSelection(e.currentTarget)} onKeyUp={e => rememberSelection(e.currentTarget)} onCompositionStart={() => { isComposingRef.current = true; }} onCompositionEnd={e => { isComposingRef.current = false; rememberSelection(e.currentTarget); }} onPaste={e => { if (!locked && onPasteText) onPasteText(e.clipboardData.getData("text")); }} onScroll={syncScroll} spellCheck={false} autoCorrect="off" autoCapitalize="off"
            style={{ ...shared, position:"absolute", top:0, left:0, right:0, bottom:0, background:"transparent", color:"transparent", caretColor: locked ? "transparent" : "#aeafad", border:"none", outline:"none", resize:"none", zIndex:1, paddingLeft:14, overflow:"auto", cursor: locked ? "not-allowed" : "text" }} />
          {/* congela o código enquanto estiver travado (análise em andamento, professor travou o
              teclado, ou visualização somente-leitura) — a mensagem reflete o motivo de verdade,
              em vez de sempre dizer "Nyx analisando" mesmo quando não é isso que está travando */}
          {locked && (
            <div style={{ position:"absolute", inset:0, zIndex:2, background:"rgba(10,6,20,.35)", display:"flex", alignItems:"flex-start", justifyContent:"center", pointerEvents:"none" }}>
              <div className="pop" style={{ marginTop:14, background:"#171026", border:"1px solid #c084fc66", borderRadius:20, padding:"6px 14px", fontSize:12.5, fontWeight:700, color:"#e8ebfa", display:"flex", alignItems:"center", gap:8, boxShadow:"0 6px 18px rgba(0,0,0,.4)" }}>
                {!lockMessage && <span style={{ animation:"nyx-spin 1.1s linear infinite", display:"inline-block" }}>🔍</span>}
                {lockMessage || "Nyx analisando... o código fica congelado até terminar"}
              </div>
            </div>
          )}
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
export function CodeBlock({ code, filename = "", compact = false, wrap = false, label = "exemplo" }) {
  return (
    <div style={{ background:"#1e1e1e", border:"1px solid #3e3e42", borderRadius:8, overflow:"hidden", margin:compact ? "6px 0 0" : "10px 0 2px" }}>
      <div style={{ background:"#2d2d30", padding:"4px 12px", fontSize:11, color:"#9aa0a6", borderBottom:"1px solid #3e3e42", display:"flex", alignItems:"center", gap:6 }}>
        <span style={{width:9,height:9,borderRadius:"50%",background:"#ff5f56",display:"inline-block"}}/>
        <span style={{width:9,height:9,borderRadius:"50%",background:"#ffbd2e",display:"inline-block"}}/>
        <span style={{width:9,height:9,borderRadius:"50%",background:"#27c93f",display:"inline-block"}}/>
        <span style={{ marginLeft:6 }}>{filename || label}</span>
      </div>
      <div style={{ padding:compact ? "8px 10px" : "10px 14px", fontFamily:"'Courier New','Consolas',monospace", fontSize:compact ? 11.5 : 13.5, lineHeight:"1.6em", overflow:"auto", maxHeight:compact ? 240 : undefined, whiteSpace:wrap ? "pre-wrap" : "pre" }}>{highlight(String(code||""), [], filename)}</div>
    </div>
  );
}

// ── modo guiado (acessibilidade): blocos prontos de código C# que o aluno monta clicando, sem precisar digitar ──
export const GUIDED_BLOCKS = [
  { id:"greet",  emoji:"👋", label:"Dizer um Oi",            needsInput:false, template:()=>`Console.WriteLine("Oi! Eu adoro programar!");`, speak:()=>"Isso mostra uma saudação na tela do computador." },
  { id:"print",  emoji:"💬", label:"Mostrar uma mensagem",   needsInput:true,  inputLabel:"O que você quer mostrar na tela?", placeholder:"Ex: Eu sou incrível!", template:(v)=>`Console.WriteLine("${String(v||"").replace(/"/g,"")}");`, speak:(v)=>`Isso vai mostrar a mensagem: ${v}` },
  { id:"ask",    emoji:"❓", label:"Fazer uma pergunta",      needsInput:true,  inputLabel:"O que você quer perguntar?", placeholder:"Ex: Qual é o seu nome?", template:(v)=>`Console.WriteLine("${String(v||"").replace(/"/g,"")}");\nstring resposta = Console.ReadLine();`, speak:(v)=>`Isso vai perguntar: ${v}, e guardar a resposta de quem está usando o programa.` },
  { id:"number", emoji:"🔢", label:"Guardar um número",      needsInput:true,  inputLabel:"Qual número você quer guardar?", placeholder:"Ex: 10", template:(v)=>`int numero = ${parseInt(v)||0};`, speak:(v)=>`Isso guarda o número ${v} numa caixinha chamada numero.` },
  { id:"text",   emoji:"📝", label:"Guardar um texto",        needsInput:true,  inputLabel:"Qual texto você quer guardar?", placeholder:"Ex: Maria", template:(v)=>`string texto = "${String(v||"").replace(/"/g,"")}";`, speak:(v)=>`Isso guarda o texto ${v} numa caixinha chamada texto.` },
  { id:"sum",    emoji:"➕", label:"Somar dois números",      needsInput:false, template:()=>`int soma = 5 + 3;\nConsole.WriteLine(soma);`, speak:()=>"Isso soma o número 5 com o número 3 e mostra o resultado na tela." },
  { id:"loop",   emoji:"🔁", label:"Repetir uma mensagem",    needsInput:true,  inputLabel:"Quantas vezes repetir?", placeholder:"Ex: 3", template:(v)=>`for (int i = 0; i < ${parseInt(v)||3}; i++)\n{\n    Console.WriteLine("Repetindo!");\n}`, speak:(v)=>`Isso repete a mensagem ${v} vezes seguidas.` },
  { id:"if",     emoji:"❔", label:"Fazer uma escolha",       needsInput:false, template:()=>`int numero = 10;\nif (numero > 5)\n{\n    Console.WriteLine("O número é grande!");\n}\nelse\n{\n    Console.WriteLine("O número é pequeno!");\n}`, speak:()=>"Isso faz o programa escolher o que mostrar, dependendo do número." },
];

// prova simplificada de PARTICIPAÇÃO (sem nota oficial) pra quem está no Modo Guiado e topa
// entrar na prova — perguntas fixas e bem simples, sobre os PRÓPRIOS blocos do Modo Guiado
// (não sobre sintaxe de C# escrita à mão, que eles talvez nunca tenham praticado)
export const GUIDED_PARTICIPATION_QUIZ = [
  { q: "Qual bloco faz o computador dizer um Oi e mostrar uma saudação na tela?", opts: ["Dizer um Oi", "Guardar um número", "Fazer uma escolha", "Somar dois números"], correct: 0 },
  { q: "Se você quer que o computador mostre uma mensagem que VOCÊ escreveu, qual bloco usa?", opts: ["Mostrar uma mensagem", "Fazer uma pergunta", "Repetir uma mensagem", "Guardar um texto"], correct: 0 },
  { q: "Qual bloco faz o computador perguntar algo e guardar a resposta de quem está usando?", opts: ["Fazer uma pergunta", "Dizer um Oi", "Somar dois números", "Guardar um número"], correct: 0 },
  { q: "Qual bloco guarda um número numa 'caixinha' pra usar depois?", opts: ["Guardar um número", "Guardar um texto", "Fazer uma escolha", "Repetir uma mensagem"], correct: 0 },
  { q: "Qual bloco guarda uma palavra ou frase numa 'caixinha' pra usar depois?", opts: ["Guardar um texto", "Guardar um número", "Somar dois números", "Fazer uma pergunta"], correct: 0 },
  { q: "Qual bloco faz o computador somar dois números e mostrar o resultado?", opts: ["Somar dois números", "Repetir uma mensagem", "Fazer uma escolha", "Dizer um Oi"], correct: 0 },
  { q: "Qual bloco faz o computador repetir a mesma mensagem várias vezes seguidas?", opts: ["Repetir uma mensagem", "Fazer uma escolha", "Guardar um número", "Mostrar uma mensagem"], correct: 0 },
  { q: "Qual bloco faz o computador escolher o que mostrar, dependendo de um número?", opts: ["Fazer uma escolha", "Somar dois números", "Dizer um Oi", "Guardar um texto"], correct: 0 },
];
