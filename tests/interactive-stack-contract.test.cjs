const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));

// @rive-app/react-canvas e o componente RivePet.jsx foram removidos: era um reskin do
// companheiro do Nyx nunca importado em lugar nenhum da plataforma (o reskin de verdade, ativo
// desde então, é o NyxPrismaOrbital em SVG+GSAP) — código morto desde a instalação da dependência,
// nunca chegou a ser ligado a nada.
assert.ok(!pkg.dependencies["@rive-app/react-canvas"], "Rive não deve mais estar instalado (nunca foi usado)");
assert.ok(pkg.dependencies.phaser, "Phaser deve estar instalado");
assert.ok(pkg.dependencies.howler, "Howler deve estar instalado");
assert.match(read("src/lib/gameEngine.js"), /default: "matter"/, "Phaser deve usar física Matter integrada");
assert.match(read("src/lib/classroomRealtime.js"), /VITE_SUPABASE_ANON_KEY/, "Realtime deve usar somente a chave anon pública");
assert.doesNotMatch(read("src/lib/classroomRealtime.js"), /SERVICE_ROLE|SERVICE_KEY/, "Frontend não pode referenciar service role");

console.log("✅ Camada interativa: Phaser/Matter + Howler + Supabase Realtime (Rive removido: nunca foi usado)");
