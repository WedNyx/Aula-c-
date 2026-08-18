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
// turma de teste — só entra quem sabe a senha; fica fora do SHIFTS para não aparecer nos filtros normais.
// A senha em si NÃO fica aqui (isso é código que vai pro navegador do aluno) — é verificada no
// servidor por api/shift-auth.js, ver api/_shiftAuth.js.
export const TEST_SHIFT: ShiftMeta = { id: "teste", label: "Teste", emoji: "🧪" };
// sala extra pra amigos estudarem outras linguagens (HTML/CSS/PHP/JS) por conta própria — mesmo
// modelo de acesso da turma de teste (senha própria, fora do fluxo normal da turma de C#)
export const LANG_SHIFT: ShiftMeta = { id: "linguagens", label: "Linguagens", emoji: "🌐" };

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

// ── calendário (dias de aula + cidade da jornada do DF) por turma — cada turma tem o próprio,
// guardado em teachermeta.byTurma[id]. SÓ as 2 turmas originais (matutino/vespertino) caem no
// valor GLOBAL antigo enquanto não tiverem o próprio (era o calendário único de antes de existir
// mais de uma turma — zero migração pra quem só tinha essas 2); qualquer turma criada DEPOIS dessa
// feature sempre começa com calendário vazio, nunca herda a cidade/dias de outra turma ──
export interface TurmaCalendar {
  city: string;
  cityClosed: boolean;
  classDays: string[];
  // 0 (padrão) = sem ritmo definido, código e resumo podem acontecer no mesmo dia, quando o
  // professor quiser. N ≥ 1 = a cada N dias de aula seguidos, o (N+1)-ésimo vira dia de resumo —
  // N=1 é "um dia código, um dia resumo" alternado; N=2 é "dois dias código, um de resumo" etc.
  resumoCadence: number;
}
export interface TeacherMetaLike {
  city?: string | null;
  cityClosed?: boolean | null;
  classDays?: string[] | null;
  byTurma?: Record<string, Partial<TurmaCalendar>> | null;
}
const LEGACY_CALENDAR_TURMA_IDS = ["matutino", "vespertino"];
export function turmaCalendar(m: TeacherMetaLike | null | undefined, turmaId: string): TurmaCalendar {
  const meta = m || {};
  const per = (meta.byTurma || {})[turmaId];
  if (per) return { classDays: per.classDays || [], city: per.city || "", cityClosed: !!per.cityClosed, resumoCadence: per.resumoCadence || 0 };
  if (LEGACY_CALENDAR_TURMA_IDS.includes(turmaId)) {
    return { classDays: meta.classDays || [], city: meta.city || "", cityClosed: !!meta.cityClosed, resumoCadence: 0 };
  }
  return { classDays: [], city: "", cityClosed: false, resumoCadence: 0 };
}
export function withTurmaCalendar<T extends TeacherMetaLike>(m: T, turmaId: string, patch: Partial<TurmaCalendar>): T {
  const cur = turmaCalendar(m, turmaId);
  return { ...m, byTurma: { ...(m.byTurma || {}), [turmaId]: { ...cur, ...patch } } };
}

// ── em que posição (0-based) uma data cairia na sequência de dias de aula JÁ registrados —
// se a data ainda não está em classDays (ex: hoje, antes de qualquer aluno entrar e marcar o dia
// sozinho), conta quantos dias JÁ registrados vêm antes dela, como se ela fosse o próximo da fila.
// Isso deixa o indicador de "hoje é dia de código ou de resumo" certo mesmo antes do 1º aluno logar.
function classDayIndexFor(classDays: string[], dateKey: string): number {
  const sorted = [...new Set(classDays)].sort();
  const exact = sorted.indexOf(dateKey);
  if (exact >= 0) return exact;
  return sorted.filter(d => d < dateKey).length;
}

// se uma data é dia de RESUMO (não de código) dado o ritmo configurado pra turma — ver comentário
// de resumoCadence acima pra entender os números
export function isResumoDay(classDays: string[], resumoCadence: number, dateKey: string): boolean {
  if (!resumoCadence || resumoCadence < 1) return false;
  const idx = classDayIndexFor(classDays, dateKey);
  return (idx + 1) % (resumoCadence + 1) === 0;
}
