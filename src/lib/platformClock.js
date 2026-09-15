export const BRASILIA_TIME_ZONE = "America/Sao_Paulo";

export function parseBrasiliaApiEpoch(data = {}) {
  const unixValue = Number(data.unixTime ?? data.unixtime ?? data.unix_time);
  if (Number.isFinite(unixValue) && unixValue > 0) {
    return unixValue < 1e12 ? unixValue * 1000 : unixValue;
  }

  const raw = String(data.dateTime ?? data.date_time ?? data.datetime ?? "").trim();
  if (!raw) return Number.NaN;

  // A TimeAPI envia a hora local da zona solicitada sem offset. Informar -03:00
  // evita que o navegador interprete o texto no fuso configurado no notebook.
  const normalized = raw.replace(/(\.\d{3})\d+/, "$1");
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  return Date.parse(hasZone ? normalized : `${normalized}-03:00`);
}

export function makeSynchronizedTimeBase(data, requestStartedAt, receivedAt) {
  const apiEpoch = parseBrasiliaApiEpoch(data);
  if (!Number.isFinite(apiEpoch)) return null;

  const roundTrip = Math.max(0, receivedAt - requestStartedAt);
  return {
    epoch: apiEpoch + roundTrip / 2,
    receivedAt,
    source: "api",
  };
}

export function epochAtTick(timeBase, tick) {
  return timeBase ? timeBase.epoch + (tick - timeBase.receivedAt) : tick;
}

export function millisecondsToNextSecond(now = Date.now()) {
  return 1000 - (now % 1000) + 5;
}
