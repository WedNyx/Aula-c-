import { useState, useEffect } from "react";
import { todayKey } from "./schedule.js";

// deixa um trecho de código C# falável: quebra por linha (o \n vira uma pausa) e tira espaços nas pontas
export function codeForSpeech(codigo) {
  if (!codigo) return "";
  return String(codigo).split("\n").map(l => l.trim()).filter(Boolean).join(". ");
}

// ── largura da tela (pra layouts responsivos feitos em JS, já que os estilos são inline e não usam @media) ──
export function useViewportWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

// ── sequência de dias (streak) a partir do mapa de presença, contando só os DIAS DE AULA de
// verdade (classDays) — não dias de calendário corridos, senão a sequência quebra sozinha em
// qualquer dia sem aula (fim de semana, feriado) e nunca bate os patamares de conquista ──
export function computeStreak(attendance, classDays) {
  if (!attendance || !Array.isArray(classDays) || !classDays.length) return 0;
  const days = [...new Set(classDays)].sort();
  const todayStr = todayKey();
  let idx = days.length - 1;
  // se hoje é dia de aula mas ainda sem presença registrada, começa a contar do dia de aula anterior
  if (days[idx] === todayStr && attendance[todayStr] !== "present") idx--;
  let streak = 0;
  for (; idx >= 0; idx--) {
    if (attendance[days[idx]] === "present") streak++;
    else break;
  }
  return streak;
}

// ── embaralha as alternativas de cada questão (a correta não fica sempre na mesma posição) ──
export function shuffleQuestions(questions) {
  return (questions || []).map(q => {
    const n = (q.opts || []).length;
    if (n < 2) return q;
    const perm = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    return { ...q, opts: perm.map(p => q.opts[p]), correct: perm.indexOf(q.correct) };
  });
}

// ── atividade concluída "vale" até as 9h da manhã do dia seguinte ──
export function isDoneActive(doneAt) {
  if (!doneAt) return false;
  const d = new Date(doneAt);
  const deadline = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 9, 0, 0);
  return Date.now() < deadline.getTime();
}

// ── notas por faixa (usadas na atividade e no feedback do Nyx) ──
export function gradeInfo(score) {
  if (score >= 100) return { label:"GOD", emoji:"🐐", color:"#f472b6" };
  if (score >= 90)  return { label:"Excelente", emoji:"🏆", color:"#fbbf24" };
  if (score >= 75)  return { label:"Ótimo", emoji:"⭐", color:"#34d399" };
  if (score >= 60)  return { label:"Bom", emoji:"👍", color:"#60a5fa" };
  if (score >= 40)  return { label:"Médio", emoji:"😐", color:"#f59e0b" };
  return { label:"Ruim", emoji:"📚", color:"#f87171" };
}

// verificação local instantânea (sem IA)
export function quickCheck(code){
  const c = code
    .replace(/\/\*[\s\S]*?\*\//g, "")      // comentários /* */
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')     // conteúdo de strings
    .replace(/'(?:[^'\\]|\\.)'/g, "''")      // chars como '{'
    .replace(/\/\/.*$/gm, "");               // comentários //
  const count = (ch) => c.split(ch).length - 1;
  const pairs = { "{":"}", "(":")", "[":"]" };
  for (const o of Object.keys(pairs)){
    const cl = pairs[o], co = count(o), cc = count(cl);
    if (co > cc) return { ok:false, message:`Você abriu "${o}" e ainda não fechou com "${cl}". Vá até onde abriu e coloque "${cl}".`, missing:[cl] };
    if (cc > co) return { ok:false, message:`Tem um "${cl}" a mais, sem o "${o}" para combinar. Confira e apague o que sobrou.`, missing:[o] };
  }
  if ((c.match(/"/g)||[]).length % 2 !== 0)
    return { ok:false, message:`Tem uma aspa " aberta e sem fechar. Toda aspa que abre precisa fechar: "seu texto".`, missing:['"'] };
  return null;
}
