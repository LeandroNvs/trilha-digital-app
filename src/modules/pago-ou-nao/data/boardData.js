// ============================================================================
// DADOS 100% OFICIAIS DO JOGO "PAGO OU NÃO?" - RECEITA FEDERAL DO BRASIL
// Com Grafo Direcionado Real (Bifurcações Sem Saltos)
// ============================================================================

export const CONSTANTS = {
  INITIAL_MONEY: 1000,
  ROUND_REVENUE: 1000,
  TAX_AMOUNT: 300,
  NET_WHEN_PAYING: 700,
  NET_WHEN_EVADING: 1000,
  MALHA_FINA_TAX: 300,
  MALHA_FINA_FINE: 450,
  MALHA_FINA_TOTAL: 750,
  SPONTANEOUS_TOTAL: 300,
  FINISH_LINE_BONUS: 1000
};

export const SERVICE_CARDS = {
  educacao: {
    name: 'EDUCAÇÃO',
    color: '#10b981',
    sufficientImage: '/assets/servicos/image1.png',
    insufficientImage: '/assets/servicos/image2.png',
    events: {
      1: {
        sufficient: { text: '1- A escola é de ótima qualidade, avance 1 casa.', move: 1 },
        insufficient: { text: '1- As aulas atrasaram, fique 1 rodada em casa cuidando dele.', skipTurns: 1 }
      },
      2: {
        sufficient: { text: '2- A biblioteca tem o livro novinho. Avance 2 casas.', move: 2 },
        insufficient: { text: '2- A biblioteca não possui o livro. Pague $150 para comprar.', money: -150 }
      },
      3: {
        sufficient: { text: '3- A escola a ajudou tanto que ela venceu as olimpíadas de matemática. Receba $150.', money: 150 },
        insufficient: { text: '3- Pague $300 por um professor particular.', money: -300 }
      },
      4: {
        sufficient: { text: '4- Passou na faculdade pública! Ganhe $250 de presente!', money: 250 },
        insufficient: { text: '4- Faculdade particular. Pague $250 pela matrícula.', money: -250 }
      },
      5: {
        sufficient: { text: '5- Os alunos estão bem alimentados e motivados a estudar! Avance 2 casas.', move: 2 },
        insufficient: { text: '5- A comida não é suficiente para todas as crianças. Pague $200 pelo lanche do seu filho.', money: -200 }
      },
      6: {
        sufficient: { text: '6- A escola pagou a formatura. Receba $500 de presente.', money: 500 },
        insufficient: { text: '6- Pague $500 pela formatura.', money: -500 }
      },
      7: {
        sufficient: { text: '7- Conseguiram o aumento e as aulas não foram interrompidas! Avance 3 casas.', move: 3 },
        insufficient: { text: '7- As aulas estão interrompidas. Fique 1 rodada parado.', skipTurns: 1 }
      },
      8: {
        sufficient: { text: '8- Novos equipamentos melhoraram a aprendizagem! Role o dado novamente!', rollAgain: true },
        insufficient: { text: '8- Governo reduziu salário de professores para reduzir gastos. Volte 3 casas.', move: -3 }
      },
      9: {
        sufficient: { text: '9- Ele soube se comportar e ganhou um filhote de dodô! Receba $1000.', money: 1000 },
        insufficient: { text: '9- Ele não soube se comportar e acabou entrando na área de dodôs. Perca 2 rodadas para resgatá-lo.', skipTurns: 2 }
      },
      10: {
        sufficient: { text: '10- Os valentões entenderam que não devem maltratar o amigo! Role o dado novamente!', rollAgain: true },
        insufficient: { text: '10- Fique uma rodada sem jogar e vá na escola resolver o assunto!', skipTurns: 1 }
      }
    }
  },
  saude: {
    name: 'SAÚDE',
    color: '#ef4444',
    sufficientImage: '/assets/servicos/image3.png',
    insufficientImage: '/assets/servicos/image4.png',
    events: {
      1: {
        sufficient: { text: '1- Ganhou um gesso, pirulito e balão, avance 2 casas.', move: 2 },
        insufficient: { text: '1- Pague $100 para engessar o braço.', money: -100 }
      },
      2: {
        sufficient: { text: '2- Saiu do oculista com óculos novos e enxergando muito bem! Avance 3 casas.', move: 3 },
        insufficient: { text: '2- Pague $250 pela consulta no oculista particular.', money: -250 }
      },
      3: {
        sufficient: { text: '3- Tomou soro e está bem, receba indenização de $300!', money: 300 },
        insufficient: { text: '3- Pague $300 pelos remédios.', money: -300 }
      },
      4: {
        sufficient: { text: '4- Seus dentes estão brilhando! Sorria e avance 3 casas!', move: 3 },
        insufficient: { text: '4- Arrancaram o dente errado! Pague $250 por dente de ouro!', money: -250 }
      },
      5: {
        sufficient: { text: '5- Ajudou a salvar uma vida! Avance 2 casas.', move: 2 },
        insufficient: { text: '5- Não há enfermeira para colher o sangue. Volte para a casa em que estava anteriormente.', move: -2 }
      },
      6: {
        sufficient: { text: '6- O parto foi bem sucedido, receba $450.', money: 450 },
        insufficient: { text: '6- Faça o parto em casa, fique parado 1 rodada.', skipTurns: 1 }
      },
      7: {
        sufficient: { text: '7- Se curou rápido pois tomou vacina antes! Avance 3 casas.', move: 3 },
        insufficient: { text: '7- Passou para todos os jogadores. Todos ficam parados na próxima rodada!', skipAllPlayers: 1 }
      },
      8: {
        sufficient: { text: '8- Novos hospitais foram inaugurados! Avance 4 casas.', move: 4 },
        insufficient: { text: '8- Número de médicos foi reduzido nos hospitais. Volte 3 casas.', move: -3 }
      },
      9: {
        sufficient: { text: '9- Descobriram a cura de uma futura epidemia em você! Ganhe $750.', money: 750 },
        insufficient: { text: '9- Pague $750 e fique parado 1 rodada procurando um médico.', money: -750, skipTurns: 1 }
      },
      10: {
        sufficient: { text: '10- Você a levou ao hospital e ela ficou bem! Avance 4 casas!', move: 4 },
        insufficient: { text: '10- Pague $800 pelo tratamento!', money: -800 }
      }
    }
  },
  transporte: {
    name: 'TRANSPORTE',
    color: '#eab308',
    sufficientImage: '/assets/servicos/image5.png',
    insufficientImage: '/assets/servicos/image6.png',
    events: {
      1: {
        sufficient: { text: '1- A estrada estava em ótimas condições. Avance 2 casas.', move: 2 },
        insufficient: { text: '1- A estrada estava esburacada e o carro quebrou. Fique parado na próxima rodada.', skipTurns: 1 }
      },
      2: {
        sufficient: { text: '2- Chegou no destino com segurança e agilidade pela ciclovia! Avance 2 casas.', move: 2 },
        insufficient: { text: '2- Não há ciclovia. Volte 2 casas.', move: -2 }
      },
      3: {
        sufficient: { text: '3- Novas faixas de ônibus melhoraram o trânsito! Avance 2 casas.', move: 2 },
        insufficient: { text: '3- Sua linha de ônibus foi cortada! Pague $250 por um táxi.', money: -250 }
      },
      4: {
        sufficient: { text: '4- Há uma faixa de pedestres próxima e é seguro atravessar. Avance 3 casas.', move: 3 },
        insufficient: { text: '4- Procure uma faixa de pedestres para atravessar. Volte 3 casas.', move: -3 }
      },
      5: {
        sufficient: { text: '5- O trânsito flui bem! Avance 3 casas.', move: 3 },
        insufficient: { text: '5- As ruas estão cheias de carros! Volte 3 casas para procurar um desvio.', move: -3 }
      },
      6: {
        sufficient: { text: '6- O ônibus chegou no horário certo! Avance 4 casas.', move: 4 },
        insufficient: { text: '6- O ônibus está demorando para passar. Fique parado na próxima rodada.', skipTurns: 1 }
      },
      7: {
        sufficient: { text: '7- Chegou rápido em casa e ficou com sua família! Avance 4 casas.', move: 4 },
        insufficient: { text: '7- Os vagões estão lotados. Aguarde o próximo trem por 2 rodadas.', skipTurns: 2 }
      },
      8: {
        sufficient: { text: '8- Avance 4 casas e seja o primeiro a comer os docinhos!', move: 4 },
        insufficient: { text: '8- As ruas estão mal sinalizadas e você se perdeu no caminho. Volte 3 casas para pedir informação.', move: -3 }
      },
      9: {
        sufficient: { text: '9- Os guardas de trânsito estão controlando muito bem o fluxo de carros! Role o dado novamente!', rollAgain: true },
        insufficient: { text: '9- Engarrafamentos em toda a cidade! Fique parado por 2 rodadas.', skipTurns: 2 }
      },
      10: {
        sufficient: { text: '10- Outro ônibus chegou rapidamente no local. Avance 4 casas.', move: 4 },
        insufficient: { text: '10- O próximo ônibus vai demorar. Pague $750 por um táxi.', money: -750 }
      }
    }
  },
  seguranca: {
    name: 'SEGURANÇA',
    color: '#3b82f6',
    sufficientImage: '/assets/servicos/image7.png',
    insufficientImage: '/assets/servicos/image8.png',
    events: {
      1: {
        sufficient: { text: '1- A polícia pegou o ladrão e devolveu seu dinheiro! Avance 1 casa.', move: 1 },
        insufficient: { text: '1- Não encontraram o ladrão. Você perdeu $100.', money: -100 }
      },
      2: {
        sufficient: { text: '2- Policiais fizeram os pixadores repintarem sua casa! Avance 2 casas.', move: 2 },
        insufficient: { text: '2- A polícia não te levou a sério. Pague $200 por uma pintura nova.', money: -200 }
      },
      3: {
        sufficient: { text: '3- A polícia recuperou sua bicicleta! Avance 2 casas.', move: 2 },
        insufficient: { text: '3- Pague $300 por uma bicicleta nova.', money: -300 }
      },
      4: {
        sufficient: { text: '4- A polícia rastreou o número e fez o meliante pagar pelos insultos, receba $250.', money: 250 },
        insufficient: { text: '4- Volte 2 casas para rastrear o número.', move: -2 }
      },
      5: {
        sufficient: { text: '5- Os bombeiros conseguiram salvá-lo. Avance 2 casas.', move: 2 },
        insufficient: { text: '5- Os bombeiros não estão vindo, perca 1 rodada para resgatá-lo.', skipTurns: 1 }
      },
      6: {
        sufficient: { text: '6- Prenderam os comerciantes ilegais! Ganhe $500.', money: 500 },
        insufficient: { text: '6- Foi até a delegacia e nada foi resolvido. Perca 1 rodada.', skipTurns: 1 }
      },
      7: {
        sufficient: { text: '7- A patrulha pegou o assaltante no flagra! Avance 3 casas.', move: 3 },
        insufficient: { text: '7- A polícia não fez nada a respeito. Perca $500.', money: -500 }
      },
      8: {
        sufficient: { text: '8- Os bombeiros apagaram as chamas rapidamente! Receba $600 pela boa ação.', money: 600 },
        insufficient: { text: '8- Os bombeiros estão demorando. Perca 1 rodada apagando o fogo você mesmo!', skipTurns: 1 }
      },
      9: {
        sufficient: { text: '9- Perceberam o erro e o liberaram. Receba $800 de desculpas.', money: 800 },
        insufficient: { text: '9- Pague $800 pela fiança.', money: -800 }
      },
      10: {
        sufficient: { text: '10- A polícia prendeu os sequestradores! Avance 4 casas.', move: 4 },
        insufficient: { text: '10- Pague $1000 pelo resgate.', money: -1000 }
      }
    }
  }
};

export const BLUE_CARDS = [
  {
    id: 'rest_50',
    title: 'Restituição $50',
    description: 'Recupere $50 ao fim do jogo! (Guardada na sua mão até o Balanço Final).',
    image: '/assets/cartas_azuis/image1.png',
    type: 'restituicao',
    restitutionValue: 50
  },
  {
    id: 'rest_100',
    title: 'Restituição $100',
    description: 'Recupere $100 ao fim do jogo! (Guardada na sua mão até o Balanço Final).',
    image: '/assets/cartas_azuis/image3.png',
    type: 'restituicao',
    restitutionValue: 100
  },
  {
    id: 'rest_200',
    title: 'Restituição $200',
    description: 'Recupere $200 ao fim do jogo! (Guardada na sua mão até o Balanço Final).',
    image: '/assets/cartas_azuis/image4.png',
    type: 'restituicao',
    restitutionValue: 200
  },
  {
    id: 'rest_300',
    title: 'Restituição $300',
    description: 'Recupere $300 ao fim do jogo! (Guardada na sua mão até o Balanço Final).',
    image: '/assets/cartas_azuis/image5.png',
    type: 'restituicao',
    restitutionValue: 300
  },
  {
    id: 'jogada_bonus',
    title: 'Jogada Bônus!',
    description: 'Jogue o dado novamente! (+ $100 ao final)',
    image: '/assets/cartas_azuis/image7.png',
    type: 'jogada_bonus',
    restitutionValue: 100
  },
  {
    id: 'nova_chance',
    title: 'Nova Chance!',
    description: 'Embaralhe suas Cartas Azuis e melhore sua Restituição (+ $150 garantidos)!',
    image: '/assets/cartas_azuis/image8.png',
    type: 'nova_chance',
    restitutionValue: 150
  },
  {
    id: 'troca_carta',
    title: 'Troca de Carta!',
    description: 'Troque uma Carta Azul e receba bônus de regularidade fiscal (+ $150 ao final)!',
    image: '/assets/cartas_azuis/image6.png',
    type: 'troca_carta',
    restitutionValue: 150
  }
];

export const RED_CARDS = [
  {
    id: 'red_malha_fina',
    title: 'MALHA FINA!',
    description: 'Pague todos os impostos que deve ($300) + $450 de multa ($750 por cada imposto não pago) IMEDIATAMENTE!',
    image: '/assets/cartas_vermelhas/image8.png',
    effect: 'malha_fina'
  },
  {
    id: 'red_investigado',
    title: 'INVESTIGADO!',
    description: 'Fique parado na próxima rodada! Você está proibido de fazer denúncia espontânea nessa rodada.',
    image: '/assets/cartas_vermelhas/image7.png',
    effect: 'investigado'
  },
  {
    id: 'red_carta_negada',
    title: 'CARTA NEGADA!',
    description: 'Descarte uma Carta Azul de sua mão!',
    image: '/assets/cartas_vermelhas/image6.png',
    effect: 'carta_negada'
  },
  {
    id: 'red_ma_sorte',
    title: 'MÁ SORTE!',
    description: 'Volte 3 casas no tabuleiro imediatamente!',
    image: '/assets/cartas_vermelhas/image4.png',
    effect: 'ma_sorte'
  },
  {
    id: 'red_trapaceiro',
    title: 'TRAPACEIRO!',
    description: 'Descarte uma Carta Azul de um jogador adversário!',
    image: '/assets/cartas_vermelhas/image5.png',
    effect: 'trapaceiro'
  },
  {
    id: 'red_passou_perna',
    title: 'PASSOU A PERNA!',
    description: 'Mande o jogador mais avançado voltar 3 casas!',
    image: '/assets/cartas_vermelhas/image3.png',
    effect: 'passou_perna'
  },
  {
    id: 'red_troca',
    title: 'TROCA!',
    description: 'Troque de lugar se houver alguém à sua frente!',
    image: '/assets/cartas_vermelhas/image1.png',
    effect: 'troca'
  }
];

// ============================================================================
// GRAFO OFICIAL DAS 78 CASAS DO TABULEIRO (Com propriedade `next: [...]` exata!)
// - Bifurcação 1 na Casa #13: pode seguir para #14 (Leste do Hospital) ou #27 (Oeste do Hospital)
// - Bifurcação 2 na Casa #35: pode seguir para #36 (Beira do Lago) ou #49 (Jardim das Flores / Escola)
// ============================================================================
export const BOARD_TILES = [
  // Trilha Inicial (Praia -> Polícia): 0 a 13
  { id: 0, title: 'INÍCIO', subtitle: 'Praia • Ponto de Partida', type: 'inicio', color: '#94a3b8', u: 0.94, v: 0.93, next: [1] },
  { id: 1, title: 'Começou Devagar!', subtitle: 'Role o dado novamente', type: 'fixed', rollAgain: true, color: '#cbd5e1', u: 0.855, v: 0.928, next: [2] },
  { id: 2, title: 'Viajou de Carro!', subtitle: 'TRANSPORTE 1', type: 'service', sector: 'transporte', num: 1, color: '#fde047', u: 0.798, v: 0.925, next: [3] },
  { id: 3, title: 'Você Quebrou o Braço!', subtitle: 'SAÚDE 1', type: 'service', sector: 'saude', num: 1, color: '#fca5a5', u: 0.742, v: 0.918, next: [4] },
  { id: 4, title: 'As Aulas Vão Começar!', subtitle: 'EDUCAÇÃO 1', type: 'service', sector: 'educacao', num: 1, color: '#86efac', u: 0.688, v: 0.905, next: [5] },
  { id: 5, title: 'Furtaram sua Carteira!', subtitle: 'SEGURANÇA 1', type: 'service', sector: 'seguranca', num: 1, color: '#93c5fd', u: 0.640, v: 0.892, next: [6] },
  { id: 6, title: 'Loteria!', subtitle: 'Tente a Sorte!', type: 'loteria', color: '#cbd5e1', u: 0.582, v: 0.865, next: [7] },
  { id: 7, title: 'Entupiram sua Privada!', subtitle: 'Pague $150', type: 'fixed', money: -150, color: '#cbd5e1', u: 0.556, v: 0.812, next: [8] },
  { id: 8, title: 'Sua Visão Está Ruim!', subtitle: 'SAÚDE 2', type: 'service', sector: 'saude', num: 2, color: '#fca5a5', u: 0.594, v: 0.764, next: [9] },
  { id: 9, title: 'Ganhou o Bingo da Família!', subtitle: 'Receba $100 da sua avó', type: 'fixed', money: 100, color: '#cbd5e1', u: 0.646, v: 0.728, next: [10] },
  { id: 10, title: 'Você Foi Andar de Bicicleta!', subtitle: 'TRANSPORTE 2', type: 'service', sector: 'transporte', num: 2, color: '#fde047', u: 0.702, v: 0.698, next: [11] },
  { id: 11, title: 'Ajudou a Reserva de Animais!', subtitle: 'Avance 3 casas', type: 'fixed', move: 3, color: '#cbd5e1', u: 0.758, v: 0.658, next: [12] },
  { id: 12, title: 'Pixaram sua Casa!', subtitle: 'SEGURANÇA 2', type: 'service', sector: 'seguranca', num: 2, color: '#93c5fd', u: 0.812, v: 0.620, next: [13] },

  // 🔀 1ª BIFURCAÇÃO OFICIAL (Casa #13 -> Escolha entre #14 Direita do Hospital ou #27 Esquerda do Hospital)
  {
    id: 13,
    title: 'Fundos de Caridade!',
    subtitle: 'Doe $300 para rolar novamente • BIFURCAÇÃO',
    type: 'caridade',
    color: '#cbd5e1',
    u: 0.862,
    v: 0.580,
    next: [14, 27],
    branchLabels: {
      14: '🏥 Caminho Leste (Direita do Hospital)',
      27: '🚌 Caminho Oeste (Esquerda do Hospital)'
    }
  },

  // Ramo 1A: Direita do Hospital (14 -> 15 -> 16 -> 17 -> 18 -> 19 -> 20)
  { id: 14, title: 'Estão te Passando Trote!', subtitle: 'SEGURANÇA 4', type: 'service', sector: 'seguranca', num: 4, color: '#93c5fd', u: 0.908, v: 0.542, next: [15] },
  { id: 15, title: 'Vendeu sua Coleção de Selos!', subtitle: 'Receba $400', type: 'fixed', money: 400, color: '#cbd5e1', u: 0.945, v: 0.492, next: [16] },
  { id: 16, title: 'Seu Filho Precisa de um Livro!', subtitle: 'EDUCAÇÃO 2', type: 'service', sector: 'educacao', num: 2, color: '#86efac', u: 0.965, v: 0.428, next: [17] },
  { id: 17, title: 'Os Negócios Vão de Mal a Pior!', subtitle: 'Pague $250', type: 'fixed', money: -250, color: '#cbd5e1', u: 0.968, v: 0.358, next: [18] },
  { id: 18, title: 'Ajudou no Plantio de Árvores!', subtitle: 'Avance 2 casas', type: 'fixed', move: 2, color: '#cbd5e1', u: 0.958, v: 0.288, next: [19] },
  { id: 19, title: 'Foi ao Dentista!', subtitle: 'SAÚDE 4', type: 'service', sector: 'saude', num: 4, color: '#fca5a5', u: 0.932, v: 0.225, next: [20] },

  // Junção Superior do Hospital (#20) -> Rumo à Estátua (#28)
  { id: 20, title: 'Loteria!', subtitle: 'Tente a Sorte!', type: 'loteria', color: '#cbd5e1', u: 0.895, v: 0.175, next: [28] },

  // Ramo 1B: Esquerda do Hospital (27 -> 26 -> 25 -> 24 -> 23 -> 22 -> 21 -> 20)
  { id: 21, title: 'Roubaram sua Bicicleta!', subtitle: 'SEGURANÇA 3', type: 'service', sector: 'seguranca', num: 3, color: '#93c5fd', u: 0.848, v: 0.205, next: [20] },
  { id: 22, title: 'Resgatou Animais de Rua!', subtitle: 'Avance 2 casas', type: 'fixed', move: 2, color: '#cbd5e1', u: 0.805, v: 0.252, next: [21] },
  { id: 23, title: 'Ajudou uma Velhinha a Atravessar!', subtitle: 'TRANSPORTE 4', type: 'service', sector: 'transporte', num: 4, color: '#fde047', u: 0.762, v: 0.305, next: [22] },
  { id: 24, title: 'Você Está com Virose!', subtitle: 'SAÚDE 9', type: 'service', sector: 'saude', num: 9, color: '#fca5a5', u: 0.738, v: 0.372, next: [23] },
  { id: 25, title: 'Foi Almoçar na Casa da Vovó!', subtitle: 'Receba $100 e fique 1 rodada parado', type: 'fixed', money: 100, skipTurns: 1, color: '#cbd5e1', u: 0.745, v: 0.440, next: [24] },
  { id: 26, title: 'Sua Filha Está Mal em Matemática!', subtitle: 'EDUCAÇÃO 3', type: 'service', sector: 'educacao', num: 3, color: '#86efac', u: 0.775, v: 0.495, next: [25] },
  { id: 27, title: 'Foi de Ônibus ao Trabalho!', subtitle: 'TRANSPORTE 6', type: 'service', sector: 'transporte', num: 6, color: '#fde047', u: 0.822, v: 0.535, next: [26] },

  // Arco da Estátua (28 -> 29 -> 30 -> 31 -> 32 -> 33 -> 34 -> 35)
  { id: 28, title: 'Sua Filha Vai Entrar na Faculdade!', subtitle: 'EDUCAÇÃO 4', type: 'service', sector: 'educacao', num: 4, color: '#86efac', u: 0.858, v: 0.122, next: [29] },
  { id: 29, title: 'Foi ao Zoológico Cuidar de Pandas!', subtitle: 'Receba $200 e fique 1 rodada parado', type: 'fixed', money: 200, skipTurns: 1, color: '#cbd5e1', u: 0.808, v: 0.082, next: [30] },
  { id: 30, title: 'Reforma no Transporte!', subtitle: 'TRANSPORTE 3', type: 'service', sector: 'transporte', num: 3, color: '#fde047', u: 0.750, v: 0.068, next: [31] },
  { id: 31, title: 'Reformou sua Casa!', subtitle: 'Pague $500', type: 'fixed', money: -500, color: '#cbd5e1', u: 0.698, v: 0.072, next: [32] },
  { id: 32, title: 'Há um Gato Preso em uma Árvore!', subtitle: 'SEGURANÇA 5', type: 'service', sector: 'seguranca', num: 5, color: '#93c5fd', u: 0.650, v: 0.095, next: [33] },
  { id: 33, title: 'Você Ressuscitou os Dodôs!', subtitle: 'Receba $1000!', type: 'fixed', money: 1000, color: '#cbd5e1', u: 0.610, v: 0.145, next: [34] },
  { id: 34, title: 'Candidatou-se à Prefeitura!', subtitle: 'Pague $400 pela propaganda', type: 'fixed', money: -400, color: '#cbd5e1', u: 0.575, v: 0.202, next: [35] },

  // 🔀 2ª BIFURCAÇÃO OFICIAL (Casa #35 -> Escolha entre #36 Caminho do Lago ou #49 Caminho das Flores/Escola)
  {
    id: 35,
    title: 'Fundos de Caridade!',
    subtitle: 'Doe $300 para rolar novamente • BIFURCAÇÃO',
    type: 'caridade',
    color: '#cbd5e1',
    u: 0.542,
    v: 0.258,
    next: [36, 49],
    branchLabels: {
      36: '🦆 Caminho do Lago dos Patos (Sul)',
      49: '🌸 Caminho das Flores e Escola (Norte)'
    }
  },

  // Ramo 2A: Caminho do Lago dos Patos (36 -> 37 -> 38 -> 39 -> 40 -> 41 -> 42 -> 43 -> 44 -> 45 -> 46 -> 47 -> 48 -> 63)
  { id: 36, title: 'Seu Filho Vai Nascer!', subtitle: 'SAÚDE 6', type: 'service', sector: 'saude', num: 6, color: '#fca5a5', u: 0.585, v: 0.312, next: [37] },
  { id: 37, title: 'Seu Filho Foi Visitar o Zoológico!', subtitle: 'EDUCAÇÃO 9', type: 'service', sector: 'educacao', num: 9, color: '#86efac', u: 0.622, v: 0.368, next: [38] },
  { id: 38, title: 'Importou Produtos!', subtitle: 'Pague $100 de taxas de importação', type: 'fixed', money: -100, color: '#cbd5e1', u: 0.642, v: 0.440, next: [39] },
  { id: 39, title: 'Os Negócios Vão Bem!', subtitle: 'Receba $200', type: 'fixed', money: 200, color: '#cbd5e1', u: 0.635, v: 0.510, next: [40] },
  { id: 40, title: 'Denunciou Comércio Ilegal!', subtitle: 'SEGURANÇA 6', type: 'service', sector: 'seguranca', num: 6, color: '#93c5fd', u: 0.582, v: 0.545, next: [41] },
  { id: 41, title: 'DENÚNCIA!', subtitle: 'Casa Preta • Fiscalização Receita', type: 'denuncia', color: '#1e1b4b', u: 0.518, v: 0.535, next: [42] },
  { id: 42, title: 'Hora do Rush!', subtitle: 'TRANSPORTE 5', type: 'service', sector: 'transporte', num: 5, color: '#fde047', u: 0.462, v: 0.502, next: [43] },
  { id: 43, title: 'Mudanças na Educação!', subtitle: 'EDUCAÇÃO 8', type: 'service', sector: 'educacao', num: 8, color: '#86efac', u: 0.418, v: 0.452, next: [44] },
  { id: 44, title: 'Ajudou na Campanha do Agasalho!', subtitle: 'Avance 3 casas', type: 'fixed', move: 3, color: '#cbd5e1', u: 0.378, v: 0.402, next: [45] },
  { id: 45, title: 'Passou no Sinal Vermelho!', subtitle: 'Pague $350 de multa', type: 'fixed', money: -350, color: '#cbd5e1', u: 0.335, v: 0.360, next: [46] },
  { id: 46, title: 'Os Professores Entraram em Greve!', subtitle: 'EDUCAÇÃO 7', type: 'service', sector: 'educacao', num: 7, color: '#86efac', u: 0.282, v: 0.348, next: [47] },
  { id: 47, title: 'Fundos de Caridade!', subtitle: 'Doe $300 para rolar novamente', type: 'caridade', color: '#cbd5e1', u: 0.235, v: 0.385, next: [48] },
  { id: 48, title: 'Foi de Metrô para Casa!', subtitle: 'TRANSPORTE 7', type: 'service', sector: 'transporte', num: 7, color: '#fde047', u: 0.205, v: 0.450, next: [63] },

  // Ramo 2B: Caminho das Flores e Escola (49 -> 50 -> 51 -> 52 -> 53 -> 54 -> 55 -> 56 -> 57 -> 58 -> 59 -> 60 -> 61 -> 62 -> 63)
  { id: 49, title: 'Você Pegou Catapora!', subtitle: 'SAÚDE 7', type: 'service', sector: 'saude', num: 7, color: '#fca5a5', u: 0.495, v: 0.215, next: [50] },
  { id: 50, title: 'As Escolas Recebem Merenda!', subtitle: 'EDUCAÇÃO 5', type: 'service', sector: 'educacao', num: 5, color: '#86efac', u: 0.448, v: 0.178, next: [51] },
  { id: 51, title: 'Foi Doar Sangue!', subtitle: 'SAÚDE 5', type: 'service', sector: 'saude', num: 5, color: '#fca5a5', u: 0.400, v: 0.148, next: [52] },
  { id: 52, title: 'Jogou Lixo no Chão!', subtitle: 'Pague $150 de multa', type: 'fixed', money: -150, color: '#cbd5e1', u: 0.348, v: 0.122, next: [53] },
  { id: 53, title: 'DENÚNCIA!', subtitle: 'Casa Preta • Fiscalização Receita', type: 'denuncia', color: '#1e1b4b', u: 0.292, v: 0.108, next: [54] },
  { id: 54, title: 'Passou em um Concurso Público!', subtitle: 'Receba $500', type: 'fixed', money: 500, color: '#cbd5e1', u: 0.238, v: 0.105, next: [55] },
  { id: 55, title: 'Você Vai a uma Festa!', subtitle: 'TRANSPORTE 8', type: 'service', sector: 'transporte', num: 8, color: '#fde047', u: 0.185, v: 0.122, next: [56] },
  { id: 56, title: 'Herdou uma Fábrica de Paçoca!', subtitle: 'Receba $500', type: 'fixed', money: 500, color: '#cbd5e1', u: 0.138, v: 0.158, next: [57] },
  { id: 57, title: 'Seu Dodô Foi Sequestrado!', subtitle: 'SEGURANÇA 10', type: 'service', sector: 'seguranca', num: 10, color: '#93c5fd', u: 0.098, v: 0.210, next: [58] },
  { id: 58, title: 'Viagem com a Família!', subtitle: 'Pague $300', type: 'fixed', money: -300, color: '#cbd5e1', u: 0.072, v: 0.272, next: [59] },
  { id: 59, title: 'Você Foi Assaltado!', subtitle: 'SEGURANÇA 7', type: 'service', sector: 'seguranca', num: 7, color: '#93c5fd', u: 0.060, v: 0.340, next: [60] },
  { id: 60, title: 'Venceu Concurso de Talentos!', subtitle: 'Receba $250', type: 'fixed', money: 250, color: '#cbd5e1', u: 0.065, v: 0.408, next: [61] },
  { id: 61, title: 'Reforma na Saúde!', subtitle: 'SAÚDE 8', type: 'service', sector: 'saude', num: 8, color: '#fca5a5', u: 0.088, v: 0.465, next: [62] },
  { id: 62, title: 'Um Prédio Está em Chamas!', subtitle: 'SEGURANÇA 8', type: 'service', sector: 'seguranca', num: 8, color: '#93c5fd', u: 0.132, v: 0.502, next: [63] },

  // Reta Final (Junção em #63 Loteria! -> Receita Federal -> #77 FINAL)
  { id: 63, title: 'Loteria!', subtitle: 'Tente a Sorte!', type: 'loteria', color: '#cbd5e1', u: 0.188, v: 0.518, next: [64] },
  { id: 64, title: 'Atropelou um Dodô na Faixa!', subtitle: 'Pague $1000!', type: 'fixed', money: -1000, color: '#cbd5e1', u: 0.245, v: 0.520, next: [65] },
  { id: 65, title: 'Formatura de sua Filha!', subtitle: 'EDUCAÇÃO 6', type: 'service', sector: 'educacao', num: 6, color: '#86efac', u: 0.302, v: 0.522, next: [66] },
  { id: 66, title: 'Sua Geladeira Quebrou!', subtitle: 'Pague $600', type: 'fixed', money: -600, color: '#cbd5e1', u: 0.358, v: 0.535, next: [67] },
  { id: 67, title: 'Apagão! Semáforos Desligaram!', subtitle: 'TRANSPORTE 9', type: 'service', sector: 'transporte', num: 9, color: '#fde047', u: 0.408, v: 0.572, next: [68] },
  { id: 68, title: 'Ganhou um Prêmio na TV!', subtitle: 'Receba $500', type: 'fixed', money: 500, color: '#cbd5e1', u: 0.438, v: 0.638, next: [69] },
  { id: 69, title: 'Você Virou Cantor de Axé!', subtitle: 'Receba $700', type: 'fixed', money: 700, color: '#cbd5e1', u: 0.442, v: 0.712, next: [70] },
  { id: 70, title: 'Intoxicação Alimentar!', subtitle: 'SAÚDE 3', type: 'service', sector: 'saude', num: 3, color: '#fca5a5', u: 0.432, v: 0.782, next: [71] },
  { id: 71, title: 'Seu Filho Sofre Bullying!', subtitle: 'EDUCAÇÃO 10', type: 'service', sector: 'educacao', num: 10, color: '#86efac', u: 0.405, v: 0.838, next: [72] },
  { id: 72, title: 'Fundos de Caridade!', subtitle: 'Doe $300 para rolar novamente', type: 'caridade', color: '#cbd5e1', u: 0.362, v: 0.880, next: [73] },
  { id: 73, title: 'O Ônibus Quebrou!', subtitle: 'TRANSPORTE 10', type: 'service', sector: 'transporte', num: 10, color: '#fde047', u: 0.315, v: 0.908, next: [74] },
  { id: 74, title: 'Foi Preso Injustamente!', subtitle: 'SEGURANÇA 9', type: 'service', sector: 'seguranca', num: 9, color: '#93c5fd', u: 0.258, v: 0.925, next: [75] },
  { id: 75, title: 'Sua Vovó Está Doente!', subtitle: 'SAÚDE 10', type: 'service', sector: 'saude', num: 10, color: '#fca5a5', u: 0.202, v: 0.935, next: [76] },
  { id: 76, title: 'DENÚNCIA!', subtitle: 'Casa Preta • Última Fiscalização', type: 'denuncia', color: '#1e1b4b', u: 0.145, v: 0.935, next: [77] },
  { id: 77, title: 'FINAL', subtitle: 'Chegada • Bônus de $1000!', type: 'final', color: '#facc15', u: 0.048, v: 0.935, next: [] }
];

export const BOARD_WIDTH = 24;
export const BOARD_HEIGHT = 17;

export function getTilePosition3D(index) {
  const tile = BOARD_TILES.find((t) => t.id === index) || BOARD_TILES[0];
  const x = (tile.u - 0.5) * BOARD_WIDTH;
  const z = (tile.v - 0.5) * BOARD_HEIGHT;
  return [x, 0.18, z];
}

export const PLAYER_COLORS = [
  { name: 'Verde Esmeralda', hex: '#10b981' },
  { name: 'Azul Royal', hex: '#3b82f6' },
  { name: 'Amarelo Ouro', hex: '#f59e0b' },
  { name: 'Vermelho Rubi', hex: '#ef4444' },
  { name: 'Roxo Imperial', hex: '#a855f7' },
  { name: 'Rosa Neon', hex: '#ec4899' }
];
