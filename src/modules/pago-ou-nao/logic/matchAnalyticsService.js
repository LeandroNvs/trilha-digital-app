import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, appId } from '../../../firebase/config.js';
import { buildMatchImpactSummary } from './gameEngine.js';

function getCompletedMatchesCollectionRef() {
  return collection(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    'pago_ou_nao_salas',
    'historico',
    'partidas'
  );
}

function getTemporaryRoomDocRef(roomCode) {
  const clean = (roomCode || '').trim().toUpperCase();
  return doc(db, 'artifacts', appId, 'public', 'data', 'pulso_sessoes', `PON_${clean}`);
}

/**
 * Grava no banco de dados APENAS partidas efetivamente concluídas (status === 'finished')
 * e que tiveram ao menos 1 rodada de votação realizada, usando matchId determinístico
 * para garantir que o mesmo jogo nunca seja duplicado.
 */
export async function recordCompletedMatchToFirestore(gameState) {
  if (!gameState || gameState.status !== 'finished') {
    return { saved: false, reason: 'not_finished' };
  }

  const summary = buildMatchImpactSummary(gameState);

  // Evita gravar partidas vazias caso alguém clique em encerrar antes da 1ª votação
  if (summary.playersCount < 2 || summary.roundsVoted < 1) {
    return { saved: false, reason: 'no_rounds_played', summary };
  }

  const cleanPayload = JSON.parse(JSON.stringify(summary));
  const matchDocRef = doc(getCompletedMatchesCollectionRef(), summary.matchId);

  await setDoc(
    matchDocRef,
    {
      ...cleanPayload,
      recordedAt: serverTimestamp()
    },
    { merge: true }
  );

  return { saved: true, matchId: summary.matchId, summary };
}

/**
 * Remove a sala temporária de sincronização (rascunho em andamento do modo Online)
 * assim que a partida encerrada é limpa/resetada para iniciar outra.
 */
export async function cleanupTemporaryOnlineRoom(roomCode) {
  const clean = (roomCode || '').trim().toUpperCase();
  if (!clean || clean === 'LOCAL' || clean === 'SOLO' || clean === 'MEDIADOR') return;
  try {
    await deleteDoc(getTemporaryRoomDocRef(clean));
  } catch (err) {
    console.warn('Não foi possível remover sala temporária:', err);
  }
}

/**
 * Consulta o histórico consolidado de partidas concluídas no Firestore.
 */
export async function fetchCompletedMatchesFromFirestore() {
  const snap = await getDocs(getCompletedMatchesCollectionRef());
  const list = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data && data.matchId) {
      list.push(data);
    }
  });

  // Ordena da mais recente para a mais antiga em memória (dispensa índice composto)
  list.sort((a, b) => (b.finishedAtMs || 0) - (a.finishedAtMs || 0));
  return list;
}
