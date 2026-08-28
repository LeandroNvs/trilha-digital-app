import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId, auth } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';

// Componente Tooltip Didático
function DidacticInfo({ id, title, text, activeTooltipId, setActiveTooltipId, align = "center" }) {
    const isOpen = activeTooltipId === id;
    
    const toggle = (e) => {
        e.stopPropagation();
        setActiveTooltipId(isOpen ? null : id);
    };

    return (
        <div className="inline-block ml-2 relative align-middle">
            <button 
                type="button"
                onClick={toggle}
                className={`w-4 h-4 rounded-full font-bold text-[10px] flex items-center justify-center border transition-all focus:outline-none ${isOpen ? 'bg-cyan-500 text-gray-900 border-cyan-400' : 'bg-cyan-900/50 hover:bg-cyan-800 text-cyan-400 border-cyan-700/50'}`}
                title="Clique para ajuda didática"
            >
                i
            </button>
            {isOpen && (
                <>
                    {/* VERSÃO MOBILE: Modal centralizado */}
                    <div 
                        className="sm:hidden fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 animate-fade-in"
                        onClick={() => setActiveTooltipId(null)}
                    >
                        <div 
                            className="bg-gray-900 border border-cyan-500/40 p-5 rounded-2xl shadow-2xl w-full max-w-xs text-left relative space-y-3 animate-fade-in-up"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center border-b border-cyan-900/60 pb-2">
                                <strong className="text-cyan-400 uppercase tracking-wider text-[11px] font-bold">{title}</strong>
                                <button 
                                    type="button" 
                                    onClick={() => setActiveTooltipId(null)} 
                                    className="text-gray-400 hover:text-white font-bold text-lg leading-none"
                                >
                                    &times;
                                </button>
                            </div>
                            <p className="whitespace-pre-line text-xs font-normal text-gray-200 leading-relaxed">
                                {text}
                            </p>
                            <div className="pt-2 text-right">
                                <button 
                                    type="button" 
                                    onClick={() => setActiveTooltipId(null)} 
                                    className="bg-cyan-600 hover:bg-cyan-500 text-gray-950 font-bold text-[10px] px-3.5 py-1.5 rounded-lg transition-all shadow"
                                >
                                    Entendi
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* VERSÃO DESKTOP: Popover flutuante */}
                    <div 
                        className={`hidden sm:block absolute bottom-full mb-2 bg-gray-900 border border-cyan-500/50 p-4 rounded-xl shadow-2xl z-50 w-80 text-[11px] font-normal text-gray-300 leading-relaxed animate-fade-in-up ${
                            align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-2 border-b border-cyan-900 pb-1">
                            <strong className="text-cyan-400 uppercase tracking-wider text-[9px] font-bold">{title}</strong>
                            <button type="button" onClick={() => setActiveTooltipId(null)} className="text-gray-500 hover:text-white font-bold">&times;</button>
                        </div>
                        <p className="whitespace-pre-line">{text}</p>
                        <div className={`absolute top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900 ${
                            align === "left" ? "left-4" : align === "right" ? "right-4" : "left-1/2 -translate-x-1/2"
                        }`}></div>
                    </div>
                </>
            )}
        </div>
    );
}

// Sub-componente para renderizar os cards de auditoria G.A.D.
function GadAuditCard({ item }) {
    const [showRecommendations, setShowRecommendations] = useState(false);

    // Módulo G: Gatilho Completo
    const gatilhoCompleto = !!(item.gatilhoTransacao?.trim() && item.gatilhoIndicador?.trim() && item.gatilhoJanela?.trim() && item.gatilhoLogica?.trim() && item.gatilhoBaseline?.trim());

    // Módulo A: Agregação OLAP Válida (Pelo menos 2 dimensões preenchidas)
    const dimTempoPreenchida = !!item.agregacaoTempo?.trim();
    const dimGeograficaPreenchida = !!item.agregacaoGeografica?.trim();
    const dimNegocioPreenchida = !!item.agregacaoNegocio?.trim();
    const dimCount = (dimTempoPreenchida ? 1 : 0) + (dimGeograficaPreenchida ? 1 : 0) + (dimNegocioPreenchida ? 1 : 0);
    const agregacaoValida = dimCount >= 2;

    // Módulo D: Decisão Mapeada
    const decisaoMapeada = !!(item.decisaoArea?.trim() && item.decisaoProtocolo?.trim());

    const complianceScore = Math.round(((gatilhoCompleto ? 1 : 0) + (agregacaoValida ? 1 : 0) + (decisaoMapeada ? 1 : 0)) * 33.33);
    const finalScore = complianceScore > 99 ? 100 : complianceScore;

    return (
        <div className="bg-gray-950/75 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-0.5">
                    <h5 className="font-bold text-white text-[12px]">{item.vetorDesvio}</h5>
                    <span className="text-[8px] bg-cyan-950/70 text-cyan-400 px-1.5 py-0.5 rounded font-semibold border border-cyan-900 mt-1 inline-block">
                        G.A.D. Ativo
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${finalScore === 100 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-yellow-950 text-yellow-400 border border-yellow-800'}`}>
                        {finalScore}%
                    </span>
                    {finalScore < 100 && (
                        <button
                            type="button"
                            onClick={() => setShowRecommendations(!showRecommendations)}
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs border transition-all focus:outline-none ${showRecommendations ? 'bg-red-500 text-white border-red-400' : 'bg-red-950/60 text-red-400 border-red-900/50 hover:bg-red-900/30'}`}
                            title="Ver recomendações"
                        >
                            i
                        </button>
                    )}
                </div>
            </div>

            {/* Barrinha de Cobertura */}
            <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${finalScore === 100 ? 'bg-emerald-500' : 'bg-yellow-500'}`} style={{ width: `${finalScore}%` }}></div>
            </div>

            {/* Checkmarks de Módulos G.A.D. */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-[9px] text-gray-400 font-semibold">
                <span className={gatilhoCompleto ? "text-emerald-400" : "text-red-400"}>
                    {gatilhoCompleto ? "✓" : "✗"} G - Gatilho
                </span>
                <span className={agregacaoValida ? "text-emerald-400" : "text-red-400"}>
                    {agregacaoValida ? "✓" : "✗"} A - Agregação (OLAP)
                </span>
                <span className={decisaoMapeada ? "text-emerald-400" : "text-red-400"}>
                    {decisaoMapeada ? "✓" : "✗"} D - Decisão
                </span>
            </div>

            {/* Alertas Diagnósticos Colapsáveis */}
            {finalScore < 100 && showRecommendations && (
                <div className="bg-red-950/20 border border-red-900/40 p-2 rounded text-[10px] text-red-400/90 leading-normal animate-fade-in-up">
                    <strong>Pendências de Modelagem Tática:</strong>
                    <ul className="list-disc list-inside mt-0.5 space-y-0.5 font-medium">
                        {!gatilhoCompleto && <li>Preencher todos os campos do Gatilho (transação, indicador, lógica de ruptura e baseline).</li>}
                        {!agregacaoValida && <li>Obrigatoriedade de preencher pelo menos duas dimensões de Agregação OLAP para cruzar os dados.</li>}
                        {!decisaoMapeada && <li>Definir a área notificada e o protocolo de ação emergencial para a tomada de decisão.</li>}
                    </ul>
                </div>
            )}
        </div>
    );
}

function AdmSITatica() {
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
        persistencia: [],
        taticaDiretriz: '',
        taticaDiretrizes: [],
        taticaVetores: []
    });

    // Controlador de Abertura de Sanfona
    const [activeAccordion, setActiveAccordion] = useState('cadastro');

    const toggleAccordion = (name) => {
        setActiveAccordion(activeAccordion === name ? '' : name);
    };

    // Controlador de Tooltips Didáticos
    const [activeTooltipId, setActiveTooltipId] = useState(null);

    useEffect(() => {
        const fecharTodosTooltips = () => setActiveTooltipId(null);
        window.addEventListener('click', fecharTodosTooltips);
        return () => window.removeEventListener('click', fecharTodosTooltips);
    }, []);

    // ----------------------------------------------------
    // FORM STATES - SANFONA 1: DIRETRIZ & GAD VETORES
    // ----------------------------------------------------
    // Cadastro de Diretrizes
    const [novaDiretrizTexto, setNovaDiretrizTexto] = useState('');
    const [diretrizEditandoId, setDiretrizEditandoId] = useState(null);

    // Vetor GAD Form
    const [vetorEditandoId, setVetorEditandoId] = useState(null);
    const [selectedDiretrizId, setSelectedDiretrizId] = useState('');
    const [vetorDesvio, setVetorDesvio] = useState('');
    
    // G - Gatilho
    const [gatilhoTransacao, setGatilhoTransacao] = useState('');
    const [gatilhoIndicador, setGatilhoIndicador] = useState('');
    const [gatilhoJanela, setGatilhoJanela] = useState('');
    const [gatilhoLogica, setGatilhoLogica] = useState('');
    const [gatilhoBaseline, setGatilhoBaseline] = useState('');

    // A - Agregação
    const [agregacaoTempo, setAgregacaoTempo] = useState('');
    const [agregacaoGeografica, setAgregacaoGeografica] = useState('');
    const [agregacaoNegocio, setAgregacaoNegocio] = useState('');

    // D - Decisão
    const [decisaoArea, setDecisaoArea] = useState('');
    const [decisaoProtocolo, setDecisaoProtocolo] = useState('');

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

    // Escutar os dados da governança e tática do Grupo Selecionado
    useEffect(() => {
        if (!selectedGroupId) {
            setDadosASI({ organizacao: null, eventos: [], regras: [], persistencia: [], taticaDiretriz: '', taticaDiretrizes: [], taticaVetores: [] });
            return;
        }

        const docRef = doc(db, `artifacts/${appId}/public/data/asi_dados`, selectedGroupId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // Migração de legados: se taticaDiretrizes estiver vazio mas taticaDiretriz tiver texto, criamos o default
                let listDiretrizes = data.taticaDiretrizes || [];
                if (listDiretrizes.length === 0 && data.taticaDiretriz) {
                    listDiretrizes = [{ id: 'default', descricao: data.taticaDiretriz }];
                }

                // Normalização dos vetores para sempre possuírem diretrizId
                let listVetores = data.taticaVetores || [];
                listVetores = listVetores.map(v => ({
                    ...v,
                    diretrizId: v.diretrizId || 'default'
                }));

                setDadosASI({
                    organizacao: data.organizacao || null,
                    eventos: data.eventos || [],
                    regras: data.regras || [],
                    persistencia: data.persistencia || [],
                    taticaDiretriz: data.taticaDiretriz || '',
                    taticaDiretrizes: listDiretrizes,
                    taticaVetores: listVetores
                });
            } else {
                setDadosASI({ organizacao: null, eventos: [], regras: [], persistencia: [], taticaDiretriz: '', taticaDiretrizes: [], taticaVetores: [] });
            }
        }, (error) => {
            console.error("Erro ao escutar dados da Matriz Tática:", error);
        });

        return () => unsubscribe();
    }, [selectedGroupId]);

    const salvarDadosFirestore = async (novosDados) => {
        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/asi_dados`, selectedGroupId);
            await setDoc(docRef, {
                ...novosDados,
                grupoId: selectedGroupId,
                dataModificacao: new Date()
            }, { merge: true });
        } catch (error) {
            console.error("Erro ao salvar dados táticos:", error);
            setErro("Falha ao salvar as informações no banco de dados.");
        }
    };

    // ----------------------------------------------------
    // ACTIONS - GERENCIAR DIRETRIZES ESTRATÉGICAS
    // ----------------------------------------------------
    const handleSalvarDiretriz = async (e) => {
        e.preventDefault();
        if (!selectedGroupId || !novaDiretrizTexto.trim()) return;

        setLoading(true);
        let novasDiretrizes;

        if (diretrizEditandoId) {
            // Editando existente
            novasDiretrizes = dadosASI.taticaDiretrizes.map(d => 
                d.id === diretrizEditandoId ? { ...d, descricao: novaDiretrizTexto.trim() } : d
            );
        } else {
            // Nova diretriz
            const novaD = {
                id: `dir-${Date.now()}`,
                descricao: novaDiretrizTexto.trim()
            };
            novasDiretrizes = [...dadosASI.taticaDiretrizes, novaD];
        }

        await salvarDadosFirestore({
            ...dadosASI,
            taticaDiretrizes: novasDiretrizes
        });

        setNovaDiretrizTexto('');
        setDiretrizEditandoId(null);
        setSucesso(diretrizEditandoId ? "Diretriz estratégica atualizada!" : "Diretriz estratégica adicionada!");
        setTimeout(() => setSucesso(''), 3000);
        setLoading(false);
    };

    const handleIniciarEditarDiretriz = (diretriz) => {
        setDiretrizEditandoId(diretriz.id);
        setNovaDiretrizTexto(diretriz.descricao);
    };

    const handleCancelarEditarDiretriz = () => {
        setDiretrizEditandoId(null);
        setNovaDiretrizTexto('');
    };

    const handleRemoverDiretriz = async (diretrizId) => {
        // Verifica se há vetores vinculados a essa diretriz
        const vetoresVinculados = dadosASI.taticaVetores.filter(v => v.diretrizId === diretrizId);
        if (vetoresVinculados.length > 0) {
            alert(`Não é possível remover esta diretriz pois ela possui ${vetoresVinculados.length} vetor(es) de desvio vinculados.`);
            return;
        }

        if (!window.confirm("Remover esta diretriz estratégica?")) return;

        setLoading(true);
        const novasDiretrizes = dadosASI.taticaDiretrizes.filter(d => d.id !== diretrizId);
        await salvarDadosFirestore({
            ...dadosASI,
            taticaDiretrizes: novasDiretrizes
        });
        setLoading(false);
    };

    // ----------------------------------------------------
    // ACTIONS - VETORES DE DESVIO (G.A.D.)
    // ----------------------------------------------------
    const handleSalvarVetor = async (e) => {
        e.preventDefault();
        if (!selectedGroupId) return;

        if (!selectedDiretrizId) {
            setErro("Selecione uma diretriz estratégica associada.");
            return;
        }

        if (!vetorDesvio.trim() || !gatilhoTransacao.trim() || !gatilhoIndicador.trim() || !gatilhoJanela.trim() || !gatilhoLogica.trim() || !gatilhoBaseline.trim()) {
            setErro("Preencha todos os campos obrigatórios (*) do vetor e do gatilho.");
            return;
        }

        // Validação de Agregação OLAP: pelo menos duas dimensões
        let dimCount = 0;
        if (agregacaoTempo.trim()) dimCount++;
        if (agregacaoGeografica.trim()) dimCount++;
        if (agregacaoNegocio.trim()) dimCount++;

        if (dimCount < 2) {
            setErro("Restrição de Modelagem OLAP: Para a Agregação, é obrigatório preencher pelo menos duas das três dimensões (Tempo, Geográfica ou Negócio) para forçar o cruzamento de dados.");
            return;
        }

        if (!decisaoArea.trim() || !decisaoProtocolo.trim()) {
            setErro("Preencha todos os campos de Decisão (área notificada e protocolo).");
            return;
        }

        setErro('');
        setLoading(true);

        const novoVetor = {
            id: vetorEditandoId || `vetor-${Date.now()}`,
            diretrizId: selectedDiretrizId,
            vetorDesvio: vetorDesvio.trim(),
            gatilhoTransacao: gatilhoTransacao.trim(),
            gatilhoIndicador: gatilhoIndicador.trim(),
            gatilhoJanela: gatilhoJanela.trim(),
            gatilhoLogica: gatilhoLogica.trim(),
            gatilhoBaseline: gatilhoBaseline.trim(),
            agregacaoTempo: agregacaoTempo.trim(),
            agregacaoGeografica: agregacaoGeografica.trim(),
            agregacaoNegocio: agregacaoNegocio.trim(),
            decisaoArea: decisaoArea.trim(),
            decisaoProtocolo: decisaoProtocolo.trim()
        };

        let novosVetores;
        if (vetorEditandoId) {
            novosVetores = dadosASI.taticaVetores.map(v => v.id === vetorEditandoId ? novoVetor : v);
        } else {
            novosVetores = [...(dadosASI.taticaVetores || []), novoVetor];
        }

        await salvarDadosFirestore({
            ...dadosASI,
            taticaVetores: novosVetores
        });

        // Limpar Formulário
        setVetorEditandoId(null);
        setSelectedDiretrizId('');
        setVetorDesvio('');
        setGatilhoTransacao('');
        setGatilhoIndicador('');
        setGatilhoJanela('');
        setGatilhoLogica('');
        setGatilhoBaseline('');
        setAgregacaoTempo('');
        setAgregacaoGeografica('');
        setAgregacaoNegocio('');
        setDecisaoArea('');
        setDecisaoProtocolo('');
        setSucesso("Vetor de desvio (G.A.D.) salvo com sucesso!");
        setTimeout(() => setSucesso(''), 3000);
        setLoading(false);
    };

    const handleIniciarEditarVetor = (vetor) => {
        setVetorEditandoId(vetor.id);
        setSelectedDiretrizId(vetor.diretrizId || '');
        setVetorDesvio(vetor.vetorDesvio || '');
        setGatilhoTransacao(vetor.gatilhoTransacao || '');
        setGatilhoIndicador(vetor.gatilhoIndicador || '');
        setGatilhoJanela(vetor.gatilhoJanela || '');
        setGatilhoLogica(vetor.gatilhoLogica || '');
        setGatilhoBaseline(vetor.gatilhoBaseline || '');
        setAgregacaoTempo(vetor.agregacaoTempo || '');
        setAgregacaoGeografica(vetor.agregacaoGeografica || '');
        setAgregacaoNegocio(vetor.agregacaoNegocio || '');
        setDecisaoArea(vetor.decisaoArea || '');
        setDecisaoProtocolo(vetor.decisaoProtocolo || '');
        
        // Scroll suave até o início do formulário de cadastro
        setTimeout(() => {
            const el = document.getElementById('accordion-cadastro-header');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    };

    const handleCancelarEditarVetor = () => {
        setVetorEditandoId(null);
        setSelectedDiretrizId('');
        setVetorDesvio('');
        setGatilhoTransacao('');
        setGatilhoIndicador('');
        setGatilhoJanela('');
        setGatilhoLogica('');
        setGatilhoBaseline('');
        setAgregacaoTempo('');
        setAgregacaoGeografica('');
        setAgregacaoNegocio('');
        setDecisaoArea('');
        setDecisaoProtocolo('');
    };

    const handleRemoverVetor = async (vetorId) => {
        if (!window.confirm("Deseja realmente remover este Vetor de Desvio (G.A.D.)?")) return;
        setLoading(true);
        const novosVetores = dadosASI.taticaVetores.filter(v => v.id !== vetorId);
        await salvarDadosFirestore({
            ...dadosASI,
            taticaVetores: novosVetores
        });
        setLoading(false);
    };

    return (
        <div className="p-1 sm:p-4 mt-2 max-w-7xl mx-auto space-y-4">
            
            {/* CABEÇALHO DA PÁGINA */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow-md">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                        🎯 Matriz Tática (G.A.D.)
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">
                        Mapeamento de desvios estratégicos com lógica de Gatilho, Agregação e Decisão.
                    </p>
                </div>

                {/* Seletor de Grupo */}
                <div className="w-full sm:w-72 shrink-0">
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Grupo de Projeto *</label>
                    {isGruposLoading || isLoadingProfile ? (
                        <div className="h-9 bg-gray-700 animate-pulse rounded-lg w-full"></div>
                    ) : (
                        <select 
                            value={selectedGroupId} 
                            onChange={(e) => {
                                setSelectedGroupId(e.target.value);
                                handleCancelarEditarVetor();
                                handleCancelarEditarDiretriz();
                            }}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                            <option value="">Selecione seu grupo...</option>
                            {meusGrupos.map(g => (
                                <option key={g.id} value={g.id}>{g.nome} - {g.numero || 'Sem Número'}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* AVISOS GLOBAIS */}
            {erro && (
                <div className="bg-red-950/60 border border-red-800 text-red-200 text-xs p-3.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg animate-fade-in">
                    <span>⚠️</span> {erro}
                </div>
            )}
            {sucesso && (
                <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs p-3.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg animate-fade-in">
                    <span>✓</span> {sucesso}
                </div>
            )}

            {!selectedGroupId ? (
                <div className="bg-gray-800/40 border border-gray-750 p-8 rounded-2xl text-center space-y-2">
                    <p className="text-yellow-500 font-bold text-sm">⚠️ Nenhuma Organização Selecionada</p>
                    <p className="text-xs text-gray-400">Selecione o Grupo de Projeto no canto superior direito para acessar a Matriz Tática.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    
                    {/* SANFONA 1: DIRETRIZ & CADASTRO GAD VETORES */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                        <button 
                            type="button"
                            id="accordion-cadastro-header"
                            onClick={() => toggleAccordion('cadastro')}
                            className={`w-full p-4 sm:p-5 flex justify-between items-center transition-all text-left font-bold text-sm sm:text-base text-white outline-none focus:outline-none ${activeAccordion === 'cadastro' ? 'bg-cyan-600' : 'bg-gray-750 hover:bg-gray-700'}`}
                        >
                            <span className="flex items-center gap-2">📐 1. Diretriz & Modelagem G.A.D.</span>
                            <span className="text-xs font-semibold">{activeAccordion === 'cadastro' ? '▲ Recolher' : '▼ Expandir'}</span>
                        </button>
                        {activeAccordion === 'cadastro' && (
                            <div className="p-3 sm:p-6 border-t border-gray-700 space-y-6 animate-fade-in">
                                
                                {/* BLOCO 1: GERENCIAR DIRETRIZES ESTRATÉGICAS */}
                                <div className="space-y-4 bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                                    <div className="border-b border-gray-800 pb-1 flex justify-between items-center">
                                        <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center">
                                            📋 Diretrizes Estratégicas (Missões)
                                            <DidacticInfo 
                                                id="diretriz"
                                                title="Diretrizes estratégicas" 
                                                text={"Os objetivos de negócio de alto nível que servem de base para o monitoramento tático. Você pode cadastrar múltiplas diretrizes.\n\nExemplo:\n1. Defender Market Share com rentabilidade mínima de 15%.\n2. Expandir cobertura de atendimento logístico no Nordeste."} 
                                                activeTooltipId={activeTooltipId}
                                                setActiveTooltipId={setActiveTooltipId}
                                                align="left"
                                            />
                                        </h3>
                                    </div>

                                    {/* Formulário de adicionar diretriz */}
                                    <form onSubmit={handleSalvarDiretriz} className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={novaDiretrizTexto}
                                            onChange={e => setNovaDiretrizTexto(e.target.value)}
                                            required
                                            placeholder="Ex: Defender Market Share com rentabilidade mínima de 15%."
                                            className="flex-1 bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                                        />
                                        {diretrizEditandoId && (
                                            <button 
                                                type="button" 
                                                onClick={handleCancelarEditarDiretriz}
                                                className="bg-gray-750 hover:bg-gray-700 text-white font-bold px-3 rounded-lg text-[10px] transition-all"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                        <button 
                                            type="submit"
                                            className="bg-cyan-900/60 hover:bg-cyan-800 text-cyan-400 font-bold px-4 rounded-lg text-[10px] transition-all border border-cyan-800"
                                        >
                                            {diretrizEditandoId ? 'Salvar' : 'Adicionar'}
                                        </button>
                                    </form>

                                    {/* Lista de diretrizes cadastradas */}
                                    {dadosASI.taticaDiretrizes.length > 0 && (
                                        <ul className="space-y-1.5 pt-1">
                                            {dadosASI.taticaDiretrizes.map((d) => (
                                                <li key={d.id} className="bg-gray-950/40 p-2.5 rounded-lg border border-gray-800 flex justify-between items-center text-xs text-gray-300 gap-4">
                                                    <span className="leading-relaxed"><strong className="text-cyan-400 font-bold">🎯</strong> {d.descricao}</span>
                                                    <div className="flex gap-2.5 shrink-0 text-[9px] font-bold">
                                                        <button type="button" onClick={() => handleIniciarEditarDiretriz(d)} className="text-cyan-400 hover:underline">Editar</button>
                                                        <button type="button" onClick={() => handleRemoverDiretriz(d.id)} className="text-red-400 hover:underline">Remover</button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {/* BLOCO 2: FORMULÁRIO DE VETOR E MÓDULOS G.A.D. */}
                                {dadosASI.taticaDiretrizes.length === 0 ? (
                                    <div className="bg-gray-900/30 p-6 rounded-xl border border-gray-850 text-center space-y-1">
                                        <p className="text-yellow-500 font-bold text-xs">⚠️ Requisito Prévio</p>
                                        <p className="text-[11px] text-gray-400">Cadastre pelo menos uma Diretriz Estratégica acima antes de configurar seus Vetores de Desvio (G.A.D.).</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSalvarVetor} className="space-y-4 bg-gray-900/40 p-4 rounded-xl border border-gray-700/60 animate-fade-in">
                                        <div className="border-b border-gray-800 pb-2">
                                            <h3 className="text-sm font-bold text-cyan-400">
                                                {vetorEditandoId ? 'Editando Vetor de Desvio' : 'Novo Vetor de Desvio (G.A.D.)'}
                                            </h3>
                                        </div>

                                        {/* Selecionar Diretriz */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                                Diretriz estratégica associada *
                                                <DidacticInfo 
                                                    id="selected_diretriz"
                                                    title="Diretriz associada" 
                                                    text={"Selecione a qual objetivo/diretriz de negócio este vetor de desvio operacional (G.A.D.) estará monitorando e protegendo."} 
                                                    activeTooltipId={activeTooltipId}
                                                    setActiveTooltipId={setActiveTooltipId}
                                                    align="left"
                                                />
                                            </label>
                                            <select
                                                value={selectedDiretrizId}
                                                onChange={e => setSelectedDiretrizId(e.target.value)}
                                                required
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                                            >
                                                <option value="">Selecione uma diretriz estratégica...</option>
                                                {dadosASI.taticaDiretrizes.map(d => (
                                                    <option key={d.id} value={d.id}>{d.descricao}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Nome do Vetor */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                                Vetor de desvio *
                                                <DidacticInfo 
                                                    id="vetordesvio"
                                                    title="Vetor de desvio" 
                                                    text={"O cenário de risco ou anomalia operacional que pode desviar a organização de sua diretriz estratégica.\n\nExemplo: 'Corrosão de margem por Custo de Aquisição (CAC)'."} 
                                                    activeTooltipId={activeTooltipId}
                                                    setActiveTooltipId={setActiveTooltipId}
                                                    align="left"
                                                />
                                            </label>
                                            <input 
                                                type="text" 
                                                value={vetorDesvio} 
                                                onChange={e => setVetorDesvio(e.target.value)} 
                                                required 
                                                placeholder="Ex: Corrosão de margem por aumento do Custo de Aquisição de Clientes (CAC)" 
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none" 
                                            />
                                        </div>

                                        {/* MÓDULO G: GATILHO */}
                                        <div className="bg-gray-955/40 p-3 rounded-lg border border-gray-800 space-y-3">
                                            <h4 className="text-[11px] font-bold text-yellow-500 uppercase tracking-wider">Módulo G - Gatilho (Identificação da Anomalia)</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                                        Transação de origem *
                                                        <DidacticInfo 
                                                            id="g_transacao"
                                                            title="Transação de origem" 
                                                            text={"A transação operacional onde o dado é gerado.\n\nExemplo: Faturamento de pedido, Aprovação de crédito."} 
                                                            activeTooltipId={activeTooltipId}
                                                            setActiveTooltipId={setActiveTooltipId}
                                                            align="left"
                                                        />
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={gatilhoTransacao} 
                                                        onChange={e => setGatilhoTransacao(e.target.value)} 
                                                        required 
                                                        placeholder="Ex: Faturamento de pedido" 
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                                        Indicador monitorado *
                                                        <DidacticInfo 
                                                            id="g_indicador"
                                                            title="Indicador monitorado" 
                                                            text={"O campo numérico ou financeiro a ser avaliado pelo sistema.\n\nExemplo: Custo Logístico, Quantidade, Custo de Aquisição (CAC)."} 
                                                            activeTooltipId={activeTooltipId}
                                                            setActiveTooltipId={setActiveTooltipId}
                                                            align="center"
                                                        />
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={gatilhoIndicador} 
                                                        onChange={e => setGatilhoIndicador(e.target.value)} 
                                                        required 
                                                        placeholder="Ex: Custo de Aquisição (CAC)" 
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                                        Janela de avaliação *
                                                        <DidacticInfo 
                                                            id="g_janela"
                                                            title="Janela de avaliação" 
                                                            text={"O intervalo temporal em que o sistema consolida o dado antes de testar a ruptura da regra.\n\nExemplo: A cada hora (Intraday), Fechamento Diário, Acumulado Semanal."} 
                                                            activeTooltipId={activeTooltipId}
                                                            setActiveTooltipId={setActiveTooltipId}
                                                            align="right"
                                                        />
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={gatilhoJanela} 
                                                        onChange={e => setGatilhoJanela(e.target.value)} 
                                                        required 
                                                        placeholder="Ex: Fechamento Diário" 
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                                        Lógica de ruptura (operador) *
                                                        <DidacticInfo 
                                                            id="g_logica"
                                                            title="Lógica de ruptura" 
                                                            text={"Indica ao motor de cálculo o sentido do desvio que representa uma anomalia em relação à linha de base."} 
                                                            activeTooltipId={activeTooltipId}
                                                            setActiveTooltipId={setActiveTooltipId}
                                                            align="left"
                                                        />
                                                    </label>
                                                    <select 
                                                        value={gatilhoLogica} 
                                                        onChange={e => setGatilhoLogica(e.target.value)} 
                                                        required 
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                                                    >
                                                        <option value="">Selecione uma lógica...</option>
                                                        <option value="Desvio Positivo">Desvio Positivo (&gt; que a Baseline)</option>
                                                        <option value="Desvio Negativo">Desvio Negativo (&lt; que a Baseline)</option>
                                                        <option value="Igualdade Crítica">Igualdade Crítica (= à Baseline)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                                        Linha de base (baseline) *
                                                        <DidacticInfo 
                                                            id="g_baseline"
                                                            title="Linha de base (baseline)" 
                                                            text={"O valor nominal ou percentual que serve como limite crítico de referência.\n\nExemplo: 12%, R$ 350,00."} 
                                                            activeTooltipId={activeTooltipId}
                                                            setActiveTooltipId={setActiveTooltipId}
                                                            align="right"
                                                        />
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={gatilhoBaseline} 
                                                        onChange={e => setGatilhoBaseline(e.target.value)} 
                                                        required 
                                                        placeholder="Ex: 15% ou R$ 350,00" 
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none" 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* MÓDULO A: AGREGAÇÃO OLAP */}
                                        <div className="bg-gray-955/40 p-3 rounded-lg border border-gray-800 space-y-3">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <h4 className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Módulo A - Agregação (Visão OLAP)</h4>
                                                <span className="text-[9px] text-red-400 font-semibold bg-red-955/20 border border-red-900/50 px-2 py-0.5 rounded">Requer no mínimo 2 dimensões</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                                        Eixo 1 (Dimensão de tempo)
                                                        <DidacticInfo 
                                                            id="a_tempo"
                                                            title="Dimensão de Tempo" 
                                                            text={"Periodicidade para agrupamento do indicador.\n\nExemplo: Semana, Mês, Trimestre."} 
                                                            activeTooltipId={activeTooltipId}
                                                            setActiveTooltipId={setActiveTooltipId}
                                                            align="left"
                                                        />
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={agregacaoTempo} 
                                                        onChange={e => setAgregacaoTempo(e.target.value)} 
                                                        placeholder="Ex: Semana" 
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                                        Eixo 2 (Dimensão geográfica / estrutural)
                                                        <DidacticInfo 
                                                            id="a_geo"
                                                            title="Dimensão Geográfica" 
                                                            text={"Divisão física ou estrutural para agrupamento.\n\nExemplo: Região, Filial, Centro de Distribuição."} 
                                                            activeTooltipId={activeTooltipId}
                                                            setActiveTooltipId={setActiveTooltipId}
                                                            align="center"
                                                    />
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={agregacaoGeografica} 
                                                        onChange={e => setAgregacaoGeografica(e.target.value)} 
                                                        placeholder="Ex: Região" 
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                                        Eixo 3 (Dimensão de negócio)
                                                        <DidacticInfo 
                                                            id="a_negocio"
                                                            title="Dimensão de Negócio" 
                                                            text={"Atributo do negócio para agrupamento.\n\nExemplo: Categoria de produto, Canal de Venda."} 
                                                            activeTooltipId={activeTooltipId}
                                                            setActiveTooltipId={setActiveTooltipId}
                                                            align="right"
                                                    />
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={agregacaoNegocio} 
                                                        onChange={e => setAgregacaoNegocio(e.target.value)} 
                                                        placeholder="Ex: Canal de Venda" 
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none" 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* MÓDULO AÇÕES DECISÃO */}
                                        <div className="bg-gray-955/40 p-3 rounded-lg border border-gray-800 space-y-3">
                                            <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Módulo D - Decisão (Ação de Contorno)</h4>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                                        Área notificada (Área funcional) *
                                                        <DidacticInfo 
                                                            id="d_area"
                                                            title="Área notificada" 
                                                            text={"O departamento ou responsável direto que receberá o alerta de desvio.\n\nExemplo: Gerência de E-commerce, Diretoria Comercial."} 
                                                            activeTooltipId={activeTooltipId}
                                                            setActiveTooltipId={setActiveTooltipId}
                                                            align="left"
                                                        />
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={decisaoArea} 
                                                        onChange={e => setDecisaoArea(e.target.value)} 
                                                        required 
                                                        placeholder="Ex: Gerência de E-commerce" 
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                                                        Protocolo de ação exigida *
                                                        <DidacticInfo 
                                                            id="d_protocolo"
                                                            title="Protocolo de ação exigida" 
                                                            text={"O fluxo de trabalho objetivo ou protocolo emergencial a ser executado para corrigir o desvio.\n\nExemplo: Suspender imediatamente campanhas no Google Ads para a região afetada e redistribuir orçamento."} 
                                                            activeTooltipId={activeTooltipId}
                                                            setActiveTooltipId={setActiveTooltipId}
                                                            align="left"
                                                        />
                                                    </label>
                                                    <textarea 
                                                        value={decisaoProtocolo} 
                                                        onChange={e => setDecisaoProtocolo(e.target.value)} 
                                                        required 
                                                        rows="2" 
                                                        placeholder="Ex: Suspender imediatamente campanhas no Google Ads para a região afetada e redistribuir orçamento." 
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 resize-y outline-none" 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Botões de Ação */}
                                        <div className="flex justify-end gap-2 pt-2">
                                            {vetorEditandoId && (
                                                <button 
                                                    type="button" 
                                                    onClick={handleCancelarEditarVetor} 
                                                    className="bg-gray-750 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg text-[10px] transition-all shadow"
                                                >
                                                    Cancelar Edição
                                                </button>
                                            )}
                                            <button 
                                                type="submit" 
                                                disabled={loading}
                                                className="bg-cyan-600 hover:bg-cyan-500 text-gray-950 font-bold py-2 px-5 rounded-lg text-[10px] transition-all shadow"
                                            >
                                                {loading ? 'Sincronizando...' : vetorEditandoId ? 'Salvar G.A.D.' : 'Adicionar Vetor (G.A.D.)'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* LISTA DE VETORES CONFIGURADOS */}
                                {dadosASI.taticaDiretrizes.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-gray-400 border-b border-gray-800 pb-1">Vetores de Desvio Cadastrados</h4>
                                        {(!dadosASI.taticaVetores || dadosASI.taticaVetores.length === 0) ? (
                                            <p className="text-[11px] text-gray-500 italic py-2">Nenhum vetor de desvio mapeado.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2.5">
                                                {dadosASI.taticaVetores.map((v) => {
                                                    const dirAssociada = dadosASI.taticaDiretrizes.find(d => d.id === v.diretrizId);
                                                    return (
                                                        <div 
                                                            key={v.id} 
                                                            className={`bg-gray-900 p-3 rounded-xl border flex flex-col sm:flex-row justify-between gap-3 text-[11px] ${vetorEditandoId === v.id ? 'border-cyan-500 bg-gray-850' : 'border-gray-750 bg-gray-900/60'}`}
                                                        >
                                                            <div className="space-y-1.5 flex-1">
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[10px] text-cyan-500 font-semibold">🎯 Diretriz: "{dirAssociada?.descricao || 'Sem Diretriz'}"</p>
                                                                    <p className="text-white font-bold text-xs">⚠️ Vetor: {v.vetorDesvio}</p>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-955 p-2 rounded-lg border border-gray-800/40 text-[10px]">
                                                                    <div>
                                                                        <p className="text-yellow-500 font-bold uppercase tracking-wider text-[8px]">Gatilho</p>
                                                                        <p className="text-gray-300 truncate" title={v.gatilhoTransacao}><span className="text-gray-500">Transação:</span> {v.gatilhoTransacao}</p>
                                                                        <p className="text-gray-300"><span className="text-gray-500">Indicador:</span> {v.gatilhoIndicador} ({v.gatilhoLogica === 'Desvio Positivo' ? '>' : v.gatilhoLogica === 'Desvio Negativo' ? '<' : '='} {v.gatilhoBaseline})</p>
                                                                        <p className="text-gray-300"><span className="text-gray-500">Janela:</span> {v.gatilhoJanela}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-purple-400 font-bold uppercase tracking-wider text-[8px]">Agregação (OLAP)</p>
                                                                        <p className="text-gray-300"><span className="text-gray-500">Tempo:</span> {v.agregacaoTempo || '-'}</p>
                                                                        <p className="text-gray-300"><span className="text-gray-500">Geo:</span> {v.agregacaoGeografica || '-'}</p>
                                                                        <p className="text-gray-300"><span className="text-gray-500">Negócio:</span> {v.agregacaoNegocio || '-'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-emerald-400 font-bold uppercase tracking-wider text-[8px]">Decisão</p>
                                                                        <p className="text-gray-300"><span className="text-gray-500">Notificar:</span> {v.decisaoArea}</p>
                                                                        <p className="text-gray-300 truncate" title={v.decisaoProtocolo}><span className="text-gray-500">Ação:</span> {v.decisaoProtocolo}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex sm:flex-col justify-end gap-2.5 shrink-0 self-end sm:self-start text-[9px] font-bold">
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => handleIniciarEditarVetor(v)}
                                                                    className="text-cyan-400 hover:underline text-right"
                                                                >
                                                                    Editar
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => handleRemoverVetor(v.id)}
                                                                    className="text-red-400 hover:underline text-right"
                                                                >
                                                                    Remover
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        )}
                    </div>

                    {/* SANFONA 2: PAINEL DE ANÁLISE TÁTICA (G.A.D.) */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                        <button 
                            type="button"
                            id="accordion-resumo-header"
                            onClick={() => toggleAccordion('resumo')}
                            className={`w-full p-4 sm:p-5 flex justify-between items-center transition-all text-left font-bold text-sm sm:text-base text-white outline-none focus:outline-none ${activeAccordion === 'resumo' ? 'bg-cyan-600' : 'bg-gray-750 hover:bg-gray-700'}`}
                        >
                            <span className="flex items-center gap-2">📊 2. Painel de Auditoria G.A.D.</span>
                            <span className="text-xs font-semibold">{activeAccordion === 'resumo' ? '▲ Recolher' : '▼ Expandir'}</span>
                        </button>
                        {activeAccordion === 'resumo' && (
                            <div className="p-3 sm:p-6 border-t border-gray-700 space-y-6 animate-fade-in">
                                
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Rastreabilidade por Diretrizes Estratégicas</h4>
                                    {dadosASI.taticaDiretrizes.length === 0 ? (
                                        <div className="bg-gray-950/40 p-6 rounded-lg text-center border border-gray-850">
                                            <p className="text-yellow-500 font-bold text-xs">Nenhuma diretriz estratégica cadastrada.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {dadosASI.taticaDiretrizes.map((diretriz) => {
                                                const vetoresDaDiretriz = dadosASI.taticaVetores.filter(v => v.diretrizId === diretriz.id);
                                                return (
                                                    <div key={diretriz.id} className="bg-gray-900/30 p-4 rounded-xl border border-gray-750 space-y-3">
                                                        <h5 className="text-[11px] font-extrabold text-cyan-400 border-b border-cyan-950 pb-1.5 flex items-center gap-2">
                                                            🎯 Diretriz: "{diretriz.descricao}"
                                                        </h5>
                                                        {vetoresDaDiretriz.length === 0 ? (
                                                            <p className="text-[10px] text-gray-500 italic">Nenhum vetor de desvio mapeado para esta diretriz.</p>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                                                {vetoresDaDiretriz.map(v => (
                                                                    <GadAuditCard key={v.id} item={v} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                            </div>
                        )}
                    </div>

                </div>
            )}

        </div>
    );
}

export default AdmSITatica;
