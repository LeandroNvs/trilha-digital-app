import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
// CORREÇÃO: Removida a extensão .js para alinhar com outros imports do projeto
import { db, appId } from '../firebase/config';

// --- Ícones ---
const IconeInfo = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block ml-1 text-gray-400 hover:text-cyan-400 cursor-pointer" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>;
const IconeCheck = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block ml-2 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const IconeClose = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;


// --- Componente Modal de Ajuda ---
function ModalAjuda({ titulo, texto, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in"> <div className="bg-gray-700 rounded-lg shadow-xl p-6 max-w-lg w-full relative"> <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white" aria-label="Fechar ajuda"><IconeClose /></button> <h3 className="text-xl font-bold text-cyan-400 mb-4">{titulo}</h3> <div className="text-gray-300 whitespace-pre-wrap space-y-2 text-sm"> {texto.split('\n').map((paragrafo, index) => <p key={index}>{paragrafo}</p>)} </div> <button onClick={onClose} className="mt-6 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg float-right"> Entendido </button> </div> </div>
     );
}


// --- Componente Abas ---
function AbaConteudo({ title, children, isComplete, helpText, onHelpClick }) {
    return (
        <fieldset className="border border-gray-600 p-4 rounded-lg"> <legend className="text-lg font-semibold px-2 text-gray-300 flex items-center"> {title} <span onClick={(e) => { e.stopPropagation(); onHelpClick(title, helpText); }} className="inline-block ml-1 cursor-pointer" aria-label={`Ajuda sobre ${title}`}> <IconeInfo /> </span> {isComplete && <IconeCheck />} </legend> {children} </fieldset>
    );
}

// --- Componente Input com Máscara Monetária (v6) ---
const InputMoedaMasked = ({ id, label, value: externalValue, onChange, disabled = false, ...props }) => {
    const [displayValue, setDisplayValue] = useState('');
    const formatBRL = (num) => { if (num === null || num === undefined || num === '' || isNaN(Number(num))) return ''; const number = Number(num); return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }); };
    useEffect(() => { setDisplayValue(formatBRL(externalValue)); }, [externalValue]);
    const handleChange = (e) => { const inputVal = e.target.value; const numericString = inputVal.replace(/\D/g, ''); let numberValue = ''; if (numericString !== '') { const parsedNum = parseInt(numericString, 10); if (!isNaN(parsedNum)) { numberValue = parsedNum; } } setDisplayValue(formatBRL(numberValue)); if (onChange) { onChange({ target: { id: id || props.name, name: props.name || id, value: numberValue, type: 'number' } }); } };
    return ( <div> <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1">{label}</label> <div className="relative"> <input type="text" inputMode="numeric" id={id} name={props.name || id} value={displayValue} onChange={handleChange} className={`w-full bg-gray-700 p-2 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="R$ 0" disabled={disabled} {...props} /> </div> </div> );
};


// --- Componente Input com Máscara Numérica (Milhar - v6) ---
const InputNumericoMasked = ({ id, label, value: externalValue, onChange, sufixo = '', disabled = false, ...props }) => {
    const [displayValue, setDisplayValue] = useState('');
    const formatNumber = (num) => { if (num === null || num === undefined || num === '' || isNaN(Number(num))) return ''; const number = Number(num); return number.toLocaleString('pt-BR'); };
    useEffect(() => { setDisplayValue(formatNumber(externalValue)); }, [externalValue]);
    const handleChange = (e) => { const inputVal = e.target.value; const numericString = inputVal.replace(/\D/g, ''); let numberValue = ''; if (numericString !== '') { const parsedNum = parseInt(numericString, 10); if (!isNaN(parsedNum)) { numberValue = parsedNum; } } setDisplayValue(formatNumber(numberValue)); if (onChange) { onChange({ target: { id: id || props.name, name: props.name || id, value: numberValue, type: 'number' } }); } };
    return ( <div> <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1">{label}</label> <div className="relative"> <input type="text" inputMode="numeric" id={id} name={props.name || id} value={displayValue} onChange={handleChange} className={`w-full bg-gray-700 p-2 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none ${sufixo ? 'pr-10 md:pr-12' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="0" disabled={disabled} {...props} /> {sufixo && <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm pointer-events-none">{sufixo}</span>} </div> </div> );
};


function SimuladorForm() {
    const { simulacaoId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');
    const [modalAjudaVisivel, setModalAjudaVisivel] = useState(false);
    const [modalAjudaConteudo, setModalAjudaConteudo] = useState({ titulo: '', texto: '' });
    const [abaAtiva, setAbaAtiva] = useState('infoBasicas');

    // 1. Definição da função para gerar o estado inicial (ATUALIZADO)
    const getInitialState = () => {
        const state = {
            // Aba 1: Básicas
            Nome_Simulacao: '', Total_Rodadas: 6, Num_Empresas: 6,
            // Aba 2: Cenário
            Cenario_Inicial_Descricao: 'Bem-vindos à Guerra dos Ecossistemas Móveis! Vocês assumem o comando de uma das novas fabricantes de smartphones em um mercado dinâmico e competitivo. O cenário inicial é de crescimento, mas a concorrência é acirrada e a tecnologia evolui rapidamente. Suas decisões estratégicas em P&D, Operações, Marketing, Finanças e Rede de Negócios determinarão o sucesso ou fracasso da sua empresa. Boa sorte!', Taxa_Base_Inflacao: 3,
            // Aba 3: Mercado
            Segmento1_Nome: 'Premium', Segmento2_Nome: 'Básico',
            // Aba 4: Setup Inicial
            Tipo_Setup: 'Simetrico', Caixa_Inicial: 200000000, Divida_Inicial: 0, 
            Valor_Contabil_Imobilizado: 100000000, Capacidade_Producao_Inicial: 1000000,
            Custo_Fixo_Operacional: 20000000, Custo_Variavel_Montagem_Base: 120,
            Nivel_Inicial_PD_Camera: 1, Nivel_Inicial_PD_Bateria: 1, 
            Nivel_Inicial_PD_Sist_Operacional_e_IA: 1,
            Nivel_Inicial_PD_Atualizacao_Geral: 1,
            Nivel_Inicial_Capacitacao: 1,
            Nivel_Inicial_Qualidade: 1,
            Nivel_Inicial_ESG: 1,
            // Aba 5: Custos P&D/Expansão
            Custo_PD_Camera_Nivel_2: 30000000, Custo_PD_Camera_Nivel_3: 50000000, Custo_PD_Camera_Nivel_4: 80000000, Custo_PD_Camera_Nivel_5: 120000000,
            Custo_PD_Bateria_Nivel_2: 25000000, Custo_PD_Bateria_Nivel_3: 45000000, Custo_PD_Bateria_Nivel_4: 70000000, Custo_PD_Bateria_Nivel_5: 110000000,
            Custo_PD_Sist_Operacional_e_IA_Nivel_2: 40000000, Custo_PD_Sist_Operacional_e_IA_Nivel_3: 60000000, Custo_PD_Sist_Operacional_e_IA_Nivel_4: 90000000, Custo_PD_Sist_Operacional_e_IA_Nivel_5: 140000000,
            Custo_PD_Atualizacao_Geral_Nivel_2: 20000000, Custo_PD_Atualizacao_Geral_Nivel_3: 35000000, Custo_PD_Atualizacao_Geral_Nivel_4: 55000000, Custo_PD_Atualizacao_Geral_Nivel_5: 80000000,
            Custo_Expansao_Lote: 10000000, Incremento_Capacidade_Lote: 100000,
            
            // =================================================================
            // MUDANÇA: Aba 6: Rede de Negócios (Separado por S1 e S2)
            // =================================================================
            // Segmento 1 (Premium)
            Fornecedor_S1_Tela_A_Desc: 'Fornecedor S1-A (Transacional): Vínculo Fraco, 20% de risco de perda de 15% da produção.', 
            Fornecedor_S1_Tela_A_Custo: 50,
            Fornecedor_S1_Tela_B_Desc: 'Fornecedor S1-B (Relacional): Vínculo Forte, 0% de risco.', 
            Fornecedor_S1_Tela_B_Custo: 70,
            Fornecedor_S1_Chip_C_Desc: 'Fornecedor S1-C (Padrão): Tecnologia Padrão.', 
            Fornecedor_S1_Chip_C_Custo: 80,
            Fornecedor_S1_Chip_D_Desc: 'Fornecedor S1-D (Inovação): Bônus de 10% no P&D (Bateria e IA).', 
            Fornecedor_S1_Chip_D_Custo: 95, Fornecedor_S1_Chip_D_Bonus_PD_Percent: 10,
            // Segmento 2 (Básico) - Valores default são cópia do S1
            Fornecedor_S2_Tela_A_Desc: 'Fornecedor S2-A (Transacional): Vínculo Fraco, 20% de risco de perda de 15% da produção.', 
            Fornecedor_S2_Tela_A_Custo: 50,
            Fornecedor_S2_Tela_B_Desc: 'Fornecedor S2-B (Relacional): Vínculo Forte, 0% de risco.', 
            Fornecedor_S2_Tela_B_Custo: 70,
            Fornecedor_S2_Chip_C_Desc: 'Fornecedor S2-C (Padrão): Tecnologia Padrão.', 
            Fornecedor_S2_Chip_C_Custo: 80,
            Fornecedor_S2_Chip_D_Desc: 'Fornecedor S2-D (Inovação): Bônus de 10% no P&D (Bateria e IA).', 
            Fornecedor_S2_Chip_D_Custo: 95, Fornecedor_S2_Chip_D_Bonus_PD_Percent: 10,
            // =================================================================
            
            // Aba 7: Finanças (ATUALIZADO)
            Taxa_Juros_Curto_Prazo: 5, Taxa_Juros_Emergencia: 10, Taxa_Juros_Longo_Prazo: 3, Prazo_Fixo_Longo_Prazo: 4, 
            Limite_CP_Percent_Ativo_Circulante: 50,
            Limite_LP_Percent_Patrimonio_Liquido: 100,
            // Aba 8: Pesos Ranking IDG
            Peso_IDG_Lucro: 0.30, 
            Peso_IDG_Share: 0.25,
            Peso_IDG_PD: 0.20,
            Peso_IDG_Saude_Financeira: 0.25,
            // Aba 10: Orçamento Organizacional
            Orcamento_Organizacional_Por_Rodada: 20000000,
            Custo_Nivel_Capacitacao_2: 15000000, Custo_Nivel_Capacitacao_3: 25000000, Custo_Nivel_Capacitacao_4: 40000000, Custo_Nivel_Capacitacao_5: 60000000,
            Reducao_Custo_Montagem_Por_Nivel_Capacitacao_Percent: 2,
            Custo_Nivel_Qualidade_2: 15000000, Custo_Nivel_Qualidade_3: 25000000, Custo_Nivel_Qualidade_4: 40000000, Custo_Nivel_Qualidade_5: 60000000,
            Custo_Nivel_ESG_2: 10000000, Custo_Nivel_ESG_3: 20000000, Custo_Nivel_ESG_4: 30000000, Custo_Nivel_ESG_5: 45000000,
            // Status Interno
            Status: 'Configurando', Rodada_Atual: 0,
        };
        // Adiciona campos dinâmicos por rodada (Demanda, Pesos, Notícias)
        for (let i = 1; i <= 12; i++) {
            state[`Segmento1_Demanda_Rodada_${i}`] = (i === 1) ? 2000000 : 0;
            state[`Segmento2_Demanda_Rodada_${i}`] = (i === 1) ? 5000000 : 0;
            state[`Noticia_Rodada_${i}`] = (i === 1) ? 'Mercado otimista! A demanda inicial é alta nos dois segmentos.' : '';
            // Pesos Premium
            state[`Peso_PD_Premium_Rodada_${i}`] = 0.5; state[`Peso_Mkt_Premium_Rodada_${i}`] = 0.3; state[`Peso_Preco_Premium_Rodada_${i}`] = 0.2;
            state[`Peso_Qualidade_Premium_Rodada_${i}`] = 0.0; state[`Peso_ESG_Premium_Rodada_${i}`] = 0.0;
            // Pesos P&D (dentro do Premium)
            state[`Peso_PD_Camera_Premium_Rodada_${i}`] = 0.4; state[`Peso_PD_Bateria_Premium_Rodada_${i}`] = 0.3; 
            state[`Peso_PD_Sist_Operacional_e_IA_Premium_Rodada_${i}`] = 0.3;
            // Pesos Básico (Massa)
            state[`Peso_PD_Massa_Rodada_${i}`] = 0.2; state[`Peso_Mkt_Massa_Rodada_${i}`] = 0.3; state[`Peso_Preco_Massa_Rodada_${i}`] = 0.5;
            state[`Peso_Qualidade_Massa_Rodada_${i}`] = 0.0; state[`Peso_ESG_Massa_Rodada_${i}`] = 0.0;
        }
        return state;
    };

    const initialState = useMemo(() => getInitialState(), []);
    const [params, setParams] = useState(initialState);
    const isEditing = Boolean(simulacaoId);
    const simulacoesCollectionPath = `/artifacts/${appId}/public/data/simulacoes`;

    // Textos de ajuda (ATUALIZADO)
    const helpTexts = useMemo(() => ({
        infoBasicas: `Nome: Identificador da simulação (ex: Turma X - 2025).\nRodadas: Duração total do jogo (1 a 12).\nEmpresas: Número de equipes competidoras (2 a 10).`,
        cenarioMacro: `Briefing: Texto que será apresentado aos alunos no início do jogo.\nInflação (%): Taxa ANUAL usada pelo simulador para reajustar custos fixos e variáveis a cada rodada (dividida por 4). Ex: 3% ao ano = 0.75% por rodada.`,
        mercado: `Segmentos: Defina os nomes dos dois grupos de clientes (ex: Premium, Básico).\nDemanda (por Rodada): Número total de unidades que o mercado busca em cada segmento, em cada rodada do jogo.`,
        setupInicial: `Define a situação inicial que será CLONADA para todas as empresas no início do jogo (Setup Simétrico). Valores financeiros em R$, Capacidade em Unidades, Níveis de P&D de 1 a 5. A 'Dívida LP Inicial' define o saldo inicial de Longo Prazo.`,
        custosInvestimento: `Define as 'regras' do jogo para investimentos:\nP&D: Custo TOTAL ACUMULADO (R$) para atingir CADA nível (Ex: Custo total para chegar ao Nível 2).\nExpansão: Custo (R$) para adicionar um 'lote' de capacidade e quantas unidades (Unid.) esse lote adiciona à fábrica NA PRÓXIMA RODADA.`,
        // MUDANÇA: Texto de Ajuda da Rede
        redeNegocios: `Defina as opções de fornecedores que os alunos poderão escolher. Agora você deve configurar os 4 fornecedores (A, B, C, D) para CADA SEGMENTO (S1 e S2).\n\n
- Você pode manter os custos e descrições iguais nos dois segmentos, ou criar fornecedores diferentes (ex: S1-Tela-A mais cara que S2-Tela-A).\n
- O aluno fará escolhas separadas para a cadeia de produção de S1 e S2.`,
        financasTaxas: `Defina as taxas de juros POR RODADA, o prazo dos financiamentos e os LIMITES de alavancagem:\n\nTaxas de Juros (% por rodada): Define o custo do dinheiro para CP (Curto Prazo), Emergência e LP (Longo Prazo).\n
Prazo LP (Rodadas): Duração fixa (ex: 4 rodadas) para pagamento do Financiamento de Longo Prazo.\n
Limite CP (% Ativo Circulante): Limita novos empréstimos de CP a um percentual do (Caixa + Estoque) da rodada anterior.\n
Limite LP (% Patrimônio Líquido): Limita novos financiamentos de LP a um percentual do (Ativo Total - Passivo Total) da rodada anterior.`,
        atratividade: (params) => `Define como o Market Share será calculado (RF 3.4) PARA CADA RODADA. Os pesos determinam a importância de cada fator na decisão de compra do cliente em cada segmento.\n\n
- ${params.Segmento1_Nome} (Pesos Gerais): Define a importância de P&D vs Mkt vs Preço vs Qualidade vs ESG.
- ${params.Segmento1_Nome} (Pesos P&D): Define quais tecnologias (Câmera, Bateria, SO+IA) são mais valorizadas *dentro* da nota de P&D.
- ${params.Segmento2_Nome} (Pesos Gerais): Define a importância de P&D (Atual. Geral) vs Mkt vs Preço vs Qualidade vs ESG.\n
- IMPORTANTE: Os pesos de cada seção DEVEM SOMAR 1.0 (ou 100%) para cada rodada.`,
        rankingIDG: `Define os pesos do Ranking Final (IDG - Índice de Desempenho Global). Estes são os critérios para definir o vencedor do jogo.\n\n
- Lucro Acumulado: Recompensa o resultado econômico (DRE).
- Market Share: Recompensa o domínio de mercado (Vendas).
- Nível P&D: Recompensa a inovação (Ativos Estratégicos).
- Saúde Financeira: Recompensa a boa gestão do balanço (Caixa vs Dívidas).
- IMPORTANTE: Os pesos do IDG DEVEM SOMAR 1.0 (ou 100%).`,
        orcamentoOrganizacional: `Define o "Orçamento Organizacional" (RF 5.1). Este é um TETO de gastos POR RODADA que o aluno deve alocar entre Marketing, Qualidade, Capacitação e ESG.\n\n
- Orçamento (R$): O valor máximo total que pode ser gasto nessas 4 áreas a cada rodada.\n
- Custos Capacitação/Qualidade/ESG: Custo TOTAL ACUMULADO (R$) para atingir CADA nível (similar ao P&D).\n
- Redução Custo (%): Percentual que o Custo de Montagem Base será reduzido PARA CADA NÍVEL de Capacitação atingido (Ex: Nível 3 com 2% = 6% de redução).`,
        eventos: `Escreva as "Notícias de Mercado" que os alunos receberão no início de cada rodada futura (RF 4.5). Use isso para introduzir mudanças, desafios ou oportunidades (Ex: aumento de custo, nova tecnologia, mudança na demanda).`
    }), []); // Removido 'params' da dependência, será passado como função

    // Definições de completude para as abas (ATUALIZADO)
    const abasConfig = useMemo(() => [
        { id: 'infoBasicas', titulo: '1. Básicas', keys: ['Nome_Simulacao', 'Total_Rodadas', 'Num_Empresas'], help: helpTexts.infoBasicas },
        { id: 'cenarioMacro', titulo: '2. Cenário', keys: ['Cenario_Inicial_Descricao', 'Taxa_Base_Inflacao'], help: helpTexts.cenarioMacro },
        { id: 'mercado', titulo: '3. Mercado', keys: ['Segmento1_Nome', `Segmento1_Demanda_Rodada_1`, 'Segmento2_Nome', `Segmento2_Demanda_Rodada_1`], help: helpTexts.mercado },
        { id: 'setupInicial', titulo: '4. Setup Inicial', keys: ['Caixa_Inicial', 'Capacidade_Producao_Inicial', 'Custo_Fixo_Operacional', 'Custo_Variavel_Montagem_Base'], help: helpTexts.setupInicial },
        { id: 'custosInvestimento', titulo: '5. Custos (P&D/Exp)', keys: [`Custo_PD_Camera_Nivel_2`, 'Custo_Expansao_Lote', 'Incremento_Capacidade_Lote', 'Custo_PD_Atualizacao_Geral_Nivel_2'], help: helpTexts.custosInvestimento },
        // MUDANÇA: Keys da Aba 6 (Rede)
        { id: 'redeNegocios', titulo: '6. Custos (Rede)', keys: [
            'Fornecedor_S1_Tela_A_Custo', 'Fornecedor_S1_Chip_C_Custo', // S1
            'Fornecedor_S2_Tela_A_Custo', 'Fornecedor_S2_Chip_C_Custo'  // S2
        ], help: helpTexts.redeNegocios },
        { id: 'financasTaxas', titulo: '7. Finanças (Taxas/Limites)', keys: ['Taxa_Juros_Curto_Prazo', 'Taxa_Juros_Emergencia', 'Taxa_Juros_Longo_Prazo', 'Prazo_Fixo_Longo_Prazo', 'Limite_CP_Percent_Ativo_Circulante', 'Limite_LP_Percent_Patrimonio_Liquido'], help: helpTexts.financasTaxas }, // ATUALIZADO
        { id: 'atratividade', titulo: '8. Pesos (Mercado/IDG)', keys: [`Peso_PD_Premium_Rodada_1`, `Peso_Mkt_Premium_Rodada_1`, `Peso_Preco_Premium_Rodada_1`, `Peso_PD_Massa_Rodada_1`, `Peso_Mkt_Massa_Rodada_1` , `Peso_Preco_Massa_Rodada_1`, 'Peso_IDG_Lucro'], help: helpTexts.atratividade(params) }, // Passa params
        { id: 'orcamentoOrganizacional', titulo: '9. Orçamento Org.', keys: ['Orcamento_Organizacional_Por_Rodada', 'Custo_Nivel_Capacitacao_2', 'Custo_Nivel_Qualidade_2', 'Custo_Nivel_ESG_2', 'Reducao_Custo_Montagem_Por_Nivel_Capacitacao_Percent'], help: helpTexts.orcamentoOrganizacional }, // NOVA ABA
        { id: 'eventos', titulo: '10. Eventos (Notícias)', keys: [], help: helpTexts.eventos } // ABA 10
    ], [helpTexts, params]); // Adiciona params como dependência

    // Efeito para carregar dados se estiver editando (inalterado na lógica, mas inclui novos campos)
    useEffect(() => {
        const fullInitialState = getInitialState(); // Garante que pega a versão atualizada
        if (isEditing && db) {
            setLoading(true);
            const docRef = doc(db, simulacoesCollectionPath, simulacaoId);
            getDoc(docRef).then(docSnap => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const mergedData = { ...fullInitialState }; // Começa com todos os defaults
                    for (const key in fullInitialState) {
                        if (data.hasOwnProperty(key)) {
                            if (typeof fullInitialState[key] === 'number') {
                                mergedData[key] = data[key] === null || data[key] === undefined || data[key] === '' ? '' : Number(data[key]);
                            } else {
                                mergedData[key] = data[key];
                            }
                        }
                    }
                    setParams(mergedData);
                } else { setErro("Simulação não encontrada."); }
                setLoading(false);
            }).catch(err => {
                console.error("Erro ao buscar simulação:", err); setErro("Erro ao carregar dados."); setLoading(false);
            });
        } else if (!isEditing) {
             setParams(fullInitialState); // Usa o estado inicial para nova simulação
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing, simulacaoId, db, simulacoesCollectionPath]);

    // Handler genérico para mudanças nos inputs (inalterado)
    const handleParamChange = (e) => {
        const { id, value, name } = e.target;
        const key = id || name;
        setParams(prev => ({ ...prev, [key]: value }));
    };

    // Funções para controlar o modal de ajuda (inalterado)
    const abrirModalAjuda = (titulo, texto) => { setModalAjudaConteudo({ titulo, texto }); setModalAjudaVisivel(true); };
    const fecharModalAjuda = () => setModalAjudaVisivel(false);

    // Verifica se os campos obrigatórios de uma seção foram preenchidos (inalterado)
    const checkCompletion = (sectionKeys, currentInitialState) => {
        if (!sectionKeys || sectionKeys.length === 0) return true;
        return sectionKeys.every(key => {
            const value = params[key];
            const isNumberField = typeof currentInitialState[key] === 'number';
            if (value === null || value === undefined) return false;
            if (isNumberField) { return value !== '' && !isNaN(Number(value)); }
            return value !== '';
        });
    };


    // Calcula quais abas estão completas (ATUALIZADO para incluir nova aba)
    const abasCompletas = useMemo(() => {
        const currentInitialState = getInitialState();
        return abasConfig.reduce((acc, aba) => {
            acc[aba.id] = checkCompletion(aba.keys, currentInitialState);
            return acc;
        }, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params, abasConfig]);

    // =================================================================
    // MUDANÇA: `gerarRodadaZero` atualizada para refletir o estado inicial completo
    // =================================================================
    const gerarRodadaZero = async (simId, simParams) => {
        const batch = writeBatch(db);
        const numEmpresas = Number(simParams.Num_Empresas) || 6;
        const nomesEmpresas = ['Alpha', 'Nexus', 'Quantum', 'Orion', 'Sirius', 'Vega', 'Phoenix', 'Centauri', 'Lyra', 'Draco'].slice(0, numEmpresas);

        nomesEmpresas.forEach((nome) => {
            const empresaRef = doc(db, simulacoesCollectionPath, simId, 'empresas', nome);
            const estadoInicialRef = doc(db, simulacoesCollectionPath, simId, 'empresas', nome, 'estados', '0');
            batch.set(empresaRef, { Nome_Empresa: nome, Integrantes_Usuarios_IDs: [] });

            const dividaInicialLP = Number(simParams.Divida_Inicial) || 0;
            const prazoLP = Number(simParams.Prazo_Fixo_Longo_Prazo) || 4; 

            const estadoInicial = {
                Rodada: 0,
                Caixa: Number(simParams.Caixa_Inicial) || 0,
                Divida_CP: 0,
                Divida_LP_Saldo: dividaInicialLP,
                Divida_LP_Rodadas_Restantes: dividaInicialLP > 0 ? prazoLP : 0,
                Divida_Emergencia: 0,
                Imobilizado_Bruto: Number(simParams.Valor_Contabil_Imobilizado) || 0,
                Depreciacao_Acumulada: 0,
                Capacidade_Fabrica: Number(simParams.Capacidade_Producao_Inicial) || 0,
                // P&D ATUALIZADO (baseado no getInitialState)
                Nivel_PD_Camera: Number(simParams.Nivel_Inicial_PD_Camera) || 1,
                Nivel_PD_Bateria: Number(simParams.Nivel_Inicial_PD_Bateria) || 1,
                Nivel_PD_Sist_Operacional_e_IA: Number(simParams.Nivel_Inicial_PD_Sist_Operacional_e_IA) || 1,
                Nivel_PD_Atualizacao_Geral: Number(simParams.Nivel_Inicial_PD_Atualizacao_Geral) || 1,
                Progresso_PD_Camera: 0, Progresso_PD_Bateria: 0, 
                Progresso_PD_Sist_Operacional_e_IA: 0,
                Progresso_PD_Atualizacao_Geral: 0,
                // P&D ORGANIZACIONAL (baseado no getInitialState)
                Nivel_Qualidade: Number(simParams.Nivel_Inicial_Qualidade) || 1,
                Nivel_Capacitacao: Number(simParams.Nivel_Inicial_Capacitacao) || 1,
                Nivel_ESG: Number(simParams.Nivel_Inicial_ESG) || 1,
                Progresso_Qualidade: 0, Progresso_Capacitacao: 0, Progresso_ESG: 0,
                // Restante (baseado no motor v7)
                Vendas_Receita: 0, Custo_Produtos_Vendidos: 0,
                Despesas_Operacionais_Outras: Number(simParams.Custo_Fixo_Operacional) || 0,
                Despesas_Juros_CP: 0, Despesas_Juros_Emergencia: 0, Despesas_Juros_LP: 0,
                Despesas_Organiz_Capacitacao: 0, Despesas_Organiz_Mkt_Institucional: 0, Despesas_Organiz_ESG: 0,
                Lucro_Bruto: 0,
                Lucro_Operacional_EBIT: 0 - (Number(simParams.Custo_Fixo_Operacional) || 0),
                Lucro_Liquido: 0 - (Number(simParams.Custo_Fixo_Operacional) || 0),
                // MUDANÇA: Estoque agora é segmentado
                Estoque_S1_Unidades: 0, Custo_Estoque_S1: 0,
                Estoque_S2_Unidades: 0, Custo_Estoque_S2: 0,
                // Estoque_Final_Unidades: 0, Custo_Estoque_Final: 0, // Campos antigos removidos
                Lucro_Acumulado: 0, Valor_Marca_Acumulado: 0, IDG_Score: 0, IDG_Metricas: {}
            };
            batch.set(estadoInicialRef, estadoInicial);
        });

        const simRef = doc(db, simulacoesCollectionPath, simId);
        batch.update(simRef, { Status: 'Ativa - Rodada 1', Rodada_Atual: 0 });
        await batch.commit();
        console.log(`Rodada 0 gerada com sucesso para ${numEmpresas} empresas.`);
    };
    // --- Fim RF 1.6 ---

    // Handler para submeter o formulário (inalterado na lógica principal)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db) { setErro("Erro de conexão."); return; } setLoading(true); setErro('');

        const currentInitialState = getInitialState();
        const dadosParaSalvar = Object.entries(params).reduce((acc, [key, value]) => {
            const isNumericField = typeof currentInitialState[key] === 'number';
            if (isNumericField) {
                 acc[key] = Number(value) || 0;
            } else {
                acc[key] = value;
            }
             return acc;
        }, {});

        // Validação de soma dos pesos
        const totalRodadas = Number(dadosParaSalvar.Total_Rodadas) || 0;
        for (let i = 1; i <= totalRodadas; i++) {
            const somaPesosPremium = (dadosParaSalvar[`Peso_PD_Premium_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_Mkt_Premium_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_Preco_Premium_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_Qualidade_Premium_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_ESG_Premium_Rodada_${i}`] || 0);
            const somaPesosPDPremium = (dadosParaSalvar[`Peso_PD_Camera_Premium_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_PD_Bateria_Premium_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_PD_Sist_Operacional_e_IA_Premium_Rodada_${i}`] || 0);
            const somaPesosMassa = (dadosParaSalvar[`Peso_PD_Massa_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_Mkt_Massa_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_Preco_Massa_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_Qualidade_Massa_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_ESG_Massa_Rodada_${i}`] || 0);
            
            if (Math.abs(somaPesosPremium - 1) > 0.01 || Math.abs(somaPesosPDPremium - 1) > 0.01 || Math.abs(somaPesosMassa - 1) > 0.01) {
                setErro(`Erro Rodada ${i}: Pesos devem somar 1.0.`); setLoading(false); setAbaAtiva('atratividade'); return;
            }
        }
        const somaPesosIDG = (dadosParaSalvar.Peso_IDG_Lucro || 0) + (dadosParaSalvar.Peso_IDG_Share || 0) + (dadosParaSalvar.Peso_IDG_PD || 0) + (dadosParaSalvar.Peso_IDG_Saude_Financeira || 0);
        if (Math.abs(somaPesosIDG - 1) > 0.01) {
            setErro(`Erro Pesos IDG: Pesos devem somar 1.0 (soma atual: ${somaPesosIDG}).`); setLoading(false); setAbaAtiva('atratividade'); return;
        }
        // Validações básicas
        if (totalRodadas <= 0 || totalRodadas > 12) { setErro("Rodadas entre 1 e 12."); setLoading(false); setAbaAtiva('infoBasicas'); return; }
        if (dadosParaSalvar.Num_Empresas <= 1 || dadosParaSalvar.Num_Empresas > 10) { setErro("Empresas entre 2 e 10."); setLoading(false); setAbaAtiva('infoBasicas'); return; }
        if (dadosParaSalvar.Taxa_Juros_Curto_Prazo < 0 || dadosParaSalvar.Taxa_Juros_Emergencia < 0 || dadosParaSalvar.Taxa_Juros_Longo_Prazo < 0) {
            setErro("Taxas de juros não podem ser negativas."); setLoading(false); setAbaAtiva('financasTaxas'); return;
        }
        if (dadosParaSalvar.Prazo_Fixo_Longo_Prazo <= 0 || !Number.isInteger(dadosParaSalvar.Prazo_Fixo_Longo_Prazo) ) {
             setErro("Prazo LP deve ser inteiro positivo."); setLoading(false); setAbaAtiva('financasTaxas'); return;
        }
        if (dadosParaSalvar.Limite_CP_Percent_Ativo_Circulante < 0 || dadosParaSalvar.Limite_LP_Percent_Patrimonio_Liquido < 0) {
             setErro("Limites de financiamento não podem ser negativos."); setLoading(false); setAbaAtiva('financasTaxas'); return;
        }
         if (dadosParaSalvar.Orcamento_Organizacional_Por_Rodada < 0) {
             setErro("Orçamento Organizacional não pode ser negativo."); setLoading(false); setAbaAtiva('orcamentoOrganizacional'); return;
        }


        try {
            let currentSimId = simulacaoId;
             if (isEditing) {
                 const docRef = doc(db, simulacoesCollectionPath, currentSimId);
                 await setDoc(docRef, dadosParaSalvar, { merge: true });
                 console.log("Simulação atualizada.");
             } else {
                 const simulacoesCollection = collection(db, simulacoesCollectionPath);
                 const dadosIniciais = { ...dadosParaSalvar, Status: 'Configurando', CriadaEm: serverTimestamp(), Rodada_Atual: 0 };
                 const newSimDoc = await addDoc(simulacoesCollection, dadosIniciais);
                 currentSimId = newSimDoc.id;
                 console.log("Nova simulação criada:", currentSimId);
                 await gerarRodadaZero(currentSimId, dadosParaSalvar);
             }
             navigate('/simulador/admin');
        } catch (err) {
            console.error("Erro ao salvar simulação:", err); setErro(`Falha ao salvar: ${err.message}`); setLoading(false);
        }
    };

    // Renderização do formulário (ATUALIZADO com nova aba)
    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-6 md:p-8 animate-fade-in max-w-6xl mx-auto">
            {/* Cabeçalho */}
            <div className="flex justify-between items-center mb-6"> <h2 className="text-xl md:text-2xl font-bold text-cyan-400"> {isEditing ? `Editando: ${params.Nome_Simulacao || '...'}` : 'Criar Nova Simulação'} </h2> <button onClick={() => navigate('/simulador/admin')} className="text-sm text-cyan-400 hover:underline"> &larr; Voltar </button> </div>
            {erro && <p className="text-red-400 bg-red-900 p-3 rounded-lg mb-4 text-sm">{erro}</p>}

            {/* Navegação por Abas (ATUALIZADA com nova aba) */}
            <nav className="flex flex-wrap justify-center bg-gray-700 rounded-lg p-2 mb-6 gap-2 text-sm">
                {abasConfig.map(aba => (
                    <button key={aba.id} type="button" onClick={() => setAbaAtiva(aba.id)}
                        className={`flex items-center px-2 py-1 md:px-3 md:py-2 rounded-md font-semibold flex-grow transition-colors whitespace-nowrap ${abaAtiva === aba.id ? 'bg-cyan-500 text-white' : 'bg-gray-800 hover:bg-gray-600 text-gray-300'}`}>
                        {aba.titulo} {abasCompletas[aba.id] && <IconeCheck />}
                        <span onClick={(e) => { e.stopPropagation(); abrirModalAjuda(aba.titulo, typeof aba.help === 'function' ? aba.help(params) : aba.help); }} className="inline-block ml-1 cursor-pointer" aria-label={`Ajuda ${aba.titulo}`}> <IconeInfo /> </span>
                    </button>
                ))}
            </nav>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Aba 1: Informações Básicas */}
                <div className={abaAtiva === 'infoBasicas' ? 'block' : 'hidden'}> <AbaConteudo title="1. Informações Básicas" isComplete={abasCompletas.infoBasicas} helpText={helpTexts.infoBasicas} onHelpClick={abrirModalAjuda}> <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2"> <div><label htmlFor="Nome_Simulacao" className="block text-sm font-medium text-gray-400 mb-1">Nome</label><input type="text" id="Nome_Simulacao" value={params.Nome_Simulacao} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label htmlFor="Total_Rodadas" className="block text-sm font-medium text-gray-400 mb-1">Rodadas</label><input type="number" id="Total_Rodadas" value={params.Total_Rodadas} onChange={handleParamChange} min="1" max="12" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label htmlFor="Num_Empresas" className="block text-sm font-medium text-gray-400 mb-1">Empresas</label><input type="number" id="Num_Empresas" value={params.Num_Empresas} onChange={handleParamChange} min="2" max="10" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </AbaConteudo> </div>
                {/* Aba 2: Cenário Macro */}
                <div className={abaAtiva === 'cenarioMacro' ? 'block' : 'hidden'}> <AbaConteudo title="2. Cenário Macro" isComplete={abasCompletas.cenarioMacro} helpText={helpTexts.cenarioMacro} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-4"> <div><label htmlFor="Cenario_Inicial_Descricao" className="block text-sm font-medium text-gray-400 mb-1">Briefing</label><textarea id="Cenario_Inicial_Descricao" value={params.Cenario_Inicial_Descricao} onChange={handleParamChange} rows="5" className="w-full bg-gray-700 p-3 rounded-lg"></textarea></div> <div><label htmlFor="Taxa_Base_Inflacao" className="block text-sm font-medium text-gray-400 mb-1">Inflação Base Anual (%)</label><input type="number" id="Taxa_Base_Inflacao" value={params.Taxa_Base_Inflacao} onChange={handleParamChange} min="0" step="0.1" className="w-full md:w-1/3 bg-gray-700 p-2 rounded-lg" required /></div> </div> </AbaConteudo> </div>
                {/* Aba 3: Mercado */}
                <div className={abaAtiva === 'mercado' ? 'block' : 'hidden'}> <AbaConteudo title="3. Mercado" isComplete={abasCompletas.mercado} helpText={helpTexts.mercado} onHelpClick={abrirModalAjuda}> <div className="space-y-4 mt-2"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-700 pb-4"> <div><label htmlFor="Segmento1_Nome" className="block text-sm font-medium text-gray-400 mb-1">Seg. 1</label><input type="text" id="Segmento1_Nome" value={params.Segmento1_Nome} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label htmlFor="Segmento2_Nome" className="block text-sm font-medium text-gray-400 mb-1">Seg. 2</label><input type="text" id="Segmento2_Nome" value={params.Segmento2_Nome} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> <div className="mt-4 space-y-4 max-h-[400px] overflow-y-auto pr-2"> <h4 className="text-md font-semibold text-gray-300 mb-2">Demanda (Unid.)</h4> {Array.from({ length: Math.max(0, Number(params.Total_Rodadas) || 0) }, (_, i) => i + 1).map(r => ( <div key={`dem-${r}`} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end border-b border-gray-700 pb-4 last:border-b-0"> <span className="font-semibold text-gray-300 md:col-span-1 self-center">Rodada {r}</span> <div className="md:col-span-2 grid grid-cols-2 gap-4"> <InputNumericoMasked id={`Segmento1_Demanda_Rodada_${r}`} name={`Segmento1_Demanda_Rodada_${r}`} label={params.Segmento1_Nome} value={params[`Segmento1_Demanda_Rodada_${r}`]} onChange={handleParamChange} sufixo="Unid." required /> <InputNumericoMasked id={`Segmento2_Demanda_Rodada_${r}`} name={`Segmento2_Demanda_Rodada_${r}`} label={params.Segmento2_Nome} value={params[`Segmento2_Demanda_Rodada_${r}`]} onChange={handleParamChange} sufixo="Unid." required /> </div> </div> ))} </div> </div> </AbaConteudo> </div>
                {/* Aba 4: Setup Inicial (ATUALIZADO) */}
                <div className={abaAtiva === 'setupInicial' ? 'block' : 'hidden'}> <AbaConteudo title="4. Setup Inicial (Simétrico)" isComplete={abasCompletas.setupInicial} helpText={helpTexts.setupInicial} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-6"> <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-gray-300 mb-2">Financeiro</h4> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <InputMoedaMasked id="Caixa_Inicial" label="Caixa (R$)" value={params.Caixa_Inicial} onChange={handleParamChange} required /> <InputMoedaMasked id="Divida_Inicial" label="Dívida LP Inicial (R$)" value={params.Divida_Inicial} onChange={handleParamChange} required /> <InputMoedaMasked id="Valor_Contabil_Imobilizado" label="Imobilizado (R$)" value={params.Valor_Contabil_Imobilizado} onChange={handleParamChange} required /> </div> </div> <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-gray-300 mb-2">Operações</h4> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <InputNumericoMasked id="Capacidade_Producao_Inicial" label="Capacidade" value={params.Capacidade_Producao_Inicial} onChange={handleParamChange} sufixo="Unid." required /> <InputMoedaMasked id="Custo_Fixo_Operacional" label="Custo Fixo/Rodada (R$)" value={params.Custo_Fixo_Operacional} onChange={handleParamChange} required /> <InputMoedaMasked id="Custo_Variavel_Montagem_Base" label="Custo Base de Montagem (R$/Unid.)" value={params.Custo_Variavel_Montagem_Base} onChange={handleParamChange} required /> </div> </div> <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-gray-300 mb-2">P&D Inicial (Níveis 1-5)</h4> <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> <div><label className="text-xs">Câmera</label><input type="number" id="Nivel_Inicial_PD_Camera" value={params.Nivel_Inicial_PD_Camera} onChange={handleParamChange} min="1" max="5" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Bateria</label><input type="number" id="Nivel_Inicial_PD_Bateria" value={params.Nivel_Inicial_PD_Bateria} onChange={handleParamChange} min="1" max="5" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Sist. Operacional e IA</label><input type="number" id="Nivel_Inicial_PD_Sist_Operacional_e_IA" value={params.Nivel_Inicial_PD_Sist_Operacional_e_IA} onChange={handleParamChange} min="1" max="5" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Atualização Geral</label><input type="number" id="Nivel_Inicial_PD_Atualizacao_Geral" value={params.Nivel_Inicial_PD_Atualizacao_Geral} onChange={handleParamChange} min="1" max="5" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </div> 
                    {/* NOVO: NÍVEIS INICIAIS ORGANIZACIONAIS */}
                    <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-gray-300 mb-2">Organizacional Inicial (Níveis 1-5)</h4> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <div><label className="text-xs">Capacitação</label><input type="number" id="Nivel_Inicial_Capacitacao" value={params.Nivel_Inicial_Capacitacao} onChange={handleParamChange} min="1" max="5" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Qualidade</label><input type="number" id="Nivel_Inicial_Qualidade" value={params.Nivel_Inicial_Qualidade} onChange={handleParamChange} min="1" max="5" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">ESG</label><input type="number" id="Nivel_Inicial_ESG" value={params.Nivel_Inicial_ESG} onChange={handleParamChange} min="1" max="5" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </div>
                </div> </AbaConteudo> </div>
                {/* Aba 5: Custos P&D/Expansão (ATUALIZADO) */}
                <div className={abaAtiva === 'custosInvestimento' ? 'block' : 'hidden'}> <AbaConteudo title="5. Custos (P&D/Expansão)" isComplete={abasCompletas.custosInvestimento} helpText={helpTexts.custosInvestimento} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-6"> <div className="pt-4 border-t border-gray-700"> <h4 className="font-semibold text-gray-300 mb-2">Custos P&D (R$)</h4> {['Camera', 'Bateria', 'Sist_Operacional_e_IA', 'Atualizacao_Geral'].map(area => ( <div key={area} className="mb-4 last:mb-0"> <h5 className="text-md font-medium text-gray-400 mb-1">{area.replace(/_/g, ' ')}</h5> <div className="grid grid-cols-2 md:grid-cols-4 gap-2"> {[2, 3, 4, 5].map(nivel => (<InputMoedaMasked key={`${area}-${nivel}`} id={`Custo_PD_${area}_Nivel_${nivel}`} label={`Custo Total Acum. p/ Nível ${nivel}`} value={params[`Custo_PD_${area}_Nivel_${nivel}`]} onChange={handleParamChange} required />))} </div> </div> ))} </div> <div className="pt-4 border-t border-gray-700"> <h4 className="font-semibold text-gray-300 mb-2">Custo Expansão Fábrica</h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <InputMoedaMasked id="Custo_Expansao_Lote" label="Custo por Lote (R$)" value={params.Custo_Expansao_Lote} onChange={handleParamChange} required /> <InputNumericoMasked id="Incremento_Capacidade_Lote" label="Capacidade/Lote" value={params.Incremento_Capacidade_Lote} onChange={handleParamChange} sufixo="Unid." required /> </div> </div> </div> </AbaConteudo> </div>
                
                {/* ================================================================= */}
                {/* MUDANÇA: Aba 6: Rede de Negócios (Layout Totalmente Novo) */}
                {/* ================================================================= */}
                <div className={abaAtiva === 'redeNegocios' ? 'block' : 'hidden'}>
                    <AbaConteudo title="6. Parâmetros Rede (Fornecedores)" isComplete={abasCompletas.redeNegocios} helpText={helpTexts.redeNegocios} onHelpClick={abrirModalAjuda}>
                        <div className="mt-2 space-y-6">
                            
                            {/* --- FORNECEDORES SEGMENTO 1 --- */}
                            <div className="pt-4 border-t border-gray-700">
                                <h4 className="font-semibold text-cyan-300 mb-2 text-lg">Fornecedores - {params.Segmento1_Nome}</h4>
                                <div className="space-y-4">
                                    <h5 className="font-semibold text-gray-300 mb-1">Telas ({params.Segmento1_Nome})</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2"> <label className="text-sm">Opção A (Contratual)</label> <textarea id="Fornecedor_S1_Tela_A_Desc" value={params.Fornecedor_S1_Tela_A_Desc} onChange={handleParamChange} rows="3" className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_S1_Tela_A_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_S1_Tela_A_Custo} onChange={handleParamChange} required /> </div>
                                        <div className="space-y-2"> <label className="text-sm">Opção B (Relacional)</label> <textarea id="Fornecedor_S1_Tela_B_Desc" value={params.Fornecedor_S1_Tela_B_Desc} onChange={handleParamChange} rows="3" className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_S1_Tela_B_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_S1_Tela_B_Custo} onChange={handleParamChange} required /> </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <h5 className="font-semibold text-gray-300 mb-1">Chips ({params.Segmento1_Nome})</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2"> <label className="text-sm">Opção C (Padrão)</label> <textarea id="Fornecedor_S1_Chip_C_Desc" value={params.Fornecedor_S1_Chip_C_Desc} onChange={handleParamChange} rows="3" className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_S1_Chip_C_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_S1_Chip_C_Custo} onChange={handleParamChange} required /> </div>
                                        <div className="space-y-2"> <label className="text-sm">Opção D (Inovação)</label> <textarea id="Fornecedor_S1_Chip_D_Desc" value={params.Fornecedor_S1_Chip_D_Desc} onChange={handleParamChange} rows="3" className="w-full bg-gray-700 p-2 rounded-lg" required /> <div className="grid grid-cols-2 gap-4"> <InputMoedaMasked id="Fornecedor_S1_Chip_D_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_S1_Chip_D_Custo} onChange={handleParamChange} required /> <div><label className="text-xs">Bônus P&D (%)</label><input type="number" id="Fornecedor_S1_Chip_D_Bonus_PD_Percent" value={params.Fornecedor_S1_Chip_D_Bonus_PD_Percent} onChange={handleParamChange} min="0" max="100" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* --- FORNECEDORES SEGMENTO 2 --- */}
                            <div className="pt-4 border-t-2 border-cyan-700">
                                <h4 className="font-semibold text-cyan-300 mb-2 text-lg">Fornecedores - {params.Segmento2_Nome}</h4>
                                <div className="space-y-4">
                                    <h5 className="font-semibold text-gray-300 mb-1">Telas ({params.Segmento2_Nome})</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2"> <label className="text-sm">Opção A (Contratual)</label> <textarea id="Fornecedor_S2_Tela_A_Desc" value={params.Fornecedor_S2_Tela_A_Desc} onChange={handleParamChange} rows="3" className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_S2_Tela_A_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_S2_Tela_A_Custo} onChange={handleParamChange} required /> </div>
                                        <div className="space-y-2"> <label className="text-sm">Opção B (Relacional)</label> <textarea id="Fornecedor_S2_Tela_B_Desc" value={params.Fornecedor_S2_Tela_B_Desc} onChange={handleParamChange} rows="3" className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_S2_Tela_B_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_S2_Tela_B_Custo} onChange={handleParamChange} required /> </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <h5 className="font-semibold text-gray-300 mb-1">Chips ({params.Segmento2_Nome})</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2"> <label className="text-sm">Opção C (Padrão)</label> <textarea id="Fornecedor_S2_Chip_C_Desc" value={params.Fornecedor_S2_Chip_C_Desc} onChange={handleParamChange} rows="3" className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_S2_Chip_C_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_S2_Chip_C_Custo} onChange={handleParamChange} required /> </div>
                                        <div className="space-y-2"> <label className="text-sm">Opção D (Inovação)</label> <textarea id="Fornecedor_S2_Chip_D_Desc" value={params.Fornecedor_S2_Chip_D_Desc} onChange={handleParamChange} rows="3" className="w-full bg-gray-700 p-2 rounded-lg" required /> <div className="grid grid-cols-2 gap-4"> <InputMoedaMasked id="Fornecedor_S2_Chip_D_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_S2_Chip_D_Custo} onChange={handleParamChange} required /> <div><label className="text-xs">Bônus P&D (%)</label><input type="number" id="Fornecedor_S2_Chip_D_Bonus_PD_Percent" value={params.Fornecedor_S2_Chip_D_Bonus_PD_Percent} onChange={handleParamChange} min="0" max="100" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AbaConteudo>
                </div>

                {/* Aba 7: Finanças (Taxas/Limites) */}
                <div className={abaAtiva === 'financasTaxas' ? 'block' : 'hidden'}>
                    <AbaConteudo title="7. Finanças (Taxas e Limites)" isComplete={abasCompletas.financasTaxas} helpText={helpTexts.financasTaxas} onHelpClick={abrirModalAjuda}>
                        <div className="mt-2 space-y-6">
                            <div className="pt-4 border-t border-gray-700">
                                <h4 className="font-semibold text-gray-300 mb-2">Taxas e Prazos</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                    <div><label htmlFor="Taxa_Juros_Curto_Prazo" className="block text-xs font-medium text-gray-400 mb-1">Juros Curto Prazo (%/Rodada)</label><input type="number" id="Taxa_Juros_Curto_Prazo" value={params.Taxa_Juros_Curto_Prazo} onChange={handleParamChange} min="0" step="0.1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                                    <div><label htmlFor="Taxa_Juros_Emergencia" className="block text-xs font-medium text-gray-400 mb-1">Juros Emergência (%/Rodada)</label><input type="number" id="Taxa_Juros_Emergencia" value={params.Taxa_Juros_Emergencia} onChange={handleParamChange} min="0" step="0.1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                                    <div><label htmlFor="Taxa_Juros_Longo_Prazo" className="block text-xs font-medium text-gray-400 mb-1">Juros Longo Prazo (%/Rodada)</label><input type="number" id="Taxa_Juros_Longo_Prazo" value={params.Taxa_Juros_Longo_Prazo} onChange={handleParamChange} min="0" step="0.1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                                    <div><label htmlFor="Prazo_Fixo_Longo_Prazo" className="block text-xs font-medium text-gray-400 mb-1">Prazo Fixo LP (Rodadas)</label><input type="number" id="Prazo_Fixo_Longo_Prazo" value={params.Prazo_Fixo_Longo_Prazo} onChange={handleParamChange} min="1" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-700">
                                <h4 className="font-semibold text-gray-300 mb-2">Limites de Alavancagem</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label htmlFor="Limite_CP_Percent_Ativo_Circulante" className="block text-xs font-medium text-gray-400 mb-1">Limite CP (% Ativo Circulante)</label><input type="number" id="Limite_CP_Percent_Ativo_Circulante" value={params.Limite_CP_Percent_Ativo_Circulante} onChange={handleParamChange} min="0" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                                    <div><label htmlFor="Limite_LP_Percent_Patrimonio_Liquido" className="block text-xs font-medium text-gray-400 mb-1">Limite LP (% Patrimônio Líquido)</label><input type="number" id="Limite_LP_Percent_Patrimonio_Liquido" value={params.Limite_LP_Percent_Patrimonio_Liquido} onChange={handleParamChange} min="0" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                                </div>
                            </div>
                        </div>
                    </AbaConteudo>
                </div>
                {/* Aba 8: Atratividade (Pesos) (ATUALIZADO) */}
                <div className={abaAtiva === 'atratividade' ? 'block' : 'hidden'}> <AbaConteudo title="8. Pesos (Atratividade de Mercado e Ranking IDG)" isComplete={abasCompletas.atratividade} helpText={helpTexts.atratividade(params)} onHelpClick={abrirModalAjuda}> 
                    <div className="pt-4 border-t border-gray-700 mt-4">
                        <h4 className="font-semibold text-gray-300 mb-2 text-lg flex items-center">
                            Pesos do Ranking Final (IDG, Soma=1.0)
                            <span onClick={(e) => { e.stopPropagation(); abrirModalAjuda("Pesos do Ranking (IDG)", helpTexts.rankingIDG); }} className="inline-block ml-1 cursor-pointer" aria-label={`Ajuda sobre Ranking IDG`}> <IconeInfo /> </span>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div><label className="text-xs">Peso Lucro Acumulado</label><input type="number" name={`Peso_IDG_Lucro`} value={params[`Peso_IDG_Lucro`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                             <div><label className="text-xs">Peso Market Share</label><input type="number" name={`Peso_IDG_Share`} value={params[`Peso_IDG_Share`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                             <div><label className="text-xs">Peso Nível P&D</label><input type="number" name={`Peso_IDG_PD`} value={params[`Peso_IDG_PD`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                             <div><label className="text-xs">Peso Saúde Financeira</label><input type="number" name={`Peso_IDG_Saude_Financeira`} value={params[`Peso_IDG_Saude_Financeira`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                        </div>
                    </div>
                    <div className="mt-6 space-y-4 max-h-[400px] overflow-y-auto pr-2"> 
                        <h4 className="text-md font-semibold text-gray-300 mb-2 text-lg">Pesos de Atratividade (Market Share) por Rodada</h4> 
                        {Array.from({ length: Math.max(0, Number(params.Total_Rodadas) || 0) }, (_, i) => i + 1).map(r => ( 
                            <div key={`atr-${r}`} className="space-y-6 border-b border-gray-700 pb-4 mb-4 last:border-b-0"> 
                                <h4 className="font-semibold text-gray-300 text-lg">Rodada {r}</h4> 
                                <div className="p-4 bg-gray-900 rounded"><h5 className="font-semibold text-gray-300 mb-2">{params.Segmento1_Nome} (Pesos Gerais, Soma=1.0)</h5><div className="grid grid-cols-1 md:grid-cols-5 gap-4"> <div><label className="text-xs">Peso P&D</label><input type="number" name={`Peso_PD_Premium_Rodada_${r}`} value={params[`Peso_PD_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso Mkt</label><input type="number" name={`Peso_Mkt_Premium_Rodada_${r}`} value={params[`Peso_Mkt_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso Preço</label><input type="number" name={`Peso_Preco_Premium_Rodada_${r}`} value={params[`Peso_Preco_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                                    <div><label className="text-xs">Peso Qualidade</label><input type="number" name={`Peso_Qualidade_Premium_Rodada_${r}`} value={params[`Peso_Qualidade_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso ESG</label><input type="number" name={`Peso_ESG_Premium_Rodada_${r}`} value={params[`Peso_ESG_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                                </div></div> 
                                <div className="p-4 bg-gray-900 rounded"><h5 className="font-semibold text-gray-300 mb-2">{params.Segmento1_Nome} (Pesos P&D, Soma=1.0)</h5><div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <div><label className="text-xs">Peso Câmera</label><input type="number" name={`Peso_PD_Camera_Premium_Rodada_${r}`} value={params[`Peso_PD_Camera_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso Bateria</label><input type="number" name={`Peso_PD_Bateria_Premium_Rodada_${r}`} value={params[`Peso_PD_Bateria_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso Sist. Op. e IA</label><input type="number" name={`Peso_PD_Sist_Operacional_e_IA_Premium_Rodada_${r}`} value={params[`Peso_PD_Sist_Operacional_e_IA_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div></div> 
                                <div className="p-4 bg-gray-900 rounded"><h4 className="font-semibold text-gray-300 mb-2">{params.Segmento2_Nome} (Pesos Gerais, Soma=1.0)</h4><div className="grid grid-cols-1 md:grid-cols-5 gap-4"> <div><label className="text-xs">Peso P&D (Atual. Geral)</label><input type="number" name={`Peso_PD_Massa_Rodada_${r}`} value={params[`Peso_PD_Massa_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso Mkt</label><input type="number" name={`Peso_Mkt_Massa_Rodada_${r}`} value={params[`Peso_Mkt_Massa_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso Preço</label><input type="number" name={`Peso_Preco_Massa_Rodada_${r}`} value={params[`Peso_Preco_Massa_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                                    <div><label className="text-xs">Peso Qualidade</label><input type="number" name={`Peso_Qualidade_Massa_Rodada_${r}`} value={params[`Peso_Qualidade_Massa_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso ESG</label><input type="number" name={`Peso_ESG_Massa_Rodada_${r}`} value={params[`Peso_ESG_Massa_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                                </div></div> 
                            </div> 
                        ))} 
                    </div> 
                </AbaConteudo> </div>

                {/* Aba 9: Orçamento Organizacional */}
                <div className={abaAtiva === 'orcamentoOrganizacional' ? 'block' : 'hidden'}>
                    <AbaConteudo title="9. Orçamento Organizacional e Custos" isComplete={abasCompletas.orcamentoOrganizacional} helpText={helpTexts.orcamentoOrganizacional} onHelpClick={abrirModalAjuda}>
                        <div className="mt-2 space-y-6">
                            <div className="pt-4 border-t border-gray-700">
                                <h4 className="font-semibold text-gray-300 mb-2">Orçamento</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputMoedaMasked id="Orcamento_Organizacional_Por_Rodada" label="Orçamento por Rodada (R$)" value={params.Orcamento_Organizacional_Por_Rodada} onChange={handleParamChange} required />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-700">
                                <h4 className="font-semibold text-gray-300 mb-2">Custos Acumulados p/ Nível (R$)</h4>
                                <div className="mb-4 last:mb-0">
                                    <h5 className="text-md font-medium text-gray-400 mb-1">Capacitação (Reduz Custo Montagem)</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="md:col-span-1">
                                            <label className="text-xs">Redução Custo/Nível (%)</label>
                                            <input type="number" id="Reducao_Custo_Montagem_Por_Nivel_Capacitacao_Percent" value={params.Reducao_Custo_Montagem_Por_Nivel_Capacitacao_Percent} onChange={handleParamChange} min="0" step="0.1" className="w-full bg-gray-700 p-2 rounded-lg" required />
                                        </div>
                                        {[2, 3, 4, 5].map(nivel => (<InputMoedaMasked key={`Capacitacao-${nivel}`} id={`Custo_Nivel_Capacitacao_Nivel_${nivel}`} label={`Custo Total p/ Nível ${nivel}`} value={params[`Custo_Nivel_Capacitacao_Nivel_${nivel}`]} onChange={handleParamChange} required />))}
                                    </div>
                                </div>
                                <div className="mb-4 last:mb-0">
                                    <h5 className="text-md font-medium text-gray-400 mb-1">Qualidade (Impacta Atratividade)</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {[2, 3, 4, 5].map(nivel => (<InputMoedaMasked key={`Qualidade-${nivel}`} id={`Custo_Nivel_Qualidade_Nivel_${nivel}`} label={`Custo Total p/ Nível ${nivel}`} value={params[`Custo_Nivel_Qualidade_Nivel_${nivel}`]} onChange={handleParamChange} required />))}
                                    </div>
                                </div>
                                <div className="mb-4 last:mb-0">
                                    <h5 className="text-md font-medium text-gray-400 mb-1">ESG (Impacta Atratividade e IDG)</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {[2, 3, 4, 5].map(nivel => (<InputMoedaMasked key={`ESG-${nivel}`} id={`Custo_Nivel_ESG_Nivel_${nivel}`} label={`Custo Total p/ Nível ${nivel}`} value={params[`Custo_Nivel_ESG_Nivel_${nivel}`]} onChange={handleParamChange} required />))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AbaConteudo>
                </div>

                {/* Aba 10: Eventos (Notícias) */}
                <div className={abaAtiva === 'eventos' ? 'block' : 'hidden'}> <AbaConteudo title="10. Eventos de Mercado (Notícias)" isComplete={abasCompletas.eventos} helpText={helpTexts.eventos} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-4 max-h-[400px] overflow-y-auto pr-2"> {Array.from({ length: Math.max(0, Number(params.Total_Rodadas) || 0) }, (_, i) => i + 1).map(r => ( <div key={`noticia-${r}`}> <label htmlFor={`Noticia_Rodada_${r}`} className="block text-sm font-medium text-gray-400 mb-1">Notícia Início Rodada {r}</label> <textarea id={`Noticia_Rodada_${r}`} name={`Noticia_Rodada_${r}`} value={params[`Noticia_Rodada_${r}`]} onChange={handleParamChange} rows="3" className="w-full bg-gray-700 p-3 rounded-lg" placeholder={`O que acontecerá no início da Rodada ${r}?`} /> </div> ))} </div> </AbaConteudo> </div>

                {/* Botões Finais */}
                <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-700"> <button type="button" onClick={() => navigate('/simulador/admin')} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-6 rounded-lg" disabled={loading}> Cancelar </button> <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-6 rounded-lg" disabled={loading}> {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar e Iniciar Simulação')} </button> </div>
            </form>

            {/* Modal de Ajuda */}
            {modalAjudaVisivel && ( <ModalAjuda titulo={modalAjudaConteudo.titulo} texto={modalAjudaConteudo.texto} onClose={fecharModalAjuda} /> )}
        </div>
    );
}

export default SimuladorForm;