// Cérebro do Nyx: NVIDIA NIM (Nemotron, se configurado) com fallback para Anthropic Claude.
// A resposta é sempre normalizada para o formato { content: [{ text: "..." }] },
// para que o restante do app (App.jsx) não precise saber qual provedor respondeu.

const NVIDIA_KEY = process.env.NVIDIA_API_KEY || ''
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || ''
// Modelo NVIDIA reserva: usado se o modelo principal falhar (ex: Nemotron fora do ar
// ou rejeitando a chamada). Mesma chave/endpoint, só troca o campo "model". Opcional.
const NVIDIA_MODEL_FALLBACK = process.env.NVIDIA_MODEL_FALLBACK || ''
const NVIDIA_BASE_URL = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '')
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''

const PROVIDER = NVIDIA_KEY && NVIDIA_MODEL ? 'nvidia' : ANTHROPIC_KEY ? 'anthropic' : null

const DEFAULT_SYSTEM =
  'Você é um robô assistente de programação para alunos iniciantes de C#. Responda sempre em português brasileiro simples e encorajador.'

// Modelos "-ultra-" / "-super-" da Nemotron têm modo de raciocínio (thinking).
// Ativamos e reservamos parte do orçamento de tokens só para o raciocínio,
// garantindo que sobre espaço suficiente para a resposta final.
const NVIDIA_REASONING = /nemotron-3|reasoning|-r1/i.test(NVIDIA_MODEL)

async function callNvidiaRaw({ prompt, system, temperature, max_tokens, reasoning, model }) {
  const finalMaxTokens = Math.min(Number(max_tokens) || 2000, 6000)
  const body = {
    model: model || NVIDIA_MODEL,
    messages: [
      { role: 'system', content: system || DEFAULT_SYSTEM },
      { role: 'user', content: prompt },
    ],
    temperature: typeof temperature === 'number' ? temperature : 0.2,
    top_p: 0.95,
    max_tokens: finalMaxTokens,
    stream: false,
  }
  if (reasoning) {
    // Equivalente ao `extra_body` do SDK Python: os campos vão soltos no JSON,
    // não aninhados — é assim que a API da NVIDIA espera recebê-los.
    body.chat_template_kwargs = { enable_thinking: true }
    body.reasoning_budget = Math.max(512, Math.floor(finalMaxTokens * 0.5))
  }

  const resp = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NVIDIA_KEY}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const msg = data?.error?.message || data?.message || `NVIDIA API error ${resp.status}`
    throw Object.assign(new Error(msg), { status: resp.status })
  }
  // O texto final vem em message.content; message.reasoning_content (se vier)
  // é só o "pensamento" interno do modelo e não deve aparecer para o aluno.
  const text = data?.choices?.[0]?.message?.content || ''
  return { content: [{ type: 'text', text }] }
}

async function callNvidiaPrimary(args) {
  if (!NVIDIA_REASONING) return callNvidiaRaw({ ...args, reasoning: false })
  try {
    return await callNvidiaRaw({ ...args, reasoning: true })
  } catch (e) {
    // chat_template_kwargs/reasoning_budget não são padrão OpenAI — se a NVIDIA
    // rejeitar esses campos (400/422) para este modelo, tenta de novo sem eles
    // em vez de deixar o Nyx inteiro fora do ar por causa do modo de raciocínio.
    if (e.status && e.status !== 400 && e.status !== 422) throw e
    return callNvidiaRaw({ ...args, reasoning: false })
  }
}

async function callNvidia(args) {
  try {
    return await callNvidiaPrimary(args)
  } catch (e) {
    // modelo principal (Nemotron) falhou de vez — se houver um modelo reserva
    // configurado na NVIDIA (mesma chave, mesmo endpoint), tenta ele antes de
    // desistir e cair pro Anthropic (se configurado).
    if (!NVIDIA_MODEL_FALLBACK) throw e
    return callNvidiaRaw({ ...args, reasoning: false, model: NVIDIA_MODEL_FALLBACK })
  }
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
      hasNvidiaFallbackModel: !!NVIDIA_MODEL_FALLBACK,
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
    // se a NVIDIA falhar (chave/modelo com problema, fora do ar, etc.) mas a
    // Anthropic também estiver configurada, usa ela como reserva na hora em
    // vez de deixar o Nyx inteiro fora do ar por causa de um único provedor.
    if (PROVIDER === 'nvidia' && ANTHROPIC_KEY) {
      try {
        const data = await callAnthropic({ prompt, system, temperature, max_tokens })
        return res.json(data)
      } catch (e2) {
        return res.status(e2.status || 500).json({ error: String(e2.message || e2) })
      }
    }
    return res.status(e.status || 500).json({ error: String(e.message || e) })
  }
}
