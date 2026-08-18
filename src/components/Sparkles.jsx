import { useEffect, useRef } from "react";

// fundo animado de partículas — nasceu só decorativo, atrás do card de login (ver o antigo
// AmbientParticles em LoginScreen.jsx). Virou componente reutilizável pra poder aparecer em mais
// lugares da plataforma sem duplicar a lógica do tsParticles em cada tela.
// "id" precisa ser único por instância montada ao mesmo tempo na página — dois containers do
// tsParticles com o mesmo id colidem entre si.
// "position" é "fixed" (cobre a janela inteira, uso original do login) ou "absolute" (fica preso
// ao container pai, que precisa ter position:relative — uso dentro de um card específico).
// registro do plugin "slim" é global e só pode acontecer UMA VEZ por carregamento de página — se
// duas instâncias de Sparkles chamarem loadSlim() cada uma (ex: aluno passa pelo login e depois
// entra na área dele, ou o professor abre o painel depois do login), a 2ª chamada quebra com
// "Register plugins can only be done before calling tsParticles.load()". Essa promise compartilhada
// entre TODAS as instâncias garante que o registro só rode uma vez, e todo mundo espera ela.
let engineReady = null;
function ensureEngine() {
  if (!engineReady) {
    engineReady = (async () => {
      const [{ tsParticles }, { loadSlim }] = await Promise.all([
        import("@tsparticles/engine"),
        import("@tsparticles/slim"),
      ]);
      await loadSlim(tsParticles);
      return tsParticles;
    })();
  }
  return engineReady;
}
export function Sparkles({ id = "nyx-ambient-particles", position = "fixed", count = 36 }) {
  const mountedRef = useRef(true);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    mountedRef.current = true;
    let container = null;
    (async () => {
      const tsParticles = await ensureEngine();
      if (!mountedRef.current) return;
      container = await tsParticles.load({
        id,
        options: {
          fullScreen: { enable: false },
          background: { color: "transparent" },
          fpsLimit: 60,
          particles: {
            number: { value: count, density: { enable: true, area: 900 } },
            color: { value: ["#c084fc", "#22d3ee", "#fefce8"] },
            opacity: { value: { min: 0.12, max: 0.55 }, animation: { enable: true, speed: 0.35, sync: false } },
            size: { value: { min: 1, max: 2.2 } },
            move: { enable: true, speed: 0.25, direction: "top", random: true, straight: false, outModes: { default: "out" } },
            links: { enable: false },
          },
          detectRetina: true,
        },
      }).catch(() => null);
    })();
    return () => { mountedRef.current = false; if (container) container.destroy(); };
  }, [id, count]);
  return <div id={id} style={{ position, inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}
