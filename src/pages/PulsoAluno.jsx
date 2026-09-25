import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  collection, query, where, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, 
  serverTimestamp, increment, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { db, appId } from '../firebase/config.js';
import { AVATARES, sortearAvatar, getAvatarPorId } from '../components/PulsoDigital/avatares.js';

export default function PulsoAluno() {
  const { pin: pinParam } = useParams();
  const navigate = useNavigate();

  // Estados de Conexão e Sessão
  const [pinInput, setPinInput] = useState(pinParam || '');
  const [sessao, setSessao] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(false);
  const [erroSessao, setErroSessao] = useState('');

  // Estados de Identificação do Aluno
  const [apelido, setApelido] = useState('');
  const [avatarSelecionado, setAvatarSelecionado] = useState(sortearAvatar());
  const [modalAvataresAberto, setModalAvataresAberto] = useState(false);
  const [alunoConectado, setAlunoConectado] = useState(null); // { id, apelido, avatarId }

  // Controle de Navegação do Aluno (Autonomia Móvel)
  const [abaAtivaAluno, setAbaAtivaAluno] = useState('quiz'); // 'quiz' | 'duvidas' | 'energia'
  const [mostrarAlertaQuiz, setMostrarAlertaQuiz] = useState(false);

  // Estados das Dinâmicas
  const [sentimentoVotado, setSentimentoVotado] = useState(null);
  const [textoDuvida, setTextoDuvida] = useState('');
  const [enviandoDuvida, setEnviandoDuvida] = useState(false);
  const [duvidasLista, setDuvidasLista] = useState([]);
  const [opcaoQuizEscolhida, setOpcaoQuizEscolhida] = useState(null);
  const [pontuacaoAluno, setPontuacaoAluno] = useState(0);

  // Timer Regressivo do Quiz
  const [tempoRestante, setTempoRestante] = useState(null);

  // Estados da Micro-Avaliação Final (Encerramento)
  const [avaliacaoEstrelas, setAvaliacaoEstrelas] = useState(5);
  const [avaliacaoExperiencia, setAvaliacaoExperiencia] = useState('excelente');
  const [avaliacaoComentario, setAvaliacaoComentario] = useState('');
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  // Recuperar identificação salva na sessão do navegador
  useEffect(() => {
    if (sessao?.id) {
      const salvo = sessionStorage.getItem(`pulso_aluno_${sessao.id}`);
      if (salvo) {
        try {
          const parsed = JSON.parse(salvo);
          setAlunoConectado(parsed);
          setApelido(parsed.apelido || '');
          if (parsed.avatarId) {
            setAvatarSelecionado(getAvatarPorId(parsed.avatarId));
          }
        } catch (e) {
          console.error("Erro ao ler dados do aluno:", e);
        }
      }
    }
  }, [sessao?.id]);

  // Buscar sessão ativa por PIN
  useEffect(() => {
    const pinParaBuscar = (pinParam || pinInput || '').trim();
    if (!pinParaBuscar || pinParaBuscar.length < 4) {
      setSessao(null);
      return;
    }

    setCarregandoSessao(true);
    setErroSessao('');

    const sessoesRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes`);
    const q = query(sessoesRef, where('pin', '==', pinParaBuscar));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCarregandoSessao(false);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setSessao({ id: docSnap.id, ...docSnap.data() });
        setErroSessao('');
      } else {
        setSessao(null);
        setErroSessao('Nenhuma aula encontrada com este PIN. Verifique o código no telão.');
      }
    }, (err) => {
      console.error("Erro ao escutar sessão:", err);
      setCarregandoSessao(false);
      setErroSessao('Erro ao conectar à aula. Tente novamente.');
    });

    return () => unsubscribe();
  }, [pinParam, pinInput]);

  // Escutar dúvidas da sessão em tempo real
  useEffect(() => {
    if (!sessao?.id) return;
    const duvidasRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessao.id}/duvidas`);
    const unsubscribe = onSnapshot(duvidasRef, (snap) => {
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (b.votos || 0) - (a.votos || 0));
      setDuvidasLista(lista);
    });
    return () => unsubscribe();
  }, [sessao?.id]);

  // Escutar pontuação e estado do aluno conectado (trata inclusive reset da aula)
  useEffect(() => {
    if (!sessao?.id || !alunoConectado?.id) return;
    const alunoRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessao.id}/participantes`, alunoConectado.id);
    const unsubscribe = onSnapshot(alunoRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPontuacaoAluno(data.pontos || 0);
        if (data.sentimento) setSentimentoVotado(data.sentimento);
        if (data.avaliacaoEnviada) setAvaliacaoEnviada(true);
      } else {
        // Sessão foi resetada pelo professor: zera o estado local
        setPontuacaoAluno(0);
        setSentimentoVotado(null);
        setAvaliacaoEnviada(false);
      }
    });
    return () => unsubscribe();
  }, [sessao?.id, alunoConectado?.id]);

  // Efeito quando o professor lança uma nova pergunta de Quiz
  useEffect(() => {
    if (sessao?.quizAtivo?.id && !sessao?.quizAtivo?.revelada) {
      setOpcaoQuizEscolhida(null);
      // Se o aluno não estiver na aba de quiz, aciona alerta para ir ao quiz
      if (abaAtivaAluno !== 'quiz') {
        setMostrarAlertaQuiz(true);
      }
    }
  }, [sessao?.quizAtivo?.id]);

  // Timer Regressivo Sincronizado do Quiz
  useEffect(() => {
    if (!sessao?.quizAtivo || sessao.quizAtivo.revelada || !sessao.quizAtivo.abertaParaResposta) {
      setTempoRestante(null);
      return;
    }

    const tempoTotal = Number(sessao.quizAtivo.tempoSegundos) || 30;
    const lancadaEm = sessao.quizAtivo.lancadaEm ? new Date(sessao.quizAtivo.lancadaEm).getTime() : Date.now();

    const calcularRestante = () => {
      const segundosPassados = Math.floor((Date.now() - lancadaEm) / 1000);
      return Math.max(0, tempoTotal - segundosPassados);
    };

    setTempoRestante(calcularRestante());

    const interval = setInterval(() => {
      const r = calcularRestante();
      setTempoRestante(r);
      if (r <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessao?.quizAtivo?.id, sessao?.quizAtivo?.revelada, sessao?.quizAtivo?.abertaParaResposta, sessao?.quizAtivo?.lancadaEm]);

  // Entrar na Aula (Criar participante)
  const handleEntrarNaAula = async (e) => {
    e.preventDefault();
    if (!apelido.trim()) return;
    if (!sessao?.id) return;

    try {
      const alunoId = alunoConectado?.id || `aluno_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const dadosAluno = {
        id: alunoId,
        apelido: apelido.trim(),
        avatarId: avatarSelecionado.id,
        avatarNome: avatarSelecionado.nome,
        avatarEmoji: avatarSelecionado.emoji,
        avatarCorBg: avatarSelecionado.corBg,
        pontos: pontuacaoAluno || 0,
        conectadoEm: serverTimestamp()
      };

      const alunoDocRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessao.id}/participantes`, alunoId);
      await setDoc(alunoDocRef, dadosAluno, { merge: true });

      // Atualizar contagem de participantes na sessão principal
      const sessaoRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes`, sessao.id);
      await updateDoc(sessaoRef, {
        totalParticipantes: increment(alunoConectado ? 0 : 1)
      }).catch(() => {});

      sessionStorage.setItem(`pulso_aluno_${sessao.id}`, JSON.stringify(dadosAluno));
      setAlunoConectado(dadosAluno);
    } catch (err) {
      console.error("Erro ao registrar aluno:", err);
      alert("Houve um erro ao entrar na aula. Tente novamente.");
    }
  };

  // Votar em Sentimento
  const handleVotarSentimento = async (sentimento) => {
    if (!sessao?.id || !alunoConectado?.id) return;
    try {
      setSentimentoVotado(sentimento);
      const alunoDocRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessao.id}/participantes`, alunoConectado.id);
      await updateDoc(alunoDocRef, { sentimento });

      // Atualizar contadores na sessão
      const sessaoRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes`, sessao.id);
      await updateDoc(sessaoRef, {
        [`sentimentos.${sentimento}`]: increment(1)
      }).catch(() => {});
    } catch (err) {
      console.error("Erro ao registrar sentimento:", err);
    }
  };

  // Enviar Dúvida Anônima
  const handleEnviarDuvida = async (e) => {
    e.preventDefault();
    if (!textoDuvida.trim() || !sessao?.id) return;
    setEnviandoDuvida(true);
    try {
      const duvidasRef = collection(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessao.id}/duvidas`);
      await addDoc(duvidasRef, {
        texto: textoDuvida.trim(),
        autorAvatar: avatarSelecionado.emoji,
        votos: 1,
        votantes: alunoConectado?.id ? [alunoConectado.id] : [],
        respondida: false,
        criadaEm: serverTimestamp()
      });
      setTextoDuvida('');
    } catch (err) {
      console.error("Erro ao enviar dúvida:", err);
      alert("Não foi possível enviar sua dúvida.");
    } finally {
      setEnviandoDuvida(false);
    }
  };

  // Apoiar dúvida de colega ("Também tenho essa dúvida!")
  const handleApoiarDuvida = async (duvida) => {
    if (!sessao?.id || !alunoConectado?.id) return;
    const jaVotou = duvida.votantes?.includes(alunoConectado.id);
    const duvidaRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessao.id}/duvidas`, duvida.id);
    try {
      if (jaVotou) {
        await updateDoc(duvidaRef, {
          votos: increment(-1),
          votantes: arrayRemove(alunoConectado.id)
        });
      } else {
        await updateDoc(duvidaRef, {
          votos: increment(1),
          votantes: arrayUnion(alunoConectado.id)
        });
      }
    } catch (err) {
      console.error("Erro ao apoiar dúvida:", err);
    }
  };

  // Responder Quiz
  const handleResponderQuiz = async (indiceOpcao) => {
    if (!sessao?.id || !alunoConectado?.id || !sessao.quizAtivo) return;
    if (opcaoQuizEscolhida !== null) return; // Já respondeu
    if (!sessao.quizAtivo.abertaParaResposta) return;
    if (tempoRestante === 0) return; // Tempo esgotado

    setOpcaoQuizEscolhida(indiceOpcao);
    const acertou = indiceOpcao === sessao.quizAtivo.respostaCorretaIndex;

    try {
      const respostaRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessao.id}/respostas_quiz`, `${sessao.quizAtivo.id}_${alunoConectado.id}`);
      await setDoc(respostaRef, {
        alunoId: alunoConectado.id,
        apelido: alunoConectado.apelido,
        avatarEmoji: alunoConectado.avatarEmoji,
        opcaoEscolhida: indiceOpcao,
        acertou,
        pontosGanhos: acertou ? 100 : 0,
        respondidoEm: serverTimestamp()
      });

      if (acertou) {
        const alunoDocRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessao.id}/participantes`, alunoConectado.id);
        await updateDoc(alunoDocRef, {
          pontos: increment(100)
        });
      }
    } catch (err) {
      console.error("Erro ao registrar resposta do quiz:", err);
    }
  };

  // Enviar Micro-Avaliação de Saída
  const handleEnviarAvaliacao = async (e) => {
    e.preventDefault();
    if (!sessao?.id || !alunoConectado?.id) return;
    setEnviandoAvaliacao(true);

    try {
      const feedbackRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessao.id}/feedbacks`, alunoConectado.id);
      await setDoc(feedbackRef, {
        alunoId: alunoConectado.id,
        apelido: alunoConectado.apelido,
        avatarEmoji: alunoConectado.avatarEmoji,
        estrelas: Number(avaliacaoEstrelas),
        experiencia: avaliacaoExperiencia,
        comentario: avaliacaoComentario.trim(),
        enviadoEm: serverTimestamp()
      });

      const alunoDocRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes/${sessao.id}/participantes`, alunoConectado.id);
      await updateDoc(alunoDocRef, { avaliacaoEnviada: true });

      const sessaoRef = doc(db, `/artifacts/${appId}/public/data/pulso_sessoes`, sessao.id);
      await updateDoc(sessaoRef, {
        totalFeedbacks: increment(1),
        [`feedbacksExperiencia.${avaliacaoExperiencia}`]: increment(1)
      }).catch(() => {});

      setAvaliacaoEnviada(true);
    } catch (err) {
      console.error("Erro ao enviar avaliação:", err);
      alert("Houve um erro ao enviar sua avaliação.");
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  // ==========================================
  // RENDERIZAÇÃO: TELA 1 - DIGITAÇÃO DO PIN
  // ==========================================
  if (!sessao) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-indigo-950 text-white flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-gray-800/80 backdrop-blur-xl border border-gray-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 mb-4 animate-bounce">
              <span className="text-4xl">⚡</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              <span className="text-cyan-400">Pulso</span> Digital
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Digite o PIN projetado no telão para entrar na aula ao vivo.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-2 text-center">
                PIN da Aula
              </label>
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 849201"
                className="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl py-4 px-4 text-center text-3xl font-mono font-bold tracking-widest text-cyan-300 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
              />
            </div>

            {carregandoSessao && (
              <p className="text-center text-cyan-400 text-sm animate-pulse">
                Conectando à aula...
              </p>
            )}

            {erroSessao && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs text-center">
                {erroSessao}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: TELA 2 - SELEÇÃO DE APELIDO & AVATAR
  // ==========================================
  if (!alunoConectado) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-indigo-950 text-white flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-gray-800/90 backdrop-blur-xl border border-gray-700 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs font-mono font-bold border border-cyan-500/40">
              PIN {sessao.pin} • {sessao.turmaNome || 'Turma'}
            </span>
            <h2 className="text-2xl font-black text-white mt-3">
              Escolha seu Avatar
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Como você quer aparecer no telão e dinâmicas da aula?
            </p>
          </div>

          <form onSubmit={handleEntrarNaAula} className="space-y-6">
            {/* Visualizador do Avatar Ativo */}
            <div className="flex flex-col items-center">
              <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${avatarSelecionado.corBg} flex items-center justify-center text-5xl shadow-xl shadow-cyan-500/10 border-4 border-gray-700/80 transform hover:scale-105 transition-transform`}>
                {avatarSelecionado.emoji}
              </div>
              <span className="mt-3 font-bold text-lg text-white">
                {avatarSelecionado.nome}
              </span>
              <p className="text-xs text-gray-400 text-center max-w-[240px]">
                {avatarSelecionado.descricao}
              </p>

              {/* Botões de Ação do Avatar */}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setAvatarSelecionado(sortearAvatar())}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  🎲 Sortear
                </button>
                <button
                  type="button"
                  onClick={() => setModalAvataresAberto(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  🎨 Galeria
                </button>
              </div>
            </div>

            {/* Campo de Apelido */}
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 mb-2">
                Seu Apelido / Primeiro Nome
              </label>
              <input
                type="text"
                required
                maxLength={24}
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                placeholder="Ex: Mariana, Dev Lucas, etc."
                className="w-full bg-gray-900 border border-gray-700 rounded-2xl py-3 px-4 text-center text-lg font-bold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-gray-950 font-black rounded-2xl text-lg shadow-lg shadow-cyan-500/30 transition-transform active:scale-95"
            >
              🚀 Entrar na Aula
            </button>
          </form>
        </div>

        {/* Modal de Galeria de Avatares */}
        {modalAvataresAberto && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl">
              <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-white">Galeria de Avatares</h3>
                  <p className="text-xs text-gray-400">Escolha o que mais combina com seu estilo</p>
                </div>
                <button
                  onClick={() => setModalAvataresAberto(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto flex-1">
                {AVATARES.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      setAvatarSelecionado(av);
                      setModalAvataresAberto(false);
                    }}
                    className={`p-3 rounded-2xl flex flex-col items-center text-center transition-all border ${
                      avatarSelecionado.id === av.id
                        ? 'border-cyan-400 bg-cyan-500/10 scale-95 shadow-md shadow-cyan-500/20'
                        : 'border-gray-800 bg-gray-800/60 hover:bg-gray-700/60 hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${av.corBg} flex items-center justify-center text-3xl mb-2 shadow`}>
                      {av.emoji}
                    </div>
                    <span className="text-xs font-bold text-white line-clamp-1">{av.nome}</span>
                    <span className="text-[10px] text-gray-400 line-clamp-2 mt-0.5">{av.descricao}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: SESSÃO NO ESTADO "PREPARADA" (SALA DE ESPERA PRÉ-AULA)
  // ==========================================
  if (sessao.status === 'preparada') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-indigo-950 text-white flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-md w-full bg-gray-800/80 backdrop-blur-xl border border-gray-700 rounded-3xl p-8 shadow-2xl">
          <div className={`w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br ${avatarSelecionado.corBg} flex items-center justify-center text-5xl shadow-xl animate-pulse`}>
            {avatarSelecionado.emoji}
          </div>
          <h2 className="text-2xl font-black text-white mt-4">
            Você está conectado, {alunoConectado.apelido}!
          </h2>
          <p className="text-cyan-400 font-medium text-sm mt-1">
            {avatarSelecionado.nome}
          </p>

          <div className="mt-8 p-4 bg-gray-900/80 border border-gray-700 rounded-2xl text-sm text-gray-300">
            <span className="inline-block w-2.5 h-2.5 bg-amber-400 rounded-full mr-2 animate-ping" />
            Aguardando o professor iniciar a aula no telão...
          </div>

          <div className="mt-6 text-xs text-gray-500">
            Aula: <span className="text-gray-300 font-semibold">{sessao.titulo}</span> • PIN: <span className="font-mono text-cyan-300">{sessao.pin}</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: SESSÃO NO ESTADO "ENCERRADA" (MICRO-AVALIAÇÃO DE SAÍDA)
  // ==========================================
  if (sessao.status === 'encerrada') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-indigo-950 text-white flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-gray-800/90 backdrop-blur-xl border border-gray-700 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {avaliacaoEnviada ? (
            <div className="text-center py-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-4xl mb-4 shadow-lg shadow-emerald-500/20">
                ✨
              </div>
              <h2 className="text-2xl font-black text-white">
                Missão Cumprida!
              </h2>
              <p className="text-gray-300 text-sm mt-3 leading-relaxed">
                Muito obrigado pelo seu feedback, <span className="font-bold text-cyan-300">{alunoConectado.apelido}</span>! Sua presença, ideias e dedicação fizeram toda a diferença na aula de hoje.
              </p>

              {pontuacaoAluno > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-2xl">
                  <span className="text-xs text-amber-300 font-bold uppercase tracking-wider block">
                    Sua Pontuação no Quiz
                  </span>
                  <span className="text-3xl font-black text-amber-400 mt-1 block">
                    🏆 {pontuacaoAluno} pts
                  </span>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-6">
                Você já pode fechar esta aba ou acompanhar o pódio no telão.
              </p>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <span className="text-3xl">🏁</span>
                <h2 className="text-2xl font-black text-white mt-2">
                  Aula Finalizada!
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Avaliação rápida de saída (100% anônima e direta)
                </p>
              </div>

              <form onSubmit={handleEnviarAvaliacao} className="space-y-6">
                {/* Pergunta 1: Relevância do Conteúdo */}
                <div className="bg-gray-900/80 p-4 rounded-2xl border border-gray-700/80">
                  <label className="block text-sm font-bold text-white mb-2">
                    1. O conteúdo compartilhado hoje contribui e tem relevância para seu conhecimento?
                  </label>
                  <div className="flex justify-center gap-2 my-3">
                    {[1, 2, 3, 4, 5].map((estrela) => (
                      <button
                        key={estrela}
                        type="button"
                        onClick={() => setAvaliacaoEstrelas(estrela)}
                        className={`text-3xl sm:text-4xl transition-transform hover:scale-125 focus:outline-none ${
                          estrela <= avaliacaoEstrelas ? 'text-amber-400 drop-shadow' : 'text-gray-600'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-xs font-semibold text-cyan-300">
                    {avaliacaoEstrelas === 5 && '🌟 Altamente relevante e transformador!'}
                    {avaliacaoEstrelas === 4 && '⭐ Muito relevante e agregador'}
                    {avaliacaoEstrelas === 3 && '👍 Relevante, bom aprendizado'}
                    {avaliacaoEstrelas === 2 && '😐 Razoável, pode melhorar'}
                    {avaliacaoEstrelas === 1 && '⚠️ Pouco relevante hoje'}
                  </div>
                </div>

                {/* Pergunta 2: Experiência Geral */}
                <div className="bg-gray-900/80 p-4 rounded-2xl border border-gray-700/80">
                  <label className="block text-sm font-bold text-white mb-3">
                    2. Como foi a experiência da aula hoje?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'excelente', emoji: '🤩', label: 'Excelente!' },
                      { id: 'boa', emoji: '😊', label: 'Boa e produtiva' },
                      { id: 'regular', emoji: '😐', label: 'Regular / Mediana' },
                      { id: 'dificil', emoji: '😕', label: 'Cansativa / Difícil' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAvaliacaoExperiencia(opt.id)}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          avaliacaoExperiencia === opt.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold shadow'
                            : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="text-xs">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pergunta 3: Recado Opcional */}
                <div>
                  <label className="block text-xs uppercase font-bold text-gray-400 mb-2">
                    Recado ou Elogio ao Professor (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={avaliacaoComentario}
                    onChange={(e) => setAvaliacaoComentario(e.target.value)}
                    placeholder="Deixe uma mensagem, dúvida remanescente ou sugestão..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-cyan-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviandoAvaliacao}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-gray-950 font-black rounded-2xl text-lg shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {enviandoAvaliacao ? 'Enviando...' : '🚀 Enviar Feedback'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: AULA AO VIVO (COM AUTONOMIA DO ALUNO)
  // ==========================================
  const quizAtivoAberto = sessao.quizAtivo && !sessao.quizAtivo.revelada && sessao.quizAtivo.abertaParaResposta;
  const tempoTotal = Number(sessao.quizAtivo?.tempoSegundos) || 30;
  const porcentagemTempo = tempoRestante !== null ? Math.min(100, Math.max(0, (tempoRestante / tempoTotal) * 100)) : 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-indigo-950 text-white flex flex-col pb-20">
      
      {/* BARRA SUPERIOR MOBILE */}
      <header className="bg-gray-900/95 backdrop-blur-md border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarSelecionado.corBg} flex items-center justify-center text-2xl shadow border border-gray-700`}>
            {avatarSelecionado.emoji}
          </div>
          <div>
            <div className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>{alunoConectado.apelido}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                PIN {sessao.pin}
              </span>
            </div>
            <div className="text-[11px] text-gray-400 truncate max-w-[170px]">
              {sessao.titulo}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">
            <span className="text-xs">🏆</span>
            <span className="text-xs font-black text-amber-300 font-mono">{pontuacaoAluno}</span>
          </div>
        </div>
      </header>

      {/* NOTIFICAÇÃO FLUTUANTE DE NOVA PERGUNTA (CASO O ALUNO ESTEJA EM DÚVIDAS OU ENERGIA) */}
      {mostrarAlertaQuiz && abaAtivaAluno !== 'quiz' && (
        <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl shadow-xl flex items-center justify-between text-gray-950 animate-bounce">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <span className="text-xs font-black leading-tight">
              Nova Pergunta Lançada no Telão!
            </span>
          </div>
          <button
            onClick={() => {
              setAbaAtivaAluno('quiz');
              setMostrarAlertaQuiz(false);
            }}
            className="px-3 py-1.5 bg-gray-950 text-white rounded-xl text-xs font-bold shadow active:scale-95"
          >
            Responder Agora →
          </button>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL BASEADO NA ABA ESCOLHIDA PELO ALUNO */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-start">
        
        {/* ============================================================== */}
        {/* ABA 1: QUIZ / PERGUNTA DA AULA */}
        {/* ============================================================== */}
        {abaAtivaAluno === 'quiz' && (
          <div className="space-y-4">
            {!sessao.quizAtivo ? (
              <div className="text-center py-12 px-4 bg-gray-900/60 rounded-3xl border border-gray-800">
                <span className="text-5xl animate-bounce inline-block mb-3">👀</span>
                <h3 className="text-xl font-black text-white">Atenção ao Telão!</h3>
                <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
                  O professor está apresentando os conteúdos. Assim que uma pergunta for lançada, o enunciado completo e as alternativas aparecerão aqui.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setAbaAtivaAluno('duvidas')}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-cyan-300 font-bold rounded-xl text-xs border border-gray-700 flex items-center gap-1.5 mx-auto"
                  >
                    <span>💬</span> Enviar uma Dúvida Anônima enquanto aguarda
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* CABEÇALHO DA PERGUNTA: ENUNCIADO COMPLETO & TIMER */}
                <div className="bg-gray-900/90 border border-gray-700 rounded-3xl p-5 shadow-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                      QUIZ DA AULA
                    </span>

                    {/* TIMER REGRESSIVO */}
                    {tempoRestante !== null && !sessao.quizAtivo.revelada && (
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-black border ${
                        tempoRestante <= 5
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                          : tempoRestante <= 10
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      }`}>
                        <span>⏱️</span>
                        <span>{tempoRestante}s</span>
                      </div>
                    )}
                  </div>

                  {/* BARRA DE PROGRESSO DO TEMPO */}
                  {tempoRestante !== null && !sessao.quizAtivo.revelada && (
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden my-3">
                      <div
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          tempoRestante <= 5 ? 'bg-rose-500' : tempoRestante <= 10 ? 'bg-amber-400' : 'bg-cyan-400'
                        }`}
                        style={{ width: `${porcentagemTempo}%` }}
                      />
                    </div>
                  )}

                  {/* ENUNCIADO COMPLETO E LEGÍVEL */}
                  <h3 className="text-base sm:text-lg font-black text-white leading-relaxed mt-2">
                    {sessao.quizAtivo.pergunta}
                  </h3>
                </div>

                {/* 4 ALTERNATIVAS COM TEXTO INTEGRAL E FORMAS VISUAIS */}
                <div className="space-y-2.5">
                  {(sessao.quizAtivo.opcoes || []).map((opcao, idx) => {
                    const icones = ['▲', '◆', '●', '■'];
                    const cores = [
                      'bg-rose-600/90 hover:bg-rose-500 border-rose-500/60',
                      'bg-blue-600/90 hover:bg-blue-500 border-blue-500/60',
                      'bg-amber-600/90 hover:bg-amber-500 border-amber-500/60',
                      'bg-emerald-600/90 hover:bg-emerald-500 border-emerald-500/60'
                    ];
                    const selecionada = opcaoQuizEscolhida === idx;
                    const revelada = sessao.quizAtivo.revelada;
                    const ehCorreta = idx === sessao.quizAtivo.respostaCorretaIndex;
                    const textoOp = typeof opcao === 'string' ? opcao : opcao.texto || '';

                    return (
                      <button
                        key={idx}
                        disabled={opcaoQuizEscolhida !== null || !sessao.quizAtivo.abertaParaResposta || tempoRestante === 0}
                        onClick={() => handleResponderQuiz(idx)}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all transform active:scale-98 flex items-start gap-3.5 shadow-lg ${cores[idx % cores.length]} ${
                          selecionada ? 'ring-4 ring-white border-white scale-[1.01]' : ''
                        } ${
                          revelada && ehCorreta ? 'ring-4 ring-emerald-300 border-white bg-emerald-600' : ''
                        } ${
                          revelada && selecionada && !ehCorreta ? 'opacity-60 line-through' : ''
                        } ${
                          opcaoQuizEscolhida !== null && !selecionada && !revelada ? 'opacity-40' : ''
                        }`}
                      >
                        {/* Ícone geométrico */}
                        <span className="w-8 h-8 rounded-xl bg-black/30 flex items-center justify-center text-lg font-bold flex-shrink-0 mt-0.5">
                          {icones[idx % icones.length]}
                        </span>

                        {/* Texto Integral da Alternativa */}
                        <div className="flex-1">
                          <span className="text-sm sm:text-base font-bold text-white leading-snug block">
                            {textoOp}
                          </span>

                          {selecionada && (
                            <span className="inline-block mt-1.5 text-[10px] bg-white text-gray-950 font-black px-2 py-0.5 rounded-full uppercase">
                              Sua Escolha
                            </span>
                          )}

                          {revelada && ehCorreta && (
                            <span className="inline-block mt-1.5 text-[10px] bg-emerald-300 text-gray-950 font-black px-2 py-0.5 rounded-full uppercase">
                              ✓ Resposta Correta
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* FEEDBACK DEPOIS DE RESPONDER OU TEMPO ESGOTADO */}
                <div className="text-center">
                  {tempoRestante === 0 && opcaoQuizEscolhida === null && !sessao.quizAtivo.revelada && (
                    <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-xs text-rose-300 font-bold">
                      ⏱️ Tempo esgotado! Aguarde o professor revelar o gabarito.
                    </div>
                  )}

                  {opcaoQuizEscolhida !== null && !sessao.quizAtivo.revelada && (
                    <div className="p-3.5 bg-gray-900 border border-cyan-500/40 rounded-2xl text-xs text-cyan-300 font-bold animate-pulse">
                      ✓ Resposta enviada! Aguarde a revelação do gabarito no telão.
                    </div>
                  )}

                  {sessao.quizAtivo.revelada && (
                    <div className={`p-4 rounded-2xl text-xs font-bold shadow-xl ${
                      opcaoQuizEscolhida === sessao.quizAtivo.respostaCorretaIndex
                        ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                        : 'bg-rose-500/20 border border-rose-400 text-rose-300'
                    }`}>
                      <div className="text-sm font-black mb-1">
                        {opcaoQuizEscolhida === sessao.quizAtivo.respostaCorretaIndex
                          ? '🎉 Parabéns! Você acertou e somou +100 pontos!'
                          : '❌ Não foi desta vez! Veja o gabarito destacado acima.'}
                      </div>

                      {sessao.quizAtivo.explicacao && (
                        <p className="mt-2 text-gray-200 font-normal text-xs leading-relaxed bg-black/30 p-2.5 rounded-xl text-left border border-white/10">
                          <strong>💡 Fundamentação:</strong> {sessao.quizAtivo.explicacao}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 2: MURAL DE DÚVIDAS ANÔNIMAS (SEMPRE ACESSÍVEL PELO ALUNO) */}
        {/* ============================================================== */}
        {abaAtivaAluno === 'duvidas' && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Mural Interativo
              </span>
              <h2 className="text-xl font-black text-white mt-2">
                Dúvidas Anônimas
              </h2>
              <p className="text-xs text-gray-400">
                Pergunte a qualquer momento. Suas dúvidas aparecem de forma 100% anônima para o professor!
              </p>
            </div>

            {/* Formulário de Envio de Dúvida */}
            <form onSubmit={handleEnviarDuvida} className="flex gap-2">
              <input
                type="text"
                required
                maxLength={160}
                value={textoDuvida}
                onChange={(e) => setTextoDuvida(e.target.value)}
                placeholder="Qual sua dúvida sobre a aula agora?"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={enviandoDuvida}
                className="px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold rounded-2xl text-xs sm:text-sm transition-transform active:scale-95 disabled:opacity-50"
              >
                {enviandoDuvida ? '...' : 'Enviar'}
              </button>
            </form>

            {/* Lista de Dúvidas Postadas com Botão de Apoio */}
            <div className="space-y-2.5 overflow-y-auto max-h-[60vh] pr-1">
              {duvidasLista.length === 0 ? (
                <div className="text-center py-10 bg-gray-900/40 rounded-2xl border border-gray-800 text-gray-400 text-xs">
                  Nenhuma dúvida enviada ainda. Aproveite para perguntar!
                </div>
              ) : (
                duvidasLista.map((d) => {
                  const jaVotei = d.votantes?.includes(alunoConectado.id);
                  return (
                    <div
                      key={d.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                        d.respondida
                          ? 'bg-gray-900/40 border-gray-800 opacity-60'
                          : 'bg-gray-900 border-gray-700/80 shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1">
                        <span className="text-xl">{d.autorAvatar || '❓'}</span>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-200 leading-snug">{d.texto}</p>
                          {d.respondida && (
                            <span className="text-[10px] text-emerald-400 font-bold mt-1 inline-block">
                              ✓ Respondida pelo professor
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleApoiarDuvida(d)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                          jaVotei
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                        }`}
                        title="Também tenho essa dúvida"
                      >
                        <span>👍</span>
                        <span>{d.votos || 0}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 3: TERMÔMETRO DE ENERGIA & SENTIMENTO */}
        {/* ============================================================== */}
        {abaAtivaAluno === 'energia' && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Termômetro de Energia
              </span>
              <h2 className="text-xl font-black text-white mt-2">
                Como está seu ritmo agora?
              </h2>
              <p className="text-xs text-gray-400">
                Atualize como você está se sentindo na aula a qualquer momento:
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'animado', emoji: '🚀', titulo: 'Animado & Empolgado', desc: 'Acelerando e absorvendo o ritmo', cor: 'from-amber-500/30 to-orange-500/30 border-amber-500/50' },
                { id: 'pensativo', emoji: '🤔', titulo: 'Pensativo & Reflexivo', desc: 'Processando os conceitos com calma', cor: 'from-blue-500/30 to-indigo-500/30 border-blue-500/50' },
                { id: 'inspirado', emoji: '💡', titulo: 'Inspirado & Cheio de Ideias', desc: 'Conectando à prática e projetos', cor: 'from-yellow-500/30 to-amber-500/30 border-yellow-500/50' },
                { id: 'cansado', emoji: '😴', titulo: 'Cansado / Bateria Baixa', desc: 'Precisando de uma pausa ou café', cor: 'from-purple-500/30 to-pink-500/30 border-purple-500/50' },
                { id: 'confuso', emoji: '🤯', titulo: 'Muita Informação!', desc: 'Conceito denso, preciso rever', cor: 'from-rose-500/30 to-red-500/30 border-rose-500/50' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleVotarSentimento(item.id)}
                  className={`p-4 rounded-2xl border text-left flex items-center gap-4 transition-all transform active:scale-95 ${
                    sentimentoVotado === item.id
                      ? `bg-gradient-to-r ${item.cor} ring-2 ring-cyan-400 shadow-lg`
                      : 'bg-gray-800/80 border-gray-700/80 hover:bg-gray-700/80'
                  }`}
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-white">{item.titulo}</h3>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  {sentimentoVotado === item.id && (
                    <span className="text-cyan-400 text-lg font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* BARRA DE NAVEGAÇÃO INFERIOR DO ALUNO (CONTROLE TOTAL NO CELULAR) */}
      {/* ============================================================== */}
      <nav className="fixed bottom-0 inset-x-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800 py-2 px-4 z-40 flex justify-around items-center max-w-lg mx-auto">
        <button
          onClick={() => {
            setAbaAtivaAluno('quiz');
            setMostrarAlertaQuiz(false);
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all relative ${
            abaAtivaAluno === 'quiz'
              ? 'text-cyan-400 font-bold scale-105'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span className="text-xl">🎯</span>
          <span className="text-[11px]">Quiz</span>
          {quizAtivoAberto && (
            <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
          )}
        </button>

        <button
          onClick={() => setAbaAtivaAluno('duvidas')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all relative ${
            abaAtivaAluno === 'duvidas'
              ? 'text-indigo-400 font-bold scale-105'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span className="text-xl">💬</span>
          <span className="text-[11px]">Dúvidas</span>
          {duvidasLista.length > 0 && (
            <span className="absolute top-0.5 right-1 px-1.5 py-0.2 bg-indigo-500 text-white rounded-full text-[9px] font-mono font-bold">
              {duvidasLista.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAbaAtivaAluno('energia')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
            abaAtivaAluno === 'energia'
              ? 'text-amber-400 font-bold scale-105'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span className="text-xl">⚡</span>
          <span className="text-[11px]">Energia</span>
        </button>
      </nav>

    </div>
  );
}
