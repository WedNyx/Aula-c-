// Cérebro do Nyx: NVIDIA NIM (Nemotron, se configurado) com fallback para Anthropic Claude.
// A resposta é sempre normalizada para o formato { content: [{ text: "..." }] },
// para que o restante do app (App.jsx) não precise saber qual provedor respondeu.

const NVIDIA_KEY = process.env.NVIDIA_API_KEY || ''
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || ''
const NVIDIA_BASE_URL = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '')
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''

const PROVIDER = NVIDIA_KEY && NVIDIA_MODEL ? 'nvidia' : ANTHROPIC_KEY ? 'anthropic' : null

const DEFAULT_SYSTEM =
  'Você é um robô assistente de programação para alunos iniciantes de C#. Responda sempre em português brasileiro simples e encorajador.'

async function callNvidia({ prompt, system, temperature, max_tokens }) {
  const resp = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NVIDIA_KEY}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: [
        { role: 'system', content: system || DEFAULT_SYSTEM },
        { role: 'user', content: prompt },
      ],
      temperature: typeof temperature === 'number' ? temperature : 0.2,
      max_tokens: Math.min(Number(max_tokens) || 2000, 4000),
    }),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const msg = data?.error?.message || data?.message || `NVIDIA API error ${resp.status}`
    throw Object.assign(new Error(msg), { status: resp.status })
  }
  const text = data?.choices?.[0]?.message?.content || ''
  return { content: [{ type: 'text', text }] }
}

async function callAnthropic({ prompt, system, temperature, max_tokens }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: Math.min(Number(max_tokens) || 2000, 4000),
      temperature: typeof temperature === 'number' ? temperature : 0.2,
      system: system || DEFAULT_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const msg = data?.error?.message || `Anthropic API error ${resp.status}`
    throw Object.assign(new Error(msg), { status: resp.status })
  }
  return data // já vem no formato { content: [{ text }] }
}

export default async function handler(req, res) {
  // GET: verifica se alguma IA está configurada (sem gastar tokens)
  if (req.method === 'GET') {
    return res.json({
      configured: !!PROVIDER,
      provider: PROVIDER,
      hasNvidiaKey: !!NVIDIA_KEY,
      hasNvidiaModel: !!NVIDIA_MODEL,
      hasAnthropic: !!ANTHROPIC_KEY,
    })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!PROVIDER) {
    const hint = NVIDIA_KEY && !NVIDIA_MODEL
      ? 'NVIDIA_API_KEY está configurada, mas falta NVIDIA_MODEL (copie o nome exato do modelo em build.nvidia.com).'
      : 'Nenhuma IA configurada. Adicione no Vercel (Settings → Environment Variables):\n' +
        '• NVIDIA_API_KEY + NVIDIA_MODEL (build.nvidia.com), ou\n' +
        '• ANTHROPIC_API_KEY (console.anthropic.com)'
    return res.status(503).json({ error: 'missing_api_key', message: hint })
  }

  const { prompt, system, temperature, max_tokens } = req.body || {}

  try {
    const data = PROVIDER === 'nvidia'
      ? await callNvidia({ prompt, system, temperature, max_tokens })
      : await callAnthropic({ prompt, system, temperature, max_tokens })
    return res.json(data)
  } catch (e) {
    return res.status(e.status || 500).json({ error: String(e.message || e) })
  }
}
