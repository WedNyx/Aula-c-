import { useState, useEffect } from "react";

// carregado sob demanda (React.lazy) a partir do App.jsx — só quem realmente abre o
// tutorial de teclado baixa este pedaço, em vez de todo mundo carregar de cara
function useViewportWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

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
    background: active ? "linear-gradient(180deg,#fbbf24,#f59310)" : "linear-gradient(180deg,#3b2a58,#1c2140)",
    border:`1px solid ${active?"#fbbf24":"#3a4270"}`, borderRadius:6, color: active?"#1c1400":"#d6c9ec",
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
        {k.altSym && <span style={{ position:"absolute", bottom:2, right:4, fontSize:7.5, color: active ? "#1c1400aa" : "#776798" }}>{k.altSym}</span>}
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
export default function KeyboardTutorialModal({ onClose, onFinish, speak, stopSpeech, accessMode = false, onEggFound, playSound }) {
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
    <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.88)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1200, padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:980, width:"100%", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#22d3ee,#c084fc)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>⌨️ Tutorial de Teclado</h2>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {onEggFound && <span onClick={()=>onEggFound("sanduiche")} title="" style={{ fontSize:15, opacity:0.16, cursor:"default", userSelect:"none" }}>🥪</span>}
            <button onClick={()=>{ stopSpeech?.(); onClose(); }} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
          </div>
        </div>
        {accessMode && !done && <p style={{ color:"#a5f3fc", fontSize:12, margin:"0 0 10px", fontWeight:700 }}>🧩 Treino do Modo Guiado — só o essencial, e recomeça sozinho pra treinar à vontade.</p>}
        {done ? (
          <div className="pop" style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:44 }}>🎹</div>
            <p style={{ color:"#f0e9fb", fontWeight:900, fontSize:20, margin:"8px 0 4px" }}>Você é um Mestre do Teclado!</p>
            <p style={{ color:"#a99ac9", fontSize:13 }}>Treine de novo sempre que quiser — o botão continua aqui.</p>
            <button onClick={onClose} style={{ marginTop:14, background:"linear-gradient(135deg,#34d399,#059669)", border:"none", borderRadius:10, color:"#fff", fontWeight:800, padding:"9px 22px", cursor:"pointer", fontSize:14 }}>Fechar</button>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
              {levels.map((l, i) => (
                <span key={l.id} style={{ background: i<levelIdx?"#34d39922":i===levelIdx?"#fbbf2422":"#171026", color: i<levelIdx?"#34d399":i===levelIdx?"#fbbf24":"#776798", border:`1px solid ${i<levelIdx?"#34d399":i===levelIdx?"#fbbf24":"#3b2a58"}`, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:800 }}>
                  {i<levelIdx?"✓ ":""}{l.title}
                </span>
              ))}
            </div>
            {level.line ? (
              <>
                <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 10px" }}>Última etapa! Digite essa linha de código inteira, prestando atenção em cada tecla — sem colar. 💪</p>
                <pre style={{ background:"#1e1e1e", border:"1px solid #3e3e42", borderRadius:10, padding:"12px 14px", fontFamily:"'Courier New',monospace", fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{level.line}</pre>
                <textarea autoFocus value={finalTyped} onChange={e=>onFinalType(e.target.value)} onPaste={e=>e.preventDefault()} spellCheck={false} autoCorrect="off" autoCapitalize="off"
                  style={{ width:"100%", minHeight:70, marginTop:8, background:"#171026", border:"2px solid #3b2a58", borderRadius:12, padding:"10px 12px", color:"#f0e9fb", fontFamily:"'Courier New',monospace", fontSize:14, outline:"none" }} />
              </>
            ) : target && (
              <>
                <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 4px" }}>{targetIdx}/{level.targets.length} teclas neste nível · <b style={{ color:"#fbbf24" }}>{level.title}</b> ({doneTargets}/{totalTargets} no total)</p>
                <div className="pop" style={{ background: wrongFlash ? "#f8717122" : "#171026", border:`1px solid ${wrongFlash?"#f87171":"#3b2a58"}`, borderRadius:14, padding:"16px", textAlign:"center", transition:"background .15s" }}>
                  <div style={{ fontSize:38, fontWeight:900, fontFamily:"monospace", color: wrongFlash?"#f87171":"#22d3ee" }}>
                    {target.special || target.accent ? (target.display || target.char) : target.symbol ? target.char : target.ctrl ? `Ctrl + ${target.char.toUpperCase()}` : target.shift ? target.char : target.char.toUpperCase()}
                  </div>
                  <p style={{ color:"#d6c9ec", fontSize:13, margin:"6px 0 0" }}>
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
