import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId, auth } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';

function AdmSIOrganizacao() {
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [perfilUsuario, setPerfilUsuario] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState('');
    const [erro, setErro] = useState('');

    // Form States
    const [nomeEmpresa, setNomeEmpresa] = useState('');
    const [descricaoNegocio, setDescricaoNegocio] = useState('');

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

    // Carregar dados de Organização do Grupo Selecionado
    useEffect(() => {
        if (!selectedGroupId) {
            setNomeEmpresa('');
            setDescricaoNegocio('');
            return;
        }

        const docRef = doc(db, `artifacts/${appId}/public/data/asi_dados`, selectedGroupId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.organizacao) {
                    setNomeEmpresa(data.organizacao.nomeEmpresa || '');
                    setDescricaoNegocio(data.organizacao.descricaoNegocio || '');
                } else {
                    setNomeEmpresa('');
                    setDescricaoNegocio('');
                }
            } else {
                setNomeEmpresa('');
                setDescricaoNegocio('');
            }
        }, (error) => {
            console.error("Erro no onSnapshot do asi_dados:", error);
        });

        return () => unsubscribe();
    }, [selectedGroupId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedGroupId) {
            setErro("Nenhum grupo selecionado.");
            return;
        }
        if (!nomeEmpresa.trim()) {
            setErro("O nome da empresa é obrigatório.");
            return;
        }

        setLoading(true);
        setErro('');
        setSucesso('');

        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/asi_dados`, selectedGroupId);
            await setDoc(docRef, {
                grupoId: selectedGroupId,
                organizacao: {
                    nomeEmpresa: nomeEmpresa.trim(),
                    descricaoNegocio: descricaoNegocio.trim()
                },
                dataModificacao: new Date()
            }, { merge: true });

            setSucesso("Organização cadastrada com sucesso!");
            setTimeout(() => setSucesso(''), 3000);
        } catch (error) {
            console.error("Erro ao salvar organização:", error);
            setErro("Erro ao salvar o cadastro.");
        } finally {
            setLoading(false);
        }
    };

    if (isLoadingProfile || isGruposLoading) {
        return <div className="p-8 text-center text-gray-400 animate-pulse">Carregando dados da Organização...</div>;
    }

    if (meusGrupos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[60vh]">
                <h2 className="text-2xl font-bold text-red-400">Acesso Restrito ou Sem Grupos</h2>
                <p className="text-gray-400 mt-2">Você precisa estar vinculado a um Grupo (Empresa) para cadastrar sua Organização.</p>
            </div>
        );
    }

    if (!selectedGroupId) {
        return (
            <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-cyan-400">Administração de SI</h1>
                    <p className="text-gray-400 mt-2">Selecione o Grupo para gerenciar a Organização do projeto.</p>
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
        <div className="max-w-3xl mx-auto p-4 md:p-8 animate-fade-in bg-gray-800 rounded-2xl shadow-xl border border-gray-700 mt-6">
            <header className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-cyan-400">Organização</h1>
                    <p className="text-sm text-gray-400">Vínculo com o grupo: <strong className="text-white">{grupoSelecionado?.nome}</strong></p>
                </div>
                {meusGrupos.length > 1 && (
                    <button onClick={() => setSelectedGroupId('')} className="text-xs bg-gray-700 hover:bg-gray-650 px-3 py-1.5 rounded transition-all">
                        ← Trocar Grupo
                    </button>
                )}
            </header>

            {erro && <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg mb-6">{erro}</div>}
            {sucesso && <div className="bg-green-900/50 border border-green-500 text-green-300 p-4 rounded-lg mb-6">{sucesso}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Nome da Empresa / Projeto *
                    </label>
                    <input 
                        type="text" 
                        value={nomeEmpresa} 
                        onChange={e => setNomeEmpresa(e.target.value)} 
                        required 
                        placeholder="Ex: SmartGlow Logística S/A" 
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none" 
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Descrição do Negócio / Atividade Fim
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Resuma o que a empresa faz, principais canais e mercado de atuação.</p>
                    <textarea 
                        value={descricaoNegocio} 
                        onChange={e => setDescricaoNegocio(e.target.value)} 
                        rows="5" 
                        placeholder="Ex: Operamos na distribuição automatizada de insumos de saúde em hospitais privados..." 
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none resize-none" 
                    />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-700">
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-10 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Salvando...' : 'Salvar Cadastro'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AdmSIOrganizacao;
