import { useEffect, useRef, useState } from "react";

const PROMPT = "C:\\Aula\\MeuProjeto>";
const HELP = [
  "Comandos disponíveis:",
  "  dotnet run      compila e executa o programa",
  "  dotnet build    compila e mostra os erros",
  "  dir  (ou ls)    lista os arquivos",
  "  cls  (ou clear) limpa o terminal",
  "  ajuda           mostra esta lista",
  "",
];

export function Terminal({ files = [], dataTour, maxHeight = 260 }) {
  const [lines, setLines] = useState(["Terminal da Aula C#", 'Digite "ajuda" para ver os comandos.', ""]);
  const [command, setCommand] = useState("");
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const commandHistory = useRef([]);
  const historyIndex = useRef(-1);
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [lines, running]);

  const write = (...newLines) => setLines((current) => [...current, ...newLines]);
  const listedFiles = () => files.map((file) => `  ${file.name}${(file.code || "").trim() ? "" : "  (vazio)"}`);
  const sourceFiles = () => files
    .filter((file) => (file.code || "").trim())
    .map((file) => ({ name: file.name, code: file.code }));

  const execute = async (mode) => {
    const sources = sourceFiles();
    if (!sources.length) {
      write(`Nenhum código para ${mode === "build" ? "compilar" : "executar"}. Escreva algo no editor primeiro.`, "");
      return;
    }
    setRunning(true);
    write(mode === "build" ? "⏳ compilando..." : "⏳ compilando e executando...");
    try {
      const response = await fetch("/api/execute-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: sources, stdin, language: "csharp", mode }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Não foi possível usar o compilador agora.");
      const output = [result.compileOutput, result.stderr, result.message, result.stdout]
        .filter(Boolean)
        .join("\n")
        .trim();
      if (output) write(...output.split("\n"));
      if (result.success) {
        if (mode === "build") write("Build succeeded.", "    0 Error(s)");
        else if (!output) write("(programa finalizado sem saída)");
      } else if (!/failed/i.test(output)) {
        write("Build FAILED.");
      }
      write("");
    } catch (error) {
      write(`⚠ ${error.message}`, "");
    } finally {
      setRunning(false);
    }
  };

  const submitCommand = () => {
    const raw = command;
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
    setCommand("");
    write(`${PROMPT} ${raw}`);
    if (!normalized) return;
    commandHistory.current.push(raw);
    historyIndex.current = -1;
    if (["cls", "clear"].includes(normalized)) return setLines([]);
    if (["ajuda", "help"].includes(normalized)) return write(...HELP);
    if (["dir", "ls"].includes(normalized)) return write(...listedFiles(), "");
    if (normalized === "dotnet run") return execute("run");
    if (normalized === "dotnet build") return execute("build");
    if (normalized.startsWith("dotnet")) return write("Uso:  dotnet run  |  dotnet build", "");
    write(`'${raw.trim()}' não é reconhecido como um comando. Digite "ajuda".`, "");
  };

  const onKeyDown = (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      if (!running) setLines([]);
    } else if (event.key === "Enter") {
      submitCommand();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!commandHistory.current.length) return;
      historyIndex.current = historyIndex.current < 0
        ? commandHistory.current.length - 1
        : Math.max(0, historyIndex.current - 1);
      setCommand(commandHistory.current[historyIndex.current]);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex.current < 0) return;
      historyIndex.current += 1;
      if (historyIndex.current >= commandHistory.current.length) {
        historyIndex.current = -1;
        setCommand("");
      } else setCommand(commandHistory.current[historyIndex.current]);
    }
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const mono = { fontFamily: "'Courier New', monospace", fontSize: 13 };
  const button = { background: "#222", border: "1px solid #444", color: "#bbb", borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontSize: 12 };
  const lineColor = (line) => /error|failed|não foi possível|não é reconhecido/i.test(line)
    ? "#f87171"
    : /succeeded|0 Error/i.test(line) ? "#34d399" : /⏳|compilando/i.test(line) ? "#fbbf24" : "#d4d4d4";

  return (
    <div data-tour={dataTour} style={{ background: "#0a0a0a", border: "1px solid #333", borderRadius: 10, marginTop: 12, overflow: "hidden" }}>
      <div style={{ background: "#171717", padding: "7px 12px", display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #333" }}>
        <span style={{ color: "#bbb", fontSize: 13 }}>⌨️ Terminal <small style={{ color: "#666" }}>· execução real pelo Judge0</small> <span role="status" style={{ color: running ? "#fbbf24" : "#60a5fa", fontSize: 11 }}>● {running ? "Executando…" : "Pronto"}</span></span>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={copyOutput} disabled={!lines.length} style={button}>{copied ? "copiado ✓" : "copiar"}</button>
          <button type="button" onClick={() => setLines([])} disabled={running} style={button}>limpar</button>
          <button type="button" onClick={() => execute("run")} disabled={running} style={{ ...button, background: "#34d399", color: "#03301f", fontWeight: 800 }}>{running ? "executando..." : "▶ dotnet run"}</button>
        </div>
      </div>
      <div style={{ display: "grid", gap: 7, padding: "8px 12px", background: "#101010", borderBottom: "1px solid #252525" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => execute("build")} disabled={running} style={button}>Compilar</button>
          <button type="button" onClick={() => write(PROMPT + " dir", ...listedFiles(), "")} disabled={running} style={button}>Listar arquivos</button>
          <button type="button" onClick={() => write(PROMPT + " ajuda", ...HELP)} disabled={running} style={button}>Ajuda</button>
        </div>
        <label style={{ color: "#aaa", fontSize: 11 }}>
          Entrada do programa (uma linha para cada Console.ReadLine)
          <textarea value={stdin} onChange={(event) => setStdin(event.target.value)} disabled={running} rows={2} placeholder={"Exemplo:\nMaria\n15"} style={{ ...mono, display: "block", boxSizing: "border-box", width: "100%", marginTop: 4, resize: "vertical", background: "#080808", border: "1px solid #333", borderRadius: 6, color: "#d4d4d4", padding: 7 }} />
        </label>
      </div>
      <div ref={outputRef} role="log" aria-live="polite" aria-label="Saída do terminal" style={{ minHeight: 110, maxHeight, overflow: "auto", padding: 12 }} onClick={() => inputRef.current?.focus()}>
        <pre style={{ ...mono, margin: 0, whiteSpace: "pre-wrap" }}>
          {lines.map((line, index) => <span key={index} style={{ display: "block", minHeight: "1em", color: lineColor(line) }}>{line || " "}</span>)}
        </pre>
        {!running && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ ...mono, color: "#d4d4d4", whiteSpace: "nowrap" }}>{PROMPT}</span>
          <input ref={inputRef} aria-label="Comando do terminal" value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={onKeyDown} spellCheck={false} autoCorrect="off" autoCapitalize="off" style={{ ...mono, flex: 1, background: "transparent", border: "none", outline: "none", color: "#d4d4d4", padding: 0 }} />
        </div>}
      </div>
    </div>
  );
}
