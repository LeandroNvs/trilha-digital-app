import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, appId } from '../firebase/config.js'; // Corrigido
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';

// --- Ícones ---
const IconeVoltar = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const IconeCarregando = () => <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

// --- Componentes Auxiliares ---
const formatNum = (num) => (Number(num) || 0).toLocaleString('pt-BR');
const formatPerc = (num) => `${(Number(num || 0) * 100).toFixed(1)}%`;

function SimuladorAnalyticsVendas() {
    const { simulacaoId } = useParams();
    const [simulacao, setSimulacao] = useState(null);
    const [empresas, setEmpresas] = useState([]);
    const [analyticsData, setAnalyticsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    // Nomes dos segmentos
    const seg1Nome = useMemo(() => simulacao?.Segmento1_Nome || 'Premium', [simulacao]);
    const seg2Nome = useMemo(() => simulacao?.Segmento2_Nome || 'Base', [simulacao]);
    const rodadas = useMemo(() => {
        const rodadaAtual = simulacao?.Rodada_Atual || 0;
        if (rodadaAtual === 0) return [];
        return Array.from({ length: rodadaAtual }, (_, i) => i + 1);
    }, [simulacao]);

    useEffect(() => {
        const fetchData = async () => {
            if (!simulacaoId) {
                setErro("ID da simulação não fornecido.");
                setLoading(false);
                return;
            }
            setLoading(true);
            setErro('');
            try {
                // 1. Buscar dados da Simulação
                const simRef = doc(db, `/artifacts/${appId}/public/data/simulacoes`, simulacaoId);
                const simSnap = await getDoc(simRef);
                if (!simSnap.exists()) throw new Error("Simulação não encontrada.");
                const simData = simSnap.data();
                setSimulacao(simData);

                const rodadaAtual = simData.Rodada_Atual || 0;
                if (rodadaAtual === 0) {
                    setLoading(false);
                    return; // Sem dados para processar
                }
                const rodadasParaBuscar = Array.from({ length: rodadaAtual }, (_, i) => i + 1);
                
                // 2. Buscar Empresas
                const empresasCollectionPath = `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas`;
                const empresasQuery = query(collection(db, empresasCollectionPath));
                const empresasSnapshot = await getDocs(empresasQuery);
                if (empresasSnapshot.empty) throw new Error("Nenhuma empresa encontrada.");
                
                const listaEmpresas = empresasSnapshot.docs.map(doc => ({
                    id: doc.id,
                    nome: doc.data().Nome_Empresa || doc.id
                }));
                setEmpresas(listaEmpresas);

                // 3. Buscar todos os 'estados' de todas as empresas
                const promessas = [];
                listaEmpresas.forEach(empresa => {
                    rodadasParaBuscar.forEach(rodada => {
                        const estadoRef = doc(db, empresasCollectionPath, empresa.id, 'estados', rodada.toString());
                        promessas.push(getDoc(estadoRef).then(snap => ({
                            empresaId: empresa.id,
                            rodada: rodada,
                            estado: snap.data()
                        })));
                    });
                });
                
                const results = await Promise.all(promessas);
                
                // 4. Processar e "Pivotar" os dados
                const dataByEmpresa = {};
                listaEmpresas.forEach(e => {
                    dataByEmpresa[e.id] = { nome: e.nome };
                });

                results.forEach(res => {
                    if (res.estado) {
                        const eId = res.empresaId;
                        const r = res.rodada;
                        dataByEmpresa[eId][`r${r}_vendas_p`] = res.estado.Vendas_Efetivas_Premium || 0;
                        dataByEmpresa[eId][`r${r}_mks_p`] = res.estado.Market_Share_Premium || 0;
                        dataByEmpresa[eId][`r${r}_vendas_m`] = res.estado.Vendas_Efetivas_Massa || 0;
                        dataByEmpresa[eId][`r${r}_mks_m`] = res.estado.Market_Share_Massa || 0;
                    } else {
                        // Preenche com 0 se o estado não existir
                        const eId = res.empresaId;
                        const r = res.rodada;
                        dataByEmpresa[eId][`r${r}_vendas_p`] = 0;
                        dataByEmpresa[eId][`r${r}_mks_p`] = 0;
                        dataByEmpresa[eId][`r${r}_vendas_m`] = 0;
                        dataByEmpresa[eId][`r${r}_mks_m`] = 0;
                    }
                });
                
                setAnalyticsData(Object.values(dataByEmpresa));
                
            } catch (err) {
                console.error("Erro ao buscar dados de analytics:", err);
                setErro(err.message);
            }
            setLoading(false);
        };
        fetchData();
    }, [simulacaoId]);
    
    if (loading) return (
        <div className="flex justify-center items-center h-60">
            <IconeCarregando />
            <span className="ml-3 text-gray-400">Carregando dados...</span>
        </div>
    );
    
    if (erro) return <p className="text-red-400 bg-red-900 p-4 rounded-lg m-8">Erro: {erro}</p>;

    if (rodadas.length === 0) return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-6 md:p-8 animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-cyan-400">Analytics de Vendas</h2>
                <Link to="/simulador/admin" className="text-sm text-cyan-400 hover:underline flex items-center">
                    <IconeVoltar /> Voltar
                </Link>
            </div>
            <p className="text-gray-500 text-center py-10">Nenhuma rodada processada ainda para exibir dados.</p>
        </div>
    );

    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-6 md:p-8 animate-fade-in">
            {/* Cabeçalho */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-400">Analytics de Vendas</h2>
                    <p className="text-gray-400">{simulacao?.Nome_Simulacao || '...'}</p>
                </div>
                <Link to="/simulador/admin" className="text-sm text-cyan-400 hover:underline flex items-center">
                    <IconeVoltar /> Voltar
                </Link>
            </div>
            
            {/* Tabela de Dados */}
            <div className="overflow-x-auto relative shadow-md rounded-lg">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                        {/* Linha 1: Rodadas */}
                        <tr>
                            <th scope="col" rowSpan="2" className="sticky left-0 z-10 bg-gray-700 px-6 py-3 border-r border-gray-600">
                                Empresa
                            </th>
                            {rodadas.map(r => (
                                <th key={`head-r${r}`} scope="colgroup" colSpan="4" className="px-6 py-3 text-center border-l border-gray-600">
                                    Rodada {r}
                                </th>
                            ))}
                        </tr>
                        {/* Linha 2: Métricas */}
                        <tr>
                            {rodadas.map(r => (
                                <React.Fragment key={`subhead-r${r}`}>
                                    <th scope="col" className="px-4 py-2 text-center border-l border-gray-600">{seg1Nome} (Unid.)</th>
                                    <th scope="col" className="px-4 py-2 text-center">{seg1Nome} (MKS)</th>
                                    <th scope="col" className="px-4 py-2 text-center">{seg2Nome} (Unid.)</th>
                                    <th scope="col" className="px-4 py-2 text-center">{seg2Nome} (MKS)</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {analyticsData.map((empresa) => (
                            <tr key={empresa.nome} className="bg-gray-800 hover:bg-gray-700">
                                <th scope="row" className="sticky left-0 z-10 bg-gray-800 px-6 py-4 font-medium text-white whitespace-nowrap border-r border-gray-600">
                                    {empresa.nome}
                                </th>
                                {rodadas.map(r => (
                                    <React.Fragment key={`${empresa.nome}-r${r}`}>
                                        <td className="px-4 py-4 text-center border-l border-gray-600">
                                            {formatNum(empresa[`r${r}_vendas_p`])}
                                        </td>
                                        <td className="px-4 py-4 text-center font-medium text-cyan-300">
                                            {formatPerc(empresa[`r${r}_mks_p`])}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {formatNum(empresa[`r${r}_vendas_m`])}
                                        </td>
                                        <td className="px-4 py-4 text-center font-medium text-cyan-300">
                                            {formatPerc(empresa[`r${r}_mks_m`])}
                                        </td>
                                    </React.Fragment>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default SimuladorAnalyticsVendas;