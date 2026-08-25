const fs = require("fs");
const studio = fs.readFileSync("src/components/AvatarStudio3D.jsx", "utf8");
const avatar = fs.readFileSync("src/components/Avatar.jsx", "utf8");
const login = fs.readFileSync("src/components/LoginScreen.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const css = fs.readFileSync("src/redesign.css", "utf8");
const theme = fs.readFileSync("src/theme.css", "utf8");

const checks = [
  ["o estúdio oferece oito personagens 3D", (studio.match(/id:"/g)||[]).length === 8],
  ["cada opção 3D é um preset completo e previsível", studio.includes("Estilos 3D") && studio.includes("personagem completo") && !studio.includes('const categories =')],
  ["a escolha de companheiro usa todos os pets existentes", studio.includes("AVATAR_OPTS.pet.map") && studio.includes("avatar-pet-grid")],
  ["os dezesseis companheiros usam artes 3D próprias", ["dragao","unicornio","trex","aguia","coruja","lobo","raposa","gato","cachorro","coelho","leao","tartaruga","abelha","borboleta","vagalume","cogumelo"].every(id=>fs.existsSync(`public/pets/${id}.webp`)) && avatar.includes('"✨":"vagalume"')],
  ["os pets possuem ambiente, clique, conclusão e especial", ["pet-action-idle","pet-action-click","pet-action-complete","pet-action-special"].every(state=>theme.includes(state)) && avatar.includes('onDoubleClick=')],
  ["as animações respeitam movimento reduzido", theme.includes("prefers-reduced-motion: reduce") && theme.includes(".pet-companion-corner .pet-companion-button")],
  ["o cadastro novo usa o fluxo 3D", login.includes("<AvatarStudio3D")],
  ["o perfil existente abre o mesmo fluxo 3D", app.includes("<AvatarStudio3D")],
  ["perfis antigos preservam o avatar atual até escolherem o 3D", avatar.includes("render3d:null") && !avatar.includes("migração visual automática")],
  ["a interface adapta avatar e pets para celular", css.includes("@media(max-width:820px)") && css.includes("@media(max-width:520px)")],
  ["cada personagem possui arquivo próprio, sem recorte por CSS", ["violet-cargo","cosmic","teal","varsity","overalls","future","orange","street"].every(id=>fs.existsSync(`public/avatar3d/presets/${id}.webp`)) && studio.includes('/avatar3d/presets/${p.id}.webp')],
];
let failed=0;
for(const [label,ok] of checks){ console.log(`${ok?"✓":"✗"} ${label}`); if(!ok) failed++; }
console.log(`\n${checks.length-failed}/${checks.length} contratos passaram.`);
process.exit(failed?1:0);
