import assert from "node:assert/strict";
import {
  epochAtTick,
  makeSynchronizedTimeBase,
  millisecondsToNextSecond,
  parseBrasiliaApiEpoch,
} from "../src/lib/platformClock.js";

assert.equal(
  parseBrasiliaApiEpoch({ dateTime:"2026-09-15T12:30:45.123456" }),
  Date.parse("2026-09-15T12:30:45.123-03:00"),
  "texto sem offset deve ser interpretado como horário de Brasília",
);
assert.equal(parseBrasiliaApiEpoch({ unixTime:1_800_000_000 }),1_800_000_000_000,"Unix em segundos deve ser aceito");
assert.ok(Number.isNaN(parseBrasiliaApiEpoch({ dateTime:"inválido" })),"resposta inválida deve ativar o relógio local");

const base=makeSynchronizedTimeBase({dateTime:"2026-09-15T12:30:45"},1_000,1_200);
assert.equal(base.epoch,Date.parse("2026-09-15T12:30:45-03:00")+100,"metade da latência deve ser compensada");
assert.equal(epochAtTick(base,2_200),base.epoch+1_000,"tempo decorrido deve usar Date.now sem acumular atraso");
assert.equal(epochAtTick(null,9_000),9_000,"falha da API deve usar o relógio do notebook");
assert.equal(millisecondsToNextSecond(12_250),755,"tick deve alinhar com o próximo segundo");

console.log("✅ relógio pontual: fuso, latência, fallback e alinhamento validados");
