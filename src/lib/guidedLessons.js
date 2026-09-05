// Mini-lições preparadas para o Modo Guiado. Elas mantêm o recurso útil quando a IA ou a
// internet estiver indisponível e também servem como uma recuperação segura caso a geração falhe.
export const LOCAL_GUIDED_LESSONS = [
  {
    key: "greet",
    relatedBlocks: ["greet", "print"],
    emoji: "👋",
    titulo: "Uma mensagem para começar",
    codigo: 'Console.WriteLine("Bem-vindo ao jogo!");',
    oQueFaz: "Console.WriteLine mostra uma mensagem na tela. O texto fica entre aspas porque é uma frase.",
    exemploJogo: "Você pode usar isso para mostrar a tela de boas-vindas antes da primeira fase.",
  },
  {
    key: "text",
    relatedBlocks: ["text", "ask"],
    emoji: "📝",
    titulo: "Uma caixa para palavras",
    codigo: 'string nomeDoHeroi = "Luna";\nConsole.WriteLine(nomeDoHeroi);',
    oQueFaz: "string cria uma caixinha que guarda texto. Depois, o programa pode mostrar ou reutilizar esse texto.",
    exemploJogo: "Essa caixinha pode guardar o nome escolhido para um personagem.",
  },
  {
    key: "number",
    relatedBlocks: ["number"],
    emoji: "🔢",
    titulo: "Guardar pontos",
    codigo: "int pontos = 10;\nConsole.WriteLine(pontos);",
    oQueFaz: "int cria uma caixinha para números inteiros. Aqui ela começa guardando 10 pontos.",
    exemploJogo: "O valor pode representar os pontos que o jogador ganhou numa fase.",
  },
  {
    key: "sum",
    relatedBlocks: ["sum", "number"],
    emoji: "➕",
    titulo: "Somar recompensas",
    codigo: "int moedas = 5 + 3;\nConsole.WriteLine(moedas);",
    oQueFaz: "O sinal de mais junta os dois valores. O resultado fica guardado na caixinha moedas.",
    exemploJogo: "Isso pode somar as moedas encontradas com as que o jogador já tinha.",
  },
  {
    key: "ask",
    relatedBlocks: ["ask", "text"],
    emoji: "❓",
    titulo: "Ouvir o jogador",
    codigo: 'Console.WriteLine("Qual é o seu nome?");\nstring nome = Console.ReadLine();',
    oQueFaz: "Console.ReadLine espera a pessoa digitar uma resposta e guarda o que ela escreveu.",
    exemploJogo: "Assim o jogo pode perguntar o nome do personagem antes de começar.",
  },
  {
    key: "if",
    relatedBlocks: ["if", "number"],
    emoji: "🚪",
    titulo: "Escolher um caminho",
    codigo: 'if (pontos >= 10)\n{\n    Console.WriteLine("Fase liberada!");\n}',
    oQueFaz: "if verifica uma condição. O código entre chaves só acontece quando a condição é verdadeira.",
    exemploJogo: "Uma nova fase pode ser liberada quando o jogador alcançar 10 pontos.",
  },
  {
    key: "loop",
    relatedBlocks: ["loop", "print"],
    emoji: "🔁",
    titulo: "Repetir sem copiar",
    codigo: 'for (int i = 0; i < 3; i++)\n{\n    Console.WriteLine("Estrela!");\n}',
    oQueFaz: "for repete o código entre chaves. Neste exemplo, a mensagem aparece três vezes.",
    exemploJogo: "Você pode usar a repetição para criar três estrelas de recompensa.",
  },
  {
    key: "combine",
    relatedBlocks: ["print", "sum", "if", "loop"],
    emoji: "🧩",
    titulo: "Blocos trabalhando juntos",
    codigo: 'int vidas = 3;\nConsole.WriteLine("Vidas: " + vidas);',
    oQueFaz: "O sinal de mais também pode juntar um texto com um número para formar uma mensagem completa.",
    exemploJogo: "Isso permite mostrar na tela quantas vidas ainda restam ao jogador.",
  },
];

export function nextLocalGuidedLesson(guidedBlocks = [], guidedLessons = []) {
  const usedBlockIds = new Set(guidedBlocks.map(block => block?.id).filter(Boolean));
  const seenKeys = new Set(guidedLessons.map(lesson => lesson?.localKey).filter(Boolean));
  const unseen = LOCAL_GUIDED_LESSONS.filter(lesson => !seenKeys.has(lesson.key));
  const candidates = unseen.length > 0 ? unseen : LOCAL_GUIDED_LESSONS;
  const related = candidates.filter(lesson => lesson.relatedBlocks.some(id => usedBlockIds.has(id)));
  const pool = related.length > 0 ? related : candidates;
  const selected = pool[guidedLessons.length % pool.length];

  return {
    ...selected,
    localKey: selected.key,
    source: "local",
  };
}
