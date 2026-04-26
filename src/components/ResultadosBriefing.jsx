import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, appId } from '../firebase/config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import JornalNoticias from './JornalNoticias';

// --- CONFIGURAÇÃO DAS ESTRATÉGIAS ---
const STRATEGY_CONFIG = {
    'rentabilidade': {
        label: 'Rentabilidade Máxima',
        kpis: ['lucro', 'saude'],
        desc: 'Sua prioridade é gerar caixa e lucro, mesmo que custe market share.',
        dicas: ['Monitore a margem de contribuição (Preço vs Custo).', 'Evite estoques parados (dinheiro travado).', 'Cuidado com juros excessivos de curto prazo.']
    },
    'mercado': {
        label: 'Expansão de Mercado',
        kpis: ['share'],
        desc: 'Sua prioridade é conquistar território e volume de vendas.',
        dicas: ['Preço agressivo ajuda no curto prazo.', 'Marketing tem efeito cumulativo limitado, dose bem.', 'Garanta capacidade produtiva para não ter ruptura.']
    },
    'inovacao': {
        label: 'Inovação e Sustentabilidade',
        kpis: ['pd', 'org'],
        desc: 'Sua prioridade é ter o melhor produto e a melhor empresa.',
        dicas: ['P&D demora uma rodada para fazer efeito, planeje antes.', 'Não negligencie o ESG, ele compõe sua nota final.', 'Marketing Institucional fortalece sua marca a longo prazo.']
    }
};

// --- Componentes Auxiliares ---

function FormatNumero({ valor, tipo = 'decimal', comCor = false }) {
    const num = Number(valor);
    if (isNaN(num)) return '-';
    let options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    if (tipo === 'moeda') { options.style = 'currency'; options.currency = 'BRL'; }
    else if (tipo === 'unidade') { options.minimumFractionDigits = 0; options.maximumFractionDigits = 0; }
    else if (tipo === 'percent') { options.style = 'percent'; }
    const valorFormatado = num.toLocaleString('pt-BR', options);
    if (comCor) {
        const cor = num < 0 ? 'text-red-400' : (num > 0 ? 'text-green-400' : 'text-gray-400');
        return <span className={cor}>{valorFormatado}</span>;
    }
    return valorFormatado;
}

function RelatorioFinanceiro({ titulo, dados, isBalanco = false }) {
    const getRowStyle = (label) => {
        if (!label) return "";
        if (label.startsWith('(=)') || label.startsWith('Total') || label.startsWith('Subtotal')) return "font-semibold border-t border-gray-600 pt-1";
        if (label.startsWith('---')) return "font-semibold text-cyan-400 text-xs pt-2 tracking-wider";
        if (label.startsWith('(-)') || label.startsWith('(+)')) return "pl-2";
        return "border-b border-gray-600 last:border-b-0";
    };
    return (
        <div className="bg-gray-700 p-4 rounded-lg shadow h-full">
            <h4 className="font-semibold text-lg text-cyan-400 mb-3 border-b border-gray-600 pb-2">{titulo}</h4>
            <div className="space-y-1 text-sm">
                {dados.map(([label, valor], index) => {
                    if (label && label.startsWith('---')) return <div key={`${label}-${index}`} className={`flex justify-between items-center py-1 ${getRowStyle(label)}`}><span className="text-gray-300">{label.replace(/[- ]/g, '')}:</span></div>
                    return (
                        <div key={`${label}-${index}`} className={`flex justify-between items-center py-1 ${getRowStyle(label)}`}>
                            <span className="text-gray-300">{label ? label.replace(/^[(=)\-+ ]+|[ ]+$/g, '') : ''}:</span>
                            <span className="font-medium"><FormatNumero valor={valor} tipo="moeda" comCor={true} /></span>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

// --- NOVO: Componente Comparativo de Mercado ---
function ComparativoMercado({ meuEstado, todosEstados }) {
    const stats = useMemo(() => {
        if (!todosEstados || todosEstados.length === 0 || !meuEstado) return null;

        // 1. Ranking IDG
        const sortedByIDG = [...todosEstados].sort((a, b) => b.IDG_Score - a.IDG_Score);
        const minhaPosicao = sortedByIDG.findIndex(e => e.id === meuEstado.id) + 1;
        const totalEmpresas = todosEstados.length;
        const melhorIDG = sortedByIDG[0].IDG_Score;
        const mediaIDG = todosEstados.reduce((acc, e) => acc + (e.IDG_Score || 0), 0) / totalEmpresas;

        // 2. Comparativo Radar (Normalizado 0-100 para visualização)
        // Precisamos normalizar valores muito diferentes (Ex: Lucro em Milhões vs Share em %)
        const getMax = (key) => Math.max(...todosEstados.map(e => e[key] || 0)) || 1;
        
        const maxLucro = getMax('Lucro_Acumulado');
        const maxShare = Math.max(...todosEstados.map(e => (e.Market_Share_Premium + e.Market_Share_Massa)/2 || 0)) || 0.01;
        const maxPD = Math.max(...todosEstados.map(e => (e.Nivel_PD_Camera + e.Nivel_PD_Bateria + e.Nivel_PD_Sist_Operacional_e_IA) || 0)) || 1;

        // Dados Médios
        const avgLucro = todosEstados.reduce((acc, e) => acc + (e.Lucro_Acumulado || 0), 0) / totalEmpresas;
        const avgShare = todosEstados.reduce((acc, e) => acc + ((e.Market_Share_Premium + e.Market_Share_Massa)/2 || 0), 0) / totalEmpresas;
        const avgPD = todosEstados.reduce((acc, e) => acc + ((e.Nivel_PD_Camera + e.Nivel_PD_Bateria + e.Nivel_PD_Sist_Operacional_e_IA) || 0), 0) / totalEmpresas;

        const dataRadar = [
            { subject: 'IDG Score', A: meuEstado.IDG_Score, B: mediaIDG, fullMark: 100 },
            { subject: 'Lucro', A: (meuEstado.Lucro_Acumulado / maxLucro) * 100, B: (avgLucro / maxLucro) * 100, fullMark: 100 },
            { subject: 'Mkt Share', A: (((meuEstado.Market_Share_Premium + meuEstado.Market_Share_Massa)/2) / maxShare) * 100, B: (avgShare / maxShare) * 100, fullMark: 100 },
            { subject: 'Tecnologia', A: ((meuEstado.Nivel_PD_Camera + meuEstado.Nivel_PD_Bateria + meuEstado.Nivel_PD_Sist_Operacional_e_IA) / maxPD) * 100, B: (avgPD / maxPD) * 100, fullMark: 100 },
        ];

        const dataBarrasIDG = [
            { name: 'Você', valor: meuEstado.IDG_Score, fill: '#06B6D4' }, // Cyan
            { name: 'Média', valor: mediaIDG, fill: '#9CA3AF' }, // Gray
            { name: 'Líder', valor: melhorIDG, fill: '#FBBF24' }, // Gold
        ];

        return { minhaPosicao, totalEmpresas, dataRadar, dataBarrasIDG };
    }, [meuEstado, todosEstados]);

    if (!stats) return null;

    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow mt-6 border-l-4 border-blue-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                        📊 Comparativo de Mercado
                    </h3>
                    <p className="text-sm text-gray-400">Como sua empresa está em relação aos concorrentes</p>
                </div>
                <div className="mt-2 md:mt-0 bg-blue-900/30 px-4 py-2 rounded-lg text-center">
                    <span className="block text-xs text-blue-200 uppercase tracking-wider">Sua Posição</span>
                    <span className="text-2xl font-bold text-white">{stats.minhaPosicao}º <span className="text-sm font-normal text-gray-400">/ {stats.totalEmpresas}</span></span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gráfico 1: Barras IDG */}
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-300 mb-4 text-center">Score IDG: Você vs. Mercado</h4>
                    <div className="h-48 w-full">
                        <ResponsiveContainer>
                            <BarChart data={stats.dataBarrasIDG} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#cbd5e1" width={60} tick={{fontSize: 12}} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} cursor={{fill: 'transparent'}} />
                                <Bar dataKey="valor" barSize={20} radius={[0, 4, 4, 0]}>
                                    {stats.dataBarrasIDG.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico 2: Radar Competitivo */}
                <div className="bg-gray-900/50 p-4 rounded-lg flex flex-col items-center">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 text-center">Radar de Competitividade (Relativo)</h4>
                    <div className="h-56 w-full">
                        <ResponsiveContainer>
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.dataRadar}>
                                <PolarGrid stroke="#4a5568" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Você" dataKey="A" stroke="#06B6D4" strokeWidth={2} fill="#06B6D4" fillOpacity={0.4} />
                                <Radar name="Média Mercado" dataKey="B" stroke="#9CA3AF" strokeWidth={2} fill="#9CA3AF" fillOpacity={0.1} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnaliseEstrategia({ metricas }) {
    if (!metricas || !metricas.estrategia) return null;
    const config = STRATEGY_CONFIG[metricas.estrategia] || STRATEGY_CONFIG['rentabilidade'];
    const LABELS = { lucro: 'Lucro Acumulado', saude: 'Saúde Financeira', share: 'Market Share', pd: 'Tecnologia (P&D)', org: 'Org. & ESG' };

    return (
        <div className="bg-gray-700 p-4 md:p-6 rounded-lg shadow-lg border-l-4 border-purple-500 mt-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <div>
                    <h4 className="text-xl font-bold text-purple-300 flex items-center gap-2">🎯 Aderência à Estratégia: <span className="text-white">{config.label}</span></h4>
                    <p className="text-sm text-gray-400 mt-1 max-w-2xl">{config.desc}</p>
                </div>
                <div className="mt-2 md:mt-0 bg-purple-900/30 px-3 py-1 rounded text-xs text-purple-200 font-mono">Foco Estratégico</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.kpis.map(kpi => {
                    const item = metricas[kpi];
                    const pontos = item?.nota || 0;
                    const percentualVisual = Math.min(100, pontos * 2.5);
                    return (
                        <div key={kpi} className="bg-gray-800 p-3 rounded border border-gray-600 hover:border-purple-500 transition-colors">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-gray-300 font-semibold text-sm">{LABELS[kpi]}</span>
                                <span className="text-purple-400 font-bold text-lg">{pontos.toFixed(1)} pts</span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                                <div className="bg-gradient-to-r from-purple-600 to-purple-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${percentualVisual}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Contribuição IDG</span>
                                <span>Real: {FormatNumero({ valor: item?.valor, tipo: kpi === 'lucro' ? 'moeda' : (kpi === 'share' ? 'percent' : 'decimal') })}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
             <div className="mt-4 bg-black/20 p-3 rounded text-sm text-gray-300 border border-gray-600">
                <strong className="text-purple-300 block mb-1">💡 Dicas Táticas:</strong>
                <ul className="list-disc list-inside space-y-1 text-xs md:text-sm pl-2">{config.dicas.map((dica, i) => <li key={i}>{dica}</li>)}</ul>
            </div>
        </div>
    );
}

function GraficoIDG({ metricas }) {
    const data = useMemo(() => {
        if (!metricas) return [];
        const nomesMetricas = { lucro: 'Lucro', share: 'Mkt Share', pd: 'P&D', saude: 'Saúde Fin.', org: 'Org/ESG' };
        return Object.keys(nomesMetricas).map(key => ({ name: nomesMetricas[key], Pontos: metricas[key] ? Number(metricas[key].nota.toFixed(1)) : 0 }))
    }, [metricas]);
    if (data.length === 0) return <p className="text-sm text-gray-400 text-center py-10">Métricas indisponíveis.</p>;

    return (
        <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 0, right: 35, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                    <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" stroke="#cbd5e1" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '0.5rem' }} labelStyle={{ color: '#cbd5e1' }} cursor={{ fill: 'rgba(74, 85, 104, 0.5)' }} />
                    <Bar dataKey="Pontos" fill="#06B6D4" background={{ fill: '#4a5568', opacity: 0.3 }} label={{ position: 'right', fill: '#fff', fontSize: 10, formatter: (val) => `${val.toFixed(1)}` }} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function ResumoDecisoesRodada({ decisoes, simulacao }) {
    if (!decisoes || Object.keys(decisoes).length === 0 || decisoes.Status_Decisao === 'Pendente') {
        return <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow mt-6"><h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">📋 Decisões (R{decisoes?.Rodada})</h3><p className="text-gray-500 text-center py-4">Nenhuma decisão registrada.</p></div>;
    }
    const formatBRL = (num) => (Number(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatNum = (num) => (Number(num) || 0).toLocaleString('pt-BR');
    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow mt-6">
            <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">📋 Decisões Tomadas (R{decisoes.Rodada})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                <div className="bg-gray-700 p-4 rounded-lg"><h4 className="font-semibold text-gray-200 mb-2">Rede</h4><p className="text-gray-400">Tela S1: <span className="font-medium text-white">{decisoes.Escolha_Fornecedor_S1_Tela}</span></p><p className="text-gray-400">Chip S1: <span className="font-medium text-white">{decisoes.Escolha_Fornecedor_S1_Chip}</span></p></div>
                <div className="bg-gray-700 p-4 rounded-lg"><h4 className="font-semibold text-gray-200 mb-2">Operações</h4><p className="text-gray-400">Prod. Total: <span className="font-medium text-white">{formatNum((decisoes.Producao_Planejada_S1||0)+(decisoes.Producao_Planejada_S2||0))}</span></p><p className="text-gray-400">Expansão: <span className="font-medium text-white">{formatBRL(decisoes.Invest_Expansao_Fabrica)}</span></p></div>
                <div className="bg-gray-700 p-4 rounded-lg"><h4 className="font-semibold text-gray-200 mb-2">P&D</h4><p className="text-gray-400">Total Inv.: <span className="font-medium text-white">{formatBRL((Number(decisoes.Invest_PD_Camera)||0)+(Number(decisoes.Invest_PD_Bateria)||0)+(Number(decisoes.Invest_PD_Sist_Operacional_e_IA)||0))}</span></p></div>
                <div className="bg-gray-700 p-4 rounded-lg"><h4 className="font-semibold text-gray-200 mb-2">Marketing</h4><p className="text-gray-400">Preço S1: <span className="font-medium text-white">{formatBRL(decisoes.Preco_Segmento_1)}</span></p><p className="text-gray-400">Preço S2: <span className="font-medium text-white">{formatBRL(decisoes.Preco_Segmento_2)}</span></p></div>
                <div className="bg-gray-700 p-4 rounded-lg"><h4 className="font-semibold text-gray-200 mb-2">Finanças</h4><p className="text-gray-400">Empréstimos: <span className="font-medium text-white">{formatBRL((Number(decisoes.Tomar_Emprestimo_CP)||0)+(Number(decisoes.Tomar_Financiamento_LP)||0))}</span></p></div>
                <div className="bg-gray-700 p-4 rounded-lg"><h4 className="font-semibold text-gray-200 mb-2">Organização</h4><p className="text-gray-400">Total Org: <span className="font-medium text-white">{formatBRL((Number(decisoes.Invest_Organiz_Capacitacao)||0)+(Number(decisoes.Invest_Organiz_Mkt_Institucional)||0)+(Number(decisoes.Invest_Organiz_ESG)||0))}</span></p></div>
            </div>
        </div>
    );
}

// --- Componente Principal ---
function ResultadosBriefing({ simulacao, simulacaoId, empresaId, rodadaRelatorio, rodadaDecisao }) {
    const [rodadaSelecionada, setRodadaSelecionada] = useState(rodadaRelatorio);
    const [dadosVisao, setDadosVisao] = useState({ estado: null, decisoes: null, loading: true });
    const [mercadoData, setMercadoData] = useState([]);

    useEffect(() => { setRodadaSelecionada(rodadaRelatorio); }, [rodadaRelatorio]);

    useEffect(() => {
        if (!simulacaoId || !empresaId) return;
        const fetchDados = async () => {
            setDadosVisao(prev => ({ ...prev, loading: true }));
            const basePath = `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}`;
            const empresasRef = collection(db, basePath, 'empresas');
            
            try {
                // 1. Busca dados da MINHA empresa
                const [estadoSnap, decisoesSnap] = await Promise.all([
                    getDoc(doc(db, `${basePath}/empresas/${empresaId}/estados`, rodadaSelecionada.toString())),
                    getDoc(doc(db, `${basePath}/empresas/${empresaId}/decisoes`, rodadaSelecionada.toString()))
                ]);

                // 2. Busca dados de TODAS as empresas (apenas estados) para o Comparativo
                // Nota: Em um app real com milhares de usuários, isso seria feito no backend (Cloud Function).
                // Como é um simulador de turma (6-10 empresas), fazer no frontend é aceitável e rápido.
                const empresasSnap = await getDocs(empresasRef);
                const promisesEstados = empresasSnap.docs.map(docEmpresa => 
                    getDoc(doc(db, `${basePath}/empresas/${docEmpresa.id}/estados`, rodadaSelecionada.toString()))
                        .then(s => s.exists() ? { id: docEmpresa.id, ...s.data() } : null)
                );
                const todosEstados = (await Promise.all(promisesEstados)).filter(Boolean);

                setDadosVisao({
                    estado: estadoSnap.exists() ? { id: empresaId, ...estadoSnap.data() } : null,
                    decisoes: decisoesSnap.exists() ? decisoesSnap.data() : null,
                    loading: false
                });
                setMercadoData(todosEstados);

            } catch (error) { console.error("Erro dados:", error); setDadosVisao(p => ({ ...p, loading: false })); }
        };
        fetchDados();
    }, [simulacaoId, empresaId, rodadaSelecionada]);

    // Memoização dos dados financeiros (DRE/Balanço) - Mantido igual
    const { dadosDRE, dadosBalanco } = useMemo(() => {
        const estado = dadosVisao.estado;
        if (!estado) return { dadosDRE: [], dadosBalanco: [] };
        
        const despFin = (estado.Despesas_Juros_CP||0)+(estado.Despesas_Juros_Emergencia||0)+(estado.Despesas_Juros_LP||0);
        const despOrg = (estado.Despesas_Organiz_Capacitacao||0)+(estado.Despesas_Organiz_Mkt_Institucional||0)+(estado.Despesas_Organiz_ESG||0);
        
        const dadosDRE = [
            ['(+) Receita de Vendas', estado.Vendas_Receita], ['(-) CPV', estado.Custo_Produtos_Vendidos],
            ['(=) Lucro Bruto', estado.Lucro_Bruto], ['--- OPERACIONAL ---', null],
            ['(-) P&D, Mkt, Fixo', estado.Despesas_Operacionais_Outras], ['(-) Org/ESG', despOrg],
            ['(=) EBIT', estado.Lucro_Operacional_EBIT], ['--- FINANCEIRO ---', null],
            ['(-) Juros', despFin], ['(=) Lucro Líquido', estado.Lucro_Liquido],
        ];
        
        const estTotal = (estado.Custo_Estoque_S1||0)+(estado.Custo_Estoque_S2||0);
        const imobLiq = (estado.Imobilizado_Bruto||0)-(estado.Depreciacao_Acumulada||0);
        const ativo = (estado.Caixa||0)+estTotal+imobLiq;
        const passivo = (estado.Divida_CP||0)+(estado.Divida_Emergencia||0)+estado.Divida_LP_Saldo;
        const pl = ativo - passivo;

        const dadosBalanco = [
            ['--- ATIVO ---', null], ['(+) Caixa', estado.Caixa], ['(+) Estoque', estTotal], ['(+) Imobilizado', imobLiq], ['(=) Total Ativo', ativo],
            ['--- PASSIVO ---', null], ['(+) CP + Emergência', (estado.Divida_CP||0)+(estado.Divida_Emergencia||0)], ['(+) Longo Prazo', estado.Divida_LP_Saldo], ['(=) Total Passivo', passivo],
            ['--- PL ---', null], ['(+) Patrimônio Líquido', pl], ['(=) Passivo + PL', passivo + pl]
        ];
        return { dadosDRE, dadosBalanco };
    }, [dadosVisao.estado]);

    const opcoesRodada = Array.from({ length: rodadaRelatorio + 1 }, (_, i) => i);
    const noticiaDaRodada = simulacao[`Noticia_Rodada_${rodadaDecisao}`] || "Mercado estável.";

    return (
        <div className="space-y-6 animate-fade-in">
            <JornalNoticias textoNoticia={noticiaDaRodada} />

            <div className="bg-gray-800 p-4 rounded-lg shadow flex items-center gap-4 mt-8">
                <label htmlFor="rodadaSelect" className="text-lg font-semibold text-gray-300">Visualizar Rodada:</label>
                <select id="rodadaSelect" value={rodadaSelecionada} onChange={(e) => setRodadaSelecionada(Number(e.target.value))} className="bg-gray-700 p-2 rounded-lg text-white font-bold focus:ring-2 focus:ring-cyan-500">
                    {opcoesRodada.map(r => <option key={r} value={r}>Rodada {r} {r===0?'(Inicial)':(r===rodadaRelatorio?'(Atual)':'')}</option>)}
                </select>
            </div>

            {dadosVisao.loading ? ( <p className="text-center text-gray-400 py-10">Carregando...</p> ) : dadosVisao.estado ? (
                <>
                    {/* Seção 1: Performance (IDG + Comparativo) */}
                    {rodadaSelecionada > 0 && (
                        <div className="grid grid-cols-1 gap-6">
                            <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow">
                                <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">🏆 Desempenho Global (IDG)</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="flex flex-col items-center justify-center bg-gray-700 p-6 rounded-lg">
                                        <span className="text-sm font-medium text-gray-400">IDG Score</span>
                                        <span className="text-7xl font-bold text-cyan-300 my-3"><FormatNumero valor={dadosVisao.estado.IDG_Score} tipo="decimal" /></span>
                                        <GraficoIDG metricas={dadosVisao.estado.IDG_Metricas} />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <AnaliseEstrategia metricas={dadosVisao.estado.IDG_Metricas} />
                                    </div>
                                </div>
                                {/* --- NOVO COMPONENTE INSERIDO AQUI --- */}
                                <ComparativoMercado meuEstado={dadosVisao.estado} todosEstados={mercadoData} />
                                {/* ------------------------------------- */}
                            </div>
                        </div>
                    )}

                    {/* Seção 2: Relatórios Financeiros */}
                    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow">
                        <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">📈 Demonstrativos (R{rodadaSelecionada})</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <RelatorioFinanceiro titulo="DRE Simplificado" dados={dadosDRE} />
                            <RelatorioFinanceiro titulo="Balanço Patrimonial" dados={dadosBalanco} isBalanco={true} />
                            
                            <div className="bg-gray-700 p-4 rounded-lg shadow h-full">
                                <h4 className="font-semibold text-lg text-cyan-400 mb-3 border-b border-gray-600 pb-2">KPIs Operacionais</h4>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex justify-between"><span>Caixa Final:</span> <span className={`font-bold ${dadosVisao.estado.Caixa<0?'text-red-400':'text-white'}`}><FormatNumero valor={dadosVisao.estado.Caixa} tipo="moeda" /></span></li>
                                    <li className="flex justify-between"><span>Capacidade:</span> <span className="text-white"><FormatNumero valor={dadosVisao.estado.Capacidade_Fabrica} tipo="unidade" /> un.</span></li>
                                    <li className="flex justify-between"><span>Estoque S1:</span> <span className="text-white"><FormatNumero valor={dadosVisao.estado.Estoque_S1_Unidades} tipo="unidade" /></span></li>
                                    <li className="flex justify-between"><span>Estoque S2:</span> <span className="text-white"><FormatNumero valor={dadosVisao.estado.Estoque_S2_Unidades} tipo="unidade" /></span></li>
                                    <li className="border-t border-gray-600 pt-2 mt-2 text-xs text-gray-400 text-center">
                                        {dadosVisao.estado.Noticia_Ruptura_Estoque_S1 && <div className="text-yellow-300 mb-1">⚠️ {dadosVisao.estado.Noticia_Ruptura_Estoque_S1}</div>}
                                        {dadosVisao.estado.Noticia_Ruptura_Estoque_S2 && <div className="text-yellow-300 mb-1">⚠️ {dadosVisao.estado.Noticia_Ruptura_Estoque_S2}</div>}
                                        {dadosVisao.estado.Divida_Emergencia > 0 && <div className="text-red-400 font-bold">🚨 Dívida de Emergência Contraída!</div>}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {rodadaSelecionada > 0 && <ResumoDecisoesRodada decisoes={dadosVisao.decisoes} simulacao={simulacao} />}
                    
                    <details className="bg-gray-800 p-4 md:p-6 rounded-lg shadow group mt-6">
                        <summary className="text-lg font-semibold text-cyan-400 cursor-pointer list-none flex justify-between items-center"> <span>Briefing Original</span> <span className="text-cyan-500 group-open:rotate-180 transition-transform duration-200">▼</span> </summary>
                        <div className="mt-3 pt-3 border-t border-gray-700"> <p className="text-gray-300 text-sm whitespace-pre-wrap">{simulacao.Cenario_Inicial_Descricao || "-"}</p> </div>
                    </details>
                </>
            ) : ( <p className="text-center text-yellow-400 py-10">Dados indisponíveis.</p> )}
        </div>
    );
}

export default ResultadosBriefing;