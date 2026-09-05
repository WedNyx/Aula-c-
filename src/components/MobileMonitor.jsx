import { useState } from "react";
import { difficultyOf } from "../lib/studentStatus.ts";
import { DEFAULT_TURMAS } from "../lib/shifts.ts";
import { Avatar } from "./Avatar.jsx";
import { CodeBlock } from "./CodeEditor.jsx";

const PHASE_LABEL = {
  coding: "💻 Escrevendo código",
  generating: "🤖 Nyx analisando",
  activity: "📝 Na atividade",
  summary: "📖 Lendo o resumo",
  done: "✅ Concluiu",
};
const phaseLabel = (phase) => PHASE_LABEL[phase] || "⏳ Aguardando";

const DIF_COLOR = { dif: "#f87171", bem: "#34d399", neutro: "#fbbf24" };

function timeAgo(lastSeen) {
  if (!lastSeen) return { text: "nunca esteve online", color: "#776798" };
  const ms = Date.now() - lastSeen;
  if (ms < 60000) return { text: "🟢 online agora", color: "#34d399" };
  if (ms < 30 * 60000) return { text: `há ${Math.round(ms / 60000)} min`, color: "#a99ac9" };
  if (ms < 24 * 3600000) return { text: `há ${Math.round(ms / 3600000)}h`, color: "#776798" };
  return { text: "offline", color: "#776798" };
}

// ════════════════════════════════════════════════════════════════════════════
//  📱 MODO SIMPLES (celular) — no lugar do painel completo (feito pra tela grande), uma lista
//  direta de "como cada aluno está agora": situação, fase da aula, nota e tempo online. Entra
//  sozinho quando a tela é estreita (ver useViewportWidth em TeacherView); "🖥️ Modo completo"
//  sempre disponível pra quem precisar mexer em alguma configuração específica.
// ════════════════════════════════════════════════════════════════════════════
export function MobileMonitorView({ students, turmas, shiftFilter, setShiftFilter, tk, markPresentToday, unmarkPresentToday, onOpenFull }) {
  const [expanded, setExpanded] = useState(null); // chave "turno::nome" do aluno com as ações abertas
  const [busyKey, setBusyKey] = useState(null);
  const shiftList = Array.isArray(turmas) && turmas.length ? turmas : DEFAULT_TURMAS;

  const filtered = (students || []).filter(s => shiftFilter === "all" || (s.shift || shiftList[0]?.id || "matutino") === shiftFilter);
  const withStatus = filtered.map(s => ({ s, d: difficultyOf(s) }));
  const order = { dif: 0, neutro: 1, bem: 2 };
  withStatus.sort((a, b) => (order[a.d.level] ?? 3) - (order[b.d.level] ?? 3));

  const toggleKey = (s) => `${s.shift || "sem-turno"}::${s.name}`;
  const isPresentToday = (s) => (s.attendance || {})[tk] === "present";

  const runAction = async (fn, s) => {
    const key = toggleKey(s);
    setBusyKey(key);
    try { await fn(s); } finally { setBusyKey(null); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0614", padding: "14px 12px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 900, background: "linear-gradient(135deg,#c084fc,#22d3ee)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>👥 Turma agora</h1>
        <button onClick={onOpenFull} style={{ background: "#231636", color: "#a99ac9", border: "1px solid #3b2a58", borderRadius: 10, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>🖥️ Modo completo</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
        <button onClick={() => setShiftFilter("all")} style={{ background: shiftFilter === "all" ? "#c084fc" : "#171026", color: shiftFilter === "all" ? "#fff" : "#a99ac9", border: `1px solid ${shiftFilter === "all" ? "#c084fc" : "#3b2a58"}`, borderRadius: 999, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Todos</button>
        {shiftList.map(sh => (
          <button key={sh.id} onClick={() => setShiftFilter(sh.id)} style={{ background: shiftFilter === sh.id ? "#c084fc" : "#171026", color: shiftFilter === sh.id ? "#fff" : "#a99ac9", border: `1px solid ${shiftFilter === sh.id ? "#c084fc" : "#3b2a58"}`, borderRadius: 999, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{sh.emoji} {sh.label}</button>
        ))}
      </div>

      {withStatus.length === 0 ? (
        <p style={{ color: "#776798", fontSize: 13, textAlign: "center", padding: "30px 0" }}>Nenhum aluno nessa turma ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {withStatus.map(({ s, d }) => {
            const key = toggleKey(s);
            const isOpen = expanded === key;
            const ago = timeAgo(s.lastSeen);
            const present = isPresentToday(s);
            const busy = busyKey === key;
            return (
              <div key={key} style={{ background: "#171026", border: `1px solid ${DIF_COLOR[d.level]}44`, borderRadius: 14, overflow: "hidden" }}>
                <button onClick={() => setExpanded(isOpen ? null : key)} style={{ width: "100%", background: "transparent", border: "none", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left" }}>
                  <Avatar cfg={s.avatar} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: DIF_COLOR[d.level], flexShrink: 0 }} />
                      <span style={{ color: "#f0e9fb", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                    </div>
                    <div style={{ color: "#a99ac9", fontSize: 11.5, marginTop: 2 }}>{phaseLabel(s.phase)} · {s.score != null ? `nota ${s.score}` : "sem nota ainda"}</div>
                    <div style={{ color: ago.color, fontSize: 11, marginTop: 2 }}>{ago.text}</div>
                  </div>
                  <span style={{ color: "#776798", fontSize: 16, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 12px 12px", borderTop: "1px solid #3b2a5866" }}>
                    <p style={{ color: DIF_COLOR[d.level], fontSize: 12, lineHeight: 1.6, margin: "10px 0" }}>{d.text}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button disabled={busy} onClick={() => runAction(present ? unmarkPresentToday : markPresentToday, s)}
                        style={{ background: present ? "#3b2a58" : "#34d399", color: present ? "#f0e9fb" : "#03301f", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
                        {present ? "↩️ Desmarcar presença" : "✅ Marcar presença hoje"}
                      </button>
                    </div>
                    {(s.code || (s.files || []).some(f => (f.code || "").trim())) ? (
                      <details style={{ marginTop: 10 }}>
                        <summary style={{ color: "#22d3ee", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>👨‍💻 Ver código</summary>
                        {(s.files && s.files.length ? s.files : [{ name: "Program.cs", code: s.code || "" }]).map((f, i) => (
                          <div key={i} style={{ marginTop: 8 }}>
                            <CodeBlock code={f.code || "(vazio)"} filename={f.name || "Program.cs"} compact wrap />
                          </div>
                        ))}
                      </details>
                    ) : (
                      <p style={{ color: "#776798", fontSize: 11.5, marginTop: 10 }}>Ainda não escreveu nenhum código.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
