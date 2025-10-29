import React, { useMemo } from 'react';

// --- Ícones (Copiados de SimuladorPainel para independência) ---
const IconeInfo = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block ml-1 text-gray-400 hover:text-cyan-400 cursor-pointer" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>;

// --- Componente RelatorioFinanceiro (Movido para cá) ---
function RelatorioFinanceiro({ titulo, dados, isBalanco = false }) {
    // Função formatarBRL agora mostra centavos
    const formatarBRL = (num) => {
        if (num === null || num === undefined) return '-';
        const valorNumerico = Number(num);
        const cor = valorNumerico < 0 ? 'text-red-400' : 'text-white';
        const valorFormatado = valorNumerico.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2, // Garante 2 casas decimais
            maximumFractionDigits: 2
        });
        return (<span className={cor}>{valorFormatado}</span>);
    };
    const getRowStyle = (label) => { if (!label) return ""; if (label.startsWith('(=)') || label.startsWith('Subtotal') || label.startsWith('Total')) { return "font-semibold border-t border-gray-600 pt-1"; } if (label.startsWith('(-)') || label.startsWith('(+)') ) { return "pl-2"; } return ""; };
    return ( <div className="bg-gray-700 p-4 rounded-lg shadow"> <h4 className="font-semibold text-lg text-cyan-400 mb-3 border-b border-gray-600 pb-2">{titulo}</h4> <div className="space-y-1 text-sm"> {dados.map(([label, valor], index) => ( <div key={`${label}-${index}`} className={`flex justify-between items-center py-1 ${getRowStyle(label)} ${label?.includes('---') ? 'border-t border-dashed border-gray-600 mt-1 pt-1' : 'border-b border-gray-600 last:border-b-0'}`}> <span className="text-gray-300">{label ? label.replace(/^[(=)\-+ ]+|[ ]+$/g, '') : ''}:</span> <span className="font-medium">{formatarBRL(valor)}</span> </div> ))} {isBalanco && dados.length > 0 && ( <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-cyan-500 text-xs"> <span className="text-gray-400 font-semibold">Total Ativo = Total Passivo + PL ?</span> </div> )} </div> </div> );
}

// --- Componente ResumoDecisoesRodada (Movido para cá) ---
function ResumoDecisoesRodada({ decisoes }) {
    if (!decisoes || Object.keys(decisoes).length === 0 || decisoes.Status_Decisao === 'Pendente') {
        return (
            <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow mt-6">
                <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">
                    <span role="img" aria-label="Clipboard" className="mr-2">📋</span> Decisões da Rodada Anterior
                </h3>
                <p className="text-gray-500 text-center py-4">Nenhuma decisão registrada para esta rodada.</p>
            </div>
        );
    }

    // formatBRL agora mostra centavos
    const formatBRL = (num) => (Number(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatNum = (num) => (Number(num) || 0).toLocaleString('pt-BR');

    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow mt-6">
            <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">
                <span role="img" aria-label="Clipboard" className="mr-2">📋</span> Decisões Tomadas (Rodada {decisoes.Rodada})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                {/* Rede */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Rede</h4>
                    <p className="text-gray-400">Tela: <span className="font-medium text-white">Opção {decisoes.Escolha_Fornecedor_Tela || '?'}</span></p>
                    <p className="text-gray-400">Chip: <span className="font-medium text-white">Opção {decisoes.Escolha_Fornecedor_Chip || '?'}</span></p>
                </div>
                {/* P&D */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">P&D (Investimento)</h4>
                    <p className="text-gray-400">Câmera: <span className="font-medium text-white">{formatBRL(decisoes.Invest_PD_Camera)}</span></p>
                    <p className="text-gray-400">Bateria: <span className="font-medium text-white">{formatBRL(decisoes.Invest_PD_Bateria)}</span></p>
                    <p className="text-gray-400">IA: <span className="font-medium text-white">{formatBRL(decisoes.Invest_PD_IA)}</span></p>
                </div>
                {/* Operações */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Operações</h4>
                    <p className="text-gray-400">Produção: <span className="font-medium text-white">{formatNum(decisoes.Producao_Planejada)} unid.</span></p>
                    <p className="text-gray-400">Expansão: <span className="font-medium text-white">{formatBRL(decisoes.Invest_Expansao_Fabrica)}</span></p>
                </div>
                {/* Marketing */}
                <div className="bg-gray-700 p-4 rounded-lg md:col-span-1 lg:col-span-1">
                    <h4 className="font-semibold text-gray-200 mb-2">Marketing (Seg. Premium)</h4>
                    <p className="text-gray-400">Preço: <span className="font-medium text-white">{formatBRL(decisoes.Preco_Segmento_1)}</span></p>
                    <p className="text-gray-400">Investimento: <span className="font-medium text-white">{formatBRL(decisoes.Marketing_Segmento_1)}</span></p>
                </div>
                 <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Marketing (Seg. Massa)</h4>
                    <p className="text-gray-400">Preço: <span className="font-medium text-white">{formatBRL(decisoes.Preco_Segmento_2)}</span></p>
                    <p className="text-gray-400">Investimento: <span className="font-medium text-white">{formatBRL(decisoes.Marketing_Segmento_2)}</span></p>
                </div>
                {/* Finanças */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Finanças</h4>
                    <p className="text-gray-400">Tomar CP: <span className="font-medium text-white">{formatBRL(decisoes.Tomar_Emprestimo_CP)}</span></p>
                    <p className="text-gray-400">Tomar LP: <span className="font-medium text-white">{formatBRL(decisoes.Tomar_Financiamento_LP)}</span></p>
                    <p className="text-gray-400">Amortizar LP: <span className="font-medium text-white">{formatBRL(decisoes.Amortizar_Divida_LP)}</span></p>
                </div>
            </div>
        </div>
    );
}


// --- NOVO COMPONENTE EXPORTADO: ResultadosBriefing ---
function ResultadosBriefing({ simulacao, estadoRodada, decisoesAnteriores, rodadaDecisao, rodadaRelatorio }) {

     // formatBRLDisplay agora mostra centavos
     const formatBRLDisplay = (num) => (Number(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

     // Dados DRE e Balanço (cálculos movidos para cá)
     const dadosDRE = useMemo(() => {
        if (!estadoRodada) return []; // Retorna array vazio se estadoRodada for null
        return [
            ['(+) Receita de Vendas', estadoRodada.Vendas_Receita],
            ['(-) Custo Produtos Vendidos (CPV)', estadoRodada.Custo_Produtos_Vendidos],
            ['(=) Lucro Bruto', estadoRodada.Lucro_Bruto],
            ['(-) Despesas Operacionais', estadoRodada.Despesas_Operacionais_Outras],
            ['(=) Lucro Operacional (EBIT)', estadoRodada.Lucro_Operacional_EBIT],
            ['(-) Despesas Financeiras (Juros)', (estadoRodada.Despesas_Juros_CP || 0) + (estadoRodada.Despesas_Juros_Emergencia || 0) + (estadoRodada.Despesas_Juros_LP || 0)],
            ['(=) Lucro Líquido da Rodada', estadoRodada.Lucro_Liquido],
        ];
    }, [estadoRodada]);

    const dadosBalanco = useMemo(() => {
        if (!estadoRodada) return []; // Retorna array vazio se estadoRodada for null
        const imobilizadoLiquido = (estadoRodada.Imobilizado_Bruto || 0) - (estadoRodada.Depreciacao_Acumulada || 0);
        const ativoTotal = (estadoRodada.Caixa || 0) + (estadoRodada.Custo_Estoque_Final || 0) + imobilizadoLiquido;
        const saldoLP = estadoRodada.Divida_LP_Saldo || 0;
        const rodadasLP = estadoRodada.Divida_LP_Rodadas_Restantes || 0;
        const parcelaPrincipalLPProxima = (rodadasLP > 0) ? saldoLP / rodadasLP : 0;
        const dividaCPVencendoBalanco = estadoRodada.Divida_CP || 0;
        const dividaEmergVencendoBalanco = estadoRodada.Divida_Emergencia || 0;
        const passivoCirculante = dividaCPVencendoBalanco + dividaEmergVencendoBalanco + parcelaPrincipalLPProxima;
        const passivoNaoCirculante = saldoLP > 0 ? Math.max(0, saldoLP - parcelaPrincipalLPProxima) : 0;
        const passivoTotal = passivoCirculante + passivoNaoCirculante;
        const patrimonioLiquidoCalculado = estadoRodada.Lucro_Acumulado || 0; // PL simplificado

        return [
            ['(+) Caixa', estadoRodada.Caixa],
            ['(+) Estoque (Custo)', estadoRodada.Custo_Estoque_Final],
            ['(+) Imobilizado (Líquido)', imobilizadoLiquido],
            ['(=) Total Ativos', ativoTotal],
            ['--- PASSIVOS E PL ---', null],
            ['(+) Dívida Curto Prazo (Venc. R'+rodadaDecisao+')', dividaCPVencendoBalanco],
            ['(+) Dívida Emergência (Venc. R'+rodadaDecisao+')', dividaEmergVencendoBalanco],
            ['(+) Parcela LP (Venc. R'+rodadaDecisao+')', parcelaPrincipalLPProxima],
            ['(=) Subtotal Passivo Circulante', passivoCirculante],
            ['(+) Saldo Dívida LP (Restante)', passivoNaoCirculante],
            ['(=) Subtotal Passivo Não Circulante', passivoNaoCirculante],
            ['(=) Total Passivos', passivoTotal],
            ['(+) Lucro Acumulado (PL)', patrimonioLiquidoCalculado],
            ['(=) Total Passivo + PL', passivoTotal + patrimonioLiquidoCalculado],
        ];
    }, [estadoRodada, rodadaDecisao]);


     const noticiaDaRodada = simulacao && simulacao[`Noticia_Rodada_${rodadaDecisao}`] ? simulacao[`Noticia_Rodada_${rodadaDecisao}`] : "Nenhuma notícia específica.";

     // Adiciona verificação para estadoRodada antes de renderizar DRE/Balanço
     if (!estadoRodada) {
         return <div className="text-center text-gray-500 py-10">Aguardando dados da rodada...</div>;
     }

     return (
        <div className="space-y-6 animate-fade-in">
            {/* Notícia da Rodada */}
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 md:p-6 rounded-lg shadow">
                <h3 className="text-lg md:text-xl font-semibold mb-2 text-yellow-800"> <span role="img" aria-label="Newspaper" className="mr-2">📰</span> Notícia (R{rodadaDecisao}) </h3>
                <p className="text-sm md:text-base whitespace-pre-wrap">{noticiaDaRodada}</p>
            </div>

            {/* Resultados Financeiros e Operacionais */}
            <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow">
                <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2"> <span role="img" aria-label="Chart" className="mr-2">📈</span> Resultados (R{rodadaRelatorio}) </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    <RelatorioFinanceiro titulo="DRE" dados={dadosDRE} />
                    <RelatorioFinanceiro titulo="Balanço" dados={dadosBalanco} isBalanco={true} />
                    <div className="bg-gray-700 p-4 rounded-lg shadow">
                        <h4 className="font-semibold text-lg text-cyan-400 mb-3 border-b border-gray-600 pb-2">Operações e P&D</h4>
                        <ul className="space-y-2 text-sm"> <li className="flex justify-between items-center"><span className="text-gray-300">Capacidade:</span> <span className="font-medium text-white">{Number(estadoRodada.Capacidade_Fabrica || 0).toLocaleString('pt-BR')} Unid.</span></li> <li className="flex justify-between items-center"><span className="text-gray-300">Produção:</span> <span className="font-medium text-white">{Number(estadoRodada.Producao_Efetiva || 0).toLocaleString('pt-BR')} Unid.</span></li> <li className="flex justify-between items-center"><span className="text-gray-300">Estoque:</span> <span className="font-medium text-white">{Number(estadoRodada.Estoque_Final_Unidades || 0).toLocaleString('pt-BR')} Unid.</span></li> <li className="pt-2 mt-2 border-t border-gray-600 flex justify-between items-center"><span className="text-gray-300">Nível Câmera:</span> <span className="font-semibold text-cyan-300">Nível {estadoRodada.Nivel_PD_Camera || 1}</span></li> <li className="flex justify-between items-center"><span className="text-gray-300">Nível Bateria:</span> <span className="font-semibold text-cyan-300">Nível {estadoRodada.Nivel_PD_Bateria || 1}</span></li> <li className="flex justify-between items-center"><span className="text-gray-300">Nível IA:</span> <span className="font-semibold text-cyan-300">Nível {estadoRodada.Nivel_PD_IA || 1}</span></li> </ul>
                        {(estadoRodada.Noticia_Producao_Risco || estadoRodada.Noticia_Ruptura_Estoque || estadoRodada.Divida_Emergencia > 0) && ( <div className="mt-4 pt-3 border-t border-gray-600"> <h5 className="text-md font-semibold text-yellow-400 mb-2">Alertas da Rodada {rodadaRelatorio}:</h5> <ul className="space-y-1 text-xs text-yellow-200 list-disc list-inside"> {estadoRodada.Noticia_Producao_Risco && <li>{estadoRodada.Noticia_Producao_Risco}</li>} {estadoRodada.Noticia_Ruptura_Estoque && <li>{estadoRodada.Noticia_Ruptura_Estoque}</li>} {estadoRodada.Divida_Emergencia > 0 && <li className="text-red-400 font-semibold">Empréstimo de Emergência contraído!</li>} </ul> </div> )}
                    </div>
                </div>
            </div>

            {/* Renderiza o Resumo das Decisões Anteriores */}
            {rodadaRelatorio > 0 && <ResumoDecisoesRodada decisoes={decisoesAnteriores} />}

            {/* Briefing Original */}
            <details className="bg-gray-800 p-4 md:p-6 rounded-lg shadow group">
                <summary className="text-lg font-semibold text-cyan-400 cursor-pointer list-none flex justify-between items-center"> <span>Briefing Original</span> <span className="text-cyan-500 group-open:rotate-180 transition-transform duration-200">▼</span> </summary>
                <div className="mt-3 pt-3 border-t border-gray-700"> <p className="text-gray-300 text-sm whitespace-pre-wrap">{simulacao?.Cenario_Inicial_Descricao || "-"}</p> </div>
            </details>
        </div>
    );
 }

 export default ResultadosBriefing; // Exporta o componente
