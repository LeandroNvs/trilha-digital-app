import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, appId } from '../firebase/config.js'; // Corrigido
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';
// Importa o LineChart e seus componentes
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Componente para formatar números
const FormatNumero = ({ valor, tipo = 'decimal' }) => {
    const num = Number(valor) || 0;
    if (tipo === 'moeda') {
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    if (tipo === 'unidade') {
         return num.toLocaleString('pt-BR');
    }
     // NOVO: Formato Percentual
    if (tipo === 'percentual') {
         return `${(num * 100).toFixed(1)}%`;
    }
    return num.toFixed(1);
};

// Paleta de cores para o gráfico
// ... (código existente) ...
const CHART_COLORS = [
    '#06B6D4', // Cyan
// ... (código existente) ...
    '#65A30D', // Lime
];


function SimuladorRanking() {
// ... (código existente) ...
    const { simulacaoId } = useParams();
    const [simulacao, setSimulacao] = useState(null);
    const [loading, setLoading] = useState(true);
// ... (código existente) ...
    const [erro, setErro] = useState('');
    
    // O 'rodadaSelecionada' agora pode ser um número (ex: 3) ou a string "evolucao"
    const [rodadaSelecionada, setRodadaSelecionada] = useState(null);
// ... (código existente) ...

    // Dados para a Tabela (quando uma rodada é selecionada)
    const [rankingData, setRankingData] = useState([]);
    // Dados para o Gráfico (quando "Evolução" é selecionada)
// ... (código existente) ...
    const [chartData, setChartData] = useState([]);
    const [empresaNomes, setEmpresaNomes] = useState([]);


// ... (código existente) ...
    // 1. Busca os dados da simulação (nome, rodada atual)
    useEffect(() => {
        const fetchSimInfo = async () => {
// ... (código existente) ...
            if (!simulacaoId) return;
            setLoading(true);
            try {
// ... (código existente) ...
                const simRef = doc(db, `/artifacts/${appId}/public/data/simulacoes`, simulacaoId);
                const simSnap = await getDoc(simRef);
                if (simSnap.exists()) {
                    const simData = simSnap.data();
// ... (código existente) ...
                    setSimulacao(simData);
                    // Define o default para a ÚLTIMA rodada processada
                    setRodadaSelecionada(simData.Rodada_Atual); 
// ... (código existente) ...
                } else {
                    setErro("Simulação não encontrada.");
                }
// ... (código existente) ...
            } catch (err) {
                console.error("Erro ao buscar simulação:", err);
                setErro("Falha ao carregar dados da simulação.");
// ... (código existente) ...
            }
            // O loading só termina após a busca de dados (ranking ou chart)
        };
// ... (código existente) ...
        fetchSimInfo();
    }, [simulacaoId]);


// ... (código existente) ...
    // Gera as opções para o <select>, agora com "Evolução"
    const rodadasDisponiveis = useMemo(() => {
        if (!simulacao || simulacao.Rodada_Atual === 0) return [];
// ... (código existente) ...
        const rodadas = Array.from({ length: simulacao.Rodada_Atual }, (_, i) => i + 1);
        // Adiciona a nova opção no final
        rodadas.push('evolucao'); 
// ... (código existente) ...
        return rodadas;
    }, [simulacao]);


// ... (código existente) ...
    // 2. Busca os dados (Tabela ou Gráfico) baseado na seleção
    useEffect(() => {
        if (!simulacao || !rodadaSelecionada) {
// ... (código existente) ...
            setLoading(false); // Garante que o loading pare se não houver nada a buscar
            return;
        }

// ... (código existente) ...
        const empresasCollectionPath = `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas`;

        // --- FUNÇÃO PARA BUSCAR DADOS DO RANKING (TABELA) ---
        const fetchRankingData = async (rodada) => {
// ... (código existente) ...
            setLoading(true);
            setChartData([]); // Limpa dados do gráfico
            try {
// ... (código existente) ...
                const empresasQuery = query(collection(db, empresasCollectionPath));
                const empresasSnapshot = await getDocs(empresasQuery);
                if (empresasSnapshot.empty) throw new Error("Nenhuma empresa encontrada.");

// ... (código existente) ...
                const promises = empresasSnapshot.docs.map(empresaDoc => {
                    const empresaData = empresaDoc.data();
                    const estadoRef = doc(db, empresasCollectionPath, empresaDoc.id, 'estados', rodada.toString());
// ... (código existente) ...
                    return getDoc(estadoRef).then(estadoSnap => {
                        if (estadoSnap.exists()) {
                            const estadoData = estadoSnap.data();
// ... (código existente) ...
                            return {
                                id: empresaDoc.id,
                                nome: empresaData.Nome_Empresa || empresaDoc.id,
// ... (código existente) ...
                                IDG_Score: estadoData.IDG_Score || 0,
                                Lucro_Acumulado: estadoData.Lucro_Acumulado || 0,
                                Vendas_Totais: (estadoData.Vendas_Efetivas_Premium || 0) + (estadoData.Vendas_Efetivas_Massa || 0),
// ... (código existente) ...
                                Valor_Marca: estadoData.Valor_Marca_Acumulado || 0,
                                // CAMPOS ADICIONADOS
                                Market_Share_Premium: estadoData.Market_Share_Premium || 0,
                                Market_Share_Massa: estadoData.Market_Share_Massa || 0,
                            };
                        }
// ... (código existente) ...
                        return null;
                    });
                });
// ... (código existente) ...
                const results = await Promise.all(promises);
                const dadosEmpresas = results.filter(Boolean);
                const dadosOrdenados = dadosEmpresas.sort((a, b) => b.IDG_Score - a.IDG_Score);
// ... (código existente) ...
                setRankingData(dadosOrdenados);
            } catch (err) {
                console.error("Erro ao buscar dados do ranking:", err);
// ... (código existente) ...
                setErro("Falha ao carregar o ranking. Verifique o console.");
            }
            setLoading(false);
// ... (código existente) ...
        };

        // --- FUNÇÃO PARA BUSCAR DADOS DE EVOLUÇÃO (GRÁFICO) ---
        const fetchChartData = async () => {
// ... (código existente) ...
            setLoading(true);
            setRankingData([]); // Limpa dados da tabela
            try {
// ... (código existente) ...
                const empresasQuery = query(collection(db, empresasCollectionPath));
                const empresasSnapshot = await getDocs(empresasQuery);
                if (empresasSnapshot.empty) throw new Error("Nenhuma empresa encontrada.");

// ... (código existente) ...
                const rodadas = Array.from({ length: simulacao.Rodada_Atual }, (_, i) => i + 1);
                const promises = [];
                const nomes = [];
// ... (código existente) ...
                
                // Loop para montar o array de promessas (busca todos os estados de todas as empresas)
                empresasSnapshot.docs.forEach(empresaDoc => {
                    const empresaNome = empresaDoc.data().Nome_Empresa || empresaDoc.id;
// ... (código existente) ...
                    nomes.push(empresaNome);
                    rodadas.forEach(r => {
                        const estadoRef = doc(db, empresasCollectionPath, empresaDoc.id, 'estados', r.toString());
// ... (código existente) ...
                        promises.push(getDoc(estadoRef).then(snap => ({ snap, empresaNome, rodada: r })));
                    });
                });
// ... (código existente) ...

                const results = await Promise.all(promises);
                
                // Processa os resultados para o formato do gráfico
// ... (código existente) ...
                const dataByRound = {}; // Ex: { 1: { name: 'R1', Alpha: 50 }, 2: { name: 'R2', Alpha: 60 } }
                results.forEach(result => {
                    if (result.snap.exists()) {
// ... (código existente) ...
                        const estado = result.snap.data();
                        const r = result.rodada;
                        if (!dataByRound[r]) {
                            dataByRound[r] = { name: `R${r}` }; // 'name' é usado pelo XAxis do recharts
// ... (código existente) ...
                        }
                        dataByRound[r][result.empresaNome] = estado.IDG_Score || 0;
                    }
// ... (código existente) ...
                });
                
                setEmpresaNomes(nomes);
                setChartData(Object.values(dataByRound).sort((a, b) => a.name.substring(1) - b.name.substring(1)));
// ... (código existente) ...
            } catch (err) {
                console.error("Erro ao buscar dados do gráfico:", err);
                setErro("Falha ao carregar a evolução. Verifique o console.");
// ... (código existente) ...
            }
            setLoading(false);
        };
// ... (código existente) ...

        // --- Decide qual função de busca chamar ---
        if (rodadaSelecionada === 'evolucao') {
            fetchChartData();
// ... (código existente) ...
        } else if (typeof rodadaSelecionada === 'number') {
            fetchRankingData(rodadaSelecionada);
        }

// ... (código existente) ...
    }, [simulacao, rodadaSelecionada, simulacaoId]); // Gatilho principal


    return (
// ... (código existente) ...
        <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
// ... (código existente) ...
                    <h2 className="text-2xl font-bold text-cyan-400">Ranking da Simulação</h2>
                    <p className="text-gray-400">{simulacao?.Nome_Simulacao || 'Carregando...'}</p>
                </div>
// ... (código existente) ...
                <Link to="/simulador/admin" className="text-sm text-cyan-400 hover:underline">
                    &larr; Voltar
                </Link>
// ... (código existente) ...
            </div>

            {erro && <p className="text-red-400 bg-red-900 p-3 rounded-lg mb-4">{erro}</p>}

            <div className="mb-6 max-w-xs">
// ... (código existente) ...
                <label htmlFor="rodadaSelect" className="block text-sm font-medium text-gray-300 mb-1">
                    Ver Ranking:
                </label>
// ... (código existente) ...
                <select
                    id="rodadaSelect"
                    value={rodadaSelecionada || ''}
                    onChange={(e) => setRodadaSelecionada(e.target.value === 'evolucao' ? 'evolucao' : Number(e.target.value))}
// ... (código existente) ...
                    disabled={loading || !simulacao || simulacao.Rodada_Atual === 0}
                    className="w-full bg-gray-700 p-2 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                >
// ... (código existente) ...
                    {rodadasDisponiveis.length === 0 && <option value="">Nenhum ranking disponível</option>}
                    {rodadasDisponiveis.map(r => (
                        r === 'evolucao' ? (
// ... (código existente) ...
                            <option key="evolucao" value="evolucao">Evolução (Acumulado)</option>
                        ) : (
                            <option key={r} value={r}>Rodada {r}</option>
// ... (código existente) ...
                        )
                    ))}
                </select>
// ... (código existente) ...
            </div>

            {loading && <p className="text-center text-gray-400 py-10">Carregando dados...</p>}

            {/* --- Renderização da Tabela (Ranking da Rodada) --- */}
            {!loading && rodadaSelecionada !== 'evolucao' && rankingData.length > 0 && (
                <div className="overflow-x-auto animate-fade-in">
                    <table className="w-full text-left">
                        <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                            <tr>
                                <th className="px-6 py-3 text-center">Pos.</th>
                                <th className="px-6 py-3">Empresa</th>
                                <th className="px-6 py-3 text-right">IDG Score</th>
                                <th className="px-6 py-3 text-right">Lucro Acumulado</th>
                                <th className="px-6 py-3 text-right">Vendas Totais (Unid.)</th>
                                <th className="px-6 py-3 text-right">Valor da Marca</th>
                                {/* COLUNAS ADICIONADAS */}
                                <th className="px-6 py-3 text-right">MKS {simulacao?.Segmento1_Nome || 'Premium'}</th>
                                <th className="px-6 py-3 text-right">MKS {simulacao?.Segmento2_Nome || 'Massa'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankingData.map((empresa, index) => (
                                <tr key={empresa.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                                    <td className="px-6 py-4 text-center font-bold text-lg">
                                        {index === 0 ? '🏆' : (index + 1)}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white">{empresa.nome}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-cyan-300">
                                        <FormatNumero valor={empresa.IDG_Score} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <FormatNumero valor={empresa.Lucro_Acumulado} tipo="moeda" />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <FormatNumero valor={empresa.Vendas_Totais} tipo="unidade" />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <FormatNumero valor={empresa.Valor_Marca} tipo="moeda" />
                                    </td>
                                     {/* CÉLULAS ADICIONADAS */}
                                    <td className="px-6 py-4 text-right">
                                        <FormatNumero valor={empresa.Market_Share_Premium} tipo="percentual" />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <FormatNumero valor={empresa.Market_Share_Massa} tipo="percentual" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* --- Renderização do Gráfico (Evolução) --- */}
// ... (código existente) ...
            {!loading && rodadaSelecionada === 'evolucao' && chartData.length > 0 && (
                <div className="mt-8 animate-fade-in">
                    <h3 className="text-xl font-semibold text-gray-200 mb-4">Evolução do IDG Score por Rodada</h3>
// ... (código existente) ...
                    <div className="w-full h-96 bg-gray-700 p-4 rounded-lg">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
// ... (código existente) ...
                                data={chartData}
                                margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                            >
// ... (código existente) ...
                                <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                                <XAxis dataKey="name" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" />
// ... (código existente) ...
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                    labelStyle={{ color: '#E5E7EB', fontWeight: 'bold' }}
// ... (código existente) ...
                                />
                                <Legend wrapperStyle={{ color: '#E5E7EB' }} />
                                {empresaNomes.map((nome, index) => (
// ... (código existente) ...
                                    <Line
                                        key={nome}
                                        type="monotone"
// ... (código existente) ...
                                        dataKey={nome}
                                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                                        strokeWidth={3}
// ... (código existente) ...
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
// ... (código existente) ...
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
// ... (código existente) ...
                    </div>
                </div>
            )}

            {/* --- Mensagens de "Vazio" --- */}
// ... (código existente) ...
            {!loading && rankingData.length === 0 && rodadaSelecionada !== 'evolucao' && rodadaSelecionada > 0 && (
                <p className="text-center text-gray-500 py-10">Nenhum dado encontrado para a Rodada {rodadaSelecionada}.</p>
            )}
// ... (código existente) ...
            {!loading && chartData.length === 0 && rodadaSelecionada === 'evolucao' && simulacao && simulacao.Rodada_Atual > 0 && (
                 <p className="text-center text-gray-500 py-10">Nenhum dado encontrado para gerar o gráfico de evolução.</p>
            )}
        </div>
// ... (código existente) ...
    );
}

export default SimuladorRanking;