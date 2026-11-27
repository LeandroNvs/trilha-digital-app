import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Landmark,
  ShieldAlert,
  Users,
  AlertTriangle,
  Award,
  TrendingDown,
  Scale,
  Calendar,
  Filter,
  ArrowLeft,
  RefreshCw,
  HeartPulse,
  GraduationCap,
  CheckCircle2,
  Eye,
  X
} from 'lucide-react';
import { fetchCompletedMatchesFromFirestore } from '../logic/matchAnalyticsService.js';
import { buildMatchImpactSummary } from '../logic/gameEngine.js';

function formatCurrency(val) {
  const num = Math.round(Number(val) || 0);
  return `$${num.toLocaleString('pt-BR')}`;
}

function formatDateTime(ms) {
  if (!ms) return '-';
  try {
    return new Date(ms).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
}

function getModeBadge(mode) {
  if (mode === 'online') {
    return {
      label: '📱 Online (Telão + Celulares)',
      short: 'Online',
      cls: 'bg-sky-500/20 text-sky-300 border-sky-400/40'
    };
  }
  if (mode === 'mediator') {
    return {
      label: '🖥️ Modo Mediador',
      short: 'Mediador',
      cls: 'bg-amber-500/20 text-amber-300 border-amber-400/40'
    };
  }
  return {
    label: '🤖 Individual (Bots)',
    short: 'Individual',
    cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
  };
}

function aggregateMatches(matches) {
  const totalMatches = matches.length;
  let totalPlayers = 0;
  let totalRoundsVoted = 0;
  let roundsWithResources = 0;
  let roundsWithoutResources = 0;
  let totalPotentialTax = 0;
  let totalTaxPaidAmount = 0;
  let totalEvadedAmount = 0;
  let totalEvadedCount = 0;
  let unrecoveredTaxAmount = 0;
  let unrecoveredPeriods = 0;
  let recoveredBaseTaxAmount = 0;
  let totalFiscalActionCollected = 0;
  let totalForcedAudits = 0;
  let malhaFinaCardHits = 0;
  let denunciaHits = 0;
  let spontaneousHits = 0;
  let playersCaughtCount = 0;
  let playersHarmedCount = 0;
  let totalHarmedOccurrences = 0;
  let totalHarmedFinancialLoss = 0;
  let totalHarmedLostTurns = 0;
  let matchesWonByEvaders = 0;

  for (const m of matches) {
    totalPlayers += m.playersCount || 0;
    totalRoundsVoted += m.roundsVoted || 0;
    roundsWithResources += m.roundsWithResources || 0;
    roundsWithoutResources += m.roundsWithoutResources || 0;
    totalPotentialTax += m.totalPotentialTax || 0;
    totalTaxPaidAmount += m.totalTaxPaidAmount || 0;
    totalEvadedAmount += m.totalEvadedAmount || 0;
    totalEvadedCount += m.totalEvadedCount || 0;
    unrecoveredTaxAmount += m.unrecoveredTaxAmount || 0;
    unrecoveredPeriods += m.unrecoveredPeriods || 0;
    recoveredBaseTaxAmount += m.recoveredBaseTaxAmount || 0;
    totalFiscalActionCollected += m.totalFiscalActionCollected || 0;
    totalForcedAudits += m.totalForcedAudits || 0;
    malhaFinaCardHits += m.malhaFinaCardHits || 0;
    denunciaHits += m.denunciaHits || 0;
    spontaneousHits += m.spontaneousHits || 0;
    playersCaughtCount += m.playersCaughtCount || 0;
    playersHarmedCount += m.playersHarmedCount || 0;
    totalHarmedOccurrences += m.totalHarmedOccurrences || 0;
    totalHarmedFinancialLoss += m.totalHarmedFinancialLoss || 0;
    totalHarmedLostTurns += m.totalHarmedLostTurns || 0;
    if (m.winnerEvaded) matchesWonByEvaders += 1;
  }

  const evasionRatePct =
    totalPotentialTax > 0 ? Math.round((totalEvadedAmount / totalPotentialTax) * 100) : 0;
  const unrecoveredShareOfEvadedPct =
    totalEvadedAmount > 0 ? Math.round((unrecoveredTaxAmount / totalEvadedAmount) * 100) : 0;
  const paidOnTimePct =
    totalPotentialTax > 0 ? Math.round((totalTaxPaidAmount / totalPotentialTax) * 100) : 0;
  const recoveredBasePct =
    totalPotentialTax > 0 ? Math.round((recoveredBaseTaxAmount / totalPotentialTax) * 100) : 0;
  const unrecoveredOfTotalPct = Math.max(0, 100 - paidOnTimePct - recoveredBasePct);

  const totalTrackedRounds = roundsWithResources + roundsWithoutResources;
  const stateWithoutResourcesPct =
    totalTrackedRounds > 0 ? Math.round((roundsWithoutResources / totalTrackedRounds) * 100) : 0;
  const evaderWinPct =
    totalMatches > 0 ? Math.round((matchesWonByEvaders / totalMatches) * 100) : 0;

  return {
    totalMatches,
    totalPlayers,
    totalRoundsVoted,
    roundsWithResources,
    roundsWithoutResources,
    stateWithoutResourcesPct,
    totalPotentialTax,
    totalTaxPaidAmount,
    totalEvadedAmount,
    totalEvadedCount,
    evasionRatePct,
    unrecoveredTaxAmount,
    unrecoveredPeriods,
    unrecoveredShareOfEvadedPct,
    recoveredBaseTaxAmount,
    totalFiscalActionCollected,
    paidOnTimePct,
    recoveredBasePct,
    unrecoveredOfTotalPct,
    totalForcedAudits,
    malhaFinaCardHits,
    denunciaHits,
    spontaneousHits,
    playersCaughtCount,
    playersHarmedCount,
    totalHarmedOccurrences,
    totalHarmedFinancialLoss,
    totalHarmedLostTurns,
    matchesWonByEvaders,
    evaderWinPct
  };
}

export default function SocialImpactDashboard({
  isOpen,
  onClose,
  currentFinishedState = null,
  openedFromFinishScreen = false
}) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 'aggregate' (Visão Geral da Sociedade) | 'single' (Partida Específica)
  const [viewScope, setViewScope] = useState('aggregate');
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  // Filtros da visão acumulada
  const [periodFilter, setPeriodFilter] = useState('all'); // 'today' | '7d' | '30d' | 'all'
  const [modeFilter, setModeFilter] = useState('all'); // 'all' | 'classroom' | 'online' | 'mediator' | 'solo'

  const currentMatchSummary = useMemo(() => {
    if (!currentFinishedState || currentFinishedState.status !== 'finished') return null;
    return buildMatchImpactSummary(currentFinishedState);
  }, [currentFinishedState]);

  const loadMatches = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const remoteList = await fetchCompletedMatchesFromFirestore();
      // Se acabou de finalizar uma partida e ela ainda está sendo propagada ou teve 0 votos, garante que apareça se válida
      if (currentMatchSummary && currentMatchSummary.roundsVoted >= 1) {
        const exists = remoteList.some((m) => m.matchId === currentMatchSummary.matchId);
        if (!exists) {
          setMatches([currentMatchSummary, ...remoteList]);
        } else {
          setMatches(remoteList);
        }
      } else {
        setMatches(remoteList);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico do Dashboard:', err);
      setErrorMsg('Não foi possível consultar o histórico na nuvem neste momento.');
      if (currentMatchSummary) {
        setMatches([currentMatchSummary]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadMatches();
    if (openedFromFinishScreen && currentMatchSummary) {
      setViewScope('single');
      setSelectedMatchId(currentMatchSummary.matchId);
    } else {
      setViewScope('aggregate');
    }
  }, [isOpen, openedFromFinishScreen, currentMatchSummary?.matchId]);

  const filteredMatches = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return matches.filter((m) => {
      const ts = m.finishedAtMs || 0;
      if (periodFilter === 'today' && ts < startOfToday.getTime()) return false;
      if (periodFilter === '7d' && ts < now - 7 * 24 * 60 * 60 * 1000) return false;
      if (periodFilter === '30d' && ts < now - 30 * 24 * 60 * 60 * 1000) return false;

      if (modeFilter === 'classroom' && m.mode !== 'online' && m.mode !== 'mediator') return false;
      if (modeFilter === 'online' && m.mode !== 'online') return false;
      if (modeFilter === 'mediator' && m.mode !== 'mediator') return false;
      if (modeFilter === 'solo' && m.mode !== 'solo') return false;

      return true;
    });
  }, [matches, periodFilter, modeFilter]);

  const selectedMatch = useMemo(() => {
    if (selectedMatchId) {
      const found = matches.find((m) => m.matchId === selectedMatchId);
      if (found) return found;
    }
    if (currentMatchSummary) return currentMatchSummary;
    return filteredMatches[0] || matches[0] || null;
  }, [selectedMatchId, matches, filteredMatches, currentMatchSummary]);

  const stats = useMemo(() => {
    if (viewScope === 'single') {
      return selectedMatch ? aggregateMatches([selectedMatch]) : aggregateMatches([]);
    }
    return aggregateMatches(filteredMatches);
  }, [viewScope, selectedMatch, filteredMatches]);

  if (!isOpen) return null;

  // Equivalências ilustrativas baseadas nas próprias cartas de serviço do jogo ($250 faculdade/consulta, $200 alimentação escolar, $450 parto)
  const lostSchoolMeals = Math.floor(stats.unrecoveredTaxAmount / 200);
  const lostMedicalTreatments = Math.floor(stats.unrecoveredTaxAmount / 300);
  const lostScholarships = Math.floor(stats.unrecoveredTaxAmount / 500);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl text-white overflow-y-auto p-3 sm:p-6">
      <div className="max-w-6xl w-full mx-auto bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl overflow-hidden">
        {/* TOPO DO DASHBOARD */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 border-b border-slate-800 px-5 py-4 sm:px-7 sm:py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-slate-950 shadow-lg">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Educação Fiscal & Cidadania
                </span>
                {openedFromFinishScreen && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    ✓ Partida Registrada
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                Observatório Social — O Impacto Real da Sonegação
              </h2>
              <p className="text-xs text-slate-300">
                Como pequenas decisões individuais acumuladas transformam o destino de toda uma sociedade
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadMatches}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
              title="Atualizar dados do banco"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition cursor-pointer ${
                openedFromFinishScreen
                  ? 'bg-gradient-to-r from-emerald-400 to-sky-400 hover:brightness-110 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white'
              }`}
            >
              {openedFromFinishScreen ? (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  <span>Fechar e Voltar à Escolha do Jogo</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  <span>Fechar Dashboard</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SELETOR DE ESCOPO (TODOS OS JOGOS vs JOGO ESPECÍFICO) + FILTROS */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-5 py-3.5 sm:px-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setViewScope('aggregate')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                viewScope === 'aggregate'
                  ? 'bg-gradient-to-r from-sky-400 to-emerald-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Acumulado Geral ({filteredMatches.length} {filteredMatches.length === 1 ? 'jogo' : 'jogos'})</span>
            </button>

            <button
              onClick={() => {
                if (!selectedMatchId && (currentMatchSummary || matches[0])) {
                  setSelectedMatchId((currentMatchSummary || matches[0]).matchId);
                }
                setViewScope('single');
              }}
              disabled={!selectedMatch}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                viewScope === 'single'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : !selectedMatch
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>
                {currentMatchSummary && selectedMatch?.matchId === currentMatchSummary.matchId
                  ? `Esta Partida (Sala ${selectedMatch.roomCode})`
                  : selectedMatch
                  ? `Jogo Específico (${selectedMatch.roomCode})`
                  : 'Jogo Específico'}
              </span>
            </button>
          </div>

          {viewScope === 'aggregate' ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="bg-slate-900 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="today">Hoje</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="all">Todo o período</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="bg-slate-900 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todos os Modos</option>
                  <option value="classroom">Sala de Aula (Online + Mediador)</option>
                  <option value="online">Apenas Online (Telão + Celulares)</option>
                  <option value="mediator">Apenas Modo Mediador</option>
                  <option value="solo">Apenas Individual (Bots)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Selecionar partida concluída:</span>
              <select
                value={selectedMatch?.matchId || ''}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 focus:outline-none"
              >
                {matches.map((m) => (
                  <option key={m.matchId} value={m.matchId}>
                    {formatDateTime(m.finishedAtMs)} • Sala {m.roomCode} ({getModeBadge(m.mode).short}) — Vencedor: {m.winnerName}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setViewScope('aggregate')}
                className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-bold transition cursor-pointer"
              >
                🌍 Ver Soma de Todos os Jogos
              </button>
            </div>
          )}
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="p-5 sm:p-7 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {loading && matches.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm font-bold animate-pulse">
              Consultando resultados das partidas concluídas...
            </div>
          ) : stats.totalMatches === 0 ? (
            <div className="py-14 px-6 text-center bg-slate-950/70 rounded-3xl border border-slate-800 space-y-3">
              <Scale className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-lg font-black text-white">
                Nenhuma partida concluída encontrada para este filtro
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Os resultados são gravados exclusivamente quando uma partida chega ao fim (pela linha de chegada ou pelo encerramento da Matriz Final). Altere os filtros acima ou conclua uma partida para analisar o impacto social!
              </p>
            </div>
          ) : (
            <>
              {/* BANNER NARRATIVO CENTRAL: A VERDADEIRA MENSAGEM DO JOGO */}
              <div className="rounded-3xl bg-gradient-to-br from-rose-950/60 via-slate-900 to-amber-950/40 border border-rose-500/40 p-5 sm:p-6 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="space-y-2 max-w-3xl">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Reflexão Central • Individual vs. Coletivo
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white leading-snug">
                      Para 1 jogador, reter <span className="text-amber-300">$300</span> parece uma pequena vantagem.{' '}
                      {viewScope === 'aggregate' ? (
                        <>
                          Mas somando <span className="text-sky-300">{stats.totalMatches} {stats.totalMatches === 1 ? 'partida' : 'partidas'}</span>,{' '}
                          <span className="text-rose-400">{formatCurrency(stats.totalEvadedAmount)}</span> deixaram de financiar os serviços públicos!
                        </>
                      ) : (
                        <>
                          Mas só nesta partida, <span className="text-rose-400">{formatCurrency(stats.totalEvadedAmount)}</span> foram retirados do orçamento coletivo!
                        </>
                      )}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      Desse montante sonegado, <strong className="text-rose-300">{formatCurrency(stats.unrecoveredTaxAmount)} ({stats.unrecoveredShareOfEvadedPct}%) jamais foram recuperados</strong>.
                      Como consequência direta, a sociedade ficou <strong className="text-amber-300">sem recursos públicos em {stats.roundsWithoutResources} {stats.roundsWithoutResources === 1 ? 'rodada' : 'rodadas'} ({stats.stateWithoutResourcesPct}%)</strong>,
                      fazendo com que <strong className="text-white">{stats.playersHarmedCount} {stats.playersHarmedCount === 1 ? 'participante sofresse' : 'participantes sofressem'} {stats.totalHarmedOccurrences} penalidades</strong> em saúde, educação, segurança e transporte — pagando{' '}
                      <strong className="text-rose-400">{formatCurrency(stats.totalHarmedFinancialLoss)}</strong> do próprio bolso
                      {stats.totalHarmedLostTurns > 0 ? ` e perdendo ${stats.totalHarmedLostTurns} rodadas parados!` : '!'}
                    </p>
                  </div>

                  {/* EQUIVALÊNCIA DE SERVIÇOS PÚBLICOS PERDIDOS */}
                  <div className="bg-slate-950/85 border border-slate-800 rounded-2xl p-4 shrink-0 lg:w-72 space-y-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      O que {formatCurrency(stats.unrecoveredTaxAmount)} não recuperados custeariam na cidade:
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                          <GraduationCap className="w-3.5 h-3.5" /> Lanches / Livros
                        </span>
                        <strong className="font-mono text-white">{lostSchoolMeals}x</strong>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="flex items-center gap-1.5 text-sky-300 font-semibold">
                          <HeartPulse className="w-3.5 h-3.5" /> Remédios / Saúde
                        </span>
                        <strong className="font-mono text-white">{lostMedicalTreatments}x</strong>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                          <Award className="w-3.5 h-3.5" /> Formaturas Públicas
                        </span>
                        <strong className="font-mono text-white">{lostScholarships}x</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* OS 4 GRANDES CARDS DE PERGUNTAS DO DASHBOARD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CARD 1: EXECUÇÕES E FALTA DE RECURSOS */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-sky-400 mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        {viewScope === 'aggregate' ? 'Jogos Concluídos' : 'Duração da Partida'}
                      </span>
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {viewScope === 'aggregate' ? stats.totalMatches : `${stats.totalRoundsVoted} rodadas`}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {stats.totalPlayers} participantes • {stats.totalRoundsVoted} rodadas apuradas
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/90 flex items-center justify-between text-xs">
                    <span className="text-slate-300">Estado sem recursos:</span>
                    <strong className="text-rose-400 font-mono">
                      {stats.roundsWithoutResources}x ({stats.stateWithoutResourcesPct}%)
                    </strong>
                  </div>
                </div>

                {/* CARD 2: SONEGADO E NÃO RECUPERADO */}
                <div className="bg-slate-950/80 border border-rose-500/30 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-rose-400 mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        Sonegado Não Recuperado
                      </span>
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
                      {formatCurrency(stats.unrecoveredTaxAmount)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      De <strong className="text-slate-200">{formatCurrency(stats.totalEvadedAmount)}</strong> sonegados ({stats.evasionRatePct}% do devido)
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/90 flex items-center justify-between text-xs">
                    <span className="text-slate-300">Escapou sem pagar:</span>
                    <strong className="text-amber-300 font-mono">
                      {stats.unrecoveredPeriods} período(s) ({stats.unrecoveredShareOfEvadedPct}%)
                    </strong>
                  </div>
                </div>

                {/* CARD 3: MALHA FINA E FISCALIZAÇÃO */}
                <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-amber-400 mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        Caíram na Malha Fina
                      </span>
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                      {stats.playersCaughtCount} <span className="text-sm font-bold text-slate-300">pessoa(s)</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {stats.totalForcedAudits} autuação(ões) ({stats.malhaFinaCardHits} sorteio + {stats.denunciaHits} denúncia)
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/90 flex items-center justify-between text-xs">
                    <span className="text-slate-300">Recuperado c/ multas:</span>
                    <strong className="text-emerald-400 font-mono">
                      {formatCurrency(stats.totalFiscalActionCollected)}
                    </strong>
                  </div>
                </div>

                {/* CARD 4: PREJUDICADOS NAS CASAS SEM RECURSO */}
                <div className="bg-slate-950/80 border border-red-500/30 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-red-400 mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        Prejuízo nas Casas s/ Recurso
                      </span>
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-red-400 font-mono">
                      -{formatCurrency(stats.totalHarmedFinancialLoss)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong className="text-white">{stats.playersHarmedCount} pessoa(s)</strong> prejudicadas em{' '}
                      <strong className="text-rose-300">{stats.totalHarmedOccurrences} casas</strong>
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/90 flex items-center justify-between text-xs">
                    <span className="text-slate-300">Rodadas paralisadas:</span>
                    <strong className="text-rose-300 font-mono">
                      {stats.totalHarmedLostTurns} turno(s) perdido(s)
                    </strong>
                  </div>
                </div>
              </div>

              {/* BARRA DE COMPOSIÇÃO TRIBUTÁRIA + PARADOXO DO VENCEDOR */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* DESTINO DOS TRIBUTOS DEVIDOS */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                      Destino de Todos os Tributos Devidos ({formatCurrency(stats.totalPotentialTax)})
                    </h4>
                    <span className="text-xs font-bold text-emerald-400">
                      Pago em dia: {stats.paidOnTimePct}%
                    </span>
                  </div>

                  <div className="w-full h-4 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
                    {stats.paidOnTimePct > 0 && (
                      <div
                        style={{ width: `${stats.paidOnTimePct}%` }}
                        className="bg-emerald-500 h-full transition-all"
                        title={`Pago em dia: ${formatCurrency(stats.totalTaxPaidAmount)} (${stats.paidOnTimePct}%)`}
                      />
                    )}
                    {stats.recoveredBasePct > 0 && (
                      <div
                        style={{ width: `${stats.recoveredBasePct}%` }}
                        className="bg-amber-400 h-full transition-all"
                        title={`Tributo recuperado na fiscalização/espontânea: ${formatCurrency(stats.recoveredBaseTaxAmount)} (${stats.recoveredBasePct}%)`}
                      />
                    )}
                    {stats.unrecoveredOfTotalPct > 0 && (
                      <div
                        style={{ width: `${stats.unrecoveredOfTotalPct}%` }}
                        className="bg-rose-500 h-full transition-all"
                        title={`Sonegado e não recuperado: ${formatCurrency(stats.unrecoveredTaxAmount)} (${stats.unrecoveredOfTotalPct}%)`}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Pago em Dia
                      </span>
                      <div className="font-mono font-black text-white mt-0.5">
                        {formatCurrency(stats.totalTaxPaidAmount)}
                      </div>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> Recuperado
                      </span>
                      <div className="font-mono font-black text-white mt-0.5">
                        {formatCurrency(stats.recoveredBaseTaxAmount)}
                      </div>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Não Recuperado
                      </span>
                      <div className="font-mono font-black text-rose-300 mt-0.5">
                        {formatCurrency(stats.unrecoveredTaxAmount)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* A ARMADILHA / PARADOXO DA SONEGAÇÃO */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                        A Armadilha Individual vs. O Prejuízo de Todos
                      </h4>
                      <span className="text-xs font-mono font-black text-amber-400">
                        {viewScope === 'aggregate'
                          ? `${stats.matchesWonByEvaders}/${stats.totalMatches} vencedores sonegaram (${stats.evaderWinPct}%)`
                          : selectedMatch?.winnerEvaded
                          ? 'Vencedor sonegou nesta partida'
                          : 'Vencedor 100% em dia!'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {stats.matchesWonByEvaders > 0 ? (
                        <>
                          Quando quem sonega vence no saldo individual, surge a falsa impressão de que <em>&ldquo;valeu a pena&rdquo;</em>.
                          Porém, os dados mostram quem pagou essa conta: <strong className="text-white">todos os jogadores</strong> que passaram pelas casas sem serviço público perderam{' '}
                          <strong className="text-rose-400">{formatCurrency(stats.totalHarmedFinancialLoss)}</strong> em despesas particulares e{' '}
                          <strong className="text-amber-300">{stats.totalHarmedLostTurns} rodadas</strong> de atraso — inclusive quem pagou seus impostos corretamente!
                        </>
                      ) : (
                        <>
                          Neste recorte, <strong className="text-emerald-400">100% das vitórias vieram de contribuintes em dia</strong> (impulsionados pelas Cartas Azuis de Restituição e pelo funcionamento pleno dos serviços públicos)!
                        </>
                      )}
                    </p>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Regularizações por Denúncia Espontânea:
                    </span>
                    <strong className="text-sky-300 font-mono">
                      {stats.spontaneousHits} vez(es)
                    </strong>
                  </div>
                </div>
              </div>

              {/* RODAPÉ DINÂMICO: LISTA DE JOGOS (VISÃO GERAL) OU MATRIZ DO JOGO ESPECÍFICO */}
              {viewScope === 'aggregate' ? (
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white">
                        Histórico de Partidas Concluídas ({filteredMatches.length})
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Clique em qualquer partida para abrir a análise individual e sua Matriz de Resultados
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/70 text-slate-400">
                          <th className="p-3 font-bold">Data / Sala</th>
                          <th className="p-3 font-bold">Modo</th>
                          <th className="p-3 font-bold">Vencedor</th>
                          <th className="p-3 font-bold text-right">Sonegado</th>
                          <th className="p-3 font-bold text-right">Não Recuperado</th>
                          <th className="p-3 font-bold text-right">Malha Fina</th>
                          <th className="p-3 font-bold text-right">Prejuízo Social</th>
                          <th className="p-3 font-bold text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMatches.map((m) => {
                          const badge = getModeBadge(m.mode);
                          return (
                            <tr
                              key={m.matchId}
                              onClick={() => {
                                setSelectedMatchId(m.matchId);
                                setViewScope('single');
                              }}
                              className="border-b border-slate-800/60 hover:bg-slate-900/80 transition cursor-pointer"
                            >
                              <td className="p-3">
                                <div className="font-bold text-white">{formatDateTime(m.finishedAtMs)}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Sala {m.roomCode} • {m.playersCount} jog. • {m.roundsVoted} rodadas
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                                  {badge.short}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-emerald-300 flex items-center gap-1">
                                  🏆 {m.winnerName} ({formatCurrency(m.winnerMoney)})
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {m.winnerEvaded ? '⚠️ Sonegou na partida' : '✅ Sempre em dia'}
                                </div>
                              </td>
                              <td className="p-3 text-right font-mono text-rose-300">
                                {formatCurrency(m.totalEvadedAmount)}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-rose-400">
                                {formatCurrency(m.unrecoveredTaxAmount)}
                              </td>
                              <td className="p-3 text-right font-mono text-amber-300">
                                {m.playersCaughtCount || 0} pess. ({m.totalForcedAudits || 0}x)
                              </td>
                              <td className="p-3 text-right font-mono text-red-400">
                                -{formatCurrency(m.totalHarmedFinancialLoss)} ({m.totalHarmedOccurrences || 0}x)
                              </td>
                              <td className="p-3 text-right">
                                <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold text-[11px]">
                                  Abrir ➔
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                selectedMatch && (
                  <div className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <span>Matriz de Resultados da Partida • Sala {selectedMatch.roomCode}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getModeBadge(selectedMatch.mode).cls}`}>
                            {getModeBadge(selectedMatch.mode).label}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Concluída em {formatDateTime(selectedMatch.finishedAtMs)} •{' '}
                          {selectedMatch.finishReason === 'finish_line'
                            ? 'Encerrada por chegada ao fim do tabuleiro'
                            : 'Encerrada manualmente pelo Mediador'}
                        </p>
                      </div>
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Vencedor: {selectedMatch.winnerName} ({formatCurrency(selectedMatch.winnerMoney)})</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/70 text-slate-300">
                            <th className="p-3 font-bold">Jogador / Equipe</th>
                            <th className="p-3 font-bold text-right">Saldo Final</th>
                            <th className="p-3 font-bold text-right">Pagou em Dia</th>
                            <th className="p-3 font-bold text-right">Sonegou</th>
                            <th className="p-3 font-bold text-right">Não Recuperado</th>
                            <th className="p-3 font-bold text-right">Restituição Azul</th>
                            <th className="p-3 font-bold text-right">Pago Ação Fiscal</th>
                            <th className="p-3 font-bold text-right">Casas Prejudicadas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedMatch.playersSummary || []).map((p, idx) => (
                            <tr key={p.id || idx} className="border-b border-slate-800/60 hover:bg-slate-900/50">
                              <td className="p-3 font-bold flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: p.color || '#38bdf8' }}
                                />
                                {idx === 0 && '🏆 '}
                                <span>{p.name}</span>
                              </td>
                              <td className="p-3 text-right font-mono font-black text-emerald-400">
                                {formatCurrency(p.money)}
                              </td>
                              <td className="p-3 text-right text-sky-300 font-mono">
                                {p.taxesPaidCount}x ({formatCurrency(p.taxesPaidAmount)})
                              </td>
                              <td className="p-3 text-right text-rose-300 font-mono">
                                {p.taxesEvadedCount}x ({formatCurrency(p.taxesEvadedAmount)})
                              </td>
                              <td className="p-3 text-right text-rose-400 font-mono font-bold">
                                {p.unrecoveredRedCards || 0}x ({formatCurrency(p.unrecoveredAmount || 0)})
                              </td>
                              <td className="p-3 text-right text-emerald-300 font-mono">
                                +{formatCurrency(p.restitutionTotal)}
                              </td>
                              <td className="p-3 text-right text-amber-300 font-mono">
                                {formatCurrency(p.fiscalActionPaidAmount)}
                              </td>
                              <td className="p-3 text-right text-red-400 font-mono">
                                {p.harmedTilesCount}x (-{formatCurrency(p.harmedIncomeAmount)})
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
