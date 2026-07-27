import { useEffect, useRef } from "react";
import gsap from "gsap";
import { shade } from "../lib/colors.js";

// ── loja de acessórios do Nyx (desbloqueados com pontos de acerto) ──
export const NYX_ITEMS = [
  { id:"fone",   label:"Fone de ouvido", emoji:"🎧", slot:"head", cost:5 },
  { id:"laco",   label:"Laço",           emoji:"🎀", slot:"neck", cost:8 },
  { id:"oculos", label:"Óculos escuros", emoji:"🕶️", slot:"face", cost:10 },
  { id:"chapeu", label:"Cartola",        emoji:"🎩", slot:"head", cost:15 },
  { id:"escudo", label:"Escudo",         emoji:"🛡️", slot:"shield", cost:20 },
  { id:"espada", label:"Espada",         emoji:"⚔️", slot:"hand", cost:30 },
  { id:"coroa",  label:"Coroa",          emoji:"👑", slot:"head", cost:40 },
  { id:"arco",   label:"Arco e flecha",  emoji:"🏹", slot:"hand", cost:50 },
  // secreto: só aparece na loja depois de desbloqueado com o comando "nyx pirata" no terminal (de graça, não se compra)
  { id:"chapeuPirata", label:"Chapéu Pirata", emoji:"🏴‍☠️", slot:"head", cost:0, secret:true },
  // cabeça
  { id:"touca",        label:"Touca de Lã",        emoji:"🧶", slot:"head", cost:6 },
  { id:"bone",         label:"Boné",               emoji:"🧢", slot:"head", cost:8 },
  { id:"chapeuFesta",  label:"Chapéu de Festa",    emoji:"🥳", slot:"head", cost:10 },
  { id:"bandana",      label:"Bandana Ninja",      emoji:"🥷", slot:"head", cost:12 },
  { id:"gorroNatal",   label:"Gorro de Papai Noel",emoji:"🎅", slot:"head", cost:12 },
  { id:"orelhinhas",   label:"Orelhinhas de Gato", emoji:"🐱", slot:"head", cost:10 },
  { id:"tiara",        label:"Tiara",              emoji:"💎", slot:"head", cost:16 },
  { id:"capaceteObra", label:"Capacete de Obra",   emoji:"⛑️", slot:"head", cost:14 },
  { id:"foneDJ",       label:"Fone de DJ",         emoji:"🪩", slot:"head", cost:18 },
  { id:"chapeuMago",   label:"Chapéu de Mago",     emoji:"🧙", slot:"head", cost:22 },
  { id:"capelo",       label:"Capelo de Formatura",emoji:"🎓", slot:"head", cost:45 },
  // rosto
  { id:"oculosNerd",    label:"Óculos de Nerd",     emoji:"🤓", slot:"face", cost:8 },
  { id:"vendaPirata",   label:"Venda de Pirata",    emoji:"🩹", slot:"face", cost:10 },
  { id:"oculosAviador", label:"Óculos de Aviador",  emoji:"😎", slot:"face", cost:12 },
  { id:"oculos3d",      label:"Óculos 3D",          emoji:"🥽", slot:"face", cost:10 },
  { id:"monoculo",      label:"Monóculo",           emoji:"🧐", slot:"face", cost:14 },
  { id:"mascaraHeroi",  label:"Máscara de Herói",   emoji:"🎭", slot:"face", cost:18 },
  // pescoço
  { id:"cachecol",       label:"Cachecol",           emoji:"🧣", slot:"neck", cost:10 },
  { id:"golaSocial",     label:"Gola Social",        emoji:"👕", slot:"neck", cost:10 },
  { id:"colarHavaiano",  label:"Colar Havaiano",     emoji:"🌺", slot:"neck", cost:12 },
  { id:"gravataBorboleta", label:"Gravata-Borboleta",emoji:"👔", slot:"neck", cost:12 },
  { id:"colarDev",       label:"Colar </>",          emoji:"🏷️", slot:"neck", cost:14 },
  { id:"medalha",        label:"Medalha",            emoji:"🏅", slot:"neck", cost:25 },
  // mão
  { id:"sorvete",       label:"Sorvete",            emoji:"🍦", slot:"hand", cost:8 },
  { id:"guardaChuva",   label:"Guarda-chuva",       emoji:"☂️", slot:"hand", cost:10 },
  { id:"chaveInglesa",  label:"Chave Inglesa",      emoji:"🔧", slot:"hand", cost:14 },
  { id:"bandeiraCorrida", label:"Bandeira de Corrida", emoji:"🏁", slot:"hand", cost:15 },
  { id:"microfone",     label:"Microfone",          emoji:"🎤", slot:"hand", cost:16 },
  { id:"martelo",       label:"Martelo de Dev",     emoji:"🔨", slot:"hand", cost:18 },
  { id:"grimorio",      label:"Grimório Mágico",    emoji:"📖", slot:"hand", cost:18 },
  { id:"varinha",       label:"Varinha Mágica",     emoji:"🪄", slot:"hand", cost:20 },
  { id:"tecladoMini",   label:"Teclado Mecânico",   emoji:"⌨️", slot:"hand", cost:20 },
  { id:"controle",      label:"Controle de Videogame", emoji:"🎮", slot:"hand", cost:22 },
  { id:"trofeu",        label:"Taça de Troféu",     emoji:"🏆", slot:"hand", cost:30 },
  // escudo
  { id:"tampaPanela", label:"Tampa de Panela", emoji:"🥘", slot:"shield", cost:12 },
  { id:"placaStop",   label:"Placa de Stop",   emoji:"🛑", slot:"shield", cost:16 },
  { id:"livroGrosso", label:"Livro Grosso",    emoji:"📚", slot:"shield", cost:20 },
];
export const DEFAULT_NYX_GEAR = { head:null, face:null, neck:null, hand:null, shield:null };
// item equipado num slot que não tem desenho próprio (os itens acima, todos novos) cai aqui: em vez
// de desenhar um SVG à mão pra cada um, mostra o emoji do item já usado como ícone dele na loja —
// mantém a arte consistente com o que o aluno vê na hora de comprar, sem precisar ilustrar 37 itens
const emojiFor = (slot, id) => NYX_ITEMS.find(i => i.slot === slot && i.id === id)?.emoji || "";

// ── NYX: o robô assistente da turma (SVG + GSAP) ──
let __nyxSeq = 0;
export function NyxRobot({ state = "idle", size = 100, showName = true, gear }) {
  const G = { ...DEFAULT_NYX_GEAR, ...(gear||{}) };
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = ++__nyxSeq;
  const uid = "nyx" + idRef.current;
  const MAP = {
    idle:     { main:"#818cf8", dark:"#4338ca", eye:"#e0e7ff", label:"Pronto para ajudar" },
    thinking: { main:"#fbbf24", dark:"#d99b0d", eye:"#fff3c4", label:"Analisando..." },
    ok:       { main:"#34d399", dark:"#0da879", eye:"#d1fae5", label:"Tudo certo!" },
    error:    { main:"#f87171", dark:"#dc4848", eye:"#ffe1e1", label:"Encontrei algo!" },
  };
  const P = MAP[state] || MAP.idle;
  const antennaSpeed = state === "thinking" ? ".5s" : "1.8s";

  // ⚔️🛡️ espada + escudo equipados juntos: o Nyx vira um Espartano (elmo, capa e postura de batalha exclusivos)
  const isSpartan = G.hand === "espada" && G.shield === "escudo";

  // 🎬 GSAP: dá vida ao Nyx sem mexer no sistema de humores/quirks/Espartano acima — olhos que
  // seguem o mouse, antena com física de mola, orelha que treme sozinha, pulo no clique e a cor
  // "escorrendo" suavemente entre os humores (em vez da troca seca de antes). As cores dos elementos
  // abaixo NÃO ficam mais presas a {P.main/P.dark/P.eye} no JSX — só o GSAP escreve nelas depois do
  // primeiro paint, senão qualquer re-render (ex: quirk mudando) resetaria a transição no meio do caminho
  const bounceWrapRef = useRef(null);
  const headGroupRef = useRef(null);
  const eyesLookRef = useRef(null);
  const antennaGroupRef = useRef(null);
  const earLGroupRef = useRef(null);
  const earRGroupRef = useRef(null);
  const earLFillRef = useRef(null);
  const earRFillRef = useRef(null);
  const headStop1Ref = useRef(null);
  const headStop2Ref = useRef(null);
  const bodyStop1Ref = useRef(null);
  const bodyStop2Ref = useRef(null);
  const antennaLineRef = useRef(null);
  const antennaTipRef = useRef(null);
  const coreRef = useRef(null);
  const neckRef = useRef(null);
  const armLRef = useRef(null);
  const armRRef = useRef(null);
  const footLRef = useRef(null);
  const footRRef = useRef(null);

  useEffect(() => {
    const firstPaint = !headGroupRef.current.dataset.painted;
    headGroupRef.current.dataset.painted = "1";
    const targets = [
      [headStop1Ref.current, { attr: { "stop-color": shade(P.main, 0.25) } }],
      [headStop2Ref.current, { attr: { "stop-color": P.main } }],
      [bodyStop1Ref.current, { attr: { "stop-color": P.main } }],
      [bodyStop2Ref.current, { attr: { "stop-color": P.dark } }],
      [earLFillRef.current, { attr: { fill: P.dark, stroke: shade(P.dark, -0.3) } }],
      [earRFillRef.current, { attr: { fill: P.dark, stroke: shade(P.dark, -0.3) } }],
      [antennaLineRef.current, { attr: { stroke: P.dark } }],
      [antennaTipRef.current, { attr: { fill: P.eye } }],
      [coreRef.current, { attr: { fill: P.eye } }],
      [neckRef.current, { attr: { fill: P.dark } }],
      [armLRef.current, { attr: { fill: P.dark } }],
      [armRRef.current, { attr: { fill: P.dark } }],
      [footLRef.current, { attr: { fill: P.dark } }],
      [footRRef.current, { attr: { fill: P.dark } }],
    ];
    targets.forEach(([el, vars]) => {
      if (!el) return;
      if (firstPaint) gsap.set(el, vars);
      else gsap.to(el, { ...vars, duration: 0.65, ease: "power2.inOut" });
    });
    if (!firstPaint && eyesLookRef.current) gsap.fromTo(eyesLookRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out" });
  }, [state]);

  // orelha treme sozinha de vez em quando — só um tique de vida, independe do humor
  useEffect(() => {
    let alive = true;
    const timers = [];
    const twitch = () => {
      const t = setTimeout(() => {
        if (!alive) return;
        const ref = Math.random() < 0.5 ? earLGroupRef : earRGroupRef;
        if (ref.current) {
          const dir = Math.random() < 0.5 ? -14 : 14;
          gsap.fromTo(ref.current, { rotation: 0 }, { rotation: dir, duration: 0.09, yoyo: true, repeat: 3, ease: "sine.inOut", onComplete: () => gsap.set(ref.current, { rotation: 0 }) });
        }
        twitch();
      }, 4000 + Math.random() * 5000);
      timers.push(t);
    };
    twitch();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, []);

  // olhos + cabeça seguem o mouse enquanto ele passa perto (só localmente, não escuta a página toda)
  const eyeXTo = useRef(null), eyeYTo = useRef(null), headRotTo = useRef(null);
  useEffect(() => {
    if (!eyesLookRef.current || !headGroupRef.current) return;
    gsap.set(headGroupRef.current, { svgOrigin: "60 46" });
    eyeXTo.current = gsap.quickTo(eyesLookRef.current, "x", { duration: 0.4, ease: "power3.out" });
    eyeYTo.current = gsap.quickTo(eyesLookRef.current, "y", { duration: 0.4, ease: "power3.out" });
    headRotTo.current = gsap.quickTo(headGroupRef.current, "rotation", { duration: 0.55, ease: "power3.out" });
  }, []);
  const handleNyxMouseMove = (e) => {
    if (!bounceWrapRef.current) return;
    const r = bounceWrapRef.current.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 1.6)));
    const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.35)) / (r.height * 1.6)));
    eyeXTo.current?.(dx * 3.2);
    eyeYTo.current?.(dy * 2.4);
    headRotTo.current?.(dx * 5);
  };
  const handleNyxMouseLeave = () => { eyeXTo.current?.(0); eyeYTo.current?.(0); headRotTo.current?.(0); };
  // antena com física de mola quando o mouse passa perto
  const handleNyxHover = () => {
    if (!antennaGroupRef.current) return;
    gsap.set(antennaGroupRef.current, { svgOrigin: "60 22" });
    gsap.fromTo(antennaGroupRef.current, { rotation: -16 }, { rotation: 0, duration: 1.3, ease: "elastic.out(1.2, 0.2)" });
  };
  // clique: salto com squash & stretch, sem brigar com a animação de humor/quirk (que fica no
  // div de fora) porque esse pulo mexe num div NOVO, só dele
  const clickingRef = useRef(false);
  const handleNyxClick = () => {
    if (!bounceWrapRef.current || clickingRef.current) return;
    clickingRef.current = true;
    const tl = gsap.timeline({ onComplete: () => { clickingRef.current = false; } });
    tl.to(bounceWrapRef.current, { scaleY: 0.82, scaleX: 1.12, duration: 0.15, ease: "power2.out" })
      .to(bounceWrapRef.current, { y: -16, scaleY: 1.05, scaleX: 0.97, duration: 0.24, ease: "power2.out" })
      .to(bounceWrapRef.current, { y: 0, duration: 0.22, ease: "power2.in" })
      .to(bounceWrapRef.current, { scaleY: 0.9, scaleX: 1.06, duration: 0.08 })
      .to(bounceWrapRef.current, { scaleY: 1, scaleX: 1, duration: 0.7, ease: "elastic.out(1.1, 0.3)" });
  };

  // enquanto parado no estado idle, de vez em quando solta uma animação criativa (bocejo, pulinho, giro...)
  // pra parecer vivo — depois volta pro float calmo de sempre e agenda a próxima aleatoriamente
  // (pausa enquanto o Nyx está em modo Espartano: um guerreiro não fica de bobeira dando pulinho)
  return (
    <div style={{ textAlign:"center", padding:4, position:"relative" }}>
      <div style={{ display:"inline-block", position:"relative" }}>
        <div ref={bounceWrapRef} style={{ display:"inline-block", cursor:"pointer" }}
          onMouseMove={handleNyxMouseMove} onMouseLeave={handleNyxMouseLeave} onMouseEnter={handleNyxHover} onClick={handleNyxClick}>
        <svg width={size} height={size*1.15} viewBox="0 0 120 138" style={{ display:"block", overflow:"visible" }}>
          <defs>
            <linearGradient id={uid+"h"} x1="0" y1="0" x2="0" y2="1">
              <stop ref={headStop1Ref} offset="0" stopColor={shade(P.main, 0.25)} />
              <stop ref={headStop2Ref} offset="1" stopColor={P.main} />
            </linearGradient>
            <linearGradient id={uid+"b"} x1="0" y1="0" x2="0" y2="1">
              <stop ref={bodyStop1Ref} offset="0" stopColor={P.main} />
              <stop ref={bodyStop2Ref} offset="1" stopColor={P.dark} />
            </linearGradient>
            <radialGradient id={uid+"g"}>
              <stop offset="0" stopColor={P.main} stopOpacity=".5" />
              <stop offset="1" stopColor={P.main} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* aura de luz atrás, com umas estrelinhas piscando — o Nyx é uma criatura da noite */}
          <circle cx="60" cy="62" r="55" fill={`url(#${uid}g)`} />
          <g fill="#fefce8">
            <circle cx="15" cy="30" r="1.3" opacity="0.9"><animate attributeName="opacity" values="0.2;1;0.2" dur="2.4s" repeatCount="indefinite" /></circle>
            <circle cx="106" cy="24" r="1.6" opacity="0.7"><animate attributeName="opacity" values="1;0.2;1" dur="3.1s" repeatCount="indefinite" /></circle>
            <circle cx="12" cy="70" r="1" opacity="0.8"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" repeatCount="indefinite" /></circle>
            <circle cx="110" cy="80" r="1.4" opacity="0.6"><animate attributeName="opacity" values="1;0.3;1" dur="2.7s" repeatCount="indefinite" /></circle>
          </g>

          {/* sombra no chão */}
          <ellipse cx="60" cy="128" rx="26" ry="5" fill="#000" opacity="0.35" />

          <g ref={headGroupRef}>
          {/* orelhas em formato de morcego — criatura da noite (cada uma no seu grupo, pra poder
              tremer sozinha de vez em quando sem mexer no resto da cabeça) */}
          <g ref={earLGroupRef}>
            <path ref={earLFillRef} d="M18 44 Q14 28 26 16 Q31 28 34 40 Q26 44 18 44 Z" fill={P.dark} stroke={shade(P.dark, -0.3)} strokeWidth="1" />
            <path d="M21 40 Q19 28 26 22 Q29 29 31 38 Q26 41 21 40 Z" fill={P.main} opacity="0.5" />
            <path d="M23 38 Q22 28 26 20" stroke="#a5adf8" strokeWidth="0.8" opacity="0.55" fill="none" strokeLinecap="round" />
          </g>
          <g ref={earRGroupRef}>
            <path ref={earRFillRef} d="M86 40 Q89 28 94 16 Q106 28 102 44 Q94 44 86 40 Z" fill={P.dark} stroke={shade(P.dark, -0.3)} strokeWidth="1" />
            <path d="M99 40 Q101 28 94 22 Q91 29 89 38 Q94 41 99 40 Z" fill={P.main} opacity="0.5" />
            <path d="M97 38 Q98 28 94 20" stroke="#a5adf8" strokeWidth="0.8" opacity="0.55" fill="none" strokeLinecap="round" />
          </g>

          {/* cabeça */}
          <rect x="28" y="20" width="64" height="44" rx="17" fill={`url(#${uid}h)`} stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1.2" />
          <rect x="28" y="20" width="64" height="20" rx="17" fill="#ffffff" opacity="0.14" />

          {/* acessório de cabeça (por cima da cabeça; a antena sempre aparece por cima dele) — o elmo
              Espartano é uma TRANSFORMAÇÃO exclusiva e substitui qualquer chapéu normal enquanto durar o combo */}
          {isSpartan ? (
            <g>
              <defs>
                <linearGradient id={uid+"crista"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fca5a5"/><stop offset=".5" stopColor="#dc2626"/><stop offset="1" stopColor="#7a1010"/></linearGradient>
                <linearGradient id={uid+"bronze"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dcb877"/><stop offset=".5" stopColor="#a1783f"/><stop offset="1" stopColor="#6b4d24"/></linearGradient>
              </defs>
              <path d="M43 6 Q60 -11 77 6 L74 10.5 Q60 -1 46 10.5 Z" fill={`url(#${uid}crista)`} stroke="#5c1010" strokeWidth="1" />
              <path d="M46 10 Q60 2 74 10 L74 15 Q60 8 46 15 Z" fill="#b91c1c" opacity="0.9" />
              <ellipse cx="60" cy="4" rx="17" ry="3.6" fill="#f87171" />
              <ellipse cx="60" cy="3" rx="14" ry="1.6" fill="#fff" opacity="0.3" />
              <path d="M28 25 Q60 6 92 25 L92 20 Q60 2 28 20 Z" fill={`url(#${uid}bronze)`} stroke="#4a3418" strokeWidth="1" />
              <path d="M30 22 Q60 6 90 22" stroke="#f3dfae" strokeWidth="1" opacity="0.4" fill="none" />
              <rect x="30" y="19" width="60" height="8" rx="3" fill={`url(#${uid}bronze)`} stroke="#4a3418" strokeWidth="1" />
              <rect x="30" y="19" width="60" height="2" rx="1" fill="#f3dfae" opacity="0.4" />
            </g>
          ) : (
            <>
              {G.head === "fone" && (
                <g>
                  <defs>
                    <linearGradient id={uid+"fone"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a4152"/><stop offset="1" stopColor="#181b24"/></linearGradient>
                  </defs>
                  <path d="M23 38 Q60 4 97 38" stroke="#14161e" strokeWidth="6.4" fill="none" strokeLinecap="round" />
                  <path d="M23 38 Q60 4 97 38" stroke="#454e63" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7" />
                  <rect x="15" y="31" width="16" height="21" rx="7" fill={`url(#${uid}fone)`} stroke="#0e0f14" strokeWidth="0.6" />
                  <rect x="18.5" y="34.5" width="9" height="14" rx="4.5" fill={P.main} />
                  <ellipse cx="20" cy="37" rx="2.5" ry="3.5" fill="#ffffff" opacity="0.3" />
                  <rect x="89" y="31" width="16" height="21" rx="7" fill={`url(#${uid}fone)`} stroke="#0e0f14" strokeWidth="0.6" />
                  <rect x="92.5" y="34.5" width="9" height="14" rx="4.5" fill={P.main} />
                  <ellipse cx="94" cy="37" rx="2.5" ry="3.5" fill="#ffffff" opacity="0.3" />
                </g>
              )}
              {G.head === "chapeu" && (
                <g>
                  <defs>
                    <linearGradient id={uid+"chapeu"} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#241c3c"/><stop offset=".5" stopColor="#372b5c"/><stop offset="1" stopColor="#241c3c"/></linearGradient>
                  </defs>
                  <ellipse cx="60" cy="20.5" rx="23" ry="4.6" fill="#12102080" />
                  <ellipse cx="60" cy="20" rx="23" ry="4.5" fill={`url(#${uid}chapeu)`} stroke="#8b83b0" strokeWidth="1" />
                  <path d="M46 20 L47.5 4 Q60 1 72.5 4 L74 20 Z" fill={`url(#${uid}chapeu)`} stroke="#8b83b0" strokeWidth="1" />
                  <ellipse cx="60" cy="4.5" rx="12.5" ry="2.6" fill="#4a3d78" />
                  <rect x="46.8" y="13" width="26.4" height="5" fill={P.main} />
                  <rect x="46.8" y="13" width="26.4" height="1.6" fill="#ffffff" opacity="0.25" />
                  <path d="M50 6 Q52 12 51.5 18" stroke="#ffffff" strokeWidth="1.6" opacity="0.22" fill="none" strokeLinecap="round" />
                </g>
              )}
              {G.head === "coroa" && (
                <g>
                  <defs>
                    <linearGradient id={uid+"coroa"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fde68a"/><stop offset=".55" stopColor="#fbbf24"/><stop offset="1" stopColor="#d99b0d"/></linearGradient>
                  </defs>
                  <path d="M40 20 L40 7 L49 14 L60 3 L71 14 L80 7 L80 20 Z" fill={`url(#${uid}coroa)`} stroke="#a9720a" strokeWidth="1.3" />
                  <path d="M42 17 L42 10 L48 14.5" stroke="#fff7d6" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" fill="none" />
                  <rect x="40" y="17" width="40" height="5" rx="2.2" fill={`url(#${uid}coroa)`} stroke="#a9720a" strokeWidth="1" />
                  <rect x="40" y="17" width="40" height="1.6" rx="1" fill="#fff7d6" opacity="0.5" />
                  <circle cx="60" cy="9" r="2.4" fill="#ef4444" stroke="#7a1010" strokeWidth="0.8" />
                  <circle cx="59.3" cy="8.3" r="0.8" fill="#fff" opacity="0.7" />
                  <circle cx="48" cy="15" r="1.7" fill="#22d3ee" stroke="#0e7490" strokeWidth="0.5" />
                  <circle cx="72" cy="15" r="1.7" fill="#22d3ee" stroke="#0e7490" strokeWidth="0.5" />
                  <circle cx="60" cy="19.5" r="1.5" fill="#a855f7" stroke="#6b21a8" strokeWidth="0.5" />
                </g>
              )}
              {G.head === "chapeuPirata" && (
                <g>
                  <defs>
                    <linearGradient id={uid+"pirata"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#332720"/><stop offset="1" stopColor="#161009"/></linearGradient>
                  </defs>
                  <path d="M24 24 Q60 1 96 24 Q88 31 60 28 Q32 31 24 24 Z" fill={`url(#${uid}pirata)`} stroke="#000" strokeWidth="1" />
                  <path d="M24 24 Q60 3 96 24" stroke="#5c463a" strokeWidth="1" fill="none" opacity="0.6" />
                  <path d="M34 22 Q60 8 86 22 Q60 16 34 22 Z" fill="#211913" />
                  <circle cx="60" cy="15.5" r="3.6" fill="#f1f2f4" stroke="#111" strokeWidth="0.6" />
                  <circle cx="59" cy="14.3" r="1" fill="#fff" opacity="0.7" />
                  <path d="M57 14 L60 18.5 L63 14" stroke="#111" strokeWidth="0.9" fill="none" strokeLinecap="round" />
                  <path d="M55.5 13.5 L58 13.5 M62 13.5 L64.5 13.5" stroke="#111" strokeWidth="0.8" strokeLinecap="round" />
                </g>
              )}
              {G.head && !["fone","chapeu","coroa","chapeuPirata"].includes(G.head) && (
                <text x="60" y="13" fontSize="24" textAnchor="middle" dominantBaseline="central" style={{ filter:"drop-shadow(0 1px 1.5px rgba(0,0,0,.5))" }}>{emojiFor("head", G.head)}</text>
              )}
            </>
          )}

          {/* antena (sempre por cima) — agrupada pra poder balançar como mola quando o mouse chega perto */}
          <g ref={antennaGroupRef}>
            <path ref={antennaLineRef} d="M60 22 Q56 18 60 15 Q64 12 60 9" fill="none" stroke={P.dark} strokeWidth="3.4" strokeLinecap="round" />
            <circle cx="60" cy="7" r="7" fill={P.main} opacity="0.25" />
            <circle ref={antennaTipRef} cx="60" cy="7" r="4" fill={P.eye} style={{ animation:`nyx-antenna ${antennaSpeed} ease-in-out infinite` }} />
          </g>

          {/* visor */}
          <rect x="36" y="29" width="48" height="27" rx="12" fill="#0b0e1d" />
          <rect x="38" y="31" width="44" height="10" rx="6" fill="#ffffff" opacity="0.06" />
          <path d="M38 58 Q60 62 82 58" stroke="#000" strokeWidth="1" opacity="0.15" fill="none" />

          {/* olhos por estado — no idle, viram meia-lua (o jeito de "olhar" da criatura da noite): um
              círculo cheio "mordido" por outro da cor do visor, o jeito confiável de desenhar uma lua
              crescente em SVG (arco A com raio pequeno demais degenera e some — já vi isso quebrar).
              O grupo todo segue o mouse (olhar de verdade) e "desliza" pra dentro quando o humor muda */}
          <g ref={eyesLookRef}>
          {state === "idle" && (
            <g style={{ animation:"nyx-blink 4.2s infinite", transformOrigin:"60px 42px" }}>
              <circle cx="50" cy="42" r="6.2" fill={P.eye} style={{ filter:`drop-shadow(0 0 3px ${P.eye})` }} />
              <circle cx="53.2" cy="39.2" r="5.4" fill="#0b0e1d" />
              <circle cx="70" cy="42" r="6.2" fill={P.eye} style={{ filter:`drop-shadow(0 0 3px ${P.eye})` }} />
              <circle cx="73.2" cy="39.2" r="5.4" fill="#0b0e1d" />
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
          </g>

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
          {G.face && G.face !== "oculos" && (
            <text x="60" y="41" fontSize="22" textAnchor="middle" dominantBaseline="central" style={{ filter:"drop-shadow(0 1px 1.5px rgba(0,0,0,.5))" }}>{emojiFor("face", G.face)}</text>
          )}

          </g>

          {/* pescoço */}
          <rect ref={neckRef} x="53" y="62" width="14" height="8" rx="3" fill={P.dark} />

          {/* laço no pescoço */}
          {G.neck === "laco" && (
            <g>
              <defs>
                <linearGradient id={uid+"laco"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f9a8d4"/><stop offset="1" stopColor="#db2777"/></linearGradient>
              </defs>
              <path d="M60 66 Q51 59 47 62 Q44.5 65 47 69 Q51 73 60 66 Z" fill={`url(#${uid}laco)`} stroke="#a8135c" strokeWidth="1" />
              <path d="M60 66 Q69 59 73 62 Q75.5 65 73 69 Q69 73 60 66 Z" fill={`url(#${uid}laco)`} stroke="#a8135c" strokeWidth="1" />
              <path d="M52 63 Q55 64.5 57 66" stroke="#fce7f3" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.8" />
              <path d="M68 63 Q65 64.5 63 66" stroke="#fce7f3" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.8" />
              <circle cx="60" cy="66" r="3.2" fill="#db2777" stroke="#a8135c" strokeWidth="0.8" />
              <circle cx="58.8" cy="64.8" r="0.9" fill="#fff" opacity="0.6" />
            </g>
          )}
          {G.neck && G.neck !== "laco" && (
            <text x="60" y="67" fontSize="15" textAnchor="middle" dominantBaseline="central" style={{ filter:"drop-shadow(0 1px 1.5px rgba(0,0,0,.5))" }}>{emojiFor("neck", G.neck)}</text>
          )}

          {/* capa Espartana (atrás de tudo — braços, mão e corpo ficam por cima dela) */}
          {isSpartan && (
            <g className="nyx-cape">
              <defs>
                <linearGradient id={uid+"capa"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dc2626"/><stop offset="1" stopColor="#7a1010"/></linearGradient>
              </defs>
              <path d="M42 66 Q30 100 38 122 L60 112 L82 122 Q90 100 78 66 Q60 74 42 66 Z" fill={`url(#${uid}capa)`} stroke="#5c1010" strokeWidth="1" opacity="0.94" />
              <path d="M46 70 Q38 98 44 116" stroke="#f87171" strokeWidth="1.2" opacity="0.35" fill="none" />
              <path d="M74 70 Q82 98 76 116" stroke="#5c1010" strokeWidth="1.2" opacity="0.35" fill="none" />
            </g>
          )}

          {/* braços */}
          <rect ref={armLRef} x="26" y="74" width="10" height="24" rx="5" fill={P.dark} transform={state==="ok" ? "rotate(-38 31 76)" : "rotate(8 31 76)"} style={{ transition:"transform .3s" }} />
          <rect ref={armRRef} x="84" y="74" width="10" height="24" rx="5" fill={P.dark} transform={state==="ok" ? "rotate(38 89 76)" : "rotate(-8 89 76)"} style={{ transition:"transform .3s" }} />

          {/* escudo (sempre na mão esquerda) */}
          {G.shield === "escudo" && (
            <g>
              <defs>
                <linearGradient id={uid+"escudo"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e2e8f0"/><stop offset=".5" stopColor="#94a3b8"/><stop offset="1" stopColor="#5c6b81"/></linearGradient>
              </defs>
              <path d="M12 82 Q12 78 22 76 Q32 78 32 82 L32 92 Q32 101 22 106 Q12 101 12 92 Z" fill={`url(#${uid}escudo)`} stroke="#3f4b5c" strokeWidth="1.6" />
              <path d="M14.5 83 Q14.5 80 22 78.5 Q29.5 80 29.5 83 L29.5 91.5 Q29.5 98.5 22 102.5 Q14.5 98.5 14.5 91.5 Z" fill="#e8edf3" stroke="none" opacity="0.55" />
              <path d="M22 84 L24.5 89 L22 97 L19.5 89 Z" fill={P.main} stroke={P.dark} strokeWidth="0.8" />
              <path d="M22 84 L23 87.5 L22 91 L21 87.5 Z" fill="#fff" opacity="0.4" />
              <circle cx="22" cy="80.5" r="1.3" fill="#3f4b5c" />
              <circle cx="15.5" cy="90" r="1.3" fill="#3f4b5c" />
              <circle cx="28.5" cy="90" r="1.3" fill="#3f4b5c" />
              <circle cx="21.6" cy="80.1" r="0.5" fill="#fff" opacity="0.6" />
            </g>
          )}
          {G.shield && G.shield !== "escudo" && (
            <text x="22" y="90" fontSize="20" textAnchor="middle" dominantBaseline="central" style={{ filter:"drop-shadow(0 1px 1.5px rgba(0,0,0,.5))" }}>{emojiFor("shield", G.shield)}</text>
          )}
          {/* arma (sempre na mão direita — espelhada da mesma arte da mão esquerda) */}
          {G.hand === "espada" && (
            <g transform="translate(120,0) scale(-1,1)">
              <defs>
                <linearGradient id={uid+"lamina"} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f8fafc"/><stop offset=".5" stopColor="#e2e8f0"/><stop offset="1" stopColor="#94a3b8"/></linearGradient>
                <linearGradient id={uid+"cabo"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a06617"/><stop offset="1" stopColor="#5c3a0d"/></linearGradient>
              </defs>
              <g transform="rotate(-25 24 90)">
                <path d="M23.5 62 L26.5 67 L26 94 L21 94 L20.5 67 Z" fill={`url(#${uid}lamina)`} stroke="#7c8a9c" strokeWidth="0.8" />
                <line x1="22.3" y1="66" x2="22.3" y2="92" stroke="#fff" strokeWidth="0.7" opacity="0.6" />
                <line x1="23.5" y1="66" x2="23.5" y2="92" stroke="#94a3b8" strokeWidth="1" />
                <path d="M13 94 Q23.5 90.5 34 94 L34 97 Q23.5 93.5 13 97 Z" fill="#eab308" stroke="#8a5f08" strokeWidth="0.8" />
                <path d="M14 94.5 Q23.5 91.5 33 94.5" stroke="#fef3c7" strokeWidth="0.8" fill="none" opacity="0.6" />
                <rect x="21" y="97" width="5" height="10" rx="2" fill={`url(#${uid}cabo)`} />
                <line x1="21.5" y1="100" x2="25.5" y2="100" stroke="#3d2408" strokeWidth="1" />
                <line x1="21.5" y1="103" x2="25.5" y2="103" stroke="#3d2408" strokeWidth="1" />
                <circle cx="23.5" cy="109.5" r="3" fill="#eab308" stroke="#8a5f08" strokeWidth="0.8" />
                <circle cx="22.7" cy="108.7" r="0.8" fill="#fef3c7" opacity="0.8" />
              </g>
            </g>
          )}
          {G.hand === "arco" && (
            <g transform="translate(120,0) scale(-1,1)">
              <g transform="rotate(10 20 90)">
                <path d="M16 68 Q34 90 16 112" stroke="#7a3406" strokeWidth="3.6" fill="none" strokeLinecap="round" />
                <path d="M17.5 72 Q30 90 17.5 108" stroke="#d68a52" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                <line x1="16" y1="68" x2="16" y2="112" stroke="#f1f5f9" strokeWidth="1.2" />
                <line x1="10" y1="90" x2="34" y2="90" stroke="#8a5f08" strokeWidth="2" />
                <path d="M34 90 L28 86.5 L28 93.5 Z" fill="#8592a3" />
                <path d="M10 87 L14 90 L10 93" stroke="#ef4444" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <path d="M11 88.3 L13 90 L11 91.7" stroke="#fecaca" strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.7" />
              </g>
            </g>
          )}
          {/* itens de mão sem desenho próprio: já nasce na posição espelhada (mão direita), sem
              precisar do transform de espelho — assim o emoji não fica invertido/estranho */}
          {G.hand && !["espada","arco"].includes(G.hand) && (
            <text x="98" y="90" fontSize="22" textAnchor="middle" dominantBaseline="central" style={{ filter:"drop-shadow(0 1px 1.5px rgba(0,0,0,.5))" }}>{emojiFor("hand", G.hand)}</text>
          )}

          {/* corpo */}
          <rect x="38" y="68" width="44" height="38" rx="14" fill={`url(#${uid}b)`} stroke="#ffffff" strokeOpacity="0.13" strokeWidth="1.2" />
          <rect x="38" y="68" width="44" height="16" rx="14" fill="#ffffff" opacity="0.12" />
          <circle cx="42.5" cy="77" r="1" fill={shade(P.dark, -0.3)} opacity="0.6" />
          <circle cx="77.5" cy="77" r="1" fill={shade(P.dark, -0.3)} opacity="0.6" />
          <circle cx="42.5" cy="97" r="1" fill={shade(P.dark, -0.3)} opacity="0.6" />
          <circle cx="77.5" cy="97" r="1" fill={shade(P.dark, -0.3)} opacity="0.6" />

          {/* núcleo de energia no peito, em formato de lua crescente, com anel de energia ao redor */}
          <circle cx="60" cy="86" r="11" fill="none" stroke={P.eye} strokeWidth="0.6" opacity="0.35" />
          <circle cx="60" cy="86" r="9.5" fill="#0b0e1d" />
          <circle ref={coreRef} cx="60" cy="86" r="6.5" fill={P.eye} style={{ animation:`nyx-antenna ${antennaSpeed} ease-in-out infinite`, filter:`drop-shadow(0 0 4px ${P.eye})` }} />
          <circle cx="63.2" cy="83.2" r="5.5" fill="#0b0e1d" />

          {/* pés */}
          <ellipse cx="50" cy="117" rx="8" ry="1.8" fill="#000" opacity="0.25" />
          <ellipse cx="70" cy="117" rx="8" ry="1.8" fill="#000" opacity="0.25" />
          <rect ref={footLRef} x="43" y="106" width="14" height="10" rx="5" fill={P.dark} />
          <rect ref={footRRef} x="63" y="106" width="14" height="10" rx="5" fill={P.dark} />
        </svg>
        </div>
      </div>
      {showName && (
        <>
          <div style={{ fontWeight:900, fontSize:15, letterSpacing:3, color:P.main, marginTop:2 }}>NYX</div>
          <div style={{ fontSize:11.5, color:"#a99ac9", marginTop:1 }}>{P.label}</div>
        </>
      )}
    </div>
  );
}

