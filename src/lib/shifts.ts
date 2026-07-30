// ── turnos (matutino / vespertino) ──
export interface ShiftMeta {
  id: string;
  label: string;
  emoji: string;
}

export const SHIFTS: ShiftMeta[] = [
  { id: "matutino", label: "Matutino", emoji: "☀️" },
  { id: "vespertino", label: "Vespertino", emoji: "🌙" },
];
// turma de teste — só entra quem sabe a senha; fica fora do SHIFTS para não aparecer nos filtros normais
export const TEST_SHIFT: ShiftMeta = { id: "teste", label: "Teste", emoji: "🧪" };
export const TEST_SHIFT_PASSWORD = "T3steSystem";
// sala extra pra amigos estudarem outras linguagens (HTML/CSS/PHP/JS) por conta própria — mesmo
// modelo de acesso da turma de teste (senha própria, fora do fluxo normal da turma de C#)
export const LANG_SHIFT: ShiftMeta = { id: "linguagens", label: "Linguagens", emoji: "🌐" };
export const LANG_SHIFT_PASSWORD = "MultiLang2026";
export const shiftMeta = (id?: string | null): ShiftMeta =>
  SHIFTS.find(s => s.id === id) || (id === TEST_SHIFT.id ? TEST_SHIFT : id === LANG_SHIFT.id ? LANG_SHIFT : { id: id || "", label: "Sem turno", emoji: "" });
export const shiftLabel = (id?: string | null): string => { const m = shiftMeta(id); return `${m.emoji} ${m.label}`.trim(); };
export const isSameDayTs = (ts?: number | null): boolean => !!ts && new Date(ts).toDateString() === new Date().toDateString();

// conteúdo do dia por turno — aceita o formato antigo (string única) como legado
export type ContentNameValue = string | Record<string, string> | null | undefined;

export function contentNameFor(value: ContentNameValue, shift: string): string {
  if (!value) return "";
  if (typeof value === "string") return value; // legado: mesmo texto pros dois turnos
  return value[shift] || "";
}
export function withContentName(
  contentNames: Record<string, ContentNameValue> | null | undefined,
  date: string,
  shift: string,
  title: string
): Record<string, ContentNameValue> {
  const prev = (contentNames || {})[date];
  const prevObj = prev && typeof prev === "object" ? prev : {};
  return { ...(contentNames || {}), [date]: { ...prevObj, [shift]: title } };
}
