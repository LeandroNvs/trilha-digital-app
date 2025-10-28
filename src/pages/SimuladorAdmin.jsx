import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCollection from '../hooks/useCollection.js';
import { db, appId } from '../firebase/config.js';
import ModalConfirmacao from '../components/ModalConfirmacao.jsx';
import { deleteDoc, doc } from 'firebase/firestore';
import { processarRodada } from '../simulador/motor.js';

function SimuladorAdmin() {
    const navigate = useNavigate();
    const simulacoesCollectionPath = `/artifacts/${appId}/public/data/simulacoes`;
    const simulacoes = useCollection(simulacoesCollectionPath); 
    const [itemParaExcluir, setItemParaExcluir] = useState(null);
    const [processandoId, setProcessandoId] = useState(null); // Estado de loading para o processamento
    const [erroProcessamento, setErroProcessamento] = useState('');
    const [modalConfirmarProcessamento, setModalConfirmarProcessamento] = useState(null);

    const handleCriarNova = () => {
        navigate('/simulador/novo');
    };

    const handleExcluir = async () => {
        if (itemParaExcluir) {
            try {
                const docRef = doc(db, simulacoesCollectionPath, itemParaExcluir.id);
                await deleteDoc(docRef);
                console.log("Simulação excluída com sucesso.");
            } catch (error) {
                console.error("Erro ao excluir simulação:", error);
            } finally {
                setItemParaExcluir(null);
            }
        }
    };
    
    const handleProcessarConfirmado = async () => {
        if (!modalConfirmarProcessamento) return;
        
        const simulacao = modalConfirmarProcessamento;
        setModalConfirmarProcessamento(null); // Fecha o modal
        setProcessandoId(simulacao.id);
        setErroProcessamento('');

        try {
            // Chama o motor de processamento
            const resultado = await processarRodada(simulacao.id, simulacao); //
            console.log(`Rodada ${resultado.proximaRodada} processada com sucesso!`);
            // O hook 'useCollection' atualizará a UI automaticamente
        } catch (error) {
            console.error("Erro GERAL no processamento da rodada:", error);
            setErroProcessamento(error.message);
        } finally {
            setProcessandoId(null);
        }
    };
     
    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-cyan-400">Gerenciar Simulações</h2>
                <button 
                    onClick={handleCriarNova}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    + Criar Nova Simulação
                </button>
            </div>
            
            {erroProcessamento && <p className="text-red-400 bg-red-900 p-3 rounded-lg mb-4">Falha no Processamento: {erroProcessamento}</p>}

            <div className="space-y-4">
                {simulacoes.length > 0 ? (
                    simulacoes.map(sim => {
                        const isProcessandoEste = processandoId === sim.id;
                        const isAtiva = sim.Status?.startsWith('Ativa') || sim.Status?.startsWith('Aguardando'); //
                        const rodadaAtual = sim.Rodada_Atual ?? 0; //
                        const isFinalizada = sim.Status?.startsWith('Finalizada');
                        const podeProcessar = isAtiva && !isFinalizada;
                        
                        return (
                            <div key={sim.id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <p className="font-bold text-lg">{sim.Nome_Simulacao || `Simulação ${sim.id}`}</p>
                                    <p className="text-sm text-gray-400">
                                        Rodada: {rodadaAtual} / {sim.Total_Rodadas || '?'} | Status: <span className="font-semibold">{sim.Status || 'Configurando'}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    {podeProcessar && (
                                        <button 
                                            onClick={() => setModalConfirmarProcessamento(sim)} // Abre o modal de confirmação
                                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50"
                                            disabled={isProcessandoEste}
                                            title={`Processar Rodada ${rodadaAtual + 1}`}
                                        >
                                            {isProcessandoEste ? 'Processando...' : `Processar Rodada ${rodadaAtual + 1}`}
                                        </button>
                                    )}
                                    {/* --- NOVO BOTÃO DE RANKING --- */}
                                    {(rodadaAtual > 0 || isFinalizada) && (
                                        <Link 
                                            to={`/simulador/ranking/${sim.id}`} 
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded text-sm"
                                            title="Ver Ranking"
                                        >
                                            Ranking
                                        </Link>
                                    )}
                                    <Link to={`/simulador/designar/${sim.id}`} className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm">
                                        Designar Alunos
                                    </Link>
                                    <Link to={`/simulador/editar/${sim.id}`} className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm">
                                        Editar
                                    </Link>
                                    <button 
                                        onClick={() => setItemParaExcluir(sim)}
                                        className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm"
                                        title="Excluir Simulação"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-gray-500 text-center py-8">Nenhuma simulação encontrada. Clique em "Criar Nova Simulação" para começar.</p>
                )}
            </div>

             {itemParaExcluir && (
                <ModalConfirmacao 
                    mensagem={`Excluir "${itemParaExcluir.Nome_Simulacao || itemParaExcluir.id}"? Todos os dados associados serão perdidos.`} 
                    onConfirmar={handleExcluir} 
                    onCancelar={() => setItemParaExcluir(null)} 
                />
            )}
            
            {modalConfirmarProcessamento && (
                 <ModalConfirmacao 
                    mensagem={`Tem certeza que deseja processar a Rodada ${modalConfirmarProcessamento.Rodada_Atual + 1} para "${modalConfirmarProcessamento.Nome_Simulacao}"? Esta ação é irreversível e processará as decisões de todas as equipes.`} 
                    onConfirmar={handleProcessarConfirmado} 
                    onCancelar={() => setModalConfirmarProcessamento(null)} 
                />
            )}
        </div>
    );
}

export default SimuladorAdmin;