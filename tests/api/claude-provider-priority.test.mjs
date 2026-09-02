import assert from 'node:assert/strict';

// Sem credenciais reais, banco ou chamadas externas.
for (const key of ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'DATABASE_PASSWORD']) process.env[key] = '';
process.env.NVIDIA_API_KEY = 'fake-nvidia';
process.env.NVIDIA_MODEL = 'nvidia/nemotron-test';
process.env.NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
process.env.ANTHROPIC_API_KEY = 'fake-anthropic';
process.env.OPENROUTER_API_KEY = 'fake-openrouter';
const originalFetch = globalThis.fetch;
let calls = [], failNvidia = false;
globalThis.fetch = async (url, options) => {
  const provider = url.includes('nvidia.com') ? 'nvidia' : url.includes('anthropic.com') ? 'anthropic' : url.includes('openrouter.ai') ? 'laguna' : null;
  assert.ok(provider, `Chamada inesperada: ${url}`);
  calls.push(provider);
  if (provider === 'nvidia') {
    assert.equal(JSON.parse(options.body).model, 'nvidia/nemotron-test');
    if (failNvidia) return { ok: false, status: 503, json: async () => ({ error: { message: 'indisponível' } }) };
  }
  return { ok: true, json: async () => provider === 'anthropic' ? { content: [{ text: provider }] } : { choices: [{ message: { content: provider } }] } };
};
function res() { return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
async function request(handler, provider, method = 'POST') {
  calls = [];
  const response = res();
  await handler({ method, body: { prompt: 'Teste fictício', provider }, headers: {}, socket: {} }, response);
  return response;
}
try {
  const { default: handler } = await import('../../api/claude.js?priority');
  assert.equal((await request(handler, undefined, 'GET')).body.provider, 'nvidia');
  assert.equal((await request(handler)).body.content[0].text, 'nvidia');
  assert.deepEqual(calls, ['nvidia']);
  failNvidia = true;
  assert.equal((await request(handler)).body.content[0].text, 'anthropic');
  assert.deepEqual(calls, ['nvidia', 'anthropic']);
  assert.equal((await request(handler, 'nvidia')).code, 503);
  assert.deepEqual(calls, ['nvidia']);
  assert.equal((await request(handler, 'laguna')).body.content[0].text, 'laguna');
  assert.deepEqual(calls, ['laguna']);
  assert.equal((await request(handler, 'anthropic')).body.content[0].text, 'anthropic');
  assert.deepEqual(calls, ['anthropic']);
  process.env.NVIDIA_MODEL = '';
  const { default: withoutModel } = await import('../../api/claude.js?missing-model');
  assert.equal((await request(withoutModel, undefined, 'GET')).body.provider, 'anthropic');
  assert.equal((await request(withoutModel)).body.content[0].text, 'anthropic');
  assert.deepEqual(calls, ['anthropic']);
  process.env.ANTHROPIC_API_KEY = '';
  const { default: unconfigured } = await import('../../api/claude.js?unconfigured');
  assert.equal((await request(unconfigured)).code, 503);
  assert.deepEqual(calls, []);
  console.log('Prioridade NVIDIA, fallback, escolhas explícitas e configuração incompleta: aprovados.');
} finally { globalThis.fetch = originalFetch; }
