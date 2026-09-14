export const CHECKIN_MOODS = [
  { id: "otimo", emoji: "😄", label: "Empolgado" },
  { id: "feliz", emoji: "😊", label: "Feliz" },
  { id: "bem", emoji: "🙂", label: "Bem" },
  { id: "calmo", emoji: "😌", label: "Tranquilo" },
  { id: "neutro", emoji: "😐", label: "Neutro" },
  { id: "curioso", emoji: "🤔", label: "Curioso" },
  { id: "ansioso", emoji: "😬", label: "Ansioso" },
  { id: "cansado", emoji: "😴", label: "Cansado" },
  { id: "confuso", emoji: "😵‍💫", label: "Confuso" },
  { id: "triste", emoji: "😔", label: "Triste" },
  { id: "dificil", emoji: "😣", label: "Dia difícil" },
];


export const ATTENTION_MOODS = new Set(["ansioso","cansado","confuso","triste","dificil"]);
const WELCOME_VARIANTS = {
  positive: [
    name => `Que bom ter você aqui, ${name}! Vamos construir algo incrível hoje? ✨`,
    name => `${name}, sua presença deixou nossa órbita mais brilhante. Vamos no seu ritmo! 🌙`,
    name => `Bem-vindo, ${name}! Separei um cantinho na missão de hoje para você. 🚀`,
  ],
  neutral: [
    name => `Oi, ${name}! Obrigado por chegar. Podemos começar com calma, um passo de cada vez. 🌱`,
    name => `Bem-vindo, ${name}. Não precisa saber tudo agora; estou aqui para ajudar no caminho. 💜`,
  ],
  support: [
    name => `Obrigado por me contar, ${name}. Vá no seu ritmo hoje; seu professor poderá perceber que você talvez precise de apoio. 💜`,
    name => `${name}, hoje pode ser um dia de passos pequenos — eles também contam. Comece com calma. 🌙`,
    name => `Que bom que você veio, ${name}. Não precisa resolver tudo de uma vez; peça ajuda quando quiser. 🌱`,
  ],
};
export function nyxWelcomeForMood(studentName, mood, dayKey = "") {
  const firstName=String(studentName||"estudante").trim().split(/\s+/)[0];
  const group=ATTENTION_MOODS.has(mood)?"support":["otimo","feliz","bem","calmo","curioso"].includes(mood)?"positive":"neutral";
  const choices=WELCOME_VARIANTS[group];
  const seed=[...(`${dayKey}:${studentName}:${mood}`)].reduce((sum,char)=>sum+char.charCodeAt(0),0);
  return choices[seed%choices.length](firstName);
}
