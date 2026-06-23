export interface CodeError {
  line: number
  message: string
  fix: string
  type: 'error' | 'warning'
}

export interface AnalysisResult {
  isValid: boolean
  errors: CodeError[]
  warnings: CodeError[]
  feedback: string
  robotMessage: string
  concepts: string[]
}

const DF_CITIES = [
  'Águas Claras', 'Brazlândia', 'Candangolândia', 'Ceilândia', 'Cruzeiro',
  'Fercal', 'Gama', 'Guará', 'Itapoã', 'Jardim Botânico', 'Lago Norte',
  'Lago Sul', 'Núcleo Bandeirante', 'Paranóa', 'Park Way', 'Planaltina',
  'Plano Piloto (Brasília)', 'Recanto das Emas', 'Riacho Fundo', 'Riacho Fundo II',
  'Samambaia', 'Santa Maria', 'São Sebastião', 'SCIA/Estrutural', 'SIA',
  'Sobradinho', 'Sobradinho II', 'Sol Nascente/Pôr do Sol', 'Sudoeste/Octogonal',
  'Taguatinga', 'Varjão', 'Vicente Pires',
]

export { DF_CITIES }

function detectConcepts(code: string): string[] {
  const concepts: string[] = []
  if (/Console\.WriteLine|Console\.Write/.test(code)) concepts.push('Saída de dados (Console.WriteLine)')
  if (/Console\.ReadLine|Console\.Read/.test(code)) concepts.push('Entrada de dados (Console.ReadLine)')
  if (/int\s+\w+\s*=|double\s+\w+\s*=|string\s+\w+\s*=|bool\s+\w+\s*=/.test(code)) concepts.push('Declaração de variáveis')
  if (/if\s*\(/.test(code)) concepts.push('Estrutura condicional (if/else)')
  if (/for\s*\(/.test(code)) concepts.push('Laço de repetição (for)')
  if (/while\s*\(/.test(code)) concepts.push('Laço de repetição (while)')
  if (/foreach\s*\(/.test(code)) concepts.push('Laço foreach')
  if (/void\s+\w+\s*\(/.test(code) && !/void\s+Main/.test(code)) concepts.push('Métodos/Funções')
  if (/class\s+\w+/.test(code) && code.split('class').length > 2) concepts.push('Criação de classes')
  if (/new\s+\w+/.test(code)) concepts.push('Instanciação de objetos')
  if (/int\[\]|string\[\]|double\[\]/.test(code)) concepts.push('Arrays')
  if (/List<|Dictionary</.test(code)) concepts.push('Coleções (List/Dictionary)')
  if (/try\s*\{/.test(code)) concepts.push('Tratamento de exceções (try/catch)')
  if (/\+\+|--|[+\-*\/]=/.test(code)) concepts.push('Operadores aritméticos')
  if (/Convert\.|int\.Parse|double\.Parse/.test(code)) concepts.push('Conversão de tipos')
  return concepts
}

function generateSummary(code: string, concepts: string[]): string {
  if (!code.trim() || code.trim() === '// Novo arquivo C#') return ''

  const hasInput = /ReadLine|Console\.Read/.test(code)
  const hasOutput = /WriteLine|Console\.Write/.test(code)

  let summary = '## Resumo da Aula\n\n'
  summary += `Nesta aula, você escreveu um programa em C# que `

  const actions = []
  if (hasOutput) actions.push('exibe informações na tela')
  if (hasInput) actions.push('recebe dados do usuário')
  if (/for\s*\(/.test(code)) actions.push('usa repetição (for)')
  if (/if\s*\(/.test(code)) actions.push('toma decisões com if/else')
  if (/void\s+\w+\s*\(/.test(code) && !/void\s+Main/.test(code)) actions.push('cria funções próprias')

  summary += actions.length > 0 ? actions.join(', ') + '.' : 'usa conceitos básicos de C#.'
  summary += '\n\n'

  if (concepts.length > 0) {
    summary += '### Conceitos Utilizados:\n'
    concepts.forEach(c => { summary += `- **${c}**\n` })
    summary += '\n'
  }

  summary += '### Como o Código Funciona:\n'
  summary += 'Seu programa em C# segue esta estrutura:\n\n'
  summary += '1. **`using System;`** — importa a biblioteca principal do C#, que permite usar `Console.WriteLine`\n'
  summary += '2. **`class Program`** — define a classe principal do programa\n'
  summary += '3. **`static void Main(string[] args)`** — é o ponto de entrada do programa, onde tudo começa\n'

  if (hasOutput) {
    summary += '4. **`Console.WriteLine()`** — exibe texto no terminal/console\n'
  }
  if (hasInput) {
    summary += '5. **`Console.ReadLine()`** — lê o que o usuário digitar no teclado\n'
  }

  return summary
}

function generateQuestions(): Array<{id: string, text: string, options: string[], correctIndex: number}> {
  const allQuestions = [
    {
      text: 'Qual é o comando usado para exibir texto no console em C#?',
      options: ['print()', 'Console.WriteLine()', 'echo()', 'System.out.println()'],
      correctIndex: 1,
    },
    {
      text: 'O que significa "static void Main(string[] args)"?',
      options: [
        'É uma variável especial',
        'É o método principal onde o programa começa',
        'É uma classe de sistema',
        'É um comentário do código',
      ],
      correctIndex: 1,
    },
    {
      text: 'Para que serve o "using System;" no início do código?',
      options: [
        'Para criar variáveis',
        'Para fechar o programa',
        'Para importar a biblioteca padrão do C#',
        'Para definir o nome do projeto',
      ],
      correctIndex: 2,
    },
    {
      text: 'Como declaramos uma variável do tipo inteiro em C#?',
      options: ['var numero = 10;', 'integer numero = 10;', 'int numero = 10;', 'num numero = 10;'],
      correctIndex: 2,
    },
    {
      text: 'Qual é a sintaxe correta de um if em C#?',
      options: ['if x > 5 then', 'if (x > 5) {', 'if x > 5:', 'if[x > 5]'],
      correctIndex: 1,
    },
    {
      text: 'Como lemos dados do teclado em C#?',
      options: ['input()', 'Console.ReadLine()', 'scanf()', 'read()'],
      correctIndex: 1,
    },
    {
      text: 'O que é uma "classe" em C#?',
      options: [
        'Um tipo especial de variável',
        'Uma função matemática',
        'Um modelo para criar objetos com propriedades e métodos',
        'Um comando para mostrar texto',
      ],
      correctIndex: 2,
    },
    {
      text: 'Como criamos um laço que repete 5 vezes em C#?',
      options: [
        'repeat(5) {}',
        'loop 5 times {}',
        'for (int i = 0; i < 5; i++) {}',
        'while count 5 {}',
      ],
      correctIndex: 2,
    },
    {
      text: 'Qual é a diferença entre "int" e "double" em C#?',
      options: [
        'Não há diferença',
        'int é para números inteiros, double é para números decimais',
        'int é para texto, double é para números',
        'double é mais rápido que int',
      ],
      correctIndex: 1,
    },
    {
      text: 'O que significa a palavra-chave "string" em C#?',
      options: [
        'Um número decimal',
        'Um valor verdadeiro ou falso',
        'Uma sequência de caracteres (texto)',
        'Um número inteiro',
      ],
      correctIndex: 2,
    },
  ]

  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 7).map((q, i) => ({ ...q, id: String(i + 1) }))
}

function generateStudentFeedback(concepts: string[], errors: CodeError[]): string {
  let feedback = '## Seu Desempenho Hoje\n\n'

  if (errors.length === 0 && concepts.length > 0) {
    feedback += '### Parabéns! Você foi muito bem hoje! 🌟\n\n'
    feedback += `Você usou ${concepts.length} conceito(s) de C# corretamente:\n`
    concepts.forEach(c => { feedback += `✅ ${c}\n` })
    feedback += '\n**Continue assim!** Você está no caminho certo para dominar o C#.\n\n'
    feedback += '**O que fazer a seguir:**\n'
    feedback += '- Tente adicionar mais funcionalidades ao seu código\n'
    feedback += '- Experimente usar os conceitos em situações diferentes\n'
    feedback += '- Ajude um colega que está tendo dificuldade\n'
  } else if (errors.length > 0) {
    feedback += '### Você está aprendendo! Continue tentando! 💪\n\n'
    feedback += `Você usou ${concepts.length} conceito(s), mas teve ${errors.length} erro(s).\n\n`
    feedback += '**O que precisa melhorar:**\n'
    errors.forEach(e => { feedback += `- ${e.message}\n` })
    feedback += '\n**Dica:** Não desista! Todo programador comete erros no início.\n'
    feedback += 'Leia as mensagens do robô assistente com atenção.\n'
  } else {
    feedback += '### Bom início! 👍\n\n'
    feedback += 'Você criou um programa básico. Tente expandir com mais funcionalidades!\n\n'
    feedback += '**Sugestões:**\n'
    feedback += '- Adicione uma variável para guardar um valor\n'
    feedback += '- Peça para o usuário digitar algo com Console.ReadLine()\n'
    feedback += '- Use uma condição if para tomar uma decisão\n'
  }

  return feedback
}

function generateTeacherFeedback(studentName: string, concepts: string[], errors: CodeError[]): string {
  let feedback = `## Relatório do Aluno: ${studentName}\n\n`
  feedback += `**Data:** ${new Date().toLocaleDateString('pt-BR')}\n\n`

  if (concepts.length >= 3 && errors.length === 0) {
    feedback += '**Status:** 🟢 Desenvolvido\n\n'
    feedback += `${studentName} demonstrou boa compreensão dos conceitos.\n`
    feedback += `Utilizou: ${concepts.join(', ')}\n\n`
    feedback += '**Recomendação:** Aluno pode avançar para conteúdos mais complexos.\n'
  } else if (errors.length > 2) {
    feedback += '**Status:** 🔴 Precisa de Atenção\n\n'
    feedback += `${studentName} apresentou dificuldades com erros de sintaxe.\n`
    feedback += `Erros encontrados: ${errors.length}\n\n`
    feedback += '**Recomendação:** Revisar conceitos básicos de sintaxe C# com o aluno.\n'
  } else {
    feedback += '**Status:** 🟡 Em Desenvolvimento\n\n'
    feedback += `${studentName} está progredindo normalmente.\n`
    if (concepts.length > 0) feedback += `Utilizou: ${concepts.join(', ')}\n\n`
    feedback += '**Recomendação:** Manter ritmo atual e incentivar mais prática.\n'
  }

  return feedback
}

export function analyzeCode(code: string, studentName = 'Aluno'): AnalysisResult {
  const lines = code.split('\n')
  const errors: CodeError[] = []
  const warnings: CodeError[] = []

  let bracketCount = 0

  lines.forEach((line, idx) => {
    const lineNum = idx + 1
    const trimmed = line.trim()

    if (/static\s+void\s+Main/i.test(trimmed) && !/static\s+void\s+Main/.test(trimmed)) {
      errors.push({
        line: lineNum,
        type: 'error',
        message: `Linha ${lineNum}: "Main" está com letra errada.`,
        fix: 'Use "Main" com M maiúsculo: static void Main(string[] args)',
      })
    }
    if (/Console\.writeline\s*\(/i.test(trimmed) && !/Console\.WriteLine\s*\(/.test(trimmed)) {
      errors.push({
        line: lineNum,
        type: 'error',
        message: `Linha ${lineNum}: "Console.WriteLine" está escrito errado.`,
        fix: 'Escreva exatamente: Console.WriteLine() — com W e L maiúsculos.',
      })
    }
    if (/console\./i.test(trimmed) && !/Console\./.test(trimmed)) {
      errors.push({
        line: lineNum,
        type: 'error',
        message: `Linha ${lineNum}: "Console" deve começar com C maiúsculo.`,
        fix: 'Corrija para: Console.WriteLine() ou Console.ReadLine()',
      })
    }
    bracketCount += (line.match(/\{/g) || []).length
    bracketCount -= (line.match(/\}/g) || []).length

    if (trimmed.endsWith(')') && !trimmed.endsWith('=>') &&
      !trimmed.startsWith('//') && !trimmed.startsWith('if') &&
      !trimmed.startsWith('while') && !trimmed.startsWith('for') &&
      !trimmed.startsWith('foreach') && !trimmed.includes('{')) {
      if (/\w+\s*\(.*\)$/.test(trimmed) && !trimmed.startsWith('using')) {
        const noSemicolonFuncs = ['if', 'else', 'while', 'for', 'foreach', 'switch', 'catch', 'try', 'finally']
        const isControlFlow = noSemicolonFuncs.some(kw => trimmed.startsWith(kw))
        if (!isControlFlow && !trimmed.endsWith(';')) {
          warnings.push({
            line: lineNum,
            type: 'warning',
            message: `Linha ${lineNum}: Possível falta de ponto e vírgula (;) no final da linha.`,
            fix: 'Adicione ; ao final: ' + trimmed + ';',
          })
        }
      }
    }
  })

  if (bracketCount > 0) {
    errors.push({
      line: 0,
      type: 'error',
      message: `Faltam ${bracketCount} chave(s) de fechamento "}"`,
      fix: `Adicione ${bracketCount} chave(s) "}" ao final do código para fechar os blocos abertos.`,
    })
  } else if (bracketCount < 0) {
    errors.push({
      line: 0,
      type: 'error',
      message: `Há ${Math.abs(bracketCount)} chave(s) "}" a mais no código`,
      fix: `Remova ${Math.abs(bracketCount)} chave(s) "}" desnecessárias.`,
    })
  }

  const concepts = detectConcepts(code)
  const isValid = errors.length === 0

  let robotMessage = ''
  if (!code.trim() || code.trim() === '// Novo arquivo C#') {
    robotMessage = '👋 Olá! Estou aqui para te ajudar. Comece a escrever seu código C# e eu verificarei se está correto!'
  } else if (isValid && concepts.length > 0) {
    robotMessage = `✅ Parabéns! Seu código está correto! Você usou ${concepts.length} conceito(s) de C#: ${concepts.slice(0, 2).join(', ')}${concepts.length > 2 ? ' e mais!' : '.'} Continue assim, você está indo muito bem!`
  } else if (!isValid) {
    robotMessage = `❌ Encontrei ${errors.length} erro(s) no seu código. Não se preocupe, isso é normal no aprendizado! Corrija os erros listados abaixo e tente novamente.`
  } else {
    robotMessage = '👍 O código parece ok! Tente usar mais conceitos como variáveis, loops ou condicionais.'
  }

  const feedback = generateStudentFeedback(concepts, errors)

  return {
    isValid,
    errors,
    warnings,
    feedback,
    robotMessage,
    concepts,
  }
}

export function generateFullReport(code: string, studentName: string) {
  const analysis = analyzeCode(code, studentName)
  const summary = generateSummary(code, analysis.concepts)
  const questions = generateQuestions()
  const teacherFeedback = generateTeacherFeedback(studentName, analysis.concepts, analysis.errors)

  return {
    analysis,
    summary,
    questions,
    teacherFeedback,
  }
}
