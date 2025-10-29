import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, writeBatch } from 'firebase/firestore';
import { db, appId } from '../firebase/config';
import useCollection from '../hooks/useCollection';

// --- Ícone de Edição Simples ---
const IconeEditar = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-2 text-gray-400 hover:text-yellow-400 cursor-pointer" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>;
const IconeRemover = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

function SimuladorDesignar() {
    const { simulacaoId } = useParams();
    const navigate = useNavigate();
    const [simulacao, setSimulacao] = useState(null);
    const [loading, setLoading] = useState(false); // Para salvar designações
    const [erro, setErro] = useState('');

    // Busca todos os usuários (alunos, professores, etc.)
    const todosUsuarios = useCollection('usuarios'); // Hook `useCollection` para buscar usuários
    // Busca as empresas desta simulação
    const empresasCollectionPath = `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas`;
    const empresas = useCollection(empresasCollectionPath); // Hook já re-renderiza on change

    // Filtra apenas alunos
    const alunos = useMemo(() => todosUsuarios.filter(u => u.papel === 'aluno'), [todosUsuarios]);
    // Estado para designações { empresaId: [alunoId1, alunoId2], ... }
    const [assign, setAssign] = useState({});

    // --- Estados para Edição de Nomes ---
    const [editingEmpresaId, setEditingEmpresaId] = useState(null);
    const [editedName, setEditedName] = useState('');
    const [loadingName, setLoadingName] = useState(false);
    const [errorName, setErrorName] = useState('');

    // Carrega a simulação e inicializa as designações
    useEffect(() => {
        // Define as designações iniciais quando as empresas carregam ou mudam
        if (empresas && empresas.length > 0) {
            const initialAssign = {};
            empresas.forEach(empresa => {
                initialAssign[empresa.id] = empresa.Integrantes_Usuarios_IDs || [];
            });
            // Só atualiza se for diferente para evitar loop infinito
            if (JSON.stringify(initialAssign) !== JSON.stringify(assign)) {
                setAssign(initialAssign);
            }
        }

        // Busca informações da simulação (apenas nome, etc., uma vez)
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
    }, [simulacaoId, db, empresas]); // Dependência em `empresas` para recarregar designações se elas mudarem no Firestore

    // Calcula quais alunos já estão designados em alguma empresa
    const alunosDesignadosIds = useMemo(() => {
        const ids = new Set();
        Object.values(assign).forEach(listaAlunos => {
            listaAlunos.forEach(id => ids.add(id));
        });
        return ids;
    }, [assign]);

    // Filtra alunos que ainda não foram designados
    const alunosDisponiveis = useMemo(() => {
        return alunos.filter(aluno => !alunosDesignadosIds.has(aluno.id));
    }, [alunos, alunosDesignadosIds]);

    // --- IMPLEMENTAÇÃO handleAddAluno ---
    const handleAddAluno = (empresaId, alunoId) => {
        // Garante que o aluno não seja adicionado a mais de uma empresa
        if (alunosDesignadosIds.has(alunoId)) {
            console.warn(`Aluno ${alunoId} já está designado.`);
            // Poderia adicionar feedback visual aqui se necessário
            return;
        }
        // Garante que uma empresa válida foi selecionada
        if (!empresaId) return;

        setAssign(prevAssign => {
            const novosIntegrantes = [...(prevAssign[empresaId] || []), alunoId];
            return {
                ...prevAssign,
                [empresaId]: novosIntegrantes
            };
        });
    };

    // --- IMPLEMENTAÇÃO handleRemoveAluno ---
    const handleRemoveAluno = (empresaId, alunoId) => {
        setAssign(prevAssign => {
            const integrantesAtuais = prevAssign[empresaId] || [];
            const novosIntegrantes = integrantesAtuais.filter(id => id !== alunoId);
            return {
                ...prevAssign,
                [empresaId]: novosIntegrantes
            };
        });
    };

    // --- IMPLEMENTAÇÃO handleSalvarDesignacoes ---
    const handleSalvarDesignacoes = async () => {
        setLoading(true);
        setErro('');
        try {
            const batch = writeBatch(db);
            empresas.forEach(empresa => {
                const empresaRef = doc(db, empresasCollectionPath, empresa.id);
                // Pega a lista atualizada do estado 'assign' para esta empresa
                const integrantesAtualizados = assign[empresa.id] || [];
                batch.update(empresaRef, {
                    Integrantes_Usuarios_IDs: integrantesAtualizados
                });
            });
            await batch.commit();
            navigate('/simulador/admin'); // Volta para a lista após salvar
        } catch (err) {
            console.error("Erro ao salvar designações:", err);
            setErro("Falha ao salvar as designações. Tente novamente.");
        }
        setLoading(false);
    };
    // --- FIM DA IMPLEMENTAÇÃO ---

    // Função auxiliar para pegar o nome do aluno pelo ID
    const getAlunoNome = (alunoId) => alunos.find(a => a.id === alunoId)?.nome || 'Aluno ?';
    // Função auxiliar para pegar o objeto aluno completo pelo ID
    const getAluno = (alunoId) => alunos.find(a => a.id === alunoId);

    // --- Funções para Edição de Nomes (inalteradas) ---
    const handleEditNameClick = (empresa) => { /* ... */ setEditingEmpresaId(empresa.id); setEditedName(empresa.Nome_Empresa || empresa.id); setErrorName(''); };
    const handleNameChange = (event) => { /* ... */ setEditedName(event.target.value); };
    const handleCancelEdit = () => { /* ... */ setEditingEmpresaId(null); setEditedName(''); setErrorName(''); };
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
    // --- Fim das Funções de Edição de Nomes ---

    // Função para gerar URL do avatar de fallback
    const getAvatarUrl = (aluno) => {
        if (aluno?.fotoURL) {
            return aluno.fotoURL;
        }
        const nome = aluno?.nome || '??';
        // Usa a mesma configuração de cores do App.jsx
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=0D8ABC&color=fff&size=32`; // size=32 para combinar com w-6 h-6
    };

    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-cyan-400 mb-2">Designar Alunos e Editar Empresas</h2>
            <p className="text-lg text-gray-300 mb-6">{simulacao?.Nome_Simulacao || 'Carregando nome...'}</p>

            {erro && <p className="text-red-400 bg-red-900 p-3 rounded-lg mb-4">{erro}</p>}
            {errorName && <p className="text-red-400 bg-red-900 p-3 rounded-lg mb-4">{errorName}</p>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Coluna de Alunos Disponíveis - MODIFICADA para usar getAvatarUrl */}
                <div className="md:col-span-1 bg-gray-900 p-4 rounded-lg flex flex-col h-[calc(100vh-250px)]"> {/* Ajuste de altura */}
                    <h3 className="text-lg font-semibold text-gray-200 mb-3 border-b border-gray-700 pb-2">Alunos Disponíveis</h3>
                    <div className="overflow-y-auto flex-grow space-y-3 pr-2"> {/* Aumentado space-y e Adicionado pr-2 */}
                        {alunosDisponiveis.length > 0 ? (
                            alunosDisponiveis.map(aluno => (
                                <div key={aluno.id} className="flex items-center justify-between bg-gray-700 p-2 rounded gap-2"> {/* Adicionado gap */}
                                    {/* Informações do Aluno */}
                                    <div className="flex items-center gap-2 overflow-hidden flex-shrink mr-2"> {/* Limitador de largura */}
                                        <img
                                            src={getAvatarUrl(aluno)} // Usa a função para obter a URL
                                            alt={aluno.nome}
                                            className="w-6 h-6 rounded-full flex-shrink-0 bg-gray-600" // Adicionado bg-gray-600 como fallback visual
                                        />
                                        <span className="text-sm text-white truncate">{aluno.nome}</span> {/* truncar nome longo */}
                                    </div>
                                    {/* Select para escolher a empresa */}
                                    <select
                                        className="bg-gray-600 text-white text-xs py-1 px-2 rounded focus:ring-cyan-500 focus:border-cyan-500 min-w-[100px]" // Estilo do select
                                        value="" // Sempre reseta para o placeholder
                                        onChange={(e) => handleAddAluno(e.target.value, aluno.id)}
                                        title={`Designar ${aluno.nome}`}
                                    >
                                        <option value="">Designar...</option>
                                        {empresas.map(empresa => (
                                            <option key={`${aluno.id}-opt-${empresa.id}`} value={empresa.id}>
                                                {empresa.Nome_Empresa || empresa.id}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-sm text-center pt-4">Todos os alunos já foram designados.</p>
                        )}
                    </div>
                </div>

                {/* Colunas das Empresas - MODIFICADA para usar getAvatarUrl */}
                <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-250px)] overflow-y-auto pr-2"> {/* Altura e scroll */}
                    {empresas.map(empresa => (
                        <div key={empresa.id} className="bg-gray-900 p-4 rounded-lg flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    {editingEmpresaId === empresa.id ? (
                                        <input type="text" value={editedName} onChange={handleNameChange} className="bg-gray-700 text-lg font-semibold text-cyan-500 p-1 rounded border border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-600" disabled={loadingName} autoFocus />
                                    ) : (
                                        <h3 className="text-lg font-semibold text-cyan-500 flex items-center">
                                            {empresa.Nome_Empresa || empresa.id}
                                            {!editingEmpresaId && ( <button onClick={() => handleEditNameClick(empresa)} title="Editar nome da empresa"><IconeEditar /></button> )}
                                        </h3>
                                    )}
                                    {editingEmpresaId === empresa.id ? (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleSaveName(empresa.id)} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-2 rounded disabled:opacity-50" disabled={loadingName}> {loadingName ? '...' : 'Salvar'} </button>
                                            <button onClick={handleCancelEdit} className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-2 rounded" disabled={loadingName}> Cancelar </button>
                                        </div>
                                    ) : (
                                         <Link to={`/simulador/painel/${simulacaoId}/${empresa.id}`} target="_blank" rel="noopener noreferrer" className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded" title="Ver o painel desta empresa"> Ver Painel </Link>
                                    )}
                                </div>
                                 {(empresa.Nome_Empresa && empresa.Nome_Empresa !== empresa.id) && ( <p className="text-xs text-gray-500 mb-3">(ID Original: {empresa.id})</p> )}
                                <div className="space-y-2 min-h-[100px] mb-4">
                                    <p className="text-sm font-medium text-gray-300 border-b border-gray-700 pb-1 mb-2">Integrantes:</p>
                                    {assign[empresa.id] && assign[empresa.id].length > 0 ? (
                                        assign[empresa.id].map(alunoId => {
                                            const aluno = getAluno(alunoId); // Pega o objeto aluno
                                            return (
                                                <div key={`${empresa.id}-${alunoId}`} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src={getAvatarUrl(aluno)} // Usa a função para obter a URL
                                                            alt={getAlunoNome(alunoId)}
                                                            className="w-6 h-6 rounded-full bg-gray-600" // Adicionado bg-gray-600 como fallback visual
                                                        />
                                                        <span className="text-sm text-white">{getAlunoNome(alunoId)}</span>
                                                    </div>
                                                    <button onClick={() => handleRemoveAluno(empresa.id, alunoId)} className="text-red-400 hover:text-red-300 text-xs flex-shrink-0 p-1" disabled={editingEmpresaId === empresa.id} title="Remover aluno"> <IconeRemover /> </button>
                                                </div>
                                            );
                                        })
                                    ) : ( <p className="text-gray-500 text-sm text-center pt-4">Nenhum aluno designado.</p> )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Botões Finais (inalterados) */}
            <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-700">
                 <button type="button" onClick={() => navigate('/simulador/admin')} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors" disabled={loading}> Cancelar </button>
                 <button onClick={handleSalvarDesignacoes} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50" disabled={loading}> {loading ? 'Salvando...' : 'Salvar Designações'} </button>
            </div>
        </div>
    );
}

export default SimuladorDesignar;

