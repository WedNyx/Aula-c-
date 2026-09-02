const fs = require("fs");
const studio = fs.readFileSync("src/components/AvatarStudio3D.jsx", "utf8");
const avatar = fs.readFileSync("src/components/Avatar.jsx", "utf8");
const login = fs.readFileSync("src/components/LoginScreen.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const css = fs.readFileSync("src/redesign.css", "utf8");
const theme = fs.readFileSync("src/theme.css", "utf8");

const checks = [
  ["o estúdio oferece dezesseis personagens 2.5D", studio.includes("length:8") && studio.includes("masculino-") && studio.includes("feminino-")],
  ["o seletor separa avatares masculinos e femininos", studio.includes("Masculinos") && studio.includes("Femininos") && studio.includes("avatar-group-tabs")],
  ["cada opção 2.5D é um preset completo e previsível", studio.includes("Avatares 2.5D") && studio.includes("aparência completa") && !studio.includes('const categories =')],
  ["a escolha de companheiro usa todos os pets existentes", studio.includes("AVATAR_OPTS.pet.map") && studio.includes("avatar-pet-grid")],
  ["os dezesseis companheiros usam artes 3D próprias", ["dragao","unicornio","trex","aguia","coruja","lobo","raposa","gato","cachorro","coelho","leao","tartaruga","abelha","borboleta","vagalume","cogumelo"].every(id=>fs.existsSync(`public/pets/${id}.webp`)) && avatar.includes('"✨":"vagalume"')],
  ["os pets possuem ambiente, clique, conclusão e especial", ["pet-action-idle","pet-action-click","pet-action-complete","pet-action-special"].every(state=>theme.includes(state)) && avatar.includes('onDoubleClick=')],
  ["as animações respeitam movimento reduzido", theme.includes("prefers-reduced-motion: reduce") && theme.includes(".pet-companion-corner .pet-companion-button")],
  ["o cadastro novo usa o fluxo 3D", login.includes("<AvatarStudio3D")],
  ["o perfil existente abre o mesmo fluxo 3D", app.includes("<AvatarStudio3D")],
  ["perfis antigos preservam o avatar atual até escolherem o 3D", avatar.includes("render3d:null") && !avatar.includes("migração visual automática")],
  ["a interface adapta avatar e pets para celular", css.includes("@media(max-width:820px)") && css.includes("@media(max-width:520px)")],
  ["cada personagem possui arquivo 2.5D próprio e válido", ["masculino","feminino"].every(group=>Array.from({length:8},(_,i)=>`public/avatar25d/presets/${group}-${String(i+1).padStart(2,"0")}.webp`).every(file=>fs.existsSync(file) && fs.statSync(file).size>0)) && studio.includes('avatarPresetSrc(id)')],
  ["perfis com presets anteriores continuam compatíveis", avatar.includes('isAvatar25D(id) ? "avatar25d" : "avatar3d"') && studio.includes("avatarPresetSrc")],
  ["a edição usa rascunho e salva exatamente o avatar confirmado", app.includes("avatarDraft || avatar") && app.includes("onChange={setAvatarDraft}") && app.includes("stateRef.current={...stateRef.current,avatar:nextAvatar}") && app.includes("persist({ avatar:nextAvatar })")],
];
let failed=0;
for(const [label,ok] of checks){ console.log(`${ok?"✓":"✗"} ${label}`); if(!ok) failed++; }
console.log(`\n${checks.length-failed}/${checks.length} contratos passaram.`);
process.exit(failed?1:0);
