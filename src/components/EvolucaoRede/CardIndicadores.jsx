import React from 'react';

export default function CardIndicadores({ pontuacoes }) {
    const {
        tempoTotalMeses = 18,
        janela,
        totalGargalos = 0,
        totalAssimetrias = 0,
        totalRigidezes = 0,
        caracteristicasConsolidadas = []
    } = pontuacoes;

    return (
        <div className="space-y-4">
            {/* Grid dos 3 Pilares Executivos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* CARD 1: TIME-TO-MARKET (CRONOGRAMA DE LANÇAMENTO) */}
                <div className="bg-gray-800/90 p-5 rounded-2xl border border-gray-700/80 shadow-lg flex flex-col justify-between space-y-3 relative overflow-hidden">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span>⏱️</span> Time-to-Market
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${janela?.corBg || 'bg-cyan-950 text-cyan-300 border-cyan-700'}`}>
                                {janela?.badge || 'Calculando'}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-3xl sm:text-4xl font-black text-white">
                                {tempoTotalMeses}
                            </span>
                            <span className="text-sm font-bold text-gray-400">meses até o lançamento</span>
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-snug border-t border-gray-700/60 pt-2.5">
                        {janela?.resumo?.slice(0, 120)}...
                    </p>
                </div>

                {/* CARD 2: GARGALOS ESTRUTURAIS ACUMULADOS */}
                <div className="bg-gray-800/90 p-5 rounded-2xl border border-gray-700/80 shadow-lg flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span>⛓️</span> Gargalos Estruturais
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-900 text-gray-300 border border-gray-700">
                                {totalGargalos} Ativados
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-3xl sm:text-4xl font-black text-blue-400">
                                {totalGargalos}
                            </span>
                            <span className="text-sm font-bold text-gray-400">gargalos na cadeia</span>
                        </div>
                    </div>
                    <div className="text-[11px] text-gray-300 border-t border-gray-700/60 pt-2.5">
                        <p className="leading-snug">
                            Dependência extrema, intermediações, especificidades de ativo e pontos cegos que exigem governança.
                        </p>
                    </div>
                </div>

                {/* CARD 3: ASSIMETRIAS E RIGIDEZ RELACIONAL */}
                <div className="bg-gray-800/90 p-5 rounded-2xl border border-gray-700/80 shadow-lg flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span>⚖️</span> Assimetrias & Rigidezes
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-900 text-gray-300 border border-gray-700">
                                {totalAssimetrias + totalRigidezes} Mapeadas
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-3xl sm:text-4xl font-black text-purple-400">
                                {totalAssimetrias + totalRigidezes}
                            </span>
                            <span className="text-sm font-bold text-gray-400">tensões relacionais</span>
                        </div>
                    </div>
                    <div className="text-[11px] text-gray-300 border-t border-gray-700/60 pt-2.5">
                        <p className="leading-snug">
                            Vazamentos de valor, retenção de dados por parceiros e herança inercial do H1 a serem governadas.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
