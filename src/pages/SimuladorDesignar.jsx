import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore'; 
import { db, appId } from '../firebase/config';
import useCollection from '../hooks/useCollection'; 

const IconeEditar = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-2 text-gray-400 hover:text-yellow-400 cursor-pointer" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>;

function SimuladorDesignar() {
    const { simulacaoId } = useParams();
    const navigate = useNavigate();
    const [simulacao, setSimulacao] = useState(null);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');

    const { documents: grupos, isLoading: isLoadingGrupos, error: errorGrupos } = useCollection(`/artifacts/${appId}/public/data/grupos`);
    
    const empresasCollectionPath = `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas`;
    const { documents: empresas, isLoading: isLoadingEmpresas, error: errorEmpresas } = useCollection(empresasCollectionPath); 
    
    // { empresaId: grupoId }
    const [assign, setAssign] = useState({});

    const [editingEmpresaId, setEditingEmpresaId] = useState(null);
    const [editedName, setEditedName] = useState('');
    const [loadingName, setLoadingName] = useState(false);
    const [errorName, setErrorName] = useState('');

    useEffect(() => {
        if (empresas && empresas.length > 0) {
            const initialAssign = {};
            empresas.forEach(empresa => {
                initialAssign[empresa.id] = empresa.grupoId || '';
            });
            if (JSON.stringify(initialAssign) !== JSON.stringify(assign)) {
                setAssign(initialAssign);
            }
        }

        const docRef = doc(db, `/artifacts/${appId}/public/data/simulacoes`, simulacaoId);
        getDoc(docRef).then(docSnap => {
            if (docSnap.exists()) {
                setSimulacao(docSnap.data());
            } else {
                setErro("Simulação não encontrada.");
            }
        }).catch(err => {
             console.error("Erro ao buscar simulação:", err);
             setErro("Erro ao carregar dados da simulação.");
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [simulacaoId, db, empresas]);

    const handleSalvarDesignacoes = async () => {
        setLoading(true);
        setErro('');
        try {
            const batch = writeBatch(db);
            (empresas || []).forEach(empresa => {
                const empresaRef = doc(db, empresasCollectionPath, empresa.id);
                // remove Integrantes_Usuarios_IDs from DB just to clean up old docs
                batch.update(empresaRef, {
                    grupoId: assign[empresa.id] || ''
                });
            });
            await batch.commit();
            navigate('/simulador/admin');
        } catch (err) {
            console.error("Erro ao salvar designacoes:", err);
            setErro("Falha ao salvar as designacoes. Tente novamente.");
        }
        setLoading(false);
    };

    const handleEditNameClick = (empresa) => { setEditingEmpresaId(empresa.id); setEditedName(empresa.Nome_Empresa || empresa.id); setErrorName(''); };
    const handleNameChange = (event) => { setEditedName(event.target.value); };
    const handleCancelEdit = () => { setEditingEmpresaId(null); setEditedName(''); setErrorName(''); };
    const handleSaveName = async (empresaId) => {
        if (!editedName.trim()) { setErrorName("O nome não pode ficar em branco."); return; }
        setLoadingName(true); setErrorName('');
        try {
            const empresaRef = doc(db, empresasCollectionPath, empresaId);
            await updateDoc(empresaRef, { Nome_Empresa: editedName.trim() });
            setEditingEmpresaId(null); setEditedName('');
        } catch (err) { console.error("Erro:", err); setErrorName("Falha."); }
        setLoadingName(false);
    };

    if (isLoadingGrupos || isLoadingEmpresas) {
        return <div className="text-center p-10 text-gray-400 animate-pulse">Carregando dados...</div>;
    }

    const erroFatal = errorGrupos || errorEmpresas || erro;
    if (erroFatal) {
        const mensagemErro = typeof erroFatal === 'object' ? erroFatal.message : erroFatal;
        return <p className="text-red-400 bg-red-900 p-4 rounded-lg m-8">Erro: {mensagemErro}</p>;
    }

    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-cyan-400 mb-2">Designar Grupos para Empresas do Simulador</h2>
            <p className="text-lg text-gray-300 mb-8 pb-4 border-b border-gray-700">{simulacao?.Nome_Simulacao || 'Carregando nome...'}</p>

            {errorName && <p className="text-red-400 bg-red-900 p-3 rounded-lg mb-4">{errorName}</p>}

            <div className="space-y-4">
                {(empresas || []).map(empresa => (
                    <div key={empresa.id} className="bg-gray-900 p-5 rounded-lg border border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-inner">
                        <div className="flex-1">
                            {editingEmpresaId === empresa.id ? (
                                <div className="flex gap-2 mb-2">
                                    <input type="text" value={editedName} onChange={handleNameChange} className="bg-gray-700 text-lg font-semibold text-cyan-500 p-1.5 rounded border border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-600 flex-1" disabled={loadingName} autoFocus />
                                    <button onClick={() => handleSaveName(empresa.id)} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-3 rounded" disabled={loadingName}> Salvar </button>
                                    <button onClick={handleCancelEdit} className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-3 rounded" disabled={loadingName}> Cancelar </button>
                                </div>
                            ) : (
                                <h3 className="text-lg font-bold text-cyan-400 flex items-center mb-1">
                                    {empresa.Nome_Empresa || empresa.id}
                                    <button onClick={() => handleEditNameClick(empresa)} title="Editar nome da empresa"><IconeEditar /></button>
                                </h3>
                            )}
                            {(empresa.Nome_Empresa && empresa.Nome_Empresa !== empresa.id) && ( <p className="text-xs text-gray-500">(ID Original: {empresa.id})</p> )}
                        </div>

                        <div className="flex-1 bg-gray-800 p-3 py-4 rounded border border-gray-600 flex items-center gap-3">
                            <label className="text-sm font-bold text-gray-300 min-w-max uppercase tracking-wider text-[10px]">Grupo Responsável</label>
                            <select
                                className="bg-gray-700 text-white text-sm py-2 px-3 rounded focus:ring-cyan-500 focus:border-cyan-500 flex-1 border border-gray-600 outline-none w-full"
                                value={assign[empresa.id] || ''}
                                onChange={(e) => setAssign({...assign, [empresa.id]: e.target.value})}
                            >
                                <option value="">Nenhum Grupo (Controle IA)</option>
                                {(grupos || []).map(grupo => (
                                    <option key={grupo.id} value={grupo.id}>
                                        {grupo.nome} ({grupo.sigla}) • {grupo.integrantesIds?.length || 0} alunos
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex-shrink-0 flex items-center">
                            <Link to={`/simulador/painel/${simulacaoId}/${empresa.id}`} target="_blank" rel="noopener noreferrer" className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white border border-gray-600 text-xs font-bold py-2.5 px-4 rounded transition-colors whitespace-nowrap" title="Ver o painel desta empresa">
                                Visualizar Painel
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-lg mt-8 border border-gray-700">
                 <p className="text-sm text-gray-400">Ao vincular um grupo, todos os seus integrantes automaticamente assumem a equipe.</p>
                 <div className="flex gap-4">
                     <button type="button" onClick={() => navigate('/simulador/admin')} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors border border-gray-600" disabled={loading}> Voltar </button>
                     <button onClick={handleSalvarDesignacoes} className="bg-cyan-500 hover:bg-cyan-600 text-gray-900 font-bold py-2 px-8 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 transform hover:scale-105 active:scale-95" disabled={loading}> 
                        <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        {loading ? 'Salvando Vínculos...' : 'Confirmar Designações'} 
                     </button>
                 </div>
            </div>
        </div>
    );
}

export default SimuladorDesignar;
