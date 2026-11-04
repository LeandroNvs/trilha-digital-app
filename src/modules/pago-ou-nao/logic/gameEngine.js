import {
  BOARD_TILES,
  SERVICE_CARDS,
  BLUE_CARDS,
  RED_CARDS,
  CONSTANTS,
  PLAYER_COLORS
} from '../data/boardData.js';

export function getTileById(tileId) {
  return BOARD_TILES.find((t) => t.id === tileId) || BOARD_TILES[0];
}

export function createInitialGameState(roomCode = 'LOCAL', mode = 'local') {
  return {
    roomCode,
    mode,
    status: 'lobby', // 'lobby' | 'playing' | 'finished'
    phase: 'tax_vote', // 'tax_vote' | 'board_turns'
    turnIndex: 0,
    roundNumber: 1,
    stateHasResources: true,
    roundVotes: {},
    publicTreasury: 0,
    players: [],
    lastDice: null,
    diceRollId: 0,
    moveCounter: 0,
    pendingDecision: null,
    logs: [
      {
        id: 'init-1',
        type: 'info',
        text: 'Bem-vindo ao "Pago ou Não?" 3D Oficial da Receita Federal! Iniciando na Praia rumo ao Final.'
      }
    ],
    winner: null
  };
}

export function createPlayer({ id, name, isBot = false, colorIndex = 0 }) {
  const colorObj = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  return {
    id,
    name,
    isBot,
    color: colorObj.hex,
    colorName: colorObj.name,
    position: 0,
    pathHistory: [0], // Histórico de casas visitadas (para recuar pelo mesmo caminho sem saltos!)
    stepQueue: [], // Lista exata de casas que o peão 3D deve pisar na animação atual!
    lastMoveId: 0, // Identificador único de movimento para evitar re-animação em turnos alheios
    money: CONSTANTS.INITIAL_MONEY,
    redCards: 0,
    redCardsList: [],
    blueCardsList: [],
    lastDrawnCard: null,
    sabotageAlerts: [], // Alertas privados de sabotagem sofrida nesta rodada (sem revelar quem foi o sabotador!)
    bonusRollPending: 0, // Jogadas extras ativadas pela Carta Azul "Jogada Bônus!"
    skipTurns: 0,
    forbidSpontaneous: false,
    forbidNextBlueCard: false,
    totalRevenue: CONSTANTS.INITIAL_MONEY,
    taxesPaidCount: 0,
    taxesPaidAmount: 0,
    taxesEvadedCount: 0,
    taxesEvadedAmount: 0,
    harmedTilesCount: 0,
    harmedIncomeAmount: 0,
    fiscalActionPaidAmount: 0
  };
}

function addLog(logs, text, type = 'info') {
  const newLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    text
  };
  return [newLog, ...logs].slice(0, 45);
}

// ============================================================================
// FUNÇÃO DE CAMINHADA SOBRE O GRAFO (Avança ou Recua sem saltos e detecta Bifurcações!)
// ============================================================================
export function walkGraphForward(player, stepsCount, chosenFirstBranchTileId = null) {
  let curr = player.position;
  let history = [...(player.pathHistory || [curr])];
  let stepQueue = [];
  let remaining = stepsCount;

  while (remaining > 0) {
    const tile = getTileById(curr);
    if (!tile.next || tile.next.length === 0) {
      break; // Chegou no FINAL (#77)
    }

    if (tile.next.length > 1) {
      // Está em uma Bifurcação (#13 ou #35)!
      if (chosenFirstBranchTileId !== null && tile.next.includes(chosenFirstBranchTileId)) {
        curr = chosenFirstBranchTileId;
        chosenFirstBranchTileId = null; // Já consumiu a escolha desta bifurcação
        stepQueue.push(curr);
        history.push(curr);
        remaining--;
      } else {
        // Pausa exatamente na bifurcação para o jogador escolher qual caminho seguir!
        return {
          pausedAtFork: true,
          forkTile: tile,
          remainingSteps: remaining,
          newPosition: curr,
          newHistory: history,
          stepQueue
        };
      }
    } else {
      curr = tile.next[0];
      stepQueue.push(curr);
      history.push(curr);
      remaining--;
    }
  }

  return {
    pausedAtFork: false,
    remainingSteps: 0,
    newPosition: curr,
    newHistory: history,
    stepQueue
  };
}

export function walkGraphBackward(player, stepsBack) {
  let history = [...(player.pathHistory || [player.position])];
  let stepQueue = [];
  let count = Math.abs(stepsBack);

  while (count > 0 && history.length > 1) {
    history.pop();
    const prevTileId = history[history.length - 1];
    stepQueue.push(prevTileId);
    count--;
  }

  const newPos = history[history.length - 1] ?? 0;
  return {
    newPosition: newPos,
    newHistory: history,
    stepQueue
  };
}

// ============================================================================
// ETAPA 1 DA RODADA: VOTAÇÃO SECRETA "PAGO OU NÃO?"
// ============================================================================
export function submitRoundTaxVote(state, playerId, payTax) {
  if (state.status !== 'playing' || state.phase !== 'tax_vote') return state;

  const roundVotes = { ...state.roundVotes, [playerId]: payTax };

  for (const p of state.players) {
    if (p.isBot && roundVotes[p.id] === undefined) {
      const botPays =
        p.name.includes('Arriscado') || p.name.includes('Sonegador')
          ? Math.random() < 0.35
          : Math.random() < 0.75;
      roundVotes[p.id] = botPays;
    }
  }

  const allVoted = state.players.every((p) => roundVotes[p.id] !== undefined);
  if (!allVoted) {
    return {
      ...state,
      roundVotes
    };
  }

  let payersCount = 0;
  let evadersCount = 0;
  for (const p of state.players) {
    if (roundVotes[p.id]) payersCount++;
    else evadersCount++;
  }

  const stateHasResources = payersCount > evadersCount;
  let logs = [...state.logs];
  let publicTreasury = state.publicTreasury;
  const drawnCardsSummary = [];

  let players = state.players.map((p) => {
    const paid = roundVotes[p.id];
    let updated = {
      ...p,
      forbidSpontaneous: false,
      stepQueue: [],
      sabotageAlerts: []
    };

    if (paid) {
      updated.money += CONSTANTS.NET_WHEN_PAYING;
      updated.totalRevenue += CONSTANTS.ROUND_REVENUE;
      updated.taxesPaidCount += 1;
      updated.taxesPaidAmount += CONSTANTS.TAX_AMOUNT;
      publicTreasury += CONSTANTS.TAX_AMOUNT;

      if (updated.forbidNextBlueCard) {
        updated.forbidNextBlueCard = false;
        updated.lastDrawnCard = {
          roundNumber: state.roundNumber,
          paid: true,
          card: null,
          effectResult:
            'Cumpriu a penalidade da Carta Negada anterior: pagou o imposto em dia (+$700), mas não pôde retirar Carta Azul nesta rodada.',
          pendingAction: null
        };
        drawnCardsSummary.push({
          playerId: p.id,
          playerName: p.name,
          paid: true,
          card: null
        });
      } else {
        const rawBlueCard = BLUE_CARDS[Math.floor(Math.random() * BLUE_CARDS.length)];
        const blueCard = {
          ...rawBlueCard,
          acquiredRound: state.roundNumber,
          instanceId: `${state.roundNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        };
        updated.blueCardsList = [...updated.blueCardsList, blueCard];
        updated.lastDrawnCard = {
          roundNumber: state.roundNumber,
          paid: true,
          card: blueCard,
          effectResult: blueCard.isActionCard
            ? 'Carta de Ação (!): Guardada na sua carteira! Poderá ser usada a partir da próxima rodada na sua vez!'
            : 'Carta de Restituição ($): Guardada na sua mão até o Balanço Final!',
          pendingAction: null
        };
        drawnCardsSummary.push({
          playerId: p.id,
          playerName: p.name,
          paid: true,
          card: blueCard
        });
      }
    } else {
      updated.money += CONSTANTS.NET_WHEN_EVADING;
      updated.totalRevenue += CONSTANTS.ROUND_REVENUE;
      updated.taxesEvadedCount += 1;
      updated.taxesEvadedAmount += CONSTANTS.TAX_AMOUNT;
      updated.redCards += 1;

      const redCard = RED_CARDS[Math.floor(Math.random() * RED_CARDS.length)];
      updated.redCardsList = [...(updated.redCardsList || []), redCard];
      updated.lastDrawnCard = {
        roundNumber: state.roundNumber,
        paid: false,
        card: redCard,
        effectResult: '',
        pendingAction: null
      };
      drawnCardsSummary.push({
        playerId: p.id,
        playerName: p.name,
        paid: false,
        card: redCard
      });
    }
    return updated;
  });

  // Aplica efeitos imediatos ou prepara escolhas interativas das Cartas Vermelhas!
  // Os movimentos de peão (Má Sorte, Passou a Perna, Troca) ficam em `pendingBoardMoves`
  // para acontecerem visivelmente no Telão APÓS todos clicarem em "Já vi minha carta"!
  let moveCounter = state.moveCounter || 0;
  let pendingBoardMoves = [];
  let publicAnnouncements = [];

  for (const item of drawnCardsSummary) {
    if (!item.paid && item.card) {
      const idx = players.findIndex((pl) => pl.id === item.playerId);
      if (idx === -1) continue;
      let pl = { ...players[idx] };
      const c = item.card;
      let pendingAction = null;

      if (c.effect === 'malha_fina') {
        const count = pl.redCards;
        const penalty = count * CONSTANTS.MALHA_FINA_TOTAL;
        pl.money -= penalty;
        pl.redCards = 0;
        pl.redCardsList = [];
        pl.fiscalActionPaidAmount += penalty;
        publicTreasury += penalty;
        item.effectResult = `Caiu na MALHA FINA! Pagou -$${penalty} (${count}x $750)!`;
        item.isPublicEvent = true;
        const msg = `🦁 [Malha Fina] ${pl.name} caiu na fiscalização da Receita Federal e pagou -$${penalty}!`;
        publicAnnouncements.push(msg);
        logs = addLog(logs, msg, 'bad');
      } else if (c.effect === 'investigado') {
        pl.skipTurns += 1;
        pl.forbidSpontaneous = true;
        item.effectResult = `INVESTIGADO! Ficará parado nesta rodada e não poderá usar denúncia espontânea.`;
      } else if (c.effect === 'carta_negada') {
        if (pl.blueCardsList.length > 0) {
          if (pl.isBot) {
            const removed = pl.blueCardsList[pl.blueCardsList.length - 1];
            pl.blueCardsList = pl.blueCardsList.slice(0, -1);
            item.effectResult = `Descartou a Carta Azul "${removed?.title || 'Azul'}" da mão.`;
          } else {
            pendingAction = {
              type: 'discard_own_blue',
              completed: false
            };
            item.effectResult = `Escolha abaixo qual Carta Azul da sua mão você deseja descartar!`;
          }
        } else {
          pl.forbidNextBlueCard = true;
          item.effectResult = `Como não possui Carta Azul agora, ficará sem receber Carta Azul na próxima vez que pagar imposto!`;
        }
      } else if (c.effect === 'ma_sorte') {
        if (pl.position > 0) {
          pendingBoardMoves.push({
            type: 'back_3',
            targetId: pl.id,
            isSabotage: false
          });
          item.effectResult = `MÁ SORTE! Seu peão voltará 3 casas no tabuleiro assim que todos fecharem suas cartas!`;
          item.isPublicEvent = true;
          const msg = `⚡ [Má Sorte] O peão de ${pl.name} voltará 3 casas no tabuleiro!`;
          publicAnnouncements.push(msg);
        } else {
          item.effectResult = `MÁ SORTE! Como já estava no Início (Casa #0), permaneceu na Casa #0.`;
        }
      } else if (c.effect === 'trapaceiro') {
        const eligibleTargets = players.filter(
          (other, oIdx) => oIdx !== idx && other.blueCardsList.length > 0
        );
        if (eligibleTargets.length > 0) {
          if (pl.isBot) {
            const target = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
            const tIdx = players.findIndex((p) => p.id === target.id);
            const victim = { ...players[tIdx] };
            const randCardIdx = Math.floor(Math.random() * victim.blueCardsList.length);
            const removedCard = victim.blueCardsList[randCardIdx];
            victim.blueCardsList = victim.blueCardsList.filter((_, i) => i !== randCardIdx);
            victim.sabotageAlerts = [
              ...(victim.sabotageAlerts || []),
              `🕵️ VOCÊ FOI SABOTADO! Um sabotador anônimo usou a carta "TRAPACEIRO!" e descartou 1 Carta Azul (${removedCard?.title || 'Carta Azul'}) da sua mão!`
            ];
            players[tIdx] = victim;
            item.effectResult = `Sabotagem concluída! Você tirou 1 Carta Azul de ${victim.name}.`;
            const anonMsg = `🕵️ Um sabotador descartou uma Carta Azul do jogador '${victim.name}'!`;
            publicAnnouncements.push(anonMsg);
            logs = addLog(logs, anonMsg, 'warn');
          } else {
            pendingAction = {
              type: 'sabotage_discard_blue',
              completed: false
            };
            item.effectResult = `Escolha abaixo de qual jogador adversário você vai descartar 1 Carta Azul!`;
          }
        } else {
          item.effectResult = `Nenhum adversário possui Carta Azul na mão neste momento.`;
        }
      } else if (c.effect === 'passou_perna') {
        const eligibleTargets = players.filter((other, oIdx) => oIdx !== idx && other.position > 0);
        const fallbackTargets = players.filter((other, oIdx) => oIdx !== idx);
        const pool = eligibleTargets.length > 0 ? eligibleTargets : fallbackTargets;

        if (pool.length > 0) {
          if (pl.isBot) {
            const target = [...pool].sort((a, b) => b.pathHistory.length - a.pathHistory.length)[0];
            const tIdx = players.findIndex((p) => p.id === target.id);
            const victim = { ...players[tIdx] };
            victim.sabotageAlerts = [
              ...(victim.sabotageAlerts || []),
              `🕵️ VOCÊ FOI SABOTADO! Um sabotador anônimo usou a carta "PASSOU A PERNA!" e mandou seu peão voltar 3 casas no tabuleiro!`
            ];
            players[tIdx] = victim;
            pendingBoardMoves.push({
              type: 'back_3',
              targetId: victim.id,
              isSabotage: true
            });
            item.effectResult = `Sabotagem preparada! ${victim.name} voltará 3 casas assim que as cartas forem fechadas!`;
            const anonMsg = `🕵️ Um sabotador mandou o jogador '${victim.name}' voltar 3 casas no tabuleiro!`;
            publicAnnouncements.push(anonMsg);
          } else {
            pendingAction = {
              type: 'sabotage_back_3',
              completed: false
            };
            item.effectResult = `Escolha abaixo qual jogador adversário deverá voltar 3 casas no tabuleiro!`;
          }
        } else {
          item.effectResult = `Nenhum concorrente disponível para recuar.`;
        }
      } else if (c.effect === 'troca') {
        const opponents = players.filter((other, oIdx) => oIdx !== idx);
        if (opponents.length > 0) {
          if (pl.isBot) {
            const ahead = [...opponents].sort(
              (a, b) => b.pathHistory.length - a.pathHistory.length
            )[0];
            if (ahead && ahead.pathHistory.length > pl.pathHistory.length) {
              const tIdx = players.findIndex((p) => p.id === ahead.id);
              const victim = { ...players[tIdx] };
              victim.sabotageAlerts = [
                ...(victim.sabotageAlerts || []),
                `🕵️ VOCÊ FOI SABOTADO! Um sabotador anônimo usou a carta "TROCA!" e trocou de lugar com o seu peão no tabuleiro!`
              ];
              players[tIdx] = victim;
              pendingBoardMoves.push({
                type: 'swap',
                actorId: pl.id,
                targetId: victim.id,
                isSabotage: true
              });
              item.effectResult = `Sabotagem preparada! Você trocará de lugar com ${victim.name} assim que as cartas forem fechadas!`;
              const anonMsg = `🕵️ Um sabotador trocou de lugar no tabuleiro com o jogador '${victim.name}'!`;
              publicAnnouncements.push(anonMsg);
            } else {
              item.effectResult = `Já está na liderança e optou por manter a posição.`;
            }
          } else {
            pendingAction = {
              type: 'sabotage_swap',
              completed: false
            };
            item.effectResult = `Escolha abaixo com qual jogador você deseja trocar de lugar no tabuleiro!`;
          }
        } else {
          item.effectResult = `Nenhum adversário disponível para troca.`;
        }
      }

      if (pl.lastDrawnCard) {
        pl.lastDrawnCard = {
          ...pl.lastDrawnCard,
          effectResult: item.effectResult,
          pendingAction
        };
      }
      players[idx] = pl;
    }
  }

  logs = addLog(
    logs,
    stateHasResources
      ? `🏛️ RODADA ${state.roundNumber}: A maioria PAGOU (${payersCount} a ${evadersCount})! O Estado TEM RECURSOS SUFICIENTES!`
      : `⚠️ RODADA ${state.roundNumber}: Sonegação/Empate (${payersCount} pagaram vs ${evadersCount} sonegaram)! O Estado está SEM RECURSOS!`,
    stateHasResources ? 'good' : 'bad'
  );

  return {
    ...state,
    phase: 'board_turns',
    turnIndex: 0,
    stateHasResources,
    roundVotes: {},
    publicTreasury,
    moveCounter,
    players,
    telaoAnnouncementBanner: null,
    logs,
    pendingDecision: {
      type: 'round_reveal',
      roundNumber: state.roundNumber,
      payersCount,
      evadersCount,
      stateHasResources,
      drawnCardsSummary,
      pendingBoardMoves,
      publicAnnouncements,
      readyPlayerIds: []
    }
  };
}

// Aplica a escolha interativa das Cartas Vermelhas #3 (Carta Negada), #5 (Trapaceiro), #6 (Passou a Perna) e #7 (Troca)
export function applyRedCardInteractiveChoice(state, playerId, choicePayload) {
  if (state.pendingDecision?.type !== 'round_reveal') return state;

  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return state;

  let players = [...state.players];
  let actor = { ...players[idx] };
  const pendingAction = actor.lastDrawnCard?.pendingAction;
  if (!pendingAction || pendingAction.completed) return state;

  let logs = [...state.logs];
  let pendingBoardMoves = [...(state.pendingDecision.pendingBoardMoves || [])];
  let publicAnnouncements = [...(state.pendingDecision.publicAnnouncements || [])];
  let newEffectResult = actor.lastDrawnCard.effectResult;

  if (pendingAction.type === 'discard_own_blue') {
    const cardIndex =
      typeof choicePayload === 'number' ? choicePayload : Number(choicePayload) || 0;
    const removedCard = actor.blueCardsList[cardIndex] || actor.blueCardsList[0];
    actor.blueCardsList = actor.blueCardsList.filter((_, i) => i !== cardIndex);
    newEffectResult = `Você descartou a Carta Azul "${removedCard?.title || 'Carta Azul'}" da sua mão.`;
  } else if (pendingAction.type === 'sabotage_discard_blue') {
    const targetId = choicePayload;
    const tIdx = players.findIndex((p) => p.id === targetId && p.id !== actor.id);
    if (tIdx === -1) return state;
    let victim = { ...players[tIdx] };
    if (victim.blueCardsList.length > 0) {
      const randIdx = Math.floor(Math.random() * victim.blueCardsList.length);
      const removedCard = victim.blueCardsList[randIdx];
      victim.blueCardsList = victim.blueCardsList.filter((_, i) => i !== randIdx);
      victim.sabotageAlerts = [
        ...(victim.sabotageAlerts || []),
        `🕵️ VOCÊ FOI SABOTADO! Um sabotador anônimo tirou 1 Carta Azul (${removedCard?.title || 'Carta Azul'}) da sua mão!`
      ];
      players[tIdx] = victim;
      newEffectResult = `Sabotagem concluída! Você descartou 1 Carta Azul de ${victim.name} (em segredo).`;
      const anonMsg = `🕵️ Um sabotador descartou uma Carta Azul do jogador '${victim.name}'!`;
      publicAnnouncements.push(anonMsg);
      logs = addLog(logs, anonMsg, 'warn');
    } else {
      newEffectResult = `${victim.name} não tinha Carta Azul para descartar.`;
    }
  } else if (pendingAction.type === 'sabotage_back_3') {
    const targetId = choicePayload;
    const tIdx = players.findIndex((p) => p.id === targetId && p.id !== actor.id);
    if (tIdx === -1) return state;
    let victim = { ...players[tIdx] };
    victim.sabotageAlerts = [
      ...(victim.sabotageAlerts || []),
      `🕵️ VOCÊ FOI SABOTADO! Um sabotador anônimo mandou o seu peão voltar 3 casas no tabuleiro!`
    ];
    players[tIdx] = victim;
    pendingBoardMoves.push({
      type: 'back_3',
      targetId: victim.id,
      isSabotage: true
    });
    newEffectResult = `Sabotagem confirmada! O peão de ${victim.name} voltará 3 casas no tabuleiro assim que todos clicarem em "Já vi minha carta"!`;
    const anonMsg = `🕵️ Um sabotador mandou o jogador '${victim.name}' voltar 3 casas no tabuleiro!`;
    publicAnnouncements.push(anonMsg);
  } else if (pendingAction.type === 'sabotage_swap') {
    if (choicePayload === 'SKIP_SWAP') {
      newEffectResult = `Você optou por manter sua posição atual no tabuleiro.`;
    } else {
      const targetId = choicePayload;
      const tIdx = players.findIndex((p) => p.id === targetId && p.id !== actor.id);
      if (tIdx === -1) return state;
      let victim = { ...players[tIdx] };
      victim.sabotageAlerts = [
        ...(victim.sabotageAlerts || []),
        `🕵️ VOCÊ FOI SABOTADO! Um sabotador anônimo trocou de lugar com o seu peão no tabuleiro!`
      ];
      players[tIdx] = victim;
      pendingBoardMoves.push({
        type: 'swap',
        actorId: actor.id,
        targetId: victim.id,
        isSabotage: true
      });
      newEffectResult = `Sabotagem confirmada! Seu peão trocará de lugar com ${victim.name} assim que todos clicarem em "Já vi minha carta"!`;
      const anonMsg = `🕵️ Um sabotador trocou de lugar com o jogador '${victim.name}'!`;
      publicAnnouncements.push(anonMsg);
    }
  }

  actor.lastDrawnCard = {
    ...actor.lastDrawnCard,
    effectResult: newEffectResult,
    pendingAction: {
      ...pendingAction,
      completed: true,
      choice: choicePayload
    }
  };
  players[idx] = actor;

  const drawnCardsSummary = (state.pendingDecision.drawnCardsSummary || []).map((item) =>
    item.playerId === actor.id ? { ...item, effectResult: newEffectResult } : item
  );

  return {
    ...state,
    players,
    logs,
    pendingDecision: {
      ...state.pendingDecision,
      drawnCardsSummary,
      pendingBoardMoves,
      publicAnnouncements
    }
  };
}

// Quando todos clicam em "Já vi minha carta", fecha o modal e EXECUTA os movimentos dos peões ao vivo no Telão!
export function closeRoundReveal(state) {
  let players = state.players.map((p) => ({ ...p, stepQueue: [] }));
  let moveCounter = state.moveCounter || 0;
  let logs = [...state.logs];
  const pendingMoves = state.pendingDecision?.pendingBoardMoves || [];
  const publicAnnouncements = [...(state.pendingDecision?.publicAnnouncements || [])];
  const executedHeadlines = [];

  for (const move of pendingMoves) {
    if (move.type === 'back_3') {
      const tIdx = players.findIndex((p) => p.id === move.targetId);
      if (tIdx !== -1) {
        let target = { ...players[tIdx] };
        if (target.position > 0) {
          const prevPos = target.position;
          const backRes = walkGraphBackward(target, 3);
          target.position = backRes.newPosition;
          target.pathHistory = backRes.newHistory;
          target.stepQueue = [...(target.stepQueue || []), ...backRes.stepQueue];
          moveCounter += 1;
          target.lastMoveId = moveCounter;
          players[tIdx] = target;

          const logMsg = move.isSabotage
            ? `🕵️ SABOTAGEM NO TABULEIRO! Um sabotador mandou o jogador '${target.name}' voltar 3 casas (da Casa #${prevPos} para a Casa #${target.position})!`
            : `⚡ [Má Sorte] ${target.name} voltou 3 casas no tabuleiro (da Casa #${prevPos} para a Casa #${target.position})!`;
          executedHeadlines.push(logMsg);
          logs = addLog(logs, logMsg, 'warn');
        }
      }
    } else if (move.type === 'swap') {
      const aIdx = players.findIndex((p) => p.id === move.actorId);
      const tIdx = players.findIndex((p) => p.id === move.targetId);
      if (aIdx !== -1 && tIdx !== -1 && aIdx !== tIdx) {
        let actor = { ...players[aIdx] };
        let victim = { ...players[tIdx] };
        const actorOldPos = actor.position;
        const actorOldHist = actor.pathHistory;
        const victimOldPos = victim.position;
        const victimOldHist = victim.pathHistory;

        actor.position = victimOldPos;
        actor.pathHistory = victimOldHist;
        actor.stepQueue = [actor.position];
        moveCounter += 1;
        actor.lastMoveId = moveCounter;

        victim.position = actorOldPos;
        victim.pathHistory = actorOldHist;
        victim.stepQueue = [victim.position];
        moveCounter += 1;
        victim.lastMoveId = moveCounter;

        players[aIdx] = actor;
        players[tIdx] = victim;

        // Mantém o anonimato no texto público do Telão!
        const logMsg = `🕵️ SABOTAGEM NO TABULEIRO! Um sabotador trocou de lugar com o jogador '${victim.name}' (foi para a Casa #${victim.position})!`;
        executedHeadlines.push(logMsg);
        logs = addLog(logs, logMsg, 'warn');
      }
    }
  }

  // Inclui também anúncios públicos que não eram de movimento de peão (ex: Trapaceiro ou Malha Fina)
  for (const ann of publicAnnouncements) {
    if (ann.includes('Carta Azul') || ann.includes('Malha Fina')) {
      executedHeadlines.push(ann);
    }
  }

  return {
    ...state,
    players,
    moveCounter,
    logs,
    telaoAnnouncementBanner:
      executedHeadlines.length > 0
        ? {
            id: Date.now(),
            roundNumber: state.roundNumber,
            messages: executedHeadlines
          }
        : null,
    pendingDecision: null
  };
}

export function performSpontaneousDenunciation(state, playerId) {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return state;

  const player = { ...state.players[idx] };
  if (player.redCards <= 0 || player.forbidSpontaneous) return state;

  const totalCost = player.redCards * CONSTANTS.SPONTANEOUS_TOTAL;
  const count = player.redCards;
  player.money -= totalCost;
  player.redCards = 0;
  player.redCardsList = [];
  player.fiscalActionPaidAmount += totalCost;

  const players = [...state.players];
  players[idx] = player;

  const headline = `🤝 DENÚNCIA ESPONTÂNEA: ${player.name} confessou e regularizou ${count} período(s) sonegado(s) pagando -$${totalCost} ($300 de tributo + $100 de multa por período)!`;
  const logs = addLog(state.logs, headline, 'good');

  return {
    ...state,
    players,
    publicTreasury: state.publicTreasury + totalCost,
    telaoAnnouncementBanner: {
      id: Date.now(),
      roundNumber: state.roundNumber,
      messages: [headline]
    },
    logs
  };
}

// ============================================================================
// USO DE CARTAS AZUIS DE AÇÃO (!) ANTES DE ROLAR O DADO (Slides 11 e 12)
// Regra Oficial: "Cartas de ação (!): podem ser usadas a partir da próxima rodada, quando o jogador quiser."
// - jogada_bonus: Jogue o dado novamente neste turno!
// - nova_chance: Troque suas outras Cartas Azuis por outras do baralho na mesma quantidade!
// - troca_carta: Troque uma outra Carta Azul sua com uma Carta Azul de um adversário!
// ============================================================================
export function useBlueActionCard(state, playerId, actionPayload) {
  if (state.status !== 'playing' || state.phase !== 'board_turns' || state.pendingDecision) {
    return state;
  }

  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return state;

  let players = state.players.map((p) => ({ ...p }));
  let player = {
    ...players[idx],
    blueCardsList: [...(players[idx].blueCardsList || [])]
  };

  const { actionCardIndex, myGiveCardIndex = null, targetPlayerId = null } = actionPayload || {};
  const actionCard = player.blueCardsList[actionCardIndex];
  if (!actionCard) return state;

  // Regra Oficial (Slides 11 e 12): só pode ser usada a partir da rodada seguinte à que foi adquirida!
  if ((actionCard.acquiredRound || 0) >= state.roundNumber) {
    return state;
  }

  let logs = [...state.logs];
  let bannerMsg = null;

  if (actionCard.type === 'jogada_bonus') {
    player.blueCardsList = player.blueCardsList.filter((_, i) => i !== actionCardIndex);
    player.bonusRollPending = (player.bonusRollPending || 0) + 1;
    players[idx] = player;

    bannerMsg = `🟦⚡ ${player.name} usou a Carta Azul "JOGADA BÔNUS!" e jogará o dado 2 vezes neste turno!`;
    logs = addLog(logs, bannerMsg, 'good');
  } else if (actionCard.type === 'nova_chance') {
    const otherCardsCount = player.blueCardsList.length - 1;
    if (otherCardsCount <= 0) {
      return state;
    }

    const newCards = [];
    for (let i = 0; i < otherCardsCount; i++) {
      const raw = BLUE_CARDS[Math.floor(Math.random() * BLUE_CARDS.length)];
      newCards.push({
        ...raw,
        acquiredRound: state.roundNumber,
        instanceId: `${state.roundNumber}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`
      });
    }

    player.blueCardsList = newCards;
    players[idx] = player;

    bannerMsg = `🟦🔄 ${player.name} usou a Carta Azul "NOVA CHANCE!" e trocou ${otherCardsCount} Carta(s) Azul(is) por novas cartas do baralho!`;
    logs = addLog(logs, bannerMsg, 'good');
  } else if (actionCard.type === 'troca_carta') {
    if (
      myGiveCardIndex === null ||
      myGiveCardIndex === undefined ||
      myGiveCardIndex === actionCardIndex
    ) {
      return state;
    }

    const giveCard = player.blueCardsList[myGiveCardIndex];
    const tIdx = players.findIndex((p) => p.id === targetPlayerId);
    if (!giveCard || tIdx === -1 || tIdx === idx) return state;

    let targetPlayer = {
      ...players[tIdx],
      blueCardsList: [...(players[tIdx].blueCardsList || [])]
    };
    if (targetPlayer.blueCardsList.length === 0) return state;

    const randOppIdx = Math.floor(Math.random() * targetPlayer.blueCardsList.length);
    const takenCard = targetPlayer.blueCardsList[randOppIdx];

    // Remove a carta "Troca de Carta!" e a carta cedida da mão do jogador atual, e adiciona a carta recebida do adversário
    player.blueCardsList = player.blueCardsList.filter(
      (_, i) => i !== actionCardIndex && i !== myGiveCardIndex
    );
    player.blueCardsList.push({ ...takenCard });

    // Substitui a carta sorteada do adversário pela carta cedida pelo jogador atual
    targetPlayer.blueCardsList = targetPlayer.blueCardsList.map((c, i) =>
      i === randOppIdx ? { ...giveCard } : c
    );
    targetPlayer.sabotageAlerts = [
      ...(targetPlayer.sabotageAlerts || []),
      `🟦🤝 TROCA DE CARTA AZUL! O jogador '${player.name}' usou a carta "TROCA DE CARTA!", levou sua carta "${takenCard.title}" e entregou "${giveCard.title}" para sua mão!`
    ];

    players[idx] = player;
    players[tIdx] = targetPlayer;

    bannerMsg = `🟦🤝 ${player.name} usou a Carta Azul "TROCA DE CARTA!" e trocou uma Carta Azul com '${targetPlayer.name}'!`;
    logs = addLog(logs, bannerMsg, 'info');
  } else {
    return state;
  }

  return {
    ...state,
    players,
    logs,
    telaoAnnouncementBanner: bannerMsg
      ? {
          id: Date.now(),
          roundNumber: state.roundNumber,
          messages: [bannerMsg]
        }
      : state.telaoAnnouncementBanner
  };
}

// ============================================================================
// ETAPA 2: ROLAGEM DO DADO 3D E MOVIMENTO COM SUPORTE A BIFURCAÇÕES!
// ============================================================================
export function performRollDice(state) {
  if (state.status !== 'playing' || state.phase !== 'board_turns' || state.pendingDecision) {
    return state;
  }

  const currentPlayer = state.players[state.turnIndex];
  if (!currentPlayer) return state;

  if (currentPlayer.skipTurns > 0) {
    const players = state.players.map((p, idx) =>
      idx === state.turnIndex
        ? { ...p, skipTurns: p.skipTurns - 1, stepQueue: [] }
        : { ...p, stepQueue: [] }
    );
    const logs = addLog(
      state.logs,
      `⏳ ${currentPlayer.name} cumpriu 1 rodada parado e aguarda confirmação para passar a vez.`,
      'warn'
    );

    return {
      ...state,
      players,
      logs,
      pendingDecision: {
        type: 'tile_summary',
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        playerColor: currentPlayer.color,
        tileId: currentPlayer.position,
        tileTitle: 'Cumprindo Rodada Parado',
        stateHasResources: state.stateHasResources,
        title: `⏳ ${currentPlayer.name} cumpriu 1 rodada parado`,
        subtitle: 'Penalidade de Espera',
        description: `${currentPlayer.name} ficou sem jogar nesta rodada devido a um contratempo anterior e poderá avançar na próxima rodada.`,
        accentColor: '#f59e0b',
        readyPlayerIds: []
      }
    };
  }

  const dice = Math.floor(Math.random() * 6) + 1;
  const walkResult = walkGraphForward(currentPlayer, dice, null);
  const nextMoveCounter = (state.moveCounter || 0) + 1;

  const player = {
    ...currentPlayer,
    position: walkResult.newPosition,
    pathHistory: walkResult.newHistory,
    stepQueue: walkResult.stepQueue,
    lastMoveId: nextMoveCounter
  };

  // Limpa stepQueue dos demais jogadores para que nunca repitam animações antigas!
  const players = state.players.map((p, idx) =>
    idx === state.turnIndex ? player : { ...p, stepQueue: [] }
  );

  // Se o peão alcançou uma BIFURCAÇÃO (#13 ou #35) e ainda tem passos para dar:
  if (walkResult.pausedAtFork) {
    const forkTile = walkResult.forkTile;
    const logs = addLog(
      state.logs,
      `🔀 ${player.name} rolou [${dice}] e chegou na BIFURCAÇÃO da Casa #${forkTile.id}! Falta(m) ${walkResult.remainingSteps} passo(s) — escolha o caminho!`,
      'move'
    );

    return {
      ...state,
      players,
      lastDice: dice,
      diceRollId: (state.diceRollId || 0) + 1,
      moveCounter: nextMoveCounter,
      logs,
      pendingDecision: {
        type: 'fork_choice',
        playerId: player.id,
        playerName: player.name,
        forkTileId: forkTile.id,
        remainingSteps: walkResult.remainingSteps,
        options: forkTile.next.map((nextId) => ({
          nextTileId: nextId,
          label: forkTile.branchLabels?.[nextId] || `Ir pela Casa #${nextId}`,
          tileTitle: getTileById(nextId).title,
          tileSubtitle: getTileById(nextId).subtitle
        }))
      }
    };
  }

  const landedTile = getTileById(player.position);
  const logs = addLog(
    state.logs,
    `🎲 ${player.name} rolou [${dice}] e avançou para a Casa #${landedTile.id}: "${landedTile.title}".`,
    'move'
  );

  const nextState = {
    ...state,
    players,
    lastDice: dice,
    diceRollId: (state.diceRollId || 0) + 1,
    moveCounter: nextMoveCounter,
    logs
  };

  if (landedTile.id === 77) {
    // NÃO encerra ainda: o dado precisa rolar e o peão caminhar até a chegada no Telão!
    return buildFinishArrivalState(nextState, player);
  }

  return resolveOfficialTile(nextState, player.id, landedTile);
}

// ============================================================================
// CHEGADA NA CASA FINAL (#77): exibe a mensagem de chegada APÓS a animação do peão.
// O jogo só é encerrado (finishGameOfficial) quando a mensagem for confirmada.
// ============================================================================
export function buildFinishArrivalState(state, player) {
  const finalTile = getTileById(77);
  const logs = addLog(
    state.logs,
    `🏁 ${player.name} cruzou a LINHA DE CHEGADA (Casa #77)! Bônus de +$${CONSTANTS.FINISH_LINE_BONUS}.`,
    'good'
  );
  return {
    ...state,
    logs,
    pendingDecision: {
      type: 'tile_summary',
      finishOnConfirm: true,
      finisherId: player.id,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      tileId: 77,
      tileTitle: finalTile?.title || 'FINAL',
      stateHasResources: state.stateHasResources,
      title: `🏁 ${player.name} chegou ao FINAL!`,
      subtitle: 'Linha de Chegada',
      description: `${player.name} foi o primeiro a cruzar a linha de chegada e recebe +$${CONSTANTS.FINISH_LINE_BONUS} de bônus!\nAo confirmar, o jogo será encerrado e o Balanço Final (com as Cartas Azuis de Restituição) será apurado.`,
      extraEffectNote: '🏆 Confirme para ver o resultado final da partida!',
      accentColor: '#f59e0b',
      readyPlayerIds: []
    }
  };
}

// Quando o jogador escolhe um dos 2 caminhos na Bifurcação (#13 ou #35):
export function applyForkChoice(state, playerId, chosenNextTileId) {
  if (state.pendingDecision?.type !== 'fork_choice') return state;

  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return state;

  const currentPlayer = state.players[idx];
  const remaining = state.pendingDecision.remainingSteps;

  const walkResult = walkGraphForward(currentPlayer, remaining, chosenNextTileId);
  const nextMoveCounter = (state.moveCounter || 0) + 1;

  const player = {
    ...currentPlayer,
    position: walkResult.newPosition,
    pathHistory: walkResult.newHistory,
    stepQueue: walkResult.stepQueue,
    lastMoveId: nextMoveCounter
  };

  const players = state.players.map((p, i) =>
    i === idx ? player : { ...p, stepQueue: [] }
  );

  const landedTile = getTileById(player.position);
  const logs = addLog(
    state.logs,
    `🧭 ${player.name} escolheu o caminho da Casa #${chosenNextTileId} e parou na Casa #${landedTile.id}: "${landedTile.title}".`,
    'move'
  );

  const nextState = {
    ...state,
    players,
    moveCounter: nextMoveCounter,
    logs,
    pendingDecision: null
  };

  if (landedTile.id === 77) {
    return buildFinishArrivalState(nextState, player);
  }

  return resolveOfficialTile(nextState, player.id, landedTile);
}

// ============================================================================
// RESOLUÇÃO DAS CASAS (Usa `walkGraphForward`/`walkGraphBackward` sem saltos!)
// Os movimentos extras ("avance x casas" / "volte n casas") ficam em `deferredMove`
// para animarem no tabuleiro 3D APÓS a leitura da mensagem!
// ============================================================================
export function resolveOfficialTile(state, playerId, tile) {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return state;

  let players = [...state.players];
  let player = { ...players[idx] };
  let logs = [...state.logs];
  let pendingDecision = null;
  let moveCounter = state.moveCounter || 0;

  if (tile.type === 'service') {
    const serviceCard = SERVICE_CARDS[tile.sector];
    const eventPair = serviceCard.events[tile.num];
    const isSufficient = state.stateHasResources;
    const outcome = isSufficient ? eventPair.sufficient : eventPair.insufficient;

    let deferredMove = null;
    let extraEffectNote = '';

    if (outcome.money) {
      player.money += outcome.money;
      if (!isSufficient && outcome.money < 0) {
        player.harmedTilesCount += 1;
        player.harmedIncomeAmount += Math.abs(outcome.money);
      } else if (isSufficient && outcome.money > 0) {
        player.totalRevenue += outcome.money;
      }
    }

    if (outcome.move) {
      if (outcome.move < 0 && !isSufficient) {
        player.harmedTilesCount += 1;
      }
      deferredMove = {
        playerId: player.id,
        steps: outcome.move
      };
      extraEffectNote =
        outcome.move > 0
          ? `⚡ Após confirmar a leitura, o peão avançará +${outcome.move} casa(s) no tabuleiro!`
          : `⚡ Após confirmar a leitura, o peão voltará ${Math.abs(outcome.move)} casa(s) no tabuleiro!`;
    }

    if (outcome.skipTurns) {
      player.skipTurns += outcome.skipTurns;
      if (!isSufficient) player.harmedTilesCount += 1;
    }

    if (outcome.skipAllPlayers) {
      players = players.map((p) => ({ ...p, skipTurns: p.skipTurns + 1 }));
      player = players[idx];
    }

    players[idx] = player;

    logs = addLog(
      logs,
      `${isSufficient ? '✅' : '⚠️'} [${serviceCard.name} ${tile.num}] ${player.name}: ${outcome.text}`,
      isSufficient ? 'good' : 'bad'
    );

    pendingDecision = {
      type: 'tile_summary',
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      tileId: tile.id,
      tileTitle: tile.title,
      sectorName: serviceCard.name,
      sectorNum: tile.num,
      sectorColor: serviceCard.color,
      isServiceTile: true,
      stateHasResources: isSufficient,
      title: `${player.name} — ${tile.title}`,
      subtitle: `${serviceCard.name} ${tile.num}`,
      description: outcome.text,
      extraEffectNote,
      deferredMove,
      rollAgain: !!outcome.rollAgain,
      accentColor: isSufficient ? '#10b981' : '#ef4444',
      readyPlayerIds: []
    };
  } else if (tile.type === 'denuncia') {
    logs = addLog(logs, `🕵️ ${player.name} parou na casa preta de DENÚNCIA!`, 'warn');
    pendingDecision = {
      type: 'denuncia_choice',
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      tileId: tile.id,
      title: '🕵️ CASA DE DENÚNCIA!',
      subtitle: 'Fiscalização perante a Receita Federal',
      description:
        'Escolha um concorrente suspeito de sonegar impostos para cair na Malha Fina ($750 por período sonegado)!'
    };
  } else if (tile.type === 'loteria') {
    const prize = [200, 300, 500, 750][Math.floor(Math.random() * 4)];
    player.money += prize;
    player.totalRevenue += prize;
    players[idx] = player;
    logs = addLog(logs, `🍀 LOTERIA! ${player.name} tentou a sorte e ganhou +$${prize}!`, 'good');

    pendingDecision = {
      type: 'tile_summary',
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      tileId: tile.id,
      tileTitle: tile.title,
      stateHasResources: state.stateHasResources,
      title: `${player.name} — ${tile.title}`,
      subtitle: `Prêmio Sorteado: +$${prize}`,
      description: `${player.name} tentou a sorte na Loteria e ganhou +$${prize}!`,
      accentColor: '#10b981',
      readyPlayerIds: []
    };
  } else if (tile.type === 'caridade') {
    if (player.money >= 300) {
      pendingDecision = {
        type: 'charity_choice',
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        tileId: tile.id,
        title: `🤝 FUNDOS DE CARIDADE (${player.name})`,
        subtitle: 'Doe $300 para rolar o dado novamente',
        description: 'Deseja doar $300 aos Fundos de Caridade para ganhar uma nova jogada de dado imediatamente?'
      };
    } else {
      pendingDecision = {
        type: 'tile_summary',
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        tileId: tile.id,
        tileTitle: tile.title,
        stateHasResources: state.stateHasResources,
        title: `${player.name} — ${tile.title}`,
        subtitle: 'Saldo insuficiente para doar',
        description: `${player.name} passou pelos Fundos de Caridade, mas não tinha $300 para doar.`,
        accentColor: '#94a3b8',
        readyPlayerIds: []
      };
    }
  } else {
    let deferredMove = null;
    let extraNote = '';
    if (tile.money) {
      player.money += tile.money;
      if (tile.money > 0) player.totalRevenue += tile.money;
    }
    if (tile.move) {
      deferredMove = {
        playerId: player.id,
        steps: tile.move
      };
      extraNote =
        tile.move > 0
          ? `⚡ Após confirmar a leitura, o peão avançará +${tile.move} casa(s) no tabuleiro!`
          : `⚡ Após confirmar a leitura, o peão voltará ${Math.abs(tile.move)} casa(s) no tabuleiro!`;
    }
    if (tile.skipTurns) {
      player.skipTurns += tile.skipTurns;
    }

    players[idx] = player;
    logs = addLog(logs, `📌 ${player.name}: ${tile.title} (${tile.subtitle})`, tile.money < 0 ? 'warn' : 'info');

    pendingDecision = {
      type: 'tile_summary',
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      tileId: tile.id,
      tileTitle: tile.title,
      stateHasResources: state.stateHasResources,
      title: `${player.name} — ${tile.title}`,
      subtitle: tile.subtitle,
      description: `${tile.title} — ${tile.subtitle}.`,
      extraEffectNote: extraNote,
      deferredMove,
      rollAgain: !!tile.rollAgain,
      accentColor: tile.money > 0 ? '#10b981' : tile.money < 0 ? '#ef4444' : '#38bdf8',
      readyPlayerIds: []
    };
  }

  // Se o jogador ativou a Carta Azul "Jogada Bônus!" neste turno, garante a rolagem extra após ler a casa!
  if (
    pendingDecision?.type === 'tile_summary' &&
    !pendingDecision.rollAgain &&
    (players[idx]?.bonusRollPending || 0) > 0
  ) {
    players[idx] = {
      ...players[idx],
      bonusRollPending: players[idx].bonusRollPending - 1
    };
    pendingDecision.rollAgain = true;
    const bonusNote = `🎲 JOGADA BÔNUS ATIVA: Após confirmar a leitura, ${players[idx].name} jogará o dado novamente!`;
    pendingDecision.extraEffectNote = pendingDecision.extraEffectNote
      ? `${pendingDecision.extraEffectNote}\n${bonusNote}`
      : bonusNote;
  }

  return {
    ...state,
    players,
    moveCounter,
    logs,
    pendingDecision
  };
}

export function applyCharityChoice(state, playerId, donate) {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return state;

  let players = [...state.players];
  let player = { ...players[idx] };
  let logs = [...state.logs];

  if (donate && player.money >= 300) {
    player.money -= 300;
    players[idx] = player;
    logs = addLog(logs, `💖 ${player.name} doou $300 aos Fundos de Caridade e vai rolar o dado novamente!`, 'good');
    return {
      ...state,
      players,
      logs,
      pendingDecision: null
    };
  }

  return {
    ...state,
    players,
    logs,
    pendingDecision: {
      type: 'tile_summary',
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      tileId: player.position,
      tileTitle: 'Fundos de Caridade!',
      stateHasResources: state.stateHasResources,
      title: `${player.name} nos Fundos de Caridade`,
      subtitle: 'Optou por não doar $300',
      description: `${player.name} decidiu economizar os $300 e encerrar sua jogada.`,
      accentColor: '#94a3b8',
      readyPlayerIds: []
    }
  };
}

export function applyDenunciaAction(state, playerId, actionType, targetPlayerId = null) {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return state;

  let players = [...state.players];
  let player = { ...players[idx] };
  let publicTreasury = state.publicTreasury;
  let logs = [...state.logs];

  if (actionType === 'accuse' && targetPlayerId) {
    const tIdx = players.findIndex((p) => p.id === targetPlayerId);
    if (tIdx !== -1) {
      let target = { ...players[tIdx] };
      if (target.redCards > 0) {
        const count = target.redCards;
        const totalPenalty = count * CONSTANTS.MALHA_FINA_TOTAL;
        target.money -= totalPenalty;
        target.redCards = 0;
        target.redCardsList = [];
        target.fiscalActionPaidAmount += totalPenalty;
        publicTreasury += totalPenalty;
        players[tIdx] = target;

        logs = addLog(
          logs,
          `🦁 MALHA FINA POR DENÚNCIA! ${player.name} denunciou ${target.name}, que tinha ${count} período(s) sonegado(s) e pagou -$${totalPenalty}!`,
          'good'
        );

        return {
          ...state,
          players,
          publicTreasury,
          logs,
          pendingDecision: {
            type: 'tile_summary',
            playerId: player.id,
            playerName: player.name,
            playerColor: player.color,
            tileId: player.position,
            tileTitle: 'DENÚNCIA!',
            stateHasResources: state.stateHasResources,
            title: `🚨 DENÚNCIA CONFIRMADA CONTRA ${target.name.toUpperCase()}!`,
            subtitle: `Malha Fina Aplicada (-$${totalPenalty})`,
            description: `${player.name} denunciou ${target.name} à Receita Federal! A auditoria encontrou ${count} período(s) de sonegação e cobrou $${CONSTANTS.MALHA_FINA_TAX} de tributo + $${CONSTANTS.MALHA_FINA_FINE} de multa de ofício por cada infração, totalizando -$${totalPenalty}!`,
            accentColor: '#10b981',
            readyPlayerIds: []
          }
        };
      } else {
        logs = addLog(
          logs,
          `✅ ${player.name} denunciou ${target.name}, mas ${target.name} estava 100% em dia com seus tributos!`,
          'info'
        );

        return {
          ...state,
          players,
          logs,
          pendingDecision: {
            type: 'tile_summary',
            playerId: player.id,
            playerName: player.name,
            playerColor: player.color,
            tileId: player.position,
            tileTitle: 'DENÚNCIA!',
            stateHasResources: state.stateHasResources,
            title: `✅ ${target.name.toUpperCase()} ESTÁ EM DIA!`,
            subtitle: 'Auditoria sem irregularidades',
            description: `${player.name} denunciou ${target.name}, mas a Receita Federal verificou que todos os tributos de ${target.name} foram pagos corretamente!`,
            accentColor: '#38bdf8',
            readyPlayerIds: []
          }
        };
      }
    }
  }

  return {
    ...state,
    players,
    logs,
    pendingDecision: {
      type: 'tile_summary',
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      tileId: player.position,
      tileTitle: 'DENÚNCIA!',
      stateHasResources: state.stateHasResources,
      title: `Casa de Denúncia (${player.name})`,
      subtitle: 'Nenhuma denúncia realizada',
      description: `${player.name} optou por não denunciar nenhum concorrente nesta rodada.`,
      accentColor: '#6366f1',
      readyPlayerIds: []
    }
  };
}

// Confirmação de leitura pelos jogadores Humanos antes de fechar qualquer mensagem!
export function confirmReadDecision(state, playerId) {
  if (!state.pendingDecision) return state;

  // Se era o modal de revelação do início da rodada:
  if (state.pendingDecision.type === 'round_reveal') {
    const humanPlayers = state.players.filter((p) => !p.isBot);

    // Impede que o jogador confirme "Já vi minha carta" se ainda não fez a escolha obrigatória da Carta Vermelha
    if (playerId !== 'FORCE_ALL') {
      const myPl = state.players.find((p) => p.id === playerId);
      if (
        myPl?.lastDrawnCard?.pendingAction &&
        !myPl.lastDrawnCard.pendingAction.completed
      ) {
        return state;
      }
    }

    const currentReady = state.pendingDecision.readyPlayerIds || [];
    const nextReady = currentReady.includes(playerId)
      ? currentReady
      : [...currentReady, playerId];

    const allHumansConfirmed =
      state.mode !== 'online' ||
      playerId === 'FORCE_ALL' ||
      humanPlayers.every((hp) => nextReady.includes(hp.id));

    if (!allHumansConfirmed) {
      return {
        ...state,
        pendingDecision: {
          ...state.pendingDecision,
          readyPlayerIds: nextReady
        }
      };
    }

    return closeRoundReveal(state);
  }

  // Para resumos de casa (tile_summary):
  // Registra a confirmação de leitura em `readyPlayerIds` para que o Telão exiba quem já leu e quem falta ler!
  // Quando todos os jogadores humanos confirmarem a leitura (ou quando clicarem diretamente no botão do Telão / Mediador),
  // fecha o modal, EXECUTA eventual movimento de "avance/volte x casas" (`deferredMove`) ao vivo no tabuleiro e passa o turno!
  if (state.pendingDecision.type === 'tile_summary') {
    const humanPlayers = state.players.filter((p) => !p.isBot);
    const currentReady = state.pendingDecision.readyPlayerIds || [];
    const nextReady =
      playerId && playerId !== 'FORCE_ALL' && !currentReady.includes(playerId)
        ? [...currentReady, playerId]
        : currentReady;

    const allHumansConfirmed =
      state.mode !== 'online' ||
      playerId === 'FORCE_ALL' ||
      humanPlayers.length === 0 ||
      humanPlayers.every((hp) => nextReady.includes(hp.id));

    if (!allHumansConfirmed) {
      return {
        ...state,
        pendingDecision: {
          ...state.pendingDecision,
          readyPlayerIds: nextReady
        }
      };
    }

    return advanceTurn({
      ...state,
      pendingDecision: {
        ...state.pendingDecision,
        readyPlayerIds: nextReady
      }
    });
  }

  return advanceTurn(state);
}

// Permite ao jogador fechar o alerta privado de sabotagem no seu próprio celular
export function dismissPlayerSabotageAlert(state, playerId) {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return state;
  const players = state.players.map((p, i) =>
    i === idx ? { ...p, sabotageAlerts: [] } : p
  );
  return {
    ...state,
    players
  };
}

export function advanceTurn(state) {
  if (state.status !== 'playing') return state;

  // Mensagem de chegada lida → agora sim encerra a partida!
  if (state.pendingDecision?.finishOnConfirm) {
    return finishGameOfficial(
      {
        ...state,
        players: state.players.map((p) => ({ ...p, stepQueue: [] }))
      },
      state.pendingDecision.finisherId
    );
  }

  let cleanedPlayers = state.players.map((p) => ({ ...p, stepQueue: [] }));
  let moveCounter = state.moveCounter || 0;
  let logs = [...state.logs];
  let telaoAnnouncementBanner = state.telaoAnnouncementBanner || null;

  // Se a casa onde o jogador caiu tinha efeito de "Avance X casas" ou "Volte N casas",
  // executa o movimento AGORA (após fechar a mensagem lida) para que todos assistam o peão andando no Telão!
  const deferredMove = state.pendingDecision?.deferredMove;
  if (deferredMove && deferredMove.steps) {
    const pIdx = cleanedPlayers.findIndex((p) => p.id === deferredMove.playerId);
    if (pIdx !== -1) {
      let movingPlayer = { ...cleanedPlayers[pIdx] };
      const prevPos = movingPlayer.position;
      if (deferredMove.steps > 0) {
        const curTile = getTileById(movingPlayer.position);
        const defaultBranch = curTile.next?.[0] ?? null;
        const fwd = walkGraphForward(movingPlayer, deferredMove.steps, defaultBranch);
        movingPlayer.position = fwd.newPosition;
        movingPlayer.pathHistory = fwd.newHistory;
        movingPlayer.stepQueue = fwd.stepQueue;
      } else {
        const bwd = walkGraphBackward(movingPlayer, Math.abs(deferredMove.steps));
        movingPlayer.position = bwd.newPosition;
        movingPlayer.pathHistory = bwd.newHistory;
        movingPlayer.stepQueue = bwd.stepQueue;
      }
      moveCounter += 1;
      movingPlayer.lastMoveId = moveCounter;
      cleanedPlayers[pIdx] = movingPlayer;

      const destTile = getTileById(movingPlayer.position);
      const moveText =
        deferredMove.steps > 0
          ? `🚀 ${movingPlayer.name} avançou +${deferredMove.steps} casa(s) (da Casa #${prevPos} para a Casa #${destTile.id}: ${destTile.title})!`
          : `↩️ ${movingPlayer.name} voltou ${Math.abs(deferredMove.steps)} casa(s) (da Casa #${prevPos} para a Casa #${destTile.id}: ${destTile.title})!`;

      logs = addLog(logs, moveText, deferredMove.steps > 0 ? 'good' : 'warn');
      telaoAnnouncementBanner = {
        id: Date.now(),
        roundNumber: state.roundNumber,
        messages: [moveText]
      };

      if (movingPlayer.position === 77) {
        // Peão anda até a chegada no Telão e SÓ DEPOIS a mensagem final aparece.
        return buildFinishArrivalState(
          { ...state, players: cleanedPlayers, moveCounter, logs, telaoAnnouncementBanner },
          movingPlayer
        );
      }
    }
  }

  if (state.pendingDecision?.rollAgain) {
    return {
      ...state,
      players: cleanedPlayers,
      moveCounter,
      logs,
      telaoAnnouncementBanner,
      pendingDecision: null
    };
  }

  const currentTurnPlayer = cleanedPlayers[state.turnIndex];
  if (currentTurnPlayer && (currentTurnPlayer.bonusRollPending || 0) > 0) {
    cleanedPlayers[state.turnIndex] = {
      ...currentTurnPlayer,
      bonusRollPending: currentTurnPlayer.bonusRollPending - 1
    };
    return {
      ...state,
      players: cleanedPlayers,
      moveCounter,
      logs,
      telaoAnnouncementBanner,
      pendingDecision: null
    };
  }

  const nextTurnIndex = state.turnIndex + 1;

  if (nextTurnIndex >= state.players.length) {
    return {
      ...state,
      players: cleanedPlayers,
      moveCounter,
      logs,
      telaoAnnouncementBanner,
      phase: 'tax_vote',
      turnIndex: 0,
      roundNumber: state.roundNumber + 1,
      roundVotes: {},
      pendingDecision: null
    };
  }

  return {
    ...state,
    players: cleanedPlayers,
    moveCounter,
    logs,
    telaoAnnouncementBanner,
    turnIndex: nextTurnIndex,
    pendingDecision: null
  };
}

export function finishGameOfficial(state, finisherId = null) {
  const finalPlayers = state.players.map((p) => {
    const arrivalBonus = p.id === finisherId ? CONSTANTS.FINISH_LINE_BONUS : 0;
    const restitutionTotal = p.blueCardsList.reduce((acc, c) => acc + (c.restitutionValue ?? 0), 0);
    const finalBalance = p.money + arrivalBonus + restitutionTotal;

    return {
      ...p,
      arrivalBonus,
      restitutionTotal,
      money: finalBalance,
      totalRevenue: p.totalRevenue + arrivalBonus + restitutionTotal
    };
  });

  const sorted = [...finalPlayers].sort((a, b) => b.money - a.money);
  const logs = addLog(
    state.logs,
    `🏆 FIM DE JOGO! ${sorted[0].name} venceu com o maior Saldo Bancário Final ($${sorted[0].money})!`,
    'good'
  );

  return {
    ...state,
    status: 'finished',
    players: finalPlayers,
    winner: sorted[0],
    pendingDecision: null,
    logs
  };
}
