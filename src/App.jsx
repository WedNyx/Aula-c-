import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { lorelei } from "@dicebear/collection";
import { saveStudent, getStudent, setNudge, getNudge, listStudents, checkReset, resetAll, getTeacherMeta, saveTeacherMeta, saveTeacherCode, getTeacherCode, diagnose, getExamState, setExamState } from "./storage.js";

// ── tema ──
const FONT = "'Nunito','Segoe UI',system-ui,sans-serif";
const PAGE_BG = "radial-gradient(1000px 620px at 85% -10%, rgba(124,131,255,.16), transparent 60%), radial-gradient(900px 600px at -10% 110%, rgba(34,211,238,.09), transparent 55%), linear-gradient(180deg,#0a0c18 0%,#0c0f20 100%)";

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
      <span style={{ color:"#96a0cc", fontSize:13 }}>{info.desc}</span>
    </div>
  );
}
// ── NYX: o robô assistente da turma (SVG + animações CSS) ──
let __nyxSeq = 0;
function NyxRobot({ state = "idle", size = 100, showName = true }) {
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

          {/* antena */}
          <line x1="60" y1="22" x2="60" y2="9" stroke={P.dark} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="60" cy="7" r="7" fill={P.main} opacity="0.25" />
          <circle cx="60" cy="7" r="4" fill={P.eye} style={{ animation:`nyx-antenna ${antennaSpeed} ease-in-out infinite` }} />

          {/* orelhas */}
          <rect x="21" y="34" width="9" height="16" rx="4.5" fill={P.dark} />
          <rect x="90" y="34" width="9" height="16" rx="4.5" fill={P.dark} />

          {/* cabeça */}
          <rect x="28" y="20" width="64" height="44" rx="17" fill={`url(#${uid}h)`} />
          <rect x="28" y="20" width="64" height="20" rx="17" fill="#ffffff" opacity="0.12" />

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

          {/* pescoço */}
          <rect x="53" y="62" width="14" height="8" rx="3" fill={P.dark} />

          {/* braços */}
          <rect x="26" y="74" width="10" height="24" rx="5" fill={P.dark} transform={state==="ok" ? "rotate(-38 31 76)" : "rotate(8 31 76)"} style={{ transition:"transform .3s" }} />
          <rect x="84" y="74" width="10" height="24" rx="5" fill={P.dark} transform={state==="ok" ? "rotate(38 89 76)" : "rotate(-8 89 76)"} style={{ transition:"transform .3s" }} />

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
const DEFAULT_AVATAR = { bg:"#7c83ff", skin:"#ffd6c0", hair:"#2b2b2b", hairV:"variant11", eyesV:"variant09", mouthV:"happy05", glassesV:"", earringsV:"", flores:false, freckles:false, pet:"" };

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

function Avatar({ cfg, size=72 }) {
  const c = normalizeAvatar(cfg);
  const key = JSON.stringify(c);
  const uri = useMemo(() => "data:image/svg+xml;utf8," + encodeURIComponent(loreleiSvg(c)), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="avatar-pop" style={{ position:"relative", width:size, height:size, display:"inline-block", lineHeight:0, flexShrink:0 }}>
      <div style={{ width:size, height:size, borderRadius:"50%", overflow:"hidden", background:`radial-gradient(circle at 50% 30%, ${shade(c.bg,0.25)}, ${c.bg} 58%, ${shade(c.bg,-0.25)})`, boxShadow:"0 2px 5px rgba(0,0,0,.4), inset 0 0 0 2px rgba(255,255,255,.14)" }}>
        <img src={uri} width={size} height={size} alt="" draggable={false} style={{ display:"block" }} />
      </div>
      {c.pet && (
        <span style={{ position:"absolute", right:-1, bottom:-1, fontSize:Math.max(11, Math.round(size*0.44)), lineHeight:1, filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.6))", pointerEvents:"none" }}>{c.pet}</span>
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
          setRobotMsg("🔑 Nyx está offline: o professor precisa configurar a chave ANTHROPIC_API_KEY no painel do Vercel. A verificação básica do código continua funcionando!");
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
    container:{ minHeight:"100vh", background:PAGE_BG, color:"#e8ebfa", fontFamily:FONT },
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

  // ── PROVA: telas de exame têm prioridade ──
  if (examDone) return (
    <div style={styles.container}>
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
        <div style={styles.header}><span>📝 Atividade — {studentName}</span></div>
        <div style={{ maxWidth:640, margin:"0 auto", padding:24 }}>
          <h2 style={{ color:"#7c83ff" }}>Atividade da Aula</h2>
          <p style={{ color:"#96a0cc", fontSize:13, marginBottom:16 }}>Baseada no código que você escreveu hoje!</p>
          {activity.map((q,i)=>(
            <div key={i} style={styles.card}>
              <p style={{ fontWeight:600, marginBottom:12 }}>{i+1}. {q.q}</p>
              {q.opts.map((opt,j)=>(<button key={j} style={styles.opt(answers[i]===j)} onClick={()=>setAnswers(a=>({...a,[i]:j}))}>{opt}</button>))}
            </div>
          ))}
          <div style={{ textAlign:"right" }}>
            <button style={styles.btn("#7c83ff")} onClick={handleSubmitActivity} disabled={Object.keys(answers).length<activity.length}>Enviar Atividade →</button>
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
          <h2 style={{ color:"#7c83ff", fontSize:26 }}>Você fez {score} pontos!</h2>

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
          <span style={{ fontWeight:900, fontSize:17, background:"linear-gradient(135deg,#7c83ff,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>💻 Aula C#</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12, color: connected===false?"#f87171":connected?"#34d399":"#96a0cc" }}>
            {connected===null ? "● conectando..." : connected ? "● conectado" : "● sem conexão"}
          </span>
          <span style={{ background:"#7c83ff22", padding:"4px 12px", borderRadius:20, fontSize:13 }}>👤 {studentName}</span>
          <span style={{ background:"#0d1122", border:"1px solid #2a3154", padding:"4px 10px", borderRadius:20, fontSize:12, color:"#96a0cc" }}>{shiftLabel(shift)}</span>
          <button style={{ ...styles.btn("#2a3154"), padding:"6px 12px", fontSize:12 }} onClick={tryFullscreen}>⛶ Tela cheia</button>
          <button style={{ ...styles.btn("#f87171"), padding:"6px 12px", fontSize:12 }} onClick={onLogout}>Sair</button>
        </div>
      </div>

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
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
            {files.map((f,i)=>(
              <div key={i} onClick={()=>setActive(i)} style={{ display:"flex", alignItems:"center", gap:6, background:i===active?"#1e1e1e":"#101425", border:`1px solid ${i===active?"#7c83ff":"#2a3154"}`, color:i===active?"#fff":"#96a0cc", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>
                <span>📄 {f.name}</span>
                <span onClick={(e)=>{e.stopPropagation();openRename(i);}} title="Renomear" style={{ color:"#7c83ff", fontWeight:700 }}>✎</span>
                {files.length>1 && <span onClick={(e)=>{e.stopPropagation();deleteFile(i);}} title="Apagar" style={{ color:"#f87171", fontWeight:700 }}>✕</span>}
              </div>
            ))}
            <button onClick={addFile} style={{ background:"#0d1122", border:"1px dashed #7c83ff", color:"#7c83ff", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>＋ Novo arquivo</button>
          </div>

          <VSEditor value={activeCode} onChange={updateActiveCode} filename={files[active]?.name} />

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8, flexWrap:"wrap", gap:8 }}>
            <span style={{ color: saveWarn ? "#fbbf24" : "#5d679c", fontSize:12 }}>{saveWarn || (analyzing?"🔍 Verificando...":"✨ Nyx confere seu código 2s depois que você para de escrever")}</span>
            <button style={styles.btn("#34d399")} onClick={handleSave}>💾 Salvar e Finalizar Aula</button>
          </div>

          {/* Terminal */}
          <div style={{ background:"#0a0a0a", border:"1px solid #333", borderRadius:8, marginTop:12, overflow:"hidden" }}>
            <div style={{ background:"#161616", padding:"6px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #333" }}>
              <span style={{ color:"#bbb", fontSize:13 }}>⌨️ Terminal <span style={{ color:"#666" }}>(simulado)</span></span>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>setShowStdin(s=>!s)} style={{ background:"#222", border:"1px solid #444", color:"#bbb", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>entrada</button>
                <button onClick={()=>setTerminalOut("")} style={{ background:"#222", border:"1px solid #444", color:"#bbb", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>limpar</button>
                <button onClick={runCode} disabled={running} style={{ background:"#34d399", border:"none", color:"#fff", borderRadius:6, padding:"3px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>{running?"executando...":"▶ dotnet run"}</button>
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
            <NyxRobot state={robotState} size={88} />
            {robotMsg&&(<div style={{ background:robotState==="error"?"#f8717111":"#34d39911", border:`1px solid ${robotState==="error"?"#f87171":"#34d399"}`, borderRadius:8, padding:12, marginTop:10, fontSize:13, lineHeight:1.6 }}>{robotMsg}</div>)}
            {keysToShow.length>0&&(<div style={{ marginTop:10 }}><p style={{ color:"#fbbf24", fontSize:12, fontWeight:600, marginBottom:4 }}>Teclas para usar:</p>{keysToShow.map((k,i)=><KeyVisual key={i} char={k}/>)}</div>)}
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
        if (e.message === 'ROBOTKEY_MISSING') { setRobotState("error"); setRobotMsg("🔑 Nyx está offline: configure ANTHROPIC_API_KEY no Vercel."); }
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
          <span style={{ color:"#5d679c", fontSize:12 }}>{analyzing?"🔍 Verificando...":"✨ Nyx confere seu código 2s depois que você para de escrever"}</span>
        </div>

        <div style={{ background:"#0a0a0a", border:"1px solid #333", borderRadius:8, marginTop:12, overflow:"hidden" }}>
          <div style={{ background:"#161616", padding:"6px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #333" }}>
            <span style={{ color:"#bbb", fontSize:13 }}>⌨️ Terminal <span style={{ color:"#666" }}>(simulado)</span></span>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>setShowStdin(s=>!s)} style={{ background:"#222", border:"1px solid #444", color:"#bbb", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>entrada</button>
              <button onClick={()=>setTerminalOut("")} style={{ background:"#222", border:"1px solid #444", color:"#bbb", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>limpar</button>
              <button onClick={runCode} disabled={running} style={{ background:"#34d399", border:"none", color:"#fff", borderRadius:6, padding:"3px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>{running?"executando...":"▶ dotnet run"}</button>
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
  const [dbSetupMsg, setDbSetupMsg] = useState("");
  const [dbSetupLoading, setDbSetupLoading] = useState(false);
  const [dbSetupSQL, setDbSetupSQL] = useState(null); // { sql, sqlEditorUrl }

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

  const now = Date.now();
  const tk = todayKey();
  const isOnline = (s) => s.lastSeen && (now - s.lastSeen) < 9000;
  const phaseLabel = p => ({coding:"Codando",generating:"Gerando",summary:"No Resumo",activity:"Na Atividade",done:"Concluído"})[p]||"Aguardando";
  const phaseColor = p => ({coding:"#7c83ff",generating:"#fbbf24",summary:"#fbbf24",activity:"#3b82f6",done:"#34d399"})[p]||"#96a0cc";
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
          <span style={{ color:"#96a0cc", marginLeft:12, fontSize:12 }}>● ao vivo · {lastUpdate}{meta.city?` · 📍 ${meta.city}`:""}{todayContent?` · 📖 ${todayContent}`:""}</span>
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
                        <span style={styles.badge(phaseColor(s.phase))}>{phaseLabel(s.phase)}</span>
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
                        1. Acesse <b style={{color:"#e8ebfa"}}>console.anthropic.com</b><br/>
                        2. API Keys → <b style={{color:"#e8ebfa"}}>Create Key</b><br/>
                        3. No Vercel: Settings → Environment Variables<br/>
                        4. Adicione <code style={{color:"#60a5fa"}}>ANTHROPIC_API_KEY</code> = sua chave → Redeploy
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
              {todayContent
                ? <p style={{ color:"#34d399", fontSize:14, fontWeight:600, lineHeight:1.5 }}>{todayContent}</p>
                : <p style={{ color:"#96a0cc", fontSize:13, lineHeight:1.5 }}>Programe o exemplo do dia na aba <b>Meu código</b> e gere um nome automático para a aula. (Se ainda não programou, uso o código dos alunos.)</p>}
              <button style={{ ...styles.btn("#7c83ff"), padding:"6px 12px", fontSize:13, marginTop:8, width:"100%", opacity:genName?0.6:1 }} onClick={generateContentName} disabled={genName}>{genName?"Gerando...":"✨ Gerar nome do conteúdo"}</button>
              {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:12, marginTop:8, lineHeight:1.5 }}>{nameMsg}</p>}
            </div>
          </div>

          {/* direita */}
          <div style={{ flex:"1 1 420px", minWidth:300 }}>
            {/* Chamada */}
            <div style={styles.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                <h3 style={{ color:"#fbbf24" }}>📋 Lista de Chamada</h3>
                <span style={styles.badge("#34d399")}>{present} online / {shown.length}</span>
              </div>
              {shown.length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>Nenhum aluno na chamada ainda.</p> : (
                <>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                    <span style={styles.badge("#34d399")}>✅ {presentList.length} presente{presentList.length!==1?"s":""}</span>
                    <span style={styles.badge("#fbbf24")}>⚠ {idleList.length} sem atividade</span>
                    <span style={styles.badge("#f87171")}>❌ {absentList.length} falta{absentList.length!==1?"s":""}</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:8 }}>
                    {sorted.map(s=>{
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
                    <span style={styles.badge(phaseColor(sel.phase))}>{phaseLabel(sel.phase)}</span>
                    {sel.score!=null && <span style={styles.badge("#34d399")}>🏆 {sel.score} pts</span>}
                    {(() => { const d=difficultyOf(sel); return <span style={styles.badge(d.level==="dif"?"#f87171":"#34d399")}>{d.level==="dif"?"⚠ "+d.text:"✅ "+d.text}</span>; })()}
                  </div>
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
                        <span style={styles.badge(sel.answers[i]===q.correct?"#34d399":"#f87171")}>{sel.answers[i]===q.correct?"✅ Correto":`❌ Errado — correto: ${q.opts[q.correct]}`}</span>
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
                <p style={{ color:"#96a0cc", fontSize:13, margin:"4px 0 0", lineHeight:1.5 }}>Programe aqui o exemplo de hoje. Quando terminar, gere o nome do conteúdo a partir dele — é isso que aparece no calendário.</p>
              </div>
              <button style={{ ...styles.btn("#7c83ff"), opacity:genName?0.6:1 }} onClick={generateContentName} disabled={genName}>{genName?"Gerando...":"✨ Gerar nome do conteúdo de hoje"}</button>
            </div>
            {todayContent && <p style={{ color:"#34d399", fontSize:14, fontWeight:600, margin:"10px 0 0" }}>📖 Conteúdo de hoje: {todayContent}</p>}
            {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:13, margin:"10px 0 0", lineHeight:1.5 }}>{nameMsg}</p>}
          </div>
          <CodeLab accent="#fbbf24" files={proFiles} onChange={setProFiles} />
        </div>
      )}

      {/* ─────────── CALENDÁRIO ─────────── */}
      {tab==="calendar" && (
        <div style={{ display:"flex", gap:14, padding:14, maxWidth:900, margin:"0 auto", alignItems:"flex-start", flexWrap:"wrap" }}>
          <div style={{ ...styles.card, flex:"1 1 380px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:12 }}>🗓️ Calendário de aulas</h3>
            <p style={{ color:"#96a0cc", fontSize:13, marginBottom:12 }}>Os dias com aula ficam em verde (são marcados sozinhos quando há alunos online, e você também pode clicar para marcar/desmarcar). O 📖 indica os dias que já têm um nome de conteúdo gerado — passe o mouse para ver o tema.</p>
            <Calendar classDays={meta.classDays||[]} contentNames={meta.contentNames||{}} onToggle={toggleClassDay} />
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
            <h3 style={{ color:"#fbbf24", marginBottom:8 }}>📖 Conteúdo da aula de hoje</h3>
            {todayContent
              ? <p style={{ color:"#34d399", fontSize:16, fontWeight:600, lineHeight:1.5, margin:"4px 0 12px" }}>{todayContent}</p>
              : <p style={{ color:"#96a0cc", fontSize:13, lineHeight:1.6, margin:"4px 0 12px" }}>Ainda não gerado. Programe o exemplo do dia na aba <b>Meu código</b> e clique abaixo para criar um nome automático.</p>}
            <button style={{ ...styles.btn("#7c83ff"), width:"100%", opacity:genName?0.6:1 }} onClick={generateContentName} disabled={genName}>{genName?"Gerando...":"✨ Gerar nome do conteúdo de hoje"}</button>
            {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:12, marginTop:10, lineHeight:1.5 }}>{nameMsg}</p>}
          </div>
        </div>
      )}

      {/* ─────────── FEEDBACK DOS ALUNOS ─────────── */}
      {tab==="feedback" && (
        <div style={{ padding:14, maxWidth:760, margin:"0 auto" }}>
          <div style={styles.card}>
            <h3 style={{ color:"#fbbf24", marginBottom:12 }}>💬 Feedback dos alunos sobre as aulas</h3>
            {feedbacks.length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>Nenhum aluno enviou feedback ainda. Eles podem avaliar ao terminar a aula.</p> : (
              feedbacks.map(s=>(
                <div key={s.name} style={{ background:"#0d1122", border:"1px solid #2a3154", borderRadius:10, padding:14, marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <Avatar cfg={s.avatar} size={30} />
                    <b>{s.name}</b>
                    <span style={{ color:"#fbbf24" }}>{"★".repeat(s.classFeedback.rating||0)}{"☆".repeat(5-(s.classFeedback.rating||0))}</span>
                    <span style={{ color:"#5d679c", fontSize:11, marginLeft:"auto" }}>{hhmm(s.classFeedback.at)}</span>
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

            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ color:"#96a0cc", fontSize:13 }}>Já tem um perfil? Toque no seu nome:</span>
                <button onClick={loadProfiles} style={{ background:"transparent", border:"none", color:"#7c83ff", cursor:"pointer", fontSize:12 }}>↻ atualizar</button>
              </div>
              {loadingProfiles ? <p style={{ color:"#5d679c", fontSize:13 }}>Procurando perfis salvos...</p>
                : profiles.length===0 ? <p style={{ color:"#5d679c", fontSize:13 }}>Nenhum perfil salvo ainda. Crie o seu abaixo 👇</p>
                : (
                  <div style={{ maxHeight:170, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
                    {profiles.map(p=>(
                      <button key={`${p.shift||"x"}:${p.name}`} onClick={()=>enterStudent(p.name, p.avatar, p.shift)} style={{ display:"flex", alignItems:"center", gap:10, background:"#0d1122", border:"2px solid #2a3154", borderRadius:10, padding:"8px 12px", cursor:"pointer", color:"#e8ebfa", textAlign:"left" }}>
                        <Avatar cfg={p.avatar} size={32} />
                        <span style={{ fontWeight:600, flex:1 }}>{p.name}{p.shift?<span style={{ color:"#96a0cc", fontWeight:500, fontSize:12, marginLeft:8 }}>{shiftMeta(p.shift).emoji} {shiftMeta(p.shift).label}</span>:null}</span>
                        <span style={{ color:"#7c83ff", fontSize:13, fontWeight:700 }}>Entrar →</span>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:10, margin:"6px 0 14px" }}>
              <div style={{ flex:1, height:1, background:"#2a3154" }}/>
              <span style={{ color:"#5d679c", fontSize:12 }}>ou crie um novo perfil</span>
              <div style={{ flex:1, height:1, background:"#2a3154" }}/>
            </div>

            <input style={styles.input} placeholder="Seu nome completo" value={name} onChange={e=>setName(e.target.value)} />
            <p style={{ color:"#96a0cc", fontSize:13, margin:"14px 0 8px" }}>🕑 Qual é a sua turma?</p>
            <div style={{ display:"flex", gap:10 }}>
              {SHIFTS.map(sh => (
                <button key={sh.id} onClick={()=>setShift(sh.id)}
                  style={{ ...styles.rBtn(), ...(shift===sh.id ? { borderColor:"#7c83ff", color:"#fff", background:"#7c83ff22" } : {}) }}>
                  {sh.emoji} {sh.label}
                </button>
              ))}
            </div>
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
  if (!session) return <Login onJoin={(role,name,avatar,shift)=>setSession({role,name,avatar,shift})} />;
  if (session.role==="teacher") return <TeacherView onLogout={()=>setSession(null)} />;
  return <StudentView studentName={session.name} initialAvatar={session.avatar} shift={session.shift||"matutino"} onLogout={()=>setSession(null)} />;
}
