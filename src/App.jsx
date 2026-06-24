import { useState, useEffect, useRef, useCallback } from "react";
import { saveStudent, getStudent, setNudge, getNudge, listStudents, checkReset, resetAll, getTeacherMeta, saveTeacherMeta, saveTeacherCode, getTeacherCode, diagnose, getExamState, setExamState } from "./storage.js";

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

  const syncScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
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
        <div style={{ background:"#1e1e1e", padding:"12px 8px 12px 14px", textAlign:"right", userSelect:"none", minWidth:42, color:"#858585", fontFamily:"'Courier New',monospace", fontSize:14, lineHeight:"1.5em", borderRight:"1px solid #3e3e42", flexShrink:0 }}>
          {lineNums.map(n => <div key={n}>{n}</div>)}
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
      <span style={{ color:"#94a3b8", fontSize:13 }}>{info.desc}</span>
    </div>
  );
}
function Robot({ state }) {
  const color = state==="error"?"#ef4444":state==="ok"?"#22c55e":state==="thinking"?"#f59e0b":"#6366f1";
  const eye = state==="error"?"😵":state==="ok"?"😊":state==="thinking"?"🤔":"🤖";
  return (
    <div style={{ textAlign:"center", padding:8 }}>
      <div style={{ width:56, height:56, borderRadius:14, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto", boxShadow:`0 0 14px ${color}55`, transition:"all 0.3s" }}>{eye}</div>
      <div style={{ fontSize:11, color:"#888", marginTop:4 }}>
        {state==="thinking"?"Analisando...":state==="ok"?"Tudo certo!":state==="error"?"Atenção!":"Pronto para ajudar"}
      </div>
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
  bg:   ["#6366f1","#22c55e","#f59e0b","#ef4444","#06b6d4","#ec4899","#8b5cf6","#3b82f6","#14b8a6","#0ea5e9","#f43f5e","#64748b"],
  skin: ["#ffe0bd","#ffdbac","#f1c27d","#e0ac69","#c68642","#a86b3c","#8d5524","#5c3a21"],
  shirt:["#e2e8f0","#6366f1","#ec4899","#22c55e","#f59e0b","#ef4444","#06b6d4","#1f2937"],
  hair: ["#2b2b2b","#3b2417","#6b3e26","#a0522d","#c2410c","#d9a441","#f0d58c","#cbd5e1","#ec4899","#a855f7","#3b82f6","#06b6d4","#22c55e","#ef4444"],
  hairStyle: ["curto","longo","espetado","cacheado","afro","moicano","coque","rabo","chanel","topete","careca"],
  headwear: ["nenhum","chapeu","bone","coroa","tiara","bandana","flores"],
  eyewear:  ["nenhum","oculos","oculos_sol","mascara"],
  extra:    ["nenhum","fone","laco","flor","brinco"],
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
const DEFAULT_AVATAR = { bg:"#6366f1", skin:"#ffdbac", hair:"#2b2b2b", hairStyle:"curto", shirt:"#e2e8f0", headwear:"nenhum", eyewear:"nenhum", extra:"nenhum", pet:"" };

let __avatarSeq = 0;
function Avatar({ cfg, size=72 }) {
  const c = { ...DEFAULT_AVATAR, ...(cfg||{}) };
  // compatibilidade com avatares antigos (campo único "accessory")
  if (cfg && cfg.accessory && cfg.accessory!=="nenhum" && !cfg.headwear && !cfg.eyewear && !cfg.extra) {
    const a = cfg.accessory;
    if (a==="oculos"||a==="oculos_sol"||a==="mascara") c.eyewear = a;
    else if (a==="fone"||a==="laco"||a==="flor"||a==="brinco") c.extra = a;
    else c.headwear = a; // chapeu, bone, coroa
  }
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = ++__avatarSeq;
  const clip = "cl" + idRef.current;
  const hi = shade(c.hair, 0.30);                          // brilho do cabelo
  const brow = isLight(c.hair) ? shade(c.hair,-0.45) : c.hair;
  const hasTopHair = !["careca","afro","cacheado","moicano"].includes(c.hairStyle);
  const Flower = ({x,y,p,m="#fcd34d"}) => (
    <g>
      <circle cx={x} cy={y-3.2} r="2.5" fill={p}/><circle cx={x-3} cy={y-0.6} r="2.5" fill={p}/>
      <circle cx={x+3} cy={y-0.6} r="2.5" fill={p}/><circle cx={x-1.9} cy={y+2.6} r="2.5" fill={p}/>
      <circle cx={x+1.9} cy={y+2.6} r="2.5" fill={p}/><circle cx={x} cy={y} r="2" fill={m}/>
    </g>
  );
  return (
    <div style={{ position:"relative", width:size, height:size, display:"inline-block", lineHeight:0, flexShrink:0 }}>
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display:"block" }}>
      <defs><clipPath id={clip}><circle cx="50" cy="50" r="48" /></clipPath></defs>
      <g clipPath={`url(#${clip})`}>
        {/* fundo com leve profundidade */}
        <circle cx="50" cy="50" r="48" fill={c.bg} />
        <ellipse cx="50" cy="28" rx="46" ry="34" fill="#ffffff" opacity="0.10" />

        {/* ombros / camiseta */}
        <path d="M12 100 C14 83 30 79 50 79 C70 79 86 83 88 100 Z" fill={c.shirt} />
        <path d="M40 79 Q50 90 60 79 L57 79 Q50 86 43 79 Z" fill={shade(c.shirt,-0.14)} />

        {/* pescoço */}
        <path d="M44 72 L44 83 Q50 86 56 83 L56 72 Z" fill={shade(c.skin,-0.06)} />

        {/* ── cabelo (camada de trás) ── */}
        {c.hairStyle==="longo" && <path d="M20 46 C18 24 33 15 50 15 C67 15 82 24 80 46 L80 88 Q72 94 68 84 L68 52 C60 42 40 42 32 52 L32 84 Q28 94 20 88 Z" fill={shade(c.hair,-0.16)} />}
        {c.hairStyle==="afro" && (
          <g fill={c.hair}>
            <circle cx="50" cy="31" r="29" />
            <circle cx="24" cy="30" r="9"/><circle cx="30" cy="15" r="9"/><circle cx="43" cy="8" r="9"/>
            <circle cx="57" cy="8" r="9"/><circle cx="70" cy="15" r="9"/><circle cx="76" cy="30" r="9"/>
            <circle cx="22" cy="44" r="8"/><circle cx="78" cy="44" r="8"/>
          </g>
        )}
        {c.hairStyle==="coque" && (<g fill={c.hair}><circle cx="50" cy="13" r="9"/><ellipse cx="50" cy="22" rx="11" ry="6"/></g>)}
        {c.hairStyle==="rabo" && (<g><path d="M67 30 C82 34 85 50 79 64 C76 72 69 73 67 66 C73 54 71 42 63 34 Z" fill={c.hair}/><ellipse cx="68" cy="34" rx="5" ry="3.5" fill={shade(c.hair,-0.28)}/></g>)}

        {/* orelhas */}
        <circle cx="28" cy="55" r="5.5" fill={c.skin} />
        <circle cx="72" cy="55" r="5.5" fill={c.skin} />

        {/* rosto */}
        <ellipse cx="50" cy="53" rx="23" ry="25" fill={c.skin} />

        {/* ── cabelo (frente) por estilo ── */}
        {(c.hairStyle==="curto"||c.hairStyle==="longo") && (
          <path d="M26 54 C24 30 35 17 50 17 C65 17 76 30 74 54 C71 40 63 34 50 34 C37 34 29 40 26 54 Z" fill={c.hair} />
        )}
        {c.hairStyle==="topete" && (
          <path d="M26 51 C24 31 32 16 50 17 C58 17 64 12 70 17 C80 25 77 40 74 51 C71 39 63 33 50 33 C37 33 29 40 26 51 Z" fill={c.hair} />
        )}
        {c.hairStyle==="chanel" && (
          <path d="M24 56 C22 30 34 17 50 17 C66 17 78 30 76 56 L76 67 Q76 71 72 70 L72 43 C66 35 58 33 50 33 C42 33 34 35 28 43 L28 70 Q24 71 24 67 Z" fill={c.hair} />
        )}
        {c.hairStyle==="afro" && (
          <path d="M28 50 C28 36 38 30 50 30 C62 30 72 36 72 50 C69 42 61 38 50 38 C39 38 31 42 28 50 Z" fill={c.hair} />
        )}
        {c.hairStyle==="coque" && (
          <path d="M27 47 C26 29 37 20 50 20 C63 20 74 29 73 47 C70 37 62 33 50 33 C38 33 30 37 27 47 Z" fill={c.hair} />
        )}
        {c.hairStyle==="rabo" && (
          <path d="M27 49 C26 31 37 21 50 21 C63 21 74 31 73 49 C70 39 62 34 50 34 C38 34 30 40 27 49 Z" fill={c.hair} />
        )}
        {c.hairStyle==="espetado" && (
          <g fill={c.hair}>
            <path d="M27 53 C26 35 36 24 50 24 C64 24 74 35 73 53 C70 43 62 38 50 38 C38 38 30 43 27 53 Z" />
            <path d="M29 41 L32 21 L40 38 Z" /><path d="M41 38 L47 17 L54 38 Z" /><path d="M54 38 L61 20 L68 41 Z" />
          </g>
        )}
        {c.hairStyle==="cacheado" && (
          <g fill={c.hair}>
            <circle cx="32" cy="35" r="8" /><circle cx="42" cy="27" r="9" /><circle cx="54" cy="26" r="9" />
            <circle cx="65" cy="31" r="8" /><circle cx="71" cy="41" r="7" /><circle cx="28" cy="43" r="7" />
            <path d="M28 53 C28 39 38 31 50 31 C62 31 72 39 72 53 C69 45 61 41 50 41 C39 41 31 45 28 53 Z" />
          </g>
        )}
        {c.hairStyle==="moicano" && (
          <g fill={c.hair}>
            <path d="M44 37 C42 18 46 7 50 7 C54 7 58 18 56 37 Z" />
            <path d="M45 12 L47 2 L50 12 Z" /><path d="M50 11 L53 1 L56 11 Z" /><path d="M44 17 L40 7 L46 15 Z" /><path d="M56 17 L60 7 L54 15 Z" />
          </g>
        )}
        {/* brilho do cabelo */}
        {hasTopHair && <path d="M35 28 Q42 22 50 22" stroke={hi} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.65" />}

        {/* sobrancelhas */}
        <path d="M36 45.5 Q41 42.5 46 45.5" stroke={brow} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M54 45.5 Q59 42.5 64 45.5" stroke={brow} strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* olhos */}
        <ellipse cx="41" cy="53" rx="4.6" ry="5.3" fill="#fff" />
        <ellipse cx="59" cy="53" rx="4.6" ry="5.3" fill="#fff" />
        <circle cx="41.5" cy="53.6" r="2.7" fill="#3b2a1a" />
        <circle cx="59.5" cy="53.6" r="2.7" fill="#3b2a1a" />
        <circle cx="42.6" cy="52.3" r="0.95" fill="#fff" />
        <circle cx="60.6" cy="52.3" r="0.95" fill="#fff" />

        {/* bochechas */}
        <ellipse cx="34" cy="61" rx="4" ry="2.5" fill="#ff8da1" opacity="0.5" />
        <ellipse cx="66" cy="61" rx="4" ry="2.5" fill="#ff8da1" opacity="0.5" />

        {/* nariz */}
        <path d="M50 55 L50 59" stroke="rgba(0,0,0,0.18)" strokeWidth="2" strokeLinecap="round" />

        {/* boca */}
        <path d="M43 65 Q50 71 57 65" stroke="#a23b3b" strokeWidth="2.6" fill="none" strokeLinecap="round" />

        {/* ── óculos / máscara ── */}
        {c.eyewear==="oculos" && (
          <g stroke="#1f2937" strokeWidth="2.2" fill="rgba(120,180,255,0.18)">
            <rect x="32" y="48" width="14" height="10.5" rx="5" /><rect x="54" y="48" width="14" height="10.5" rx="5" />
            <line x1="46" y1="52.5" x2="54" y2="52.5" /><line x1="32" y1="50" x2="27" y2="49" /><line x1="68" y1="50" x2="73" y2="49" />
          </g>
        )}
        {c.eyewear==="oculos_sol" && (
          <g>
            <rect x="31" y="47.5" width="15" height="11" rx="4" fill="#111827" /><rect x="54" y="47.5" width="15" height="11" rx="4" fill="#111827" />
            <line x1="46" y1="51" x2="54" y2="51" stroke="#111827" strokeWidth="2.6" /><line x1="31" y1="49.5" x2="26" y2="48" stroke="#111827" strokeWidth="2" /><line x1="69" y1="49.5" x2="74" y2="48" stroke="#111827" strokeWidth="2" />
            <line x1="34" y1="50" x2="37" y2="53.5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" /><line x1="57" y1="50" x2="60" y2="53.5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}
        {c.eyewear==="mascara" && (
          <path fillRule="evenodd" d="M27 47 Q50 42 73 47 Q73 59 63 60 Q56 60 55 54 Q50 51 45 54 Q44 60 37 60 Q27 59 27 47 Z M41 51.5 a4.9 5.6 0 1 0 0.1 0 Z M59 51.5 a4.9 5.6 0 1 0 0.1 0 Z" fill="#1f2937" />
        )}

        {/* ── extra: fone / laço / flor / brinco ── */}
        {c.extra==="fone" && (
          <g>
            <path d="M27 53 A23 23 0 0 1 73 53" stroke="#1f2937" strokeWidth="4" fill="none" />
            <rect x="22" y="50" width="9" height="17" rx="4" fill="#1f2937" /><rect x="69" y="50" width="9" height="17" rx="4" fill="#1f2937" />
            <rect x="24" y="53" width="5" height="11" rx="2.5" fill="#6366f1" /><rect x="71" y="53" width="5" height="11" rx="2.5" fill="#6366f1" />
          </g>
        )}
        {c.extra==="laco" && (
          <g>
            <path d="M64 21 L54 16 L54 28 Z" fill="#ec4899" /><path d="M64 21 L74 16 L74 28 Z" fill="#ec4899" />
            <circle cx="64" cy="21.5" r="3" fill="#db2777" />
          </g>
        )}
        {c.extra==="flor" && <Flower x={65} y={22} p="#f9a8d4" />}
        {c.extra==="brinco" && (<g><circle cx="28" cy="62.5" r="2.2" fill="#fcd34d" /><circle cx="72" cy="62.5" r="2.2" fill="#fcd34d" /></g>)}

        {/* ── chapéus / touca (sempre no topo) ── */}
        {c.headwear==="chapeu" && (
          <g>
            <ellipse cx="50" cy="31" rx="31" ry="6.5" fill="#7c3aed" />
            <path d="M34 31 Q33 12 50 12 Q67 12 66 31 Z" fill="#8b5cf6" />
            <rect x="34" y="27" width="32" height="5" rx="2.5" fill="#6d28d9" />
          </g>
        )}
        {c.headwear==="bone" && (
          <g>
            <path d="M27 31 Q29 15 50 15 Q71 15 73 31 Q61 26 50 26 Q39 26 27 31 Z" fill="#ef4444" />
            <path d="M25 32 Q17 32 15 37 Q29 35 41 31 Z" fill="#dc2626" />
            <circle cx="50" cy="18" r="2.4" fill="#dc2626" />
          </g>
        )}
        {c.headwear==="coroa" && (
          <g>
            <path d="M31 31 L31 17 L40 25 L50 13 L60 25 L69 17 L69 31 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
            <circle cx="50" cy="20" r="2" fill="#ef4444" /><circle cx="35" cy="24" r="1.4" fill="#3b82f6" /><circle cx="65" cy="24" r="1.4" fill="#3b82f6" />
          </g>
        )}
        {c.headwear==="tiara" && (
          <g>
            <path d="M32 27 Q50 18 68 27" stroke="#fcd34d" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M46 23 L50 15 L54 23 Z" fill="#fde68a" stroke="#f59e0b" strokeWidth="0.8" />
            <circle cx="50" cy="20.5" r="1.8" fill="#60a5fa" /><circle cx="40" cy="24.5" r="1.2" fill="#f9a8d4" /><circle cx="60" cy="24.5" r="1.2" fill="#f9a8d4" />
          </g>
        )}
        {c.headwear==="bandana" && (
          <g>
            <path d="M26 30 Q50 22 74 30 L74 37 Q50 29 26 37 Z" fill="#ef4444" />
            <path d="M73 33 L82 30 L80 38 Z" fill="#dc2626" />
            <circle cx="36" cy="32.5" r="1.1" fill="#fff" opacity="0.7" /><circle cx="50" cy="30.5" r="1.1" fill="#fff" opacity="0.7" /><circle cx="64" cy="32.5" r="1.1" fill="#fff" opacity="0.7" />
          </g>
        )}
        {c.headwear==="flores" && (
          <g>
            <Flower x={36} y={25} p="#f9a8d4" /><Flower x={50} y={20} p="#fef08a" m="#f59e0b" /><Flower x={64} y={25} p="#c4b5fd" />
          </g>
        )}
      </g>
      {/* aro sutil por cima */}
      <circle cx="50" cy="50" r="46.5" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="3" />
    </svg>
    {c.pet && (
      <span style={{ position:"absolute", right:-1, bottom:-1, fontSize:Math.max(11, Math.round(size*0.44)), lineHeight:1, filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.6))", pointerEvents:"none" }}>{c.pet}</span>
    )}
    </div>
  );
}

function AvatarBuilder({ value, onChange }) {
  const v = { ...DEFAULT_AVATAR, ...(value||{}) };
  const set = (k, val) => onChange({ ...v, [k]: val });
  const labels = {
    hairStyle:["Curto","Longo","Espetado","Cacheado","Afro","Moicano","Coque","Rabo","Chanel","Topete","Careca"],
    headwear:["Nenhum","Chapéu","Boné","Coroa","Tiara","Bandana","Flores"],
    eyewear:["Nenhum","Óculos","Óculos de sol","Máscara"],
    extra:["Nenhum","Fone","Laço","Flor","Brinco"],
  };
  const randomize = () => {
    const pick = a => a[Math.floor(Math.random()*a.length)];
    onChange({
      bg:pick(AVATAR_OPTS.bg), skin:pick(AVATAR_OPTS.skin), shirt:pick(AVATAR_OPTS.shirt),
      hair:pick(AVATAR_OPTS.hair), hairStyle:pick(AVATAR_OPTS.hairStyle.filter(s=>s!=="careca")),
      headwear: Math.random()<0.5 ? "nenhum" : pick(AVATAR_OPTS.headwear),
      eyewear:  Math.random()<0.6 ? "nenhum" : pick(AVATAR_OPTS.eyewear),
      extra:    Math.random()<0.6 ? "nenhum" : pick(AVATAR_OPTS.extra),
      pet: v.pet,
    });
  };
  const Swatches = ({ k }) => (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {AVATAR_OPTS[k].map(col => (
        <button key={col} type="button" onClick={()=>set(k,col)}
          style={{ width:26, height:26, borderRadius:"50%", background:col, border:v[k]===col?"3px solid #fff":"2px solid #475569", boxShadow:v[k]===col?"0 0 0 2px #6366f1":"none", cursor:"pointer", padding:0 }} />
      ))}
    </div>
  );
  const Choices = ({ k }) => (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {AVATAR_OPTS[k].map((o,i)=>(
        <button key={o} type="button" onClick={()=>set(k,o)}
          style={{ padding:"4px 10px", borderRadius:8, background:v[k]===o?"#6366f1":"#0f172a", color:"#e2e8f0", border:`1px solid ${v[k]===o?"#6366f1":"#334155"}`, cursor:"pointer", fontSize:12 }}>{labels[k][i]}</button>
      ))}
    </div>
  );
  const Row = ({ label, children }) => (
    <div style={{ marginBottom:10 }}>
      <p style={{ color:"#94a3b8", fontSize:12, marginBottom:4 }}>{label}</p>
      {children}
    </div>
  );
  const Pets = () => (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {AVATAR_OPTS.pet.map(o=>(
        <button key={o.label} type="button" onClick={()=>set("pet", o.e)} title={o.label}
          style={{ padding:"4px 9px", borderRadius:8, background:v.pet===o.e?"#6366f1":"#0f172a", color:"#e2e8f0", border:`1px solid ${v.pet===o.e?"#6366f1":"#334155"}`, cursor:"pointer", fontSize:14 }}>
          {o.e ? o.e+" " : ""}{o.label}
        </button>
      ))}
    </div>
  );
  return (
    <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
      <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
        <div style={{ background:"radial-gradient(circle at 50% 30%, #1e293b, #0f172a)", borderRadius:16, padding:10, border:"1px solid #334155" }}>
          <Avatar cfg={v} size={104} />
        </div>
        <button type="button" onClick={randomize} style={{ background:"#334155", color:"#e2e8f0", border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>🎲 Surpresa</button>
      </div>
      <div style={{ flex:1, minWidth:240 }}>
        <Row label="Cor de fundo"><Swatches k="bg" /></Row>
        <Row label="Tom de pele"><Swatches k="skin" /></Row>
        <Row label="Cor da camiseta"><Swatches k="shirt" /></Row>
        <Row label="Cor do cabelo"><Swatches k="hair" /></Row>
        <Row label="Estilo do cabelo"><Choices k="hairStyle" /></Row>
        <Row label="Chapéu / touca"><Choices k="headwear" /></Row>
        <Row label="Óculos"><Choices k="eyewear" /></Row>
        <Row label="Extra"><Choices k="extra" /></Row>
        <Row label="🐉 Pet / Animal mitológico"><Pets /></Row>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  IA + util
// ════════════════════════════════════════════════════════════════════════════
async function askClaude(prompt, system){
  const resp = await fetch("/api/claude", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ prompt, system })
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
const shiftMeta  = id => SHIFTS.find(s=>s.id===id) || { id:id||"", label:"Sem turno", emoji:"" };
const shiftLabel = id => { const m = shiftMeta(id); return `${m.emoji} ${m.label}`.trim(); };
const isSameDayTs = (ts) => !!ts && new Date(ts).toDateString() === new Date().toDateString();

// verificação local instantânea (sem IA)
function quickCheck(code){
  const c = code.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/\/\/.*$/gm, "");
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
function StudentView({ studentName, initialAvatar, shift, onLogout }) {
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
  // terminal
  const [terminalOut, setTerminalOut] = useState("");
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [showStdin, setShowStdin] = useState(false);
  const [saveWarn, setSaveWarn] = useState("");
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

  const sessionStart = useRef(Date.now());
  const stateRef = useRef({});
  const debounceRef = useRef(null);
  const attendanceRef = useRef({});
  const activeCode = files[active]?.code || "";

  useEffect(() => {
    stateRef.current = { files, code:activeCode, avatar, phase, score, answers, feedback, dynamicActivity, dynamicSummary, finalFeedback, classFeedback: classFb, examReady, examScore, examAnswers, examDone };
  });

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
        }
        const es = await getExamState();
        if (alive) setExamInfo(es);
      } finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, [studentName, shift]);

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
          await persist({ examScore: partial, examDone: true });
        } else if (es.status === 'idle' && s.examDone) {
          // professor resetou a prova
          setExamReady(false); setExamScore(null); setExamAnswers({}); setExamDone(false); setExamCurrentQ(0);
          await persist({ examReady: false, examScore: null, examAnswers: {}, examDone: false });
        }
        setExamInfo(es);
      } catch {}
      await persist();
    };
    tick();
    const iv = setInterval(tick, 3000);
    return () => { active2 = false; clearInterval(iv); };
  }, [loaded, persist, onLogout, shift, studentName]);

  // robô: 2 segundos depois que o aluno para de digitar
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
        const result = await askClaude(
          `Você é um robô professor que revisa com ATENÇÃO o código C# de um aluno iniciante. Lembre-se: C# diferencia maiúsculas de minúsculas.\n\nCódigo:\n\`\`\`csharp\n${activeCode}\n\`\`\`\n\nConfira com cuidado, entre outras coisas:\n- Maiúsculas/minúsculas dos nomes: Console, WriteLine, ReadLine, Main, Convert, Parse. Ex: "console.writeline", "Console.writeline" e "Console.Writeline" estão ERRADOS; o certo é "Console.WriteLine".\n- Nesta turma usamos os tipos em MINÚSCULO do C#: string, int, double, bool, char, long, float. Se o aluno escreveu a versão com maiúscula (String, Int32, Double, Boolean, Char), avise que aqui usamos a versão minúscula e mostre a forma certa (ex: troque "String" por "string").\n- Ponto e vírgula ; faltando no fim das instruções.\n- Chaves { }, parênteses ( ) e aspas " abertas e não fechadas.\n- Palavras-chave escritas erradas (ex: "publik", "voi", "statics", "clas").\n- Nomes de variáveis usados sem ter sido criados.\n\nResponda APENAS em JSON puro, sem markdown:\n{"ok": true ou false, "message": "se estiver tudo certo, um elogio bem curto; se houver erro, explique de forma MUITO simples e gentil ONDE está (qual parte/linha) e COMO corrigir, mostrando a forma certa, em 1 a 3 frases", "missingChars": ["só símbolos que faltam, ex: ; } ) — vazio se não faltar nenhum"]}\n\nSó marque ok=true se realmente NÃO houver nenhum desses problemas. Mas não invente erros em código que já está correto.`,
          "Você é um revisor de código C# atento e gentil, para uma turma de iniciantes. C# diferencia maiúsculas de minúsculas. Português simples. Responda APENAS JSON puro."
        );
        const parsed = JSON.parse(result.replace(/```json|```/g,"").trim());
        setRobotState(parsed.ok?"ok":"error"); setRobotMsg(parsed.message); setKeysToShow(parsed.missingChars||[]); setFeedback(parsed);
        await persist({ feedback:parsed, hasError:!parsed.ok });
      } catch(e) {
        if (e.message === 'ROBOTKEY_MISSING') {
          setRobotState("error");
          setRobotMsg("🔑 Robô IA offline: o professor precisa configurar a chave ANTHROPIC_API_KEY no painel do Vercel. A verificação básica do código continua funcionando!");
        } else {
          setRobotState("idle"); setRobotMsg("");
        }
      }
      setAnalyzing(false);
    }, 2000);
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

  // terminal (simulado por IA)
  const runCode = async () => {
    setRunning(true);
    setTerminalOut(prev => prev + `\n$ dotnet run\n`);
    try {
      const out = await askClaude(
        `Aja como o compilador e runtime do .NET executando "dotnet run" neste programa C#.\nArquivo ${files[active].name}:\n\`\`\`csharp\n${activeCode}\n\`\`\`\n` +
        (stdin.trim() ? `\nO usuário digitou esta entrada no teclado (cada linha é um Console.ReadLine):\n${stdin}\n` : ``) +
        `\nResponda APENAS com a saída EXATA que apareceria no console. Se houver erro de compilação, responda com a(s) mensagem(ns) de erro do compilador C# no formato real (ex: Program.cs(8,32): error CS1002: ; expected). Sem explicações, sem markdown.`,
        "Você é o compilador e runtime do .NET (C#). Responda apenas com a saída do console ou erros. Sem explicações, sem markdown."
      );
      setTerminalOut(prev => prev + (out.replace(/```/g,"").trim() || "(sem saída)") + "\n");
    } catch { setTerminalOut(prev => prev + "Não consegui executar agora. Tente de novo.\n"); }
    setRunning(false);
  };

  const handleSave = async () => {
    if (activeCode.trim().length < 10) { setSaveWarn("✏️ Escreva algum código antes de salvar!"); setTimeout(()=>setSaveWarn(""), 4000); return; }
    setAnswers({});
    setPhase("generating");
    setGeneratingMsg("📖 Lendo seu código...");
    await persist({ phase:"generating", answers:{} });
    try {
      setGeneratingMsg("📚 Criando o resumo da sua aula...");
      const summaryResult = await askClaude(
        `Um aluno iniciante de C# escreveu este código na aula:\n\`\`\`csharp\n${activeCode}\n\`\`\`\n\nCrie um resumo da aula bem organizado e didático, em português brasileiro CORRETO (sem erros de digitação), para quem está começando agora.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "intro": "1 ou 2 frases curtas e acolhedoras dizendo o que esta aula ensinou, com base no código dele",\n  "secoes": [\n    { "emoji": "um emoji que combine com o conceito", "titulo": "nome curto e claro do conceito (ex: Mostrar texto na tela)", "explicacao": "explicação bem simples, de 1 a 3 frases, do que isso faz e por quê", "exemplo": "um trecho de código C# curto e correto mostrando o uso (use \\n para quebrar linhas)" }\n  ],\n  "dica": "uma dica final curta, útil e motivadora para o aluno"\n}\n\nFaça uma seção (entre 3 e 7) para cada conceito, palavra-chave ou símbolo importante que aparece no código dele (ex: using, class, static void Main, string, int, Console.WriteLine, Console.ReadLine, ; , { }). Linguagem bem de iniciante. Exemplos curtos, corretos e fáceis de copiar. Garanta JSON válido (aspas escapadas corretamente).`,
        "Você é um professor de C# paciente e organizado, para iniciantes. Português correto e simples. Responda APENAS JSON puro válido."
      );
      let summaryData;
      try { summaryData = JSON.parse(summaryResult.replace(/```json|```/g,"").trim()); }
      catch { summaryData = { raw: summaryResult }; }
      setDynamicSummary(summaryData);
      setGeneratingMsg("📝 Criando atividade sobre seu código...");
      const activityResult = await askClaude(
        `Um aluno de C# escreveu este código:\n\`\`\`csharp\n${activeCode}\n\`\`\`\n\nCrie 8 questões de múltipla escolha focadas em CONCEITOS DE CÓDIGO que aparecem no que ele escreveu: o que faz cada palavra-chave/instrução, para que serve cada estrutura, o papel de cada símbolo, a função de cada tipo de dado, e o que acontece ao executar cada parte. Varie a dificuldade (algumas fáceis, algumas médias). NÃO faça perguntas de matemática.\n\nResponda APENAS JSON puro sem markdown:\n{"questions":[{"q":"pergunta","opts":["A","B","C","D"],"correct":0}]}`,
        "Crie questões sobre conceitos de código C#, não matemática. APENAS JSON puro."
      );
      const parsed = JSON.parse(activityResult.replace(/```json|```/g,"").trim());
      setDynamicActivity(parsed.questions);
      await persist({ phase:"summary", dynamicActivity:parsed.questions, dynamicSummary:summaryData });
      setPhase("summary");
    } catch {
      setGeneratingMsg("❌ Erro ao gerar. Tente novamente.");
      setTimeout(() => { setPhase("coding"); persist({ phase:"coding" }); }, 2500);
    }
  };

  const handleStartActivity = async () => { setPhase("activity"); await persist({ phase:"activity" }); };

  const handleSubmitActivity = async () => {
    const activity = dynamicActivity || [];
    let pts = 0;
    activity.forEach((q,i)=>{ if(answers[i]===q.correct) pts++; });
    const finalScore = Math.round((pts/activity.length)*100);
    setScore(finalScore);
    setPhase("done");
    setFeedbackLoading(true);
    await persist({ phase:"done", score:finalScore, answers });
    try {
      const list = activity.map((q,i)=>`- ${q.q} → ${answers[i]===q.correct?"acertou":"errou"}`).join("\n");
      const fb = await askClaude(
        `Um aluno iniciante de C# escreveu este código na aula:\n\`\`\`csharp\n${activeCode}\n\`\`\`\n\nDepois respondeu uma atividade de ${activity.length} perguntas e acertou ${pts} (nota ${finalScore}).\nResultado pergunta a pergunta:\n${list}\n\nEscreva um feedback curto, gentil e motivador em português para ESTE aluno, baseado no código que ele escreveu E no desempenho. Diga o que ele mandou bem e um ponto para melhorar. No final, dê UMA dica interessante e específica para o nível dele: se foi bem (nota alta e código sem erros), traga uma curiosidade ou um próximo passo um pouco mais avançado para se desafiar; se teve dificuldade, traga uma dica simples e prática para melhorar o ponto que ele errou. Máximo 4 frases, sem markdown, sem títulos.`,
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
      await persist({ examAnswers: newAnswers, examScore: finalScore, examDone: true });
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
    container:{ minHeight:"100vh", background:"#0f0f1a", color:"#e2e8f0", fontFamily:"'Segoe UI',sans-serif" },
    header:{ background:"#1e1e3a", padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"2px solid #6366f1" },
    card:{ background:"#1e1e3a", borderRadius:12, padding:16, margin:"10px 0", border:"1px solid #334155" },
    btn:(c)=>({ background:c, color:"#fff", border:"none", borderRadius:8, padding:"10px 18px", cursor:"pointer", fontWeight:700, fontSize:14 }),
    opt:(sel)=>({ background:sel?"#4f46e522":"#1e293b", border:`2px solid ${sel?"#6366f1":"#334155"}`, borderRadius:8, padding:"10px 14px", marginBottom:8, cursor:"pointer", color:"#e2e8f0", textAlign:"left", width:"100%" }),
  };
  const Stars = ({ value, onChange }) => (
    <div style={{ display:"flex", gap:4 }}>
      {[1,2,3,4,5].map(n=>(
        <button key={n} type="button" onClick={()=>onChange(n)} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:26, color:n<=value?"#f59e0b":"#475569", padding:0 }}>★</button>
      ))}
    </div>
  );

  if (!loaded) return (<div style={{ ...styles.container, display:"flex", alignItems:"center", justifyContent:"center" }}><p style={{ color:"#94a3b8" }}>Carregando seu perfil...</p></div>);

  // ── PROVA: telas de exame têm prioridade ──
  if (examDone) return (
    <div style={styles.container}>
      <div style={styles.header}><span>🏆 Prova Concluída — {studentName}</span></div>
      <div style={{ maxWidth:500, margin:"50px auto", textAlign:"center", padding:"0 16px" }}>
        <div style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)", borderRadius:18, padding:32, boxShadow:"0 12px 30px #22c55e44" }}>
          <div style={{ fontSize:52 }}>🏆</div>
          <h1 style={{ color:"#fff", fontSize:26, margin:"12px 0" }}>Parabéns, {studentName}!</h1>
          <div style={{ fontSize:56, fontWeight:900, color:"#fff", margin:"8px 0" }}>{examScore ?? 0}</div>
          <p style={{ color:"#d1fae5", fontSize:15 }}>pontos de {(examInfo.questions||[]).length * 10}</p>
        </div>
        <p style={{ color:"#94a3b8", marginTop:20, fontSize:14, lineHeight:1.6 }}>Aguarde o professor encerrar a prova para ver o ranking da turma!</p>
      </div>
    </div>
  );

  if (examInfo.status === 'review') return (
    <div style={styles.container}>
      <div style={styles.header}><span>📝 Revisão — {studentName}</span></div>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"22px 16px 36px" }}>
        <div style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius:18, padding:"24px 22px", textAlign:"center", boxShadow:"0 12px 30px #6366f155" }}>
          <div style={{ fontSize:44 }}>📝</div>
          <h1 style={{ color:"#fff", fontSize:24, margin:"8px 0" }}>Hora da Prova!</h1>
          <p style={{ color:"#e0e7ff", fontSize:14, lineHeight:1.6 }}>Revise o conteúdo abaixo e entre na sala quando estiver pronto.</p>
        </div>
        <div style={{ ...styles.card, marginTop:14 }}>
          <h3 style={{ color:"#6366f1", marginBottom:10 }}>📚 Resumo de Revisão</h3>
          <div style={{ color:"#cbd5e1", fontSize:14, lineHeight:1.9, whiteSpace:"pre-wrap" }}>{examInfo.summary || "Preparando o resumo..."}</div>
        </div>
        {examReady ? (
          <div style={{ ...styles.card, textAlign:"center", padding:24 }}>
            <div style={{ fontSize:36 }}>✅</div>
            <p style={{ color:"#22c55e", fontWeight:700, fontSize:16 }}>Você está na sala!</p>
            <p style={{ color:"#94a3b8", fontSize:13 }}>Aguardando o professor iniciar a prova...</p>
          </div>
        ) : (
          <button onClick={handleExamReady} style={{ ...styles.btn("#22c55e"), width:"100%", padding:"16px 0", fontSize:16, marginTop:14 }}>
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
          <span style={{ color:"#94a3b8", fontSize:13 }}>Questão {examCurrentQ+1} de {qs.length}</span>
        </div>
        <div style={{ maxWidth:620, margin:"30px auto", padding:"0 16px" }}>
          <div style={{ background:"#1e1e3a", borderRadius:14, padding:22, border:"1px solid #334155" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ color:"#6366f1", fontWeight:700 }}>Questão {examCurrentQ+1}/{qs.length}</span>
              <span style={{ color:"#f59e0b", fontWeight:700 }}>10 pts cada</span>
            </div>
            <p style={{ color:"#e2e8f0", fontSize:16, lineHeight:1.7, marginBottom:18 }}>{q ? q.q : "Carregando..."}</p>
            {q && q.opts.map((opt, oi) => (
              <button key={oi} onClick={() => handleExamAnswer(examCurrentQ, oi)}
                style={{ display:"block", width:"100%", background:examAnswers[examCurrentQ]===oi?"#6366f133":"#0f172a", border:`2px solid ${examAnswers[examCurrentQ]===oi?"#6366f1":"#334155"}`, borderRadius:10, padding:"12px 16px", color:"#e2e8f0", textAlign:"left", cursor:"pointer", marginBottom:8, fontSize:14 }}>
                <span style={{ color:"#6366f1", fontWeight:700, marginRight:8 }}>{["A","B","C","D"][oi]}.</span>{opt}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
            {qs.map((_,i) => (
              <div key={i} style={{ width:28, height:28, borderRadius:6, background:i===examCurrentQ?"#6366f1":examAnswers[i]!=null?"#334155":"#1e1e3a", border:`1px solid ${i===examCurrentQ?"#6366f1":examAnswers[i]!=null?"#6366f1":"#334155"}`, display:"flex", alignItems:"center", justifyContent:"center", color:examAnswers[i]!=null?"#e2e8f0":"#475569", fontSize:12, cursor:"pointer" }} onClick={() => setExamCurrentQ(i)}>{i+1}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase==="generating") return (
    <div style={styles.container}>
      <div style={styles.header}><span>⏳ Preparando — {studentName}</span></div>
      <div style={{ maxWidth:440, margin:"80px auto", textAlign:"center", padding:24 }}>
        <div style={{ fontSize:60 }}>🤖</div>
        <h2 style={{ color:"#6366f1", margin:"16px 0" }}>Gerando seu conteúdo...</h2>
        <p style={{ color:"#94a3b8", lineHeight:1.7 }}>{generatingMsg}</p>
        <div style={{ marginTop:28, display:"flex", justifyContent:"center", gap:8 }}>
          {[0,1,2].map(i=><div key={i} style={{ width:10,height:10,borderRadius:"50%",background:"#6366f1",animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
        </div>
        <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.5);opacity:1}}`}</style>
      </div>
    </div>
  );

  if (phase==="summary") {
    const sum = dynamicSummary;
    const structured = sum && typeof sum === "object" && Array.isArray(sum.secoes) && sum.secoes.length > 0;
    const ACCENTS = ["#6366f1","#22c55e","#f59e0b","#06b6d4","#ec4899","#8b5cf6","#ef4444"];
    return (
      <div style={styles.container}>
        <div style={styles.header}><span>📚 Resumo da Aula — {studentName}</span></div>
        <div style={{ maxWidth:740, margin:"0 auto", padding:"22px 16px 36px" }}>
          {/* topo em destaque */}
          <div style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius:18, padding:"24px 22px", textAlign:"center", boxShadow:"0 12px 30px #6366f155" }}>
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
                  <div key={i} style={{ background:"#1e1e3a", borderRadius:14, padding:18, margin:"0 0 14px", border:"1px solid #334155", borderLeft:`5px solid ${c}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                      <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{s.emoji || "📌"}</span>
                      <div>
                        <div style={{ color:c, fontSize:11, fontWeight:800, letterSpacing:1 }}>PARTE {i+1}</div>
                        <h3 style={{ color:"#e2e8f0", fontSize:17, margin:0 }}>{s.titulo}</h3>
                      </div>
                    </div>
                    {s.explicacao && <p style={{ color:"#cbd5e1", fontSize:15, lineHeight:1.75, margin:"0 0 4px" }}>{s.explicacao}</p>}
                    {s.exemplo && <CodeBlock code={s.exemplo} />}
                  </div>
                );
              })}
              {sum.dica && (
                <div style={{ background:"#f59e0b16", border:"1px solid #f59e0b", borderRadius:14, padding:18, margin:"4px 0 0", display:"flex", gap:12 }}>
                  <div style={{ fontSize:26, lineHeight:1 }}>💡</div>
                  <div>
                    <h4 style={{ color:"#f59e0b", margin:"0 0 4px" }}>Dica do robô</h4>
                    <p style={{ color:"#fcd9a0", fontSize:15, lineHeight:1.7, margin:0 }}>{sum.dica}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...styles.card, marginTop:18 }}>
              <pre style={{ whiteSpace:"pre-wrap", fontFamily:"inherit", fontSize:14, lineHeight:1.9, color:"#cbd5e1", margin:0 }}>{typeof sum==="string" ? sum : (sum && sum.raw) || "O resumo não carregou. Volte e clique em Salvar novamente."}</pre>
            </div>
          )}

          <div style={{ textAlign:"center", marginTop:22 }}>
            <p style={{ color:"#94a3b8", marginBottom:12 }}>Quando terminar de anotar, vá para a atividade! ✍️</p>
            <button style={{ ...styles.btn("#6366f1"), padding:"12px 26px", fontSize:16 }} onClick={handleStartActivity}>Fazer Atividade →</button>
          </div>
        </div>
      </div>
    );
  }
  if (phase==="activity") {
    const activity = dynamicActivity||[];
    return (
      <div style={styles.container}>
        <div style={styles.header}><span>📝 Atividade — {studentName}</span></div>
        <div style={{ maxWidth:640, margin:"0 auto", padding:24 }}>
          <h2 style={{ color:"#6366f1" }}>Atividade da Aula</h2>
          <p style={{ color:"#94a3b8", fontSize:13, marginBottom:16 }}>Baseada no código que você escreveu hoje!</p>
          {activity.map((q,i)=>(
            <div key={i} style={styles.card}>
              <p style={{ fontWeight:600, marginBottom:12 }}>{i+1}. {q.q}</p>
              {q.opts.map((opt,j)=>(<button key={j} style={styles.opt(answers[i]===j)} onClick={()=>setAnswers(a=>({...a,[i]:j}))}>{opt}</button>))}
            </div>
          ))}
          <div style={{ textAlign:"right" }}>
            <button style={styles.btn("#6366f1")} onClick={handleSubmitActivity} disabled={Object.keys(answers).length<activity.length}>Enviar Atividade →</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase==="done") {
    const activity = dynamicActivity||[];
    return (
      <div style={styles.container}>
        <div style={styles.header}><span>🎓 Aula Concluída — {studentName}</span></div>
        <div style={{ maxWidth:580, margin:"40px auto", textAlign:"center", padding:24 }}>
          <div style={{ fontSize:72 }}>{score>=80?"🏆":score>=60?"⭐":"📚"}</div>
          <h2 style={{ color:"#6366f1", fontSize:26 }}>Você fez {score} pontos!</h2>

          <div style={{ ...styles.card, marginTop:18, textAlign:"left", borderColor:"#6366f1" }}>
            <h4 style={{ color:"#6366f1", marginBottom:8 }}>🤖 Feedback do robô para você</h4>
            {feedbackLoading ? <p style={{ color:"#94a3b8", fontSize:14 }}>Analisando seu código e sua atividade...</p>
              : finalFeedback ? <p style={{ color:"#cbd5e1", fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{finalFeedback}</p>
              : <p style={{ color:"#94a3b8", fontSize:14 }}>Parabéns por concluir a aula de hoje!</p>}
          </div>

          <div style={{ ...styles.card, marginTop:14, textAlign:"left" }}>
            <h4 style={{ color:"#6366f1", marginBottom:10 }}>📝 Revisão da atividade</h4>
            {activity.map((q,i)=>(
              <div key={i} style={{ marginBottom:12 }}>
                <b style={{ color:answers[i]===q.correct?"#22c55e":"#ef4444" }}>{answers[i]===q.correct?"✅":"❌"} {q.q}</b>
                {answers[i]!==q.correct&&<div style={{ color:"#94a3b8", fontSize:13, marginTop:2 }}>Correto: {q.opts[q.correct]}</div>}
              </div>
            ))}
          </div>

          {/* Avaliação da aula → professor */}
          <div style={{ ...styles.card, marginTop:14, textAlign:"left", borderColor:"#f59e0b" }}>
            <h4 style={{ color:"#f59e0b", marginBottom:8 }}>💬 O que você achou da aula?</h4>
            {classSent ? (
              <p style={{ color:"#22c55e", fontSize:14 }}>✅ Obrigado! Seu recado foi enviado para o professor.</p>
            ) : (
              <>
                <Stars value={classRating} onChange={setClassRating} />
                <textarea value={classText} onChange={e=>setClassText(e.target.value)} placeholder="Escreva um recado para o professor (opcional)..."
                  style={{ width:"100%", marginTop:10, background:"#0f172a", border:"2px solid #334155", borderRadius:8, color:"#e2e8f0", padding:10, fontSize:14, minHeight:70, boxSizing:"border-box", resize:"vertical" }} />
                <div style={{ textAlign:"right", marginTop:8 }}>
                  <button style={styles.btn("#f59e0b")} onClick={sendClassFeedback} disabled={classRating===0}>Enviar avaliação</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── CODING ──
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Avatar cfg={avatar} size={34} />
          <span style={{ color:"#6366f1", fontWeight:700, fontSize:17 }}>💻 Aula C#</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12, color: connected===false?"#ef4444":connected?"#22c55e":"#94a3b8" }}>
            {connected===null ? "● conectando..." : connected ? "● conectado" : "● sem conexão"}
          </span>
          <span style={{ background:"#6366f122", padding:"4px 12px", borderRadius:20, fontSize:13 }}>👤 {studentName}</span>
          <span style={{ background:"#0f172a", border:"1px solid #334155", padding:"4px 10px", borderRadius:20, fontSize:12, color:"#94a3b8" }}>{shiftLabel(shift)}</span>
          <button style={{ ...styles.btn("#334155"), padding:"6px 12px", fontSize:12 }} onClick={tryFullscreen}>⛶ Tela cheia</button>
          <button style={{ ...styles.btn("#ef4444"), padding:"6px 12px", fontSize:12 }} onClick={onLogout}>Sair</button>
        </div>
      </div>

      {showNudge && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#f59e0b18", border:"2px solid #f59e0b", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:26 }}>📣</span>
            <div style={{ flex:1 }}>
              <b style={{ color:"#f59e0b" }}>Recado do professor</b>
              <p style={{ color:"#fcd9a0", fontSize:14, margin:"2px 0 0", lineHeight:1.5 }}>{nudge.text}</p>
            </div>
            <button onClick={dismissNudge} style={{ ...styles.btn("#f59e0b"), padding:"6px 12px", fontSize:13 }}>Entendi</button>
          </div>
        </div>
      )}

      {idleHint && !showNudge && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#6366f118", border:"1px solid #6366f1", color:"#c7d2fe", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>👀</span>
            <span>Bora começar? Escreva seu primeiro código no editor — o robô te ajuda assim que você parar de digitar.</span>
          </div>
        </div>
      )}

      {fsMsg && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#1e1e3a", border:"1px solid #f59e0b", color:"#f59e0b", borderRadius:10, padding:"8px 14px", fontSize:13 }}>⛶ {fsMsg}</div>
        </div>
      )}

      {renaming != null && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#1e1e3a", border:"2px solid #6366f1", borderRadius:16, padding:24, maxWidth:380, width:"100%" }}>
            <h3 style={{ color:"#6366f1", margin:"0 0 4px" }}>✎ Renomear arquivo</h3>
            <p style={{ color:"#94a3b8", fontSize:13, margin:"0 0 12px" }}>Escolha um nome para o arquivo (o ".cs" é colocado sozinho).</p>
            <div style={{ display:"flex", alignItems:"center", background:"#0f172a", border:"2px solid #334155", borderRadius:10, padding:"0 12px" }}>
              <input autoFocus value={renameValue} onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") confirmRename(); if(e.key==="Escape") cancelRename(); }}
                placeholder="ex: MeuPrograma" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#e2e8f0", fontSize:15, padding:"11px 0" }} />
              <span style={{ color:"#475569", fontSize:14 }}>.cs</span>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={cancelRename} style={{ ...styles.btn("#334155"), flex:1 }}>Cancelar</button>
              <button onClick={confirmRename} style={{ ...styles.btn("#6366f1"), flex:1 }}>Salvar nome</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:14, padding:14, maxWidth:1180, margin:"0 auto", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 560px", minWidth:320 }}>
          {/* abas de arquivos */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
            {files.map((f,i)=>(
              <div key={i} onClick={()=>setActive(i)} style={{ display:"flex", alignItems:"center", gap:6, background:i===active?"#1e1e1e":"#15151f", border:`1px solid ${i===active?"#6366f1":"#334155"}`, color:i===active?"#fff":"#94a3b8", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>
                <span>📄 {f.name}</span>
                <span onClick={(e)=>{e.stopPropagation();openRename(i);}} title="Renomear" style={{ color:"#6366f1", fontWeight:700 }}>✎</span>
                {files.length>1 && <span onClick={(e)=>{e.stopPropagation();deleteFile(i);}} title="Apagar" style={{ color:"#ef4444", fontWeight:700 }}>✕</span>}
              </div>
            ))}
            <button onClick={addFile} style={{ background:"#0f172a", border:"1px dashed #6366f1", color:"#6366f1", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>＋ Novo arquivo</button>
          </div>

          <VSEditor value={activeCode} onChange={updateActiveCode} filename={files[active]?.name} />

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8, flexWrap:"wrap", gap:8 }}>
            <span style={{ color: saveWarn ? "#f59e0b" : "#475569", fontSize:12 }}>{saveWarn || (analyzing?"🔍 Verificando...":"🤖 O robô confere 2 segundos depois que você para de escrever")}</span>
            <button style={styles.btn("#22c55e")} onClick={handleSave}>💾 Salvar e Finalizar Aula</button>
          </div>

          {/* Terminal */}
          <div style={{ background:"#0a0a0a", border:"1px solid #333", borderRadius:8, marginTop:12, overflow:"hidden" }}>
            <div style={{ background:"#161616", padding:"6px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #333" }}>
              <span style={{ color:"#bbb", fontSize:13 }}>⌨️ Terminal <span style={{ color:"#666" }}>(simulado)</span></span>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>setShowStdin(s=>!s)} style={{ background:"#222", border:"1px solid #444", color:"#bbb", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>entrada</button>
                <button onClick={()=>setTerminalOut("")} style={{ background:"#222", border:"1px solid #444", color:"#bbb", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>limpar</button>
                <button onClick={runCode} disabled={running} style={{ background:"#22c55e", border:"none", color:"#fff", borderRadius:6, padding:"3px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>{running?"executando...":"▶ dotnet run"}</button>
              </div>
            </div>
            {showStdin && (
              <div style={{ padding:"8px 12px", borderBottom:"1px solid #333" }}>
                <p style={{ color:"#666", fontSize:11, marginBottom:4 }}>Entrada do teclado (uma linha por Console.ReadLine):</p>
                <textarea value={stdin} onChange={e=>setStdin(e.target.value)} placeholder="ex: João\n15" style={{ width:"100%", background:"#000", border:"1px solid #333", color:"#0f0", fontFamily:"monospace", fontSize:13, borderRadius:6, padding:8, minHeight:44, boxSizing:"border-box", resize:"vertical" }} />
              </div>
            )}
            <pre style={{ margin:0, padding:12, color:"#d4d4d4", fontFamily:"'Courier New',monospace", fontSize:13, minHeight:90, maxHeight:200, overflow:"auto", whiteSpace:"pre-wrap" }}>{terminalOut || "Clique em ▶ dotnet run para testar seu código."}</pre>
          </div>
        </div>

        {/* Robô + atalhos */}
        <div style={{ width:250, flex:"0 0 250px" }}>
          <div style={styles.card}>
            <Robot state={robotState} />
            {robotMsg&&(<div style={{ background:robotState==="error"?"#ef444411":"#22c55e11", border:`1px solid ${robotState==="error"?"#ef4444":"#22c55e"}`, borderRadius:8, padding:12, marginTop:10, fontSize:13, lineHeight:1.6 }}>{robotMsg}</div>)}
            {keysToShow.length>0&&(<div style={{ marginTop:10 }}><p style={{ color:"#f59e0b", fontSize:12, fontWeight:600, marginBottom:4 }}>Teclas para usar:</p>{keysToShow.map((k,i)=><KeyVisual key={i} char={k}/>)}</div>)}
          </div>
          <div style={{ ...styles.card, fontSize:12, color:"#475569", lineHeight:1.8 }}>
            <p style={{ color:"#6366f1", fontWeight:600, marginBottom:6 }}>⌨️ Atalhos do editor</p>
            <div><code style={{color:"#FFD700"}}>{"{"}</code> → abre e fecha sozinho</div>
            <div><code style={{color:"#DA70D6"}}>(</code> → abre e fecha sozinho</div>
            <div><code style={{color:"#ce9178"}}>"</code> → abre e fecha sozinho</div>
            <div><code style={{color:"#d4d4d4"}}>Tab</code> → empurra o texto para a direita</div>
            <div><code style={{color:"#d4d4d4"}}>Enter</code> → começa uma linha nova já no lugar certo</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CODE LAB  (editor + terminal + robô, reutilizável — usado pelo professor)
// ════════════════════════════════════════════════════════════════════════════
function CodeLab({ accent = "#f59e0b", files = [{ name:"Program.cs", code:"" }], onChange = ()=>{} }) {
  const setFiles = (updater) => onChange(typeof updater === "function" ? updater(files) : updater);
  const [active, setActive] = useState(0);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [robotState, setRobotState] = useState("idle");
  const [robotMsg, setRobotMsg] = useState("");
  const [keysToShow, setKeysToShow] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [terminalOut, setTerminalOut] = useState("");
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [showStdin, setShowStdin] = useState(false);
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
        const result = await askClaude(
          `Revise com atenção este código C#. C# diferencia maiúsculas de minúsculas (Console.WriteLine, etc). Nesta turma usamos os tipos em minúsculo (string, int, double, bool). Confira ; faltando, chaves/parênteses/aspas abertas, palavras-chave erradas e variáveis não declaradas.\n\nCódigo:\n\`\`\`csharp\n${activeCode}\n\`\`\`\n\nResponda APENAS JSON puro: {"ok":true/false,"message":"elogio curto se ok; se houver erro, onde está e como corrigir em 1-3 frases","missingChars":["símbolos que faltam"]}`,
          "Revisor de C# atento e objetivo. Responda APENAS JSON puro."
        );
        const parsed = JSON.parse(result.replace(/```json|```/g,"").trim());
        setRobotState(parsed.ok?"ok":"error"); setRobotMsg(parsed.message); setKeysToShow(parsed.missingChars||[]);
      } catch(e) {
        if (e.message === 'ROBOTKEY_MISSING') { setRobotState("error"); setRobotMsg("🔑 Robô IA offline: configure ANTHROPIC_API_KEY no Vercel."); }
        else { setRobotState("idle"); setRobotMsg(""); }
      }
      setAnalyzing(false);
    }, 2000);
  }, [activeCode]);

  const runCode = async () => {
    setRunning(true);
    setTerminalOut(prev => prev + `\n$ dotnet run\n`);
    try {
      const out = await askClaude(
        `Aja como o compilador e runtime do .NET executando "dotnet run" neste programa C#.\nArquivo ${files[active].name}:\n\`\`\`csharp\n${activeCode}\n\`\`\`\n` +
        (stdin.trim() ? `\nEntrada digitada (cada linha é um Console.ReadLine):\n${stdin}\n` : ``) +
        `\nResponda APENAS com a saída EXATA do console. Se houver erro de compilação, responda com a(s) mensagem(ns) reais do compilador C# (ex: Program.cs(8,32): error CS1002: ; expected). Sem explicações, sem markdown.`,
        "Você é o compilador/runtime do .NET (C#). Responda apenas com a saída do console ou erros. Sem markdown."
      );
      setTerminalOut(prev => prev + (out.replace(/```/g,"").trim() || "(sem saída)") + "\n");
    } catch { setTerminalOut(prev => prev + "Não consegui executar agora. Tente de novo.\n"); }
    setRunning(false);
  };

  const card = { background:"#1e1e3a", borderRadius:12, padding:16, margin:"10px 0", border:"1px solid #334155" };

  return (
    <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
      {renaming != null && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#1e1e3a", border:`2px solid ${accent}`, borderRadius:16, padding:24, maxWidth:380, width:"100%" }}>
            <h3 style={{ color:accent, margin:"0 0 4px" }}>✎ Renomear arquivo</h3>
            <p style={{ color:"#94a3b8", fontSize:13, margin:"0 0 12px" }}>Escolha um nome (o ".cs" é colocado sozinho).</p>
            <div style={{ display:"flex", alignItems:"center", background:"#0f172a", border:"2px solid #334155", borderRadius:10, padding:"0 12px" }}>
              <input autoFocus value={renameValue} onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") confirmRename(); if(e.key==="Escape") cancelRename(); }} placeholder="ex: MeuPrograma" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#e2e8f0", fontSize:15, padding:"11px 0" }} />
              <span style={{ color:"#475569", fontSize:14 }}>.cs</span>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={cancelRename} style={{ background:"#334155", color:"#fff", border:"none", borderRadius:8, padding:"10px 0", cursor:"pointer", fontWeight:700, flex:1 }}>Cancelar</button>
              <button onClick={confirmRename} style={{ background:accent, color:"#fff", border:"none", borderRadius:8, padding:"10px 0", cursor:"pointer", fontWeight:700, flex:1 }}>Salvar nome</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex:"1 1 560px", minWidth:320 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
          {files.map((f,i)=>(
            <div key={i} onClick={()=>setActive(i)} style={{ display:"flex", alignItems:"center", gap:6, background:i===active?"#1e1e1e":"#15151f", border:`1px solid ${i===active?accent:"#334155"}`, color:i===active?"#fff":"#94a3b8", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>
              <span>📄 {f.name}</span>
              <span onClick={(e)=>{e.stopPropagation();openRename(i);}} title="Renomear" style={{ color:accent, fontWeight:700 }}>✎</span>
              {files.length>1 && <span onClick={(e)=>{e.stopPropagation();deleteFile(i);}} title="Apagar" style={{ color:"#ef4444", fontWeight:700 }}>✕</span>}
            </div>
          ))}
          <button onClick={addFile} style={{ background:"#0f172a", border:`1px dashed ${accent}`, color:accent, borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>＋ Novo arquivo</button>
        </div>

        <VSEditor value={activeCode} onChange={updateActiveCode} filename={files[active]?.name} />

        <div style={{ display:"flex", justifyContent:"flex-start", alignItems:"center", marginTop:8 }}>
          <span style={{ color:"#475569", fontSize:12 }}>{analyzing?"🔍 Verificando...":"🤖 O robô confere 2 segundos depois que você para de escrever"}</span>
        </div>

        <div style={{ background:"#0a0a0a", border:"1px solid #333", borderRadius:8, marginTop:12, overflow:"hidden" }}>
          <div style={{ background:"#161616", padding:"6px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #333" }}>
            <span style={{ color:"#bbb", fontSize:13 }}>⌨️ Terminal <span style={{ color:"#666" }}>(simulado)</span></span>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>setShowStdin(s=>!s)} style={{ background:"#222", border:"1px solid #444", color:"#bbb", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>entrada</button>
              <button onClick={()=>setTerminalOut("")} style={{ background:"#222", border:"1px solid #444", color:"#bbb", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>limpar</button>
              <button onClick={runCode} disabled={running} style={{ background:"#22c55e", border:"none", color:"#fff", borderRadius:6, padding:"3px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>{running?"executando...":"▶ dotnet run"}</button>
            </div>
          </div>
          {showStdin && (
            <div style={{ padding:"8px 12px", borderBottom:"1px solid #333" }}>
              <p style={{ color:"#666", fontSize:11, marginBottom:4 }}>Entrada do teclado (uma linha por Console.ReadLine):</p>
              <textarea value={stdin} onChange={e=>setStdin(e.target.value)} placeholder={"ex: João\\n15"} style={{ width:"100%", background:"#000", border:"1px solid #333", color:"#0f0", fontFamily:"monospace", fontSize:13, borderRadius:6, padding:8, minHeight:44, boxSizing:"border-box", resize:"vertical" }} />
            </div>
          )}
          <pre style={{ margin:0, padding:12, color:"#d4d4d4", fontFamily:"'Courier New',monospace", fontSize:13, minHeight:90, maxHeight:220, overflow:"auto", whiteSpace:"pre-wrap" }}>{terminalOut || "Clique em ▶ dotnet run para testar seu código."}</pre>
        </div>
      </div>

      <div style={{ width:250, flex:"0 0 250px" }}>
        <div style={card}>
          <Robot state={robotState} />
          {robotMsg && (<div style={{ background:robotState==="error"?"#ef444411":"#22c55e11", border:`1px solid ${robotState==="error"?"#ef4444":"#22c55e"}`, borderRadius:8, padding:12, marginTop:10, fontSize:13, lineHeight:1.6 }}>{robotMsg}</div>)}
          {keysToShow.length>0 && (<div style={{ marginTop:10 }}><p style={{ color:accent, fontSize:12, fontWeight:600, marginBottom:4 }}>Teclas para usar:</p>{keysToShow.map((k,i)=><KeyVisual key={i} char={k}/>)}</div>)}
        </div>
        <div style={{ ...card, fontSize:12, color:"#475569", lineHeight:1.8 }}>
          <p style={{ color:accent, fontWeight:600, marginBottom:6 }}>👩‍🏫 O exemplo da aula</p>
          <p style={{ color:"#94a3b8" }}>Programe aqui o exemplo de hoje e teste com o ▶ dotnet run. Este código <b>fica salvo</b> e é usado para gerar o nome do conteúdo do dia. Os alunos não veem esta área.</p>
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
        <button onClick={prev} style={{ background:"#0f172a", border:"1px solid #334155", color:"#e2e8f0", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>‹</button>
        <span style={{ color:"#e2e8f0", fontWeight:700, textTransform:"capitalize" }}>{monthName}</span>
        <button onClick={next} style={{ background:"#0f172a", border:"1px solid #334155", color:"#e2e8f0", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
        {wd.map((d,i)=><div key={"h"+i} style={{ textAlign:"center", color:"#475569", fontSize:12, fontWeight:700 }}>{d}</div>)}
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
                background:isClass?"#22c55e":"#0f172a", color:isClass?"#062":"#94a3b8",
                border:isToday?"2px solid #6366f1":"1px solid #334155" }}>
              {d}
              {cname && <span style={{ position:"absolute", bottom:3, left:0, right:0, fontSize:9, lineHeight:1 }}>📖</span>}
            </button>
          );
        })}
      </div>
      <p style={{ color:"#475569", fontSize:12, marginTop:10 }}><span style={{ display:"inline-block", width:12, height:12, background:"#22c55e", borderRadius:3, verticalAlign:"middle", marginRight:6 }}/>dias de aula &nbsp;·&nbsp; <span style={{ display:"inline-block", width:12, height:12, border:"2px solid #6366f1", borderRadius:3, verticalAlign:"middle", marginRight:6 }}/>hoje &nbsp;·&nbsp; 📖 tem conteúdo</p>
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
  // código do professor (aba "Meu código") — vive aqui para não se perder ao trocar de aba e para nomear o conteúdo
  const [proFiles, setProFiles] = useState([{ name:"Program.cs", code:"" }]);
  const [proLoaded, setProLoaded] = useState(false);
  // prova
  const [examConfig, setExamConfig] = useState({ status: 'idle' });
  const [examGenerating, setExamGenerating] = useState(false);
  const [examMsg, setExamMsg] = useState("");
  const [examShift, setExamShift] = useState("all");
  const [confirmEndExam, setConfirmEndExam] = useState(false);

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
  // carrega o código salvo do professor uma vez
  useEffect(() => { getTeacherCode().then(c => { if (c && Array.isArray(c.files) && c.files.length) setProFiles(c.files); setProLoaded(true); }); }, []);
  // salva o código do professor (sem pressa) sempre que ele mexe — só depois de já ter carregado, para não apagar o que estava salvo
  useEffect(() => {
    if (!proLoaded) return;
    const id = setTimeout(() => { saveTeacherCode(proFiles); }, 1000);
    return () => clearTimeout(id);
  }, [proFiles, proLoaded]);

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

  // gera um nome de conteúdo para a aula de hoje — de preferência a partir do exemplo que o professor programou
  const generateContentName = async () => {
    const tk = todayKey();
    const proCode = (proFiles||[]).map(f => (f.code||"")).join("\n").trim();
    let source = "", origem = "";
    if (proCode.length > 5) {
      source = (proFiles||[]).filter(f=>(f.code||"").trim()).map(f=>`// ${f.name}\n${f.code}`).join("\n\n");
      origem = "professor";
    } else {
      const base = (shiftFilter === "all" ? students : students.filter(s => (s.shift||"sem-turno")===shiftFilter));
      const codes = base.filter(s => (s.code||"").trim().length > 5).map((s,i)=>`Aluno ${i+1}:\n${s.code}`).join("\n\n---\n\n");
      if (codes) { source = codes; origem = "alunos"; }
    }
    if (!source) { setNameMsg("Programe o exemplo de hoje na aba “Meu código” (ou espere os alunos começarem a escrever) para eu gerar o nome."); setTimeout(()=>setNameMsg(""), 6000); return; }
    setGenName(true); setNameMsg("");
    try {
      const ctx = origem === "professor"
        ? "Este é o código C# que o professor escreveu como exemplo na aula de hoje"
        : "Estes são os códigos C# que os alunos escreveram na aula de hoje";
      const out = await askClaude(
        `${ctx}:\n\n${source}\n\nGere um TÍTULO curto de conteúdo para esta aula, em português, com no máximo 6 palavras, que resuma o principal tema/conceito trabalhado (ex: "Variáveis e Console.WriteLine", "Condições com if e else", "Entrada de dados com ReadLine"). Responda APENAS com o título, sem aspas e sem ponto final.`,
        "Você nomeia o conteúdo de aulas de C# para iniciantes. Responda só com um título curto."
      );
      const title = out.replace(/["\n`]/g,"").trim().slice(0,80);
      const nm = { ...metaRef.current, contentNames: { ...(metaRef.current.contentNames||{}), [tk]: title } };
      metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm);
      setNameMsg(`✅ Conteúdo de hoje: ${title}${origem==="alunos"?" (gerado pelo código dos alunos)":""}`);
      setTimeout(()=>setNameMsg(""), 6000);
    } catch { setNameMsg("Não consegui gerar agora. Tente de novo em instantes."); setTimeout(()=>setNameMsg(""), 5000); }
    setGenName(false);
  };

  // envia um aviso para um aluno específico aparecer na tela dele
  const nudgeStudent = async (s) => {
    const ok = await setNudge(s.shift, s.name, "👀 Preste atenção na aula! Volte para o seu código e continue a atividade de hoje.");
    if (ok) { setNudged(n => ({ ...n, [s.name]: Date.now() })); setTimeout(()=>setNudged(n=>{ const c={...n}; delete c[s.name]; return c; }), 5000); }
  };

  const startExam = async () => {
    const proCode = (proFiles||[]).map(f => (f.code||"")).join("\n").trim();
    const studentCodes = students.filter(s=>(s.code||"").trim().length>5).map(s=>s.code).join("\n").slice(0,2000);
    const codeCtx = proCode || studentCodes;
    if (!codeCtx) { setExamMsg("Escreva o código de exemplo na aba Meu código primeiro!"); return; }
    setExamGenerating(true); setExamMsg("Gerando resumo...");
    try {
      const summaryResult = await askClaude(
        `Aqui está o código C# da aula de hoje:\n\`\`\`csharp\n${codeCtx}\n\`\`\`\n\nCrie um RESUMO DE REVISÃO em tópicos claros (máximo 8 tópicos) para os alunos estudarem antes de uma prova. Cada tópico: emoji + nome do conceito + explicação simples de 1 frase + exemplo curto. Português simples. Sem markdown pesado, use • para tópicos.`,
        "Você cria resumos de revisão de C# para alunos iniciantes. Português simples."
      );
      setExamMsg("Gerando questões...");
      const questionsResult = await askClaude(
        `Com base neste código C# da aula:\n\`\`\`csharp\n${codeCtx}\n\`\`\`\n\nCrie 10 questões de múltipla escolha sobre os CONCEITOS do código (não matemática). Varie a dificuldade. Responda APENAS JSON puro sem markdown:\n{"questions":[{"q":"pergunta","opts":["A","B","C","D"],"correct":0}]}`,
        "Crie questões de múltipla escolha sobre C#. APENAS JSON puro sem markdown."
      );
      const parsed = JSON.parse(questionsResult.replace(/```json|```/g,"").trim());
      const newConfig = { status: 'review', questions: parsed.questions, summary: summaryResult.trim(), shift: examShift, startedAt: Date.now() };
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

  const now = Date.now();
  const tk = todayKey();
  const isOnline = (s) => s.lastSeen && (now - s.lastSeen) < 9000;
  const phaseLabel = p => ({coding:"Codando",generating:"Gerando",summary:"No Resumo",activity:"Na Atividade",done:"Concluído"})[p]||"Aguardando";
  const phaseColor = p => ({coding:"#6366f1",generating:"#f59e0b",summary:"#f59e0b",activity:"#3b82f6",done:"#22c55e"})[p]||"#94a3b8";
  const hhmm = t => t ? new Date(t).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "—";
  const hhmmss = t => t ? new Date(t).toLocaleTimeString("pt-BR") : "—";

  // filtro por turno
  const shown = shiftFilter==="all" ? students : students.filter(s => (s.shift||"sem-turno")===shiftFilter);
  const sorted = [...shown].sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt-BR"));
  const sel = selected ? students.find(s=>s.name===selected) : null;
  const present = shown.filter(isOnline).length;
  const goingWell = sorted.filter(s => difficultyOf(s).level==="bem");
  const needHelp  = sorted.filter(s => difficultyOf(s).level==="dif");
  const feedbacks = sorted.filter(s => s.classFeedback && (s.classFeedback.rating || (s.classFeedback.text||"").trim()));

  // presença do dia: present (compareceu e fez algo) · idle (entrou mas parado) · absent (não entrou hoje)
  const attStatus = (s) => {
    const a = s.attendance && s.attendance[tk];
    if (a) return a;
    return isSameDayTs(s.lastSeen) ? "present" : "absent";
  };
  const presentList = sorted.filter(s => attStatus(s)==="present");
  const idleList    = sorted.filter(s => attStatus(s)==="idle");
  const absentList  = sorted.filter(s => attStatus(s)==="absent");
  const todayContent = (meta.contentNames||{})[tk];

  const styles = {
    container:{ minHeight:"100vh", background:"#0f0f1a", color:"#e2e8f0", fontFamily:"'Segoe UI',sans-serif" },
    header:{ background:"#1e1e3a", padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"2px solid #f59e0b", flexWrap:"wrap", gap:8 },
    card:{ background:"#1e1e3a", borderRadius:12, padding:16, margin:"10px 0", border:"1px solid #334155" },
    btn:(c)=>({ background:c, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontWeight:700 }),
    badge:(c)=>({ background:c+"22", color:c, padding:"2px 10px", borderRadius:12, fontSize:12, fontWeight:600 }),
    tab:(on)=>({ background:on?"#f59e0b":"transparent", color:on?"#fff":"#94a3b8", border:`1px solid ${on?"#f59e0b":"#334155"}`, borderRadius:8, padding:"6px 14px", cursor:"pointer", fontWeight:700, fontSize:13 }),
  };
  const dot = (on) => (<span style={{ width:9, height:9, borderRadius:"50%", background:on?"#22c55e":"#475569", display:"inline-block", marginRight:6, boxShadow:on?"0 0 6px #22c55e":"none" }}/>);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <span style={{ color:"#f59e0b", fontWeight:700, fontSize:18 }}>👨‍🏫 Painel do Professor</span>
          <span style={{ color:"#94a3b8", marginLeft:12, fontSize:12 }}>● ao vivo · {lastUpdate}{meta.city?` · 📍 ${meta.city}`:""}{todayContent?` · 📖 ${todayContent}`:""}</span>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button style={styles.tab(tab==="monitor")} onClick={()=>setTab("monitor")}>👥 Monitoramento</button>
          <button style={styles.tab(tab==="code")} onClick={()=>setTab("code")}>👨‍💻 Meu código</button>
          <button style={styles.tab(tab==="calendar")} onClick={()=>setTab("calendar")}>🗓️ Calendário</button>
          <button style={styles.tab(tab==="feedback")} onClick={()=>setTab("feedback")}>💬 Feedback ({feedbacks.length})</button>
          <button style={{ ...styles.tab(tab==="exam"), ...(examConfig.status!=='idle'?{borderColor:"#f59e0b",color:tab==="exam"?"#fff":"#f59e0b"}:{}) }} onClick={()=>setTab("exam")}>🏆 Prova{examConfig.status!=='idle'?' ●':''}</button>
          <button style={styles.btn("#ef4444")} onClick={()=>{ setResetScope(shiftFilter); setConfirmReset(true); }} disabled={resetting}>{resetting?"Resetando...":"🔄 Resetar"}</button>
          <button style={{ ...styles.btn("#475569"), fontSize:13 }} onClick={onLogout}>Sair</button>
        </div>
      </div>

      {/* filtro de turno (vale para monitoramento, chamada, situação e feedback) */}
      {tab!=="code" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ color:"#94a3b8", fontSize:13 }}>Turma:</span>
          <button onClick={()=>setShiftFilter("all")} style={styles.tab(shiftFilter==="all")}>Todas ({students.length})</button>
          {SHIFTS.map(sh => (
            <button key={sh.id} onClick={()=>setShiftFilter(sh.id)} style={styles.tab(shiftFilter===sh.id)}>
              {sh.emoji} {sh.label} ({students.filter(s=>(s.shift||"sem-turno")===sh.id).length})
            </button>
          ))}
        </div>
      )}

      {/* aviso de resultado do reset */}
      {resetMsg && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#1e1e3a", border:`1px solid ${resetMsg.startsWith("✅")?"#22c55e":"#ef4444"}`, color:resetMsg.startsWith("✅")?"#22c55e":"#ef4444", borderRadius:10, padding:"10px 14px", fontSize:14 }}>{resetMsg}</div>
        </div>
      )}

      {/* confirmação de reset (dentro do app, sem depender do navegador) */}
      {confirmReset && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#1e1e3a", border:"2px solid #ef4444", borderRadius:16, padding:24, maxWidth:440, width:"100%" }}>
            <div style={{ fontSize:40, textAlign:"center" }}>⚠️</div>
            <h3 style={{ color:"#ef4444", textAlign:"center", margin:"8px 0" }}>Resetar perfis dos alunos?</h3>
            <p style={{ color:"#cbd5e1", fontSize:14, lineHeight:1.6, textAlign:"center" }}>Isso apaga os alunos escolhidos e tudo o que eles fizeram (códigos, atividades e feedbacks). O calendário, a cidade e os nomes de conteúdo <b>não</b> são apagados. Não dá para desfazer.</p>
            <p style={{ color:"#94a3b8", fontSize:13, margin:"14px 0 6px" }}>O que você quer resetar?</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={()=>setResetScope("all")} style={{ ...styles.tab(resetScope==="all"), flex:"1 1 120px" }}>Todos os turnos</button>
              {SHIFTS.map(sh => (
                <button key={sh.id} onClick={()=>setResetScope(sh.id)} style={{ ...styles.tab(resetScope===sh.id), flex:"1 1 120px" }}>Só {sh.emoji} {sh.label}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={()=>setConfirmReset(false)} style={{ ...styles.btn("#334155"), flex:1 }}>Cancelar</button>
              <button onClick={doReset} style={{ ...styles.btn("#ef4444"), flex:1 }}>{resetScope==="all"?"Resetar todos":`Resetar ${shiftMeta(resetScope).label}`}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── MONITORAMENTO ─────────── */}
      {tab==="monitor" && (
        <div style={{ display:"flex", gap:14, padding:14, maxWidth:1180, margin:"0 auto", alignItems:"flex-start", flexWrap:"wrap" }}>
          {/* esquerda */}
          <div style={{ width:300, flex:"0 0 300px" }}>
            <div style={styles.card}>
              <h3 style={{ color:"#f59e0b", marginBottom:12 }}>👥 Monitoramento ({shown.length})</h3>
              {shown.length===0 && <p style={{ color:"#475569", fontSize:13 }}>{students.length===0 ? "Aguardando alunos entrarem..." : "Nenhum aluno nesta turma. Veja outra turma no filtro acima."}</p>}
              <div style={{ maxHeight:340, overflowY:"auto" }}>
                {sorted.map(s=>{
                  const d = difficultyOf(s);
                  return (
                    <div key={s.name} onClick={()=>setSelected(s.name===selected?null:s.name)} style={{ background:selected===s.name?"#6366f122":"#0f172a", border:`2px solid ${selected===s.name?"#6366f1":"#334155"}`, borderRadius:10, padding:"10px 12px", marginBottom:8, cursor:"pointer" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ display:"flex", alignItems:"center", gap:8, fontWeight:600 }}><Avatar cfg={s.avatar} size={26} />{dot(isOnline(s))}{s.name}</span>
                        <span style={styles.badge(phaseColor(s.phase))}>{phaseLabel(s.phase)}</span>
                      </div>
                      <div style={{ marginTop:6 }}>
                        <span style={styles.badge(d.level==="dif"?"#ef4444":d.level==="bem"?"#22c55e":"#94a3b8")}>{d.level==="dif"?"⚠ Com dificuldade":d.level==="bem"?"✅ Indo bem":"• Começando"}</span>
                        {s.score!=null && <span style={{ ...styles.badge("#22c55e"), marginLeft:6 }}>🏆 {s.score}</span>}
                      </div>
                      <div style={{ color:"#475569", fontSize:11, marginTop:4 }}>visto {hhmmss(s.lastSeen)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styles.card}>
              <h4 style={{ color:"#f59e0b", marginBottom:10, fontSize:14 }}>📊 Turma</h4>
              {["coding","summary","activity","done"].map(p=>(
                <div key={p} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:phaseColor(p), fontSize:13 }}>{phaseLabel(p)}</span>
                  <span style={styles.badge(phaseColor(p))}>{shown.filter(s=>s.phase===p).length}</span>
                </div>
              ))}
              <hr style={{ borderColor:"#334155", margin:"8px 0" }}/>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#94a3b8", fontSize:13 }}>Média</span>
                <span style={{ color:"#22c55e", fontWeight:700 }}>{shown.filter(s=>s.score!=null).length>0 ? Math.round(shown.filter(s=>s.score!=null).reduce((a,s)=>a+s.score,0)/shown.filter(s=>s.score!=null).length)+" pts" : "—"}</span>
              </div>
            </div>

            <div style={{ ...styles.card, fontSize:12 }}>
              <h4 style={{ color:"#f59e0b", fontSize:13, marginBottom:6 }}>🔧 Conexão</h4>
              {diag ? (
                <div style={{ color:"#cbd5e1", lineHeight:1.7 }}>
                  <div>
                    Armazenamento: <b style={{ color:diag.hasStorage?"#22c55e":"#ef4444" }}>{diag.hasStorage?"OK":"NÃO"}</b>
                    {diag.writeRead!=="—" && <> · <b style={{ color:diag.writeRead==="ok"?"#22c55e":"#ef4444" }}>{diag.writeRead}</b></>}
                  </div>
                  <div>Robô IA: <b style={{ color:diag.hasAI===true?"#22c55e":diag.hasAI===false?"#ef4444":"#94a3b8" }}>{diag.hasAI===true?"OK":diag.hasAI===false?"NÃO":"—"}</b></div>

                  {!diag.hasStorage && (
                    <div style={{ background:"#ef444415", border:"1px solid #ef4444", borderRadius:8, padding:"10px 12px", marginTop:8, lineHeight:1.8 }}>
                      <b style={{ color:"#ef4444" }}>❌ Monitoramento sem banco de dados</b><br/>
                      <span style={{ color:"#94a3b8" }}>
                        1. Acesse <b style={{color:"#e2e8f0"}}>vercel.com/dashboard</b><br/>
                        2. Abra o projeto → aba <b style={{color:"#e2e8f0"}}>Storage</b><br/>
                        3. <b style={{color:"#e2e8f0"}}>Create Database → KV</b> (escolha Upstash)<br/>
                        4. Clique <b style={{color:"#e2e8f0"}}>Connect to Project</b><br/>
                        5. Vá em <b style={{color:"#e2e8f0"}}>Deployments → Redeploy</b>
                      </span>
                    </div>
                  )}
                  {diag.hasAI === false && (
                    <div style={{ background:"#f59e0b15", border:"1px solid #f59e0b", borderRadius:8, padding:"10px 12px", marginTop:8, lineHeight:1.8 }}>
                      <b style={{ color:"#f59e0b" }}>⚠ Robô IA sem chave de API</b><br/>
                      <span style={{ color:"#94a3b8" }}>
                        1. Acesse <b style={{color:"#e2e8f0"}}>console.anthropic.com</b><br/>
                        2. API Keys → <b style={{color:"#e2e8f0"}}>Create Key</b><br/>
                        3. No Vercel: projeto → <b style={{color:"#e2e8f0"}}>Settings → Environment Variables</b><br/>
                        4. Adicione <b style={{color:"#e2e8f0"}}>ANTHROPIC_API_KEY</b> = sua chave<br/>
                        5. <b style={{color:"#e2e8f0"}}>Redeploy</b>
                      </span>
                    </div>
                  )}
                </div>
              ) : <span style={{ color:"#475569" }}>verificando...</span>}
              <button style={{ ...styles.btn("#334155"), padding:"4px 10px", fontSize:12, marginTop:8 }} onClick={()=>{ diagnose().then(setDiag); load(); }}>↻ Verificar agora</button>
            </div>

            <div style={{ ...styles.card, fontSize:12 }}>
              <h4 style={{ color:"#f59e0b", fontSize:13, marginBottom:6 }}>📖 Conteúdo de hoje</h4>
              {todayContent
                ? <p style={{ color:"#22c55e", fontSize:14, fontWeight:600, lineHeight:1.5 }}>{todayContent}</p>
                : <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.5 }}>Programe o exemplo do dia na aba <b>Meu código</b> e gere um nome automático para a aula. (Se ainda não programou, uso o código dos alunos.)</p>}
              <button style={{ ...styles.btn("#6366f1"), padding:"6px 12px", fontSize:13, marginTop:8, width:"100%", opacity:genName?0.6:1 }} onClick={generateContentName} disabled={genName}>{genName?"Gerando...":"✨ Gerar nome do conteúdo"}</button>
              {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#22c55e":"#f59e0b", fontSize:12, marginTop:8, lineHeight:1.5 }}>{nameMsg}</p>}
            </div>
          </div>

          {/* direita */}
          <div style={{ flex:"1 1 420px", minWidth:300 }}>
            {/* Chamada */}
            <div style={styles.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                <h3 style={{ color:"#f59e0b" }}>📋 Lista de Chamada</h3>
                <span style={styles.badge("#22c55e")}>{present} online / {shown.length}</span>
              </div>
              {shown.length===0 ? <p style={{ color:"#475569", fontSize:13 }}>Nenhum aluno na chamada ainda.</p> : (
                <>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                    <span style={styles.badge("#22c55e")}>✅ {presentList.length} presente{presentList.length!==1?"s":""}</span>
                    <span style={styles.badge("#f59e0b")}>⚠ {idleList.length} sem atividade</span>
                    <span style={styles.badge("#ef4444")}>❌ {absentList.length} falta{absentList.length!==1?"s":""}</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:8 }}>
                    {sorted.map(s=>{
                      const st = attStatus(s);
                      const stColor = st==="present"?"#22c55e":st==="idle"?"#f59e0b":"#ef4444";
                      const stLabel = st==="present"?"✅ Presente":st==="idle"?"⚠ Sem atividade":"❌ Falta";
                      return (
                        <div key={s.name} style={{ background:"#0f172a", border:`1px solid ${st==="absent"?"#3f2530":"#334155"}`, borderRadius:8, padding:"8px 10px", opacity:st==="absent"?0.7:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <Avatar cfg={s.avatar} size={28} />
                            <span style={{ fontSize:14, flex:1 }}>{dot(isOnline(s))}{s.name}</span>
                            <span style={{ color:"#475569", fontSize:11 }}>{hhmm(s.joinedAt)}</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, flexWrap:"wrap" }}>
                            <span style={styles.badge(stColor)}>{stLabel}</span>
                            {st==="idle" && (
                              nudged[s.name]
                                ? <span style={{ color:"#22c55e", fontSize:11, fontWeight:600 }}>aviso enviado ✓</span>
                                : <button onClick={()=>nudgeStudent(s)} style={{ background:"transparent", color:"#f59e0b", border:"1px solid #f59e0b", borderRadius:8, padding:"2px 8px", fontSize:11, fontWeight:600, cursor:"pointer" }}>👀 Enviar aviso</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Situação da turma */}
            <div style={styles.card}>
              <h3 style={{ color:"#f59e0b", marginBottom:10 }}>📈 Situação da turma</h3>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:"1 1 200px" }}>
                  <p style={{ color:"#22c55e", fontWeight:700, marginBottom:6 }}>✅ Indo bem ({goingWell.length})</p>
                  {goingWell.length===0 ? <p style={{ color:"#475569", fontSize:13 }}>—</p> : goingWell.map(s=>(
                    <div key={s.name} style={{ fontSize:13, color:"#cbd5e1", marginBottom:4 }}>• <b>{s.name}</b>: {difficultyOf(s).text}</div>
                  ))}
                </div>
                <div style={{ flex:"1 1 200px" }}>
                  <p style={{ color:"#ef4444", fontWeight:700, marginBottom:6 }}>⚠ Precisam de ajuda ({needHelp.length})</p>
                  {needHelp.length===0 ? <p style={{ color:"#475569", fontSize:13 }}>—</p> : needHelp.map(s=>(
                    <div key={s.name} style={{ fontSize:13, color:"#cbd5e1", marginBottom:4 }}>• <b>{s.name}</b>: {difficultyOf(s).text}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detalhe do aluno */}
            {sel ? (
              <>
                <div style={styles.card}>
                  <h3 style={{ color:"#f59e0b", display:"flex", alignItems:"center", gap:10 }}><Avatar cfg={sel.avatar} size={34} />{dot(isOnline(sel))}{sel.name}</h3>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:8 }}>
                    <span style={styles.badge(phaseColor(sel.phase))}>{phaseLabel(sel.phase)}</span>
                    {sel.score!=null && <span style={styles.badge("#22c55e")}>🏆 {sel.score} pts</span>}
                    {(() => { const d=difficultyOf(sel); return <span style={styles.badge(d.level==="dif"?"#ef4444":"#22c55e")}>{d.level==="dif"?"⚠ "+d.text:"✅ "+d.text}</span>; })()}
                  </div>
                </div>
                {Array.isArray(sel.files) && sel.files.length>0 ? sel.files.map((f,i)=>(
                  <div key={i} style={styles.card}>
                    <h4 style={{ color:"#6366f1", marginBottom:8 }}>📄 {f.name}</h4>
                    <pre style={{ background:"#1e1e1e", padding:12, borderRadius:8, fontFamily:"monospace", fontSize:13, color:"#a5f3fc", overflow:"auto", maxHeight:240, whiteSpace:"pre-wrap" }}>{f.code || "(vazio)"}</pre>
                  </div>
                )) : sel.code && (
                  <div style={styles.card}>
                    <h4 style={{ color:"#6366f1", marginBottom:8 }}>💻 Código</h4>
                    <pre style={{ background:"#1e1e1e", padding:12, borderRadius:8, fontFamily:"monospace", fontSize:13, color:"#a5f3fc", overflow:"auto", maxHeight:240, whiteSpace:"pre-wrap" }}>{sel.code}</pre>
                  </div>
                )}
                {sel.feedback && <div style={styles.card}><h4 style={{ color:"#6366f1", marginBottom:6 }}>🤖 Robô (último)</h4><p style={{ color:sel.feedback.ok?"#22c55e":"#ef4444", fontSize:13 }}>{sel.feedback.ok?"✅":"⚠"} {sel.feedback.message}</p></div>}
                {sel.answers && sel.dynamicActivity && (
                  <div style={styles.card}>
                    <h4 style={{ color:"#6366f1", marginBottom:10 }}>📝 Atividade</h4>
                    {sel.dynamicActivity.map((q,i)=>(
                      <div key={i} style={{ marginBottom:10, background:"#0f172a", borderRadius:8, padding:"8px 12px" }}>
                        <p style={{ fontSize:13, color:"#94a3b8", marginBottom:4 }}>{i+1}. {q.q}</p>
                        <span style={styles.badge(sel.answers[i]===q.correct?"#22c55e":"#ef4444")}>{sel.answers[i]===q.correct?"✅ Correto":`❌ Errado — correto: ${q.opts[q.correct]}`}</span>
                      </div>
                    ))}
                  </div>
                )}
                {sel.finalFeedback && <div style={styles.card}><h4 style={{ color:"#6366f1", marginBottom:8 }}>🤖 Feedback dado ao aluno</h4><p style={{ color:"#cbd5e1", fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{sel.finalFeedback}</p></div>}
              </>
            ) : (
              <div style={{ ...styles.card, textAlign:"center", padding:40 }}>
                <div style={{ fontSize:36 }}>👆</div>
                <p style={{ color:"#475569" }}>Clique em um aluno no monitoramento para ver o código, a atividade e os detalhes.</p>
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
                <h3 style={{ color:"#f59e0b", margin:0 }}>👨‍💻 Meu código</h3>
                <p style={{ color:"#94a3b8", fontSize:13, margin:"4px 0 0", lineHeight:1.5 }}>Programe aqui o exemplo de hoje. Quando terminar, gere o nome do conteúdo a partir dele — é isso que aparece no calendário.</p>
              </div>
              <button style={{ ...styles.btn("#6366f1"), opacity:genName?0.6:1 }} onClick={generateContentName} disabled={genName}>{genName?"Gerando...":"✨ Gerar nome do conteúdo de hoje"}</button>
            </div>
            {todayContent && <p style={{ color:"#22c55e", fontSize:14, fontWeight:600, margin:"10px 0 0" }}>📖 Conteúdo de hoje: {todayContent}</p>}
            {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#22c55e":"#f59e0b", fontSize:13, margin:"10px 0 0", lineHeight:1.5 }}>{nameMsg}</p>}
          </div>
          <CodeLab accent="#f59e0b" files={proFiles} onChange={setProFiles} />
        </div>
      )}

      {/* ─────────── CALENDÁRIO ─────────── */}
      {tab==="calendar" && (
        <div style={{ display:"flex", gap:14, padding:14, maxWidth:900, margin:"0 auto", alignItems:"flex-start", flexWrap:"wrap" }}>
          <div style={{ ...styles.card, flex:"1 1 380px" }}>
            <h3 style={{ color:"#f59e0b", marginBottom:12 }}>🗓️ Calendário de aulas</h3>
            <p style={{ color:"#94a3b8", fontSize:13, marginBottom:12 }}>Os dias com aula ficam em verde (são marcados sozinhos quando há alunos online, e você também pode clicar para marcar/desmarcar). O 📖 indica os dias que já têm um nome de conteúdo gerado — passe o mouse para ver o tema.</p>
            <Calendar classDays={meta.classDays||[]} contentNames={meta.contentNames||{}} onToggle={toggleClassDay} />
          </div>
          <div style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#f59e0b", marginBottom:12 }}>📍 Sua cidade no DF</h3>
            <input list="df-cities" value={cityInput} onChange={e=>setCityInput(e.target.value)} onBlur={saveCity} placeholder="Ex: Ceilândia"
              style={{ width:"100%", background:"#0f172a", border:"2px solid #334155", borderRadius:10, padding:"10px 12px", color:"#e2e8f0", fontSize:15, boxSizing:"border-box" }} />
            <datalist id="df-cities">{DF_CITIES.map(c=><option key={c} value={c} />)}</datalist>
            <button style={{ ...styles.btn("#6366f1"), marginTop:10 }} onClick={saveCity}>Salvar cidade</button>
            {meta.city && <p style={{ color:"#22c55e", fontSize:13, marginTop:10 }}>Cidade salva: {meta.city}</p>}
            <hr style={{ borderColor:"#334155", margin:"14px 0" }}/>
            <p style={{ color:"#94a3b8", fontSize:13 }}>Total de dias de aula registrados: <b style={{ color:"#e2e8f0" }}>{(meta.classDays||[]).length}</b></p>
          </div>
          <div style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#f59e0b", marginBottom:8 }}>📖 Conteúdo da aula de hoje</h3>
            {todayContent
              ? <p style={{ color:"#22c55e", fontSize:16, fontWeight:600, lineHeight:1.5, margin:"4px 0 12px" }}>{todayContent}</p>
              : <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.6, margin:"4px 0 12px" }}>Ainda não gerado. Programe o exemplo do dia na aba <b>Meu código</b> e clique abaixo para criar um nome automático.</p>}
            <button style={{ ...styles.btn("#6366f1"), width:"100%", opacity:genName?0.6:1 }} onClick={generateContentName} disabled={genName}>{genName?"Gerando...":"✨ Gerar nome do conteúdo de hoje"}</button>
            {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#22c55e":"#f59e0b", fontSize:12, marginTop:10, lineHeight:1.5 }}>{nameMsg}</p>}
          </div>
        </div>
      )}

      {/* ─────────── FEEDBACK DOS ALUNOS ─────────── */}
      {tab==="feedback" && (
        <div style={{ padding:14, maxWidth:760, margin:"0 auto" }}>
          <div style={styles.card}>
            <h3 style={{ color:"#f59e0b", marginBottom:12 }}>💬 Feedback dos alunos sobre as aulas</h3>
            {feedbacks.length===0 ? <p style={{ color:"#475569", fontSize:13 }}>Nenhum aluno enviou feedback ainda. Eles podem avaliar ao terminar a aula.</p> : (
              feedbacks.map(s=>(
                <div key={s.name} style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:14, marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <Avatar cfg={s.avatar} size={30} />
                    <b>{s.name}</b>
                    <span style={{ color:"#f59e0b" }}>{"★".repeat(s.classFeedback.rating||0)}{"☆".repeat(5-(s.classFeedback.rating||0))}</span>
                    <span style={{ color:"#475569", fontSize:11, marginLeft:"auto" }}>{hhmm(s.classFeedback.at)}</span>
                  </div>
                  {(s.classFeedback.text||"").trim() ? <p style={{ color:"#cbd5e1", fontSize:14, lineHeight:1.6 }}>{s.classFeedback.text}</p> : <p style={{ color:"#475569", fontSize:13 }}>(sem comentário escrito)</p>}
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
                <div style={{ background:"#1e1e3a", border:"2px solid #f59e0b", borderRadius:16, padding:24, maxWidth:400, width:"100%" }}>
                  <div style={{ fontSize:40, textAlign:"center" }}>⚠️</div>
                  <h3 style={{ color:"#f59e0b", textAlign:"center", margin:"8px 0" }}>Encerrar a prova agora?</h3>
                  <p style={{ color:"#cbd5e1", fontSize:14, textAlign:"center", lineHeight:1.6 }}>Os alunos que ainda não terminaram terão a pontuação parcial registrada.</p>
                  <div style={{ display:"flex", gap:10, marginTop:18 }}>
                    <button onClick={()=>setConfirmEndExam(false)} style={{ ...styles.btn("#334155"), flex:1 }}>Cancelar</button>
                    <button onClick={endExam} style={{ ...styles.btn("#ef4444"), flex:1 }}>Encerrar</button>
                  </div>
                </div>
              </div>
            )}

            {/* estado: idle */}
            {examConfig.status === 'idle' && (
              <div style={styles.card}>
                <h3 style={{ color:"#f59e0b", marginBottom:4 }}>🏆 Criar Prova</h3>
                <p style={{ color:"#94a3b8", fontSize:13, marginBottom:14, lineHeight:1.6 }}>A IA gera automaticamente um resumo de revisão e 10 questões de múltipla escolha com base no código de hoje. Os alunos revisam, entram na sala e então você inicia.</p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                  <span style={{ color:"#94a3b8", fontSize:13, alignSelf:"center" }}>Turma:</span>
                  <button onClick={()=>setExamShift("all")} style={styles.tab(examShift==="all")}>Todas</button>
                  {SHIFTS.map(sh=>(
                    <button key={sh.id} onClick={()=>setExamShift(sh.id)} style={styles.tab(examShift===sh.id)}>{sh.emoji} {sh.label}</button>
                  ))}
                </div>
                <p style={{ color:"#94a3b8", fontSize:12, marginBottom:10 }}>As questões são geradas a partir do código que você escreveu na aba <b>Meu código</b>. Se não houver, usa o código dos alunos.</p>
                <button onClick={startExam} disabled={examGenerating} style={{ ...styles.btn("#6366f1"), opacity:examGenerating?0.6:1, padding:"12px 24px", fontSize:15 }}>
                  {examGenerating ? "Gerando..." : "🚀 Gerar e Iniciar Prova"}
                </button>
                {examMsg && <p style={{ color:examMsg.startsWith("✅")?"#22c55e":"#f59e0b", fontSize:13, marginTop:10, lineHeight:1.5 }}>{examMsg}</p>}
              </div>
            )}

            {/* estado: review */}
            {examConfig.status === 'review' && (
              <>
                <div style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <h3 style={{ color:"#f59e0b", margin:"0 0 4px" }}>📝 Fase de Revisão</h3>
                      <p style={{ color:"#94a3b8", fontSize:13 }}>Os alunos estão revisando o conteúdo. Quando estiverem prontos, iniciam a prova.</p>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={activateExam} style={{ ...styles.btn("#22c55e") }}>▶ Iniciar Agora ({readyStudents.length} prontos)</button>
                      <button onClick={resetExam} style={{ ...styles.btn("#475569"), fontSize:13 }}>Cancelar</button>
                    </div>
                  </div>
                  {examMsg && <p style={{ color:"#22c55e", fontSize:13, marginTop:10 }}>{examMsg}</p>}
                </div>
                <div style={styles.card}>
                  <h4 style={{ color:"#f59e0b", marginBottom:10 }}>Alunos prontos ({readyStudents.length}/{examStudents.length})</h4>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {examStudents.map(s=>(
                      <div key={s.name} style={{ display:"flex", alignItems:"center", gap:8, background:"#0f172a", border:`1px solid ${s.examReady?"#22c55e":"#334155"}`, borderRadius:10, padding:"8px 12px" }}>
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
                      <h3 style={{ color:"#f59e0b", margin:"0 0 4px" }}>🏆 Prova em andamento</h3>
                      <p style={{ color:"#94a3b8", fontSize:13 }}>{doneStudents.length}/{examStudents.length} alunos concluíram · {qLen} questões · {qLen*10} pts no máximo</p>
                    </div>
                    <button onClick={()=>setConfirmEndExam(true)} style={styles.btn("#ef4444")}>⏹ Encerrar Prova</button>
                  </div>
                  {examMsg && <p style={{ color:"#22c55e", fontSize:13, marginTop:8 }}>{examMsg}</p>}
                </div>
                <div style={styles.card}>
                  <h4 style={{ color:"#f59e0b", marginBottom:12 }}>📊 Ranking ao vivo</h4>
                  {ranking.length===0 ? <p style={{ color:"#475569", fontSize:13 }}>Aguardando alunos terminarem...</p> : (
                    ranking.map((s,i)=>(
                      <div key={s.name} style={{ display:"flex", alignItems:"center", gap:12, background:"#0f172a", border:`1px solid ${i===0?"#f59e0b":"#334155"}`, borderRadius:10, padding:"10px 14px", marginBottom:8 }}>
                        <span style={{ fontSize:22, width:28 }}>{medal(i)||`#${i+1}`}</span>
                        <Avatar cfg={s.avatar} size={28} />
                        <span style={{ flex:1, fontWeight:600 }}>{s.name}</span>
                        <span style={{ color:"#22c55e", fontWeight:700, fontSize:16 }}>{s.examScore} pts</span>
                        <span style={styles.badge(s.examDone?"#22c55e":"#f59e0b")}>{s.examDone?"Concluído":"Respondendo"}</span>
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
                      <h3 style={{ color:"#22c55e", margin:"0 0 4px" }}>✅ Prova Encerrada</h3>
                      <p style={{ color:"#94a3b8", fontSize:13 }}>Resultado final · {doneStudents.length}/{examStudents.length} alunos concluíram</p>
                    </div>
                    <button onClick={resetExam} style={styles.btn("#475569")}>🔄 Nova Prova</button>
                  </div>
                </div>
                <div style={styles.card}>
                  <h4 style={{ color:"#f59e0b", marginBottom:12 }}>🏆 Ranking Final</h4>
                  {ranking.length===0 ? <p style={{ color:"#475569", fontSize:13 }}>Nenhum aluno respondeu.</p> : (
                    ranking.map((s,i)=>(
                      <div key={s.name} style={{ display:"flex", alignItems:"center", gap:12, background:i===0?"#f59e0b22":"#0f172a", border:`2px solid ${i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#c2410c":"#334155"}`, borderRadius:12, padding:"12px 16px", marginBottom:8 }}>
                        <span style={{ fontSize:26, width:32 }}>{medal(i)||<span style={{color:"#475569",fontSize:16}}>#{i+1}</span>}</span>
                        <Avatar cfg={s.avatar} size={32} />
                        <span style={{ flex:1, fontWeight:700, fontSize:15 }}>{s.name}</span>
                        <span style={{ color:"#22c55e", fontWeight:800, fontSize:20 }}>{s.examScore ?? 0}</span>
                        <span style={{ color:"#94a3b8", fontSize:12 }}>/{qLen*10}</span>
                      </div>
                    ))
                  )}
                  {examStudents.filter(s=>!s.examDone && s.examScore==null).length > 0 && (
                    <div style={{ marginTop:12, padding:"10px 14px", background:"#1e293b", borderRadius:8 }}>
                      <p style={{ color:"#94a3b8", fontSize:12, marginBottom:6 }}>Não concluíram:</p>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {examStudents.filter(s=>!s.examDone && s.examScore==null).map(s=>(
                          <span key={s.name} style={{ background:"#334155", color:"#94a3b8", borderRadius:8, padding:"4px 10px", fontSize:12 }}>{s.name}</span>
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

  const TEACHER_PASS = "M1n3cr@ft2006";

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    const arr = await listStudents();
    setProfiles(arr.sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt-BR")));
    setLoadingProfiles(false);
  }, []);
  useEffect(() => { if (role==="student") loadProfiles(); }, [role, loadProfiles]);

  const enterStudent = (studentName, avatarCfg, shiftId) => { goFullscreen(); onJoin("student", studentName, avatarCfg, shiftId || "matutino"); };
  const handleNewStudent = () => { if(!name.trim()){ setError("Digite seu nome!"); return; } enterStudent(name.trim(), avatar, shift); };
  const handleTeacher = () => { if(password===TEACHER_PASS) onJoin("teacher","Professor"); else setError("Senha incorreta!"); };

  const styles = {
    container:{ minHeight:"100vh", background:"#0f0f1a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',sans-serif", padding:16 },
    card:{ background:"#1e1e3a", borderRadius:20, padding:32, width:440, maxWidth:"100%", border:"1px solid #334155", boxShadow:"0 20px 60px #00000066" },
    input:{ width:"100%", background:"#0f172a", border:"2px solid #334155", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontSize:15, outline:"none", boxSizing:"border-box" },
    btn:(c)=>({ background:c, color:"#fff", border:"none", borderRadius:10, padding:"12px 0", cursor:"pointer", fontWeight:700, fontSize:15, width:"100%" }),
    rBtn:()=>({ background:"transparent", color:"#94a3b8", border:`2px solid #334155`, borderRadius:10, padding:"14px 0", cursor:"pointer", fontWeight:700, fontSize:14, flex:1 }),
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:44 }}>🎓</div>
          <h1 style={{ color:"#6366f1", fontSize:24, marginTop:8 }}>Aula de C#</h1>
          <p style={{ color:"#475569", fontSize:13 }}>Plataforma de ensino de programação</p>
        </div>

        {!role&&(
          <>
            <p style={{ color:"#94a3b8", textAlign:"center", marginBottom:14 }}>Quem é você?</p>
            <div style={{ display:"flex", gap:10 }}>
              <button style={styles.rBtn()} onClick={()=>setRole("student")}>👤 Aluno</button>
              <button style={styles.rBtn()} onClick={()=>setRole("teacher")}>👨‍🏫 Professor</button>
            </div>
          </>
        )}

        {role==="student"&&(
          <>
            <p style={{ color:"#f59e0b", fontWeight:600, marginBottom:10 }}>👤 Entrar como Aluno</p>

            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ color:"#94a3b8", fontSize:13 }}>Já tem um perfil? Toque no seu nome:</span>
                <button onClick={loadProfiles} style={{ background:"transparent", border:"none", color:"#6366f1", cursor:"pointer", fontSize:12 }}>↻ atualizar</button>
              </div>
              {loadingProfiles ? <p style={{ color:"#475569", fontSize:13 }}>Procurando perfis salvos...</p>
                : profiles.length===0 ? <p style={{ color:"#475569", fontSize:13 }}>Nenhum perfil salvo ainda. Crie o seu abaixo 👇</p>
                : (
                  <div style={{ maxHeight:170, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
                    {profiles.map(p=>(
                      <button key={`${p.shift||"x"}:${p.name}`} onClick={()=>enterStudent(p.name, p.avatar, p.shift)} style={{ display:"flex", alignItems:"center", gap:10, background:"#0f172a", border:"2px solid #334155", borderRadius:10, padding:"8px 12px", cursor:"pointer", color:"#e2e8f0", textAlign:"left" }}>
                        <Avatar cfg={p.avatar} size={32} />
                        <span style={{ fontWeight:600, flex:1 }}>{p.name}{p.shift?<span style={{ color:"#94a3b8", fontWeight:500, fontSize:12, marginLeft:8 }}>{shiftMeta(p.shift).emoji} {shiftMeta(p.shift).label}</span>:null}</span>
                        <span style={{ color:"#6366f1", fontSize:13, fontWeight:700 }}>Entrar →</span>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:10, margin:"6px 0 14px" }}>
              <div style={{ flex:1, height:1, background:"#334155" }}/>
              <span style={{ color:"#475569", fontSize:12 }}>ou crie um novo perfil</span>
              <div style={{ flex:1, height:1, background:"#334155" }}/>
            </div>

            <input style={styles.input} placeholder="Seu nome completo" value={name} onChange={e=>setName(e.target.value)} />
            <p style={{ color:"#94a3b8", fontSize:13, margin:"14px 0 8px" }}>🕑 Qual é a sua turma?</p>
            <div style={{ display:"flex", gap:10 }}>
              {SHIFTS.map(sh => (
                <button key={sh.id} onClick={()=>setShift(sh.id)}
                  style={{ ...styles.rBtn(), ...(shift===sh.id ? { borderColor:"#6366f1", color:"#fff", background:"#6366f122" } : {}) }}>
                  {sh.emoji} {sh.label}
                </button>
              ))}
            </div>
            <p style={{ color:"#94a3b8", fontSize:13, margin:"14px 0 8px" }}>🎨 Monte seu boneco:</p>
            <AvatarBuilder value={avatar} onChange={setAvatar} />
            {error&&<p style={{ color:"#ef4444", fontSize:13, marginTop:8 }}>{error}</p>}
            <div style={{ display:"flex", gap:8, marginTop:16 }}>
              <button style={{ ...styles.btn("#6366f1"), flex:1 }} onClick={handleNewStudent}>Criar perfil e entrar →</button>
              <button style={{ ...styles.btn("#334155"), width:44, flex:"none" }} onClick={()=>{ setRole(null); setError(""); }}>↩</button>
            </div>
          </>
        )}

        {role==="teacher"&&(
          <>
            <p style={{ color:"#f59e0b", fontWeight:600, marginBottom:10 }}>👨‍🏫 Entrar como Professor</p>
            <input style={styles.input} type="password" placeholder="Senha do professor" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleTeacher()} />
            {error&&<p style={{ color:"#ef4444", fontSize:13, marginTop:6 }}>{error}</p>}
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button style={{ ...styles.btn("#f59e0b"), flex:1 }} onClick={handleTeacher}>Entrar →</button>
              <button style={{ ...styles.btn("#334155"), width:44, flex:"none" }} onClick={()=>{ setRole(null); setError(""); }}>↩</button>
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
  if (!session) return <Login onJoin={(role,name,avatar,shift)=>setSession({role,name,avatar,shift})} />;
  if (session.role==="teacher") return <TeacherView onLogout={()=>setSession(null)} />;
  return <StudentView studentName={session.name} initialAvatar={session.avatar} shift={session.shift||"matutino"} onLogout={()=>setSession(null)} />;
}
