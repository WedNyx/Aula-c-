// ════════════════════════════════════════════════════════════════════════════
//  🎉 QUIZ ESTILO KAHOOT  (professor cria sala com código; alunos entram e respondem valendo pontos por velocidade)
// ════════════════════════════════════════════════════════════════════════════
// cores e formas das alternativas, na ordem clássica do Kahoot
export const QUIZ_COLORS = [
  { bg: "#e21b3c", shape: "▲" },
  { bg: "#1368ce", shape: "◆" },
  { bg: "#d89e00", shape: "●" },
  { bg: "#26890c", shape: "■" },
];
export const QUIZ_QUESTION_SECONDS = 20; // padrão — o professor escolhe outro tempo ao criar a sala
export const QUIZ_TIMER_OPTIONS = [10, 15, 20, 30, 45, 60];
export const quizSecsOf = (room) => (room && room.secs) || QUIZ_QUESTION_SECONDS;
// pontuação estilo Kahoot: acertou vale 500 + até 500 de bônus por velocidade; pergunta difícil vale em dobro
export function quizPoints(isCorrect, elapsedMs, durationMs, hard) {
  if (!isCorrect) return 0;
  const speed = Math.max(0, Math.min(1, 1 - elapsedMs / durationMs));
  const base = 500 + Math.round(500 * speed);
  return hard ? base * 2 : base;
}
export const makeQuizCode = () => String(Math.floor(100000 + Math.random() * 900000));
// apura o placar da sala: soma os pontos de cada jogador a partir das respostas gravadas no perfil
// de cada um (quizAnswers, com horário) contra o horário de início de cada pergunta (room.startedAts)
export function quizLeaderboard(room, students) {
  const players = (students || []).filter(s => s.quizJoin && s.quizJoin.code === room.code);
  const durationMs = quizSecsOf(room) * 1000;
  return players.map(s => {
    let total = 0;
    (room.questions || []).forEach((q, i) => {
      const ans = (s.quizAnswers || {})[i];
      const startedAt = (room.startedAts || {})[i];
      if (!ans || startedAt == null) return;
      const elapsed = ans.at - startedAt;
      if (elapsed < 0 || elapsed > durationMs) return; // respondeu fora do tempo, não vale
      total += quizPoints(ans.opt === q.correct, elapsed, durationMs, q.hard);
    });
    return { name: s.name, avatar: s.avatar, total };
  }).sort((a, b) => b.total - a.total);
}
// tema pronto de fábrica: "O Jogo da Imitação" (25 perguntas fornecidas pelo professor em PDF) —
// perguntas [Difícil] valem pontos em dobro, e as de Verdadeiro/Falso têm só 2 alternativas
export const QUIZ_SEED_THEMES = [
  {
    id: "seed-imitacao",
    title: "🎬 O Jogo da Imitação",
    builtin: true,
    questions: [
      { q: "Quem é o protagonista do filme?", opts: ["Alan Turing", "Winston Churchill", "Hugh Alexander", "John Cairncross"], correct: 0 },
      { q: "Qual era a profissão de Alan Turing?", opts: ["Médico", "Matemático", "Advogado", "Piloto"], correct: 1 },
      { q: "Qual o nome da máquina alemã cujos códigos precisavam ser quebrados?", opts: ["Colossus", "Enigma", "Cipher", "Atlas"], correct: 1, hard: true },
      { q: "Alan Turing trabalhava sozinho durante toda a missão.", opts: ["Verdadeiro", "Falso"], correct: 1 },
      { q: "Em que guerra o filme se passa?", opts: ["Primeira Guerra", "Guerra Fria", "Segunda Guerra Mundial", "Guerra do Vietnã"], correct: 2 },
      { q: "Onde a equipe trabalhava?", opts: ["Oxford", "Bletchley Park", "Cambridge", "Londres Tower"], correct: 1 },
      { q: "Como Alan chamou sua máquina?", opts: ["Joan", "Christopher", "Victory", "Turing"], correct: 1, hard: true },
      { q: "O nome da máquina foi uma homenagem a um amigo de infância.", opts: ["Verdadeiro", "Falso"], correct: 0 },
      { q: "Quem convence Alan a dar uma chance aos colegas?", opts: ["Joan Clarke", "Churchill", "Hugh", "Peter"], correct: 0 },
      { q: "Quem é a única mulher da equipe principal?", opts: ["Margaret", "Joan Clarke", "Helen", "Mary"], correct: 1 },
      { q: "Joan resolve palavras cruzadas para entrar na equipe.", opts: ["Verdadeiro", "Falso"], correct: 0 },
      { q: "O que permitiu reduzir drasticamente as possibilidades da Enigma?", opts: ["Um erro de cálculo", "A palavra repetida nas mensagens", "Um ataque aéreo", "Um mapa"], correct: 1, hard: true },
      { q: "O principal objetivo da equipe era:", opts: ["Construir aviões", "Decifrar mensagens alemãs", "Invadir bases", "Criar rádios"], correct: 1 },
      { q: "A equipe podia agir sobre todas as mensagens decifradas.", opts: ["Verdadeiro", "Falso"], correct: 1 },
      { q: "Por que nem todos os ataques podiam ser impedidos?", opts: ["Faltavam soldados", "Para não revelar que o código havia sido quebrado", "Não havia combustível", "Churchill proibiu"], correct: 1, hard: true },
      { q: "Quem interpretou Alan Turing?", opts: ["Tom Hanks", "Benedict Cumberbatch", "Matt Damon", "Cillian Murphy"], correct: 1 },
      { q: "Quem interpretou Joan Clarke?", opts: ["Keira Knightley", "Emma Watson", "Emily Blunt", "Natalie Portman"], correct: 0 },
      { q: "Alan e Joan chegam a ficar noivos no filme.", opts: ["Verdadeiro", "Falso"], correct: 0 },
      { q: "Alan escondia qual aspecto de sua vida?", opts: ["Era casado", "Sua orientação sexual", "Era espião", "Era militar"], correct: 1 },
      { q: "O que acontece com Alan após a guerra?", opts: ["Vira ministro", "É perseguido judicialmente por ser homossexual", "Vai para outro país", "Entra no exército"], correct: 1, hard: true },
      { q: "O filme mostra que Alan recebeu reconhecimento em vida por seu trabalho.", opts: ["Verdadeiro", "Falso"], correct: 1 },
      { q: "Qual área moderna foi profundamente influenciada por Turing?", opts: ["Medicina", "Computação", "Arquitetura", "Astronomia"], correct: 1 },
      { q: "O teste criado por Turing ficou conhecido como:", opts: ["Teste Alpha", "Teste de Turing", "Teste Enigma", "Teste Binary"], correct: 1, hard: true },
      { q: "O filme é baseado em fatos reais.", opts: ["Verdadeiro", "Falso"], correct: 0 },
      { q: "Aproximadamente quanto tempo a guerra pode ter sido encurtada graças ao trabalho de Bletchley Park, segundo o filme?", opts: ["6 meses", "1 ano", "2 anos", "5 anos"], correct: 2, hard: true },
    ],
  },
];
