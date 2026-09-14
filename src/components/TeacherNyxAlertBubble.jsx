import { useMemo, useState } from "react";
import { ATTENTION_MOODS, CHECKIN_MOODS } from "../lib/checkinMoods.js";
const moodInfo=id=>CHECKIN_MOODS.find(mood=>mood.id===id);
export function TeacherNyxAlertBubble({students=[],checkins={},helpNotice="",onViewStudent}) {
  const [open,setOpen]=useState(false),[seen,setSeen]=useState({});
  const alerts=useMemo(()=>{const now=Date.now(),items=[];students.forEach(student=>{const key=`${student.shift||"sem-turno"}:${student.name}`;
    if(student.helpAt&&now-student.helpAt<15*60*1000)items.push({id:`help:${key}:${student.helpAt}`,type:"help",student,at:student.helpAt,title:"Pediu ajuda",text:`${student.name} pediu ajuda na atividade.`});
    const entry=checkins[key];if(entry&&ATTENTION_MOODS.has(entry.mood)){const mood=moodInfo(entry.mood);items.push({id:`mood:${key}:${entry.at}`,type:"wellbeing",student,at:entry.at,title:`Chegou ${mood?.label?.toLowerCase()||"precisando de apoio"}`,text:`${student.name} pode precisar de acolhimento hoje.`});}});
    return items.sort((a,b)=>b.at-a.at);},[students,checkins]);
  const pending=alerts.filter(alert=>!seen[alert.id]);if(!alerts.length&&!helpNotice)return null;
  return <aside style={{position:"fixed",right:82,bottom:18,zIndex:1260}}>
    {open&&<div role="dialog" aria-label="Avisos do Nyx" style={{width:"min(360px,calc(100vw - 28px))",maxHeight:"62vh",overflowY:"auto",marginBottom:10,background:"linear-gradient(180deg,#24143a,#140d22)",border:"1px solid #c084fc",borderRadius:18,padding:14,boxShadow:"0 20px 55px #000a"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8}}><div><strong style={{color:"#f0e9fb"}}>🔮 Avisos do Nyx</strong><p style={{color:"#a99ac9",fontSize:11.5,margin:"3px 0 10px"}}>Pedidos de ajuda e sinais de que alguém pode precisar de acolhimento.</p></div><button onClick={()=>setOpen(false)} aria-label="Fechar avisos">✕</button></div>
      {alerts.map(alert=><article key={alert.id} style={{background:seen[alert.id]?"#ffffff06":alert.type==="help"?"#f8717112":"#c084fc12",border:`1px solid ${alert.type==="help"?"#f87171":"#c084fc"}66`,borderRadius:12,padding:10,marginTop:8,opacity:seen[alert.id]?.7:1}}>
        <strong style={{color:alert.type==="help"?"#fca5a5":"#d8b4fe",fontSize:12.5}}>{alert.type==="help"?"✋":"💜"} {alert.title}</strong><p style={{color:"#e9ddf6",fontSize:12,margin:"4px 0"}}>{alert.text}</p><small style={{color:"#776798"}}>{new Date(alert.at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small>
        <div style={{display:"flex",gap:6,marginTop:8}}><button onClick={()=>onViewStudent?.(alert.student)} style={{flex:1}}>Ver aluno</button><button onClick={()=>setSeen(current=>({...current,[alert.id]:true}))} disabled={!!seen[alert.id]} style={{flex:1}}>{seen[alert.id]?"Visto":"Marcar como visto"}</button></div>
      </article>)}
    </div>}
    <button onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-label={`Abrir avisos do Nyx: ${pending.length} pendentes`} style={{width:68,height:68,borderRadius:"50%",border:"2px solid #c084fc",background:"radial-gradient(circle,#39205a,#171026)",color:"#fff",fontSize:29,boxShadow:"0 0 26px #a855f766",cursor:"pointer",position:"relative"}}>🔮{pending.length>0&&<span style={{position:"absolute",right:-3,top:-5,minWidth:23,height:23,borderRadius:20,background:"#ef4444",display:"grid",placeItems:"center",fontSize:11,fontWeight:900,border:"2px solid #171026"}}>{pending.length}</span>}</button>
  </aside>;
}
