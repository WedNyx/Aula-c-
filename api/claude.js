// Cérebro do Nyx: dois modelos que o aluno/professor escolhe na hora (botões no app),
// mais Anthropic Claude como reserva silenciosa para as outras features do sistema
// (chat, terminal, provas, resumos) que não pedem um modelo específico.
// A resposta é sempre normalizada para o formato { content: [{ text: "..." }] },
// para que o restante do app (App.jsx) não precise saber qual provedor respondeu.

import { rateLimitCheck } from './kv.js'
import { clientIp } from './_ip.js'

const NVIDIA_KEY = process.env.NVIDIA_API_KEY || ''
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || ''
const NVIDIA_BASE_URL = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '')

// Laguna (poolside/laguna-xs-2.1:free) via OpenRouter — mesmo formato OpenAI-compatible.
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'poolside/laguna-xs-2.1:free'

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''

// provedor usado quando ninguém pede um modelo específico (chat do Nyx, terminal, provas, resumos...)
const PROVIDER = NVIDIA_KEY && NVIDIA_MODEL ? 'nvidia' : ANTHROPIC_KEY ? 'anthropic' : null

const DEFAULT_SYSTEM =
  'Você é um robô assistente de programação para alunos iniciantes de C#. Responda sempre em português brasileiro simples e encorajador.'

// Modelos "-ultra-" / "-super-" da Nemotron têm modo de raciocínio (thinking).
// Ativamos e reservamos parte do orçamento de tokens só para o raciocínio,
// garantindo que sobre espaço suficiente para a resposta final.
const NVIDIA_REASONING = /nemotron-3|reasoning|-r1/i.test(NVIDIA_MODEL)

// nenhum dos providers abaixo tinha timeout próprio: se o provedor gratuito simplesmente NÃO
// respondesse (sem erro nenhum, só travado), o fetch ficava pendurado até a Vercel matar a função
// inteira pelo maxDuration (vercel.json) — e aí quem chamou nunca recebia um JSON de erro de
// verdade, só a página de erro da própria plataforma (o "Não consegui falar com o Nyx agora" cru
// que aparecia pro professor). Timeout POR TENTATIVA garante que sempre sobre um JSON de erro
// normal pra responder, com folga pra ainda tentar o próximo provedor da fila dentro do maxDuration.
const DEFAULT_TIMEOUT_MS = 25000

// alguns modelos (principalmente os "de raciocínio") passaram a rejeitar o parâmetro temperature
// ("'temperature' is deprecated for this model") — quando for esse o erro específico, quem chama
// tenta de novo sem esse campo, em vez de deixar a chamada falhar sempre pra esse modelo
function isTemperatureError(e) {
  return !!(e && e.status && /temperature/i.test(e.message || ''))
}

async function callNvidiaRaw({ prompt, system, temperature, max_tokens, reasoning, timeoutMs, skipTemperature }) {
  const finalMaxTokens = Math.min(Number(max_tokens) || 2000, 6000)
  const body = {
    model: NVIDIA_MODEL,
    messages: [
      { role: 'system', content: system || DEFAULT_SYSTEM },
      { role: 'user', content: prompt },
    ],
    top_p: 0.95,
    max_tokens: finalMaxTokens,
    stream: false,
  }
  if (!skipTemperature) body.temperature = typeof temperature === 'number' ? temperature : 0.2
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
    signal: AbortSignal.timeout(timeoutMs || DEFAULT_TIMEOUT_MS),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const msg = data?.error?.message || data?.message || `NVIDIA API error ${resp.status}`
    const err = Object.assign(new Error(msg), { status: resp.status })
    if (!skipTemperature && isTemperatureError(err)) {
      return callNvidiaRaw({ prompt, system, temperature, max_tokens, reasoning, timeoutMs, skipTemperature: true })
    }
    throw err
  }
  // O texto final vem em message.content; message.reasoning_content (se vier)
  // é só o "pensamento" interno do modelo e não deve aparecer para o aluno.
  const text = data?.choices?.[0]?.message?.content || ''
  return { content: [{ type: 'text', text }] }
}

async function callNvidia(args) {
  if (!NVIDIA_REASONING) return callNvidiaRaw({ ...args, reasoning: false })
  try {
    return await callNvidiaRaw({ ...args, reasoning: true })
  } catch (e) {
    // chat_template_kwargs/reasoning_budget não são padrão OpenAI — se a NVIDIA
    // rejeitar esses campos (400/422) para este modelo, tenta de novo sem eles
    // em vez de deixar o Nyx inteiro fora do ar por causa do modo de raciocínio.
    // só retenta nesse caso específico: um timeout (sem status) NÃO deve retentar aqui, senão
    // dobra o tempo perdido esperando um provedor que já não respondeu a primeira vez
    if (e.status !== 400 && e.status !== 422) throw e
    return callNvidiaRaw({ ...args, reasoning: false })
  }
}

async function callOpenRouter({ prompt, system, temperature, max_tokens, timeoutMs, skipTemperature }) {
  const body = {
    model: OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: system || DEFAULT_SYSTEM },
      { role: 'user', content: prompt },
    ],
    max_tokens: Math.min(Number(max_tokens) || 2000, 4000),
  }
  if (!skipTemperature) body.temperature = typeof temperature === 'number' ? temperature : 0.2

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      // recomendado pela OpenRouter para identificar a origem das chamadas (não obrigatório p/ funcionar)
      'HTTP-Referer': 'https://aula-c.vercel.app',
      'X-Title': 'Aula de C# — Nyx',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs || DEFAULT_TIMEOUT_MS),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const msg = data?.error?.message || data?.message || `OpenRouter API error ${resp.status}`
    const err = Object.assign(new Error(msg), { status: resp.status })
    if (!skipTemperature && isTemperatureError(err)) {
      return callOpenRouter({ prompt, system, temperature, max_tokens, timeoutMs, skipTemperature: true })
    }
    throw err
  }
  const text = data?.choices?.[0]?.message?.content || ''
  return { content: [{ type: 'text', text }] }
}

async function callAnthropic({ prompt, system, temperature, max_tokens, timeoutMs }) {
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
    signal: AbortSignal.timeout(timeoutMs || DEFAULT_TIMEOUT_MS),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const msg = data?.error?.message || `Anthropic API error ${resp.status}`
    throw Object.assign(new Error(msg), { status: resp.status })
  }
  return data // já vem no formato { content: [{ text }] }
}

// chamada de um modelo ESPECÍFICO, escolhido na hora pelo aluno/professor (botão Nemotron ou Laguna) —
// aqui não tem troca automática pra outro provedor: se o modelo escolhido não estiver configurado ou
// falhar, o erro sobe direto pra tela, porque a pessoa escolheu ESSE modelo de propósito.
async function callExplicitProvider(provider, args) {
  if (provider === 'laguna') {
    if (!OPENROUTER_KEY) {
      throw Object.assign(new Error('Laguna ainda não está configurado: falta OPENROUTER_API_KEY no Vercel.'), { status: 503, missingKey: true })
    }
    return callOpenRouter(args)
  }
  if (!(NVIDIA_KEY && NVIDIA_MODEL)) {
    throw Object.assign(new Error('Nemotron ainda não está configurado: falta NVIDIA_API_KEY e NVIDIA_MODEL no Vercel.'), { status: 503, missingKey: true })
  }
  return callNvidia(args)
}

export default async function handler(req, res) {
  // GET: verifica se alguma IA está configurada (sem gastar tokens)
  if (req.method === 'GET') {
    return res.json({
      configured: !!PROVIDER || !!OPENROUTER_KEY,
      provider: PROVIDER,
      hasNvidiaKey: !!NVIDIA_KEY,
      hasNvidiaModel: !!NVIDIA_MODEL,
      hasOpenRouter: !!OPENROUTER_KEY,
      hasAnthropic: !!ANTHROPIC_KEY,
    })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // limite de uso: generoso de propósito, porque a carreta inteira costuma compartilhar um único IP
  // (um roteador só pra turma toda) — a ideia é barrar um bug em loop ou abuso, não o uso normal
  const ip = clientIp(req)
  const withinLimit = await rateLimitCheck(`ratelimit:claude:${ip}`, 90, 60)
  if (!withinLimit) {
    return res.status(429).json({ error: 'rate_limited', message: 'Muitos pedidos seguidos pro Nyx desse mesmo lugar. Aguarde um minuto e tente de novo.' })
  }

  const { prompt, system, temperature, max_tokens, provider } = req.body || {}

  // botão Nemotron ou botão Laguna: modelo específico escolhido pela pessoa, sem troca automática
  // (o cliente é quem decide se/quando recorre à Anthropic como último recurso — ver provider === 'anthropic')
  if (provider === 'nvidia' || provider === 'laguna') {
    try {
      const data = await callExplicitProvider(provider, { prompt, system, temperature, max_tokens })
      return res.json(data)
    } catch (e) {
      if (e.missingKey) return res.status(503).json({ error: 'missing_api_key', message: e.message })
      return res.status(e.status || 500).json({ error: String(e.message || e) })
    }
  }

  // último recurso explícito (Sonnet 5): só usado pelo cliente depois que Nemotron E Laguna já
  // falharam de verdade — assim o aluno não fica travado com o Nyx "reconectando" esperando os
  // modelos gratuitos voltarem, mas o gasto pago só entra quando os gratuitos realmente caem juntos
  if (provider === 'anthropic') {
    if (!ANTHROPIC_KEY) {
      return res.status(503).json({ error: 'missing_api_key', message: 'ANTHROPIC_API_KEY ainda não está configurada no Vercel.' })
    }
    try {
      const data = await callAnthropic({ prompt, system, temperature, max_tokens })
      return res.json(data)
    } catch (e) {
      return res.status(e.status || 500).json({ error: String(e.message || e) })
    }
  }

  // sem escolha explícita (chat do Nyx, terminal, provas, resumos...): comportamento automático de sempre
  if (!PROVIDER) {
    const hint = NVIDIA_KEY && !NVIDIA_MODEL
      ? 'NVIDIA_API_KEY está configurada, mas falta NVIDIA_MODEL (copie o nome exato do modelo em build.nvidia.com).'
      : 'Nenhuma IA configurada. Adicione no Vercel (Settings → Environment Variables):\n' +
        '• NVIDIA_API_KEY + NVIDIA_MODEL (build.nvidia.com), ou\n' +
        '• ANTHROPIC_API_KEY (console.anthropic.com)'
    return res.status(503).json({ error: 'missing_api_key', message: hint })
  }

  try {
    // quando existe uma 2ª perna possível (Anthropic de reserva) dentro desta MESMA chamada de
    // função, reserva metade do maxDuration pra cada uma — senão a 1ª tentativa hipoteticamente
    // travada consome o orçamento inteiro (vercel.json) e a reserva nunca chega a rodar
    const hasBackupLeg = PROVIDER === 'nvidia' && !!ANTHROPIC_KEY
    const primaryTimeout = hasBackupLeg ? 14000 : DEFAULT_TIMEOUT_MS
    const data = PROVIDER === 'nvidia'
      ? await callNvidia({ prompt, system, temperature, max_tokens, timeoutMs: primaryTimeout })
      : await callAnthropic({ prompt, system, temperature, max_tokens, timeoutMs: primaryTimeout })
    return res.json(data)
  } catch (e) {
    // se a NVIDIA falhar (chave/modelo com problema, fora do ar, etc.) mas a
    // Anthropic também estiver configurada, usa ela como reserva na hora em
    // vez de deixar o Nyx inteiro fora do ar por causa de um único provedor.
    if (PROVIDER === 'nvidia' && ANTHROPIC_KEY) {
      try {
        const data = await callAnthropic({ prompt, system, temperature, max_tokens, timeoutMs: 14000 })
        return res.json(data)
      } catch (e2) {
        return res.status(e2.status || 500).json({ error: String(e2.message || e2) })
      }
    }
    return res.status(e.status || 500).json({ error: String(e.message || e) })
  }
}
