import React, { useState } from 'react';

function IcoVrio({ companyData, onSave }) {
    const inventario = companyData?.inventario || [];
    const vrioList = companyData?.interna?.vrio || [];
    const vrioAnalyzedIds = vrioList.map(item => item.id);

    const [editingVrioId, setEditingVrioId] = useState(null);
    const [selectedRecursoId, setSelectedRecursoId] = useState('');
    const [vrioForm, setVrioForm] = useState({
        v: '', v_obs: '',
        r: '', r_obs: '',
        i: '', i_obs: '',
        o: '', o_obs: ''
    });

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setVrioForm(prev => ({ ...prev, [name]: value }));
    };

    const handleAddVrio = async (e) => {
        e.preventDefault();
        
        const recursoId = parseInt(selectedRecursoId, 10);
        if (!recursoId && !editingVrioId) {
            alert('Por favor, selecione um recurso válido para analisar.');
            return;
        }

        const idToUse = editingVrioId || recursoId;
        const inventarioItem = inventario.find(item => item.id === idToUse);
        
        if (!inventarioItem) {
            alert('Recurso não encontrado no inventário.');
            return;
        }

        if (!vrioForm.v || !vrioForm.r || !vrioForm.i || !vrioForm.o) {
            alert('Por favor, responda a todas as perguntas VRIO (Sim/Não).');
            return;
        }

        const newVrioData = {
            id: idToUse,
            nome: inventarioItem.nome,
            tipo: inventarioItem.tipo,
            ...vrioForm
        };

        let updatedVrioList;
        if (editingVrioId) {
            updatedVrioList = vrioList.map(item => item.id === editingVrioId ? newVrioData : item);
        } else {
            updatedVrioList = [...vrioList, newVrioData];
        }

        const newData = {
            ...companyData,
            interna: { ...companyData.interna, vrio: updatedVrioList }
        };

        await onSave(newData);
        resetForm();
    };

    const resetForm = () => {
        setEditingVrioId(null);
        setSelectedRecursoId('');
        setVrioForm({ v: '', v_obs: '', r: '', r_obs: '', i: '', i_obs: '', o: '', o_obs: '' });
    };

    const startEditVrio = (item) => {
        setEditingVrioId(item.id);
        setSelectedRecursoId(item.id.toString());
        setVrioForm({
            v: item.v || '', v_obs: item.v_obs || '',
            r: item.r || '', r_obs: item.r_obs || '',
            i: item.i || '', i_obs: item.i_obs || '',
            o: item.o || '', o_obs: item.o_obs || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteVrio = async (idParaDeletar) => {
        const confirmText = "Tem certeza que deseja excluir esta análise VRIO? A exclusão permitirá que o recurso no inventário seja removido.";
        if (!window.confirm(confirmText)) return;

        const updatedVrioList = vrioList.filter(item => item.id !== idParaDeletar);
        const newData = {
            ...companyData,
            interna: { ...companyData.interna, vrio: updatedVrioList }
        };

        await onSave(newData);
        if (editingVrioId === idParaDeletar) resetForm();
    };

    const checkIcon = <svg className="w-5 h-5 text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>;
    const xIcon = <svg className="w-5 h-5 text-red-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>;

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">Ambiente Interno: Matriz VRIO</h2>
                <p className="text-gray-400 mb-6">Analise os recursos e capacidades do seu inventário para identificar vantagens competitivas (Sustentável, Temporária ou Desvantagem).</p>
                
                <form onSubmit={handleAddVrio} className="space-y-6">
                    <div>
                        <label className="block mb-2 font-medium text-gray-300">Selecione um Recurso/Capacidade do Inventário:</label>
                        <select 
                            value={selectedRecursoId} 
                            onChange={(e) => setSelectedRecursoId(e.target.value)}
                            disabled={!!editingVrioId}
                            className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-50"
                        >
                            <option value="" disabled>Selecione um item</option>
                            {inventario.map(item => {
                                const isAnalyzed = vrioAnalyzedIds.includes(item.id);
                                const isCurrentlyEditing = editingVrioId === item.id;
                                const disableOption = isAnalyzed && !isCurrentlyEditing;
                                
                                return (
                                    <option key={item.id} value={item.id} disabled={disableOption}>
                                        {item.nome} {disableOption ? '(Já analisado)' : ''}
                                    </option>
                                );
                            })}
                            {inventario.length > 0 && inventario.every(item => vrioAnalyzedIds.includes(item.id)) && !editingVrioId && (
                                <option value="" disabled>-- Todos os itens foram analisados --</option>
                            )}
                            {inventario.length === 0 && (
                                <option value="" disabled>-- Nenhum item no inventário (Adicione na aba Início) --</option>
                            )}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* V: Valor */}
                        <div className="bg-gray-700 p-4 rounded-lg flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">V: Tem Valor?</h3>
                                <p className="text-sm text-gray-400 mb-4">O recurso permite explorar uma oportunidade ou neutralizar uma ameaça no ambiente?</p>
                                <div className="flex gap-4 mb-4">
                                    <label className="flex items-center text-gray-300 cursor-pointer">
                                        <input type="radio" name="v" value="sim" checked={vrioForm.v === 'sim'} onChange={handleFormChange} className="h-5 w-5 text-cyan-500 focus:ring-cyan-600 bg-gray-800 border-gray-600" />
                                        <span className="ml-2 font-semibold">Sim</span>
                                    </label>
                                    <label className="flex items-center text-gray-300 cursor-pointer">
                                        <input type="radio" name="v" value="nao" checked={vrioForm.v === 'nao'} onChange={handleFormChange} className="h-5 w-5 text-cyan-500 focus:ring-cyan-600 bg-gray-800 border-gray-600" />
                                        <span className="ml-2 font-semibold">Não</span>
                                    </label>
                                </div>
                            </div>
                            <textarea name="v_obs" value={vrioForm.v_obs} onChange={handleFormChange} rows="2" className="w-full bg-gray-800 text-white p-2 rounded-lg text-sm" placeholder="Justificativa..."></textarea>
                        </div>

                        {/* R: Raro */}
                        <div className="bg-gray-700 p-4 rounded-lg flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">R: É Raro?</h3>
                                <p className="text-sm text-gray-400 mb-4">O recurso é controlado por poucos ou apenas um concorrente?</p>
                                <div className="flex gap-4 mb-4">
                                    <label className="flex items-center text-gray-300 cursor-pointer">
                                        <input type="radio" name="r" value="sim" checked={vrioForm.r === 'sim'} onChange={handleFormChange} className="h-5 w-5 text-cyan-500 focus:ring-cyan-600 bg-gray-800 border-gray-600" />
                                        <span className="ml-2 font-semibold">Sim</span>
                                    </label>
                                    <label className="flex items-center text-gray-300 cursor-pointer">
                                        <input type="radio" name="r" value="nao" checked={vrioForm.r === 'nao'} onChange={handleFormChange} className="h-5 w-5 text-cyan-500 focus:ring-cyan-600 bg-gray-800 border-gray-600" />
                                        <span className="ml-2 font-semibold">Não</span>
                                    </label>
                                </div>
                            </div>
                            <textarea name="r_obs" value={vrioForm.r_obs} onChange={handleFormChange} rows="2" className="w-full bg-gray-800 text-white p-2 rounded-lg text-sm" placeholder="Justificativa..."></textarea>
                        </div>

                        {/* I: Inimitável */}
                        <div className="bg-gray-700 p-4 rounded-lg flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">I: É (difícil de) Imitar?</h3>
                                <p className="text-sm text-gray-400 mb-4">As empresas sem o recurso enfrentam uma desvantagem de custo para obtê-lo ou desenvolvê-lo?</p>
                                <div className="flex gap-4 mb-4">
                                    <label className="flex items-center text-gray-300 cursor-pointer">
                                        <input type="radio" name="i" value="sim" checked={vrioForm.i === 'sim'} onChange={handleFormChange} className="h-5 w-5 text-cyan-500 focus:ring-cyan-600 bg-gray-800 border-gray-600" />
                                        <span className="ml-2 font-semibold">Sim</span>
                                    </label>
                                    <label className="flex items-center text-gray-300 cursor-pointer">
                                        <input type="radio" name="i" value="nao" checked={vrioForm.i === 'nao'} onChange={handleFormChange} className="h-5 w-5 text-cyan-500 focus:ring-cyan-600 bg-gray-800 border-gray-600" />
                                        <span className="ml-2 font-semibold">Não</span>
                                    </label>
                                </div>
                            </div>
                            <textarea name="i_obs" value={vrioForm.i_obs} onChange={handleFormChange} rows="2" className="w-full bg-gray-800 text-white p-2 rounded-lg text-sm" placeholder="Justificativa..."></textarea>
                        </div>

                        {/* O: Organização */}
                        <div className="bg-gray-700 p-4 rounded-lg flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">O: Organizado para Capturar Valor?</h3>
                                <p className="text-sm text-gray-400 mb-4">As políticas e procedimentos da empresa suportam a exploração deste recurso?</p>
                                <div className="flex gap-4 mb-4">
                                    <label className="flex items-center text-gray-300 cursor-pointer">
                                        <input type="radio" name="o" value="sim" checked={vrioForm.o === 'sim'} onChange={handleFormChange} className="h-5 w-5 text-cyan-500 focus:ring-cyan-600 bg-gray-800 border-gray-600" />
                                        <span className="ml-2 font-semibold">Sim</span>
                                    </label>
                                    <label className="flex items-center text-gray-300 cursor-pointer">
                                        <input type="radio" name="o" value="nao" checked={vrioForm.o === 'nao'} onChange={handleFormChange} className="h-5 w-5 text-cyan-500 focus:ring-cyan-600 bg-gray-800 border-gray-600" />
                                        <span className="ml-2 font-semibold">Não</span>
                                    </label>
                                </div>
                            </div>
                            <textarea name="o_obs" value={vrioForm.o_obs} onChange={handleFormChange} rows="2" className="w-full bg-gray-800 text-white p-2 rounded-lg text-sm" placeholder="Justificativa..."></textarea>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button type="submit" className="w-full md:w-auto bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-8 rounded-lg text-lg">
                            {editingVrioId ? 'Salvar Alterações' : 'Adicionar Análise'}
                        </button>
                        {editingVrioId && (
                            <button type="button" onClick={resetForm} className="w-full md:w-auto bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Tabela de Análises VRIO */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg overflow-x-auto">
                <h3 className="text-xl font-semibold mb-4 text-white">Análises VRIO Realizadas</h3>
                {vrioList.length === 0 ? (
                    <p className="text-gray-500 bg-gray-900 p-4 rounded-lg">Nenhuma análise adicionada ainda.</p>
                ) : (
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3">Recurso/Capacidade</th>
                                <th scope="col" className="px-6 py-3">Tipo</th>
                                <th scope="col" className="px-6 py-3 text-center">Valor</th>
                                <th scope="col" className="px-6 py-3 text-center">Raridade</th>
                                <th scope="col" className="px-6 py-3 text-center">Inimitável</th>
                                <th scope="col" className="px-6 py-3 text-center">Organização</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vrioList.map(item => (
                                <tr key={item.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-750">
                                    <td className="px-6 py-4 font-medium whitespace-nowrap text-white">{item.nome}</td>
                                    <td className="px-6 py-4">{item.tipo}</td>
                                    <td className="px-6 py-4 text-center">{item.v === 'sim' ? checkIcon : xIcon}</td>
                                    <td className="px-6 py-4 text-center">{item.r === 'sim' ? checkIcon : xIcon}</td>
                                    <td className="px-6 py-4 text-center">{item.i === 'sim' ? checkIcon : xIcon}</td>
                                    <td className="px-6 py-4 text-center">{item.o === 'sim' ? checkIcon : xIcon}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => startEditVrio(item)} className="font-medium text-cyan-500 hover:underline">Editar</button>
                                            <button onClick={() => handleDeleteVrio(item.id)} className="font-medium text-red-500 hover:underline">Excluir</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default IcoVrio;
