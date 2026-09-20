// Uma versão por atualização publicada, não por salvamento nem por build.
export const RELEASES = [
  { version: '1.6.0', title: 'Direto no Caderno', date: '2026-09-20', changes: [
    'Resumo e atividade enviados pelo professor agora chegam quietos no Caderno do aluno — sem ocupar a tela inteira, cada um na sua parte, sem tirar ninguém do que estava fazendo (igual já acontecia com o código da turma).',
    'Responder a atividade dentro do Caderno continua valendo nota, pontos do Nyx e conquistas, exatamente como antes — só muda onde é respondida.',
    'Terminar a atividade agora mostra um resultado com mais destaque: nota em evidência e uma mensagem de acordo com o desempenho.',
    'Corrigido: em alguns casos, o aluno ficava preso na tela de código depois do professor enviar o resumo, sem nunca chegar a ver o material — mesmo já estando salvo no perfil dele.',
    'Corrigido: a tela do professor podia travar ao abrir "Abrir histórico de resumos", dentro de Resumos, atividades e provas.',
    'Corrigido: em turmas com muitos alunos no mesmo wifi da escola, enviar prova, torneio ou resumo podia travar parte da turma sem conseguir registrar a nota de ninguém — ajustado o limite de tentativas.',
    'Corrigido: a nota de um duelo em dupla podia se perder quando vários alunos respondiam bem no mesmo instante.',
    'Corrigido: dias removidos do calendário da turma podiam voltar sozinhos depois de um tempo.',
    'Corrigido: a presença de alguns alunos podia ser calculada errada (marcada como presente sem necessidade) em certos casos.',
    'Corrigido: a barra de status (relógio, clima, bateria) podia bloquear cliques em modais e no tour guiado.',
    'Envio de resumo para a turma agora tenta de novo sozinho se a primeira tentativa falhar, e avisa com honestidade quando algum aluno realmente não recebeu.',
  ], highlights: [
    'Resumo e atividade enviados pelo professor chegam quietos no Caderno do aluno, sem tela cheia — e o resultado da atividade ganhou um visual novo.',
    'Vários bugs corrigidos: aluno preso na tela de código, tela do professor travando, e provas/duelos que podiam falhar em turmas grandes no mesmo wifi.',
  ] },
  { version: '1.5.3', title: 'Enviar com Confiança', date: '2026-09-17', changes: [
    'Resumo e atividade enviados para a turma agora podem ser cancelados: quem ainda não recebeu deixa de receber, e o botão de enviar volta a ficar disponível.',
    'Provas (geradas pelo Nyx ou escritas manualmente) passam primeiro por um rascunho guardado só com o professor — a turma só vê a prova depois de um envio explícito, igual já acontecia com o resumo e com o código da aula.',
    'Sugestão de música pelos alunos voltou a funcionar de ponta a ponta: o formulário de sugestão estava presente na interface, mas não aparecia por causa de uma conexão faltando, então nenhuma sugestão chegava até a fila de aprovação do professor.',
    'Sugestão de música também passou a aparecer com a playlist da turma ainda vazia (antes só aparecia depois da primeira faixa adicionada).',
    'Limpeza de código e de dependências não usadas por trás dos panos, sem mudanças visíveis para professores ou alunos.',
  ], highlights: [
    'Resumo/atividade e prova agora seguem o mesmo fluxo: preparar, revisar e só então enviar — com opção de cancelar o envio do resumo.',
    'A sugestão de música dos alunos para o professor voltou a funcionar.',
  ] },
  { version: '1.5.2', title: 'Jogos em Evolução', date: '2026-09-16', changes: [
    'Corrida de Digitação ganhou níveis iniciante, intermediário e avançado.',
    'Precisão e caracteres por minuto agora aparecem durante e depois da corrida.',
    'Sequência Lunar ganhou três rodadas progressivas, vidas e opção de reinício.',
    'Estrela Intrusa ficou progressivamente maior e passou a contabilizar erros.',
    'Pares do Eclipse ganhou quatro pares, cronômetro, contador de jogadas e novo embaralhamento.',
    'Os desafios respondem aos acertos e erros com feedback sonoro consistente.',
  ], highlights: [
    'Os jogos existentes ficaram mais completos, progressivos e fáceis de repetir.',
    'A Corrida de Digitação agora mede dificuldade, precisão e velocidade.',
  ] },
  { version: '1.5.1', title: 'Atalhos do Computador', date: '2026-09-15', changes: [
    'A tela de entrada ganhou botões para tentar abrir o Roblox e o Unity Hub instalados no computador.',
    'Os atalhos iniciam somente o aplicativo, sem abrir experiência, jogo ou projeto específico.',
    'A plataforma orienta o usuário quando o navegador solicitar confirmação para abrir outro aplicativo.',
  ], highlights: [
    'Roblox e Unity Hub agora podem ser iniciados diretamente pela tela de entrada.',
  ] },
  { version: '1.5.0', title: 'Eclipse de Entrada', date: '2026-09-15', changes: [
    'A plataforma ganhou uma abertura cinematográfica própria antes da escolha entre aluno e professor.',
    'A animação pode ser pulada e não se repete durante a mesma sessão de acesso.',
    'Pessoas que preferem movimento reduzido seguem diretamente para a tela de entrada.',
    'O relógio da plataforma permanece sincronizado e pontual com o horário de Brasília.',
    'Professor pode recuperar conquistas perdidas e corrigir presenças de qualquer data com segurança.',
    'Justificativas permanecem visíveis para o aluno e chegam aos avisos flutuantes do Nyx.',
  ], highlights: [
    'Uma nova abertura cinematográfica apresenta a Aula C# antes da escolha do perfil.',
    'O horário de Brasília agora atualiza no segundo certo, sem carregar minutos atrasados.',
    'Recuperação de conquistas, chamada manual por data e justificativas ficaram mais confiáveis.',
  ] },
  { version: '1.4.5', title: 'Código de Verdade', date: '2026-09-14', changes: [
    'Terminal agora compila e executa C# de verdade pelo Judge0, sem depender da IA.',
    'Entrada para Console.ReadLine pode ser preparada antes da execução do programa.',
    'Erros do navegador e das funções da Vercel podem ser registrados com segurança no Sentry.',
    'Visão da Viagem ganhou mapa real e interativo do Distrito Federal, com zoom, trajeto e cidades visitadas.',
    'Central de músicas permite pesquisar, tocar na hora, criar playlist pessoal e colaborar na playlist da sala.',
  ], highlights: [
    'O terminal agora executa C# de verdade e aceita entradas com Console.ReadLine.',
    'A Visão da Viagem ganhou um mapa real e interativo do Distrito Federal.',
    'A Central de Músicas ganhou pesquisa, reprodução imediata e playlists pessoais e da turma.',
    'O histórico mostra os resumos enviados, cada atividade aceita uma tentativa e o Nyx reúne avisos acolhedores.',
  ] },
  { version: '1.4.0', title: 'Nyx Conectado', date: '2026-09-11', changes: [
    'Gemini passa a ser a IA principal do Nyx, com os provedores anteriores mantidos como reservas automáticas.',
    'Professor pode pesquisar músicas pelo YouTube e Spotify sem expor as credenciais das APIs.',
    'Faixas aprovadas são reproduzidas nos players oficiais do YouTube e Spotify dentro da plataforma.',
    'Tour do professor e indicadores de saúde da IA foram atualizados para explicar a nova integração.',
  ] },
  { version: '1.3.0', title: 'Correção à Distância', date: '2026-09-10', changes: [
    'Professor pode editar e salvar o código do aluno diretamente pelo monitoramento.',
    'A correção é sincronizada com o editor aberto do aluno e fica identificada no painel.',
    'Aviso de conflito protege alterações mais novas feitas pelo aluno durante a correção.',
  ] },
  { version: '1.2.1', title: 'Aurora Renovada', date: '2026-09-07', changes: [
    'Nyx Aurora ganhou cortinas luminosas mais largas, fluidas e fiéis ao tema de aurora boreal.',
    'Efeitos em ciano, violeta e rosa agora se movimentam atrás do personagem sem prejudicar sua leitura.',
    'Cristal e detalhes visuais da aparência foram harmonizados com a nova iluminação.',
  ] },
  { version: '1.2.0', title: 'Horizontes do Nyx', date: '2026-09-05', changes: [
    'Lista de chamada com acompanhamento direto, indicadores e correções rápidas.',
    'Materiais, links de aula e recursos organizados para cada turma.',
    'Player musical por turma com controle do professor e sugestões moderadas.',
    'Terminal mais claro, responsivo e preparado para exercícios guiados.',
    'Navegação mais rápida com carregamento sob demanda dos recursos pesados.',
    'Novas identidades visuais para as aparências do Nyx Prisma Orbital.',
  ] },
  { version: '1.1.0', title: 'Rotina da turma', date: '2026-09-03', changes: [
    'Dê um nome a cada pet no editor do perfil.',
    'Minhas aulas organizadas por turno, mantendo as antigas em Sem turno.',
    'Lista de chamada com data, acesso registrado e correção manual protegida.',
    'Resumos, atividades e provas em uma área própria: criação manual sem IA e exclusão de resumos do professor.',
    'Versão visível e histórico das novidades da plataforma.',
    'Tutorial de teclado com frases correspondentes à letra estudada.',
  ] },
  { version: '1.0.0', title: 'Versão anterior', date: null, changes: ['Base anterior ao histórico de versões: avatares, pets e atividades de programação.'] },
];
export const CURRENT_RELEASE = RELEASES[0];
export const PLATFORM_VERSION = CURRENT_RELEASE.version;
