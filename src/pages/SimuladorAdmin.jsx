import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCollection from '../hooks/useCollection.js'; // Extensão readicionada
import { db, appId } from '../firebase/config.js'; // Extensão readicionada
import ModalConfirmacao from '../components/ModalConfirmacao.jsx'; // Extensão readicionada
// ATUALIZADO: Importações necessárias para Clonar e Excluir
import { 
    deleteDoc, doc, addDoc, getDoc, serverTimestamp, 
    collection, writeBatch, getDocs, query 
} from 'firebase/firestore'; 
import { processarRodada } from '../simulador/motor.js'; // Extensão readicionada

// --- Ícones Adicionados ---
// Ícone para Clonar (Copiar)
const IconeClonar = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

// --- ÍCONE ADICIONADO ---
// Ícone para Spinner (Loading)
const IconeSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
// --- FIM DO ÍCONE ADICIONADO ---


// --- FUNÇÃO ADICIONADA (copiada do SimuladorForm.jsx) ---
// Função para criar as empresas e o estado inicial (Rodada 0)
const gerarRodadaZero = async (simId, simParams, simulacoesCollectionPath) => {
    const batch = writeBatch(db);
    const numEmpresas = Number(simParams.Num_Empresas) || 6;
    const nomesEmpresas = ['Alpha', 'Nexus', 'Quantum', 'Orion', 'Sirius', 'Vega', 'Phoenix', 'Centauri', 'Lyra', 'Draco'].slice(0, numEmpresas);

    nomesEmpresas.forEach((nome) => {
        const empresaRef = doc(db, simulacoesCollectionPath, simId, 'empresas', nome);
        const estadoInicialRef = doc(db, simulacoesCollectionPath, simId, 'empresas', nome, 'estados', '0');
        batch.set(empresaRef, { Nome_Empresa: nome, Integrantes_Usuarios_IDs: [] });

        const dividaInicialLP = Number(simParams.Divida_Inicial) || 0;
        const prazoLP = Number(simParams.Prazo_Fixo_Longo_Prazo) || 4; 

        const estadoInicial = {
            Rodada: 0,
            Caixa: Number(simParams.Caixa_Inicial) || 0,
            Divida_CP: 0,
            Divida_LP_Saldo: dividaInicialLP,
            Divida_LP_Rodadas_Restantes: dividaInicialLP > 0 ? prazoLP : 0,
            Divida_Emergencia: 0,
            Imobilizado_Bruto: Number(simParams.Valor_Contabil_Imobilizado) || 0,
            Depreciacao_Acumulada: 0,
            Capacidade_Fabrica: Number(simParams.Capacidade_Producao_Inicial) || 0,
            Nivel_PD_Camera: Number(simParams.Nivel_Inicial_PD_Camera) || 1,
            Nivel_PD_Bateria: Number(simParams.Nivel_Inicial_PD_Bateria) || 1,
            Nivel_PD_Sist_Operacional_e_IA: Number(simParams.Nivel_Inicial_PD_Sist_Operacional_e_IA) || 1, 
            Nivel_PD_Atualizacao_Geral: Number(simParams.Nivel_Inicial_PD_Atualizacao_Geral) || 1, 
            Progresso_PD_Camera: 0, Progresso_PD_Bateria: 0, 
            Progresso_PD_Sist_Operacional_e_IA: 0, 
            Progresso_PD_Atualizacao_Geral: 0, 
            Vendas_Receita: 0, Custo_Produtos_Vendidos: 0,
            Despesas_Operacionais: Number(simParams.Custo_Fixo_Operacional) || 0,
            Lucro_Bruto: 0,
            Lucro_Operacional: 0 - (Number(simParams.Custo_Fixo_Operacional) || 0),
            Lucro_Liquido: 0 - (Number(simParams.Custo_Fixo_Operacional) || 0),
            Estoque_Final_Unidades: 0, Custo_Estoque_Final: 0,
            Lucro_Acumulado: 0, Valor_Marca_Acumulado: 0, IDG_Score: 0, IDG_Metricas: {}
        };
        batch.set(estadoInicialRef, estadoInicial);
    });

    const simRef = doc(db, simulacoesCollectionPath, simId);
    // ATUALIZA o status do clone de 'Configurando' para 'Ativa - Rodada 1'
    batch.update(simRef, { Status: 'Ativa - Rodada 1', Rodada_Atual: 0 }); 
    await batch.commit();
    console.log(`Rodada 0 gerada com sucesso para ${numEmpresas} empresas (clone).`);
};
// --- FIM DA FUNÇÃO ADICIONADA ---


function SimuladorAdmin() {
    const navigate = useNavigate();
    const simulacoesCollectionPath = `/artifacts/${appId}/public/data/simulacoes`;
    
    // ATUALIZADO: Captura o 'isLoading' do hook (que está no seu Canvas)
    // Não filtra por usuário (para evitar erros de import)
    const { documents: simulacoes, error: errorCollection, isLoading } = useCollection(simulacoesCollectionPath); 
    
    const [itemParaExcluir, setItemParaExcluir] = useState(null);
    const [processandoId, setProcessandoId] = useState(null); 
    const [erroProcessamento, setErroProcessamento] = useState('');
    const [modalConfirmarProcessamento, setModalConfirmarProcessamento] = useState(null);
    
    // NOVO: Estado para feedback de clonagem
    const [cloningId, setCloningId] = useState(null); 

    const handleCriarNova = () => {
        navigate('/simulador/novo'); // Usando /novo (como está no App.jsx)
    };

    // ATUALIZADO: Lógica de "Deep Delete" (exclusão profunda)
    const handleExcluir = async () => {
        if (!itemParaExcluir) return;

        const simRef = doc(db, simulacoesCollectionPath, itemParaExcluir.id);
        try {
            const batch = writeBatch(db);
            const empresasRef = collection(simRef, 'empresas');
            const empresasSnap = await getDocs(empresasRef);

            for (const empresaDoc of empresasSnap.docs) {
                const empresaRef = empresaDoc.ref;
                // Deletar 'estados' da empresa
                const estadosRef = collection(empresaRef, 'estados');
                const estadosSnap = await getDocs(estadosRef);
                estadosSnap.forEach(doc => batch.delete(doc.ref));

                // Deletar 'decisoes' da empresa
                const decisoesRef = collection(empresaRef, 'decisoes');
                const decisoesSnap = await getDocs(decisoesRef);
                decisoesSnap.forEach(doc => batch.delete(doc.ref));
                
                // Deletar o documento da empresa
                batch.delete(empresaRef);
            }
            // Deletar o documento principal da simulação
            batch.delete(simRef);
            await batch.commit();
            console.log("Simulação e subcoleções excluídas com sucesso.");
        } catch (error) {
            console.error("Erro ao excluir simulação e subcoleções:", error);
        } finally {
            setItemParaExcluir(null);
        }
    };
    
    const handleProcessarConfirmado = async () => {
        if (!modalConfirmarProcessamento) return;
        
        const simulacao = modalConfirmarProcessamento;
        setModalConfirmarProcessamento(null); 
        setProcessandoId(simulacao.id);
        setErroProcessamento('');

        try {
            const resultado = await processarRodada(simulacao.id, simulacao); 
            console.log(`Rodada ${resultado.rodadaProcessada} processada com sucesso!`); 
        } catch (error) {
            console.error("Erro GERAL no processamento da rodada:", error);
            setErroProcessamento(error.message);
        } finally {
            setProcessandoId(null);
        }
    };

    // NOVO: Função para clonar a parametrização
    const handleClonarSimulacao = async (simId) => {
        setCloningId(simId); 
        setErroProcessamento(''); 
        
        try {
            // 1. Buscar o documento original
            const simOriginalRef = doc(db, simulacoesCollectionPath, simId);
            const simOriginalSnap = await getDoc(simOriginalRef);

            if (!simOriginalSnap.exists()) {
                throw new Error("Simulação original não encontrada para clonar.");
            }

            let cloneParams = simOriginalSnap.data();

            // 2. Modificar campos chave para o novo clone
            cloneParams.Nome_Simulacao = `Cópia de ${cloneParams.Nome_Simulacao}`;
            cloneParams.Status = 'Configurando'; 
            cloneParams.Rodada_Atual = 0; 
            cloneParams.Data_Criacao = serverTimestamp(); 
            // MJ_UID será mantido do original (pois não temos 'user' aqui)

            // 3. Adicionar o novo documento
            const simulacoesCollectionRef = collection(db, simulacoesCollectionPath);
            const newSimDoc = await addDoc(simulacoesCollectionRef, cloneParams);

            // --- CORREÇÃO ADICIONADA ---
            // 4. Chamar a função para gerar as empresas e o estado 0 para o clone
            await gerarRodadaZero(newSimDoc.id, cloneParams, simulacoesCollectionPath);
            // --- FIM DA CORREÇÃO ---

        } catch (error) {
            console.error("Erro ao clonar simulação:", error);
            setErroProcessamento(`Falha ao clonar: ${error.message}`);
        } finally {
            setCloningId(null); 
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
            
            {errorCollection && <p className="text-red-400 bg-red-900 p-3 rounded-lg mb-4">Erro ao carregar simulações: {errorCollection.message}</p>}
            {erroProcessamento && <p className="text-red-400 bg-red-900 p-3 rounded-lg mb-4">{erroProcessamento}</p>}

            <div className="space-y-4">
                {/* ATUALIZADO: Verifica o isLoading */}
                {isLoading ? (
                    <p className="text-gray-500 text-center py-8">Carregando simulações...</p>
                ) : simulacoes && simulacoes.length > 0 ? (
                    simulacoes.map(sim => {
                        const isProcessandoEste = processandoId === sim.id;
                        const isClonandoEste = cloningId === sim.id;
                        const isAtiva = sim.Status?.startsWith('Ativa') || sim.Status?.startsWith('Aguardando');
                        const rodadaAtual = sim.Rodada_Atual ?? 0;
                        const isFinalizada = sim.Status?.startsWith('Finalizada');
                        const podeProcessar = isAtiva && !isFinalizada;
                        
                        return (
                            <div key={sim.id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <p className="font-bold text-lg text-white">{sim.Nome_Simulacao || `Simulação ${sim.id}`}</p>
                                    <p className="text-sm text-gray-400">
                                        Rodada: {rodadaAtual} / {sim.Total_Rodadas || '?'} | Status: <span className="font-semibold text-white">{sim.Status || 'Configurando'}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    {podeProcessar && (
                                        <button 
                                            onClick={() => setModalConfirmarProcessamento(sim)}
                                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50"
                                            disabled={isProcessandoEste || isClonandoEste} 
                                            title={`Processar Rodada ${rodadaAtual + 1}`}
                                        >
                                            {isProcessandoEste ? 'Processando...' : `Processar Rodada ${rodadaAtual + 1}`}
                                        </button>
                                    )}
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
                                    
                                    {/* --- CORREÇÃO AQUI --- */}
                                    {/* O link estava apontando para /simulador/form/ mas a rota em App.jsx é /simulador/editar/ */}
                                    <Link to={`/simulador/editar/${sim.id}`} className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm">
                                        Editar
                                    </Link>
                                    
                                    {/* --- NOVO BOTÃO DE CLONAR --- */}
                                    <button
                                        onClick={() => handleClonarSimulacao(sim.id)}
                                        disabled={isClonandoEste || isProcessandoEste}
                                        className={`p-1 rounded text-sm ${isClonandoEste ? 'opacity-50 cursor-wait' : 'text-blue-400 hover:text-blue-300'} disabled:opacity-50`}
                                        title="Clonar Parâmetros"
                                    >
                                        {isClonandoEste ? <IconeSpinner /> : <IconeClonar />}
                                    </button>
                                    
                                    <button 
                                        onClick={() => setItemParaExcluir(sim)}
                                        disabled={isProcessandoEste || isClonandoEste}
                                        className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm disabled:opacity-50"
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
                    titulo="Confirmar Exclusão" 
                    mensagem={`Excluir "${itemParaExcluir.Nome_Simulacao || itemParaExcluir.id}"? Todos os dados associados (empresas, rodadas, decisões) serão perdidos permanentemente.`} 
                    onConfirmar={handleExcluir} 
                    onCancelar={() => setItemParaExcluir(null)} 
                />
            )}
            
            {modalConfirmarProcessamento && (
                <ModalConfirmacao 
                    titulo="Confirmar Processamento" 
                    mensagem={`Tem certeza que deseja processar a Rodada ${modalConfirmarProcessamento.Rodada_Atual + 1} para "${modalConfirmarProcessamento.Nome_Simulacao}"? Esta ação é irreversível e processará as decisões de todas as equipes.`} 
                    onConfirmar={handleProcessarConfirmado} 
                    onCancelar={() => setModalConfirmarProcessamento(null)} 
                />
            )}
        </div>
    );
}

export default SimuladorAdmin;

