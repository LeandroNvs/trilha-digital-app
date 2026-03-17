import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';

function IcoSwot({ companyData }) {
    // A SWOT é computada dinamicamente baseada nos dados das outras abas. 
    // É read-only nesta interface.
    
    const swot = useMemo(() => {
        const _swot = { forcas: new Set(), fraquezas: new Set(), oportunidades: new Set(), ameacas: new Set() };
        
        if (!companyData) return _swot;

        const vrio = companyData.interna?.vrio || [];
        const premortem = companyData.interna?.premortem || [];
        const pestel = companyData.externa?.pestel || {};
        const porter = companyData.externa?.porter || {};
        const customFatores = companyData.externa?.customFatores || [];

        // 1. Análise Interna (VRIO e Premortem) -> Forças e Fraquezas
        vrio.forEach(item => {
            const v = item.v === 'sim';
            const r = item.r === 'sim';
            const i = item.i === 'sim';
            const o = item.o === 'sim';

            if (v && r && o) { 
                if (i) { 
                    _swot.forcas.add(`Vantagem Sustentável (VRIO): ${item.nome}.`);
                } else {
                    _swot.forcas.add(`Vantagem Temporária (VRIO): ${item.nome}.`);
                }
            } else if (v && o) { 
                _swot.fraquezas.add(`Constatação (Paridade VRIO): O recurso '${item.nome}' apenas iguala a concorrência, não gera diferencial.`);
            } else if (!v) { 
                _swot.fraquezas.add(`Desvantagem (VRIO): O recurso '${item.nome}' não está gerando valor ao negócio.`);
            } else if (v && !o) {
                _swot.fraquezas.add(`Potencial Inexplorado (VRIO): '${item.nome}' é valioso, mas a empresa não está organizada para aproveitá-lo.`);
            }
        });

        premortem.forEach(item => {
            if (item.tipo === 'fraqueza') {
                _swot.fraquezas.add(`Risco Interno (Premortem): ${item.texto}`);
            }
        });

        // 2. Análise Externa (PESTEL, Porter, Premortem, Custom) -> Oportunidades e Ameaças
        Object.keys(pestel).forEach(key => {
            const value = pestel[key];
            // Para simplificar a exibição da label, quebramos a chave 'politico_estabilidade' para exibir bonito
            // Ex: "politico_estabilidade" -> "PESTEL (politico)"
            const labelKey = key.split('_')[0].toUpperCase();
            
            if (value.natureza === 'oportunidade') {
                _swot.oportunidades.add(`Fator ${labelKey} (Oportunidade - Impacto ${value.impacto})`);
            } else if (value.natureza === 'ameaca') {
                _swot.ameacas.add(`Fator ${labelKey} (Ameaça - Impacto ${value.impacto})`);
            }
        });

        customFatores.forEach(item => {
            if (item.tipo === 'oportunidade') {
                _swot.oportunidades.add(`Fator Externo: ${item.texto}`);
            } else if (item.tipo === 'ameaca') {
                _swot.ameacas.add(`Fator Externo: ${item.texto}`);
            }
        });

        Object.entries(porter).forEach(([key, value]) => {
            if (value.intensity === 'alta' || value.intensity === 'media') {
                _swot.ameacas.add(`Força ${key.toUpperCase()} (Porter): Intensidade é ${value.intensity}, representando ameaça.`);
            } else if (value.intensity === 'baixa') {
                _swot.oportunidades.add(`Força ${key.toUpperCase()} (Porter): Baixa intensidade representa uma oportunidade.`);
            }
        });

        premortem.forEach(item => {
            if (item.tipo === 'ameaca') {
                _swot.ameacas.add(`Risco Externo (Premortem): ${item.texto}`);
            }
        });

        return _swot;
    }, [companyData]);

    const forcas = Array.from(swot.forcas);
    const fraquezas = Array.from(swot.fraquezas);
    const oportunidades = Array.from(swot.oportunidades);
    const ameacas = Array.from(swot.ameacas);

    const exportToExcel = () => {
        const maxLength = Math.max(forcas.length, fraquezas.length, oportunidades.length, ameacas.length);
        const data = [['Forças', 'Fraquezas', 'Oportunidades', 'Ameaças']];
        
        for (let i = 0; i < maxLength; i++) {
            data.push([
                forcas[i] || '',
                fraquezas[i] || '',
                oportunidades[i] || '',
                ameacas[i] || '',
            ]);
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'SWOT');
        
        const empresaNome = companyData?.identificacao?.nomeEmpresa || 'Empresa';
        XLSX.writeFile(wb, `SWOT_${empresaNome.replace(/\s+/g, '_')}.xlsx`);
    };

    const hasData = forcas.length > 0 || fraquezas.length > 0 || oportunidades.length > 0 || ameacas.length > 0;

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b-2 border-cyan-500 pb-2">
                    <div>
                        <h2 className="text-2xl font-semibold text-cyan-400">Matriz SWOT Consolidada</h2>
                        <p className="text-gray-400 text-sm mt-1">Gerada automaticamente a partir das análises anteriores (VRIO, PESTEL, Porter e Premortem).</p>
                    </div>
                    {hasData && (
                        <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg whitespace-nowrap flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Exportar para Excel
                        </button>
                    )}
                </div>

                {!hasData ? (
                    <div className="text-center py-10 bg-gray-900 rounded-lg border border-gray-700">
                        <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-xl font-medium text-gray-300">A Matriz SWOT está vazia.</h3>
                        <p className="text-gray-500 mt-2 max-w-md mx-auto">Preencha as abas de Recursos (VRIO), Macroambiente (PESTEL), Ambiente Competitivo (Porter) e Riscos para que os dados apareçam aqui.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Forças */}
                        <div className="bg-green-900/40 border border-green-800 rounded-lg p-5">
                            <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2 border-b border-green-800/50 pb-2">
                                Forças (Strengths) <span className="bg-green-800 text-green-200 text-xs px-2 py-1 rounded-full">{forcas.length}</span>
                            </h3>
                            {forcas.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma constatada.</p> : (
                                <ul className="list-disc list-inside text-gray-300 space-y-2 text-sm">
                                    {forcas.map((item, idx) => <li key={idx} className="leading-tight">{item}</li>)}
                                </ul>
                            )}
                        </div>

                        {/* Fraquezas */}
                        <div className="bg-red-900/40 border border-red-800 rounded-lg p-5">
                            <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2 border-b border-red-800/50 pb-2">
                                Fraquezas (Weaknesses) <span className="bg-red-800 text-red-200 text-xs px-2 py-1 rounded-full">{fraquezas.length}</span>
                            </h3>
                            {fraquezas.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma constatada.</p> : (
                                <ul className="list-disc list-inside text-gray-300 space-y-2 text-sm">
                                    {fraquezas.map((item, idx) => <li key={idx} className="leading-tight">{item}</li>)}
                                </ul>
                            )}
                        </div>

                        {/* Oportunidades */}
                        <div className="bg-blue-900/40 border border-blue-800 rounded-lg p-5">
                            <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2 border-b border-blue-800/50 pb-2">
                                Oportunidades (Opportunities) <span className="bg-blue-800 text-blue-200 text-xs px-2 py-1 rounded-full">{oportunidades.length}</span>
                            </h3>
                            {oportunidades.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma constatada.</p> : (
                                <ul className="list-disc list-inside text-gray-300 space-y-2 text-sm">
                                    {oportunidades.map((item, idx) => <li key={idx} className="leading-tight">{item}</li>)}
                                </ul>
                            )}
                        </div>

                        {/* Ameaças */}
                        <div className="bg-yellow-900/40 border border-yellow-800 rounded-lg p-5">
                            <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2 border-b border-yellow-800/50 pb-2">
                                Ameaças (Threats) <span className="bg-yellow-800 text-yellow-200 text-xs px-2 py-1 rounded-full">{ameacas.length}</span>
                            </h3>
                            {ameacas.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma constatada.</p> : (
                                <ul className="list-disc list-inside text-gray-300 space-y-2 text-sm">
                                    {ameacas.map((item, idx) => <li key={idx} className="leading-tight">{item}</li>)}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default IcoSwot;
