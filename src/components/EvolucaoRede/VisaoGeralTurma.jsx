import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../firebase/config.js';
import { calcularPontuacoes, classificarPerfilRede, FASES, CARACTERISTICAS_REDE } from './constants';
import * as XLSX from 'xlsx';

export default function VisaoGeralTurma({ todosGrupos = [], onSelecionarGrupo }) {
    const [dadosTodosGrupos, setDadosTodosGrupos] = useState({});
    const [loading, setLoading] = useState(true);
    const [subAba, setSubAba] = useState('corrida'); // 'corrida' | 'caminhos' | 'governanca' | 'tabela'
    const [faseDebateIdx, setFaseDebateIdx] = useState(0); // 0 a 3 para o Mural de Governança
    const [filtroTabela, setFiltroTabela] = useState('lancados'); // 'lancados' | 'em_andamento' | 'todos'

    // Sincronizar dados em tempo real do Firestore
    useEffect(() => {
        const colRef = collection(db, `artifacts/${appId}/public/data/rede_evolucao`);
        const unsubscribe = onSnapshot(colRef, (snapshot) => {
            const mapa = {};
            snapshot.forEach((doc) => {
                mapa[doc.id] = doc.data();
            });
            setDadosTodosGrupos(mapa);
            setLoading(false);
        }, (err) => {
            console.error("Erro ao carregar visão geral da turma:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Processamento e consolidação de métricas por grupo
    const gruposProcessados = useMemo(() => {
        return todosGrupos.map((grupo) => {
            const dados = dadosTodosGrupos[grupo.id] || {};
            const decisoes = dados.decisoes || {};
            const justificativas = dados.justificativas || {};
            const acoes = dados.acoesMitigacao || {};
            const pontuacoes = calcularPontuacoes(decisoes);
            const perfil = classificarPerfilRede(pontuacoes, decisoes);
            const qtdConcluida = Object.keys(decisoes).filter(k => !!decisoes[k]).length;
            const status = dados.status || (qtdConcluida === 4 ? 'finalizado' : 'em_andamento');

            return {
                id: grupo.id,
                nome: grupo.nome,
                dados,
                decisoes,
                justificativas,
                acoes,
                pontuacoes,
                perfil,
                qtdConcluida,
                status,
                tempoMeses: pontuacoes.tempoTotalMeses
            };
        });
    }, [todosGrupos, dadosTodosGrupos]);

    // Grupos que efetivamente concluíram o lançamento (todas as 4 etapas respondidas)
    const gruposLancados = useMemo(() => {
        return gruposProcessados.filter(g => g.qtdConcluida === 4);
    }, [gruposProcessados]);

    // Grupos que ainda não lançaram (em andamento ou pendentes)
    const gruposEmAndamento = useMemo(() => {
        return gruposProcessados.filter(g => g.qtdConcluida < 4);
    }, [gruposProcessados]);

    // Grupos ordenados por Time-to-Market (menor tempo primeiro) - APENAS OS QUE JÁ LANÇARAM
    const rankingLancamento = useMemo(() => {
        return [...gruposLancados].sort((a, b) => a.tempoMeses - b.tempoMeses);
    }, [gruposLancados]);

    // Métricas estatísticas agregadas da turma - CALCULADAS EXCLUSIVAMENTE SOBRE OS QUE LANÇARAM
    const metricasTurma = useMemo(() => {
        if (gruposLancados.length === 0) {
            return {
                totalGrupos: todosGrupos.length,
                totalLancados: 0,
                totalEmAndamento: gruposEmAndamento.length,
                mediaMeses: null,
                maisRapido: null,
                maisMaduro: null
            };
        }

        const somaMeses = gruposLancados.reduce((acc, g) => acc + g.tempoMeses, 0);
        const mediaMeses = Math.round((somaMeses / gruposLancados.length) * 10) / 10;
        const ordenados = [...gruposLancados].sort((a, b) => a.tempoMeses - b.tempoMeses);

        return {
            totalGrupos: todosGrupos.length,
            totalLancados: gruposLancados.length,
            totalEmAndamento: gruposEmAndamento.length,
            mediaMeses,
            maisRapido: ordenados[0],
            maisMaduro: ordenados[ordenados.length - 1]
        };
    }, [gruposLancados, gruposEmAndamento, todosGrupos]);

    // Grupos exibidos na sub-aba de auditoria conforme o filtro selecionado
    const gruposExibidosTabela = useMemo(() => {
        if (filtroTabela === 'lancados') return gruposLancados;
        if (filtroTabela === 'em_andamento') return gruposEmAndamento;
        return gruposProcessados;
    }, [filtroTabela, gruposLancados, gruposEmAndamento, gruposProcessados]);

    // Exportação Consolidada para Planilha (Aba de Lançados e Aba de Em Andamento)
    const handleExportarConsolidado = () => {
        const mapearLinha = (item) => {
            const { nome, pontuacoes, decisoes, acoes, justificativas, dados } = item;

            return {
                'Grupo': nome,
                'Status': item.qtdConcluida === 4 ? 'Lançado (Concluído)' : `${item.qtdConcluida}/4 Etapas`,
                'Time-to-Market (Meses)': pontuacoes.tempoTotalMeses,
                'Janela Competitiva': pontuacoes.janela?.badge || '-',
                'Total Gargalos Estruturais': pontuacoes.totalGargalos,
                'Total Assimetrias de Rede': pontuacoes.totalAssimetrias,
                'Total Rigidezes Relacionais': pontuacoes.totalRigidezes,
                'Fase 1 (Hardware)': decisoes.fase1 || 'Pendente',
                'Governança F1': acoes.fase1 || '-',
                'Justificativa F1': justificativas.fase1 || '-',
                'Fase 2 (Software)': decisoes.fase2 || 'Pendente',
                'Governança F2': acoes.fase2 || '-',
                'Justificativa F2': justificativas.fase2 || '-',
                'Fase 3 (Distribuição)': decisoes.fase3 || 'Pendente',
                'Governança F3': acoes.fase3 || '-',
                'Justificativa F3': justificativas.fase3 || '-',
                'Fase 4 (Go-to-Market)': decisoes.fase4 || 'Pendente',
                'Governança F4': acoes.fase4 || '-',
                'Justificativa F4': justificativas.fase4 || '-',
                'Última Atualização': dados.dataAtualizacao || '-'
            };
        };

        const workbook = XLSX.utils.book_new();
        const linhasLancados = gruposLancados.map(mapearLinha);
        const wsLancados = XLSX.utils.json_to_sheet(linhasLancados);
        XLSX.utils.book_append_sheet(workbook, wsLancados, "Grupos_Lancados");

        if (gruposEmAndamento.length > 0) {
            const linhasEmAndamento = gruposEmAndamento.map(mapearLinha);
            const wsEmAndamento = XLSX.utils.json_to_sheet(linhasEmAndamento);
            XLSX.utils.book_append_sheet(workbook, wsEmAndamento, "Em_Andamento");
        }

        XLSX.writeFile(workbook, `Evolucao_Rede_Consolidado_Turma_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    if (loading) {
        return (
            <div className="bg-gray-800/80 rounded-2xl border border-gray-700 p-12 text-center text-gray-400 text-sm">
                <span className="animate-pulse">Carregando dados da turma...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            
            {/* 1. CABEÇALHO E NAVEGAÇÃO ENTRE VISÕES DO PROFESSOR */}
            <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-750 pb-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-cyan-500/20 text-cyan-400 text-xs font-black uppercase px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                                Painel Docente & Debate
                            </span>
                            <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
                                🚀 {gruposLancados.length} {gruposLancados.length === 1 ? 'grupo lançado' : 'grupos lançados'}
                            </span>
                            {gruposEmAndamento.length > 0 && (
                                <span className="text-xs text-amber-400 font-bold bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-800">
                                    ⏳ {gruposEmAndamento.length} em andamento
                                </span>
                            )}
                            <span className="text-xs text-gray-400 font-semibold">
                                ({todosGrupos.length} no total)
                            </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
                            <span>🧭</span> Panorama Estratégico da Turma: Evolução de Rede
                        </h3>
                        <p className="text-xs text-gray-300 mt-1 max-w-3xl leading-relaxed">
                            Todas as equipes partiram da <strong>mesma linha de base (18 meses e arquitetura convencional H1)</strong>. A análise comparativa abaixo considera exclusivamente os <strong>grupos que completaram as 4 etapas e lançaram o produto</strong>, contrastando Time-to-Market, caminhos estruturais e governança.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleExportarConsolidado}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-2 shadow"
                        >
                            <span>📥</span> Exportar Planilha Consolidada
                        </button>
                    </div>
                </div>

                {/* Sub-Tabs de Navegação do Dashboard */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                        type="button"
                        onClick={() => setSubAba('corrida')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                            subAba === 'corrida'
                                ? 'bg-cyan-500 text-gray-950 shadow-lg shadow-cyan-500/20'
                                : 'bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-750 border border-gray-750'
                        }`}
                    >
                        <span>🏁</span> Corrida de Lançamento ({gruposLancados.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubAba('caminhos')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                            subAba === 'caminhos'
                                ? 'bg-cyan-500 text-gray-950 shadow-lg shadow-cyan-500/20'
                                : 'bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-750 border border-gray-750'
                        }`}
                    >
                        <span>🔀</span> Caminhos & Decisões Comparadas
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubAba('governanca')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                            subAba === 'governanca'
                                ? 'bg-cyan-500 text-gray-950 shadow-lg shadow-cyan-500/20'
                                : 'bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-750 border border-gray-750'
                        }`}
                    >
                        <span>🏛️</span> Mural de Governança para Debate
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubAba('tabela')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                            subAba === 'tabela'
                                ? 'bg-cyan-500 text-gray-950 shadow-lg shadow-cyan-500/20'
                                : 'bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-750 border border-gray-750'
                        }`}
                    >
                        <span>📋</span> Tabela de Auditoria
                    </button>
                </div>
            </div>

            {/* 2. CARDS DE AGREGADOS ESTATÍSTICOS DA TURMA (SOMENTE GRUPOS QUE LANÇARAM) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-850 p-4 rounded-2xl border border-gray-750 flex items-center gap-3 shadow">
                    <div className="p-3 bg-cyan-950 text-cyan-400 rounded-xl text-xl border border-cyan-850">
                        ⏱️
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                            Média da Turma (Lançados)
                        </span>
                        <strong className="text-xl font-black text-white">
                            {metricasTurma.mediaMeses !== null ? `${metricasTurma.mediaMeses} meses` : '—'}
                        </strong>
                        <span className="text-[10px] text-gray-400 block">
                            Linha de base H1: 18 meses
                        </span>
                    </div>
                </div>

                <div className="bg-gray-850 p-4 rounded-2xl border border-gray-750 flex items-center gap-3 shadow">
                    <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl text-xl border border-emerald-850">
                        🚀
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                            Lançamento Mais Ágil
                        </span>
                        <strong className="text-xl font-black text-white">
                            {metricasTurma.maisRapido ? `${metricasTurma.maisRapido.tempoMeses} meses` : '—'}
                        </strong>
                        <span className="text-[10px] text-gray-400 block truncate max-w-[140px]">
                            {metricasTurma.maisRapido ? metricasTurma.maisRapido.nome : 'Aguardando'}
                        </span>
                    </div>
                </div>

                <div className="bg-gray-850 p-4 rounded-2xl border border-gray-750 flex items-center gap-3 shadow">
                    <div className="p-3 bg-amber-950 text-amber-400 rounded-xl text-xl border border-amber-850">
                        🛡️
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                            Maior Robustez / Maturidade
                        </span>
                        <strong className="text-xl font-black text-white">
                            {metricasTurma.maisMaduro ? `${metricasTurma.maisMaduro.tempoMeses} meses` : '—'}
                        </strong>
                        <span className="text-[10px] text-gray-400 block truncate max-w-[140px]">
                            {metricasTurma.maisMaduro ? metricasTurma.maisMaduro.nome : 'Aguardando'}
                        </span>
                    </div>
                </div>

                <div className="bg-gray-850 p-4 rounded-2xl border border-gray-750 flex items-center gap-3 shadow">
                    <div className="p-3 bg-purple-950 text-purple-400 rounded-xl text-xl border border-purple-850">
                        📊
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                            Lançamentos Efetivados
                        </span>
                        <strong className="text-xl font-black text-white">
                            {metricasTurma.totalLancados} de {metricasTurma.totalGrupos}
                        </strong>
                        <span className="text-[10px] text-gray-400 block">
                            {metricasTurma.totalEmAndamento} {metricasTurma.totalEmAndamento === 1 ? 'em andamento' : 'em andamento'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ================================================================ */}
            {/* SUB-ABA 1: CORRIDA DE LANÇAMENTO (TIME-TO-MARKET) */}
            {/* ================================================================ */}
            {subAba === 'corrida' && (
                <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-6">
                    <div className="border-b border-gray-750 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                                <span>🏁</span> Quem Consegue Lançar Primeiro? (Timeline Competitiva)
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Comparativo de cronograma resultante das 4 escolhas. Menor tempo viabiliza pioneirismo; maior tempo prioriza robustez e soberania técnica.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-bold">
                            <span className="flex items-center gap-1 text-cyan-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span> ≤ 13m (Pioneira)
                            </span>
                            <span className="flex items-center gap-1 text-emerald-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span> 14-19m (Seguidor)
                            </span>
                            <span className="flex items-center gap-1 text-amber-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> ≥ 20m (Maturidade)
                            </span>
                        </div>
                    </div>

                    {rankingLancamento.length === 0 ? (
                        <div className="bg-gray-900/60 p-10 rounded-2xl border border-dashed border-gray-700 text-center space-y-3">
                            <span className="text-3xl block">🏁</span>
                            <h5 className="text-white font-bold text-base">Nenhum grupo realizou o lançamento até o momento</h5>
                            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                                Apenas as equipes que completarem as 4 etapas de decisões e definirem sua estratégia de Go-to-Market aparecerão na corrida comparativa.
                                {gruposEmAndamento.length > 0 && ` Atualmente, ${gruposEmAndamento.length} equipe(s) estão com decisões em andamento.`}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {rankingLancamento.map((item, idx) => {
                                const { nome, pontuacoes, qtdConcluida, perfil } = item;
                                const meses = pontuacoes.tempoTotalMeses;
                                const delta = meses - 18;
                                const deltaTexto = delta === 0 ? 'No prazo padrão (18m)' : delta > 0 ? `+${delta}m vs linha de base` : `${delta}m adiantado`;

                                // Percentual para posicionamento visual na barra (escala de 8 a 28 meses)
                                const minEscala = 8;
                                const maxEscala = 28;
                                const percentual = Math.min(100, Math.max(5, ((meses - minEscala) / (maxEscala - minEscala)) * 100));
                                const percentualBase = ((18 - minEscala) / (maxEscala - minEscala)) * 100;

                                const corJanela = meses <= 13
                                    ? { bar: 'bg-cyan-500', badge: 'bg-cyan-950 text-cyan-300 border-cyan-700', texto: 'text-cyan-400' }
                                    : meses <= 19
                                    ? { bar: 'bg-emerald-500', badge: 'bg-emerald-950 text-emerald-300 border-emerald-700', texto: 'text-emerald-400' }
                                    : { bar: 'bg-amber-500', badge: 'bg-amber-950 text-amber-300 border-amber-700', texto: 'text-amber-400' };

                                return (
                                    <div
                                        key={item.id}
                                        className="bg-gray-900/90 p-4 sm:p-5 rounded-2xl border border-gray-750 hover:border-gray-600 transition space-y-3"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                                                    idx === 0
                                                        ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/30'
                                                        : idx === 1
                                                        ? 'bg-gray-300 text-gray-950'
                                                        : idx === 2
                                                        ? 'bg-amber-700 text-white'
                                                        : 'bg-gray-800 text-gray-400'
                                                }`}>
                                                    #{idx + 1}
                                                </span>
                                                <div>
                                                    <h5 className="text-sm sm:text-base font-black text-white leading-tight">
                                                        {nome}
                                                    </h5>
                                                    <span className="text-[10px] text-gray-400">
                                                        {qtdConcluida === 4 ? 'Jornada Completa' : `${qtdConcluida}/4 Etapas respondidas`}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${corJanela.badge}`}>
                                                    {pontuacoes.janela?.badge}
                                                </span>
                                                <span className="text-base sm:text-lg font-black text-white px-2">
                                                    {meses} meses
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => onSelecionarGrupo(item.id)}
                                                    className="text-xs bg-gray-800 hover:bg-gray-700 text-cyan-400 font-bold px-3 py-1.5 rounded-lg border border-gray-700 transition"
                                                >
                                                    Auditar →
                                                </button>
                                            </div>
                                        </div>

                                        {/* Barra Visual da Linha do Tempo */}
                                        <div className="space-y-1 pt-1">
                                            <div className="relative w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-750">
                                                {/* Marca da Linha de Base (18 meses) */}
                                                <div
                                                    className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
                                                    style={{ left: `${percentualBase}%` }}
                                                    title="Linha de Base da Indústria (18 meses)"
                                                />
                                                {/* Barra de Progresso do Grupo */}
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${corJanela.bar}`}
                                                    style={{ width: `${percentual}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-gray-400 px-0.5">
                                                <span>8m (Mínimo Teórico)</span>
                                                <span className="text-gray-300 font-bold flex items-center gap-1">
                                                    <span>▲</span> Linha de Base H1 (18m)
                                                </span>
                                                <span>28m (Máximo Teórico)</span>
                                            </div>
                                        </div>

                                        {/* Síntese Estratégica do Trade-off do Grupo */}
                                        <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
                                            <span className="font-medium">
                                                💡 {perfil.resumo?.slice(0, 160)}...
                                            </span>
                                            <span className={`text-[11px] font-bold ${corJanela.texto} flex-shrink-0`}>
                                                {deltaTexto}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Aviso informativo de equipes em andamento */}
                    {rankingLancamento.length > 0 && gruposEmAndamento.length > 0 && (
                        <div className="p-3.5 bg-gray-900/60 rounded-xl border border-gray-750 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-400">
                            <span>
                                ℹ️ <strong>{gruposEmAndamento.length} {gruposEmAndamento.length === 1 ? 'equipe' : 'equipes'}</strong> ainda não {gruposEmAndamento.length === 1 ? 'concluiu' : 'concluíram'} o lançamento e {gruposEmAndamento.length === 1 ? 'foi desconsiderada' : 'foram desconsideradas'} deste ranking comparativo.
                            </span>
                            <button
                                type="button"
                                onClick={() => { setSubAba('tabela'); setFiltroTabela('em_andamento'); }}
                                className="text-cyan-400 hover:text-cyan-300 font-bold underline text-left sm:text-right"
                            >
                                Ver equipes em andamento na Auditoria →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ================================================================ */}
            {/* SUB-ABA 2: CAMINHOS DISTINTOS (MATRIZ COMPARATIVA DE ESCOLHAS) */}
            {/* ================================================================ */}
            {subAba === 'caminhos' && (
                <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-6">
                    <div className="border-b border-gray-750 pb-3">
                        <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                            <span>🔀</span> Matriz de Caminhos Estratégicos: Quem Escolheu o Quê?
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Mesmo grupos que alcançam cronogramas semelhantes podem ter trilhado rotas completamente opostas de arquitetura, parceiros e canais. (Exibindo exclusivamente as escolhas dos grupos que já lançaram).
                        </p>
                    </div>

                    {gruposLancados.length === 0 ? (
                        <div className="bg-gray-900/60 p-10 rounded-2xl border border-dashed border-gray-700 text-center space-y-3">
                            <span className="text-3xl block">🔀</span>
                            <h5 className="text-white font-bold text-base">Aguardando conclusões de lançamento</h5>
                            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                                A matriz comparativa de caminhos consolida a trajetória de 4 fases dos grupos que já lançaram.
                                {gruposEmAndamento.length > 0 && ` Atualmente, ${gruposEmAndamento.length} equipe(s) estão em andamento.`}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-300">
                                <thead className="bg-gray-900 text-gray-400 uppercase font-bold text-[10px] tracking-wider">
                                    <tr>
                                        <th className="p-3">Grupo</th>
                                        <th className="p-3 text-center">Tempo Final</th>
                                        <th className="p-3">F1: Hardware</th>
                                        <th className="p-3">F2: Software</th>
                                        <th className="p-3">F3: Canais</th>
                                        <th className="p-3">F4: Go-to-Market</th>
                                        <th className="p-3 text-center">Rede Gerada</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-750/70">
                                    {gruposLancados.map((item) => {
                                        const { decisoes, pontuacoes } = item;

                                        const getOpcao = (faseChave) => {
                                            const fase = FASES.find(f => f.chave === faseChave);
                                            const opId = decisoes[faseChave];
                                            return fase?.opcoes.find(o => o.id === opId) || null;
                                        };

                                        const op1 = getOpcao('fase1');
                                        const op2 = getOpcao('fase2');
                                        const op3 = getOpcao('fase3');
                                        const op4 = getOpcao('fase4');

                                        return (
                                            <tr key={item.id} className="hover:bg-gray-750/50 transition">
                                                <td className="p-3 font-bold text-white whitespace-nowrap">
                                                    {item.nome}
                                                </td>
                                                <td className="p-3 text-center whitespace-nowrap">
                                                    <span className="font-black text-white text-sm block">
                                                        {pontuacoes.tempoTotalMeses}m
                                                    </span>
                                                    <span className="text-[9px] uppercase font-semibold text-gray-400 block">
                                                        {pontuacoes.janela?.tipo}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    {op1 ? (
                                                        <span className="px-2 py-1 rounded bg-gray-900 text-cyan-300 border border-gray-750 text-[11px] font-bold block truncate max-w-[180px]" title={op1.titulo}>
                                                            {op1.letra} - {op1.arquetipo}
                                                        </span>
                                                    ) : <span className="text-gray-500 italic">Pendente</span>}
                                                </td>
                                                <td className="p-3">
                                                    {op2 ? (
                                                        <span className="px-2 py-1 rounded bg-gray-900 text-emerald-300 border border-gray-750 text-[11px] font-bold block truncate max-w-[180px]" title={op2.titulo}>
                                                            {op2.letra} - {op2.arquetipo}
                                                        </span>
                                                    ) : <span className="text-gray-500 italic">Pendente</span>}
                                                </td>
                                                <td className="p-3">
                                                    {op3 ? (
                                                        <span className="px-2 py-1 rounded bg-gray-900 text-purple-300 border border-gray-750 text-[11px] font-bold block truncate max-w-[180px]" title={op3.titulo}>
                                                            {op3.letra} - {op3.arquetipo}
                                                        </span>
                                                    ) : <span className="text-gray-500 italic">Pendente</span>}
                                                </td>
                                                <td className="p-3">
                                                    {op4 ? (
                                                        <span className="px-2 py-1 rounded bg-gray-900 text-amber-300 border border-gray-750 text-[11px] font-bold block truncate max-w-[180px]" title={op4.titulo}>
                                                            {op4.letra} - {op4.arquetipo}
                                                        </span>
                                                    ) : <span className="text-gray-500 italic">Pendente</span>}
                                                </td>
                                                <td className="p-3 text-center whitespace-nowrap">
                                                    <span className="text-[10px] font-bold text-gray-300 bg-gray-900 px-2 py-0.5 rounded border border-gray-700">
                                                        ⛓️ {pontuacoes.totalGargalos} • ⚖️ {pontuacoes.totalAssimetrias + pontuacoes.totalRigidezes}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ================================================================ */}
            {/* SUB-ABA 3: MURAL DE GOVERNANÇA (DEBATE EM SALA DE AULA) */}
            {/* ================================================================ */}
            {subAba === 'governanca' && (
                <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-6">
                    <div className="border-b border-gray-750 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h4 className="text-base font-extrabold text-amber-400 flex items-center gap-2">
                                <span>🏛️</span> Mural de Governança da Turma (Dilema por Etapa)
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Selecione uma etapa abaixo para contrastar as ações de governança formuladas por cada equipe para aquele mesmo desafio de rede. (Grupos que lançaram).
                            </p>
                        </div>

                        {/* Seletor de Fase para Debate */}
                        <div className="flex flex-wrap items-center gap-2 bg-gray-900 p-1.5 rounded-xl border border-gray-750">
                            {FASES.map((f, idx) => (
                                <button
                                    key={f.faseId}
                                    type="button"
                                    onClick={() => setFaseDebateIdx(idx)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        faseDebateIdx === idx
                                            ? 'bg-amber-500 text-gray-950 shadow font-black'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Fase {idx + 1}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Destaque do Desafio da Fase Selecionada */}
                    {(() => {
                        const faseAtual = FASES[faseDebateIdx];
                        return (
                            <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-750 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider bg-amber-950 text-amber-300 px-2.5 py-0.5 rounded border border-amber-800">
                                        Etapa {faseAtual.faseId} de 4
                                    </span>
                                    <strong className="text-sm font-bold text-white">
                                        {faseAtual.titulo} — {faseAtual.subtitulo}
                                    </strong>
                                </div>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    💡 <strong>Dilema:</strong> {faseAtual.contexto}
                                </p>
                            </div>
                        );
                    })()}

                    {/* Grid Comparativo de Ações de Governança dos Grupos para a Fase */}
                    {gruposLancados.length === 0 ? (
                        <div className="bg-gray-900/60 p-10 rounded-2xl border border-dashed border-gray-700 text-center space-y-3">
                            <span className="text-3xl block">🏛️</span>
                            <h5 className="text-white font-bold text-base">Nenhum grupo concluiu o lançamento ainda</h5>
                            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                                O mural de governança para debate reunirá as propostas das equipes que concluíram as 4 etapas da simulação.
                                {gruposEmAndamento.length > 0 && ` Atualmente, ${gruposEmAndamento.length} equipe(s) estão em andamento.`}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {gruposLancados.map((item) => {
                                const faseAtual = FASES[faseDebateIdx];
                                const opcaoId = item.decisoes[faseAtual.chave];
                                const opcao = faseAtual.opcoes.find(o => o.id === opcaoId);
                                const acao = item.acoes[faseAtual.chave];
                                const justificativa = item.justificativas[faseAtual.chave];

                                return (
                                    <div
                                        key={item.id}
                                        className="bg-gray-900/90 p-4 rounded-2xl border border-gray-750 space-y-3 flex flex-col justify-between shadow"
                                    >
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                                                <strong className="text-sm font-black text-white">
                                                    {item.nome}
                                                </strong>
                                                {opcao ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-cyan-300 border border-gray-700">
                                                        Opção {opcao.letra} ({opcao.arquetipo})
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-500 italic">Decisão Pendente</span>
                                                )}
                                            </div>

                                            {/* Ação de Governança em Destaque */}
                                            <div className="bg-gray-950/70 p-3 rounded-xl border border-gray-800 space-y-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block flex items-center gap-1">
                                                    <span>🎯</span> Ação de Governança Proposta:
                                                </span>
                                                <p className="text-xs text-gray-200 leading-relaxed italic">
                                                    {acao ? `"${acao}"` : <span className="text-gray-500">Nenhuma ação redigida até o momento.</span>}
                                                </p>
                                            </div>

                                            {/* Justificativa da Equipe */}
                                            {justificativa && (
                                                <div className="space-y-0.5 text-xs text-gray-400">
                                                    <span className="text-[10px] font-bold text-gray-400 block">
                                                        📝 Justificativa Estratégica:
                                                    </span>
                                                    <p className="text-[11px] text-gray-300 leading-snug line-clamp-2">
                                                        "{justificativa}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400">
                                            <span>Time-to-Market Total: <strong>{item.pontuacoes.tempoTotalMeses}m</strong></span>
                                            <button
                                                type="button"
                                                onClick={() => onSelecionarGrupo(item.id)}
                                                className="text-cyan-400 hover:text-white font-bold underline"
                                            >
                                                Ver Dossiê Completo
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ================================================================ */}
            {/* SUB-ABA 4: TABELA COMPLETA DE AUDITORIA */}
            {/* ================================================================ */}
            {subAba === 'tabela' && (
                <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-6">
                    <div className="border-b border-gray-750 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                                <span>📋</span> Auditoria Geral de Respostas e Prazos
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Registros detalhados de submissões de cada grupo com acesso individualizado.
                            </p>
                        </div>

                        {/* Filtros da Tabela de Auditoria */}
                        <div className="flex items-center gap-1.5 bg-gray-900 p-1 rounded-xl border border-gray-750 text-xs flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setFiltroTabela('lancados')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                                    filtroTabela === 'lancados'
                                        ? 'bg-emerald-600 text-white font-black shadow'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Lançados ({gruposLancados.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFiltroTabela('em_andamento')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                                    filtroTabela === 'em_andamento'
                                        ? 'bg-amber-600 text-white font-black shadow'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Em Andamento ({gruposEmAndamento.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFiltroTabela('todos')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                                    filtroTabela === 'todos'
                                        ? 'bg-cyan-600 text-white font-black shadow'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Todos ({gruposProcessados.length})
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-300">
                            <thead className="bg-gray-900 text-gray-400 uppercase font-bold text-[10px] tracking-wider">
                                <tr>
                                    <th className="p-3">Grupo</th>
                                    <th className="p-3 text-center">Progresso</th>
                                    <th className="p-3 text-center">Time-to-Market</th>
                                    <th className="p-3 text-center">Janela Competitiva</th>
                                    <th className="p-3 text-center">Gargalos</th>
                                    <th className="p-3 text-center">Assimetrias/Rigidez</th>
                                    <th className="p-3 text-center">Planos de Governança</th>
                                    <th className="p-3 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/60">
                                {gruposExibidosTabela.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-gray-500 italic">
                                            Nenhum grupo encontrado para o filtro "{filtroTabela === 'lancados' ? 'Lançados' : filtroTabela === 'em_andamento' ? 'Em Andamento' : 'Todos'}".
                                        </td>
                                    </tr>
                                ) : (
                                    gruposExibidosTabela.map((item) => {
                                        const totalAcoesPreenchidas = ['fase1', 'fase2', 'fase3', 'fase4'].filter(k => !!item.acoes[k]?.trim()).length;

                                        return (
                                            <tr key={item.id} className="hover:bg-gray-750 transition">
                                                <td className="p-3 font-bold text-white whitespace-nowrap">
                                                    {item.nome}
                                                </td>
                                                <td className="p-3 text-center whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                                        item.qtdConcluida === 4
                                                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                                            : 'bg-gray-900 text-cyan-400 border-gray-700'
                                                    }`}>
                                                        {item.qtdConcluida === 4 ? 'Lançado (4/4)' : `${item.qtdConcluida} / 4`}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center font-black text-white whitespace-nowrap">
                                                    {item.pontuacoes.tempoTotalMeses} meses
                                                </td>
                                                <td className="p-3 text-center whitespace-nowrap">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.pontuacoes.janela?.corBg || 'bg-gray-900 text-gray-300'}`}>
                                                        {item.pontuacoes.janela?.badge}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center font-bold text-blue-400 whitespace-nowrap">
                                                    {item.pontuacoes.totalGargalos}
                                                </td>
                                                <td className="p-3 text-center font-bold text-purple-400 whitespace-nowrap">
                                                    {item.pontuacoes.totalAssimetrias + item.pontuacoes.totalRigidezes}
                                                </td>
                                                <td className="p-3 text-center whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                        totalAcoesPreenchidas === 4
                                                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                                            : totalAcoesPreenchidas > 0
                                                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                                                            : 'bg-gray-900 text-gray-500 border border-gray-700'
                                                    }`}>
                                                        {totalAcoesPreenchidas} / 4 registradas
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => onSelecionarGrupo(item.id)}
                                                        className="bg-cyan-900/60 hover:bg-cyan-800 text-cyan-400 font-bold px-3 py-1.5 rounded-lg text-xs transition border border-cyan-700/50"
                                                    >
                                                        Auditar Grupo →
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    );
}
