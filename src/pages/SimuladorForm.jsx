import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
// CORREÇÃO v6: Caminho relativo
import { db, appId } from '../firebase/config.js';

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
    return ( /* ... JSX inalterado ... */ <div> <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1">{label}</label> <div className="relative"> <input type="text" inputMode="numeric" id={id} name={props.name || id} value={displayValue} onChange={handleChange} className={`w-full bg-gray-700 p-2 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="R$ 0" disabled={disabled} {...props} /> </div> </div> );
};


// --- Componente Input com Máscara Numérica (Milhar - v6) ---
const InputNumericoMasked = ({ id, label, value: externalValue, onChange, sufixo = '', disabled = false, ...props }) => {
    const [displayValue, setDisplayValue] = useState('');
    const formatNumber = (num) => { if (num === null || num === undefined || num === '' || isNaN(Number(num))) return ''; const number = Number(num); return number.toLocaleString('pt-BR'); };
    useEffect(() => { setDisplayValue(formatNumber(externalValue)); }, [externalValue]);
    const handleChange = (e) => { const inputVal = e.target.value; const numericString = inputVal.replace(/\D/g, ''); let numberValue = ''; if (numericString !== '') { const parsedNum = parseInt(numericString, 10); if (!isNaN(parsedNum)) { numberValue = parsedNum; } } setDisplayValue(formatNumber(numberValue)); if (onChange) { onChange({ target: { id: id || props.name, name: props.name || id, value: numberValue, type: 'number' } }); } };
    return ( /* ... JSX inalterado ... */ <div> <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1">{label}</label> <div className="relative"> <input type="text" inputMode="numeric" id={id} name={props.name || id} value={displayValue} onChange={handleChange} className={`w-full bg-gray-700 p-2 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none ${sufixo ? 'pr-10 md:pr-12' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="0" disabled={disabled} {...props} /> {sufixo && <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm pointer-events-none">{sufixo}</span>} </div> </div> );
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
            Segmento1_Nome: 'Premium', Segmento2_Nome: 'Massa',
            // Aba 4: Setup Inicial
            Tipo_Setup: 'Simetrico', Caixa_Inicial: 200000000, Divida_Inicial: 0, // Divida_Inicial agora é só LP no motor
            Valor_Contabil_Imobilizado: 100000000, Capacidade_Producao_Inicial: 1000000,
            Custo_Fixo_Operacional: 20000000, Custo_Variavel_Montagem_Base: 120,
            Nivel_Inicial_PD_Camera: 1, Nivel_Inicial_PD_Bateria: 1, Nivel_Inicial_PD_IA: 1,
            // Aba 5: Custos P&D/Expansão
            Custo_PD_Camera_Nivel_2: 30000000, Custo_PD_Camera_Nivel_3: 50000000, Custo_PD_Camera_Nivel_4: 80000000, Custo_PD_Camera_Nivel_5: 120000000,
            Custo_PD_Bateria_Nivel_2: 25000000, Custo_PD_Bateria_Nivel_3: 45000000, Custo_PD_Bateria_Nivel_4: 70000000, Custo_PD_Bateria_Nivel_5: 110000000,
            Custo_PD_IA_Nivel_2: 40000000, Custo_PD_IA_Nivel_3: 60000000, Custo_PD_IA_Nivel_4: 90000000, Custo_PD_IA_Nivel_5: 140000000,
            Custo_Expansao_Lote: 10000000, Incremento_Capacidade_Lote: 100000,
            // Aba 6: Rede de Negócios
            Fornecedor_Tela_A_Desc: 'Fornecedor A (Transacional): Vínculo Fraco, 20% de chance de atraso, 15% de perda de produção.', Fornecedor_Tela_A_Custo: 50,
            Fornecedor_Tela_B_Desc: 'Fornecedor B (Relacional): Vínculo Forte, 100% de confiabilidade.', Fornecedor_Tela_B_Custo: 70,
            Fornecedor_Chip_C_Desc: 'Fornecedor C (Padrão): Tecnologia Padrão.', Fornecedor_Chip_C_Custo: 80,
            Fornecedor_Chip_D_Desc: 'Fornecedor D (Inovação): Bônus de 10% no investimento em P&D (Bateria e IA).', Fornecedor_Chip_D_Custo: 95, Fornecedor_Chip_D_Bonus_PD_Percent: 10, // Mantido, o motor usa isso

            // ** NOVOS PARÂMETROS FINANCEIROS (Aba 7) **
            Taxa_Juros_Curto_Prazo: 5, // % por rodada
            Taxa_Juros_Emergencia: 10, // % por rodada
            Taxa_Juros_Longo_Prazo: 3, // % por rodada
            Prazo_Fixo_Longo_Prazo: 4, // Em número de rodadas

            // Status Interno
            Status: 'Configurando', Rodada_Atual: 0,
        };
        // REMOVIDO: Taxa_Juros_Global (não existe mais)

        // Adiciona campos dinâmicos por rodada (Demanda, Pesos, Notícias)
        for (let i = 1; i <= 12; i++) { // Gera até a rodada 12, mesmo que o jogo tenha menos
            // Demanda (Aba 3)
            state[`Segmento1_Demanda_Rodada_${i}`] = (i === 1) ? 2000000 : 0;
            state[`Segmento2_Demanda_Rodada_${i}`] = (i === 1) ? 5000000 : 0;
            // Notícia (Aba 9 - Eventos)
            state[`Noticia_Rodada_${i}`] = (i === 1) ? 'Mercado otimista! A demanda inicial é alta nos dois segmentos.' : '';
            // Pesos Premium (Aba 8 - Atratividade)
            state[`Peso_PD_Premium_Rodada_${i}`] = 0.5; state[`Peso_Mkt_Premium_Rodada_${i}`] = 0.3; state[`Peso_Preco_Premium_Rodada_${i}`] = 0.2;
            // Pesos P&D (dentro do Premium) (Aba 8 - Atratividade)
            state[`Peso_PD_Camera_Premium_Rodada_${i}`] = 0.4; state[`Peso_PD_Bateria_Premium_Rodada_${i}`] = 0.3; state[`Peso_PD_IA_Premium_Rodada_${i}`] = 0.3;
            // Pesos Massa (Aba 8 - Atratividade)
            state[`Peso_Mkt_Massa_Rodada_${i}`] = 0.3; state[`Peso_Preco_Massa_Rodada_${i}`] = 0.7;
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
        mercado: `Segmentos: Defina os nomes dos dois grupos de clientes (ex: Premium, Massa).\nDemanda (por Rodada): Número total de unidades que o mercado busca em cada segmento, em cada rodada do jogo.`,
        setupInicial: `Define a situação inicial que será CLONADA para todas as empresas no início do jogo (Setup Simétrico). Valores financeiros em R$, Capacidade em Unidades, Níveis de P&D de 1 a 5. A 'Dívida LP Inicial' define o saldo inicial de Longo Prazo.`,
        custosInvestimento: `Define as 'regras' do jogo para investimentos:\nP&D: Quanto custa (R$) para evoluir CADA tecnologia para o próximo nível (Ex: Custo para ir do Nível 1 para o 2).\nExpansão: Custo (R$) para adicionar um 'lote' de capacidade e quantas unidades (Unid.) esse lote adiciona à fábrica NA PRÓXIMA RODADA.`,
        redeNegocios: `Defina as opções de fornecedores que os alunos poderão escolher (RF 2.2):\nDescrição: Texto que o aluno verá.\nCusto: Custo unitário (R$/Unid.) que impacta o CPV.\nParâmetros Especiais: Defina os bônus/riscos (ex: Bônus P&D em % para Fornecedor D).`,
        // ** NOVA AJUDA PARA FINANÇAS **
        financasTaxas: `Defina as taxas de juros POR RODADA e o prazo dos financiamentos:\n\nCurto Prazo (%): Taxa alta para capital de giro. Pago automaticamente na rodada seguinte.\n\nEmergência (%): Taxa PUNITIVA se a empresa não conseguir pagar o Curto Prazo. Também vence na rodada seguinte.\n\nLongo Prazo (%): Taxa menor para investimentos. O pagamento é automático em parcelas (Principal + Juros sobre saldo devedor).\n\nPrazo LP (Rodadas): Duração fixa (ex: 4 rodadas) para pagamento do Financiamento de Longo Prazo. O principal é dividido por este prazo para calcular a amortização por rodada.`,
        atratividade: `Define como o Market Share será calculado (RF 3.4) PARA CADA RODADA. Os pesos determinam a importância de cada fator (P&D, Marketing, Preço) na decisão de compra do cliente em cada segmento.\n- IMPORTANTE: Os pesos de cada seção (Premium, P&D Premium, Massa) DEVEM SOMAR 1.0 (ou 100%) para cada rodada.`,
        eventos: `Escreva as "Notícias de Mercado" que os alunos receberão no início de cada rodada futura (RF 4.5). Use isso para introduzir mudanças, desafios ou oportunidades (Ex: aumento de custo, nova tecnologia, mudança na demanda).`
    }), []); // Sem dependências, calculado uma vez

    // Definições de completude para as abas (ATUALIZADO)
    const abasConfig = useMemo(() => [
        { id: 'infoBasicas', titulo: '1. Básicas', keys: ['Nome_Simulacao', 'Total_Rodadas', 'Num_Empresas'], help: helpTexts.infoBasicas },
        { id: 'cenarioMacro', titulo: '2. Cenário', keys: ['Cenario_Inicial_Descricao', 'Taxa_Base_Inflacao'], help: helpTexts.cenarioMacro },
        { id: 'mercado', titulo: '3. Mercado', keys: ['Segmento1_Nome', `Segmento1_Demanda_Rodada_1`, 'Segmento2_Nome', `Segmento2_Demanda_Rodada_1`], help: helpTexts.mercado },
        { id: 'setupInicial', titulo: '4. Setup Inicial', keys: ['Caixa_Inicial', 'Capacidade_Producao_Inicial', 'Custo_Fixo_Operacional', 'Custo_Variavel_Montagem_Base'], help: helpTexts.setupInicial }, // Removido Divida_Inicial das keys obrigatórias (pode ser 0)
        { id: 'custosInvestimento', titulo: '5. Custos (P&D/Exp)', keys: [`Custo_PD_Camera_Nivel_2`, 'Custo_Expansao_Lote', 'Incremento_Capacidade_Lote'], help: helpTexts.custosInvestimento },
        { id: 'redeNegocios', titulo: '6. Custos (Rede)', keys: ['Fornecedor_Tela_A_Custo', 'Fornecedor_Tela_B_Custo', 'Fornecedor_Chip_C_Custo', 'Fornecedor_Chip_D_Custo'], help: helpTexts.redeNegocios },
        // ** NOVA ABA/SEÇÃO DE FINANÇAS **
        { id: 'financasTaxas', titulo: '7. Finanças (Taxas)', keys: ['Taxa_Juros_Curto_Prazo', 'Taxa_Juros_Emergencia', 'Taxa_Juros_Longo_Prazo', 'Prazo_Fixo_Longo_Prazo'], help: helpTexts.financasTaxas },
        { id: 'atratividade', titulo: '8. Pesos (Mercado)', keys: [`Peso_PD_Premium_Rodada_1`, `Peso_Mkt_Premium_Rodada_1`, `Peso_Preco_Premium_Rodada_1`, `Peso_Mkt_Massa_Rodada_1`, `Peso_Preco_Massa_Rodada_1`], help: helpTexts.atratividade },
        { id: 'eventos', titulo: '9. Eventos (Notícias)', keys: [], help: helpTexts.eventos } // Eventos não têm campos obrigatórios
    ], [helpTexts]); // Depende de helpTexts

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
                    // Sobrescreve com os dados salvos, fazendo a conversão de tipo se necessário
                    for (const key in fullInitialState) {
                        if (data.hasOwnProperty(key)) {
                            if (typeof fullInitialState[key] === 'number') {
                                // Trata null/undefined/'' como '', senão converte
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
    }, [isEditing, simulacaoId, db, simulacoesCollectionPath]); // initialState não é mais dependência direta

    // Handler genérico para mudanças nos inputs (inalterado)
    const handleParamChange = (e) => {
        const { id, value, name } = e.target;
        const key = id || name;
        // O valor recebido dos componentes mascarados JÁ É número ou ''
        // Para inputs type="number" normais, o value é string, mas será convertido no submit
        setParams(prev => ({ ...prev, [key]: value }));
    };

    // Funções para controlar o modal de ajuda (inalterado)
    const abrirModalAjuda = (titulo, texto) => { setModalAjudaConteudo({ titulo, texto }); setModalAjudaVisivel(true); };
    const fecharModalAjuda = () => setModalAjudaVisivel(false);

    // Verifica se os campos obrigatórios de uma seção foram preenchidos (inalterado)
    const checkCompletion = (sectionKeys, currentInitialState) => { // Aceita initialState como argumento
        if (!sectionKeys || sectionKeys.length === 0) return true; // Seção sem chaves é completa
        return sectionKeys.every(key => {
            const value = params[key];
            const isNumberField = typeof currentInitialState[key] === 'number'; // Verifica tipo original
            if (value === null || value === undefined) return false;
            // Para números, não pode ser '' e tem que ser número válido
            if (isNumberField) { return value !== '' && !isNaN(Number(value)); }
            // Para texto, não pode ser ''
            return value !== '';
        });
    };


    // Calcula quais abas estão completas (ATUALIZADO para incluir nova aba)
    const abasCompletas = useMemo(() => {
        // Garantindo que initialState está disponível
        const currentInitialState = getInitialState();
        return abasConfig.reduce((acc, aba) => {
             // Passa initialState para checkCompletion
            acc[aba.id] = checkCompletion(aba.keys, currentInitialState);
            return acc;
        }, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params, abasConfig]); // initialState removido das dependências diretas, pego via getInitialState

    // --- RF 1.6: Geração da Rodada 0 (ATUALIZADO) ---
    // Adiciona os novos campos de dívida ao estado inicial
    const gerarRodadaZero = async (simId, simParams) => {
        const batch = writeBatch(db);
        const numEmpresas = Number(simParams.Num_Empresas) || 6;
        const nomesEmpresas = ['Alpha', 'Nexus', 'Quantum', 'Orion', 'Sirius', 'Vega', 'Phoenix', 'Centauri', 'Lyra', 'Draco'].slice(0, numEmpresas);

        nomesEmpresas.forEach((nome) => {
            const empresaRef = doc(db, simulacoesCollectionPath, simId, 'empresas', nome);
            const estadoInicialRef = doc(db, simulacoesCollectionPath, simId, 'empresas', nome, 'estados', '0');
            batch.set(empresaRef, { Nome_Empresa: nome, Integrantes_Usuarios_IDs: [] });

            // Garante que Divida_Inicial e Prazo_Fixo_Longo_Prazo são números
            const dividaInicialLP = Number(simParams.Divida_Inicial) || 0;
            const prazoLP = Number(simParams.Prazo_Fixo_Longo_Prazo) || 4; // Default 4 se inválido

            const estadoInicial = {
                Rodada: 0,
                Caixa: Number(simParams.Caixa_Inicial) || 0,
                // ** NOVOS CAMPOS DE DÍVIDA **
                Divida_CP: 0,
                Divida_LP_Saldo: dividaInicialLP,
                Divida_LP_Rodadas_Restantes: dividaInicialLP > 0 ? prazoLP : 0,
                Divida_Emergencia: 0,
                // Campos financeiros e operacionais convertidos para número
                Imobilizado_Bruto: Number(simParams.Valor_Contabil_Imobilizado) || 0,
                Depreciacao_Acumulada: 0,
                Capacidade_Fabrica: Number(simParams.Capacidade_Producao_Inicial) || 0,
                Nivel_PD_Camera: Number(simParams.Nivel_Inicial_PD_Camera) || 1,
                Nivel_PD_Bateria: Number(simParams.Nivel_Inicial_PD_Bateria) || 1,
                Nivel_PD_IA: Number(simParams.Nivel_Inicial_PD_IA) || 1,
                Vendas_Receita: 0, Custo_Produtos_Vendidos: 0,
                Despesas_Operacionais: Number(simParams.Custo_Fixo_Operacional) || 0,
                Lucro_Bruto: 0,
                Lucro_Operacional: 0 - (Number(simParams.Custo_Fixo_Operacional) || 0),
                Lucro_Liquido: 0 - (Number(simParams.Custo_Fixo_Operacional) || 0),
                Progresso_PD_Camera: 0, Progresso_PD_Bateria: 0, Progresso_PD_IA: 0,
                Estoque_Final_Unidades: 0, Custo_Estoque_Final: 0,
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

        // Recria initialState dentro do handler para garantir acesso aos tipos corretos
        const currentInitialState = getInitialState();
        const dadosParaSalvar = Object.entries(params).reduce((acc, [key, value]) => {
            // Usa currentInitialState para verificar o tipo esperado
            const isNumericField = typeof currentInitialState[key] === 'number';
            if (isNumericField) {
                 acc[key] = Number(value) || 0; // Converte para número, default 0
            } else {
                acc[key] = value; // Mantém string
            }
             return acc;
        }, {});

        // Validação de soma dos pesos
        const totalRodadas = Number(dadosParaSalvar.Total_Rodadas) || 0;
        for (let i = 1; i <= totalRodadas; i++) {
            const somaPesosPremium = (dadosParaSalvar[`Peso_PD_Premium_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_Mkt_Premium_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_Preco_Premium_Rodada_${i}`] || 0);
            const somaPesosPDPremium = (dadosParaSalvar[`Peso_PD_Camera_Premium_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_PD_Bateria_Premium_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_PD_IA_Premium_Rodada_${i}`] || 0);
            const somaPesosMassa = (dadosParaSalvar[`Peso_Mkt_Massa_Rodada_${i}`] || 0) + (dadosParaSalvar[`Peso_Preco_Massa_Rodada_${i}`] || 0);
            if (Math.abs(somaPesosPremium - 1) > 0.01 || Math.abs(somaPesosPDPremium - 1) > 0.01 || Math.abs(somaPesosMassa - 1) > 0.01) {
                setErro(`Erro Rodada ${i}: Pesos devem somar 1.0.`); setLoading(false); setAbaAtiva('atratividade'); return;
            }
        }
        // Validações básicas
        if (totalRodadas <= 0 || totalRodadas > 12) { setErro("Rodadas entre 1 e 12."); setLoading(false); setAbaAtiva('infoBasicas'); return; }
        if (dadosParaSalvar.Num_Empresas <= 1 || dadosParaSalvar.Num_Empresas > 10) { setErro("Empresas entre 2 e 10."); setLoading(false); setAbaAtiva('infoBasicas'); return; }

        // ** VALIDAÇÃO ADICIONAL PARA NOVOS CAMPOS FINANCEIROS **
        if (dadosParaSalvar.Taxa_Juros_Curto_Prazo < 0 || dadosParaSalvar.Taxa_Juros_Emergencia < 0 || dadosParaSalvar.Taxa_Juros_Longo_Prazo < 0) {
            setErro("Taxas de juros não podem ser negativas."); setLoading(false); setAbaAtiva('financasTaxas'); return;
        }
        if (dadosParaSalvar.Prazo_Fixo_Longo_Prazo <= 0 || !Number.isInteger(dadosParaSalvar.Prazo_Fixo_Longo_Prazo) ) {
             setErro("Prazo LP deve ser inteiro positivo."); setLoading(false); setAbaAtiva('financasTaxas'); return;
        }


        try {
            let currentSimId = simulacaoId; // Renomeado para evitar conflito
             if (isEditing) {
                 const docRef = doc(db, simulacoesCollectionPath, currentSimId);
                 await setDoc(docRef, dadosParaSalvar, { merge: true });
                 console.log("Simulação atualizada.");
             } else {
                 const simulacoesCollection = collection(db, simulacoesCollectionPath);
                 const dadosIniciais = { ...dadosParaSalvar, Status: 'Configurando', CriadaEm: serverTimestamp(), Rodada_Atual: 0 };
                 const newSimDoc = await addDoc(simulacoesCollection, dadosIniciais);
                 currentSimId = newSimDoc.id; // Atribui o novo ID
                 console.log("Nova simulação criada:", currentSimId);
                 // Passa os dados convertidos para gerarRodadaZero
                 await gerarRodadaZero(currentSimId, dadosParaSalvar);
             }
             navigate('/simulador/admin'); // Redireciona após sucesso
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
                        <span onClick={(e) => { e.stopPropagation(); abrirModalAjuda(aba.titulo, aba.help); }} className="inline-block ml-1 cursor-pointer" aria-label={`Ajuda ${aba.titulo}`}> <IconeInfo /> </span>
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
                {/* Aba 4: Setup Inicial */}
                <div className={abaAtiva === 'setupInicial' ? 'block' : 'hidden'}> <AbaConteudo title="4. Setup Inicial (Simétrico)" isComplete={abasCompletas.setupInicial} helpText={helpTexts.setupInicial} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-6"> <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-gray-300 mb-2">Financeiro</h4> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <InputMoedaMasked id="Caixa_Inicial" label="Caixa (R$)" value={params.Caixa_Inicial} onChange={handleParamChange} required /> <InputMoedaMasked id="Divida_Inicial" label="Dívida LP Inicial (R$)" value={params.Divida_Inicial} onChange={handleParamChange} required /> <InputMoedaMasked id="Valor_Contabil_Imobilizado" label="Imobilizado (R$)" value={params.Valor_Contabil_Imobilizado} onChange={handleParamChange} required /> </div> </div> <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-gray-300 mb-2">Operações</h4> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <InputNumericoMasked id="Capacidade_Producao_Inicial" label="Capacidade" value={params.Capacidade_Producao_Inicial} onChange={handleParamChange} sufixo="Unid." required /> <InputMoedaMasked id="Custo_Fixo_Operacional" label="Custo Fixo/Rodada (R$)" value={params.Custo_Fixo_Operacional} onChange={handleParamChange} required /> <InputMoedaMasked id="Custo_Variavel_Montagem_Base" label="Custo Montagem (R$/Unid.)" value={params.Custo_Variavel_Montagem_Base} onChange={handleParamChange} required /> </div> </div> <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-gray-300 mb-2">P&D Inicial (Níveis 1-5)</h4> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <div><label className="text-xs">Câmera</label><input type="number" id="Nivel_Inicial_PD_Camera" value={params.Nivel_Inicial_PD_Camera} onChange={handleParamChange} min="1" max="5" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Bateria</label><input type="number" id="Nivel_Inicial_PD_Bateria" value={params.Nivel_Inicial_PD_Bateria} onChange={handleParamChange} min="1" max="5" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">IA</label><input type="number" id="Nivel_Inicial_PD_IA" value={params.Nivel_Inicial_PD_IA} onChange={handleParamChange} min="1" max="5" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </div> </div> </AbaConteudo> </div>
                {/* Aba 5: Custos P&D/Expansão */}
                <div className={abaAtiva === 'custosInvestimento' ? 'block' : 'hidden'}> <AbaConteudo title="5. Custos (P&D/Expansão)" isComplete={abasCompletas.custosInvestimento} helpText={helpTexts.custosInvestimento} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-6"> <div className="pt-4 border-t border-gray-700"> <h4 className="font-semibold text-gray-300 mb-2">Custos P&D (R$)</h4> {['Camera', 'Bateria', 'IA'].map(area => ( <div key={area} className="mb-4 last:mb-0"> <h5 className="text-md font-medium text-gray-400 mb-1">{area}</h5> <div className="grid grid-cols-2 md:grid-cols-4 gap-2"> {[2, 3, 4, 5].map(nivel => (<InputMoedaMasked key={`${area}-${nivel}`} id={`Custo_PD_${area}_Nivel_${nivel}`} label={`Custo p/ Nível ${nivel}`} value={params[`Custo_PD_${area}_Nivel_${nivel}`]} onChange={handleParamChange} required />))} </div> </div> ))} </div> <div className="pt-4 border-t border-gray-700"> <h4 className="font-semibold text-gray-300 mb-2">Custo Expansão Fábrica</h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <InputMoedaMasked id="Custo_Expansao_Lote" label="Custo por Lote (R$)" value={params.Custo_Expansao_Lote} onChange={handleParamChange} required /> <InputNumericoMasked id="Incremento_Capacidade_Lote" label="Capacidade/Lote" value={params.Incremento_Capacidade_Lote} onChange={handleParamChange} sufixo="Unid." required /> </div> </div> </div> </AbaConteudo> </div>
                {/* Aba 6: Rede de Negócios */}
                <div className={abaAtiva === 'redeNegocios' ? 'block' : 'hidden'}> <AbaConteudo title="6. Parâmetros Rede (Fornecedores)" isComplete={abasCompletas.redeNegocios} helpText={helpTexts.redeNegocios} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-6"> <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-gray-300 mb-2">Fornecedores de Tela</h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="space-y-2"> <label className="text-sm">Opção A (Transacional)</label> <input type="text" id="Fornecedor_Tela_A_Desc" value={params.Fornecedor_Tela_A_Desc} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_Tela_A_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_Tela_A_Custo} onChange={handleParamChange} required /> </div> <div className="space-y-2"> <label className="text-sm">Opção B (Relacional)</label> <input type="text" id="Fornecedor_Tela_B_Desc" value={params.Fornecedor_Tela_B_Desc} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_Tela_B_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_Tela_B_Custo} onChange={handleParamChange} required /> </div> </div> </div> <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-gray-300 mb-2">Fornecedores de Chip</h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="space-y-2"> <label className="text-sm">Opção C (Padrão)</label> <input type="text" id="Fornecedor_Chip_C_Desc" value={params.Fornecedor_Chip_C_Desc} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_Chip_C_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_Chip_C_Custo} onChange={handleParamChange} required /> </div> <div className="space-y-2"> <label className="text-sm">Opção D (Inovação)</label> <input type="text" id="Fornecedor_Chip_D_Desc" value={params.Fornecedor_Chip_D_Desc} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /> <div className="grid grid-cols-2 gap-4"> <InputMoedaMasked id="Fornecedor_Chip_D_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_Chip_D_Custo} onChange={handleParamChange} required /> <div><label className="text-xs">Bônus P&D (%)</label><input type="number" id="Fornecedor_Chip_D_Bonus_PD_Percent" value={params.Fornecedor_Chip_D_Bonus_PD_Percent} onChange={handleParamChange} min="0" max="100" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </div> </div> </div> </div> </AbaConteudo> </div>

                {/* ** NOVA ABA 7: Finanças (Taxas) ** */}
                <div className={abaAtiva === 'financasTaxas' ? 'block' : 'hidden'}>
                    <AbaConteudo title="7. Finanças (Taxas e Prazos)" isComplete={abasCompletas.financasTaxas} helpText={helpTexts.financasTaxas} onHelpClick={abrirModalAjuda}>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                             <div><label htmlFor="Taxa_Juros_Curto_Prazo" className="block text-xs font-medium text-gray-400 mb-1">Juros Curto Prazo (%/Rodada)</label><input type="number" id="Taxa_Juros_Curto_Prazo" value={params.Taxa_Juros_Curto_Prazo} onChange={handleParamChange} min="0" step="0.1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                             <div><label htmlFor="Taxa_Juros_Emergencia" className="block text-xs font-medium text-gray-400 mb-1">Juros Emergência (%/Rodada)</label><input type="number" id="Taxa_Juros_Emergencia" value={params.Taxa_Juros_Emergencia} onChange={handleParamChange} min="0" step="0.1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                             <div><label htmlFor="Taxa_Juros_Longo_Prazo" className="block text-xs font-medium text-gray-400 mb-1">Juros Longo Prazo (%/Rodada)</label><input type="number" id="Taxa_Juros_Longo_Prazo" value={params.Taxa_Juros_Longo_Prazo} onChange={handleParamChange} min="0" step="0.1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                             <div><label htmlFor="Prazo_Fixo_Longo_Prazo" className="block text-xs font-medium text-gray-400 mb-1">Prazo Fixo LP (Rodadas)</label><input type="number" id="Prazo_Fixo_Longo_Prazo" value={params.Prazo_Fixo_Longo_Prazo} onChange={handleParamChange} min="1" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div>
                        </div>
                    </AbaConteudo>
                </div>

                {/* Aba 8: Atratividade (Pesos) */}
                <div className={abaAtiva === 'atratividade' ? 'block' : 'hidden'}> <AbaConteudo title="8. Pesos Atratividade (Market Share)" isComplete={abasCompletas.atratividade} helpText={helpTexts.atratividade} onHelpClick={abrirModalAjuda}> <div className="mt-4 space-y-4 max-h-[400px] overflow-y-auto pr-2"> {Array.from({ length: Math.max(0, Number(params.Total_Rodadas) || 0) }, (_, i) => i + 1).map(r => ( <div key={`atr-${r}`} className="space-y-6 border-b border-gray-700 pb-4 mb-4 last:border-b-0"> <h4 className="font-semibold text-gray-300 text-lg">Rodada {r}</h4> <div className="p-4 bg-gray-900 rounded"><h5 className="font-semibold text-gray-300 mb-2">{params.Segmento1_Nome} (Soma=1.0)</h5><div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <div><label className="text-xs">Peso P&D</label><input type="number" name={`Peso_PD_Premium_Rodada_${r}`} value={params[`Peso_PD_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso Mkt</label><input type="number" name={`Peso_Mkt_Premium_Rodada_${r}`} value={params[`Peso_Mkt_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso Preço</label><input type="number" name={`Peso_Preco_Premium_Rodada_${r}`} value={params[`Peso_Preco_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div></div> <div className="p-4 bg-gray-900 rounded"><h5 className="font-semibold text-gray-300 mb-2">Pesos P&D (dentro Premium, Soma=1.0)</h5><div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <div><label className="text-xs">Peso Câmera</label><input type="number" name={`Peso_PD_Camera_Premium_Rodada_${r}`} value={params[`Peso_PD_Camera_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso Bateria</label><input type="number" name={`Peso_PD_Bateria_Premium_Rodada_${r}`} value={params[`Peso_PD_Bateria_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso IA</label><input type="number" name={`Peso_PD_IA_Premium_Rodada_${r}`} value={params[`Peso_PD_IA_Premium_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div></div> <div className="p-4 bg-gray-900 rounded"><h4 className="font-semibold text-gray-300 mb-2">{params.Segmento2_Nome} (Soma=1.0)</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <div><label className="text-xs">Peso Mkt</label><input type="number" name={`Peso_Mkt_Massa_Rodada_${r}`} value={params[`Peso_Mkt_Massa_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Peso Preço</label><input type="number" name={`Peso_Preco_Massa_Rodada_${r}`} value={params[`Peso_Preco_Massa_Rodada_${r}`]} onChange={handleParamChange} min="0" max="1" step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div></div> </div></div> </div> ))} </div> </AbaConteudo> </div>
                {/* Aba 9: Eventos (Notícias) */}
                <div className={abaAtiva === 'eventos' ? 'block' : 'hidden'}> <AbaConteudo title="9. Eventos de Mercado (Notícias)" isComplete={abasCompletas.eventos} helpText={helpTexts.eventos} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-4 max-h-[400px] overflow-y-auto pr-2"> {Array.from({ length: Math.max(0, Number(params.Total_Rodadas) || 0) }, (_, i) => i + 1).map(r => ( <div key={`noticia-${r}`}> <label htmlFor={`Noticia_Rodada_${r}`} className="block text-sm font-medium text-gray-400 mb-1">Notícia Início Rodada {r}</label> <textarea id={`Noticia_Rodada_${r}`} name={`Noticia_Rodada_${r}`} value={params[`Noticia_Rodada_${r}`]} onChange={handleParamChange} rows="3" className="w-full bg-gray-700 p-3 rounded-lg" placeholder={`O que acontecerá no início da Rodada ${r}?`} /> </div> ))} </div> </AbaConteudo> </div>

                {/* Botões Finais */}
                <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-700"> <button type="button" onClick={() => navigate('/simulador/admin')} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-6 rounded-lg" disabled={loading}> Cancelar </button> <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-6 rounded-lg" disabled={loading}> {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar e Iniciar Simulação')} </button> </div>
            </form>

            {/* Modal de Ajuda */}
            {modalAjudaVisivel && ( <ModalAjuda titulo={modalAjudaConteudo.titulo} texto={modalAjudaConteudo.texto} onClose={fecharModalAjuda} /> )}
        </div>
    );
}

export default SimuladorForm;

