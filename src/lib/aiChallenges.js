// geradores de perguntas/planos compartilhados entre os modais de duelo (1x1 e dupla), teste de
// conhecimento avulso e desafio livre da semana
import { askClaudeJson } from "./ai.js";
import { shuffleQuestions } from "./utils.js";
import { CS_SYSTEM } from "./ai-prompts.ts";

// ════════════════════════════════════════════════════════════════════════════
//  DUELO ENTRE ALUNOS  (desafio 1x1: convite, aceite, mini-quiz compartilhado, resultado)
// ════════════════════════════════════════════════════════════════════════════

// 🏦 banco fixo de perguntas sobre conceitos fundamentais de C# — usado no Duelo e no Teste de
// Conhecimento (mesmo espírito do banco de reserva do Torneio, TOURNEY_FALLBACK_QUESTIONS em
// TeacherModals.jsx). Esses conceitos não mudam de aluno pra aluno nem de dia pra dia, então pedir
// ao Nyx pra "inventar" isso de novo a cada duelo/teste era gasto sem necessidade — o Nyx já é
// usado pra tudo que É de verdade específico do aluno (análise do código dele, resumo da aula dele).
const BASIC_CS_QUESTION_BANK = [
  { q: "O que o Console.WriteLine faz?", opts: ["Escreve algo na tela", "Apaga a tela", "Cria uma variável", "Fecha o programa"], correct: 0 },
  { q: "O que o Console.ReadLine faz?", opts: ["Lê o que a pessoa digitou", "Escreve na tela", "Soma dois números", "Toca um som"], correct: 0 },
  { q: "Qual tipo guarda números inteiros?", opts: ["int", "string", "bool", "char"], correct: 0 },
  { q: "Qual tipo guarda textos?", opts: ["string", "int", "double", "bool"], correct: 0 },
  { q: "Qual tipo aceita números com vírgula?", opts: ["double", "int", "bool", "char"], correct: 0 },
  { q: "O que guarda apenas verdadeiro ou falso?", opts: ["bool", "int", "string", "double"], correct: 0 },
  { q: "Como termina uma instrução em C#?", opts: ["Com ;", "Com .", "Com !", "Com ,"], correct: 0 },
  { q: "Qual símbolo compara se dois valores são iguais?", opts: ["==", "=", "!=", ">="], correct: 0 },
  { q: "Qual símbolo representa 'diferente de' em C#?", opts: ["!=", "==", "<>", "=!"], correct: 0 },
  { q: "O que o if faz no código?", opts: ["Testa uma condição e escolhe um caminho", "Repete um bloco várias vezes", "Cria uma nova variável", "Encerra o programa"], correct: 0 },
  { q: "O que o else faz?", opts: ["Executa quando o if é falso", "Executa sempre, junto com o if", "Cria um método novo", "Compara dois textos"], correct: 0 },
  { q: "Para que serve o laço for?", opts: ["Repetir um bloco um número certo de vezes", "Guardar um texto", "Comparar dois números", "Ler o teclado"], correct: 0 },
  { q: "Para que serve o laço while?", opts: ["Repetir ENQUANTO uma condição for verdadeira", "Escrever na tela uma única vez", "Somar dois números", "Criar uma classe"], correct: 0 },
  { q: "Para que serve o foreach?", opts: ["Passar por cada item de uma lista, um de cada vez", "Criar uma variável nova", "Ler o teclado", "Comparar dois booleanos"], correct: 0 },
  { q: "O que é um método em C#?", opts: ["Um pedaço de código com nome, que pode ser chamado", "Um tipo de variável", "Um símbolo de comparação", "Um jeito de comentar o código"], correct: 0 },
  { q: "Para que serve uma List<>?", opts: ["Guardar vários valores juntos", "Guardar só um número", "Comparar dois textos", "Repetir um bloco de código"], correct: 0 },
  { q: "O que os { } (chaves) delimitam em C#?", opts: ["O início e o fim de um bloco de código", "Um comentário", "Um número decimal", "Uma lista de textos"], correct: 0 },
  { q: "O que $\"Oi {nome}\" faz (interpolação de string)?", opts: ["Coloca o valor da variável dentro do texto", "Cria uma lista", "Repete o texto duas vezes", "Apaga a variável"], correct: 0 },
  { q: "O que int.Parse(texto) faz?", opts: ["Converte um texto digitado em número inteiro", "Escreve um número na tela", "Cria uma lista de números", "Compara dois números"], correct: 0 },
  { q: "O que faz x++ (incremento)?", opts: ["Soma 1 ao valor de x", "Subtrai 1 do valor de x", "Zera o valor de x", "Dobra o valor de x"], correct: 0 },
  { q: "O que faz x += 5?", opts: ["Soma 5 ao valor de x e guarda o resultado em x", "Compara x com 5", "Cria uma variável chamada 5", "Divide x por 5"], correct: 0 },
  { q: "O que o operador && (e) faz numa condição?", opts: ["Só é verdadeiro se as duas partes forem verdadeiras", "É verdadeiro se qualquer uma das partes for verdadeira", "Inverte o valor da condição", "Soma os dois valores"], correct: 0 },
  { q: "O que o operador || (ou) faz numa condição?", opts: ["É verdadeiro se pelo menos uma das partes for verdadeira", "Só é verdadeiro se as duas partes forem verdadeiras", "Inverte o valor da condição", "Compara dois textos"], correct: 0 },
  { q: "O que uma classe representa em C#?", opts: ["Um molde que descreve algo do programa", "Um número decimal", "Um comentário no código", "Um símbolo de comparação"], correct: 0 },
  { q: "Onde o programa começa a rodar em C#?", opts: ["No método Main", "Na primeira linha do arquivo", "Na última classe declarada", "No método WriteLine"], correct: 0 },
  { q: "Como se escreve um comentário de uma linha em C#?", opts: ["// comentário", "/* comentário", "# comentário", "-- comentário"], correct: 0 },
  { q: "Qual índice acessa o PRIMEIRO item de uma lista/array?", opts: ["0", "1", "-1", "primeiro"], correct: 0 },
  { q: "O que try/catch serve pra fazer?", opts: ["Tratar um erro sem derrubar o programa", "Repetir um bloco de código", "Criar uma variável nova", "Comparar dois números"], correct: 0 },
];

// sorteia N questões diferentes do banco (sem repetir dentro do mesmo duelo/teste) e embaralha as
// alternativas de cada uma — mesma função já usada nas questões geradas pela IA
function pickFromBank(n) {
  const shuffled = [...BASIC_CS_QUESTION_BANK].sort(() => Math.random() - 0.5);
  return shuffleQuestions(shuffled.slice(0, n));
}

export async function generateDuelQuestions() {
  return pickFromBank(5);
}

// 🧠 teste de conhecimento por conta própria: o aluno pode se testar a qualquer momento da aula,
// sem precisar esperar a atividade oficial (que só libera depois de finalizar a aula) — sem dicas,
// pra valer mesmo como autoavaliação
export async function generateKnowledgeTestQuestions() {
  return pickFromBank(6);
}

// ════════════════════════════════════════════════════════════════════════════
//  🏗️ DESAFIO LIVRE DA SEMANA — o aluno propõe algo que quer construir e o Nyx
//  quebra em passos concretos pra guiar (não deixa solto, sem ajuda)
// ════════════════════════════════════════════════════════════════════════════
export async function generateFreeBuildPlan(idea, language) {
  const langLabel = language ? language.label : "C#";
  const res = await askClaudeJson(
    `Um aluno iniciante quer construir isso, por conta própria, como desafio pessoal da semana: "${idea}"\n\nCrie um plano de 4 a 6 passos BEM concretos, curtos e em ordem, pra ele conseguir chegar lá sozinho usando ${langLabel}. Cada passo é uma ação prática (não teoria solta) — tipo "Crie uma variável pra guardar X" ou "Use um for pra repetir Y". Adapte pro nível de quem está começando agora, sem pular etapas. Responda APENAS JSON puro: { "steps": ["...", "..."] }`,
    (language ? language.system : CS_SYSTEM) + "\n\nVocê também ajuda o aluno a PLANEJAR projetos livres, quebrando a ideia dele em passos pequenos e alcançáveis — nunca resolva o projeto inteiro por ele, só mostre o caminho.",
    { temperature: 0.6, max_tokens: 1200 }
  );
  return Array.isArray(res.steps) ? res.steps.slice(0, 6) : [];
}
