// ── util de cor: clareia/escurece um hex para dar profundidade ao avatar ──
export function hexToRgb(hex: string): [number, number, number] {
  const h = String(hex || "").replace("#", "");
  const f = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(f || "000000", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function shade(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = pct < 0 ? 0 : 255, p = Math.min(1, Math.abs(pct));
  const m = (v: number) => Math.round((t - v) * p) + v;
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
export function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 165;
}
