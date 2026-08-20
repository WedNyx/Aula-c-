// mapa esquemático das regiões administrativas do DF — usado pela visão geral da jornada da
// carreta (TripOverviewModal) e pelo campo de cidade do painel do professor

export const DF_CITIES: string[] = ["Plano Piloto (Brasília)", "Gama", "Taguatinga", "Brazlândia", "Sobradinho", "Planaltina", "Paranoá", "Núcleo Bandeirante", "Ceilândia", "Guará", "Cruzeiro", "Samambaia", "Santa Maria", "São Sebastião", "Recanto das Emas", "Lago Sul", "Riacho Fundo", "Lago Norte", "Candangolândia", "Águas Claras", "Riacho Fundo II", "Sudoeste/Octogonal", "Varjão", "Park Way", "SCIA/Estrutural", "Sobradinho II", "Jardim Botânico", "Itapoã", "SIA", "Vicente Pires", "Fercal", "Sol Nascente/Pôr do Sol", "Arniqueira"];

export interface RegionCoord { x: number; y: number; }

// ── 🗺️ mapa da jornada: posição ESQUEMÁTICA (não é GPS de verdade) de cada região administrativa
// do DF num grid de 0 a 100, só pra dar noção de mais ou menos onde cada uma fica em relação às
// outras — Plano Piloto no centro, satélites espalhadas ao redor, seguindo o formato real do DF ──
export const DF_REGION_COORDS: Record<string, RegionCoord> = {
  "Plano Piloto (Brasília)": { x: 60, y: 42 },
  "Lago Sul": { x: 70, y: 50 },
  "Lago Norte": { x: 66, y: 32 },
  "Paranoá": { x: 80, y: 40 },
  "Itapoã": { x: 77, y: 36 },
  "Jardim Botânico": { x: 78, y: 48 },
  "Varjão": { x: 63, y: 30 },
  "Sudoeste/Octogonal": { x: 54, y: 48 },
  "Cruzeiro": { x: 50, y: 46 },
  "SIA": { x: 46, y: 46 },
  "Guará": { x: 44, y: 50 },
  "Núcleo Bandeirante": { x: 47, y: 56 },
  "Candangolândia": { x: 49, y: 55 },
  "Park Way": { x: 45, y: 62 },
  "Riacho Fundo": { x: 41, y: 62 },
  "Riacho Fundo II": { x: 39, y: 67 },
  "Vicente Pires": { x: 41, y: 48 },
  "Águas Claras": { x: 37, y: 53 },
  "Arniqueira": { x: 35, y: 57 },
  "Taguatinga": { x: 30, y: 51 },
  "SCIA/Estrutural": { x: 39, y: 45 },
  "Ceilândia": { x: 18, y: 47 },
  "Sol Nascente/Pôr do Sol": { x: 14, y: 49 },
  "Samambaia": { x: 21, y: 59 },
  "Brazlândia": { x: 9, y: 24 },
  "Santa Maria": { x: 37, y: 74 },
  "Gama": { x: 35, y: 81 },
  "Recanto das Emas": { x: 27, y: 69 },
  "São Sebastião": { x: 74, y: 67 },
  "Fercal": { x: 54, y: 9 },
  "Sobradinho": { x: 59, y: 17 },
  "Sobradinho II": { x: 56, y: 21 },
  "Planaltina": { x: 84, y: 11 },
};
export function normalizeCityName(s: string | null | undefined): string {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
// acha a região do DF que bate com o texto livre que o professor digitou (pode não ter acento,
// pode ser só "Brasília" em vez de "Plano Piloto (Brasília)" etc.) — null se não reconhecer nenhuma
export function matchDfRegion(cityName: string | null | undefined): string | null {
  const norm = normalizeCityName(cityName);
  if (!norm) return null;
  // 1ª passada: só correspondência EXATA — sem isso, digitar "Sobradinho II" batia por substring
  // com "Sobradinho" (que aparece antes na lista), já que "sobradinho ii".includes("sobradinho")
  // também é verdadeiro; mesmo problema com "Riacho Fundo"/"Riacho Fundo II"
  for (const region of DF_CITIES) {
    if (normalizeCityName(region) === norm) return region;
  }
  // 2ª passada: substring, só como fallback pra texto livre (ex: "Brasília" → "Plano Piloto (Brasília)")
  for (const region of DF_CITIES) {
    const rn = normalizeCityName(region);
    if (rn.includes(norm) || norm.includes(rn)) return region;
  }
  return null;
}
