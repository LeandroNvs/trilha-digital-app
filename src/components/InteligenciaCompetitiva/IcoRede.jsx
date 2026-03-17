import React, { useState } from 'react';

function IcoRede({ companyData, onSave }) {
    const redeConfig = companyData?.rede || {};
    const atoresList = companyData?.rede?.atores || [];

    // Estado da Configuração da Rede (Auto-save no change)
    const handleConfigChange = (field, value) => {
        onSave({
            ...companyData,
            rede: { ...redeConfig, [field]: value }
        });
    };

    // Estados do Formulário de Atores
    const [actorForm, setActorForm] = useState({
        name: '', category: '', type: 'Pessoa Jurídica', influence: '', objective: '', resources: '',
        linkStrength: '', linkNature: '', linkDirection: '', linkFlow: ''
    });
    const [editingActorId, setEditingActorId] = useState(null);

    const handleActorFieldChange = (e) => {
        const { name, value } = e.target;
        setActorForm(prev => ({ ...prev, [name]: value }));
    };

    const handleAddActor = async (e) => {
        e.preventDefault();
        if (!actorForm.name) {
            alert('Por favor, informe pelo menos o Nome do Ator.');
            return;
        }

        const newActor = { ...actorForm, id: editingActorId || Date.now() };
        
        let updatedAtores;
        if (editingActorId) {
            updatedAtores = atoresList.map(a => a.id === editingActorId ? newActor : a);
        } else {
            updatedAtores = [...atoresList, newActor];
        }

        await onSave({
            ...companyData,
            rede: { ...redeConfig, atores: updatedAtores }
        });

        resetActorForm();
    };

    const resetActorForm = () => {
        setEditingActorId(null);
        setActorForm({
            name: '', category: '', type: 'Pessoa Jurídica', influence: '', objective: '', resources: '',
            linkStrength: '', linkNature: '', linkDirection: '', linkFlow: ''
        });
    };

    const startEditActor = (actor) => {
        setEditingActorId(actor.id);
        setActorForm({ ...actor });
        window.scrollTo({ top: document.getElementById('ator-form-wrapper').offsetTop - 30, behavior: 'smooth' });
    };

    const handleDeleteActor = async (idParaDeletar) => {
        if (!window.confirm("Certeza que deseja deletar este Ator da rede?")) return;

        const updatedAtores = atoresList.filter(a => a.id !== idParaDeletar);
        await onSave({
            ...companyData,
            rede: { ...redeConfig, atores: updatedAtores }
        });

        if (editingActorId === idParaDeletar) resetActorForm();
    };

    return (
        <div className="space-y-6">
             {/* Configuração Geral da Empresa Nível Rede */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">Características Gerais da Empresa na Rede</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block mb-2 font-medium text-gray-300">Categoria da Rede</label>
                        <select 
                            value={redeConfig.categoria || ''} 
                            onChange={e => handleConfigChange('categoria', e.target.value)}
                            className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-cyan-500"
                        >
                            <option value="" disabled>Selecione</option>
                            <option value="Mercado">Mercado (Relações impessoais, foco em transações, contratos simples)</option>
                            <option value="Hierarquia">Hierarquia (Relações hierárquicas, integração vertical, aquisições)</option>
                            <option value="Intermediária/Rede">Intermediária/Rede (Cooperação contínua, confiança, alianças estratégicas)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block mb-2 font-medium text-gray-300">Modelo de Relacionamento Predominante</label>
                        <select 
                            value={redeConfig.modelo || ''} 
                            onChange={e => handleConfigChange('modelo', e.target.value)}
                            className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-cyan-500"
                        >
                            <option value="" disabled>Selecione</option>
                            <option value="Hub-and-Spoke">Hub and Spoke (Sua empresa no centro, vários parceiros periféricos)</option>
                            <option value="Centro-Periferia">Centro-Periferia (Grupo central de parceiros fortes, e outros periféricos)</option>
                            <option value="Malha/Teia">Malha / Diversificada (Relacionamentos altamente interconectados e diversificados)</option>
                            <option value="Nenhum">Nenhum perfil predominante</option>
                        </select>
                    </div>
                     <div>
                        <label className="block mb-2 font-medium text-gray-300">Grau de Formalização da Rede</label>
                        <select 
                            value={redeConfig.formalizacao || ''} 
                            onChange={e => handleConfigChange('formalizacao', e.target.value)}
                            className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-cyan-500"
                        >
                            <option value="" disabled>Selecione</option>
                            <option value="Baixo">Baixo (Baseado em confiança e networking informal)</option>
                            <option value="Médio">Médio (Mistura de contratos padrão e confiança mútua)</option>
                            <option value="Alto">Alto (Altamente regulado, contratos rígidos e SLAs)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block mb-2 font-medium text-gray-300">Objetivo Estratégico na Rede</label>
                        <select 
                            value={redeConfig.objetivo || ''} 
                            onChange={e => handleConfigChange('objetivo', e.target.value)}
                            className="w-full bg-gray-700 text-white p-3 rounded-lg focus:ring-cyan-500"
                        >
                            <option value="" disabled>Selecione</option>
                            <option value="Acesso a Recursos">Acesso a Recursos (Buscar o que não temos internamente)</option>
                            <option value="Mitigação de Riscos">Mitigação de Riscos (Dividir riscos de P&D, novas entradas)</option>
                            <option value="Poder e Influência">Poder e Influência (Criar barreira de entrada, dominar canal)</option>
                            <option value="Aprendizado">Aprendizado e Inovação (Co-criar conhecimento)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Cadastro de Atores (Nós da Rede) */}
            <div id="ator-form-wrapper" className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-800 pb-2">Mapeamento de Atores / Stakeholders (Nós)</h3>
                
                <form onSubmit={handleAddActor} className="space-y-6 border border-gray-700 p-6 rounded-lg mb-8 bg-gray-900/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         <div>
                            <label className="block mb-1 text-sm font-medium text-gray-400">Nome do Ator</label>
                            <input name="name" value={actorForm.name} onChange={handleActorFieldChange} type="text" className="w-full bg-gray-800 text-white p-2 rounded focus:ring-cyan-500 outline-none" placeholder="Ex: Fornecedor X..." />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-400">Categoria</label>
                            <select name="category" value={actorForm.category} onChange={handleActorFieldChange} className="w-full bg-gray-800 text-white p-2 rounded">
                                <option value="" disabled>Selecione</option>
                                {['Cliente', 'Fornecedor', 'Concorrente', 'Complementador', 'Órgão Regulador', 'Comunidade', 'Investidor', 'Outro'].map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-400">Tipo de Ator</label>
                            <select name="type" value={actorForm.type} onChange={handleActorFieldChange} className="w-full bg-gray-800 text-white p-2 rounded">
                                <option value="Pessoa Física">Pessoa Física</option>
                                <option value="Pessoa Jurídica">Pessoa Jurídica</option>
                                <option value="Instituição Pública">Instituição Pública</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-400">Influência no Negócio</label>
                            <select name="influence" value={actorForm.influence} onChange={handleActorFieldChange} className="w-full bg-gray-800 text-white p-2 rounded">
                                <option value="" disabled>Selecione</option>
                                {['Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'].map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block mb-1 text-sm font-medium text-gray-400">Objetivo do Ator (Interesse)</label>
                            <textarea name="objective" value={actorForm.objective} onChange={handleActorFieldChange} rows="2" className="w-full bg-gray-800 text-white p-2 rounded" placeholder="O que ele busca na relação conosco?" />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-400">Recursos Aportados (Se houver)</label>
                            <textarea name="resources" value={actorForm.resources} onChange={handleActorFieldChange} rows="2" className="w-full bg-gray-800 text-white p-2 rounded" placeholder="Dinheiro, tempo, tecnologia, know-how..." />
                        </div>
                    </div>

                    {/* Vínculo Relacional */}
                    <div className="border-t border-gray-700 pt-4 mt-4">
                        <h4 className="text-md font-semibold text-gray-300 mb-3">Vínculo Relacional (Laço / Link)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block mb-1 text-xs text-gray-400">Força do Laço</label>
                                <select name="linkStrength" value={actorForm.linkStrength} onChange={handleActorFieldChange} className="w-full bg-gray-800 text-white p-2 rounded">
                                     <option value="" disabled>Selecione</option>
                                     {['Fraco (Transacional)', 'Médio (Recorrente)', 'Forte (Parceria)'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs text-gray-400">Natureza</label>
                                <select name="linkNature" value={actorForm.linkNature} onChange={handleActorFieldChange} className="w-full bg-gray-800 text-white p-2 rounded">
                                     <option value="" disabled>Selecione</option>
                                     {['Formal (Contratual)', 'Informal (Relacional)'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs text-gray-400">Direção</label>
                                <select name="linkDirection" value={actorForm.linkDirection} onChange={handleActorFieldChange} className="w-full bg-gray-800 text-white p-2 rounded">
                                     <option value="" disabled>Selecione</option>
                                     <option value="Unidirecional">Unidirecional</option>
                                     <option value="Bidirecional">Bidirecional</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs text-gray-400">Fluxo Principal</label>
                                <input name="linkFlow" value={actorForm.linkFlow} onChange={handleActorFieldChange} type="text" className="w-full bg-gray-800 text-white p-2 rounded text-sm block" placeholder="Ex: Info, Produtos, $$..." />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-8 rounded-lg">
                            {editingActorId ? 'Salvar Edição' : 'Adicionar Ator à Rede'}
                        </button>
                        {editingActorId && (
                            <button type="button" onClick={resetActorForm} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>

                {/* Tabela de Atores */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3">Ator</th>
                                <th scope="col" className="px-6 py-3">Categoria</th>
                                <th scope="col" className="px-6 py-3">Influência</th>
                                <th scope="col" className="px-6 py-3">Força do Laço</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {atoresList.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-4 text-center">Nenhum ator cadastrado na rede.</td></tr>
                            ) : (
                                atoresList.map(ator => (
                                    <tr key={ator.id} className="bg-gray-800 border-b border-gray-700">
                                        <td className="px-6 py-4 font-medium text-white">{ator.name}</td>
                                        <td className="px-6 py-4">{ator.category || '-'}</td>
                                        <td className="px-6 py-4">{ator.influence || '-'}</td>
                                        <td className="px-6 py-4">{ator.linkStrength || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => startEditActor(ator)} className="text-cyan-500 hover:text-cyan-400 font-medium">Editar</button>
                                                <button onClick={() => handleDeleteActor(ator.id)} className="text-red-500 hover:text-red-400 font-medium">Excluir</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}

export default IcoRede;
