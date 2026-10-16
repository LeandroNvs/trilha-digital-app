import React, { useState, useMemo, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';

function ModalAdicionarIntegrantes({ grupo, onClose, todosAlunos }) {
    // Estado para guardar os IDs dos alunos selecionados
    const [selecionados, setSelecionados] = useState({});
    const [busca, setBusca] = useState('');
    
    // Filtro por Turma
    const [turmaFiltroId, setTurmaFiltroId] = useState(grupo?.turmaId || '');
    const { documents: turmasData } = useCollection(`/artifacts/${appId}/public/data/turmas`);
    const turmas = turmasData || [];

    // Efeito para inicializar o estado de selecionados com os integrantes atuais do grupo
    useEffect(() => {
        const integrantesIniciais = {};
        if (grupo?.integrantesIds) {
            grupo.integrantesIds.forEach(id => {
                integrantesIniciais[id] = true;
            });
        }
        setSelecionados(integrantesIniciais);
    }, [grupo]);

    // Lógica para lidar com a marcação/desmarcação de um aluno
    const handleCheckboxChange = (alunoId) => {
        setSelecionados(prev => ({
            ...prev,
            [alunoId]: !prev[alunoId]
        }));
    };

    // Filtra para exibir apenas usuários com o papel 'aluno' ou 'professor', pela turma selecionada e busca
    const alunosDisponiveis = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        const filtrados = todosAlunos.filter(u => {
            const isRoleValid = u.papel === 'aluno' || u.papel === 'professor';
            let isTurmaValid = true;
            if (turmaFiltroId === 'sem_turma') {
                isTurmaValid = !u.turmaId;
            } else if (turmaFiltroId) {
                // Exibe da turma selecionada OU quem já está marcado neste grupo
                isTurmaValid = u.turmaId === turmaFiltroId || !!selecionados[u.id];
            }
            const isBuscaValid = !termo ||
                (u.nome || '').toLowerCase().includes(termo) ||
                (u.email || '').toLowerCase().includes(termo);

            return isRoleValid && isTurmaValid && isBuscaValid;
        });

        return filtrados.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
    }, [todosAlunos, turmaFiltroId, busca, selecionados]);

    // Função para salvar as alterações no Firestore
    const handleSalvar = async () => {
        const integrantesIds = Object.keys(selecionados).filter(id => selecionados[id]);
        const grupoRef = doc(db, 'artifacts', appId, 'public', 'data', 'grupos', grupo.id);

        try {
            await updateDoc(grupoRef, {
                integrantesIds: integrantesIds
            });

            // Se o grupo possui uma turma vinculada, vincula automaticamente os alunos adicionados que ainda estavam sem turma
            if (grupo?.turmaId) {
                for (const uid of integrantesIds) {
                    const alunoObj = todosAlunos.find(a => a.id === uid);
                    if (alunoObj && !alunoObj.turmaId) {
                        await updateDoc(doc(db, 'usuarios', uid), {
                            turmaId: grupo.turmaId
                        }).catch(() => {});
                    }
                }
            }

            onClose();
        } catch (error) {
            console.error("Erro ao atualizar integrantes do grupo:", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-700 rounded-lg shadow-xl p-6 sm:p-8 max-w-3xl w-full h-4/5 flex flex-col">
                <h2 className="text-xl sm:text-2xl font-bold text-cyan-400 mb-3">
                    Gerenciar Integrantes do Grupo: <span className="text-white">{grupo.nome}</span>
                </h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-4 gap-3">
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="🔍 Buscar por nome ou e-mail..."
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-300 whitespace-nowrap">Turma:</span>
                        <select 
                            value={turmaFiltroId} 
                            onChange={(e) => setTurmaFiltroId(e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        >
                            <option value="">Todas as Turmas (Incluir sem turma)</option>
                            <option value="sem_turma">⏳ Apenas Sem Turma</option>
                            {turmas.map(t => (
                                <option key={t.id} value={t.id}>{t.nome} ({t.sigla})</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto bg-gray-800 p-4 rounded-lg">
                    {alunosDisponiveis.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {alunosDisponiveis.map(aluno => (
                                <label
                                    key={aluno.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        selecionados[aluno.id]
                                            ? 'bg-cyan-950/50 border-cyan-500/60'
                                            : 'border-gray-700 hover:bg-gray-700'
                                    }`}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={!!selecionados[aluno.id]} 
                                        onChange={() => handleCheckboxChange(aluno.id)}
                                        className="w-5 h-5 bg-gray-700 rounded text-cyan-500 focus:ring-cyan-600 border-gray-500 shrink-0"
                                    />
                                    <img
                                        src={aluno.fotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome || 'A')}&background=0D8ABC&color=fff`}
                                        alt={aluno.nome}
                                        className="w-8 h-8 rounded-full shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <span className="text-sm font-bold text-white block truncate">{aluno.nome}</span>
                                        <span className="text-xs text-gray-400 block truncate">{aluno.email}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-8">
                            Nenhum aluno encontrado para este filtro. Experimente mudar o filtro de Turma para "Todas as Turmas".
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                        Cancelar
                    </button>
                    <button onClick={handleSalvar} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg">
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalAdicionarIntegrantes;


