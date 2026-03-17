import React, { useState } from 'react';

function IcoPremortem({ companyData, onSave }) {
    const preMortemList = companyData?.interna?.premortem || [];

    const [fator, setFator] = useState('');
    const [origem, setOrigem] = useState('');
    const [editingId, setEditingId] = useState(null);

    const handleAddRisk = async (e) => {
        e.preventDefault();
        if (!fator || !origem) {
            alert("Preencha o fator de risco e a origem.");
            return;
        }

        const classificacao = origem === 'interna' ? 'fraqueza' : 'ameaca';
        const novoItem = {
            texto: fator,
            tipo: classificacao,
            id: editingId || Date.now()
        };

        let updatedList;
        if (editingId) {
            updatedList = preMortemList.map(item => item.id === editingId ? novoItem : item);
        } else {
            updatedList = [...preMortemList, novoItem];
        }

        await onSave({
            ...companyData,
            interna: { ...companyData.interna, premortem: updatedList }
        });

        resetForm();
    };

    const resetForm = () => {
        setFator('');
        setOrigem('');
        setEditingId(null);
    };

    const startEditRisk = (item) => {
        setEditingId(item.id);
        setFator(item.texto);
        setOrigem(item.tipo === 'fraqueza' ? 'interna' : 'externa');
        window.scrollTo({ top: document.getElementById('premortem-form-container').offsetTop - 50, behavior: 'smooth' });
    };

    const handleDeleteRisk = async (idParaDeletar) => {
        if (!window.confirm("Certeza que deseja deletar este Risco?")) return;

        const updatedList = preMortemList.filter(item => item.id !== idParaDeletar);
        
        await onSave({
            ...companyData,
            interna: { ...companyData.interna, premortem: updatedList }
        });

        if (editingId === idParaDeletar) resetForm();
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">Análise de Riscos (Premortem)</h2>
                <p className="text-gray-400 mb-6">Imagine que o seu projeto deu totalmente errado. Quais foram as causas que levaram a esse fracasso?</p>
                
                <form id="premortem-form-container" onSubmit={handleAddRisk} className="space-y-4 md:space-y-0 md:flex md:items-end md:gap-4 mb-8">
                    <div className="flex-grow">
                        <label className="block mb-2 font-medium text-gray-300">Fator de Risco Crítico</label>
                        <input 
                            type="text" 
                            value={fator}
                            onChange={(e) => setFator(e.target.value)}
                            className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none" 
                            placeholder="Ex: Falta de caixa, Mudança brusca na lei, Fuga de talentos..." 
                        />
                    </div>
                    
                    <div className="w-full md:w-64">
                         <label className="block mb-2 font-medium text-gray-300">Origem Principal</label>
                         <div className="flex gap-4 p-2 bg-gray-700 rounded-lg">
                             <label className="flex items-center text-gray-300 cursor-pointer">
                                 <input 
                                     type="radio" 
                                     name="origem" 
                                     value="interna" 
                                     checked={origem === 'interna'}
                                     onChange={(e) => setOrigem(e.target.value)}
                                     className="h-4 w-4 text-cyan-500 bg-gray-600" 
                                 />
                                 <span className="ml-2 text-sm">Interna (Nossa culpa)</span>
                             </label>
                             <label className="flex items-center text-gray-300 cursor-pointer">
                                 <input 
                                     type="radio" 
                                     name="origem" 
                                     value="externa" 
                                     checked={origem === 'externa'}
                                     onChange={(e) => setOrigem(e.target.value)}
                                     className="h-4 w-4 text-cyan-500 bg-gray-600" 
                                 />
                                 <span className="ml-2 text-sm">Externa (Fora de controle)</span>
                             </label>
                         </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <button type="submit" className="flex-grow md:flex-grow-0 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg whitespace-nowrap">
                            {editingId ? 'Salvar' : 'Adicionar Risco'}
                        </button>
                        {editingId && (
                            <button type="button" onClick={resetForm} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg text-lg">
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>

                <div>
                    <h3 className="text-xl font-semibold mb-4 text-white">Cenários de Fracasso Mapeados ({preMortemList.length}):</h3>
                    {preMortemList.length === 0 ? (
                        <p className="text-gray-500 bg-gray-900 p-4 rounded-lg">Nenhum risco projetado ainda.</p>
                    ) : (
                        <ul className="space-y-3">
                            {preMortemList.map(item => {
                                const isFraqueza = item.tipo === 'fraqueza';
                                const tagClass = isFraqueza ? 'text-red-400' : 'text-yellow-400';
                                const tagText = isFraqueza ? 'Fraqueza (Interna)' : 'Ameaça (Externa)';

                                return (
                                    <li key={item.id} className="flex flex-col sm:flex-row justify-between p-4 rounded-lg bg-gray-700 border border-gray-600">
                                        <div>
                                            <span className={`${tagClass} font-bold mr-2 text-sm uppercase`}>[{tagText}]</span> 
                                            <span className="text-gray-200 text-lg">{item.texto}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-3 sm:mt-0">
                                            <button onClick={() => startEditRisk(item)} className="font-medium text-cyan-500 hover:text-cyan-400">Editar</button>
                                            <button onClick={() => handleDeleteRisk(item.id)} className="font-medium text-red-500 hover:text-red-400">Excluir</button>
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

export default IcoPremortem;
