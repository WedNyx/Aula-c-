// ── rede de segurança local: guarda o código do aluno no navegador (sem depender de internet),
// pra não perder o que ele estava escrevendo se a conexão cair bem na hora de salvar no servidor ──
export interface CodeFile {
  name: string;
  code: string;
}
export interface CodeBackup {
  files: CodeFile[];
  at: number;
}

export function codeBackupKey(shift?: string | null, name?: string | null): string {
  return `nyx_codebackup:${shift || "sem-turno"}:${String(name || "").trim().replace(/\s+/g, "_")}`;
}
export function saveCodeBackupLocal(shift: string | null | undefined, name: string | null | undefined, files: CodeFile[]): void {
  try { localStorage.setItem(codeBackupKey(shift, name), JSON.stringify({ files, at: Date.now() })); } catch {}
}
export function loadCodeBackupLocal(shift: string | null | undefined, name: string | null | undefined): CodeBackup | null {
  try {
    const raw = localStorage.getItem(codeBackupKey(shift, name));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
