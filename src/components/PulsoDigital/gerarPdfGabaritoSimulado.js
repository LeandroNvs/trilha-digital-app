import { jsPDF } from 'jspdf';

export function gerarPdfGabaritoSimulado({
  sessao = {},
  aluno = null,
  respostasAluno = [],
  pontuacaoTotal = 0
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const questoes = Array.isArray(sessao.questoes) ? sessao.questoes : [];
  const letras = ['A', 'B', 'C', 'D', 'E'];
  const dataHora =
    new Date().toLocaleDateString('pt-BR') +
    ' às ' +
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Mapear última resposta do aluno para cada questão (por questaoOriginalId ou prefixo do quizId)
  const mapaRespostas = {};
  (respostasAluno || []).forEach((r) => {
    if (r.questaoOriginalId) {
      mapaRespostas[r.questaoOriginalId] = r;
    } else if (r.numeroQuestao) {
      mapaRespostas[`num_${r.numeroQuestao}`] = r;
    } else if (r.quizId) {
      questoes.forEach((q) => {
        if (q.id && r.quizId.startsWith(q.id)) {
          mapaRespostas[q.id] = r;
        }
      });
    }
  });

  let totalAcertos = 0;
  let totalRespondidas = 0;
  questoes.forEach((q, idx) => {
    const resp = mapaRespostas[q.id] || mapaRespostas[`num_${idx + 1}`];
    if (resp && resp.opcaoEscolhida !== undefined && resp.opcaoEscolhida !== null) {
      totalRespondidas++;
      if (resp.opcaoEscolhida === q.respostaCorretaIndex) {
        totalAcertos++;
      }
    }
  });

  const renderMiniHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const tituloCurto = (sessao.titulo || 'Simulado / Quiz').toUpperCase().slice(0, 55);
    doc.text(`PULSO DIGITAL • GABARITO COMENTADO • ${tituloCurto}`, margin, y);
    y += 3;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  const checkPageBreak = (neededHeight = 20) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = margin;
      renderMiniHeader();
    }
  };

  // =========================================================================
  // 1. CABEÇALHO PRINCIPAL
  // =========================================================================
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 28, 'F');

  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(margin, y + 26.8, contentWidth, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('GABARITO OFICIAL COMENTADO • SIMULADO & QUIZ', margin + 6, y + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`${sessao.titulo || 'Sessão Pulso Digital'}`, margin + 6, y + 15);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const infoTurma = `${sessao.disciplinaNome || 'Disciplina'} • ${sessao.turmaNome || 'Turma'} • PIN: ${sessao.pin || '---'} • Emissão: ${dataHora}`;
  doc.text(infoTurma, margin + 6, y + 21.5);

  y += 33;

  // =========================================================================
  // 2. RESUMO DE DESEMPENHO DO ALUNO (SE IDENTIFICADO)
  // =========================================================================
  if (aluno) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Aluno(a): ${aluno.apelido || 'Participante'}`, margin + 5, y + 7);

    const pctAcerto = questoes.length > 0 ? Math.round((totalAcertos / questoes.length) * 100) : 0;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(
      `Desempenho: ${totalAcertos} de ${questoes.length} questões corretas (${pctAcerto}%)   •   Respondidas: ${totalRespondidas}/${questoes.length}   •   Pontuação Total: ${pontuacaoTotal} pts`,
      margin + 5,
      y + 13.5
    );

    y += 24;
  }

  // =========================================================================
  // 3. LISTAGEM DAS QUESTÕES, ALTERNATIVAS E JUSTIFICATIVAS
  // =========================================================================
  questoes.forEach((q, idx) => {
    const enunciado = String(q.enunciado || q.pergunta || '').trim();
    const opcoes = Array.isArray(q.opcoes) ? q.opcoes : [];
    const corretaIdx = q.respostaCorretaIndex ?? 0;
    const explicacao = String(q.explicacao || q.consideracoes || '').trim();
    const respAluno = mapaRespostas[q.id] || mapaRespostas[`num_${idx + 1}`];
    const escolhaAlunoIdx =
      respAluno && respAluno.opcaoEscolhida !== undefined ? respAluno.opcaoEscolhida : null;
    const acertou = escolhaAlunoIdx !== null && escolhaAlunoIdx === corretaIdx;

    const linhasEnunciado = doc.splitTextToSize(enunciado, contentWidth - 10);
    const alturaEnunciado = linhasEnunciado.length * 4.5 + 12;

    checkPageBreak(alturaEnunciado + 25);

    // Barra de Título da Questão
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const tipoLabel = (q.tipoQuestao === 'simulado' || q.tipoQuiz === 'simulado') ? 'SIMULADO' : 'QUIZ';
    doc.text(`QUESTÃO #${idx + 1} (${tipoLabel})`, margin + 4, y + 5.3);

    // Status do aluno na questão
    if (aluno) {
      doc.setFontSize(8);
      if (escolhaAlunoIdx === null) {
        doc.setTextColor(100, 116, 139);
        doc.text(`Sem resposta registrada • Gabarito: ${letras[corretaIdx]}`, pageWidth - margin - 4, y + 5.3, { align: 'right' });
      } else if (acertou) {
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.text(`ACERTOU (Marcou ${letras[escolhaAlunoIdx]})`, pageWidth - margin - 4, y + 5.3, { align: 'right' });
      } else {
        doc.setTextColor(225, 29, 72); // rose-600
        doc.text(`ERROU (Marcou ${letras[escolhaAlunoIdx]} • Correta: ${letras[corretaIdx]})`, pageWidth - margin - 4, y + 5.3, { align: 'right' });
      }
    } else {
      doc.setTextColor(5, 150, 105);
      doc.text(`Gabarito Oficial: Alternativa ${letras[corretaIdx]}`, pageWidth - margin - 4, y + 5.3, { align: 'right' });
    }

    y += 12;

    // Enunciado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(linhasEnunciado, margin + 2, y);
    y += linhasEnunciado.length * 4.5 + 3;

    // Alternativas A, B, C, D
    opcoes.forEach((op, opIdx) => {
      const textoOp = (typeof op === 'string' ? op : op.texto || '').replace(/^[a-eA-E]\s*[).:-]\s*/, '').trim();
      const ehGabarito = opIdx === corretaIdx;
      const foiEscolhida = escolhaAlunoIdx === opIdx;

      let sufixo = '';
      if (ehGabarito && foiEscolhida) sufixo = '  [CORRETA • SUA ESCOLHA]';
      else if (ehGabarito) sufixo = '  [GABARITO CORRETO]';
      else if (foiEscolhida) sufixo = '  [SUA ESCOLHA]';

      const textoLinha = `${letras[opIdx].toLowerCase()}) ${textoOp}${sufixo}`;
      const linhasOp = doc.splitTextToSize(textoLinha, contentWidth - 12);
      const boxHeight = linhasOp.length * 4.2 + 4;

      checkPageBreak(boxHeight + 4);

      if (ehGabarito) {
        doc.setFillColor(236, 253, 245); // emerald-50
        doc.setDrawColor(16, 185, 129); // emerald-500
        doc.setTextColor(6, 95, 70);
        doc.setFont('helvetica', 'bold');
      } else if (foiEscolhida && !ehGabarito) {
        doc.setFillColor(255, 241, 242); // rose-50
        doc.setDrawColor(244, 63, 94); // rose-500
        doc.setTextColor(159, 18, 57);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
      }

      doc.setLineWidth(0.25);
      doc.roundedRect(margin + 2, y, contentWidth - 4, boxHeight, 1.2, 1.2, 'FD');
      doc.setFontSize(8.5);
      doc.text(linhasOp, margin + 5, y + 3.8);

      y += boxHeight + 2;
    });

    // Justificativa / Fundamentação
    if (explicacao) {
      const textoJust = `Justificativa / Fundamentação: ${explicacao}`;
      const linhasJust = doc.splitTextToSize(textoJust, contentWidth - 12);
      const altJust = linhasJust.length * 4.2 + 5;

      checkPageBreak(altJust + 6);

      doc.setFillColor(254, 252, 232); // amber-50
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.setLineWidth(0.3);
      doc.roundedRect(margin + 2, y + 1, contentWidth - 4, altJust, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.3);
      doc.setTextColor(120, 53, 15);
      doc.text(linhasJust, margin + 5, y + 5);

      y += altJust + 4;
    }

    y += 5;
  });

  // Nome do arquivo limpo
  const tituloLimpo = (sessao.titulo || 'simulado')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();
  const alunoLimpo = aluno?.apelido
    ? '_' +
      aluno.apelido
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase()
    : '';

  doc.save(`gabarito_${tituloLimpo}${alunoLimpo}.pdf`);
}
