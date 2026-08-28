import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, appId, auth } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';

function PaginaDashboard({ perfilUsuario }) {
    const usuarioId = auth.currentUser?.uid;
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [loadingASI, setLoadingASI] = useState(false);
    
    // Dados carregados do Firestore
    const [dadosASI, setDadosASI] = useState({
        organizacao: null,
        eventos: [],
        regras: [],
        persistencia: [],
        taticaDiretrizes: [],
        taticaVetores: []
    });

    // Fetch de Grupos do Banco
    const { documents: todosGruposData, isLoading: isGruposLoading } = useCollection(`/artifacts/${appId}/public/data/grupos`);
    const todosGrupos = todosGruposData || [];

    // Filtrar Grupos do Usuário Logado
    const meusGrupos = useMemo(() => {
        if (!perfilUsuario) return [];
        if (perfilUsuario.papel === 'admin' || perfilUsuario.papel === 'professor') {
            return todosGrupos;
        }
        return todosGrupos.filter(g => g.integrantesIds?.includes(usuarioId));
    }, [todosGrupos, usuarioId, perfilUsuario]);

    // Auto-seleção do Grupo
    useEffect(() => {
        if (meusGrupos.length > 0 && !selectedGroupId) {
            setSelectedGroupId(meusGrupos[0].id);
        }
    }, [meusGrupos, selectedGroupId]);

    // Escutar em tempo real as configurações de ASI do grupo selecionado
    useEffect(() => {
        if (!selectedGroupId) {
            setDadosASI({ organizacao: null, eventos: [], regras: [], persistencia: [], taticaDiretrizes: [], taticaVetores: [] });
            return;
        }

        setLoadingASI(true);
        const docRef = doc(db, `artifacts/${appId}/public/data/asi_dados`, selectedGroupId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // Normalização das Diretrizes
                let listDiretrizes = data.taticaDiretrizes || [];
                if (listDiretrizes.length === 0 && data.taticaDiretriz) {
                    listDiretrizes = [{ id: 'default', descricao: data.taticaDiretriz }];
                }

                setDadosASI({
                    organizacao: data.organizacao || null,
                    eventos: data.eventos || [],
                    regras: data.regras || [],
                    persistencia: data.persistencia || [],
                    taticaDiretrizes: listDiretrizes,
                    taticaVetores: data.taticaVetores || []
                });
            } else {
                setDadosASI({ organizacao: null, eventos: [], regras: [], persistencia: [], taticaDiretrizes: [], taticaVetores: [] });
            }
            setLoadingASI(false);
        }, (error) => {
            console.error("Erro ao escutar dados do Dashboard:", error);
            setLoadingASI(false);
        });

        return () => unsubscribe();
    }, [selectedGroupId]);

    const grupoSelecionadoObj = useMemo(() => {
        return todosGrupos.find(g => g.id === selectedGroupId);
    }, [todosGrupos, selectedGroupId]);

    // ----------------------------------------------------
    // CÁLCULO DE MÉTRICAS DO PAINEL
    // ----------------------------------------------------
    
    // 1. Organização (100% se nome e descrição preenchidos)
    const progressoOrg = useMemo(() => {
        if (!dadosASI.organizacao) return 0;
        let points = 0;
        if (dadosASI.organizacao.nomeFantasia?.trim()) points += 50;
        if (dadosASI.organizacao.descricao?.trim()) points += 50;
        return points;
    }, [dadosASI.organizacao]);

    // 2. Matriz Transacional (Governança)
    const metricasGov = useMemo(() => {
        const totalEvt = dadosASI.eventos.length;
        if (totalEvt === 0) return { total: 0, complianceAvg: 0, sintaticasCount: 0, sodCount: 0, logsCount: 0 };

        let sumScores = 0;
        let totalSintaticas = 0;
        let totalSod = 0;
        let totalLogs = 0;

        dadosASI.eventos.forEach(evt => {
            // Travas Sintáticas
            const regrasEvt = dadosASI.regras.find(r => r.eventoId === evt.id);
            const validacoesSintaticas = regrasEvt?.validacoesSintaticas || [];
            const regrasSod = regrasEvt?.regrasSod || [];
            totalSintaticas += validacoesSintaticas.length;
            totalSod += regrasSod.length;

            const coberturaSintatica = validacoesSintaticas.length > 0;
            const coberturaSod = regrasSod.length > 0;

            // Logs e Persistência
            const persistenciaEvt = dadosASI.persistencia.find(p => p.eventoId === evt.id);
            const trilhaNaoRepudiacao = persistenciaEvt?.trilhaNaoRepudiacao || [];
            const logCount = trilhaNaoRepudiacao.length;
            totalLogs += logCount;

            const coberturaAuditoria = logCount >= 4;
            const coberturaSRE = !!(persistenciaEvt?.protocoloFalha?.trim() && persistenciaEvt?.sobrevivencia2h?.trim());

            // Score da Transação
            const scorePercent = Math.round(
                ((coberturaSintatica ? 1 : 0) + 
                 (coberturaSod ? 1 : 0) + 
                 (coberturaAuditoria ? 1 : 0) + 
                 (coberturaSRE ? 1 : 0)) * 25
            );
            sumScores += scorePercent;
        });

        return {
            total: totalEvt,
            complianceAvg: Math.round(sumScores / totalEvt),
            sintaticasCount: totalSintaticas,
            sodCount: totalSod,
            logsCount: totalLogs
        };
    }, [dadosASI.eventos, dadosASI.regras, dadosASI.persistencia]);

    // 3. Matriz Tática
    const metricasTatica = useMemo(() => {
        const totalVetores = dadosASI.taticaVetores.length;
        if (totalVetores === 0) return { total: 0, complianceAvg: 0, diretrizesCount: dadosASI.taticaDiretrizes.length };

        let sumScores = 0;

        dadosASI.taticaVetores.forEach(v => {
            const gatilhoCompleto = !!(v.gatilhoTransacao?.trim() && v.gatilhoIndicador?.trim() && v.gatilhoJanela?.trim() && v.gatilhoLogica?.trim() && v.gatilhoBaseline?.trim());
            
            const dimTempoPreenchida = !!v.agregacaoTempo?.trim();
            const dimGeograficaPreenchida = !!v.agregacaoGeografica?.trim();
            const dimNegocioPreenchida = !!v.agregacaoNegocio?.trim();
            const dimCount = (dimTempoPreenchida ? 1 : 0) + (dimGeograficaPreenchida ? 1 : 0) + (dimNegocioPreenchida ? 1 : 0);
            const agregacaoValida = dimCount >= 2;

            const decisaoMapeada = !!(v.decisaoArea?.trim() && v.decisaoProtocolo?.trim());

            const complianceScore = Math.round(((gatilhoCompleto ? 1 : 0) + (agregacaoValida ? 1 : 0) + (decisaoMapeada ? 1 : 0)) * 33.33);
            sumScores += complianceScore > 99 ? 100 : complianceScore;
        });

        return {
            total: totalVetores,
            complianceAvg: Math.round(sumScores / totalVetores),
            diretrizesCount: dadosASI.taticaDiretrizes.length
        };
    }, [dadosASI.taticaVetores, dadosASI.taticaDiretrizes]);

    return (
        <div className="space-y-6">
            
            {/* BOAS VINDAS & SELETOR DE GRUPO */}
            <div className="bg-gray-800 shadow-xl rounded-2xl p-4 sm:p-6 border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-black text-cyan-400">
                        Olá, {perfilUsuario?.nome || 'Usuário'}!
                    </h1>
                    <p className="text-gray-300 text-xs sm:text-sm">
                        Visualize o progresso e a conformidade do seu grupo nos módulos administrativos de SI.
                    </p>
                </div>

                {/* Dropdown de Grupo (Exibido para Admin/Professor ou se o usuário tiver múltiplos grupos) */}
                {meusGrupos.length > 1 || perfilUsuario?.papel === 'admin' || perfilUsuario?.papel === 'professor' ? (
                    <div className="w-full md:w-64">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Selecionar Grupo de Projeto</label>
                        {isGruposLoading ? (
                            <div className="h-9 bg-gray-750 animate-pulse rounded-lg w-full"></div>
                        ) : (
                            <select 
                                value={selectedGroupId} 
                                onChange={e => setSelectedGroupId(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500"
                            >
                                <option value="">Escolha um grupo...</option>
                                {meusGrupos.map(g => (
                                    <option key={g.id} value={g.id}>{g.nome} - {g.numero || 'Sem Número'}</option>
                                ))}
                            </select>
                        )}
                    </div>
                ) : (
                    meusGrupos.length === 1 && (
                        <div className="bg-gray-900/50 px-4 py-2.5 rounded-xl border border-gray-700/60 text-xs">
                            <span className="text-gray-400 font-semibold block uppercase text-[8px]">Grupo de Trabalho</span>
                            <span className="text-cyan-400 font-bold text-sm">{grupoSelecionadoObj?.nome} - {grupoSelecionadoObj?.numero}</span>
                        </div>
                    )
                )}
            </div>

            {/* SEÇÕES DE PROCESSO E MODULOS */}
            {!selectedGroupId ? (
                <div className="bg-gray-800/40 border border-gray-750 p-8 rounded-2xl text-center space-y-2">
                    <p className="text-yellow-500 font-bold text-xs">⚠️ Nenhum grupo associado ao seu perfil.</p>
                    <p className="text-[11px] text-gray-400">Contate o professor para vincular sua conta a um grupo de trabalho.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* CARD 1: ORGANIZAÇÃO */}
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-gray-600 transition-all">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                <h3 className="font-extrabold text-sm text-cyan-400 flex items-center gap-2">
                                    🏢 1. Organização
                                </h3>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${progressoOrg === 100 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-yellow-950 text-yellow-400 border border-yellow-800'}`}>
                                    {progressoOrg === 100 ? 'Completo' : 'Pendente'}
                                </span>
                            </div>

                            {/* Barra de Progresso */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Preenchimento</span>
                                    <span>{progressoOrg}%</span>
                                </div>
                                <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${progressoOrg}%` }}></div>
                                </div>
                            </div>

                            {/* Dados do Firestore */}
                            {loadingASI ? (
                                <div className="space-y-2 py-2 animate-pulse">
                                    <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                                </div>
                            ) : (
                                <div className="text-[11px] space-y-2 py-1 text-gray-300">
                                    <p>
                                        <span className="text-gray-500 font-semibold">Nome Fantasia:</span>{' '}
                                        <span className="text-white font-bold">{dadosASI.organizacao?.nomeFantasia || <em className="text-yellow-500/80 font-normal">Não cadastrado</em>}</span>
                                    </p>
                                    <p className="line-clamp-3 leading-relaxed">
                                        <span className="text-gray-500 font-semibold">Atividade:</span>{' '}
                                        {dadosASI.organizacao?.descricao || <em className="text-gray-500 font-normal">Nenhuma descrição corporativa cadastrada.</em>}
                                    </p>
                                </div>
                            )}
                        </div>

                        <Link 
                            to="/adm-si/organizacao" 
                            className="block text-center bg-gray-900 hover:bg-gray-950 text-cyan-400 hover:text-cyan-300 font-bold text-xs py-2 rounded-xl transition-all shadow border border-gray-750"
                        >
                            Configurar Identidade
                        </Link>
                    </div>

                    {/* CARD 2: GOVERNANÇA (TRANSACIONAL) */}
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-gray-600 transition-all">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                <h3 className="font-extrabold text-sm text-cyan-400 flex items-center gap-2">
                                    ⚙️ 2. Transacional
                                </h3>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${metricasGov.total > 0 && metricasGov.complianceAvg === 100 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-yellow-950 text-yellow-400 border border-yellow-800'}`}>
                                    {metricasGov.complianceAvg}% Conformidade
                                </span>
                            </div>

                            {/* Barra de Conformidade Média */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Conformidade Média</span>
                                    <span>{metricasGov.complianceAvg}%</span>
                                </div>
                                <div className="w-full bg-gray-955 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${metricasGov.complianceAvg === 100 ? 'bg-emerald-500' : 'bg-yellow-500'}`} 
                                        style={{ width: `${metricasGov.complianceAvg}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Resumo do Módulo */}
                            {loadingASI ? (
                                <div className="space-y-2 py-2 animate-pulse">
                                    <div className="h-3 bg-gray-700 rounded w-full"></div>
                                    <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                                </div>
                            ) : (
                                <div className="text-[11px] space-y-2 py-1 text-gray-300">
                                    <p>
                                        <span className="text-gray-500 font-semibold">Transações Mapeadas:</span>{' '}
                                        <span className="text-white font-bold">{metricasGov.total}</span>
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-gray-950/40 p-2 rounded-lg border border-gray-900/60">
                                        <p><span className="text-gray-500">Controles:</span> <span className="text-white font-semibold">{metricasGov.sintaticasCount}</span></p>
                                        <p><span className="text-gray-500">SoD (Alçadas):</span> <span className="text-white font-semibold">{metricasGov.sodCount}</span></p>
                                        <p className="col-span-2"><span className="text-gray-500">Logs Registrados:</span> <span className="text-white font-semibold">{metricasGov.logsCount} atributos</span></p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link 
                            to="/adm-si/governanca" 
                            className="block text-center bg-gray-900 hover:bg-gray-955 text-cyan-400 hover:text-cyan-300 font-bold text-xs py-2 rounded-xl transition-all shadow border border-gray-750"
                        >
                            Modelar Governança DICS
                        </Link>
                    </div>

                    {/* CARD 3: MATRIZ TÁTICA (G.A.D.) */}
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-gray-600 transition-all">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                <h3 className="font-extrabold text-sm text-cyan-400 flex items-center gap-2">
                                    🎯 3. Matriz Tática
                                </h3>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${metricasTatica.total > 0 && metricasTatica.complianceAvg === 100 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-yellow-950 text-yellow-400 border border-yellow-800'}`}>
                                    {metricasTatica.complianceAvg}% Conformidade
                                </span>
                            </div>

                            {/* Barra de Conformidade GAD */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Conformidade G.A.D.</span>
                                    <span>{metricasTatica.complianceAvg}%</span>
                                </div>
                                <div className="w-full bg-gray-955 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${metricasTatica.complianceAvg === 100 ? 'bg-emerald-500' : 'bg-yellow-500'}`} 
                                        style={{ width: `${metricasTatica.complianceAvg}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Resumo do Módulo Tático */}
                            {loadingASI ? (
                                <div className="space-y-2 py-2 animate-pulse">
                                    <div className="h-3 bg-gray-700 rounded w-full"></div>
                                    <div className="h-3 bg-gray-700 rounded w-1/3"></div>
                                </div>
                            ) : (
                                <div className="text-[11px] space-y-2 py-1 text-gray-300">
                                    <p>
                                        <span className="text-gray-500 font-semibold">Diretrizes Cadastradas:</span>{' '}
                                        <span className="text-white font-bold">{metricasTatica.diretrizesCount}</span>
                                    </p>
                                    <p>
                                        <span className="text-gray-500 font-semibold">Vetores de Desvio:</span>{' '}
                                        <span className="text-white font-bold">{metricasTatica.total} monitorados</span>
                                    </p>
                                    <div className="text-[9px] text-cyan-400/90 leading-normal bg-cyan-950/20 border border-cyan-900/40 p-2 rounded-lg">
                                        Foco G.A.D.: Identificar Gatilhos de ruptura, agregar em OLAP e estruturar Decisões.
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link 
                            to="/adm-si/tatica" 
                            className="block text-center bg-gray-900 hover:bg-gray-955 text-cyan-400 hover:text-cyan-300 font-bold text-xs py-2 rounded-xl transition-all shadow border border-gray-750"
                        >
                            Parametrizar G.A.D.
                        </Link>
                    </div>

                </div>
            )}



        </div>
    );
}

export default PaginaDashboard;
