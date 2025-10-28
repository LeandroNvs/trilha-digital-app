import React, { useState, useMemo } from 'react';
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';
import ModalConfirmacao from '../components/ModalConfirmacao.jsx';

// Hook para dados combinados (Cursos com sigla da Instituição)
const useCursosCombinados = () => {
    const cursos = useCollection(`/artifacts/${appId}/public/data/cursos`);
    const instituicoes = useCollection(`/artifacts/${appId}/public/data/instituicoes`);

    return useMemo(() => {
        if (!cursos.length || !instituicoes.length) return { lista: [], mapa: {} };

        const mapa = {};
        const lista = cursos.map(curso => {
            const inst = instituicoes.find(i => i.id === curso.instituicaoId);
            const item = { ...curso, siglaInstituicao: inst?.sigla || '??', nomeInstituicao: inst?.nome || '??' };
            mapa[curso.id] = item;
            return item;
        });

        return { lista, mapa };
    }, [cursos, instituicoes]);
};

function PaginaTurmas() {
    const [nome, setNome] = useState('');
    const [sigla, setSigla] = useState('');
    const [cursoId, setCursoId] = useState('');
    const [editando, setEditando] = useState(null);
    const [itemParaExcluir, setItemParaExcluir] = useState(null);

    const collectionPath = `/artifacts/${appId}/public/data/turmas`;
    const turmas = useCollection(collectionPath);
    const { lista: cursosCombinados, mapa: cursosMapa } = useCursosCombinados();

    const limparForm = () => {
        setNome('');
        setSigla('');
        setCursoId('');
        setEditando(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if ([nome, sigla, cursoId].some(v => v.trim() === '')) return;

        const dados = { nome, sigla, cursoId };
        const turmasCollection = collection(db, collectionPath);

        if (editando) {
            const docRef = doc(db, collectionPath, editando.id);
            await updateDoc(docRef, dados);
        } else {
            await addDoc(turmasCollection, { ...dados, criadaEm: serverTimestamp() });
        }
        limparForm();
    };

    const handleEdit = (t) => {
        setEditando(t);
        setNome(t.nome);
        setSigla(t.sigla);
        setCursoId(t.cursoId);
    };

    const handleExclusaoConfirmada = async () => {
        if (itemParaExcluir) {
            const docRef = doc(db, collectionPath, itemParaExcluir.id);
            await deleteDoc(docRef);
            setItemParaExcluir(null);
        }
    };

    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Gerenciar Turmas</h2>
            <form onSubmit={handleSubmit} className="bg-gray-700 p-6 rounded-lg mb-8 space-y-4">
                <h3 className="text-xl font-semibold">{editando ? 'Editando' : 'Nova'} Turma</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da Turma" className="bg-gray-600 rounded-lg p-3" required />
                    <input type="text" value={sigla} onChange={e => setSigla(e.target.value)} placeholder="Sigla" className="bg-gray-600 rounded-lg p-3" required />
                    <select value={cursoId} onChange={e => setCursoId(e.target.value)} className="md:col-span-2 bg-gray-600 rounded-lg p-3" required>
                        <option value="">Selecione o Curso</option>
                        {cursosCombinados.map(c => <option key={c.id} value={c.id}>{c.sigla} - {c.siglaInstituicao}</option>)}
                    </select>
                </div>
                <div className="flex gap-4">
                    <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-5 rounded-lg">{editando ? 'Salvar' : 'Adicionar'}</button>
                    {editando && <button type="button" onClick={limparForm} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded-lg">Cancelar</button>}
                </div>
            </form>
            <div className="space-y-4">
                {turmas.map(t => (
                    <div key={t.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                        <div>
                            <p className="font-bold">{t.nome} ({t.sigla})</p>
                            <p className="text-sm text-gray-400">{cursosMapa[t.cursoId]?.sigla} - {cursosMapa[t.cursoId]?.siglaInstituicao}</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => handleEdit(t)} className="text-yellow-400">Editar</button>
                            <button onClick={() => setItemParaExcluir(t)} className="text-red-500">Excluir</button>
                        </div>
                    </div>
                ))}
            </div>
            {itemParaExcluir && <ModalConfirmacao mensagem={`Excluir "${itemParaExcluir.nome}"?`} onConfirmar={handleExclusaoConfirmada} onCancelar={() => setItemParaExcluir(null)} />}
        </div>
    );
}

export default PaginaTurmas;

