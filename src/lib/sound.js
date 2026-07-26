import confetti from "canvas-confetti";

// ── efeitos sonoros (Web Audio, sem arquivos externos) ──
let __audioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!__audioCtx) __audioCtx = new Ctor();
  return __audioCtx;
}
let soundsMuted = false;
function playTone(ctx, freq, start, dur, type = "sine", gain = 0.09) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = 0;
  osc.connect(g); g.connect(ctx.destination);
  osc.start(start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.stop(start + dur + 0.02);
}
// modo calmo (apoio sensorial): silencia tudo sem mexer na preferência de som salva do aluno
let soundsCalm = false;
export function setSoundsCalm(v) { soundsCalm = v; }
export function playSound(kind) {
  if (soundsMuted || soundsCalm) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  try {
    if (kind === "correct") { playTone(ctx, 880, t, 0.12); playTone(ctx, 1318.5, t + 0.09, 0.14); }
    else if (kind === "wrong") { playTone(ctx, 220, t, 0.18, "triangle", 0.07); }
    else if (kind === "combo") { [660, 880, 1108.7, 1318.5].forEach((f, i) => playTone(ctx, f, t + i * 0.08, 0.16, "triangle")); }
    else if (kind === "achievement") { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(ctx, f, t + i * 0.1, 0.22, "sine", 0.1)); }
    else if (kind === "levelup") { [392, 523.25, 659.25].forEach((f, i) => playTone(ctx, f, t + i * 0.1, 0.2, "sine", 0.1)); }
    else if (kind === "click") { playTone(ctx, 740, t, 0.06, "sine", 0.05); }
    else if (kind === "enter") { [440, 660].forEach((f, i) => playTone(ctx, f, t + i * 0.09, 0.16, "sine", 0.07)); }
    else if (kind === "bell") { [987.77, 1318.5, 987.77].forEach((f, i) => playTone(ctx, f, t + i * 0.22, 0.5, "sine", 0.12)); }
    else if (kind === "recesso") { [880, 698.46, 587.33].forEach((f, i) => playTone(ctx, f, t + i * 0.2, 0.45, "sine", 0.11)); }
    else if (kind === "snap") { playTone(ctx, 660, t, 0.05, "sine", 0.06); playTone(ctx, 440, t + 0.04, 0.09, "sine", 0.05); }
  } catch {}
}
export function setSoundsMuted(v) { soundsMuted = v; try { localStorage.setItem("nyx_sounds_muted", v ? "1" : "0"); } catch {} }
export function loadSoundsMuted() { try { soundsMuted = localStorage.getItem("nyx_sounds_muted") === "1"; } catch {} return soundsMuted; }

// ── confete (canvas-confetti) pra momentos de comemoração: fim de atividade e conquista desbloqueada ──
export const CONFETTI_COLORS = ["#c084fc","#22d3ee","#34d399","#fbbf24","#ec4899","#f87171"];
export function fireConfetti(kind = "activity") {
  if (soundsCalm) return; // modo calmo: sem estímulo visual extra
  try {
    if (kind === "achievement") {
      confetti({ particleCount: 60, spread: 65, startVelocity: 32, origin: { x: 0.86, y: 0.12 }, colors: CONFETTI_COLORS, scalar: 0.85, ticks: 160 });
    } else {
      confetti({ particleCount: 110, spread: 80, startVelocity: 42, origin: { y: 0.65 }, colors: CONFETTI_COLORS, ticks: 220 });
      setTimeout(() => confetti({ particleCount: 60, spread: 100, startVelocity: 30, origin: { y: 0.65 }, colors: CONFETTI_COLORS, ticks: 200 }), 220);
    }
  } catch {}
}
