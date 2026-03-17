import React from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';

function PaginaAlunos() {
    // A coleção 'usuarios' fica na raiz do banco de dados, então o caminho é simples.
    const { documents: usuariosData, isLoading: isUsuariosLoading } = useCollection('usuarios');
    const usuarios = usuariosData || [];

    // Buscar turmas cadastradas para o select
    const { documents: turmasData, isLoading: isTurmasLoading } = useCollection(`/artifacts/${appId}/public/data/turmas`);
    const turmas = turmasData || [];

    const handleChangePapel = async (userId, novoPapel) => {
        const userRef = doc(db, 'usuarios', userId);
        await updateDoc(userRef, { papel: novoPapel });
    };

    const handleChangeTurma = async (userId, novaTurmaId) => {
        const userRef = doc(db, 'usuarios', userId);
        await updateDoc(userRef, { turmaId: novaTurmaId });
    };

    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Gerenciar Alunos e Usuários</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                    <tr className="border-b border-gray-700">
                        <th className="p-4">Usuário</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Papel</th>
                        <th className="p-4">Turma Vinculada</th>
                    </tr>
                    </thead>
                    <tbody>
                    {isUsuariosLoading && <tr><td colSpan="4" className="p-4 text-center text-gray-400">Carregando usuários...</td></tr>}
                    {usuarios.map(u => (
                        <tr key={u.id} className="border-b border-gray-700 hover:bg-gray-700">
                            <td className="p-4 flex items-center gap-3">
                                <img src={u.fotoURL || 'https://via.placeholder.com/150'} alt={u.nome} className="w-8 h-8 rounded-full" />
                                {u.nome}
                            </td>
                            <td className="p-4 text-gray-400">{u.email}</td>
                            <td className="p-4">
                                <select
                                    value={u.papel || 'aluno'}
                                    onChange={(e) => handleChangePapel(u.id, e.target.value)}
                                    className="bg-gray-600 rounded-md p-2 w-full max-w-[150px]"
                                    disabled={u.email === 'leandros.nvs@gmail.com'}
                                >
                                    <option value="aluno">Aluno</option>
                                    <option value="professor">Professor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </td>
                            <td className="p-4">
                                <select
                                    value={u.turmaId || ''}
                                    onChange={(e) => handleChangeTurma(u.id, e.target.value)}
                                    className="bg-gray-600 rounded-md p-2 w-full min-w-[180px]"
                                    disabled={u.papel !== 'aluno'}
                                >
                                    <option value="">{isTurmasLoading ? 'Carregando...' : 'Nenhuma Turma'}</option>
                                    {turmas.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.nome} ({t.sigla})
                                        </option>
                                    ))}
                                </select>
                                {u.papel !== 'aluno' && <span className="text-xs text-gray-500 block mt-1">Visível apenas para Alunos</span>}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default PaginaAlunos;

