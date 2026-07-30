import { useState, useEffect, useRef } from "react";
import { shade } from "../lib/colors.ts";
import { CS_SYSTEM, NYX_GUIDED_SYSTEM, nyxPrefsInstruction } from "../lib/ai-prompts.ts";
import { askClaude } from "../lib/ai.js";
import { NyxRobot } from "./NyxRobot.jsx";

// ════════════════════════════════════════════════════════════════════════════
//  CHAT COM O NYX  (botão flutuante — aluno e professor)
// ════════════════════════════════════════════════════════════════════════════
export function NyxChat({ who = "student", context, onTheme, onCommand, accent = "#c084fc", dataTour, gear, accessMode = false, speak = null, nyxPrefs = null, language = null }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [msgs, open, busy]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    const hist = [...msgs, { from:"user", text:t }];
    setMsgs(hist); setText(""); setBusy(true);
    // comandos diretos (ex: zek, /hiberne) — executados na hora, sem passar pela IA
    if (onCommand) {
      try {
        const cmdReply = await onCommand(t);
        if (cmdReply) {
          setMsgs(ms => [...ms, { from:"nyx", text: cmdReply }]);
          setBusy(false);
          return;
        }
      } catch {}
    }
    try {
      const histTxt = hist.slice(-8).map(m => (m.from==="user" ? "Pessoa: " : "Nyx: ") + m.text).join("\n");
      const themeRule = who === "student"
        ? "\nSe (e SOMENTE se) o aluno pedir para mudar a cor ou o tema do fundo, termine sua resposta com uma linha exata: [TEMA:claro] ou [TEMA:escuro] ou [TEMA:#rrggbb] para uma cor só, ou [TEMA:#rrggbb,#rrggbb] / [TEMA:#rrggbb,#rrggbb,#rrggbb] para misturar 2 ou 3 cores num degradê (escolha tons bonitos e combinando com o que ele pediu; NUNCA mais de 3 cores). Nunca use isso em outras situações."
        : "";
      const persona = who === "student"
        ? (accessMode
            ? `Você está conversando com um aluno dentro da plataforma, num chat pequeno, e este aluno está no seu MODO GUIADO (dificuldade de leitura/escrita/motora). Responda MUITO curto (no máximo 3 frases), com palavras bem simples, sempre calorosamente. Se puder, relacione a resposta com exemplos de jogos.${themeRule}`
            : `Você está conversando com um aluno dentro da plataforma, num chat pequeno. Responda CURTO (no máximo 5 frases), simples e animado. Ajude com dúvidas de ${language ? language.label : "C#"}, dicas de estudo e o que ele precisar. Não resolva a atividade por ele — explique o caminho.${themeRule}`)
        : `Você é o assistente pessoal do PROFESSOR dentro da plataforma, num chat pequeno. Responda curto e direto (máximo 6 frases), com base nos dados da turma fornecidos. Sugira a quem dar atenção, ideias de exercícios e próximos passos quando fizer sentido.
COMANDOS DISPONÍVEIS que o professor pode digitar aqui no chat (executados por você na hora):
- "zek" → você aparece na tela de TODOS os alunos, no centro, pedindo atenção, e bloqueia tudo o que eles estiverem fazendo.
- "/hiberne" → desativa o zek e libera as telas dos alunos.
- "zeker" → bloqueia o duelo entre alunos.
- "/liberte" → libera o duelo novamente.
Se o professor perguntar como chamar a atenção da turma ou controlar os duelos, LEMBRE-O desses comandos. Outras ações (mudar nota, renomear, mover de turno ou excluir aluno, ativar Modo Guiado) o professor faz no painel Monitoramento clicando no aluno — indique o caminho quando ele pedir esse tipo de mudança.`;
      const out = await askClaude(
        `${context ? context() : ""}\n\nConversa até agora:\n${histTxt}\n\nResponda como Nyx à última mensagem.`,
        (who === "student" && accessMode ? NYX_GUIDED_SYSTEM : (who === "student" && language ? language.system : CS_SYSTEM)) + "\n\n" + persona + (who === "student" ? nyxPrefsInstruction(nyxPrefs) : ""),
        { temperature: 0.6 }
      );
      let reply = out.trim();
      const m = reply.match(/\[TEMA:([^\]]+)\]/i);
      if (m && onTheme) {
        const val = m[1].trim().toLowerCase();
        onTheme(val === "claro" ? "light" : val === "escuro" ? "dark" : val);
        reply = reply.replace(/\[TEMA:[^\]]+\]/ig, "").trim() || "Prontinho, fundo novo! 🎨";
      }
      setMsgs(ms => [...ms, { from:"nyx", text:reply }]);
    } catch (e) {
      setMsgs(ms => [...ms, { from:"nyx", text: e.message === "ROBOTKEY_MISSING" ? `Estou offline 😴 — ${e.userMsg || "o professor precisa configurar a chave da IA no Vercel."}` : "Tive um probleminha agora. Tenta de novo?" }]);
    }
    setBusy(false);
  };

  return (
    <>
      <button data-tour={dataTour} onClick={()=>setOpen(o=>!o)} title="Conversar com o Nyx"
        style={{ position:"fixed", right:18, bottom:18, zIndex:900, width:46, height:46, borderRadius:"50%", border:"none", cursor:"pointer", background:`linear-gradient(135deg, ${accent}, ${shade(accent,-0.25)})`, boxShadow:`0 6px 22px ${accent}66`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {open ? <span style={{ fontSize:20, lineHeight:1, color:"#fff" }}>✕</span> : <NyxRobot state="idle" size={34} showName={false} gear={gear} />}
        {!open && <span style={{ position:"absolute", top:-4, right:-2, background:"#34d399", borderRadius:10, fontSize:9, fontWeight:900, color:"#03301f", padding:"2px 6px" }}>NYX</span>}
      </button>
      {open && (
        <div className="pop" style={{ position:"fixed", right:18, bottom:88, zIndex:900, width:"min(370px, calc(100vw - 36px))", height:"min(460px, calc(100vh - 120px))", background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:18, boxShadow:"0 24px 60px rgba(0,0,0,.55)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"8px 14px", borderBottom:"1px solid #3a2a55", display:"flex", alignItems:"center", gap:10, background:"#171026" }}>
            <NyxRobot state="idle" size={30} showName={false} gear={gear} />
            <div>
              <div style={{ fontWeight:900, letterSpacing:2, fontSize:13, color:accent }}>NYX</div>
              <div style={{ fontSize:11, color:"#a99ac9" }}>{who==="student" ? "seu ajudante de C#" : "assistente do professor"}</div>
            </div>
          </div>
          <div ref={listRef} style={{ flex:1, overflowY:"auto", padding:12 }}>
            {msgs.length === 0 && (
              <div style={{ background:"#171026", border:"1px solid #3a2a55", borderRadius:"12px 12px 12px 4px", padding:"10px 12px", fontSize:13, color:"#d6c9ec", lineHeight:1.6, maxWidth:"88%" }}>
                {who === "student"
                  ? "Oi! Pode me perguntar qualquer coisa de C#, pedir uma dica… ou até pedir para mudar a cor do fundo! 🎨"
                  : "Olá, professor! Pergunte sobre a turma, peça sugestões de exercícios ou o que precisar. 👨‍🏫"}
              </div>
            )}
            {msgs.map((m,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:m.from==="user"?"flex-end":"flex-start", marginTop:8, alignItems:"flex-end", gap:5 }}>
                <div style={{ background:m.from==="user"?accent+"2e":"#171026", border:`1px solid ${m.from==="user"?accent+"66":"#3a2a55"}`, borderRadius:m.from==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px", padding:"9px 12px", fontSize:13, color:"#f0e9fb", lineHeight:1.6, maxWidth:"88%", whiteSpace:"pre-wrap" }}>{m.text}</div>
                {m.from!=="user" && speak && (
                  <button onClick={()=>speak(m.text)} title="Ouvir esta resposta" style={{ background:"transparent", border:`1px solid ${accent}55`, color:accent, borderRadius:8, padding:"3px 7px", fontSize:11, cursor:"pointer", flexShrink:0 }}>🔊</button>
                )}
              </div>
            ))}
            {busy && <div style={{ color:"#a99ac9", fontSize:12, marginTop:8 }}>Nyx está digitando…</div>}
          </div>
          <div style={{ display:"flex", gap:8, padding:10, borderTop:"1px solid #3a2a55", background:"#171026" }}>
            <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{ if (e.key==="Enter") send(); }} placeholder="Escreva para o Nyx..."
              style={{ flex:1, background:"#1a1029", border:"1px solid #3b2a58", borderRadius:10, padding:"9px 12px", color:"#f0e9fb", fontSize:13, outline:"none" }} />
            <button onClick={send} disabled={busy} style={{ background:`linear-gradient(135deg, ${accent}, ${shade(accent,-0.25)})`, border:"none", borderRadius:10, color:"#fff", fontWeight:800, padding:"0 16px", cursor:"pointer", opacity:busy?0.6:1 }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

