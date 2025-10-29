import React, { useState, useMemo } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
// Assegure que o caminho para config.js está correto em relação a src/components/
import { db, appId } from '../firebase/config.js';

// --- Componente Sumário e Submissão (Movido para cá) ---
function SumarioDecisoes({ simulacao, estadoRodada, decisoes, decisaoRef, rodadaDecisoes, rodadaRelatorio }) {
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [percentualVendasEstimado, setPercentualVendasEstimado] = useState(80);

    // formatBRLDisplay agora mostra centavos
    const formatBRLDisplay = (num) => (Number(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Cálculos de Projeção
    const caixaInicial = estadoRodada?.Caixa || 0;
    const totalInvestPD = (Number(decisoes.Invest_PD_Camera) || 0) + (Number(decisoes.Invest_PD_Bateria) || 0) + (Number(decisoes.Invest_PD_IA) || 0);
    const totalInvestExpansao = Number(decisoes.Invest_Expansao_Fabrica) || 0;
    const totalInvestMkt = (Number(decisoes.Marketing_Segmento_1) || 0) + (Number(decisoes.Marketing_Segmento_2) || 0);
    const tomarCPNum = Number(decisoes.Tomar_Emprestimo_CP) || 0;
    const tomarLPNum = Number(decisoes.Tomar_Financiamento_LP) || 0;
    const amortizarLPNum = Number(decisoes.Amortizar_Divida_LP) || 0;
    const producaoPlanejadaNum = Number(decisoes.Producao_Planejada) || 0;

    const custoUnitarioProjetado = useMemo(() => {
        if (!simulacao || !decisoes) return 0;
        const ct = (decisoes.Escolha_Fornecedor_Tela === 'A') ? (simulacao.Fornecedor_Tela_A_Custo || 0) : (simulacao.Fornecedor_Tela_B_Custo || 0);
        const cc = (decisoes.Escolha_Fornecedor_Chip === 'C') ? (simulacao.Fornecedor_Chip_C_Custo || 0) : (simulacao.Fornecedor_Chip_D_Custo || 0);
        const cb = ct + cc;
        const cvmb = (simulacao.Custo_Variavel_Montagem_Base || 0);
        return cvmb + cb;
    }, [simulacao, decisoes.Escolha_Fornecedor_Tela, decisoes.Escolha_Fornecedor_Chip]);

    const custoTotalProducaoProjetado = producaoPlanejadaNum * custoUnitarioProjetado;
    const caixaProjetadoPreProducao = caixaInicial + tomarCPNum + tomarLPNum - totalInvestPD - totalInvestExpansao - totalInvestMkt - amortizarLPNum;
    const caixaProjetadoPosProducao = caixaProjetadoPreProducao - custoTotalProducaoProjetado;

    const { receitaProjetada, caixaProjetadoPosVenda, precoMedioPonderado } = useMemo(() => {
        const unidadesVender = producaoPlanejadaNum * (percentualVendasEstimado / 100);
        const preco1 = Number(decisoes.Preco_Segmento_1) || 0;
        const preco2 = Number(decisoes.Preco_Segmento_2) || 0;
        let precoMedio = 0;
        if (preco1 > 0 && preco2 > 0) {
            precoMedio = (preco1 + preco2) / 2; // Simples média
        } else {
            precoMedio = preco1 + preco2; // Se um for 0, usa o outro
        }
        const receitaProjetada = unidadesVender * precoMedio;
        const caixaProjetadoPosVenda = caixaProjetadoPosProducao + receitaProjetada;
        return { receitaProjetada, caixaProjetadoPosVenda, precoMedioPonderado: precoMedio };
    }, [producaoPlanejadaNum, percentualVendasEstimado, decisoes.Preco_Segmento_1, decisoes.Preco_Segmento_2, caixaProjetadoPosProducao]);

    const todasDecisoesPreenchidas = useMemo(() => {
        const chavesObrigatorias = [
            'Escolha_Fornecedor_Tela', 'Escolha_Fornecedor_Chip',
            'Invest_PD_Camera', 'Invest_PD_Bateria', 'Invest_PD_IA',
            'Producao_Planejada', 'Invest_Expansao_Fabrica',
            'Preco_Segmento_1', 'Marketing_Segmento_1',
            'Preco_Segmento_2', 'Marketing_Segmento_2',
            'Tomar_Emprestimo_CP', 'Tomar_Financiamento_LP', 'Amortizar_Divida_LP'
        ];
        return chavesObrigatorias.every(key => decisoes[key] !== undefined && decisoes[key] !== null);
     }, [decisoes]);

    const handleSubmeterClick = () => {
        setFeedback('');
        if (!todasDecisoesPreenchidas) {
            setFeedback(`Erro: Salve TODAS as abas (1 a 5) antes de submeter.`);
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirmarSubmissao = async () => {
        setShowConfirm(false);
        setLoading(true);
        try {
            // Usa decisaoRef recebida como prop
            await setDoc(decisaoRef, { Status_Decisao: 'Submetido', Timestamp_Submissao: serverTimestamp() }, { merge: true });
            setFeedback('Decisões submetidas!');
        } catch (error) {
            console.error("Erro ao submeter decisões:", error);
            setFeedback('Falha ao submeter. Tente novamente.');
        }
        setLoading(false);
    };

    const isSubmetido = decisoes.Status_Decisao === 'Submetido';

    // Garante que estadoRodada existe antes de tentar acessar suas propriedades
     if (!estadoRodada) {
         return <div className="text-center text-gray-500 py-10">Aguardando dados da rodada anterior...</div>;
     }

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in">
            <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">Sumário e Submissão da Rodada {rodadaDecisoes}</h3> {/* Prop corrigida */}

            {/* Projeções */}
            <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-300">1. Projeção de Custos e Investimentos</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {/* ... divs de projeção ... */}
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">Caixa Inicial</span><span className="text-green-400 font-semibold">{formatBRLDisplay(caixaInicial)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(+) Novos Emprést. (CP+LP)</span><span className="text-green-400 font-semibold">{formatBRLDisplay(tomarCPNum + tomarLPNum)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg md:col-start-1"><span className="block text-gray-400">(-) Invest. P&D</span><span className="text-red-400 font-semibold">{formatBRLDisplay(totalInvestPD)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(-) Invest. Expansão</span><span className="text-red-400 font-semibold">{formatBRLDisplay(totalInvestExpansao)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(-) Invest. Marketing</span><span className="text-red-400 font-semibold">{formatBRLDisplay(totalInvestMkt)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(-) Amortiz. LP (Adicional)</span><span className="text-red-400 font-semibold">{formatBRLDisplay(amortizarLPNum)}</span></div>
                </div>
                 <div className="bg-gray-900 p-4 rounded-lg flex items-center justify-between flex-wrap gap-2 text-sm"> <span className="font-bold text-white">(=) Caixa Projetado (Pré-Produção):</span> <span className={`font-bold ${caixaProjetadoPreProducao >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatBRLDisplay(caixaProjetadoPreProducao)}</span> </div>
                 <div className="bg-gray-700 p-3 rounded-lg text-sm"><span className="block text-gray-400">(-) Custo Produção ({producaoPlanejadaNum.toLocaleString('pt-BR')} unid. x {formatBRLDisplay(custoUnitarioProjetado)}/unid.)</span><span className="text-red-400 font-semibold">{formatBRLDisplay(custoTotalProducaoProjetado)}</span></div>
                 <div className="bg-gray-900 p-4 rounded-lg flex items-center justify-between flex-wrap gap-2"> <span className="text-lg font-bold text-white">(=) Caixa Projetado (Pós-Produção):</span> <span className={`text-2xl font-bold ${caixaProjetadoPosProducao >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatBRLDisplay(caixaProjetadoPosProducao)}</span> </div>
                 {caixaProjetadoPosProducao < 0 && <p className="text-yellow-400 text-sm text-center font-semibold">ALERTA: Caixa projetado negativo pós-produção!</p>}
                 <p className="text-xs text-gray-500 text-center italic mt-2">Nota: Pagamentos obrigatórios de dívida (CP/Emerg. da R{rodadaRelatorio}, Parcela LP) serão debitados no início da R{rodadaDecisoes} ANTES destas projeções.</p> {/* Prop corrigida */}
            </div>

            {/* Simulador de Vendas */}
            <div className="space-y-4 pt-4 border-t border-gray-700">
                <h4 className="text-lg font-semibold text-gray-300">2. Simulação de Cenário de Vendas</h4>
                <div className="space-y-2">
                    <label htmlFor="vendasSlider" className="flex justify-between text-sm font-medium text-gray-400">
                        <span>Estimativa de Vendas (do total produzido):</span>
                        <span className="font-bold text-white text-base">{percentualVendasEstimado}%</span>
                    </label>
                    <input type="range" id="vendasSlider" min="0" max="100" step="5" value={percentualVendasEstimado} onChange={(e) => setPercentualVendasEstimado(Number(e.target.value))} disabled={isSubmetido || producaoPlanejadaNum === 0} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-lg accent-cyan-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(+) Receita Bruta Estimada</span><span className="text-green-400 font-semibold">{formatBRLDisplay(receitaProjetada)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(=) Caixa Projetado Pós-Venda</span><span className={`font-semibold ${caixaProjetadoPosVenda >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatBRLDisplay(caixaProjetadoPosVenda)}</span></div>
                </div>
                 <p className="text-xs text-gray-500 text-center italic mt-2">Estimativa baseada em um Preço Médio Ponderado de {formatBRLDisplay(precoMedioPonderado)}. O Market Share real definirá as vendas.</p>
            </div>

            {/* Feedback e Botão */}
            {feedback && <p className={`text-sm text-center font-medium ${feedback.includes('Erro') ? 'text-red-400' : (feedback.includes('submetidas') ? 'text-green-400' : 'text-yellow-400')}`}>{feedback}</p>}
            <div className="text-right mt-6 pt-6 border-t border-gray-700">
                <button
                    onClick={handleSubmeterClick}
                    className={`font-bold py-3 px-8 rounded-lg transition-colors text-lg ${
                        isSubmetido ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : !todasDecisoesPreenchidas ? 'bg-yellow-600 text-white cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                    disabled={loading || isSubmetido || (!isSubmetido && !todasDecisoesPreenchidas)}
                    title={!isSubmetido && !todasDecisoesPreenchidas ? "Salve TODAS as abas (1 a 5) primeiro" : (isSubmetido ? "Rodada Submetida" : "Submeter decisões")}
                >
                    {isSubmetido ? 'Rodada Submetida' : (loading ? 'Enviando...' : `Submeter Decisões da Rodada ${rodadaDecisoes}`)} {/* Prop corrigida */}
                </button>
            </div>

            {/* Modal Confirmação */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-700 rounded-lg shadow-xl p-6 max-w-md w-full">
                        <h4 className="text-xl font-bold text-yellow-400 mb-4">Confirmar Submissão</h4>
                        <p className="text-gray-300 mb-6">Submeter decisões da Rodada {rodadaDecisoes}? Ação irreversível.</p> {/* Prop corrigida */}
                        <div className="flex justify-end gap-4">
                            <button onClick={() => setShowConfirm(false)} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded-lg"> Cancelar </button>
                            <button onClick={handleConfirmarSubmissao} className="bg-green-500 hover:bg-green-600 font-bold py-2 px-4 rounded-lg"> Confirmar </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SumarioDecisoes; // Exporta o componente
