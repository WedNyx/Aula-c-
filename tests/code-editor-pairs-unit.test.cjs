const assert = require('node:assert/strict');
const { build } = require('esbuild');

// Executa o handler real com hooks mínimos, sem DOM ou acesso à plataforma.
(async () => {
  const result = await build({
    entryPoints: ['src/components/CodeEditor.jsx'], bundle: true, write: false,
    platform: 'node', format: 'cjs', jsx: 'automatic',
    plugins: [{ name: 'react-test-hooks', setup(b) {
      b.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, args => ({ path: args.path, namespace: 'test-hooks' }));
      b.onLoad({ filter: /.*/, namespace: 'test-hooks' }, () => ({ contents: `
        export const useRef = current => ({current});
        export const useState = value => [value, () => {}];
        export const useEffect = () => {};
        export const useLayoutEffect = () => {};
        export const jsx = (type, props) => ({type, props});
        export const jsxs = jsx; export const Fragment = 'fragment';
      ` }));
    } }],
  });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  function findTextarea(node) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'textarea') return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const found = findTextarea(child); if (found) return found;
    }
    return null;
  }
  function press(value, start, key, end = start, extra = {}) {
    let next = value, prevented = false;
    const ta = findTextarea(mod.exports.VSEditor({ value, onChange: v => { next = v; } }));
    const dom = { value, selectionStart: start, selectionEnd: end, setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; } };
    ta.props.ref.current = dom;
    ta.props.onKeyDown({ key, ...extra, preventDefault() { prevented = true; } });
    return { next, prevented, cursor: dom.selectionStart };
  }
  assert.equal(press('', 0, '(').next, '()');
  assert.equal(press('()', 1, 'Backspace').next, '');
  assert.deepEqual(press('()', 1, ')'), { next: '()', prevented: true, cursor: 2 });
  assert.equal(press('""', 1, '"').next, '""');
  assert.equal(press('abc', 0, '(', 3).next, '(abc)');
  assert.equal(press('{}', 1, 'Enter').next, '{\n    \n}');
  assert.equal(press('', 0, 'Tab').next, '    ');
  assert.equal(press('(x)', 2, 'Backspace').prevented, false);
  // Shift+Tab desindenta (antes indentava), na linha atual e em várias linhas selecionadas
  assert.equal(press('    x', 5, 'Tab', 5, { shiftKey: true }).next, 'x');
  assert.equal(press('    a\n    b', 0, 'Tab', 11, { shiftKey: true }).next, 'a\nb');
  assert.equal(press('a\nb', 0, 'Tab', 3).next, '    a\n    b');
  // "}" numa linha só com espaços volta 4 espaços, alinhando com quem abriu o bloco
  assert.equal(press('{\n    ', 6, '}').next, '{\n}');
  // não fecha par colado antes de uma palavra, nem apóstrofo no meio de palavra
  assert.equal(press('x', 0, '(').prevented, false);
  assert.equal(press('d', 1, "'").prevented, false);
  // $" e @" do C# continuam fechando as aspas
  assert.equal(press('$', 1, '"').next, '$""');
  assert.equal(press('@', 1, '"').next, '@""');
  // Enter entre parênteses abre o bloco igual às chaves
  assert.equal(press('f()', 2, 'Enter').next, 'f(\n    \n)');
  console.log('18 testes de comportamento: pares, Backspace, aspas, seleção, Enter, Tab, Shift+Tab e } aprovados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
