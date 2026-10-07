const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'src', 'storage.js'), 'utf8');
const kv = fs.readFileSync(path.join(root, 'api', 'kv.js'), 'utf8');

assert.ok(app.includes('data-testid="storage-capacity-monitor"'), 'painel do professor deve mostrar o monitor de capacidade');
assert.ok(app.includes('role="progressbar"'), 'monitor deve ter uma barra acessível');
assert.ok(app.includes('diag.storageHealth?.supabase?.percent'), 'alerta deve considerar o percentual do banco');
assert.ok(app.includes('diagnose(teacherAuth).then(setDiag)'), 'métricas devem ser solicitadas com autenticação do professor');

assert.ok(storage.includes("kvCall({ action: 'storage_health', auth })"), 'cliente deve pedir métricas pela ação protegida');
assert.ok(kv.includes("if (action === 'storage_health') return true"), 'endpoint de métricas deve exigir autenticação');
assert.ok(kv.includes('SUM(pg_database_size(datname))'), 'servidor deve medir o tamanho real do PostgreSQL');
assert.ok(kv.includes("await redis('DBSIZE')"), 'servidor deve verificar a disponibilidade e o número de registros da reserva');
assert.ok(kv.includes('STORAGE_HEALTH_CACHE_MS'), 'consulta de capacidade deve ser limitada por cache');

console.log('✅ monitor de capacidade do banco protegido e ligado ao painel do professor');
