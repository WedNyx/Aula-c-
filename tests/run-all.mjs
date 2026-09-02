// Orquestra a suíte inteira: builda o app, sobe o `vite preview`, roda todos os testes de
// navegador (tests/*.test.cjs) e os testes diretos de API (tests/api/*.test.mjs), e derruba
// o servidor no final. Usado tanto localmente (`npm test`) quanto no CI.
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });
  if (r.status !== 0) { console.error(`❌ comando falhou: ${cmd} ${args.join(' ')}`); process.exit(r.status ?? 1); }
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const r = await fetch(url); if (r.ok || r.status < 500) return true; } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

function runTestFile(file) {
  return new Promise((resolve) => {
    const p = spawn('node', [file], { stdio: 'inherit', cwd: ROOT, env: { ...process.env, TEST_BASE_URL: BASE_URL } });
    p.on('error', (error) => { console.error(error.message); resolve(false); });
    p.on('exit', (code) => resolve(code === 0));
  });
}

(async () => {
  console.log('📦 Buildando o app...');
  run('npm', ['run', 'build']);

  console.log('🚀 Subindo o vite preview...');
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
  const ready = await waitForServer(BASE_URL + '/');
  if (!ready) {
    console.error('❌ O servidor de preview não subiu a tempo.');
    try { process.kill(-preview.pid); } catch {}
    process.exit(1);
  }
  console.log('✅ Preview no ar em', BASE_URL);

  const browserTests = readdirSync(__dirname).filter(f => f.endsWith('.test.cjs')).map(f => path.join(__dirname, f)).sort();
  const apiDir = path.join(__dirname, 'api');
  const apiTests = readdirSync(apiDir).filter(f => f.endsWith('.test.mjs')).map(f => path.join(apiDir, f)).sort();

  const allTests = [...browserTests, ...apiTests];
  const outcomes = [];
  for (const file of allTests) {
    console.log(`\n────────────────────────────────────────────────`);
    console.log(`▶ ${path.relative(ROOT, file)}`);
    console.log(`────────────────────────────────────────────────`);
    const ok = await runTestFile(file);
    outcomes.push({ file: path.relative(ROOT, file), ok });
  }

  try { process.kill(-preview.pid); } catch {}

  console.log(`\n════════════════════════════════════════════════`);
  console.log('RESUMO DA SUÍTE:');
  for (const o of outcomes) console.log(`  ${o.ok ? '✅' : '❌'} ${o.file}`);
  const failed = outcomes.filter(o => !o.ok);
  console.log(`\n${outcomes.length - failed.length}/${outcomes.length} arquivos de teste passaram.`);
  process.exit(failed.length ? 1 : 0);
})();
