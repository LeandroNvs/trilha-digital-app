import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId, auth } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';

import IcoInicio from '../components/InteligenciaCompetitiva/IcoInicio.jsx';
import IcoVrio from '../components/InteligenciaCompetitiva/IcoVrio.jsx';
import IcoPestel from '../components/InteligenciaCompetitiva/IcoPestel.jsx';
import IcoPorter from '../components/InteligenciaCompetitiva/IcoPorter.jsx';
import IcoPremortem from '../components/InteligenciaCompetitiva/IcoPremortem.jsx';
import IcoRede from '../components/InteligenciaCompetitiva/IcoRede.jsx';
import IcoSwot from '../components/InteligenciaCompetitiva/IcoSwot.jsx';
import IcoTows from '../components/InteligenciaCompetitiva/IcoTows.jsx';

function InteligenciaCompetitiva() {
    const [activeTab, setActiveTab] = useState('inicio');
    const [perfilUsuario, setPerfilUsuario] = useState(null);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [companyData, setCompanyData] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    
    // Hooks de Coleção
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

    // Buscar dados do ICO do grupo selecionado
    useEffect(() => {
        if (!selectedGroupId) {
            setCompanyData(null);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, `artifacts/${appId}/public/data/companies_ico`, selectedGroupId), (docSnap) => {
            if (docSnap.exists()) {
                setCompanyData(docSnap.data());
            } else {
                const initialData = {
                    identificacao: {}, rede: { atores: [] }, inventario: [],
                    interna: { vrio: [], premortem: [] },
                    externa: { pestel: {}, porter: {}, customFatores: [] },
                    estrategia: { tows: { ofensivas: [], confrontos: [], reforcos: [], defensivas: [] } }
                };
                setCompanyData(initialData);
                setDoc(docSnap.ref, initialData); 
            }
        });

        return () => unsubscribe();
    }, [selectedGroupId]);

    const handleSave = async (newData) => {
         if (!selectedGroupId) return;
         try {
             await setDoc(doc(db, `artifacts/${appId}/public/data/companies_ico`, selectedGroupId), newData, { merge: true });
         } catch(err) {
             console.error("Erro ao salvar:", err);
             alert("Erro ao salvar os dados.");
         }
    };

    if (isLoadingProfile || isGruposLoading) {
        return <div className="p-8 text-center text-gray-400 animate-pulse">Carregando módulo...</div>;
    }
    
    if (meusGrupos.length === 0) {
       return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[60vh]">
                <h2 className="text-2xl font-bold text-red-400">Acesso Restrito ou Sem Grupos</h2>
                <p className="text-gray-400 mt-2">Você precisa estar vinculado a um Grupo (Empresa) para utilizar o módulo de Inteligência Competitiva.</p>
                {(perfilUsuario?.papel === 'admin' || perfilUsuario?.papel === 'professor') && (
                    <p className="text-yellow-400 mt-4 text-sm">Como admin/professor, nenhum grupo de parametrização foi encontrado no sistema.</p>
                )}
            </div>
       );
    }

    const tabs = [
        { id: 'inicio', label: '1. Início' },
        { id: 'recursos', label: '2. Recursos (VRIO)' },
        { id: 'macroambiente', label: '3. Macroambiente (PESTEL)' },
        { id: 'competitivo', label: '4. Ambiente Competitivo (Porter)' },
        { id: 'riscos', label: '5. Riscos (Premortem)' },
        { id: 'rede', label: '6. Rede de Negócios' },
        { id: 'swot', label: '7. Matriz SWOT' },
        { id: 'tows', label: '8. Estratégia (TOWS)' },
    ];

    // Se nenhum grupo foi selecionado ainda (e há mais de 1), mostra a tela de seleção
    if (!selectedGroupId) {
        return (
            <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-cyan-400">Plataforma de Inteligência Competitiva</h1>
                    <p className="text-gray-400 mt-2">Selecione o Grupo para iniciar ou continuar a estratégia.</p>
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

    // Tela de Análise (Aba Principal) com Grupo Selecionado
    const grupoSelecionado = meusGrupos.find(g => g.id === selectedGroupId);

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in">
            <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-gray-700 pb-4">
                <div className="text-center md:text-left flex-1">
                    <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                         <h1 className="text-3xl md:text-4xl font-bold text-cyan-400">Inteligência Competitiva</h1>
                    </div>
                    <p className="text-gray-400 max-w-2xl">
                        Analisando dados estratégicos do grupo: <strong className="text-white">{grupoSelecionado?.nome}</strong>
                    </p>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                     <button onClick={() => setSelectedGroupId('')} className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-2">
                        ← Trocar Grupo
                     </button>
                    {(perfilUsuario?.papel === 'admin' || perfilUsuario?.papel === 'professor') && (
                        <div className="bg-yellow-900/50 border border-yellow-500 px-3 py-1 rounded text-yellow-300 text-xs">
                            Visão de {perfilUsuario.papel}
                        </div>
                    )}
                </div>
            </header>

            {!companyData ? (
                 <div className="p-12 text-center text-gray-400 animate-pulse">Iniciando análise para este grupo...</div>
            ) : (
                <>
                    <nav className="flex flex-wrap justify-center bg-gray-800 rounded-lg p-2 mb-8 gap-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-md font-semibold flex-grow transition-colors ${
                                    activeTab === tab.id 
                                    ? 'bg-cyan-500 text-white shadow-md' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    <main className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700">
                        {activeTab === 'inicio' && <IcoInicio companyData={companyData} onSave={handleSave} />}
                        {activeTab === 'recursos' && <IcoVrio companyData={companyData} onSave={handleSave} />}
                        {activeTab === 'macroambiente' && <IcoPestel companyData={companyData} onSave={handleSave} />}
                        {activeTab === 'competitivo' && <IcoPorter companyData={companyData} onSave={handleSave} />}
                        {activeTab === 'riscos' && <IcoPremortem companyData={companyData} onSave={handleSave} />}
                        {activeTab === 'rede' && <IcoRede companyData={companyData} onSave={handleSave} />}
                        {activeTab === 'swot' && <IcoSwot companyData={companyData} onSave={handleSave} />}
                        {activeTab === 'tows' && <IcoTows companyData={companyData} onSave={handleSave} />}
                    </main>
                </>
            )}
        </div>
    );
}

export default InteligenciaCompetitiva;
