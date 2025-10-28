import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useCollection from '../hooks/useCollection.js';
import { appId } from '../firebase/config.js'; // Importa o appId para construir o caminho correto

// Componente para o Gráfico de Cursos por Instituição
function GraficoCursosPorInstituicao() {
    // Busca as coleções usando o caminho completo e correto do Firestore
    const instituicoes = useCollection(`/artifacts/${appId}/public/data/instituicoes`);
    const cursos = useCollection(`/artifacts/${appId}/public/data/cursos`);

    // Processa os dados para o formato que o gráfico precisa
    const dadosGrafico = useMemo(() => {
        // Aguarda o carregamento das duas coleções
        if (!instituicoes.length || !cursos.length) {
            return [];
        }

        // Cria um mapa para facilitar a busca do nome/sigla da instituição pelo ID
        const mapaInstituicoes = instituicoes.reduce((acc, inst) => {
            acc[inst.id] = inst.sigla || inst.nome;
            return acc;
        }, {});

        // Conta quantos cursos cada instituição possui
        const contagemPorInstituicao = cursos.reduce((acc, curso) => {
            const instId = curso.instituicaoId;
            if (instId) {
                acc[instId] = (acc[instId] || 0) + 1;
            }
            return acc;
        }, {});

        // Formata os dados para o array que o gráfico de barras espera
        return Object.keys(contagemPorInstituicao).map(instId => ({
            name: mapaInstituicoes[instId] || 'Desconhecida',
            'Cursos': contagemPorInstituicao[instId],
        }));

    }, [instituicoes, cursos]); // Recalcula apenas se os dados mudarem

    if (instituicoes.length === 0) {
        return <p className="text-gray-400">Aguardando dados de instituições para gerar o gráfico...</p>;
    }

    return (
        <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
                <BarChart
                    layout="vertical" // Define o gráfico como de barras horizontais
                    data={dadosGrafico}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                    <XAxis type="number" stroke="#9ca3af" dataKey="Cursos" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" width={80} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '0.5rem' }}
                        labelStyle={{ color: '#cbd5e1' }}
                        cursor={{ fill: '#4a5568' }}
                    />
                    <Legend />
                    <Bar dataKey="Cursos" fill="#06b6d4" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function PaginaDashboard({ perfilUsuario }) {
    return (
        <div>
            <div className="bg-gray-800 shadow-lg rounded-xl p-8 mb-8 animate-fade-in">
                <h1 className="text-3xl font-bold text-cyan-400 mb-2">
                    Olá, {perfilUsuario?.nome}!
                </h1>
                <p className="text-gray-300">
                    Bem-vindo ao seu dashboard. Você está logado como <span className="font-semibold capitalize">{perfilUsuario?.papel}</span>.
                </p>
            </div>

            <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in">
                <h2 className="text-2xl font-bold text-cyan-400 mb-6">Quantidade de Cursos por Instituição</h2>
                <GraficoCursosPorInstituicao />
            </div>
        </div>
    );
}

export default PaginaDashboard;

