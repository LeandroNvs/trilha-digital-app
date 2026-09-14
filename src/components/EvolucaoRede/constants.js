// ============================================================================
// CONSTANTES E REGRAS: EVOLUÇÃO DE REDE (SMARTPHONES DOBRÁVEIS H1 vs H2)
// Modelo Pedagógico: Características Estruturais da Rede e Ações de Governança
// ============================================================================

export const TEMPO_BASE_MESES = 18; // Linha de base média da indústria mobile (18 meses)
export const PONTOS_INICIAIS = { caixa: 60, controle: 60, agilidade: 60 };

// ============================================================================
// DICIONÁRIO DE CARACTERÍSTICAS DA REDE DE NEGÓCIOS
// Conceitos: Gargalos Estruturais, Assimetrias e Rigidez
// ============================================================================

export const CARACTERISTICAS_REDE = {
    // 1. Gargalos Estruturais
    dependencia_operacional: {
        id: 'dependencia_operacional',
        nome: 'Dependência Operacional Extrema',
        categoria: 'Gargalo Estrutural',
        icone: '⛓️',
        corBadge: 'bg-amber-950/60 text-amber-300 border-amber-700/60',
        definicao: 'Condição de vulnerabilidade estrutural caracterizada por uma cadeia linear, na qual a organização concentra o fluxo de um recurso, serviço ou insumo crítico em um único fornecedor externo, sem rotas alternativas viáveis (zero redundância) e sob altos custos de troca.'
    },
    centralidade_intermediacao: {
        id: 'centralidade_intermediacao',
        nome: 'Centralidade de Intermediação',
        categoria: 'Gargalo Estrutural',
        icone: '🚪',
        corBadge: 'bg-blue-950/60 text-blue-300 border-blue-700/60',
        definicao: 'Nós com alta intermediação operam como guardiões de passagem, detendo o poder de filtrar, distorcer, precificar ou bloquear fluxos críticos de informação, insumos e inovação. A ausência de rotas alternativas gera dependência de agenciamento e eleva custos de transação.'
    },
    especificidade_ativo: {
        id: 'especificidade_ativo',
        nome: 'Especificidade de Ativo',
        categoria: 'Gargalo Estrutural',
        icone: '🔒',
        corBadge: 'bg-purple-950/60 text-purple-300 border-purple-700/60',
        definicao: 'Ocorre quando investimentos feitos para viabilizar a transação (dedicados/conhecimento, local/procedural ou marca/patente) não podem ser reempregados em outra finalidade sem perda significativa de valor produtivo, gerando ponto de atenção quanto a potencial sequestro de valor.'
    },
    ponto_cego_estrutural: {
        id: 'ponto_cego_estrutural',
        nome: 'Ponto Cego Estrutural (Baixa Visibilidade)',
        categoria: 'Gargalo Estrutural',
        icone: '👁️‍🗨️',
        corBadge: 'bg-red-950/60 text-red-300 border-red-700/60',
        definicao: 'Grau reduzido de transparência e rastreabilidade que a organização detém sobre os fluxos, dependências e atores posicionados além da sua fronteira contratual direta (camadas 2 e 3 e nós de infraestrutura básica).'
    },

    // 2. Assimetria de Rede
    assimetria_fluxo_dados: {
        id: 'assimetria_fluxo_dados',
        nome: 'Assimetria de Fluxo e Captura de Valor',
        categoria: 'Assimetria de Rede',
        icone: '📊',
        corBadge: 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60',
        definicao: 'Ocorre quando o vínculo com o mercado é mediado por um intermediário que retém dados transacionais e de comportamento de consumo, repassando apenas a ordem de produção e impedindo que a empresa conheça as dores reais do cliente final.'
    },
    vazamento_valor: {
        id: 'vazamento_valor',
        nome: 'Vazamento de Valor (Ativos Complementares)',
        categoria: 'Assimetria de Rede',
        icone: '💸',
        corBadge: 'bg-orange-950/60 text-orange-300 border-orange-700/60',
        definicao: 'A empresa desenvolve a inovação, mas não possui os Ativos Complementares Especializados (canais de distribuição, capacidade fabril de ponta ou marca de luxo). O parceiro detentor desses ativos apropria-se da maior fatia do lucro econômico da inovação.'
    },

    // 3. Rigidez
    rigidez_relacional: {
        id: 'rigidez_relacional',
        nome: 'Rigidez Relacional e Nuclear',
        categoria: 'Rigidez',
        icone: '⚓',
        corBadge: 'bg-stone-900 text-stone-300 border-stone-700',
        definicao: 'O paradoxo do enraizamento excessivo: redes baseadas exclusivamente em laços fortes e confiança mútua do H1 tornam-se prisões relacionais. As capacidades históricas de sucesso no passado viram o principal obstáculo para inovar no H2.'
    }
};

// ============================================================================
// JANELAS DE MERCADO (TIME-TO-MARKET)
// ============================================================================

export function classificarJanelaMercado(meses) {
    if (meses <= 13) {
        return {
            tipo: 'pioneira',
            badge: 'Janela Pioneira (First-Mover)',
            corTexto: 'text-cyan-400',
            corBg: 'bg-cyan-950/40 border-cyan-500/60',
            titulo: 'Entrada Pioneira no Mercado (First-Mover)',
            resumo: `Lançamento estimado em ${meses} meses. A empresa dita a categoria, conquista cobertura espontânea e define a referência na mente do consumidor. Como trade-off, opera com componentes e fornecedores em estágio inicial de maturação, exigindo governança preventiva de qualidade.`
        };
    }
    if (meses <= 19) {
        return {
            tipo: 'seguidor_rapido',
            badge: 'Janela de Seguidor Rápido (Fast-Follower)',
            corTexto: 'text-emerald-400',
            corBg: 'bg-emerald-950/40 border-emerald-500/60',
            titulo: 'Entrada Equilibrada de Mercado (Fast-Follower)',
            resumo: `Lançamento estimado em ${meses} meses (ciclo padrão de P&D mobile). A empresa aproveita o aprendizado das falhas dos pioneiros e negocia com fornecedores mais estabilizados, mantendo boa competitividade temporal perante a concorrência.`
        };
    }
    return {
        tipo: 'maturidade',
        badge: 'Janela de Maturidade e Robustez (Entrada Tardia)',
        corTexto: 'text-amber-400',
        corBg: 'bg-amber-950/40 border-amber-500/60',
        titulo: 'Entrada Tardia com Foco em Robustez (Maturidade)',
        resumo: `Lançamento estimado em ${meses} meses. O produto chega com engenharia madura, processos fabris de alta precisão e solidez estrutural, mas entra quando concorrentes já consolidaram market share, exigindo governança comercial agressiva para disputar vitrines.`
    };
}

// ============================================================================
// AS 4 FASES DA SIMULAÇÃO: CARACTERÍSTICAS DA REDE E GOVERNANÇA
// ============================================================================

export const FASES = [
    {
        faseId: 1,
        chave: 'fase1',
        titulo: 'Fase 1: Domínio da Tecnologia de Hardware',
        subtitulo: 'Telas Flexíveis e Mecânica de Dobradiça',
        contexto: 'O dobrável H2 herda a rede de suprimentos do H1 (smartphones planos convencionais). A empresa precisa viabilizar o fornecimento do componente mais crítico (telas flexíveis e dobradiças mecânicas). A escolha reconfigura os nós de suprimento e define a velocidade de prototipagem.',
        diagnosticoInicialRede: [
            {
                caracteristicaId: 'rigidez_relacional',
                detalhe: 'Laços históricos e contratuais consolidados com fornecedores tradicionais do H1 (telas rígidas e chassis).'
            },
            {
                caracteristicaId: 'ponto_cego_estrutural',
                detalhe: 'Ausência de visibilidade sobre os fornecedores de camadas 2 e 3 (nanopolímeros, filmes ultra-finos UTG e ligas metálicas micrométricas).'
            }
        ],
        dossiePesquisa: 'Para debater em grupo antes de escolher: Pesquisem as falhas nas primeiras unidades do primeiro Galaxy Fold em 2019 (rompimento de tela por poeira na dobradiça e descolamento do filme plástico protetor). Por que a física dos materiais dobráveis impõe um desafio de rede completamente diferente das telas planas do H1? Vale a pena co-desenvolver, verticalizar ou abrir consórcio?',
        opcoes: [
            {
                id: '1A',
                letra: 'A',
                arquetipo: 'Co-desenvolvimento Relacional (Tier 2)',
                titulo: 'Co-desenvolvimento com Parceiro Histórico do H1',
                resumo: 'Investir em parceria de longo prazo com o fornecedor tradicional do H1, co-financiando a adaptação da linha de produção fabril e ferramental mecânico.',
                deltaMeses: 4, // 18 + 4 = 22 meses
                caracteristicasAtivadas: [
                    {
                        caracteristicaId: 'dependencia_operacional',
                        efeito: 'Concentração total do componente mais crítico do dobrável em um único parceiro externo, sem rotas redundantes de suprimento.'
                    },
                    {
                        caracteristicaId: 'especificidade_ativo',
                        efeito: 'Aporte financeiro em maquinário e processos sob medida dentro da fábrica do parceiro. Ponto de atenção crítico: exposição a custo afundado se o parceiro falhar.'
                    },
                    {
                        caracteristicaId: 'rigidez_relacional',
                        efeito: 'Paradoxo do enraizamento: a empresa tenta viabilizar uma tecnologia de ruptura (H2) apoiando-se nos laços confortáveis do H1.'
                    }
                ],
                diagnostico: 'Protege a propriedade intelectual conjunta e aproveita a confiança prévia, mas estica o cronograma pela lenta curva de adaptação do parceiro.',
                desafioGovernanca: 'Vocês concentraram o suprimento crítico em um único parceiro histórico e aportaram capital em ativos específicos na fábrica dele. Qual proposta de governança vocês implementarão para mitigar essa dependência e resguardar a empresa?'
            },
            {
                id: '1B',
                letra: 'B',
                arquetipo: 'Verticalização Deep Tech (Autárquica)',
                titulo: 'Fábrica e P&D Proprietário de Telas e Dobradiças',
                resumo: 'Construir linha fabril e laboratório próprio de nanotecnologia para dominar 100% da fabricação das telas flexíveis sem depender de terceiros.',
                deltaMeses: 8, // 18 + 8 = 26 meses
                caracteristicasAtivadas: [
                    {
                        caracteristicaId: 'especificidade_ativo',
                        efeito: 'Especificidade de ativos máxima: imobilização massiva de capex e conhecimento fabril que só servem para dobráveis, demandando atenção severa ao afundamento de capital.'
                    },
                    {
                        caracteristicaId: 'ponto_cego_estrutural',
                        efeito: 'Eliminação do ponto cego estrutural no componente central: visibilidade e rastreabilidade total do chão de fábrica e da matéria-prima.'
                    },
                    {
                        caracteristicaId: 'vazamento_valor',
                        efeito: 'Blindagem total contra vazamento de valor: patentes e segredos industriais retidos 100% sob regime de apropriabilidade forte.'
                    }
                ],
                diagnostico: 'Soberania absoluta sobre a tecnologia e eliminação de nós intermediários, impondo atraso relevante no cronograma e alta imobilização de capital.',
                desafioGovernanca: 'Vocês eliminaram a dependência de fornecedores externos, mas imobilizaram capital em ativos específicos dedicados. Qual proposta de governança interna será estabelecida para assegurar a eficiência e evitar o desperdício de capital afundado?'
            },
            {
                id: '1C',
                letra: 'C',
                arquetipo: 'Consórcio de Inovação Aberta (Ecossistema)',
                titulo: 'Consórcio Aberto com Startups de Polímeros e Patentes Compartilhadas',
                resumo: 'Montar uma aliança multilateral com startups especializadas em novos materiais e engenharia micromecânica, articulando protótipos já testados.',
                deltaMeses: -4, // 18 - 4 = 14 meses
                caracteristicasAtivadas: [
                    {
                        caracteristicaId: 'rigidez_relacional',
                        efeito: 'Ruptura com a rigidez relacional do H1: quebra da inércia dos parceiros tradicionais e conexão com laços fracos altamente dinâmicos.'
                    },
                    {
                        caracteristicaId: 'vazamento_valor',
                        efeito: 'Ponto de atenção em vazamento de valor: regime de apropriabilidade fraco. Como as startups detêm a PI e atendem múltiplos clientes, o know-how pode vazar.'
                    },
                    {
                        caracteristicaId: 'ponto_cego_estrutural',
                        efeito: 'Ponto cego estrutural em camadas 2 e 3: as startups dependem de fundições e químicas terceirizadas, sobre as quais a empresa não tem rastreabilidade.'
                    }
                ],
                diagnostico: 'Aceleração do time-to-market ao alavancar soluções prontas de terceiros, aceitando complexidade de coordenação multilateral e perda de exclusividade.',
                desafioGovernanca: 'Vocês ganharam velocidade ao quebrar as amarras do H1, mas operam com pontos de atenção de vazamento de valor e pontos cegos na cadeia subcontratada. Qual proposta de governança de aliança vocês estruturarão e exigirão no consórcio?'
            }
        ]
    },
    {
        faseId: 2,
        chave: 'fase2',
        titulo: 'Fase 2: Arquitetura de Software e Interface',
        subtitulo: 'Adaptação do Sistema Operacional e Multitelas',
        contexto: 'O dobrável exige continuidade fluida entre a tela externa compacta e a tela interna expandida, além de suporte a multitarefas com 3 janelas simultâneas. O ecossistema global é arbitrado pelo guardião da plataforma de sistema operacional.',
        diagnosticoInicialRede: [
            {
                caracteristicaId: 'centralidade_intermediacao',
                detalhe: 'O dono da plataforma global de SO atua como guardião de passagem, ditando padrões de APIs, aprovando aplicativos e cobrando taxas na loja digital.'
            },
            {
                caracteristicaId: 'assimetria_fluxo_dados',
                detalhe: 'Na herança do H1, os dados de telemetria, navegação e hábitos de uso fluem para o dono do SO, deixando a fabricante restrita à produção física.'
            }
        ],
        dossiePesquisa: 'Para debater em grupo antes de escolher: Pesquisem a estratégia da Samsung com a interface proprietária One UI e a iniciativa da Huawei com o HarmonyOS após as sanções internacionais de 2019. Por que marcas líderes investem bilhões para controlar a camada visual de software em vez de usarem o Android genérico puro?',
        opcoes: [
            {
                id: '2A',
                letra: 'A',
                arquetipo: 'Subordinação a Nó Dominante (Plataforma Padrão)',
                titulo: 'Subordinação ao SO Padrão da Plataforma Global (Android AOSP/GMS)',
                resumo: 'Adotar a API genérica e o ecossistema pronto fornecido pela dona do sistema operacional, sem desenvolver customizações proprietárias.',
                deltaMeses: -4,
                caracteristicasAtivadas: [
                    {
                        caracteristicaId: 'centralidade_intermediacao',
                        efeito: 'Centralidade de intermediação consolidada: a plataforma dita as regras e o ritmo de evolução das funções de dobra no código global.'
                    },
                    {
                        caracteristicaId: 'assimetria_fluxo_dados',
                        efeito: 'Assimetria de fluxo e perda de dados: a dona do SO retém a telemetria comportamental e a monetização de serviços digitais dos apps.'
                    },
                    {
                        caracteristicaId: 'especificidade_ativo',
                        efeito: 'Baixa especificidade de ativo de software: custo quase nulo em equipes dedicadas de arquitetura de SO e desenvolvimento de APIs sob medida.'
                    }
                ],
                diagnostico: 'Time-to-market acelerado com modelo plug-and-play imediato, transferindo a captura de valor sobre os dados digitais para o nó dominante.',
                desafioGovernanca: 'Vocês aceleraram a entrada no mercado, mas entregaram o controle da experiência e dos dados ao nó dominante da plataforma. Qual proposta de governança de relacionamento com o intermediário vocês adotarão para mitigar a comoditização e a perda de diferenciação?'
            },
            {
                id: '2B',
                letra: 'B',
                arquetipo: 'Ecossistema Digital Proprietário (Diferenciação)',
                titulo: 'UI/UX Proprietária com Comunidade Dedicada de Desenvolvedores',
                resumo: 'Desenvolver uma camada de interface exclusiva (SDK proprietário, loja de temas e suporte avançado a multitelas), subsidiando desenvolvedores parceiros.',
                deltaMeses: 5,
                caracteristicasAtivadas: [
                    {
                        caracteristicaId: 'assimetria_fluxo_dados',
                        efeito: 'Atenuação da assimetria de fluxo: a empresa passa a reter dados diretos de telemetria e cria canais próprios de monetização de serviços.'
                    },
                    {
                        caracteristicaId: 'especificidade_ativo',
                        efeito: 'Especificidade de ativos de software e capital humano: desenvolvimento de SDKs e código sob medida com alto investimento dedicado.'
                    },
                    {
                        caracteristicaId: 'dependencia_operacional',
                        efeito: 'Dependência operacional interna: a empresa assume a responsabilidade direta por bugs de multitarefa e estabilidade de apps de terceiros.'
                    }
                ],
                diagnostico: 'Diferenciação de experiência e blindagem no relacionamento com o usuário, exigindo investimento contínuo e suporte a desenvolvedores.',
                desafioGovernanca: 'Vocês conquistaram soberania sobre os dados e a interface, mas geraram alta especificidade de ativos e atraíram toda a responsabilidade operacional para dentro de casa. Qual proposta de governança de ecossistema digital vocês implementarão?'
            },
            {
                id: '2C',
                letra: 'C',
                arquetipo: 'Inércia Nuclear do H1 (Adaptação Mínima)',
                titulo: 'Adaptação Interna do Firmware Legado do H1',
                resumo: 'Fazer uma evolução básica no firmware já utilizado nos celulares planos do H1, forçando o estiramento das janelas sem refazer a arquitetura.',
                deltaMeses: 0,
                caracteristicasAtivadas: [
                    {
                        caracteristicaId: 'rigidez_relacional',
                        efeito: 'Rigidezes nucleares: a empresa reproduz no dobrável H2 as rotinas e ferramentas que deram certo no passado, gerando uma experiência de uso truncada.'
                    },
                    {
                        caracteristicaId: 'vazamento_valor',
                        efeito: 'Assimetria de percepção de valor: o cliente paga tíquete premium, mas recebe interface engessada com apps deformados, reduzindo o valor percebido.'
                    },
                    {
                        caracteristicaId: 'especificidade_ativo',
                        efeito: 'Preservação de recursos e baixa especificidade de ativos: aproveita contratos e equipe interna existente sem novos desembolsos.'
                    }
                ],
                diagnostico: 'Contenção orçamentária e cumprimento de cronograma, com ponto de atenção voltado à potencial rejeição do consumidor pela falta de fluidez da interface.',
                desafioGovernanca: 'Vocês preservaram recursos imediatos sem custos extras, mas mantiveram a rigidez nuclear do H1 e arriscam frustrar o usuário na ponta. Qual proposta de governança técnica e de pós-venda vocês criarão para sustentar a experiência e a reputação do produto?'
            }
        ]
    },
    {
        faseId: 3,
        chave: 'fase3',
        titulo: 'Fase 3: Escoamento e Canais de Distribuição',
        subtitulo: 'Logística de Valor e Conflito de Canais',
        contexto: 'O dobrável é um produto de altíssimo tíquete (> R$ 8.000) que o cliente prefere experimentar antes de comprar. A empresa herda contratos tradicionais com o grande varejo físico e grandes operadoras de telecomunicações.',
        diagnosticoInicialRede: [
            {
                caracteristicaId: 'centralidade_intermediacao',
                detalhe: 'Grandes redes de varejo e operadoras controlam as vitrines físicas e impõem prazos de pagamento de até 120 dias.'
            },
            {
                caracteristicaId: 'vazamento_valor',
                detalhe: 'O varejo físico detém os Ativos Complementares Especializados (capilaridade, balcão de experimentação e crediário), retendo até 40% da margem do produto.'
            }
        ],
        dossiePesquisa: 'Para debater em grupo antes de escolher: Analisem a estratégia de distribuição da Apple (lojas próprias com atendimento consultivo x parcerias com grandes operadoras). O que acontece com as vendas dos smartphones convencionais do H1 da sua empresa se o grande varejo se sentir ameaçado pela sua decisão de vender o dobrável direto pela internet (conflito de canais)?',
        opcoes: [
            {
                id: '3A',
                letra: 'A',
                arquetipo: 'Canal Tradicional de Massa (Varejo e Operadoras H1)',
                titulo: 'Canais de Varejo Tradicionais e Grandes Operadoras (Herança do H1)',
                resumo: 'Distribuir maciçamente através das redes de lojas físicas e operadoras com as quais a empresa já tem contratos e logística amortizada.',
                deltaMeses: 3,
                caracteristicasAtivadas: [
                    {
                        caracteristicaId: 'centralidade_intermediacao',
                        efeito: 'Centralidade de intermediação consolidada: o grande varejo arbitra o destaque de vitrine e a exposição do dobrável perante concorrentes.'
                    },
                    {
                        caracteristicaId: 'vazamento_valor',
                        efeito: 'Vazamento de valor comercial: a empresa cede até 40% da margem bruta para remunerar a infraestrutura e a força de vendas do lojista.'
                    },
                    {
                        caracteristicaId: 'assimetria_fluxo_dados',
                        efeito: 'Assimetria de fluxo: a fabricante não tem acesso ao perfil de quem comprou o produto no balcão, recebendo apenas pedidos consolidados de reposição.'
                    },
                    {
                        caracteristicaId: 'rigidez_relacional',
                        efeito: 'Preservação da rigidez relacional: estabilidade dos laços fortes com os parceiros comerciais tradicionais, sem atritos com o legado do H1.'
                    }
                ],
                diagnostico: 'Capilaridade imediata em milhares de pontos de venda sem custo imobiliário próprio, aceitando a perda de margem e a dependência de intermediários.',
                desafioGovernanca: 'Vocês aceitaram a intermediação do varejo e a divisão de margem em troca de capilaridade imediata. Qual proposta de governança de trade marketing e canais vocês implementarão para garantir o destaque e a demonstração adequada do produto no ponto de venda?'
            },
            {
                id: '3B',
                letra: 'B',
                arquetipo: 'Desintermediação Digital (D2C e Logtechs)',
                titulo: 'Estratégia D2C Exclusiva via E-commerce e Logtechs Integradas',
                resumo: 'Eliminar os intermediários comerciais e vender 100% direto ao consumidor final pela internet, com entrega expressa blindada e dark stores.',
                deltaMeses: -3,
                caracteristicasAtivadas: [
                    {
                        caracteristicaId: 'centralidade_intermediacao',
                        efeito: 'Eliminação da centralidade de intermediação comercial: a empresa estabelece relação e faturamento direto com o mercado final.'
                    },
                    {
                        caracteristicaId: 'assimetria_fluxo_dados',
                        efeito: 'Captura de valor integral e telemetria: apropriação total da margem comercial e dos dados transacionais/comportamentais de cada comprador.'
                    },
                    {
                        caracteristicaId: 'dependencia_operacional',
                        efeito: 'Dependência operacional extrema da malha logística: vulnerabilidade crítica a extravios, roubos de carga de alto valor e fraudes de pagamento.'
                    },
                    {
                        caracteristicaId: 'ponto_cego_estrutural',
                        efeito: 'Ponto cego estrutural em transporte de última milha: operadores logísticos subcontratam motoristas autônomos sem rastreabilidade direta.'
                    }
                ],
                diagnostico: 'Maximização da margem e retenção da base de clientes eliminando intermediários, assumindo a complexidade de frete e ponto de atenção sobre conflito de canais com o varejo do H1.',
                desafioGovernanca: 'Vocês capturaram toda a margem e dados ao vender direto, mas criaram dependência de uma malha logística com pontos de atenção de alta complexidade operacional e potencial atrito com parceiros do H1. Qual proposta de governança de logística, segurança e canais vocês estruturarão?'
            },
            {
                id: '3C',
                letra: 'C',
                arquetipo: 'Modelo Híbrido Sensorial (Quiosques Flagship)',
                titulo: 'Quiosques Conceito e Lojas Flagship em Shoppings de Alto Padrão',
                resumo: 'Implantar espaços físicos próprios de experimentação tátil nos principais shoppings, combinando experimentação presencial com venda assistida.',
                deltaMeses: 4,
                caracteristicasAtivadas: [
                    {
                        caracteristicaId: 'ponto_cego_estrutural',
                        efeito: 'Alta visibilidade da experiência do consumidor: contato direto com as reações táteis e dúvidas de manuseio do cliente com o mecanismo de dobra.'
                    },
                    {
                        caracteristicaId: 'especificidade_ativo',
                        efeito: 'Especificidade de ativos físicos e procedurais: investimentos imobilizados em reformas de quiosques, luvas de ponto e sistemas sob medida de PDV.'
                    },
                    {
                        caracteristicaId: 'centralidade_intermediacao',
                        efeito: 'Equilíbrio de intermediação (modelo híbrido): constrói autoridade de marca sem romper de forma agressiva com o grande varejo multimarca.'
                    }
                ],
                diagnostico: 'Superação da barreira de experimentação sensorial do dobrável mantendo a reputação sob controle, absorvendo rigidez de custos fixos de locação comercial.',
                desafioGovernanca: 'Vocês resolveram a barreira da experimentação física mantendo a reputação sob controle, mas imobilizaram capital em ativos específicos de varejo com custos fixos elevados. Qual proposta de governança de operações comerciais vocês adotarão para assegurar a sustentabilidade desse modelo?'
            }
        ]
    },
    {
        faseId: 4,
        chave: 'fase4',
        titulo: 'Fase 4: Go-to-Market, Narrativa e Posicionamento',
        subtitulo: 'Construção da Marca e Percepção de Valor',
        contexto: 'O dobrável está pronto para chegar ao mercado. A empresa herda do H1 a imagem de fabricante de smartphones funcionais convencionais, enquanto o consumidor desconfia da durabilidade e robustez da tela flexível.',
        diagnosticoInicialRede: [
            {
                caracteristicaId: 'vazamento_valor',
                detalhe: 'Ausência de Ativos Complementares de Reputação de Superluxo para legitimar a cobrança de um tíquete acima de R$ 8.000.'
            },
            {
                caracteristicaId: 'rigidez_relacional',
                detalhe: 'Contrato vigente e rotinas cristalizadas com a agência de publicidade tradicional do H1, especializada em comunicação de massa popular.'
            }
        ],
        dossiePesquisa: 'Para debater em grupo antes de escolher: Pesquisem o caso da edição especial Samsung Galaxy Z Flip Thom Browne (com preços superiores a US$ 2.500 esgotados rapidamente) versus as campanhas institucionais tradicionais de smartphones. Por que marcas de alta tecnologia buscam co-branding com grifes de alta costura ou criadores independentes para transformar sua percepção de valor?',
        opcoes: [
            {
                id: '4A',
                letra: 'A',
                arquetipo: 'Aliança Simbólica de Prestígio (Co-branding de Luxo)',
                titulo: 'Co-branding com Marca de Alto Luxo ou Grife',
                resumo: 'Lançar uma edição especial assinada em parceria com uma grife de alta moda ou design de ponta, com estojo nobre e tiragem limitada.',
                deltaMeses: 3,
                caracteristicasAtivadas: [
                    {
                        caracteristicaId: 'vazamento_valor',
                        efeito: 'Vazamento de valor financeiro: pagamento de royalties expressivos sobre cada unidade e perda parcial de autonomia criativa e estética.'
                    },
                    {
                        caracteristicaId: 'assimetria_fluxo_dados',
                        efeito: 'Acesso a Ativos Complementares de Reputação: captura de valor simbólico imediato, legitimando a cobrança de preços ultra-premium.'
                    },
                    {
                        caracteristicaId: 'especificidade_ativo',
                        efeito: 'Especificidade de ativos de marca: embalagens, acabamentos e campanhas desenhadas sob medida que só têm valor associadas à grife parceira.'
                    }
                ],
                diagnostico: 'Compra de legitimidade e prestígio instantâneo no segmento de superluxo em troca de royalties pesados e subordinação criativa à matriz da grife.',
                desafioGovernanca: 'Vocês compraram prestígio instantâneo através da grife, mas cederam margem em royalties e perderam autonomia criativa. Qual proposta de governança de aliança e co-branding vocês estabelecerão para coordenar essa parceria?'
            },
            {
                id: '4B',
                letra: 'B',
                arquetipo: 'Continuidade Institucional (Agência Histórica H1)',
                titulo: 'Campanha Institucional de Massa com a Agência Tradicional do H1',
                resumo: 'Manter a mesma agência de publicidade do dia a dia da empresa para conduzir toda a narrativa do dobrável em grandes campanhas de TV e outdoors.',
                deltaMeses: -1,
                caracteristicasAtivadas: [
                    {
                        caracteristicaId: 'rigidez_relacional',
                        efeito: 'Rigidezes nucleares na comunicação: a agência repete as rotinas de massa do H1, gerando uma narrativa genérica que não traduz a sofisticação da dobra.'
                    },
                    {
                        caracteristicaId: 'vazamento_valor',
                        efeito: 'Ausência de vazamento de valor financeiro: sem pagamento de royalties a terceiros, retendo 100% da receita da inovação na empresa.'
                    },
                    {
                        caracteristicaId: 'especificidade_ativo',
                        efeito: 'Baixa especificidade de ativos de comunicação: aproveitamento de ferramentas de mídia e equipe já amortizadas.'
                    }
                ],
                diagnostico: 'Alinhamento corporativo ágil e sem custos de licenciamento, arriscando frustrar a percepção de valor do dobrável pela linguagem de massa.',
                desafioGovernanca: 'Vocês preservaram recursos mantendo o parceiro histórico, mas arriscam comprometer o posicionamento do dobrável pela rigidez nuclear da agência do H1. Qual proposta de governança de comunicação institucional vocês implementarão para elevar o padrão da narrativa?'
            },
            {
                id: '4C',
                letra: 'C',
                arquetipo: 'Descentralização da Narrativa (Comunidade & Early Adopters)',
                titulo: 'Comunidade Tech, Early Adopters e Reviewers Independentes',
                resumo: 'Enviar lotes de pré-série para criadores de conteúdo tech e fomentar fóruns colaborativos de co-criação com entusiastas da tecnologia.',
                deltaMeses: -2,
                caracteristicasAtivadas: [
                    {
                        caracteristicaId: 'ponto_cego_estrutural',
                        efeito: 'Visibilidade orgânica de rede: validação técnica autêntica perante os compradores pioneiros que influenciam as decisões do mercado.'
                    },
                    {
                        caracteristicaId: 'rigidez_relacional',
                        efeito: 'Ruptura com a rigidez de mídia tradicional: migração dos recursos publicitários de intermediários consolidados para uma rede descentralizada.'
                    },
                    {
                        caracteristicaId: 'dependencia_operacional',
                        efeito: 'Ponto de atenção na reputação: ausência de controle sobre a mensagem; eventuais falhas ou quebras de tela serão expostas publicamente sem filtros.'
                    }
                ],
                diagnostico: 'Legitimação técnica rápida e autêntica perante o público pioneiro, com ponto de atenção centrado na total transparência e sinceridade dos influenciadores.',
                desafioGovernanca: 'Vocês ganharam autoridade técnica ao descentralizar a comunicação, mas abriram mão do controle da mensagem perante o público. Qual proposta de governança de relações públicas e gestão de crises vocês criarão para blindar a marca?'
            }
        ]
    }
];

// ============================================================================
// FUNÇÕES DE CÁLCULO E ANÁLISE DE REDE
// ============================================================================

export function calcularImpactoOpcao(opcao) {
    return {
        deltaMeses: opcao.deltaMeses || 0,
        caracteristicasAtivadas: opcao.caracteristicasAtivadas || []
    };
}

export function calcularPontuacoes(decisoes = {}) {
    let tempoTotalMeses = TEMPO_BASE_MESES;
    const caracteristicasConsolidadas = [];
    const deltasPorFase = {};

    FASES.forEach((fase) => {
        const opcaoId = decisoes[fase.chave];
        if (opcaoId) {
            const opcao = fase.opcoes.find(o => o.id === opcaoId);
            if (opcao) {
                tempoTotalMeses += opcao.deltaMeses;
                deltasPorFase[fase.chave] = opcao.deltaMeses;

                opcao.caracteristicasAtivadas.forEach(c => {
                    caracteristicasConsolidadas.push({
                        faseId: fase.faseId,
                        faseTitulo: fase.titulo,
                        opcaoId: opcao.id,
                        ...c
                    });
                });
            }
        }
    });

    const janela = classificarJanelaMercado(tempoTotalMeses);

    // Contadores por categoria
    let totalGargalos = 0;
    let totalAssimetrias = 0;
    let totalRigidezes = 0;

    caracteristicasConsolidadas.forEach(item => {
        const info = CARACTERISTICAS_REDE[item.caracteristicaId];
        if (info) {
            if (info.categoria === 'Gargalo Estrutural') totalGargalos++;
            if (info.categoria === 'Assimetria de Rede') totalAssimetrias++;
            if (info.categoria === 'Rigidez') totalRigidezes++;
        }
    });

    // Compatibilidade reversa com pontuações do motor antigo para não quebrar componentes existentes
    return {
        tempoTotalMeses,
        janela,
        deltasPorFase,
        caracteristicasConsolidadas,
        totalGargalos,
        totalAssimetrias,
        totalRigidezes,
        // Mocking de variáveis legadas para compatibilidade de visualização
        caixa: Math.max(10, 100 - (tempoTotalMeses * 2)),
        controle: Math.max(10, 100 - (totalGargalos * 10)),
        agilidade: Math.max(10, 100 - (totalRigidezes * 15)),
        altaExposicaoCaixa: false,
        altaExposicaoControle: false,
        altaExposicaoAgilidade: false,
        cascatasAtivadas: []
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
            resumo: `A equipe concluiu ${qtdDecisoes} de 4 decisões. Finalize a jornada para auditar a configuração da rede e o tempo final de lançamento.`
        };
    }

    const { tempoTotalMeses, janela } = pontuacoes;

    return {
        titulo: `${janela.titulo} — Lançamento em ${tempoTotalMeses} meses`,
        badge: janela.badge,
        tipo: janela.tipo,
        cor: janela.corBg,
        resumo: janela.resumo,
        recomendacao: 'Analise o mapa estrutural da sua rede e certifique-se de que as ações de governança formuladas pelo grupo cobrem adequadamente cada gargalo, assimetria e rigidez ativada.'
    };
}
