const assert = require('node:assert/strict');
const { build } = require('esbuild');

(async () => {
  const output = await build({ entryPoints:['src/lib/classLinks.js'], bundle:true, write:false, platform:'node', format:'cjs' });
  const mod = { exports:{} };
  new Function('module','exports','require',output.outputFiles[0].text)(mod,mod.exports,require);
  const { normalizeClassLinkUrl, classLinksFor, addClassLink, removeClassLink, MAX_CLASS_LINKS } = mod.exports;

  assert.equal(normalizeClassLinkUrl('javascript:alert(1)'), null);
  assert.equal(normalizeClassLinkUrl('http://exemplo.com'), null);
  assert.equal(normalizeClassLinkUrl('https://exemplo.com/a'), 'https://exemplo.com/a');
  assert.equal(normalizeClassLinkUrl('https://usuario:senha@exemplo.com/'), 'https://exemplo.com/');

  const first = addClassLink({}, 'matutino', { title:'Documentação', url:'https://learn.microsoft.com/' });
  assert.equal(first.ok, true);
  assert.equal(classLinksFor(first.links, 'vespertino').length, 0);
  assert.equal(addClassLink(first.links, 'matutino', { title:'Repetido', url:'https://learn.microsoft.com/' }).ok, false);
  assert.equal(removeClassLink(first.links, 'matutino', first.link.id).matutino.length, 0);

  let links = {};
  for (let i=0; i<MAX_CLASS_LINKS; i++) links = addClassLink(links, 'teste', { title:`Site ${i}`, url:`https://exemplo.com/${i}` }).links;
  assert.equal(addClassLink(links, 'teste', { title:'Site extra', url:'https://exemplo.com/extra' }).ok, false);

  console.log('Links externos são HTTPS, sem credenciais, sem duplicatas e separados por turma.');
})().catch(error => { console.error(error); process.exitCode=1; });
