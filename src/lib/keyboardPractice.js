// Cada frase pratica a maiúscula do alvo atual, sem sorteio de frases desconectadas.
export const SHIFT_PRACTICE_PHRASES = Object.freeze({
  N: "Nyx ajuda",
  Y: "Yuri joga",
  X: "X de xadrez",
  C: "Casa azul",
  O: "Ola turma",
  D: "Dia de aula",
  A: "Aula legal",
  R: "Rato pequeno",
});

export function shiftPracticePhrase(char) {
  return SHIFT_PRACTICE_PHRASES[String(char || "").toUpperCase()] || "";
}
