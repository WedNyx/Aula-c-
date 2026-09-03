// Uma versão por atualização publicada, não por salvamento nem por build.
export const RELEASES = [
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
