import { useEffect, useMemo, useState } from "react";
import { listStudents } from "../storage.js";
import { NyxDisplay } from "./NyxDisplay.jsx";
import { publicApis } from "../lib/publicApis.js";

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


function decodeTrivia(value) {
  try { return decodeURIComponent(value || ""); } catch { return String(value || ""); }
}

function LivingWorld() {
  const [sky,setSky]=useState(null); const [skyError,setSkyError]=useState(""); const [loadingSky,setLoadingSky]=useState(true);
  const [tool,setTool]=useState("country"); const [query,setQuery]=useState("Brasil"); const [result,setResult]=useState(null); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);

  useEffect(()=>{
    let active=true;
    Promise.all([publicApis.weather(-15.7939,-47.8828,3),publicApis.sun(-15.7939,-47.8828)])
      .then(([weather,sun])=>{if(active)setSky({weather:weather.data,sun:sun.data,attribution:weather.attribution});})
      .catch(err=>{if(active)setSkyError(err.message);})
      .finally(()=>{if(active)setLoadingSky(false);});
    return()=>{active=false;};
  },[]);

  const search=async(event)=>{
    event?.preventDefault(); setLoading(true); setError(""); setResult(null);
    try{
      if(tool==="country") setResult(await publicApis.country(query));
      else if(tool==="wikipedia") setResult(await publicApis.wikipedia(query));
      else if(tool==="nasa") setResult(await publicApis.nasa(query));
      else if(tool==="openlibrary") setResult(await publicApis.openLibrary(query));
      else if(tool==="pokemon") setResult(await publicApis.pokemon(query));
      else if(tool==="placeholder") setResult(await publicApis.placeholder("posts",Number(query)||1));
      else setResult(await publicApis.trivia({amount:5,difficulty:"easy"}));
    }catch(err){setError(err.message);}finally{setLoading(false);}
  };

  const current=sky?.weather?.current;
  const daily=sky?.weather?.daily;
  const sun=sky?.sun?.results;
  const country=tool==="country"&&Array.isArray(result?.data)?result.data[0]:null;
  const pages=tool==="wikipedia"?Object.values(result?.data?.query?.pages||{}):[];
  const nasa=tool==="nasa"?result?.data:null;
  const books=tool==="openlibrary"?result?.data?.docs||[]:[];
  const pokemon=tool==="pokemon"?result?.data:null;
  const trivia=tool==="trivia"?result?.data?.results||[]:[];
  const placeholder=tool==="placeholder"?result?.data:null;
  const toolInfo={
    country:["País","Brasil","Países, idiomas, moedas e bandeiras"],
    wikipedia:["Wikipédia","linguagem C sharp","Pesquisa educacional em português"],
    nasa:["NASA","", "Imagem astronômica do dia para explorar com Nyx"],
    openlibrary:["Open Library","programação C#","Livros, autores e datas de publicação"],
    pokemon:["PokéAPI","pikachu","Classes, listas e objetos JSON"],
    placeholder:["JSONPlaceholder","1","API simulada: informe o ID de uma postagem"],
    trivia:["Quiz surpresa","","Cinco perguntas gerais para praticar"],
  }[tool];

  return <section className="lunar-world">
    <div className="lunar-section-title"><h2>🌍 Mundo Vivo</h2><p>Dados reais para explorar e aprender a consumir APIs com C#.</p></div>
    <div className="lunar-sky-card" aria-live="polite">
      <div><span className="lunar-sky-icon">{current?.is_day===0?"🌌":"🌤️"}</span><div><small>BRASÍLIA AGORA</small><b>{loadingSky?"Consultando céu…":skyError?"Céu indisponível":`${Math.round(current?.temperature_2m||0)} °C`}</b><p>{current&&`Sensação de ${Math.round(current.apparent_temperature)} °C · código do tempo ${current.weather_code}`}</p></div></div>
      <div className="lunar-sky-times"><span>🌅 {sun?.sunrise?new Date(sun.sunrise).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"—"}</span><span>🌇 {sun?.sunset?new Date(sun.sunset).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"—"}</span><small>{daily?.temperature_2m_min?.[0]!=null?`Hoje: ${Math.round(daily.temperature_2m_min[0])}–${Math.round(daily.temperature_2m_max[0])} °C`:""}</small></div>
    </div>
    <div className="lunar-api-tools" role="tablist" aria-label="Laboratórios de APIs">{["country","wikipedia","nasa","openlibrary","pokemon","placeholder","trivia"].map(id=><button key={id} role="tab" aria-selected={tool===id} className={tool===id?"active":""} onClick={()=>{setTool(id);setQuery(id==="country"?"Brasil":id==="wikipedia"?"linguagem C sharp":id==="nasa"?"":id==="openlibrary"?"programação C#":id==="pokemon"?"pikachu":id==="placeholder"?"1":"");setResult(null);setError("");}}>{({country:"🌎 Países",wikipedia:"📚 Wikipédia",nasa:"🚀 NASA",openlibrary:"📖 Livros",pokemon:"⚡ PokéAPI",placeholder:"🧪 JSON",trivia:"❓ Quiz"})[id]}</button>)}</div>
    <form className="lunar-api-search" onSubmit={search}>
      <div><b>{toolInfo[0]}</b><small>{toolInfo[2]}</small></div>
      {tool!=="trivia"&&tool!=="nasa"&&<label><span className="sr-only">{toolInfo[0]}</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={toolInfo[1]}/></label>}
      <button className="lunar-primary" type="submit" disabled={loading}>{loading?"Carregando…":tool==="trivia"?"Gerar perguntas":"Explorar"}</button>
    </form>
    {error&&<p className="lunar-api-error" role="alert">{error}</p>}
    <div className="lunar-api-result" aria-live="polite">
      {country&&<article><img src={country.flags?.svg} alt={`Bandeira de ${country.name?.common}`}/><div><h3>{country.name?.common}</h3><p>Capital: {country.capital?.join(", ")||"—"} · Região: {country.region}</p><p>População: {Number(country.population||0).toLocaleString("pt-BR")}</p><small>Idiomas: {Object.values(country.languages||{}).join(", ")||"—"}</small></div></article>}
      {nasa&&<article><img src={nasa.media_type==="image"?nasa.url:nasa.thumbnail_url} alt={nasa.title||"Imagem astronômica da NASA"}/><div><h3>{nasa.title}</h3><p>{nasa.explanation}</p><small>{nasa.date}{nasa.copyright?` · © ${nasa.copyright}`:""}</small>{nasa.media_type==="video"&&nasa.url&&<a href={nasa.url} target="_blank" rel="noreferrer">Assistir na NASA ↗</a>}</div></article>}
      {books.map(book=><article key={book.key}><img src={book.cover_i?`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`:""} alt={book.cover_i?`Capa de ${book.title}`:""}/><div><h3>{book.title}</h3><p>{(book.author_name||["Autor não informado"]).join(", ")}</p><small>{book.first_publish_year?`Primeira publicação: ${book.first_publish_year}`:"Ano não informado"} · {book.edition_count||0} edição(ões)</small><a href={`https://openlibrary.org${book.key}`} target="_blank" rel="noreferrer">Ver no Open Library ↗</a></div></article>)}
      {pages.map(page=><article key={page.pageid}><div><h3>{page.title}</h3><p>{page.extract||"Sem resumo disponível."}</p>{page.fullurl&&<a href={page.fullurl} target="_blank" rel="noreferrer">Ler na Wikipédia ↗</a>}</div></article>)}
      {pokemon&&<article><img src={pokemon.sprites?.other?.["official-artwork"]?.front_default||pokemon.sprites?.front_default} alt={pokemon.name}/><div><h3>#{pokemon.id} {pokemon.name}</h3><p>Altura: {pokemon.height/10} m · Peso: {pokemon.weight/10} kg</p><small>Tipos: {(pokemon.types||[]).map(item=>item.type.name).join(", ")}</small></div></article>}
      {placeholder&&<article><div><h3>Postagem #{placeholder.id}</h3><p>{placeholder.title}</p><small>{placeholder.body}</small></div></article>}
      {trivia.map((item,index)=><article key={index}><div><h3>{index+1}. {decodeTrivia(item.question)}</h3><p>Resposta: {decodeTrivia(item.correct_answer)}</p><small>Dificuldade: {item.difficulty}</small></div></article>)}
    </div>
    {(result?.attribution||sky?.attribution)&&<small className="lunar-attribution">Fontes: {[sky?.attribution,result?.attribution].filter(Boolean).join(" · ")}</small>}
  </section>;
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
      <nav className="lunar-tabs" aria-label="Áreas do Santuário"><button className={tab==="sanctuary"?"active":""} onClick={()=>{setTab("sanctuary");setChallenge(null);}}>🌙 Meu Santuário</button><button className={tab==="challenges"?"active":""} onClick={()=>{setTab("challenges");setChallenge(null);}}>🧩 Sala de Desafios</button><button className={tab==="journey"?"active":""} onClick={()=>{setTab("journey");setChallenge(null);}}>🗺️ Jornada da Turma</button><button className={tab==="world"?"active":""} onClick={()=>{setTab("world");setChallenge(null);}}>🌍 Mundo Vivo</button></nav>
      <div className="lunar-body">
        {tab==="sanctuary"&&<section className="lunar-sanctuary"><div className="lunar-altar"><div className="lunar-moon"></div><NyxDisplay state="idle" size={128} showName={false} gear={gear}/><h2>Santuário de {studentName}</h2><p>Seu espaço pessoal cresce conforme você participa da plataforma.</p></div><div className="lunar-stats"><article><span>✨</span><b>{Math.max(0,nyxPoints-nyxSpent)}</b><small>Pontos disponíveis</small></article><article><span>🎖️</span><b>{achievements.length}</b><small>Conquistas</small></article><article><span>🎒</span><b>{Object.values(gear||{}).filter(Boolean).length}</b><small>Itens equipados</small></article></div><div className="lunar-coming"><b>🔮 Altar de Reflexos</b><span>Em breve: escolha de aparência e exposição das lembranças conquistadas.</span></div></section>}
        {tab==="challenges"&&!challenge&&<section><div className="lunar-section-title"><h2>🧩 Sala de Desafios</h2><p>Jogos rápidos de memória e observação. Cada um concede 2 pontos uma vez por dia.</p></div><div className="lunar-challenge-grid">{CHALLENGES.map(item=><button key={item.id} onClick={()=>openChallenge(item.id)}><span>{item.icon}</span><b>{item.title}</b><small>{item.desc}</small><i>Jogar →</i></button>)}</div></section>}
        {tab==="challenges"&&challenge==="sequence"&&<SequenceChallenge onWin={win} onBack={()=>setChallenge(null)}/>}
        {tab==="challenges"&&challenge==="odd"&&<OddChallenge onWin={win} onBack={()=>setChallenge(null)}/>}
        {tab==="challenges"&&challenge==="memory"&&<MemoryChallenge onWin={win} onBack={()=>setChallenge(null)}/>}
        {tab==="world"&&<LivingWorld/>}
        {tab==="journey"&&<section className="lunar-journey"><div className="lunar-section-title"><h2>🗺️ Jornada da Turma</h2><p>O progresso de todos ilumina um novo ponto do mapa.</p></div><div className="lunar-path">{["Santuário","Bosque","Observatório","Lago Lunar","Portal"].map((name,index)=><div className={index<=journeyLevel?"unlocked":""} key={name}><span>{["🌙","🌲","🔭","🌌","🚪"][index]}</span><b>{name}</b><small>{index<=journeyLevel?"Descoberto":`${index*250} pontos`}</small></div>)}</div><div className="lunar-class-progress"><div><b>{classPoints} pontos da turma</b><span>Próxima descoberta: {Math.min(1250,(journeyLevel+1)*250)} pontos</span></div><i><b style={{width:`${journeyProgress}%`}}/></i><small>{classStudents.length} participante{classStudents.length===1?"":"s"} contribuindo nesta jornada</small></div></section>}
      </div>{toast&&<div className="lunar-toast">{toast}</div>}
    </main>
  </div>;
}
