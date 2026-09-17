import { useState } from "react";
import { addTrack, normalizeMusicSettings, removeTrack } from "../lib/classMusic.js";
import { searchMusic } from "../lib/musicSearch.js";
import { ClassMusicPlayer } from "./ClassMusicPlayer.jsx";

const EMPTY_PERSONAL = { enabled:true, surface:"student", studentsCanAdd:false, tracks:[] };

export function StudentMusicHub({ classSettings, personalTracks, studentName, turmaId, onSavePersonal, onAddClass, onSuggest }) {
  const [tab,setTab]=useState("search");
  const [provider,setProvider]=useState("youtube");
  const [query,setQuery]=useState("");
  const [results,setResults]=useState([]);
  const [nowPlaying,setNowPlaying]=useState(null);
  const [searching,setSearching]=useState(false);
  const [message,setMessage]=useState("");
  const personal=normalizeMusicSettings({ ...EMPTY_PERSONAL, tracks:personalTracks });
  const room=normalizeMusicSettings(classSettings);
  const field={background:"#120b20",border:"1px solid #3b2a58",borderRadius:9,padding:10,color:"#f0e9fb",boxSizing:"border-box"};
  const pill=active=>({border:`1px solid ${active?"#c084fc":"#3b2a58"}`,background:active?"#c084fc22":"#120b20",color:active?"#e9d5ff":"#a99ac9",borderRadius:9,padding:"7px 11px",cursor:"pointer"});

  const runSearch=async event=>{
    event.preventDefault();
    if(query.trim().length<2)return;
    setSearching(true);setMessage("");
    try{setResults(await searchMusic(provider,query.trim(),null,{studentName,turmaId}));}
    catch(error){setResults([]);setMessage(`⚠ ${error.message}`);}
    finally{setSearching(false);}
  };
  const savePersonal=async track=>{
    const added=addTrack({mine:personal},"mine",track);
    if(!added.ok){setMessage(`⚠ ${added.error}`);return;}
    const ok=await onSavePersonal(added.settings.mine.tracks);
    setMessage(ok?`✅ ${track.title} salva na sua playlist.`:"⚠ Não consegui salvar agora.");
  };
  const removePersonal=async id=>{
    const next=removeTrack({mine:personal},"mine",id).mine.tracks;
    await onSavePersonal(next);
  };
  const addRoom=async track=>{
    const ok=await onAddClass(track);
    setMessage(ok?`✅ ${track.title} adicionada à playlist da sala.`:"⚠ Não foi possível adicionar. Ela pode já estar na lista ou a permissão foi alterada.");
  };

  return <section aria-label="Central de músicas" style={{display:"grid",gap:12}}>
    <nav aria-label="Seções de música" style={{display:"flex",gap:7,overflowX:"auto"}}>
      {[["search","🔎 Pesquisar"],["room","👥 Playlist da sala"],["mine","💜 Minha playlist"]].map(([id,label])=><button key={id} type="button" onClick={()=>setTab(id)} style={pill(tab===id)}>{label}</button>)}
    </nav>
    {tab==="search"&&<>
      <form onSubmit={runSearch} style={{display:"grid",gap:8}}>
        <div role="radiogroup" aria-label="Serviço de música" style={{display:"flex",gap:7}}>{[["youtube","▶️ YouTube"],["spotify","🟢 Spotify"]].map(([id,label])=><button key={id} type="button" role="radio" aria-checked={provider===id} onClick={()=>{setProvider(id);setResults([])}} style={pill(provider===id)}>{label}</button>)}</div>
        <div style={{display:"flex",gap:7}}><input aria-label="Nome da música ou artista" value={query} onChange={event=>setQuery(event.target.value)} maxLength={100} placeholder="Nome da música ou artista" style={{...field,flex:1,minWidth:0}}/><button type="submit" disabled={searching||query.trim().length<2} style={{...pill(true),opacity:searching?.6:1}}>{searching?"Buscando…":"🔎"}</button></div>
      </form>
      {nowPlaying&&<div><p style={{color:"#22d3ee",fontWeight:800,fontSize:12}}>Tocando agora</p><ClassMusicPlayer settings={{enabled:true,tracks:[nowPlaying]}} compact/></div>}
      <div style={{display:"grid",gap:7,maxHeight:310,overflowY:"auto"}}>{results.map(track=><article key={track.id} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,alignItems:"center",padding:9,border:"1px solid #3b2a58",borderRadius:10,background:"#120b20"}}><span style={{minWidth:0}}><b style={{display:"block",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{track.title}</b><small style={{color:"#8f80ad"}}>{track.artist}</small></span><span style={{display:"flex",gap:5}}><button type="button" onClick={()=>setNowPlaying(track)} style={pill(false)}>▶</button><button type="button" title="Salvar na minha playlist" onClick={()=>savePersonal(track)} style={pill(false)}>💜</button>{room.studentsCanAdd&&<button type="button" title="Adicionar à playlist da sala" onClick={()=>addRoom(track)} style={pill(false)}>👥＋</button>}</span></article>)}</div>
    </>}
    {tab==="room"&&<ClassMusicPlayer settings={room} onSuggest={onSuggest}/>}
    {tab==="mine"&&(personal.tracks.length?<><ClassMusicPlayer settings={personal}/><div style={{display:"grid",gap:5}}>{personal.tracks.map(track=><button key={track.id} type="button" onClick={()=>removePersonal(track.id)} style={{...pill(false),textAlign:"left"}}>🗑️ Remover {track.title}</button>)}</div></>:<p style={{color:"#8f80ad",textAlign:"center",padding:22}}>Sua playlist ainda está vazia. Pesquise uma música e toque em 💜.</p>)}
    {message&&<p role="status" style={{color:message.startsWith("✅")?"#34d399":"#fbbf24",fontSize:12,margin:0}}>{message}</p>}
  </section>;
}
