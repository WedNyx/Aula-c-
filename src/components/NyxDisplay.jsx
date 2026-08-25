import { NyxRobot as StandardNyx } from "./NyxRobot.jsx";
import { NyxPrismaOrbital } from "./NyxPrismaOrbital.jsx";

// Um único ponto de decisão para toda a plataforma: sem aparência equipada, o Nyx usa seu
// corpo padrão. Aparências compradas e estados funcionais Lunar/Eclipse usam o corpo orbital,
// que é onde essas artes e os dois encaixes por categoria foram desenhados.
export function NyxDisplay({ gear, onInteract, ...props }) {
  const skin = gear?.skin || null;
  if (skin) return <NyxPrismaOrbital {...props} gear={gear} onInteract={onInteract} />;

  return <StandardNyx {...props} gear={gear} onInteract={onInteract} />;
}
