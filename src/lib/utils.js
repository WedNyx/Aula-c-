import { useState, useEffect } from "react";
import { todayKey } from "./schedule.ts";

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
// qualquer dia sem aula (fim de semana, feriado) e nunca bate os patamares de conquista.
// justifications (opcional) deixa a sequência "congelada" numa falta JUSTIFICADA (não conta como
// presença, mas também não quebra a sequência) — só uma falta comum, sem justificativa aprovada,
// zera de verdade. Aula cancelada nem entra aqui: um dia removido de classDays já não é olhado.
export function computeStreak(attendance, classDays, justifications) {
  if (!attendance || !Array.isArray(classDays) || !classDays.length) return 0;
  const days = [...new Set(classDays)].sort();
  const todayStr = todayKey();
  let idx = days.length - 1;
  // se hoje é dia de aula mas ainda sem presença registrada, começa a contar do dia de aula anterior
  if (days[idx] === todayStr && attendance[todayStr] !== "present") idx--;
  let streak = 0;
  for (; idx >= 0; idx--) {
    const day = days[idx];
    if (attendance[day] === "present") { streak++; continue; }
    if (justifications && justifications[day] && justifications[day].status === "approved") continue; // congela, não quebra
    break;
  }
  return streak;
}

// ── pontos de recompensa pela sequência de presença: cresce nos primeiros dias e depois se
// estabiliza num teto — não é uma escada infinita, só reconhece que manter o ritmo é difícil no
// começo. streakLen já inclui o dia de hoje (1 = primeiro dia, 2 = segundo dia seguido...) ──
export function streakPointsFor(streakLen) {
  if (streakLen <= 1) return 1;
  if (streakLen === 2) return 3;
  if (streakLen === 3) return 5;
  return 7;
}

// ── descarta questões que a IA gerou sem gabarito válido (correct fora do range de opts, ou
// menos de 2 alternativas) — sem isso, uma questão malformada fica IMPOSSÍVEL de acertar pra
// QUALQUER aluno depois do shuffleQuestions (indexOf de um valor que não existe vira -1) ──
export function filterValidQuestions(questions) {
  return (questions || []).filter(q =>
    q && Array.isArray(q.opts) && q.opts.length >= 2 &&
    Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.opts.length
  );
}

// ── compara o que o aluno digitou com a frase-alvo do tutorial de teclado, ignorando: quantas
// linhas o texto quebra (colapsa todo espaço em branco/quebra de linha num espaço só) e o
// conteúdo que estiver DENTRO de aspas (só precisa ter aspas no lugar certo, o texto dentro pode
// ser diferente) — o resto da estrutura precisa bater exatamente ──
function normalizeForPhraseCompare(s) {
  return String(s || "")
    .replace(/"[^"]*"/g, '""')
    .replace(/\s+/g, " ")
    .trim();
}
export function phraseMatches(typed, target) {
  return normalizeForPhraseCompare(typed) === normalizeForPhraseCompare(target);
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

// chave canônica de um conjunto de arquivos, pra comparar código "igual" independente da ordem dos
// arquivos — usada pra achar, na biblioteca "Minhas aulas", uma aula salva com o MESMO código que
// está em uso agora, e assim reaproveitar conteúdo pronto (explicação/resumo/atividade) em vez de
// pedir tudo de novo pro Nyx
export function lessonFilesKey(files) {
  return (Array.isArray(files) ? files : [])
    .filter(f => (f?.code || "").trim())
    // "\n===\n" como separador entre nome/código e entre arquivos (em vez de juntar tudo direto):
    // sem um delimitador que não apareça no meio de um nome/código, dois conjuntos de arquivos
    // DIFERENTES podiam gerar a mesma chave por coincidência (ex: um arquivo "A.cs" com código
    // "1B.cs 2" batia com dois arquivos "A.cs"/"1" e "B.cs"/"2"), reaproveitando por engano o
    // conteúdo pronto de uma aula errada
    .map(f => `${f.name}\n===\n${f.code.trim()}`)
    .sort()
    .join("\n---\n");
}
// acha, numa lista de aulas salvas (mesmo formato de "Minhas aulas"), a primeira com o código
// EXATAMENTE igual ao dos arquivos passados — null se não achar ou se não houver código pra comparar
export function findMatchingLesson(lessons, files) {
  const key = lessonFilesKey(files);
  if (!key) return null;
  return (Array.isArray(lessons) ? lessons : []).find(l => lessonFilesKey(l.files) === key) || null;
}

// compara um conjunto de arquivos ATUAL com uma "foto" anterior (mesmo formato {name,code}) e
// devolve só as linhas que ainda não estavam lá, uma seção por arquivo com cabeçalho — usado pra
// saber o que é código NOVO desde a última vez que algo foi gerado a partir dele (ex: resumo do
// professor continuando de onde parou, em vez de resumir tudo de novo do zero a cada geração)
export function codeDiffByFile(currentFiles, snapshotFiles) {
  const oldByName = Object.fromEntries((snapshotFiles || []).map(f => [f.name, f.code || ""]));
  return (currentFiles || [])
    .map(f => {
      const oldCode = oldByName[f.name];
      if (oldCode == null || !oldCode.trim()) return { name: f.name, code: f.code || "" }; // arquivo novo (ou vazio antes): tudo é novo
      const oldLines = new Set(oldCode.split("\n").map(l => l.trim()).filter(Boolean));
      const newLines = (f.code || "").split("\n").filter(l => l.trim() && !oldLines.has(l.trim()));
      return { name: f.name, code: newLines.join("\n") };
    })
    .filter(f => (f.code || "").trim())
    .map(f => `// ===== ${f.name} =====\n${f.code}`)
    .join("\n\n");
}

// verificação local instantânea (sem IA)
export function quickCheck(code){
  const c = code
    .replace(/\/\*[\s\S]*?\*\//g, "")      // comentários /* */
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')     // conteúdo de strings
    .replace(/'(?:[^'\\]|\\.)'/g, "''")      // chars como '{'
    .replace(/\/\/.*$/gm, "");               // comentários //
  const lines = String(code || "").replace(/\r/g, "").split("\n");
  const result = (line, title, explanation, example, missing=[]) => ({
    ok:false, line, trecho:line ? lines[line-1]?.trim() || "" : "", title, explanation, example, missing,
    message:`Linha ${line || "?"}: ${title}. ${explanation}${example ? ` Exemplo: ${example}` : ""}`,
  });
  const pairs = { "{":"}", "(":")", "[":"]" }, openerFor = { "}":"{", ")":"(", "]":"[" }, stack = [];
  for (let i=0; i<c.length; i++) {
    const ch = c[i];
    if (pairs[ch]) stack.push({ ch, index:i });
    else if (openerFor[ch]) {
      const expected = openerFor[ch], top = stack[stack.length-1];
      const line = c.slice(0,i).split("\n").length;
      if (!top) return result(line, `há um “${ch}” sem abertura`, `Esse símbolo precisa de um “${expected}” antes dele.`, `${expected} ... ${ch}`, [expected]);
      if (top.ch !== expected) return result(line, `os símbolos estão fechando fora de ordem`, `O “${ch}” encontrou um “${top.ch}” ainda aberto. Feche primeiro com “${pairs[top.ch]}”.`, `${top.ch} ... ${pairs[top.ch]}`, [pairs[top.ch]]);
      stack.pop();
    }
  }
  if (stack.length) {
    const top = stack[stack.length-1], line = c.slice(0,top.index).split("\n").length, close = pairs[top.ch];
    return result(line, `você abriu “${top.ch}” e ainda não fechou`, `Coloque “${close}” ao final do bloco ou expressão correspondente.`, `${top.ch} ... ${close}`, [close]);
  }
  if ((c.match(/"/g)||[]).length % 2 !== 0)
    return result(lines.findIndex(line => (line.match(/"/g)||[]).length % 2 !== 0)+1, `há uma aspa aberta`, `Todo texto iniciado com aspas precisa terminar com outra aspa.`, `"seu texto"`, ['"']);
  for (let index=0; index<lines.length; index++) {
    const raw = lines[index], line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    if (/\bconsole\s*\.\s*(writeline|write|readline)\b/i.test(line) && !/\bConsole\s*\.\s*(WriteLine|Write|ReadLine)\b/.test(line)) {
      return result(index+1, `a escrita de Console está diferente`, `C# diferencia letras maiúsculas de minúsculas. Use exatamente “Console.WriteLine”, “Console.Write” ou “Console.ReadLine”.`, line.replace(/console\s*\.\s*writeline/i,"Console.WriteLine").replace(/console\s*\.\s*write/i,"Console.Write").replace(/console\s*\.\s*readline/i,"Console.ReadLine"));
    }
    const clearStatement = /^(?:(?:string|int|float|double|decimal|bool|char|var)\s+[A-Za-z_]\w*\s*=|Console\.(?:WriteLine|Write|ReadLine)\s*\(|return\s+|(?:break|continue)\b|[A-Za-z_]\w*\s*(?:\+\+|--|[+\-*/]?=))/.test(line);
    if (clearStatement && !/[;{}:,]$/.test(line) && !line.endsWith("(")) {
      return result(index+1, `parece faltar ponto e vírgula`, `Instruções em C# normalmente terminam com “;”.`, `${line};`, [';']);
    }
  }
  return null;
}
