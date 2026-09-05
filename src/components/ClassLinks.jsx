import { useState } from "react";
import { addClassLink, removeClassLink } from "../lib/classLinks.js";

export function ClassLinksModal({ links, onClose, styles }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(11,6,20,.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1200,padding:16}} onClick={onClose}>
      <div className="pop" role="dialog" aria-modal="true" aria-labelledby="class-links-title" style={{...styles.card,width:"100%",maxWidth:560,maxHeight:"80vh",overflow:"auto",margin:0}} onClick={event=>event.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
          <h3 id="class-links-title" style={{color:"#22d3ee",margin:0}}>🔗 Sites da turma</h3>
          <button type="button" aria-label="Fechar sites da turma" onClick={onClose} style={{...styles.btnGhost,padding:"5px 10px"}}>✕</button>
        </div>
        <p style={{color:"#a99ac9",fontSize:13,lineHeight:1.6}}>Atalhos escolhidos pelo professor para esta turma.</p>
        {!links.length ? <p style={{color:"#776798",fontSize:13}}>Nenhum site foi liberado ainda.</p> : (
          <div style={{display:"grid",gap:9}}>{links.map(link=>(
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" style={{background:"#171026",border:"1px solid #3b2a58",borderRadius:12,padding:"12px 14px",color:"#f0e9fb",textDecoration:"none",display:"flex",justifyContent:"space-between",gap:10}}>
              <span><b>{link.title}</b>{link.description&&<small style={{display:"block",color:"#a99ac9",marginTop:3}}>{link.description}</small>}</span><span aria-hidden="true">↗</span>
            </a>
          ))}</div>
        )}
      </div>
    </div>
  );
}

export function TeacherClassLinksPanel({ resourceLinks, turmaId, turmas, styles, onTurmaChange, onSave }) {
  const [title,setTitle]=useState("");
  const [url,setUrl]=useState("");
  const [description,setDescription]=useState("");
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);
  const links = Array.isArray(resourceLinks?.[turmaId]) ? resourceLinks[turmaId] : [];
  const save = async next => { setSaving(true); const ok=await onSave(next); setSaving(false); return ok; };
  const add = async () => {
    const result=addClassLink(resourceLinks,turmaId,{title,url,description});
    if(!result.ok){setMessage(`⚠ ${result.error}`);return;}
    if(await save(result.links)){setTitle("");setUrl("");setDescription("");setMessage("✅ Site liberado para a turma.");}
    else setMessage("⚠ Não consegui salvar agora. Tente novamente.");
  };
  const remove = async id => {
    if(await save(removeClassLink(resourceLinks,turmaId,id))) setMessage("✅ Site removido.");
    else setMessage("⚠ Não consegui remover agora.");
  };
  return <div style={{padding:14,maxWidth:900,margin:"0 auto"}}><div data-tour-prof="sites" className="cardfx" style={styles.card}>
    <h3 style={{color:"#22d3ee",marginBottom:6}}>🔗 Sites da turma</h3>
    <p style={{color:"#a99ac9",fontSize:13,lineHeight:1.6}}>Cadastre endereços específicos para os alunos abrirem diretamente pela plataforma. Somente links HTTPS são aceitos.</p>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{turmas.map(t=><button key={t.id} onClick={()=>onTurmaChange(t.id)} style={styles.tab(turmaId===t.id)}>{t.emoji} {t.label}</button>)}</div>
    <div style={{display:"grid",gap:8}}>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nome do site" maxLength={80} />
      <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://exemplo.com" inputMode="url" />
      <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descrição curta (opcional)" maxLength={160} />
      <button onClick={add} disabled={saving} style={{...styles.btn("#22d3ee"),opacity:saving?.6:1}}>{saving?"Salvando...":"Adicionar site"}</button>
    </div>
    {message&&<p role="status" style={{color:message.startsWith("✅")?"#34d399":"#fbbf24",fontSize:13}}>{message}</p>}
    <div style={{display:"grid",gap:8,marginTop:14}}>{links.map(link=><div key={link.id} style={{background:"#171026",border:"1px solid #3b2a58",borderRadius:10,padding:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><span style={{minWidth:0}}><b>{link.title}</b><small style={{display:"block",color:"#a99ac9",overflow:"hidden",textOverflow:"ellipsis"}}>{link.url}</small></span><button onClick={()=>remove(link.id)} disabled={saving} style={{...styles.btnGhost,color:"#f87171",padding:"6px 10px"}}>Remover</button></div>)}</div>
  </div></div>;
}
