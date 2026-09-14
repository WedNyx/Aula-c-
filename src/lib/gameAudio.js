import { Howl, Howler } from "howler";

const sounds = new Map();

export function registerGameSound(id, options) {
  if (!id || !options?.src) throw new Error("Som precisa de id e src.");
  sounds.get(id)?.unload();
  const sound = new Howl({ preload: true, html5: false, ...options });
  sounds.set(id, sound);
  return sound;
}

export function playGameSound(id, sprite) {
  const sound = sounds.get(id);
  return sound ? sound.play(sprite) : null;
}

export function stopGameSound(id) {
  sounds.get(id)?.stop();
}

export function setGameAudioMuted(muted) {
  Howler.mute(Boolean(muted));
}

export function setGameAudioVolume(volume) {
  Howler.volume(Math.max(0, Math.min(1, Number(volume) || 0)));
}

export function disposeGameAudio() {
  for (const sound of sounds.values()) sound.unload();
  sounds.clear();
}
