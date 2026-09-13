import { normalizarValor, aplicarRetornosDecrescentes, higienizarPrecosOutliers, calcularFatorRejeicaoPreco } from '../utils';

export function processarMercado(todasEmpresas, simulacao, proximaRodada) {
    // APLICAÇÃO DO EVENTO: Usa o fatorDemanda calculado no módulo de eventos
    const fatorDemanda = simulacao.fatorDemanda || 1.0;
    
    const demandaS1 = (simulacao[`Segmento1_Demanda_Rodada_${proximaRodada}`] || 0) * fatorDemanda;
    const demandaS2 = (simulacao[`Segmento2_Demanda_Rodada_${proximaRodada}`] || 0) * fatorDemanda;

    // APLICAÇÃO DO EVENTO: Usa o fatorPesoESG
    const fatorPesoESG = simulacao.fatorPesoESG || 1.0;

    // ... (O resto da lógica de normalização permanece igual) ...
    const precosS1 = higienizarPrecosOutliers(todasEmpresas.map(e => e.decisoes.Preco_Segmento_1 || 0));
    const precosS2 = higienizarPrecosOutliers(todasEmpresas.map(e => e.decisoes.Preco_Segmento_2 || 0));
    const mktS1 = todasEmpresas.map(e => e.decisoes.Marketing_Segmento_1 || 0);
    const mktS2 = todasEmpresas.map(e => e.decisoes.Marketing_Segmento_2 || 0);

    const calcMediana = (arr) => {
        const sorted = arr.filter(p => p > 0).sort((a, b) => a - b);
        if (sorted.length === 0) return 0;
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const medianaPrecoS1 = calcMediana(todasEmpresas.map(e => e.decisoes.Preco_Segmento_1 || 0));
    const medianaPrecoS2 = calcMediana(todasEmpresas.map(e => e.decisoes.Preco_Segmento_2 || 0));

    let somaAtrS1 = 0;
    let somaAtrS2 = 0;

    // Cálculo de Atratividade
    todasEmpresas.forEach(empresa => {
        const { estadoNovo, decisoes } = empresa;

        // S1 (Premium)
        const wPDS1 = simulacao[`Peso_PD_Premium_Rodada_${proximaRodada}`] || 0;
        const wMktS1 = simulacao[`Peso_Mkt_Premium_Rodada_${proximaRodada}`] || 0;
        const wPrecoS1 = simulacao[`Peso_Preco_Premium_Rodada_${proximaRodada}`] || 0;
        const wQualS1 = simulacao[`Peso_Qualidade_Premium_Rodada_${proximaRodada}`] || 0;
        // APLICA FATOR ESG NO PESO
        const wESGS1 = (simulacao[`Peso_ESG_Premium_Rodada_${proximaRodada}`] || 0) * fatorPesoESG;

        // ... (Cálculo dos scores permanece igual) ...
        const wCam = simulacao[`Peso_PD_Camera_Premium_Rodada_${proximaRodada}`] || 0;
        const wBat = simulacao[`Peso_PD_Bateria_Premium_Rodada_${proximaRodada}`] || 0;
        const wSO = simulacao[`Peso_PD_Sist_Operacional_e_IA_Premium_Rodada_${proximaRodada}`] || 0;

        const scorePDS1 = (estadoNovo.Nivel_PD_Camera * wCam) + (estadoNovo.Nivel_PD_Bateria * wBat) + (estadoNovo.Nivel_PD_Sist_Operacional_e_IA * wSO);
        const scoreMktS1 = aplicarRetornosDecrescentes(normalizarValor(decisoes.Marketing_Segmento_1, mktS1));
        const scorePrecoS1 = normalizarValor(decisoes.Preco_Segmento_1, precosS1, true);
        
        const atratividadeS1 = (scorePDS1 * wPDS1) + (scoreMktS1 * wMktS1) + (scorePrecoS1 * wPrecoS1) + 
                               (estadoNovo.Nivel_Qualidade * wQualS1) + (estadoNovo.Nivel_ESG * wESGS1);
        
        const fatorRejeicaoS1 = calcularFatorRejeicaoPreco(decisoes.Preco_Segmento_1 || 0, medianaPrecoS1);
        empresa.atratividadeS1 = Math.max(0, atratividadeS1) * fatorRejeicaoS1;
        somaAtrS1 += empresa.atratividadeS1;

        // S2 (Massa)
        const wPDS2 = simulacao[`Peso_PD_Massa_Rodada_${proximaRodada}`] || 0;
        const wMktS2 = simulacao[`Peso_Mkt_Massa_Rodada_${proximaRodada}`] || 0;
        const wPrecoS2 = simulacao[`Peso_Preco_Massa_Rodada_${proximaRodada}`] || 0;
        const wQualS2 = simulacao[`Peso_Qualidade_Massa_Rodada_${proximaRodada}`] || 0;
        // APLICA FATOR ESG NO PESO
        const wESGS2 = (simulacao[`Peso_ESG_Massa_Rodada_${proximaRodada}`] || 0) * fatorPesoESG;

        const scorePDS2 = estadoNovo.Nivel_PD_Atualizacao_Geral;
        const scoreMktS2 = aplicarRetornosDecrescentes(normalizarValor(decisoes.Marketing_Segmento_2, mktS2));
        const scorePrecoS2 = normalizarValor(decisoes.Preco_Segmento_2, precosS2, true);

        const atratividadeS2 = (scorePDS2 * wPDS2) + (scoreMktS2 * wMktS2) + (scorePrecoS2 * wPrecoS2) +
                               (estadoNovo.Nivel_Qualidade * wQualS2) + (estadoNovo.Nivel_ESG * wESGS2);
        
        const fatorRejeicaoS2 = calcularFatorRejeicaoPreco(decisoes.Preco_Segmento_2 || 0, medianaPrecoS2);
        empresa.atratividadeS2 = Math.max(0, atratividadeS2) * fatorRejeicaoS2;
        somaAtrS2 += empresa.atratividadeS2;
    });

    // Distribuição de Vendas
    let totalVendasSetor = 0;
    let totalVendasReaisS1 = 0;
    let totalVendasReaisS2 = 0;

    todasEmpresas.forEach(empresa => {
        const { estadoNovo, decisoes } = empresa;

        // Vendas S1
        const shareS1 = somaAtrS1 > 0 ? (empresa.atratividadeS1 / somaAtrS1) : (1 / todasEmpresas.length);
        const demandaS1Empresa = Math.floor(demandaS1 * shareS1);
        
        // ... (Lógica de estoque e receita permanece igual) ...
        const vendasS1 = Math.min(demandaS1Empresa, estadoNovo.Estoque_S1_Unidades);
        if (demandaS1Empresa > estadoNovo.Estoque_S1_Unidades) {
            estadoNovo.Noticia_Ruptura_Estoque_S1 = `Ruptura S1: Demandou ${demandaS1Empresa}, vendeu ${vendasS1}.`;
        }
        estadoNovo.Vendas_Efetivas_Premium = vendasS1;
        estadoNovo.Share_Demanda_Premium = shareS1;

        // Vendas S2
        const shareS2 = somaAtrS2 > 0 ? (empresa.atratividadeS2 / somaAtrS2) : (1 / todasEmpresas.length);
        const demandaS2Empresa = Math.floor(demandaS2 * shareS2);
        const vendasS2 = Math.min(demandaS2Empresa, estadoNovo.Estoque_S2_Unidades);
        if (demandaS2Empresa > estadoNovo.Estoque_S2_Unidades) {
            estadoNovo.Noticia_Ruptura_Estoque_S2 = `Ruptura S2: Demandou ${demandaS2Empresa}, vendeu ${vendasS2}.`;
        }
        estadoNovo.Vendas_Efetivas_Massa = vendasS2;
        estadoNovo.Share_Demanda_Massa = shareS2;

        totalVendasSetor += (vendasS1 + vendasS2);
        totalVendasReaisS1 += vendasS1;
        totalVendasReaisS2 += vendasS2;

        const receita = (vendasS1 * (decisoes.Preco_Segmento_1 || 0)) + (vendasS2 * (decisoes.Preco_Segmento_2 || 0));
        estadoNovo.Vendas_Receita = receita;
        estadoNovo.Caixa += receita;

        estadoNovo.Estoque_S1_Unidades -= vendasS1;
        estadoNovo.Custo_Estoque_S1 = estadoNovo.Estoque_S1_Unidades * estadoNovo.Custo_Unitario_S1;
        estadoNovo.Estoque_S2_Unidades -= vendasS2;
        estadoNovo.Custo_Estoque_S2 = estadoNovo.Estoque_S2_Unidades * estadoNovo.Custo_Unitario_S2;

        estadoNovo.Custo_Produtos_Vendidos = (vendasS1 * estadoNovo.Custo_Unitario_S1) + (vendasS2 * estadoNovo.Custo_Unitario_S2);
    });

    // Calcula o Market Share Real (Vendas Efetivas)
    todasEmpresas.forEach(empresa => {
        empresa.estadoNovo.Market_Share_Premium = totalVendasReaisS1 > 0 ? (empresa.estadoNovo.Vendas_Efetivas_Premium / totalVendasReaisS1) : 0;
        empresa.estadoNovo.Market_Share_Massa = totalVendasReaisS2 > 0 ? (empresa.estadoNovo.Vendas_Efetivas_Massa / totalVendasReaisS2) : 0;
    });

    return totalVendasSetor;
}