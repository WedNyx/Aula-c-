// classifica a situação de um aluno pro professor (bem/neutro/dif) — usado pelos indicadores
// rápidos do painel (👀 Situação, telão) e pela detecção automática de aluno "travado"
export const STUCK_MINUTES = 8; // quanto tempo sem escrever nada (com a aba online) até o professor ser avisado

export function difficultyOf(s) {
  if (s.phase==="done") {
    if ((s.score||0) >= 70) return { level:"bem", text:`Concluiu a aula com nota ${s.score}.` };
    return { level:"dif", text:`Concluiu, mas com nota baixa (${s.score}). Vale revisar o conteúdo com ele.` };
  }
  if (s.hasError && s.feedback && s.feedback.message) return { level:"dif", text:"Erro no código → " + s.feedback.message };
  if (s.phase==="activity") return { level:"bem", text:"Está fazendo a atividade." };
  if (s.phase==="summary") return { level:"bem", text:"Está lendo o resumo." };
  if (s.feedback && s.feedback.ok) return { level:"bem", text:"Código sem erros até agora." };
  // 🕰️ travado: já faz um tempo bom que entrou, continua online AGORA (não é aba esquecida aberta)
  // e ainda não escreveu quase nada — o resto da lógica acima só pega quem já ERROU ou já
  // TERMINOU com nota baixa; quem trava sem nem começar nunca aparecia como "precisa de ajuda"
  const onlineNow = s.lastSeen && (Date.now() - s.lastSeen) < 30000;
  const longSession = s.joinedAt && (Date.now() - s.joinedAt) > STUCK_MINUTES * 60000;
  const codeLen = (s.code || "").trim().length;
  if (onlineNow && longSession && codeLen < 10) {
    const mins = Math.round((Date.now() - s.joinedAt) / 60000);
    return { level:"dif", text:`Parece travado(a) — já está há ${mins} min na aula e ainda não escreveu nada.` };
  }
  if (!s.code || s.code.trim().length < 10) return { level:"neutro", text:"Ainda não começou a escrever." };
  return { level:"neutro", text:"Está escrevendo o código." };
}
