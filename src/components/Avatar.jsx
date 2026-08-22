import { useState, useEffect, useMemo, useRef } from "react";
import { createAvatar } from "@dicebear/core";
import { bigSmile } from "@dicebear/collection";
import { shade } from "../lib/colors.ts";

// ════════════════════════════════════════════════════════════════════════════
//  AVATAR (boneco personalizável)
// ════════════════════════════════════════════════════════════════════════════

export const AVATAR_OPTS = {
  bg:   ["#c084fc","#34d399","#fbbf24","#f87171","#06b6d4","#ec4899","#8b5cf6","#3b82f6","#14b8a6","#0ea5e9","#f43f5e","#64748b"],
  skin: ["#ffe0bd","#ffd6c0","#f1c27d","#e0ac69","#c68642","#a86b3c","#8d5524","#5c3a21"],
  hair: ["#2b2b2b","#3b2417","#6b3e26","#a0522d","#c2410c","#d9a441","#f0d58c","#cbd5e1","#ec4899","#a855f7","#3b82f6","#06b6d4","#34d399","#f87171"],
  hairV: [
    ["shortHair","Curto"],["shavedHead","Raspado"],["halfShavedHead","Meio raspado"],["mohawk","Moicano"],
    ["curlyShortHair","Cacheado curto"],["curlyBob","Cacheado"],["bangs","Franjinha"],["straightHair","Liso"],
    ["wavyBob","Ondulado"],["bowlCutHair","Bob reto"],["braids","Tranças"],["bunHair","Coque"],["froBun","Coque afro"],
  ],
  eyesV: [["cheery","Alegres"],["normal","Normais"],["confused","Confusos"],["starstruck","Encantados"],["winking","Piscando"],["sleepy","Sonolentos"],["angry","Bravo"]],
  mouthV: [["openedSmile","Sorriso"],["teethSmile","Sorrisão"],["gapSmile","Banguela"],["awkwardSmile","Tímido"],["kawaii","Fofo"],["braces","Aparelho"],["unimpressed","Sem graça"]],
  glassesV: [["","Nenhum"],["glasses","Óculos"],["sunglasses","Óculos de sol"],["catEars","Orelhas de gato"],["sailormoonCrown","Coroa"],["clownNose","Nariz de palhaço"],["mustache","Bigode"],["faceMask","Máscara"],["sleepMask","Máscara de dormir"]],
  pet: [
    { e:"", label:"Nenhum" },
    { e:"🐉", label:"Dragão" },
    { e:"🦄", label:"Unicórnio" },
    { e:"🦖", label:"T-Rex" },
    { e:"🦅", label:"Águia" },
    { e:"🦉", label:"Coruja" },
    { e:"🐺", label:"Lobo" },
    { e:"🦊", label:"Raposa" },
    { e:"🐱", label:"Gato" },
    { e:"🐶", label:"Cachorro" },
    { e:"🐰", label:"Coelho" },
    { e:"🦁", label:"Leão" },
    { e:"🐢", label:"Tartaruga" },
    { e:"🐝", label:"Abelha" },
    { e:"🦋", label:"Borboleta" },
    { e:"✨", label:"Vagalume" },
    { e:"🍄", label:"Cogumelo" },
  ],
};
export const DEFAULT_AVATAR = { bg:"#c084fc", skin:"#ffd6c0", hair:"#2b2b2b", hairV:"shortHair", eyesV:"cheery", mouthV:"openedSmile", glassesV:"", pet:"", roupa:"" };

// ── roupas e acessórios do avatar (escolhidos na criação do perfil) ──
export const ROUPA_ITEMS = [
  { id:"",         label:"Nenhuma" },
  { id:"camiseta", label:"Camiseta",         cor:"#3b82f6" },
  { id:"moletom",  label:"Moletom c/ capuz", cor:"#22c55e" },
  { id:"jaqueta",  label:"Jaqueta",          cor:"#ef4444" },
  { id:"camisa",   label:"Camisa",           cor:"#a855f7" },
  { id:"regata",   label:"Regata",           cor:"#facc15" },
  { id:"casaco",   label:"Casaco",           cor:"#ec4899" },
];

// compatibilidade: converte perfis salvos no formato antigo para o novo estilo (Big Smile)
export const OLD_HAIR_MAP = { curto:"shortHair", longo:"straightHair", espetado:"mohawk", cacheado:"curlyShortHair", afro:"froBun", moicano:"mohawk", coque:"bunHair", rabo:"braids", chanel:"wavyBob", topete:"bangs", careca:"shavedHead" };
// perfis criados na semana do Adventurer (hairV tipo "shortNN"/"longNN") e na semana do
// Notionists (hairV tipo "variantNN"/"hat") usam formatos que não existem no Big Smile — detecta
// pelo padrão do hairV e converte pro equivalente mais parecido, resetando olhos/boca/acessório
// pro padrão (as faixas de variantes de cada estilo não batem, um valor antigo pode não existir mais)
export const ADVENTURER_HAIR_MAP = { short01:"shortHair", short02:"mohawk", short03:"curlyShortHair", short06:"shavedHead", short10:"bangs", short14:"shortHair", short16:"mohawk", long03:"froBun", long07:"straightHair", long09:"straightHair", long10:"froBun", long11:"curlyBob", long12:"wavyBob", long13:"bunHair", long15:"braids", long17:"bangs", long24:"braids" };
export const NOTIONISTS_HAIR_MAP = { variant01:"shortHair", variant04:"shortHair", variant06:"shortHair", variant18:"shavedHead", variant19:"curlyShortHair", variant35:"froBun", variant08:"straightHair", variant11:"wavyBob", variant22:"straightHair", variant28:"wavyBob", variant37:"curlyBob", variant42:"bowlCutHair", variant45:"braids", variant47:"braids", variant50:"mohawk", variant57:"bunHair", variant59:"froBun", hat:"shortHair" };
export function normalizeAvatar(cfg) {
  const c = { ...DEFAULT_AVATAR, ...(cfg||{}) };
  // o dragãozinho 🐲 virou T-Rex 🦖 quando os pets ganharam a arte animada (a biblioteca do
  // Google não tem dragão pequeno) — perfis antigos passam a mostrar o T-Rex sem precisar reeditar
  if (c.pet === "🐲") c.pet = "🦖";
  const legacyMap = /^(short|long)\d+$/.test(c.hairV) ? ADVENTURER_HAIR_MAP : /^(variant\d+|hat)$/.test(c.hairV) ? NOTIONISTS_HAIR_MAP : null;
  if (legacyMap) {
    c.hairV = legacyMap[c.hairV] || DEFAULT_AVATAR.hairV;
    c.eyesV = DEFAULT_AVATAR.eyesV;
    c.mouthV = DEFAULT_AVATAR.mouthV;
    c.glassesV = "";
  }
  if (cfg && cfg.hairStyle && !cfg.hairV) {
    c.hairV = OLD_HAIR_MAP[cfg.hairStyle] || DEFAULT_AVATAR.hairV;
    if (cfg.eyewear === "oculos") c.glassesV = "glasses";
    if (cfg.eyewear === "oculos_sol") c.glassesV = "sunglasses";
  }
  return c;
}

const hx = (h) => String(h||"").replace("#","");

// gera o rosto no estilo bem sorridente e colorido (Big Smile, por Pablo Stanley — CC0, via DiceBear)
export function avatarSvg(c) {
  return createAvatar(bigSmile, {
    seed: "aluno",
    hair: [c.hairV], hairColor: [hx(c.hair)],
    skinColor: [hx(c.skin)],
    eyes: [c.eyesV],
    mouth: [c.mouthV],
    accessories: c.glassesV ? [c.glassesV] : ["glasses"], accessoriesProbability: c.glassesV ? 100 : 0,
  }).toString();
}

// desenhos das roupas sobre o avatar (viewBox 0 0 100 100; tronco na base do círculo)
// estilo combinando com o traço do personagem: contorno escuro grosso + sombra + brilho
export const ROUPA_OUT = "#16162a"; // cor do contorno, igual ao traço do boneco
export function RoupaSvg({ tipo, cor }) {
  const dark = shade(cor, -0.32), light = shade(cor, 0.35);
  // o Big Smile é uma cabeça enorme sem pescoço (cobre quase o círculo inteiro), então a roupa
  // vira só uma golinha baixa espiando embaixo do queixo — nada de ombros subindo pelos lados
  const torso = "M 12 100 Q 12 92 30 89 Q 40 87 50 87 Q 60 87 70 89 Q 88 92 88 100 Z";
  const base = <path d={torso} fill={cor} stroke={ROUPA_OUT} strokeWidth="2.2" strokeLinejoin="round" />;
  const brilho = <path d="M 18 96 Q 20 91.5 27 89.5" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.4" strokeLinecap="round" />;
  if (tipo === "camiseta") return (
    <g>{base}
      <path d="M 43 87.5 Q 50 91.5 57 87.5" fill="none" stroke={ROUPA_OUT} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 44 87.2 Q 50 90 56 87.2" fill="none" stroke={dark} strokeWidth="1.1" strokeLinecap="round" />
      {brilho}
    </g>
  );
  if (tipo === "moletom") return (
    <g>
      <path d="M 15 100 Q 14 88 30 85.5 Q 40 84 50 84 Q 60 84 70 85.5 Q 86 88 85 100 Z" fill={dark} stroke={ROUPA_OUT} strokeWidth="2.2" strokeLinejoin="round" />
      {base}
      <path d="M 40 88.5 Q 39.5 93 39 97" stroke={light} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M 60 88.5 Q 60.5 93 61 97" stroke={light} strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </g>
  );
  if (tipo === "jaqueta") return (
    <g>{base}
      <line x1="50" y1="88" x2="50" y2="100" stroke={ROUPA_OUT} strokeWidth="1.6" />
      <path d="M 45 87.5 L 50 92.5 L 49.7 87 Z" fill={dark} stroke={ROUPA_OUT} strokeWidth="1" strokeLinejoin="round" />
      <path d="M 55 87.5 L 50 92.5 L 50.3 87 Z" fill={dark} stroke={ROUPA_OUT} strokeWidth="1" strokeLinejoin="round" />
      {brilho}
    </g>
  );
  if (tipo === "camisa") return (
    <g>{base}
      <path d="M 45.5 88 Q 45.2 94 45.2 100 M 54.5 88 Q 54.8 94 54.8 100" fill="none" stroke={dark} strokeWidth="0.9" />
      <path d="M 45 87.3 L 50 91 L 47 86.8 Z" fill="#f6f7fb" stroke={ROUPA_OUT} strokeWidth="1" strokeLinejoin="round" />
      <path d="M 55 87.3 L 50 91 L 53 86.8 Z" fill="#f6f7fb" stroke={ROUPA_OUT} strokeWidth="1" strokeLinejoin="round" />
      <circle cx="50" cy="94" r="0.9" fill="#f6f7fb" stroke={ROUPA_OUT} strokeWidth="0.5" />
      <circle cx="50" cy="98" r="0.9" fill="#f6f7fb" stroke={ROUPA_OUT} strokeWidth="0.5" />
      {brilho}
    </g>
  );
  if (tipo === "regata") return (
    <g>
      <path d="M 18 100 Q 17 91 24 88 L 30 86.5 Q 40 90.5 50 90.5 Q 60 90.5 70 86.5 L 76 88 Q 83 91 82 100 Z" fill={cor} stroke={ROUPA_OUT} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M 43 89 Q 50 92 57 89" fill="none" stroke={dark} strokeWidth="1" strokeLinecap="round" />
      {brilho}
    </g>
  );
  if (tipo === "casaco") return (
    <g>{base}
      <path d="M 44 87.3 Q 46 92 46.3 100 L 42.5 100 Q 41.5 92.5 44 87.3 Z" fill={dark} stroke={ROUPA_OUT} strokeWidth="1" strokeLinejoin="round" />
      <path d="M 56 87.3 Q 54 92 53.7 100 L 57.5 100 Q 58.5 92.5 56 87.3 Z" fill={dark} stroke={ROUPA_OUT} strokeWidth="1" strokeLinejoin="round" />
      {brilho}
    </g>
  );
  return base;
}

// 🎭 vida no boneco (estilo perfil animado do Discord): de tempos em tempos o rosto troca por
// alguns instantes a variante de olhos/boca do gerador — piscada rápida e expressões ocasionais.
// Só é visual e momentâneo; o perfil salvo do aluno nunca muda.
export const BLINK_EYES = "sleepy"; // "piscada" — a variante mais fechada/sonolenta dos olhos
export const AVATAR_EXPRESSIONS = [
  { eyesV:"winking", mouthV:"teethSmile" }, // piscadela marota + sorrisão
  { eyesV:"starstruck", mouthV:"openedSmile" }, // olhos brilhando de alegria + sorriso
  { eyesV:"confused" },                     // cara de dúvida
  { mouthV:"kawaii" },                      // só abre uma carinha fofa
];
// 🎨 arte de verdade pros pets (Google Noto Animated Emoji, licença gratuita — os mesmos
// bichinhos animados do teclado do Android): cada pet tem o .webp animado (usado nos lugares
// de destaque) e o .png parado (listas, ranking e modo calmo), servidos de public/pets/
export const PET_FILES = {
  "🐉":"dragao", "🦄":"unicornio", "🦖":"trex", "🦅":"aguia",
  "🦉":"coruja", "🐺":"lobo", "🦊":"raposa", "🐱":"gato",
  "🐶":"cachorro", "🐰":"coelho", "🦁":"leao", "🐢":"tartaruga",
};
const PET_MOTION_CLASS = { "🐝":"pet-bee", "🦋":"pet-butterfly", "✨":"pet-firefly", "🍄":"pet-mushroom" };
// posição/tamanho pensados pro formato de cada bicho (sem moldura/círculo): quem tem corpo
// inteiro em pé (trex/cachorro/coelho/tartaruga) fica "no chão" embaixo; quem é só rosto/busto
// (unicórnio/coruja/raposa/gato/leão) fica "pousado" num canto; os maiores/mais assimétricos
// (dragão/águia/lobo) ficam ao lado da bochecha, sem tampar boca nem cabelo
export const PET_POS = {
  dragao:    { w:0.50, left:-0.10, bottom:-0.08, rotate:-8 },
  unicornio: { w:0.40, left:-0.10, top:-0.06, rotate:-8 },
  trex:      { w:0.48, center:true, bottom:-0.10, rotate:0 },
  aguia:     { w:0.44, right:-0.09, bottom:0.30, rotate:-12, flip:true },
  coruja:    { w:0.36, right:-0.08, top:-0.05, rotate:8 },
  lobo:      { w:0.46, left:-0.08, bottom:0.02, rotate:4 },
  raposa:    { w:0.36, right:-0.08, bottom:-0.06, rotate:6 },
  gato:      { w:0.34, right:-0.07, bottom:-0.07, rotate:-4 },
  cachorro:  { w:0.46, left:0.02, bottom:-0.14, rotate:0 },
  coelho:    { w:0.38, left:-0.06, bottom:-0.10, rotate:-3 },
  leao:      { w:0.44, left:-0.09, top:-0.07, rotate:6 },
  tartaruga: { w:0.42, right:0.0, bottom:-0.13, rotate:0 },
};
export function petStyle(file, size) {
  const p = PET_POS[file] || { w:0.4, right:-0.08, bottom:-0.08, rotate:0 };
  const w = Math.round(size * p.w);
  const flip = p.flip ? " scaleX(-1)" : "";
  const style = { position:"absolute", width:w, height:w, filter:"drop-shadow(0 2px 4px rgba(0,0,0,.5))", pointerEvents:"none" };
  if (p.center) { style.left = "50%"; style.transform = `translateX(-50%) rotate(${p.rotate||0}deg)${flip}`; }
  else {
    style.transform = `rotate(${p.rotate||0}deg)${flip}`;
    if (p.left != null) style.left = Math.round(size*p.left); else style.right = Math.round(size*p.right);
  }
  if (p.top != null) style.top = Math.round(size*p.top); else style.bottom = Math.round(size*p.bottom);
  return style;
}
export function Avatar({ cfg, size=72, animated=false }) {
  const c = normalizeAvatar(cfg);
  const [faceOverride, setFaceOverride] = useState(null);
  useEffect(() => {
    if (!animated) return;
    // quem pediu menos movimento no aparelho não recebe nem a piscada (as animações de CSS
    // já são cortadas pelo prefers-reduced-motion/modo calmo; aqui corta as trocas via JS)
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    const timers = [];
    const later = (fn, ms) => { const t = setTimeout(() => { if (alive) fn(); }, ms); timers.push(t); };
    // piscada natural: a cada poucos segundos, olhos fechados por um instante
    const blinkLoop = () => later(() => {
      setFaceOverride(o => o || { eyesV: BLINK_EYES });
      later(() => setFaceOverride(o => (o && o.eyesV === BLINK_EYES && !o.mouthV) ? null : o), 170);
      blinkLoop();
    }, 3000 + Math.random() * 4500);
    // expressão diferente algumas vezes por aula (a cada 3-7min), segurando por uns segundos
    const exprLoop = () => later(() => {
      setFaceOverride(AVATAR_EXPRESSIONS[Math.floor(Math.random() * AVATAR_EXPRESSIONS.length)]);
      later(() => setFaceOverride(null), 2800);
      exprLoop();
    }, 180000 + Math.random() * 240000);
    blinkLoop();
    exprLoop();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [animated]);
  const draw = faceOverride ? { ...c, ...faceOverride } : c;
  const key = JSON.stringify(draw);
  const uri = useMemo(() => "data:image/svg+xml;utf8," + encodeURIComponent(avatarSvg(draw)), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const roupa = ROUPA_ITEMS.find(r => r.id && r.id === c.roupa);
  return (
    <div className={`avatar-pop${animated ? " avatar-idle" : ""}`} style={{ position:"relative", width:size, height:size, display:"inline-block", lineHeight:0, flexShrink:0 }}>
      <div style={{ width:size, height:size, borderRadius:"50%", overflow:"hidden", position:"relative", background:`radial-gradient(circle at 50% 30%, ${shade(c.bg,0.25)}, ${c.bg} 58%, ${shade(c.bg,-0.25)})`, boxShadow:"0 2px 5px rgba(0,0,0,.4), inset 0 0 0 2px rgba(255,255,255,.14)" }}>
        {/* a roupa fica ATRÁS do personagem: a cabeça/queixo cobrem a gola naturalmente */}
        {roupa && (
          <svg width={size} height={size} viewBox="0 0 100 100" style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none" }}>
            <RoupaSvg tipo={roupa.id} cor={roupa.cor} />
          </svg>
        )}
        <img src={uri} width={size} height={size} alt="" draggable={false} className={animated ? "avatar-face" : undefined} style={{ display:"block", position:"relative", zIndex:1 }} />
      </div>
      {/* cada bicho tem uma posição própria pensada pro formato dele (sem moldura/círculo por
          trás) — assim nunca mais tampa a boca ou o cabelo do personagem, do jeito que ficava
          ruim antes com todos os bichos numa medalha única e uniforme */}
      {c.pet && (PET_FILES[c.pet] ? (
        <img className={animated ? "avatar-pet" : undefined} src={`/pets/${PET_FILES[c.pet]}.${animated ? "webp" : "png"}`} alt="" draggable={false} style={petStyle(PET_FILES[c.pet], size)} />
      ) : (
        <span className={animated ? `avatar-pet ${PET_MOTION_CLASS[c.pet] || ""}`.trim() : undefined} style={{ ...petStyle(null, size), fontSize:Math.max(9, Math.round(size*0.3)), lineHeight:1 }}>{c.pet}</span>
      ))}
    </div>
  );
}

const PET_REACTIONS = {
  "🐝": { cls:"bee", text:"Bzzz! Hora de explorar!" },
  "🦋": { cls:"butterfly", text:"A borboleta dançou no ar!" },
  "✨": { cls:"firefly", text:"O vagalume brilhou para você!" },
  "🍄": { cls:"mushroom", text:"O cogumelo acordou!" },
};

// companheiro escolhido pelo aluno fica num canto do painel do Nyx. Clicar nele dispara uma
// reação própria; os pets antigos também respondem com um pulinho genérico.
export function PetCompanion({ pet }) {
  const [reaction, setReaction] = useState(0);
  const [message, setMessage] = useState("");
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  if (!pet) return null;
  const info = PET_REACTIONS[pet] || { cls:"generic", text:"Seu companheiro ficou feliz em te ver!" };
  const react = (e) => {
    e.stopPropagation();
    setReaction(n => n + 1);
    setMessage(info.text);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(""), 2200);
  };
  const file = PET_FILES[pet];
  return (
    <div className="pet-companion-corner" data-tour="pet" title="Clique no seu pet">
      {message && <div className="pet-companion-speech">{message}</div>}
      <button key={reaction} type="button" aria-label="Interagir com meu pet" onClick={react} className={`pet-companion-button pet-companion-${info.cls}`}>
        {file ? <img src={`/pets/${file}.webp`} alt="" draggable={false} /> : <span>{pet}</span>}
      </button>
    </div>
  );
}

// prévia grande do boneco + botão de sortear — fica separada dos controles pra poder ser
// posicionada em outra coluna (ex: metade esquerda da tela na criação de perfil)
export function AvatarPreview({ value, onChange }) {
  const v = normalizeAvatar(value);
  const randomize = () => {
    const pick = a => a[Math.floor(Math.random()*a.length)];
    onChange({
      ...v,
      bg:pick(AVATAR_OPTS.bg), skin:pick(AVATAR_OPTS.skin), hair:pick(AVATAR_OPTS.hair),
      hairV:pick(AVATAR_OPTS.hairV)[0], eyesV:pick(AVATAR_OPTS.eyesV)[0], mouthV:pick(AVATAR_OPTS.mouthV)[0],
      glassesV: Math.random()<0.7 ? "" : pick(AVATAR_OPTS.glassesV.slice(1))[0],
      roupa: Math.random()<0.35 ? "" : pick(ROUPA_ITEMS.slice(1)).id,
    });
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{ background:"radial-gradient(circle at 50% 28%, #1d2344, #171026)", borderRadius:18, padding:12, border:"1px solid #3e2d5e", animation:"glow-ring 3s ease-in-out infinite" }}>
        <Avatar cfg={v} size={104} animated />
      </div>
      <button type="button" onClick={randomize} style={{ background:"#3b2a58", color:"#f0e9fb", border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>🎲 Surpresa</button>
    </div>
  );
}

// os controles de personalização (sem a prévia) — separados pra poder ficar numa coluna própria
// part="basic" → só cor de fundo/pele (pra caber do lado da prévia); part="rest" → o resto; part="all" (padrão) → tudo junto
export function AvatarControls({ value, onChange, part = "all" }) {
  const v = normalizeAvatar(value);
  const set = (k, val) => onChange({ ...v, [k]: val });
  const Swatches = ({ k }) => (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {AVATAR_OPTS[k].map(col => (
        <button key={col} type="button" onClick={()=>set(k,col)}
          style={{ width:26, height:26, borderRadius:"50%", background:col, border:v[k]===col?"3px solid #fff":"2px solid #776798", boxShadow:v[k]===col?"0 0 0 2px #c084fc":"none", cursor:"pointer", padding:0 }} />
      ))}
    </div>
  );
  const Thumbs = ({ k, field }) => (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {AVATAR_OPTS[k].map(([opt,label]) => (
        <button key={opt||"nenhum"} type="button" onClick={()=>set(field,opt)} title={label}
          style={{ background:v[field]===opt?"#c084fc33":"#171026", border:`2px solid ${v[field]===opt?"#c084fc":"#3b2a58"}`, borderRadius:12, padding:3, cursor:"pointer", lineHeight:0 }}>
          <Avatar cfg={{ ...v, pet:"", [field]:opt }} size={46} />
        </button>
      ))}
    </div>
  );
  const Row = ({ label, children }) => (
    <div style={{ marginBottom:10, breakInside:"avoid" }}>
      <p style={{ color:"#a99ac9", fontSize:12, marginBottom:4 }}>{label}</p>
      {children}
    </div>
  );
  const Pets = () => (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {AVATAR_OPTS.pet.map(o=>(
        <button key={o.label} type="button" onClick={()=>set("pet", o.e)} title={o.label}
          style={{ padding:"4px 9px", borderRadius:8, background:v.pet===o.e?"#c084fc":"#171026", color:"#f0e9fb", border:`1px solid ${v.pet===o.e?"#c084fc":"#3b2a58"}`, cursor:"pointer", fontSize:14 }}>
          {o.e ? o.e+" " : ""}{o.label}
        </button>
      ))}
    </div>
  );
  const ItemThumbs = ({ items, field }) => (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {items.map(it => (
        <button key={it.id||"nenhum"} type="button" onClick={()=>set(field, it.id)} title={it.label}
          style={{ background:v[field]===it.id?"#c084fc33":"#171026", border:`2px solid ${v[field]===it.id?"#c084fc":"#3b2a58"}`, borderRadius:12, padding:3, cursor:"pointer", lineHeight:0 }}>
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
          <Row label="Acessório"><Thumbs k="glassesV" field="glassesV" /></Row>
          <Row label="👕 Roupa"><ItemThumbs items={ROUPA_ITEMS} field="roupa" /></Row>
          <Row label="🐉 Pet / Animal mitológico"><Pets /></Row>
        </>
      )}
    </div>
  );
}

export function AvatarBuilder({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
      <div style={{ flexShrink:0 }}><AvatarPreview value={value} onChange={onChange} /></div>
      <AvatarControls value={value} onChange={onChange} />
    </div>
  );
}
