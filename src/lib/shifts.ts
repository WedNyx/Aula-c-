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

// ── turmas: um professor pode ter mais de uma turma no MESMO turno (ex: duas turmas de tarde) —
// cada turma é o próprio id de partição usado em todo o storage (aluno, prova, código etc já
// funcionam com qualquer string de turno, prova disso é TEST_SHIFT/LANG_SHIFT acima). SHIFTS
// continua existindo só como o "bootstrap padrão": enquanto o professor nunca abrir a tela de
// gerenciar turmas, DEFAULT_TURMAS é o que o app usa, e nada muda pra quem só tem as 2 turmas de
// sempre — a lista de verdade (turmas:list) só passa a existir quando ele cria a primeira turma extra ──
export interface TurmaRecord {
  id: string;
  label: string;
  emoji: string;
  period: "matutino" | "vespertino"; // qual turno físico do dia — usado pro horário/status de aula
  color: string;
  createdAt: number;
  archived: boolean;
}
export const TURMA_COLORS: string[] = ["#f59e0b", "#c084fc", "#22d3ee", "#34d399", "#ec4899", "#818cf8"];
export const DEFAULT_TURMAS: TurmaRecord[] = SHIFTS.map((s, i) => ({
  id: s.id,
  label: s.label,
  emoji: s.emoji,
  period: s.id as "matutino" | "vespertino",
  color: TURMA_COLORS[i] || "#c084fc",
  createdAt: 0,
  archived: false,
}));

export const shiftMeta = (id?: string | null, turmas?: TurmaRecord[] | null): ShiftMeta => {
  const fromTurmas = (turmas || []).find(t => t.id === id);
  if (fromTurmas) return { id: fromTurmas.id, label: fromTurmas.label, emoji: fromTurmas.emoji };
  return SHIFTS.find(s => s.id === id) || (id === TEST_SHIFT.id ? TEST_SHIFT : id === LANG_SHIFT.id ? LANG_SHIFT : { id: id || "", label: "Sem turno", emoji: "" });
};
export const shiftLabel = (id?: string | null, turmas?: TurmaRecord[] | null): string => { const m = shiftMeta(id, turmas); return `${m.emoji} ${m.label}`.trim(); };
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
