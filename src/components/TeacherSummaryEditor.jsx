import { useState } from "react";
import { validateManualMaterial } from "../lib/manualTeaching.js";

const section = () => ({ titulo:"", explicacao:"", exemplo:"" });
const question = () => ({ q:"", opts:["","","",""], correct:0 });
const field = { width:"100%", boxSizing:"border-box", background:"#171026", border:"1px solid #3b2a58", borderRadius:9, color:"#f0e9fb", padding:"9px 11px", fontSize:12.5 };

export function TeacherSummaryEditor({ initial, onSave, onClose, exam = false }) {
  const [intro,setIntro]=useState(initial?.intro||"");
  const [sections,setSections]=useState(initial?.secoes?.length?initial.secoes:[section()]);
  const [tip,setTip]=useState(initial?.dica||"");
  const [questions,setQuestions]=useState(initial?.atividade?.length?initial.atividade:[question()]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const sec=(i,key,value)=>setSections(a=>a.map((s,j)=>j===i?{...s,[key]:value}:s));
  const que=(i,patch)=>setQuestions(a=>a.map((q,j)=>j===i?{...q,...patch}:q));
  const opt=(qi,oi,value)=>que(qi,{opts:questions[qi].opts.map((o,j)=>j===oi?value:o)});
  const save=async()=>{
    if(busy) return;
    setError(""); setBusy(true);
    try {
      const data=validateManualMaterial({intro,sections,tip,questions},exam);
      if(await onSave(data) === false) setError("Não foi possível guardar. Seu texto continua aqui para tentar novamente.");
    } catch(e) { setError(e.message || "Não foi possível guardar."); }
    finally { setBusy(false); }
  };
  return <div style={{position:"fixed",inset:0,zIndex:1250,background:"#0b0614dd",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><div className="pop" style={{width:"min(760px,100%)",maxHeight:"90vh",overflowY:"auto",background:"linear-gradient(180deg,#231636,#1a1029)",border:"1px solid #c084fc66",borderRadius:20,padding:20}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12}}><div><h2 style={{margin:0,color:"#f0e9fb",fontSize:19}}>{exam ? "✍️ Criar prova manual" : "✍️ Escrever resumo e atividade"}</h2><p style={{color:"#a99ac9",fontSize:12.5,margin:"4px 0 14px"}}>{exam ? "Escreva a revisão e as questões. Guardar libera 30 minutos de revisão antes da prova começar." : "As seções ficam organizadas no mesmo formato do resumo do Nyx."}</p></div><button disabled={busy} onClick={onClose} style={{background:"none",border:0,color:"#a99ac9",fontSize:22,cursor:"pointer"}}>✕</button></div>
    <fieldset disabled={busy} style={{border:0,padding:0,margin:0}}><textarea value={intro} onChange={e=>setIntro(e.target.value)} rows={3} placeholder="Introdução: o que a turma aprendeu?" style={{...field,resize:"vertical"}}/>
    <h3 style={{color:"#fbbf24",fontSize:14}}>📚 Seções</h3>{sections.map((s,i)=><div key={i} style={{background:"#ffffff07",border:"1px solid #3b2a58",borderRadius:12,padding:12,marginBottom:9}}><div style={{display:"flex",gap:8}}><input value={s.titulo} onChange={e=>sec(i,"titulo",e.target.value)} placeholder={`Título da seção ${i+1}`} style={{...field,flex:1}}/><button onClick={()=>setSections(a=>a.filter((_,j)=>j!==i))} disabled={sections.length===1}>🗑️</button></div><textarea value={s.explicacao} onChange={e=>sec(i,"explicacao",e.target.value)} rows={3} placeholder="Explicação" style={{...field,marginTop:7,resize:"vertical"}}/><textarea value={s.exemplo} onChange={e=>sec(i,"exemplo",e.target.value)} rows={2} placeholder="Exemplo ou código (opcional)" style={{...field,marginTop:7,resize:"vertical",fontFamily:"monospace"}}/></div>)}
    <button onClick={()=>setSections(a=>[...a,section()])} style={{border:"1px dashed #c084fc",background:"transparent",color:"#c084fc",borderRadius:9,padding:7,cursor:"pointer"}}>＋ Seção</button><textarea value={tip} onChange={e=>setTip(e.target.value)} rows={2} placeholder="Dica final (opcional)" style={{...field,marginTop:10}}/>
    <h3 style={{color:"#22d3ee",fontSize:14,marginBottom:4}}>{exam ? "🎯 Questões da prova (obrigatórias)" : "🎯 Atividade opcional"}</h3><p style={{color:"#776798",fontSize:11.5}}>Marque a alternativa correta. Nada será inventado pela IA.</p>{questions.map((q,qi)=><div key={qi} style={{background:"#22d3ee08",border:"1px solid #22d3ee44",borderRadius:12,padding:12,marginBottom:9}}><div style={{display:"flex",gap:8}}><input value={q.q} onChange={e=>que(qi,{q:e.target.value})} placeholder={`Pergunta ${qi+1}`} style={{...field,flex:1}}/><button onClick={()=>setQuestions(a=>a.filter((_,j)=>j!==qi))}>🗑️</button></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginTop:8}}>{q.opts.map((o,oi)=><label key={oi} style={{display:"flex",alignItems:"center",gap:5}}><input type="radio" name={`correct-${qi}`} checked={q.correct===oi} onChange={()=>que(qi,{correct:oi})}/><input value={o} onChange={e=>opt(qi,oi,e.target.value)} placeholder={`${"ABCD"[oi]}. Alternativa`} style={field}/></label>)}</div></div>)}<button onClick={()=>setQuestions(a=>[...a,question()])} style={{border:"1px dashed #22d3ee",background:"transparent",color:"#22d3ee",borderRadius:9,padding:7,cursor:"pointer"}}>＋ Pergunta</button>
    {error&&<p style={{color:"#f87171",fontSize:12.5}}>{error}</p>}<div style={{display:"flex",gap:8,marginTop:18}}><button disabled={busy} onClick={onClose} style={{flex:1,padding:10}}>Cancelar</button><button disabled={busy} onClick={save} style={{flex:2,border:0,borderRadius:10,background:"linear-gradient(135deg,#c084fc,#22d3ee)",color:"white",fontWeight:900,cursor:"pointer"}}>{busy ? "Guardando…" : exam ? "💾 Criar prova e liberar revisão" : "💾 Guardar"}</button></div>
    </fieldset>
  </div></div>;
}
