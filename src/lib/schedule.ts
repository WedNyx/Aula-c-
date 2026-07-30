export function requestFS(): Promise<void> {
  if (typeof document === "undefined") return Promise.reject(new Error("no-document"));
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
  };
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (!req) return Promise.reject(new Error("unsupported"));
  try {
    const r = req.call(el);
    return (r && typeof (r as Promise<void>).then === "function") ? (r as Promise<void>) : Promise.resolve();
  } catch (e) { return Promise.reject(e); }
}
export const goFullscreen = (): void => { requestFS().catch(() => {}); };
export const todayKey = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
// semana ISO (segunda a domingo) — usada pro desafio livre da semana resetar sozinho toda semana
export const weekKey = (d: Date = new Date()): string => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};
// mesma chave "AAAA-MM-DD", mas a partir de um timestamp qualquer (ex: a data de criação do perfil)
export const dateKeyOf = (ts?: number | null): string => { const d = new Date(ts || Date.now()); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

// ── horário automático de aula: converte "HH:MM" em minutos desde a meia-noite (hora do próprio
// aparelho — o mesmo relógio que já é usado pra saber "que dia é hoje" no resto do sistema) ──
export function hmToMin(hm?: string | null): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || "").trim());
  if (!m) return null;
  return (+m[1]) * 60 + (+m[2]);
}
export function nowMin(): number { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }

export interface ScheduleConfig {
  start?: string | null;
  end?: string | null;
  breakStart?: string | null;
  breakMin?: number | string | null;
}
export interface ClassStatus {
  configured: boolean;
  open: boolean;
  inBreak: boolean;
  warnEnd: boolean;
  isWeekend?: boolean;
  before?: boolean;
  after?: boolean;
  minutesToEnd?: number;
  minutesToBreakEnd?: number | null;
}

// calcula a situação da aula AGORA a partir do horário configurado pro turno — sem horário
// definido (start/end vazios), a aula fica sempre aberta (a trava é 100% opt-in). Fim de semana
// fecha por padrão (a turma só funciona seg-sex) — só abre se o professor liberar explicitamente
export function classStatus(sched: ScheduleConfig | null | undefined, allowWeekend: boolean | undefined): ClassStatus {
  const dow = new Date().getDay(); // 0=domingo, 6=sábado
  if ((dow === 0 || dow === 6) && !allowWeekend) return { configured: true, open: false, inBreak: false, warnEnd: false, isWeekend: true };
  const start = hmToMin(sched?.start), end = hmToMin(sched?.end);
  if (start == null || end == null) return { configured: false, open: true, inBreak: false, warnEnd: false };
  const n = nowMin();
  const bStart = hmToMin(sched?.breakStart);
  const bMin = Number(sched?.breakMin) || 0;
  const bEnd = (bStart != null && bMin > 0) ? bStart + bMin : null;
  const inBreak = bStart != null && bEnd != null && n >= bStart && n < bEnd;
  const before = n < start, after = n >= end;
  const minutesToEnd = end - n;
  return {
    configured: true, open: !before && !after, before, after, inBreak,
    minutesToEnd, minutesToBreakEnd: inBreak ? ((bEnd as number) - n) : null,
    warnEnd: !before && !after && !inBreak && minutesToEnd > 0 && minutesToEnd <= 5,
  };
}
