export function processarNiveis(empresa, simulacao) {
    const { estadoAtual, decisoes, estadoNovo } = empresa;

    // Bônus de Rede (Fornecedor D)
    let bonusS1 = (decisoes.Escolha_Fornecedor_S1_Chip === 'D') ? (1 + (simulacao.Fornecedor_S1_Chip_D_Bonus_PD_Percent||0)/100) : 1;
    let bonusS2 = (decisoes.Escolha_Fornecedor_S2_Chip === 'D') ? (1 + (simulacao.Fornecedor_S2_Chip_D_Bonus_PD_Percent||0)/100) : 1;
    const bonusMedio = (bonusS1 + bonusS2) / 2;

    const calcNivel = (area, progAtual, invest, keyNivel) => {
        const total = (progAtual || 0) + invest;
        let nivel = estadoAtual[keyNivel] || 1;
        let novoNivel = nivel;
        
        for(let n = nivel + 1; n <= 5; n++) {
            const custoNec = simulacao[`Custo_PD_${area}_Nivel_${n}`] || simulacao[`Custo_Nivel_${area}_Nivel_${n}`] || Infinity;
            if (total >= custoNec) novoNivel = n;
            else break;
        }
        return { nivel: novoNivel, progresso: total };
    };

    // Atualiza Níveis de Produto
    const rCam = calcNivel('Camera', estadoAtual.Progresso_PD_Camera, decisoes.Invest_PD_Camera || 0, 'Nivel_PD_Camera');
    const rBat = calcNivel('Bateria', estadoAtual.Progresso_PD_Bateria, (decisoes.Invest_PD_Bateria || 0) * bonusMedio, 'Nivel_PD_Bateria');
    const rSO = calcNivel('Sist_Operacional_e_IA', estadoAtual.Progresso_PD_Sist_Operacional_e_IA, (decisoes.Invest_PD_Sist_Operacional_e_IA || 0) * bonusMedio, 'Nivel_PD_Sist_Operacional_e_IA');
    const rAG = calcNivel('Atualizacao_Geral', estadoAtual.Progresso_PD_Atualizacao_Geral, decisoes.Invest_PD_Atualizacao_Geral || 0, 'Nivel_PD_Atualizacao_Geral');
    
    estadoNovo.Nivel_PD_Camera = rCam.nivel; estadoNovo.Progresso_PD_Camera = rCam.progresso;
    estadoNovo.Nivel_PD_Bateria = rBat.nivel; estadoNovo.Progresso_PD_Bateria = rBat.progresso;
    estadoNovo.Nivel_PD_Sist_Operacional_e_IA = rSO.nivel; estadoNovo.Progresso_PD_Sist_Operacional_e_IA = rSO.progresso;
    estadoNovo.Nivel_PD_Atualizacao_Geral = rAG.nivel; estadoNovo.Progresso_PD_Atualizacao_Geral = rAG.progresso;

    // Atualiza Níveis Organizacionais
    const rCap = calcNivel('Capacitacao', estadoAtual.Progresso_Capacitacao, decisoes.Invest_Organiz_Capacitacao || 0, 'Nivel_Capacitacao');
    const rQual = calcNivel('Qualidade', estadoAtual.Progresso_Qualidade, decisoes.Invest_Organiz_Mkt_Institucional || 0, 'Nivel_Qualidade');
    const rESG = calcNivel('ESG', estadoAtual.Progresso_ESG, decisoes.Invest_Organiz_ESG || 0, 'Nivel_ESG');

    estadoNovo.Nivel_Capacitacao = rCap.nivel; estadoNovo.Progresso_Capacitacao = rCap.progresso;
    estadoNovo.Nivel_Qualidade = rQual.nivel; estadoNovo.Progresso_Qualidade = rQual.progresso;
    estadoNovo.Nivel_ESG = rESG.nivel; estadoNovo.Progresso_ESG = rESG.progresso;
}