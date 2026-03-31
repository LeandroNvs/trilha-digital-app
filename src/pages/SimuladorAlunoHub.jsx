import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collectionGroup, query, where, getDocs, getDoc, collection } from 'firebase/firestore';
import { db, auth, appId } from '../firebase/config.js'; // Corrigido: Adicionada a extensão .js

function SimuladorAlunoHub() {
    const [minhasSimulacoes, setMinhasSimulacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');
    const usuarioId = auth.currentUser?.uid;

    useEffect(() => {
        if (!usuarioId || !db) return;

        const fetchMinhasSimulacoes = async () => {
            setLoading(true);
            setErro('');
            try {
                // 1. Encontra em quais grupos o aluno está
                const gruposRef = collection(db, `/artifacts/${appId}/public/data/grupos`);
                const qGrupos = query(gruposRef, where('integrantesIds', 'array-contains', usuarioId));
                const gruposSnap = await getDocs(qGrupos);
                
                const meusGruposIds = gruposSnap.docs.map(d => d.id);
                
                if (meusGruposIds.length === 0) {
                     setMinhasSimulacoes([]);
                     setLoading(false);
                     return;
                }

                // Firestore 'in' limita a 10 itens por array. Chunk helper:
                const chunkArray = (arr, size) => arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
                const chunks = chunkArray(meusGruposIds, 10);
                
                // 2. Busca todas as Simulações
                const simulacoesRef = collection(db, `/artifacts/${appId}/public/data/simulacoes`);
                const simSnap = await getDocs(simulacoesRef);

                // 3. Varre as empresas de cada simulação (Bypassa o collectionGroup Index)
                const promessasBusca = simSnap.docs.map(async (simDoc) => {
                    const simData = simDoc.data();
                    const empresasRef = collection(db, `/artifacts/${appId}/public/data/simulacoes/${simDoc.id}/empresas`);
                    
                    let meusDocumentosEmpresa = [];
                    for (const chunk of chunks) {
                        const qEmpresas = query(empresasRef, where('grupoId', 'in', chunk));
                        const snap = await getDocs(qEmpresas);
                        meusDocumentosEmpresa.push(...snap.docs);
                    }

                    // Se encontrou a empresa pra mim nesta simulação, retorna
                    return meusDocumentosEmpresa.map(docEmpresa => ({
                        simId: simDoc.id,
                        empresaId: docEmpresa.id,
                        simData: simData,
                        empresaData: docEmpresa.data()
                    }));
                });

                const arrayDeResultados = await Promise.all(promessasBusca);
                const results = arrayDeResultados.flat(); // Achata o array de arrays

                setMinhasSimulacoes(results); 
                
            } catch (error) {
                console.error("Erro ao buscar simulações do aluno:", error);
                setErro("Falha ao carregar seus jogos.");
            }
            setLoading(false);
        };

        fetchMinhasSimulacoes();
    }, [usuarioId, db]);

    if (loading) {
        return <div className="text-center p-10 text-gray-400">Buscando suas simulações...</div>;
    }

    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Meus Jogos</h2>
            
            {erro && <p className="text-red-400 text-center mb-4">{erro}</p>}
            
            <p className="text-gray-400 mb-8">Selecione o jogo que deseja acessar.</p>
            <div className="space-y-4">
                {minhasSimulacoes.length > 0 ? (
                    minhasSimulacoes.map(({ simId, empresaId, simData, empresaData }) => (
                        <div key={simId} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <p className="font-bold text-lg">{simData.Nome_Simulacao}</p>
                                <p className="text-sm text-cyan-400">Sua Empresa: {empresaData.Nome_Empresa}</p>
                                <p className="text-sm text-gray-400">
                                    Rodada: {simData.Rodada_Atual} / {simData.Total_Rodadas} | Status: {simData.Status}
                                </p>
                            </div>
                            <Link 
                                // Esta rota ainda será criada, mas já deixamos o link pronto
                                to={`/simulador/painel/${simId}/${empresaId}`} 
                                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                Acessar Painel
                            </Link>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-center py-8">Você ainda não foi designado para nenhuma simulação.</p>
                )}
            </div>
        </div>
    );
}

export default SimuladorAlunoHub;

