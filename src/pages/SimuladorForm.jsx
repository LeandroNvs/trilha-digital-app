import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, writeBatch, getDocs } from 'firebase/firestore';
import { db, appId } from '../firebase/config';

// --- Ícones ---
const IconeInfo = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block ml-1 text-gray-400 hover:text-cyan-400 cursor-pointer" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>;
const IconeCheck = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block ml-2 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const IconeClose = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const IconeAlert = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconeSuccess = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;

// --- Componente Modal de Ajuda ---
function ModalAjuda({ titulo, texto, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in" style={{ zIndex: 9999 }}> 
            <div className="bg-gray-700 rounded-lg shadow-xl p-6 max-w-lg w-full relative border border-gray-600"> 
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white" aria-label="Fechar ajuda"><IconeClose /></button> 
                <h3 className="text-xl font-bold text-cyan-400 mb-4">{titulo}</h3> 
                <div className="text-gray-300 whitespace-pre-wrap space-y-2 text-sm"> {texto.split('\n').map((paragrafo, index) => <p key={index}>{paragrafo}</p>)} </div> 
                <button onClick={onClose} className="mt-6 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg float-right"> Entendido </button> 
            </div> 
        </div>
     );
}

// --- Componente Abas ---
function AbaConteudo({ title, children, isComplete, helpText, onHelpClick }) {
    const borderColor = isComplete ? 'border-green-500/30' : 'border-gray-600';
    const legendColor = isComplete ? 'text-green-400' : 'text-gray-300';
    
    return (
        <fieldset className={`border p-4 rounded-lg transition-colors ${borderColor}`}> 
            <legend className={`text-lg font-semibold px-2 flex items-center ${legendColor}`}> 
                {title} 
                <span onClick={(e) => { e.stopPropagation(); onHelpClick(title, helpText); }} className="inline-block ml-1 cursor-pointer text-gray-400 hover:text-cyan-400" aria-label={`Ajuda sobre ${title}`}> <IconeInfo /> </span> 
                {isComplete && <IconeCheck />} 
            </legend> 
            {children} 
        </fieldset>
    );
}

// --- Inputs ---
const InputMoedaMasked = ({ id, label, value: externalValue, onChange, disabled = false, required = false, ...props }) => {
    const [displayValue, setDisplayValue] = useState('');
    const formatBRL = (num) => { if (num === null || num === undefined || num === '' || isNaN(Number(num))) return ''; const number = Number(num); return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }); };
    useEffect(() => { setDisplayValue(formatBRL(externalValue)); }, [externalValue]);
    const handleChange = (e) => { const inputVal = e.target.value; const numericString = inputVal.replace(/\D/g, ''); let numberValue = ''; if (numericString !== '') { const parsedNum = parseInt(numericString, 10); if (!isNaN(parsedNum)) { numberValue = parsedNum; } } setDisplayValue(formatBRL(numberValue)); if (onChange) { onChange({ target: { id: id || props.name, name: props.name || id, value: numberValue, type: 'number' } }); } };
    return ( <div> <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1">{label} {required && <span className="text-red-400">*</span>}</label> <div className="relative"> <input type="text" inputMode="numeric" id={id} name={props.name || id} value={displayValue} onChange={handleChange} className={`w-full bg-gray-700 p-2 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="R$ 0" disabled={disabled} {...props} /> </div> </div> );
};

const InputNumericoMasked = ({ id, label, value: externalValue, onChange, sufixo = '', disabled = false, required = false, ...props }) => {
    const [displayValue, setDisplayValue] = useState('');
    const formatNumber = (num) => { if (num === null || num === undefined || num === '' || isNaN(Number(num))) return ''; const number = Number(num); return number.toLocaleString('pt-BR'); };
    useEffect(() => { setDisplayValue(formatNumber(externalValue)); }, [externalValue]);
    const handleChange = (e) => { const inputVal = e.target.value; const numericString = inputVal.replace(/\D/g, ''); let numberValue = ''; if (numericString !== '') { const parsedNum = parseInt(numericString, 10); if (!isNaN(parsedNum)) { numberValue = parsedNum; } } setDisplayValue(formatNumber(numberValue)); if (onChange) { onChange({ target: { id: id || props.name, name: props.name || id, value: numberValue, type: 'number' } }); } };
    return ( <div> <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1">{label} {required && <span className="text-red-400">*</span>}</label> <div className="relative"> <input type="text" inputMode="numeric" id={id} name={props.name || id} value={displayValue} onChange={handleChange} className={`w-full bg-gray-700 p-2 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none ${sufixo ? 'pr-10 md:pr-12' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="0" disabled={disabled} {...props} /> {sufixo && <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm pointer-events-none">{sufixo}</span>} </div> </div> );
};


function SimuladorForm() {
    const { simulacaoId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState(''); // Estado para feedback de sucesso
    const [modalAjudaVisivel, setModalAjudaVisivel] = useState(false);
    const [modalAjudaConteudo, setModalAjudaConteudo] = useState({ titulo: '', texto: '' });
    const [abaAtiva, setAbaAtiva] = useState('infoBasicas');

    const getInitialState = () => {
        const state = {
            // Aba 1: Básicas
            Nome_Simulacao: '', Total_Rodadas: 6, Num_Empresas: 6,
            // Aba 2: Cenário
            Cenario_Inicial_Descricao: 'Bem-vindos à Guerra dos Ecossistemas Móveis!...', Taxa_Base_Inflacao: 3,
            // Aba 3: Mercado
            Segmento1_Nome: 'Premium', Segmento2_Nome: 'Básico',
            // Aba 4: Setup Inicial
            Tipo_Setup: 'Simetrico', Caixa_Inicial: 200000000, Divida_Inicial: 0, 
            Valor_Contabil_Imobilizado: 100000000, Capacidade_Producao_Inicial: 1000000,
            Custo_Fixo_Operacional: 20000000, Custo_Variavel_Montagem_Base: 120,
            Nivel_Inicial_PD_Camera: 1, Nivel_Inicial_PD_Bateria: 1, 
            Nivel_Inicial_PD_Sist_Operacional_e_IA: 1,
            Nivel_Inicial_PD_Atualizacao_Geral: 1,
            Nivel_Inicial_Capacitacao: 1, Nivel_Inicial_Qualidade: 1, Nivel_Inicial_ESG: 1,
            // Aba 5: Custos P&D/Expansão
            Custo_PD_Camera_Nivel_2: 30000000, Custo_PD_Camera_Nivel_3: 50000000, Custo_PD_Camera_Nivel_4: 80000000, Custo_PD_Camera_Nivel_5: 120000000,
            Custo_PD_Bateria_Nivel_2: 25000000, Custo_PD_Bateria_Nivel_3: 45000000, Custo_PD_Bateria_Nivel_4: 70000000, Custo_PD_Bateria_Nivel_5: 110000000,
            Custo_PD_Sist_Operacional_e_IA_Nivel_2: 40000000, Custo_PD_Sist_Operacional_e_IA_Nivel_3: 60000000, Custo_PD_Sist_Operacional_e_IA_Nivel_4: 90000000, Custo_PD_Sist_Operacional_e_IA_Nivel_5: 140000000,
            Custo_PD_Atualizacao_Geral_Nivel_2: 20000000, Custo_PD_Atualizacao_Geral_Nivel_3: 35000000, Custo_PD_Atualizacao_Geral_Nivel_4: 55000000, Custo_PD_Atualizacao_Geral_Nivel_5: 80000000,
            Custo_Expansao_Lote: 10000000, Incremento_Capacidade_Lote: 100000,
            // Aba 6: Rede de Negócios
            Fornecedor_S1_Tela_A_Desc: 'Fornecedor S1-A (Transacional)...', Fornecedor_S1_Tela_A_Custo: 50,
            Fornecedor_S1_Tela_B_Desc: 'Fornecedor S1-B (Relacional)...', Fornecedor_S1_Tela_B_Custo: 70,
            Fornecedor_S1_Chip_C_Desc: 'Fornecedor S1-C (Padrão)...', Fornecedor_S1_Chip_C_Custo: 80,
            Fornecedor_S1_Chip_D_Desc: 'Fornecedor S1-D (Inovação)...', Fornecedor_S1_Chip_D_Custo: 95, Fornecedor_S1_Chip_D_Bonus_PD_Percent: 10,
            Fornecedor_S2_Tela_A_Desc: 'Fornecedor S2-A (Transacional)...', Fornecedor_S2_Tela_A_Custo: 50,
            Fornecedor_S2_Tela_B_Desc: 'Fornecedor S2-B (Relacional)...', Fornecedor_S2_Tela_B_Custo: 70,
            Fornecedor_S2_Chip_C_Desc: 'Fornecedor S2-C (Padrão)...', Fornecedor_S2_Chip_C_Custo: 80,
            Fornecedor_S2_Chip_D_Desc: 'Fornecedor S2-D (Inovação)...', Fornecedor_S2_Chip_D_Custo: 95, Fornecedor_S2_Chip_D_Bonus_PD_Percent: 10,
            // Aba 7: Finanças
            Taxa_Juros_Curto_Prazo: 5, Taxa_Juros_Emergencia: 10, Taxa_Juros_Longo_Prazo: 3, Prazo_Fixo_Longo_Prazo: 4, 
            Limite_CP_Percent_Ativo_Circulante: 50, Limite_LP_Percent_Patrimonio_Liquido: 100,
            // Aba 8: Pesos Ranking IDG
            Peso_IDG_Lucro: 0.30, Peso_IDG_Share: 0.25, Peso_IDG_PD: 0.20, Peso_IDG_Saude_Financeira: 0.25,
            // Aba 9: Orçamento Organizacional
            Orcamento_Organizacional_Por_Rodada: 20000000,
            Custo_Nivel_Capacitacao_2: 15000000, Custo_Nivel_Capacitacao_3: 25000000, Custo_Nivel_Capacitacao_4: 40000000, Custo_Nivel_Capacitacao_5: 60000000,
            Reducao_Custo_Montagem_Por_Nivel_Capacitacao_Percent: 2,
            Custo_Nivel_Qualidade_2: 15000000, Custo_Nivel_Qualidade_3: 25000000, Custo_Nivel_Qualidade_4: 40000000, Custo_Nivel_Qualidade_5: 60000000,
            Custo_Nivel_ESG_2: 10000000, Custo_Nivel_ESG_3: 20000000, Custo_Nivel_ESG_4: 30000000, Custo_Nivel_ESG_5: 45000000,
            // Status Interno
            Status: 'Configurando', Rodada_Atual: 0,
        };
        for (let i = 1; i <= 12; i++) {
            state[`Segmento1_Demanda_Rodada_${i}`] = (i === 1) ? 2000000 : 0;
            state[`Segmento2_Demanda_Rodada_${i}`] = (i === 1) ? 5000000 : 0;
            state[`Noticia_Rodada_${i}`] = (i === 1) ? 'Mercado otimista!' : '';
            state[`Peso_PD_Premium_Rodada_${i}`] = 0.5; state[`Peso_Mkt_Premium_Rodada_${i}`] = 0.3; state[`Peso_Preco_Premium_Rodada_${i}`] = 0.2;
            state[`Peso_Qualidade_Premium_Rodada_${i}`] = 0.0; state[`Peso_ESG_Premium_Rodada_${i}`] = 0.0;
            state[`Peso_PD_Camera_Premium_Rodada_${i}`] = 0.4; state[`Peso_PD_Bateria_Premium_Rodada_${i}`] = 0.3; state[`Peso_PD_Sist_Operacional_e_IA_Premium_Rodada_${i}`] = 0.3;
            state[`Peso_PD_Massa_Rodada_${i}`] = 0.2; state[`Peso_Mkt_Massa_Rodada_${i}`] = 0.3; state[`Peso_Preco_Massa_Rodada_${i}`] = 0.5;
            state[`Peso_Qualidade_Massa_Rodada_${i}`] = 0.0; state[`Peso_ESG_Massa_Rodada_${i}`] = 0.0;
        }
        return state;
    };

    const initialState = useMemo(() => getInitialState(), []);
    const [params, setParams] = useState(initialState);
    const isEditing = Boolean(simulacaoId);
    const simulacoesCollectionPath = `/artifacts/${appId}/public/data/simulacoes`;

    const helpTexts = useMemo(() => ({
        infoBasicas: `Nome: Identificador da simulação (ex: Turma X - 2025).\nRodadas: Duração total do jogo (1 a 12).\nEmpresas: Número de equipes competidoras (2 a 10).`,
        cenarioMacro: `Briefing: Texto que será apresentado aos alunos no início do jogo.\nInflação (%): Taxa ANUAL usada pelo simulador para reajustar custos fixos e variáveis a cada rodada (dividida por 4). Ex: 3% ao ano = 0.75% por rodada.`,
        mercado: `Segmentos: Defina os nomes dos dois grupos de clientes (ex: Premium, Básico).\nDemanda (por Rodada): Número total de unidades que o mercado busca em cada segmento, em cada rodada do jogo.`,
        setupInicial: `Define a situação inicial que será CLONADA para todas as empresas no início do jogo (Setup Simétrico). Valores financeiros em R$, Capacidade em Unidades, Níveis de P&D de 1 a 5. A 'Dívida LP Inicial' define o saldo inicial de Longo Prazo.`,
        custosInvestimento: `Define as 'regras' do jogo para investimentos:\nP&D: Custo TOTAL ACUMULADO (R$) para atingir CADA nível (Ex: Custo total para chegar ao Nível 2).\nExpansão: Custo (R$) para adicionar um 'lote' de capacidade e quantas unidades (Unid.) esse lote adiciona à fábrica NA PRÓXIMA RODADA.`,
        redeNegocios: `Defina as opções de fornecedores que os alunos poderão escolher. Agora você deve configurar os 4 fornecedores (A, B, C, D) para CADA SEGMENTO (S1 e S2).`,
        financasTaxas: `Defina as taxas de juros POR RODADA, o prazo dos financiamentos e os LIMITES de alavancagem.`,
        atratividade: (params) => `Define como o Market Share será calculado (RF 3.4) PARA CADA RODADA.`,
        rankingIDG: `Define os pesos do Ranking Final (IDG - Índice de Desempenho Global).`,
        orcamentoOrganizacional: `Define o "Orçamento Organizacional" (RF 5.1). Este é um TETO de gastos POR RODADA.`,
        eventos: `Escreva as "Notícias de Mercado" que os alunos receberão no início de cada rodada futura (RF 4.5).`
    }), []);

    const abasConfig = useMemo(() => [
        { id: 'infoBasicas', titulo: '1. Básicas', keys: ['Nome_Simulacao', 'Total_Rodadas', 'Num_Empresas'], help: helpTexts.infoBasicas },
        { id: 'cenarioMacro', titulo: '2. Cenário', keys: ['Cenario_Inicial_Descricao', 'Taxa_Base_Inflacao'], help: helpTexts.cenarioMacro },
        { id: 'mercado', titulo: '3. Mercado', keys: ['Segmento1_Nome', `Segmento1_Demanda_Rodada_1`, 'Segmento2_Nome', `Segmento2_Demanda_Rodada_1`], help: helpTexts.mercado },
        { id: 'setupInicial', titulo: '4. Setup Inicial', keys: ['Caixa_Inicial', 'Capacidade_Producao_Inicial', 'Custo_Fixo_Operacional', 'Custo_Variavel_Montagem_Base'], help: helpTexts.setupInicial },
        { id: 'custosInvestimento', titulo: '5. Custos (P&D/Exp)', keys: [`Custo_PD_Camera_Nivel_2`, 'Custo_Expansao_Lote', 'Incremento_Capacidade_Lote', 'Custo_PD_Atualizacao_Geral_Nivel_2'], help: helpTexts.custosInvestimento },
        { id: 'redeNegocios', titulo: '6. Custos (Rede)', keys: ['Fornecedor_S1_Tela_A_Custo', 'Fornecedor_S1_Chip_C_Custo', 'Fornecedor_S2_Tela_A_Custo', 'Fornecedor_S2_Chip_C_Custo'], help: helpTexts.redeNegocios },
        { id: 'financasTaxas', titulo: '7. Finanças', keys: ['Taxa_Juros_Curto_Prazo', 'Taxa_Juros_Emergencia', 'Taxa_Juros_Longo_Prazo', 'Prazo_Fixo_Longo_Prazo', 'Limite_CP_Percent_Ativo_Circulante', 'Limite_LP_Percent_Patrimonio_Liquido'], help: helpTexts.financasTaxas },
        { id: 'atratividade', titulo: '8. Pesos', keys: [`Peso_PD_Premium_Rodada_1`, 'Peso_IDG_Lucro'], help: helpTexts.atratividade },
        { id: 'orcamentoOrganizacional', titulo: '9. Orçamento Org.', keys: ['Orcamento_Organizacional_Por_Rodada', 'Custo_Nivel_Capacitacao_2', 'Custo_Nivel_Qualidade_2', 'Custo_Nivel_ESG_2', 'Reducao_Custo_Montagem_Por_Nivel_Capacitacao_Percent'], help: helpTexts.orcamentoOrganizacional },
        { id: 'eventos', titulo: '10. Eventos', keys: [], help: helpTexts.eventos }
    ], [helpTexts, params]);

    useEffect(() => {
        const fullInitialState = getInitialState();
        if (isEditing && db) {
            setLoading(true);
            getDoc(doc(db, simulacoesCollectionPath, simulacaoId)).then(docSnap => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const mergedData = { ...fullInitialState };
                    for (const key in fullInitialState) {
                        if (data.hasOwnProperty(key)) {
                            mergedData[key] = (typeof fullInitialState[key] === 'number' && (data[key] === null || data[key] === undefined || data[key] === '')) ? '' : data[key];
                        }
                    }
                    setParams(mergedData);
                } else { setErro("Simulação não encontrada."); }
                setLoading(false);
            }).catch(err => { console.error(err); setErro("Erro ao carregar dados."); setLoading(false); });
        } else if (!isEditing) { setParams(fullInitialState); }
    }, [isEditing, simulacaoId, db, simulacoesCollectionPath]);

    const handleParamChange = (e) => {
        const { id, value, name } = e.target;
        const key = id || name;
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const abrirModalAjuda = (titulo, texto) => { setModalAjudaConteudo({ titulo, texto }); setModalAjudaVisivel(true); };
    const fecharModalAjuda = () => setModalAjudaVisivel(false);

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

    const abasCompletas = useMemo(() => {
        const currentInitialState = getInitialState();
        return abasConfig.reduce((acc, aba) => {
            acc[aba.id] = checkCompletion(aba.keys, currentInitialState);
            return acc;
        }, {});
    }, [params, abasConfig]);

    const atualizarEstadoZeroEmpresas = async (simId, simParams) => {
        const empresasRef = collection(db, simulacoesCollectionPath, simId, 'empresas');
        const snapshot = await getDocs(empresasRef);
        const batch = writeBatch(db);
        snapshot.docs.forEach(docEmpresa => {
            const estadoRef = doc(db, simulacoesCollectionPath, simId, 'empresas', docEmpresa.id, 'estados', '0');
            const dividaInicialLP = Number(simParams.Divida_Inicial) || 0;
            const prazoLP = Number(simParams.Prazo_Fixo_Longo_Prazo) || 4;
            const atualizacao = {
                Caixa: Number(simParams.Caixa_Inicial) || 0,
                Divida_CP: 0, Divida_LP_Saldo: dividaInicialLP, Divida_LP_Rodadas_Restantes: dividaInicialLP > 0 ? prazoLP : 0,
                Imobilizado_Bruto: Number(simParams.Valor_Contabil_Imobilizado) || 0,
                Capacidade_Fabrica: Number(simParams.Capacidade_Producao_Inicial) || 0,
                Nivel_PD_Camera: Number(simParams.Nivel_Inicial_PD_Camera) || 1,
                Nivel_PD_Bateria: Number(simParams.Nivel_Inicial_PD_Bateria) || 1,
                Nivel_PD_Sist_Operacional_e_IA: Number(simParams.Nivel_Inicial_PD_Sist_Operacional_e_IA) || 1,
                Nivel_PD_Atualizacao_Geral: Number(simParams.Nivel_Inicial_PD_Atualizacao_Geral) || 1,
                Nivel_Capacitacao: Number(simParams.Nivel_Inicial_Capacitacao) || 1,
                Nivel_Qualidade: Number(simParams.Nivel_Inicial_Qualidade) || 1,
                Nivel_ESG: Number(simParams.Nivel_Inicial_ESG) || 1,
                Despesas_Operacionais_Outras: Number(simParams.Custo_Fixo_Operacional) || 0,
                Lucro_Operacional_EBIT: 0 - (Number(simParams.Custo_Fixo_Operacional) || 0),
                Lucro_Liquido: 0 - (Number(simParams.Custo_Fixo_Operacional) || 0),
                Estoque_S1_Unidades: 0, Custo_Estoque_S1: 0,
                Estoque_S2_Unidades: 0, Custo_Estoque_S2: 0
            };
            batch.set(estadoRef, atualizacao, { merge: true });
        });
        await batch.commit();
    };

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
                Divida_CP: 0, Divida_LP_Saldo: dividaInicialLP, Divida_LP_Rodadas_Restantes: dividaInicialLP > 0 ? prazoLP : 0, Divida_Emergencia: 0,
                Imobilizado_Bruto: Number(simParams.Valor_Contabil_Imobilizado) || 0, Depreciacao_Acumulada: 0, Capacidade_Fabrica: Number(simParams.Capacidade_Producao_Inicial) || 0,
                Nivel_PD_Camera: Number(simParams.Nivel_Inicial_PD_Camera) || 1, Nivel_PD_Bateria: Number(simParams.Nivel_Inicial_PD_Bateria) || 1,
                Nivel_PD_Sist_Operacional_e_IA: Number(simParams.Nivel_Inicial_PD_Sist_Operacional_e_IA) || 1, Nivel_PD_Atualizacao_Geral: Number(simParams.Nivel_Inicial_PD_Atualizacao_Geral) || 1,
                Progresso_PD_Camera: 0, Progresso_PD_Bateria: 0, Progresso_PD_Sist_Operacional_e_IA: 0, Progresso_PD_Atualizacao_Geral: 0,
                Nivel_Qualidade: Number(simParams.Nivel_Inicial_Qualidade) || 1, Nivel_Capacitacao: Number(simParams.Nivel_Inicial_Capacitacao) || 1, Nivel_ESG: Number(simParams.Nivel_Inicial_ESG) || 1,
                Progresso_Qualidade: 0, Progresso_Capacitacao: 0, Progresso_ESG: 0,
                Vendas_Receita: 0, Custo_Produtos_Vendidos: 0, Despesas_Operacionais_Outras: Number(simParams.Custo_Fixo_Operacional) || 0,
                Despesas_Juros_CP: 0, Despesas_Juros_Emergencia: 0, Despesas_Juros_LP: 0, Despesas_Organiz_Capacitacao: 0, Despesas_Organiz_Mkt_Institucional: 0, Despesas_Organiz_ESG: 0,
                Lucro_Bruto: 0, Lucro_Operacional_EBIT: 0 - (Number(simParams.Custo_Fixo_Operacional) || 0), Lucro_Liquido: 0 - (Number(simParams.Custo_Fixo_Operacional) || 0),
                Estoque_S1_Unidades: 0, Custo_Estoque_S1: 0, Estoque_S2_Unidades: 0, Custo_Estoque_S2: 0,
                Lucro_Acumulado: 0, Valor_Marca_Acumulado: 0, IDG_Score: 0, IDG_Metricas: {}
            };
            batch.set(estadoInicialRef, estadoInicial);
        });
        const simRef = doc(db, simulacoesCollectionPath, simId);
        batch.update(simRef, { Status: 'Ativa - Rodada 1', Rodada_Atual: 0 });
        await batch.commit();
    };

    // --- VALIDAÇÃO E SUBMISSÃO CENTRALIZADA ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db) { setErro("Erro de conexão."); return; }
        setLoading(true); setErro(''); setSucesso('');

        // 1. Validação de Abas (Verifica campos ocultos)
        const abasComErro = [];
        const currentInitialState = getInitialState();
        for (const aba of abasConfig) {
            if (!checkCompletion(aba.keys, currentInitialState)) {
                abasComErro.push(aba.titulo);
            }
        }

        if (abasComErro.length > 0) {
            const msgErro = `Por favor, preencha os campos obrigatórios nas seguintes abas: ${abasComErro.join(', ')}`;
            setErro(msgErro);
            const primeiraErroId = abasConfig.find(a => a.titulo === abasComErro[0])?.id;
            if (primeiraErroId) setAbaAtiva(primeiraErroId);
            window.scrollTo(0, 0);
            setLoading(false);
            return;
        }

        // 2. Validação de Pesos IDG
        const dadosParaSalvar = Object.entries(params).reduce((acc, [key, value]) => {
            const isNumeric = typeof currentInitialState[key] === 'number';
            acc[key] = isNumeric ? (Number(value) || 0) : value;
            return acc;
        }, {});

        const somaIDG = (dadosParaSalvar.Peso_IDG_Lucro || 0) + (dadosParaSalvar.Peso_IDG_Share || 0) + (dadosParaSalvar.Peso_IDG_PD || 0) + (dadosParaSalvar.Peso_IDG_Saude_Financeira || 0);
        if (Math.abs(somaIDG - 1) > 0.01) {
            setErro(`Erro IDG: A soma dos pesos deve ser 1.0 (Atual: ${somaIDG.toFixed(2)}). Verifique a aba '8. Pesos'.`);
            setAbaAtiva('atratividade');
            setLoading(false);
            return;
        }

        try {
            let currentSimId = simulacaoId;
             if (isEditing) {
                 const docRef = doc(db, simulacoesCollectionPath, currentSimId);
                 await setDoc(docRef, dadosParaSalvar, { merge: true });
                 
                 if (dadosParaSalvar.Rodada_Atual === 0) {
                    await atualizarEstadoZeroEmpresas(currentSimId, dadosParaSalvar);
                 }
             } else {
                 const simulacoesCollection = collection(db, simulacoesCollectionPath);
                 const dadosIniciais = { ...dadosParaSalvar, Status: 'Configurando', CriadaEm: serverTimestamp(), Rodada_Atual: 0 };
                 const newSimDoc = await addDoc(simulacoesCollection, dadosIniciais);
                 currentSimId = newSimDoc.id;
                 await gerarRodadaZero(currentSimId, dadosParaSalvar);
             }
             
             // Feedback de Sucesso e Reset de Loading
             setSucesso("Simulação salva com sucesso! Você pode continuar editando.");
             setLoading(false);
             setTimeout(() => setSucesso(''), 3000);
             
        } catch (err) {
            console.error("Erro ao salvar:", err); setErro(`Falha ao salvar: ${err.message}`); setLoading(false);
        }
    };

    return (
        <div className="bg-gray-800 shadow-lg rounded-xl p-6 md:p-8 animate-fade-in max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6"> <h2 className="text-xl md:text-2xl font-bold text-cyan-400"> {isEditing ? `Editando: ${params.Nome_Simulacao || '...'}` : 'Criar Nova Simulação'} </h2> <button onClick={() => navigate('/simulador/admin')} className="text-sm text-cyan-400 hover:underline"> &larr; Voltar </button> </div>
            
            {/* --- FEEDBACK DE ERRO --- */}
            {erro && (
                <div className="bg-red-900/50 border-l-4 border-red-500 p-4 mb-6 rounded shadow-md flex items-start animate-pulse">
                    <IconeAlert />
                    <span className="text-red-100 font-medium text-sm">{erro}</span>
                </div>
            )}

            {/* --- FEEDBACK DE SUCESSO --- */}
            {sucesso && (
                <div className="bg-green-900/50 border-l-4 border-green-500 p-4 mb-6 rounded shadow-md flex items-start animate-fade-in">
                    <IconeSuccess />
                    <span className="text-green-100 font-medium text-sm">{sucesso}</span>
                </div>
            )}

            <nav className="flex flex-wrap justify-center bg-gray-700 rounded-lg p-2 mb-6 gap-2 text-sm">
                {abasConfig.map(aba => (
                    <button key={aba.id} type="button" onClick={() => setAbaAtiva(aba.id)}
                        className={`flex items-center px-2 py-1 md:px-3 md:py-2 rounded-md font-semibold flex-grow transition-colors whitespace-nowrap ${abaAtiva === aba.id ? 'bg-cyan-500 text-white' : 'bg-gray-800 hover:bg-gray-600 text-gray-300'}`}>
                        {aba.titulo} {abasCompletas[aba.id] && <IconeCheck />}
                        <span onClick={(e) => { e.stopPropagation(); abrirModalAjuda(aba.titulo, typeof aba.help === 'function' ? aba.help(params) : aba.help); }} className="inline-block ml-1 cursor-pointer" aria-label={`Ajuda ${aba.titulo}`}> <IconeInfo /> </span>
                    </button>
                ))}
            </nav>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Conteúdo das Abas (Mantido igual) */}
                <div className={abaAtiva === 'infoBasicas' ? 'block' : 'hidden'}> <AbaConteudo title="1. Informações Básicas" isComplete={abasCompletas.infoBasicas} helpText={helpTexts.infoBasicas} onHelpClick={abrirModalAjuda}> <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2"> <div><label htmlFor="Nome_Simulacao" className="block text-sm font-medium text-gray-400 mb-1">Nome</label><input type="text" id="Nome_Simulacao" value={params.Nome_Simulacao} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label htmlFor="Total_Rodadas" className="block text-sm font-medium text-gray-400 mb-1">Rodadas</label><input type="number" id="Total_Rodadas" value={params.Total_Rodadas} onChange={handleParamChange} min="1" max="12" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label htmlFor="Num_Empresas" className="block text-sm font-medium text-gray-400 mb-1">Empresas</label><input type="number" id="Num_Empresas" value={params.Num_Empresas} onChange={handleParamChange} min="2" max="10" step="1" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </AbaConteudo> </div>
                <div className={abaAtiva === 'cenarioMacro' ? 'block' : 'hidden'}> <AbaConteudo title="2. Cenário Macro" isComplete={abasCompletas.cenarioMacro} helpText={helpTexts.cenarioMacro} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-4"> <div><label htmlFor="Cenario_Inicial_Descricao" className="block text-sm font-medium text-gray-400 mb-1">Briefing</label><textarea id="Cenario_Inicial_Descricao" value={params.Cenario_Inicial_Descricao} onChange={handleParamChange} rows="5" className="w-full bg-gray-700 p-3 rounded-lg"></textarea></div> <div><label htmlFor="Taxa_Base_Inflacao" className="block text-sm font-medium text-gray-400 mb-1">Inflação Base Anual (%)</label><input type="number" id="Taxa_Base_Inflacao" value={params.Taxa_Base_Inflacao} onChange={handleParamChange} min="0" step="0.1" className="w-full md:w-1/3 bg-gray-700 p-2 rounded-lg" required /></div> </div> </AbaConteudo> </div>
                <div className={abaAtiva === 'mercado' ? 'block' : 'hidden'}> <AbaConteudo title="3. Mercado" isComplete={abasCompletas.mercado} helpText={helpTexts.mercado} onHelpClick={abrirModalAjuda}> <div className="space-y-4 mt-2"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-700 pb-4"> <div><label htmlFor="Segmento1_Nome" className="block text-sm font-medium text-gray-400 mb-1">Seg. 1</label><input type="text" id="Segmento1_Nome" value={params.Segmento1_Nome} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label htmlFor="Segmento2_Nome" className="block text-sm font-medium text-gray-400 mb-1">Seg. 2</label><input type="text" id="Segmento2_Nome" value={params.Segmento2_Nome} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> <div className="mt-4 space-y-4 max-h-[400px] overflow-y-auto pr-2"> <h4 className="text-md font-semibold text-gray-300 mb-2">Demanda (Unid.)</h4> {Array.from({ length: Math.max(0, Number(params.Total_Rodadas) || 0) }, (_, i) => i + 1).map(r => ( <div key={`dem-${r}`} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end border-b border-gray-700 pb-4 last:border-b-0"> <span className="font-semibold text-gray-300 md:col-span-1 self-center">Rodada {r}</span> <div className="md:col-span-2 grid grid-cols-2 gap-4"> <InputNumericoMasked id={`Segmento1_Demanda_Rodada_${r}`} name={`Segmento1_Demanda_Rodada_${r}`} label={params.Segmento1_Nome} value={params[`Segmento1_Demanda_Rodada_${r}`]} onChange={handleParamChange} sufixo="Unid." required /> <InputNumericoMasked id={`Segmento2_Demanda_Rodada_${r}`} name={`Segmento2_Demanda_Rodada_${r}`} label={params.Segmento2_Nome} value={params[`Segmento2_Demanda_Rodada_${r}`]} onChange={handleParamChange} sufixo="Unid." required /> </div> </div> ))} </div> </div> </AbaConteudo> </div>
                <div className={abaAtiva === 'setupInicial' ? 'block' : 'hidden'}> <AbaConteudo title="4. Setup Inicial (Simétrico)" isComplete={abasCompletas.setupInicial} helpText={helpTexts.setupInicial} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-6"> <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-gray-300 mb-2">Financeiro</h4> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <InputMoedaMasked id="Caixa_Inicial" label="Caixa (R$)" value={params.Caixa_Inicial} onChange={handleParamChange} required /> <InputMoedaMasked id="Divida_Inicial" label="Dívida LP Inicial (R$)" value={params.Divida_Inicial} onChange={handleParamChange} required /> <InputMoedaMasked id="Valor_Contabil_Imobilizado" label="Imobilizado (R$)" value={params.Valor_Contabil_Imobilizado} onChange={handleParamChange} required /> </div> </div> <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-gray-300 mb-2">Operações</h4> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <InputNumericoMasked id="Capacidade_Producao_Inicial" label="Capacidade" value={params.Capacidade_Producao_Inicial} onChange={handleParamChange} sufixo="Unid." required /> <InputMoedaMasked id="Custo_Fixo_Operacional" label="Custo Fixo/Rodada (R$)" value={params.Custo_Fixo_Operacional} onChange={handleParamChange} required /> <InputMoedaMasked id="Custo_Variavel_Montagem_Base" label="Custo Base de Montagem (R$/Unid.)" value={params.Custo_Variavel_Montagem_Base} onChange={handleParamChange} required /> </div> </div> <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-gray-300 mb-2">Níveis Iniciais (1-5)</h4> <div className="grid grid-cols-2 md:grid-cols-4 gap-4"> <div><label className="text-xs">Câmera</label><input type="number" id="Nivel_Inicial_PD_Camera" value={params.Nivel_Inicial_PD_Camera} onChange={handleParamChange} min="1" max="5" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Bateria</label><input type="number" id="Nivel_Inicial_PD_Bateria" value={params.Nivel_Inicial_PD_Bateria} onChange={handleParamChange} min="1" max="5" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">SO & IA</label><input type="number" id="Nivel_Inicial_PD_Sist_Operacional_e_IA" value={params.Nivel_Inicial_PD_Sist_Operacional_e_IA} onChange={handleParamChange} min="1" max="5" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Atual. Geral</label><input type="number" id="Nivel_Inicial_PD_Atualizacao_Geral" value={params.Nivel_Inicial_PD_Atualizacao_Geral} onChange={handleParamChange} min="1" max="5" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Capacitação</label><input type="number" id="Nivel_Inicial_Capacitacao" value={params.Nivel_Inicial_Capacitacao} onChange={handleParamChange} min="1" max="5" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Qualidade</label><input type="number" id="Nivel_Inicial_Qualidade" value={params.Nivel_Inicial_Qualidade} onChange={handleParamChange} min="1" max="5" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">ESG</label><input type="number" id="Nivel_Inicial_ESG" value={params.Nivel_Inicial_ESG} onChange={handleParamChange} min="1" max="5" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </div> </div> </AbaConteudo> </div>
                <div className={abaAtiva === 'custosInvestimento' ? 'block' : 'hidden'}> <AbaConteudo title="5. Custos (P&D/Expansão)" isComplete={abasCompletas.custosInvestimento} helpText={helpTexts.custosInvestimento} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-6"> <div className="pt-4 border-t border-gray-700"> <h4 className="font-semibold text-gray-300 mb-2">Custos P&D (R$)</h4> {['Camera', 'Bateria', 'Sist_Operacional_e_IA', 'Atualizacao_Geral'].map(area => ( <div key={area} className="mb-4 last:mb-0"> <h5 className="text-md font-medium text-gray-400 mb-1">{area.replace(/_/g, ' ')}</h5> <div className="grid grid-cols-2 md:grid-cols-4 gap-2"> {[2, 3, 4, 5].map(nivel => (<InputMoedaMasked key={`${area}-${nivel}`} id={`Custo_PD_${area}_Nivel_${nivel}`} label={`Nível ${nivel}`} value={params[`Custo_PD_${area}_Nivel_${nivel}`]} onChange={handleParamChange} required />))} </div> </div> ))} </div> <div className="pt-4 border-t border-gray-700"> <h4 className="font-semibold text-gray-300 mb-2">Custo Expansão Fábrica</h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <InputMoedaMasked id="Custo_Expansao_Lote" label="Custo por Lote (R$)" value={params.Custo_Expansao_Lote} onChange={handleParamChange} required /> <InputNumericoMasked id="Incremento_Capacidade_Lote" label="Capacidade/Lote" value={params.Incremento_Capacidade_Lote} onChange={handleParamChange} sufixo="Unid." required /> </div> </div> </div> </AbaConteudo> </div>
                <div className={abaAtiva === 'redeNegocios' ? 'block' : 'hidden'}> <AbaConteudo title="6. Parâmetros Rede (Fornecedores)" isComplete={abasCompletas.redeNegocios} helpText={helpTexts.redeNegocios} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-6"> <div className="pt-4 border-t border-gray-700"> <h4 className="font-semibold text-cyan-300 mb-2 text-lg">Fornecedores - {params.Segmento1_Nome}</h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="space-y-2"> <label className="text-sm">Opção A (Contratual)</label> <textarea id="Fornecedor_S1_Tela_A_Desc" value={params.Fornecedor_S1_Tela_A_Desc} onChange={handleParamChange} rows="2" className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_S1_Tela_A_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_S1_Tela_A_Custo} onChange={handleParamChange} required /> </div> <div className="space-y-2"> <label className="text-sm">Opção B (Relacional)</label> <textarea id="Fornecedor_S1_Tela_B_Desc" value={params.Fornecedor_S1_Tela_B_Desc} onChange={handleParamChange} rows="2" className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_S1_Tela_B_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_S1_Tela_B_Custo} onChange={handleParamChange} required /> </div> </div> <div className="mt-4 pt-4 border-t border-gray-700"> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="space-y-2"> <label className="text-sm">Opção C (Padrão)</label> <textarea id="Fornecedor_S1_Chip_C_Desc" value={params.Fornecedor_S1_Chip_C_Desc} onChange={handleParamChange} rows="2" className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_S1_Chip_C_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_S1_Chip_C_Custo} onChange={handleParamChange} required /> </div> <div className="space-y-2"> <label className="text-sm">Opção D (Inovação)</label> <textarea id="Fornecedor_S1_Chip_D_Desc" value={params.Fornecedor_S1_Chip_D_Desc} onChange={handleParamChange} rows="2" className="w-full bg-gray-700 p-2 rounded-lg" required /> <div className="grid grid-cols-2 gap-4"> <InputMoedaMasked id="Fornecedor_S1_Chip_D_Custo" label="Custo (R$/Unid.)" value={params.Fornecedor_S1_Chip_D_Custo} onChange={handleParamChange} required /> <div><label className="text-xs">Bônus P&D (%)</label><input type="number" id="Fornecedor_S1_Chip_D_Bonus_PD_Percent" value={params.Fornecedor_S1_Chip_D_Bonus_PD_Percent} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </div> </div> </div> </div> <div className="pt-4 border-t-2 border-cyan-700"> <h4 className="font-semibold text-cyan-300 mb-2 text-lg">Fornecedores - {params.Segmento2_Nome}</h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="space-y-2"> <label className="text-sm">Opção A</label> <textarea id="Fornecedor_S2_Tela_A_Desc" value={params.Fornecedor_S2_Tela_A_Desc} onChange={handleParamChange} rows="2" className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_S2_Tela_A_Custo" label="Custo" value={params.Fornecedor_S2_Tela_A_Custo} onChange={handleParamChange} required /> </div> <div className="space-y-2"> <label className="text-sm">Opção B</label> <textarea id="Fornecedor_S2_Tela_B_Desc" value={params.Fornecedor_S2_Tela_B_Desc} onChange={handleParamChange} rows="2" className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_S2_Tela_B_Custo" label="Custo" value={params.Fornecedor_S2_Tela_B_Custo} onChange={handleParamChange} required /> </div> </div> <div className="mt-4 pt-4 border-t border-gray-700"> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="space-y-2"> <label className="text-sm">Opção C</label> <textarea id="Fornecedor_S2_Chip_C_Desc" value={params.Fornecedor_S2_Chip_C_Desc} onChange={handleParamChange} rows="2" className="w-full bg-gray-700 p-2 rounded-lg" required /> <InputMoedaMasked id="Fornecedor_S2_Chip_C_Custo" label="Custo" value={params.Fornecedor_S2_Chip_C_Custo} onChange={handleParamChange} required /> </div> <div className="space-y-2"> <label className="text-sm">Opção D</label> <textarea id="Fornecedor_S2_Chip_D_Desc" value={params.Fornecedor_S2_Chip_D_Desc} onChange={handleParamChange} rows="2" className="w-full bg-gray-700 p-2 rounded-lg" required /> <div className="grid grid-cols-2 gap-4"> <InputMoedaMasked id="Fornecedor_S2_Chip_D_Custo" label="Custo" value={params.Fornecedor_S2_Chip_D_Custo} onChange={handleParamChange} required /> <div><label className="text-xs">Bônus (%)</label><input type="number" id="Fornecedor_S2_Chip_D_Bonus_PD_Percent" value={params.Fornecedor_S2_Chip_D_Bonus_PD_Percent} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </div> </div> </div> </div> </div> </AbaConteudo> </div>
                <div className={abaAtiva === 'financasTaxas' ? 'block' : 'hidden'}> <AbaConteudo title="7. Finanças" isComplete={abasCompletas.financasTaxas} helpText={helpTexts.financasTaxas} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-6"> <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end"> <div><label htmlFor="Taxa_Juros_Curto_Prazo" className="block text-xs font-medium text-gray-400 mb-1">Juros CP (%)</label><input type="number" id="Taxa_Juros_Curto_Prazo" value={params.Taxa_Juros_Curto_Prazo} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label htmlFor="Taxa_Juros_Emergencia" className="block text-xs font-medium text-gray-400 mb-1">Juros Emerg (%)</label><input type="number" id="Taxa_Juros_Emergencia" value={params.Taxa_Juros_Emergencia} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label htmlFor="Taxa_Juros_Longo_Prazo" className="block text-xs font-medium text-gray-400 mb-1">Juros LP (%)</label><input type="number" id="Taxa_Juros_Longo_Prazo" value={params.Taxa_Juros_Longo_Prazo} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label htmlFor="Prazo_Fixo_Longo_Prazo" className="block text-xs font-medium text-gray-400 mb-1">Prazo LP (R)</label><input type="number" id="Prazo_Fixo_Longo_Prazo" value={params.Prazo_Fixo_Longo_Prazo} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div><label htmlFor="Limite_CP_Percent_Ativo_Circulante" className="block text-xs font-medium text-gray-400 mb-1">Limite CP (% Ativo)</label><input type="number" id="Limite_CP_Percent_Ativo_Circulante" value={params.Limite_CP_Percent_Ativo_Circulante} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label htmlFor="Limite_LP_Percent_Patrimonio_Liquido" className="block text-xs font-medium text-gray-400 mb-1">Limite LP (% PL)</label><input type="number" id="Limite_LP_Percent_Patrimonio_Liquido" value={params.Limite_LP_Percent_Patrimonio_Liquido} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </div> </AbaConteudo> </div>
                <div className={abaAtiva === 'atratividade' ? 'block' : 'hidden'}> <AbaConteudo title="8. Pesos" isComplete={abasCompletas.atratividade} helpText={helpTexts.atratividade(params)} onHelpClick={abrirModalAjuda}> <div className="pt-4 border-t border-gray-700 mt-4"> <h4 className="font-semibold text-gray-300 mb-2 text-lg">Pesos IDG (Soma=1.0)</h4> <div className="grid grid-cols-2 md:grid-cols-4 gap-4"> <div><label className="text-xs">Lucro</label><input type="number" name={`Peso_IDG_Lucro`} value={params[`Peso_IDG_Lucro`]} onChange={handleParamChange} step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Share</label><input type="number" name={`Peso_IDG_Share`} value={params[`Peso_IDG_Share`]} onChange={handleParamChange} step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">P&D</label><input type="number" name={`Peso_IDG_PD`} value={params[`Peso_IDG_PD`]} onChange={handleParamChange} step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> <div><label className="text-xs">Saúde Fin.</label><input type="number" name={`Peso_IDG_Saude_Financeira`} value={params[`Peso_IDG_Saude_Financeira`]} onChange={handleParamChange} step="0.01" className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </div> <div className="mt-6 space-y-6 max-h-[400px] overflow-y-auto pr-2"> {Array.from({ length: Math.max(0, Number(params.Total_Rodadas) || 0) }, (_, i) => i + 1).map(r => ( <div key={`atr-${r}`} className="space-y-2 border-b border-gray-700 pb-4"> <h5 className="font-semibold text-gray-300">Rodada {r}</h5> <div className="grid grid-cols-5 gap-2 text-xs text-center"> <span>P&D</span><span>Mkt</span><span>Preço</span><span>Qual</span><span>ESG</span> </div> <div className="grid grid-cols-5 gap-2"> <input type="number" name={`Peso_PD_Premium_Rodada_${r}`} value={params[`Peso_PD_Premium_Rodada_${r}`]} onChange={handleParamChange} step="0.1" className="bg-gray-700 rounded p-1" /> <input type="number" name={`Peso_Mkt_Premium_Rodada_${r}`} value={params[`Peso_Mkt_Premium_Rodada_${r}`]} onChange={handleParamChange} step="0.1" className="bg-gray-700 rounded p-1" /> <input type="number" name={`Peso_Preco_Premium_Rodada_${r}`} value={params[`Peso_Preco_Premium_Rodada_${r}`]} onChange={handleParamChange} step="0.1" className="bg-gray-700 rounded p-1" /> <input type="number" name={`Peso_Qualidade_Premium_Rodada_${r}`} value={params[`Peso_Qualidade_Premium_Rodada_${r}`]} onChange={handleParamChange} step="0.1" className="bg-gray-700 rounded p-1" /> <input type="number" name={`Peso_ESG_Premium_Rodada_${r}`} value={params[`Peso_ESG_Premium_Rodada_${r}`]} onChange={handleParamChange} step="0.1" className="bg-gray-700 rounded p-1" /> </div> </div> ))} </div> </AbaConteudo> </div>
                <div className={abaAtiva === 'orcamentoOrganizacional' ? 'block' : 'hidden'}> <AbaConteudo title="9. Orçamento Org." isComplete={abasCompletas.orcamentoOrganizacional} helpText={helpTexts.orcamentoOrganizacional} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-6"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <InputMoedaMasked id="Orcamento_Organizacional_Por_Rodada" label="Orçamento por Rodada" value={params.Orcamento_Organizacional_Por_Rodada} onChange={handleParamChange} required /> </div> <div className="space-y-4"> <h5 className="text-md font-medium text-gray-400">Custos (Níveis 2-5)</h5> <div className="grid grid-cols-2 md:grid-cols-4 gap-2"> <InputMoedaMasked id="Custo_Nivel_Capacitacao_2" label="Capacitação N2" value={params.Custo_Nivel_Capacitacao_2} onChange={handleParamChange} required /> <InputMoedaMasked id="Custo_Nivel_Qualidade_2" label="Qualidade N2" value={params.Custo_Nivel_Qualidade_2} onChange={handleParamChange} required /> <InputMoedaMasked id="Custo_Nivel_ESG_2" label="ESG N2" value={params.Custo_Nivel_ESG_2} onChange={handleParamChange} required /> <div className="flex flex-col justify-end"><label className="text-xs text-gray-400 mb-1">Redução %</label><input type="number" id="Reducao_Custo_Montagem_Por_Nivel_Capacitacao_Percent" value={params.Reducao_Custo_Montagem_Por_Nivel_Capacitacao_Percent} onChange={handleParamChange} className="w-full bg-gray-700 p-2 rounded-lg" required /></div> </div> </div> </div> </AbaConteudo> </div>
                <div className={abaAtiva === 'eventos' ? 'block' : 'hidden'}> <AbaConteudo title="10. Eventos" isComplete={abasCompletas.eventos} helpText={helpTexts.eventos} onHelpClick={abrirModalAjuda}> <div className="mt-2 space-y-4 max-h-[400px] overflow-y-auto pr-2"> {Array.from({ length: Math.max(0, Number(params.Total_Rodadas) || 0) }, (_, i) => i + 1).map(r => ( <div key={`noticia-${r}`}> <label htmlFor={`Noticia_Rodada_${r}`} className="block text-sm font-medium text-gray-400 mb-1">Notícia Rodada {r}</label> <textarea id={`Noticia_Rodada_${r}`} name={`Noticia_Rodada_${r}`} value={params[`Noticia_Rodada_${r}`]} onChange={handleParamChange} rows="2" className="w-full bg-gray-700 p-3 rounded-lg" /> </div> ))} </div> </AbaConteudo> </div>

                {/* Botões Finais */}
                <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-700"> 
                    <button type="button" onClick={() => navigate('/simulador/admin')} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-6 rounded-lg" disabled={loading}> Cancelar </button> 
                    <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-6 rounded-lg" disabled={loading}> {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar e Iniciar')} </button> 
                </div>
            </form>

            {modalAjudaVisivel && ( <ModalAjuda titulo={modalAjudaConteudo.titulo} texto={modalAjudaConteudo.texto} onClose={fecharModalAjuda} /> )}
        </div>
    );
}

export default SimuladorForm;