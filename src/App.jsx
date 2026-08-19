import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import gsap from "gsap";
import { Toaster, toast } from "sonner";
import { saveStudent, getStudent, setNudge, getNudge, listStudents, checkReset, resetAll, getTeacherMeta, saveTeacherMeta, saveTeacherCode, getTeacherCode, setCodeSend, getCodeSend, clearCodeSend, reportAiHealth, getAiHealth, getAiHealthByProvider, diagnose, getExamState, setExamState, getExamStateForStudent, gradeExam, gradeTourneyRound, setDuel, getDuel, clearDuel, listDuels, getNyxLocks, setNyxLocks, patchStudent, deleteStudentProfile, setKick, checkKick, setScoreFix, getScoreFix, clearScoreFix, getAccessMode, setAccessMode, getSupport, setSupport, listAllSupport, exportAllData, triggerBackupNow, getBackupList, getTeacherLessons, saveTeacherLessons, getBoss, setBoss, clearBoss, getKeyboardLock, setKeyboardLock, getResumoTrigger, setResumoTrigger, getTourney, setTourney, clearTourney, getInspection, setInspection, getHallOfFame, getOwnHallOfFame, saveHallOfFame, setKeyboardLaunch, getKeyboardLaunch, setPartner, getPartner, clearPartner, listPartners, getQuizThemes, saveQuizThemes, getQuizRoom, setQuizRoom, clearQuizRoom, setCheckin, getCheckin, listCheckinsForDate, setTeamDuel, getTeamDuel, clearTeamDuel, listTeamDuels, reportClientError, getRecentErrors, getAdminLog, getTurmas, saveTurmas } from "./storage.js";
import { xlsxBlob, colLetter } from "./xlsx.js";
import { hexToRgb, shade, isLight, shadeHex } from "./lib/colors.ts";
import { FONT, PAGE_BG, LIGHT_BG, SPARTAN_BG, customBg, pageBgFor } from "./lib/theme.ts";
import { setSoundsCalm, playSound, setSoundsMuted, loadSoundsMuted, CONFETTI_COLORS, fireConfetti } from "./lib/sound.ts";
import { codeBackupKey, saveCodeBackupLocal, loadCodeBackupLocal } from "./lib/codeBackup.ts";
import { listPtVoices, bestPtVoice, useSpeech } from "./lib/speech.js";
import { VoicePickerModal } from "./components/VoicePickerModal.jsx";
import { ColorPickerModal } from "./components/ColorPickerModal.jsx";
import { KEY_IMAGES, KeyVisual } from "./components/KeyVisual.jsx";
import { NYX_ITEMS, DEFAULT_NYX_GEAR } from "./components/NyxRobot.jsx";
import { NyxPrismaOrbital as NyxRobot } from "./components/NyxPrismaOrbital.jsx";
import { PerformanceChart } from "./components/PerformanceChart.jsx";
import { DEFAULT_AVATAR, Avatar, AvatarPreview, AvatarControls, AvatarBuilder } from "./components/Avatar.jsx";
import { VSEditor, CodeBlock, GUIDED_BLOCKS, GUIDED_PARTICIPATION_QUIZ } from "./components/CodeEditor.jsx";
import { Terminal } from "./components/Terminal.jsx";
import { NyxChat } from "./components/NyxChat.jsx";
import { TOUR_STEPS, TEACHER_TOUR_STEPS, TourOverlay } from "./components/TourOverlay.jsx";
import { codeForSpeech, useViewportWidth, computeStreak, streakPointsFor, shuffleQuestions, filterValidQuestions, isDoneActive, gradeInfo, quickCheck, findMatchingLesson } from "./lib/utils.js";
import { ACHIEVEMENTS, ALL_EGG_ACHIEVEMENT_IDS, achievementInfo, visibleAchievements, CLASS_GOALS, classGoalProgress } from "./lib/achievements.ts";
import { generateRelatorioDocx, downloadRelatorioDocx } from "./lib/reportDocx.js";
import { CS_SYSTEM, RUN_SYSTEM, nyxPrefsInstruction, NYX_GUIDED_SYSTEM } from "./lib/ai-prompts.ts";
import { STUDY_LANGUAGES, langById, reviewChecklistFor, buildPreviewDoc, otherFilesCtx, findLineIndex } from "./lib/languages.ts";
import { BRACKET_COLORS, highlight, highlightCSharp, highlightJS, highlightPHP, highlightCSS, highlightHTML } from "./lib/highlight.jsx";
import { ANALYZE_PROVIDERS, PARTNER_REWARD_HELPER, PARTNER_REWARD_HELPED, PARTNER_WEEKLY_CAP, isOffline, isNetworkError, askClaude, extractJson, askClaudeJson, buildSummaryRequest, buildContinuationSummaryRequest, mergeSummaryContinuation, recentDifficultyHint, adaptiveDifficultyTier } from "./lib/ai.js";
import { requestFS, goFullscreen, todayKey, weekKey, dateKeyOf, hmToMin, nowMin, classStatus } from "./lib/schedule.ts";
import { SHIFTS, TEST_SHIFT, LANG_SHIFT, shiftMeta, shiftLabel, isSameDayTs, contentNameFor, withContentName, DEFAULT_TURMAS, TURMA_COLORS, turmaCalendar, withTurmaCalendar, isResumoDay } from "./lib/shifts.ts";
import { Login } from "./components/LoginScreen.jsx";
import { ImpactPage, PortfolioPage } from "./components/PublicPages.jsx";
import { generateDuelQuestions, generateKnowledgeTestQuestions, generateFreeBuildPlan } from "./lib/aiChallenges.js";
import { DF_CITIES, DF_REGION_COORDS, normalizeCityName, matchDfRegion } from "./lib/dfRegions.ts";
import { STUCK_MINUTES, difficultyOf } from "./lib/studentStatus.ts";
import { SummaryPretty } from "./components/SummaryPretty.jsx";
import { ClassTrendChart } from "./components/ClassTrendChart.jsx";
import { ConfettiParty } from "./components/ConfettiParty.jsx";
import { ErrorHighlightRing, ErrorWalkthroughCard, FloatingErrorBubble, NyxFeedbackModal, ErrorExplainModal } from "./components/ErrorUI.jsx";
import { NyxShop, RetroOverlay } from "./components/NyxShop.jsx";
import { AchievementToast, AchievementsModal, RankingModal, ClassGoalBar } from "./components/AchievementUI.jsx";
import { QuickStatusModal, TelaoModal, JustifyModal, HallOfFameModal, TripOverviewModal, RankingRevealModal } from "./components/TeacherModals.jsx";
import { BossStudyModal, LearningTrailModal, NextStepsModal, NotebookModal, CheckinModal, PerformanceModal, CHECKIN_MOODS } from "./components/LearningModals.jsx";
import { TypingRaceModal, FreeBuildModal, DuelModal, TeamDuelModal, KnowledgeTestModal } from "./components/GameModals.jsx";
import { MobileMonitorView } from "./components/MobileMonitor.jsx";
import { Sparkles } from "./components/Sparkles.jsx";
import { CollapsibleCard } from "./components/CollapsibleCard.jsx";
import { Calendar } from "./components/Calendar.jsx";
import { CodeLab } from "./components/CodeLab.jsx";
import { GIFT_TIERS, rollGift } from "./lib/gifts.js";
import { QUIZ_COLORS, QUIZ_QUESTION_SECONDS, QUIZ_TIMER_OPTIONS, quizSecsOf, quizPoints, makeQuizCode, quizLeaderboard, QUIZ_SEED_THEMES } from "./lib/quiz.js";
import { LESSON_LIBRARY } from "./lib/lessonLibrary.js";

// desliga o "aquecimento" (revisão automática que chamava o Nyx sozinha, sem clique nenhum) —
// ver o useEffect que usa essa flag, dentro de StudentView
const WARMUP_ENABLED = false;

// caderno: lista os resumos por data e mostra o escolhido

// ⌨️ Tutorial de teclado (ABNT2, réplica do notebook Lenovo) — movido pra src/KeyboardTutorial.jsx
// e carregado sob demanda (React.lazy) só quando o aluno abre o tutorial, pra não pesar o pacote inicial.
const KeyboardTutorialModal = lazy(() => import("./KeyboardTutorial.jsx"));


function checkinMoodInfo(id) {
  return CHECKIN_MOODS.find(m => m.id === id) || null;
}

// ════════════════════════════════════════════════════════════════════════════
//  ALUNO
// ════════════════════════════════════════════════════════════════════════════
function StudentView({ studentName, initialAvatar, shift, onLogout, isNew, initialBirthDate, initialCpf }) {
  const vw = useViewportWidth();
  // nome/emoji da própria turma (pode ser uma turma extra criada pelo professor, além das 2 padrão)
  const [myTurmas, setMyTurmas] = useState(DEFAULT_TURMAS);
  useEffect(() => { getTurmas().then(t => { if (Array.isArray(t) && t.length) setMyTurmas(t); }); }, []);
  // 🎛️ preferência de como o Nyx interage/explica — perguntada só pra perfil novo, antes até da
  // apresentação do Nyx e do tour, porque cada aluno (mais novo ou mais velho) prefere de um jeito
  const [showNyxPrefs, setShowNyxPrefs] = useState(!!isNew);
  const [nyxPrefs, setNyxPrefs] = useState({ tom:"divertido", estilo:"detalhada" });
  // 🎓 dado sensível pro certificado (data de nascimento/CPF) — só pego uma vez, na criação do perfil,
  // NUNCA exibido em nenhuma tela do aluno depois disso; só o professor vê isso, e só na planilha.
  // Pra quem já tinha perfil (isNew=false), é recarregado do servidor (ver profile-load effect) —
  // sem isso, salvar de novo apagaria o dado já cadastrado.
  const [birthDate, setBirthDate] = useState(isNew ? (initialBirthDate || "") : "");
  const [cpf, setCpf] = useState(isNew ? (initialCpf || "") : "");
  const [showIntro, setShowIntro] = useState(!!isNew);
  // 🌐 sala de linguagens (extra, fora da turma de C#): qual linguagem este aluno escolheu estudar
  // (HTML/CSS/PHP/JS) — null pra qualquer aluno da turma normal, que continua sendo sempre C#
  const isLangRoom = shift === LANG_SHIFT.id;
  const [programmingLanguage, setProgrammingLanguage] = useState(null);
  const [showLangPicker, setShowLangPicker] = useState(false);
  // histórico de linguagens já estudadas (código + resumos arquivados ao trocar de linguagem)
  const [languageHistory, setLanguageHistory] = useState([]);
  const studyLang = isLangRoom ? langById(programmingLanguage) : null;
  const [files, setFiles] = useState([{ name:"Program.cs", code:"" }]);
  const [active, setActive] = useState(0);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [avatar, setAvatar] = useState(initialAvatar || DEFAULT_AVATAR);
  const [feedback, setFeedback] = useState(null);
  const [robotState, setRobotState] = useState("idle");
  const [robotMsg, setRobotMsg] = useState("");
  const [keysToShow, setKeysToShow] = useState([]);
  const [phase, setPhase] = useState("coding");
  const [answers, setAnswers] = useState({});
  const [revealedHints, setRevealedHints] = useState({}); // 💡 dicas da dificuldade adaptativa que o aluno já abriu, por questão
  const [score, setScore] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [keyboardLocked, setKeyboardLockedState] = useState(false);
  const lastProviderRef = useRef("nvidia"); // lembra o último modelo que funcionou, pra próxima análise tentar ele primeiro
  // 🔌 modo offline total: quando a análise ou o "Salvar e Finalizar" não rolam por falta de
  // internet (não uma simples instabilidade), fica marcado aqui pra tentar de novo sozinho assim
  // que a conexão voltar — o aluno não precisa ficar clicando até funcionar
  const pendingAnalyzeRef = useRef(false);
  const pendingSaveRef = useRef(false);
  // erros da última análise (linha sublinhada de vermelho até corrigir) + tour do Nyx explicando cada um
  const [codeErrors, setCodeErrors] = useState([]);
  const [showErrorWalkthrough, setShowErrorWalkthrough] = useState(false);
  const [errorWalkStep, setErrorWalkStep] = useState(0);
  // 🧗 ajuda em níveis: a Nyx não entrega a correção pronta de cara — aponta a região do erro,
  // e só sobe de nível (dica/explicação → correção pronta) se o aluno pedir. Reinicia a cada
  // análise nova (erros diferentes = ajuda começa do zero de novo)
  const [errorHelpLevel, setErrorHelpLevel] = useState({});
  const [dynamicSummary, setDynamicSummary] = useState("");
  const [dynamicActivity, setDynamicActivity] = useState(null);
  const [generatingMsg, setGeneratingMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  // 🔒 professor pode travar o editor de código de toda a turma com um clique (ex: pra pedir
  // atenção durante uma explicação) — fica de olho na mesma cadência devagar/rápido do quiz acima
  useEffect(() => {
    if (!loaded) return;
    let active = true;
    const iv = setInterval(async () => {
      const v = await getKeyboardLock(shift);
      if (active) setKeyboardLockedState(v);
    }, 4000);
    return () => { active = false; clearInterval(iv); };
  }, [loaded, shift]);
  const [connected, setConnected] = useState(null);
  const [justReconnected, setJustReconnected] = useState(false);
  const prevConnectedRef = useRef(null);
  const [finalFeedback, setFinalFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [saveWarn, setSaveWarn] = useState("");
  // tema do fundo: 'dark' | 'light' | cor hex escolhida pelo Nyx
  const [theme, setTheme] = useState("dark");
  // tema de antes de virar Espartano (pra poder voltar) + se já achou o baú do tesouro escondido
  const [themeBeforeSpartan, setThemeBeforeSpartan] = useState(null);
  const [treasureFound, setTreasureFound] = useState(false);
  const [spartanIntroShown, setSpartanIntroShown] = useState(false);
  // tour guiado do Nyx
  const [tourStep, setTourStep] = useState(-1);
  // 🔥 aquecimento do dia: 3 perguntinhas de revisão sobre a aula ANTERIOR, logo que o aluno entra
  const [warmup, setWarmup] = useState(null);           // { questions:[{pergunta, alternativas, correta, explicacao}] }
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [warmupStep, setWarmupStep] = useState(0);
  const [warmupPicked, setWarmupPicked] = useState(null);
  const [warmupCorrect, setWarmupCorrect] = useState(0);
  const [warmupDay, setWarmupDay] = useState(null);     // último dia em que o aquecimento foi concluído (persistido)
  const warmupRequestedRef = useRef(false);
  // 🎁 retrospectiva do mês (estilo "Wrapped"): o professor libera por turno; cada aluno vê a sua uma vez
  const [retroActive, setRetroActive] = useState(null); // id/data da liberação atual do professor (ou null)
  const [retroSeen, setRetroSeen] = useState(null);     // id da última retrospectiva que ESTE aluno já viu (persistido)
  const [showRetro, setShowRetro] = useState(false);
  // 🏟️ torneio da turma (iniciado pelo professor no telão): o aluno responde o quiz da rodada aqui
  // 🎉 quiz estilo Kahoot: sala aberta pelo professor (polling) + minha participação nela
  const [quizRoomInfo, setQuizRoomInfo] = useState(null); // sala ativa lida do servidor (ou null)
  const [quizJoin, setQuizJoin] = useState(null);         // { code, at } quando entrei numa sala (persistido)
  const [quizAnswers, setQuizAnswers] = useState({});     // { qIndex: { opt, at } } (persistido — o professor apura)
  const [showQuizJoin, setShowQuizJoin] = useState(false);
  const [quizCodeInput, setQuizCodeInput] = useState("");
  const [quizCodeError, setQuizCodeError] = useState("");
  const [tourneyInfo, setTourneyInfo] = useState(null);   // estado do torneio lido do servidor
  const [tourneyQuiz, setTourneyQuiz] = useState(null);   // { id, round, opponent, questions[] } do quiz aberto
  const [tourneyStep, setTourneyStep] = useState(0);
  const [tourneyPicked, setTourneyPicked] = useState(null);
  const [tourneyPicks, setTourneyPicks] = useState({}); // { passo: índice ORIGINAL da alternativa escolhida } — a correção é sempre no servidor
  const [tourneySubmitting, setTourneySubmitting] = useState(false);
  const [tourneyAnswer, setTourneyAnswer] = useState(null);   // { id, round, score, at } (persistido — o telão apura)
  const [tourneyClaimed, setTourneyClaimed] = useState(null); // id do torneio cujo prêmio de campeão já foi recebido
  // explicações do Nyx sobre os erros da atividade (passo a passo, num modal)
  const [errorSections, setErrorSections] = useState([]);
  const [errorEncouragement, setErrorEncouragement] = useState("");
  const [showErrorExplain, setShowErrorExplain] = useState(false);
  const [explainFailMsg, setExplainFailMsg] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [fsMsg, setFsMsg] = useState("");
  // avaliação da aula (aluno → professor)
  const [classRating, setClassRating] = useState(0);
  const [classText, setClassText] = useState("");
  const [classSent, setClassSent] = useState(false);
  const [classFb, setClassFb] = useState(null);
  // aviso do professor + dica automática de "preste atenção"
  const [nudge, setNudge2] = useState(null);
  const [nudgeSeenAt, setNudgeSeenAt] = useState(0);
  const [idleHint, setIdleHint] = useState(false);
  // prova (exame)
  const [examInfo, setExamInfo] = useState({ status: 'idle' });
  const [examReady, setExamReady] = useState(false);
  const [examScore, setExamScore] = useState(null);
  const [examAnswers, setExamAnswers] = useState({});
  const [examDone, setExamDone] = useState(false);
  const [examCurrentQ, setExamCurrentQ] = useState(0);
  // anti-cola: saídas da aba durante a prova (cada uma desconta 10 pts) + defesa do aluno no fim
  const [examExits, setExamExits] = useState(0);
  const [examScoreRaw, setExamScoreRaw] = useState(null);
  const [examAppeal, setExamAppeal] = useState(null);
  // aluno já viu a tela de nota da prova e voltou pra plataforma (não mexe em examDone)
  const [examScoreSeen, setExamScoreSeen] = useState(false);
  // alunos do Modo Guiado escolhem se querem fazer a prova ou continuar no Modo Guiado —
  // null = ainda não escolheu, true = vai fazer, false = prefere não fazer
  const [examOptIn, setExamOptIn] = useState(null);
  // quem é do Modo Guiado e topou participar faz uma versão bem mais simples, sobre os próprios
  // blocos do Modo Guiado — é só participação, NÃO vira nota oficial (não entra no boletim/ranking)
  const [examGuidedMode, setExamGuidedMode] = useState(false);
  const [examGuidedQuestions, setExamGuidedQuestions] = useState(null);
  const [examGuidedAnswers, setExamGuidedAnswers] = useState({});
  const [examGuidedCurrentQ, setExamGuidedCurrentQ] = useState(0);
  const [examGuidedCorrect, setExamGuidedCorrect] = useState(0);
  // ✋ pedir ajuda: acende o tile do aluno no monitoramento do professor
  const [helpAt, setHelpAt] = useState(null);
  // 🙋 pedir um parceiro de código sozinho (sem esperar o professor notar) — o professor ainda faz
  // o pareamento de verdade (não deixa aluno escolher/parear direto com outro, por segurança)
  const [wantsPartner, setWantsPartner] = useState(null);
  // 🤝 parceiro de código: pareamento sugerido/aprovado pelo professor entre um aluno com dificuldade
  // (ajudado) e um colega livre (ajudante). partnerHelped = registro em que EU sou o ajudado;
  // partnerHelping = registro em que EU fui escalado pra ajudar um colega (vejo o código dele, só leitura)
  const [partnerHelped, setPartnerHelped] = useState(null);
  const [partnerHelping, setPartnerHelping] = useState(null);
  const [partnerToast, setPartnerToast] = useState("");
  const [showPartnerHelp, setShowPartnerHelp] = useState(false);
  const [partnerPeerCode, setPartnerPeerCode] = useState(null);
  const [partnerViewActive, setPartnerViewActive] = useState(0);
  const [partnerNote, setPartnerNote] = useState(""); // descrição curta do que foi ajudado, opcional
  const partnerResolvedSeenRef = useRef(false);
  // 👾 chefão da turma ativo (evento do telão) — aqui só aparece o aviso motivador
  const [bossInfo, setBossInfo] = useState(null);
  // 🕐 horário automático de aula (do turno) + vistoria (libera este aluno específico fora do horário)
  const [mySchedule, setMySchedule] = useState({});
  const [myAllowWeekend, setMyAllowWeekend] = useState(false);
  // 🔒 por padrão o editor trava enquanto o Nyx analisa o código (evita editar em cima da análise
  // em andamento) — o professor pode liberar isso pro aluno continuar digitando durante a análise
  const [lockDuringAnalysis, setLockDuringAnalysis] = useState(true);
  const [myInspection, setMyInspection] = useState(false);
  const [myClassDays, setMyClassDays] = useState([]);
  const [myContentNames, setMyContentNames] = useState({});
  const [streakCount, setStreakCount] = useState(0);
  const [showPerformance, setShowPerformance] = useState(false);
  // ⚠️ erro em produção: avisa o professor sem o aluno precisar reclamar (espelha o pedido de ajuda)
  const [errorAt, setErrorAt] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const lastErrorReportRef = useRef(0);
  // evita que dois ticks (12s cada) processem o código enviado pelo professor ao mesmo tempo
  // enquanto a mesclagem por IA do tick anterior ainda está em andamento
  const codeSendHandledRef = useRef(false);
  // 📋 retomada da aula passada (dispensável; lembrada por dia no navegador, por ALUNO — o
  // notebook da carreta é compartilhado entre vários alunos no mesmo dia, então a chave não pode
  // valer só pra data, senão o primeiro que dispensar esconde o aviso dos próximos também)
  const [recapDismissed, setRecapDismissed] = useState(() => {
    try { return localStorage.getItem(`nyx_recap_${todayKey()}_${shift}_${studentName}`) === "1"; } catch { return false; }
  });
  // 😊 check-in emocional: mesmo esquema de dispensa por dia+turno+aluno dos outros avisos (notebook
  // compartilhado entre vários alunos no mesmo dia)
  const [checkinDismissed, setCheckinDismissed] = useState(() => {
    try { return localStorage.getItem(`nyx_checkin_${todayKey()}_${shift}_${studentName}`) === "1"; } catch { return false; }
  });
  const dismissCheckin = () => { setCheckinDismissed(true); try { localStorage.setItem(`nyx_checkin_${todayKey()}_${shift}_${studentName}`, "1"); } catch {} };
  const [breakEndMsg, setBreakEndMsg] = useState("");
  const breakEndNotifiedRef = useRef(null);
  const breakStartNotifiedRef = useRef(null);
  // 📋 falta a justificar + horário do 1º acesso do dia (pra marcar atrasado na chamada)
  const [justifications, setJustifications] = useState({});
  const attendanceFirstRef = useRef({});
  const createdAtRef = useRef(Date.now());
  const [showJustify, setShowJustify] = useState(false);
  // ⌨️ tutorial de teclado (ABNT2): sempre disponível + pode ser "empurrado" pelo professor
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardDone, setKeyboardDone] = useState(false);
  const kbLaunchSeenRef = useRef(null);
  // 🌟 portfólio público: opt-in do próprio aluno — gera um link (sem dados sensíveis) pra
  // compartilhar avatar/conquistas/progresso com a família; o professor pode desativar se precisar
  const [portfolioPublic, setPortfolioPublic] = useState(false);
  // quando o opt-in foi ligado — o link expira sozinho 60 dias depois, pra não ficar aberto pra
  // sempre sem ninguém lembrar (ver PORTFOLIO_EXPIRY_MS em PublicPages.jsx)
  const [portfolioActivatedAt, setPortfolioActivatedAt] = useState(null);
  const [portfolioCopyMsg, setPortfolioCopyMsg] = useState("");
  const [showSelfSupport, setShowSelfSupport] = useState(false);
  // 🏆 hall da fama: placas de cidades anteriores
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [hallEntries, setHallEntries] = useState([]);
  // relógio próprio (1x por segundo) só pra a contagem regressiva do intervalo/fim de aula ficar fluida
  const [clockNow, setClockNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setClockNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  const [kbSuggestDismissed, setKbSuggestDismissed] = useState(() => {
    try { return localStorage.getItem(`nyx_kbsuggest_${todayKey()}_${shift}_${studentName}`) === "1"; } catch { return false; }
  });
  // 🏁 corrida de digitação
  const [showRace, setShowRace] = useState(false);
  const [typingBest, setTypingBest] = useState(null);
  const [typingRewardDay, setTypingRewardDay] = useState(null);
  // 🧠 teste de conhecimento por conta própria — disponível a qualquer momento, sem finalizar a aula
  const [showKnowledgeTest, setShowKnowledgeTest] = useState(false);
  const [knowledgeTestRewardDay, setKnowledgeTestRewardDay] = useState(null);
  // 🔥 sequência de presença: último dia em que a recompensa da sequência já foi dada (evita
  // pagar de novo a cada autosave do mesmo dia) + aviso pra mostrar o dia/pontos ganhos — sempre
  // olhando pra frente ("dia N da sequência"), nunca destacando quando uma sequência quebrou
  const [streakRewardDay, setStreakRewardDay] = useState(null);
  const [streakToast, setStreakToast] = useState("");
  // 🩺 saúde do Nyx pro aluno também ver — mesmo aviso "Reconectando" e os pontinhos por
  // modelo (Nemotron/Laguna) que já existiam só no painel do professor
  const [aiDown, setAiDown] = useState(false);
  const [providerHealth, setProviderHealth] = useState({ nvidia:null, laguna:null });
  useEffect(() => {
    let active = true;
    const check = async () => {
      const [h, nvidia, laguna] = await Promise.all([getAiHealth(), getAiHealthByProvider("nvidia"), getAiHealthByProvider("laguna")]);
      if (!active) return;
      // só acende "Reconectando Nyx" depois de 2 falhas SEGUIDAS (ver reportAiHealth em storage.js)
      setAiDown(!!h && h.ok === false && (h.streak || 1) >= 2 && Date.now() - h.at < 5 * 60 * 1000);
      setProviderHealth({ nvidia, laguna });
    };
    check();
    const iv = setInterval(check, 10000);
    return () => { active = false; clearInterval(iv); };
  }, []);
  // 🎁 presente misterioso do dia (na tela de atividade concluída)
  const [giftLastClaim, setGiftLastClaim] = useState(null);
  const [giftReveal, setGiftReveal] = useState(null);
  // loja do Nyx: nyxPoints = pontos GANHOS (ranking/meta usam este); nyxSpent = total gasto na loja
  // carteira disponível = nyxPoints - nyxSpent; nyxOwned = itens comprados
  const [nyxPoints, setNyxPoints] = useState(0);
  const [nyxSpent, setNyxSpent] = useState(0);
  const [nyxOwned, setNyxOwned] = useState([]);
  const [nyxGear, setNyxGear] = useState(DEFAULT_NYX_GEAR);
  const [showNyxShop, setShowNyxShop] = useState(false);
  // anti-cola geral: true quando o professor está escrevendo em "Meu código" AGORA (não faz muito tempo)
  const [teacherWriting, setTeacherWriting] = useState(false);
  const [duelWins, setDuelWins] = useState(0);
  // anti-cola: quantas linhas não-vazias o aluno colou (Ctrl+V/menu) no próprio editor, cumulativo —
  // usado pra tirar do cálculo da conquista "Arquiteto de Código" o que ele colou pronto em vez de escrever
  const [pastedLines, setPastedLines] = useState(0);
  const [showFreeBuild, setShowFreeBuild] = useState(false);
  const [weeklyChallenge, setWeeklyChallenge] = useState(null);
  // conquistas, ranking, meta da turma, duelo, sons
  const [achievements, setAchievements] = useState([]);
  const [newAchievement, setNewAchievement] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [classPointsSum, setClassPointsSum] = useState(0);
  const [muted, setMuted] = useState(() => loadSoundsMuted());
  const [showDuel, setShowDuel] = useState(false);
  const [showTeamDuel, setShowTeamDuel] = useState(false);
  const [duelDoc, setDuelDoc] = useState(null);
  // travas acionadas pelo professor (zek = tela bloqueada; zeker = duelos bloqueados)
  const [nyxLocks, setNyxLocksState] = useState({ zek: false, zeker: false });
  // quando a atividade de hoje foi concluída (mantém o status até as 9h do dia seguinte)
  const [doneAt, setDoneAt] = useState(null);
  // histórico por dia: notas das atividades e resumos das aulas (caderno)
  const [scoreHistory, setScoreHistory] = useState({});
  // histórico por dia: quantas vezes a análise do Nyx encontrou erro no código (usado pro Hall da
  // Fama valorizar quem escreve certo, não só quem tira nota alta)
  const [errorHistory, setErrorHistory] = useState({});
  const [summaryHistory, setSummaryHistory] = useState({});
  // versão detalhada do resumo (pedida sob demanda — alguns alunos preferem o resumo mais completo)
  const [detailedSummary, setDetailedSummary] = useState("");
  const [detailedSummaryHistory, setDetailedSummaryHistory] = useState({});
  const [summaryView, setSummaryView] = useState("simples"); // "simples" | "detalhado"
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFailMsg, setDetailFailMsg] = useState("");
  const [showNotebook, setShowNotebook] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [showGamesMenu, setShowGamesMenu] = useState(false);
  const [showNextSteps, setShowNextSteps] = useState(false);
  // seletor de voz da leitura em voz alta (🗣️ no cabeçalho)
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  // seletor de cor do fundo (🎨 no cabeçalho) — direto, sem passar pelo chat do Nyx
  const [showColorPicker, setShowColorPicker] = useState(false);
  // festa quando a turma sobe de nível na meta coletiva
  const [goalParty, setGoalParty] = useState(null);
  const goalLevelRef = useRef(null);

  // text-to-speech para acessibilidade
  const { speak, pause, resume, stop: stopSpeech, isSpeaking, isSupported: ttsSupported } = useSpeech();
  const [currentSpeakingFor, setCurrentSpeakingFor] = useState(null);
  // accessibility: large UI mode for motor-impaired students
  const [largeUiMode, setLargeUiMode] = useState(() => {
    try { return localStorage.getItem("nyx_large_ui") === "1"; } catch { return false; }
  });
  const uiScale = largeUiMode ? 1.3 : 1;
  // modo guiado (acessibilidade): ligado pelo professor por aluno — troca o editor por blocos clicáveis
  const [accessMode, setAccessModeState] = useState(false);
  // perfis de apoio (educação inclusiva), marcados pelo professor por aluno:
  // sensorial = modo calmo · foco = esconde competição · leitura = texto espaçado · ritmo = atividade reduzida
  const [supportFlags, setSupportFlags] = useState({});
  // o PRÓPRIO aluno também pode pedir qualquer um desses ajustes pra si mesmo, sem depender do
  // professor notar — fica guardado no perfil dele (mesmo canal sem senha que já salva nota/fase/
  // código), então funciona igual ao pedir ajuda: só o aluno decide, o professor só acompanha.
  // O efeito é sempre a UNIÃO dos dois (professor OU aluno liga = ajuste ativo)
  const [selfSupport, setSelfSupport] = useState({});
  const calmMode = !!supportFlags.sensorial || !!selfSupport.sensorial;
  const focusMode = !!supportFlags.foco || !!selfSupport.foco;
  const easyRead = !!supportFlags.leitura || !!selfSupport.leitura;
  const ownPace = !!supportFlags.ritmo || !!selfSupport.ritmo;
  const highContrast = !!supportFlags.visual || !!selfSupport.visual;
  // botão de "ouvir em voz alta" só aparece pra quem realmente precisa (leitura fácil, alto
  // contraste ou apoio motora) — pra não poluir a tela de quem não pediu esse ajuste. A fala
  // PEDAGÓGICA deliberada (Modo Guiado, tutorial de teclado) continua sempre ativa: não é um
  // botão de conveniência, é o próprio jeito da lição ser ensinada
  const ttsAllowed = ttsSupported && (easyRead || highContrast || !!supportFlags.motora || !!selfSupport.motora);
  // revisão final do tutorial de teclado fica mais leve (menos perguntas, mais concretas) pra quem
  // tem qualquer apoio marcado — o Modo Guiado nem chega a ver essa revisão (sai do treino direto)
  const kbReviewEasy = calmMode || focusMode || easyRead || ownPace || highContrast || !!supportFlags.motora || !!selfSupport.motora;
  useEffect(() => { setSoundsCalm(calmMode); return () => setSoundsCalm(false); }, [calmMode]);
  const [guidedBlocks, setGuidedBlocks] = useState([]);
  const [pendingBlock, setPendingBlock] = useState(null);
  // arrastar e soltar os blocos do Modo Guiado pra reordenar (mais tátil que os botões ⬆️⬇️, que continuam
  // funcionando junto — quem não conseguir arrastar com precisão ainda reordena pelos botões)
  const [guidedDragIdx, setGuidedDragIdx] = useState(null);
  const [guidedOverIdx, setGuidedOverIdx] = useState(null);
  const [guidedJustDropped, setGuidedJustDropped] = useState(null);
  const guidedRowRefs = useRef([]);
  const guidedDragFromRef = useRef(null);
  // "Nyx te ensina" no Modo Guiado: mini-lições geradas sob demanda (C# explicado com exemplos de jogos)
  const [guidedLessons, setGuidedLessons] = useState([]);
  const [guidedLessonLoading, setGuidedLessonLoading] = useState(false);

  const sessionStart = useRef(Date.now());
  const stateRef = useRef({});
  const attendanceRef = useRef({});
  // "última versão que sabemos que está no servidor" pros campos que outra aba/dispositivo do MESMO
  // aluno (ou o professor, via ações que não passam pelo setScoreFix) também pode alterar — usado
  // pelo persist() pra saber se o valor local é uma edição ainda não salva (mantém) ou só uma cópia
  // desatualizada de quando essa aba carregou (aí busca o mais recente antes de sobrescrever tudo)
  const lastSyncedRef = useRef({});
  // "foto" do código no primeiro acesso do dia: o resumo da aula cobre só o que foi escrito DEPOIS dela
  const daySnapshotRef = useRef(null);
  // "foto" do código no momento em que o ÚLTIMO resumo foi gerado — se o professor passar mais
  // código depois e o aluno salvar de novo, o próximo resumo é uma CONTINUAÇÃO (só o que é novo),
  // não substitui o que já tinha sido criado antes
  const summarySnapshotRef = useRef(null);
  const activeCode = files[active]?.code || "";

  useEffect(() => {
    stateRef.current = { files, code:activeCode, avatar, phase, score, answers, feedback, dynamicActivity, dynamicSummary, finalFeedback, classFeedback: classFb, examReady, examScore, examAnswers, examDone, examExits, examScoreRaw, examAppeal, examScoreSeen, examOptIn, examGuidedMode, examGuidedQuestions, examGuidedAnswers, examGuidedCorrect, helpAt, wantsPartner, selfSupport, typingBest, typingRewardDay, knowledgeTestRewardDay, streakRewardDay, giftLastClaim, theme, themeBeforeSpartan, treasureFound, spartanIntroShown, warmupDay, retroSeen, tourneyAnswer, tourneyClaimed, nyxPoints, nyxSpent, nyxOwned, nyxGear, nyxPrefs, birthDate, cpf, achievements, doneAt, scoreHistory, errorHistory, summaryHistory, detailedSummary, detailedSummaryHistory, duelWins, pastedLines, weeklyChallenge, guidedBlocks, guidedLessons, justifications, keyboardDone, portfolioPublic, portfolioActivatedAt, errorAt, errorMsg, programmingLanguage, languageHistory, quizJoin, quizAnswers };
  });

  // se o professor bloquear os duelos com o modal aberto, fecha na hora
  useEffect(() => { if (nyxLocks.zeker && showDuel) setShowDuel(false); }, [nyxLocks.zeker, showDuel]);
  useEffect(() => { if (nyxLocks.zeker && showTeamDuel) setShowTeamDuel(false); }, [nyxLocks.zeker, showTeamDuel]);

  // ── início do intervalo: som suave uma vez só por intervalo ──
  const classStatusNow = classStatus(mySchedule, myAllowWeekend);
  useEffect(() => {
    const bStart = mySchedule?.breakStart && mySchedule?.breakMin ? `${todayKey()}-${mySchedule.breakStart}-${mySchedule.breakMin}` : null;
    if (!bStart) return;
    if (classStatusNow.inBreak && breakStartNotifiedRef.current !== bStart) {
      breakStartNotifiedRef.current = bStart;
      playSound("recesso");
    }
  }, [classStatusNow.inBreak, mySchedule?.breakStart, mySchedule?.breakMin]);

  // ── fim do intervalo: sininho + aviso, uma vez só por intervalo (não repete a cada nova checagem) ──
  useEffect(() => {
    const bEnd = mySchedule?.breakStart && mySchedule?.breakMin ? `${todayKey()}-${mySchedule.breakStart}-${mySchedule.breakMin}` : null;
    if (!bEnd) return;
    if (!classStatusNow.inBreak && classStatusNow.configured && breakEndNotifiedRef.current !== bEnd) {
      // só dispara se JÁ passou do horário do intervalo hoje (evita disparar antes de começar)
      const bStartMin = hmToMin(mySchedule.breakStart);
      if (bStartMin != null && nowMin() >= bStartMin + Number(mySchedule.breakMin || 0)) {
        breakEndNotifiedRef.current = bEnd;
        playSound("bell");
        setBreakEndMsg("🔔 Intervalo acabou! Hora de voltar aos estudos.");
        setTimeout(() => setBreakEndMsg(""), 8000);
      }
    }
  }, [classStatusNow.inBreak, classStatusNow.configured, mySchedule?.breakStart, mySchedule?.breakMin]);


  const persist = useCallback(async (extra = {}) => {
    const s = { ...stateRef.current };
    // antes de sobrescrever o registro inteiro, busca o que está salvo AGORA no servidor: se outra
    // aba/dispositivo do MESMO aluno (ou uma correção do professor que não passou pelo setScoreFix)
    // mudou um desses campos depois que esta aba carregou, e esta aba não tem uma edição própria
    // pendente neles, adota o valor do servidor — sem isso, o autosave periódico desta aba (a cada
    // 12s) apagaria silenciosamente o que a outra sessão acabou de salvar
    let latest = null;
    // 🔍 vistoria fora do horário: o professor só liberou ESTE aluno pra inspecionar/corrigir o
    // perfil, sem estar dando aula de verdade — nenhuma nota, ponto ou presença pode "vazar" dessa
    // janela pro perfil real. Busca o horário/vistoria FRESCOS aqui (não confia no estado React
    // mySchedule/myInspection, que na primeira chamada de persist() logo após o login ainda pode
    // não ter carregado — se confiasse, essa primeira chamada marcaria presença antes mesmo de saber
    // que era vistoria, e a presença já marcada nunca mais seria desfeita).
    let vistoriaOnly = false;
    let meta = null; // meta do professor (turma/calendário) — usado mais abaixo pra premiar a sequência de presença
    try {
      const [latestRes, metaRes, insp] = await Promise.all([
        getStudent(shift, studentName),
        getTeacherMeta(),
        getInspection(shift, studentName),
      ]);
      latest = latestRes;
      meta = metaRes;
      const csNow = classStatus((meta.schedule || {})[shift] || {}, !!meta.allowWeekend);
      vistoriaOnly = csNow.configured && !csNow.open && insp;
      if (latest) {
        const applyIfUnedited = (field, setter, compareNorm = (v) => v, materialize = compareNorm) => {
          if (field in extra) return; // esta chamada já está escrevendo um valor novo de propósito
          if (compareNorm(s[field]) !== lastSyncedRef.current[field]) return; // edição local pendente — não sobrescreve
          const serverCompare = compareNorm(latest[field]);
          if (serverCompare === lastSyncedRef.current[field]) return; // servidor não mudou, nada a adotar
          const val = materialize(latest[field]);
          s[field] = val;
          setter(val);
        };
        applyIfUnedited("nyxPoints", setNyxPoints, (v) => v || 0);
        applyIfUnedited("achievements", setAchievements, (v) => JSON.stringify(v || []), (v) => v || []);
        applyIfUnedited("examScore", setExamScore, (v) => v ?? null);
        applyIfUnedited("examDone", setExamDone, (v) => !!v);
        applyIfUnedited("portfolioPublic", setPortfolioPublic, (v) => !!v);
        applyIfUnedited("score", setScore, (v) => v ?? null);
        applyIfUnedited("scoreHistory", setScoreHistory, (v) => JSON.stringify(v || {}), (v) => v || {});
        applyIfUnedited("errorHistory", setErrorHistory, (v) => JSON.stringify(v || {}), (v) => v || {});
        applyIfUnedited("justifications", setJustifications, (v) => JSON.stringify(v || {}), (v) => v || {});
      }
    } catch {} // sem internet ou ainda sem registro salvo: segue só com o que já tinha localmente
    // trava nota/pontos/conquistas no que já estava salvo no servidor, ignorando qualquer mudança
    // local (mesmo que já tenha vindo em "extra") — cobre a atividade e qualquer outra fonte de
    // pontos de uma vez só, sem precisar mexer em cada uma separadamente
    if (vistoriaOnly && latest) {
      s.nyxPoints = latest.nyxPoints || 0;
      s.scoreHistory = latest.scoreHistory || {};
      s.achievements = latest.achievements || [];
      s.score = latest.score ?? null;
      delete extra.nyxPoints; delete extra.scoreHistory; delete extra.achievements; delete extra.score;
    }
    // presença do dia: "present" se já fez algo de verdade hoje, senão "idle" (entrou mas parado) —
    // mas nunca durante uma vistoria fora do horário (só observação, não conta como aula de verdade)
    const tk = todayKey();
    const didWork = !vistoriaOnly && ((s.code && s.code.trim().length >= 10) || (s.phase && s.phase !== "coding") || (s.score != null) || (s.answers && Object.keys(s.answers).length > 0));
    // o dia em que o perfil foi criado conta como presença automática, mesmo que o aluno não
    // escreva nada nesse primeiro acesso (ex: dia de apresentação/cadastro) — vale tanto pra quem
    // começa no primeiro dia de aula quanto pra quem entra na turma depois (dias ANTERIORES ao
    // cadastro dele já não contam como falta em nenhum lugar — ver dayCell/boletim/tendência —
    // então a partir do momento que ele entra, o dia de entrada em si também não pode virar falta)
    const isEnrollmentDay = !vistoriaOnly && tk === dateKeyOf(createdAtRef.current);
    attendanceRef.current = { ...attendanceRef.current, [tk]: (didWork || isEnrollmentDay || attendanceRef.current[tk] === "present") ? "present" : "idle" };
    // guarda o horário do PRIMEIRO acesso de hoje (uma vez só) — usado pra marcar "atrasado" na chamada
    if (!attendanceFirstRef.current[tk]) attendanceFirstRef.current = { ...attendanceFirstRef.current, [tk]: Date.now() };
    // 🔥 sequência de presença: paga só quando a presença de HOJE vira "present" pela primeira vez
    // (não a cada autosave do mesmo dia) — falta justificada congela a sequência em vez de quebrar
    // (computeStreak cuida disso), e a mensagem é sempre "dia N da sequência", nunca "você perdeu" —
    // nunca soma nada durante vistoria fora do horário
    // só existe "dia N da sequência" se hoje estiver mesmo marcado como dia de aula no calendário
    // da turma — sem isso computeStreak devolve 0 e não tem ponto fantasma
    const streakLen = (!vistoriaOnly && attendanceRef.current[tk] === "present" && s.streakRewardDay !== tk)
      ? computeStreak(attendanceRef.current, turmaCalendar(meta, shift).classDays, s.justifications) : 0;
    if (streakLen > 0) {
      const gained = streakPointsFor(streakLen);
      s.nyxPoints = (s.nyxPoints || 0) + gained;
      s.streakRewardDay = tk;
      setNyxPoints(s.nyxPoints);
      setStreakRewardDay(tk);
      setStreakToast(`🔥 Sequência: dia ${streakLen} · +${gained} ponto${gained===1?"":"s"} do Nyx!`);
      setTimeout(() => setStreakToast(""), 8000);
    }
    const ok = await saveStudent(shift, studentName, {
      name: studentName,
      shift: shift || "sem-turno",
      avatar: s.avatar || DEFAULT_AVATAR,
      joinedAt: sessionStart.current,
      createdAt: createdAtRef.current,
      lastSeen: Date.now(),
      attendance: attendanceRef.current,
      attendanceFirst: attendanceFirstRef.current,
      justifications: s.justifications || {},
      keyboardDone: s.keyboardDone || false,
      portfolioPublic: s.portfolioPublic || false,
      portfolioActivatedAt: s.portfolioActivatedAt || null,
      files: s.files || [{name:"Program.cs",code:""}],
      code: s.code || "",
      phase: s.phase,
      score: s.score,
      answers: s.answers || {},
      dynamicActivity: s.dynamicActivity || null,
      dynamicSummary: s.dynamicSummary || null,
      feedback: s.feedback || null,
      hasError: s.feedback ? !s.feedback.ok : false,
      finalFeedback: s.finalFeedback || "",
      classFeedback: s.classFeedback || null,
      examReady: s.examReady || false,
      examScore: s.examScore ?? null,
      examAnswers: s.examAnswers || {},
      examDone: s.examDone || false,
      examExits: s.examExits || 0,
      examScoreRaw: s.examScoreRaw ?? null,
      examAppeal: s.examAppeal || null,
      examScoreSeen: s.examScoreSeen || false,
      examOptIn: typeof s.examOptIn === "boolean" ? s.examOptIn : null,
      examGuidedMode: s.examGuidedMode || false,
      examGuidedQuestions: s.examGuidedQuestions || null,
      examGuidedAnswers: s.examGuidedAnswers || {},
      examGuidedCorrect: s.examGuidedCorrect || 0,
      helpAt: s.helpAt || null,
      wantsPartner: s.wantsPartner || null,
      selfSupport: s.selfSupport || {},
      errorAt: s.errorAt || null,
      errorMsg: s.errorMsg || "",
      typingBest: s.typingBest || null,
      typingRewardDay: s.typingRewardDay || null,
      knowledgeTestRewardDay: s.knowledgeTestRewardDay || null,
      streakRewardDay: s.streakRewardDay || null,
      giftLastClaim: s.giftLastClaim || null,
      theme: s.theme || "dark",
      themeBeforeSpartan: s.themeBeforeSpartan || null,
      treasureFound: s.treasureFound || false,
      spartanIntroShown: s.spartanIntroShown || false,
      warmupDay: s.warmupDay || null,
      retroSeen: s.retroSeen || null,
      tourneyAnswer: s.tourneyAnswer || null,
      tourneyClaimed: s.tourneyClaimed || null,
      nyxPoints: s.nyxPoints || 0,
      nyxSpent: s.nyxSpent || 0,
      nyxOwned: s.nyxOwned || [],
      nyxGear: s.nyxGear || DEFAULT_NYX_GEAR,
      nyxPrefs: s.nyxPrefs || { tom:"divertido", estilo:"detalhada" },
      birthDate: s.birthDate || "",
      cpf: s.cpf || "",
      achievements: s.achievements || [],
      duelWins: s.duelWins || 0,
      pastedLines: s.pastedLines || 0,
      weeklyChallenge: s.weeklyChallenge || null,
      doneAt: s.doneAt || null,
      daySnapshot: daySnapshotRef.current || null,
      summarySnapshot: summarySnapshotRef.current || null,
      scoreHistory: s.scoreHistory || {},
      errorHistory: s.errorHistory || {},
      summaryHistory: s.summaryHistory || {},
      detailedSummary: s.detailedSummary || null,
      detailedSummaryHistory: s.detailedSummaryHistory || {},
      guidedBlocks: s.guidedBlocks || [],
      guidedLessons: s.guidedLessons || [],
      programmingLanguage: s.programmingLanguage || null,
      languageHistory: s.languageHistory || [],
      quizJoin: s.quizJoin || null,
      quizAnswers: s.quizAnswers || {},
      ...extra,
    });
    if (ok) {
      const finalOf = (field, normalize) => normalize(field in extra ? extra[field] : s[field]);
      lastSyncedRef.current = {
        nyxPoints: finalOf("nyxPoints", (v) => v || 0),
        achievements: finalOf("achievements", (v) => JSON.stringify(v || [])),
        examScore: finalOf("examScore", (v) => v ?? null),
        examDone: finalOf("examDone", (v) => !!v),
        portfolioPublic: finalOf("portfolioPublic", (v) => !!v),
        score: finalOf("score", (v) => v ?? null),
        scoreHistory: finalOf("scoreHistory", (v) => JSON.stringify(v || {})),
        errorHistory: finalOf("errorHistory", (v) => JSON.stringify(v || {})),
        justifications: finalOf("justifications", (v) => JSON.stringify(v || {})),
      };
    }
    setConnected(ok);
    return ok;
  }, [studentName, shift]);

  // 📶 resiliência de internet: quando a conexão VOLTA depois de cair, re-salva na hora (sem
  // esperar o próximo tick) e mostra rapidinho o "tudo salvo"; os eventos do navegador aceleram
  // a detecção da queda/volta pra não depender só do heartbeat de 3s
  useEffect(() => {
    const was = prevConnectedRef.current;
    prevConnectedRef.current = connected;
    if (was === false && connected === true) {
      setJustReconnected(true);
      const t = setTimeout(() => setJustReconnected(false), 6000);
      return () => clearTimeout(t);
    }
  }, [connected]);
  useEffect(() => {
    const onOffline = () => setConnected(false);
    const onOnline = () => { persist(); };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => { window.removeEventListener("offline", onOffline); window.removeEventListener("online", onOnline); };
  }, [persist]);

  // 🌐 sala de linguagens: depois da preferência do Nyx (e antes da apresentação/tour), quem ainda
  // não escolheu uma linguagem pra estudar (HTML/CSS/PHP/JS) vê a tela de escolha
  useEffect(() => {
    if (!loaded || !isLangRoom || showNyxPrefs) return;
    setShowLangPicker(!programmingLanguage);
  }, [loaded, isLangRoom, showNyxPrefs, programmingLanguage]);

  // 👁️ prévia ao vivo (só HTML/CSS/JS, PHP precisa de servidor): recalcula com um pequeno atraso
  // pra não recarregar o iframe a cada tecla digitada
  const [showPreview, setShowPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState("");
  useEffect(() => {
    if (!showPreview || !studyLang?.preview) return;
    const t = setTimeout(() => setPreviewDoc(buildPreviewDoc(files, programmingLanguage)), 400);
    return () => clearTimeout(t);
  }, [showPreview, studyLang, files, programmingLanguage]);

  const chooseLanguage = async (langId) => {
    const lang = langById(langId);
    if (!lang) return;
    const newFiles = [{ name: lang.fileName, code: lang.starter }];
    setProgrammingLanguage(langId);
    setFiles(newFiles);
    setActive(0);
    setShowLangPicker(false);
    await persist({ programmingLanguage: langId, files: newFiles, code: lang.starter });
  };

  // 🔁 trocar de linguagem: arquiva o código e os resumos da linguagem atual no histórico (igual o
  // caderno de resumos) e volta pra tela de escolha, começando do zero na próxima linguagem
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const switchLanguage = async () => {
    const archived = { language: programmingLanguage, files: files.map(f => ({ ...f })), summaryHistory, detailedSummaryHistory, endedAt: Date.now() };
    const newHistory = [...languageHistory, archived];
    setLanguageHistory(newHistory);
    setProgrammingLanguage(null);
    setFiles([{ name:"Program.cs", code:"" }]);
    setSummaryHistory({});
    setDetailedSummaryHistory({});
    setDynamicSummary(""); setDynamicActivity(null); setAnswers({}); setRevealedHints({}); setScore(null); setDoneAt(null);
    setPhase("coding");
    setShowSwitchConfirm(false);
    setShowLangPicker(true);
    await persist({
      languageHistory: newHistory, programmingLanguage: null, files: [{ name:"Program.cs", code:"" }], code: "",
      summaryHistory: {}, detailedSummaryHistory: {}, dynamicSummary: null, dynamicActivity: null, answers: {},
      score: null, doneAt: null, phase: "coding",
    });
  };

  // 🗺️ poliglota: junta a linguagem atual + todas as já arquivadas no histórico — se cobrir as 4, desbloqueia
  useEffect(() => {
    if (!isLangRoom) return;
    const distinct = new Set([...languageHistory.map(h => h.language), programmingLanguage].filter(Boolean));
    if (distinct.size >= STUDY_LANGUAGES.length) unlockAchievement("poliglota");
  }, [isLangRoom, languageHistory, programmingLanguage]);

  // 🎉 quiz: fica de olho se o professor abriu uma sala — enquanto tiver sala, o botão brilhante
  // aparece; depois que eu entro, esse mesmo polling move minha tela junto com a do professor
  useEffect(() => {
    if (!loaded) return;
    let active = true;
    let timer = null;
    // enquanto NÃO tem sala aberta, checa devagar (a maior parte do dia não tem quiz rolando);
    // assim que uma sala existe, acelera pra manter a experiência ao vivo do jogo
    const check = async () => {
      if (!active) return;
      const r = await getQuizRoom(shift);
      if (!active) return;
      setQuizRoomInfo(r);
      timer = setTimeout(check, r ? 2500 : 10000);
    };
    check();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [loaded]);

  const joinQuiz = async () => {
    if (!quizRoomInfo) return;
    if (quizCodeInput.trim() !== quizRoomInfo.code) { setQuizCodeError("Código errado! Confere no telão e tenta de novo."); return; }
    const join = { code: quizRoomInfo.code, at: Date.now() };
    setQuizJoin(join);
    setQuizAnswers({});
    setShowQuizJoin(false);
    setQuizCodeInput(""); setQuizCodeError("");
    playSound("enter");
    await persist({ quizJoin: join, quizAnswers: {} });
  };

  const answerQuiz = async (optIdx) => {
    const room = quizRoomInfo;
    if (!room || room.status !== "question") return;
    const qi = room.qIndex;
    if (quizAnswers[qi] != null) return; // já respondeu esta pergunta
    const startedAt = (room.startedAts || {})[qi];
    if (startedAt == null || Date.now() > startedAt + quizSecsOf(room) * 1000) return; // tempo esgotado
    const next = { ...quizAnswers, [qi]: { opt: optIdx, at: Date.now() } };
    setQuizAnswers(next);
    playSound("click");
    await persist({ quizAnswers: next });
  };

  const leaveQuiz = async () => {
    setQuizJoin(null);
    setQuizAnswers({});
    await persist({ quizJoin: null, quizAnswers: {} });
  };

  // 🤝 parceiro de código: cada papel (ajudante/ajudado) tem um teto de recompensas por semana, pra
  // não virar um jeito de farmar pontos combinando pareamentos repetidos com o mesmo colega — lê
  // e grava direto no servidor (não confia em estado local) pra valer entre abas/dispositivos
  const awardPartnerPoints = async (role) => {
    const reward = role === "helper" ? PARTNER_REWARD_HELPER : PARTNER_REWARD_HELPED;
    const fresh = await getStudent(shift, studentName);
    const wk = weekKey();
    const rewardsAll = (fresh && fresh.partnerRewards) || {};
    const rewardsWeek = rewardsAll[wk] || {};
    const used = rewardsWeek[role] || 0;
    if (used >= PARTNER_WEEKLY_CAP) return 0;
    await patchStudent(shift, studentName, { partnerRewards: { ...rewardsAll, [wk]: { ...rewardsWeek, [role]: used + 1 } } });
    return reward;
  };

  // 🤝 parceiro de código: fica de olho se o professor me pareou com alguém (como ajudado OU como
  // ajudante). Quando o ajudante marca como resolvido, o AJUDADO detecta na próxima verificação,
  // ganha os pontos e limpa o registro (o ajudante já ganhou os dele na hora de marcar) — mesmo
  // padrão de "self-report" usado no resto do app (torneio, chefão etc.)
  useEffect(() => {
    let active = true;
    const check = async () => {
      const list = await listPartners(shift);
      if (!active) return;
      const mineHelping = list.find(p => p.helper === studentName && p.status === "active");
      setPartnerHelping(mineHelping || null);
      const mineHelped = list.find(p => p.helped === studentName);
      if (mineHelped && mineHelped.status === "resolved") {
        if (!partnerResolvedSeenRef.current) {
          partnerResolvedSeenRef.current = true;
          const reward = await awardPartnerPoints("helped");
          if (reward > 0) {
            const np = (stateRef.current.nyxPoints || 0) + reward;
            setNyxPoints(np);
            await persist({ nyxPoints: np });
            setPartnerToast(`🎉 ${mineHelped.helper} te ajudou! +${reward} pontos.${mineHelped.note ? `\n"${mineHelped.note}"` : ""}`);
          } else {
            setPartnerToast(`🎉 ${mineHelped.helper} te ajudou! (Você já chegou no teto de pontos dessa categoria essa semana, mas valeu a ajuda!)`);
          }
          setTimeout(() => setPartnerToast(""), 8000);
          await clearPartner(shift, studentName);
        }
        setPartnerHelped(null);
        return;
      }
      partnerResolvedSeenRef.current = false;
      setPartnerHelped(mineHelped && mineHelped.status === "active" ? mineHelped : null);
    };
    check();
    const iv = setInterval(check, 12000);
    return () => { active = false; clearInterval(iv); };
  }, [shift, studentName, persist]);

  // enquanto o ajudante está com a janela de "ver código do colega" aberta, atualiza o código dele
  // periodicamente (só leitura) — fecha sozinho se a parceria acabar nesse meio tempo
  useEffect(() => {
    if (!showPartnerHelp || !partnerHelping) return;
    let active = true;
    const loadPeer = async () => {
      const st = await getStudent(shift, partnerHelping.helped);
      if (!active) return;
      if (!st) { setShowPartnerHelp(false); return; }
      setPartnerPeerCode({ name: st.name, files: (st.files && st.files.length) ? st.files : [{ name:"Program.cs", code: st.code||"" }] });
    };
    loadPeer();
    const iv = setInterval(loadPeer, 6000);
    return () => { active = false; clearInterval(iv); };
  }, [showPartnerHelp, partnerHelping, shift]);

  const resolvePartner = async () => {
    if (!partnerHelping) return;
    const note = partnerNote.trim().slice(0, 140);
    await setPartner(shift, partnerHelping.helped, { ...partnerHelping, status: "resolved", resolvedAt: Date.now(), note });
    const reward = await awardPartnerPoints("helper");
    if (reward > 0) {
      const np = (stateRef.current.nyxPoints || 0) + reward;
      setNyxPoints(np);
      await persist({ nyxPoints: np });
      setPartnerToast(`🎉 Você ajudou ${partnerHelping.helped}! +${reward} pontos.`);
    } else {
      setPartnerToast(`🎉 Você ajudou ${partnerHelping.helped}! (Você já chegou no teto de pontos dessa categoria essa semana, mas seu colega agradece!)`);
    }
    setTimeout(() => setPartnerToast(""), 8000);
    setShowPartnerHelp(false);
    setPartnerPeerCode(null);
    setPartnerHelping(null);
    setPartnerNote("");
  };

  // 🔥 aquecimento do dia (revisão espaçada): assim que o aluno entra — depois do onboarding e do
  // tour — o Nyx monta 3 perguntinhas rápidas sobre o resumo da aula ANTERIOR. Concluiu, ganha
  // pontos e não aparece de novo no dia; "Agora não" também silencia pelo resto do dia.
  // DESLIGADO (WARMUP_ENABLED=false) a pedido do professor: era a única chamada ao Nyx no app
  // inteiro que disparava sozinha, sem NINGUÉM clicar em nada — pra economizar créditos, só o
  // resto (sob demanda, ou liberado explicitamente pelo professor) continua gerando.
  useEffect(() => {
    if (!WARMUP_ENABLED) return;
    if (!loaded || accessMode || phase !== "coding") return;
    if (showNyxPrefs || showIntro || tourStep >= 0) return;
    if (warmupRequestedRef.current) return;
    const tk = todayKey();
    if (warmupDay === tk) return;
    try { if (localStorage.getItem(`nyx_warmup_skip_${tk}_${shift}_${studentName}`) === "1") return; } catch {}
    // resumo mais recente ANTERIOR a hoje (quem nunca teve aula ainda não tem aquecimento)
    const days = Object.keys(summaryHistory || {}).filter(d => d < tk).sort();
    const lastDay = days[days.length - 1];
    if (!lastDay) return;
    const sum = (detailedSummaryHistory || {})[lastDay] || summaryHistory[lastDay];
    if (!sum || !Array.isArray(sum.secoes) || !sum.secoes.length) return;
    warmupRequestedRef.current = true;
    (async () => {
      try {
        const conceitos = sum.secoes.map(sec => `- ${sec.titulo}: ${sec.explicacao || ""}`).join("\n");
        const data = await askClaudeJson(
          `Este foi o resumo da última aula de C# de um aluno iniciante:\n${sum.intro || ""}\n${conceitos}\n\nCrie um "aquecimento" de revisão com EXATAMENTE 3 perguntas de múltipla escolha BEM RÁPIDAS e diretas sobre esses conceitos (nível fácil — o objetivo é relembrar, não pegar ninguém). Cada pergunta com 4 alternativas curtas.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{ "perguntas": [ { "pergunta": "texto curto", "alternativas": ["a","b","c","d"], "correta": 0, "explicacao": "1 frase simples relembrando o porquê" } ] }`,
          "Você é o Nyx, robô-tutor de C# para adolescentes iniciantes. Português simples e correto. Responda APENAS JSON puro válido."
        );
        const qs = Array.isArray(data?.perguntas) ? data.perguntas.filter(q => q && q.pergunta && Array.isArray(q.alternativas) && q.alternativas.length >= 2 && q.alternativas[q.correta] != null) : [];
        if (!qs.length) return;
        // embaralha as alternativas de cada pergunta (guardando onde a certa foi parar)
        const shuffled = qs.slice(0, 3).map(q => {
          const idx = q.alternativas.map((_, i) => i).sort(() => Math.random() - 0.5);
          return { pergunta: q.pergunta, alternativas: idx.map(i => q.alternativas[i]), correta: idx.indexOf(q.correta), explicacao: q.explicacao || "" };
        });
        setWarmup({ questions: shuffled });
        setWarmupStep(0); setWarmupPicked(null); setWarmupCorrect(0);
        setWarmupOpen(true);
      } catch { /* Nyx offline: hoje fica sem aquecimento, sem drama */ }
    })();
  }, [loaded, accessMode, phase, showNyxPrefs, showIntro, tourStep, warmupDay, summaryHistory, detailedSummaryHistory, shift, studentName]);

  const finishWarmup = async () => {
    const earned = warmupCorrect; // 1 ponto por acerto
    const newPoints = (stateRef.current.nyxPoints || 0) + earned;
    setWarmupOpen(false);
    setWarmupDay(todayKey());
    if (earned > 0) {
      setNyxPoints(newPoints);
      checkPointsAchievements(newPoints);
      await persist({ warmupDay: todayKey(), nyxPoints: newPoints });
    } else {
      await persist({ warmupDay: todayKey() });
    }
  };
  const skipWarmup = () => {
    try { localStorage.setItem(`nyx_warmup_skip_${todayKey()}_${shift}_${studentName}`, "1"); } catch {}
    setWarmupOpen(false);
  };

  // 🏟️ torneio: se estou numa partida da rodada atual e ainda não respondi o quiz DESTA rodada,
  // ele abre sozinho (o professor iniciou pelo telão — é o evento da turma naquele momento)
  useEffect(() => {
    if (!loaded || !tourneyInfo || tourneyInfo.status !== "active") { if (!tourneyInfo) setTourneyQuiz(null); return; }
    const m = (tourneyInfo.matches || []).find(x => x.round === tourneyInfo.round && !x.winner && x.b && (x.a === studentName || x.b === studentName));
    if (!m) { setTourneyQuiz(null); return; }
    const already = tourneyAnswer && tourneyAnswer.id === tourneyInfo.id && tourneyAnswer.round === tourneyInfo.round;
    if (already) return;
    if (tourneyQuiz && tourneyQuiz.id === tourneyInfo.id && tourneyQuiz.round === tourneyInfo.round) return; // já está aberto
    const qs = (tourneyInfo.questions || {})[tourneyInfo.round];
    if (!Array.isArray(qs) || !qs.length) return;
    // embaralha as alternativas localmente — não precisa saber qual é a certa pra isso (é só
    // reordenar o texto), guarda é a permutação usada (origIdx) pra traduzir de volta o índice
    // ORIGINAL na hora de enviar a resposta. A correção de verdade só acontece no servidor (ver
    // grade_tourney_round): "correta" nem chega mais aqui enquanto a rodada está valendo.
    const shuffled = qs.map(q => {
      const idx = q.alternativas.map((_, i) => i).sort(() => Math.random() - 0.5);
      return { pergunta: q.pergunta, alternativas: idx.map(i => q.alternativas[i]), origIdx: idx };
    });
    setTourneyQuiz({ id: tourneyInfo.id, round: tourneyInfo.round, opponent: m.a === studentName ? m.b : m.a, questions: shuffled });
    setTourneyStep(0); setTourneyPicked(null); setTourneyPicks({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, tourneyInfo, tourneyAnswer, studentName]);
  const submitTourneyQuiz = async () => {
    if (!tourneyQuiz || tourneySubmitting) return;
    setTourneySubmitting(true);
    // corrige no SERVIDOR: manda só os índices ORIGINAIS escolhidos, nunca o gabarito (que nem
    // chega até aqui enquanto a rodada está valendo — ver redactTourneyConfig em api/kv.js)
    let result = await gradeTourneyRound(tourneyQuiz.id, tourneyQuiz.round, tourneyPicks, shift);
    if (!result) result = await gradeTourneyRound(tourneyQuiz.id, tourneyQuiz.round, tourneyPicks, shift);
    setTourneySubmitting(false);
    if (!result) {
      setRobotState("thinking");
      setRobotMsg("⚠ Não consegui enviar suas respostas do torneio agora (conexão?). Tente de novo.");
      setTimeout(() => setRobotMsg(""), 6000);
      return;
    }
    const score = result.score;
    const ans = { id: tourneyQuiz.id, round: tourneyQuiz.round, score, at: Date.now() };
    const newPts = (stateRef.current.nyxPoints || 0) + score; // 1 ponto do Nyx por acerto, como nos duelos
    setTourneyAnswer(ans);
    setTourneyQuiz(null);
    if (score > 0) { setNyxPoints(newPts); checkPointsAchievements(newPts); }
    setRobotState("ok");
    setRobotMsg(`🏟️ Respostas enviadas! Você fez ${score} ponto${score===1?"":"s"} — olha no telão quem venceu a rodada!`);
    setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 8000);
    await persist(score > 0 ? { tourneyAnswer: ans, nyxPoints: newPts } : { tourneyAnswer: ans });
  };

  // 🎁 retrospectiva: abre sozinha quando o professor libera e este aluno ainda não viu ESTA liberação
  useEffect(() => {
    if (!loaded || !retroActive) return;
    if (retroSeen === retroActive) return;
    if (showNyxPrefs || showIntro || tourStep >= 0 || warmupOpen) return;
    setShowRetro(true);
  }, [loaded, retroActive, retroSeen, showNyxPrefs, showIntro, tourStep, warmupOpen]);
  const closeRetro = async () => {
    setShowRetro(false);
    setRetroSeen(retroActive);
    await persist({ retroSeen: retroActive });
  };

  // ── anti-cola: durante a prova ativa, cada saída da aba é contada (e desconta 10 pts no fim) ──
  // ninguém do Modo Guiado é penalizado por trocar de aba — quem recusou nem vê a prova, e quem
  // topou faz a versão de participação simplificada, que não vale nota (não tem o que descontar)
  const examActive = examInfo.status === 'active' && !examDone && !accessMode;
  // shuffle único do quiz simplificado de participação, guardado pra sobreviver a um F5 no meio
  useEffect(() => {
    if (examInfo.status !== 'active' || !accessMode || examOptIn !== true || examGuidedQuestions || examDone) return;
    const shuffled = shuffleQuestions(GUIDED_PARTICIPATION_QUIZ);
    setExamGuidedQuestions(shuffled);
    persist({ examGuidedQuestions: shuffled });
  }, [examInfo.status, accessMode, examOptIn, examGuidedQuestions, examDone, persist]);
  useEffect(() => {
    if (!examActive) return;
    const registerExit = () => setExamExits(n => {
      const next = n + 1;
      setTimeout(() => persist({ examExits: next }), 0);
      return next;
    });
    // se a aba foi FECHADA e reaberta no meio da prova, o sessionStorage some mas as
    // respostas continuam no servidor — isso entrega que a prova foi interrompida
    try {
      if (!sessionStorage.getItem("nyx_exam_open")) {
        sessionStorage.setItem("nyx_exam_open", "1");
        if (Object.keys(stateRef.current.examAnswers || {}).length > 0) registerExit();
      }
    } catch {}
    const onVis = () => { if (document.hidden) registerExit(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [examActive, persist]);

  // ── ✋ pedir ajuda: acende o tile do aluno no monitoramento do professor (expira em 15 min lá) ──
  const askHelp = async () => { const t = Date.now(); setHelpAt(t); await persist({ helpAt: t }); };
  const cancelHelp = async () => { setHelpAt(null); await persist({ helpAt: null }); };
  // 🙋 pedir um parceiro sozinho — o professor decide quem pareia (não é o aluno que escolhe),
  // por isso isso só "levanta a mão"; quem realmente pareia é sempre o professor
  const askPartner = async () => { const t = Date.now(); setWantsPartner(t); await persist({ wantsPartner: t }); };
  const cancelPartnerRequest = async () => { setWantsPartner(null); await persist({ wantsPartner: null }); };
  // 🧩 o próprio aluno liga/desliga um ajuste de apoio pra si mesmo — some com o professor, é a
  // UNIÃO dos dois (se qualquer um dos dois ligar, o ajuste vale)
  const toggleSelfSupport = (flag) => { const next = { ...selfSupport, [flag]: !selfSupport[flag] }; setSelfSupport(next); persist({ selfSupport: next }); };

  // ── ⚠️ erro em produção: se a tela do aluno der um erro de JS de verdade, avisa o professor
  // sozinho (mesmo painel de Monitoramento), sem o aluno precisar levantar a mão e reclamar.
  // limitado a 1 relato por minuto pra uma tempestade de erros repetidos não spammar o servidor ──
  useEffect(() => {
    const reportError = (msg) => {
      const now = Date.now();
      if (now - lastErrorReportRef.current < 60000) return;
      lastErrorReportRef.current = now;
      const clipped = String(msg || "Erro desconhecido").slice(0, 200);
      setErrorAt(now); setErrorMsg(clipped);
      persist({ errorAt: now, errorMsg: clipped });
    };
    const onError = (e) => reportError(e.message ? `${e.message} (${e.filename||""}:${e.lineno||""})` : String(e));
    const onRejection = (e) => reportError(`Promise rejeitada: ${e.reason?.message || e.reason || "motivo desconhecido"}`);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, [persist]);

  // 📋 dias de aula sem presença registrada, entre a criação do perfil e hoje — ainda sem justificativa
  const pendingAbsences = myClassDays
    .filter(d => d < todayKey() && d >= dateKeyOf(createdAtRef.current))
    .filter(d => !attendanceRef.current[d] && !justifications[d])
    .sort().reverse();
  const submitJustification = async (dateKey, text) => {
    if (!text || !text.trim()) return;
    const next = { ...justifications, [dateKey]: { text: text.trim(), status: "pending", at: Date.now() } };
    setJustifications(next);
    await persist({ justifications: next });
  };

  // ⌨️ conclui o tutorial de teclado: pontos + conquista, 1x (pode repetir o treino, mas não
  // repontua) — lê/escreve via stateRef (não os closures de keyboardDone/nyxPoints), mesmo motivo
  // do handleBuyItem/openGift: dois disparos bem próximos não podem passar os dois pela checagem
  // com o mesmo estado "antigo" e um pisar no ponto do outro
  const finishKeyboardTutorial = async () => {
    const s = stateRef.current;
    if (s.keyboardDone) return;
    const np = (s.nyxPoints||0) + 5;
    stateRef.current = { ...s, keyboardDone: true, nyxPoints: np };
    setKeyboardDone(true);
    setNyxPoints(np);
    await persist({ keyboardDone: true, nyxPoints: np });
    unlockAchievement("teclado-mestre");
    checkPointsAchievements(np);
  };

  // ── 🏁 fim da corrida de digitação: pontos 1x por dia (+1 bônus por recorde pessoal) ──
  const finishTypingRace = async (ms) => {
    const s = stateRef.current;
    const today = todayKey();
    const firstToday = s.typingRewardDay !== today;
    const newRecord = !s.typingBest || ms < s.typingBest.ms;
    const reward = (firstToday ? 2 : 0) + (newRecord ? 1 : 0);
    const best = newRecord ? { ms, at: Date.now() } : s.typingBest;
    const newTypingRewardDay = firstToday ? today : s.typingRewardDay;
    if (reward > 0) {
      const np = (s.nyxPoints||0) + reward;
      stateRef.current = { ...s, typingBest: best, typingRewardDay: newTypingRewardDay, nyxPoints: np };
      if (newRecord) setTypingBest(best);
      if (firstToday) setTypingRewardDay(today);
      setNyxPoints(np);
      await persist({ nyxPoints: np, typingBest: best, typingRewardDay: newTypingRewardDay });
      checkPointsAchievements(np);
    } else {
      // reward<=0 só acontece quando newRecord e firstToday são os dois false — nada novo pra
      // guardar em stateRef/estado além do que já estava lá
      await persist({ typingBest: best });
    }
    return { reward, newRecord };
  };

  // ── 🎁 abre o presente misterioso do dia (sorteio de raridade) ──
  // lê/escreve via stateRef (não os closures de giftLastClaim/nyxPoints) pelo mesmo motivo do
  // handleBuyItem: dois toques rápidos seguidos (comum no touch da carreta) passavam os dois pela
  // checagem com o mesmo "giftLastClaim" ainda desatualizado, e o aluno ganhava o presente 2x
  const openGift = async () => {
    const s = stateRef.current;
    if (s.giftLastClaim === todayKey()) return;
    const tier = rollGift();
    const np = (s.nyxPoints||0) + tier.pts;
    stateRef.current = { ...s, nyxPoints: np, giftLastClaim: todayKey() };
    setGiftReveal(tier);
    setGiftLastClaim(todayKey());
    setNyxPoints(np);
    playSound("combo");
    await persist({ nyxPoints: np, giftLastClaim: todayKey() });
    checkPointsAchievements(np);
  };

  // carrega perfil salvo (nome + código + avatar + tudo)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const prev = await getStudent(shift, studentName);
        if (alive && prev) {
          if (prev.attendance) attendanceRef.current = prev.attendance;
          // tira \r de código salvo ANTES da correção (colado do Windows/Visual Studio) — sem isso o
          // editor ficava com a marcação colorida desalinhada do cursor de verdade nessas linhas
          if (Array.isArray(prev.files) && prev.files.length) setFiles(prev.files.map(f => ({ ...f, code: String(f.code||"").replace(/\r/g, "") })));
          else if (typeof prev.code === "string") setFiles([{ name:"Program.cs", code:prev.code.replace(/\r/g, "") }]);
          if (prev.programmingLanguage) setProgrammingLanguage(prev.programmingLanguage);
          if (Array.isArray(prev.languageHistory)) setLanguageHistory(prev.languageHistory);
          if (prev.quizJoin) setQuizJoin(prev.quizJoin);
          if (prev.quizAnswers) setQuizAnswers(prev.quizAnswers);
          if (prev.avatar) setAvatar(prev.avatar);
          if (prev.score != null) setScore(prev.score);
          if (prev.answers) setAnswers(prev.answers);
          if (prev.dynamicActivity) setDynamicActivity(prev.dynamicActivity);
          if (prev.dynamicSummary) setDynamicSummary(prev.dynamicSummary);
          if (prev.finalFeedback) setFinalFeedback(prev.finalFeedback);
          if (prev.phase && prev.phase !== "generating") setPhase(prev.phase);
          if (prev.classFeedback) {
            setClassFb(prev.classFeedback);
            // o feedback só "trava" a tela se já foi enviado NESTA aula (mesmo dia) — em uma aula nova, pode enviar de novo
            if (isSameDayTs(prev.classFeedback.at)) { setClassRating(prev.classFeedback.rating||0); setClassText(prev.classFeedback.text||""); setClassSent(true); }
          }
          if (prev.feedback) { setFeedback(prev.feedback); setRobotMsg(prev.feedback.message||""); setRobotState(prev.feedback.ok?"ok":"error"); setKeysToShow(prev.feedback.missingChars||[]); }
          if (prev.examReady) setExamReady(true);
          if (prev.examScore != null) setExamScore(prev.examScore);
          if (prev.examAnswers) setExamAnswers(prev.examAnswers);
          if (prev.examDone) setExamDone(true);
          if (prev.examExits) setExamExits(prev.examExits);
          if (prev.examScoreRaw != null) setExamScoreRaw(prev.examScoreRaw);
          if (prev.examAppeal) setExamAppeal(prev.examAppeal);
          if (prev.examScoreSeen) setExamScoreSeen(true);
          if (typeof prev.examOptIn === "boolean") setExamOptIn(prev.examOptIn);
          if (prev.examGuidedMode) setExamGuidedMode(true);
          if (Array.isArray(prev.examGuidedQuestions)) setExamGuidedQuestions(prev.examGuidedQuestions);
          if (prev.examGuidedAnswers) setExamGuidedAnswers(prev.examGuidedAnswers);
          if (prev.examGuidedCorrect) setExamGuidedCorrect(prev.examGuidedCorrect);
          if (prev.helpAt) setHelpAt(prev.helpAt);
          if (prev.wantsPartner) setWantsPartner(prev.wantsPartner);
          if (prev.selfSupport) setSelfSupport(prev.selfSupport);
          if (prev.errorAt) { setErrorAt(prev.errorAt); setErrorMsg(prev.errorMsg || ""); }
          if (prev.typingBest) setTypingBest(prev.typingBest);
          if (prev.typingRewardDay) setTypingRewardDay(prev.typingRewardDay);
          if (prev.knowledgeTestRewardDay) setKnowledgeTestRewardDay(prev.knowledgeTestRewardDay);
          if (prev.streakRewardDay) setStreakRewardDay(prev.streakRewardDay);
          if (prev.giftLastClaim) setGiftLastClaim(prev.giftLastClaim);
          if (prev.theme) setTheme(prev.theme);
          if (prev.themeBeforeSpartan) setThemeBeforeSpartan(prev.themeBeforeSpartan);
          if (prev.treasureFound) setTreasureFound(true);
          if (prev.spartanIntroShown) setSpartanIntroShown(true);
          if (prev.warmupDay) setWarmupDay(prev.warmupDay);
          if (prev.retroSeen) setRetroSeen(prev.retroSeen);
          if (prev.tourneyAnswer) setTourneyAnswer(prev.tourneyAnswer);
          if (prev.tourneyClaimed) setTourneyClaimed(prev.tourneyClaimed);
          if (prev.nyxPoints) setNyxPoints(prev.nyxPoints);
          if (prev.nyxSpent) setNyxSpent(prev.nyxSpent);
          if (prev.duelWins) setDuelWins(prev.duelWins);
          if (prev.pastedLines) setPastedLines(prev.pastedLines);
          if (prev.weeklyChallenge) setWeeklyChallenge(prev.weeklyChallenge);
          if (prev.nyxGear) {
            // migra quem já tinha o escudo equipado ANTES da correção (quando ele dividia o mesmo
            // slot da espada/arco) pro slot próprio "shield" — sem isso o escudo some da tela dele
            const loadedGear = { ...DEFAULT_NYX_GEAR, ...prev.nyxGear };
            if (loadedGear.hand === "escudo") { loadedGear.hand = null; loadedGear.shield = loadedGear.shield || "escudo"; }
            setNyxGear(loadedGear);
          }
          if (prev.nyxPrefs) setNyxPrefs(prev.nyxPrefs);
          if (prev.birthDate) setBirthDate(prev.birthDate);
          if (prev.cpf) setCpf(prev.cpf);
          // inventário: migra quem já usava itens antes da loja cobrar — o que está equipado vira comprado (de graça)
          {
            const equipped = Object.values(prev.nyxGear || {}).filter(Boolean);
            const owned = Array.isArray(prev.nyxOwned) ? prev.nyxOwned : [];
            setNyxOwned([...new Set([...owned, ...equipped])]);
          }
          if (Array.isArray(prev.achievements)) setAchievements(prev.achievements.filter(id => achievementInfo(id)));
          if (prev.doneAt) setDoneAt(prev.doneAt);
          if (prev.scoreHistory) setScoreHistory(prev.scoreHistory);
          if (prev.errorHistory) setErrorHistory(prev.errorHistory);
          if (prev.summaryHistory) setSummaryHistory(prev.summaryHistory);
          if (prev.detailedSummary) setDetailedSummary(prev.detailedSummary);
          if (prev.detailedSummaryHistory) setDetailedSummaryHistory(prev.detailedSummaryHistory);
          if (Array.isArray(prev.guidedBlocks)) setGuidedBlocks(prev.guidedBlocks);
          if (Array.isArray(prev.guidedLessons)) setGuidedLessons(prev.guidedLessons);
          if (prev.createdAt) createdAtRef.current = prev.createdAt; // preserva a data ORIGINAL de criação (não a da sessão atual)
          if (prev.attendanceFirst) attendanceFirstRef.current = prev.attendanceFirst;
          if (prev.justifications) setJustifications(prev.justifications);
          if (prev.keyboardDone) setKeyboardDone(true);
          if (prev.portfolioPublic) setPortfolioPublic(true);
          if (prev.portfolioActivatedAt) setPortfolioActivatedAt(prev.portfolioActivatedAt);
          lastSyncedRef.current = {
            nyxPoints: prev.nyxPoints || 0,
            achievements: JSON.stringify(prev.achievements || []),
            examScore: prev.examScore ?? null,
            examDone: !!prev.examDone,
            portfolioPublic: !!prev.portfolioPublic,
            score: prev.score ?? null,
            scoreHistory: JSON.stringify(prev.scoreHistory || {}),
            errorHistory: JSON.stringify(prev.errorHistory || {}),
            justifications: JSON.stringify(prev.justifications || {}),
          };
        }
        // rede de segurança: se um backup local recente tem MAIS código do que o servidor, uma queda de
        // conexão bem na hora de salvar deve ter perdido esse trecho — restaura e resalva pra reconciliar
        try {
          const backup = loadCodeBackupLocal(shift, studentName);
          // janela de 24h: cobre até "a internet caiu no fim da aula e ele só voltou no dia seguinte"
          // (a comparação de tamanho logo abaixo continua impedindo sobrescrever progresso mais novo)
          const backupIsRecent = backup && (Date.now() - backup.at) < 24 * 60 * 60 * 1000;
          if (alive && backupIsRecent && Array.isArray(backup.files) && backup.files.length) {
            const serverFiles = (prev && Array.isArray(prev.files) && prev.files.length) ? prev.files : [];
            const backupLen = backup.files.reduce((n,f) => n + (f.code||"").length, 0);
            const serverLen = serverFiles.reduce((n,f) => n + (f.code||"").length, 0);
            if (backupLen > serverLen) {
              setFiles(backup.files);
              persist({ files: backup.files });
            }
          }
        } catch {}
        try { setAccessModeState(await getAccessMode(shift, studentName)); } catch {}
        try { setSupportFlags(await getSupport(shift, studentName)); } catch {}
        // foto do código do início do dia: se a salva for de outro dia (ou não existir), tira uma nova agora
        {
          const tk = todayKey();
          if (prev?.daySnapshot && prev.daySnapshot.date === tk) {
            daySnapshotRef.current = prev.daySnapshot;
          } else {
            const baseFiles = (prev && Array.isArray(prev.files) && prev.files.length) ? prev.files : [{ name:"Program.cs", code:"" }];
            daySnapshotRef.current = { date: tk, files: baseFiles.map(f => ({ name: f.name, code: f.code || "" })) };
          }
          // foto do código na hora do ÚLTIMO resumo gerado hoje (se existir) — usada pra saber o
          // que é realmente NOVO se o aluno salvar de novo depois do professor passar mais código
          if (prev?.summarySnapshot && prev.summarySnapshot.date === tk) {
            summarySnapshotRef.current = prev.summarySnapshot;
          }
        }
        const es = await getExamStateForStudent(shift);
        if (alive) setExamInfo(es);
      } finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, [studentName, shift]);

  // grava o código no navegador (localStorage) a cada mudança — não depende de internet, então
  // continua funcionando mesmo se a conexão cair bem na hora de salvar no servidor
  useEffect(() => {
    if (!loaded) return; // só depois de carregar o que já existia, pra não sobrescrever um backup bom com o estado inicial vazio
    saveCodeBackupLocal(shift, studentName, files);
  }, [files, loaded, shift, studentName]);

  // ranking e meta da turma: soma/ordena os pontos de todo mundo da mesma turma
  useEffect(() => {
    let alive = true;
    const loadClass = async () => {
      try {
        const all = await listStudents();
        const mine = all.filter(s => (s.shift || "sem-turno") === (shift || "sem-turno"));
        const total = mine.reduce((sum, s) => sum + (s.nyxPoints || 0), 0);
        if (!alive) return;
        setClassPointsSum(total);
        // a turma subiu de nível na meta? festa com confete para todo mundo online 🎉
        const lvl = classGoalProgress(total).level;
        if (goalLevelRef.current != null && lvl > goalLevelRef.current) {
          setGoalParty(lvl);
          playSound("achievement");
          setTimeout(() => setGoalParty(null), 6500);
        }
        goalLevelRef.current = lvl;
      } catch {}
    };
    loadClass();
    const iv = setInterval(loadClass, 15000);
    return () => { alive = false; clearInterval(iv); };
  }, [shift]);

  // heartbeat: registra na hora + atualiza a cada 3s + observa reset, avisos e inatividade
  useEffect(() => {
    if (!loaded) return;
    let active2 = true;
    let currentClassDays = myClassDays;
    const tick = async () => {
      if (!active2) return;
      if (await checkReset(shift, sessionStart.current)) { active2 = false; onLogout(); return; }
      // aviso do professor
      try {
        const n = await getNudge(shift, studentName);
        if (n && n.at && n.at > sessionStart.current) setNudge2(n);
      } catch {}
      // dica automática: entrou mas está parado há mais de 90s sem código
      const s = stateRef.current;
      const codeLen = (s.code || "").trim().length;
      setIdleHint(s.phase === "coding" && codeLen < 10 && (Date.now() - sessionStart.current) > 90000);
      // prova: busca o estado do turno deste aluno (ou a prova combinada, se houver uma)
      try {
        const es = await getExamStateForStudent(shift);
        // alunos do Modo Guiado que escolheram NÃO fazer a prova ficam de fora do cálculo de nota
        // (senão levariam zero quando o professor encerrasse, mesmo sem nunca ter entrado na prova)
        const isGuidedNow = await getAccessMode(shift, studentName).catch(() => false);
        const optedOutOfExam = isGuidedNow && s.examOptIn === false;
        // quem é do Modo Guiado e topou participar faz a versão simplificada — não vale nota
        // oficial, então nunca entra no cálculo de pontuação/ranking da prova de verdade
        const isGuidedParticipant = isGuidedNow && s.examOptIn === true;
        if (es.status === 'done' && !s.examDone && !optedOutOfExam) {
          if (isGuidedParticipant) {
            // só conta os acertos pra dar um feedback simpático — não afeta nota nem ranking
            const gq = s.examGuidedQuestions || GUIDED_PARTICIPATION_QUIZ;
            const ga = s.examGuidedAnswers || {};
            let gpts = 0;
            gq.forEach((q, i) => { if (ga[i] === q.correct) gpts++; });
            try { sessionStorage.removeItem("nyx_exam_open"); } catch {}
            setExamGuidedCorrect(gpts); setExamGuidedMode(true); setExamDone(true);
            const newNyxPoints = (s.nyxPoints || 0) + 10; // bônus fixo por participar, sem ligar pro acerto
            setNyxPoints(newNyxPoints);
            await persist({ examGuidedCorrect: gpts, examGuidedMode: true, examDone: true, nyxPoints: newNyxPoints });
          } else {
            // professor encerrou a prova com a atividade ainda em aberto pra esse aluno: calcula a
            // nota parcial (só o que ele já tinha respondido até agora) — sempre no SERVIDOR, nunca
            // aqui no cliente, porque o gabarito nem chega até aqui (ver redactExamConfig em
            // api/kv.js). Comparar localmente com "q.correct" (sempre undefined depois da redação)
            // era um bug real: marcava questão respondida como errada E questão em branco como
            // certa — dava nota errada pra todo aluno que não tinha terminado a tempo.
            const curA = s.examAnswers || {};
            let result = await gradeExam(es.shift || shift, curA, s.examExits || 0);
            if (!result) result = await gradeExam(es.shift || shift, curA, s.examExits || 0);
            if (result) {
              const { finalScore: partial, raw: rawPartial, total } = result;
              try { sessionStorage.removeItem("nyx_exam_open"); } catch {}
              setExamScore(partial); setExamScoreRaw(rawPartial); setExamDone(true);
              const newNyxPoints = (s.nyxPoints || 0) + Math.round(partial / 10);
              setNyxPoints(newNyxPoints);
              await persist({ examScore: partial, examScoreRaw: rawPartial, examExits: s.examExits || 0, examDone: true, nyxPoints: newNyxPoints });
              checkPointsAchievements(newNyxPoints);
              const pts = rawPartial / 10;
              if (total && pts / total >= 0.8) unlockAchievement("prova-mestre");
              if (total && pts === total) unlockAchievement("prova-100");
            }
            // se falhar (rede instável), não marca examDone — o próximo heartbeat (12s) tenta de novo sozinho
          }
        } else if (es.status === 'idle' && (s.examDone || s.examOptIn != null)) {
          // professor resetou a prova (ou encerrou uma que o aluno tinha optado por não fazer)
          setExamReady(false); setExamScore(null); setExamAnswers({}); setExamDone(false); setExamCurrentQ(0);
          setExamExits(0); setExamScoreRaw(null); setExamAppeal(null); setExamScoreSeen(false); setExamOptIn(null);
          setExamGuidedMode(false); setExamGuidedQuestions(null); setExamGuidedAnswers({}); setExamGuidedCurrentQ(0); setExamGuidedCorrect(0);
          try { sessionStorage.removeItem("nyx_exam_open"); } catch {}
          await persist({ examReady: false, examScore: null, examAnswers: {}, examDone: false, examExits: 0, examScoreRaw: null, examAppeal: null, examScoreSeen: false, examOptIn: null, examGuidedMode: false, examGuidedQuestions: null, examGuidedAnswers: {}, examGuidedCorrect: 0 });
        }
        setExamInfo(es);
      } catch {}
      // travas do professor (zek / zeker)
      try {
        const locks = await getNyxLocks();
        setNyxLocksState({ zek: !!locks.zek, zeker: !!locks.zeker });
      } catch {}
      // 👾 chefão da turma (evento do telão) — só o da PRÓPRIA turma, cada turma tem o seu
      try {
        const b = await getBoss(shift);
        setBossInfo(b && b.status === "active" ? b : null);
      } catch {}
      // 🏟️ torneio da turma (evento do telão): guarda o estado e, se EU sou o campeão e ainda
      // não recebi o prêmio, celebra e dá o bônus uma única vez
      try {
        const t = await getTourney(shift);
        setTourneyInfo(t && t.shift === shift && (t.status === "active" || t.status === "done") ? t : null);
        if (t && t.status === "done" && t.shift === shift && t.champion === studentName && stateRef.current.tourneyClaimed !== t.id) {
          const bonus = 5;
          const newPts = (stateRef.current.nyxPoints || 0) + bonus;
          setTourneyClaimed(t.id);
          setNyxPoints(newPts);
          unlockAchievement("campeao-torneio");
          checkPointsAchievements(newPts);
          setRobotState("ok");
          setRobotMsg(`🏆 CAMPEÃO DO TORNEIO!! Você venceu a turma toda! +${bonus} pontos de prêmio — que orgulho!`);
          setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 10000);
          await persist({ tourneyClaimed: t.id, nyxPoints: newPts });
        }
      } catch {}
      // 🕐 horário automático da turma + 🔍 vistoria (libera este aluno específico fora do horário)
      try {
        const m = await getTeacherMeta();
        setMySchedule((m.schedule || {})[shift] || {});
        setMyAllowWeekend(!!m.allowWeekend);
        setLockDuringAnalysis(m.lockDuringAnalysis !== false);
        setMyInspection(await getInspection(shift, studentName));
        currentClassDays = m.classDays || [];
        setMyClassDays(currentClassDays);
        setMyContentNames(m.contentNames || {});
        // 🎁 retrospectiva do mês liberada pelo professor pra este turno?
        setRetroActive((m.retro || {})[shift] || null);
      } catch {}
      // o professor está escrevendo AGORA em "Meu código"? (salva a cada 1s enquanto ele digita —
      // "escrevendo agora" = salvou nos últimos 6s) usado pro anti-cola: se o aluno estiver
      // distraído em vez de copiando enquanto o professor passa o código, o Nyx traz ele de volta
      try {
        const tc = await getTeacherCode(shift);
        setTeacherWriting(!!(tc && tc.at && Date.now() - tc.at < 6000));
      } catch {}
      // ⌨️ o professor "empurrou" a abertura do tutorial de teclado pra este aluno — só vale pro
      // dia em que foi aberto (o valor fica salvo pra sempre no servidor, mas não deve reabrir
      // sozinho de novo em outro dia só porque o aluno recarregou a página ou voltou no dia seguinte)
      try {
        const launchedAt = await getKeyboardLaunch(shift, studentName);
        if (launchedAt && dateKeyOf(launchedAt) === todayKey() && kbLaunchSeenRef.current !== launchedAt) {
          kbLaunchSeenRef.current = launchedAt;
          setShowKeyboard(true);
        }
      } catch {}
      // modo guiado (acessibilidade) — o professor pode ligar/desligar por aluno a qualquer momento
      try {
        setAccessModeState(await getAccessMode(shift, studentName));
      } catch {}
      // perfis de apoio (calmo/foco/leitura/ritmo) — idem, valem na hora
      try {
        setSupportFlags(await getSupport(shift, studentName));
      } catch {}
      // professor renomeou/moveu/excluiu este perfil → sai da sessão antiga
      try {
        if (await checkKick(shift, studentName, sessionStart.current)) { active2 = false; onLogout(); return; }
      } catch {}
      // professor corrigiu a nota da atividade → aplica e limpa a flag
      try {
        const fix = await getScoreFix(shift, studentName);
        if (fix && fix.kind === "exam" && typeof fix.score === "number") {
          // professor ACEITOU a defesa: devolve os pontos descontados da prova
          const ap = { ...(stateRef.current.examAppeal || {}), status: "accepted" };
          setExamScore(fix.score); setExamAppeal(ap);
          await clearScoreFix(shift, studentName);
          await persist({ examScore: fix.score, examAppeal: ap });
        } else if (fix && fix.kind === "help-attended") {
          // professor marcou o pedido de ajuda como atendido
          setHelpAt(null);
          await clearScoreFix(shift, studentName);
          await persist({ helpAt: null });
        } else if (fix && fix.kind === "partner-request-cleared") {
          // professor pareou (ou dispensou) o pedido de parceiro — desliga o "levantei a mão"
          setWantsPartner(null);
          await clearScoreFix(shift, studentName);
          await persist({ wantsPartner: null });
        } else if (fix && fix.kind === "exam-appeal-rejected") {
          // professor RECUSOU a defesa: desconto mantido
          const ap = { ...(stateRef.current.examAppeal || {}), status: "rejected" };
          setExamAppeal(ap);
          await clearScoreFix(shift, studentName);
          await persist({ examAppeal: ap });
        } else if (fix && fix.kind === "justify-approved" && fix.dateKey) {
          // professor aprovou a justificativa de uma falta — aplica no estado local antes que o
          // próprio autosave periódico sobrescreva o registro inteiro com a versão local desatualizada
          const cur = stateRef.current.justifications || {};
          const nextJ = { ...cur, [fix.dateKey]: { ...cur[fix.dateKey], status: "approved" } };
          setJustifications(nextJ);
          await clearScoreFix(shift, studentName);
          await persist({ justifications: nextJ });
        } else if (fix && fix.kind === "portfolio-disabled") {
          // professor desativou o portfólio público por moderação — aplica no estado local antes
          // que o autosave periódico sobrescreva o registro com o "true" que ainda está aqui
          setPortfolioPublic(false);
          await clearScoreFix(shift, studentName);
          await persist({ portfolioPublic: false });
        } else if (fix && fix.kind === "attendance" && fix.dateKey) {
          // professor marcou/desmarcou a presença de um dia na mão (ver markPresentToday/
          // unmarkPresentToday) — aplica no ref antes que o autosave periódico regrave a presença
          // usando só o cálculo automático local, desfazendo a correção do professor
          const cur = { ...attendanceRef.current };
          if (fix.status) cur[fix.dateKey] = fix.status; else delete cur[fix.dateKey];
          attendanceRef.current = cur;
          await clearScoreFix(shift, studentName);
          await persist({});
        } else if (fix && fix.kind === "boss-bonus" && typeof fix.amount === "number") {
          // 👾 bônus de pontos por ter causado dano no chefão quando ele foi derrotado
          const np = (stateRef.current.nyxPoints || 0) + fix.amount;
          setNyxPoints(np);
          await clearScoreFix(shift, studentName);
          await persist({ nyxPoints: np });
          checkPointsAchievements(np);
        } else if (fix && typeof fix.score === "number") {
          setScore(fix.score);
          await clearScoreFix(shift, studentName);
          await persist({ score: fix.score });
        }
      } catch {}
      // professor selecionou este aluno e enviou o código da turma → completa só o que falta e
      // corrige o que já existia, sem apagar o que o aluno mesmo escreveu (nunca sobrescreve tudo).
      // Roda em segundo plano (sem "await" aqui) porque a mesclagem por IA pode demorar alguns
      // segundos — sem isso, o tick() inteiro ficava travado esperando, atrasando TODO o resto
      // (avisos do professor, chefão, torneio, nota corrigida etc.) até a IA responder, e se o tick
      // demorasse mais de 12s o próximo já disparava por cima, duplicando efeitos.
      if (!codeSendHandledRef.current) {
        codeSendHandledRef.current = true;
        (async () => {
          try {
            const sent = await getCodeSend(shift, studentName);
            if (sent && Array.isArray(sent.files) && sent.files.length) {
              const currentFiles = stateRef.current.files || files;
              const hasOwnCode = currentFiles.some(f => (f.code||"").trim().length >= 10);
              let mergedFiles = sent.files;
              let mergeSucceeded = false;
              if (hasOwnCode) {
                setRobotMsg("🤖 O professor enviou código novo — só um instante enquanto completo o que falta no seu, sem apagar nada...");
                setRobotState("thinking");
                try {
                  // teto de 35s pra mesclagem (função do servidor tem 30s de maxDuration — ver
                  // vercel.json — o cliente espera um pouco mais que isso pra dar tempo do servidor
                  // responder por conta própria em vez de desistir primeiro por engano). ANTES esse
                  // teto era de só 12s: como a função do servidor nem tinha maxDuration configurado
                  // (ficava no padrão de 10s do Vercel) e o prompt de mesclagem é pesado (2 arquivos
                  // de código inteiros + max_tokens:4000), a mesclagem quase sempre estourava o
                  // tempo e caía no fallback abaixo — SUBSTITUINDO o código do aluno pelo do
                  // professor, exatamente o comportamento que essa função inteira existe pra evitar.
                  const merged = await Promise.race([
                    askClaudeJson(
                      `O professor passou este código pra turma copiar:\n${sent.files.map(f=>`// ===== ${f.name} =====\n${f.code}`).join("\n\n")}\n\nEste aluno JÁ tinha escrito isto no perfil dele (pode estar incompleto ou ter pequenos erros):\n${currentFiles.map(f=>`// ===== ${f.name} =====\n${f.code}`).join("\n\n")}\n\nCrie a versão final dos arquivos: MANTENHA tudo que o aluno já escreveu (não reescreva do zero nem mude o estilo do que já está certo), só ACRESCENTE o que estiver faltando (comparando com o código do professor) e CORRIJA erros de sintaxe/digitação que já existiam no que ele tinha.\n\nResponda APENAS em JSON puro, sem markdown: {"files":[{"name":"nome do arquivo","code":"código final"}]}`,
                      "Você funde com cuidado o código de um aluno com o material novo do professor, sem apagar o esforço dele. Responda APENAS JSON puro.",
                      { max_tokens: 4000 }
                    ),
                    new Promise((_, rej) => setTimeout(() => rej(new Error("merge_timeout")), 35000)),
                  ]);
                  if (Array.isArray(merged.files) && merged.files.length) { mergedFiles = merged.files; mergeSucceeded = true; }
                } catch {}
              }
              setFiles(mergedFiles);
              setActive(0);
              await clearCodeSend(shift, studentName);
              setRobotMsg(mergeSucceeded
                ? "✅ O professor enviou código novo — completei o que faltava no seu, sem apagar o que você já tinha feito!"
                : hasOwnCode
                  ? "✅ O professor enviou código novo! Não consegui mesclar automaticamente a tempo, então apliquei o código dele direto."
                  : "✅ O professor enviou um código novo pra você! Você pode modificar como quiser.");
              setRobotState("ok");
              await persist({ files: mergedFiles });
              setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 5000);
            }
          } catch {}
          codeSendHandledRef.current = false;
        })();
      }
      await persist();
      const streak = computeStreak(attendanceRef.current, currentClassDays, stateRef.current.justifications);
      setStreakCount(streak);
      if (streak >= 3) unlockAchievement("sequencia-3");
      if (streak >= 7) unlockAchievement("sequencia-7");
      if (streak >= 14) unlockAchievement("sequencia-14");
      const presences = Object.values(attendanceRef.current).filter(v => v === "present").length;
      if (presences >= 5) unlockAchievement("presencas-5");
      if (presences >= 15) unlockAchievement("presencas-15");
      // 🏗️ Arquiteto de Código: 100 linhas de verdade (não vazias) somando todos os arquivos — linhas
      // COLADAS (Ctrl+V) não contam, só o que o aluno realmente escreveu (ver handleEditorPaste)
      const totalLines = (s.files || []).reduce((n, f) => n + (f.code ? f.code.split("\n").filter(l => l.trim()).length : 0), 0);
      const typedLines = Math.max(0, totalLines - (s.pastedLines || 0));
      if (typedLines >= 100) unlockAchievement("cem-linhas");
    };
    tick();
    const iv = setInterval(tick, 12000);
    return () => { active2 = false; clearInterval(iv); };
  }, [loaded, persist, onLogout, shift, studentName]);

  // robô: só analisa quando o aluno clica no botão (limpa o aviso se apagar o código)
  useEffect(() => {
    const trimmed = activeCode.trim();
    if (trimmed.length < 12) { setRobotState("idle"); setRobotMsg(""); setKeysToShow([]); setFeedback(null); }
  }, [activeCode]);

  // modo guiado: monta o código real a partir da lista de blocos que o aluno clicou (sem precisar digitar)
  const regenerateGuidedCode = (blocks) => blocks.map(b=>b.code).join("\n\n");

  const addGuidedBlock = (block, value) => {
    const code = block.template(value);
    const newBlock = { uid: `${Date.now()}-${Math.random().toString(36).slice(2)}`, id: block.id, emoji: block.emoji, label: block.label, code };
    const updated = [...guidedBlocks, newBlock];
    setGuidedBlocks(updated);
    const fullCode = regenerateGuidedCode(updated);
    setFiles(prev => { const u=[...prev]; u[0] = { ...u[0], code: fullCode }; return u; });
    persist({ guidedBlocks: updated, code: fullCode });
    playSound("click");
    speak(block.speak ? block.speak(value) : block.label);
    setPendingBlock(null);
  };

  const removeGuidedBlock = (uid) => {
    const updated = guidedBlocks.filter(b=>b.uid!==uid);
    setGuidedBlocks(updated);
    const fullCode = regenerateGuidedCode(updated);
    setFiles(prev => { const u=[...prev]; u[0] = { ...u[0], code: fullCode }; return u; });
    persist({ guidedBlocks: updated, code: fullCode });
  };

  const moveGuidedBlock = (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= guidedBlocks.length) return;
    const updated = [...guidedBlocks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setGuidedBlocks(updated);
    const fullCode = regenerateGuidedCode(updated);
    setFiles(prev => { const u=[...prev]; u[0] = { ...u[0], code: fullCode }; return u; });
    persist({ guidedBlocks: updated, code: fullCode });
  };

  // arrastar e soltar: move o bloco de "from" pra posição de "to" (qualquer distância, não só vizinho)
  const reorderGuidedBlock = (from, to) => {
    if (from == null || to == null || from === to || !guidedBlocks[from]) return;
    const updated = [...guidedBlocks];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setGuidedBlocks(updated);
    const fullCode = regenerateGuidedCode(updated);
    setFiles(prev => { const u=[...prev]; u[0] = { ...u[0], code: fullCode }; return u; });
    persist({ guidedBlocks: updated, code: fullCode });
    playSound("snap");
    setGuidedJustDropped(moved.uid);
    setTimeout(() => setGuidedJustDropped(j => j===moved.uid ? null : j), 320);
  };

  const startGuidedDrag = (index) => {
    guidedDragFromRef.current = index;
    setGuidedDragIdx(index);
    setGuidedOverIdx(index);
  };

  // durante o arrasto, acha a fileira de bloco mais próxima do ponteiro (pelo centro vertical de cada
  // uma) — os blocos só trocam de posição de verdade quando o dedo/mouse solta (onUp), nunca durante
  useEffect(() => {
    if (guidedDragIdx == null) return;
    const findClosestIndex = (y) => {
      let closest = null, closestDist = Infinity;
      guidedRowRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const dist = Math.abs(y - mid);
        if (dist < closestDist) { closestDist = dist; closest = i; }
      });
      return closest;
    };
    const onMove = (e) => {
      const y = e.touches ? e.touches[0]?.clientY : e.clientY;
      if (y == null) return;
      if (e.cancelable) e.preventDefault();
      const closest = findClosestIndex(y);
      if (closest != null) setGuidedOverIdx(closest);
    };
    const onUp = () => {
      const from = guidedDragFromRef.current;
      setGuidedOverIdx(currentOver => {
        if (from != null && currentOver != null && currentOver !== from) reorderGuidedBlock(from, currentOver);
        return null;
      });
      guidedDragFromRef.current = null;
      setGuidedDragIdx(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guidedDragIdx]);

  // "Nyx te ensina" no Modo Guiado: gera uma mini-lição nova sob demanda, com o C# explicado através de
  // exemplos de criação de jogos — o professor mantém o Modo Guiado ligado durante a aula toda, e o aluno
  // pode pedir quantas lições quiser nesse tempo (é o "Nyx cria coisas até o final da aula")
  const generateGuidedLesson = async () => {
    if (guidedLessonLoading) return;
    setGuidedLessonLoading(true);
    try {
      const usedBlocks = guidedBlocks.map(b=>b.label).join(", ") || "nenhum bloco ainda";
      const already = guidedLessons.map(l=>l.titulo).join(", ") || "nenhuma";
      const lesson = await askClaudeJson(
        `O aluno já usou estes blocos no programa dele: ${usedBlocks}.\nLições que ele já recebeu antes (NÃO repita o mesmo assunto): ${already}.\n\nCrie UMA mini-lição nova sobre um conceito simples de C#, explicado através de um exemplo de CRIAÇÃO DE JOGOS. Responda APENAS em JSON puro, sem markdown:\n{"emoji":"emoji que combine","titulo":"nome bem curto do conceito","codigo":"1 a 3 linhas de código C# de exemplo (use \\n pra quebrar linha)","oQueFaz":"1 a 2 frases bem simples explicando o que esse código faz","exemploJogo":"1 a 2 frases dando um exemplo de jogo onde isso apareceria"}`,
        NYX_GUIDED_SYSTEM + "\nResponda APENAS JSON puro válido, sem markdown."
      );
      const newLesson = { id:`${Date.now()}-${Math.random().toString(36).slice(2)}`, ...lesson };
      const updated = [newLesson, ...guidedLessons];
      setGuidedLessons(updated);
      await persist({ guidedLessons: updated });
      const speech = [lesson.titulo, lesson.codigo ? `O código é: ${codeForSpeech(lesson.codigo)}` : null, lesson.oQueFaz, lesson.exemploJogo].filter(Boolean).join(". ");
      speak(speech);
    } catch {}
    setGuidedLessonLoading(false);
  };

  // conta mais um erro de código no dia de hoje (usado pelo Hall da Fama pra valorizar quem
  // escreve certo, não só quem tira nota alta) — devolve o mapa atualizado pra já entrar no
  // mesmo persist() que salva o feedback, sem precisar de uma segunda chamada ao servidor
  const bumpErrorHistory = () => {
    const tk = todayKey();
    const prev = stateRef.current.errorHistory || {};
    const next = { ...prev, [tk]: (prev[tk] || 0) + 1 };
    setErrorHistory(next);
    return next;
  };

  // analisa o código tentando os modelos disponíveis em sequência — se o primeiro falhar por
  // qualquer motivo (chave não configurada, instabilidade, etc.), tenta o outro automaticamente
  // e SEM avisar o aluno no meio do caminho; só mostra erro se os dois falharem
  const analyzeCode = async () => {
    const trimmed = activeCode.trim();
    if (trimmed.length < 12 || analyzing) return;
    setRobotState("thinking"); setAnalyzing(true);
    const quick = quickCheck(activeCode);
    if (quick) {
      const fb = { ok:false, message:quick.message, missingChars:quick.missing||[] };
      setRobotState("error"); setRobotMsg(quick.message); setKeysToShow(quick.missing||[]); setFeedback(fb);
      setCodeErrors([]); setShowErrorWalkthrough(false); setErrorHelpLevel({});
      await persist({ feedback:fb, hasError:true, errorHistory: bumpErrorHistory() });
      setAnalyzing(false);
      return;
    }
    // 🔌 sem internet nenhuma agora: nem tenta chamar a IA (ia falhar de qualquer jeito) — avisa
    // com carinho e marca pra verificar sozinho assim que a conexão voltar
    if (isOffline()) {
      setRobotState("error");
      setRobotMsg("📡 Sem internet agora — seu código já está salvo neste computador. Assim que a conexão voltar, eu verifico automaticamente!");
      pendingAnalyzeRef.current = true;
      setAnalyzing(false);
      return;
    }
    // tenta os dois modelos gratuitos primeiro (na ordem de sempre) e, só se os DOIS falharem de
    // verdade (é aí que aparece "Reconectando Nyx"), usa a Anthropic (Sonnet 5) como último recurso —
    // assim o aluno não fica travado esperando o gratuito voltar, mas o gasto pago só entra quando precisa
    const order = [lastProviderRef.current, ANALYZE_PROVIDERS.find(p => p !== lastProviderRef.current), "anthropic"];
    let lastErr = null;
    for (const provider of order) {
      try {
        const parsed = await askClaudeJson(
          `Revise o código ${studyLang ? studyLang.label : "C#"} de um aluno iniciante como um COMPILADOR faria, linha por linha.\n\n${otherFilesCtx(files, active, studyLang)}Arquivo em edição — é ESTE e SÓ ESTE que você deve revisar (${files[active]?.name || "Program.cs"}):\n\`\`\`${studyLang ? studyLang.codeLang : "csharp"}\n${activeCode}\n\`\`\`\n\nO que verificar (nesta ordem):\n${reviewChecklistFor(studyLang)}\n\nLembretes IMPORTANTES:\n- Os "Outros arquivos" (se houver) são SÓ contexto, pra você saber que existem e podem ser usados no arquivo em edição — NUNCA os revise, NUNCA aponte erro neles, e NUNCA copie um "trecho" retirado deles. Cada "trecho" de erro tem que ser uma linha que existe literalmente no arquivo em edição.${studyLang ? "" : "\n- Top-level statements (código sem class/Main) e ausência de using System são VÁLIDOS — não são erro.\n- Não aponte classe/método \"inexistente\" se estiver definido em outro arquivo do projeto."}\n- NÃO invente erro em código correto. Na dúvida real, prefira ok=true.\n\nResponda APENAS em JSON puro, sem markdown, com os campos NESTA ordem:\n{"analise": "sua verificação rápida linha a linha, citando o que conferiu (máx 3 frases — o aluno não vê isto)", "ok": true ou false, "message": "se tudo certo: elogio bem curto; se houver erro: onde está (linha/trecho) e como corrigir mostrando a forma certa, em 1 a 3 frases gentis", "missingChars": ["só símbolos que faltam, ex: ; } ) — vazio se nenhum"], "errors": ["se ok for false: uma lista com CADA erro encontrado no arquivo em edição (pode ter mais de um). Cada item é um objeto {\\"trecho\\": a linha EXATA e completa como aparece no ARQUIVO EM EDIÇÃO (nunca nos outros arquivos), copiada literalmente, sem espaços extras no início; \\"explicacao\\": por que está errado e como corrigir, 1 a 2 frases bem simples e gentis; \\"exemplo\\": a mesma linha já corrigida}. Lista vazia se ok for true."]}`,
          (studyLang ? studyLang.system : CS_SYSTEM) + "\nResponda APENAS JSON puro, sem markdown." + nyxPrefsInstruction(nyxPrefs),
          // silentHealth: cada tentativa da sequência não deve acender "Reconectando Nyx" sozinha —
          // só o resultado final (depois do loop) reporta a saúde geral, ver abaixo
          { temperature: 0, provider, silentHealth: true }
        );
        // só lembra o modelo GRATUITO que funcionou (pra próxima vez tentar ele primeiro de novo) —
        // o Sonnet 5 é só reserva de emergência, não deve virar o preferido
        if (provider !== "anthropic") lastProviderRef.current = provider;
        setRobotState(parsed.ok?"ok":"error"); setRobotMsg(parsed.message); setKeysToShow(parsed.missingChars||[]); setFeedback(parsed);
        await persist(parsed.ok ? { feedback:parsed, hasError:false } : { feedback:parsed, hasError:true, errorHistory: bumpErrorHistory() });
        if (parsed.ok) {
          unlockAchievement("codigo-limpo");
          setCodeErrors([]); setShowErrorWalkthrough(false); setErrorHelpLevel({});
        } else {
          const errs = (Array.isArray(parsed.errors) ? parsed.errors : []).filter(e => e && e.trecho && findLineIndex(activeCode, e.trecho) >= 0);
          setCodeErrors(errs);
          setErrorHelpLevel({});
          if (errs.length > 0) { setErrorWalkStep(0); setShowErrorWalkthrough(true); }
        }
        lastErr = null;
        break; // deu certo — não precisa tentar o próximo modelo
      } catch (e) {
        lastErr = e; // guarda e tenta o próximo modelo da lista, sem avisar o aluno ainda
      }
    }
    // agora sim: UM report geral só, refletindo o resultado FINAL da sequência inteira (não cada
    // tentativa isolada) — "Reconectando Nyx" só acende pra sala toda quando o Nyx realmente não
    // respondeu de jeito nenhum, não toda vez que o primeiro modelo gratuito da fila estava
    // instável e o próximo resolveu sozinho sem o aluno nem perceber
    if (!lastErr) reportAiHealth(true);
    else if (lastErr.message !== 'ROBOTKEY_MISSING') reportAiHealth(false);
    if (lastErr) {
      if (lastErr.message === 'ROBOTKEY_MISSING') {
        setRobotState("error");
        setRobotMsg(lastErr.userMsg || "🔑 Nyx está offline: o professor precisa configurar a chave da IA no painel do Vercel. A verificação básica do código continua funcionando!");
      } else if (isNetworkError(lastErr)) {
        setRobotState("error");
        setRobotMsg("📡 A internet caiu bem na hora de verificar — mas seu código está salvo! Assim que a conexão voltar, eu verifico automaticamente.");
        pendingAnalyzeRef.current = true;
      } else {
        setRobotState("error");
        setRobotMsg(`😵 Nyx tentou analisar com todos os modelos disponíveis e nenhum respondeu agora. Tente de novo em instantes.\n\n🔧 Detalhe técnico (pra mostrar ao Vegapunk): ${lastErr.message || lastErr}`);
      }
    }
    setAnalyzing(false);
  };

  // enquanto houver erros sinalizados, sublinha em vermelho a linha correspondente no editor — some
  // sozinho quando o aluno edita a linha (o Nyx só reanalisa de novo se o aluno pedir, clicando em
  // "Analisar código" ou no botão de reverificar do card de erro — nunca mais por conta própria)
  const errorLinesForEditor = codeErrors.map(e => findLineIndex(activeCode, e.trecho)).filter(i => i >= 0);
  useEffect(() => {
    if (!codeErrors.length) return;
    const stillPresent = codeErrors.filter(e => findLineIndex(activeCode, e.trecho) >= 0);
    if (stillPresent.length !== codeErrors.length) {
      setCodeErrors(stillPresent);
      if (stillPresent.length === 0) {
        setShowErrorWalkthrough(false);
      } else {
        setErrorWalkStep(s => Math.min(s, stillPresent.length - 1));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCode]);

  // anti-cola geral: o professor está passando código pra copiar (escrevendo em "Meu código" agora)
  // e este aluno está distraído (loja, teclado ou duelo) em vez de copiar — depois de 10s parado
  // nessa distração, o Nyx traz ele de volta sozinho pro editor, sem avisar nada antes
  useEffect(() => {
    const distracted = showNyxShop || showKeyboard || showDuel || showTeamDuel;
    if (!teacherWriting || !distracted) return;
    const t = setTimeout(() => {
      setShowNyxShop(false);
      setShowKeyboard(false);
      setShowDuel(false);
      setShowTeamDuel(false);
    }, 10000);
    return () => clearTimeout(t);
  }, [teacherWriting, showNyxShop, showKeyboard, showDuel, showTeamDuel]);

  // arquivos — na sala de linguagens a extensão padrão acompanha a linguagem escolhida (.html/.css/.php/.js)
  const fileExt = studyLang ? `.${studyLang.fileName.split(".").pop()}` : ".cs";
  const updateActiveCode = (newCode) => setFiles(fs => fs.map((f,i)=> i===active ? { ...f, code:newCode } : f));
  // anti-cola: soma quantas linhas não-vazias vieram de um Ctrl+V no editor (cumulativo, nunca some) —
  // usado só pra tirar da conta da conquista "Arquiteto de Código" (ver tick() acima), não bloqueia nada
  const handleEditorPaste = (text) => {
    const n = String(text || "").split("\n").filter(l => l.trim()).length;
    if (n > 0) setPastedLines(p => p + n);
  };
  const uniqueName = (base, ignoreIdx=-1) => {
    let name = base, n = 2;
    const extRe = new RegExp(`\\${fileExt}$`, "i");
    while (files.some((f,i)=> i!==ignoreIdx && f.name.toLowerCase()===name.toLowerCase())) {
      name = base.replace(extRe, "") + n + fileExt; n++;
    }
    return name;
  };
  const addFile = () => {
    const name = uniqueName(`Arquivo${files.length+1}${fileExt}`);
    const newIdx = files.length;
    setFiles(fs => [...fs, { name, code:"" }]);
    setActive(newIdx);
    setRenaming(newIdx);           // já abre para o aluno nomear
    setRenameValue(name.replace(new RegExp(`\\${fileExt}$`, "i"), ""));
  };
  const deleteFile = (idx) => {
    if (files.length <= 1) return;
    setFiles(fs => fs.filter((_,i)=>i!==idx));
    setActive(a => (idx<=a ? Math.max(0,a-1) : a));
  };
  const openRename = (idx) => { setRenaming(idx); setRenameValue((files[idx]?.name || "").replace(new RegExp(`\\${fileExt}$`, "i"), "")); };
  const confirmRename = () => {
    if (renaming == null) return;
    let base = String(renameValue).trim().replace(/["'\/\\]/g, "");
    if (!base) base = `Arquivo${renaming+1}`;
    let name = new RegExp(`\\${fileExt}$`, "i").test(base) ? base : base + fileExt;
    name = uniqueName(name, renaming);
    const idx = renaming;
    setFiles(fs => fs.map((f,i)=> i===idx ? { ...f, name } : f));
    setRenaming(null); setRenameValue("");
  };
  const cancelRename = () => { setRenaming(null); setRenameValue(""); };

  // atualiza stateRef.current na hora (não só via useEffect no próximo render) — sem isso, quando
  // handleNyxTheme chama unlockAchievement logo em seguida, o persist() do achievement ainda vê o
  // theme ANTIGO em stateRef.current (o React ainda não re-renderizou) e salva por cima, apagando a
  // cor que acabou de ser escolhida — mesma classe de corrida já corrigida pro nyxPoints antes
  const setThemeAndSave = (t) => { setTheme(t); stateRef.current = { ...stateRef.current, theme: t }; persist({ theme: t }); };
  const handleNyxTheme = (t) => { setThemeAndSave(t); if (String(t).startsWith("#")) unlockAchievement("artista"); };

  // 🌟 portfólio público: só o próprio aluno liga (opt-in) — o professor pode desligar se precisar
  const togglePortfolioPublic = () => {
    const next = !portfolioPublic;
    setPortfolioPublic(next);
    // liga de novo (ou pela primeira vez) sempre reinicia os 60 dias de validade — como se fosse
    // um novo consentimento; desligar não mexe na data (não importa mais enquanto está desligado)
    const at = next ? Date.now() : portfolioActivatedAt;
    if (next) setPortfolioActivatedAt(at);
    persist({ portfolioPublic: next, portfolioActivatedAt: at });
  };
  const portfolioLink = `${typeof window !== "undefined" ? window.location.origin : ""}/portfolio/${encodeURIComponent(shift || "matutino")}/${encodeURIComponent(studentName)}`;
  const copyPortfolioLink = async () => {
    try { await navigator.clipboard.writeText(portfolioLink); setPortfolioCopyMsg("🔗 Link copiado!"); }
    catch { setPortfolioCopyMsg(portfolioLink); }
    setTimeout(() => setPortfolioCopyMsg(""), 4000);
  };

  // desbloqueia as conquistas de pontos acumulados (nyxPoints é o total GANHO, nunca diminui)
  const checkPointsAchievements = (total) => {
    if (total >= 10) unlockAchievement("pontos-10");
    if (total >= 50) unlockAchievement("pontos-50");
    if (total >= 100) unlockAchievement("pontos-100");
    if (total >= 250) unlockAchievement("pontos-250");
  };

  const toggleMuted = () => { setMuted(m => { setSoundsMuted(!m); return !m; }); };

  // desbloqueia a conquista "Caçador Lendário" quando TODOS os Easter Eggs já tiverem sido achados
  const checkAllEggsFound = () => {
    const current = stateRef.current.achievements || [];
    if (ALL_EGG_ACHIEVEMENT_IDS.every(id => current.includes(id))) unlockAchievement("todos-segredos");
  };

  // desbloqueia uma conquista (se ainda não tiver) e mostra o aviso animado
  // lê/escreve via stateRef para funcionar mesmo chamada de dentro de closures "velhas" (ex: o heartbeat)
  const unlockAchievement = (id) => {
    const current = stateRef.current.achievements || [];
    if (current.includes(id)) return;
    const next = [...current, id];
    stateRef.current.achievements = next;
    setAchievements(next);
    persist({ achievements: next });
    setNewAchievement(achievementInfo(id));
    playSound("achievement");
    fireConfetti("achievement");
    setTimeout(() => setNewAchievement(null), 4000);
  };

  // 🏗️ desafio livre da semana: o aluno propõe uma ideia, o Nyx quebra em passos e o progresso
  // fica salvo no próprio perfil — reseta sozinho quando a semana (ISO, segunda a domingo) vira
  const saveWeeklyChallenge = async (challenge) => {
    setWeeklyChallenge(challenge);
    await persist({ weeklyChallenge: challenge });
  };
  const toggleChallengeStep = async (i) => {
    if (!weeklyChallenge) return;
    const doneSteps = weeklyChallenge.doneSteps.includes(i) ? weeklyChallenge.doneSteps.filter(x=>x!==i) : [...weeklyChallenge.doneSteps, i];
    const updated = { ...weeklyChallenge, doneSteps };
    setWeeklyChallenge(updated);
    await persist({ weeklyChallenge: updated });
  };
  const finishWeeklyChallenge = async () => {
    const s = stateRef.current;
    if (!s.weeklyChallenge || s.weeklyChallenge.status === "done") return;
    const updated = { ...s.weeklyChallenge, status: "done", completedAt: Date.now() };
    const np = (s.nyxPoints||0) + 10; // bônus generoso — é um desafio da semana inteira, não uma atividade rápida
    stateRef.current = { ...s, weeklyChallenge: updated, nyxPoints: np };
    setWeeklyChallenge(updated);
    setNyxPoints(np);
    await persist({ weeklyChallenge: updated, nyxPoints: np });
    checkPointsAchievements(np);
    unlockAchievement("livre-pensador");
    setShowFreeBuild(false);
  };

  // ⚔️🛡️ espada + escudo equipados juntos: o Nyx vira um Espartano. No instante em que o combo se
  // forma, troca sozinho o tema de fundo pro tema Espartano (guardando o de antes) — o aluno decide
  // depois, no botão do cabeçalho, se fica com ele ou volta pro tema de sempre; nada disso mexe no
  // editor de código em si, só no fundo da página.
  const isSpartan = nyxGear?.hand === "espada" && nyxGear?.shield === "escudo";
  useEffect(() => {
    if (isSpartan && theme !== "spartan") {
      const prevTheme = themeBeforeSpartan || theme;
      setThemeBeforeSpartan(prevTheme);
      setTheme("spartan");
      persist({ theme: "spartan", themeBeforeSpartan: prevTheme });
      unlockAchievement("espartano");
      checkAllEggsFound();
    }
    // fala de guerreiro Espartano só na primeira vez que o combo é formado NA VIDA do aluno —
    // depois disso, mesmo desequipando e equipando de novo, ela não repete
    if (isSpartan && !spartanIntroShown) {
      setSpartanIntroShown(true);
      persist({ spartanIntroShown: true });
      setRobotState("ok");
      setRobotMsg("🛡️ ISTO... É... C#!! Nenhum erro de compilação assusta um guerreiro Espartano. Vamos à batalha pelo código perfeito!");
      setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 10000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpartan]);

  // 🥚 segredos escondidos na área do aluno (antigos comandos de terminal, agora achados clicando)
  const HIDDEN_EGG_ACHIEVEMENTS = { sanduiche:"segredo-sanduiche", cafe:"segredo-cafe", "42":"segredo-42", rm:"segredo-rm" };
  const triggerEgg = (kind) => {
    unlockAchievement("segredo");
    if (HIDDEN_EGG_ACHIEVEMENTS[kind]) unlockAchievement(HIDDEN_EGG_ACHIEVEMENTS[kind]);
    checkAllEggsFound();
    const msgs = {
      sanduiche: ["🥪 Ei! Achou a migalha escondida... aqui está seu lanchinho imaginário. Bora continuar codando!", 6000],
      cafe:      ["☕ Aaah, muito obrigado pelo café! Bora codar com tudo agora!", 6000],
      "42":      ["🌌 A resposta para a vida, o universo e tudo mais... é 42! (Se não entendeu, pesquise 'O Guia do Mochileiro das Galáxias')", 7000],
      rm:        ["😅 Boa tentativa! Mas esse cantinho aqui é só de mentirinha — nada se apaga de verdade.", 6000],
    };
    const found = msgs[kind];
    if (found) { setRobotState("ok"); setRobotMsg(found[0]); setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, found[1]); }
  };

  // 🏴‍☠️ baú do tesouro escondido: só concede os 700 pontos uma única vez por aluno — lê/escreve
  // via stateRef, mesmo motivo do openGift (clique duplo bem rápido no ícone escondido)
  const findTreasure = () => {
    const s = stateRef.current;
    if (s.treasureFound) return;
    const np = (s.nyxPoints||0) + 700;
    stateRef.current = { ...s, treasureFound: true, nyxPoints: np };
    setTreasureFound(true);
    setNyxPoints(np);
    playSound("achievement");
    persist({ treasureFound: true, nyxPoints: np });
    unlockAchievement("tesouro");
    checkAllEggsFound();
    checkPointsAchievements(np);
    setRobotState("ok");
    setRobotMsg("🏴‍☠️ VOCÊ ACHOU O TESOURO ESCONDIDO! +700 pontos do Nyx! Muito bem, caçador(a)!");
    setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 8000);
  };

  // segredos do Terminal que reagem na tela do aluno (os outros só mostram texto no próprio terminal)
  const TERMINAL_EGG_ACHIEVEMENTS = { moo:"segredo-vaca", dance:"segredo-danca", matrix:"segredo-matrix", piada:"segredo-piada", piratahat:"segredo-pirata" };
  const handleEasterEgg = (egg) => {
    unlockAchievement("segredo");
    if (TERMINAL_EGG_ACHIEVEMENTS[egg]) unlockAchievement(TERMINAL_EGG_ACHIEVEMENTS[egg]);
    checkAllEggsFound();
    if (egg === "dance") { setRobotState("ok"); setRobotMsg("💃 Você achou meu passo de dança secreto! Não conta pra ninguém... ou conta, vai ser divertido."); setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 6000); }
    if (egg === "piratahat") {
      if (!nyxOwned.includes("chapeuPirata")) {
        const newOwned = [...nyxOwned, "chapeuPirata"];
        setNyxOwned(newOwned);
        persist({ nyxOwned: newOwned });
      }
      setRobotState("ok");
      setRobotMsg("🏴‍☠️ Arrr! Você desbloqueou o Chapéu Pirata na Loja do Nyx! Vá até a loja pra vestir.");
      setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 6000);
    }
  };

  // ao equipar o Chapéu Pirata, o Nyx pega um baú e solta a fala clássica — só na hora em que veste
  const handleEquipGear = (newGear) => {
    const wasPirateHat = nyxGear.head === "chapeuPirata";
    setNyxGear(newGear);
    persist({ nyxGear: newGear });
    if (newGear.head === "chapeuPirata" && !wasPirateHat) {
      setRobotState("ok");
      setRobotMsg("🏴‍☠️ Argh! Olhem só, um chapéu de pirata!\n\n\"Quer o meu tesouro? Procure-o... nele há tudo o que essa plataforma pode oferecer.\"");
      setTimeout(() => { setRobotMsg(""); setRobotState("idle"); }, 10000);
    }
  };

  // 🥚 os segredos escondidos ficam espalhados por TODA a área do aluno (programar, resumo,
  // atividade, tela de "concluído") — não só a tela de código — sempre com position:fixed pra
  // existirem em qualquer uma dessas telas sem nunca atrapalhar o que está em primeiro plano
  const renderHiddenEggs = () => (
    <>
      <span onClick={()=>triggerEgg("sanduiche")} title="" style={{ position:"fixed", bottom:8, left:8, fontSize:17, opacity:0.16, zIndex:3, cursor:"default", userSelect:"none" }}>🥪</span>
      <span onClick={()=>triggerEgg("cafe")} title="" style={{ position:"fixed", right:8, top:"50%", transform:"translateY(-50%)", fontSize:17, opacity:0.15, zIndex:3, cursor:"default", userSelect:"none" }}>☕</span>
      <span onClick={()=>triggerEgg("42")} title="" style={{ position:"fixed", bottom:8, right:8, fontSize:17, opacity:0.16, zIndex:3, cursor:"default", userSelect:"none" }}>🌌</span>
      <span onClick={()=>triggerEgg("rm")} title="" style={{ position:"fixed", left:8, top:"50%", transform:"translateY(-50%)", fontSize:17, opacity:0.15, zIndex:3, cursor:"default", userSelect:"none" }}>🗑️</span>
      {/* o baú só existe pra quem já desbloqueou o Chapéu Pirata (segredo "nyx pirata" no terminal) —
          é a pista do próprio Nyx ("procure o tesouro") que faz sentido do baú aparecer */}
      {nyxOwned.includes("chapeuPirata") && (
        <span onClick={findTreasure} title="" style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:16, height:16, lineHeight:"16px", textAlign:"center", fontSize:12, opacity:0.07, zIndex:3, cursor:"default", userSelect:"none" }}>🏴‍☠️</span>
      )}
    </>
  );

  // compra um item na Loja do Nyx: gasta os pontos (nyxSpent), entra pro inventário e já equipa
  // lê/escreve via stateRef (não os closures de nyxOwned/nyxSpent/nyxGear) pra dois cliques bem
  // rápidos seguidos (comum na tela touch da carreta) não passarem os dois pela checagem com o
  // mesmo estado "antigo" e um deles sobrescrever o outro sem gastar/registrar o item direito
  const handleBuyItem = async (item) => {
    const s = stateRef.current;
    if ((s.nyxOwned||[]).includes(item.id) || ((s.nyxPoints||0) - (s.nyxSpent||0)) < item.cost) return;
    const newSpent = (s.nyxSpent||0) + item.cost;
    const newOwned = [...(s.nyxOwned||[]), item.id];
    const newGear = { ...(s.nyxGear||DEFAULT_NYX_GEAR), [item.slot]: item.id };
    stateRef.current = { ...s, nyxSpent: newSpent, nyxOwned: newOwned, nyxGear: newGear };
    setNyxSpent(newSpent);
    setNyxOwned(newOwned);
    setNyxGear(newGear);
    playSound("achievement");
    await persist({ nyxSpent: newSpent, nyxOwned: newOwned, nyxGear: newGear });
    unlockAchievement("comprador");
    if (newOwned.length >= 4) unlockAchievement("colecionador");
  };

  // Nyx explica os erros da atividade — gera tudo de uma vez (rápido) e depois revela passo a passo num modal
  const explainErrors = async () => {
    const activity = dynamicActivity || [];
    // a questão bônus nunca entra na explicação de erros — errar ou pular ela não é "erro de verdade"
    const wrong = activity.map((q,i)=>({ q, i })).filter(({ q, i }) => !q.bonus && answers[i] !== q.correct);
    if (!wrong.length || explaining) return;
    setExplaining(true);
    setExplainFailMsg("");
    try {
      const list = wrong.map(({ q, i }) => `Pergunta: ${q.q}\nO aluno respondeu: ${q.opts[answers[i]] ?? "(não respondeu)"}\nResposta correta: ${q.opts[q.correct]}`).join("\n\n");
      const langName = studyLang ? studyLang.label : "C#";
      const parsed = await askClaudeJson(
        `Um aluno iniciante errou estas questões sobre o próprio código ${langName} dele:\n\n${list}\n\nPara CADA questão errada, crie uma seção explicando o conceito de forma simples e gentil: por que a resposta certa é a certa e onde ele provavelmente se confundiu, seguida de um EXEMPLO CURTO de código ${langName} correto que ilustre bem o conceito (pode ser um exemplo didático, não precisa ser do código dele). No final, escreva UMA mensagem curta e encorajadora olhando o desempenho geral dele.\n\nResponda APENAS em JSON puro, sem markdown:\n{"secoes":[{"emoji":"emoji que combine com o conceito","titulo":"nome curto do conceito","explicacao":"1 a 3 frases simples e gentis","exemplo":"código ${langName} curto e correto (use \\n para quebrar linha)"}],"encorajamento":"mensagem final motivadora, 1 a 2 frases"}`,
        (studyLang ? studyLang.system : CS_SYSTEM) + "\nResponda APENAS JSON puro, sem markdown." + nyxPrefsInstruction(nyxPrefs),
        { temperature: 0.5 }
      );
      const secoes = Array.isArray(parsed.secoes) ? parsed.secoes : [];
      if (!secoes.length) throw new Error("sem seções");
      setErrorSections(secoes);
      setErrorEncouragement(parsed.encorajamento || "Continue praticando, você está indo muito bem!");
      setShowErrorExplain(true);
    } catch { setExplainFailMsg("Não consegui gerar as explicações agora. Tente de novo em instantes."); }
    setExplaining(false);
  };

  // todo o código do projeto do aluno, em TODOS os arquivos (não só a aba aberta)
  const allCodeToday = () => (files||[]).filter(f=>(f.code||"").trim()).map(f=>`// ===== ${f.name} =====\n${f.code}`).join("\n\n");

  // compara o código atual com uma "foto" anterior (do início do dia, ou do último resumo gerado)
  // e devolve só as linhas que ainda não estavam lá — usado tanto pro resumo do dia quanto pra
  // saber o que é realmente NOVO se o aluno salvar de novo depois do professor passar mais código
  const codeWrittenSince = (snapshotFiles) => {
    const oldByName = Object.fromEntries((snapshotFiles || []).map(f => [f.name, f.code || ""]));
    return (files || [])
      .map(f => {
        const oldCode = oldByName[f.name];
        if (oldCode == null || !oldCode.trim()) return { name: f.name, code: f.code || "" }; // arquivo novo (ou vazio antes): tudo é novo
        const oldLines = new Set(oldCode.split("\n").map(l => l.trim()).filter(Boolean));
        const newLines = (f.code || "").split("\n").filter(l => l.trim() && !oldLines.has(l.trim()));
        return { name: f.name, code: newLines.join("\n") };
      })
      .filter(f => (f.code || "").trim())
      .map(f => `// ===== ${f.name} =====\n${f.code}`)
      .join("\n\n");
  };
  // só o que foi escrito HOJE: compara o código atual com a "foto" tirada no primeiro acesso do dia
  const codeWrittenToday = () => codeWrittenSince(daySnapshotRef.current?.files);
  // só o que foi escrito DEPOIS do último resumo gerado hoje (pra continuação do resumo)
  const codeWrittenSinceLastSummary = () => codeWrittenSince(summarySnapshotRef.current?.files);

  const handleSave = async () => {
    const fullCode = allCodeToday();
    if (fullCode.trim().length < 10) { setSaveWarn("✏️ Escreva algum código antes de salvar!"); setTimeout(()=>setSaveWarn(""), 4000); return; }
    // 🔌 sem internet nenhuma: nem entra na tela de "gerando" (que ia travar esperando uma resposta
    // que nunca chega) — avisa que o código está salvo e tenta de novo sozinho quando a conexão voltar
    if (isOffline()) {
      pendingSaveRef.current = true;
      setSaveWarn("📡 Sem internet agora — seu código já está salvo! Assim que a conexão voltar, gero o resumo e a atividade automaticamente.");
      setTimeout(()=>setSaveWarn(""), 7000);
      return;
    }
    setAnswers({});
    setDetailedSummary(""); setSummaryView("simples"); setDetailFailMsg(""); // aula nova: zera a versão detalhada da aula anterior
    setPhase("generating");
    setGeneratingMsg("📖 Lendo seu código...");
    await persist({ phase:"generating", answers:{} });
    try {
      setGeneratingMsg("📚 Criando o resumo e a atividade da sua aula...");
      const todayCode = codeWrittenToday();
      const hasTodayDiff = todayCode.trim().length >= 10 && todayCode.trim() !== fullCode.trim();
      // se já existe um resumo de hoje (o aluno salvou antes e o professor passou mais código
      // depois), o próximo resumo é uma CONTINUAÇÃO — só as seções novas, sem repetir o que já tinha
      const todaySummary = summaryHistory[todayKey()];
      const hasTodaySummary = todaySummary && typeof todaySummary === "object" && Array.isArray(todaySummary.secoes) && todaySummary.secoes.length > 0;
      // sem resumo de hoje ainda? procura o ÚLTIMO resumo de um dia ANTERIOR (o aluno faltou, ou o
      // ritmo da turma pulou um dia dele) — o resumo de hoje vira uma PONTE: cobre tudo que ficou
      // pendente desde o último resumo dele, sem repetir os conceitos já explicados, em vez de só
      // resumir o código de hoje e deixar o que ele perdeu pra trás
      let lastPastSummary = null;
      if (!hasTodaySummary) {
        const pastDates = Object.keys(summaryHistory || {}).filter(d => d !== todayKey()).sort().reverse();
        for (const d of pastDates) {
          const s = summaryHistory[d];
          if (s && typeof s === "object" && Array.isArray(s.secoes) && s.secoes.length > 0) { lastPastSummary = s; break; }
        }
      }
      const existingSummary = hasTodaySummary ? todaySummary : lastPastSummary;
      const isContinuation = !!existingSummary;
      // dentro do MESMO dia, a "foto" do código na hora do último resumo permite saber exatamente o
      // que é novo. De um dia pra outro essa foto não existe (só a do dia atual é guardada) — manda
      // o código completo como "novo" e deixa a lista de conceitos já explicados, dentro de
      // buildContinuationSummaryRequest, filtrar o que não repetir
      const novoCode = hasTodaySummary ? codeWrittenSinceLastSummary() : (lastPastSummary ? fullCode : "");
      const simpleReq = isContinuation
        ? buildContinuationSummaryRequest(existingSummary, novoCode.trim() ? novoCode : todayCode, fullCode, studyLang, nyxPrefs)
        : buildSummaryRequest("simples", hasTodayDiff, todayCode, fullCode, studyLang, nyxPrefs);
      const difficultyHint = recentDifficultyHint(scoreHistory);
      // 🎯 dificuldade adaptativa: quem está com dificuldade ganha uma "dica" em cada questão (ajuda
      // a pensar no conceito certo sem entregar a resposta); quem está indo muito bem ganha uma
      // questão BÔNUS extra, opcional, mais desafiadora — não atrapalha nem penaliza quem não é nenhum dos dois
      const adaptiveTier = adaptiveDifficultyTier(scoreHistory);
      const adaptiveExtra =
        adaptiveTier === "baixa" ? `\n\nComo esse aluno tem tido dificuldade, adicione em CADA questão um campo "dica": uma frase curta que ajuda a lembrar do conceito certo SEM entregar qual alternativa é a correta.` :
        adaptiveTier === "alta" ? `\n\nComo esse aluno tem ido muito bem, crie TAMBÉM UMA questão BÔNUS a mais (além das ${ownPace ? "4" : "8"} normais), mais desafiadora que as outras, marcada com "bonus": true no JSON — ela é opcional pro aluno, vale um ponto extra se acertar e não desconta nada se ele pular ou errar.` :
        "";
      // essa aula (o código que o professor passou HOJE pra esse turno) já tem resumo e atividade
      // prontos na biblioteca "Minhas aulas" dele? só reaproveita no caso simples (sem continuação/
      // ponte de dias, sem dificuldade adaptativa — esses casos continuam personalizados por aluno,
      // como sempre) — economiza as 2 chamadas ao Nyx pra CADA aluno da turma que usa esse material
      let matchedLesson = null;
      if (!isContinuation && !difficultyHint && !adaptiveTier) {
        try {
          const [teacherCode, lessons] = await Promise.all([getTeacherCode(shift), getTeacherLessons()]);
          matchedLesson = teacherCode ? findMatchingLesson(lessons, teacherCode.files) : null;
        } catch { matchedLesson = null; }
      }
      const hasReadyContent = matchedLesson?.resumo && Array.isArray(matchedLesson?.atividade) && matchedLesson.atividade.length > 0;

      // 📢 resumo que o professor já gerou UMA VEZ e liberou pra turma inteira (a partir do código
      // DELE — os alunos só copiam, então é o mesmo resumo pra quem está em dia). Só entra em jogo
      // fora de continuação/ponte: quem faltou aula continua com o resumo próprio, cobrindo
      // especificamente o que ficou pendente, que não dá pra compartilhar com o resto da turma.
      let broadcastResumo = null;
      if (!hasReadyContent && !isContinuation) {
        try {
          const trig = await getResumoTrigger(shift);
          if (trig && trig.date === todayKey() && trig.resumo) broadcastResumo = trig.resumo;
        } catch { broadcastResumo = null; }
      }

      let summaryData, questions;
      if (hasReadyContent) {
        summaryData = matchedLesson.resumo;
        questions = shuffleQuestions(matchedLesson.atividade);
      } else {
        // resumo e atividade são pedidos ao Nyx AO MESMO TEMPO (não um depois do outro) para não somar o tempo de espera dos dois —
        // exceto o resumo quando já veio pronto do professor (broadcastResumo), aí só a atividade precisa da IA
        const [summaryResult, activityResult] = await Promise.all([
          broadcastResumo ? Promise.resolve(null) : askClaude(simpleReq.prompt, simpleReq.system),
          askClaude(
            `Um aluno de ${studyLang ? studyLang.label : "C#"} escreveu este código na aula de hoje (pode ter mais de um arquivo, todos do mesmo projeto):\n\`\`\`${studyLang ? studyLang.codeLang : "csharp"}\n${fullCode}\n\`\`\`\n\nCrie ${ownPace ? "4" : "8"} questões de múltipla escolha${ownPace ? " BEM diretas e fáceis (uma ideia por questão, frases curtas)" : ""} focadas em CONCEITOS DE CÓDIGO que aparecem no que ele escreveu, olhando TODOS os arquivos: o que faz cada palavra-chave/instrução, para que serve cada estrutura, o papel de cada símbolo, a função de cada tipo de dado, e o que acontece ao executar cada parte. Varie a dificuldade (algumas fáceis, algumas médias). NÃO faça perguntas de matemática.${difficultyHint || ""}${adaptiveExtra}\n\nResponda APENAS JSON puro sem markdown:\n{"questions":[{"q":"pergunta","opts":["A","B","C","D"],"correct":0,"dica":"(opcional, só se pedido acima) dica que não entrega a resposta","bonus":false}]}`,
            `Crie questões sobre conceitos de código ${studyLang ? studyLang.label : "C#"}, não matemática. APENAS JSON puro.`
          ),
        ]);
        if (broadcastResumo) {
          summaryData = broadcastResumo;
        } else {
          try { summaryData = extractJson(summaryResult); }
          catch {
            // primeira resposta veio malformada — insiste uma vez em JSON puro em vez de cair pro texto
            // cru da IA (era isso que aparecia como "escrita confusa" pro aluno)
            try {
              const retryResult = await askClaude(simpleReq.prompt + "\n\nATENÇÃO: responda SOMENTE o objeto JSON válido, sem nenhum texto antes ou depois.", simpleReq.system);
              summaryData = extractJson(retryResult);
            } catch { summaryData = null; }
          }
        }
        const parsed = extractJson(activityResult);
        const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
        const validQuestions = filterValidQuestions(rawQuestions);
        if (validQuestions.length < rawQuestions.length) {
          reportClientError({ message: `Atividade de ${studentName} (${shift}): ${rawQuestions.length - validQuestions.length} questão(ões) geradas sem gabarito válido foram descartadas automaticamente, sem penalizar o aluno.`, url: window.location.pathname, role: "sistema" });
        }
        questions = shuffleQuestions(validQuestions);
      }
      // continuação do MESMO dia: soma no resumo de hoje que já existia (mesmo registro). Ponte de
      // dias anteriores: o resumo de hoje é só o que foi gerado agora (o resumo antigo continua
      // intacto no próprio dia dele, no caderno do aluno) — se a geração falhar, cai pra um resumo
      // vazio em vez de repetir por engano o conteúdo do dia antigo como se fosse o de hoje
      const finalSummary = hasTodaySummary
        ? (summaryData ? mergeSummaryContinuation(existingSummary, summaryData) : existingSummary)
        : (summaryData || { secoes: [] });
      setDynamicSummary(finalSummary);
      setDynamicActivity(questions);
      // guarda o resumo de hoje no caderno (para o aluno rever depois) e a "foto" do código
      // usada da próxima vez pra saber o que é realmente novo, se o professor passar mais coisa
      const newSummaryHistory = { ...summaryHistory, [todayKey()]: finalSummary };
      setSummaryHistory(newSummaryHistory);
      summarySnapshotRef.current = { date: todayKey(), files: (files||[]).map(f => ({ name:f.name, code:f.code||"" })) };
      await persist({ phase:"summary", dynamicActivity:questions, dynamicSummary:finalSummary, summaryHistory: newSummaryHistory, summarySnapshot: summarySnapshotRef.current });
      setPhase("summary");
      if (isLangRoom) unlockAchievement("primeira-pagina");
    } catch (e) {
      if (isNetworkError(e)) {
        pendingSaveRef.current = true;
        setGeneratingMsg("📡 A internet caiu bem nessa hora — seu código está salvo! Vou gerar o resumo e a atividade sozinho assim que a conexão voltar.");
      } else {
        setGeneratingMsg("❌ Erro ao gerar. Tente novamente.");
      }
      setTimeout(() => { setPhase("coding"); persist({ phase:"coding" }); }, 2500);
    }
  };

  // 🔌 modo offline total: assim que a internet voltar, tenta sozinho de novo o que ficou pendente
  // (análise ou salvar/gerar atividade) — o aluno não precisa perceber que caiu e clicar de novo
  useEffect(() => {
    const onBackOnline = () => {
      if (pendingAnalyzeRef.current) { pendingAnalyzeRef.current = false; analyzeCode(); }
      if (pendingSaveRef.current) { pendingSaveRef.current = false; handleSave(); }
    };
    window.addEventListener("online", onBackOnline);
    return () => window.removeEventListener("online", onBackOnline);
  }, [analyzeCode, handleSave]);

  // 📚 resumo liberado pelo professor (aba "Meu código"): assim que detecta o aviso de hoje,
  // finaliza a aula sozinho — mesmo fluxo de "Salvar e Finalizar Aula", só sem precisar clicar. Usa
  // stateRef (sempre atualizado) em vez de "phase"/"files" direto, pra não precisar recriar o
  // intervalo a cada tecla digitada (senão, um aluno digitando sem parar nunca seria pego).
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const resumoAutoSaveRef = useRef(false);
  useEffect(() => {
    if (!loaded) return;
    let active = true;
    const iv = setInterval(async () => {
      if (resumoAutoSaveRef.current || stateRef.current.phase !== "coding") return;
      const fullCode = (stateRef.current.files || []).filter(f => (f.code||"").trim()).map(f => f.code || "").join("\n");
      if (fullCode.trim().length < 10) return;
      const triggered = await getResumoTrigger(shift);
      if (!active || triggered?.date !== todayKey() || stateRef.current.phase !== "coding") return;
      resumoAutoSaveRef.current = true;
      try { await handleSaveRef.current(); } finally { resumoAutoSaveRef.current = false; }
    }, 5000);
    return () => { active = false; clearInterval(iv); };
  }, [loaded, shift]);

  // versão detalhada do resumo, pedida sob demanda (só quando o aluno clica) — gerada uma vez e guardada
  const fetchDetailedSummary = async () => {
    if (detailedSummary) { setSummaryView("detalhado"); return; }
    setDetailLoading(true); setDetailFailMsg("");
    try {
      const fullCode = allCodeToday();
      const todayCode = codeWrittenToday();
      const hasTodayDiff = todayCode.trim().length >= 10 && todayCode.trim() !== fullCode.trim();
      const { prompt, system } = buildSummaryRequest("detalhado", hasTodayDiff, todayCode, fullCode, studyLang, nyxPrefs);
      const data = await askClaudeJson(prompt, system);
      setDetailedSummary(data);
      const newDetailedHistory = { ...detailedSummaryHistory, [todayKey()]: data };
      setDetailedSummaryHistory(newDetailedHistory);
      await persist({ detailedSummary: data, detailedSummaryHistory: newDetailedHistory });
      setSummaryView("detalhado");
    } catch (e) {
      setDetailFailMsg(e.message === "ROBOTKEY_MISSING" ? `O Nyx está offline: ${e.userMsg || "peça pro professor configurar a IA."}` : "Não consegui gerar a versão detalhada agora. Tente de novo em instantes.");
    }
    setDetailLoading(false);
  };

  const handleStartActivity = async () => { setRevealedHints({}); setPhase("activity"); await persist({ phase:"activity" }); };

  // só marca a alternativa escolhida — certo/errado só aparece depois de Enviar Atividade
  const pickAnswer = (i, j) => {
    setAnswers(a => ({ ...a, [i]: j }));
    playSound("click");
  };

  // atalho de teclado (A/B/C/D) para responder a atividade sem precisar clicar — só ativo na fase de atividade
  useEffect(() => {
    if (phase !== "activity") return;
    const activity = dynamicActivity || [];
    const handleKeyDown = (e) => {
      if (!activity.length) return;
      const optionKey = e.key.toUpperCase().charCodeAt(0) - 65;
      if (optionKey >= 0 && optionKey < 4) {
        // todas as questões ficam na mesma página (o aluno pode clicar em qualquer uma, fora de
        // ordem) — usar Object.keys(answers).length como "questão atual" respondia a questão ERRADA
        // sempre que uma resposta por clique não seguia a ordem; mira sempre na primeira sem resposta
        const currentQ = activity.findIndex((_, i) => answers[i] == null);
        if (currentQ !== -1) {
          pickAnswer(currentQ, optionKey);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, answers, dynamicActivity]);

  // maior sequência de acertos seguidos, calculada só no envio (não dá mais pra saber "ao vivo" se acertou)
  const maxCorrectStreak = (activity, ans) => {
    let max = 0, cur = 0;
    activity.forEach((q, i) => {
      if (ans[i] === q.correct) { cur++; if (cur > max) max = cur; }
      else cur = 0;
    });
    return max;
  };

  const handleSubmitActivity = async () => {
    const activity = dynamicActivity || [];
    // a questão bônus (dificuldade adaptativa) NUNCA entra na conta da nota — só rende ponto
    // extra se acertada, e não desconta nada se ficar em branco ou errada
    const required = activity.filter(q=>!q.bonus);
    let pts = 0;
    required.forEach((q,i)=>{ if(answers[activity.indexOf(q)]===q.correct) pts++; });
    const bonusIdx = activity.findIndex(q=>q.bonus);
    const bonusHit = bonusIdx >= 0 && answers[bonusIdx] === activity[bonusIdx].correct;
    const finalScore = Math.round((pts/required.length)*100);
    const completedAt = Date.now();
    setScore(finalScore);
    setDoneAt(completedAt);
    setPhase("done");
    fireConfetti("activity");
    setShowFeedbackModal(true);
    setFeedbackLoading(true);
    const newNyxPoints = (stateRef.current.nyxPoints||0) + pts + (bonusHit ? 1 : 0);
    setNyxPoints(newNyxPoints);
    const newScoreHistory = { ...stateRef.current.scoreHistory, [todayKey()]: finalScore };
    setScoreHistory(newScoreHistory);
    stateRef.current = { ...stateRef.current, nyxPoints: newNyxPoints, scoreHistory: newScoreHistory };
    await persist({ phase:"done", score:finalScore, answers, nyxPoints: newNyxPoints, doneAt: completedAt, scoreHistory: newScoreHistory });
    checkPointsAchievements(newNyxPoints);
    unlockAchievement("primeira-atividade");
    if (finalScore >= 100) unlockAchievement("nota-cem");
    const doneCount = Object.keys(newScoreHistory).length;
    if (doneCount >= 5) unlockAchievement("atividades-5");
    if (doneCount >= 15) unlockAchievement("atividades-15");
    const hundredCount = Object.values(newScoreHistory).filter(v => v === 100).length;
    if (hundredCount >= 3) unlockAchievement("tres-100");
    const requiredAnswers = Object.fromEntries(required.map((q,ri)=>[ri, answers[activity.indexOf(q)]]));
    const streak = maxCorrectStreak(required, requiredAnswers);
    if (streak >= 5) unlockAchievement("combo-5");
    if (streak >= 8) unlockAchievement("combo-8");
    try {
      const list = activity.map((q,i)=>`- ${q.q} → ${answers[i]===q.correct?"acertou":"errou"}`).join("\n");
      const fbData = await askClaudeJson(
        `Um aluno iniciante de ${studyLang ? studyLang.label : "C#"} escreveu este código na aula de hoje:\n\`\`\`${studyLang ? studyLang.codeLang : "csharp"}\n${allCodeToday()}\n\`\`\`\n\nDepois respondeu uma atividade de ${activity.length} perguntas e acertou ${pts} (nota ${finalScore}).\nResultado pergunta a pergunta:\n${list}\n\nCrie um feedback gentil e motivador para ESTE aluno, baseado no código que ele escreveu E no desempenho.\n\nResponda APENAS em JSON puro, sem markdown:\n{\n  "intro": "1 frase curta e calorosa resumindo como ele foi nesta aula",\n  "secoes": [\n    { "emoji": "emoji que combine", "titulo": "O que você mandou bem (curto)", "explicacao": "1 a 2 frases concretas sobre o que ele acertou, citando o código ou o desempenho dele" },\n    { "emoji": "emoji que combine", "titulo": "Um ponto para melhorar (curto)", "explicacao": "1 a 2 frases gentis sobre um ponto específico a melhorar — se não houver nada relevante a melhorar, foque em um próximo passo desafiador em vez disso" }\n  ],\n  "dica": "se foi bem (nota alta e código sem erros): uma curiosidade ou próximo passo mais avançado para se desafiar. Se teve dificuldade: uma dica simples e prática para o que errou. 1 a 2 frases."\n}\n\nFrases curtas, uma ideia por vez, sem jargão técnico desnecessário, tom acolhedor. Garanta JSON válido.`,
        (studyLang ? studyLang.system : CS_SYSTEM) + "\nResponda APENAS JSON puro válido, sem markdown." + nyxPrefsInstruction(nyxPrefs)
      );
      setFinalFeedback(fbData);
      await persist({ phase:"done", score:finalScore, answers, finalFeedback:fbData });
    } catch { setFinalFeedback(""); }
    setFeedbackLoading(false);
  };

  const handleExamReady = async () => {
    setExamReady(true);
    await persist({ examReady: true });
  };

  const handleExamAnswer = async (qIdx, optIdx) => {
    // já concluída (protege contra clicar 2x bem rápido na última resposta e disparar o bloco de
    // finalização/premiação duas vezes) — lê via stateRef, não o closure de examDone
    if (stateRef.current.examDone) return;
    const newAnswers = { ...examAnswers, [qIdx]: optIdx };
    setExamAnswers(newAnswers);
    const qs = examInfo.questions || [];
    // só finaliza quando TODAS as questões têm resposta — os pontinhos de navegação deixam o aluno
    // pular pra qualquer questão fora de ordem, então responder a última da lista primeiro não pode
    // encerrar a prova sozinho contando as anteriores (ainda não vistas) como erradas
    const allAnswered = qs.every((_, i) => newAnswers[i] != null);
    if (!allAnswered) {
      stateRef.current = { ...stateRef.current, examAnswers: newAnswers };
      const nextUnanswered = qs.findIndex((_, i) => newAnswers[i] == null);
      setExamCurrentQ(nextUnanswered !== -1 ? nextUnanswered : Math.min(qIdx + 1, qs.length - 1));
      await persist({ examAnswers: newAnswers });
    } else {
      // a correção agora acontece no SERVIDOR (não mais aqui no navegador): o gabarito de cada
      // questão nunca chega até o cliente, então não tem mais como calcular "pts" localmente
      // comparando com "q.correct" — isso é exatamente o que fechou a brecha de segurança onde
      // qualquer aluno conseguia ver as respostas certas antes de responder, olhando a aba de rede
      // do navegador. Manda só as respostas escolhidas + quantas vezes saiu da aba; tenta de novo
      // 1x se falhar (rede instável), e só desiste de vez se a segunda tentativa também falhar.
      const exits = stateRef.current.examExits || 0;
      let result = await gradeExam(examInfo.shift || shift, newAnswers, exits);
      if (!result) result = await gradeExam(examInfo.shift || shift, newAnswers, exits);
      stateRef.current = { ...stateRef.current, examAnswers: newAnswers };
      if (!result) {
        setRobotMsg("⚠ Não consegui enviar sua prova agora (conexão?). Suas respostas estão salvas — tente clicar na última pergunta de novo em instantes.");
        setRobotState("thinking");
        await persist({ examAnswers: newAnswers });
        return;
      }
      const { finalScore, raw, total } = result;
      const pts = raw / 10;
      try { sessionStorage.removeItem("nyx_exam_open"); } catch {}
      const newNyxPoints = (stateRef.current.nyxPoints||0) + Math.round(finalScore / 10);
      stateRef.current = { ...stateRef.current, examAnswers: newAnswers, examDone: true, nyxPoints: newNyxPoints };
      setExamScore(finalScore); setExamScoreRaw(raw); setExamDone(true);
      setNyxPoints(newNyxPoints);
      await persist({ examAnswers: newAnswers, examScore: finalScore, examScoreRaw: raw, examExits: exits, examDone: true, nyxPoints: newNyxPoints });
      checkPointsAchievements(newNyxPoints);
      if (total && pts / total >= 0.8) unlockAchievement("prova-mestre");
      if (total && pts === total) unlockAchievement("prova-100");
    }
  };

  // versão simplificada da prova pra quem é do Modo Guiado e topou participar — não vale nota
  // oficial (não entra em ranking/boletim), então termina sozinha assim que responder tudo, sem
  // precisar esperar o professor encerrar a prova de verdade
  const handleGuidedAnswer = async (qIdx, optIdx) => {
    // mesma proteção do handleExamAnswer: sem isso, clicar 2x bem rápido na última resposta
    // disparava o bloco de finalização/premiação duas vezes
    if (stateRef.current.examDone) return;
    const newAnswers = { ...examGuidedAnswers, [qIdx]: optIdx };
    setExamGuidedAnswers(newAnswers);
    const gq = examGuidedQuestions || GUIDED_PARTICIPATION_QUIZ;
    const allAnswered = gq.every((_, i) => newAnswers[i] != null);
    if (!allAnswered) {
      stateRef.current = { ...stateRef.current, examGuidedAnswers: newAnswers };
      const nextUnanswered = gq.findIndex((_, i) => newAnswers[i] == null);
      setExamGuidedCurrentQ(nextUnanswered !== -1 ? nextUnanswered : Math.min(qIdx + 1, gq.length - 1));
      await persist({ examGuidedAnswers: newAnswers });
    } else {
      let gpts = 0;
      gq.forEach((q, i) => { if (newAnswers[i] === q.correct) gpts++; });
      try { sessionStorage.removeItem("nyx_exam_open"); } catch {}
      const newNyxPoints = (stateRef.current.nyxPoints||0) + 10;
      stateRef.current = { ...stateRef.current, examGuidedAnswers: newAnswers, examGuidedCorrect: gpts, examGuidedMode: true, examDone: true, nyxPoints: newNyxPoints };
      setExamGuidedCorrect(gpts); setExamGuidedMode(true); setExamDone(true);
      setNyxPoints(newNyxPoints);
      await persist({ examGuidedAnswers: newAnswers, examGuidedCorrect: gpts, examGuidedMode: true, examDone: true, nyxPoints: newNyxPoints });
    }
  };

  const tryFullscreen = () => {
    requestFS().then(()=>setFsMsg("")).catch(()=>{
      setFsMsg("Seu navegador ou aparelho não permite tela cheia aqui (no iPhone, por exemplo, não dá).");
      setTimeout(()=>setFsMsg(""), 6000);
    });
  };

  const sendClassFeedback = async () => {
    const cf = { rating:classRating, text:classText.trim(), at:Date.now() };
    setClassFb(cf);
    setClassSent(true);
    await persist({ classFeedback:cf });
  };

  const dismissNudge = () => { if (nudge) setNudgeSeenAt(nudge.at); setNudge2(null); };
  const showNudge = nudge && nudge.at > nudgeSeenAt;

  // ── estilos ──
  const scaleSize = (size) => Math.round(size * uiScale);
  const scalePx = (val) => Math.round(val * uiScale);
  const styles = {
    container:{ minHeight:"100vh", background:pageBgFor(theme), color:"#f0e9fb", fontFamily:FONT, fontSize:`${scaleSize(16)}px` },
    header:{ background:"rgba(17,21,42,.85)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", padding:`${scalePx(10)}px ${scalePx(18)}px`, display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #3b2a58", boxShadow:"0 1px 0 #c084fc33, 0 8px 24px rgba(3,5,16,.35)", position:"sticky", top:0, zIndex:40, flexWrap:"wrap", gap:8 },
    card:{ background:"linear-gradient(180deg,#231636,#1a1029)", borderRadius:16, padding:scalePx(16), margin:"10px 0", border:"1px solid #3a2a55", boxShadow:"0 8px 24px rgba(3,5,16,.35)", animation:"rise .35s ease both" },
    btn:(c)=>({ background:`linear-gradient(135deg, ${c}, ${shade(c,-0.18)})`, color:"#fff", border:"none", borderRadius:10, padding:`${scalePx(10)}px ${scalePx(18)}px`, cursor:"pointer", fontWeight:800, fontSize:scaleSize(14), boxShadow:`0 4px 14px ${c}44` }),
    // botão neutro pra ações de menu (navegar pra uma tela, abrir um painel) — a cor forte fica
    // só pra ações com significado de verdade (chamar atenção, confirmar, bloquear/perigo). Uma
    // parede inteira de botões em cores diferentes sem motivo cansa a vista e não ajuda a achar nada.
    btnGhost:{ background:"#1c1330", color:"#d6c9ec", border:"1px solid #3b2a58", borderRadius:10, padding:`${scalePx(10)}px ${scalePx(18)}px`, cursor:"pointer", fontWeight:700, fontSize:scaleSize(14) },
    opt:(sel)=>({ background:sel?"#c084fc22":"#1a1029", border:`2px solid ${sel?"#c084fc":"#3a2a55"}`, borderRadius:10, padding:`${scalePx(10)}px ${scalePx(14)}px`, marginBottom:8, cursor:"pointer", color:"#f0e9fb", textAlign:"left", width:"100%", fontSize:scaleSize(14), minHeight:scaleSize(44) }),
  };
  const Stars = ({ value, onChange }) => (
    <div style={{ display:"flex", gap:4 }}>
      {[1,2,3,4,5].map(n=>(
        <button key={n} type="button" onClick={()=>onChange(n)} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:26, color:n<=value?"#fbbf24":"#776798", padding:0 }}>★</button>
      ))}
    </div>
  );

  if (!loaded) return (<div style={{ ...styles.container, display:"flex", alignItems:"center", justifyContent:"center" }}><p style={{ color:"#a99ac9" }}>Carregando seu perfil...</p></div>);

  // ── ZEK: o professor pediu atenção — o Nyx toma a tela inteira e bloqueia tudo até o /hiberne ──
  if (nyxLocks.zek) return (
    <div style={{ ...styles.container, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"2px solid #f87171", borderRadius:22, padding:"34px 28px", maxWidth:460, width:"100%", textAlign:"center", boxShadow:"0 24px 70px rgba(0,0,0,.6), 0 0 60px #f8717133" }}>
        <div style={{ animation:"nyx-shake .55s ease infinite" }}>
          <NyxRobot state="error" size={120} showName={false} gear={nyxGear} />
        </div>
        <h2 style={{ color:"#f87171", fontSize:24, fontWeight:900, margin:"14px 0 6px" }}>👀 Atenção na aula!</h2>
        <p style={{ color:"#d6c9ec", fontSize:15, lineHeight:1.7, margin:0 }}>
          O professor pediu a atenção de todo mundo agora. Olhos no quadro! A tela volta ao normal quando ele liberar.
        </p>
      </div>
    </div>
  );

  // ── HORÁRIO AUTOMÁTICO: fora do horário configurado, a sala fica fechada (a vistoria do professor libera na hora) ──
  if (classStatusNow.configured && !classStatusNow.open && !myInspection) return (
    <div style={{ ...styles.container, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"2px solid #c084fc", borderRadius:22, padding:"34px 28px", maxWidth:460, width:"100%", textAlign:"center", boxShadow:"0 24px 70px rgba(0,0,0,.6), 0 0 60px #c084fc22" }}>
        <div style={{ animation:"nyx-float 3s ease-in-out infinite" }}>
          <NyxRobot state="idle" size={110} showName={false} gear={nyxGear} />
        </div>
        <h2 style={{ color:"#c084fc", fontSize:23, fontWeight:900, margin:"14px 0 6px" }}>{classStatusNow.isWeekend ? "🎉 Fim de semana, sem aula!" : classStatusNow.before ? "⏰ A aula ainda não começou" : "👋 A aula de hoje já encerrou"}</h2>
        <p style={{ color:"#d6c9ec", fontSize:15, lineHeight:1.7, margin:0 }}>
          {classStatusNow.isWeekend
            ? "A turma só tem aula de segunda a sexta. Aproveite o descanso e até a próxima aula! 😊"
            : classStatusNow.before
            ? `A turma ${shiftMeta(shift, myTurmas).label} começa às ${mySchedule.start}. Até já!`
            : "Até a próxima aula! Seu código já está salvo, então pode ficar tranquilo(a)."}
        </p>
      </div>
    </div>
  );

  // 📋 retomada: lembra o conteúdo da aula passada (o dia de aula anterior a hoje, não simplesmente
  // "ontem" no calendário) pra ajudar a turma a voltar de onde parou
  const recapText = (() => {
    const prevClassDay = [...myClassDays].filter(d => d < todayKey()).sort().pop();
    if (!prevClassDay) return null;
    const title = contentNameFor((myContentNames||{})[prevClassDay], shift);
    if (!title) return null;
    const [, m, dd] = prevClassDay.split("-");
    return `Na aula passada (${dd}/${m}) vocês viram "${title}". Bora continuar de onde paramos!`;
  })();

  // classes de apoio (aplicadas em todas as telas do aluno) + rotina visual da aula
  const supportClass = [calmMode && "calm", easyRead && "easy-read", highContrast && "high-contrast"].filter(Boolean).join(" ") || undefined;
  const showRoutine = accessMode || calmMode || focusMode || easyRead || ownPace;
  // barrinha fixa com os passos do dia: previsibilidade ajuda muito quem é autista/TDAH —
  // o aluno sempre sabe em que passo está e o que vem depois
  const routineBar = showRoutine ? (() => {
    const steps = [["📝","Programar"],["💾","Salvar"],["📚","Resumo"],["🎯","Atividade"]];
    const idx = phase==="coding" ? 0 : phase==="generating" ? 1 : phase==="summary" ? 2 : phase==="activity" ? 3 : 4;
    return (
      <div style={{ position:"fixed", bottom:10, left:"50%", transform:"translateX(-50%)", zIndex:900, background:"rgba(13,17,34,.96)", border:"1px solid #3b2a58", borderRadius:20, padding:"7px 14px", display:"flex", gap:8, alignItems:"center", boxShadow:"0 8px 24px rgba(0,0,0,.45)", flexWrap:"wrap", justifyContent:"center", maxWidth:"calc(100vw - 16px)" }}>
        <span style={{ color:"#776798", fontSize:11.5, fontWeight:800 }}>Minha aula:</span>
        {steps.map(([emoji, label], i) => (
          <span key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12.5, fontWeight:800, color: i < idx ? "#34d399" : i === idx ? "#f0e9fb" : "#776798", background: i === idx ? "#c084fc33" : "transparent", border: i === idx ? "1px solid #c084fc" : "1px solid transparent", borderRadius:14, padding:"3px 9px" }}>
            {i < idx ? "✓" : emoji} {label}
          </span>
        ))}
      </div>
    );
  })() : null;

  // ── PROVA: telas de exame têm prioridade ──
  if (examDone && !examScoreSeen && examGuidedMode) return (
    <div className={supportClass} style={styles.container}>
      <AchievementToast achievement={newAchievement} />
        {goalParty && !calmMode && <ConfettiParty level={goalParty} />}
      <div style={styles.header}><span>🎉 Participação na Prova — {studentName}</span></div>
      <div style={{ maxWidth:500, margin:"50px auto", textAlign:"center", padding:"0 16px" }}>
        <div style={{ background:"linear-gradient(135deg,#22d3ee,#0891b2)", borderRadius:18, padding:32, boxShadow:"0 12px 30px #22d3ee44" }}>
          <div style={{ fontSize:52 }}>🎉</div>
          <h1 style={{ color:"#fff", fontSize:26, margin:"12px 0" }}>Você participou, {studentName}!</h1>
          <div style={{ fontSize:56, fontWeight:900, color:"#fff", margin:"8px 0" }}>{examGuidedCorrect}/{(examGuidedQuestions||GUIDED_PARTICIPATION_QUIZ).length}</div>
          <p style={{ color:"#cffafe", fontSize:15 }}>perguntas certas — muito bem! 🎮</p>
        </div>
        <p style={{ color:"#a99ac9", marginTop:20, fontSize:14, lineHeight:1.6 }}>Essa é a versão simples da prova, só de participação — <b>não vale nota</b> e não entra no boletim nem no ranking da turma. O importante foi você ter topado participar! 🥳</p>
        <button onClick={async ()=>{ setExamScoreSeen(true); await persist({ examScoreSeen: true }); }}
          style={{ ...styles.btn("#8b5cf6"), width:"100%", marginTop:14, padding:"11px 0", fontSize:14 }}>
          ← Voltar à tela inicial
        </button>
      </div>
    </div>
  );

  if (examDone && !examScoreSeen) return (
    <div className={supportClass} style={styles.container}>
      <AchievementToast achievement={newAchievement} />
        {goalParty && !calmMode && <ConfettiParty level={goalParty} />}
      <div style={styles.header}><span>🏆 Prova Concluída — {studentName}</span></div>
      <div style={{ maxWidth:500, margin:"50px auto", textAlign:"center", padding:"0 16px" }}>
        <div style={{ background:"linear-gradient(135deg,#34d399,#16a34a)", borderRadius:18, padding:32, boxShadow:"0 12px 30px #34d39944" }}>
          <div style={{ fontSize:52 }}>🏆</div>
          <h1 style={{ color:"#fff", fontSize:26, margin:"12px 0" }}>Parabéns, {studentName}!</h1>
          <div style={{ fontSize:56, fontWeight:900, color:"#fff", margin:"8px 0" }}>{examScore ?? 0}</div>
          <p style={{ color:"#d1fae5", fontSize:15 }}>pontos de {(examInfo.questions||[]).length * 10}</p>
        </div>
        {examExits > 0 && (
          <div style={{ background:"#1e1430", border:"1px solid #f87171", borderRadius:14, padding:"14px 16px", marginTop:16, textAlign:"left" }}>
            <p style={{ color:"#fca5a5", fontSize:13.5, lineHeight:1.7, margin:0 }}>
              ⚠ Você saiu da prova <b>{examExits}x</b> — desconto de <b>{Math.max(0, (examScoreRaw ?? examScore ?? 0) - (examScore ?? 0))} pontos</b> (nota sem desconto: {examScoreRaw ?? examScore}).
            </p>
            {!examAppeal && (
              <button onClick={async ()=>{ const ap = { at: Date.now(), status:"pending" }; setExamAppeal(ap); await persist({ examAppeal: ap }); }}
                style={{ ...styles.btn("#fbbf24"), width:"100%", marginTop:10, padding:"9px 0", fontSize:13 }}>
                ✋ Foi sem querer (a aba fechou sozinha) — avisar o professor
              </button>
            )}
            {examAppeal?.status === "pending" && <p style={{ color:"#fbbf24", fontSize:13, margin:"10px 0 0", fontWeight:700 }}>✋ Aviso enviado — o professor vai decidir se devolve os pontos.</p>}
            {examAppeal?.status === "accepted" && <p style={{ color:"#34d399", fontSize:13, margin:"10px 0 0", fontWeight:700 }}>✅ O professor aceitou sua explicação — pontos devolvidos!</p>}
            {examAppeal?.status === "rejected" && <p style={{ color:"#a99ac9", fontSize:13, margin:"10px 0 0", fontWeight:700 }}>O professor analisou e manteve o desconto.</p>}
          </div>
        )}
        <p style={{ color:"#a99ac9", marginTop:20, fontSize:14, lineHeight:1.6 }}>Aguarde o professor encerrar a prova para ver o ranking da turma! Ou, se preferir, já pode voltar pra plataforma — sua nota fica salva.</p>
        <button onClick={async ()=>{ setExamScoreSeen(true); await persist({ examScoreSeen: true }); }}
          style={{ ...styles.btn("#8b5cf6"), width:"100%", marginTop:14, padding:"11px 0", fontSize:14 }}>
          ← Voltar à tela inicial
        </button>
      </div>
    </div>
  );

  const examHappening = examInfo.status === 'review' || examInfo.status === 'active';
  // alunos do Modo Guiado escolhem se querem entrar na prova junto com a turma, ou continuar no
  // Modo Guiado normalmente — só perguntamos uma vez por prova (examOptIn começa null a cada nova)
  if (accessMode && examHappening && examOptIn == null) return (
    <div className={supportClass} style={styles.container}>
      <div style={styles.header}><span>📝 Prova da Turma — {studentName}</span></div>
      <div style={{ maxWidth:520, margin:"60px auto", textAlign:"center", padding:"0 16px" }}>
        <div style={{ background:"linear-gradient(135deg,#c084fc,#8b5cf6)", borderRadius:18, padding:32, boxShadow:"0 12px 30px #c084fc55" }}>
          <div style={{ fontSize:48 }}>🤔</div>
          <h1 style={{ color:"#fff", fontSize:22, margin:"12px 0" }}>A turma vai fazer uma prova!</h1>
          <p style={{ color:"#e0e7ff", fontSize:14.5, lineHeight:1.7 }}>Você quer participar de uma versão bem mais simples da prova (sobre os blocos que você já usou, só de boa, sem valer nota), ou prefere continuar no Modo Guiado enquanto os outros fazem a prova?</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:18 }}>
          <button onClick={async ()=>{ setExamOptIn(true); await persist({ examOptIn: true }); }}
            style={{ ...styles.btn("#34d399"), padding:"14px 0", fontSize:15 }}>
            ✅ Sim, quero participar
          </button>
          <button onClick={async ()=>{ setExamOptIn(false); await persist({ examOptIn: false }); }}
            style={{ ...styles.btn("#8b5cf6"), padding:"14px 0", fontSize:15 }}>
            🧩 Não, prefiro continuar no Modo Guiado
          </button>
        </div>
        <p style={{ color:"#a99ac9", marginTop:16, fontSize:12.5, lineHeight:1.6 }}>Não tem problema nenhum escolher não fazer — isso não desconta pontos nem nada.</p>
      </div>
    </div>
  );

  if (examInfo.status === 'review' && !(accessMode && examOptIn === false)) return (
    <div className={supportClass} style={styles.container}>
      <div style={styles.header}><span>📝 Revisão — {studentName}</span></div>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"22px 16px 36px" }}>
        <div style={{ background:"linear-gradient(135deg,#c084fc,#8b5cf6)", borderRadius:18, padding:"24px 22px", textAlign:"center", boxShadow:"0 12px 30px #c084fc55" }}>
          <div style={{ fontSize:44 }}>📝</div>
          <h1 style={{ color:"#fff", fontSize:24, margin:"8px 0" }}>Hora da Prova!</h1>
          <p style={{ color:"#e0e7ff", fontSize:14, lineHeight:1.6 }}>Revise o conteúdo abaixo e entre na sala quando estiver pronto.</p>
          {examInfo.studyUntil && clockNow < examInfo.studyUntil && (() => {
            const msLeft = Math.max(0, examInfo.studyUntil - clockNow);
            const mm = Math.floor(msLeft / 60000), ss = Math.floor((msLeft % 60000) / 1000);
            return (
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(0,0,0,.2)", borderRadius:20, padding:"7px 18px", marginTop:6 }}>
                <span style={{ fontSize:16 }}>⏳</span>
                <span style={{ color:"#fff", fontWeight:900, fontSize:17, fontVariantNumeric:"tabular-nums" }}>{String(mm).padStart(2,"0")}:{String(ss).padStart(2,"0")}</span>
                <span style={{ color:"#e0e7ff", fontSize:12.5 }}>de estudo</span>
              </div>
            );
          })()}
        </div>
        {accessMode && examOptIn === true && (
          <div className="cardfx" style={{ ...styles.card, marginTop:14, background:"#0e293344", border:"1px solid #22d3ee" }}>
            <p style={{ color:"#67e8f9", fontSize:13.5, lineHeight:1.7, margin:0 }}>🧩 Você vai fazer a versão simples da prova, com perguntas sobre os blocos que já usou — <b>não vale nota</b>, é só participação!</p>
          </div>
        )}
        <div className="cardfx" style={{ ...styles.card, marginTop:14 }}>
          <h3 style={{ color:"#c084fc", marginBottom:10 }}>📚 Resumo de Revisão</h3>
          <div style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.9, whiteSpace:"pre-wrap" }}>{examInfo.summary || "Preparando o resumo..."}</div>
        </div>
        {examReady ? (
          <div className="cardfx" style={{ ...styles.card, textAlign:"center", padding:24 }}>
            <div style={{ fontSize:36 }}>✅</div>
            <p style={{ color:"#34d399", fontWeight:700, fontSize:16 }}>Você está na sala!</p>
            <p style={{ color:"#a99ac9", fontSize:13 }}>Aguardando o professor iniciar a prova...</p>
          </div>
        ) : (
          <button onClick={handleExamReady} style={{ ...styles.btn("#34d399"), width:"100%", padding:"16px 0", fontSize:16, marginTop:14 }}>
            ✅ Entrar na Sala da Prova
          </button>
        )}
      </div>
    </div>
  );

  if (examInfo.status === 'active' && accessMode && examOptIn === true) {
    const gq = examGuidedQuestions || GUIDED_PARTICIPATION_QUIZ;
    const gQuestion = gq[examGuidedCurrentQ];
    return (
      <div className={supportClass} style={styles.container}>
        <div style={styles.header}>
          <span>🧩 Participação na Prova — {studentName}</span>
          <span style={{ color:"#a99ac9", fontSize:13 }}>Pergunta {examGuidedCurrentQ+1} de {gq.length}</span>
        </div>
        <div style={{ maxWidth:620, margin:"30px auto", padding:"0 16px" }}>
          <div style={{ background:"#0e293344", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#67e8f9", lineHeight:1.6 }}>
            🧩 Isso não vale nota — é só pra você participar da prova junto com a turma!
          </div>
          <div style={{ background:"#1e1430", borderRadius:14, padding:22, border:"1px solid #3b2a58" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ color:"#22d3ee", fontWeight:700 }}>Pergunta {examGuidedCurrentQ+1}/{gq.length}</span>
            </div>
            <p style={{ color:"#f0e9fb", fontSize:16, lineHeight:1.7, marginBottom:18 }}>{gQuestion ? gQuestion.q : "Carregando..."}</p>
            {gQuestion && gQuestion.opts.map((opt, oi) => (
              <button key={oi} onClick={() => handleGuidedAnswer(examGuidedCurrentQ, oi)}
                style={{ display:"block", width:"100%", background:examGuidedAnswers[examGuidedCurrentQ]===oi?"#22d3ee33":"#171026", border:`2px solid ${examGuidedAnswers[examGuidedCurrentQ]===oi?"#22d3ee":"#3b2a58"}`, borderRadius:10, padding:"12px 16px", color:"#f0e9fb", textAlign:"left", cursor:"pointer", marginBottom:8, fontSize:14 }}>
                <span style={{ color:"#22d3ee", fontWeight:700, marginRight:8 }}>{["A","B","C","D"][oi]}.</span>{opt}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
            {gq.map((_,i) => (
              <div key={i} style={{ width:28, height:28, borderRadius:6, background:i===examGuidedCurrentQ?"#22d3ee":examGuidedAnswers[i]!=null?"#3b2a58":"#1e1430", border:`1px solid ${i===examGuidedCurrentQ?"#22d3ee":examGuidedAnswers[i]!=null?"#22d3ee":"#3b2a58"}`, display:"flex", alignItems:"center", justifyContent:"center", color:examGuidedAnswers[i]!=null?"#f0e9fb":"#776798", fontSize:12, cursor:"pointer" }} onClick={() => setExamGuidedCurrentQ(i)}>{i+1}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (examInfo.status === 'active' && !(accessMode && examOptIn === false)) {
    const qs = examInfo.questions || [];
    const q = qs[examCurrentQ];
    return (
      <div className={supportClass} style={styles.container}>
        <div style={styles.header}>
          <span>🏆 Prova — {studentName}</span>
          <span style={{ color:"#a99ac9", fontSize:13 }}>Questão {examCurrentQ+1} de {qs.length}</span>
        </div>
        <div style={{ maxWidth:620, margin:"30px auto", padding:"0 16px" }}>
          {examExits > 0 && (
            <div style={{ background:"#f8717118", border:"1px solid #f87171", borderRadius:12, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#fca5a5", lineHeight:1.6 }}>
              ⚠ <b>Saída da prova detectada ({examExits}x).</b> Cada saída da aba desconta <b>10 pontos</b> da sua nota. Fique na prova!
            </div>
          )}
          <div style={{ background:"#1e1430", borderRadius:14, padding:22, border:"1px solid #3b2a58" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ color:"#c084fc", fontWeight:700 }}>Questão {examCurrentQ+1}/{qs.length}</span>
              <span style={{ color:"#fbbf24", fontWeight:700 }}>10 pts cada</span>
            </div>
            <p style={{ color:"#f0e9fb", fontSize:16, lineHeight:1.7, marginBottom:18 }}>{q ? q.q : "Carregando..."}</p>
            {q && q.opts.map((opt, oi) => (
              <button key={oi} onClick={() => handleExamAnswer(examCurrentQ, oi)}
                style={{ display:"block", width:"100%", background:examAnswers[examCurrentQ]===oi?"#c084fc33":"#171026", border:`2px solid ${examAnswers[examCurrentQ]===oi?"#c084fc":"#3b2a58"}`, borderRadius:10, padding:"12px 16px", color:"#f0e9fb", textAlign:"left", cursor:"pointer", marginBottom:8, fontSize:14 }}>
                <span style={{ color:"#c084fc", fontWeight:700, marginRight:8 }}>{["A","B","C","D"][oi]}.</span>{opt}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
            {qs.map((_,i) => (
              <div key={i} style={{ width:28, height:28, borderRadius:6, background:i===examCurrentQ?"#c084fc":examAnswers[i]!=null?"#3b2a58":"#1e1430", border:`1px solid ${i===examCurrentQ?"#c084fc":examAnswers[i]!=null?"#c084fc":"#3b2a58"}`, display:"flex", alignItems:"center", justifyContent:"center", color:examAnswers[i]!=null?"#f0e9fb":"#776798", fontSize:12, cursor:"pointer" }} onClick={() => setExamCurrentQ(i)}>{i+1}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 👾 chefão: os 10 minutos de estudo antes da batalha tomam a tela inteira (menos durante a
  // prova, já tratada acima) — quando o tempo acaba, a tela normal volta sozinha e o banner de
  // batalha (mais abaixo) aparece
  if (bossInfo && bossInfo.studyUntil && clockNow < bossInfo.studyUntil) return (
    <BossStudyModal studyUntil={bossInfo.studyUntil} clockNow={clockNow} files={files} summaryHistory={summaryHistory} detailedSummaryHistory={detailedSummaryHistory} />
  );

  if (phase==="generating") return (
    <div className={supportClass} style={styles.container}>
      {routineBar}
      <div style={styles.header}><span>⏳ Preparando — {studentName}</span></div>
      <div className="pop" style={{ maxWidth:440, margin:"70px auto", textAlign:"center", padding:24 }}>
        <NyxRobot state="thinking" size={116} showName={false} />
        <h2 style={{ color:"#c084fc", margin:"14px 0 6px" }}>Nyx está preparando seu conteúdo...</h2>
        <p style={{ color:"#a99ac9", lineHeight:1.7 }}>{generatingMsg}</p>
        <div style={{ marginTop:24, display:"flex", justifyContent:"center", gap:8 }}>
          {[0,1,2].map(i=><div key={i} style={{ width:10,height:10,borderRadius:"50%",background:"#c084fc",animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
        </div>
      </div>
    </div>
  );

  if (phase==="summary") {
    const sum = summaryView === "detalhado" && detailedSummary ? detailedSummary : dynamicSummary;
    const structured = sum && typeof sum === "object" && Array.isArray(sum.secoes) && sum.secoes.length > 0;
    const ACCENTS = ["#c084fc","#34d399","#fbbf24","#06b6d4","#ec4899","#8b5cf6","#f87171"];
    const handleSpeakSummary = (text) => {
      setCurrentSpeakingFor(text === (structured && sum.intro ? sum.intro : "Aqui está tudo o que você aprendeu hoje, explicado passo a passo. 📒 Anote no caderno!") ? "intro" : text);
      speak(text);
    };
    return (
      <div className={supportClass} style={styles.container}>
      {routineBar}
      {renderHiddenEggs()}
        <div style={styles.header}><span>📚 Resumo da Aula — {studentName}</span></div>
        <div style={{ maxWidth:740, margin:"0 auto", padding:`${scalePx(22)}px ${scalePx(16)}px ${scalePx(36)}px` }}>
          {/* topo em destaque */}
          <div style={{ background:"linear-gradient(135deg,#c084fc,#8b5cf6)", borderRadius:18, padding:`${scalePx(24)}px ${scalePx(22)}px`, textAlign:"center", boxShadow:"0 12px 30px #c084fc55" }}>
            <div style={{ fontSize:scaleSize(44) }}>📚</div>
            <h1 style={{ color:"#fff", fontSize:scaleSize(25), margin:`${scalePx(4)}px 0 ${scalePx(8)}px` }}>Resumo da sua aula</h1>
            <p style={{ color:"#e0e7ff", fontSize:scaleSize(15), maxWidth:560, margin:"0 auto", lineHeight:1.6, marginBottom:12 }}>
              {structured && sum.intro ? sum.intro : "Aqui está tudo o que você aprendeu hoje, explicado passo a passo. 📒 Anote no caderno!"}
            </p>
            {ttsAllowed && <button onClick={() => handleSpeakSummary(structured && sum.intro ? sum.intro : "Aqui está tudo o que você aprendeu hoje, explicado passo a passo. Anote no caderno!")} style={{ background:isSpeaking && currentSpeakingFor==="intro" ? "#fff" : "rgba(255,255,255,0.2)", color:isSpeaking && currentSpeakingFor==="intro" ? "#c084fc" : "#fff", border:"none", borderRadius:8, padding:`${scalePx(10)}px ${scalePx(18)}px`, fontSize:scaleSize(13), fontWeight:700, cursor:"pointer", minHeight:scaleSize(44) }}>{isSpeaking && currentSpeakingFor==="intro" ? "⏸ Pausando" : "🔊 Ouvir intro"}</button>}
            <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:14 }}>
              <button onClick={()=>setSummaryView("simples")} style={{ background: summaryView==="simples" ? "#fff" : "rgba(255,255,255,0.16)", color: summaryView==="simples" ? "#c084fc" : "#fff", border:"none", borderRadius:20, padding:`${scalePx(8)}px ${scalePx(16)}px`, fontSize:scaleSize(12.5), fontWeight:800, cursor:"pointer" }}>🌱 Resumo simples</button>
              <button onClick={fetchDetailedSummary} disabled={detailLoading} style={{ background: summaryView==="detalhado" ? "#fff" : "rgba(255,255,255,0.16)", color: summaryView==="detalhado" ? "#c084fc" : "#fff", border:"none", borderRadius:20, padding:`${scalePx(8)}px ${scalePx(16)}px`, fontSize:scaleSize(12.5), fontWeight:800, cursor: detailLoading ? "wait" : "pointer", opacity: detailLoading ? 0.7 : 1 }}>{detailLoading ? "⏳ Gerando..." : "📖 Resumo detalhado"}</button>
            </div>
            {detailFailMsg && <p style={{ color:"#ffd7d7", fontSize:12.5, marginTop:8 }}>{detailFailMsg}</p>}
          </div>

          {structured ? (
            <div style={{ marginTop:18 }}>
              {sum.secoes.map((s,i)=>{
                const c = ACCENTS[i % ACCENTS.length];
                const sectionText = `${s.titulo}. ${s.explicacao || ''}${s.exemplo ? '. Exemplo: ' + s.exemplo : ''}`;
                return (
                  <div key={i} style={{ background:"#1e1430", borderRadius:14, padding:18, margin:"0 0 14px", border:"1px solid #3b2a58", borderLeft:`5px solid ${c}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, justifyContent:"space-between" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{s.emoji || "📌"}</span>
                        <div>
                          <div style={{ color:c, fontSize:11, fontWeight:800, letterSpacing:1 }}>PARTE {i+1}</div>
                          <h3 style={{ color:"#f0e9fb", fontSize:17, margin:0 }}>{s.titulo}</h3>
                        </div>
                      </div>
                      {ttsAllowed && <button onClick={() => { setCurrentSpeakingFor(`section-${i}`); speak(sectionText); }} style={{ background:isSpeaking && currentSpeakingFor===`section-${i}` ? c : c+"33", border:`1px solid ${c}`, color:c, padding:"6px 12px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", minWidth:"max-content" }}>{isSpeaking && currentSpeakingFor===`section-${i}` ? "⏸" : "🔊"}</button>}
                    </div>
                    {s.explicacao && <p style={{ color:"#d6c9ec", fontSize:15, lineHeight:1.75, margin:"0 0 4px" }}>{s.explicacao}</p>}
                    {s.exemplo && <CodeBlock code={s.exemplo} />}
                  </div>
                );
              })}
              {sum.dica && (
                <div style={{ background:"#fbbf2416", border:"1px solid #fbbf24", borderRadius:14, padding:18, margin:"4px 0 0", display:"flex", gap:12, justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:26, lineHeight:1, marginBottom:4 }}>💡</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <h4 style={{ color:"#fbbf24", margin:"0 0 4px" }}>Dica do Nyx</h4>
                    <p style={{ color:"#fcd9a0", fontSize:15, lineHeight:1.7, margin:0 }}>{sum.dica}</p>
                  </div>
                  {ttsAllowed && <button onClick={() => { setCurrentSpeakingFor("dica"); speak(sum.dica); }} style={{ background:isSpeaking && currentSpeakingFor==="dica" ? "#fbbf24" : "rgba(251,191,36,0.2)", border:"1px solid #fbbf24", color:isSpeaking && currentSpeakingFor==="dica" ? "#000" : "#fbbf24", padding:"6px 12px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", minWidth:"max-content" }}>{isSpeaking && currentSpeakingFor==="dica" ? "⏸" : "🔊"}</button>}
                </div>
              )}
            </div>
          ) : (
            <div className="cardfx" style={{ ...styles.card, marginTop:18 }}>
              <pre style={{ whiteSpace:"pre-wrap", fontFamily:"inherit", fontSize:14, lineHeight:1.9, color:"#d6c9ec", margin:0 }}>{typeof sum==="string" ? sum : (sum && sum.raw) || "O resumo não carregou. Volte e clique em Salvar novamente."}</pre>
            </div>
          )}

          <div style={{ textAlign:"center", marginTop:22 }}>
            {accessMode ? (
              <>
                <p style={{ color:"#a99ac9", marginBottom:12 }}>Quando terminar de ouvir o resumo, volte para o código! 🎮</p>
                <button style={{ ...styles.btn("#c084fc"), padding:"12px 26px", fontSize:16 }} onClick={async()=>{ setPhase("coding"); await persist({ phase:"coding" }); }}>← Voltar para o código</button>
              </>
            ) : (
              <>
                <p style={{ color:"#a99ac9", marginBottom:12 }}>Quando terminar de anotar, vá para a atividade! ✍️</p>
                <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
                  <button style={{ ...styles.btnGhost, padding:"12px 22px", fontSize:15 }} onClick={async()=>{ setPhase("coding"); await persist({ phase:"coding" }); }}>← Voltar para o código</button>
                  <button style={{ ...styles.btn("#c084fc"), padding:"12px 26px", fontSize:16 }} onClick={handleStartActivity}>Fazer Atividade →</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (phase==="activity") {
    const activity = dynamicActivity||[];
    const handleSpeakQuestion = (q, i) => {
      const qText = `Questão ${i+1}: ${q.q}. Opções: ${q.opts.map((o, idx) => `${String.fromCharCode(65+idx)}: ${o}`).join('. ')}`;
      setCurrentSpeakingFor(`q-${i}`);
      speak(qText);
    };
    return (
      <div className={supportClass} style={styles.container}>
      {routineBar}
      {renderHiddenEggs()}
        <AchievementToast achievement={newAchievement} />
        {goalParty && !calmMode && <ConfettiParty level={goalParty} />}
        <div style={styles.header}><span>📝 Atividade — {studentName}</span></div>
        <div style={{ maxWidth:640, margin:"0 auto", padding:24 }}>
          <h2 style={{ color:"#c084fc", fontSize:scaleSize(20) }}>Atividade da Aula</h2>
          <p style={{ color:"#a99ac9", fontSize:scaleSize(13), marginBottom:16 }}>Baseada no código que você escreveu hoje! Marque a alternativa que você acha certa — o resultado só aparece depois de enviar.</p>
          {activity.map((q,i)=>{
            return (
              <div key={i} data-q={i} className="cardfx" style={{...styles.card, padding:scalePx(18), ...(q.bonus ? { borderColor:"#fbbf24" } : {})}}>
                <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:12, justifyContent:"space-between" }}>
                  <p style={{ fontWeight:600, margin:0, flex:1, fontSize:scaleSize(16) }}>
                    {q.bonus && <span style={{ background:"#fbbf2422", border:"1px solid #fbbf24", color:"#fbbf24", borderRadius:20, padding:"2px 9px", fontSize:scaleSize(11), fontWeight:800, marginRight:8, whiteSpace:"nowrap" }}>⭐ Bônus opcional</span>}
                    {i+1}. {q.q}
                  </p>
                  {ttsAllowed && <button onClick={() => handleSpeakQuestion(q, i)} style={{ background:isSpeaking && currentSpeakingFor===`q-${i}` ? "#c084fc" : "#c084fc33", border:"1px solid #c084fc", color:"#c084fc", padding:`${scalePx(8)}px ${scalePx(12)}px`, borderRadius:6, fontSize:scaleSize(11), fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", minWidth:"max-content" }}>{isSpeaking && currentSpeakingFor===`q-${i}` ? "⏸" : "🔊"}</button>}
                </div>
                {q.opts.map((opt,j)=>{
                  const picked = answers[i]===j;
                  return (
                    <button key={j} data-opt={j} style={{...styles.opt(picked), minHeight:scalePx(56)}} onClick={()=>pickAnswer(i,j)}>
                      {opt}
                    </button>
                  );
                })}
                {/* 💡 dificuldade adaptativa: dica opcional que ajuda a pensar sem entregar a resposta */}
                {q.dica && (
                  revealedHints[i] ? (
                    <div className="pop" style={{ marginTop:10, background:"#fbbf2416", border:"1px solid #fbbf24", borderRadius:10, padding:"9px 12px", display:"flex", gap:8, alignItems:"flex-start" }}>
                      <span style={{ fontSize:15 }}>💡</span>
                      <p style={{ color:"#fcd9a0", fontSize:scaleSize(12.5), lineHeight:1.6, margin:0 }}>{q.dica}</p>
                    </div>
                  ) : (
                    <button onClick={()=>setRevealedHints(h=>({...h,[i]:true}))} style={{ marginTop:10, background:"transparent", border:"1px dashed #fbbf24", color:"#fbbf24", borderRadius:10, padding:"6px 12px", fontSize:scaleSize(12), fontWeight:700, cursor:"pointer" }}>💡 Quer uma dica?</button>
                  )
                )}
              </div>
            );
          })}
          <div style={{ textAlign:"right" }}>
            <button style={{...styles.btn("#c084fc"), padding:`${scalePx(12)}px ${scalePx(26)}px`, fontSize:scaleSize(15), marginTop:scalePx(16) }} onClick={handleSubmitActivity} disabled={activity.some((q,i)=>!q.bonus && answers[i]==null)}>Enviar Atividade →</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase==="done") {
    const activity = dynamicActivity||[];
    const g = gradeInfo(score);
    const backToHome = async () => { setPhase("coding"); await persist({ phase:"coding" }); };
    const fbStructured = finalFeedback && typeof finalFeedback === "object" && Array.isArray(finalFeedback.secoes) && finalFeedback.secoes.length > 0;
    const fbSpeechText = fbStructured
      ? [finalFeedback.intro, ...finalFeedback.secoes.map(s=>`${s.titulo}. ${s.explicacao}`), finalFeedback.dica].filter(Boolean).join(". ")
      : (typeof finalFeedback === "string" ? finalFeedback : "");
    const FB_ACCENTS = ["#34d399","#fbbf24"];
    return (
      <div className={supportClass} style={styles.container}>
      {routineBar}
      {renderHiddenEggs()}
        <AchievementToast achievement={newAchievement} />
        {goalParty && !calmMode && <ConfettiParty level={goalParty} />}
        {showFeedbackModal && (
          <NyxFeedbackModal score={score} loading={feedbackLoading} feedback={finalFeedback} onClose={()=>{
            setShowFeedbackModal(false);
            // quem errou alguma questão já cai direto na explicação do Nyx, sem precisar clicar em nada
            if ((dynamicActivity||[]).some((q,i)=>!q.bonus && answers[i]!==q.correct)) explainErrors();
          }} />
        )}
        {showErrorExplain && (
          <ErrorExplainModal sections={errorSections} encouragement={errorEncouragement} onClose={()=>setShowErrorExplain(false)} />
        )}
        <div style={styles.header}>
          <span>🎓 Aula Concluída — {studentName}</span>
          <button onClick={backToHome} style={{ background:"transparent", border:"1px solid #3b2a58", color:"#a99ac9", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12.5, fontWeight:700 }}>← Voltar à tela inicial</button>
        </div>
        <div style={{ maxWidth:580, margin:"40px auto", textAlign:"center", padding:24 }}>
          <div ref={el => { if (el) gsap.fromTo(el, { scale:0.2, opacity:0, rotate:-15 }, { scale:1, opacity:1, rotate:0, duration:0.7, ease:"elastic.out(1,0.5)" }); }} style={{ fontSize:72 }}>{g.emoji}</div>
          <h2 ref={el => { if (el) gsap.fromTo(el, { y:16, opacity:0 }, { y:0, opacity:1, duration:0.5, delay:0.15, ease:"back.out(1.7)" }); }} style={{ color:g.color, fontSize:26, fontWeight:900 }}>{g.label} — Você fez {score} pontos!</h2>

          {/* 🎁 presente misterioso do dia: recompensa por concluir a atividade, 1x por dia */}
          {giftReveal ? (
            <div className="pop" style={{ margin:"18px auto 0", maxWidth:340, background:`linear-gradient(135deg, ${giftReveal.color}22, ${giftReveal.color}0a)`, border:`2px solid ${giftReveal.color}`, borderRadius:18, padding:"18px 20px", boxShadow:`0 0 34px ${giftReveal.color}44` }}>
              <div style={{ fontSize:46 }}>{giftReveal.emoji}</div>
              <p style={{ color:giftReveal.color, fontWeight:900, fontSize:17, margin:"6px 0 2px" }}>{giftReveal.label}!</p>
              <p style={{ color:"#f0e9fb", fontWeight:800, fontSize:15, margin:0 }}>+{giftReveal.pts} pontos do Nyx ✨</p>
            </div>
          ) : giftLastClaim !== todayKey() ? (
            <button onClick={openGift} className="pop" title="Um presente por dia pra quem conclui a atividade!"
              style={{ margin:"18px auto 0", display:"block", background:"linear-gradient(135deg,#3b0764,#1e1b4b)", border:"2px dashed #a855f7", borderRadius:18, padding:"14px 26px", cursor:"pointer", boxShadow:"0 0 26px #a855f733" }}>
              <span style={{ fontSize:42, display:"inline-block", animation:"gift-wiggle 1.6s ease-in-out infinite" }}>🎁</span>
              <span style={{ display:"block", color:"#e9d5ff", fontWeight:900, fontSize:14, marginTop:4 }}>Presente misterioso do dia — toque pra abrir!</span>
            </button>
          ) : null}

          <div style={{ marginTop:18, textAlign:"left" }}>
            {/* topo em destaque, mesma estética do Resumo da Aula */}
            <div style={{ background:"linear-gradient(135deg,#c084fc,#8b5cf6)", borderRadius:18, padding:"20px 20px", textAlign:"center", boxShadow:"0 12px 30px #c084fc55" }}>
              <div style={{ fontSize:38 }}>🤖</div>
              <h3 style={{ color:"#fff", fontSize:19, margin:"4px 0 8px" }}>Feedback do Nyx para você</h3>
              {feedbackLoading ? (
                <p style={{ color:"#e0e7ff", fontSize:14 }}>Analisando seu código e sua atividade...</p>
              ) : (
                <p style={{ color:"#e0e7ff", fontSize:14, maxWidth:460, margin:"0 auto", lineHeight:1.6 }}>
                  {fbStructured ? finalFeedback.intro : (typeof finalFeedback === "string" && finalFeedback) ? finalFeedback : "Parabéns por concluir a aula de hoje!"}
                </p>
              )}
              {!feedbackLoading && ttsAllowed && fbSpeechText && (
                <button onClick={() => { setCurrentSpeakingFor("feedback"); speak(fbSpeechText); }} style={{ marginTop:10, background:isSpeaking && currentSpeakingFor==="feedback" ? "#fff" : "rgba(255,255,255,0.2)", color:isSpeaking && currentSpeakingFor==="feedback" ? "#c084fc" : "#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  {isSpeaking && currentSpeakingFor==="feedback" ? "⏸ Pausando" : "🔊 Ouvir feedback"}
                </button>
              )}
            </div>

            {fbStructured && (
              <div style={{ marginTop:14 }}>
                {finalFeedback.secoes.map((s,i)=>{
                  const c = FB_ACCENTS[i % FB_ACCENTS.length];
                  return (
                    <div key={i} style={{ background:"#1e1430", borderRadius:14, padding:16, margin:"0 0 12px", border:"1px solid #3b2a58", borderLeft:`5px solid ${c}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:38, height:38, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19 }}>{s.emoji || "📌"}</span>
                        <h4 style={{ color:"#f0e9fb", fontSize:15, margin:0 }}>{s.titulo}</h4>
                      </div>
                      {s.explicacao && <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.7, margin:0 }}>{s.explicacao}</p>}
                    </div>
                  );
                })}
                {finalFeedback.dica && (
                  <div style={{ background:"#fbbf2416", border:"1px solid #fbbf24", borderRadius:14, padding:16, display:"flex", gap:10 }}>
                    <div style={{ fontSize:22, lineHeight:1 }}>💡</div>
                    <div>
                      <h4 style={{ color:"#fbbf24", margin:"0 0 4px", fontSize:14 }}>Dica do Nyx</h4>
                      <p style={{ color:"#fcd9a0", fontSize:13.5, lineHeight:1.7, margin:0 }}>{finalFeedback.dica}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="cardfx" style={{ ...styles.card, marginTop:14, textAlign:"left" }}>
            <h4 style={{ color:"#c084fc", marginBottom:10 }}>📝 Revisão da atividade</h4>
            {activity.map((q,i)=>{
              // a questão bônus nunca aparece como "erro" — ficar sem responder ou errar não conta contra o aluno
              const hit = answers[i]===q.correct;
              const skipped = q.bonus && answers[i]==null;
              const color = skipped ? "#776798" : hit ? "#34d399" : q.bonus ? "#a99ac9" : "#f87171";
              const icon = skipped ? "⭐" : hit ? (q.bonus ? "⭐✅" : "✅") : (q.bonus ? "⭐" : "❌");
              return (
                <div key={i} style={{ marginBottom:12 }}>
                  <b style={{ color }}>{icon} {q.q}</b>
                  {skipped && <div style={{ color:"#776798", fontSize:13, marginTop:2 }}>Bônus não respondido — sem problema, não conta contra você.</div>}
                  {!skipped && !hit && <div style={{ color:"#a99ac9", fontSize:13, marginTop:2 }}>Correto: {q.opts[q.correct]}</div>}
                </div>
              );
            })}
          </div>

          {(dynamicActivity||[]).some((q,i)=>!q.bonus && answers[i]!==q.correct) && (
            <div className="cardfx" style={{ ...styles.card, marginTop:14, textAlign:"left", borderColor:"#c084fc" }}>
              <h4 style={{ color:"#c084fc", marginBottom:8 }}>🤖 Não entendeu algum erro?</h4>
              <p style={{ color:"#a99ac9", fontSize:13, lineHeight:1.6, marginBottom:10 }}>O Nyx pode explicar cada questão que você errou, com calma e do seu jeito.</p>
              <button style={{ ...styles.btn("#c084fc"), opacity:explaining?0.6:1 }} onClick={explainErrors} disabled={explaining}>{explaining ? "Nyx está escrevendo..." : errorSections.length ? "↻ Ver explicação de novo" : "✨ Nyx, me explica meus erros!"}</button>
              {explainFailMsg && <p style={{ color:"#f87171", fontSize:13, marginTop:8 }}>{explainFailMsg}</p>}
            </div>
          )}

          {/* Avaliação da aula → professor */}
          <div className="cardfx" style={{ ...styles.card, marginTop:14, textAlign:"left", borderColor:"#fbbf24" }}>
            <h4 style={{ color:"#fbbf24", marginBottom:8 }}>💬 O que você achou da aula?</h4>
            {classSent ? (
              <p style={{ color:"#34d399", fontSize:14 }}>✅ Obrigado! Seu recado foi enviado para o professor.</p>
            ) : (
              <>
                <Stars value={classRating} onChange={setClassRating} />
                <textarea value={classText} onChange={e=>setClassText(e.target.value)} placeholder="Escreva um recado para o professor (opcional)..."
                  style={{ width:"100%", marginTop:10, background:"#171026", border:"2px solid #3b2a58", borderRadius:8, color:"#f0e9fb", padding:10, fontSize:14, minHeight:70, boxSizing:"border-box", resize:"vertical" }} />
                <div style={{ textAlign:"right", marginTop:8 }}>
                  <button style={styles.btn("#fbbf24")} onClick={sendClassFeedback} disabled={classRating===0}>Enviar avaliação</button>
                </div>
              </>
            )}
          </div>

          <button onClick={backToHome} style={{ ...styles.btn("#c084fc"), marginTop:20 }}>← Voltar à tela inicial</button>
        </div>
      </div>
    );
  }

  // um único botão — o Nyx tenta o primeiro modelo e, se falhar por qualquer motivo, tenta o
  // outro sozinho por trás dos panos, sem o aluno precisar escolher nem clicar de novo
  const analyzeButtons = (
    <button title={activeCode.trim().length<12 ? "Escreva um pouco mais de código neste arquivo antes de pedir a análise" : ""} style={{ ...styles.btn("#c084fc"), opacity:(analyzing||activeCode.trim().length<12)?0.55:1 }} onClick={()=>analyzeCode()} disabled={analyzing||activeCode.trim().length<12}>
      {analyzing ? "🔍 Analisando..." : "✨ Analisar código"}
    </button>
  );

  // ── CODING ──
  return (
    <div className={supportClass} style={{ ...styles.container, position:"relative", paddingLeft: (!focusMode && vw > 700) ? 190 : 0 }}>
      <Sparkles id="nyx-student-sparkles" position="absolute" count={26} />
      {/* navegação lateral — mesma gamificação da barra rápida de baixo, só que fixa à esquerda
          em telas largas; em celular (vw<=700) some daqui e a barra horizontal assume sozinha. */}
      {!focusMode && vw > 700 && (
        <div style={{ position:"fixed", left:0, top:0, bottom:0, width:190, background:"#160e24ee", backdropFilter:"blur(8px)", borderRight:"1px solid #3b2a58", zIndex:41, display:"flex", flexDirection:"column", gap:4, padding:"18px 10px", overflowY:"auto" }}>
          <div style={{ padding:"0 6px 14px", fontWeight:900, fontSize:13, letterSpacing:1, color:"#fbbf24" }}>🎮 JOGOS</div>
          <button onClick={()=>{ setShowTrail(true); }} style={{ ...styles.btnGhost, textAlign:"left", width:"100%", display:"flex", alignItems:"center", gap:6, padding:"9px 10px", fontSize:12.5 }}>🗺️ Jornada</button>
          <button onClick={()=>setShowAchievements(true)} style={{ ...styles.btnGhost, textAlign:"left", width:"100%", display:"flex", alignItems:"center", gap:6, padding:"9px 10px", fontSize:12.5 }}>🎖️ Conquistas · {achievements.filter(id=>visibleAchievements(isLangRoom).some(a=>a.id===id)).length}/{visibleAchievements(isLangRoom).length}</button>
          <button onClick={()=>setShowNyxShop(true)} style={{ ...styles.btnGhost, textAlign:"left", width:"100%", display:"flex", alignItems:"center", gap:6, padding:"9px 10px", fontSize:12.5 }}>🎁 Loja do Nyx</button>
          <button onClick={()=>setShowRanking(true)} style={{ ...styles.btnGhost, textAlign:"left", width:"100%", display:"flex", alignItems:"center", gap:6, padding:"9px 10px", fontSize:12.5 }}>📊 Ranking da turma</button>
          <button onClick={()=>setShowGamesMenu(true)} style={{ ...styles.btn("#c084fc"), textAlign:"left", width:"100%", display:"flex", alignItems:"center", gap:6, padding:"9px 10px", fontSize:12.5 }}>🎮 Games</button>
          <button onClick={()=>setShowKnowledgeTest(true)} title="Teste seu conhecimento da matéria, sem dicas" style={{ ...styles.btnGhost, textAlign:"left", width:"100%", display:"flex", alignItems:"center", gap:6, padding:"9px 10px", fontSize:12.5 }}>🧠 Testar Conhecimento</button>
          <button onClick={()=>setShowFreeBuild(true)} title="Proponha algo que você quer construir e o Nyx te ajuda a planejar como chegar lá" style={{ ...styles.btnGhost, textAlign:"left", width:"100%", display:"flex", alignItems:"center", gap:6, padding:"9px 10px", fontSize:12.5 }}>🏗️ Desafio Livre{weeklyChallenge && weeklyChallenge.weekKey===weekKey() && weeklyChallenge.status==="done" ? " ✅" : ""}</button>
          <button onClick={()=>{ setShowHallOfFame(true); getHallOfFame(shift).then(setHallEntries); }} style={{ ...styles.btnGhost, textAlign:"left", width:"100%", display:"flex", alignItems:"center", gap:6, padding:"9px 10px", fontSize:12.5 }}>👑 Hall da Fama</button>
        </div>
      )}
      {routineBar}
      {renderHiddenEggs()}
      {/* pergunta de preferência de interação do Nyx — perfil novo, antes até da apresentação e do tour */}
      {showNyxPrefs && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1001, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"26px 24px", maxWidth:460, width:"100%", boxShadow:"0 24px 70px rgba(0,0,0,.55), 0 0 44px #c084fc22" }}>
            <div style={{ textAlign:"center" }}>
              <NyxRobot state="idle" size={80} showName={false} />
              <p style={{ color:"#f0e9fb", fontSize:16.5, fontWeight:800, margin:"10px 0 4px" }}>Antes de começar, {String(studentName).split(" ")[0]}...</p>
              <p style={{ color:"#a99ac9", fontSize:13, margin:0, lineHeight:1.6 }}>Me conta como você prefere que eu converse e explique as coisas — cada pessoa gosta de um jeito!</p>
            </div>
            <div style={{ marginTop:18 }}>
              <p style={{ color:"#c084fc", fontWeight:700, fontSize:13, marginBottom:8 }}>Meu jeito de conversar:</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[["divertido","😄 Animado e brincalhão"],["serio","🎯 Sério e direto ao ponto"]].map(([v,label])=>(
                  <button key={v} onClick={()=>setNyxPrefs(p=>({...p, tom:v}))}
                    style={{ flex:"1 1 180px", padding:"10px 12px", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:700, textAlign:"center",
                      background: nyxPrefs.tom===v ? "linear-gradient(135deg,#c084fc,#9333ea)" : "#171026",
                      color: nyxPrefs.tom===v ? "#fff" : "#d6c9ec",
                      border: nyxPrefs.tom===v ? "2px solid #c084fc" : "2px solid #3b2a58" }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop:16 }}>
              <p style={{ color:"#c084fc", fontWeight:700, fontSize:13, marginBottom:8 }}>Como eu explico as coisas:</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[["detalhada","📖 Bem explicado, com detalhes"],["direta","⚡ Direto ao ponto, menos texto"]].map(([v,label])=>(
                  <button key={v} onClick={()=>setNyxPrefs(p=>({...p, estilo:v}))}
                    style={{ flex:"1 1 180px", padding:"10px 12px", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:700, textAlign:"center",
                      background: nyxPrefs.estilo===v ? "linear-gradient(135deg,#c084fc,#9333ea)" : "#171026",
                      color: nyxPrefs.estilo===v ? "#fff" : "#d6c9ec",
                      border: nyxPrefs.estilo===v ? "2px solid #c084fc" : "2px solid #3b2a58" }}>{label}</button>
                ))}
              </div>
            </div>
            <p style={{ color:"#776798", fontSize:11.5, margin:"14px 0 0", textAlign:"center" }}>Não se preocupe, dá pra mudar depois quando quiser.</p>
            <button onClick={async ()=>{ setShowNyxPrefs(false); await persist({ nyxPrefs }); }} style={{ ...styles.btn("#c084fc"), width:"100%", padding:"13px 0", fontSize:15, marginTop:16 }}>
              Continuar →
            </button>
          </div>
        </div>
      )}
      {/* 🌐 sala de linguagens: escolha de HTML/CSS/PHP/JS antes de conhecer o Nyx */}
      {!showNyxPrefs && showLangPicker && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1001, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"26px 24px", maxWidth:480, width:"100%", boxShadow:"0 24px 70px rgba(0,0,0,.55), 0 0 44px #22d3ee22" }}>
            <div style={{ textAlign:"center" }}>
              <NyxRobot state="idle" size={80} showName={false} />
              <p style={{ color:"#f0e9fb", fontSize:16.5, fontWeight:800, margin:"10px 0 4px" }}>E aí, {String(studentName).split(" ")[0]}! 🌐</p>
              <p style={{ color:"#a99ac9", fontSize:13, margin:0, lineHeight:1.6 }}>Você está na sala de linguagens — qual você quer estudar? Eu viro especialista nela pra te ajudar.</p>
            </div>
            <div style={{ marginTop:18, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {STUDY_LANGUAGES.map(l => (
                <button key={l.id} onClick={()=>chooseLanguage(l.id)}
                  style={{ background:"#171026", border:"2px solid #3b2a58", borderRadius:14, padding:"18px 10px", cursor:"pointer", textAlign:"center", color:"#f0e9fb" }}>
                  <span style={{ display:"block", fontSize:30, marginBottom:6 }}>{l.emoji}</span>
                  <span style={{ display:"block", fontWeight:800, fontSize:14.5 }}>{l.label}</span>
                </button>
              ))}
            </div>
            <p style={{ color:"#776798", fontSize:11.5, margin:"16px 0 0", textAlign:"center" }}>Dá pra trocar de linguagem depois, quando quiser — seu código antigo fica guardado no histórico.</p>
          </div>
        </div>
      )}
      {/* apresentação do Nyx no primeiro acesso */}
      {!showNyxPrefs && !showLangPicker && showIntro && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"26px 24px", maxWidth:440, width:"100%", textAlign:"center", boxShadow:"0 24px 70px rgba(0,0,0,.55), 0 0 44px #c084fc22" }}>
            <div style={{ animation:"nyx-float 3s ease-in-out .8s infinite" }}>
              <NyxRobot state="ok" size={112} showName={false} />
            </div>
            <div style={{ fontWeight:900, fontSize:14, letterSpacing:3, color:"#c084fc", marginTop:4 }}>NYX</div>
            {/* balão de fala */}
            <div style={{ position:"relative", background:"#171026", border:"1px solid #3e2d5e", borderRadius:16, padding:"16px 18px", marginTop:16, textAlign:"left" }}>
              <div style={{ position:"absolute", top:-8, left:"50%", width:14, height:14, background:"#171026", borderLeft:"1px solid #3e2d5e", borderTop:"1px solid #3e2d5e", transform:"translateX(-50%) rotate(45deg)" }} />
              <p style={{ color:"#f0e9fb", fontSize:16.5, fontWeight:800, margin:0, animation:"rise .5s ease .3s both" }}>
                Oi, {String(studentName).split(" ")[0]}! Eu sou o <span style={{color:"#c084fc"}}>Nyx</span> 🤖
              </p>
              <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.7, margin:"10px 0 0", animation:"rise .5s ease 1s both" }}>
                Eu fico do lado do seu editor conferindo o código enquanto você escreve.
              </p>
              <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.7, margin:"10px 0 0", animation:"rise .5s ease 1.7s both" }}>
                Se algo estiver errado, eu mostro <b style={{color:"#fbbf24"}}>onde está</b> e <b style={{color:"#34d399"}}>como corrigir</b> — até as teclas que você precisa apertar!
              </p>
            </div>
            <button onClick={()=>{ setShowIntro(false); setTourStep(0); }} style={{ ...styles.btn("#c084fc"), width:"100%", padding:"13px 0", fontSize:15, marginTop:16, animation:"rise .5s ease 2.4s both" }}>
              Conhecer minha sala! ✨
            </button>
          </div>
        </div>
      )}
      {aiDown && (
        <div style={{ position:"fixed", top:12, left:12, zIndex:1200, background:"#231636", border:"1px solid #fbbf24", borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
          <span style={{ display:"inline-block", width:9, height:9, borderRadius:"50%", background:"#fbbf24", animation:"nyx-antenna 1s ease-in-out infinite" }} />
          <span style={{ color:"#fbbf24", fontSize:12.5, fontWeight:700 }}>🔄 Reconectando Nyx...</span>
        </div>
      )}
      <div style={styles.header}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={()=>setShowAvatarEdit(true)} title="Editar meu boneco"
            style={{ background:"transparent", border:"none", padding:0, cursor:"pointer", position:"relative", lineHeight:0 }}>
            <Avatar cfg={avatar} size={34} animated={!calmMode} />
            <span style={{ position:"absolute", right:-4, bottom:-4, background:"#c084fc", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, boxShadow:"0 1px 3px rgba(0,0,0,.5)" }}>✏️</span>
          </button>
          <span className="shine" style={{ fontWeight:900, fontSize:17, background:"linear-gradient(120deg,#c084fc,#22d3ee,#c084fc)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>💻 Aula C#</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color: connected===false?"#f87171":connected?"#34d399":"#a99ac9" }}>
            {connected===null ? "● conectando..." : connected ? "● conectado" : "● sem conexão"}
          </span>
          <span style={{ display:"inline-flex", alignItems:"center", gap:8, fontSize:11 }}>
            {[["nvidia","✨ Nemotron"],["laguna","🌊 Laguna"]].map(([key,label]) => {
              const h = providerHealth[key];
              const recent = h && Date.now() - h.at < 5 * 60 * 1000;
              const color = !recent ? "#5d679c" : h.ok ? "#34d399" : "#f87171";
              const title = !recent ? `${label}: sem dados recentes` : h.ok ? `${label}: respondendo normalmente` : `${label}: não respondeu na última tentativa`;
              return (
                <span key={key} title={title} style={{ display:"inline-flex", alignItems:"center", gap:4, color:"#a99ac9" }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:color, display:"inline-block", boxShadow: recent && h.ok ? `0 0 5px ${color}` : "none" }} />
                  {label}
                </span>
              );
            })}
          </span>
          <span style={{ background:"#c084fc22", padding:"4px 12px", borderRadius:20, fontSize:13 }}>👤 {studentName}</span>
          <span style={{ background:"#171026", border:"1px solid #3b2a58", padding:"4px 10px", borderRadius:20, fontSize:12, color:"#a99ac9" }}>{shiftLabel(shift, myTurmas)}</span>
          {streakCount >= 2 && <span title="Dias de aula seguidos que você participou" style={{ background:"#f8717122", border:"1px solid #f87171", padding:"4px 10px", borderRadius:20, fontSize:12, color:"#fca5a5", fontWeight:800 }}>🔥 {streakCount} dias seguidos</span>}
          <button data-tour="tema" style={{ ...styles.btnGhost, padding:"6px 12px", fontSize:12 }} onClick={()=>setThemeAndSave(theme==="light"?"dark":"light")} title="Mudar tema do fundo">{theme==="light"?"🌙 Escuro":"☀️ Claro"}</button>
          <button style={{ ...styles.btnGhost, padding:"6px 12px", fontSize:12 }} onClick={()=>setShowColorPicker(true)} title="Escolher a cor do fundo">🎨 Cores</button>
          {isSpartan && (
            <button style={{ ...styles.btn("#b45309"), padding:"6px 12px", fontSize:12 }}
              onClick={()=>setThemeAndSave(theme==="spartan" ? (themeBeforeSpartan||"dark") : "spartan")}
              title="Espada + escudo equipados: use o tema exclusivo do Espartano ou volte ao seu tema de sempre, é você quem escolhe">
              {theme==="spartan" ? "🎨 Tema normal" : "🛡️ Tema Espartano"}
            </button>
          )}
          <button style={{ ...styles.btnGhost, padding:"6px 12px", fontSize:12 }} onClick={toggleMuted} title={muted?"Ativar sons":"Silenciar sons"}>{muted?"🔇":"🔊"}</button>
          <button data-tour="acessibilidade" style={{ ...styles.btn(largeUiMode?"#06b6d4":"#3b2a58"), padding:"6px 12px", fontSize:12 }} onClick={()=>{ setLargeUiMode(!largeUiMode); try { localStorage.setItem("nyx_large_ui", !largeUiMode?"1":"0"); } catch {} }} title={largeUiMode?"Desativar modo acessível":"Ativar modo acessível (letras maiores)"}>♿</button>
          {ttsAllowed && <button style={{ ...styles.btnGhost, padding:"6px 12px", fontSize:12 }} onClick={()=>setShowVoicePicker(true)} title="Escolher a voz do Nyx (leitura em voz alta)">🗣️</button>}
          <button style={{ ...styles.btnGhost, padding:"6px 12px", fontSize:12 }} onClick={tryFullscreen}>⛶ Tela cheia</button>
          <button style={{ ...styles.btn("#f87171"), padding:"6px 12px", fontSize:12 }} onClick={onLogout}>Sair</button>
        </div>
      </div>

      {/* navegação rápida — versão horizontal só pra celular (vw<=700); em telas largas a mesma
          gamificação (Jornada, Conquistas, Loja, Ranking, os jogos agrupados em "🎮 Games",
          Testar Conhecimento, Desafio Livre, Hall da Fama) já está na sidebar fixa acima.
          Continuam existindo nos dois lugares dependendo do tamanho de tela, não tira nada de
          onde já estava. Some no modo foco. */}
      {!focusMode && vw <= 700 && (
        <div style={{ maxWidth:1180, margin:"12px auto 0", padding:"0 14px", display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={()=>{ setShowTrail(true); }} style={{ ...styles.btnGhost, display:"flex", alignItems:"center", gap:6, padding:"7px 14px", fontSize:12.5 }}>🗺️ Jornada</button>
          <button onClick={()=>setShowAchievements(true)} style={{ ...styles.btnGhost, display:"flex", alignItems:"center", gap:6, padding:"7px 14px", fontSize:12.5 }}>🎖️ Conquistas · {achievements.filter(id=>visibleAchievements(isLangRoom).some(a=>a.id===id)).length}/{visibleAchievements(isLangRoom).length}</button>
          <button onClick={()=>setShowNyxShop(true)} style={{ ...styles.btnGhost, display:"flex", alignItems:"center", gap:6, padding:"7px 14px", fontSize:12.5 }}>🎁 Loja do Nyx</button>
          <button onClick={()=>setShowRanking(true)} style={{ ...styles.btnGhost, display:"flex", alignItems:"center", gap:6, padding:"7px 14px", fontSize:12.5 }}>📊 Ranking da turma</button>
          <button onClick={()=>setShowGamesMenu(true)} style={{ ...styles.btn("#c084fc"), display:"flex", alignItems:"center", gap:6, padding:"7px 14px", fontSize:12.5 }}>🎮 Games</button>
          <button onClick={()=>setShowKnowledgeTest(true)} title="Teste seu conhecimento da matéria, sem dicas" style={{ ...styles.btnGhost, display:"flex", alignItems:"center", gap:6, padding:"7px 14px", fontSize:12.5 }}>🧠 Testar Conhecimento</button>
          <button onClick={()=>setShowFreeBuild(true)} title="Proponha algo que você quer construir e o Nyx te ajuda a planejar como chegar lá" style={{ ...styles.btnGhost, display:"flex", alignItems:"center", gap:6, padding:"7px 14px", fontSize:12.5 }}>🏗️ Desafio Livre{weeklyChallenge && weeklyChallenge.weekKey===weekKey() && weeklyChallenge.status==="done" ? " ✅" : ""}</button>
          <button onClick={()=>{ setShowHallOfFame(true); getHallOfFame(shift).then(setHallEntries); }} style={{ ...styles.btnGhost, display:"flex", alignItems:"center", gap:6, padding:"7px 14px", fontSize:12.5 }}>👑 Hall da Fama</button>
        </div>
      )}

      <AchievementToast achievement={newAchievement} />
        {goalParty && !calmMode && <ConfettiParty level={goalParty} />}

      {showNudge && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#fbbf2418", border:"2px solid #fbbf24", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:26 }}>📣</span>
            <div style={{ flex:1 }}>
              <b style={{ color:"#fbbf24" }}>Recado do professor</b>
              <p style={{ color:"#fcd9a0", fontSize:14, margin:"2px 0 0", lineHeight:1.5 }}>{nudge.text}</p>
            </div>
            <button onClick={dismissNudge} style={{ ...styles.btn("#fbbf24"), padding:"6px 12px", fontSize:13 }}>Entendi</button>
          </div>
        </div>
      )}

      {idleHint && !showNudge && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#c084fc18", border:"1px solid #c084fc", color:"#c7d2fe", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>👀</span>
            <span>Bora começar? Escreva seu primeiro código no editor — o Nyx te ajuda assim que você parar de digitar.</span>
          </div>
        </div>
      )}

      {fsMsg && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#1e1430", border:"1px solid #fbbf24", color:"#fbbf24", borderRadius:10, padding:"8px 14px", fontSize:13 }}>⛶ {fsMsg}</div>
        </div>
      )}

      {bossInfo && phase==="coding" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"linear-gradient(90deg,#3b076422,#1e1b4b44)", border:"1px solid #a855f7", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20, animation:"nyx-shake 2.2s ease-in-out infinite" }}>{bossInfo.emoji}</span>
            <span style={{ flex:1, color:"#e9d5ff" }}><b style={{ color:"#c4b5fd" }}>{bossInfo.name} invadiu a aula!</b> Cada resposta certa da turma tira vida dele — acompanhe a batalha no telão! ⚔️</span>
          </div>
        </div>
      )}

      {classStatusNow.inBreak && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"linear-gradient(90deg,#0e749922,#22d3ee22)", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>🍎</span>
            <span style={{ flex:1, color:"#a5f3fc" }}><b style={{ color:"#22d3ee" }}>Hora do intervalo!</b> Volta em {classStatusNow.minutesToBreakEnd} min. Pode continuar mexendo no código se quiser — é só descanso, sem pressa. 😊</span>
          </div>
        </div>
      )}
      {classStatusNow.warnEnd && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#fbbf2418", border:"1px solid #fbbf24", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>⏰</span>
            <span style={{ flex:1, color:"#fcd9a0" }}><b style={{ color:"#fbbf24" }}>Faltam {classStatusNow.minutesToEnd} minuto{classStatusNow.minutesToEnd!==1?"s":""} pra aula acabar!</b> Já pode ir salvando seu trabalho.</span>
          </div>
        </div>
      )}
      {breakEndMsg && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#22d3ee18", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", fontSize:13, color:"#a5f3fc", fontWeight:700 }}>{breakEndMsg}</div>
        </div>
      )}
      {/* 🎉 quiz: sala aberta pelo professor — botão brilhante pra entrar com o código */}
      {quizRoomInfo && quizRoomInfo.status !== "podium" && (!quizJoin || quizJoin.code !== quizRoomInfo.code) && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <button onClick={()=>{ setShowQuizJoin(true); setQuizCodeInput(""); setQuizCodeError(""); }}
            style={{ width:"100%", background:"linear-gradient(120deg,#7c3aed,#c026d3,#7c3aed)", backgroundSize:"200% auto", border:"2px solid #c084fc", borderRadius:14, padding:"14px 18px", color:"#fff", fontWeight:900, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, animation:"glow-ring 1.3s ease-in-out infinite, shine 3s linear infinite" }}>
            <span style={{ fontSize:22, animation:"pulse-dot 1.1s ease-in-out infinite" }}>🎉</span>
            Quiz valendo! Toque aqui e entre com o código
          </button>
        </div>
      )}
      {/* 🤝 parceiro de código: alguém foi designado pra me ajudar */}
      {partnerHelped && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#22d3ee18", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>🤝</span>
            <span style={{ flex:1, color:"#a5f3fc" }}><b style={{ color:"#22d3ee" }}>{partnerHelped.helper}</b> vai te ajudar agora! Ele(a) pode ver seu código pra te dar uma força.</span>
          </div>
        </div>
      )}
      {partnerToast && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div className="pop" style={{ background:"#34d39918", border:"1px solid #34d399", borderRadius:12, padding:"10px 14px", fontSize:13, color:"#c7f5df", fontWeight:700 }}>{partnerToast}</div>
        </div>
      )}
      {streakToast && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div className="pop" style={{ background:"#fbbf2418", border:"1px solid #fbbf24", borderRadius:12, padding:"10px 14px", fontSize:13, color:"#fde9b8", fontWeight:700 }}>{streakToast}</div>
        </div>
      )}

      {/* 📶 internet caiu: tranquiliza o aluno — o trabalho está guardado neste computador e
          o próprio heartbeat re-salva tudo sozinho assim que a conexão voltar */}
      {connected === false && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#fbbf2418", border:"1px solid #fbbf24", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>📶</span>
            <span style={{ flex:1, color:"#fde68a", lineHeight:1.6 }}><b style={{ color:"#fbbf24" }}>A internet caiu — mas pode continuar programando!</b> Seu código está guardado neste computador e vai ser salvo sozinho assim que a conexão voltar. Não precisa fazer nada.</span>
          </div>
        </div>
      )}
      {justReconnected && connected && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div className="pop" style={{ background:"#34d39918", border:"1px solid #34d399", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>✅</span>
            <span style={{ flex:1, color:"#c7f5df", fontWeight:700 }}>Conexão de volta — todo o seu trabalho foi salvo!</span>
          </div>
        </div>
      )}

      {!recapDismissed && recapText && phase==="coding" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#34d39918", border:"1px solid #34d399", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>📋</span>
            <span style={{ flex:1, color:"#c7f5df" }}><b style={{ color:"#34d399" }}>Retomando:</b> {recapText}</span>
            <button onClick={()=>{ setRecapDismissed(true); try { localStorage.setItem(`nyx_recap_${todayKey()}_${shift}_${studentName}`, "1"); } catch {} }} style={{ background:"transparent", border:"none", color:"#34d399", fontSize:16, cursor:"pointer", flexShrink:0 }}>✕</button>
          </div>
        </div>
      )}

      {!kbSuggestDismissed && !keyboardDone && (easyRead || supportFlags.motora || selfSupport.motora) && phase==="coding" && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"linear-gradient(90deg,#0e749922,#22d3ee22)", border:"1px solid #22d3ee", borderRadius:12, padding:"10px 14px", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>⌨️</span>
            <span style={{ flex:1, color:"#a5f3fc" }}><b style={{ color:"#22d3ee" }}>Quer treinar o teclado?</b> O Nyx te mostra tecla por tecla, no seu ritmo — pode fazer quando quiser.</span>
            <button onClick={()=>{ setShowKeyboard(true); setKbSuggestDismissed(true); try { localStorage.setItem(`nyx_kbsuggest_${todayKey()}_${shift}_${studentName}`, "1"); } catch {} }} style={{ ...styles.btn("#22d3ee"), padding:"6px 12px", fontSize:12.5 }}>Treinar agora</button>
            <button onClick={()=>{ setKbSuggestDismissed(true); try { localStorage.setItem(`nyx_kbsuggest_${todayKey()}_${shift}_${studentName}`, "1"); } catch {} }} style={{ background:"transparent", border:"none", color:"#22d3ee", fontSize:16, cursor:"pointer", flexShrink:0 }}>✕</button>
          </div>
        </div>
      )}

      {renaming != null && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#1e1430", border:"2px solid #c084fc", borderRadius:16, padding:24, maxWidth:380, width:"100%" }}>
            <h3 style={{ color:"#c084fc", margin:"0 0 4px" }}>✎ Renomear arquivo</h3>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 12px" }}>Escolha um nome para o arquivo (o "{fileExt}" é colocado sozinho).</p>
            <div style={{ display:"flex", alignItems:"center", background:"#171026", border:"2px solid #3b2a58", borderRadius:10, padding:"0 12px" }}>
              <input autoFocus value={renameValue} onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") confirmRename(); if(e.key==="Escape") cancelRename(); }}
                placeholder="ex: MeuPrograma" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#f0e9fb", fontSize:15, padding:"11px 0" }} />
              <span style={{ color:"#776798", fontSize:14 }}>.cs</span>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={cancelRename} style={{ ...styles.btnGhost, flex:1 }}>Cancelar</button>
              <button onClick={confirmRename} style={{ ...styles.btn("#c084fc"), flex:1 }}>Salvar nome</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:14, padding:14, maxWidth:1180, margin:"0 auto", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 560px", minWidth:320 }}>
          {accessMode ? (
            <div className="cardfx" style={{ ...styles.card, borderColor:"#22d3ee" }}>
              <h3 style={{ color:"#22d3ee", marginBottom:4, fontSize:scaleSize(19) }}>🧩 Modo Guiado — Monte seu programa!</h3>
              <p style={{ color:"#a99ac9", fontSize:scaleSize(13), marginBottom:14 }}>Clique nos blocos abaixo para montar seu programa, um passo de cada vez! {ttsSupported && "O Nyx explica cada bloco em voz alta pra você."}</p>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
                {GUIDED_BLOCKS.map(block => (
                  <button key={block.id} onClick={()=> block.needsInput ? setPendingBlock({ block, value:"" }) : addGuidedBlock(block)}
                    style={{ background:"#1e1430", border:"2px solid #3b2a58", borderRadius:12, padding:"14px 10px", cursor:"pointer", color:"#f0e9fb", textAlign:"center", minHeight:scalePx(92) }}>
                    <div style={{ fontSize:scaleSize(30) }}>{block.emoji}</div>
                    <div style={{ fontSize:scaleSize(12.5), fontWeight:700, marginTop:6 }}>{block.label}</div>
                  </button>
                ))}
              </div>

              {pendingBlock && (
                <div style={{ marginTop:16, background:"#171026", border:"2px solid #22d3ee", borderRadius:12, padding:16 }}>
                  <p style={{ color:"#22d3ee", fontWeight:700, marginBottom:8, fontSize:scaleSize(14) }}>{pendingBlock.block.emoji} {pendingBlock.block.inputLabel}</p>
                  <input autoFocus value={pendingBlock.value} onChange={e=>setPendingBlock({ ...pendingBlock, value:e.target.value })}
                    placeholder={pendingBlock.block.placeholder}
                    onKeyDown={e=>{ if (e.key==="Enter" && pendingBlock.value.trim()) addGuidedBlock(pendingBlock.block, pendingBlock.value); }}
                    style={{ width:"100%", background:"#1e1430", border:"1px solid #3b2a58", borderRadius:8, padding:`${scalePx(10)}px ${scalePx(12)}px`, color:"#f0e9fb", fontSize:scaleSize(15), boxSizing:"border-box" }} />
                  <div style={{ display:"flex", gap:8, marginTop:10 }}>
                    <button onClick={()=>setPendingBlock(null)} style={{ ...styles.btnGhost, flex:1 }}>Cancelar</button>
                    <button onClick={()=>addGuidedBlock(pendingBlock.block, pendingBlock.value)} disabled={!pendingBlock.value.trim()} style={{ ...styles.btn("#22d3ee"), flex:1, opacity:pendingBlock.value.trim()?1:0.5 }}>Adicionar ✅</button>
                  </div>
                </div>
              )}

              {/* Nyx te ensina: mini-lições de C# geradas sob demanda, sempre com exemplo de jogo — o professor mantém
                  o Modo Guiado ligado durante a aula toda, e o aluno pode pedir quantas lições quiser nesse período */}
              <div style={{ marginTop:20, background:"linear-gradient(135deg,#c084fc22,#8b5cf622)", border:"1px solid #c084fc55", borderRadius:14, padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:scaleSize(26) }}>🎮</span>
                    <div>
                      <h4 style={{ color:"#d6c9ec", margin:0, fontSize:scaleSize(15) }}>Nyx te ensina a programar jogos!</h4>
                      <p style={{ color:"#a99ac9", margin:"2px 0 0", fontSize:scaleSize(12) }}>Peça quantas lições quiser — o Nyx sempre explica com exemplo de jogo.</p>
                    </div>
                  </div>
                  <button onClick={generateGuidedLesson} disabled={guidedLessonLoading} style={{ ...styles.btn("#c084fc"), opacity:guidedLessonLoading?0.6:1, whiteSpace:"nowrap" }}>
                    {guidedLessonLoading ? "🤔 Pensando..." : "✨ Me ensina um truque novo!"}
                  </button>
                </div>
                {guidedLessons.length > 0 && (
                  <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:10 }}>
                    {guidedLessons.map((l,i)=>{
                      const LC = ["#34d399","#fbbf24","#06b6d4","#ec4899","#8b5cf6"];
                      const c = LC[i % LC.length];
                      const lessonSpeech = [l.titulo, l.codigo ? `O código é: ${codeForSpeech(l.codigo)}` : null, l.oQueFaz, l.exemploJogo].filter(Boolean).join(". ");
                      return (
                        <div key={l.id} style={{ background:"#1e1430", borderRadius:12, padding:14, border:"1px solid #3b2a58", borderLeft:`5px solid ${c}` }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <span style={{ background:c+"22", border:`1px solid ${c}`, minWidth:34, height:34, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>{l.emoji || "🎮"}</span>
                              <h5 style={{ color:"#f0e9fb", margin:0, fontSize:scaleSize(14) }}>{l.titulo}</h5>
                            </div>
                            {ttsAllowed && <button onClick={() => { setCurrentSpeakingFor(`lesson-${l.id}`); speak(lessonSpeech); }} style={{ background:isSpeaking && currentSpeakingFor===`lesson-${l.id}` ? c : c+"33", border:`1px solid ${c}`, color:c, padding:"5px 10px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>{isSpeaking && currentSpeakingFor===`lesson-${l.id}` ? "⏸" : "🔊"}</button>}
                          </div>
                          {l.codigo && <CodeBlock code={l.codigo} />}
                          {l.oQueFaz && <p style={{ color:"#d6c9ec", fontSize:scaleSize(13), lineHeight:1.7, margin:"6px 0 0" }}>{l.oQueFaz}</p>}
                          {l.exemploJogo && <p style={{ color:"#a5b4fc", fontSize:scaleSize(12.5), lineHeight:1.7, margin:"4px 0 0", fontStyle:"italic" }}>🎮 {l.exemploJogo}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginTop:20 }}>
                <h4 style={{ color:"#c084fc", marginBottom:8, fontSize:scaleSize(15) }}>📜 Seu programa (nesta ordem)</h4>
                {guidedBlocks.length===0 ? (
                  <p style={{ color:"#776798", fontSize:scaleSize(13) }}>Clique num bloco acima para começar!</p>
                ) : (
                  <>
                  {guidedBlocks.length > 1 && <p style={{ color:"#776798", fontSize:scaleSize(11.5), margin:"0 0 8px" }}>🖐️ Arraste pelo <b style={{color:"#a99ac9"}}>⠿</b> pra reordenar, ou use as setinhas.</p>}
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {guidedBlocks.map((b,i)=>{
                      const isDragging = guidedDragIdx === i;
                      const isOver = guidedOverIdx === i && guidedDragIdx != null && guidedDragIdx !== i;
                      return (
                      <div key={b.uid} ref={el => guidedRowRefs.current[i]=el}
                        style={{
                          display:"flex", alignItems:"center", gap:10, background:"#1e1430",
                          border: isOver ? "2px dashed #22d3ee" : "1px solid #3b2a58", borderRadius:8, padding:"8px 12px",
                          opacity: isDragging ? 0.45 : 1,
                          transform: isDragging ? "scale(1.03)" : "scale(1)",
                          boxShadow: isDragging ? "0 8px 20px rgba(0,0,0,.35)" : "none",
                          transition: "border-color .12s, transform .12s, opacity .12s",
                          animation: guidedJustDropped === b.uid ? "guided-snap .32s ease" : "none",
                          touchAction: guidedDragIdx != null ? "none" : "auto",
                        }}>
                        <span onPointerDown={(e)=>{ e.preventDefault(); startGuidedDrag(i); }} onTouchStart={()=>startGuidedDrag(i)}
                          title="Arraste pra reordenar" style={{ cursor: guidedDragIdx===i ? "grabbing" : "grab", color:"#776798", fontSize:scaleSize(18), padding:"2px 4px", userSelect:"none", touchAction:"none" }}>⠿</span>
                        <span style={{ fontSize:scaleSize(20) }}>{b.emoji}</span>
                        <span style={{ flex:1, fontSize:scaleSize(13) }}>{i+1}. {b.label}</span>
                        <button onClick={()=>moveGuidedBlock(i,-1)} disabled={i===0} style={{ background:"transparent", border:"none", color:"#a99ac9", cursor:"pointer", opacity:i===0?0.3:1, fontSize:scaleSize(15), minWidth:scaleSize(32) }}>⬆️</button>
                        <button onClick={()=>moveGuidedBlock(i,1)} disabled={i===guidedBlocks.length-1} style={{ background:"transparent", border:"none", color:"#a99ac9", cursor:"pointer", opacity:i===guidedBlocks.length-1?0.3:1, fontSize:scaleSize(15), minWidth:scaleSize(32) }}>⬇️</button>
                        <button onClick={()=>removeGuidedBlock(b.uid)} style={{ background:"transparent", border:"none", color:"#f87171", cursor:"pointer", fontSize:scaleSize(16), minWidth:scaleSize(32) }}>✕</button>
                      </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>

              {activeCode.trim() && (
                <div style={{ marginTop:16 }}>
                  <p style={{ color:"#776798", fontSize:scaleSize(12), marginBottom:2 }}>👀 Assim fica o código de verdade (o Nyx e o professor conseguem ver):</p>
                  <CodeBlock code={activeCode} />
                </div>
              )}

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16, flexWrap:"wrap", gap:8 }}>
                <span style={{ color: saveWarn ? "#fbbf24" : "#776798", fontSize:scaleSize(12) }}>{saveWarn || (analyzing ? "🔍 Verificando..." : activeCode.trim().length < 12 ? "✍️ Escreva um pouco mais de código neste arquivo para poder pedir a análise do Nyx" : "✨ Peça ao Nyx quando quiser que ele confira seu código")}</span>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {analyzeButtons}
                </div>
              </div>
              <p data-tour="salvar" style={{ color:"#a99ac9", fontSize:scaleSize(12), margin:"10px 0 0", lineHeight:1.5 }}>📚 Continue praticando — seu professor libera o resumo da aula pra turma quando chegar a hora.</p>

              <Terminal files={files} dataTour="terminal" onEasterEgg={handleEasterEgg} />
            </div>
          ) : (
            <>
              {/* abas de arquivos */}
              <div data-tour="arquivos" style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                {files.map((f,i)=>(
                  <div key={i} onClick={()=>setActive(i)} style={{ display:"flex", alignItems:"center", gap:6, background:i===active?"#1e1e1e":"#101425", border:`1px solid ${i===active?"#c084fc":"#3b2a58"}`, color:i===active?"#fff":"#a99ac9", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>
                    <span>📄 {f.name}</span>
                    <span onClick={(e)=>{e.stopPropagation();openRename(i);}} title="Renomear" style={{ color:"#c084fc", fontWeight:700 }}>✎</span>
                    {files.length>1 && <span onClick={(e)=>{e.stopPropagation();deleteFile(i);}} title="Apagar" style={{ color:"#f87171", fontWeight:700 }}>✕</span>}
                  </div>
                ))}
                <button onClick={addFile} style={{ background:"#171026", border:"1px dashed #c084fc", color:"#c084fc", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>＋ Novo arquivo</button>
              </div>

              <div data-tour="editor">
                <VSEditor value={activeCode} onChange={updateActiveCode} onPasteText={handleEditorPaste} filename={files[active]?.name} errorLines={errorLinesForEditor} locked={(analyzing && lockDuringAnalysis) || keyboardLocked} lockMessage={keyboardLocked ? "🔒 O professor travou o teclado — espere ele liberar de novo" : undefined} />
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8, flexWrap:"wrap", gap:8 }}>
                <span style={{ color: keyboardLocked ? "#f87171" : saveWarn ? "#fbbf24" : "#776798", fontSize:12 }}>{keyboardLocked ? "🔒 O professor travou o teclado — espere ele liberar de novo." : saveWarn || (analyzing ? "🔍 Verificando..." : activeCode.trim().length < 12 ? "✍️ Escreva um pouco mais de código neste arquivo para poder pedir a análise do Nyx" : "✨ Peça ao Nyx quando quiser que ele confira seu código")}</span>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {analyzeButtons}
                </div>
              </div>
              <p data-tour="salvar" style={{ color:"#a99ac9", fontSize:12, margin:"8px 0 0", lineHeight:1.5 }}>📚 Continue praticando — seu professor libera o resumo da aula pra turma quando chegar a hora.</p>

              <Terminal files={files} dataTour="terminal" onEasterEgg={handleEasterEgg} />
            </>
          )}
        </div>

        {/* Robô + atalhos — fica "grudado" na tela conforme rola a página, com scroll próprio se o conteúdo for mais alto que a tela */}
        <div className="side-col side-col-sticky" style={{ width:250, flex:"0 0 250px" }}>
          {showErrorWalkthrough && codeErrors.length > 0 && (
            vw > 700 ? (
              <FloatingErrorBubble
                errors={codeErrors}
                step={Math.min(errorWalkStep, codeErrors.length-1)}
                activeCode={activeCode}
                verifying={analyzing}
                helpLevel={errorHelpLevel[Math.min(errorWalkStep, codeErrors.length-1)] || 0}
                onRequestHelp={()=>{ const st = Math.min(errorWalkStep, codeErrors.length-1); setErrorHelpLevel(h=>({ ...h, [st]: (h[st]||0)+1 })); }}
                onPrev={()=>setErrorWalkStep(s=>Math.max(0,s-1))}
                onNext={()=>setErrorWalkStep(s=>Math.min(codeErrors.length-1,s+1))}
                onVerify={analyzeCode}
                onClose={()=>setShowErrorWalkthrough(false)}
              />
            ) : (
              <ErrorWalkthroughCard
                errors={codeErrors}
                step={Math.min(errorWalkStep, codeErrors.length-1)}
                verifying={analyzing}
                helpLevel={errorHelpLevel[Math.min(errorWalkStep, codeErrors.length-1)] || 0}
                onRequestHelp={()=>{ const st = Math.min(errorWalkStep, codeErrors.length-1); setErrorHelpLevel(h=>({ ...h, [st]: (h[st]||0)+1 })); }}
                onPrev={()=>setErrorWalkStep(s=>Math.max(0,s-1))}
                onNext={()=>setErrorWalkStep(s=>Math.min(codeErrors.length-1,s+1))}
                onVerify={analyzeCode}
                onClose={()=>setShowErrorWalkthrough(false)}
              />
            )
          )}
          <div data-tour="nyx" className="cardfx" style={styles.card}>
            <NyxRobot state={robotState} size={88} gear={nyxGear} />
            {robotMsg&&(<div style={{ background:robotState==="error"?"#f8717111":"#34d39911", border:`1px solid ${robotState==="error"?"#f87171":"#34d399"}`, borderRadius:8, padding:12, marginTop:10, fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap" }}>
              {robotMsg}
              {ttsAllowed && <div style={{ marginTop:8 }}><button onClick={()=>speak(robotMsg)} style={{ background:"transparent", border:`1px solid ${robotState==="error"?"#f87171":"#34d399"}`, color:robotState==="error"?"#f87171":"#34d399", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>🔊 Ouvir</button></div>}
            </div>)}
            {keysToShow.length>0&&(<div style={{ marginTop:10 }}><p style={{ color:"#fbbf24", fontSize:12, fontWeight:600, marginBottom:4 }}>Teclas para usar:</p>{keysToShow.map((k,i)=><KeyVisual key={i} char={k}/>)}</div>)}
            {helpAt
              ? <button data-tour="ajuda" onClick={cancelHelp} style={{ ...styles.btn("#34d399"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="O professor já foi avisado — clique pra cancelar o pedido">✋ Professor avisado! (cancelar)</button>
              : <button data-tour="ajuda" onClick={askHelp} style={{ ...styles.btn("#fbbf24"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Acende seu nome no painel do professor pra ele vir te ajudar">✋ Pedir ajuda do professor</button>}
            {!partnerHelped && (wantsPartner
              ? <button onClick={cancelPartnerRequest} style={{ ...styles.btn("#34d399"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Clique pra cancelar o pedido">🙋 Parceiro pedido! (cancelar)</button>
              : <button className="btn-ghost" onClick={askPartner} style={{ ...styles.btnGhost, width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Avisa o professor que você quer um colega pra ajudar você — ele escolhe quem, por segurança">🤝 Pedir um parceiro pra me ajudar</button>)}
            {partnerHelping && (
              <button onClick={()=>{ setPartnerViewActive(0); setShowPartnerHelp(true); }} style={{ ...styles.btn("#22d3ee"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Veja o código dele(a) (só leitura) e marque como resolvido quando ajudar">
                🤝 Ajudar {partnerHelping.helped} · ver código
              </button>
            )}
            {!focusMode && <button data-tour="loja" onClick={()=>setShowNyxShop(true)} style={{ ...styles.btn("#c084fc"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }}>
              🎁 Loja do Nyx · {nyxPoints - nyxSpent} pts
            </button>}
            {studyLang?.preview && (
              <button className="btn-ghost" onClick={()=>setShowPreview(true)} style={{ ...styles.btnGhost, width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Veja o resultado do seu código rodando de verdade">
                👁️ Prévia ao vivo
              </button>
            )}
            {isLangRoom && studyLang && (
              <button className="btn-ghost" onClick={()=>setShowSwitchConfirm(true)} style={{ ...styles.btnGhost, width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Guarda o código e os resumos de agora no histórico e começa outra linguagem do zero">
                🔁 Trocar linguagem
              </button>
            )}
            <button className="btn-ghost" data-tour="teclado" onClick={()=>setShowKeyboard(true)} style={{ ...styles.btnGhost, width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Aprenda onde fica cada tecla, no seu ritmo — pode treinar quando quiser">
              ⌨️ Tutorial de Teclado
            </button>
            <button className="btn-ghost" data-tour="hall" onClick={()=>{ setShowHallOfFame(true); getHallOfFame(shift).then(setHallEntries); }} style={{ ...styles.btnGhost, width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Veja quem se destacou nas cidades por onde a carreta já passou">
              🏆 Hall da Fama
            </button>
            {pendingAbsences.length>0 && (
              <button onClick={()=>setShowJustify(true)} style={{ ...styles.btn("#f87171"), width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Justifique uma falta pro professor avaliar">
                😔 Justificar falta ({pendingAbsences.length})
              </button>
            )}
          </div>
          <div data-tour="turma" className="cardfx" style={styles.card}>
            <p style={{ color:"#fbbf24", fontWeight:700, marginBottom:8, fontSize:13 }}>🏆 Turma & Você</p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {!focusMode && <button className="btn-ghost" onClick={()=>setShowRanking(true)} style={{ ...styles.btnGhost, fontSize:12, padding:"7px 0" }}>📊 Ranking da turma</button>}
              <button className="btn-ghost" onClick={()=>setShowAchievements(true)} style={{ ...styles.btnGhost, fontSize:12, padding:"7px 0" }}>🎖️ Conquistas · {achievements.filter(id=>visibleAchievements(isLangRoom).some(a=>a.id===id)).length}/{visibleAchievements(isLangRoom).length}</button>
              <button className="btn-ghost" onClick={()=>setShowNotebook(true)} style={{ ...styles.btnGhost, fontSize:12, padding:"7px 0" }}>📒 Caderno de resumos</button>
              <button className="btn-ghost" onClick={()=>setShowTrail(true)} style={{ ...styles.btnGhost, fontSize:12, padding:"7px 0" }}>🗺️ Trilha de aprendizado</button>
              <button className="btn-ghost" onClick={()=>setShowNextSteps(true)} style={{ ...styles.btnGhost, fontSize:12, padding:"7px 0" }}>🚀 Próximos passos</button>
              <button className="btn-ghost" onClick={()=>setShowPerformance(true)} style={{ ...styles.btnGhost, fontSize:12, padding:"7px 0" }}>📊 Meu Desempenho</button>
              {/* Duelo, Duelo em Dupla e Corrida de digitação saíram daqui — agora ficam juntos no
                  botão "🎮 Games" da navegação lateral/barra rápida, pra não duplicar. */}
              {!focusMode && <button className="btn-ghost" onClick={()=>setShowKnowledgeTest(true)} title="Teste seu conhecimento da matéria, sem dicas — pode fazer quando quiser, sem precisar finalizar a aula"
                style={{ ...styles.btnGhost, fontSize:12, padding:"7px 0" }}>🧠 Testar Conhecimento</button>}
              {!focusMode && <button className="btn-ghost" onClick={()=>setShowFreeBuild(true)} title="Proponha algo que você quer construir e o Nyx te ajuda a planejar como chegar lá"
                style={{ ...styles.btnGhost, fontSize:12, padding:"7px 0" }}>🏗️ Desafio Livre da Semana{weeklyChallenge && weeklyChallenge.weekKey===weekKey() && weeklyChallenge.status==="done" ? " ✅" : ""}</button>}
            </div>
            <div style={{ borderTop:"1px solid #3b2a58", marginTop:10, paddingTop:10 }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                <input type="checkbox" checked={portfolioPublic} onChange={togglePortfolioPublic} style={{ width:16, height:16, accentColor:"#c084fc", cursor:"pointer" }} />
                <span style={{ color:"#a99ac9", fontSize:12 }}>🌟 Criar link público do meu progresso (pra mandar pra família)</span>
              </label>
              {portfolioPublic && (
                <div style={{ marginTop:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <button onClick={copyPortfolioLink} style={{ ...styles.btn("#c084fc"), fontSize:11.5, padding:"6px 12px", width:"auto" }}>📋 Copiar link</button>
                    {portfolioCopyMsg && <span style={{ color:"#34d399", fontSize:11.5 }}>{portfolioCopyMsg}</span>}
                  </div>
                  <p style={{ color:"#776798", fontSize:10.5, margin:"6px 0 0", lineHeight:1.5 }}>Só mostra seu primeiro nome, apelido, conquistas e progresso — nada de sobrenome, turma ou nota comparada. Expira sozinho em 60 dias{portfolioActivatedAt ? ` (${new Date(portfolioActivatedAt + 60*24*3600*1000).toLocaleDateString("pt-BR")})` : ""} — é só ligar de novo se quiser renovar.</p>
                </div>
              )}
            </div>
            <div style={{ borderTop:"1px solid #3b2a58", marginTop:10, paddingTop:10 }}>
              <button onClick={()=>setShowSelfSupport(v=>!v)} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:12, cursor:"pointer", padding:0, textAlign:"left" }}>
                🧩 Preciso de um ajuste hoje? {showSelfSupport ? "▴" : "▾"}
              </button>
              {showSelfSupport && (
                <div style={{ marginTop:8 }}>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {[
                      ["sensorial", "🧘 Sensorial", "Desliga sons, confete e animações de festa — pra quando os estímulos estão demais."],
                      ["foco", "🎯 Foco", "Some com ranking, loja e duelos — sobra só o essencial pra você se concentrar."],
                      ["leitura", "📖 Leitura", "Deixa as letras e linhas mais espaçadas na sua tela."],
                      ["ritmo", "🐢 Ritmo próprio", "A atividade do dia fica com 4 questões em vez de 8."],
                      ["motora", "🖐️ Motora", "Te sugere o tutorial de teclado, pra ajudar a digitar."],
                      ["visual", "👁️ Visual", "Alto contraste + letras maiores na sua tela."],
                    ].map(([flag, label, hint]) => (
                      <button key={flag} onClick={()=>toggleSelfSupport(flag)} title={hint}
                        style={{ background: selfSupport[flag] ? "#3b82f6" : "#171026", color: selfSupport[flag] ? "#fff" : "#a99ac9", border:`1px solid ${selfSupport[flag] ? "#3b82f6" : "#3b2a58"}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", fontWeight:800, fontSize:11.5 }}>
                        {selfSupport[flag] ? "✓ " : ""}{label}
                      </button>
                    ))}
                  </div>
                  <p style={{ color:"#776798", fontSize:11, margin:"6px 0 0" }}>Só você decide — liga e desliga quando quiser, sem precisar pedir pro professor.</p>
                </div>
              )}
            </div>
            {!focusMode && <ClassGoalBar sum={classPointsSum} />}
          </div>
          <div className="cardfx" style={{ ...styles.card, fontSize:12, color:"#776798", lineHeight:1.8 }}>
            <p style={{ color:"#c084fc", fontWeight:600, marginBottom:6 }}>⌨️ Atalhos do editor</p>
            <div><code style={{color:"#FFD700"}}>{"{"}</code> → abre e fecha sozinho</div>
            <div><code style={{color:"#DA70D6"}}>(</code> → abre e fecha sozinho</div>
            <div><code style={{color:"#ce9178"}}>"</code> → abre e fecha sozinho</div>
            <div><code style={{color:"#d4d4d4"}}>Tab</code> → empurra o texto para a direita</div>
            <div><code style={{color:"#d4d4d4"}}>Enter</code> → começa uma linha nova já no lugar certo</div>
          </div>
        </div>
      </div>

      {/* 🎁 retrospectiva do mês: liberada pelo professor, os números vêm do próprio perfil */}
      {showRetro && (() => {
        const totalLines = (files || []).reduce((n, f) => n + (f.code ? f.code.split("\n").filter(l => l.trim()).length : 0), 0);
        const presencas = Object.values(attendanceRef.current || {}).filter(v => v === "present").length;
        const best = Object.entries(scoreHistory || {}).reduce((b, [d, v]) => (v != null && (b == null || v > b.v)) ? { d, v } : b, null);
        const eggs = ALL_EGG_ACHIEVEMENT_IDS.filter(id => (achievements || []).includes(id)).length;
        const stats = { totalLines, presencas, best, conquistas: (achievements || []).length, eggs, pontos: (nyxPoints || 0) + (nyxSpent || 0), duelWins: duelWins || 0 };
        return <RetroOverlay name={studentName} stats={stats} gear={nyxGear} onClose={closeRetro} />;
      })()}

      {/* 🏟️ quiz do torneio: abre quando o professor inicia o torneio no telão e eu tenho partida */}
      {tourneyQuiz && (() => {
        const finished = tourneyStep >= tourneyQuiz.questions.length;
        const q = tourneyQuiz.questions[tourneyStep];
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.88)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1060, padding:16 }}>
            <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #22d3ee66", borderRadius:22, padding:"24px 24px", maxWidth:480, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55), 0 0 50px #22d3ee22" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <span style={{ fontSize:30 }}>🏟️</span>
                <div style={{ flex:1 }}>
                  <h2 style={{ margin:0, fontSize:19, fontWeight:900, background:"linear-gradient(135deg,#22d3ee,#c084fc)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>Torneio da Turma — Rodada {tourneyQuiz.round}</h2>
                  <div style={{ color:"#a99ac9", fontSize:12 }}>{finished ? "quiz concluído!" : `você × ${tourneyQuiz.opponent} · pergunta ${tourneyStep+1} de ${tourneyQuiz.questions.length}`}</div>
                </div>
              </div>
              {!finished && (
                <>
                  <p style={{ color:"#f0e9fb", fontSize:15, fontWeight:700, lineHeight:1.6, margin:"6px 0 12px" }}>{q.pergunta}</p>
                  {/* sem feedback de certo/errado aqui — a correção só acontece no servidor, depois
                      de enviadas as 5 respostas (ver grade_tourney_round); só marca o que foi escolhido */}
                  <div style={{ display:"grid", gap:8 }}>
                    {q.alternativas.map((alt, i) => {
                      const picked = tourneyPicked != null;
                      const isMine = tourneyPicked === i;
                      return (
                        <button key={i} disabled={picked} onClick={() => setTourneyPicked(i)}
                          style={{ textAlign:"left", background: isMine ? "#22d3ee22" : "#171026",
                            border: `2px solid ${isMine ? "#22d3ee" : "#3b2a58"}`,
                            borderRadius:12, padding:"11px 14px", color:"#f0e9fb", fontSize:13.5, cursor: picked ? "default" : "pointer" }}>
                          {isMine ? "👆 " : ""}{alt}
                        </button>
                      );
                    })}
                  </div>
                  {tourneyPicked != null && (
                    <button onClick={() => {
                      setTourneyPicks(p => ({ ...p, [tourneyStep]: q.origIdx[tourneyPicked] }));
                      setTourneyStep(s => s + 1); setTourneyPicked(null);
                    }} style={{ ...styles.btn("#22d3ee"), width:"100%", padding:"11px 0", fontSize:14, marginTop:12 }}>
                      {tourneyStep + 1 >= tourneyQuiz.questions.length ? "Finalizar →" : "Próxima →"}
                    </button>
                  )}
                </>
              )}
              {finished && (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:46, lineHeight:1 }}>🏁</div>
                  {/* a nota só sai depois de enviar (a correção é sempre no servidor — ninguém, nem
                      este componente, sabe o resultado antes disso) */}
                  <p style={{ color:"#f0e9fb", fontSize:16, fontWeight:800, margin:"10px 0 4px" }}>Você respondeu as {tourneyQuiz.questions.length} perguntas!</p>
                  <p style={{ color:"#a99ac9", fontSize:13, lineHeight:1.6, margin:"0 0 12px" }}>Envie pra ver sua pontuação — o placar da sua partida aparece no telão. Boa sorte! 🤞</p>
                  <button onClick={submitTourneyQuiz} disabled={tourneySubmitting} style={{ ...styles.btn("#22d3ee"), width:"100%", padding:"12px 0", fontSize:14.5, opacity:tourneySubmitting?0.6:1, cursor:tourneySubmitting?"default":"pointer" }}>{tourneySubmitting ? "Enviando..." : "Enviar respostas 🏟️"}</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 🔥 aquecimento do dia: 3 perguntinhas sobre a aula anterior, com pontos por acerto */}
      {warmupOpen && warmup && (() => {
        const finished = warmupStep >= warmup.questions.length;
        const q = warmup.questions[warmupStep];
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1050, padding:16 }}>
            <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #fb923c66", borderRadius:22, padding:"24px 24px", maxWidth:480, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55), 0 0 50px #fb923c22" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <span style={{ fontSize:30, animation:"nyx-float 3s ease-in-out infinite" }}>🔥</span>
                <div style={{ flex:1 }}>
                  <h2 style={{ margin:0, fontSize:19, fontWeight:900, background:"linear-gradient(135deg,#fb923c,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>Aquecimento do dia</h2>
                  <div style={{ color:"#a99ac9", fontSize:12 }}>{finished ? "revisão concluída!" : `relembrando a última aula · ${warmupStep+1} de ${warmup.questions.length}`}</div>
                </div>
                {!finished && <button onClick={skipWarmup} title="Pular o aquecimento de hoje" style={{ background:"transparent", border:"1px solid #56407e", borderRadius:8, color:"#a99ac9", fontSize:12, padding:"4px 10px", cursor:"pointer", flexShrink:0 }}>Agora não</button>}
              </div>
              {!finished && (
                <>
                  <p style={{ color:"#f0e9fb", fontSize:15, fontWeight:700, lineHeight:1.6, margin:"6px 0 12px" }}>{q.pergunta}</p>
                  <div style={{ display:"grid", gap:8 }}>
                    {q.alternativas.map((alt, i) => {
                      const picked = warmupPicked != null;
                      const isRight = i === q.correta;
                      const isMine = warmupPicked === i;
                      return (
                        <button key={i} disabled={picked} onClick={() => { setWarmupPicked(i); if (i === q.correta) setWarmupCorrect(c => c + 1); }}
                          style={{ textAlign:"left", background: picked ? (isRight ? "#34d39922" : isMine ? "#f8717122" : "#171026") : "#171026",
                            border: `2px solid ${picked ? (isRight ? "#34d399" : isMine ? "#f87171" : "#241f38") : "#3b2a58"}`,
                            borderRadius:12, padding:"11px 14px", color:"#f0e9fb", fontSize:13.5, cursor: picked ? "default" : "pointer" }}>
                          {picked && isRight ? "✅ " : picked && isMine ? "❌ " : ""}{alt}
                        </button>
                      );
                    })}
                  </div>
                  {warmupPicked != null && (
                    <div className="pop" style={{ marginTop:12 }}>
                      {q.explicacao && <p style={{ color:"#a99ac9", fontSize:13, lineHeight:1.6, margin:"0 0 10px" }}>💡 {q.explicacao}</p>}
                      <button onClick={() => { setWarmupStep(s => s + 1); setWarmupPicked(null); }} style={{ ...styles.btn("#fb923c"), width:"100%", padding:"11px 0", fontSize:14 }}>
                        {warmupStep + 1 >= warmup.questions.length ? "Ver resultado →" : "Próxima →"}
                      </button>
                    </div>
                  )}
                </>
              )}
              {finished && (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:46, lineHeight:1 }}>{warmupCorrect === warmup.questions.length ? "🏆" : warmupCorrect > 0 ? "💪" : "🌱"}</div>
                  <p style={{ color:"#f0e9fb", fontSize:16, fontWeight:800, margin:"10px 0 4px" }}>
                    {warmupCorrect} de {warmup.questions.length} na revisão!
                  </p>
                  <p style={{ color:"#a99ac9", fontSize:13, lineHeight:1.6, margin:"0 0 6px" }}>
                    {warmupCorrect === warmup.questions.length ? "Memória de elefante! O conteúdo de ontem está fresquinho." : warmupCorrect > 0 ? "Boa! Revisar assim é o que faz o conteúdo ficar de vez na cabeça." : "Tudo bem! Relembrar é exatamente pra isso — agora ficou mais fresco."}
                  </p>
                  {warmupCorrect > 0 && <p style={{ color:"#fbbf24", fontSize:14, fontWeight:900, margin:"0 0 12px" }}>+{warmupCorrect} ponto{warmupCorrect>1?"s":""} do Nyx! 💰</p>}
                  <button onClick={finishWarmup} style={{ ...styles.btn("#fb923c"), width:"100%", padding:"12px 0", fontSize:14.5 }}>Bora programar! 🚀</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {tourStep >= 0 && tourStep < TOUR_STEPS.length && (
        <TourOverlay step={tourStep} onNext={()=>setTourStep(s => (s+1 >= TOUR_STEPS.length ? -1 : s+1))} />
      )}

      <ErrorHighlightRing active={showErrorWalkthrough && codeErrors.length > 0} />

      {showNyxShop && (
        <NyxShop
          wallet={nyxPoints - nyxSpent}
          owned={nyxOwned}
          gear={nyxGear}
          onEquip={handleEquipGear}
          onBuy={handleBuyItem}
          isTestShift={shift === TEST_SHIFT.id}
          onClose={()=>setShowNyxShop(false)}
        />
      )}

      {showAvatarEdit && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:680, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#c084fc,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>🎨 Editar meu boneco</h2>
              <button onClick={()=>{ setShowAvatarEdit(false); persist({}); }} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
            </div>
            <AvatarBuilder value={avatar} onChange={setAvatar} />
            <button onClick={()=>{ setShowAvatarEdit(false); persist({}); }} style={{ ...styles.btn("#c084fc"), width:"100%", marginTop:16 }}>💾 Salvar e fechar</button>
          </div>
        </div>
      )}

      {showAchievements && <AchievementsModal unlocked={achievements} onClose={()=>setShowAchievements(false)} isLangRoom={isLangRoom} />}
      {showRanking && <RankingModal shift={shift} myName={studentName} onClose={()=>setShowRanking(false)} />}
      {/* 🎉 quiz: modal de entrar com o código */}
      {showQuizJoin && quizRoomInfo && (!quizJoin || quizJoin.code !== quizRoomInfo.code) && (
        <div style={{ position:"fixed", inset:0, background:"#000000bb", zIndex:1200, display:"flex", alignItems:"center", justifyContent:"center", padding:14 }} onClick={()=>setShowQuizJoin(false)}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"2px solid #c084fc", borderRadius:20, padding:"24px 22px", maxWidth:380, width:"100%", textAlign:"center" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:40 }}>🎉</div>
            <h3 style={{ color:"#c084fc", margin:"6px 0 4px" }}>Entrar no Quiz</h3>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Digite o código que está na tela do professor:</p>
            <input autoFocus value={quizCodeInput} inputMode="numeric" maxLength={6}
              onChange={e=>{ setQuizCodeInput(e.target.value.replace(/\D/g,"")); setQuizCodeError(""); }}
              onKeyDown={e=>e.key==="Enter"&&joinQuiz()} placeholder="000000"
              style={{ width:"100%", background:"#171026", border:"2px solid #3b2a58", borderRadius:12, padding:"12px 14px", color:"#f0e9fb", fontSize:26, fontWeight:900, letterSpacing:8, textAlign:"center", outline:"none", boxSizing:"border-box" }} />
            {quizCodeError && <p style={{ color:"#f87171", fontSize:12.5, margin:"8px 0 0" }}>{quizCodeError}</p>}
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button onClick={()=>setShowQuizJoin(false)} style={{ ...styles.btnGhost, flex:1, padding:"11px 0", fontSize:13.5 }}>Cancelar</button>
              <button onClick={joinQuiz} disabled={quizCodeInput.length<6} style={{ ...styles.btn("#c084fc"), flex:1, padding:"11px 0", fontSize:13.5, opacity:quizCodeInput.length<6?0.5:1 }}>Entrar →</button>
            </div>
          </div>
        </div>
      )}
      {/* 🎉 quiz: tela do jogador (cobre tudo enquanto o quiz rola, estilo Kahoot) */}
      {quizRoomInfo && quizJoin && quizJoin.code === quizRoomInfo.code && (() => {
        const room = quizRoomInfo;
        const durationMs = quizSecsOf(room) * 1000;
        const myTotal = (room.questions || []).reduce((sum, q, i) => {
          const ans = quizAnswers[i]; const st = (room.startedAts||{})[i];
          if (!ans || st == null) return sum;
          const el = ans.at - st;
          if (el < 0 || el > durationMs) return sum;
          return sum + quizPoints(ans.opt === q.correct, el, durationMs, q.hard);
        }, 0);
        let body;
        if (room.status === "lobby") {
          body = (
            <div style={{ textAlign:"center" }}>
              <div style={{ animation:"nyx-float 2.5s ease-in-out infinite" }}><NyxRobot state="ok" size={90} showName={false} /></div>
              <h3 style={{ color:"#34d399", fontSize:22, margin:"10px 0 4px" }}>Você tá dentro! 🎉</h3>
              <p style={{ color:"#a99ac9", fontSize:14 }}>Sala <b style={{ color:"#c084fc", letterSpacing:3 }}>{room.code}</b> · {room.themeTitle}</p>
              <p style={{ color:"#776798", fontSize:13, marginTop:14 }}>Esperando o professor começar<span className="shine">...</span></p>
            </div>
          );
        } else if (room.status === "question" || room.status === "reveal") {
          const q = room.questions[room.qIndex];
          const startedAt = (room.startedAts||{})[room.qIndex];
          const myAns = quizAnswers[room.qIndex];
          const remaining = Math.max(0, Math.ceil((startedAt + durationMs - clockNow)/1000));
          const timedOut = room.status === "question" && remaining <= 0;
          const chip = (c) => ({ background:c+"22", color:c, padding:"2px 10px", borderRadius:12, fontSize:11.5, fontWeight:700 });
          body = (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, flexWrap:"wrap", gap:6 }}>
                <span style={chip("#c084fc")}>Pergunta {room.qIndex+1}/{room.questions.length}</span>
                {q.hard && <span style={chip("#fbbf24")}>⭐ Vale em dobro</span>}
                {room.status==="question" && <span style={{ fontSize:22, fontWeight:900, color: remaining<=5?"#f87171":"#34d399", fontVariantNumeric:"tabular-nums" }}>⏱ {remaining}s</span>}
              </div>
              {room.status==="question" && (
                <div className="bar-glow" style={{ height:10, background:"#171026", border:"1px solid #3b2a58", borderRadius:20, overflow:"hidden", marginBottom:12 }}>
                  <div style={{ height:"100%", width:`${Math.max(0, Math.min(100, (remaining/quizSecsOf(room))*100))}%`, background: remaining<=5?"#f87171":"#34d399", transition:"width 1s linear" }} />
                </div>
              )}
              <h3 style={{ color:"#f0e9fb", fontSize:"clamp(16px, 4vw, 21px)", lineHeight:1.45, margin:"0 0 14px" }}>{q.q}</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {q.opts.map((opt,i) => {
                  const picked = myAns && myAns.opt === i;
                  const isCorrect = i === q.correct;
                  const showResult = room.status === "reveal";
                  const dim = (showResult && !isCorrect) || (myAns && !picked) || timedOut;
                  return (
                    <button key={i} onClick={()=>answerQuiz(i)} disabled={!!myAns || room.status!=="question" || timedOut}
                      style={{ background:QUIZ_COLORS[i].bg, opacity:dim?0.35:1, borderRadius:12, padding:"18px 12px", color:"#fff", fontWeight:800, fontSize:15, display:"flex", alignItems:"center", gap:10, border: picked || (showResult && isCorrect) ? "3px solid #fff" : "3px solid transparent", cursor: (!!myAns || room.status!=="question" || timedOut) ? "default" : "pointer", textAlign:"left" }}>
                      <span style={{ fontSize:19 }}>{QUIZ_COLORS[i].shape}</span>
                      <span style={{ flex:1 }}>{opt}</span>
                      {showResult && isCorrect && <span>✅</span>}
                      {picked && !showResult && <span>👆</span>}
                    </button>
                  );
                })}
              </div>
              {room.status==="question" && myAns && <p style={{ color:"#34d399", fontWeight:800, textAlign:"center", marginTop:14 }}>✔ Resposta enviada! Aguarde...</p>}
              {room.status==="question" && !myAns && timedOut && <p style={{ color:"#f87171", fontWeight:800, textAlign:"center", marginTop:14 }}>⏰ Tempo esgotado!</p>}
              {room.status==="reveal" && (() => {
                if (!myAns) return <p style={{ color:"#f87171", fontWeight:800, textAlign:"center", marginTop:14 }}>⏰ Você não respondeu essa.</p>;
                const el = myAns.at - startedAt;
                const pts = (el >= 0 && el <= durationMs) ? quizPoints(myAns.opt === q.correct, el, durationMs, q.hard) : 0;
                return myAns.opt === q.correct
                  ? <p style={{ color:"#34d399", fontWeight:900, fontSize:18, textAlign:"center", marginTop:14 }} className="pop">✅ Acertou! +{pts} pontos</p>
                  : <p style={{ color:"#f87171", fontWeight:800, textAlign:"center", marginTop:14 }}>❌ Não foi dessa vez — a certa era "{q.opts[q.correct]}"</p>;
              })()}
              <p style={{ color:"#a99ac9", fontSize:13, textAlign:"center", marginTop:10 }}>Seus pontos: <b style={{ color:"#fbbf24" }}>{myTotal}</b></p>
            </div>
          );
        } else {
          body = (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:52 }}>🏁</div>
              <h3 style={{ color:"#fbbf24", fontSize:22, margin:"8px 0 4px" }}>Quiz encerrado!</h3>
              <p style={{ color:"#f0e9fb", fontSize:16 }}>Você fez <b style={{ color:"#fbbf24" }}>{myTotal} pontos</b></p>
              <p style={{ color:"#a99ac9", fontSize:13, marginTop:8 }}>Olha no telão do professor pra ver o pódio! 🏆</p>
              <button onClick={leaveQuiz} style={{ ...styles.btn("#c084fc"), marginTop:16, padding:"11px 28px", fontSize:14 }}>Sair do quiz</button>
            </div>
          );
        }
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.94)", zIndex:1150, display:"flex", alignItems:"center", justifyContent:"center", padding:14, overflowY:"auto" }}>
            <div style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:20, padding:"22px 20px", maxWidth:560, width:"100%", boxShadow:"0 24px 70px rgba(0,0,0,.6)", position:"relative" }}>
              <button onClick={leaveQuiz} title="Sair do quiz" style={{ position:"absolute", top:10, right:12, background:"transparent", border:"none", color:"#776798", fontSize:18, cursor:"pointer" }}>✕</button>
              {body}
            </div>
          </div>
        );
      })()}
      {showPreview && studyLang?.preview && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:14 }} onClick={()=>setShowPreview(false)}>
          <div className="cardfx" style={{ ...styles.card, width:"min(900px, 96vw)", maxHeight:"92vh", display:"flex", flexDirection:"column" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <h3 style={{ color:"#34d399", margin:0 }}>👁️ Prévia ao vivo</h3>
              <button onClick={()=>setShowPreview(false)} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
            <p style={{ color:"#776798", fontSize:12, marginBottom:8 }}>Atualiza sozinha alguns instantes depois de você parar de digitar.</p>
            <iframe title="Prévia ao vivo" srcDoc={previewDoc} sandbox="allow-scripts" style={{ width:"100%", height:"65vh", border:"1px solid #3b2a58", borderRadius:10, background:"#fff" }} />
          </div>
        </div>
      )}
      {showSwitchConfirm && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:14 }} onClick={()=>setShowSwitchConfirm(false)}>
          <div className="cardfx" style={{ ...styles.card, width:"min(420px, 96vw)" }} onClick={e=>e.stopPropagation()}>
            <h3 style={{ color:"#fbbf24", marginBottom:10 }}>🔁 Trocar de linguagem?</h3>
            <p style={{ color:"#d6c9ec", fontSize:13.5, lineHeight:1.6, marginBottom:16 }}>
              Seu código e resumos de <b>{studyLang?.label}</b> vão pro histórico, guardados — você não perde nada.
              Depois você escolhe outra linguagem e começa do zero nela.
            </p>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setShowSwitchConfirm(false)} style={{ ...styles.btnGhost, flex:1, padding:"9px 0", fontSize:13 }}>Cancelar</button>
              <button onClick={switchLanguage} style={{ ...styles.btn("#fbbf24"), flex:1, padding:"9px 0", fontSize:13 }}>Sim, trocar</button>
            </div>
          </div>
        </div>
      )}
      {showPartnerHelp && partnerHelping && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:14 }} onClick={()=>setShowPartnerHelp(false)}>
          <div className="cardfx" style={{ ...styles.card, width:"min(720px, 96vw)", maxHeight:"90vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <h3 style={{ color:"#22d3ee", margin:0 }}>🤝 Ajudando {partnerHelping.helped}</h3>
              <button onClick={()=>setShowPartnerHelp(false)} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
            <p style={{ color:"#776798", fontSize:12.5, marginBottom:10 }}>Só leitura — você não pode editar o código dele(a), só ver e ajudar por perto. Quando o problema estiver resolvido, marque abaixo: você ganha +{PARTNER_REWARD_HELPER} pontos e {partnerHelping.helped} ganha +{PARTNER_REWARD_HELPED}.</p>
            {!partnerPeerCode ? (
              <p style={{ color:"#776798", fontSize:13 }}>Carregando código...</p>
            ) : (
              <>
                {partnerPeerCode.files.length > 1 && (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                    {partnerPeerCode.files.map((f,i) => (
                      <button key={f.name} onClick={()=>setPartnerViewActive(i)} style={{ ...styles.btn(partnerViewActive===i?"#22d3ee":"#3b2a58"), padding:"4px 10px", fontSize:11.5 }}>{f.name}</button>
                    ))}
                  </div>
                )}
                <VSEditor
                  value={partnerPeerCode.files[partnerViewActive]?.code ?? partnerPeerCode.files[0]?.code ?? ""}
                  onChange={()=>{}}
                  filename={partnerPeerCode.files[partnerViewActive]?.name ?? partnerPeerCode.files[0]?.name}
                  locked={true}
                  lockMessage="👀 Somente leitura — código de outro aluno"
                />
              </>
            )}
            <input value={partnerNote} onChange={e=>setPartnerNote(e.target.value)} maxLength={140} placeholder="O que você ajudou? (opcional, ex: 'faltava um ; na linha 5')"
              style={{ width:"100%", marginTop:12, background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"9px 12px", color:"#f0e9fb", fontSize:12.5, outline:"none" }} />
            <button onClick={resolvePartner} style={{ ...styles.btn("#34d399"), width:"100%", marginTop:10, padding:"9px 0", fontSize:13.5, fontWeight:800 }}>✅ Marcar como resolvido (+{PARTNER_REWARD_HELPER} pra você, +{PARTNER_REWARD_HELPED} pra ele(a))</button>
          </div>
        </div>
      )}
      {showNotebook && <NotebookModal history={summaryHistory} detailedHistory={detailedSummaryHistory} onClose={()=>setShowNotebook(false)} />}
      {showTrail && <LearningTrailModal history={summaryHistory} onClose={()=>setShowTrail(false)} />}
      {/* menu "🎮 Games" — junta num só lugar tudo que é jogo de verdade (contra o relógio ou
          contra colegas): Duelo, Duelo em Dupla, Corrida de digitação. */}
      {showGamesMenu && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1001, padding:16 }} onClick={()=>setShowGamesMenu(false)}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 20px", maxWidth:380, width:"100%", boxShadow:"0 24px 70px rgba(0,0,0,.55), 0 0 44px #c084fc22" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <h3 style={{ color:"#f0e9fb", margin:0, fontSize:19 }}>🎮 Games</h3>
              <button onClick={()=>setShowGamesMenu(false)} style={{ ...styles.btnGhost, padding:"4px 10px" }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {!nyxLocks.zeker && <button onClick={()=>{ setShowGamesMenu(false); setShowDuel(true); }} style={{ ...styles.btnGhost, textAlign:"left", display:"flex", alignItems:"center", gap:8, padding:"12px 14px", fontSize:14 }}>⚔️ Duelo</button>}
              {!nyxLocks.zeker && <button onClick={()=>{ setShowGamesMenu(false); setShowTeamDuel(true); }} title="Chame 1 parceiro pra jogar em dupla contra outros 2 colegas" style={{ ...styles.btnGhost, textAlign:"left", display:"flex", alignItems:"center", gap:8, padding:"12px 14px", fontSize:14 }}>🤝⚔️ Duelo em Dupla</button>}
              <button onClick={()=>{ setShowGamesMenu(false); setShowRace(true); }} title="Digite um trecho de código contra o relógio — pontos 1x por dia e pódio da turma" style={{ ...styles.btnGhost, textAlign:"left", display:"flex", alignItems:"center", gap:8, padding:"12px 14px", fontSize:14 }}>🏁 Corrida de digitação{typingBest ? ` · ${(typingBest.ms/1000).toFixed(1)}s` : ""}</button>
            </div>
          </div>
        </div>
      )}
      {showNextSteps && <NextStepsModal onClose={()=>setShowNextSteps(false)} />}
      {showVoicePicker && <VoicePickerModal onClose={()=>setShowVoicePicker(false)} />}
      {showColorPicker && <ColorPickerModal current={theme} onChoose={(t)=>{ handleNyxTheme(t); setShowColorPicker(false); }} onClose={()=>setShowColorPicker(false)} />}
      {showRace && <TypingRaceModal onClose={()=>setShowRace(false)} onFinish={finishTypingRace} />}
      {showKnowledgeTest && (
        <KnowledgeTestModal
          onAward={async (pts) => { const s=stateRef.current; const np=(s.nyxPoints||0)+pts; stateRef.current={...s,nyxPoints:np}; setNyxPoints(np); await persist({ nyxPoints: np }); checkPointsAchievements(np); unlockAchievement("autodidata"); }}
          onFirstToday={() => {
            const today = todayKey();
            const first = stateRef.current.knowledgeTestRewardDay !== today;
            if (first) { stateRef.current = { ...stateRef.current, knowledgeTestRewardDay: today }; setKnowledgeTestRewardDay(today); persist({ knowledgeTestRewardDay: today }); }
            return first;
          }}
          onClose={()=>setShowKnowledgeTest(false)}
        />
      )}
      {showKeyboard && (
        <Suspense fallback={
          <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1200 }}>
            <span style={{ color:"#a99ac9", fontSize:14 }}>🤔 Carregando o tutorial de teclado...</span>
          </div>
        }>
          <KeyboardTutorialModal onClose={()=>setShowKeyboard(false)} onFinish={finishKeyboardTutorial} speak={speak} stopSpeech={stopSpeech} accessMode={accessMode} onEggFound={triggerEgg} playSound={playSound} codeContext={activeCode} studyLang={studyLang} easyReview={kbReviewEasy} />
        </Suspense>
      )}
      {!checkinDismissed && phase==="coding" && !showJustify && !showNyxPrefs && !showIntro && tourStep < 0 && (
        <CheckinModal shift={shift} studentName={studentName} onDone={dismissCheckin} />
      )}
      {showJustify && <JustifyModal absences={pendingAbsences} onSubmit={submitJustification} onClose={()=>setShowJustify(false)} />}
      {showHallOfFame && <HallOfFameModal entries={hallEntries} onClose={()=>setShowHallOfFame(false)} />}
      {showPerformance && <PerformanceModal studentName={studentName} scoreHistory={scoreHistory} achievements={achievements} duelWins={duelWins} typingBest={typingBest} streakCount={streakCount} onClose={()=>setShowPerformance(false)} />}
      {showDuel && (
        <DuelModal
          shift={shift}
          myName={studentName}
          myAvatar={avatar}
          onAward={async (pts) => { const s=stateRef.current; const np=(s.nyxPoints||0)+pts; stateRef.current={...s,nyxPoints:np}; setNyxPoints(np); await persist({ nyxPoints: np }); checkPointsAchievements(np); }}
          onWin={async () => {
            const nw = (stateRef.current.duelWins||0) + 1;
            stateRef.current = { ...stateRef.current, duelWins: nw };
            setDuelWins(nw);
            await persist({ duelWins: nw });
            unlockAchievement("duelista");
            if (nw >= 3) unlockAchievement("duelista-3");
          }}
          onClose={()=>setShowDuel(false)}
        />
      )}
      {showTeamDuel && (
        <TeamDuelModal
          shift={shift}
          myName={studentName}
          myAvatar={avatar}
          onAward={async (pts) => { const s=stateRef.current; const np=(s.nyxPoints||0)+pts; stateRef.current={...s,nyxPoints:np}; setNyxPoints(np); await persist({ nyxPoints: np }); checkPointsAchievements(np); }}
          onWin={async () => {
            const nw = (stateRef.current.duelWins||0) + 1;
            stateRef.current = { ...stateRef.current, duelWins: nw };
            setDuelWins(nw);
            await persist({ duelWins: nw });
            unlockAchievement("duelista");
            if (nw >= 3) unlockAchievement("duelista-3");
            unlockAchievement("dupla-imbativel");
          }}
          onClose={()=>setShowTeamDuel(false)}
        />
      )}
      {showFreeBuild && (
        <FreeBuildModal
          weeklyChallenge={weeklyChallenge}
          language={studyLang}
          onSave={saveWeeklyChallenge}
          onToggleStep={toggleChallengeStep}
          onFinish={finishWeeklyChallenge}
          onClose={()=>setShowFreeBuild(false)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  PROFESSOR
// ════════════════════════════════════════════════════════════════════════════
function TeacherView({ onLogout, teacherAuth }) {
  // 📱 modo simples no celular: o painel completo foi feito pra tela grande (várias abas, tabelas
  // largas) — numa tela estreita entra sozinho uma lista direta de "como cada aluno está agora"
  // (ver MobileMonitorView). "🖥️ Modo completo"/"📱 Modo simples" sempre disponíveis pra trocar na mão.
  const vwTeacher = useViewportWidth();
  const isMobileScreen = vwTeacher < 720;
  const [forceFullMode, setForceFullMode] = useState(false);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showDupHover, setShowDupHover] = useState(false); // aviso de aluno duplicado — só aparece ao passar o mouse
  // gestão do aluno selecionado (renomear, mover de turno, corrigir nota, excluir)
  const [renameVal, setRenameVal] = useState("");
  const [scoreVal, setScoreVal] = useState("");
  const [struggleNotice, setStruggleNotice] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selAccessMode, setSelAccessMode] = useState(false);
  // perfis de apoio (educação inclusiva) do aluno selecionado + mapa geral pros tiles
  const [selSupport, setSelSupport] = useState({});
  const [supportMap, setSupportMap] = useState({});
  const [checkinMap, setCheckinMap] = useState({}); // 😊 check-in emocional do dia: "turno:nome" → { mood, at }
  useEffect(() => { setRenameVal(""); setScoreVal(""); setConfirmDelete(false); }, [selected]);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetScope, setResetScope] = useState("all");
  const [resetClearMyCode, setResetClearMyCode] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [diag, setDiag] = useState(null);
  // 🚨 erros de JS capturados sozinhos nas sessões dos alunos/professor (ver reportClientError em
  // storage.js e o listener global em App.jsx) — carrega só quando o card é aberto pela 1ª vez
  const [recentErrors, setRecentErrors] = useState(null);
  const [errorsLoading, setErrorsLoading] = useState(false);
  const loadRecentErrors = async () => { setErrorsLoading(true); setRecentErrors(await getRecentErrors(teacherAuth)); setErrorsLoading(false); };
  // 🔐 log das ações que exigiram a senha do professor (apagar, travar teclado, mudar
  // configuração de turma etc.) — dá visibilidade de quando a senha foi usada e pra quê
  const [adminLog, setAdminLog] = useState(null);
  const [adminLogLoading, setAdminLogLoading] = useState(false);
  const loadAdminLog = async () => { setAdminLogLoading(true); setAdminLog(await getAdminLog(teacherAuth)); setAdminLogLoading(false); };
  const [tab, setTab] = useState("monitor");
  // 🏫 turmas: pode ter mais de uma no mesmo turno (ex: duas de tarde) — cada turma é seu próprio
  // "turno" pra todo o resto do sistema (aluno, prova, código, monitoramento já funcionam com
  // qualquer id). Recarrega sozinho depois de criar/arquivar, pra refletir na hora sem precisar sair e voltar
  const [turmas, setTurmas] = useState(DEFAULT_TURMAS);
  const reloadTurmas = () => getTurmas().then(t => { if (Array.isArray(t) && t.length) setTurmas(t); });
  useEffect(() => { reloadTurmas(); }, []);
  const activeTurmas = turmas.filter(t => !t.archived);
  const [novaTurmaLabel, setNovaTurmaLabel] = useState("");
  const [novaTurmaPeriod, setNovaTurmaPeriod] = useState("vespertino");
  const [turmaMsg, setTurmaMsg] = useState("");
  const criarTurma = async () => {
    const label = novaTurmaLabel.trim();
    if (!label) return;
    const baseId = label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "turma";
    let id = baseId, n = 2;
    while (turmas.some(t => t.id === id)) { id = `${baseId}-${n}`; n++; }
    const color = TURMA_COLORS[turmas.length % TURMA_COLORS.length];
    const emoji = novaTurmaPeriod === "matutino" ? "☀️" : "🌙";
    const next = [...turmas, { id, label, emoji, period: novaTurmaPeriod, color, createdAt: Date.now(), archived: false }];
    const ok = await saveTurmas(next, teacherAuth);
    if (ok) { setTurmas(next); setNovaTurmaLabel(""); setTurmaMsg(`✅ Turma "${label}" criada!`); }
    else setTurmaMsg("⚠ Não consegui salvar a turma agora, tenta de novo.");
    setTimeout(() => setTurmaMsg(""), 4000);
  };
  const arquivarTurma = async (id, archived) => {
    const next = turmas.map(t => t.id === id ? { ...t, archived } : t);
    const ok = await saveTurmas(next, teacherAuth);
    if (ok) setTurmas(next);
  };
  const [meta, setMeta] = useState({ city:"", classDays:[], contentNames:{} });
  // horário automático de aula (por turno) + vistoria (libera um aluno específico fora do horário)
  const [schedule, setSchedule] = useState({});
  const [scheduleMsg, setScheduleMsg] = useState("");
  const [selInspection, setSelInspection] = useState(false);
  const [breakEndMsgTeacher, setBreakEndMsgTeacher] = useState("");
  const breakEndNotifiedTeacherRef = useRef({});
  const breakStartNotifiedTeacherRef = useRef({});
  const [cityInput, setCityInput] = useState("");
  // 🏆 hall da fama: encerra a cidade atual e guarda uma placa com quem se destacou
  const [hallMsg, setHallMsg] = useState("");
  const [confirmCloseCity, setConfirmCloseCity] = useState(false);
  const [farewellBusy, setFarewellBusy] = useState(false);
  // 💾 backup AUTOMÁTICO agendado (roda sozinho todo dia via Vercel Cron, fica guardado no próprio
  // banco) — diferente do botão "Baixar backup completo" mais abaixo, que baixa um arquivo pro seu
  // computador na hora; aqui só mostra o status do agendado e permite forçar um na hora também
  const [autoBackupList, setAutoBackupList] = useState(null);
  const [autoBackupBusy, setAutoBackupBusy] = useState(false);
  const [autoBackupMsg, setAutoBackupMsg] = useState("");
  const [showTripOverview, setShowTripOverview] = useState(false);
  const [tripHallEntries, setTripHallEntries] = useState([]);
  const [shiftFilter, setShiftFilter] = useState("all");
  // tour guiado do painel do professor — só começa se o professor clicar em "🧭 Tour" (não some sozinho)
  const [profTourStep, setProfTourStep] = useState(-1);
  // grade de alunos do Monitoramento só aparece com o mouse em cima — menos poluído de cara, mas
  // não esconde nada crítico: ajuda/erro continuam avisados via "Nyx de olho" e "👀 Situação"
  const [monitorHover, setMonitorHover] = useState(false);
  const [genName, setGenName] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
  // 📚 ritmo do resumo: em vez do professor escolher dia a dia "gerar resumo de hoje/ontem", ele
  // define um ritmo (ex: a cada 2 aulas de código, 1 de resumo) e clica um botão só na aba "Meu
  // código" quando quiser liberar — a plataforma já calcula sozinha se hoje é dia de código ou de
  // resumo, e o resumo aparece pra QUALQUER aluno conectado (na hora ou mais tarde no mesmo dia)
  const [resumoTriggerBusy, setResumoTriggerBusy] = useState(false);
  const [resumoTriggerMsg, setResumoTriggerMsg] = useState("");
  const [resumoTriggeredToday, setResumoTriggeredToday] = useState({});
  const [autoNameMsg, setAutoNameMsg] = useState("");
  const autoNameTriedRef = useRef({});
  // 🏆 fila de revelações de ranking pendentes (uma por turma que terminou a atividade hoje) —
  // mostra uma de cada vez; o badge 🏆 individual no tile continua existindo do mesmo jeito
  const [rankingRevealQueue, setRankingRevealQueue] = useState([]);
  const rankingRevealTriedRef = useRef({});
  // ✋ notificação de pedido de ajuda (toast, igual ao "Reconectando Nyx")
  const [helpNotice, setHelpNotice] = useState("");
  const helpSeenRef = useRef({});
  const helpInitRef = useRef(false);
  // ⚠️ notificação de erro em produção na tela de um aluno (mesmo padrão do pedido de ajuda)
  const [errorNotice, setErrorNotice] = useState("");
  const errorSeenRef = useRef({});
  const errorInitRef = useRef(false);
  const [nudged, setNudged] = useState({});
  // 🔒 teclado travado por turma: professor clica e o editor de código congela pra todo mundo
  // daquela turma (ex: pedir atenção durante uma explicação) — cada turma trava/libera à parte
  const [keyboardLocks, setKeyboardLocks] = useState({});
  useEffect(() => {
    let active = true;
    const load = async () => {
      const entries = await Promise.all(activeTurmas.map(async t => [t.id, await getKeyboardLock(t.id)]));
      if (active) setKeyboardLocks(Object.fromEntries(entries));
    };
    load();
    const iv = setInterval(load, 8000);
    return () => { active = false; clearInterval(iv); };
  }, [activeTurmas]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleKeyboardLock = async (turmaId) => {
    const next = !keyboardLocks[turmaId];
    setKeyboardLocks(prev => ({ ...prev, [turmaId]: next }));
    await setKeyboardLock(turmaId, next, teacherAuth);
  };
  const metaRef = useRef({ city:"", classDays:[], contentNames:{} });
  // código do professor (aba "Meu código") — um exemplo independente por turno
  const [proFilesByShift, setProFilesByShift] = useState({
    matutino: [{ name:"Program.cs", code:"" }],
    vespertino: [{ name:"Program.cs", code:"" }],
  });
  const [proLoaded, setProLoaded] = useState(false);
  const [codeShift, setCodeShift] = useState("matutino"); // turno em edição/visualização (Meu código + Calendário)
  const proFiles = proFilesByShift[codeShift] || [{ name:"Program.cs", code:"" }];
  const setProFiles = (updater) => setProFilesByShift(prev => ({
    ...prev,
    [codeShift]: typeof updater === "function" ? updater(prev[codeShift] || [{ name:"Program.cs", code:"" }]) : updater,
  }));
  // prova
  const [examConfig, setExamConfig] = useState({ status: 'idle' });
  const [examGenerating, setExamGenerating] = useState(false);
  const [examMsg, setExamMsg] = useState("");
  // relógio pra contar o tempo de estudo restante na fase de revisão da prova
  const [examNow, setExamNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setExamNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  // cada turno tem sua própria prova independente (ver storage.js) — reaproveita o mesmo filtro de
  // turma (shiftFilter) que já existe pra Monitoramento/Calendário/Feedback, em vez de criar outro
  // seletor: trocar o filtro busca na hora o estado da prova DAQUELE turno, sem esperar o próximo
  // ciclo do polling normal (8s)
  const shiftFilterRef = useRef(shiftFilter);
  useEffect(() => { shiftFilterRef.current = shiftFilter; }, [shiftFilter]);
  useEffect(() => {
    let alive = true;
    (async () => { try { const ec = await getExamState(shiftFilter, teacherAuth); if (alive) setExamConfig(ec); } catch {} })();
    return () => { alive = false; };
  }, [shiftFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirmEndExam, setConfirmEndExam] = useState(false);
  // 🎉 quiz estilo Kahoot: temas salvos + sala ativa (o professor é o único que escreve; os alunos
  // respondem no próprio perfil e o placar é apurado aqui a partir do polling da turma)
  const [quizThemes, setQuizThemes] = useState([]);
  const [quizRoom, setQuizRoomState] = useState(null);
  const [quizNow, setQuizNow] = useState(() => Date.now());
  const [quizNewTitle, setQuizNewTitle] = useState("");
  const [quizSecs, setQuizSecs] = useState(QUIZ_QUESTION_SECONDS); // tempo por pergunta escolhido pra próxima sala
  const [quizEditingTheme, setQuizEditingTheme] = useState(null); // { id?, title, questions } em edição
  const [quizQDraft, setQuizQDraft] = useState({ q:"", opts:["","","",""], correct:0, hard:false });
  useEffect(() => { getQuizThemes().then(ts => setQuizThemes(Array.isArray(ts) ? ts : [])); }, []);
  // cada turma tem sua própria sala de quiz — troca de turma (codeShift) retoma a sala DAQUELA
  // turma, se tiver uma aberta, com o gabarito completo (é o professor)
  useEffect(() => { getQuizRoom(codeShift, teacherAuth).then(setQuizRoomState); }, [codeShift]);
  useEffect(() => {
    if (!quizRoom || quizRoom.status !== "question") return;
    const iv = setInterval(() => setQuizNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [quizRoom?.status, quizRoom?.qIndex]);
  const quizWrite = async (state) => { setQuizRoomState(state); await setQuizRoom(codeShift, state, teacherAuth); };
  const startQuizRoom = async (theme) => {
    await quizWrite({ code: makeQuizCode(), themeTitle: theme.title, questions: theme.questions, secs: quizSecs, status: "lobby", qIndex: 0, startedAts: {}, createdAt: Date.now() });
    setTab("quiz");
  };
  const quizNextQuestion = async () => {
    const next = quizRoom.status === "lobby" ? 0 : quizRoom.qIndex + 1;
    if (next >= quizRoom.questions.length) { await quizWrite({ ...quizRoom, status: "podium" }); return; }
    await quizWrite({ ...quizRoom, status: "question", qIndex: next, startedAts: { ...quizRoom.startedAts, [next]: Date.now() } });
  };
  const quizReveal = async () => { await quizWrite({ ...quizRoom, status: "reveal" }); };
  const quizEnd = async () => { setQuizRoomState(null); await clearQuizRoom(codeShift, teacherAuth); };
  // encerra a pergunta sozinho quando o tempo acabar (o professor também pode encerrar antes no botão)
  useEffect(() => {
    if (!quizRoom || quizRoom.status !== "question") return;
    const startedAt = quizRoom.startedAts[quizRoom.qIndex];
    if (startedAt != null && quizNow >= startedAt + quizSecsOf(quizRoom) * 1000) quizReveal();
  }, [quizNow]);
  const saveQuizTheme = async () => {
    const t = quizEditingTheme;
    if (!t || !t.title.trim() || !t.questions.length) return;
    const next = t.id
      ? quizThemes.map(x => x.id === t.id ? { ...t } : x)
      : [...quizThemes, { ...t, id: `t${Date.now()}` }];
    setQuizThemes(next);
    setQuizEditingTheme(null);
    await saveQuizThemes(next, teacherAuth);
  };
  const deleteQuizTheme = async (id) => {
    const next = quizThemes.filter(t => t.id !== id);
    setQuizThemes(next);
    await saveQuizThemes(next, teacherAuth);
  };
  const [dbSetupMsg, setDbSetupMsg] = useState("");
  const [dbSetupLoading, setDbSetupLoading] = useState(false);
  const [dbSetupSQL, setDbSetupSQL] = useState(null); // { sql, sqlEditorUrl }
  // análise do Nyx (período + prova)
  const [examAnalysis, setExamAnalysis] = useState("");
  const [analyzingExam, setAnalyzingExam] = useState(false);
  // 🔍 analisar o código de toda a turma de uma vez (em vez de cada aluno precisar clicar) — pensado
  // pra economizar chamadas ao Nyx: o professor decide quando vale a pena checar todo mundo
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchAnalyzeMsg, setBatchAnalyzeMsg] = useState("");
  // saúde do Nyx: reflete a última chamada de IA de QUALQUER aluno/professor — se foi erro, mostra "Reconectando"
  const [aiDown, setAiDown] = useState(false);
  // telão da turma: tela cheia só de visualização, pra projetar (ranking, meta, combos)
  const [showTelao, setShowTelao] = useState(false);
  const [showQuickStatus, setShowQuickStatus] = useState(false);
  // PDF com o código e o resumo de cada aluno (pra guardar/enviar ao fim do curso)
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfMsg, setPdfMsg] = useState("");
  const [pdfScope, setPdfScope] = useState("all"); // "all" | "matutino" | "vespertino" — qual turno vai no PDF de códigos
  // 📄 PDF do dia: resumo curto do código de HOJE pra mandar pra um aluno específico (ex: quem vai
  // faltar) — o professor confirma/edita o código antes de gerar, pra não depender de "Meu código"
  // estar necessariamente atualizado com o que foi passado hoje
  const [dailyPdfBusy, setDailyPdfBusy] = useState(false);
  const [dailyPdfMsg, setDailyPdfMsg] = useState("");
  // 💌 boletim pros responsáveis (PDF com uma página por aluno do turno)
  const [boletimBusy, setBoletimBusy] = useState(false);
  const [boletimMsg, setBoletimMsg] = useState("");
  const [boletimScope, setBoletimScope] = useState("all"); // "all" | "matutino" | "vespertino" — pra quem vai o boletim em lote
  const [dailyPdfModal, setDailyPdfModal] = useState(null); // { shift, studentName } | null
  const [dailyPdfCode, setDailyPdfCode] = useState("");
  // biblioteca de aulas (as SUAS aulas salvas + modelos de exemplo) + backup completo
  const [showLessons, setShowLessons] = useState(false);
  const [myLessons, setMyLessons] = useState([]);
  // espelha myLessons pra sempre ler a versão MAIS RECENTE dentro de generateLessonContent/
  // importLessonContent — geração de conteúdo pronto demora vários segundos (chamadas ao Nyx em
  // paralelo); sem isso, excluir ou salvar outra aula ENQUANTO a geração está rodando fazia o
  // merge final trabalhar em cima do array antigo (fechado no closure), ressuscitando uma aula já
  // excluída ou perdendo uma aula nova salva nesse meio tempo
  const myLessonsRef = useRef([]);
  useEffect(() => { myLessonsRef.current = myLessons; }, [myLessons]);
  const [lessonName, setLessonName] = useState("");
  const [showModels, setShowModels] = useState(false);
  // 🧠 conteúdo pronto por aula salva (nome + explicação + resumo + atividade), gerado 1x pelo
  // professor e reaproveitado depois sempre que o MESMO código dessa aula estiver em uso — em vez
  // de pedir tudo de novo pro Nyx toda vez (ver findMatchingLesson, usado em computeContentName e
  // no handleSave do aluno)
  const [lessonGenBusy, setLessonGenBusy] = useState(null);
  // 📥 importar conteúdo já pronto (de um PDF/material antigo, por exemplo) sem chamar o Nyx nenhuma vez
  const [showImportLesson, setShowImportLesson] = useState(null);
  const [importText, setImportText] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);

  const load = useCallback(async () => {
    const arr = await listStudents(teacherAuth);
    setStudents(arr);
    setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
    try { const ec = await getExamState(shiftFilterRef.current, teacherAuth); setExamConfig(ec); } catch {}
    // marca o dia de hoje como aula (NA TURMA de cada aluno) se ele foi visto ONLINE hoje (não só
    // se a turma tem algum aluno cadastrado — isso ficava true pra sempre depois do primeiro aluno
    // criado, e marcava "teve aula" mesmo em dias sem ninguém online, além de desfazer sozinho em
    // até 10s quando o professor removia manualmente o dia pelo calendário). Não conta fim de
    // semana como aula por padrão (só se o professor liberar em allowWeekend). Cada turma tem seu
    // próprio calendário — a cidade "encerrada" de UMA turma não pausa a contagem das outras
    const dowNow = new Date().getDay();
    const isWeekendNow = dowNow === 0 || dowNow === 6;
    const turmasOnlineToday = [...new Set(arr.filter(s => isSameDayTs(s.lastSeen)).map(s => s.shift || "sem-turno"))];
    if (turmasOnlineToday.length && (!isWeekendNow || metaRef.current.allowWeekend)) {
      const tk = todayKey();
      let nm = metaRef.current;
      let changed = false;
      for (const turmaId of turmasOnlineToday) {
        const cal = turmaCalendar(nm, turmaId);
        if (cal.cityClosed || cal.classDays.includes(tk)) continue;
        nm = withTurmaCalendar(nm, turmaId, { classDays: [...cal.classDays, tk] });
        changed = true;
      }
      if (changed) { metaRef.current = nm; setMeta(nm); saveTeacherMeta(nm, teacherAuth); }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => { if (active) await load(); };
    run();
    const iv = setInterval(run, 10000);
    return () => { active = false; clearInterval(iv); };
  }, [load]);

  useEffect(() => { diagnose().then(setDiag); }, []);

  // 🍎 intervalo: status de cada turno (recalcula a cada carregamento da turma, ~2s) + sininho no fim
  const shiftBreakStatuses = activeTurmas.map(sh => ({ ...sh, status: classStatus(schedule[sh.id] || {}, meta.allowWeekend) }));
  useEffect(() => {
    shiftBreakStatuses.forEach(({ id, label, status }) => {
      const sc = schedule[id] || {};
      if (!sc.breakStart || !sc.breakMin) return;
      const bKey = `${todayKey()}-${id}-${sc.breakStart}-${sc.breakMin}`;
      const bStartMin = hmToMin(sc.breakStart);
      if (bStartMin == null) return;
      if (!status.inBreak && status.configured && nowMin() >= bStartMin + Number(sc.breakMin) && breakEndNotifiedTeacherRef.current[bKey] !== true) {
        breakEndNotifiedTeacherRef.current[bKey] = true;
        playSound("bell");
        setBreakEndMsgTeacher(`🔔 Intervalo da turma ${label} acabou!`);
        setTimeout(() => setBreakEndMsgTeacher(""), 8000);
      }
      if (status.inBreak && breakStartNotifiedTeacherRef.current[bKey] !== true) {
        breakStartNotifiedTeacherRef.current[bKey] = true;
        playSound("recesso");
      }
    });
  }, [shiftBreakStatuses.map(s => s.status.inBreak).join(","), schedule]);
  // mapa de perfis de apoio (indicador 💙 nos tiles) — atualiza de vez em quando, não precisa ser ao vivo
  useEffect(() => {
    let active = true;
    const loadSupport = async () => { const m = await listAllSupport(teacherAuth); if (active) setSupportMap(m); };
    loadSupport();
    const iv = setInterval(loadSupport, 20000);
    return () => { active = false; clearInterval(iv); };
  }, [teacherAuth]);
  // 😊 mapa de check-in emocional do dia (indicador nos tiles) — mesma cadência do apoio, não precisa ser ao vivo
  useEffect(() => {
    let active = true;
    const loadCheckin = async () => { const m = await listCheckinsForDate(todayKey(), teacherAuth); if (active) setCheckinMap(m); };
    loadCheckin();
    const iv = setInterval(loadCheckin, 20000);
    return () => { active = false; clearInterval(iv); };
  }, [teacherAuth]);
  // ✨ nome do conteúdo automático: quando TODOS os alunos de um turno (que apareceram hoje) já
  // passaram da fase de codar (estão no resumo, na atividade ou concluíram), gera o nome sozinho —
  // sem o professor precisar lembrar de clicar. Só tenta 1x por turno por dia.
  useEffect(() => {
    const tk = todayKey();
    activeTurmas.forEach(sh => {
      const key = `${tk}-${sh.id}`;
      if (autoNameTriedRef.current[key]) return;
      if (contentNameFor((meta.contentNames||{})[tk], sh.id)) { autoNameTriedRef.current[key] = true; return; }
      const todayList = students.filter(s => (s.shift||"sem-turno")===sh.id && (s.shift||"")!==TEST_SHIFT.id && isSameDayTs(s.lastSeen));
      if (todayList.length === 0) return;
      const allPastCoding = todayList.every(s => ["summary","activity","done"].includes(s.phase));
      if (!allPastCoding) return;
      autoNameTriedRef.current[key] = true;
      computeContentName(sh.id)
        .then(({ title }) => { setAutoNameMsg(`✨ Nome do conteúdo gerado sozinho (${shiftMeta(sh.id, turmas).label}): ${title}`); setTimeout(()=>setAutoNameMsg(""), 8000); })
        .catch(() => {}); // sem exemplo do professor nem código de aluno ainda — tenta de novo quando alguém escrever
    });
  }, [students, meta.contentNames]);
  // 🏆 quando TODOS os alunos presentes numa turma hoje terminam a atividade (mesma condição do
  // badge 🏆 por tile: nota preenchida no MESMO dia), enfileira uma revelação de ranking pra essa
  // turma — só 1x por turma por dia, igual ao nome automático do conteúdo acima
  useEffect(() => {
    const tk = todayKey();
    activeTurmas.forEach(sh => {
      const key = `${tk}-${sh.id}`;
      if (rankingRevealTriedRef.current[key]) return;
      const todayList = students.filter(s => (s.shift||"sem-turno")===sh.id && (s.shift||"")!==TEST_SHIFT.id && isSameDayTs(s.lastSeen));
      // "ranking" só faz sentido com mais de 1 aluno — com só 1 presente, o badge 🏆 individual do
      // tile já mostra a nota dele, sem precisar de uma revelação (evita um "ranking de 1 pessoa só")
      if (todayList.length < 2) return;
      const allDone = todayList.every(s => s.score != null && isSameDayTs(s.doneAt));
      if (!allDone) return;
      rankingRevealTriedRef.current[key] = true;
      const entries = todayList.map(s => ({ name: s.name, avatar: s.avatar, score: s.score }));
      setRankingRevealQueue(q => [...q, { turmaId: sh.id, turmaLabel: shiftMeta(sh.id, turmas).label, entries }]);
    });
  }, [students, activeTurmas, turmas]);
  // ✋ toast de pedido de ajuda: dispara na hora que um aluno clica, mesmo se o professor não
  // estiver olhando o Monitoramento — não avisa pedidos que já estavam pendentes ao abrir o painel
  useEffect(() => {
    students.filter(s => (s.shift||"") !== TEST_SHIFT.id).forEach(s => {
      const k = `${s.shift||"sem-turno"}:${s.name}`;
      const prevSeen = helpSeenRef.current[k];
      if (s.helpAt && s.helpAt !== prevSeen) {
        helpSeenRef.current[k] = s.helpAt;
        if (helpInitRef.current && Date.now() - s.helpAt < 20000) {
          playSound("enter");
          setHelpNotice(`✋ ${s.name} pediu ajuda!`);
          setTimeout(() => setHelpNotice(""), 8000);
        }
      } else if (!s.helpAt && prevSeen) {
        helpSeenRef.current[k] = null;
      }
    });
    helpInitRef.current = true;
  }, [students]);
  // ⚠️ toast de erro em produção: mesma lógica do pedido de ajuda, mas pra quando a tela de um
  // aluno quebra sozinha (erro de JS) — o professor fica sabendo sem o aluno precisar reclamar
  useEffect(() => {
    students.filter(s => (s.shift||"") !== TEST_SHIFT.id).forEach(s => {
      const k = `${s.shift||"sem-turno"}:${s.name}`;
      const prevSeen = errorSeenRef.current[k];
      if (s.errorAt && s.errorAt !== prevSeen) {
        errorSeenRef.current[k] = s.errorAt;
        if (errorInitRef.current && Date.now() - s.errorAt < 20000) {
          playSound("wrong");
          setErrorNotice(`⚠️ A tela de ${s.name} deu um erro (${s.errorMsg || "sem detalhes"})`);
          setTimeout(() => setErrorNotice(""), 10000);
        }
      } else if (!s.errorAt && prevSeen) {
        errorSeenRef.current[k] = null;
      }
    });
    errorInitRef.current = true;
  }, [students]);
  // fica de olho na saúde do Nyx: se a última chamada de IA registrada (de qualquer aluno/professor)
  // foi erro e é recente, mostra "Reconectando Nyx"; some assim que uma chamada der certo de novo
  useEffect(() => {
    let active = true;
    const check = async () => {
      const h = await getAiHealth();
      if (!active) return;
      // só acende "Reconectando Nyx" pra sala inteira depois de 2 falhas SEGUIDAS (ver
      // reportAiHealth em storage.js) — uma falha isolada não é motivo pra alarmar todo mundo
      setAiDown(!!h && h.ok === false && (h.streak || 1) >= 2 && Date.now() - h.at < 5 * 60 * 1000);
    };
    check();
    const iv = setInterval(check, 10000);
    return () => { active = false; clearInterval(iv); };
  }, []);
  // 🩺 saúde de CADA modelo separado (Nemotron/Laguna) — pontinho no cabeçalho, pra o professor ver
  // de longe se algum dos dois está fora do ar antes de a turma toda esbarrar nisso
  const [providerHealth, setProviderHealth] = useState({ nvidia:null, laguna:null });
  useEffect(() => {
    let active = true;
    const check = async () => {
      const [nvidia, laguna] = await Promise.all([getAiHealthByProvider("nvidia"), getAiHealthByProvider("laguna")]);
      if (active) setProviderHealth({ nvidia, laguna });
    };
    check();
    const iv = setInterval(check, 10000);
    return () => { active = false; clearInterval(iv); };
  }, []);
  // 🤝 parceiros de código ativos (dos dois turnos) — pra saber quem já está pareado e não sugerir de novo
  const [partners, setPartners] = useState([]);
  useEffect(() => {
    let active = true;
    const load2 = async () => {
      const lists = await Promise.all(activeTurmas.map(sh => listPartners(sh.id)));
      if (active) setPartners(lists.flat());
    };
    load2();
    const iv = setInterval(load2, 10000);
    return () => { active = false; clearInterval(iv); };
  }, []);
  useEffect(() => { getTeacherMeta().then(m => { metaRef.current = m; setMeta(m); setCityInput(turmaCalendar(m, codeShift).city); setSchedule(m.schedule||{}); }); }, []);
  // troca de turma no Calendário (codeShift): o campo de cidade precisa mostrar a cidade DAQUELA
  // turma, não a que estava escrita antes de trocar de aba — cada turma tem a sua própria
  useEffect(() => { setCityInput(turmaCalendar(meta, codeShift).city); }, [codeShift]);
  // carrega o código salvo do professor uma vez, para cada turno
  useEffect(() => {
    (async () => {
      const results = await Promise.all(turmas.map(t => getTeacherCode(t.id)));
      // tira \r de código salvo ANTES da correção (colado do Windows/Visual Studio) — ver VSEditor
      const clean = (files) => files.map(f => ({ ...f, code: String(f.code||"").replace(/\r/g, "") }));
      setProFilesByShift(prev => {
        const next = { ...prev };
        turmas.forEach((t, i) => {
          const r = results[i];
          if (r && Array.isArray(r.files) && r.files.length) next[t.id] = clean(r.files);
          else if (!next[t.id]) next[t.id] = [{ name:"Program.cs", code:"" }];
        });
        return next;
      });
      setProLoaded(true);
    })();
  }, [turmas]);
  // salva o código do professor de cada turma (sem pressa) sempre que ele mexe
  useEffect(() => {
    if (!proLoaded) return;
    const id = setTimeout(() => {
      turmas.forEach(t => saveTeacherCode(proFilesByShift[t.id] || [{ name:"Program.cs", code:"" }], t.id, teacherAuth));
    }, 1000);
    return () => clearTimeout(id);
  }, [proFilesByShift, proLoaded, turmas]);

  // definir a cidade aqui é o que "reativa" a viagem depois de uma cidade encerrada — só a partir
  // daqui volta a contar dia de aula e a mostrar o pino "você está aqui" na Visão da Viagem. Cada
  // turma tem sua própria cidade/jornada — vale pra turma selecionada no momento (codeShift)
  const saveCity = async () => { const nm = withTurmaCalendar(metaRef.current, codeShift, { city:cityInput.trim(), cityClosed:false }); metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm, teacherAuth); };
  // personalização do Nyx do professor (acessórios cosméticos, sem custo — é só o professor mesmo)
  const saveTeacherGear = async (newGear) => { const nm = { ...metaRef.current, nyxGear:newGear }; metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm, teacherAuth); };
  // 📄 relatório de despedida: um PDF-lembrança da cidade que está sendo encerrada, com o
  // retrato da turma inteira (pódio, conquistas, médias) e uma mensagem de despedida do Nyx
  const generateFarewellPDF = async ({ city, active, podio, totalClasses, avgScore, periodStart, periodEnd }) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    const maxW = pageW - margin * 2;
    let y = margin;
    const hexRgb = (hex) => {
      const h = hex.replace("#", "");
      const n = parseInt(h.length === 3 ? h.split("").map(c=>c+c).join("") : h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const clean = (t) => String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️]/gu, "").replace(/\s+/g, " ").trim();
    const ensureSpace = (needed) => { if (y + needed > pageH - margin - 16) { doc.addPage(); y = margin; } };
    const writeParagraph = (text, opts = {}) => {
      const { size = 10.5, font = "helvetica", style = "normal", color = "#2a2f45", lineGap = 4.5, x = margin, width = maxW, align = "left" } = opts;
      doc.setFont(font, style); doc.setFontSize(size); doc.setTextColor(...hexRgb(color));
      doc.splitTextToSize(String(text || " "), width).forEach(line => {
        ensureSpace(size + lineGap);
        doc.text(line, align === "center" ? x + width / 2 : x, y, align === "center" ? { align: "center" } : undefined);
        y += size + lineGap;
      });
    };
    const statBox = (x, w, label, value, accent) => {
      doc.setFillColor(...hexRgb("#f2f4fc")); doc.setDrawColor(...hexRgb(accent));
      doc.roundedRect(x, y, w, 60, 7, 7, "FD");
      doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(...hexRgb(accent));
      doc.text(String(value), x + w/2, y + 30, { align:"center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...hexRgb("#5b6084"));
      doc.text(clean(label), x + w/2, y + 46, { align:"center" });
    };

    // ── CAPA ──
    doc.setFillColor(...hexRgb("#1d1230")); doc.rect(0, 0, pageW, pageH, "F");
    doc.setFillColor(...hexRgb("#2a1a42"));
    doc.circle(pageW - 60, 90, 130, "F");
    doc.circle(40, pageH - 80, 100, "F");
    doc.setFillColor(...hexRgb("#fbbf24")); doc.roundedRect(margin, 210, 64, 7, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.setTextColor(255, 255, 255);
    doc.text("Relatório de Despedida", margin, 262);
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...hexRgb("#fbbf24"));
    doc.text(clean(city), margin, 292);
    doc.setFont("helvetica", "normal"); doc.setFontSize(13); doc.setTextColor(...hexRgb("#c4b2e2"));
    doc.text(clean(`Aula de C#  •  ${periodStart} a ${periodEnd}`), margin, 316);
    doc.setFont("courier", "normal"); doc.setFontSize(10); doc.setTextColor(...hexRgb("#5e4a86"));
    doc.text('Console.WriteLine("Foi uma honra ensinar aqui!");', margin, pageH - 70);

    // ── NÚMEROS DA TURMA ──
    doc.addPage(); y = margin;
    doc.setFillColor(...hexRgb("#fbbf24")); doc.roundedRect(margin, y - 6, maxW, 40, 8, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255,255,255);
    doc.text("A TURMA EM NÚMEROS", margin + 16, y + 19);
    y += 58;
    const boxW = (maxW - 16) / 3;
    statBox(margin, boxW, "alunos atendidos", active.length, "#c084fc");
    statBox(margin + boxW + 8, boxW, "aulas dadas", totalClasses, "#34d399");
    statBox(margin + (boxW + 8) * 2, boxW, "nota média da turma", avgScore || "-", "#fbbf24");
    y += 84;

    // ── PÓDIO ──
    writeParagraph("Quem mais se destacou", { size: 14, style: "bold", color: "#1f2547" });
    y += 4;
    if (podio.length) {
      const medals = ["1º lugar", "2º lugar", "3º lugar"];
      podio.forEach((p, i) => {
        ensureSpace(34);
        doc.setFillColor(...hexRgb(i===0?"#fbbf24":i===1?"#c7cbe8":"#d99a5b"));
        doc.roundedRect(margin, y - 12, 26, 26, 6, 6, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
        doc.text(String(i+1), margin + 13, y + 4, { align:"center" });
        writeParagraph(`${clean(p.name)} — ${clean(p.highlight)}`, { size: 11, x: margin + 34, width: maxW - 34 });
      });
    } else {
      writeParagraph("Nenhum destaque com nota ou pontos registrados nesta cidade.", { size: 10.5, style:"italic", color:"#8a8fa8" });
    }
    y += 14;

    // ── CONQUISTAS DA TURMA ──
    writeParagraph("Conquistas da turma", { size: 14, style: "bold", color: "#1f2547" });
    y += 2;
    const totalAch = active.reduce((sum,s) => sum + (s.achievements||[]).length, 0);
    const allEggsFinders = active.filter(s => (s.achievements||[]).includes("todos-segredos")).length;
    writeParagraph(clean(`No total, a turma desbloqueou ${totalAch} conquistas. ${allEggsFinders > 0 ? `${allEggsFinders} aluno(s) encontraram TODOS os segredos escondidos do Nyx! 🏆` : ""}`), { size: 10.5 });
    y += 10;

    // ── MENSAGEM DE DESPEDIDA ──
    ensureSpace(90);
    doc.setFillColor(...hexRgb("#fff7e0")); doc.setDrawColor(...hexRgb("#f0d896"));
    const farewellText = clean(`Foi uma honra fazer parte da jornada de vocês em ${city}! Cada linha de código escrita, cada erro corrigido e cada conquista desbloqueada mostra o quanto essa turma cresceu. Continuem curiosos, continuem programando — o Nyx torce por vocês, onde quer que a carreta vá agora. Até a próxima!`);
    const flLines = doc.splitTextToSize(farewellText, maxW - 24);
    const fh = flLines.length * 14 + 20;
    doc.roundedRect(margin, y - 4, maxW, fh, 8, 8, "FD");
    doc.setFont("helvetica", "italic"); doc.setFontSize(10.5); doc.setTextColor(...hexRgb("#8a6d1a"));
    flLines.forEach((ln, j) => doc.text(ln, margin + 12, y + 14 + j * 14));
    y += fh + 10;

    // ── rodapé (pula a capa) ──
    const total = doc.getNumberOfPages();
    for (let p = 2; p <= total; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...hexRgb("#9aa1c2"));
      doc.text("Aula de C#  •  relatório de despedida", margin, pageH - 24);
      doc.text(`${p - 1} / ${total - 1}`, pageW - margin, pageH - 24, { align: "right" });
    }
    doc.save(`despedida-${(city||"cidade").toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${todayKey()}.pdf`);
  };

  // 🏆 encerra a cidade atual: guarda uma placa no Hall da Fama com quem mais se destacou, pra
  // os alunos da PRÓXIMA cidade verem — não apaga nem reseta nada, é só um retrato do fechamento,
  // e também gera um PDF de despedida pro professor guardar/imprimir
  const doCloseCity = async () => {
    setConfirmCloseCity(false);
    // encerra a cidade da turma SELECIONADA no momento (codeShift) — cada turma tem sua própria
    // jornada, então isso nunca mexe na cidade/calendário de outra turma
    const cal = turmaCalendar(meta, codeShift);
    if (!cal.city) { setHallMsg("❌ Defina o nome da cidade antes de encerrar."); setTimeout(()=>setHallMsg(""), 5000); return; }
    const active = students.filter(s => (s.shift||"sem-turno") === codeShift);
    // 🏆 mérito acadêmico, não só quem tirou o pico de nota uma vez: constância nas atividades
    // (média do histórico, não o maior valor isolado) + nota da prova + poucos erros de código —
    // pontos do Nyx viram só o desempate final, nunca o critério principal
    const meritOf = (s) => {
      const notas = [...Object.values(s.scoreHistory||{}), s.score].filter(n => typeof n === "number");
      const avgScore = notas.length ? notas.reduce((a,b)=>a+b,0) / notas.length : 0;
      const examScore = typeof s.examScore === "number" ? s.examScore : 0;
      const totalErrors = Object.values(s.errorHistory||{}).reduce((a,b)=>a+(typeof b==="number"?b:0), 0);
      // cada erro registrado custa 10 pontos do "índice de poucos erros" (piso em 0) — quem nunca
      // errou fica com 100 aqui, quem errou 10+ vezes ao longo da turma zera essa parte da fórmula
      const errorScore = Math.max(0, 100 - totalErrors * 10);
      const merit = avgScore * 0.5 + examScore * 0.3 + errorScore * 0.2;
      return { avgScore, examScore, totalErrors, merit };
    };
    const podio = active
      .map(s => { const m = meritOf(s); return { name: s.name, merit: Math.round(m.merit), avgScore: Math.round(m.avgScore), examScore: m.examScore, totalErrors: m.totalErrors, pts: s.nyxPoints||0 }; })
      .filter(s => s.merit > 0 || s.pts > 0)
      .sort((a,b) => (b.merit - a.merit) || (b.pts - a.pts))
      .slice(0, 3)
      .map(s => ({ name: s.name, highlight: s.merit > 0 ? `média ${s.avgScore}${s.examScore ? ` · prova ${s.examScore}` : ""} · ${s.totalErrors === 0 ? "sem erros de código" : `${s.totalErrors} erro(s) de código`} · ${s.pts} pts do Nyx` : `${s.pts} pts do Nyx` }));
    // estatísticas da cidade inteira, pra "Visão da Viagem" (agregado de todas as cidades encerradas DESTA turma)
    const meritosValidos = active.map(s => meritOf(s).merit).filter(n => n > 0);
    const avgScore = meritosValidos.length ? Math.round(meritosValidos.reduce((a,b)=>a+b,0) / meritosValidos.length) : 0;
    const entries = await getHallOfFame(codeShift);
    // cal.classDays é uma lista que só CRESCE desde sempre (nunca reseta de cidade pra cidade) —
    // "aulas dadas NESTA cidade" precisa ser a diferença desde a última cidade encerrada, senão toda
    // cidade nova soma o histórico inteiro da viagem e o total infla sem parar
    const cumulativeClassDays = cal.classDays.length;
    const previousCumulative = entries.length ? (entries[entries.length-1].classDaysSnapshot || 0) : 0;
    const totalClasses = Math.max(0, cumulativeClassDays - previousCumulative);
    const ownEntries = await getOwnHallOfFame(codeShift);
    const next = [...ownEntries, { city: cal.city, students: podio, closedAt: Date.now(), totalStudents: active.length, totalClasses, avgScore, classDaysSnapshot: cumulativeClassDays }];
    await saveHallOfFame(codeShift, next, teacherAuth);
    // 🚦 encerrar a cidade NÃO define a próxima sozinho — fica marcada como "fechada" até o
    // professor digitar o nome da cidade seguinte (ver saveCity), pra parar de contar dia de aula
    // e mostrar o pino "você está aqui" numa cidade que já foi encerrada — só nesta turma
    { const nm = withTurmaCalendar(metaRef.current, codeShift, { cityClosed: true }); metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm, teacherAuth); }
    // 🔒 fim da turma nesta cidade: os responsáveis já sabiam que isso aconteceria — apaga data de
    // nascimento e CPF de todo mundo (dado sensível só existia pra gerar certificado enquanto durou
    // a turma). Depois disso ninguém mais tem acesso, nem o professor — some da planilha também.
    await Promise.all(active.filter(s => s.birthDate || s.cpf).map(s => patchStudent(s.shift, s.name, { birthDate:"", cpf:"" })));
    setHallMsg(`✅ ${cal.city} entrou pro Hall da Fama! Gerando o relatório de despedida em PDF...`);
    setFarewellBusy(true);
    try {
      const daysThisCity = [...cal.classDays].sort().slice(-Math.max(totalClasses,1));
      const fmt = (k) => { try { const [y,m,d] = String(k).split("-"); return `${d}/${m}/${y}`; } catch { return k; } };
      const periodStart = daysThisCity.length ? fmt(daysThisCity[0]) : fmt(todayKey());
      const periodEnd = daysThisCity.length ? fmt(daysThisCity[daysThisCity.length-1]) : fmt(todayKey());
      await generateFarewellPDF({ city: cal.city, active, podio, totalClasses, avgScore, periodStart, periodEnd });
      setHallMsg(`✅ ${cal.city} entrou pro Hall da Fama, o relatório de despedida foi baixado, e a data de nascimento/CPF da turma foi apagada.`);
    } catch {
      setHallMsg(`✅ ${cal.city} entrou pro Hall da Fama e a data de nascimento/CPF da turma foi apagada! (Não consegui gerar o PDF de despedida agora — tente de novo se quiser.)`);
    }
    setFarewellBusy(false);
    setTimeout(()=>setHallMsg(""), 9000);
  };
  // 📄 Relatório de Comprovação de Aproveitamento de Aprendizado: reaproveita o modelo oficial
  // (cabeçalho/rodapé/assinaturas intactos), preenchendo cidade/mês e um bloco por TURMA ATIVA
  // (todas, não só matutino/vespertino) com ALUNO/CPF/NOTA/ANEXO de cada aluno — turma de teste e
  // sala de linguagens continuam de fora (nunca entram na lista de turmas de verdade)
  const [relatorioBusy, setRelatorioBusy] = useState(false);
  const [relatorioMsg, setRelatorioMsg] = useState("");
  const doGerarRelatorio = async () => {
    setRelatorioBusy(true); setRelatorioMsg("");
    try {
      const byName = (a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR");
      const studentsByShift = Object.fromEntries(
        activeTurmas.map(t => [t.id, students.filter(s => (s.shift || activeTurmas[0]?.id) === t.id).sort(byName)])
      );
      const total = activeTurmas.reduce((n, t) => n + studentsByShift[t.id].length, 0);
      if (total === 0) { setRelatorioMsg("❌ Nenhum aluno em nenhuma turma ainda pra gerar o relatório."); setRelatorioBusy(false); return; }
      // cada turma pode estar numa cidade diferente da jornada agora — se todas as que têm aluno
      // no relatório baterem na mesma cidade, usa ela; se divergirem, lista as diferentes juntas
      const citiesInvolved = [...new Set(activeTurmas.filter(t => studentsByShift[t.id].length).map(t => turmaCalendar(meta, t.id).city).filter(Boolean))];
      const cityLabel = citiesInvolved.length <= 1 ? (citiesInvolved[0] || "") : citiesInvolved.join(" / ");
      const blob = await generateRelatorioDocx({
        city: cityLabel,
        studentsByShift,
        turmas: activeTurmas,
        cursoTexto: "C# para iniciantes",
        tipoAvaliacao: "atividades avaliativas e prova sobre C#",
      });
      downloadRelatorioDocx(blob, { city: cityLabel });
      const porTurma = activeTurmas.map(t => `${studentsByShift[t.id].length} ${t.label}`).join(", ");
      setRelatorioMsg(`✅ Relatório gerado com ${total} aluno${total===1?"":"s"} (${porTurma}).`);
    } catch (e) {
      setRelatorioMsg(`❌ Não consegui gerar o relatório: ${e?.message || e}`);
    }
    setRelatorioBusy(false);
    setTimeout(() => setRelatorioMsg(""), 9000);
  };
  const loadAutoBackups = async () => { setAutoBackupList(await getBackupList(teacherAuth)); };
  const doAutoBackupNow = async () => {
    setAutoBackupBusy(true); setAutoBackupMsg("");
    const r = await triggerBackupNow(teacherAuth);
    setAutoBackupMsg(r.ok ? `✅ Backup feito agora (${r.keys} chaves salvas).` : `❌ Não consegui fazer o backup agora. Tente de novo.`);
    if (r.ok) await loadAutoBackups();
    setAutoBackupBusy(false);
    setTimeout(()=>setAutoBackupMsg(""), 6000);
  };
  const saveSchedule = async () => {
    const nm = { ...metaRef.current, schedule };
    metaRef.current = nm; setMeta(nm);
    await saveTeacherMeta(nm, teacherAuth);
    setScheduleMsg("✅ Horário salvo!");
    setTimeout(()=>setScheduleMsg(""), 4000);
  };
  const toggleClassDay = async (k) => {
    const cal = turmaCalendar(metaRef.current, codeShift);
    const has = cal.classDays.includes(k);
    const days = has ? cal.classDays.filter(d=>d!==k) : [...cal.classDays, k];
    const nm = withTurmaCalendar(metaRef.current, codeShift, { classDays: days });
    metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm, teacherAuth);
  };
  // fim de semana fecha por padrão (a turma só funciona seg-sex) — esse toggle libera sábado/domingo
  const toggleAllowWeekend = async () => {
    const nm = { ...metaRef.current, allowWeekend: !metaRef.current.allowWeekend };
    metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm, teacherAuth);
  };
  // por padrão o editor trava enquanto o Nyx analisa o código do aluno (evita editar em cima da
  // análise em andamento) — esse toggle libera o aluno pra continuar digitando durante a análise
  const toggleLockDuringAnalysis = async () => {
    const nm = { ...metaRef.current, lockDuringAnalysis: metaRef.current.lockDuringAnalysis === false };
    metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm, teacherAuth);
  };

  const doReset = async () => {
    const scope = resetScope; // "all" | id de uma turma
    setConfirmReset(false);
    setResetting(true);
    setResetMsg("");
    // "Todas as turmas" reseta todas as turmas ativas cadastradas — turma de teste e sala de
    // linguagens NUNCA são apagadas por esse botão, mesmo escolhendo "todas"
    const ok = scope === "all"
      ? (await Promise.all(activeTurmas.map(t => resetAll(t.id, teacherAuth)))).every(Boolean)
      : await resetAll(scope, teacherAuth);
    // opcional: também limpa o "Meu código" do(s) turno(s) resetado(s) — só mexe no estado local
    // (não chama saveTeacherCode direto), porque o efeito de autosave já existente (que roda 1s
    // depois de proFilesByShift mudar) se encarrega de persistir o vazio sozinho
    if (resetClearMyCode) {
      const emptyFiles = [{ name:"Program.cs", code:"" }];
      setProFilesByShift(prev => ({
        ...prev,
        ...(scope === "all" ? Object.fromEntries(activeTurmas.map(t => [t.id, emptyFiles])) : { [scope]: emptyFiles }),
      }));
    }
    setSelected(null);
    await load();
    setResetting(false);
    const alvo = scope === "all" ? "Todas as turmas foram resetadas" : `Turma ${shiftMeta(scope, turmas).label} resetada`;
    setResetMsg(ok
      ? `✅ ${alvo}${resetClearMyCode ? " (e seu código em Meu código também foi limpo)" : ""}! Os alunos online desse grupo serão desconectados em alguns segundos.`
      : "⚠ Não foi possível resetar. O armazenamento só funciona no app publicado — teste pelo link publicado.");
    setTimeout(() => setResetMsg(""), 6000);
  };

  // gera um nome de conteúdo para a aula de hoje, para UM turno específico
  const computeContentName = async (shift) => {
    const tk = todayKey();
    const proCode = (proFilesByShift[shift]||[]).map(f => (f.code||"")).join("\n").trim();
    let source = "", origem = "";
    if (proCode.length > 5) {
      source = (proFilesByShift[shift]||[]).filter(f=>(f.code||"").trim()).map(f=>`// ${f.name}\n${f.code}`).join("\n\n");
      origem = "professor";
    } else {
      const base = students.filter(s => (s.shift||"sem-turno")===shift);
      const codes = base.filter(s => (s.code||"").trim().length > 5).map((s,i)=>`Aluno ${i+1}:\n${s.code}`).join("\n\n---\n\n");
      if (codes) { source = codes; origem = "alunos"; }
    }
    if (!source) throw new Error(`Programe o exemplo de ${shiftMeta(shift, turmas).label} na aba "Meu código" (ou espere os alunos dessa turma começarem a escrever).`);
    // já existe uma aula salva com ESSE MESMO código, com o nome já pronto? reaproveita, sem chamar o Nyx
    const matched = origem === "professor" ? findMatchingLesson(myLessons, proFilesByShift[shift]) : null;
    let title;
    if (matched?.contentName) {
      title = matched.contentName;
    } else {
      const ctx = origem === "professor"
        ? "Este é o código C# que o professor escreveu como exemplo na aula de hoje"
        : "Estes são os códigos C# que os alunos escreveram na aula de hoje";
      const out = await askClaude(
        `${ctx}:\n\n${source}\n\nANALISE o código com atenção antes de nomear: identifique quais conceitos aparecem de verdade (tipos usados, estruturas de controle, entrada/saída, métodos, o que o programa FAZ quando roda) e qual deles é o protagonista da aula.\n\nDepois, gere um NOME DE CONTEÚDO criativo e descritivo para esta aula, em português, que dê orgulho de aparecer no calendário do curso. Pode usar até 12 palavras — capriche: nada de nome genérico tipo "Aula de C#". Bons exemplos: "Variáveis e o primeiro diálogo com o usuário", "Tomando decisões: if, else e a nota da prova", "O jogo de adivinhação: while, Random e lógica de tentativas".\n\nResponda APENAS com o nome do conteúdo, sem aspas e sem ponto final.`,
        "Você é um professor criativo que nomeia conteúdos de aulas de C# para iniciantes. Analise o código de verdade e crie um nome específico e caprichado. Responda só com o nome."
      );
      title = out.replace(/["\n`]/g,"").trim().slice(0,110);
    }
    const nm = { ...metaRef.current, contentNames: withContentName(metaRef.current.contentNames, tk, shift, title) };
    metaRef.current = nm; setMeta(nm); await saveTeacherMeta(nm, teacherAuth);
    return { title, origem };
  };

  // usado nas abas "Meu código" e "Calendário" — sempre para o turno selecionado ali
  const generateContentName = async (shift) => {
    setGenName(true); setNameMsg("");
    try {
      const { title, origem } = await computeContentName(shift);
      setNameMsg(`✅ Conteúdo de hoje (${shiftMeta(shift, turmas).label}): ${title}${origem==="alunos"?" (gerado pelo código dos alunos)":""}`);
    } catch (e) { setNameMsg(e.message || "Não consegui gerar agora. Tente de novo em instantes."); }
    setGenName(false);
    setTimeout(()=>setNameMsg(""), 6000);
  };

  // usado no Monitoramento — respeita o filtro de turma (gera para os dois se "Todas" estiver selecionada)
  const generateContentNameFiltered = async () => {
    setGenName(true); setNameMsg("");
    const shifts = shiftFilter === "all" ? activeTurmas.map(t=>t.id) : [shiftFilter];
    const parts = [];
    for (const sh of shifts) {
      try { const { title } = await computeContentName(sh); parts.push(`${shiftMeta(sh, turmas).emoji} ${title}`); }
      catch { parts.push(`${shiftMeta(sh, turmas).emoji} não consegui gerar`); }
    }
    setNameMsg(`✅ ${parts.join(" · ")}`);
    setGenName(false);
    setTimeout(()=>setNameMsg(""), 7000);
  };

  // 📚 ritmo do resumo (aba "Meu código"): salva a cada quantos dias de código a turma tem 1 dia
  // de resumo (0 = sem ritmo, código e resumo podem acontecer no mesmo dia quando o professor quiser)
  const saveResumoCadence = async (turmaId, value) => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    const nm = withTurmaCalendar(metaRef.current, turmaId, { resumoCadence: n });
    metaRef.current = nm; setMeta(nm);
    await saveTeacherMeta(nm, teacherAuth);
  };
  // busca se a turma selecionada em "Meu código" já teve o resumo de hoje liberado — só pra mostrar
  // o status certo (evita o professor achar que precisa clicar de novo)
  useEffect(() => {
    let active = true;
    getResumoTrigger(codeShift).then(v => { if (active) setResumoTriggeredToday(t => ({ ...t, [codeShift]: v?.date === todayKey() })); });
    return () => { active = false; };
  }, [codeShift]);
  // 📚 libera o resumo da turma HOJE: gera o resumo UMA VEZ a partir do código que O PROFESSOR
  // passou pra essa turma (os alunos só copiam esse mesmo código, não faz sentido pedir pro Nyx
  // resumir de novo pra cada um) e manda pronto pra turma inteira. Quem está em dia recebe
  // exatamente esse texto; quem faltou aula continua gerando um resumo próprio (handleSave cuida
  // disso), cobrindo só o que ficou pendente — isso não dá pra compartilhar. Qualquer aluno
  // conectado que já tem código escrito e ainda está na fase "coding" finaliza a aula sozinho
  // (mesmo fluxo de "Salvar e Finalizar Aula") assim que o navegador dele perceber o aviso — sem
  // precisar clicar em nada. Continua valendo o dia inteiro, então também pega quem entra DEPOIS
  // deste clique (não só quem já está online).
  const liberarResumoHoje = async (turmaId) => {
    setResumoTriggerBusy(true); setResumoTriggerMsg("📚 Gerando o resumo da aula...");
    try {
      const teacherCode = await getTeacherCode(turmaId);
      const code = (teacherCode?.files || []).filter(f => (f.code||"").trim()).map(f => f.code || "").join("\n");
      let resumo = null;
      if (code.trim().length >= 10) {
        const { prompt, system } = buildSummaryRequest("simples", false, code, code, null, null);
        try { resumo = await askClaudeJson(prompt, system); } catch { resumo = null; }
      }
      const ok = await setResumoTrigger(turmaId, todayKey(), teacherAuth, resumo);
      if (ok) {
        setResumoTriggeredToday(t => ({ ...t, [turmaId]: true }));
        setResumoTriggerMsg(resumo
          ? `✅ Resumo gerado e liberado pra turma ${shiftMeta(turmaId, turmas).label}! Quem está em dia recebe esse MESMO resumo — só quem faltou aula continua com um resumo próprio, cobrindo o que perdeu.`
          : `✅ Resumo liberado pra turma ${shiftMeta(turmaId, turmas).label}! Não achei código seu salvo pra essa turma pra gerar um resumo pronto, então cada aluno vai gerar o próprio, como antes.`);
      } else {
        setResumoTriggerMsg("❌ Não consegui liberar o resumo agora. Tente de novo em instantes.");
      }
    } catch {
      setResumoTriggerMsg("❌ Não consegui gerar o resumo agora. Tente de novo em instantes.");
    }
    setResumoTriggerBusy(false);
    setTimeout(() => setResumoTriggerMsg(""), 8000);
  };

  // envia um aviso para um aluno específico aparecer na tela dele
  const nudgeStudent = async (s) => {
    const ok = await setNudge(s.shift, s.name, "👀 Preste atenção na aula! Volte para o seu código e continue a atividade de hoje.", teacherAuth);
    if (ok) { setNudged(n => ({ ...n, [s.name]: Date.now() })); setTimeout(()=>setNudged(n=>{ const c={...n}; delete c[s.name]; return c; }), 5000); }
  };

  // ── exporta notas e presenças em .xlsx DE VERDADE (zip+XML, ver src/xlsx.js) ──
  // segue o modelo do professor: ALUNO | DIAS PRESENTES | MAIOR NOTA | SITUAÇÃO | DESTAQUE,
  // agrupado por turno, com cabeçalho colorido e zebra — e sem o aviso de
  // "arquivo pode estar corrompido" que o formato antigo disparava no celular
  const exportCSV = () => {
    const rows = students
      .filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id)
      .sort((a,b)=>((a.shift||"")+a.name).localeCompare((b.shift||"")+b.name,"pt-BR"));
    const maiorNotaOf = (s) => {
      const notas = [...Object.values(s.scoreHistory||{}), s.score, s.examScore].filter(n => typeof n === "number");
      return notas.length ? Math.max(...notas) : null;
    };
    // quem tirou a maior nota entre TODOS os alunos (os dois turnos juntos) é o destaque da turma —
    // só 1 estrela na planilha inteira, não 1 por turno
    let melhorNotaGeral = null;
    rows.forEach(s => {
      const nota = maiorNotaOf(s);
      if (nota == null) return;
      if (melhorNotaGeral == null || nota > melhorNotaGeral) melhorNotaGeral = nota;
    });
    const groups = turmas.map(sh => ({ ...sh, list: rows.filter(s => (s.shift||"sem-turno")===sh.id) })).filter(g => g.list.length > 0);

    // dias de aula (marcados no Calendário DE CADA TURMA) — junta os dias de todas as turmas do
    // export numa coluna só; um dia que não era aula NA TURMA daquele aluno específico vira "–"
    // (mesmo tratamento de "fora do período dele"), não conta como falta por engano.
    // Só o MÊS ATUAL entra na planilha (mês anterior fica de fora, pra não crescer sem fim).
    const currentMonthKey = todayKey().slice(0, 7); // "YYYY-MM"
    const classDays = [...new Set(turmas.flatMap(t => turmaCalendar(meta, t.id).classDays))]
      .filter(d => d.slice(0, 7) === currentMonthKey)
      .sort();
    const dayCell = (s, d) => {
      const enrollFrom = s.createdAt ? dateKeyOf(s.createdAt) : (Object.keys(s.attendance||{}).sort()[0] || null);
      const lastDay = s.lastSeen ? dateKeyOf(s.lastSeen) : null;
      if ((enrollFrom && d < enrollFrom) || (lastDay && d > lastDay)) return { v:"–", st:null }; // fora do período do aluno
      if (!turmaCalendar(meta, s.shift||"sem-turno").classDays.includes(d)) return { v:"–", st:null }; // não era dia de aula na turma dele
      if ((s.attendance||{})[d] === "present") return { v:"✓", st:"present" };
      const just = (s.justifications||{})[d];
      if (just && just.status === "approved") return { v:"J", st:"justified" };
      return { v:"✗", st:"absent" };
    };

    // NASCIMENTO e CPF só entram na planilha (nunca no perfil do aluno) — dados sensíveis pro professor
    // usar no certificado; a formatação de data e o "não sei" do CPF acontecem no cadastro do aluno
    const fmtBirth = (b) => { if (!b) return "—"; const [y,m,d] = String(b).split("-"); return (y&&m&&d) ? `${d}/${m}/${y}` : "—"; };
    const totalCols = 8 + classDays.length; // ALUNO + dias + DIAS PRESENTES + MAIOR NOTA + NOTA DA PROVA + SITUAÇÃO + DESTAQUE + NASCIMENTO + CPF
    const xlsRows = [];
    const merges = [];
    const wide = (st) => Array.from({ length: totalCols }, () => ({ v: "", st })); // linha inteira com o mesmo estilo (pra faixa colorida cobrir a planilha toda)
    const mergeRow = () => merges.push(`A${xlsRows.length}:${colLetter(totalCols-1)}${xlsRows.length}`);

    // título + subtítulo
    let cells = wide({ b:1, sz:15, color:"FFFFFF", fill:"1F2547" });
    cells[0].v = "AULA DE C# — ACOMPANHAMENTO DA TURMA";
    xlsRows.push({ cells, ht: 30 }); mergeRow();
    cells = wide({ i:1, sz:10, color:"C9CFEF", fill:"2E3560" });
    cells[0].v = `${meta.city ? meta.city + "  •  " : ""}gerado em ${new Date().toLocaleDateString("pt-BR")}${classDays.length ? `  •  ✓ presente · ✗ falta · J justificado · – fora do período do aluno` : ""}`;
    xlsRows.push({ cells }); mergeRow();
    xlsRows.push({ cells: [] });

    groups.forEach(g => {
      const bandSt = { b:1, sz:12, color: shadeHex(g.color || "#c084fc", -0.55), fill: shadeHex(g.color || "#c084fc", 0.75), border:1 };
      cells = wide(bandSt);
      cells[0].v = `${g.emoji} TURMA ${g.label.toUpperCase()} — ${g.list.length} aluno${g.list.length!==1?"s":""}`;
      xlsRows.push({ cells, ht: 22 }); mergeRow();

      const dayHeaders = classDays.map(d => { const [, m, dd] = d.split("-"); return `${dd}/${m}`; });
      xlsRows.push({ cells: ["ALUNO", ...dayHeaders, "DIAS PRESENTES","MAIOR NOTA","NOTA DA PROVA","SITUAÇÃO","DESTAQUE","NASCIMENTO","CPF"].map((h,i)=>({
        v: h, st: { b:1, sz: i>0&&i<=classDays.length?9:11, color:"FFFFFF", fill:"303869", border:1, align: i>0 ? "center" : "left" },
      })) });

      g.list.forEach((s, i) => {
        const att = classDays.filter(d => (s.attendance||{})[d] === "present").length; // só conta os dias do mês atual, mesmo escopo das colunas
        const maiorNota = maiorNotaOf(s);
        const isDestaque = maiorNota != null && maiorNota === melhorNotaGeral;
        const fill = isDestaque ? "FFF6D6" : (i % 2 ? "F5F6FB" : undefined);
        const situacao = maiorNota == null
          ? { v:"Sem nota ainda", st:{ color:"8A8FA8", fill, border:1, align:"center" } }
          : maiorNota >= 60
            ? { v:"✔ Satisfatório", st:{ b:1, color:"1E8E5A", fill, border:1, align:"center" } }
            : { v:"⚠ Insatisfatório", st:{ b:1, color:"C2410C", fill, border:1, align:"center" } };
        const dayCells = classDays.map(d => {
          const c = dayCell(s, d);
          const color = c.st==="present" ? "1E8E5A" : c.st==="absent" ? "C2410C" : c.st==="justified" ? "B45309" : "AAB0C8";
          return { v: c.v, st:{ b: c.st==="present"||c.st==="absent", color, fill, border:1, align:"center" } };
        });
        xlsRows.push({ cells: [
          { v: s.name, st:{ b:1, color:"1F2547", fill, border:1 } },
          ...dayCells,
          { v: att, st:{ fill, border:1, align:"center" } },
          { v: maiorNota ?? "—", st:{ b:1, sz:12, color:"303869", fill, border:1, align:"center" } },
          { v: s.examScore ?? "—", st:{ b:1, sz:12, color:"6b3fd1", fill, border:1, align:"center" } },
          situacao,
          { v: isDestaque ? "🌟 Aluno destaque (Manhã + Tarde)" : "", st:{ color:"8A6D1A", fill, border:1, align:"center" } },
          { v: fmtBirth(s.birthDate), st:{ color:"5A6183", fill, border:1, align:"center" } },
          { v: s.cpf || "—", st:{ color:"5A6183", fill, border:1, align:"center" } },
        ] });
      });

      const notas = g.list.map(maiorNotaOf).filter(n => n != null);
      const media = notas.length ? Math.round(notas.reduce((a,b)=>a+b,0)/notas.length) : null;
      cells = wide({ i:1, sz:9.5, color:"5A6183", fill:"EEF0FA", border:1 });
      cells[0].v = `Média da turma: ${media ?? "—"}  •  Situação calculada pela maior nota (linha de corte: 60)`;
      xlsRows.push({ cells }); mergeRow();
      xlsRows.push({ cells: [] });
    });

    const colWidths = [34, ...classDays.map(()=>6), 16, 12, 14, 18, 28, 14, 18];
    const blob = xlsxBlob({ sheetName:"Turma", colWidths, rows:xlsRows, merges });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `planilha-aula-csharp-${todayKey()}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  // ── PDF do curso: o código do PROFESSOR (o exemplo da turma) + explicações do Nyx ──
  // sem nome de aluno nenhum — é um material de estudo pra enviar pra todo mundo.
  // jsPDF é importado sob demanda (só quando o professor clica) pra não pesar o app dos alunos
  const exportPDF = async (scope = "all") => {
    setPdfGenerating(true);

    // junta o código do professor por turno (só turnos que têm código) — scope filtra pra só o
    // turno escolhido, pra dar pra mandar o PDF certo pro grupo certo em vez de sempre os dois juntos
    const shiftsWithCode = activeTurmas
      .filter(sh => scope === "all" || sh.id === scope)
      .map(sh => ({ ...sh, files: (proFilesByShift[sh.id]||[]).filter(f => (f.code||"").trim()) }))
      .filter(sh => sh.files.length > 0);
    if (shiftsWithCode.length === 0) {
      setPdfMsg('⚠ Programe o exemplo na aba "Meu código" primeiro — o PDF usa o código do professor, não o dos alunos.');
      setPdfGenerating(false);
      return;
    }

    setPdfMsg("🧠 O Nyx está escrevendo as explicações dos códigos...");
    // explicação de todos os códigos, pedida ao Nyx (um pedido por turno, em paralelo) — o código é
    // CUMULATIVO desde o início do curso (não reseta por dia), então não tem número fixo de seções:
    // cobre tudo que existir, por menor ou maior que seja, sem resumir demais
    let aiOffline = false;
    const explains = await Promise.all(shiftsWithCode.map(async (sh) => {
      const code = sh.files.map(f => `// ===== ${f.name} =====\n${f.code}`).join("\n\n");
      try {
        return await askClaudeJson(
          `Este é o código C# completo que o professor escreveu para a turma ${sh.label} ao longo de todo o curso até agora (pode ter vários arquivos e vários conceitos diferentes, de aulas diferentes):\n\`\`\`csharp\n${code}\n\`\`\`\n\nCrie uma explicação COMPLETA e didática desse código, para iniciantes que vão receber este material por escrito e estudar sozinhos. Percorra o código NA ORDEM em que ele aparece. NÃO resuma demais nem pule partes só porque parecem simples — se apareceu no código, precisa ter uma seção explicando.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "intro": "1 a 2 frases dizendo o que esse código faz como um todo",\n  "secoes": [ { "titulo": "nome curto do conceito/parte", "explicacao": "explicação clara de 2 a 4 frases, em português simples", "exemplo": "trecho C# bem curto ilustrando (opcional — use \\n pra quebrar linha)" } ],\n  "dica": "1 frase final incentivando o estudo"\n}\n\nNão tem número fixo de seções: crie quantas forem necessárias pra cobrir TODOS os conceitos e partes importantes de verdade, mesmo que passe de 10. Garanta JSON válido.`,
          "Você é um professor de C# paciente escrevendo um material de estudo completo por escrito para iniciantes — cobre tudo que foi visto, sem cortar conteúdo pra deixar o material curto. Português correto e simples. Responda APENAS JSON puro válido.",
          { max_tokens: 6000 }
        );
      } catch { aiOffline = true; return null; }
    }));

    setPdfMsg("📄 Montando o PDF...");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      const maxW = pageW - margin * 2;
      let y = margin;

      const hexRgb = (hex) => {
        const h = hex.replace("#", "");
        const n = parseInt(h.length === 3 ? h.split("").map(c=>c+c).join("") : h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      };
      // as fontes padrão do PDF não têm emoji — remove pra não virar caractere quebrado
      const clean = (t) => String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️]/gu, "").replace(/\s+/g, " ").trim();
      const ensureSpace = (needed) => { if (y + needed > pageH - margin - 16) { doc.addPage(); y = margin; } };
      const writeParagraph = (text, opts = {}) => {
        const { size = 10.5, font = "helvetica", style = "normal", color = "#2a2f45", lineGap = 4.5, x = margin, width = maxW } = opts;
        doc.setFont(font, style); doc.setFontSize(size); doc.setTextColor(...hexRgb(color));
        doc.splitTextToSize(String(text || " "), width).forEach(line => {
          ensureSpace(size + lineGap);
          doc.text(line, x, y);
          y += size + lineGap;
        });
      };
      // bloco de código com fundo cinza-azulado, quebrado em pedaços quando não cabe na página
      const writeCodeBlock = (codeText) => {
        doc.setFont("courier", "normal"); doc.setFontSize(8.5);
        const lines = codeText.split("\n").flatMap(l => doc.splitTextToSize(l.length ? l : " ", maxW - 24));
        const lh = 11.5;
        let i = 0;
        while (i < lines.length) {
          ensureSpace(lh * 2 + 16);
          const fit = Math.max(1, Math.floor((pageH - margin - 16 - y - 16) / lh));
          const chunk = lines.slice(i, i + fit);
          const h = chunk.length * lh + 14;
          doc.setFillColor(...hexRgb("#f2f4fc")); doc.setDrawColor(...hexRgb("#d8dcf0"));
          doc.roundedRect(margin, y - 4, maxW, h, 5, 5, "FD");
          doc.setFont("courier", "normal"); doc.setFontSize(8.5); doc.setTextColor(...hexRgb("#33395c"));
          chunk.forEach((ln, j) => doc.text(ln, margin + 12, y + 10 + j * lh));
          y += h + 8;
          i += fit;
        }
      };

      // ── CAPA ──
      doc.setFillColor(...hexRgb("#1d1230")); doc.rect(0, 0, pageW, pageH, "F");
      doc.setFillColor(...hexRgb("#2a1a42"));
      doc.circle(pageW - 60, 90, 130, "F");
      doc.circle(40, pageH - 80, 100, "F");
      doc.setFillColor(...hexRgb("#fbbf24")); doc.roundedRect(margin, 240, 64, 7, 3, 3, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(38); doc.setTextColor(255, 255, 255);
      doc.text("Aula de C#", margin, 292);
      doc.setFont("helvetica", "normal"); doc.setFontSize(16); doc.setTextColor(...hexRgb("#c4b2e2"));
      doc.text("Códigos do curso e explicações do Nyx", margin, 318);
      doc.setFontSize(11.5); doc.setTextColor(...hexRgb("#927fb8"));
      const dataBr = new Date().toLocaleDateString("pt-BR");
      doc.text(clean(`${meta.city ? meta.city + "  •  " : ""}Gerado em ${dataBr}`), margin, 344);
      doc.setFont("courier", "normal"); doc.setFontSize(10); doc.setTextColor(...hexRgb("#5e4a86"));
      doc.text('Console.WriteLine("Bons estudos!");', margin, pageH - 70);

      // ── CONTEÚDO (um capítulo por turno) ──
      shiftsWithCode.forEach((sh, idx) => {
        const accent = sh.color || "#c084fc";
        doc.addPage(); y = margin;

        // faixa do turno
        doc.setFillColor(...hexRgb(accent));
        doc.roundedRect(margin, y - 6, maxW, 40, 8, 8, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
        doc.text(clean(`Turma ${sh.label}`).toUpperCase(), margin + 16, y + 19);
        y += 58;

        const exp = explains[idx];
        writeParagraph("O que este código ensina", { size: 14, style: "bold", color: "#1f2547" });
        y += 2;
        if (exp && Array.isArray(exp.secoes) && exp.secoes.length) {
          if (exp.intro) { writeParagraph(clean(exp.intro), { size: 11, color: "#4a5170" }); y += 6; }
          exp.secoes.forEach((sec, i) => {
            ensureSpace(40);
            // marcador numerado no lugar de emoji (fonte do PDF não tem emoji)
            doc.setFillColor(...hexRgb(accent));
            doc.roundedRect(margin, y - 10, 18, 18, 5, 5, "F");
            doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
            doc.text(String(i + 1), margin + 9, y + 3, { align: "center" });
            writeParagraph(clean(sec.titulo), { size: 12, style: "bold", color: "#1f2547", x: margin + 26, width: maxW - 26 });
            if (sec.explicacao) writeParagraph(clean(sec.explicacao), { size: 10.5, x: margin + 26, width: maxW - 26 });
            if (sec.exemplo && String(sec.exemplo).trim()) writeParagraph(String(sec.exemplo).replace(/\r/g, ""), { size: 9, font: "courier", color: "#5b3fd1", x: margin + 26, width: maxW - 26 });
            y += 8;
          });
          if (exp.dica) {
            ensureSpace(30);
            doc.setFillColor(...hexRgb("#fff7e0")); doc.setDrawColor(...hexRgb("#f0d896"));
            const dicaLines = doc.splitTextToSize("Dica:  " + clean(exp.dica), maxW - 24);
            const dh = dicaLines.length * 14 + 14;
            doc.roundedRect(margin, y - 4, maxW, dh, 6, 6, "FD");
            doc.setFont("helvetica", "italic"); doc.setFontSize(10.5); doc.setTextColor(...hexRgb("#8a6d1a"));
            dicaLines.forEach((ln, j) => doc.text(ln, margin + 12, y + 12 + j * 14));
            y += dh + 10;
          }
        } else {
          writeParagraph("As explicações automáticas não puderam ser geradas agora (Nyx offline). O código completo está logo abaixo.", { size: 10.5, style: "italic", color: "#8a8fa8" });
          y += 6;
        }

        y += 8;
        writeParagraph("Código completo", { size: 14, style: "bold", color: "#1f2547" });
        y += 4;
        sh.files.forEach(f => {
          ensureSpace(34);
          doc.setFillColor(...hexRgb("#1f2547"));
          doc.roundedRect(margin, y - 4, maxW, 22, 5, 5, "F");
          doc.setFont("courier", "bold"); doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
          doc.text(clean(f.name), margin + 12, y + 10);
          y += 26;
          writeCodeBlock(f.code.replace(/\r/g, ""));
          y += 4;
        });
      });

      // ── rodapé com numeração (pula a capa) ──
      const total = doc.getNumberOfPages();
      for (let p = 2; p <= total; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...hexRgb("#9aa1c2"));
        doc.text("Aula de C#  •  material do curso", margin, pageH - 24);
        doc.text(`${p - 1} / ${total - 1}`, pageW - margin, pageH - 24, { align: "right" });
      }

      doc.save(`codigos-do-curso-${scope}-${todayKey()}.pdf`);
      setPdfMsg(aiOffline ? "✅ PDF gerado (sem as explicações — o Nyx estava offline)." : "✅ PDF gerado!");
    } catch {
      setPdfMsg("❌ Não consegui gerar o PDF agora. Tente de novo.");
    }
    setPdfGenerating(false);
  };

  // ── 📄 PDF do dia: um resumo curto do código de HOJE (aba "Meu código" do turno do aluno) +
  // explicação do Nyx, pronto pra enviar de volta pra um aluno que vai faltar não ficar pra trás ──
  const exportDailyPDF = async (shift, studentName, code) => {
    setDailyPdfBusy(true);
    setDailyPdfMsg("");
    if (!String(code || "").trim()) {
      setDailyPdfMsg("⚠ Escreva o código de hoje antes de gerar.");
      setDailyPdfBusy(false);
      return;
    }
    let explain = null, aiOffline = false;
    try {
      explain = await askClaudeJson(
        `Este é o código C# que o professor ensinou HOJE para a turma ${shiftMeta(shift, turmas).label} (pode ter vários arquivos):\n\`\`\`csharp\n${code}\n\`\`\`\n\nCrie uma explicação COMPLETA e didática desse código, para um aluno que FALTOU hoje e vai estudar esse material sozinho em casa. Percorra o código NA ORDEM em que ele aparece, cobrindo TODOS os conceitos importantes do dia — não pode faltar nenhum.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "intro": "1 a 2 frases dizendo o que foi ensinado hoje como um todo",\n  "secoes": [ { "titulo": "nome curto do conceito/parte", "explicacao": "explicação clara de 2 a 4 frases, em português simples", "exemplo": "trecho C# bem curto ilustrando (opcional — use \\n pra quebrar linha)" } ],\n  "dica": "1 frase final encorajando o aluno a estudar em casa e perguntar na próxima aula se tiver dúvida"\n}\n\nFaça uma seção para CADA parte ou conceito importante do código (pode passar de 8 se o dia teve bastante conteúdo — não corte nada pra economizar espaço). Garanta JSON válido.`,
        "Você é um professor de C# escrevendo, com carinho, um resumo por escrito para um aluno que faltou não ficar pra trás. Português correto e simples. Responda APENAS JSON puro válido.",
        { max_tokens: 4000 }
      );
    } catch { aiOffline = true; }

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      const maxW = pageW - margin * 2;
      let y = margin;
      const hexRgb = (hex) => {
        const h = hex.replace("#", "");
        const n = parseInt(h.length === 3 ? h.split("").map(c=>c+c).join("") : h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      };
      const clean = (t) => String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️]/gu, "").replace(/\s+/g, " ").trim();
      const ensureSpace = (needed) => { if (y + needed > pageH - margin - 16) { doc.addPage(); y = margin; } };
      const writeParagraph = (text, opts = {}) => {
        const { size = 10.5, font = "helvetica", style = "normal", color = "#2a2f45", lineGap = 4.5, x = margin, width = maxW } = opts;
        doc.setFont(font, style); doc.setFontSize(size); doc.setTextColor(...hexRgb(color));
        doc.splitTextToSize(String(text || " "), width).forEach(line => {
          ensureSpace(size + lineGap);
          doc.text(line, x, y);
          y += size + lineGap;
        });
      };
      const writeCodeBlock = (codeText) => {
        doc.setFont("courier", "normal"); doc.setFontSize(8.5);
        const lines = codeText.split("\n").flatMap(l => doc.splitTextToSize(l.length ? l : " ", maxW - 24));
        const lh = 11.5;
        let i = 0;
        while (i < lines.length) {
          ensureSpace(lh * 2 + 16);
          const fit = Math.max(1, Math.floor((pageH - margin - 16 - y - 16) / lh));
          const chunk = lines.slice(i, i + fit);
          const h = chunk.length * lh + 14;
          doc.setFillColor(...hexRgb("#f2f4fc")); doc.setDrawColor(...hexRgb("#d8dcf0"));
          doc.roundedRect(margin, y - 4, maxW, h, 5, 5, "FD");
          doc.setFont("courier", "normal"); doc.setFontSize(8.5); doc.setTextColor(...hexRgb("#33395c"));
          chunk.forEach((ln, j) => doc.text(ln, margin + 12, y + 10 + j * lh));
          y += h + 8;
          i += fit;
        }
      };

      // ── cabeçalho ──
      const accent = turmas.find(t => t.id === shift)?.color || "#c084fc";
      doc.setFillColor(...hexRgb(accent)); doc.roundedRect(margin, y - 8, maxW, 56, 10, 10, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(255, 255, 255);
      doc.text(clean(`Resumo da aula de hoje — para ${studentName}`), margin + 16, y + 16);
      const dataBr = new Date().toLocaleDateString("pt-BR");
      const contentName = contentFor(shift);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(255, 255, 255);
      doc.text(clean(`${dataBr} • Turma ${shiftMeta(shift, turmas).label}${contentName ? " • " + contentName : ""}`), margin + 16, y + 35);
      y += 74;

      writeParagraph("Oi! Você faltou hoje, mas aqui está tudo o que a turma viu — dá uma olhada com calma e, se ficar com alguma dúvida, é só perguntar na próxima aula. 💜", { size: 11, style: "italic", color: "#4a5170" });
      y += 8;

      if (explain && Array.isArray(explain.secoes) && explain.secoes.length) {
        if (explain.intro) { writeParagraph(clean(explain.intro), { size: 11.5, style: "bold", color: "#1f2547" }); y += 6; }
        explain.secoes.forEach((sec, i) => {
          ensureSpace(40);
          doc.setFillColor(...hexRgb(accent));
          doc.roundedRect(margin, y - 10, 18, 18, 5, 5, "F");
          doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
          doc.text(String(i + 1), margin + 9, y + 3, { align: "center" });
          writeParagraph(clean(sec.titulo), { size: 12, style: "bold", color: "#1f2547", x: margin + 26, width: maxW - 26 });
          if (sec.explicacao) writeParagraph(clean(sec.explicacao), { size: 10.5, x: margin + 26, width: maxW - 26 });
          if (sec.exemplo && String(sec.exemplo).trim()) writeParagraph(String(sec.exemplo).replace(/\r/g, ""), { size: 9, font: "courier", color: "#5b3fd1", x: margin + 26, width: maxW - 26 });
          y += 8;
        });
        if (explain.dica) {
          ensureSpace(30);
          doc.setFillColor(...hexRgb("#fff7e0")); doc.setDrawColor(...hexRgb("#f0d896"));
          const dicaLines = doc.splitTextToSize("Dica:  " + clean(explain.dica), maxW - 24);
          const dh = dicaLines.length * 14 + 14;
          doc.roundedRect(margin, y - 4, maxW, dh, 6, 6, "FD");
          doc.setFont("helvetica", "italic"); doc.setFontSize(10.5); doc.setTextColor(...hexRgb("#8a6d1a"));
          dicaLines.forEach((ln, j) => doc.text(ln, margin + 12, y + 12 + j * 14));
          y += dh + 10;
        }
      } else {
        writeParagraph("A explicação automática não pôde ser gerada agora (Nyx offline). O código completo está logo abaixo.", { size: 10.5, style: "italic", color: "#8a8fa8" });
        y += 6;
      }

      y += 6;
      writeParagraph("Código completo de hoje", { size: 13, style: "bold", color: "#1f2547" });
      y += 4;
      // separa o código por arquivo (marcadores "// ===== Nome.cs =====" do pré-preenchimento)
      // pra escrever o nome de cada arquivo numa faixa própria acima do bloco dele
      const fileParts = [];
      let curPart = null;
      String(code).replace(/\r/g, "").split("\n").forEach(line => {
        const m = line.match(/^\/\/\s*=====\s*(.+?)\s*=====\s*$/);
        if (m) { curPart = { name: m[1], lines: [] }; fileParts.push(curPart); }
        else { if (!curPart) { curPart = { name: null, lines: [] }; fileParts.push(curPart); } curPart.lines.push(line); }
      });
      fileParts.forEach(fp => {
        const codeText = fp.lines.join("\n").replace(/^\n+|\n+$/g, "");
        if (!codeText.trim()) return;
        if (fp.name) {
          ensureSpace(34);
          doc.setFillColor(...hexRgb("#1f2547"));
          doc.roundedRect(margin, y - 4, maxW, 22, 5, 5, "F");
          doc.setFont("courier", "bold"); doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
          doc.text(clean(fp.name), margin + 12, y + 10);
          y += 26;
        }
        writeCodeBlock(codeText);
        y += 4;
      });

      const total = doc.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...hexRgb("#9aa1c2"));
        doc.text("Aula de C#  •  resumo do dia", margin, pageH - 24);
        doc.text(`${p} / ${total}`, pageW - margin, pageH - 24, { align: "right" });
      }

      doc.save(`resumo-hoje-${String(studentName).replace(/[^a-zA-Z0-9]+/g, "-")}-${todayKey()}.pdf`);
      setDailyPdfMsg(aiOffline ? "✅ PDF gerado (sem a explicação — o Nyx estava offline)." : "✅ PDF gerado!");
    } catch {
      setDailyPdfMsg("❌ Não consegui gerar o PDF agora. Tente de novo.");
    }
    setDailyPdfBusy(false);
  };

  // ── 💌 boletim pros responsáveis: UM PDF com uma página por aluno do turno, em linguagem
  // simples pra família — presenças, o que aprendeu (sem termo técnico), conquistas e recado do Nyx ──
  // scope: "all" (todos os alunos dos dois turnos) | id de turno ("matutino"/"vespertino") | um
  // objeto aluno único (gerado direto do painel de Gerenciar aluno) — os três casos viram 1 PDF
  const exportBoletins = async (scope) => {
    setBoletimBusy(true); setBoletimMsg("");
    const isSingleStudent = scope && typeof scope === "object";
    const turma = isSingleStudent
      ? [scope]
      : students
          .filter(s => (s.name||"").trim() && (scope === "all" ? turmas.some(sh=>sh.id===(s.shift||"")) : (s.shift||"") === scope))
          .sort((a,b)=>((a.shift||"")+a.name).localeCompare((b.shift||"")+b.name,"pt-BR"));
    if (!turma.length) { setBoletimMsg("⚠ Nenhum aluno nessa turma ainda."); setBoletimBusy(false); return; }
    const classDays = [...new Set(turmas.flatMap(t => turmaCalendar(meta, t.id).classDays))].sort();

    // "Todos" pode misturar Manhã e Tarde — o conteúdo do mês é por turno, então gera "o que
    // aprendeu" 1 vez PARA CADA turno que aparece na lista, e cada aluno usa o do seu próprio turno
    const turnosPresentes = [...new Set(turma.map(s => s.shift))].filter(sh => turmas.some(x=>x.id===sh));
    setBoletimMsg(turma.length > 1 ? "🧠 O Nyx está escrevendo a parte 'o que seu filho aprendeu'..." : "🧠 O Nyx está escrevendo o boletim...");
    const aprendeuPorTurno = {};
    await Promise.all((turnosPresentes.length ? turnosPresentes : [turma[0].shift]).map(async (sh) => {
      const conteudos = [...new Set(Object.values(meta.contentNames || {}).map(v => contentNameFor(v, sh)).filter(Boolean))];
      let aprendeu = null;
      if (conteudos.length) {
        try {
          const r = await askClaudeJson(
            `Numa carreta-escola itinerante, adolescentes tiveram aulas de programação C# este mês. Os conteúdos foram:\n${conteudos.map(c=>`- ${c}`).join("\n")}\n\nEscreva de 3 a 5 frases curtas explicando O QUE os alunos aprenderam, para os PAIS/RESPONSÁVEIS lerem — pessoas que não sabem nada de programação. Zero termo técnico sem explicar; foco no que o aluno agora sabe FAZER e por que isso é valioso.\n\nResponda APENAS JSON puro: { "frases": ["...", "..."] }`,
            "Você escreve boletins escolares carinhosos e claros para famílias. Português simples e correto. Responda APENAS JSON puro válido."
          );
          if (Array.isArray(r?.frases) && r.frases.length) aprendeu = r.frases.map(f => String(f));
        } catch {}
      }
      aprendeuPorTurno[sh] = aprendeu || (conteudos.length ? conteudos.map(c => `Estudou: ${c}.`) : ["Participou das aulas de introdução à programação em C#, dando os primeiros passos no mundo da tecnologia."]);
    }));

    setBoletimMsg(turma.length > 1 ? "📄 Montando os boletins..." : "📄 Montando o boletim...");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      const maxW = pageW - margin * 2;
      const hexRgb = (hex) => { const h = hex.replace("#",""); const n = parseInt(h.length===3?h.split("").map(c=>c+c).join(""):h,16); return [(n>>16)&255,(n>>8)&255,n&255]; };
      const clean = (t) => String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️]/gu, "").replace(/\s+/g, " ").trim();
      const mesBr = new Date().toLocaleDateString("pt-BR", { month:"long", year:"numeric" });

      turma.forEach((s, idx) => {
        if (idx > 0) doc.addPage();
        let y = margin;
        const accent = turmas.find(t => t.id === s.shift)?.color || "#c084fc";
        const aprendeu = aprendeuPorTurno[s.shift] || aprendeuPorTurno[turnosPresentes[0]] || ["Participou das aulas de introdução à programação em C#."];
        // cabeçalho
        doc.setFillColor(...hexRgb(accent)); doc.roundedRect(margin, y - 8, maxW, 64, 10, 10, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(255,255,255);
        doc.text("Boletim da Aula de C#", margin + 16, y + 16);
        doc.setFont("helvetica", "normal"); doc.setFontSize(11);
        doc.text(clean(`${s.name}  •  ${meta.city ? meta.city + "  •  " : ""}${mesBr}`), margin + 16, y + 38);
        y += 84;
        const writeP = (text, opts = {}) => {
          const { size = 11, style = "normal", color = "#2a2f45", x = margin, width = maxW, gap = 5 } = opts;
          doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...hexRgb(color));
          doc.splitTextToSize(String(text || " "), width).forEach(line => { doc.text(line, x, y); y += size + gap; });
        };
        writeP("Olá, família! Este é um resumo carinhoso do mês do seu filho (ou filha) na carreta da Aula de C#.", { size: 10.5, style:"italic", color:"#4a5170" });
        y += 8;

        // presença
        const enrollFrom = s.createdAt ? dateKeyOf(s.createdAt) : (Object.keys(s.attendance||{}).sort()[0] || null);
        // só dias já passados contam (o dia de HOJE só entra se o aluno já esteve presente —
        // senão uma aula ainda em andamento viraria "falta" injusta no boletim)
        const myTurmaDays = new Set(turmaCalendar(meta, s.shift||"sem-turno").classDays);
        const myDays = classDays.filter(d => myTurmaDays.has(d) && (!enrollFrom || d >= enrollFrom) && (d < todayKey() || (s.attendance||{})[d] === "present"));
        const presentes = myDays.filter(d => (s.attendance||{})[d] === "present").length;
        const justificadas = myDays.filter(d => (s.attendance||{})[d] !== "present" && (s.justifications||{})[d]?.status === "approved").length;
        const faltas = Math.max(0, myDays.length - presentes - justificadas);
        writeP("Presença", { size: 13, style:"bold", color:"#1f2547" });
        writeP(myDays.length
          ? `Esteve presente em ${presentes} de ${myDays.length} dia${myDays.length===1?"":"s"} de aula${justificadas ? ` (${justificadas} falta${justificadas===1?"":"s"} justificada${justificadas===1?"":"s"})` : ""}${faltas ? ` e teve ${faltas} falta${faltas===1?"":"s"}` : ""}.`
          : "As presenças deste mês ainda estão sendo registradas.");
        y += 8;

        // o que aprendeu (compartilhado da turma, escrito pra leigos)
        writeP("O que aprendeu este mês", { size: 13, style:"bold", color:"#1f2547" });
        aprendeu.forEach(f => {
          doc.setFillColor(...hexRgb(accent)); doc.circle(margin + 4, y - 3.5, 2.5, "F");
          writeP(clean(f), { x: margin + 14, width: maxW - 14 });
        });
        y += 8;

        // conquistas e números
        const conquistas = (s.achievements || []).map(id => achievementInfo(id)).filter(Boolean);
        const destaque = conquistas.filter(a => !a.secret).slice(0, 3).map(a => a.label);
        const linhas = (s.files || []).reduce((n,f) => n + (f.code ? f.code.split("\n").filter(l=>l.trim()).length : 0), 0);
        const melhorNota = Object.values(s.scoreHistory || {}).reduce((b,v) => (v!=null && (b==null||v>b)) ? v : b, null);
        writeP("Números do mês", { size: 13, style:"bold", color:"#1f2547" });
        writeP(`Escreveu ${linhas} linha${linhas===1?"":"s"} de código de verdade${melhorNota!=null ? `, e a melhor nota nas atividades foi ${melhorNota}` : ""}.${conquistas.length ? ` Desbloqueou ${conquistas.length} medalha${conquistas.length===1?"":"s"} na plataforma${destaque.length ? ` — destaque pra: ${destaque.join(", ")}` : ""}.` : ""}`);
        y += 8;

        // recado do Nyx (robô-tutor) — escolhido pelos números, sem depender de IA
        const recado =
          presentes >= 5 && melhorNota != null && melhorNota >= 70 ? "Que mês! Presença firme e notas ótimas. Programar já está virando coisa natural — continuem incentivando em casa, porque tem futuro aqui." :
          linhas >= 100 ? "Esse aluno escreveu MUITO código este mês. A prática é o que forma programadores de verdade — estou orgulhoso!" :
          presentes >= 3 ? "Foi uma alegria ter esse aluno na carreta. Cada aula foi um passo — e os passos já estão virando caminhada. Até a próxima!" :
          "Todo começo é um mundo novo, e o primeiro passo já foi dado. Espero ver essa evolução continuar — as portas da programação estão abertas!";
        doc.setFillColor(...hexRgb("#f2f4fc")); doc.setDrawColor(...hexRgb("#d8dcf0"));
        const recadoLines = doc.splitTextToSize(`Recado do Nyx (o robô-tutor da turma):  ${recado}`, maxW - 24);
        const rh = recadoLines.length * 15 + 16;
        doc.roundedRect(margin, y - 4, maxW, rh, 8, 8, "FD");
        doc.setFont("helvetica", "italic"); doc.setFontSize(10.5); doc.setTextColor(...hexRgb("#4a5170"));
        recadoLines.forEach((ln, j) => doc.text(ln, margin + 12, y + 13 + j * 15));
        y += rh + 12;

        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...hexRgb("#9aa1c2"));
        doc.text("Aula de C#  •  boletim para a família", margin, pageH - 24);
        doc.text(`${idx + 1} / ${turma.length}`, pageW - margin, pageH - 24, { align:"right" });
      });

      if (isSingleStudent) {
        const slug = (turma[0].name||"aluno").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
        doc.save(`boletim-${slug}-${todayKey()}.pdf`);
        setBoletimMsg(`✅ Boletim de ${turma[0].name} gerado!`);
      } else {
        doc.save(`boletins-${scope}-${todayKey()}.pdf`);
        setBoletimMsg(`✅ Boletins gerados (${turma.length} aluno${turma.length===1?"":"s"}, uma página cada).`);
      }
    } catch {
      setBoletimMsg("❌ Não consegui gerar os boletins agora. Tente de novo.");
    }
    setBoletimBusy(false);
  };

  // ── gestão de alunos: renomear, mover de turno, corrigir nota, excluir ──
  // toast em vez de mensagem fixa: aparece na hora, não importa onde na tela a ação foi disparada
  const flashMgmt = (msg) => {
    if (!msg) return;
    if (msg.startsWith("❌")) toast.error(msg.replace(/^❌\s*/, ""));
    else toast.success(msg.replace(/^✅\s*/, ""));
  };

  const doRenameStudent = async (s) => {
    const newName = renameVal.trim();
    if (!s || !newName || newName === s.name) return;
    if (students.some(x => x.name === newName && (x.shift||"sem-turno") === (s.shift||"sem-turno"))) { flashMgmt("❌ Já existe um aluno com esse nome nessa turma."); return; }
    const saved = await saveStudent(s.shift, newName, { ...s, name: newName });
    if (!saved) { flashMgmt("❌ Não consegui salvar o novo nome agora (conexão?). Tente de novo."); return; }
    const deleted = await deleteStudentProfile(s.shift, s.name, teacherAuth);
    await setKick(s.shift, s.name, teacherAuth); // se estiver online, a sessão antiga sai (ele entra de novo com o nome novo)
    setSelected(`${s.shift||"sem-turno"}::${newName}`); setRenameVal("");
    flashMgmt(deleted
      ? `✅ Renomeado para ${newName}. Se estiver online, ele vai precisar entrar de novo.`
      : `⚠️ Renomeado para ${newName}, mas não consegui apagar o registro antigo (ficou uma cópia com o nome "${s.name}" — pode excluir ela na mesma turma).`);
    load();
  };

  const doMoveStudent = async (s, newShift) => {
    if (!s || !newShift || newShift === (s.shift||"sem-turno")) return;
    const saved = await saveStudent(newShift, s.name, { ...s, shift: newShift });
    if (!saved) { flashMgmt("❌ Não consegui mover agora (conexão?). Tente de novo."); return; }
    const deleted = await deleteStudentProfile(s.shift, s.name, teacherAuth);
    await setKick(s.shift, s.name, teacherAuth);
    flashMgmt(deleted
      ? `✅ Movido para ${shiftLabel(newShift, turmas)}. Se estiver online, ele vai precisar entrar de novo.`
      : `⚠️ Movido para ${shiftLabel(newShift, turmas)}, mas não consegui apagar a cópia antiga em ${shiftLabel(s.shift||"sem-turno", turmas)} (fica um card duplicado lá — pode excluir ele por lá).`);
    load();
  };

  // ✅ presença manual: pra dia sem computador (filme, passeio...) — o professor marca a presença
  // de hoje na mão. Vira "present" normal na chamada e na planilha, e NUNCA conta como atrasado
  // (o atraso só é calculado pelo 1º acesso do aluno, que nem existe quando ele não loga).
  const markPresentToday = async (s) => {
    const ok = await patchStudent(s.shift, s.name, { attendance: { ...(s.attendance||{}), [tk]: "present" } });
    // se o aluno estiver com a aba aberta, o autosave periódico dele (que recalcula a presença de
    // hoje sozinho a cada 12s) sobrescreveria essa correção manual sem essa flag — mesma proteção
    // já usada em doSetScore/doApproveJustification/doDisablePortfolio
    if (ok) await setScoreFix(s.shift, s.name, { kind: "attendance", dateKey: tk, status: "present" }, teacherAuth);
    flashMgmt(ok ? `✅ Presença de hoje marcada pra ${s.name}.` : "❌ Não consegui marcar agora. Tente de novo.");
    load();
  };
  const unmarkPresentToday = async (s) => {
    const att = { ...(s.attendance||{}) };
    delete att[tk];
    const ok = await patchStudent(s.shift, s.name, { attendance: att });
    if (ok) await setScoreFix(s.shift, s.name, { kind: "attendance", dateKey: tk, status: null }, teacherAuth);
    flashMgmt(ok ? `↩️ Presença manual de ${s.name} desfeita.` : "❌ Não consegui desfazer agora. Tente de novo.");
    load();
  };

  // 🎁 retrospectiva do mês: liga/desliga por turno (fica no teachermeta, que os alunos já leem)
  const toggleRetro = async (sh) => {
    const cur = metaRef.current.retro || {};
    const next = { ...cur, [sh]: cur[sh] ? null : todayKey() };
    const nm = { ...metaRef.current, retro: next };
    metaRef.current = nm; setMeta(nm);
    await saveTeacherMeta(nm, teacherAuth);
  };

  const doSetScore = async (s) => {
    const v = parseInt(scoreVal, 10);
    if (!s || isNaN(v)) return;
    const nv = Math.max(0, Math.min(100, v));
    const ok = await patchStudent(s.shift, s.name, { score: nv });
    if (ok) await setScoreFix(s.shift, s.name, nv, teacherAuth); // se estiver online, a sessão dele aplica na hora
    setScoreVal("");
    flashMgmt(ok ? `✅ Nota da atividade alterada para ${nv}.` : "❌ Não consegui alterar a nota agora. Tente de novo.");
    load();
  };

  const doDeleteStudent = async (s) => {
    if (!s) return;
    const deleted = await deleteStudentProfile(s.shift, s.name, teacherAuth);
    await setKick(s.shift, s.name, teacherAuth);
    setSelected(null); setConfirmDelete(false);
    flashMgmt(deleted ? "" : "❌ Não consegui excluir agora (conexão?). Tente de novo.");
    load();
  };

  // envia TODOS os arquivos do código da turma (aba "Meu código") pro aluno selecionado — ele recebe na hora
  const doSendClassCode = async (s) => {
    if (!s) return;
    const files = proFilesByShift[s.shift] || proFilesByShift[codeShift] || [];
    if (!files.some(f => (f.code||"").trim())) { flashMgmt("❌ Escreva o código na aba Meu código antes de enviar."); return; }
    const ok = await setCodeSend(s.shift, s.name, files, teacherAuth);
    flashMgmt(ok ? `✅ Código da turma enviado para ${s.name}!` : "❌ Não consegui enviar agora. Tente de novo.");
  };


  const startExam = async () => {
    const examShifts = shiftFilter === "all" ? activeTurmas.map(t=>t.id) : [shiftFilter];
    const proCode = examShifts.flatMap(sh => proFilesByShift[sh]||[]).map(f => (f.code||"")).join("\n").trim();
    const examStudents = shiftFilter === "all" ? students.filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id && (s.shift||"sem-turno") !== LANG_SHIFT.id) : students.filter(s=>(s.shift||"sem-turno")===shiftFilter);
    // pega o código de TODOS os arquivos que cada aluno escreveu ao longo da aula (não só um trecho) —
    // o teto é bem mais generoso que o de outras chamadas porque aqui é o CONTEXTO de entrada (não a
    // resposta), e o resumo da prova precisa enxergar o código de todo mundo, não só uma amostra
    const studentCodes = examStudents
      .map(s => (Array.isArray(s.files) && s.files.length) ? s.files.map(f=>f.code||"").join("\n") : (s.code||""))
      .filter(c => c.trim().length > 5)
      .join("\n\n")
      .slice(0, 30000);
    const codeCtx = [proCode, studentCodes].filter(Boolean).join("\n\n");
    if (!codeCtx) { setExamMsg(`Escreva o código de exemplo na aba Meu código (turma ${shiftFilter==="all"?"Manhã ou Tarde":shiftMeta(shiftFilter, turmas).label}) primeiro!`); return; }
    setExamGenerating(true); setExamMsg("Gerando resumo...");
    try {
      const summaryResult = await askClaude(
        `Aqui está o código C# que a turma inteira escreveu ao longo de TODA a aula de hoje (exemplo do professor e o código de cada aluno, do começo ao fim):\n\`\`\`csharp\n${codeCtx}\n\`\`\`\n\nCrie um RESUMO DE REVISÃO completo e bem elaborado, cobrindo TODOS os conceitos, palavras-chave e estruturas que aparecem nesse código inteiro (não resuma demais nem pule partes só porque parecem simples — se apareceu no código de algum aluno, deve entrar no resumo). Não tem número fixo de tópicos: crie quantos forem necessários pra cobrir de verdade tudo que foi visto, mesmo que passe de 15-20.\n\nPara cada tópico use: emoji + nome do conceito + explicação clara de 2 a 4 frases (contexto de quando/por que se usa, não só uma definição seca) + um exemplo curto tirado do próprio código da turma sempre que possível. Organize os tópicos numa ordem que faça sentido para estudar (do mais básico ao mais avançado). Português simples, direto ao ponto. Sem markdown pesado, use • para cada tópico.`,
        "Você cria resumos de revisão de C# para alunos iniciantes, sendo completo e detalhado — cobre tudo que foi visto, sem cortar conteúdo pra deixar o resumo curto. Português simples.",
        { max_tokens: 4000 }
      );
      setExamMsg("Gerando questões...");
      // 28-32 questões em JSON é a maior resposta pedida em todo o app — precisa de um teto de
      // tokens bem mais alto que o padrão (2000), senão a resposta corta no meio e o parse quebra
      // (era exatamente isso que fazia a criação da prova falhar silenciosamente)
      const parsed = await askClaudeJson(
        `Aqui está o código C# que os PRÓPRIOS ALUNOS escreveram ao longo de TODA a aula de hoje, junto com o exemplo do professor (mas o foco principal são os trechos que os alunos escreveram):\n\`\`\`csharp\n${codeCtx}\n\`\`\`\n\nCrie entre 28 e 32 questões de múltipla escolha cobrindo os CONCEITOS que apareceram no código que os alunos escreveram durante o processo inteiro da aula (não só o trecho final) — o que faz cada palavra-chave/instrução que eles usaram, para que serve cada estrutura, o papel de cada símbolo, o que acontece ao executar cada parte. Priorize perguntar sobre trechos e padrões que aparecem de fato no código dos alunos, não só teoria genérica. Varie a dificuldade e não repita a mesma pergunta com outras palavras. NÃO faça perguntas de matemática.\n\nMuito importante sobre as alternativas: as 3 erradas precisam ser PLAUSÍVEIS — do mesmo tamanho, estilo e nível de detalhe da certa, todas fazendo sentido gramatical com a pergunta. Nada de opção absurda, cômica, vazia ("nenhuma das anteriores" sem necessidade) ou claramente errada só de bater o olho — o objetivo é que só quem realmente entendeu o conceito acerte, não quem eliminou por exclusão óbvia. Use erros comuns e confusões reais de quem tá aprendendo (trocar o nome de um comando parecido, inverter o efeito de algo, confundir um conceito com outro da mesma aula) como base pras alternativas erradas. Responda APENAS JSON puro sem markdown:\n{"questions":[{"q":"pergunta","opts":["A","B","C","D"],"correct":0}]}`,
        "Você cria questões de múltipla escolha sobre C# com alternativas erradas plausíveis (baseadas em erros comuns de iniciante), nunca óbvias ou absurdas. APENAS JSON puro sem markdown.",
        { max_tokens: 6000 }
      );
      // ⏳ 30min de estudo antes da prova poder ser iniciada de verdade — mesmo espírito do
      // chefão: dá tempo pra turma revisar o resumo com calma antes de valer a nota
      const EXAM_STUDY_MS = 30 * 60 * 1000;
      const rawExamQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
      const validExamQuestions = filterValidQuestions(rawExamQuestions);
      if (validExamQuestions.length < rawExamQuestions.length) {
        reportClientError({ message: `Prova da turma ${shiftFilter}: ${rawExamQuestions.length - validExamQuestions.length} questão(ões) geradas sem gabarito válido foram descartadas automaticamente, sem penalizar os alunos.`, url: window.location.pathname, role: "sistema" });
      }
      const newConfig = { status: 'review', questions: shuffleQuestions(validExamQuestions), summary: summaryResult.trim(), shift: shiftFilter, startedAt: Date.now(), studyUntil: Date.now() + EXAM_STUDY_MS };
      await setExamState(newConfig, teacherAuth, shiftFilter);
      setExamConfig(newConfig);
      setExamMsg("✅ Prova criada! Os alunos têm 30min pra estudar. Quando todos estiverem prontos, clique em Iniciar Agora (ou espere o tempo passar).");
    } catch(e) { setExamMsg("Erro ao gerar a prova. Tente de novo."); }
    setExamGenerating(false);
  };

  const activateExam = async () => {
    const newConfig = { ...examConfig, status: 'active', activatedAt: Date.now() };
    await setExamState(newConfig, teacherAuth, examConfig.shift || shiftFilter);
    setExamConfig(newConfig);
    setExamMsg("✅ Prova iniciada! Os alunos estão respondendo.");
  };
  // ⏳ igual ao chefão: quando o tempo de estudo acaba, a prova começa sozinha — não fica travada
  // esperando o professor lembrar de clicar em "Iniciar Agora". A ref evita disparar de novo a cada
  // tick do relógio (1s) enquanto o activateExam ainda está em andamento (chamada assíncrona).
  const examAutoStartedRef = useRef(null);
  useEffect(() => {
    if (examConfig.status !== 'review' || !examConfig.studyUntil || examNow < examConfig.studyUntil) return;
    if (examAutoStartedRef.current === examConfig.startedAt) return;
    examAutoStartedRef.current = examConfig.startedAt;
    activateExam();
  }, [examConfig.status, examConfig.studyUntil, examConfig.startedAt, examNow]); // eslint-disable-line react-hooks/exhaustive-deps

  const endExam = async () => {
    const newConfig = { ...examConfig, status: 'done', endedAt: Date.now() };
    await setExamState(newConfig, teacherAuth, examConfig.shift || shiftFilter);
    setExamConfig(newConfig);
    setExamMsg("✅ Prova encerrada! Veja o ranking abaixo.");
    setConfirmEndExam(false);
  };

  const resetExam = async () => {
    await setExamState({ status: 'idle' }, teacherAuth, examConfig.shift || shiftFilter);
    setExamConfig({ status: 'idle' });
    setExamMsg("");
  };

  const setupDb = async () => {
    setDbSetupLoading(true);
    setDbSetupMsg("");
    setDbSetupSQL(null);
    try {
      const r = await fetch("/api/setup-db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auth: teacherAuth }) });
      const d = await r.json();
      if (d.ok) {
        setDbSetupMsg("✅ " + (d.message || "Banco configurado!"));
        diagnose().then(setDiag);
        load();
      } else if (d.needsSQL) {
        setDbSetupSQL({ sql: d.sql, sqlEditorUrl: d.sqlEditorUrl });
        setDbSetupMsg("Cole o SQL abaixo no Supabase e clique Verificar agora.");
      } else {
        setDbSetupMsg("❌ " + (d.error || "Erro ao configurar banco."));
      }
    } catch (e) {
      setDbSetupMsg("❌ " + String(e.message || e));
    } finally {
      setDbSetupLoading(false);
    }
  };

  // Nyx analisa o desempenho da turma no período + prova
  const nyxExamAnalysis = async () => {
    if (analyzingExam) return;
    setAnalyzingExam(true);
    try {
      // a turma de teste fica fora da análise (é só para testar o sistema); em "Todas", analisa Matutino + Vespertino
      const base = shiftFilter === "all"
        ? students.filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id)
        : students.filter(s => (s.shift||"sem-turno") === shiftFilter);
      const rows = base.map(s => {
        const att = Object.values(s.attendance||{}).filter(v => v === "present").length;
        return `- ${s.name}: presenças com atividade=${att}, nota da atividade do dia=${s.score ?? "não fez"}, nota da prova=${s.examScore ?? "não fez"}, código com erro agora=${s.hasError ? "sim" : "não"}`;
      }).join("\n");
      const out = await askClaude(
        `Você é o Nyx analisando a turma para o PROFESSOR ao final de uma prova.\nDados de cada aluno (período de aulas + prova, provas valem 10 pontos por questão):\n${rows || "(sem alunos)"}\n\nEscreva uma análise curta e útil para o professor:\n• Quem foi bem no período E na prova — cite os números que justificam.\n• Quem se destacou ou surpreendeu (positivo ou negativo).\n• Quem precisa de atenção e em quê, com sugestão prática do que reforçar.\nUse marcadores "•", no máximo ~12 frases no total, sem markdown pesado.`,
        CS_SYSTEM
      );
      setExamAnalysis(out.trim());
    } catch (e) {
      setExamAnalysis(e.message === "ROBOTKEY_MISSING" ? `Nyx está offline: ${e.userMsg || "configure a chave da IA no Vercel."}` : "Não consegui analisar agora. Tente de novo em instantes.");
    }
    setAnalyzingExam(false);
  };

  // 🔍 analisa o código de todo mundo que está sendo mostrado agora (respeita o filtro de turma) de
  // uma vez só, em vez de cada aluno precisar clicar "Analisar código" — pensado pra quando o
  // professor prefere controlar quando o Nyx é chamado, em vez de deixar sob demanda de cada um.
  // Não conta como erro no histórico de mérito do aluno (isso é só um retrato de agora, tirado pelo
  // professor — o errorHistory reflete o próprio processo de tentativa do aluno, não uma checagem externa).
  const analyzeClassCode = async () => {
    if (batchAnalyzing) return;
    const targets = shown.filter(s => {
      const files = Array.isArray(s.files) && s.files.length ? s.files : (s.code ? [{ name:"Program.cs", code:s.code }] : []);
      return files.some(f => (f.code||"").trim().length >= 12);
    });
    if (!targets.length) { setBatchAnalyzeMsg("⚠ Ninguém com código suficiente pra analisar agora."); setTimeout(()=>setBatchAnalyzeMsg(""), 5000); return; }
    setBatchAnalyzing(true);
    setBatchAnalyzeMsg(`🧠 Analisando o código de ${targets.length} aluno(s)...`);
    let okCount = 0, errCount = 0, failCount = 0;
    await Promise.all(targets.map(async (s) => {
      try {
        const files = Array.isArray(s.files) && s.files.length ? s.files : [{ name:"Program.cs", code:s.code||"" }];
        const code = files.map(f => `// ===== ${f.name} =====\n${f.code||""}`).join("\n\n");
        const parsed = await askClaudeJson(
          `Revise o código C# de um aluno iniciante como um COMPILADOR faria, considerando todos os arquivos do projeto dele juntos:\n\n${code}\n\nTop-level statements e ausência de using System são válidos — não são erro. Não invente erro em código correto; na dúvida real, prefira ok=true.\n\nResponda APENAS JSON puro: {"ok": true ou false, "message": "se tudo certo: elogio bem curto; se houver erro: qual é e como corrigir, em 1 a 3 frases gentis"}`,
          CS_SYSTEM + "\nResponda APENAS JSON puro, sem markdown.",
          { temperature: 0 }
        );
        const fb = { ok: !!parsed.ok, message: parsed.message || "" };
        await patchStudent(s.shift, s.name, { feedback: fb, hasError: !fb.ok });
        if (fb.ok) okCount++; else errCount++;
      } catch { failCount++; }
    }));
    setBatchAnalyzeMsg(`✅ ${okCount} sem erro · ⚠️ ${errCount} com erro${failCount ? ` · ❌ ${failCount} não deu pra analisar` : ""}`);
    setBatchAnalyzing(false);
    setTimeout(()=>setBatchAnalyzeMsg(""), 12000);
  };

  const now = Date.now();
  const tk = todayKey();
  const isOnline = (s) => s.lastSeen && (now - s.lastSeen) < 30000;
  // a atividade concluída "vale" até as 9h da manhã do dia seguinte, mesmo que o aluno volte à tela inicial
  const effectivePhase = s => (s.phase !== "done" && isDoneActive(s.doneAt)) ? "done" : s.phase;
  const phaseLabel = p => ({coding:"Codando",generating:"Gerando",summary:"No Resumo",activity:"Na Atividade",done:"Concluído"})[p]||"Aguardando";
  const phaseColor = p => ({coding:"#c084fc",generating:"#fbbf24",summary:"#fbbf24",activity:"#3b82f6",done:"#34d399"})[p]||"#a99ac9";
  const hhmm = t => t ? new Date(t).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "—";
  const hhmmss = t => t ? new Date(t).toLocaleTimeString("pt-BR") : "—";
  const dataHora = t => t ? new Date(t).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

  // filtro por turno
  // "Todos" é só as turmas de verdade (Manhã/Tarde) — turma de teste e sala de idiomas têm aba
  // própria de propósito (ver comentário de TEST_SHIFT em lib/shifts.ts) e não devem poluir
  // contagens/alertas/ranking da turma real quando o professor está usando a própria conta de teste
  const shown = shiftFilter==="all"
    ? students.filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id && (s.shift||"sem-turno") !== LANG_SHIFT.id)
    : students.filter(s => (s.shift||"sem-turno")===shiftFilter);
  const sorted = [...shown].sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt-BR"));
  // chave composta (turno+nome) — se o mesmo nome existir em mais de um turno (ex: sobrou uma cópia
  // velha de uma mudança de turno que falhou), cada card precisa ser selecionável/identificável
  // separadamente; usar só o nome fazia todo clique cair sempre no primeiro encontrado
  const studentKey = s => `${s.shift||"sem-turno"}::${s.name}`;
  // detecta o mesmo nome aparecendo em mais de um turno — geralmente sobra de uma troca de turno/turma
  // que falhou no meio (o antigo bug de duplicação); avisa o professor pra conferir e excluir a cópia errada
  const duplicateGroups = (() => {
    const byName = new Map();
    for (const s of students) {
      const nm = (s.name||"").trim();
      if (!nm) continue;
      if (!byName.has(nm)) byName.set(nm, []);
      byName.get(nm).push(s);
    }
    return [...byName.entries()]
      .filter(([, list]) => new Set(list.map(s=>s.shift||"sem-turno")).size > 1)
      .map(([name, list]) => ({ name, list }));
  })();
  // erros mais comuns HOJE na turma: olha a última análise de cada aluno (feedback), categoriza
  // pelo texto do erro e junta por categoria — ajuda o professor a saber o que reforçar no fechamento
  const commonErrorsToday = (() => {
    const CATS = [
      { label:"Maiúscula/minúscula (Console.WriteLine etc.)", match:(t)=>/maiúscul|minúscul/i.test(t) },
      { label:"Ponto e vírgula faltando",                     match:(t)=>/ponto.e.v[íi]rgula/i.test(t) },
      { label:"Chaves, parênteses ou colchetes",               match:(t)=>/chave|parêntes|colchete/i.test(t) },
      { label:"Aspas",                                         match:(t)=>/aspas/i.test(t) },
      { label:"Variável usada sem declarar",                   match:(t)=>/declarar|não.declarad/i.test(t) },
      { label:"Palavra-chave ou tipo errado",                  match:(t)=>/palavra-chave|tipo errado|min[úu]sculo/i.test(t) },
      { label:"Comparação com = em vez de ==",                 match:(t)=>/==|comparação/i.test(t) },
    ];
    const tally = {};
    shown.forEach(s => {
      if (!s.hasError || !s.feedback) return;
      const texts = Array.isArray(s.feedback.errors) && s.feedback.errors.length
        ? s.feedback.errors.map(e => e.explicacao || "")
        : [s.feedback.message || ""];
      const seenCatsForStudent = new Set();
      texts.forEach(t => {
        const cat = CATS.find(c => c.match(t));
        const label = cat ? cat.label : "Outros erros";
        if (seenCatsForStudent.has(label)) return; // conta 1 aluno por categoria, não 1 por erro
        seenCatsForStudent.add(label);
        if (!tally[label]) tally[label] = { label, count:0, names:[] };
        tally[label].count++;
        tally[label].names.push(s.name);
      });
    });
    return Object.values(tally).sort((a,b)=>b.count-a.count);
  })();
  const sel = selected ? students.find(s=>studentKey(s)===selected) : null;
  useEffect(() => {
    let alive = true;
    if (sel) getAccessMode(sel.shift, sel.name).then(v => { if (alive) setSelAccessMode(v); });
    else setSelAccessMode(false);
    if (sel) getSupport(sel.shift, sel.name).then(v => { if (alive) setSelSupport(v || {}); });
    else setSelSupport({});
    if (sel) getInspection(sel.shift, sel.name).then(v => { if (alive) setSelInspection(v); });
    else setSelInspection(false);
    return () => { alive = false; };
  }, [sel?.shift, sel?.name]);
  const doToggleAccessMode = async (s) => {
    const next = !selAccessMode;
    await setAccessMode(s.shift, s.name, next, teacherAuth);
    setSelAccessMode(next);
    flashMgmt(next ? `✅ Modo Guiado ativado para ${s.name}.` : `✅ Modo Guiado desativado para ${s.name}.`);
  };
  // perfis de apoio: liga/desliga uma marcação e atualiza o mapa geral (indicador nos tiles)
  const doToggleSupport = async (s, flag, label) => {
    const next = { ...selSupport, [flag]: !selSupport[flag] };
    await setSupport(s.shift, s.name, next, teacherAuth);
    setSelSupport(next);
    setSupportMap(m => ({ ...m, [`${s.shift||"sem-turno"}:${s.name}`]: next }));
    flashMgmt(next[flag] ? `💙 ${label} ativado para ${s.name}.` : `✅ ${label} desativado para ${s.name}.`);
  };
  // ✋ marca o pedido de ajuda como atendido (via canal scorefix, que o aluno online obedece)
  const markHelped = async (s) => {
    await setScoreFix(s.shift, s.name, { kind: "help-attended" }, teacherAuth);
    flashMgmt(`✅ Pedido de ajuda de ${s.name} marcado como atendido.`);
  };
  // 📋 aprova a justificativa de uma falta — vira "justificado" na chamada do aluno
  const doApproveJustification = async (s, dateKey) => {
    const next = { ...(s.justifications || {}), [dateKey]: { ...(s.justifications||{})[dateKey], status: "approved" } };
    const ok = await patchStudent(s.shift, s.name, { justifications: next });
    // se o aluno estiver com a aba aberta na hora, o autosave periódico dele reescreve o registro
    // inteiro a partir do estado local (que ainda não sabe da aprovação) e desfaz o patch acima sem
    // querer — o canal scorefix avisa o cliente online pra atualizar o estado local antes de resalvar
    if (ok) await setScoreFix(s.shift, s.name, { kind: "justify-approved", dateKey }, teacherAuth);
    flashMgmt(ok ? `✅ Falta de ${s.name} justificada.` : "❌ Não consegui justificar agora. Tente de novo.");
    load();
  };
  // 🔍 vistoria: libera este aluno específico mesmo fora do horário automático
  const doToggleInspection = async (s) => {
    const next = !selInspection;
    await setInspection(s.shift, s.name, next, teacherAuth);
    setSelInspection(next);
    flashMgmt(next ? `🔍 Vistoria aberta pra ${s.name} — ele pode entrar mesmo fora do horário.` : "✅ Vistoria concluída.");
  };
  // 🌟 portfólio público: o aluno liga por conta própria (opt-in), mas o professor pode desligar
  // se precisar (moderação) — nunca liga no lugar do aluno
  const doDisablePortfolio = async (s) => {
    const ok = await patchStudent(s.shift, s.name, { portfolioPublic: false });
    // mesma proteção do doApproveJustification: se o aluno estiver com a aba aberta, o autosave
    // dele reescreveria o registro inteiro com o "portfolioPublic: true" que ainda está no estado
    // local, desfazendo a moderação sem querer — o scorefix avisa o cliente online antes disso
    if (ok) await setScoreFix(s.shift, s.name, { kind: "portfolio-disabled" }, teacherAuth);
    flashMgmt(ok ? `Portfólio público de ${s.name} desativado.` : "❌ Não consegui desativar agora. Tente de novo.");
    load();
  };
  // 👀 anti-cola: decide a defesa do aluno (aceitar devolve os pontos; recusar mantém o desconto)
  const decideAppeal = async (s, accept) => {
    if (accept) await setScoreFix(s.shift, s.name, { kind: "exam", score: s.examScoreRaw ?? s.examScore ?? 0 }, teacherAuth);
    else await setScoreFix(s.shift, s.name, { kind: "exam-appeal-rejected" }, teacherAuth);
    setExamMsg(accept ? `✅ Pontos da prova devolvidos pra ${s.name}.` : `Desconto mantido pra ${s.name}.`);
    setTimeout(() => setExamMsg(""), 6000);
  };
  // 🤝 parceiro de código: pareia um colega livre (ajudante) com um aluno em dificuldade (ajudado)
  const doPairPartner = async (helped, helperName) => {
    const rec = { helper: helperName, helped: helped.name, shift: helped.shift, status: "active", startedAt: Date.now() };
    await setPartner(helped.shift, helped.name, rec);
    setPartners(prev => [...prev.filter(p => !(p.helped===helped.name && p.shift===helped.shift)), rec]);
    // se o pareamento veio de um pedido do próprio aluno (🙋), avisa o cliente dele pra desligar o "levantei a mão"
    if (helped.wantsPartner) await setScoreFix(helped.shift, helped.name, { kind: "partner-request-cleared" }, teacherAuth);
    flashMgmt(`🤝 ${helperName} vai ajudar ${helped.name}!`);
  };
  // dispensa um pedido de parceiro sem parear ninguém (ex: o aluno já resolveu sozinho)
  const dismissPartnerRequest = async (s) => {
    await setScoreFix(s.shift, s.name, { kind: "partner-request-cleared" }, teacherAuth);
    flashMgmt(`Pedido de parceiro de ${s.name} dispensado.`);
  };
  const doUnpairPartner = async (helped) => {
    await clearPartner(helped.shift, helped.name);
    setPartners(prev => prev.filter(p => !(p.helped===helped.name && p.shift===helped.shift)));
    flashMgmt(`Parceria de ${helped.name} desfeita.`);
  };
  // 📚 aulas salvas pelo professor (o código DELE vira a biblioteca)
  useEffect(() => { getTeacherLessons().then(ls => setMyLessons(Array.isArray(ls) ? ls : [])); }, []);
  const saveCurrentLesson = async () => {
    const files = (proFiles || []).filter(f => (f.code || "").trim());
    if (!files.length) { setNameMsg(`⚠ Programe algo na turma ${shiftMeta(codeShift, turmas).label} primeiro — a aula salva é o código que está no editor.`); setTimeout(()=>setNameMsg(""), 6000); return; }
    const title = lessonName.trim() || `Aula de ${new Date().toLocaleDateString("pt-BR")}`;
    const next = [...myLessons, { title, files: files.map(f => ({ ...f })), at: Date.now() }];
    setMyLessons(next);
    setLessonName("");
    await saveTeacherLessons(next, teacherAuth);
    setNameMsg(`✅ "${title}" salva na sua biblioteca!`);
    setTimeout(()=>setNameMsg(""), 6000);
  };
  const deleteLesson = async (idx) => {
    const next = myLessons.filter((_, i) => i !== idx);
    setMyLessons(next);
    await saveTeacherLessons(next, teacherAuth);
  };

  const lessonContentDone = (lesson) => ({
    contentName: !!lesson.contentName,
    explain: !!lesson.explain,
    resumo: !!lesson.resumo,
    atividade: Array.isArray(lesson.atividade) && lesson.atividade.length > 0,
  });

  // 🧠 gera o nome do conteúdo + explicação (pro PDF) + resumo e atividade (pro aluno) dessa aula
  // salva, e guarda tudo junto com ela na biblioteca. Sempre que esse MESMO código for usado de novo
  // — em qualquer turma, em qualquer dia — computeContentName e o handleSave do aluno reaproveitam
  // esse conteúdo pronto em vez de pedir tudo de novo pro Nyx. Por padrão só pede ao Nyx os campos
  // que AINDA FALTAM (ex: depois de um "📥 Importar" que só trouxe nome+explicação, só gera
  // resumo+atividade); force=true ignora o que já existe e regenera tudo.
  const generateLessonContent = async (idx, force = false) => {
    const lesson = myLessons[idx];
    if (!lesson || lessonGenBusy != null) return;
    const targetAt = lesson.at; // identidade estável da aula-alvo — não confia mais no índice depois das chamadas ao Nyx (ver myLessonsRef acima)
    const done = lessonContentDone(lesson);
    const need = {
      contentName: force || !done.contentName,
      explain: force || !done.explain,
      resumo: force || !done.resumo,
      atividade: force || !done.atividade,
    };
    if (!need.contentName && !need.explain && !need.resumo && !need.atividade) return;
    setLessonGenBusy(idx);
    try {
      const code = lesson.files.filter(f => (f.code||"").trim()).map(f => `// ===== ${f.name} =====\n${f.code}`).join("\n\n");
      const summaryReq = buildSummaryRequest("simples", false, code, code, null, null);
      const [contentNameOut, explainOut, resumoOut, atividadeOut] = await Promise.all([
        need.contentName ? askClaude(
          `Este é o código C# de uma aula:\n\n${code}\n\nANALISE o código com atenção antes de nomear: identifique quais conceitos aparecem de verdade e qual deles é o protagonista da aula.\n\nDepois, gere um NOME DE CONTEÚDO criativo e descritivo para esta aula, em português, que dê orgulho de aparecer no calendário do curso. Pode usar até 12 palavras — capriche: nada de nome genérico tipo "Aula de C#".\n\nResponda APENAS com o nome do conteúdo, sem aspas e sem ponto final.`,
          "Você é um professor criativo que nomeia conteúdos de aulas de C# para iniciantes. Analise o código de verdade e crie um nome específico e caprichado. Responda só com o nome."
        ) : Promise.resolve(lesson.contentName),
        need.explain ? askClaudeJson(
          `Este é o código C# completo de uma aula:\n\`\`\`csharp\n${code}\n\`\`\`\n\nCrie uma explicação COMPLETA e didática desse código, para iniciantes que vão receber este material por escrito e estudar sozinhos. Percorra o código NA ORDEM em que ele aparece. NÃO resuma demais nem pule partes só porque parecem simples — se apareceu no código, precisa ter uma seção explicando.\n\nResponda APENAS em JSON puro válido, sem markdown:\n{\n  "intro": "1 a 2 frases dizendo o que esse código faz como um todo",\n  "secoes": [ { "titulo": "nome curto do conceito/parte", "explicacao": "explicação clara de 2 a 4 frases, em português simples", "exemplo": "trecho C# bem curto ilustrando (opcional — use \\n para quebrar linha)" } ],\n  "dica": "1 frase final incentivando o estudo"\n}\n\nNão tem número fixo de seções: crie quantas forem necessárias pra cobrir TODOS os conceitos e partes importantes de verdade.`,
          "Você é um professor de C# paciente escrevendo um material de estudo completo por escrito para iniciantes — cobre tudo que foi visto, sem cortar conteúdo pra deixar o material curto. Português correto e simples. Responda APENAS JSON puro válido.",
          { max_tokens: 6000 }
        ) : Promise.resolve(lesson.explain),
        need.resumo ? askClaudeJson(summaryReq.prompt, summaryReq.system) : Promise.resolve(lesson.resumo),
        need.atividade ? askClaudeJson(
          `Este código C# é o material de uma aula pra alunos iniciantes:\n\`\`\`csharp\n${code}\n\`\`\`\n\nCrie 8 questões de múltipla escolha focadas em CONCEITOS DE CÓDIGO que aparecem nesse material: o que faz cada palavra-chave/instrução, para que serve cada estrutura, o papel de cada símbolo, a função de cada tipo de dado. Varie a dificuldade (algumas fáceis, algumas médias). NÃO faça perguntas de matemática.\n\nResponda APENAS JSON puro sem markdown:\n{"questions":[{"q":"pergunta","opts":["A","B","C","D"],"correct":0}]}`,
          "Crie questões sobre conceitos de código C#, não matemática. APENAS JSON puro."
        ) : Promise.resolve({ questions: lesson.atividade }),
      ]);
      const contentName = need.contentName ? contentNameOut.replace(/["\n`]/g,"").trim().slice(0,110) : lesson.contentName;
      const atividade = need.atividade ? filterValidQuestions(Array.isArray(atividadeOut.questions) ? atividadeOut.questions : []) : lesson.atividade;
      // relê a biblioteca MAIS RECENTE (não o "myLessons" fechado no closure) e acha a aula-alvo pelo
      // "at": se o professor excluiu ou salvou outras aulas enquanto essas chamadas rodavam, o índice
      // original pode não apontar mais pra aula certa (ou ela pode nem existir mais)
      const latestLessons = myLessonsRef.current;
      const targetIdx = latestLessons.findIndex(l => l.at === targetAt);
      if (targetIdx === -1) {
        setNameMsg(`⚠ "${lesson.title}" foi excluída enquanto o conteúdo era gerado — nada foi salvo.`);
        setTimeout(()=>setNameMsg(""), 8000);
        setLessonGenBusy(null);
        return;
      }
      const next = latestLessons.map((l,i) => i===targetIdx ? { ...l, contentName, explain: explainOut, resumo: resumoOut, atividade } : l);
      setMyLessons(next);
      await saveTeacherLessons(next, teacherAuth);
      setNameMsg(`✅ Conteúdo pronto gerado pra "${lesson.title}" — vai ser reaproveitado toda vez que essa aula for usada.`);
      setTimeout(()=>setNameMsg(""), 8000);
    } catch {
      setNameMsg("❌ Não consegui gerar o conteúdo pronto agora. Tente de novo em instantes.");
      setTimeout(()=>setNameMsg(""), 6000);
    }
    setLessonGenBusy(null);
  };

  // 📥 importa conteúdo JÁ ESCRITO (de um PDF/material de uma turma anterior, por exemplo) direto
  // pra dentro da aula salva, SEM chamar o Nyx nenhuma vez — só os campos presentes no JSON colado
  // são preenchidos, o resto continua como estava (pode completar depois com "Gerar conteúdo pronto").
  const importLessonContent = async (idx) => {
    const lesson = myLessons[idx];
    if (!lesson) return;
    let parsed;
    try { parsed = JSON.parse(importText); } catch { setNameMsg("❌ JSON inválido — confira o texto colado."); setTimeout(()=>setNameMsg(""), 6000); return; }
    const patch = {};
    if (typeof parsed.contentName === "string" && parsed.contentName.trim()) patch.contentName = parsed.contentName.trim().slice(0,110);
    if (parsed.explain && typeof parsed.explain === "object") patch.explain = parsed.explain;
    if (parsed.resumo && typeof parsed.resumo === "object") patch.resumo = parsed.resumo;
    if (Array.isArray(parsed.atividade)) patch.atividade = filterValidQuestions(parsed.atividade);
    if (Object.keys(patch).length === 0) { setNameMsg("⚠ Nenhum campo reconhecido no JSON (use contentName/explain/resumo/atividade)."); setTimeout(()=>setNameMsg(""), 6000); return; }
    const next = myLessons.map((l,i) => i===idx ? { ...l, ...patch } : l);
    setMyLessons(next);
    await saveTeacherLessons(next, teacherAuth);
    setShowImportLesson(null);
    setImportText("");
    setNameMsg(`✅ Conteúdo importado pra "${lesson.title}" sem gastar o Nyx.`);
    setTimeout(()=>setNameMsg(""), 8000);
  };

  // 📦 backup completo: baixa tudo do banco num JSON (seguro antes de resetar/trocar de cidade)
  const exportBackup = async () => {
    setBackupBusy(true);
    try {
      const data = await exportAllData(teacherAuth);
      const payload = { app: "aula-csharp", exportedAt: new Date().toISOString(), city: meta.city || "", totalKeys: Object.keys(data).length, data };
      const blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `backup-aula-csharp-${todayKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {}
    setBackupBusy(false);
  };

  const present = shown.filter(isOnline).length;
  const goingWell = sorted.filter(s => difficultyOf(s).level==="bem");
  const needHelp  = sorted.filter(s => difficultyOf(s).level==="dif");
  // 🙋 quem pediu um parceiro sozinho e ainda não foi pareado — fica visível de cara, sem o
  // professor precisar clicar aluno por aluno pra descobrir quem pediu
  const wantsPartnerList = sorted.filter(s => s.wantsPartner && !partners.some(p => p.status==="active" && p.helped===s.name && (p.shift||"sem-turno")===(s.shift||"sem-turno")));
  // notificação DE VERDADE na tela do professor (não só um aviso escondido dentro de "Meu código"):
  // toca sempre que um aluno NOVO passa a precisar de ajuda, em qualquer aba que o professor esteja
  const needHelpNames = needHelp.map(s=>s.name).sort().join("|");
  const prevNeedHelpRef = useRef("");
  const mountedNeedHelpRef = useRef(false);
  useEffect(() => {
    const prevNames = new Set(prevNeedHelpRef.current ? prevNeedHelpRef.current.split("|") : []);
    const newOnes = needHelp.filter(s => !prevNames.has(s.name));
    if (mountedNeedHelpRef.current && newOnes.length > 0) {
      setStruggleNotice(newOnes.map(s=>s.name).join(", "));
      setTimeout(() => setStruggleNotice(null), 7000);
    }
    mountedNeedHelpRef.current = true;
    prevNeedHelpRef.current = needHelpNames;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needHelpNames]);
  const feedbacks = sorted
    .filter(s => s.classFeedback && (s.classFeedback.rating || (s.classFeedback.text||"").trim()))
    .sort((a,b) => (b.classFeedback.at||0) - (a.classFeedback.at||0));
  // ── visão do DIA: só conta quem apareceu hoje; notas só das conquistas de hoje ──
  // quem entrou na plataforma hoje (no dia seguinte, antes de alguém entrar, tudo zera)
  const todayStudents = sorted.filter(s => isSameDayTs(s.lastSeen));
  // fase "do dia": concluiu conta até as 9h da manhã seguinte; um "done" velho de outro dia volta a contar como codando
  const dayPhase = (s) => {
    if (isDoneActive(s.doneAt)) return "done";
    if (s.phase === "done") return "coding";
    return s.phase;
  };
  // nota da atividade só vale se foi concluída hoje; nota da prova só se a prova atual começou hoje
  const examIsToday = examConfig?.startedAt && isSameDayTs(examConfig.startedAt);
  const todayScoreOf = (s) => {
    const act = isSameDayTs(s.doneAt) && s.score != null ? s.score : -1;
    const exam = examIsToday && s.examScore != null ? s.examScore : -1;
    return Math.max(act, exam);
  };
  // resumo automático (só agregação dos dados já carregados, sem IA)
  const topEntry = todayStudents
    .map(s => ({ s, val: todayScoreOf(s) }))
    .filter(x => x.val >= 0)
    .sort((a,b) => b.val - a.val)[0];
  const topToday = topEntry ? { ...topEntry.s, todayScore: topEntry.val } : null;

  // presença do dia: present (compareceu e fez algo) · idle (entrou mas parado) · absent (não entrou hoje)
  const attStatus = (s) => {
    const a = s.attendance && s.attendance[tk];
    if (a) return a;
    return isSameDayTs(s.lastSeen) ? "present" : "absent";
  };
  // ⏰ atrasado: só faz sentido se o turno tem horário configurado — compara o 1º acesso de HOJE com o início da aula,
  // com 15 min de tolerância (só conta atraso depois disso)
  const LATE_TOLERANCE_MIN = 15;
  const isLate = (s) => {
    const sched = schedule[s.shift];
    const startMin = sched && hmToMin(sched.start);
    const firstToday = s.attendanceFirst && s.attendanceFirst[tk];
    if (startMin == null || !firstToday) return false;
    const d = new Date(firstToday);
    return (d.getHours() * 60 + d.getMinutes()) > startMin + LATE_TOLERANCE_MIN;
  };
  // 📋 faltas pendentes de justificativa (aparecem no detalhe do aluno)
  const pendingJustifications = (s) => Object.entries(s.justifications || {}).filter(([, j]) => j.status === "pending");
  const presentList = sorted.filter(s => attStatus(s)==="present");
  const idleList    = sorted.filter(s => attStatus(s)==="idle");
  const absentList  = sorted.filter(s => attStatus(s)==="absent");
  const contentFor = (sh) => contentNameFor((meta.contentNames||{})[tk], sh);
  // conteúdo de hoje de CADA turma ativa (não só matutino/vespertino) — usado no resumo automático,
  // no aviso do topo e no contexto que o Nyx do professor recebe
  const todayContentByTurma = activeTurmas.map(t => ({ turma: t, content: contentFor(t.id) })).filter(x => x.content);
  // mapa de conteúdo por dia já resolvido para o turno em foco (usado no Calendário)
  const calContentNames = Object.fromEntries(
    Object.entries(meta.contentNames || {})
      .map(([k, v]) => [k, contentNameFor(v, codeShift)])
      .filter(([, v]) => v)
  );

  // lista de chamada separada por turno (a turma de teste só aparece se filtrada explicitamente)
  const chamadaGroups = [...activeTurmas, TEST_SHIFT]
    .filter(sh => shiftFilter === "all" ? sh.id !== TEST_SHIFT.id : shiftFilter === sh.id)
    .map(sh => {
      const list = students.filter(s => (s.shift||"sem-turno")===sh.id).sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt-BR"));
      return {
        shift: sh,
        list,
        online: list.filter(isOnline).length,
        present: list.filter(s=>attStatus(s)==="present"),
        idle: list.filter(s=>attStatus(s)==="idle"),
        absent: list.filter(s=>attStatus(s)==="absent"),
      };
    });

  const styles = {
    container:{ minHeight:"100vh", background:PAGE_BG, color:"#f0e9fb", fontFamily:FONT, paddingLeft: isMobileScreen ? 0 : 190 },
    header:{ background:"rgba(17,21,42,.85)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #3b2a58", boxShadow:"0 1px 0 #fbbf2433, 0 8px 24px rgba(3,5,16,.35)", position:"sticky", top:0, zIndex:40, flexWrap:"wrap", gap:8 },
    card:{ background:"linear-gradient(180deg,#231636,#1a1029)", borderRadius:16, padding:16, margin:"10px 0", border:"1px solid #3a2a55", boxShadow:"0 8px 24px rgba(3,5,16,.35)", animation:"rise .35s ease both" },
    btn:(c)=>({ background:`linear-gradient(135deg, ${c}, ${shade(c,-0.18)})`, color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:800, boxShadow:`0 4px 14px ${c}44` }),
    btnGhost:{ background:"#1c1330", color:"#d6c9ec", border:"1px solid #3b2a58", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:700 },
    badge:(c)=>({ background:c+"22", color:c, padding:"2px 10px", borderRadius:12, fontSize:12, fontWeight:700 }),
    tab:(on)=>({ background:on?"linear-gradient(135deg,#fbbf24,#f59310)":"transparent", color:on?"#1c1400":"#a99ac9", border:`1px solid ${on?"#fbbf24":"#3b2a58"}`, borderRadius:10, padding:"6px 14px", cursor:"pointer", fontWeight:800, fontSize:13, boxShadow:on?"0 4px 12px #fbbf2433":"none" }),
  };
  const dot = (on) => (<span style={{ width:9, height:9, borderRadius:"50%", background:on?"#34d399":"#776798", display:"inline-block", marginRight:6, boxShadow:on?"0 0 6px #34d399":"none", ...(on?{animation:"live-dot 2s ease-in-out infinite"}:{}) }}/>);

  if (isMobileScreen && !forceFullMode) {
    return (
      <MobileMonitorView
        students={students}
        turmas={activeTurmas}
        shiftFilter={shiftFilter}
        setShiftFilter={setShiftFilter}
        tk={tk}
        markPresentToday={markPresentToday}
        unmarkPresentToday={unmarkPresentToday}
        onOpenFull={() => setForceFullMode(true)}
      />
    );
  }

  return (
    <div style={{ ...styles.container, position:"relative" }}>
      <Sparkles id="nyx-teacher-sparkles" position="absolute" count={28} />
      {/* navegação lateral — as mesmas 6 abas que já existiam na barra horizontal, só que fixas
          numa coluna à esquerda (mesmo data-tour-prof, mesmo onClick — o Tour guiado continua
          funcionando igual). As ações (Situação/Telão/Resetar/Tour/Sair) continuam na barra de
          cima, não é navegação entre telas. Some no celular (o modo simples já cobre isso). */}
      {!isMobileScreen && (
        <div style={{ position:"fixed", left:0, top:0, bottom:0, width:190, background:"#160e24ee", backdropFilter:"blur(8px)", borderRight:"1px solid #3b2a58", zIndex:41, display:"flex", flexDirection:"column", gap:4, padding:"18px 10px", overflowY:"auto" }}>
          <div style={{ padding:"0 6px 14px", fontWeight:900, fontSize:13, letterSpacing:1, color:"#fbbf24" }}>👨‍🏫 PAINEL</div>
          <button data-tour-prof="monitor" style={{ ...styles.tab(tab==="monitor"), textAlign:"left", width:"100%" }} onClick={()=>setTab("monitor")}>👥 Monitoramento</button>
          <button data-tour-prof="code" style={{ ...styles.tab(tab==="code"), textAlign:"left", width:"100%" }} onClick={()=>setTab("code")}>👨‍💻 Meu código</button>
          <button data-tour-prof="calendar" style={{ ...styles.tab(tab==="calendar"), textAlign:"left", width:"100%" }} onClick={()=>setTab("calendar")}>🗓️ Calendário</button>
          <button data-tour-prof="feedback" style={{ ...styles.tab(tab==="feedback"), textAlign:"left", width:"100%" }} onClick={()=>setTab("feedback")}>💬 Feedback ({feedbacks.length})</button>
          <button data-tour-prof="exam" style={{ ...styles.tab(tab==="exam"), ...(examConfig.status!=='idle' && tab!=="exam" ? {borderColor:"#fbbf24",color:"#fbbf24"} : {}), textAlign:"left", width:"100%" }} onClick={()=>setTab("exam")}>🏆 Prova{examConfig.status!=='idle'?' ●':''}</button>
          <button data-tour-prof="quiz" style={{ ...styles.tab(tab==="quiz"), ...(quizRoom && tab!=="quiz" ? {borderColor:"#c084fc",color:"#c084fc"} : {}), textAlign:"left", width:"100%" }} onClick={()=>setTab("quiz")}>🎉 Quiz{quizRoom?' ●':''}</button>
        </div>
      )}
      <Toaster theme="dark" position="top-right" richColors closeButton />
      {struggleNotice && (
        <div style={{ position:"fixed", top:12, right:12, zIndex:1300, background:"linear-gradient(135deg,#f87171,#dc2626)", color:"#fff", borderRadius:14, padding:"12px 16px", boxShadow:"0 14px 40px rgba(0,0,0,.45)", display:"flex", alignItems:"center", gap:10, maxWidth:320 }}>
          <span style={{ fontSize:22 }}>⚠️</span>
          <div>
            <div style={{ fontWeight:900, fontSize:13 }}>Precisando de ajuda</div>
            <div style={{ fontSize:12, marginTop:2, lineHeight:1.4 }}>{struggleNotice}</div>
          </div>
        </div>
      )}
      {aiDown && (
        <div style={{ position:"fixed", top:12, left:12, zIndex:1200, background:"#231636", border:"1px solid #fbbf24", borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
          <span style={{ display:"inline-block", width:9, height:9, borderRadius:"50%", background:"#fbbf24", animation:"nyx-antenna 1s ease-in-out infinite" }} />
          <span style={{ color:"#fbbf24", fontSize:12.5, fontWeight:700 }}>🔄 Reconectando Nyx...</span>
        </div>
      )}
      {shiftBreakStatuses.filter(s => s.status.inBreak).map(s => (
        <div key={s.id} style={{ position:"fixed", top: aiDown ? 54 : 12, right:12, zIndex:1200, background:"#0e1f2e", border:"1px solid #22d3ee", borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
          <span style={{ fontSize:15 }}>🍎</span>
          <span style={{ color:"#a5f3fc", fontSize:12.5, fontWeight:700 }}>Intervalo {s.label} · volta em {s.status.minutesToBreakEnd}min</span>
        </div>
      ))}
      {breakEndMsgTeacher && (
        <div style={{ position:"fixed", top:12, right:12, zIndex:1200, background:"#0e1f2e", border:"1px solid #22d3ee", borderRadius:10, padding:"7px 12px", boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
          <span style={{ color:"#a5f3fc", fontSize:12.5, fontWeight:700 }}>{breakEndMsgTeacher}</span>
        </div>
      )}
      {autoNameMsg && (
        <div style={{ position:"fixed", top: breakEndMsgTeacher ? 54 : 12, right:12, zIndex:1200, background:"#1e1b4b", border:"1px solid #a855f7", borderRadius:10, padding:"7px 12px", boxShadow:"0 8px 24px rgba(0,0,0,.4)", maxWidth:340 }}>
          <span style={{ color:"#ddd6fe", fontSize:12.5, fontWeight:700 }}>{autoNameMsg}</span>
        </div>
      )}
      {helpNotice && (
        <div style={{ position:"fixed", top: (breakEndMsgTeacher?42:0) + (autoNameMsg?42:0) + 12, right:12, zIndex:1200, background:"#2a1a10", border:"1px solid #fbbf24", borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
          <span style={{ fontSize:15 }}>✋</span>
          <span style={{ color:"#fcd9a0", fontSize:12.5, fontWeight:700 }}>{helpNotice}</span>
        </div>
      )}
      {errorNotice && (
        <div style={{ position:"fixed", top: (breakEndMsgTeacher?42:0) + (autoNameMsg?42:0) + (helpNotice?42:0) + 12, right:12, zIndex:1200, background:"#2a1010", border:"1px solid #f87171", borderRadius:10, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 24px rgba(0,0,0,.4)", maxWidth:340 }}>
          <span style={{ fontSize:15 }}>⚠️</span>
          <span style={{ color:"#fca5a5", fontSize:12.5, fontWeight:700 }}>{errorNotice}</span>
        </div>
      )}
      <div style={{ ...styles.header, ...(tab==="code" ? { padding:"6px 14px" } : {}) }}>
        <div>
          <span className="shine" style={{ fontWeight:900, fontSize: tab==="code" ? 14 : 18, background:"linear-gradient(120deg,#fbbf24,#fb923c,#fbbf24)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>👨‍🏫 Painel do Professor</span>
          <span style={{ color:"#a99ac9", marginLeft:12, fontSize:12 }}>
            ● ao vivo · {lastUpdate}{turmaCalendar(meta, codeShift).city?` · 📍 ${turmaCalendar(meta, codeShift).city}`:""}
            {todayContentByTurma.length ? ` · 📖 ${todayContentByTurma.map(x=>`${x.turma.emoji} ${x.content}`).join(" · ")}` : ""}
          </span>
          {tab!=="code" && (
            <span data-tour="saude-ia" style={{ marginLeft:12, display:"inline-flex", alignItems:"center", gap:10, fontSize:11.5, verticalAlign:"middle" }}>
              {[["nvidia","✨ Nemotron"],["laguna","🌊 Laguna"]].map(([key,label]) => {
                const h = providerHealth[key];
                const recent = h && Date.now() - h.at < 5 * 60 * 1000;
                const color = !recent ? "#5d679c" : h.ok ? "#34d399" : "#f87171";
                const title = !recent ? `${label}: sem dados recentes` : h.ok ? `${label}: respondendo normalmente` : `${label}: não respondeu na última tentativa`;
                return (
                  <span key={key} title={title} style={{ display:"inline-flex", alignItems:"center", gap:4, color:"#a99ac9" }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:color, display:"inline-block", boxShadow: recent && h.ok ? `0 0 6px ${color}` : "none" }} />
                    {label}
                  </span>
                );
              })}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap: tab==="code" ? 5 : 8, flexWrap:"wrap" }}>
          <button data-tour-prof="situacao" style={{ ...styles.btn(needHelp.length>0 ? "#f87171" : "#34d399"), ...(tab==="code"?{padding:"4px 10px",fontSize:12}:{}) }} onClick={()=>setShowQuickStatus(true)} title="Veja rapidinho quem está com dificuldade, sem sair desta tela">👀 Situação{needHelp.length>0 ? ` (${needHelp.length})` : ""}</button>
          {tab!=="code" && <button className="btn-ghost" data-tour-prof="telao" style={styles.btnGhost} onClick={()=>setShowTelao(true)} title="Tela cheia pra projetar: ranking, meta da turma e combos">🖥️ Telão</button>}
          {isMobileScreen && <button style={styles.btn("#c084fc")} onClick={()=>setForceFullMode(false)} title="Volta pra lista simples de acompanhamento, melhor pro celular">📱 Modo simples</button>}
          {tab!=="code" && <button data-tour-prof="reset" style={styles.btn("#f87171")} onClick={()=>{ setResetScope(shiftFilter); setConfirmReset(true); }} disabled={resetting}>{resetting?"Resetando...":"🔄 Resetar"}</button>}
          {tab!=="code" && <button className="btn-ghost" style={styles.btnGhost} onClick={()=>{ const first = TEACHER_TOUR_STEPS[0]; if (first.tab) setTab(first.tab); setProfTourStep(0); }} title="Tour guiado por todas as funções do painel do professor, entrando em cada aba pra mostrar de verdade">🧭 Tour</button>}
          <button data-tour-prof="sair" style={{ ...styles.btnGhost, fontSize: tab==="code" ? 12 : 13, ...(tab==="code"?{padding:"4px 10px"}:{}) }} onClick={onLogout}>Sair</button>
        </div>
      </div>

      {/* filtro de turno (vale para monitoramento, chamada, situação e feedback) */}
      {tab!=="code" && (
        <div data-tour-prof="turma" style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ color:"#a99ac9", fontSize:13 }}>Turma:</span>
          <button onClick={()=>setShiftFilter("all")} style={styles.tab(shiftFilter==="all")}>Todas ({students.length})</button>
          {activeTurmas.map(sh => (
            <button key={sh.id} onClick={()=>setShiftFilter(sh.id)} style={styles.tab(shiftFilter===sh.id)}>
              {sh.emoji} {sh.label} ({students.filter(s=>(s.shift||"sem-turno")===sh.id).length})
            </button>
          ))}
          {students.some(s=>s.shift===TEST_SHIFT.id) && (
            <button onClick={()=>setShiftFilter(TEST_SHIFT.id)} style={{ ...styles.tab(shiftFilter===TEST_SHIFT.id), opacity:0.75 }}>
              {TEST_SHIFT.emoji} {TEST_SHIFT.label} ({students.filter(s=>s.shift===TEST_SHIFT.id).length})
            </button>
          )}
          {students.some(s=>s.shift===LANG_SHIFT.id) && (
            <button onClick={()=>setShiftFilter(LANG_SHIFT.id)} style={{ ...styles.tab(shiftFilter===LANG_SHIFT.id), opacity:0.75, borderColor: shiftFilter===LANG_SHIFT.id ? undefined : "#22d3ee55" }} title="Amigos estudando outras linguagens (HTML/CSS/PHP/JS), fora da turma de C#">
              {LANG_SHIFT.emoji} {LANG_SHIFT.label} ({students.filter(s=>s.shift===LANG_SHIFT.id).length})
            </button>
          )}
        </div>
      )}

      {/* urgências primeiro — pedidos de ajuda e alunos parados resumidos logo no topo do
          Monitoramento, antes de qualquer gráfico ou card secundário. Não substitui o resto do
          painel (Situação, cards por aluno etc. continuam do mesmo jeito), só antecipa o que
          precisa de atenção agora. */}
      {tab==="monitor" && (needHelp.length > 0 || idleList.length > 0) && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px", display:"flex", gap:8, flexWrap:"wrap" }}>
          {needHelp.length > 0 && (
            <div style={{ flex:"1 1 260px", background:"#f8717118", border:"1px solid #f87171", borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>🙋</span>
              <span style={{ fontSize:13, color:"#fca5a5" }}><b style={{ color:"#f87171" }}>{needHelp.length} pedido{needHelp.length!==1?"s":""} de ajuda:</b> {needHelp.slice(0,3).map(s=>String(s.name).split(" ")[0]).join(", ")}{needHelp.length>3?` e mais ${needHelp.length-3}`:""}</span>
            </div>
          )}
          {idleList.length > 0 && (
            <div style={{ flex:"1 1 260px", background:"#fbbf2418", border:"1px solid #fbbf24", borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>💤</span>
              <span style={{ fontSize:13, color:"#fcd9a0" }}><b style={{ color:"#fbbf24" }}>{idleList.length} parado{idleList.length!==1?"s":""}:</b> {idleList.slice(0,3).map(s=>String(s.name).split(" ")[0]).join(", ")}{idleList.length>3?` e mais ${idleList.length-3}`:""}</span>
            </div>
          )}
        </div>
      )}

      {/* aviso de resultado do reset */}
      {resetMsg && (
        <div style={{ maxWidth:1180, margin:"10px auto 0", padding:"0 14px" }}>
          <div style={{ background:"#1e1430", border:`1px solid ${resetMsg.startsWith("✅")?"#34d399":"#f87171"}`, color:resetMsg.startsWith("✅")?"#34d399":"#f87171", borderRadius:10, padding:"10px 14px", fontSize:14 }}>{resetMsg}</div>
        </div>
      )}

      {showTelao && <TelaoModal students={students} shift={shiftFilter} turmas={activeTurmas} onClose={()=>setShowTelao(false)} teacherAuth={teacherAuth} />}
      {showQuickStatus && <QuickStatusModal students={sorted} onClose={()=>setShowQuickStatus(false)} />}
      {showTripOverview && <TripOverviewModal entries={tripHallEntries} currentCity={turmaCalendar(meta, codeShift).cityClosed ? null : turmaCalendar(meta, codeShift).city} onClose={()=>setShowTripOverview(false)} />}
      {rankingRevealQueue.length > 0 && (
        <RankingRevealModal turmaLabel={rankingRevealQueue[0].turmaLabel} entries={rankingRevealQueue[0].entries} onClose={()=>setRankingRevealQueue(q=>q.slice(1))} />
      )}

      {dailyPdfModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:640, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <h2 style={{ margin:0, fontSize:19, fontWeight:900, background:"linear-gradient(135deg,#fbbf24,#fb923c)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📄 Resumo de hoje — {dailyPdfModal.studentName}</h2>
              <button onClick={()=>setDailyPdfModal(null)} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
            </div>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 12px", lineHeight:1.6 }}>
              Confirme (ou cole por cima) o código que você passou HOJE pra turma {shiftLabel(dailyPdfModal.shift, turmas)}. O Nyx explica exatamente o que estiver aqui embaixo — só o que já estava salvo em "Meu código" veio pré-preenchido.
            </p>
            <textarea value={dailyPdfCode} onChange={e=>setDailyPdfCode(e.target.value)} disabled={dailyPdfBusy} rows={14} spellCheck={false}
              style={{ width:"100%", background:"#171026", border:"2px solid #3b2a58", borderRadius:12, padding:"10px 12px", color:"#f0e9fb", fontFamily:"'Courier New',monospace", fontSize:12.5, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
            <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
              <button onClick={()=>exportDailyPDF(dailyPdfModal.shift, dailyPdfModal.studentName, dailyPdfCode)} disabled={dailyPdfBusy || !dailyPdfCode.trim()} style={{ ...styles.btn("#fbbf24"), padding:"9px 18px", fontSize:13.5, opacity: (dailyPdfBusy || !dailyPdfCode.trim()) ? 0.6 : 1 }}>
                {dailyPdfBusy ? "⏳ Gerando..." : "✅ Gerar PDF"}
              </button>
              <button onClick={()=>setDailyPdfModal(null)} disabled={dailyPdfBusy} style={{ ...styles.btnGhost, padding:"9px 18px", fontSize:13.5 }}>Cancelar</button>
            </div>
            {dailyPdfMsg && <p style={{ color: dailyPdfMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:12.5, marginTop:10 }}>{dailyPdfMsg}</p>}
          </div>
        </div>
      )}

      {/* biblioteca de aulas: as SUAS aulas salvas (o seu código) + modelos de exemplo */}
      {showLessons && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:640, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:900, background:"linear-gradient(135deg,#34d399,#22d3ee)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>📚 Minhas aulas</h2>
              <button onClick={()=>setShowLessons(false)} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
            </div>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 14px" }}>Sua biblioteca: salve o código que está no editor com um nome e reutilize em qualquer turma, quantas vezes quiser. Carregar uma aula <b>substitui</b> o código atual da turma {shiftMeta(codeShift, turmas).label}.</p>

            {/* salvar a aula atual */}
            <div style={{ background:"#171026", border:"1px dashed #34d399", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
              <p style={{ color:"#34d399", fontSize:12.5, fontWeight:800, margin:"0 0 8px" }}>💾 Salvar o código atual ({shiftMeta(codeShift, turmas).label}) como aula</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <input value={lessonName} onChange={e=>setLessonName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveCurrentLesson()} placeholder={`Nome da aula (ex: Variáveis e ReadLine)`}
                  style={{ flex:"1 1 220px", background:"#1a1029", border:"1px solid #3b2a58", borderRadius:10, padding:"8px 12px", color:"#f0e9fb", fontSize:13, outline:"none" }} />
                <button onClick={saveCurrentLesson} style={{ ...styles.btn("#34d399"), padding:"8px 14px", fontSize:12.5 }}>💾 Salvar</button>
              </div>
            </div>

            {/* aulas salvas */}
            {myLessons.length === 0 ? (
              <p style={{ color:"#776798", fontSize:13, marginBottom:14 }}>Você ainda não salvou nenhuma aula. Programe na aba Meu código e clique em Salvar acima — ela aparece aqui pra sempre.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                {myLessons.map((lesson, li) => {
                  const done = lessonContentDone(lesson);
                  const allDone = done.contentName && done.explain && done.resumo && done.atividade;
                  const anyDone = done.contentName || done.explain || done.resumo || done.atividade;
                  const genLabel = lessonGenBusy===li ? "🧠 Gerando..." : allDone ? "🔄 Atualizar tudo" : anyDone ? "🧠 Completar conteúdo" : "🧠 Gerar conteúdo pronto";
                  return (
                  <div key={li} style={{ display:"flex", alignItems:"center", gap:10, background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"10px 14px", flexWrap:"wrap" }}>
                    <div style={{ flex:"1 1 220px" }}>
                      <p style={{ color:"#f0e9fb", fontWeight:800, fontSize:13.5, margin:0 }}>{lesson.title}</p>
                      <p style={{ color:"#776798", fontSize:11.5, margin:"3px 0 0" }}>salva em {new Date(lesson.at).toLocaleDateString("pt-BR")} · {lesson.files.length} arquivo{lesson.files.length!==1?"s":""}</p>
                      {allDone
                        ? <span title="Nome, explicação, resumo e atividade prontos — reaproveitados sozinhos toda vez que essa aula for usada, sem gastar o Nyx de novo" style={{ display:"inline-block", marginTop:5, background:"#34d39922", border:"1px solid #34d399", color:"#34d399", borderRadius:20, padding:"1px 9px", fontSize:10.5, fontWeight:800 }}>🧠 Conteúdo pronto</span>
                        : anyDone
                        ? <span title="Só uma parte do conteúdo está pronta ainda" style={{ display:"inline-block", marginTop:5, background:"#fbbf2422", border:"1px solid #fbbf24", color:"#fbbf24", borderRadius:20, padding:"1px 9px", fontSize:10.5, fontWeight:800 }}>🧩 Conteúdo parcial</span>
                        : <span style={{ display:"inline-block", marginTop:5, color:"#776798", fontSize:10.5 }}>Sem conteúdo pronto ainda</span>}
                    </div>
                    <button onClick={()=>generateLessonContent(li, allDone)} disabled={lessonGenBusy!=null} title="Gera (só o que ainda falta) o nome, a explicação, o resumo e a atividade dessa aula, e guarda pronto — reaproveitado sozinho toda vez que esse código for usado de novo" style={{ ...styles.btn("#c084fc"), padding:"7px 12px", fontSize:12, opacity:lessonGenBusy!=null?0.6:1 }}>{genLabel}</button>
                    <button onClick={()=>{ setShowImportLesson(li); setImportText(""); }} disabled={lessonGenBusy!=null} title="Cole um JSON com conteúdo já pronto (de um PDF/material antigo, por exemplo) sem gastar o Nyx" style={{ background:"transparent", border:"1px solid #22d3ee", color:"#22d3ee", borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer" }}>📥 Importar</button>
                    <button onClick={()=>{ setProFiles(lesson.files.map(f => ({ ...f }))); setShowLessons(false); setNameMsg(`✅ "${lesson.title}" carregada na turma ${shiftMeta(codeShift, turmas).label}! O código já está no editor.`); setTimeout(()=>setNameMsg(""), 7000); }}
                      style={{ ...styles.btn("#34d399"), padding:"7px 14px", fontSize:12.5 }}>Usar esta aula →</button>
                    <button onClick={()=>deleteLesson(li)} title="Excluir esta aula da biblioteca" style={{ background:"transparent", border:"1px solid #f8717155", color:"#f87171", borderRadius:8, padding:"6px 10px", fontSize:12, cursor:"pointer" }}>✕</button>
                  </div>
                  );
                })}
              </div>
            )}

            {/* modelos de exemplo (secundário, recolhido) */}
            <button onClick={()=>setShowModels(v=>!v)} style={{ background:"transparent", border:"1px solid #3b2a58", color:"#a99ac9", borderRadius:10, padding:"7px 14px", fontSize:12.5, cursor:"pointer", width:"100%" }}>
              {showModels ? "▾" : "▸"} Modelos de exemplo do Nyx ({LESSON_LIBRARY.length}) — ponto de partida, se quiser
            </button>
            {showModels && (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:10 }}>
                {LESSON_LIBRARY.map((lesson, li) => (
                  <div key={li} style={{ display:"flex", alignItems:"center", gap:10, background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"10px 14px", flexWrap:"wrap" }}>
                    <div style={{ flex:"1 1 260px" }}>
                      <p style={{ color:"#f0e9fb", fontWeight:800, fontSize:13.5, margin:0 }}>{lesson.title}</p>
                      <p style={{ color:"#a99ac9", fontSize:12, margin:"3px 0 0" }}>{lesson.desc}</p>
                    </div>
                    <button onClick={()=>{ setProFiles(lesson.files.map(f => ({ ...f }))); setShowLessons(false); setNameMsg(`✅ "${lesson.title}" carregada na turma ${shiftMeta(codeShift, turmas).label}! O código já está no editor.`); setTimeout(()=>setNameMsg(""), 7000); }}
                      style={{ ...styles.btnGhost, padding:"7px 14px", fontSize:12.5 }}>Usar este modelo →</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📥 importar conteúdo já pronto (colado como JSON) sem chamar o Nyx */}
      {showImportLesson != null && myLessons[showImportLesson] && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,6,20,.82)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div className="pop" style={{ background:"linear-gradient(180deg,#231636,#1a1029)", border:"1px solid #3e2d5e", borderRadius:22, padding:"22px 24px", maxWidth:560, width:"100%", boxShadow:"0 24px 70px rgba(0,0,0,.55)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:900, color:"#22d3ee" }}>📥 Importar conteúdo pronto</h2>
              <button onClick={()=>{ setShowImportLesson(null); setImportText(""); }} style={{ background:"transparent", border:"none", color:"#a99ac9", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
            </div>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"0 0 12px" }}>
              Pra "{myLessons[showImportLesson].title}". Cole um JSON com o conteúdo que você já tem pronto (de um PDF ou material de uma turma anterior, por exemplo) — nenhuma chamada ao Nyx é feita. Só os campos presentes são preenchidos; o resto pode ser completado depois com "Gerar conteúdo pronto".
            </p>
            <textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder={'{\n  "contentName": "...",\n  "explain": { "intro": "...", "secoes": [...], "dica": "..." },\n  "resumo": { "intro": "...", "secoes": [...], "dica": "..." },\n  "atividade": [ { "q": "...", "opts": ["A","B","C","D"], "correct": 0 } ]\n}'}
              rows={10} style={{ width:"100%", background:"#171026", border:"1px solid #3b2a58", borderRadius:12, padding:"10px 12px", color:"#f0e9fb", fontSize:12.5, fontFamily:"monospace", outline:"none", resize:"vertical", boxSizing:"border-box" }} />
            <button onClick={()=>importLessonContent(showImportLesson)} disabled={!importText.trim()} style={{ ...styles.btn("#22d3ee"), width:"100%", padding:"9px 0", fontSize:13, marginTop:12, opacity:importText.trim()?1:0.6 }}>📥 Importar sem gastar o Nyx</button>
          </div>
        </div>
      )}

      {/* confirmação de reset (dentro do app, sem depender do navegador) */}
      {confirmReset && (
        <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#1e1430", border:"2px solid #f87171", borderRadius:16, padding:24, maxWidth:440, width:"100%" }}>
            <div style={{ fontSize:40, textAlign:"center" }}>⚠️</div>
            <h3 style={{ color:"#f87171", textAlign:"center", margin:"8px 0" }}>Resetar perfis dos alunos?</h3>
            <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.6, textAlign:"center" }}>Isso apaga os alunos escolhidos e tudo o que eles fizeram (códigos, atividades e feedbacks). O calendário, a cidade e os nomes de conteúdo <b>não</b> são apagados. Não dá para desfazer.</p>
            <button onClick={exportBackup} disabled={backupBusy} style={{ ...styles.btn("#34d399"), width:"100%", padding:"9px 0", fontSize:13, margin:"10px 0 4px", opacity:backupBusy?0.7:1 }}>
              {backupBusy ? "⏳ Gerando backup..." : "📦 Baixar backup completo antes de apagar (recomendado)"}
            </button>
            <p style={{ color:"#a99ac9", fontSize:13, margin:"14px 0 6px" }}>O que você quer resetar?</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={()=>setResetScope("all")} style={{ ...styles.tab(resetScope==="all"), flex:"1 1 120px" }}>☀️🌙 Todas as turmas</button>
              {activeTurmas.map(sh => (
                <button key={sh.id} onClick={()=>setResetScope(sh.id)} style={{ ...styles.tab(resetScope===sh.id), flex:"1 1 120px" }}>Só {sh.emoji} {sh.label}</button>
              ))}
            </div>
            <p style={{ color:"#776798", fontSize:11.5, margin:"6px 0 0" }}>A turma de teste e a sala de linguagens nunca são apagadas por aqui — se precisar limpar uma delas, é só entrar nela e usar o botão de resetar de dentro dela.</p>
            <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:14, fontSize:13, color:"#d6c9ec", cursor:"pointer" }}>
              <input type="checkbox" checked={resetClearMyCode} onChange={e=>setResetClearMyCode(e.target.checked)} />
              🗑️ Também limpar o meu código (aba "Meu código") do(s) turno(s) escolhido(s)
            </label>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={()=>setConfirmReset(false)} style={{ ...styles.btnGhost, flex:1 }}>Cancelar</button>
              <button onClick={doReset} style={{ ...styles.btn("#f87171"), flex:1 }}>{resetScope==="all"?"Resetar todas as turmas":`Resetar ${shiftMeta(resetScope, turmas).label}`}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── MONITORAMENTO ─────────── */}
      {tab==="monitor" && (
        <div style={{ display:"flex", gap:14, padding:14, maxWidth:1180, margin:"0 auto", alignItems:"flex-start", flexWrap:"wrap" }}>
          {/* esquerda */}
          <div className="side-col" style={{ width:300, flex:"0 0 300px" }}>
            {/* Nyx de olho na turma */}
            <div className="cardfx" style={{ ...styles.card, textAlign:"center", borderColor: needHelp.length>0 ? "#f87171" : "#3a2a55" }}>
              <NyxRobot state={needHelp.length>0 ? "error" : shown.length>0 ? "ok" : "idle"} size={64} showName={false} />
              <div style={{ fontWeight:900, letterSpacing:2, fontSize:12, color:"#fbbf24", marginTop:2 }}>NYX DE OLHO</div>
              <p style={{ color: needHelp.length>0 ? "#fca5a5" : "#a99ac9", fontSize:13, lineHeight:1.6, margin:"6px 0 0" }}>
                {needHelp.length > 0
                  ? <>⚠ Atenção com: <b style={{color:"#f0e9fb"}}>{needHelp.slice(0,4).map(s=>String(s.name).split(" ")[0]).join(", ")}{needHelp.length>4 ? ` e mais ${needHelp.length-4}` : ""}</b> — clique no aluno para ver o que houve.</>
                  : shown.length > 0 ? "Turma indo bem! Ninguém travado no momento. 👍" : "Aguardando alunos entrarem..."}
              </p>
            </div>

            {/* Chamada — separada por turno */}
            <CollapsibleCard title="📋 Lista de Chamada" dataTourProf="chamada" headerRight={<>
              <span style={styles.badge("#34d399")}>{present} online / {shown.length}</span>
              <button onClick={async ()=>{ await Promise.all(shown.map(s=>setKeyboardLaunch(s.shift, s.name, teacherAuth))); flashMgmt(`⌨️ Tutorial de teclado aberto pra ${shown.length} aluno(s).`); }} style={{ ...styles.btn("#22d3ee"), padding:"5px 10px", fontSize:12 }} title="Abre o tutorial de teclado na tela de todos os alunos filtrados">⌨️ Abrir teclado pra todos</button>
            </>}>
              {shown.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>Nenhum aluno na chamada ainda.</p> : (
                chamadaGroups.map((g, gi) => (
                  <div key={g.shift.id} style={{ marginTop: gi>0 ? 18 : 0, paddingTop: gi>0 ? 16 : 0, borderTop: gi>0 ? "1px solid #3b2a58" : "none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
                      <b style={{ color:"#f0e9fb", fontSize:14 }}>{g.shift.emoji} {g.shift.label}</b>
                      <span style={styles.badge("#34d399")}>{g.online} online / {g.list.length}</span>
                      <button onClick={()=>toggleKeyboardLock(g.shift.id)}
                        title={keyboardLocks[g.shift.id] ? "Libera o editor de código dos alunos dessa turma" : "Congela o editor de código dos alunos dessa turma (ex: pra pedir atenção)"}
                        style={{ ...styles.btn(keyboardLocks[g.shift.id] ? "#f87171" : "#3b2a58"), padding:"3px 9px", fontSize:11.5 }}>
                        {keyboardLocks[g.shift.id] ? "🔒 Teclado travado" : "🔓 Travar teclado"}
                      </button>
                    </div>
                    {g.list.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>Nenhum aluno nesta turma ainda.</p> : (
                      <>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                          <span style={styles.badge("#34d399")}>✅ {g.present.length} presente{g.present.length!==1?"s":""}</span>
                          <span style={styles.badge("#fbbf24")}>⚠ {g.idle.length} sem atividade</span>
                          <span style={styles.badge("#f87171")}>❌ {g.absent.length} falta{g.absent.length!==1?"s":""}</span>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:8 }}>
                          {g.list.map((s, tileIdx)=>{
                            const st = attStatus(s);
                            const late = (st==="present"||st==="idle") && isLate(s);
                            const stColor = late?"#fb923c":st==="present"?"#34d399":st==="idle"?"#fbbf24":"#f87171";
                            const stLabel = late?"⏰ Atrasado":st==="present"?"✅ Presente":st==="idle"?"⚠ Sem atividade":"❌ Falta";
                            return (
                              <div key={s.name} className="tilefx" style={{ background:"#171026", border:`1px solid ${st==="absent"?"#3f2530":"#3b2a58"}`, borderRadius:8, padding:"8px 10px", opacity:st==="absent"?0.7:1, animationDelay:`${Math.min(tileIdx*45, 500)}ms` }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <Avatar cfg={s.avatar} size={28} />
                                  <span style={{ fontSize:14, flex:1 }}>{dot(isOnline(s))}{s.name}</span>
                                  <span style={{ color:"#776798", fontSize:11 }}>{hhmm(s.joinedAt)}</span>
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, flexWrap:"wrap" }}>
                                  <span style={styles.badge(stColor)}>{stLabel}</span>
                                  {st==="idle" && (
                                    nudged[s.name]
                                      ? <span style={{ color:"#34d399", fontSize:11, fontWeight:600 }}>aviso enviado ✓</span>
                                      : <button onClick={()=>nudgeStudent(s)} style={{ background:"transparent", color:"#fbbf24", border:"1px solid #fbbf24", borderRadius:8, padding:"2px 8px", fontSize:11, fontWeight:600, cursor:"pointer" }}>👀 Enviar aviso</button>
                                  )}
                                  {st!=="present" && (
                                    <button onClick={()=>markPresentToday(s)} title="Marca a presença de hoje na mão (dia de filme, passeio, atividade sem computador...) — conta como presente normal, sem atraso" style={{ background:"transparent", color:"#34d399", border:"1px solid #34d399", borderRadius:8, padding:"2px 8px", fontSize:11, fontWeight:600, cursor:"pointer" }}>✅ Marcar presente</button>
                                  )}
                                  {st==="present" && !isSameDayTs(s.lastSeen) && (
                                    <button onClick={()=>unmarkPresentToday(s)} title="Este aluno foi marcado presente na mão (ele não entrou hoje) — clique pra desfazer" style={{ background:"transparent", color:"#a99ac9", border:"1px solid #56407e", borderRadius:8, padding:"2px 8px", fontSize:11, fontWeight:600, cursor:"pointer" }}>↩️ Desfazer</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </CollapsibleCard>

            <div data-tour-prof="exportar" className="cardfx" style={styles.card}>
              <h4 style={{ color:"#fbbf24", marginBottom:10, fontSize:14 }}>📊 Turma hoje</h4>
              {/* conta só quem entrou HOJE — no dia seguinte, antes de alguém entrar, fica tudo no 0 */}
              {["coding","summary","activity","done"].map(p=>(
                <div key={p} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:phaseColor(p), fontSize:13 }}>{phaseLabel(p)}</span>
                  <span style={styles.badge(phaseColor(p))}>{todayStudents.filter(s=>dayPhase(s)===p).length}</span>
                </div>
              ))}
              <hr style={{ borderColor:"#3b2a58", margin:"8px 0" }}/>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#a99ac9", fontSize:13 }}>Média de hoje</span>
                <span style={{ color:"#34d399", fontWeight:700 }}>{(() => {
                  const done = todayStudents.filter(s => s.score!=null && isSameDayTs(s.doneAt));
                  return done.length > 0 ? Math.round(done.reduce((a,s)=>a+s.score,0)/done.length)+" pts" : "—";
                })()}</span>
              </div>
              <button onClick={exportCSV} style={{ ...styles.btnGhost, width:"100%", marginTop:10, padding:"7px 0", fontSize:12.5 }} title="Baixa uma planilha colorida e organizada por turno (abre no Excel), com presenças, notas e situação de cada aluno (sem a turma de teste)">
                ⬇️ Exportar planilha (Excel)
              </button>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center", marginTop:8 }}>
                <span style={{ color:"#776798", fontSize:11 }}>PDF de:</span>
                {[{ id:"all", emoji:"🏫", label:"Todas" }, ...activeTurmas].map(sh => (
                  <button key={sh.id} onClick={()=>setPdfScope(sh.id)} style={{ background: pdfScope===sh.id ? "linear-gradient(135deg,#c084fc,#9333ea)" : "#171026", color: pdfScope===sh.id ? "#fff" : "#a99ac9", border:`1px solid ${pdfScope===sh.id?"#c084fc":"#3b2a58"}`, borderRadius:8, padding:"3px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>{sh.emoji} {sh.label}</button>
                ))}
              </div>
              <button onClick={()=>exportPDF(pdfScope)} disabled={pdfGenerating} style={{ ...styles.btn("#c084fc"), width:"100%", marginTop:6, padding:"7px 0", fontSize:12.5, opacity: pdfGenerating ? 0.7 : 1 }} title="Gera um material de estudo em PDF: o código do professor (aba Meu código) com as explicações do Nyx — sem nome de aluno, pronto pra enviar pro turno escolhido">
                {pdfGenerating ? "⏳ Gerando PDF..." : "📄 Exportar PDF (códigos + explicações)"}
              </button>
              {pdfMsg && <p style={{ color: pdfMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:11.5, marginTop:6 }}>{pdfMsg}</p>}
              <button onClick={exportBackup} disabled={backupBusy} style={{ ...styles.btn("#34d399"), width:"100%", marginTop:8, padding:"7px 0", fontSize:12.5, opacity:backupBusy?0.7:1 }} title="Baixa um arquivo com TUDO (alunos, notas, presenças, códigos, configurações) — guarde antes de resetar ou trocar de cidade">
                {backupBusy ? "⏳ Gerando backup..." : "📦 Baixar backup completo"}
              </button>
            </div>

            <CollapsibleCard title="🔧 Conexão" alertOpen={!!diag && (diag.hasStorage === false || diag.hasAI === false)}>
              {diag ? (
                <div style={{ color:"#d6c9ec", lineHeight:1.7 }}>
                  <div>
                    Armazenamento: <b style={{ color:diag.hasStorage?"#34d399":"#f87171" }}>{diag.hasStorage?"OK":"NÃO"}</b>
                    {diag.writeRead!=="—" && <> · <b style={{ color:diag.writeRead==="ok"?"#34d399":"#f87171" }}>{diag.writeRead}</b></>}
                  </div>
                  <div>Nyx (IA): <b style={{ color:diag.hasAI===true?"#34d399":diag.hasAI===false?"#f87171":"#a99ac9" }}>{diag.hasAI===true?"OK":diag.hasAI===false?"NÃO":"—"}</b></div>

                  {!diag.hasStorage && diag.writeRead === "erro" && diag.quotaSuspect && (
                    <div style={{ background:"#fbbf2415", border:"1px solid #fbbf24", borderRadius:8, padding:"10px 12px", marginTop:8, lineHeight:1.9 }}>
                      <b style={{ color:"#fbbf24" }}>⚠ Parece ter estourado a cota do plano grátis</b><br/>
                      <span style={{ color:"#a99ac9" }}>
                        O erro que voltou do banco tem cara de <b style={{color:"#f0e9fb"}}>limite do plano grátis do Supabase</b> (banda/egress, armazenamento ou requisições) — diferente de projeto pausado. Confira em <b style={{color:"#f0e9fb"}}>supabase.com</b> → seu projeto → <b style={{color:"#34d399"}}>Settings → Billing/Usage</b> se algum item está no limite. Se estiver, dá pra esperar renovar no mês seguinte ou fazer upgrade de plano.<br/>
                        Depois clique <b style={{color:"#34d399"}}>↻ Verificar agora</b> abaixo.
                      </span>
                      {diag.err && <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #fbbf2433", color:"#c9b98a", fontSize:11, fontFamily:"monospace", wordBreak:"break-word" }}>Erro técnico: {diag.err}</div>}
                    </div>
                  )}

                  {!diag.hasStorage && diag.writeRead === "erro" && !diag.quotaSuspect && (
                    <div style={{ background:"#f8717115", border:"1px solid #f87171", borderRadius:8, padding:"10px 12px", marginTop:8, lineHeight:1.9 }}>
                      <b style={{ color:"#f87171" }}>❌ Não consegui conectar no banco</b><br/>
                      <span style={{ color:"#a99ac9" }}>
                        Como já funcionava antes, o mais provável é o banco ter <b style={{color:"#f0e9fb"}}>pausado sozinho</b> (comum no plano grátis do Supabase depois de alguns dias sem uso) — os dados continuam salvos, só precisa "acordar" ele:<br/>
                        &nbsp;• Entre em <b style={{color:"#f0e9fb"}}>supabase.com</b>, abra o projeto e clique em <b style={{color:"#34d399"}}>Restore/Resume project</b><br/>
                        &nbsp;• Se não estiver pausado, confira no Vercel → Settings → Environment Variables se <code style={{color:"#60a5fa"}}>SUPABASE_URL</code> e <code style={{color:"#60a5fa"}}>SUPABASE_SERVICE_KEY</code> continuam lá<br/>
                        Depois clique <b style={{color:"#34d399"}}>↻ Verificar agora</b> abaixo.
                      </span>
                      {diag.err && <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #f8717133", color:"#c9a5a5", fontSize:11, fontFamily:"monospace", wordBreak:"break-word" }}>Erro técnico: {diag.err}</div>}
                    </div>
                  )}

                  {!diag.hasStorage && diag.writeRead !== "erro" && (
                    <div style={{ background:"#f8717115", border:"1px solid #f87171", borderRadius:8, padding:"10px 12px", marginTop:8, lineHeight:1.9 }}>
                      <b style={{ color:"#f87171" }}>❌ Banco não configurado</b><br/>
                      <span style={{ color:"#a99ac9" }}>
                        No Supabase → <b style={{color:"#f0e9fb"}}>Settings → API</b>:<br/>
                        &nbsp;• Copie <b style={{color:"#fbbf24"}}>Project URL</b> → adicione no Vercel como <code style={{color:"#60a5fa"}}>SUPABASE_URL</code><br/>
                        &nbsp;• Copie <b style={{color:"#fbbf24"}}>service_role</b> → adicione no Vercel como <code style={{color:"#60a5fa"}}>SUPABASE_SERVICE_KEY</code><br/>
                        Depois clique <b style={{color:"#34d399"}}>Inicializar banco</b> abaixo.
                      </span>
                    </div>
                  )}

                  {/* SQL manual quando não tem DATABASE_PASSWORD */}
                  {dbSetupSQL && (
                    <div style={{ background:"#1e3a5f", border:"1px solid #3b82f6", borderRadius:8, padding:"10px 12px", marginTop:8 }}>
                      <b style={{ color:"#93c5fd", fontSize:12 }}>Execute este SQL no Supabase:</b>
                      <pre style={{ background:"#171026", borderRadius:6, padding:"8px 10px", margin:"6px 0", fontSize:11, color:"#22d3ee", overflowX:"auto", userSelect:"all" }}>{dbSetupSQL.sql}</pre>
                      <a href={dbSetupSQL.sqlEditorUrl} target="_blank" rel="noreferrer"
                        style={{ display:"inline-block", background:"#3b82f6", color:"#fff", borderRadius:6, padding:"4px 12px", fontSize:12, textDecoration:"none", marginRight:8 }}>
                        Abrir SQL Editor →
                      </a>
                      <span style={{color:"#a99ac9",fontSize:11}}>Cole o SQL acima, clique Run, depois ↻ Verificar agora</span>
                    </div>
                  )}

                  {diag.hasAI === false && (
                    <div style={{ background:"#fbbf2415", border:"1px solid #fbbf24", borderRadius:8, padding:"10px 12px", marginTop:8, lineHeight:1.8 }}>
                      <b style={{ color:"#fbbf24" }}>⚠ Nyx (IA) sem chave de API</b><br/>
                      <span style={{ color:"#a99ac9" }}>
                        Escolha UMA opção e adicione no Vercel → Settings → Environment Variables:<br/>
                        &nbsp;• <b style={{color:"#f0e9fb"}}>NVIDIA</b>: build.nvidia.com → adicione <code style={{color:"#60a5fa"}}>NVIDIA_API_KEY</code> + <code style={{color:"#60a5fa"}}>NVIDIA_MODEL</code><br/>
                        &nbsp;• <b style={{color:"#f0e9fb"}}>Claude</b>: console.anthropic.com → adicione <code style={{color:"#60a5fa"}}>ANTHROPIC_API_KEY</code><br/>
                        Depois é só dar <b style={{color:"#f0e9fb"}}>Redeploy</b>.
                      </span>
                    </div>
                  )}
                </div>
              ) : <span style={{ color:"#776798" }}>verificando...</span>}
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
                <button style={{ ...styles.btnGhost, padding:"4px 10px", fontSize:12 }} onClick={()=>{ setDbSetupSQL(null); setDbSetupMsg(""); diagnose().then(setDiag); load(); }}>↻ Verificar agora</button>
                <button style={{...styles.btn("#34d399"),padding:"4px 10px",fontSize:12,opacity:dbSetupLoading?0.6:1}} onClick={setupDb} disabled={dbSetupLoading}>{dbSetupLoading?"...":"🔧 Inicializar banco"}</button>
              </div>
              {dbSetupMsg && (
                <p style={{color:dbSetupMsg.startsWith("✅")?"#34d399":dbSetupMsg.startsWith("Cole")?"#93c5fd":"#f87171",fontSize:12,marginTop:6}}>{dbSetupMsg}</p>
              )}
            </CollapsibleCard>

            <CollapsibleCard title="🚨 Erros recentes" color="#f87171" headerRight={
              <button style={{ ...styles.btnGhost, padding:"3px 10px", fontSize:11.5 }} onClick={loadRecentErrors} disabled={errorsLoading}>{errorsLoading ? "..." : "↻ Verificar"}</button>
            }>
              <p style={{ color:"#776798", fontSize:11.5, lineHeight:1.6, margin:"0 0 8px" }}>
                Erros de JS que quebraram sozinhos na tela de algum aluno ou sua, e avisos do sistema (como uma questão de prova/atividade gerada sem gabarito válido), sem precisar que ninguém perceba e avise. Não mostra código nem dado pessoal — só a mensagem, de onde veio e quando.
              </p>
              {recentErrors === null ? (
                <p style={{ color:"#776798", fontSize:12 }}>Clique em "↻ Verificar" pra carregar.</p>
              ) : recentErrors.length === 0 ? (
                <p style={{ color:"#34d399", fontSize:12.5 }}>✅ Nenhum erro registrado.</p>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:260, overflowY:"auto" }}>
                  {recentErrors.map((e, i) => (
                    <div key={i} style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"8px 10px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:10.5, color:"#776798", marginBottom:3 }}>
                        <span>{e.role === "student" ? "🧑‍🎓 aluno" : e.role === "teacher" ? "🧑‍🏫 professor" : e.role === "sistema" ? "⚠️ aviso do sistema" : "❔ anônimo"} · {e.url || "?"}</span>
                        <span>{e.at ? new Date(e.at).toLocaleString("pt-BR") : "?"}</span>
                      </div>
                      <p style={{ color:"#f0e9fb", fontSize:12, margin:0, wordBreak:"break-word" }}>{e.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleCard>

            <CollapsibleCard title="🔐 Ações administrativas" color="#c084fc" headerRight={
              <button style={{ ...styles.btnGhost, padding:"3px 10px", fontSize:11.5 }} onClick={loadAdminLog} disabled={adminLogLoading}>{adminLogLoading ? "..." : "↻ Verificar"}</button>
            }>
              <p style={{ color:"#776798", fontSize:11.5, lineHeight:1.6, margin:"0 0 8px" }}>
                Toda ação que exigiu a senha do professor (apagar, travar teclado, mudar configuração de turma etc.) — pra você saber quando a senha foi usada e pra quê, mesmo que não tenha sido você.
              </p>
              {adminLog === null ? (
                <p style={{ color:"#776798", fontSize:12 }}>Clique em "↻ Verificar" pra carregar.</p>
              ) : adminLog.length === 0 ? (
                <p style={{ color:"#34d399", fontSize:12.5 }}>✅ Nenhuma ação registrada ainda.</p>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:260, overflowY:"auto" }}>
                  {adminLog.map((a, i) => (
                    <div key={i} style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"8px 10px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:10.5, color:"#776798", marginBottom:3 }}>
                        <span>{a.action} · {a.ip || "?"}</span>
                        <span>{a.at ? new Date(a.at).toLocaleString("pt-BR") : "?"}</span>
                      </div>
                      <p style={{ color:"#f0e9fb", fontSize:12, margin:0, wordBreak:"break-word" }}>{a.key || "(sem chave)"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleCard>

            <CollapsibleCard title="📖 Conteúdo de hoje" dataTourProf="conteudo-auto">
              {activeTurmas.map((t, i) => {
                const content = contentFor(t.id);
                return content
                  ? <p key={t.id} style={{ color:"#34d399", fontSize:13, fontWeight:600, lineHeight:1.5, margin: i===0?0:"4px 0 0" }}>{t.emoji} {t.label}: {content}</p>
                  : <p key={t.id} style={{ color:"#a99ac9", fontSize:12.5, lineHeight:1.5, margin: i===0?0:"4px 0 0" }}>{t.emoji} {t.label}: ainda não definido</p>;
              })}
              <p style={{ color:"#776798", fontSize:11.5, lineHeight:1.5, margin:"8px 0 0" }}>Programe o exemplo na aba <b>Meu código</b> e gere um nome automático. (Se ainda não programou, uso o código dos alunos.)</p>
              <button style={{ ...styles.btn("#c084fc"), padding:"6px 12px", fontSize:13, marginTop:8, width:"100%", opacity:genName?0.6:1 }} onClick={generateContentNameFiltered} disabled={genName}>{genName?"Gerando...":"✨ Gerar nome do conteúdo"}</button>
              {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:12, marginTop:8, lineHeight:1.5 }}>{nameMsg}</p>}
            </CollapsibleCard>

            <CollapsibleCard title="💌 Boletim pros responsáveis" color="#f9a8d4" dataTourProf="boletim">
              <p style={{ color:"#776798", fontSize:11.5, lineHeight:1.5, margin:"0 0 8px" }}>Um PDF com uma página por aluno, em linguagem simples pra família: presenças, o que aprendeu, medalhas e um recado do Nyx. Bom pra mandar pra casa no fim do mês. Pra gerar de 1 aluno só, selecione ele no Monitoramento e use o botão no painel de Gerenciar aluno.</p>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center", marginBottom:8 }}>
                <span style={{ color:"#776798", fontSize:11 }}>Boletim de:</span>
                {[{ id:"all", emoji:"🏫", label:"Todos" }, ...activeTurmas].map(sh => (
                  <button key={sh.id} onClick={()=>setBoletimScope(sh.id)} style={{ background: boletimScope===sh.id ? "linear-gradient(135deg,#ec4899,#be185d)" : "#171026", color: boletimScope===sh.id ? "#fff" : "#a99ac9", border:`1px solid ${boletimScope===sh.id?"#ec4899":"#3b2a58"}`, borderRadius:8, padding:"3px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>{sh.emoji} {sh.label}</button>
                ))}
              </div>
              <button onClick={()=>exportBoletins(boletimScope)} disabled={boletimBusy}
                style={{ ...styles.btn("#ec4899"), padding:"6px 12px", fontSize:12.5, width:"100%", opacity: boletimBusy ? 0.6 : 1 }}>
                {boletimBusy ? "Gerando..." : "💌 Gerar boletins"}
              </button>
              {boletimMsg && <p style={{ color: boletimMsg.startsWith("✅") ? "#34d399" : boletimMsg.startsWith("❌") ? "#f87171" : "#fbbf24", fontSize:12, marginTop:8, lineHeight:1.5 }}>{boletimMsg}</p>}
            </CollapsibleCard>

            <CollapsibleCard title="🎁 Retrospectiva do mês" color="#c4b5fd" dataTourProf="retro">
              <p style={{ color:"#776798", fontSize:11.5, lineHeight:1.5, margin:"0 0 8px" }}>Libere no fim do mês: cada aluno vê uma tela especial com os números dele (linhas de código, presenças, conquistas...). Cada um vê a sua uma vez só.</p>
              {activeTurmas.map(sh => {
                const on = !!(meta.retro || {})[sh.id];
                return (
                  <button key={sh.id} onClick={()=>toggleRetro(sh.id)}
                    style={{ ...styles.btn(on ? "#34d399" : "#c084fc"), padding:"6px 12px", fontSize:12.5, width:"100%", marginTop:6 }}>
                    {on ? `✅ Liberada pra turma ${sh.label} — clique pra recolher` : `🎁 Liberar pra turma ${sh.label}`}
                  </button>
                );
              })}
            </CollapsibleCard>

            {commonErrorsToday.length > 0 && (
              <div className="cardfx" style={{ ...styles.card, fontSize:12 }}>
                <h4 style={{ color:"#f87171", fontSize:13, marginBottom:6 }}>🩹 Erros mais comuns agora</h4>
                <p style={{ color:"#776798", fontSize:11.5, lineHeight:1.5, margin:"0 0 8px" }}>Baseado na última verificação do Nyx em cada aluno — bom pra saber o que reforçar no fechamento da aula.</p>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {commonErrorsToday.slice(0, 6).map(c => (
                    <div key={c.label} title={c.names.join(", ")} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"6px 10px" }}>
                      <span style={{ color:"#f0e9fb", fontSize:12 }}>{c.label}</span>
                      <span style={{ background:"#f8717122", border:"1px solid #f87171", color:"#f87171", borderRadius:20, padding:"1px 9px", fontSize:11, fontWeight:800 }}>{c.count} aluno{c.count>1?"s":""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* direita */}
          <div style={{ flex:"1 1 420px", minWidth:300 }}>
            <div data-tour-prof="monitor-grid" className="cardfx" style={styles.card} {...(isMobileScreen ? {} : { onMouseEnter:()=>setMonitorHover(true), onMouseLeave:()=>setMonitorHover(false) })}>
              <h3 style={{ color:"#fbbf24", marginBottom:12, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <span>👥 Monitoramento ({shown.length})</span>
                <button onClick={analyzeClassCode} disabled={batchAnalyzing} title="Analisa o código de todo mundo mostrado aqui de uma vez, em vez de cada aluno precisar clicar Analisar código" style={{ ...styles.btn("#c084fc"), padding:"4px 10px", fontSize:11.5, opacity:batchAnalyzing?0.6:1 }}>{batchAnalyzing?"🧠 Analisando...":"🔍 Analisar turma"}</button>
                {isMobileScreen && monitorHover && (
                  <button onClick={()=>setMonitorHover(false)} style={{ background:"transparent", border:"1px solid #3b2a58", color:"#a99ac9", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>🙈 Ocultar</button>
                )}
                {duplicateGroups.length > 0 && (
                  <div style={{ position:"relative" }} {...(isMobileScreen ? {} : { onMouseEnter:()=>setShowDupHover(true), onMouseLeave:()=>setShowDupHover(false) })}>
                    <span onClick={()=>setShowDupHover(v=>!v)} style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#fbbf2422", border:"1px solid #fbbf24", color:"#fbbf24", borderRadius:20, padding:"4px 10px", fontSize:11.5, fontWeight:700, cursor:"pointer" }}>
                      ⚠ {duplicateGroups.length} duplicado{duplicateGroups.length!==1?"s":""}
                    </span>
                    {showDupHover && (
                      <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:50, width:300, background:"linear-gradient(180deg,#2a2015,#1a1029)", border:"1px solid #fbbf24", borderRadius:12, padding:"12px 14px", boxShadow:"0 14px 40px rgba(0,0,0,.5)" }}>
                        <p style={{ color:"#a99ac9", fontSize:12, margin:"0 0 8px", lineHeight:1.5 }}>Esse nome aparece em mais de um turno/turma — geralmente sobra de uma troca que falhou no meio. Clique no turno pra abrir e conferir.</p>
                        {duplicateGroups.map(g => (
                          <div key={g.name} style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", padding:"6px 0", borderTop:"1px solid #3b2a5855" }}>
                            <b style={{ color:"#f0e9fb", fontSize:13 }}>{g.name}</b>
                            {g.list.map(s => (
                              <button key={studentKey(s)} onClick={()=>{ setShiftFilter(s.shift||"sem-turno"); setSelected(studentKey(s)); setShowDupHover(false); }} style={{ ...styles.badge("#fbbf24"), cursor:"pointer", border:"1px solid #fbbf24", background:"transparent" }}>{shiftLabel(s.shift, turmas)}</button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </h3>
              {batchAnalyzeMsg && <p style={{ color:batchAnalyzeMsg.startsWith("⚠")?"#fbbf24":"#a99ac9", fontSize:12, margin:"-6px 0 10px" }}>{batchAnalyzeMsg}</p>}
              {shown.length===0 && <p style={{ color:"#776798", fontSize:13 }}>{students.length===0 ? "Aguardando alunos entrarem..." : "Nenhum aluno nesta turma. Veja outra turma no filtro acima."}</p>}
              {shown.length > 0 && !monitorHover && (
                <div onClick={()=>setMonitorHover(true)} style={{ padding:"36px 0", textAlign:"center", color:"#776798", fontSize:13, cursor:"pointer" }}>
                  {isMobileScreen ? `👆 Toque aqui pra ver os ${shown.length} aluno${shown.length!==1?"s":""}` : `🖱️ Passe o mouse aqui pra ver os ${shown.length} aluno${shown.length!==1?"s":""}`}
                </div>
              )}
              {shown.length > 0 && monitorHover && (
              <div style={{ maxHeight:400, overflowY:"auto", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(128px,1fr))", gap:8 }}>
                {sorted.map((s, tileIdx)=>{
                  const d = difficultyOf(s);
                  const hasHand = s.helpAt && Date.now() - s.helpAt < 15 * 60 * 1000; // pedido de ajuda expira em 15 min
                  const hasError = s.errorAt && Date.now() - s.errorAt < 30 * 60 * 1000; // aviso de erro expira em 30 min
                  return (
                    <div key={studentKey(s)} className="tilefx" onClick={()=>setSelected(studentKey(s)===selected?null:studentKey(s))} style={{ position:"relative", background:selected===studentKey(s)?"#c084fc22":hasHand?"#fbbf2415":hasError?"#f8717115":"#171026", border:`2px solid ${selected===studentKey(s)?"#c084fc":hasHand?"#fbbf24":hasError?"#f87171":"#3b2a58"}`, borderRadius:10, padding:"10px 10px 8px", cursor:"pointer", textAlign:"center", animationDelay:`${Math.min(tileIdx*45, 500)}ms` }}>
                      {hasHand && <span title="Pediu ajuda! Clique pra ver e marcar como atendido." style={{ position:"absolute", top:4, right:24, fontSize:15, animation:"pulse-dot 1s ease-in-out infinite" }}>✋</span>}
                      {hasError && <span title={`A tela deu um erro: ${s.errorMsg || "sem detalhes"}`} style={{ position:"absolute", top:4, right: hasHand?42:24, fontSize:15 }}>⚠️</span>}
                      {s.score!=null && isSameDayTs(s.doneAt) && <span style={{ position:"absolute", top:6, left:6, background:"#34d39922", border:"1px solid #34d399", color:"#34d399", borderRadius:6, padding:"1px 6px", fontSize:10.5, fontWeight:800 }}>🏆 {s.score}</span>}
                      {Object.values(supportMap[`${s.shift||"sem-turno"}:${s.name}`] || {}).some(Boolean) && (
                        <span title="Aluno com perfil de apoio ativo (clique pra ver no detalhe)" style={{ position:"absolute", bottom:6, left:6, fontSize:11 }}>💙</span>
                      )}
                      {checkinMap[`${s.shift||"sem-turno"}:${s.name}`] && (() => {
                        const mood = checkinMoodInfo(checkinMap[`${s.shift||"sem-turno"}:${s.name}`].mood);
                        return mood ? <span title={`Chegou hoje: ${mood.label}`} style={{ position:"absolute", bottom:6, right:6, fontSize:13 }}>{mood.emoji}</span> : null;
                      })()}
                      <span style={{ position:"absolute", top:8, right:8 }}>{dot(isOnline(s))}</span>
                      <div style={{ marginTop:s.score!=null?16:4 }}>
                        <Avatar cfg={s.avatar} size={44} />
                      </div>
                      <div style={{ fontWeight:700, fontSize:12.5, marginTop:6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.name}</div>
                      <div style={{ marginTop:4 }}>
                        <span style={{ ...styles.badge(phaseColor(effectivePhase(s))), fontSize:10.5 }}>{phaseLabel(effectivePhase(s))}</span>
                      </div>
                      <div style={{ marginTop:5 }}>
                        <span style={{ ...styles.badge(d.level==="dif"?"#f87171":d.level==="bem"?"#34d399":"#a99ac9"), fontSize:10.5 }}>{d.level==="dif"?"⚠ Com dificuldade":d.level==="bem"?"✅ Indo bem":"• Começando"}</span>
                      </div>
                      <div style={{ color:"#776798", fontSize:10.5, marginTop:5 }}>visto {hhmmss(s.lastSeen)}</div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            {/* Resumo automático (sem clicar em nada — só agregação dos dados) */}
            <div className="cardfx" style={{ ...styles.card, borderColor:"#c084fc" }}>
              <h3 style={{ color:"#c084fc", marginBottom:10 }}>📋 Resumo automático</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:13 }}>
                <div style={{ color: absentList.length ? "#f87171" : "#776798" }}>
                  {absentList.length > 0
                    ? <>🚫 <b>{absentList.length}</b> ausente{absentList.length>1?"s":""} hoje: {absentList.slice(0,5).map(s=>String(s.name).split(" ")[0]).join(", ")}{absentList.length>5?` e mais ${absentList.length-5}`:""}</>
                    : "✅ Ninguém ausente hoje nessa turma"}
                </div>
                <div style={{ color: needHelp.length ? "#fbbf24" : "#776798" }}>
                  {needHelp.length > 0
                    ? <>⚠ <b>{needHelp.length}</b> com dificuldade agora: {needHelp.slice(0,5).map(s=>String(s.name).split(" ")[0]).join(", ")}{needHelp.length>5?` e mais ${needHelp.length-5}`:""}</>
                    : "✅ Ninguém com dificuldade agora"}
                </div>
                {wantsPartnerList.length > 0 && (
                  <div style={{ color:"#a855f7" }}>
                    🙋 <b>{wantsPartnerList.length}</b> pediu{wantsPartnerList.length>1?"ram":""} um parceiro: {wantsPartnerList.slice(0,5).map(s=>String(s.name).split(" ")[0]).join(", ")}{wantsPartnerList.length>5?` e mais ${wantsPartnerList.length-5}`:""} — clique no aluno pra parear
                  </div>
                )}
                {topToday && (
                  <div style={{ color:"#34d399" }}>🌟 Destaque de hoje: <b>{topToday.name}</b> ({topToday.todayScore} pts)</div>
                )}
              </div>
            </div>

            {/* Situação da turma */}
            <div className="cardfx" style={styles.card}>
              <h3 style={{ color:"#fbbf24", marginBottom:10 }}>📈 Situação da turma</h3>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:"1 1 200px" }}>
                  <p style={{ color:"#34d399", fontWeight:700, marginBottom:6 }}>✅ Indo bem ({goingWell.length})</p>
                  {goingWell.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>—</p> : goingWell.map(s=>(
                    <div key={s.name} style={{ fontSize:13, color:"#d6c9ec", marginBottom:4 }}>• <b>{s.name}</b>: {difficultyOf(s).text}</div>
                  ))}
                </div>
                <div style={{ flex:"1 1 200px" }}>
                  <p style={{ color:"#f87171", fontWeight:700, marginBottom:6 }}>⚠ Precisam de ajuda ({needHelp.length})</p>
                  {needHelp.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>—</p> : needHelp.map(s=>(
                    <div key={s.name} style={{ fontSize:13, color:"#d6c9ec", marginBottom:4 }}>• <b>{s.name}</b>: {difficultyOf(s).text}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Evolução da turma ao longo das aulas — média das notas de atividade por dia, juntando todo mundo */}
            {(() => {
              const relevant = shown.filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id);
              const byDate = {};
              relevant.forEach(s => {
                Object.entries(s.scoreHistory||{}).forEach(([d,n]) => {
                  if (typeof n !== "number") return;
                  (byDate[d] = byDate[d] || []).push(n);
                });
              });
              const trend = Object.entries(byDate)
                .map(([date, scores]) => ({ date, avg: Math.round(scores.reduce((a,b)=>a+b,0)/scores.length), count: scores.length }))
                .sort((a,b) => a.date.localeCompare(b.date))
                .slice(-14);
              if (trend.length < 2) return null;
              const delta = trend[trend.length-1].avg - trend[0].avg;
              const trendLabel = delta >= 8 ? { text:"📈 Melhorando", color:"#34d399" } : delta <= -8 ? { text:"📉 Caindo", color:"#f87171" } : { text:"➡ Estável", color:"#a99ac9" };
              return (
                <div className="cardfx" style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                    <h3 style={{ color:"#c084fc", margin:0 }}>📊 Evolução da turma nas últimas aulas</h3>
                    <span style={{ ...styles.badge(trendLabel.color) }}>{trendLabel.text}</span>
                  </div>
                  <p style={{ color:"#776798", fontSize:12, margin:"0 0 12px" }}>Média da nota de atividade de todos os alunos, dia a dia — ajuda a ver se a turma está indo melhor ou pior de uma aula pra outra.</p>
                  <ClassTrendChart trend={trend} />
                </div>
              );
            })()}

            {/* Evolução da PRESENÇA ao longo das aulas — % de quem já tinha entrado na turma
                naquele dia e foi marcado presente, juntando todo mundo (mesmo cálculo usado na
                planilha e no boletim: só conta quem já era da turma naquele dia) */}
            {(() => {
              const relevant = shown.filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id);
              const classDaysList = [...new Set(relevant.flatMap(s => turmaCalendar(meta, s.shift||"sem-turno").classDays))].sort();
              const byDate = {};
              relevant.forEach(s => {
                const enrollFrom = s.createdAt ? dateKeyOf(s.createdAt) : (Object.keys(s.attendance||{}).sort()[0] || null);
                const myTurmaDays = new Set(turmaCalendar(meta, s.shift||"sem-turno").classDays);
                classDaysList.forEach(d => {
                  if (!myTurmaDays.has(d)) return; // não era dia de aula na turma dele
                  if (enrollFrom && d < enrollFrom) return; // ainda não tinha entrado na turma
                  if (d >= todayKey() && !(s.attendance||{})[d]) return; // hoje sem presença marcada ainda não conta como falta
                  const bucket = (byDate[d] = byDate[d] || { present:0, total:0 });
                  bucket.total++;
                  if ((s.attendance||{})[d] === "present") bucket.present++;
                });
              });
              const trend = Object.entries(byDate)
                .filter(([,b]) => b.total > 0)
                .map(([date, b]) => ({ date, avg: Math.round((b.present / b.total) * 100), count: b.total }))
                .sort((a,b) => a.date.localeCompare(b.date))
                .slice(-14);
              if (trend.length < 2) return null;
              const delta = trend[trend.length-1].avg - trend[0].avg;
              const trendLabel = delta >= 8 ? { text:"📈 Melhorando", color:"#34d399" } : delta <= -8 ? { text:"📉 Caindo", color:"#f87171" } : { text:"➡ Estável", color:"#a99ac9" };
              return (
                <div className="cardfx" style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                    <h3 style={{ color:"#199e70", margin:0 }}>🗓️ Evolução da presença nas últimas aulas</h3>
                    <span style={{ ...styles.badge(trendLabel.color) }}>{trendLabel.text}</span>
                  </div>
                  <p style={{ color:"#776798", fontSize:12, margin:"0 0 12px" }}>Porcentagem de alunos presentes a cada aula (só conta quem já tinha entrado na turma naquele dia) — ajuda a perceber cedo se a frequência está caindo.</p>
                  <ClassTrendChart trend={trend} unit="%" gradId="attendanceTrendGrad" color="#199e70" />
                </div>
              );
            })()}

            {/* Detalhe do aluno */}
            {sel ? (
              <>
                <div className="cardfx" style={styles.card}>
                  <h3 style={{ color:"#fbbf24", display:"flex", alignItems:"center", gap:10 }}><Avatar cfg={sel.avatar} size={34} />{dot(isOnline(sel))}{sel.name}</h3>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:8 }}>
                    <span style={styles.badge(phaseColor(effectivePhase(sel)))}>{phaseLabel(effectivePhase(sel))}</span>
                    {sel.score!=null && <span style={styles.badge("#34d399")}>🏆 {sel.score} pts</span>}
                    {(() => { const d=difficultyOf(sel); return <span style={styles.badge(d.level==="dif"?"#f87171":"#34d399")}>{d.level==="dif"?"⚠ "+d.text:"✅ "+d.text}</span>; })()}
                  </div>
                </div>

                {/* 🤝 Parceiro de código: pareia um colega livre com quem está em dificuldade */}
                <div className="cardfx" style={{ ...styles.card, borderColor: sel.wantsPartner ? "#a855f7" : "#22d3ee" }}>
                  <h4 style={{ color:"#22d3ee", marginBottom:12 }}>🤝 Parceiro de código</h4>
                  {sel.wantsPartner && (
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", background:"#a855f710", border:"1px solid #a855f7", borderRadius:8, padding:"8px 10px", marginBottom:10 }}>
                      <span style={{ color:"#a855f7", fontSize:12.5, fontWeight:800, flex:"1 1 180px" }}>🙋 {sel.name} pediu um parceiro às {new Date(sel.wantsPartner).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}!</span>
                      <button onClick={()=>dismissPartnerRequest(sel)} style={{ ...styles.btnGhost, padding:"4px 10px", fontSize:11.5 }}>Dispensar</button>
                    </div>
                  )}
                  {(() => {
                    const selShift = sel.shift || "sem-turno";
                    const selPartner = partners.find(p => p.helped===sel.name && (p.shift||"sem-turno")===selShift && p.status==="active");
                    const selHelping = partners.find(p => p.helper===sel.name && p.status==="active");
                    if (selPartner) {
                      return (
                        <div>
                          <p style={{ color:"#d6c9ec", fontSize:13, marginBottom:10 }}>
                            🤝 <b>{selPartner.helper}</b> está ajudando <b>{sel.name}</b> desde {new Date(selPartner.startedAt).toLocaleTimeString("pt-BR")}.
                          </p>
                          <button onClick={()=>doUnpairPartner(sel)} style={{ ...styles.btn("#f87171"), padding:"6px 14px", fontSize:12.5 }}>Desfazer parceria</button>
                        </div>
                      );
                    }
                    if (selHelping) {
                      return <p style={{ color:"#776798", fontSize:13 }}>{sel.name} já está ajudando <b>{selHelping.helped}</b> agora — espere terminar antes de parear de novo.</p>;
                    }
                    const candidates = students
                      .filter(s => s.name!==sel.name && (s.shift||"sem-turno")===selShift && (s.shift||"")!==TEST_SHIFT.id
                        && !partners.some(p => p.status==="active" && (p.helper===s.name || p.helped===s.name)))
                      .sort((a,b) => { const rank = l=>l==="bem"?0:l==="neutro"?1:2; return rank(difficultyOf(a).level)-rank(difficultyOf(b).level); });
                    if (candidates.length===0) return <p style={{ color:"#776798", fontSize:13 }}>Nenhum colega livre no turno agora pra parear.</p>;
                    return (
                      <div>
                        <p style={{ color:"#776798", fontSize:11.5, marginBottom:8 }}>Escolha um colega livre pra ajudar {sel.name} — ele vê o código (só leitura) e os dois ganham pontos quando marcar como resolvido.</p>
                        <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:180, overflowY:"auto" }}>
                          {candidates.map(c => (
                            <div key={c.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"6px 10px" }}>
                              <span style={{ fontSize:12.5 }}>{c.name} {difficultyOf(c).level==="bem" && <span style={{color:"#34d399"}}>· livre</span>}</span>
                              <button onClick={()=>doPairPartner(sel, c.name)} style={{ ...styles.btn("#22d3ee"), padding:"4px 10px", fontSize:11.5 }}>Parear</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Gerenciar aluno: renomear, mover de turno, corrigir nota, excluir */}
                <div className="cardfx" style={{ ...styles.card, borderColor:"#fbbf24" }}>
                  <h4 style={{ color:"#fbbf24", marginBottom:12 }}>⚙️ Gerenciar aluno</h4>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>✏️ Nome:</span>
                      <input value={renameVal} onChange={e=>setRenameVal(e.target.value)} placeholder={sel.name}
                        style={{ flex:1, minWidth:140, background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 10px", color:"#f0e9fb", fontSize:13, outline:"none" }} />
                      <button onClick={()=>doRenameStudent(sel)} disabled={!renameVal.trim()} style={{ ...styles.btn("#c084fc"), padding:"6px 14px", fontSize:12.5, opacity:renameVal.trim()?1:0.5 }}>Renomear</button>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🕑 Turma:</span>
                      {[...activeTurmas, TEST_SHIFT].filter(sh => sh.id !== (sel.shift||"sem-turno")).map(sh => (
                        <button key={sh.id} onClick={()=>doMoveStudent(sel, sh.id)} style={{ ...styles.btnGhost, padding:"6px 12px", fontSize:12.5 }}>
                          Mover p/ {sh.emoji} {sh.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🏆 Nota:</span>
                      <input type="number" min={0} max={100} value={scoreVal} onChange={e=>setScoreVal(e.target.value)} placeholder={sel.score!=null?String(sel.score):"—"}
                        style={{ width:90, background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 10px", color:"#f0e9fb", fontSize:13, outline:"none" }} />
                      <button onClick={()=>doSetScore(sel)} disabled={scoreVal===""} style={{ ...styles.btn("#34d399"), padding:"6px 14px", fontSize:12.5, opacity:scoreVal!==""?1:0.5 }}>Alterar nota da atividade</button>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>💌 Boletim:</span>
                      <button onClick={()=>exportBoletins(sel)} disabled={boletimBusy} style={{ ...styles.btn("#c084fc"), padding:"6px 14px", fontSize:12.5, opacity:boletimBusy?0.6:1 }}>{boletimBusy ? "Gerando..." : `Gerar boletim de ${sel.name.split(" ")[0]}`}</button>
                      {boletimMsg && <span style={{ color: boletimMsg.startsWith("✅") ? "#34d399" : boletimMsg.startsWith("❌") ? "#f87171" : "#fbbf24", fontSize:11.5, flex:"1 1 160px" }}>{boletimMsg}</span>}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🧩 Acessibilidade:</span>
                      <button onClick={()=>doToggleAccessMode(sel)} style={{ ...styles.btn(selAccessMode?"#22d3ee":"#3b2a58"), padding:"6px 14px", fontSize:12.5 }}>
                        {selAccessMode ? "✅ Modo Guiado ativado" : "Ativar Modo Guiado"}
                      </button>
                      <span style={{ color:"#776798", fontSize:11.5, flex:"1 1 200px" }}>{selAccessMode ? "O editor de código deste aluno vira uma montagem de blocos clicáveis, com narração por voz." : "Troca o editor de código por blocos clicáveis + narração por voz, para alunos com dificuldade de ler/escrever/digitar."}</span>
                    </div>
                    {(() => {
                      const c = checkinMap[`${sel.shift||"sem-turno"}:${sel.name}`];
                      const mood = c ? checkinMoodInfo(c.mood) : null;
                      return (
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                          <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>😊 Chegou hoje:</span>
                          {mood ? (
                            <span style={{ ...styles.badge("#c084fc"), fontSize:12.5 }}>{mood.emoji} {mood.label} <span style={{ color:"#776798", fontWeight:400 }}>· {new Date(c.at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span></span>
                          ) : (
                            <span style={{ color:"#776798", fontSize:12 }}>Ainda não fez o check-in de hoje.</span>
                          )}
                        </div>
                      );
                    })()}
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-start", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88, paddingTop:6 }}>💙 Apoio:</span>
                      <div style={{ flex:1, minWidth:220 }}>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {[
                            ["sensorial", "🧘 Sensorial", "Modo calmo: sem sons, confete e animações de festa — pra quem se sobrecarrega com estímulos."],
                            ["foco", "🎯 Foco", "Esconde ranking, loja e duelos — sobra só o essencial: editor, Nyx e salvar."],
                            ["leitura", "📖 Leitura", "Letras e linhas mais espaçadas em toda a tela do aluno — ajuda na dislexia."],
                            ["ritmo", "🐢 Ritmo próprio", "Atividade do dia com 4 questões bem diretas em vez de 8 — termina junto com a turma."],
                            ["motora", "🖐️ Motora", "Sugere o tutorial de teclado pra esse aluno automaticamente — ajuda quem tem dificuldade motora pra digitar."],
                            ["visual", "👁️ Visual", "Alto contraste + letras maiores em toda a tela do aluno — ajuda quem tem baixa visão."],
                          ].map(([flag, label, hint]) => {
                            const bySelf = !!(sel.selfSupport && sel.selfSupport[flag]);
                            const active = selSupport[flag] || bySelf;
                            return (
                              <button key={flag} onClick={()=>doToggleSupport(sel, flag, label)} title={bySelf ? `${hint} (o próprio aluno pediu este)` : hint}
                                style={{ background: active ? (bySelf && !selSupport[flag] ? "#a855f7" : "#3b82f6") : "#171026", color: active ? "#fff" : "#a99ac9", border:`1px solid ${active ? (bySelf && !selSupport[flag] ? "#a855f7" : "#3b82f6") : "#3b2a58"}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", fontWeight:800, fontSize:12 }}>
                                {bySelf && !selSupport[flag] ? "🙋 " : active ? "✓ " : ""}{label}
                              </button>
                            );
                          })}
                        </div>
                        <p style={{ color:"#776798", fontSize:11.5, margin:"6px 0 0" }}>Perfis de apoio pra educação inclusiva — a tela do aluno se adapta sozinha. Só você vê essas marcações; os colegas não. <span style={{color:"#a855f7"}}>🙋 roxo</span> = o próprio aluno pediu; clique pra também fixar por sua conta (assim continua ativo mesmo se ele desmarcar).</p>
                      </div>
                    </div>
                    {sel.helpAt && Date.now() - sel.helpAt < 15 * 60 * 1000 && (
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #fbbf24", paddingTop:10, background:"#fbbf2410", borderRadius:8, padding:"10px" }}>
                        <span style={{ color:"#fbbf24", fontSize:13, fontWeight:800 }}>✋ Este aluno pediu ajuda {new Date(sel.helpAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}!</span>
                        <button onClick={()=>markHelped(sel)} style={{ ...styles.btn("#34d399"), padding:"6px 14px", fontSize:12.5 }}>✔ Marcar como atendido</button>
                      </div>
                    )}
                    {sel.errorAt && Date.now() - sel.errorAt < 30 * 60 * 1000 && (
                      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:8, borderTop:"1px solid #f87171", paddingTop:10, background:"#f8717110", borderRadius:8, padding:"10px" }}>
                        <span style={{ color:"#f87171", fontSize:13, fontWeight:800 }}>⚠️ A tela deste aluno deu um erro {new Date(sel.errorAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}: <span style={{ fontWeight:400, color:"#fca5a5" }}>{sel.errorMsg || "sem detalhes"}</span></span>
                      </div>
                    )}
                    {pendingJustifications(sel).length > 0 && (
                      <div style={{ display:"flex", flexDirection:"column", gap:6, borderTop:"1px solid #f87171", paddingTop:10, background:"#f8717110", borderRadius:8, padding:"10px" }}>
                        <span style={{ color:"#f87171", fontSize:13, fontWeight:800 }}>😔 Justificativa(s) de falta pendente(s):</span>
                        {pendingJustifications(sel).map(([d, j]) => {
                          const [y, m, dd] = d.split("-");
                          return (
                            <div key={d} style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                              <span style={{ color:"#f0e9fb", fontSize:12.5 }}>📅 {dd}/{m}/{y}: <i>"{j.text}"</i></span>
                              <button onClick={()=>doApproveJustification(sel, d)} style={{ ...styles.btn("#34d399"), padding:"5px 12px", fontSize:12 }}>✔ Justificar</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>⌨️ Teclado:</span>
                      <button onClick={async ()=>{ await setKeyboardLaunch(sel.shift, sel.name, teacherAuth); flashMgmt(`⌨️ Tutorial de teclado aberto na tela de ${sel.name}.`); }} style={{ ...styles.btn("#22d3ee"), padding:"6px 14px", fontSize:12.5 }}>Abrir na tela do aluno</button>
                      <span style={{ color: sel.keyboardDone ? "#34d399" : "#776798", fontSize:11.5, flex:"1 1 200px" }}>{sel.keyboardDone ? "✅ Já concluiu o tutorial." : "Ainda não concluiu o tutorial."}</span>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🔍 Vistoria:</span>
                      <button onClick={()=>doToggleInspection(sel)} style={{ ...styles.btn(selInspection?"#22d3ee":"#3b2a58"), padding:"6px 14px", fontSize:12.5 }}>
                        {selInspection ? "✅ Vistoria aberta — Encerrar" : "Liberar fora do horário"}
                      </button>
                      <span style={{ color:"#776798", fontSize:11.5, flex:"1 1 200px" }}>{selInspection ? "Esse aluno consegue entrar agora, mesmo fora do horário configurado." : "Se o horário automático estiver fechado, isso libera só ESTE aluno pra você inspecionar o trabalho dele."}</span>
                    </div>
                    {sel.portfolioPublic && (
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                        <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🌟 Portfólio:</span>
                        <span style={{ ...styles.badge("#c084fc"), fontSize:12.5 }}>✅ Link público ativo (ligado pelo aluno){sel.portfolioViews ? ` · ${sel.portfolioViews} visualização${sel.portfolioViews===1?"":"ões"}` : ""}</span>
                        <button onClick={()=>doDisablePortfolio(sel)} style={{ ...styles.btn("#f87171"), padding:"6px 14px", fontSize:12.5 }}>Desativar</button>
                        <span style={{ color:"#776798", fontSize:11.5, flex:"1 1 200px" }}>Só primeiro nome, avatar, conquistas e progresso — sem sobrenome, turma, nota comparada ou dado sensível. Expira sozinho em 60 dias.</span>
                      </div>
                    )}
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>📤 Código:</span>
                      <button onClick={()=>doSendClassCode(sel)} style={{ ...styles.btn("#22d3ee"), padding:"6px 14px", fontSize:12.5 }}>Enviar código da turma</button>
                      <span style={{ color:"#776798", fontSize:11.5, flex:"1 1 200px" }}>Manda todos os arquivos da aba "Meu código" (turno {shiftLabel(sel.shift, turmas)}) direto pro editor deste aluno.</span>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>📄 PDF do dia:</span>
                      <button onClick={()=>{
                        const dayFiles = (proFilesByShift[sel.shift] || []).filter(f => (f.code||"").trim());
                        setDailyPdfCode(dayFiles.map(f => `// ===== ${f.name} =====\n${f.code}`).join("\n\n"));
                        setDailyPdfMsg("");
                        setDailyPdfModal({ shift: sel.shift, studentName: sel.name });
                      }} disabled={dailyPdfBusy} style={{ ...styles.btn("#c084fc"), padding:"6px 14px", fontSize:12.5, opacity: dailyPdfBusy ? 0.7 : 1 }}>
                        {dailyPdfBusy ? "⏳ Gerando..." : "Gerar resumo de hoje em PDF"}
                      </button>
                      <span style={{ color:"#776798", fontSize:11.5, flex:"1 1 200px" }}>Confirme o código de hoje e o Nyx gera a explicação — bom pra mandar pra quem faltou.</span>
                      {dailyPdfMsg && <p style={{ width:"100%", margin:0, color: dailyPdfMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:11.5 }}>{dailyPdfMsg}</p>}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", borderTop:"1px solid #3b2a58", paddingTop:10 }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🗑️ Perfil:</span>
                      {confirmDelete ? (
                        <>
                          <span style={{ color:"#f87171", fontSize:13 }}>Excluir <b>{sel.name}</b> e tudo o que ele fez? Não dá para desfazer.</span>
                          <button onClick={()=>doDeleteStudent(sel)} style={{ ...styles.btn("#f87171"), padding:"6px 14px", fontSize:12.5 }}>Sim, excluir</button>
                          <button onClick={()=>setConfirmDelete(false)} style={{ ...styles.btnGhost, padding:"6px 14px", fontSize:12.5 }}>Cancelar</button>
                        </>
                      ) : (
                        <button onClick={()=>setConfirmDelete(true)} style={{ ...styles.btn("#f87171"), padding:"6px 14px", fontSize:12.5 }}>Excluir perfil do aluno</button>
                      )}
                    </div>
                  </div>
                </div>
                {Array.isArray(sel.files) && sel.files.length>0 ? sel.files.map((f,i)=>(
                  <div key={i} className="cardfx" style={styles.card}>
                    <h4 style={{ color:"#c084fc", marginBottom:8 }}>📄 {f.name}</h4>
                    <pre style={{ background:"#1e1e1e", padding:12, borderRadius:8, fontFamily:"monospace", fontSize:13, color:"#a5f3fc", overflow:"auto", maxHeight:240, whiteSpace:"pre-wrap" }}>{f.code || "(vazio)"}</pre>
                  </div>
                )) : sel.code && (
                  <div className="cardfx" style={styles.card}>
                    <h4 style={{ color:"#c084fc", marginBottom:8 }}>💻 Código</h4>
                    <pre style={{ background:"#1e1e1e", padding:12, borderRadius:8, fontFamily:"monospace", fontSize:13, color:"#a5f3fc", overflow:"auto", maxHeight:240, whiteSpace:"pre-wrap" }}>{sel.code}</pre>
                  </div>
                )}
                {sel.scoreHistory && Object.keys(sel.scoreHistory).length > 0 && (
                  <div className="cardfx" style={styles.card}>
                    <h4 style={{ color:"#c084fc", marginBottom:12 }}>📈 Histórico de notas (atividades)</h4>
                    <PerformanceChart entries={Object.entries(sel.scoreHistory).sort(([a],[b])=>a.localeCompare(b))} />
                  </div>
                )}
                {sel.feedback && <div className="cardfx" style={styles.card}><h4 style={{ color:"#c084fc", marginBottom:6 }}>🤖 Nyx (último aviso)</h4><p style={{ color:sel.feedback.ok?"#34d399":"#f87171", fontSize:13 }}>{sel.feedback.ok?"✅":"⚠"} {sel.feedback.message}</p></div>}
                {sel.answers && sel.dynamicActivity && (
                  <div className="cardfx" style={styles.card}>
                    <h4 style={{ color:"#c084fc", marginBottom:10 }}>📝 Atividade</h4>
                    {sel.dynamicActivity.map((q,i)=>(
                      <div key={i} style={{ marginBottom:10, background:"#171026", borderRadius:8, padding:"8px 12px" }}>
                        <p style={{ fontSize:13, color:"#a99ac9", marginBottom:4 }}>{i+1}. {q.q}</p>
                        <span style={styles.badge(sel.answers[i]===q.correct?"#34d399":"#f87171")}>{sel.answers[i]===q.correct?"✅ Correto":"❌ Errado"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {sel.finalFeedback && (() => {
                  const fb = sel.finalFeedback;
                  const st = fb && typeof fb === "object" && Array.isArray(fb.secoes);
                  const text = st ? [fb.intro, ...fb.secoes.map(s=>`${s.titulo}: ${s.explicacao}`), fb.dica ? `Dica: ${fb.dica}` : ""].filter(Boolean).join("\n") : (typeof fb === "string" ? fb : "");
                  return text ? <div className="cardfx" style={styles.card}><h4 style={{ color:"#c084fc", marginBottom:8 }}>🤖 Feedback do Nyx ao aluno</h4><p style={{ color:"#d6c9ec", fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{text}</p></div> : null;
                })()}
              </>
            ) : (
              <div className="cardfx" style={{ ...styles.card, textAlign:"center", padding:40 }}>
                <div style={{ fontSize:36 }}>👆</div>
                <p style={{ color:"#776798" }}>Clique em um aluno no monitoramento para ver o código, a atividade e os detalhes.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────── MEU CÓDIGO (exemplo da aula, do professor) — layout expandido tipo "tela cheia" ─────────── */}
      {tab==="code" && (
          <div style={{ padding:"8px 14px 14px" }}>
            <div data-tour-prof="code-info" className="cardfx" style={{ ...styles.card, padding:12, margin:"6px 0" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:"1 1 260px" }}>
                  <h3 style={{ color:"#fbbf24", margin:0, fontSize:15 }}>👨‍💻 Meu código</h3>
                  <p style={{ color:"#a99ac9", fontSize:12.5, margin:"3px 0 0", lineHeight:1.5 }}>Cada turma tem seu próprio exemplo. Programe aqui e gere o nome do conteúdo a partir dele — é isso que aparece no calendário.</p>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button style={{ ...styles.btn("#34d399"), padding:"7px 12px", fontSize:12.5 }} onClick={()=>setShowLessons(true)} title="Sua biblioteca de aulas: salve o código atual com um nome e reutilize quando quiser">📚 Minhas aulas</button>
                  <button style={{ ...styles.btn("#c084fc"), opacity:genName?0.6:1, padding:"7px 12px", fontSize:12.5 }} onClick={()=>generateContentName(codeShift)} disabled={genName}>{genName?"Gerando...":`✨ Gerar nome do conteúdo (${shiftMeta(codeShift, turmas).label})`}</button>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                {activeTurmas.map(sh => (
                  <button key={sh.id} onClick={()=>setCodeShift(sh.id)} style={styles.tab(codeShift===sh.id)}>{sh.emoji} {sh.label}</button>
                ))}
              </div>
              {contentFor(codeShift) && <p style={{ color:"#34d399", fontSize:13, fontWeight:600, margin:"8px 0 0" }}>📖 Conteúdo de hoje ({shiftMeta(codeShift, turmas).label}): {contentFor(codeShift)}</p>}
              {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:12.5, margin:"8px 0 0", lineHeight:1.5 }}>{nameMsg}</p>}
            </div>

            {(() => {
              const cal = turmaCalendar(meta, codeShift);
              const hoje = todayKey();
              const isResumo = isResumoDay(cal.classDays, cal.resumoCadence, hoje);
              const jaLiberado = !!resumoTriggeredToday[codeShift];
              return (
                <div data-tour-prof="resumo-ritmo" className="cardfx" style={{ ...styles.card, padding:12, margin:"6px 0" }}>
                  <h3 style={{ color:"#fbbf24", margin:0, fontSize:15 }}>📚 Resumo da aula — {shiftMeta(codeShift, turmas).label}</h3>
                  <p style={{ color:"#a99ac9", fontSize:12.5, margin:"4px 0 10px", lineHeight:1.5 }}>Defina o ritmo da turma e, quando for dia de resumo, clique em liberar — todo aluno conectado com código escrito finaliza a aula sozinho (nada de clicar em "Salvar e Finalizar Aula"), na hora ou assim que entrar ainda hoje.</p>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                    <span style={{ color:"#a99ac9", fontSize:13 }}>A cada</span>
                    <input type="number" min={0} value={cal.resumoCadence} onChange={e=>saveResumoCadence(codeShift, e.target.value)}
                      style={{ width:52, background:"#171026", border:"2px solid #3b2a58", borderRadius:8, padding:"5px 8px", color:"#f0e9fb", fontSize:13, textAlign:"center" }} />
                    <span style={{ color:"#a99ac9", fontSize:13 }}>{cal.resumoCadence===1 ? "aula de código, 1 de resumo" : "aulas de código, 1 de resumo"}</span>
                    <span style={{ color:"#776798", fontSize:12 }} title='0 = sem ritmo fixo — código e resumo podem acontecer no mesmo dia, quando você quiser'>{cal.resumoCadence===0 ? "(0 = sem ritmo fixo, decide dia a dia)" : ""}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <span style={styles.badge(cal.resumoCadence===0 ? "#a99ac9" : isResumo ? "#c084fc" : "#22d3ee")}>
                      {cal.resumoCadence===0 ? "🔀 Sem ritmo fixo hoje" : isResumo ? "📚 Hoje é dia de RESUMO" : "💻 Hoje é dia de código"}
                    </span>
                    {jaLiberado ? (
                      <span style={styles.badge("#34d399")}>✅ Resumo já liberado hoje</span>
                    ) : (
                      <button onClick={()=>liberarResumoHoje(codeShift)} disabled={resumoTriggerBusy} style={{ ...styles.btn("#c084fc"), padding:"7px 14px", fontSize:12.5, opacity:resumoTriggerBusy?0.6:1 }}>
                        {resumoTriggerBusy ? "Gerando..." : "📚 Gerar e liberar resumo pra turma"}
                      </button>
                    )}
                  </div>
                  {resumoTriggerMsg && <p style={{ color:resumoTriggerMsg.startsWith("✅")?"#34d399":"#f87171", fontSize:12.5, margin:"8px 0 0", lineHeight:1.5 }}>{resumoTriggerMsg}</p>}
                </div>
              );
            })()}

            <div data-tour-prof="analise-nyx" className="cardfx" style={{ ...styles.card, padding:12, margin:"6px 0" }}>
              <h3 style={{ color:"#fbbf24", margin:0, fontSize:15 }}>✨ Análise de código do Nyx</h3>
              <p style={{ color:"#a99ac9", fontSize:12.5, margin:"4px 0 10px", lineHeight:1.5 }}>Enquanto o Nyx analisa o código de um aluno, o editor pode ficar travado até a resposta chegar, ou continuar liberado pra ele seguir digitando.</p>
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12.5, color:"#a99ac9", cursor:"pointer" }}>
                <input type="checkbox" checked={meta.lockDuringAnalysis === false} onChange={toggleLockDuringAnalysis} style={{ width:16, height:16, accentColor:"#c084fc" }} />
                Deixar o aluno continuar escrevendo enquanto o Nyx analisa (por padrão, o editor trava até terminar)
              </label>
            </div>

            <CodeLab key={codeShift} accent="#fbbf24" files={proFiles} onChange={setProFiles} terminalMaxHeight={420} gear={meta.nyxGear||DEFAULT_NYX_GEAR} onEquip={saveTeacherGear} />
          </div>
      )}

      {/* ─────────── CALENDÁRIO ─────────── */}
      {tab==="calendar" && (
        <div style={{ display:"flex", gap:14, padding:14, maxWidth:900, margin:"0 auto", alignItems:"flex-start", flexWrap:"wrap" }}>
          <div data-tour-prof="calendar-body" className="cardfx" style={{ ...styles.card, flex:"1 1 380px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:12 }}>
              <h3 style={{ color:"#fbbf24", margin:0 }}>🗓️ Calendário de aulas</h3>
              <div style={{ display:"flex", gap:8 }}>
                {activeTurmas.map(sh => (
                  <button key={sh.id} onClick={()=>setCodeShift(sh.id)} style={styles.tab(codeShift===sh.id)}>{sh.emoji} {sh.label}</button>
                ))}
              </div>
            </div>
            <p style={{ color:"#a99ac9", fontSize:13, marginBottom:12 }}>Os dias com aula ficam em verde (são marcados sozinhos quando há alunos online, e você também pode clicar para marcar/desmarcar). O 📖 indica os dias que já têm conteúdo gerado para a turma {shiftMeta(codeShift, turmas).label} — passe o mouse para ver o tema.</p>
            <Calendar classDays={turmaCalendar(meta, codeShift).classDays} contentNames={calContentNames} onToggle={toggleClassDay} />
          </div>
          <div data-tour-prof="cidade" className="cardfx" style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:12 }}>📍 Cidade no DF da turma {shiftMeta(codeShift, turmas).label}</h3>
            <input list="df-cities" value={cityInput} onChange={e=>setCityInput(e.target.value)} onBlur={saveCity} placeholder="Ex: Ceilândia"
              style={{ width:"100%", background:"#171026", border:"2px solid #3b2a58", borderRadius:10, padding:"10px 12px", color:"#f0e9fb", fontSize:15, boxSizing:"border-box" }} />
            <datalist id="df-cities">{DF_CITIES.map(c=><option key={c} value={c} />)}</datalist>
            <button style={{ ...styles.btn("#c084fc"), marginTop:10 }} onClick={saveCity}>Salvar cidade</button>
            {(() => { const cal = turmaCalendar(meta, codeShift); return (<>
            {cal.city && !cal.cityClosed && <p style={{ color:"#34d399", fontSize:13, marginTop:10 }}>Cidade salva: {cal.city}</p>}
            {cal.cityClosed && (
              <p style={{ color:"#fbbf24", fontSize:13, marginTop:10, lineHeight:1.6 }}>⏸ {cal.city} foi encerrada. A contagem de dias de aula está pausada — digite a próxima cidade acima para retomar.</p>
            )}
            <hr style={{ borderColor:"#3b2a58", margin:"14px 0" }}/>
            <p style={{ color:"#a99ac9", fontSize:13 }}>Total de dias de aula registrados: <b style={{ color:"#f0e9fb" }}>{cal.classDays.length}</b></p>
            <hr style={{ borderColor:"#3b2a58", margin:"14px 0" }}/>
            <p style={{ color:"#fbbf24", fontWeight:700, fontSize:13, marginBottom:6 }}>🏆 Hall da Fama</p>
            <p style={{ color:"#a99ac9", fontSize:12.5, lineHeight:1.6, margin:"0 0 10px" }}>Quando a carreta for mudar de cidade, encerre aqui: guarda uma placa com quem mais se destacou, pros alunos da próxima cidade verem, e baixa um relatório de despedida em PDF pra você guardar. Não apaga nada da turma atual — exceto a data de nascimento e o CPF de todos, que somem pra sempre (nem você mais tem acesso).</p>
            {cal.cityClosed ? (
              <p style={{ color:"#776798", fontSize:12.5, lineHeight:1.6 }}>🏆 {cal.city} já foi encerrada — defina a próxima cidade acima antes de encerrar de novo.</p>
            ) : confirmCloseCity ? (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button style={{ ...styles.btn("#fbbf24"), opacity:farewellBusy?0.6:1 }} onClick={doCloseCity} disabled={farewellBusy}>{farewellBusy ? "Gerando relatório..." : `Sim, encerrar ${cal.city || "a cidade"}`}</button>
                <button style={styles.btnGhost} onClick={()=>setConfirmCloseCity(false)} disabled={farewellBusy}>Cancelar</button>
              </div>
            ) : (
              <button style={{ ...styles.btn("#fbbf24"), width:"100%" }} onClick={()=>setConfirmCloseCity(true)}>🏆 Encerrar cidade e gerar placa + relatório</button>
            )}
            </>); })()}
            {hallMsg && <p style={{ color: hallMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:12.5, marginTop:8, lineHeight:1.5 }}>{hallMsg}</p>}
            <button style={{ ...styles.btn("#06b6d4"), width:"100%", marginTop:10 }} onClick={()=>{ getHallOfFame(codeShift).then(setTripHallEntries); setShowTripOverview(true); }}>📊 Visão da Viagem ({shiftMeta(codeShift, turmas).label})</button>
          </div>
          <div data-tour-prof="backup" className="cardfx" style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:4 }}>💾 Backup automático</h3>
            <p style={{ color:"#a99ac9", fontSize:12.5, margin:"0 0 12px", lineHeight:1.6 }}>Todo dia de madrugada o Nyx guarda uma cópia de segurança de tudo sozinho, sem precisar fazer nada. Aqui você confere quando foi o último e pode forçar um agora se quiser.</p>
            {autoBackupList === null ? (
              <button style={{ ...styles.btnGhost, width:"100%" }} onClick={loadAutoBackups}>Ver backups</button>
            ) : autoBackupList.length === 0 ? (
              <p style={{ color:"#776798", fontSize:12.5 }}>Nenhum backup ainda — o primeiro roda sozinho na próxima madrugada, ou clique abaixo pra fazer um agora.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:120, overflowY:"auto", marginBottom:10 }}>
                {autoBackupList.slice(0,6).map(b => {
                  const dt = b.key.replace("backup:","");
                  const d = new Date(dt);
                  return <span key={b.key} style={{ color:"#a99ac9", fontSize:11.5 }}>🗓️ {isNaN(d) ? dt : d.toLocaleString("pt-BR")} · {(b.size/1024).toFixed(0)}KB</span>;
                })}
              </div>
            )}
            <button style={{ ...styles.btn("#c084fc"), width:"100%", marginTop:8, opacity:autoBackupBusy?0.6:1 }} onClick={doAutoBackupNow} disabled={autoBackupBusy}>{autoBackupBusy ? "Fazendo backup..." : "💾 Fazer backup agora"}</button>
            {autoBackupMsg && <p style={{ color: autoBackupMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:12.5, marginTop:8 }}>{autoBackupMsg}</p>}
          </div>
          <div data-tour-prof="relatorio" className="cardfx" style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:4 }}>📄 Relatório de Comprovação</h3>
            <p style={{ color:"#a99ac9", fontSize:12.5, margin:"0 0 12px", lineHeight:1.6 }}>Gera o relatório oficial (mesmo modelo, só preenchido) com todos os alunos de Matutino e Vespertino: nome, CPF, nota e fotos do código/notas/prova de cada um. Baixa como .docx — dá pra editar depois. Clique no fim do mês.</p>
            <button style={{ ...styles.btn("#fbbf24"), width:"100%", opacity:relatorioBusy?0.6:1 }} onClick={doGerarRelatorio} disabled={relatorioBusy}>{relatorioBusy ? "Gerando relatório..." : "📄 Gerar Relatório de Comprovação"}</button>
            {relatorioMsg && <p style={{ color: relatorioMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:12.5, marginTop:8 }}>{relatorioMsg}</p>}
          </div>
          <div className="cardfx" style={{ ...styles.card, flex:"1 1 300px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:4 }}>🏫 Turmas</h3>
            <p style={{ color:"#a99ac9", fontSize:12.5, margin:"0 0 12px", lineHeight:1.6 }}>Tem mais de uma turma no mesmo turno (ex: duas de tarde)? Crie uma turma extra aqui — ela ganha lista de alunos, prova, calendário e monitoramento totalmente separados das outras.</p>
            {turmas.map(t => (
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", opacity: t.archived ? 0.5 : 1 }}>
                <span style={{ width:10, height:10, borderRadius:"50%", background:t.color, flexShrink:0 }} />
                <span style={{ flex:1, fontSize:13, color:"#f0e9fb" }}>{t.emoji} {t.label}{t.archived ? " (arquivada)" : ""}</span>
                <button onClick={()=>arquivarTurma(t.id, !t.archived)} style={{ background:"transparent", border:"1px solid #3b2a58", color:"#a99ac9", borderRadius:8, padding:"4px 10px", fontSize:11.5, cursor:"pointer" }}>
                  {t.archived ? "Reativar" : "Arquivar"}
                </button>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap", alignItems:"center" }}>
              <input value={novaTurmaLabel} onChange={e=>setNovaTurmaLabel(e.target.value)} placeholder="Nome da turma (ex: Vespertino B)" style={{ flex:"1 1 160px", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 10px", color:"#f0e9fb", fontSize:13, outline:"none" }} />
              <select value={novaTurmaPeriod} onChange={e=>setNovaTurmaPeriod(e.target.value)} style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 10px", color:"#f0e9fb", fontSize:13 }}>
                <option value="matutino">☀️ Manhã</option>
                <option value="vespertino">🌙 Tarde</option>
              </select>
              <button onClick={criarTurma} disabled={!novaTurmaLabel.trim()} style={{ ...styles.btn("#c084fc"), padding:"7px 14px", fontSize:13, opacity: novaTurmaLabel.trim() ? 1 : 0.5 }}>+ Criar turma</button>
            </div>
            {turmaMsg && <p style={{ color: turmaMsg.startsWith("✅") ? "#34d399" : "#f87171", fontSize:12.5, marginTop:8 }}>{turmaMsg}</p>}
          </div>
          <div data-tour-prof="horario" className="cardfx" style={{ ...styles.card, flex:"1 1 300px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:4 }}>🕐 Horário da turma ({shiftMeta(codeShift, turmas).label})</h3>
            <p style={{ color:"#a99ac9", fontSize:12.5, margin:"0 0 12px", lineHeight:1.6 }}>Defina o horário e o Nyx libera/bloqueia o perfil dos alunos sozinho. Deixe em branco pra não restringir nada.</p>
            {(() => {
              const sc = schedule[codeShift] || {};
              const setSc = (patch) => setSchedule(prev => ({ ...prev, [codeShift]: { ...(prev[codeShift]||{}), ...patch } }));
              const status = classStatus(sc, meta.allowWeekend);
              return (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    <label style={{ fontSize:11.5, color:"#a99ac9" }}>Início da aula
                      <input type="time" value={sc.start||""} onChange={e=>setSc({start:e.target.value})} style={{ width:"100%", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 8px", color:"#f0e9fb", fontSize:13, marginTop:3 }} />
                    </label>
                    <label style={{ fontSize:11.5, color:"#a99ac9" }}>Fim da aula
                      <input type="time" value={sc.end||""} onChange={e=>setSc({end:e.target.value})} style={{ width:"100%", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 8px", color:"#f0e9fb", fontSize:13, marginTop:3 }} />
                    </label>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                    <label style={{ fontSize:11.5, color:"#a99ac9" }}>Início do intervalo
                      <input type="time" value={sc.breakStart||""} onChange={e=>setSc({breakStart:e.target.value})} style={{ width:"100%", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 8px", color:"#f0e9fb", fontSize:13, marginTop:3 }} />
                    </label>
                    <label style={{ fontSize:11.5, color:"#a99ac9" }}>Duração (min)
                      <input type="number" min={0} value={sc.breakMin||""} onChange={e=>setSc({breakMin:e.target.value})} placeholder="ex: 15" style={{ width:"100%", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 8px", color:"#f0e9fb", fontSize:13, marginTop:3, boxSizing:"border-box" }} />
                    </label>
                  </div>
                  <button style={{ ...styles.btn("#c084fc"), width:"100%", padding:"8px 0", fontSize:13 }} onClick={saveSchedule}>💾 Salvar horário</button>
                  {scheduleMsg && <p style={{ color:"#34d399", fontSize:12, margin:"8px 0 0" }}>{scheduleMsg}</p>}
                  <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, fontSize:12.5, color:"#a99ac9", cursor:"pointer" }}>
                    <input type="checkbox" checked={!!meta.allowWeekend} onChange={toggleAllowWeekend} style={{ width:16, height:16, accentColor:"#c084fc" }} />
                    Permitir aulas no fim de semana (por padrão, sábado e domingo ficam fechados)
                  </label>
                  <p style={{ fontSize:12, margin:"10px 0 0", fontWeight:700, color: !status.configured ? "#776798" : status.isWeekend ? "#818cf8" : status.open ? (status.inBreak ? "#22d3ee" : "#34d399") : "#f87171" }}>
                    {!status.configured ? "⚪ Sem restrição — aberto o dia todo" : status.isWeekend ? "🌙 Fechado — fim de semana" : status.inBreak ? `🍎 Em intervalo agora (volta em ${status.minutesToBreakEnd}min)` : status.open ? "🟢 Aula liberada agora" : status.before ? `🔴 Fechado — abre às ${sc.start}` : "🔴 Fechado — aula já encerrou hoje"}
                  </p>
                </>
              );
            })()}
          </div>
          <div className="cardfx" style={{ ...styles.card, flex:"1 1 260px" }}>
            <h3 style={{ color:"#fbbf24", marginBottom:8 }}>📖 Conteúdo de hoje ({shiftMeta(codeShift, turmas).label})</h3>
            {contentFor(codeShift)
              ? <p style={{ color:"#34d399", fontSize:16, fontWeight:600, lineHeight:1.5, margin:"4px 0 12px" }}>{contentFor(codeShift)}</p>
              : <p style={{ color:"#a99ac9", fontSize:13, lineHeight:1.6, margin:"4px 0 12px" }}>Ainda não gerado. Programe o exemplo do dia na aba <b>Meu código</b> e clique abaixo para criar um nome automático.</p>}
            <button style={{ ...styles.btn("#c084fc"), width:"100%", opacity:genName?0.6:1 }} onClick={()=>generateContentName(codeShift)} disabled={genName}>{genName?"Gerando...":"✨ Gerar nome do conteúdo de hoje"}</button>
            {nameMsg && <p style={{ color:nameMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:12, marginTop:10, lineHeight:1.5 }}>{nameMsg}</p>}
          </div>
        </div>
      )}

      {/* ─────────── FEEDBACK DOS ALUNOS ─────────── */}
      {tab==="feedback" && (
        <div style={{ padding:14, maxWidth:760, margin:"0 auto" }}>
          <div data-tour-prof="feedback-body" className="cardfx" style={styles.card}>
            <h3 style={{ color:"#fbbf24", marginBottom:12 }}>💬 Feedback dos alunos sobre as aulas</h3>
            <p style={{ color:"#a99ac9", fontSize:12.5, margin:"-4px 0 12px" }}>Do mais recente para o mais antigo, com a turma de cada aluno.</p>
            {feedbacks.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>Nenhum aluno enviou feedback ainda. Eles podem avaliar ao terminar a aula.</p> : (
              feedbacks.map(s=>(
                <div key={s.name} style={{ background:"#171026", border:"1px solid #3b2a58", borderRadius:10, padding:14, marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                    <Avatar cfg={s.avatar} size={30} />
                    <b>{s.name}</b>
                    <span style={{ ...styles.badge(s.shift===TEST_SHIFT.id?"#a855f7":"#c084fc"), fontWeight:700 }}>{shiftLabel(s.shift, turmas)}</span>
                    <span style={{ color:"#fbbf24" }}>{"★".repeat(s.classFeedback.rating||0)}{"☆".repeat(5-(s.classFeedback.rating||0))}</span>
                    <span style={{ color:"#776798", fontSize:11, marginLeft:"auto", whiteSpace:"nowrap" }}>🕒 {dataHora(s.classFeedback.at)}</span>
                  </div>
                  {(s.classFeedback.text||"").trim() ? <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.6 }}>{s.classFeedback.text}</p> : <p style={{ color:"#776798", fontSize:13 }}>(sem comentário escrito)</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────── PROVA ─────────── */}
      {tab==="quiz" && (() => {
        const allThemes = [...QUIZ_SEED_THEMES, ...quizThemes];
        const room = quizRoom;
        const players = room ? students.filter(s => s.quizJoin && s.quizJoin.code === room.code) : [];
        const medal = (i) => i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}º`;
        // ── sem sala aberta: lista de temas + editor de tema ──
        if (!room) return (
          <div style={{ padding:14, maxWidth:900, margin:"0 auto" }}>
            <div data-tour-prof="quiz-body" className="cardfx" style={{ ...styles.card, borderColor:"#c084fc" }}>
              <h3 style={{ color:"#c084fc", marginBottom:6 }}>🎉 Quiz da Turma {shiftMeta(codeShift, turmas).label} (estilo Kahoot)</h3>
              <p style={{ color:"#a99ac9", fontSize:13, lineHeight:1.6, margin:"0 0 14px" }}>Escolha um tema e crie uma sala: um código aparece na sua tela, e na tela dos alunos acende um botão pra entrar com esse código. Cada pergunta vale até 1000 pontos — quanto mais rápido responder, mais pontos (difíceis valem em dobro). Cada turma tem sua própria sala — dá pra ter um quiz rodando em cada uma ao mesmo tempo.</p>
              <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                {activeTurmas.map(sh => (
                  <button key={sh.id} onClick={()=>setCodeShift(sh.id)} style={styles.tab(codeShift===sh.id)}>{sh.emoji} {sh.label}</button>
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                <span style={{ color:"#a99ac9", fontSize:13 }}>⏱ Tempo por pergunta:</span>
                {QUIZ_TIMER_OPTIONS.map(s => (
                  <button key={s} onClick={()=>setQuizSecs(s)}
                    style={{ background: quizSecs===s ? "linear-gradient(135deg,#c084fc,#9333ea)" : "#171026", color: quizSecs===s ? "#fff" : "#a99ac9", border:`2px solid ${quizSecs===s?"#c084fc":"#3b2a58"}`, borderRadius:10, padding:"5px 12px", fontSize:13, fontWeight:800, cursor:"pointer" }}>
                    {s}s
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {allThemes.map(t => (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, background:"#171026", border:"1px solid #3b2a58", borderRadius:10, padding:"10px 14px", flexWrap:"wrap" }}>
                    <span style={{ color:"#f0e9fb", fontWeight:700, flex:"1 1 200px" }}>{t.title}</span>
                    <span style={{ ...styles.badge("#a99ac9"), fontSize:11 }}>{t.questions.length} perguntas</span>
                    {t.builtin && <span style={{ ...styles.badge("#22d3ee"), fontSize:11 }}>pronto de fábrica</span>}
                    <button onClick={()=>startQuizRoom(t)} style={{ ...styles.btn("#c084fc"), padding:"7px 16px", fontSize:13 }}>▶ Criar sala</button>
                    {!t.builtin && <button onClick={()=>{ setQuizEditingTheme({ ...t, questions:[...t.questions] }); }} style={{ ...styles.btnGhost, padding:"7px 12px", fontSize:13 }}>✏️</button>}
                    {!t.builtin && <button onClick={()=>deleteQuizTheme(t.id)} style={{ ...styles.btn("#f87171"), padding:"7px 12px", fontSize:13 }}>🗑️</button>}
                  </div>
                ))}
              </div>
              {!quizEditingTheme && (
                <button onClick={()=>{ setQuizEditingTheme({ title:"", questions:[] }); setQuizQDraft({ q:"", opts:["","","",""], correct:0, hard:false }); }} style={{ ...styles.btn("#34d399"), marginTop:12, padding:"9px 18px", fontSize:13.5 }}>➕ Novo tema</button>
              )}
            </div>
            {quizEditingTheme && (
              <div className="cardfx" style={{ ...styles.card, borderColor:"#34d399" }}>
                <h4 style={{ color:"#34d399", marginBottom:10 }}>{quizEditingTheme.id ? "✏️ Editando tema" : "➕ Novo tema"}</h4>
                <input value={quizEditingTheme.title} onChange={e=>setQuizEditingTheme(t=>({ ...t, title:e.target.value }))} placeholder="Nome do tema (ex: Sistema Solar)"
                  style={{ width:"100%", background:"#171026", border:"2px solid #3b2a58", borderRadius:10, padding:"10px 12px", color:"#f0e9fb", fontSize:14, outline:"none", boxSizing:"border-box" }} />
                {quizEditingTheme.questions.length > 0 && (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:12 }}>
                    {quizEditingTheme.questions.map((q,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"6px 10px" }}>
                        <span style={{ color:"#d6c9ec", fontSize:12.5, flex:1 }}>{i+1}. {q.q} {q.hard && "⭐"}</span>
                        <span style={{ color:"#34d399", fontSize:11.5 }}>✓ {q.opts[q.correct]}</span>
                        <button onClick={()=>setQuizEditingTheme(t=>({ ...t, questions:t.questions.filter((_,j)=>j!==i) }))} style={{ background:"transparent", border:"none", color:"#f87171", cursor:"pointer", fontSize:14 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background:"#171026", border:"1px dashed #3b2a58", borderRadius:12, padding:14, marginTop:12 }}>
                  <input value={quizQDraft.q} onChange={e=>setQuizQDraft(d=>({ ...d, q:e.target.value }))} placeholder="Pergunta"
                    style={{ width:"100%", background:"#1e1430", border:"2px solid #3b2a58", borderRadius:8, padding:"9px 12px", color:"#f0e9fb", fontSize:13.5, outline:"none", boxSizing:"border-box" }} />
                  <p style={{ color:"#776798", fontSize:11.5, margin:"10px 0 6px" }}>Alternativas (deixe as duas últimas em branco pra fazer Verdadeiro/Falso) — clique na forma pra marcar a certa:</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {quizQDraft.opts.map((opt,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <button onClick={()=>setQuizQDraft(d=>({ ...d, correct:i }))} title="Marcar como correta"
                          style={{ background:QUIZ_COLORS[i].bg, opacity:quizQDraft.correct===i?1:0.35, border:quizQDraft.correct===i?"2px solid #fff":"2px solid transparent", borderRadius:8, width:34, height:34, color:"#fff", fontWeight:900, cursor:"pointer", flexShrink:0 }}>{quizQDraft.correct===i?"✓":QUIZ_COLORS[i].shape}</button>
                        <input value={opt} onChange={e=>setQuizQDraft(d=>({ ...d, opts:d.opts.map((o,j)=>j===i?e.target.value:o) }))} placeholder={`Alternativa ${i+1}${i>=2?" (opcional)":""}`}
                          style={{ flex:1, background:"#1e1430", border:"2px solid #3b2a58", borderRadius:8, padding:"8px 10px", color:"#f0e9fb", fontSize:12.5, outline:"none", minWidth:0 }} />
                      </div>
                    ))}
                  </div>
                  <label style={{ display:"flex", alignItems:"center", gap:6, marginTop:10, fontSize:12.5, color:"#fbbf24", cursor:"pointer" }}>
                    <input type="checkbox" checked={quizQDraft.hard} onChange={e=>setQuizQDraft(d=>({ ...d, hard:e.target.checked }))} />
                    ⭐ Difícil (vale pontos em dobro)
                  </label>
                  <button onClick={()=>{
                    const opts = quizQDraft.opts.map(o=>o.trim());
                    while (opts.length > 2 && !opts[opts.length-1]) opts.pop();
                    if (!quizQDraft.q.trim() || opts.some(o=>!o) || quizQDraft.correct >= opts.length) return;
                    setQuizEditingTheme(t=>({ ...t, questions:[...t.questions, { q:quizQDraft.q.trim(), opts, correct:quizQDraft.correct, ...(quizQDraft.hard?{hard:true}:{}) }] }));
                    setQuizQDraft({ q:"", opts:["","","",""], correct:0, hard:false });
                  }} style={{ ...styles.btn("#22d3ee"), marginTop:10, padding:"8px 16px", fontSize:13 }}>＋ Adicionar pergunta</button>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  <button onClick={saveQuizTheme} disabled={!quizEditingTheme.title.trim() || !quizEditingTheme.questions.length}
                    style={{ ...styles.btn("#34d399"), flex:1, padding:"10px 0", fontSize:13.5, opacity:(!quizEditingTheme.title.trim() || !quizEditingTheme.questions.length)?0.5:1 }}>💾 Salvar tema</button>
                  <button onClick={()=>setQuizEditingTheme(null)} style={{ ...styles.btnGhost, flex:1, padding:"10px 0", fontSize:13.5 }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        );
        // ── lobby: código gigante + jogadores entrando ──
        if (room.status === "lobby") return (
          <div style={{ padding:14, maxWidth:760, margin:"0 auto" }}>
            <div className="cardfx" style={{ ...styles.card, borderColor:"#c084fc", textAlign:"center" }}>
              <p style={{ color:"#a99ac9", fontSize:14, margin:"6px 0 0" }}>{room.themeTitle} · {room.questions.length} perguntas · ⏱ {quizSecsOf(room)}s por pergunta</p>
              <p style={{ color:"#a99ac9", fontSize:13, margin:"14px 0 4px" }}>Código da sala — fale pra turma digitar:</p>
              <div style={{ fontSize:"clamp(44px, 10vw, 72px)", fontWeight:900, letterSpacing:10, color:"#c084fc", textShadow:"0 0 30px #c084fc66" }}>{room.code}</div>
              <div style={{ marginTop:16 }}>
                <p style={{ color:"#f0e9fb", fontWeight:800, fontSize:15, marginBottom:10 }}>👥 Na sala ({players.length})</p>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center", minHeight:44 }}>
                  {players.length===0 && <span style={{ color:"#776798", fontSize:13 }}>Esperando a galera entrar...</span>}
                  {players.map(p => (
                    <span key={p.name} className="pop" style={{ display:"flex", alignItems:"center", gap:6, background:"#171026", border:"1px solid #c084fc55", borderRadius:20, padding:"5px 12px" }}>
                      <Avatar cfg={p.avatar} size={22} /><span style={{ fontSize:13, fontWeight:700 }}>{String(p.name).split(" ")[0]}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"center" }}>
                <button onClick={quizNextQuestion} disabled={players.length===0} style={{ ...styles.btn("#34d399"), padding:"12px 34px", fontSize:16, opacity:players.length===0?0.5:1 }}>🚀 Começar!</button>
                <button onClick={quizEnd} style={{ ...styles.btn("#f87171"), padding:"12px 20px", fontSize:14 }}>✖ Cancelar sala</button>
              </div>
            </div>
          </div>
        );
        // ── pódio final ──
        if (room.status === "podium") {
          const board = quizLeaderboard(room, students);
          return (
            <div style={{ padding:14, maxWidth:760, margin:"0 auto" }}>
              <div className="cardfx" style={{ ...styles.card, borderColor:"#fbbf24", textAlign:"center" }}>
                <h3 style={{ color:"#fbbf24", fontSize:24, marginBottom:4 }}>🏆 Pódio — {room.themeTitle}</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:14 }}>
                  {board.length===0 && <p style={{ color:"#776798" }}>Ninguém pontuou.</p>}
                  {board.map((p,i) => (
                    <div key={p.name} style={{ display:"flex", alignItems:"center", gap:10, background:i<3?"#fbbf2415":"#171026", border:`1px solid ${i<3?"#fbbf24":"#3b2a58"}`, borderRadius:10, padding:"9px 14px" }}>
                      <span style={{ fontSize:i<3?24:14, width:40, fontWeight:800, color:"#a99ac9" }}>{medal(i)}</span>
                      <Avatar cfg={p.avatar} size={30} />
                      <span style={{ flex:1, textAlign:"left", fontWeight:800, fontSize:15 }}>{p.name}</span>
                      <span style={{ color:"#fbbf24", fontWeight:900, fontSize:16 }}>{p.total} pts</span>
                    </div>
                  ))}
                </div>
                <button onClick={quizEnd} style={{ ...styles.btn("#c084fc"), marginTop:18, padding:"11px 30px", fontSize:14.5 }}>✔ Encerrar quiz</button>
              </div>
            </div>
          );
        }
        // ── pergunta rolando / revelação ──
        const q = room.questions[room.qIndex];
        const startedAt = room.startedAts[room.qIndex];
        const remaining = room.status==="question" ? Math.max(0, Math.ceil((startedAt + quizSecsOf(room)*1000 - quizNow)/1000)) : 0;
        const answeredCount = players.filter(p => (p.quizAnswers||{})[room.qIndex] != null).length;
        const optCount = (i) => players.filter(p => ((p.quizAnswers||{})[room.qIndex]||{}).opt === i).length;
        const board = quizLeaderboard(room, students).slice(0, 5);
        return (
          <div style={{ padding:14, maxWidth:860, margin:"0 auto" }}>
            <div className="cardfx" style={{ ...styles.card, borderColor:"#c084fc" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <span style={{ ...styles.badge("#c084fc") }}>Pergunta {room.qIndex+1} / {room.questions.length}</span>
                {q.hard && <span style={{ ...styles.badge("#fbbf24") }}>⭐ Vale em dobro</span>}
                {room.status==="question"
                  ? <span style={{ fontSize:30, fontWeight:900, color: remaining<=5 ? "#f87171" : "#34d399", fontVariantNumeric:"tabular-nums" }}>⏱ {remaining}s</span>
                  : <span style={{ ...styles.badge("#34d399") }}>Resposta revelada</span>}
              </div>
              <h3 style={{ color:"#f0e9fb", fontSize:"clamp(18px, 3.4vw, 26px)", lineHeight:1.4, margin:"14px 0" }}>{q.q}</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {q.opts.map((opt,i) => {
                  const isCorrect = i === q.correct;
                  const dim = room.status==="reveal" && !isCorrect;
                  return (
                    <div key={i} style={{ background:QUIZ_COLORS[i].bg, opacity:dim?0.3:1, borderRadius:12, padding:"16px 14px", color:"#fff", fontWeight:800, fontSize:15.5, display:"flex", alignItems:"center", gap:10, border: room.status==="reveal" && isCorrect ? "3px solid #fff" : "3px solid transparent" }}>
                      <span style={{ fontSize:20 }}>{QUIZ_COLORS[i].shape}</span>
                      <span style={{ flex:1 }}>{opt}</span>
                      {room.status==="reveal" && <span style={{ background:"#00000044", borderRadius:14, padding:"2px 10px", fontSize:13 }}>{optCount(i)} voto{optCount(i)!==1?"s":""}</span>}
                      {room.status==="reveal" && isCorrect && <span style={{ fontSize:20 }}>✅</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14, flexWrap:"wrap", gap:10 }}>
                <span style={{ color:"#a99ac9", fontSize:14 }}>✋ {answeredCount} de {players.length} responderam</span>
                {room.status==="question"
                  ? <button onClick={quizReveal} style={{ ...styles.btn("#fbbf24"), padding:"10px 22px", fontSize:14 }}>⏹ Encerrar pergunta</button>
                  : <button onClick={quizNextQuestion} style={{ ...styles.btn("#34d399"), padding:"10px 22px", fontSize:14 }}>{room.qIndex+1 < room.questions.length ? "Próxima ▶" : "🏆 Ver pódio"}</button>}
              </div>
            </div>
            {room.status==="reveal" && board.length > 0 && (
              <div className="cardfx" style={{ ...styles.card, borderColor:"#fbbf24" }}>
                <h4 style={{ color:"#fbbf24", marginBottom:10 }}>🏆 Placar parcial</h4>
                {board.map((p,i) => (
                  <div key={p.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 0", borderBottom:"1px solid #241f38" }}>
                    <span style={{ width:34, fontWeight:800, color:"#a99ac9" }}>{medal(i)}</span>
                    <span style={{ flex:1, fontWeight:700, fontSize:14 }}>{p.name}</span>
                    <span style={{ color:"#fbbf24", fontWeight:900 }}>{p.total} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {tab==="exam" && (() => {
        // cada turma tem sua própria prova independente (ver storage.js) — usa o mesmo filtro de
        // turma (shiftFilter) do topo da tela pra saber qual prova mostrar/gerenciar aqui
        const examStudents = (examConfig.shift && examConfig.shift !== "all") ? students.filter(s=>(s.shift||"sem-turno")===examConfig.shift) : students.filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id && (s.shift||"sem-turno") !== LANG_SHIFT.id);
        const readyStudents = examStudents.filter(s => s.examReady);
        const doneStudents  = examStudents.filter(s => s.examDone);
        const ranking = [...examStudents].filter(s=>s.examScore!=null).sort((a,b)=>(b.examScore||0)-(a.examScore||0));
        const qLen = (examConfig.questions||[]).length;
        const medal = (i) => i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
        return (
          <div style={{ padding:14, maxWidth:900, margin:"0 auto" }}>
            <p style={{ color:"#776798", fontSize:11.5, margin:"-4px 0 14px" }}>💡 Cada turma (filtro "Turma" lá em cima) tem sua própria prova, independente das outras — pode ter uma em andamento pra manhã e criar outra diferente pra tarde ao mesmo tempo.</p>

            {/* confirmação de encerrar */}
            {confirmEndExam && (
              <div style={{ position:"fixed", inset:0, background:"#000000aa", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
                <div style={{ background:"#1e1430", border:"2px solid #fbbf24", borderRadius:16, padding:24, maxWidth:400, width:"100%" }}>
                  <div style={{ fontSize:40, textAlign:"center" }}>⚠️</div>
                  <h3 style={{ color:"#fbbf24", textAlign:"center", margin:"8px 0" }}>Encerrar a prova agora?</h3>
                  <p style={{ color:"#d6c9ec", fontSize:14, textAlign:"center", lineHeight:1.6 }}>Os alunos que ainda não terminaram terão a pontuação parcial registrada.</p>
                  <div style={{ display:"flex", gap:10, marginTop:18 }}>
                    <button onClick={()=>setConfirmEndExam(false)} style={{ ...styles.btnGhost, flex:1 }}>Cancelar</button>
                    <button onClick={endExam} style={{ ...styles.btn("#f87171"), flex:1 }}>Encerrar</button>
                  </div>
                </div>
              </div>
            )}

            {/* estado: idle */}
            {examConfig.status === 'idle' && (
              <div className="cardfx" style={styles.card}>
                <h3 style={{ color:"#fbbf24", marginBottom:4 }}>🏆 Criar Prova</h3>
                <p style={{ color:"#a99ac9", fontSize:13, marginBottom:14, lineHeight:1.6 }}>A IA gera automaticamente um resumo de revisão e 10 questões de múltipla escolha com base no código de hoje. Os alunos revisam, entram na sala e então você inicia.</p>
                <p style={{ color:"#a99ac9", fontSize:12, marginBottom:10 }}>As questões são geradas a partir do código que você escreveu na aba <b>Meu código</b>. Se não houver, usa o código dos alunos.</p>
                <button onClick={startExam} disabled={examGenerating} style={{ ...styles.btn("#c084fc"), opacity:examGenerating?0.6:1, padding:"12px 24px", fontSize:15 }}>
                  {examGenerating ? "Gerando..." : "🚀 Gerar e Iniciar Prova"}
                </button>
                {examMsg && <p style={{ color:examMsg.startsWith("✅")?"#34d399":"#fbbf24", fontSize:13, marginTop:10, lineHeight:1.5 }}>{examMsg}</p>}
              </div>
            )}

            {/* estado: review */}
            {examConfig.status === 'review' && (
              <>
                <div className="cardfx" style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <h3 style={{ color:"#fbbf24", margin:"0 0 4px" }}>📝 Fase de Revisão</h3>
                      <p style={{ color:"#a99ac9", fontSize:13 }}>Os alunos estão revisando o conteúdo. Quando estiverem prontos, iniciam a prova.</p>
                      {examConfig.studyUntil && examNow < examConfig.studyUntil && (
                        <p style={{ color:"#c084fc", fontSize:12.5, marginTop:4, fontWeight:700 }}>
                          ⏳ Ainda tem {Math.ceil((examConfig.studyUntil - examNow) / 60000)} min de estudo — pode iniciar antes se a turma já estiver pronta.
                        </p>
                      )}
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={activateExam} style={{ ...styles.btn("#34d399") }}>▶ Iniciar Agora ({readyStudents.length} prontos)</button>
                      <button onClick={resetExam} style={{ ...styles.btnGhost, fontSize:13 }}>Cancelar</button>
                    </div>
                  </div>
                  {examMsg && <p style={{ color:"#34d399", fontSize:13, marginTop:10 }}>{examMsg}</p>}
                </div>
                <div className="cardfx" style={styles.card}>
                  <h4 style={{ color:"#fbbf24", marginBottom:10 }}>Alunos prontos ({readyStudents.length}/{examStudents.length})</h4>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {examStudents.map(s=>(
                      <div key={s.name} style={{ display:"flex", alignItems:"center", gap:8, background:"#171026", border:`1px solid ${s.examReady?"#34d399":"#3b2a58"}`, borderRadius:10, padding:"8px 12px" }}>
                        <Avatar cfg={s.avatar} size={26} />
                        <span style={{ fontSize:13 }}>{s.name}</span>
                        <span style={{ fontSize:14 }}>{s.examReady?"✅":"⏳"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* estado: active */}
            {examConfig.status === 'active' && (
              <>
                <div className="cardfx" style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <h3 style={{ color:"#fbbf24", margin:"0 0 4px" }}>🏆 Prova em andamento</h3>
                      <p style={{ color:"#a99ac9", fontSize:13 }}>{doneStudents.length}/{examStudents.length} alunos concluíram · {qLen} questões · {qLen*10} pts no máximo</p>
                    </div>
                    <button onClick={()=>setConfirmEndExam(true)} style={styles.btn("#f87171")}>⏹ Encerrar Prova</button>
                  </div>
                  {examMsg && <p style={{ color:"#34d399", fontSize:13, marginTop:8 }}>{examMsg}</p>}
                </div>
                <div className="cardfx" style={styles.card}>
                  <h4 style={{ color:"#fbbf24", marginBottom:12 }}>📊 Ranking ao vivo</h4>
                  {ranking.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>Aguardando alunos terminarem...</p> : (
                    ranking.map((s,i)=>(
                      <div key={s.name} style={{ background:"#171026", border:`1px solid ${i===0?"#fbbf24":"#3b2a58"}`, borderRadius:10, padding:"10px 14px", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <span style={{ fontSize:22, width:28 }}>{medal(i)||`#${i+1}`}</span>
                          <Avatar cfg={s.avatar} size={28} />
                          <span style={{ flex:1, fontWeight:600 }}>{s.name}</span>
                          <span style={{ color:"#34d399", fontWeight:700, fontSize:16 }}>{s.examScore} pts</span>
                          <span style={styles.badge(s.examDone?"#34d399":"#fbbf24")}>{s.examDone?"Concluído":"Respondendo"}</span>
                        </div>
                        {(s.examExits||0) > 0 && (
                          <p style={{ color:"#f87171", fontSize:12, margin:"6px 0 0 40px", fontWeight:700 }}>🚨 saiu da prova {s.examExits}x — desconto de {Math.min((s.examScoreRaw ?? ((s.examScore||0) + s.examExits*10)), s.examExits*10)} pts</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* estado: done */}
            {examConfig.status === 'done' && (
              <>
                <div className="cardfx" style={styles.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <h3 style={{ color:"#34d399", margin:"0 0 4px" }}>✅ Prova Encerrada</h3>
                      <p style={{ color:"#a99ac9", fontSize:13 }}>Resultado final · {doneStudents.length}/{examStudents.length} alunos concluíram</p>
                    </div>
                    <button onClick={resetExam} style={styles.btnGhost}>🔄 Nova Prova</button>
                  </div>
                </div>
                <div className="cardfx" style={{ ...styles.card, borderColor:"#c084fc" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <NyxRobot state="thinking" size={44} showName={false} />
                      <div>
                        <h4 style={{ color:"#c084fc", margin:0 }}>Análise do Nyx — período + prova</h4>
                        <p style={{ color:"#a99ac9", fontSize:12, margin:"2px 0 0" }}>Quem foi bem nas aulas e na prova, e quem precisa de atenção — com o porquê.</p>
                      </div>
                    </div>
                    <button onClick={nyxExamAnalysis} disabled={analyzingExam} style={{ ...styles.btn("#c084fc"), fontSize:13, opacity:analyzingExam?0.6:1 }}>
                      {analyzingExam ? "Analisando..." : examAnalysis ? "↻ Refazer análise" : "✨ Pedir análise"}
                    </button>
                  </div>
                  {examAnalysis && <p style={{ color:"#d6c9ec", fontSize:14, lineHeight:1.8, whiteSpace:"pre-wrap", margin:"12px 0 0" }}>{examAnalysis}</p>}
                </div>
                <div className="cardfx" style={styles.card}>
                  <h4 style={{ color:"#fbbf24", marginBottom:12 }}>🏆 Ranking Final</h4>
                  {ranking.length===0 ? <p style={{ color:"#776798", fontSize:13 }}>Nenhum aluno respondeu.</p> : (
                    ranking.map((s,i)=>(
                      <div key={s.name} style={{ background:i===0?"#fbbf2422":"#171026", border:`2px solid ${i===0?"#fbbf24":i===1?"#a99ac9":i===2?"#c2410c":"#3b2a58"}`, borderRadius:12, padding:"12px 16px", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <span style={{ fontSize:26, width:32 }}>{medal(i)||<span style={{color:"#776798",fontSize:16}}>#{i+1}</span>}</span>
                          <Avatar cfg={s.avatar} size={32} />
                          <span style={{ flex:1, fontWeight:700, fontSize:15 }}>{s.name}</span>
                          <span style={{ color:"#34d399", fontWeight:800, fontSize:20 }}>{s.examScore ?? 0}</span>
                          <span style={{ color:"#a99ac9", fontSize:12 }}>/{qLen*10}</span>
                        </div>
                        {(s.examExits||0) > 0 && (
                          <div style={{ margin:"8px 0 0 44px", padding:"8px 12px", background:"#f8717112", border:"1px solid #f8717155", borderRadius:8 }}>
                            <p style={{ color:"#fca5a5", fontSize:12.5, margin:0, fontWeight:700 }}>
                              🚨 Saiu da prova {s.examExits}x — nota sem desconto: {s.examScoreRaw ?? "—"} · com desconto: {s.examScore ?? 0}
                            </p>
                            {s.examAppeal?.status === "pending" && (
                              <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginTop:8 }}>
                                <span style={{ color:"#fbbf24", fontSize:12.5, fontWeight:700 }}>✋ O aluno alega que foi sem querer (a aba fechou).</span>
                                <button onClick={()=>decideAppeal(s, true)} style={{ ...styles.btn("#34d399"), padding:"5px 12px", fontSize:12 }}>✔ Aceitar (devolver pontos)</button>
                                <button onClick={()=>decideAppeal(s, false)} style={{ ...styles.btn("#f87171"), padding:"5px 12px", fontSize:12 }}>✕ Recusar</button>
                              </div>
                            )}
                            {s.examAppeal?.status === "accepted" && <p style={{ color:"#34d399", fontSize:12, margin:"6px 0 0", fontWeight:700 }}>✅ Defesa aceita — pontos devolvidos.</p>}
                            {s.examAppeal?.status === "rejected" && <p style={{ color:"#a99ac9", fontSize:12, margin:"6px 0 0", fontWeight:700 }}>Defesa recusada — desconto mantido.</p>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {examStudents.filter(s=>!s.examDone && s.examScore==null).length > 0 && (
                    <div style={{ marginTop:12, padding:"10px 14px", background:"#171c33", borderRadius:8 }}>
                      <p style={{ color:"#a99ac9", fontSize:12, marginBottom:6 }}>Não concluíram:</p>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {examStudents.filter(s=>!s.examDone && s.examScore==null).map(s=>(
                          <span key={s.name} style={{ background:"#3b2a58", color:"#a99ac9", borderRadius:8, padding:"4px 10px", fontSize:12 }}>{s.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })()}

      {profTourStep >= 0 && profTourStep < TEACHER_TOUR_STEPS.length && (
        <TourOverlay steps={TEACHER_TOUR_STEPS} step={profTourStep} onNext={()=>setProfTourStep(s => {
          const next = s+1 >= TEACHER_TOUR_STEPS.length ? -1 : s+1;
          // muda de aba ANTES do próximo passo aparecer, pra quem faz o tour ver o conteúdo de
          // verdade daquela aba (não só o botão) — as duas mudanças de estado ficam no mesmo clique,
          // então o React já renderiza a aba nova junto com o passo novo, sem piscar vazio
          if (next >= 0) { const wantTab = TEACHER_TOUR_STEPS[next].tab; if (wantTab) setTab(wantTab); }
          return next;
        })} />
      )}

      <NyxChat
        dataTour="chat-prof"
        accent="#fbbf24"
        onCommand={async (t) => {
          const cmd = t.toLowerCase();
          if (cmd === "zek") {
            await setNyxLocks({ zek: true }, teacherAuth);
            return "🔒 Modo ZEK ativado! Estou aparecendo na tela de TODOS os alunos pedindo atenção — tudo bloqueado até você digitar /hiberne.";
          }
          if (cmd === "/hiberne") {
            await setNyxLocks({ zek: false }, teacherAuth);
            return "😴 Zek desativado. As telas dos alunos foram liberadas.";
          }
          if (cmd === "zeker") {
            await setNyxLocks({ zeker: true }, teacherAuth);
            return "⚔️🚫 Duelos bloqueados! Nenhum aluno consegue duelar até você digitar /liberte.";
          }
          if (cmd === "/liberte") {
            await setNyxLocks({ zeker: false }, teacherAuth);
            return "⚔️✅ Duelos liberados! Os alunos já podem se desafiar de novo.";
          }
          return null;
        }}
        context={() => {
          // turma de teste fica fora do contexto do Nyx: é só para testar o sistema, não são alunos reais
          const rows = students.filter(s => (s.shift||"sem-turno") !== TEST_SHIFT.id).map(s => {
            const att = Object.values(s.attendance||{}).filter(v => v === "present").length;
            return `- ${s.name} [${shiftLabel(s.shift, turmas)}]: fase=${s.phase||"aguardando"}, presenças=${att}, nota atividade=${s.score ?? "—"}, nota prova=${s.examScore ?? "—"}, erro no código agora=${s.hasError ? "sim: " + (s.feedback?.message || "") : "não"}`;
          }).join("\n");
          const conteudoHoje = activeTurmas.map(t => `${t.label}: ${contentFor(t.id) || "ainda não definido"}`).join(" · ");
          return `Contexto: você é o assistente do professor. Situação de todas as turmas AGORA (a turma de teste não entra aqui):\n${rows || "(nenhum aluno entrou ainda)"}\nConteúdo de hoje — ${conteudoHoje}.`;
        }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(null);
  // lista de turmas (pode ter mais de uma no mesmo turno) pra tela de login — o painel do professor
  // carrega a sua própria cópia (ver TeacherView) porque precisa atualizar na hora ao criar/arquivar
  const [loginTurmas, setLoginTurmas] = useState(DEFAULT_TURMAS);
  useEffect(() => { getTurmas().then(t => { if (Array.isArray(t) && t.length) setLoginTurmas(t); }); }, []);
  // 🚨 captura erros de JS que quebram silenciosamente na tela do aluno/professor (sem precisar
  // que alguém perceba e avise) — manda só a mensagem/pilha/URL pro professor ver no painel dele,
  // nunca código ou dado pessoal. Um Set por sessão da página evita mandar a MESMA mensagem
  // repetidas vezes (comum quando um erro dispara dentro de um loop de render)
  const sessionRoleRef = useRef(null);
  useEffect(() => { sessionRoleRef.current = session?.role || null; }, [session]);
  useEffect(() => {
    const reported = new Set();
    const report = (message, stack) => {
      const msg = String(message || "erro desconhecido").slice(0, 500);
      if (reported.has(msg) || reported.size >= 8) return;
      reported.add(msg);
      reportClientError({ message: msg, stack: String(stack || "").slice(0, 1500), url: window.location.pathname, role: sessionRoleRef.current || "anon" });
    };
    const onError = (e) => report(e.message, e.error?.stack);
    const onRejection = (e) => report(e.reason?.message || e.reason, e.reason?.stack);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, []);
  // /impacto é pública (sem login) — pensada pra mostrar pra prefeitura/patrocinador, só números
  // agregados, nenhum dado de aluno específico
  if (typeof window !== "undefined" && window.location.pathname === "/impacto") return <ImpactPage />;
  // /portfolio/<turno>/<nome> é pública (sem login) — só existe conteúdo se o próprio aluno ligou
  // o opt-in "portfolioPublic" no painel dele
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/portfolio/")) {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return <PortfolioPage shift={decodeURIComponent(parts[1] || "")} name={decodeURIComponent(parts[2] || "")} />;
  }
  if (!session) return <Login turmas={loginTurmas} onJoin={(role,name,avatar,shift,isNew,teacherAuth,regData)=>setSession({role,name,avatar,shift,isNew,teacherAuth,regData})} />;
  if (session.role==="teacher") return <TeacherView onLogout={()=>setSession(null)} teacherAuth={session.teacherAuth} />;
  return <StudentView studentName={session.name} initialAvatar={session.avatar} shift={session.shift||"matutino"} isNew={session.isNew} initialBirthDate={session.regData?.birthDate||""} initialCpf={session.regData?.cpf||""} onLogout={()=>setSession(null)} />;
}
