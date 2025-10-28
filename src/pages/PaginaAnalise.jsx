import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, appId } from '../firebase/config.js';
import ModalConfirmacao from '../components/ModalConfirmacao.jsx';

// --- Sub-componente da Aba Início (Identificação + Inventário) ---
function AbaInicio({ dadosAnalise, idDoGrupo }) {
    const [missao, setMissao] = useState('');
    const [visao, setVisao] = useState('');
    const [valores, setValores] = useState('');

    const [inventarioNome, setInventarioNome] = useState('');
    const [inventarioTipo, setInventarioTipo] = useState('');

    const inventario = dadosAnalise?.inventario || [];
    const grupoRef = doc(db, `/artifacts/${appId}/public/data/grupos`, idDoGrupo);

    useEffect(() => {
        if (dadosAnalise?.identificacao) {
            setMissao(dadosAnalise.identificacao.missao || '');
            setVisao(dadosAnalise.identificacao.visao || '');
            setValores(dadosAnalise.identificacao.valores || '');
        }
    }, [dadosAnalise]);

    const handleSave = async (campo, valor) => {
        try {
            await updateDoc(grupoRef, { [`analise.identificacao.${campo}`]: valor });
        } catch (error) { console.error("Erro ao salvar:", error); }
    };

    const handleAddInventario = async (e) => {
        e.preventDefault();
        if (!inventarioNome || !inventarioTipo) return;
        
        const novoItem = { id: Date.now(), nome: inventarioNome, tipo: inventarioTipo };
        const novoInventario = [...inventario, novoItem];
        
        try {
            await updateDoc(grupoRef, { "analise.inventario": novoInventario });
            setInventarioNome(''); setInventarioTipo('');
        } catch (error) { console.error("Erro ao adicionar item ao inventário:", error); }
    };

    const handleDeleteInventario = async (itemId) => {
        const vrioAnalises = dadosAnalise?.vrio || [];
        if (vrioAnalises.some(analise => analise.id === itemId)) {
            alert('Não é possível excluir este item, pois ele já possui uma análise VRIO associada. Remova a análise VRIO primeiro.');
            return;
        }
        const novoInventario = inventario.filter(item => item.id !== itemId);
        try {
            await updateDoc(grupoRef, { "analise.inventario": novoInventario });
        } catch (error) { console.error("Erro ao deletar item do inventário:", error); }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">Identificação Estratégica</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block mb-2 font-medium text-gray-300">Missão:</label>
                        <textarea rows="3" value={missao} onChange={(e) => setMissao(e.target.value)} onBlur={() => handleSave('missao', missao)} className="w-full bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-cyan-500" placeholder="Qual é a razão de existir da organização?"></textarea>
                    </div>
                    <div>
                        <label className="block mb-2 font-medium text-gray-300">Visão:</label>
                        <textarea rows="3" value={visao} onChange={(e) => setVisao(e.target.value)} onBlur={() => handleSave('visao', visao)} className="w-full bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-cyan-500" placeholder="Onde a organização quer chegar no futuro?"></textarea>
                    </div>
                    <div>
                        <label className="block mb-2 font-medium text-gray-300">Valores:</label>
                        <textarea rows="3" value={valores} onChange={(e) => setValores(e.target.value)} onBlur={() => handleSave('valores', valores)} className="w-full bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-cyan-500" placeholder="Quais são os princípios que guiam as ações da organização?"></textarea>
                    </div>
                </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">Inventário de Recursos e Capacidades</h3>
                <form onSubmit={handleAddInventario} className="space-y-4 md:flex md:items-end md:gap-4 mb-8">
                    <div className="flex-grow"><label className="block mb-2 font-medium">Nome</label><input type="text" value={inventarioNome} onChange={e => setInventarioNome(e.target.value)} className="w-full bg-gray-700 p-3 rounded-lg" required /></div>
                    <div className="w-full md:w-1/4"><label className="block mb-2 font-medium">Tipo</label><select value={inventarioTipo} onChange={e => setInventarioTipo(e.target.value)} className="w-full bg-gray-700 p-3 rounded-lg" required><option value="">Selecione</option><option value="recurso">Recurso</option><option value="capacidade">Capacidade</option></select></div>
                    <button type="submit" className="w-full md:w-auto bg-cyan-500 hover:bg-cyan-600 font-bold py-3 px-6 rounded-lg">Adicionar</button>
                </form>
                <ul className="space-y-2">
                    {inventario.map(item => (
                        <li key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-700">
                            <span>{item.nome} <span className="text-xs bg-cyan-200 text-cyan-800 font-semibold px-2 py-1 rounded-full ml-2">{item.tipo}</span></span>
                            <button onClick={() => handleDeleteInventario(item.id)} className="text-red-400 hover:text-red-300">Excluir</button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}


// --- Sub-componente da Aba Recursos (VRIO) ---
function AbaRecursos({ dadosAnalise, idDoGrupo }) {
    const inventario = dadosAnalise?.inventario || [];
    const vrioAnalises = dadosAnalise?.vrio || [];
    
    const [formState, setFormState] = useState({ recursoId: '', v: '', r: '', i: '', o: '' });
    const [editandoId, setEditandoId] = useState(null);
    const grupoRef = doc(db, `/artifacts/${appId}/public/data/grupos`, idDoGrupo);

    const itensNaoAnalisados = useMemo(() => 
        inventario.filter(item => !vrioAnalises.some(analise => analise.id === item.id)),
        [inventario, vrioAnalises]
    );

    const limparForm = () => {
        setFormState({ recursoId: '', v: '', r: '', i: '', o: '' });
        setEditandoId(null);
    };
    
    const handleFormChange = (campo, valor) => {
        setFormState(prev => ({ ...prev, [campo]: valor }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { recursoId, v, r, i, o } = formState;
        if (!recursoId || !v || !r || !i || !o) return;
        
        const inventarioItem = inventario.find(item => item.id === parseInt(recursoId));
        const novaAnalise = { id: parseInt(recursoId), nome: inventarioItem.nome, tipo: inventarioItem.tipo, v, r, i, o };

        const novasAnalises = editandoId 
            ? vrioAnalises.map(analise => analise.id === editandoId ? novaAnalise : analise)
            : [...vrioAnalises, novaAnalise];

        try {
            await updateDoc(grupoRef, { "analise.vrio": novasAnalises });
            limparForm();
        } catch (error) { console.error("Erro ao salvar VRIO:", error); }
    };

    const handleEdit = (analise) => {
        setEditandoId(analise.id);
        setFormState({ recursoId: analise.id.toString(), v: analise.v, r: analise.r, i: analise.i, o: analise.o });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        const novasAnalises = vrioAnalises.filter(analise => analise.id !== id);
        try {
            await updateDoc(grupoRef, { "analise.vrio": novasAnalises });
        } catch (error) { console.error("Erro ao deletar VRIO:", error); }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">{editandoId ? 'Editando Análise' : 'Nova Análise'} VRIO</h3>
                <div>
                    <label className="block mb-2 font-medium text-gray-300">1. Selecione o Recurso/Capacidade</label>
                    <select value={formState.recursoId} onChange={e => handleFormChange('recursoId', e.target.value)} className="w-full bg-gray-700 p-3 rounded-lg" disabled={!!editandoId} required>
                        <option value="">-- Selecione um item do inventário --</option>
                        {editandoId && <option value={editandoId}>{inventario.find(item => item.id === editandoId)?.nome}</option>}
                        {itensNaoAnalisados.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
                    </select>
                </div>
                {Object.entries({v:'Valioso', r:'Raro', i:'Inimitável', o:'Organizado'}).map(([letra, nome], index) => (
                    <fieldset key={letra}>
                        <legend className="font-medium text-gray-300 mb-1">{index + 2}. {nome}?</legend>
                        <div className="flex gap-4">
                            <label className="flex items-center"><input type="radio" name={letra} value="sim" checked={formState[letra] === 'sim'} onChange={(e) => handleFormChange(letra, e.target.value)} required className="h-4 w-4 text-cyan-500 bg-gray-600 border-gray-500"/> <span className="ml-2">Sim</span></label>
                            <label className="flex items-center"><input type="radio" name={letra} value="nao" checked={formState[letra] === 'nao'} onChange={(e) => handleFormChange(letra, e.target.value)} className="h-4 w-4 text-cyan-500 bg-gray-600 border-gray-500"/> <span className="ml-2">Não</span></label>
                        </div>
                    </fieldset>
                ))}
                <div className="flex gap-4">
                    <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-6 rounded-lg">{editandoId ? 'Salvar Alterações' : 'Adicionar Análise'}</button>
                    {editandoId && <button type="button" onClick={limparForm} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-6 rounded-lg">Cancelar</button>}
                </div>
            </form>
            <div>
                <h3 className="text-xl font-semibold mb-4">Recursos Analisados</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-700 text-gray-400"><tr><th className="px-6 py-3">Nome</th><th className="px-6 py-3 text-center">V</th><th className="px-6 py-3 text-center">R</th><th className="px-6 py-3 text-center">I</th><th className="px-6 py-3 text-center">O</th><th className="px-6 py-3">Ações</th></tr></thead>
                        <tbody>
                            {vrioAnalises.map(item => (
                                <tr key={item.id} className="bg-gray-800 border-b border-gray-700">
                                    <td className="px-6 py-4 font-medium text-white">{item.nome}</td>
                                    <td className="px-6 py-4 text-center">{item.v === 'sim' ? '✔️' : '❌'}</td>
                                    <td className="px-6 py-4 text-center">{item.r === 'sim' ? '✔️' : '❌'}</td>
                                    <td className="px-6 py-4 text-center">{item.i === 'sim' ? '✔️' : '❌'}</td>
                                    <td className="px-6 py-4 text-center">{item.o === 'sim' ? '✔️' : '❌'}</td>
                                    <td className="px-6 py-4"><button onClick={() => handleEdit(item)} className="text-yellow-400 mr-4">Editar</button><button onClick={() => handleDelete(item.id)} className="text-red-400">Excluir</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- Componente Principal da Página de Análise ---
function PaginaAnalise() {
    const { grupoId } = useParams();
    const [grupo, setGrupo] = useState(null);
    const [abaAtiva, setAbaAtiva] = useState('inicio');

    useEffect(() => {
        if (!grupoId) return;
        const grupoRef = doc(db, `/artifacts/${appId}/public/data/grupos`, grupoId);
        const unsubscribe = onSnapshot(grupoRef, (doc) => {
            if (doc.exists()) {
                const dados = doc.data();
                if (!dados.analise) {
                    dados.analise = { inventario: [], vrio: [] }; // Inicializa a estrutura de análise
                }
                setGrupo({ id: doc.id, ...dados });
            } else { setGrupo(null); }
        });
        return () => unsubscribe();
    }, [grupoId]);

    const abas = [
        { id: 'inicio', label: '1. Início' },
        { id: 'recursos', label: '2. Recursos (VRIO)' },
        { id: 'macroambiente', label: '3. Macroambiente' },
        { id: 'competitivo', label: '4. Competição' },
        { id: 'riscos', label: '5. Riscos' },
        { id: 'rede', label: '6. Rede' },
        { id: 'swot', label: '7. SWOT' },
        { id: 'tows', label: '8. Estratégia' },
    ];

    if (!grupo) return <div className="text-center text-gray-400">Carregando...</div>;

    return (
        <div className="animate-fade-in">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-cyan-400">Análise do Grupo: {grupo.nome}</h1>
                <Link to="/analise" className="text-cyan-400 hover:underline">&larr; Voltar para a seleção de projetos</Link>
            </header>

            <nav className="flex flex-wrap justify-center bg-gray-800 rounded-lg p-2 mb-8 gap-2">
                {abas.map(tab => (
                    <button key={tab.id} onClick={() => setAbaAtiva(tab.id)} className={`px-4 py-2 rounded-md font-semibold flex-grow transition-colors ${abaAtiva === tab.id ? 'bg-cyan-500' : 'bg-gray-700 hover:bg-cyan-600'}`}>
                        {tab.label}
                    </button>
                ))}
            </nav>

            <main>
                {abaAtiva === 'inicio' && <AbaInicio dadosAnalise={grupo.analise} idDoGrupo={grupo.id} />}
                {abaAtiva === 'recursos' && <AbaRecursos dadosAnalise={grupo.analise} idDoGrupo={grupo.id} />}
                {abaAtiva !== 'inicio' && abaAtiva !== 'recursos' && <div className="text-center text-gray-500 py-10">Módulo <span className="font-bold">{abas.find(a=>a.id === abaAtiva)?.label}</span> em construção.</div>}
            </main>
        </div>
    );
}

export default PaginaAnalise;

