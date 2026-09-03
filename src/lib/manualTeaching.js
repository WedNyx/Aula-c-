export function validateManualMaterial({ intro, sections, tip, questions }, exam = false) {
  const secoes = sections.map(s => ({ titulo:s.titulo.trim(), explicacao:s.explicacao.trim(), exemplo:s.exemplo.trim() }));
  const atividade = questions.map(q => ({ q:q.q.trim(), opts:q.opts.map(o=>o.trim()), correct:Number(q.correct) }));
  if (!intro.trim()) throw new Error('Escreva a introdução ou o texto de revisão.');
  if (secoes.some(s => (s.titulo || s.explicacao || s.exemplo) && (!s.titulo || !s.explicacao))) throw new Error('Complete o título e a explicação de cada seção ou remova a seção incompleta.');
  const completeSections = secoes.filter(s=>s.titulo && s.explicacao);
  if (!exam && !completeSections.length) throw new Error('Escreva pelo menos uma seção completa.');
  const nonempty = atividade.filter(q=>q.q || q.opts.some(Boolean));
  if (nonempty.some(q=>!q.q || q.opts.length!==4 || !q.opts.every(Boolean) || !Number.isInteger(q.correct) || q.correct<0 || q.correct>3)) throw new Error('Complete cada pergunta, as quatro alternativas e o gabarito.');
  if (exam && !nonempty.length) throw new Error('Adicione pelo menos uma pergunta completa à prova.');
  return {intro:intro.trim(),secoes:completeSections,dica:tip.trim(),atividade:nonempty,manual:true};
}
