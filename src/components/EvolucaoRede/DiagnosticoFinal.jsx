import React from 'react';
import { FASES, CARACTERISTICAS_REDE, classificarPerfilRede } from './constants';

export default function DiagnosticoFinal({
    pontuacoes,
    decisoes,
    justificativas,
    acoesMitigacao = {},
    grupoNome,
    onVoltarFase,
    onReiniciarSimulacao,
    onAtualizarAcaoMitigacao,
    onSalvarAcoesMitigacao,
    onExportarExcel,
    bloqueado = false,
    salvando = false
}) {
    const perfil = classificarPerfilRede(pontuacoes, decisoes);
    const { tempoTotalMeses = 18, janela, caracteristicasConsolidadas = [] } = pontuacoes;

    return (
        <div className="space-y-6">
            
            {/* 1. BANNER EXECUTIVO: JANELA DE MERCADO E TIME-TO-MARKET */}
            <div className={`p-6 sm:p-7 rounded-3xl border-2 shadow-2xl ${perfil.cor} space-y-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs uppercase font-black tracking-widest px-3.5 py-1 rounded-full border border-current">
                        {janela?.badge || perfil.badge}
                    </span>
                    <span className="text-xs text-gray-300 font-bold">
                        Grupo de Projeto: <strong className="text-white text-sm">{grupoNome || 'Não selecionado'}</strong>
                    </span>
                </div>

                <div>
                    <h3 className="text-2xl md:text-3xl font-black text-white">
                        {perfil.titulo}
                    </h3>
                    <p className="text-sm text-gray-200 mt-2 leading-relaxed">
                        {perfil.resumo}
                    </p>
                </div>

                <div className="bg-gray-900/80 p-4 rounded-2xl border border-gray-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">⏱️</span>
                        <div>
                            <strong className="text-white block">Cronograma Total de Lançamento:</strong>
                            <span>{tempoTotalMeses} meses (a partir da linha de base de 18 meses)</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🕸️</span>
                        <div>
                            <strong className="text-white block">Configuração Estrutural:</strong>
                            <span>{caracteristicasConsolidadas.length} características de rede ativadas</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. MAPA ESTRUTURAL DA REDE DE NEGÓCIOS CONSOLIDADA */}
            <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-4">
                <div className="border-b border-gray-700 pb-3 flex items-center justify-between">
                    <div>
                        <h4 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>🕸️</span> Mapa Estrutural da Rede de Negócios da Empresa
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Características estruturais acumuladas pelas 4 decisões estratégicas da equipe.
                        </p>
                    </div>
                </div>

                {caracteristicasConsolidadas.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-4">Nenhuma decisão registrada até o momento.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {caracteristicasConsolidadas.map((item, idx) => {
                            const carac = CARACTERISTICAS_REDE[item.caracteristicaId];
                            return (
                                <div key={idx} className="bg-gray-900/90 p-3.5 rounded-xl border border-gray-750 flex items-start gap-3">
                                    <span className="text-2xl flex-shrink-0 mt-0.5">{carac?.icone || '📌'}</span>
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <strong className="text-xs font-bold text-white">{carac?.nome}</strong>
                                            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${carac?.corBadge}`}>
                                                {carac?.categoria}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-300 leading-snug">
                                            {item.efeito}
                                        </p>
                                        <span className="text-[10px] text-gray-500 block font-semibold">
                                            Origem: {item.faseTitulo}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 3. PLANO DIRETOR DE GOVERNANÇA ESTRATÉGICA FORMULADO PELO GRUPO */}
            <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-6">
                <div className="border-b border-gray-700 pb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h4 className="text-base font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                            <span>🏛️</span> Plano Diretor de Governança Estratégica da Turma
                        </h4>
                        <p className="text-xs text-gray-300 mt-0.5">
                            Ações de governança formuladas pelo grupo para mitigar os gargalos e tensões de cada fase.
                        </p>
                    </div>

                    {!bloqueado && (
                        <button
                            type="button"
                            onClick={onSalvarAcoesMitigacao}
                            disabled={salvando}
                            className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-black text-xs py-2 px-4 rounded-xl transition shadow"
                        >
                            {salvando ? 'Salvando...' : 'Salvar Revisões de Governança 💾'}
                        </button>
                    )}
                </div>

                <div className="space-y-5">
                    {FASES.map((fase) => {
                        const opcaoEscolhidaId = decisoes[fase.chave];
                        const opcaoEscolhida = fase.opcoes.find(o => o.id === opcaoEscolhidaId);
                        const justificativa = justificativas[fase.chave] || 'Nenhuma justificativa registrada.';
                        const acaoGovernanca = acoesMitigacao[fase.chave] || '';

                        return (
                            <div key={fase.faseId} className="bg-gray-900/90 p-5 rounded-2xl border border-gray-750 space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-black flex items-center justify-center">
                                            {fase.faseId}
                                        </span>
                                        <h5 className="font-bold text-white text-sm">{fase.titulo}</h5>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-gray-800 text-cyan-300 border border-gray-700">
                                            Opção {opcaoEscolhida?.letra || '?'}: {opcaoEscolhida?.titulo || 'Não selecionada'}
                                        </span>
                                        {!bloqueado && (
                                            <button
                                                type="button"
                                                onClick={() => onVoltarFase(fase.faseId - 1)}
                                                className="text-[10px] text-gray-400 hover:text-white underline font-semibold"
                                            >
                                                Alterar Decisão
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Justificativa da Fase */}
                                <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 text-xs space-y-1">
                                    <strong className="text-cyan-400 block font-bold text-[10px] uppercase">
                                        📝 Justificativa Estratégica da Equipe:
                                    </strong>
                                    <p className="text-gray-300 leading-relaxed italic">
                                        "{justificativa}"
                                    </p>
                                </div>

                                {/* Ação de Governança Editável */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>🎯</span> Ação de Governança da Rede para Esta Fase:
                                    </label>
                                    <textarea
                                        rows={3}
                                        disabled={bloqueado}
                                        value={acaoGovernanca}
                                        onChange={(e) => onAtualizarAcaoMitigacao(fase.chave, e.target.value)}
                                        placeholder="Descreva a governança da rede para esta etapa..."
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 4. RODAPÉ DE AÇÕES FINAIS */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                    {!bloqueado && (
                        <button
                            type="button"
                            onClick={onReiniciarSimulacao}
                            className="bg-gray-800 hover:bg-gray-700 text-red-400 font-bold py-2.5 px-4 rounded-xl text-xs transition border border-gray-750"
                        >
                            🔄 Reiniciar Simulação
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onExportarExcel}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-5 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center gap-2"
                    >
                        <span>📥</span> Exportar Relatório Executivo em Excel
                    </button>
                </div>
            </div>
        </div>
    );
}
