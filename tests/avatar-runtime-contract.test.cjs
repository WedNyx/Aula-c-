const fs = require("fs");
const path = require("path");
const source = fs.readFileSync(path.resolve(__dirname, "..", "src/components/Avatar.jsx"), "utf8");
const imported = /import\s*\{[^}]*\buseRef\b[^}]*\}\s*from\s*["']react["']/.test(source);
console.log(`${imported ? "✓" : "✗"} useRef usado pelo PetCompanion está importado do React`);
process.exitCode = imported ? 0 : 1;
