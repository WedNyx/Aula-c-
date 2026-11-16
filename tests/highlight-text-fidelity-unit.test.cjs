const assert = require('node:assert/strict');
const { build } = require('esbuild');

// A camada colorida fica POR BAIXO do textarea transparente: se ela desenhar um caractere a mais
// ou a menos que o texto real, as cores ficam deslocadas do cursor. Este teste garante que o
// realce de C# devolve exatamente o mesmo texto, linha por linha, nos casos que já quebraram.
(async () => {
  const result = await build({
    entryPoints: ['src/lib/highlight.jsx'], bundle: true, write: false,
    platform: 'node', format: 'cjs', jsx: 'automatic',
    plugins: [{ name: 'jsx-stub', setup(b) {
      b.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, args => ({ path: args.path, namespace: 'stub' }));
      b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: `
        export const jsx = (type, props) => ({ type, props }); export const jsxs = jsx; export const Fragment = 'fragment';
      ` }));
    } }],
  });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  const text = node => node == null || node === false ? '' : typeof node !== 'object' ? String(node)
    : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
  const samples = [
    'Console.WriteLine("Olá',                      // string ainda sem fechar
    'Console.WriteLine("Ela disse \\"oi\\"");',    // aspas escapadas
    'string c = @"C:\\pasta\\""x""";',             // string literal com aspas dobradas
    'char letra = \'a\'; char q = \'\\\'\';',      // caracteres
    'var s = $"{nome} tem \\"{idade}\\" anos";',   // interpolada com escapes
    'int x = 1; /* comentário',                    // bloco aberto…
    'continua */ int y = 2; // fim',               // …e fechado na linha seguinte
    'string ação = "não"; d\'água',
    '',
  ];
  const rendered = mod.exports.highlight(samples.join('\n'), [], 'Program.cs');
  assert.equal(rendered.length, samples.length);
  rendered.forEach((line, i) => assert.equal(text(line).replace(/^ $/, ''), samples[i], `linha ${i + 1} mudou na camada colorida`));
  console.log(`${samples.length} linhas de C# com o mesmo texto na camada colorida.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
