import { collection, doc, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { processarFluxoCaixaInicial, finalizarDemonstrativos } from './modulos/financas';
import { processarNiveis } from './modulos/desenvolvimento';
import { processarOperacoes } from './modulos/producao';
import { processarMercado } from './modulos/mercado';
import { calcularRankingIDG } from './modulos/ranking';
// Importa o novo módulo
import { processarEventosAleatorios } from './modulos/eventos';

export async function processarRodada(simulacaoId, simulacao, db, appId) {
    console.log(`--- [M3-Refactored + Eventos] PROCESSANDO R${simulacao.Rodada_Atual} ---`);

    const rodadaAtual = simulacao.Rodada_Atual; 
    const proximaRodada = rodadaAtual + 1; 
    const simulacoesCollectionPath = `/artifacts/${appId}/public/data/simulacoes`;
    const empresasRef = collection(db, simulacoesCollectionPath, simulacaoId, 'empresas');
    const empresasSnapshot = await getDocs(empresasRef);

    let dadosProcessamento = [];
    let empresasPendentes = [];

    // --- CARREGAMENTO E VALIDAÇÃO (Sem alterações) ---
    for (const empresaDoc of empresasSnapshot.docs) {
        const empresaId = empresaDoc.id;
        const dadosEmpresa = empresaDoc.data();
        const nomeEmpresa = dadosEmpresa.Nome_Empresa || empresaId;

        const estadoAtualRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresaId, 'estados', rodadaAtual.toString());
        const estadoAtualSnap = await getDoc(estadoAtualRef);

        const decisaoRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresaId, 'decisoes', proximaRodada.toString());
        const decisaoSnap = await getDoc(decisaoRef);

        if (!estadoAtualSnap.exists()) {
            throw new Error(`ERRO CRÍTICO: Estado da R${rodadaAtual} não encontrado para a empresa ${nomeEmpresa}.`);
        }

        const decisaoDados = decisaoSnap.exists() ? decisaoSnap.data() : null;
        const isSubmetido = decisaoDados && decisaoDados.Status_Decisao === 'Submetido';

        if (!isSubmetido) {
            empresasPendentes.push(nomeEmpresa);
        }

        if (empresasPendentes.length > 0) continue;

        // Estado Novo (Inicialização Padrão)
        const estadoNovo = {
            Rodada: proximaRodada,
            Despesas_Juros_CP: 0, Despesas_Juros_Emergencia: 0, Despesas_Juros_LP: 0,
            Despesas_Operacionais_Outras: 0, Despesas_Organiz_Capacitacao: 0,
            Despesas_Organiz_Mkt_Institucional: 0, Despesas_Organiz_ESG: 0,
            Vendas_Receita: 0, Custo_Produtos_Vendidos: 0,
            Caixa: estadoAtualSnap.data().Caixa || 0,
            Divida_CP: 0, Divida_Emergencia: 0,
            Divida_LP_Saldo: estadoAtualSnap.data().Divida_LP_Saldo || 0,
            Divida_LP_Rodadas_Restantes: estadoAtualSnap.data().Divida_LP_Rodadas_Restantes || 0,
            Estoque_S1_Unidades: estadoAtualSnap.data().Estoque_S1_Unidades || 0,
            Custo_Estoque_S1: estadoAtualSnap.data().Custo_Estoque_S1 || 0,
            Estoque_S2_Unidades: estadoAtualSnap.data().Estoque_S2_Unidades || 0,
            Custo_Estoque_S2: estadoAtualSnap.data().Custo_Estoque_S2 || 0,
            Imobilizado_Bruto: estadoAtualSnap.data().Imobilizado_Bruto || 0,
            Depreciacao_Acumulada: estadoAtualSnap.data().Depreciacao_Acumulada || 0,
            Capacidade_Fabrica: estadoAtualSnap.data().Capacidade_Fabrica || 0,
            Valor_Marca_Acumulado: estadoAtualSnap.data().Valor_Marca_Acumulado || 0
        };

        dadosProcessamento.push({
            id: empresaId,
            dadosEmpresa,
            estadoAtual: estadoAtualSnap.data(),
            decisoes: decisaoDados,
            estadoNovo
        });
    }

    if (empresasPendentes.length > 0) {
        throw new Error(`Processamento abortado! Pendentes: ${empresasPendentes.join(', ')}`);
    }

    // --- NOVO: PROCESSAMENTO DE EVENTOS ---
    // Gera eventos e obtém uma versão "mutada" dos parâmetros da simulação
    const { simulacaoComEventos, noticiasGeradas } = processarEventosAleatorios(simulacao, proximaRodada);
    
    console.log("Eventos da Rodada:", noticiasGeradas);

    // --- EXECUÇÃO DOS MÓDULOS (Usando simulacaoComEventos) ---
    
    // 1. Finanças (Usa custos potencialmente alterados por eventos)
    dadosProcessamento.forEach(empresa => processarFluxoCaixaInicial(empresa, simulacaoComEventos, proximaRodada));

    // 2. Desenvolvimento
    dadosProcessamento.forEach(empresa => processarNiveis(empresa, simulacaoComEventos));

    // 3. Produção (Usa custos de fornecedores potencialmente alterados)
    dadosProcessamento.forEach(empresa => processarOperacoes(empresa, simulacaoComEventos, proximaRodada));

    // 4. Mercado (Usa demanda potencialmente alterada)
    const totalVendasSetor = processarMercado(dadosProcessamento, simulacaoComEventos, proximaRodada);

    // 5. Contabilidade
    dadosProcessamento.forEach(empresa => finalizarDemonstrativos(empresa));

    // 6. Ranking
    calcularRankingIDG(dadosProcessamento, simulacaoComEventos, totalVendasSetor);

    // --- PERSISTÊNCIA ---
    const batch = writeBatch(db);

    for (const empresa of dadosProcessamento) {
        const estadoRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresa.id, 'estados', proximaRodada.toString());
        batch.set(estadoRef, empresa.estadoNovo);

        if (proximaRodada < (simulacao.Total_Rodadas || 0)) {
            const decisaoFuturaRef = doc(db, simulacoesCollectionPath, simulacaoId, 'empresas', empresa.id, 'decisoes', (proximaRodada + 1).toString());
            batch.set(decisaoFuturaRef, { 
                Rodada: (proximaRodada + 1), 
                Status_Decisao: 'Pendente',
                Producao_Planejada_S1: 0, Producao_Planejada_S2: 0,
                Escolha_Fornecedor_S1_Tela: '', Escolha_Fornecedor_S2_Tela: ''
            });
        }
    }

    // Atualiza Simulação e Adiciona as Notícias Geradas
    const simRef = doc(db, simulacoesCollectionPath, simulacaoId);
    let novoStatus = `Aguardando Decisões da Rodada ${proximaRodada + 1}`;
    if (proximaRodada >= (simulacao.Total_Rodadas || 0)) {
        novoStatus = `Finalizada - Rodada ${proximaRodada}`;
    }

    // Concatena as notícias automáticas com a notícia base da próxima rodada (se houver)
    // As notícias geradas agora (eventos da R+1) devem aparecer no campo Noticia_Rodada_(R+1)
    // Mas cuidado: Se já existir um texto manual lá, não queremos apagar.
    const campoNoticiaFutura = `Noticia_Rodada_${proximaRodada + 1}`;
    const textoManualExistente = simulacao[campoNoticiaFutura] || '';
    const textoFinalNoticia = (textoManualExistente + '\n\n' + noticiasGeradas.join('\n')).trim();

    const updatesSimulacao = {
        Status: novoStatus,
        Rodada_Atual: proximaRodada
    };
    
    // Só grava a notícia se não for a última rodada
    if (proximaRodada < simulacao.Total_Rodadas) {
        updatesSimulacao[campoNoticiaFutura] = textoFinalNoticia;
    }

    batch.update(simRef, updatesSimulacao);

    await batch.commit();
    console.log(`[M3-Refactored] Rodada ${proximaRodada} processada com Eventos.`);
    return { sucesso: true, rodadaProcessada: proximaRodada };
}