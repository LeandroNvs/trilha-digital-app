import React, { useState, useEffect, useMemo } from 'react';
// CORREÇÃO: Adicionado useParams e Link
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, updateDoc, collection, getDocs } from 'firebase/firestore';
// CORREÇÃO: Caminho de importação corrigido para absoluto (a partir de /src/)
import { db, appId } from '/src/firebase/config';
// Importa os componentes separados
import ResultadosBriefing from '/src/components/ResultadosBriefing.jsx'; 
import SumarioDecisoes from '/src/components/SumarioDecisoes.jsx'; 
// import useCollection from '/src/hooks/useCollection.js'; // Descomente se for usar AbaRanking/Concorrencia
// import ModalConfirmacao from '/src/components/ModalConfirmacao.jsx'; // Descomente se for usar
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

// --- Ícones ---
const IconeCheck = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const IconeInfo = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block ml-1 text-gray-400 hover:text-cyan-400 cursor-pointer" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>;
const IconeClose = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

// --- Componente Modal de Ajuda ---
function ModalAjuda({ titulo, texto, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in"> <div className="bg-gray-700 rounded-lg shadow-xl p-6 max-w-lg w-full relative"> <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white" aria-label="Fechar ajuda"><IconeClose /></button> <h3 className="text-xl font-bold text-cyan-400 mb-4">{titulo}</h3> <div className="text-gray-300 whitespace-pre-wrap space-y-2 text-sm"> {texto.split('\n').map((paragrafo, index) => <p key={index}>{paragrafo}</p>)} </div> <button onClick={onClose} className="mt-6 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg float-right"> Entendido </button> </div> </div>
     );
}

// --- Componente Input com Máscara Monetária (v8 - Com centavos) ---
const InputMoedaMasked = ({ id, label, value: externalValue, onChange, disabled = false, ...props }) => {
    const [displayValue, setDisplayValue] = useState('');

    // Formata número para string BRL com centavos (R$ X.XXX,XX)
    const formatNumber = (num) => {
        if (num === null || num === undefined || num === '' || isNaN(Number(num))) return '';
        const number = Number(num);
        return number.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2, // Sempre mostra 2 casas decimais
            maximumFractionDigits: 2
        });
    };

     // Atualiza o valor exibido quando o valor externo muda
     useEffect(() => {
        setDisplayValue(formatNumber(externalValue));
    }, [externalValue]);

    const handleChange = (e) => {
        const inputVal = e.target.value;
        // Remove tudo exceto dígitos
        const numericString = inputVal.replace(/\D/g, '');
        let numberValue = null; // Usar null se o campo ficar vazio

        if (numericString !== '') {
            // Converte a string de dígitos para número (representando centavos)
            const centsValue = parseInt(numericString, 10);
            if (!isNaN(centsValue)) {
                // Divide por 100 para obter o valor em Reais com centavos
                numberValue = centsValue / 100;
            }
        }

        // Atualiza o valor exibido imediatamente para feedback do usuário
        setDisplayValue(formatNumber(numberValue));

        // Chama onChange passando o valor numérico (ou '' se vazio)
        if (onChange) {
            onChange({
                target: {
                    id: id || props.name,
                    name: props.name || id,
                    value: numberValue === null ? '' : numberValue, // Envia número ou string vazia
                    type: 'number' // Mantém tipo 'number' para consistência
                }
            });
        }
    };

    return (
        <div>
            <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
            <div className="relative">
                {/* O input agora é type="text" para permitir a máscara */}
                <input type="text" inputMode="numeric" // Ajuda teclados mobile
                    id={id} name={props.name || id}
                    value={displayValue} // Mostra o valor formatado
                    onChange={handleChange}
                    className={`w-full bg-gray-700 p-2 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="R$ 0,00" // Placeholder atualizado
                    disabled={disabled} {...props} />
            </div>
        </div>
    );
};


// --- Componente Input com Máscara Numérica (Milhar - v7 - Lógica estável) ---
const InputNumericoMasked = ({ id, label, value: externalValue, onChange, sufixo = '', disabled = false, ...props }) => {
    const formatNumber = (num) => { if (num === null || num === undefined || num === '' || isNaN(Number(num))) return ''; return Number(num).toLocaleString('pt-BR'); };
    const displayValue = formatNumber(externalValue);
    const handleChange = (e) => {
        const inputVal = e.target.value;
        const numericString = inputVal.replace(/\D/g, '');
        let numberValue = '';
        if (numericString !== '') { const parsedNum = parseInt(numericString, 10); if (!isNaN(parsedNum)) { numberValue = parsedNum; } }
        if (onChange) { onChange({ target: { id: id || props.name, name: props.name || id, value: numberValue, type: 'number' } }); }
    };
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
            <div className="relative">
                <input type="text" inputMode="numeric" id={id} name={props.name || id} value={displayValue} onChange={handleChange}
                    className={`w-full bg-gray-700 p-2 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none ${sufixo ? 'pr-10 md:pr-12' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="0" disabled={disabled} {...props} />
                {sufixo && <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm pointer-events-none">{sufixo}</span>}
            </div>
        </div>
    );
};

// =================================================================
// MUDANÇA: AbaRedeNegocios
// =================================================================
function AbaRedeNegocios({ simulacao, decisoes, decisaoRef, rodadaDecisao, isSubmetido, custoUnitarioProjetadoS1, custoUnitarioProjetadoS2 }) {
    // MUDANÇA: Estados duplicados para S1 e S2
    const [decisaoFornecedorTelaS1, setDecisaoFornecedorTelaS1] = useState('');
    const [decisaoFornecedorChipS1, setDecisaoFornecedorChipS1] = useState('');
    const [decisaoFornecedorTelaS2, setDecisaoFornecedorTelaS2] = useState('');
    const [decisaoFornecedorChipS2, setDecisaoFornecedorChipS2] = useState('');
    
    const [loading, setLoading] = useState(false); 
    const [feedback, setFeedback] = useState(''); 
    
    // MUDANÇA: useEffect carrega 4 valores
    useEffect(() => { 
        setDecisaoFornecedorTelaS1(decisoes.Escolha_Fornecedor_S1_Tela || ''); 
        setDecisaoFornecedorChipS1(decisoes.Escolha_Fornecedor_S1_Chip || '');
        setDecisaoFornecedorTelaS2(decisoes.Escolha_Fornecedor_S2_Tela || '');
        setDecisaoFornecedorChipS2(decisoes.Escolha_Fornecedor_S2_Chip || '');
    }, [decisoes]); 
    
    // MUDANÇA: handleSave salva 4 valores
    const handleSave = async () => { 
        setLoading(true); setFeedback(''); 
        if (!decisaoFornecedorTelaS1 || !decisaoFornecedorChipS1 || !decisaoFornecedorTelaS2 || !decisaoFornecedorChipS2) { 
            setFeedback('Erro: Selecione fornecedores para ambos os segmentos.'); 
            setLoading(false); return; 
        } 
        try { 
            await setDoc(decisaoRef, { 
                Rodada: rodadaDecisao, 
                Escolha_Fornecedor_S1_Tela: decisaoFornecedorTelaS1, 
                Escolha_Fornecedor_S1_Chip: decisaoFornecedorChipS1,
                Escolha_Fornecedor_S2_Tela: decisaoFornecedorTelaS2,
                Escolha_Fornecedor_S2_Chip: decisaoFornecedorChipS2,
            }, { merge: true }); 
            setFeedback('Salvo!'); setTimeout(() => setFeedback(''), 3000); 
        } catch (error) { console.error("Erro:", error); setFeedback('Falha.'); } 
        setLoading(false); 
    };
    
    const formatCustoUnitario = (custo) => { if (custo === null || custo === undefined || isNaN(custo)) return 'N/A'; return Number(custo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    
    return ( 
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in"> 
            <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">1. Decisões de Rede (Por Segmento)</h3> 
            
            {/* MUDANÇA: Mostra os 2 Custos Projetados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900 p-4 rounded-lg mb-6 text-center">
                <div>
                    <p className="text-sm text-gray-400">Custo Unit. Projetado ({simulacao.Segmento1_Nome})</p>
                    <p className="text-xl font-bold text-white">{formatCustoUnitario(custoUnitarioProjetadoS1)}</p>
                    <p className="text-xs text-gray-500 mt-1">Custo Base ({formatCustoUnitario(simulacao.Custo_Variavel_Montagem_Base)}) + S1 Tela + S1 Chip</p>
                </div>
                <div>
                    <p className="text-sm text-gray-400">Custo Unit. Projetado ({simulacao.Segmento2_Nome})</p>
                    <p className="text-xl font-bold text-white">{formatCustoUnitario(custoUnitarioProjetadoS2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Custo Base ({formatCustoUnitario(simulacao.Custo_Variavel_Montagem_Base)}) + S2 Tela + S2 Chip</p>
                </div>
            </div>

            {/* --- MUDANÇA: Fieldsets duplicados para S1 e S2 --- */}
            
            {/* --- Segmento 1 --- */}
            <div className="pt-4 border-t border-gray-700">
                <h4 className="text-xl font-semibold text-cyan-300 mb-4">Fornecedores - {simulacao.Segmento1_Nome}</h4>
                <fieldset className="space-y-3" disabled={isSubmetido}> 
                    <legend className="text-lg font-semibold text-gray-200 mb-2">Fornecedor de Telas (S1)</legend> 
                    <label className={`block p-4 rounded-lg border-2 transition-colors ${decisaoFornecedorTelaS1 === 'A' ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-900 hover:border-cyan-700'} ${isSubmetido ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}> <input type="radio" name="fornecedor_s1_tela" value="A" checked={decisaoFornecedorTelaS1 === 'A'} onChange={(e) => setDecisaoFornecedorTelaS1(e.target.value)} className="hidden" disabled={isSubmetido} /> <span className="font-bold text-lg text-white">Opção A</span> <p className="text-sm text-gray-300 mt-1">{simulacao.Fornecedor_S1_Tela_A_Desc}</p> <p className="text-lg font-semibold text-cyan-300 mt-1">Custo: {formatCustoUnitario(simulacao.Fornecedor_S1_Tela_A_Custo)}/unid.</p> </label> 
                    <label className={`block p-4 rounded-lg border-2 transition-colors ${decisaoFornecedorTelaS1 === 'B' ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-900 hover:border-cyan-700'} ${isSubmetido ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}> <input type="radio" name="fornecedor_s1_tela" value="B" checked={decisaoFornecedorTelaS1 === 'B'} onChange={(e) => setDecisaoFornecedorTelaS1(e.target.value)} className="hidden" disabled={isSubmetido} /> <span className="font-bold text-lg text-white">Opção B</span> <p className="text-sm text-gray-300 mt-1">{simulacao.Fornecedor_S1_Tela_B_Desc}</p> <p className="text-lg font-semibold text-cyan-300 mt-1">Custo: {formatCustoUnitario(simulacao.Fornecedor_S1_Tela_B_Custo)}/unid.</p> </label> 
                </fieldset> 
                <fieldset className="space-y-3 mt-6" disabled={isSubmetido}> 
                    <legend className="text-lg font-semibold text-gray-200 mb-2">Fornecedor de Chips (S1)</legend> 
                    <label className={`block p-4 rounded-lg border-2 transition-colors ${decisaoFornecedorChipS1 === 'C' ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-900 hover:border-cyan-700'} ${isSubmetido ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}> <input type="radio" name="fornecedor_s1_chip" value="C" checked={decisaoFornecedorChipS1 === 'C'} onChange={(e) => setDecisaoFornecedorChipS1(e.target.value)} className="hidden" disabled={isSubmetido}/> <span className="font-bold text-lg text-white">Opção C</span> <p className="text-sm text-gray-300 mt-1">{simulacao.Fornecedor_S1_Chip_C_Desc}</p> <p className="text-lg font-semibold text-cyan-300 mt-1">Custo: {formatCustoUnitario(simulacao.Fornecedor_S1_Chip_C_Custo)}/unid.</p> </label> 
                    <label className={`block p-4 rounded-lg border-2 transition-colors ${decisaoFornecedorChipS1 === 'D' ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-900 hover:border-cyan-700'} ${isSubmetido ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}> <input type="radio" name="fornecedor_s1_chip" value="D" checked={decisaoFornecedorChipS1 === 'D'} onChange={(e) => setDecisaoFornecedorChipS1(e.target.value)} className="hidden" disabled={isSubmetido}/> <span className="font-bold text-lg text-white">Opção D</span> <p className="text-sm text-gray-300 mt-1">{simulacao.Fornecedor_S1_Chip_D_Desc}</p> <p className="text-lg font-semibold text-cyan-300 mt-1">Custo: {formatCustoUnitario(simulacao.Fornecedor_S1_Chip_D_Custo)}/unid.</p> </label> 
                </fieldset>
            </div>
            
            {/* --- Segmento 2 --- */}
            <div className="pt-4 border-t-2 border-cyan-700 mt-6">
                <h4 className="text-xl font-semibold text-cyan-300 mb-4">Fornecedores - {simulacao.Segmento2_Nome}</h4>
                <fieldset className="space-y-3" disabled={isSubmetido}> 
                    <legend className="text-lg font-semibold text-gray-200 mb-2">Fornecedor de Telas (S2)</legend> 
                    <label className={`block p-4 rounded-lg border-2 transition-colors ${decisaoFornecedorTelaS2 === 'A' ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-900 hover:border-cyan-700'} ${isSubmetido ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}> <input type="radio" name="fornecedor_s2_tela" value="A" checked={decisaoFornecedorTelaS2 === 'A'} onChange={(e) => setDecisaoFornecedorTelaS2(e.target.value)} className="hidden" disabled={isSubmetido} /> <span className="font-bold text-lg text-white">Opção A</span> <p className="text-sm text-gray-300 mt-1">{simulacao.Fornecedor_S2_Tela_A_Desc}</p> <p className="text-lg font-semibold text-cyan-300 mt-1">Custo: {formatCustoUnitario(simulacao.Fornecedor_S2_Tela_A_Custo)}/unid.</p> </label> 
                    <label className={`block p-4 rounded-lg border-2 transition-colors ${decisaoFornecedorTelaS2 === 'B' ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-900 hover:border-cyan-700'} ${isSubmetido ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}> <input type="radio" name="fornecedor_s2_tela" value="B" checked={decisaoFornecedorTelaS2 === 'B'} onChange={(e) => setDecisaoFornecedorTelaS2(e.target.value)} className="hidden" disabled={isSubmetido} /> <span className="font-bold text-lg text-white">Opção B</span> <p className="text-sm text-gray-300 mt-1">{simulacao.Fornecedor_S2_Tela_B_Desc}</p> <p className="text-lg font-semibold text-cyan-300 mt-1">Custo: {formatCustoUnitario(simulacao.Fornecedor_S2_Tela_B_Custo)}/unid.</p> </label> 
                </fieldset> 
                <fieldset className="space-y-3 mt-6" disabled={isSubmetido}> 
                    <legend className="text-lg font-semibold text-gray-200 mb-2">Fornecedor de Chips (S2)</legend> 
                    <label className={`block p-4 rounded-lg border-2 transition-colors ${decisaoFornecedorChipS2 === 'C' ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-900 hover:border-cyan-700'} ${isSubmetido ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}> <input type="radio" name="fornecedor_s2_chip" value="C" checked={decisaoFornecedorChipS2 === 'C'} onChange={(e) => setDecisaoFornecedorChipS2(e.target.value)} className="hidden" disabled={isSubmetido}/> <span className="font-bold text-lg text-white">Opção C</span> <p className="text-sm text-gray-300 mt-1">{simulacao.Fornecedor_S2_Chip_C_Desc}</p> <p className="text-lg font-semibold text-cyan-300 mt-1">Custo: {formatCustoUnitario(simulacao.Fornecedor_S2_Chip_C_Custo)}/unid.</p> </label> 
                    <label className={`block p-4 rounded-lg border-2 transition-colors ${decisaoFornecedorChipS2 === 'D' ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-900 hover:border-cyan-700'} ${isSubmetido ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}> <input type="radio" name="fornecedor_s2_chip" value="D" checked={decisaoFornecedorChipS2 === 'D'} onChange={(e) => setDecisaoFornecedorChipS2(e.target.value)} className="hidden" disabled={isSubmetido}/> <span className="font-bold text-lg text-white">Opção D</span> <p className="text-sm text-gray-300 mt-1">{simulacao.Fornecedor_S2_Chip_D_Desc}</p> <p className="text-lg font-semibold text-cyan-300 mt-1">Custo: {formatCustoUnitario(simulacao.Fornecedor_S2_Chip_D_Custo)}/unid.</p> </label> 
                </fieldset>
            </div>
            
            {!isSubmetido && feedback && <p className={`text-sm text-center font-medium ${feedback.includes('Erro') ? 'text-red-400' : 'text-green-400'}`}>{feedback}</p>} 
            {!isSubmetido && ( <div className="text-right mt-6"> <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50" disabled={loading}> {loading ? 'Salvando...' : 'Salvar Decisão da Rede'} </button> </div> )} 
        </div> 
    );
}

// --- Componente da Aba P&D --- (Inalterado)
function AbaPD({ simulacao, estadoRodada, decisoes, decisaoRef, rodadaDecisao, isSubmetido }) {
    const [investCamera, setInvestCamera] = useState(''); const [investBateria, setInvestBateria] = useState('');
    const [investSOeIA, setInvestSOeIA] = useState('');
    const [investAtualGeral, setInvestAtualGeral] = useState('');
    
    const [loading, setLoading] = useState(false); const [feedback, setFeedback] = useState('');
    
    useEffect(() => { 
        setInvestCamera(decisoes.Invest_PD_Camera || ''); 
        setInvestBateria(decisoes.Invest_PD_Bateria || ''); 
        setInvestSOeIA(decisoes.Invest_PD_Sist_Operacional_e_IA || '');
        setInvestAtualGeral(decisoes.Invest_PD_Atualizacao_Geral || '');
    }, [decisoes]);

    const getCustoProximoNivel = (area, nivelAtual) => { if (nivelAtual >= 5) return { custo: 0, proximoNivel: 5 }; const pN = nivelAtual + 1; const key = `Custo_PD_${area}_Nivel_${pN}`; return { custo: simulacao[key] || 0, proximoNivel: pN }; };
    
    const areasPD = [ 
        { idInput: 'Invest_PD_Camera', label: 'Câmera (Premium)', nivelAtual: estadoRodada?.Nivel_PD_Camera || 1, progresso: estadoRodada?.Progresso_PD_Camera || 0, value: investCamera, setValue: setInvestCamera, idArea: 'Camera' }, 
        { idInput: 'Invest_PD_Bateria', label: 'Bateria (Premium)', nivelAtual: estadoRodada?.Nivel_PD_Bateria || 1, progresso: estadoRodada?.Progresso_PD_Bateria || 0, value: investBateria, setValue: setInvestBateria, idArea: 'Bateria' }, 
        { idInput: 'Invest_PD_Sist_Operacional_e_IA', label: 'Sist. Operacional e IA (Premium)', nivelAtual: estadoRodada?.Nivel_PD_Sist_Operacional_e_IA || 1, progresso: estadoRodada?.Progresso_PD_Sist_Operacional_e_IA || 0, value: investSOeIA, setValue: setInvestSOeIA, idArea: 'Sist_Operacional_e_IA' },
        { idInput: 'Invest_PD_Atualizacao_Geral', label: 'Atualização Geral (Básico)', nivelAtual: estadoRodada?.Nivel_PD_Atualizacao_Geral || 1, progresso: estadoRodada?.Progresso_PD_Atualizacao_Geral || 0, value: investAtualGeral, setValue: setInvestAtualGeral, idArea: 'Atualizacao_Geral' }
    ];
    
    const handleSave = async () => { 
        setLoading(true); setFeedback(''); 
        try { 
            await setDoc(decisaoRef, { 
                Rodada: rodadaDecisao, 
                Invest_PD_Camera: Number(investCamera) || 0, 
                Invest_PD_Bateria: Number(investBateria) || 0, 
                Invest_PD_Sist_Operacional_e_IA: Number(investSOeIA) || 0,
                Invest_PD_Atualizacao_Geral: Number(investAtualGeral) || 0,
            }, { merge: true }); 
            setFeedback('Salvo!'); setTimeout(() => setFeedback(''), 3000); 
        } catch (error) { console.error("Erro:", error); setFeedback('Falha.'); } 
        setLoading(false); 
    };
    
    const handleInvestChange = (setter) => (e) => { setter(e.target.value); };
     const formatBRLDisplay = (num) => (Number(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const caixaProjetado = useMemo(() => {
        const caixaInicial = estadoRodada?.Caixa || 0;
        
        const investExpansao = decisoes.Invest_Expansao_Fabrica || 0;
        const totalInvestMkt = (decisoes.Marketing_Segmento_1 || 0) + (decisoes.Marketing_Segmento_2 || 0);
        const amortizarLPNum = decisoes.Amortizar_Divida_LP || 0;
        
        const taxaInflacaoRodada = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4;
        const custoFixoBase = (simulacao.Custo_Fixo_Operacional || 0);
        const custoFixoCorrigido = custoFixoBase * Math.pow(1 + taxaInflacaoRodada, rodadaDecisao - 1); 

        const tomarCPNum = decisoes.Tomar_Emprestimo_CP || 0;
        const tomarLPNum = decisoes.Tomar_Financiamento_LP || 0;

        const investPDAtual = (Number(decisoes.Invest_PD_Camera) || 0) + 
                              (Number(decisoes.Invest_PD_Bateria) || 0) + 
                              (Number(decisoes.Invest_PD_Sist_Operacional_e_IA) || 0) + 
                              (Number(decisoes.Invest_PD_Atualizacao_Geral) || 0);

        const caixaProjetadoBase = (estadoRodada?.Caixa || 0) 
                                        + tomarCPNum 
                                        + tomarLPNum
                                        - investExpansao
                                        - totalInvestMkt
                                        - amortizarLPNum
                                        - custoFixoCorrigido;

        return caixaProjetadoBase - investPDAtual;

    }, [estadoRodada, decisoes, simulacao, rodadaDecisao]);
    
    const corCaixa = caixaProjetado < 0 ? 'text-red-400' : 'text-green-400';

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in">
            <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">2. Decisões de P&D</h3>
            
            <p className="text-sm text-yellow-300 bg-yellow-900 p-3 rounded-lg -mt-4">
                <span className="font-bold">Atenção:</span> Os investimentos em P&D realizados nesta rodada (R{rodadaDecisao}) só terão efeito (novo nível) a partir da <span className="font-bold">próxima rodada (R{rodadaDecisao + 1})</span>.
            </p>

            <div className="bg-gray-900 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-400">Caixa Projetado (Pré-Produção - Baseado em dados SALVOS)</p>
                <p className={`text-xl font-bold ${corCaixa}`}>{formatBRLDisplay(caixaProjetado)}</p>
                <p className="text-xs text-gray-500 mt-1">(Caixa Atual + Financiamentos Salvos - Outros Invest. Salvos - Custo Fixo - P&D Salvo)</p>
            </div>

            {areasPD.map(area => {
                const { custo, proximoNivel } = getCustoProximoNivel(area.idArea, area.nivelAtual);
                const progressoPercent = custo > 0 ? Math.min(100, (area.progresso / custo) * 100) : (area.nivelAtual >= 5 ? 100 : 0);
                
                const investNum = Number(area.value) || 0;
                const progressoProjetado = area.progresso + investNum;
                const progressoProjetadoPercent = custo > 0 ? Math.min(100, (progressoProjetado / custo) * 100) : (area.nivelAtual >= 5 ? 100 : 0);

                return (
                    <div key={area.idInput} className="pt-4 border-t border-gray-700">
                        <h4 className="text-xl font-semibold text-gray-200 mb-2">{area.label} - Nível: {area.nivelAtual}</h4>
                        {area.nivelAtual < 5 ? (
                            <>
                                <div className="mb-1 text-sm text-gray-400">Progresso Nível {proximoNivel}:</div>
                                <div className="w-full bg-gray-600 rounded-full h-4 mb-1 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-4 bg-green-500 opacity-40 rounded-full transition-all duration-300" style={{ width: `${progressoProjetadoPercent}%` }}></div>
                                    <div className="absolute top-0 left-0 h-4 bg-cyan-500 rounded-full transition-all duration-300" style={{ width: `${progressoPercent}%` }}></div>
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white px-2 z-10">
                                        {formatBRLDisplay(area.progresso)} / {formatBRLDisplay(custo)} ({progressoPercent.toFixed(0)}%)
                                    </span>
                                </div>
                                <InputMoedaMasked id={area.idInput} name={area.idInput} label={`Investir em ${area.label} (R$)`} value={area.value} onChange={handleInvestChange(area.setValue)} disabled={isSubmetido} />
                            </>
                        ) : ( <p className="text-green-400 font-semibold mt-2">Nível Máximo!</p> )}
                    </div>
                );
            })}
            {!isSubmetido && feedback && <p className={`text-sm text-center font-medium ${feedback.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{feedback}</p>}
            {!isSubmetido && ( <div className="text-right mt-6"> <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-6 rounded-lg disabled:opacity-50" disabled={loading}> {loading ? 'Salvando...' : 'Salvar P&D'} </button> </div> )}
        </div>
    );
}

// =================================================================
// MUDANÇA: AbaOperacoes
// =================================================================
function AbaOperacoes({ simulacao, estadoRodada, decisoes, decisaoRef, rodadaDecisao, isSubmetido, custoUnitarioProjetadoS1, custoUnitarioProjetadoS2 }) {
    // MUDANÇA: Estados de produção separados
    const [producaoPlanejadaS1, setProducaoPlanejadaS1] = useState('');
    const [producaoPlanejadaS2, setProducaoPlanejadaS2] = useState('');
    
    const [investExpansao, setInvestExpansao] = useState('');
    const [loading, setLoading] = useState(false); 
    const [feedback, setFeedback] = useState(''); 
    const [erroForm, setErroForm] = useState({});
    
    const capacidadeAtual = estadoRodada?.Capacidade_Fabrica || 0; 
    const custoLote = simulacao?.Custo_Expansao_Lote || 0; 
    const incrementoLote = simulacao?.Incremento_Capacidade_Lote || 0;
    
    // MUDANÇA: useEffect carrega 2 produções
    useEffect(() => { 
        setProducaoPlanejadaS1(decisoes.Producao_Planejada_S1 || '');
        setProducaoPlanejadaS2(decisoes.Producao_Planejada_S2 || '');
        setInvestExpansao(decisoes.Invest_Expansao_Fabrica || ''); 
    }, [decisoes]);
    
    const handleProducaoS1Change = (e) => setProducaoPlanejadaS1(e.target.value);
    const handleProducaoS2Change = (e) => setProducaoPlanejadaS2(e.target.value);
    const handleExpansaoChange = (e) => setInvestExpansao(e.target.value);
    
    const formatBRL = (num) => (Number(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatNumber = (num) => (Number(num) || 0).toLocaleString('pt-BR');
    
    // MUDANÇA: Números das produções
    const pNumS1 = Number(producaoPlanejadaS1) || 0;
    const pNumS2 = Number(producaoPlanejadaS2) || 0;
    const pNumTotal = pNumS1 + pNumS2;

    // MUDANÇA: Custo Total Projetado
    const custoTotalProjetado = (pNumS1 * custoUnitarioProjetadoS1) + (pNumS2 * custoUnitarioProjetadoS2);

    // MUDANÇA: Validação soma as duas produções
    const validarCampos = () => {
        const erros = {}; 
        const eNum = Number(investExpansao) || 0;
        
        if (pNumTotal < 0) erros.producao = 'Produção total não pode ser negativa.';
        else if (pNumTotal > capacidadeAtual) erros.producao = `Produção total (${formatNumber(pNumTotal)}) excede capacidade (${formatNumber(capacidadeAtual)} unid.).`;
        
        if (eNum < 0) erros.expansao='Negativo?'; 
        else if (custoLote > 0 && eNum % custoLote !== 0) erros.expansao = `Múltiplo de ${formatBRL(custoLote)}`;
        
        setErroForm(erros); return Object.keys(erros).length === 0;
    };
    
    // MUDANÇA: Salva os dois campos de produção
    const handleSave = async () => {
        setLoading(true); setFeedback(''); setErroForm({});
        if (!validarCampos()) { setLoading(false); setFeedback('Erros no form.'); return; }
        try {
            await setDoc(decisaoRef, { 
                Rodada: rodadaDecisao, 
                Producao_Planejada_S1: pNumS1, 
                Producao_Planejada_S2: pNumS2,
                Invest_Expansao_Fabrica: Number(investExpansao) || 0, 
            }, { merge: true });
            setFeedback('Salvo!'); setTimeout(() => setFeedback(''), 3000);
        } catch (error) { console.error("Erro:", error); setFeedback('Falha.'); }
        setLoading(false);
    };
    
    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in">
            <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">3. Decisões de Operações</h3>
            <fieldset className="space-y-3" disabled={isSubmetido}>
                <legend className="text-xl font-semibold text-gray-200 mb-2">Produção (OPEX)</legend>
                
                {/* MUDANÇA: Card de Informações de Custo/Capacidade */}
                <div className="bg-gray-900 p-4 rounded-lg mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-gray-300">Capacidade Atual:</p>
                        <p className="font-bold text-cyan-400 text-lg">{formatNumber(capacidadeAtual)} <span className="text-sm">Unid.</span></p>
                    </div>
                    <div>
                        <p className="text-gray-300">Produção Total Planejada:</p>
                        <p className={`font-bold text-lg ${pNumTotal > capacidadeAtual ? 'text-red-400' : 'text-white'}`}>{formatNumber(pNumTotal)} <span className="text-sm">Unid.</span></p>
                    </div>
                    <div>
                        <p className="text-gray-300">Custo Total da Produção:</p>
                        <p className="font-bold text-yellow-400 text-lg">{formatBRL(custoTotalProjetado)}</p>
                    </div>
                    {/* Custo unitário por segmento */}
                    <div className="md:col-span-3 grid grid-cols-2 gap-4">
                         <div className="bg-gray-800 p-2 rounded"><p className="text-gray-300 text-xs">Custo Unit. {simulacao.Segmento1_Nome}:</p><p className="font-bold text-cyan-400 text-base">{formatBRL(custoUnitarioProjetadoS1)}</p></div>
                         <div className="bg-gray-800 p-2 rounded"><p className="text-gray-300 text-xs">Custo Unit. {simulacao.Segmento2_Nome}:</p><p className="font-bold text-cyan-400 text-base">{formatBRL(custoUnitarioProjetadoS2)}</p></div>
                    </div>
                </div>

                {/* MUDANÇA: Dois inputs de produção */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputNumericoMasked 
                        id="Producao_Planejada_S1" 
                        name="Producao_Planejada_S1" 
                        label={`Produção - ${simulacao.Segmento1_Nome}`}
                        value={producaoPlanejadaS1} 
                        onChange={handleProducaoS1Change} 
                        onBlur={validarCampos} 
                        sufixo="Unid." required disabled={isSubmetido} />
                    <InputNumericoMasked 
                        id="Producao_Planejada_S2" 
                        name="Producao_Planejada_S2" 
                        label={`Produção - ${simulacao.Segmento2_Nome}`}
                        value={producaoPlanejadaS2} 
                        onChange={handleProducaoS2Change} 
                        onBlur={validarCampos} 
                        sufixo="Unid." required disabled={isSubmetido} />
                </div>
                {erroForm.producao && <p className="text-red-400 text-sm mt-1">{erroForm.producao}</p>}
            </fieldset>
            
            <fieldset className="space-y-3 pt-4 border-t border-gray-700" disabled={isSubmetido}>
                <legend className="text-xl font-semibold text-gray-200 mb-2">Expansão (CAPEX)</legend>
                <div className="bg-gray-900 p-4 rounded-lg mb-4"> <p className="text-gray-300 text-sm"> Cada lote custa <span className="font-semibold text-cyan-400">{formatBRL(custoLote)}</span> e adiciona <span className="font-semibold text-cyan-400"> {formatNumber(incrementoLote)}</span> unid. à capacidade da <span className="font-bold text-white">próxima rodada</span>. </p> </div>
                <InputMoedaMasked id="Invest_Expansao_Fabrica" name="Invest_Expansao_Fabrica" label="Investir em Expansão (R$)" value={investExpansao} onChange={handleExpansaoChange} onBlur={validarCampos} disabled={isSubmetido} />
                {erroForm.expansao && <p className="text-red-400 text-sm mt-1">{erroForm.expansao}</p>}
            </fieldset>
            {!isSubmetido && feedback && <p className={`text-sm text-center font-medium ${feedback.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{feedback}</p>}
            {!isSubmetido && ( <div className="text-right mt-6"> <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-6 rounded-lg disabled:opacity-50" disabled={loading}> {loading ? 'Salvando...' : 'Salvar Operações'} </button> </div> )}
        </div>
    );
}

// =================================================================
// MUDANÇA: AbaMarketing
// =================================================================
function AbaMarketing({ simulacao, estadoRodada, decisoes, decisaoRef, rodadaDecisao, isSubmetido, custoUnitarioProjetadoS1, custoUnitarioProjetadoS2 }) {
    const [precoSeg1, setPrecoSeg1] = useState(''); const [mktSeg1, setMktSeg1] = useState(''); const [precoSeg2, setPrecoSeg2] = useState(''); const [mktSeg2, setMktSeg2] = useState('');
    const [loading, setLoading] = useState(false); const [feedback, setFeedback] = useState(''); const [modalAjudaVisivel, setModalAjudaVisivel] = useState(false);
    
    // MUDANÇA: Lógica de Markup usa os custos segmentados
    const markupSeg1 = custoUnitarioProjetadoS1 > 0 && (Number(precoSeg1) || 0) > 0
        ? (((Number(precoSeg1) / custoUnitarioProjetadoS1) - 1) * 100)
        : 0;
    const markupSeg2 = custoUnitarioProjetadoS2 > 0 && (Number(precoSeg2) || 0) > 0
        ? (((Number(precoSeg2) / custoUnitarioProjetadoS2) - 1) * 100)
        : 0;

    // Custo antigo (R-1) ainda é útil para referência
    const custoUnitarioAnteriorS1 = estadoRodada?.Custo_Unitario_S1 || 0;
    const custoUnitarioAnteriorS2 = estadoRodada?.Custo_Unitario_S2 || 0;

    useEffect(() => { setPrecoSeg1(decisoes.Preco_Segmento_1 || ''); setMktSeg1(decisoes.Marketing_Segmento_1 || ''); setPrecoSeg2(decisoes.Preco_Segmento_2 || ''); setMktSeg2(decisoes.Marketing_Segmento_2 || ''); }, [decisoes]);
    const handlePreco1Change = (e) => setPrecoSeg1(e.target.value); const handleMkt1Change = (e) => setMktSeg1(e.target.value); const handlePreco2Change = (e) => setPrecoSeg2(e.target.value); const handleMkt2Change = (e) => setMktSeg2(e.target.value);
    const handleSave = async () => { setLoading(true); setFeedback(''); try { await setDoc(decisaoRef, { Rodada: rodadaDecisao, Preco_Segmento_1: Number(precoSeg1) || 0, Marketing_Segmento_1: Number(mktSeg1) || 0, Preco_Segmento_2: Number(precoSeg2) || 0, Marketing_Segmento_2: Number(mktSeg2) || 0, }, { merge: true }); setFeedback('Salvo!'); setTimeout(() => setFeedback(''), 3000); } catch (error) { console.error("Erro:", error); setFeedback('Falha.'); } setLoading(false); };
     const formatBRLDisplay = (num) => (Number(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const textoAjudaMarketing = `O investimento em Marketing aumenta a atratividade do seu produto no segmento escolhido, ajudando a conquistar Market Share. O efeito tem retornos decrescentes (investir o dobro não necessariamente dobra o impacto).\n\nReferência: Compare seu investimento com o dos concorrentes (quando disponível) e analise os pesos de Marketing para cada segmento na rodada atual para guiar sua decisão.`;
    
    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in">
            <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">4. Decisões de Marketing</h3>
            
            {/* MUDANÇA: Card de custos de referência */}
            <div className="bg-gray-900 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-gray-300">Custo Unit. {simulacao?.Segmento1_Nome} (R{estadoRodada?.Rodada ?? 0}):</p>
                    <p className="font-bold text-white text-lg">{formatBRLDisplay(custoUnitarioAnteriorS1)}</p>
                </div>
                 <div>
                    <p className="text-gray-300">Custo Unit. {simulacao?.Segmento2_Nome} (R{estadoRodada?.Rodada ?? 0}):</p>
                    <p className="font-bold text-white text-lg">{formatBRLDisplay(custoUnitarioAnteriorS2)}</p>
                </div>
                <div>
                    <p className="text-gray-300">Custo Unit. Projetado {simulacao?.Segmento1_Nome} (Base):</p>
                    <p className="font-bold text-cyan-400 text-lg">{formatBRLDisplay(custoUnitarioProjetadoS1)}</p>
                </div>
                <div>
                    <p className="text-gray-300">Custo Unit. Projetado {simulacao?.Segmento2_Nome} (Base):</p>
                    <p className="font-bold text-cyan-400 text-lg">{formatBRLDisplay(custoUnitarioProjetadoS2)}</p>
                </div>
            </div>

            <fieldset className="space-y-4 pt-4 border-t border-gray-700" disabled={isSubmetido}>
                <legend className="text-xl font-semibold text-gray-200 mb-2">Segmento: {simulacao?.Segmento1_Nome || 'Seg. 1'}</legend>
                <div> 
                    <h4 className="text-lg font-medium text-gray-400 mb-2">Precificação</h4> 
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
                        <InputMoedaMasked id="Preco_Segmento_1" name="Preco_Segmento_1" label="Preço Venda (R$)" value={precoSeg1} onChange={handlePreco1Change} required disabled={isSubmetido} /> 
                        <div className="pt-7">
                            <span className="text-xs text-gray-400">Markup Projetado (vs Custo S1): </span>
                            <span className={`text-lg font-semibold ${markupSeg1 < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {markupSeg1.toFixed(1)}%
                            </span>
                        </div>
                    </div> 
                </div>
                <div className="pt-4 border-t border-gray-600"> <h4 className="text-lg font-medium text-gray-400 mb-2 flex items-center"> Investimento em Marketing <span onClick={() => setModalAjudaVisivel(true)} className="cursor-pointer"><IconeInfo /></span> </h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <InputMoedaMasked id="Marketing_Segmento_1" name="Marketing_Segmento_1" label="Investimento Total (R$)" value={mktSeg1} onChange={handleMkt1Change} required disabled={isSubmetido} /> </div> </div>
            </fieldset>
            
            <fieldset className="space-y-4 pt-4 border-t border-gray-700" disabled={isSubmetido}>
                <legend className="text-xl font-semibold text-gray-200 mb-2">Segmento: {simulacao?.Segmento2_Nome || 'Seg. 2'}</legend>
                <div> 
                    <h4 className="text-lg font-medium text-gray-400 mb-2">Precificação</h4> 
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
                        <InputMoedaMasked id="Preco_Segmento_2" name="Preco_Segmento_2" label="Preço Venda (R$)" value={precoSeg2} onChange={handlePreco2Change} required disabled={isSubmetido} /> 
                        <div className="pt-7">
                            <span className="text-xs text-gray-400">Markup Projetado (vs Custo S2): </span>
                            <span className={`text-lg font-semibold ${markupSeg2 < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {markupSeg2.toFixed(1)}%
                            </span>
                        </div>
                    </div> 
                </div>
                <div className="pt-4 border-t border-gray-600"> <h4 className="text-lg font-medium text-gray-400 mb-2 flex items-center"> Investimento em Marketing <span onClick={() => setModalAjudaVisivel(true)} className="cursor-pointer"><IconeInfo /></span> </h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <InputMoedaMasked id="Marketing_Segmento_2" name="Marketing_Segmento_2" label="Investimento Total (R$)" value={mktSeg2} onChange={handleMkt2Change} required disabled={isSubmetido} /> </div> </div>
            </fieldset>
            
            {!isSubmetido && feedback && <p className={`text-sm text-center font-medium ${feedback.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{feedback}</p>}
            {!isSubmetido && ( <div className="text-right mt-6"> <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-6 rounded-lg disabled:opacity-50" disabled={loading}> {loading ? 'Salvando...' : 'Salvar Marketing'} </button> </div> )}
            {modalAjudaVisivel && ( <ModalAjuda titulo="Investimento em Marketing" texto={textoAjudaMarketing} onClose={() => setModalAjudaVisivel(false)} /> )}
        </div>
    );
}

// --- Componente da Aba Finanças --- (Inalterado)
function AbaFinancas({ simulacao, estadoRodada, decisoes, decisaoRef, rodadaDecisao, isSubmetido, rodadaRelatorio }) {
    const [tomarCP, setTomarCP] = useState('');
    const [tomarLP, setTomarLP] = useState('');
    const [amortizarLP, setAmortizarLP] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [erroForm, setErroForm] = useState({});
    const [modalAjudaVisivel, setModalAjudaVisivel] = useState(false);

    const caixaAtual = estadoRodada?.Caixa || 0;
    const dividaCPVencendo = estadoRodada?.Divida_CP || 0;
    const dividaLPSaldo = estadoRodada?.Divida_LP_Saldo || 0;
    const dividaEmergenciaVencendo = estadoRodada?.Divida_Emergencia || 0;
    const prazoRestanteLP = estadoRodada?.Divida_LP_Rodadas_Restantes ?? 0;

    useEffect(() => {
        setTomarCP(decisoes.Tomar_Emprestimo_CP || '');
        setTomarLP(decisoes.Tomar_Financiamento_LP || '');
        setAmortizarLP(decisoes.Amortizar_Divida_LP || '');
    }, [decisoes]);

    const handleTomarCPChange = (e) => setTomarCP(e.target.value);
    const handleTomarLPChange = (e) => setTomarLP(e.target.value);
    const handleAmortizarLPChange = (e) => setAmortizarLP(e.target.value);
    const formatBRLDisplay = (num) => (Number(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const validarCampos = () => {
        const erros = {};
        const amortizarNum = Number(amortizarLP) || 0;
        const tomarCPNum = Number(tomarCP) || 0;
        const tomarLPNum = Number(tomarLP) || 0;
        if (amortizarNum < 0) erros.amortizar = 'Negativo?';
        if (amortizarNum > dividaLPSaldo) erros.amortizar = `Excede saldo devedor LP (${formatBRLDisplay(dividaLPSaldo)}).`;
        if (tomarCPNum < 0) erros.tomarCP = 'Negativo?';
        if (tomarLPNum < 0) erros.tomarLP = 'Negativo?';
        setErroForm(erros);
        return Object.keys(erros).length === 0;
    };
    const handleSave = async () => {
        setLoading(true); setFeedback(''); setErroForm({});
        if (!validarCampos()) { setLoading(false); setFeedback('Erros no form.'); return; }
        try {
            await setDoc(decisaoRef, {
                Rodada: rodadaDecisao,
                Tomar_Emprestimo_CP: Number(tomarCP) || 0,
                Tomar_Financiamento_LP: Number(tomarLP) || 0,
                Amortizar_Divida_LP: Number(amortizarLP) || 0,
                Emprestimo_Tomado: 0, Emprestimo_Pago: 0,
            }, { merge: true });
            setFeedback('Salvo!'); setTimeout(() => setFeedback(''), 3000);
        } catch (error) { console.error("Erro:", error); setFeedback('Falha.'); }
        setLoading(false);
    };

    const textoAjudaEmprestimo = `Gestão Financeira - Curto e Longo Prazo:

Empréstimo Curto Prazo (Capital de Giro):
- Custo: Taxa ALTA (${simulacao?.Taxa_Juros_Curto_Prazo ?? 'N/A'}% por rodada).
- Pagamento: 100% do principal + juros DEBITADOS AUTOMATICAMENTE no início da próxima rodada (R${rodadaDecisao}).
- Emergência: Se não houver caixa para o pagamento, o sistema força um Empréstimo de Emergência com juros PUNITIVOS (${simulacao?.Taxa_Juros_Emergencia ?? 'N/A'}%).

Financiamento Longo Prazo (Investimento):
- Custo: Taxa MENOR (${simulacao?.Taxa_Juros_Longo_Prazo ?? 'N/A'}% por rodada), sobre o saldo devedor.
- Pagamento: Automático em ${simulacao?.Prazo_Fixo_Longo_Prazo ?? 'N/A'} parcelas (Principal + Juros).
- Amortização Adicional: Use "Amortizar LP" para pagar parte do saldo principal antecipadamente e reduzir juros futuros.`;

    // --- CÁLCULO DAS PROJEÇÕES DE PAGAMENTO (NOVO) ---
    const forecastData = useMemo(() => {
        const forecast = [];
        const taxaJurosCP = (simulacao.Taxa_Juros_Curto_Prazo || 0) / 100;
        const taxaJurosLP = (simulacao.Taxa_Juros_Longo_Prazo || 0) / 100;
        const prazoLP = simulacao.Prazo_Fixo_Longo_Prazo || 4;

        // 1. Simular Novo Empréstimo CP (vence na próxima rodada)
        const novoCPNum = Number(tomarCP) || 0;
        if (novoCPNum > 0) {
            const juros = novoCPNum * taxaJurosCP;
            const total = novoCPNum + juros;
            forecast.push({
                rodada: rodadaDecisao + 1,
                tipo: 'Curto Prazo (Novo)',
                principal: novoCPNum,
                juros: juros,
                total: total
            });
        }

        // 2. Simular Dívida de Longo Prazo (Existente + Nova - Amortização)
        const amortizacaoAdicional = Number(amortizarLP) || 0;
        const novoLPNum = Number(tomarLP) || 0;
        let saldoDevedorLP = (estadoRodada.Divida_LP_Saldo || 0) - amortizacaoAdicional + novoLPNum;
        
        let rodadasRestantes;
        if (novoLPNum > 0) {
            rodadasRestantes = prazoLP;
        } else {
            rodadasRestantes = estadoRodada.Divida_LP_Rodadas_Restantes || 0;
        }

        if (saldoDevedorLP < 0) saldoDevedorLP = 0;
        if (saldoDevedorLP === 0) rodadasRestantes = 0;

        let saldoRemanescente = saldoDevedorLP;
        for (let i = 1; i <= rodadasRestantes; i++) {
            const rodadaVencimento = rodadaDecisao + i;
            const principal = saldoDevedorLP / rodadasRestantes;
            const juros = saldoRemanescente * taxaJurosLP;
            const total = principal + juros;

            forecast.push({
                rodada: rodadaVencimento,
                tipo: 'Longo Prazo',
                principal: principal,
                juros: juros,
                total: total
            });

            saldoRemanescente -= principal;
        }

        forecast.sort((a, b) => a.rodada - b.rodada);
        return forecast;

    }, [tomarCP, tomarLP, amortizarLP, estadoRodada, simulacao, rodadaDecisao]);
    // --- FIM DO NOVO CÁLCULO ---

    const forecastTotals = useMemo(() => {
        if (!forecastData || forecastData.length === 0) {
            return { principal: 0, juros: 0, total: 0 };
        }
        return forecastData.reduce((acc, item) => {
            acc.principal += item.principal;
            acc.juros += item.juros;
            acc.total += item.total;
            return acc;
        }, { principal: 0, juros: 0, total: 0 });
    }, [forecastData]);

    const parcelaPrincipalLPProxima = (dividaLPSaldo > 0 && prazoRestanteLP > 0) ? dividaLPSaldo / prazoRestanteLP : 0;
    const taxaJurosLPCalc = (simulacao?.Taxa_Juros_Longo_Prazo / 100) || 0;
    const jurosLPProximaRodada = dividaLPSaldo * taxaJurosLPCalc;
    const parcelaTotalLPProxima = parcelaPrincipalLPProxima + jurosLPProximaRodada;
    const taxaJurosCPCalc = (simulacao?.Taxa_Juros_Curto_Prazo / 100) || 0;
    const taxaJurosEmerg = (simulacao?.Taxa_Juros_Emergencia / 100) || 0;
    const jurosCPProximo = dividaCPVencendo * taxaJurosCPCalc;
    const jurosEmergProximo = dividaEmergenciaVencendo * taxaJurosEmerg;
    const pagamentoObrigatorioProximo = dividaCPVencendo + jurosCPProximo + dividaEmergenciaVencendo + jurosEmergProximo + parcelaTotalLPProxima;

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in">
            <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">5. Decisões Financeiras</h3>
            <div className="bg-gray-900 p-4 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                 <p className="text-gray-300">Caixa Atual: <span className="font-bold text-cyan-400">{formatBRLDisplay(caixaAtual)}</span></p>
                 <p className="text-gray-300">Dívida CP (Vence R{rodadaDecisao}): <span className="font-bold text-yellow-400">{formatBRLDisplay(dividaCPVencendo)}</span></p>
                 <p className="text-gray-300">Saldo Devedor LP: <span className="font-bold text-red-400">{formatBRLDisplay(dividaLPSaldo)}</span> ({prazoRestanteLP} R)</p>
                 {dividaEmergenciaVencendo > 0 && <p className="text-red-500 font-semibold md:col-span-3 text-center text-xs">Atenção: Dívida de Emergência de {formatBRLDisplay(dividaEmergenciaVencendo)} vence R{rodadaDecisao} com juros de {simulacao?.Taxa_Juros_Emergencia}%!</p>}
            </div>
             <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 p-3 rounded-lg text-sm">
                 <span className="font-semibold">Pagamento Obrigatório (Início R{rodadaDecisao}):</span> {formatBRLDisplay(pagamentoObrigatorioProximo)}
                 <span className="text-xs ml-1">(Dívida CP/Emerg. R{rodadaRelatorio} + Juros + Parcela LP)</span>
                 <span onClick={() => setModalAjudaVisivel(true)} className="inline-block ml-1 cursor-pointer align-middle"><IconeInfo /></span>
             </div>
            <fieldset className="space-y-4 pt-4 border-t border-gray-700" disabled={isSubmetido}>
                 <legend className="text-xl font-semibold text-gray-200 mb-2 flex items-center">
                     Decisões (Para Rodada {rodadaDecisao})
                     <span onClick={() => setModalAjudaVisivel(true)} className="inline-block ml-1"><IconeInfo /></span>
                 </legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputMoedaMasked id="Tomar_Emprestimo_CP" name="Tomar_Emprestimo_CP" label="Tomar Curto Prazo (R$)" value={tomarCP} onChange={handleTomarCPChange} onBlur={validarCampos} disabled={isSubmetido} />
                    <InputMoedaMasked id="Tomar_Financiamento_LP" name="Tomar_Financiamento_LP" label="Tomar Longo Prazo (R$)" value={tomarLP} onChange={handleTomarLPChange} onBlur={validarCampos} disabled={isSubmetido} />
                    <InputMoedaMasked id="Amortizar_Divida_LP" name="Amortizar_Divida_LP" label="Amortizar LP (Adicional) (R$)" value={amortizarLP} onChange={handleAmortizarLPChange} onBlur={validarCampos} disabled={isSubmetido} />
                </div>
                 {erroForm.tomarCP && <p className="text-red-400 text-sm -mt-2">{erroForm.tomarCP}</p>}
                 {erroForm.tomarLP && <p className="text-red-400 text-sm -mt-2">{erroForm.tomarLP}</p>}
                 {erroForm.amortizar && <p className="text-red-400 text-sm -mt-2">{erroForm.amortizar}</p>}
            </fieldset>

            {!isSubmetido && (
                <div className="pt-4 border-t border-gray-700">
                    <h4 className="text-xl font-semibold text-gray-200 mb-4">Projeção de Pagamentos Futuros (Baseado nas decisões atuais)</h4>
                    {forecastData.length > 0 ? (
                        <div className="overflow-x-auto max-h-60">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                                    <tr>
                                        <th scope="col" className="py-2 px-4">Rodada Venc.</th>
                                        <th scope="col" className="py-2 px-4">Tipo</th>
                                        <th scope="col" className="py-2 px-4 text-right">Principal</th>
                                        <th scope="col" className="py-2 px-4 text-right">Juros</th>
                                        <th scope="col" className="py-2 px-4 text-right">Pagamento Total</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-800">
                                    {forecastData.map((item, index) => (
                                        <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                                            <td className="py-2 px-4 font-bold text-white">R{item.rodada}</td>
                                            <td className="py-2 px-4">{item.tipo}</td>
                                            <td className="py-2 px-4 text-right">{formatBRLDisplay(item.principal)}</td>
                                            <td className="py-2 px-4 text-right text-red-400">{formatBRLDisplay(item.juros)}</td>
                                            <td className="py-2 px-4 text-right font-semibold text-yellow-300">{formatBRLDisplay(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="text-sm font-semibold text-white bg-gray-700 sticky bottom-0">
                                    <tr>
                                        <td colSpan="2" className="py-2 px-4">Total Projetado</td>
                                        <td className="py-2 px-4 text-right">{formatBRLDisplay(forecastTotals.principal)}</td>
                                        <td className="py-2 px-4 text-right text-red-300">{formatBRLDisplay(forecastTotals.juros)}</td>
                                        <td className="py-2 px-4 text-right text-yellow-200">{formatBRLDisplay(forecastTotals.total)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">Nenhum empréstimo novo ou existente (LP) para projetar.</p>
                    )}
                </div>
            )}

            {!isSubmetido && feedback && <p className={`text-sm text-center font-medium ${feedback.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{feedback}</p>}
            {!isSubmetido && ( <div className="text-right mt-6"> <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-6 rounded-lg disabled:opacity-50" disabled={loading}> {loading ? 'Salvando...' : 'Salvar Finanças'} </button> </div> )}
            {modalAjudaVisivel && ( <ModalAjuda titulo="Ajuda: Gestão Financeira" texto={textoAjudaEmprestimo} onClose={() => setModalAjudaVisivel(false)} /> )}
        </div>
    );
}

// --- Componente da AbaOrganizacao (Inalterado) ---
function AbaOrganizacao({ simulacao, estadoRodada, decisoes, decisaoRef, rodadaDecisao, isSubmetido }) {
    const [investCapacitacao, setInvestCapacitacao] = useState('');
    const [investMktInstitucional, setInvestMktInstitucional] = useState('');
    const [investESG, setInvestESG] = useState('');
    
    const [loading, setLoading] = useState(false); const [feedback, setFeedback] = useState('');
    
    useEffect(() => { 
        setInvestCapacitacao(decisoes.Invest_Organiz_Capacitacao || ''); 
        setInvestMktInstitucional(decisoes.Invest_Organiz_Mkt_Institucional || ''); 
        setInvestESG(decisoes.Invest_Organiz_ESG || ''); 
    }, [decisoes]);

    const handleSave = async () => { 
        setLoading(true); setFeedback(''); 
        try { 
            await setDoc(decisaoRef, { 
                Rodada: rodadaDecisao, 
                Invest_Organiz_Capacitacao: Number(investCapacitacao) || 0, 
                Invest_Organiz_Mkt_Institucional: Number(investMktInstitucional) || 0, 
                Invest_Organiz_ESG: Number(investESG) || 0, 
            }, { merge: true }); 
            setFeedback('Salvo!'); setTimeout(() => setFeedback(''), 3000); 
        } catch (error) { console.error("Erro ao salvar Organização:", error); setFeedback('Falha.'); } 
        setLoading(false); 
    };
    
    const handleInvestChange = (setter) => (e) => { setter(e.target.value); };
     const formatBRLDisplay = (num) => (Number(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const caixaProjetado = useMemo(() => {
        const caixaInicial = estadoRodada?.Caixa || 0;
        
        const investExpansao = decisoes.Invest_Expansao_Fabrica || 0;
        const totalInvestMkt = (decisoes.Marketing_Segmento_1 || 0) + (decisoes.Marketing_Segmento_2 || 0);
        const amortizarLPNum = decisoes.Amortizar_Divida_LP || 0;
        const tomarCPNum = decisoes.Tomar_Emprestimo_CP || 0;
        const tomarLPNum = decisoes.Tomar_Financiamento_LP || 0;

        const totalInvestPD = (Number(decisoes.Invest_PD_Camera) || 0) + 
                              (Number(decisoes.Invest_PD_Bateria) || 0) + 
                              (Number(decisoes.Invest_PD_Sist_Operacional_e_IA) || 0) + 
                              (Number(decisoes.Invest_PD_Atualizacao_Geral) || 0);

        const taxaInflacaoRodada = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4;
        const custoFixoBase = (simulacao.Custo_Fixo_Operacional || 0);
        const custoFixoCorrigido = custoFixoBase * Math.pow(1 + taxaInflacaoRodada, rodadaDecisao - 1); 

        const investOrganizAtual = (Number(decisoes.Invest_Organiz_Capacitacao) || 0) + 
                                   (Number(decisoes.Invest_Organiz_Mkt_Institucional) || 0) + 
                                   (Number(decisoes.Invest_Organiz_ESG) || 0);

        const caixaProjetadoBase = (estadoRodada?.Caixa || 0) 
                                        + tomarCPNum + tomarLPNum 
                                        - investExpansao - totalInvestMkt - amortizarLPNum 
                                        - custoFixoCorrigido
                                        - totalInvestPD; 

        return caixaProjetadoBase - investOrganizAtual;

    }, [estadoRodada, decisoes, simulacao, rodadaDecisao]);
    
    const corCaixa = caixaProjetado < 0 ? 'text-red-400' : 'text-green-400';

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in">
            <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">6. Decisões Organizacionais (ESG, Pessoas, Marca)</h3>
            
            <p className="text-sm text-yellow-300 bg-yellow-900 p-3 rounded-lg -mt-4">
                <span className="font-bold">Atenção:</span> Estes investimentos são de longo prazo. O retorno (Bônus no IDG) é baseado no valor <span className="font-bold">ACUMULADO</span> ao longo de várias rodadas.
            </p>

            <div className="bg-gray-900 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-400">Caixa Projetado (Pré-Produção - Baseado em dados SALVOS)</p>
                <p className={`text-xl font-bold ${corCaixa}`}>{formatBRLDisplay(caixaProjetado)}</p>
                <p className="text-xs text-gray-500 mt-1">(Caixa Atual + Financiamentos Salvos - Outros Invest. Salvos - Custo Fixo - P&D Salvo - Org. Salvo)</p>
            </div>

            <fieldset className="space-y-4" disabled={isSubmetido}>
                <InputMoedaMasked 
                    id="Invest_Organiz_Capacitacao" 
                    name="Invest_Organiz_Capacitacao" 
                    label="Investir em Capacitação e Pessoas (R$)" 
                    value={investCapacitacao} 
                    onChange={handleInvestChange(setInvestCapacitacao)} 
                    disabled={isSubmetido} 
                />
                 <InputMoedaMasked 
                    id="Invest_Organiz_Mkt_Institucional" 
                    name="Invest_Organiz_Mkt_Institucional" 
                    label="Investir em Marketing Institucional (Marca) (R$)" 
                    value={investMktInstitucional} 
                    onChange={handleInvestChange(setInvestMktInstitucional)} 
                    disabled={isSubmetido} 
                />
                 <InputMoedaMasked 
                    id="Invest_Organiz_ESG" 
                    name="Invest_Organiz_ESG" 
                    label="Investir em ESG (Ambiental, Social, Governança) (R$)" 
                    value={investESG} 
                    onChange={handleInvestChange(setInvestESG)} 
                    disabled={isSubmetido} 
                />
            </fieldset>
            
            {!isSubmetido && feedback && <p className={`text-sm text-center font-medium ${feedback.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{feedback}</p>}
            {!isSubmetido && ( 
                <div className="text-right mt-6"> 
                    <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-6 rounded-lg disabled:opacity-50" disabled={loading}> 
                        {loading ? 'Salvando...' : 'Salvar Organização'} 
                    </button> 
                </div> 
            )}
        </div>
    );
}

// --- Aba Concorrência (Placeholder) ---
function AbaConcorrencia({ simulacao, rodadaAtual, idSimulacao }) { return <div className="text-center text-gray-500 py-10 bg-gray-800 rounded-lg mt-6">Aba Concorrência em Construção</div>; }
// --- Aba Ranking (Placeholder) ---
function AbaRanking({ rodadaAtual, idSimulacao }) { return <div className="text-center text-gray-500 py-10 bg-gray-800 rounded-lg mt-6">Aba Ranking em Construção</div>; }

// --- Componente Principal ---
function SimuladorPainel() {
    const { simulacaoId, empresaId } = useParams();
    const [simulacao, setSimulacao] = useState(null);
    const [empresa, setEmpresa] = useState(null);
    const [estadoRodada, setEstadoRodada] = useState(null);
    const [decisoes, setDecisoes] = useState({});
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');
    const [abaAtiva, setAbaAtiva] = useState('briefing');

    const rodadaDecisao = useMemo(() => (simulacao?.Rodada_Atual ?? -1) + 1, [simulacao]);
    const rodadaRelatorio = useMemo(() => simulacao?.Rodada_Atual ?? 0, [simulacao]);

    // Efeito para carregar dados estáticos (simulação, empresa)
    useEffect(() => {
        const fetchDadosIniciais = async () => { if (!db || !simulacaoId || !empresaId) { setErro("IDs inválidos."); setLoading(false); return; } setLoading(true); setErro(''); try { const simRef = doc(db, `/artifacts/${appId}/public/data/simulacoes`, simulacaoId); const simSnap = await getDoc(simRef); if (!simSnap.exists()) throw new Error("Simulação não encontrada."); setSimulacao(simSnap.data()); const empresaRef = doc(db, `/artifacts/${appId}/public/data/simulacoes`, simulacaoId, 'empresas', empresaId); const empresaSnap = await getDoc(empresaRef); if (!empresaSnap.exists()) throw new Error("Empresa não encontrada."); setEmpresa(empresaSnap.data()); } catch (err) { console.error("Erro:", err); setErro(`Erro: ${err.message}`); setLoading(false); } }; fetchDadosIniciais();
    }, [simulacaoId, empresaId]);

     useEffect(() => {
        if (!simulacao) {
            if (!loading && !erro) {
                 setLoading(false);
            }
            return; 
        }

        if (!estadoRodada && !erro) {
             setLoading(true);
        }

         const currentRodadaRelatorio = simulacao.Rodada_Atual ?? 0;
         const currentRodadaDecisao = currentRodadaRelatorio + 1;

         const basePath = `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas/${empresaId}`;
         const estadoRef = doc(db, basePath, 'estados', currentRodadaRelatorio.toString());
         const decisaoRef = doc(db, basePath, 'decisoes', currentRodadaDecisao.toString());

         let eC=false, dC=false;
         const checkLoadingDone = () => { if (eC && dC) setLoading(false); }

         const unsubE = onSnapshot(estadoRef, (docSnap) => {
             if (docSnap.exists()) {
                 setEstadoRodada(docSnap.data());
                 if (erro.includes("Aguardando") || erro.includes("indisponíveis")) {
                     setErro(''); 
                 }
             } else {
                 if (currentRodadaRelatorio > 0) {
                     setErro(`Resultados da Rodada ${currentRodadaRelatorio} indisponíveis. Aguardando processamento...`);
                 } else {
                     setErro('');
                 }
                 setEstadoRodada(null);
             }
             eC = true; checkLoadingDone();
         }, (err) => {
             console.error("Erro no listener de estado:", err);
             setErro("Falha ao carregar dados da rodada.");
             setEstadoRodada(null);
             eC = true; checkLoadingDone();
         });


         const unsubD = onSnapshot(decisaoRef, (docSnap) => { if (docSnap.exists()) { setDecisoes(docSnap.data()); } else { const dI = { Rodada: currentRodadaDecisao, Status_Decisao: 'Pendente' }; if (!erro.includes("Simulação não encontrada") && !erro.includes("Empresa não encontrada") && eC) { setDoc(decisaoRef, dI, { merge: true }).then(() => setDecisoes(dI)).catch(err => console.error("Erro:", err)); } else { setDecisoes(dI); } } dC = true; checkLoadingDone(); }, (err) => { console.error("Erro:", err); dC = true; checkLoadingDone(); });

         return () => { unsubE(); unsubD(); };
     }, [simulacaoId, empresaId, simulacao, erro, loading]);

     // =================================================================
     // MUDANÇA: Atualização das chaves de decisão
     // =================================================================
     const chavesPorAba = { 
         rede: ['Escolha_Fornecedor_S1_Tela', 'Escolha_Fornecedor_S1_Chip', 'Escolha_Fornecedor_S2_Tela', 'Escolha_Fornecedor_S2_Chip'], 
         pd: ['Invest_PD_Camera', 'Invest_PD_Bateria', 'Invest_PD_Sist_Operacional_e_IA', 'Invest_PD_Atualizacao_Geral'], 
         operacoes: ['Producao_Planejada_S1', 'Producao_Planejada_S2', 'Invest_Expansao_Fabrica'], 
         marketing: ['Preco_Segmento_1', 'Marketing_Segmento_1', 'Preco_Segmento_2', 'Marketing_Segmento_2'], 
         financas: ['Tomar_Emprestimo_CP', 'Tomar_Financiamento_LP', 'Amortizar_Divida_LP'], 
         organizacao: ['Invest_Organiz_Capacitacao', 'Invest_Organiz_Mkt_Institucional', 'Invest_Organiz_ESG'],
         sumario: [], 
     };
     const abasDecisao = [ 
         { id: 'rede', label: '1. Rede', chaves: chavesPorAba.rede }, 
         { id: 'pd', label: '2. P&D', chaves: chavesPorAba.pd }, 
         { id: 'operacoes', label: '3. Operações', chaves: chavesPorAba.operacoes }, 
         { id: 'marketing', label: '4. Marketing', chaves: chavesPorAba.marketing }, 
         { id: 'financas', label: '5. Finanças', chaves: chavesPorAba.financas }, 
         { id: 'organizacao', label: '6. Organização', chaves: chavesPorAba.organizacao },
         { id: 'sumario', label: 'Submissão', chaves: chavesPorAba.sumario },
     ];
     // =================================================================

     const abasRelatorio = [ { id: 'briefing', label: 'Briefing e Resultados' }, ];
     const abasDecisaoCompletas = useMemo(() => { const c = {}; abasDecisao.forEach(a => { c[a.id] = a.chaves.every(k => decisoes[k] !== undefined && decisoes[k] !== null && decisoes[k] !== ''); }); c['sumario'] = abasDecisao.every(a => a.id === 'sumario' || c[a.id]); return c; }, [decisoes, abasDecisao]);
     const isSubmetido = decisoes?.Status_Decisao === 'Submetido';
     useEffect(() => { if (isSubmetido && abasDecisao.some(a => a.id === abaAtiva)) { setAbaAtiva('briefing'); } }, [isSubmetido, abaAtiva, abasDecisao]);

    
    // =================================================================
    // MUDANÇA: Cálculo de Custo Unitário Projetado agora é segmentado
    // =================================================================
    const { custoUnitarioProjetadoS1, custoUnitarioProjetadoS2 } = useMemo(() => {
        if (!simulacao || !decisoes) return { custoUnitarioProjetadoS1: 0, custoUnitarioProjetadoS2: 0 };
        
        // Custo Base (Inflacionado)
        const taxaInflacaoRodada = (simulacao.Taxa_Base_Inflacao || 0) / 100 / 4;
        const cvmb = (simulacao.Custo_Variavel_Montagem_Base || 0);
        const custoVariavelMontagemCorrigido = cvmb * Math.pow(1 + taxaInflacaoRodada, rodadaDecisao - 1); 

        // Custo S1
        const ct_s1 = (decisoes.Escolha_Fornecedor_S1_Tela === 'A') ? (simulacao.Fornecedor_S1_Tela_A_Custo || 0) : (simulacao.Fornecedor_S1_Tela_B_Custo || 0);
        const cc_s1 = (decisoes.Escolha_Fornecedor_S1_Chip === 'C') ? (simulacao.Fornecedor_S1_Chip_C_Custo || 0) : (simulacao.Fornecedor_S1_Chip_D_Custo || 0);
        const custoUnitarioProjetadoS1 = custoVariavelMontagemCorrigido + ct_s1 + cc_s1;

        // Custo S2
        const ct_s2 = (decisoes.Escolha_Fornecedor_S2_Tela === 'A') ? (simulacao.Fornecedor_S2_Tela_A_Custo || 0) : (simulacao.Fornecedor_S2_Tela_B_Custo || 0);
        const cc_s2 = (decisoes.Escolha_Fornecedor_S2_Chip === 'C') ? (simulacao.Fornecedor_S2_Chip_C_Custo || 0) : (simulacao.Fornecedor_S2_Chip_D_Custo || 0);
        const custoUnitarioProjetadoS2 = custoVariavelMontagemCorrigido + ct_s2 + cc_s2;

        return { custoUnitarioProjetadoS1, custoUnitarioProjetadoS2 };
    }, [simulacao, decisoes, rodadaDecisao]);
    // =================================================================


    if (loading || !simulacao || !empresa) {
        return <div className="text-center p-10 text-gray-400 animate-pulse">Carregando dados da simulação...</div>;
    }

    if (erro && (erro.includes("Simulação não encontrada") || erro.includes("Empresa não encontrada"))) { 
        return ( <div className="text-center p-10 text-red-400 bg-red-900 rounded-lg max-w-2xl mx-auto mt-10"> <h2 className="text-xl font-bold mb-2">Erro</h2> <p>{erro}</p> <Link to="/simulador/aluno" className="mt-4 inline-block text-cyan-400 hover:underline">&larr; Voltar</Link> </div> ); 
    }
    
    if (erro && !estadoRodada && rodadaRelatorio > 0) {
        return ( <div className="text-center p-10 text-yellow-400 bg-yellow-900 rounded-lg max-w-2xl mx-auto mt-10"> <h2 className="text-xl font-bold mb-2">{simulacao.Nome_Simulacao}</h2> <p>{erro}</p> <Link to="/simulador/aluno" className="mt-4 inline-block text-cyan-400 hover:underline">&larr; Voltar</Link> </div> );
    }

    const decisaoRef = doc(db, `/artifacts/${appId}/public/data/simulacoes`, simulacaoId, 'empresas', empresaId, 'decisoes', rodadaDecisao.toString());

    return (
        <div className="animate-fade-in pb-10">
             <header className="mb-6 md:mb-8"> <h1 className="text-2xl md:text-3xl font-bold text-cyan-400">Painel: {empresa.Nome_Empresa}</h1> <p className="text-sm md:text-base text-gray-400 mt-1"> Simulação: {simulacao.Nome_Simulacao} | Rodada <span className="font-bold text-white">{rodadaRelatorio}</span> / {simulacao.Total_Rodadas} <span className="mx-2">|</span> Status: <span className="font-semibold text-white">{simulacao.Status}</span> </p> <Link to="/simulador/aluno" className="text-sm text-cyan-400 hover:underline mt-1 inline-block">&larr; Voltar</Link> </header>
             
             <nav className="flex flex-wrap justify-center bg-gray-800 rounded-lg p-2 mb-6 md:mb-8 gap-2 sticky top-0 z-10 shadow">
                {abasRelatorio.map(tab => ( <button key={tab.id} onClick={() => setAbaAtiva(tab.id)} className={`flex items-center justify-center px-3 py-2 rounded-md font-semibold flex-grow transition-colors text-xs md:text-sm whitespace-nowrap ${abaAtiva === tab.id ? 'bg-cyan-500 text-white shadow-md' : 'bg-gray-700 hover:bg-cyan-600 text-gray-300'}`}> {tab.label} </button> ))}
                {!isSubmetido && <div className="w-full md:w-auto md:border-l border-gray-600 md:mx-2 hidden md:block"></div>}
                {!isSubmetido && estadoRodada && abasDecisao.map(tab => ( <button key={tab.id} onClick={() => setAbaAtiva(tab.id)} className={`flex items-center justify-center px-3 py-2 rounded-md font-semibold flex-grow transition-colors text-xs md:text-sm whitespace-nowrap ${abaAtiva === tab.id ? 'bg-cyan-500 text-white shadow-md' : 'bg-gray-700 hover:bg-cyan-600 text-gray-300'}`}> {tab.label} {abasDecisaoCompletas[tab.id] && tab.id !== 'sumario' && <IconeCheck />} {tab.id === 'sumario' && abasDecisaoCompletas['sumario'] && <IconeCheck />} </button> ))}
             </nav>

             <main className="mb-8">
                 {abaAtiva === 'briefing' && (
                     <ResultadosBriefing
                         simulacao={simulacao}
                         simulacaoId={simulacaoId}
                         empresaId={empresaId}
                         rodadaRelatorio={rodadaRelatorio}
                         rodadaDecisao={rodadaDecisao}
                     />
                 )}
                 {!isSubmetido && estadoRodada ? (
                     <>
                        {/* MUDANÇA: Passando os custos S1 e S2 para as abas */}
                         {abaAtiva === 'rede' && <AbaRedeNegocios simulacao={simulacao} decisoes={decisoes} decisaoRef={decisaoRef} rodadaDecisao={rodadaDecisao} isSubmetido={isSubmetido} custoUnitarioProjetadoS1={custoUnitarioProjetadoS1} custoUnitarioProjetadoS2={custoUnitarioProjetadoS2} />}
                         
                         {abaAtiva === 'pd' && <AbaPD simulacao={simulacao} estadoRodada={estadoRodada} decisoes={decisoes} decisaoRef={decisaoRef} rodadaDecisao={rodadaDecisao} isSubmetido={isSubmetido} />}
                         
                         {abaAtiva === 'operacoes' && <AbaOperacoes simulacao={simulacao} estadoRodada={estadoRodada} decisoes={decisoes} decisaoRef={decisaoRef} rodadaDecisao={rodadaDecisao} isSubmetido={isSubmetido} custoUnitarioProjetadoS1={custoUnitarioProjetadoS1} custoUnitarioProjetadoS2={custoUnitarioProjetadoS2} />}
                         
                         {abaAtiva === 'marketing' && <AbaMarketing simulacao={simulacao} estadoRodada={estadoRodada} decisoes={decisoes} decisaoRef={decisaoRef} rodadaDecisao={rodadaDecisao} isSubmetido={isSubmetido} custoUnitarioProjetadoS1={custoUnitarioProjetadoS1} custoUnitarioProjetadoS2={custoUnitarioProjetadoS2} />}
                         
                         {abaAtiva === 'financas' && <AbaFinancas simulacao={simulacao} estadoRodada={estadoRodada} decisoes={decisoes} decisaoRef={decisaoRef} rodadaDecisao={rodadaDecisao} isSubmetido={isSubmetido} rodadaRelatorio={rodadaRelatorio} />}
                         
                         {abaAtiva === 'organizacao' && <AbaOrganizacao simulacao={simulacao} estadoRodada={estadoRodada} decisoes={decisoes} decisaoRef={decisaoRef} rodadaDecisao={rodadaDecisao} isSubmetido={isSubmetido} />}

                         {abaAtiva === 'sumario' && (
                             <SumarioDecisoes
                                 simulacao={simulacao}
                                 estadoRodada={estadoRodada}
                                 decisoes={decisoes}
                                 decisaoRef={decisaoRef}
                                 rodadaDecisoes={rodadaDecisao}
                                 rodadaRelatorio={rodadaRelatorio}
                                 custoUnitarioProjetadoS1={custoUnitarioProjetadoS1} 
                                 custoUnitarioProjetadoS2={custoUnitarioProjetadoS2}
                             />
                         )}
                     </>
                 ) : !isSubmetido && !estadoRodada && abasDecisao.some(a => a.id === abaAtiva) ? (
                     <div className="text-center text-yellow-400 py-10 bg-gray-800 rounded-lg shadow-lg mt-6 animate-fade-in">
                         <p className="text-lg font-semibold">Aguardando início da simulação.</p>
                         <p className="mt-2 text-gray-300">Você só pode tomar decisões após o Mestre do Jogo iniciar a Rodada 1.</p>
                     </div>
                 ) : (
                     (abasDecisao.some(a => a.id === abaAtiva)) && (
                         <div className="text-center text-green-400 py-10 bg-gray-800 rounded-lg shadow-lg mt-6 animate-fade-in">
                             <p className="text-lg font-semibold">Decisões da Rodada {rodadaDecisao} submetidas.</p>
                             <p className="mt-2 text-gray-300">Aguarde o processamento.</p>
                         </div>
                     )
                 )}
                 {abaAtiva === 'concorrencia' && <AbaConcorrencia simulacao={simulacao} rodadaAtual={rodadaRelatorio} idSimulacao={simulacaoId} />}
                 {abaAtiva === 'ranking' && <AbaRanking rodadaAtual={rodadaRelatorio} idSimulacao={simulacaoId} />}
             </main>
        </div>
    );
}

export default SimuladorPainel;