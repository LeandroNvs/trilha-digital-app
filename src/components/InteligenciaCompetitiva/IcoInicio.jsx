import React, { useState, useEffect } from 'react';

function IcoInicio({ companyData, onSave }) {
    // Estado local para a Identificação (debounce visual de salvamento)
    const [identificacao, setIdentificacao] = useState(companyData?.identificacao || {});
    const [isSaving, setIsSaving] = useState(false);

    // Estado local para os inputs do Inventário
    const [invNome, setInvNome] = useState('');
    const [invTipo, setInvTipo] = useState('');
    const [invOrigem, setInvOrigem] = useState('');
    
    const [editingItem, setEditingItem] = useState(null);

    // Sincronizar caso mude externamente
    useEffect(() => {
        setIdentificacao(companyData?.identificacao || {});
    }, [companyData?.identificacao]);

    const handleIdentificacaoChange = (e) => {
        const { name, value } = e.target;
        setIdentificacao(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveIdentificacao = async () => {
        setIsSaving(true);
        const newData = { ...companyData, identificacao };
        await onSave(newData);
        
        setTimeout(() => setIsSaving(false), 1500); // Feedback visual
    };

    const handleAddInventario = async (e) => {
        e.preventDefault();
        if (!invNome || !invTipo || !invOrigem) return;

        const currentInventario = companyData?.inventario || [];
        const newItem = { id: Date.now(), nome: invNome, tipo: invTipo, origem: invOrigem };
        
        const newData = { ...companyData, inventario: [...currentInventario, newItem] };
        await onSave(newData);
        
        setInvNome('');
        setInvTipo('');
        setInvOrigem('');
    };

    const handleDeleteInventario = async (idParaDeletar) => {
        // Validação se já tem VRIO ativo (vem do VRIO futuramente)
        const isAnalized = companyData?.interna?.vrio?.some(v => v.id === idParaDeletar);
        if (isAnalized) {
            alert('Não é possível excluir este recurso, pois ele já possui uma análise VRIO associada. Remova a análise VRIO na aba Recursos primeiro.');
            return;
        }

        const confirmText = "Você tem certeza que deseja deletar este item do inventário?";
        if (!window.confirm(confirmText)) return;

        const currentInventario = companyData?.inventario || [];
        const newData = { 
            ...companyData, 
            inventario: currentInventario.filter(item => item.id !== idParaDeletar) 
        };
        await onSave(newData);
    };

    const startEditInventario = (item) => {
        setEditingItem(item);
    };

    const handleSaveEditInventario = async () => {
        if (!editingItem || !editingItem.nome || !editingItem.tipo || !editingItem.origem) return;

        const currentInventario = companyData?.inventario || [];
        const updatedInventario = currentInventario.map(item => 
            item.id === editingItem.id ? editingItem : item
        );
        
        // Também atualizar o nome na análise VRIO, caso já exista
        const currentVrioList = companyData?.interna?.vrio || [];
        const updatedVrioList = currentVrioList.map(v => 
            v.id === editingItem.id ? { ...v, nome: editingItem.nome } : v
        );

        const newData = { 
            ...companyData, 
            inventario: updatedInventario,
            interna: {
                 ...companyData.interna,
                 vrio: updatedVrioList
            }
        };
        await onSave(newData);
        setEditingItem(null);
    };

    const inventario = companyData?.inventario || [];

    return (
        <div className="space-y-6">
            {/* Seção Identificação */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">Identificação</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block mb-2 font-medium text-gray-300">Nome da Empresa/Projeto:</label>
                        <input type="text" name="nomeEmpresa" value={identificacao.nomeEmpresa || ''} onChange={handleIdentificacaoChange} className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none" placeholder="Digite o nome da sua empresa ou projeto" />
                    </div>
                    <div>
                        <label className="block mb-2 font-medium text-gray-300">Missão:</label>
                        <textarea rows="3" name="missao" value={identificacao.missao || ''} onChange={handleIdentificacaoChange} className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none" placeholder="Qual é a razão de existir da organização?"></textarea>
                    </div>
                    <div>
                        <label className="block mb-2 font-medium text-gray-300">Visão:</label>
                        <textarea rows="3" name="visao" value={identificacao.visao || ''} onChange={handleIdentificacaoChange} className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none" placeholder="Onde a organização quer chegar no futuro?"></textarea>
                    </div>
                    <div>
                        <label className="block mb-2 font-medium text-gray-300">Valores:</label>
                        <textarea rows="3" name="valores" value={identificacao.valores || ''} onChange={handleIdentificacaoChange} className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none" placeholder="Quais são os princípios que guiam as ações da organização?"></textarea>
                    </div>
                    <div className="mt-6 text-right">
                        <button 
                            onClick={handleSaveIdentificacao}
                            className={`font-bold py-2 px-6 rounded-lg transition-colors ${
                                isSaving ? 'bg-green-500 text-white' : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                            }`}
                        >
                            {isSaving ? 'Salvo!' : 'Salvar Identificação'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Inventário de Recursos */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">Inventário de Recursos e Capacidades</h2>
                <p className="text-gray-400 mb-6">Liste aqui os principais ativos que sua empresa utiliza para entregar a proposta de valor. Este será o ponto de partida para a análise VRIO.</p>
                
                <form onSubmit={handleAddInventario} className="space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
                    <div className="flex-grow">
                        <label className="block mb-2 font-medium text-gray-300">Nome do Recurso/Capacidade</label>
                        <input type="text" value={invNome} onChange={e => setInvNome(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none" placeholder="Ex: Marca forte, Equipe de P&D, Patente XYZ" />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="block mb-2 font-medium text-gray-300">Tipo</label>
                        <select value={invTipo} onChange={e => setInvTipo(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                            <option value="" disabled>Selecione</option>
                            <option value="recurso">Recurso</option>
                            <option value="capacidade">Capacidade</option>
                        </select>
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="block mb-2 font-medium text-gray-300">Origem</label>
                        <select value={invOrigem} onChange={e => setInvOrigem(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                            <option value="" disabled>Selecione</option>
                            <option value="interno">Desenvolvimento Interno</option>
                            <option value="externo">Aquisição Externa</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full md:w-auto bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg text-lg">Adicionar</button>
                </form>

                <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4 text-white">Itens no Inventário:</h3>
                    {inventario.length === 0 ? (
                        <p className="text-gray-500 bg-gray-900 p-4 rounded-lg">Nenhum item adicionado ainda.</p>
                    ) : (
                        <ul className="space-y-2 bg-gray-900 p-4 rounded-lg">
                            {inventario.map(item => (
                                <li key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700">
                                    <span className="text-gray-200">{item.nome}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold px-2 py-1 uppercase rounded-full text-cyan-300 bg-cyan-900/50 border border-cyan-800">{item.tipo}</span>
                                        <span className="text-xs font-semibold px-2 py-1 uppercase rounded-full text-gray-300 bg-gray-700 border border-gray-600">
                                            {item.origem === 'interno' ? 'Dev. Interno' : 'Aquis. Externa'}
                                        </span>
                                        <button onClick={() => startEditInventario(item)} className="ml-2 text-cyan-500 hover:text-cyan-400 font-medium">Editar</button>
                                        <button onClick={() => handleDeleteInventario(item.id)} className="ml-2 text-red-500 hover:text-red-400 font-medium">Excluir</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Modal de Edição Simples */}
            {editingItem && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-lg">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-6">Editar Recurso/Capacidade</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-2 font-medium text-gray-300">Nome:</label>
                                <input type="text" value={editingItem.nome} onChange={e => setEditingItem({...editingItem, nome: e.target.value})} className="w-full bg-gray-700 text-white p-3 rounded-lg" />
                            </div>
                            <div>
                                <label className="block mb-2 font-medium text-gray-300">Tipo:</label>
                                <select value={editingItem.tipo} onChange={e => setEditingItem({...editingItem, tipo: e.target.value})} className="w-full bg-gray-700 text-white p-3 rounded-lg">
                                    <option value="recurso">Recurso</option>
                                    <option value="capacidade">Capacidade</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-2 font-medium text-gray-300">Origem:</label>
                                <select value={editingItem.origem} onChange={e => setEditingItem({...editingItem, origem: e.target.value})} className="w-full bg-gray-700 text-white p-3 rounded-lg">
                                    <option value="interno">Desenvolvimento Interno</option>
                                    <option value="externo">Aquisição Externa</option>
                                </select>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button onClick={handleSaveEditInventario} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg">Salvar Alterações</button>
                                <button onClick={() => setEditingItem(null)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default IcoInicio;
