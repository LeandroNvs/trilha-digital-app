import React, { useState, useMemo } from 'react';
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';
import ModalConfirmacao from '../components/ModalConfirmacao.jsx';
import ModalAdicionarIntegrantes from '../components/ModalAdicionarIntegrantes.jsx';

// Hooks de dados combinados
const useCursosCombinados = () => {
    const cursos = useCollection(`/artifacts/${appId}/public/data/cursos`);
    const instituicoes = useCollection(`/artifacts/${appId}/public/data/instituicoes`);
    return useMemo(() => {
        if (!cursos.length || !instituicoes.length) return { lista: [], mapa: {} };
        const mapa = {};
        cursos.forEach(curso => {
            const inst = instituicoes.find(i => i.id === curso.instituicaoId);
            mapa[curso.id] = { ...curso, siglaInstituicao: inst?.sigla || '??', nomeInstituicao: inst?.nome || '??' };
        });
        return { lista: Object.values(mapa), mapa };
    }, [cursos, instituicoes]);
};

const useDisciplinasCombinadas = () => {
    const disciplinas = useCollection(`/artifacts/${appId}/public/data/disciplinas`);
    const { mapa: cursosMapa } = useCursosCombinados();
    return useMemo(() => {
        if (!disciplinas.length || Object.keys(cursosMapa).length === 0) return { lista: [], mapa: {} };
        const mapa = {};
        disciplinas.forEach(d => {
            const curso = cursosMapa[d.cursoId];
            mapa[d.id] = { ...d, curso, textoCompleto: `${d.nome} (${d.sigla}) - ${curso?.sigla || ''} - ${curso?.siglaInstituicao || ''}` };
        });
        return { lista: Object.values(mapa), mapa };
    }, [disciplinas, cursosMapa]);
};

function PaginaGrupos() {
    // Estados do formulário
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [sigla, setSigla] = useState('');
    const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState({});
    const [editando, setEditando] = useState(null);
    const [itemParaExcluir, setItemParaExcluir] = useState(null);
    const [instituicaoFiltroId, setInstituicaoFiltroId] = useState('');
    const [cursoFiltroId, setCursoFiltroId] = useState('');
    
    // Estado para controlar o modal de integrantes
    const [grupoParaIntegrantes, setGrupoParaIntegrantes] = useState(null);

    // Busca de dados
    const collectionPath = `/artifacts/${appId}/public/data/grupos`;
    const grupos = useCollection(collectionPath);
    const instituicoes = useCollection(`/artifacts/${appId}/public/data/instituicoes`);
    const todosCursos = useCollection(`/artifacts/${appId}/public/data/cursos`);
    const todasDisciplinas = useCollection(`/artifacts/${appId}/public/data/disciplinas`);
    const todosAlunos = useCollection('usuarios'); // Busca todos os usuários para passar para o modal
    const { mapa: disciplinasMapa } = useDisciplinasCombinadas();

    // Lógica de filtragem
    const cursosFiltrados = useMemo(() => todosCursos.filter(c => c.instituicaoId === instituicaoFiltroId), [todosCursos, instituicaoFiltroId]);
    const disciplinasFiltradas = useMemo(() => todasDisciplinas.filter(d => d.cursoId === cursoFiltroId), [todasDisciplinas, cursoFiltroId]);

    const limparForm = () => {
        setNome(''); setDescricao(''); setSigla(''); setDisciplinasSelecionadas({});
        setInstituicaoFiltroId(''); setCursoFiltroId(''); setEditando(null);
    };

    const handleCheckboxChange = (disciplinaId) => {
        setDisciplinasSelecionadas(prev => ({ ...prev, [disciplinaId]: !prev[disciplinaId] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const disciplinasIds = Object.keys(disciplinasSelecionadas).filter(id => disciplinasSelecionadas[id]);
        if ([nome, sigla].some(v => v.trim() === '') || disciplinasIds.length === 0) return;
        
        // Garante que novos grupos tenham o array de integrantes vazio
        const dados = { 
            nome, 
            descricao, 
            sigla, 
            disciplinasIds, 
            integrantesIds: editando?.integrantesIds || [] // Mantém integrantes se estiver editando
        };
        
        if (editando) {
            await updateDoc(doc(db, collectionPath, editando.id), dados);
        } else {
            await addDoc(collection(db, collectionPath), { ...dados, criadaEm: serverTimestamp() });
        }
        limparForm();
    };

    const handleEdit = (g) => {
        setEditando(g);
        setNome(g.nome);
        setDescricao(g.descricao || '');
        setSigla(g.sigla);
        
        const selecaoInicial = {};
        g.disciplinasIds.forEach(id => { selecaoInicial[id] = true; });
        setDisciplinasSelecionadas(selecaoInicial);

        if (g.disciplinasIds.length > 0) {
            const disciplina = todasDisciplinas.find(d => d.id === g.disciplinasIds[0]);
            if (disciplina) {
                const curso = todosCursos.find(c => c.id === disciplina.cursoId);
                if (curso) {
                    setInstituicaoFiltroId(curso.instituicaoId);
                    setCursoFiltroId(curso.id);
                }
            }
        }
    };

    const handleExclusaoConfirmada = async () => {
        if (itemParaExcluir) {
            await deleteDoc(doc(db, collectionPath, itemParaExcluir.id));
            setItemParaExcluir(null);
        }
    };
    
    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Gerenciar Grupos</h2>
            
            <form onSubmit={handleSubmit} className="bg-gray-700 p-6 rounded-lg mb-8 space-y-6">
                <h3 className="text-xl font-semibold">{editando ? 'Editando' : 'Novo'} Grupo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do Grupo" className="bg-gray-600 rounded-lg p-3" required />
                    <input type="text" value={sigla} onChange={e => setSigla(e.target.value)} placeholder="Sigla" className="bg-gray-600 rounded-lg p-3" required />
                    <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição" className="md:col-span-2 bg-gray-600 rounded-lg p-3 h-24 resize-none"></textarea>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Filtros para Seleção de Disciplinas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <select value={instituicaoFiltroId} onChange={e => {setInstituicaoFiltroId(e.target.value); setCursoFiltroId(''); setDisciplinasSelecionadas({});}} className="bg-gray-600 rounded-lg p-3" required>
                            <option value="">1º Selecione a Instituição</option>
                            {instituicoes.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                        </select>
                        <select value={cursoFiltroId} onChange={e => {setCursoFiltroId(e.target.value); setDisciplinasSelecionadas({});}} className="bg-gray-600 rounded-lg p-3" disabled={!instituicaoFiltroId} required>
                            <option value="">2º Selecione o Curso</option>
                            {cursosFiltrados.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    </div>
                    <h4 className="font-semibold mb-2">Disciplinas do Curso Selecionado</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto bg-gray-600 p-3 rounded-lg">
                        {cursoFiltroId ? (
                            disciplinasFiltradas.length > 0 ? disciplinasFiltradas.map(d => (
                                <label key={d.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-500 cursor-pointer">
                                    <input type="checkbox" checked={!!disciplinasSelecionadas[d.id]} onChange={() => handleCheckboxChange(d.id)} className="w-5 h-5 bg-gray-700 rounded text-cyan-500 focus:ring-cyan-600" />
                                    <span>{d.nome} ({d.sigla})</span>
                                </label>
                            )) : <span className="text-gray-400">Nenhuma disciplina encontrada.</span>
                        ) : <span className="text-gray-400">Selecione um curso para ver as disciplinas.</span>}
                    </div>
                </div>
                <div className="flex gap-4"> <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-5 rounded-lg">{editando ? 'Salvar' : 'Adicionar'}</button> {editando && <button type="button" onClick={limparForm} className="bg-gray-500 hover:bg-gray-600 font-bold py-2 px-5 rounded-lg">Cancelar</button>} </div>
            </form>

            <div className="space-y-4">
                {grupos.map(g => (
                    <div key={g.id} className="bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-bold">{g.nome} ({g.sigla})</p>
                                <p className="text-sm text-gray-400">{g.descricao}</p>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                                <button onClick={() => setGrupoParaIntegrantes(g)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg text-sm">
                                    Integrantes ({g.integrantesIds?.length || 0})
                                </button>
                                <button onClick={() => handleEdit(g)} className="text-yellow-400">Editar</button>
                                <button onClick={() => setItemParaExcluir(g)} className="text-red-500">Excluir</button>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-600">
                            <p className="text-xs text-gray-300 font-semibold">Disciplinas:</p>
                            <ul className="list-disc list-inside text-sm text-gray-400">
                                {g.disciplinasIds.map(id => <li key={id}>{disciplinasMapa[id]?.textoCompleto || `ID: ${id}`}</li>)}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>

            {itemParaExcluir && <ModalConfirmacao mensagem={`Excluir "${itemParaExcluir.nome}"?`} onConfirmar={handleExclusaoConfirmada} onCancelar={() => setItemParaExcluir(null)} />}
            {grupoParaIntegrantes && <ModalAdicionarIntegrantes grupo={grupoParaIntegrantes} onClose={() => setGrupoParaIntegrantes(null)} todosAlunos={todosAlunos} />}
        </div>
    );
}

export default PaginaGrupos;

