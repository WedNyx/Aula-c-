import { useState } from "react";

const DESKTOP_APPS = [
  { id: "roblox", name: "Roblox", icon: "◼", scheme: "roblox://", accent: "#f0e9fb" },
  { id: "unity", name: "Unity Hub", icon: "◆", scheme: "unityhub://", accent: "#22d3ee" },
  { id: "vscode", name: "VS Code", icon: "⌘", scheme: "vscode://", accent: "#38bdf8" },
];

const cleanFolderName = value => value.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, "").replace(/[. ]+$/g, "").slice(0, 80);
const cleanFolderName = value => Array.from(value.trim()).filter(ch => ch.charCodeAt(0) >= 32 && ![60, 62, 58, 34, 47, 92, 124, 63, 42].includes(ch.charCodeAt(0))).join("").replace(/[. ]+$/g, "").slice(0, 80);
export function DesktopAppLauncher() {
  const [message, setMessage] = useState("");
  const [studentName, setStudentName] = useState("");
  const [creating, setCreating] = useState(false);

  const launch = app => {
    setMessage(`Tentando abrir ${app.name}… confirme a solicitação do navegador, se ela aparecer.`);
    window.location.assign(app.scheme);
  };

  const createStudentFolder = async () => {
    const folderName = cleanFolderName(studentName);
    if (!folderName || folderName === "." || folderName === "..") {
      setMessage("Digite um nome válido para a pasta do aluno.");
      return;
    }
    if (typeof window.showDirectoryPicker !== "function") {
      setMessage("Seu navegador não permite criar pastas dessa forma. Use o Chrome ou Edge atualizado no computador e abra a plataforma por HTTPS.");
      return;
    }
    setCreating(true);
    setMessage("Escolha a Área de Trabalho ou outra pasta no computador e autorize a criação.");
    try {
      const parent = await window.showDirectoryPicker({ mode: "readwrite", id: "aulacsharp-alunos" });
      // Não sobrescreve nem exclui arquivos existentes. A pasta fica no local escolhido.
      await parent.getDirectoryHandle(folderName, { create: true });
      setMessage(`Pasta "${folderName}" pronta dentro de "${parent.name}". Agora clique em Abrir VS Code e use Arquivo > Abrir Pasta para selecioná-la.`);
    } catch (error) {
      if (error?.name === "AbortError") {
        setMessage("Seleção cancelada. Nenhuma pasta foi criada.");
      } else {
        setMessage("Não foi possível criar a pasta. Confira a permissão de escrita e tente novamente.");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="desktop-app-launcher" aria-labelledby="desktop-app-launcher-title">
      <div>
        <strong id="desktop-app-launcher-title">Abrir no computador</strong>
        <small>Inicia somente o aplicativo instalado, sem escolher jogo ou projeto.</small>
      </div>
      <div className="desktop-app-launcher-actions">
        {DESKTOP_APPS.map(app => (
          <button
            key={app.id}
            type="button"
            onClick={() => launch(app)}
            style={{ "--app-accent": app.accent }}
            aria-label={`Abrir ${app.name} no computador`}
          >
            <span aria-hidden="true">{app.icon}</span>
            Abrir {app.name}
          </button>
        ))}
      </div>
      <div className="desktop-app-launcher-folder" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, alignItems: "center" }}>
        <label htmlFor="student-code-folder-name">Pasta de programação do aluno</label>
        <input
          id="student-code-folder-name"
          type="text"
          maxLength={80}
          value={studentName}
          onChange={event => setStudentName(event.target.value)}
          placeholder="Nome do aluno"
          autoComplete="off"
          style={{ padding: 8, borderRadius: 8, maxWidth: 230 }}
        />
        <button type="button" disabled={creating} onClick={createStudentFolder}>
          {creating ? "Criando pasta…" : "Criar pasta do aluno"}
        </button>
      </div>
      <small>Escolha a Área de Trabalho quando o navegador solicitar. Para abrir a pasta no VS Code: Arquivo &gt; Abrir Pasta. Se não tiver o programa, <a href="https://code.visualstudio.com/download" target="_blank" rel="noopener noreferrer">instale o VS Code</a>.</small>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
