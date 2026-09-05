const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('src/App.jsx', 'utf8');
const studio = fs.readFileSync('src/components/AvatarStudio3D.jsx', 'utf8');

test('avatar só substitui o perfil depois da persistência confirmar sucesso', () => {
  const handler = app.slice(app.indexOf('const saveAvatarProfile'), app.indexOf('// 📶 resiliência'));
  assert.match(handler, /const ok = await persist\(\{ avatar: nextAvatar \}\)/);
  assert.ok(handler.indexOf('if (!ok)') < handler.indexOf('setAvatar(nextAvatar)'));
  assert.match(handler, /setAvatarSaveError\("Não foi possível salvar agora/);
});

test('editor informa e bloqueia novo salvamento enquanto aguarda', () => {
  assert.match(studio, /saving=false, saveError=""/);
  assert.match(studio, /disabled=\{saving\}/);
  assert.match(studio, /aria-busy=\{saving\}/);
  assert.match(studio, /className="avatar-save-error" role="alert"/);
});
