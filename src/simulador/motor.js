// src/simulador/motor.js
import { collection, doc, getDocs, getDoc, writeBatch } from 'firebase/firestore';

// --- Funções Auxiliares para Cálculo de Atratividade (RF 3.4) ---

function normalizarValor(valor, todosValores, inverter = false) {
    const min = Math.min(...todosValores);
    const max = Math.max(...todosValores);
    if (min === max) { return 1.0; }
    // Previne divisão por zero
    const divisor = (max - min) === 0 ? 1 : (max - min);
    const nota = (valor - min) / divisor;
    return inverter ? (1 - nota) : nota;
}

function aplicarRetornosDecrescentes(notaNormalizada) {
    // Garante que a entrada não seja negativa
    return Math.sqrt(Math.max(0, notaNormalizada));
}

// Higienização de Outliers para evitar distorções na normalização de preços
function higienizarPrecosOutliers(precos, multiplicadorCap = 5) {
    const precosValidos = precos.filter(p => p > 0 && isFinite(p));

    if (precosValidos.length === 0) {
        return precos.map(() => 1); 
    }
    
    precosValidos.sort((a, b) => a - b);
    
    // Calcula a mediana
    const mid = Math.floor(precosValidos.length / 2);
    const mediana = precosValidos.length % 2 !== 0 
        ? precosValidos[mid] 
        : (precosValidos[mid - 1] + precosValidos[mid]) / 2;

    // Define o "teto de sanidade"
    const tetoSanidadeBase = mediana * multiplicadorCap;
    const tetoSanidade = Math.max(tetoSanidadeBase, precosValidos[precosValidos.length - 1]);

    return precos.map(p => {
        if (!isFinite(p) || p === 0) return Infinity; 
        if (p > tetoSanidade) return tetoSanidade; // "Capa" o outlier
        return p; 
    });
}


/**
 * Função principal que processa uma rodada da simulação.
 * @param {string} simulacaoId - O ID da simulação a ser processada.
 * @param {object} simulacao - O objeto de dados da simulação (parâmetros).
 * @param {object} db - Instância do Firestore.
 * @param {string} appId - ID do App Firebase.
 */
export async function processarRodada(simulacaoId, simulacao, db, appId) {
    console.log(`--- [M3] INICIANDO PROCESSAMENTO DA RODADA ${simulacao.Rodada_Atual} PARA: ${simulacao.Nome_Simulacao} ---`);

    const rodadaAtual = simulacao.Rodada_Atual; 
    const proximaRodada = rodadaAtual + 1; 
    const simulacoesCollectionPath = `/artifacts/${appId}/public/data/simulacoes`;
    const empresasRef = collection(db, simulacoesCollectionPath, simulacaoId, 'empresas');
    const empresasSnapshot = await getDocs(empresasRef);
    const empresasIds = empresasSnapshot.docs.map(d => d.id);

    let dadosProcessamento = [];

    // --- PRÉ-FASE: Carregar todos os dados ---
    console.log(`[M3][PRE] Carregando dados de ${empresasIds.length} empresas para processar R${proximaRodada}...`);
    for (const empresaId of empresasIds) {
        // 1. Carrega Doc da Empresa (PARA PEGAR A ESTRATÉGIA)
        const empresaDocRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresaId);
        const empresaDocSnap = await getDoc(empresaDocRef);
        const dadosEmpresa = empresaDocSnap.exists() ? empresaDocSnap.data() : {};

        // 2. Estado da rodada anterior
        const estadoAtualRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresaId, 'estados', rodadaAtual.toString());
        const estadoAtualSnap = await getDoc(estadoAtualRef);

        // 3. Decisões para esta rodada
        const decisaoRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresaId, 'decisoes', proximaRodada.toString());
        const decisaoSnap = await getDoc(decisaoRef);

        if (!estadoAtualSnap.exists()) {
            throw new Error(`[ERRO] Empresa ${empresaId}: Estado da Rodada ${rodadaAtual} não encontrado.`);
        }
        // Se não submeteu, o admin pode forçar ou o sistema assume default (aqui forçamos erro ou pulamos, depende da regra. O código original lançava erro)
        if (!decisaoSnap.exists() || decisaoSnap.data().Status_Decisao !== 'Submetido') {
             console.warn(`[AVISO] Empresa ${empresaId}: Decisões não submetidas. Usando defaults/valores zerados.`);
             // Em produção, idealmente trataria "NÃO SUBMETIDO" como inatividade ou repetição de valores anteriores
        }
        
        const decisoesData = decisaoSnap.exists() ? decisaoSnap.data() : {};

        dadosProcessamento.push({
            id: empresaId,
            dadosEmpresa: dadosEmpresa, // Contém a Estratégia
            estadoAtual: estadoAtualSnap.data(), 
            decisoes: decisoesData, 
            // Objeto para construir o NOVO estado
            estadoNovo: {
                Rodada: proximaRodada,
                // Inicializa acumuladores
                Despesas_Juros_CP: 0,
                Despesas_Juros_Emergencia: 0,
                Despesas_Juros_LP: 0,
                Despesas_Operacionais_Outras: 0, // P&D, Mkt Produto, Custo Fixo
                Despesas_Organiz_Capacitacao: 0,
                Despesas_Organiz_Mkt_Institucional: 0,
                Despesas_Organiz_ESG: 0,
                Vendas_Receita: 0,
                Custo_Produtos_Vendidos: 0,
                Lucro_Bruto: 0,
                Lucro_Operacional_EBIT: 0,
                Lucro_Liquido: 0,
                // Saldos de Balanço
                Caixa: estadoAtualSnap.data().Caixa || 0, 
                Divida_CP: 0, 
                Divida_Emergencia: 0, 
                Divida_LP_Saldo: estadoAtualSnap.data().Divida_LP_Saldo || 0,
                Divida_LP_Rodadas_Restantes: estadoAtualSnap.data().Divida_LP_Rodadas_Restantes || 0,
                // Estoque Segmentado
                Estoque_S1_Unidades: estadoAtualSnap.data().Estoque_S1_Unidades || 0,
                Custo_Estoque_S1: estadoAtualSnap.data().Custo_Estoque_S1 || 0,
                Estoque_S2_Unidades: estadoAtualSnap.data().Estoque_S2_Unidades || 0,
                Custo_Estoque_S2: estadoAtualSnap.data().Custo_Estoque_S2 || 0,
                // Auxiliares
                Custo_Unitario_S1: 0, 
                Custo_Unitario_S2: 0
            }
        });
    }
    console.log("[M3][PRE] Dados carregados.");

    // Taxas
    const taxaJurosCP = (simulacao.Taxa_Juros_Curto_Prazo || 0) / 100;
    const taxaJurosEmergencia = (simulacao.Taxa_Juros_Emergencia || 0) / 100;
    const taxaJurosLP = (simulacao.Taxa_Juros_Longo_Prazo || 0) / 100;
    const prazoFixoLP = simulacao.Prazo_Fixo_Longo_Prazo || 4;


    // --- RF 3.2: Fase 1 - Atualizações Financeiras e Investimentos ---
    console.log("[M3][F1] Fase 1: Finanças e Investimentos");

    dadosProcessamento.forEach(empresa => {
        const { estadoAtual, decisoes, estadoNovo } = empresa;
        let caixa = estadoNovo.Caixa;
        let logFinanceiro = [`[${empresa.id}]`];

        // --- 1. PAGAMENTOS OBRIGATÓRIOS ---
        // a) Emergência Anterior
        const dividaEmergAnterior = estadoAtual.Divida_Emergencia || 0;
        if (dividaEmergAnterior > 0) {
            const jurosEmerg = dividaEmergAnterior * taxaJurosEmergencia;
            const pgtoTotal = dividaEmergAnterior + jurosEmerg;
            caixa -= pgtoTotal;
            estadoNovo.Despesas_Juros_Emergencia += jurosEmerg;
        }

        // b) Curto Prazo Anterior
        const dividaCPAnterior = estadoAtual.Divida_CP || 0;
        if (dividaCPAnterior > 0) {
            const jurosCP = dividaCPAnterior * taxaJurosCP;
            const pgtoTotal = dividaCPAnterior + jurosCP;

            if (caixa < pgtoTotal) {
                // Empréstimo de Emergência Automático
                const shortfall = pgtoTotal - caixa;
                estadoNovo.Divida_Emergencia = shortfall;
                // Cobra juros da emergência imediatamente sobre o shortfall (simplificação)
                estadoNovo.Despesas_Juros_Emergencia += (shortfall * taxaJurosEmergencia); 
                caixa = 0;
                estadoNovo.Despesas_Juros_CP += jurosCP;
                logFinanceiro.push(`EMERGÊNCIA: Shortfall ${shortfall.toFixed(0)}`);
            } else {
                caixa -= pgtoTotal;
                estadoNovo.Despesas_Juros_CP += jurosCP;
            }
        }

        // c) Longo Prazo (Parcela)
        let saldoLP = estadoAtual.Divida_LP_Saldo || 0;
        let rodadasLP = estadoAtual.Divida_LP_Rodadas_Restantes || 0;
        if (saldoLP > 0 && rodadasLP > 0) {
            const amortizacao = saldoLP / rodadasLP;
            const juros = saldoLP * taxaJurosLP;
            const parcela = amortizacao + juros;
            
            if (caixa < parcela) {
                 console.warn(`[${empresa.id}] Caixa insuficiente p/ LP. Ficará negativo (bug visual, mas registrado).`);
            }
            caixa -= parcela;
            estadoNovo.Despesas_Juros_LP += juros;
            saldoLP -= amortizacao;
            rodadasLP -= 1;
        } else {
             saldoLP = 0; rodadasLP = 0;
        }

        // --- 2. NOVAS DECISÕES FINANCEIRAS ---
        // Amortização Extra LP
        const amortExtra = Math.max(0, Math.min(decisoes.Amortizar_Divida_LP || 0, saldoLP));
        if (amortExtra > 0 && caixa >= amortExtra) {
            caixa -= amortExtra;
            saldoLP -= amortExtra;
            if (saldoLP <= 0) { saldoLP = 0; rodadasLP = 0; }
        }

        // Novos Empréstimos
        const novoCP = decisoes.Tomar_Emprestimo_CP || 0;
        if (novoCP > 0) {
            caixa += novoCP;
            estadoNovo.Divida_CP += novoCP;
        }
        const novoLP = decisoes.Tomar_Financiamento_LP || 0;
        if (novoLP > 0) {
            caixa += novoLP;
            saldoLP += novoLP;
            rodadasLP = prazoFixoLP; // Reseta prazo
        }

        // --- 3. INVESTIMENTOS (SAÍDAS DE CAIXA) ---
        
        // P&D Produto (Soma dos 4 tipos)
        const invCam = decisoes.Invest_PD_Camera || 0;
        const invBat = decisoes.Invest_PD_Bateria || 0;
        const invSO = decisoes.Invest_PD_Sist_Operacional_e_IA || 0;
        const invAG = decisoes.Invest_PD_Atualizacao_Geral || 0;
        const totalPD = invCam + invBat + invSO + invAG;
        caixa -= totalPD;
        estadoNovo.Despesas_Operacionais_Outras += totalPD;

        // Expansão (CAPEX)
        const invExp = decisoes.Invest_Expansao_Fabrica || 0;
        caixa -= invExp;
        estadoNovo.Imobilizado_Bruto = (estadoAtual.Imobilizado_Bruto || 0) + invExp;
        const incrementoCap = Math.floor(invExp / (simulacao.Custo_Expansao_Lote || 1)) * (simulacao.Incremento_Capacidade_Lote || 0);
        estadoNovo.Capacidade_Fabrica = (estadoAtual.Capacidade_Fabrica || 0) + incrementoCap;

        // Marketing Produto
        const totalMkt = (decisoes.Marketing_Segmento_1 || 0) + (decisoes.Marketing_Segmento_2 || 0);
        caixa -= totalMkt;
        estadoNovo.Despesas_Operacionais_Outras += totalMkt;

        // Investimentos Organizacionais (Novos Campos)
        const invCap = decisoes.Invest_Organiz_Capacitacao || 0;
        const invMktInst = decisoes.Invest_Organiz_Mkt_Institucional || 0;
        const invESG = decisoes.Invest_Organiz_ESG || 0;
        const totalOrg = invCap + invMktInst + invESG;
        
        caixa -= totalOrg;
        estadoNovo.Despesas_Organiz_Capacitacao += invCap;
        estadoNovo.Despesas_Organiz_Mkt_Institucional += invMktInst;
        estadoNovo.Despesas_Organiz_ESG += invESG;
        
        // Valor de Marca (Acumulado pelo Mkt Institucional)
        estadoNovo.Valor_Marca_Acumulado = (estadoAtual.Valor_Marca_Acumulado || 0) + invMktInst;

        // Custo Fixo Operacional (com Inflação)
        const inflacaoRodada = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4;
        const custoFixoBase = (simulacao.Custo_Fixo_Operacional || 0);
        const custoFixo = custoFixoBase * Math.pow(1 + inflacaoRodada, proximaRodada - 1);
        caixa -= custoFixo;
        estadoNovo.Despesas_Operacionais_Outras += custoFixo;

        // --- FECHAMENTO FASE 1 ---
        estadoNovo.Caixa = caixa;
        estadoNovo.Divida_LP_Saldo = saldoLP;
        estadoNovo.Divida_LP_Rodadas_Restantes = rodadasLP;
        estadoNovo.Depreciacao_Acumulada = (estadoAtual.Depreciacao_Acumulada || 0) + ((estadoNovo.Imobilizado_Bruto || 0) * 0.05);

        // --- PROCESSAMENTO DE NÍVEIS (P&D e Org) ---
        
        // Bônus de Rede (Fornecedor D)
        let bonusS1 = (decisoes.Escolha_Fornecedor_S1_Chip === 'D') ? (1 + (simulacao.Fornecedor_S1_Chip_D_Bonus_PD_Percent||0)/100) : 1;
        let bonusS2 = (decisoes.Escolha_Fornecedor_S2_Chip === 'D') ? (1 + (simulacao.Fornecedor_S2_Chip_D_Bonus_PD_Percent||0)/100) : 1;
        const bonusMedio = (bonusS1 + bonusS2) / 2;

        // Aplica bônus em Bateria e IA
        const invBatEf = invBat * bonusMedio;
        const invSOEf = invSO * bonusMedio;

        // Função genérica de nível
        const calcNivel = (area, progAtual, invest, keyNivel) => {
            const total = (progAtual || 0) + invest;
            let nivel = estadoAtual[keyNivel] || 1;
            let novoNivel = nivel;
            // Custo para subir
            for(let n=nivel+1; n<=5; n++) {
                const custoNec = simulacao[`Custo_PD_${area}_Nivel_${n}`] || simulacao[`Custo_Nivel_${area}_Nivel_${n}`] || Infinity;
                if (total >= custoNec) novoNivel = n;
                else break;
            }
            return { nivel: novoNivel, progresso: total };
        };

        // Produto
        const rCam = calcNivel('Camera', estadoAtual.Progresso_PD_Camera, invCam, 'Nivel_PD_Camera');
        const rBat = calcNivel('Bateria', estadoAtual.Progresso_PD_Bateria, invBatEf, 'Nivel_PD_Bateria');
        const rSO = calcNivel('Sist_Operacional_e_IA', estadoAtual.Progresso_PD_Sist_Operacional_e_IA, invSOEf, 'Nivel_PD_Sist_Operacional_e_IA');
        const rAG = calcNivel('Atualizacao_Geral', estadoAtual.Progresso_PD_Atualizacao_Geral, invAG, 'Nivel_PD_Atualizacao_Geral');
        
        estadoNovo.Nivel_PD_Camera = rCam.nivel; estadoNovo.Progresso_PD_Camera = rCam.progresso;
        estadoNovo.Nivel_PD_Bateria = rBat.nivel; estadoNovo.Progresso_PD_Bateria = rBat.progresso;
        estadoNovo.Nivel_PD_Sist_Operacional_e_IA = rSO.nivel; estadoNovo.Progresso_PD_Sist_Operacional_e_IA = rSO.progresso;
        estadoNovo.Nivel_PD_Atualizacao_Geral = rAG.nivel; estadoNovo.Progresso_PD_Atualizacao_Geral = rAG.progresso;

        // Organizacional
        const rCap = calcNivel('Capacitacao', estadoAtual.Progresso_Capacitacao, invCap, 'Nivel_Capacitacao');
        const rQual = calcNivel('Qualidade', estadoAtual.Progresso_Qualidade, invMktInst, 'Nivel_Qualidade'); // Mkt Inst conta como Qualidade/Marca
        const rESG = calcNivel('ESG', estadoAtual.Progresso_ESG, invESG, 'Nivel_ESG');

        estadoNovo.Nivel_Capacitacao = rCap.nivel; estadoNovo.Progresso_Capacitacao = rCap.progresso;
        estadoNovo.Nivel_Qualidade = rQual.nivel; estadoNovo.Progresso_Qualidade = rQual.progresso;
        estadoNovo.Nivel_ESG = rESG.nivel; estadoNovo.Progresso_ESG = rESG.progresso;

        logFinanceiro.push(`Caixa Fim Fase 1: ${estadoNovo.Caixa.toFixed(2)}`);
    });


    // --- RF 3.3: Fase 2 - Produção e Operações ---
    console.log("[M3][F2] Fase 2: Produção e CPV");
    
    // Fator global de inflação custo montagem
    const inflacaoGlobal = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4;
    const custoMontagemBase = (simulacao.Custo_Variavel_Montagem_Base || 0) * Math.pow(1 + inflacaoGlobal, proximaRodada - 1);

    dadosProcessamento.forEach(empresa => {
        const { estadoAtual, decisoes, estadoNovo } = empresa;
        
        // 1. Produção Planejada
        let prodS1 = decisoes.Producao_Planejada_S1 || 0;
        let prodS2 = decisoes.Producao_Planejada_S2 || 0;
        let prodTotal = prodS1 + prodS2;
        const capacidade = estadoAtual.Capacidade_Fabrica || 0;

        // Validação Capacidade
        if (prodTotal > capacidade) {
            const ratio = capacidade / prodTotal;
            prodS1 = Math.floor(prodS1 * ratio);
            prodS2 = Math.floor(prodS2 * ratio);
            prodTotal = prodS1 + prodS2;
            console.warn(`[${empresa.id}] Produção limitada pela capacidade.`);
        }

        // 2. Risco de Fornecedor (A)
        // S1
        if (decisoes.Escolha_Fornecedor_S1_Tela === 'A') {
            const prob = simulacao.Fornecedor_S1_Tela_A_Risco_Prob / 100 || 0.2;
            if (Math.random() < prob) {
                const perda = Math.floor(prodS1 * (simulacao.Fornecedor_S1_Tela_A_Risco_Perda / 100 || 0.15));
                prodS1 -= perda;
                estadoNovo.Noticia_Producao_Risco_S1 = `Falha Fornecedor S1: Perda de ${perda} unid.`;
            }
        }
        // S2
        if (decisoes.Escolha_Fornecedor_S2_Tela === 'A') {
            const prob = simulacao.Fornecedor_S2_Tela_A_Risco_Prob / 100 || 0.2;
            if (Math.random() < prob) {
                const perda = Math.floor(prodS2 * (simulacao.Fornecedor_S2_Tela_A_Risco_Perda / 100 || 0.15));
                prodS2 -= perda;
                estadoNovo.Noticia_Producao_Risco_S2 = `Falha Fornecedor S2: Perda de ${perda} unid.`;
            }
        }

        estadoNovo.Producao_Efetiva_S1 = prodS1;
        estadoNovo.Producao_Efetiva_S2 = prodS2;

        // 3. Cálculo do CPV Unitário (CVU)
        // Redução por Capacitação
        const nivelCap = estadoNovo.Nivel_Capacitacao || 1;
        const redPerc = (simulacao.Reducao_Custo_Montagem_Por_Nivel_Capacitacao_Percent || 0) / 100;
        const fatorRed = 1 - (redPerc * (nivelCap - 1));
        const custoMontagemReal = custoMontagemBase * fatorRed;

        // Componentes S1
        const custoTelaS1 = (decisoes.Escolha_Fornecedor_S1_Tela === 'A') ? (simulacao.Fornecedor_S1_Tela_A_Custo||0) : (simulacao.Fornecedor_S1_Tela_B_Custo||0);
        const custoChipS1 = (decisoes.Escolha_Fornecedor_S1_Chip === 'C') ? (simulacao.Fornecedor_S1_Chip_C_Custo||0) : (simulacao.Fornecedor_S1_Chip_D_Custo||0);
        const cvuS1 = custoMontagemReal + custoTelaS1 + custoChipS1;

        // Componentes S2
        const custoTelaS2 = (decisoes.Escolha_Fornecedor_S2_Tela === 'A') ? (simulacao.Fornecedor_S2_Tela_A_Custo||0) : (simulacao.Fornecedor_S2_Tela_B_Custo||0);
        const custoChipS2 = (decisoes.Escolha_Fornecedor_S2_Chip === 'C') ? (simulacao.Fornecedor_S2_Chip_C_Custo||0) : (simulacao.Fornecedor_S2_Chip_D_Custo||0);
        const cvuS2 = custoMontagemReal + custoTelaS2 + custoChipS2;

        // Custo Total da Produção
        const cpvTotal = (prodS1 * cvuS1) + (prodS2 * cvuS2);
        estadoNovo.Caixa -= cpvTotal;

        // Atualiza Estoques (Adiciona produção)
        estadoNovo.Estoque_S1_Unidades = (estadoAtual.Estoque_S1_Unidades || 0) + prodS1;
        estadoNovo.Estoque_S2_Unidades = (estadoAtual.Estoque_S2_Unidades || 0) + prodS2;
        
        // Salva CVU da rodada para fins contábeis (simplificado: assume que todo estoque novo e velho vale isso, ou FIFO aproximado)
        estadoNovo.Custo_Unitario_S1 = cvuS1;
        estadoNovo.Custo_Unitario_S2 = cvuS2;
    });


    // --- RF 3.4: Fase 3 - Mercado ---
    console.log("[M3][F3] Fase 3: Mercado");

    // Dados Gerais de Demanda e Pesos
    const demandaS1 = simulacao[`Segmento1_Demanda_Rodada_${proximaRodada}`] || 0;
    const demandaS2 = simulacao[`Segmento2_Demanda_Rodada_${proximaRodada}`] || 0;

    // Listas para normalização
    const precosS1 = higienizarPrecosOutliers(dadosProcessamento.map(e => e.decisoes.Preco_Segmento_1 || 0));
    const precosS2 = higienizarPrecosOutliers(dadosProcessamento.map(e => e.decisoes.Preco_Segmento_2 || 0));
    const mktS1 = dadosProcessamento.map(e => e.decisoes.Marketing_Segmento_1 || 0);
    const mktS2 = dadosProcessamento.map(e => e.decisoes.Marketing_Segmento_2 || 0);

    let somaAtrS1 = 0;
    let somaAtrS2 = 0;

    dadosProcessamento.forEach(empresa => {
        const { estadoNovo, decisoes } = empresa;
        
        // Cálculo S1
        const wPDS1 = simulacao[`Peso_PD_Premium_Rodada_${proximaRodada}`] || 0;
        const wMktS1 = simulacao[`Peso_Mkt_Premium_Rodada_${proximaRodada}`] || 0;
        const wPrecoS1 = simulacao[`Peso_Preco_Premium_Rodada_${proximaRodada}`] || 0;
        const wQualS1 = simulacao[`Peso_Qualidade_Premium_Rodada_${proximaRodada}`] || 0;
        const wESGS1 = simulacao[`Peso_ESG_Premium_Rodada_${proximaRodada}`] || 0;

        // Sub-pesos P&D S1
        const wCam = simulacao[`Peso_PD_Camera_Premium_Rodada_${proximaRodada}`] || 0;
        const wBat = simulacao[`Peso_PD_Bateria_Premium_Rodada_${proximaRodada}`] || 0;
        const wSO = simulacao[`Peso_PD_Sist_Operacional_e_IA_Premium_Rodada_${proximaRodada}`] || 0;

        const scorePDS1 = (estadoNovo.Nivel_PD_Camera * wCam) + (estadoNovo.Nivel_PD_Bateria * wBat) + (estadoNovo.Nivel_PD_Sist_Operacional_e_IA * wSO);
        const scoreMktS1 = aplicarRetornosDecrescentes(normalizarValor(decisoes.Marketing_Segmento_1, mktS1));
        const scorePrecoS1 = normalizarValor(decisoes.Preco_Segmento_1, precosS1, true); // Invertido (preço menor é melhor)
        
        const atratividadeS1 = (scorePDS1 * wPDS1) + (scoreMktS1 * wMktS1) + (scorePrecoS1 * wPrecoS1) + 
                               (estadoNovo.Nivel_Qualidade * wQualS1) + (estadoNovo.Nivel_ESG * wESGS1);
        
        empresa.atratividadeS1 = Math.max(0, atratividadeS1);
        somaAtrS1 += empresa.atratividadeS1;

        // Cálculo S2
        const wPDS2 = simulacao[`Peso_PD_Massa_Rodada_${proximaRodada}`] || 0; // Atualização Geral
        const wMktS2 = simulacao[`Peso_Mkt_Massa_Rodada_${proximaRodada}`] || 0;
        const wPrecoS2 = simulacao[`Peso_Preco_Massa_Rodada_${proximaRodada}`] || 0;
        const wQualS2 = simulacao[`Peso_Qualidade_Massa_Rodada_${proximaRodada}`] || 0;
        const wESGS2 = simulacao[`Peso_ESG_Massa_Rodada_${proximaRodada}`] || 0;

        const scorePDS2 = estadoNovo.Nivel_PD_Atualizacao_Geral; // Apenas 1 tipo
        const scoreMktS2 = aplicarRetornosDecrescentes(normalizarValor(decisoes.Marketing_Segmento_2, mktS2));
        const scorePrecoS2 = normalizarValor(decisoes.Preco_Segmento_2, precosS2, true);

        const atratividadeS2 = (scorePDS2 * wPDS2) + (scoreMktS2 * wMktS2) + (scorePrecoS2 * wPrecoS2) +
                               (estadoNovo.Nivel_Qualidade * wQualS2) + (estadoNovo.Nivel_ESG * wESGS2);
        
        empresa.atratividadeS2 = Math.max(0, atratividadeS2);
        somaAtrS2 += empresa.atratividadeS2;
    });

    // Market Share e Vendas
    let totalVendasSetor = 0;
    dadosProcessamento.forEach(empresa => {
        const { estadoNovo, decisoes } = empresa;
        
        // S1
        const shareS1 = somaAtrS1 > 0 ? (empresa.atratividadeS1 / somaAtrS1) : (1 / dadosProcessamento.length);
        const demandaDesejadaS1 = Math.floor(demandaS1 * shareS1);
        // Limita pelo estoque
        const vendasS1 = Math.min(demandaDesejadaS1, estadoNovo.Estoque_S1_Unidades);
        if (demandaDesejadaS1 > estadoNovo.Estoque_S1_Unidades) {
            estadoNovo.Noticia_Ruptura_Estoque_S1 = `Ruptura S1: Demandou ${demandaDesejadaS1}, vendeu ${vendasS1}.`;
        }
        estadoNovo.Vendas_Efetivas_Premium = vendasS1;
        estadoNovo.Market_Share_Premium = shareS1; // Guarda o share TEÓRICO

        // S2
        const shareS2 = somaAtrS2 > 0 ? (empresa.atratividadeS2 / somaAtrS2) : (1 / dadosProcessamento.length);
        const demandaDesejadaS2 = Math.floor(demandaS2 * shareS2);
        const vendasS2 = Math.min(demandaDesejadaS2, estadoNovo.Estoque_S2_Unidades);
        if (demandaDesejadaS2 > estadoNovo.Estoque_S2_Unidades) {
            estadoNovo.Noticia_Ruptura_Estoque_S2 = `Ruptura S2: Demandou ${demandaDesejadaS2}, vendeu ${vendasS2}.`;
        }
        estadoNovo.Vendas_Efetivas_Massa = vendasS2;
        estadoNovo.Market_Share_Massa = shareS2;

        totalVendasSetor += (vendasS1 + vendasS2);

        // Receita e Estoque Final
        const receita = (vendasS1 * (decisoes.Preco_Segmento_1 || 0)) + (vendasS2 * (decisoes.Preco_Segmento_2 || 0));
        estadoNovo.Vendas_Receita = receita;
        estadoNovo.Caixa += receita;

        estadoNovo.Estoque_S1_Unidades -= vendasS1;
        estadoNovo.Custo_Estoque_S1 = estadoNovo.Estoque_S1_Unidades * estadoNovo.Custo_Unitario_S1;
        
        estadoNovo.Estoque_S2_Unidades -= vendasS2;
        estadoNovo.Custo_Estoque_S2 = estadoNovo.Estoque_S2_Unidades * estadoNovo.Custo_Unitario_S2;

        // CPV das Vendas (DRE)
        const cpvVendas = (vendasS1 * estadoNovo.Custo_Unitario_S1) + (vendasS2 * estadoNovo.Custo_Unitario_S2);
        estadoNovo.Custo_Produtos_Vendidos = cpvVendas;
    });


    // --- RF 3.6: Relatórios DRE ---
    dadosProcessamento.forEach(empresa => {
        const en = empresa.estadoNovo;
        en.Lucro_Bruto = en.Vendas_Receita - en.Custo_Produtos_Vendidos;
        
        const totalDespOp = en.Despesas_Operacionais_Outras + en.Despesas_Organiz_Capacitacao + 
                            en.Despesas_Organiz_Mkt_Institucional + en.Despesas_Organiz_ESG;
        
        en.Lucro_Operacional_EBIT = en.Lucro_Bruto - totalDespOp;
        
        const totalJuros = en.Despesas_Juros_CP + en.Despesas_Juros_Emergencia + en.Despesas_Juros_LP;
        en.Lucro_Liquido = en.Lucro_Operacional_EBIT - totalJuros;
        
        en.Lucro_Acumulado = (empresa.estadoAtual.Lucro_Acumulado || 0) + en.Lucro_Liquido;
    });


    // --- RF 4.4: Ranking IDG com ESTRATÉGIA ---
    console.log("[M3][F5] Ranking IDG (Estratégico)");

    // Preparação dos dados para normalização
    const metricasBrutas = dadosProcessamento.map(e => {
        const en = e.estadoNovo;
        const vendasTotais = en.Vendas_Efetivas_Premium + en.Vendas_Efetivas_Massa;
        
        // Cálculo Liquidez Corrente (Ativo Circulante / Passivo Circulante)
        const ativoCirc = en.Caixa + en.Custo_Estoque_S1 + en.Custo_Estoque_S2;
        const parcelaLP = (en.Divida_LP_Saldo > 0 && en.Divida_LP_Rodadas_Restantes > 0) ? en.Divida_LP_Saldo / en.Divida_LP_Rodadas_Restantes : 0;
        const passivoCirc = en.Divida_CP + en.Divida_Emergencia + parcelaLP;
        const liquidez = passivoCirc === 0 ? (ativoCirc > 0 ? 5 : 1) : (ativoCirc / passivoCirc);

        return {
            id: e.id,
            lucro: en.Lucro_Acumulado,
            share: totalVendasSetor > 0 ? (vendasTotais / totalVendasSetor) : 0,
            pd: en.Nivel_PD_Camera + en.Nivel_PD_Bateria + en.Nivel_PD_Sist_Operacional_e_IA + en.Nivel_PD_Atualizacao_Geral,
            saude: liquidez,
            org: en.Nivel_Capacitacao + en.Nivel_Qualidade + en.Nivel_ESG
        };
    });

    // Arrays para normalização
    const listLucro = metricasBrutas.map(m => m.lucro);
    const listShare = metricasBrutas.map(m => m.share);
    const listPD = metricasBrutas.map(m => m.pd);
    const listSaude = metricasBrutas.map(m => m.saude);
    const listOrg = metricasBrutas.map(m => m.org);

    // Pesos Base (do SimuladorForm)
    const pesoBaseLucro = simulacao.Peso_IDG_Lucro || 0.30;
    const pesoBaseShare = simulacao.Peso_IDG_Share || 0.30;
    const pesoBasePD = simulacao.Peso_IDG_PD || 0.20;
    const pesoBaseSaude = simulacao.Peso_IDG_Saude_Financeira || 0.20;

    // Lógica de Pesos Ajustados por Estratégia
    const getPesosEstrategicos = (estrategia) => {
        let mL = 1, mS = 1, mP = 1, mH = 1;
        
        switch(estrategia) {
            case 'rentabilidade': 
                mL = 1.5; mH = 1.2; mS = 0.7; mP = 0.8; 
                break;
            case 'mercado':
                mS = 1.5; mL = 0.8; mP = 0.8; mH = 0.9;
                break;
            case 'inovacao':
                mP = 1.5; mL = 0.8; mS = 0.8; mH = 1.0;
                break;
            default: break; // Padrão
        }
        
        const pL = pesoBaseLucro * mL;
        const pS = pesoBaseShare * mS;
        const pP = pesoBasePD * mP;
        const pH = pesoBaseSaude * mH;
        
        // Normaliza para soma = 1.0
        const total = pL + pS + pP + pH;
        return { 
            l: pL/total, 
            s: pS/total, 
            p: pP/total, 
            h: pH/total,
            est: estrategia 
        };
    };

    dadosProcessamento.forEach(empresa => {
        const metrica = metricasBrutas.find(m => m.id === empresa.id);
        
        // Pega estratégia do documento da empresa
        const estrategia = empresa.dadosEmpresa.Estrategia || 'padrao';
        const pesos = getPesosEstrategicos(estrategia);

        // Notas normalizadas (0-100)
        const notaLucro = normalizarMetrica(metrica.lucro, listLucro);
        const notaShare = normalizarMetrica(metrica.share, listShare);
        const notaPD = normalizarMetrica(metrica.pd, listPD);
        const notaSaude = normalizarMetrica(metrica.saude, listSaude);
        
        // Bônus Org (Aditivo) - Estratégia Inovação ganha mais bônus aqui
        const fatorBonus = (estrategia === 'inovacao') ? 1.5 : 1.0;
        const notaOrg = normalizarMetrica(metrica.org, listOrg) * 0.10 * fatorBonus; // Max 10-15 pts extras

        const scoreFinal = (notaLucro * pesos.l) + 
                           (notaShare * pesos.s) + 
                           (notaPD * pesos.p) + 
                           (notaSaude * pesos.h) + 
                           notaOrg;

        empresa.estadoNovo.IDG_Score = scoreFinal;
        empresa.estadoNovo.IDG_Metricas = {
            lucro: { valor: metrica.lucro, nota: notaLucro * pesos.l },
            share: { valor: metrica.share, nota: notaShare * pesos.s },
            pd: { valor: metrica.pd, nota: notaPD * pesos.p },
            saude: { valor: metrica.saude, nota: notaSaude * pesos.h },
            org: { valor: metrica.org, nota: notaOrg },
            estrategia: estrategia // Salva para referência
        };
    });


    // --- FASE 5: Persistência ---
    console.log("[M3][F6] Salvando...");
    const batch = writeBatch(db);

    for (const empresa of dadosProcessamento) {
        // Salva Estado
        const estadoRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresa.id, 'estados', proximaRodada.toString());
        batch.set(estadoRef, empresa.estadoNovo);

        // Cria Placeholder Decisão Futura (se não acabou)
        if (proximaRodada < (simulacao.Total_Rodadas || 0)) {
            const decisaoFuturaRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresa.id, 'decisoes', (proximaRodada + 1).toString());
            batch.set(decisaoFuturaRef, { 
                Rodada: (proximaRodada + 1), 
                Status_Decisao: 'Pendente',
                // Placeholders para campos novos
                Producao_Planejada_S1: 0, Producao_Planejada_S2: 0,
                Escolha_Fornecedor_S1_Tela: '', Escolha_Fornecedor_S2_Tela: ''
            });
        }
    }

    // Atualiza Simulação
    const simRef = doc(db, simulacoesCollectionPath, simulacaoId);
    let novoStatus = `Aguardando Decisões da Rodada ${proximaRodada + 1}`;
    if (proximaRodada >= (simulacao.Total_Rodadas || 0)) {
        novoStatus = `Finalizada - Rodada ${proximaRodada}`;
    }
    batch.update(simRef, {
        Status: novoStatus,
        Rodada_Atual: proximaRodada
    });

    await batch.commit();
    console.log(`[M3] Rodada ${proximaRodada} concluída.`);
    return { sucesso: true, rodadaProcessada: proximaRodada };
}