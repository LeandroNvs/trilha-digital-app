import React, { useState, useMemo } from 'react';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db, appId } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';

function PaginaAlunos() {
    // Filtros e Busca
    const [abaTriagem, setAbaTriagem] = useState('todos'); // 'todos' | 'sem_turma' | 'sem_grupo' | 'vinculados'
    const [filtroTurma, setFiltroTurma] = useState('');
    const [buscaTexto, setBuscaTexto] = useState('');

    // Edição de Nome inline
    const [editandoNomeId, setEditandoNomeId] = useState(null);
    const [novoNomeInput, setNovoNomeInput] = useState('');
    const [salvandoNome, setSalvandoNome] = useState(false);

    // Seleção em Lote (Multi-select)
    const [selecionados, setSelecionados] = useState({});
    const [turmaLoteId, setTurmaLoteId] = useState('');
    const [grupoLoteId, setGrupoLoteId] = useState('');
    const [processandoLote, setProcessandoLote] = useState(false);

    // Feedback de ações (Reset de senha, exclusão, lote)
    const [mensagemStatus, setMensagemStatus] = useState(null); // { tipo: 'sucesso' | 'erro', texto: '' }
    const [enviandoResetId, setEnviandoResetId] = useState(null);

    // Dados do Firestore
    const { documents: usuariosData, isLoading: isUsuariosLoading } = useCollection('usuarios');
    const usuarios = usuariosData || [];

    const { documents: turmasData, isLoading: isTurmasLoading } = useCollection(`/artifacts/${appId}/public/data/turmas`);
    const turmas = turmasData || [];

    const { documents: gruposData, isLoading: isGruposLoading } = useCollection(`/artifacts/${appId}/public/data/grupos`);
    const grupos = gruposData || [];

    const exibirFeedback = (tipo, texto) => {
        setMensagemStatus({ tipo, texto });
        setTimeout(() => {
            setMensagemStatus(prev => (prev?.texto === texto ? null : prev));
        }, 4500);
    };

    // Mapa de qual grupo(s) cada usuário participa
    const gruposPorUsuario = useMemo(() => {
        const mapa = {};
        grupos.forEach(g => {
            (g.integrantesIds || []).forEach(uid => {
                if (!mapa[uid]) mapa[uid] = [];
                mapa[uid].push(g);
            });
        });
        return mapa;
    }, [grupos]);

    // Contadores para as abas de triagem (apenas alunos/professores, ignorando admin puro nas pendências)
    const contadoresTriagem = useMemo(() => {
        let semTurma = 0;
        let semGrupo = 0;
        let vinculados = 0;

        usuarios.forEach(u => {
            if (u.papel === 'admin') return;
            const temTurma = !!u.turmaId;
            const temGrupo = (gruposPorUsuario[u.id]?.length || 0) > 0;

            if (!temTurma) semTurma++;
            if (!temGrupo) semGrupo++;
            if (temTurma && temGrupo) vinculados++;
        });

        return {
            todos: usuarios.length,
            semTurma,
            semGrupo,
            vinculados
        };
    }, [usuarios, gruposPorUsuario]);

    // Filtragem e Ordenação Alfabética
    const usuariosFiltrados = useMemo(() => {
        const termo = buscaTexto.trim().toLowerCase();

        const filtrados = usuarios.filter(u => {
            const temTurma = !!u.turmaId;
            const temGrupo = (gruposPorUsuario[u.id]?.length || 0) > 0;

            // Filtro por Aba de Triagem
            if (abaTriagem === 'sem_turma' && (u.papel === 'admin' || temTurma)) return false;
            if (abaTriagem === 'sem_grupo' && (u.papel === 'admin' || temGrupo)) return false;
            if (abaTriagem === 'vinculados' && (u.papel === 'admin' || !temTurma || !temGrupo)) return false;

            // Filtro por Turma específica
            if (filtroTurma === 'nao_vinculada' && temTurma) return false;
            if (filtroTurma && filtroTurma !== 'nao_vinculada' && u.turmaId !== filtroTurma) return false;

            // Filtro por Busca de Texto (Nome ou E-mail)
            if (termo) {
                const matchNome = (u.nome || '').toLowerCase().includes(termo);
                const matchEmail = (u.email || '').toLowerCase().includes(termo);
                if (!matchNome && !matchEmail) return false;
            }

            return true;
        });

        // Ordenar: quem está com nome parecido com prefixo ou sem vínculo pode ser facilmente achado, padrão alfabético por nome
        return [...filtrados].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
    }, [usuarios, gruposPorUsuario, abaTriagem, filtroTurma, buscaTexto]);

    // Verificar se o nome parece ser apenas o prefixo do e-mail (para destacar visualmente)
    const isNomeIncompleto = (u) => {
        if (!u.nome) return true;
        const prefixo = u.email ? u.email.split('@')[0].toLowerCase() : '';
        const nomeLower = u.nome.trim().toLowerCase();
        return nomeLower === prefixo || !u.nome.trim().includes(' ');
    };

    // --- Ações Individuais ---

    const handleIniciarEdicaoNome = (u) => {
        setEditandoNomeId(u.id);
        setNovoNomeInput(u.nome || '');
    };

    const handleSalvarNome = async (userId) => {
        const limpo = novoNomeInput.trim().replace(/\s+/g, ' ');
        if (limpo.length < 2) return;
        setSalvandoNome(true);
        try {
            const fotoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(limpo)}&background=0D8ABC&color=fff`;
            await updateDoc(doc(db, 'usuarios', userId), {
                nome: limpo,
                fotoURL
            });
            setEditandoNomeId(null);
            exibirFeedback('sucesso', `Nome atualizado para "${limpo}".`);
        } catch (err) {
            console.error("Erro ao atualizar nome:", err);
            exibirFeedback('erro', 'Erro ao salvar o nome do usuário.');
        } finally {
            setSalvandoNome(false);
        }
    };

    const handleChangePapel = async (userId, novoPapel) => {
        try {
            const userRef = doc(db, 'usuarios', userId);
            await updateDoc(userRef, { papel: novoPapel });
            exibirFeedback('sucesso', 'Papel do usuário atualizado.');
        } catch (err) {
            console.error("Erro ao alterar papel:", err);
            exibirFeedback('erro', 'Erro ao alterar papel.');
        }
    };

    const handleChangeTurma = async (userId, novaTurmaId) => {
        try {
            const userRef = doc(db, 'usuarios', userId);
            await updateDoc(userRef, { turmaId: novaTurmaId });
            exibirFeedback('sucesso', 'Turma atualizada com sucesso.');
        } catch (err) {
            console.error("Erro ao vincular turma:", err);
            exibirFeedback('erro', 'Erro ao vincular turma.');
        }
    };

    // Vincular ou trocar o aluno de Grupo diretamente na tabela (e já sincronizar a turma se estiver vazia)
    const handleChangeGrupo = async (usuario, novoGrupoId) => {
        try {
            const gruposAtuais = gruposPorUsuario[usuario.id] || [];

            // Remove dos grupos anteriores da mesma turma (ou de todos se escolheu "Sem Grupo")
            for (const gAntigo of gruposAtuais) {
                if (!novoGrupoId || gAntigo.id !== novoGrupoId) {
                    const gRef = doc(db, 'artifacts', appId, 'public', 'data', 'grupos', gAntigo.id);
                    await updateDoc(gRef, {
                        integrantesIds: arrayRemove(usuario.id)
                    });
                }
            }

            if (novoGrupoId) {
                const grupoAlvo = grupos.find(g => g.id === novoGrupoId);
                const gRef = doc(db, 'artifacts', appId, 'public', 'data', 'grupos', novoGrupoId);
                await updateDoc(gRef, {
                    integrantesIds: arrayUnion(usuario.id)
                });

                // Se o aluno ainda estava sem turma (ou em outra turma) e o grupo tem turmaId, já vincula a turma automaticamente!
                if (grupoAlvo?.turmaId && usuario.turmaId !== grupoAlvo.turmaId) {
                    await updateDoc(doc(db, 'usuarios', usuario.id), {
                        turmaId: grupoAlvo.turmaId
                    });
                }
                exibirFeedback('sucesso', `${usuario.nome} vinculado ao grupo "${grupoAlvo?.nome || ''}"!`);
            } else {
                exibirFeedback('sucesso', `${usuario.nome} removido do grupo.`);
            }
        } catch (err) {
            console.error("Erro ao vincular grupo:", err);
            exibirFeedback('erro', 'Erro ao atualizar vínculo de grupo.');
        }
    };

    // Enviar e-mail de redefinição de senha pelo painel do professor
    const handleEnviarResetSenha = async (usuario) => {
        if (!usuario.email) return;
        const confirmar = window.confirm(
            `Deseja enviar um e-mail de redefinição de senha para:\n\n${usuario.nome} (${usuario.email})?`
        );
        if (!confirmar) return;

        setEnviandoResetId(usuario.id);
        try {
            auth.languageCode = 'pt-BR';
            await sendPasswordResetEmail(auth, usuario.email);
            exibirFeedback('sucesso', `🔑 Link de redefinição de senha enviado para ${usuario.email}! (Peça para verificar também o Spam).`);
        } catch (err) {
            console.error("Erro ao enviar reset de senha:", err);
            exibirFeedback('erro', `Não foi possível enviar o e-mail para ${usuario.email}.`);
        } finally {
            setEnviandoResetId(null);
        }
    };

    // Excluir usuário poluído/duplicado
    const handleExcluirUsuario = async (usuario) => {
        if (usuario.email === 'leandros.nvs@gmail.com') return;
        const confirmar = window.confirm(
            `Tem certeza que deseja EXCLUIR o cadastro de "${usuario.nome}" (${usuario.email})?\n\nEle também será removido de qualquer grupo vinculado.`
        );
        if (!confirmar) return;

        try {
            // Remove de grupos caso pertença a algum
            const gruposAtuais = gruposPorUsuario[usuario.id] || [];
            for (const g of gruposAtuais) {
                const gRef = doc(db, 'artifacts', appId, 'public', 'data', 'grupos', g.id);
                await updateDoc(gRef, {
                    integrantesIds: arrayRemove(usuario.id)
                }).catch(() => {});
            }

            await deleteDoc(doc(db, 'usuarios', usuario.id));
            setSelecionados(prev => {
                const copy = { ...prev };
                delete copy[usuario.id];
                return copy;
            });
            exibirFeedback('sucesso', `Usuário "${usuario.nome}" removido com sucesso.`);
        } catch (err) {
            console.error("Erro ao excluir usuário:", err);
            exibirFeedback('erro', 'Erro ao excluir usuário.');
        }
    };

    // --- Ações em Lote (Multi-seleção) ---

    const idsSelecionados = useMemo(
        () => Object.keys(selecionados).filter(id => selecionados[id]),
        [selecionados]
    );

    const toggleSelecionarUsuario = (id) => {
        setSelecionados(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleSelecionarTodosVisiveis = () => {
        const elegiveis = usuariosFiltrados.filter(u => u.email !== 'leandros.nvs@gmail.com');
        const todosMarcados = elegiveis.length > 0 && elegiveis.every(u => selecionados[u.id]);
        if (todosMarcados) {
            const novo = { ...selecionados };
            elegiveis.forEach(u => { delete novo[u.id]; });
            setSelecionados(novo);
        } else {
            const novo = { ...selecionados };
            elegiveis.forEach(u => { novo[u.id] = true; });
            setSelecionados(novo);
        }
    };

    const handleAplicarTurmaEmLote = async () => {
        if (!turmaLoteId || idsSelecionados.length === 0) return;
        setProcessandoLote(true);
        try {
            const valorTurma = turmaLoteId === '__limpar__' ? '' : turmaLoteId;
            for (const uid of idsSelecionados) {
                await updateDoc(doc(db, 'usuarios', uid), { turmaId: valorTurma });
            }
            setSelecionados({});
            setTurmaLoteId('');
            exibirFeedback('sucesso', `Turma aplicada com sucesso a ${idsSelecionados.length} aluno(s)!`);
        } catch (err) {
            console.error("Erro ao vincular turma em lote:", err);
            exibirFeedback('erro', 'Erro ao aplicar turma em lote.');
        } finally {
            setProcessandoLote(false);
        }
    };

    const handleAplicarGrupoEmLote = async () => {
        if (!grupoLoteId || idsSelecionados.length === 0) return;
        setProcessandoLote(true);
        try {
            const grupoAlvo = grupos.find(g => g.id === grupoLoteId);
            if (!grupoAlvo) return;

            const gRef = doc(db, 'artifacts', appId, 'public', 'data', 'grupos', grupoAlvo.id);
            for (const uid of idsSelecionados) {
                await updateDoc(gRef, {
                    integrantesIds: arrayUnion(uid)
                });
                if (grupoAlvo.turmaId) {
                    await updateDoc(doc(db, 'usuarios', uid), {
                        turmaId: grupoAlvo.turmaId
                    });
                }
            }
            setSelecionados({});
            setGrupoLoteId('');
            exibirFeedback('sucesso', `${idsSelecionados.length} aluno(s) vinculados ao grupo "${grupoAlvo.nome}" e à respectiva turma!`);
        } catch (err) {
            console.error("Erro ao vincular grupo em lote:", err);
            exibirFeedback('erro', 'Erro ao aplicar grupo em lote.');
        } finally {
            setProcessandoLote(false);
        }
    };

    const handleExcluirEmLote = async () => {
        if (idsSelecionados.length === 0) return;
        const confirmar = window.confirm(
            `Tem certeza que deseja EXCLUIR os ${idsSelecionados.length} usuários selecionados?\n\nEsta ação removerá os perfis selecionados da plataforma.`
        );
        if (!confirmar) return;

        setProcessandoLote(true);
        try {
            for (const uid of idsSelecionados) {
                const gruposAtuais = gruposPorUsuario[uid] || [];
                for (const g of gruposAtuais) {
                    const gRef = doc(db, 'artifacts', appId, 'public', 'data', 'grupos', g.id);
                    await updateDoc(gRef, { integrantesIds: arrayRemove(uid) }).catch(() => {});
                }
                await deleteDoc(doc(db, 'usuarios', uid));
            }
            setSelecionados({});
            exibirFeedback('sucesso', `${idsSelecionados.length} usuário(s) excluídos com sucesso.`);
        } catch (err) {
            console.error("Erro ao excluir em lote:", err);
            exibirFeedback('erro', 'Erro ao excluir usuários selecionados.');
        } finally {
            setProcessandoLote(false);
        }
    };

    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-4 sm:p-8 animate-fade-in space-y-6">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-700 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-400">Gerenciar Alunos e Triagem de Ingresso</h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">
                        Identifique alunos pelo nome completo, vincule-os às Turmas e Grupos em lote, envie reset de senha ou limpe cadastros indevidos.
                    </p>
                </div>
            </div>

            {/* Alerta de Feedback */}
            {mensagemStatus && (
                <div className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between ${
                    mensagemStatus.tipo === 'sucesso'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}>
                    <span>{mensagemStatus.texto}</span>
                    <button onClick={() => setMensagemStatus(null)} className="text-gray-400 hover:text-white ml-4">✕</button>
                </div>
            )}

            {/* Abas Rápidas de Triagem */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                    type="button"
                    onClick={() => setAbaTriagem('todos')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                        abaTriagem === 'todos'
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                            : 'bg-gray-700/60 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                >
                    <span className="text-xs uppercase font-bold text-gray-400 block">📋 Todos os Cadastros</span>
                    <span className="text-2xl font-black text-white">{contadoresTriagem.todos}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setAbaTriagem('sem_turma')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                        abaTriagem === 'sem_turma'
                            ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                            : 'bg-gray-700/60 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                >
                    <span className="text-xs uppercase font-bold text-amber-300 block">⏳ Sem Turma (Novos)</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-amber-400">{contadoresTriagem.semTurma}</span>
                        <span className="text-[11px] text-gray-400">aguardando vínculo</span>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setAbaTriagem('sem_grupo')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                        abaTriagem === 'sem_grupo'
                            ? 'bg-purple-500/20 border-purple-400 text-white shadow-md'
                            : 'bg-gray-700/60 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                >
                    <span className="text-xs uppercase font-bold text-purple-300 block">👥 Sem Grupo / Equipe</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-purple-400">{contadoresTriagem.semGrupo}</span>
                        <span className="text-[11px] text-gray-400">sem equipe</span>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setAbaTriagem('vinculados')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                        abaTriagem === 'vinculados'
                            ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md'
                            : 'bg-gray-700/60 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                >
                    <span className="text-xs uppercase font-bold text-emerald-300 block">✅ Turma + Grupo OK</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-emerald-400">{contadoresTriagem.vinculados}</span>
                        <span className="text-[11px] text-gray-400">prontos p/ uso</span>
                    </div>
                </button>
            </div>

            {/* Barra de Pesquisa e Filtro por Turma */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-gray-700/80 p-4 rounded-xl border border-gray-600/60">
                <div className="flex-1">
                    <input
                        type="text"
                        value={buscaTexto}
                        onChange={(e) => setBuscaTexto(e.target.value)}
                        placeholder="🔍 Buscar aluno por nome ou e-mail..."
                        className="w-full bg-gray-800 text-white rounded-lg px-3.5 py-2.5 text-sm border border-gray-600 focus:outline-none focus:border-cyan-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-gray-300 whitespace-nowrap">Turma:</span>
                    <select
                        value={filtroTurma}
                        onChange={(e) => setFiltroTurma(e.target.value)}
                        className="bg-gray-800 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-600 focus:outline-none focus:border-cyan-500 min-w-[210px]"
                    >
                        <option value="">Todas as Turmas</option>
                        <option value="nao_vinculada">⏳ Não Vinculada (Sem Turma)</option>
                        {turmas.map(t => (
                            <option key={t.id} value={t.id}>{t.nome} ({t.sigla})</option>
                        ))}
                    </select>
                </div>

                <span className="text-xs text-gray-300 font-mono whitespace-nowrap self-center">
                    {usuariosFiltrados.length} exibido(s)
                </span>
            </div>

            {/* Barra de Ações em Lote (aparece quando há alunos marcados) */}
            {idsSelecionados.length > 0 && (
                <div className="bg-cyan-950/60 border border-cyan-500/50 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-lg">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-cyan-500 text-gray-950 font-black text-xs">
                            {idsSelecionados.length} selecionado(s)
                        </span>
                        <span className="text-xs sm:text-sm text-cyan-200 font-semibold">
                            Ações rápidas em lote:
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* Vincular Turma em Lote */}
                        <div className="flex items-center gap-1.5">
                            <select
                                value={turmaLoteId}
                                onChange={(e) => setTurmaLoteId(e.target.value)}
                                className="bg-gray-900 text-white rounded-lg px-2.5 py-2 text-xs border border-gray-600 focus:border-cyan-400"
                            >
                                <option value="">Escolher Turma...</option>
                                <option value="__limpar__">❌ Remover Turma</option>
                                {turmas.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome} ({t.sigla})</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                disabled={!turmaLoteId || processandoLote}
                                onClick={handleAplicarTurmaEmLote}
                                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition-colors whitespace-nowrap"
                            >
                                Aplicar Turma
                            </button>
                        </div>

                        {/* Vincular Grupo em Lote */}
                        <div className="flex items-center gap-1.5">
                            <select
                                value={grupoLoteId}
                                onChange={(e) => setGrupoLoteId(e.target.value)}
                                className="bg-gray-900 text-white rounded-lg px-2.5 py-2 text-xs border border-gray-600 focus:border-cyan-400"
                            >
                                <option value="">Escolher Grupo...</option>
                                {grupos.map(g => {
                                    const t = turmas.find(turma => turma.id === g.turmaId);
                                    return (
                                        <option key={g.id} value={g.id}>
                                            {g.nome} ({g.sigla}) {t ? `- ${t.sigla}` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            <button
                                type="button"
                                disabled={!grupoLoteId || processandoLote}
                                onClick={handleAplicarGrupoEmLote}
                                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition-colors whitespace-nowrap"
                            >
                                Aplicar Grupo
                            </button>
                        </div>

                        {/* Excluir Selecionados */}
                        <button
                            type="button"
                            disabled={processandoLote}
                            onClick={handleExcluirEmLote}
                            className="px-3 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                            🗑️ Excluir ({idsSelecionados.length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelecionados({})}
                            className="text-xs text-gray-400 hover:text-white underline ml-1"
                        >
                            Limpar seleção
                        </button>
                    </div>
                </div>
            )}

            {/* Tabela de Usuários */}
            <div className="overflow-x-auto rounded-xl border border-gray-700">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-900/70 border-b border-gray-700 text-xs uppercase text-gray-400">
                            <th className="p-3.5 w-10 text-center">
                                <input
                                    type="checkbox"
                                    onChange={toggleSelecionarTodosVisiveis}
                                    checked={
                                        usuariosFiltrados.filter(u => u.email !== 'leandros.nvs@gmail.com').length > 0 &&
                                        usuariosFiltrados.filter(u => u.email !== 'leandros.nvs@gmail.com').every(u => selecionados[u.id])
                                    }
                                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-cyan-500 cursor-pointer"
                                    title="Selecionar todos da lista"
                                />
                            </th>
                            <th className="p-3.5">Nome Completo / E-mail</th>
                            <th className="p-3.5">Turma Vinculada</th>
                            <th className="p-3.5">Grupo / Equipe</th>
                            <th className="p-3.5">Papel</th>
                            <th className="p-3.5 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/70 text-sm">
                        {isUsuariosLoading && (
                            <tr>
                                <td colSpan="6" className="p-6 text-center text-gray-400">
                                    Carregando usuários...
                                </td>
                            </tr>
                        )}
                        {!isUsuariosLoading && usuariosFiltrados.length === 0 && (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-400">
                                    Nenhum usuário encontrado para este filtro.
                                </td>
                            </tr>
                        )}
                        {usuariosFiltrados.map(u => {
                            const isSuperAdmin = u.email === 'leandros.nvs@gmail.com';
                            const gruposDoAluno = gruposPorUsuario[u.id] || [];
                            const grupoAtualId = gruposDoAluno[0]?.id || '';
                            const gruposDisponiveisParaAluno = u.turmaId
                                ? grupos.filter(g => g.turmaId === u.turmaId || g.id === grupoAtualId)
                                : grupos;
                            const nomeSuspeito = isNomeIncompleto(u);

                            return (
                                <tr
                                    key={u.id}
                                    className={`transition-colors ${
                                        selecionados[u.id] ? 'bg-cyan-950/30' : 'hover:bg-gray-700/50'
                                    }`}
                                >
                                    {/* Checkbox */}
                                    <td className="p-3.5 text-center">
                                        {!isSuperAdmin && (
                                            <input
                                                type="checkbox"
                                                checked={!!selecionados[u.id]}
                                                onChange={() => toggleSelecionarUsuario(u.id)}
                                                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-cyan-500 cursor-pointer"
                                            />
                                        )}
                                    </td>

                                    {/* Nome + E-mail + Edição inline */}
                                    <td className="p-3.5 min-w-[240px]">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={u.fotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome || 'U')}&background=0D8ABC&color=fff`}
                                                alt={u.nome}
                                                className="w-9 h-9 rounded-full shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                {editandoNomeId === u.id ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="text"
                                                            value={novoNomeInput}
                                                            onChange={(e) => setNovoNomeInput(e.target.value)}
                                                            placeholder="Nome e Sobrenome"
                                                            className="bg-gray-900 border border-cyan-400 rounded px-2.5 py-1 text-xs text-white focus:outline-none w-full max-w-[200px]"
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={salvandoNome}
                                                            onClick={() => handleSalvarNome(u.id)}
                                                            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold"
                                                        >
                                                            Salvar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditandoNomeId(null)}
                                                            className="px-1.5 py-1 text-gray-400 hover:text-white text-xs"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-bold text-white truncate">{u.nome || 'Sem nome'}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleIniciarEdicaoNome(u)}
                                                            className="text-xs text-gray-400 hover:text-cyan-400 transition-colors"
                                                            title="Editar nome completo do usuário"
                                                        >
                                                            ✏️
                                                        </button>
                                                        {nomeSuspeito && (
                                                            <span
                                                                onClick={() => handleIniciarEdicaoNome(u)}
                                                                className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold cursor-pointer"
                                                                title="Este nome parece incompleto ou apenas o prefixo do e-mail. Clique para editar."
                                                            >
                                                                ⚠️ Sem sobrenome
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-400 truncate mt-0.5">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Turma Vinculada */}
                                    <td className="p-3.5 min-w-[190px]">
                                        {u.papel === 'admin' ? (
                                            <span className="text-xs text-gray-500 italic">Não aplicável a Admin</span>
                                        ) : (
                                            <select
                                                value={u.turmaId || ''}
                                                onChange={(e) => handleChangeTurma(u.id, e.target.value)}
                                                className={`rounded-lg p-2 text-xs w-full border focus:outline-none focus:border-cyan-400 ${
                                                    u.turmaId
                                                        ? 'bg-gray-700 border-gray-600 text-white'
                                                        : 'bg-amber-500/10 border-amber-500/40 text-amber-200 font-semibold'
                                                }`}
                                            >
                                                <option value="">{isTurmasLoading ? 'Carregando...' : '⏳ Sem Turma (Vincular...)'}</option>
                                                {turmas.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.nome} ({t.sigla})
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </td>

                                    {/* Grupo Vinculado */}
                                    <td className="p-3.5 min-w-[200px]">
                                        {u.papel === 'admin' ? (
                                            <span className="text-xs text-gray-500 italic">—</span>
                                        ) : (
                                            <select
                                                value={grupoAtualId}
                                                onChange={(e) => handleChangeGrupo(u, e.target.value)}
                                                className={`rounded-lg p-2 text-xs w-full border focus:outline-none focus:border-cyan-400 ${
                                                    grupoAtualId
                                                        ? 'bg-gray-700 border-gray-600 text-white'
                                                        : 'bg-purple-500/10 border-purple-500/40 text-purple-200 font-semibold'
                                                }`}
                                            >
                                                <option value="">{isGruposLoading ? 'Carregando...' : '👥 Sem Grupo (Alocar...)'}</option>
                                                {gruposDisponiveisParaAluno.map(g => {
                                                    const t = turmas.find(turma => turma.id === g.turmaId);
                                                    return (
                                                        <option key={g.id} value={g.id}>
                                                            {g.nome} ({g.sigla}){!u.turmaId && t ? ` • [${t.sigla}]` : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        )}
                                    </td>

                                    {/* Papel */}
                                    <td className="p-3.5 min-w-[130px]">
                                        <select
                                            value={u.papel || 'aluno'}
                                            onChange={(e) => handleChangePapel(u.id, e.target.value)}
                                            className="bg-gray-700 border border-gray-600 rounded-lg p-2 text-xs text-white w-full"
                                            disabled={isSuperAdmin}
                                        >
                                            <option value="aluno">Aluno</option>
                                            <option value="professor">Professor</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>

                                    {/* Ações: Reset de Senha + Excluir */}
                                    <td className="p-3.5 text-right whitespace-nowrap">
                                        <div className="inline-flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                disabled={enviandoResetId === u.id}
                                                onClick={() => handleEnviarResetSenha(u)}
                                                className="px-2.5 py-1.5 bg-gray-700 hover:bg-cyan-600/30 border border-gray-600 hover:border-cyan-500/50 text-cyan-300 rounded-lg text-xs font-semibold transition-colors"
                                                title="Enviar link de redefinição de senha para o e-mail deste usuário"
                                            >
                                                {enviandoResetId === u.id ? '⏳...' : '🔑 Senha'}
                                            </button>

                                            {!isSuperAdmin && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleExcluirUsuario(u)}
                                                    className="px-2.5 py-1.5 bg-gray-700 hover:bg-rose-600/30 border border-gray-600 hover:border-rose-500/50 text-rose-300 rounded-lg text-xs font-semibold transition-colors"
                                                    title="Excluir usuário da plataforma"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default PaginaAlunos;
