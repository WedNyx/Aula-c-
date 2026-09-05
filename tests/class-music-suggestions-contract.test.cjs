const assert=require('node:assert/strict');const fs=require('node:fs');
const api=fs.readFileSync('api/kv.js','utf8'),storage=fs.readFileSync('src/storage.js','utf8'),player=fs.readFileSync('src/components/ClassMusicPlayer.jsx','utf8'),settings=fs.readFileSync('src/components/ClassMusicSettings.jsx','utf8');
assert.match(api,/case 'submit_music_suggestion'/);assert.match(api,/config\?\.enabled \|\| !config\?\.studentsCanAdd/);assert.match(api,/case 'list_music_suggestions'/);assert.match(api,/case 'resolve_music_suggestion'/);assert.match(api,/list_music_suggestions' \|\| action === 'resolve_music_suggestion'/);
assert.match(storage,/export async function submitMusicSuggestion/);assert.match(storage,/export async function listMusicSuggestions/);assert.match(player,/Sugestão enviada para aprovação do professor/);assert.match(settings,/Aprovar/);assert.match(settings,/Recusar/);
assert.match(api,/pending\.length >= 50/);assert.match(api,/duplicate_suggestion/);assert.match(player,/export function ClassMusicSuggestionForm/);assert.match(settings,/setInterval\(load,10000\)/);
console.log('Sugestões musicais exigem permissão e aprovação do professor.');
