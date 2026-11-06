// src/pages/InteligenciaCompetitiva/AnaliseEstrategica.jsx
import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Bot, 
  Filter, 
  RotateCcw, 
  BarChart3, 
  Calendar, 
  MapPin, 
  Package, 
  Target, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  HelpCircle, 
  Smartphone,
  DollarSign,
  ShoppingCart,
  Layers,
  ArrowRight
} from 'lucide-react';

// DADOS DO CASO DE ESTUDO FORNECIDOS PELO PROFESSOR
const CASO_ESTUDO = {
  id: "ASI-CASE-VIÉ-01",
  titulo: "O Ponto Cego da Zona Norte: Quando a IA Sabota a Estratégia",
  empresa: "Distribuidora Paulista de Soluções B2B",
  diretriz: {
    meta: "Expandir 25% do faturamento na Zona Norte com foco no Produto Alpha (Linha de Entrada).",
    prazo: "Exercício 2026",
    status_realizado_6_meses: "Apenas 2,0% de participação global e R$ 0,00 de vendas do Produto Alpha.",
    diagnostico_curto: "Os agentes de IA foram treinados no histórico 2023-2025 e perpetuaram o viés de corte e descarte da Zona Norte."
  },
  esteira_agentes: [
    {
      id: "AG-01",
      nome: "LeadHunter AI",
      cargo: "Agente de Varredura e Prospecção",
      gatilho: "Disparo diário às 07h00",
      base_dados_consultada: "Histórico 2023-2025 (432 registros)",
      criterio_decisao: "Calcula score de similaridade com os 500 maiores clientes do passado.",
      acao_executada: "Corta 95% do orçamento de leads na Zona Norte por prever baixo potencial.",
      ponto_cego: "Não prospecta na Zona Norte porque a base do passado tem faturamento zero em Alpha."
    },
    {
      id: "AG-02",
      nome: "SDR Digital",
      cargo: "Agente de Qualificação e Triagem",
      gatilho: "Recebimento de lead do Agente 1",
      base_dados_consultada: "Tabela de restrições bancárias e compras passadas do Produto Alpha",
      criterio_decisao: "Exige 3 anos de CNPJ e histórico prévio de compras de produtos de alto tíquete.",
      acao_executada: "Classifica 95% dos compradores da Zona Norte como Lead Frio e encerra o contato.",
      ponto_cego: "Descarta novos comerciantes locais que buscam pela primeira vez o Produto Beta ou Alpha."
    },
    {
      id: "AG-03",
      nome: "Closer AI",
      cargo: "Agente de Negociação e Fechamento",
      gatilho: "Recebimento de proposta qualificada do Agente 2",
      base_dados_consultada: "Tabela de preços tradicional H1 e política de faturamento mínimo",
      criterio_decisao: "Exige pedido mínimo de R$ 15.000,00 e boleto faturado em 28 dias.",
      acao_executada: "Recusa pedidos menores e exige pagamento antecipado para novas praças.",
      ponto_cego: "Inviabiliza a entrada de clientes da Zona Norte que precisam de lotes de teste."
    }
  ],
  funil_agentes: {
    leads_gerados: { tradicionais: 1420, zona_norte: 85 },
    leads_qualificados: { tradicionais: 980, zona_norte: 4 },
    vendas_fechadas: { tradicionais: 328, zona_norte: 0 }
  }
};

// BASE HISTÓRICA COMPLETA (2023 - 2025)
const BASE_HISTORICA = [
  {"ano":2023,"mes":"Janeiro","mes_num":1,"zona":"Zona Sul","produto":"Alpha","pedidos":55,"total_rs":265869.63},
  {"ano":2023,"mes":"Janeiro","mes_num":1,"zona":"Zona Sul","produto":"Beta","pedidos":57,"total_rs":525794.18},
  {"ano":2023,"mes":"Janeiro","mes_num":1,"zona":"Zona Sul","produto":"Ômega","pedidos":19,"total_rs":641887.25},
  {"ano":2023,"mes":"Janeiro","mes_num":1,"zona":"Zona Leste","produto":"Alpha","pedidos":56,"total_rs":376432.18},
  {"ano":2023,"mes":"Janeiro","mes_num":1,"zona":"Zona Leste","produto":"Beta","pedidos":74,"total_rs":624167.37},
  {"ano":2023,"mes":"Janeiro","mes_num":1,"zona":"Zona Leste","produto":"Ômega","pedidos":28,"total_rs":630238.64},
  {"ano":2023,"mes":"Janeiro","mes_num":1,"zona":"Zona Oeste","produto":"Alpha","pedidos":37,"total_rs":190768.82},
  {"ano":2023,"mes":"Janeiro","mes_num":1,"zona":"Zona Oeste","produto":"Beta","pedidos":72,"total_rs":792726.74},
  {"ano":2023,"mes":"Janeiro","mes_num":1,"zona":"Zona Oeste","produto":"Ômega","pedidos":21,"total_rs":702582.59},
  {"ano":2023,"mes":"Janeiro","mes_num":1,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Janeiro","mes_num":1,"zona":"Zona Norte","produto":"Beta","pedidos":16,"total_rs":103493.11},
  {"ano":2023,"mes":"Janeiro","mes_num":1,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Fevereiro","mes_num":2,"zona":"Zona Sul","produto":"Alpha","pedidos":43,"total_rs":297916.53},
  {"ano":2023,"mes":"Fevereiro","mes_num":2,"zona":"Zona Sul","produto":"Beta","pedidos":40,"total_rs":471761.47},
  {"ano":2023,"mes":"Fevereiro","mes_num":2,"zona":"Zona Sul","produto":"Ômega","pedidos":20,"total_rs":663404.61},
  {"ano":2023,"mes":"Fevereiro","mes_num":2,"zona":"Zona Leste","produto":"Alpha","pedidos":45,"total_rs":240012.63},
  {"ano":2023,"mes":"Fevereiro","mes_num":2,"zona":"Zona Leste","produto":"Beta","pedidos":53,"total_rs":677661.46},
  {"ano":2023,"mes":"Fevereiro","mes_num":2,"zona":"Zona Leste","produto":"Ômega","pedidos":25,"total_rs":590884.11},
  {"ano":2023,"mes":"Fevereiro","mes_num":2,"zona":"Zona Oeste","produto":"Alpha","pedidos":47,"total_rs":225137.01},
  {"ano":2023,"mes":"Fevereiro","mes_num":2,"zona":"Zona Oeste","produto":"Beta","pedidos":62,"total_rs":683155.07},
  {"ano":2023,"mes":"Fevereiro","mes_num":2,"zona":"Zona Oeste","produto":"Ômega","pedidos":16,"total_rs":538811.34},
  {"ano":2023,"mes":"Fevereiro","mes_num":2,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Fevereiro","mes_num":2,"zona":"Zona Norte","produto":"Beta","pedidos":16,"total_rs":86990.27},
  {"ano":2023,"mes":"Fevereiro","mes_num":2,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Março","mes_num":3,"zona":"Zona Sul","produto":"Alpha","pedidos":37,"total_rs":227776.51},
  {"ano":2023,"mes":"Março","mes_num":3,"zona":"Zona Sul","produto":"Beta","pedidos":80,"total_rs":887407.9},
  {"ano":2023,"mes":"Março","mes_num":3,"zona":"Zona Sul","produto":"Ômega","pedidos":26,"total_rs":812178.49},
  {"ano":2023,"mes":"Março","mes_num":3,"zona":"Zona Leste","produto":"Alpha","pedidos":57,"total_rs":268393.93},
  {"ano":2023,"mes":"Março","mes_num":3,"zona":"Zona Leste","produto":"Beta","pedidos":54,"total_rs":640728.45},
  {"ano":2023,"mes":"Março","mes_num":3,"zona":"Zona Leste","produto":"Ômega","pedidos":17,"total_rs":606646.42},
  {"ano":2023,"mes":"Março","mes_num":3,"zona":"Zona Oeste","produto":"Alpha","pedidos":62,"total_rs":297786.27},
  {"ano":2023,"mes":"Março","mes_num":3,"zona":"Zona Oeste","produto":"Beta","pedidos":57,"total_rs":585221.94},
  {"ano":2023,"mes":"Março","mes_num":3,"zona":"Zona Oeste","produto":"Ômega","pedidos":26,"total_rs":639664.1},
  {"ano":2023,"mes":"Março","mes_num":3,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Março","mes_num":3,"zona":"Zona Norte","produto":"Beta","pedidos":13,"total_rs":74532.57},
  {"ano":2023,"mes":"Março","mes_num":3,"zona":"Zona Norte","produto":"Ômega","pedidos":1,"total_rs":22263.92},
  {"ano":2023,"mes":"Abril","mes_num":4,"zona":"Zona Sul","produto":"Alpha","pedidos":40,"total_rs":244096.79},
  {"ano":2023,"mes":"Abril","mes_num":4,"zona":"Zona Sul","produto":"Beta","pedidos":55,"total_rs":484935.69},
  {"ano":2023,"mes":"Abril","mes_num":4,"zona":"Zona Sul","produto":"Ômega","pedidos":27,"total_rs":710617.46},
  {"ano":2023,"mes":"Abril","mes_num":4,"zona":"Zona Leste","produto":"Alpha","pedidos":64,"total_rs":410879.95},
  {"ano":2023,"mes":"Abril","mes_num":4,"zona":"Zona Leste","produto":"Beta","pedidos":75,"total_rs":682355.69},
  {"ano":2023,"mes":"Abril","mes_num":4,"zona":"Zona Leste","produto":"Ômega","pedidos":25,"total_rs":887140.77},
  {"ano":2023,"mes":"Abril","mes_num":4,"zona":"Zona Oeste","produto":"Alpha","pedidos":59,"total_rs":275401.02},
  {"ano":2023,"mes":"Abril","mes_num":4,"zona":"Zona Oeste","produto":"Beta","pedidos":42,"total_rs":505059.62},
  {"ano":2023,"mes":"Abril","mes_num":4,"zona":"Zona Oeste","produto":"Ômega","pedidos":27,"total_rs":709664.06},
  {"ano":2023,"mes":"Abril","mes_num":4,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Abril","mes_num":4,"zona":"Zona Norte","produto":"Beta","pedidos":11,"total_rs":90155.74},
  {"ano":2023,"mes":"Abril","mes_num":4,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Maio","mes_num":5,"zona":"Zona Sul","produto":"Alpha","pedidos":57,"total_rs":310309.92},
  {"ano":2023,"mes":"Maio","mes_num":5,"zona":"Zona Sul","produto":"Beta","pedidos":71,"total_rs":708449.32},
  {"ano":2023,"mes":"Maio","mes_num":5,"zona":"Zona Sul","produto":"Ômega","pedidos":29,"total_rs":704292.42},
  {"ano":2023,"mes":"Maio","mes_num":5,"zona":"Zona Leste","produto":"Alpha","pedidos":39,"total_rs":204355.42},
  {"ano":2023,"mes":"Maio","mes_num":5,"zona":"Zona Leste","produto":"Beta","pedidos":75,"total_rs":802116.48},
  {"ano":2023,"mes":"Maio","mes_num":5,"zona":"Zona Leste","produto":"Ômega","pedidos":28,"total_rs":1018224.65},
  {"ano":2023,"mes":"Maio","mes_num":5,"zona":"Zona Oeste","produto":"Alpha","pedidos":47,"total_rs":262541.5},
  {"ano":2023,"mes":"Maio","mes_num":5,"zona":"Zona Oeste","produto":"Beta","pedidos":48,"total_rs":506286.31},
  {"ano":2023,"mes":"Maio","mes_num":5,"zona":"Zona Oeste","produto":"Ômega","pedidos":17,"total_rs":579572.75},
  {"ano":2023,"mes":"Maio","mes_num":5,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Maio","mes_num":5,"zona":"Zona Norte","produto":"Beta","pedidos":9,"total_rs":49814.5},
  {"ano":2023,"mes":"Maio","mes_num":5,"zona":"Zona Norte","produto":"Ômega","pedidos":2,"total_rs":44349.73},
  {"ano":2023,"mes":"Junho","mes_num":6,"zona":"Zona Sul","produto":"Alpha","pedidos":47,"total_rs":265308.32},
  {"ano":2023,"mes":"Junho","mes_num":6,"zona":"Zona Sul","produto":"Beta","pedidos":69,"total_rs":734544.45},
  {"ano":2023,"mes":"Junho","mes_num":6,"zona":"Zona Sul","produto":"Ômega","pedidos":15,"total_rs":493268.02},
  {"ano":2023,"mes":"Junho","mes_num":6,"zona":"Zona Leste","produto":"Alpha","pedidos":38,"total_rs":248714.98},
  {"ano":2023,"mes":"Junho","mes_num":6,"zona":"Zona Leste","produto":"Beta","pedidos":74,"total_rs":869824.79},
  {"ano":2023,"mes":"Junho","mes_num":6,"zona":"Zona Leste","produto":"Ômega","pedidos":25,"total_rs":594620.87},
  {"ano":2023,"mes":"Junho","mes_num":6,"zona":"Zona Oeste","produto":"Alpha","pedidos":48,"total_rs":238774.72},
  {"ano":2023,"mes":"Junho","mes_num":6,"zona":"Zona Oeste","produto":"Beta","pedidos":40,"total_rs":510763.19},
  {"ano":2023,"mes":"Junho","mes_num":6,"zona":"Zona Oeste","produto":"Ômega","pedidos":23,"total_rs":863654.82},
  {"ano":2023,"mes":"Junho","mes_num":6,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Junho","mes_num":6,"zona":"Zona Norte","produto":"Beta","pedidos":10,"total_rs":67768.86},
  {"ano":2023,"mes":"Junho","mes_num":6,"zona":"Zona Norte","produto":"Ômega","pedidos":2,"total_rs":47783.37},
  {"ano":2023,"mes":"Julho","mes_num":7,"zona":"Zona Sul","produto":"Alpha","pedidos":51,"total_rs":322672.44},
  {"ano":2023,"mes":"Julho","mes_num":7,"zona":"Zona Sul","produto":"Beta","pedidos":49,"total_rs":483608.89},
  {"ano":2023,"mes":"Julho","mes_num":7,"zona":"Zona Sul","produto":"Ômega","pedidos":20,"total_rs":612601.29},
  {"ano":2023,"mes":"Julho","mes_num":7,"zona":"Zona Leste","produto":"Alpha","pedidos":59,"total_rs":428770.83},
  {"ano":2023,"mes":"Julho","mes_num":7,"zona":"Zona Leste","produto":"Beta","pedidos":40,"total_rs":439788.92},
  {"ano":2023,"mes":"Julho","mes_num":7,"zona":"Zona Leste","produto":"Ômega","pedidos":30,"total_rs":669348.84},
  {"ano":2023,"mes":"Julho","mes_num":7,"zona":"Zona Oeste","produto":"Alpha","pedidos":64,"total_rs":357692.31},
  {"ano":2023,"mes":"Julho","mes_num":7,"zona":"Zona Oeste","produto":"Beta","pedidos":59,"total_rs":542638.43},
  {"ano":2023,"mes":"Julho","mes_num":7,"zona":"Zona Oeste","produto":"Ômega","pedidos":22,"total_rs":793059.38},
  {"ano":2023,"mes":"Julho","mes_num":7,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Julho","mes_num":7,"zona":"Zona Norte","produto":"Beta","pedidos":9,"total_rs":47698.08},
  {"ano":2023,"mes":"Julho","mes_num":7,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Agosto","mes_num":8,"zona":"Zona Sul","produto":"Alpha","pedidos":37,"total_rs":275056.28},
  {"ano":2023,"mes":"Agosto","mes_num":8,"zona":"Zona Sul","produto":"Beta","pedidos":74,"total_rs":875358.74},
  {"ano":2023,"mes":"Agosto","mes_num":8,"zona":"Zona Sul","produto":"Ômega","pedidos":19,"total_rs":618564.25},
  {"ano":2023,"mes":"Agosto","mes_num":8,"zona":"Zona Leste","produto":"Alpha","pedidos":65,"total_rs":399711.7},
  {"ano":2023,"mes":"Agosto","mes_num":8,"zona":"Zona Leste","produto":"Beta","pedidos":56,"total_rs":595748.66},
  {"ano":2023,"mes":"Agosto","mes_num":8,"zona":"Zona Leste","produto":"Ômega","pedidos":28,"total_rs":1048034.58},
  {"ano":2023,"mes":"Agosto","mes_num":8,"zona":"Zona Oeste","produto":"Alpha","pedidos":64,"total_rs":391544.85},
  {"ano":2023,"mes":"Agosto","mes_num":8,"zona":"Zona Oeste","produto":"Beta","pedidos":52,"total_rs":601366.73},
  {"ano":2023,"mes":"Agosto","mes_num":8,"zona":"Zona Oeste","produto":"Ômega","pedidos":27,"total_rs":1023904.52},
  {"ano":2023,"mes":"Agosto","mes_num":8,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Agosto","mes_num":8,"zona":"Zona Norte","produto":"Beta","pedidos":18,"total_rs":113525.49},
  {"ano":2023,"mes":"Agosto","mes_num":8,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Setembro","mes_num":9,"zona":"Zona Sul","produto":"Alpha","pedidos":49,"total_rs":238287.62},
  {"ano":2023,"mes":"Setembro","mes_num":9,"zona":"Zona Sul","produto":"Beta","pedidos":54,"total_rs":449286.99},
  {"ano":2023,"mes":"Setembro","mes_num":9,"zona":"Zona Sul","produto":"Ômega","pedidos":15,"total_rs":471194.09},
  {"ano":2023,"mes":"Setembro","mes_num":9,"zona":"Zona Leste","produto":"Alpha","pedidos":42,"total_rs":263143.45},
  {"ano":2023,"mes":"Setembro","mes_num":9,"zona":"Zona Leste","produto":"Beta","pedidos":40,"total_rs":334198.62},
  {"ano":2023,"mes":"Setembro","mes_num":9,"zona":"Zona Leste","produto":"Ômega","pedidos":16,"total_rs":410609.1},
  {"ano":2023,"mes":"Setembro","mes_num":9,"zona":"Zona Oeste","produto":"Alpha","pedidos":63,"total_rs":289437.05},
  {"ano":2023,"mes":"Setembro","mes_num":9,"zona":"Zona Oeste","produto":"Beta","pedidos":61,"total_rs":509611.49},
  {"ano":2023,"mes":"Setembro","mes_num":9,"zona":"Zona Oeste","produto":"Ômega","pedidos":22,"total_rs":582024.0},
  {"ano":2023,"mes":"Setembro","mes_num":9,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Setembro","mes_num":9,"zona":"Zona Norte","produto":"Beta","pedidos":15,"total_rs":86247.43},
  {"ano":2023,"mes":"Setembro","mes_num":9,"zona":"Zona Norte","produto":"Ômega","pedidos":2,"total_rs":39401.96},
  {"ano":2023,"mes":"Outubro","mes_num":10,"zona":"Zona Sul","produto":"Alpha","pedidos":50,"total_rs":346124.55},
  {"ano":2023,"mes":"Outubro","mes_num":10,"zona":"Zona Sul","produto":"Beta","pedidos":52,"total_rs":440524.71},
  {"ano":2023,"mes":"Outubro","mes_num":10,"zona":"Zona Sul","produto":"Ômega","pedidos":28,"total_rs":774725.31},
  {"ano":2023,"mes":"Outubro","mes_num":10,"zona":"Zona Leste","produto":"Alpha","pedidos":48,"total_rs":283251.55},
  {"ano":2023,"mes":"Outubro","mes_num":10,"zona":"Zona Leste","produto":"Beta","pedidos":43,"total_rs":488773.38},
  {"ano":2023,"mes":"Outubro","mes_num":10,"zona":"Zona Leste","produto":"Ômega","pedidos":18,"total_rs":413456.45},
  {"ano":2023,"mes":"Outubro","mes_num":10,"zona":"Zona Oeste","produto":"Alpha","pedidos":58,"total_rs":320038.65},
  {"ano":2023,"mes":"Outubro","mes_num":10,"zona":"Zona Oeste","produto":"Beta","pedidos":46,"total_rs":425190.96},
  {"ano":2023,"mes":"Outubro","mes_num":10,"zona":"Zona Oeste","produto":"Ômega","pedidos":21,"total_rs":642192.01},
  {"ano":2023,"mes":"Outubro","mes_num":10,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Outubro","mes_num":10,"zona":"Zona Norte","produto":"Beta","pedidos":10,"total_rs":64765.86},
  {"ano":2023,"mes":"Outubro","mes_num":10,"zona":"Zona Norte","produto":"Ômega","pedidos":1,"total_rs":24121.4},
  {"ano":2023,"mes":"Novembro","mes_num":11,"zona":"Zona Sul","produto":"Alpha","pedidos":37,"total_rs":215687.51},
  {"ano":2023,"mes":"Novembro","mes_num":11,"zona":"Zona Sul","produto":"Beta","pedidos":75,"total_rs":636715.77},
  {"ano":2023,"mes":"Novembro","mes_num":11,"zona":"Zona Sul","produto":"Ômega","pedidos":15,"total_rs":562559.1},
  {"ano":2023,"mes":"Novembro","mes_num":11,"zona":"Zona Leste","produto":"Alpha","pedidos":64,"total_rs":432684.58},
  {"ano":2023,"mes":"Novembro","mes_num":11,"zona":"Zona Leste","produto":"Beta","pedidos":55,"total_rs":485735.56},
  {"ano":2023,"mes":"Novembro","mes_num":11,"zona":"Zona Leste","produto":"Ômega","pedidos":30,"total_rs":891052.04},
  {"ano":2023,"mes":"Novembro","mes_num":11,"zona":"Zona Oeste","produto":"Alpha","pedidos":62,"total_rs":353593.49},
  {"ano":2023,"mes":"Novembro","mes_num":11,"zona":"Zona Oeste","produto":"Beta","pedidos":43,"total_rs":379396.98},
  {"ano":2023,"mes":"Novembro","mes_num":11,"zona":"Zona Oeste","produto":"Ômega","pedidos":15,"total_rs":566474.12},
  {"ano":2023,"mes":"Novembro","mes_num":11,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Novembro","mes_num":11,"zona":"Zona Norte","produto":"Beta","pedidos":12,"total_rs":98913.76},
  {"ano":2023,"mes":"Novembro","mes_num":11,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Dezembro","mes_num":12,"zona":"Zona Sul","produto":"Alpha","pedidos":44,"total_rs":253836.99},
  {"ano":2023,"mes":"Dezembro","mes_num":12,"zona":"Zona Sul","produto":"Beta","pedidos":75,"total_rs":848201.74},
  {"ano":2023,"mes":"Dezembro","mes_num":12,"zona":"Zona Sul","produto":"Ômega","pedidos":30,"total_rs":734302.48},
  {"ano":2023,"mes":"Dezembro","mes_num":12,"zona":"Zona Leste","produto":"Alpha","pedidos":44,"total_rs":226736.52},
  {"ano":2023,"mes":"Dezembro","mes_num":12,"zona":"Zona Leste","produto":"Beta","pedidos":43,"total_rs":468523.76},
  {"ano":2023,"mes":"Dezembro","mes_num":12,"zona":"Zona Leste","produto":"Ômega","pedidos":16,"total_rs":543481.74},
  {"ano":2023,"mes":"Dezembro","mes_num":12,"zona":"Zona Oeste","produto":"Alpha","pedidos":36,"total_rs":167415.37},
  {"ano":2023,"mes":"Dezembro","mes_num":12,"zona":"Zona Oeste","produto":"Beta","pedidos":70,"total_rs":735997.63},
  {"ano":2023,"mes":"Dezembro","mes_num":12,"zona":"Zona Oeste","produto":"Ômega","pedidos":20,"total_rs":458201.47},
  {"ano":2023,"mes":"Dezembro","mes_num":12,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2023,"mes":"Dezembro","mes_num":12,"zona":"Zona Norte","produto":"Beta","pedidos":16,"total_rs":84486.24},
  {"ano":2023,"mes":"Dezembro","mes_num":12,"zona":"Zona Norte","produto":"Ômega","pedidos":1,"total_rs":22726.49},
  
  // 2024
  {"ano":2024,"mes":"Janeiro","mes_num":1,"zona":"Zona Sul","produto":"Alpha","pedidos":42,"total_rs":239875.72},
  {"ano":2024,"mes":"Janeiro","mes_num":1,"zona":"Zona Sul","produto":"Beta","pedidos":76,"total_rs":701561.83},
  {"ano":2024,"mes":"Janeiro","mes_num":1,"zona":"Zona Sul","produto":"Ômega","pedidos":16,"total_rs":510561.67},
  {"ano":2024,"mes":"Janeiro","mes_num":1,"zona":"Zona Leste","produto":"Alpha","pedidos":48,"total_rs":310661.74},
  {"ano":2024,"mes":"Janeiro","mes_num":1,"zona":"Zona Leste","produto":"Beta","pedidos":76,"total_rs":806657.43},
  {"ano":2024,"mes":"Janeiro","mes_num":1,"zona":"Zona Leste","produto":"Ômega","pedidos":23,"total_rs":581167.39},
  {"ano":2024,"mes":"Janeiro","mes_num":1,"zona":"Zona Oeste","produto":"Alpha","pedidos":57,"total_rs":310225.44},
  {"ano":2024,"mes":"Janeiro","mes_num":1,"zona":"Zona Oeste","produto":"Beta","pedidos":56,"total_rs":558820.04},
  {"ano":2024,"mes":"Janeiro","mes_num":1,"zona":"Zona Oeste","produto":"Ômega","pedidos":24,"total_rs":703574.24},
  {"ano":2024,"mes":"Janeiro","mes_num":1,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Janeiro","mes_num":1,"zona":"Zona Norte","produto":"Beta","pedidos":9,"total_rs":45293.44},
  {"ano":2024,"mes":"Janeiro","mes_num":1,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Fevereiro","mes_num":2,"zona":"Zona Sul","produto":"Alpha","pedidos":53,"total_rs":396879.34},
  {"ano":2024,"mes":"Fevereiro","mes_num":2,"zona":"Zona Sul","produto":"Beta","pedidos":44,"total_rs":470279.57},
  {"ano":2024,"mes":"Fevereiro","mes_num":2,"zona":"Zona Sul","produto":"Ômega","pedidos":23,"total_rs":554744.02},
  {"ano":2024,"mes":"Fevereiro","mes_num":2,"zona":"Zona Leste","produto":"Alpha","pedidos":46,"total_rs":328559.26},
  {"ano":2024,"mes":"Fevereiro","mes_num":2,"zona":"Zona Leste","produto":"Beta","pedidos":55,"total_rs":541619.95},
  {"ano":2024,"mes":"Fevereiro","mes_num":2,"zona":"Zona Leste","produto":"Ômega","pedidos":20,"total_rs":580219.06},
  {"ano":2024,"mes":"Fevereiro","mes_num":2,"zona":"Zona Oeste","produto":"Alpha","pedidos":52,"total_rs":343752.23},
  {"ano":2024,"mes":"Fevereiro","mes_num":2,"zona":"Zona Oeste","produto":"Beta","pedidos":79,"total_rs":1020622.06},
  {"ano":2024,"mes":"Fevereiro","mes_num":2,"zona":"Zona Oeste","produto":"Ômega","pedidos":15,"total_rs":490287.17},
  {"ano":2024,"mes":"Fevereiro","mes_num":2,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Fevereiro","mes_num":2,"zona":"Zona Norte","produto":"Beta","pedidos":16,"total_rs":96765.21},
  {"ano":2024,"mes":"Fevereiro","mes_num":2,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Março","mes_num":3,"zona":"Zona Sul","produto":"Alpha","pedidos":65,"total_rs":463734.76},
  {"ano":2024,"mes":"Março","mes_num":3,"zona":"Zona Sul","produto":"Beta","pedidos":56,"total_rs":480320.03},
  {"ano":2024,"mes":"Março","mes_num":3,"zona":"Zona Sul","produto":"Ômega","pedidos":18,"total_rs":609816.0},
  {"ano":2024,"mes":"Março","mes_num":3,"zona":"Zona Leste","produto":"Alpha","pedidos":39,"total_rs":207364.74},
  {"ano":2024,"mes":"Março","mes_num":3,"zona":"Zona Leste","produto":"Beta","pedidos":78,"total_rs":706145.57},
  {"ano":2024,"mes":"Março","mes_num":3,"zona":"Zona Leste","produto":"Ômega","pedidos":25,"total_rs":631438.92},
  {"ano":2024,"mes":"Março","mes_num":3,"zona":"Zona Oeste","produto":"Alpha","pedidos":55,"total_rs":388230.61},
  {"ano":2024,"mes":"Março","mes_num":3,"zona":"Zona Oeste","produto":"Beta","pedidos":72,"total_rs":751871.47},
  {"ano":2024,"mes":"Março","mes_num":3,"zona":"Zona Oeste","produto":"Ômega","pedidos":16,"total_rs":375628.41},
  {"ano":2024,"mes":"Março","mes_num":3,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Março","mes_num":3,"zona":"Zona Norte","produto":"Beta","pedidos":14,"total_rs":110638.06},
  {"ano":2024,"mes":"Março","mes_num":3,"zona":"Zona Norte","produto":"Ômega","pedidos":2,"total_rs":46795.67},
  {"ano":2024,"mes":"Abril","mes_num":4,"zona":"Zona Sul","produto":"Alpha","pedidos":55,"total_rs":409166.66},
  {"ano":2024,"mes":"Abril","mes_num":4,"zona":"Zona Sul","produto":"Beta","pedidos":50,"total_rs":585307.73},
  {"ano":2024,"mes":"Abril","mes_num":4,"zona":"Zona Sul","produto":"Ômega","pedidos":28,"total_rs":867286.28},
  {"ano":2024,"mes":"Abril","mes_num":4,"zona":"Zona Leste","produto":"Alpha","pedidos":38,"total_rs":179577.8},
  {"ano":2024,"mes":"Abril","mes_num":4,"zona":"Zona Leste","produto":"Beta","pedidos":49,"total_rs":525669.62},
  {"ano":2024,"mes":"Abril","mes_num":4,"zona":"Zona Leste","produto":"Ômega","pedidos":26,"total_rs":814323.98},
  {"ano":2024,"mes":"Abril","mes_num":4,"zona":"Zona Oeste","produto":"Alpha","pedidos":39,"total_rs":225785.05},
  {"ano":2024,"mes":"Abril","mes_num":4,"zona":"Zona Oeste","produto":"Beta","pedidos":42,"total_rs":400734.25},
  {"ano":2024,"mes":"Abril","mes_num":4,"zona":"Zona Oeste","produto":"Ômega","pedidos":16,"total_rs":582124.71},
  {"ano":2024,"mes":"Abril","mes_num":4,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Abril","mes_num":4,"zona":"Zona Norte","produto":"Beta","pedidos":11,"total_rs":81259.57},
  {"ano":2024,"mes":"Abril","mes_num":4,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Maio","mes_num":5,"zona":"Zona Sul","produto":"Alpha","pedidos":46,"total_rs":314656.04},
  {"ano":2024,"mes":"Maio","mes_num":5,"zona":"Zona Sul","produto":"Beta","pedidos":66,"total_rs":849366.22},
  {"ano":2024,"mes":"Maio","mes_num":5,"zona":"Zona Sul","produto":"Ômega","pedidos":19,"total_rs":699432.2},
  {"ano":2024,"mes":"Maio","mes_num":5,"zona":"Zona Leste","produto":"Alpha","pedidos":42,"total_rs":297940.32},
  {"ano":2024,"mes":"Maio","mes_num":5,"zona":"Zona Leste","produto":"Beta","pedidos":51,"total_rs":632761.13},
  {"ano":2024,"mes":"Maio","mes_num":5,"zona":"Zona Leste","produto":"Ômega","pedidos":15,"total_rs":373046.56},
  {"ano":2024,"mes":"Maio","mes_num":5,"zona":"Zona Oeste","produto":"Alpha","pedidos":64,"total_rs":351779.61},
  {"ano":2024,"mes":"Maio","mes_num":5,"zona":"Zona Oeste","produto":"Beta","pedidos":66,"total_rs":792737.6},
  {"ano":2024,"mes":"Maio","mes_num":5,"zona":"Zona Oeste","produto":"Ômega","pedidos":22,"total_rs":577915.61},
  {"ano":2024,"mes":"Maio","mes_num":5,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Maio","mes_num":5,"zona":"Zona Norte","produto":"Beta","pedidos":9,"total_rs":57050.06},
  {"ano":2024,"mes":"Maio","mes_num":5,"zona":"Zona Norte","produto":"Ômega","pedidos":2,"total_rs":39114.07},
  {"ano":2024,"mes":"Junho","mes_num":6,"zona":"Zona Sul","produto":"Alpha","pedidos":61,"total_rs":442576.7},
  {"ano":2024,"mes":"Junho","mes_num":6,"zona":"Zona Sul","produto":"Beta","pedidos":62,"total_rs":590609.17},
  {"ano":2024,"mes":"Junho","mes_num":6,"zona":"Zona Sul","produto":"Ômega","pedidos":22,"total_rs":562469.09},
  {"ano":2024,"mes":"Junho","mes_num":6,"zona":"Zona Leste","produto":"Alpha","pedidos":56,"total_rs":284445.8},
  {"ano":2024,"mes":"Junho","mes_num":6,"zona":"Zona Leste","produto":"Beta","pedidos":61,"total_rs":572973.93},
  {"ano":2024,"mes":"Junho","mes_num":6,"zona":"Zona Leste","produto":"Ômega","pedidos":17,"total_rs":636993.84},
  {"ano":2024,"mes":"Junho","mes_num":6,"zona":"Zona Oeste","produto":"Alpha","pedidos":43,"total_rs":238797.85},
  {"ano":2024,"mes":"Junho","mes_num":6,"zona":"Zona Oeste","produto":"Beta","pedidos":72,"total_rs":719884.22},
  {"ano":2024,"mes":"Junho","mes_num":6,"zona":"Zona Oeste","produto":"Ômega","pedidos":25,"total_rs":925694.86},
  {"ano":2024,"mes":"Junho","mes_num":6,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Junho","mes_num":6,"zona":"Zona Norte","produto":"Beta","pedidos":9,"total_rs":72626.71},
  {"ano":2024,"mes":"Junho","mes_num":6,"zona":"Zona Norte","produto":"Ômega","pedidos":2,"total_rs":36535.6},
  {"ano":2024,"mes":"Julho","mes_num":7,"zona":"Zona Sul","produto":"Alpha","pedidos":54,"total_rs":313399.33},
  {"ano":2024,"mes":"Julho","mes_num":7,"zona":"Zona Sul","produto":"Beta","pedidos":60,"total_rs":610918.17},
  {"ano":2024,"mes":"Julho","mes_num":7,"zona":"Zona Sul","produto":"Ômega","pedidos":18,"total_rs":506936.28},
  {"ano":2024,"mes":"Julho","mes_num":7,"zona":"Zona Leste","produto":"Alpha","pedidos":53,"total_rs":268722.53},
  {"ano":2024,"mes":"Julho","mes_num":7,"zona":"Zona Leste","produto":"Beta","pedidos":42,"total_rs":484844.91},
  {"ano":2024,"mes":"Julho","mes_num":7,"zona":"Zona Leste","produto":"Ômega","pedidos":15,"total_rs":454780.88},
  {"ano":2024,"mes":"Julho","mes_num":7,"zona":"Zona Oeste","produto":"Alpha","pedidos":60,"total_rs":366921.36},
  {"ano":2024,"mes":"Julho","mes_num":7,"zona":"Zona Oeste","produto":"Beta","pedidos":52,"total_rs":510697.58},
  {"ano":2024,"mes":"Julho","mes_num":7,"zona":"Zona Oeste","produto":"Ômega","pedidos":17,"total_rs":632093.86},
  {"ano":2024,"mes":"Julho","mes_num":7,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Julho","mes_num":7,"zona":"Zona Norte","produto":"Beta","pedidos":13,"total_rs":93353.57},
  {"ano":2024,"mes":"Julho","mes_num":7,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Agosto","mes_num":8,"zona":"Zona Sul","produto":"Alpha","pedidos":38,"total_rs":253051.99},
  {"ano":2024,"mes":"Agosto","mes_num":8,"zona":"Zona Sul","produto":"Beta","pedidos":59,"total_rs":621601.14},
  {"ano":2024,"mes":"Agosto","mes_num":8,"zona":"Zona Sul","produto":"Ômega","pedidos":28,"total_rs":762129.94},
  {"ano":2024,"mes":"Agosto","mes_num":8,"zona":"Zona Leste","produto":"Alpha","pedidos":57,"total_rs":307057.04},
  {"ano":2024,"mes":"Agosto","mes_num":8,"zona":"Zona Leste","produto":"Beta","pedidos":48,"total_rs":430041.62},
  {"ano":2024,"mes":"Agosto","mes_num":8,"zona":"Zona Leste","produto":"Ômega","pedidos":27,"total_rs":886601.35},
  {"ano":2024,"mes":"Agosto","mes_num":8,"zona":"Zona Oeste","produto":"Alpha","pedidos":63,"total_rs":316391.17},
  {"ano":2024,"mes":"Agosto","mes_num":8,"zona":"Zona Oeste","produto":"Beta","pedidos":76,"total_rs":722360.95},
  {"ano":2024,"mes":"Agosto","mes_num":8,"zona":"Zona Oeste","produto":"Ômega","pedidos":15,"total_rs":402929.99},
  {"ano":2024,"mes":"Agosto","mes_num":8,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Agosto","mes_num":8,"zona":"Zona Norte","produto":"Beta","pedidos":11,"total_rs":71550.69},
  {"ano":2024,"mes":"Agosto","mes_num":8,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Setembro","mes_num":9,"zona":"Zona Sul","produto":"Alpha","pedidos":55,"total_rs":300671.12},
  {"ano":2024,"mes":"Setembro","mes_num":9,"zona":"Zona Sul","produto":"Beta","pedidos":68,"total_rs":694334.33},
  {"ano":2024,"mes":"Setembro","mes_num":9,"zona":"Zona Sul","produto":"Ômega","pedidos":21,"total_rs":633754.46},
  {"ano":2024,"mes":"Setembro","mes_num":9,"zona":"Zona Leste","produto":"Alpha","pedidos":60,"total_rs":432212.55},
  {"ano":2024,"mes":"Setembro","mes_num":9,"zona":"Zona Leste","produto":"Beta","pedidos":50,"total_rs":564712.69},
  {"ano":2024,"mes":"Setembro","mes_num":9,"zona":"Zona Leste","produto":"Ômega","pedidos":24,"total_rs":725933.57},
  {"ano":2024,"mes":"Setembro","mes_num":9,"zona":"Zona Oeste","produto":"Alpha","pedidos":55,"total_rs":349678.03},
  {"ano":2024,"mes":"Setembro","mes_num":9,"zona":"Zona Oeste","produto":"Beta","pedidos":45,"total_rs":544145.28},
  {"ano":2024,"mes":"Setembro","mes_num":9,"zona":"Zona Oeste","produto":"Ômega","pedidos":22,"total_rs":720824.08},
  {"ano":2024,"mes":"Setembro","mes_num":9,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Setembro","mes_num":9,"zona":"Zona Norte","produto":"Beta","pedidos":11,"total_rs":86052.67},
  {"ano":2024,"mes":"Setembro","mes_num":9,"zona":"Zona Norte","produto":"Ômega","pedidos":1,"total_rs":19713.9},
  {"ano":2024,"mes":"Outubro","mes_num":10,"zona":"Zona Sul","produto":"Alpha","pedidos":50,"total_rs":316691.1},
  {"ano":2024,"mes":"Outubro","mes_num":10,"zona":"Zona Sul","produto":"Beta","pedidos":44,"total_rs":452191.56},
  {"ano":2024,"mes":"Outubro","mes_num":10,"zona":"Zona Sul","produto":"Ômega","pedidos":21,"total_rs":703364.23},
  {"ano":2024,"mes":"Outubro","mes_num":10,"zona":"Zona Leste","produto":"Alpha","pedidos":47,"total_rs":281207.18},
  {"ano":2024,"mes":"Outubro","mes_num":10,"zona":"Zona Leste","produto":"Beta","pedidos":55,"total_rs":480582.12},
  {"ano":2024,"mes":"Outubro","mes_num":10,"zona":"Zona Leste","produto":"Ômega","pedidos":15,"total_rs":544238.36},
  {"ano":2024,"mes":"Outubro","mes_num":10,"zona":"Zona Oeste","produto":"Alpha","pedidos":62,"total_rs":422228.59},
  {"ano":2024,"mes":"Outubro","mes_num":10,"zona":"Zona Oeste","produto":"Beta","pedidos":46,"total_rs":547036.69},
  {"ano":2024,"mes":"Outubro","mes_num":10,"zona":"Zona Oeste","produto":"Ômega","pedidos":22,"total_rs":545912.11},
  {"ano":2024,"mes":"Outubro","mes_num":10,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Outubro","mes_num":10,"zona":"Zona Norte","produto":"Beta","pedidos":16,"total_rs":106014.79},
  {"ano":2024,"mes":"Outubro","mes_num":10,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Novembro","mes_num":11,"zona":"Zona Sul","produto":"Alpha","pedidos":64,"total_rs":450880.58},
  {"ano":2024,"mes":"Novembro","mes_num":11,"zona":"Zona Sul","produto":"Beta","pedidos":69,"total_rs":598001.99},
  {"ano":2024,"mes":"Novembro","mes_num":11,"zona":"Zona Sul","produto":"Ômega","pedidos":29,"total_rs":947756.07},
  {"ano":2024,"mes":"Novembro","mes_num":11,"zona":"Zona Leste","produto":"Alpha","pedidos":52,"total_rs":326890.56},
  {"ano":2024,"mes":"Novembro","mes_num":11,"zona":"Zona Leste","produto":"Beta","pedidos":68,"total_rs":752301.79},
  {"ano":2024,"mes":"Novembro","mes_num":11,"zona":"Zona Leste","produto":"Ômega","pedidos":28,"total_rs":988094.99},
  {"ano":2024,"mes":"Novembro","mes_num":11,"zona":"Zona Oeste","produto":"Alpha","pedidos":52,"total_rs":303562.52},
  {"ano":2024,"mes":"Novembro","mes_num":11,"zona":"Zona Oeste","produto":"Beta","pedidos":50,"total_rs":585913.86},
  {"ano":2024,"mes":"Novembro","mes_num":11,"zona":"Zona Oeste","produto":"Ômega","pedidos":30,"total_rs":876033.48},
  {"ano":2024,"mes":"Novembro","mes_num":11,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Novembro","mes_num":11,"zona":"Zona Norte","produto":"Beta","pedidos":11,"total_rs":87334.72},
  {"ano":2024,"mes":"Novembro","mes_num":11,"zona":"Zona Norte","produto":"Ômega","pedidos":2,"total_rs":44774.48},
  {"ano":2024,"mes":"Dezembro","mes_num":12,"zona":"Zona Sul","produto":"Alpha","pedidos":43,"total_rs":250243.56},
  {"ano":2024,"mes":"Dezembro","mes_num":12,"zona":"Zona Sul","produto":"Beta","pedidos":58,"total_rs":532003.14},
  {"ano":2024,"mes":"Dezembro","mes_num":12,"zona":"Zona Sul","produto":"Ômega","pedidos":25,"total_rs":677883.83},
  {"ano":2024,"mes":"Dezembro","mes_num":12,"zona":"Zona Leste","produto":"Alpha","pedidos":52,"total_rs":246570.11},
  {"ano":2024,"mes":"Dezembro","mes_num":12,"zona":"Zona Leste","produto":"Beta","pedidos":49,"total_rs":448659.06},
  {"ano":2024,"mes":"Dezembro","mes_num":12,"zona":"Zona Leste","produto":"Ômega","pedidos":19,"total_rs":632751.42},
  {"ano":2024,"mes":"Dezembro","mes_num":12,"zona":"Zona Oeste","produto":"Alpha","pedidos":37,"total_rs":212550.34},
  {"ano":2024,"mes":"Dezembro","mes_num":12,"zona":"Zona Oeste","produto":"Beta","pedidos":61,"total_rs":653496.4},
  {"ano":2024,"mes":"Dezembro","mes_num":12,"zona":"Zona Oeste","produto":"Ômega","pedidos":28,"total_rs":643895.04},
  {"ano":2024,"mes":"Dezembro","mes_num":12,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2024,"mes":"Dezembro","mes_num":12,"zona":"Zona Norte","produto":"Beta","pedidos":14,"total_rs":89084.36},
  {"ano":2024,"mes":"Dezembro","mes_num":12,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},

  // 2025
  {"ano":2025,"mes":"Janeiro","mes_num":1,"zona":"Zona Sul","produto":"Alpha","pedidos":65,"total_rs":428126.98},
  {"ano":2025,"mes":"Janeiro","mes_num":1,"zona":"Zona Sul","produto":"Beta","pedidos":76,"total_rs":752544.79},
  {"ano":2025,"mes":"Janeiro","mes_num":1,"zona":"Zona Sul","produto":"Ômega","pedidos":15,"total_rs":556258.0},
  {"ano":2025,"mes":"Janeiro","mes_num":1,"zona":"Zona Leste","produto":"Alpha","pedidos":44,"total_rs":297458.72},
  {"ano":2025,"mes":"Janeiro","mes_num":1,"zona":"Zona Leste","produto":"Beta","pedidos":66,"total_rs":705612.79},
  {"ano":2025,"mes":"Janeiro","mes_num":1,"zona":"Zona Leste","produto":"Ômega","pedidos":22,"total_rs":655856.78},
  {"ano":2025,"mes":"Janeiro","mes_num":1,"zona":"Zona Oeste","produto":"Alpha","pedidos":43,"total_rs":249722.84},
  {"ano":2025,"mes":"Janeiro","mes_num":1,"zona":"Zona Oeste","produto":"Beta","pedidos":41,"total_rs":407715.73},
  {"ano":2025,"mes":"Janeiro","mes_num":1,"zona":"Zona Oeste","produto":"Ômega","pedidos":27,"total_rs":906846.36},
  {"ano":2025,"mes":"Janeiro","mes_num":1,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Janeiro","mes_num":1,"zona":"Zona Norte","produto":"Beta","pedidos":15,"total_rs":123275.94},
  {"ano":2025,"mes":"Janeiro","mes_num":1,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Fevereiro","mes_num":2,"zona":"Zona Sul","produto":"Alpha","pedidos":52,"total_rs":238206.77},
  {"ano":2025,"mes":"Fevereiro","mes_num":2,"zona":"Zona Sul","produto":"Beta","pedidos":65,"total_rs":712365.15},
  {"ano":2025,"mes":"Fevereiro","mes_num":2,"zona":"Zona Sul","produto":"Ômega","pedidos":15,"total_rs":350147.39},
  {"ano":2025,"mes":"Fevereiro","mes_num":2,"zona":"Zona Leste","produto":"Alpha","pedidos":48,"total_rs":235540.73},
  {"ano":2025,"mes":"Fevereiro","mes_num":2,"zona":"Zona Leste","produto":"Beta","pedidos":69,"total_rs":614696.51},
  {"ano":2025,"mes":"Fevereiro","mes_num":2,"zona":"Zona Leste","produto":"Ômega","pedidos":23,"total_rs":645510.22},
  {"ano":2025,"mes":"Fevereiro","mes_num":2,"zona":"Zona Oeste","produto":"Alpha","pedidos":41,"total_rs":240428.02},
  {"ano":2025,"mes":"Fevereiro","mes_num":2,"zona":"Zona Oeste","produto":"Beta","pedidos":61,"total_rs":720175.06},
  {"ano":2025,"mes":"Fevereiro","mes_num":2,"zona":"Zona Oeste","produto":"Ômega","pedidos":27,"total_rs":714206.86},
  {"ano":2025,"mes":"Fevereiro","mes_num":2,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Fevereiro","mes_num":2,"zona":"Zona Norte","produto":"Beta","pedidos":14,"total_rs":82361.31},
  {"ano":2025,"mes":"Fevereiro","mes_num":2,"zona":"Zona Norte","produto":"Ômega","pedidos":1,"total_rs":23243.17},
  {"ano":2025,"mes":"Março","mes_num":3,"zona":"Zona Sul","produto":"Alpha","pedidos":36,"total_rs":269990.05},
  {"ano":2025,"mes":"Março","mes_num":3,"zona":"Zona Sul","produto":"Beta","pedidos":62,"total_rs":565508.87},
  {"ano":2025,"mes":"Março","mes_num":3,"zona":"Zona Sul","produto":"Ômega","pedidos":17,"total_rs":586495.39},
  {"ano":2025,"mes":"Março","mes_num":3,"zona":"Zona Leste","produto":"Alpha","pedidos":55,"total_rs":254142.59},
  {"ano":2025,"mes":"Março","mes_num":3,"zona":"Zona Leste","produto":"Beta","pedidos":41,"total_rs":522670.41},
  {"ano":2025,"mes":"Março","mes_num":3,"zona":"Zona Leste","produto":"Ômega","pedidos":21,"total_rs":743980.89},
  {"ano":2025,"mes":"Março","mes_num":3,"zona":"Zona Oeste","produto":"Alpha","pedidos":54,"total_rs":267685.94},
  {"ano":2025,"mes":"Março","mes_num":3,"zona":"Zona Oeste","produto":"Beta","pedidos":48,"total_rs":497654.65},
  {"ano":2025,"mes":"Março","mes_num":3,"zona":"Zona Oeste","produto":"Ômega","pedidos":18,"total_rs":558423.24},
  {"ano":2025,"mes":"Março","mes_num":3,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Março","mes_num":3,"zona":"Zona Norte","produto":"Beta","pedidos":11,"total_rs":72903.81},
  {"ano":2025,"mes":"Março","mes_num":3,"zona":"Zona Norte","produto":"Ômega","pedidos":2,"total_rs":38349.05},
  {"ano":2025,"mes":"Abril","mes_num":4,"zona":"Zona Sul","produto":"Alpha","pedidos":54,"total_rs":399125.03},
  {"ano":2025,"mes":"Abril","mes_num":4,"zona":"Zona Sul","produto":"Beta","pedidos":47,"total_rs":558781.09},
  {"ano":2025,"mes":"Abril","mes_num":4,"zona":"Zona Sul","produto":"Ômega","pedidos":20,"total_rs":748710.65},
  {"ano":2025,"mes":"Abril","mes_num":4,"zona":"Zona Leste","produto":"Alpha","pedidos":38,"total_rs":236970.06},
  {"ano":2025,"mes":"Abril","mes_num":4,"zona":"Zona Leste","produto":"Beta","pedidos":59,"total_rs":641860.03},
  {"ano":2025,"mes":"Abril","mes_num":4,"zona":"Zona Leste","produto":"Ômega","pedidos":27,"total_rs":765354.72},
  {"ano":2025,"mes":"Abril","mes_num":4,"zona":"Zona Oeste","produto":"Alpha","pedidos":57,"total_rs":290414.39},
  {"ano":2025,"mes":"Abril","mes_num":4,"zona":"Zona Oeste","produto":"Beta","pedidos":77,"total_rs":881886.55},
  {"ano":2025,"mes":"Abril","mes_num":4,"zona":"Zona Oeste","produto":"Ômega","pedidos":22,"total_rs":519869.26},
  {"ano":2025,"mes":"Abril","mes_num":4,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Abril","mes_num":4,"zona":"Zona Norte","produto":"Beta","pedidos":12,"total_rs":95712.32},
  {"ano":2025,"mes":"Abril","mes_num":4,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Maio","mes_num":5,"zona":"Zona Sul","produto":"Alpha","pedidos":38,"total_rs":261769.9},
  {"ano":2025,"mes":"Maio","mes_num":5,"zona":"Zona Sul","produto":"Beta","pedidos":76,"total_rs":905401.43},
  {"ano":2025,"mes":"Maio","mes_num":5,"zona":"Zona Sul","produto":"Ômega","pedidos":26,"total_rs":793622.02},
  {"ano":2025,"mes":"Maio","mes_num":5,"zona":"Zona Leste","produto":"Alpha","pedidos":56,"total_rs":314255.91},
  {"ano":2025,"mes":"Maio","mes_num":5,"zona":"Zona Leste","produto":"Beta","pedidos":72,"total_rs":809115.57},
  {"ano":2025,"mes":"Maio","mes_num":5,"zona":"Zona Leste","produto":"Ômega","pedidos":15,"total_rs":533898.15},
  {"ano":2025,"mes":"Maio","mes_num":5,"zona":"Zona Oeste","produto":"Alpha","pedidos":61,"total_rs":364206.91},
  {"ano":2025,"mes":"Maio","mes_num":5,"zona":"Zona Oeste","produto":"Beta","pedidos":67,"total_rs":857863.84},
  {"ano":2025,"mes":"Maio","mes_num":5,"zona":"Zona Oeste","produto":"Ômega","pedidos":29,"total_rs":966191.21},
  {"ano":2025,"mes":"Maio","mes_num":5,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Maio","mes_num":5,"zona":"Zona Norte","produto":"Beta","pedidos":14,"total_rs":78630.71},
  {"ano":2025,"mes":"Maio","mes_num":5,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Junho","mes_num":6,"zona":"Zona Sul","produto":"Alpha","pedidos":55,"total_rs":292063.6},
  {"ano":2025,"mes":"Junho","mes_num":6,"zona":"Zona Sul","produto":"Beta","pedidos":74,"total_rs":878617.34},
  {"ano":2025,"mes":"Junho","mes_num":6,"zona":"Zona Sul","produto":"Ômega","pedidos":29,"total_rs":840106.56},
  {"ano":2025,"mes":"Junho","mes_num":6,"zona":"Zona Leste","produto":"Alpha","pedidos":58,"total_rs":364090.58},
  {"ano":2025,"mes":"Junho","mes_num":6,"zona":"Zona Leste","produto":"Beta","pedidos":60,"total_rs":735513.95},
  {"ano":2025,"mes":"Junho","mes_num":6,"zona":"Zona Leste","produto":"Ômega","pedidos":17,"total_rs":449868.48},
  {"ano":2025,"mes":"Junho","mes_num":6,"zona":"Zona Oeste","produto":"Alpha","pedidos":49,"total_rs":256347.93},
  {"ano":2025,"mes":"Junho","mes_num":6,"zona":"Zona Oeste","produto":"Beta","pedidos":69,"total_rs":748598.13},
  {"ano":2025,"mes":"Junho","mes_num":6,"zona":"Zona Oeste","produto":"Ômega","pedidos":27,"total_rs":739323.34},
  {"ano":2025,"mes":"Junho","mes_num":6,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Junho","mes_num":6,"zona":"Zona Norte","produto":"Beta","pedidos":15,"total_rs":119675.02},
  {"ano":2025,"mes":"Junho","mes_num":6,"zona":"Zona Norte","produto":"Ômega","pedidos":1,"total_rs":20483.77},
  {"ano":2025,"mes":"Julho","mes_num":7,"zona":"Zona Sul","produto":"Alpha","pedidos":43,"total_rs":237403.71},
  {"ano":2025,"mes":"Julho","mes_num":7,"zona":"Zona Sul","produto":"Beta","pedidos":78,"total_rs":897461.66},
  {"ano":2025,"mes":"Julho","mes_num":7,"zona":"Zona Sul","produto":"Ômega","pedidos":23,"total_rs":710531.1},
  {"ano":2025,"mes":"Julho","mes_num":7,"zona":"Zona Leste","produto":"Alpha","pedidos":51,"total_rs":374553.57},
  {"ano":2025,"mes":"Julho","mes_num":7,"zona":"Zona Leste","produto":"Beta","pedidos":45,"total_rs":414305.11},
  {"ano":2025,"mes":"Julho","mes_num":7,"zona":"Zona Leste","produto":"Ômega","pedidos":28,"total_rs":834882.88},
  {"ano":2025,"mes":"Julho","mes_num":7,"zona":"Zona Oeste","produto":"Alpha","pedidos":59,"total_rs":308037.34},
  {"ano":2025,"mes":"Julho","mes_num":7,"zona":"Zona Oeste","produto":"Beta","pedidos":70,"total_rs":786066.01},
  {"ano":2025,"mes":"Julho","mes_num":7,"zona":"Zona Oeste","produto":"Ômega","pedidos":30,"total_rs":875123.78},
  {"ano":2025,"mes":"Julho","mes_num":7,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Julho","mes_num":7,"zona":"Zona Norte","produto":"Beta","pedidos":8,"total_rs":42605.49},
  {"ano":2025,"mes":"Julho","mes_num":7,"zona":"Zona Norte","produto":"Ômega","pedidos":1,"total_rs":20143.44},
  {"ano":2025,"mes":"Agosto","mes_num":8,"zona":"Zona Sul","produto":"Alpha","pedidos":53,"total_rs":297174.25},
  {"ano":2025,"mes":"Agosto","mes_num":8,"zona":"Zona Sul","produto":"Beta","pedidos":75,"total_rs":799095.72},
  {"ano":2025,"mes":"Agosto","mes_num":8,"zona":"Zona Sul","produto":"Ômega","pedidos":28,"total_rs":1062490.9},
  {"ano":2025,"mes":"Agosto","mes_num":8,"zona":"Zona Leste","produto":"Alpha","pedidos":52,"total_rs":285603.44},
  {"ano":2025,"mes":"Agosto","mes_num":8,"zona":"Zona Leste","produto":"Beta","pedidos":69,"total_rs":645466.17},
  {"ano":2025,"mes":"Agosto","mes_num":8,"zona":"Zona Leste","produto":"Ômega","pedidos":23,"total_rs":590838.0},
  {"ano":2025,"mes":"Agosto","mes_num":8,"zona":"Zona Oeste","produto":"Alpha","pedidos":58,"total_rs":294509.67},
  {"ano":2025,"mes":"Agosto","mes_num":8,"zona":"Zona Oeste","produto":"Beta","pedidos":47,"total_rs":550577.05},
  {"ano":2025,"mes":"Agosto","mes_num":8,"zona":"Zona Oeste","produto":"Ômega","pedidos":20,"total_rs":501293.11},
  {"ano":2025,"mes":"Agosto","mes_num":8,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Agosto","mes_num":8,"zona":"Zona Norte","produto":"Beta","pedidos":15,"total_rs":89516.23},
  {"ano":2025,"mes":"Agosto","mes_num":8,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Setembro","mes_num":9,"zona":"Zona Sul","produto":"Alpha","pedidos":59,"total_rs":358360.73},
  {"ano":2025,"mes":"Setembro","mes_num":9,"zona":"Zona Sul","produto":"Beta","pedidos":58,"total_rs":748348.08},
  {"ano":2025,"mes":"Setembro","mes_num":9,"zona":"Zona Sul","produto":"Ômega","pedidos":21,"total_rs":561538.81},
  {"ano":2025,"mes":"Setembro","mes_num":9,"zona":"Zona Leste","produto":"Alpha","pedidos":46,"total_rs":231762.93},
  {"ano":2025,"mes":"Setembro","mes_num":9,"zona":"Zona Leste","produto":"Beta","pedidos":40,"total_rs":461603.7},
  {"ano":2025,"mes":"Setembro","mes_num":9,"zona":"Zona Leste","produto":"Ômega","pedidos":19,"total_rs":501390.64},
  {"ano":2025,"mes":"Setembro","mes_num":9,"zona":"Zona Oeste","produto":"Alpha","pedidos":36,"total_rs":221762.77},
  {"ano":2025,"mes":"Setembro","mes_num":9,"zona":"Zona Oeste","produto":"Beta","pedidos":48,"total_rs":537088.72},
  {"ano":2025,"mes":"Setembro","mes_num":9,"zona":"Zona Oeste","produto":"Ômega","pedidos":30,"total_rs":709242.07},
  {"ano":2025,"mes":"Setembro","mes_num":9,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Setembro","mes_num":9,"zona":"Zona Norte","produto":"Beta","pedidos":8,"total_rs":56073.8},
  {"ano":2025,"mes":"Setembro","mes_num":9,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Outubro","mes_num":10,"zona":"Zona Sul","produto":"Alpha","pedidos":49,"total_rs":270583.77},
  {"ano":2025,"mes":"Outubro","mes_num":10,"zona":"Zona Sul","produto":"Beta","pedidos":43,"total_rs":398282.85},
  {"ano":2025,"mes":"Outubro","mes_num":10,"zona":"Zona Sul","produto":"Ômega","pedidos":30,"total_rs":714761.83},
  {"ano":2025,"mes":"Outubro","mes_num":10,"zona":"Zona Leste","produto":"Alpha","pedidos":37,"total_rs":210978.53},
  {"ano":2025,"mes":"Outubro","mes_num":10,"zona":"Zona Leste","produto":"Beta","pedidos":44,"total_rs":478944.65},
  {"ano":2025,"mes":"Outubro","mes_num":10,"zona":"Zona Leste","produto":"Ômega","pedidos":16,"total_rs":390842.11},
  {"ano":2025,"mes":"Outubro","mes_num":10,"zona":"Zona Oeste","produto":"Alpha","pedidos":60,"total_rs":371311.13},
  {"ano":2025,"mes":"Outubro","mes_num":10,"zona":"Zona Oeste","produto":"Beta","pedidos":59,"total_rs":497128.37},
  {"ano":2025,"mes":"Outubro","mes_num":10,"zona":"Zona Oeste","produto":"Ômega","pedidos":22,"total_rs":525694.95},
  {"ano":2025,"mes":"Outubro","mes_num":10,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Outubro","mes_num":10,"zona":"Zona Norte","produto":"Beta","pedidos":14,"total_rs":99709.56},
  {"ano":2025,"mes":"Outubro","mes_num":10,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Novembro","mes_num":11,"zona":"Zona Sul","produto":"Alpha","pedidos":42,"total_rs":286737.39},
  {"ano":2025,"mes":"Novembro","mes_num":11,"zona":"Zona Sul","produto":"Beta","pedidos":64,"total_rs":656164.63},
  {"ano":2025,"mes":"Novembro","mes_num":11,"zona":"Zona Sul","produto":"Ômega","pedidos":29,"total_rs":775971.85},
  {"ano":2025,"mes":"Novembro","mes_num":11,"zona":"Zona Leste","produto":"Alpha","pedidos":53,"total_rs":395914.97},
  {"ano":2025,"mes":"Novembro","mes_num":11,"zona":"Zona Leste","produto":"Beta","pedidos":59,"total_rs":639745.69},
  {"ano":2025,"mes":"Novembro","mes_num":11,"zona":"Zona Leste","produto":"Ômega","pedidos":16,"total_rs":508065.51},
  {"ano":2025,"mes":"Novembro","mes_num":11,"zona":"Zona Oeste","produto":"Alpha","pedidos":58,"total_rs":278266.64},
  {"ano":2025,"mes":"Novembro","mes_num":11,"zona":"Zona Oeste","produto":"Beta","pedidos":53,"total_rs":589761.48},
  {"ano":2025,"mes":"Novembro","mes_num":11,"zona":"Zona Oeste","produto":"Ômega","pedidos":23,"total_rs":749037.55},
  {"ano":2025,"mes":"Novembro","mes_num":11,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Novembro","mes_num":11,"zona":"Zona Norte","produto":"Beta","pedidos":10,"total_rs":58395.28},
  {"ano":2025,"mes":"Novembro","mes_num":11,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Dezembro","mes_num":12,"zona":"Zona Sul","produto":"Alpha","pedidos":40,"total_rs":180321.09},
  {"ano":2025,"mes":"Dezembro","mes_num":12,"zona":"Zona Sul","produto":"Beta","pedidos":68,"total_rs":778386.19},
  {"ano":2025,"mes":"Dezembro","mes_num":12,"zona":"Zona Sul","produto":"Ômega","pedidos":30,"total_rs":799804.46},
  {"ano":2025,"mes":"Dezembro","mes_num":12,"zona":"Zona Leste","produto":"Alpha","pedidos":42,"total_rs":225301.22},
  {"ano":2025,"mes":"Dezembro","mes_num":12,"zona":"Zona Leste","produto":"Beta","pedidos":58,"total_rs":667866.39},
  {"ano":2025,"mes":"Dezembro","mes_num":12,"zona":"Zona Leste","produto":"Ômega","pedidos":29,"total_rs":671027.41},
  {"ano":2025,"mes":"Dezembro","mes_num":12,"zona":"Zona Oeste","produto":"Alpha","pedidos":42,"total_rs":305412.79},
  {"ano":2025,"mes":"Dezembro","mes_num":12,"zona":"Zona Oeste","produto":"Beta","pedidos":80,"total_rs":875915.84},
  {"ano":2025,"mes":"Dezembro","mes_num":12,"zona":"Zona Oeste","produto":"Ômega","pedidos":21,"total_rs":604846.69},
  {"ano":2025,"mes":"Dezembro","mes_num":12,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2025,"mes":"Dezembro","mes_num":12,"zona":"Zona Norte","produto":"Beta","pedidos":16,"total_rs":92589.33},
  {"ano":2025,"mes":"Dezembro","mes_num":12,"zona":"Zona Norte","produto":"Ômega","pedidos":2,"total_rs":47572.84}
];

// BASE DOS ÚLTIMOS 6 MESES (EXECUÇÃO 2026: MAIO A OUTUBRO)
const BASE_ULTIMOS_6_MESES = [
  {"ano":2026,"mes":"Maio","mes_num":5,"zona":"Zona Sul","produto":"Alpha","pedidos":51,"total_rs":310250.07},
  {"ano":2026,"mes":"Maio","mes_num":5,"zona":"Zona Sul","produto":"Beta","pedidos":86,"total_rs":900079.95},
  {"ano":2026,"mes":"Maio","mes_num":5,"zona":"Zona Sul","produto":"Ômega","pedidos":21,"total_rs":660347.39},
  {"ano":2026,"mes":"Maio","mes_num":5,"zona":"Zona Leste","produto":"Alpha","pedidos":67,"total_rs":421848.91},
  {"ano":2026,"mes":"Maio","mes_num":5,"zona":"Zona Leste","produto":"Beta","pedidos":63,"total_rs":622323.02},
  {"ano":2026,"mes":"Maio","mes_num":5,"zona":"Zona Leste","produto":"Ômega","pedidos":30,"total_rs":1036090.62},
  {"ano":2026,"mes":"Maio","mes_num":5,"zona":"Zona Oeste","produto":"Alpha","pedidos":72,"total_rs":432650.81},
  {"ano":2026,"mes":"Maio","mes_num":5,"zona":"Zona Oeste","produto":"Beta","pedidos":60,"total_rs":838948.84},
  {"ano":2026,"mes":"Maio","mes_num":5,"zona":"Zona Oeste","produto":"Ômega","pedidos":22,"total_rs":878607.75},
  {"ano":2026,"mes":"Maio","mes_num":5,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2026,"mes":"Maio","mes_num":5,"zona":"Zona Norte","produto":"Beta","pedidos":24,"total_rs":149869.66},
  {"ano":2026,"mes":"Maio","mes_num":5,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2026,"mes":"Junho","mes_num":6,"zona":"Zona Sul","produto":"Alpha","pedidos":60,"total_rs":456943.77},
  {"ano":2026,"mes":"Junho","mes_num":6,"zona":"Zona Sul","produto":"Beta","pedidos":66,"total_rs":922659.71},
  {"ano":2026,"mes":"Junho","mes_num":6,"zona":"Zona Sul","produto":"Ômega","pedidos":22,"total_rs":799509.67},
  {"ano":2026,"mes":"Junho","mes_num":6,"zona":"Zona Leste","produto":"Alpha","pedidos":54,"total_rs":421590.8},
  {"ano":2026,"mes":"Junho","mes_num":6,"zona":"Zona Leste","produto":"Beta","pedidos":61,"total_rs":646899.41},
  {"ano":2026,"mes":"Junho","mes_num":6,"zona":"Zona Leste","produto":"Ômega","pedidos":33,"total_rs":1146681.94},
  {"ano":2026,"mes":"Junho","mes_num":6,"zona":"Zona Oeste","produto":"Alpha","pedidos":58,"total_rs":391422.62},
  {"ano":2026,"mes":"Junho","mes_num":6,"zona":"Zona Oeste","produto":"Beta","pedidos":62,"total_rs":820159.01},
  {"ano":2026,"mes":"Junho","mes_num":6,"zona":"Zona Oeste","produto":"Ômega","pedidos":30,"total_rs":1016051.83},
  {"ano":2026,"mes":"Junho","mes_num":6,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2026,"mes":"Junho","mes_num":6,"zona":"Zona Norte","produto":"Beta","pedidos":25,"total_rs":168100.47},
  {"ano":2026,"mes":"Junho","mes_num":6,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2026,"mes":"Julho","mes_num":7,"zona":"Zona Sul","produto":"Alpha","pedidos":69,"total_rs":504244.87},
  {"ano":2026,"mes":"Julho","mes_num":7,"zona":"Zona Sul","produto":"Beta","pedidos":80,"total_rs":725521.16},
  {"ano":2026,"mes":"Julho","mes_num":7,"zona":"Zona Sul","produto":"Ômega","pedidos":36,"total_rs":1165844.65},
  {"ano":2026,"mes":"Julho","mes_num":7,"zona":"Zona Leste","produto":"Alpha","pedidos":67,"total_rs":489539.91},
  {"ano":2026,"mes":"Julho","mes_num":7,"zona":"Zona Leste","produto":"Beta","pedidos":91,"total_rs":1079564.81},
  {"ano":2026,"mes":"Julho","mes_num":7,"zona":"Zona Leste","produto":"Ômega","pedidos":33,"total_rs":1035106.64},
  {"ano":2026,"mes":"Julho","mes_num":7,"zona":"Zona Oeste","produto":"Alpha","pedidos":51,"total_rs":407807.62},
  {"ano":2026,"mes":"Julho","mes_num":7,"zona":"Zona Oeste","produto":"Beta","pedidos":71,"total_rs":922435.77},
  {"ano":2026,"mes":"Julho","mes_num":7,"zona":"Zona Oeste","produto":"Ômega","pedidos":22,"total_rs":891703.57},
  {"ano":2026,"mes":"Julho","mes_num":7,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2026,"mes":"Julho","mes_num":7,"zona":"Zona Norte","produto":"Beta","pedidos":22,"total_rs":145099.77},
  {"ano":2026,"mes":"Julho","mes_num":7,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2026,"mes":"Agosto","mes_num":8,"zona":"Zona Sul","produto":"Alpha","pedidos":60,"total_rs":421732.33},
  {"ano":2026,"mes":"Agosto","mes_num":8,"zona":"Zona Sul","produto":"Beta","pedidos":64,"total_rs":830535.89},
  {"ano":2026,"mes":"Agosto","mes_num":8,"zona":"Zona Sul","produto":"Ômega","pedidos":32,"total_rs":1111803.67},
  {"ano":2026,"mes":"Agosto","mes_num":8,"zona":"Zona Leste","produto":"Alpha","pedidos":60,"total_rs":315229.04},
  {"ano":2026,"mes":"Agosto","mes_num":8,"zona":"Zona Leste","produto":"Beta","pedidos":65,"total_rs":882298.38},
  {"ano":2026,"mes":"Agosto","mes_num":8,"zona":"Zona Leste","produto":"Ômega","pedidos":31,"total_rs":781760.94},
  {"ano":2026,"mes":"Agosto","mes_num":8,"zona":"Zona Oeste","produto":"Alpha","pedidos":61,"total_rs":518007.33},
  {"ano":2026,"mes":"Agosto","mes_num":8,"zona":"Zona Oeste","produto":"Beta","pedidos":85,"total_rs":1013708.83},
  {"ano":2026,"mes":"Agosto","mes_num":8,"zona":"Zona Oeste","produto":"Ômega","pedidos":21,"total_rs":753051.9},
  {"ano":2026,"mes":"Agosto","mes_num":8,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2026,"mes":"Agosto","mes_num":8,"zona":"Zona Norte","produto":"Beta","pedidos":25,"total_rs":234355.18},
  {"ano":2026,"mes":"Agosto","mes_num":8,"zona":"Zona Norte","produto":"Ômega","pedidos":1,"total_rs":21500.0},
  {"ano":2026,"mes":"Setembro","mes_num":9,"zona":"Zona Sul","produto":"Alpha","pedidos":70,"total_rs":530388.32},
  {"ano":2026,"mes":"Setembro","mes_num":9,"zona":"Zona Sul","produto":"Beta","pedidos":94,"total_rs":1096130.54},
  {"ano":2026,"mes":"Setembro","mes_num":9,"zona":"Zona Sul","produto":"Ômega","pedidos":25,"total_rs":690348.71},
  {"ano":2026,"mes":"Setembro","mes_num":9,"zona":"Zona Leste","produto":"Alpha","pedidos":67,"total_rs":446678.93},
  {"ano":2026,"mes":"Setembro","mes_num":9,"zona":"Zona Leste","produto":"Beta","pedidos":89,"total_rs":822601.56},
  {"ano":2026,"mes":"Setembro","mes_num":9,"zona":"Zona Leste","produto":"Ômega","pedidos":24,"total_rs":786186.85},
  {"ano":2026,"mes":"Setembro","mes_num":9,"zona":"Zona Oeste","produto":"Alpha","pedidos":50,"total_rs":302299.79},
  {"ano":2026,"mes":"Setembro","mes_num":9,"zona":"Zona Oeste","produto":"Beta","pedidos":82,"total_rs":1046919.83},
  {"ano":2026,"mes":"Setembro","mes_num":9,"zona":"Zona Oeste","produto":"Ômega","pedidos":33,"total_rs":1180824.59},
  {"ano":2026,"mes":"Setembro","mes_num":9,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2026,"mes":"Setembro","mes_num":9,"zona":"Zona Norte","produto":"Beta","pedidos":18,"total_rs":114843.11},
  {"ano":2026,"mes":"Setembro","mes_num":9,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0},
  {"ano":2026,"mes":"Outubro","mes_num":10,"zona":"Zona Sul","produto":"Alpha","pedidos":52,"total_rs":357970.96},
  {"ano":2026,"mes":"Outubro","mes_num":10,"zona":"Zona Sul","produto":"Beta","pedidos":65,"total_rs":614638.72},
  {"ano":2026,"mes":"Outubro","mes_num":10,"zona":"Zona Sul","produto":"Ômega","pedidos":20,"total_rs":770549.75},
  {"ano":2026,"mes":"Outubro","mes_num":10,"zona":"Zona Leste","produto":"Alpha","pedidos":62,"total_rs":337434.82},
  {"ano":2026,"mes":"Outubro","mes_num":10,"zona":"Zona Leste","produto":"Beta","pedidos":85,"total_rs":778621.49},
  {"ano":2026,"mes":"Outubro","mes_num":10,"zona":"Zona Leste","produto":"Ômega","pedidos":30,"total_rs":883895.41},
  {"ano":2026,"mes":"Outubro","mes_num":10,"zona":"Zona Oeste","produto":"Alpha","pedidos":65,"total_rs":345085.18},
  {"ano":2026,"mes":"Outubro","mes_num":10,"zona":"Zona Oeste","produto":"Beta","pedidos":95,"total_rs":1029948.96},
  {"ano":2026,"mes":"Outubro","mes_num":10,"zona":"Zona Oeste","produto":"Ômega","pedidos":31,"total_rs":787538.52},
  {"ano":2026,"mes":"Outubro","mes_num":10,"zona":"Zona Norte","produto":"Alpha","pedidos":0,"total_rs":0.0},
  {"ano":2026,"mes":"Outubro","mes_num":10,"zona":"Zona Norte","produto":"Beta","pedidos":20,"total_rs":181871.61},
  {"ano":2026,"mes":"Outubro","mes_num":10,"zona":"Zona Norte","produto":"Ômega","pedidos":0,"total_rs":0.0}
];

export default function AnaliseEstrategica() {
  // Estados de navegação de visualização
  const [tabAtiva, setTabAtiva] = useState('ultimos6'); // 'comparativo', 'ultimos6', 'historico', 'agentes'
  
  // Filtros interativos para os alunos
  const [filtroZona, setFiltroZona] = useState('Todas');
  const [filtroProduto, setFiltroProduto] = useState('Todos');
  const [filtroAno, setFiltroAno] = useState('Todos');
  const [filtroMes, setFiltroMes] = useState('Todos');

  // Base ativa conforme a aba
  const baseAtiva = useMemo(() => {
    if (tabAtiva === 'historico') return BASE_HISTORICA;
    if (tabAtiva === 'ultimos6') return BASE_ULTIMOS_6_MESES;
    return [...BASE_HISTORICA, ...BASE_ULTIMOS_6_MESES];
  }, [tabAtiva]);

  // Aplicação dos filtros dinâmicos
  const dadosFiltrados = useMemo(() => {
    return baseAtiva.filter(item => {
      const matchZona = filtroZona === 'Todas' || item.zona === filtroZona;
      const matchProduto = filtroProduto === 'Todos' || item.produto === filtroProduto;
      const matchAno = filtroAno === 'Todos' || item.ano.toString() === filtroAno;
      const matchMes = filtroMes === 'Todos' || item.mes === filtroMes;
      return matchZona && matchProduto && matchAno && matchMes;
    });
  }, [baseAtiva, filtroZona, filtroProduto, filtroAno, filtroMes]);

  // Lista de anos e meses disponíveis na base ativa para os dropdowns
  const anosDisponiveis = useMemo(() => {
    const anos = Array.from(new Set(baseAtiva.map(i => i.ano))).sort();
    return ['Todos', ...anos.map(String)];
  }, [baseAtiva]);

  const mesesDisponiveis = useMemo(() => {
    const meses = Array.from(new Set(baseAtiva.map(i => i.mes)));
    return ['Todos', ...meses];
  }, [baseAtiva]);

  // Métricas agregadas
  const metricas = useMemo(() => {
    const faturamentoTotal = dadosFiltrados.reduce((acc, cur) => acc + cur.total_rs, 0);
    const totalPedidos = dadosFiltrados.reduce((acc, cur) => acc + cur.pedidos, 0);
    const ticketMedio = totalPedidos > 0 ? faturamentoTotal / totalPedidos : 0;

    // Métricas específicas da Zona Norte & Alpha para chamar atenção dos alunos
    const vendasAlphaZonaNorte = dadosFiltrados
      .filter(i => i.zona === 'Zona Norte' && i.produto === 'Alpha')
      .reduce((acc, cur) => acc + cur.total_rs, 0);

    const pedidosAlphaZonaNorte = dadosFiltrados
      .filter(i => i.zona === 'Zona Norte' && i.produto === 'Alpha')
      .reduce((acc, cur) => acc + cur.pedidos, 0);

    const faturamentoTotalGeralBase = baseAtiva.reduce((acc, cur) => acc + cur.total_rs, 0);
    const faturamentoZonaNorteBase = baseAtiva
      .filter(i => i.zona === 'Zona Norte')
      .reduce((acc, cur) => acc + cur.total_rs, 0);
    
    const participacaoNorte = faturamentoTotalGeralBase > 0 
      ? (faturamentoZonaNorteBase / faturamentoTotalGeralBase) * 100 
      : 0;

    return {
      faturamentoTotal,
      totalPedidos,
      ticketMedio,
      vendasAlphaZonaNorte,
      pedidosAlphaZonaNorte,
      participacaoNorte
    };
  }, [dadosFiltrados, baseAtiva]);

  // Agrupamento por Região
  const dadosPorRegiao = useMemo(() => {
    const zonas = ['Zona Sul', 'Zona Leste', 'Zona Oeste', 'Zona Norte'];
    const totalGeral = dadosFiltrados.reduce((acc, cur) => acc + cur.total_rs, 0) || 1;

    return zonas.map(zona => {
      const itens = dadosFiltrados.filter(i => i.zona === zona);
      const total = itens.reduce((acc, cur) => acc + cur.total_rs, 0);
      const pedidos = itens.reduce((acc, cur) => acc + cur.pedidos, 0);
      const alphaTotal = itens.filter(i => i.produto === 'Alpha').reduce((acc, cur) => acc + cur.total_rs, 0);
      const betaTotal = itens.filter(i => i.produto === 'Beta').reduce((acc, cur) => acc + cur.total_rs, 0);
      const omegaTotal = itens.filter(i => i.produto === 'Ômega').reduce((acc, cur) => acc + cur.total_rs, 0);
      const pct = (total / totalGeral) * 100;

      return {
        zona,
        total,
        pedidos,
        alphaTotal,
        betaTotal,
        omegaTotal,
        pct
      };
    });
  }, [dadosFiltrados]);

  // Agrupamento por Produto
  const dadosPorProduto = useMemo(() => {
    const produtos = ['Alpha', 'Beta', 'Ômega'];
    const totalGeral = dadosFiltrados.reduce((acc, cur) => acc + cur.total_rs, 0) || 1;

    return produtos.map(prod => {
      const itens = dadosFiltrados.filter(i => i.produto === prod);
      const total = itens.reduce((acc, cur) => acc + cur.total_rs, 0);
      const pedidos = itens.reduce((acc, cur) => acc + cur.pedidos, 0);
      const pct = (total / totalGeral) * 100;
      return { produto: prod, total, pedidos, pct };
    });
  }, [dadosFiltrados]);

  // Evolução temporal mês a mês dos dados filtrados
  const evolucaoMensal = useMemo(() => {
    const mapa = {};
    dadosFiltrados.forEach(item => {
      const chave = `${item.ano} - ${item.mes.slice(0, 3)}`;
      if (!mapa[chave]) {
        mapa[chave] = { chave, total: 0, pedidos: 0, ano: item.ano, mes_num: item.mes_num };
      }
      mapa[chave].total += item.total_rs;
      mapa[chave].pedidos += item.pedidos;
    });

    return Object.values(mapa).sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes_num - b.mes_num;
    });
  }, [dadosFiltrados]);

  const maxTotalEvolucao = useMemo(() => {
    return Math.max(...evolucaoMensal.map(e => e.total), 1);
  }, [evolucaoMensal]);

  // Formatação em Reais
  const formatMoney = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const formatPercent = (val) => {
    return `${val.toFixed(1)}%`;
  };

  const limparFiltros = () => {
    setFiltroZona('Todas');
    setFiltroProduto('Todos');
    setFiltroAno('Todos');
    setFiltroMes('Todos');
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      
      {/* HEADER PRINCIPAL - BADGE DO CASO & METAS */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-900/60 text-cyan-300 border border-cyan-500/30">
                Módulo ASI • Caso Prático
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-700 text-gray-300">
                {CASO_ESTUDO.id}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Target className="w-6 h-6 text-cyan-400" />
              {CASO_ESTUDO.titulo}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Empresa: <strong className="text-gray-200">{CASO_ESTUDO.empresa}</strong> • Estudo de Caso Estratégico
            </p>
          </div>
        </div>

        {/* DIRETRIZ DO CONSELHO VS REALIZADO */}
        <div className="mt-4 pt-4 border-t border-gray-700/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded-lg">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Target className="w-3.5 h-3.5" />
              Diretriz Estratégica do Conselho
            </div>
            <p className="text-xs sm:text-sm text-gray-200 font-medium">
              "{CASO_ESTUDO.diretriz.meta}"
            </p>
          </div>

          <div className="p-3 bg-red-950/20 border border-red-800/40 rounded-lg">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Resultado Realizado (Após 6 meses de IA)
            </div>
            <p className="text-xs sm:text-sm text-gray-200 font-medium">
              {CASO_ESTUDO.diretriz.status_realizado_6_meses}
            </p>
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO ENTRE ABAS - OTIMIZADA PARA TOUCH NO CELULAR */}
      <div className="flex bg-gray-800/90 p-1.5 rounded-xl border border-gray-700 overflow-x-auto gap-1 shadow-md">
        <button
          onClick={() => setTabAtiva('ultimos6')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            tabAtiva === 'ultimos6'
              ? 'bg-cyan-500 text-gray-950 font-black shadow-lg shadow-cyan-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Últimos 6 Meses (2026)</span>
        </button>

        <button
          onClick={() => setTabAtiva('historico')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            tabAtiva === 'historico'
              ? 'bg-cyan-500 text-gray-950 font-black shadow-lg shadow-cyan-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Base Histórica (2023-2025)</span>
        </button>

        <button
          onClick={() => setTabAtiva('comparativo')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            tabAtiva === 'comparativo'
              ? 'bg-cyan-500 text-gray-950 font-black shadow-lg shadow-cyan-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Visão Comparativa Total</span>
        </button>
      </div>

      {/* PAINEL DE FILTROS RÁPIDOS TOUCH-FRIENDLY */}
      <div className="bg-gray-800/80 border border-gray-700/80 rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-gray-400 tracking-wider">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filtros Dinâmicos de Exploração</span>
          </div>
          {(filtroZona !== 'Todas' || filtroProduto !== 'Todos' || filtroAno !== 'Todos' || filtroMes !== 'Todos') && (
            <button
              onClick={limparFiltros}
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* FILTRO REGIONAL */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-400" /> Região
            </label>
            <select
              value={filtroZona}
              onChange={(e) => setFiltroZona(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-xs text-white rounded-lg p-2 font-medium focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="Todas">Todas as Regiões</option>
              <option value="Zona Norte" className="font-bold text-amber-400">🚨 Zona Norte (Foco do Caso)</option>
              <option value="Zona Sul">Zona Sul</option>
              <option value="Zona Leste">Zona Leste</option>
              <option value="Zona Oeste">Zona Oeste</option>
            </select>
          </div>

          {/* FILTRO PRODUTO */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Package className="w-3 h-3 text-cyan-400" /> Produto
            </label>
            <select
              value={filtroProduto}
              onChange={(e) => setFiltroProduto(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-xs text-white rounded-lg p-2 font-medium focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="Todos">Todos os Produtos</option>
              <option value="Alpha" className="font-bold text-cyan-400">⭐ Produto Alpha (Meta)</option>
              <option value="Beta">Produto Beta</option>
              <option value="Ômega">Produto Ômega</option>
            </select>
          </div>

          {/* FILTRO ANO */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" /> Ano
            </label>
            <select
              value={filtroAno}
              onChange={(e) => setFiltroAno(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-xs text-white rounded-lg p-2 font-medium focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            >
              {anosDisponiveis.map(ano => (
                <option key={ano} value={ano}>{ano === 'Todos' ? 'Todos os Anos' : ano}</option>
              ))}
            </select>
          </div>

          {/* FILTRO MÊS */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-cyan-400" /> Mês
            </label>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-xs text-white rounded-lg p-2 font-medium focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            >
              {mesesDisponiveis.map(mes => (
                <option key={mes} value={mes}>{mes === 'Todos' ? 'Todos os Meses' : mes}</option>
              ))}
            </select>
          </div>
        </div>

        {/* BOTÕES RÁPIDOS DE HIPÓTESE PARA O ALUNO NO CELULAR */}
        <div className="mt-3 pt-3 border-t border-gray-700/60 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Atalhos de Análise:</span>
          <button
            onClick={() => { setFiltroZona('Zona Norte'); setFiltroProduto('Alpha'); }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${
              filtroZona === 'Zona Norte' && filtroProduto === 'Alpha'
                ? 'bg-amber-500 text-gray-950 border-amber-400'
                : 'bg-gray-900 text-amber-300 border-amber-500/30 hover:bg-gray-700'
            }`}
          >
            🎯 Investigar Alpha na Zona Norte
          </button>
          <button
            onClick={() => { setFiltroZona('Zona Norte'); setFiltroProduto('Todos'); }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${
              filtroZona === 'Zona Norte' && filtroProduto === 'Todos'
                ? 'bg-cyan-500 text-gray-950 border-cyan-400'
                : 'bg-gray-900 text-cyan-300 border-cyan-500/30 hover:bg-gray-700'
            }`}
          >
            📍 Total Zona Norte
          </button>
          <button
            onClick={() => { setFiltroZona('Todas'); setFiltroProduto('Alpha'); }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${
              filtroZona === 'Todas' && filtroProduto === 'Alpha'
                ? 'bg-cyan-500 text-gray-950 border-cyan-400'
                : 'bg-gray-900 text-cyan-300 border-cyan-500/30 hover:bg-gray-700'
            }`}
          >
            📦 Vendas Globais de Alpha
          </button>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL DE KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* CARD 1: FATURAMENTO */}
        <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-1">
            <span>Faturamento Filtrado</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-white truncate">
            {formatMoney(metricas.faturamentoTotal)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {metricas.totalPedidos} pedidos faturados
          </p>
        </div>

        {/* CARD 2: TICKET MÉDIO */}
        <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-1">
            <span>Tíquete Médio / Pedido</span>
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-white truncate">
            {formatMoney(metricas.ticketMedio)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Política de Pedido Mínimo: R$ 15.000
          </p>
        </div>

        {/* CARD 3: VENDAS PRODUTO ALPHA NA ZONA NORTE (O PONTO CRÍTICO) */}
        <div className={`p-4 rounded-xl border transition-all ${
          metricas.vendasAlphaZonaNorte === 0
            ? 'bg-rose-950/30 border-rose-600/60 shadow-lg shadow-rose-950/20'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <div className="flex items-center justify-between text-rose-400 text-xs font-bold mb-1">
            <span>Alpha na Zona Norte (Meta)</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-400 truncate">
            {formatMoney(metricas.vendasAlphaZonaNorte)}
          </div>
          <p className="text-[11px] text-rose-300 font-bold mt-1">
            {metricas.pedidosAlphaZonaNorte} pedidos fechados (Meta: 25%)
          </p>
        </div>

        {/* CARD 4: SHARE DA ZONA NORTE */}
        <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-1">
            <span>Participação Zona Norte</span>
            <MapPin className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-400">
            {formatPercent(metricas.participacaoNorte)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Meta Estratégica: Expandir 25%
          </p>
        </div>
      </div>

      {/* VISÃO DE DASHBOARD ANALÍTICO (ÚLTIMOS 6 MESES, HISTÓRICO OU COMPARATIVO) */}
      <div className="space-y-6">
          
          {/* GRÁFICOS: COMPARATIVO REGIONAL E MIX DE PRODUTOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* DISTRIBUIÇÃO REGIONAL */}
            <div className="bg-gray-800 border border-gray-700 p-4 sm:p-5 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  Faturamento por Região ({tabAtiva === 'ultimos6' ? 'Últimos 6 Meses' : tabAtiva === 'historico' ? 'Histórico 2023-2025' : 'Consolidado'})
                </h3>
              </div>

              <div className="space-y-4">
                {dadosPorRegiao.map(item => (
                  <div key={item.zona} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${item.zona === 'Zona Norte' ? 'text-amber-400 flex items-center gap-1' : 'text-gray-200'}`}>
                        {item.zona}
                        {item.zona === 'Zona Norte' && <span className="text-[10px] bg-amber-950/80 px-1.5 py-0.2 rounded text-amber-300 border border-amber-500/40 font-extrabold">Alvo</span>}
                      </span>
                      <div className="text-right">
                        <span className="font-extrabold text-white mr-2">{formatMoney(item.total)}</span>
                        <span className={`text-[11px] font-bold ${item.zona === 'Zona Norte' ? 'text-amber-400' : 'text-gray-400'}`}>
                          ({formatPercent(item.pct)})
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden p-0.5 border border-gray-700/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.zona === 'Zona Norte'
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                        }`}
                        style={{ width: `${Math.max(item.pct, 2)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
                      <span>Pedidos: {item.pedidos}</span>
                      <span>Mix: Alpha {formatMoney(item.alphaTotal)} • Beta {formatMoney(item.betaTotal)} • Ômega {formatMoney(item.omegaTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MIX DE PRODUTOS */}
            <div className="bg-gray-800 border border-gray-700 p-4 sm:p-5 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  Distribuição por Linha de Produto
                </h3>
              </div>

              <div className="space-y-4">
                {dadosPorProduto.map(prod => (
                  <div key={prod.produto} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${prod.produto === 'Alpha' ? 'text-cyan-400 flex items-center gap-1' : 'text-gray-200'}`}>
                        Produto {prod.produto}
                        {prod.produto === 'Alpha' && <span className="text-[10px] bg-cyan-950/80 px-1.5 py-0.2 rounded text-cyan-300 border border-cyan-500/40 font-extrabold">Linha de Entrada</span>}
                      </span>
                      <div className="text-right">
                        <span className="font-extrabold text-white mr-2">{formatMoney(prod.total)}</span>
                        <span className="text-gray-400 text-[11px] font-bold">({formatPercent(prod.pct)})</span>
                      </div>
                    </div>

                    <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden p-0.5 border border-gray-700/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          prod.produto === 'Alpha'
                            ? 'bg-gradient-to-r from-cyan-400 to-teal-400'
                            : prod.produto === 'Beta'
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500'
                        }`}
                        style={{ width: `${Math.max(prod.pct, 2)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
                      <span>Pedidos faturados: {prod.pedidos}</span>
                      <span>Tíquete médio: {prod.pedidos > 0 ? formatMoney(prod.total / prod.pedidos) : 'R$ 0'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* BOX DE DESTAQUE DIDÁTICO */}
              <div className="mt-5 p-3 rounded-lg bg-gray-900/90 border border-gray-700 text-xs">
                <span className="font-extrabold text-cyan-300 flex items-center gap-1 mb-1">
                  💡 Ponto de Atenção para os Alunos:
                </span>
                <p className="text-gray-300">
                  Observe se o Produto Alpha conseguiu entrar na Zona Norte em qualquer um dos meses selecionados. O que acontece com a linha de entrada quando a política comercial exige tíquetes médios elevados?
                </p>
              </div>
            </div>
          </div>

          {/* EVOLUÇÃO TEMPORAL MÊS A MÊS */}
          <div className="bg-gray-800 border border-gray-700 p-4 sm:p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Evolução Temporal do Faturamento (Mês a Mês)
              </h3>
              <span className="text-xs text-gray-400">
                Pico no período: <strong className="text-cyan-400">{formatMoney(maxTotalEvolucao)}</strong>
              </span>
            </div>

            {/* GRÁFICO DE BARRAS RESPONSIVO COM SCROLL NO CELULAR */}
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[650px] h-56 flex items-end gap-2 pt-6 pb-8 border-b border-gray-700">
                {evolucaoMensal.map((item) => {
                  const alturaPct = (item.total / maxTotalEvolucao) * 100;
                  return (
                    <div key={item.chave} className="flex-1 h-40 flex flex-col justify-end items-center gap-1 group relative">
                      {/* TOOLTIP TOUCH/HOVER */}
                      <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-950 text-white text-[10px] py-1 px-2 rounded border border-gray-700 pointer-events-none whitespace-nowrap z-20 shadow-lg font-bold">
                        {item.chave}: {formatMoney(item.total)} ({item.pedidos} ped.)
                      </div>

                      {/* TRILHO DE FUNDO DA BARRA */}
                      <div className="w-full flex-1 bg-gray-900/80 rounded-t flex items-end p-0.5 border-t border-x border-gray-700/40">
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 group-hover:from-cyan-400 group-hover:to-cyan-300 transition-all cursor-pointer shadow-sm"
                          style={{ height: `${Math.max(alturaPct, 4)}%` }}
                        ></div>
                      </div>

                      {/* LABEL DO MÊS */}
                      <span className="text-[10px] font-bold text-gray-400 transform -rotate-45 origin-top-left mt-2 whitespace-nowrap">
                        {item.chave}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TABELA DETALHADA DE REGISTROS - CARDS COMPACTOS EM SMARTPHONE */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white">Registros Analíticos de Transações</h3>
                <p className="text-xs text-gray-400">Total de {dadosFiltrados.length} linhas filtradas</p>
              </div>
              <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/40">
                {tabAtiva === 'ultimos6' ? '6 Meses (2026)' : tabAtiva === 'historico' ? 'Histórico (2023-2025)' : 'Base Completa'}
              </span>
            </div>

            {/* VISÃO DESKTOP (TABELA) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-900/80 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="p-3">Período</th>
                    <th className="p-3">Região</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3 text-right">Pedidos</th>
                    <th className="p-3 text-right">Faturamento Total</th>
                    <th className="p-3 text-right">Tíquete Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {dadosFiltrados.slice(0, 15).map((row, idx) => {
                    const isNorteAlpha = row.zona === 'Zona Norte' && row.produto === 'Alpha';
                    return (
                      <tr key={idx} className={`hover:bg-gray-750 transition-colors ${isNorteAlpha ? 'bg-rose-950/20' : ''}`}>
                        <td className="p-3 font-medium text-white">{row.mes} / {row.ano}</td>
                        <td className="p-3">
                          <span className={`font-bold ${row.zona === 'Zona Norte' ? 'text-amber-400' : 'text-gray-300'}`}>
                            {row.zona}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            row.produto === 'Alpha' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50' : 'text-gray-300'
                          }`}>
                            {row.produto}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium">{row.pedidos}</td>
                        <td className={`p-3 text-right font-bold ${row.total_rs === 0 ? 'text-rose-400' : 'text-white'}`}>
                          {formatMoney(row.total_rs)}
                        </td>
                        <td className="p-3 text-right text-gray-400">
                          {row.pedidos > 0 ? formatMoney(row.total_rs / row.pedidos) : 'R$ 0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {dadosFiltrados.length > 15 && (
                <div className="p-3 text-center text-xs text-gray-500 bg-gray-900/40 border-t border-gray-700">
                  Mostrando os 15 primeiros de {dadosFiltrados.length} registros. Use os filtros de Ano/Mês/Zona para refinar.
                </div>
              )}
            </div>

            {/* VISÃO MOBILE EM CARDS TOUCH-FRIENDLY */}
            <div className="sm:hidden divide-y divide-gray-700/60">
              {dadosFiltrados.slice(0, 10).map((row, idx) => (
                <div key={idx} className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-white">{row.mes} {row.ano}</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      row.zona === 'Zona Norte' ? 'bg-amber-950 text-amber-300 border border-amber-800/50' : 'bg-gray-700 text-gray-200'
                    }`}>
                      {row.zona}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Produto {row.produto}</span>
                    <span className={`font-black ${row.total_rs === 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                      {formatMoney(row.total_rs)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>{row.pedidos} pedidos</span>
                    <span>Médio: {row.pedidos > 0 ? formatMoney(row.total_rs / row.pedidos) : 'R$ 0'}</span>
                  </div>
                </div>
              ))}
              {dadosFiltrados.length > 10 && (
                <div className="p-3 text-center text-xs text-gray-400">
                  Mostrando 10 de {dadosFiltrados.length} registros. Use os filtros acima para refinar.
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
