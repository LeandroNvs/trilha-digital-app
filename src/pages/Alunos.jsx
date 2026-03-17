import React, { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';

function PaginaAlunos() {
    const [filtroTurma, setFiltroTurma] = useState('');

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

    const usuariosFiltrados = useMemo(() => {
        if (!filtroTurma) return usuarios;
        if (filtroTurma === 'nao_vinculada') {
            return usuarios.filter(u => !u.turmaId);
        }
        return usuarios.filter(u => u.turmaId === filtroTurma);
    }, [usuarios, filtroTurma]);

    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Gerenciar Alunos e Usuários</h2>
            
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 bg-gray-700 p-4 rounded-lg">
                <span className="text-gray-300 font-semibold whitespace-nowrap">Filtrar por Turma:</span>
                <select
                    value={filtroTurma}
                    onChange={(e) => setFiltroTurma(e.target.value)}
                    className="bg-gray-800 text-white rounded-md p-2 border border-gray-600 focus:outline-none focus:border-cyan-500 w-full sm:w-auto min-w-[200px]"
                >
                    <option value="">Todas as Turmas (Mostrar Todos)</option>
                    <option value="nao_vinculada">Não Vinculada (Sem Turma)</option>
                    {turmas.map(t => (
                        <option key={t.id} value={t.id}>{t.nome} ({t.sigla})</option>
                    ))}
                </select>
                <span className="text-sm text-gray-400">({usuariosFiltrados.length} usuários retornados)</span>
            </div>

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
                    {!isUsuariosLoading && usuariosFiltrados.length === 0 && (
                        <tr><td colSpan="4" className="p-4 text-center text-gray-400">Nenhum usuário encontrado para este filtro.</td></tr>
                    )}
                    {usuariosFiltrados.map(u => (
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
                                    disabled={u.papel === 'admin'}
                                >
                                    <option value="">{isTurmasLoading ? 'Carregando...' : 'Nenhuma Turma'}</option>
                                    {turmas.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.nome} ({t.sigla})
                                        </option>
                                    ))}
                                </select>
                                {u.papel === 'admin' && <span className="text-xs text-gray-500 block mt-1">Não aplicável a Admin</span>}
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

