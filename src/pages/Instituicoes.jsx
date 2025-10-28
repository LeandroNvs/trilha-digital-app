import React, { useState } from 'react';
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';
import ModalConfirmacao from '../components/ModalConfirmacao.jsx';

function PaginaInstituicoes() {
    const [nome, setNome] = useState('');
    const [sigla, setSigla] = useState('');
    const [editando, setEditando] = useState(null);
    const [itemParaExcluir, setItemParaExcluir] = useState(null);

    const collectionPath = `/artifacts/${appId}/public/data/instituicoes`;
    const instituicoes = useCollection(collectionPath);

    const limparForm = () => {
        setNome('');
        setSigla('');
        setEditando(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (nome.trim() === '' || sigla.trim() === '') return;

        const instituicoesCollection = collection(db, collectionPath);

        if (editando) {
            const docRef = doc(db, collectionPath, editando.id);
            await updateDoc(docRef, { nome, sigla });
        } else {
            await addDoc(instituicoesCollection, { nome, sigla, criadaEm: serverTimestamp() });
        }
        limparForm();
    };

    const handleEdit = (inst) => {
        setEditando(inst);
        setNome(inst.nome);
        setSigla(inst.sigla);
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
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Gerenciar Instituições</h2>
            <form onSubmit={handleSubmit} className="bg-gray-700 p-6 rounded-lg mb-8 space-y-4">
                <h3 className="text-xl text-white font-semibold">{editando ? 'Editando Instituição' : 'Nova Instituição'}</h3>
                <div className="flex flex-col md:flex-row gap-4">
                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da Instituição" className="flex-grow bg-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                    <input type="text" value={sigla} onChange={e => setSigla(e.target.value)} placeholder="Sigla" className="md:w-1/4 bg-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                </div>
                <div className="flex gap-4">
                    <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-5 rounded-lg">{editando ? 'Salvar' : 'Adicionar'}</button>
                    {editando && <button type="button" onClick={limparForm} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded-lg">Cancelar</button>}
                </div>
            </form>
            <div className="space-y-4">
                {instituicoes.map(inst => (
                    <div key={inst.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                        <div>
                            <p className="font-bold text-lg text-white">{inst.nome}</p>
                            <p className="text-sm text-gray-400">{inst.sigla}</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => handleEdit(inst)} className="text-yellow-400 hover:text-yellow-300">Editar</button>
                            <button onClick={() => setItemParaExcluir(inst)} className="text-red-500 hover:text-red-400">Excluir</button>
                        </div>
                    </div>
                ))}
            </div>
            {itemParaExcluir && <ModalConfirmacao mensagem={`Excluir "${itemParaExcluir.nome}"?`} onConfirmar={handleExclusaoConfirmada} onCancelar={() => setItemParaExcluir(null)} />}
        </div>
    );
}

export default PaginaInstituicoes;

