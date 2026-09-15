import { useState } from "react";

const DESKTOP_APPS = [
  {
    id: "roblox",
    name: "Roblox",
    icon: "◼",
    scheme: "roblox://",
    accent: "#f0e9fb",
  },
  {
    id: "unity",
    name: "Unity Hub",
    icon: "◆",
    scheme: "unityhub://",
    accent: "#22d3ee",
  },
];

export function DesktopAppLauncher() {
  const [message, setMessage] = useState("");

  const launch = app => {
    setMessage(`Tentando abrir ${app.name}… confirme a solicitação do navegador, se ela aparecer.`);
    window.location.assign(app.scheme);
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
            style={{ "--app-accent":app.accent }}
            aria-label={`Abrir ${app.name} no computador`}
          >
            <span aria-hidden="true">{app.icon}</span>
            Abrir {app.name}
          </button>
        ))}
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
