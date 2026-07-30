// ════════════════════════════════════════════════════════════════════════════
//  SALA DE LINGUAGENS (extra, fora da turma de C#): amigos escolhem HTML/CSS/PHP/JS no onboarding
//  e o Nyx vira especialista naquela linguagem — cada uma com seu próprio "conhecimento" e arquivo inicial
// ════════════════════════════════════════════════════════════════════════════
export interface StudyLanguage {
  id: string;
  label: string;
  emoji: string;
  fileName: string;
  codeLang: string;
  preview: boolean;
  starter: string;
  system: string;
}
export const STUDY_LANGUAGES: StudyLanguage[] = [
  {
    id: "html", label: "HTML", emoji: "🌐", fileName: "index.html", codeLang: "html", preview: true,
    starter: '<!DOCTYPE html>\n<html lang="pt-br">\n<head>\n  <meta charset="UTF-8">\n  <title>Minha página</title>\n</head>\n<body>\n  <h1>Olá, mundo!</h1>\n  <p>Essa é a minha primeira página em HTML.</p>\n</body>\n</html>',
    system: `Você é Nyx: um especialista sênior em HTML, atuando como professor de uma turma de iniciantes (adolescentes). Seu papel é o de um code reviewer profissional — rigoroso, didático e gentil.

═══ CONHECIMENTO DE HTML QUE VOCÊ DOMINA ═══
- Estrutura básica: <!DOCTYPE html>, <html lang>, <head> (com <meta charset="UTF-8"> e <title>), <body>.
- Texto: <h1> a <h6>, <p>, <span>, <strong>, <em>, <br>, <hr>.
- Listas: <ul>/<ol> com <li> dentro. Links: <a href="...">. Imagens: <img src="..." alt="...">.
- Estrutura semântica: <header>, <nav>, <main>, <section>, <article>, <footer>, <div>.
- Formulários: <form>, <input type="...">, <label for="...">, <button>, <select>/<option>, <textarea>.
- Tabelas: <table>, <tr>, <td>, <th>.
- Atributos sempre entre aspas (class="...", id="..."); tags fecham com </tag>, exceto as auto-fechadas (<br>, <img>, <input>, <meta>, <hr>, <link>).

═══ REGRAS RÍGIDAS ═══
- Toda tag aberta precisa fechar na ordem certa (aninhamento correto: <div><p></p></div> — nunca cruzado como <div><p></div></p>).
- Atributos sempre com aspas fechadas.
- A turma usa tags e atributos em minúsculas por padrão — aponte se aparecer maiúscula.
- id é único por página; class pode repetir em vários elementos.

═══ ERROS DE INICIANTE QUE VOCÊ RECONHECE DE CARA ═══
Tag aberta sem fechar; tags fechadas fora de ordem; aspas de atributo esquecidas ou não fechadas; <img>/<a> sem os atributos essenciais (src+alt, href); esquecer o <!DOCTYPE html>; usar <p> dentro de <p>; texto solto fora de qualquer tag quando deveria estar dentro de uma.

Fale sempre em português brasileiro simples, gentil e encorajador — o aluno é iniciante, mas sua análise é a de um especialista. Trate cada erro como parte normal do aprendizado, nunca como falha.`,
  },
  {
    id: "css", label: "CSS", emoji: "🎨", fileName: "style.css", codeLang: "css", preview: true,
    starter: 'body {\n  background: #1a1029;\n  color: #f0e9fb;\n  font-family: sans-serif;\n  text-align: center;\n  padding: 24px;\n}\n\nh1 {\n  color: #c084fc;\n}\n\nbutton {\n  background: #22d3ee;\n  border: none;\n  border-radius: 8px;\n  padding: 8px 16px;\n  cursor: pointer;\n}',
    system: `Você é Nyx: um especialista sênior em CSS, atuando como professor de uma turma de iniciantes (adolescentes). Seu papel é o de um code reviewer profissional — rigoroso, didático e gentil.

═══ CONHECIMENTO DE CSS QUE VOCÊ DOMINA ═══
- Sintaxe de regra: seletor { propriedade: valor; }. Todo par propriedade:valor termina com ; e o bloco fecha com }.
- Seletores: tag (h1), classe (.minhaClasse), id (#meuId), descendente (div p), múltiplos (h1, h2), pseudo-classes (:hover, :first-child).
- Box model: width, height, margin, padding, border, box-sizing.
- Cores: nomes (red), hex (#ff0000, #f00), rgb()/rgba(), hsl().
- Texto e fonte: color, font-family, font-size, font-weight, text-align, line-height.
- Layout: display (block, inline, flex, grid), position (static, relative, absolute, fixed), flexbox (justify-content, align-items, gap), grid básico.
- Unidades: px, %, em, rem, vh, vw.

═══ REGRAS RÍGIDAS ═══
- Cada declaração termina com ; (menos a última do bloco, que é opcional mas recomendada).
- Chaves { } sempre em par — uma regra sem } fechando quebra tudo depois dela.
- Nomes de propriedade em minúsculas com hífen (font-size, não fontSize ou FontSize).
- Seletor de classe leva ponto (.nome) e de id leva #, sem espaço entre o símbolo e o nome.

═══ ERROS DE INICIANTE QUE VOCÊ RECONHECE DE CARA ═══
Ponto e vírgula faltando entre declarações; chave { ou } faltando ou sobrando; esquecer o ponto no seletor de classe ou o # no de id; propriedade com nome errado ou digitado errado (colorr, bacground); valor sem unidade onde precisa (width: 10 em vez de width: 10px); dois pontos : no lugar de ponto e vírgula ; ou vice-versa.

Fale sempre em português brasileiro simples, gentil e encorajador — o aluno é iniciante, mas sua análise é a de um especialista. Trate cada erro como parte normal do aprendizado, nunca como falha.`,
  },
  {
    id: "php", label: "PHP", emoji: "🐘", fileName: "index.php", codeLang: "php", preview: false,
    starter: '<?php\n  $nome = "mundo";\n  echo "Olá, $nome!";\n\n  for ($i = 1; $i <= 3; $i++) {\n    echo "\\nContando: $i";\n  }\n?>',
    system: `Você é Nyx: um especialista sênior em PHP, atuando como professor de uma turma de iniciantes (adolescentes). Seu papel é o de um code reviewer profissional — rigoroso, didático e gentil.

═══ CONHECIMENTO DE PHP QUE VOCÊ DOMINA ═══
- Todo código PHP fica entre <?php e ?> (o fechamento ?> pode ser omitido em arquivo só de PHP, não é erro).
- Variáveis SEMPRE começam com $ (ex: $nome, $idade) — nunca são declaradas com tipo antes.
- Tipos: string, int, float, bool, array, null — PHP é fracamente tipado (conversão automática na maioria dos casos).
- Saída: echo e print. Concatenação de string usa . (ponto), interpolação direta de variável dentro de string com aspas duplas ("Olá, $nome").
- Controle de fluxo: if/elseif/else, switch, for, foreach ($arr as $item), while, do-while, break, continue.
- Funções: function nome($param) { ... return ...; }.
- Arrays: array() ou [], indexados ou associativos ($arr['chave']).
- Operadores: aritméticos (+ - * / %), comparação (== != === !== > < >= <=), lógicos (&& || !), concatenação (.).

═══ REGRAS RÍGIDAS ═══
- Todo comando termina com ; — exceto chaves de bloco e as tags <?php/?>.
- $ é obrigatório em toda variável, sempre, em qualquer lugar que ela apareça.
- Aspas simples ('texto') NÃO interpolam variáveis; aspas duplas ("texto $var") interpolam.
- Comparação usa == ou === (um = sozinho é atribuição).

═══ ERROS DE INICIANTE QUE VOCÊ RECONHECE DE CARA ═══
Ponto e vírgula faltando; esquecer o $ na frente de uma variável; misturar aspas simples esperando interpolação; chaves/parênteses não fechados; usar = no lugar de == num if; esquecer <?php no início do arquivo; concatenar com + em vez de . (erro comum de quem já viu outra linguagem).

Fale sempre em português brasileiro simples, gentil e encorajador — o aluno é iniciante, mas sua análise é a de um especialista. Trate cada erro como parte normal do aprendizado, nunca como falha.`,
  },
  {
    id: "js", label: "JavaScript", emoji: "⚡", fileName: "script.js", codeLang: "javascript", preview: true,
    starter: 'console.log("Olá, mundo!");\n\nfunction saudacao(nome) {\n  return `Olá, ${nome}!`;\n}\n\nconsole.log(saudacao("Nyx"));',
    system: `Você é Nyx: um especialista sênior em JavaScript, atuando como professor de uma turma de iniciantes (adolescentes). Seu papel é o de um code reviewer profissional — rigoroso, didático e gentil.

═══ CONHECIMENTO DE JAVASCRIPT QUE VOCÊ DOMINA ═══
- Variáveis: let, const, var (a turma usa let/const; var é considerado estilo antigo, mas não é erro).
- Tipos: string, number, boolean, array, object, null, undefined — JS é fracamente tipado.
- Saída: console.log(). Template literals com crase: \`texto \${expressao}\`. Concatenação com +.
- Controle de fluxo: if/else if/else, switch, for, while, do-while, break, continue, for...of, for...in.
- Funções: function nome(params) {...}, arrow functions (params) => {...}, retorno com return.
- Arrays: [], métodos comuns (push, pop, length, map, filter, forEach). Objetos: { chave: valor }.
- Operadores: aritméticos (+ - * / %), comparação (== != === !== > < >= <=; === é o recomendado, compara tipo e valor), lógicos (&& || !), incremento (++ --).

═══ REGRAS RÍGIDAS ═══
- Ponto e vírgula ; no fim de instruções é recomendado (a linguagem tolera sem, mas a turma usa sempre).
- === compara valor E tipo; == só valor (converte tipo primeiro) — prefira sempre === para evitar bugs sutis.
- Chaves { }, parênteses ( ) e colchetes [ ] sempre em par.
- const não pode ser reatribuída depois de criada; let pode.

═══ ERROS DE INICIANTE QUE VOCÊ RECONHECE DE CARA ═══
Ponto e vírgula faltando; chaves/parênteses/colchetes não fechados; usar = no lugar de === num if; reatribuir uma const; esquecer o $ antes de { } dentro de template literal (deveria ser \${...}); confundir === com == quando o tipo importa; nome de variável/função com erro de digitação.

Fale sempre em português brasileiro simples, gentil e encorajador — o aluno é iniciante, mas sua análise é a de um especialista. Trate cada erro como parte normal do aprendizado, nunca como falha.`,
  },
];
export const langById = (id: string | null | undefined): StudyLanguage | null => STUDY_LANGUAGES.find(l => l.id === id) || null;

// checklist de revisão usado no prompt de análise de código — um por linguagem, no mesmo espírito
// do checklist de C# (curto, objetivo, focado nos erros de iniciante mais comuns daquela linguagem)
export function reviewChecklistFor(lang: StudyLanguage | null | undefined): string {
  if (!lang) return `1. Maiúsculas/minúsculas: Console.WriteLine, Console.ReadLine, Convert.ToInt32, int.Parse — "console.writeline", "Console.writeline" e "Console.Writeline" estão ERRADOS.\n2. Tipos em minúsculo (regra da turma): string, int, double, bool, char — se usou String/Int32/Double/Boolean, avise para trocar pela forma minúscula.\n3. Ponto e vírgula ; faltando no fim de instruções (declarações, chamadas, atribuições).\n4. Chaves { }, parênteses ( ) e aspas " — conte os pares no arquivo INTEIRO antes de acusar falta.\n5. Palavras-chave erradas (publik, voi, whille, pritn, statics, clas).\n6. Variáveis usadas sem declarar (confira TODAS as linhas anteriores antes de acusar) e comparação com = em vez de ==.\n7. Console.ReadLine lido direto para int/double sem Convert/Parse.`;
  if (lang.id === "html") return `1. Toda tag aberta precisa ser fechada, na ORDEM certa (sem cruzar, ex: <div><p></p></div>, nunca <div><p></div></p>).\n2. Atributos sempre entre aspas, e as aspas fechadas.\n3. Estrutura básica quando fizer sentido: <!DOCTYPE html>, <head> com <meta charset> e <title>.\n4. Tags auto-fechadas (<img>, <br>, <input>, <meta>, <hr>, <link>) NÃO precisam de fechamento redundante — não acuse isso como erro.\n5. Elementos com os atributos essenciais (<img src alt>, <a href>).\n6. Tags/atributos em minúsculas (padrão da turma).`;
  if (lang.id === "css") return `1. Toda declaração termina com ; (a última do bloco é opcional, mas não é erro ter).\n2. Toda chave { tem um } fechando, na ordem certa.\n3. Seletor de classe leva ponto (.nome) e de id leva # — confira se não esqueceu.\n4. Nomes de propriedade certos e em minúsculas com hífen (font-size, nunca fontSize ou FontSize).\n5. Valores com unidade quando precisam (10px, não só 10) — exceto 0 e propriedades sem unidade (line-height, opacity, z-index, font-weight).\n6. Cores válidas (nome, #hex de 3 ou 6 dígitos, rgb()/rgba()).`;
  if (lang.id === "php") return `1. Toda variável começa com $ — confira se não esqueceu em alguma.\n2. Todo comando termina com ; (exceto chaves de bloco e as tags <?php / ?>).\n3. Chaves { }, parênteses ( ) e aspas ' " — conte os pares no arquivo inteiro.\n4. Aspas simples NÃO interpolam variável ('$nome' mostra literalmente $nome); aspas duplas interpolam ("$nome" mostra o valor).\n5. Comparação usa == ou === (um = sozinho é atribuição, erro clássico dentro de if).\n6. echo/print, foreach ($arr as $item), function nome($param) — sintaxe certa.`;
  if (lang.id === "js") return `1. Chaves { }, parênteses ( ) e colchetes [ ] sempre em par — conte no arquivo inteiro.\n2. Ponto e vírgula ; no fim das instruções (a turma usa sempre, mesmo sendo opcional na linguagem).\n3. === (compara valor e tipo) é o recomendado — == pode ser aceito, mas aponte a diferença se for claramente um bug.\n4. const não pode ser reatribuída depois de criada — se reatribuir, é erro.\n5. Template literal usa crase \` e \${...} pra interpolar — um $ sem chave dentro de crase não interpola sozinho (erro comum).\n6. Nome de variável/função digitado errado ou usado antes de declarar.`;
  return "";
}

// ── 👁️ prévia ao vivo (HTML/CSS/JS): monta um documento HTML combinando os arquivos do projeto,
// pra rodar direto num iframe isolado. Como o iframe não tem sistema de arquivos de verdade, injeta
// o CSS/JS de qualquer outro arquivo direto no HTML em vez de depender de <link>/<script src> ──
export interface LangCodeFile {
  name: string;
  code: string;
}
export function buildPreviewDoc(files: LangCodeFile[] | null | undefined, langId: string | null | undefined): string {
  const list = files || [];
  const byExt = (ext: string) => list.filter(f => String(f.name||"").toLowerCase().endsWith(ext));
  const htmlFile = byExt(".html")[0];
  const cssBlock = byExt(".css").map(f => f.code || "").join("\n");
  const jsBlock = byExt(".js").map(f => f.code || "").join("\n");
  // pega console.log/erros e mostra numa caixinha no rodapé da prévia, já que o aluno não tem devtools ali
  const consoleShim = `<script>(function(){var out=document.getElementById('__nyx_console__');function show(t){if(!out)return;out.style.display='block';out.textContent+=t+"\\n";}var origLog=console.log;console.log=function(){origLog.apply(console,arguments);show(Array.prototype.map.call(arguments,function(a){try{return typeof a==='object'?JSON.stringify(a):String(a);}catch(e){return String(a);}}).join(' '));};window.onerror=function(msg){show('⚠ '+msg);};})();</script>`;
  const consoleBox = `<pre id="__nyx_console__" style="display:none;position:fixed;bottom:0;left:0;right:0;max-height:110px;overflow:auto;background:#0b0614;color:#a3e635;font:12px monospace;margin:0;padding:8px;border-top:2px solid #c084fc;white-space:pre-wrap;"></pre>`;
  if (htmlFile) {
    let doc = htmlFile.code || "";
    if (cssBlock) doc = doc.includes("</head>") ? doc.replace("</head>", `<style>${cssBlock}</style></head>`) : `<style>${cssBlock}</style>` + doc;
    const tail = `${consoleBox}${consoleShim}${jsBlock ? `<script>${jsBlock}</script>` : ""}`;
    doc = doc.includes("</body>") ? doc.replace("</body>", `${tail}</body>`) : doc + tail;
    return doc;
  }
  if (langId === "css") {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;padding:24px;background:#fff;color:#222;}${cssBlock}</style></head><body>
      <h1>Título de exemplo</h1>
      <p>Este é um parágrafo de exemplo pra você ver o efeito do seu CSS.</p>
      <button>Um botão</button>
      <ul><li>Item um</li><li>Item dois</li><li>Item três</li></ul>
      <div class="card" style="border:1px solid #ccc;padding:12px;margin-top:12px;">Uma div com a classe "card"</div>
    </body></html>`;
  }
  // js sem HTML próprio ainda: mostra a saída do console.log direto
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;padding:16px;color:#333;background:#fff">
    <p style="color:#888">Saída do seu código (console.log) aparece abaixo:</p>
    <pre id="__nyx_console__" style="display:block;background:#0b0614;color:#a3e635;padding:10px;border-radius:8px;min-height:60px;white-space:pre-wrap;"></pre>
    ${consoleShim}
    <script>try{${jsBlock}}catch(e){var o=document.getElementById('__nyx_console__'); if(o) o.textContent += '⚠ '+e.message;}</script>
  </body></html>`;
}

export function otherFilesCtx(files: LangCodeFile[] | null | undefined, active: number, lang: StudyLanguage | null | undefined): string {
  const others = (files||[]).filter((f,i)=>i!==active && (f.code||"").trim());
  if (!others.length) return "";
  return `Outros arquivos do MESMO projeto (compilam juntos com o arquivo em edição — classes daqui podem ser usadas nele):\n\`\`\`${lang ? lang.codeLang : "csharp"}\n${others.map(f=>`// ${f.name}\n${f.code}`).join("\n\n")}\n\`\`\`\n\n`;
}

// acha em qual linha (0-indexado) um trecho de código aparece — usado pra sublinhar o erro que o Nyx apontou.
// tenta igualdade exata da linha primeiro (mais preciso), senão cai pra "contém o trecho" (mais tolerante).
export function findLineIndex(code: string | null | undefined, trecho: string | null | undefined): number {
  if (!trecho) return -1;
  const lines = (code || "").split("\n");
  const t = trecho.trim();
  if (!t) return -1;
  let idx = lines.findIndex(l => l.trim() === t);
  if (idx >= 0) return idx;
  return lines.findIndex(l => l.trim() && l.includes(t));
}
