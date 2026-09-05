import { useState, useEffect } from "react";
import { NyxDisplay as NyxRobot } from "./NyxDisplay.jsx";

// ════════════════════════════════════════════════════════════════════════════
//  TOUR GUIADO DO NYX  (destaca cada área da tela do aluno)
// ════════════════════════════════════════════════════════════════════════════
export const TOUR_STEPS = [
  { sel:'[data-tour="perfil"]',   emoji:"👤", title:"Seu painel",            text:"Aqui ficam seu avatar, seu nome, sua turma e os controles principais. O botão Sair encerra somente o seu perfil." },
  { sel:'[data-tour="status-ia"]',emoji:"💡", title:"Estado da IA",          text:"A luz verde indica que o Nyx está disponível. Se ficar vermelha ou mostrar reconexão, você ainda pode continuar escrevendo e seu código permanece guardado." },
  { sel:'[data-tour="atividade-atual"]',emoji:"▶️",title:"Atividade atual", text:"Este cartão mostra o arquivo em que você parou, quantidade de linhas, linguagem e pontos. Use Continuar atividade para voltar direto ao trabalho." },
  { sel:'[data-tour="caderno"]',  emoji:"📒", title:"Seu caderno",           text:"Aqui ficam os resumos e atividades enviados pelo professor, além das suas próprias anotações. Você pode criar, editar e organizar lembretes das aulas." },
  { sel:'[data-tour="perfil-jornada"]', emoji:"🌌", title:"Perfil de jornada", text:"Reúne seu pet, progresso, pontos, conquistas, vitórias e melhor tempo em um único cartão." },
  { sel:'[data-tour="novidades"]',emoji:"🔔", title:"Central de novidades",   text:"Avisos do professor, novidades da plataforma e lembretes importantes ficam organizados aqui." },
  { sel:'[data-tour="feedback-aula"]',emoji:"💬", title:"Feedback da aula", text:"Avalie a aula e envie um recado ao professor quando quiser. Depois do envio, você também pode voltar aqui para conferir o que registrou." },
  { sel:'[data-tour="sites-turma"]',emoji:"🔗", title:"Sites da turma", text:"Os links liberados pelo professor ficam aqui. Ao clicar, o site escolhido abre diretamente em uma nova aba." },
  { sel:'[data-tour="missoes"]',  emoji:"☀️", title:"Missões de hoje",       text:"Pequenos objetivos para orientar sua exploração. Não valem nota e não existe punição por não completar." },
  { sel:'[data-tour="repetir-tour"]',emoji:"🧭",title:"Repetir o tour",       text:"Esqueceu onde alguma coisa fica? Use este botão para rever todo o painel quando quiser." },
  { sel:'[data-tour="jornada"]',  emoji:"🗺️", title:"Sua Jornada",           text:"Veja o caminho do que você já estudou e relembre os conteúdos das aulas anteriores." },
  { sel:'[data-tour="conquistas"]',emoji:"🎖️", title:"Conquistas",           text:"Suas ações na plataforma desbloqueiam medalhas — algumas são públicas e outras ficam escondidas esperando você descobrir." },
  { sel:'[data-tour="ranking"]',  emoji:"📊", title:"Ranking da turma",      text:"Acompanhe os pontos conquistados nas atividades. Comprar itens na loja não diminui sua posição." },
  { sel:'[data-tour="games"]',    emoji:"🎮", title:"Games",                 text:"Este menu reúne Duelo, Duelo em Dupla e Corrida de Digitação. A Sala de Desafios fica dentro do Santuário Lunar." },
  { sel:'[data-tour="santuario"]',emoji:"🌙", title:"Santuário Lunar",       text:"Um espaço tranquilo com painel coletivo da turma, jardim de conquistas e jogos rápidos de memória e observação na Sala de Desafios." },
  { sel:'[data-tour="conhecimento"]', emoji:"🧠", title:"Testar Conhecimento", text:"Faça uma revisão individual baseada somente no conteúdo que você já encontrou nas aulas." },
  { sel:'[data-tour="desafio-livre"]', emoji:"🏗️", title:"Desafio Livre",    text:"Conte uma ideia que gostaria de construir e o Nyx organiza um plano simples, passo a passo, para você começar." },
  { sel:'[data-tour="editor"]',   emoji:"📝", title:"Seu editor de código",  text:"É aqui que você escreve seus programas em C#. Ele colore o código e fecha chaves, parênteses e aspas sozinho!" },
  { sel:'[data-tour="arquivos"]', emoji:"📄", title:"Seus arquivos",         text:"Crie quantos arquivos .cs quiser. Eles fazem parte do mesmo projeto e funcionam juntos, como no VS Code!" },
  { sel:'[data-tour="nyx"]',      emoji:"🤖", title:"Nyx, avatar e pet",       text:"Seu avatar, seu companheiro e o Nyx ficam juntos neste espaço. Quando quiser conferir o código, use o botão Analisar código; nada começa escondido sozinho." },
  { sel:'[data-tour="pet"]',      emoji:"🐾", title:"Seu companheiro",        text:"O pet escolhido fica neste cantinho do painel. Clique nele para descobrir uma reação diferente — cada espécie tem seu próprio jeitinho." },
  { sel:'[data-tour="loja"]',     emoji:"🎁", title:"Loja do Nyx",            text:"Cada resposta certa vira pontos! Use-os apenas para personalizar o Nyx. Você pode equipar dois acessórios de cada categoria; avatares e pets são gratuitos." },
  { sel:'[data-tour="teclado"]',  emoji:"⌨️", title:"Tutorial de teclado",   text:"Ainda não decorou onde fica cada tecla? Aqui tem um tutorial completo, no seu ritmo, sempre que quiser treinar." },
  { sel:'[data-tour="ajuda"]',    emoji:"✋", title:"Precisa de ajuda?",      text:"Travou em alguma coisa? Clique aqui: seu nome acende na tela do professor e ele vem te ajudar." },
  { sel:'[data-tour="hall"]',     emoji:"🏆", title:"Hall da Fama",          text:"Veja quem se destacou nas cidades por onde a carreta já passou antes de chegar aqui!" },
  { sel:'[data-tour="terminal"]', emoji:"⌨️", title:"Executar seu projeto", text:"Em C#, use dotnet run no terminal. Na Sala de Linguagens, esta área vira uma prévia própria para HTML, CSS e JavaScript, ou mostra a orientação de execução do PHP." },
  { sel:'[data-tour="salvar"]',   emoji:"📚", title:"Resumo da aula",        text:"Quando o professor enviar o material revisado, ele aparece no seu caderno com as seções e a atividade daquela aula." },
  { sel:'[data-tour="turma"]',    emoji:"🏆", title:"Turma & Você",           text:"Aqui você acompanha o ranking da turma, suas conquistas, o caderno de resumos, seu desempenho, duelos contra colegas e a corrida de digitação!" },
  { sel:'[data-tour="tema"]',     emoji:"🎨", title:"Tema do fundo",         text:"Prefere claro ou escuro? Troque aqui. E logo do lado tem o botão 🎨 Cores, pra pintar o fundo da cor que você quiser!" },
  { sel:'[data-tour="acessibilidade"]', emoji:"♿", title:"Deixe do seu jeito", text:"Letras maiores, eu lendo tudo em voz alta com a voz que você escolher, ou tela cheia — esses botões deixam a plataforma mais confortável pra você." },
];

// Percurso mais curto para quem monta o programa com blocos. Evita apresentar o editor de texto,
// criação de arquivos e recursos competitivos antes de ensinar o caminho essencial da atividade.
export const GUIDED_TOUR_STEPS = [
  { sel:'[data-tour="perfil"]', emoji:"👤", title:"Seu espaço", text:"Aqui ficam seu nome, seu avatar e os controles principais. Tudo o que você montar fica guardado no seu perfil." },
  { sel:'[data-tour="atividade-atual"]', emoji:"▶️", title:"Continue de onde parou", text:"Este cartão leva você de volta aos blocos e mostra seu progresso. Use Continuar atividade sempre que quiser voltar ao programa." },
  { sel:'[data-tour="guided-blocks"]', emoji:"🧩", title:"Escolha um bloco", text:"Clique em um bloco para acrescentar uma ação ao programa. Alguns blocos fazem uma pergunta simples antes de entrar." },
  { sel:'[data-tour="guided-lessons"]', emoji:"🎮", title:"Aprenda um truque", text:"Peça uma explicação com exemplo de jogo. Se a IA ou a internet não estiver disponível, a plataforma usa uma lição preparada." },
  { sel:'[data-tour="guided-program"]', emoji:"📜", title:"Organize o programa", text:"Os blocos aparecem aqui na ordem em que vão funcionar. Use as setas ou arraste para mudar a ordem, e o X para retirar um bloco." },
  { sel:'[data-tour="guided-actions"]', emoji:"✨", title:"Peça uma conferência", text:"Quando seu programa estiver pronto, peça ao Nyx para conferir. Ele mostra o que está certo e explica possíveis ajustes." },
  { sel:'[data-tour="terminal"]', emoji:"⌨️", title:"Veja o programa funcionar", text:"No terminal, digite dotnet run e aperte Enter. Se o programa fizer uma pergunta, digite a resposta no mesmo lugar." },
  { sel:'[data-tour="nyx"]', emoji:"🤖", title:"Nyx e seu perfil", text:"Neste espaço você encontra o Nyx, seu avatar e seu pet. As explicações também podem ser ouvidas em voz alta quando esse apoio estiver disponível." },
  { sel:'[data-tour="ajuda"]', emoji:"✋", title:"Peça ajuda", text:"Se ficar difícil continuar, clique aqui. Seu nome vai aparecer para o professor, que saberá que você precisa de ajuda." },
  { sel:'[data-tour="repetir-tour"]', emoji:"🧭", title:"Pode rever quando quiser", text:"Este botão repete essas orientações. Você não precisa decorar tudo agora: avance no seu ritmo." },
];

// tour do painel do professor — acionado por um botão (🧭 Tour), não aparece sozinho. Cada passo diz
// em qual aba (tab) o professor precisa estar: ao avançar, o painel MUDA de aba sozinho antes de
// destacar o elemento, então quem faz o tour vê o conteúdo de verdade, não só o botão de fora. Mantenho
// essa lista atualizada manualmente sempre que uma função nova entra no painel do professor.
export const TEACHER_TOUR_STEPS = [
  { tab:"attendance", sel:'[data-tour-prof="attendance-body"]', emoji:"📋", title:"Lista de chamada", text:"Escolha a data e o turno para ver os acessos. Dê ou tire presença quando necessário: sua correção tem prioridade sobre novos acessos. Voltar ao automático remove essa decisão manual." },
  { tab:"monitor", sel:'[data-tour="versao"]', emoji:"🔖", title:"Versão da plataforma", text:"Este indicador mostra apenas o número da versão instalada, para facilitar a identificação em caso de suporte." },
  { tab:"monitor", sel:'[data-tour-prof="monitor"]',      emoji:"👥", title:"Monitoramento",        text:"Sua tela principal: acompanhe a turma em tempo real, fase de cada aluno, notas, erros no código e pedidos de ajuda acesos na hora." },
  { tab:"monitor", sel:'[data-tour-prof="monitor-grid"]', emoji:"🧩", title:"Cards dos alunos",       text:"Cada card mostra avatar, nome, nível, pontos, atividade atual e situação. Use somente os três pontos para abrir o gerenciamento do aluno, evitando alterações acidentais." },
  { tab:"monitor", sel:'[data-tour-prof="chamada"]',      emoji:"📋", title:"Lista de Chamada",      text:"Clique pra abrir: presença separada por turno, atualizada sozinha. Dá pra marcar presença na mão (dia de filme, sem computador) e abrir o tutorial de teclado pra todo mundo de uma vez." },
  { tab:"monitor", sel:'[data-tour-prof="exportar"]',     emoji:"📊", title:"Exportar dados",        text:"Planilha colorida (Excel) com notas e presenças, PDF com o código + explicações do dia, e um backup completo da turma inteira — tudo daqui." },
  { tab:"monitor", sel:'[data-tour-prof="conteudo-auto"]',emoji:"📖", title:"Conteúdo do dia",       text:"O nome do conteúdo de hoje (o que aparece no calendário) pode ser gerado sozinho pela IA, com base no código que você escreveu." },
  { tab:"monitor", sel:'[data-tour-prof="boletim"]',      emoji:"💌", title:"Boletim pros responsáveis", text:"Gera um PDF, uma página por aluno, em linguagem simples pra família: presenças, o que aprendeu e um recado do Nyx. Bom pra mandar pra casa no fim do mês." },
  { tab:"monitor", sel:'[data-tour-prof="retro"]',        emoji:"🎁", title:"Retrospectiva do mês",  text:"Libere e cada aluno vê uma tela especial com os números dele (linhas de código, presenças, conquistas) — estilo Wrapped." },
  { tab:"code", sel:'[data-tour-prof="code"]',            emoji:"👨‍💻", title:"Meu código",           text:"Aqui você escreve o código de exemplo do dia — é ele que vira o \"código da turma\" que os alunos recebem, no painel de Gerenciar aluno." },
  { tab:"code", sel:'[data-tour-prof="code-info"]',       emoji:"⚙️", title:"Turno, aulas prontas e nome do conteúdo", text:"Cada turno (Manhã/Tarde) tem seu próprio exemplo. Reaproveite uma aula salva em \"Minhas aulas\", ou gere o nome do conteúdo automaticamente a partir do que você escreveu." },
  { tab:"materials", sel:'[data-tour-prof="resumo-ritmo"]', emoji:"✍️", title:"Resumos, atividades e provas", text:"Esta área reúne seus materiais por turno. Escreva resumos e atividades sem IA, revise e envie aos alunos. No Caderno você pode apagar um resumo do professor com confirmação; cópias enviadas aos alunos permanecem." },
  { tab:"calendar", sel:'[data-tour-prof="calendar"]',       emoji:"🗓️", title:"Calendário",           text:"Marca os dias de aula sozinho (quando há alunos online) e você também pode clicar pra marcar/desmarcar na mão." },
  { tab:"calendar", sel:'[data-tour-prof="calendar-body"]',  emoji:"📅", title:"Dias de aula",         text:"Dias em verde tiveram aula. O 📖 mostra os que já têm conteúdo gerado — passe o mouse pra ver o tema daquele dia." },
  { tab:"calendar", sel:'[data-tour-prof="cidade"]',         emoji:"📍", title:"Cidade e Hall da Fama", text:"Registre em qual cidade do DF a carreta está agora. Quando for mudar de cidade, encerre aqui: guarda uma placa de destaque + relatório de despedida em PDF, sem apagar os dados da turma (só CPF e data de nascimento somem pra sempre)." },
  { tab:"calendar", sel:'[data-tour-prof="horario"]',        emoji:"🕐", title:"Horário da turma",     text:"Defina início, fim e intervalo de cada turno — o Nyx libera e bloqueia o perfil dos alunos sozinho, na hora certa." },
  { tab:"feedback", sel:'[data-tour-prof="feedback"]',       emoji:"💬", title:"Feedback",             text:"As avaliações (nota de 1 a 5 + comentário) que os alunos deixam sobre cada aula aparecem aqui, mais recentes primeiro." },
  { tab:"sites", sel:'[data-tour-prof="sites"]', emoji:"🔗", title:"Sites da turma", text:"Cadastre um endereço HTTPS, escolha a turma e libere o atalho. Os alunos abrem o site diretamente pela navegação deles." },
  { tab:"music", sel:'[data-tour-prof="music"]', emoji:"🎵", title:"Música da turma", text:"Libere ou bloqueie música por turma, escolha onde o player aparecerá e administre apenas faixas autorizadas." },
  { tab:"feedback", sel:'[data-tour-prof="feedback-body"]',  emoji:"⭐", title:"Avaliações da turma",  text:"Bom pra saber o clima da aula na visão de quem participou — cada card mostra o aluno, o turno e o que ele escreveu." },
  { tab:"exam", sel:'[data-tour-prof="exam"]', emoji:"🏆", title:"Provas manuais ou com IA", text:"Na seção Provas, escreva revisão, perguntas, quatro alternativas e gabarito manualmente, ou use a IA. Cada turno tem sua prova. Criar libera 30 minutos de revisão antes do início automático; você também pode iniciar antes." },
  { tab:"quiz", sel:'[data-tour-prof="quiz"]',              emoji:"🎉", title:"Quiz",                 text:"Monte um quiz estilo Kahoot e jogue com a turma inteira ao vivo, com placar na hora." },
  { tab:"quiz", sel:'[data-tour-prof="quiz-body"]',         emoji:"🎮", title:"Temas e salas",        text:"Escolha um tema pronto ou crie o seu, defina o tempo por pergunta e clique em Criar sala: um código aparece pra você, e os alunos entram com ele." },
  { tab:"reminders", sel:'[data-tour-prof="reminders"]',   emoji:"🔔", title:"Avisos programados",   text:"Crie lembretes para você ou para uma turma, escolha data, horário e por quantos dias o aviso deve se repetir." },
  { tab:"monitor", sel:'[data-tour-prof="notes"]',         emoji:"📝", title:"Suas anotações",       text:"Abra seu bloco de anotações pela barra lateral para registrar lembretes da aula sem misturar com os avisos enviados às turmas." },
  { tab:"monitor", sel:'[data-tour-prof="situacao"]',     emoji:"👀", title:"Situação",              text:"Veja rapidinho quem está indo bem e quem está com dificuldade agora, sem precisar trocar de aba." },
  { tab:"monitor", sel:'[data-tour-prof="telao"]',        emoji:"🖥️", title:"Telão",                 text:"Modo tela cheia pra projetar pra turma: ranking, meta coletiva e combos ao vivo." },
  { tab:"monitor", sel:'[data-tour-prof="turma"]',        emoji:"🔀", title:"Filtro de turma",       text:"Filtra praticamente tudo — monitoramento, chamada, prova — por turno: Manhã, Tarde, Turma de Teste ou Sala de Linguagens." },
  { tab:"monitor", sel:'[data-tour-prof="reset"]',        emoji:"🔄", title:"Resetar",               text:"Zera o dia da turma selecionada no filtro acima, pra começar uma aula nova do zero." },
  { tab:"monitor", sel:'[data-tour="saude-ia"]',          emoji:"📡", title:"Saúde da IA",           text:"As bolinhas mostram se o Nemotron e o Laguna (os modelos gratuitos) estão respondendo bem agora — verde tudo certo, vermelho não respondeu na última tentativa." },
  { tab:"monitor", sel:'[data-tour="chat-prof"]',         emoji:"💬", title:"Fale comigo!",          text:"Dúvidas rápidas sobre a turma, ou comandos especiais como zek (chama atenção geral) e zeker (bloqueia duelos) — é só conversar comigo aqui." },
  { tab:"monitor", sel:'[data-tour-prof="sair"]',         emoji:"🚪", title:"Sair",                  text:"Esse tour eu mantenho sempre atualizado conforme novas funções chegam ao painel — pode chamar de novo quando quiser relembrar algo. Bom trabalho! 🚀" },
];

export function TourOverlay({ step, onNext, steps = TOUR_STEPS, canSpeak = false, speaking = false, onSpeak, onStop }) {
  const [rect, setRect] = useState(null);
  // "smooth" só na troca de passo (anel desliza bonito de um elemento pro outro);
  // depois disso vira instantâneo, pro anel ficar GRUDADO no elemento quando a página rola
  const [smooth, setSmooth] = useState(true);
  const s = steps[step];
  useEffect(() => {
    const el = document.querySelector(s.sel);
    if (!el) { setRect(null); return; }
    setSmooth(true);
    el.scrollIntoView({ block:"center" });
    let raf, t2;
    // mede o elemento a cada frame: se a página rolar ou o layout mudar, o anel acompanha na hora
    const track = () => {
      const r = el.getBoundingClientRect();
      setRect(prev => (prev && Math.abs(prev.top-r.top)<0.5 && Math.abs(prev.left-r.left)<0.5 && Math.abs(prev.width-r.width)<0.5 && Math.abs(prev.height-r.height)<0.5)
        ? prev : { top:r.top, left:r.left, width:r.width, height:r.height, bottom:r.bottom });
      raf = requestAnimationFrame(track);
    };
    const t = setTimeout(() => {
      track();
      t2 = setTimeout(() => setSmooth(false), 350); // terminou o deslize do passo → passa a colar no scroll
    }, 150);
    return () => { clearTimeout(t); clearTimeout(t2); cancelAnimationFrame(raf); };
  }, [step, s.sel]);
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const below = rect ? rect.bottom + 200 < vh : true;
  const tipTop = rect ? (below ? Math.min(rect.bottom + 14, vh - 210) : Math.max(rect.top - 206, 10)) : vh/2 - 100;
  const tipLeft = rect ? Math.max(12, Math.min(rect.left + rect.width/2 - 170, vw - 356)) : 20;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:990 }}>
      {rect
        ? <div style={{ position:"fixed", top:rect.top-6, left:rect.left-6, width:rect.width+12, height:rect.height+12, borderRadius:14, border:"3px solid #c084fc", boxShadow:"0 0 0 9999px rgba(11,6,20,.78), 0 0 24px #c084fc88", transition: smooth ? "all .3s ease" : "none", pointerEvents:"none" }} />
        : <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.78)" }} />}
      <div className="pop" key={step} style={{ position:"fixed", top:tipTop, left:tipLeft, width:340, maxWidth:"calc(100vw - 24px)", background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #c084fc66", borderRadius:16, padding:"14px 16px", boxShadow:"0 18px 50px rgba(0,0,0,.6)" }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
          <div style={{ flexShrink:0, marginTop:-6 }}><NyxRobot state="idle" size={46} showName={false} /></div>
          <div>
            <div style={{ fontWeight:800, color:"#f0e9fb", fontSize:14.5 }}>{s.emoji} {s.title}</div>
            <p style={{ color:"#d6c9ec", fontSize:13, lineHeight:1.6, margin:"6px 0 0" }}>{s.text}</p>
          </div>
        </div>
        {/* sem botão de pular: quem inicia o tour vê a sala inteira, passo a passo */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginTop:12 }}>
          <span style={{ color:"#776798", fontSize:12 }}>{step+1}/{steps.length}</span>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            {canSpeak && <button type="button" aria-label={speaking ? "Parar leitura desta orientação" : "Ouvir esta orientação"} onClick={()=>speaking ? onStop?.() : onSpeak?.(`${s.title}. ${s.text}`)} style={{ background:"#171026", border:"1px solid #22d3ee", borderRadius:10, color:"#a5f3fc", fontWeight:800, padding:"7px 11px", cursor:"pointer", fontSize:13 }}>{speaking ? "⏹ Parar" : "🔊 Ouvir"}</button>}
            <button onClick={()=>{ onStop?.(); onNext(); }} style={{ background:"linear-gradient(135deg,#c084fc,#9333ea)", border:"none", borderRadius:10, color:"#fff", fontWeight:800, padding:"7px 16px", cursor:"pointer", fontSize:13 }}>{step === steps.length-1 ? "Entendi! 🚀" : "Próximo →"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
