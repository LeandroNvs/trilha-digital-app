import React, { useState, useMemo, useRef } from 'react';
import { FORMAS_QUIZ } from './bancoQuestoes.js';

const EXEMPLO_JSON_QUIZ = [
  {
    tipo: 'quiz',
    pergunta: 'Qual é a principal função de um Sistema de Informação Gerencial (SIG)?',
    alternativas: [
      'Apenas armazenar arquivos em nuvem',
      'Apoiar a tomada de decisão com relatórios e indicadores',
      'Substituir completamente a equipe de TI',
      'Controlar somente a folha de pagamento'
    ],
    alternativaCorreta: 'B',
    consideracoes: 'Os SIGs consolidam dados operacionais para gerar informações táticas e apoiar decisões gerenciais.',
    tempoSegundos: 30
  },
  {
    tipo: 'quiz',
    pergunta: 'Qual indicador mede o retorno financeiro obtido em relação ao investimento realizado?',
    alternativas: [
      'ROI (Retorno sobre Investimento)',
      'SLA (Acordo de Nível de Serviço)',
      'KPI de Absenteísmo',
      'NPS (Net Promoter Score)'
    ],
    alternativaCorreta: 'A',
    consideracoes: 'O ROI compara o ganho líquido obtido com o custo total do investimento.',
    tempoSegundos: 30
  }
];

const EXEMPLO_JSON_SIMULADO = [
  {
    tipo: 'simulado',
    pergunta: '[Enunciado da Questão 1 do Simulado] Descreva aqui o cenário, estudo de caso ou situação-problema da questão de prova...',
    alternativas: [
      'Texto completo da alternativa A.',
      'Texto completo da alternativa B.',
      'Texto completo da alternativa C.',
      'Texto completo da alternativa D.'
    ],
    alternativaCorreta: 'A',
    consideracoes: 'Fundamentação e explicação detalhada que será exibida na tela cheia do mediador após revelar o gabarito.'
  },
  {
    tipo: 'simulado',
    pergunta: '[Enunciado da Questão 2 do Simulado] Descreva aqui o segundo caso ou pergunta do simulado...',
    alternativas: [
      'Texto completo da alternativa A.',
      'Texto completo da alternativa B.',
      'Texto completo da alternativa C.',
      'Texto completo da alternativa D.'
    ],
    alternativaCorreta: 'C',
    consideracoes: 'Fundamentação da questão 2 para discussão com a turma antes de avançar para a próxima.'
  }
];

export function baixarModeloJsonPulso(tipo = 'simulado') {
  const dados = tipo === 'simulado' ? EXEMPLO_JSON_SIMULADO : EXEMPLO_JSON_QUIZ;
  const nome = tipo === 'simulado'
    ? 'modelo-simulado-pulso-digital.json'
    : 'modelo-quiz-pulso-digital.json';
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function resolverIndiceCorreto(q, opcoesTexto, opcoesObjetos) {
  // 1. Verifica se alguma alternativa veio como objeto com flag booleana
  const idxObjCorreta = opcoesObjetos.findIndex(
    (o) => o && typeof o === 'object' && (o.correta === true || o.isCorrect === true || o.correct === true)
  );
  if (idxObjCorreta >= 0 && idxObjCorreta < opcoesTexto.length) {
    return idxObjCorreta;
  }

  // 2. Campos explícitos de índice 0-based
  const idxExplicito = q.respostaCorretaIndex ?? q.corretaIndex ?? q.correctIndex ?? q.gabaritoIndex;
  if (typeof idxExplicito === 'number' && Number.isInteger(idxExplicito)) {
    if (idxExplicito >= 0 && idxExplicito < opcoesTexto.length) return idxExplicito;
  }

  // 3. Campos flexíveis: alternativaCorreta, respostaCorreta, correta, gabarito, etc.
  const raw = q.alternativaCorreta ?? q.respostaCorreta ?? q.correta ?? q.correctAnswer ?? q.gabarito ?? q.resposta;
  if (raw !== undefined && raw !== null && raw !== '') {
    if (typeof raw === 'number' && Number.isInteger(raw)) {
      if (raw >= 0 && raw < opcoesTexto.length) return raw;
      if (raw === opcoesTexto.length) return opcoesTexto.length - 1;
    }

    const str = String(raw).trim();
    const upper = str.toUpperCase().replace(/[).:\s]+$/, '');

    // Letra A, B, C, D
    const letras = ['A', 'B', 'C', 'D'];
    const idxLetra = letras.indexOf(upper);
    if (idxLetra >= 0 && idxLetra < opcoesTexto.length) {
      return idxLetra;
    }

    // Número em string "0"-"3" ou "1"-"4"
    if (/^\d+$/.test(upper)) {
      const num = Number(upper);
      if (num >= 1 && num <= opcoesTexto.length) return num - 1;
      if (num === 0) return 0;
    }

    // Comparação exata (case-insensitive) com o texto da alternativa
    const lower = str.toLowerCase();
    const idxTexto = opcoesTexto.findIndex((t) => t.toLowerCase() === lower);
    if (idxTexto >= 0) return idxTexto;
  }

  return 0;
}

export function parsearQuestoesQuizJson(jsonTexto, tipoPadrao = 'quiz') {
  if (!jsonTexto || !jsonTexto.trim()) {
    return { questoes: [], erros: [], erroFatal: null };
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonTexto);
  } catch (err) {
    return {
      questoes: [],
      erros: [],
      erroFatal: `JSON inválido: ${err.message}`
    };
  }

  let listaBruta = [];
  if (Array.isArray(parsed)) {
    listaBruta = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const possivelLista =
      parsed.questoes ??
      parsed.perguntas ??
      parsed.questions ??
      parsed.quiz ??
      parsed.itens ??
      parsed.items;
    if (Array.isArray(possivelLista)) {
      listaBruta = possivelLista;
    } else if (parsed.pergunta || parsed.enunciado || parsed.question) {
      listaBruta = [parsed];
    } else {
      return {
        questoes: [],
        erros: [],
        erroFatal: 'Estrutura não reconhecida. Envie um array [...] de perguntas ou um objeto com a chave "perguntas" / "questoes".'
      };
    }
  } else {
    return {
      questoes: [],
      erros: [],
      erroFatal: 'O arquivo JSON precisa conter uma lista (array) de perguntas.'
    };
  }

  const questoes = [];
  const erros = [];
  const baseTs = Date.now();

  listaBruta.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      erros.push(`Item #${idx + 1}: formato inválido (esperado um objeto).`);
      return;
    }

    const enunciadoRaw = item.enunciado ?? item.pergunta ?? item.question ?? item.titulo ?? item.texto ?? '';
    const enunciado = String(enunciadoRaw).trim();
    if (!enunciado) {
      erros.push(`Item #${idx + 1}: campo "pergunta" / "enunciado" vazio.`);
      return;
    }

    const opcoesBrutas = item.opcoes ?? item.alternativas ?? item.alternatives ?? item.options ?? item.respostas;
    if (!Array.isArray(opcoesBrutas)) {
      erros.push(`Item #${idx + 1} ("${enunciado.slice(0, 35)}..."): "alternativas" / "opcoes" precisa ser uma lista.`);
      return;
    }

    const opcoesObjetos = opcoesBrutas.slice(0, 5);
    const opcoesTexto = opcoesObjetos
      .map((o) => {
        let txt = '';
        if (typeof o === 'string') txt = o.trim();
        else if (o && typeof o === 'object') txt = String(o.texto ?? o.text ?? o.label ?? o.alternativa ?? '').trim();
        else txt = String(o ?? '').trim();
        return txt.replace(/^[a-eA-E]\s*[).:-]\s*/, '').trim();
      })
      .filter((t) => t !== '');

    if (opcoesTexto.length < 2) {
      erros.push(`Item #${idx + 1} ("${enunciado.slice(0, 35)}..."): são necessárias pelo menos 2 alternativas válidas.`);
      return;
    }

    const respostaCorretaIndex = resolverIndiceCorreto(item, opcoesTexto, opcoesObjetos);
    const explicacaoRaw =
      item.consideracoes ??
      item.consideracao ??
      item.explicacao ??
      item.fundamentacao ??
      item.justificativa ??
      item.comentario ??
      item.explanation ??
      item.feedback ??
      '';
    const explicacao = String(explicacaoRaw).trim();
    const tipoItemRaw = String(item.tipoQuestao ?? item.tipo ?? item.modo ?? tipoPadrao).trim().toLowerCase();
    const tipoQuestao = tipoItemRaw === 'simulado' ? 'simulado' : 'quiz';
    const tempoRaw = Number(item.tempoSegundos ?? item.tempo ?? item.timeLimit ?? (tipoQuestao === 'simulado' ? 0 : 30));
    const tempoSegundos = tipoQuestao === 'simulado'
      ? 0
      : (Number.isFinite(tempoRaw) && tempoRaw >= 5 ? Math.round(tempoRaw) : 30);

    questoes.push({
      id: `q_${baseTs}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      tipoQuestao,
      enunciado,
      tempoSegundos,
      opcoes: opcoesTexto.map((txt, i) => ({
        texto: txt,
        forma: FORMAS_QUIZ[i]?.forma || 'quadrado',
        cor: FORMAS_QUIZ[i]?.cor || 'bg-gray-700',
        icone: FORMAS_QUIZ[i]?.icone || '●'
      })),
      respostaCorretaIndex,
      explicacao
    });
  });

  return { questoes, erros, erroFatal: null };
}

export default function ImportarQuizJsonModal({
  aberto,
  onFechar,
  onImportar,
  quantidadeAtual = 0
}) {
  const [jsonTexto, setJsonTexto] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [tipoPadraoImportacao, setTipoPadraoImportacao] = useState('quiz');
  const [substituirExistentes, setSubstituirExistentes] = useState(false);
  const [importando, setImportando] = useState(false);
  const [mostrarModelo, setMostrarModelo] = useState(false);
  const fileInputRef = useRef(null);

  const resultado = useMemo(() => parsearQuestoesQuizJson(jsonTexto, tipoPadraoImportacao), [jsonTexto, tipoPadraoImportacao]);

  if (!aberto) return null;

  const handleSelecionarArquivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNomeArquivo(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = typeof ev.target?.result === 'string' ? ev.target.result : '';
      setJsonTexto(content);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleBaixarModelo = (tipoEscolhido = tipoPadraoImportacao) => {
    baixarModeloJsonPulso(tipoEscolhido);
  };

  const handleCarregarExemplo = () => {
    const dados = tipoPadraoImportacao === 'simulado' ? EXEMPLO_JSON_SIMULADO : EXEMPLO_JSON_QUIZ;
    setNomeArquivo(
      tipoPadraoImportacao === 'simulado'
        ? 'modelo-simulado-pulso-digital.json'
        : 'modelo-quiz-pulso-digital.json'
    );
    setJsonTexto(JSON.stringify(dados, null, 2));
  };

  const handleConfirmarImportacao = async () => {
    if (resultado.questoes.length === 0 || importando) return;
    setImportando(true);
    try {
      await onImportar(resultado.questoes, substituirExistentes);
      setJsonTexto('');
      setNomeArquivo('');
      setSubstituirExistentes(false);
      onFechar();
    } finally {
      setImportando(false);
    }
  };

  const handleFechar = () => {
    if (importando) return;
    onFechar();
  };

  const letras = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📥</span> Importar Perguntas do Quiz (JSON)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Carregue um arquivo <code className="text-cyan-300">.json</code> com perguntas, alternativas, alternativa correta e considerações.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFechar}
            className="text-gray-400 hover:text-white p-1"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Seletor de Tipo Padrão para as questões importadas */}
        <div className="bg-gray-950/80 border border-gray-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-gray-300">
            Tipo padrão das questões importadas:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTipoPadraoImportacao('quiz')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                tipoPadraoImportacao === 'quiz'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              🎯 Quiz Rápido
            </button>
            <button
              type="button"
              onClick={() => setTipoPadraoImportacao('simulado')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                tipoPadraoImportacao === 'simulado'
                  ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              📝 Simulado de Prova
            </button>
          </div>
        </div>

        {/* Barra de ações: Upload, Exemplo, Modelo */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleSelecionarArquivo}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-colors"
          >
            <span>📂</span> Selecionar Arquivo .json
          </button>

          <button
            type="button"
            onClick={() => handleBaixarModelo('quiz')}
            className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-amber-300 border border-gray-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>⬇️</span> Modelo Quiz (.json)
          </button>

          <button
            type="button"
            onClick={() => handleBaixarModelo('simulado')}
            className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-indigo-300 border border-gray-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>⬇️</span> Modelo Simulado (.json)
          </button>

          <button
            type="button"
            onClick={handleCarregarExemplo}
            className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-amber-300 border border-gray-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>✨</span> Testar com Exemplo
          </button>

          <button
            type="button"
            onClick={() => setMostrarModelo((v) => !v)}
            className="ml-auto text-xs text-gray-400 hover:text-white underline"
          >
            {mostrarModelo ? 'Ocultar formato esperado' : 'Ver formato esperado'}
          </button>
        </div>

        {nomeArquivo && (
          <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 flex items-center justify-between">
            <span>📄 Arquivo carregado: <strong>{nomeArquivo}</strong></span>
            <button
              type="button"
              onClick={() => {
                setJsonTexto('');
                setNomeArquivo('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-gray-400 hover:text-white text-xs ml-2"
            >
              Limpar
            </button>
          </div>
        )}

        {mostrarModelo && (
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-3 text-[11px] text-gray-300 space-y-2">
            <p className="text-gray-400">
              Aceita array JSON com os campos <code className="text-cyan-300">pergunta</code> (ou <code className="text-cyan-300">enunciado</code>),{' '}
              <code className="text-cyan-300">alternativas</code> (2 a 4 itens),{' '}
              <code className="text-cyan-300">alternativaCorreta</code> (<code className="text-emerald-300">"A"</code>..<code className="text-emerald-300">"D"</code>, índice <code className="text-emerald-300">0</code>..<code className="text-emerald-300">3</code> ou texto exato) e{' '}
              <code className="text-cyan-300">consideracoes</code> (ou <code className="text-cyan-300">explicacao</code>).
            </p>
            <pre className="overflow-x-auto text-[11px] text-cyan-200 font-mono leading-relaxed">
              {JSON.stringify(
                tipoPadraoImportacao === 'simulado' ? EXEMPLO_JSON_SIMULADO[0] : EXEMPLO_JSON_QUIZ[0],
                null,
                2
              )}
            </pre>
          </div>
        )}

        {/* Textarea para colar ou revisar JSON */}
        <div>
          <label className="block text-xs uppercase font-bold text-gray-400 mb-1.5">
            Conteúdo JSON (ou cole diretamente aqui)
          </label>
          <textarea
            rows={5}
            value={jsonTexto}
            onChange={(e) => setJsonTexto(e.target.value)}
            placeholder='Cole aqui o JSON das perguntas ou clique em "Selecionar Arquivo .json"...'
            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs font-mono text-gray-100 focus:outline-none focus:border-cyan-400 resize-y"
          />
        </div>

        {/* Erros de parse ou validação */}
        {resultado.erroFatal && (
          <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 rounded-xl p-3 text-xs">
            ⚠️ {resultado.erroFatal}
          </div>
        )}

        {resultado.erros.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/40 text-amber-200 rounded-xl p-3 text-xs space-y-1">
            <p className="font-bold">⚠️ Alguns itens foram ignorados:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {resultado.erros.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Pré-visualização */}
        {resultado.questoes.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-400">
                ✅ {resultado.questoes.length} {resultado.questoes.length === 1 ? 'pergunta pronta' : 'perguntas prontas'} para importar
              </span>

              {quantidadeAtual > 0 && (
                <div className="flex items-center gap-3 text-xs text-gray-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="modoImportacaoQuiz"
                      checked={!substituirExistentes}
                      onChange={() => setSubstituirExistentes(false)}
                      className="text-cyan-500"
                    />
                    Adicionar às {quantidadeAtual} existentes
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="modoImportacaoQuiz"
                      checked={substituirExistentes}
                      onChange={() => setSubstituirExistentes(true)}
                      className="text-rose-500"
                    />
                    Substituir atuais
                  </label>
                </div>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {resultado.questoes.map((q, idx) => (
                <div key={q.id} className="bg-gray-800/80 border border-gray-700 rounded-2xl p-3 text-xs space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-white">
                      <span className="text-cyan-300 font-mono mr-1.5">#{idx + 1}</span>
                      {q.enunciado}
                    </p>
                    <span className="text-[10px] font-mono text-gray-400 shrink-0">
                      {q.tipoQuestao === 'simulado' ? '📝 Simulado (+1 pt)' : `🎯 Quiz (${q.tempoSegundos}s)`}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {q.opcoes.map((op, opIdx) => {
                      const ehCorreta = opIdx === q.respostaCorretaIndex;
                      return (
                        <div
                          key={opIdx}
                          className={`px-2 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 ${
                            ehCorreta
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold'
                              : 'bg-gray-900/60 border-gray-700/70 text-gray-300'
                          }`}
                        >
                          <span className="font-mono font-bold">{letras[opIdx] || opIdx + 1})</span>
                          <span className="truncate">{op.texto}</span>
                          {ehCorreta && <span className="ml-auto">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.explicacao && (
                    <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
                      💡 <strong>Considerações:</strong> {q.explicacao}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="pt-2 flex justify-end gap-2 border-t border-gray-800">
          <button
            type="button"
            onClick={handleFechar}
            disabled={importando}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmarImportacao}
            disabled={resultado.questoes.length === 0 || importando}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition-all"
          >
            {importando
              ? 'Importando...'
              : `Importar ${resultado.questoes.length || ''} ${resultado.questoes.length === 1 ? 'Pergunta' : 'Perguntas'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
