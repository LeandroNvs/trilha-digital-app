import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId, auth } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';
import {
    Briefcase,
    Shield,
    Users,
    Zap,
    BookOpen,
    AlertTriangle,
    Eye,
    CheckCircle2,
    XCircle,
    Power,
    Sliders,
    HelpCircle,
    ArrowRight,
    ArrowLeft,
    Plus,
    Trash2,
    Edit3,
    FileText,
    Activity,
    Layers,
    FileSpreadsheet,
    Scale,
    Search,
    Handshake,
    Sparkles
} from 'lucide-react';

// Componente Tooltip Didático Gerencial
function DidacticInfo({ id, title, text, activeTooltipId, setActiveTooltipId, align = "center" }) {
    const isOpen = activeTooltipId === id;
    
    const toggle = (e) => {
        e.stopPropagation();
        setActiveTooltipId(isOpen ? null : id);
    };

    return (
        <div className="inline-block ml-1.5 relative align-middle">
            <button 
                type="button"
                onClick={toggle}
                className={`w-4 h-4 rounded-full font-bold text-[10px] flex items-center justify-center border transition-all focus:outline-none ${
                    isOpen 
                        ? 'bg-cyan-500 text-gray-950 border-cyan-400 ring-2 ring-cyan-500/30' 
                        : 'bg-cyan-950/60 hover:bg-cyan-900 text-cyan-400 border-cyan-700/50'
                }`}
                title="Ajuda didática de gestão"
            >
                i
            </button>
            {isOpen && (
                <>
                    {/* Versão Mobile (Modal) */}
                    <div 
                        className="sm:hidden fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 animate-fade-in"
                        onClick={() => setActiveTooltipId(null)}
                    >
                        <div 
                            className="bg-gray-900 border border-cyan-500/50 p-5 rounded-2xl shadow-2xl w-full max-w-sm text-left relative space-y-3 animate-fade-in-up"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center border-b border-cyan-900/60 pb-2">
                                <strong className="text-cyan-400 uppercase tracking-wider text-[11px] font-bold flex items-center gap-1.5">
                                    <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                                    {title}
                                </strong>
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
                                    className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all shadow"
                                >
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Versão Desktop (Popover flutuante) */}
                    <div 
                        className={`hidden sm:block absolute bottom-full mb-2 bg-gray-900/95 backdrop-blur border border-cyan-500/50 p-4 rounded-xl shadow-2xl z-50 w-80 text-[11px] font-normal text-gray-200 leading-relaxed animate-fade-in-up ${
                            align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-2 border-b border-cyan-900/80 pb-1.5">
                            <strong className="text-cyan-400 uppercase tracking-wider text-[10px] font-bold flex items-center gap-1">
                                <HelpCircle className="w-3 h-3 text-cyan-400" />
                                {title}
                            </strong>
                            <button type="button" onClick={() => setActiveTooltipId(null)} className="text-gray-400 hover:text-white font-bold text-sm leading-none">&times;</button>
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

// Modelagem inicial padrão de um Cargo Digital
const NOVO_CARGO_MODELO = {
    id: '',
    nomeCargo: '',
    areaDona: '',
    gestorResponsavel: '',
    missaoCargo: '',
    tipoEstrutural: 'operador', // chatbot, copiloto, operador, especialista, orquestrador
    arquetipo: 'analista', // analista, negociador, auditor
    segregacaoFuncoesSoD: '',
    
    // Funil & Elegibilidade associado
    processoEleito: '',
    sintomasGargalo: [], // 'friccao_tempo', 'sobrecarga_senior', 'ponte_dados', 'risco_glosa'
    detalheSintomas: '',
    processoPadronizado: 'sim', // 'sim', 'parcial', 'nao'
    entradasDigitaisProntas: 'sim', // 'sim', 'parcial', 'nao'
    competenciaHumanaPreservada: '',
    ritoAuditoriaMentoria: '',
    decisaoTecnologica: 'agente', // 'integracao', 'rpa', 'agente'
    justificativaDecisao: '',

    // Canvas: Disparo e Conhecimento
    fatoGeradorGatilho: '',
    baseNormasRAG: '',
    historicoRelacionamento: '',
    limitesIsolamento: '',

    // Canvas: Governança e Escalonamento
    limiteAlcada: '',
    gatilhosParadaHITL: '',
    vedacoesExpressas: '',
    cicloAprendizado: '',

    // Canvas: Operação e Salvaguardas
    sistemasAutorizados: '',
    formatoEntrega: '',
    registroAuditoria: '',
    botaoEmergenciaKillSwitch: ''
};

export default function AdmSICargosDigitais() {
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [perfilUsuario, setPerfilUsuario] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState('');
    const [erro, setErro] = useState('');

    // Aba ativa: 'mural' | 'funil' | 'canvas'
    const [activeTab, setActiveTab] = useState('mural');
    const [activeTooltipId, setActiveTooltipId] = useState(null);

    // Lista de cargos digitais cadastrados pelo grupo
    const [cargosList, setCargosList] = useState([]);
    
    // Estado do formulário de cargo digital atualmente em edição
    const [cargoForm, setCargoForm] = useState(NOVO_CARGO_MODELO);
    const [isEditingExisting, setIsEditingExisting] = useState(false);

    // Fechar tooltips ao clicar fora
    useEffect(() => {
        const fecharTooltips = () => setActiveTooltipId(null);
        window.addEventListener('click', fecharTooltips);
        return () => window.removeEventListener('click', fecharTooltips);
    }, []);

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

    // Filtrar grupos do usuário
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

    // Carregar dados de Cargos Digitais do Grupo Selecionado
    useEffect(() => {
        if (!selectedGroupId) {
            setCargosList([]);
            return;
        }

        const docRef = doc(db, `artifacts/${appId}/public/data/asi_dados`, selectedGroupId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (Array.isArray(data.cargosDigitais)) {
                    setCargosList(data.cargosDigitais);
                } else {
                    setCargosList([]);
                }
            } else {
                setCargosList([]);
            }
        }, (error) => {
            console.error("Erro no onSnapshot de cargos digitais:", error);
        });

        return () => unsubscribe();
    }, [selectedGroupId]);

    // Iniciar novo Cargo
    const handleCriarNovoCargo = () => {
        setCargoForm({
            ...NOVO_CARGO_MODELO,
            id: `cargo_${Date.now()}`
        });
        setIsEditingExisting(false);
        setActiveTab('funil');
    };

    // Editar Cargo existente
    const handleEditarCargo = (cargo) => {
        setCargoForm({ ...cargo });
        setIsEditingExisting(true);
        setActiveTab('canvas');
    };

    // Alternar sintomas de gargalo no funil
    const handleToggleSintoma = (sintomaKey) => {
        setCargoForm(prev => {
            const existe = prev.sintomasGargalo.includes(sintomaKey);
            const atualizados = existe 
                ? prev.sintomasGargalo.filter(k => k !== sintomaKey)
                : [...prev.sintomasGargalo, sintomaKey];
            return { ...prev, sintomasGargalo: atualizados };
        });
    };

    // Salvar Cargo no Firestore
    const handleSalvarCargo = async (e) => {
        if (e) e.preventDefault();
        if (!selectedGroupId) {
            setErro("Nenhum grupo selecionado.");
            return;
        }
        if (!cargoForm.nomeCargo.trim() && !cargoForm.processoEleito.trim()) {
            setErro("Preencha ao menos o nome do cargo ou o processo eleito.");
            return;
        }

        setLoading(true);
        setErro('');
        setSucesso('');

        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/asi_dados`, selectedGroupId);
            const docSnap = await getDoc(docRef);
            let listaAtual = [];
            if (docSnap.exists() && Array.isArray(docSnap.data().cargosDigitais)) {
                listaAtual = docSnap.data().cargosDigitais;
            }

            const cargoParaSalvar = {
                ...cargoForm,
                id: cargoForm.id || `cargo_${Date.now()}`,
                atualizadoEm: new Date().toISOString()
            };

            let novaLista;
            const index = listaAtual.findIndex(c => c.id === cargoParaSalvar.id);
            if (index >= 0) {
                novaLista = [...listaAtual];
                novaLista[index] = cargoParaSalvar;
            } else {
                novaLista = [...listaAtual, cargoParaSalvar];
            }

            await setDoc(docRef, {
                grupoId: selectedGroupId,
                cargosDigitais: novaLista,
                dataModificacao: new Date()
            }, { merge: true });

            setSucesso("Cargo Digital e Canvas salvos com sucesso!");
            setTimeout(() => setSucesso(''), 3000);
            setActiveTab('mural');
        } catch (error) {
            console.error("Erro ao salvar cargo digital:", error);
            setErro("Falha ao salvar as informações no servidor.");
        } finally {
            setLoading(false);
        }
    };

    // Excluir Cargo
    const handleExcluirCargo = async (cargoId) => {
        if (!window.confirm("Deseja realmente excluir este Cargo Digital e seu Canvas?")) return;
        setLoading(true);
        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/asi_dados`, selectedGroupId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const listaAtual = docSnap.data().cargosDigitais || [];
                const novaLista = listaAtual.filter(c => c.id !== cargoId);
                await setDoc(docRef, {
                    cargosDigitais: novaLista,
                    dataModificacao: new Date()
                }, { merge: true });
                setSucesso("Cargo Digital removido.");
                setTimeout(() => setSucesso(''), 2500);
            }
        } catch (error) {
            console.error("Erro ao excluir:", error);
            setErro("Erro ao excluir o cargo.");
        } finally {
            setLoading(false);
        }
    };

    if (isLoadingProfile || isGruposLoading) {
        return (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Carregando dados dos Cargos Digitais...</span>
            </div>
        );
    }

    if (meusGrupos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[60vh]">
                <Shield className="w-16 h-16 text-cyan-400 mb-4 opacity-70" />
                <h2 className="text-2xl font-bold text-red-400">Acesso Restrito ou Sem Grupos</h2>
                <p className="text-gray-400 mt-2 max-w-md">
                    Você precisa estar vinculado a um Grupo (Empresa) para desenhar os Cargos Digitais e a governança dos Agentes.
                </p>
            </div>
        );
    }

    if (!selectedGroupId) {
        return (
            <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
                <header className="mb-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/80 border border-cyan-800 rounded-full text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
                        <Briefcase className="w-3.5 h-3.5" /> Administração de SI
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                        Cargos Digitais & Canvas de Agentes
                    </h1>
                    <p className="text-gray-400 mt-2 max-w-xl mx-auto text-sm">
                        Selecione a empresa do seu grupo para diagnosticar a elegibilidade de processos e desenhar a governança dos seus cargos cognitivos.
                    </p>
                </header>
                <div className="grid gap-4 sm:grid-cols-2">
                    {meusGrupos.map(grupo => (
                        <button
                            key={grupo.id}
                            onClick={() => setSelectedGroupId(grupo.id)}
                            className="bg-gray-800/80 hover:bg-gray-800 border-t-4 border-t-cyan-500 border border-gray-700/80 p-6 rounded-xl text-left transition-all shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-500/50 group"
                        >
                            <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                                {grupo.nome} <span className="text-cyan-400 text-xs ml-2 font-normal">({grupo.sigla})</span>
                            </h3>
                            <p className="text-gray-400 text-xs mt-2 line-clamp-2">{grupo.descricao || 'Empresa participante da Trilha Digital.'}</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const grupoSelecionado = meusGrupos.find(g => g.id === selectedGroupId);

    return (
        <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 animate-fade-in pb-16">
            
            {/* CABEÇALHO EXECUTIVO */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            Adm SI • Gestão de Processos & Governança de IA
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <Briefcase className="w-7 h-7 text-cyan-400" />
                            Cargos Digitais & Canvas do Agente
                        </h1>
                        <p className="text-gray-400 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
                            <strong className="text-gray-300">Tese de Gestão:</strong> A decisão de criar um agente de IA não parte da tecnologia, mas da gestão de processos: saber eleger o gargalo certo, sanear as regras operacionais, proteger a cultura de talentos e desenhar o papel digital sob estrita governança.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto bg-gray-950/70 p-2.5 rounded-xl border border-gray-800">
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-gray-500">Empresa / Grupo</p>
                            <p className="text-xs font-bold text-cyan-300 truncate max-w-[160px]">{grupoSelecionado?.nome}</p>
                        </div>
                        {meusGrupos.length > 1 && (
                            <button
                                onClick={() => setSelectedGroupId('')}
                                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1.5 rounded-lg border border-gray-700 transition"
                                title="Trocar grupo"
                            >
                                Trocar
                            </button>
                        )}
                    </div>
                </div>

                {/* MENUS / ABAS DE NAVEGAÇÃO */}
                <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-gray-800/80">
                    <button
                        onClick={() => setActiveTab('mural')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                            activeTab === 'mural'
                                ? 'bg-cyan-500 text-gray-950 shadow-lg shadow-cyan-500/20'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        Mural de Cargos Digitais ({cargosList.length})
                    </button>

                    <button
                        onClick={() => {
                            if (!cargoForm.id) handleCriarNovoCargo();
                            setActiveTab('funil');
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                            activeTab === 'funil'
                                ? 'bg-cyan-500 text-gray-950 shadow-lg shadow-cyan-500/20'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        1. Funil de Elegibilidade & Decisão
                    </button>

                    <button
                        onClick={() => {
                            if (!cargoForm.id) handleCriarNovoCargo();
                            setActiveTab('canvas');
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                            activeTab === 'canvas'
                                ? 'bg-cyan-500 text-gray-950 shadow-lg shadow-cyan-500/20'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        2. Canvas do Cargo Digital
                    </button>

                    <button
                        onClick={handleCriarNovoCargo}
                        className="ml-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Novo Cargo Digital
                    </button>
                </div>
            </div>

            {/* FEEDBACKS GLOBAIS */}
            {sucesso && (
                <div className="p-3.5 bg-emerald-950/80 border border-emerald-600/60 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    {sucesso}
                </div>
            )}
            {erro && (
                <div className="p-3.5 bg-red-950/80 border border-red-600/60 rounded-xl text-red-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                    <XCircle className="w-4 h-4 shrink-0 text-red-400" />
                    {erro}
                </div>
            )}

            {/* ============================================================ */}
            {/* ABA 1: MURAL DE CARGOS DIGITAIS                              */}
            {/* ============================================================ */}
            {activeTab === 'mural' && (
                <div className="space-y-4">
                    {cargosList.length === 0 ? (
                        <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-cyan-950/50 border border-cyan-800/60 flex items-center justify-center mx-auto text-cyan-400">
                                <Briefcase className="w-8 h-8" />
                            </div>
                            <div className="max-w-md mx-auto space-y-1">
                                <h3 className="text-lg font-bold text-white">Nenhum Cargo Digital desenhado ainda</h3>
                                <p className="text-gray-400 text-xs leading-relaxed">
                                    Sua equipe ainda não modelou nenhum cargo de IA para <strong>{grupoSelecionado?.nome}</strong>. Comece pelo Funil de Elegibilidade para diagnosticar onde dói na operação!
                                </p>
                            </div>
                            <button
                                onClick={handleCriarNovoCargo}
                                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2 transition"
                            >
                                <Plus className="w-4 h-4" />
                                Desenhar Primeiro Cargo Digital
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {cargosList.map((cargo) => {
                                const isAnalista = cargo.arquetipo === 'analista';
                                const isNegociador = cargo.arquetipo === 'negociador';
                                const isAuditor = cargo.arquetipo === 'auditor';

                                return (
                                    <div 
                                        key={cargo.id} 
                                        className="bg-gray-850/90 border border-gray-700/80 rounded-2xl p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-all shadow-lg group relative overflow-hidden"
                                    >
                                        <div className="space-y-3">
                                            {/* Badges superiores */}
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                                    isAnalista 
                                                        ? 'bg-blue-950/80 text-blue-300 border-blue-700/60'
                                                        : isNegociador
                                                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                                                        : 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                                                }`}>
                                                    {isAnalista && <Search className="w-2.5 h-2.5" />}
                                                    {isNegociador && <Handshake className="w-2.5 h-2.5" />}
                                                    {isAuditor && <Scale className="w-2.5 h-2.5" />}
                                                    {cargo.arquetipo?.toUpperCase() || 'ARQUÉTIPO'}
                                                </span>

                                                <span className="text-[10px] font-semibold text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                                                    {cargo.tipoEstrutural || 'Operador'}
                                                </span>
                                            </div>

                                            {/* Título e Área */}
                                            <div>
                                                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                                                    {cargo.nomeCargo || 'Cargo Digital Sem Nome'}
                                                </h3>
                                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <span className="text-cyan-400">Área:</span> {cargo.areaDona || 'Não informada'}
                                                    {cargo.gestorResponsavel && (
                                                        <> • <span className="text-gray-400">Owner:</span> {cargo.gestorResponsavel}</>
                                                    )}
                                                </p>
                                            </div>

                                            {/* Missão */}
                                            {cargo.missaoCargo && (
                                                <p className="text-xs text-gray-300 bg-gray-900/70 p-2.5 rounded-xl border border-gray-800 line-clamp-2 italic">
                                                    "{cargo.missaoCargo}"
                                                </p>
                                            )}

                                            {/* Resumo da Governança */}
                                            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 pt-1">
                                                <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                                                    <span className="block font-bold text-gray-500 uppercase">Alçada de Decisão:</span>
                                                    <span className="text-gray-200 truncate block font-medium">{cargo.limiteAlcada || 'Sob Consulta'}</span>
                                                </div>
                                                <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                                                    <span className="block font-bold text-gray-500 uppercase">Fato Gerador:</span>
                                                    <span className="text-gray-200 truncate block font-medium">{cargo.fatoGeradorGatilho || 'Evento manual'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ações */}
                                        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-gray-800">
                                            <button
                                                onClick={() => handleEditarCargo(cargo)}
                                                className="flex-1 bg-cyan-600/20 hover:bg-cyan-500 hover:text-gray-950 text-cyan-400 text-xs font-bold py-1.5 px-3 rounded-lg border border-cyan-500/30 transition flex items-center justify-center gap-1.5"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                Abrir Canvas
                                            </button>
                                            <button
                                                onClick={() => handleExcluirCargo(cargo.id)}
                                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                                                title="Excluir este cargo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================ */}
            {/* ABA 2: FUNIL DE ELEGIBILIDADE & DIAGNÓSTICO                  */}
            {/* ============================================================ */}
            {activeTab === 'funil' && (
                <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 sm:p-7 space-y-8 shadow-xl">
                    <div className="border-b border-gray-800 pb-4">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Etapa 1 de 2</span>
                        <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                            <Activity className="w-6 h-6 text-cyan-400" />
                            O Funil de Elegibilidade: Onde Dói na Operação?
                        </h2>
                        <p className="text-gray-400 text-xs sm:text-sm mt-1">
                            Antes de desenhar um agente, o administrador avalia a real necessidade da automação, protege a esteira de talentos e escolhe a arquitetura adequada.
                        </p>
                    </div>

                    {/* DADOS DO PROCESSO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wide mb-1.5">
                                Nome do Processo Candidato
                                <DidacticInfo 
                                    id="info-processo"
                                    title="Processo Candidato"
                                    text={"Identifique a rotina concreta da empresa onde se cogita aplicar IA.\n\nExemplos de Negócio: 'Homologação de Fornecedores', 'Conferência de Reembolsos de Despesas', 'Triagem de Chamados N1', 'Análise de Pedidos de Crédito'."}
                                    activeTooltipId={activeTooltipId}
                                    setActiveTooltipId={setActiveTooltipId}
                                />
                            </label>
                            <input
                                type="text"
                                value={cargoForm.processoEleito}
                                onChange={(e) => setCargoForm({ ...cargoForm, processoEleito: e.target.value })}
                                placeholder="Ex: Análise e Conferência de Notas Fiscais de Entrada"
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wide mb-1.5">
                                Área / Departamento Dono
                            </label>
                            <input
                                type="text"
                                value={cargoForm.areaDona}
                                onChange={(e) => setCargoForm({ ...cargoForm, areaDona: e.target.value })}
                                placeholder="Ex: Contabilidade & Finanças"
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                            />
                        </div>
                    </div>

                    {/* PASSO 1: O RADAR DE SINTOMAS (ONDE DÓI NA OPERAÇÃO) */}
                    <div className="space-y-3 bg-gray-950/60 p-4 sm:p-5 rounded-2xl border border-gray-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                1. O Radar de Gargalos Operacionais (Marque onde dói)
                            </h3>
                            <span className="text-[10px] text-gray-400">Selecione os sintomas observados</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* Sintoma 1 */}
                            <div 
                                onClick={() => handleToggleSintoma('friccao_tempo')}
                                className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                                    cargoForm.sintomasGargalo.includes('friccao_tempo')
                                        ? 'bg-cyan-950/50 border-cyan-500 text-white shadow'
                                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                                }`}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={cargoForm.sintomasGargalo.includes('friccao_tempo')} 
                                    onChange={() => {}} 
                                    className="mt-1 accent-cyan-400"
                                />
                                <div>
                                    <strong className="text-xs text-white block">⏱️ Fricção de Tempo (Lead Time Excessivo)</strong>
                                    <span className="text-[11px] text-gray-400 block mt-0.5 leading-snug">
                                        Tarefas em que o tempo de espera entre setores supera em muito o tempo de execução real.
                                    </span>
                                </div>
                            </div>

                            {/* Sintoma 2 */}
                            <div 
                                onClick={() => handleToggleSintoma('sobrecarga_senior')}
                                className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                                    cargoForm.sintomasGargalo.includes('sobrecarga_senior')
                                        ? 'bg-cyan-950/50 border-cyan-500 text-white shadow'
                                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                                }`}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={cargoForm.sintomasGargalo.includes('sobrecarga_senior')} 
                                    onChange={() => {}} 
                                    className="mt-1 accent-cyan-400"
                                />
                                <div>
                                    <strong className="text-xs text-white block">🧠 Sobrecarga de Especialistas Seniores</strong>
                                    <span className="text-[11px] text-gray-400 block mt-0.5 leading-snug">
                                        Profissionais caros e estratégicos presos em rotinas mecânicas de conferência e triagem.
                                    </span>
                                </div>
                            </div>

                            {/* Sintoma 3 */}
                            <div 
                                onClick={() => handleToggleSintoma('ponte_dados')}
                                className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                                    cargoForm.sintomasGargalo.includes('ponte_dados')
                                        ? 'bg-cyan-950/50 border-cyan-500 text-white shadow'
                                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                                }`}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={cargoForm.sintomasGargalo.includes('ponte_dados')} 
                                    onChange={() => {}} 
                                    className="mt-1 accent-cyan-400"
                                />
                                <div>
                                    <strong className="text-xs text-white block">🔄 Pontes Humanas de Dados</strong>
                                    <span className="text-[11px] text-gray-400 block mt-0.5 leading-snug">
                                        Colaboradores atuando apenas para copiar informações de um sistema e digitar em outro.
                                    </span>
                                </div>
                            </div>

                            {/* Sintoma 4 */}
                            <div 
                                onClick={() => handleToggleSintoma('risco_glosa')}
                                className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                                    cargoForm.sintomasGargalo.includes('risco_glosa')
                                        ? 'bg-cyan-950/50 border-cyan-500 text-white shadow'
                                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                                }`}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={cargoForm.sintomasGargalo.includes('risco_glosa')} 
                                    onChange={() => {}} 
                                    className="mt-1 accent-cyan-400"
                                />
                                <div>
                                    <strong className="text-xs text-white block">⚠️ Volume Crítico com Risco de Glosa/Multas</strong>
                                    <span className="text-[11px] text-gray-400 block mt-0.5 leading-snug">
                                        Tarefas repetitivas onde o cansaço humano gera falhas de conferência, glosas e penalidades.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="block text-xs font-semibold text-gray-300 mb-1">
                                Detalhamento da Dor Operacional pelo Grupo:
                            </label>
                            <textarea
                                rows={2}
                                value={cargoForm.detalheSintomas}
                                onChange={(e) => setCargoForm({ ...cargoForm, detalheSintomas: e.target.value })}
                                placeholder="Descreva brevemente como esse gargalo se manifesta no dia a dia da empresa estudada..."
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                            />
                        </div>
                    </div>

                    {/* PASSO 2: TESTE DE SANEAMENTO & MATURIDADE ("NÃO AUTOMATIZE O CAOS") */}
                    <div className="space-y-3 bg-gray-950/60 p-4 sm:p-5 rounded-2xl border border-gray-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-amber-400" />
                                2. O Teste de Maturidade: "Não Automatize o Caos"
                            </h3>
                            <DidacticInfo 
                                id="info-saneamento"
                                title="A Regra de Ouro do BPM"
                                text={"Se cada colaborador executa a tarefa 'do seu jeito', colocar IA apenas produzirá caos em altíssima velocidade.\n\nO processo precisa primeiro ser padronizado, simplificado e documentado antes de qualquer automação digital."}
                                activeTooltipId={activeTooltipId}
                                setActiveTooltipId={setActiveTooltipId}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    O processo possui regras de negócio claras e documentadas?
                                </label>
                                <select
                                    value={cargoForm.processoPadronizado}
                                    onChange={(e) => setCargoForm({ ...cargoForm, processoPadronizado: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                                >
                                    <option value="sim">Sim — Processo padronizado, documentado e com regras claras</option>
                                    <option value="parcial">Parcial — Há regras gerais, mas com exceções informais</option>
                                    <option value="nao">Não — Cada colaborador faz do seu jeito (Processo Caótico)</option>
                                </select>
                                {cargoForm.processoPadronizado === 'nao' && (
                                    <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/60 p-2 rounded-lg mt-2">
                                        ⚠️ <strong>Alerta Gerencial:</strong> Não automatize o caos! É prioritário redesenhar e documentar o processo (BPM) antes de adotar IA.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Prontidão de Dados (Data Readiness):
                                </label>
                                <select
                                    value={cargoForm.entradasDigitaisProntas}
                                    onChange={(e) => setCargoForm({ ...cargoForm, entradasDigitaisProntas: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                                >
                                    <option value="sim">Sim — As informações chegam de forma digital e estruturada/acessível</option>
                                    <option value="parcial">Parcial — Parte é digital, parte depende de papéis ou mensagens soltas</option>
                                    <option value="nao">Não — Dependência de documentos físicos não digitalizados</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* PASSO 3: SUSTENTABILIDADE HUMANA & TALENTOS */}
                    <div className="space-y-3 bg-gray-950/60 p-4 sm:p-5 rounded-2xl border border-gray-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-400" />
                                3. Filtro Cultural e Humano: "O Agente como Andaime, Não como Muro"
                            </h3>
                            <DidacticInfo 
                                id="info-cultura"
                                title="Proteção da Esteira de Talentos"
                                text={"Se o agente fizer tudo sozinho, como os juniores aprenderão o ofício?\n\nO agente deve assumir a fadiga braçal, mas o profissional júnior atua como auditor do resultado, mantendo ativa sua escada de aprendizado e a mentoria com os seniores."}
                                activeTooltipId={activeTooltipId}
                                setActiveTooltipId={setActiveTooltipId}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Se automatizarmos esta tarefa, qual competência humana deixará de ser praticada?
                                </label>
                                <textarea
                                    rows={2}
                                    value={cargoForm.competenciaHumanaPreservada}
                                    onChange={(e) => setCargoForm({ ...cargoForm, competenciaHumanaPreservada: e.target.value })}
                                    placeholder="Ex: A capacidade do estagiário/júnior de analisar notas e identificar discrepâncias tributárias..."
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Rito de Auditoria e Mentoria (Como o júnior audita o agente?):
                                </label>
                                <textarea
                                    rows={2}
                                    value={cargoForm.ritoAuditoriaMentoria}
                                    onChange={(e) => setCargoForm({ ...cargoForm, ritoAuditoriaMentoria: e.target.value })}
                                    placeholder="Ex: O júnior confere o parecer emitido pelo agente e debate os casos duvidosos semanalmente com o gerente sênior..."
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* PASSO 4: A NAVALHA TECNOLÓGICA (A ESCOLHA DO GESTOR) */}
                    <div className="space-y-3 bg-gray-950/60 p-4 sm:p-5 rounded-2xl border border-gray-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-2">
                                <Scale className="w-4 h-4 text-cyan-400" />
                                4. A Navalha de Decisão do Gestor: Escolha a Solução Correta
                            </h3>
                            <DidacticInfo 
                                id="info-navalha"
                                title="Nem Tudo Precisa de Agente de IA"
                                text={"Nível 1 (Integração Direta): Para dados estruturados e regras numéricas puras entre sistemas (sem IA).\n\nNível 2 (Robô de Rotina / RPA): Para tarefas mecânicas de cliques em telas legadas sem interpretação de texto livre.\n\nNível 3 (Cargo Digital / IA): Apenas quando há leitura de textos, análise de contexto e tomada de decisões sob incerteza."}
                                activeTooltipId={activeTooltipId}
                                setActiveTooltipId={setActiveTooltipId}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                            {/* Nível 1 */}
                            <div 
                                onClick={() => setCargoForm({ ...cargoForm, decisaoTecnologica: 'integracao' })}
                                className={`cursor-pointer p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                                    cargoForm.decisaoTecnologica === 'integracao'
                                        ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30'
                                        : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                }`}
                            >
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-900 inline-block mb-1.5">
                                        Nível 1
                                    </span>
                                    <h4 className="text-xs font-bold text-white">Integração Direta entre Sistemas</h4>
                                    <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                                        Para troca de dados estruturados e regras lógicas puras. Dispensa IA e reduz custos operacionais.
                                    </p>
                                </div>
                            </div>

                            {/* Nível 2 */}
                            <div 
                                onClick={() => setCargoForm({ ...cargoForm, decisaoTecnologica: 'rpa' })}
                                className={`cursor-pointer p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                                    cargoForm.decisaoTecnologica === 'rpa'
                                        ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30'
                                        : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                }`}
                            >
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-900 inline-block mb-1.5">
                                        Nível 2
                                    </span>
                                    <h4 className="text-xs font-bold text-white">Robô de Rotina (Automação Mecânica)</h4>
                                    <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                                        Para tarefas mecânicas repetitivas de cliques em telas legadas, sem interpretação de textos livres.
                                    </p>
                                </div>
                            </div>

                            {/* Nível 3 */}
                            <div 
                                onClick={() => setCargoForm({ ...cargoForm, decisaoTecnologica: 'agente' })}
                                className={`cursor-pointer p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                                    cargoForm.decisaoTecnologica === 'agente'
                                        ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-500/30'
                                        : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                }`}
                            >
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-900 inline-block mb-1.5">
                                        Nível 3 • Recomendado para IA
                                    </span>
                                    <h4 className="text-xs font-bold text-white">Cargo Digital (Agente Cognitivo)</h4>
                                    <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                                        Para ler documentos não estruturados (PDFs, e-mails), analisar contexto de negócios e orquestrar ferramentas.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="block text-xs font-semibold text-gray-300 mb-1">
                                Justificativa da Escolha Tecnológica pelo Grupo:
                            </label>
                            <input
                                type="text"
                                value={cargoForm.justificativaDecisao}
                                onChange={(e) => setCargoForm({ ...cargoForm, justificativaDecisao: e.target.value })}
                                placeholder="Ex: Optamos pelo Agente Cognitivo porque os contratos contêm cláusulas em texto livre e exigem interpretação..."
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                            />
                        </div>
                    </div>

                    {/* BOTÕES DE NAVEGAÇÃO DA ETAPA 1 */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                        <button
                            type="button"
                            onClick={() => setActiveTab('mural')}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition flex items-center gap-2"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Mural
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                // Sugerir nome de cargo caso esteja vazio
                                if (!cargoForm.nomeCargo && cargoForm.processoEleito) {
                                    setCargoForm(prev => ({
                                        ...prev,
                                        nomeCargo: `Analista de ${prev.processoEleito.replace(/^(Análise|Conferência|Gestão|Processo)\s+de\s+/i, '')} Digital`
                                    }));
                                }
                                setActiveTab('canvas');
                            }}
                            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"
                        >
                            Avançar para o Desenho do Cargo Digital
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* ABA 3: CANVAS DO CARGO DIGITAL                               */}
            {/* ============================================================ */}
            {activeTab === 'canvas' && (
                <div className="space-y-6">
                    {/* Alerta didático sobre Anti-Padrão Monolítico */}
                    <div className="bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-gray-900 border border-blue-900/60 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-lg">
                        <div className="w-10 h-10 rounded-xl bg-blue-900/40 border border-blue-700/60 flex items-center justify-center shrink-0 text-blue-400">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs sm:text-sm font-bold text-blue-300 uppercase tracking-wide">
                                Regra de Ouro da Governança: Evite o Super-Robô "Faz-Tudo"
                            </h4>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Nunca crie um único agente encarregado de cotar, aprovar compras e liberar pagamentos! Isso gera alucinações cognitivas e viola o princípio de <strong>Segregação de Funções (SoD)</strong>. Desenhe cargos especializados (Ex: Analista ➔ Negociador ➔ Auditor).
                            </p>
                        </div>
                    </div>

                    {/* FORMULÁRIO DO CANVAS - OS 4 QUADRANTES EXECUTIVOS */}
                    <form onSubmit={handleSalvarCargo} className="space-y-6">

                        {/* ========================================== */}
                        {/* QUADRANTE 1: IDENTIDADE, ÓRGÃO & COMPLIANCE */}
                        {/* ========================================== */}
                        <div className="bg-gray-900/90 border border-cyan-500/30 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-700 flex items-center justify-center text-xs">1</span>
                                    Identidade, Organograma & Compliance
                                </h3>
                                <DidacticInfo 
                                    id="info-identidade"
                                    title="Identidade e Arquétipo"
                                    text={"Como qualquer colaborador, o cargo digital precisa de um nome funcional, uma área dona, um gestor humano responsável (Owner) e uma missão clara.\n\nAlém disso, declare o Arquétipo Comportamental: Analista (cético e investigativo), Negociador (flexível e articulador) ou Auditor (binário e focado em compliance)."}
                                    activeTooltipId={activeTooltipId}
                                    setActiveTooltipId={setActiveTooltipId}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Nome do Cargo Digital *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={cargoForm.nomeCargo}
                                        onChange={(e) => setCargoForm({ ...cargoForm, nomeCargo: e.target.value })}
                                        placeholder="Ex: Analista de Conformidade Fiscal Digital"
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Gestor Humano Responsável (Owner) *
                                    </label>
                                    <input
                                        type="text"
                                        value={cargoForm.gestorResponsavel}
                                        onChange={(e) => setCargoForm({ ...cargoForm, gestorResponsavel: e.target.value })}
                                        placeholder="Ex: Gerente Contábil & Tributário"
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Tipo Estrutural
                                    </label>
                                    <select
                                        value={cargoForm.tipoEstrutural}
                                        onChange={(e) => setCargoForm({ ...cargoForm, tipoEstrutural: e.target.value })}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                                    >
                                        <option value="operador">Operador de Processo (Esteiras transacionais autônomas)</option>
                                        <option value="copiloto">Copiloto Pessoal (Assistente 1 a 1 do analista)</option>
                                        <option value="chatbot">Chatbot de Interface (Triagem e atendimento)</option>
                                        <option value="especialista">Especialista de Domínio (Consultor de normas internas)</option>
                                        <option value="orquestrador">Orquestrador (Gerente de despacho entre outros agentes)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Missão do Cargo Digital (em uma frase)
                                    </label>
                                    <input
                                        type="text"
                                        value={cargoForm.missaoCargo}
                                        onChange={(e) => setCargoForm({ ...cargoForm, missaoCargo: e.target.value })}
                                        placeholder="Ex: Validar notas fiscais recebidas contra a ordem de compra e preparar o parecer de liberação."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Arquétipo Comportamental Mandatório
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCargoForm({ ...cargoForm, arquetipo: 'analista' })}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                                                cargoForm.arquetipo === 'analista'
                                                    ? 'bg-blue-950 text-blue-300 border-blue-500 shadow'
                                                    : 'bg-gray-950 text-gray-400 border-gray-800 hover:border-gray-700'
                                            }`}
                                        >
                                            <Search className="w-3 h-3" /> Analista (Cético)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCargoForm({ ...cargoForm, arquetipo: 'negociador' })}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                                                cargoForm.arquetipo === 'negociador'
                                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow'
                                                    : 'bg-gray-950 text-gray-400 border-gray-800 hover:border-gray-700'
                                            }`}
                                        >
                                            <Handshake className="w-3 h-3" /> Negociador
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCargoForm({ ...cargoForm, arquetipo: 'auditor' })}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                                                cargoForm.arquetipo === 'auditor'
                                                    ? 'bg-purple-950 text-purple-300 border-purple-500 shadow'
                                                    : 'bg-gray-950 text-gray-400 border-gray-800 hover:border-gray-700'
                                            }`}
                                        >
                                            <Scale className="w-3 h-3" /> Auditor (Rigoroso)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                    Segregação de Funções (SoD) — O que é proibido acumular?
                                </label>
                                <textarea
                                    rows={2}
                                    value={cargoForm.segregacaoFuncoesSoD}
                                    onChange={(e) => setCargoForm({ ...cargoForm, segregacaoFuncoesSoD: e.target.value })}
                                    placeholder="Ex: Este agente apenas confere a nota e gera o parecer; a aprovação formal da despesa e o envio do pagamento bancário são exclusivos da gerência financeira."
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                                />
                            </div>
                        </div>

                        {/* ========================================== */}
                        {/* QUADRANTE 2: GATILHO & CONHECIMENTO        */}
                        {/* ========================================== */}
                        <div className="bg-gray-900/90 border border-purple-500/30 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                <h3 className="text-sm font-black text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-purple-950 border border-purple-700 flex items-center justify-center text-xs">2</span>
                                    Disparo & Conhecimento (Fato Gerador e Memórias)
                                </h3>
                                <DidacticInfo 
                                    id="info-memoria"
                                    title="Memória e Fato Gerador"
                                    text={"Fato Gerador: Qual evento de negócio dispara o trabalho?\n\nBase de Normas (Memória Semântica): Quais manuais, diretrizes, leis e tabelas da empresa ele consulta.\n\nHistórico (Memória Episódica): Quais interações anteriores com o cliente/fornecedor ele consulta para não agir como um estranho a cada conversa.\n\nIsolamento: Blindagem para que nunca vaze dados confidenciais de outros contratos ou clientes."}
                                    activeTooltipId={activeTooltipId}
                                    setActiveTooltipId={setActiveTooltipId}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Fato Gerador / Disparador da Tarefa *
                                    </label>
                                    <input
                                        type="text"
                                        value={cargoForm.fatoGeradorGatilho}
                                        onChange={(e) => setCargoForm({ ...cargoForm, fatoGeradorGatilho: e.target.value })}
                                        placeholder="Ex: Recebimento de e-mail com anexo XML/PDF da Nota Fiscal na caixa fiscal@empresa.com"
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Base de Normas e Políticas Internas
                                    </label>
                                    <input
                                        type="text"
                                        value={cargoForm.baseNormasRAG}
                                        onChange={(e) => setCargoForm({ ...cargoForm, baseNormasRAG: e.target.value })}
                                        placeholder="Ex: Manual de Compras v3.2, Política Tributária Interna e Tabela de CNAEs autorizados."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Histórico de Relacionamento (Memória de Contexto)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={cargoForm.historicoRelacionamento}
                                        onChange={(e) => setCargoForm({ ...cargoForm, historicoRelacionamento: e.target.value })}
                                        placeholder="Ex: Consultar histórico de pedidos e pagamentos dos últimos 12 meses do mesmo fornecedor para checar regularidade."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Fronteiras de Isolamento & Sigilo de Dados
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={cargoForm.limitesIsolamento}
                                        onChange={(e) => setCargoForm({ ...cargoForm, limitesIsolamento: e.target.value })}
                                        placeholder="Ex: Blindagem total para que dados cadastrais e preços praticados por um fornecedor nunca sejam acessados por outros."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ========================================== */}
                        {/* QUADRANTE 3: GOVERNANÇA, ALÇADAS & ESCALON */}
                        {/* ========================================== */}
                        <div className="bg-gray-900/90 border border-amber-500/30 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-amber-950 border border-amber-700 flex items-center justify-center text-xs">3</span>
                                    Governança, Limites de Alçada & Ponto de Parada
                                </h3>
                                <DidacticInfo 
                                    id="info-governanca"
                                    title="Alçadas e Paradas (HITL)"
                                    text={"Limites de Alçada: Até que valor em R$ ou tolerância o agente delibera sozinho sem incomodar a chefia.\n\nPonto de Parada (Human in the Loop): Regras explícitas do 'quando houver risco, dúvida ou desvio, pare e chame o supervisor humano!'.\n\nVedações Expressas: O que o cargo digital é terminantemente proibido de fazer.\n\nCiclo de Feedback: Como a correção do gestor vira lição aprendida para o futuro."}
                                    activeTooltipId={activeTooltipId}
                                    setActiveTooltipId={setActiveTooltipId}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Limite de Alçada Autônoma (em R$ ou critério) *
                                    </label>
                                    <input
                                        type="text"
                                        value={cargoForm.limiteAlcada}
                                        onChange={(e) => setCargoForm({ ...cargoForm, limiteAlcada: e.target.value })}
                                        placeholder="Ex: Liberação automática de notas de até R$ 5.000,00 com divergência máxima de R$ 5,00."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Ponto de Parada: "Quando Chamar o Gestor Humano" (HITL) *
                                    </label>
                                    <input
                                        type="text"
                                        value={cargoForm.gatilhosParadaHITL}
                                        onChange={(e) => setCargoForm({ ...cargoForm, gatilhosParadaHITL: e.target.value })}
                                        placeholder="Ex: Valores acima de R$ 5.000,00, fornecedor novo sem histórico ou CNPJ com restrição fiscal."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Vedações Expressas (Proibições Formais) *
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={cargoForm.vedacoesExpressas}
                                        onChange={(e) => setCargoForm({ ...cargoForm, vedacoesExpressas: e.target.value })}
                                        placeholder="Ex: O agente NUNCA poderá autorizar pagamentos em contas de terceiros ou assinar termos de quitação."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Ciclo de Feedback & Precedentes (Aprendizado Contínuo)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={cargoForm.cicloAprendizado}
                                        onChange={(e) => setCargoForm({ ...cargoForm, cicloAprendizado: e.target.value })}
                                        placeholder="Ex: Quando o supervisor humano corrigir uma conferência, o motivo do ajuste é gravado como precedência para casos futuros."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ========================================== */}
                        {/* QUADRANTE 4: OPERAÇÃO, ENTREGAS & AUDITORIA */}
                        {/* ========================================== */}
                        <div className="bg-gray-900/90 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center text-xs">4</span>
                                    Operação, Entregas & Auditoria Legal
                                </h3>
                                <DidacticInfo 
                                    id="info-auditoria"
                                    title="Sistemas, Provas e Botão de Emergência"
                                    text={"Acessos Autorizados: Somente os sistemas estritamente necessários (menor privilégio).\n\nPadrão de Entrega: Qual relatório ou formulário formal o agente produz para a próxima etapa.\n\nTrilha de Auditoria: Livro de registros com data, hora e justificativa para servir de prova legal e compliance.\n\nBotão de Emergência (Kill-Switch): Protocolo para suspender imediatamente o agente em caso de falha."}
                                    activeTooltipId={activeTooltipId}
                                    setActiveTooltipId={setActiveTooltipId}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Sistemas e Acessos Concedidos (Menor Privilégio)
                                    </label>
                                    <input
                                        type="text"
                                        value={cargoForm.sistemasAutorizados}
                                        onChange={(e) => setCargoForm({ ...cargoForm, sistemasAutorizados: e.target.value })}
                                        placeholder="Ex: Consulta ao ERP SAP (Módulo MM) e leitura da caixa fiscal do Outlook."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Padrão Formal de Entrega (Formulário / Relatório de Saída)
                                    </label>
                                    <input
                                        type="text"
                                        value={cargoForm.formatoEntrega}
                                        onChange={(e) => setCargoForm({ ...cargoForm, formatoEntrega: e.target.value })}
                                        placeholder="Ex: Parecer padronizado contendo: ID da NF, Validação de Itens, Risco (0-100) e Decisão Proposta."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Livro de Registro e Auditoria Legal (Trilha de Prova)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={cargoForm.registroAuditoria}
                                        onChange={(e) => setCargoForm({ ...cargoForm, registroAuditoria: e.target.value })}
                                        placeholder="Ex: Gravação de log inalterável com carimbo UTC, justificativa técnica da análise e hash de integridade do documento."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                                        Botão de Emergência / Suspensão Imediata (Kill-Switch) *
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={cargoForm.botaoEmergenciaKillSwitch}
                                        onChange={(e) => setCargoForm({ ...cargoForm, botaoEmergenciaKillSwitch: e.target.value })}
                                        placeholder="Ex: O gerente de controladoria pode desativar o agente com 1 clique no painel, roteando todas as notas pendentes para a fila humana."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* BOTÕES DE AÇÃO DO CANVAS */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-800">
                            <button
                                type="button"
                                onClick={() => setActiveTab('funil')}
                                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition flex items-center gap-2"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Revisar Funil de Elegibilidade
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('mural')}
                                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>Salvando...</>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Salvar Cargo Digital e Canvas
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                    </form>
                </div>
            )}

        </div>
    );
}
