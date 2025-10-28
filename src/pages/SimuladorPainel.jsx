import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, updateDoc, collection, getDocs } from 'firebase/firestore';
// CORREÇÃO v10: Assumindo que a estrutura é /src/pages/SimuladorPainel.jsx e /src/firebase/config.js
// Esta é a estrutura de importação mais comum nos seus arquivos.
import { db, appId } from '../firebase/config.js';
// import useCollection from '../hooks/useCollection'; // Descomente se for usar AbaRanking/Concorrencia
// import ModalConfirmacao from '../components/ModalConfirmacao'; // Descomente se for usar
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

// --- Componente Input com Máscara Monetária (v7 - Lógica de Reais Inteiros) ---
const InputMoedaMasked = ({ id, label, value: externalValue, onChange, disabled = false, ...props }) => {
    const formatNumber = (num) => {
        if (num === null || num === undefined || num === '' || isNaN(Number(num))) return '';
        return Number(num).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };
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
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm pointer-events-none">R$</span>
                <input type="text" inputMode="numeric" id={id} name={props.name || id} value={displayValue} onChange={handleChange}
                    className={`w-full bg-gray-700 p-2 pl-10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="0" disabled={disabled} {...props} />
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

// --- Componente RelatorioFinanceiro (Atualizado para Balanço) ---
function RelatorioFinanceiro({ titulo, dados, isBalanco = false }) {
    const formatarBRL = (num) => { if (num === null || num === undefined) return '-'; const valorNumerico = Number(num); const cor = valorNumerico < 0 ? 'text-red-400' : 'text-white'; return ( <span className={cor}>{valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> ); };
    const getRowStyle = (label) => { if (!label) return ""; if (label.startsWith('(=)') || label.startsWith('Subtotal') || label.startsWith('Total')) { return "font-semibold border-t border-gray-600 pt-1"; } if (label.startsWith('(-)') || label.startsWith('(+)') ) { return "pl-2"; } return ""; };
    return ( <div className="bg-gray-700 p-4 rounded-lg shadow"> <h4 className="font-semibold text-lg text-cyan-400 mb-3 border-b border-gray-600 pb-2">{titulo}</h4> <div className="space-y-1 text-sm"> {dados.map(([label, valor], index) => ( <div key={`${label}-${index}`} className={`flex justify-between items-center py-1 ${getRowStyle(label)} ${label?.includes('---') ? 'border-t border-dashed border-gray-600 mt-1 pt-1' : 'border-b border-gray-600 last:border-b-0'}`}> <span className="text-gray-300">{label ? label.replace(/^[(=)\-+ ]+|[ ]+$/g, '') : ''}:</span> <span className="font-medium">{formatarBRL(valor)}</span> </div> ))} {isBalanco && dados.length > 0 && ( <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-cyan-500 text-xs"> <span className="text-gray-400 font-semibold">Total Ativo = Total Passivo + PL ?</span> </div> )} </div> </div> );
}

// --- NOVO COMPONENTE: ResumoDecisoesRodada ---
function ResumoDecisoesRodada({ decisoes }) {
    if (!decisoes || Object.keys(decisoes).length === 0 || decisoes.Status_Decisao === 'Pendente') {
        return (
            <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow mt-6">
                <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">
                    <span role="img" aria-label="Clipboard" className="mr-2">📋</span> Decisões da Rodada Anterior
                </h3>
                <p className="text-gray-500 text-center py-4">Nenhuma decisão registrada para esta rodada.</p>
            </div>
        );
    }

    const formatBRL = (num) => (Number(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatNum = (num) => (Number(num) || 0).toLocaleString('pt-BR');

    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow mt-6">
            <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2">
                <span role="img" aria-label="Clipboard" className="mr-2">📋</span> Decisões Tomadas (Rodada {decisoes.Rodada})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                {/* Rede */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Rede</h4>
                    <p className="text-gray-400">Tela: <span className="font-medium text-white">Opção {decisoes.Escolha_Fornecedor_Tela || '?'}</span></p>
                    <p className="text-gray-400">Chip: <span className="font-medium text-white">Opção {decisoes.Escolha_Fornecedor_Chip || '?'}</span></p>
                </div>
                {/* P&D */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">P&D (Investimento)</h4>
                    <p className="text-gray-400">Câmera: <span className="font-medium text-white">{formatBRL(decisoes.Invest_PD_Camera)}</span></p>
                    <p className="text-gray-400">Bateria: <span className="font-medium text-white">{formatBRL(decisoes.Invest_PD_Bateria)}</span></p>
                    <p className="text-gray-400">IA: <span className="font-medium text-white">{formatBRL(decisoes.Invest_PD_IA)}</span></p>
                </div>
                {/* Operações */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Operações</h4>
                    <p className="text-gray-400">Produção: <span className="font-medium text-white">{formatNum(decisoes.Producao_Planejada)} unid.</span></p>
                    <p className="text-gray-400">Expansão: <span className="font-medium text-white">{formatBRL(decisoes.Invest_Expansao_Fabrica)}</span></p>
                </div>
                {/* Marketing */}
                <div className="bg-gray-700 p-4 rounded-lg md:col-span-1 lg:col-span-1">
                    <h4 className="font-semibold text-gray-200 mb-2">Marketing (Seg. Premium)</h4>
                    <p className="text-gray-400">Preço: <span className="font-medium text-white">{formatBRL(decisoes.Preco_Segmento_1)}</span></p>
                    <p className="text-gray-400">Investimento: <span className="font-medium text-white">{formatBRL(decisoes.Marketing_Segmento_1)}</span></p>
                </div>
                 <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Marketing (Seg. Massa)</h4>
                    <p className="text-gray-400">Preço: <span className="font-medium text-white">{formatBRL(decisoes.Preco_Segmento_2)}</span></p>
                    <p className="text-gray-400">Investimento: <span className="font-medium text-white">{formatBRL(decisoes.Marketing_Segmento_2)}</span></p>
                </div>
                {/* Finanças */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-200 mb-2">Finanças</h4>
                    <p className="text-gray-400">Tomar CP: <span className="font-medium text-white">{formatBRL(decisoes.Tomar_Emprestimo_CP)}</span></p>
                    <p className="text-gray-400">Tomar LP: <span className="font-medium text-white">{formatBRL(decisoes.Tomar_Financiamento_LP)}</span></p>
                    <p className="text-gray-400">Amortizar LP: <span className="font-medium text-white">{formatBRL(decisoes.Amortizar_Divida_LP)}</span></p>
                </div>
            </div>
        </div>
    );
}

// --- Componente AbaRedeNegocios --- (Inalterado)
function AbaRedeNegocios({ simulacao, decisoes, decisaoRef, rodadaDecisao, isSubmetido }) {
    const [decisaoFornecedorTela, setDecisaoFornecedorTela] = useState(''); const [decisaoFornecedorChip, setDecisaoFornecedorChip] = useState(''); const [loading, setLoading] = useState(false); const [feedback, setFeedback] = useState(''); useEffect(() => { setDecisaoFornecedorTela(decisoes.Escolha_Fornecedor_Tela || ''); setDecisaoFornecedorChip(decisoes.Escolha_Fornecedor_Chip || ''); }, [decisoes]); const handleSave = async () => { setLoading(true); setFeedback(''); if (!decisaoFornecedorTela || !decisaoFornecedorChip) { setFeedback('Selecione opções.'); setLoading(false); return; } try { await setDoc(decisaoRef, { Rodada: rodadaDecisao, Escolha_Fornecedor_Tela: decisaoFornecedorTela, Escolha_Fornecedor_Chip: decisaoFornecedorChip, }, { merge: true }); setFeedback('Salvo!'); setTimeout(() => setFeedback(''), 3000); } catch (error) { console.error("Erro:", error); setFeedback('Falha.'); } setLoading(false); }; const formatCustoUnitario = (custo) => { if (custo === null || custo === undefined || isNaN(custo)) return 'N/A'; return Number(custo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'}); }
    return ( <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in"> <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">1. Decisões de Rede</h3> <fieldset className="space-y-3" disabled={isSubmetido}> <legend className="text-xl font-semibold text-gray-200 mb-2">Fornecedor de Telas</legend> <label className={`block p-4 rounded-lg border-2 transition-colors ${decisaoFornecedorTela === 'A' ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-900 hover:border-cyan-700'} ${isSubmetido ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}> <input type="radio" name="fornecedor_tela" value="A" checked={decisaoFornecedorTela === 'A'} onChange={(e) => setDecisaoFornecedorTela(e.target.value)} className="hidden" disabled={isSubmetido} /> <span className="font-bold text-lg text-white">Opção A</span> <p className="text-sm text-gray-300 mt-1">{simulacao.Fornecedor_Tela_A_Desc}</p> <p className="text-lg font-semibold text-cyan-300 mt-1">Custo: {formatCustoUnitario(simulacao.Fornecedor_Tela_A_Custo)}/unid.</p> </label> <label className={`block p-4 rounded-lg border-2 transition-colors ${decisaoFornecedorTela === 'B' ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-900 hover:border-cyan-700'} ${isSubmetido ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}> <input type="radio" name="fornecedor_tela" value="B" checked={decisaoFornecedorTela === 'B'} onChange={(e) => setDecisaoFornecedorTela(e.target.value)} className="hidden" disabled={isSubmetido} /> <span className="font-bold text-lg text-white">Opção B</span> <p className="text-sm text-gray-300 mt-1">{simulacao.Fornecedor_Tela_B_Desc}</p> <p className="text-lg font-semibold text-cyan-300 mt-1">Custo: {formatCustoUnitario(simulacao.Fornecedor_Tela_B_Custo)}/unid.</p> </label> </fieldset> <fieldset className="space-y-3" disabled={isSubmetido}> <legend className="text-xl font-semibold text-gray-200 mb-2">Fornecedor de Chips</legend> <label className={`block p-4 rounded-lg border-2 transition-colors ${decisaoFornecedorChip === 'C' ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-900 hover:border-cyan-700'} ${isSubmetido ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}> <input type="radio" name="fornecedor_chip" value="C" checked={decisaoFornecedorChip === 'C'} onChange={(e) => setDecisaoFornecedorChip(e.target.value)} className="hidden" disabled={isSubmetido}/> <span className="font-bold text-lg text-white">Opção C</span> <p className="text-sm text-gray-300 mt-1">{simulacao.Fornecedor_Chip_C_Desc}</p> <p className="text-lg font-semibold text-cyan-300 mt-1">Custo: {formatCustoUnitario(simulacao.Fornecedor_Chip_C_Custo)}/unid.</p> </label> <label className={`block p-4 rounded-lg border-2 transition-colors ${decisaoFornecedorChip === 'D' ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-900 hover:border-cyan-700'} ${isSubmetido ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}> <input type="radio" name="fornecedor_chip" value="D" checked={decisaoFornecedorChip === 'D'} onChange={(e) => setDecisaoFornecedorChip(e.target.value)} className="hidden" disabled={isSubmetido}/> <span className="font-bold text-lg text-white">Opção D</span> <p className="text-sm text-gray-300 mt-1">{simulacao.Fornecedor_Chip_D_Desc}</p> <p className="text-lg font-semibold text-cyan-300 mt-1">Custo: {formatCustoUnitario(simulacao.Fornecedor_Chip_D_Custo)}/unid.</p> </label> </fieldset> {!isSubmetido && feedback && <p className={`text-sm text-center font-medium ${feedback.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{feedback}</p>} {!isSubmetido && ( <div className="text-right mt-6"> <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50" disabled={loading}> {loading ? 'Salvando...' : 'Salvar Decisão da Rede'} </button> </div> )} </div> );
}

// --- Componente da Aba P&D --- (Inalterado)
function AbaPD({ simulacao, estadoRodada, decisoes, decisaoRef, rodadaDecisao, isSubmetido }) {
    const [investCamera, setInvestCamera] = useState(''); const [investBateria, setInvestBateria] = useState(''); const [investIA, setInvestIA] = useState('');
    const [loading, setLoading] = useState(false); const [feedback, setFeedback] = useState('');
    useEffect(() => { setInvestCamera(decisoes.Invest_PD_Camera || ''); setInvestBateria(decisoes.Invest_PD_Bateria || ''); setInvestIA(decisoes.Invest_PD_IA || ''); }, [decisoes]);
    const getCustoProximoNivel = (area, nivelAtual) => { if (nivelAtual >= 5) return { custo: 0, proximoNivel: 5 }; const pN = nivelAtual + 1; const key = `Custo_PD_${area}_Nivel_${pN}`; return { custo: simulacao[key] || 0, proximoNivel: pN }; };
    const areasPD = [ { idInput: 'Invest_PD_Camera', label: 'Câmera', nivelAtual: estadoRodada?.Nivel_PD_Camera || 1, progresso: estadoRodada?.Progresso_PD_Camera || 0, value: investCamera, setValue: setInvestCamera, idArea: 'Camera' }, { idInput: 'Invest_PD_Bateria', label: 'Bateria', nivelAtual: estadoRodada?.Nivel_PD_Bateria || 1, progresso: estadoRodada?.Progresso_PD_Bateria || 0, value: investBateria, setValue: setInvestBateria, idArea: 'Bateria' }, { idInput: 'Invest_PD_IA', label: 'IA', nivelAtual: estadoRodada?.Nivel_PD_IA || 1, progresso: estadoRodada?.Progresso_PD_IA || 0, value: investIA, setValue: setInvestIA, idArea: 'IA' }, ];
    const handleSave = async () => { setLoading(true); setFeedback(''); try { await setDoc(decisaoRef, { Rodada: rodadaDecisao, Invest_PD_Camera: Number(investCamera) || 0, Invest_PD_Bateria: Number(investBateria) || 0, Invest_PD_IA: Number(investIA) || 0, }, { merge: true }); setFeedback('Salvo!'); setTimeout(() => setFeedback(''), 3000); } catch (error) { console.error("Erro:", error); setFeedback('Falha.'); } setLoading(false); };
    const handleInvestChange = (setter) => (e) => { setter(e.target.value); };
    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in">
            <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">2. Decisões de P&D</h3>
            {areasPD.map(area => {
                const { custo, proximoNivel } = getCustoProximoNivel(area.idArea, area.nivelAtual);
                const progressoPercent = custo > 0 ? Math.min(100, (area.progresso / custo) * 100) : (area.nivelAtual >= 5 ? 100 : 0);
                const formatBRLDisplay = (num) => (num || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'});
                return (
                    <div key={area.idInput} className="pt-4 border-t border-gray-700">
                        <h4 className="text-xl font-semibold text-gray-200 mb-2">{area.label} - Nível: {area.nivelAtual}</h4>
                        {area.nivelAtual < 5 ? (
                            <>
                                <div className="mb-1 text-sm text-gray-400">Progresso Nível {proximoNivel}:</div>
                                <div className="w-full bg-gray-600 rounded-full h-4 mb-1 relative overflow-hidden"> <div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${progressoPercent}%` }}></div> <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white px-2"> {formatBRLDisplay(area.progresso)} / {formatBRLDisplay(custo)} ({progressoPercent.toFixed(0)}%) </span> </div>
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

// --- Componente da Aba Operações --- (Inalterado)
function AbaOperacoes({ simulacao, estadoRodada, decisoes, decisaoRef, rodadaDecisao, isSubmetido }) {
    const [producaoPlanejada, setProducaoPlanejada] = useState(''); const [investExpansao, setInvestExpansao] = useState('');
    const [loading, setLoading] = useState(false); const [feedback, setFeedback] = useState(''); const [erroForm, setErroForm] = useState({});
    const capacidadeAtual = estadoRodada?.Capacidade_Fabrica || 0; const custoLote = simulacao?.Custo_Expansao_Lote || 0; const incrementoLote = simulacao?.Incremento_Capacidade_Lote || 0;
    useEffect(() => { setProducaoPlanejada(decisoes.Producao_Planejada || ''); setInvestExpansao(decisoes.Invest_Expansao_Fabrica || ''); }, [decisoes]);
    const handleProducaoChange = (e) => setProducaoPlanejada(e.target.value); const handleExpansaoChange = (e) => setInvestExpansao(e.target.value);
    const formatBRL = (num) => (num || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const formatNumber = (num) => (num || 0).toLocaleString('pt-BR');
    const validarCampos = () => {
        const erros = {}; const pNum = Number(producaoPlanejada) || 0; const eNum = Number(investExpansao) || 0;
        if (pNum < 0) erros.producao='Negativo?'; else if (pNum > capacidadeAtual) erros.producao = `Excede ${formatNumber(capacidadeAtual)} unid.`;
        if (eNum < 0) erros.expansao='Negativo?'; else if (custoLote > 0 && eNum % custoLote !== 0) erros.expansao = `Múltiplo de ${formatBRL(custoLote)}`;
        setErroForm(erros); return Object.keys(erros).length === 0;
    };
    const handleSave = async () => {
        setLoading(true); setFeedback(''); setErroForm({});
        if (!validarCampos()) { setLoading(false); setFeedback('Erros no form.'); return; }
        try {
            await setDoc(decisaoRef, { Rodada: rodadaDecisao, Producao_Planejada: Number(producaoPlanejada) || 0, Invest_Expansao_Fabrica: Number(investExpansao) || 0, }, { merge: true });
            setFeedback('Salvo!'); setTimeout(() => setFeedback(''), 3000);
        } catch (error) { console.error("Erro:", error); setFeedback('Falha.'); }
        setLoading(false);
    };
    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in">
            <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">3. Decisões de Operações</h3>
            <fieldset className="space-y-3" disabled={isSubmetido}>
                <legend className="text-xl font-semibold text-gray-200 mb-2">Produção (OPEX)</legend>
                <div className="bg-gray-900 p-4 rounded-lg mb-4"> <p className="text-gray-300"> Capacidade Atual: <span className="font-bold text-cyan-400">{formatNumber(capacidadeAtual)}</span> unid. </p> </div>
                <InputNumericoMasked id="Producao_Planejada" name="Producao_Planejada" label="Unidades a Produzir" value={producaoPlanejada} onChange={handleProducaoChange} onBlur={validarCampos} sufixo="Unid." required disabled={isSubmetido} />
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

// --- Componente da Aba Marketing (AJUSTADO) --- (Inalterado)
function AbaMarketing({ simulacao, estadoRodada, decisoes, decisaoRef, rodadaDecisao, isSubmetido }) {
    const [precoSeg1, setPrecoSeg1] = useState(''); const [mktSeg1, setMktSeg1] = useState(''); const [precoSeg2, setPrecoSeg2] = useState(''); const [mktSeg2, setMktSeg2] = useState('');
    const [loading, setLoading] = useState(false); const [feedback, setFeedback] = useState(''); const [modalAjudaVisivel, setModalAjudaVisivel] = useState(false);
    const custoUnitarioProjetado = useMemo(() => { if (!simulacao || !decisoes) return 0; const ct = (decisoes.Escolha_Fornecedor_Tela === 'A') ? (simulacao.Fornecedor_Tela_A_Custo || 0) : (simulacao.Fornecedor_Tela_B_Custo || 0); const cc = (decisoes.Escolha_Fornecedor_Chip === 'C') ? (simulacao.Fornecedor_Chip_C_Custo || 0) : (simulacao.Fornecedor_Chip_D_Custo || 0); const cb = ct + cc; const cvmb = (simulacao.Custo_Variavel_Montagem_Base || 0); return cvmb + cb; }, [simulacao, decisoes.Escolha_Fornecedor_Tela, decisoes.Escolha_Fornecedor_Chip]);
    const custoUnitarioAnterior = estadoRodada?.Custo_Variavel_Unitario_Medio || 0;
    useEffect(() => { setPrecoSeg1(decisoes.Preco_Segmento_1 || ''); setMktSeg1(decisoes.Marketing_Segmento_1 || ''); setPrecoSeg2(decisoes.Preco_Segmento_2 || ''); setMktSeg2(decisoes.Marketing_Segmento_2 || ''); }, [decisoes]);
    const handlePreco1Change = (e) => setPrecoSeg1(e.target.value); const handleMkt1Change = (e) => setMktSeg1(e.target.value); const handlePreco2Change = (e) => setPrecoSeg2(e.target.value); const handleMkt2Change = (e) => setMktSeg2(e.target.value);
    const handleSave = async () => { setLoading(true); setFeedback(''); try { await setDoc(decisaoRef, { Rodada: rodadaDecisao, Preco_Segmento_1: Number(precoSeg1) || 0, Marketing_Segmento_1: Number(mktSeg1) || 0, Preco_Segmento_2: Number(precoSeg2) || 0, Marketing_Segmento_2: Number(mktSeg2) || 0, }, { merge: true }); setFeedback('Salvo!'); setTimeout(() => setFeedback(''), 3000); } catch (error) { console.error("Erro:", error); setFeedback('Falha.'); } setLoading(false); };
    const formatBRLDisplay = (num) => (num || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'});
    const textoAjudaMarketing = `O investimento em Marketing aumenta a atratividade... \nReferência: Compare seu investimento...`;
    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in">
            <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">4. Decisões de Marketing</h3>
            <div className="bg-gray-900 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <p className="text-gray-300"> Custo Unit. (Rodada {estadoRodada?.Rodada ?? 0}): <span className="font-bold text-white">{formatBRLDisplay(custoUnitarioAnterior)}</span> </p>
                <p className="text-gray-300"> Custo Unit. Projetado (Base): <span className="font-bold text-cyan-400">{formatBRLDisplay(custoUnitarioProjetado)}</span> <span onClick={() => alert('Custo projetado = Custo Montagem Base + Custos Fornecedores (Aba 1). O custo real final será impactado pela inflação da rodada.')} className="inline-block ml-1 cursor-pointer align-middle"><IconeInfo /></span> </p>
            </div>
            <fieldset className="space-y-4 pt-4 border-t border-gray-700" disabled={isSubmetido}>
                <legend className="text-xl font-semibold text-gray-200 mb-2">Segmento: {simulacao?.Segmento1_Nome || 'Seg. 1'}</legend>
                <div> <h4 className="text-lg font-medium text-gray-400 mb-2">Precificação</h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <InputMoedaMasked id="Preco_Segmento_1" name="Preco_Segmento_1" label="Preço Venda (R$)" value={precoSeg1} onChange={handlePreco1Change} required disabled={isSubmetido} /> </div> </div>
                <div className="pt-4 border-t border-gray-600"> <h4 className="text-lg font-medium text-gray-400 mb-2 flex items-center"> Investimento em Marketing <span onClick={() => setModalAjudaVisivel(true)} className="cursor-pointer"><IconeInfo /></span> </h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <InputMoedaMasked id="Marketing_Segmento_1" name="Marketing_Segmento_1" label="Investimento Total (R$)" value={mktSeg1} onChange={handleMkt1Change} required disabled={isSubmetido} /> </div> </div>
            </fieldset>
            <fieldset className="space-y-4 pt-4 border-t border-gray-700" disabled={isSubmetido}>
                <legend className="text-xl font-semibold text-gray-200 mb-2">Segmento: {simulacao?.Segmento2_Nome || 'Seg. 2'}</legend>
                <div> <h4 className="text-lg font-medium text-gray-400 mb-2">Precificação</h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <InputMoedaMasked id="Preco_Segmento_2" name="Preco_Segmento_2" label="Preço Venda (R$)" value={precoSeg2} onChange={handlePreco2Change} required disabled={isSubmetido} /> </div> </div>
                <div className="pt-4 border-t border-gray-600"> <h4 className="text-lg font-medium text-gray-400 mb-2 flex items-center"> Investimento em Marketing <span onClick={() => setModalAjudaVisivel(true)} className="cursor-pointer"><IconeInfo /></span> </h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <InputMoedaMasked id="Marketing_Segmento_2" name="Marketing_Segmento_2" label="Investimento Total (R$)" value={mktSeg2} onChange={handleMkt2Change} required disabled={isSubmetido} /> </div> </div>
            </fieldset>
            {!isSubmetido && feedback && <p className={`text-sm text-center font-medium ${feedback.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{feedback}</p>}
            {!isSubmetido && ( <div className="text-right mt-6"> <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-6 rounded-lg disabled:opacity-50" disabled={loading}> {loading ? 'Salvando...' : 'Salvar Marketing'} </button> </div> )}
            {modalAjudaVisivel && ( <ModalAjuda titulo="Investimento em Marketing" texto={textoAjudaMarketing} onClose={() => setModalAjudaVisivel(false)} /> )}
        </div>
    );
}

// --- Componente da Aba Finanças (ATUALIZADO) --- (Inalterado)
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
    const formatBRLDisplay = (num) => (num || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'});

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

    const parcelaPrincipalLPProxima = (dividaLPSaldo > 0 && prazoRestanteLP > 0) ? dividaLPSaldo / prazoRestanteLP : 0;
    const taxaJurosLP = (simulacao?.Taxa_Juros_Longo_Prazo / 100) || 0;
    const jurosLPProximaRodada = dividaLPSaldo * taxaJurosLP;
    const parcelaTotalLPProxima = parcelaPrincipalLPProxima + jurosLPProximaRodada;
    const taxaJurosCP = (simulacao?.Taxa_Juros_Curto_Prazo / 100) || 0;
    const taxaJurosEmerg = (simulacao?.Taxa_Juros_Emergencia / 100) || 0;
    const jurosCPProximo = dividaCPVencendo * taxaJurosCP;
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
            {!isSubmetido && feedback && <p className={`text-sm text-center font-medium ${feedback.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{feedback}</p>}
            {!isSubmetido && ( <div className="text-right mt-6"> <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-6 rounded-lg disabled:opacity-50" disabled={loading}> {loading ? 'Salvando...' : 'Salvar Finanças'} </button> </div> )}
            {modalAjudaVisivel && ( <ModalAjuda titulo="Ajuda: Gestão Financeira" texto={textoAjudaEmprestimo} onClose={() => setModalAjudaVisivel(false)} /> )}
        </div>
    );
}


// --- Componente Sumário e Submissão (ATUALIZADO) ---
// CORREÇÃO: Adicionando rodadaRelatorio como prop
function SumarioDecisoes({ simulacao, estadoRodada, decisoes, decisaoRef, rodadaDecisao, rodadaRelatorio }) {
    const [loading, setLoading] = useState(false); const [feedback, setFeedback] = useState(''); const [showConfirm, setShowConfirm] = useState(false);

    // ** NOVO: Estado para o slider de estimativa de vendas **
    const [percentualVendasEstimado, setPercentualVendasEstimado] = useState(80); // Começa em 80%

    // Cálculos de Projeção (usando novos nomes de decisão)
    const caixaInicial = estadoRodada?.Caixa || 0;
    const totalInvestPD = (Number(decisoes.Invest_PD_Camera) || 0) + (Number(decisoes.Invest_PD_Bateria) || 0) + (Number(decisoes.Invest_PD_IA) || 0);
    const totalInvestExpansao = Number(decisoes.Invest_Expansao_Fabrica) || 0;
    const totalInvestMkt = (Number(decisoes.Marketing_Segmento_1) || 0) + (Number(decisoes.Marketing_Segmento_2) || 0);
    const tomarCPNum = Number(decisoes.Tomar_Emprestimo_CP) || 0;
    const tomarLPNum = Number(decisoes.Tomar_Financiamento_LP) || 0;
    const amortizarLPNum = Number(decisoes.Amortizar_Divida_LP) || 0;
    const producaoPlanejadaNum = Number(decisoes.Producao_Planejada) || 0;

    const custoUnitarioProjetado = useMemo(() => { if (!simulacao || !decisoes) return 0; const ct = (decisoes.Escolha_Fornecedor_Tela === 'A') ? (simulacao.Fornecedor_Tela_A_Custo || 0) : (simulacao.Fornecedor_Tela_B_Custo || 0); const cc = (decisoes.Escolha_Fornecedor_Chip === 'C') ? (simulacao.Fornecedor_Chip_C_Custo || 0) : (simulacao.Fornecedor_Chip_D_Custo || 0); const cb = ct + cc; const cvmb = (simulacao.Custo_Variavel_Montagem_Base || 0); return cvmb + cb; }, [simulacao, decisoes.Escolha_Fornecedor_Tela, decisoes.Escolha_Fornecedor_Chip]);
    const custoTotalProducaoProjetado = producaoPlanejadaNum * custoUnitarioProjetado;

    const caixaProjetadoPreProducao = caixaInicial + tomarCPNum + tomarLPNum - totalInvestPD - totalInvestExpansao - totalInvestMkt - amortizarLPNum;
    const caixaProjetadoPosProducao = caixaProjetadoPreProducao - custoTotalProducaoProjetado;

    // ** NOVO: Cálculo da Projeção de Vendas **
    const { receitaProjetada, caixaProjetadoPosVenda } = useMemo(() => {
        const unidadesVender = producaoPlanejadaNum * (percentualVendasEstimado / 100);
        
        // Cálculo do Preço Médio Ponderado (baseado 50/50 nos preços, ou 100% se um for 0)
        const preco1 = Number(decisoes.Preco_Segmento_1) || 0;
        const preco2 = Number(decisoes.Preco_Segmento_2) || 0;
        let precoMedio = 0;
        if (preco1 > 0 && preco2 > 0) {
            precoMedio = (preco1 + preco2) / 2;
        } else {
            precoMedio = preco1 + preco2; // Se um for 0, usa o outro
        }

        const receitaProjetada = unidadesVender * precoMedio;
        const caixaProjetadoPosVenda = caixaProjetadoPosProducao + receitaProjetada;
        
        return { receitaProjetada, caixaProjetadoPosVenda };
    }, [producaoPlanejadaNum, percentualVendasEstimado, decisoes.Preco_Segmento_1, decisoes.Preco_Segmento_2, caixaProjetadoPosProducao]);


    const formatBRLDisplay = (num) => (num || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'});
    
    const todasDecisoesPreenchidas = useMemo(() => {
        const chavesObrigatorias = [
            'Escolha_Fornecedor_Tela', 'Escolha_Fornecedor_Chip',
            'Invest_PD_Camera', 'Invest_PD_Bateria', 'Invest_PD_IA',
            'Producao_Planejada', 'Invest_Expansao_Fabrica',
            'Preco_Segmento_1', 'Marketing_Segmento_1',
            'Preco_Segmento_2', 'Marketing_Segmento_2',
            'Tomar_Emprestimo_CP', 'Tomar_Financiamento_LP', 'Amortizar_Divida_LP'
        ];
        return chavesObrigatorias.every(key => decisoes[key] !== undefined);
     }, [decisoes]);
    const handleSubmeterClick = () => { /* ... */ setFeedback(''); if (!todasDecisoesPreenchidas) { setFeedback(`Erro: Salve TODAS as abas (1 a 5) antes de submeter.`); return; } setShowConfirm(true); }; const handleConfirmarSubmissao = async () => { /* ... */ setShowConfirm(false); setLoading(true); try { await setDoc(decisaoRef, { Status_Decisao: 'Submetido', Timestamp_Submissao: serverTimestamp() }, { merge: true }); setFeedback('Decisões submetidas!'); } catch (error) { console.error("Erro:", error); setFeedback('Falha.'); } setLoading(false); }; const isSubmetido = decisoes.Status_Decisao === 'Submetido';

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6 space-y-6 animate-fade-in">
            <h3 className="text-2xl font-semibold text-cyan-400 border-b-2 border-cyan-500 pb-2">Sumário e Submissão da Rodada {rodadaDecisao}</h3>
            
            {/* Projeções ATUALIZADAS (Ponto 4) */}
            <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-300">1. Projeção de Custos e Investimentos</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">Caixa Inicial</span><span className="text-green-400 font-semibold">{formatBRLDisplay(caixaInicial)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(+) Novos Emprést. (CP+LP)</span><span className="text-green-400 font-semibold">{formatBRLDisplay(tomarCPNum + tomarLPNum)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg md:col-start-1"><span className="block text-gray-400">(-) Invest. P&D</span><span className="text-red-400 font-semibold">{formatBRLDisplay(totalInvestPD)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(-) Invest. Expansão</span><span className="text-red-400 font-semibold">{formatBRLDisplay(totalInvestExpansao)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(-) Invest. Marketing</span><span className="text-red-400 font-semibold">{formatBRLDisplay(totalInvestMkt)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(-) Amortiz. LP (Adicional)</span><span className="text-red-400 font-semibold">{formatBRLDisplay(amortizarLPNum)}</span></div>
                </div>
                 <div className="bg-gray-900 p-4 rounded-lg flex items-center justify-between flex-wrap gap-2 text-sm"> <span className="font-bold text-white">(=) Caixa Projetado (Pré-Produção):</span> <span className={`font-bold ${caixaProjetadoPreProducao >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatBRLDisplay(caixaProjetadoPreProducao)}</span> </div>
                 <div className="bg-gray-700 p-3 rounded-lg text-sm"><span className="block text-gray-400">(-) Custo Produção ({producaoPlanejadaNum.toLocaleString('pt-BR')} unid. x {formatBRLDisplay(custoUnitarioProjetado)}/unid.)</span><span className="text-red-400 font-semibold">{formatBRLDisplay(custoTotalProducaoProjetado)}</span></div>
                 <div className="bg-gray-900 p-4 rounded-lg flex items-center justify-between flex-wrap gap-2"> <span className="text-lg font-bold text-white">(=) Caixa Projetado (Pós-Produção):</span> <span className={`text-2xl font-bold ${caixaProjetadoPosProducao >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatBRLDisplay(caixaProjetadoPosProducao)}</span> </div>
                 {caixaProjetadoPosProducao < 0 && <p className="text-yellow-400 text-sm text-center font-semibold">ALERTA: Caixa projetado negativo pós-produção!</p>}
                 <p className="text-xs text-gray-500 text-center italic mt-2">Nota: Pagamentos obrigatórios de dívida (CP/Emerg. da R{rodadaRelatorio}, Parcela LP) serão debitados no início da R{rodadaDecisao} ANTES destas projeções.</p>
            </div>

            {/* NOVO: Simulador de Vendas (Ponto 4) */}
            <div className="space-y-4 pt-4 border-t border-gray-700">
                <h4 className="text-lg font-semibold text-gray-300">2. Simulação de Cenário de Vendas</h4>
                <div className="space-y-2">
                    <label htmlFor="vendasSlider" className="flex justify-between text-sm font-medium text-gray-400">
                        <span>Estimativa de Vendas (do total produzido):</span>
                        <span className="font-bold text-white text-base">{percentualVendasEstimado}%</span>
                    </label>
                    <input
                        type="range"
                        id="vendasSlider"
                        min="0"
                        max="100"
                        step="5"
                        value={percentualVendasEstimado}
                        onChange={(e) => setPercentualVendasEstimado(Number(e.target.value))}
                        disabled={isSubmetido || producaoPlanejadaNum === 0}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-lg accent-cyan-500"
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(+) Receita Bruta Estimada</span><span className="text-green-400 font-semibold">{formatBRLDisplay(receitaProjetada)}</span></div>
                    <div className="bg-gray-700 p-3 rounded-lg"><span className="block text-gray-400">(=) Caixa Projetado Pós-Venda</span><span className={`font-semibold ${caixaProjetadoPosVenda >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatBRLDisplay(caixaProjetadoPosVenda)}</span></div>
                </div>
                 <p className="text-xs text-gray-500 text-center italic mt-2">Estimativa baseada em um Preço Médio Ponderado de {formatBRLDisplay((Number(decisoes.Preco_Segmento_1 || 0) + Number(decisoes.Preco_Segmento_2 || 0)) / 2)}. O Market Share real definirá as vendas.</p>
            </div>


            {/* Feedback e Botão (inalterados) */}
            {feedback && <p className={`text-sm text-center font-medium ${feedback.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{feedback}</p>}
            <div className="text-right mt-6 pt-6 border-t border-gray-700"> <button onClick={handleSubmeterClick} className={`font-bold py-3 px-8 rounded-lg transition-colors text-lg ${ isSubmetido ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : !todasDecisoesPreenchidas ? 'bg-yellow-600 text-white cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white' }`} disabled={loading || isSubmetido || (!isSubmetido && !todasDecisoesPreenchidas)} title={!isSubmetido && !todasDecisoesPreenchidas ? "Salve TODAS as abas (1 a 5) primeiro" : (isSubmetido ? "Rodada Submetida" : "Submeter decisões")}> {isSubmetido ? 'Rodada Submetida' : (loading ? 'Enviando...' : 'Submeter Decisões da Rodada')} </button> </div>
            {/* Modal Confirmação (inalterado) */}
            {showConfirm && ( <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"> <div className="bg-gray-700 rounded-lg shadow-xl p-6 max-w-md w-full"> <h4 className="text-xl font-bold text-yellow-400 mb-4">Confirmar Submissão</h4> <p className="text-gray-300 mb-6">Submeter decisões da Rodada {rodadaDecisao}? Ação irreversível.</p> <div className="flex justify-end gap-4"> <button onClick={() => setShowConfirm(false)} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded-lg"> Cancelar </button> <button onClick={handleConfirmarSubmissao} className="bg-green-500 hover:bg-green-600 font-bold py-2 px-4 rounded-lg"> Confirmar </button> </div> </div> </div> )}
        </div>
    );
}


// --- Aba Concorrência (Placeholder) ---
function AbaConcorrencia({ simulacao, rodadaAtual, idSimulacao }) { /* ... */ return <div className="text-center text-gray-500 py-10 bg-gray-800 rounded-lg mt-6">Aba Concorrência em Construção</div>; }
// --- Aba Ranking (Placeholder) ---
function AbaRanking({ rodadaAtual, idSimulacao }) { /* ... */ return <div className="text-center text-gray-500 py-10 bg-gray-800 rounded-lg mt-6">Aba Ranking em Construção</div>; }


// --- Componente Principal (ATUALIZADO para buscar decisões anteriores) ---
function SimuladorPainel() {
    const { simulacaoId, empresaId } = useParams();
    const [simulacao, setSimulacao] = useState(null);
    const [empresa, setEmpresa] = useState(null);
    const [estadoRodada, setEstadoRodada] = useState(null);
    const [decisoes, setDecisoes] = useState({});
    // NOVO ESTADO: Armazena as decisões da rodada anterior
    const [decisoesAnteriores, setDecisoesAnteriores] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');
    const [abaAtiva, setAbaAtiva] = useState('briefing');
    
    // Cálculos das rodadas (inalterado)
    const rodadaDecisao = useMemo(() => (simulacao?.Rodada_Atual ?? -1) + 1, [simulacao]);
    const rodadaRelatorio = useMemo(() => simulacao?.Rodada_Atual ?? 0, [simulacao]);
    
    // Efeito para carregar dados estáticos (inalterado)
    useEffect(() => {
        const fetchDadosIniciais = async () => { if (!db || !simulacaoId || !empresaId) { setErro("IDs inválidos."); setLoading(false); return; } setLoading(true); setErro(''); try { const simRef = doc(db, `/artifacts/${appId}/public/data/simulacoes`, simulacaoId); const simSnap = await getDoc(simRef); if (!simSnap.exists()) throw new Error("Simulação não encontrada."); setSimulacao(simSnap.data()); const empresaRef = doc(db, `/artifacts/${appId}/public/data/simulacoes`, simulacaoId, 'empresas', empresaId); const empresaSnap = await getDoc(empresaRef); if (!empresaSnap.exists()) throw new Error("Empresa não encontrada."); setEmpresa(empresaSnap.data()); } catch (err) { console.error("Erro:", err); setErro(`Erro: ${err.message}`); setLoading(false); } }; fetchDadosIniciais();
    }, [simulacaoId, empresaId]);

     // Efeito para ouvir dados dinâmicos (estado, decisões atuais E ANTERIORES)
     useEffect(() => {
        if (!simulacao || erro.includes("Simulação não encontrada") || erro.includes("Empresa não encontrada")) { if (simulacao && loading) setLoading(false); return; }
        if(!loading) setLoading(true);

         const currentRodadaRelatorio = simulacao.Rodada_Atual ?? 0;
         const currentRodadaDecisao = currentRodadaRelatorio + 1;

         const basePath = `/artifacts/${appId}/public/data/simulacoes/${simulacaoId}/empresas/${empresaId}`;
         const estadoRef = doc(db, basePath, 'estados', currentRodadaRelatorio.toString());
         const decisaoRef = doc(db, basePath, 'decisoes', currentRodadaDecisao.toString());
         // NOVO: Referência para as decisões da rodada anterior
         const decisaoAnteriorRef = doc(db, basePath, 'decisoes', currentRodadaRelatorio.toString());

         let eC=false, dC=false, daC=false; // Flags de carregamento
         const checkLoadingDone = () => { if (eC && dC && daC) setLoading(false); }

         // Listener para Estado Atual (inalterado)
         const unsubE = onSnapshot(estadoRef, (docSnap) => { if (docSnap.exists()) { setEstadoRodada(docSnap.data()); if (!erro.includes("Simulação não encontrada") && !erro.includes("Empresa não encontrada")) setErro(''); } else { if (currentRodadaRelatorio === 0 && (simulacao.Status === 'Configurando' || !simulacao.Status)) { if (!erro.includes("Aguardando")) setErro("Aguardando Mestre do Jogo iniciar..."); } else if (currentRodadaRelatorio > 0 && !erro.includes("Simulação não encontrada") && !erro.includes("Empresa não encontrada")) { setErro(`Resultados da Rodada ${currentRodadaRelatorio} indisponíveis.`); } setEstadoRodada(null); } eC = true; checkLoadingDone(); }, (err) => { if (!erro.includes("Simulação não encontrada") && !erro.includes("Empresa não encontrada")) setErro("Falha ao carregar resultados."); eC = true; checkLoadingDone(); });
         
         // Listener para Decisões da Próxima Rodada (inalterado)
         const unsubD = onSnapshot(decisaoRef, (docSnap) => { if (docSnap.exists()) { setDecisoes(docSnap.data()); } else { const dI = { Rodada: currentRodadaDecisao, Status_Decisao: 'Pendente' }; if (!erro.includes("Simulação não encontrada") && !erro.includes("Empresa não encontrada") && eC) { setDoc(decisaoRef, dI, { merge: true }).then(() => setDecisoes(dI)).catch(err => console.error("Erro:", err)); } else { setDecisoes(dI); } } dC = true; checkLoadingDone(); }, (err) => { console.error("Erro:", err); dC = true; checkLoadingDone(); });

         // NOVO: Listener para Decisões da Rodada Anterior
         const unsubDA = onSnapshot(decisaoAnteriorRef, (docSnap) => {
             if (docSnap.exists()) {
                 setDecisoesAnteriores(docSnap.data());
             } else {
                 // É normal não existir na rodada 0 ou se houve erro
                 setDecisoesAnteriores(null); 
             }
             daC = true; // Marca como carregado (mesmo que não exista)
             checkLoadingDone();
         }, (err) => {
             console.error("Erro ao carregar decisões anteriores:", err);
             // Não seta erro geral, apenas loga. Pode não ser crítico.
             daC = true;
             checkLoadingDone();
         });

         // Função de limpeza
         return () => { unsubE(); unsubD(); unsubDA(); };
     }, [simulacaoId, empresaId, simulacao, erro]); // Removido 'loading'

     // --- Abas e Lógica de "Checks" --- (Inalterado)
     const abasRelatorio = [ { id: 'briefing', label: 'Briefing e Resultados' }, /* { id: 'concorrencia', label: 'Concorrência' }, { id: 'ranking', label: 'Ranking' }, */ ];
     const chavesPorAba = { rede: ['Escolha_Fornecedor_Tela', 'Escolha_Fornecedor_Chip'], pd: ['Invest_PD_Camera', 'Invest_PD_Bateria', 'Invest_PD_IA'], operacoes: ['Producao_Planejada', 'Invest_Expansao_Fabrica'], marketing: ['Preco_Segmento_1', 'Marketing_Segmento_1', 'Preco_Segmento_2', 'Marketing_Segmento_2'], financas: ['Tomar_Emprestimo_CP', 'Tomar_Financiamento_LP', 'Amortizar_Divida_LP'], sumario: [], }; // Atualizado financas
     const abasDecisao = [ { id: 'rede', label: '1. Rede', chaves: chavesPorAba.rede }, { id: 'pd', label: '2. P&D', chaves: chavesPorAba.pd }, { id: 'operacoes', label: '3. Operações', chaves: chavesPorAba.operacoes }, { id: 'marketing', label: '4. Marketing', chaves: chavesPorAba.marketing }, { id: 'financas', label: '5. Finanças', chaves: chavesPorAba.financas }, { id: 'sumario', label: 'Submissão', chaves: chavesPorAba.sumario }, ];
     const abasDecisaoCompletas = useMemo(() => { const c = {}; abasDecisao.forEach(a => { c[a.id] = a.chaves.every(k => decisoes[k] !== undefined); }); c['sumario'] = abasDecisao.every(a => a.id === 'sumario' || c[a.id]); return c; }, [decisoes, abasDecisao]);
     const isSubmetido = decisoes?.Status_Decisao === 'Submetido';
     useEffect(() => { if (isSubmetido && abasDecisao.some(a => a.id === abaAtiva)) { setAbaAtiva('briefing'); } }, [isSubmetido, abaAtiva, abasDecisao]);

    // ---- Renderização Principal ----
    if (loading) return <div className="text-center p-10 text-gray-400 animate-pulse">Carregando...</div>;
    // Erros (inalterado)
    if (erro && (!estadoRodada || erro.includes("Simulação não encontrada") || erro.includes("Empresa não encontrada"))) { return ( <div className="text-center p-10 text-red-400 bg-red-900 rounded-lg max-w-2xl mx-auto mt-10"> <h2 className="text-xl font-bold mb-2">Erro</h2> <p>{erro}</p> <Link to="/simulador/aluno" className="mt-4 inline-block text-cyan-400 hover:underline">&larr; Voltar</Link> </div> ); }
    if (erro && !estadoRodada) { return ( <div className="text-center p-10 text-yellow-400 bg-yellow-900 rounded-lg max-w-2xl mx-auto mt-10"> <h2 className="text-xl font-bold mb-2">{simulacao?.Nome_Simulacao || '...'}</h2> <p>{erro}</p> <Link to="/simulador/aluno" className="mt-4 inline-block text-cyan-400 hover:underline">&larr; Voltar</Link> </div> ); }
    if (!simulacao || !empresa || !estadoRodada) return <div className="text-center p-10 text-gray-400 animate-pulse">Carregando info...</div>;

    const decisaoRef = doc(db, `/artifacts/${appId}/public/data/simulacoes`, simulacaoId, 'empresas', empresaId, 'decisoes', rodadaDecisao.toString());

    // Dados DRE e Balanço (inalterado)
    const dadosDRE = [ ['(+) Receita de Vendas', estadoRodada.Vendas_Receita], ['(-) Custo Produtos Vendidos (CPV)', estadoRodada.Custo_Produtos_Vendidos], ['(=) Lucro Bruto', estadoRodada.Lucro_Bruto], ['(-) Despesas Operacionais', estadoRodada.Despesas_Operacionais], ['(=) Lucro Líquido da Rodada', estadoRodada.Lucro_Liquido], ];
    const imobilizadoLiquido = (estadoRodada.Imobilizado_Bruto || 0) - (estadoRodada.Depreciacao_Acumulada || 0);
    const ativoTotal = (estadoRodada.Caixa || 0) + (estadoRodada.Custo_Estoque_Final || 0) + imobilizadoLiquido;
    const saldoLP = estadoRodada.Divida_LP_Saldo || 0;
    const rodadasLP = estadoRodada.Divida_LP_Rodadas_Restantes || 0;
    const parcelaPrincipalLPProxima = (rodadasLP > 0) ? saldoLP / rodadasLP : 0;
    const dividaCPVencendoBalanco = estadoRodada.Divida_CP || 0;
    const dividaEmergVencendoBalanco = estadoRodada.Divida_Emergencia || 0;
    const passivoCirculante = dividaCPVencendoBalanco + dividaEmergVencendoBalanco + parcelaPrincipalLPProxima;
    const passivoNaoCirculante = saldoLP > 0 ? Math.max(0, saldoLP - parcelaPrincipalLPProxima) : 0;
    const passivoTotal = passivoCirculante + passivoNaoCirculante;
    const patrimonioLiquido = ativoTotal - passivoTotal;
    const dadosBalanco = [
        ['(+) Caixa', estadoRodada.Caixa],
        ['(+) Estoque (Custo)', estadoRodada.Custo_Estoque_Final],
        ['(+) Imobilizado (Líquido)', imobilizadoLiquido],
        ['(=) Total Ativos', ativoTotal],
        ['--- PASSIVOS E PL ---', null],
        ['(+) Dívida Curto Prazo (Venc. R'+rodadaDecisao+')', dividaCPVencendoBalanco],
        ['(+) Dívida Emergência (Venc. R'+rodadaDecisao+')', dividaEmergVencendoBalanco],
        ['(+) Parcela LP (Venc. R'+rodadaDecisao+')', parcelaPrincipalLPProxima],
        ['(=) Subtotal Passivo Circulante', passivoCirculante],
        ['(+) Saldo Dívida LP (Restante)', passivoNaoCirculante],
        ['(=) Subtotal Passivo Não Circulante', passivoNaoCirculante],
        ['(=) Total Passivos', passivoTotal],
        ['(+) Patrimônio Líquido', patrimonioLiquido],
        ['(=) Total Passivo + PL', passivoTotal + patrimonioLiquido],
    ];
    const noticiaDaRodada = simulacao[`Noticia_Rodada_${rodadaDecisao}`] || "Nenhuma notícia específica.";

    return (
        <div className="animate-fade-in pb-10">
             {/* Header */}
             <header className="mb-6 md:mb-8"> <h1 className="text-2xl md:text-3xl font-bold text-cyan-400">Painel: {empresa.Nome_Empresa}</h1> <p className="text-sm md:text-base text-gray-400 mt-1"> Simulação: {simulacao.Nome_Simulacao} | Rodada <span className="font-bold text-white">{rodadaRelatorio}</span> / {simulacao.Total_Rodadas} <span className="mx-2">|</span> Status: <span className="font-semibold text-white">{simulacao.Status}</span> </p> <Link to="/simulador/aluno" className="text-sm text-cyan-400 hover:underline mt-1 inline-block">&larr; Voltar</Link> </header>
             
             {/* Navegação por Abas com ajuste de stickiness */}
             <nav className="flex flex-wrap justify-center bg-gray-800 rounded-lg p-2 mb-6 md:mb-8 gap-2 sticky top-0 z-10 shadow"> {/* Alterado de top-4 para top-0 */}
                {abasRelatorio.map(tab => ( <button key={tab.id} onClick={() => setAbaAtiva(tab.id)} className={`flex items-center justify-center px-3 py-2 rounded-md font-semibold flex-grow transition-colors text-xs md:text-sm whitespace-nowrap ${abaAtiva === tab.id ? 'bg-cyan-500 text-white shadow-md' : 'bg-gray-700 hover:bg-cyan-600 text-gray-300'}`}> {tab.label} </button> ))} 
                {!isSubmetido && <div className="w-full md:w-auto md:border-l border-gray-600 md:mx-2 hidden md:block"></div>} 
                {!isSubmetido && abasDecisao.map(tab => ( <button key={tab.id} onClick={() => setAbaAtiva(tab.id)} className={`flex items-center justify-center px-3 py-2 rounded-md font-semibold flex-grow transition-colors text-xs md:text-sm whitespace-nowrap ${abaAtiva === tab.id ? 'bg-cyan-500 text-white shadow-md' : 'bg-gray-700 hover:bg-cyan-600 text-gray-300'}`}> {tab.label} {abasDecisaoCompletas[tab.id] && tab.id !== 'sumario' && <IconeCheck />} {tab.id === 'sumario' && abasDecisaoCompletas['sumario'] && <IconeCheck />} </button> ))} 
             </nav>
             
             {/* Conteúdo Principal (Aba Briefing agora inclui o Resumo) */}
             <main className="mb-8">
                 {abaAtiva === 'briefing' && ( 
                    <div className="space-y-6 animate-fade-in"> 
                        {/* Notícia da Rodada */}
                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 md:p-6 rounded-lg shadow"> 
                            <h3 className="text-lg md:text-xl font-semibold mb-2 text-yellow-800"> <span role="img" aria-label="Newspaper" className="mr-2">📰</span> Notícia (R{rodadaDecisao}) </h3> 
                            <p className="text-sm md:text-base whitespace-pre-wrap">{noticiaDaRodada}</p> 
                        </div> 
                        
                        {/* Resultados Financeiros e Operacionais */}
                        <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow"> 
                            <h3 className="text-xl md:text-2xl font-semibold mb-4 text-cyan-400 border-b-2 border-cyan-500 pb-2"> <span role="img" aria-label="Chart" className="mr-2">📈</span> Resultados (R{rodadaRelatorio}) </h3> 
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6"> 
                                <RelatorioFinanceiro titulo="DRE" dados={dadosDRE} /> 
                                <RelatorioFinanceiro titulo="Balanço" dados={dadosBalanco} isBalanco={true} /> 
                                <div className="bg-gray-700 p-4 rounded-lg shadow"> 
                                    <h4 className="font-semibold text-lg text-cyan-400 mb-3 border-b border-gray-600 pb-2">Operações e P&D</h4> 
                                    <ul className="space-y-2 text-sm"> <li className="flex justify-between items-center"><span className="text-gray-300">Capacidade:</span> <span className="font-medium text-white">{Number(estadoRodada.Capacidade_Fabrica || 0).toLocaleString('pt-BR')} Unid.</span></li> <li className="flex justify-between items-center"><span className="text-gray-300">Produção:</span> <span className="font-medium text-white">{Number(estadoRodada.Producao_Efetiva || 0).toLocaleString('pt-BR')} Unid.</span></li> <li className="flex justify-between items-center"><span className="text-gray-300">Estoque:</span> <span className="font-medium text-white">{Number(estadoRodada.Estoque_Final_Unidades || 0).toLocaleString('pt-BR')} Unid.</span></li> <li className="pt-2 mt-2 border-t border-gray-600 flex justify-between items-center"><span className="text-gray-300">Nível Câmera:</span> <span className="font-semibold text-cyan-300">Nível {estadoRodada.Nivel_PD_Camera || 1}</span></li> <li className="flex justify-between items-center"><span className="text-gray-300">Nível Bateria:</span> <span className="font-semibold text-cyan-300">Nível {estadoRodada.Nivel_PD_Bateria || 1}</span></li> <li className="flex justify-between items-center"><span className="text-gray-300">Nível IA:</span> <span className="font-semibold text-cyan-300">Nível {estadoRodada.Nivel_PD_IA || 1}</span></li> </ul> 
                                    {(estadoRodada.Noticia_Producao_Risco || estadoRodada.Noticia_Ruptura_Estoque || estadoRodada.Divida_Emergencia > 0) && ( <div className="mt-4 pt-3 border-t border-gray-600"> <h5 className="text-md font-semibold text-yellow-400 mb-2">Alertas da Rodada {rodadaRelatorio}:</h5> <ul className="space-y-1 text-xs text-yellow-200 list-disc list-inside"> {estadoRodada.Noticia_Producao_Risco && <li>{estadoRodada.Noticia_Producao_Risco}</li>} {estadoRodada.Noticia_Ruptura_Estoque && <li>{estadoRodada.Noticia_Ruptura_Estoque}</li>} {estadoRodada.Divida_Emergencia > 0 && <li className="text-red-400 font-semibold">Empréstimo de Emergência contraído!</li>} </ul> </div> )} 
                                </div> 
                            </div> 
                        </div> 

                        {/* NOVO: Renderiza o Resumo das Decisões Anteriores */}
                        {rodadaRelatorio > 0 && <ResumoDecisoesRodada decisoes={decisoesAnteriores} />}

                        {/* Briefing Original (inalterado) */}
                        <details className="bg-gray-800 p-4 md:p-6 rounded-lg shadow group"> 
                            <summary className="text-lg font-semibold text-cyan-400 cursor-pointer list-none flex justify-between items-center"> <span>Briefing Original</span> <span className="text-cyan-500 group-open:rotate-180 transition-transform duration-200">▼</span> </summary> 
                            <div className="mt-3 pt-3 border-t border-gray-700"> <p className="text-gray-300 text-sm whitespace-pre-wrap">{simulacao.Cenario_Inicial_Descricao || "-"}</p> </div> 
                        </details> 
                    </div> 
                 )}
                 {/* Outras abas (inalterado) */}
                 {abaAtiva === 'concorrencia' && <AbaConcorrencia simulacao={simulacao} rodadaAtual={rodadaRelatorio} idSimulacao={simulacaoId} />} {abaAtiva === 'ranking' && <AbaRanking rodadaAtual={rodadaRelatorio} idSimulacao={simulacaoId} />}
                 {!isSubmetido ? ( <> {abaAtiva === 'rede' && <AbaRedeNegocios simulacao={simulacao} decisoes={decisoes} decisaoRef={decisaoRef} rodadaDecisao={rodadaDecisao} isSubmetido={isSubmetido} />} {abaAtiva === 'pd' && <AbaPD simulacao={simulacao} estadoRodada={estadoRodada} decisoes={decisoes} decisaoRef={decisaoRef} rodadaDecisao={rodadaDecisao} isSubmetido={isSubmetido} />} {abaAtiva === 'operacoes' && <AbaOperacoes simulacao={simulacao} estadoRodada={estadoRodada} decisoes={decisoes} decisaoRef={decisaoRef} rodadaDecisao={rodadaDecisao} isSubmetido={isSubmetido} />} {abaAtiva === 'marketing' && <AbaMarketing simulacao={simulacao} estadoRodada={estadoRodada} decisoes={decisoes} decisaoRef={decisaoRef} rodadaDecisao={rodadaDecisao} isSubmetido={isSubmetido} />} {abaAtiva === 'financas' && <AbaFinancas simulacao={simulacao} estadoRodada={estadoRodada} decisoes={decisoes} decisaoRef={decisaoRef} rodadaDecisao={rodadaDecisao} isSubmetido={isSubmetido} rodadaRelatorio={rodadaRelatorio} />} {abaAtiva === 'sumario' && <SumarioDecisoes simulacao={simulacao} estadoRodada={estadoRodada} decisoes={decisoes} decisaoRef={decisaoRef} rodadaDecisao={rodadaDecisao} rodadaRelatorio={rodadaRelatorio} />} </> ) : ( (abasDecisao.some(a => a.id === abaAtiva)) && ( <div className="text-center text-green-400 py-10 bg-gray-800 rounded-lg shadow-lg mt-6 animate-fade-in"> <p className="text-lg font-semibold">Decisões da Rodada {rodadaDecisao} submetidas.</p> <p className="mt-2 text-gray-300">Aguarde o processamento.</p> </div> ) )}
            </main>
        </div>
    );
}

export default SimuladorPainel;

