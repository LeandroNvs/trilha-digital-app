import React, { useState } from 'react';

function IcoPestel({ companyData, onSave }) {
    const pestelData = companyData?.externa?.pestel || {};
    const customFatores = companyData?.externa?.customFatores || [];

    // Fatores fixos do PESTEL com suas descrições
    const fatoresPestel = [
        { id: 'politico_estabilidade', titulo: 'Estabilidade Política', icone: '⚖️', desc: 'Risco de mudanças drásticas no governo, conflitos ou corrupção.' },
        { id: 'politico_tributacao', titulo: 'Políticas de Tributação', icone: '💰', desc: 'Alterações em impostos que afetam custos e preços.' },
        { id: 'economico_crescimento', titulo: 'Crescimento Econômico', icone: '📈', desc: 'Expansão ou recessão da economia (PIB).' },
        { id: 'economico_juros_cambio', titulo: 'Taxas de Juros e Câmbio', icone: '💱', desc: 'Custo do crédito e impacto de moedas estrangeiras.' },
        { id: 'social_demografia', titulo: 'Demografia e Estilo de Vida', icone: '👥', desc: 'Mudanças na população (idade, renda) e hábitos de consumo.' },
        { id: 'social_educacao', titulo: 'Nível de Educação e Saúde', icone: '🎓', desc: 'Qualificação da mão de obra e preocupações com bem-estar.' },
        { id: 'tecnologico_inovacao', titulo: 'Inovação e P&D', icone: '💡', desc: 'Novas tecnologias que podem transformar o setor.' },
        { id: 'tecnologico_automacao', titulo: 'Automação e Digitalização', icone: '🤖', desc: 'Impacto da IA e processos digitais nas operações.' },
        { id: 'ambiental_sustentabilidade', titulo: 'Sustentabilidade e Clima', icone: '🌱', desc: 'Exigências ESG e impacto de mudanças climáticas.' },
        { id: 'ambiental_energia', titulo: 'Matriz Energética', icone: '⚡', desc: 'Custos e transição para energias renováveis.' },
        { id: 'legal_trabalhista', titulo: 'Legislação Trabalhista', icone: '🧑‍⚖️', desc: 'Leis que regulam a relação com funcionários.' },
        { id: 'legal_lgpd_cdd', titulo: 'Proteção de Dados (LGPD) e Consumidor', icone: '🔒', desc: 'Regras sobre privacidade e direitos do cliente.' }
    ];

    // Estados Locais para o Formulário Custom
    const [customFactor, setCustomFactor] = useState({
        texto: '', categoria: 'politico', impacto: 'Baixo', tipo: 'oportunidade'
    });
    const [editingCustomId, setEditingCustomId] = useState(null);

    // --- Manipulação dos Fatores Fixos PESTEL ---
    const handlePestelChange = (id, field, value) => {
        const currentFactor = pestelData[id] || { impacto: '', natureza: '', obs: '' };
        
        // Regra de UI: Se impacto for 'nenhum', limpa a natureza
        let newNatureza = currentFactor.natureza;
        if (field === 'impacto' && value === 'nenhum') {
            newNatureza = '';
        } else if (field === 'natureza') {
            newNatureza = value;
        }

        const newPestel = {
            ...pestelData,
            [id]: {
                ...currentFactor,
                [field]: value,
                natureza: newNatureza
            }
        };

        // Salvar imediatamente no Context/DB 
        // (Isso descarta a necessidade do botão "Salvar Análise" individual por fator,
        // melhorando a UX no React).
        onSave({ 
            ...companyData, 
            externa: { ...companyData.externa, pestel: newPestel } 
        });
    };

    // --- Manipulação dos Fatores Customizados ---
    const handleCustomChange = (e) => {
        const { name, value } = e.target;
        setCustomFactor(prev => ({ ...prev, [name]: value }));
    };

    const handleAddCustomFactor = async (e) => {
        e.preventDefault();
        if (!customFactor.texto) return;

        let updatedCustomFatores;
        if (editingCustomId) {
            updatedCustomFatores = customFatores.map(item => 
                item.id === editingCustomId ? { ...customFactor, id: editingCustomId } : item
            );
        } else {
            updatedCustomFatores = [...customFatores, { ...customFactor, id: Date.now() }];
        }

        await onSave({
            ...companyData,
            externa: { ...companyData.externa, customFatores: updatedCustomFatores }
        });

        resetCustomForm();
    };

    const resetCustomForm = () => {
        setEditingCustomId(null);
        setCustomFactor({ texto: '', categoria: 'politico', impacto: 'Baixo', tipo: 'oportunidade' });
    };

    const startEditCustom = (item) => {
        setEditingCustomId(item.id);
        setCustomFactor({
            texto: item.texto,
            categoria: item.categoria,
            impacto: item.impacto,
            tipo: item.tipo
        });
        window.scrollTo({ top: document.getElementById('custom-form-section').offsetTop - 100, behavior: 'smooth' });
    };

    const handleDeleteCustom = async (idParaDeletar) => {
        if (!window.confirm("Deseja excluir este fator personalizado?")) return;
        const updatedCustomFatores = customFatores.filter(item => item.id !== idParaDeletar);
        
        await onSave({
            ...companyData,
            externa: { ...companyData.externa, customFatores: updatedCustomFatores }
        });
        
        if (editingCustomId === idParaDeletar) resetCustomForm();
    };


    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">Ambiente Macro (PESTEL)</h2>
                <p className="text-gray-400 mb-6">Analise as forças macroambientais que podem impactar seu negócio de forma abrangente.</p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {fatoresPestel.map(fator => {
                        const savedData = pestelData[fator.id] || { impacto: '', natureza: '', obs: '' };
                        const hasImpact = savedData.impacto && savedData.impacto !== 'nenhum';
                        
                        return (
                            <div key={fator.id} className="bg-gray-700 p-4 rounded-lg flex flex-col gap-3 transition-colors border border-transparent hover:border-cyan-800">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <span>{fator.icone}</span> {fator.titulo}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">{fator.desc}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 mt-auto">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Impacto Previsto</label>
                                        <select 
                                            value={savedData.impacto} 
                                            onChange={(e) => handlePestelChange(fator.id, 'impacto', e.target.value)}
                                            className="w-full bg-gray-600 text-white p-2 rounded text-sm focus:ring-1 focus:ring-cyan-500 outline-none"
                                        >
                                            <option value="" disabled>Selecione</option>
                                            <option value="nenhum">Nenhum Impacto</option>
                                            <option value="baixo_cp">Baixo (Curto Prazo)</option>
                                            <option value="alto_cp">Alto (Curto Prazo)</option>
                                            <option value="baixo_lp">Baixo (Longo Prazo)</option>
                                            <option value="alto_lp">Alto (Longo Prazo)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Natureza</label>
                                        <select 
                                            value={savedData.natureza} 
                                            onChange={(e) => handlePestelChange(fator.id, 'natureza', e.target.value)}
                                            disabled={!hasImpact}
                                            className="w-full bg-gray-600 text-white p-2 rounded text-sm focus:ring-1 focus:ring-cyan-500 outline-none disabled:opacity-50"
                                        >
                                            <option value="" disabled>Selecione</option>
                                            <option value="oportunidade">Oportunidade</option>
                                            <option value="ameaca">Ameaça</option>
                                            <option value="ambigua">Ambígua / Incerta</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <textarea 
                                    value={savedData.obs} 
                                    onChange={(e) => handlePestelChange(fator.id, 'obs', e.target.value)}
                                    rows="1" 
                                    className="w-full bg-gray-800 text-white p-2 rounded text-sm mt-1 focus:ring-1 focus:ring-cyan-500 outline-none" 
                                    placeholder="Observações complementares..."
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Fatores Personalizados */}
            <div id="custom-form-section" className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-800 pb-2">Fatores Adicionais Personalizados</h3>
                <p className="text-gray-400 mb-6 text-sm">Adicione outros fatores específicos do seu mercado que não foram cobertos acima.</p>
                
                <form onSubmit={handleAddCustomFactor} className="space-y-4 md:space-y-0 md:flex md:items-end md:gap-4 mb-8">
                    <div className="flex-grow">
                        <label className="block mb-2 text-sm font-medium text-gray-300">Descrição do Fator</label>
                        <input type="text" name="texto" value={customFactor.texto} onChange={handleCustomChange} className="w-full bg-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Ex: Nova regulamentação setorial no estado..." />
                    </div>
                    <div className="w-full md:w-32">
                        <label className="block mb-2 text-sm font-medium text-gray-300">Categoria</label>
                        <select name="categoria" value={customFactor.categoria} onChange={handleCustomChange} className="w-full bg-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none">
                            <option value="politico">Político</option>
                            <option value="economico">Econômico</option>
                            <option value="social">Social</option>
                            <option value="tecnologico">Tecnológico</option>
                            <option value="ambiental">Ambiental</option>
                            <option value="legal">Legal</option>
                        </select>
                    </div>
                    <div className="w-full md:w-32">
                        <label className="block mb-2 text-sm font-medium text-gray-300">Impacto</label>
                        <select name="impacto" value={customFactor.impacto} onChange={handleCustomChange} className="w-full bg-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none">
                            <option value="Baixo">Baixo</option>
                            <option value="Médio">Médio</option>
                            <option value="Alto">Alto</option>
                        </select>
                    </div>
                    <div className="w-full md:w-40">
                        <label className="block mb-2 text-sm font-medium text-gray-300">Natureza</label>
                        <select name="tipo" value={customFactor.tipo} onChange={handleCustomChange} className="w-full bg-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none">
                            <option value="oportunidade">Oportunidade</option>
                            <option value="ameaca">Ameaça</option>
                            <option value="ambigua">Ambígua</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="w-full md:w-auto bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2.5 px-6 rounded-lg whitespace-nowrap">
                            {editingCustomId ? 'Salvar' : 'Adicionar'}
                        </button>
                        {editingCustomId && (
                            <button type="button" onClick={resetCustomForm} className="w-full md:w-auto bg-gray-600 hover:bg-gray-700 text-white font-bold py-2.5 px-4 rounded-lg">
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>

                <div>
                    {customFatores.length === 0 ? (
                        <p className="text-gray-500 bg-gray-900 p-4 rounded-lg text-sm">Nenhum fator personalizado adicionado.</p>
                    ) : (
                        <ul className="space-y-2">
                            {customFatores.map(item => {
                                let tagClass, tagText;
                                if(item.tipo === 'oportunidade') { tagClass = 'text-blue-400'; tagText = 'Oportunidade'; }
                                else if (item.tipo === 'ameaca') { tagClass = 'text-yellow-400'; tagText = 'Ameaça'; }
                                else { tagClass = 'text-gray-400'; tagText = 'Ambigua'; }

                                return (
                                    <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-gray-700 border border-gray-600 gap-2">
                                        <div className="flex-1">
                                            <span className="text-xs uppercase font-bold text-gray-400 mr-2 border border-gray-500 px-1 rounded">{item.categoria}</span>
                                            <span className={`${tagClass} font-bold mr-2 text-sm`}>[{tagText}]</span> 
                                            <span className="text-gray-200">{item.texto} </span>
                                            <span className="text-xs text-gray-400 ml-2">(Impacto: {item.impacto})</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 sm:mt-0">
                                            <button onClick={() => startEditCustom(item)} className="text-sm font-medium text-cyan-500 hover:text-cyan-400">Editar</button>
                                            <button onClick={() => handleDeleteCustom(item.id)} className="text-sm font-medium text-red-500 hover:text-red-400">Excluir</button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

export default IcoPestel;
