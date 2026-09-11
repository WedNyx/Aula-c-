// Uma versão por atualização publicada, não por salvamento nem por build.
export const RELEASES = [
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
