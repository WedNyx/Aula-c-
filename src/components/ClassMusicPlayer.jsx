import { useEffect, useRef, useState } from "react";
import { normalizeMusicSettings } from "../lib/classMusic.js";

export function ClassMusicSuggestionForm({ onSuggest }) {
  const [suggestion,setSuggestion]=useState({title:"",artist:"",url:""});
  const [suggestionMsg,setSuggestionMsg]=useState("");
  const [sending,setSending]=useState(false);
  const sendSuggestion=async event=>{event.preventDefault();setSending(true);const ok=await onSuggest?.(suggestion);setSending(false);setSuggestionMsg(ok?"✅ Sugestão enviada para aprovação do professor.":"⚠ Não foi possível enviar. Confira os dados ou veja se essa faixa já foi sugerida.");if(ok)setSuggestion({title:"",artist:"",url:""});};
  return <form onSubmit={sendSuggestion} style={{display:"grid",gap:7,borderTop:"1px solid #3b2a58",paddingTop:12}}><strong style={{color:"#e9d5ff",fontSize:13}}>Sugerir uma faixa ao professor</strong>{[["title","Nome da música"],["artist","Artista (opcional)"],["url","Link HTTPS direto do áudio"]].map(([field,label])=><input key={field} aria-label={label} required={field!=="artist"} inputMode={field==="url"?"url":undefined} value={suggestion[field]} onChange={event=>setSuggestion(current=>({...current,[field]:event.target.value}))} placeholder={label} maxLength={field==="title"?100:field==="artist"?80:500} style={{background:"#120b20",border:"1px solid #3b2a58",borderRadius:8,padding:9,color:"#f0e9fb"}}/>)}<button type="submit" disabled={sending} style={{background:"#c084fc",border:0,borderRadius:9,padding:9,color:"#1a1029",fontWeight:800,cursor:"pointer",opacity:sending ? 0.6 : 1}}>{sending?"Enviando...":"Enviar para aprovação"}</button>{suggestionMsg&&<span role="status" style={{color:suggestionMsg.startsWith("✅")?"#34d399":"#fbbf24",fontSize:12}}>{suggestionMsg}</span>}</form>;
}

export function ClassMusicPlayer({ settings, compact=false, onSuggest }) {
  const music=normalizeMusicSettings(settings);
  const [trackIndex,setTrackIndex]=useState(0);
  const [error,setError]=useState("");
  const audioRef=useRef(null);
  const track=music.tracks[trackIndex] || music.tracks[0];

  useEffect(()=>{
    if(trackIndex>=music.tracks.length)setTrackIndex(0);
  },[music.tracks.length,trackIndex]);

  useEffect(()=>{
    setError("");
    audioRef.current?.load();
  },[track?.url]);

  if(!music.enabled)return null;
  if(!track)return <div role="status" style={{color:"#a99ac9",fontSize:13,padding:12}}>🎵 A música foi liberada, mas a playlist ainda está vazia.</div>;

  const selectTrack=index=>{setTrackIndex(index);setError("");};
  const next=()=>selectTrack((trackIndex+1)%music.tracks.length);
  return <section aria-label="Player de música da turma" style={{background:"linear-gradient(145deg,#171026,#221536)",border:"1px solid #4c356d",borderRadius:14,padding:compact?12:16,boxShadow:"0 10px 28px rgba(3,5,16,.3)"}}>
    <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:10}}><span aria-hidden="true" style={{fontSize:compact?25:32}}>🌙</span><div style={{minWidth:0}}><strong style={{display:"block",color:"#f0e9fb",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{track.title}</strong><span style={{color:"#a99ac9",fontSize:12.5}}>{track.artist||"Playlist da turma"}</span></div></div>
    <audio ref={audioRef} controls preload="metadata" src={track.url} onEnded={next} onError={()=>setError("Não foi possível reproduzir esta faixa. Verifique o link cadastrado.")} style={{width:"100%",height:40}} aria-label={`Reproduzir ${track.title}`} />
    {error&&<p role="alert" style={{color:"#fbbf24",fontSize:12,margin:"8px 0 0"}}>⚠ {error}</p>}
    {music.tracks.length>1&&<div style={{display:"grid",gap:6,marginTop:12,maxHeight:compact?150:220,overflowY:"auto"}}>{music.tracks.map((item,index)=><button key={item.id} type="button" aria-current={index===trackIndex?"true":undefined} onClick={()=>selectTrack(index)} style={{background:index===trackIndex?"#c084fc22":"#120b20",border:`1px solid ${index===trackIndex?"#c084fc":"#3b2a58"}`,borderRadius:9,padding:"8px 10px",color:index===trackIndex?"#e9d5ff":"#d6c9ec",cursor:"pointer",textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{index+1}. {item.title}{item.artist?` · ${item.artist}`:""}</button>)}</div>}
    {music.studentsCanAdd&&onSuggest&&<div style={{marginTop:14}}><ClassMusicSuggestionForm onSuggest={onSuggest}/></div>}
  </section>;
}
