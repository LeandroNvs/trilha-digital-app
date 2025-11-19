export function processarFluxoCaixaInicial(empresa, simulacao, proximaRodada) {
    const { estadoAtual, decisoes, estadoNovo } = empresa;
    let caixa = estadoNovo.Caixa;
    
    // Taxas
    const taxaJurosCP = (simulacao.Taxa_Juros_Curto_Prazo || 0) / 100;
    const taxaJurosEmergencia = (simulacao.Taxa_Juros_Emergencia || 0) / 100;
    const taxaJurosLP = (simulacao.Taxa_Juros_Longo_Prazo || 0) / 100;
    const prazoFixoLP = simulacao.Prazo_Fixo_Longo_Prazo || 4;

    // 1. Pagamentos Obrigatórios (Emergência, CP, Parcela LP)
    // ... (Lógica de pagamento de dívidas anteriores)
    const dividaEmergAnterior = estadoAtual.Divida_Emergencia || 0;
    if (dividaEmergAnterior > 0) {
        const jurosEmerg = dividaEmergAnterior * taxaJurosEmergencia;
        caixa -= (dividaEmergAnterior + jurosEmerg);
        estadoNovo.Despesas_Juros_Emergencia += jurosEmerg;
    }

    const dividaCPAnterior = estadoAtual.Divida_CP || 0;
    if (dividaCPAnterior > 0) {
        const jurosCP = dividaCPAnterior * taxaJurosCP;
        const pgtoTotal = dividaCPAnterior + jurosCP;

        if (caixa < pgtoTotal) {
            const shortfall = pgtoTotal - caixa;
            estadoNovo.Divida_Emergencia = shortfall;
            estadoNovo.Despesas_Juros_Emergencia += (shortfall * taxaJurosEmergencia); 
            caixa = 0;
            estadoNovo.Despesas_Juros_CP += jurosCP;
        } else {
            caixa -= pgtoTotal;
            estadoNovo.Despesas_Juros_CP += jurosCP;
        }
    }

    let saldoLP = estadoAtual.Divida_LP_Saldo || 0;
    let rodadasLP = estadoAtual.Divida_LP_Rodadas_Restantes || 0;
    if (saldoLP > 0 && rodadasLP > 0) {
        const amortizacao = saldoLP / rodadasLP;
        const juros = saldoLP * taxaJurosLP;
        caixa -= (amortizacao + juros);
        estadoNovo.Despesas_Juros_LP += juros;
        saldoLP -= amortizacao;
        rodadasLP -= 1;
    } else {
        saldoLP = 0; rodadasLP = 0;
    }

    // 2. Novas Decisões Financeiras
    const amortExtra = Math.max(0, Math.min(decisoes.Amortizar_Divida_LP || 0, saldoLP));
    if (amortExtra > 0 && caixa >= amortExtra) {
        caixa -= amortExtra;
        saldoLP -= amortExtra;
        if (saldoLP <= 0) { saldoLP = 0; rodadasLP = 0; }
    }

    const novoCP = decisoes.Tomar_Emprestimo_CP || 0;
    if (novoCP > 0) {
        caixa += novoCP;
        estadoNovo.Divida_CP += novoCP;
    }
    const novoLP = decisoes.Tomar_Financiamento_LP || 0;
    if (novoLP > 0) {
        caixa += novoLP;
        saldoLP += novoLP;
        rodadasLP = prazoFixoLP;
    }

    // 3. Saídas de Caixa (Investimentos)
    const totalPD = (decisoes.Invest_PD_Camera || 0) + (decisoes.Invest_PD_Bateria || 0) + 
                    (decisoes.Invest_PD_Sist_Operacional_e_IA || 0) + (decisoes.Invest_PD_Atualizacao_Geral || 0);
    const invExp = decisoes.Invest_Expansao_Fabrica || 0;
    const totalMkt = (decisoes.Marketing_Segmento_1 || 0) + (decisoes.Marketing_Segmento_2 || 0);
    const totalOrg = (decisoes.Invest_Organiz_Capacitacao || 0) + (decisoes.Invest_Organiz_Mkt_Institucional || 0) + 
                     (decisoes.Invest_Organiz_ESG || 0);

    caixa -= (totalPD + invExp + totalMkt + totalOrg);
    
    // Registra despesas operacionais iniciais
    estadoNovo.Despesas_Operacionais_Outras += (totalPD + totalMkt);
    estadoNovo.Despesas_Organiz_Capacitacao += (decisoes.Invest_Organiz_Capacitacao || 0);
    estadoNovo.Despesas_Organiz_Mkt_Institucional += (decisoes.Invest_Organiz_Mkt_Institucional || 0);
    estadoNovo.Despesas_Organiz_ESG += (decisoes.Invest_Organiz_ESG || 0);
    
    // Atualiza Valor de Marca e Imobilizado
    estadoNovo.Valor_Marca_Acumulado = (estadoAtual.Valor_Marca_Acumulado || 0) + (decisoes.Invest_Organiz_Mkt_Institucional || 0);
    estadoNovo.Imobilizado_Bruto = (estadoAtual.Imobilizado_Bruto || 0) + invExp;

    // Custo Fixo (Inflação)
    const inflacaoRodada = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4;
    const custoFixoBase = (simulacao.Custo_Fixo_Operacional || 0);
    const custoFixo = custoFixoBase * Math.pow(1 + inflacaoRodada, proximaRodada - 1);
    caixa -= custoFixo;
    estadoNovo.Despesas_Operacionais_Outras += custoFixo;

    // Atualiza Estado Financeiro Final
    estadoNovo.Caixa = caixa;
    estadoNovo.Divida_LP_Saldo = saldoLP;
    estadoNovo.Divida_LP_Rodadas_Restantes = rodadasLP;
    estadoNovo.Depreciacao_Acumulada = (estadoAtual.Depreciacao_Acumulada || 0) + ((estadoNovo.Imobilizado_Bruto || 0) * 0.05);
}

export function finalizarDemonstrativos(empresa) {
    const en = empresa.estadoNovo;
    en.Lucro_Bruto = en.Vendas_Receita - en.Custo_Produtos_Vendidos;
    
    const totalDespOp = en.Despesas_Operacionais_Outras + en.Despesas_Organiz_Capacitacao + 
                        en.Despesas_Organiz_Mkt_Institucional + en.Despesas_Organiz_ESG;
    
    en.Lucro_Operacional_EBIT = en.Lucro_Bruto - totalDespOp;
    
    const totalJuros = en.Despesas_Juros_CP + en.Despesas_Juros_Emergencia + en.Despesas_Juros_LP;
    en.Lucro_Liquido = en.Lucro_Operacional_EBIT - totalJuros;
    
    en.Lucro_Acumulado = (empresa.estadoAtual.Lucro_Acumulado || 0) + en.Lucro_Liquido;
}