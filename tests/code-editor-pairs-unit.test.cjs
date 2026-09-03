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
  function press(value, start, key, end = start) {
    let next = value, prevented = false;
    const ta = findTextarea(mod.exports.VSEditor({ value, onChange: v => { next = v; } }));
    const dom = { value, selectionStart: start, selectionEnd: end, setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; } };
    ta.props.ref.current = dom;
    ta.props.onKeyDown({ key, preventDefault() { prevented = true; } });
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
  console.log('8 testes de comportamento: pares, Backspace, aspas, seleção, Enter e Tab aprovados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
