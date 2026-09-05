import { useState } from "react";
import { materialSelectionDefaults, materialSelectionSummary, selectMaterialParts } from "../lib/materialDelivery.js";

export function MaterialDeliveryModal({ material, turmaLabel, busy, onClose, onConfirm }) {
  const [selection,setSelection]=useState(()=>materialSelectionDefaults(material));
  const toggleIndex=(key,index)=>setSelection(current=>({ ...current,[key]:current[key].includes(index)?current[key].filter(i=>i!==index):[...current[key],index] }));
  const selected=selectMaterialParts(material,selection);
  const box={background:"#171026",border:"1px solid #3b2a58",borderRadius:11,padding:11,color:"#d6c9ec",display:"flex",gap:9,alignItems:"flex-start"};
  return <div style={{position:"fixed",inset:0,zIndex:1300,background:"#0b0614dd",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><div className="pop" role="dialog" aria-modal="true" aria-labelledby="delivery-title" style={{width:"min(680px,100%)",maxHeight:"90vh",overflowY:"auto",background:"linear-gradient(180deg,#231636,#1a1029)",border:"1px solid #22d3ee66",borderRadius:20,padding:20}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12}}><div><h2 id="delivery-title" style={{margin:0,color:"#f0e9fb",fontSize:19}}>📤 Escolher o que enviar</h2><p style={{color:"#a99ac9",fontSize:12.5,margin:"4px 0 14px"}}>Turma: {turmaLabel}. O material original continuará completo.</p></div><button disabled={busy} onClick={onClose} style={{background:"none",border:0,color:"#a99ac9",fontSize:22,cursor:"pointer"}}>✕</button></div>
    <fieldset disabled={busy} style={{border:0,padding:0,margin:0,display:"grid",gap:8}}>
      {material.intro&&<label style={box}><input type="checkbox" checked={selection.intro} onChange={()=>setSelection(s=>({...s,intro:!s.intro}))}/><span><b>Introdução</b><small style={{display:"block",marginTop:3}}>{material.intro}</small></span></label>}
      {(material.secoes||[]).map((section,index)=><label key={`s-${index}`} style={box}><input type="checkbox" checked={selection.sections.includes(index)} onChange={()=>toggleIndex("sections",index)}/><span><b>Seção {index+1}: {section.titulo}</b><small style={{display:"block",marginTop:3}}>{section.explicacao}</small></span></label>)}
      {(material.atividade||[]).map((question,index)=><label key={`q-${index}`} style={box}><input type="checkbox" checked={selection.questions.includes(index)} onChange={()=>toggleIndex("questions",index)}/><span><b>Questão {index+1}</b><small style={{display:"block",marginTop:3}}>{question.q}</small></span></label>)}
      {material.dica&&<label style={box}><input type="checkbox" checked={selection.tip} onChange={()=>setSelection(s=>({...s,tip:!s.tip}))}/><span><b>Dica final</b><small style={{display:"block",marginTop:3}}>{material.dica}</small></span></label>}
    </fieldset>
    <p role="status" style={{color:selected?"#a5f3fc":"#f87171",fontSize:12.5,fontWeight:700}}>Selecionado: {materialSelectionSummary(material,selection)}</p>
    <div style={{display:"flex",gap:8}}><button disabled={busy} onClick={onClose} style={{flex:1,padding:10}}>Cancelar</button><button disabled={busy||!selected} onClick={()=>onConfirm(selected)} style={{flex:2,border:0,borderRadius:10,background:"linear-gradient(135deg,#22d3ee,#8b5cf6)",color:"white",fontWeight:900,cursor:selected?"pointer":"not-allowed",opacity:selected?1:.5}}>{busy?"Enviando…":"Confirmar envio"}</button></div>
  </div></div>;
}
