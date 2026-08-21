import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId, auth } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';

// Componente Tooltip Didático
function DidacticInfo({ title, text }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="inline-block ml-2 relative align-middle">
            <button 
                type="button"
                onClick={() => setOpen(!open)}
                className="w-5 h-5 rounded-full bg-cyan-900/50 hover:bg-cyan-800 text-cyan-400 font-bold text-xs flex items-center justify-center border border-cyan-700/50 transition-all focus:outline-none"
                title="Clique para ajuda didática"
            >
                i
            </button>
            {open && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-gray-950 border border-cyan-500/50 p-4 rounded-xl shadow-2xl z-50 w-72 text-xs font-normal text-gray-300 leading-relaxed animate-fade-in-up">
                    <div className="flex justify-between items-center mb-2 border-b border-cyan-900 pb-1">
                        <strong className="text-cyan-400 uppercase tracking-wider text-[10px]">{title}</strong>
                        <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white font-bold">&times;</button>
                    </div>
                    <p className="whitespace-pre-line">{text}</p>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-950"></div>
                </div>
            )}
        </div>
    );
}

function AdmSIGovernanca() {
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [perfilUsuario, setPerfilUsuario] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState('');
    const [erro, setErro] = useState('');

    // Dados Carregados do Firestore
    const [dadosASI, setDadosASI] = useState({
        organizacao: null,
        eventos: [],
        regras: [],
        persistencia: []
    });

    // Controlador de Abertura de Sanfona
    const [activeAccordion, setActiveAccordion] = useState('eventos');

    const toggleAccordion = (name) => {
        setActiveAccordion(activeAccordion === name ? '' : name);
    };

    // ----------------------------------------------------
    // FORM STATES - SANFONA 1: EVENTOS OPERACIONAIS
    // ----------------------------------------------------
    const [transacaoAtomica, setTransacaoAtomica] = useState('');
    const [descricao, setDescricao] = useState('');
    const [atorEntrada, setAtorEntrada] = useState('');
    const [dominioNegocio, setDominioNegocio] = useState('');
    const [criticidadeRisco, setCriticidadeRisco] = useState('');
    
    // Edição de Evento
    const [eventoEditandoId, setEventoEditandoId] = useState(null);

    // ----------------------------------------------------
    // FORM STATES - SANFONA 2: MOTOR DE REGRAS (VINCULADOS)
    // ----------------------------------------------------
    const [selectedEventoIdRegras, setSelectedEventoIdRegras] = useState('');
    
    // Validações Sintáticas
    const [novaValidacaoSintatica, setNovaValidacaoSintatica] = useState('');
    const [validacoesSintaticas, setValidacoesSintaticas] = useState([]);
    const [editandoValidacaoIdx, setEditandoValidacaoIdx] = useState(null);
    
    // Lista de Regras + SoD Vinculadas
    const [regrasSod, setRegrasSod] = useState([]);
    const [novaRegraNegocio, setNovaRegraNegocio] = useState('');
    const [novaSodSistemico, setNovaSodSistemico] = useState('');
    const [editandoRegraSodId, setEditandoRegraSodId] = useState(null);

    // ----------------------------------------------------
    // FORM STATES - SANFONA 3: PERSISTÊNCIA / SAÍDA
    // ----------------------------------------------------
    const [selectedEventoIdPersistencia, setSelectedEventoIdPersistencia] = useState('');
    
    // Trilha de Não-Repudiação
    const [novaTrilha, setNovaTrilha] = useState('');
    const [trilhaNaoRepudiacao, setTrilhaNaoRepudiacao] = useState([]);
    const [editandoTrilhaIdx, setEditandoTrilhaIdx] = useState(null);
    
    // Falhas
    const [protocoloFalha, setProtocoloFalha] = useState('');
    const [sobrevivencia2h, setSobrevivencia2h] = useState('');

    // --- CÁLCULOS DERIVADOS E MÉTRICAS DO MINI-PAINEL (AUDITORIA DICS) ---
    const totalTransacoes = dadosASI.eventos.length;
    const totalValidacoes = dadosASI.regras.reduce((acc, curr) => acc + (curr.validacoesSintaticas?.length || 0), 0);
    const totalRegrasSod = dadosASI.regras.reduce((acc, curr) => acc + (curr.regrasSod?.length || 0), 0);
    const totalLogs = dadosASI.persistencia.reduce((acc, curr) => acc + (curr.trilhaNaoRepudiacao?.length || 0), 0);

    // Agrupamento de Transações por Risco
    const transacoesPorRisco = useMemo(() => {
        const groups = {};
        dadosASI.eventos.forEach(evt => {
            const risco = evt.criticidadeRisco || 'Sem Risco';
            if (!groups[risco]) groups[risco] = [];
            groups[risco].push(evt.transacaoAtomica);
        });
        return groups;
    }, [dadosASI.eventos]);

    const checklistGovernanca = useMemo(() => {
        return dadosASI.eventos.map(evt => {
            const temRegra = dadosASI.regras.find(r => r.eventoId === evt.id);
            const temPersistencia = dadosASI.persistencia.find(p => p.eventoId === evt.id);
            
            const qtdValidacoes = temRegra?.validacoesSintaticas?.length || 0;
            const qtdRegrasSod = temRegra?.regrasSod?.length || 0;
            const qtdLogs = temPersistencia?.trilhaNaoRepudiacao?.length || 0;
            const temSRE = !!temPersistencia?.protocoloFalha;

            return {
                id: evt.id,
                transacaoAtomica: evt.transacaoAtomica,
                dominioNegocio: evt.dominioNegocio,
                criticidadeRisco: evt.criticidadeRisco,
                coberturaSintatica: qtdValidacoes > 0,
                coberturaSod: qtdRegrasSod > 0,
                coberturaAuditoria: qtdLogs >= 4,
                coberturaSRE: temSRE,
                qtdLogs,
                scorePercent: Math.round(((qtdValidacoes > 0 ? 1 : 0) + (qtdRegrasSod > 0 ? 1 : 0) + (qtdLogs >= 4 ? 1 : 0) + (temSRE ? 1 : 0)) * 25)
            };
        });
    }, [dadosASI.eventos, dadosASI.regras, dadosASI.persistencia]);

    const averageGovernanceScore = useMemo(() => {
        if (checklistGovernanca.length === 0) return 0;
        const total = checklistGovernanca.reduce((acc, curr) => acc + curr.scorePercent, 0);
        return Math.round(total / checklistGovernanca.length);
    }, [checklistGovernanca]);

    // Fetch todos os grupos
    const { documents: todosGruposData, isLoading: isGruposLoading } = useCollection(`/artifacts/${appId}/public/data/grupos`);
    const todosGrupos = todosGruposData || [];
    const usuarioId = auth.currentUser?.uid;

    // Buscar Perfil do Usuário
    useEffect(() => {
        if (usuarioId) {
            const userRef = doc(db, 'usuarios', usuarioId);
            getDoc(userRef).then(docSnap => {
                if (docSnap.exists()) {
                    setPerfilUsuario(docSnap.data());
                }
                setIsLoadingProfile(false);
            }).catch(err => {
                console.error("Erro ao buscar perfil:", err);
                setIsLoadingProfile(false);
            });
        } else {
            setIsLoadingProfile(false);
        }
    }, [usuarioId]);

    // Filtrar os grupos do usuário
    const meusGrupos = useMemo(() => {
        if (!perfilUsuario) return [];
        if (perfilUsuario.papel === 'admin' || perfilUsuario.papel === 'professor') {
            return todosGrupos;
        }
        return todosGrupos.filter(grupo => grupo.integrantesIds?.includes(usuarioId));
    }, [todosGrupos, usuarioId, perfilUsuario]);

    // Auto-selecionar se houver apenas 1 grupo
    useEffect(() => {
        if (meusGrupos.length === 1 && !selectedGroupId) {
            setSelectedGroupId(meusGrupos[0].id);
        }
    }, [meusGrupos, selectedGroupId]);

    // Escutar os dados da governança do Grupo Selecionado
    useEffect(() => {
        if (!selectedGroupId) {
            setDadosASI({ organizacao: null, eventos: [], regras: [], persistencia: [] });
            return;
        }

        const docRef = doc(db, `artifacts/${appId}/public/data/asi_dados`, selectedGroupId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setDadosASI({
                    organizacao: data.organizacao || null,
                    eventos: data.eventos || [],
                    regras: data.regras || [],
                    persistencia: data.persistencia || []
                });
            } else {
                setDadosASI({ organizacao: null, eventos: [], regras: [], persistencia: [] });
            }
        }, (error) => {
            console.error("Erro ao escutar dados da Governança:", error);
        });

        return () => unsubscribe();
    }, [selectedGroupId]);

    // Efeitos de carregamento de dados ao trocar a transação nas sanfonas
    useEffect(() => {
        if (!selectedEventoIdRegras) {
            setValidacoesSintaticas([]);
            setRegrasSod([]);
            setNovaValidacaoSintatica('');
            setNovaRegraNegocio('');
            setNovaSodSistemico('');
            setEditandoValidacaoIdx(null);
            setEditandoRegraSodId(null);
            return;
        }
        const regraEncontrada = dadosASI.regras.find(r => r.eventoId === selectedEventoIdRegras);
        if (regraEncontrada) {
            setValidacoesSintaticas(regraEncontrada.validacoesSintaticas || []);
            setRegrasSod(regraEncontrada.regrasSod || []);
        } else {
            setValidacoesSintaticas([]);
            setRegrasSod([]);
        }
        setNovaValidacaoSintatica('');
        setNovaRegraNegocio('');
        setNovaSodSistemico('');
        setEditandoValidacaoIdx(null);
        setEditandoRegraSodId(null);
    }, [selectedEventoIdRegras, dadosASI.regras]);

    useEffect(() => {
        if (!selectedEventoIdPersistencia) {
            setTrilhaNaoRepudiacao([]);
            setProtocoloFalha('');
            setSobrevivencia2h('');
            setNovaTrilha('');
            setEditandoTrilhaIdx(null);
            return;
        }
        const persistenciaEncontrada = dadosASI.persistencia.find(p => p.eventoId === selectedEventoIdPersistencia);
        if (persistenciaEncontrada) {
            setTrilhaNaoRepudiacao(persistenciaEncontrada.trilhaNaoRepudiacao || []);
            setProtocoloFalha(persistenciaEncontrada.protocoloFalha || '');
            setSobrevivencia2h(persistenciaEncontrada.sobrevivencia2h || '');
        } else {
            setTrilhaNaoRepudiacao([]);
            setProtocoloFalha('');
            setSobrevivencia2h('');
        }
        setNovaTrilha('');
        setEditandoTrilhaIdx(null);
    }, [selectedEventoIdPersistencia, dadosASI.persistencia]);

    const salvarDadosFirestore = async (novosDados) => {
        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/asi_dados`, selectedGroupId);
            await setDoc(docRef, {
                ...novosDados,
                grupoId: selectedGroupId,
                dataModificacao: new Date()
            }, { merge: true });
        } catch (error) {
            console.error("Erro ao salvar governança:", error);
            setErro("Falha ao salvar as informações.");
        }
    };

    // ----------------------------------------------------
    // AUTOSAVE LOGIC
    // ----------------------------------------------------
    const autosaveRegras = async (eventoId, novasValidacoes, novasRegrasSod) => {
        if (!eventoId) return;
        setLoading(true);
        const novoRegistroRegras = {
            eventoId,
            validacoesSintaticas: novasValidacoes,
            regrasSod: novasRegrasSod
        };
        const outrasRegras = dadosASI.regras.filter(r => r.eventoId !== eventoId);
        const novasRegras = [...outrasRegras, novoRegistroRegras];
        await salvarDadosFirestore({ ...dadosASI, regras: novasRegras });
        setLoading(false);
    };

    const autosavePersistencia = async (eventoId, novaTrilhaArray, novoProtocolo, novaSobrevivencia) => {
        if (!eventoId) return;
        setLoading(true);
        const novaPersistencia = {
            eventoId,
            trilhaNaoRepudiacao: novaTrilhaArray,
            protocoloFalha: novoProtocolo,
            sobrevivencia2h: novaSobrevivencia
        };
        const outrasPersistencias = dadosASI.persistencia.filter(p => p.eventoId !== eventoId);
        const novasPersistencias = [...outrasPersistencias, novaPersistencia];
        await salvarDadosFirestore({ ...dadosASI, persistencia: novasPersistencias });
        setLoading(false);
    };

    // ----------------------------------------------------
    // EVENTOS OPERACIONAIS (SANFONA 1)
    // ----------------------------------------------------
    const handleSalvarEvento = async (e) => {
        e.preventDefault();
        if (!transacaoAtomica.trim() || !dominioNegocio.trim() || !criticidadeRisco.trim()) {
            alert("Preencha os campos obrigatórios (*).");
            return;
        }

        setLoading(true);
        if (eventoEditandoId) {
            // Modo Edição
            const novosEventos = dadosASI.eventos.map(evt => evt.id === eventoEditandoId ? {
                ...evt,
                transacaoAtomica: transacaoAtomica.trim(),
                descricao: descricao.trim(),
                atorEntrada: atorEntrada.trim(),
                dominioNegocio: dominioNegocio.trim(),
                criticidadeRisco: criticidadeRisco.trim()
            } : evt);

            await salvarDadosFirestore({ ...dadosASI, eventos: novosEventos });
            setEventoEditandoId(null);
        } else {
            // Modo Criação
            const novoEvento = {
                id: 'evt_' + Date.now(),
                transacaoAtomica: transacaoAtomica.trim(),
                descricao: descricao.trim(),
                atorEntrada: atorEntrada.trim(),
                dominioNegocio: dominioNegocio.trim(),
                criticidadeRisco: criticidadeRisco.trim()
            };

            const novosEventos = [...dadosASI.eventos, novoEvento];
            await salvarDadosFirestore({ ...dadosASI, eventos: novosEventos });
        }
        
        // Limpar campos
        setTransacaoAtomica('');
        setDescricao('');
        setAtorEntrada('');
        setDominioNegocio('');
        setCriticidadeRisco('');
        setLoading(false);
    };

    const handleIniciarEditarEvento = (evt) => {
        setEventoEditandoId(evt.id);
        setTransacaoAtomica(evt.transacaoAtomica || '');
        setDescricao(evt.descricao || '');
        setAtorEntrada(evt.atorEntrada || '');
        setDominioNegocio(evt.dominioNegocio || '');
        setCriticidadeRisco(evt.criticidadeRisco || '');
    };

    const handleCancelarEditarEvento = () => {
        setEventoEditandoId(null);
        setTransacaoAtomica('');
        setDescricao('');
        setAtorEntrada('');
        setDominioNegocio('');
        setCriticidadeRisco('');
    };

    const handleRemoverEvento = async (evtId) => {
        if (!window.confirm("Deseja realmente excluir esta transação? As regras e persistências atreladas a ela também serão excluídas.")) return;
        setLoading(true);
        
        const novosEventos = dadosASI.eventos.filter(e => e.id !== evtId);
        const novasRegras = dadosASI.regras.filter(r => r.eventoId !== evtId);
        const novasPersistencias = dadosASI.persistencia.filter(p => p.eventoId !== evtId);

        if (selectedEventoIdRegras === evtId) setSelectedEventoIdRegras('');
        if (selectedEventoIdPersistencia === evtId) setSelectedEventoIdPersistencia('');
        if (eventoEditandoId === evtId) handleCancelarEditarEvento();

        await salvarDadosFirestore({
            organizacao: dadosASI.organizacao,
            eventos: novosEventos,
            regras: novasRegras,
            persistencia: novasPersistencias
        });
        setLoading(false);
    };

    // ----------------------------------------------------
    // MOTOR DE REGRAS (SANFONA 2) - AUTOSAVE AO INSERIR
    // ----------------------------------------------------
    const handleAdicionarValidacaoSintatica = async () => {
        if (!novaValidacaoSintatica.trim()) return;
        let novas = [];
        if (editandoValidacaoIdx !== null) {
            novas = [...validacoesSintaticas];
            novas[editandoValidacaoIdx] = novaValidacaoSintatica.trim();
            setEditandoValidacaoIdx(null);
        } else {
            novas = [...validacoesSintaticas, novaValidacaoSintatica.trim()];
        }
        setValidacoesSintaticas(novas);
        setNovaValidacaoSintatica('');
        
        // Autosave imediato
        await autosaveRegras(selectedEventoIdRegras, novas, regrasSod);
    };

    const handleIniciarEditarValidacao = (idx) => {
        setEditandoValidacaoIdx(idx);
        setNovaValidacaoSintatica(validacoesSintaticas[idx]);
    };

    const handleCancelarEditarValidacao = () => {
        setEditandoValidacaoIdx(null);
        setNovaValidacaoSintatica('');
    };

    const handleRemoverValidacaoSintatica = async (idx) => {
        if (editandoValidacaoIdx === idx) handleCancelarEditarValidacao();
        const novas = validacoesSintaticas.filter((_, i) => i !== idx);
        setValidacoesSintaticas(novas);
        
        // Autosave imediato
        await autosaveRegras(selectedEventoIdRegras, novas, regrasSod);
    };

    const handleAdicionarRegraSod = async () => {
        if (!novaRegraNegocio.trim() || !novaSodSistemico.trim()) {
            alert("Preencha a Regra (Alçada) e a respectiva Segregação (SoD) antes de continuar.");
            return;
        }

        let novas = [];
        if (editandoRegraSodId) {
            novas = regrasSod.map(item => item.id === editandoRegraSodId ? {
                ...item,
                regraNegocio: novaRegraNegocio.trim(),
                sodSistemico: novaSodSistemico.trim()
            } : item);
            setEditandoRegraSodId(null);
        } else {
            const novaRegra = {
                id: 'rs_' + Date.now(),
                regraNegocio: novaRegraNegocio.trim(),
                sodSistemico: novaSodSistemico.trim()
            };
            novas = [...regrasSod, novaRegra];
        }

        setRegrasSod(novas);
        setNovaRegraNegocio('');
        setNovaSodSistemico('');

        // Autosave imediato
        await autosaveRegras(selectedEventoIdRegras, validacoesSintaticas, novas);
    };

    const handleIniciarEditarRegraSod = (item) => {
        setEditandoRegraSodId(item.id);
        setNovaRegraNegocio(item.regraNegocio || '');
        setNovaSodSistemico(item.sodSistemico || '');
    };

    const handleCancelarEditarRegraSod = () => {
        setEditandoRegraSodId(null);
        setNovaRegraNegocio('');
        setNovaSodSistemico('');
    };

    const handleRemoverRegraSod = async (id) => {
        if (editandoRegraSodId === id) handleCancelarEditarRegraSod();
        const novas = regrasSod.filter(r => r.id !== id);
        setRegrasSod(novas);

        // Autosave imediato
        await autosaveRegras(selectedEventoIdRegras, validacoesSintaticas, novas);
    };

    // ----------------------------------------------------
    // PERSISTÊNCIA / SAÍDA (SANFONA 3) - AUTOSAVE AO INSERIR/BLUR
    // ----------------------------------------------------
    const handleAdicionarTrilha = async () => {
        if (!novaTrilha.trim()) return;
        let novas = [];
        if (editandoTrilhaIdx !== null) {
            novas = [...trilhaNaoRepudiacao];
            novas[editandoTrilhaIdx] = novaTrilha.trim();
            setEditandoTrilhaIdx(null);
        } else {
            novas = [...trilhaNaoRepudiacao, novaTrilha.trim()];
        }
        setTrilhaNaoRepudiacao(novas);
        setNovaTrilha('');

        // Autosave imediato
        await autosavePersistencia(selectedEventoIdPersistencia, novas, protocoloFalha, sobrevivencia2h);
    };

    const handleIniciarEditarTrilha = (idx) => {
        setEditandoTrilhaIdx(idx);
        setNovaTrilha(trilhaNaoRepudiacao[idx]);
    };

    const handleCancelarEditarTrilha = () => {
        setEditandoTrilhaIdx(null);
        setNovaTrilha('');
    };

    const handleRemoverTrilha = async (idx) => {
        if (editandoTrilhaIdx === idx) handleCancelarEditarTrilha();
        const novas = trilhaNaoRepudiacao.filter((_, i) => i !== idx);
        setTrilhaNaoRepudiacao(novas);

        // Autosave imediato
        await autosavePersistencia(selectedEventoIdPersistencia, novas, protocoloFalha, sobrevivencia2h);
    };

    const handleBlurPersistenciaText = async () => {
        await autosavePersistencia(selectedEventoIdPersistencia, trilhaNaoRepudiacao, protocoloFalha, sobrevivencia2h);
    };

    if (isLoadingProfile || isGruposLoading) {
        return <div className="p-8 text-center text-gray-400 animate-pulse">Carregando Matriz Transacional...</div>;
    }

    if (meusGrupos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[60vh]">
                <h2 className="text-2xl font-bold text-red-400">Acesso Restrito ou Sem Grupos</h2>
                <p className="text-gray-400 mt-2">Você precisa estar vinculado a um Grupo (Empresa) para governar o sistema.</p>
            </div>
        );
    }

    if (!selectedGroupId) {
        return (
            <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-cyan-400">Matriz Transacional de Governança</h1>
                    <p className="text-gray-400 mt-2">Selecione o Grupo para abrir a Matriz Transacional.</p>
                </header>
                <div className="grid gap-4 sm:grid-cols-2">
                    {meusGrupos.map(grupo => (
                        <button
                            key={grupo.id}
                            onClick={() => setSelectedGroupId(grupo.id)}
                            className="bg-gray-800 hover:bg-gray-700 border border-t-cyan-500 border-t-4 p-6 rounded-lg text-left transition-all shadow-lg hover:shadow-cyan-500/20"
                        >
                            <h3 className="text-xl font-bold text-white mb-2">{grupo.nome} <span className="text-cyan-400 text-sm ml-2">({grupo.sigla})</span></h3>
                            <p className="text-gray-400 text-sm">{grupo.descricao || 'Sem descrição.'}</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const grupoSelecionado = meusGrupos.find(g => g.id === selectedGroupId);

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in mt-6 space-y-6">
            
            {/* TOPO FIXO: Exibição da Organização Selecionada */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest text-[10px]">Organização de Referência</h2>
                    {dadosASI.organizacao ? (
                        <>
                            <h3 className="text-2xl font-black text-white mt-1">{dadosASI.organizacao.nomeEmpresa}</h3>
                            <p className="text-sm text-gray-400 mt-1 line-clamp-1">{dadosASI.organizacao.descricaoNegocio}</p>
                        </>
                    ) : (
                        <div className="mt-2 text-yellow-400 text-sm font-semibold flex items-center gap-2">
                            <span>⚠️ Nenhuma Organização vinculada a este grupo ainda!</span>
                            <a href="/adm-si/organizacao" className="underline text-cyan-400 hover:text-cyan-300">Cadastrar Organização agora</a>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300">
                        Grupo: <strong>{grupoSelecionado?.sigla}</strong>
                    </span>
                    {meusGrupos.length > 1 && (
                        <button onClick={() => setSelectedGroupId('')} className="text-xs bg-gray-750 hover:bg-gray-700 px-3 py-2 rounded-lg transition-all">
                            Trocar Grupo
                        </button>
                    )}
                </div>
            </div>

            {erro && <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg">{erro}</div>}
            {sucesso && <div className="bg-green-900/50 border border-green-500 text-green-300 p-4 rounded-lg">{sucesso}</div>}

            {/* CONTAINER DO ACORDEÃO VERDADEIRO (COLAPSA AO CLICAR) */}
            <div className="space-y-4">
                
                {/* SANFONA 1: EVENTOS OPERACIONAIS */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                    <button 
                        type="button"
                        onClick={() => toggleAccordion('eventos')}
                        className={`w-full p-5 flex justify-between items-center transition-all text-left font-bold text-lg text-white outline-none focus:outline-none ${activeAccordion === 'eventos' ? 'bg-cyan-600' : 'bg-gray-750 hover:bg-gray-700'}`}
                    >
                        <span className="flex items-center gap-2">⚡ 1. Eventos Operacionais</span>
                        <span className="text-sm font-semibold">{activeAccordion === 'eventos' ? '▲ Recolher' : '▼ Expandir'}</span>
                    </button>
                    {activeAccordion === 'eventos' && (
                        <div className="p-6 border-t border-gray-700 space-y-6 animate-fade-in">
                            <div className="border-b border-gray-700 pb-3 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-300">
                                    {eventoEditandoId ? 'Editando Evento Operacional' : 'Cadastro de Transações'}
                                </h3>
                                <span className="text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-1 rounded font-semibold">Fase de Entrada</span>
                            </div>

                            <form onSubmit={handleSalvarEvento} className="space-y-4 bg-gray-900/50 p-5 rounded-xl border border-gray-700/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                                            Transação Atômica *
                                            <DidacticInfo 
                                                title="Transação Atômica" 
                                                text="A menor unidade lógica e indivisível de processamento em um sistema. Ela deve ser concluída inteiramente (Commit) ou desfeita em sua totalidade (Rollback).\n\nExemplo: 'Faturamento de Pedido' ou 'Baixa de Estoque'." 
                                            />
                                        </label>
                                        <input 
                                            type="text" 
                                            value={transacaoAtomica} 
                                            onChange={e => setTransacaoAtomica(e.target.value)} 
                                            required 
                                            placeholder="Ex: Faturamento de Pedido" 
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                                            Ator de Entrada *
                                            <DidacticInfo 
                                                title="Ator de Entrada" 
                                                text="O cargo, papel ou sistema que inicia a transação e insere os dados no sistema de informação.\n\nExemplo: 'Vendedor', 'Cliente via Portal', 'Operador de Caixa'." 
                                            />
                                        </label>
                                        <input 
                                            type="text" 
                                            value={atorEntrada} 
                                            onChange={e => setAtorEntrada(e.target.value)} 
                                            required 
                                            placeholder="Ex: Vendedor" 
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                                            Domínio de Negócio *
                                            <DidacticInfo 
                                                title="Domínio de Negócio" 
                                                text="Representa a área funcional ou o subsistema (módulo) da corporação responsável pela execução da transação.\n\nExemplo: Comercial, Financeiro, Suprimentos, Logística, etc." 
                                            />
                                        </label>
                                        <input 
                                            type="text" 
                                            value={dominioNegocio} 
                                            onChange={e => setDominioNegocio(e.target.value)} 
                                            required 
                                            placeholder="Ex: Comercial / Vendas" 
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                                            Criticidade de Risco *
                                            <DidacticInfo 
                                                title="Criticidade de Risco" 
                                                text="A principal categoria de impacto negativo à organização caso esta transação falhe, seja fraudada ou invadida.\n\nCategorias:\n- Risco Financeiro (Desvio de caixa)\n- Risco LGPD (Exposição de dados sensíveis)\n- Risco Operacional (Linha de montagem parada)" 
                                            />
                                        </label>
                                        <input 
                                            type="text" 
                                            value={criticidadeRisco} 
                                            onChange={e => setCriticidadeRisco(e.target.value)} 
                                            required 
                                            placeholder="Ex: Risco Financeiro (Fraude em alçada)" 
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1">Descrição do Processo</label>
                                    <textarea 
                                        value={descricao} 
                                        onChange={e => setDescricao(e.target.value)} 
                                        rows="3" 
                                        placeholder="Descreva brevemente como esta transação física ocorre..." 
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none resize-none" 
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    {eventoEditandoId && (
                                        <button 
                                            type="button" 
                                            onClick={handleCancelarEditarEvento}
                                            className="bg-gray-700 hover:bg-gray-650 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition-all shadow"
                                        >
                                            Cancelar Edição
                                        </button>
                                    )}
                                    <button 
                                        type="submit" 
                                        disabled={loading} 
                                        className="bg-cyan-600 hover:bg-cyan-550 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition-all shadow"
                                    >
                                        {eventoEditandoId ? 'Salvar Alterações' : 'Mapear Transação'}
                                    </button>
                                </div>
                            </form>

                            {/* Lista de Eventos Mapeados */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-400">Transações Operacionais Mapeadas ({dadosASI.eventos.length})</h4>
                                {dadosASI.eventos.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic py-4 text-center bg-gray-900/20 rounded-lg border border-dashed border-gray-700">Nenhuma transação operacional mapeada ainda.</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {dadosASI.eventos.map(evt => (
                                            <div key={evt.id} className="bg-gray-900 p-4 rounded-xl border border-gray-700 flex flex-col justify-between gap-4 relative overflow-hidden">
                                                <div className={`absolute top-0 right-0 left-0 h-1 ${eventoEditandoId === evt.id ? 'bg-yellow-500 animate-pulse' : 'bg-cyan-500'}`}></div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-800 text-gray-400 rounded border border-gray-750 uppercase">{evt.dominioNegocio}</span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-red-950 text-red-400 rounded border border-red-900">⚠️ {evt.criticidadeRisco}</span>
                                                    </div>
                                                    <h4 className="text-lg font-black text-white">{evt.transacaoAtomica}</h4>
                                                    <p className="text-xs text-gray-400 font-semibold">Ator: <span className="text-cyan-400">{evt.atorEntrada || 'Não definido'}</span></p>
                                                    {evt.descricao && <p className="text-xs text-gray-500 italic">"{evt.descricao}"</p>}
                                                </div>
                                                <div className="flex justify-between border-t border-gray-850 pt-2 text-xs">
                                                    <button 
                                                        onClick={() => handleIniciarEditarEvento(evt)} 
                                                        className="text-cyan-400 hover:text-cyan-300 font-bold transition-all"
                                                        title="Editar Transação"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRemoverEvento(evt.id)} 
                                                        className="text-gray-500 hover:text-red-400 font-bold transition-all"
                                                        title="Excluir Transação"
                                                    >
                                                        Remover
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* SANFONA 2: MOTOR DE REGRAS */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                    <button 
                        type="button"
                        onClick={() => toggleAccordion('regras')}
                        className={`w-full p-5 flex justify-between items-center transition-all text-left font-bold text-lg text-white outline-none focus:outline-none ${activeAccordion === 'regras' ? 'bg-cyan-600' : 'bg-gray-750 hover:bg-gray-700'}`}
                    >
                        <span className="flex items-center gap-2">⚙️ 2. Motor de Regras</span>
                        <span className="text-sm font-semibold">{activeAccordion === 'regras' ? '▲ Recolher' : '▼ Expandir'}</span>
                    </button>
                    {activeAccordion === 'regras' && (
                        <div className="p-6 border-t border-gray-700 space-y-6 animate-fade-in">
                            <div className="border-b border-gray-700 pb-3 flex justify-between items-center flex-wrap gap-2">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                                        Travas & Segurança 
                                        {selectedEventoIdRegras && (
                                            loading ? (
                                                <span className="text-yellow-400 text-[10px] animate-pulse ml-2 font-normal">💾 Salvando...</span>
                                            ) : (
                                                <span className="text-emerald-400 text-[10px] ml-2 font-normal">✓ Sincronizado</span>
                                            )
                                        )}
                                    </h3>
                                    <p className="text-xs text-gray-450 mt-1">Defina travas e SoD. Salvamento automático ao inserir ou remover.</p>
                                </div>
                                <span className="text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-1 rounded font-semibold">Fase de Validação</span>
                            </div>

                            {dadosASI.eventos.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-yellow-400 text-sm font-semibold">⚠️ Cadastre pelo menos uma Transação Operacional na Sanfona 1 antes de parametrizar as regras.</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-350 mb-1">Selecione a Transação Operacional *</label>
                                        <select 
                                            value={selectedEventoIdRegras} 
                                            onChange={e => setSelectedEventoIdRegras(e.target.value)} 
                                            required 
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                                        >
                                            <option value="">Selecione uma transação...</option>
                                            {dadosASI.eventos.map(e => <option key={e.id} value={e.id}>{e.transacaoAtomica} ({e.dominioNegocio})</option>)}
                                        </select>
                                    </div>

                                    {selectedEventoIdRegras && (
                                        <div className="space-y-5 bg-gray-900/30 p-4 rounded-xl border border-gray-750 animate-fade-in">
                                            
                                            {/* Validações Sintáticas */}
                                            <div className="border-b border-gray-800 pb-4">
                                                <label className="block text-xs font-semibold text-gray-400 mb-1">
                                                    Validações Sintáticas (Travas de Interface) *
                                                    <DidacticInfo 
                                                        title="Validação Sintática" 
                                                        text="Filtros e máscaras estruturais no frontend que impedem dados corrompidos de saírem da interface do usuário.\n\nExemplo: Máscara de CNPJ obrigatória, Bloqueio de valores negativos, Campo 'E-mail' com validação Regex." 
                                                    />
                                                </label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={novaValidacaoSintatica} 
                                                        onChange={e => setNovaValidacaoSintatica(e.target.value)} 
                                                        placeholder={editandoValidacaoIdx !== null ? "Atualizar trava de validação..." : "Ex: CNPJ deve ser obrigatório e possuir 14 dígitos"} 
                                                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500" 
                                                    />
                                                    {editandoValidacaoIdx !== null && (
                                                        <button 
                                                            type="button" 
                                                            onClick={handleCancelarEditarValidacao}
                                                            className="bg-gray-750 hover:bg-gray-700 text-white font-semibold px-4 rounded-lg text-xs transition-all"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    )}
                                                    <button 
                                                        type="button" 
                                                        onClick={handleAdicionarValidacaoSintatica}
                                                        className="bg-gray-750 hover:bg-gray-700 text-cyan-400 font-bold px-5 rounded-lg text-xs transition-all"
                                                    >
                                                        {editandoValidacaoIdx !== null ? 'Salvar' : 'Inserir'}
                                                    </button>
                                                </div>
                                                {validacoesSintaticas.length > 0 && (
                                                    <ul className="mt-3 space-y-1.5">
                                                        {validacoesSintaticas.map((val, idx) => (
                                                            <li key={idx} className={`bg-gray-950/60 px-3 py-2 rounded border text-xs text-gray-300 flex justify-between items-center ${editandoValidacaoIdx === idx ? 'border-yellow-500' : 'border-gray-850'}`}>
                                                                <span>• {val}</span>
                                                                <div className="flex gap-2 text-[10px]">
                                                                    <button type="button" onClick={() => handleIniciarEditarValidacao(idx)} className="text-cyan-400 hover:underline">Editar</button>
                                                                    <button type="button" onClick={() => handleRemoverValidacaoSintatica(idx)} className="text-red-400 hover:underline">Remover</button>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            {/* Regra de Negócio + SoD Vinculados */}
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-bold uppercase text-yellow-500 tracking-wider flex items-center gap-2">
                                                    Regras e Alçadas (SoD Vinculada)
                                                    <DidacticInfo 
                                                        title="Regras & SoD Vinculados" 
                                                        text="Para cada Regra de Alçada restritiva do sistema, defina explicitamente qual cargo receberá o alerta de violação, impedindo a auto-aprovação (SoD).\n\nExemplo:\nRegra: Compras automáticas autorizadas até R$ 2.000.\nSoD: Transações excedentes exigem aprovação do Diretor de Compras, e o sistema valida que o operador não possui privilégio de aprovação." 
                                                    />
                                                </h4>
                                                
                                                <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800 space-y-3">
                                                    <div>
                                                        <label className="block text-[11px] text-gray-400 mb-1">Regra de Negócio (Alçada Limitadora)</label>
                                                        <textarea 
                                                            value={novaRegraNegocio} 
                                                            onChange={e => setNovaRegraNegocio(e.target.value)} 
                                                            placeholder="Ex: Descontos automáticos restritos a no máximo 5%" 
                                                            rows="2"
                                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-cyan-500 resize-none outline-none" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] text-gray-400 mb-1">Segregação de Funções (SoD Sistêmica)</label>
                                                        <textarea 
                                                            value={novaSodSistemico} 
                                                            onChange={e => setNovaSodSistemico(e.target.value)} 
                                                            placeholder="Ex: Exceções disparam aprovação para o Diretor Comercial. O sistema impede a auto-validação do vendedor travando seu UID." 
                                                            rows="2"
                                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-cyan-500 resize-none outline-none" 
                                                        />
                                                    </div>
                                                    <div className="text-right flex justify-end gap-2">
                                                        {editandoRegraSodId && (
                                                            <button 
                                                                type="button" 
                                                                onClick={handleCancelarEditarRegraSod}
                                                                className="bg-gray-700 hover:bg-gray-650 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow"
                                                            >
                                                                Cancelar
                                                            </button>
                                                        )}
                                                        <button 
                                                            type="button" 
                                                            onClick={handleAdicionarRegraSod}
                                                            className="bg-yellow-600 hover:bg-yellow-500 text-gray-950 font-bold px-4 py-1.5 rounded-lg text-xs transition-all shadow"
                                                        >
                                                            {editandoRegraSodId ? 'Salvar Edição' : 'Vincular Regra & SoD'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Exibição da Lista de Regras + SoD */}
                                                {regrasSod.length > 0 && (
                                                    <div className="space-y-2">
                                                        <h5 className="text-[11px] font-bold text-gray-400">Regras e Alçadas Aplicadas a esta Transação</h5>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {regrasSod.map((item) => (
                                                                <div key={item.id} className={`bg-gray-950 border p-3 rounded-lg flex justify-between gap-4 text-xs ${editandoRegraSodId === item.id ? 'border-yellow-500' : 'border-gray-885'}`}>
                                                                    <div className="space-y-1">
                                                                        <p className="text-white"><strong className="text-cyan-400 font-bold">Regra:</strong> {item.regraNegocio}</p>
                                                                        <p className="text-gray-300"><strong className="text-yellow-500 font-bold">SoD:</strong> {item.sodSistemico}</p>
                                                                    </div>
                                                                    <div className="flex flex-col gap-2 shrink-0 self-start text-[10px] font-bold">
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => handleIniciarEditarRegraSod(item)}
                                                                            className="text-cyan-400 hover:underline text-right"
                                                                        >
                                                                            Editar
                                                                        </button>
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => handleRemoverRegraSod(item.id)}
                                                                            className="text-red-400 hover:underline text-right"
                                                                        >
                                                                            Remover
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* SANFONA 3: PERSISTÊNCIA / SAÍDA */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                    <button 
                        type="button"
                        onClick={() => toggleAccordion('persistencia')}
                        className={`w-full p-5 flex justify-between items-center transition-all text-left font-bold text-lg text-white outline-none focus:outline-none ${activeAccordion === 'persistencia' ? 'bg-cyan-600' : 'bg-gray-750 hover:bg-gray-700'}`}
                    >
                        <span className="flex items-center gap-2">💾 3. Saída / Persistência</span>
                        <span className="text-sm font-semibold">{activeAccordion === 'persistencia' ? '▲ Recolher' : '▼ Expandir'}</span>
                    </button>
                    {activeAccordion === 'persistencia' && (
                        <div className="p-6 border-t border-gray-700 space-y-6 animate-fade-in">
                            <div className="border-b border-gray-700 pb-3 flex justify-between items-center flex-wrap gap-2">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                                        Resiliência & Auditabilidade
                                        {selectedEventoIdPersistencia && (
                                            loading ? (
                                                <span className="text-yellow-400 text-[10px] animate-pulse ml-2 font-normal">💾 Salvando...</span>
                                            ) : (
                                                <span className="text-emerald-400 text-[10px] ml-2 font-normal">✓ Sincronizado</span>
                                            )
                                        )}
                                    </h3>
                                    <p className="text-xs text-gray-450 mt-1">Configure trilhas de logs e resiliência técnica de commit.</p>
                                </div>
                                <span className="text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-1 rounded font-semibold">Fase de Commit</span>
                            </div>

                            {dadosASI.eventos.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-yellow-400 text-sm font-semibold">⚠️ Cadastre pelo menos uma Transação Operacional na Sanfona 1 antes de gerenciar a persistência.</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-355 mb-1">Selecione a Transação Operacional *</label>
                                        <select 
                                            value={selectedEventoIdPersistencia} 
                                            onChange={e => setSelectedEventoIdPersistencia(e.target.value)} 
                                            required 
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                                        >
                                            <option value="">Selecione uma transação...</option>
                                            {dadosASI.eventos.map(e => <option key={e.id} value={e.id}>{e.transacaoAtomica} ({e.dominioNegocio})</option>)}
                                        </select>
                                    </div>

                                    {selectedEventoIdPersistencia && (
                                        <div className="space-y-5 bg-gray-900/30 p-4 rounded-xl border border-gray-750 animate-fade-in">
                                            
                                            {/* Trilha de Não-Repudiação (Mapeável incrementalmente) */}
                                            <div className="border-b border-gray-800 pb-4">
                                                <label className="block text-xs font-semibold text-gray-400 mb-2">
                                                    Trilha de Não-Repudiação (Atributos de Auditoria Imutáveis no Log) *
                                                    <DidacticInfo 
                                                        title="Não-Repudiação / Audit Log" 
                                                        text="Garantia legal de que o autor do evento não poderá negar sua autoria. O sistema deve gravar atributos imutáveis e auditáveis no log no momento da transação.\n\nExemplo:\n1. ID Único do Usuário (UID)\n2. Endereço IP / Geolocalização\n3. Timestamp do Servidor (UTC)\n4. Assinatura Hash ou Payload do Evento" 
                                                    />
                                                </label>
                                                
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={novaTrilha} 
                                                        onChange={e => setNovaTrilha(e.target.value)} 
                                                        placeholder={editandoTrilhaIdx !== null ? "Atualizar atributo do log..." : "Ex: ID único do Usuário (UID)"} 
                                                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500" 
                                                    />
                                                    {editandoTrilhaIdx !== null && (
                                                        <button 
                                                            type="button" 
                                                            onClick={handleCancelarEditarTrilha}
                                                            className="bg-gray-750 hover:bg-gray-700 text-white font-semibold px-4 rounded-lg text-xs transition-all"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    )}
                                                    <button 
                                                        type="button" 
                                                        onClick={handleAdicionarTrilha}
                                                        className="bg-gray-755 hover:bg-gray-700 text-cyan-400 font-bold px-5 rounded-lg text-xs transition-all"
                                                    >
                                                        {editandoTrilhaIdx !== null ? 'Salvar' : 'Inserir'}
                                                    </button>
                                                </div>
                                                {trilhaNaoRepudiacao.length > 0 && (
                                                    <ul className="mt-3 space-y-1.5">
                                                        {trilhaNaoRepudiacao.map((item, idx) => (
                                                            <li key={idx} className={`bg-gray-950/60 px-3 py-2 rounded border text-xs text-gray-300 flex justify-between items-center ${editandoTrilhaIdx === idx ? 'border-yellow-500' : 'border-gray-850'}`}>
                                                                <span>• {item}</span>
                                                                <div className="flex gap-2 text-[10px]">
                                                                    <button type="button" onClick={() => handleIniciarEditarTrilha(idx)} className="text-cyan-400 hover:underline">Editar</button>
                                                                    <button type="button" onClick={() => handleRemoverTrilha(idx)} className="text-red-400 hover:underline">Remover</button>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            {/* Protocolo de Falha */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1">
                                                    Protocolo de Falha (Failover) *
                                                    <DidacticInfo 
                                                        title="Protocolo de Falha" 
                                                        text="Decisão de projeto de infraestrutura na queda dos servidores primários.\n\n- Bloquear transações: Evita fraudes temporais, mas paralisa a receita.\n- Contingência/Buffer Local: Salva localmente em cache para sincronização tardia, mas abre margem para fraudes sem validação ativa online." 
                                                    />
                                                </label>
                                                <textarea 
                                                    value={protocoloFalha} 
                                                    onChange={e => setProtocoloFalha(e.target.value)} 
                                                    onBlur={handleBlurPersistenciaText}
                                                    required 
                                                    rows="2" 
                                                    placeholder="Qual o comportamento do sistema se a infraestrutura cair na execução deste commit? (Ex: Bloqueio ou Modo Contingência local)" 
                                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500 resize-none" 
                                                />
                                            </div>

                                            {/* Sobrevivência 2 Horas */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1">
                                                    Protocolo de Sobrevivência (Próximas 2 Horas) *
                                                    <DidacticInfo 
                                                        title="Sobrevivência nas próximas 2 horas" 
                                                        text="Mecanismo de contorno técnico e operacional temporário para manter o negócio minimamente operante enquanto o time de SRE/Nuvem restabelece o sinal principal." 
                                                    />
                                                </label>
                                                <textarea 
                                                    value={sobrevivencia2h} 
                                                    onChange={e => setSobrevivencia2h(e.target.value)} 
                                                    onBlur={handleBlurPersistenciaText}
                                                    required 
                                                    rows="2" 
                                                    placeholder="Descreva de que forma o sistema garante a integridade e funcionamento da transação em 2 horas de apagão..." 
                                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500 resize-none" 
                                                />
                                            </div>

                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* SANFONA 4: PAINEL DE AUDITORIA DICS */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                    <button 
                        type="button"
                        onClick={() => toggleAccordion('resumo')}
                        className={`w-full p-5 flex justify-between items-center transition-all text-left font-bold text-lg text-white outline-none focus:outline-none ${activeAccordion === 'resumo' ? 'bg-cyan-600' : 'bg-gray-750 hover:bg-gray-700'}`}
                    >
                        <span className="flex items-center gap-2">📊 4. Painel de Auditoria DICS</span>
                        <span className="text-sm font-semibold">{activeAccordion === 'resumo' ? '▲ Recolher' : '▼ Expandir'}</span>
                    </button>
                    {activeAccordion === 'resumo' && (
                        <div className="p-6 border-t border-gray-700 space-y-6 animate-fade-in">
                            <div className="border-b border-gray-700 pb-3 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white">Painel de Auditoria DICS</h3>
                                <span className="text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-1 rounded font-semibold">Resumo Diagnóstico</span>
                            </div>

                            {totalTransacoes === 0 ? (
                                <div className="bg-gray-900/50 p-8 rounded-xl border border-gray-750 text-center py-16 space-y-4">
                                    <svg className="w-16 h-16 text-yellow-500/50 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="text-gray-300 font-bold text-lg">Ainda Não Há Dados para Auditar</p>
                                    <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
                                        Cadastre transações na **Sanfona 1** e configure suas regras na **Sanfona 2** e **Sanfona 3** para gerar a análise de governança de TI do seu Gêmeo Digital.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* GRID DE KPIS */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-gray-900 p-4 rounded-xl border border-gray-750 flex flex-col items-center justify-center text-center">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Score Geral</span>
                                            <span className={`text-3xl font-black mt-2 ${averageGovernanceScore >= 80 ? 'text-emerald-400' : averageGovernanceScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {averageGovernanceScore}%
                                            </span>
                                            <span className="text-[9px] text-gray-400 mt-1 font-semibold">Conformidade Analítica</span>
                                        </div>
                                        <div className="bg-gray-900 p-4 rounded-xl border border-gray-750 flex flex-col items-center justify-center text-center">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Transações</span>
                                            <span className="text-3xl font-black mt-2 text-white">{totalTransacoes}</span>
                                            <span className="text-[9px] text-gray-400 mt-1 font-semibold">Eventos Mapeados</span>
                                        </div>
                                        <div className="bg-gray-900 p-4 rounded-xl border border-gray-750 flex flex-col items-center justify-center text-center">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Regras & SoD</span>
                                            <span className="text-3xl font-black mt-2 text-cyan-400">{totalRegrasSod}</span>
                                            <span className="text-[9px] text-gray-400 mt-1 font-semibold">Privilégios Segregados</span>
                                        </div>
                                        <div className="bg-gray-900 p-4 rounded-xl border border-gray-750 flex flex-col items-center justify-center text-center">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Audit Log</span>
                                            <span className="text-3xl font-black mt-2 text-purple-400">{totalLogs}</span>
                                            <span className="text-[9px] text-gray-400 mt-1 font-semibold">Atributos Imutáveis</span>
                                        </div>
                                    </div>

                                    {/* SEÇÃO ANALÍTICA */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Distribuição de Riscos */}
                                        <div className="bg-gray-900 p-5 rounded-xl border border-gray-750 space-y-4">
                                            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Criticidades Mapeadas</h4>
                                            <div className="space-y-3">
                                                {Object.entries(transacoesPorRisco).map(([risco, transacoes]) => (
                                                    <div key={risco} className="bg-gray-950/40 p-3 rounded-lg border border-gray-850">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">⚠️ {risco}</span>
                                                            <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded font-semibold border border-red-900">{transacoes.length}</span>
                                                        </div>
                                                        <ul className="text-[11px] text-gray-300 space-y-1 list-disc list-inside">
                                                            {transacoes.map((t, idx) => <li key={idx} className="truncate">{t}</li>)}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Status de Auditoria das Transações */}
                                        <div className="lg:col-span-2 bg-gray-900 p-5 rounded-xl border border-gray-750 space-y-4">
                                            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Relatório de Rastreabilidade & SoD</h4>
                                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                                {checklistGovernanca.map(item => (
                                                    <div key={item.id} className="bg-gray-950/70 p-3 rounded-lg border border-gray-800 space-y-2">
                                                        <div className="flex justify-between items-start gap-4">
                                                            <div>
                                                                <h5 className="font-bold text-white text-sm">{item.transacaoAtomica}</h5>
                                                                <span className="text-[9px] bg-gray-850 text-gray-400 px-2 py-0.5 rounded uppercase font-semibold border border-gray-850 mt-1 inline-block">
                                                                    {item.dominioNegocio}
                                                                </span>
                                                            </div>
                                                            <span className={`text-xs font-black px-2 py-1 rounded ${item.scorePercent === 100 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-yellow-950 text-yellow-400 border border-yellow-800'}`}>
                                                                {item.scorePercent}% Completo
                                                            </span>
                                                        </div>

                                                        {/* Barrinha de Cobertura */}
                                                        <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${item.scorePercent === 100 ? 'bg-emerald-500' : 'bg-yellow-500'}`} style={{ width: `${item.scorePercent}%` }}></div>
                                                        </div>

                                                        {/* Checkmarks de Governança */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px] text-gray-400 font-semibold">
                                                            <span className={item.coberturaSintatica ? "text-emerald-400" : "text-red-400"}>
                                                                {item.coberturaSintatica ? "✓" : "✗"} Filtros Sintáticos
                                                            </span>
                                                            <span className={item.coberturaSod ? "text-emerald-400" : "text-red-400"}>
                                                                {item.coberturaSod ? "✓" : "✗"} SoD Vinculado
                                                            </span>
                                                            <span className={item.coberturaAuditoria ? "text-emerald-400" : "text-red-400"} title={`Atributos de log cadastrados: ${item.qtdLogs}`}>
                                                                {item.coberturaAuditoria ? "✓" : "✗"} Logs imutáveis ({item.qtdLogs}/4)
                                                            </span>
                                                            <span className={item.coberturaSRE ? "text-emerald-400" : "text-red-400"}>
                                                                {item.coberturaSRE ? "✓" : "✗"} Plano Failover
                                                            </span>
                                                        </div>

                                                        {/* Alertas Diagnósticos */}
                                                        {item.scorePercent < 100 && (
                                                            <div className="bg-red-950/20 border border-red-900/40 p-2 rounded text-[10px] text-red-400/90 leading-normal">
                                                                <strong>Recomendações:</strong>
                                                                <ul className="list-disc list-inside mt-0.5 space-y-0.5 font-medium">
                                                                    {!item.coberturaSintatica && <li>Configurar validações sintáticas para evitar corrupção de entrada.</li>}
                                                                    {!item.coberturaSod && <li>Vincular uma regra de alçada a um perfil de aprovação SoD.</li>}
                                                                    {!item.coberturaAuditoria && <li>Adicionar pelo menos 4 atributos de log de auditoria para fins de não-repudiação.</li>}
                                                                    {!item.coberturaSRE && <li>Planejar o protocolo de falha (SRE/Contingência de 2 horas).</li>}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
            
        </div>
    );
}

export default AdmSIGovernanca;
