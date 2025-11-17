// MUDANÇA: db e appId não são mais importados daqui, serão recebidos como parâmetros.
import { collection, collectionGroup, doc, getDocs, getDoc, writeBatch, query, where, updateDoc } from 'firebase/firestore';

// --- Funções Auxiliares para Cálculo de Atratividade (RF 3.4) ---

function normalizarValor(valor, todosValores, inverter = false) {
    // ... (código inalterado)
    const min = Math.min(...todosValores);
    const max = Math.max(...todosValores);
    if (min === max) { return 1.0; }
    const divisor = (max - min) === 0 ? 1 : (max - min);
    const nota = (valor - min) / divisor;
    return inverter ? (1 - nota) : nota;
}

function aplicarRetornosDecrescentes(notaNormalizada) {
    // ... (código inalterado)
    return Math.sqrt(Math.max(0, notaNormalizada));
}

function higienizarPrecosOutliers(precos, multiplicadorCap = 5) {
    // ... (código inalterado)
    const precosValidos = precos.filter(p => p > 0 && isFinite(p));
    if (precosValidos.length === 0) {
        return precos.map(() => 1); 
    }
    precosValidos.sort((a, b) => a - b);
    const mid = Math.floor(precosValidos.length / 2);
    const mediana = precosValidos.length % 2 !== 0 
        ? precosValidos[mid] 
        : (precosValidos[mid - 1] + precosValidos[mid]) / 2;
    const tetoSanidadeBase = mediana * multiplicadorCap;
    const tetoSanidade = Math.max(tetoSanidadeBase, precosValidos[precosValidos.length - 1]);
    return precos.map(p => {
        if (!isFinite(p) || p === 0) return Infinity;
        if (p > tetoSanidade) return tetoSanidade;
        return p;
    });
}
// --- FIM Funções Auxiliares ---


/**
 * Função principal que processa uma rodada da simulação.
 * MUDANÇA: Recebe 'db' e 'appId' como parâmetros para injeção de dependência.
 * @param {string} simulacaoId - O ID da simulação a ser processada.
 * @param {object} simulacao - O objeto de dados da simulação (parâmetros).
 * @param {object} db - A instância do Firestore (vinda do client ou admin-sdk).
 * @param {string} appId - O ID do app.
 */
export async function processarRodada(simulacaoId, simulacao, db, appId) {
    console.log(`--- [M3] INICIANDO PROCESSAMENTO DA RODADA ${simulacao.Rodada_Atual} PARA: ${simulacao.Nome_Simulacao} ---`);

    const rodadaAtual = simulacao.Rodada_Atual;
    const proximaRodada = rodadaAtual + 1;
    const simulacoesCollectionPath = `/artifacts/${appId}/public/data/simulacoes`;
    // MUDANÇA: Passa 'db'
    const empresasRef = collection(db, simulacoesCollectionPath, simulacaoId, 'empresas');
    const empresasSnapshot = await getDocs(empresasRef);
    const empresasIds = empresasSnapshot.docs.map(d => d.id);

    let dadosProcessamento = [];

    // --- PRÉ-FASE: Carregar todos os dados ---
    console.log(`[M3][PRE] Carregando dados de ${empresasIds.length} empresas para processar R${proximaRodada}...`);
    for (const empresaId of empresasIds) {
        // MUDANÇA: Passa 'db'
        const estadoAtualRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresaId, 'estados', rodadaAtual.toString());
        const estadoAtualSnap = await getDoc(estadoAtualRef);
        
        // MUDANÇA: Passa 'db'
        const decisaoRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresaId, 'decisoes', proximaRodada.toString());
        const decisaoSnap = await getDoc(decisaoRef);

        if (!estadoAtualSnap.exists()) {
            throw new Error(`[ERRO] Empresa ${empresaId}: Estado da Rodada ${rodadaAtual} não encontrado.`);
        }
        if (!decisaoSnap.exists() || decisaoSnap.data().Status_Decisao !== 'Submetido') {
            throw new Error(`[ERRO] Empresa ${empresaId}: Decisões da Rodada ${proximaRodada} não encontradas ou não submetidas.`);
        }

        dadosProcessamento.push({
            id: empresaId,
            estadoAtual: estadoAtualSnap.data(),
            decisoes: decisaoSnap.data(),
            estadoNovo: {
                Rodada: proximaRodada,
                Despesas_Juros_CP: 0, Despesas_Juros_Emergencia: 0, Despesas_Juros_LP: 0,
                // MUDANÇA: Adicionado Despesas Organizacionais
                Despesas_Operacionais_Outras: 0, // Custo Fixo, P&D, Mkt Produto
                Despesas_Organiz_Capacitacao: 0, Despesas_Organiz_Mkt_Institucional: 0, Despesas_Organiz_ESG: 0,
                Vendas_Receita: 0, Custo_Produtos_Vendidos: 0,
                Lucro_Bruto: 0, Lucro_Operacional_EBIT: 0, Lucro_Liquido: 0,
                Caixa: estadoAtualSnap.data().Caixa || 0,
                Divida_CP: 0, Divida_Emergencia: 0,
                Divida_LP_Saldo: estadoAtualSnap.data().Divida_LP_Saldo || 0,
                Divida_LP_Rodadas_Restantes: estadoAtualSnap.data().Divida_LP_Rodadas_Restantes || 0,
                // MUDANÇA: Estoque segmentado
                Estoque_S1_Unidades: estadoAtualSnap.data().Estoque_S1_Unidades || 0,
                Custo_Estoque_S1: estadoAtualSnap.data().Custo_Estoque_S1 || 0,
                Estoque_S2_Unidades: estadoAtualSnap.data().Estoque_S2_Unidades || 0,
                Custo_Estoque_S2: estadoAtualSnap.data().Custo_Estoque_S2 || 0,
                Custo_Unitario_S1: 0, // Custo de produção da rodada
                Custo_Unitario_S2: 0, // Custo de produção da rodada
            }
        });
    }
    console.log("[M3][PRE] Dados carregados.");

    const taxaJurosCP = (simulacao.Taxa_Juros_Curto_Prazo || 0) / 100;
    const taxaJurosEmergencia = (simulacao.Taxa_Juros_Emergencia || 0) / 100;
    const taxaJurosLP = (simulacao.Taxa_Juros_Longo_Prazo || 0) / 100;
    const prazoFixoLP = simulacao.Prazo_Fixo_Longo_Prazo || 4;
    console.log(`[M3] Taxas p/ Rodada: CP=${(taxaJurosCP*100).toFixed(1)}%, Emerg=${(taxaJurosEmergencia*100).toFixed(1)}%, LP=${(taxaJurosLP*100).toFixed(1)}%. Prazo LP=${prazoFixoLP} rodadas.`);


    // --- RF 3.2: Fase 1 - Atualizações Financeiras (Dívidas, Juros) e Investimentos (CAPEX, P&D, Org) ---
    console.log("[M3][F1] Iniciando Fase 1: Finanças (Dívidas, Juros) e Investimentos (CAPEX, P&D, Org)");

    dadosProcessamento.forEach(empresa => {
        const { estadoAtual, decisoes, estadoNovo } = empresa;
        let caixa = estadoNovo.Caixa;
        let logFinanceiro = [`[${empresa.id}] R${proximaRodada}`];

        // --- 1. PAGAMENTOS OBRIGATÓRIOS (Dívidas R-1) ---
        // ... (lógica de pagamento de dívidas CP, LP, Emergência inalterada) ...
        logFinanceiro.push(`Caixa Inicial: ${caixa.toLocaleString('pt-BR')}`);
        const dividaEmergAnterior = estadoAtual.Divida_Emergencia || 0;
        if (dividaEmergAnterior > 0) {
            const jurosEmerg = dividaEmergAnterior * taxaJurosEmergencia;
            const pagamentoEmergTotal = dividaEmergAnterior + jurosEmerg;
            caixa -= pagamentoEmergTotal;
            estadoNovo.Despesas_Juros_Emergencia += jurosEmerg;
            logFinanceiro.push(`Pagou Emerg R${rodadaAtual}: ${pagamentoEmergTotal.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        }
        const dividaCPAnterior = estadoAtual.Divida_CP || 0;
        if (dividaCPAnterior > 0) {
            const jurosCP = dividaCPAnterior * taxaJurosCP;
            const pagamentoCPTotal = dividaCPAnterior + jurosCP;
            if (caixa < pagamentoCPTotal) {
                const shortfall = pagamentoCPTotal - caixa;
                estadoNovo.Divida_Emergencia = shortfall;
                caixa = 0;
                estadoNovo.Despesas_Juros_CP += jurosCP;
                estadoNovo.Despesas_Juros_Emergencia += (shortfall * taxaJurosEmergencia);
                logFinanceiro.push(`!!! EMERGÊNCIA !!! Não pagou CP R${rodadaAtual} (${pagamentoCPTotal.toLocaleString('pt-BR')}). Nova Emerg R${proximaRodada}: ${shortfall.toLocaleString('pt-BR')}.`);
            } else {
                caixa -= pagamentoCPTotal;
                estadoNovo.Despesas_Juros_CP += jurosCP;
                logFinanceiro.push(`Pagou CP R${rodadaAtual}: ${pagamentoCPTotal.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
            }
        }
        let saldoLPAtual = estadoAtual.Divida_LP_Saldo || 0;
        let rodadasLPRestantes = estadoAtual.Divida_LP_Rodadas_Restantes || 0;
        if (saldoLPAtual > 0 && rodadasLPRestantes > 0) {
            const amortizacaoLPObrigatoria = saldoLPAtual / rodadasLPRestantes;
            const jurosLP = saldoLPAtual * taxaJurosLP;
            const parcelaLP = amortizacaoLPObrigatoria + jurosLP;
            if (caixa < parcelaLP) {
                 console.warn(`[${empresa.id}] R${proximaRodada}: Caixa ${caixa} insuficiente para Parcela LP ${parcelaLP}. Caixa ficará negativo.`);
                 logFinanceiro.push(`!!! ATENÇÃO !!! Caixa insuficiente para Parcela LP (${parcelaLP.toLocaleString('pt-BR')}).`);
            }
            caixa -= parcelaLP;
            estadoNovo.Despesas_Juros_LP += jurosLP;
            saldoLPAtual -= amortizacaoLPObrigatoria;
            rodadasLPRestantes -= 1;
            logFinanceiro.push(`Pagou Parcela LP: ${parcelaLP.toLocaleString('pt-BR')}. Saldo LP: ${saldoLPAtual.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        } else {
             saldoLPAtual = 0;
             rodadasLPRestantes = 0;
        }

        // --- 2. ENTRADAS E SAÍDAS DECIDIDAS NA RODADA (R) ---
        // ... (lógica de amortização adicional e novos empréstimos inalterada) ...
        const amortizarLPAdicional = Math.max(0, Math.min(decisoes.Amortizar_Divida_LP || 0, saldoLPAtual));
        if (amortizarLPAdicional > 0) {
              if (caixa < amortizarLPAdicional) {
                   logFinanceiro.push(`!!! CANCELADO !!! Amortização LP Adicional (${amortizarLPAdicional.toLocaleString('pt-BR')}) por falta de caixa.`);
              } else {
                   caixa -= amortizarLPAdicional;
                   saldoLPAtual -= amortizarLPAdicional;
                   logFinanceiro.push(`Amortizou LP Adicional: ${amortizarLPAdicional.toLocaleString('pt-BR')}. Saldo LP: ${saldoLPAtual.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
                   if (saldoLPAtual <= 0) { saldoLPAtual = 0; rodadasLPRestantes = 0; logFinanceiro.push(`Dívida LP Quitada.`); }
              }
        }
        const novoCP = decisoes.Tomar_Emprestimo_CP || 0;
        if (novoCP > 0) {
            caixa += novoCP;
            estadoNovo.Divida_CP += novoCP;
            logFinanceiro.push(`Tomou CP: ${novoCP.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        }
        const novoLP = decisoes.Tomar_Financiamento_LP || 0;
        if (novoLP > 0) {
            caixa += novoLP;
            saldoLPAtual += novoLP;
            rodadasLPRestantes = prazoFixoLP;
            logFinanceiro.push(`Tomou LP: ${novoLP.toLocaleString('pt-BR')}. Novo Saldo LP: ${saldoLPAtual.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        }

        // c) Investimentos (P&D, Expansão, Marketing)
        // MUDANÇA: Coleta todos os 4 P&Ds
        let investCamera = decisoes.Invest_PD_Camera || 0;
        let investBateria = decisoes.Invest_PD_Bateria || 0;
        let investSOeIA = decisoes.Invest_PD_Sist_Operacional_e_IA || 0;
        let investAtualGeral = decisoes.Invest_PD_Atualizacao_Geral || 0;
        const totalInvestPD = investCamera + investBateria + investSOeIA + investAtualGeral;
        caixa -= totalInvestPD;
        estadoNovo.Despesas_Operacionais_Outras += totalInvestPD;
        logFinanceiro.push(`Investiu P&D: ${totalInvestPD.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);

        const investExpansao = decisoes.Invest_Expansao_Fabrica || 0;
        caixa -= investExpansao;
        estadoNovo.Imobilizado_Bruto = (estadoAtual.Imobilizado_Bruto || 0) + investExpansao;
        logFinanceiro.push(`Investiu Expansão: ${investExpansao.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        estadoNovo.Capacidade_Fabrica = (estadoAtual.Capacidade_Fabrica || 0) +
            Math.floor(investExpansao / (simulacao.Custo_Expansao_Lote || 1)) * (simulacao.Incremento_Capacidade_Lote || 0);

        const totalInvestMkt = (decisoes.Marketing_Segmento_1 || 0) + (decisoes.Marketing_Segmento_2 || 0);
        caixa -= totalInvestMkt;
        estadoNovo.Despesas_Operacionais_Outras += totalInvestMkt;
        logFinanceiro.push(`Investiu Mkt Produto: ${totalInvestMkt.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        
        // MUDANÇA: Investimentos Organizacionais
        const investCapacitacao = decisoes.Invest_Organiz_Capacitacao || 0;
        const investMktInstitucional = decisoes.Invest_Organiz_Mkt_Institucional || 0;
        const investESG = decisoes.Invest_Organiz_ESG || 0;
        const totalInvestOrg = investCapacitacao + investMktInstitucional + investESG;
        caixa -= totalInvestOrg;
        // Adiciona aos campos de despesa corretos
        estadoNovo.Despesas_Organiz_Capacitacao += investCapacitacao;
        estadoNovo.Despesas_Organiz_Mkt_Institucional += investMktInstitucional;
        estadoNovo.Despesas_Organiz_ESG += investESG;
        // Acumula valor da marca (agora baseado no Mkt Institucional)
        estadoNovo.Valor_Marca_Acumulado = (estadoAtual.Valor_Marca_Acumulado || 0) + investMktInstitucional;
        logFinanceiro.push(`Investiu Org: ${totalInvestOrg.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);

        // d) Custo Fixo Operacional
        const taxaInflacaoRodada = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4;
        const custoFixoBase = (simulacao.Custo_Fixo_Operacional || 0);
        const custoFixoCorrigido = custoFixoBase * Math.pow(1 + taxaInflacaoRodada, proximaRodada -1);
        caixa -= custoFixoCorrigido;
        estadoNovo.Despesas_Operacionais_Outras += custoFixoCorrigido;
        logFinanceiro.push(`Custo Fixo: ${custoFixoCorrigido.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);

        // --- 3. ATUALIZA ESTADO FINANCEIRO FINAL (Antes da Produção/Vendas) ---
        estadoNovo.Caixa = caixa;
        estadoNovo.Divida_LP_Saldo = saldoLPAtual;
        estadoNovo.Divida_LP_Rodadas_Restantes = rodadasLPRestantes;
        estadoNovo.Depreciacao_Acumulada = (estadoAtual.Depreciacao_Acumulada || 0) + ((estadoNovo.Imobilizado_Bruto || 0) * 0.05);


        // --- 4. ATUALIZA PROGRESSO P&D (PRODUTO E ORG) ---
        // Bônus do Fornecedor D (para S1 e S2, se escolhidos)
        let fatorBonusPDS1 = 1.0;
        if (decisoes.Escolha_Fornecedor_S1_Chip === 'D') {
            fatorBonusPDS1 = 1 + (simulacao.Fornecedor_S1_Chip_D_Bonus_PD_Percent || 0) / 100;
        }
        let fatorBonusPDS2 = 1.0;
        if (decisoes.Escolha_Fornecedor_S2_Chip === 'D') {
            fatorBonusPDS2 = 1 + (simulacao.Fornecedor_S2_Chip_D_Bonus_PD_Percent || 0) / 100;
        }
        
        // MUDANÇA: Bônus se aplica em P&D de Bateria e IA (afetados por S1 e S2)
        // Usamos a *média* dos bônus se as escolhas forem diferentes (simplificação)
        const fatorBonusMedio = (fatorBonusPDS1 + fatorBonusPDS2) / 2;
        if(fatorBonusMedio > 1.0) {
             logFinanceiro.push(`Bônus P&D (Bateria/IA): ${(fatorBonusMedio*100-100).toFixed(0)}%`);
        }

        const investCameraEfetivo = investCamera; // Câmera não tem bônus
        const investBateriaEfetivo = investBateria * fatorBonusMedio;
        const investSOeIAEfetivo = investSOeIA * fatorBonusMedio;
        const investAtualGeralEfetivo = investAtualGeral; // Básico não tem bônus

        const calcularNivel = (area, progressoAtual, investimentoEfetivo, nivelAtualKey, progressoKey) => {
            const progressoTotal = (progressoAtual || 0) + investimentoEfetivo;
            let nivelAtual = estadoAtual[nivelAtualKey] || 1;
            let novoNivel = nivelAtual;
            const custosNivel = [0, 0];
            for(let n=2; n<=5; n++) {
                custosNivel[n] = simulacao[`Custo_PD_${area}_Nivel_${n}`] || simulacao[`Custo_Nivel_${area}_Nivel_${n}`] || Infinity;
            }
            for (let proximo = nivelAtual + 1; proximo <= 5; proximo++) {
                if (progressoTotal >= custosNivel[proximo]) {
                    novoNivel = proximo;
                } else {
                    break;
                }
            }
            if (novoNivel > nivelAtual) {
                 logFinanceiro.push(`P&D ${area}: Nível ${nivelAtual} -> ${novoNivel}!`);
            }
            return { nivel: novoNivel, progresso: progressoTotal };
        };

        // P&D Produto
        const { nivel: nCam, progresso: pCam } = calcularNivel('Camera', estadoAtual.Progresso_PD_Camera, investCameraEfetivo, 'Nivel_PD_Camera');
        const { nivel: nBat, progresso: pBat } = calcularNivel('Bateria', estadoAtual.Progresso_PD_Bateria, investBateriaEfetivo, 'Nivel_PD_Bateria');
        const { nivel: nIA, progresso: pIA } = calcularNivel('Sist_Operacional_e_IA', estadoAtual.Progresso_PD_Sist_Operacional_e_IA, investSOeIAEfetivo, 'Nivel_PD_Sist_Operacional_e_IA');
        const { nivel: nAG, progresso: pAG } = calcularNivel('Atualizacao_Geral', estadoAtual.Progresso_PD_Atualizacao_Geral, investAtualGeralEfetivo, 'Nivel_PD_Atualizacao_Geral');
        estadoNovo.Nivel_PD_Camera = nCam; estadoNovo.Progresso_PD_Camera = pCam;
        estadoNovo.Nivel_PD_Bateria = nBat; estadoNovo.Progresso_PD_Bateria = pBat;
        estadoNovo.Nivel_PD_Sist_Operacional_e_IA = nIA; estadoNovo.Progresso_PD_Sist_Operacional_e_IA = pIA;
        estadoNovo.Nivel_PD_Atualizacao_Geral = nAG; estadoNovo.Progresso_PD_Atualizacao_Geral = pAG;

        // P&D Organizacional
        const { nivel: nCap, progresso: pCap } = calcularNivel('Capacitacao', estadoAtual.Progresso_Capacitacao, investCapacitacao, 'Nivel_Capacitacao');
        const { nivel: nQual, progresso: pQual } = calcularNivel('Qualidade', estadoAtual.Progresso_Qualidade, investMktInstitucional, 'Nivel_Qualidade'); // Mkt Inst. vira Nivel Qualidade
        const { nivel: nESG, progresso: pESG } = calcularNivel('ESG', estadoAtual.Progresso_ESG, investESG, 'Nivel_ESG');
        estadoNovo.Nivel_Capacitacao = nCap; estadoNovo.Progresso_Capacitacao = pCap;
        estadoNovo.Nivel_Qualidade = nQual; estadoNovo.Progresso_Qualidade = pQual;
        estadoNovo.Nivel_ESG = nESG; estadoNovo.Progresso_ESG = pESG;

        console.log(logFinanceiro.join(' | '));

    }); // Fim do loop forEach empresa para Fase 1

    // --- MUDANÇA: Fator de Redução de Custo por Capacitação ---
    // (Calculado uma vez, pois é o mesmo para todos)
    const taxaInflacaoRodada = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4;
    const custoVariavelMontagemBase = (simulacao.Custo_Variavel_Montagem_Base || 0);
    // Aplica inflação ao custo de montagem
    const custoVariavelMontagemInflacionado = custoVariavelMontagemBase * Math.pow(1 + taxaInflacaoRodada, proximaRodada - 1);


    // --- RF 3.3: Fase 2 - Produção e Risco de Rede (Operações) ---
    console.log("[M3][F2] Iniciando Fase 2: Produção, Risco de Rede e CPV");
    dadosProcessamento.forEach(empresa => {
        const { estadoAtual, decisoes, estadoNovo } = empresa;
        
        // MUDANÇA: Produção segmentada
        let pNumS1 = decisoes.Producao_Planejada_S1 || 0;
        let pNumS2 = decisoes.Producao_Planejada_S2 || 0;
        let pNumTotal = pNumS1 + pNumS2;
        let noticiaRiscoS1 = null; let noticiaRiscoS2 = null;
        
        const capacidadeAtualNaRodada = estadoAtual.Capacidade_Fabrica || 0;

        // MUDANÇA: Valida produção total vs capacidade
        if (pNumTotal > capacidadeAtualNaRodada) {
            const fatorExcesso = capacidadeAtualNaRodada / pNumTotal;
            pNumS1 = Math.floor(pNumS1 * fatorExcesso);
            pNumS2 = Math.floor(pNumS2 * fatorExcesso);
            pNumTotal = pNumS1 + pNumS2; // Recalcula total
            const noticiaRupturaCapacidade = `Produção planejada total (${(decisoes.Producao_Planejada_S1 + decisoes.Producao_Planejada_S2).toLocaleString('pt-BR')}) excedeu a capacidade atual (${capacidadeAtualNaRodada.toLocaleString('pt-BR')}). Produção limitada para ${pNumTotal.toLocaleString('pt-BR')} unid.`;
            console.warn(`[${empresa.id}] R${proximaRodada}: ${noticiaRupturaCapacidade}`);
            // (Poderia salvar esta notícia no estadoNovo se quisesse)
        }

        // MUDANÇA: Simulação de Risco (S1)
        const riscoFornecedorS1 = simulacao.Fornecedor_S1_Tela_A_Risco_Prob / 100 || 0.20;
        const perdaFornecedorS1 = simulacao.Fornecedor_S1_Tela_A_Risco_Perda / 100 || 0.15;
        if (decisoes.Escolha_Fornecedor_S1_Tela === 'A' && Math.random() < riscoFornecedorS1) {
            const perda = Math.floor(pNumS1 * perdaFornecedorS1);
            pNumS1 -= perda;
            noticiaRiscoS1 = `Fornecedor de Telas S1 (A) falhou, perda de ${perda.toLocaleString('pt-BR')} unid. S1.`;
            console.log(`[${empresa.id}] R${proximaRodada}: ${noticiaRiscoS1}`);
        }
        
        // MUDANÇA: Simulação de Risco (S2)
        const riscoFornecedorS2 = simulacao.Fornecedor_S2_Tela_A_Risco_Prob / 100 || 0.20;
        const perdaFornecedorS2 = simulacao.Fornecedor_S2_Tela_A_Risco_Perda / 100 || 0.15;
        if (decisoes.Escolha_Fornecedor_S2_Tela === 'A' && Math.random() < riscoFornecedorS2) {
            const perda = Math.floor(pNumS2 * perdaFornecedorS2);
            pNumS2 -= perda;
            noticiaRiscoS2 = `Fornecedor de Telas S2 (A) falhou, perda de ${perda.toLocaleString('pt-BR')} unid. S2.`;
            console.log(`[${empresa.id}] R${proximaRodada}: ${noticiaRiscoS2}`);
        }

        estadoNovo.Noticia_Producao_Risco_S1 = noticiaRiscoS1;
        estadoNovo.Noticia_Producao_Risco_S2 = noticiaRiscoS2;
        estadoNovo.Producao_Efetiva_S1 = pNumS1;
        estadoNovo.Producao_Efetiva_S2 = pNumS2;

        // MUDANÇA: Cálculo de Custo de Produção (CPV)
        
        // Custo Montagem Corrigido (Inflação + Nível Capacitação)
        const nivelCapacitacao = estadoNovo.Nivel_Capacitacao || 1; // Nível atingido na Fase 1
        const reducaoPercent = (simulacao.Reducao_Custo_Montagem_Por_Nivel_Capacitacao_Percent || 0) / 100;
        const fatorReducaoCapacitacao = 1 - (reducaoPercent * (nivelCapacitacao - 1)); // Ex: Nível 3, 2% -> 1 - (0.02 * 2) = 0.96
        const custoVariavelMontagemCorrigido = custoVariavelMontagemInflacionado * fatorReducaoCapacitacao;

        // Custo S1
        const custoTelaS1 = (decisoes.Escolha_Fornecedor_S1_Tela === 'A') ? (simulacao.Fornecedor_S1_Tela_A_Custo || 0) : (simulacao.Fornecedor_S1_Tela_B_Custo || 0);
        const custoChipS1 = (decisoes.Escolha_Fornecedor_S1_Chip === 'C') ? (simulacao.Fornecedor_S1_Chip_C_Custo || 0) : (simulacao.Fornecedor_S1_Chip_D_Custo || 0);
        const cvuS1 = custoVariavelMontagemCorrigido + custoTelaS1 + custoChipS1;
        const cpvTotalS1 = pNumS1 * cvuS1;

        // Custo S2
        const custoTelaS2 = (decisoes.Escolha_Fornecedor_S2_Tela === 'A') ? (simulacao.Fornecedor_S2_Tela_A_Custo || 0) : (simulacao.Fornecedor_S2_Tela_B_Custo || 0);
        const custoChipS2 = (decisoes.Escolha_Fornecedor_S2_Chip === 'C') ? (simulacao.Fornecedor_S2_Chip_C_Custo || 0) : (simulacao.Fornecedor_S2_Chip_D_Custo || 0);
        const cvuS2 = custoVariavelMontagemCorrigido + custoTelaS2 + custoChipS2;
        const cpvTotalS2 = pNumS2 * cvuS2;
        
        const cpvTotalProducao = cpvTotalS1 + cpvTotalS2;

        // Subtrai CPV do Caixa
        estadoNovo.Caixa -= cpvTotalProducao;
        console.log(`[${empresa.id}] R${proximaRodada}: Produziu S1: ${pNumS1} (CVU: ${cvuS1.toFixed(2)}), S2: ${pNumS2} (CVU: ${cvuS2.toFixed(2)}). CPV Total: ${cpvTotalProducao.toLocaleString('pt-BR')}. Caixa: ${estadoNovo.Caixa.toLocaleString('pt-BR')}`);

        // Atualiza Estoque (separadamente)
        estadoNovo.Estoque_S1_Unidades = (estadoAtual.Estoque_S1_Unidades || 0) + pNumS1;
        estadoNovo.Estoque_S2_Unidades = (estadoAtual.Estoque_S2_Unidades || 0) + pNumS2;
        estadoNovo.Custo_Unitario_S1 = cvuS1; // Salva o custo de produção desta rodada
        estadoNovo.Custo_Unitario_S2 = cvuS2;
    });

    // --- RF 3.4: Fase 3 - Simulação de Mercado ---
    console.log("[M3][F3] Iniciando Fase 3: Simulação de Mercado");
    
    // MUDANÇA: Pega todos os pesos (P&D, Mkt, Preço, Qualidade, ESG)
    const demandaPremium = simulacao[`Segmento1_Demanda_Rodada_${proximaRodada}`] || 0;
    const demandaMassa = simulacao[`Segmento2_Demanda_Rodada_${proximaRodada}`] || 0;
    // Pesos S1 (Premium)
    const pesoPDPremium = simulacao[`Peso_PD_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoMktPremium = simulacao[`Peso_Mkt_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoPrecoPremium = simulacao[`Peso_Preco_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoQualidadePremium = simulacao[`Peso_Qualidade_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoESGPremium = simulacao[`Peso_ESG_Premium_Rodada_${proximaRodada}`] || 0;
    // Pesos P&D (Dentro do Premium)
    const pesoPDCameraPremium = simulacao[`Peso_PD_Camera_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoPDBateriaPremium = simulacao[`Peso_PD_Bateria_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoPDSOeIAPremium = simulacao[`Peso_PD_Sist_Operacional_e_IA_Premium_Rodada_${proximaRodada}`] || 0;
    // Pesos S2 (Básico/Massa)
    const pesoPDBasico = simulacao[`Peso_PD_Massa_Rodada_${proximaRodada}`] || 0;
    const pesoMktMassa = simulacao[`Peso_Mkt_Massa_Rodada_${proximaRodada}`] || 0;
    const pesoPrecoMassa = simulacao[`Peso_Preco_Massa_Rodada_${proximaRodada}`] || 0;
    const pesoQualidadeMassa = simulacao[`Peso_Qualidade_Massa_Rodada_${proximaRodada}`] || 0;
    const pesoESGMassa = simulacao[`Peso_ESG_Massa_Rodada_${proximaRodada}`] || 0;

    const precosBrutosPremium = dadosProcessamento.map(e => e.decisoes.Preco_Segmento_1 || 0);
    const precosBrutosMassa = dadosProcessamento.map(e => e.decisoes.Preco_Segmento_2 || 0);
    const multiplicadorCap = 5.0; 
    const precosHigienizadosPremium = higienizarPrecosOutliers(precosBrutosPremium, multiplicadorCap);
    const precosHigienizadosMassa = higienizarPrecosOutliers(precosBrutosMassa, multiplicadorCap);
    const mktPremium = dadosProcessamento.map(e => e.decisoes.Marketing_Segmento_1 || 0);
    const mktMassa = dadosProcessamento.map(e => e.decisoes.Marketing_Segmento_2 || 0);
    
    let somaAtratividadePremium = 0; let somaAtratividadeMassa = 0;

    dadosProcessamento.forEach(empresa => {
        const { estadoNovo, decisoes } = empresa;
        
        // --- Cálculo Atratividade Premium (S1) ---
        // P&D (Premium)
        const nPD_Cam = (estadoNovo.Nivel_PD_Camera || 1) * pesoPDCameraPremium;
        const nPD_Bat = (estadoNovo.Nivel_PD_Bateria || 1) * pesoPDBateriaPremium;
        const nPD_IA = (estadoNovo.Nivel_PD_Sist_Operacional_e_IA || 1) * pesoPDSOeIAPremium;
        const nPDTotalPremium = nPD_Cam + nPD_Bat + nPD_IA;
        // Org
        const nQualidade = (estadoNovo.Nivel_Qualidade || 1);
        const nESG = (estadoNovo.Nivel_ESG || 1);
        // Mkt e Preço
        const nMktPrem = aplicarRetornosDecrescentes(normalizarValor(decisoes.Marketing_Segmento_1 || 0, mktPremium));
        const nPrecoPrem = normalizarValor(decisoes.Preco_Segmento_1 || Infinity, precosHigienizadosPremium, true); 
        // Fórmula Total S1
        const atrPrem = (nPDTotalPremium * pesoPDPremium) + 
                        (nMktPrem * pesoMktPremium) + 
                        (nPrecoPrem * pesoPrecoPremium) +
                        (nQualidade * pesoQualidadePremium) + // NOVO
                        (nESG * pesoESGPremium); // NOVO
        empresa.estadoNovo.Atratividade_Premium = atrPrem > 0 ? atrPrem : 0;
        somaAtratividadePremium += empresa.estadoNovo.Atratividade_Premium;

        // --- Cálculo Atratividade Massa (S2) ---
        // P&D (Básico)
        const nPDBasico = (estadoNovo.Nivel_PD_Atualizacao_Geral || 1);
        // Mkt e Preço
        const nMktMassa = aplicarRetornosDecrescentes(normalizarValor(decisoes.Marketing_Segmento_2 || 0, mktMassa));
        const nPrecoMassa = normalizarValor(decisoes.Preco_Segmento_2 || Infinity, precosHigienizadosMassa, true);
        // Fórmula Total S2
        const atrMassa = (nPDBasico * pesoPDBasico) + // NOVO
                         (nMktMassa * pesoMktMassa) + 
                         (nPrecoMassa * pesoPrecoMassa) +
                         (nQualidade * pesoQualidadeMassa) + // NOVO
                         (nESG * pesoESGMassa); // NOVO
        empresa.estadoNovo.Atratividade_Massa = atrMassa > 0 ? atrMassa : 0;
        somaAtratividadeMassa += empresa.estadoNovo.Atratividade_Massa;
    });

    // --- Cálculo de Market Share e Vendas Desejadas (inalterado) ---
    dadosProcessamento.forEach(empresa => {
        const { estadoNovo } = empresa;
        const sharePremium = (somaAtratividadePremium > 0) ? (estadoNovo.Atratividade_Premium / somaAtratividadePremium) : (1 / dadosProcessamento.length);
        estadoNovo.Market_Share_Premium = sharePremium;
        estadoNovo.Vendas_Desejadas_Premium = Math.floor(demandaPremium * sharePremium);
        
        const shareMassa = (somaAtratividadeMassa > 0) ? (estadoNovo.Atratividade_Massa / somaAtratividadeMassa) : (1 / dadosProcessamento.length);
        estadoNovo.Market_Share_Massa = shareMassa;
        estadoNovo.Vendas_Desejadas_Massa = Math.floor(demandaMassa * shareMassa);
        
        console.log(`[${empresa.id}] Atr P:${estadoNovo.Atratividade_Premium.toFixed(2)} M:${estadoNovo.Atratividade_Massa.toFixed(2)} | Share P:${(sharePremium*100).toFixed(1)}% M:${(shareMassa*100).toFixed(1)}% | Vendas Desej P:${estadoNovo.Vendas_Desejadas_Premium} M:${estadoNovo.Vendas_Desejadas_Massa}`);
    });

    // --- RF 3.5: Fase 4 - Alocação de Vendas e Fechamento Financeiro ---
    console.log("[M3][F4] Iniciando Fase 4: Alocação de Vendas e Receita");
    let vendasTotaisSetor = 0;
    dadosProcessamento.forEach(empresa => {
        const { estadoNovo, decisoes } = empresa;
        
        // MUDANÇA: Lógica de Vendas e Estoque Segmentada
        const estoqueDisponivelS1 = estadoNovo.Estoque_S1_Unidades || 0;
        const estoqueDisponivelS2 = estadoNovo.Estoque_S2_Unidades || 0;
        let noticiaRupturaS1 = null;
        let noticiaRupturaS2 = null;

        // Vendas S1
        const vendasEfetivasPremium = Math.min(estadoNovo.Vendas_Desejadas_Premium, estoqueDisponivelS1);
        if (estadoNovo.Vendas_Desejadas_Premium > estoqueDisponivelS1) {
            noticiaRupturaS1 = `Ruptura de estoque S1! Demanda ${estadoNovo.Vendas_Desejadas_Premium.toLocaleString('pt-BR')}, estoque ${estoqueDisponivelS1.toLocaleString('pt-BR')}.`;
            console.warn(`[${empresa.id}] R${proximaRodada}: ${noticiaRupturaS1}`);
        }
        
        // Vendas S2
        const vendasEfetivasMassa = Math.min(estadoNovo.Vendas_Desejadas_Massa, estoqueDisponivelS2);
         if (estadoNovo.Vendas_Desejadas_Massa > estoqueDisponivelS2) {
            noticiaRupturaS2 = `Ruptura de estoque S2! Demanda ${estadoNovo.Vendas_Desejadas_Massa.toLocaleString('pt-BR')}, estoque ${estoqueDisponivelS2.toLocaleString('pt-BR')}.`;
            console.warn(`[${empresa.id}] R${proximaRodada}: ${noticiaRupturaS2}`);
        }

        estadoNovo.Noticia_Ruptura_Estoque_S1 = noticiaRupturaS1;
        estadoNovo.Noticia_Ruptura_Estoque_S2 = noticiaRupturaS2;
        estadoNovo.Vendas_Efetivas_Premium = vendasEfetivasPremium;
        estadoNovo.Vendas_Efetivas_Massa = vendasEfetivasMassa;
        const vendasEfetivasTotal = vendasEfetivasPremium + vendasEfetivasMassa;
        vendasTotaisSetor += vendasEfetivasTotal;

        // Cálculo da Receita (inalterado)
        const receitaPremium = vendasEfetivasPremium * (decisoes.Preco_Segmento_1 || 0);
        const receitaMassa = vendasEfetivasMassa * (decisoes.Preco_Segmento_2 || 0);
        const receitaTotal = receitaPremium + receitaMassa;
        estadoNovo.Caixa += receitaTotal;
        estadoNovo.Vendas_Receita = receitaTotal;

        // MUDANÇA: Atualiza Estoque Final (Segmentado)
        const cvuS1_Estoque = estadoNovo.Custo_Unitario_S1; // Custo da produção desta rodada
        const cvuS2_Estoque = estadoNovo.Custo_Unitario_S2;
        
        const estoqueFinalS1_Unid = estoqueDisponivelS1 - vendasEfetivasPremium;
        const estoqueFinalS2_Unid = estoqueDisponivelS2 - vendasEfetivasMassa;
        
        estadoNovo.Estoque_S1_Unidades = estoqueFinalS1_Unid;
        estadoNovo.Custo_Estoque_S1 = estoqueFinalS1_Unid * cvuS1_Estoque;
        estadoNovo.Estoque_S2_Unidades = estoqueFinalS2_Unid;
        estadoNovo.Custo_Estoque_S2 = estoqueFinalS2_Unid * cvuS2_Estoque;

        // MUDANÇA: Calcula CPV Efetivo (Segmentado)
        const cpvEfetivo = (vendasEfetivasPremium * cvuS1_Estoque) + (vendasEfetivasMassa * cvuS2_Estoque);
        estadoNovo.Custo_Produtos_Vendidos = cpvEfetivo;

        console.log(`[${empresa.id}] Vendeu P:${vendasEfetivasPremium} M:${vendasEfetivasMassa}. Receita: ${receitaTotal.toLocaleString('pt-BR')}. CPV: ${cpvEfetivo.toLocaleString('pt-BR')}. Estoque S1: ${estoqueFinalS1_Unid}, S2: ${estoqueFinalS2_Unid}. Caixa Final: ${estadoNovo.Caixa.toLocaleString('pt-BR')}`);

        // --- RF 3.6: Geração de Relatórios (DRE/Balanço) ---
        estadoNovo.Lucro_Bruto = estadoNovo.Vendas_Receita - estadoNovo.Custo_Produtos_Vendidos;
        
        // MUDANÇA: Despesas Operacionais Totais (agora inclui Org)
        const despesasOperacionaisTotais = estadoNovo.Despesas_Operacionais_Outras + 
                                            estadoNovo.Despesas_Organiz_Capacitacao + 
                                            estadoNovo.Despesas_Organiz_Mkt_Institucional + 
                                            estadoNovo.Despesas_Organiz_ESG;
        
        estadoNovo.Lucro_Operacional_EBIT = estadoNovo.Lucro_Bruto - despesasOperacionaisTotais;
        const despesasFinanceiras = estadoNovo.Despesas_Juros_CP + estadoNovo.Despesas_Juros_Emergencia + estadoNovo.Despesas_Juros_LP;
        estadoNovo.Lucro_Liquido = estadoNovo.Lucro_Operacional_EBIT - despesasFinanceiras;
        estadoNovo.Lucro_Acumulado = (empresa.estadoAtual.Lucro_Acumulado || 0) + estadoNovo.Lucro_Liquido;
        estadoNovo.Lucro_Antes_Taxas = estadoNovo.Lucro_Liquido; // Mantém para consistência

    }); // Fim do loop forEach empresa para Fase 4

    // --- RF 3.6 / RF 4.4: Cálculo do Ranking (IDG) ---
    console.log("[M3][F5] Calculando Ranking (IDG)");
    
    const metricas = dadosProcessamento.map(emp => {
        const { estadoNovo } = emp;
        const vendasTotais = (estadoNovo.Vendas_Efetivas_Premium || 0) + (estadoNovo.Vendas_Efetivas_Massa || 0);
        
        // MUDANÇA: Cálculo Saúde Financeira (Liquidez)
        const ativoCirculante = (estadoNovo.Caixa || 0) + (estadoNovo.Custo_Estoque_S1 || 0) + (estadoNovo.Custo_Estoque_S2 || 0);
        const parcelaLP = (estadoNovo.Divida_LP_Saldo > 0 && estadoNovo.Divida_LP_Rodadas_Restantes > 0) 
            ? estadoNovo.Divida_LP_Saldo / estadoNovo.Divida_LP_Rodadas_Restantes : 0;
        const passivoCirculante = (estadoNovo.Divida_CP || 0) + (estadoNovo.Divida_Emergencia || 0) + parcelaLP;
        // Se passivo é 0, liquidez é altíssima (seta 5), se ativo tbm for 0, é 1.
        const liquidez = (passivoCirculante > 0) ? (ativoCirculante / passivoCirculante) : (ativoCirculante > 0 ? 5 : 1);
        
        return {
            id: emp.id,
            lucroAcumulado: estadoNovo.Lucro_Acumulado || 0,
            marketShare: vendasTotaisSetor > 0 ? (vendasTotais / vendasTotaisSetor) : 0,
            nivelTotalPD: (estadoNovo.Nivel_PD_Camera || 1) + (estadoNovo.Nivel_PD_Bateria || 1) + (estadoNovo.Nivel_PD_Sist_Operacional_e_IA || 1) + (estadoNovo.Nivel_PD_Atualizacao_Geral || 1),
            saudeFinanceira: liquidez,
            // MUDANÇA: Bônus IDG Organizacional (Níveis)
            bonusIDG_Org: (estadoNovo.Nivel_Capacitacao || 1) + (estadoNovo.Nivel_Qualidade || 1) + (estadoNovo.Nivel_ESG || 1),
        };
    });
    
    // Função de normalização (0-100) (inalterada)
    const normalizarMetrica = (valor, todosValores) => { 
        const min = Math.min(...todosValores); 
        const max = Math.max(...todosValores); 
        if (min === max) return (valor >= min ? 100 : 0);
        if (max === 0) return 0;
        const minAjustado = Math.min(min, 0);
        const divisor = (max - minAjustado) === 0 ? 1 : (max - minAjustado);
        return Math.max(0, ((valor - minAjustado) / divisor) * 100);
    };

    const lucros = metricas.map(m => m.lucroAcumulado);
    const shares = metricas.map(m => m.marketShare);
    const pds = metricas.map(m => m.nivelTotalPD);
    const saudes = metricas.map(m => m.saudeFinanceira);
    const orgs = metricas.map(m => m.bonusIDG_Org);
    
    // MUDANÇA: Pega novos pesos IDG
    const pesoLucro = simulacao.Peso_IDG_Lucro || 0.40;
    const pesoShare = simulacao.Peso_IDG_Share || 0.30;
    const pesoPD = simulacao.Peso_IDG_PD || 0.15;
    const pesoSaudeFin = simulacao.Peso_IDG_Saude_Financeira || 0.15;
    const pesoOrg = 0; // Bônus Org é ADITIVO, não parte do 100%

    dadosProcessamento.forEach(empresa => {
        const metrica = metricas.find(m => m.id === empresa.id);
        const notaLucro = normalizarMetrica(metrica.lucroAcumulado, lucros) * pesoLucro;
        const notaShare = normalizarMetrica(metrica.marketShare, shares) * pesoShare;
        const notaPD = normalizarMetrica(metrica.nivelTotalPD, pds) * pesoPD;
        const notaSaude = normalizarMetrica(metrica.saudeFinanceira, saudes) * pesoSaudeFin;
        // Bônus Org (ex: 0.5 pontos por nível acima de 1)
        const notaBonusOrg = Math.max(0, (normalizarMetrica(metrica.bonusIDG_Org, orgs) * (pesoOrg || 0))); // Ajustar pesoOrg
        
        empresa.estadoNovo.IDG_Score = notaLucro + notaShare + notaPD + notaSaude + notaBonusOrg;
        empresa.estadoNovo.IDG_Metricas = { 
            lucro: { valor: metrica.lucroAcumulado, nota: notaLucro },
            share: { valor: metrica.marketShare, nota: notaShare },
            pd: { valor: metrica.nivelTotalPD, nota: notaPD },
            saude: { valor: metrica.saudeFinanceira, nota: notaSaude },
            org: { valor: metrica.bonusIDG_Org, nota: notaBonusOrg }
        };
         console.log(`[${empresa.id}] IDG: L=${notaLucro.toFixed(1)} S=${notaShare.toFixed(1)} P=${notaPD.toFixed(1)} H=${notaSaude.toFixed(1)} O=${notaBonusOrg.toFixed(1)} | TOTAL: ${empresa.estadoNovo.IDG_Score.toFixed(1)}`);
    });

    // --- RF 3.6: Fase 5 - Persistência de Dados ---
    console.log("[M3][F5] Salvando resultados no Firestore...");
    // MUDANÇA: Passa 'db'
    const batch = writeBatch(db);
    for (const empresa of dadosProcessamento) {
        // MUDANÇA: Passa 'db'
        const estadoNovoRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresa.id, proximaRodada.toString());
        
        // MUDANÇA: Limpeza dos campos antigos de estoque
        delete empresa.estadoNovo.Unidades_Em_Estoque;
        delete empresa.estadoNovo.Custo_Estoque_Final;
        delete empresa.estadoNovo.Custo_Variavel_Unitario_Medio;
        // Limpeza de campos temporários
        delete empresa.estadoNovo.Atratividade_Premium;
        delete empresa.estadoNovo.Atratividade_Massa;
        
        batch.set(estadoNovoRef, empresa.estadoNovo);

        // Cria o placeholder para as decisões da PRÓXIMA rodada
        if(proximaRodada < (simulacao.Total_Rodadas || 0) ) {
            // MUDANÇA: Passa 'db'
            const decisaoFuturaRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresa.id, (proximaRodada + 1).toString());
            // MUDANÇA: Placeholder agora precisa dos novos campos de decisão
            batch.set(decisaoFuturaRef, { 
                Rodada: (proximaRodada + 1), 
                Status_Decisao: 'Pendente',
                Producao_Planejada_S1: '', // Adiciona placeholders
                Producao_Planejada_S2: '',
                Escolha_Fornecedor_S1_Tela: '',
                Escolha_Fornecedor_S1_Chip: '',
                Escolha_Fornecedor_S2_Tela: '',
                Escolha_Fornecedor_S2_Chip: '',
            });
        }
    }
    // MUDANÇA: Passa 'db'
    const simRef = doc(db, simulacoesCollectionPath, simulacaoId);
    let novoStatusSimulacao = `Aguardando Decisões da Rodada ${proximaRodada + 1}`;
    if(proximaRodada >= (simulacao.Total_Rodadas || 0) ) {
        novoStatusSimulacao = `Finalizada - Rodada ${proximaRodada}`;
    }
    batch.update(simRef, {
        Status: novoStatusSimulacao,
        Rodada_Atual: proximaRodada
    });

    await batch.commit();
    console.log(`--- [M3] PROCESSAMENTO DA RODADA ${proximaRodada} CONCLUÍDO ---`);

    return { sucesso: true, rodadaProcessada: proximaRodada };
}