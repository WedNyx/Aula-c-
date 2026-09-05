export function materialSelectionDefaults(material) {
  return {
    intro: !!String(material?.intro || "").trim(),
    tip: !!String(material?.dica || "").trim(),
    sections: (material?.secoes || []).map((_, index) => index),
    questions: (material?.atividade || []).map((_, index) => index),
  };
}

export function selectMaterialParts(material, selection) {
  const sectionSet = new Set(Array.isArray(selection?.sections) ? selection.sections : []);
  const questionSet = new Set(Array.isArray(selection?.questions) ? selection.questions : []);
  const selected = {
    ...material,
    intro: selection?.intro ? String(material?.intro || "").trim() : "",
    secoes: (material?.secoes || []).filter((_, index) => sectionSet.has(index)).map(section => ({ ...section })),
    dica: selection?.tip ? String(material?.dica || "").trim() : "",
    atividade: (material?.atividade || []).filter((_, index) => questionSet.has(index)).map(question => ({ ...question, opts:[...(question.opts || [])] })),
  };
  const hasContent = !!selected.intro || selected.secoes.length > 0 || !!selected.dica || selected.atividade.length > 0;
  return hasContent ? selected : null;
}

export function materialSelectionSummary(material, selection) {
  const selected = selectMaterialParts(material, selection);
  if (!selected) return "Nenhuma parte selecionada";
  const parts = [];
  if (selected.intro) parts.push("introdução");
  if (selected.secoes.length) parts.push(`${selected.secoes.length} ${selected.secoes.length===1?"seção":"seções"}`);
  if (selected.atividade.length) parts.push(`${selected.atividade.length} ${selected.atividade.length===1?"questão":"questões"}`);
  if (selected.dica) parts.push("dica final");
  return parts.join(", ");
}
