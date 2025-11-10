import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
// CORREÇÃO: Tentando um caminho absoluto (baseado na raiz /src/)
import { db, appId } from '/src/firebase/config.js'; 
// NOVO (RF 4.6): Adicionando imports do Recharts para o gráfico IDG
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';


// --- Componentes Internos de Relatório ---

// Componente para formatar números
function FormatNumero({ valor, tipo = 'decimal', comCor = false }) {
    const num = Number(valor);
    if (isNaN(num)) return '-';

    let options = {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    };

    if (tipo === 'moeda') {
        options.style = 'currency';
        options.currency = 'BRL';
    } else if (tipo === 'unidade') {
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = 0;
    } else if (tipo === 'percent') {
        options.style = 'percent';
    }

    const valorFormatado = num.toLocaleString('pt-BR', options);

    if (comCor) {
        const cor = num < 0 ? 'text-red-400' : (num > 0 ? 'text-green-400' : 'text-gray-400');
        return <span className={cor}>{valorFormatado}</span>;
    }
    return valorFormatado;
}


// Componente RelatorioFinanceiro (DRE/Balanço)
function RelatorioFinanceiro({ titulo, dados, isBalanco = false }) {
    const getRowStyle = (label) => {
        if (!label) return "";
        // Estilos para Totais e Subtotais
        if (label.startsWith('(=)') || label.startsWith('Total') || label.startsWith('Subtotal')) {
            return "font-semibold border-t border-gray-600 pt-1";
        }
        // Estilo para Linhas de Categoria (ex: --- DESPESAS ---)
        if (label.startsWith('---')) {
            return "font-semibold text-cyan-400 text-xs pt-2 tracking-wider";
        }
        // Estilo para itens dentro de uma categoria
        if (label.startsWith('(-)') || label.startsWith('(+)') ) {
            return "pl-2"; // Adiciona um leve recuo
        }
        return "border-b border-gray-600 last:border-b-0"; // Estilo padrão da linha
    };
    return (
        <div className="bg-gray-700 p-4 rounded-lg shadow">
            <h4 className="font-semibold text-lg text-cyan-400 mb-3 border-b border-gray-600 pb-2">{titulo}</h4>
            <div className="space-y-1 text-sm">
                {dados.map(([label, valor], index) => {
                    // Se a label for um separador, não renderiza valor
                    if (label && label.startsWith('---')) {
                        return (
                             <div key={`${label}-${index}`} className={`flex justify-between items-center py-1 ${getRowStyle(label)}`}>
                                 <span className="text-gray-300">{label.replace(/[- ]/g, '')}:</span>
                             </div>
                        )
                    }
                    return (
                        <div key={`${label}-${index}`} className={`flex justify-between items-center py-1 ${getRowStyle(label)}`}>
                            <span className="text-gray-300">{label ? label.replace(/^[(=)\-+ ]+|[ ]+$/g, '') : ''}:</span>
                            <span className="font-medium">
                                <FormatNumero valor={valor} tipo="moeda" comCor={true} />
                            </span>
                        </div>
                    )
                })}
                {isBalanco && dados.length > 0 && (
                    <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-cyan-500 text-xs">
                        <span className="text-gray-400 font-semibold">Total Ativo = Total Passivo + PL ?</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Componente ResumoDecisoesRodada
function ResumoDecisoesRodada({ decisoes }) {
    if (!decisoes || Object.keys(decisoes).length === 0 || decisoes.Status_Decisao === 'Pendente') {
        return (
            <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow mt-6">
                <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">
                    <span role="img" aria-label="Clipboard" className="mr-2">📋</span> Decisões (Rodada {decisoes?.Rodada || '?'})
                </h3>
                <p className="text-gray-500 text-center py-4">Nenhuma decisão registrada para esta rodada.</p>
            </div>
        );
    }

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
                    <p className="text-gray-400">SO/IA: <span className="font-medium text-white">{formatBRL(decisoes.Invest_PD_Sist_Operacional_e_IA)}</span></p>
                    <p className="text-gray-400">Atual. Geral: <span className="font-medium text-white">{formatBRL(decisoes.Invest_PD_Atualizacao_Geral)}</span></p>
                </div>
                {/* Operações */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Operações</h4>
                    <p className="text-gray-400">Produção: <span className="font-medium text-white">{formatNum(decisoes.Producao_Planejada)} unid.</span></p>
                    <p className="text-gray-400">Expansão: <span className="font-medium text-white">{formatBRL(decisoes.Invest_Expansao_Fabrica)}</span></p>
                </div>
                {/* Marketing Premium */}
                <div className="bg-gray-700 p-4 rounded-lg md:col-span-1 lg:col-span-1">
                    <h4 className="font-semibold text-gray-200 mb-2">Marketing (Seg. Premium)</h4>
                    <p className="text-gray-400">Preço: <span className="font-medium text-white">{formatBRL(decisoes.Preco_Segmento_1)}</span></p>
                    <p className="text-gray-400">Investimento: <span className="font-medium text-white">{formatBRL(decisoes.Marketing_Segmento_1)}</span></p>
                </div>
                {/* Marketing Básico */}
                 <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Marketing (Seg. Básico)</h4>
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
                {/* ADICIONADO RF 4.2 */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Organização</h4>
                    <p className="text-gray-400">Capacitação: <span className="font-medium text-white">{formatBRL(decisoes.Invest_Organiz_Capacitacao)}</span></p>
                    <p className="text-gray-400">Mkt Institucional: <span className="font-medium text-white">{formatBRL(decisoes.Invest_Organiz_Mkt_Institucional)}</span></p>
                    <p className="text-gray-400">ESG: <span className="font-medium text-white">{formatBRL(decisoes.Invest_Organiz_ESG)}</span></p>
                </div>
            </div>
        </div>
    );
}

// --- NOVO (RF 4.6): Componente para o Gráfico de IDG ---
function GraficoIDG({ metricas }) {
    // 1. Validar e transformar os dados
    const data = useMemo(() => {
        if (!metricas) return [];
        // Nomes amigáveis para o gráfico
        const nomesMetricas = {
            lucro: 'Lucro',
            share: 'Mkt Share',
            pd: 'P&D',
            marca: 'Marca',
            capacitacao: 'Pessoas', // RF 4.4
            esg: 'ESG'           // RF 4.4
        };
        return Object.keys(nomesMetricas)
            .map(key => ({
                name: nomesMetricas[key],
                // A 'nota' é a pontuação já ponderada (ex: 30 de 30)
                Pontos: metricas[key] ? Number(metricas[key].nota.toFixed(1)) : 0 
            }))
            // Opcional: filtrar métricas que ainda não pontuam (ex: R1 pode não ter lucro)
            // .filter(item => item.Pontos > 0); 
    }, [metricas]);

    if (data.length === 0) {
        return <p className="text-sm text-gray-400 text-center py-10">Métricas de IDG ainda não calculadas para esta rodada.</p>;
    }

    // 2. Renderizar o gráfico (BarChart horizontal)
    return (
        <div className="w-full h-64"> {/* Altura fixa para o gráfico */}
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical" // Gráfico de barras horizontal
                    margin={{ top: 0, right: 35, left: 10, bottom: 0 }} // Aumentada margem direita para o label
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                    {/* Eixo X (Numérico, 0 a 40, pois o max é 30 ou 40) */}
                    <XAxis 
                        type="number" 
                        domain={[0, 40]} // Ajustar se os pesos mudarem (ex: 0.40*100=40)
                        stroke="#9ca3af" 
                        tick={{ fontSize: 10 }} 
                    />
                    {/* Eixo Y (Categorias) */}
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#cbd5e1" 
                        tick={{ fontSize: 11 }} 
                        width={70} // Espaço para os nomes
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '0.5rem' }}
                        labelStyle={{ color: '#cbd5e1' }}
                        cursor={{ fill: 'rgba(74, 85, 104, 0.5)' }}
                    />
                    {/* <Legend wrapperStyle={{ fontSize: '12px' }} /> */}
                    <Bar 
                        dataKey="Pontos" 
                        fill="#06b6d4" // Cor cyan
                        background={{ fill: '#4a5568', opacity: 0.3 }} 
                        // Mostra o valor na ponta da barra
                        label={{ position: 'right', fill: '#fff', fontSize: 10, formatter: (val) => `${val.toFixed(1)} pts` }} 
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}


// --- Componente Principal (ResultadosBriefing) ---
function ResultadosBriefing({ simulacao, simulacaoId, empresaId, rodadaRelatorio, rodadaDecisao }) {
    
    // Estado para o seletor de rodada. Começa na rodada atual.
    const [rodadaSelecionada, setRodadaSelecionada] = useState(rodadaRelatorio);
    // Estado para guardar os dados históricos (estado e decisões) da rodada selecionada
    const [dadosVisao, setDadosVisao] = useState({ estado: null, decisoes: null, loading: true });

    // Atualiza o seletor se a rodada principal mudar
    useEffect(() => {
        setRodadaSelecionada(rodadaRelatorio);
    }, [rodadaRelatorio]);

    // Efeito para buscar os dados da rodada SELECIONADA
    useEffect(() => {
        if (!simulacaoId || !empresaId) return;

        const fetchDadosHistoricos = async () => {
            setDadosVisao({ estado: null, decisoes: null, loading: true });
            
            const basePath = `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas/${empresaId}`;
            const estadoRef = doc(db, basePath, 'estados', rodadaSelecionada.toString());
            // Busca as decisões da rodada SELECIONADA (que já passou)
            const decisoesRef = doc(db, basePath, 'decisoes', rodadaSelecionada.toString()); 

            try {
                const [estadoSnap, decisoesSnap] = await Promise.all([
                    getDoc(estadoRef),
                    getDoc(decisoesRef)
                ]);

                setDadosVisao({
                    estado: estadoSnap.exists() ? estadoSnap.data() : null,
                    decisoes: decisoesSnap.exists() ? decisoesSnap.data() : null,
                    loading: false
                });

            } catch (error) {
                console.error("Erro ao buscar dados históricos:", error);
                setDadosVisao({ estado: null, decisoes: null, loading: false }); // Para o loading em caso de erro
            }
        };

        fetchDadosHistoricos();
    }, [simulacaoId, empresaId, rodadaSelecionada]); // Re-busca quando a rodada selecionada muda

    
    // --- Cálculos para DRE e Balanço (Memoizados) ---
    // Usam os dados de 'dadosVisao.estado'
    const { dadosDRE, dadosBalanco } = useMemo(() => {
        const estado = dadosVisao.estado;
        if (!estado) return { dadosDRE: [], dadosBalanco: [] };

        // --- DRE DETALHADO (RF 3.6) ---
        const despesasFinanceirasTotais = (estado.Despesas_Juros_CP || 0) + (estado.Despesas_Juros_Emergencia || 0) + (estado.Despesas_Juros_LP || 0);
        // RF 4.2: Adiciona despesas organizacionais ao DRE
        const despesasOrganizacionaisTotais = (estado.Despesas_Organiz_Capacitacao || 0) + (estado.Despesas_Organiz_Mkt_Institucional || 0) + (estado.Despesas_Organiz_ESG || 0);
        // Agrupa todas as despesas operacionais não-CPV
        const despesasOpTotais = (estado.Despesas_Operacionais_Outras || 0) + despesasOrganizacionaisTotais;

        const dadosDRE = [
            ['(+) Receita de Vendas', estado.Vendas_Receita],
            ['(-) Custo Produtos Vendidos (CPV)', estado.Custo_Produtos_Vendidos],
            ['(=) Lucro Bruto', estado.Lucro_Bruto],
            ['--- DESPESAS OPERACIONAIS ---', null], // Separador
            ['(-) P&D, Mkt Produto, Custo Fixo', estado.Despesas_Operacionais_Outras],
            ['(-) Organização (Pessoas, ESG, Marca)', despesasOrganizacionaisTotais], // RF 4.2
            ['(=) Subtotal Desp. Operacionais', despesasOpTotais],
            ['(=) Lucro Operacional (EBIT)', estado.Lucro_Operacional_EBIT],
            ['--- DESPESAS FINANCEIRAS ---', null], // Separador
            ['(-) Juros (Curto Prazo)', estado.Despesas_Juros_CP],
            ['(-) Juros (Emergência)', estado.Despesas_Juros_Emergencia],
            ['(-) Juros (Longo Prazo)', estado.Despesas_Juros_LP],
            ['(=) Subtotal Desp. Financeiras', despesasFinanceirasTotais],
            ['(=) Lucro Líquido (EBT)', estado.Lucro_Liquido], // EBT = Earnings Before Tax
            ['--- ACUMULADO ---', null], // Separador
            ['(=) Lucro Acumulado (Total)', estado.Lucro_Acumulado],
        ];

        // --- BALANÇO DETALHADO (RF 3.6) ---
        const imobilizadoLiquido = (estado.Imobilizado_Bruto || 0) - (estado.Depreciacao_Acumulada || 0);
        const ativoTotal = (estado.Caixa || 0) + (estado.Custo_Estoque_Final || 0) + imobilizadoLiquido;
        
        const saldoLP = estado.Divida_LP_Saldo || 0;
        const rodadasLP = estado.Divida_LP_Rodadas_Restantes || 0;
        // Parcela de LP que vencerá na *próxima* rodada (baseado no saldo ATUAL)
        const parcelaPrincipalLPProxima = (rodadasLP > 0) ? saldoLP / rodadasLP : 0; 
        
        const dividaCPVencendoBalanco = estado.Divida_CP || 0; // Dívida CP (vence R+1)
        const dividaEmergVencendoBalanco = estado.Divida_Emergencia || 0; // Dívida Emerg (vence R+1)
        
        const passivoCirculante = dividaCPVencendoBalanco + dividaEmergVencendoBalanco + parcelaPrincipalLPProxima;
        const passivoNaoCirculante = saldoLP > 0 ? Math.max(0, saldoLP - parcelaPrincipalLPProxima) : 0;
        const passivoTotal = passivoCirculante + passivoNaoCirculante;
        
        // PL = Ativo - Passivo
        const patrimonioLiquidoTotal = ativoTotal - passivoTotal; 
        const lucroAcumulado = estado.Lucro_Acumulado || 0;
        // Capital Social = PL Total - Lucros Acumulados (o que "sobrou")
        const capitalSocialEOutros = patrimonioLiquidoTotal - lucroAcumulado;


        const dadosBalanco = [
            ['--- ATIVOS ---', null], // Separador
            ['(+) Caixa', estado.Caixa],
            ['(+) Estoque (Custo)', estado.Custo_Estoque_Final],
            ['(+) Imobilizado (Líquido)', imobilizadoLiquido],
            ['(=) Total Ativos', ativoTotal],
            ['--- PASSIVOS E PL ---', null], // Separador
            ['(+) Dívida Curto Prazo (Venc. R'+(estado.Rodada+1)+')', dividaCPVencendoBalanco],
            ['(+) Dívida Emergência (Venc. R'+(estado.Rodada+1)+')', dividaEmergVencendoBalanco],
            ['(+) Parcela LP (Venc. R'+(estado.Rodada+1)+')', parcelaPrincipalLPProxima],
            ['(=) Subtotal Passivo Circulante', passivoCirculante],
            ['(+) Saldo Dívida LP (Restante)', passivoNaoCirculante],
            ['(=) Subtotal Passivo Não Circulante', passivoNaoCirculante],
            ['(=) Total Passivos', passivoTotal],
            ['--- PATRIMÔNIO LÍQUIDO ---', null], // Separador
            ['(+) Capital Social e Outros', capitalSocialEOutros],
            ['(+) Lucros Acumulados', lucroAcumulado],
            ['(=) Total Patrimônio Líquido', patrimonioLiquidoTotal],
            ['(=) Total Passivo + PL', passivoTotal + patrimonioLiquidoTotal],
        ];

        return { dadosDRE, dadosBalanco };

    }, [dadosVisao.estado]);

    // Opções para o seletor de rodada
    const opcoesRodada = Array.from({ length: rodadaRelatorio + 1 }, (_, i) => i); // Cria array [0, 1, ..., rodadaRelatorio]
    
    // Notícia (só mostra a da rodada de decisão)
    const noticiaDaRodada = simulacao[`Noticia_Rodada_${rodadaDecisao}`] || "Nenhuma notícia específica para esta rodada.";


    return (
        <div className="space-y-6 animate-fade-in"> 
            
            {/* 1. Acordeon de Notícia (Sempre mostra a notícia da PRÓXIMA rodada) */}
            <details className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 md:p-6 rounded-lg shadow group" open> 
                <summary className="text-lg md:text-xl font-semibold text-yellow-800 cursor-pointer list-none flex justify-between items-center"> 
                    <span> <span role="img" aria-label="Newspaper" className="mr-2">📰</span> Notícia (Para Rodada {rodadaDecisao}) </span>
                    <span className="text-yellow-700 group-open:rotate-180 transition-transform duration-200">▼</span> 
                </summary> 
                <div className="mt-3 pt-3 border-t border-yellow-300">
                    <p className="text-sm md:text-base whitespace-pre-wrap">{noticiaDaRodada}</p> 
                </div>
            </details> 

            {/* 2. Seletor de Rodada Histórica */}
            <div className="bg-gray-800 p-4 rounded-lg shadow flex items-center gap-4">
                <label htmlFor="rodadaSelect" className="text-lg font-semibold text-gray-300">
                    Visualizar Resultados da Rodada:
                </label>
                <select 
                    id="rodadaSelect"
                    value={rodadaSelecionada}
                    onChange={(e) => setRodadaSelecionada(Number(e.target.value))}
                    className="bg-gray-700 p-2 rounded-lg text-white font-bold focus:ring-2 focus:ring-cyan-500"
                >
                    {opcoesRodada.map(r => (
                        <option key={r} value={r}>
                            Rodada {r} {r === 0 ? '(Inicial)' : (r === rodadaRelatorio ? '(Atual)' : '')}
                        </option>
                    ))}
                </select>
            </div>

            {/* 3. Conteúdo dos Resultados (DRE, Balanço, Operações) */}
            {dadosVisao.loading ? (
                <p className="text-center text-gray-400 py-10">Carregando dados da Rodada {rodadaSelecionada}...</p>
            ) : dadosVisao.estado ? (
                <>
                    {/* --- NOVO CARD IDG (RF 4.6) --- */}
                    {/* Mostra apenas se a rodada não for a inicial (R0) */}
                    {rodadaSelecionada > 0 && (
                        <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow mb-6">
                            <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">
                                <span role="img" aria-label="Trophy" className="mr-2">🏆</span> IDG (Índice de Desempenho Global) - R{rodadaSelecionada}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                {/* Bloco do Score Total */}
                                <div className="md:col-span-1 flex flex-col items-center justify-center bg-gray-700 p-6 rounded-lg h-full">
                                    <span className="text-sm font-medium text-gray-400">Pontuação Total (IDG)</span>
                                    <span className="text-6xl font-bold text-cyan-300 my-2">
                                        {/* Usar o FormatNumero para o score total */}
                                        <FormatNumero valor={dadosVisao.estado.IDG_Score} tipo="decimal" />
                                    </span>
                                    <span className="text-xs text-gray-500">(Máx 100)</span>
                                </div>
                                {/* Bloco do Gráfico */}
                                <div className="md:col-span-2">
                                    <GraficoIDG metricas={dadosVisao.estado.IDG_Metricas} />
                                </div>
                            </div>
                        </div>
                    )}
                    {/* --- FIM DO NOVO CARD IDG --- */}

                    {/* Resultados Financeiros e Operacionais */}
                    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow"> 
                        <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2"> 
                            <span role="img" aria-label="Chart" className="mr-2">📈</span> Resultados (Rodada {rodadaSelecionada}) 
                        </h3> 
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6"> 
                            <RelatorioFinanceiro titulo="DRE (Demonstrativo)" dados={dadosDRE} /> 
                            <RelatorioFinanceiro titulo="Balanço Patrimonial" dados={dadosBalanco} isBalanco={true} /> 
                            <div className="bg-gray-700 p-4 rounded-lg shadow"> 
                                <h4 className="font-semibold text-lg text-cyan-400 mb-3 border-b border-gray-600 pb-2">Operações e P&D</h4> 
                                <ul className="space-y-2 text-sm"> 
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Capacidade:</span> <span className="font-medium text-white"><FormatNumero valor={dadosVisao.estado.Capacidade_Fabrica} tipo="unidade" /> Unid.</span></li> 
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Produção:</span> <span className="font-medium text-white"><FormatNumero valor={dadosVisao.estado.Producao_Efetiva} tipo="unidade" /> Unid.</span></li> 
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Estoque:</span> <span className="font-medium text-white"><FormatNumero valor={dadosVisao.estado.Estoque_Final_Unidades} tipo="unidade" /> Unid.</span></li> 
                                    
                                    <li className="pt-2 mt-2 border-t border-gray-600 flex justify-between items-center"><span className="text-gray-300">Nível Câmera:</span> <span className="font-semibold text-cyan-300">Nível {dadosVisao.estado.Nivel_PD_Camera || 1}</span></li> 
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Nível Bateria:</span> <span className="font-semibold text-cyan-300">Nível {dadosVisao.estado.Nivel_PD_Bateria || 1}</span></li> 
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Nível SO/IA:</span> <span className="font-semibold text-cyan-300">Nível {dadosVisao.estado.Nivel_PD_Sist_Operacional_e_IA || 1}</span></li> 
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Nível Atual. Geral:</span> <span className="font-semibold text-cyan-300">Nível {dadosVisao.estado.Nivel_PD_Atualizacao_Geral || 1}</span></li> 
                                </ul> 
                                
                                {(dadosVisao.estado.Noticia_Producao_Risco || dadosVisao.estado.Noticia_Ruptura_Estoque || dadosVisao.estado.Divida_Emergencia > 0) && ( 
                                    <div className="mt-4 pt-3 border-t border-gray-600"> 
                                        <h5 className="text-md font-semibold text-yellow-400 mb-2">Alertas da Rodada {rodadaSelecionada}:</h5> 
                                        <ul className="space-y-1 text-xs text-yellow-200 list-disc list-inside"> 
                                            {dadosVisao.estado.Noticia_Producao_Risco && <li>{dadosVisao.estado.Noticia_Producao_Risco}</li>} 
                                            {dadosVisao.estado.Noticia_Ruptura_Estoque && <li>{dadosVisao.estado.Noticia_Ruptura_Estoque}</li>} 
                                            {dadosVisao.estado.Divida_Emergencia > 0 && <li className="text-red-400 font-semibold">Empréstimo de Emergência contraído!</li>} 
                                        </ul> 
                                    </div> 
                                )} 
                            </div> 
                        </div> 
                    </div> 

                    {/* 4. Resumo das Decisões (só mostra se não for R0) */}
                    {rodadaSelecionada > 0 && <ResumoDecisoesRodada decisoes={dadosVisao.decisoes} />}

                </>
            ) : (
                <p className="text-center text-yellow-400 py-10">Dados não encontrados para a Rodada {rodadaSelecionada}.</p>
            )}
        </div> 
    );
}

export default ResultadosBriefing;