const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));

assert.ok(pkg.dependencies["@rive-app/react-canvas"], "Rive deve estar instalado");
assert.ok(pkg.dependencies.phaser, "Phaser deve estar instalado");
assert.ok(pkg.dependencies.howler, "Howler deve estar instalado");
assert.match(read("src/lib/gameEngine.js"), /default: "matter"/, "Phaser deve usar física Matter integrada");
assert.match(read("src/lib/classroomRealtime.js"), /VITE_SUPABASE_ANON_KEY/, "Realtime deve usar somente a chave anon pública");
assert.doesNotMatch(read("src/lib/classroomRealtime.js"), /SERVICE_ROLE|SERVICE_KEY/, "Frontend não pode referenciar service role");
assert.match(read("src/components/RivePet.jsx"), /stateMachineInputs/, "Rive deve aceitar eventos da máquina de estados");

console.log("✅ Camada interativa: Rive + Phaser/Matter + Howler + Supabase Realtime");
