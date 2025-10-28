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
                // 1. Encontra em quais empresas o aluno está
                // Usamos collectionGroup para pesquisar em todas as subcoleções 'empresas'
                const empresasRef = collectionGroup(db, 'empresas');
                const q = query(empresasRef, where('Integrantes_Usuarios_IDs', 'array-contains', usuarioId));
                
                const querySnapshot = await getDocs(q);
                
                // 2. Para cada empresa encontrada, busca os dados da simulação "pai"
                const promises = querySnapshot.docs.map(async (docEmpresa) => {
                    const empresaData = docEmpresa.data();
                    const simulacaoRef = docEmpresa.ref.parent.parent; // Referência ao documento da simulação
                    
                    if (simulacaoRef && simulacaoRef.path.startsWith(`artifacts/${appId}/public/data/simulacoes`)) {
                        const simDoc = await getDoc(simulacaoRef);
                        if (simDoc.exists()) {
                            return {
                                simId: simDoc.id,
                                empresaId: docEmpresa.id,
                                simData: simDoc.data(),
                                empresaData: empresaData
                            };
                        }
                    }
                    return null;
                });

                const results = await Promise.all(promises);
                setMinhasSimulacoes(results.filter(Boolean)); // Filtra nulos
                
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

