import React, { useState } from 'react';
import { CARACTERISTICAS_REDE } from './constants';

export default function FaseDecisao({
    fase,
    decisaoAtual,
    todasDecisoes = {},
    justificativaAtual = '',
    acaoGovernancaAtual = '',
    onEscolherDecisao,
    onAtualizarJustificativa,
    onAtualizarAcaoGovernanca,
    onAvancar,
    onVoltar,
    isPrimeiraFase,
    isUltimaFase,
    bloqueado = false
}) {
    const [expandirDossie, setExpandirDossie] = useState(true);

    const opcaoSelecionadaObj = fase.opcoes.find(o => o.id === decisaoAtual);

    return (
        <div className="bg-gray-800/90 rounded-2xl border border-gray-700/80 p-5 sm:p-7 space-y-6 shadow-xl">
            
            {/* 1. CABEÇALHO DA FASE */}
            <div className="border-b border-gray-700 pb-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-extrabold tracking-wider bg-cyan-900/60 text-cyan-400 px-3 py-1 rounded-md border border-cyan-700/50">
                            Etapa {fase.faseId} de 4
                        </span>
                        <span className="text-xs text-gray-400 font-semibold">• {fase.subtitulo}</span>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl md:text-2xl font-black text-white">{fase.titulo}</h3>
                    <p className="text-xs sm:text-sm text-gray-300 mt-2 bg-gray-900/70 p-3.5 rounded-xl border border-gray-700/60 leading-relaxed">
                        💡 <strong className="text-white">Dilema Estratégico:</strong> {fase.contexto}
                    </p>
                </div>

                {/* DIAGNÓSTICO DA REDE NO INÍCIO DA FASE (PONTO DE PARTIDA HERDADO) */}
                {fase.diagnosticoInicialRede && fase.diagnosticoInicialRede.length > 0 && (
                    <div className="bg-gray-950/60 p-4 rounded-xl border border-gray-750 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                                <span>⚠️</span> Configuração Herdada da Rede (Ponto de Partida):
                            </span>
                            <span className="text-[10px] text-gray-400 italic">Características ativas antes da sua escolha</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                            {fase.diagnosticoInicialRede.map((diag, idx) => {
                                const infoCarac = CARACTERISTICAS_REDE[diag.caracteristicaId];
                                return (
                                    <div key={idx} className="bg-gray-900/80 p-3 rounded-lg border border-gray-800 flex items-start gap-2.5">
                                        <span className="text-lg flex-shrink-0">{infoCarac?.icone || '📌'}</span>
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <strong className="text-xs text-white font-bold">{infoCarac?.nome}</strong>
                                                <span className="text-[9px] uppercase font-semibold text-gray-400 px-1.5 py-0.2 rounded bg-gray-800">
                                                    {infoCarac?.categoria}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-300 leading-snug">{diag.detalhe}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* DOSSIÊ DE PESQUISA & DEBATE EM GRUPO */}
                {fase.dossiePesquisa && (
                    <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setExpandirDossie(!expandirDossie)}
                            className="w-full p-3 flex items-center justify-between text-left text-xs font-bold text-cyan-400 hover:bg-cyan-950/40 transition"
                        >
                            <span className="flex items-center gap-2">
                                <span>📚</span> Dossiê de Pesquisa Sugerido para a Equipe
                            </span>
                            <span className="text-[10px] text-cyan-300">
                                {expandirDossie ? '▲ Recolher' : '▼ Expandir provocação'}
                            </span>
                        </button>
                        {expandirDossie && (
                            <div className="p-3.5 pt-0 text-xs text-cyan-100/90 leading-relaxed border-t border-cyan-900/40">
                                {fase.dossiePesquisa}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 2. GRID COM AS 3 OPÇÕES (A, B e C) */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs uppercase font-extrabold text-gray-300 tracking-wider">
                        Selecione a Estratégia da Empresa para esta Etapa:
                    </span>
                    <span className="text-[11px] text-gray-400">
                        Cada opção reconfigura a dinâmica e as características estruturais da rede
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {fase.opcoes.map((opcao) => {
                        const isSelecionada = decisaoAtual === opcao.id;

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
                                    {/* Arquétipo */}
                                    <div className="mb-2">
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-900 text-gray-300 border border-gray-700">
                                            {opcao.arquetipo}
                                        </span>
                                    </div>

                                    {/* Letra e Título */}
                                    <div className="flex items-start gap-2.5 mb-2">
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

                                    {/* Características Estruturais Ativadas na Rede */}
                                    <div className="space-y-1.5 mb-3">
                                        <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">
                                            🕸️ Reconfiguração da Rede de Negócios:
                                        </span>
                                        <div className="space-y-1.5">
                                            {opcao.caracteristicasAtivadas.map((item, idx) => {
                                                const carac = CARACTERISTICAS_REDE[item.caracteristicaId];
                                                return (
                                                    <div key={idx} className="bg-gray-900/90 p-2 rounded-lg border border-gray-800 text-[11px]">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span>{carac?.icone}</span>
                                                            <strong className="text-white text-[11px]">{carac?.nome}</strong>
                                                        </div>
                                                        <p className="text-[10px] text-gray-300 leading-tight">
                                                            {item.efeito}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Diagnóstico / Seleção */}
                                <div className="mt-2 pt-3 border-t border-gray-700/80">
                                    {isSelecionada ? (
                                        <div className="bg-cyan-950/60 border border-cyan-500/40 p-2.5 rounded-xl">
                                            <div className="text-[9px] uppercase font-bold text-cyan-400 flex items-center gap-1.5 mb-0.5">
                                                <span>📊</span> Síntese do Posicionamento:
                                            </div>
                                            <p className="text-[11px] font-medium text-cyan-200 leading-snug">
                                                {opcao.diagnostico}
                                            </p>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={bloqueado}
                                            className="w-full py-1.5 px-3 rounded-xl text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors border border-gray-700"
                                        >
                                            Adotar Estratégia {opcao.letra}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. BLOCO DE GOVERNANÇA E JUSTIFICATIVA (ABERTO QUANDO HÁ OPÇÃO SELECIONADA) */}
            {decisaoAtual && opcaoSelecionadaObj && (
                <div className="bg-gray-900/90 p-5 sm:p-6 rounded-2xl border-2 border-cyan-500/40 space-y-5 animate-fade-in shadow-2xl">
                    <div className="border-b border-gray-800 pb-2 flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                            <span>🏛️</span> Formulação de Governança e Justificativa da Equipe
                        </h4>
                        <span className="text-xs text-gray-400 font-semibold">
                            Estratégia {opcaoSelecionadaObj.letra}: {opcaoSelecionadaObj.titulo}
                        </span>
                    </div>

                    {/* AÇÃO DE GOVERNANÇA DA REDE (OBRIGATÓRIO) */}
                    <div className="space-y-2 bg-gray-950/70 p-4 rounded-xl border border-gray-800">
                        <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🎯</span> Desafio de Governança da Rede:
                        </label>
                        <p className="text-xs text-gray-300 leading-relaxed font-medium">
                            {opcaoSelecionadaObj.desafioGovernanca}
                        </p>
                        <textarea
                            rows={3}
                            disabled={bloqueado}
                            value={acaoGovernancaAtual}
                            onChange={(e) => onAtualizarAcaoGovernanca(e.target.value)}
                            placeholder="Descreva a ação de governança prática que a empresa implementará (ex: cláusulas de SLA, auditorias técnicas, acordos de propriedade intelectual, comitês de aliança ou salvaguardas contratuais)..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                        />
                    </div>

                    {/* JUSTIFICATIVA ESTRATÉGICA (OBRIGATÓRIO) */}
                    <div className="space-y-2 bg-gray-950/70 p-4 rounded-xl border border-gray-800">
                        <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                            <span>📝</span> Justificativa Estratégica do Grupo:
                        </label>
                        <textarea
                            rows={3}
                            disabled={bloqueado}
                            value={justificativaAtual}
                            onChange={(e) => onAtualizarJustificativa(e.target.value)}
                            placeholder="Por que a equipe escolheu este caminho? Quais trade-offs estruturais, operacionais e de posicionamento vocês aceitaram assumir nesta fase?"
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                        />
                    </div>
                </div>
            )}

            {/* 4. RODAPÉ DE NAVEGAÇÃO */}
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
                        disabled={!decisaoAtual || !justificativaAtual.trim() || !acaoGovernancaAtual.trim() || bloqueado}
                        onClick={onAvancar}
                        className={`font-black py-2.5 px-5 sm:px-6 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center gap-2 ${
                            !decisaoAtual || !justificativaAtual.trim() || !acaoGovernancaAtual.trim() || bloqueado
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-cyan-500 hover:bg-cyan-400 text-gray-950 shadow-cyan-500/20'
                        }`}
                    >
                        {isUltimaFase ? 'Concluir e Acessar Dossiê de Governança 🎯' : 'Salvar e Próxima Fase →'}
                    </button>
                </div>
            </div>
        </div>
    );
}
