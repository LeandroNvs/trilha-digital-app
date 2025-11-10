import React, { useState, useMemo } from 'react';
import { setDoc, serverTimestamp } from 'firebase/firestore';

// --- Ícone de Ajuda ---
const IconeInfo = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block ml-1 text-gray-400 hover:text-cyan-400 cursor-pointer" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>;

// --- Componente Sumário e Submissão (Atualizado para mostrar centavos) ---
// (Recebe 'rodadaDecisoes' como prop, que é o 'rodadaDecisao' do pai)
function SumarioDecisoes({ simulacao, estadoRodada, decisoes, decisaoRef, rodadaDecisoes, rodadaRelatorio, custoUnitarioProjetado }) {
    const [loading, setLoading] = useState(false); const [feedback, setFeedback] = useState(''); const [showConfirm, setShowConfirm] = useState(false);
    const [percentualVendasEstimado, setPercentualVendasEstimado] = useState(80); // Começa em 80%

    // formatBRLDisplay agora mostra centavos
    const formatBRLDisplay = (num) => (Number(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Cálculos de Projeção (usando novos nomes de decisão)
    const { caixaProjetadoPreProducao, custoTotalProducaoProjetado, producaoPlanejadaNum } = useMemo(() => {
        const caixaInicial = estadoRodada?.Caixa || 0;
        
        // CORREÇÃO: Incluindo TODOS os 4 campos de P&D
        const totalInvestPD = (Number(decisoes.Invest_PD_Camera) || 0) + 
                              (Number(decisoes.Invest_PD_Bateria) || 0) + 
                              (Number(decisoes.Invest_PD_Sist_Operacional_e_IA) || 0) + // RENOMEADO
                              (Number(decisoes.Invest_PD_Atualizacao_Geral) || 0); // ADICIONADO

        const totalInvestExpansao = Number(decisoes.Invest_Expansao_Fabrica) || 0;
        const totalInvestMkt = (Number(decisoes.Marketing_Segmento_1) || 0) + (Number(decisoes.Marketing_Segmento_2) || 0);
        const tomarCPNum = Number(decisoes.Tomar_Emprestimo_CP) || 0;
        const tomarLPNum = Number(decisoes.Tomar_Financiamento_LP) || 0;
        const amortizarLPNum = Number(decisoes.Amortizar_Divida_LP) || 0;
        const producaoPlanejadaNum = Number(decisoes.Producao_Planejada) || 0;

        const custoTotalProducaoProjetado = producaoPlanejadaNum * custoUnitarioProjetado;

        // Custo Fixo (ajustado pela inflação da próxima rodada)
        const taxaInflacaoRodada = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4;
        const custoFixoBase = (simulacao.Custo_Fixo_Operacional || 0);
        // rodadaDecisoes (plural) é o número da próxima rodada (ex: 1, 2, 3)
        const custoFixoCorrigido = custoFixoBase * Math.pow(1 + taxaInflacaoRodada, rodadaDecisoes - 1); 

        const caixaProjetadoPreProducao = caixaInicial 
                                        + tomarCPNum + tomarLPNum 
                                        - totalInvestPD - totalInvestExpansao - totalInvestMkt 
                                        - amortizarLPNum - custoFixoCorrigido;
        
        return { caixaProjetadoPreProducao, custoTotalProducaoProjetado, producaoPlanejadaNum };

    }, [estadoRodada, decisoes, simulacao, custoUnitarioProjetado, rodadaDecisoes]);


    const caixaProjetadoPosProducao = caixaProjetadoPreProducao - custoTotalProducaoProjetado;

    // Cálculo da Projeção de Vendas (Atualizado)
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
            'Invest_PD_Camera', 'Invest_PD_Bateria', 'Invest_PD_Sist_Operacional_e_IA', 'Invest_PD_Atualizacao_Geral', // ATUALIZADO
            'Producao_Planejada', 'Invest_Expansao_Fabrica',
            'Preco_Segmento_1', 'Marketing_Segmento_1',
            'Preco_Segmento_2', 'Marketing_Segmento_2',
            'Tomar_Emprestimo_CP', 'Tomar_Financiamento_LP', 'Amortizar_Divida_LP'
        ];
        // Verifica se a chave existe e não é null ou undefined. Para números, '' é tratado como 0 pelo Number(), então ok.
        return chavesObrigatorias.every(key => decisoes[key] !== undefined && decisoes[key] !== null);
     }, [decisoes]);

    const handleSubmeterClick = () => { /* ... */ setFeedback(''); if (!todasDecisoesPreenchidas) { setFeedback(`Erro: Salve TODAS as abas (1 a 5) antes de submeter.`); return; } setShowConfirm(true); }; 
    const handleConfirmarSubmissao = async () => { /* ... */ 
        setShowConfirm(false); setLoading(true); 
        try { 
            await setDoc(decisaoRef, { Status_Decisao: 'Submetido', Timestamp_Submissao: serverTimestamp() }, { merge: true }); 
            setFeedback('Decisões submetidas!'); 
        } catch (error) { console.error("Erro:", error); setFeedback('Falha.'); } 
        setLoading(false); 
    }; 
    const isSubmetido = decisoes.Status_Decisao === 'Submetido';

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in">
            <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">Sumário e Submissão da Rodada {rodadaDecisoes}</h3>
            
            {/* Projeções ATUALIZADAS (Ponto 4) */}
            <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-300">1. Projeção de Custos e Investimentos</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">Caixa Inicial (R{rodadaRelatorio})</span><span className="text-green-400 font-semibold">{formatBRLDisplay(estadoRodada?.Caixa || 0)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(+) Novos Emprést. (CP+LP)</span><span className="text-green-400 font-semibold">{formatBRLDisplay((decisoes.Tomar_Emprestimo_CP || 0) + (decisoes.Tomar_Financiamento_LP || 0))}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(-) Custo Fixo (R{rodadaDecisoes})</span><span className="text-red-400 font-semibold">{formatBRLDisplay((simulacao.Custo_Fixo_Operacional || 0) * Math.pow(1 + (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4, rodadaDecisoes - 1))}</span></div>
                    
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(-) Invest. P&D (Total)</span><span className="text-red-400 font-semibold">{formatBRLDisplay((Number(decisoes.Invest_PD_Camera) || 0) + (Number(decisoes.Invest_PD_Bateria) || 0) + (Number(decisoes.Invest_PD_Sist_Operacional_e_IA) || 0) + (Number(decisoes.Invest_PD_Atualizacao_Geral) || 0))}</span></div>
                    
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(-) Invest. Expansão</span><span className="text-red-400 font-semibold">{formatBRLDisplay(decisoes.Invest_Expansao_Fabrica)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(-) Invest. Marketing</span><span className="text-red-400 font-semibold">{formatBRLDisplay((decisoes.Marketing_Segmento_1 || 0) + (decisoes.Marketing_Segmento_2 || 0))}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(-) Amortiz. LP (Adicional)</span><span className="text-red-400 font-semibold">{formatBRLDisplay(decisoes.Amortizar_Divida_LP)}</span></div>
                </div>
                 <div className="bg-gray-900 p-4 rounded-lg flex items-center justify-between flex-wrap gap-2 text-sm"> <span className="font-bold text-white">(=) Caixa Projetado (Pré-Produção):</span> <span className={`font-bold ${caixaProjetadoPreProducao >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatBRLDisplay(caixaProjetadoPreProducao)}</span> </div>
                 <div className="bg-gray-700 p-3 rounded-lg text-sm"><span className="block text-gray-400">(-) Custo Produção ({producaoPlanejadaNum.toLocaleString('pt-BR')} unid. x {formatBRLDisplay(custoUnitarioProjetado)}/unid.)</span><span className="text-red-400 font-semibold">{formatBRLDisplay(custoTotalProducaoProjetado)}</span></div>
                 <div className="bg-gray-900 p-4 rounded-lg flex items-center justify-between flex-wrap gap-2"> <span className="text-lg font-bold text-white">(=) Caixa Projetado (Pós-Produção):</span> <span className={`text-2xl font-bold ${caixaProjetadoPosProducao >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatBRLDisplay(caixaProjetadoPosProducao)}</span> </div>
                 {caixaProjetadoPosProducao < 0 && <p className="text-yellow-400 text-sm text-center font-semibold">ALERTA: Caixa projetado negativo pós-produção!</p>}
                 <p className="text-xs text-gray-500 text-center italic mt-2">Nota: Pagamentos obrigatórios de dívida (CP/Emerg. da R{rodadaRelatorio}, Parcela LP) serão debitados no início da R{rodadaDecisoes} ANTES destas projeções.</p>
            </div>

            {/* Simulador de Vendas (Atualizado) */}
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
            <div className="text-right mt-6 pt-6 border-t border-gray-700"> <button onClick={handleSubmeterClick} className={`font-bold py-3 px-8 rounded-lg transition-colors text-lg ${ isSubmetido ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : !todasDecisoesPreenchidas ? 'bg-yellow-600 text-white cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white' }`} disabled={loading || isSubmetido || (!isSubmetido && !todasDecisoesPreenchidas)} title={!isSubmetido && !todasDecisoesPreenchidas ? "Salve TODAS as abas (1 a 5) primeiro" : (isSubmetido ? "Rodada Submetida" : "Submeter decisões")}> {isSubmetido ? 'Rodada Submetida' : (loading ? 'Enviando...' : 'Submeter Decisões da Rodada')} </button> </div>
            {/* Modal Confirmação */}
            {showConfirm && ( <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"> <div className="bg-gray-700 rounded-lg shadow-xl p-6 max-w-md w-full"> <h4 className="text-xl font-bold text-yellow-400 mb-4">Confirmar Submissão</h4> <p className="text-gray-300 mb-6">Submeter decisões da Rodada {rodadaDecisoes}? Ação irreversível.</p> <div className="flex justify-end gap-4"> <button onClick={() => setShowConfirm(false)} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded-lg"> Cancelar </button> <button onClick={handleConfirmarSubmissao} className="bg-green-500 hover:bg-green-600 font-bold py-2 px-4 rounded-lg"> Confirmar </button> </div> </div> </div> )}
        </div>
    );
}

export default SumarioDecisoes;