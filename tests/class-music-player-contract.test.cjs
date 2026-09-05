const assert=require('node:assert/strict');const fs=require('node:fs');
const app=fs.readFileSync('src/App.jsx','utf8'),player=fs.readFileSync('src/components/ClassMusicPlayer.jsx','utf8'),settings=fs.readFileSync('src/components/ClassMusicSettings.jsx','utf8');
assert.match(app,/setClassMusic\(musicForTurma\(m\.musicSettings, shift\)\)/);assert.match(app,/label:"Música da turma"/);assert.match(app,/classMusic\.surface==="student"/);assert.match(app,/<ClassMusicPlayer settings=\{classMusic\}/);
assert.match(player,/<audio/);assert.match(player,/onEnded=\{next\}/);assert.match(player,/normalizeMusicSettings\(settings\)/);assert.match(player,/role="alert"/);assert.match(settings,/settings\.surface==="teacher"/);assert.match(settings,/<ClassMusicPlayer settings=\{settings\} compact/);
console.log('Player respeita liberação, turma e painel escolhido pelo professor.');
