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
  const G = { head: null, face: null, neck: null, hand: null, shield: null, ...(gear || {}) };
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
  const P = MAP[st] || MAP.idle;

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
        </defs>

        <ellipse cx="180" cy="374" rx="90" ry="15" fill="#000" opacity=".55" filter={`url(#${uid}soft)`} />
        <circle cx="180" cy="199" r="155" fill="#755be8" opacity=".07" />
        <g fill="#fefce8">
          <circle cx="45" cy="104" r="2" opacity=".8"><animate attributeName="opacity" values="0.2;1;0.2" dur="2.4s" repeatCount="indefinite" /></circle>
          <circle cx="307" cy="82" r="2.5" opacity=".6"><animate attributeName="opacity" values="1;0.2;1" dur="3.1s" repeatCount="indefinite" /></circle>
          <circle cx="38" cy="253" r="1.6" opacity=".7"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" repeatCount="indefinite" /></circle>
          <circle cx="315" cy="276" r="2" opacity=".7"><animate attributeName="opacity" values="1;0.3;1" dur="2.7s" repeatCount="indefinite" /></circle>
        </g>

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
            {G.head === "bandana" && <NpoBandana />}
            {G.head === "gorroNatal" && <NpoGorroNatal uid={uid} />}
            {G.head === "orelhinhas" && <NpoOrelhinhas uid={uid} P={P} />}
            {G.head === "tiara" && <NpoTiara uid={uid} />}
            {G.head === "capaceteObra" && <NpoCapaceteObra uid={uid} />}
            {G.head === "foneDJ" && <NpoFoneDJ uid={uid} />}
            {G.head === "chapeuMago" && <NpoChapeuMago uid={uid} />}
            {G.head === "capelo" && <NpoCapelo uid={uid} />}
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
        {G.neck === "golaSocial" && <NpoGolaSocial />}
        {G.neck === "colarHavaiano" && <NpoColarHavaiano />}

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
            {G.hand === "sorvete" && <NpoSorvete />}
            {G.hand === "guardaChuva" && <NpoGuardaChuva uid={uid} />}
            {G.hand === "chaveInglesa" && <NpoChaveInglesa />}
            {G.hand === "bandeiraCorrida" && <NpoBandeiraCorrida />}
            {G.hand === "microfone" && <NpoMicrofone uid={uid} />}
            {G.hand === "martelo" && <NpoMartelo uid={uid} />}
            {G.hand === "grimorio" && <NpoGrimorio uid={uid} />}
            {G.hand === "varinha" && <NpoVarinha uid={uid} />}
            {G.hand === "tecladoMini" && <NpoTecladoMini />}
            {G.hand === "controle" && <NpoControle />}
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
    <g>
      <defs><linearGradient id={uid + "fone"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3a4152" /><stop offset="1" stopColor="#181b24" /></linearGradient></defs>
      <path d="M70 112 Q180 12 290 112" stroke="#14161e" strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d="M70 112 Q180 12 290 112" stroke="#454e63" strokeWidth="6" fill="none" strokeLinecap="round" opacity=".7" />
      <rect x="46" y="92" width="46" height="62" rx="20" fill={`url(#${uid}fone)`} stroke="#0e0f14" strokeWidth="2" />
      <rect x="56" y="102" width="26" height="42" rx="13" fill={P.main} />
      <rect x="268" y="92" width="46" height="62" rx="20" fill={`url(#${uid}fone)`} stroke="#0e0f14" strokeWidth="2" />
      <rect x="278" y="102" width="26" height="42" rx="13" fill={P.main} />
    </g>
  );
}
function NpoChapeu({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "chapeu"} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#241c3c" /><stop offset=".5" stopColor="#372b5c" /><stop offset="1" stopColor="#241c3c" /></linearGradient></defs>
      <ellipse cx="180" cy="60" rx="70" ry="13" fill="#12102080" />
      <ellipse cx="180" cy="58" rx="70" ry="13" fill={`url(#${uid}chapeu)`} stroke="#8b83b0" strokeWidth="2.5" />
      <path d="M140 58 L144 6 Q180 -6 216 6 L220 58 Z" fill={`url(#${uid}chapeu)`} stroke="#8b83b0" strokeWidth="2.5" />
      <ellipse cx="180" cy="8" rx="38" ry="8" fill="#4a3d78" />
      <rect x="142" y="35" width="76" height="15" fill="#7565de" />
      <rect x="142" y="35" width="76" height="5" fill="#ffffff" opacity=".25" />
    </g>
  );
}
function NpoCoroa({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "coroa"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fde68a" /><stop offset=".55" stopColor="#fbbf24" /><stop offset="1" stopColor="#d99b0d" /></linearGradient></defs>
      <path d="M118 58 L118 20 L146 40 L180 6 L214 40 L242 20 L242 58 Z" fill={`url(#${uid}coroa)`} stroke="#a9720a" strokeWidth="3.5" />
      <rect x="118" y="50" width="124" height="15" rx="6" fill={`url(#${uid}coroa)`} stroke="#a9720a" strokeWidth="2.5" />
      <rect x="118" y="50" width="124" height="5" rx="2" fill="#fff7d6" opacity=".5" />
      <circle cx="180" cy="24" r="7" fill="#ef4444" stroke="#7a1010" strokeWidth="2" />
      <circle cx="146" cy="42" r="5" fill="#22d3ee" stroke="#0e7490" strokeWidth="1.5" />
      <circle cx="214" cy="42" r="5" fill="#22d3ee" stroke="#0e7490" strokeWidth="1.5" />
    </g>
  );
}
function NpoChapeuPirata({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "pirata"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#332720" /><stop offset="1" stopColor="#161009" /></linearGradient></defs>
      <path d="M92 62 Q180 -4 268 62 Q244 84 180 76 Q116 84 92 62 Z" fill={`url(#${uid}pirata)`} stroke="#000" strokeWidth="2.5" />
      <circle cx="180" cy="38" r="10" fill="#f1f2f4" stroke="#111" strokeWidth="1.5" />
      <path d="M172 36 L180 48 L188 36" stroke="#111" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  );
}
function NpoOculos() {
  return (
    <g>
      <path d="M95 138 L110 138 M250 138 M235 138" stroke="#1f2430" strokeWidth="6" strokeLinecap="round" />
      <rect x="110" y="122" width="56" height="38" rx="18" fill="#0d0f18" stroke="#2a3040" strokeWidth="4" />
      <rect x="194" y="122" width="56" height="38" rx="18" fill="#0d0f18" stroke="#2a3040" strokeWidth="4" />
      <path d="M166 140 Q180 132 194 140" stroke="#2a3040" strokeWidth="6" fill="none" />
      <path d="M120 133 q11 -9 24 0" stroke="#8be9fd" strokeWidth="4" opacity=".55" fill="none" strokeLinecap="round" />
      <path d="M204 133 q11 -9 24 0" stroke="#8be9fd" strokeWidth="4" opacity=".55" fill="none" strokeLinecap="round" />
    </g>
  );
}
function NpoOculosNerd() {
  return (
    <g>
      <circle cx="138" cy="140" r="26" fill="#0d0f18" stroke="#1f2430" strokeWidth="6" />
      <circle cx="222" cy="140" r="26" fill="#0d0f18" stroke="#1f2430" strokeWidth="6" />
      <path d="M164 140 L196 140" stroke="#1f2430" strokeWidth="6" />
      <rect x="169" y="134" width="12" height="8" fill="#e5e7eb" opacity=".6" />
    </g>
  );
}

// ── acessórios: pescoço (na costura cabeça/corpo) ──
function NpoLaco({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "laco"} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f9a8d4" /><stop offset="1" stopColor="#db2777" /></linearGradient></defs>
      <path d="M180 214 Q160 200 150 206 Q145 212 150 220 Q160 228 180 214 Z" fill={`url(#${uid}laco)`} stroke="#a8135c" strokeWidth="2" />
      <path d="M180 214 Q200 200 210 206 Q215 212 210 220 Q200 228 180 214 Z" fill={`url(#${uid}laco)`} stroke="#a8135c" strokeWidth="2" />
      <circle cx="180" cy="214" r="7" fill="#db2777" stroke="#a8135c" strokeWidth="1.5" />
    </g>
  );
}
function NpoGravata() {
  return (
    <g>
      <path d="M180 214 Q164 202 156 208 Q152 214 156 220 Q164 226 180 214 Z" fill="#1f2430" stroke="#0b0e1d" strokeWidth="2" />
      <path d="M180 214 Q196 202 204 208 Q208 214 204 220 Q196 226 180 214 Z" fill="#1f2430" stroke="#0b0e1d" strokeWidth="2" />
      <rect x="173" y="208" width="14" height="14" rx="3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.5" />
    </g>
  );
}
function NpoCachecol({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "cach"} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#fda4af" /><stop offset="1" stopColor="#e11d48" /></linearGradient></defs>
      <rect x="140" y="204" width="80" height="20" rx="8" fill={`url(#${uid}cach)`} stroke="#9f1239" strokeWidth="2" />
      <rect x="158" y="220" width="16" height="34" rx="4" fill={`url(#${uid}cach)`} stroke="#9f1239" strokeWidth="2" />
    </g>
  );
}
function NpoColarDev() {
  return (
    <g>
      <path d="M148 212 Q180 232 212 212" fill="none" stroke="#3b2a58" strokeWidth="5" strokeLinecap="round" />
      <rect x="164" y="222" width="32" height="16" rx="4" fill="#171026" stroke="#c084fc" strokeWidth="2" />
      <text x="180" y="234" fontSize="11" fill="#c084fc" textAnchor="middle" fontFamily="monospace" fontWeight="700">{"</>"}</text>
    </g>
  );
}
function NpoMedalha() {
  return (
    <g>
      <path d="M155 210 L180 226 L205 210" fill="none" stroke="#c084fc" strokeWidth="5" strokeLinecap="round" />
      <circle cx="180" cy="236" r="13" fill="#fbbf24" stroke="#a16207" strokeWidth="2.5" />
      <circle cx="180" cy="236" r="7" fill="#fde68a" />
    </g>
  );
}

// ── itens levitantes (hand/shield) — flutuam ao lado do corpo, sem braço ──
function NpoEscudo({ uid }) {
  return (
    <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite .4s" }}>
      <defs><linearGradient id={uid + "escudo"} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e2e8f0" /><stop offset=".5" stopColor="#94a3b8" /><stop offset="1" stopColor="#5c6b81" /></linearGradient></defs>
      <path d="M50 254 Q50 240 90 232 Q130 240 130 254 L130 292 Q130 322 90 340 Q50 322 50 292 Z" fill={`url(#${uid}escudo)`} stroke="#3f4b5c" strokeWidth="4" />
      <path d="M90 250 L102 274 L90 306 L78 274 Z" fill="#7565de" stroke="#35296e" strokeWidth="2.5" />
    </g>
  );
}
function NpoEspada({ uid }) {
  return (
    <g transform="translate(322,300) rotate(10)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <defs>
          <linearGradient id={uid + "lamina"} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#f8fafc" /><stop offset=".5" stopColor="#e2e8f0" /><stop offset="1" stopColor="#94a3b8" /></linearGradient>
          <linearGradient id={uid + "cabo"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a06617" /><stop offset="1" stopColor="#5c3a0d" /></linearGradient>
        </defs>
        <path d="M-6 -70 L6 -70 L6 10 L0 20 L-6 10 Z" fill={`url(#${uid}lamina)`} stroke="#7c8a9c" strokeWidth="2" />
        <line x1="0" y1="-64" x2="0" y2="6" stroke="#fff" strokeWidth="1.4" opacity=".6" />
        <path d="M-24 10 Q0 3 24 10 L24 18 Q0 11 -24 18 Z" fill="#eab308" stroke="#8a5f08" strokeWidth="2" />
        <rect x="-6" y="18" width="12" height="26" rx="4" fill={`url(#${uid}cabo)`} />
        <circle cx="0" cy="49" r="8" fill="#eab308" stroke="#8a5f08" strokeWidth="2" />
      </g>
    </g>
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
    <g>
      <defs><linearGradient id={uid + "touca"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fda4af" /><stop offset="1" stopColor="#e11d48" /></linearGradient></defs>
      <path d="M92 60 Q92 4 180 4 Q268 4 268 60 Z" fill={`url(#${uid}touca)`} stroke="#9f1239" strokeWidth="3" />
      <rect x="86" y="46" width="188" height="20" rx="10" fill="#fecdd3" stroke="#9f1239" strokeWidth="3" />
      <circle cx="180" cy="4" r="13" fill="#fecdd3" stroke="#9f1239" strokeWidth="3" />
      <path d="M118 22 Q180 8 242 22" stroke="#fff" strokeWidth="3" opacity=".3" fill="none" />
    </g>
  );
}
function NpoBone({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "bone"} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#60a5fa" /><stop offset="1" stopColor="#1d4ed8" /></linearGradient></defs>
      <path d="M96 60 Q96 8 180 8 Q264 8 264 60 Z" fill={`url(#${uid}bone)`} stroke="#1e3a8a" strokeWidth="3" />
      <path d="M180 8 L180 60 M136 12 Q136 38 130 60 M224 12 Q224 38 230 60" stroke="#1e3a8a" strokeWidth="2" opacity=".35" fill="none" />
      <path d="M246 46 Q296 42 306 62 Q300 74 244 66 Z" fill="#1e40af" stroke="#152a63" strokeWidth="3" />
      <circle cx="180" cy="10" r="5" fill="#1e3a8a" />
      <path d="M118 22 Q180 8 242 22" stroke="#fff" strokeWidth="3.5" opacity=".3" fill="none" />
    </g>
  );
}
function NpoChapeuFesta({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "festa"} x1="0" y1="1" x2="0" y2="0"><stop stopColor="#f472b6" /><stop offset="1" stopColor="#a21caf" /></linearGradient></defs>
      <path d="M144 60 L180 -30 L216 60 Z" fill={`url(#${uid}festa)`} stroke="#7e22ce" strokeWidth="3" />
      <circle cx="156" cy="48" r="5" fill="#fde047" /><circle cx="192" cy="34" r="5" fill="#22d3ee" /><circle cx="171" cy="20" r="5" fill="#fde047" />
      <circle cx="180" cy="-30" r="9" fill="#fde047" stroke="#a16207" strokeWidth="2.5" />
    </g>
  );
}
function NpoBandana() {
  return (
    <g>
      <rect x="72" y="48" width="216" height="24" rx="6" fill="#1f2430" stroke="#0b0e1d" strokeWidth="3" />
      <rect x="72" y="48" width="216" height="7" rx="3" fill="#3a4152" opacity=".6" />
      <circle cx="180" cy="60" r="7" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
      <path d="M288 54 Q320 60 310 84 Q298 66 280 66 Z" fill="#1f2430" stroke="#0b0e1d" strokeWidth="2.5" />
      <path d="M288 63 Q312 76 296 96 Q290 76 274 76 Z" fill="#2b3242" stroke="#0b0e1d" strokeWidth="2.5" />
    </g>
  );
}
function NpoGorroNatal({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "natal"} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f87171" /><stop offset="1" stopColor="#b91c1c" /></linearGradient></defs>
      <path d="M96 60 Q100 4 186 -6 Q270 10 258 54 Q180 22 96 60 Z" fill={`url(#${uid}natal)`} stroke="#7f1d1d" strokeWidth="3" />
      <rect x="90" y="48" width="180" height="20" rx="10" fill="#fff" stroke="#e5e7eb" strokeWidth="2.5" />
      <circle cx="264" cy="48" r="13" fill="#fff" stroke="#e5e7eb" strokeWidth="2.5" />
    </g>
  );
}
function NpoOrelhinhas({ uid, P }) {
  return (
    <g>
      <path d="M108 66 L96 12 L144 48 Z" fill={P.dark} stroke="#241a4a" strokeWidth="3" />
      <path d="M114 54 L108 24 L132 42 Z" fill="#f9a8d4" />
      <path d="M252 66 L264 12 L216 48 Z" fill={P.dark} stroke="#241a4a" strokeWidth="3" />
      <path d="M246 54 L252 24 L228 42 Z" fill="#f9a8d4" />
    </g>
  );
}
function NpoTiara({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "tiara"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fef9c3" /><stop offset="1" stopColor="#eab308" /></linearGradient></defs>
      <path d="M114 60 Q180 24 246 60" stroke={`url(#${uid}tiara)`} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M156 39 L180 12 L204 39" stroke={`url(#${uid}tiara)`} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="180" cy="18" r="8" fill="#67e8f9" stroke="#0e7490" strokeWidth="2" />
    </g>
  );
}
function NpoCapaceteObra({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "obra"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fde047" /><stop offset="1" stopColor="#ca8a04" /></linearGradient></defs>
      <path d="M93 58 Q93 6 180 6 Q267 6 267 58 Z" fill={`url(#${uid}obra)`} stroke="#854d0e" strokeWidth="3" />
      <ellipse cx="180" cy="58" rx="87" ry="12" fill={`url(#${uid}obra)`} stroke="#854d0e" strokeWidth="3" />
      <rect x="156" y="27" width="48" height="12" rx="6" fill="#fef08a" opacity=".8" />
    </g>
  );
}
function NpoFoneDJ({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "foneDJ"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f0abfc" /><stop offset="1" stopColor="#a21caf" /></linearGradient></defs>
      <path d="M60 120 Q180 6 300 120" stroke="#0b0e1d" strokeWidth="16" fill="none" strokeLinecap="round" />
      <rect x="36" y="96" width="50" height="66" rx="22" fill={`url(#${uid}foneDJ)`} stroke="#701a75" strokeWidth="2.5" />
      <rect x="274" y="96" width="50" height="66" rx="22" fill={`url(#${uid}foneDJ)`} stroke="#701a75" strokeWidth="2.5" />
      <circle cx="61" cy="129" r="9" fill="#fdf4ff" opacity=".6" /><circle cx="299" cy="129" r="9" fill="#fdf4ff" opacity=".6" />
    </g>
  );
}
function NpoChapeuMago({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "mago"} x1="0" y1="1" x2="0" y2="0"><stop stopColor="#818cf8" /><stop offset="1" stopColor="#3730a3" /></linearGradient></defs>
      <ellipse cx="180" cy="63" rx="78" ry="13" fill={`url(#${uid}mago)`} stroke="#312e81" strokeWidth="3" />
      <path d="M150 63 Q138 -12 198 -48 Q186 12 210 63 Z" fill={`url(#${uid}mago)`} stroke="#312e81" strokeWidth="3" />
      <circle cx="189" cy="0" r="4" fill="#fde047" /><circle cx="174" cy="30" r="3" fill="#fde047" />
      <path d="M198 -48 l3.6 -6.6 l3.6 6.6 l6.6 3.6 l-6.6 3.6 l-3.6 6.6 l-3.6 -6.6 l-6.6 -3.6 Z" fill="#fde047" />
    </g>
  );
}
function NpoCapelo({ uid }) {
  return (
    <g>
      <rect x="102" y="45" width="156" height="18" rx="4.5" fill="#1f2430" stroke="#0b0e1d" strokeWidth="3" />
      <path d="M66 48 L180 12 L294 48 L180 78 Z" fill="#1f2430" stroke="#0b0e1d" strokeWidth="3" />
      <circle cx="180" cy="42" r="6" fill="#fbbf24" stroke="#a16207" strokeWidth="2" />
      <path d="M180 42 Q234 54 228 90" stroke="#fbbf24" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="228" cy="93" r="8" fill="#fbbf24" stroke="#a16207" strokeWidth="2" />
    </g>
  );
}

// ── acessórios: rosto (lote 2) ──
function NpoVendaPirata() {
  return (
    <g>
      <path d="M92 108 L268 96" stroke="#1f2430" strokeWidth="6" strokeLinecap="round" />
      <path d="M92 132 L180 165" stroke="#1f2430" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="145" cy="126" rx="32" ry="27" fill="#171026" stroke="#0b0e1d" strokeWidth="4" />
      <ellipse cx="136" cy="117" rx="9" ry="6" fill="#3b2a58" opacity=".5" />
    </g>
  );
}
function NpoOculosAviador() {
  return (
    <g>
      <path d="M92 114 L110 114 M250 114 L268 114" stroke="#3a2a12" strokeWidth="7" strokeLinecap="round" />
      <path d="M110 100 Q140 90 168 108 Q150 144 120 144 Q102 132 110 100 Z" fill="#1a1206" stroke="#7c5a1e" strokeWidth="4" />
      <path d="M192 108 Q220 90 250 100 Q258 132 240 144 Q210 144 192 108 Z" fill="#1a1206" stroke="#7c5a1e" strokeWidth="4" />
      <path d="M168 108 Q180 100 192 108" stroke="#7c5a1e" strokeWidth="5" fill="none" />
      <path d="M118 108 q9 -7.5 21 0" stroke="#fde68a" strokeWidth="3.5" opacity=".5" fill="none" strokeLinecap="round" />
    </g>
  );
}
function NpoOculos3d() {
  return (
    <g>
      <path d="M92 138 L108 138 M252 138 L268 138" stroke="#e5e7eb" strokeWidth="6" strokeLinecap="round" />
      <rect x="108" y="122" width="58" height="34" rx="8" fill="#ef4444" opacity=".75" stroke="#fff" strokeWidth="4" />
      <rect x="194" y="122" width="58" height="34" rx="8" fill="#22d3ee" opacity=".75" stroke="#fff" strokeWidth="4" />
      <path d="M166 139 L194 139" stroke="#fff" strokeWidth="6" />
    </g>
  );
}
function NpoMonoculo() {
  return (
    <g>
      <circle cx="212" cy="140" r="26" fill="none" stroke="#eab308" strokeWidth="6" />
      <circle cx="212" cy="140" r="20" fill="#8be9fd" opacity=".15" />
      <path d="M212 166 Q208 182 188 186" stroke="#eab308" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="228" cy="126" r="4" fill="#fff" opacity=".7" />
    </g>
  );
}
function NpoMascaraHeroi({ uid }) {
  return (
    <g>
      <defs><linearGradient id={uid + "mascara"} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#60a5fa" /><stop offset="1" stopColor="#1d4ed8" /></linearGradient></defs>
      <path d="M84 100 Q180 78 276 100 Q276 138 234 144 Q180 128 126 144 Q84 138 84 100 Z" fill={`url(#${uid}mascara)`} stroke="#1e3a8a" strokeWidth="3.5" opacity=".93" />
      <path d="M108 104 Q180 90 252 104" stroke="#bfdbfe" strokeWidth="3" opacity=".4" fill="none" />
      <path d="M84 100 L60 88 M276 100 L300 88" stroke="#1e3a8a" strokeWidth="4.5" strokeLinecap="round" />
    </g>
  );
}

// ── acessórios: pescoço (lote 2) ──
function NpoGolaSocial() {
  return (
    <g>
      <path d="M138 205 L180 232 L222 205 L222 224 L180 250 L138 224 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2.5" />
      <path d="M180 232 L180 250" stroke="#cbd5e1" strokeWidth="2" />
    </g>
  );
}
function NpoColarHavaiano() {
  const flores = [
    ["#f472b6", 150, 214], ["#fde047", 165, 224], ["#4ade80", 180, 227], ["#22d3ee", 195, 224], ["#f472b6", 210, 214],
  ];
  return (
    <g>
      <path d="M140 208 Q180 244 220 208" fill="none" stroke="#4ade80" strokeWidth="8" strokeLinecap="round" />
      {flores.map(([c, x, y], i) => <circle key={i} cx={x} cy={y} r="8" fill={c} stroke="#fff" strokeWidth="1.5" />)}
    </g>
  );
}

// ── itens levitantes: escudo (lote 2) ──
function NpoTampaPanela({ uid }) {
  return (
    <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite .4s" }}>
      <ellipse cx="70" cy="272" rx="32" ry="29" fill="#cbd5e1" stroke="#64748b" strokeWidth="3" />
      <ellipse cx="70" cy="262" rx="24" ry="21" fill="#e2e8f0" opacity=".5" />
      <rect x="58" y="234" width="24" height="15" rx="7" fill="#94a3b8" stroke="#475569" strokeWidth="2.5" />
      <circle cx="70" cy="231" r="7" fill="#94a3b8" stroke="#475569" strokeWidth="2.5" />
    </g>
  );
}
function NpoPlacaStop() {
  return (
    <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite .4s" }}>
      <path d="M46 232 L94 232 L114 252 L114 292 L94 312 L46 312 L26 292 L26 252 Z" fill="#ef4444" stroke="#fff" strokeWidth="4.5" />
      <text x="70" y="279" fontSize="19" fontWeight="900" fill="#fff" textAnchor="middle" dominantBaseline="central" fontFamily="Arial, sans-serif">STOP</text>
    </g>
  );
}
function NpoLivroGrosso() {
  return (
    <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite .4s" }}>
      <rect x="26" y="228" width="72" height="78" rx="5" fill="#7c2d12" stroke="#431407" strokeWidth="3" />
      <rect x="32" y="234" width="60" height="66" fill="#fef3c7" />
      <path d="M40 242 L84 242 M40 250 L78 250 M40 258 L84 258 M40 266 L76 266 M40 274 L84 274" stroke="#c2884a" strokeWidth="2" opacity=".5" />
      <rect x="26" y="228" width="12" height="78" fill="#9a3412" />
    </g>
  );
}

// ── itens levitantes: mão (lote 2) — todos ancorados perto de translate(300-330, 250-310),
// no mesmo espírito de "flutuar do lado" já validado com a espada ──
function NpoArco({ uid }) {
  return (
    <g transform="translate(320,280) rotate(6)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <defs><linearGradient id={uid + "arco"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a1783f" /><stop offset="1" stopColor="#6b4d24" /></linearGradient></defs>
        <path d="M0 -58 Q26 0 0 58" fill="none" stroke={`url(#${uid}arco)`} strokeWidth="7" strokeLinecap="round" />
        <line x1="0" y1="-58" x2="0" y2="58" stroke="#e5e7eb" strokeWidth="1.6" />
        <path d="M-2 0 L-34 0" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <path d="M-34 0 L-20 -5 L-20 5 Z" fill="#94a3b8" />
      </g>
    </g>
  );
}
function NpoSorvete() {
  return (
    <g transform="translate(320,290)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <path d="M-16 0 L16 0 L0 42 Z" fill="#d6a06b" />
        <path d="M-16 0 L16 0 L12 -6 L-12 -6 Z" fill="#b8875a" />
        <circle cx="0" cy="-16" r="20" fill="#fda4af" />
        <circle cx="-10" cy="-30" r="15" fill="#fef08a" />
        <circle cx="10" cy="-30" r="15" fill="#a7f3d0" />
      </g>
    </g>
  );
}
function NpoGuardaChuva({ uid }) {
  return (
    <g transform="translate(320,280)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <defs><linearGradient id={uid + "guarda"} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#f87171" /><stop offset="1" stopColor="#b91c1c" /></linearGradient></defs>
        <path d="M-38 -6 Q-38 -46 0 -46 Q38 -46 38 -6 Q28 -16 18 -6 Q8 -16 0 -6 Q-8 -16 -18 -6 Q-28 -16 -38 -6 Z" fill={`url(#${uid}guarda)`} stroke="#7a1010" strokeWidth="2.5" />
        <line x1="0" y1="-46" x2="0" y2="48" stroke="#5c3a0d" strokeWidth="3.5" />
        <path d="M0 48 Q-10 52 -8 40" fill="none" stroke="#5c3a0d" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </g>
  );
}
function NpoChaveInglesa() {
  return (
    <g transform="translate(322,290) rotate(-30)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <rect x="-8" y="-50" width="16" height="70" rx="6" fill="#94a3b8" stroke="#475569" strokeWidth="2.5" />
        <path d="M-16 -50 Q-16 -68 0 -68 Q16 -68 16 -50 Q16 -40 4 -40 L4 -34 L-4 -34 L-4 -40 Q-16 -40 -16 -50 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2.5" />
      </g>
    </g>
  );
}
function NpoBandeiraCorrida() {
  const cell = 7;
  const squares = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2 === 0) squares.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#0b0e1d" />);
  return (
    <g transform="translate(316,260) rotate(8)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <line x1="0" y1="-10" x2="0" y2="70" stroke="#5c3a0d" strokeWidth="4" strokeLinecap="round" />
        <rect x="0" y="-10" width="28" height="35" fill="#fff" />
        <g>{squares}</g>
      </g>
    </g>
  );
}
function NpoMicrofone({ uid }) {
  return (
    <g transform="translate(320,280)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <defs><linearGradient id={uid + "mic"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e5e7eb" /><stop offset="1" stopColor="#6b7280" /></linearGradient></defs>
        <rect x="-13" y="-44" width="26" height="46" rx="13" fill={`url(#${uid}mic)`} stroke="#374151" strokeWidth="2.5" />
        <path d="M-22 -14 Q-22 8 0 8 Q22 8 22 -14" fill="none" stroke="#374151" strokeWidth="3" />
        <line x1="0" y1="8" x2="0" y2="30" stroke="#374151" strokeWidth="3.5" />
      </g>
    </g>
  );
}
function NpoMartelo({ uid }) {
  return (
    <g transform="translate(320,280) rotate(-16)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <defs><linearGradient id={uid + "mart"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a06617" /><stop offset="1" stopColor="#5c3a0d" /></linearGradient></defs>
        <rect x="-5" y="-16" width="10" height="60" rx="4" fill={`url(#${uid}mart)`} />
        <rect x="-26" y="-42" width="52" height="30" rx="7" fill="#7565de" stroke="#35296e" strokeWidth="3" />
      </g>
    </g>
  );
}
function NpoGrimorio({ uid }) {
  return (
    <g transform="translate(320,290)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <defs><linearGradient id={uid + "grim"} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8f73f3" /><stop offset="1" stopColor="#39d9f1" /></linearGradient></defs>
        <path d="M-30 -34 Q0 -44 30 -34 L30 34 Q0 24 -30 34 Z" fill={`url(#${uid}grim)`} stroke="#3f1f7a" strokeWidth="3" />
        <path d="M0 -40 L0 30" stroke="#3f1f7a" strokeWidth="2.5" />
        <circle cx="0" cy="-4" r="7" fill="#fde68a" style={{ animation: "npo-pulse 2s ease-in-out infinite" }} />
      </g>
    </g>
  );
}
function NpoVarinha({ uid }) {
  return (
    <g transform="translate(322,300) rotate(20)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <defs><linearGradient id={uid + "var"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a06617" /><stop offset="1" stopColor="#5c3a0d" /></linearGradient></defs>
        <line x1="0" y1="-60" x2="0" y2="30" stroke={`url(#${uid}var)`} strokeWidth="7" strokeLinecap="round" />
        <path d="M0 -60 l5 -9 l5 9 l9 5 l-9 5 l-5 9 l-5 -9 l-9 -5 Z" fill="#fde047" style={{ animation: "npo-pulse 2s ease-in-out infinite" }} />
      </g>
    </g>
  );
}
function NpoTecladoMini() {
  const keys = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) keys.push(<rect key={`${r}-${c}`} x={c * 10} y={r * 10} width={8} height={8} rx="2" fill="#3a4152" />);
  return (
    <g transform="translate(305,280) rotate(-8)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <rect x="-6" y="-6" width="60" height="30" rx="5" fill="#171026" stroke="#3b2a58" strokeWidth="3" />
        <g transform="translate(0,2)">{keys}</g>
      </g>
    </g>
  );
}
function NpoControle() {
  return (
    <g transform="translate(310,285)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <path d="M-32 -8 Q-32 -22 -16 -22 L16 -22 Q32 -22 32 -8 Q32 12 20 12 Q12 12 8 2 L-8 2 Q-12 12 -20 12 Q-32 12 -32 -8 Z" fill="#3a4152" stroke="#171026" strokeWidth="3" />
        <circle cx="-18" cy="-8" r="4" fill="#c084fc" /><circle cx="18" cy="-8" r="4" fill="#22d3ee" />
        <rect x="-24" y="-14" width="3" height="10" fill="#94a3b8" /><rect x="-28" y="-10" width="10" height="3" fill="#94a3b8" />
      </g>
    </g>
  );
}
function NpoTrofeu({ uid }) {
  return (
    <g transform="translate(315,290)">
      <g style={{ animation: "npo-fragment-float 3.4s ease-in-out infinite -1s" }}>
        <defs><linearGradient id={uid + "trof"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fde68a" /><stop offset="1" stopColor="#d99b0d" /></linearGradient></defs>
        <path d="M-16 -40 L16 -40 L14 -12 Q14 4 0 4 Q-14 4 -14 -12 Z" fill={`url(#${uid}trof)`} stroke="#a9720a" strokeWidth="2.5" />
        <path d="M-16 -36 Q-30 -36 -30 -22 Q-30 -10 -14 -10" fill="none" stroke="#a9720a" strokeWidth="3" />
        <path d="M16 -36 Q30 -36 30 -22 Q30 -10 14 -10" fill="none" stroke="#a9720a" strokeWidth="3" />
        <rect x="-4" y="4" width="8" height="10" fill="#a9720a" />
        <rect x="-14" y="14" width="28" height="7" rx="2" fill="#a9720a" />
      </g>
    </g>
  );
}
