import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

// ── NYX PRISMA ORBITAL: reskin visual do Nyx (cristal, anel orbital, olhos em lua) ──
// Mesmo contrato de props do NyxRobot atual (state/size/gear), pra poder trocar um pelo outro
// sem mexer no resto da plataforma. Reaproveita a MESMA lista de acessórios (NYX_ITEMS) — só a
// arte de cada acessório muda pra se encaixar nesse corpo facetado.
//
// Diferença estrutural importante: esse design não tem braço/mão (só cabeça + corpo flutuante
// com 2 pés). Os itens de "hand"/"shield" (espada, escudo, sorvete etc.) não têm onde ser
// "segurados" — em vez disso, flutuam do lado do corpo, no mesmo estilo dos fragmentos de
// cristal que já orbitam a criatura no design original (ela é uma criatura que levita objetos
// ao redor de si, não que segura com as mãos).
let __npoSeq = 0;
export function NyxPrismaOrbital({ state = "idle", size = 100, showName = true, gear }) {
  const G = { skin: null, head: null, face: null, neck: null, hand: null, shield: null, costas: null, ...(gear || {}) };
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = ++__npoSeq;
  const uid = "npo" + idRef.current;

  // "ok" é o nome usado no resto da plataforma pro estado de sucesso (mesmo valor que o NyxRobot
  // atual recebe) — aceita os dois pra ser um substituto plug-and-play
  const st = state === "ok" ? "success" : state;

  const MAP = {
    idle:     { main: "#7565de", dark: "#35296e", eye: "#eef1ff", cyan: "#68e8ff", pink: "#efa5ff", speed: 7, label: "Pronto para ajudar" },
    thinking: { main: "#7b68dd", dark: "#403078", eye: "#fff0af", cyan: "#ffd66e", pink: "#d8a7ff", speed: 4.3, label: "Analisando..." },
    success:  { main: "#5c75d7", dark: "#2e468d", eye: "#dffff4", cyan: "#70f2c2", pink: "#a9c6ff", speed: 7, label: "Tudo certo!" },
    error:    { main: "#a84f91", dark: "#5c2a54", eye: "#ffe3f2", cyan: "#ff93c6", pink: "#ffc1e2", speed: 7, label: "Encontrei algo!" },
  };
  // O Prisma Orbital atual continua padrão em agosto/2026. A evolução Modernizada assume
  // automaticamente em setembro para quem não tiver escolhido uma skin da loja.
  const defaultSkin = Date.now() >= new Date("2026-09-01T00:00:00-03:00").getTime() ? "skinModernizado" : null;
  const selectedSkin = G.skin || defaultSkin;
  const SKINS = {
    skinModernizado: { main:"#7868e5", dark:"#272144", eye:"#eef1ff", cyan:"#7ef0ff", pink:"#d8d0ff", label:"Nyx Modernizado" },
    skinLunar: { main:"#d8dcf3", dark:"#54499f", eye:"#ffffff", cyan:"#82eeff", pink:"#ffffff", label:"Tem novidade para você!" },
    skinEclipse: { main:"#6d4b91", dark:"#171020", eye:"#e8dcff", cyan:"#ba75ff", pink:"#ffd97c", label:"Recursos de IA em pausa" },
    skinOrbita: { main:"#6659d4", dark:"#181535", eye:"#eef7ff", cyan:"#6eeaff", pink:"#ad92ff", label:"Nyx Órbita" },
    skinGuardiao: { main:"#6651bd", dark:"#211a38", eye:"#fff3cc", cyan:"#d2bfff", pink:"#ffd47b", label:"Nyx Guardião" },
    skinAurora: { main:"#779be2", dark:"#17213d", eye:"#e8fff7", cyan:"#7fffe1", pink:"#e6a2ff", label:"Nyx Aurora" },
    skinLuaNova: { main:"#2a2e42", dark:"#080910", eye:"#eef1ff", cyan:"#dfe3ff", pink:"#8187a8", label:"Nyx Lua Nova" },
    skinMare: { main:"#397cc5", dark:"#0b1a35", eye:"#d8fbff", cyan:"#59dfff", pink:"#2cb7dd", label:"Nyx Maré" },
    skinConstelacao: { main:"#5048a0", dark:"#0e0d23", eye:"#fff3bd", cyan:"#8f84e7", pink:"#ffe19a", label:"Nyx Constelação" },
  };
  const P = { ...(MAP[st] || MAP.idle), ...(SKINS[selectedSkin] || {}) };

  const isSpartan = G.hand === "espada" && G.shield === "escudo";

  // as cores de humor NÃO podem ficar presas a {P.main/P.dark/...} no JSX — só o GSAP escreve
  // nelas (via useLayoutEffect, antes do navegador pintar, pra não piscar sem cor no 1º quadro).
  // Se o JSX também tivesse a cor nova, o React já pintaria o valor final antes do GSAP entrar,
  // e a "transição" viraria um no-op silencioso (troca seca) — mesmo bug já corrigido no NyxRobot.
  const shellMainRef = useRef(null);
  const shellDarkRef = useRef(null);
  const prismPinkRef = useRef(null);
  const prismCyanRef = useRef(null);
  const eyeStopRef = useRef(null);
  const orbitRingRef = useRef(null);
  const legsRef = useRef(null);
  const feetLineRef = useRef(null);
  const firstPaintRef = useRef(true);

  useLayoutEffect(() => {
    const firstPaint = firstPaintRef.current;
    firstPaintRef.current = false;
    const targets = [
      [shellMainRef.current, { attr: { "stop-color": P.main } }],
      [shellDarkRef.current, { attr: { "stop-color": P.dark } }],
      [prismPinkRef.current, { attr: { "stop-color": P.pink } }],
      [prismCyanRef.current, { attr: { "stop-color": P.cyan } }],
      [eyeStopRef.current, { attr: { "stop-color": P.eye } }],
      [orbitRingRef.current, { attr: { stroke: P.cyan } }],
      [legsRef.current, { attr: { stroke: P.dark } }],
      [feetLineRef.current, { attr: { stroke: P.dark } }],
    ];
    targets.forEach(([el, vars]) => {
      if (!el) return;
      if (firstPaint) gsap.set(el, vars);
      else gsap.to(el, { ...vars, duration: 0.65, ease: "power2.inOut" });
    });
  }, [st]);

  return (
    <div style={{ textAlign: "center", display: "inline-block" }}>
      <div style={{ width: size, height: size * (410 / 360), display: "inline-block" }}>
      <svg viewBox="0 0 360 410" width="100%" height="100%" style={{ overflow: "visible", animation: "npo-float 4s ease-in-out infinite" }}>
        <defs>
          <linearGradient id={uid + "shell"} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#b99cff" /><stop ref={shellMainRef} offset=".32" /><stop offset=".72" stopColor="#5541bd" /><stop ref={shellDarkRef} offset="1" />
          </linearGradient>
          <linearGradient id={uid + "prism"} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#ffd5fb" /><stop ref={prismPinkRef} offset=".28" /><stop offset=".62" stopColor="#8c78ff" /><stop ref={prismCyanRef} offset="1" />
          </linearGradient>
          <radialGradient id={uid + "eye"}>
            <stop stopColor="#fff" /><stop ref={eyeStopRef} offset=".62" /><stop offset="1" stopColor="#aab9ff" />
          </radialGradient>
          <radialGradient id={uid + "visor"}>
            <stop stopColor="#25223c" /><stop offset=".55" stopColor="#0b0a15" /><stop offset="1" stopColor="#05050b" />
          </radialGradient>
          <radialGradient id={uid + "crystal"} cx="30%" cy="24%">
            <stop stopColor="#fff" /><stop offset=".26" stopColor="#f4ceff" /><stop offset=".66" stopColor="#8f73f3" /><stop offset="1" stopColor="#39d9f1" />
          </radialGradient>
          <filter id={uid + "glow"} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id={uid + "soft"} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" /></filter>
          <linearGradient id={uid + "matGold"} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff6d0"/><stop offset=".4" stopColor="#ffd873"/><stop offset=".75" stopColor="#c8960a"/><stop offset="1" stopColor="#7a5a06"/></linearGradient>
          <linearGradient id={uid + "matBronze"} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffd9a8"/><stop offset=".5" stopColor="#cd7f32"/><stop offset="1" stopColor="#7a4a1a"/></linearGradient>
          <linearGradient id={uid + "matAmber"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff2c4"/><stop offset=".5" stopColor="#ffb020"/><stop offset="1" stopColor="#b3690a"/></linearGradient>
          <radialGradient id={uid + "matRuby"} cx="32%" cy="26%"><stop stopColor="#ffd7e2"/><stop offset=".4" stopColor="#ff4d7e"/><stop offset="1" stopColor="#7a0a34"/></radialGradient>
          <linearGradient id={uid + "matLeather"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#b3805c"/><stop offset=".55" stopColor="#7a4a2c"/><stop offset="1" stopColor="#432712"/></linearGradient>
          <linearGradient id={uid + "matCapeRed"} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ff8a8a"/><stop offset=".5" stopColor="#d62828"/><stop offset="1" stopColor="#6e0f0f"/></linearGradient>
          <linearGradient id={uid + "matSteel"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#eef2f7"/><stop offset=".5" stopColor="#9aa7b8"/><stop offset="1" stopColor="#4b5563"/></linearGradient>
          <linearGradient id={uid + "matSteelDark"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#5b6577"/><stop offset="1" stopColor="#232833"/></linearGradient>
        </defs>

        <ellipse cx="180" cy="374" rx="90" ry="15" fill="#000" opacity=".55" filter={`url(#${uid}soft)`} />
        <circle cx="180" cy="199" r="155" fill="#755be8" opacity=".07" />
        <g fill="#fefce8">
          <circle cx="45" cy="104" r="2" opacity=".8"><animate attributeName="opacity" values="0.2;1;0.2" dur="2.4s" repeatCount="indefinite" /></circle>
          <circle cx="307" cy="82" r="2.5" opacity=".6"><animate attributeName="opacity" values="1;0.2;1" dur="3.1s" repeatCount="indefinite" /></circle>
          <circle cx="38" cy="253" r="1.6" opacity=".7"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" repeatCount="indefinite" /></circle>
          <circle cx="315" cy="276" r="2" opacity=".7"><animate attributeName="opacity" values="1;0.3;1" dur="2.7s" repeatCount="indefinite" /></circle>
        </g>

        {/* detalhes de superfície das skins: ficam dentro/ao redor da mesma silhueta e nunca
            substituem cabeça, corpo, rosto, sensores, cauda ou encaixes de acessórios */}
        {selectedSkin === "skinLunar" && <g fill="#fff" opacity=".82"><circle cx="48" cy="104" r="3"/><circle cx="310" cy="91" r="2"/><path d="M55 258a15 15 0 1 0 14 23 12 12 0 1 1-14-23"/></g>}
        {selectedSkin === "skinEclipse" && <g><path d="M180 62h41q67 0 67 67v20q0 67-67 67h-41z" fill="#100d18" opacity=".44"/><circle cx="180" cy="281" r="31" fill="#09070d" opacity=".62"/></g>}
        {selectedSkin === "skinOrbita" && <g fill="#effcff"><circle cx="48" cy="245" r="8"/><circle cx="311" cy="244" r="5"/></g>}
        {selectedSkin === "skinGuardiao" && <path d="M122 230q58-28 116 0l-8 80q-50 29-100 0z" fill="#ffd47b" opacity=".12"/>}
        {selectedSkin === "skinAurora" && <path d="M75 114q105-73 210 0M95 88q85-47 170 0" fill="none" stroke={`url(#${uid}prism)`} strokeWidth="5" opacity=".65"/>}
        {selectedSkin === "skinLuaNova" && <g fill="#fff" opacity=".72"><circle cx="117" cy="82" r="2"/><circle cx="244" cy="108" r="2"/><circle cx="137" cy="245" r="2"/></g>}
        {selectedSkin === "skinMare" && <path d="M124 304q56 25 112 0" fill="none" stroke="#59dfff" strokeWidth="8" opacity=".28"/>}
        {selectedSkin === "skinConstelacao" && <g><g fill="#fff3bd"><circle cx="119" cy="81" r="3"/><circle cx="158" cy="69" r="3"/><circle cx="242" cy="107" r="3"/><circle cx="138" cy="245" r="3"/></g><path d="m119 81 39-12 84 38M138 245l42 36" fill="none" stroke="#ffe19a" strokeWidth="2" opacity=".6"/></g>}
        {selectedSkin === "skinModernizado" && <path d="M116 84q64-24 128 0" fill="none" stroke="#fff" strokeWidth="3" opacity=".35"/>}

        {/* anel orbital atrás do personagem */}
        <g transform="rotate(-9 180 244)" filter={`url(#${uid}glow)`}>
          <path ref={orbitRingRef} d="M48 244a132 39 0 1 0 264 0a132 39 0 1 0-264 0" fill="none" strokeWidth="2.5" strokeDasharray="11 9" opacity=".82" style={{ animation: "npo-orbit-flow 1.8s linear infinite" }} />
          <path d="M48 244a132 39 0 1 0 264 0a132 39 0 1 0-264 0" fill="none" stroke="#d9faff" strokeWidth=".7" opacity=".42" />
          <circle r="8" fill="#e8ddff" stroke={P.cyan} strokeWidth="2.5"><animateMotion dur={`${P.speed}s`} repeatCount="indefinite" path="M48 244a132 39 0 1 0 264 0a132 39 0 1 0-264 0" /></circle>
          <circle r="5.5" fill="#a887f2" stroke="#e4fbff" strokeWidth="1.7"><animateMotion dur={`${P.speed}s`} begin="-3.5s" repeatCount="indefinite" path="M48 244a132 39 0 1 0 264 0a132 39 0 1 0-264 0" /></circle>
        </g>
        {!G.shield && <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite" }}><path d="M63 286 43 306 70 302Z" fill={`url(#${uid}crystal)`} /></g>}
        {!G.hand && <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1.7s" }}><path d="m297 185 24-11-13 27Z" fill={`url(#${uid}crystal)`} /></g>}

        {/* cauda de energia */}
        <path d="M132 306c-69 8-98 65-51 64 38-1 39-42 12-38 21-25 56-11 67 7" fill="none" stroke={`url(#${uid}prism)`} strokeWidth="19" strokeLinecap="round" opacity=".66" filter={`url(#${uid}glow)`} style={{ transformOrigin: "132px 306px", animation: "npo-tail-sway 4.2s ease-in-out infinite" }} />

        {/* costas — renderiza atrás do corpo, como uma capa */}
        {G.costas === "capaHeroi" && <NpoCapaHeroi uid={uid} />}

        {/* corpo e pernas */}
        <path ref={legsRef} d="M132 263c-42 7-49 46-29 59 13 8 26-5 34-25M228 263c42 7 49 46 29 59-13 8-26-5-34-25" fill="none" strokeWidth="28" strokeLinecap="round" />
        <path ref={feetLineRef} d="M148 328v31M212 328v31" strokeWidth="32" strokeLinecap="round" />
        <ellipse cx="145" cy="365" rx="34" ry="17" fill="#241b50" stroke="#7d6ad0" strokeWidth="3" /><ellipse cx="215" cy="365" rx="34" ry="17" fill="#241b50" stroke="#7d6ad0" strokeWidth="3" />
        <rect x="121" y="220" width="118" height="120" rx="45" fill={`url(#${uid}shell)`} stroke="#d7c7ff" strokeWidth="4" />

        {/* orelhas/sensores prismáticos */}
        <path d="M82 146C28 121 40 67 69 42c31 26 49 55 51 86-11 15-23 21-38 18Z" fill={`url(#${uid}crystal)`} stroke="#e7d6ff" strokeWidth="5" opacity=".93" style={{ transformOrigin: "105px 139px", animation: "npo-sensor-left 7.8s ease-in-out infinite" }} />
        <path d="M278 146c54-25 42-79 13-104-31 26-49 55-51 86 11 15 23 21 38 18Z" fill={`url(#${uid}crystal)`} stroke="#e7d6ff" strokeWidth="5" opacity=".93" style={{ transformOrigin: "255px 139px", animation: "npo-sensor-right 8.4s ease-in-out infinite" }} />
        <path d="M69 55c23 26 36 49 38 72M291 55c-23 26-36 49-38 72" fill="none" stroke="#fff" strokeWidth="3" opacity=".55" />

        {/* cabeça facetada */}
        <rect x="72" y="62" width="216" height="154" rx="67" fill={`url(#${uid}shell)`} stroke="#d9caff" strokeWidth="5" />
        <path d="M109 111q71-29 142 0" fill="none" stroke="#fff" strokeWidth="4" opacity=".08" />

        {isSpartan ? <NpoElmoEspartano uid={uid} /> : (
          <>
            {G.head === "fone" && <NpoFone uid={uid} P={P} />}
            {G.head === "chapeu" && <NpoChapeu uid={uid} />}
            {G.head === "coroa" && <NpoCoroa uid={uid} />}
            {G.head === "chapeuPirata" && <NpoChapeuPirata uid={uid} />}
            {G.head === "touca" && <NpoTouca uid={uid} />}
            {G.head === "bone" && <NpoBone uid={uid} />}
            {G.head === "chapeuFesta" && <NpoChapeuFesta uid={uid} />}
            {G.head === "bandana" && <NpoBandana uid={uid} />}
            {G.head === "gorroNatal" && <NpoGorroNatal uid={uid} />}
            {G.head === "orelhinhas" && <NpoOrelhinhas uid={uid} P={P} />}
            {G.head === "tiara" && <NpoTiara uid={uid} />}
            {G.head === "capaceteObra" && <NpoCapaceteObra uid={uid} />}
            {G.head === "foneDJ" && <NpoFoneDJ uid={uid} />}
            {G.head === "chapeuMago" && <NpoChapeuMago uid={uid} />}
            {G.head === "capelo" && <NpoCapelo uid={uid} />}
            {G.head === "coroaPrismatica" && <NpoCoroaPrismatica uid={uid} />}
            {G.head === "haloOrbital" && <NpoHaloOrbital uid={uid} />}
          </>
        )}

        {/* antena lunar */}
        <g style={{ transformOrigin: "180px 64px", animation: "npo-antenna-sway 5.6s ease-in-out infinite" }}>
          <path d="M180 64c2-22-5-29 6-43 14-18 38-1 26 17" fill="none" stroke={`url(#${uid}prism)`} strokeWidth="8" strokeLinecap="round" />
          <circle cx="211" cy="29" r="19" fill="#8273e9" opacity=".25" filter={`url(#${uid}glow)`} />
          <circle cx="211" cy="29" r="13" fill={`url(#${uid}crystal)`} stroke="#fff" strokeWidth="2" style={{ animation: "npo-pulse 2s ease-in-out infinite" }} />
          <circle cx="207" cy="25" r="3" fill="#7566c7" opacity=".5" /><circle cx="216" cy="32" r="2.4" fill="#7566c7" opacity=".45" />
        </g>

        {/* colar/pescoço — acessório "neck" fica bem na costura entre cabeça e corpo; renderiza
            DEPOIS da cabeça (senão a cabeça pinta por cima e o acessório some) */}
        {G.neck === "laco" && <NpoLaco uid={uid} />}
        {G.neck === "gravataBorboleta" && <NpoGravata uid={uid} />}
        {G.neck === "cachecol" && <NpoCachecol uid={uid} />}
        {G.neck === "colarDev" && <NpoColarDev uid={uid} />}
        {G.neck === "medalha" && <NpoMedalha uid={uid} />}
        {G.neck === "golaSocial" && <NpoGolaSocial uid={uid} />}
        {G.neck === "colarHavaiano" && <NpoColarHavaiano />}
        {G.neck === "golaNucleo" && <NpoGolaNucleo uid={uid} />}

        {/* visor + olhos por estado */}
        <rect x="92" y="93" width="176" height="101" rx="45" fill={`url(#${uid}visor)`} stroke="#19162c" strokeWidth="6" />
        <path d="M109 111q71-29 142 0" fill="none" stroke="#fff" strokeWidth="4" opacity=".08" />

        {st === "idle" && (
          <g>
            <g style={{ transformOrigin: "180px 145px", animation: "npo-blink 5s infinite" }}>
              <ellipse cx="145" cy="144" rx="30" ry="37" fill={`url(#${uid}eye)`} /><ellipse cx="215" cy="144" rx="30" ry="37" fill={`url(#${uid}eye)`} />
              <g style={{ animation: "npo-idle-look 7s ease-in-out infinite" }}>
                <path d="M153 124a20 20 0 1 0 0 40 16 20 0 1 1 0-40" fill="#090812" /><path d="M223 124a20 20 0 1 0 0 40 16 20 0 1 1 0-40" fill="#090812" />
                <circle cx="139" cy="129" r="6" fill="#fff" /><circle cx="209" cy="129" r="6" fill="#fff" />
              </g>
            </g>
            <path d="M169 181q11 9 22 0" fill="none" stroke="#bbaef3" strokeWidth="3" strokeLinecap="round" opacity=".75" />
          </g>
        )}
        {st === "thinking" && (
          <g>
            <ellipse cx="145" cy="144" rx="30" ry="37" fill={`url(#${uid}eye)`} /><ellipse cx="215" cy="144" rx="30" ry="37" fill={`url(#${uid}eye)`} />
            <path d="M157 118a18 18 0 1 0 0 36 14 18 0 1 1 0-36" fill="#161024" /><path d="M227 118a18 18 0 1 0 0 36 14 18 0 1 1 0-36" fill="#161024" />
            <circle cx="148" cy="122" r="5" fill="#fff" /><circle cx="218" cy="122" r="5" fill="#fff" />
            <g style={{ transformOrigin: "220px 133px", animation: "npo-tiny-orbit 2.8s linear infinite" }}>
              <circle cx="220" cy="105" r="3" fill={P.cyan} /><path d="M220 95a10 10 0 1 1-10 10" fill="none" stroke={P.cyan} strokeWidth="1" strokeDasharray="2 3" />
            </g>
            <path d="M170 182q10-5 20 1" fill="none" stroke="#d8c8ff" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
        {st === "success" && (
          <g>
            <path d="M116 151q29-31 58 0M186 151q29-31 58 0" fill="none" stroke={P.eye} strokeWidth="13" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${P.cyan})` }} />
            <path d="M126 145q19-16 38 0M196 145q19-16 38 0" fill="none" stroke="#101022" strokeWidth="5" strokeLinecap="round" opacity=".7" />
            <path d="M163 174q17 22 34 0" fill="none" stroke={P.cyan} strokeWidth="4" strokeLinecap="round" filter={`url(#${uid}glow)`} />
            <circle cx="180" cy="184" r="2.5" fill="#fff" opacity=".8" />
          </g>
        )}
        {st === "error" && (
          <g>
            <ellipse cx="145" cy="147" rx="32" ry="39" fill={`url(#${uid}eye)`} /><ellipse cx="215" cy="147" rx="32" ry="39" fill={`url(#${uid}eye)`} />
            <path d="M153 130a16 18 0 1 0 0 36 13 18 0 1 1 0-36" fill="#291024" /><path d="M223 130a16 18 0 1 0 0 36 13 18 0 1 1 0-36" fill="#291024" />
            <circle cx="140" cy="135" r="5" fill="#fff" /><circle cx="210" cy="135" r="5" fill="#fff" />
            <path d="M116 119q22-17 44 1M244 119q-22-17-44 1" fill="none" stroke={P.cyan} strokeWidth="5" strokeLinecap="round" />
            <path d="M166 182q7-7 14 0t14 0" fill="none" stroke="#ffc6e5" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        )}

        {/* óculos por cima dos olhos (senão a esclera grande dos olhos cobre a armação) */}
        {G.face === "oculos" && <NpoOculos />}
        {G.face === "oculosNerd" && <NpoOculosNerd />}
        {G.face === "vendaPirata" && <NpoVendaPirata />}
        {G.face === "oculosAviador" && <NpoOculosAviador />}
        {G.face === "oculos3d" && <NpoOculos3d />}
        {G.face === "monoculo" && <NpoMonoculo />}
        {G.face === "mascaraHeroi" && <NpoMascaraHeroi uid={uid} />}
        {G.face === "viseiraHolografica" && <NpoViseiraHolografica uid={uid} />}
        {G.face === "brincosCristal" && <NpoBrincosCristal uid={uid} />}

        {/* capa Espartana (atrás do cristal e dos itens levitantes) */}
        {isSpartan && (
          <g opacity=".94">
            <defs><linearGradient id={uid + "capa"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#dc2626" /><stop offset="1" stopColor="#7a1010" /></linearGradient></defs>
            <path d="M132 250 Q90 300 108 366 L150 344 L180 240 Z" fill={`url(#${uid}capa)`} stroke="#5c1010" strokeWidth="1" />
            <path d="M228 250 Q270 300 252 366 L210 344 L180 240 Z" fill={`url(#${uid}capa)`} stroke="#5c1010" strokeWidth="1" opacity=".92" />
          </g>
        )}

        {/* cristal central */}
        <path d="M180 239 216 281 180 323 144 281Z" fill={`url(#${uid}crystal)`} stroke="#f6dbff" strokeWidth="4" filter={`url(#${uid}glow)`} />
        <path d="M180 239v84M144 281h72M180 239l-36 42 36-9 36 9Z" fill="none" stroke="#fff" strokeWidth="2" opacity=".58" />
        <circle cx="180" cy="281" r="22" fill="#151126" opacity=".7" />
        <path d="M188 261a23 23 0 1 0 0 40 19 19 0 1 1 0-40" fill="#fff3ca" style={{ animation: "npo-pulse 2s ease-in-out infinite" }} />

        {/* itens que levitam ao lado do corpo — substituem "segurar na mão", já que essa criatura
            não tem braço; ficam no mesmo espírito dos fragmentos de cristal que já orbitam ela */}
        {isSpartan ? (
          <NpoEspadaEscudoEspartano uid={uid} />
        ) : (
          <>
            {G.shield === "escudo" && <NpoEscudo uid={uid} />}
            {G.shield === "tampaPanela" && <NpoTampaPanela uid={uid} />}
            {G.shield === "placaStop" && <NpoPlacaStop />}
            {G.shield === "livroGrosso" && <NpoLivroGrosso />}
            {G.hand === "espada" && <NpoEspada uid={uid} />}
            {G.hand === "arco" && <NpoArco uid={uid} />}
            {G.hand === "sorvete" && <NpoSorvete uid={uid} />}
            {G.hand === "guardaChuva" && <NpoGuardaChuva uid={uid} />}
            {G.hand === "chaveInglesa" && <NpoChaveInglesa uid={uid} />}
            {G.hand === "bandeiraCorrida" && <NpoBandeiraCorrida uid={uid} />}
            {G.hand === "microfone" && <NpoMicrofone uid={uid} />}
            {G.hand === "martelo" && <NpoMartelo uid={uid} />}
            {G.hand === "grimorio" && <NpoGrimorio uid={uid} />}
            {G.hand === "varinha" && <NpoVarinha uid={uid} />}
            {G.hand === "tecladoMini" && <NpoTecladoMini uid={uid} />}
            {G.hand === "controle" && <NpoControle uid={uid} />}
            {G.hand === "trofeu" && <NpoTrofeu uid={uid} />}
          </>
        )}
      </svg>

      <style>{`
        @keyframes npo-float{50%{transform:translateY(-9px) rotate(1deg)}}
        @keyframes npo-orbit-flow{to{stroke-dashoffset:-42}}
        @keyframes npo-fragment-float{50%{transform:translateY(-6px) rotate(5deg)}}
        @keyframes npo-tiny-orbit{to{transform:rotate(360deg)}}
        @keyframes npo-pulse{50%{opacity:.66;filter:brightness(1.45)}}
        @keyframes npo-blink{0%,46%,50%,78%,82%,100%{transform:scaleY(1)}48%,80%{transform:scaleY(.08)}}
        @keyframes npo-idle-look{0%,18%,45%,100%{transform:translate(0)}25%,35%{transform:translate(5px,-2px)}55%,66%{transform:translate(-4px,1px)}}
        @keyframes npo-antenna-sway{0%,35%,100%{transform:rotate(0)}45%{transform:rotate(4deg)}55%{transform:rotate(-5deg)}65%{transform:rotate(2deg)}}
        @keyframes npo-tail-sway{0%,100%{transform:rotate(0) scaleY(1)}50%{transform:rotate(-5deg) scaleY(.94)}}
        @keyframes npo-sensor-left{0%,72%,100%{transform:rotate(0)}76%{transform:rotate(-5deg)}80%{transform:rotate(3deg)}}
        @keyframes npo-sensor-right{0%,78%,100%{transform:rotate(0)}82%{transform:rotate(5deg)}86%{transform:rotate(-3deg)}}
      `}</style>
      </div>
      {showName && (
        <>
          <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: 3, color: P.main, marginTop: 2 }}>NYX</div>
          <div style={{ fontSize: 11.5, color: "#a99ac9", marginTop: 1 }}>{P.label}</div>
        </>
      )}
    </div>
  );
}

// ── acessórios: cabeça ──
function NpoFone({ uid, P }) {
  return (
    <g><path d="M91 105Q97 52 144 43M269 105Q263 52 216 43" fill="none" stroke="#2b2544" strokeWidth="10"/><rect x="72" y="104" width="28" height="58" rx="12" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="260" y="104" width="28" height="58" rx="12" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M79 116h14M267 116h14" stroke="#68e8ff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="86" cy="144" r="6" fill={`url(#${uid}crystal)`}/><circle cx="274" cy="144" r="6" fill={`url(#${uid}crystal)`}/></g>
  );
}
function NpoChapeu({ uid }) {
  return (
    <g><ellipse cx="180" cy="76" rx="92" ry="17" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M124 75 133 10h94l9 65z" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M130 51h100v22H130z" fill={`url(#${uid}prism)`}/><path d="M146 25q34-15 68 0" fill="none" stroke="#fff" strokeWidth="4" opacity=".1"/></g>
  );
}
function NpoCoroa({ uid }) {
  return (
    <g><path d="M111 77 124 25l31 28 25-45 25 45 31-28 13 52z" fill="#ffd86a" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M113 73h134v18H113z" fill={`url(#${uid}prism)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="180" cy="22" r="8" fill={`url(#${uid}crystal)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="130" cy="40" r="5" fill="#68e8ff"/><circle cx="230" cy="40" r="5" fill="#efa5ff"/></g>
  );
}
function NpoChapeuPirata({ uid }) {
  return (
    <g><path d="M96 79q20-63 83-55 64-10 86 55-46-18-84-8-39-10-85 8z" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M111 77q67-23 138 0" fill="none" stroke="#d6c8ff" strokeWidth="9"/><path d="M180 41l8 12 14 3-10 10 2 14-14-7-14 7 2-14-10-10 14-3z" fill="#faf7ff"/><path d="M166 48l28 28M194 48l-28 28" stroke="#13101f" strokeWidth="3"/></g>
  );
}
function NpoOculos() {
  return (
    <g><path d="M105 126q34-14 67 2l-5 34q-32 25-56-4zM188 128q33-16 67-2l-6 32q-24 29-56 4z" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M169 133q11-7 22 0" fill="none" stroke="#cdbfff" strokeWidth="5"/><path d="M117 132q23-10 42 0M199 132q23-10 42 0" stroke="#fff" strokeWidth="3" opacity=".16"/></g>
  );
}
function NpoOculosNerd() {
  return (
    <g><circle cx="144" cy="145" r="37" fill="none" stroke="#211a37" strokeWidth="7"/><circle cx="216" cy="145" r="37" fill="none" stroke="#211a37" strokeWidth="7"/><path d="M181 143h-2M107 136 92 129M253 136l15-7" stroke="#211a37" strokeWidth="7" strokeLinecap="round"/></g>
  );
}

// ── acessórios: pescoço (na costura cabeça/corpo) ──
function NpoLaco({ uid }) {
  return (
    <g><path d="M180 222q-35-15-54 5 7 32 44 31zM180 222q35-15 54 5-7 32-44 31z" fill="#efa5ff" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="180" cy="234" r="12" fill={`url(#${uid}crystal)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="m173 245-14 33 21-11 21 11-14-33" fill="#efa5ff" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoGravata({ uid }) {
  return (
    <g><path d="m179 239-37-17-10 33 36 14zM181 239l37-17 10 33-36 14z" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="180" cy="247" r="12" fill={`url(#${uid}prism)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoCachecol({ uid }) {
  return (
    <g><path d="M126 217q54 26 108 0l-1 34q-53 20-106 0z" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M215 242q24 24 18 62l-27-13 7-22-17-17z" fill={`url(#${uid}prism)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M137 228q43 13 86 0" stroke="#fff" strokeWidth="3" opacity=".22"/></g>
  );
}
function NpoColarDev() {
  return (
    <g><path d="M138 217q42 25 84 0" fill="none" stroke="#cdbfff" strokeWidth="5"/><rect x="151" y="231" width="58" height="37" rx="8" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><text x="180" y="255" fill="#68e8ff" textAnchor="middle" fontSize="18" fontFamily="monospace" fontWeight="700">&lt;/&gt;</text></g>
  );
}
function NpoMedalha({ uid }) {
  return (
    <g><path d="M146 219 180 257 214 219" fill="none" stroke={`url(#${uid}prism)`} strokeWidth="10"/><circle cx="180" cy="270" r="24" fill="#ffd86a" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="m180 255 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill="#faf7ff"/></g>
  );
}

// ── itens levitantes (hand/shield) — flutuam ao lado do corpo, sem braço ──
function NpoEscudo({ uid }) {
  return (
    <g><path d="M38 259q40-21 80 0v51q-7 42-40 58-33-16-40-58z" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M78 267v83M49 292h58" stroke="#68e8ff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity=".75"/><path d="m78 279 9 17 19 3-14 13 4 19-18-9-17 9 3-19-13-13 18-3z" fill="none" stroke="#fff" strokeWidth="2" opacity=".3"/></g>
  );
}
function NpoEspada({ uid }) {
  return (
    <g><path d="M246 318 318 226" stroke="#eef8ff" strokeWidth="11" strokeLinecap="round"/><path d="m318 226 14-17 4 20-15 12z" fill="#68e8ff" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M239 307l27 22" stroke="#ffd86a" strokeWidth="8"/><path d="M248 320l-18 23" stroke="#4c3d78" strokeWidth="10"/><circle cx="244" cy="324" r="9" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoElmoEspartano({ uid }) {
  return (
    <g>
      <defs>
        <linearGradient id={uid + "crista"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fca5a5" /><stop offset=".5" stopColor="#dc2626" /><stop offset="1" stopColor="#7a1010" /></linearGradient>
        <linearGradient id={uid + "bronze"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#dcb877" /><stop offset=".5" stopColor="#a1783f" /><stop offset="1" stopColor="#6b4d24" /></linearGradient>
      </defs>
      <path d="M132 18 Q180 -32 228 18 L220 30 Q180 -6 140 30 Z" fill={`url(#${uid}crista)`} stroke="#5c1010" strokeWidth="2.5" />
      <ellipse cx="180" cy="10" rx="50" ry="10" fill="#f87171" />
      <path d="M72 62 Q180 8 288 62 L288 48 Q180 -2 72 48 Z" fill={`url(#${uid}bronze)`} stroke="#4a3418" strokeWidth="2.5" />
      <rect x="80" y="48" width="200" height="20" rx="7" fill={`url(#${uid}bronze)`} stroke="#4a3418" strokeWidth="2.5" />
    </g>
  );
}
function NpoEspadaEscudoEspartano({ uid }) {
  return (
    <g>
      <g transform="translate(48,246)"><g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite .4s" }}>
        <defs><linearGradient id={uid + "escudoE"} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e2e8f0" /><stop offset=".5" stopColor="#dc2626" /><stop offset="1" stopColor="#7a1010" /></linearGradient></defs>
        <path d="M0 0 Q0 -14 40 -22 Q80 -14 80 0 L80 40 Q80 74 40 94 Q0 74 0 40 Z" fill={`url(#${uid}escudoE)`} stroke="#3f1010" strokeWidth="4" />
        <path d="M40 -2 L52 20 L40 52 L28 20 Z" fill="#fde68a" stroke="#7a1010" strokeWidth="2.5" />
      </g></g>
      <g transform="translate(330,290) rotate(10)">
        <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
          <defs><linearGradient id={uid + "laminaE"} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#f8fafc" /><stop offset=".5" stopColor="#e2e8f0" /><stop offset="1" stopColor="#94a3b8" /></linearGradient></defs>
          <path d="M-6 -70 L6 -70 L6 10 L0 20 L-6 10 Z" fill={`url(#${uid}laminaE)`} stroke="#7c8a9c" strokeWidth="2" />
          <path d="M-24 10 Q0 3 24 10 L24 18 Q0 11 -24 18 Z" fill="#eab308" stroke="#8a5f08" strokeWidth="2" />
          <rect x="-6" y="18" width="12" height="26" rx="4" fill="#a06617" />
          <circle cx="0" cy="49" r="8" fill="#eab308" stroke="#8a5f08" strokeWidth="2" />
        </g>
      </g>
    </g>
  );
}

// ── acessórios: cabeça (lote 2) ──
function NpoTouca({ uid }) {
  return (
    <g><path d="M111 77q6-57 69-58 63 1 69 58z" fill={`url(#${uid}prism)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="106" y="68" width="148" height="27" rx="13" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="180" cy="16" r="13" fill={`url(#${uid}crystal)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M126 56q54-27 108 0" fill="none" stroke="#fff" strokeWidth="3" opacity=".25"/></g>
  );
}
function NpoBone({ uid }) {
  return (
    <g><path d="M109 77q11-49 71-49 51 1 65 40l-7 20H113z" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M205 72q51-11 78 12-44 18-85 3z" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M152 37h56l-8 18h-40z" fill={`url(#${uid}prism)`}/></g>
  );
}
function NpoChapeuFesta({ uid }) {
  return (
    <g><path d="M132 77 181 3l48 74z" fill={`url(#${uid}prism)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="181" cy="4" r="10" fill="#ffd86a" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="160" cy="47" r="5" fill="#68e8ff"/><circle cx="195" cy="30" r="5" fill="#efa5ff"/><path d="M142 64 213 37" stroke="#fff" strokeWidth="5" opacity=".45"/></g>
  );
}
function NpoBandana({ uid }) {
  return (
    <g><path d="M87 82q93-23 186 0l-6 24q-87-21-174 0z" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M145 78h70v27h-70z" fill="#cfd7ea" stroke="#2a2246" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M168 84q12-11 24 0-6 12-12 15-6-3-12-15z" fill={`url(#${uid}prism)`} stroke="#2a2246" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="m269 87 47-27-17 42 35 8-61 14z" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoGorroNatal({ uid }) {
  return (
    <g><path d="M104 78q17-53 70-54 57 2 78 44l-15 17z" fill="#d84f70" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M107 74q65-18 138 0" fill="none" stroke="#fff" strokeWidth="20" strokeLinecap="round"/><path d="M238 69q25-8 42 12" fill="none" stroke="#d84f70" strokeWidth="17"/><circle cx="280" cy="81" r="15" fill="#faf7ff" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoOrelhinhas({ uid, P }) {
  return (
    <g><path d="M105 79 121 22l50 42M255 79 239 22l-50 42" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="m124 39 25 24-30-9zM236 39l-25 24 30-9z" fill="#efa5ff" opacity=".7"/><path d="M128 79q52-18 104 0" fill="none" stroke="#bfaeff" strokeWidth="7"/></g>
  );
}
function NpoTiara({ uid }) {
  return (
    <g><path d="M114 80q66-41 132 0" fill="none" stroke="#e6dcff" strokeWidth="8"/><path d="m180 30 16 19-16 20-16-20z" fill={`url(#${uid}crystal)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="m145 48 10 12-10 12-10-12zM215 48l10 12-10 12-10-12z" fill={`url(#${uid}prism)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoCapaceteObra({ uid }) {
  return (
    <g><path d="M108 78q7-48 72-51 65 3 72 51z" fill="#f2bd38" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="96" y="72" width="168" height="22" rx="10" fill="#d99a24" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M180 31v42M145 37l8 36M215 37l-8 36" stroke="#fff1b2" strokeWidth="5" opacity=".65"/></g>
  );
}
function NpoFoneDJ({ uid }) {
  return (
    <g><path d="M95 111Q100 47 145 40M265 111Q260 47 215 40" fill="none" stroke={`url(#${uid}prism)`} strokeWidth="12"/><rect x="70" y="104" width="34" height="64" rx="14" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="256" y="104" width="34" height="64" rx="14" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="87" cy="137" r="11" fill="none" stroke="#68e8ff" strokeWidth="4"/><circle cx="273" cy="137" r="11" fill="none" stroke="#efa5ff" strokeWidth="4"/></g>
  );
}
function NpoChapeuMago({ uid }) {
  return (
    <g><path d="M92 83q41-23 75-14L190 0l55 68q29 2 47 15-99 23-200 0z" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M168 69 190 0l33 42-30 2z" fill={`url(#${uid}shell)`}/><circle cx="191" cy="27" r="6" fill="#68e8ff" style={{animation:"npo-pulse 2s ease-in-out infinite"}}/><path d="m224 60 5 9 10 2-7 7 2 10-10-5-9 5 2-10-7-7 10-2z" fill="#ffd86a"/></g>
  );
}
function NpoCapelo({ uid }) {
  return (
    <g><path d="m90 61 90-34 90 34-90 34z" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M126 77v23q54 18 108 0V77" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M268 61v49" stroke="#ffd86a" strokeWidth="4"/><circle cx="268" cy="115" r="7" fill="#ffd86a"/></g>
  );
}

// ── acessórios: rosto (lote 2) ──
function NpoVendaPirata() {
  return (
    <g><path d="M97 116q84 25 164 0" fill="none" stroke="#211a37" strokeWidth="5"/><path d="M115 122q28-20 57 0v43q-29 21-57 0z" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="m132 137 24 20M156 137l-24 20" stroke="#7f6fd6" strokeWidth="3"/></g>
  );
}
function NpoOculosAviador() {
  return (
    <g><path d="M105 127q31-12 62 1l-3 36q-24 24-49 0zM193 128q31-13 62-1l-10 37q-25 24-49 0z" fill="#241f35" fillOpacity=".93" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M166 132q14-8 28 0" fill="none" stroke="#ded4ff" strokeWidth="4"/><path d="M116 133q21-8 39-1M205 132q19-7 39 1" stroke="#68e8ff" strokeWidth="3" opacity=".45"/></g>
  );
}
function NpoOculos3d() {
  return (
    <g><rect x="105" y="119" width="65" height="51" rx="12" fill="#b64259" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="190" y="119" width="65" height="51" rx="12" fill="#327bc7" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M170 131h20" stroke="#eee" strokeWidth="6"/><path d="M115 129h45M200 129h45" stroke="#fff" strokeWidth="4" opacity=".18"/></g>
  );
}
function NpoMonoculo() {
  return (
    <g><circle cx="216" cy="143" r="39" fill="none" stroke="#ffd86a" strokeWidth="5"/><path d="M246 169q10 35 0 58" fill="none" stroke="#ffd86a" strokeWidth="3"/><circle cx="246" cy="228" r="4" fill="#ffd86a"/><path d="M204 126q15-7 25 0" stroke="#fff" strokeWidth="3" opacity=".28"/></g>
  );
}
function NpoMascaraHeroi({ uid }) {
  return (
    <g><path d="M103 116q77-28 154 0l-8 49q-32 19-68-7-36 26-70 7z" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity=".95"/><path d="M119 132q24-17 49 0-5 27-25 27-19 0-24-27zM192 132q25-17 49 0-5 27-24 27-20 0-25-27z" fill="#13101f"/><path d="M172 122l8-14 8 14" fill="none" stroke="#68e8ff" strokeWidth="4"/></g>
  );
}

// ── acessórios: pescoço (lote 2) ──
function NpoGolaSocial({ uid }) {
  return (
    <g><path d="m129 220 36 8 15 29-38-17zM231 220l-36 8-15 29 38-17z" fill="#faf7ff" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="m180 232 11 19-11 22-11-22z" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoColarHavaiano() {
  return (
    <g><path d="M132 220q48 54 96 0" fill="none" stroke="#66d49b" strokeWidth="7"/><g stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="148" cy="235" r="9" fill="#ff86c6"/><circle cx="165" cy="250" r="9" fill="#ffd86a"/><circle cx="180" cy="258" r="9" fill="#68e8ff"/><circle cx="195" cy="250" r="9" fill="#ff86c6"/><circle cx="212" cy="235" r="9" fill="#ffd86a"/></g></g>
  );
}

// ── itens levitantes: escudo (lote 2) ──
function NpoTampaPanela({ uid }) {
  return (
    <g><circle cx="75" cy="307" r="45" fill="#747c8c" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="75" cy="307" r="32" fill="#9ca5b5" stroke="#dce4f2" strokeWidth="3"/><path d="M43 338 14 366" stroke="#4c5261" strokeWidth="14" strokeLinecap="round"/><circle cx="75" cy="307" r="8" fill="#cfd7ea"/></g>
  );
}
function NpoPlacaStop() {
  return (
    <g><path d="m76 255 33 14 14 33-14 33-33 14-33-14-14-33 14-33z" fill="#d84f5d" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><text x="76" y="311" fill="#fff" textAnchor="middle" fontSize="22" fontWeight="900">STOP</text></g>
  );
}
function NpoLivroGrosso() {
  return (
    <g><path d="M25 267q51-18 102 0v82q-51-17-102 0z" fill="#3c3069" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M76 266v83" stroke="#fff" opacity=".38"/><path d="M38 286h27M38 299h31M86 286h28M86 299h24" stroke="#8cecff" strokeWidth="3"/><path d="M41 319h20M91 319h20" stroke="#efa5ff" strokeWidth="3"/></g>
  );
}

// ── itens levitantes: mão (lote 2) — todos ancorados perto de translate(300-330, 250-310),
// no mesmo espírito de "flutuar do lado" já validado com a espada ──
function NpoArco({ uid }) {
  return (
    <g><path d="M278 235q68 55 0 116" fill="none" stroke="#9f6e49" strokeWidth="8"/><path d="M278 235v116" stroke="#f3edff" strokeWidth="2"/><path d="M246 291h91" stroke="#dffaff" strokeWidth="4"/><path d="m337 291-14-8v16z" fill="#68e8ff"/><circle cx="246" cy="291" r="7" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoSorvete({ uid }) {
  return (
    <g><path d="m272 307 18 49 19-49z" fill="#c9905e" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="290" cy="297" r="20" fill="#efa5ff" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="302" cy="286" r="16" fill="#68e8ff" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="244" cy="320" r="9" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoGuardaChuva({ uid }) {
  return (
    <g><path d="M265 262q43-50 86 0z" fill={`url(#${uid}prism)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M308 261v78q0 20-17 13" fill="none" stroke="#e7dcff" strokeWidth="5"/><path d="M265 262q11-23 22 0 11-24 22 0 11-24 21 0 10-23 21 0" fill="none" stroke="#fff" strokeWidth="2" opacity=".45"/><circle cx="244" cy="321" r="9" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoChaveInglesa({ uid }) {
  return (
    <g><path d="M254 339 310 270q-10-19 5-33 3 14 17 16 13 1 20-12 6 21-13 31-9 5-18 1l-55 76z" fill="#cfd7ea" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="244" cy="321" r="9" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoBandeiraCorrida({ uid }) {
  return (
    <g><path d="M274 231v127" stroke="#e4def3" strokeWidth="6"/><path d="M279 235h66v45h-66z" fill="#faf7ff" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M279 235h16v15h-16M311 235h16v15h-16M295 250h16v15h-16M327 250h18v15h-18M279 265h16v15h-16M311 265h16v15h-16" fill="#13101f"/><circle cx="244" cy="321" r="9" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoMicrofone({ uid }) {
  return (
    <g><circle cx="305" cy="271" r="18" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M294 285 256 341" stroke="#b9a8ed" strokeWidth="9"/><path d="M293 266h25M292 273h26" stroke="#68e8ff" strokeWidth="2"/><circle cx="244" cy="321" r="9" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoMartelo({ uid }) {
  return (
    <g><path d="M257 340 306 277" stroke="#8a5f45" strokeWidth="11"/><path d="M282 254h67v33h-67z" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><text x="315" y="276" fill="#68e8ff" textAnchor="middle" fontSize="17" fontFamily="monospace" fontWeight="800">DEV</text><circle cx="244" cy="321" r="9" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoGrimorio({ uid }) {
  return (
    <g><path d="M249 282q31-16 61 0v62q-31-15-61 0z" fill="#322759" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M310 282q31-16 61 0v62q-31-15-61 0z" fill="#493978" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M310 282v62" stroke="#fff" opacity=".35"/><path d="m277 301 7 11 12 2-9 8 2 12" fill="none" stroke="#ffd86a" strokeWidth="3"/><circle cx="244" cy="321" r="9" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoVarinha({ uid }) {
  return (
    <g><path d="M256 341 314 274" stroke="#d8c8ff" strokeWidth="8"/><path d="m322 258 7 12 14 2-10 10 2 14-13-7-12 7 2-14-10-10 14-2z" fill="#ffd86a" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{animation:"npo-pulse 2s ease-in-out infinite"}}/><circle cx="244" cy="321" r="9" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoTecladoMini({ uid }) {
  return (
    <g><path d="m246 301 101-12 11 44-104 14z" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><g fill="#68e8ff"><circle cx="267" cy="313" r="3"/><circle cx="280" cy="311" r="3"/><circle cx="293" cy="309" r="3"/><circle cx="306" cy="308" r="3"/><circle cx="319" cy="306" r="3"/><circle cx="332" cy="304" r="3"/><rect x="269" y="325" width="55" height="5" rx="2"/></g><circle cx="244" cy="321" r="9" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoControle({ uid }) {
  return (
    <g><path d="M251 304q7-29 32-25h33q25-4 32 25l7 33q4 18-12 21-11 2-25-22h-38q-14 24-25 22-16-3-12-21z" fill="#13101f" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M269 306h25M281 294v25" stroke="#d8c8ff" strokeWidth="6"/><circle cx="326" cy="299" r="5" fill="#efa5ff"/><circle cx="338" cy="312" r="5" fill="#68e8ff"/><circle cx="244" cy="321" r="9" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}
function NpoTrofeu({ uid }) {
  return (
    <g><path d="M268 270h58v35q0 31-29 31t-29-31z" fill="#ffd86a" stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M269 280q-26-5-22 16 4 19 25 17M325 280q26-5 22 16-4 19-25 17" fill="none" stroke="#ffd86a" strokeWidth="7"/><path d="M297 336v16M277 358h40" stroke="#ffd86a" strokeWidth="8"/><circle cx="244" cy="321" r="9" fill={`url(#${uid}shell)`} stroke="#efe8ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>
  );
}

// ── acessórios: itens novos (materiais ricos) ──
function NpoCapaHeroi({ uid }) {
  return (
    <g><path d="M112 232 Q38 296 58 372 Q100 352 120 300 L140 258 Z" fill={`url(#${uid}matCapeRed)`} opacity=".95" stroke="#4a0a0a" strokeWidth="2.4"/>
          <path d="M248 232 Q322 296 302 372 Q260 352 240 300 L220 258 Z" fill={`url(#${uid}matCapeRed)`} opacity=".95" stroke="#4a0a0a" strokeWidth="2.4"/>
          <path d="M120 250 Q80 300 90 350" stroke="#fff" strokeWidth="1.4" opacity=".28" fill="none"/>
          <path d="M240 250 Q280 300 270 350" stroke="#fff" strokeWidth="1.4" opacity=".28" fill="none"/>
          <path d="M118 236 L142 232 L134 254 L114 250 Z" fill={`url(#${uid}matGold)`} stroke="#5a3a06" strokeWidth="1.6"/>
          <path d="M242 236 L218 232 L226 254 L246 250 Z" fill={`url(#${uid}matGold)`} stroke="#5a3a06" strokeWidth="1.6"/></g>
  );
}
function NpoGolaNucleo({ uid }) {
  return (
    <g><path d="M136 212 Q180 238 224 212 L224 224 Q180 250 136 224 Z" fill={`url(#${uid}matLeather)`} stroke="#2c1808" strokeWidth="2"/>
          <path d="M138 214 Q180 240 222 214" fill="none" stroke="#e0b083" strokeWidth="1.4" opacity=".4"/>
          <rect x="171" y="223" width="18" height="14" rx="3" fill={`url(#${uid}matBronze)`} stroke="#5a3a10" strokeWidth="1.6"/>
          <circle cx="180" cy="230" r="3" fill="#3a2410"/></g>
  );
}
function NpoBrincosCristal({ uid }) {
  return (
    <g><path d="M69 26 l4 8 h-8 Z" fill={`url(#${uid}matGold)`} stroke="#7a5a06" strokeWidth="1"/>
          <path d="M69 32 l9 13 -9 12 -9-12Z" fill={`url(#${uid}matRuby)`} stroke="#5c0826" strokeWidth="1.8"/>
          <path d="M291 26 l4 8 h-8 Z" fill={`url(#${uid}matGold)`} stroke="#7a5a06" strokeWidth="1"/>
          <path d="M291 32 l9 13 -9 12 -9-12Z" fill={`url(#${uid}matRuby)`} stroke="#5c0826" strokeWidth="1.8"/>
          <circle cx="66" cy="40" r="1.6" fill="#fff" opacity=".8"/><circle cx="288" cy="40" r="1.6" fill="#fff" opacity=".8"/></g>
  );
}
function NpoViseiraHolografica({ uid }) {
  return (
    <g><path d="M96 118 Q180 88 264 118" fill="none" stroke={`url(#${uid}matAmber)`} strokeWidth="7" opacity=".8" filter={`url(#${uid}glow)`}/>
          <path d="M100 120 Q180 94 260 120" fill="none" stroke="#fff" strokeWidth="1.6" opacity=".35"/>
          <path d="M96 170 Q180 194 264 170" fill="none" stroke="#ffb020" strokeWidth="2.2" opacity=".55"/></g>
  );
}
function NpoCoroaPrismatica({ uid }) {
  return (
    <g><path d="M120 62 L128 18 L153 40 L180 6 L207 40 L232 18 L240 62 Z" fill={`url(#${uid}matGold)`} stroke="#5a3a06" strokeWidth="3" strokeLinejoin="round"/>
          <path d="M124 58 L131 24" stroke="#fff7d6" strokeWidth="1.6" opacity=".5"/>
          <rect x="120" y="58" width="120" height="9" rx="3" fill={`url(#${uid}matGold)`} stroke="#5a3a06" strokeWidth="2.4"/>
          <circle cx="180" cy="16" r="9" fill={`url(#${uid}matRuby)`} stroke="#5c0826" strokeWidth="2.2"/>
          <circle cx="177" cy="13" r="2.4" fill="#fff" opacity=".8"/>
          <circle cx="153" cy="34" r="5" fill="#5eb8ff" stroke="#0e4a7a" strokeWidth="1"/>
          <circle cx="207" cy="34" r="5" fill="#5eb8ff" stroke="#0e4a7a" strokeWidth="1"/></g>
  );
}
function NpoHaloOrbital({ uid }) {
  return (
    <g><path d="M144 30 Q160 12 178 26 Q162 20 150 34 Q166 24 178 30" fill="none" stroke={`url(#${uid}matBronze)`} strokeWidth="4" strokeLinecap="round"/>
          <path d="M216 30 Q200 12 182 26 Q198 20 210 34 Q194 24 182 30" fill="none" stroke={`url(#${uid}matBronze)`} strokeWidth="4" strokeLinecap="round"/>
          <circle cx="180" cy="24" r="4" fill={`url(#${uid}matBronze)`} stroke="#5a3a1a" strokeWidth="1"/></g>
  );
}
