const assert=require('node:assert/strict');const fs=require('node:fs');
const app=fs.readFileSync('src/App.jsx','utf8'),learning=fs.readFileSync('src/components/LearningModals.jsx','utf8');
assert.doesNotMatch(app,/from "\.\/components\/GameModals\.jsx"/);assert.doesNotMatch(app,/from "\.\/components\/LearningModals\.jsx"/);assert.match(app,/const lazyLearningModal/);assert.match(app,/const lazyGameModal/);assert.match(app,/const LunarSanctuary=lazy/);assert.match(app,/<Suspense fallback=\{<ModalLoading\/>\}><BossStudyModal/);assert.match(learning,/from "\.\.\/lib\/checkinMoods\.js"/);
console.log('Jogos e painéis de aprendizagem do aluno são carregados apenas quando abertos.');
