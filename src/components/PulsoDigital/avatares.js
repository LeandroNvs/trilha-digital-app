// Catálogo visual de avatares para o Pulso Digital (Estilo Kahoot/Gamificado)

export const AVATARES = [
  {
    id: 'cyber_bot',
    nome: 'Cyber Bot',
    emoji: '🤖',
    corBg: 'from-cyan-500 to-blue-600',
    descricao: 'Especialista em automação e algoritmos'
  },
  {
    id: 'mago_dev',
    nome: 'Mago Dev',
    emoji: '🧙‍♂️',
    corBg: 'from-purple-500 to-indigo-600',
    descricao: 'Conjura soluções elegantes para problemas complexos'
  },
  {
    id: 'raposa_tech',
    nome: 'Raposa Tech',
    emoji: '🦊',
    corBg: 'from-orange-500 to-amber-600',
    descricao: 'Rápida, astuta e mestre em atalhos'
  },
  {
    id: 'astronauta',
    nome: 'Astronauta',
    emoji: '👨‍🚀',
    corBg: 'from-blue-600 to-violet-700',
    descricao: 'Explorador de novas fronteiras digitais'
  },
  {
    id: 'ninja_code',
    nome: 'Ninja Code',
    emoji: '🥷',
    corBg: 'from-gray-700 to-zinc-900',
    descricao: 'Silencioso, veloz e implacável na depuração'
  },
  {
    id: 'cientista',
    nome: 'Cientista de Dados',
    emoji: '👩‍🔬',
    corBg: 'from-emerald-500 to-teal-700',
    descricao: 'Transforma dados brutos em decisões precisas'
  },
  {
    id: 'hacker_etico',
    nome: 'Hacker Ético',
    emoji: '👾',
    corBg: 'from-green-500 to-emerald-600',
    descricao: 'Protegendo sistemas e descobrindo vulnerabilidades'
  },
  {
    id: 'arquiteto_nuvem',
    nome: 'Arquiteto Cloud',
    emoji: '☁️',
    corBg: 'from-sky-400 to-blue-500',
    descricao: 'Projetando infraestruturas escaláveis e resilientes'
  },
  {
    id: 'heroi_logica',
    nome: 'Herói da Lógica',
    emoji: '🦸',
    corBg: 'from-red-500 to-pink-600',
    descricao: 'Não descansa até a complexidade ser dominada'
  },
  {
    id: 'cacador_bug',
    nome: 'Caçador de Bug',
    emoji: '🐉',
    corBg: 'from-rose-600 to-red-700',
    descricao: 'Rastreia anomalias onde ninguém mais enxerga'
  },
  {
    id: 'foguete_ia',
    nome: 'Foguete IA',
    emoji: '🚀',
    corBg: 'from-amber-500 to-orange-600',
    descricao: 'Aceleração contínua rumo à inteligência aplicada'
  },
  {
    id: 'pixel_cat',
    nome: 'Pixel Cat',
    emoji: '🐱',
    corBg: 'from-fuchsia-500 to-pink-500',
    descricao: 'Curioso, perspicaz e atento a cada detalhe'
  },
  {
    id: 'mestre_zen',
    nome: 'Mestre Zen',
    emoji: '🧘',
    corBg: 'from-teal-400 to-teal-600',
    descricao: 'Mantém a calma e clareza mesmo sob pressão'
  },
  {
    id: 'falcao_agil',
    nome: 'Falcão Ágil',
    emoji: '🦅',
    corBg: 'from-yellow-500 to-amber-600',
    descricao: 'Visão panorâmica e foco afiado na meta'
  },
  {
    id: 'robo_turing',
    nome: 'Robô Turing',
    emoji: '🦾',
    corBg: 'from-slate-600 to-zinc-800',
    descricao: 'Potência computacional e precisão analítica'
  },
  {
    id: 'leao_lider',
    nome: 'Líder Estrategista',
    emoji: '🦁',
    corBg: 'from-yellow-600 to-orange-700',
    descricao: 'Comanda a rede com visão de futuro'
  },
  {
    id: 'panda_ux',
    nome: 'Panda UX',
    emoji: '🐼',
    corBg: 'from-lime-500 to-green-600',
    descricao: 'Foco total na experiência humana e usabilidade'
  },
  {
    id: 'alien_matrix',
    nome: 'Neo Alien',
    emoji: '👽',
    corBg: 'from-emerald-400 to-green-700',
    descricao: 'Perspectivas fora da caixa e disrupção'
  },
  {
    id: 'raio_turbo',
    nome: 'Raio Turbo',
    emoji: '⚡',
    corBg: 'from-amber-400 to-yellow-500',
    descricao: 'Energia máxima e resposta imediata'
  },
  {
    id: 'coruja_sabia',
    nome: 'Coruja Sábia',
    emoji: '🦉',
    corBg: 'from-indigo-500 to-purple-700',
    descricao: 'Guardiã do conhecimento e da visão tática'
  }
];

export const getAvatarPorId = (id) => {
  return AVATARES.find(a => a.id === id) || AVATARES[0];
};

export const sortearAvatar = () => {
  const indice = Math.floor(Math.random() * AVATARES.length);
  return AVATARES[indice];
};
