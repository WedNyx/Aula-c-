export default async function handler(req, res) {
  // GET: verifica se a chave está configurada (sem gastar tokens)
  if (req.method === 'GET') {
    return res.json({ configured: !!process.env.ANTHROPIC_API_KEY })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'missing_api_key',
      message:
        'ANTHROPIC_API_KEY não configurada. Acesse console.anthropic.com, crie uma chave de API ' +
        'e adicione como variável de ambiente no painel do Vercel (Settings → Environment Variables).',
    })
  }

  const { prompt, system } = req.body || {}

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system:
          system ||
          'Você é um robô assistente de programação para alunos iniciantes de C#. Responda sempre em português brasileiro simples e encorajador.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      const msg = data?.error?.message || `Anthropic API error ${response.status}`
      return res.status(response.status).json({ error: msg })
    }
    return res.json(data)
  } catch (e) {
    return res.status(500).json({ error: String(e.message) })
  }
}
