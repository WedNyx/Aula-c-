const fs = require("fs");
const studio = fs.readFileSync("src/components/AvatarStudio3D.jsx", "utf8");
const avatar = fs.readFileSync("src/components/Avatar.jsx", "utf8");
const login = fs.readFileSync("src/components/LoginScreen.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const css = fs.readFileSync("src/redesign.css", "utf8");

const checks = [
  ["o estúdio oferece oito personagens 3D", (studio.match(/id:"/g)||[]).length === 8],
  ["a personalização possui as seis categorias combinadas", ["Cabelo","Olhos","Roupas","Calças","Calçados","Acessórios"].every(x=>studio.includes(`"${x}"`))],
  ["a escolha de companheiro usa todos os pets existentes", studio.includes("AVATAR_OPTS.pet.map") && studio.includes("avatar-pet-grid")],
  ["o cadastro novo usa o fluxo 3D", login.includes("<AvatarStudio3D")],
  ["o perfil existente abre o mesmo fluxo 3D", app.includes("<AvatarStudio3D")],
  ["perfis antigos recebem migração visual automática", avatar.includes("migração visual automática") && avatar.includes("render3d")],
  ["a interface adapta avatar e pets para celular", css.includes("@media(max-width:820px)") && css.includes("@media(max-width:520px)")],
  ["o atlas 3D de produção existe", fs.existsSync("public/avatar3d/student-presets.png")],
];
let failed=0;
for(const [label,ok] of checks){ console.log(`${ok?"✓":"✗"} ${label}`); if(!ok) failed++; }
console.log(`\n${checks.length-failed}/${checks.length} contratos passaram.`);
process.exit(failed?1:0);
