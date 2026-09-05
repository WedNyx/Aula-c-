import { useEffect, useState } from "react";
import { addTrack, musicForTurma, removeTrack, updateMusicSettings } from "../lib/classMusic.js";
import { ClassMusicPlayer } from "./ClassMusicPlayer.jsx";
import { listMusicSuggestions, resolveMusicSuggestion } from "../storage.js";

export function ClassMusicSettings({ allSettings, turmaId, turmas, styles, onTurmaChange, onSave, teacherAuth }) {
  const [title,setTitle]=useState(""),[artist,setArtist]=useState(""),[url,setUrl]=useState("");
  const [message,setMessage]=useState(""),[saving,setSaving]=useState(false);
  const [suggestions,setSuggestions]=useState([]);
  const loadSuggestions=()=>listMusicSuggestions(turmaId,teacherAuth).then(setSuggestions);
  useEffect(()=>{let active=true;const load=()=>listMusicSuggestions(turmaId,teacherAuth).then(items=>{if(active)setSuggestions(items)});load();const timer=setInterval(load,10000);return()=>{active=false;clearInterval(timer)};},[turmaId,teacherAuth]);
  const settings=musicForTurma(allSettings,turmaId);
  const save=async next=>{setSaving(true);const ok=await onSave(next);setSaving(false);setMessage(ok?"✅ Configuração musical salva.":"⚠ Não consegui salvar agora.");return ok;};
  const patch=value=>save(updateMusicSettings(allSettings,turmaId,value));
  const add=async()=>{const result=addTrack(allSettings,turmaId,{title,artist,url});if(!result.ok){setMessage(`⚠ ${result.error}`);return;}if(await save(result.settings)){setTitle("");setArtist("");setUrl("");}};
  const remove=id=>save(removeTrack(allSettings,turmaId,id));
  const reject=async id=>{if(await resolveMusicSuggestion(turmaId,id,teacherAuth)){setSuggestions(items=>items.filter(item=>item.id!==id));setMessage("✅ Sugestão recusada.");}};
  const approve=async item=>{const result=addTrack(allSettings,turmaId,{title:item.title,artist:item.artist,url:item.url,addedBy:item.studentName});if(!result.ok){setMessage(`⚠ ${result.error}`);return;}if(await save(result.settings)&&await resolveMusicSuggestion(turmaId,item.id,teacherAuth))setSuggestions(items=>items.filter(entry=>entry.id!==item.id));};
  const inputStyle={background:"#171026",border:"1px solid #3b2a58",borderRadius:8,padding:10,color:"#f0e9fb",width:"100%",boxSizing:"border-box"};
  return <div style={{padding:14,maxWidth:900,margin:"0 auto"}}><div data-tour-prof="music" className="cardfx" style={styles.card}>
    <h3 style={{color:"#c084fc",marginBottom:5}}>🎵 Música da turma</h3><p style={{color:"#a99ac9",fontSize:13,lineHeight:1.6}}>O professor controla quando a música pode tocar e onde o player será exibido. Use somente links de áudio que você tenha autorização para reproduzir.</p>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>{turmas.map(t=><button key={t.id} onClick={()=>onTurmaChange(t.id)} style={styles.tab(turmaId===t.id)}>{t.emoji} {t.label}</button>)}</div>
    <div style={{display:"grid",gap:9,background:"#171026",border:"1px solid #3b2a58",borderRadius:12,padding:13}}>
      <label style={{display:"flex",gap:9,alignItems:"center",color:"#f0e9fb",fontWeight:700}}><input type="checkbox" checked={settings.enabled} disabled={saving} onChange={e=>patch({enabled:e.target.checked})}/> Liberar música nesta turma</label>
      <label style={{display:"flex",gap:9,alignItems:"center",color:"#d6c9ec"}}><input type="checkbox" checked={settings.studentsCanAdd} disabled={saving} onChange={e=>patch({studentsCanAdd:e.target.checked})}/> Permitir que alunos sugiram faixas</label>
      <label style={{color:"#d6c9ec",fontSize:13}}>Mostrar o player no <select value={settings.surface} disabled={saving} onChange={e=>patch({surface:e.target.value})} style={{...inputStyle,width:"auto",marginLeft:6}}><option value="student">painel dos alunos</option><option value="teacher">painel do professor</option></select></label>
    </div>
    <h4 style={{color:"#22d3ee",margin:"16px 0 7px"}}>Adicionar faixa autorizada</h4><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:8}}><input aria-label="Nome da música" value={title} onChange={e=>setTitle(e.target.value)} maxLength={100} placeholder="Nome da música" style={inputStyle}/><input aria-label="Artista da música" value={artist} onChange={e=>setArtist(e.target.value)} maxLength={80} placeholder="Artista (opcional)" style={inputStyle}/><input aria-label="Link direto do áudio" value={url} onChange={e=>setUrl(e.target.value)} placeholder="Link HTTPS direto do áudio" inputMode="url" style={{...inputStyle,gridColumn:"1 / -1"}}/><button onClick={add} disabled={saving} style={{...styles.btn("#c084fc"),gridColumn:"1 / -1",opacity:saving ? 0.6 : 1}}>{saving?"Salvando...":"Adicionar à playlist"}</button></div>
    {message&&<p role="status" style={{color:message.startsWith("✅")?"#34d399":"#fbbf24",fontSize:13}}>{message}</p>}
    <div style={{display:"grid",gap:8,marginTop:14}}>{settings.tracks.length===0?<p style={{color:"#776798",fontSize:13}}>A playlist desta turma ainda está vazia.</p>:settings.tracks.map((track,index)=><div key={track.id} style={{background:"#171026",border:"1px solid #3b2a58",borderRadius:10,padding:11,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><span><b>{index+1}. {track.title}</b>{track.artist&&<small style={{display:"block",color:"#a99ac9"}}>{track.artist}</small>}</span><button onClick={()=>remove(track.id)} disabled={saving} style={{...styles.btnGhost,color:"#f87171",padding:"6px 10px"}}>Remover</button></div>)}</div>
    {settings.enabled&&settings.surface==="teacher"&&<div style={{marginTop:16}}><h4 style={{color:"#c084fc",margin:"0 0 8px"}}>Prévia e reprodução</h4><ClassMusicPlayer settings={settings} compact /></div>}
    <div style={{marginTop:18,borderTop:"1px solid #3b2a58",paddingTop:14}}><h4 style={{color:"#fbbf24",margin:"0 0 8px"}}>Sugestões aguardando aprovação ({suggestions.length})</h4>{suggestions.length===0?<p style={{color:"#776798",fontSize:13}}>Nenhuma sugestão pendente nesta turma.</p>:<div style={{display:"grid",gap:8}}>{suggestions.map(item=><div key={item.id} style={{background:"#171026",border:"1px solid #3b2a58",borderRadius:10,padding:11}}><b>{item.title}</b><small style={{display:"block",color:"#a99ac9",marginTop:3}}>{item.artist||"Artista não informado"} · sugerida por {item.studentName}</small><div style={{display:"flex",gap:8,marginTop:9}}><button onClick={()=>approve(item)} disabled={saving} style={{...styles.btn("#34d399"),padding:"6px 10px"}}>Aprovar</button><button onClick={()=>reject(item.id)} disabled={saving} style={{...styles.btnGhost,color:"#f87171",padding:"6px 10px"}}>Recusar</button></div></div>)}</div>}</div>
  </div></div>;
}
