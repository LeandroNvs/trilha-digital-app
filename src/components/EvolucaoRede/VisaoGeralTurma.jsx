import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../firebase/config.js';
import { calcularPontuacoes, classificarPerfilRede, FASES, PONTOS_INICIAIS } from './constants';
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
                'Status de Governança': perfil.badge,
                'Diagnóstico Estratégico': perfil.titulo,
                'Captura de Valor (Financeiro)': pontuacoes.caixa,
                'Soberania Relacional': pontuacoes.controle,
                'Dinâmica de Resposta': pontuacoes.agilidade,
                'Efeitos Cascata Ativados': pontuacoes.cascatasAtivadas?.length || 0,
                'Fase 1 (Hardware)': decisoes.fase1 || 'Pendente',
                'Justificativa F1': justificativas.fase1 || '-',
                'Fase 2 (Software)': decisoes.fase2 || 'Pendente',
                'Justificativa F2': justificativas.fase2 || '-',
                'Fase 3 (Distribuição)': decisoes.fase3 || 'Pendente',
                'Justificativa F3': justificativas.fase3 || '-',
                'Fase 4 (Go-to-Market)': decisoes.fase4 || 'Pendente',
                'Justificativa F4': justificativas.fase4 || '-',
                'Mitigação Valor': acoes.valor || '-',
                'Mitigação Soberania': acoes.soberania || '-',
                'Mitigação Dinâmica': acoes.dinamica || '-',
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
                        <span>👨‍🏫</span> Painel do Professor: Evolução de Rede H1 vs H2
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                        Acompanhamento em tempo real de decisões, trade-offs e alertas de colapso de cada equipe.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleExportarConsolidado}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-2 shadow"
                >
                    <span>📥</span> Exportar Planilha Consolidada
                </button>
            </div>

            {/* Tabela de Grupos */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-gray-900 text-gray-400 uppercase font-bold text-[10px] tracking-wider">
                        <tr>
                            <th className="p-3">Grupo</th>
                            <th className="p-3 text-center">Progresso</th>
                            <th className="p-3 text-center">Valor (Fin.)</th>
                            <th className="p-3 text-center">Soberania</th>
                            <th className="p-3 text-center">Dinâmica</th>
                            <th className="p-3">Diagnóstico de Governança</th>
                            <th className="p-3 text-center">Mitigações</th>
                            <th className="p-3 text-center">Decisões (1 a 4)</th>
                            <th className="p-3 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/60">
                        {todosGrupos.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="p-4 text-center text-gray-500">
                                    Nenhum grupo cadastrado nesta turma.
                                </td>
                            </tr>
                        ) : (
                            todosGrupos.map((grupo) => {
                                const dados = dadosTodosGrupos[grupo.id] || {};
                                const decisoes = dados.decisoes || {};
                                const acoes = dados.acoesMitigacao || {};
                                const pontuacoes = calcularPontuacoes(decisoes);
                                const perfil = classificarPerfilRede(pontuacoes, decisoes);
                                const qtdConcluida = Object.keys(decisoes).filter(k => !!decisoes[k]).length;
                                const temMitigacao = !!(acoes.valor || acoes.soberania || acoes.dinamica);

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
                                        <td className="p-3 text-center font-black">
                                            <span className={pontuacoes.altaExposicaoCaixa ? 'text-amber-400 font-extrabold' : 'text-gray-200'}>
                                                {pontuacoes.caixa}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center font-black">
                                            <span className={pontuacoes.altaExposicaoControle ? 'text-amber-400 font-extrabold' : 'text-gray-200'}>
                                                {pontuacoes.controle}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center font-black">
                                            <span className={pontuacoes.altaExposicaoAgilidade ? 'text-amber-400 font-extrabold' : 'text-gray-200'}>
                                                {pontuacoes.agilidade}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${perfil.cor}`}>
                                                {perfil.badge}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center whitespace-nowrap">
                                            {temMitigacao ? (
                                                <span className="text-emerald-400 font-bold text-[11px]">✓ Cadastrado</span>
                                            ) : (
                                                <span className="text-gray-500 text-[11px]">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center whitespace-nowrap font-mono text-[11px]">
                                            <span className="text-gray-400">
                                                {decisoes.fase1 || '-'} | {decisoes.fase2 || '-'} | {decisoes.fase3 || '-'} | {decisoes.fase4 || '-'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => onSelecionarGrupo(grupo.id)}
                                                className="bg-cyan-600 hover:bg-cyan-500 text-gray-950 font-bold px-3 py-1 rounded-lg text-xs transition"
                                            >
                                                Auditar
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
