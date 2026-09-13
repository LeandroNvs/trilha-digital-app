import React from 'react';
import { calcularImpactoOpcao } from './constants';

export default function FaseDecisao({
    fase,
    decisaoAtual,
    todasDecisoes = {},
    justificativaAtual = '',
    onEscolherDecisao,
    onAtualizarJustificativa,
    onAvancar,
    onVoltar,
    isPrimeiraFase,
    isUltimaFase,
    bloqueado = false
}) {
    return (
        <div className="bg-gray-800/90 rounded-2xl border border-gray-700/80 p-5 sm:p-6 space-y-6 shadow-xl">
            {/* Cabeçalho da Fase */}
            <div className="border-b border-gray-700 pb-4">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs uppercase font-extrabold tracking-wider bg-cyan-900/60 text-cyan-400 px-3 py-1 rounded-md border border-cyan-700/50">
                        Etapa {fase.faseId} de 4
                    </span>
                    <span className="text-xs text-gray-400 font-semibold">• {fase.subtitulo}</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white">{fase.titulo}</h3>
                <p className="text-xs sm:text-sm text-gray-300 mt-2 bg-gray-900/70 p-3.5 rounded-xl border border-gray-700/60 leading-relaxed">
                    💡 <strong className="text-white">Dilema Estratégico:</strong> {fase.contexto}
                </p>
            </div>

            {/* Grid com 3 Decisões (A, B e C) - Foco em Vetores Qualitativos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {fase.opcoes.map((opcao) => {
                    const isSelecionada = decisaoAtual === opcao.id;
                    const calculoImpacto = calcularImpactoOpcao(opcao, todasDecisoes);
                    const { efeitoCascata, temCascata } = calculoImpacto;

                    return (
                        <div
                            key={opcao.id}
                            onClick={() => !bloqueado && onEscolherDecisao(opcao.id)}
                            className={`p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                                isSelecionada
                                    ? 'bg-cyan-950/40 border-cyan-400 shadow-xl shadow-cyan-950/40 ring-2 ring-cyan-400/20'
                                    : 'bg-gray-850/70 border-gray-700 hover:border-gray-500 hover:bg-gray-850'
                            }`}
                        >
                            {/* Marcador Selecionado */}
                            {isSelecionada && (
                                <div className="absolute top-3 right-3 bg-cyan-500 text-gray-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                                    ✓ Selecionada
                                </div>
                            )}

                            <div>
                                {/* Tag de Arquétipo Estratégico */}
                                <div className="mb-2">
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-900 text-gray-300 border border-gray-700">
                                        {opcao.arquetipo}
                                    </span>
                                </div>

                                <div className="flex items-start gap-2.5 mb-2.5">
                                    <span className={`w-7 h-7 rounded-xl font-black text-sm flex items-center justify-center flex-shrink-0 border ${
                                        isSelecionada
                                            ? 'bg-cyan-400 text-gray-950 border-cyan-300'
                                            : 'bg-gray-800 text-gray-300 border-gray-600'
                                    }`}>
                                        {opcao.letra}
                                    </span>
                                    <div>
                                        <h4 className="font-bold text-white text-sm sm:text-base leading-snug">
                                            {opcao.titulo}
                                        </h4>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                                    {opcao.resumo}
                                </p>

                                {/* Efeito Cascata Ativado */}
                                {temCascata && (
                                    <div className="bg-amber-950/30 border border-amber-500/40 p-2.5 rounded-xl mb-3 space-y-1">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 uppercase tracking-wide">
                                            <span>⚡</span> Dependência de Trajetória Ativada
                                        </div>
                                        <p className="text-[11px] text-amber-200/90 leading-tight">
                                            {efeitoCascata.descricao}
                                        </p>
                                    </div>
                                )}

                                {/* Vetores Conceituais de Impacto (Substitui os números frios por leitura de governança) */}
                                <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-750 space-y-2 my-2 text-[11px]">
                                    <div className="flex items-start gap-2">
                                        <span className="text-amber-400 font-bold flex-shrink-0">💰 Valor:</span>
                                        <span className="text-gray-300 leading-tight">{opcao.vetoresConceituais.valor}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-blue-400 font-bold flex-shrink-0">🛡️ Soberania:</span>
                                        <span className="text-gray-300 leading-tight">{opcao.vetoresConceituais.soberania}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-emerald-400 font-bold flex-shrink-0">⚡ Dinâmica:</span>
                                        <span className="text-gray-300 leading-tight">{opcao.vetoresConceituais.dinamica}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Revelação do Diagnóstico Técnico ao Selecionar */}
                            <div className="mt-4 pt-3 border-t border-gray-700/80">
                                {isSelecionada ? (
                                    <div className="bg-cyan-950/50 border border-cyan-500/30 p-2.5 rounded-xl">
                                        <div className="text-[9px] uppercase font-bold text-cyan-400 flex items-center gap-1.5 mb-0.5">
                                            <span>📊</span> Parecer Técnico:
                                        </div>
                                        <p className="text-[11px] font-semibold text-cyan-200 leading-snug">
                                            {opcao.diagnostico}
                                        </p>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={bloqueado}
                                        className="w-full py-1.5 px-3 rounded-xl text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors border border-gray-700"
                                    >
                                        Selecionar Opção {opcao.letra}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Justificativa Estratégica do Grupo */}
            <div className="bg-gray-900/60 p-4 sm:p-5 rounded-2xl border border-gray-700/80 space-y-2">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                    📝 Justificativa Estratégica do Grupo (Obrigatório para Avançar):
                </label>
                <textarea
                    rows={3}
                    disabled={bloqueado}
                    value={justificativaAtual}
                    onChange={(e) => onAtualizarJustificativa(e.target.value)}
                    placeholder="Por que o grupo escolheu este caminho? Quais trade-offs de valor, soberania e tempo de resposta vocês aceitaram assumir nesta fase?"
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-xs sm:text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
            </div>

            {/* Rodapé de Navegação */}
            <div className="flex items-center justify-between pt-2">
                <div>
                    {!isPrimeiraFase && (
                        <button
                            type="button"
                            onClick={onVoltar}
                            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-xl text-xs sm:text-sm transition"
                        >
                            ← Fase Anterior
                        </button>
                    )}
                </div>

                <div>
                    <button
                        type="button"
                        disabled={!decisaoAtual || !justificativaAtual.trim() || bloqueado}
                        onClick={onAvancar}
                        className={`font-black py-2.5 px-5 sm:px-6 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center gap-2 ${
                            !decisaoAtual || !justificativaAtual.trim() || bloqueado
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-cyan-500 hover:bg-cyan-400 text-gray-950 shadow-cyan-500/20'
                        }`}
                    >
                        {isUltimaFase ? 'Concluir e Acessar Dashboard Executivo 🎯' : 'Salvar e Próxima Fase →'}
                    </button>
                </div>
            </div>
        </div>
    );
}
