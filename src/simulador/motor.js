import { db, appId } from '../firebase/config.js';
import { collection, collectionGroup, doc, getDocs, getDoc, writeBatch, query, where, updateDoc } from 'firebase/firestore';

// --- Funções Auxiliares para Cálculo de Atratividade (RF 3.4) ---

function normalizarValor(valor, todosValores, inverter = false) {
    const min = Math.min(...todosValores);
    const max = Math.max(...todosValores);
    if (min === max) { return 1.0; }
    // Previne divisão por zero se max-min for muito pequeno (embora min === max já trate)
    const divisor = (max - min) === 0 ? 1 : (max - min);
    const nota = (valor - min) / divisor;
    return inverter ? (1 - nota) : nota;
}

function aplicarRetornosDecrescentes(notaNormalizada) {
    // Garante que a entrada não seja negativa (o que geraria NaN)
    return Math.sqrt(Math.max(0, notaNormalizada));
}

// --- NOVA FUNÇÃO (HIGIENIZAÇÃO DE OUTLIERS) ---
function higienizarPrecosOutliers(precos, multiplicadorCap = 5) {
    // ... (código inalterado) ...
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
// --- FIM DA NOVA FUNÇÃO ---

// --- FUNÇÃO DE CÁLCULO DE NÍVEL (P&D E ORGANIZACIONAL) ---
// (Reutilizando a função que já existia no seu motor)
const calcularNivel = (area, progressoAtual, investimentoEfetivo, nivelAtual, simulacao, prefixoCusto) => {
    const progressoTotal = (progressoAtual || 0) + investimentoEfetivo;
    let novoNivel = nivelAtual || 1; // Default 1

    const custosNivel = [0, 0]; // Nível 0 e 1 têm custo 0
    for(let n=2; n<=5; n++) {
        // Usa o prefixo para buscar o custo correto (ex: 'Custo_PD_' ou 'Custo_Nivel_')
        custosNivel[n] = simulacao[`${prefixoCusto}${area}_Nivel_${n}`] || Infinity;
    }

    // Verifica a partir do nível atual + 1
    for (let proximo = novoNivel + 1; proximo <= 5; proximo++) {
        if (progressoTotal >= custosNivel[proximo]) {
            novoNivel = proximo; // Atingiu o próximo nível
        } else {
            break; // Não atingiu, para a verificação
        }
    }
    
    return { nivel: novoNivel, progresso: progressoTotal, mudou: novoNivel > nivelAtual };
};
// --- FIM DA FUNÇÃO ---


/**
 * Função principal que processa uma rodada da simulação.
 */
export async function processarRodada(simulacaoId, simulacao) {
    console.log(`--- [M3] INICIANDO PROCESSAMENTO DA RODADA ${simulacao.Rodada_Atual} PARA: ${simulacao.Nome_Simulacao} ---`);

    const rodadaAtual = simulacao.Rodada_Atual; // Rodada cujos resultados foram vistos (ex: 0)
    const proximaRodada = rodadaAtual + 1; // Rodada que está sendo processada (decisões R1 -> resultados R1)
    const simulacoesCollectionPath = `/artifacts/${appId}/public/data/simulacoes`;
    const empresasRef = collection(db, simulacoesCollectionPath, simulacaoId, 'empresas');
    const empresasSnapshot = await getDocs(empresasRef);
    const empresasIds = empresasSnapshot.docs.map(d => d.id);

    let dadosProcessamento = [];

    // --- PRÉ-FASE: Carregar todos os dados ---
    console.log(`[M3][PRE] Carregando dados de ${empresasIds.length} empresas para processar R${proximaRodada}...`);
    for (const empresaId of empresasIds) {
        // Estado da rodada anterior (base para cálculos)
        const estadoAtualRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresaId, 'estados', rodadaAtual.toString());
        const estadoAtualSnap = await getDoc(estadoAtualRef);

        // Decisões tomadas para esta rodada
        const decisaoRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresaId, 'decisoes', proximaRodada.toString());
        const decisaoSnap = await getDoc(decisaoRef);

        // ### ETAPA 4: Buscar a Estratégia Definida pela empresa ###
        const empresaDocRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresaId);
        const empresaDocSnap = await getDoc(empresaDocRef);
        const estrategiaDefinida = empresaDocSnap.data()?.Estrategia_Definida || 'balanceada'; // Default 'balanceada'
        // ### FIM ETAPA 4 ###

        // Validação crucial
        if (!estadoAtualSnap.exists()) {
            throw new Error(`[ERRO] Empresa ${empresaId}: Estado da Rodada ${rodadaAtual} não encontrado.`);
        }
        if (!decisaoSnap.exists() || decisaoSnap.data().Status_Decisao !== 'Submetido') {
            throw new Error(`[ERRO] Empresa ${empresaId}: Decisões da Rodada ${proximaRodada} não encontradas ou não submetidas.`);
        }

        dadosProcessamento.push({
            id: empresaId,
            estadoAtual: estadoAtualSnap.data(), // Dados da R0 (ou R-1)
            decisoes: decisaoSnap.data(), // Decisões para R1 (ou R)
            estrategia: estrategiaDefinida, // ### ETAPA 4: Adiciona estratégia ao objeto
            // Objeto para construir o NOVO estado (resultados da R1 ou R)
            estadoNovo: {
                Rodada: proximaRodada,
                // ... (acumuladores financeiros) ...
                Despesas_Juros_CP: 0,
                Despesas_Juros_Emergencia: 0,
                Despesas_Juros_LP: 0,
                Despesas_Operacionais_Outras: 0, 
                Despesas_Organiz_Capacitacao: 0,
                Despesas_Organiz_Mkt_Institucional: 0,
                Despesas_Organiz_ESG: 0,
                Despesas_Organiz_Qualidade: 0, // Adicionado
                
                Vendas_Receita: 0,
                Custo_Produtos_Vendidos: 0,
                Lucro_Bruto: 0,
                Lucro_Operacional_EBIT: 0, 
                Lucro_Liquido: 0,
                
                Caixa: estadoAtualSnap.data().Caixa || 0, 
                Divida_CP: 0, 
                Divida_Emergencia: 0, 
                Divida_LP_Saldo: estadoAtualSnap.data().Divida_LP_Saldo || 0,
                Divida_LP_Rodadas_Restantes: estadoAtualSnap.data().Divida_LP_Rodadas_Restantes || 0,
                
                Capacitacao_Acumulada: estadoAtualSnap.data().Capacitacao_Acumulada || 0,
                ESG_Acumulado: estadoAtualSnap.data().ESG_Acumulado || 0,
                Valor_Marca_Acumulado: estadoAtualSnap.data().Valor_Marca_Acumulado || 0,

                // Níveis Organizacionais (para cálculo na Fase 1)
                Nivel_Qualidade: estadoAtualSnap.data().Nivel_Qualidade || 1,
                Progresso_Qualidade: estadoAtualSnap.data().Progresso_Qualidade || 0,
                Nivel_Capacitacao: estadoAtualSnap.data().Nivel_Capacitacao || 1, 
                Progresso_Capacitacao: estadoAtualSnap.data().Progresso_Capacitacao || 0,
                Nivel_ESG: estadoAtualSnap.data().Nivel_ESG || 1, 
                Progresso_ESG: estadoAtualSnap.data().Progresso_ESG || 0,

                // ### ETAPA 4: ESTOQUES SEPARADOS ###
                // (O || 0 lida com a Rodada 0, mas precisaremos atualizar gerarRodadaZero)
                Unidades_Em_Estoque_Premium: estadoAtualSnap.data().Unidades_Em_Estoque_Premium || 0,
                Unidades_Em_Estoque_Basico: estadoAtualSnap.data().Unidades_Em_Estoque_Basico || 0,
            }
        });
    }
    console.log("[M3][PRE] Dados carregados.");

    // Busca taxas de juros (convertidas para decimal por rodada)
    const taxaJurosCP = (simulacao.Taxa_Juros_Curto_Prazo || 0) / 100;
    const taxaJurosEmergencia = (simulacao.Taxa_Juros_Emergencia || 0) / 100;
    const taxaJurosLP = (simulacao.Taxa_Juros_Longo_Prazo || 0) / 100;
    const prazoFixoLP = simulacao.Prazo_Fixo_Longo_Prazo || 4;
    console.log(`[M3] Taxas p/ Rodada: CP=${(taxaJurosCP*100).toFixed(1)}%, Emerg=${(taxaJurosEmergencia*100).toFixed(1)}%, LP=${(taxaJurosLP*100).toFixed(1)}%. Prazo LP=${prazoFixoLP} rodadas.`);

    // ### ETAPA 4: Ler limite orçamentário (Aba 9) ###
    const orcamentoOrganizacional = simulacao.Orcamento_Organizacional_Por_Rodada || 0;


    // --- RF 3.2: Fase 1 - Atualizações Financeiras (Dívidas, Juros, Investimentos) ---
    console.log("[M3][F1] Iniciando Fase 1: Finanças (Dívidas, Juros) e Investimentos (CAPEX, P&D, Mkt, Org)");

    dadosProcessamento.forEach(empresa => {
        const { estadoAtual, decisoes, estadoNovo } = empresa;
        let caixa = estadoNovo.Caixa; // Usa uma variável local para facilitar os cálculos sequenciais
        let logFinanceiro = [`[${empresa.id}] R${proximaRodada}`]; // Log para debug

        // --- 1. PAGAMENTOS OBRIGATÓRIOS (Início da Rodada) ---
        // ... (Seu código de pagamento de dívidas, linhas 161-236, está correto e permanece inalterado) ...
        logFinanceiro.push(`Caixa Inicial: ${caixa.toLocaleString('pt-BR')}`);
        // a) Dívida de Emergência da Rodada Anterior
        const dividaEmergAnterior = estadoAtual.Divida_Emergencia || 0;
        if (dividaEmergAnterior > 0) {
            const jurosEmerg = dividaEmergAnterior * taxaJurosEmergencia;
            const pagamentoEmergTotal = dividaEmergAnterior + jurosEmerg;
            caixa -= pagamentoEmergTotal;
            estadoNovo.Despesas_Juros_Emergencia += jurosEmerg;
            logFinanceiro.push(`Pagou Emerg R${rodadaAtual}: ${pagamentoEmergTotal.toLocaleString('pt-BR')} (P:${dividaEmergAnterior.toLocaleString('pt-BR')}, J:${jurosEmerg.toLocaleString('pt-BR')}). Caixa: ${caixa.toLocaleString('pt-BR')}`);
        }
        // b) Dívida de Curto Prazo da Rodada Anterior
        const dividaCPAnterior = estadoAtual.Divida_CP || 0;
        if (dividaCPAnterior > 0) {
            const jurosCP = dividaCPAnterior * taxaJurosCP;
            const pagamentoCPTotal = dividaCPAnterior + jurosCP;
            // c) Verificação de Caixa e Empréstimo de Emergência
            if (caixa < pagamentoCPTotal) {
                const shortfall = pagamentoCPTotal - caixa;
                const jurosEmergParaShortfall = shortfall * taxaJurosEmergencia; 
                estadoNovo.Divida_Emergencia = shortfall; 
                caixa = 0; 
                estadoNovo.Despesas_Juros_CP += jurosCP; 
                estadoNovo.Despesas_Juros_Emergencia += jurosEmergParaShortfall; 
                logFinanceiro.push(`!!! EMERGÊNCIA !!! Não pagou CP R${rodadaAtual} (${pagamentoCPTotal.toLocaleString('pt-BR')}). Shortfall: ${shortfall.toLocaleString('pt-BR')}. Nova Emerg R${proximaRodada}: ${shortfall.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
            } else {
                // Pagamento normal do CP
                caixa -= pagamentoCPTotal;
                estadoNovo.Despesas_Juros_CP += jurosCP;
                logFinanceiro.push(`Pagou CP R${rodadaAtual}: ${pagamentoCPTotal.toLocaleString('pt-BR')} (P:${dividaCPAnterior.toLocaleString('pt-BR')}, J:${jurosCP.toLocaleString('pt-BR')}). Caixa: ${caixa.toLocaleString('pt-BR')}`);
            }
        }
        // d) Parcela da Dívida de Longo Prazo
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
            logFinanceiro.push(`Pagou Parcela LP ${simulacao.Prazo_Fixo_Longo_Prazo - rodadasLPRestantes}/${simulacao.Prazo_Fixo_Longo_Prazo}: ${parcelaLP.toLocaleString('pt-BR')} (A:${amortizacaoLPObrigatoria.toLocaleString('pt-BR')}, J:${jurosLP.toLocaleString('pt-BR')}). Saldo LP: ${saldoLPAtual.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        } else {
             saldoLPAtual = 0;
             rodadasLPRestantes = 0;
        }

        // --- 2. ENTRADAS E SAÍDAS DECIDIDAS NA RODADA ---

        // a) Amortização Adicional de LP
        // ... (Seu código, linhas 239-258, está correto e permanece inalterado) ...
        const amortizarLPAdicional = Math.max(0, Math.min(decisoes.Amortizar_Divida_LP || 0, saldoLPAtual)); 
        if (amortizarLPAdicional > 0) {
              if (caixa < amortizarLPAdicional) {
                   console.warn(`[${empresa.id}] R${proximaRodada}: Caixa ${caixa} insuficiente para Amortização LP Adicional ${amortizarLPAdicional}. Amortização cancelada.`);
                   logFinanceiro.push(`!!! CANCELADO !!! Amortização LP Adicional (${amortizarLPAdicional.toLocaleString('pt-BR')}) por falta de caixa.`);
              } else {
                   caixa -= amortizarLPAdicional;
                   saldoLPAtual -= amortizarLPAdicional; 
                   logFinanceiro.push(`Amortizou LP Adicional: ${amortizarLPAdicional.toLocaleString('pt-BR')}. Saldo LP: ${saldoLPAtual.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
                   if (saldoLPAtual <= 0) {
                        saldoLPAtual = 0;
                        rodadasLPRestantes = 0;
                        logFinanceiro.push(`Dívida LP Quitada antecipadamente.`);
                   }
              }
        }

        // b) Novos Empréstimos (com verificação de limites)
        // ... (Seu código, linhas 261-294, está correto e permanece inalterado) ...
        const ativoCirculante = (estadoAtual.Caixa || 0) + (estadoAtual.Custo_Estoque_Final || 0);
        const patrimonioLiquido = (estadoAtual.Capital_Social || 0) + (estadoAtual.Lucro_Acumulado || 0);

        const limiteCPPercent = (simulacao.Limite_CP_Percent_Ativo_Circulante || 0) / 100;
        const limiteLPPercent = (simulacao.Limite_LP_Percent_Patrimonio_Liquido || 0) / 100;

        const limiteMaxTotalCP = ativoCirculante * limiteCPPercent;
        const limiteMaxTotalLP = patrimonioLiquido * limiteLPPercent;

        // Empréstimo de Curto Prazo
        const novoCP_solicitado = decisoes.Tomar_Emprestimo_CP || 0;
        if (novoCP_solicitado > 0) {
            const espacoParaNovoCP = limiteMaxTotalCP - estadoNovo.Divida_CP;
            const novoCP = Math.max(0, Math.min(novoCP_solicitado, espacoParaNovoCP));
            
            if (novoCP > 0) {
                caixa += novoCP;
                estadoNovo.Divida_CP += novoCP;
                if (novoCP < novoCP_solicitado) {
                    logFinanceiro.push(`Tomou CP (Limitado): ${novoCP.toLocaleString('pt-BR')} de ${novoCP_solicitado.toLocaleString('pt-BR')} solicitados. Limite: ${limiteMaxTotalCP.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
                } else {
                    logFinanceiro.push(`Tomou CP: ${novoCP.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
                }
            }
        }
        // Empréstimo de Longo Prazo
        const novoLP_solicitado = decisoes.Tomar_Financiamento_LP || 0;
        if (novoLP_solicitado > 0) {
            const espacoParaNovoLP = limiteMaxTotalLP - saldoLPAtual;
            const novoLP = Math.max(0, Math.min(novoLP_solicitado, espacoParaNovoLP));

            if (novoLP > 0) {
                caixa += novoLP;
                saldoLPAtual += novoLP;
                rodadasLPRestantes = prazoFixoLP; // REINICIA o prazo
            
                if (novoLP < novoLP_solicitado) {
                    logFinanceiro.push(`Tomou LP (Limitado): ${novoLP.toLocaleString('pt-BR')} de ${novoLP_solicitado.toLocaleString('pt-BR')} solicitados. Limite: ${limiteMaxTotalLP.toLocaleString('pt-BR')}. Novo Saldo LP: ${saldoLPAtual.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
                } else {
                    logFinanceiro.push(`Tomou LP: ${novoLP.toLocaleString('pt-BR')}. Novo Saldo LP: ${saldoLPAtual.toLocaleString('pt-BR')}. Prazo resetado para ${prazoFixoLP} R. Caixa: ${caixa.toLocaleString('pt-BR')}`);
                }
            }
        }

        // c) Investimentos (P&D, Expansão) - (Marketing de Produto movido para seção d)
        let investCamera = decisoes.Invest_PD_Camera || 0;
        let investBateria = decisoes.Invest_PD_Bateria || 0;
        let investSOIA = decisoes.Invest_PD_Sist_Operacional_e_IA || 0;
        let investAtualGeral = decisoes.Invest_PD_Atualizacao_Geral || 0;
        
        const totalInvestPD = investCamera + investBateria + investSOIA + investAtualGeral;
        caixa -= totalInvestPD;
        estadoNovo.Despesas_Operacionais_Outras += totalInvestPD; // P&D entra como Despesa Operacional
        logFinanceiro.push(`Investiu P&D: ${totalInvestPD.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);

        const investExpansao = decisoes.Invest_Expansao_Fabrica || 0;
        caixa -= investExpansao;
        estadoNovo.Imobilizado_Bruto = (estadoAtual.Imobilizado_Bruto || 0) + investExpansao;
        logFinanceiro.push(`Investiu Expansão (CAPEX): ${investExpansao.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        estadoNovo.Capacidade_Fabrica = (estadoAtual.Capacidade_Fabrica || 0) +
            Math.floor(investExpansao / (simulacao.Custo_Expansao_Lote || 1)) * (simulacao.Incremento_Capacidade_Lote || 0);

        // d) (RF 4.2) Orçamento Organizacional (Marketing de Produto + Organizacionais)
        //    (Baseado na Aba 9 do Form e Aba 7 do Painel)
        
        // Gasto com Marketing de Produto (Aba 5 do Painel)
        const totalInvestMkt = (decisoes.Marketing_Segmento_1 || 0) + (decisoes.Marketing_Segmento_2 || 0);
        
        // Gastos Organizacionais (Aba 7 do Painel)
        const investCapacitacao = decisoes.Invest_Organiz_Capacitacao || 0;
        const investQualidade = decisoes.Invest_Organiz_Qualidade || 0; // (Campo novo do Painel)
        const investESG = decisoes.Invest_Organiz_ESG || 0;
        // (Mkt Institucional removido na v10 do painel, mantendo Capacitacao, Qualidade, ESG)

        // Soma total dos gastos que entram no orçamento
        const totalGastoOrcamento = totalInvestMkt + investCapacitacao + investQualidade + investESG;

        let fatorAjusteOrcamento = 1.0;
        if (totalGastoOrcamento > orcamentoOrganizacional) {
            fatorAjusteOrcamento = (orcamentoOrganizacional > 0) ? (orcamentoOrganizacional / totalGastoOrcamento) : 0;
            logFinanceiro.push(`!!! ORÇAMENTO !!! Gasto ${totalGastoOrcamento.toLocaleString('pt-BR')} estourou limite ${orcamentoOrganizacional.toLocaleString('pt-BR')}. Ajustado por ${fatorAjusteOrcamento.toFixed(2)}x`);
        }

        // Aplicar o fator de ajuste a todos os gastos
        const mktEfetivo = totalInvestMkt * fatorAjusteOrcamento;
        const capEfetivo = investCapacitacao * fatorAjusteOrcamento;
        const qualEfetivo = investQualidade * fatorAjusteOrcamento;
        const esgEfetivo = investESG * fatorAjusteOrcamento;

        const totalInvestOrganizEfetivo = capEfetivo + qualEfetivo + esgEfetivo;
        
        // Debitar do caixa os valores EFETIVOS
        caixa -= mktEfetivo;
        caixa -= totalInvestOrganizEfetivo;
        
        // Registrar despesas
        estadoNovo.Despesas_Operacionais_Outras += mktEfetivo; // Mkt Produto entra como Despesa Operacional
        estadoNovo.Despesas_Organiz_Capacitacao = capEfetivo;
        estadoNovo.Despesas_Organiz_Qualidade = qualEfetivo;
        estadoNovo.Despesas_Organiz_ESG = esgEfetivo;
        
        // Atualizar acumuladores
        estadoNovo.Valor_Marca_Acumulado += mktEfetivo; // (Mkt Produto)
        estadoNovo.Capacitacao_Acumulada += capEfetivo;
        estadoNovo.ESG_Acumulado += esgEfetivo;
        // (Assumindo que Qualidade não tem acumulador para IDG, mas sim Nível)
        
        logFinanceiro.push(`Investiu Mkt Produto (Efetivo): ${mktEfetivo.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        logFinanceiro.push(`Investiu Organização (Efetivo): ${totalInvestOrganizEfetivo.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);


        // e) Custo Fixo Operacional (Ajustado pela inflação)
        const taxaInflacaoRodada = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4; 
        const custoFixoBase = (simulacao.Custo_Fixo_Operacional || 0);
        const custoFixoCorrigido = custoFixoBase * Math.pow(1 + taxaInflacaoRodada, proximaRodada - 1); 
        caixa -= custoFixoCorrigido;
        estadoNovo.Despesas_Operacionais_Outras += custoFixoCorrigido; 
        logFinanceiro.push(`Custo Fixo: ${custoFixoCorrigido.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);

        // --- 3. ATUALIZA ESTADO FINANCEIRO FINAL (Antes da Produção/Vendas) ---
        estadoNovo.Caixa = caixa; 
        estadoNovo.Divida_LP_Saldo = saldoLPAtual;
        estadoNovo.Divida_LP_Rodadas_Restantes = rodadasLPRestantes;
        estadoNovo.Depreciacao_Acumulada = (estadoAtual.Depreciacao_Acumulada || 0) + ((estadoNovo.Imobilizado_Bruto || 0) * 0.05); 


        // --- 4. ATUALIZA PROGRESSO P&D (com possível bônus) ---
        let fatorBonusPD = 1.0;
        if (decisoes.Escolha_Fornecedor_Chip === 'D') {
            fatorBonusPD = 1 + (simulacao.Fornecedor_Chip_D_Bonus_PD_Percent || 0) / 100;
            logFinanceiro.push(`Bônus P&D (Forn D): ${(fatorBonusPD*100-100).toFixed(0)}%`);
        }
        
        const investCameraEfetivo = investCamera * fatorBonusPD;
        const investBateriaEfetivo = investBateria * fatorBonusPD;
        const investSOIAEfetivo = investSOIA * fatorBonusPD; 
        const investAtualGeralEfetivo = investAtualGeral; 

        // P&D de Produto
        const { nivel: nivelCamera, progresso: progressoCamera, mudou: mudouCam } = calcularNivel('Camera', estadoAtual.Progresso_PD_Camera, investCameraEfetivo, estadoAtual.Nivel_PD_Camera, simulacao, 'Custo_PD_');
        const { nivel: nivelBateria, progresso: progressoBateria, mudou: mudouBat } = calcularNivel('Bateria', estadoAtual.Progresso_PD_Bateria, investBateriaEfetivo, estadoAtual.Nivel_PD_Bateria, simulacao, 'Custo_PD_');
        const { nivel: nivelSOIA, progresso: progressoSOIA, mudou: mudouSOIA } = calcularNivel('Sist_Operacional_e_IA', estadoAtual.Progresso_PD_Sist_Operacional_e_IA, investSOIAEfetivo, estadoAtual.Nivel_PD_Sist_Operacional_e_IA, simulacao, 'Custo_PD_');
        const { nivel: nivelGeral, progresso: progressoGeral, mudou: mudouGeral } = calcularNivel('Atualizacao_Geral', estadoAtual.Progresso_PD_Atualizacao_Geral, investAtualGeralEfetivo, estadoAtual.Nivel_PD_Atualizacao_Geral, simulacao, 'Custo_PD_');
        
        if(mudouCam) logFinanceiro.push(`P&D Camera: Nível ${estadoAtual.Nivel_PD_Camera} -> ${nivelCamera}!`);
        if(mudouBat) logFinanceiro.push(`P&D Bateria: Nível ${estadoAtual.Nivel_PD_Bateria} -> ${nivelBateria}!`);
        if(mudouSOIA) logFinanceiro.push(`P&D SO/IA: Nível ${estadoAtual.Nivel_PD_Sist_Operacional_e_IA} -> ${nivelSOIA}!`);
        if(mudouGeral) logFinanceiro.push(`P&D Geral: Nível ${estadoAtual.Nivel_PD_Atualizacao_Geral} -> ${nivelGeral}!`);

        estadoNovo.Nivel_PD_Camera = nivelCamera; estadoNovo.Progresso_PD_Camera = progressoCamera;
        estadoNovo.Nivel_PD_Bateria = nivelBateria; estadoNovo.Progresso_PD_Bateria = progressoBateria;
        estadoNovo.Nivel_PD_Sist_Operacional_e_IA = nivelSOIA; estadoNovo.Progresso_PD_Sist_Operacional_e_IA = progressoSOIA;
        estadoNovo.Nivel_PD_Atualizacao_Geral = nivelGeral; estadoNovo.Progresso_PD_Atualizacao_Geral = progressoGeral;

        // P&D Organizacional (usa valores EFETIVOS)
        const { nivel: nivelCap, progresso: progressoCap, mudou: mudouCap } = calcularNivel('Capacitacao', estadoAtual.Progresso_Capacitacao, capEfetivo, estadoAtual.Nivel_Capacitacao, simulacao, 'Custo_Nivel_');
        const { nivel: nivelQual, progresso: progressoQual, mudou: mudouQual } = calcularNivel('Qualidade', estadoAtual.Progresso_Qualidade, qualEfetivo, estadoAtual.Nivel_Qualidade, simulacao, 'Custo_Nivel_');
        const { nivel: nivelESG, progresso: progressoESG, mudou: mudouESG } = calcularNivel('ESG', estadoAtual.Progresso_ESG, esgEfetivo, estadoAtual.Nivel_ESG, simulacao, 'Custo_Nivel_');

        if(mudouCap) logFinanceiro.push(`Org Capacitacao: Nível ${estadoAtual.Nivel_Capacitacao} -> ${nivelCap}!`);
        if(mudouQual) logFinanceiro.push(`Org Qualidade: Nível ${estadoAtual.Nivel_Qualidade} -> ${nivelQual}!`);
        if(mudouESG) logFinanceiro.push(`Org ESG: Nível ${estadoAtual.Nivel_ESG} -> ${nivelESG}!`);

        estadoNovo.Nivel_Capacitacao = nivelCap; estadoNovo.Progresso_Capacitacao = progressoCap;
        estadoNovo.Nivel_Qualidade = nivelQual; estadoNovo.Progresso_Qualidade = progressoQual;
        estadoNovo.Nivel_ESG = nivelESG; estadoNovo.Progresso_ESG = progressoESG;

        console.log(logFinanceiro.join(' | ')); // Imprime o log financeiro da empresa

    }); // Fim do loop forEach empresa para Fase 1

    // --- RF 3.3: Fase 2 - Produção e Risco de Rede (Operações) ---
    console.log("[M3][F2] Iniciando Fase 2: Produção, Risco de Rede e CPV");
    dadosProcessamento.forEach(empresa => {
        const { estadoAtual, decisoes, estadoNovo } = empresa;
        
        // ### ETAPA 4: Ler decisões de produção separadas ###
        let producaoPremium = decisoes.Producao_Planejada_Premium || 0;
        let producaoBasico = decisoes.Producao_Planejada_Basico || 0;
        let producaoTotalPlanejada = producaoPremium + producaoBasico;
        
        let noticiaRisco = null;
        const capacidadeAtualNaRodada = estadoAtual.Capacidade_Fabrica || 0; // Capacidade no início da rodada

        // Valida produção TOTAL vs capacidade ATUAL
        if (producaoTotalPlanejada > capacidadeAtualNaRodada) {
            const fatorAjuste = capacidadeAtualNaRodada / producaoTotalPlanejada;
            producaoPremium = Math.floor(producaoPremium * fatorAjuste);
            producaoBasico = Math.floor(producaoBasico * fatorAjuste);
            producaoTotalPlanejada = producaoPremium + producaoBasico; // Recalcula
            
            noticiaRisco = `Produção total planejada (${(decisoes.Producao_Planejada_Premium + decisoes.Producao_Planejada_Basico).toLocaleString('pt-BR')}) excedeu a capacidade atual (${capacidadeAtualNaRodada.toLocaleString('pt-BR')}). Produção limitada para ${producaoTotalPlanejada.toLocaleString('pt-BR')} unid.`;
            console.warn(`[${empresa.id}] R${proximaRodada}: ${noticiaRisco}`);
        }

        // Simulação de Risco (Fornecedor A) - Assumindo que afeta AMBOS os produtos (fornecedor único)
        const riscoFornecedorA = simulacao.Risco_Fornecedor_A_Prob / 100 || 0.20; 
        const perdaFornecedorA = simulacao.Risco_Fornecedor_A_Perda / 100 || 0.15; 
        if (decisoes.Escolha_Fornecedor_Tela === 'A' && Math.random() < riscoFornecedorA) {
            const perdaPremium = Math.floor(producaoPremium * perdaFornecedorA);
            const perdaBasico = Math.floor(producaoBasico * perdaFornecedorA);
            
            producaoPremium -= perdaPremium;
            producaoBasico -= perdaBasico;
            producaoTotalPlanejada = producaoPremium + producaoBasico;
            
            noticiaRisco = `Seu Fornecedor de Telas (A) falhou na entrega, resultando em uma perda de ${(perdaPremium + perdaBasico).toLocaleString('pt-BR')} unidades (${(perdaFornecedorA*100).toFixed(0)}%) da sua produção planejada.`;
            console.log(`[${empresa.id}] R${proximaRodada}: ${noticiaRisco}`);
        }
        
        estadoNovo.Noticia_Producao_Risco = noticiaRisco;
        estadoNovo.Producao_Efetiva_Premium = producaoPremium;
        estadoNovo.Producao_Efetiva_Basico = producaoBasico;

        // Cálculo do Custo de Produção (CPV) (RF 4.3 - Inflação)
        const custoTela = (decisoes.Escolha_Fornecedor_Tela === 'A') ? (simulacao.Fornecedor_Tela_A_Custo || 0) : (simulacao.Fornecedor_Tela_B_Custo || 0);
        const custoChip = (decisoes.Escolha_Fornecedor_Chip === 'C') ? (simulacao.Fornecedor_Chip_C_Custo || 0) : (simulacao.Fornecedor_Chip_D_Custo || 0);
        const custoBaseComponentes = custoTela + custoChip;
        const custoVariavelMontagemBase = (simulacao.Custo_Variavel_Montagem_Base || 0);
        
        // (Aba 9) Aplica Redução por Capacitação
        const percentReducaoCapacitacao = (simulacao.Reducao_Custo_Montagem_Por_Nivel_Capacitacao_Percent || 0) / 100;
        const fatorReducaoCapacitacao = Math.max(0, 1 - ((estadoNovo.Nivel_Capacitacao - 1) * percentReducaoCapacitacao));
        const custoVariavelMontagemAjustado = custoVariavelMontagemBase * fatorReducaoCapacitacao;

        // Aplica inflação ao custo de montagem
        const taxaInflacaoRodada = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4;
        const custoVariavelMontagemCorrigido = custoVariavelMontagemAjustado * Math.pow(1 + taxaInflacaoRodada, proximaRodada - 1);
        
        const custoVariavelUnitario = custoVariavelMontagemCorrigido + custoBaseComponentes;

        const cpvTotalProducao = producaoTotalPlanejada * custoVariavelUnitario;

        // Subtrai CPV do Caixa
        estadoNovo.Caixa -= cpvTotalProducao;
        console.log(`[${empresa.id}] R${proximaRodada}: Produziu P:${producaoPremium.toLocaleString('pt-BR')} B:${producaoBasico.toLocaleString('pt-BR')}. Custo Unit: ${custoVariavelUnitario.toFixed(2)}. CPV Total: ${cpvTotalProducao.toLocaleString('pt-BR')}. Caixa: ${estadoNovo.Caixa.toLocaleString('pt-BR')}`);

        // ### ETAPA 4: Atualiza Estoques SEPARADOS ###
        estadoNovo.Unidades_Em_Estoque_Premium = (estadoAtual.Unidades_Em_Estoque_Premium || 0) + producaoPremium;
        estadoNovo.Unidades_Em_Estoque_Basico = (estadoAtual.Unidades_Em_Estoque_Basico || 0) + producaoBasico;
        
        estadoNovo.Custo_Variavel_Unitario_Medio = custoVariavelUnitario; // Custo é o mesmo para ambos (por enquanto)
        estadoNovo.CPV_Total_Producao_Rodada = cpvTotalProducao; // Guarda o custo da produção da rodada
    });

    // --- RF 3.4: Fase 3 - Simulação de Mercado (ATUALIZADO RF 4.7) ---
    console.log("[M3][F3] Iniciando Fase 3: Simulação de Mercado");
    // (Busca de demandas e pesos)
    const demandaPremium = simulacao[`Segmento1_Demanda_Rodada_${proximaRodada}`] || 0;
    const demandaMassa = simulacao[`Segmento2_Demanda_Rodada_${proximaRodada}`] || 0;
    // Pesos Premium
    const pesoPDPremium = simulacao[`Peso_PD_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoMktPremium = simulacao[`Peso_Mkt_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoPrecoPremium = simulacao[`Peso_Preco_Premium_Rodada_${proximaRodada}`] || 0;
    // Pesos P&D (Dentro do Premium)
    const pesoPDCameraPremium = simulacao[`Peso_PD_Camera_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoPDBateriaPremium = simulacao[`Peso_PD_Bateria_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoPDSOIAPremium = simulacao[`Peso_PD_Sist_Operacional_e_IA_Premium_Rodada_${proximaRodada}`] || 0; // Nome correto
    // Pesos Massa (Básico)
    const pesoPDGeralMassa = simulacao[`Peso_PD_Massa_Rodada_${proximaRodada}`] || 0; // Nome correto
    const pesoMktMassa = simulacao[`Peso_Mkt_Massa_Rodada_${proximaRodada}`] || 0;
    const pesoPrecoMassa = simulacao[`Peso_Preco_Massa_Rodada_${proximaRodada}`] || 0;

    // (Aba 9) Pesos Organizacionais
    const pesoQualidadePremium = simulacao[`Peso_Qualidade_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoESGPremium = simulacao[`Peso_ESG_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoQualidadeMassa = simulacao[`Peso_Qualidade_Massa_Rodada_${proximaRodada}`] || 0;
    const pesoESGMassa = simulacao[`Peso_ESG_Massa_Rodada_${proximaRodada}`] || 0;


    // --- Bloco de Higienização (inalterado) ---
    const precosBrutosPremium = dadosProcessamento.map(e => e.decisoes.Preco_Segmento_1 || 0);
    const precosBrutosMassa = dadosProcessamento.map(e => e.decisoes.Preco_Segmento_2 || 0);
    const multiplicadorCap = 5.0; 
    const precosHigienizadosPremium = higienizarPrecosOutliers(precosBrutosPremium, multiplicadorCap);
    const precosHigienizadosMassa = higienizarPrecosOutliers(precosBrutosMassa, multiplicadorCap);
    const mktPremium = dadosProcessamento.map(e => e.decisoes.Marketing_Segmento_1 || 0);
    const mktMassa = dadosProcessamento.map(e => e.decisoes.Marketing_Segmento_2 || 0);
    
    // (Aba 9) Listas de Níveis Organizacionais
    const niveisQualidade = dadosProcessamento.map(e => e.estadoNovo.Nivel_Qualidade || 1);
    const niveisESG = dadosProcessamento.map(e => e.estadoNovo.Nivel_ESG || 1);

    let somaAtratividadePremium = 0; let somaAtratividadeMassa = 0;


    dadosProcessamento.forEach(empresa => {
        // (RF 3.4.1) CORREÇÃO: Usa 'estadoNovo' para ler os Níveis de P&D (calculados na Fase 1)
        const { estadoAtual, decisoes, estadoNovo } = empresa; 
        
        // --- Cálculo Atratividade Premium (RF 4.7) ---
        const nPD_Cam = (estadoNovo.Nivel_PD_Camera || 1) * pesoPDCameraPremium;
        const nPD_Bat = (estadoNovo.Nivel_PD_Bateria || 1) * pesoPDBateriaPremium;
        const nPD_SOIA = (estadoNovo.Nivel_PD_Sist_Operacional_e_IA || 1) * pesoPDSOIAPremium; 
        const nPDTotal = nPD_Cam + nPD_Bat + nPD_SOIA; 
        
        const nMktPrem = aplicarRetornosDecrescentes(normalizarValor(decisoes.Marketing_Segmento_1 || 0, mktPremium));
        const nPrecoPrem = normalizarValor(decisoes.Preco_Segmento_1 || Infinity, precosHigienizadosPremium, true); 

        // (Aba 9) Notas Organizacionais
        const nQualidadePrem = normalizarValor(estadoNovo.Nivel_Qualidade || 1, niveisQualidade);
        const nESGPrem = normalizarValor(estadoNovo.Nivel_ESG || 1, niveisESG);

        const atrPrem = (nPDTotal * pesoPDPremium) + 
                        (nMktPrem * pesoMktPremium) + 
                        (nPrecoPrem * pesoPrecoPremium) +
                        (nQualidadePrem * pesoQualidadePremium) + // Adicionado
                        (nESGPrem * pesoESGPremium); // Adicionado
                        
        empresa.estadoNovo.Atratividade_Premium = atrPrem > 0 ? atrPrem : 0; 
        somaAtratividadePremium += empresa.estadoNovo.Atratividade_Premium;

        // --- Cálculo Atratividade Massa (Básico) (RF 4.7) ---
        const nPD_Geral = (estadoNovo.Nivel_PD_Atualizacao_Geral || 1) * pesoPDGeralMassa; 
        const nMktMassa = aplicarRetornosDecrescentes(normalizarValor(decisoes.Marketing_Segmento_2 || 0, mktMassa));
        const nPrecoMassa = normalizarValor(decisoes.Preco_Segmento_2 || Infinity, precosHigienizadosMassa, true);

        // (Aba 9) Notas Organizacionais
        const nQualidadeMassa = normalizarValor(estadoNovo.Nivel_Qualidade || 1, niveisQualidade);
        const nESGMassa = normalizarValor(estadoNovo.Nivel_ESG || 1, niveisESG);
        
        const atrMassa = (nPD_Geral) + // (Já ponderado)
                         (nMktMassa * pesoMktMassa) + 
                         (nPrecoMassa * pesoPrecoMassa) +
                         (nQualidadeMassa * pesoQualidadeMassa) + // Adicionado
                         (nESGMassa * pesoESGMassa); // Adicionado
                         
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

        // ### ETAPA 4: LÓGICA DE VENDA COM ESTOQUES SEPARADOS ###
        const estoqueDispPremium = estadoNovo.Unidades_Em_Estoque_Premium || 0;
        const estoqueDispBasico = estadoNovo.Unidades_Em_Estoque_Basico || 0;
        const vendasDesejadasPremium = estadoNovo.Vendas_Desejadas_Premium || 0;
        const vendasDesejadasBasico = estadoNovo.Vendas_Desejadas_Massa || 0;
        
        let noticiaRupturaPremium = null;
        let noticiaRupturaBasico = null;

        // Venda Premium
        const vendasEfetivasPremium = Math.min(estoqueDispPremium, vendasDesejadasPremium);
        if (vendasEfetivasPremium < vendasDesejadasPremium) {
            noticiaRupturaPremium = `Ruptura de estoque Premium! Demanda era ${vendasDesejadasPremium.toLocaleString('pt-BR')}, mas só ${estoqueDispPremium.toLocaleString('pt-BR')} estavam disponíveis.`;
        }
        
        // Venda Básico
        const vendasEfetivasBasico = Math.min(estoqueDispBasico, vendasDesejadasBasico);
         if (vendasEfetivasBasico < vendasDesejadasBasico) {
            noticiaRupturaBasico = `Ruptura de estoque Básico! Demanda era ${vendasDesejadasBasico.toLocaleString('pt-BR')}, mas só ${estoqueDispBasico.toLocaleString('pt-BR')} estavam disponíveis.`;
        }
        
        // Combina notícias
        if (noticiaRupturaPremium && noticiaRupturaBasico) {
            estadoNovo.Noticia_Ruptura_Estoque = `${noticiaRupturaPremium} ${noticiaRupturaBasico}`;
        } else {
            estadoNovo.Noticia_Ruptura_Estoque = noticiaRupturaPremium || noticiaRupturaBasico;
        }

        estadoNovo.Vendas_Efetivas_Premium = vendasEfetivasPremium;
        estadoNovo.Vendas_Efetivas_Massa = vendasEfetivasBasico;
        const vendasEfetivasTotal = vendasEfetivasPremium + vendasEfetivasBasico;
        vendasTotaisSetor += vendasEfetivasTotal;

        // Cálculo da Receita (inalterado)
        const receitaPremium = vendasEfetivasPremium * (decisoes.Preco_Segmento_1 || 0);
        const receitaMassa = vendasEfetivasBasico * (decisoes.Preco_Segmento_2 || 0);
        const receitaTotal = receitaPremium + receitaMassa;
        estadoNovo.Caixa += receitaTotal; 
        estadoNovo.Vendas_Receita = receitaTotal; 

        // Atualiza Estoque Final (Separado)
        const custoUnitarioMedio = estadoNovo.Custo_Variavel_Unitario_Medio || 0;
        const estoqueFinalPremium = estoqueDispPremium - vendasEfetivasPremium;
        const estoqueFinalBasico = estoqueDispBasico - vendasEfetivasBasico;
        
        estadoNovo.Estoque_Final_Unidades_Premium = estoqueFinalPremium;
        estadoNovo.Estoque_Final_Unidades_Basico = estoqueFinalBasico;
        
        // Custo do Estoque Final (Para Balanço)
        const custoEstoqueFinalPremium = estoqueFinalPremium * custoUnitarioMedio;
        const custoEstoqueFinalBasico = estoqueFinalBasico * custoUnitarioMedio;
        estadoNovo.Custo_Estoque_Final_Premium = custoEstoqueFinalPremium;
        estadoNovo.Custo_Estoque_Final_Basico = custoEstoqueFinalBasico;
        // Mantém um total para cálculos de balanço mais simples
        estadoNovo.Custo_Estoque_Final = custoEstoqueFinalPremium + custoEstoqueFinalBasico; 

        // Calcula CPV Efetivo das Vendas (Total)
        const cpvEfetivo = vendasEfetivasTotal * custoUnitarioMedio;
        estadoNovo.Custo_Produtos_Vendidos = cpvEfetivo; // Para o DRE

        console.log(`[${empresa.id}] Vendeu P:${vendasEfetivasPremium} B:${vendasEfetivasBasico}. Receita: ${receitaTotal.toLocaleString('pt-BR')}. CPV: ${cpvEfetivo.toLocaleString('pt-BR')}. Estoque Final P:${estoqueFinalPremium} B:${estoqueFinalBasico}. Caixa Final: ${estadoNovo.Caixa.toLocaleString('pt-BR')}`);
        // ### FIM ETAPA 4 (Vendas) ###


        // --- RF 3.6: Geração de Relatórios (DRE/Balanço) (ATUALIZADO RF 4.2) ---
        estadoNovo.Lucro_Bruto = estadoNovo.Vendas_Receita - estadoNovo.Custo_Produtos_Vendidos;
        
        const despesasOperacionaisTotais = estadoNovo.Despesas_Operacionais_Outras; // Inclui P&D, Mkt Produto, Custo Fixo
        const despesasOrganizacionaisTotais = estadoNovo.Despesas_Organiz_Capacitacao + estadoNovo.Despesas_Organiz_Mkt_Institucional + estadoNovo.Despesas_Organiz_ESG + estadoNovo.Despesas_Organiz_Qualidade;
        
        estadoNovo.Lucro_Operacional_EBIT = estadoNovo.Lucro_Bruto - despesasOperacionaisTotais - despesasOrganizacionaisTotais;

        const despesasFinanceiras = estadoNovo.Despesas_Juros_CP + estadoNovo.Despesas_Juros_Emergencia + estadoNovo.Despesas_Juros_LP;
        
        estadoNovo.Lucro_Liquido = estadoNovo.Lucro_Operacional_EBIT - despesasFinanceiras;
        
        estadoNovo.Lucro_Acumulado = (empresa.estadoAtual.Lucro_Acumulado || 0) + estadoNovo.Lucro_Liquido;

        estadoNovo.Lucro_Antes_Taxas = estadoNovo.Lucro_Liquido;


    }); // Fim do loop forEach empresa para Fase 4 e início Fase 5

    // --- RF 3.6 / RF 4.4: Cálculo do Ranking (IDG) (ATUALIZADO) ---
    console.log("[M3][F5] Calculando Ranking (IDG)");
    
    // Função de normalização (0-100) (inalterada)
    const normalizarMetrica = (valor, todosValores, inverter = false) => { 
        const min = Math.min(...todosValores); 
        const max = Math.max(...todosValores); 
        if (min === max) return (valor >= min ? 100 : 0);
        // Ajuste para métricas onde negativo é ruim (lucro, PL)
        const minAjustado = Math.min(min, 0); 
        const divisor = (max - minAjustado) === 0 ? 1 : (max - minAjustado);
        let nota = Math.max(0, ((valor - minAjustado) / divisor) * 100);
        return inverter ? (100 - nota) : nota;
    };


    // ### ETAPA 4: CÁLCULO DE MÉTRICAS DINÂMICO ###
    const metricas = dadosProcessamento.map(emp => {
        const { estadoAtual, estadoNovo } = emp;
        const vendasTotais = (estadoNovo.Vendas_Efetivas_Premium || 0) + (estadoNovo.Vendas_Efetivas_Massa || 0);
        
        // Métrica 1: Lucro (inalterado)
        const lucroAcumulado = estadoNovo.Lucro_Acumulado || 0;

        // Métrica 2: Share (inalterado)
        const marketShare = vendasTotaisSetor > 0 ? (vendasTotais / vendasTotaisSetor) : 0;
        
        // Métrica 3: Saúde Financeira (Liquidez Corrente, inalterado)
        const ativoCirculante = (estadoNovo.Caixa || 0) + (estadoNovo.Custo_Estoque_Final || 0);
        const passivoCirculante = (estadoNovo.Divida_CP || 0) + (estadoNovo.Divida_Emergencia || 0);
        const saudeFinanceira = passivoCirculante > 0 ? ativoCirculante / passivoCirculante : (ativoCirculante > 0 ? 999 : 1);

        // Métrica 4: Crescimento (Patrimônio Líquido)
        const ativoTotal = (estadoNovo.Caixa || 0) + 
                           (estadoNovo.Custo_Estoque_Final || 0) + // Usa o total agregado
                           ((estadoNovo.Imobilizado_Bruto || 0) - (estadoNovo.Depreciacao_Acumulada || 0));
        const passivoTotal = (estadoNovo.Divida_CP || 0) + 
                           (estadoNovo.Divida_LP_Saldo || 0) + 
                           (estadoNovo.Divida_Emergencia || 0);
        const patrimonioLiquido = ativoTotal - passivoTotal;

        return {
            id: emp.id,
            lucroAcumulado: lucroAcumulado,
            marketShare: marketShare,
            saudeFinanceira: saudeFinanceira, 
            patrimonioLiquido: patrimonioLiquido, // Nova métrica de "Crescimento"
        };
    });
    
    // Normalizar todas as métricas
    const lucros = metricas.map(m => m.lucroAcumulado);
    const shares = metricas.map(m => m.marketShare);
    const saudes = metricas.map(m => m.saudeFinanceira);
    const patrimonios = metricas.map(m => m.patrimonioLiquido);

    dadosProcessamento.forEach(empresa => {
        const metrica = metricas.find(m => m.id === empresa.id);
        const estrategia = empresa.estrategia; // pego na Pré-Fase
        
        let pL, pS, pC, pSF; // pL=Lucro, pS=Share, pC=Crescimento(PL), pSF=Saúde Financeira

        // Definir pesos com base na estratégia (discutido no Passo 2)
        switch(estrategia) {
            case 'lucratividade':
                pL = 0.7; pS = 0.1; pC = 0.1; pSF = 0.1;
                break;
            case 'market_share':
                pL = 0.1; pS = 0.7; pC = 0.1; pSF = 0.1;
                break;
            case 'crescimento':
                pL = 0.1; pS = 0.1; pC = 0.7; pSF = 0.1;
                break;
            case 'balanceada':
            default:
                pL = 0.3; pS = 0.3; pC = 0.3; pSF = 0.1;
                break;
        }

        const notaLucro = normalizarMetrica(metrica.lucroAcumulado, lucros) * pL;
        const notaShare = normalizarMetrica(metrica.marketShare, shares) * pS;
        const notaPatrimonio = normalizarMetrica(metrica.patrimonioLiquido, patrimonios) * pC;
        const notaSaude = normalizarMetrica(metrica.saudeFinanceira, saudes, false) * pSF; // 'false' = maior liquidez é melhor
        
        empresa.estadoNovo.IDG_Score = notaLucro + notaShare + notaPatrimonio + notaSaude;
        empresa.estadoNovo.IDG_Metricas = { 
            lucro: { valor: metrica.lucroAcumulado, nota: notaLucro, peso: pL },
            share: { valor: metrica.marketShare, nota: notaShare, peso: pS },
            crescimento: { valor: metrica.patrimonioLiquido, nota: notaPatrimonio, peso: pC },
            saude: { valor: metrica.saudeFinanceira, nota: notaSaude, peso: pSF }
        };
         console.log(`[${empresa.id}] IDG (${estrategia}): L=${notaLucro.toFixed(1)} S=${notaShare.toFixed(1)} C=${notaPatrimonio.toFixed(1)} SF=${notaSaude.toFixed(1)} | TOTAL: ${empresa.estadoNovo.IDG_Score.toFixed(1)}`);
    });
    // ### FIM ETAPA 4 (Ranking) ###


    // --- RF 3.6: Fase 5 - Persistência de Dados ---
    console.log("[M3][F5] Salvando resultados no Firestore...");
    const batch = writeBatch(db);
    for (const empresa of dadosProcessamento) {
        // Salva o NOVO estado calculado para a rodada processada (proximaRodada)
        const estadoNovoRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresa.id, 'estados', proximaRodada.toString());
        
        // Limpeza: Remove campos temporários ou desnecessários antes de salvar
        delete empresa.estadoNovo.Atratividade_Premium;
        delete empresa.estadoNovo.Atratividade_Massa;
        delete empresa.estadoNovo.CPV_Total_Producao_Rodada; 
        
        // ### ETAPA 4: Remover o campo de estoque antigo se existir ###
        delete empresa.estadoNovo.Unidades_Em_Estoque; 
        
        batch.set(estadoNovoRef, empresa.estadoNovo);

        // Cria o placeholder para as decisões da PRÓXIMA rodada (proximaRodada + 1)
        if(proximaRodada < (simulacao.Total_Rodadas || 0) ) {
            const decisaoFuturaRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresa.id, 'decisoes', (proximaRodada + 1).toString());
            batch.set(decisaoFuturaRef, { Rodada: (proximaRodada + 1), Status_Decisao: 'Pendente' });
        }
    }
    // Atualiza o status geral da simulação
    const simRef = doc(db, simulacoesCollectionPath, simulacaoId);
    let novoStatusSimulacao = `Aguardando Decisões da Rodada ${proximaRodada + 1}`;
    if(proximaRodada >= (simulacao.Total_Rodadas || 0) ) {
        novoStatusSimulacao = `Finalizada - Rodada ${proximaRodada}`;
    }
    batch.update(simRef, {
        Status: novoStatusSimulacao,
        Rodada_Atual: proximaRodada // Atualiza a rodada atual para a que acabou de ser processada
    });

    await batch.commit(); // Salva todas as alterações no banco de dados
    console.log(`--- [M3] PROCESSAMENTO DA RODADA ${proximaRodada} CONCLUÍDO ---`);

    return { sucesso: true, rodadaProcessada: proximaRodada };
}