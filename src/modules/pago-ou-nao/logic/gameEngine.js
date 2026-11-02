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
    skipTurns: 0,
    forbidSpontaneous: false,
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
    let updated = { ...p, forbidSpontaneous: false, stepQueue: [] };

    if (paid) {
      updated.money += CONSTANTS.NET_WHEN_PAYING;
      updated.totalRevenue += CONSTANTS.ROUND_REVENUE;
      updated.taxesPaidCount += 1;
      updated.taxesPaidAmount += CONSTANTS.TAX_AMOUNT;
      publicTreasury += CONSTANTS.TAX_AMOUNT;

      const blueCard = BLUE_CARDS[Math.floor(Math.random() * BLUE_CARDS.length)];
      updated.blueCardsList = [...updated.blueCardsList, blueCard];
      updated.lastDrawnCard = {
        roundNumber: state.roundNumber,
        paid: true,
        card: blueCard,
        effectResult: 'Guardada na sua mão até o Balanço Final!'
      };
      drawnCardsSummary.push({
        playerId: p.id,
        playerName: p.name,
        paid: true,
        card: blueCard
      });
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
        effectResult: ''
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

  // Aplica efeitos imediatos das Cartas Vermelhas usando o grafo sem saltos!
  let moveCounter = state.moveCounter || 0;
  for (const item of drawnCardsSummary) {
    if (!item.paid && item.card) {
      const idx = players.findIndex((pl) => pl.id === item.playerId);
      if (idx === -1) continue;
      let pl = { ...players[idx] };
      const c = item.card;

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
        logs = addLog(logs, `🦁 [Carta Vermelha] ${pl.name} caiu na MALHA FINA e pagou -$${penalty}!`, 'bad');
      } else if (c.effect === 'investigado') {
        pl.skipTurns += 1;
        pl.forbidSpontaneous = true;
        item.effectResult = `INVESTIGADO! Ficará parado nesta rodada e sem denúncia espontânea.`;
      } else if (c.effect === 'carta_negada') {
        if (pl.blueCardsList.length > 0) {
          pl.blueCardsList = pl.blueCardsList.slice(0, -1);
          item.effectResult = `Perdeu 1 Carta Azul da mão!`;
        } else {
          item.effectResult = `Não tinha Carta Azul para descartar.`;
        }
      } else if (c.effect === 'ma_sorte') {
        if (pl.position > 0) {
          const prevPos = pl.position;
          const backRes = walkGraphBackward(pl, 3);
          pl.position = backRes.newPosition;
          pl.pathHistory = backRes.newHistory;
          pl.stepQueue = backRes.stepQueue;
          moveCounter += 1;
          pl.lastMoveId = moveCounter;
          item.effectResult = `MÁ SORTE! Voltou da Casa #${prevPos} para a Casa #${pl.position}!`;
          item.isPublicEvent = true;
          logs = addLog(
            logs,
            `⚡ [Carta Vermelha: Má Sorte] ${pl.name} teve de voltar 3 casas (da Casa #${prevPos} para a Casa #${pl.position})!`,
            'warn'
          );
        } else {
          item.effectResult = `MÁ SORTE! Como já estava no Início (Casa #0), permaneceu na Casa #0.`;
        }
      } else if (c.effect === 'trapaceiro') {
        const victimIdx = players.findIndex((other, oIdx) => oIdx !== idx && other.blueCardsList.length > 0);
        if (victimIdx !== -1) {
          const victim = { ...players[victimIdx] };
          victim.blueCardsList = victim.blueCardsList.slice(0, -1);
          players[victimIdx] = victim;
          item.effectResult = `Descartou 1 Carta Azul de ${victim.name}!`;
          item.isPublicEvent = true;
        } else {
          item.effectResult = `Nenhum adversário tinha Carta Azul.`;
        }
      } else if (c.effect === 'passou_perna') {
        const leaderIdx = players
          .map((other, oIdx) => ({ other, oIdx }))
          .filter((x) => x.oIdx !== idx && x.other.position > 0)
          .sort((a, b) => b.other.pathHistory.length - a.other.pathHistory.length)[0]?.oIdx;
        if (leaderIdx !== undefined) {
          const leader = { ...players[leaderIdx] };
          const prevPos = leader.position;
          const backRes = walkGraphBackward(leader, 3);
          leader.position = backRes.newPosition;
          leader.pathHistory = backRes.newHistory;
          leader.stepQueue = backRes.stepQueue;
          moveCounter += 1;
          leader.lastMoveId = moveCounter;
          players[leaderIdx] = leader;
          item.effectResult = `PASSOU A PERNA! Mandou ${leader.name} voltar da Casa #${prevPos} para a Casa #${leader.position}!`;
          item.isPublicEvent = true;
          logs = addLog(
            logs,
            `⚡ [Carta Vermelha: Passou a Perna] ${leader.name} foi obrigado a voltar da Casa #${prevPos} para a Casa #${leader.position}!`,
            'warn'
          );
        } else {
          item.effectResult = `Nenhum concorrente avançado no tabuleiro para recuar.`;
        }
      } else if (c.effect === 'troca') {
        const aheadIdx = players.findIndex(
          (other, oIdx) => oIdx !== idx && other.pathHistory.length > pl.pathHistory.length
        );
        if (aheadIdx !== -1) {
          const ahead = { ...players[aheadIdx] };
          const tempPos = pl.position;
          const tempHist = pl.pathHistory;
          pl.position = ahead.position;
          pl.pathHistory = ahead.pathHistory;
          pl.stepQueue = [pl.position];
          moveCounter += 1;
          pl.lastMoveId = moveCounter;
          ahead.position = tempPos;
          ahead.pathHistory = tempHist;
          ahead.stepQueue = [ahead.position];
          moveCounter += 1;
          ahead.lastMoveId = moveCounter;
          players[aheadIdx] = ahead;
          item.effectResult = `TROCA! Trocou de lugar no tabuleiro com ${ahead.name} (foi para a Casa #${pl.position}, e ${ahead.name} foi para #${ahead.position})!`;
          item.isPublicEvent = true;
          logs = addLog(
            logs,
            `⚡ [Carta Vermelha: Troca] ${pl.name} trocou de lugar no tabuleiro com ${ahead.name}!`,
            'warn'
          );
        } else {
          item.effectResult = `Já está na liderança, manteve a posição.`;
        }
      }

      if (pl.lastDrawnCard) {
        pl.lastDrawnCard = { ...pl.lastDrawnCard, effectResult: item.effectResult };
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
    logs,
    pendingDecision: {
      type: 'round_reveal',
      roundNumber: state.roundNumber,
      payersCount,
      evadersCount,
      stateHasResources,
      drawnCardsSummary,
      readyPlayerIds: []
    }
  };
}

export function closeRoundReveal(state) {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, stepQueue: [] })),
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

  const logs = addLog(
    state.logs,
    `🤝 DENÚNCIA ESPONTÂNEA: ${player.name} regularizou ${count} imposto(s) antes da fiscalização pagando -$${totalCost} (sem multa de $450)!`,
    'good'
  );

  return {
    ...state,
    players,
    publicTreasury: state.publicTreasury + totalCost,
    logs
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
    return finishGameOfficial(nextState, player.id);
  }

  return resolveOfficialTile(nextState, player.id, landedTile);
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
    return finishGameOfficial(nextState, player.id);
  }

  return resolveOfficialTile(nextState, player.id, landedTile);
}

// ============================================================================
// RESOLUÇÃO DAS CASAS (Usa `walkGraphForward`/`walkGraphBackward` sem saltos!)
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
      if (outcome.move > 0) {
        // Se passar por uma bifurcação durante bônus de casa, segue o primeiro ramo padrão
        const curTile = getTileById(player.position);
        const defaultBranch = curTile.next?.[0] ?? null;
        const fwd = walkGraphForward(player, outcome.move, defaultBranch);
        player.position = fwd.newPosition;
        player.pathHistory = fwd.newHistory;
        player.stepQueue = [...(player.stepQueue || []), ...fwd.stepQueue];
      } else {
        const bwd = walkGraphBackward(player, Math.abs(outcome.move));
        player.position = bwd.newPosition;
        player.pathHistory = bwd.newHistory;
        player.stepQueue = [...(player.stepQueue || []), ...bwd.stepQueue];
        if (!isSufficient) player.harmedTilesCount += 1;
      }
      moveCounter += 1;
      player.lastMoveId = moveCounter;
      const destTile = getTileById(player.position);
      extraEffectNote = `\n📍 Movimento da consequência: pino foi para a Casa #${destTile.id} (${destTile.title}).`;
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

    if (player.position === 77) {
      return finishGameOfficial({ ...state, players, moveCounter, logs }, player.id);
    }

    pendingDecision = {
      type: 'tile_summary',
      playerId: player.id,
      playerName: player.name,
      title: `${player.name} em: ${tile.title} (${serviceCard.name} ${tile.num})`,
      subtitle: isSufficient
        ? '🏛️ ESTADO COM INVESTIMENTOS SUFICIENTES'
        : '🚨 ESTADO COM INVESTIMENTOS INSUFICIENTES (EFEITO DA SONEGAÇÃO)',
      description: `${outcome.text}${extraEffectNote}`,
      serviceImage: isSufficient ? serviceCard.sufficientImage : serviceCard.insufficientImage,
      rollAgain: !!outcome.rollAgain,
      accentColor: isSufficient ? serviceCard.color : '#ef4444',
      readyPlayerIds: []
    };
  } else if (tile.type === 'denuncia') {
    logs = addLog(logs, `🕵️ ${player.name} parou na casa preta de DENÚNCIA!`, 'warn');
    pendingDecision = {
      type: 'denuncia_choice',
      playerId: player.id,
      playerName: player.name,
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
      title: `🍀 LOTERIA! (${player.name})`,
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
        title: `🤝 FUNDOS DE CARIDADE (${player.name})`,
        subtitle: 'Doe $300 para rolar o dado novamente',
        description: 'Deseja doar $300 aos Fundos de Caridade para ganhar uma nova jogada de dado imediatamente?'
      };
    } else {
      pendingDecision = {
        type: 'tile_summary',
        playerId: player.id,
        playerName: player.name,
        title: `Fundos de Caridade (${player.name})`,
        subtitle: 'Saldo insuficiente para doar',
        description: `${player.name} passou pelos Fundos de Caridade, mas não tinha $300 para doar.`,
        accentColor: '#94a3b8',
        readyPlayerIds: []
      };
    }
  } else {
    let extraNote = '';
    if (tile.money) {
      player.money += tile.money;
      if (tile.money > 0) player.totalRevenue += tile.money;
    }
    if (tile.move) {
      const curTile = getTileById(player.position);
      const defaultBranch = curTile.next?.[0] ?? null;
      const fwd = walkGraphForward(player, tile.move, defaultBranch);
      player.position = fwd.newPosition;
      player.pathHistory = fwd.newHistory;
      player.stepQueue = [...(player.stepQueue || []), ...fwd.stepQueue];
      moveCounter += 1;
      player.lastMoveId = moveCounter;
      const destTile = getTileById(player.position);
      extraNote = `\n📍 Movimento extra: pino avançou para a Casa #${destTile.id} (${destTile.title}).`;
    }
    if (tile.skipTurns) {
      player.skipTurns += tile.skipTurns;
    }

    players[idx] = player;
    logs = addLog(logs, `📌 ${player.name}: ${tile.title} (${tile.subtitle})`, tile.money < 0 ? 'warn' : 'info');

    if (player.position === 77) {
      return finishGameOfficial({ ...state, players, moveCounter, logs }, player.id);
    }

    pendingDecision = {
      type: 'tile_summary',
      playerId: player.id,
      playerName: player.name,
      title: `${player.name} em: ${tile.title}`,
      subtitle: tile.subtitle,
      description: `${tile.title} — ${tile.subtitle}.${extraNote}`,
      rollAgain: !!tile.rollAgain,
      accentColor: tile.money > 0 ? '#10b981' : tile.money < 0 ? '#f97316' : '#38bdf8',
      readyPlayerIds: []
    };
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

  // Para resumos de casa (tile_summary), confirmar leitura avança imediatamente para o próximo turno
  // e limpa a fila de passos (stepQueue) de todos os peões para nunca re-animarem!
  return advanceTurn(state);
}

export function advanceTurn(state) {
  if (state.status !== 'playing') return state;

  const cleanedPlayers = state.players.map((p) => ({ ...p, stepQueue: [] }));

  if (state.pendingDecision?.rollAgain) {
    return {
      ...state,
      players: cleanedPlayers,
      pendingDecision: null
    };
  }

  const nextTurnIndex = state.turnIndex + 1;

  if (nextTurnIndex >= state.players.length) {
    return {
      ...state,
      players: cleanedPlayers,
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
    turnIndex: nextTurnIndex,
    pendingDecision: null
  };
}

export function finishGameOfficial(state, finisherId = null) {
  const finalPlayers = state.players.map((p) => {
    const arrivalBonus = p.id === finisherId ? CONSTANTS.FINISH_LINE_BONUS : 0;
    const restitutionTotal = p.blueCardsList.reduce((acc, c) => acc + (c.restitutionValue || 100), 0);
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
