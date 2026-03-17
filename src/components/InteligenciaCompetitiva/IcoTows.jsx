import React, { useMemo, useState } from 'react';

function IcoTows({ companyData, onSave }) {
    const towsData = companyData?.estrategia?.tows || { ofensivas: [], confrontos: [], reforcos: [], defensivas: [] };

    // --- 1. Recalcular a SWOT para popular os Selects e Checkboxes ---
    const swot = useMemo(() => {
        const _swot = { forcas: new Set(), fraquezas: new Set(), oportunidades: new Set(), ameacas: new Set() };
        if (!companyData) return _swot;

        // Mesma lógica de extração do IcoSwot.jsx
        const vrio = companyData.interna?.vrio || [];
        const premortem = companyData.interna?.premortem || [];
        const pestel = companyData.externa?.pestel || {};
        const porter = companyData.externa?.porter || {};
        const customFatores = companyData.externa?.customFatores || [];

        vrio.forEach(item => {
            const v = item.v === 'sim'; const r = item.r === 'sim'; const i = item.i === 'sim'; const o = item.o === 'sim';
            if (v && r && o) _swot.forcas.add(`Vantagem Sustentável (VRIO): ${item.nome}.`);
            else if (v && o) _swot.fraquezas.add(`Constatação (Paridade VRIO): O recurso '${item.nome}' apenas iguala a concorrência, não gera diferencial.`);
            else if (!v) _swot.fraquezas.add(`Desvantagem (VRIO): O recurso '${item.nome}' não está gerando valor ao negócio.`);
            else if (v && !o) _swot.fraquezas.add(`Potencial Inexplorado (VRIO): '${item.nome}' é valioso, mas a empresa não está organizada para aproveitá-lo.`);
        });

        premortem.forEach(item => {
            if (item.tipo === 'fraqueza') _swot.fraquezas.add(`Risco Interno (Premortem): ${item.texto}`);
        });

        Object.keys(pestel).forEach(key => {
            const value = pestel[key];
            const labelKey = key.split('_')[0].toUpperCase();
            if (value.natureza === 'oportunidade') _swot.oportunidades.add(`Fator ${labelKey} (Oportunidade - Impacto ${value.impacto})`);
            else if (value.natureza === 'ameaca') _swot.ameacas.add(`Fator ${labelKey} (Ameaça - Impacto ${value.impacto})`);
        });

        customFatores.forEach(item => {
            if (item.tipo === 'oportunidade') _swot.oportunidades.add(`Fator Externo: ${item.texto}`);
            else if (item.tipo === 'ameaca') _swot.ameacas.add(`Fator Externo: ${item.texto}`);
        });

        Object.entries(porter).forEach(([key, value]) => {
            if (value.intensity === 'alta' || value.intensity === 'media') _swot.ameacas.add(`Força ${key.toUpperCase()} (Porter): Intensidade é ${value.intensity}, representando ameaça.`);
            else if (value.intensity === 'baixa') _swot.oportunidades.add(`Força ${key.toUpperCase()} (Porter): Baixa intensidade representa uma oportunidade.`);
        });

        premortem.forEach(item => {
            if (item.tipo === 'ameaca') _swot.ameacas.add(`Risco Externo (Premortem): ${item.texto}`);
        });

        return {
            forcas: Array.from(_swot.forcas),
            fraquezas: Array.from(_swot.fraquezas),
            oportunidades: Array.from(_swot.oportunidades),
            ameacas: Array.from(_swot.ameacas)
        };
    }, [companyData]);

    const hasSwotData = swot.forcas.length > 0 || swot.fraquezas.length > 0 || swot.oportunidades.length > 0 || swot.ameacas.length > 0;

    // --- 2. Gerenciamento de Formulários ---
    const initialFormState = {
        editingId: null, acao: '',
        fatorExternoOption: '', // Oportunidade ou Ameaça selecionada no dropdown
        fatoresInternosChecked: [] // Forças ou Fraquezas selecionadas nos checkboxes
    };

    const [forms, setForms] = useState({
        ofensivas: { ...initialFormState },
        confrontos: { ...initialFormState },
        reforcos: { ...initialFormState },
        defensivas: { ...initialFormState }
    });

    const handleFormChange = (tipo, field, value) => {
        setForms(prev => ({
            ...prev,
            [tipo]: { ...prev[tipo], [field]: value }
        }));
    };

    const handleCheckboxChange = (tipo, item) => {
        setForms(prev => {
            const currentChecked = prev[tipo].fatoresInternosChecked;
            const newChecked = currentChecked.includes(item)
                ? currentChecked.filter(i => i !== item)
                : [...currentChecked, item];
            return {
                ...prev,
                [tipo]: { ...prev[tipo], fatoresInternosChecked: newChecked }
            };
        });
    };

    const handleSubmit = async (e, tipo) => {
        e.preventDefault();
        const form = forms[tipo];

        if (!form.acao.trim() || !form.fatorExternoOption || form.fatoresInternosChecked.length === 0) {
            alert('Por favor, selecione os fatores externos/internos e descreva a ação estratégica.');
            return;
        }

        const novaEstrategia = {
            id: form.editingId || Date.now(),
            acao: form.acao.trim(),
            fatorExterno: form.fatorExternoOption,
            fatoresInternos: form.fatoresInternosChecked
        };

        const listaAtual = towsData[tipo] || [];
        let novaLista;

        if (form.editingId) {
            novaLista = listaAtual.map(est => est.id === form.editingId ? novaEstrategia : est);
        } else {
            novaLista = [...listaAtual, novaEstrategia];
        }

        await onSave({
            ...companyData,
            estrategia: {
                ...companyData.estrategia,
                tows: { ...towsData, [tipo]: novaLista }
            }
        });

        // Reset form after save
        handleFormChange(tipo, 'editingId', null);
        handleFormChange(tipo, 'acao', '');
        handleFormChange(tipo, 'fatorExternoOption', '');
        handleFormChange(tipo, 'fatoresInternosChecked', []);
    };

    const startEdit = (tipo, item) => {
        setForms(prev => ({
            ...prev,
            [tipo]: {
                editingId: item.id,
                acao: item.acao,
                fatorExternoOption: item.fatorExterno,
                fatoresInternosChecked: item.fatoresInternos
            }
        }));
    };

    const handleDelete = async (tipo, idParaDeletar) => {
        if (!window.confirm('Excluir esta estratégia?')) return;

        const listaAtual = towsData[tipo] || [];
        const novaLista = listaAtual.filter(est => est.id !== idParaDeletar);

        await onSave({
            ...companyData,
            estrategia: {
                ...companyData.estrategia,
                tows: { ...towsData, [tipo]: novaLista }
            }
        });
    };

    // --- 3. Calcular Fatores Não Utilizados ---
    const fatoresUsados = useMemo(() => {
        const usados = { forcas: new Set(), fraquezas: new Set(), oportunidades: new Set(), ameacas: new Set() };
        
        ['ofensivas', 'reforcos'].forEach(t => towsData[t]?.forEach(e => usados.oportunidades.add(e.fatorExterno)));
        ['confrontos', 'defensivas'].forEach(t => towsData[t]?.forEach(e => usados.ameacas.add(e.fatorExterno)));

        ['ofensivas', 'confrontos'].forEach(t => towsData[t]?.forEach(e => e.fatoresInternos?.forEach(f => usados.forcas.add(f))));
        ['reforcos', 'defensivas'].forEach(t => towsData[t]?.forEach(e => e.fatoresInternos?.forEach(f => usados.fraquezas.add(f))));

        return usados;
    }, [towsData]);


    // Componente Reutilizável de Bloco TOWS
    const renderTowsBlock = (tipo, titulo, corBg, corTexto, optionsExterno, listExterno, labelExterno, listInterno, labelInterno) => {
        const formState = forms[tipo];
        const estrategiasCriadas = towsData[tipo] || [];

        return (
            <div className={`mt-6 ${corBg} border ${corTexto.replace('text-', 'border-').replace('400', '800')} rounded-lg overflow-hidden`}>
                <div className={`p-4 border-b ${corTexto.replace('text-', 'border-').replace('400', '800/50')}`}>
                    <h3 className={`text-xl font-bold ${corTexto} flex items-center gap-2`}>{titulo}</h3>
                    <p className="text-gray-300 text-sm mt-1">Crie ações combinando {labelExterno.toLowerCase()} e {labelInterno.toLowerCase()}.</p>
                </div>
                
                <div className="p-4">
                    {/* Formulário */}
                    <form onSubmit={(e) => handleSubmit(e, tipo)} className="space-y-4 mb-6 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-300">Passo 1: Selecione a {labelExterno}</label>
                            <select 
                                value={formState.fatorExternoOption}
                                onChange={(e) => handleFormChange(tipo, 'fatorExternoOption', e.target.value)}
                                className="w-full bg-gray-700 text-white p-2.5 rounded-lg focus:ring-1 focus:outline-none text-sm"
                            >
                                <option value="" disabled>-- Selecione --</option>
                                {listExterno.map((item, idx) => <option key={idx} value={item}>{item}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-300">Passo 2: Selecione as {labelInterno}</label>
                            <div className="bg-gray-700 p-3 rounded-lg space-y-2 border border-gray-600 max-h-40 overflow-y-auto">
                                {listInterno.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma disponível.</p> : listInterno.map((item, idx) => (
                                    <label key={idx} className="flex items-start text-gray-300 cursor-pointer hover:text-white transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={formState.fatoresInternosChecked.includes(item)}
                                            onChange={() => handleCheckboxChange(tipo, item)}
                                            className="mt-1 mr-2 text-cyan-500 bg-gray-600 border-gray-500 focus:ring-cyan-600 rounded" 
                                        />
                                        <span className="text-sm leading-tight">{item}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-300">Passo 3: Descreva a Ação Estratégica</label>
                            <textarea 
                                value={formState.acao}
                                onChange={(e) => handleFormChange(tipo, 'acao', e.target.value)}
                                rows="2" 
                                className="w-full bg-gray-700 text-white p-2.5 rounded-lg focus:ring-1 focus:outline-none text-sm" 
                                placeholder="Descreva o que será feito..."
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors">
                                {formState.editingId ? 'Salvar Edição' : 'Adicionar Estratégia'}
                            </button>
                            {formState.editingId && (
                                <button type="button" onClick={() => handleFormChange(tipo, 'editingId', null)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors">
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Lista Criada */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-400 mb-3 border-b border-gray-700 pb-1 uppercase tracking-wider">Estratégias Cadastradas ({estrategiasCriadas.length})</h4>
                        {estrategiasCriadas.length === 0 ? (
                            <p className="text-gray-500 text-sm bg-gray-800 p-3 rounded text-center">Nenhuma estratégia formulada.</p>
                        ) : (
                            <ul className="space-y-3">
                                {estrategiasCriadas.map(estrategia => (
                                    <li key={estrategia.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-400 uppercase font-semibold">{labelExterno}:</p>
                                                <p className="font-semibold text-gray-200 text-sm mt-0.5">{estrategia.fatorExterno}</p>
                                                
                                                <p className="text-xs text-gray-400 mt-3 uppercase font-semibold">{labelInterno} Atreladas:</p>
                                                <ul className="list-disc list-inside text-gray-300 text-xs mt-1 space-y-1">
                                                    {estrategia.fatoresInternos.map((f, i) => <li key={i}>{f}</li>)}
                                                </ul>
                                                
                                                <p className="text-xs text-gray-400 mt-3 uppercase font-semibold">Plano de Ação:</p>
                                                <p className="text-cyan-400 text-sm mt-1">{estrategia.acao}</p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button onClick={() => startEdit(tipo, estrategia)} className="text-xs font-medium text-cyan-500 hover:underline">Editar</button>
                                                <button onClick={() => handleDelete(tipo, estrategia.id)} className="text-xs font-medium text-red-500 hover:underline">Excluir</button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (!hasSwotData) {
        return (
            <div className="bg-gray-800 p-8 text-center rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">Ação Estratégica (TOWS)</h2>
                <p className="text-gray-500 max-w-lg mx-auto">Para criar cruzamentos estratégicos, primeiro você precisa ter fatores identificados nas abas anteriores da Inteligência Competitiva (A Matriz SWOT precisa ter dados).</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-2 text-cyan-400 border-b-2 border-cyan-500 pb-2">Estratégias Cruzadas (Matriz TOWS)</h2>
                <p className="text-gray-400 mb-6 text-sm">Transforme sua análise SWOT em planos de ação práticos criando correlações entre os fatores internos e externos.</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
                    {renderTowsBlock('ofensivas', 'Estratégias Ofensivas (Desenvolvimento)', 'bg-green-900/10', 'text-green-400', 'Oportunidade', swot.oportunidades, 'Oportunidade', swot.forcas, 'Forças')}
                    {renderTowsBlock('confrontos', 'Estratégias de Confronto (Manutenção)', 'bg-blue-900/10', 'text-blue-400', 'Ameaça', swot.ameacas, 'Ameaça', swot.forcas, 'Forças')}
                    {renderTowsBlock('reforcos', 'Estratégias de Reforço (Crescimento)', 'bg-yellow-900/10', 'text-yellow-400', 'Oportunidade', swot.oportunidades, 'Oportunidade', swot.fraquezas, 'Fraquezas')}
                    {renderTowsBlock('defensivas', 'Estratégias Defensivas (Sobrevivência)', 'bg-red-900/10', 'text-red-400', 'Ameaça', swot.ameacas, 'Ameaça', swot.fraquezas, 'Fraquezas')}
                </div>
            </div>

            {/* Fatores SWOT Não Utilizados */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-8">
                <h3 className="text-xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-800 pb-2">Radar SWOT (Fatores sem Ação Estratégica)</h3>
                <p className="text-gray-400 mb-6 text-sm">Os itens abaixo apareceram na sua SWOT, mas ainda não foram incorporados em nenhuma estratégia TOWS acima.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <h4 className="text-sm font-bold text-green-400 mb-2 uppercase tracking-wide">Forças não usadas</h4>
                        <ul className="text-gray-300 text-xs space-y-1 bg-gray-900 p-3 rounded min-h-[80px]">
                            {swot.forcas.filter(f => !fatoresUsados.forcas.has(f)).map((f, i) => <li key={i}>• {f}</li>)}
                            {swot.forcas.filter(f => !fatoresUsados.forcas.has(f)).length === 0 && <li className="text-gray-600">Nenhum fator pendente.</li>}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">Fraquezas não mitigadas</h4>
                        <ul className="text-gray-300 text-xs space-y-1 bg-gray-900 p-3 rounded min-h-[80px]">
                            {swot.fraquezas.filter(f => !fatoresUsados.fraquezas.has(f)).map((f, i) => <li key={i}>• {f}</li>)}
                            {swot.fraquezas.filter(f => !fatoresUsados.fraquezas.has(f)).length === 0 && <li className="text-gray-600">Nenhum fator pendente.</li>}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-blue-400 mb-2 uppercase tracking-wide">Oportunidades Inexploradas</h4>
                        <ul className="text-gray-300 text-xs space-y-1 bg-gray-900 p-3 rounded min-h-[80px]">
                            {swot.oportunidades.filter(f => !fatoresUsados.oportunidades.has(f)).map((f, i) => <li key={i}>• {f}</li>)}
                            {swot.oportunidades.filter(f => !fatoresUsados.oportunidades.has(f)).length === 0 && <li className="text-gray-600">Nenhum fator pendente.</li>}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-yellow-400 mb-2 uppercase tracking-wide">Ameaças Ignoradas</h4>
                        <ul className="text-gray-300 text-xs space-y-1 bg-gray-900 p-3 rounded min-h-[80px]">
                            {swot.ameacas.filter(f => !fatoresUsados.ameacas.has(f)).map((f, i) => <li key={i}>• {f}</li>)}
                            {swot.ameacas.filter(f => !fatoresUsados.ameacas.has(f)).length === 0 && <li className="text-gray-600">Nenhum fator pendente.</li>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default IcoTows;
