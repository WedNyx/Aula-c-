// ── rede de segurança local: guarda o código do aluno no navegador (sem depender de internet),
// pra não perder o que ele estava escrevendo se a conexão cair bem na hora de salvar no servidor ──
export function codeBackupKey(shift, name) { return `nyx_codebackup:${shift||"sem-turno"}:${String(name||"").trim().replace(/\s+/g,"_")}`; }
export function saveCodeBackupLocal(shift, name, files) { try { localStorage.setItem(codeBackupKey(shift, name), JSON.stringify({ files, at: Date.now() })); } catch {} }
export function loadCodeBackupLocal(shift, name) { try { const raw = localStorage.getItem(codeBackupKey(shift, name)); return raw ? JSON.parse(raw) : null; } catch { return null; } }
