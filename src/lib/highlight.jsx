// ════════════════════════════════════════════════════════════════════════════
//  SYNTAX HIGHLIGHT  (com cores de pares de colchetes/chaves/parênteses do VSCode)
// ════════════════════════════════════════════════════════════════════════════
export const BRACKET_COLORS = ["#FFD700", "#DA70D6", "#179FFF"]; // ouro, roxo, azul (padrão VSCode)

// dispatcher: escolhe o tokenizer certo pela extensão do arquivo — cada sala de linguagem (C# na
// turma normal, HTML/CSS/PHP/JS na sala de linguagens) ganha o realce que combina com sua sintaxe
export function highlight(code, errorLines, filename) {
  const ext = String(filename || "").toLowerCase().split(".").pop();
  if (ext === "html" || ext === "htm") return highlightHTML(code, errorLines);
  if (ext === "css") return highlightCSS(code, errorLines);
  if (ext === "php") return highlightPHP(code, errorLines);
  if (ext === "js") return highlightJS(code, errorLines);
  return highlightCSharp(code, errorLines);
}

export function highlightCSharp(code, errorLines) {
  const keywords = ["using","namespace","class","static","void","public","private","protected","internal","int","long","short","string","bool","double","float","char","decimal","byte","return","if","else","for","while","foreach","do","in","new","var","true","false","null","this","base","override","virtual","abstract","sealed","readonly","const","try","catch","finally","throw","switch","case","break","continue","default","get","set","using","enum","struct","interface","async","await"];
  let depth = 0; // profundidade de colchetes acumulada entre linhas
  const lines = code.split("\n");
  const errSet = new Set(errorLines || []);
  return lines.map((line, li) => {
    const tokens = [];
    let i = 0;
    while (i < line.length) {
      // comentário de linha
      if (line[i] === "/" && line[i+1] === "/") {
        tokens.push(<span key={i} style={{color:"#6a9955"}}>{line.slice(i)}</span>);
        i = line.length; break;
      }
      // string interpolada: $"...{expr}..." — o texto fixo continua com a cor de string, mas as
      // chaves e a variável/expressão de dentro ganham cor própria, pra ficar claro o que é texto
      // fixo e o que é código de verdade (ex: Console.WriteLine($"{Name} atacou!"))
      if (line[i] === "$" && line[i+1] === '"') {
        tokens.push(<span key={i} style={{color:"#ce9178"}}>{'$"'}</span>);
        i += 2;
        let runStart = i;
        const flushRun = (end) => { if (end > runStart) tokens.push(<span key={runStart} style={{color:"#ce9178"}}>{line.slice(runStart, end)}</span>); };
        while (i < line.length && line[i] !== '"') {
          if (line[i] === "{" && line[i+1] === "{") { i += 2; continue; } // {{ escapado: chave literal, continua como texto
          if (line[i] === "}" && line[i+1] === "}") { i += 2; continue; } // }} escapado
          if (line[i] === "{") {
            flushRun(i);
            tokens.push(<span key={i} style={{color:"#569cd6"}}>{"{"}</span>);
            i++;
            const exprStart = i;
            let edepth = 1;
            while (i < line.length && edepth > 0) {
              if (line[i] === "{") edepth++;
              else if (line[i] === "}") { edepth--; if (edepth === 0) break; }
              i++;
            }
            const expr = line.slice(exprStart, i);
            if (expr) tokens.push(<span key={exprStart} style={{color: /^[A-Z]/.test(expr) ? "#4ec9b0" : "#9cdcfe"}}>{expr}</span>);
            if (line[i] === "}") { tokens.push(<span key={i} style={{color:"#569cd6"}}>{"}"}</span>); i++; }
            runStart = i;
            continue;
          }
          i++;
        }
        flushRun(i);
        if (line[i] === '"') { tokens.push(<span key={i} style={{color:"#ce9178"}}>{'"'}</span>); i++; }
        continue;
      }
      // string
      if (line[i] === '"') {
        let j = i+1;
        while (j < line.length && line[j] !== '"') j++;
        tokens.push(<span key={i} style={{color:"#ce9178"}}>{'"'+line.slice(i+1,j)+'"'}</span>);
        i = j+1; continue;
      }
      // palavra
      if (/[a-zA-Z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
        const word = line.slice(i,j);
        if (keywords.includes(word)) tokens.push(<span key={i} style={{color:"#569cd6"}}>{word}</span>);
        else if (j < line.length && line[j] === "(") tokens.push(<span key={i} style={{color:"#dcdcaa"}}>{word}</span>);
        else if (/^[A-Z]/.test(word)) tokens.push(<span key={i} style={{color:"#4ec9b0"}}>{word}</span>);
        else tokens.push(<span key={i} style={{color:"#9cdcfe"}}>{word}</span>);
        i = j; continue;
      }
      // número
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9.]/.test(line[j])) j++;
        tokens.push(<span key={i} style={{color:"#b5cea8"}}>{line.slice(i,j)}</span>);
        i = j; continue;
      }
      const ch = line[i];
      if ("([{".includes(ch)) {
        const col = BRACKET_COLORS[depth % 3]; depth++;
        tokens.push(<span key={i} style={{color:col}}>{ch}</span>);
      } else if (")]}".includes(ch)) {
        depth = Math.max(0, depth-1);
        const col = BRACKET_COLORS[depth % 3];
        tokens.push(<span key={i} style={{color:col}}>{ch}</span>);
      } else {
        tokens.push(<span key={i} style={{color:"#d4d4d4"}}>{ch}</span>);
      }
      i++;
    }
    return (
      <div key={li} style={{ minHeight:"1.5em", ...(errSet.has(li) ? { textDecoration:"underline wavy #f87171", textDecorationThickness:"2px", textUnderlineOffset:"3px" } : {}) }}>
        {tokens.length ? tokens : " "}
      </div>
    );
  });
}

export function highlightJS(code, errorLines) {
  const keywords = ["function","return","if","else","for","while","do","break","continue","switch","case","default","try","catch","finally","throw","new","delete","typeof","instanceof","in","of","var","let","const","true","false","null","undefined","this","class","extends","super","static","get","set","async","await","yield","import","export","from","void"];
  let depth = 0;
  const lines = code.split("\n");
  const errSet = new Set(errorLines || []);
  return lines.map((line, li) => {
    const tokens = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === "/" && line[i+1] === "/") {
        tokens.push(<span key={i} style={{color:"#6a9955"}}>{line.slice(i)}</span>);
        i = line.length; break;
      }
      // template literal `...${expr}...` — mesma ideia da string interpolada do C#, só que com crase
      if (line[i] === "`") {
        tokens.push(<span key={i} style={{color:"#ce9178"}}>{"`"}</span>);
        i += 1;
        let runStart = i;
        const flushRun = (end) => { if (end > runStart) tokens.push(<span key={runStart} style={{color:"#ce9178"}}>{line.slice(runStart, end)}</span>); };
        while (i < line.length && line[i] !== "`") {
          if (line[i] === "$" && line[i+1] === "{") {
            flushRun(i);
            tokens.push(<span key={i} style={{color:"#569cd6"}}>{"${"}</span>);
            i += 2;
            const exprStart = i;
            let edepth = 1;
            while (i < line.length && edepth > 0) {
              if (line[i] === "{") edepth++;
              else if (line[i] === "}") { edepth--; if (edepth === 0) break; }
              i++;
            }
            const expr = line.slice(exprStart, i);
            if (expr) tokens.push(<span key={exprStart} style={{color:"#9cdcfe"}}>{expr}</span>);
            if (line[i] === "}") { tokens.push(<span key={i} style={{color:"#569cd6"}}>{"}"}</span>); i++; }
            runStart = i;
            continue;
          }
          i++;
        }
        flushRun(i);
        if (line[i] === "`") { tokens.push(<span key={i} style={{color:"#ce9178"}}>{"`"}</span>); i++; }
        continue;
      }
      if (line[i] === '"' || line[i] === "'") {
        const q = line[i];
        let j = i+1;
        while (j < line.length && line[j] !== q) j++;
        tokens.push(<span key={i} style={{color:"#ce9178"}}>{q+line.slice(i+1,j)+q}</span>);
        i = j+1; continue;
      }
      if (/[a-zA-Z_$]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
        const word = line.slice(i,j);
        if (keywords.includes(word)) tokens.push(<span key={i} style={{color:"#569cd6"}}>{word}</span>);
        else if (j < line.length && line[j] === "(") tokens.push(<span key={i} style={{color:"#dcdcaa"}}>{word}</span>);
        else if (/^[A-Z]/.test(word)) tokens.push(<span key={i} style={{color:"#4ec9b0"}}>{word}</span>);
        else tokens.push(<span key={i} style={{color:"#9cdcfe"}}>{word}</span>);
        i = j; continue;
      }
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9.]/.test(line[j])) j++;
        tokens.push(<span key={i} style={{color:"#b5cea8"}}>{line.slice(i,j)}</span>);
        i = j; continue;
      }
      const ch = line[i];
      if ("([{".includes(ch)) {
        const col = BRACKET_COLORS[depth % 3]; depth++;
        tokens.push(<span key={i} style={{color:col}}>{ch}</span>);
      } else if (")]}".includes(ch)) {
        depth = Math.max(0, depth-1);
        const col = BRACKET_COLORS[depth % 3];
        tokens.push(<span key={i} style={{color:col}}>{ch}</span>);
      } else {
        tokens.push(<span key={i} style={{color:"#d4d4d4"}}>{ch}</span>);
      }
      i++;
    }
    return (
      <div key={li} style={{ minHeight:"1.5em", ...(errSet.has(li) ? { textDecoration:"underline wavy #f87171", textDecorationThickness:"2px", textUnderlineOffset:"3px" } : {}) }}>
        {tokens.length ? tokens : " "}
      </div>
    );
  });
}

export function highlightPHP(code, errorLines) {
  const keywords = ["function","return","if","else","elseif","endif","for","foreach","while","do","break","continue","switch","case","default","try","catch","finally","throw","new","echo","print","class","extends","implements","interface","public","private","protected","static","const","true","false","null","namespace","use","require","require_once","include","include_once","array","global","isset","unset","empty","instanceof","as"];
  let depth = 0;
  const lines = code.split("\n");
  const errSet = new Set(errorLines || []);
  return lines.map((line, li) => {
    const tokens = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === "/" && line[i+1] === "/") { tokens.push(<span key={i} style={{color:"#6a9955"}}>{line.slice(i)}</span>); i = line.length; break; }
      if (line[i] === "<" && line.slice(i, i+5) === "<?php") { tokens.push(<span key={i} style={{color:"#c586c0"}}>{"<?php"}</span>); i += 5; continue; }
      if (line[i] === "?" && line[i+1] === ">") { tokens.push(<span key={i} style={{color:"#c586c0"}}>{"?>"}</span>); i += 2; continue; }
      if (line[i] === '"' || line[i] === "'") {
        const q = line[i]; let j = i+1;
        while (j < line.length && line[j] !== q) j++;
        tokens.push(<span key={i} style={{color:"#ce9178"}}>{q+line.slice(i+1,j)+q}</span>);
        i = j+1; continue;
      }
      // variáveis do PHP sempre começam com $ — vira uma cor própria em qualquer lugar (não só em string)
      if (line[i] === "$" && /[a-zA-Z_]/.test(line[i+1]||"")) {
        let j = i+1;
        while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
        tokens.push(<span key={i} style={{color:"#9cdcfe"}}>{line.slice(i,j)}</span>);
        i = j; continue;
      }
      if (/[a-zA-Z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
        const word = line.slice(i,j);
        if (keywords.includes(word.toLowerCase())) tokens.push(<span key={i} style={{color:"#569cd6"}}>{word}</span>);
        else if (j < line.length && line[j] === "(") tokens.push(<span key={i} style={{color:"#dcdcaa"}}>{word}</span>);
        else if (/^[A-Z]/.test(word)) tokens.push(<span key={i} style={{color:"#4ec9b0"}}>{word}</span>);
        else tokens.push(<span key={i} style={{color:"#d4d4d4"}}>{word}</span>);
        i = j; continue;
      }
      if (/[0-9]/.test(line[i])) {
        let j = i; while (j < line.length && /[0-9.]/.test(line[j])) j++;
        tokens.push(<span key={i} style={{color:"#b5cea8"}}>{line.slice(i,j)}</span>);
        i = j; continue;
      }
      const ch = line[i];
      if ("([{".includes(ch)) { const col = BRACKET_COLORS[depth % 3]; depth++; tokens.push(<span key={i} style={{color:col}}>{ch}</span>); }
      else if (")]}".includes(ch)) { depth = Math.max(0, depth-1); const col = BRACKET_COLORS[depth % 3]; tokens.push(<span key={i} style={{color:col}}>{ch}</span>); }
      else tokens.push(<span key={i} style={{color:"#d4d4d4"}}>{ch}</span>);
      i++;
    }
    return (
      <div key={li} style={{ minHeight:"1.5em", ...(errSet.has(li) ? { textDecoration:"underline wavy #f87171", textDecorationThickness:"2px", textUnderlineOffset:"3px" } : {}) }}>
        {tokens.length ? tokens : " "}
      </div>
    );
  });
}

export function highlightCSS(code, errorLines) {
  let inComment = false;
  const lines = code.split("\n");
  const errSet = new Set(errorLines || []);
  return lines.map((line, li) => {
    const tokens = [];
    let i = 0;
    while (i < line.length) {
      if (inComment) {
        const end = line.indexOf("*/", i);
        if (end === -1) { tokens.push(<span key={i} style={{color:"#6a9955"}}>{line.slice(i)}</span>); i = line.length; break; }
        tokens.push(<span key={i} style={{color:"#6a9955"}}>{line.slice(i, end+2)}</span>);
        i = end+2; inComment = false; continue;
      }
      if (line[i] === "/" && line[i+1] === "*") {
        const end = line.indexOf("*/", i+2);
        if (end === -1) { tokens.push(<span key={i} style={{color:"#6a9955"}}>{line.slice(i)}</span>); inComment = true; i = line.length; break; }
        tokens.push(<span key={i} style={{color:"#6a9955"}}>{line.slice(i, end+2)}</span>);
        i = end+2; continue;
      }
      if (line[i] === '"' || line[i] === "'") {
        const q = line[i]; let j = i+1;
        while (j < line.length && line[j] !== q) j++;
        tokens.push(<span key={i} style={{color:"#ce9178"}}>{q+line.slice(i+1,j)+q}</span>);
        i = j+1; continue;
      }
      if (line[i] === "#" && /[0-9a-fA-F]/.test(line[i+1]||"")) {
        let j = i+1; while (j < line.length && /[0-9a-fA-F]/.test(line[j])) j++;
        tokens.push(<span key={i} style={{color:"#ce9178"}}>{line.slice(i,j)}</span>);
        i = j; continue;
      }
      if (/[.#]/.test(line[i]) && /[a-zA-Z_-]/.test(line[i+1]||"")) {
        let j = i+1; while (j < line.length && /[a-zA-Z0-9_-]/.test(line[j])) j++;
        tokens.push(<span key={i} style={{color:"#d7ba7d"}}>{line.slice(i,j)}</span>);
        i = j; continue;
      }
      if (/[a-zA-Z-]/.test(line[i])) {
        let j = i; while (j < line.length && /[a-zA-Z0-9-]/.test(line[j])) j++;
        const word = line.slice(i,j);
        let k = j; while (k < line.length && line[k] === " ") k++;
        if (line[k] === ":") tokens.push(<span key={i} style={{color:"#9cdcfe"}}>{word}</span>);
        else if (line[k] === "{" || line[j] === ",") tokens.push(<span key={i} style={{color:"#4ec9b0"}}>{word}</span>);
        else tokens.push(<span key={i} style={{color:"#dcdcaa"}}>{word}</span>);
        i = j; continue;
      }
      if (/[0-9]/.test(line[i])) {
        let j = i; while (j < line.length && /[0-9.]/.test(line[j])) j++;
        let k = j; while (k < line.length && /[a-zA-Z%]/.test(line[k])) k++;
        tokens.push(<span key={i} style={{color:"#b5cea8"}}>{line.slice(i,k)}</span>);
        i = k; continue;
      }
      const ch = line[i];
      if (ch === "{" || ch === "}") tokens.push(<span key={i} style={{color:"#FFD700"}}>{ch}</span>);
      else tokens.push(<span key={i} style={{color:"#d4d4d4"}}>{ch}</span>);
      i++;
    }
    return (
      <div key={li} style={{ minHeight:"1.5em", ...(errSet.has(li) ? { textDecoration:"underline wavy #f87171", textDecorationThickness:"2px", textUnderlineOffset:"3px" } : {}) }}>
        {tokens.length ? tokens : " "}
      </div>
    );
  });
}

export function highlightHTML(code, errorLines) {
  let inComment = false;
  const lines = code.split("\n");
  const errSet = new Set(errorLines || []);
  return lines.map((line, li) => {
    const tokens = [];
    let i = 0;
    while (i < line.length) {
      if (inComment) {
        const end = line.indexOf("-->", i);
        if (end === -1) { tokens.push(<span key={i} style={{color:"#6a9955"}}>{line.slice(i)}</span>); i = line.length; break; }
        tokens.push(<span key={i} style={{color:"#6a9955"}}>{line.slice(i, end+3)}</span>);
        i = end+3; inComment = false; continue;
      }
      if (line.slice(i, i+4) === "<!--") {
        const end = line.indexOf("-->", i+4);
        if (end === -1) { tokens.push(<span key={i} style={{color:"#6a9955"}}>{line.slice(i)}</span>); inComment = true; i = line.length; break; }
        tokens.push(<span key={i} style={{color:"#6a9955"}}>{line.slice(i, end+3)}</span>);
        i = end+3; continue;
      }
      if (line[i] === "<") {
        const isClose = line[i+1] === "/";
        tokens.push(<span key={i} style={{color:"#808080"}}>{isClose ? "</" : "<"}</span>);
        i += isClose ? 2 : 1;
        let j = i; while (j < line.length && /[a-zA-Z0-9-]/.test(line[j])) j++;
        if (j > i) { tokens.push(<span key={i} style={{color:"#4ec9b0"}}>{line.slice(i,j)}</span>); i = j; }
        while (i < line.length && line[i] !== ">") {
          if (line[i] === "/" && line[i+1] === ">") { tokens.push(<span key={i} style={{color:"#808080"}}>{"/>"}</span>); i += 2; break; }
          if (line[i] === '"' || line[i] === "'") {
            const q = line[i]; let k = i+1;
            while (k < line.length && line[k] !== q) k++;
            tokens.push(<span key={i} style={{color:"#ce9178"}}>{q+line.slice(i+1,k)+q}</span>);
            i = k+1; continue;
          }
          if (/[a-zA-Z-]/.test(line[i])) {
            let k = i; while (k < line.length && /[a-zA-Z0-9-]/.test(line[k])) k++;
            tokens.push(<span key={i} style={{color:"#9cdcfe"}}>{line.slice(i,k)}</span>);
            i = k; continue;
          }
          tokens.push(<span key={i} style={{color:"#d4d4d4"}}>{line[i]}</span>);
          i++;
        }
        if (line[i] === ">") { tokens.push(<span key={i} style={{color:"#808080"}}>{">"}</span>); i++; }
        continue;
      }
      let j = i; while (j < line.length && line[j] !== "<") j++;
      if (j > i) tokens.push(<span key={i} style={{color:"#d4d4d4"}}>{line.slice(i,j)}</span>);
      i = j;
    }
    return (
      <div key={li} style={{ minHeight:"1.5em", ...(errSet.has(li) ? { textDecoration:"underline wavy #f87171", textDecorationThickness:"2px", textUnderlineOffset:"3px" } : {}) }}>
        {tokens.length ? tokens : " "}
      </div>
    );
  });
}

