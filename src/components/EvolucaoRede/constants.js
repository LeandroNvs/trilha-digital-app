// ============================================================================
// CONSTANTES E REGRAS: EVOLUÇÃO DE REDE (SMARTPHONES DOBRÁVEIS H1 vs H2)
// Modelo Pedagógico: Análise Estratégica, Exposição a Riscos e Ações de Governança
// ============================================================================

export const PONTOS_INICIAIS = {
    caixa: 60,
    controle: 60,
    agilidade: 60
};

export const DESCRICAO_INDICADORES = {
    caixa: {
        id: 'caixa',
        nome: 'Captura e Retenção de Valor',
        subtitulo: 'Eficiência Financeira e Custos de Transação',
        descricao: 'Reflete a retenção de margem, liquidez do projeto, custos de transação e vazamento de valor para terceiros (royalties, capex fabril e margens de canais). Quando tensionada, exige ações de captação de recursos ou renegociação de alianças.',
        corTexto: 'text-amber-400',
        corBg: 'bg-amber-500/20',
        corBorda: 'border-amber-500/50',
        corBarra: 'bg-amber-500',
        alertaExposicao: 'Alta Exposição em Captura de Valor: O projeto demandará aporte financeiro externo, captação de venture capital ou renegociação de custos de transação.'
    },
    controle: {
        id: 'controle',
        nome: 'Soberania e Autonomia Relacional',
        subtitulo: 'Centralidade e Poder de Barganha',
        descricao: 'Reflete a propriedade sobre patentes essenciais, controle da experiência do usuário, dados de telemetria e blindagem contra comoditização. Quando tensionada, exige salvaguardas contratuais contra dependência de nós dominantes.',
        corTexto: 'text-blue-400',
        corBg: 'bg-blue-500/20',
        corBorda: 'border-blue-500/50',
        corBarra: 'bg-blue-500',
        alertaExposicao: 'Alta Exposição em Soberania: A empresa operará com forte dependência de nós externos, exigindo governança de blindagem contratual e multas anti-oportunismo.'
    },
    agilidade: {
        id: 'agilidade',
        nome: 'Dinâmica e Tempo de Resposta',
        subtitulo: 'Flexibilidade Relacional e Time-to-Market',
        descricao: 'Reflete a velocidade de prototipagem, adaptabilidade da cadeia e capacidade de acompanhar os ciclos da concorrência. Quando tensionada, exige comitês ágeis e fast-track de homologação para não gerar obsolescência.',
        corTexto: 'text-emerald-400',
        corBg: 'bg-emerald-500/20',
        corBorda: 'border-emerald-500/50',
        corBarra: 'bg-emerald-500',
        alertaExposicao: 'Alta Exposição em Dinâmica de Resposta: A rigidez dos parceiros históricos pode retardar o lançamento, exigindo forças-tarefa dedicadas e governança ágil.'
    }
};

export const FASES = [
    {
        faseId: 1,
        chave: 'fase1',
        titulo: 'Fase 1: Domínio da Tecnologia de Hardware',
        subtitulo: 'Telas Flexíveis e Mecânica de Dobradiça',
        contexto: 'O time de engenharia precisa viabilizar o hardware central do smartphone dobrável. A escolha definirá se a empresa se apoia na herança fabril tradicional, verticaliza em Deep Tech própria ou orquestra uma rede aberta de inovação.',
        opcoes: [
            {
                id: '1A',
                letra: 'A',
                arquetipo: 'Inércia H1 (Conservador)',
                titulo: 'Co-desenvolvimento com parceiro histórico Tier 2',
                resumo: 'Investir em parceria de longo prazo com o fornecedor tradicional do H1, co-financiando a adaptação da linha de produção fabril.',
                impactosBase: { caixa: -20, controle: 15, agilidade: -25 },
                vetoresConceituais: {
                    valor: 'Alto custo afundado de P&D em parceiro em aprendizado',
                    soberania: 'Retenção da propriedade intelectual e centralidade fabril',
                    dinamica: 'Curva longa de aprendizado e alta rigidez contratual'
                },
                diagnostico: 'Protege a governança interna e a propriedade intelectual, mas aceita uma curva de aprendizado prolongada.'
            },
            {
                id: '1B',
                letra: 'B',
                arquetipo: 'Ruptura Autárquica (Vertical)',
                titulo: 'Fábrica e P&D proprietário de telas (Deep Tech)',
                resumo: 'Construir linha fabril e laboratório próprio de nanotecnologia para não depender de nenhum fornecedor de telas flexíveis.',
                impactosBase: { caixa: -35, controle: 30, agilidade: -10 },
                vetoresConceituais: {
                    valor: 'Capex massivo e necessidade de absorção de risco financeiro',
                    soberania: 'Soberania absoluta sobre patentes, segredos industriais e design',
                    dinamica: 'Execução sob controle estrito da empresa, com setup fabril demorado'
                },
                diagnostico: 'Soberania máxima sobre a tecnologia crítica, impondo alta demanda de sustentação financeira.'
            },
            {
                id: '1C',
                letra: 'C',
                arquetipo: 'Orquestração Aberta (Ecossistema)',
                titulo: 'Consórcio de inovação aberta com startups e licenças',
                resumo: 'Montar uma aliança multilateral com startups especialistas em polímeros flexíveis com patentes compartilhadas.',
                impactosBase: { caixa: -10, controle: -25, agilidade: 25 },
                vetoresConceituais: {
                    valor: 'Custo inicial diluído entre os parceiros da aliança',
                    soberania: 'Gestão fragmentada e perda de exclusividade de patentes',
                    dinamica: 'Velocidade acelerada de absorção tecnológica e prototipagem'
                },
                diagnostico: 'Time-to-market acelerado com baixo desembolso inicial, aceitando o risco de dependência de nós externos.'
            }
        ]
    },
    {
        faseId: 2,
        chave: 'fase2',
        titulo: 'Fase 2: Arquitetura de Software e Interface',
        subtitulo: 'Adaptação do Sistema Operacional e Multitelas',
        contexto: 'O aparelho exige uma nova camada de interface (multitarefas, continuidade entre telas e fluidez de dobra). Quem governará o ecossistema de software e reterá os dados dos usuários?',
        opcoes: [
            {
                id: '2A',
                letra: 'A',
                arquetipo: 'Subordinação de Plataforma',
                titulo: 'Subordinação a Nó Dominante (Android/Google Padrão)',
                resumo: 'Adotar a API genérica do sistema operacional de mercado dominante com licenciamento convencional e sem customizações.',
                impactosBase: { caixa: -5, controle: -30, agilidade: 25 },
                cascataRegra: (decisoes) => {
                    if (decisoes.fase1 === '1C') {
                        return {
                            descricao: 'Efeito Dupla Comoditização: A ausência de patentes de hardware (1C) somada à subordinação de software (2A) reduz a diferenciação da empresa perante o mercado.',
                            deltaExtra: { caixa: 0, controle: -10, agilidade: 0 }
                        };
                    }
                    return null;
                },
                vetoresConceituais: {
                    valor: 'Baixo custo de licenciamento e adaptação simplificada',
                    soberania: 'Dependência severa da plataforma dominante para futuras atualizações',
                    dinamica: 'Ecossistema de aplicativos pronto em modelo plug-and-play imediato'
                },
                diagnostico: 'Máxima eficiência relacional e velocidade, transferindo a captura de valor de dados para o nó dominante.'
            },
            {
                id: '2B',
                letra: 'B',
                arquetipo: 'Ruptura Autárquica (Vertical)',
                titulo: 'UI/UX Proprietária com Comunidade de Desenvolvedores',
                resumo: 'Criar camada de interface exclusiva e financiar comunidade própria de desenvolvedores para monetização de serviços.',
                impactosBase: { caixa: -30, controle: 25, agilidade: -15 },
                cascataRegra: (decisoes) => {
                    if (decisoes.fase1 === '1A') {
                        return {
                            descricao: 'Efeito Atrito Fabril-Software: O fornecedor tradicional (1A) tem tolerâncias mecânicas descalibradas, demandando retrabalho de calibração na UI proprietária.',
                            deltaExtra: { caixa: 0, controle: 0, agilidade: -10 }
                        };
                    }
                    return null;
                },
                vetoresConceituais: {
                    valor: 'Investimento pesado em subsídios para desenvolvedores e equipe de TI',
                    soberania: 'Domínio total dos dados de telemetria, loja própria e monetização',
                    dinamica: 'Gargalos de homologação contínua e resolução de bugs de multitarefa'
                },
                diagnostico: 'Criação de ecossistema digital próprio que blinda o relacionamento com o cliente, exigindo suporte financeiro contínuo.'
            },
            {
                id: '2C',
                letra: 'C',
                arquetipo: 'Inércia H1 (Conservador)',
                titulo: 'Adaptação Interna do Sistema Existente do H1',
                resumo: 'Fazer uma evolução pontual no firmware que a empresa já utiliza nos smartphones convencionais de linha plana.',
                impactosBase: { caixa: -15, controle: 10, agilidade: -25 },
                cascataRegra: () => null,
                vetoresConceituais: {
                    valor: 'Aproveitamento de contratos legados e equipe interna de software',
                    soberania: 'Código-fonte mantido sob tutela direta e exclusiva da empresa',
                    dinamica: 'Interface com limitações de fluidez e transição de dobra travada'
                },
                diagnostico: 'Contenção orçamentária que resulta em experiência de uso conservadora para um produto inovador.'
            }
        ]
    },
    {
        faseId: 3,
        chave: 'fase3',
        titulo: 'Fase 3: Escoamento e Canais de Distribuição',
        subtitulo: 'Logística de Valor e Conflito de Canais',
        contexto: 'Smartphones dobráveis são itens de alto tíquete e necessitam de demonstração presencial e cuidados logísticos. Qual canal utilizar para alcançar o público-alvo?',
        opcoes: [
            {
                id: '3A',
                letra: 'A',
                arquetipo: 'Inércia H1 (Conservador)',
                titulo: 'Canais de Varejo Tradicionais e Grandes Operadoras (H1)',
                resumo: 'Distribuir maciçamente através das grandes redes de lojas e operadoras com as quais a empresa já possui contratos consolidados.',
                impactosBase: { caixa: 15, controle: -15, agilidade: -20 },
                cascataRegra: (decisoes) => {
                    if (decisoes.fase2 === '2A') {
                        return {
                            descricao: 'Efeito Comoditização no Canal: Como a interface de software é padronizada (2A), o grande varejo exige margens maiores para promover o aparelho.',
                            deltaExtra: { caixa: -10, controle: -5, agilidade: 0 }
                        };
                    }
                    return null;
                },
                vetoresConceituais: {
                    valor: 'Aproveitamento de crédito comercial e logística já amortizada',
                    soberania: 'Varejistas com alto poder de barganha sobre precificação e margem',
                    dinamica: 'Rigidez contratual e ciclos lentos de renovação de vitrines'
                },
                diagnostico: 'Alavancagem da capilaridade instalada, compartilhando parte da margem com os intermediários comerciais.'
            },
            {
                id: '3B',
                letra: 'B',
                arquetipo: 'Ruptura Autárquica (Vertical / D2C)',
                titulo: 'Estratégia D2C Exclusiva via E-commerce e Logtechs',
                resumo: 'Venda direta ao consumidor com entrega expressa, personalização online e dark stores em grandes capitais.',
                impactosBase: { caixa: -25, controle: 20, agilidade: 20 },
                cascataRegra: (decisoes) => {
                    if (decisoes.fase1 === '1B') {
                        return {
                            descricao: 'Efeito Acúmulo de Capex: Somar o setup do canal D2C com a fábrica própria (1B) intensifica a necessidade de capital de giro.',
                            deltaExtra: { caixa: -10, controle: 0, agilidade: 0 }
                        };
                    }
                    return null;
                },
                vetoresConceituais: {
                    valor: 'Custo elevado de aquisição de tráfego (CAC) e setup logístico dedicado',
                    soberania: 'Controle absoluto da base de dados, precificação e experiência premium',
                    dinamica: 'Feedback imediato do consumidor e velocidade para promoções dinâmicas'
                },
                diagnostico: 'Aproximação direta do cliente final eliminando intermediários, assumindo a complexidade de distribuição.'
            },
            {
                id: '3C',
                letra: 'C',
                arquetipo: 'Orquestração Seletiva (Flagship)',
                titulo: 'Quiosques Conceito e Lojas Flagship em Shoppings Premium',
                resumo: 'Implantar espaços conceito de experimentação sensorial e atendimento consultivo nos principais centros de consumo.',
                impactosBase: { caixa: -20, controle: 10, agilidade: -5 },
                cascataRegra: () => null,
                vetoresConceituais: {
                    valor: 'Custos de locação em pontos nobres e equipe especializada',
                    soberania: 'Ambiente controlado de marca sem atrito direto com o varejo massivo',
                    dinamica: 'Expansão geográfica modular e pontual'
                },
                diagnostico: 'Foco na experiência tátil do consumidor sem canibalizar os acordos comerciais de grande escala.'
            }
        ]
    },
    {
        faseId: 4,
        chave: 'fase4',
        titulo: 'Fase 4: Go-to-Market, Narrativa e Posicionamento',
        subtitulo: 'Construção da Marca e Percepção de Valor',
        contexto: 'Para justificar o valor premium de um smartphone inovador, qual posicionamento de marca e estratégia de comunicação adotar?',
        opcoes: [
            {
                id: '4A',
                letra: 'A',
                arquetipo: 'Orquestração de Prestígio (VBR)',
                titulo: 'Co-branding com Marca de Luxo ou Grife Internacional',
                resumo: 'Lançar uma edição especial assinada em aliança com grife internacional de alta moda ou design de ponta.',
                impactosBase: { caixa: -20, controle: -15, agilidade: 20 },
                cascataRegra: () => null,
                vetoresConceituais: {
                    valor: 'Divisão de receitas e pagamento de royalties expressivos à marca parceira',
                    soberania: 'Decisões de comunicação e aprovações estéticas compartilhadas',
                    dinamica: 'Acesso instantâneo a prestígio, cobertura espontânea e formadores de opinião'
                },
                diagnostico: 'Acesso a recursos intangíveis de reputação em troca de margens compartilhadas e governança conjunta.'
            },
            {
                id: '4B',
                letra: 'B',
                arquetipo: 'Inércia H1 (Conservador)',
                titulo: 'Campanha Institucional com a Agência Histórica do H1',
                resumo: 'Manter a mesma agência de publicidade do dia a dia da empresa para conduzir toda a narrativa do produto dobrável.',
                impactosBase: { caixa: -5, controle: 15, agilidade: -20 },
                cascataRegra: (decisoes) => {
                    if (decisoes.fase3 === '3B') {
                        return {
                            descricao: 'Efeito Descompasso de Linguagem: A agência tradicional do H1 tem pouca vivência com performance e conversão em canais D2C (3B).',
                            deltaExtra: { caixa: 0, controle: 0, agilidade: -10 }
                        };
                    }
                    return null;
                },
                vetoresConceituais: {
                    valor: 'Contrato vigente com fee mensal já contratado e baixo custo incremental',
                    soberania: 'Narrativa 100% alinhada à matriz sem interferências externas',
                    dinamica: 'Linguagem publicitária tradicional com tempo de resposta mais lento'
                },
                diagnostico: 'Alinhamento corporativo seguro com baixo desembolso, confiando no repertório já conhecido da agência.'
            },
            {
                id: '4C',
                letra: 'C',
                arquetipo: 'Ruptura Comunitária (Influência)',
                titulo: 'Comunidade Tech e Marketing de Influência com Early Adopters',
                resumo: 'Enviar lotes de pré-série para grandes criadores de conteúdo tech e promover fóruns de co-criação com a comunidade.',
                impactosBase: { caixa: -10, controle: -10, agilidade: 15 },
                cascataRegra: (decisoes) => {
                    if (decisoes.fase1 === '1A') {
                        return {
                            descricao: 'Efeito Exposição Crítica: Reviewers independentes de tecnologia apontaram limitações na dobradiça tradicional (1A), exigindo respostas rápidas de RP.',
                            deltaExtra: { caixa: -5, controle: -10, agilidade: 0 }
                        };
                    }
                    return null;
                },
                vetoresConceituais: {
                    valor: 'Investimento moderado em amostras técnicas e eventos de nicho',
                    soberania: 'A narrativa fica na mão de terceiros e criadores independentes',
                    dinamica: 'Engajamento rápido e credibilidade técnica perante os early adopters'
                },
                diagnostico: 'Validação técnica imediata perante entusiastas, assumindo o risco da sinceridade dos influenciadores.'
            }
        ]
    }
];

// ============================================================================
// FUNÇÕES DE CÁLCULO E AUDITORIA DE EXPOSIÇÃO
// ============================================================================

export function calcularImpactoOpcao(opcao, decisoesAnteriores = {}) {
    let delta = { ...opcao.impactosBase };
    let efeitoCascata = null;

    if (opcao.cascataRegra) {
        const resultadoCascata = opcao.cascataRegra(decisoesAnteriores);
        if (resultadoCascata) {
            efeitoCascata = resultadoCascata;
            delta.caixa += resultadoCascata.deltaExtra.caixa || 0;
            delta.controle += resultadoCascata.deltaExtra.controle || 0;
            delta.agilidade += resultadoCascata.deltaExtra.agilidade || 0;
        }
    }

    return {
        deltaFinal: delta,
        efeitoCascata,
        temCascata: !!efeitoCascata
    };
}

export function calcularPontuacoes(decisoes = {}) {
    let caixa = PONTOS_INICIAIS.caixa;
    let controle = PONTOS_INICIAIS.controle;
    let agilidade = PONTOS_INICIAIS.agilidade;

    const deltasPorFase = {};
    const cascatasAtivadas = [];

    FASES.forEach((fase) => {
        const opcaoEscolhidaId = decisoes[fase.chave];
        if (opcaoEscolhidaId) {
            const opcao = fase.opcoes.find(o => o.id === opcaoEscolhidaId);
            if (opcao) {
                const impacto = calcularImpactoOpcao(opcao, decisoes);
                caixa += impacto.deltaFinal.caixa;
                controle += impacto.deltaFinal.controle;
                agilidade += impacto.deltaFinal.agilidade;
                deltasPorFase[fase.chave] = impacto.deltaFinal;

                if (impacto.temCascata) {
                    cascatasAtivadas.push({
                        faseId: fase.faseId,
                        faseTitulo: fase.titulo,
                        opcaoId: opcao.id,
                        descricao: impacto.efeitoCascata.descricao,
                        deltaExtra: impacto.efeitoCascata.deltaExtra
                    });
                }
            }
        }
    });

    // Identificação de Alta Exposição Estratégica (Exige Ação de Governança Mitigadora)
    const altaExposicaoCaixa = caixa <= 10;
    const altaExposicaoAgilidade = agilidade <= 10;
    const altaExposicaoControle = controle <= 25;

    return {
        caixa: Math.max(0, caixa),
        caixaBruto: caixa,
        controle: Math.max(0, controle),
        controleBruto: controle,
        agilidade: Math.max(0, agilidade),
        agilidadeBruto: agilidade,
        deltasPorFase,
        cascatasAtivadas,
        altaExposicaoCaixa,
        altaExposicaoAgilidade,
        altaExposicaoControle,
        temAltaExposicao: altaExposicaoCaixa || altaExposicaoAgilidade || altaExposicaoControle
    };
}

export function classificarPerfilRede(pontuacoes, decisoes = {}) {
    const qtdDecisoes = Object.keys(decisoes).filter(k => !!decisoes[k]).length;
    if (qtdDecisoes < 4) {
        return {
            titulo: 'Análise Estratégica em Andamento',
            badge: 'Em Construção',
            tipo: 'em_andamento',
            cor: 'text-cyan-400 bg-cyan-900/30 border-cyan-700',
            resumo: `A equipe concluiu ${qtdDecisoes} de 4 decisões. Finalize a jornada para auditar a rede no Dashboard Executivo.`
        };
    }

    const tensoes = [];
    if (pontuacoes.altaExposicaoCaixa) tensoes.push('Captura de Valor (Financeiro)');
    if (pontuacoes.altaExposicaoAgilidade) tensoes.push('Dinâmica de Resposta (Time-to-Market)');
    if (pontuacoes.altaExposicaoControle) tensoes.push('Soberania e Autonomia Relacional');

    if (tensoes.length >= 2) {
        return {
            titulo: 'Estratégia de Alta Tensão em Múltiplas Dimensões',
            badge: 'Alta Exposição Múltipla',
            tipo: 'alerta_multiplo',
            cor: 'text-amber-400 bg-amber-950/40 border-amber-600',
            resumo: `A equipe assumiu uma postura estratégica com alta exposição em ${tensoes.join(' e ')}. Essa rota exige um plano de governança robusto para assegurar sustentabilidade perante o Conselho.`,
            recomendacao: 'Elabore ações mitigadoras específicas para cada dimensão exposta para justificar a viabilidade da estratégia.'
        };
    }

    if (pontuacoes.altaExposicaoCaixa) {
        return {
            titulo: 'Estratégia de Ruptura Autárquica (Demanda de Capitalização Externa)',
            badge: 'Alta Exposição Financeira',
            tipo: 'exposicao_caixa',
            cor: 'text-amber-400 bg-amber-950/30 border-amber-500/70',
            resumo: 'A equipe priorizou a construção de ativos próprios, fábrica dedicada e canal direto. A estratégia blinda a empresa a longo prazo, mas exige atração de financiamento, venture capital ou subsídios para sustentar o fluxo de caixa.',
            recomendacao: 'O grupo deve registrar a Ação de Governança Financeira que viabilizará a sustentação do capex assumido.'
        };
    }

    if (pontuacoes.altaExposicaoAgilidade) {
        return {
            titulo: 'Estratégia de Inércia H1 (Alta Exposição a Rigidez Relacional)',
            badge: 'Alta Exposição de Time-to-Market',
            tipo: 'exposicao_agilidade',
            cor: 'text-amber-400 bg-amber-950/30 border-amber-500/70',
            resumo: 'A equipe priorizou parceiros tradicionais e processos já conhecidos do H1. Os custos foram preservados, mas a curva de aprendizado lenta exige salvaguardas para não perder o timing de mercado.',
            recomendacao: 'O grupo deve formular Ações de Governança Ágil (comitês de crise, fast-track contratual) para acelerar os parceiros históricos.'
        };
    }

    if (pontuacoes.altaExposicaoControle) {
        return {
            titulo: 'Estratégia de Orquestração Aberta (Demanda de Salvaguardas de Soberania)',
            badge: 'Alta Exposição de Soberania',
            tipo: 'exposicao_controle',
            cor: 'text-amber-400 bg-amber-950/30 border-amber-500/70',
            resumo: 'A equipe alcançou rapidez e eficiência ao apoiar-se em gigantes de software e alianças de inovação aberta, mas tornou a empresa dependente de regras e margens de terceiros.',
            recomendacao: 'O grupo deve registrar Ações de Governança Contratual (cláusulas de blindagem, multas de rescisão e retenção de base de clientes) para assegurar o poder de barganha.'
        };
    }

    return {
        titulo: 'Ecossistema Equilibrado e Resiliente',
        badge: 'Rede Balanceada',
        tipo: 'sucesso',
        cor: 'text-emerald-400 bg-emerald-950/40 border-emerald-600',
        resumo: 'A equipe realizou uma arbitragem estratégica equilibrada: dosou investimentos próprios com parcerias externas, mantendo indicadores sustentáveis em todas as três dimensões.',
        recomendacao: 'Apresente ao Conselho a sustentabilidade do modelo e como os trade-offs foram harmonizados.'
    };
}
