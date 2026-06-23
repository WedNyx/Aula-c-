import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()

    if (!code) {
      return NextResponse.json({ output: '', error: 'Código não fornecido' }, { status: 400 })
    }

    const clientId = process.env.JDOODLE_CLIENT_ID
    const clientSecret = process.env.JDOODLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        output: simulateExecution(code),
        error: null,
        simulated: true,
      })
    }

    const response = await fetch('https://api.jdoodle.com/v1/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: code,
        language: 'csharp',
        versionIndex: '4',
        clientId,
        clientSecret,
      }),
    })

    const data = await response.json()

    return NextResponse.json({
      output: data.output || '',
      error: data.error || null,
      statusCode: data.statusCode,
    })
  } catch {
    return NextResponse.json({ output: '', error: 'Erro ao executar código' }, { status: 500 })
  }
}

function simulateExecution(code: string): string {
  const outputs: string[] = []

  const writelineMatches = code.matchAll(/Console\.WriteLine\s*\(\s*"([^"]*)"\s*\)/g)
  for (const match of writelineMatches) {
    outputs.push(match[1])
  }

  const writeMatches = code.matchAll(/Console\.Write\s*\(\s*"([^"]*)"\s*\)/g)
  for (const match of writeMatches) {
    outputs.push(match[1])
  }

  if (outputs.length === 0) {
    if (code.includes('Console.')) {
      return '[Modo Simulado] Execute com JDoodle API para ver a saída real do programa.\nPara ativar: adicione JDOODLE_CLIENT_ID e JDOODLE_CLIENT_SECRET nas variáveis de ambiente.'
    }
    return '[Modo Simulado] Programa executado sem saída de texto.'
  }

  return outputs.join('\n') + '\n\n[Modo Simulado - Configure JDoodle API para execução real]'
}
