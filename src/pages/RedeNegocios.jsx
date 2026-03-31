import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, appId, auth } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';
import Parametrizacao from '../components/RedeNegocios/Parametrizacao.jsx';
import MatrizPoderInteresse from '../components/RedeNegocios/MatrizPoderInteresse.jsx';

function RedeNegocios() {
    const [activeTab, setActiveTab] = useState('parametrizacao');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [atores, setAtores] = useState([]);
    
    const [perfilUsuario, setPerfilUsuario] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    const usuarioId = auth.currentUser?.uid;

    const { documents: todosGruposData, isLoading: isGruposLoading } = useCollection(`/artifacts/${appId}/public/data/grupos`);
    const todosGrupos = todosGruposData || [];

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

    // Buscar stakeholders deste Grupo
    useEffect(() => {
        if (!selectedGroupId) {
            setAtores([]);
            return;
        }
        const q = query(collection(db, 'rede_atores'), where('grupoId', '==', selectedGroupId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = [];
            snapshot.forEach(d => lista.push({ id: d.id, ...d.data() }));
            lista.sort((a, b) => (b.dataCriacao?.seconds || 0) - (a.dataCriacao?.seconds || 0));
            setAtores(lista);
        });
        return () => unsubscribe();
    }, [selectedGroupId]);

    if (isLoadingProfile || isGruposLoading) {
        return <div className="p-8 text-center text-gray-400 animate-pulse">Carregando módulo de Rede de Negócios...</div>;
    }

    if (meusGrupos.length === 0) {
       return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[60vh]">
                <h2 className="text-2xl font-bold text-red-400">Acesso Restrito ou Sem Grupos</h2>
                <p className="text-gray-400 mt-2">Você precisa estar vinculado a um Grupo (Empresa) para estruturar a sua Rede de Negócios.</p>
                {(perfilUsuario?.papel === 'admin' || perfilUsuario?.papel === 'professor') && (
                    <p className="text-yellow-400 mt-4 text-sm">Como admin/professor, nenhum grupo de parametrização foi encontrado no sistema.</p>
                )}
            </div>
       );
    }

    // Tela de Seleção de Grupo
    if (!selectedGroupId) {
        return (
            <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-cyan-400">Mapeamento da Rede de Negócios</h1>
                    <p className="text-gray-400 mt-2">Selecione o Grupo/Projeto para identificar os parceiros e a direção de valor.</p>
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
                            <div className="mt-4 text-sm text-gray-500">
                                {grupo.integrantesIds?.length || 0} integrantes vinculados
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const grupoSelecionado = meusGrupos.find(g => g.id === selectedGroupId);

    return (
        <div className="max-w-7xl mx-auto py-4 space-y-8 relative animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        Gestão de Stakeholders
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Visão colaborativa do grupo <strong className="text-cyan-400">{grupoSelecionado?.nome}</strong>. Identifique parceiros e mapeie as trocas de valor.
                    </p>
                </div>

                {meusGrupos.length > 1 && (
                     <button
                        onClick={() => setSelectedGroupId('')}
                        className="bg-gray-800 border border-gray-600 hover:border-cyan-500 text-gray-300 px-4 py-2 rounded-lg text-sm transition-all shadow hover:shadow-cyan-500/20"
                    >
                        Trocar Grupo / Analisar Outro
                    </button>
                )}
            </header>

            <nav className="flex flex-wrap bg-gray-800/80 rounded-lg p-1.5 gap-2 border border-gray-700">
                <button
                    onClick={() => setActiveTab('parametrizacao')}
                    className={`flex-1 py-3 px-4 text-center font-bold text-sm tracking-wide rounded-md transition-colors ${activeTab === 'parametrizacao' ? 'bg-cyan-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                >
                    📝 Cadastro de Rede
                </button>
                <button
                    onClick={() => setActiveTab('matriz')}
                    className={`flex-1 py-3 px-4 text-center font-bold text-sm tracking-wide rounded-md transition-colors ${activeTab === 'matriz' ? 'bg-cyan-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                >
                    📊 Matriz de Mendelow (Poder x Interesse)
                </button>
            </nav>

            <main className="animate-fade-in-up">
                {activeTab === 'parametrizacao' && (
                    <Parametrizacao atores={atores} selectedGroupId={selectedGroupId} grupoSelecionado={grupoSelecionado} />
                )}
                {activeTab === 'matriz' && (
                    <MatrizPoderInteresse atores={atores} grupoSelecionado={grupoSelecionado} />
                )}
            </main>
        </div>
    );
}

export default RedeNegocios;
