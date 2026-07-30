// geradores de perguntas/planos por IA compartilhados entre os modais de duelo (1x1 e dupla),
// teste de conhecimento avulso e desafio livre da semana
import { askClaude, askClaudeJson, extractJson } from "./ai.js";
import { shuffleQuestions } from "./utils.js";
import { CS_SYSTEM } from "./ai-prompts.js";

// ════════════════════════════════════════════════════════════════════════════
//  DUELO ENTRE ALUNOS  (desafio 1x1: convite, aceite, mini-quiz compartilhado, resultado)
// ════════════════════════════════════════════════════════════════════════════
export const DUEL_SYSTEM = "Você cria questões de múltipla escolha básicas sobre C# para iniciantes. Responda APENAS JSON puro, sem markdown.";

export async function generateDuelQuestions() {
  const res = await askClaude(
    `Crie 5 questões de múltipla escolha RÁPIDAS e BÁSICAS sobre conceitos fundamentais de C# para iniciantes (variáveis, tipos, Console.WriteLine/ReadLine, if/else, for/while, operadores). Nível fácil/médio, boas para um duelo rápido de conhecimento entre dois alunos. Responda APENAS JSON puro:\n{"questions":[{"q":"...","opts":["A","B","C","D"],"correct":0}]}`,
    DUEL_SYSTEM,
    { temperature: 0.7 }
  );
  const parsed = extractJson(res);
  return shuffleQuestions(parsed.questions || []);
}

// 🧠 teste de conhecimento por conta própria: o aluno pode se testar a qualquer momento da aula,
// sem precisar esperar a atividade oficial (que só libera depois de finalizar a aula) — sem dicas,
// pra valer mesmo como autoavaliação
export async function generateKnowledgeTestQuestions() {
  const res = await askClaude(
    `Crie 6 questões de múltipla escolha sobre conceitos fundamentais de C# para iniciantes (variáveis, tipos, Console.WriteLine/ReadLine, if/else, for/while, operadores, listas/arrays básicos). Nível fácil/médio, pra um aluno se autoavaliar sobre a matéria a qualquer momento — sem depender do código específico que ele escreveu hoje. Responda APENAS JSON puro:\n{"questions":[{"q":"...","opts":["A","B","C","D"],"correct":0}]}`,
    DUEL_SYSTEM,
    { temperature: 0.7 }
  );
  const parsed = extractJson(res);
  return shuffleQuestions(parsed.questions || []);
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
