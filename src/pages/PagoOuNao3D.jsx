import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../firebase/config.js';
import confetti from 'canvas-confetti';
import {
  ShieldAlert,
  Dices,
  Users,
  BookOpen,
  Play,
  Plus,
  Award,
  CheckCircle2,
  Eye,
  Scale,
  RotateCcw,
  Landmark,
  FileSpreadsheet,
  HandCoins,
  Layers,
  GitFork,
  Monitor,
  Smartphone,
  Bot,
  ExternalLink,
  Trash2,
  Lock,
  ArrowLeft
} from 'lucide-react';
import Board3DScene from '../modules/pago-ou-nao/components/Board3DScene.jsx';
import {
  MediatorConsoleOverlay,
  MobilePlayerController
} from '../modules/pago-ou-nao/components/MultiModeConsole.jsx';
import {
  createInitialGameState,
  createPlayer,
  submitRoundTaxVote,
  closeRoundReveal,
  performSpontaneousDenunciation,
  performRollDice,
  applyForkChoice,
  applyCharityChoice,
  applyDenunciaAction,
  confirmReadDecision,
  advanceTurn,
  finishGameOfficial
} from '../modules/pago-ou-nao/logic/gameEngine.js';
import { BOARD_TILES, SERVICE_CARDS } from '../modules/pago-ou-nao/data/boardData.js';

function getRoomDocRef(roomCode) {
  const clean = (roomCode || '').trim().toUpperCase();
  return doc(db, 'artifacts', appId, 'public', 'data', 'pulso_sessoes', `PON_${clean}`);
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getOrCreateClientPlayerId() {
  const key = 'pago_ou_nao_client_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `player_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export default function PagoOuNao3D({ isEmbeddedInLayout = false }) {
  const { codigo: urlCodigoParam } = useParams();
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const initialRole = urlParams.get('role'); // 'telao' se aberto como aba secundária do Telão
  const initialJoinCode = urlCodigoParam || urlParams.get('join'); // Código da sala se aberto via QR Code no celular

  const [isTelaoTab] = useState(initialRole === 'telao');
  // 3 Modos de Jogo: 'solo' (Contra Bots) | 'mediator' (2 Telas: Mediador + Telão) | 'online' (Telão + Celulares via Firebase)
  const [selectedLobbyMode, setSelectedLobbyMode] = useState(
    initialJoinCode ? 'online' : 'mediator'
  );
  const [mobileShowBoard, setMobileShowBoard] = useState(false);

  const [gameState, setGameState] = useState(() => {
    if (initialRole === 'telao') {
      try {
        const saved = localStorage.getItem('pago_ou_nao_state');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        // Ignora erro de parse
      }
    }
    const initial = createInitialGameState('MEDIADOR', 'mediator');
    initial.players = [
      createPlayer({ id: 'team1', name: 'Equipe 1 (Verde)', isBot: false, colorIndex: 0 }),
      createPlayer({ id: 'team2', name: 'Equipe 2 (Azul)', isBot: false, colorIndex: 1 }),
      createPlayer({ id: 'team3', name: 'Equipe 3 (Amarela)', isBot: false, colorIndex: 2 }),
      createPlayer({ id: 'team4', name: 'Equipe 4 (Roxa)', isBot: false, colorIndex: 3 })
    ];
    return initial;
  });

  const [myPlayerId, setMyPlayerId] = useState(() => getOrCreateClientPlayerId());
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState(
    initialJoinCode ? initialJoinCode.toUpperCase() : ''
  );
  const [activeOnlineRoomCode, setActiveOnlineRoomCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedTileInfo, setSelectedTileInfo] = useState(null);
  const [showIntroModal, setShowIntroModal] = useState(!initialRole && !initialJoinCode);
  const [introSlide, setIntroSlide] = useState(1);
  const TOTAL_INTRO_SLIDES = 15;
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showServiceCardsModal, setShowServiceCardsModal] = useState(false);
  const [showMediatorPanel, setShowMediatorPanel] = useState(false);
  const [showPlayersPanel, setShowPlayersPanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showPathOverlay, setShowPathOverlay] = useState(false);
  const [boardVisualMode, setBoardVisualMode] = useState('3d_world'); // '3d_world' | '2d_classic'
  const [isAnimatingRoll, setIsAnimatingRoll] = useState(false);

  const broadcastRef = useRef(null);

  // Helper para persistir estado da sala no Firebase Firestore (Modo Telão + Celulares)
  const pushStateToFirestore = async (roomCode, nextState) => {
    try {
      const cleanState = JSON.parse(JSON.stringify(nextState));
      await setDoc(getRoomDocRef(roomCode), {
        ...cleanState,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error('Erro ao sincronizar sala no Firestore:', err);
    }
  };

  // Listener em Tempo Real do Firebase Firestore quando conectado a uma sala Online
  useEffect(() => {
    if (!activeOnlineRoomCode) return;
    const roomRef = getRoomDocRef(activeOnlineRoomCode);
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (snap.exists()) {
          setGameState(snap.data());
        }
      },
      (err) => {
        console.error('Erro no onSnapshot da sala:', err);
      }
    );
    return () => unsub();
  }, [activeOnlineRoomCode]);

  // Sincronização em Tempo Real entre as 2 Abas do Modo Mediador (Console do Mediador <-> Aba do Telão 3D)
  useEffect(() => {
    const channel = new BroadcastChannel('pago_ou_nao_sync');
    broadcastRef.current = channel;

    channel.onmessage = (event) => {
      if (isTelaoTab && event.data?.type === 'SYNC_STATE' && event.data.state) {
        setGameState(event.data.state);
      } else if (!isTelaoTab && event.data?.type === 'REQUEST_STATE') {
        channel.postMessage({ type: 'SYNC_STATE', state: gameState });
      }
    };

    const handleStorage = (e) => {
      if (isTelaoTab && e.key === 'pago_ou_nao_state' && e.newValue) {
        try {
          setGameState(JSON.parse(e.newValue));
        } catch (err) {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    if (isTelaoTab) {
      channel.postMessage({ type: 'REQUEST_STATE' });
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      channel.close();
    };
  }, [isTelaoTab]);

  // Sempre que o estado mudar na aba principal, transmite instantaneamente para a Aba do Telão!
  useEffect(() => {
    if (!isTelaoTab) {
      try {
        localStorage.setItem('pago_ou_nao_state', JSON.stringify(gameState));
        broadcastRef.current?.postMessage({ type: 'SYNC_STATE', state: gameState });
      } catch (e) {
        // ignore quota errors
      }
    }
  }, [gameState, isTelaoTab]);

  const handleOpenTelaoTab = () => {
    const url = `${window.location.origin}/pago-ou-nao-telao?role=telao`;
    window.open(url, 'PagoOuNaoTelao', 'noopener');
  };

  // Quando o dado 3D é lançado (diceRollId aumenta), aguarda o dado rolar (1.2s) + o pino caminhar pelas casas antes de abrir a janela da casa!
  useEffect(() => {
    if (!gameState.diceRollId) return;
    setIsAnimatingRoll(true);
    const steps = gameState.lastDice || 3;
    const totalAnimMs = 1200 + steps * 700 + 350;
    const timer = setTimeout(() => {
      setIsAnimatingRoll(false);
    }, totalAnimMs);
    return () => clearTimeout(timer);
  }, [gameState.diceRollId]);

  useEffect(() => {
    if (gameState.status === 'finished') {
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
    }
  }, [gameState.status]);

  // Automação dos Bots durante os turnos de movimento no tabuleiro
  useEffect(() => {
    if (isTelaoTab) return;
    if (gameState.status !== 'playing' || gameState.phase !== 'board_turns') return;
    if (gameState.pendingDecision?.type === 'round_reveal') return;
    if (gameState.pendingDecision?.type === 'tile_summary') return;
    if (isAnimatingRoll) return;

    const currentPlayer = gameState.players[gameState.turnIndex];
    if (!currentPlayer || !currentPlayer.isBot) return;
    if (gameState.mode === 'online' && gameState.hostId !== myPlayerId) return;

    const timer = setTimeout(() => {
      if (!gameState.pendingDecision) {
        handleRollDice();
      } else if (gameState.pendingDecision.type === 'fork_choice') {
        const opts = gameState.pendingDecision.options || [];
        const picked = opts[Math.floor(Math.random() * opts.length)];
        if (picked) handleForkChoice(picked.nextTileId);
      } else if (gameState.pendingDecision.type === 'charity_choice') {
        handleCharityChoice(currentPlayer.money >= 900);
      } else if (gameState.pendingDecision.type === 'denuncia_choice') {
        const others = gameState.players.filter((p) => p.id !== currentPlayer.id);
        const suspect = others.sort((a, b) => b.money - a.money)[0];
        if (suspect) {
          handleDenunciaAction('accuse', suspect.id);
        } else {
          handleDenunciaAction('skip', null);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState, isAnimatingRoll, isTelaoTab, myPlayerId]);

  // Alternar Modo de Jogo no Lobby
  const handleSelectLobbyMode = (newMode) => {
    setSelectedLobbyMode(newMode);
    setErrorMsg('');
    setActiveOnlineRoomCode('');
    if (newMode === 'solo') {
      const fresh = createInitialGameState('SOLO', 'solo');
      fresh.players = [
        createPlayer({ id: 'p1', name: 'Você (Empresa 1)', isBot: false, colorIndex: 0 }),
        createPlayer({ id: 'bot1', name: 'Ana (Cidadã)', isBot: true, colorIndex: 1 }),
        createPlayer({ id: 'bot2', name: 'Carlos (Arriscado)', isBot: true, colorIndex: 2 })
      ];
      setMyPlayerId('p1');
      setGameState(fresh);
    } else if (newMode === 'mediator') {
      const fresh = createInitialGameState('MEDIADOR', 'mediator');
      fresh.players = [
        createPlayer({ id: 'team1', name: 'Equipe 1 (Verde)', isBot: false, colorIndex: 0 }),
        createPlayer({ id: 'team2', name: 'Equipe 2 (Azul)', isBot: false, colorIndex: 1 }),
        createPlayer({ id: 'team3', name: 'Equipe 3 (Amarela)', isBot: false, colorIndex: 2 }),
        createPlayer({ id: 'team4', name: 'Equipe 4 (Roxa)', isBot: false, colorIndex: 3 })
      ];
      setGameState(fresh);
    }
  };

  // Handlers Híbridos (Individual + Mediador + Online via Firebase Firestore)
  const handleStartGame = async () => {
    if (gameState.players.length < 2) {
      setErrorMsg('Adicione pelo menos 2 participantes/equipes para iniciar a partida!');
      return;
    }
    const nextState = { ...gameState, status: 'playing', phase: 'tax_vote' };
    setGameState(nextState);
    if (gameState.mode === 'online') {
      await pushStateToFirestore(gameState.roomCode, nextState);
    }
  };

  const handleAddPlayer = async (isBot = false) => {
    if (gameState.players.length >= 6) return;
    const idx = gameState.players.length;
    const botNames = ['Ana (Cidadã)', 'Carlos (Arriscado)', 'Bianca (Fiscal)', 'Marcos (Sonegador)'];
    const defaultLabel = gameState.mode === 'mediator' ? `Equipe ${idx + 1}` : `Empresa ${idx + 1}`;
    const name = isBot
      ? botNames[idx % botNames.length]
      : playerNameInput.trim() || defaultLabel;
    const newP = createPlayer({
      id: isBot ? `bot-${Date.now()}` : `local-${Date.now()}`,
      name,
      isBot,
      colorIndex: idx
    });
    setPlayerNameInput('');
    const nextState = { ...gameState, players: [...gameState.players, newP] };
    setGameState(nextState);
    if (gameState.mode === 'online') {
      await pushStateToFirestore(gameState.roomCode, nextState);
    }
  };

  const handleRemovePlayer = async (playerId) => {
    const nextState = {
      ...gameState,
      players: gameState.players
        .filter((p) => p.id !== playerId)
        .map((p, i) => ({ ...p, colorIndex: i }))
    };
    setGameState(nextState);
    if (gameState.mode === 'online') {
      await pushStateToFirestore(gameState.roomCode, nextState);
    }
  };

  const handleCreateOnlineRoom = async (asTelaoHost = true) => {
    try {
      const code = generateRoomCode();
      const hostClientId = getOrCreateClientPlayerId();
      setMyPlayerId(hostClientId);

      const state = createInitialGameState(code, 'online');
      state.hostId = hostClientId;
      state.isTelaoHost = asTelaoHost;
      if (!asTelaoHost) {
        state.players.push(
          createPlayer({
            id: hostClientId,
            name: playerNameInput.trim() || 'Empresa 1',
            isBot: false,
            colorIndex: 0
          })
        );
      }
      await pushStateToFirestore(code, state);
      setActiveOnlineRoomCode(code);
      setGameState(state);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Erro ao criar sala no Firebase: ' + err.message);
    }
  };

  const handleJoinOnlineRoom = async () => {
    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Digite o código de 4 letras da sala!');
      return;
    }
    try {
      const snap = await getDoc(getRoomDocRef(cleanCode));
      if (!snap.exists()) {
        setErrorMsg('Sala não encontrada! Verifique o código no Telão.');
        return;
      }
      const remoteState = snap.data();
      const clientId = getOrCreateClientPlayerId();
      setMyPlayerId(clientId);

      // Se o jogador já estava na sala (ex: deu refresh no celular), apenas reconecta!
      const alreadyInRoom = remoteState.players?.some((p) => p.id === clientId);
      if (!alreadyInRoom) {
        if (remoteState.status !== 'lobby') {
          setErrorMsg('A partida já começou!');
          return;
        }
        if ((remoteState.players?.length || 0) >= 6) {
          setErrorMsg('A sala já atingiu o limite de 6 participantes!');
          return;
        }
        const newP = createPlayer({
          id: clientId,
          name: playerNameInput.trim() || `Equipe ${(remoteState.players?.length || 0) + 1}`,
          isBot: false,
          colorIndex: remoteState.players?.length || 0
        });
        remoteState.players = [...(remoteState.players || []), newP];
        await pushStateToFirestore(cleanCode, remoteState);
      }

      setActiveOnlineRoomCode(cleanCode);
      setGameState(remoteState);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Erro ao entrar na sala: ' + err.message);
    }
  };

  const applyAndSyncState = async (updaterFn) => {
    const nextState = updaterFn(gameState);
    setGameState(nextState);
    if (gameState.mode === 'online' && gameState.roomCode) {
      await pushStateToFirestore(gameState.roomCode, nextState);
    }
  };

  const handleTaxVote = (payTax, customPlayerId = null) => {
    const voterId =
      customPlayerId ||
      (gameState.mode === 'solo' ? gameState.players[0]?.id : myPlayerId);
    applyAndSyncState((prev) => submitRoundTaxVote(prev, voterId, payTax));
  };

  const handleSpontaneousDenunciation = (customPlayerId = null) => {
    const currentPlayer = gameState.players[gameState.turnIndex];
    const targetId = customPlayerId || currentPlayer?.id;
    if (!targetId) return;
    applyAndSyncState((prev) => performSpontaneousDenunciation(prev, targetId));
  };

  const handleRollDice = () => {
    applyAndSyncState((prev) => performRollDice(prev));
  };

  const handleForkChoice = (chosenNextTileId) => {
    const currentPlayer = gameState.players[gameState.turnIndex];
    if (!currentPlayer) return;
    applyAndSyncState((prev) => applyForkChoice(prev, currentPlayer.id, chosenNextTileId));
  };

  const handleConfirmRead = () => {
    if (gameState.mode === 'mediator') {
      applyAndSyncState((prev) => {
        if (!prev.pendingDecision) return prev;
        if (prev.pendingDecision.type === 'round_reveal') {
          return closeRoundReveal(prev);
        }
        return confirmReadDecision(prev, prev.players[0]?.id);
      });
      return;
    }
    const readerId = gameState.mode === 'solo' ? gameState.players[0]?.id : myPlayerId;
    if (gameState.mode === 'online' && gameState.isTelaoHost && myPlayerId === gameState.hostId) {
      applyAndSyncState((prev) => confirmReadDecision(prev, 'FORCE_ALL'));
      return;
    }
    applyAndSyncState((prev) => confirmReadDecision(prev, readerId));
  };

  const handleCharityChoice = (donate) => {
    const currentPlayer = gameState.players[gameState.turnIndex];
    if (!currentPlayer) return;
    applyAndSyncState((prev) => applyCharityChoice(prev, currentPlayer.id, donate));
  };

  const handleDenunciaAction = (actionType, targetPlayerId = null) => {
    const currentPlayer = gameState.players[gameState.turnIndex];
    if (!currentPlayer) return;
    applyAndSyncState((prev) =>
      applyDenunciaAction(prev, currentPlayer.id, actionType, targetPlayerId)
    );
  };

  const handleForceFinish = () => {
    applyAndSyncState((prev) => finishGameOfficial(prev, null));
  };

  const handleResetGame = () => {
    handleSelectLobbyMode(selectedLobbyMode);
  };

  const currentPlayer = gameState.players[gameState.turnIndex];
  const isOnlineTelaoHost =
    gameState.mode === 'online' && gameState.isTelaoHost && myPlayerId === gameState.hostId;
  const isOnlineMobilePlayer =
    gameState.mode === 'online' && !isOnlineTelaoHost;
  const isPublicTelaoView =
    isTelaoTab || gameState.mode === 'mediator' || isOnlineTelaoHost;

  const isMyTurn =
    gameState.mode === 'solo'
      ? !currentPlayer?.isBot
      : gameState.mode === 'mediator'
      ? !isTelaoTab
      : currentPlayer?.id === myPlayerId;

  const myPlayerObj =
    gameState.mode === 'solo'
      ? gameState.players.find((p) => !p.isBot) || gameState.players[0]
      : gameState.mode === 'online'
      ? gameState.players.find((p) => p.id === myPlayerId)
      : null;

  const mobileJoinUrl = `${window.location.origin}/pago-ou-nao/sala/${gameState.roomCode}`;

  return (
    <div
      className={`${
        isEmbeddedInLayout ? 'w-full h-[calc(100vh-5rem)] rounded-2xl' : 'w-screen h-screen'
      } bg-slate-950 text-white flex flex-col overflow-hidden relative font-sans`}
    >
      {/* CENA 3D COM TABULEIRO OFICIAL COSTURADO + MAQUETES 3D + DADO 3D FÍSICO */}
      <div className="absolute inset-0 z-0">
        <Board3DScene
          gameState={gameState}
          onSelectTile={(tile) => setSelectedTileInfo(tile)}
          showPathOverlay={showPathOverlay}
          boardVisualMode={boardVisualMode}
        />
      </div>

      {/* BARRA SUPERIOR (STATUS DO ESTADO E CARTÕES DE SERVIÇO) */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          {!isEmbeddedInLayout && !isTelaoTab && !initialJoinCode && (
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Voltar ao Trilha Digital"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-md">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-sky-200 to-emerald-300 bg-clip-text text-transparent">
                PAGO OU NÃO? 3D
              </h1>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Receita Federal • Trilha Digital
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Sala: <span className="text-amber-400 font-mono font-bold">{gameState.roomCode}</span> • Período Fiscal #{gameState.roundNumber} • Trilha de 78 Casas
            </p>
          </div>
        </div>

        {/* DESTINO DO ESTADO NA RODADA ATUAL */}
        <div
          className={`px-4 py-1.5 rounded-2xl border flex items-center gap-2.5 shadow-md transition-all ${
            gameState.stateHasResources
              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
              : 'bg-red-950/90 border-red-500 text-red-200 animate-pulse'
          }`}
        >
          <Landmark className="w-5 h-5 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
              Status do Estado nesta Rodada
            </div>
            <div className="text-xs sm:text-sm font-black">
              {gameState.stateHasResources
                ? '✅ INVESTIMENTOS SUFICIENTES (Maioria Pagou)'
                : '🚨 INVESTIMENTOS INSUFICIENTES (Sonegação/Empate)'}
            </div>
          </div>
        </div>

        {/* Botões de Consulta aos Cartões de Serviço, Mundo 3D/2D, Trilha, Mediador e Regras */}
        <div className="flex items-center gap-2">
          {isTelaoTab ? (
            <span className="px-3 py-1.5 rounded-lg text-xs font-black bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow">
              <Monitor className="w-3.5 h-3.5" />
              TELÃO 3D (SINCRONIZADO)
            </span>
          ) : (
            gameState.mode === 'mediator' && (
              <button
                onClick={handleOpenTelaoTab}
                className="px-3 py-1.5 rounded-lg text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 shadow transition"
                title="Abrir segunda aba limpa com o Mapa 3D para o Projetor / TV"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Abrir Aba do Telão</span>
              </button>
            )
          )}

          {isOnlineMobilePlayer && gameState.status === 'playing' && (
            <button
              onClick={() => setMobileShowBoard((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg text-xs font-black bg-sky-400 text-slate-950 flex items-center gap-1.5 shadow"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{mobileShowBoard ? 'Voltar à Minha Carteira' : 'Ver Mapa'}</span>
            </button>
          )}

          <button
            onClick={() => setShowPlayersPanel((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
              showPlayersPanel
                ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-sky-500/30'
            }`}
            title="Mostrar ou ocultar o painel de Empresas / Jogadores"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Empresas / Jogadores</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-black">
              {gameState.players.length}
            </span>
          </button>

          <button
            onClick={() => setShowHistoryPanel((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
              showHistoryPanel
                ? 'bg-indigo-500 text-slate-950 border-indigo-300 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border-indigo-500/30'
            }`}
            title="Mostrar ou ocultar o Histórico da Sociedade"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Histórico</span>
          </button>

          <button
            onClick={() =>
              setBoardVisualMode((prev) =>
                prev === '3d_world' ? '2d_classic' : '3d_world'
              )
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 border transition ${
              boardVisualMode === '3d_world'
                ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-slate-950 border-emerald-300 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
            }`}
          >
            <span>{boardVisualMode === '3d_world' ? '🌍 Mundo 3D' : '🗺️ Tabuleiro 2D'}</span>
          </button>

          <button
            onClick={() => setShowPathOverlay(!showPathOverlay)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
              showPathOverlay
                ? 'bg-sky-500 text-slate-950 border-sky-300'
                : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-sky-500/30'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Trilha/Bifurcações</span>
          </button>

          <button
            onClick={() => setShowServiceCardsModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cartões de Serviço</span>
          </button>

          {!isTelaoTab && !isOnlineMobilePlayer && !initialJoinCode && (
            <button
              onClick={() => setShowMediatorPanel(!showMediatorPanel)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
                showMediatorPanel
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Facilitador</span>
            </button>
          )}

          <button
            onClick={() => setShowRulesModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Regras</span>
          </button>
        </div>
      </header>

      {/* PAINEL DO FACILITADOR */}
      {showMediatorPanel && (
        <div className="relative z-20 mx-4 mt-2 p-3 rounded-xl bg-amber-950/95 border border-amber-500/50 backdrop-blur-md shadow-2xl flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Landmark className="w-4 h-4" /> Painel do Facilitador / Receita Federal
            </h3>
            <p className="text-[11px] text-amber-200/80">
              Controle confidencial de impostos sonegados e encerramento pedagógico da partida:
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {gameState.players.map((p) => (
              <div
                key={p.id}
                className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-amber-500/30 text-xs flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="font-bold">{p.name}:</span>
                <span className="text-red-400 font-bold">🟥 {p.redCards} devidos</span>
                <span className="text-sky-400 font-bold">🟦 {p.blueCardsList.length} azuis</span>
              </div>
            ))}
            {gameState.status === 'playing' && (
              <button
                onClick={handleForceFinish}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition"
              >
                🏁 Encerrar e Gerar Matriz Final
              </button>
            )}
          </div>
        </div>
      )}

      {/* LAYOUT LATERAL: JOGADORES + CÉDULAS + CONTROLES DE DADO 3D */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row justify-between p-4 pointer-events-none gap-4 overflow-hidden">
        {/* COLUNA ESQUERDA: JOGADORES / EMPRESAS E DIÁRIO FISCAL (Ocultos por padrão para ampliar o tabuleiro, acionáveis na barra superior) */}
        {(showPlayersPanel || showHistoryPanel) && (
          <div className="w-full md:w-80 flex flex-col gap-3 pointer-events-auto max-h-full overflow-y-auto pr-1">
            {showPlayersPanel && (
              <>
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 shadow-xl">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sky-400" /> Empresas / Jogadores
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        Meta: <strong className="text-amber-400">#77</strong>
                      </span>
                      <button
                        onClick={() => setShowPlayersPanel(false)}
                        className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800/80"
                        title="Ocultar painel de jogadores"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {gameState.players.map((p, idx) => {
                      const isTurn =
                        gameState.status === 'playing' &&
                        gameState.phase === 'board_turns' &&
                        idx === gameState.turnIndex;
                      const isMe = p.id === myPlayerObj?.id;

                      return (
                        <div
                          key={p.id}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isTurn
                              ? 'bg-slate-800/95 border-amber-400 shadow-lg'
                              : 'bg-slate-950/65 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20"
                                style={{ backgroundColor: p.color }}
                              />
                              <span className="font-bold text-sm truncate max-w-[135px]">
                                {p.name}
                              </span>
                              {isTurn && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black">
                                  VEZ
                                </span>
                              )}
                            </div>
                            {!isPublicTelaoView && isMe ? (
                              <span
                                className={`font-mono font-black text-sm ${
                                  p.money >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}
                              >
                                ${p.money}
                              </span>
                            ) : (
                              <span
                                className="text-[11px] font-bold text-slate-500 flex items-center gap-1"
                                title="Sigilo Bancário e Fiscal: O saldo de cada jogador só é revelado no final da partida!"
                              >
                                💰 🔒
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                            <span>
                              Casa: <strong className="text-white">#{p.position}</strong>/77
                              {p.skipTurns > 0 && (
                                <span className="ml-1.5 text-amber-400 font-bold">
                                  (⏳ {p.skipTurns} rod.)
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              {!isPublicTelaoView && isMe ? (
                                <>
                                  <span className="text-sky-400 font-bold" title="Suas Cartas Azuis na mão">
                                    🟦 {p.blueCardsList?.length || 0}
                                  </span>
                                  <span
                                    className={`font-bold px-1.5 rounded ${
                                      p.redCards > 0
                                        ? 'bg-red-950 text-red-400 border border-red-500/40'
                                        : 'text-slate-500'
                                    }`}
                                    title="Seus impostos sonegados pendentes"
                                  >
                                    🟥 {p.redCards}
                                  </span>
                                </>
                              ) : (
                                <span
                                  className="text-slate-500 font-mono"
                                  title="Sigilo Fiscal: As cartas de cada jogador são estritamente confidenciais!"
                                >
                                  🟦 🔒 • 🟥 🔒
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SUAS CARTAS AZUIS GUARDADAS */}
                {!isPublicTelaoView && myPlayerObj && myPlayerObj.blueCardsList?.length > 0 && (
                  <div className="bg-slate-900/90 backdrop-blur-md border border-sky-500/30 rounded-2xl p-3 shadow-xl">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 block mb-2">
                      🟦 Suas Cartas Azuis ({myPlayerObj.blueCardsList.length})
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {myPlayerObj.blueCardsList.map((card, i) => (
                        <div
                          key={i}
                          className="shrink-0 w-16 rounded-lg overflow-hidden border border-sky-400/50 bg-slate-950 shadow"
                          title={`${card.title}: ${card.description}`}
                        >
                          <img src={card.image} alt={card.title} className="w-full h-24 object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* DIÁRIO OFICIAL DA PARTIDA */}
            {showHistoryPanel && (
              <div className="flex flex-col flex-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 shadow-xl overflow-hidden min-h-[180px] max-h-[360px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    📜 Histórico da Sociedade
                  </span>
                  <button
                    onClick={() => setShowHistoryPanel(false)}
                    className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800/80"
                    title="Ocultar histórico"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {(gameState.logs || []).map((log) => (
                    <div
                      key={log.id}
                      className={`p-2 rounded-lg border ${
                        log.type === 'good'
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                          : log.type === 'bad'
                          ? 'bg-red-950/50 border-red-500/40 text-red-200'
                          : log.type === 'warn'
                          ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* COLUNA DIREITA: CONTROLE DE JOGADA, DENÚNCIA ESPONTÂNEA E DADO 3D */}
        <div className="w-full md:w-80 md:ml-auto flex flex-col justify-end gap-3 pointer-events-auto">
          {selectedTileInfo && (
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-3.5 shadow-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-sky-400">
                  Casa #{selectedTileInfo.id} • {selectedTileInfo.subtitle}
                </span>
                <button
                  onClick={() => setSelectedTileInfo(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <h4 className="font-bold text-sm">{selectedTileInfo.title}</h4>
            </div>
          )}

          {gameState.status === 'playing' && gameState.phase === 'board_turns' && currentPlayer && (
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Vez de Jogar os Dados
                  </span>
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: currentPlayer.color }}
                    />
                    {currentPlayer.name}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Casa atual: <strong>#{currentPlayer.position} ({BOARD_TILES[currentPlayer.position]?.title})</strong>
                  </span>
                </div>
                {gameState.lastDice && (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-xl flex flex-col items-center justify-center shadow-lg">
                    <span>🎲 {gameState.lastDice}</span>
                  </div>
                )}
              </div>

              {!isPublicTelaoView &&
                isMyTurn &&
                !gameState.pendingDecision &&
                currentPlayer.redCards > 0 &&
                !currentPlayer.forbidSpontaneous && (
                  <button
                    onClick={() => handleSpontaneousDenunciation()}
                    className="w-full mb-2.5 py-2 px-3 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-400/60 text-emerald-200 text-xs font-bold flex items-center justify-between transition"
                  >
                    <span>🤝 Denúncia Espontânea ({currentPlayer.redCards}x)</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black">
                      Quitar -${currentPlayer.redCards * 300}
                    </span>
                  </button>
                )}

              {isAnimatingRoll ? (
                <div className="text-center py-3 px-4 rounded-xl bg-amber-500/20 border border-amber-400/50 text-xs text-amber-300 font-black animate-bounce">
                  🎲 Rolando o Dado 3D e avançando pino...
                </div>
              ) : !gameState.pendingDecision ? (
                <button
                  disabled={!isMyTurn && !isOnlineTelaoHost}
                  onClick={handleRollDice}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
                    isMyTurn || isOnlineTelaoHost
                      ? 'bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400 hover:brightness-110 text-slate-950 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Dices className="w-5 h-5" />
                  {isMyTurn || isOnlineTelaoHost
                    ? currentPlayer.skipTurns > 0
                      ? 'CUMPRIR RODADA PARADO'
                      : 'LANÇAR DADO 3D NA MESA!'
                    : `Aguardando ${currentPlayer.name}...`}
                </button>
              ) : (
                <div className="text-center py-2 text-xs text-amber-300 font-semibold animate-pulse">
                  ⚡ Confira o resultado da jogada na tela...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONSOLE DO MEDIADOR */}
      {gameState.status === 'playing' && gameState.mode === 'mediator' && !isTelaoTab && (
        <MediatorConsoleOverlay
          gameState={gameState}
          onTaxVoteForPlayer={(playerId, payTax) => handleTaxVote(payTax, playerId)}
          onConfirmRead={handleConfirmRead}
          onSpontaneousForPlayer={(playerId) => handleSpontaneousDenunciation(playerId)}
          onRollDice={handleRollDice}
          onForkChoice={handleForkChoice}
          onCharityChoice={handleCharityChoice}
          onDenunciaAction={handleDenunciaAction}
          onForceFinish={handleForceFinish}
          onOpenTelaoTab={handleOpenTelaoTab}
          isAnimatingRoll={isAnimatingRoll}
        />
      )}

      {/* CARTEIRA SECRETA NO CELULAR DO JOGADOR */}
      {gameState.status === 'playing' && isOnlineMobilePlayer && !mobileShowBoard && (
        <MobilePlayerController
          gameState={gameState}
          myPlayer={myPlayerObj}
          isMyTurn={isMyTurn}
          onTaxVote={(payTax) => handleTaxVote(payTax)}
          onConfirmRead={handleConfirmRead}
          onSpontaneousDenunciation={() => handleSpontaneousDenunciation()}
          onRollDice={handleRollDice}
          onForkChoice={handleForkChoice}
          onCharityChoice={handleCharityChoice}
          onDenunciaAction={handleDenunciaAction}
          isAnimatingRoll={isAnimatingRoll}
          onToggleShowBoard={() => setMobileShowBoard(true)}
        />
      )}

      {/* MODAL 1: LOBBY INICIAL COM OS 3 MODOS DE JOGO (OU ENTRADA DIRETA PELO QR CODE NO CELULAR) */}
      {gameState.status === 'lobby' && (
        isTelaoTab ? (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
            <div className="bg-slate-900/95 border-2 border-amber-400 rounded-3xl px-6 py-4 shadow-2xl text-center max-w-xl">
              <div className="text-xs font-black uppercase tracking-wider text-amber-400">
                🖥️ Aba do Telão 3D Conectada e Pronta!
              </div>
              <h3 className="text-lg font-black text-white mt-0.5">
                Aguardando o Mediador iniciar a partida na outra aba...
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Arraste esta janela para o Projetor / TV da sala. Equipes configuradas até agora:{' '}
                <strong>{gameState.players.map((p) => p.name).join(' • ')}</strong>
              </p>
            </div>
          </div>
        ) : initialJoinCode ? (
          /* TELA DIRETA DO CELULAR AO LER O QR CODE: Identifica a sala e pede apenas o nome da Equipe! */
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border-2 border-sky-400 rounded-3xl max-w-md w-full p-6 shadow-2xl my-auto text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Smartphone className="w-8 h-8 text-slate-950" />
              </div>

              <span className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-black uppercase tracking-wider">
                📱 Sala Identificada: #{roomCodeInput}
              </span>

              <h2 className="text-2xl font-black text-white mt-2">
                Pago ou Não? <span className="text-sky-400">Mobile</span>
              </h2>

              {!activeOnlineRoomCode ? (
                <div className="mt-5 text-left space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                      Nome da sua Equipe / Empresa:
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={playerNameInput}
                      onChange={(e) => setPlayerNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinOnlineRoom()}
                      placeholder="Ex: Equipe Alfa / Empresa 1..."
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 text-base font-bold text-white focus:outline-none"
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-xs text-red-200 font-bold text-center">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <button
                    onClick={handleJoinOnlineRoom}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-sky-400 hover:brightness-110 text-slate-950 font-black text-base shadow-xl transition active:scale-95"
                  >
                    🚀 ENTRAR NA PARTIDA AGORA
                  </button>
                </div>
              ) : (
                /* JOGADOR JÁ ENTROU PELO CELULAR E AGUARDA O PROFESSOR DAR PLAY NO TELÃO */
                <div className="mt-5 p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <div className="text-xs font-black uppercase text-emerald-400">
                    Você está conectado na Sala #{gameState.roomCode}!
                  </div>
                  {myPlayerObj && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: myPlayerObj.color }}
                      />
                      <span className="font-black text-base text-white">{myPlayerObj.name}</span>
                    </div>
                  )}
                  <p className="text-xs text-slate-300 leading-relaxed pt-1">
                    ⏳ Aguarde o Professor / Mediador iniciar a partida no <strong>Telão</strong>. Assim que começar, sua carteira secreta aparecerá aqui!
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 md:p-7 shadow-2xl my-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg">
                    <Scale className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                      Edição Oficial Completa • Receita Federal do Brasil
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-white">
                      Pago ou Não? <span className="text-sky-400">Tabuleiro 3D</span>
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIntroSlide(1);
                    setShowIntroModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-sky-300 flex items-center gap-1.5 transition"
                >
                  <BookOpen className="w-4 h-4" />
                  Apresentação Inicial (Slides)
                </button>
              </div>

              {/* SELETOR DOS 3 MODOS DE JOGABILIDADE */}
              <div className="mb-5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Escolha o Modo de Jogo (Garante o sigilo das cartas e escolhas de cada jogador):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleSelectLobbyMode('mediator')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                      selectedLobbyMode === 'mediator'
                        ? 'bg-amber-950/60 border-amber-400 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <Monitor className="w-5 h-5 text-amber-400" />
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                          2 Telas / Abas
                        </span>
                      </div>
                      <h3 className="font-black text-sm text-white mt-2">
                        🖥️ Modo Mediador
                      </h3>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        Uma aba limpa para o <strong>Telão (Mapa 3D)</strong> e outra para o <strong>Mediador / Representantes</strong> votarem em segredo!
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectLobbyMode('online')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                      selectedLobbyMode === 'online'
                        ? 'bg-sky-950/60 border-sky-400 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <Smartphone className="w-5 h-5 text-sky-400" />
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-300">
                          QR Code / Cloud
                        </span>
                      </div>
                      <h3 className="font-black text-sm text-white mt-2">
                        📱 Telão + Celulares
                      </h3>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        O computador vira o <strong>Telão</strong> e cada aluno usa seu <strong>Celular (4G/Wi-Fi)</strong> para ver suas cartas e votar!
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectLobbyMode('solo')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                      selectedLobbyMode === 'solo'
                        ? 'bg-emerald-950/60 border-emerald-400 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <Bot className="w-5 h-5 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300">
                          1 Jogador
                        </span>
                      </div>
                      <h3 className="font-black text-sm text-white mt-2">
                        🤖 Individual (Com Bots)
                      </h3>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        Jogue sozinho contra <strong>Bots de IA</strong> com perfis fiscais secretos que você pode investigar e denunciar!
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {selectedLobbyMode !== 'online' ? (
                <div className="bg-slate-950/85 border border-slate-800 rounded-2xl p-4 mb-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                        {selectedLobbyMode === 'mediator'
                          ? `Equipes / Empresas da Sala (${gameState.players.length}/6)`
                          : `Participantes da Partida (${gameState.players.length}/6)`}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {selectedLobbyMode === 'mediator'
                          ? 'Cadastre as equipes dos alunos e abra a 2ª aba para projetar o Mapa 3D no Telão:'
                          : 'Você joga contra os Bots (as escolhas e cartas vermelhas dos Bots ficam ocultas!):'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedLobbyMode === 'mediator' && (
                        <button
                          onClick={handleOpenTelaoTab}
                          className="text-xs px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black flex items-center gap-1.5 shadow transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir Aba do Telão (Mapa 3D)
                        </button>
                      )}
                      <button
                        onClick={() => handleAddPlayer(true)}
                        className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold flex items-center gap-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Bot IA
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {gameState.players.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="text-sm font-bold truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                            {p.isBot ? '🤖 Bot' : '👥 Equipe'}
                          </span>
                          {gameState.players.length > 2 && (
                            <button
                              onClick={() => handleRemovePlayer(p.id)}
                              className="p-1 text-slate-500 hover:text-red-400 transition"
                              title="Remover participante"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {gameState.players.length < 6 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={playerNameInput}
                        onChange={(e) => setPlayerNameInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer(false)}
                        placeholder={
                          selectedLobbyMode === 'mediator'
                            ? 'Nome da nova Equipe (ex: Equipe Alfa)...'
                            : 'Nome do Jogador / Empresa...'
                        }
                        className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-sky-400"
                      />
                      <button
                        onClick={() => handleAddPlayer(false)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-slate-950 transition"
                      >
                        + Adicionar Equipe
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* CONFIGURAÇÃO DO MODO 3: TELÃO + CELULARES VIA FIREBASE FIRESTORE */
                <div className="bg-slate-950/85 border border-sky-500/40 rounded-2xl p-4 mb-5 space-y-4">
                  {gameState.mode !== 'online' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                            No Computador / Projetor
                          </span>
                          <h4 className="font-black text-base text-white mt-2">
                            🖥️ Criar Sala como Telão
                          </h4>
                          <p className="text-xs text-slate-300 mt-1">
                            Gera um Código de Sala e QR Code na nuvem (Firebase) para os alunos conectarem seus celulares via 4G/5G ou Wi-Fi!
                          </p>
                        </div>
                        <button
                          onClick={() => handleCreateOnlineRoom(true)}
                          className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg"
                        >
                          🖥️ CRIAR SALA NO TELÃO AGORA
                        </button>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            No Celular do Aluno / Equipe
                          </span>
                          <h4 className="font-black text-base text-white mt-2">
                            📱 Entrar em uma Sala
                          </h4>
                          <div className="space-y-2 mt-2">
                            <input
                              type="text"
                              maxLength={4}
                              value={roomCodeInput}
                              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                              placeholder="Código da Sala (4 letras)"
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono uppercase"
                            />
                            <input
                              type="text"
                              value={playerNameInput}
                              onChange={(e) => setPlayerNameInput(e.target.value)}
                              placeholder="Nome da sua Equipe / Empresa..."
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleJoinOnlineRoom}
                          className="mt-3 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg"
                        >
                          📱 ENTRAR COM MEU CELULAR
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="p-3 rounded-2xl bg-white text-slate-950 flex flex-col items-center justify-center text-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                            mobileJoinUrl
                          )}`}
                          alt="QR Code da Sala"
                          className="w-32 h-32 object-contain"
                        />
                        <span className="text-[10px] font-black uppercase mt-1 text-slate-700">
                          Aponte a câmera do celular
                        </span>
                      </div>

                      <div className="md:col-span-2 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-xs text-slate-400 block">Código da Sala no Telão:</span>
                            <span className="text-3xl font-mono font-black text-amber-400 tracking-widest">
                              {gameState.roomCode}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-slate-400 block">Link Direto para Celulares:</span>
                            <code className="text-xs font-mono text-sky-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
                              {mobileJoinUrl}
                            </code>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-300">
                              Celulares Conectados ({gameState.players.length}/6):
                            </span>
                            <button
                              onClick={() => handleAddPlayer(true)}
                              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold"
                            >
                              + Bot IA
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {gameState.players.map((p) => (
                              <div
                                key={p.id}
                                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold flex items-center gap-2"
                              >
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="truncate">{p.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-xs text-red-200 font-bold text-center">
                  ⚠️ {errorMsg}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setShowServiceCardsModal(true)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
                >
                  Ver Cartões de Serviço (Anexo 4)
                </button>
                <button
                  onClick={handleStartGame}
                  disabled={selectedLobbyMode === 'online' && gameState.mode !== 'online'}
                  className={`px-6 py-3.5 rounded-xl font-black text-base flex items-center gap-2 shadow-xl transition ${
                    selectedLobbyMode === 'online' && gameState.mode !== 'online'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  COMEÇAR PARTIDA OFICIAL
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* MODAL 0: APRESENTAÇÃO INICIAL EM TELA CHEIA (15 SLIDES OFICIAIS PDF) */}
      {showIntroModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-3 sm:p-6 select-none">
          <div className="flex items-center justify-between max-w-7xl w-full mx-auto px-2">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-black uppercase tracking-wider">
                Apresentação Oficial • Receita Federal
              </div>
              <span className="text-xs sm:text-sm text-slate-300 font-bold">
                Slide {introSlide} de {TOTAL_INTRO_SLIDES}
              </span>
            </div>

            {introSlide < TOTAL_INTRO_SLIDES ? (
              <button
                onClick={() => setShowIntroModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs sm:text-sm font-bold text-slate-200 hover:text-white transition flex items-center gap-1.5 shadow-lg"
              >
                <span>Pular Introdução ⏭️</span>
              </button>
            ) : (
              <button
                onClick={() => setShowIntroModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black transition shadow-lg"
              >
                ✕ Fechar
              </button>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center my-2 sm:my-4 overflow-hidden">
            <img
              src={`/assets/intro/slide_${introSlide}.png`}
              alt={`Slide ${introSlide} das Regras Oficiais`}
              className="max-h-[76vh] max-w-[94vw] w-auto h-auto object-contain rounded-2xl shadow-2xl border-2 border-slate-700/80 bg-white"
            />
          </div>

          <div className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 px-5 py-3.5 rounded-2xl shadow-2xl">
            <button
              disabled={introSlide <= 1}
              onClick={() => setIntroSlide((s) => Math.max(1, s - 1))}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${
                introSlide > 1
                  ? 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer border border-slate-700'
                  : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800/50'
              }`}
            >
              ⬅ Anterior
            </button>

            <div className="hidden md:flex items-center gap-1.5">
              {Array.from({ length: TOTAL_INTRO_SLIDES }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setIntroSlide(num)}
                  title={`Ir para Slide ${num}`}
                  className={`h-2.5 rounded-full transition-all ${
                    introSlide === num
                      ? 'w-7 bg-sky-400'
                      : num < introSlide
                      ? 'w-2.5 bg-emerald-500/60 hover:bg-emerald-400'
                      : 'w-2.5 bg-slate-700 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              {introSlide < TOTAL_INTRO_SLIDES ? (
                <>
                  <button
                    onClick={() => setShowIntroModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm border border-slate-700 transition"
                  >
                    Pular
                  </button>
                  <button
                    onClick={() => setIntroSlide((s) => Math.min(TOTAL_INTRO_SLIDES, s + 1))}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-sm shadow-lg transition cursor-pointer"
                  >
                    Próximo ➔
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowIntroModal(false)}
                  className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-400 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl transition cursor-pointer animate-pulse"
                >
                  ✓ Fechar e Ir para os Jogadores
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: O GRANDE DILEMA DA RODADA: "PAGO OU NÃO?" */}
      {gameState.status === 'playing' &&
        gameState.phase === 'tax_vote' &&
        (gameState.mode === 'solo' || isTelaoTab || isOnlineTelaoHost) && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-2xl w-full p-6 md:p-7 shadow-2xl">
              <div className="text-center mb-5">
                <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black uppercase tracking-wider">
                  Período Fiscal #{gameState.roundNumber} • Faturamento da Rodada: $1.000
                </span>
                <h2 className="text-2xl md:text-3xl font-black mt-2 text-white">
                  ☝️ PAGO OU NÃO? ✌️
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  {isTelaoTab || isOnlineTelaoHost
                    ? 'As equipes estão registrando sua decisão secreta (Pago $300 ou Não Pago). Os votos individuais jamais são revelados no Telão!'
                    : 'Sua empresa faturou $1.000 neste período e o imposto devido é de $300. Faça sua escolha secreta:'}
                </p>
              </div>

              {isTelaoTab || isOnlineTelaoHost ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {gameState.players.map((p) => {
                    const voted = p.isBot || gameState.roundVotes?.[p.id] !== undefined;
                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-2xl border flex items-center justify-between ${
                          voted
                            ? 'bg-emerald-950/50 border-emerald-500/50'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-black text-sm text-white">{p.name}</span>
                        </div>
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                            voted
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-amber-500/20 text-amber-300 animate-pulse'
                          }`}
                        >
                          {voted ? '🔒 Voto Registrado' : '⏳ Decidindo...'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleTaxVote(true)}
                    className="group p-5 rounded-2xl bg-emerald-950/70 hover:bg-emerald-900/80 border-2 border-emerald-500/70 hover:border-emerald-400 text-left transition-all flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950">
                          ☝️ 1 Dedo • PAGAR IMPOSTO
                        </span>
                        <span className="font-mono font-black text-lg text-emerald-300">
                          +$700
                        </span>
                      </div>
                      <h3 className="font-black text-lg text-white mt-2">
                        Declarar e Pagar ($300)
                      </h3>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                        Você recebe <strong>$700 líquidos</strong> agora, ajuda a garantir que o Estado tenha <strong>Investimentos Suficientes</strong> e ganha <strong>+1 Carta Azul</strong>!
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-emerald-500/30 text-xs font-black text-emerald-300 flex items-center justify-between">
                      <span>Receber $700 + Carta Azul</span>
                      <span>→</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTaxVote(false)}
                    className="group p-5 rounded-2xl bg-red-950/70 hover:bg-red-900/80 border-2 border-red-500/70 hover:border-red-400 text-left transition-all flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase px-2.5 py-1 rounded-full bg-red-500 text-white">
                          ✌️ 2 Dedos • SONEGAR
                        </span>
                        <span className="font-mono font-black text-lg text-red-300">
                          +$1.000
                        </span>
                      </div>
                      <h3 className="font-black text-lg text-white mt-2">
                        Não Pagar Tributo ($0)
                      </h3>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                        Você fica com os <strong>$1.000 integrais</strong>, mas tira uma <strong>Carta Vermelha secreta</strong> e acumula dívida fiscal (risco de <strong>$750</strong> na Malha Fina ou Denúncia)!
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-red-500/30 text-xs font-black text-red-300 flex items-center justify-between">
                      <span>Ficar com $1.000 + Carta Vermelha</span>
                      <span>→</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      {/* MODAL 2B: REVELAÇÃO DO DESTINO DO ESTADO E SUA CARTA SECRETA */}
      {gameState.pendingDecision?.type === 'round_reveal' &&
        !isOnlineMobilePlayer &&
        (gameState.mode !== 'mediator' || isTelaoTab) && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border-2 border-sky-400 rounded-3xl max-w-2xl w-full p-6 shadow-2xl my-auto">
              <div className="text-center mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-sky-400">
                  Resultado Coletivo da Rodada #{gameState.pendingDecision.roundNumber}
                </span>
                <h2 className="text-2xl font-black text-white mt-1">
                  {gameState.pendingDecision.stateHasResources
                    ? '🏛️ A MAIORIA PAGOU! O ESTADO TEM RECURSOS!'
                    : '🚨 SONEGAÇÃO / EMPATE! O ESTADO ESTÁ SEM RECURSOS!'}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Pagadores: <strong className="text-emerald-400">{gameState.pendingDecision.payersCount}</strong> • Sonegadores: <strong className="text-red-400">{gameState.pendingDecision.evadersCount}</strong> — Todas as casas coloridas usarão o cartão de{' '}
                  <strong>
                    {gameState.pendingDecision.stateHasResources
                      ? 'INVESTIMENTOS SUFICIENTES'
                      : 'INVESTIMENTOS INSUFICIENTES'}
                  </strong>!
                </p>
              </div>

              {isPublicTelaoView ? (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center mb-5 space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black">
                    <Lock className="w-3.5 h-3.5" /> Sigilo Fiscal Ativo no Telão
                  </div>
                  <p className="text-xs text-slate-300">
                    As Cartas Azuis e Vermelhas sorteadas nesta rodada foram entregues de forma <strong>secreta</strong> para cada equipe (no Console do Mediador ou no Celular de cada jogador).
                  </p>
                  {gameState.pendingDecision.drawnCardsSummary?.some((i) => i.isPublicEvent) && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <span className="text-[11px] font-bold text-amber-300 block">
                        ⚡ Efeitos de Movimento Imediato no Tabuleiro:
                      </span>
                      {gameState.pendingDecision.drawnCardsSummary
                        .filter((i) => i.isPublicEvent)
                        .map((ev, idx) => (
                          <div key={idx} className="text-xs text-slate-200 font-semibold">
                            • <strong>{ev.playerName}</strong>: {ev.effectResult}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 mb-5">
                  {myPlayerObj?.lastDrawnCard && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/40 flex flex-col sm:flex-row items-center gap-4">
                      {myPlayerObj.lastDrawnCard.card && (
                        <img
                          src={myPlayerObj.lastDrawnCard.card.image}
                          alt={myPlayerObj.lastDrawnCard.card.title}
                          className="w-28 h-40 object-contain rounded-xl shadow-lg shrink-0"
                        />
                      )}
                      <div className="text-center sm:text-left">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                            myPlayerObj.lastDrawnCard.paid
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-red-500 text-white'
                          }`}
                        >
                          Sua Escolha Secreta:{' '}
                          {myPlayerObj.lastDrawnCard.paid
                            ? 'PAGOU (+$700 + Carta Azul)'
                            : 'SONEGOU (+$1.000 + Carta Vermelha)'}
                        </span>
                        <h4 className="font-black text-base text-white mt-2">
                          {myPlayerObj.lastDrawnCard.card?.title}
                        </h4>
                        <p className="text-xs text-amber-300 mt-1 font-semibold">
                          {myPlayerObj.lastDrawnCard.effectResult}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-2">
                          🔒 As escolhas e cartas dos Bots permanecem ocultas sob sigilo fiscal!
                        </p>
                      </div>
                    </div>
                  )}

                  {gameState.pendingDecision.drawnCardsSummary?.some((i) => i.isPublicEvent) && (
                    <div className="p-3.5 rounded-2xl bg-amber-950/50 border border-amber-500/50 space-y-1">
                      <span className="text-xs font-black text-amber-300 block">
                        ⚡ Efeitos Imediatos de Cartas no Tabuleiro nesta Rodada:
                      </span>
                      {gameState.pendingDecision.drawnCardsSummary
                        .filter((i) => i.isPublicEvent)
                        .map((ev, idx) => (
                          <div key={idx} className="text-xs text-slate-200 font-semibold">
                            • <strong>{ev.playerName}</strong>: {ev.effectResult}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {!isTelaoTab && (
                <button
                  onClick={handleConfirmRead}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:brightness-110 text-slate-950 font-black text-sm shadow-lg transition"
                >
                  ✅ JÁ LI • IR PARA O TABULEIRO (JOGAR OS DADOS 3D) →
                </button>
              )}
            </div>
          </div>
        )}

      {/* MODAL 2C: ESCOLHA DE CAMINHO NA BIFURCAÇÃO */}
      {!isAnimatingRoll && gameState.pendingDecision?.type === 'fork_choice' && (
        <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-amber-400/20 border border-amber-400 text-amber-300">
                <GitFork className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                  Bifurcação na Casa #{gameState.pendingDecision.forkTileId} • Faltam {gameState.pendingDecision.remainingSteps} passo(s)
                </span>
                <h3 className="text-xl font-black text-white">
                  ESCOLHA O CAMINHO NA TRILHA!
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              O pino de <strong>{gameState.pendingDecision.playerName}</strong> chegou em uma bifurcação do tabuleiro! Por qual lado deseja continuar avançando as{' '}
              <strong>{gameState.pendingDecision.remainingSteps} casa(s)</strong> restantes?
            </p>

            {isMyTurn ? (
              <div className="space-y-3">
                {gameState.pendingDecision.options?.map((opt) => (
                  <button
                    key={opt.nextTileId}
                    onClick={() => handleForkChoice(opt.nextTileId)}
                    className="w-full p-4 rounded-2xl bg-slate-950 hover:bg-emerald-950/80 border-2 border-slate-700 hover:border-emerald-400 text-left transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-black text-amber-300 group-hover:text-emerald-300">
                        {opt.label}
                      </div>
                      <div className="text-xs text-slate-300 mt-1">
                        Próxima casa: <strong>#{opt.nextTileId} — {opt.tileTitle}</strong> ({opt.tileSubtitle})
                      </div>
                    </div>
                    <span className="text-sm font-black text-emerald-400 group-hover:translate-x-1 transition-transform">
                      Seguir →
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-amber-300 font-semibold">
                🧭 <strong>{gameState.pendingDecision.playerName}</strong> está escolhendo qual caminho seguir na bifurcação...
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: CASA DE CARIDADE */}
      {!isAnimatingRoll && gameState.pendingDecision?.type === 'charity_choice' && (
        <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-pink-400 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center">
            <HandCoins className="w-10 h-10 text-pink-400 mx-auto mb-2" />
            <h3 className="text-xl font-black text-white">
              {gameState.pendingDecision.title}
            </h3>
            <p className="text-sm text-slate-300 mt-2 mb-5">
              {gameState.pendingDecision.description}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleCharityChoice(true)}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs"
              >
                SIM, DOAR $300 E JOGAR DE NOVO
              </button>
              <button
                onClick={() => handleCharityChoice(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Não doar (Passar a vez)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CASA PRETA DE DENÚNCIA! */}
      {!isAnimatingRoll && gameState.pendingDecision?.type === 'denuncia_choice' && (
        <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-indigo-500 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/30 border border-indigo-400 text-indigo-300">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                  Casa Preta Oficial
                </span>
                <h3 className="text-xl font-black text-white">
                  DENÚNCIA À RECEITA FEDERAL!
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {gameState.pendingDecision.description}
            </p>

            {isMyTurn ? (
              <div className="space-y-2.5">
                {gameState.players
                  .filter((p) => p.id !== currentPlayer?.id)
                  .map((opp) => (
                    <button
                      key={opp.id}
                      onClick={() => handleDenunciaAction('accuse', opp.id)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-950 hover:bg-indigo-950 border border-slate-700 hover:border-indigo-400 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: opp.color }} />
                        <span className="font-bold text-sm">{opp.name}</span>
                      </div>
                      <span className="text-xs text-amber-400 font-bold">
                        Casa #{opp.position} • Denunciar →
                      </span>
                    </button>
                  ))}

                <button
                  onClick={() => handleDenunciaAction('skip', null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                >
                  Não denunciar ninguém nesta rodada
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-slate-300">
                🕵️ <strong>{currentPlayer?.name}</strong> está escolhendo quem denunciar...
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: CONSEQUÊNCIA DA CASA + CARTÃO DE SERVIÇO OFICIAL */}
      {!isAnimatingRoll && gameState.pendingDecision?.type === 'tile_summary' && (
        <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-slate-900 border-2 rounded-3xl max-w-lg w-full p-6 shadow-2xl"
            style={{ borderColor: gameState.pendingDecision.accentColor || '#38bdf8' }}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800"
                style={{ color: gameState.pendingDecision.accentColor || '#38bdf8' }}
              >
                {gameState.pendingDecision.subtitle}
              </span>
              {gameState.pendingDecision.playerName && (
                <span className="text-xs font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
                  Turno de: <strong className="text-amber-300">{gameState.pendingDecision.playerName}</strong>
                </span>
              )}
            </div>

            <h3 className="text-xl font-black text-white mt-3">
              {gameState.pendingDecision.title}
            </h3>
            <p className="text-sm text-slate-200 mt-2 whitespace-pre-line leading-relaxed">
              {gameState.pendingDecision.description}
            </p>

            {gameState.pendingDecision.serviceImage && (
              <div className="mt-4 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                <img
                  src={gameState.pendingDecision.serviceImage}
                  alt="Cartão de Serviço Oficial"
                  className="w-full max-h-56 object-contain mx-auto"
                />
              </div>
            )}

            {!isTelaoTab && (
              <button
                onClick={handleConfirmRead}
                className="mt-5 w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-sm shadow-lg transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {gameState.pendingDecision.rollAgain
                  ? '✅ LIDO • ROLAR O DADO NOVAMENTE!'
                  : '✅ LIDO • AVANÇAR PARA O PRÓXIMO TURNO →'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL 6: FIM DE JOGO + MATRIZ DE CONTROLE DOS RESULTADOS */}
      {gameState.status === 'finished' && (
        <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl my-auto">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-amber-400/20 text-amber-300 mb-2">
                <Award className="w-10 h-10" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                FIM DE JOGO • MATRIZ DE CONTROLE DE RESULTADOS
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Vencedor pelo Maior Saldo Bancário Final (incluindo Bônus de Chegada e Cartas Azuis de Restituição):{' '}
                <strong className="text-amber-400">{gameState.winner?.name} ($ {gameState.winner?.money})</strong>
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/90 mb-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900 text-slate-300">
                    <th className="p-3 font-bold">Jogador / Empresa</th>
                    <th className="p-3 font-bold text-right">Saldo Final ($)</th>
                    <th className="p-3 font-bold text-right">Pagou Tempestivo</th>
                    <th className="p-3 font-bold text-right">Sonegou</th>
                    <th className="p-3 font-bold text-right">Restituição Azul</th>
                    <th className="p-3 font-bold text-right">Pago em Ação Fiscal</th>
                    <th className="p-3 font-bold text-right">Casas Prejudicadas</th>
                  </tr>
                </thead>
                <tbody>
                  {[...gameState.players]
                    .sort((a, b) => b.money - a.money)
                    .map((p, idx) => (
                      <tr key={p.id} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                        <td className="p-3 font-bold flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                          {idx === 0 && '🏆 '}
                          {p.name}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-400 text-sm">
                          ${p.money}
                        </td>
                        <td className="p-3 text-right text-sky-300">
                          {p.taxesPaidCount}x (${p.taxesPaidAmount})
                        </td>
                        <td className="p-3 text-right text-red-400">
                          {p.taxesEvadedCount}x (${p.taxesEvadedAmount})
                        </td>
                        <td className="p-3 text-right text-emerald-300">
                          +${p.restitutionTotal || 0}
                        </td>
                        <td className="p-3 text-right text-amber-300">
                          ${p.fiscalActionPaidAmount}
                        </td>
                        <td className="p-3 text-right text-rose-300">
                          {p.harmedTilesCount} (-${p.harmedIncomeAmount})
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {!isTelaoTab && (
              <div className="flex justify-center">
                <button
                  onClick={handleResetGame}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg"
                >
                  <RotateCcw className="w-4 h-4" /> JOGAR NOVA PARTIDA
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CARTÕES DE SERVIÇO OFICIAIS (ANEXO 4) */}
      {showServiceCardsModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">
                📋 Cartões de Serviço Oficiais (Anexo 4 — Suficientes vs Insuficientes)
              </h3>
              <button
                onClick={() => setShowServiceCardsModal(false)}
                className="text-sm text-slate-400 hover:text-white"
              >
                Fechar ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(SERVICE_CARDS).map((sc) => (
                <div key={sc.name} className="space-y-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <h4 className="font-black text-sm" style={{ color: sc.color }}>
                    {sc.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <img src={sc.sufficientImage} alt={`${sc.name} Suficiente`} className="w-full rounded-lg" />
                    <img src={sc.insufficientImage} alt={`${sc.name} Insuficiente`} className="w-full rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SÍNTESE DAS REGRAS OFICIAIS */}
      {showRulesModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-white">
                📖 Síntese das Regras Oficiais ("Pago ou Não?")
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-sm text-slate-400 hover:text-white"
              >
                Fechar ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-amber-400 block mb-1">1. A Escolha da Rodada (Pago ou Não?):</strong>
                Sua empresa fatura <strong>$1.000</strong> por período e o tributo devido é de <strong>$300</strong>. Se decidir <strong>PAGAR</strong>, você recebe <strong>$700</strong> e 1 Carta Azul. Se decidir <strong>SONEGAR</strong>, fica com <strong>$1.000</strong> e recebe 1 Carta Vermelha de efeito imediato.
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-emerald-400 block mb-1">2. O Destino do Estado (Maioria da Mesa):</strong>
                Se a <strong>maioria pagar</strong>, o Estado tem <strong>Investimentos Suficientes</strong> (as casas de Saúde, Educação, Transporte e Segurança dão bônus e avanços). Se a <strong>maioria sonegar ou empatar</strong>, o Estado fica com <strong>Investimentos Insuficientes</strong> (gerando multas, atrasos e perdas de rodada).
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-red-400 block mb-1">3. Malha Fina, Denúncia e Denúncia Espontânea:</strong>
                Na Malha Fina ou quando denunciado na casa preta de <strong>DENÚNCIA!</strong>, o sonegador paga <strong>$300 de tributo + $450 de multa de ofício ($750 por período sonegado)</strong>. Antes de lançar os dados, você pode fazer <strong>Denúncia Espontânea</strong> quitando apenas os $300 sem multa!
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-sky-400 block mb-1">4. Chegada e Vencedor:</strong>
                Quem cruzar a casa <strong>FINAL (#77)</strong> primeiro ganha <strong>+$1.000 de bônus</strong>, somam-se as Cartas Azuis de Restituição e vence quem tiver o <strong>Maior Saldo Bancário Final</strong>!
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="mt-5 w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs"
            >
              VOLTAR AO JOGO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
