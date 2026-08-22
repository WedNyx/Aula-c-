Warning: truncated output (original token count: 153451)
Total output lines: 8289

import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import gsap from "gsap";
import { Toaster, toast } from "sonner";
import { saveStudent, getStudent, setNudge, getNudge, listStudents, checkReset, resetAll, getTeacherMeta, saveTeacherMeta, getTeacherNotes, saveTeacherNotes, saveTeacherCode, getTeacherCode, setCodeSend, getCodeSend, clearCodeSend, reportAiHealth, getAiHealth, getAiHealthByProvider, diagnose, getExamState, setExamState, getExamStateForStudent, gradeExam, gradeTourneyRound, setDuel, getDuel, clearDuel, listDuels, getNyxLocks, setNyxLocks, patchStudent, deleteStudentProfile, setKick, checkKick, setScoreFix, getScoreFix, clearScoreFix, getAccessMode, setAccessMode, getSupport, setSupport, listAllSupport, exportAllData, triggerBackupNow, getBackupList, getTeacherLessons, saveTeacherLessons, getBoss, setBoss, clearBoss, getKeyboardLock, setKeyboardLock, getResumoTrigger, setResumoTrigger, getTeacherResumoHistory, saveTeacherResumoHistory, getTeacherResumoSnapshot, saveTeacherResumoSnapshot, getTourney, setTourney, clearTourney, getInspection, setInspection, getHallOfFame, getOwnHallOfFame, saveHallOfFame, setKeyboardLaunch, getKeyboardLaunch, setPartner, getPartner, clearPartner, listPartners, getQuizThemes, saveQuizThemes, getQuizRoom, setQuizRoom, clearQuizRoom, setCheckin, getCheckin, listCheckinsForDate, setTeamDuel, getTeamDuel, clearTeamDuel, listTeamDuels, reportClientError, getRecentErrors, getAdminLog, getTurmas, saveTurmas } from "./storage.js";
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
import { codeForSpeech, useViewportWidth, computeStreak, streakPointsFor, shuffleQuestions, filterValidQuestions, isDoneActive, gradeInfo, quickCheck, findMatchingLesson, codeDiffByFile } from "./lib/utils.js";
import { ACHIEVEMENTS, ALL_EGG_ACHIEVEMENT_IDS, achievementInfo, visibleAchievements, CLASS_GOALS, classGoalProgress } from "./lib/achievements.ts";
import { generateRelatorioDocx, downloadRelatorioDocx } from "./lib/reportDocx.js";
import { CS_SYSTEM, RUN_SYSTEM, nyxPrefsInstruction, NYX_GUIDED_SYSTEM } from "./lib/ai-prompts.ts";
import { STUDY_LANGUAGES, langById, reviewChecklistFor, buildPreviewDoc, otherFilesCtx, findLineIndex } from "./lib/languages.ts";
import { BRACKET_COLORS, highlight, highlightCSharp, highlightJS, highlightPHP, highlightCSS, highlightHTML } from "./lib/highlight.jsx";
import { ANALYZE_PROVIDERS, PARTNER_REWARD_HELPER, PARTNER_REWARD_HELPED, PARTNER_WEEKLY_CAP, isOffline, isNetworkError, askClaude, extractJson, askClaudeJson, buildSummaryRequest, buildContinuationSummaryRequest, mergeSummaryContinuation, recentDifficultyHint, adaptiveDifficultyTier } from "./lib/ai.js";
import { requestFS, goFullscreen, todayKey, weekKey, dateKeyOf, hmToMin, nowMin, classStatus } from "./lib/schedule.ts";
import { SHIFTS, TEST_SHIFT, LANG_SHIFT, shiftMeta, shiftLabel, isSameDayTs, contentNameFor, withContentName, DEFAULT_TURMAS, TURMA_COLORS, turmaCalendar, withTurmaCalendar, isSevenDayShift } from "./lib/shifts.ts";
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
import { LunarSanctuary } from "./components/LunarSanctuary.jsx";
import { MobileMonitorView } from "./components/MobileMonitor.jsx";
import { Sparkles } from "./components/Sparkles.jsx";
import { CollapsibleCard } from "./components/CollapsibleCard.jsx";
import { Calendar } from "./components/Calendar.jsx";
import { CodeLab } from "./components/CodeLab.jsx";
import { TeacherNotesModal } from "./components/TeacherNotesModal.jsx";
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
  const [showLunarSanctuary, setShowLunarSanctuary] = useState(false);
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
  // versão das novidades apresentadas pelo Nyx Lunar. Fica salva no perfil do aluno para não
  // repetir o tour em outro aparelho depois que ele já tiver visto.
  const NYX_NEWS_VERSION = "2026-08-skins";
  const [nyxNewsSeen, setNyxNewsSeen] = useState("");
  const [showNyxNews, setShowNyxNews] = useState(false);
  const hasNyxNews = nyxNewsSeen !== NYX_NEWS_VERSION;
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
    stateRef.current = { files, code:activeCode, avatar, phase, score, answers, feedback, dynamicActivity, dynamicSummary, finalFeedback, classFeedback: classFb, examReady, examScore, examAnswers, examDone, examExits, examScoreRaw, examAppeal, examScoreSeen, examOptIn, examGuidedMode, examGuidedQuestions, examGuidedAnswers, examGuidedCorrect, helpAt, wantsPartner, selfSupport, typingBest, typingRewardDay, knowledgeTestRewardDay, streakRewardDay, giftLastClaim, theme, themeBeforeSpartan, treasureFound, spartanIntroShown, warmupDay, retroSeen, tourneyAnswer, tourneyClaimed, nyxPoints, nyxSpent, nyxOwned, nyxGear, nyxNewsSeen, nyxPrefs, birthDate, cpf, achievements, doneAt, scoreHistory, errorHistory, summaryHistory, detailedSummary, detailedSummaryHistory, duelWins, pastedLines, weeklyChallenge, guidedBlocks, guidedLessons, justifications, keyboardDone, portfolioPublic, portfolioActivatedAt, errorAt, errorMsg, programmingLanguage, languageHistory, quizJoin, quizAnswers };
  });

  // se o professor bloquear os duelos com o modal aberto, fecha na hora
  useEffect(() => { if (nyxLocks.zeker && showDuel) setShowDuel(false); }, [nyxLocks.zeker, showDuel]);
  useEffect(() => { if (nyxLocks.zeker && showTeamDuel) setShowTeamDuel(false); }, [nyxLocks.zeker, showTeamDuel]);

  // ── início do intervalo: som suave uma vez só por intervalo ──
  const classStatusNow = classStatus(mySchedule, myAllowWeekend || isSevenDayShift(shift));
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
      const csNow = classStatus((meta.schedule || {})[shift] || {}, !!meta.allowWeekend || isSevenDayShift(shift));
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
      nyxNewsSeen: s.nyxNewsSeen || "",
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
          if (prev.nyxNewsSeen) setNyxNewsSeen(prev.nyxNewsSeen);
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
    …113451 tokens truncated…   ))}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🏆 Nota:</span>
                      <input type="number" min={0} max={100} value={scoreVal} onChange={e=>setScoreVal(e.target.value)} placeholder={sel.score!=null?String(sel.score):"—"}
                        style={{ width:90, background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 10px", color:"#f0e9fb", fontSize:13, outline:"none" }} />
                      <button onClick={()=>doSetScore(sel)} disabled={scoreVal===""} style={{ ...styles.btn("#34d399"), padding:"6px 14px", fontSize:12.5, opacity:scoreVal!==""?1:0.5 }}>Alterar nota da atividade</button>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>🌙 Pontos Nyx:</span>
                      <input type="number" min={1} max={10000} step={1} value={nyxPointVal} onChange={e=>setNyxPointVal(e.target.value)} placeholder="Quantidade"
                        style={{ width:110, background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 10px", color:"#f0e9fb", fontSize:13, outline:"none" }} />
                      <button onClick={()=>doRestoreNyxPoints(sel)} disabled={!nyxPointVal || parseInt(nyxPointVal,10)<=0} style={{ ...styles.btn("#fbbf24"), padding:"6px 14px", fontSize:12.5, opacity:nyxPointVal && parseInt(nyxPointVal,10)>0?1:0.5 }}>Enviar pontos</button>
                      <span style={{ color:"#776798", fontSize:11.5, flex:"1 1 180px" }}>Total atual: <b style={{ color:"#fbbf24" }}>{sel.nyxPoints||0}</b> · use para recuperar progresso perdido.</span>
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
                      <span style={{ color:"#a99ac9", fontSize:13, minWidth:88 }}>📚 Resumo:</span>
                      <button onClick={()=>enviarResumoParaAluno(sel)} style={{ ...styles.btn("#fbbf24"), padding:"6px 14px", fontSize:12.5 }}>Enviar resumo de hoje</button>
                      <span style={{ color:"#776798", fontSize:11.5, flex:"1 1 200px" }}>Manda o resumo já gerado hoje (turno {shiftLabel(sel.shift, turmas)}) direto pro Caderno de resumos deste aluno.</span>
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
              const jaEnviado = !!resumoTriggeredToday[codeShift];
              const resumoHoje = teacherResumoHistory[todayKey()];
              return (
                <div data-tour-prof="resumo-ritmo" className="cardfx" style={{ ...styles.card, padding:12, margin:"6px 0" }}>
                  <h3 style={{ color:"#fbbf24", margin:0, fontSize:15 }}>📚 Resumo da aula — {shiftMeta(codeShift, turmas).label}</h3>
                  <p style={{ color:"#a99ac9", fontSize:12.5, margin:"4px 0 10px", lineHeight:1.5 }}>Gere o resumo a partir do seu código — ele fica guardado no seu Caderno pra você revisar antes de enviar pra turma.</p>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <button onClick={()=>gerarResumoHoje(codeShift)} disabled={resumoTriggerBusy} style={{ ...styles.btn("#c084fc"), padding:"7px 14px", fontSize:12.5, opacity:resumoTriggerBusy?0.6:1 }}>
                      {resumoTriggerBusy ? "Gerando..." : resumoHoje ? "🔄 Gerar de novo" : "📚 Gerar resumo"}
                    </button>
                    <button onClick={()=>setShowTeacherNotebook(true)} style={{ ...styles.btnGhost, padding:"7px 14px", fontSize:12.5 }}>📖 Meu Caderno de resumos</button>
                    {resumoHoje && (
                      jaEnviado ? (
                        <span style={styles.badge("#34d399")}>✅ Já enviado pra turma hoje</span>
                      ) : (
                        <button onClick={()=>enviarResumoParaTurma(codeShift)} disabled={resumoSendBusy} style={{ ...styles.btn("#22d3ee"), padding:"7px 14px", fontSize:12.5, opacity:resumoSendBusy?0.6:1 }}>
                          {resumoSendBusy ? "Enviando..." : "📤 Enviar pra turma toda"}
                        </button>
                      )
                    )}
                  </div>
                  {resumoHoje && (
                    <p style={{ color:"#a99ac9", fontSize:12, margin:"8px 0 0", lineHeight:1.5 }}>
                      📄 Resumo de hoje: {resumoHoje.secoes?.length || 0} conceito{resumoHoje.secoes?.length===1?"":"s"} — {(resumoHoje.secoes||[]).map(s=>s.titulo).filter(Boolean).join(", ") || "—"}
                    </p>
                  )}
                  {resumoTriggerMsg && <p style={{ color:resumoTriggerMsg.startsWith("✅")?"#34d399":resumoTriggerMsg.startsWith("ℹ️")?"#a99ac9":"#f87171", fontSize:12.5, margin:"8px 0 0", lineHeight:1.5 }}>{resumoTriggerMsg}</p>}
                </div>
              );
            })()}
            {showTeacherNotebook && <NotebookModal history={teacherResumoHistory} detailedHistory={null} onClose={()=>setShowTeacherNotebook(false)} />}

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
                  <div className="mobile-grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    <label style={{ fontSize:11.5, color:"#a99ac9" }}>Início da aula
                      <input type="time" value={sc.start||""} onChange={e=>setSc({start:e.target.value})} style={{ width:"100%", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 8px", color:"#f0e9fb", fontSize:13, marginTop:3 }} />
                    </label>
                    <label style={{ fontSize:11.5, color:"#a99ac9" }}>Fim da aula
                      <input type="time" value={sc.end||""} onChange={e=>setSc({end:e.target.value})} style={{ width:"100%", background:"#171026", border:"1px solid #3b2a58", borderRadius:8, padding:"7px 8px", color:"#f0e9fb", fontSize:13, marginTop:3 }} />
                    </label>
                  </div>
                  <div className="mobile-grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
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
                  <div className="mobile-grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
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
              <div className="mobile-grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
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
