// ── conquistas/medalhas do aluno ──
export interface Achievement {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  langOnly?: boolean;
  secret?: boolean;
}
export const ACHIEVEMENTS: Achievement[] = [
  // primeiros passos e notas
  { id:"primeira-atividade", emoji:"🥇", label:"Primeiro Passo", desc:"Concluiu a primeira atividade da aula" },
  { id:"nota-cem",           emoji:"💯", label:"Nota Cem",       desc:"Tirou 100 numa atividade" },
  { id:"tres-100",           emoji:"🌟", label:"Triplo Cem",     desc:"Tirou 100 em 3 atividades diferentes" },
  { id:"codigo-limpo",       emoji:"✨", label:"Código Limpo",  desc:"Escreveu um código sem nenhum erro" },
  { id:"atividades-5",       emoji:"✍️", label:"Praticante",     desc:"Concluiu 5 atividades" },
  { id:"atividades-15",      emoji:"📚", label:"Dedicado",       desc:"Concluiu 15 atividades" },
  // provas
  { id:"prova-mestre",       emoji:"🎓", label:"Mestre da Prova", desc:"Fez 80% ou mais numa prova" },
  { id:"prova-100",          emoji:"🎯", label:"Prova Perfeita", desc:"Acertou TUDO numa prova" },
  // presença e sequência
  { id:"sequencia-3",        emoji:"🔥", label:"3 Dias Seguidos", desc:"Veio 3 dias seguidos de aula" },
  { id:"sequencia-7",        emoji:"🔥", label:"Semana Completa", desc:"Veio 7 dias seguidos de aula" },
  { id:"sequencia-14",       emoji:"🌋", label:"Duas Semanas!",  desc:"Veio 14 dias seguidos de aula" },
  { id:"presencas-5",        emoji:"📅", label:"Frequente",      desc:"Participou de 5 aulas" },
  { id:"presencas-15",       emoji:"🗓️", label:"Assíduo",        desc:"Participou de 15 aulas" },
  { id:"cem-linhas",         emoji:"🏗️", label:"Arquiteto de Código", desc:"Escreveu 100 linhas de código no seu projeto" },
  // combos
  { id:"combo-5",            emoji:"⚡", label:"Combo Elétrico", desc:"Acertou 5 questões seguidas numa atividade" },
  { id:"combo-8",            emoji:"🚀", label:"Combo Insano",  desc:"Acertou 8 questões seguidas numa atividade" },
  // pontos do Nyx
  { id:"pontos-10",          emoji:"🪙", label:"Poupança",       desc:"Juntou 10 pontos do Nyx" },
  { id:"pontos-50",          emoji:"💰", label:"Riqueza",        desc:"Juntou 50 pontos do Nyx" },
  { id:"pontos-100",         emoji:"💎", label:"Magnata",        desc:"Juntou 100 pontos do Nyx" },
  { id:"pontos-250",         emoji:"👑", label:"Lendário",       desc:"Juntou 250 pontos do Nyx" },
  // loja
  { id:"comprador",          emoji:"🛍️", label:"Primeira Compra", desc:"Comprou o primeiro item na Loja do Nyx" },
  { id:"colecionador",       emoji:"🎒", label:"Colecionador",   desc:"Comprou 4 itens na Loja do Nyx" },
  // duelos
  { id:"duelista",           emoji:"⚔️", label:"Duelista",       desc:"Venceu um duelo contra um colega" },
  { id:"duelista-3",         emoji:"🏆", label:"Campeão de Duelos", desc:"Venceu 3 duelos" },
  { id:"dupla-imbativel",    emoji:"🤝", label:"Dupla Imbatível", desc:"Venceu um duelo em dupla (2x2)" },
  { id:"livre-pensador",     emoji:"🏗️", label:"Livre-pensador(a)", desc:"Completou o desafio livre da semana" },
  // sala de linguagens (HTML/CSS/PHP/JS) — langOnly: só entra na lista/contagem de quem está
  // nessa sala; pra quem só faz C# normal, essas duas são impossíveis de conseguir mesmo
  { id:"primeira-pagina",    emoji:"🌐", label:"Primeira Página", desc:"Concluiu a primeira aula na sala de linguagens", langOnly:true },
  { id:"poliglota",          emoji:"🗺️", label:"Poliglota",       desc:"Estudou as 4 linguagens da sala: HTML, CSS, PHP e JavaScript", langOnly:true },
  // extras
  { id:"artista",            emoji:"🎨", label:"Artista",        desc:"Pediu ao Nyx um fundo de cor personalizada" },
  { id:"teclado-mestre",     emoji:"🎹", label:"Mestre do Teclado", desc:"Completou o tutorial de teclado até o fim" },
  // secretas: combo de equipamento e caça ao tesouro escondidos, sem nenhuma pista visível na loja
  { id:"espartano",          emoji:"🛡️", label:"Guerreiro Espartano", desc:"Equipou espada e escudo ao mesmo tempo e viu o Nyx virar um Espartano", secret:true },
  { id:"tesouro",            emoji:"🏴‍☠️", label:"Caçador de Tesouro", desc:"Encontrou o baú do tesouro escondido na plataforma", secret:true },
  // segredo de equipamento: os comandos divertidos do terminal continuam existindo, mas não
  // concedem conquistas nem entram na contagem.
  { id:"segredo-pirata",     emoji:"🏴‍☠️", label:"Alma Pirata",     desc:"Equipou chapéu pirata, tapa-olho e espada ao mesmo tempo", secret:true },
  { id:"segredo-sanduiche",  emoji:"🥪", label:"Migalha Encontrada", desc:"Achou a migalha escondida na tela", secret:true },
  { id:"segredo-cafe",       emoji:"☕", label:"Cafeína Descoberta", desc:"Achou a marca de café escondida na tela", secret:true },
  { id:"segredo-42",         emoji:"🌌", label:"Guia do Mochileiro", desc:"Achou o número 42 escondido na tela", secret:true },
  { id:"segredo-rm",         emoji:"🗑️", label:"Nada Se Perde",    desc:"Achou a lixeira escondida na tela", secret:true },
  // meta: só quem achar TODOS os segredos acima
  { id:"todos-segredos",     emoji:"🏆", label:"Caçador Lendário", desc:"Encontrou TODOS os segredos escondidos da plataforma", secret:true },
  { id:"campeao-torneio",    emoji:"🏟️", label:"Campeão do Torneio", desc:"Venceu o torneio da turma no telão" },
  { id:"autodidata",         emoji:"🧠", label:"Autodidata",       desc:"Fez um teste de conhecimento por conta própria, sem esperar a atividade da aula" },
];
// ids de todo Easter Egg individual que conta pra conquista "Caçador Lendário"
export const ALL_EGG_ACHIEVEMENT_IDS: string[] = ["segredo-pirata","segredo-sanduiche","segredo-cafe","segredo-42","segredo-rm","tesouro","espartano"];
export const achievementInfo = (id: string): Achievement | undefined => ACHIEVEMENTS.find(a => a.id === id);
// conquistas que valem pra esse aluno — some as "langOnly" (sala de linguagens) de quem nunca
// vai poder consegui-las, pra não aparecerem impossíveis na lista nem inflarem o "X de Y"
export const visibleAchievements = (isLangRoom: boolean): Achievement[] => ACHIEVEMENTS.filter(a => !a.langOnly || isLangRoom);

// ── metas coletivas da turma (soma dos pontos de todos da turma) ──
export const CLASS_GOALS: number[] = [80, 200, 400, 800, 1500, 2500, 4000, 6000, 9000, 13000];
export interface ClassGoalProgress {
  level: number;
  prev: number;
  next: number | null;
  pct: number;
}
export function classGoalProgress(totalPoints: number): ClassGoalProgress {
  const idx = CLASS_GOALS.findIndex(g => totalPoints < g);
  if (idx === -1) return { level: CLASS_GOALS.length, prev: CLASS_GOALS[CLASS_GOALS.length-1], next: null, pct: 100 };
  const prev = idx === 0 ? 0 : CLASS_GOALS[idx-1];
  const next = CLASS_GOALS[idx];
  const pct = Math.round(((totalPoints - prev) / (next - prev)) * 100);
  return { level: idx + 1, prev, next, pct: Math.max(0, Math.min(100, pct)) };
}
