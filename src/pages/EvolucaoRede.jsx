import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, appId, auth } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';
import { FASES, PONTOS_INICIAIS, calcularPontuacoes, classificarPerfilRede, calcularImpactoOpcao } from '../components/EvolucaoRede/constants';
import CardIndicadores from '../components/EvolucaoRede/CardIndicadores';
import FaseDecisao from '../components/EvolucaoRede/FaseDecisao';
import DiagnosticoFinal from '../components/EvolucaoRede/DiagnosticoFinal';
import VisaoGeralTurma from '../components/EvolucaoRede/VisaoGeralTurma';
import * as XLSX from 'xlsx';

export default function EvolucaoRede({ perfilUsuario }) {
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [activeTab, setActiveTab] = useState('simulador'); // 'simulador' | 'visao_turma'
    const [faseAtualIdx, setFaseAtualIdx] = useState(0); // 0 a 3 (Fases 1 a 4) ou 4 (Diagnóstico)
    const [mostrarContextoCase, setMostrarContextoCase] = useState(true);

    // Dados da simulação do grupo
    const [dadosSimulacao, setDadosSimulacao] = useState({
        decisoes: {},
        justificativas: {},
        acoesMitigacao: {},
        status: 'em_andamento'
    });
    const [salvando, setSalvando] = useState(false);
    const [mensagemStatus, setMensagemStatus] = useState('');

    const usuarioId = auth.currentUser?.uid;

    // Buscar lista de grupos
    const { documents: todosGruposData, isLoading: isGruposLoading } = useCollection(`/artifacts/${appId}/public/data/grupos`);
    const todosGrupos = todosGruposData || [];

    const isProfessorOuAdmin = perfilUsuario?.papel === 'admin' || perfilUsuario?.papel === 'professor';

    // Filtrar grupos do usuário
    const meusGrupos = useMemo(() => {
        if (!perfilUsuario) return [];
        if (isProfessorOuAdmin) {
            return todosGrupos;
        }
        return todosGrupos.filter(grupo => grupo.integrantesIds?.includes(usuarioId));
    }, [todosGrupos, usuarioId, perfilUsuario, isProfessorOuAdmin]);

    // Auto-selecionar grupo
    useEffect(() => {
        if (meusGrupos.length === 1 && !selectedGroupId) {
            setSelectedGroupId(meusGrupos[0].id);
        }
    }, [meusGrupos, selectedGroupId]);

    const grupoSelecionado = useMemo(() => {
        return todosGrupos.find(g => g.id === selectedGroupId) || null;
    }, [todosGrupos, selectedGroupId]);

    // Escutar dados do grupo no Firestore
    useEffect(() => {
        if (!selectedGroupId) {
            setDadosSimulacao({ decisoes: {}, justificativas: {}, acoesMitigacao: {}, status: 'em_andamento' });
            return;
        }

        const docRef = doc(db, `artifacts/${appId}/public/data/rede_evolucao`, selectedGroupId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setDadosSimulacao({
                    decisoes: data.decisoes || {},
                    justificativas: data.justificativas || {},
                    acoesMitigacao: data.acoesMitigacao || {},
                    status: data.status || 'em_andamento'
                });
            } else {
                setDadosSimulacao({ decisoes: {}, justificativas: {}, acoesMitigacao: {}, status: 'em_andamento' });
            }
        }, (err) => {
            console.error("Erro ao sincronizar evolução de rede:", err);
        });

        return () => unsubscribe();
    }, [selectedGroupId]);

    // Calcular pontuações dinâmicas
    const pontuacoes = useMemo(() => {
        return calcularPontuacoes(dadosSimulacao.decisoes);
    }, [dadosSimulacao.decisoes]);

    // Salvar alteração no Firestore
    const salvarDados = async (novasDecisoes, novasJustificativas, novoStatus = 'em_andamento', novasAcoesMitigacao = null) => {
        if (!selectedGroupId) return;
        setSalvando(true);
        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/rede_evolucao`, selectedGroupId);
            const ponts = calcularPontuacoes(novasDecisoes);
            const mitigacaoParaSalvar = novasAcoesMitigacao !== null ? novasAcoesMitigacao : (dadosSimulacao.acoesMitigacao || {});

            await setDoc(docRef, {
                grupoId: selectedGroupId,
                grupoNome: grupoSelecionado?.nome || 'Grupo',
                decisoes: novasDecisoes,
                justificativas: novasJustificativas,
                acoesMitigacao: mitigacaoParaSalvar,
                status: novoStatus,
                pontuacaoFinal: {
                    caixa: ponts.caixa,
                    controle: ponts.controle,
                    agilidade: ponts.agilidade
                },
                altaExposicao: {
                    caixa: ponts.altaExposicaoCaixa,
                    controle: ponts.altaExposicaoControle,
                    agilidade: ponts.altaExposicaoAgilidade
                },
                atualizadoPor: perfilUsuario?.nome || 'Anônimo',
                dataAtualizacao: new Date().toLocaleString('pt-BR'),
                atualizadoEm: serverTimestamp()
            }, { merge: true });

            setMensagemStatus('Alterações salvas com sucesso!');
            setTimeout(() => setMensagemStatus(''), 3000);
        } catch (err) {
            console.error("Erro ao salvar dados da simulação:", err);
            setMensagemStatus('Erro ao salvar dados.');
        } finally {
            setSalvando(false);
        }
    };

    const handleAtualizarAcaoMitigacao = (campo, texto) => {
        setDadosSimulacao(prev => ({
            ...prev,
            acoesMitigacao: {
                ...prev.acoesMitigacao,
                [campo]: texto
            }
        }));
    };

    const handleSalvarAcoesMitigacao = () => {
        salvarDados(dadosSimulacao.decisoes, dadosSimulacao.justificativas, 'finalizado', dadosSimulacao.acoesMitigacao);
    };

    // Handlers da Esteira de Decisão
    const handleEscolherDecisao = (opcaoId) => {
        const faseAtual = FASES[faseAtualIdx];
        if (!faseAtual) return;

        const novasDecisoes = {
            ...dadosSimulacao.decisoes,
            [faseAtual.chave]: opcaoId
        };

        setDadosSimulacao(prev => ({ ...prev, decisoes: novasDecisoes }));
        salvarDados(novasDecisoes, dadosSimulacao.justificativas, dadosSimulacao.status);
    };

    const handleAtualizarJustificativa = (texto) => {
        const faseAtual = FASES[faseAtualIdx];
        if (!faseAtual) return;

        const novasJustificativas = {
            ...dadosSimulacao.justificativas,
            [faseAtual.chave]: texto
        };

        setDadosSimulacao(prev => ({ ...prev, justificativas: novasJustificativas }));
    };

    const handleAvancarFase = () => {
        const faseAtual = FASES[faseAtualIdx];
        // Persistir justificativa e ação de governança ao avançar
        salvarDados(
            dadosSimulacao.decisoes, 
            dadosSimulacao.justificativas, 
            faseAtualIdx === 3 ? 'finalizado' : 'em_andamento', 
            dadosSimulacao.acoesMitigacao
        );

        if (faseAtualIdx < 4) {
            setFaseAtualIdx(faseAtualIdx + 1);
        }
    };

    const handleVoltarFase = (destinoIdx) => {
        if (typeof destinoIdx === 'number') {
            setFaseAtualIdx(destinoIdx);
        } else if (faseAtualIdx > 0) {
            setFaseAtualIdx(faseAtualIdx - 1);
        }
    };

    const handleReiniciarSimulacao = async () => {
        if (!window.confirm("Atenção: deseja reiniciar todas as 4 decisões deste grupo? As respostas e planos de governança serão redefinidos.")) {
            return;
        }

        const decisoesLimpas = {};
        const justificativasLimpas = {};
        const acoesLimpas = {};
        setDadosSimulacao({ decisoes: decisoesLimpas, justificativas: justificativasLimpas, acoesMitigacao: acoesLimpas, status: 'em_andamento' });
        await salvarDados(decisoesLimpas, justificativasLimpas, 'em_andamento', acoesLimpas);
        setFaseAtualIdx(0);
    };

    const handleExportarExcelGrupo = () => {
        if (!grupoSelecionado) return;

        const perfil = classificarPerfilRede(pontuacoes, dadosSimulacao.decisoes);

        const dadosFases = FASES.map(fase => {
            const escolhaId = dadosSimulacao.decisoes[fase.chave];
            const opcao = fase.opcoes.find(o => o.id === escolhaId);
            return {
                'Fase': fase.titulo,
                'Decisão Escolhida': opcao ? `${opcao.letra} - ${opcao.titulo}` : 'Pendente',
                'Arquétipo': opcao ? opcao.arquetipo : '-',
                'Impacto Time-to-Market': opcao ? `${opcao.deltaMeses > 0 ? '+' : ''}${opcao.deltaMeses} meses` : '-',
                'Parecer Técnico': opcao ? opcao.diagnostico : '-',
                'Ação de Governança da Rede': dadosSimulacao.acoesMitigacao[fase.chave] || 'Não preenchido',
                'Justificativa do Grupo': dadosSimulacao.justificativas[fase.chave] || '-'
            };
        });

        const resumo = [
            { 'Item': 'Grupo', 'Valor': grupoSelecionado.nome },
            { 'Item': 'Time-to-Market Total', 'Valor': `${pontuacoes.tempoTotalMeses} meses` },
            { 'Item': 'Janela de Entrada no Mercado', 'Valor': pontuacoes.janela?.badge || '-' },
            { 'Item': 'Diagnóstico Estratégico', 'Valor': perfil.titulo },
            { 'Item': 'Total de Gargalos Estruturais Ativados', 'Valor': pontuacoes.totalGargalos },
            { 'Item': 'Total de Assimetrias de Rede Ativadas', 'Valor': pontuacoes.totalAssimetrias },
            { 'Item': 'Total de Rigidezes Relacionais Ativadas', 'Valor': pontuacoes.totalRigidezes }
        ];

        const dadosCaracteristicas = (pontuacoes.caracteristicasConsolidadas || []).map(item => ({
            'Fase de Origem': item.faseTitulo,
            'Opção': item.opcaoId,
            'Característica': item.caracteristicaId,
            'Efeito Estrutural': item.efeito
        }));

        const wb = XLSX.utils.book_new();
        const wsResumo = XLSX.utils.json_to_sheet(resumo);
        const wsFases = XLSX.utils.json_to_sheet(dadosFases);
        const wsCaracteristicas = XLSX.utils.json_to_sheet(dadosCaracteristicas);

        XLSX.utils.book_append_sheet(wb, wsResumo, "Dossiê Executivo");
        XLSX.utils.book_append_sheet(wb, wsFases, "Decisões e Governança");
        XLSX.utils.book_append_sheet(wb, wsCaracteristicas, "Mapa Estrutural da Rede");

        XLSX.writeFile(wb, `Evolucao_Rede_${grupoSelecionado.nome.replace(/\s+/g, '_')}.xlsx`);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Top Bar: Seleção de Grupo e Tabs de Professor */}
            <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white">Evolução de Rede: Case Smartphones Dobráveis</h2>
                        <p className="text-xs text-gray-400">Simulador de decisões estratégicas de transição H1 (Convencional) para H2 (Disrupção)</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Tabs se for Admin/Professor */}
                    {isProfessorOuAdmin && (
                        <div className="bg-gray-900 p-1 rounded-xl border border-gray-700 flex text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setActiveTab('simulador')}
                                className={`px-3 py-1.5 rounded-lg transition ${
                                    activeTab === 'simulador' ? 'bg-cyan-500 text-gray-950 shadow' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Simulador do Grupo
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('visao_turma')}
                                className={`px-3 py-1.5 rounded-lg transition ${
                                    activeTab === 'visao_turma' ? 'bg-cyan-500 text-gray-950 shadow' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Visão da Turma
                            </button>
                        </div>
                    )}

                    {/* Dropdown de Grupo */}
                    {activeTab === 'simulador' && (
                        <div className="flex-1 md:flex-initial min-w-[220px]">
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:border-cyan-400"
                            >
                                <option value="">-- Selecione o Grupo --</option>
                                {meusGrupos.map(g => (
                                    <option key={g.id} value={g.id}>{g.nome}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Notificação de Status de Salvamento */}
            {mensagemStatus && (
                <div className="bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-bold px-4 py-2 rounded-xl text-center shadow animate-fade-in">
                    {mensagemStatus}
                </div>
            )}

            {/* ABA 1: VISÃO DA TURMA (EXCLUSIVA PROFESSOR/ADMIN) */}
            {activeTab === 'visao_turma' && isProfessorOuAdmin && (
                <VisaoGeralTurma
                    todosGrupos={todosGrupos}
                    onSelecionarGrupo={(id) => {
                        setSelectedGroupId(id);
                        setActiveTab('simulador');
                    }}
                />
            )}

            {/* ABA 2: SIMULADOR DO GRUPO */}
            {activeTab === 'simulador' && (
                <>
                    {!selectedGroupId ? (
                        <div className="bg-gray-800/50 border border-gray-700 p-12 text-center rounded-2xl">
                            <p className="text-gray-400 text-base font-bold">Por favor, selecione um grupo acima para carregar o simulador de evolução de rede.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Banner Contextual do Case (Colapsável) */}
                            <div className="bg-gradient-to-r from-gray-800 via-gray-800 to-gray-850 rounded-2xl border border-gray-700 p-5 shadow-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                                        <span>📱</span> Case Estratégico: Fabricante de Smartphones (Transição H1 → H2)
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setMostrarContextoCase(!mostrarContextoCase)}
                                        className="text-xs text-gray-400 hover:text-white font-semibold flex items-center gap-1"
                                    >
                                        {mostrarContextoCase ? 'Ocultar Detalhes ▲' : 'Ver Detalhes ▼'}
                                    </button>
                                </div>

                                {mostrarContextoCase && (
                                    <div className="text-xs text-gray-300 space-y-2 border-t border-gray-700/80 pt-3 leading-relaxed">
                                        <p>
                                            Sua empresa é uma fabricante de smartphones extremamente eficiente e estável no <strong>Horizonte 1 (H1)</strong>. No entanto, com a crescente chegada dos celulares de tela dobrável, a diretoria executiva emitiu uma diretriz estratégica mandatória de <strong>Inovação em Horizonte 2 (H2)</strong>: ingressar com urgência no mercado de dobráveis.
                                        </p>
                                        <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-700/70 space-y-1.5">
                                            <p className="font-bold text-white">⚖️ Três Dimensões Estratégicas de Governança da Rede:</p>
                                            <ul className="list-disc list-inside space-y-1 text-gray-300">
                                                <li><strong>Captura e Retenção de Valor:</strong> Equilíbrio entre aportes pesados de capital e custos de transação/eficiência econômica.</li>
                                                <li><strong>Soberania e Autonomia Relacional:</strong> Preservação de patentes, poder de barganha e proteção contra dependência de terceiros.</li>
                                                <li><strong>Dinâmica e Tempo de Resposta:</strong> Velocidade de prototipagem, flexibilidade de ecossistema e time-to-market.</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mensagem Executiva Durante as Fases de Decisão */}
                            {faseAtualIdx < 4 && (
                                <div className="bg-gray-850/80 border border-gray-700/80 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-md">
                                    <div className="flex items-center gap-2.5 text-xs text-gray-300">
                                        <span className="text-base">🎯</span>
                                        <span>
                                            <strong>Foco do Comitê:</strong> Avaliem os vetores conceituais de cada arquétipo e justifiquem a decisão. Os impactos consolidados nos vetores de rede serão auditados no <strong>Dashboard Executivo</strong> ao final da jornada.
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800 flex-shrink-0">
                                        Avaliação Conceitual
                                    </span>
                                </div>
                            )}

                            {/* Stepper Visual de Fases */}
                            <div className="bg-gray-800/90 p-3 rounded-2xl border border-gray-700 overflow-x-auto shadow-md">
                                <div className="flex items-center justify-between min-w-[650px] px-2">
                                    {FASES.map((fase, idx) => {
                                        const foiRespondida = !!dadosSimulacao.decisoes[fase.chave];
                                        const isAtiva = faseAtualIdx === idx;

                                        return (
                                            <button
                                                key={fase.faseId}
                                                type="button"
                                                onClick={() => setFaseAtualIdx(idx)}
                                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition text-xs font-bold ${
                                                    isAtiva
                                                        ? 'bg-cyan-500 text-gray-950 shadow-md font-black'
                                                        : foiRespondida
                                                        ? 'bg-gray-750 text-cyan-300 hover:bg-gray-700'
                                                        : 'text-gray-500 hover:text-gray-300'
                                                }`}
                                            >
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                    isAtiva ? 'bg-gray-950 text-cyan-400' : foiRespondida ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-400'
                                                }`}>
                                                    {foiRespondida ? '✓' : idx + 1}
                                                </span>
                                                <span>Fase {idx + 1}</span>
                                            </button>
                                        );
                                    })}

                                    {/* Etapa Final: Diagnóstico */}
                                    <button
                                        type="button"
                                        onClick={() => setFaseAtualIdx(4)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition text-xs font-bold ${
                                            faseAtualIdx === 4
                                                ? 'bg-cyan-500 text-gray-950 shadow-md font-black'
                                                : 'text-gray-400 hover:text-white bg-gray-900 border border-gray-700'
                                        }`}
                                    >
                                        <span>📊</span> Dashboard Executivo
                                    </button>
                                </div>
                            </div>

                            {/* Conteúdo Principal: Fase de Decisão Ativa OU Diagnóstico Final */}
                            {faseAtualIdx < 4 ? (
                                <FaseDecisao
                                    fase={FASES[faseAtualIdx]}
                                    decisaoAtual={dadosSimulacao.decisoes[FASES[faseAtualIdx].chave]}
                                    todasDecisoes={dadosSimulacao.decisoes}
                                    justificativaAtual={dadosSimulacao.justificativas[FASES[faseAtualIdx].chave] || ''}
                                    acaoGovernancaAtual={dadosSimulacao.acoesMitigacao[FASES[faseAtualIdx].chave] || ''}
                                    onEscolherDecisao={handleEscolherDecisao}
                                    onAtualizarJustificativa={handleAtualizarJustificativa}
                                    onAtualizarAcaoGovernanca={(texto) => handleAtualizarAcaoMitigacao(FASES[faseAtualIdx].chave, texto)}
                                    onAvancar={handleAvancarFase}
                                    onVoltar={handleVoltarFase}
                                    isPrimeiraFase={faseAtualIdx === 0}
                                    isUltimaFase={faseAtualIdx === 3}
                                />
                            ) : (
                                <DiagnosticoFinal
                                    pontuacoes={pontuacoes}
                                    decisoes={dadosSimulacao.decisoes}
                                    justificativas={dadosSimulacao.justificativas}
                                    acoesMitigacao={dadosSimulacao.acoesMitigacao || {}}
                                    grupoNome={grupoSelecionado?.nome}
                                    onVoltarFase={handleVoltarFase}
                                    onReiniciarSimulacao={handleReiniciarSimulacao}
                                    onAtualizarAcaoMitigacao={handleAtualizarAcaoMitigacao}
                                    onSalvarAcoesMitigacao={handleSalvarAcoesMitigacao}
                                    onExportarExcel={handleExportarExcelGrupo}
                                    salvando={salvando}
                                />
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
