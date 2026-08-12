import { reportAiHealth } from "../storage.js";
import { nyxPrefsInstruction } from "./ai-prompts.ts";

// ════════════════════════════════════════════════════════════════════════════
//  IA + util
// ════════════════════════════════════════════════════════════════════════════
// modelos que o botão de análise tenta, nesta ordem de preferência — se o primeiro falhar
// (chave não configurada, instabilidade etc.), o segundo é tentado sozinho, sem avisar o aluno
export const ANALYZE_PROVIDERS = ["nvidia", "laguna"];
// pontos que ajudante E ajudado ganham quando uma parceria de código é resolvida
export const PARTNER_REWARD = 15;

// ── modo offline total: a carreta às vezes fica sem NENHUMA internet por um período inteiro de
// aula (não só uma queda rápida) — em vez de deixar o Nyx tentar e mostrar um erro técnico
// assustador, essas duas funções detectam a falta de rede de verdade e permitem uma mensagem
// tranquilizadora + retentativa automática assim que a conexão voltar (ver "online" listeners) ──
export function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
export function isNetworkError(e) {
  return isOffline() || (e && e.name === "TypeError" && /fetch/i.test(e.message || ""));
}
// uma tentativa crua contra /api/claude — separado do resto pra poder ser chamada de novo sozinha
// em caso de resposta não-JSON (ver askClaude abaixo)
async function fetchClaudeOnce(prompt, system, bodyOpts) {
  const resp = await fetch("/api/claude", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ prompt, system, ...bodyOpts })
  });
  let data;
  try { data = await resp.json(); }
  catch {
    // a função do servidor travou/estourou o tempo antes de responder em JSON (ex: página de
    // erro da própria Vercel) — normalmente passageiro, quem chama tenta de novo antes de desistir
    throw new Error('NON_JSON_RESPONSE');
  }
  if (data.error === 'missing_api_key') {
    const e = new Error('ROBOTKEY_MISSING');
    e.userMsg = data.message || 'ANTHROPIC_API_KEY não configurada no Vercel.';
    throw e;
  }
  if (!resp.ok) throw new Error(data.error || `API ${resp.status}`);
  return data;
}

// "silentHealth": true faz essa chamada NÃO acender/apagar o aviso geral de "Reconectando Nyx" —
// só usado quando quem chama já sabe que é UMA tentativa dentro de uma sequência com fallback
// automático (ver analyzeCode em App.jsx), pra uma falha isolada do primeiro modelo tentado não
// preocupar a sala toda quando o próximo modelo resolve sozinho. O indicador POR MODELO
// (Nemotron/Laguna) continua sendo atualizado normalmente mesmo com silentHealth — só a chave geral
// fica de fora até quem chama decidir o resultado final da sequência.
export async function askClaude(prompt, system, opts = {}){
  const { silentHealth, ...bodyOpts } = opts;
  try {
    let data;
    try {
      data = await fetchClaudeOnce(prompt, system, bodyOpts);
    } catch (e) {
      if (e.message !== 'NON_JSON_RESPONSE') throw e;
      // resposta não-JSON costuma ser um timeout passageiro da função no servidor — tenta mais 1x
      // sozinho (sem incomodar quem chamou) antes de virar de vez um "Nyx fora do ar" pra sala toda
      try { data = await fetchClaudeOnce(prompt, system, bodyOpts); }
      catch { throw new Error('Não consegui falar com o Nyx agora (o servidor demorou demais pra responder). Tente de novo em instantes.'); }
    }
    reportAiHealth(true, opts.provider, !silentHealth); // avisa o painel do professor (em qualquer navegador) que o Nyx está respondendo
    return data.content?.map(b=>b.text||"").join("")||"";
  } catch (e) {
    // chave não configurada não é "fora do ar temporariamente" — é config pendente, não reporta como falha
    if (e.message !== 'ROBOTKEY_MISSING') reportAiHealth(false, opts.provider, !silentHealth);
    throw e;
  }
}

// extrai JSON mesmo se vier com texto/markdown em volta
export function extractJson(text) {
  const cleaned = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(cleaned.slice(a, b + 1)); } catch {} }
  throw new Error("bad_json");
}

// pede JSON à IA com uma segunda tentativa automática se a resposta vier malformada
export async function askClaudeJson(prompt, system, opts = {}) {
  try {
    return extractJson(await askClaude(prompt, system, opts));
  } catch (e) {
    if (e.message === "ROBOTKEY_MISSING") throw e;
    return extractJson(await askClaude(
      prompt + "\n\nATENÇÃO: responda SOMENTE o objeto JSON válido, sem nenhum texto antes ou depois.",
      system, opts
    ));
  }
}
// ── tutorial de teclado: depois que o aluno acerta uma tecla, a Nyx gera uma frase curtinha (ou
// linha de código) pra ele PRATICAR DIGITANDO de verdade, focada no que ele está aprendendo agora
// (o próprio código dele, se já tiver algum) — em vez de só repetir teclas isoladas ──
export async function generateTypingPhrase(levelTitle, codeContext, studyLang) {
  const lang = studyLang ? studyLang.label : "C#";
  const contextBlock = codeContext && codeContext.trim().length > 5
    ? `O aluno está escrevendo este código agora (use esse contexto pra criar algo do mesmo assunto):\n\`\`\`\n${codeContext.trim().slice(0, 1200)}\n\`\`\`\n`
    : `O aluno ainda não escreveu nenhum código relevante ainda — use um exemplo simples e genérico de ${lang} pra iniciante.\n`;
  const parsed = await askClaudeJson(
    `${contextBlock}\nCrie UMA frase curta pro aluno PRATICAR DIGITAÇÃO, relacionada ao nível "${levelTitle}" que ele acabou de treinar no tutorial de teclado. Pode ser uma frase de texto comum (se o nível for sobre letras/espaço/acentos) ou uma linha de código realista de ${lang} (se o nível for sobre símbolos/operadores/atalhos), sempre BEM curta (no máximo uns 50-60 caracteres) e fácil de digitar de novo do zero, sem precisar copiar nada complicado. Responda APENAS JSON puro, sem markdown: {"frase":"a frase ou linha de código"}`,
    `Você cria frases curtas de prática de digitação para iniciantes em ${lang}, sempre bem curtas e fáceis. APENAS JSON puro sem markdown.`,
    { max_tokens: 200 }
  );
  return typeof parsed.frase === "string" ? parsed.frase.trim() : "";
}

// monta o pedido de resumo da aula pro Nyx — "simples" (padrão, frases curtas) ou "detalhado"
// (mais completo, pra quem quer entender o porquê de cada coisa, não só o quê)
export function buildSummaryRequest(detail, hasTodayDiff, todayCode, fullCode, lang, nyxPrefs) {
  const langName = lang ? lang.label : "C#";
  const fence = lang ? lang.codeLang : "csharp";
  const contextPart = hasTodayDiff
    ? `Projeto ${langName} completo de um aluno iniciante (contexto — inclui código de aulas ANTERIORES):\n\`\`\`${fence}\n${fullCode}\n\`\`\`\n\nTRECHOS QUE ELE ESCREVEU HOJE, na aula de hoje (extraídos por comparação com o início do dia):\n\`\`\`${fence}\n${todayCode}\n\`\`\`\n\nCrie um resumo da AULA DE HOJE: cubra APENAS os conceitos que aparecem nos trechos escritos hoje. NÃO faça seções sobre conceitos que só existem no código das aulas anteriores — o projeto completo é só contexto para você entender os trechos novos.`
    : `Um aluno iniciante de ${langName} escreveu este código na aula de hoje (pode ter mais de um arquivo, todos fazem parte do mesmo projeto):\n\`\`\`${fence}\n${fullCode}\n\`\`\`\n\nCrie um resumo da aula`;
  const codeScope = hasTodayDiff ? "código escrito HOJE" : "código dele, olhando TODOS os arquivos";
  const exemploConceitos = lang ? (lang.id === "html" ? "<!DOCTYPE html>, <head>, <body>, <h1>, <p>, <a>, <img>, atributos" : lang.id === "css" ? "seletores, propriedades, {  }, cores, box model, flexbox" : lang.id === "php" ? "<?php ?>, variáveis $, echo, if/else, foreach, function" : "let/const, function, if/else, arrays, template literals") : "using, class, static void Main, string, int, Console.WriteLine, Console.ReadLine, ; , { }";
  if (detail === "detalhado") {
    return {
      prompt: contextPart + ` bem organizado e didático, em português brasileiro CORRETO (sem erros de digitação), para quem está começando agora.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "intro": "1 ou 2 frases curtas e acolhedoras dizendo o que esta aula ensinou, com base no código dele",\n  "secoes": [\n    { "emoji": "um emoji que combine com o conceito", "titulo": "nome curto e claro do conceito (ex: Mostrar texto na tela)", "explicacao": "explicação bem simples, de 1 a 3 frases, do que isso faz e por quê", "exemplo": "um trecho de código ${langName} curto e correto mostrando o uso (use \\n para quebrar linhas)" }\n  ],\n  "dica": "uma dica final curta, útil e motivadora para o aluno"\n}\n\nFaça uma seção (entre 3 e 7) para cada conceito, palavra-chave ou símbolo importante que aparece no ${codeScope} (ex: ${exemploConceitos}). Linguagem bem de iniciante. Exemplos curtos, corretos e fáceis de copiar. Garanta JSON válido (aspas escapadas corretamente).`,
      system: `Você é um professor de ${langName} paciente e organizado, para iniciantes. Português correto e simples. Responda APENAS JSON puro válido.` + nyxPrefsInstruction(nyxPrefs),
    };
  }
  return {
    prompt: contextPart + ` bem organizado, SIMPLES e didático, em português brasileiro CORRETO (sem erros de digitação), para quem está começando agora.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "intro": "1 frase curta e acolhedora dizendo o que esta aula ensinou, com base no código dele",\n  "secoes": [\n    { "emoji": "um emoji que combine com o conceito", "titulo": "nome curto e claro do conceito (ex: Mostrar texto na tela)", "explicacao": "explicação BEM simples, em NO MÁXIMO 2 frases curtas, do que isso faz — sem jargão técnico, como se explicasse para alguém de 13 anos que nunca programou", "exemplo": "um trecho de código ${langName} BEM curto (1 a 3 linhas) e correto mostrando o uso (use \\n para quebrar linhas)" }\n  ],\n  "dica": "uma dica final curta (1 frase), útil e motivadora para o aluno"\n}\n\nFaça uma seção (entre 3 e 7) para cada conceito, palavra-chave ou símbolo importante que aparece no ${codeScope} (ex: ${exemploConceitos}). Frases curtas e diretas, uma ideia por vez. Nada de explicações longas ou com vários porquês encadeados. Exemplos curtos e fáceis de copiar. Garanta JSON válido (aspas escapadas corretamente).`,
    system: `Você é um professor de ${langName} paciente, para iniciantes de 13-14 anos que nunca programaram. Explique tudo do jeito MAIS SIMPLES possível: frases curtas, uma ideia por frase, sem jargão técnico desnecessário e sem explicações longas. Português correto e simples. Responda APENAS JSON puro válido.` + nyxPrefsInstruction(nyxPrefs),
  };
}
// monta o pedido de CONTINUAÇÃO do resumo — usado quando o aluno já tinha um resumo pronto hoje e o
// professor passou mais código depois; pede só as seções NOVAS, sem repetir o que já foi explicado
export function buildContinuationSummaryRequest(existingSummary, novoCode, fullCode, lang, nyxPrefs) {
  const langName = lang ? lang.label : "C#";
  const fence = lang ? lang.codeLang : "csharp";
  const jaExplicado = (existingSummary.secoes || []).map(s => s.titulo).filter(Boolean).join(", ") || "(nada ainda)";
  return {
    prompt: `Um aluno iniciante de ${langName} já tinha um resumo de aula pronto, cobrindo estes conceitos: ${jaExplicado}.\n\nDepois disso, o professor passou MAIS código pra turma copiar, e isto é o que o aluno escreveu a mais:\n\`\`\`${fence}\n${novoCode}\n\`\`\`\n\nCódigo completo do projeto até agora (contexto, pode repetir trechos de antes):\n\`\`\`${fence}\n${fullCode}\n\`\`\`\n\nCrie a CONTINUAÇÃO do resumo: só seções sobre conceitos NOVOS que aparecem no código escrito depois. NÃO repita nenhum dos conceitos já listados acima.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "secoes": [\n    { "emoji": "um emoji que combine com o conceito", "titulo": "nome curto e claro do conceito", "explicacao": "explicação BEM simples, em NO MÁXIMO 2 frases curtas, sem jargão técnico", "exemplo": "um trecho de código ${langName} BEM curto (1 a 3 linhas) mostrando o uso (use \\n para quebrar linha)" }\n  ],\n  "dica": "uma dica final curta (1 frase), sobre o que aprendeu de novo"\n}\n\nSe não houver nenhum conceito realmente novo, devolva "secoes": [] mesmo assim. Frases curtas, simples, para quem começou a programar agora. Garanta JSON válido.`,
    system: `Você é um professor de ${langName} continuando um resumo de aula já começado — só acrescenta o que é novo, nunca repete o que já foi explicado antes. Português correto e simples. Responda APENAS JSON puro válido.` + nyxPrefsInstruction(nyxPrefs),
  };
}
// junta o resumo novo (só as seções novas) ao resumo que já existia, sem perder o que já tinha
export function mergeSummaryContinuation(existing, addition) {
  const newSecoes = (addition && Array.isArray(addition.secoes)) ? addition.secoes : [];
  return {
    intro: existing.intro,
    secoes: [...(existing.secoes || []), ...newSecoes],
    dica: (addition && addition.dica) || existing.dica,
  };
}
// dificuldade adaptativa: olha a média das últimas notas do aluno e devolve uma instrução extra pro
// Nyx pesar a atividade pra mais fácil ou mais desafiadora — null quando não há dado suficiente ainda
// ou quando o desempenho está equilibrado (mantém o mix padrão de sempre)
export function recentDifficultyHint(scoreHistory) {
  const dates = Object.keys(scoreHistory || {}).sort((a,b)=>b.localeCompare(a)).slice(0,3);
  if (dates.length < 2) return null;
  const avg = dates.reduce((sum,d)=>sum+scoreHistory[d],0) / dates.length;
  if (avg < 55) return `\n\nATENÇÃO — dificuldade: esse aluno tem tirado notas baixas nas últimas atividades (média recente ${Math.round(avg)}/100). Faça a MAIORIA das questões (uns 6 de 8) BEM diretas e fáceis, um conceito de cada vez, e só 2 um pouco mais desafiadoras — o objetivo é ele ganhar confiança sem travar.`;
  if (avg > 85) return `\n\nATENÇÃO — dificuldade: esse aluno tem tirado notas altas nas últimas atividades (média recente ${Math.round(avg)}/100). Inclua mais questões desafiadoras: peça pra comparar conceitos parecidos, prever a saída exata do código, ou notar pegadinhas sutis — não deixe tão fácil.`;
  return null;
}
// mesmo cálculo do recentDifficultyHint, mas devolvendo só a categoria — usado pra decidir se a
// atividade ganha dicas extras (quem está com dificuldade) ou uma questão bônus (quem está indo muito bem)
export function adaptiveDifficultyTier(scoreHistory) {
  const dates = Object.keys(scoreHistory || {}).sort((a,b)=>b.localeCompare(a)).slice(0,3);
  if (dates.length < 2) return null;
  const avg = dates.reduce((sum,d)=>sum+scoreHistory[d],0) / dates.length;
  if (avg < 55) return "baixa";
  if (avg > 85) return "alta";
  return null;
}
