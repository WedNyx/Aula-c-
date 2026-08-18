// 🎁 presente misterioso do dia (aparece ao concluir a atividade, 1x por dia)
export const GIFT_TIERS = [
  { chance: 0.55, pts: 3,  label: "Presente comum",  emoji: "💝", color: "#34d399" },
  { chance: 0.30, pts: 6,  label: "Presente RARO",   emoji: "💎", color: "#22d3ee" },
  { chance: 0.15, pts: 12, label: "Presente ÉPICO",  emoji: "👑", color: "#fbbf24" },
];
export function rollGift() {
  const r = Math.random();
  if (r < GIFT_TIERS[0].chance) return GIFT_TIERS[0];
  if (r < GIFT_TIERS[0].chance + GIFT_TIERS[1].chance) return GIFT_TIERS[1];
  return GIFT_TIERS[2];
}
