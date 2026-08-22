const fs=require("fs");
const read=p=>fs.readFileSync(p,"utf8");
const app=read("src/App.jsx"), achievements=read("src/lib/achievements.ts"), items=read("src/components/NyxRobot.jsx"), shop=read("src/components/NyxShop.jsx"), editor=read("src/components/TeacherSummaryEditor.jsx"), tour=read("src/components/TourOverlay.jsx");
const checks=[
 ["conquistas de comandos do terminal foram removidas",!["segredo-vaca","segredo-danca","segredo-matrix","segredo-piada"].some(x=>achievements.includes(`id:\"${x}\"`))],
 ["chapéu pirata virou item comprável",/id:\"chapeuPirata\"[^\n]+cost:22/.test(items)&&!items.includes('id:"chapeuPirata", label:"Chapéu Pirata", emoji:"🏴‍☠️", slot:"head", cost:0')],
 ["Easter Egg pirata exige três peças",["chapeuPirata","vendaPirata","espada"].every(x=>shop.includes(x))&&shop.includes("isPirateSet")],
 ["teste de conhecimento usa apenas resumos estudados",app.includes('questionContext={[JSON.stringify(dynamicSummary||{}), JSON.stringify(summaryHistory||{})]')],
 ["professor pode escrever resumo estruturado",editor.includes("Introdução")&&editor.includes("Seções")&&editor.includes("Atividade opcional")],
 ["atividade manual acompanha o resumo",app.includes("hasBroadcastActivity")&&app.includes("broadcastResumo.atividade")],
 ["central, perfil e missões existem",["showStudentNotifications","showStudentProfile","showDailyMissions"].every(x=>app.includes(x))],
 ["tour acompanha os novos recursos",["perfil-jornada","novidades","missoes","repetir-tour","pet"].every(x=>tour.includes(x))],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?"✓":"✗"} ${name}`);if(!ok)failed++;}console.log(`\n${checks.length-failed}/${checks.length} contratos passaram.`);process.exitCode=failed?1:0;
