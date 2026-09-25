import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, query, where, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, 
  deleteDoc, getDocs, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { db, appId, auth } from '../firebase/config.js';
import useCollection from '../hooks/useCollection.js';
import { FORMAS_QUIZ } from '../components/PulsoDigital/bancoQuestoes.js';

export default function PulsoDigital() {
  // Lista de Turmas e Disciplinas para o modal de criação e filtros
  const { documents: turmasData } = useCollection(`/artifacts/${appId}/public/data/turmas`);
  const { documents: disciplinasData } = useCollection(`/artifacts/${appId}/public/data/disciplinas`);

  // Sessões de Pulso cadastradas
  const [sessoes, setSessoes] = useState([]);
  const [sessaoSelecionadaId, setSessaoSelecionadaId] = useState(null);
  const [sessaoAtiva, setSessaoAtiva] = useState(null);

  // Participantes, Dúvidas e Feedbacks da Sessão Ativa
  const [participantes, setParticipantes] = useState([]);
  const [duvidas, setDuvidas] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [respostasQuiz, setRespostasQuiz] = useState([]);

  // Estados dos Modais e Telas
  const [modalNovaSessaoAberto, setModalNovaSessaoAberto] = useState(false);
  const [modalQuestaoAberto, setModalQuestaoAberto] = useState(false);
  const [questaoEmEdicao, setQuestaoEmEdicao] = useState(null); // null = criando, objeto = editando
  const [modoTelaCheia, setModoTelaCheia] = useState(false);
  const [abaHistorico, setAbaHistorico] = useState(false);
  const [resetandoAula, setResetandoAula] = useState(false);

  // Form Nova Sessão
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaTurmaId, setNovaTurmaId] = useState('');
  const [novaDisciplinaId, setNovaDisciplinaId] = useState('');
  const [novasObservacoes, setNovasObservacoes] = useState('');
  const [salvandoSessao, setSalvandoSessao] = useState(false);

  // Form Criar/Editar Pergunta do Quiz
  const [formPerguntaEnunciado, setFormPerguntaEnunciado] = useState('');
  const [formPerguntaTempo, setFormPerguntaTempo] = useState(30);
  const [formPerguntaOpcoes, setFormPerguntaOpcoes] = useState(['', '', '', '']);
  const [formPerguntaCorretaIndex, setFormPerguntaCorretaIndex] = useState(0);
  const [formPerguntaExplicacao, setFormPerguntaExplicacao] = useState('');

  // Filtros na aba de Aulas Salvas
  const [filtroDisciplina, setFiltroDisciplina] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroBusca, setFiltroBusca] = useState('');

  // Escutar todas as sessões de pulso
  useEffect(() => {
    const sessoesRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes`);
    const q = query(sessoesRef, orderBy('criadaEm', 'desc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      setSessoes(lista);

      // Auto-selecionar a primeira sessão se nenhuma estiver selecionada
      if (!sessaoSelecionadaId && lista.length > 0) {
        const aoVivo = lista.find(s => s.status === 'ao_vivo');
        setSessaoSelecionadaId(aoVivo ? aoVivo.id : lista[0].id);
      }
    }, (err) => {
      console.error("Erro ao listar sessões de pulso:", err);
    });

    return () => unsubscribe();
  }, [sessaoSelecionadaId]);

  // Escutar a sessão ativa selecionada
  useEffect(() => {
    if (!sessaoSelecionadaId) {
      setSessaoAtiva(null);
      return;
    }

    const sessaoDocRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes`, sessaoSelecionadaId);
    const unsubscribe = onSnapshot(sessaoDocRef, (snap) => {
      if (snap.exists()) {
        setSessaoAtiva({ id: snap.id, ...snap.data() });
      } else {
        setSessaoAtiva(null);
      }
    });

    return () => unsubscribe();
  }, [sessaoSelecionadaId]);

  // Escutar participantes da sessão ativa
  useEffect(() => {
    if (!sessaoSelecionadaId) {
      setParticipantes([]);
      return;
    }
    const partRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessaoSelecionadaId}/participantes`);
    const unsubscribe = onSnapshot(partRef, (snap) => {
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (b.pontos || 0) - (a.pontos || 0));
      setParticipantes(lista);
    });
    return () => unsubscribe();
  }, [sessaoSelecionadaId]);

  // Escutar dúvidas da sessão ativa
  useEffect(() => {
    if (!sessaoSelecionadaId) {
      setDuvidas([]);
      return;
    }
    const duvidasRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessaoSelecionadaId}/duvidas`);
    const unsubscribe = onSnapshot(duvidasRef, (snap) => {
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (b.votos || 0) - (a.votos || 0));
      setDuvidas(lista);
    });
    return () => unsubscribe();
  }, [sessaoSelecionadaId]);

  // Escutar feedbacks da sessão ativa
  useEffect(() => {
    if (!sessaoSelecionadaId) {
      setFeedbacks([]);
      return;
    }
    const feedbacksRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessaoSelecionadaId}/feedbacks`);
    const unsubscribe = onSnapshot(feedbacksRef, (snap) => {
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      setFeedbacks(lista);
    });
    return () => unsubscribe();
  }, [sessaoSelecionadaId]);

  // Escutar respostas do quiz da sessão ativa
  useEffect(() => {
    if (!sessaoSelecionadaId) {
      setRespostasQuiz([]);
      return;
    }
    const respRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessaoSelecionadaId}/respostas_quiz`);
    const unsubscribe = onSnapshot(respRef, (snap) => {
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      setRespostasQuiz(lista);
    });
    return () => unsubscribe();
  }, [sessaoSelecionadaId]);

  // Gerar PIN numérico de 6 dígitos
  const gerarPinUnico = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Criar Nova Sessão de Aula (Status: Preparada)
  const handleCriarSessao = async (e) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;
    setSalvandoSessao(true);

    try {
      const turmaObj = turmasData?.find(t => t.id === novaTurmaId);
      const disciplinaObj = disciplinasData?.find(d => d.id === novaDisciplinaId);
      const pin = gerarPinUnico();

      const novaSessao = {
        pin,
        titulo: novoTitulo.trim(),
        turmaId: novaTurmaId || '',
        turmaNome: turmaObj?.nome || turmaObj?.sigla || 'Turma Geral',
        disciplinaId: novaDisciplinaId || '',
        disciplinaNome: disciplinaObj?.nome || disciplinaObj?.sigla || 'Disciplina Geral',
        observacoes: novasObservacoes.trim(),
        status: 'preparada', // 'preparada' | 'ao_vivo' | 'encerrada'
        modoAtivo: 'sentimento', // 'espera' | 'sentimento' | 'duvidas' | 'quiz'
        quizAtivo: null,
        questoes: [], // Lista de perguntas elaboradas pelo professor para esta aula
        totalParticipantes: 0,
        totalFeedbacks: 0,
        criadaEm: serverTimestamp(),
        iniciadaEm: null,
        encerradaEm: null
      };

      const sessoesRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes`);
      const docAdded = await addDoc(sessoesRef, novaSessao);

      setSessaoSelecionadaId(docAdded.id);
      setModalNovaSessaoAberto(false);
      setNovoTitulo('');
      setNovasObservacoes('');
      setAbaHistorico(false);
    } catch (err) {
      console.error("Erro ao criar aula:", err);
      alert("Falha ao criar sessão de aula.");
    } finally {
      setSalvandoSessao(false);
    }
  };

  // Mudar Status da Sessão (Iniciar Ao Vivo ou Encerrar)
  const handleMudarStatusSessao = async (novoStatus) => {
    if (!sessaoAtiva?.id) return;
    const sessaoDocRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes`, sessaoAtiva.id);
    const updates = { status: novoStatus };
    if (novoStatus === 'ao_vivo' && !sessaoAtiva.iniciadaEm) {
      updates.iniciadaEm = serverTimestamp();
    }
    if (novoStatus === 'encerrada') {
      updates.encerradaEm = serverTimestamp();
    }
    await updateDoc(sessaoDocRef, updates);
  };

  // Resetar Aula Completa (Limpa participantes, votos, respostas e feedbacks, mantendo as perguntas elaboradas)
  const handleResetarAula = async () => {
    if (!sessaoAtiva?.id) return;
    const confirmou = window.confirm(
      "Deseja resetar esta aula?\n\n" +
      "• Todos os participantes, dúvidas enviadas, respostas do quiz e feedbacks serão apagados.\n" +
      "• As perguntas elaboradas do quiz serão MANTIDAS intactas.\n" +
      "• A aula voltará ao estado 'Preparada', pronta para ser reiniciada com uma nova turma."
    );
    if (!confirmou) return;

    setResetandoAula(true);
    try {
      // 1. Limpar subcoleção participantes
      const partRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessaoAtiva.id}/participantes`);
      const partDocs = await getDocs(partRef);
      for (const d of partDocs.docs) {
        await deleteDoc(d.ref);
      }

      // 2. Limpar subcoleção dúvidas
      const duvRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessaoAtiva.id}/duvidas`);
      const duvDocs = await getDocs(duvRef);
      for (const d of duvDocs.docs) {
        await deleteDoc(d.ref);
      }

      // 3. Limpar subcoleção respostas do quiz
      const respRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessaoAtiva.id}/respostas_quiz`);
      const respDocs = await getDocs(respRef);
      for (const d of respDocs.docs) {
        await deleteDoc(d.ref);
      }

      // 4. Limpar subcoleção feedbacks
      const feedRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessaoAtiva.id}/feedbacks`);
      const feedDocs = await getDocs(feedRef);
      for (const d of feedDocs.docs) {
        await deleteDoc(d.ref);
      }

      // 5. Resetar documento principal da sessão
      const sessaoDocRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes`, sessaoAtiva.id);
      await updateDoc(sessaoDocRef, {
        status: 'preparada',
        modoAtivo: 'sentimento',
        quizAtivo: null,
        totalParticipantes: 0,
        totalFeedbacks: 0,
        sentimentos: {},
        feedbacksExperiencia: {},
        iniciadaEm: null,
        encerradaEm: null
      });

      alert("Aula resetada com sucesso! Ela está pronta e limpa para uma nova aplicação.");
    } catch (err) {
      console.error("Erro ao resetar aula:", err);
      alert("Houve um erro ao resetar a aula.");
    } finally {
      setResetandoAula(false);
    }
  };

  // Alterar Modo Ativo Ao Vivo (Sentimento, Dúvidas, Quiz, Telão)
  const handleMudarModoAtivo = async (modo) => {
    if (!sessaoAtiva?.id) return;
    const sessaoDocRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes`, sessaoAtiva.id);
    await updateDoc(sessaoDocRef, { modoAtivo: modo });
  };

  // Abrir Modal para Criar Nova Pergunta
  const handleAbrirCriarPergunta = () => {
    setQuestaoEmEdicao(null);
    setFormPerguntaEnunciado('');
    setFormPerguntaTempo(30);
    setFormPerguntaOpcoes(['', '', '', '']);
    setFormPerguntaCorretaIndex(0);
    setFormPerguntaExplicacao('');
    setModalQuestaoAberto(true);
  };

  // Abrir Modal para Editar Pergunta Existente
  const handleAbrirEditarPergunta = (questao, index) => {
    setQuestaoEmEdicao({ ...questao, index });
    setFormPerguntaEnunciado(questao.enunciado || questao.pergunta || '');
    setFormPerguntaTempo(questao.tempoSegundos || 30);
    const opcoesTexto = (questao.opcoes || []).map(o => typeof o === 'string' ? o : o.texto || '');
    while (opcoesTexto.length < 4) opcoesTexto.push('');
    setFormPerguntaOpcoes(opcoesTexto);
    setFormPerguntaCorretaIndex(questao.respostaCorretaIndex ?? 0);
    setFormPerguntaExplicacao(questao.explicacao || '');
    setModalQuestaoAberto(true);
  };

  // Salvar Pergunta no Quiz da Aula (Criação ou Edição)
  const handleSalvarPergunta = async (e) => {
    e.preventDefault();
    if (!formPerguntaEnunciado.trim()) return;
    if (!sessaoAtiva?.id) return;

    const opcoesValidas = formPerguntaOpcoes.filter(o => o.trim() !== '');
    if (opcoesValidas.length < 2) {
      alert("A pergunta precisa ter pelo menos 2 alternativas preenchidas.");
      return;
    }

    const listaQuestoesAtual = Array.isArray(sessaoAtiva.questoes) ? [...sessaoAtiva.questoes] : [];
    
    const novaQuestaoFormatada = {
      id: questaoEmEdicao?.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      enunciado: formPerguntaEnunciado.trim(),
      tempoSegundos: Number(formPerguntaTempo) || 30,
      opcoes: formPerguntaOpcoes.map((txt, i) => ({
        texto: txt.trim() || `Opção ${i + 1}`,
        forma: FORMAS_QUIZ[i]?.forma || 'quadrado',
        cor: FORMAS_QUIZ[i]?.cor || 'bg-gray-700',
        icone: FORMAS_QUIZ[i]?.icone || '●'
      })),
      respostaCorretaIndex: formPerguntaCorretaIndex,
      explicacao: formPerguntaExplicacao.trim()
    };

    let novasQuestoes;
    if (questaoEmEdicao) {
      // Editar: encontra pelo ID ou pelo index da lista
      novasQuestoes = listaQuestoesAtual.map((q, idx) => {
        const idMatch = questaoEmEdicao.id && q.id === questaoEmEdicao.id;
        const indexMatch = questaoEmEdicao.index !== undefined && idx === questaoEmEdicao.index;
        return (idMatch || indexMatch) ? novaQuestaoFormatada : q;
      });
    } else {
      // Adicionar
      novasQuestoes = [...listaQuestoesAtual, novaQuestaoFormatada];
    }

    try {
      const sessaoDocRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes`, sessaoAtiva.id);
      await updateDoc(sessaoDocRef, { questoes: novasQuestoes });
      setModalQuestaoAberto(false);
    } catch (err) {
      console.error("Erro ao salvar pergunta:", err);
      alert("Falha ao salvar pergunta no Firestore: " + err.message);
    }
  };

  // Excluir Pergunta do Quiz da Aula
  const handleExcluirPergunta = async (questaoId, index) => {
    const confirmou = window.confirm("Tem certeza que deseja excluir esta pergunta do quiz?");
    if (!confirmou) return;
    if (!sessaoAtiva?.id) return;

    const listaQuestoesAtual = Array.isArray(sessaoAtiva.questoes) ? [...sessaoAtiva.questoes] : [];
    const novasQuestoes = listaQuestoesAtual.filter((q, idx) => {
      if (questaoId && q.id) return q.id !== questaoId;
      return idx !== index;
    });

    try {
      const sessaoDocRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes`, sessaoAtiva.id);
      await updateDoc(sessaoDocRef, { questoes: novasQuestoes });
    } catch (err) {
      console.error("Erro ao excluir pergunta:", err);
      alert("Falha ao excluir pergunta: " + err.message);
    }
  };

  // Lançar Pergunta Preparada no Telão
  const handleLancarPerguntaNoTelao = async (questao) => {
    if (!sessaoAtiva?.id || !questao) return;
    const sessaoDocRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes`, sessaoAtiva.id);
    await updateDoc(sessaoDocRef, {
      modoAtivo: 'quiz',
      quizAtivo: {
        id: `${questao.id}_${Date.now()}`,
        pergunta: questao.enunciado || questao.pergunta,
        opcoes: (questao.opcoes || []).map((o, idx) => ({
          texto: typeof o === 'string' ? o : o.texto || '',
          forma: FORMAS_QUIZ[idx]?.forma || 'quadrado',
          cor: FORMAS_QUIZ[idx]?.cor || 'bg-gray-700',
          icone: FORMAS_QUIZ[idx]?.icone || '●'
        })),
        respostaCorretaIndex: questao.respostaCorretaIndex,
        explicacao: questao.explicacao || '',
        tempoSegundos: questao.tempoSegundos || 30,
        abertaParaResposta: true,
        revelada: false,
        lancadaEm: new Date().toISOString()
      }
    });
  };

  // Revelar Gabarito do Quiz
  const handleRevelarGabarito = async () => {
    if (!sessaoAtiva?.id || !sessaoAtiva.quizAtivo) return;
    const sessaoDocRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes`, sessaoAtiva.id);
    await updateDoc(sessaoDocRef, {
      'quizAtivo.revelada': true,
      'quizAtivo.abertaParaResposta': false
    });
  };

  // Alternar Status de Dúvida como Respondida
  const handleAlternarDuvidaRespondida = async (duvida) => {
    if (!sessaoAtiva?.id) return;
    const duvidaRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessaoAtiva.id}/duvidas`, duvida.id);
    await updateDoc(duvidaRef, { respondida: !duvida.respondida });
  };

  // Excluir Sessão Inteira
  const handleExcluirSessao = async (sessaoId) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente esta sessão de aula?")) return;
    try {
      await deleteDoc(doc(db, `/artifacts/${appId}/public/data/pulso_sessoes`, sessaoId));
      if (sessaoSelecionadaId === sessaoId) {
        setSessaoSelecionadaId(null);
      }
    } catch (err) {
      console.error("Erro ao excluir sessão:", err);
    }
  };

  // Métricas Consolidadas dos Sentimentos
  const sentimentosStats = useMemo(() => {
    const contadores = { animado: 0, pensativo: 0, inspirado: 0, cansado: 0, confuso: 0 };
    participantes.forEach(p => {
      if (p.sentimento && contadores[p.sentimento] !== undefined) {
        contadores[p.sentimento]++;
      }
    });
    const total = Object.values(contadores).reduce((a, b) => a + b, 0);
    return { contadores, total };
  }, [participantes]);

  // Estatísticas do Quiz Ativo
  const statsRespostasQuiz = useMemo(() => {
    if (!sessaoAtiva?.quizAtivo?.id) return [0, 0, 0, 0];
    const cont = [0, 0, 0, 0];
    respostasQuiz.forEach(r => {
      if (r.opcaoEscolhida !== undefined && cont[r.opcaoEscolhida] !== undefined) {
        cont[r.opcaoEscolhida]++;
      }
    });
    return cont;
  }, [sessaoAtiva?.quizAtivo?.id, respostasQuiz]);

  // Métricas de Micro-Avaliação Pós-Aula
  const metricasFeedback = useMemo(() => {
    if (feedbacks.length === 0) return { mediaEstrelas: 0, expTotal: 0, exps: {} };
    const somaEstrelas = feedbacks.reduce((acc, f) => acc + (f.estrelas || 0), 0);
    const media = (somaEstrelas / feedbacks.length).toFixed(1);
    const exps = { excelente: 0, boa: 0, regular: 0, dificil: 0 };
    feedbacks.forEach(f => {
      if (f.experiencia && exps[f.experiencia] !== undefined) {
        exps[f.experiencia]++;
      }
    });
    return {
      mediaEstrelas: media,
      expTotal: feedbacks.length,
      exps
    };
  }, [feedbacks]);

  // Filtragem das Aulas Salvas por Turma, Disciplina e Busca
  const sessoesFiltradas = useMemo(() => {
    return sessoes.filter(s => {
      if (filtroDisciplina && s.disciplinaId !== filtroDisciplina) return false;
      if (filtroTurma && s.turmaId !== filtroTurma) return false;
      if (filtroBusca.trim()) {
        const termo = filtroBusca.toLowerCase();
        const coincide = 
          s.titulo?.toLowerCase().includes(termo) ||
          s.disciplinaNome?.toLowerCase().includes(termo) ||
          s.turmaNome?.toLowerCase().includes(termo) ||
          s.pin?.includes(termo);
        if (!coincide) return false;
      }
      return true;
    });
  }, [sessoes, filtroDisciplina, filtroTurma, filtroBusca]);

  // URL pública de acesso para os alunos
  const urlPublicaAluno = sessaoAtiva?.pin 
    ? `${window.location.origin}/pulso/${sessaoAtiva.pin}`
    : '';

  const questoesDaAula = sessaoAtiva?.questoes || [];

  return (
    <div className={`space-y-6 ${modoTelaCheia ? 'fixed inset-0 z-50 bg-gray-950 p-6 overflow-y-auto' : ''}`}>
      
      {/* BARRA SUPERIOR DO COCKPIT */}
      <div className="bg-gray-800 border border-gray-700 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/20">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                <span className="text-cyan-400">Pulso</span> Digital
              </h1>
              {sessaoAtiva && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  sessaoAtiva.status === 'ao_vivo' 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : sessaoAtiva.status === 'preparada'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {sessaoAtiva.status === 'ao_vivo' ? '🔴 Ao Vivo' : sessaoAtiva.status === 'preparada' ? '📋 Preparada' : '🏁 Encerrada'}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-xs mt-0.5">
              Engajamento ativo, dúvidas anônimas, quiz personalizado e micro-avaliação da aula.
            </p>
          </div>
        </div>

        {/* Botões de Ação Global */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setModalNovaSessaoAberto(true)}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
          >
            <span>➕</span> Nova Aula
          </button>

          <button
            onClick={() => setAbaHistorico(!abaHistorico)}
            className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold border transition-all ${
              abaHistorico 
                ? 'bg-gray-700 border-cyan-400 text-cyan-300' 
                : 'bg-gray-900/60 border-gray-700 text-gray-300 hover:bg-gray-700'
            }`}
          >
            📚 {abaHistorico ? 'Voltar ao Painel' : 'Aulas Salvas'}
          </button>

          <button
            onClick={() => setModoTelaCheia(!modoTelaCheia)}
            className="p-2.5 bg-gray-900 border border-gray-700 hover:bg-gray-700 rounded-2xl text-gray-300 hover:text-white transition-colors"
            title={modoTelaCheia ? 'Sair do Modo Projetor' : 'Modo Projetor / Telão'}
          >
            {modoTelaCheia ? '🗗' : '⛶'}
          </button>
        </div>
      </div>

      {/* ABA DE HISTÓRICO / AULAS SALVAS COM FILTROS */}
      {abaHistorico && (
        <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-700 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Aulas Cadastradas</h2>
              <p className="text-xs text-gray-400">Filtre suas sessões por disciplina e turma</p>
            </div>
            <span className="text-xs text-cyan-300 font-bold bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
              {sessoesFiltradas.length} aulas encontradas
            </span>
          </div>

          {/* BARRA DE FILTROS: DISCIPLINA, TURMA E BUSCA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
                Filtrar por Disciplina
              </label>
              <select
                value={filtroDisciplina}
                onChange={(e) => setFiltroDisciplina(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="">Todas as Disciplinas</option>
                {(disciplinasData || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.nome || d.sigla}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
                Filtrar por Turma
              </label>
              <select
                value={filtroTurma}
                onChange={(e) => setFiltroTurma(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="">Todas as Turmas</option>
                {(turmasData || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.nome || t.sigla}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
                Buscar por Título ou PIN
              </label>
              <input
                type="text"
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                placeholder="Ex: ASI, Aula 02, 849201..."
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* LISTA DE AULAS FILTRADAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {sessoesFiltradas.length === 0 ? (
              <div className="col-span-full py-10 text-center text-gray-500 text-sm">
                Nenhuma aula encontrada com os filtros selecionados.
              </div>
            ) : (
              sessoesFiltradas.map((s) => (
                <div 
                  key={s.id}
                  onClick={() => { setSessaoSelecionadaId(s.id); setAbaHistorico(false); }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                    sessaoSelecionadaId === s.id
                      ? 'bg-cyan-500/10 border-cyan-400 ring-2 ring-cyan-500/20 shadow-lg'
                      : 'bg-gray-900/70 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      s.status === 'ao_vivo' 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : s.status === 'preparada' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {s.status === 'ao_vivo' ? '🔴 Ao Vivo' : s.status === 'preparada' ? '📋 Preparada' : '🏁 Encerrada'}
                    </span>
                    <span className="font-mono text-cyan-300 font-bold text-xs bg-gray-800 px-2 py-0.5 rounded-md border border-gray-700">
                      PIN {s.pin}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base mt-2 line-clamp-1">{s.titulo}</h3>
                  <p className="text-xs text-gray-400 mt-1">{s.turmaNome} • {s.disciplinaNome}</p>

                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                    <span>🎯 {s.questoes?.length || 0} perguntas</span>
                    <span>👥 {s.totalParticipantes || 0} alunos</span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center text-xs text-gray-400">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExcluirSessao(s.id); }}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/20"
                      title="Excluir aula"
                    >
                      🗑️ Excluir
                    </button>
                    <span className="text-cyan-400 font-bold hover:underline">Abrir Aula →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* COCKPIT PRINCIPAL DA SESSÃO SELECIONADA */}
      {!sessaoAtiva ? (
        <div className="bg-gray-800 border border-gray-700 rounded-3xl p-12 text-center shadow-xl">
          <span className="text-5xl block mb-3">📋</span>
          <h2 className="text-xl font-bold text-white">Nenhuma Aula Ativa Selecionada</h2>
          <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
            Crie uma nova sessão de aula para elaborar suas perguntas e planejar a dinâmica antes do início.
          </p>
          <button
            onClick={() => setModalNovaSessaoAberto(true)}
            className="mt-6 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl text-sm shadow-lg shadow-cyan-600/30"
          >
            ➕ Planejar Nova Aula
          </button>
        </div>
      ) : (
        <div className="space-y-6">

          {/* CABEÇALHO DA AULA SELECIONADA */}
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-3xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono font-bold text-cyan-400">
                  {sessaoAtiva.turmaNome} • {sessaoAtiva.disciplinaNome}
                </span>
                <span className="text-xs text-gray-500 font-mono font-bold">| PIN: {sessaoAtiva.pin}</span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                {sessaoAtiva.titulo}
              </h2>
              {sessaoAtiva.observacoes && (
                <p className="text-xs text-gray-400 italic mt-1">"{sessaoAtiva.observacoes}"</p>
              )}
            </div>

            {/* Ações de Transição de Ciclo */}
            <div className="flex items-center gap-2 flex-wrap">
              {sessaoAtiva.status === 'preparada' && (
                <button
                  onClick={() => handleMudarStatusSessao('ao_vivo')}
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-gray-950 font-black rounded-2xl text-sm shadow-xl shadow-emerald-500/20 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <span className="text-lg">🟢</span> Iniciar Aula Ao Vivo (Projetar Telão)
                </button>
              )}

              {sessaoAtiva.status === 'ao_vivo' && (
                <button
                  onClick={() => handleMudarStatusSessao('encerrada')}
                  className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-gray-950 font-black rounded-2xl text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <span>🏆</span> Encerrar Aula & Exibir Ranking
                </button>
              )}

              {sessaoAtiva.status === 'encerrada' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetarAula}
                    disabled={resetandoAula}
                    className="px-4 py-2.5 bg-rose-600/80 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                    title="Limpa participantes e respostas, mantendo as perguntas"
                  >
                    <span>🔄</span> {resetandoAula ? 'Resetando...' : 'Resetar Aula para Nova Turma'}
                  </button>
                  <button
                    onClick={() => handleMudarStatusSessao('ao_vivo')}
                    className="px-3.5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-2xl text-xs transition-colors"
                  >
                    ↩️ Reabrir Ao Vivo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* ESTADO 1: PRÉ-AULA (PREPARADA) -> AMBIENTE DE ELABORAÇÃO DO QUIZ */}
          {/* ============================================================== */}
          {sessaoAtiva.status === 'preparada' && (
            <div className="space-y-6">
              <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-700 pb-5 mb-6">
                  <div>
                    <span className="text-xs uppercase font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      Modo Planejamento Pré-Aula
                    </span>
                    <h3 className="text-xl font-black text-white mt-2">
                      Perguntas do Quiz desta Aula
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Elabore quantas perguntas desejar. O QR Code só será projetado quando você clicar em "Iniciar Aula Ao Vivo".
                    </p>
                  </div>

                  <button
                    onClick={handleAbrirCriarPergunta}
                    className="px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl text-sm flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
                  >
                    <span>➕</span> Elaborar Nova Pergunta
                  </button>
                </div>

                {/* LISTAGEM DE PERGUNTAS ELABORADAS */}
                {questoesDaAula.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-gray-900/60 rounded-2xl border border-dashed border-gray-700">
                    <span className="text-4xl block mb-2">🎯</span>
                    <h4 className="text-base font-bold text-white">Nenhuma pergunta elaborada para esta aula</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Crie perguntas de múltipla escolha personalizadas para o tema da sua aula. Você poderá lançá-las uma a uma durante a explicação!
                    </p>
                    <button
                      onClick={handleAbrirCriarPergunta}
                      className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-cyan-300 font-bold rounded-xl text-xs border border-gray-600 transition-colors"
                    >
                      ➕ Criar Primeira Pergunta
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questoesDaAula.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="bg-gray-900 border border-gray-700 rounded-2xl p-5 hover:border-cyan-500/40 transition-all shadow-md"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center border border-cyan-500/30">
                              #{idx + 1}
                            </span>
                            <h4 className="font-bold text-white text-base">
                              {q.enunciado || q.pergunta}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-700">
                              ⏱️ {q.tempoSegundos || 30}s
                            </span>
                            <button
                              onClick={() => handleAbrirEditarPergunta(q, idx)}
                              className="p-1.5 bg-gray-800 hover:bg-gray-700 text-cyan-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                              title="Editar pergunta"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleExcluirPergunta(q.id, idx)}
                              className="p-1.5 bg-gray-800 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold transition-colors"
                              title="Excluir pergunta"
                            >
                              🗑️ Excluir
                            </button>
                          </div>
                        </div>

                        {/* 4 Opções com Indicação do Gabarito */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          {(q.opcoes || []).map((op, optIdx) => {
                            const ehCorreta = optIdx === q.respostaCorretaIndex;
                            const cores = [
                              'border-rose-500/40 bg-rose-500/10 text-rose-200',
                              'border-blue-500/40 bg-blue-500/10 text-blue-200',
                              'border-amber-500/40 bg-amber-500/10 text-amber-200',
                              'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            ];
                            const icones = ['▲', '◆', '●', '■'];
                            const textoOp = typeof op === 'string' ? op : op.texto || '';

                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${cores[optIdx % cores.length]} ${
                                  ehCorreta ? 'ring-2 ring-emerald-400 font-bold' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{icones[optIdx % icones.length]}</span>
                                  <span className="line-clamp-2">{textoOp}</span>
                                </div>
                                {ehCorreta && (
                                  <span className="text-[10px] bg-emerald-500 text-gray-950 font-black px-1.5 py-0.5 rounded ml-2">
                                    GABARITO
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {q.explicacao && (
                          <div className="mt-3 pt-2 text-[11px] text-gray-400 border-t border-gray-800">
                            <strong>💡 Fundamentação / Comentário:</strong> {q.explicacao}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ESTADO 2: AULA AO VIVO (STATUS === 'AO_VIVO') -> MODO TELÃO & COCKPIT */}
          {/* ============================================================== */}
          {sessaoAtiva.status === 'ao_vivo' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* COLUNA ESQUERDA: TELÃO / QR CODE / ENTRADA DOS ALUNOS */}
              <div className="lg:col-span-1 bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-xl flex flex-col items-center text-center">
                <span className="text-xs uppercase font-mono font-bold tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 mb-4">
                  Acesso ao Vivo dos Alunos
                </span>

                {/* QR Code com react-qr-code */}
                <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-cyan-400/80 mb-4 transition-transform hover:scale-105">
                  <QRCodeSVG
                    value={urlPublicaAluno || 'https://trilha-digital-aeea4.web.app/pulso'}
                    size={220}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* PIN Gigante */}
                <div className="bg-gray-900 border-2 border-gray-700 rounded-2xl px-6 py-3 mb-3 w-full">
                  <span className="text-xs uppercase font-bold text-gray-400 block tracking-wider">PIN DA AULA</span>
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-cyan-300">
                    {sessaoAtiva.pin}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mb-4">
                  Acesse pelo celular: <span className="text-cyan-300 font-bold">{urlPublicaAluno}</span>
                </p>

                {/* Participantes Conectados em Tempo Real */}
                <div className="w-full mt-2 pt-4 border-t border-gray-700 text-left">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs uppercase font-bold text-gray-300">
                      👥 Alunos Conectados ({participantes.length})
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                      Ao Vivo
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                    {participantes.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-2">
                        Aguardando os primeiros alunos escanearem o QR Code...
                      </p>
                    ) : (
                      participantes.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-900 border border-gray-700 text-xs shadow-sm hover:border-cyan-400 transition-colors"
                        >
                          <span className="text-base">{p.avatarEmoji || '👤'}</span>
                          <span className="font-semibold text-gray-200">{p.apelido}</span>
                          {p.pontos > 0 && (
                            <span className="text-[10px] font-mono font-bold text-amber-300 ml-1">
                              {p.pontos}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: COCKPIT DE COMANDOS AO VIVO */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* SELETOR DE MODOS AO VIVO */}
                <div className="bg-gray-800 border border-gray-700 rounded-3xl p-4 shadow-xl">
                  <span className="text-xs uppercase font-bold text-gray-400 tracking-wider block mb-3">
                    Dinâmica Ativa no Telão & Celulares:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'sentimento', emoji: '⚡', label: 'Termômetro', desc: 'Sentimento da Turma' },
                      { id: 'duvidas', emoji: '💬', label: 'Dúvidas', desc: 'Mural Anônimo' },
                      { id: 'quiz', emoji: '🎯', label: 'Quiz', desc: 'Perguntas da Aula' },
                      { id: 'espera', emoji: '👀', label: 'Telão', desc: 'Modo Apresentação' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleMudarModoAtivo(m.id)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          sessaoAtiva.modoAtivo === m.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold shadow-lg shadow-cyan-500/10'
                            : 'bg-gray-900/60 border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <span className="text-2xl">{m.emoji}</span>
                        <span className="text-xs font-bold text-white">{m.label}</span>
                        <span className="text-[10px] text-gray-400">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* PAINEL DINÂMICO 1: TERMÔMETRO DE SENTIMENTOS */}
                {sessaoAtiva.modoAtivo === 'sentimento' && (
                  <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <span>⚡</span> Termômetro de Energia & Sentimento da Turma
                        </h3>
                        <p className="text-xs text-gray-400">
                          Atualização em tempo real conforme os alunos tocam nos celulares
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                        {sentimentosStats.total} votos
                      </span>
                    </div>

                    <div className="space-y-4">
                      {[
                        { id: 'animado', emoji: '🚀', label: 'Animados & Empolgados', cor: 'bg-gradient-to-r from-amber-500 to-orange-500' },
                        { id: 'pensativo', emoji: '🤔', label: 'Pensativos & Reflexivos', cor: 'bg-gradient-to-r from-blue-500 to-indigo-500' },
                        { id: 'inspirado', emoji: '💡', label: 'Inspirados & Novas Ideias', cor: 'bg-gradient-to-r from-yellow-400 to-amber-500' },
                        { id: 'cansado', emoji: '😴', label: 'Cansados / Bateria Baixa', cor: 'bg-gradient-to-r from-purple-500 to-pink-500' },
                        { id: 'confuso', emoji: '🤯', label: 'Muita Informação / Revisar', cor: 'bg-gradient-to-r from-rose-500 to-red-500' }
                      ].map((item) => {
                        const qtd = sentimentosStats.contadores[item.id] || 0;
                        const pct = sentimentosStats.total > 0 
                          ? Math.round((qtd / sentimentosStats.total) * 100) 
                          : 0;
                        return (
                          <div key={item.id} className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-white flex items-center gap-2">
                                <span className="text-xl">{item.emoji}</span>
                                <span>{item.label}</span>
                              </span>
                              <span className="font-mono font-bold text-gray-300">{qtd} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden border border-gray-700/80">
                              <div
                                className={`${item.cor} h-3 rounded-full transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PAINEL DINÂMICO 2: MURAL DE DÚVIDAS ANÔNIMAS */}
                {sessaoAtiva.modoAtivo === 'duvidas' && (
                  <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <span>💬</span> Mural de Dúvidas da Aula
                        </h3>
                        <p className="text-xs text-gray-400">
                          As dúvidas mais votadas pelos alunos sobem para o topo da lista
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                        {duvidas.length} dúvidas
                      </span>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {duvidas.length === 0 ? (
                        <div className="text-center py-10 bg-gray-900/50 rounded-2xl border border-gray-800 text-gray-400 text-xs">
                          Nenhuma dúvida enviada até o momento. Incentive os alunos a postarem pelo celular!
                        </div>
                      ) : (
                        duvidas.map((d) => (
                          <div
                            key={d.id}
                            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                              d.respondida
                                ? 'bg-gray-900/40 border-gray-800 opacity-60'
                                : 'bg-gray-900 border-gray-700 hover:border-cyan-400/60 shadow'
                            }`}
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <span className="text-2xl">{d.autorAvatar || '❓'}</span>
                              <div>
                                <p className="text-sm font-semibold text-white leading-relaxed">
                                  {d.texto}
                                </p>
                                {d.respondida && (
                                  <span className="text-xs font-bold text-emerald-400 mt-1 inline-block">
                                    ✓ Marcada como respondida
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-center px-3 py-1 bg-gray-800 rounded-xl border border-gray-700">
                                <span className="text-xs text-gray-400 block font-bold">VOTOS</span>
                                <span className="text-lg font-black text-indigo-300 font-mono">
                                  {d.votos || 0}
                                </span>
                              </div>

                              <button
                                onClick={() => handleAlternarDuvidaRespondida(d)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                                  d.respondida
                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-gray-950'
                                }`}
                              >
                                {d.respondida ? 'Reabrir' : '✓ Responder'}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* PAINEL DINÂMICO 3: QUIZ COM PERGUNTAS ELABORADAS DA AULA */}
                {sessaoAtiva.modoAtivo === 'quiz' && (
                  <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-xl space-y-6">
                    <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-700 pb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <span>🎯</span> Quiz da Aula ({questoesDaAula.length} elaboradas)
                        </h3>
                        <p className="text-xs text-gray-400">
                          Escolha qual das perguntas elaboradas lançar no telão
                        </p>
                      </div>

                      <button
                        onClick={handleAbrirCriarPergunta}
                        className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow transition-colors"
                      >
                        ➕ Criar Nova Pergunta
                      </button>
                    </div>

                    {/* Questão Atualmente em Exibição no Telão */}
                    {sessaoAtiva.quizAtivo && (
                      <div className="bg-gray-900/90 border-2 border-amber-500/40 rounded-2xl p-5 shadow-2xl">
                        <div className="flex justify-between items-center mb-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">
                            QUESTÃO ATIVA NO TELÃO
                          </span>
                          <span className="text-xs text-gray-400">
                            {respostasQuiz.length} respostas recebidas
                          </span>
                        </div>

                        <h4 className="text-lg font-black text-white mb-4">
                          {sessaoAtiva.quizAtivo.pergunta}
                        </h4>

                        {/* 4 Opções com Contador de Respostas dos Alunos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(sessaoAtiva.quizAtivo.opcoes || []).map((op, idx) => {
                            const icones = ['▲', '◆', '●', '■'];
                            const cores = [
                              'border-rose-500 bg-rose-500/20 text-rose-200',
                              'border-blue-500 bg-blue-500/20 text-blue-200',
                              'border-amber-500 bg-amber-500/20 text-amber-200',
                              'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                            ];
                            const ehCorreta = idx === sessaoAtiva.quizAtivo.respostaCorretaIndex;
                            const revelada = sessaoAtiva.quizAtivo.revelada;
                            const votos = statsRespostasQuiz[idx] || 0;

                            return (
                              <div
                                key={idx}
                                className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 ${cores[idx % cores.length]} ${
                                  revelada && ehCorreta ? 'ring-4 ring-emerald-400 font-bold scale-[1.02]' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xl font-bold">{icones[idx % icones.length]}</span>
                                  <span className="text-xs sm:text-sm font-semibold">{op.texto || op}</span>
                                </div>
                                <span className="font-mono text-base font-black px-2 py-0.5 rounded bg-black/40">
                                  {votos}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Controles de Gabarito */}
                        <div className="mt-5 pt-4 border-t border-gray-800 flex justify-between items-center flex-wrap gap-2">
                          <span className="text-xs text-gray-400">
                            Gabarito: <strong className="text-cyan-300">Opção {sessaoAtiva.quizAtivo.respostaCorretaIndex + 1}</strong>
                          </span>

                          <div>
                            {!sessaoAtiva.quizAtivo.revelada ? (
                              <button
                                onClick={handleRevelarGabarito}
                                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                              >
                                🎯 Revelar Gabarito no Telão
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                ✓ Gabarito revelado aos alunos!
                              </span>
                            )}
                          </div>
                        </div>

                        {sessaoAtiva.quizAtivo.revelada && sessaoAtiva.quizAtivo.explicacao && (
                          <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200">
                            <strong>💡 Fundamentação:</strong> {sessaoAtiva.quizAtivo.explicacao}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Lista das Perguntas Preparadas para Lançamento */}
                    <div>
                      <h4 className="text-xs uppercase font-bold text-gray-400 mb-3 tracking-wider">
                        Perguntas Elaboradas para Lançar no Telão:
                      </h4>

                      {questoesDaAula.length === 0 ? (
                        <div className="text-center py-6 bg-gray-900/50 rounded-2xl border border-gray-800 text-gray-400 text-xs">
                          Nenhuma pergunta elaborada ainda. Clique em "➕ Criar Nova Pergunta" para adicionar na hora!
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {questoesDaAula.map((q, idx) => (
                            <div
                              key={q.id || idx}
                              className="p-3.5 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 flex-1">
                                <span className="font-mono font-bold text-cyan-300">#{idx + 1}</span>
                                <span className="font-semibold text-white line-clamp-1">
                                  {q.enunciado || q.pergunta}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleAbrirEditarPergunta(q, idx)}
                                  className="p-2 bg-gray-800 hover:bg-gray-700 text-cyan-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
                                  title="Editar pergunta"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleExcluirPergunta(q.id, idx)}
                                  className="p-2 bg-gray-800 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition-colors"
                                  title="Excluir pergunta"
                                >
                                  🗑️
                                </button>
                                <button
                                  onClick={() => handleLancarPerguntaNoTelao(q)}
                                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20 transition-transform active:scale-95 whitespace-nowrap"
                                >
                                  🚀 Lançar no Telão
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PAINEL DINÂMICO 4: MODO ESPERA */}
                {sessaoAtiva.modoAtivo === 'espera' && (
                  <div className="bg-gray-800 border border-gray-700 rounded-3xl p-10 text-center shadow-xl">
                    <span className="text-4xl block mb-2">👀</span>
                    <h3 className="text-lg font-bold text-white">Modo Telão / Intervalo</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Os alunos verão uma mensagem para acompanhar o telão ou aguardar a próxima atividade.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ESTADO 3: AULA ENCERRADA (PÓDIO, MICRO-AVALIAÇÃO & BOTÃO RESET) */}
          {/* ============================================================== */}
          {sessaoAtiva.status === 'encerrada' && (
            <div className="space-y-6">
              {/* PÓDIO FESTIVO DE GAMIFICAÇÃO */}
              <div className="bg-gradient-to-b from-gray-800 via-gray-900 to-gray-950 border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="text-center mb-8">
                  <span className="text-xs uppercase font-mono font-bold tracking-widest text-amber-400 bg-amber-500/10 px-4 py-1 rounded-full border border-amber-500/30">
                    Grand Finale • Pódio da Turma
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-white mt-3">
                    🏆 Pódio de Engajamento & Quiz
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Parabéns a todos os alunos pela participação e reflexão ativa!
                  </p>
                </div>

                {/* Estrutura do Pódio (1º, 2º e 3º) */}
                <div className="flex justify-center items-end gap-3 sm:gap-6 my-8 max-w-2xl mx-auto">
                  {/* 2º Lugar */}
                  <div className="flex-1 flex flex-col items-center">
                    {participantes[1] ? (
                      <>
                        <div className="text-4xl mb-2 animate-bounce">🥈</div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-400 to-zinc-600 flex items-center justify-center text-3xl shadow-lg border-2 border-slate-300">
                          {participantes[1].avatarEmoji || '🥈'}
                        </div>
                        <span className="font-bold text-white text-sm sm:text-base mt-2 line-clamp-1">{participantes[1].apelido}</span>
                        <span className="text-xs font-mono font-bold text-cyan-300">{participantes[1].pontos || 0} pts</span>
                      </>
                    ) : (
                      <div className="text-xs text-gray-500 mb-2">Sem 2º lugar</div>
                    )}
                    <div className="w-full h-28 sm:h-36 bg-gradient-to-t from-slate-800 to-slate-700 rounded-t-2xl border-t-2 border-slate-400 flex items-center justify-center font-black text-2xl text-slate-300 shadow-inner mt-2">
                      2º
                    </div>
                  </div>

                  {/* 1º Lugar */}
                  <div className="flex-1 flex flex-col items-center">
                    {participantes[0] ? (
                      <>
                        <div className="text-5xl mb-2 animate-bounce">👑</div>
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/30 border-4 border-amber-300 ring-4 ring-amber-500/20">
                          {participantes[0].avatarEmoji || '🥇'}
                        </div>
                        <span className="font-black text-white text-base sm:text-lg mt-2 line-clamp-1">{participantes[0].apelido}</span>
                        <span className="text-sm font-mono font-black text-amber-300">{participantes[0].pontos || 0} pts</span>
                      </>
                    ) : (
                      <div className="text-xs text-gray-500 mb-2">Sem 1º lugar</div>
                    )}
                    <div className="w-full h-40 sm:h-48 bg-gradient-to-t from-amber-900/80 to-amber-700/80 rounded-t-2xl border-t-4 border-amber-400 flex items-center justify-center font-black text-3xl text-amber-300 shadow-inner mt-2">
                      1º
                    </div>
                  </div>

                  {/* 3º Lugar */}
                  <div className="flex-1 flex flex-col items-center">
                    {participantes[2] ? (
                      <>
                        <div className="text-4xl mb-2 animate-bounce">🥉</div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-700 to-orange-800 flex items-center justify-center text-3xl shadow-lg border-2 border-amber-600">
                          {participantes[2].avatarEmoji || '🥉'}
                        </div>
                        <span className="font-bold text-white text-sm sm:text-base mt-2 line-clamp-1">{participantes[2].apelido}</span>
                        <span className="text-xs font-mono font-bold text-cyan-300">{participantes[2].pontos || 0} pts</span>
                      </>
                    ) : (
                      <div className="text-xs text-gray-500 mb-2">Sem 3º lugar</div>
                    )}
                    <div className="w-full h-20 sm:h-28 bg-gradient-to-t from-amber-950 to-amber-900 rounded-t-2xl border-t-2 border-amber-600 flex items-center justify-center font-black text-xl text-amber-400 shadow-inner mt-2">
                      3º
                    </div>
                  </div>
                </div>

                {/* Tabela dos demais colocados */}
                {participantes.length > 3 && (
                  <div className="max-w-xl mx-auto mt-6 bg-gray-900/80 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-xs uppercase font-bold text-gray-400 mb-2 tracking-wider">Demais Posições</h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {participantes.slice(3).map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-gray-800/50 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-gray-500 font-bold w-6">{idx + 4}º</span>
                            <span>{p.avatarEmoji}</span>
                            <span className="font-semibold text-white">{p.apelido}</span>
                          </div>
                          <span className="font-mono text-cyan-300 font-bold">{p.pontos || 0} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CARD DE MISSÃO DE ENSINO CUMPRIDA (MICRO-AVALIAÇÃO) */}
              <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-700 pb-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>📊</span> Missão de Ensino & Avaliação da Turma
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Resultados da micro-avaliação coletada nos celulares dos alunos ao encerrar a aula
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full font-bold">
                    {feedbacks.length} avaliações recebidas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Indicador 1: Média de Relevância */}
                  <div className="bg-gray-900/80 border border-gray-700/80 rounded-2xl p-5 text-center flex flex-col justify-center">
                    <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                      Relevância do Conteúdo
                    </span>
                    <div className="text-4xl sm:text-5xl font-black text-amber-400 my-2">
                      ⭐ {metricasFeedback.mediaEstrelas}
                      <span className="text-lg text-gray-500 font-normal"> / 5.0</span>
                    </div>
                    <p className="text-xs text-cyan-300 font-semibold">
                      {metricasFeedback.mediaEstrelas >= 4.5
                        ? '🌟 Conteúdo altamente transformador'
                        : metricasFeedback.mediaEstrelas >= 3.5
                        ? '👍 Excelente aderência ao aprendizado'
                        : 'Ajustes necessários no ritmo'}
                    </p>
                  </div>

                  {/* Indicador 2: Distribuição de Experiência */}
                  <div className="bg-gray-900/80 border border-gray-700/80 rounded-2xl p-5">
                    <span className="text-xs uppercase font-bold text-gray-400 tracking-wider block mb-3 text-center">
                      Experiência Geral da Aula
                    </span>
                    <div className="space-y-2 text-xs">
                      {[
                        { id: 'excelente', emoji: '🤩', label: 'Excelente' },
                        { id: 'boa', emoji: '😊', label: 'Boa e produtiva' },
                        { id: 'regular', emoji: '😐', label: 'Regular' },
                        { id: 'dificil', emoji: '😕', label: 'Cansativa' }
                      ].map(item => {
                        const qtd = metricasFeedback.exps[item.id] || 0;
                        const pct = metricasFeedback.expTotal > 0 
                          ? Math.round((qtd / metricasFeedback.expTotal) * 100) 
                          : 0;
                        return (
                          <div key={item.id} className="space-y-1">
                            <div className="flex justify-between text-gray-300">
                              <span>{item.emoji} {item.label}</span>
                              <span className="font-bold font-mono">{qtd} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-cyan-500 h-2 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Indicador 3: Engajamento Geral & Reset */}
                  <div className="bg-gray-900/80 border border-gray-700/80 rounded-2xl p-5 flex flex-col justify-between">
                    <span className="text-xs uppercase font-bold text-gray-400 tracking-wider text-center">
                      Resumo da Dinâmica
                    </span>
                    <div className="space-y-3 my-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-gray-800">
                        <span className="text-gray-400">Total de Participantes:</span>
                        <span className="font-bold text-white font-mono">{participantes.length}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-800">
                        <span className="text-gray-400">Dúvidas Levantadas:</span>
                        <span className="font-bold text-white font-mono">{duvidas.length}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-800">
                        <span className="text-gray-400">Perguntas no Quiz:</span>
                        <span className="font-bold text-white font-mono">{questoesDaAula.length}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleResetarAula}
                      disabled={resetandoAula}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-colors"
                    >
                      <span>🔄</span> {resetandoAula ? 'Resetando...' : 'Resetar Aula (Limpar Dados)'}
                    </button>
                  </div>
                </div>

                {/* Mural de Recados dos Alunos */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <span>💬</span> Recados & Elogios Enviados pelos Alunos
                  </h4>
                  {feedbacks.filter(f => f.comentario?.trim()).length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Nenhum recado de texto enviado nesta sessão.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {feedbacks.filter(f => f.comentario?.trim()).map((f, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-gray-900 border border-gray-700/80 text-xs">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span>{f.avatarEmoji || '⭐'}</span>
                            <span className="font-bold text-cyan-300">{f.apelido}</span>
                            <span className="text-amber-400 font-bold ml-auto">{'★'.repeat(f.estrelas || 5)}</span>
                          </div>
                          <p className="text-gray-300 italic">"{f.comentario}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* GERENCIAMENTO DE PERGUNTAS DA AULA MESMO APÓS ENCERRADA */}
              <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <span>🎯</span> Perguntas Elaboradas desta Aula ({questoesDaAula.length})
                    </h4>
                    <p className="text-xs text-gray-400">
                      Você pode revisar, editar ou excluir perguntas para a próxima aplicação desta aula
                    </p>
                  </div>
                  <button
                    onClick={handleAbrirCriarPergunta}
                    className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow transition-colors"
                  >
                    ➕ Nova Pergunta
                  </button>
                </div>

                {questoesDaAula.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2">Nenhuma pergunta elaborada para esta aula.</p>
                ) : (
                  <div className="space-y-2">
                    {questoesDaAula.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="p-3 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 flex-1">
                          <span className="font-mono font-bold text-cyan-300">#{idx + 1}</span>
                          <span className="font-semibold text-white line-clamp-1">{q.enunciado || q.pergunta}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAbrirEditarPergunta(q, idx)}
                            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-cyan-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                            title="Editar pergunta"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleExcluirPergunta(q.id, idx)}
                            className="p-1.5 bg-gray-800 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold transition-colors"
                            title="Excluir pergunta"
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL: CRIAR OU EDITAR PERGUNTA DO QUIZ (UNIVERSAL) */}
      {modalQuestaoAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {questaoEmEdicao ? '✏️ Editar Pergunta do Quiz' : '➕ Elaborar Pergunta do Quiz'}
                </h3>
                <p className="text-xs text-gray-400">Pergunta exclusiva para esta aula</p>
              </div>
              <button
                onClick={() => setModalQuestaoAberto(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarPergunta} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 mb-1.5">
                  Enunciado da Pergunta
                </label>
                <textarea
                  rows={2}
                  required
                  value={formPerguntaEnunciado}
                  onChange={(e) => setFormPerguntaEnunciado(e.target.value)}
                  placeholder="Ex: Qual o objetivo principal da Matriz Tática de Sistemas de Informação?"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 mb-1.5">
                  Tempo para Resposta
                </label>
                <select
                  value={formPerguntaTempo}
                  onChange={(e) => setFormPerguntaTempo(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value={15}>15 segundos (Dinâmica rápida)</option>
                  <option value={20}>20 segundos</option>
                  <option value={30}>30 segundos (Recomendado)</option>
                  <option value={45}>45 segundos</option>
                  <option value={60}>60 segundos (Caso ou raciocínio denso)</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase font-bold text-gray-400">
                    Alternativas (Marque o gabarito correto)
                  </label>
                  <span className="text-[10px] text-cyan-300 font-semibold">● Selecione a correta</span>
                </div>

                {formPerguntaOpcoes.map((op, i) => {
                  const cores = [
                    'text-rose-400 border-rose-500/40',
                    'text-blue-400 border-blue-500/40',
                    'text-amber-400 border-amber-500/40',
                    'text-emerald-400 border-emerald-500/40'
                  ];
                  const icones = ['▲', '◆', '●', '■'];

                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="gabaritoCorreto"
                          id={`radio_gab_${i}`}
                          checked={formPerguntaCorretaIndex === i}
                          onChange={() => setFormPerguntaCorretaIndex(i)}
                          className="w-4 h-4 text-cyan-500 cursor-pointer"
                        />
                        <label htmlFor={`radio_gab_${i}`} className={`font-bold text-sm w-4 cursor-pointer ${cores[i]}`}>
                          {icones[i]}
                        </label>
                      </div>

                      <input
                        type="text"
                        required={i < 2}
                        value={op}
                        onChange={(e) => {
                          const copy = [...formPerguntaOpcoes];
                          copy[i] = e.target.value;
                          setFormPerguntaOpcoes(copy);
                        }}
                        placeholder={`Alternativa ${i + 1} ${i < 2 ? '(Obrigatória)' : '(Opcional)'}`}
                        className={`flex-1 bg-gray-800 border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 ${
                          formPerguntaCorretaIndex === i ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-gray-700'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 mb-1.5">
                  Explicação do Gabarito / Fundamentação (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formPerguntaExplicacao}
                  onChange={(e) => setFormPerguntaExplicacao(e.target.value)}
                  placeholder="Exibida no telão após a revelação para enriquecer a discussão."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalQuestaoAberto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-cyan-600/30"
                >
                  {questaoEmEdicao ? 'Salvar Alterações' : 'Salvar Pergunta na Aula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA SESSÃO DE AULA */}
      {modalNovaSessaoAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Criar Nova Aula (Pulso Digital)</h3>
                <p className="text-xs text-gray-400">Monte o planejamento e elabore o quiz no seu tempo</p>
              </div>
              <button
                onClick={() => setModalNovaSessaoAberto(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCriarSessao} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 mb-1.5">
                  Título do Encontro / Tema da Aula
                </label>
                <input
                  type="text"
                  required
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Ex: Aula 03 - Alinhamento Estratégico e Matriz Tática de SI"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase font-bold text-gray-400 mb-1.5">
                    Disciplina
                  </label>
                  <select
                    value={novaDisciplinaId}
                    onChange={(e) => setNovaDisciplinaId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">Selecione a Disciplina...</option>
                    {(disciplinasData || []).map((d) => (
                      <option key={d.id} value={d.id}>{d.nome || d.sigla}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-gray-400 mb-1.5">
                    Turma
                  </label>
                  <select
                    value={novaTurmaId}
                    onChange={(e) => setNovaTurmaId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">Selecione a Turma...</option>
                    {(turmasData || []).map((t) => (
                      <option key={t.id} value={t.id}>{t.nome || t.sigla}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 mb-1.5">
                  Observações Pedagógicas / Metas da Aula
                </label>
                <textarea
                  rows={2}
                  value={novasObservacoes}
                  onChange={(e) => setNovasObservacoes(e.target.value)}
                  placeholder="Ex: Focar nos conceitos de tomada de decisão e priorização de sistemas."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovaSessaoAberto(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoSessao}
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-cyan-600/30 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {salvandoSessao ? 'Salvando...' : 'Salvar Aula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
