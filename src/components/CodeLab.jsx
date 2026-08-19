import { useState, useEffect } from "react";
import { quickCheck } from "../lib/utils.js";
import { askClaudeJson } from "../lib/ai.js";
import { otherFilesCtx } from "../lib/languages.ts";
import { CS_SYSTEM } from "../lib/ai-prompts.ts";
import { VSEditor } from "./CodeEditor.jsx";
import { Terminal } from "./Terminal.jsx";
import { KeyVisual } from "./KeyVisual.jsx";
import { NYX_ITEMS, DEFAULT_NYX_GEAR } from "./NyxRobot.jsx";
import { NyxPrismaOrbital as NyxRobot } from "./NyxPrismaOrbital.jsx";
import { NyxShop } from "./NyxShop.jsx";

export function CodeLab({ accent = "#fbbf24", files = [{ name:"Program.cs", code:"" }], onChange = ()=>{}, terminalMaxHeight, gear = DEFAULT_NYX_GEAR, onEquip = ()=>{} }) {
  const setFiles = (updater) => onChange(typeof updater === "function" ? updater(files) : updater);
  const [active, setActive] = useState(0);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [robotState, setRobotState] = useState("idle");
  const [robotMsg, setRobotMsg] = useState("");
  const [keysToShow, setKeysToShow] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const activeCode = files[active]?.code || "";

  const updateActiveCode = (newCode) => setFiles(fs => fs.map((f,i)=> i===active ? { ...f, code:newCode } : f));
  const uniqueName = (base, ignoreIdx=-1) => { let name=base, n=2; while (files.some((f,i)=> i!==ignoreIdx && f.name.toLowerCase()===name.toLowerCase())) { name = base.replace(/\.cs$/i,"")+n+".cs"; n++; } return name; };
  const addFile = () => { const name=uniqueName(`Arquivo${files.length+1}.cs`); const idx=files.length; setFiles(fs=>[...fs,{name,code:""}]); setActive(idx); setRenaming(idx); setRenameValue(name.replace(/\.cs$/i,"")); };
  const deleteFile = (idx) => { if (files.length<=1) return; setFiles(fs=>fs.filter((_,i)=>i!==idx)); setActive(a=>(idx<=a?Math.max(0,a-1):a)); };
  const openRename = (idx) => { setRenaming(idx); setRenameValue((files[idx]?.name||"").replace(/\.cs$/i,"")); };
  const confirmRename = () => { if(renaming==null) return; let base=String(renameValue).trim().replace(/["'\/\\]/g,""); if(!base) base=`Arquivo${renaming+1}`; let name=/\.cs$/i.test(base)?base:base+".cs"; name=uniqueName(name,renaming); const idx=renaming; setFiles(fs=>fs.map((f,i)=>i===idx?{...f,name}:f)); setRenaming(null); setRenameValue(""); };
  const cancelRename = () => { setRenaming(null); setRenameValue(""); };

  // robô: só analisa quando clicar no botão
  useEffect(() => {
    const trimmed = activeCode.trim();
    if (trimmed.length < 12) { setRobotState("idle"); setRobotMsg(""); setKeysToShow([]); }
  }, [activeCode]);

  const analyzeCode = async () => {
    const trimmed = activeCode.trim();
    if (trimmed.length < 12 || analyzing) return;
    setRobotState("thinking"); setAnalyzing(true);
    const quick = quickCheck(activeCode);
    if (quick) { setRobotState("error"); setRobotMsg(quick.message); setKeysToShow(quick.missing||[]); setAnalyzing(false); return; }
    try {
      const parsed = await askClaudeJson(
        `Revise este código C# como um compilador faria, linha por linha. Top-level statements e ausência de using System são válidos. Confira pares de chaves/parênteses/aspas no arquivo inteiro antes de acusar falta, e todas as linhas anteriores antes de acusar variável não declarada. Não invente erro em código correto.\n\n${otherFilesCtx(files, active)}Arquivo em edição (${files[active]?.name || "Program.cs"}):\n\`\`\`csharp\n${activeCode}\n\`\`\`\n\nResponda APENAS JSON puro com os campos NESTA ordem: {"analise":"verificação curta linha a linha (interno)","ok":true/false,"message":"elogio curto se ok; se houver erro, onde está e como corrigir em 1-3 frases","missingChars":["símbolos que faltam"]}`,
        CS_SYSTEM + "\nResponda APENAS JSON puro, sem markdown.",
        { temperature: 0 }
      );
      setRobotState(parsed.ok?"ok":"error"); setRobotMsg(parsed.message); setKeysToShow(parsed.missingChars||[]);
    } catch(e) {
      if (e.message === 'ROBOTKEY_MISSING') { setRobotState("error"); setRobotMsg(e.userMsg || "🔑 Nyx está offline: configure a chave da IA no Vercel."); }
      else { setRobotState("error"); setRobotMsg("😵 Nyx não conseguiu analisar agora (falha ao falar com a IA). Tente de novo em alguns instantes."); }
    }
    setAnalyzing(false);
  };

  // robô: analisa sozinho 5s depois que o professor para de escrever (reagenda a cada tecla)
  useEffect(() => {
    if (activeCode.trim().length < 12 || analyzing) return;
    const t = setTimeout(() => { analyzeCode(); }, 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCode]);

  const card = { background:"linear-gradient(180deg,#231636,#1a1029)", borderRadius:16, padding:16, margin:"10px 0", border:"1px solid #3a2a55", boxShadow:"0 8px 24px rgba(3,5,16,.35)" };

  return (
    <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
      {renaming != null && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#1e1430", border:`2px solid ${accent}`, borderRadius:16, padding:24, maxWidth:380, width:"100%" }}>
            <h3 style={{ color:accent, margin:"0 0 4px" }}>✎ Renomear arquivo</h3>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 12px" }}>Escolha um nome (o ".cs" é colocado sozinho).</p>
            <div style={{ display:"flex", alignItems:"center", background:"#171026", border:"2px solid #3b2a58", borderRadius:10, padding:"0 12px" }}>
              <input autoFocus value={renameValue} onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") confirmRename(); if(e.key==="Escape") cancelRename(); }} placeholder="ex: MeuPrograma" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#f0e9fb", fontSize:15, padding:"11px 0" }} />
              <span style={{ color:"#776798", fontSize:14 }}>.cs</span>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={cancelRename} style={{ background:"#3b2a58", color:"#fff", border:"none", borderRadius:8, padding:"10px 0", cursor:"pointer", fontWeight:700, flex:1 }}>Cancelar</button>
              <button onClick={confirmRename} style={{ background:accent, color:"#fff", border:"none", borderRadius:8, padding:"10px 0", cursor:"pointer", fontWeight:700, flex:1 }}>Salvar nome</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex:"1 1 560px", minWidth:320 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
          {files.map((f,i)=>(
            <div key={i} onClick={()=>setActive(i)} style={{ display:"flex", alignItems:"center", gap:6, background:i===active?"#1e1e1e":"#101425", border:`1px solid ${i===active?accent:"#3b2a58"}`, color:i===active?"#fff":"#a99ac9", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>
              <span>📄 {f.name}</span>
              <span onClick={(e)=>{e.stopPropagation();openRename(i);}} title="Renomear" style={{ color:accent, fontWeight:700 }}>✎</span>
              {files.length>1 && <span onClick={(e)=>{e.stopPropagation();deleteFile(i);}} title="Apagar" style={{ color:"#f87171", fontWeight:700 }}>✕</span>}
            </div>
          ))}
          <button onClick={addFile} style={{ background:"#171026", border:`1px dashed ${accent}`, color:accent, borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>＋ Novo arquivo</button>
        </div>

        <VSEditor value={activeCode} onChange={updateActiveCode} filename={files[active]?.name} />

        <div style={{ display:"flex", justifyContent:"flex-start", alignItems:"center", marginTop:8 }}>
          <span style={{ color:"#776798", fontSize:12 }}>{analyzing?"🔍 Verificando...":"✨ Nyx confere seu código 5s depois que você para de escrever"}</span>
        </div>

        <Terminal files={files} maxHeight={terminalMaxHeight} />
      </div>

      <div className="side-col" style={{ width:250, flex:"0 0 250px" }}>
        <div style={card}>
          <NyxRobot state={robotState} size={88} context="teacher" gear={gear} />
          <button style={{ background:"transparent", border:"1px solid #c084fc", color:"#c084fc", borderRadius:8, width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5, cursor:"pointer", fontWeight:700 }} onClick={()=>setShowShop(true)}>🎁 Personalizar o Nyx</button>
          {robotMsg && (<div style={{ background:robotState==="error"?"#f8717111":"#34d39911", border:`1px solid ${robotState==="error"?"#f87171":"#34d399"}`, borderRadius:8, padding:12, marginTop:10, fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{robotMsg}</div>)}
          {keysToShow.length>0 && (<div style={{ marginTop:10 }}><p style={{ color:accent, fontSize:12, fontWeight:600, marginBottom:4 }}>Teclas para usar:</p>{keysToShow.map((k,i)=><KeyVisual key={i} char={k}/>)}</div>)}
        </div>
        {showShop && (
          <NyxShop wallet={9999} owned={NYX_ITEMS.map(i=>i.id)} gear={gear} onEquip={onEquip} onBuy={()=>{}} isTestShift={true} onClose={()=>setShowShop(false)} />
        )}
        <div style={{ ...card, fontSize:12, color:"#776798", lineHeight:1.8 }}>
          <p style={{ color:accent, fontWeight:600, marginBottom:6 }}>👩‍🏫 O exemplo da aula</p>
          <p style={{ color:"#a99ac9" }}>Programe aqui o exemplo de hoje e teste com o ▶ dotnet run. Este código <b>fica salvo</b> e é usado para gerar o nome do conteúdo do dia. Os alunos não veem esta área.</p>
        </div>
      </div>
    </div>
  );
}
