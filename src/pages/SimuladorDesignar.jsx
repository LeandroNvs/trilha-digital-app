import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
// ADICIONADO: updateDoc
import { doc, getDoc, updateDoc, collection, onSnapshot, writeBatch } from 'firebase/firestore';
import { db, appId } from '../firebase/config';
import useCollection from '../hooks/useCollection';

// --- Ícone de Edição Simples ---
const IconeEditar = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-2 text-gray-400 hover:text-yellow-400 cursor-pointer" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>;

function SimuladorDesignar() {
    const { simulacaoId } = useParams();
    const navigate = useNavigate();
    const [simulacao, setSimulacao] = useState(null);
    const [loading, setLoading] = useState(false); // Para salvar designações
    const [erro, setErro] = useState('');

    // Busca todos os alunos
    const todosAlunos = useCollection('usuarios');
    // Busca as empresas desta simulação
    const empresasCollectionPath = `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas`;
    const empresas = useCollection(empresasCollectionPath); // Hook já re-renderiza on change

    // Filtra alunos
    const alunosDisponiveis = useMemo(() => todosAlunos.filter(u => u.papel === 'aluno'), [todosAlunos]);
    // Estado para designações
    const [assign, setAssign] = useState({});

    // --- NOVOS ESTADOS PARA EDIÇÃO DE NOMES ---
    const [editingEmpresaId, setEditingEmpresaId] = useState(null); // ID da empresa sendo editada
    const [editedName, setEditedName] = useState(''); // Novo nome temporário
    const [loadingName, setLoadingName] = useState(false); // Loading para salvar nome
    const [errorName, setErrorName] = useState(''); // Erro ao salvar nome

    // Carrega a simulação e as designações existentes
    useEffect(() => {
        // Define as designações iniciais quando as empresas carregam
        if (empresas && empresas.length > 0) {
            const initialAssign = {};
            empresas.forEach(empresa => {
                initialAssign[empresa.id] = empresa.Integrantes_Usuarios_IDs || [];
            });
            setAssign(initialAssign);
        }

        // Busca informações da simulação (apenas nome, etc.)
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

    }, [simulacaoId, db, empresas]); // Re-executa se 'empresas' mudar (importante)

    // Handlers para designar/remover alunos (inalterados)
    const handleAddAluno = (empresaId, alunoId) => { /* ... */ };
    const handleRemoveAluno = (empresaId, alunoId) => { /* ... */ };
    const handleSalvarDesignacoes = async () => { /* ... */ };
    const getAlunoNome = (alunoId) => todosAlunos.find(a => a.id === alunoId)?.nome || 'Aluno ?';

    // --- NOVAS FUNÇÕES PARA EDIÇÃO DE NOMES ---
    const handleEditNameClick = (empresa) => {
        setEditingEmpresaId(empresa.id);
        setEditedName(empresa.Nome_Empresa || empresa.id); // Preenche com nome atual
        setErrorName(''); // Limpa erro anterior
    };

    const handleNameChange = (event) => {
        setEditedName(event.target.value);
    };

    const handleCancelEdit = () => {
        setEditingEmpresaId(null);
        setEditedName('');
        setErrorName('');
    };

    const handleSaveName = async (empresaId) => {
        if (!editedName.trim()) {
            setErrorName("O nome não pode ficar em branco.");
            return;
        }
        setLoadingName(true);
        setErrorName('');
        try {
            const empresaRef = doc(db, empresasCollectionPath, empresaId);
            await updateDoc(empresaRef, {
                Nome_Empresa: editedName.trim()
            });
            setEditingEmpresaId(null); // Sai do modo de edição
            setEditedName('');
        } catch (err) {
            console.error("Erro ao atualizar nome da empresa:", err);
            setErrorName("Falha ao salvar. Tente novamente.");
        }
        setLoadingName(false);
    };
    // --- FIM DAS NOVAS FUNÇÕES ---


    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-cyan-400 mb-2">Designar Alunos e Editar Empresas</h2>
            <p className="text-lg text-gray-300 mb-6">{simulacao?.Nome_Simulacao || 'Carregando nome...'}</p>

            {erro && <p className="text-red-400 bg-red-900 p-3 rounded-lg mb-4">{erro}</p>}
            {errorName && <p className="text-red-400 bg-red-900 p-3 rounded-lg mb-4">{errorName}</p>}


            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Coluna de Alunos Disponíveis (inalterada) */}
                <div className="md:col-span-1 bg-gray-900 p-4 rounded-lg">
                    {/* ... JSX dos alunos ... */}
                </div>

                {/* Colunas das Empresas (MODIFICADO para incluir edição) */}
                <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {empresas.map(empresa => (
                        <div key={empresa.id} className="bg-gray-900 p-4 rounded-lg flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    {/* Exibe Input ou Nome da Empresa */}
                                    {editingEmpresaId === empresa.id ? (
                                        <input
                                            type="text"
                                            value={editedName}
                                            onChange={handleNameChange}
                                            className="bg-gray-700 text-lg font-semibold text-cyan-500 p-1 rounded border border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                                            disabled={loadingName}
                                            autoFocus // Foca no input ao aparecer
                                        />
                                    ) : (
                                        <h3 className="text-lg font-semibold text-cyan-500 flex items-center">
                                            {empresa.Nome_Empresa || empresa.id}
                                            {/* Botão Editar Nome (só aparece se não estiver editando esta) */}
                                            {!editingEmpresaId && (
                                                <button onClick={() => handleEditNameClick(empresa)} title="Editar nome da empresa">
                                                    <IconeEditar />
                                                </button>
                                            )}
                                        </h3>
                                    )}

                                    {/* Botões Salvar/Cancelar ou Ver Painel */}
                                    {editingEmpresaId === empresa.id ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSaveName(empresa.id)}
                                                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-2 rounded disabled:opacity-50"
                                                disabled={loadingName}
                                            >
                                                {loadingName ? '...' : 'Salvar'}
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-2 rounded"
                                                disabled={loadingName}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                         <Link
                                            to={`/simulador/painel/${simulacaoId}/${empresa.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded"
                                            title="Ver o painel desta empresa"
                                        >
                                            Ver Painel
                                        </Link>
                                    )}
                                </div>
                                 {/* Mostra ID original se nome foi editado */}
                                 {(empresa.Nome_Empresa && empresa.Nome_Empresa !== empresa.id) && (
                                     <p className="text-xs text-gray-500 mb-3">(ID Original: {empresa.id})</p>
                                 )}

                                {/* Lista de Alunos Designados */}
                                <div className="space-y-2 min-h-[100px] mb-4">
                                    <p className="text-sm font-medium text-gray-300 border-b border-gray-700 pb-1 mb-2">Integrantes:</p>
                                    {assign[empresa.id] && assign[empresa.id].length > 0 ? (
                                        assign[empresa.id].map(alunoId => (
                                            <div key={alunoId} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                                                {/* ... (renderização do aluno - inalterada) ... */}
                                                <button
                                                    onClick={() => handleRemoveAluno(empresa.id, alunoId)}
                                                    className="text-red-400 hover:text-red-300 text-xs flex-shrink-0"
                                                    disabled={editingEmpresaId === empresa.id} // Desabilita remover enquanto edita nome
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-sm text-center pt-4">Nenhum aluno designado.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Botões Finais (Cancelar / Salvar Designações) - inalterados */}
            <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-700">
                {/* ... */}
            </div>
        </div>
    );
}

export default SimuladorDesignar;
