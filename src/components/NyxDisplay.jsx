import { NyxPrismaOrbital } from "./NyxPrismaOrbital.jsx";

// Um único ponto de decisão para toda a plataforma: o Prisma Orbital é o corpo oficial do Nyx.
// Skins, estados Lunar/Eclipse e acessórios são variações desse mesmo corpo moderno; assim,
// remover uma skin nunca faz o mascote voltar para o antigo robô quadrado.
export function NyxDisplay({ gear, onInteract, ...props }) {
  return <NyxPrismaOrbital {...props} gear={gear} onInteract={onInteract} />;
}
