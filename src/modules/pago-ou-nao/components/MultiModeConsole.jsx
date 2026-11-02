import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Dices,
  Users,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  Monitor,
  GitFork,
  HandCoins,
  Landmark,
  Award
} from 'lucide-react';
import { BOARD_TILES } from '../data/boardData.js';

// ============================================================================
// 1. CONSOLE DO MEDIADOR (Para o Modo Mediador em 2 Abas: Telão + Mediador)
// ============================================================================
export function MediatorConsoleOverlay({
  gameState,
  onTaxVoteForPlayer,
  onConfirmRead,
  onSpontaneousForPlayer,
  onRollDice,
  onForkChoice,
  onCharityChoice,
  onDenunciaAction,
  onForceFinish,
  onOpenTelaoTab,
  isAnimatingRoll
}) {
  // 'representative' (1 equipe por vez com tela de bloqueio) | 'teacher_fast' (lista rápida p/ mediador)
  const [mediatorSubMode, setMediatorSubMode] = useState('representative');
  const [unlockedPlayerId, setUnlockedPlayerId] = useState(null);
  const [showConfidentialMatrix, setShowConfidentialMatrix] = useState(false);
  const [minimizedToCorner, setMinimizedToCorner] = useState(false);

  const humanPlayers = gameState.players.filter((p) => !p.isBot);
  const nextUnvotedPlayer = humanPlayers.find(
    (p) => gameState.roundVotes?.[p.id] === undefined
  );
  const currentPlayer = gameState.players[gameState.turnIndex];

  // Sempre que mudar de fase ou de jogador da vez, tranca a carteira secreta automaticamente!
  useEffect(() => {
    setUnlockedPlayerId(null);
  }, [gameState.phase, gameState.turnIndex, gameState.roundNumber, nextUnvotedPlayer?.id]);

  if (minimizedToCorner) {
    return (
      <div className="fixed bottom-4 right-4 z-40 pointer-events-auto">
        <button
          onClick={() => setMinimizedToCorner(false)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-sky-400 text-slate-950 font-black text-sm shadow-2xl flex items-center gap-2 border-2 border-white"
        >
          <Monitor className="w-5 h-5" />
          Abrir Console do Mediador
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 bg-slate-950/88 backdrop-blur-md flex flex-col p-3 sm:p-5 overflow-y-auto pointer-events-auto">
      <div className="max-w-4xl w-full mx-auto bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-4 sm:p-6 shadow-2xl my-auto">
        {/* Cabeçalho do Console do Mediador */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-400/20 border border-amber-400 text-amber-300">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                  Modo Mediador • Console de Comando Secreto
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  Sincronizado com a Aba do Telão
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Período Fiscal #{gameState.roundNumber} •{' '}
                {gameState.phase === 'tax_vote'
                  ? 'Etapa 1: Votação Secreta "Pago ou Não?"'
                  : 'Etapa 2: Movimento no Tabuleiro'}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenTelaoTab}
              className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition"
              title="Abre uma segunda aba limpa apenas com o Mapa 3D para jogar no projetor/TV"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir Aba do Telão (Mapa 3D)
            </button>

            <button
              onClick={() => setMinimizedToCorner(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
            >
              Ver Mapa Aqui
            </button>
          </div>
        </div>

        {/* Alternador de Sub-modo: Representante da Equipe vs Painel Rápido do Professor */}
        <div className="flex flex-wrap items-center justify-between gap-2 my-4 bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMediatorSubMode('representative');
                setUnlockedPlayerId(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                mediatorSubMode === 'representative'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Modo Representante (1 Equipe por Vez c/ Senha Visual)
            </button>
            <button
              onClick={() => setMediatorSubMode('teacher_fast')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                mediatorSubMode === 'teacher_fast'
                  ? 'bg-sky-400 text-slate-950 shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Modo Lançamento Rápido (Mediador lança 1 ou 2 dedos)
            </button>
          </div>

          <button
            onClick={() => setShowConfidentialMatrix(!showConfidentialMatrix)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-amber-300 flex items-center gap-1.5"
          >
            {showConfidentialMatrix ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showConfidentialMatrix ? 'Ocultar Matriz Geral' : 'Espiar Matriz Confidencial'}
          </button>
        </div>

        {/* Matriz Confidencial do Mediador (Oculta por padrão) */}
        {showConfidentialMatrix && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-amber-300">
                🔒 Visão Confidencial do Mediador (Cartas Vermelhas e Azuis)
              </span>
              <button
                onClick={onForceFinish}
                className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs"
              >
                🏁 Encerrar Partida e Gerar Matriz Final
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {gameState.players.map((p) => (
                <div key={p.id} className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs">
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300">
                    <span>Saldo: <strong className="text-emerald-400">${p.money}</strong></span>
                    <span className="text-red-400 font-bold">🟥 {p.redCards} dev.</span>
                    <span className="text-sky-400 font-bold">🟦 {p.blueCardsList.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* CONTEÚDO DA ETAPA 1: VOTAÇÃO SECRETA "PAGO OU NÃO?"               */}
        {/* ================================================================= */}
        {gameState.phase === 'tax_vote' && (
          <div>
            {mediatorSubMode === 'representative' ? (
              nextUnvotedPlayer ? (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Chamando Representante para Votação Secreta ({Object.keys(gameState.roundVotes || {}).length}/{humanPlayers.length} já votaram)
                  </span>
                  <div className="mt-2 flex items-center justify-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: nextUnvotedPlayer.color }}
                    />
                    <h3 className="text-2xl font-black text-white">{nextUnvotedPlayer.name}</h3>
                  </div>

                  {unlockedPlayerId !== nextUnvotedPlayer.id ? (
                    <div className="mt-5">
                      <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                        Para que os outros representantes não vejam sua escolha nem suas cartas vermelhas, clique abaixo apenas quando estiver diante da tela:
                      </p>
                      <button
                        onClick={() => setUnlockedPlayerId(nextUnvotedPlayer.id)}
                        className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-sm inline-flex items-center gap-2 shadow-xl"
                      >
                        <Unlock className="w-5 h-5" />
                        Sou de "{nextUnvotedPlayer.name}" • Liberar Minha Escolha Secreta
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 text-left">
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 mb-4 text-xs">
                        <span>
                          💰 Seu Saldo Atual: <strong className="text-emerald-400">${nextUnvotedPlayer.money}</strong>
                        </span>
                        <span>
                          🟦 Cartas Azuis: <strong className="text-sky-400">{nextUnvotedPlayer.blueCardsList.length}</strong>
                        </span>
                        <span>
                          🟥 Impostos Sonegados Pendentes:{' '}
                          <strong className="text-red-400">{nextUnvotedPlayer.redCards}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                          onClick={() => onTaxVoteForPlayer(nextUnvotedPlayer.id, true)}
                          className="p-5 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 border-2 border-emerald-500 text-left transition shadow-lg"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-black">
                              ☝️ 1 Dedo • PAGO
                            </span>
                            <span className="font-mono font-black text-lg text-emerald-300">+$700</span>
                          </div>
                          <h4 className="font-black text-base text-white mt-2">
                            Pagar Imposto ($300)
                          </h4>
                          <p className="text-xs text-slate-300 mt-1">
                            Recebe $700 líquidos + 1 Carta Azul e fortalece os serviços públicos!
                          </p>
                        </button>

                        <button
                          onClick={() => onTaxVoteForPlayer(nextUnvotedPlayer.id, false)}
                          className="p-5 rounded-2xl bg-red-950/80 hover:bg-red-900 border-2 border-red-500 text-left transition shadow-lg"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-black">
                              ✌️ 2 Dedos • NÃO PAGO
                            </span>
                            <span className="font-mono font-black text-lg text-red-300">+$1.000</span>
                          </div>
                          <h4 className="font-black text-base text-white mt-2">
                            Sonegar Imposto ($0)
                          </h4>
                          <p className="text-xs text-slate-300 mt-1">
                            Fica com $1.000, mas recebe 1 Carta Vermelha e risco de multa de $750!
                          </p>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null
            ) : (
              /* Sub-modo Lançamento Rápido pelo Professor/Mediador */
              <div className="space-y-2.5">
                <p className="text-xs text-slate-300 mb-3">
                  Peça para as equipes levantarem <strong>1 dedo (Pago)</strong> ou <strong>2 dedos (Não Pago)</strong> e registre abaixo (após clicar, a linha fica oculta com 🔒 para ninguém espiar):
                </p>
                {humanPlayers.map((p) => {
                  const hasVoted = gameState.roundVotes?.[p.id] !== undefined;
                  return (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="font-black text-sm text-white">{p.name}</span>
                        <span className="text-xs text-slate-400 font-mono">(Casa #{p.position})</span>
                      </div>

                      {hasVoted ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-black flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> Decisão Registrada (Oculta)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onTaxVoteForPlayer(p.id, true)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs transition"
                          >
                            ☝️ 1 Dedo (PAGO +$700)
                          </button>
                          <button
                            onClick={() => onTaxVoteForPlayer(p.id, false)}
                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition"
                          >
                            ✌️ 2 Dedos (NÃO PAGO +$1000)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* CONTEÚDO DA ETAPA 1B: REVELAÇÃO DO ESTADO + CONSULTA DE CARTAS    */}
        {/* ================================================================= */}
        {gameState.pendingDecision?.type === 'round_reveal' && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-2xl border-2 text-center ${
                gameState.pendingDecision.stateHasResources
                  ? 'bg-emerald-950/60 border-emerald-400'
                  : 'bg-red-950/60 border-red-400'
              }`}
            >
              <h3 className="text-xl font-black text-white">
                {gameState.pendingDecision.stateHasResources
                  ? '🏛️ A MAIORIA PAGOU! O ESTADO TEM RECURSOS!'
                  : '🚨 SONEGAÇÃO / EMPATE! O ESTADO ESTÁ SEM RECURSOS!'}
              </h3>
              <p className="text-xs text-slate-200 mt-1">
                Pagadores: <strong>{gameState.pendingDecision.payersCount}</strong> • Sonegadores:{' '}
                <strong>{gameState.pendingDecision.evadersCount}</strong> (Já exibido no Telão sem revelar quem sonegou!)
              </p>
              {gameState.pendingDecision.drawnCardsSummary?.some((i) => i.isPublicEvent) && (
                <div className="mt-3 pt-2 border-t border-white/15 text-left space-y-1">
                  <span className="text-xs font-black text-amber-300 block">
                    ⚡ Efeitos de Movimento Imediato no Tabuleiro:
                  </span>
                  {gameState.pendingDecision.drawnCardsSummary
                    .filter((i) => i.isPublicEvent)
                    .map((ev, idx) => (
                      <div key={idx} className="text-xs text-white font-semibold">
                        • <strong>{ev.playerName}</strong>: {ev.effectResult}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Consulta Secreta da Carta Recebida por Cada Equipe nesta Rodada */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-black uppercase text-sky-400 block mb-2">
                🃏 Consultar Carta Secreta Recebida na Rodada #{gameState.roundNumber} (Clique na sua equipe para espiar):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {gameState.players.map((p) => {
                  const isUnlocked = unlockedPlayerId === p.id;
                  const lastCard = p.lastDrawnCard;
                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          {p.name}
                        </span>
                        <button
                          onClick={() => setUnlockedPlayerId(isUnlocked ? null : p.id)}
                          className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center gap-1"
                        >
                          {isUnlocked ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {isUnlocked ? 'Ocultar' : 'Ver Carta'}
                        </button>
                      </div>

                      {isUnlocked && lastCard?.card ? (
                        <div className="text-center mt-1">
                          <img
                            src={lastCard.card.image}
                            alt={lastCard.card.title}
                            className="w-24 h-32 object-contain mx-auto rounded-lg mb-1"
                          />
                          <div className="text-xs font-black text-white">{lastCard.card.title}</div>
                          {lastCard.effectResult && (
                            <div className="text-[11px] text-amber-300 mt-0.5">{lastCard.effectResult}</div>
                          )}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-[11px] text-slate-500 flex flex-col items-center gap-1">
                          <Lock className="w-4 h-4 text-slate-600" />
                          <span>Carta Secreta Oculta</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={onConfirmRead}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl"
            >
              ✅ INICIAR TURNOS DE DADOS NO TABULEIRO →
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* CONTEÚDO DA ETAPA 2: TURNOS DE MOVIMENTO NO TABULEIRO             */}
        {/* ================================================================= */}
        {gameState.phase === 'board_turns' && gameState.pendingDecision?.type !== 'round_reveal' && currentPlayer && (
          <div className="space-y-4">
            {/* Barra da Equipe da Vez */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase text-amber-400">
                  Vez de Jogar no Tabuleiro
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: currentPlayer.color }} />
                  <h3 className="text-xl font-black text-white">{currentPlayer.name}</h3>
                  <span className="text-xs font-bold text-slate-400 ml-2 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                    🔒 Saldo e Cartas sob Sigilo
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Posição atual: <strong>Casa #{currentPlayer.position} ({BOARD_TILES[currentPlayer.position]?.title})</strong>
                </span>
              </div>

              {/* Botão para o Representante da Vez espiar sua mão secreta e Denúncia Espontânea */}
              <button
                onClick={() =>
                  setUnlockedPlayerId(unlockedPlayerId === currentPlayer.id ? null : currentPlayer.id)
                }
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-amber-300 flex items-center gap-1.5"
              >
                {unlockedPlayerId === currentPlayer.id ? (
                  <>
                    <EyeOff className="w-4 h-4" /> Ocultar Carteira Secreta
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Ver Meu Saldo / Cartas / Denúncia Espontânea
                  </>
                )}
              </button>
            </div>

            {/* Carteira Secreta Desbloqueada pelo Representante da Vez */}
            {unlockedPlayerId === currentPlayer.id && (
              <div className="p-4 rounded-2xl bg-slate-950/95 border-2 border-amber-400/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-amber-300">
                    🔓 Carteira Confidencial de {currentPlayer.name}
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-400 font-black font-mono">
                      💰 Saldo: ${currentPlayer.money}
                    </span>
                    <span className="text-sky-400 font-bold">
                      🟦 Cartas Azuis: {currentPlayer.blueCardsList.length}
                    </span>
                    <span className="text-red-400 font-bold">
                      🟥 Impostos Sonegados Pendentes: {currentPlayer.redCards}
                    </span>
                  </div>
                </div>

                {!gameState.pendingDecision &&
                  currentPlayer.redCards > 0 &&
                  !currentPlayer.forbidSpontaneous && (
                    <button
                      onClick={() => onSpontaneousForPlayer(currentPlayer.id)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-400 text-emerald-200 text-xs font-black flex items-center justify-between"
                    >
                      <span>
                        🤝 Realizar Denúncia Espontânea Agora ({currentPlayer.redCards} período(s) sem multa de $450!)
                      </span>
                      <span className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950">
                        Pagar -${currentPlayer.redCards * 300}
                      </span>
                    </button>
                  )}
              </div>
            )}

            {/* Ação Principal do Turno (Rolar Dado, Bifurcação, Caridade, Denúncia ou Confirmar Leitura) */}
            {isAnimatingRoll ? (
              <div className="p-5 rounded-2xl bg-amber-500/20 border border-amber-400 text-center text-sm font-black text-amber-300 animate-pulse">
                🎲 Dado 3D rolando e peão caminhando no Telão...
              </div>
            ) : !gameState.pendingDecision ? (
              <button
                onClick={onRollDice}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400 hover:brightness-110 text-slate-950 font-black text-base shadow-xl flex items-center justify-center gap-2"
              >
                <Dices className="w-6 h-6" />
                {currentPlayer.skipTurns > 0
                  ? `CUMPRIR RODADA PARADO (${currentPlayer.name})`
                  : `LANÇAR DADO 3D NO TELÃO (${currentPlayer.name})!`}
              </button>
            ) : gameState.pendingDecision.type === 'fork_choice' ? (
              <div className="p-4 rounded-2xl bg-slate-950 border-2 border-amber-400 space-y-2.5">
                <h4 className="font-black text-sm text-amber-300 flex items-center gap-2">
                  <GitFork className="w-4 h-4" /> Escolha o Caminho na Bifurcação ({currentPlayer.name}):
                </h4>
                {gameState.pendingDecision.options?.map((opt) => (
                  <button
                    key={opt.nextTileId}
                    onClick={() => onForkChoice(opt.nextTileId)}
                    className="w-full p-3.5 rounded-xl bg-slate-900 hover:bg-emerald-950 border border-slate-700 hover:border-emerald-400 text-left flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-black text-amber-300">{opt.label}</div>
                      <div className="text-xs text-slate-300">
                        Próxima casa: #{opt.nextTileId} — {opt.tileTitle}
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-400">Seguir →</span>
                  </button>
                ))}
              </div>
            ) : gameState.pendingDecision.type === 'charity_choice' ? (
              <div className="p-4 rounded-2xl bg-slate-950 border-2 border-pink-400 text-center space-y-3">
                <h4 className="font-black text-base text-white">{gameState.pendingDecision.title}</h4>
                <p className="text-xs text-slate-300">{gameState.pendingDecision.description}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => onCharityChoice(true)}
                    className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs"
                  >
                    SIM, DOAR $300 E JOGAR DE NOVO
                  </button>
                  <button
                    onClick={() => onCharityChoice(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Não doar (Passar a vez)
                  </button>
                </div>
              </div>
            ) : gameState.pendingDecision.type === 'denuncia_choice' ? (
              <div className="p-4 rounded-2xl bg-slate-950 border-2 border-indigo-400 space-y-2.5">
                <h4 className="font-black text-sm text-indigo-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Casa Preta de DENÚNCIA! Quem {currentPlayer.name} deseja investigar?
                </h4>
                {gameState.players
                  .filter((p) => p.id !== currentPlayer.id)
                  .map((opp) => (
                    <button
                      key={opp.id}
                      onClick={() => onDenunciaAction('accuse', opp.id)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 hover:bg-indigo-950 border border-slate-700 hover:border-indigo-400"
                    >
                      <span className="font-bold text-xs flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: opp.color }} />
                        {opp.name}
                      </span>
                      <span className="text-xs text-amber-400 font-bold">
                        Casa #{opp.position} • Denunciar →
                      </span>
                    </button>
                  ))}
                <button
                  onClick={() => onDenunciaAction('skip', null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Não denunciar ninguém nesta rodada
                </button>
              </div>
            ) : gameState.pendingDecision.type === 'tile_summary' ? (
              <div className="p-4 rounded-2xl bg-slate-950 border-2 border-sky-400 space-y-3">
                <div className="text-xs font-black text-sky-400">
                  {gameState.pendingDecision.subtitle}
                </div>
                <h4 className="text-lg font-black text-white">{gameState.pendingDecision.title}</h4>
                <p className="text-xs text-slate-200 whitespace-pre-line">
                  {gameState.pendingDecision.description}
                </p>
                <button
                  onClick={onConfirmRead}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-black text-sm"
                >
                  {gameState.pendingDecision.rollAgain
                    ? '✅ LIDO • ROLAR O DADO NOVAMENTE!'
                    : '✅ LIDO • PASSAR PARA A PRÓXIMA EQUIPE →'}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 2. CARTEIRA SECRETA NO CELULAR DO JOGADOR (Modo Telão + Celulares)
// ============================================================================
export function MobilePlayerController({
  gameState,
  myPlayer,
  isMyTurn,
  onTaxVote,
  onConfirmRead,
  onSpontaneousDenunciation,
  onRollDice,
  onForkChoice,
  onCharityChoice,
  onDenunciaAction,
  isAnimatingRoll,
  onToggleShowBoard
}) {
  if (!myPlayer) return null;

  const hasVotedThisRound = gameState.roundVotes?.[myPlayer.id] !== undefined;
  const currentPlayer = gameState.players[gameState.turnIndex];

  return (
    <div className="fixed inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 overflow-y-auto pointer-events-auto">
      <div className="max-w-md w-full mx-auto space-y-4 my-auto">
        {/* Topo da Carteira do Celular */}
        <div className="p-4 rounded-3xl bg-slate-900 border-2 border-slate-700 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="w-4 h-4 rounded-full ring-2 ring-white"
                style={{ backgroundColor: myPlayer.color }}
              />
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-sky-400 block">
                  Controle Individual • Sala {gameState.roomCode}
                </span>
                <h2 className="text-lg font-black text-white">{myPlayer.name}</h2>
              </div>
            </div>
            <button
              onClick={onToggleShowBoard}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
            >
              🗺️ Ver Mapa 3D
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center">
            <div className="p-2 rounded-xl bg-slate-950">
              <span className="text-[10px] text-slate-400 block">Saldo Bancário</span>
              <span className="font-mono font-black text-base text-emerald-400">${myPlayer.money}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950">
              <span className="text-[10px] text-slate-400 block">Cartas Azuis</span>
              <span className="font-black text-base text-sky-400">🟦 {myPlayer.blueCardsList.length}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950">
              <span className="text-[10px] text-slate-400 block">Dívida Secreta</span>
              <span className="font-black text-base text-red-400">🟥 {myPlayer.redCards}</span>
            </div>
          </div>
        </div>

        {/* ETAPA 1 NO CELULAR: VOTAÇÃO SECRETA "PAGO OU NÃO?" */}
        {gameState.phase === 'tax_vote' && (
          <div className="p-5 rounded-3xl bg-slate-900 border-2 border-amber-400 shadow-2xl">
            <span className="text-[11px] font-black uppercase text-amber-300">
              Período Fiscal #{gameState.roundNumber} • Escolha Secreta no Celular
            </span>
            <h3 className="text-xl font-black text-white mt-1">☝️ PAGO OU NÃO? ✌️</h3>

            {hasVotedThisRound ? (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                <div className="font-black text-sm text-white">Voto Secreto Registrado!</div>
                <p className="text-xs text-slate-300 mt-1">
                  Aguardando os demais jogadores votarem em seus celulares para revelar o destino do Estado no Telão...
                </p>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                <button
                  onClick={() => onTaxVote(true)}
                  className="w-full p-4 rounded-2xl bg-emerald-950 hover:bg-emerald-900 border-2 border-emerald-400 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-xs font-black">
                      ☝️ PAGO IMPOSTO
                    </span>
                    <span className="font-mono font-black text-lg text-emerald-300">+$700</span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1.5">
                    Paga $300 de imposto, recebe $700 líquidos + 1 Carta Azul!
                  </p>
                </button>

                <button
                  onClick={() => onTaxVote(false)}
                  className="w-full p-4 rounded-2xl bg-red-950 hover:bg-red-900 border-2 border-red-400 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-black">
                      ✌️ NÃO PAGO (SONEGO)
                    </span>
                    <span className="font-mono font-black text-lg text-red-300">+$1.000</span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1.5">
                    Fica com $1.000, mas recebe 1 Carta Vermelha secreta!
                  </p>
                </button>
              </div>
            )}
          </div>
        )}

        {/* REVELAÇÃO DA SUA CARTA SECRETA NO CELULAR */}
        {gameState.pendingDecision?.type === 'round_reveal' && (
          <div className="p-5 rounded-3xl bg-slate-900 border-2 border-sky-400 shadow-2xl text-center space-y-3">
            <span className="text-xs font-black uppercase text-sky-400">
              Sua Carta Secreta da Rodada #{gameState.roundNumber}
            </span>
            {myPlayer.lastDrawnCard?.card && (
              <div>
                <img
                  src={myPlayer.lastDrawnCard.card.image}
                  alt={myPlayer.lastDrawnCard.card.title}
                  className="w-36 h-48 object-contain mx-auto rounded-xl shadow-lg mb-2"
                />
                <h4 className="font-black text-base text-white">{myPlayer.lastDrawnCard.card.title}</h4>
                <p className="text-xs text-amber-300 mt-1">{myPlayer.lastDrawnCard.effectResult}</p>
              </div>
            )}
            {gameState.pendingDecision.drawnCardsSummary?.some((i) => i.isPublicEvent) && (
              <div className="p-3 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-left space-y-1">
                <span className="text-[11px] font-black text-amber-300 block">
                  ⚡ Movimento Imediato no Tabuleiro:
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
            <button
              onClick={onConfirmRead}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-950 font-black text-sm"
            >
              ✅ JÁ VI MINHA CARTA • PRONTO!
            </button>
          </div>
        )}

        {/* ETAPA 2 NO CELULAR: ROLAR DADO E DECISÕES */}
        {gameState.phase === 'board_turns' && gameState.pendingDecision?.type !== 'round_reveal' && (
          <div className="p-5 rounded-3xl bg-slate-900 border-2 border-slate-700 shadow-2xl space-y-3">
            <div className="text-xs text-slate-400">
              Vez na mesa: <strong className="text-white">{currentPlayer?.name}</strong> (Casa #{currentPlayer?.position})
            </div>

            {isMyTurn && !gameState.pendingDecision && myPlayer.redCards > 0 && !myPlayer.forbidSpontaneous && (
              <button
                onClick={onSpontaneousDenunciation}
                className="w-full py-3 px-4 rounded-xl bg-emerald-950 border border-emerald-400 text-emerald-200 text-xs font-black flex items-center justify-between"
              >
                <span>🤝 Denúncia Espontânea ({myPlayer.redCards}x)</span>
                <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950">
                  -${myPlayer.redCards * 300}
                </span>
              </button>
            )}

            {isAnimatingRoll ? (
              <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-400 text-center text-xs font-black text-amber-300 animate-bounce">
                🎲 Olhe para o Telão! Dado 3D rolando...
              </div>
            ) : !gameState.pendingDecision ? (
              <button
                disabled={!isMyTurn}
                onClick={onRollDice}
                className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 ${
                  isMyTurn
                    ? 'bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400 text-slate-950 shadow-xl'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Dices className="w-5 h-5" />
                {isMyTurn ? '🎲 LANÇAR DADO 3D NO TELÃO!' : `Aguardando ${currentPlayer?.name}...`}
              </button>
            ) : gameState.pendingDecision.type === 'fork_choice' && isMyTurn ? (
              <div className="space-y-2">
                <div className="text-xs font-black text-amber-300">Escolha seu caminho na bifurcação:</div>
                {gameState.pendingDecision.options?.map((opt) => (
                  <button
                    key={opt.nextTileId}
                    onClick={() => onForkChoice(opt.nextTileId)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-amber-400 text-left text-xs font-bold text-white"
                  >
                    {opt.label} → #{opt.nextTileId} ({opt.tileTitle})
                  </button>
                ))}
              </div>
            ) : gameState.pendingDecision.type === 'charity_choice' && isMyTurn ? (
              <div className="space-y-2">
                <div className="text-xs font-bold text-white">{gameState.pendingDecision.description}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onCharityChoice(true)}
                    className="flex-1 py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs"
                  >
                    Doar $300
                  </button>
                  <button
                    onClick={() => onCharityChoice(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold text-xs"
                  >
                    Não doar
                  </button>
                </div>
              </div>
            ) : gameState.pendingDecision.type === 'denuncia_choice' && isMyTurn ? (
              <div className="space-y-2">
                <div className="text-xs font-black text-indigo-300">Quem você deseja denunciar à Receita?</div>
                {gameState.players
                  .filter((p) => p.id !== myPlayer.id)
                  .map((opp) => (
                    <button
                      key={opp.id}
                      onClick={() => onDenunciaAction('accuse', opp.id)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-indigo-400 flex justify-between text-xs font-bold"
                    >
                      <span>{opp.name}</span>
                      <span className="text-amber-300">Denunciar →</span>
                    </button>
                  ))}
                <button
                  onClick={() => onDenunciaAction('skip', null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                >
                  Não denunciar ninguém
                </button>
              </div>
            ) : gameState.pendingDecision.type === 'tile_summary' ? (
              <div className="space-y-2">
                <div className="text-xs font-black text-sky-400">{gameState.pendingDecision.title}</div>
                <p className="text-xs text-slate-300">{gameState.pendingDecision.description}</p>
                <button
                  onClick={onConfirmRead}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs"
                >
                  ✅ Confirmar Leitura
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Suas Cartas Guardadas (Visão Privada no Celular) */}
        {(myPlayer.blueCardsList.length > 0 || (myPlayer.redCardsList && myPlayer.redCardsList.length > 0)) && (
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-black uppercase text-slate-400 block mb-2">
              🔒 Suas Cartas Confidenciais no Celular
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {myPlayer.blueCardsList.map((c, i) => (
                <img
                  key={`b-${i}`}
                  src={c.image}
                  alt={c.title}
                  className="w-16 h-24 object-cover rounded-lg border border-sky-400 shrink-0"
                />
              ))}
              {(myPlayer.redCardsList || []).map((c, i) => (
                <img
                  key={`r-${i}`}
                  src={c.image}
                  alt={c.title}
                  className="w-16 h-24 object-cover rounded-lg border border-red-500 shrink-0"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
