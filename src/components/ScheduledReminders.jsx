import { useEffect, useMemo, useState } from "react";

const inputStyle = { width:"100%", boxSizing:"border-box", background:"#171026", color:"#f0e9fb", border:"1px solid #3b2a58", borderRadius:9, padding:"9px 10px" };
const localDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export function reminderOccurrence(reminder, now = new Date()) {
  if (!reminder?.active || !reminder.date || !reminder.time) return null;
  const start = new Date(`${reminder.date}T${reminder.time}:00`);
  const days = Math.max(1, Number(reminder.days)||1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), start.getHours(), start.getMinutes());
  const dayIndex = Math.round((new Date(now.getFullYear(),now.getMonth(),now.getDate()) - new Date(start.getFullYear(),start.getMonth(),start.getDate())) / 86400000);
  if (dayIndex < 0 || dayIndex >= days || now < today) return null;
  return { at:today.getTime(), key:`${reminder.id}:${localDate(now)}` };
}

export function ScheduledReminders({ reminders, turmas, onSave }) {
  const today = localDate(new Date());
  const [draft,setDraft]=useState({ title:"", text:"", audience:"teacher", shift:"all", date:today, time:"09:00", days:1 });
  const [msg,setMsg]=useState("");
  const sorted=useMemo(()=>[...(reminders||[])].sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),[reminders]);
  const add=async()=>{
    if(!draft.title.trim() || !draft.date || !draft.time) { setMsg("Preencha o título, a data e o horário."); return; }
    const item={...draft,title:draft.title.trim(),text:draft.text.trim(),days:Math.max(1,Math.min(365,Number(draft.days)||1)),id:`r${Date.now()}`,active:true,createdAt:Date.now()};
    await onSave([...(reminders||[]),item]); setDraft({...draft,title:"",text:""}); setMsg("✅ Aviso programado!");
  };
  const change=async(id,patch)=>onSave(reminders.map(r=>r.id===id?{...r,...patch}:r));
  const remove=async id=>onSave(reminders.filter(r=>r.id!==id));
  return <div style={{padding:14,maxWidth:900,margin:"0 auto"}}>
    <section className="cardfx" style={{background:"#211433",border:"1px solid #3b2a58",borderRadius:16,padding:18}}>
      <h2 style={{color:"#fbbf24",margin:"0 0 5px"}}>🔔 Avisos programados</h2>
      <p style={{color:"#a99ac9",fontSize:13,lineHeight:1.5}}>Crie um lembrete só para você ou um aviso para a turma. Ele toca no horário escolhido durante a quantidade de dias definida.</p>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:9}}>
        <input style={inputStyle} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Título do aviso" />
        <select style={inputStyle} value={draft.audience} onChange={e=>setDraft({...draft,audience:e.target.value})}><option value="teacher">Só para mim</option><option value="class">Para a turma</option></select>
        <select style={inputStyle} value={draft.shift} onChange={e=>setDraft({...draft,shift:e.target.value})} disabled={draft.audience==="teacher"}><option value="all">Todas as turmas</option>{turmas.map(t=><option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}</select>
        <input type="date" style={inputStyle} value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/>
        <input type="time" style={inputStyle} value={draft.time} onChange={e=>setDraft({...draft,time:e.target.value})}/>
        <label style={{color:"#a99ac9",fontSize:12}}>Repetir por quantos dias?<input type="number" min="1" max="365" style={{...inputStyle,marginTop:3}} value={draft.days} onChange={e=>setDraft({...draft,days:e.target.value})}/></label>
      </div>
      <textarea style={{...inputStyle,minHeight:75,resize:"vertical",marginTop:9}} value={draft.text} onChange={e=>setDraft({...draft,text:e.target.value})} placeholder="Mensagem ou observação (opcional)"/>
      <button onClick={add} style={{background:"linear-gradient(135deg,#fbbf24,#f97316)",border:0,borderRadius:9,padding:"10px 18px",fontWeight:900,cursor:"pointer",marginTop:9}}>＋ Programar aviso</button>
      {msg&&<span style={{color:msg.startsWith("✅")?"#34d399":"#fbbf24",fontSize:12,marginLeft:10}}>{msg}</span>}
    </section>
    <section style={{marginTop:12,display:"grid",gap:8}}>{sorted.length===0?<p style={{color:"#776798",textAlign:"center"}}>Nenhum aviso programado.</p>:sorted.map(r=><article key={r.id} style={{background:"#171026",border:`1px solid ${r.active?"#3b2a58":"#2a2038"}`,borderRadius:12,padding:13,opacity:r.active?1:.58,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
      <span style={{fontSize:22}}>{r.audience==="teacher"?"🧑‍🏫":"📣"}</span><div style={{flex:1,minWidth:220}}><b style={{color:"#f0e9fb"}}>{r.title}</b><div style={{color:"#a99ac9",fontSize:12,marginTop:3}}>{r.date.split("-").reverse().join("/")} às {r.time} · {r.days} dia{Number(r.days)!==1?"s":""} · {r.audience==="teacher"?"só para mim":r.shift==="all"?"todas as turmas":turmas.find(t=>t.id===r.shift)?.label||r.shift}</div>{r.text&&<p style={{color:"#d6c9ec",fontSize:12.5,margin:"5px 0 0"}}>{r.text}</p>}</div>
      <button onClick={()=>change(r.id,{active:!r.active})} style={{...inputStyle,width:"auto",cursor:"pointer"}}>{r.active?"Pausar":"Ativar"}</button><button onClick={()=>remove(r.id)} style={{background:"#f8717122",color:"#f87171",border:"1px solid #f87171",borderRadius:8,padding:"8px 10px",cursor:"pointer"}}>Excluir</button>
    </article>)}</section>
  </div>;
}

export function useDueReminder(reminders, audience, shift, onRing) {
  const [due,setDue]=useState(null);
  useEffect(()=>{ const check=()=>{ const now=new Date(); const found=(reminders||[]).find(r=>r.audience===audience&&(audience!=="class"||r.shift==="all"||r.shift===shift)&&reminderOccurrence(r,now)); if(!found)return; const occ=reminderOccurrence(found,now); const seen=`nyx_reminder_seen_${occ.key}_${audience}_${shift||"teacher"}`; try{if(localStorage.getItem(seen))return;localStorage.setItem(seen,"1");}catch{} setDue(found); onRing?.(found); }; check(); const t=setInterval(check,1000); return()=>clearInterval(t); },[reminders,audience,shift,onRing]);
  return [due,()=>setDue(null)];
}
