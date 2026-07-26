import { useState, useRef, useCallback } from "react";

// ── text-to-speech (Web Speech API) ──
// vozes pt disponíveis no aparelho (pro seletor de voz)
export function listPtVoices() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const pt = voices.filter(v => /pt[-_]BR/i.test(v.lang));
  return pt.length ? pt : voices.filter(v => /^pt/i.test(v.lang));
}
// escolhe a voz pt-BR menos robótica disponível no aparelho: as vozes "Natural/Online"
// (Edge) são redes neurais quase humanas — bem melhores que a padrão e que a do Google.
// Se o aluno escolheu uma voz no seletor (🗣️), essa escolha vence.
let cachedVoice = null;
export function bestPtVoice() {
  try {
    const savedName = localStorage.getItem("nyx_voice_name");
    if (savedName) {
      const saved = listPtVoices().find(v => v.name === savedName);
      if (saved) return saved;
    }
  } catch {}
  if (cachedVoice) return cachedVoice;
  const anyPt = listPtVoices();
  const byPref = [
    v => /natural|neural|online/i.test(v.name),                  // vozes neurais (Edge/Windows 11)
    v => /luciana|francisca|thalita|camila|maria/i.test(v.name), // vozes femininas suaves comuns
    v => /google/i.test(v.name),                                 // voz do Google (última opção — robótica)
  ];
  for (const pref of byPref) {
    const found = anyPt.find(pref);
    if (found) { cachedVoice = found; return found; }
  }
  cachedVoice = anyPt[0] || null;
  return cachedVoice;
}
// a lista de vozes carrega de forma assíncrona — quando chegar, refaz a escolha
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = null; bestPtVoice(); };
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(() => !!window.speechSynthesis);
  const utteranceRef = useRef(null);

  const speak = useCallback((text) => {
    if (!isSupported || !text) return;
    window.speechSynthesis.cancel();
    // fala frase por frase: textos longos não são cortados pelo navegador
    // e as pausas naturais entre frases deixam a leitura menos corrida
    const chunks = String(text).match(/[^.!?…\n]+[.!?…]*/g)?.map(s => s.trim()).filter(Boolean) || [String(text)];
    const voice = bestPtVoice();
    chunks.forEach((chunk, i) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = "pt-BR";
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;   // um tiquinho mais devagar: soa calmo, não arrastado
      utterance.pitch = 1.05;  // levemente mais agudo: tira o tom "grave de robô"
      utterance.volume = 1.0;
      if (i === 0) utterance.onstart = () => setIsSpeaking(true);
      if (i === chunks.length - 1) {
        utterance.onend = () => setIsSpeaking(false);
      }
      utterance.onerror = () => setIsSpeaking(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported) window.speechSynthesis.pause();
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported) window.speechSynthesis.resume();
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, pause, resume, stop, isSpeaking, isSupported };
}
