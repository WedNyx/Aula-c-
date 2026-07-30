import { shade } from "./colors.ts";

// ── tema ──
export const FONT = "'Nunito','Segoe UI',system-ui,sans-serif";
// além dos brilhos, um "grid de pontos" bem sutil (26px) dá cara de bancada de programador
export const PAGE_BG = "radial-gradient(1100px 700px at 85% -10%, rgba(124,131,255,.18), transparent 60%), radial-gradient(900px 600px at -10% 110%, rgba(34,211,238,.11), transparent 55%), radial-gradient(760px 520px at 50% 115%, rgba(236,72,153,.05), transparent 60%), radial-gradient(rgba(124,131,255,.05) 1px, transparent 1.6px) 0 0 / 26px 26px, linear-gradient(180deg,#120b1e 0%,#0c0f20 100%)";
export const LIGHT_BG = "radial-gradient(1000px 620px at 85% -10%, rgba(124,131,255,.20), transparent 60%), radial-gradient(900px 600px at -10% 110%, rgba(34,211,238,.14), transparent 55%), linear-gradient(180deg,#eef1fb 0%,#dde4f5 100%)";
// tema exclusivo desbloqueado quando o aluno equipa espada + escudo juntos e o Nyx vira um Espartano
export const SPARTAN_BG = "radial-gradient(1100px 700px at 85% -10%, rgba(217,119,6,.24), transparent 60%), radial-gradient(900px 600px at -10% 110%, rgba(153,27,27,.20), transparent 55%), radial-gradient(760px 520px at 50% 115%, rgba(120,53,15,.14), transparent 60%), linear-gradient(180deg,#2b1408 0%,#160a04 100%)";
export function customBg(spec: string): string {
  const colors = String(spec).split(",").map(c => c.trim()).filter(c => /^#/.test(c)).slice(0, 3);
  if (colors.length <= 1) {
    const hex = colors[0] || "#c084fc";
    return `radial-gradient(1000px 620px at 85% -10%, ${shade(hex, 0.15)}, transparent 65%), linear-gradient(180deg, ${shade(hex, -0.55)} 0%, ${shade(hex, -0.72)} 100%)`;
  }
  const stops = colors.map(c => shade(c, -0.32)).join(", ");
  return `linear-gradient(135deg, ${stops})`;
}
export const pageBgFor = (theme?: string | null): string =>
  theme === "light" ? LIGHT_BG
  : theme === "spartan" ? SPARTAN_BG
  : (typeof theme === "string" && theme.startsWith("#")) ? customBg(theme)
  : PAGE_BG;
