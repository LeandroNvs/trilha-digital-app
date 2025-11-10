import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, appId } from '../firebase/config.js'; // Corrigido
import { doc, getDoc, collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

// --- Constantes e Ícones ---
const IconeVoltar = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const IconeCarregando = () => <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const IconeIA = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>;
const PIE_COLORS = ['#06B6D4', '#F59E0B', '#10B981', '#EF4444'];

// --- Componentes Auxiliares ---
const formatBRL = (num) => (Number(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const formatNum = (num) => (Number(num) || 0).toLocaleString('pt-BR');
const formatPerc = (num) => `${(Number(num || 0) * 100).toFixed(1)}%`;

// Componente Card para exibir dados
const DataCard = ({ titulo, valor, cor = 'text-white' }) => (
    <div className="bg-gray-700 p-4 rounded-lg shadow">
        <h4 className="text-sm font-medium text-gray-400 mb-1">{titulo}</h4>
        <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
    </div>
);

// Componente para DRE/Balanço
function RelatorioFinanceiro({ titulo, dados }) {
    const getRowStyle = (label) => {
        if (!label) return "";
        if (label.startsWith('(=)') || label.startsWith('Total')) {
            return "font-semibold border-t border-gray-600 pt-1";
        }
        if (label.startsWith('(-)') || label.startsWith('(+)')) {
            return "pl-2";
        }
        return "border-b border-gray-700 last:border-b-0";
    };
    return (
        <div className="bg-gray-700 p-4 rounded-lg shadow h-full">
            <h4 className="font-semibold text-lg text-cyan-400 mb-3 border-b border-gray-600 pb-2">{titulo}</h4>
            <div className="space-y-1 text-sm">
                {dados.map(([label, valor], index) => (
                    <div key={`${label}-${index}`} className={`flex justify-between items-center py-1 ${getRowStyle(label)}`}>
                        <span className="text-gray-300">{label ? label.replace(/^[(=)\-+ ]+|[ ]+$/g, '') : ''}:</span>
                        <span className={`font-medium ${Number(valor) < 0 ? 'text-red-400' : 'text-white'}`}>{formatBRL(valor)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- NOVO COMPONENTE: Tabela Comparativa Histórica ---
function TabelaComparativa({ data, loading, simulacao, rodadas }) {
    if (loading) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg shadow mt-8">
                <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">Análise Comparativa Histórica</h3>
                <div className="flex justify-center items-center h-40">
                    <IconeCarregando />
                    <span className="ml-3 text-gray-400">Buscando e processando dados de todas as rodadas...</span>
                </div>
            </div>
        );
    }
    if (!data || data.length === 0) return null;

    const renderHeader = () => (
        <thead className="bg-gray-700">
            <tr>
                <th className="sticky left-0 z-10 bg-gray-700 px-4 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">Métrica</th>
                {rodadas.map(r => (
                    <th key={`head-${r}`} className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Rodada {r}</th>
                ))}
            </tr>
        </thead>
    );

    const renderRow = (label, dataKey, formatFn = formatNum) => {
        const [titulo, sub] = label.split('|');
        return (
            <tr className="border-b border-gray-700 hover:bg-gray-700">
                <td className="sticky left-0 z-10 bg-gray-800 px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-300">
                    {titulo}
                    {sub && <span className="block text-xs text-gray-400">{sub}</span>}
                </td>
                {data.map(d => (
                    <td key={`${dataKey}-${d.round}`} className="px-4 py-2 whitespace-nowrap text-sm text-center text-white">
                        {formatFn(d[dataKey])}
                    </td>
                ))}
            </tr>
        );
    };
    
    const renderRowComparativa = (label, myKey, avgKey, formatFn = formatNum) => {
         const [titulo, sub] = label.split('|');
        return (
             <tr className="border-b border-gray-700 hover:bg-gray-700">
                <td className="sticky left-0 z-10 bg-gray-800 px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-300">
                    {titulo}
                    {sub && <span className="block text-xs text-gray-400">{sub}</span>}
                </td>
                {data.map(d => (
                    <td key={`${myKey}-${d.round}`} className="px-4 py-2 whitespace-nowrap text-sm text-center text-white">
                        <div className="flex flex-col items-center">
                            <span>{formatFn(d[myKey])}</span>
                            <span className="text-xs text-gray-400">(Média: {formatFn(d[avgKey])})</span>
                        </div>
                    </td>
                ))}
            </tr>
        );
    };

    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow mt-8">
            <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">Análise Comparativa Histórica</h3>
            <div className="overflow-x-auto max-h-[600px] relative">
                <table className="min-w-full divide-y divide-gray-600">
                    {renderHeader()}
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {renderRow("Custo Base Rede (Tela+Chip)|Decisão", 'custoBaseRede', formatBRL)}
                        {renderRow("Produção Efetiva|Resultado", 'qtdeProduzida', formatNum)}
                        {renderRow("Estoque Final|Resultado", 'totalEstoque', formatNum)}
                        
                        {/* Segmento Premium */}
                        <tr className="bg-gray-700"><td colSpan={rodadas.length + 1} className="px-4 py-2 text-sm font-semibold text-cyan-300">{simulacao.Segmento1_Nome || 'Premium'}</td></tr>
                        {renderRowComparativa(`Preço Venda (${simulacao.Segmento1_Nome})|Decisão`, 'meuPreco1', 'mediaPreco1', formatBRL)}
                        {renderRowComparativa(`Mkt (${simulacao.Segmento1_Nome})|Decisão`, 'meuMkt1', 'mediaMkt1', formatBRL)}
                        {renderRow(`Vendas (Unid.)|Resultado`, 'minhasVendas1', formatNum)}
                        {renderRow(`Market Share|Resultado`, 'meuShare1', formatPerc)}
                        
                        {/* Segmento Massa */}
                        <tr className="bg-gray-700"><td colSpan={rodadas.length + 1} className="px-4 py-2 text-sm font-semibold text-cyan-300">{simulacao.Segmento2_Nome || 'Massa'}</td></tr>
                        {renderRowComparativa(`Preço Venda (${simulacao.Segmento2_Nome})|Decisão`, 'meuPreco2', 'mediaPreco2', formatBRL)}
                        {renderRowComparativa(`Mkt (${simulacao.Segmento2_Nome})|Decisão`, 'meuMkt2', 'mediaMkt2', formatBRL)}
                        {renderRow(`Vendas (Unid.)|Resultado`, 'minhasVendas2', formatNum)}
                        {renderRow(`Market Share|Resultado`, 'meuShare2', formatPerc)}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


// --- Componente Principal ---
function SimuladorRelatorio() {
    const { simulacaoId } = useParams();
    const [simulacao, setSimulacao] = useState(null);
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    // Estados de seleção
    const [rodadaSel, setRodadaSel] = useState(null);
    const [empresaSel, setEmpresaSel] = useState(null);

    // Estados para dados exibidos (Visão Geral)
    const [estado, setEstado] = useState(null);
    const [decisoes, setDecisoes] = useState(null);
    const [loadingDados, setLoadingDados] = useState(false);

    // Estados para IA
    const [analiseIA, setAnaliseIA] = useState('');
    const [loadingIA, setLoadingIA] = useState(false);
    const [erroIA, setErroIA] = useState('');

    // --- NOVOS ESTADOS para Tabela Comparativa ---
    const [comparativoData, setComparativoData] = useState([]);
    const [loadingComparativo, setLoadingComparativo] = useState(false);
    // --- FIM NOVOS ESTADOS ---

    // 1. Busca dados iniciais (simulação e lista de empresas)
    useEffect(() => {
        const fetchSimInfo = async () => {
            if (!simulacaoId) return;
            setLoading(true);
            try {
                // Busca Simulação
                const simRef = doc(db, `/artifacts/${appId}/public/data/simulacoes`, simulacaoId);
                const simSnap = await getDoc(simRef);
                if (simSnap.exists()) {
                    const simData = simSnap.data();
                    setSimulacao(simData);
                    setRodadaSel(simData.Rodada_Atual || 1); // Default para última rodada
                } else {
                    throw new Error("Simulação não encontrada.");
                }

                // Busca Empresas
                const empresasCollectionPath = `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas`;
                const empresasQuery = query(collection(db, empresasCollectionPath));
                const empresasSnapshot = await getDocs(empresasQuery);
                if (empresasSnapshot.empty) throw new Error("Nenhuma empresa encontrada.");
                
                const listaEmpresas = empresasSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setEmpresas(listaEmpresas);
                setEmpresaSel(listaEmpresas[0]?.id); // Default para primeira empresa

            } catch (err) {
                console.error("Erro inicial:", err);
                setErro(err.message);
            }
            setLoading(false);
        };
        fetchSimInfo();
    }, [simulacaoId]);

    // 2. Busca dados da rodada/empresa selecionada (Visão Geral)
    useEffect(() => {
        if (!empresaSel || !rodadaSel) {
            setEstado(null);
            setDecisoes(null);
            return;
        }

        setLoadingDados(true);
        setAnaliseIA(''); // Limpa IA ao mudar seleção
        setErroIA('');
        
        const basePath = `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas/${empresaSel}`;
        
        const fetchDados = async () => {
            try {
                // Buscar Estado (Resultados)
                const estadoRef = doc(db, basePath, 'estados', rodadaSel.toString());
                const estadoSnap = await getDoc(estadoRef);
                if (estadoSnap.exists()) {
                    setEstado(estadoSnap.data());
                } else {
                    setEstado(null);
                    throw new Error(`Resultados (Estado) da Rodada ${rodadaSel} não encontrados.`);
                }
                
                // Buscar Decisões (O que causou)
                const decisoesRef = doc(db, basePath, 'decisoes', rodadaSel.toString());
                const decisoesSnap = await getDoc(decisoesRef);
                if (decisoesSnap.exists()) {
                    setDecisoes(decisoesSnap.data());
                } else {
                    setDecisoes(null);
                    // Não é um erro fatal, pode estar vendo R0
                    if(rodadaSel > 0) console.warn(`Decisões da Rodada ${rodadaSel} não encontradas.`);
                }

            } catch(err) {
                console.error("Erro ao buscar dados:", err);
                setErro(err.message);
                setEstado(null);
                setDecisoes(null);
            }
            setLoadingDados(false);
        };
        
        fetchDados();

    }, [simulacaoId, empresaSel, rodadaSel]);

    // --- NOVO: 3. Busca dados para Tabela Comparativa Histórica ---
    useEffect(() => {
        if (!simulacao || !empresaSel || empresas.length === 0) return;

        const fetchDataComparativa = async () => {
            setLoadingComparativo(true);
            const numRodadas = simulacao.Rodada_Atual || 0;
            if (numRodadas === 0) {
                setLoadingComparativo(false);
                setComparativoData([]);
                return;
            }

            const rodadas = Array.from({ length: numRodadas }, (_, i) => i + 1);
            const empresasIds = empresas.map(e => e.id);
            const outrosIds = empresasIds.filter(id => id !== empresaSel);
            const dataFinal = [];

            try {
                for (const r of rodadas) {
                    let promessasDecisoes = [];
                    let promessasEstados = [];
                    
                    empresasIds.forEach(id => {
                        const pDecisao = getDoc(doc(db, `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas/${id}/decisoes`, r.toString()));
                        const pEstado = getDoc(doc(db, `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas/${id}/estados`, r.toString()));
                        promessasDecisoes.push(pDecisao);
                        promessasEstados.push(pEstado);
                    });

                    const snapsDecisoes = await Promise.all(promessasDecisoes);
                    const snapsEstados = await Promise.all(promessasEstados);

                    const dadosDecisoes = snapsDecisoes.map((snap, i) => ({ id: empresasIds[i], data: snap.data() }));
                    const dadosEstados = snapsEstados.map((snap, i) => ({ id: empresasIds[i], data: snap.data() }));

                    // Separar "Minha" empresa
                    const decisaoMinha = dadosDecisoes.find(d => d.id === empresaSel)?.data;
                    const estadoMeu = dadosEstados.find(d => d.id === empresaSel)?.data;
                    
                    if (!decisaoMinha || !estadoMeu) continue; // Pula rodada se faltar dados

                    // Separar Concorrentes
                    const decisoesConcorrentes = dadosDecisoes.filter(d => d.id !== empresaSel && d.data);
                    const estadosConcorrentes = dadosEstados.filter(d => d.id !== empresaSel && d.data);

                    // Calcular Médias
                    const calcMedia = (arr, key) => {
                        if (arr.length === 0) return 0;
                        const total = arr.reduce((acc, curr) => acc + (curr.data[key] || 0), 0);
                        return total / arr.length;
                    };
                    
                    const mediaPreco1 = calcMedia(decisoesConcorrentes, 'Preco_Segmento_1');
                    const mediaMkt1 = calcMedia(decisoesConcorrentes, 'Marketing_Segmento_1');
                    const mediaPreco2 = calcMedia(decisoesConcorrentes, 'Preco_Segmento_2');
                    const mediaMkt2 = calcMedia(decisoesConcorrentes, 'Marketing_Segmento_2');

                    // Calcular Custo Rede
                    const custoTela = (decisaoMinha.Escolha_Fornecedor_Tela === 'A') ? (simulacao.Fornecedor_Tela_A_Custo || 0) : (simulacao.Fornecedor_Tela_B_Custo || 0);
                    const custoChip = (decisaoMinha.Escolha_Fornecedor_Chip === 'C') ? (simulacao.Fornecedor_Chip_C_Custo || 0) : (simulacao.Fornecedor_Chip_D_Custo || 0);
                    
                    // Montar objeto da rodada
                    dataFinal.push({
                        round: r,
                        custoBaseRede: custoTela + custoChip,
                        qtdeProduzida: estadoMeu.Producao_Efetiva || 0,
                        totalEstoque: estadoMeu.Estoque_Final_Unidades || 0,
                        
                        meuPreco1: decisaoMinha.Preco_Segmento_1 || 0,
                        mediaPreco1: mediaPreco1,
                        meuMkt1: decisaoMinha.Marketing_Segmento_1 || 0,
                        mediaMkt1: mediaMkt1,
                        minhasVendas1: estadoMeu.Vendas_Efetivas_Premium || 0,
                        meuShare1: estadoMeu.Market_Share_Premium || 0,

                        meuPreco2: decisaoMinha.Preco_Segmento_2 || 0,
                        mediaPreco2: mediaPreco2,
                        meuMkt2: decisaoMinha.Marketing_Segmento_2 || 0,
                        mediaMkt2: mediaMkt2,
                        minhasVendas2: estadoMeu.Vendas_Efetivas_Massa || 0,
                        meuShare2: estadoMeu.Market_Share_Massa || 0,
                    });
                }
                setComparativoData(dataFinal);
            } catch (err) {
                console.error("Erro ao buscar dados comparativos:", err);
                setErro("Falha ao carregar tabela comparativa.");
            }
            setLoadingComparativo(false);
        };

        fetchDataComparativa();
    }, [simulacao, empresaSel, empresas]);
    // --- FIM NOVO USEEFFECT ---


    // Opções de Rodadas
    const rodadasDisponiveis = useMemo(() => {
        if (!simulacao) return [];
        // Inclui Rodada 0 (Setup)
        return Array.from({ length: (simulacao.Rodada_Atual || 0) + 1 }, (_, i) => i); 
    }, [simulacao]);


    // --- GERAÇÃO DE ANÁLISE (IA) ---
    const handleGerarAnalise = async () => {
        if (!decisoes || !estado) {
            setErroIA("Dados insuficientes para análise.");
            return;
        }

        setLoadingIA(true);
        setAnaliseIA('');
        setErroIA('');

        // 1. Construir o Prompt
        const systemPrompt = `Você é um consultor de negócios e professor especialista em simulações de gestão (business games).
Seu objetivo é analisar os dados de UMA rodada de UMA empresa e explicar o desempenho dela.
Seja direto, técnico e use tópicos (bullet points).
Foque em explicar o "Porquê" do Lucro Líquido, conectando as "Decisões Tomadas" (como Preço, Marketing, P&D, Produção) com os "Resultados Obtidos" (Vendas, Custos, Market Share, Lucro).
Se o lucro for negativo, explique o que mais contribuiu para isso.
Se for positivo, explique o que impulsionou.
Termine com UMA sugestão principal para a próxima rodada.
Responda em português.`;

        // Simplifica os dados para a IA
        const dadosDecisoes = {
            Preco_Premium: decisoes.Preco_Segmento_1,
            Mkt_Premium: decisoes.Marketing_Segmento_1,
            Preco_Massa: decisoes.Preco_Segmento_2,
            Mkt_Massa: decisoes.Marketing_Segmento_2,
            Invest_PD_Total: (decisoes.Invest_PD_Camera || 0) + (decisoes.Invest_PD_Bateria || 0) + (decisoes.Invest_PD_IA || 0),
            Producao_Planejada: decisoes.Producao_Planejada,
            Invest_Expansao: decisoes.Invest_Expansao_Fabrica,
            Tomou_CP: decisoes.Tomar_Emprestimo_CP,
            Tomou_LP: decisoes.Tomar_Financiamento_LP,
        };
        
        const dadosResultados = {
            Lucro_Liquido_Rodada: estado.Lucro_Liquido,
            Lucro_Bruto: estado.Lucro_Bruto,
            Receita_Vendas: estado.Vendas_Receita,
            Vendas_Premium: estado.Vendas_Efetivas_Premium,
            Vendas_Massa: estado.Vendas_Efetivas_Massa,
            Market_Share_Premium: estado.Market_Share_Premium,
            Market_Share_Massa: estado.Market_Share_Massa,
            Custo_Produtos_Vendidos: estado.Custo_Produtos_Vendidos,
            Despesas_Operacionais: estado.Despesas_Operacionais_Outras, // Usando o campo correto do motor
            Despesas_Juros_Total: (estado.Despesas_Juros_CP || 0) + (estado.Despesas_Juros_Emergencia || 0) + (estado.Despesas_Juros_LP || 0),
            Caixa_Final: estado.Caixa,
            Estoque_Final_Unid: estado.Estoque_Final_Unidades,
            Alerta_Ruptura_Estoque: estado.Noticia_Ruptura_Estoque,
            Alerta_Emergencia: estado.Divida_Emergencia > 0
        };

        const userQuery = `Por favor, analise a Rodada ${rodadaSel} da empresa ${empresaSel}.
        Decisões Tomadas:
        ${JSON.stringify(dadosDecisoes, null, 2)}
        
        Resultados Obtidos:
        ${JSON.stringify(dadosResultados, null, 2)}
        `;

        // 2. Chamar a API (com retry e backoff)
        const apiKey = ""; // API Key é injetada pelo ambiente
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };

        let response;
        let retries = 3;
        let delay = 1000;

        while (retries > 0) {
            try {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        setAnaliseIA(text);
                        setLoadingIA(false);
                        return; // Sucesso
                    } else {
                        throw new Error("Resposta da IA inválida ou vazia.");
                    }
                } else if (response.status === 429) {
                    // Throttling
                    retries--;
                    if (retries === 0) throw new Error("Muitas requisições. Tente mais tarde.");
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff
                } else {
                    throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
                }
            } catch (err) {
                console.error("Erro na API Gemini:", err);
                if (retries === 1) {
                    setErroIA(err.message);
                    setLoadingIA(false);
                    return; // Falha final
                }
                retries--;
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
    };
    
    // --- Renderização ---
    if (loading) return <div className="text-center p-10 text-gray-400">Carregando...</div>;
    if (erro && !simulacao) return <div className="text-center p-10 text-red-400">{erro}</div>;

    // --- Dados para Gráficos e Relatórios (Visão Geral) ---
    const pieDataReceita = [
        { name: simulacao?.Segmento1_Nome || 'Premium', value: estado?.Vendas_Efetivas_Premium || 0 },
        { name: simulacao?.Segmento2_Nome || 'Massa', value: estado?.Vendas_Efetivas_Massa || 0 },
    ].filter(d => d.value > 0);

    const barDataCustos = [
        { name: 'CPV', Custo: estado?.Custo_Produtos_Vendidos || 0 },
        { name: 'Desp. Oper.', Custo: estado?.Despesas_Operacionais_Outras || 0 },
        { name: 'Juros', Custo: (estado?.Despesas_Juros_CP || 0) + (estado?.Despesas_Juros_Emergencia || 0) + (estado?.Despesas_Juros_LP || 0) },
    ];

    const dadosDRE = [
        ['(+) Receita de Vendas', estado?.Vendas_Receita],
        ['(-) Custo Produtos Vendidos (CPV)', estado?.Custo_Produtos_Vendidos],
        ['(=) Lucro Bruto', estado?.Lucro_Bruto],
        ['(-) Despesas Operacionais (Mkt, P&D, Fixo)', estado?.Despesas_Operacionais_Outras],
        ['(=) Lucro Operacional (EBIT)', estado?.Lucro_Operacional_EBIT],
        ['(-) Despesas Financeiras (Juros)', (estado?.Despesas_Juros_CP || 0) + (estado?.Despesas_Juros_Emergencia || 0) + (estado?.Despesas_Juros_LP || 0)],
        ['(=) Lucro Líquido (Rodada)', estado?.Lucro_Liquido],
    ];

    const dadosBalanco = [
        ['(+) Caixa', estado?.Caixa],
        ['(+) Estoque (Custo)', estado?.Custo_Estoque_Final],
        ['(+) Imobilizado (Líquido)', (estado?.Imobilizado_Bruto || 0) - (estado?.Depreciacao_Acumulada || 0)],
        ['(=) Total Ativos', (estado?.Caixa || 0) + (estado?.Custo_Estoque_Final || 0) + ((estado?.Imobilizado_Bruto || 0) - (estado?.Depreciacao_Acumulada || 0))],
        ['--- PASSIVOS E PL ---', null],
        ['(+) Dívida CP (Vence R+1)', estado?.Divida_CP],
        ['(+) Dívida Emergência (Vence R+1)', estado?.Divida_Emergencia],
        ['(+) Dívida LP (Saldo)', estado?.Divida_LP_Saldo],
        ['(+) Lucro Acumulado (PL)', estado?.Lucro_Acumulado],
    ];
    // --- Fim dos Dados (Visão Geral) ---


    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-6 md:p-8 animate-fade-in">
            {/* Cabeçalho e Navegação */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-400">Relatório por Empresa</h2>
                    <p className="text-gray-400">{simulacao?.Nome_Simulacao || '...'}</p>
                </div>
                <Link to="/simulador/admin" className="text-sm text-cyan-400 hover:underline flex items-center">
                    <IconeVoltar /> Voltar
                </Link>
            </div>

            {erro && <p className="text-red-400 bg-red-900 p-3 rounded-lg mb-4">{erro}</p>}

            {/* Seletores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label htmlFor="rodadaSelect" className="block text-sm font-medium text-gray-300 mb-1">Visão Geral (Rodada)</label>
                    <select id="rodadaSelect" value={rodadaSel || ''} onChange={(e) => setRodadaSel(Number(e.target.value))} className="w-full bg-gray-700 p-2 rounded-lg">
                        {rodadasDisponiveis.map(r => <option key={r} value={r}>Rodada {r} {r === 0 ? '(Setup)' : ''}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="empresaSelect" className="block text-sm font-medium text-gray-300 mb-1">Empresa</label>
                    <select id="empresaSelect" value={empresaSel || ''} onChange={(e) => setEmpresaSel(e.target.value)} className="w-full bg-gray-700 p-2 rounded-lg">
                        {empresas.map(e => <option key={e.id} value={e.id}>{e.Nome_Empresa || e.id}</option>)}
                    </select>
                </div>
            </div>

            {/* Conteúdo (Visão Geral) */}
            {loadingDados && <div className="text-center p-10"><IconeCarregando /></div>}
            
            {!loadingDados && estado && (
                <div className="space-y-6 animate-fade-in">
                    
                    {/* Alertas */}
                    <div className="space-y-2">
                        {estado.Noticia_Ruptura_Estoque && <div className="bg-yellow-800 border border-yellow-600 text-yellow-200 p-3 rounded-lg text-sm font-semibold">{estado.Noticia_Ruptura_Estoque}</div>}
                        {estado.Noticia_Producao_Risco && <div className="bg-yellow-800 border border-yellow-600 text-yellow-200 p-3 rounded-lg text-sm font-semibold">{estado.Noticia_Producao_Risco}</div>}
                        {estado.Divida_Emergencia > 0 && <div className="bg-red-800 border border-red-600 text-red-200 p-3 rounded-lg text-sm font-semibold">ALERTA: Empresa contraiu Dívida de Emergência nesta rodada!</div>}
                    </div>

                    {/* Botão de IA */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                        <button 
                            onClick={handleGerarAnalise}
                            disabled={loadingIA}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center disabled:opacity-50"
                        >
                            {loadingIA ? <IconeCarregando /> : <IconeIA />}
                            {loadingIA ? 'Analisando...' : 'Gerar Análise (IA) do Desempenho'}
                        </button>
                        {erroIA && <p className="text-red-400 text-xs mt-2 text-center">{erroIA}</p>}
                        {analiseIA && (
                            <div className="mt-4 p-4 bg-gray-800 rounded-md border border-gray-600">
                                <h4 className="font-semibold text-cyan-400 mb-2">Análise IA (Rodada {rodadaSel})</h4>
                                <div className="text-sm text-gray-300 whitespace-pre-wrap space-y-2" dangerouslySetInnerHTML={{ __html: analiseIA.replace(/\* (.*?)(?=\n\*|\n$|$)/g, '• $1<br/>') }} />
                            </div>
                        )}
                    </div>
                    
                    {/* Indicadores Chave */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <DataCard titulo="Lucro Líquido (Rodada)" valor={formatBRL(estado.Lucro_Liquido)} cor={estado.Lucro_Liquido < 0 ? 'text-red-400' : 'text-green-400'} />
                        <DataCard titulo="Receita Vendas" valor={formatBRL(estado.Vendas_Receita)} />
                        <DataCard titulo="Caixa Final" valor={formatBRL(estado.Caixa)} cor={estado.Caixa < 0 ? 'text-red-400' : 'text-white'} />
                        <DataCard titulo="IDG Score (Final)" valor={Number(estado.IDG_Score || 0).toFixed(1)} cor="text-cyan-300" />
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 bg-gray-700 p-4 rounded-lg shadow">
                            <h4 className="font-semibold text-lg text-cyan-400 mb-3">Vendas (Unid.) por Segmento</h4>
                            {pieDataReceita.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={pieDataReceita} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                                            {pieDataReceita.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatNum(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <p className="text-gray-500 text-center pt-10">Sem vendas</p>}
                        </div>
                         <div className="lg:col-span-2 bg-gray-700 p-4 rounded-lg shadow">
                            <h4 className="font-semibold text-lg text-cyan-400 mb-3">Composição de Custos/Despesas</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={barDataCustos} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                                    <XAxis type="number" stroke="#9CA3AF" tickFormatter={formatBRL} />
                                    <YAxis dataKey="name" type="category" stroke="#9CA3AF" />
                                    <Tooltip formatter={(value) => formatBRL(value)} />
                                    <Bar dataKey="Custo" fill="#EF4444" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    {/* DRE e Balanço */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <RelatorioFinanceiro titulo={`DRE (Rodada ${rodadaSel})`} dados={dadosDRE} />
                        <RelatorioFinanceiro titulo={`Balanço (Final R${rodadaSel})`} dados={dadosBalanco} />
                    </div>

                    {/* Decisões (se houver) */}
                    {decisoes && (
                        <details className="bg-gray-700 p-4 rounded-lg shadow group">
                             <summary className="text-lg font-semibold text-cyan-400 cursor-pointer list-none flex justify-between items-center">
                                <span>Decisões Tomadas (R{rodadaSel})</span>
                                <span className="text-cyan-500 group-open:rotate-180 transition-transform duration-200">▼</span>
                             </summary>
                             <div className="mt-4 pt-4 border-t border-gray-600 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <DataCard titulo="Preço Premium" valor={formatBRL(decisoes.Preco_Segmento_1)} />
                                <DataCard titulo="Mkt Premium" valor={formatBRL(decisoes.Marketing_Segmento_1)} />
                                <DataCard titulo="Preço Massa" valor={formatBRL(decisoes.Preco_Segmento_2)} />
                                <DataCard titulo="Mkt Massa" valor={formatBRL(decisoes.Marketing_Segmento_2)} />
                                <DataCard titulo="Produção (Unid.)" valor={formatNum(decisoes.Producao_Planejada)} />
                                <DataCard titulo="Invest. P&D" valor={formatBRL((decisoes.Invest_PD_Camera || 0) + (decisoes.Invest_PD_Bateria || 0) + (decisoes.Invest_PD_IA || 0))} />
                                <DataCard titulo="Invest. Expansão" valor={formatBRL(decisoes.Invest_Expansao_Fabrica)} />
                                <DataCard titulo="Tomou Empr. CP" valor={formatBRL(decisoes.Tomar_Emprestimo_CP)} />
                                <DataCard titulo="Tomou Empr. LP" valor={formatBRL(decisoes.Tomar_Financiamento_LP)} />
                             </div>
                        </details>
                    )}

                </div>
            )}

            {!loadingDados && !estado && (
                <div className="text-center text-gray-500 py-10">
                    <p>Nenhum dado encontrado para esta seleção.</p>
                </div>
            )}

            {/* --- NOVA SEÇÃO DA TABELA COMPARATIVA --- */}
            <TabelaComparativa
                data={comparativoData}
                loading={loadingComparativo}
                simulacao={simulacao}
                rodadas={Array.from({ length: simulacao?.Rodada_Atual || 0 }, (_, i) => i + 1)}
            />
        </div>
    );
}

export default SimuladorRelatorio;