import { jsPDF } from 'jspdf';
import { FASES, CARACTERISTICAS_REDE, classificarPerfilRede } from './constants';

export function gerarRelatorioExecutivoPdf({
    grupoNome = 'Grupo',
    pontuacoes = {},
    decisoes = {},
    justificativas = {},
    acoesMitigacao = {}
}) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2); // 182mm
    let y = margin;

    const perfil = classificarPerfilRede(pontuacoes, decisoes);
    const {
        tempoTotalMeses = 18,
        janela,
        totalGargalos = 0,
        totalAssimetrias = 0,
        totalRigidezes = 0,
        caracteristicasConsolidadas = []
    } = pontuacoes;

    const dataHoraEmissao = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Helper para verificar necessidade de nova página
    const checkPageBreak = (neededHeight = 15) => {
        if (y + neededHeight > pageHeight - 18) {
            doc.addPage();
            y = margin;
            renderMiniHeader();
        }
    };

    // Mini-header para páginas subsequentes
    const renderMiniHeader = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`RELATÓRIO EXECUTIVO • EVOLUÇÃO DE REDE H1 → H2 • EQUIPE: ${grupoNome.toUpperCase()}`, margin, y);
        y += 3;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
    };

    // ------------------------------------------------------------------------
    // 1. BANNER PRINCIPAL (CABEÇALHO EXECUTIVO)
    // ------------------------------------------------------------------------
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, contentWidth, 26, 'F');

    // Faixa ciano de destaque
    doc.setFillColor(6, 182, 212); // cyan-500
    doc.rect(margin, y + 25, contentWidth, 1.2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('RELATÓRIO EXECUTIVO: GOVERNANÇA E EVOLUÇÃO DE REDE', margin + 6, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text('Transição Estratégica de Rede: Horizonte 1 (Convencional) → Horizonte 2 (Smartphones Dobráveis)', margin + 6, y + 16);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Equipe de Projeto: ${grupoNome.toUpperCase()}   •   Emissão: ${dataHoraEmissao}`, margin + 6, y + 22);

    y += 32;

    // ------------------------------------------------------------------------
    // 2. PAINEL DE POSICIONAMENTO E INDICADORES-CHAVE
    // ------------------------------------------------------------------------
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

    // Título da Janela
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Posicionamento: ${janela?.badge || perfil.badge} — ${tempoTotalMeses} meses`, margin + 5, y + 6.5);

    // Resumo do Perfil
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const resumoLines = doc.splitTextToSize(janela?.resumo || perfil.resumo || '', contentWidth - 10);
    doc.text(resumoLines, margin + 5, y + 12);

    // Mini-Cards de KPIs
    const kpiY = y + 23;
    const kpiWidth = (contentWidth - 12) / 4;
    const kpiList = [
        { label: 'TIME-TO-MARKET', val: `${tempoTotalMeses} meses`, sub: 'Base: 18m' },
        { label: 'GARGALOS', val: `${totalGargalos} ativados`, sub: 'Estruturais' },
        { label: 'ASSIMETRIAS', val: `${totalAssimetrias} mapeadas`, sub: 'Fluxo e Valor' },
        { label: 'RIGIDEZ RELACIONAL', val: `${totalRigidezes} ativa(s)`, sub: 'Herança H1' }
    ];

    kpiList.forEach((k, idx) => {
        const kX = margin + 3 + (idx * (kpiWidth + 2));
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(kX, kpiY, kpiWidth, 11, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(k.label, kX + 2, kpiY + 3.5);

        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(k.val, kX + 2, kpiY + 7.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.text(k.sub, kX + 2, kpiY + 10);
    });

    y += 44;

    // ------------------------------------------------------------------------
    // 3. MAPA ESTRUTURAL DA REDE DE NEGÓCIOS ACUMULADA
    // ------------------------------------------------------------------------
    checkPageBreak(30);
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('MAPA ESTRUTURAL DA REDE DE NEGÓCIOS CONSOLIDADA', margin + 3, y + 4.2);
    y += 8;

    if (caracteristicasConsolidadas.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Nenhuma característica estrutural consolidada registrada.', margin, y);
        y += 6;
    } else {
        caracteristicasConsolidadas.forEach((item) => {
            const carac = CARACTERISTICAS_REDE[item.caracteristicaId];
            const nomeCarac = carac ? carac.nome : item.caracteristicaId;
            const catCarac = carac ? carac.categoria : 'Rede';
            const efeitoTexto = item.efeito || '';

            const efeitoLines = doc.splitTextToSize(efeitoTexto, contentWidth - 8);
            const cardHeight = 11 + (efeitoLines.length * 3.3);

            checkPageBreak(cardHeight + 2);

            // Container do Card
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, y, contentWidth, cardHeight, 1.5, 1.5, 'FD');

            // Linha Superior: Nome da Característica (esquerda) e Categoria / Origem (direita)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.8);
            doc.setTextColor(15, 23, 42);
            doc.text(nomeCarac, margin + 4, y + 4.5);

            const badgeTexto = `${catCarac.toUpperCase()}  •  ${item.faseTitulo?.split(':')[0] || 'Fase'}`;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.2);
            doc.setTextColor(100, 116, 139);
            doc.text(badgeTexto, margin + contentWidth - 4, y + 4.5, { align: 'right' });

            // Divisória horizontal sutil interna
            doc.setDrawColor(226, 232, 240);
            doc.line(margin + 4, y + 6.8, margin + contentWidth - 4, y + 6.8);

            // Linha de Efeito Estrutural com largura total livre de sobreposição
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(51, 65, 85);
            doc.text(efeitoLines, margin + 4, y + 10.5);

            y += cardHeight + 2.5;
        });
    }

    y += 4;

    // ------------------------------------------------------------------------
    // 4. PLANO DIRETOR DE GOVERNANÇA ESTRATÉGICA & JUSTIFICATIVAS (FASES 1 A 4)
    // ------------------------------------------------------------------------
    checkPageBreak(35);
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('PLANO DIRETOR DE GOVERNANÇA ESTRATÉGICA E JUSTIFICATIVAS POR ETAPA', margin + 3, y + 4.2);
    y += 9;

    FASES.forEach((fase) => {
        const escolhaId = decisoes[fase.chave];
        const opcao = fase.opcoes.find(o => o.id === escolhaId);
        const justificativa = justificativas[fase.chave] || 'Nenhuma justificativa registrada pela equipe.';
        const acaoGovernanca = acoesMitigacao[fase.chave] || 'Nenhuma ação de governança cadastrada.';

        // Dividir textos
        const justLines = doc.splitTextToSize(justificativa, contentWidth - 8);
        const govLines = doc.splitTextToSize(acaoGovernanca, contentWidth - 8);
        const desafioLines = opcao?.desafioGovernanca ? doc.splitTextToSize(opcao.desafioGovernanca, contentWidth - 8) : [];

        const neededHeight = 22 + (justLines.length * 3.5) + (govLines.length * 3.5) + (desafioLines.length * 3.2);

        checkPageBreak(Math.min(neededHeight, 65));

        // Caixa da Fase
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);

        // Header da Fase
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentWidth, 7, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.line(margin, y + 7, margin + contentWidth, y + 7);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(`${fase.titulo.toUpperCase()} (${fase.subtitulo})`, margin + 3, y + 4.8);

        y += 10;

        // Decisão Escolhida
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(8, 145, 178); // cyan-600
        doc.text(`Estratégia Adotada: Opção ${opcao?.letra || '?'} — ${opcao?.titulo || 'Não selecionada'}`, margin + 3, y);
        y += 4;

        if (opcao?.arquetipo) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(`Arquétipo Estratégico: ${opcao.arquetipo}`, margin + 3, y);
            y += 4.5;
        }

        // Justificativa Estratégica
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Justificativa Estratégica da Equipe:', margin + 3, y);
        y += 3.5;

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text(justLines, margin + 3, y);
        y += (justLines.length * 3.5) + 3;

        // Desafio de Governança
        if (desafioLines.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(180, 83, 9); // amber-700
            doc.text('Ponto de Atenção e Desafio de Governança da Etapa:', margin + 3, y);
            y += 3.2;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(120, 53, 15);
            doc.text(desafioLines, margin + 3, y);
            y += (desafioLines.length * 3.2) + 3;
        }

        // Ação de Governança Estruturada
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Ação de Governança da Rede Formulada:', margin + 3, y);
        y += 3.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(govLines, margin + 3, y);
        y += (govLines.length * 3.5) + 6;

        // Divisória sutil
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y, margin + contentWidth, y);
        y += 5;
    });

    // ------------------------------------------------------------------------
    // 5. RODAPÉ EM TODAS AS PÁGINAS COM NUMERAÇÃO
    // ------------------------------------------------------------------------
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
        doc.text('Trilha Digital • Relatório Executivo de Governança de Redes • Case Smartphones Dobráveis H1 → H2', margin, pageHeight - 7);
        doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 7);
    }

    // Salvar arquivo PDF
    const nomeArquivo = `Relatorio_Executivo_Evolucao_Rede_${(grupoNome || 'Grupo').replace(/\s+/g, '_')}.pdf`;
    doc.save(nomeArquivo);
}
