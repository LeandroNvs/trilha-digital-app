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
  Award,
  RotateCcw,
  BookOpen,
  Layers,
  ZoomIn,
  X
} from 'lucide-react';
import { BOARD_TILES, SERVICE_CARDS, BLUE_CARDS, RED_CARDS } from '../data/boardData.js';

// ============================================================================
// AUXILIAR: SELETOR INTERATIVO DE CARTAS VERMELHAS (#3, #5, #6 e #7)
// ============================================================================
export function RedCardInteractiveSelector({
  actorPlayer,
  allPlayers,
  onSelectChoice,
  disabled = false
}) {
  const pendingAction = actorPlayer?.lastDrawnCard?.pendingAction;
  if (!pendingAction || pendingAction.completed) return null;

  const opponents = (allPlayers || []).filter((p) => p.id !== actorPlayer.id);

  if (pendingAction.type === 'discard_own_blue') {
    const myBlues = actorPlayer.blueCardsList || [];
    return (
      <div className="mt-3 p-3.5 rounded-2xl bg-red-950/75 border-2 border-amber-400 text-left space-y-2.5 shadow-xl">
        <div className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
          <span>🃏 Carta 3 (Carta Negada) • Escolha qual Carta Azul descartar:</span>
        </div>
        <p className="text-[11px] text-slate-200">
          Toque na Carta Azul da sua mão que você deseja descartar para prosseguir:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {myBlues.map((card, idx) => (
            <button
              key={`disc-blue-${idx}`}
              disabled={disabled}
              onClick={() => onSelectChoice(idx)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-red-900/80 border border-sky-400 hover:border-amber-300 flex flex-col items-center text-center transition active:scale-95"
            >
              <img
                src={card.image}
                alt={card.title}
                className="w-16 h-24 object-contain rounded mb-1"
              />
              <span className="text-[10px] font-black text-white line-clamp-1">{card.title}</span>
              <span className="mt-1 px-2 py-0.5 rounded bg-red-500 text-white text-[10px] font-black">
                Descartar Esta
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (pendingAction.type === 'sabotage_discard_blue') {
    const targetsWithBlue = opponents.filter((p) => (p.blueCardsList?.length || 0) > 0);
    return (
      <div className="mt-3 p-3.5 rounded-2xl bg-red-950/75 border-2 border-amber-400 text-left space-y-2 shadow-xl">
        <div className="text-xs font-black uppercase text-amber-300">
          🕵️ Carta 5 (Trapaceiro!) • Escolha de quem tirar 1 Carta Azul:
        </div>
        <p className="text-[11px] text-slate-200">
          Sua identidade como sabotador será mantida em segredo! Escolha o alvo:
        </p>
        <div className="space-y-1.5">
          {targetsWithBlue.map((opp) => (
            <button
              key={opp.id}
              disabled={disabled}
              onClick={() => onSelectChoice(opp.id)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-red-900 border border-slate-700 hover:border-amber-300 flex items-center justify-between text-xs font-bold text-white transition active:scale-95"
            >
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: opp.color }} />
                <span>{opp.name}</span>
              </span>
              <span className="text-amber-300 font-black">
                Tirar 1 Carta Azul →
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (pendingAction.type === 'sabotage_back_3') {
    const targetsAhead = opponents.filter((p) => p.position > 0);
    const list = targetsAhead.length > 0 ? targetsAhead : opponents;
    return (
      <div className="mt-3 p-3.5 rounded-2xl bg-red-950/75 border-2 border-amber-400 text-left space-y-2 shadow-xl">
        <div className="text-xs font-black uppercase text-amber-300">
          🕵️ Carta 6 (Passou a Perna!) • Escolha quem vai voltar 3 casas:
        </div>
        <p className="text-[11px] text-slate-200">
          O jogador escolhido verá que foi sabotado, mas não saberá quem foi! O recuo ocorrerá no Telão após todos confirmarem a leitura:
        </p>
        <div className="space-y-1.5">
          {list.map((opp) => (
            <button
              key={opp.id}
              disabled={disabled}
              onClick={() => onSelectChoice(opp.id)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-red-900 border border-slate-700 hover:border-amber-300 flex items-center justify-between text-xs font-bold text-white transition active:scale-95"
            >
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: opp.color }} />
                <span>{opp.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">(Casa #{opp.position})</span>
              </span>
              <span className="text-amber-300 font-black">Mandar Voltar 3 Casas →</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (pendingAction.type === 'sabotage_swap') {
    return (
      <div className="mt-3 p-3.5 rounded-2xl bg-red-950/75 border-2 border-amber-400 text-left space-y-2 shadow-xl">
        <div className="text-xs font-black uppercase text-amber-300">
          🕵️ Carta 7 (Troca!) • Escolha com quem trocar de lugar no tabuleiro:
        </div>
        <p className="text-[11px] text-slate-200">
          Você está na <strong>Casa #{actorPlayer.position}</strong>. Escolha um jogador para trocar de lugar com você assim que todos fecharem a carta:
        </p>
        <div className="space-y-1.5">
          {opponents.map((opp) => (
            <button
              key={opp.id}
              disabled={disabled}
              onClick={() => onSelectChoice(opp.id)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-red-900 border border-slate-700 hover:border-amber-300 flex items-center justify-between text-xs font-bold text-white transition active:scale-95"
            >
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: opp.color }} />
                <span>{opp.name}</span>
                <span className="text-[10px] text-emerald-300 font-mono">(Casa #{opp.position})</span>
              </span>
              <span className="text-amber-300 font-black">Trocar de Lugar →</span>
            </button>
          ))}
          <button
            disabled={disabled}
            onClick={() => onSelectChoice('SKIP_SWAP')}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 transition"
          >
            Preferir manter minha posição atual (Casa #{actorPlayer.position})
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================================
// AUXILIAR: PAINEL DE USO DAS CARTAS AZUIS DE AÇÃO (!) ANTES DE ROLAR O DADO
// (Slides 11 e 12: Jogada Bônus!, Nova Chance! e Troca de Carta!)
// ============================================================================
export function BlueCardActionPanel({
  player,
  allPlayers,
  currentRound,
  canUseActionsNow,
  onUseBlueCard,
  disabled = false
}) {
  const [tradeActionIdx, setTradeActionIdx] = useState(null);
  const [selectedGiveIdx, setSelectedGiveIdx] = useState(null);

  useEffect(() => {
    setTradeActionIdx(null);
    setSelectedGiveIdx(null);
  }, [player?.id, player?.blueCardsList?.length, currentRound]);

  if (!player) return null;
  const blueCards = player.blueCardsList || [];
  if (blueCards.length === 0 && !(player.bonusRollPending > 0)) return null;

  const opponentsWithBlue = (allPlayers || []).filter(
    (p) => p.id !== player.id && (p.blueCardsList?.length || 0) > 0
  );

  return (
    <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-sky-500/40 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-black uppercase tracking-wider text-sky-400">
          🟦 Suas Cartas Azuis ({blueCards.length})
        </span>
        {player.bonusRollPending > 0 && (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black animate-pulse">
            🎲 Jogada Bônus Ativa (+{player.bonusRollPending} dado extra!)
          </span>
        )}
      </div>

      {blueCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {blueCards.map((card, idx) => {
            const isAction =
              card.isActionCard ||
              ['jogada_bonus', 'nova_chance', 'troca_carta'].includes(card.type);
            const unlockedByRound = (card.acquiredRound || 0) < currentRound;
            const canUseThisCard = isAction && unlockedByRound && canUseActionsNow && !disabled;
            const otherCardsCount = blueCards.length - 1;

            return (
              <div
                key={card.instanceId || `bc-${idx}`}
                className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 ${
                  isAction
                    ? unlockedByRound
                      ? 'bg-sky-950/50 border-sky-400/70'
                      : 'bg-slate-900/80 border-slate-700'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-12 h-18 object-contain rounded border border-sky-400/40 shrink-0"
                  />
                  <div className="text-left min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          isAction
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isAction ? '⚡ Carta de Ação (!)' : '💰 Restituição ($)'}
                      </span>
                    </div>
                    <div className="font-black text-xs text-white mt-1 truncate">
                      {card.title}
                    </div>
                    <div className="text-[10px] text-slate-300 leading-snug mt-0.5">
                      {card.description}
                    </div>
                  </div>
                </div>

                {isAction && (
                  <div className="pt-1.5 border-t border-slate-800/80">
                    {!unlockedByRound ? (
                      <div className="text-[10px] font-bold text-amber-300 text-center">
                        ⏳ Ganha nesta rodada (Disponível a partir da Rodada #{currentRound + 1})
                      </div>
                    ) : !canUseActionsNow ? (
                      <div className="text-[10px] font-semibold text-sky-300 text-center">
                        ✅ Pronta para usar na sua vez (antes de rolar o dado)
                      </div>
                    ) : card.type === 'jogada_bonus' ? (
                      <button
                        disabled={!canUseThisCard}
                        onClick={() => onUseBlueCard({ actionCardIndex: idx })}
                        className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-[11px] shadow transition active:scale-95"
                      >
                        ⚡ USAR AGORA (Jogar Dado 2x neste turno!)
                      </button>
                    ) : card.type === 'nova_chance' ? (
                      otherCardsCount > 0 ? (
                        <button
                          disabled={!canUseThisCard}
                          onClick={() => onUseBlueCard({ actionCardIndex: idx })}
                          className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-sky-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-[11px] shadow transition active:scale-95"
                        >
                          🔄 USAR AGORA (Trocar minhas outras {otherCardsCount} carta(s) no baralho!)
                        </button>
                      ) : (
                        <div className="text-[10px] text-slate-400 text-center">
                          Precisa ter outra Carta Azul na mão para trocar com o baralho.
                        </div>
                      )
                    ) : card.type === 'troca_carta' ? (
                      otherCardsCount <= 0 ? (
                        <div className="text-[10px] text-slate-400 text-center">
                          Precisa ter pelo menos 1 outra Carta Azul sua para trocar.
                        </div>
                      ) : opponentsWithBlue.length === 0 ? (
                        <div className="text-[10px] text-slate-400 text-center">
                          Nenhum adversário possui Carta Azul para trocar no momento.
                        </div>
                      ) : tradeActionIdx === idx ? (
                        <div className="space-y-2 bg-slate-950 p-2 rounded-lg border border-amber-400">
                          <div className="text-[10px] font-black text-amber-300">
                            1º) Qual outra Carta Azul sua você vai entregar?
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {blueCards.map((otherC, oIdx) => {
                              if (oIdx === idx) return null;
                              const isSel = selectedGiveIdx === oIdx;
                              return (
                                <button
                                  key={`give-${oIdx}`}
                                  onClick={() => setSelectedGiveIdx(oIdx)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                                    isSel
                                      ? 'bg-amber-400 text-slate-950 border-white font-black'
                                      : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-amber-400'
                                  }`}
                                >
                                  {otherC.title}
                                </button>
                              );
                            })}
                          </div>

                          {selectedGiveIdx !== null && (
                            <>
                              <div className="text-[10px] font-black text-emerald-300 pt-1">
                                2º) Com qual adversário deseja trocar?
                              </div>
                              <div className="space-y-1">
                                {opponentsWithBlue.map((opp) => (
                                  <button
                                    key={`opp-trade-${opp.id}`}
                                    onClick={() => {
                                      onUseBlueCard({
                                        actionCardIndex: idx,
                                        myGiveCardIndex: selectedGiveIdx,
                                        targetPlayerId: opp.id
                                      });
                                      setTradeActionIdx(null);
                                      setSelectedGiveIdx(null);
                                    }}
                                    className="w-full px-2.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-between"
                                  >
                                    <span>Trocar com {opp.name}</span>
                                    <span>({opp.blueCardsList.length} carta(s)) →</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}

                          <button
                            onClick={() => {
                              setTradeActionIdx(null);
                              setSelectedGiveIdx(null);
                            }}
                            className="w-full py-1 rounded bg-slate-800 text-[10px] text-slate-300 font-bold"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={!canUseThisCard}
                          onClick={() => {
                            const firstOtherIdx = blueCards.findIndex((_, i) => i !== idx);
                            setTradeActionIdx(idx);
                            setSelectedGiveIdx(firstOtherIdx !== -1 ? firstOtherIdx : null);
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-400 to-sky-400 hover:brightness-110 text-slate-950 font-black text-[11px] shadow transition active:scale-95"
                        >
                          🤝 USAR AGORA (Trocar 1 Carta Azul com Adversário)
                        </button>
                      )
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 1. CONSOLE DO MEDIADOR (Para o Modo Mediador em 2 Abas: Telão + Mediador)
// ============================================================================
export function MediatorConsoleOverlay({
  gameState,
  onTaxVoteForPlayer,
  onRedCardChoiceForPlayer,
  onUseBlueCardForPlayer,
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
                          {onRedCardChoiceForPlayer && (
                            <RedCardInteractiveSelector
                              actorPlayer={p}
                              allPlayers={gameState.players}
                              onSelectChoice={(choice) => onRedCardChoiceForPlayer(p.id, choice)}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-[11px] text-slate-500 flex flex-col items-center gap-1">
                          <Lock className="w-4 h-4 text-slate-600" />
                          <span>Carta Secreta Oculta</span>
                          {lastCard?.pendingAction && !lastCard.pendingAction.completed && (
                            <span className="mt-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black animate-pulse">
                              ⚡ Ação Obrigatória na Carta!
                            </span>
                          )}
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
                        🤝 Realizar Denúncia Espontânea Agora ({currentPlayer.redCards} período(s) • $300 + $100 de multa)
                      </span>
                      <span className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950">
                        Pagar -${currentPlayer.redCards * 400}
                      </span>
                    </button>
                  )}

                {onUseBlueCardForPlayer && (
                  <BlueCardActionPanel
                    player={currentPlayer}
                    allPlayers={gameState.players}
                    currentRound={gameState.roundNumber}
                    canUseActionsNow={!gameState.pendingDecision && !isAnimatingRoll}
                    onUseBlueCard={(payload) =>
                      onUseBlueCardForPlayer(currentPlayer.id, payload)
                    }
                  />
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
              <div
                className={`p-4 rounded-2xl bg-slate-950 border-2 space-y-3 ${
                  gameState.stateHasResources ? 'border-emerald-400' : 'border-red-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase text-amber-300">
                    🎲 Vez de {gameState.pendingDecision.playerName || currentPlayer?.name}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      gameState.stateHasResources
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {gameState.stateHasResources ? '🏛️ Estado COM Recursos' : '🚨 Estado SEM Recursos'}
                  </span>
                </div>
                <h4 className="text-lg font-black text-white">
                  {gameState.pendingDecision.tileTitle
                    ? `${gameState.pendingDecision.playerName} caiu em: "${gameState.pendingDecision.tileTitle}"`
                    : gameState.pendingDecision.title}
                </h4>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <p className="text-sm font-bold text-white whitespace-pre-line">
                    {gameState.pendingDecision.description}
                  </p>
                  {gameState.pendingDecision.extraEffectNote && (
                    <p className="text-xs font-black text-amber-300 pt-1">
                      {gameState.pendingDecision.extraEffectNote}
                    </p>
                  )}
                </div>
                <button
                  onClick={onConfirmRead}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-black text-sm"
                >
                  {gameState.pendingDecision.deferredMove
                    ? gameState.pendingDecision.deferredMove.steps > 0
                      ? `✅ MENSAGEM LIDA • AVANÇAR +${gameState.pendingDecision.deferredMove.steps} CASA(S) NO TABULEIRO! →`
                      : `✅ MENSAGEM LIDA • VOLTAR ${Math.abs(gameState.pendingDecision.deferredMove.steps)} CASA(S) NO TABULEIRO! →`
                    : gameState.pendingDecision.rollAgain
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
  onRedCardChoice,
  onUseBlueCard,
  onDismissSabotageAlert,
  onConfirmRead,
  onSpontaneousDenunciation,
  onRollDice,
  onForkChoice,
  onCharityChoice,
  onDenunciaAction,
  isAnimatingRoll,
  onToggleShowBoard,
  onRefreshSync,
  isSyncing = false,
  syncStatusText = '',
  pendingLocalVote = null,
  pendingLocalReadConfirm = false
}) {
  if (!myPlayer) return null;

  const recordedVote =
    gameState.roundVotes?.[myPlayer.id] !== undefined
      ? gameState.roundVotes[myPlayer.id]
      : pendingLocalVote;
  const hasVotedThisRound = recordedVote !== undefined && recordedVote !== null;
  const currentPlayer = gameState.players[gameState.turnIndex];

  const humanPlayers = gameState.players.filter((p) => !p.isBot);
  const votedPlayersCount = humanPlayers.filter(
    (p) =>
      gameState.roundVotes?.[p.id] !== undefined ||
      (p.id === myPlayer.id && hasVotedThisRound)
  ).length;
  const pendingVotePlayers = humanPlayers.filter(
    (p) =>
      gameState.roundVotes?.[p.id] === undefined &&
      !(p.id === myPlayer.id && hasVotedThisRound)
  );

  const readyIds =
    gameState.pendingDecision?.readyPlayerIds ||
    gameState.pendingDecision?.readBy ||
    [];
  const hasConfirmedRead =
    Boolean(readyIds.includes(myPlayer.id)) || pendingLocalReadConfirm;
  const pendingReadPlayers = humanPlayers.filter(
    (p) =>
      !readyIds.includes(p.id) && !(p.id === myPlayer.id && hasConfirmedRead)
  );

  const hasPendingRedCardChoice =
    Boolean(myPlayer.lastDrawnCard?.pendingAction) &&
    !myPlayer.lastDrawnCard.pendingAction.completed;

  return (
    <div className="fixed inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 overflow-y-auto pointer-events-auto">
      <div className="max-w-md w-full mx-auto space-y-4 my-auto">
        {/* Topo da Carteira do Celular */}
        <div className="p-4 rounded-3xl bg-slate-900 border-2 border-slate-700 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-4 h-4 rounded-full ring-2 ring-white shrink-0"
                style={{ backgroundColor: myPlayer.color }}
              />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-black tracking-wider text-sky-400 block">
                  Controle Individual • Sala {gameState.roomCode}
                </span>
                <h2 className="text-lg font-black text-white truncate">{myPlayer.name}</h2>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onRefreshSync && (
                <button
                  onClick={onRefreshSync}
                  disabled={isSyncing}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-300 border border-emerald-500/40 flex items-center gap-1 transition active:scale-95"
                  title="Sincronizar estado com a sala agora"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sinc...' : 'Atualizar'}</span>
                </button>
              )}
              <button
                onClick={onToggleShowBoard}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
              >
                🗺️ Mapa
              </button>
            </div>
          </div>

          {syncStatusText && (
            <div className="mt-2 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 text-center">
              {syncStatusText}
            </div>
          )}

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

        {/* ALERTA DE SABOTAGEM SOFRIDA PELO JOGADOR (Aparece na tela de quem foi sabotado, sem revelar o autor!) */}
        {myPlayer.sabotageAlerts && myPlayer.sabotageAlerts.length > 0 && (
          <div className="p-4 rounded-3xl bg-red-950/90 border-2 border-amber-400 shadow-2xl space-y-2 animate-pulse">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                🕵️ Alerta de Sabotagem Sofrida!
              </span>
              {onDismissSabotageAlert && (
                <button
                  onClick={onDismissSabotageAlert}
                  className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold border border-slate-700"
                >
                  Entendi ✕
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {myPlayer.sabotageAlerts.map((alertMsg, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-red-500/40 text-xs font-bold text-white leading-relaxed"
                >
                  {alertMsg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ETAPA 1 NO CELULAR: VOTAÇÃO SECRETA "PAGO OU NÃO?" */}
        {gameState.phase === 'tax_vote' && (
          <div className="p-5 rounded-3xl bg-slate-900 border-2 border-amber-400 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-amber-300">
                Período Fiscal #{gameState.roundNumber} • Escolha Secreta
              </span>
              <span className="text-[11px] font-bold text-sky-300">
                📊 {votedPlayersCount}/{humanPlayers.length} votaram
              </span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">☝️ PAGO OU NÃO? ✌️</h3>

            {hasVotedThisRound ? (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="font-black text-sm text-white">
                  {isSyncing
                    ? '⏳ Salvando seu Voto Secreto na Sala...'
                    : '✅ Voto Secreto Registrado e Sincronizado!'}
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-xs font-bold text-slate-200">
                  Sua escolha nesta rodada:{' '}
                  <strong className={recordedVote ? 'text-emerald-400' : 'text-red-400'}>
                    {recordedVote ? '☝️ PAGO (+$700)' : '✌️ NÃO PAGO (+$1.000)'}
                  </strong>
                </div>
                {pendingVotePlayers.length > 0 ? (
                  <p className="text-xs text-amber-300 font-semibold pt-1">
                    ⏳ Aguardando votar: {pendingVotePlayers.map((p) => p.name).join(', ')}
                  </p>
                ) : (
                  <p className="text-xs text-emerald-300 font-semibold pt-1">
                    🎉 Todos votaram! Processando revelação da rodada...
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                <button
                  disabled={isSyncing}
                  onClick={() => onTaxVote(true)}
                  className="w-full p-4 rounded-2xl bg-emerald-950 hover:bg-emerald-900 active:scale-98 border-2 border-emerald-400 text-left transition"
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
                  disabled={isSyncing}
                  onClick={() => onTaxVote(false)}
                  className="w-full p-4 rounded-2xl bg-red-950 hover:bg-red-900 active:scale-98 border-2 border-red-400 text-left transition"
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
            {myPlayer.lastDrawnCard?.card ? (
              <div>
                <img
                  src={myPlayer.lastDrawnCard.card.image}
                  alt={myPlayer.lastDrawnCard.card.title}
                  className="w-36 h-48 object-contain mx-auto rounded-xl shadow-lg mb-2"
                />
                <h4 className="font-black text-base text-white">{myPlayer.lastDrawnCard.card.title}</h4>
                <p className="text-xs text-amber-300 mt-1 font-semibold">
                  {myPlayer.lastDrawnCard.effectResult}
                </p>
              </div>
            ) : myPlayer.lastDrawnCard?.effectResult ? (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-semibold">
                {myPlayer.lastDrawnCard.effectResult}
              </div>
            ) : null}

            {/* SELETOR INTERATIVO PARA CARTAS VERMELHAS 3, 5, 6 e 7 */}
            {onRedCardChoice && (
              <RedCardInteractiveSelector
                actorPlayer={myPlayer}
                allPlayers={gameState.players}
                disabled={isSyncing}
                onSelectChoice={(choice) => onRedCardChoice(choice)}
              />
            )}

            {hasConfirmedRead ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-center space-y-1">
                <div className="text-xs font-black text-emerald-300">
                  ✅ Você já confirmou sua carta!
                </div>
                {pendingReadPlayers.length > 0 ? (
                  <div className="text-[11px] text-amber-300 font-semibold">
                    ⏳ Aguardando confirmar: {pendingReadPlayers.map((p) => p.name).join(', ')}
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-300 font-semibold">
                    🎉 Todos confirmaram! Olhe para o Telão para ver os peões se movendo!
                  </div>
                )}
              </div>
            ) : (
              <button
                disabled={isSyncing || hasPendingRedCardChoice}
                onClick={onConfirmRead}
                className={`w-full py-3.5 rounded-xl font-black text-sm shadow-lg transition ${
                  hasPendingRedCardChoice
                    ? 'bg-slate-800 text-amber-300 border border-amber-400/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-950 active:scale-95'
                }`}
              >
                {hasPendingRedCardChoice
                  ? '☝️ FAÇA SUA ESCOLHA NA CARTA ACIMA PRIMEIRO!'
                  : '✅ JÁ VI MINHA CARTA • PRONTO!'}
              </button>
            )}
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
                <span>🤝 Denúncia Espontânea ({myPlayer.redCards}x • $300 + $100 multa)</span>
                <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950">
                  -${myPlayer.redCards * 400}
                </span>
              </button>
            )}

            {/* Painel de Uso de Cartas Azuis de Ação (!) antes de rolar o dado */}
            {onUseBlueCard && (myPlayer.blueCardsList?.length > 0 || myPlayer.bonusRollPending > 0) && (
              <BlueCardActionPanel
                player={myPlayer}
                allPlayers={gameState.players}
                currentRound={gameState.roundNumber}
                canUseActionsNow={isMyTurn && !gameState.pendingDecision && !isAnimatingRoll}
                onUseBlueCard={onUseBlueCard}
                disabled={isSyncing}
              />
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
            ) : gameState.pendingDecision.type === 'fork_choice' ? (
              isMyTurn ? (
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
              ) : (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-amber-300 font-semibold">
                  🧭 <strong>{currentPlayer?.name}</strong> está escolhendo qual caminho seguir na bifurcação...
                </div>
              )
            ) : gameState.pendingDecision.type === 'charity_choice' ? (
              isMyTurn ? (
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
              ) : (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-pink-300 font-semibold">
                  🤝 <strong>{currentPlayer?.name}</strong> está decidindo se vai doar $300 aos Fundos de Caridade...
                </div>
              )
            ) : gameState.pendingDecision.type === 'denuncia_choice' ? (
              isMyTurn ? (
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
              ) : (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-indigo-300 font-semibold">
                  🕵️ <strong>{currentPlayer?.name}</strong> parou na casa de DENÚNCIA e está escolhendo quem fiscalizar...
                </div>
              )
            ) : gameState.pendingDecision.type === 'tile_summary' ? (
              <div
                className={`p-3.5 rounded-2xl border-2 space-y-3 ${
                  gameState.stateHasResources
                    ? 'bg-emerald-950/30 border-emerald-400'
                    : 'bg-red-950/30 border-red-500'
                }`}
              >
                {/* 1. QUEM ESTÁ JOGANDO */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-white shrink-0"
                      style={{
                        backgroundColor:
                          gameState.pendingDecision.playerColor ||
                          currentPlayer?.color ||
                          '#38bdf8'
                      }}
                    />
                    <span className="text-xs font-black uppercase text-amber-300">
                      🎲 Vez de {gameState.pendingDecision.playerName || currentPlayer?.name}
                    </span>
                  </div>
                  {gameState.pendingDecision.tileId !== undefined && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-slate-300">
                      Casa #{gameState.pendingDecision.tileId}
                    </span>
                  )}
                </div>

                {/* 2. ESTADO COM OU SEM RECURSOS (Ícone + Borda Verde/Vermelha) */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    gameState.stateHasResources
                      ? 'bg-emerald-950/85 border-emerald-400 text-emerald-200'
                      : 'bg-red-950/85 border-red-500 text-red-200'
                  }`}
                >
                  {gameState.stateHasResources ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="text-[11px] font-black leading-tight">
                    {gameState.stateHasResources
                      ? '🏛️ ESTADO COM RECURSOS SUFICIENTES'
                      : '🚨 ESTADO SEM RECURSOS (SONEGAÇÃO)'}
                  </span>
                </div>

                {/* 3. EM QUAL CASA CAIU */}
                <div>
                  {gameState.pendingDecision.sectorName && (
                    <span
                      className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full mb-1"
                      style={{
                        backgroundColor: `${gameState.pendingDecision.sectorColor || '#38bdf8'}25`,
                        color: gameState.pendingDecision.sectorColor || '#38bdf8',
                        border: `1px solid ${gameState.pendingDecision.sectorColor || '#38bdf8'}60`
                      }}
                    >
                      {gameState.pendingDecision.sectorName} #{gameState.pendingDecision.sectorNum}
                    </span>
                  )}
                  <h4 className="text-base font-black text-white leading-snug">
                    {gameState.pendingDecision.tileTitle
                      ? `${gameState.pendingDecision.playerName} caiu em: "${gameState.pendingDecision.tileTitle}"`
                      : gameState.pendingDecision.title}
                  </h4>
                </div>

                {/* 4. CONSEQUÊNCIA / REGRA DA CARTA */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">
                    📋 Consequência:
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-white whitespace-pre-line leading-relaxed">
                    {gameState.pendingDecision.description}
                  </p>
                  {gameState.pendingDecision.extraEffectNote && (
                    <p className="text-[11px] font-black text-amber-300 pt-1 border-t border-slate-800">
                      {gameState.pendingDecision.extraEffectNote}
                    </p>
                  )}
                </div>

                {/* 5. CONFIRMAÇÃO DE LEITURA E LISTA DE QUEM FALTA LER */}
                {hasConfirmedRead ? (
                  <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-center space-y-1">
                    <div className="text-xs font-black text-emerald-300">
                      ✅ Você já marcou como lido!
                    </div>
                    {pendingReadPlayers.length > 0 ? (
                      <div className="text-[11px] text-amber-300 font-semibold">
                        ⏳ Falta ler: {pendingReadPlayers.map((p) => p.name).join(', ')}
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-300 font-semibold">
                        🎉 Todos leram! Olhe para o Telão!
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    disabled={isSyncing}
                    onClick={onConfirmRead}
                    className={`w-full py-3.5 rounded-xl font-black text-xs active:scale-95 transition shadow-lg ${
                      gameState.stateHasResources
                        ? 'bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-950'
                        : 'bg-gradient-to-r from-amber-400 to-red-400 text-slate-950'
                    }`}
                  >
                    {gameState.pendingDecision.deferredMove
                      ? gameState.pendingDecision.deferredMove.steps > 0
                        ? `✅ JÁ LI • LIBERAR AVANÇO DE +${gameState.pendingDecision.deferredMove.steps} CASA(S)!`
                        : `✅ JÁ LI • LIBERAR RECUO DE ${Math.abs(gameState.pendingDecision.deferredMove.steps)} CASA(S)!`
                      : '✅ JÁ LI A MENSAGEM • CONTINUAR!'}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Suas Cartas Guardadas (Visão Privada no Celular - Toque para Ampliar) */}
        {(myPlayer.blueCardsList.length > 0 || (myPlayer.redCardsList && myPlayer.redCardsList.length > 0)) && (
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-black uppercase text-slate-400 block mb-2">
              🔒 Suas Cartas Confidenciais no Celular (Toque para ampliar)
            </span>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {myPlayer.blueCardsList.map((c, i) => (
                <div
                  key={`b-${i}`}
                  className="p-1.5 rounded-xl bg-slate-950 border border-sky-400/60 shrink-0 w-24 text-center"
                >
                  <img
                    src={c.image}
                    alt={c.title}
                    className="w-20 h-28 object-contain rounded-lg mx-auto"
                  />
                  <div className="text-[10px] font-black text-sky-300 truncate mt-1">
                    {c.title}
                  </div>
                </div>
              ))}
              {(myPlayer.redCardsList || []).map((c, i) => (
                <div
                  key={`r-${i}`}
                  className="p-1.5 rounded-xl bg-slate-950 border border-red-500/60 shrink-0 w-24 text-center"
                >
                  <img
                    src={c.image}
                    alt={c.title}
                    className="w-20 h-28 object-contain rounded-lg mx-auto"
                  />
                  <div className="text-[10px] font-black text-red-300 truncate mt-1">
                    {c.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 3. CENTRAL UNIFICADA DE REGRAS, CARTÕES DE SERVIÇO, CARTAS AZUIS E VERMELHAS
// (Com Expansão / Zoom em Tela Cheia ao Clicar em Qualquer Cartão ou Carta!)
// ============================================================================
export function RulesAndCardsModal({
  isOpen,
  initialTab = 'regras',
  onClose,
  onOpenSlides
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'regras');
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/88 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* CABEÇALHO E ABAS UNIFICADAS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 shrink-0">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-400" />
              <span>Regras & Cartas Oficiais ("Pago ou Não?")</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clique em qualquer cartão ou carta abaixo para expandir e ler em tamanho grande!
            </p>
          </div>
          <button
            onClick={onClose}
            className="self-end sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
          >
            <span>Fechar</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BARRA DE NAVEGAÇÃO POR ABAS */}
        <div className="flex flex-wrap gap-2 py-3 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('regras')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition ${
              activeTab === 'regras'
                ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-md'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>📖 Síntese das Regras</span>
          </button>

          <button
            onClick={() => setActiveTab('servicos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition ${
              activeTab === 'servicos'
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md'
                : 'bg-slate-950 hover:bg-slate-800 text-emerald-300 border-emerald-500/30'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>🏛️ Cartões de Serviço (4 Setores)</span>
          </button>

          <button
            onClick={() => setActiveTab('azuis')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition ${
              activeTab === 'azuis'
                ? 'bg-sky-400 text-slate-950 border-sky-200 shadow-md'
                : 'bg-slate-950 hover:bg-slate-800 text-sky-300 border-sky-500/30'
            }`}
          >
            <span>🟦 Cartas Azuis ({BLUE_CARDS.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('vermelhas')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition ${
              activeTab === 'vermelhas'
                ? 'bg-red-500 text-white border-red-300 shadow-md'
                : 'bg-slate-950 hover:bg-slate-800 text-red-300 border-red-500/30'
            }`}
          >
            <span>🟥 Cartas Vermelhas ({RED_CARDS.length})</span>
          </button>
        </div>

        {/* CONTEÚDO ROLÁVEL DA ABA SELECIONADA */}
        <div className="flex-1 overflow-y-auto pt-4 pr-1 space-y-4">
          {/* ABA 1: SÍNTESE DAS REGRAS */}
          {activeTab === 'regras' && (
            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30">
                  <strong className="text-amber-400 text-sm block mb-1.5">
                    1. A Escolha da Rodada (Pago ou Não?):
                  </strong>
                  Sua empresa fatura <strong>$1.000</strong> por período e o tributo devido é de{' '}
                  <strong>$300</strong>. Se decidir <strong>PAGAR</strong>, você recebe{' '}
                  <strong>$700</strong> líquidos e <strong>1 Carta Azul</strong>. Se decidir{' '}
                  <strong>SONEGAR</strong>, fica com <strong>$1.000</strong> e recebe{' '}
                  <strong>1 Carta Vermelha</strong> de efeito imediato.
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30">
                  <strong className="text-emerald-400 text-sm block mb-1.5">
                    2. O Destino do Estado (Maioria da Mesa):
                  </strong>
                  Se a <strong>maioria pagar</strong>, o Estado tem{' '}
                  <strong>Investimentos Suficientes</strong> (as casas de Educação, Saúde, Transporte e Segurança dão bônus e avanços). Se a{' '}
                  <strong>maioria sonegar ou empatar</strong>, o Estado fica com{' '}
                  <strong>Investimentos Insuficientes</strong> (gerando despesas extras, recuos e perdas de rodada).
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-red-500/30">
                  <strong className="text-red-400 text-sm block mb-1.5">
                    3. Malha Fina, Denúncia e Denúncia Espontânea:
                  </strong>
                  Na carta <strong>Malha Fina!</strong> ou quando denunciado na casa preta de{' '}
                  <strong>DENÚNCIA!</strong>, o sonegador paga{' '}
                  <strong>$300 de tributo + $450 de multa de ofício ($750 por período sonegado)</strong>. A partir da 2ª rodada, na sua vez e antes de lançar os dados, você pode fazer{' '}
                  <strong>Denúncia Espontânea</strong> quitando os{' '}
                  <strong>$300 de tributo + $100 de multa ($400 por período sonegado)</strong>!
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/30">
                  <strong className="text-sky-400 text-sm block mb-1.5">
                    4. Cartas Azuis (Restituição e Ação) e Vencedor:
                  </strong>
                  As Cartas Azuis de <strong>Restituição ($50, $100, $200 e $300)</strong> ficam guardadas até o final para somar ao saldo bancário. Já as Cartas Azuis de{' '}
                  <strong>Ação (!): Jogada Bônus!, Nova Chance! e Troca de Carta!</strong> podem ser usadas a partir da rodada seguinte, na sua vez antes de rolar o dado! Quem cruzar a casa{' '}
                  <strong>FINAL (#77)</strong> primeiro ganha <strong>+$1.000 de bônus</strong> e vence quem tiver o <strong>Maior Saldo Bancário Final</strong>!
                </div>
              </div>

              {/* Atalhos Rápidos para ver os Cartões e Cartas */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-white block">
                    🔍 Quer consultar os Cartões de Serviço ou o Baralho de Cartas?
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Navegue pelas abas acima ou clique nos atalhos ao lado para ver cada carta ampliada:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab('servicos')}
                    className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 font-black text-xs transition"
                  >
                    🏛️ Ver Cartões de Serviço →
                  </button>
                  <button
                    onClick={() => setActiveTab('azuis')}
                    className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-300 font-black text-xs transition"
                  >
                    🟦 Ver Cartas Azuis →
                  </button>
                  <button
                    onClick={() => setActiveTab('vermelhas')}
                    className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 text-red-300 font-black text-xs transition"
                  >
                    🟥 Ver Cartas Vermelhas →
                  </button>
                  {onOpenSlides && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenSlides();
                      }}
                      className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-black text-xs transition"
                    >
                      📽️ Rever Slides (1 a 15)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: CARTÕES DE SERVIÇO OFICIAIS (SUFICIENTES VS INSUFICIENTES) */}
          {activeTab === 'servicos' && (
            <div className="space-y-5">
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between gap-2">
                <span>
                  💡 <strong>Dica de leitura:</strong> Clique sobre qualquer cartão abaixo para abrir a imagem em <strong>Tela Cheia</strong>, ou consulte a tabela de regras logo abaixo de cada setor!
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Object.values(SERVICE_CARDS).map((sc) => (
                  <div
                    key={sc.name}
                    className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-lg"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="font-black text-base tracking-wide" style={{ color: sc.color }}>
                        🏛️ SETOR: {sc.name}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400">
                        Clique no cartão para ampliar 🔍
                      </span>
                    </div>

                    {/* Duas Imagens Clicáveis (Suficiente vs Insuficiente) */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCard({
                            image: sc.sufficientImage,
                            title: `${sc.name} — Recursos Suficientes`,
                            badge: '✅ ESTADO COM RECURSOS (Maioria Pagou)',
                            badgeClass: 'bg-emerald-500 text-slate-950',
                            eventsList: Object.entries(sc.events).map(([num, ev]) => ({
                              num,
                              text: ev.sufficient.text
                            }))
                          })
                        }
                        className="group relative rounded-xl overflow-hidden border-2 border-emerald-500/50 hover:border-emerald-400 bg-slate-900 transition text-left cursor-pointer"
                      >
                        <img
                          src={sc.sufficientImage}
                          alt={`${sc.name} Suficiente`}
                          className="w-full h-48 sm:h-56 object-contain bg-slate-950 group-hover:scale-105 transition-transform"
                        />
                        <div className="p-2 bg-emerald-950/90 border-t border-emerald-500/40 flex items-center justify-between">
                          <span className="text-[11px] font-black text-emerald-300">
                            ✅ Suficiente
                          </span>
                          <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ZoomIn className="w-3 h-3" /> Ampliar
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCard({
                            image: sc.insufficientImage,
                            title: `${sc.name} — Recursos Insuficientes`,
                            badge: '🚨 ESTADO SEM RECURSOS (Maioria Sonegou)',
                            badgeClass: 'bg-red-500 text-white',
                            eventsList: Object.entries(sc.events).map(([num, ev]) => ({
                              num,
                              text: ev.insufficient.text
                            }))
                          })
                        }
                        className="group relative rounded-xl overflow-hidden border-2 border-red-500/50 hover:border-red-400 bg-slate-900 transition text-left cursor-pointer"
                      >
                        <img
                          src={sc.insufficientImage}
                          alt={`${sc.name} Insuficiente`}
                          className="w-full h-48 sm:h-56 object-contain bg-slate-950 group-hover:scale-105 transition-transform"
                        />
                        <div className="p-2 bg-red-950/90 border-t border-red-500/40 flex items-center justify-between">
                          <span className="text-[11px] font-black text-red-300">
                            🚨 Insuficiente
                          </span>
                          <span className="text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ZoomIn className="w-3 h-3" /> Ampliar
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Lista Textual Legível das 10 Casas do Setor */}
                    <details className="group bg-slate-900/90 rounded-xl border border-slate-800 p-2.5">
                      <summary className="text-xs font-black text-sky-300 cursor-pointer flex items-center justify-between">
                        <span>📖 Ler texto das 10 casas de {sc.name} (1 a 10)</span>
                        <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">
                          ▼
                        </span>
                      </summary>
                      <div className="mt-2.5 space-y-1.5 max-h-60 overflow-y-auto pr-1 text-[11px]">
                        {Object.entries(sc.events).map(([num, ev]) => (
                          <div
                            key={num}
                            className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1"
                          >
                            <div className="text-emerald-300 font-semibold">
                              ✅ {ev.sufficient.text}
                            </div>
                            <div className="text-red-300 font-semibold">
                              🚨 {ev.insufficient.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3: CARTAS AZUIS (RESTITUIÇÃO E AÇÃO) */}
          {activeTab === 'azuis' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/40 text-xs text-sky-200">
                <strong>🟦 Quando você recebe uma Carta Azul?</strong> Sempre que decide{' '}
                <strong>PAGAR</strong> o imposto na rodada ($300). As cartas com símbolo{' '}
                <strong>($)</strong> ficam guardadas até o final da partida para restituir parte dos impostos pagos. Já as cartas com símbolo{' '}
                <strong>(!)</strong> são <strong>Cartas de Ação</strong> e podem ser usadas a partir da rodada seguinte, na sua vez antes de jogar o dado!
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {BLUE_CARDS.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() =>
                      setExpandedCard({
                        image: card.image,
                        title: card.title,
                        badge: card.isActionCard
                          ? '⚡ CARTA AZUL DE AÇÃO (!)'
                          : `💰 RESTITUIÇÃO AO FIM DO JOGO (+$${card.restitutionValue})`,
                        badgeClass: card.isActionCard
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-sky-400 text-slate-950',
                        description: card.description
                      })
                    }
                    className="group bg-slate-950 hover:bg-slate-900 border-2 border-sky-500/40 hover:border-sky-400 rounded-2xl p-3 flex flex-col items-center text-center transition shadow-lg cursor-pointer"
                  >
                    <div className="relative w-full h-48 flex items-center justify-center bg-slate-900/70 rounded-xl p-2 overflow-hidden">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-sky-500 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow">
                        <ZoomIn className="w-3 h-3" /> Ampliar
                      </span>
                    </div>
                    <span
                      className={`mt-2.5 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        card.isActionCard
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      }`}
                    >
                      {card.isActionCard ? '⚡ Carta de Ação (!)' : `💰 Restituição +$${card.restitutionValue}`}
                    </span>
                    <h4 className="font-black text-sm text-white mt-1.5">{card.title}</h4>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                      {card.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ABA 4: CARTAS VERMELHAS (CONSEQUÊNCIA DE SONEGAÇÃO) */}
          {activeTab === 'vermelhas' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs text-red-200">
                <strong>🟥 Quando você recebe uma Carta Vermelha?</strong> Sempre que decide{' '}
                <strong>SONEGAR</strong> o imposto na rodada. Além de acumular 1 imposto devido na ficha fiscal (sujeito a Malha Fina ou Denúncia), a carta vermelha sorteada tem{' '}
                <strong>efeito imediato</strong>!
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {RED_CARDS.map((card, idx) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() =>
                      setExpandedCard({
                        image: card.image,
                        title: `Carta #${idx + 1} — ${card.title}`,
                        badge: '🟥 CARTA VERMELHA (SONEGAÇÃO)',
                        badgeClass: 'bg-red-500 text-white',
                        description: card.description
                      })
                    }
                    className="group bg-slate-950 hover:bg-slate-900 border-2 border-red-500/40 hover:border-red-400 rounded-2xl p-3 flex flex-col items-center text-center transition shadow-lg cursor-pointer"
                  >
                    <div className="relative w-full h-48 flex items-center justify-center bg-slate-900/70 rounded-xl p-2 overflow-hidden">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center gap-1 shadow">
                        <ZoomIn className="w-3 h-3" /> Ampliar
                      </span>
                    </div>
                    <span className="mt-2.5 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                      Carta Vermelha #{idx + 1}
                    </span>
                    <h4 className="font-black text-sm text-white mt-1.5">{card.title}</h4>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                      {card.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LIGHTBOX DE ZOOM EM TELA CHEIA (QUANDO CLICA EM QUALQUER CARTA/CARTÃO) */}
      {/* ===================================================================== */}
      {expandedCard && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-4"
          onClick={() => setExpandedCard(null)}
        >
          <div
            className="bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl max-h-[94vh] overflow-y-auto flex flex-col md:flex-row items-center gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Imagem Ampliada em Alta Resolução */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <img
                src={expandedCard.image}
                alt={expandedCard.title}
                className="max-h-[72vh] w-auto object-contain rounded-xl shadow-2xl"
              />
            </div>

            {/* Detalhes e Transcrição em Fonte Grande para Leitura Fácil */}
            <div className="w-full md:w-1/2 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-black uppercase px-3 py-1 rounded-full ${expandedCard.badgeClass}`}
                  >
                    {expandedCard.badge}
                  </span>
                  <button
                    onClick={() => setExpandedCard(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-white flex items-center gap-1"
                  >
                    <span>Fechar</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {expandedCard.title}
                </h3>

                {expandedCard.description && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm sm:text-base font-bold text-slate-100 leading-relaxed">
                    {expandedCard.description}
                  </div>
                )}

                {expandedCard.eventsList && (
                  <div className="space-y-1.5 max-h-[52vh] overflow-y-auto pr-1">
                    <span className="text-xs font-black uppercase text-amber-300 block mb-1">
                      📋 Texto Integrado do Cartão (Casas 1 a 10):
                    </span>
                    {expandedCard.eventsList.map((item) => (
                      <div
                        key={item.num}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-bold text-slate-100"
                      >
                        {item.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setExpandedCard(null)}
                className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-lg transition cursor-pointer"
              >
                ← VOLTAR ÀS CARTAS E REGRAS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
