import React, { useState, useMemo, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../firebase/config.js'; // Corrigido para importar o appId

function ModalAdicionarIntegrantes({ grupo, onClose, todosAlunos }) {
    // Estado para guardar os IDs dos alunos selecionados
    const [selecionados, setSelecionados] = useState({});

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

    // Filtra para exibir apenas usuários com o papel 'aluno'
    const alunosDisponiveis = useMemo(() => {
        return todosAlunos.filter(u => u.papel === 'aluno');
    }, [todosAlunos]);

    // Função para salvar as alterações no Firestore
    const handleSalvar = async () => {
        const integrantesIds = Object.keys(selecionados).filter(id => selecionados[id]);
        // Corrigido: Caminho completo para o documento no Firestore
        const grupoRef = doc(db, 'artifacts', appId, 'public', 'data', 'grupos', grupo.id);

        try {
            await updateDoc(grupoRef, {
                integrantesIds: integrantesIds
            });
            onClose(); // Fecha o modal após salvar
        } catch (error) {
            console.error("Erro ao atualizar integrantes do grupo:", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-700 rounded-lg shadow-xl p-8 max-w-2xl w-full h-3/4 flex flex-col">
                <h2 className="text-2xl font-bold text-cyan-400 mb-4">
                    Gerenciar Integrantes do Grupo: <span className="text-white">{grupo.nome}</span>
                </h2>
                <p className="text-gray-300 mb-6">Selecione os alunos que farão parte deste grupo.</p>
                
                <div className="flex-1 overflow-y-auto bg-gray-800 p-4 rounded-lg">
                    {alunosDisponiveis.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {alunosDisponiveis.map(aluno => (
                                <label key={aluno.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={!!selecionados[aluno.id]} 
                                        onChange={() => handleCheckboxChange(aluno.id)}
                                        className="w-5 h-5 bg-gray-700 rounded text-cyan-500 focus:ring-cyan-600 border-gray-500"
                                    />
                                    <div className="flex items-center gap-2">
                                        <img src={aluno.fotoURL} alt={aluno.nome} className="w-8 h-8 rounded-full" />
                                        <span className="text-sm">{aluno.nome}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center">Nenhum aluno encontrado para adicionar.</p>
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

