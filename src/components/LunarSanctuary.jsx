import { useEffect, useMemo, useState } from "react";
import { listStudents } from "../storage.js";
import { NyxRobot } from "./NyxRobot.jsx";

const CHALLENGES = [
  { id:"sequence", icon:"🌙", title:"Sequência Lunar", desc:"Memorize e repita a ordem dos símbolos." },
  { id:"odd", icon:"🔭", title:"Estrela Intrusa", desc:"Encontre o símbolo diferente antes do tempo acabar." },
  { id:"memory", icon:"🪐", title:"Pares do Eclipse", desc:"Encontre os três pares escondidos." },
];

const SYMBOLS = ["🌙","⭐","☄️","🪐"];
const dayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
};

function SequenceChallenge({ onWin, onBack }) {
  const [sequence] = useState(() => Array.from({length:4}, () => SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)]));
  const [started, setStarted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [answer, setAnswer] = useState([]);
  const [message, setMessage] = useState("Observe a sequência e clique em Começar.");
  const begin = () => { setStarted(true); setMessage("Memorize..."); setTimeout(() => { setHidden(true); setMessage("Agora repita a sequência!"); }, 1800); };
  const choose = (symbol) => {
    if (!hidden) return;
    const next = [...answer, symbol]; setAnswer(next);
    if (symbol !== sequence[next.length-1]) { setMessage("Quase! Tente novamente desde o começo."); setAnswer([]); return; }
    if (next.length === sequence.length) { setMessage("Sequência completa!"); onWin("sequence"); }
  };
  return <ChallengeFrame title="🌙 Sequência Lunar" message={message} onBack={onBack}>
    <div className="lunar-sequence">{(hidden ? answer : sequence).map((symbol,index)=><span key={index}>{symbol}</span>)}{hidden && answer.length < sequence.length && Array.from({length:sequence.length-answer.length},(_,i)=><span className="empty" key={`e${i}`}>?</span>)}</div>
    {!started ? <button className="lunar-primary" onClick={begin}>Começar</button> : <div className="lunar-symbols">{SYMBOLS.map(symbol=><button key={symbol} onClick={()=>choose(symbol)} disabled={!hidden}>{symbol}</button>)}</div>}
  </ChallengeFrame>;
}

function OddChallenge({ onWin, onBack }) {
  const [round] = useState(() => { const base=SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)]; let odd=base; while(odd===base) odd=SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)]; return {base,odd,index:Math.floor(Math.random()*20)}; });
  const [message,setMessage]=useState("Encontre a estrela intrusa.");
  const pick=(index)=>{ if(index===round.index){setMessage("Você encontrou!");onWin("odd");} else setMessage("Essa faz parte do padrão. Continue procurando!"); };
  return <ChallengeFrame title="🔭 Estrela Intrusa" message={message} onBack={onBack}><div className="lunar-odd-grid">{Array.from({length:20},(_,i)=><button key={i} onClick={()=>pick(i)}>{i===round.index?round.odd:round.base}</button>)}</div></ChallengeFrame>;
}

function MemoryChallenge({ onWin, onBack }) {
  const [deck] = useState(() => [...SYMBOLS.slice(0,3),...SYMBOLS.slice(0,3)].sort(()=>Math.random()-.5));
  const [open,setOpen]=useState([]); const [matched,setMatched]=useState([]); const [message,setMessage]=useState("Encontre todos os pares.");
  const flip=(index)=>{ if(open.length===2||open.includes(index)||matched.includes(index)) return; const next=[...open,index]; setOpen(next); if(next.length===2){ setTimeout(()=>{ if(deck[next[0]]===deck[next[1]]){ const done=[...matched,...next]; setMatched(done); setMessage("Par encontrado!"); if(done.length===deck.length){setMessage("Todos os pares foram encontrados!");onWin("memory");} } else setMessage("Não formou um par. Tente outra vez!"); setOpen([]); },500); } };
  return <ChallengeFrame title="🪐 Pares do Eclipse" message={message} onBack={onBack}><div className="lunar-memory-grid">{deck.map((symbol,index)=><button key={index} onClick={()=>flip(index)}>{open.includes(index)||matched.includes(index)?symbol:"✦"}</button>)}</div></ChallengeFrame>;
}

function ChallengeFrame({ title, message, onBack, children }) {
  return <section className="lunar-challenge-play"><button className="lunar-back" onClick={onBack}>← Desafios</button><h2>{title}</h2><p>{message}</p>{children}</section>;
}

export function LunarSanctuary({ studentName, shift, nyxPoints=0, nyxSpent=0, achievements=[], gear={}, onAward, onClose }) {
  const [tab,setTab]=useState("sanctuary"); const [challenge,setChallenge]=useState(null); const [classStudents,setClassStudents]=useState([]); const [toast,setToast]=useState("");
  useEffect(()=>{ listStudents().then(all=>setClassStudents(all.filter(student=>(student.shift||"")===shift))).catch(()=>setClassStudents([])); },[shift]);
  const classPoints=useMemo(()=>classStudents.reduce((sum,student)=>sum+(student.nyxPoints||0),0),[classStudents]);
  const journeyLevel=Math.min(5,Math.floor(classPoints/250)); const journeyProgress=Math.min(100,(classPoints%250)/2.5);
  const win=async(id)=>{ const key=`nyx_lunar_challenge_${dayKey()}_${shift}_${studentName}_${id}`; let rewarded=false; try{rewarded=localStorage.getItem(key)==="1";}catch{} if(!rewarded){try{localStorage.setItem(key,"1");}catch{} await onAward?.(2); setToast("+2 pontos Nyx! Recompensa diária conquistada.");}else setToast("Desafio concluído! A recompensa deste desafio já foi recebida hoje."); setTimeout(()=>setToast(""),2800); };
  const openChallenge=(id)=>setChallenge(id);
  return <div className="lunar-overlay" role="dialog" aria-modal="true" aria-label="Santuário Lunar">
    <main className="lunar-hub">
      <header className="lunar-header"><div><small>ÁREA DE EXPLORAÇÃO</small><h1>🌙 Santuário Lunar</h1></div><button onClick={onClose} aria-label="Fechar Santuário Lunar">✕</button></header>
      <nav className="lunar-tabs" aria-label="Áreas do Santuário"><button className={tab==="sanctuary"?"active":""} onClick={()=>{setTab("sanctuary");setChallenge(null);}}>🌙 Meu Santuário</button><button className={tab==="challenges"?"active":""} onClick={()=>{setTab("challenges");setChallenge(null);}}>🧩 Sala de Desafios</button><button className={tab==="journey"?"active":""} onClick={()=>{setTab("journey");setChallenge(null);}}>🗺️ Jornada da Turma</button></nav>
      <div className="lunar-body">
        {tab==="sanctuary"&&<section className="lunar-sanctuary"><div className="lunar-altar"><div className="lunar-moon"></div><NyxRobot state="idle" size={128} gear={gear}/><h2>Santuário de {studentName}</h2><p>Seu espaço pessoal cresce conforme você participa da plataforma.</p></div><div className="lunar-stats"><article><span>✨</span><b>{Math.max(0,nyxPoints-nyxSpent)}</b><small>Pontos disponíveis</small></article><article><span>🎖️</span><b>{achievements.length}</b><small>Conquistas</small></article><article><span>🎒</span><b>{Object.values(gear||{}).filter(Boolean).length}</b><small>Itens equipados</small></article></div><div className="lunar-coming"><b>🔮 Altar de Reflexos</b><span>Em breve: escolha de aparência e exposição das lembranças conquistadas.</span></div></section>}
        {tab==="challenges"&&!challenge&&<section><div className="lunar-section-title"><h2>🧩 Sala de Desafios</h2><p>Jogos rápidos de memória e observação. Cada um concede 2 pontos uma vez por dia.</p></div><div className="lunar-challenge-grid">{CHALLENGES.map(item=><button key={item.id} onClick={()=>openChallenge(item.id)}><span>{item.icon}</span><b>{item.title}</b><small>{item.desc}</small><i>Jogar →</i></button>)}</div></section>}
        {tab==="challenges"&&challenge==="sequence"&&<SequenceChallenge onWin={win} onBack={()=>setChallenge(null)}/>}
        {tab==="challenges"&&challenge==="odd"&&<OddChallenge onWin={win} onBack={()=>setChallenge(null)}/>}
        {tab==="challenges"&&challenge==="memory"&&<MemoryChallenge onWin={win} onBack={()=>setChallenge(null)}/>}
        {tab==="journey"&&<section className="lunar-journey"><div className="lunar-section-title"><h2>🗺️ Jornada da Turma</h2><p>O progresso de todos ilumina um novo ponto do mapa.</p></div><div className="lunar-path">{["Santuário","Bosque","Observatório","Lago Lunar","Portal"].map((name,index)=><div className={index<=journeyLevel?"unlocked":""} key={name}><span>{["🌙","🌲","🔭","🌌","🚪"][index]}</span><b>{name}</b><small>{index<=journeyLevel?"Descoberto":`${index*250} pontos`}</small></div>)}</div><div className="lunar-class-progress"><div><b>{classPoints} pontos da turma</b><span>Próxima descoberta: {Math.min(1250,(journeyLevel+1)*250)} pontos</span></div><i><b style={{width:`${journeyProgress}%`}}/></i><small>{classStudents.length} participante{classStudents.length===1?"":"s"} contribuindo nesta jornada</small></div></section>}
      </div>{toast&&<div className="lunar-toast">{toast}</div>}
    </main>
  </div>;
}
