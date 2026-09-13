import React from 'react';
import { DESCRICAO_INDICADORES, PONTOS_INICIAIS } from './constants';

export default function CardIndicadores({ pontuacoes }) {
    const { caixa, controle, agilidade, colapsoCaixa, colapsoAgilidade, colapsoControle } = pontuacoes;

    const indicadores = [
        {
            key: 'caixa',
            info: DESCRICAO_INDICADORES.caixa,
            valor: caixa,
            inicial: PONTOS_INICIAIS.caixa,
            colapso: colapsoCaixa,
            critico: caixa <= 20,
            icone: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            key: 'controle',
            info: DESCRICAO_INDICADORES.controle,
            valor: controle,
            inicial: PONTOS_INICIAIS.controle,
            colapso: colapsoControle,
            critico: controle <= 30,
            icone: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            )
        },
        {
            key: 'agilidade',
            info: DESCRICAO_INDICADORES.agilidade,
            valor: agilidade,
            inicial: PONTOS_INICIAIS.agilidade,
            colapso: colapsoAgilidade,
            critico: agilidade <= 20,
            icone: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        }
    ];

    return (
        <div className="space-y-4">
            {/* Cards de Métricas em Tempo Real */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {indicadores.map(({ key, info, valor, inicial, colapso, critico, icone }) => {
                    const delta = valor - inicial;
                    const percentual = Math.min(100, Math.max(0, valor));
                    const isZero = valor <= 0;

                    return (
                        <div
                            key={key}
                            className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                                isZero
                                    ? 'bg-red-950/40 border-red-600 shadow-lg shadow-red-950/50'
                                    : colapso || critico
                                    ? 'bg-amber-950/20 border-amber-500/50 shadow-md'
                                    : 'bg-gray-800/80 border-gray-700/80 hover:border-gray-600'
                            }`}
                        >
                            {/* Top Bar com Ícone e Título */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${info.corBg} ${info.corTexto}`}>
                                            {icone}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
                                                {info.nome}
                                                {isZero && (
                                                    <span className="text-[10px] uppercase font-extrabold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                                                        ZERADO!
                                                    </span>
                                                )}
                                                {!isZero && colapso && (
                                                    <span className="text-[10px] uppercase font-bold bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/50">
                                                        CRÍTICO
                                                    </span>
                                                )}
                                            </h4>
                                            <p className="text-xs text-gray-400 font-medium">{info.subtitulo}</p>
                                        </div>
                                    </div>

                                    {/* Placar Numérico */}
                                    <div className="text-right">
                                        <span className={`text-2xl font-black ${
                                            isZero ? 'text-red-400' : critico ? 'text-amber-400' : info.corTexto
                                        }`}>
                                            {valor}
                                        </span>
                                        <span className="text-xs text-gray-400 font-bold ml-1">pts</span>
                                        <div className="text-[11px] font-semibold">
                                            {delta > 0 ? (
                                                <span className="text-emerald-400">+{delta} (vs H1)</span>
                                            ) : delta < 0 ? (
                                                <span className="text-red-400">{delta} (vs H1)</span>
                                            ) : (
                                                <span className="text-gray-400">0 (estável)</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Barra de Progresso Visual */}
                                <div className="mt-3">
                                    <div className="w-full bg-gray-900/90 rounded-full h-2.5 overflow-hidden p-0.5 border border-gray-700/50">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                isZero ? 'bg-red-500' : critico ? 'bg-amber-500' : info.corBarra
                                            }`}
                                            style={{ width: `${percentual}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Descrição Didática da Variável */}
                            <p className="text-[11px] text-gray-300/90 mt-4 leading-relaxed line-clamp-3">
                                {info.descricao}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Banner de Alerta se Houver Colapso Estratégico */}
            {(colapsoCaixa || colapsoAgilidade || colapsoControle) && (
                <div className="bg-red-950/40 border border-red-500/60 p-4 rounded-2xl flex items-start gap-3.5 shadow-xl animate-fade-in">
                    <div className="p-2 bg-red-600/30 rounded-xl text-red-400 flex-shrink-0 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="flex-1 text-sm space-y-1">
                        <h5 className="font-bold text-red-300 tracking-wide uppercase text-xs">
                            Armadilha de Rede Detectada!
                        </h5>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-red-200/90 font-normal">
                            {colapsoCaixa && <li>{DESCRICAO_INDICADORES.caixa.alertaCritico}</li>}
                            {colapsoAgilidade && <li>{DESCRICAO_INDICADORES.agilidade.alertaCritico}</li>}
                            {colapsoControle && <li>{DESCRICAO_INDICADORES.controle.alertaCritico}</li>}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
