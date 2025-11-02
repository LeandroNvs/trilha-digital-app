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
/**
 * Previne que preços irreais (outliers) distorçam a normalização linear.
 * Encontra a mediana e define um "teto" (cap) para a normalização.
 * @param {number[]} precos - A lista de preços original.
 * @param {number} multiplicadorCap - Quantas vezes acima da mediana é considerado "irreal".
 * @returns {number[]} - A lista de preços "higienizada" para normalização.
 */
function higienizarPrecosOutliers(precos, multiplicadorCap = 5) {
    // Filtra preços 0, Infinity ou inválidos, que não devem entrar no cálculo da mediana
    const precosValidos = precos.filter(p => p > 0 && isFinite(p));

    if (precosValidos.length === 0) {
        // Retorna uma lista que faz com que normalizarValor retorne 0 ou 1, sem quebrar
        return precos.map(() => 1); 
    }
    
    precosValidos.sort((a, b) => a - b);
    
    // Calcula a mediana
    const mid = Math.floor(precosValidos.length / 2);
    const mediana = precosValidos.length % 2 !== 0 
        ? precosValidos[mid] 
        : (precosValidos[mid - 1] + precosValidos[mid]) / 2;

    // Define o "teto de sanidade"
    // Um preço não pode ser mais que X vezes a mediana para fins de cálculo.
    // Garante que o teto seja pelo menos o maior preço "válido" (caso haja poucos concorrentes)
    const tetoSanidadeBase = mediana * multiplicadorCap;
    const tetoSanidade = Math.max(tetoSanidadeBase, precosValidos[precosValidos.length - 1]);


    // Mapeia a lista original, "capando" os valores irreais
    return precos.map(p => {
        if (!isFinite(p) || p === 0) return Infinity; // Mantém a lógica de p=0 dar nota 0
        if (p > tetoSanidade) return tetoSanidade; // "Capa" o outlier
        return p; // Preço normal
    });
}
// --- FIM DA NOVA FUNÇÃO ---


/**
 * Função principal que processa uma rodada da simulação.
 * @param {string} simulacaoId - O ID da simulação a ser processada.
 * @param {object} simulacao - O objeto de dados da simulação (parâmetros).
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
            // Objeto para construir o NOVO estado (resultados da R1 ou R)
            estadoNovo: {
                Rodada: proximaRodada,
                // Inicializa acumuladores financeiros da rodada
                Despesas_Juros_CP: 0,
                Despesas_Juros_Emergencia: 0,
                Despesas_Juros_LP: 0,
                Despesas_Operacionais_Outras: 0, // Custo Fixo, P&D, Mkt
                Vendas_Receita: 0,
                Custo_Produtos_Vendidos: 0,
                Lucro_Bruto: 0,
                Lucro_Operacional: 0, // EBITDA (aproximado, pois inclui juros)
                Lucro_Liquido: 0,
                // Inicializa outros campos que serão calculados
                Caixa: estadoAtualSnap.data().Caixa || 0, // Começa com o caixa do fim da rodada anterior
                Divida_CP: 0, // Será definido pelos empréstimos tomados NESTA rodada
                Divida_Emergencia: 0, // Será definido se necessário NESTA rodada
                Divida_LP_Saldo: estadoAtualSnap.data().Divida_LP_Saldo || 0,
                Divida_LP_Rodadas_Restantes: estadoAtualSnap.data().Divida_LP_Rodadas_Restantes || 0,
                Noticia_Financeira_Emergencia: null // NOVO: Para alertar o aluno sobre o empréstimo forçado
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


    // --- RF 3.2: Fase 1 - Atualizações Financeiras (Dívidas, Juros, Investimentos) ---
    console.log("[M3][F1] Iniciando Fase 1: Finanças (Dívidas, Juros) e Investimentos (CAPEX, P&D, Mkt)");

    dadosProcessamento.forEach(empresa => {
        const { estadoAtual, decisoes, estadoNovo } = empresa;
        let caixa = estadoNovo.Caixa; // Usa uma variável local para facilitar os cálculos sequenciais
        let logFinanceiro = [`[${empresa.id}] R${proximaRodada}`]; // Log para debug

        // --- 1. PAGAMENTOS OBRIGATÓRIOS (Início da Rodada) ---
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
                const jurosEmergParaShortfall = shortfall * taxaJurosEmergencia; // Juros já na R+1
                estadoNovo.Divida_Emergencia = shortfall; // Registra a nova dívida de emergência
                caixa = 0; // Caixa zera
                estadoNovo.Despesas_Juros_CP += jurosCP; // Juros do CP são devidos
                estadoNovo.Despesas_Juros_Emergencia += jurosEmergParaShortfall; // Juros da emergência tbm
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
                 // Situação crítica: Não consegue pagar nem a parcela LP após CP/Emerg.
                 // O motor atual não força emergência para LP, mas registra o problema.
                 // Poderia adicionar lógica de falência aqui. Por ora, apenas loga e caixa fica negativo.
                 console.warn(`[${empresa.id}] R${proximaRodada}: Caixa ${caixa} insuficiente para Parcela LP ${parcelaLP}. Caixa ficará negativo.`);
                 logFinanceiro.push(`!!! ATENÇÃO !!! Caixa insuficiente para Parcela LP (${parcelaLP.toLocaleString('pt-BR')}).`);

            }
            caixa -= parcelaLP;
            estadoNovo.Despesas_Juros_LP += jurosLP;
            saldoLPAtual -= amortizacaoLPObrigatoria; // Reduz saldo principal
            rodadasLPRestantes -= 1;
            logFinanceiro.push(`Pagou Parcela LP ${simulacao.Prazo_Fixo_Longo_Prazo - rodadasLPRestantes}/${simulacao.Prazo_Fixo_Longo_Prazo}: ${parcelaLP.toLocaleString('pt-BR')} (A:${amortizacaoLPObrigatoria.toLocaleString('pt-BR')}, J:${jurosLP.toLocaleString('pt-BR')}). Saldo LP: ${saldoLPAtual.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        } else {
             // Zera se acabou o prazo ou saldo
             saldoLPAtual = 0;
             rodadasLPRestantes = 0;
        }

        // --- 2. ENTRADAS E SAÍDAS DECIDIDAS NA RODADA ---

        // a) Amortização Adicional de LP
        const amortizarLPAdicional = Math.max(0, Math.min(decisoes.Amortizar_Divida_LP || 0, saldoLPAtual)); // Não pode amortizar mais que o saldo
        if (amortizarLPAdicional > 0) {
              if (caixa < amortizarLPAdicional) {
                   console.warn(`[${empresa.id}] R${proximaRodada}: Caixa ${caixa} insuficiente para Amortização LP Adicional ${amortizarLPAdicional}. Amortização cancelada.`);
                   logFinanceiro.push(`!!! CANCELADO !!! Amortização LP Adicional (${amortizarLPAdicional.toLocaleString('pt-BR')}) por falta de caixa.`);
              } else {
                   caixa -= amortizarLPAdicional;
                   saldoLPAtual -= amortizarLPAdicional; // Reduz saldo principal
                   logFinanceiro.push(`Amortizou LP Adicional: ${amortizarLPAdicional.toLocaleString('pt-BR')}. Saldo LP: ${saldoLPAtual.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
                    // Se quitou a dívida LP antecipadamente
                   if (saldoLPAtual <= 0) {
                        saldoLPAtual = 0;
                        rodadasLPRestantes = 0;
                        logFinanceiro.push(`Dívida LP Quitada antecipadamente.`);
                   }
              }
        }

        // b) Novos Empréstimos (Adiciona ao caixa e às dívidas correspondentes)
        const novoCP = decisoes.Tomar_Emprestimo_CP || 0;
        if (novoCP > 0) {
            caixa += novoCP;
            estadoNovo.Divida_CP += novoCP; // Adiciona à dívida CP que vencerá na R+2
            logFinanceiro.push(`Tomou CP: ${novoCP.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        }
        const novoLP = decisoes.Tomar_Financiamento_LP || 0;
        if (novoLP > 0) {
            caixa += novoLP;
            saldoLPAtual += novoLP; // Adiciona ao saldo devedor LP
            rodadasLPRestantes = prazoFixoLP; // REINICIA o prazo para o novo saldo total
            logFinanceiro.push(`Tomou LP: ${novoLP.toLocaleString('pt-BR')}. Novo Saldo LP: ${saldoLPAtual.toLocaleString('pt-BR')}. Prazo resetado para ${prazoFixoLP} R. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        }

        // c) Investimentos (P&D, Expansão, Marketing) - Saem do caixa e entram como Despesa Operacional
        let investCamera = decisoes.Invest_PD_Camera || 0;
        let investBateria = decisoes.Invest_PD_Bateria || 0;
        let investSOeIA = decisoes.Invest_PD_Sist_Operacional_e_IA || 0; // RENOMEADO
        let investAtualGeral = decisoes.Invest_PD_Atualizacao_Geral || 0; // NOVO
        
        const totalInvestPD = investCamera + investBateria + investSOeIA + investAtualGeral; // ATUALIZADO
        caixa -= totalInvestPD;
        estadoNovo.Despesas_Operacionais_Outras += totalInvestPD;
        logFinanceiro.push(`Investiu P&D: ${totalInvestPD.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);

        const investExpansao = decisoes.Invest_Expansao_Fabrica || 0;
        caixa -= investExpansao;
        // A despesa de expansão NÃO entra no DRE como OPEX, vira Imobilizado (CAPEX)
        estadoNovo.Imobilizado_Bruto = (estadoAtual.Imobilizado_Bruto || 0) + investExpansao;
        logFinanceiro.push(`Investiu Expansão: ${investExpansao.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);
        // Cálculo da nova capacidade (efeito na próxima rodada, mas calculado aqui)
        estadoNovo.Capacidade_Fabrica = (estadoAtual.Capacidade_Fabrica || 0) +
            Math.floor(investExpansao / (simulacao.Custo_Expansao_Lote || 1)) * (simulacao.Incremento_Capacidade_Lote || 0);


        const totalInvestMkt = (decisoes.Marketing_Segmento_1 || 0) + (decisoes.Marketing_Segmento_2 || 0);
        caixa -= totalInvestMkt;
        estadoNovo.Despesas_Operacionais_Outras += totalInvestMkt;
        estadoNovo.Valor_Marca_Acumulado = (estadoAtual.Valor_Marca_Acumulado || 0) + totalInvestMkt; // Acumula valor da marca
        logFinanceiro.push(`Investiu Mkt: ${totalInvestMkt.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);


        // d) Custo Fixo Operacional (Ajustado pela inflação)
        const taxaInflacaoRodada = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4; // Inflação da rodada
        const custoFixoBase = (simulacao.Custo_Fixo_Operacional || 0);
        const custoFixoCorrigido = custoFixoBase * Math.pow(1 + taxaInflacaoRodada, proximaRodada -1); // Aplica inflação acumulada
        caixa -= custoFixoCorrigido;
        estadoNovo.Despesas_Operacionais_Outras += custoFixoCorrigido;
        logFinanceiro.push(`Custo Fixo: ${custoFixoCorrigido.toLocaleString('pt-BR')}. Caixa: ${caixa.toLocaleString('pt-BR')}`);

        // --- 3. ATUALIZA ESTADO FINANCEIRO FINAL (Antes da Produção/Vendas) ---
        estadoNovo.Caixa = caixa; // Salva o caixa após todas as movimentações da Fase 1
        estadoNovo.Divida_LP_Saldo = saldoLPAtual;
        estadoNovo.Divida_LP_Rodadas_Restantes = rodadasLPRestantes;
        estadoNovo.Depreciacao_Acumulada = (estadoAtual.Depreciacao_Acumulada || 0) + ((estadoNovo.Imobilizado_Bruto || 0) * 0.05); // Depreciação (ex: 5% por rodada sobre Bruto)


        // --- 4. ATUALIZA PROGRESSO P&D (com possível bônus) --- (ATUALIZADO)
        // Aplicar bônus de Rede (RF 2.2): Se escolheu Fornecedor D
        let fatorBonusPD = 1.0;
        if (decisoes.Escolha_Fornecedor_Chip === 'D') {
            fatorBonusPD = 1 + (simulacao.Fornecedor_Chip_D_Bonus_PD_Percent || 0) / 100;
            logFinanceiro.push(`Bônus P&D (Forn D): ${(fatorBonusPD*100-100).toFixed(0)}%`);
        }
        // O investimento efetivo (progresso) é o gasto * fator de bônus
        // Bônus se aplica a Bateria e SO+IA (conforme form)
        const investCameraEfetivo = investCamera * 1.0; // Sem bônus
        const investBateriaEfetivo = investBateria * fatorBonusPD;
        const investSOeIAEfetivo = investSOeIA * fatorBonusPD;
        const investAtualGeralEfetivo = investAtualGeral * 1.0; // Sem bônus

        const calcularNivel = (area, progressoAtual, investimentoEfetivo) => {
            const progressoTotal = (progressoAtual || 0) + investimentoEfetivo;
            let nivelAtual = estadoAtual[`Nivel_PD_${area}`] || 1;
            let novoNivel = nivelAtual;

            // Refatorando a lógica de nível:
            const custosNivel = [0, 0]; // Nível 0 e 1 têm custo 0 para atingir
            for(let n=2; n<=5; n++) {
                custosNivel[n] = simulacao[`Custo_PD_${area}_Nivel_${n}`] || Infinity;
            }

            // Verifica a partir do nível atual + 1
            for (let proximo = nivelAtual + 1; proximo <= 5; proximo++) {
                if (progressoTotal >= custosNivel[proximo]) {
                    novoNivel = proximo; // Atingiu o próximo nível
                } else {
                    break; // Não atingiu, para a verificação
                }
            }

            // Log de mudança de nível
            if (novoNivel > nivelAtual) {
                 logFinanceiro.push(`P&D ${area}: Nível ${nivelAtual} -> ${novoNivel}! (Prog: ${progressoTotal.toLocaleString('pt-BR')})`);
            }

            return { nivel: novoNivel, progresso: progressoTotal };
        };

        const { nivel: nivelCamera, progresso: progressoCamera } = calcularNivel('Camera', estadoAtual.Progresso_PD_Camera, investCameraEfetivo);
        const { nivel: nivelBateria, progresso: progressoBateria } = calcularNivel('Bateria', estadoAtual.Progresso_PD_Bateria, investBateriaEfetivo);
        // RENOMEADO
        const { nivel: nivelSOeIA, progresso: progressoSOeIA } = calcularNivel('Sist_Operacional_e_IA', estadoAtual.Progresso_PD_Sist_Operacional_e_IA, investSOeIAEfetivo);
        // NOVO
        const { nivel: nivelAtualGeral, progresso: progressoAtualGeral } = calcularNivel('Atualizacao_Geral', estadoAtual.Progresso_PD_Atualizacao_Geral, investAtualGeralEfetivo);
        
        estadoNovo.Nivel_PD_Camera = nivelCamera; estadoNovo.Progresso_PD_Camera = progressoCamera;
        estadoNovo.Nivel_PD_Bateria = nivelBateria; estadoNovo.Progresso_PD_Bateria = progressoBateria;
        estadoNovo.Nivel_PD_Sist_Operacional_e_IA = nivelSOeIA; estadoNovo.Progresso_PD_Sist_Operacional_e_IA = progressoSOeIA; // RENOMEADO
        estadoNovo.Nivel_PD_Atualizacao_Geral = nivelAtualGeral; estadoNovo.Progresso_PD_Atualizacao_Geral = progressoAtualGeral; // NOVO

        console.log(logFinanceiro.join(' | ')); // Imprime o log financeiro da empresa

    }); // Fim do loop forEach empresa para Fase 1

    // --- RF 3.3: Fase 2 - Produção e Risco de Rede (Operações) ---
    console.log("[M3][F2] Iniciando Fase 2: Produção, Risco de Rede e CPV");
    dadosProcessamento.forEach(empresa => {
        const { estadoAtual, decisoes, estadoNovo } = empresa;
        let producaoEfetiva = decisoes.Producao_Planejada || 0;
        let noticiaRisco = null;
        const capacidadeAtualNaRodada = estadoAtual.Capacidade_Fabrica || 0; // Capacidade no início da rodada

        // Valida produção vs capacidade ATUAL (não a futura)
        if (producaoEfetiva > capacidadeAtualNaRodada) {
            producaoEfetiva = capacidadeAtualNaRodada;
            noticiaRisco = `Produção planejada (${(decisoes.Producao_Planejada || 0).toLocaleString('pt-BR')}) excedeu a capacidade atual (${capacidadeAtualNaRodada.toLocaleString('pt-BR')}). Produção limitada.`;
            console.warn(`[${empresa.id}] R${proximaRodada}: ${noticiaRisco}`);
        }

        // Simulação de Risco (Fornecedor A)
        // USA OS PARÂMETROS DO FORM
        const riscoFornecedorA = (simulacao.Fornecedor_Tela_A_Desc.includes("20%")) ? 0.20 : 0; // Exemplo simplificado, ideal é ter campos numéricos
        const perdaFornecedorA = (simulacao.Fornecedor_Tela_A_Desc.includes("15%")) ? 0.15 : 0; // Exemplo simplificado
        
        if (decisoes.Escolha_Fornecedor_Tela === 'A' && Math.random() < riscoFornecedorA) {
            const perda = Math.floor(producaoEfetiva * perdaFornecedorA);
            producaoEfetiva -= perda;
            noticiaRisco = `Seu Fornecedor de Telas (A) falhou na entrega, resultando em uma perda de ${perda.toLocaleString('pt-BR')} unidades (${(perdaFornecedorA*100).toFixed(0)}%) da sua produção planejada.`;
            console.log(`[${empresa.id}] R${proximaRodada}: ${noticiaRisco}`);
        }
        estadoNovo.Noticia_Producao_Risco = noticiaRisco;
        estadoNovo.Producao_Efetiva = producaoEfetiva;

        // Cálculo do Custo de Produção (CPV)
        const custoTela = (decisoes.Escolha_Fornecedor_Tela === 'A') ? (simulacao.Fornecedor_Tela_A_Custo || 0) : (simulacao.Fornecedor_Tela_B_Custo || 0);
        const custoChip = (decisoes.Escolha_Fornecedor_Chip === 'C') ? (simulacao.Fornecedor_Chip_C_Custo || 0) : (simulacao.Fornecedor_Chip_D_Custo || 0);
        const custoBaseComponentes = custoTela + custoChip;
        const custoVariavelMontagemBase = (simulacao.Custo_Variavel_Montagem_Base || 0);
        // Aplica inflação ao custo de montagem
        const taxaInflacaoRodada = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4;
        const custoVariavelMontagemCorrigido = custoVariavelMontagemBase * Math.pow(1 + taxaInflacaoRodada, proximaRodada - 1);
        const custoVariavelUnitario = custoVariavelMontagemCorrigido + custoBaseComponentes;

        const cpvTotalProducao = producaoEfetiva * custoVariavelUnitario;

        // --- ATUALIZAÇÃO: Verifica se há caixa para produção ---
        if (estadoNovo.Caixa < cpvTotalProducao) {
            const shortfall = cpvTotalProducao - estadoNovo.Caixa;
            estadoNovo.Divida_Emergencia += shortfall; // Adiciona o shortfall à dívida de emergência
            
            const msgAlerta = `!!! EMERGÊNCIA (Produção) !!! Caixa ${estadoNovo.Caixa.toLocaleString('pt-BR')} insuficiente para Custo Produção ${cpvTotalProducao.toLocaleString('pt-BR')}. Empréstimo de Emergência de ${shortfall.toLocaleString('pt-BR')} contraído.`;
            
            console.warn(`[${empresa.id}] R${proximaRodada}: ${msgAlerta}`);
            
            // Adiciona a notícia para o aluno ver na próxima rodada
            estadoNovo.Noticia_Financeira_Emergencia = `Caixa insuficiente (${estadoNovo.Caixa.toLocaleString('pt-BR')}) para cobrir custos de produção (${cpvTotalProducao.toLocaleString('pt-BR')}). Um Empréstimo de Emergência de ${shortfall.toLocaleString('pt-BR')} foi contraído automaticamente com juros punitivos.`;
        }
        
        // Subtrai CPV do Caixa (o caixa PODE ficar negativo, mas a Dívida de Emergência foi registrada)
        estadoNovo.Caixa -= cpvTotalProducao;
        console.log(`[${empresa.id}] R${proximaRodada}: Produziu ${producaoEfetiva.toLocaleString('pt-BR')} unid. Custo Unit: ${custoVariavelUnitario.toFixed(2)}. CPV Total: ${cpvTotalProducao.toLocaleString('pt-BR')}. Caixa: ${estadoNovo.Caixa.toLocaleString('pt-BR')}`);

        // Atualiza Estoque
        estadoNovo.Unidades_Em_Estoque = (estadoAtual.Estoque_Final_Unidades || 0) + producaoEfetiva;
        estadoNovo.Custo_Variavel_Unitario_Medio = custoVariavelUnitario; // Assume FIFO ou Média simples por ora
        estadoNovo.CPV_Total_Producao_Rodada = cpvTotalProducao; // Guarda o custo da produção da rodada
    });

    // --- RF 3.4: Fase 3 - Simulação de Mercado (ATUALIZADO) ---
    console.log("[M3][F3] Iniciando Fase 3: Simulação de Mercado");
    // (Busca de demandas permanece igual)
    const demandaPremium = simulacao[`Segmento1_Demanda_Rodada_${proximaRodada}`] || 0;
    const demandaMassa = simulacao[`Segmento2_Demanda_Rodada_${proximaRodada}`] || 0;
    
    // Pesos Premium
    const pesoPDPremium = simulacao[`Peso_PD_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoMktPremium = simulacao[`Peso_Mkt_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoPrecoPremium = simulacao[`Peso_Preco_Premium_Rodada_${proximaRodada}`] || 0;
    // Pesos P&D (dentro do Premium)
    const pesoPDCameraPremium = simulacao[`Peso_PD_Camera_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoPDBateriaPremium = simulacao[`Peso_PD_Bateria_Premium_Rodada_${proximaRodada}`] || 0;
    const pesoPDSOeIAPremium = simulacao[`Peso_PD_Sist_Operacional_e_IA_Premium_Rodada_${proximaRodada}`] || 0; // RENOMEADO
    
    // Pesos Básico (Massa)
    const pesoPDMassa = simulacao[`Peso_PD_Massa_Rodada_${proximaRodada}`] || 0; // NOVO
    const pesoMktMassa = simulacao[`Peso_Mkt_Massa_Rodada_${proximaRodada}`] || 0;
    const pesoPrecoMassa = simulacao[`Peso_Preco_Massa_Rodada_${proximaRodada}`] || 0;

    // --- BLOCO CORRIGIDO (HIGIENIZAÇÃO DE PREÇOS) ---
    // 1. Pega os preços brutos
    const precosBrutosPremium = dadosProcessamento.map(e => e.decisoes.Preco_Segmento_1 || 0);
    const precosBrutosMassa = dadosProcessamento.map(e => e.decisoes.Preco_Segmento_2 || 0);

    // 2. Define o multiplicador de sanidade (quantas vezes acima da mediana é irreal)
    const multiplicadorCap = 5.0; 

    // 3. Higieniza as listas de preços para usar na normalização
    const precosHigienizadosPremium = higienizarPrecosOutliers(precosBrutosPremium, multiplicadorCap);
    const precosHigienizadosMassa = higienizarPrecosOutliers(precosBrutosMassa, multiplicadorCap);
    
    // 4. Listas de Marketing (inalteradas)
    const mktPremium = dadosProcessamento.map(e => e.decisoes.Marketing_Segmento_1 || 0);
    const mktMassa = dadosProcessamento.map(e => e.decisoes.Marketing_Segmento_2 || 0);
    
    // 5. NOVO: Lista de P&D Básico
    const niveisAtualGeral = dadosProcessamento.map(e => e.estadoNovo.Nivel_PD_Atualizacao_Geral || 1);

    let somaAtratividadePremium = 0; let somaAtratividadeMassa = 0;
    // --- FIM DO BLOCO CORRIGIDO ---


    dadosProcessamento.forEach(empresa => {
        const { estadoNovo, decisoes } = empresa;
        // --- Cálculo Atratividade Premium (ATUALIZADO) ---
        // Cálculo de P&D Premium
        const nPD_Cam = (estadoNovo.Nivel_PD_Camera || 1) * pesoPDCameraPremium;
        const nPD_Bat = (estadoNovo.Nivel_PD_Bateria || 1) * pesoPDBateriaPremium;
        const nPD_SOeIA = (estadoNovo.Nivel_PD_Sist_Operacional_e_IA || 1) * pesoPDSOeIAPremium; // RENOMEADO
        const nPDTotalPremium = nPD_Cam + nPD_Bat + nPD_SOeIA; // RENOMEADO
        
        // Cálculo de Mkt Premium
        const nMktPrem = aplicarRetornosDecrescentes(normalizarValor(decisoes.Marketing_Segmento_1 || 0, mktPremium));
        
        // Cálculo de Preço Premium
        const nPrecoPrem = normalizarValor(decisoes.Preco_Segmento_1 || Infinity, precosHigienizadosPremium, true); 
        
        // Atratividade Final Premium
        const atrPrem = (nPDTotalPremium * pesoPDPremium) + (nMktPrem * pesoMktPremium) + (nPrecoPrem * pesoPrecoPremium);
        empresa.estadoNovo.Atratividade_Premium = atrPrem > 0 ? atrPrem : 0; // Garante não negativo
        somaAtratividadePremium += empresa.estadoNovo.Atratividade_Premium;

        
        // --- Cálculo Atratividade Básico (Massa) (ATUALIZADO) ---
        // Cálculo de P&D Básico (usa "Atualização Geral")
        // NORMALIZANDO o nível de P&D Básico entre os concorrentes
        const nPDBasico = normalizarValor(estadoNovo.Nivel_PD_Atualizacao_Geral || 1, niveisAtualGeral); // Nota é o nível NORMALIZADO
        
        // Cálculo de Mkt Básico
        const nMktMassa = aplicarRetornosDecrescentes(normalizarValor(decisoes.Marketing_Segmento_2 || 0, mktMassa));
        
        // Cálculo de Preço Básico
        const nPrecoMassa = normalizarValor(decisoes.Preco_Segmento_2 || Infinity, precosHigienizadosMassa, true);
        
        // Atratividade Final Básico (usa novos pesos)
        const atrMassa = (nPDBasico * pesoPDMassa) + (nMktMassa * pesoMktMassa) + (nPrecoMassa * pesoPrecoMassa);
        empresa.estadoNovo.Atratividade_Massa = atrMassa > 0 ? atrMassa : 0; // Garante não negativo
        somaAtratividadeMassa += empresa.estadoNovo.Atratividade_Massa;
    });

    // --- Cálculo de Market Share e Vendas Desejadas (inalterado) ---
    // Garante que a soma da atratividade seja recalculada após o loop (embora já esteja)
    const totalAtratividadePremium = dadosProcessamento.reduce((soma, e) => soma + e.estadoNovo.Atratividade_Premium, 0);
    const totalAtratividadeMassa = dadosProcessamento.reduce((soma, e) => soma + e.estadoNovo.Atratividade_Massa, 0);

    dadosProcessamento.forEach(empresa => {
        const { estadoNovo } = empresa;
        const sharePremium = (totalAtratividadePremium > 0) ? (estadoNovo.Atratividade_Premium / totalAtratividadePremium) : (1 / dadosProcessamento.length);
        estadoNovo.Market_Share_Premium = sharePremium;
        estadoNovo.Vendas_Desejadas_Premium = Math.floor(demandaPremium * sharePremium);
        
        const shareMassa = (totalAtratividadeMassa > 0) ? (estadoNovo.Atratividade_Massa / totalAtratividadeMassa) : (1 / dadosProcessamento.length);
        estadoNovo.Market_Share_Massa = shareMassa;
        estadoNovo.Vendas_Desejadas_Massa = Math.floor(demandaMassa * shareMassa);
        
        console.log(`[${empresa.id}] Atr P:${estadoNovo.Atratividade_Premium.toFixed(2)} M:${estadoNovo.Atratividade_Massa.toFixed(2)} | Share P:${(sharePremium*100).toFixed(1)}% M:${(shareMassa*100).toFixed(1)}% | Vendas Desej P:${estadoNovo.Vendas_Desejadas_Premium} M:${estadoNovo.Vendas_Desejadas_Massa}`);
    });

    // --- RF 3.5: Fase 4 - Alocação de Vendas e Fechamento Financeiro ---
    console.log("[M3][F4] Iniciando Fase 4: Alocação de Vendas e Receita");
    let vendasTotaisSetor = 0;
    dadosProcessamento.forEach(empresa => {
        const { estadoNovo, decisoes } = empresa;
        const vendasDesejadasTotal = estadoNovo.Vendas_Desejadas_Premium + estadoNovo.Vendas_Desejadas_Massa;
        const estoqueDisponivel = estadoNovo.Unidades_Em_Estoque || 0;
        let vendasEfetivasPremium = 0; let vendasEfetivasMassa = 0;
        let noticiaRuptura = null;

        if (estoqueDisponivel >= vendasDesejadasTotal) {
            vendasEfetivasPremium = estadoNovo.Vendas_Desejadas_Premium;
            vendasEfetivasMassa = estadoNovo.Vendas_Desejadas_Massa;
        } else { // Ruptura de Estoque
            noticiaRuptura = `Ruptura de estoque! Demanda total era ${vendasDesejadasTotal.toLocaleString('pt-BR')} unid., mas só ${estoqueDisponivel.toLocaleString('pt-BR')} estavam disponíveis. Vendas perdidas!`;
            console.warn(`[${empresa.id}] R${proximaRodada}: ${noticiaRuptura}`);
            if (vendasDesejadasTotal > 0) {
                // Aloca pro-rata baseado na demanda desejada de cada segmento
                const propPremium = estadoNovo.Vendas_Desejadas_Premium / vendasDesejadasTotal;
                vendasEfetivasPremium = Math.floor(estoqueDisponivel * propPremium);
                vendasEfetivasMassa = estoqueDisponivel - vendasEfetivasPremium; // O restante vai para massa
            }
        }
        estadoNovo.Noticia_Ruptura_Estoque = noticiaRuptura;
        estadoNovo.Vendas_Efetivas_Premium = vendasEfetivasPremium;
        estadoNovo.Vendas_Efetivas_Massa = vendasEfetivasMassa;
        const vendasEfetivasTotal = vendasEfetivasPremium + vendasEfetivasMassa;
        vendasTotaisSetor += vendasEfetivasTotal;

        // Cálculo da Receita
        const receitaPremium = vendasEfetivasPremium * (decisoes.Preco_Segmento_1 || 0);
        const receitaMassa = vendasEfetivasMassa * (decisoes.Preco_Segmento_2 || 0);
        const receitaTotal = receitaPremium + receitaMassa;
        estadoNovo.Caixa += receitaTotal; // Adiciona receita ao caixa
        estadoNovo.Vendas_Receita = receitaTotal; // Guarda para o DRE

        // Atualiza Estoque Final
        const estoqueFinalUnidades = estoqueDisponivel - vendasEfetivasTotal;
        // Assume Custo Médio Ponderado ou FIFO (aqui simplificado usando custo da última produção)
        const custoEstoqueFinal = estoqueFinalUnidades * estadoNovo.Custo_Variavel_Unitario_Medio;
        estadoNovo.Estoque_Final_Unidades = estoqueFinalUnidades;
        estadoNovo.Custo_Estoque_Final = custoEstoqueFinal; // Para o Balanço

        // Calcula CPV Efetivo das Vendas
        const cpvEfetivo = vendasEfetivasTotal * estadoNovo.Custo_Variavel_Unitario_Medio;
        estadoNovo.Custo_Produtos_Vendidos = cpvEfetivo; // Para o DRE

        console.log(`[${empresa.id}] Vendeu P:${vendasEfetivasPremium} M:${vendasEfetivasMassa}. Receita: ${receitaTotal.toLocaleString('pt-BR')}. CPV: ${cpvEfetivo.toLocaleString('pt-BR')}. Estoque Final: ${estoqueFinalUnidades}. Caixa Final: ${estadoNovo.Caixa.toLocaleString('pt-BR')}`);

        // --- RF 3.6: Geração de Relatórios (DRE/Balanço) ---
        estadoNovo.Lucro_Bruto = estadoNovo.Vendas_Receita - estadoNovo.Custo_Produtos_Vendidos;
        // Despesas Operacionais Totais
        const despesasOperacionaisTotais = estadoNovo.Despesas_Operacionais_Outras; // Já inclui Mkt, P&D, Custo Fixo
        
        // Lucro Operacional (EBIT) = Lucro Bruto - Despesas Operacionais (sem juros)
        estadoNovo.Lucro_Operacional_EBIT = estadoNovo.Lucro_Bruto - despesasOperacionaisTotais;

        // Despesas Financeiras Totais
        const despesasFinanceiras = estadoNovo.Despesas_Juros_CP + estadoNovo.Despesas_Juros_Emergencia + estadoNovo.Despesas_Juros_LP;
        
        // Lucro Líquido (sem impostos) = EBIT - Juros
        estadoNovo.Lucro_Liquido = estadoNovo.Lucro_Operacional_EBIT - despesasFinanceiras;
        
        // Lucro Acumulado
        estadoNovo.Lucro_Acumulado = (empresa.estadoAtual.Lucro_Acumulado || 0) + estadoNovo.Lucro_Liquido;

        // Renomeando o campo antigo para clareza (EBT)
        estadoNovo.Lucro_Antes_Taxas = estadoNovo.Lucro_Liquido;


    }); // Fim do loop forEach empresa para Fase 4 e início Fase 5

    // --- RF 3.6 / RF 4.4: Cálculo do Ranking (IDG) --- (ATUALIZADO)
    console.log("[M3][F5] Calculando Ranking (IDG)");
    const metricas = dadosProcessamento.map(emp => {
        const { estadoNovo } = emp;
        const vendasTotais = (estadoNovo.Vendas_Efetivas_Premium || 0) + (estadoNovo.Vendas_Efetivas_Massa || 0);
        
        // Cálculo da Saúde Financeira (Ex: Índice de Liquidez Imediata Modificado)
        const dividaCurtoPrazoTotal = (estadoNovo.Divida_CP || 0) + (estadoNovo.Divida_Emergencia || 0);
        // Se não há dívida CP, saúde é excelente (ex: score 10).
        // Se há dívida CP, score é a cobertura (Caixa / Dívida CP).
        // Se o caixa for 0 ou negativo e houver dívida, o índice é 0.
        const indiceSaude = (dividaCurtoPrazoTotal === 0) 
            ? 10 // Valor alto arbitrário para "saúde perfeita" (sem dívida CP)
            : (Math.max(0, estadoNovo.Caixa || 0) / dividaCurtoPrazoTotal); // Índice de cobertura, mínimo 0

        return {
            id: emp.id,
            lucroAcumulado: estadoNovo.Lucro_Acumulado || 0,
            marketShare: vendasTotaisSetor > 0 ? (vendasTotais / vendasTotaisSetor) : 0,
            // ATUALIZADO: Soma os 4 níveis de P&D
            nivelTotalPD: (estadoNovo.Nivel_PD_Camera || 1) + 
                          (estadoNovo.Nivel_PD_Bateria || 1) + 
                          (estadoNovo.Nivel_PD_Sist_Operacional_e_IA || 1) + 
                          (estadoNovo.Nivel_PD_Atualizacao_Geral || 1),
            saudeFinanceira: indiceSaude, // NOVO
        };
    });
    
    // Função de normalização (0-100)
    const normalizarMetrica = (valor, todosValores) => { 
        const min = Math.min(...todosValores); 
        const max = Math.max(...todosValores); 
        if (min === max) return (valor >= min ? 100 : 0); // Todos iguais (ou só 1), quem tem o valor é 100
        // Para métricas onde negativo é ruim (lucro, saude), ajustamos o min
        const minAjustado = Math.min(min, 0); // Garante que o "piso" seja 0 ou o pior lucro/indice
        const divisor = (max - minAjustado) === 0 ? 1 : (max - minAjustado);
        
        return Math.max(0, ((valor - minAjustado) / divisor) * 100); // Garante 0-100
    };

    const lucros = metricas.map(m => m.lucroAcumulado);
    const shares = metricas.map(m => m.marketShare);
    const pds = metricas.map(m => m.nivelTotalPD);
    const saudes = metricas.map(m => m.saudeFinanceira); // NOVO
    
    // Pesos do IDG (Lidos da simulação)
    const pesoLucro = simulacao.Peso_IDG_Lucro || 0.30;
    const pesoShare = simulacao.Peso_IDG_Share || 0.25;
    const pesoPD = simulacao.Peso_IDG_PD || 0.20;
    const pesoSaude = simulacao.Peso_IDG_Saude_Financeira || 0.25; // NOVO

    dadosProcessamento.forEach(empresa => {
        const metrica = metricas.find(m => m.id === empresa.id);
        const notaLucro = normalizarMetrica(metrica.lucroAcumulado, lucros) * pesoLucro;
        const notaShare = normalizarMetrica(metrica.marketShare, shares) * pesoShare;
        const notaPD = normalizarMetrica(metrica.nivelTotalPD, pds) * pesoPD;
        const notaSaude = normalizarMetrica(metrica.saudeFinanceira, saudes) * pesoSaude; // NOVO
        
        empresa.estadoNovo.IDG_Score = notaLucro + notaShare + notaPD + notaSaude; // ATUALIZADO
        
        empresa.estadoNovo.IDG_Metricas = { 
            lucro: { valor: metrica.lucroAcumulado, nota: notaLucro },
            share: { valor: metrica.marketShare, nota: notaShare },
            pd: { valor: metrica.nivelTotalPD, nota: notaPD },
            saude: { valor: metrica.saudeFinanceira, nota: notaSaude } // ATUALIZADO
        };
         console.log(`[${empresa.id}] IDG: L=${notaLucro.toFixed(1)} S=${notaShare.toFixed(1)} P=${notaPD.toFixed(1)} S=${notaSaude.toFixed(1)} | TOTAL: ${empresa.estadoNovo.IDG_Score.toFixed(1)}`); // ATUALIZADO
    });

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
        
        batch.set(estadoNovoRef, empresa.estadoNovo);

        // Cria o placeholder para as decisões da PRÓXIMA rodada (proximaRodada + 1)
        // Apenas se o jogo não acabou
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

