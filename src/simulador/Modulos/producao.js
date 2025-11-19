export function processarOperacoes(empresa, simulacao, proximaRodada) {
    const { estadoAtual, decisoes, estadoNovo } = empresa;
    
    // 1. Expansão de Capacidade (Efeito na próxima)
    const invExp = decisoes.Invest_Expansao_Fabrica || 0;
    const incrementoCap = Math.floor(invExp / (simulacao.Custo_Expansao_Lote || 1)) * (simulacao.Incremento_Capacidade_Lote || 0);
    estadoNovo.Capacidade_Fabrica = (estadoAtual.Capacidade_Fabrica || 0) + incrementoCap;

    // 2. Produção e Limites
    let prodS1 = decisoes.Producao_Planejada_S1 || 0;
    let prodS2 = decisoes.Producao_Planejada_S2 || 0;
    let prodTotal = prodS1 + prodS2;
    
    // Usa a capacidade da rodada ATUAL (que veio do estado anterior)
    const capacidadeDisponivel = estadoAtual.Capacidade_Fabrica || 0;

    if (prodTotal > capacidadeDisponivel) {
        const ratio = capacidadeDisponivel / prodTotal;
        prodS1 = Math.floor(prodS1 * ratio);
        prodS2 = Math.floor(prodS2 * ratio);
        console.warn(`[${empresa.id}] Produção limitada pela capacidade.`);
    }

    // 3. Risco de Fornecedor
    if (decisoes.Escolha_Fornecedor_S1_Tela === 'A' && Math.random() < (simulacao.Fornecedor_S1_Tela_A_Risco_Prob / 100 || 0.2)) {
        const perda = Math.floor(prodS1 * (simulacao.Fornecedor_S1_Tela_A_Risco_Perda / 100 || 0.15));
        prodS1 -= perda;
        estadoNovo.Noticia_Producao_Risco_S1 = `Falha Fornecedor S1: Perda de ${perda} unid.`;
    }
    if (decisoes.Escolha_Fornecedor_S2_Tela === 'A' && Math.random() < (simulacao.Fornecedor_S2_Tela_A_Risco_Prob / 100 || 0.2)) {
        const perda = Math.floor(prodS2 * (simulacao.Fornecedor_S2_Tela_A_Risco_Perda / 100 || 0.15));
        prodS2 -= perda;
        estadoNovo.Noticia_Producao_Risco_S2 = `Falha Fornecedor S2: Perda de ${perda} unid.`;
    }

    estadoNovo.Producao_Efetiva_S1 = prodS1;
    estadoNovo.Producao_Efetiva_S2 = prodS2;

    // 4. Custos Variáveis (CVU)
    const inflacaoGlobal = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4;
    const custoMontagemBase = (simulacao.Custo_Variavel_Montagem_Base || 0) * Math.pow(1 + inflacaoGlobal, proximaRodada - 1);
    
    // Redução por Capacitação
    const nivelCap = estadoNovo.Nivel_Capacitacao || 1;
    const redPerc = (simulacao.Reducao_Custo_Montagem_Por_Nivel_Capacitacao_Percent || 0) / 100;
    const custoMontagemReal = custoMontagemBase * (1 - (redPerc * (nivelCap - 1)));

    const calcularCVU = (seg, tela, chip) => {
        const custoTela = (decisoes[`Escolha_Fornecedor_${seg}_Tela`] === 'A') ? (simulacao[`Fornecedor_${seg}_Tela_A_Custo`]||0) : (simulacao[`Fornecedor_${seg}_Tela_B_Custo`]||0);
        const custoChip = (decisoes[`Escolha_Fornecedor_${seg}_Chip`] === 'C') ? (simulacao[`Fornecedor_${seg}_Chip_C_Custo`]||0) : (simulacao[`Fornecedor_${seg}_Chip_D_Custo`]||0);
        return custoMontagemReal + custoTela + custoChip;
    };

    const cvuS1 = calcularCVU('S1');
    const cvuS2 = calcularCVU('S2');

    const cpvTotalProducao = (prodS1 * cvuS1) + (prodS2 * cvuS2);
    estadoNovo.Caixa -= cpvTotalProducao; // Pagamento à vista da produção

    // Atualização de Estoques
    estadoNovo.Estoque_S1_Unidades = (estadoAtual.Estoque_S1_Unidades || 0) + prodS1;
    estadoNovo.Estoque_S2_Unidades = (estadoAtual.Estoque_S2_Unidades || 0) + prodS2;
    
    estadoNovo.Custo_Unitario_S1 = cvuS1;
    estadoNovo.Custo_Unitario_S2 = cvuS2;
}