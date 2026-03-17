import React from 'react';

function IcoPorter({ companyData, onSave }) {
    const porterData = companyData?.externa?.porter || {};

    const porterForces = [
        { 
            id: 'concorrentes', 
            titulo: 'Rivalidade entre Concorrentes', 
            icone: '⚔️', 
            desc: 'Quão intensa é a competição atual? Muitos concorrentes, baixo crescimento do mercado ou produtos pouco diferenciados aumentam a rivalidade (Ameaça Alta).' 
        },
        { 
            id: 'entrantes', 
            titulo: 'Ameaça de Novos Entrantes', 
            icone: '🚪', 
            desc: 'É fácil para novas empresas entrarem no seu mercado? Baixas barreiras de entrada (pouco capital necessário, ausência de patentes) aumentam essa ameaça.' 
        },
        { 
            id: 'substitutos', 
            titulo: 'Ameaça de Produtos Substitutos', 
            icone: '🔄', 
            desc: 'Existem alternativas fora da sua indústria que resolvem o mesmo problema do cliente (ex: videoconferência vs. viagens de negócios)?' 
        },
        { 
            id: 'fornecedores', 
            titulo: 'Poder de Negociação dos Fornecedores', 
            icone: '🏭', 
            desc: 'Seus fornecedores têm poder de ditar preços ou condições? (Ocorre quando há poucos fornecedores ou o insumo é essencial).' 
        },
        { 
            id: 'compradores', 
            titulo: 'Poder de Negociação dos Compradores', 
            icone: '🛒', 
            desc: 'Seus clientes podem facilmente forçar a queda de preços ou exigir mais qualidade? (Ocorre quando os clientes compram em grande volume ou há muitas alternativas).' 
        }
    ];

    const handlePorterChange = (id, field, value) => {
        const currentForce = porterData[id] || { intensity: '', justificativa: '' };
        
        const newPorter = {
            ...porterData,
            [id]: {
                ...currentForce,
                [field]: value
            }
        };

        onSave({ 
            ...companyData, 
            externa: { ...companyData.externa, porter: newPorter } 
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">Ambiente Competitivo (5 Forças de Porter)</h2>
                <p className="text-gray-400 mb-6">Analise a atratividade e a intensidade competitiva da sua indústria (Microambiente).</p>

                <div className="space-y-4">
                    {porterForces.map(force => {
                        const savedData = porterData[force.id] || { intensity: '', justificativa: '' };
                        
                        return (
                            <div key={force.id} className="bg-gray-700 p-4 rounded-lg flex flex-col md:flex-row gap-4 transition-colors border border-transparent hover:border-cyan-800">
                                
                                {/* Info Section */}
                                <div className="md:w-1/3 flex flex-col justify-center">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <span>{force.icone}</span> {force.titulo}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-2">{force.desc}</p>
                                </div>

                                {/* Form Section */}
                                <div className="md:w-2/3 flex flex-col gap-3">
                                    {/* Radios for Intensity */}
                                    <div>
                                        <p className="block text-sm font-medium text-gray-300 mb-2">Nível da Ameaça/Intensidade:</p>
                                        <div className="flex flex-wrap gap-4">
                                            <label className="flex items-center text-gray-300 cursor-pointer hover:text-cyan-400">
                                                <input 
                                                    type="radio" 
                                                    name={`${force.id}_intensity`} 
                                                    value="baixa" 
                                                    checked={savedData.intensity === 'baixa'}
                                                    onChange={(e) => handlePorterChange(force.id, 'intensity', e.target.value)}
                                                    className="h-4 w-4 text-cyan-500 focus:ring-cyan-600 bg-gray-800 border-gray-600" 
                                                />
                                                <span className="ml-2 font-medium">Baixa (Oportunidade)</span>
                                            </label>
                                            <label className="flex items-center text-gray-300 cursor-pointer hover:text-cyan-400">
                                                <input 
                                                    type="radio" 
                                                    name={`${force.id}_intensity`} 
                                                    value="media" 
                                                    checked={savedData.intensity === 'media'}
                                                    onChange={(e) => handlePorterChange(force.id, 'intensity', e.target.value)}
                                                    className="h-4 w-4 text-yellow-500 focus:ring-yellow-600 bg-gray-800 border-gray-600" 
                                                />
                                                <span className="ml-2 font-medium">Média (Ameaça)</span>
                                            </label>
                                            <label className="flex items-center text-gray-300 cursor-pointer hover:text-cyan-400">
                                                <input 
                                                    type="radio" 
                                                    name={`${force.id}_intensity`} 
                                                    value="alta" 
                                                    checked={savedData.intensity === 'alta'}
                                                    onChange={(e) => handlePorterChange(force.id, 'intensity', e.target.value)}
                                                    className="h-4 w-4 text-red-500 focus:ring-red-600 bg-gray-800 border-gray-600" 
                                                />
                                                <span className="ml-2 font-medium">Alta (Ameaça)</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    {/* Justificativa */}
                                    <textarea 
                                        value={savedData.justificativa} 
                                        onChange={(e) => handlePorterChange(force.id, 'justificativa', e.target.value)}
                                        rows="2" 
                                        className="w-full bg-gray-800 text-white p-3 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none placeholder-gray-500" 
                                        placeholder="Justifique a sua avaliação (Opcional, mas recomendado)..."
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default IcoPorter;
