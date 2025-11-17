import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
// CORREÇÃO: Caminho relativo para o config (assumindo que este arquivo está em /src/components/)
import { db, appId } from '/src/firebase/config'; 
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
        <div className="bg-gray-700 p-4 rounded-lg shadow h-full">
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

// =================================================================
// MUDANÇA: ResumoDecisoesRodada
// =================================================================
function ResumoDecisoesRodada({ decisoes, simulacao }) {
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
    const seg1Nome = simulacao?.Segmento1_Nome || 'S1';
    const seg2Nome = simulacao?.Segmento2_Nome || 'S2';

    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow mt-6">
            <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">
                <span role="img" aria-label="Clipboard" className="mr-2">📋</span> Decisões Tomadas (Rodada {decisoes.Rodada})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                
                {/* Rede S1 */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Rede ({seg1Nome})</h4>
                    <p className="text-gray-400">Tela: <span className="font-medium text-white">Opção {decisoes.Escolha_Fornecedor_S1_Tela || '?'}</span></p>
                    <p className="text-gray-400">Chip: <span className="font-medium text-white">Opção {decisoes.Escolha_Fornecedor_S1_Chip || '?'}</span></p>
                </div>
                
                {/* Rede S2 */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Rede ({seg2Nome})</h4>
                    <p className="text-gray-400">Tela: <span className="font-medium text-white">Opção {decisoes.Escolha_Fornecedor_S2_Tela || '?'}</span></p>
                    <p className="text-gray-400">Chip: <span className="font-medium text-white">Opção {decisoes.Escolha_Fornecedor_S2_Chip || '?'}</span></p>
                </div>
                
                {/* Operações */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Operações</h4>
                    <p className="text-gray-400">Produção ({seg1Nome}): <span className="font-medium text-white">{formatNum(decisoes.Producao_Planejada_S1)} unid.</span></p>
                    <p className="text-gray-400">Produção ({seg2Nome}): <span className="font-medium text-white">{formatNum(decisoes.Producao_Planejada_S2)} unid.</span></p>
                    <p className="text-gray-400">Expansão: <span className="font-medium text-white">{formatBRL(decisoes.Invest_Expansao_Fabrica)}</span></p>
                </div>
                
                {/* P&D */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">P&D (Investimento)</h4>
                    <p className="text-gray-400">Câmera: <span className="font-medium text-white">{formatBRL(decisoes.Invest_PD_Camera)}</span></p>
                    <p className="text-gray-400">Bateria: <span className="font-medium text-white">{formatBRL(decisoes.Invest_PD_Bateria)}</span></p>
                    <p className="text-gray-400">SO/IA: <span className="font-medium text-white">{formatBRL(decisoes.Invest_PD_Sist_Operacional_e_IA)}</span></p>
                    <p className="text-gray-400">Atual. Geral: <span className="font-medium text-white">{formatBRL(decisoes.Invest_PD_Atualizacao_Geral)}</span></p>
                </div>

                {/* Marketing Premium */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Marketing ({seg1Nome})</h4>
                    <p className="text-gray-400">Preço: <span className="font-medium text-white">{formatBRL(decisoes.Preco_Segmento_1)}</span></p>
                    <p className="text-gray-400">Investimento: <span className="font-medium text-white">{formatBRL(decisoes.Marketing_Segmento_1)}</span></p>
                </div>
                {/* Marketing Básico */}
                 <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Marketing ({seg2Nome})</h4>
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

                {/* Organização */}
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

// =================================================================
// MUDANÇA: GraficoIDG (para incluir novas métricas)
// =================================================================
function GraficoIDG({ metricas }) {
    // 1. Validar e transformar os dados
    const data = useMemo(() => {
        if (!metricas) return [];
        // Nomes amigáveis para o gráfico
        const nomesMetricas = {
            lucro: 'Lucro',
            share: 'Mkt Share',
            pd: 'P&D',
            saude: 'Saúde Fin.', // NOVO
            org: 'Org/ESG'       // NOVO
            // 'marca' foi removido ou substituído por 'org'
        };
        return Object.keys(nomesMetricas)
            .map(key => ({
                name: nomesMetricas[key],
                // A 'nota' é a pontuação já ponderada
                Pontos: metricas[key] ? Number(metricas[key].nota.toFixed(1)) : 0 
            }))
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
                    layout="vertical"
                    margin={{ top: 0, right: 35, left: 10, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                    {/* Eixo X (Numérico) - Domínio removido para ser automático */}
                    <XAxis 
                        type="number" 
                        stroke="#9ca3af" 
                        tick={{ fontSize: 10 }} 
                    />
                    {/* Eixo Y (Categorias) */}
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#cbd5e1" 
                        tick={{ fontSize: 11 }} 
                        width={70}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '0.5rem' }}
                        labelStyle={{ color: '#cbd5e1' }}
                        cursor={{ fill: 'rgba(74, 85, 104, 0.5)' }}
                    />
                    <Bar 
                        dataKey="Pontos" 
                        fill="#06B6D4" // Cor cyan
                        background={{ fill: '#4a5568', opacity: 0.3 }} 
                        label={{ position: 'right', fill: '#fff', fontSize: 10, formatter: (val) => `${val.toFixed(1)} pts` }} 
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}


// --- Componente Principal (ResultadosBriefing) ---
function ResultadosBriefing({ simulacao, simulacaoId, empresaId, rodadaRelatorio, rodadaDecisao }) {
    
    const [rodadaSelecionada, setRodadaSelecionada] = useState(rodadaRelatorio);
    const [dadosVisao, setDadosVisao] = useState({ estado: null, decisoes: null, loading: true });

    useEffect(() => {
        setRodadaSelecionada(rodadaRelatorio);
    }, [rodadaRelatorio]);

    useEffect(() => {
        if (!simulacaoId || !empresaId) return;

        const fetchDadosHistoricos = async () => {
            setDadosVisao({ estado: null, decisoes: null, loading: true });
            
            const basePath = `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas/${empresaId}`;
            const estadoRef = doc(db, basePath, 'estados', rodadaSelecionada.toString());
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
                setDadosVisao({ estado: null, decisoes: null, loading: false });
            }
        };

        fetchDadosHistoricos();
    }, [simulacaoId, empresaId, rodadaSelecionada]);

    
    // --- Cálculos para DRE e Balanço (Memoizados) ---
    const { dadosDRE, dadosBalanco } = useMemo(() => {
        const estado = dadosVisao.estado;
        if (!estado) return { dadosDRE: [], dadosBalanco: [] };

        // --- DRE DETALHADO (RF 3.6 / RF 4.2) ---
        const despesasFinanceirasTotais = (estado.Despesas_Juros_CP || 0) + (estado.Despesas_Juros_Emergencia || 0) + (estado.Despesas_Juros_LP || 0);
        const despesasOrganizacionaisTotais = (estado.Despesas_Organiz_Capacitacao || 0) + (estado.Despesas_Organiz_Mkt_Institucional || 0) + (estado.Despesas_Organiz_ESG || 0);
        const despesasOpTotais = (estado.Despesas_Operacionais_Outras || 0) + despesasOrganizacionaisTotais;

        const dadosDRE = [
            ['(+) Receita de Vendas', estado.Vendas_Receita],
            ['(-) Custo Produtos Vendidos (CPV)', estado.Custo_Produtos_Vendidos],
            ['(=) Lucro Bruto', estado.Lucro_Bruto],
            ['--- DESPESAS OPERACIONAIS ---', null],
            ['(-) P&D, Mkt Produto, Custo Fixo', estado.Despesas_Operacionais_Outras],
            ['(-) Organização (Pessoas, ESG, Marca)', despesasOrganizacionaisTotais],
            ['(=) Subtotal Desp. Operacionais', despesasOpTotais],
            ['(=) Lucro Operacional (EBIT)', estado.Lucro_Operacional_EBIT],
            ['--- DESPESAS FINANCEIRAS ---', null],
            ['(-) Juros (CP)', estado.Despesas_Juros_CP],
            ['(-) Juros (Emergência)', estado.Despesas_Juros_Emergencia],
            ['(-) Juros (LP)', estado.Despesas_Juros_LP],
            ['(=) Subtotal Desp. Financeiras', despesasFinanceirasTotais],
            ['(=) Lucro Líquido (EBT)', estado.Lucro_Liquido],
            ['--- ACUMULADO ---', null],
            ['(=) Lucro Acumulado (Total)', estado.Lucro_Acumulado],
        ];

        // --- BALANÇO DETALHADO (MUDANÇA: Estoque) ---
        // MUDANÇA: Soma os dois estoques
        const custoEstoqueTotal = (estado.Custo_Estoque_S1 || 0) + (estado.Custo_Estoque_S2 || 0);
        
        const imobilizadoLiquido = (estado.Imobilizado_Bruto || 0) - (estado.Depreciacao_Acumulada || 0);
        const ativoTotal = (estado.Caixa || 0) + custoEstoqueTotal + imobilizadoLiquido;
        
        const saldoLP = estado.Divida_LP_Saldo || 0;
        const rodadasLP = estado.Divida_LP_Rodadas_Restantes || 0;
        const parcelaPrincipalLPProxima = (rodadasLP > 0) ? saldoLP / rodadasLP : 0; 
        
        const dividaCPVencendoBalanco = estado.Divida_CP || 0;
        const dividaEmergVencendoBalanco = estado.Divida_Emergencia || 0;
        
        const passivoCirculante = dividaCPVencendoBalanco + dividaEmergVencendoBalanco + parcelaPrincipalLPProxima;
        const passivoNaoCirculante = saldoLP > 0 ? Math.max(0, saldoLP - parcelaPrincipalLPProxima) : 0;
        const passivoTotal = passivoCirculante + passivoNaoCirculante;
        
        const patrimonioLiquidoTotal = ativoTotal - passivoTotal; 
        const lucroAcumulado = estado.Lucro_Acumulado || 0;
        const capitalSocialEOutros = patrimonioLiquidoTotal - lucroAcumulado;


        const dadosBalanco = [
            ['--- ATIVOS ---', null],
            ['(+) Caixa', estado.Caixa],
            // MUDANÇA: Usa Custo Total
            ['(+) Estoque Total (S1+S2)', custoEstoqueTotal],
            ['(+) Imobilizado (Líquido)', imobilizadoLiquido],
            ['(=) Total Ativos', ativoTotal],
            ['--- PASSIVOS E PL ---', null],
            ['(+) Dívida Curto Prazo (Venc. R'+(estado.Rodada+1)+')', dividaCPVencendoBalanco],
            ['(+) Dívida Emergência (Venc. R'+(estado.Rodada+1)+')', dividaEmergVencendoBalanco],
            ['(+) Parcela LP (Venc. R'+(estado.Rodada+1)+')', parcelaPrincipalLPProxima],
            ['(=) Subtotal Passivo Circulante', passivoCirculante],
            ['(+) Saldo Dívida LP (Restante)', passivoNaoCirculante],
            ['(=) Subtotal Passivo Não Circulante', passivoNaoCirculante],
            ['(=) Total Passivos', passivoTotal],
            ['--- PATRIMÔNIO LÍQUIDO ---', null],
            ['(+) Capital Social e Outros', capitalSocialEOutros],
            ['(+) Lucros Acumulados', lucroAcumulado],
            ['(=) Total Patrimônio Líquido', patrimonioLiquidoTotal],
            ['(=) Total Passivo + PL', passivoTotal + patrimonioLiquidoTotal],
        ];

        return { dadosDRE, dadosBalanco };

    }, [dadosVisao.estado]);

    const opcoesRodada = Array.from({ length: rodadaRelatorio + 1 }, (_, i) => i);
    const noticiaDaRodada = simulacao[`Noticia_Rodada_${rodadaDecisao}`] || "Nenhuma notícia específica para esta rodada.";

    return (
        <div className="space-y-6 animate-fade-in"> 
            
            <details className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 md:p-6 rounded-lg shadow group" open> 
                <summary className="text-lg md:text-xl font-semibold text-yellow-800 cursor-pointer list-none flex justify-between items-center"> 
                    <span> <span role="img" aria-label="Newspaper" className="mr-2">📰</span> Notícia (Para Rodada {rodadaDecisao}) </span>
                    <span className="text-yellow-700 group-open:rotate-180 transition-transform duration-200">▼</span> 
                </summary> 
                <div className="mt-3 pt-3 border-t border-yellow-300">
                    <p className="text-sm md:text-base whitespace-pre-wrap">{noticiaDaRodada}</p> 
                </div>
            </details> 

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

            {dadosVisao.loading ? (
                <p className="text-center text-gray-400 py-10">Carregando dados da Rodada {rodadaSelecionada}...</p>
            ) : dadosVisao.estado ? (
                <>
                    {rodadaSelecionada > 0 && (
                        <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow mb-6">
                            <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">
                                <span role="img" aria-label="Trophy" className="mr-2">🏆</span> IDG (Índice de Desempenho Global) - R{rodadaSelecionada}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                <div className="md:col-span-1 flex flex-col items-center justify-center bg-gray-700 p-6 rounded-lg h-full">
                                    <span className="text-sm font-medium text-gray-400">Pontuação Total (IDG)</span>
                                    <span className="text-6xl font-bold text-cyan-300 my-2">
                                        <FormatNumero valor={dadosVisao.estado.IDG_Score} tipo="decimal" />
                                    </span>
                                    <span className="text-xs text-gray-500">(Máx 100)</span>
                                </div>
                                <div className="md:col-span-2">
                                    <GraficoIDG metricas={dadosVisao.estado.IDG_Metricas} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow"> 
                        <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2"> 
                            <span role="img" aria-label="Chart" className="mr-2">📈</span> Resultados (Rodada {rodadaSelecionada}) 
                        </h3> 
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6"> 
                            <RelatorioFinanceiro titulo="DRE (Demonstrativo)" dados={dadosDRE} /> 
                            <RelatorioFinanceiro titulo="Balanço Patrimonial" dados={dadosBalanco} isBalanco={true} /> 
                            
                            {/* ================================================================= */}
                            {/* MUDANÇA: Card de Operações e P&D */}
                            {/* ================================================================= */}
                            <div className="bg-gray-700 p-4 rounded-lg shadow"> 
                                <h4 className="font-semibold text-lg text-cyan-400 mb-3 border-b border-gray-600 pb-2">Operações e P&D</h4> 
                                <ul className="space-y-2 text-sm"> 
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Capacidade Total:</span> <span className="font-medium text-white"><FormatNumero valor={dadosVisao.estado.Capacidade_Fabrica} tipo="unidade" /> Unid.</span></li>
                                    
                                    <li className="pt-2 mt-2 border-t border-gray-600 flex justify-between items-center"><span className="text-gray-300">Produção {simulacao.Segmento1_Nome}:</span> <span className="font-medium text-white"><FormatNumero valor={dadosVisao.estado.Producao_Efetiva_S1} tipo="unidade" /> Unid.</span></li>
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Produção {simulacao.Segmento2_Nome}:</span> <span className="font-medium text-white"><FormatNumero valor={dadosVisao.estado.Producao_Efetiva_S2} tipo="unidade" /> Unid.</span></li>
                                    
                                    <li className="pt-2 mt-2 border-t border-gray-600 flex justify-between items-center"><span className="text-gray-300">Estoque {simulacao.Segmento1_Nome}:</span> <span className="font-medium text-white"><FormatNumero valor={dadosVisao.estado.Estoque_S1_Unidades} tipo="unidade" /> Unid.</span></li>
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Estoque {simulacao.Segmento2_Nome}:</span> <span className="font-medium text-white"><FormatNumero valor={dadosVisao.estado.Estoque_S2_Unidades} tipo="unidade" /> Unid.</span></li>
                                    
                                    <li className="pt-2 mt-2 border-t border-gray-600 flex justify-between items-center"><span className="text-gray-300">Nível Câmera:</span> <span className="font-semibold text-cyan-300">Nível {dadosVisao.estado.Nivel_PD_Camera || 1}</span></li> 
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Nível Bateria:</span> <span className="font-semibold text-cyan-300">Nível {dadosVisao.estado.Nivel_PD_Bateria || 1}</span></li> 
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Nível SO/IA:</span> <span className="font-semibold text-cyan-300">Nível {dadosVisao.estado.Nivel_PD_Sist_Operacional_e_IA || 1}</span></li> 
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Nível Atual. Geral:</span> <span className="font-semibold text-cyan-300">Nível {dadosVisao.estado.Nivel_PD_Atualizacao_Geral || 1}</span></li>
                                    
                                    <li className="pt-2 mt-2 border-t border-gray-600 flex justify-between items-center"><span className="text-gray-300">Nível Capacitação:</span> <span className="font-semibold text-cyan-300">Nível {dadosVisao.estado.Nivel_Capacitacao || 1}</span></li> 
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Nível Qualidade:</span> <span className="font-semibold text-cyan-300">Nível {dadosVisao.estado.Nivel_Qualidade || 1}</span></li> 
                                    <li className="flex justify-between items-center"><span className="text-gray-300">Nível ESG:</span> <span className="font-semibold text-cyan-300">Nível {dadosVisao.estado.Nivel_ESG || 1}</span></li> 
                                </ul> 
                                
                                {(dadosVisao.estado.Noticia_Producao_Risco_S1 || dadosVisao.estado.Noticia_Producao_Risco_S2 || dadosVisao.estado.Noticia_Ruptura_Estoque_S1 || dadosVisao.estado.Noticia_Ruptura_Estoque_S2 || dadosVisao.estado.Divida_Emergencia > 0) && ( 
                                    <div className="mt-4 pt-3 border-t border-gray-600"> 
                                        <h5 className="text-md font-semibold text-yellow-400 mb-2">Alertas da Rodada {rodadaSelecionada}:</h5> 
                                        <ul className="space-y-1 text-xs text-yellow-200 list-disc list-inside"> 
                                            {dadosVisao.estado.Noticia_Producao_Risco_S1 && <li>{dadosVisao.estado.Noticia_Producao_Risco_S1}</li>}
                                            {dadosVisao.estado.Noticia_Producao_Risco_S2 && <li>{dadosVisao.estado.Noticia_Producao_Risco_S2}</li>}
                                            {dadosVisao.estado.Noticia_Ruptura_Estoque_S1 && <li>{dadosVisao.estado.Noticia_Ruptura_Estoque_S1}</li>}
                                            {dadosVisao.estado.Noticia_Ruptura_Estoque_S2 && <li>{dadosVisao.estado.Noticia_Ruptura_Estoque_S2}</li>}
                                            {dadosVisao.estado.Divida_Emergencia > 0 && <li className="text-red-400 font-semibold">Empréstimo de Emergência contraído!</li>} 
                                        </ul> 
                                    </div> 
                                )} 
                            </div> 
                        </div> 
                    </div> 

                    {/* MUDANÇA: Passa 'simulacao' para o ResumoDecisoesRodada */}
                    {rodadaSelecionada > 0 && <ResumoDecisoesRodada decisoes={dadosVisao.decisoes} simulacao={simulacao} />}

                    <details className="bg-gray-800 p-4 md:p-6 rounded-lg shadow group"> 
                        <summary className="text-lg font-semibold text-cyan-400 cursor-pointer list-none flex justify-between items-center"> <span>Briefing Original</span> <span className="text-cyan-500 group-open:rotate-180 transition-transform duration-200">▼</span> </summary> 
                        <div className="mt-3 pt-3 border-t border-gray-700"> <p className="text-gray-300 text-sm whitespace-pre-wrap">{simulacao.Cenario_Inicial_Descricao || "-"}</p> </div> 
                    </details> 
                </>
            ) : (
                <p className="text-center text-yellow-400 py-10">Dados não encontrados para a Rodada {rodadaSelecionada}.</p>
            )}
        </div> 
    );
}

export default ResultadosBriefing;