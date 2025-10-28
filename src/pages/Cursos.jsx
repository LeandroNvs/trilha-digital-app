import React, { useState } from 'react';
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';
import ModalConfirmacao from '../components/ModalConfirmacao.jsx';

function PaginaCursos() {
    const [nome, setNome] = useState('');
    const [sigla, setSigla] = useState('');
    const [ano, setAno] = useState('');
    const [semestre, setSemestre] = useState('');
    const [instituicaoId, setInstituicaoId] = useState('');
    const [editando, setEditando] = useState(null);
    const [itemParaExcluir, setItemParaExcluir] = useState(null);

    const instCollectionPath = `/artifacts/${appId}/public/data/instituicoes`;
    const cursoCollectionPath = `/artifacts/${appId}/public/data/cursos`;

    const instituicoes = useCollection(instCollectionPath);
    const cursos = useCollection(cursoCollectionPath);

    const limparForm = () => {
        setNome(''); setSigla(''); setAno(''); setSemestre('');
        setInstituicaoId(''); setEditando(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if ([nome, sigla, ano, semestre, instituicaoId].some(v => v.trim() === '')) return;

        const dados = { nome, sigla, ano, semestre, instituicaoId };
        const cursosCollection = collection(db, cursoCollectionPath);

        if (editando) {
            const docRef = doc(db, cursoCollectionPath, editando.id);
            await updateDoc(docRef, dados);
        } else {
            await addDoc(cursosCollection, { ...dados, criadaEm: serverTimestamp() });
        }
        limparForm();
    };

    const handleEdit = (c) => {
        setEditando(c);
        setNome(c.nome);
        setSigla(c.sigla);
        setAno(c.ano);
        setSemestre(c.semestre);
        setInstituicaoId(c.instituicaoId);
    };

    const handleExclusaoConfirmada = async () => {
        if (itemParaExcluir) {
            const docRef = doc(db, cursoCollectionPath, itemParaExcluir.id);
            await deleteDoc(docRef);
            setItemParaExcluir(null);
        }
    };

    const getInstSigla = (id) => instituicoes.find(i => i.id === id)?.sigla || '?';

    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Gerenciar Cursos</h2>
            <form onSubmit={handleSubmit} className="bg-gray-700 p-6 rounded-lg mb-8 space-y-4">
                <h3 className="text-xl font-semibold">{editando ? 'Editando' : 'Novo'} Curso</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do Curso" className="bg-gray-600 rounded-lg p-3" required />
                    <input type="text" value={sigla} onChange={e => setSigla(e.target.value)} placeholder="Sigla" className="bg-gray-600 rounded-lg p-3" required />
                    <input type="number" value={ano} onChange={e => setAno(e.target.value)} placeholder="Ano" className="bg-gray-600 rounded-lg p-3" required />
                    <input type="number" value={semestre} onChange={e => setSemestre(e.target.value)} placeholder="Semestre" className="bg-gray-600 rounded-lg p-3" required />
                    <select value={instituicaoId} onChange={e => setInstituicaoId(e.target.value)} className="md:col-span-2 bg-gray-600 rounded-lg p-3" required>
                        <option value="">Selecione a Instituição</option>
                        {instituicoes.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                    </select>
                </div>
                <div className="flex gap-4">
                    <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-5 rounded-lg">{editando ? 'Salvar' : 'Adicionar'}</button>
                    {editando && <button type="button" onClick={limparForm} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded-lg">Cancelar</button>}
                </div>
            </form>
            <div className="space-y-4">
                {cursos.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                        <div>
                            <p className="font-bold">{c.nome} ({c.sigla})</p>
                            <p className="text-sm text-gray-400">{getInstSigla(c.instituicaoId)} - {c.ano}/{c.semestre}</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => handleEdit(c)} className="text-yellow-400">Editar</button>
                            <button onClick={() => setItemParaExcluir(c)} className="text-red-500">Excluir</button>
                        </div>
                    </div>
                ))}
            </div>
            {itemParaExcluir && <ModalConfirmacao mensagem={`Excluir "${itemParaExcluir.nome}"?`} onConfirmar={handleExclusaoConfirmada} onCancelar={() => setItemParaExcluir(null)} />}
        </div>
    );
}

export default PaginaCursos;

