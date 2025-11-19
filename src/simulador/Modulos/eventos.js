// src/simulador/modulos/eventos.js

// Lista de possíveis eventos que podem ocorrer no jogo
const CATALOGO_EVENTOS = [
    {
        id: 'boom_economico',
        nome: 'Boom Econômico',
        descricao: 'O mercado está aquecido! A demanda aumentou inesperadamente em 20%.',
        probabilidade: 0.15, // 15% de chance
        aplicar: (params) => {
            // Aumenta demanda dos dois segmentos
            params.fatorDemanda *= 1.2;
            return 'IMPACTO DE MERCADO: Demanda agregada subiu 20%.';
        }
    },
    {
        id: 'crise_cambial',
        nome: 'Crise Cambial',
        descricao: 'A moeda local desvalorizou. O custo dos componentes importados disparou.',
        probabilidade: 0.15,
        aplicar: (params) => {
            // Aumenta custo de Chips e Telas
            const fator = 1.3;
            ['S1', 'S2'].forEach(seg => {
                ['A', 'B'].forEach(opt => {
                    const key = `Fornecedor_${seg}_Tela_${opt}_Custo`;
                    if (params[key]) params[key] *= fator;
                });
                ['C', 'D'].forEach(opt => {
                    const key = `Fornecedor_${seg}_Chip_${opt}_Custo`;
                    if (params[key]) params[key] *= fator;
                });
            });
            return 'IMPACTO DE CUSTO: Insumos importados ficaram 30% mais caros.';
        }
    },
    {
        id: 'greve_logistica',
        nome: 'Greve Geral de Logística',
        descricao: 'Uma greve paralisou o transporte. A capacidade efetiva de produção caiu.',
        probabilidade: 0.10,
        aplicar: (params) => {
            // Reduz a capacidade de produção efetiva nesta rodada (simulado via custo ou limite)
            // Como a capacidade vem do estado da empresa, aqui vamos simular aumentando o Custo Fixo
            // para representar gastos extras com frete aéreo/emergencial.
            params.Custo_Fixo_Operacional *= 1.5;
            return 'IMPACTO OPERACIONAL: Custo Fixo aumentou 50% devido à logística emergencial.';
        }
    },
    {
        id: 'nova_regulamentacao_esg',
        nome: 'Fiscalização ESG Rigorosa',
        descricao: 'O governo aumentou a fiscalização ambiental. Empresas com baixo ESG pagarão multas (simuladas como custo fixo maior).',
        probabilidade: 0.10,
        aplicar: (params) => {
            // Este evento é mais complexo, pois depende do nível da empresa.
            // Aqui aplicamos uma regra geral: o "preço" de não ter ESG sobe.
            // Vamos aumentar o peso do ESG no IDG desta rodada para forçar a priorização.
            // (Assume que existe uma chave de peso para a rodada atual nos params processados)
            // Como o motor usa params específicos por rodada, vamos alterar globalmente para simplificar.
            params.fatorPesoESG = 3.0; // Triplica a importância do ESG no cálculo de atratividade
            return 'IMPACTO DE MERCADO: Consumidores e Governo exigem 3x mais ESG.';
        }
    }
];

export function processarEventosAleatorios(simulacaoBase, rodadaAtual) {
    // Cria uma cópia "superficial" dos parâmetros para não alterar o objeto original do Firestore permanentemente
    // Adiciona fatores multiplicadores base
    const simulacaoModificada = { 
        ...simulacaoBase,
        fatorDemanda: 1.0,
        fatorPesoESG: 1.0
    };

    let noticiasEventos = [];

    // Sorteia eventos
    CATALOGO_EVENTOS.forEach(evento => {
        const chance = Math.random();
        if (chance < evento.probabilidade) {
            const mensagem = evento.aplicar(simulacaoModificada);
            noticiasEventos.push(`[EVENTO] ${evento.nome}: ${evento.descricao} -> ${mensagem}`);
        }
    });

    return {
        simulacaoComEventos: simulacaoModificada,
        noticiasGeradas: noticiasEventos
    };
}