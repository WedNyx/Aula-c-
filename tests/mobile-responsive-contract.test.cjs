// Contrato leve de responsividade: protege os pontos que tornam a plataforma inteira navegável
// no celular mesmo sem depender de screenshot ou de um navegador específico no CI.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src/theme.css"), "utf8");
const codeLab = fs.readFileSync(path.join(root, "src/components/CodeLab.jsx"), "utf8");

let pass = 0, fail = 0;
const check = (name, condition) => {
  if (condition) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}`); }
};

check("painel completo do professor tem navegação própria no celular", app.includes('className="teacher-mobile-tabs"'));
for (const area of ["Monitoramento", "Meu código", "Calendário", "Feedback", "Prova", "Quiz"]) {
  check(`menu móvel mantém acesso a ${area}`, app.includes(`>${area}`) || app.includes(` ${area}`));
}
check("cabeçalho do aluno usa layout móvel", app.includes('className="mobile-app-header" style={styles.header}'));
check("cabeçalho do professor usa layout móvel", app.includes('className="mobile-app-header" style={{ ...styles.header'));
check("editor do aluno pode encolher abaixo da largura fixa de desktop", app.includes('className="code-main-col" style={{ flex:"1 1 560px"'));
check("editor do professor pode encolher no celular", codeLab.includes('className="code-main-col"'));
check("grades de duas colunas têm variante móvel", (app.match(/className="mobile-grid-2"/g) || []).length >= 6);
check("CSS impede rolagem horizontal da página", css.includes("overflow-x: hidden"));
check("campos usam tamanho que evita zoom automático no celular", css.includes('font-size: 16px !important'));
check("modais respeitam a altura dinâmica do celular", css.includes("100dvh"));

console.log(`\n=== CONTRATO DE RESPONSIVIDADE: ${pass}/${pass + fail} passed ===`);
process.exit(fail ? 1 : 0);
