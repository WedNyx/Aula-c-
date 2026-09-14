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


export interface RegionGeo { lat: number; lng: number; }

// Coordenadas geográficas aproximadas dos centros das regiões administrativas.
// Servem para posicionar os marcadores sobre o mapa real; não rastreiam o GPS da carreta.
export const DF_REGION_GEO: Record<string, RegionGeo> = {
  "Plano Piloto (Brasília)": { lat:-15.7939, lng:-47.8828 },
  "Gama": { lat:-16.0186, lng:-48.0717 },
  "Taguatinga": { lat:-15.8325, lng:-48.0563 },
  "Brazlândia": { lat:-15.6700, lng:-48.2000 },
  "Sobradinho": { lat:-15.6508, lng:-47.7939 },
  "Planaltina": { lat:-15.6170, lng:-47.6500 },
  "Paranoá": { lat:-15.7757, lng:-47.7796 },
  "Núcleo Bandeirante": { lat:-15.8710, lng:-47.9676 },
  "Ceilândia": { lat:-15.8171, lng:-48.1073 },
  "Guará": { lat:-15.8244, lng:-47.9787 },
  "Cruzeiro": { lat:-15.7894, lng:-47.9394 },
  "Samambaia": { lat:-15.8775, lng:-48.0904 },
  "Santa Maria": { lat:-16.0100, lng:-48.0133 },
  "São Sebastião": { lat:-15.9007, lng:-47.7720 },
  "Recanto das Emas": { lat:-15.9022, lng:-48.0617 },
  "Lago Sul": { lat:-15.8403, lng:-47.8779 },
  "Riacho Fundo": { lat:-15.8814, lng:-48.0176 },
  "Lago Norte": { lat:-15.7375, lng:-47.8575 },
  "Candangolândia": { lat:-15.8532, lng:-47.9502 },
  "Águas Claras": { lat:-15.8396, lng:-48.0281 },
  "Riacho Fundo II": { lat:-15.9148, lng:-48.0417 },
  "Sudoeste/Octogonal": { lat:-15.7974, lng:-47.9256 },
  "Varjão": { lat:-15.7108, lng:-47.8781 },
  "Park Way": { lat:-15.9038, lng:-47.9915 },
  "SCIA/Estrutural": { lat:-15.7794, lng:-47.9974 },
  "Sobradinho II": { lat:-15.6481, lng:-47.8251 },
  "Jardim Botânico": { lat:-15.8697, lng:-47.7988 },
  "Itapoã": { lat:-15.7444, lng:-47.7681 },
  "SIA": { lat:-15.8026, lng:-47.9577 },
  "Vicente Pires": { lat:-15.8087, lng:-48.0309 },
  "Fercal": { lat:-15.5984, lng:-47.8735 },
  "Sol Nascente/Pôr do Sol": { lat:-15.8278, lng:-48.1408 },
  "Arniqueira": { lat:-15.8567, lng:-48.0164 },
};
