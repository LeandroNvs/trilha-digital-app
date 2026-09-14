import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../firebase/config.js';
import { calcularPontuacoes, classificarPerfilRede, FASES, CARACTERISTICAS_REDE } from './constants';
import * as XLSX from 'xlsx';

export default function VisaoGeralTurma({ todosGrupos, onSelecionarGrupo }) {
    const [dadosTodosGrupos, setDadosTodosGrupos] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const colRef = collection(db, `artifacts/${appId}/public/data/rede_evolucao`);
        const unsubscribe = onSnapshot(colRef, (snapshot) => {
            const mapa = {};
            snapshot.forEach((doc) => {
                mapa[doc.id] = doc.data();
            });
            setDadosTodosGrupos(mapa);
            setLoading(false);
        }, (err) => {
            console.error("Erro ao carregar visão geral da turma:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleExportarConsolidado = () => {
        const linhas = todosGrupos.map((grupo) => {
            const dados = dadosTodosGrupos[grupo.id] || {};
            const decisoes = dados.decisoes || {};
            const justificativas = dados.justificativas || {};
            const acoes = dados.acoesMitigacao || {};
            const pontuacoes = calcularPontuacoes(decisoes);
            const perfil = classificarPerfilRede(pontuacoes, decisoes);

            return {
                'Grupo': grupo.nome,
                'Time-to-Market (Meses)': pontuacoes.tempoTotalMeses,
                'Janela Competitiva': pontuacoes.janela?.badge || '-',
                'Total Gargalos Estruturais': pontuacoes.totalGargalos,
                'Total Assimetrias': pontuacoes.totalAssimetrias,
                'Total Rigidezes': pontuacoes.totalRigidezes,
                'Fase 1 (Hardware)': decisoes.fase1 || 'Pendente',
                'Governança F1': acoes.fase1 || '-',
                'Justificativa F1': justificativas.fase1 || '-',
                'Fase 2 (Software)': decisoes.fase2 || 'Pendente',
                'Governança F2': acoes.fase2 || '-',
                'Justificativa F2': justificativas.fase2 || '-',
                'Fase 3 (Distribuição)': decisoes.fase3 || 'Pendente',
                'Governança F3': acoes.fase3 || '-',
                'Justificativa F3': justificativas.fase3 || '-',
                'Fase 4 (Go-to-Market)': decisoes.fase4 || 'Pendente',
                'Governança F4': acoes.fase4 || '-',
                'Justificativa F4': justificativas.fase4 || '-',
                'Última Atualização': dados.dataAtualizacao || '-'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(linhas);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Evolucao_Rede_Turma");
        XLSX.writeFile(workbook, `Evolucao_Rede_Consolidado_Turma_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    if (loading) {
        return <div className="text-gray-400 text-sm p-6 text-center">Carregando dados da turma...</div>;
    }

    return (
        <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-6 space-y-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-700 pb-4">
                <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <span>👨‍🏫</span> Painel do Professor: Evolução de Rede (H1 vs H2)
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                        Acompanhamento em tempo real de decisões, cronogramas de lançamento, gargalos ativados e planos de governança de cada equipe.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleExportarConsolidado}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-2 shadow"
                >
                    <span>📥</span> Exportar Planilha Consolidada da Turma
                </button>
            </div>

            {/* Tabela de Grupos */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-gray-900 text-gray-400 uppercase font-bold text-[10px] tracking-wider">
                        <tr>
                            <th className="p-3">Grupo</th>
                            <th className="p-3 text-center">Progresso</th>
                            <th className="p-3 text-center">Time-to-Market</th>
                            <th className="p-3 text-center">Janela de Entrada</th>
                            <th className="p-3 text-center">Gargalos</th>
                            <th className="p-3 text-center">Assimetrias</th>
                            <th className="p-3 text-center">Planos de Governança</th>
                            <th className="p-3 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/60">
                        {todosGrupos.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-4 text-center text-gray-500">
                                    Nenhum grupo cadastrado nesta turma.
                                </td>
                            </tr>
                        ) : (
                            todosGrupos.map((grupo) => {
                                const dados = dadosTodosGrupos[grupo.id] || {};
                                const decisoes = dados.decisoes || {};
                                const acoes = dados.acoesMitigacao || {};
                                const pontuacoes = calcularPontuacoes(decisoes);
                                const qtdConcluida = Object.keys(decisoes).filter(k => !!decisoes[k]).length;
                                const totalAcoesPreenchidas = ['fase1', 'fase2', 'fase3', 'fase4'].filter(k => !!acoes[k]?.trim()).length;

                                return (
                                    <tr key={grupo.id} className="hover:bg-gray-750 transition">
                                        <td className="p-3 font-bold text-white whitespace-nowrap">
                                            {grupo.nome}
                                        </td>
                                        <td className="p-3 text-center whitespace-nowrap">
                                            <span className="bg-gray-900 px-2 py-0.5 rounded text-[11px] font-bold text-cyan-400 border border-gray-700">
                                                {qtdConcluida} / 4
                                            </span>
                                        </td>
                                        <td className="p-3 text-center font-black text-white whitespace-nowrap">
                                            {pontuacoes.tempoTotalMeses} meses
                                        </td>
                                        <td className="p-3 text-center whitespace-nowrap">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pontuacoes.janela?.corBg || 'bg-gray-900 text-gray-300'}`}>
                                                {pontuacoes.janela?.badge}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center font-bold text-blue-400 whitespace-nowrap">
                                            {pontuacoes.totalGargalos}
                                        </td>
                                        <td className="p-3 text-center font-bold text-purple-400 whitespace-nowrap">
                                            {pontuacoes.totalAssimetrias + pontuacoes.totalRigidezes}
                                        </td>
                                        <td className="p-3 text-center whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                totalAcoesPreenchidas === 4
                                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                                    : totalAcoesPreenchidas > 0
                                                    ? 'bg-amber-950 text-amber-300 border border-amber-700'
                                                    : 'bg-gray-900 text-gray-500 border border-gray-700'
                                            }`}>
                                                {totalAcoesPreenchidas} / 4 registradas
                                            </span>
                                        </td>
                                        <td className="p-3 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => onSelecionarGrupo(grupo.id)}
                                                className="bg-cyan-900/60 hover:bg-cyan-800 text-cyan-400 font-bold px-3 py-1.5 rounded-lg text-xs transition border border-cyan-700/50"
                                            >
                                                Auditar Grupo →
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
