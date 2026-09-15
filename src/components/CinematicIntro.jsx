import { useCallback, useEffect, useState } from "react";
import "./CinematicIntro.css";

const INTRO_DURATION_MS = 4800;
const INTRO_SESSION_KEY = "aula-csharp:cinematic-intro-seen:v1";

function alreadySeenThisSession() {
  try {
    return window.sessionStorage.getItem(INTRO_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function CinematicIntro() {
  const [visible, setVisible] = useState(() => !alreadySeenThisSession());

  const finish = useCallback(() => {
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, "true");
    } catch {
      // O acesso continua funcionando mesmo se o navegador bloquear o storage.
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return undefined;
    }

    const timer = window.setTimeout(finish, INTRO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [finish, visible]);

  if (!visible) return null;

  return (
    <section
      className="cinematic-intro"
      aria-label="Abertura da Aula C#"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) finish();
      }}
    >
      <img
        className="cinematic-intro__scene"
        src="/assets/aula-csharp-cinematic-eclipse.webp"
        alt=""
        aria-hidden="true"
      />
      <button className="cinematic-intro__skip" type="button" onClick={finish}>
        <span className="cinematic-intro__skip-label">Pular</span>
        <span aria-hidden="true">›</span>
      </button>
      <p className="cinematic-intro__announcement" aria-live="polite">
        Abertura animada da Aula C#. Use o botão Pular para continuar imediatamente.
      </p>
    </section>
  );
}
