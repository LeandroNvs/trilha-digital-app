import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../../firebase/config.js';

// Componente Tooltip Didático
const Tooltip = ({ text }) => (
    <div className="group relative inline-block ml-2 align-middle cursor-help">
        <svg className="w-4 h-4 text-cyan-400 hover:text-cyan-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 border border-cyan-700/50 rounded-lg p-3 text-xs w-64 font-normal text-gray-300 z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 pointer-events-none shadow-2xl leading-relaxed text-center">
            {text}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900"></div>
        </div>
    </div>
);

function Parametrizacao({ atores, selectedGroupId, grupoSelecionado }) {
    const [isLoading, setIsLoading] = useState(false);

    // Form States
    const [nome, setNome] = useState('');
    const [categoria, setCategoria] = useState('');
    const [essencialidade, setEssencialidade] = useState('');
    const [influencia, setInfluencia] = useState('');
    const [nivelInteresse, setNivelInteresse] = useState('');
    const [legitimidade, setLegitimidade] = useState('');
    const [interesse, setInteresse] = useState('');
    const [recursosAportados, setRecursosAportados] = useState('');

    const [forcaVinculo, setForcaVinculo] = useState('');
    const [natureza, setNatureza] = useState('');
    const [direcao, setDirecao] = useState('');
    const [fluxoPrincipal, setFluxoPrincipal] = useState('');

    // Modal States
    const [atorEditando, setAtorEditando] = useState(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // States do Nó Central (Identidade)
    const [isEditingCentral, setIsEditingCentral] = useState(false);
    const [centralNome, setCentralNome] = useState('');
    const [centralProposito, setCentralProposito] = useState('');
    const [isSavingCentral, setIsSavingCentral] = useState(false);

    // Atualiza os states do Central Node quando mudar o grupoSelecionado
    useEffect(() => {
        setCentralNome(grupoSelecionado?.identidadeRede?.nome || grupoSelecionado?.nome || '');
        setCentralProposito(grupoSelecionado?.identidadeRede?.proposito || '');
    }, [grupoSelecionado]);

    const handleSaveCentral = async (e) => {
        e.preventDefault();
        if(!centralNome.trim()) { alert('O Nome não pode ser vazio'); return; }
        setIsSavingCentral(true);
        try {
            const grupoRef = doc(db, `/artifacts/${appId}/public/data/grupos`, grupoSelecionado.id);
            await updateDoc(grupoRef, {
                identidadeRede: {
                    nome: centralNome.trim(),
                    proposito: centralProposito.trim()
                }
            });
            setIsEditingCentral(false);
        } catch(err) {
            console.error("Erro ao salvar Identidade Central:", err);
            alert("Erro ao salvar Identidade Central");
        } finally {
            setIsSavingCentral(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedGroupId) {
            alert("Nenhum projeto selecionado. Não é possível salvar.");
            return;
        }

        if (!nome.trim() || !categoria || !essencialidade || !influencia || !nivelInteresse || !legitimidade || !forcaVinculo || !natureza || !direcao || !fluxoPrincipal) {
            alert("Por favor, preencha todos os campos obrigatórios (com asterisco).");
            return;
        }

        setIsLoading(true);
        try {
            await addDoc(collection(db, 'rede_atores'), {
                grupoId: selectedGroupId,
                nome, categoria, essencialidade, influencia, nivelInteresse, legitimidade, interesse, recursosAportados,
                forcaVinculo, natureza, direcao, fluxoPrincipal,
                dataCriacao: serverTimestamp()
            });
            // Limpar campos
            setNome(''); setCategoria(''); setEssencialidade(''); setInfluencia(''); setNivelInteresse(''); setLegitimidade(''); setInteresse(''); setRecursosAportados('');
            setForcaVinculo(''); setNatureza(''); setDirecao(''); setFluxoPrincipal('');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar o Cadastro.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSavingEdit(true);
        try {
            const docRef = doc(db, 'rede_atores', atorEditando.id);
            await updateDoc(docRef, {
                nome: atorEditando.nome,
                categoria: atorEditando.categoria,
                essencialidade: atorEditando.essencialidade,
                influencia: atorEditando.influencia,
                nivelInteresse: atorEditando.nivelInteresse || '',
                legitimidade: atorEditando.legitimidade || '',
                interesse: atorEditando.interesse,
                recursosAportados: atorEditando.recursosAportados,
                forcaVinculo: atorEditando.forcaVinculo,
                natureza: atorEditando.natureza,
                direcao: atorEditando.direcao,
                fluxoPrincipal: atorEditando.fluxoPrincipal,
            });
            setAtorEditando(null);
        } catch (error) {
            console.error("Erro ao atualizar:", error);
            alert("Erro ao salvar! Verifique sua conexão.");
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Deseja realmente apagar este Ator da sua Rede de Negócios? Esta ação não tem volta.")) {
            try {
                await deleteDoc(doc(db, 'rede_atores', atorEditando.id));
                setAtorEditando(null);
            } catch (error) {
                console.error("Erro ao excluir:", error);
            }
        }
    };

    const estilosCardPorForca = {
        'Fraca': 'border-dashed border-2 border-gray-600 bg-gray-800/50',
        'Importante': 'border-solid border-2 border-cyan-800 bg-gray-800',
        'Crítica': 'border-solid border-[3px] border-cyan-500 bg-gray-800 shadow-[0_0_15px_rgba(6,182,212,0.15)] transform hover:-translate-y-1 transition-transform'
    };

    const getEstiloInfluencia = (nivel) => {
        switch(nivel) {
            case 'Muito Alto': return { cor: 'text-red-500', icon: '🔥', bg: 'bg-red-500/20' };
            case 'Alto': return { cor: 'text-orange-500', icon: '⚡', bg: 'bg-orange-500/20' };
            case 'Médio': return { cor: 'text-yellow-500', icon: '〰️', bg: 'bg-yellow-500/20' };
            case 'Baixo': return { cor: 'text-blue-400', icon: '💧', bg: 'bg-blue-500/20' };
            case 'Muito Baixo': return { cor: 'text-gray-500', icon: '❄️', bg: 'bg-gray-600/20' };
            default: return { cor: 'text-gray-400', icon: '•', bg: 'bg-gray-800' };
        }
    };

    return (
        <div className="space-y-8 mt-6">
            <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-visible">
                <div className="p-6 sm:p-8 bg-gradient-to-br from-gray-800 to-gray-900 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Cadastro de Rede
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* COLUNA 1: QUEM É O ATOR */}
                            <div className="space-y-4 bg-gray-900/50 p-6 rounded-xl border border-gray-700/50 shadow-inner">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-500 mb-4 border-b border-gray-700/50 pb-2">Identidade do Ator</h3>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">
                                        Nome da Entidade / Pessoa *
                                    </label>
                                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Fornecedor ABC Corp" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-1">
                                            Categoria *
                                            <Tooltip text="Em qual grande grupo de mercado este ator se encaixa?" />
                                        </label>
                                        <select value={categoria} onChange={e => setCategoria(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500">
                                            <option value="">Selecione...</option>
                                            {['Cliente', 'Fornecedor', 'Concorrente', 'Regulador', 'Comunidade', 'Investidor', 'Instituição'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-1">
                                            Essencialidade *
                                            <Tooltip text="Qual é o nível de urgência/necessidade que o nosso negócio tem sobre o que este ator oferece?" />
                                        </label>
                                        <select value={essencialidade} onChange={e => setEssencialidade(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500">
                                            <option value="">Selecione...</option>
                                            {['Primário', 'Secundário', 'Terciário'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">
                                        Poder do Ator sobre o Negócio *
                                        <Tooltip text="Quanta força ou controle (financeiro, regulatório, estrutural) este ator possui para impactar nosso sucesso?" />
                                    </label>
                                    <select value={influencia} onChange={e => setInfluencia(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 font-medium tracking-wide">
                                        <option value="">Nível de Influência (Poder)...</option>
                                        {['Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'].map(i => <option key={i} value={i}>{i}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">
                                        Interesse do Ator na Relação *
                                        <Tooltip text="Quão dependente, engajado ou interessado este ator está nos nossos resultados ou nessa Relação?" />
                                    </label>
                                    <select value={nivelInteresse} onChange={e => setNivelInteresse(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 font-medium tracking-wide">
                                        <option value="">Nível de Interesse...</option>
                                        {['Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'].map(i => <option key={i} value={i}>{i}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">
                                        Justificativa do Interesse
                                        <Tooltip text="O que, exatamente, ele busca em nós? (Ex: Lucro máximo, estabilidade, cumprimento legal)." />
                                    </label>
                                    <textarea value={interesse} onChange={e => setInteresse(e.target.value)} rows="2" placeholder="O que ele busca nesta relação?" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 resize-none text-sm" />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">
                                        Legitimidade do Ator *
                                        <Tooltip text="As exigências e ações deste ator possuem respaldo moral, social ou legal? (Ex: Um órgão regulador possui Alta Legitimidade; um concorrente desleal possui Baixa)." />
                                    </label>
                                    <select value={legitimidade} onChange={e => setLegitimidade(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 font-medium tracking-wide">
                                        <option value="">Nível de Legitimidade...</option>
                                        {['Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">
                                        Recursos Aportados
                                        <Tooltip text="Que tipo de valor raro, capital ou ativo esse ator injeta no nosso negócio? (Ex: Capital Financeiro, Matéria-Prima, Patentes, Canais de Clientes, Licença para operar)." />
                                    </label>
                                    <textarea value={recursosAportados} onChange={e => setRecursosAportados(e.target.value)} rows="2" placeholder="O que ele traz para a mesa?" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 resize-none text-sm" />
                                </div>
                            </div>

                            {/* COLUNA 2: ANATOMIA DO VÍNCULO */}
                            <div className="space-y-4 bg-gray-900/50 p-6 rounded-xl border border-gray-700/50 shadow-inner">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-500 mb-4 border-b border-gray-700/50 pb-2">Anatomia do Vínculo</h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-1">
                                            Força do Vínculo *
                                            <Tooltip text="As interações são transacionais e rápidas (Fraca) ou contínuas, estruturais e vitais para a operação (Crítica)?" />
                                        </label>
                                        <select value={forcaVinculo} onChange={e => setForcaVinculo(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500">
                                            <option value="">Selecione...</option>
                                            {['Crítica', 'Importante', 'Fraca'].map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-1">
                                            Natureza do Vínculo *
                                            <Tooltip text="A relação atual entre nós tem viés de parceria contínua, neutralidade, ou existe competição/conflito velado?" />
                                        </label>
                                        <select value={natureza} onChange={e => setNatureza(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500">
                                            <option value="">Selecione...</option>
                                            {['Colaborativa', 'Competitiva', 'Neutra'].map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">
                                        Direção da Troca *
                                        <Tooltip text="A troca de valor é sempre bidirecional (mútua, ex: recebemos produto e pagamos) ou é mão única (ex: dados gratuitos puxados pelo governo, doação filantrópica)?" />
                                    </label>
                                    <select value={direcao} onChange={e => setDirecao(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500">
                                        <option value="">Selecione...</option>
                                        <option value="Unidirecional">Unidirecional (Mão única)</option>
                                        <option value="Bidirecional">Bidirecional (Via dupla)</option>
                                    </select>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">
                                        Fluxo Principal Transferido *
                                        <Tooltip text="O que realmente transita ativamente na ponte que une vocês? (Ex: Nós enviamos a tecnologia e ele envia o capital financeiro)." />
                                    </label>
                                    <textarea value={fluxoPrincipal} onChange={e => setFluxoPrincipal(e.target.value)} required rows="2" placeholder="Descreva os itens principais desta troca..." className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 resize-none text-sm" />
                                </div>
                            </div>

                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-700">
                            <button type="submit" disabled={isLoading} className="bg-white text-gray-900 hover:bg-cyan-50 font-bold py-3 px-10 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] focus:scale-95 text-lg flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                {isLoading ? 'Registrando Nó...' : 'Salvar Nó na Rede'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Grid de Atores */}
            <h2 className="text-xl font-bold text-white mb-6 mt-10 flex items-center gap-2 border-b border-gray-800 pb-3 uppercase tracking-wider">
                Nós da Rede ({atores.length})
            </h2>
            
            {atores.length === 0 ? (
                <div className="text-center py-16 bg-gray-800/20 rounded-2xl border border-gray-700 border-dashed">
                    <svg className="w-16 h-16 text-yellow-500/50 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    <p className="text-gray-300 font-medium text-lg">O Nó Central ({grupoSelecionado?.identidadeRede?.nome || grupoSelecionado?.nome}) está isolado.</p>
                    <p className="text-gray-500 text-sm mt-1">Preencha o formulário acima para conectar Stakeholders à sua rede.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* CARD DO NÓ CENTRAL (Identidade Customizável) */}
                    <div className="rounded-2xl p-6 flex flex-col relative border-solid border-[3px] border-yellow-500 bg-gray-800 shadow-[0_0_15px_rgba(234,179,8,0.15)] order-first">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded bg-yellow-500/20 text-yellow-500 uppercase tracking-wider border border-yellow-500/50">Nó Central (Base)</span>
                                <h3 className="text-2xl font-black text-white mt-3 leading-tight flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingCentral(true)} title="Clique para editar a identidade virtual desta rede">
                                    {grupoSelecionado?.identidadeRede?.nome || grupoSelecionado?.nome || 'Nossa Empresa'}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-hover:text-yellow-400 transition-colors" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </h3>
                                <p className="text-sm text-gray-400 mt-1 italic leading-relaxed">
                                    {grupoSelecionado?.identidadeRede?.proposito ? `"${grupoSelecionado.identidadeRede.proposito}"` : 'Propósito central não definido'}
                                </p>
                            </div>
                            <div className="bg-yellow-500/20 p-3 rounded-full cursor-pointer hover:bg-yellow-500/30 transition-colors shrink-0" onClick={() => setIsEditingCentral(true)} title="Editar Identidade">
                                <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            </div>
                        </div>
                        <div className="mt-auto border-t border-gray-700/50 pt-4 text-sm text-gray-300">
                            <p className="font-medium text-yellow-500/90 mb-1">Visão Estrutural Ativa</p>
                            <p className="text-xs text-gray-400">Os demais {atores.length} atores desta tela representam conexões, trocas de recursos e níveis de influência <strong>direcionados a esta Entidade Central.</strong></p>
                        </div>
                    </div>

                    {/* DEMAIS ATORES (STAKEHOLDERS) */}
                    {atores.map(ator => {
                        const influenciaEstilo = getEstiloInfluencia(ator.influencia);
                        const cardStyle = estilosCardPorForca[ator.forcaVinculo] || 'border-solid border-gray-700 bg-gray-800';
                        
                        return (
                            <div 
                                key={ator.id} 
                                onClick={() => setAtorEditando(ator)}
                                className={`rounded-2xl p-6 flex flex-col relative cursor-pointer hover:border-cyan-500 transition-all hover:shadow-cyan-500/10 ${cardStyle}`}
                            >
                                {/* Cabeçalho */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-xs font-bold px-2.5 py-1 rounded bg-gray-700 text-gray-300 uppercase tracking-wider border border-gray-600">{ator.categoria}</span>
                                        <h3 className="text-2xl font-black text-white mt-3 leading-tight group-hover:text-cyan-400 transition-colors">{ator.nome}</h3>
                                        <p className="text-sm text-gray-400 mt-1">{ator.essencialidade}</p>
                                    </div>
                                </div>

                                {/* Indicadores de Matriz */}
                                <div className={`mt-2 p-3 rounded-lg flex flex-col gap-2 border border-gray-700/50 ${influenciaEstilo.bg}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Poder sobre o Negócio</span>
                                        <span className={`text-xs font-bold flex items-center gap-1 ${influenciaEstilo.cor}`}>
                                            {influenciaEstilo.icon} {ator.influencia}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                                        <span className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Interesse na Relação</span>
                                        <span className={`text-xs font-bold text-gray-300`}>
                                            {ator.nivelInteresse || 'Não definido'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                                        <span className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Legitimidade</span>
                                        <span className={`text-xs font-bold text-gray-300`}>
                                            {ator.legitimidade || 'Não definido'}
                                        </span>
                                    </div>
                                </div>

                                {/* Detalhes Vínculo */}
                                <div className="mt-6 border-t border-gray-700/50 pt-5 space-y-3">
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                        Canais do Vínculo
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                                        <div className="bg-gray-900/50 p-2 rounded border border-gray-700">
                                            <span className="block text-[10px] text-gray-500 uppercase">Força</span>
                                            <span className="font-semibold text-cyan-400">{ator.forcaVinculo}</span>
                                        </div>
                                        <div className="bg-gray-900/50 p-2 rounded border border-gray-700">
                                            <span className="block text-[10px] text-gray-500 uppercase">Natureza</span>
                                            <span className="font-semibold">{ator.natureza}</span>
                                        </div>
                                        <div className="col-span-2 bg-gray-900/50 p-2 rounded border border-gray-700">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="block text-[10px] text-gray-500 uppercase">Fluxo Descrito</span>
                                                <span className="text-[10px] bg-gray-800 border border-gray-600 px-2 py-0.5 rounded text-gray-400 font-bold uppercase tracking-widest">{ator.direcao}</span>
                                            </div>
                                            <span className="font-semibold text-indigo-400 text-xs italic line-clamp-2" title={ator.fluxoPrincipal}>"{ator.fluxoPrincipal}"</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Textos Opcionais */}
                                {(ator.interesse || ator.recursosAportados) && (
                                    <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-3 flex-1 flex flex-col justify-end">
                                        {ator.interesse && (
                                            <div>
                                                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Justificativa do Interesse</span>
                                                <p className="text-xs text-gray-300 italic line-clamp-2">"{ator.interesse}"</p>
                                            </div>
                                        )}
                                        {ator.recursosAportados && (
                                            <div className="mt-2">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Recursos Aportados</span>
                                                <p className="text-xs text-gray-300 border-l-2 border-cyan-500 pl-2 line-clamp-2">{ator.recursosAportados}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL DE EDIÇÃO */}
            {atorEditando && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-600 w-full max-w-4xl max-h-[90vh] flex flex-col my-8 relative">
                        
                        <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-2xl shrink-0">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                Editar Registro de Rede
                            </h2>
                            <button onClick={() => setAtorEditando(null)} className="text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 p-1.5 rounded-full transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <form id="form-edicao-ator" onSubmit={handleUpdate} className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Lado Esquerdo Modal */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-500 mb-2 border-b border-gray-700/50 pb-2">Identidade do Ator</h3>
                                        
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-1">Nome da Entidade / Pessoa *</label>
                                            <input type="text" value={atorEditando.nome} onChange={e => setAtorEditando({...atorEditando, nome: e.target.value})} required className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-1">Categoria *</label>
                                                <select value={atorEditando.categoria} onChange={e => setAtorEditando({...atorEditando, categoria: e.target.value})} required className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500">
                                                    {['Cliente', 'Fornecedor', 'Concorrente', 'Regulador', 'Comunidade', 'Investidor', 'Instituição'].map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-1">Essencialidade *</label>
                                                <select value={atorEditando.essencialidade || ''} onChange={e => setAtorEditando({...atorEditando, essencialidade: e.target.value})} required className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500">
                                                    <option value="">Selecione...</option>
                                                    {['Primário', 'Secundário', 'Terciário'].map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-1">Poder do Ator sobre o Negócio *</label>
                                            <select value={atorEditando.influencia} onChange={e => setAtorEditando({...atorEditando, influencia: e.target.value})} required className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500">
                                                {['Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'].map(i => <option key={i} value={i}>{i}</option>)}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-1">Interesse do Ator na Relação *</label>
                                            <select value={atorEditando.nivelInteresse || ''} onChange={e => setAtorEditando({...atorEditando, nivelInteresse: e.target.value})} required className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500">
                                                <option value="">Nível de Interesse...</option>
                                                {['Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'].map(i => <option key={i} value={i}>{i}</option>)}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-1">Justificativa do Interesse</label>
                                            <textarea value={atorEditando.interesse} onChange={e => setAtorEditando({...atorEditando, interesse: e.target.value})} rows="2" className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white resize-none text-sm" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-1">Legitimidade do Ator *</label>
                                            <select value={atorEditando.legitimidade || ''} onChange={e => setAtorEditando({...atorEditando, legitimidade: e.target.value})} required className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500">
                                                <option value="">Nível de Legitimidade...</option>
                                                {['Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'].map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-1">Recursos Aportados</label>
                                            <textarea value={atorEditando.recursosAportados} onChange={e => setAtorEditando({...atorEditando, recursosAportados: e.target.value})} rows="2" className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white resize-none text-sm" />
                                        </div>
                                    </div>

                                    {/* Lado Direito Modal */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-500 mb-2 border-b border-gray-700/50 pb-2">Anatomia do Vínculo</h3>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-1">Força do Vínculo *</label>
                                                <select value={atorEditando.forcaVinculo} onChange={e => setAtorEditando({...atorEditando, forcaVinculo: e.target.value})} required className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white">
                                                    <option value="">Selecione...</option>
                                                    {['Crítica', 'Importante', 'Fraca'].map(f => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-1">Natureza *</label>
                                                <select value={atorEditando.natureza} onChange={e => setAtorEditando({...atorEditando, natureza: e.target.value})} required className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white">
                                                    <option value="">Selecione...</option>
                                                    {['Colaborativa', 'Competitiva', 'Neutra'].map(n => <option key={n} value={n}>{n}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="block text-sm font-semibold text-gray-300 mb-1">Direção da Troca *</label>
                                            <select value={atorEditando.direcao} onChange={e => setAtorEditando({...atorEditando, direcao: e.target.value})} required className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white">
                                                <option value="">Selecione...</option>
                                                <option value="Unidirecional">Unidirecional</option>
                                                <option value="Bidirecional">Bidirecional</option>
                                            </select>
                                        </div>

                                        <div className="mt-4">
                                            <label className="block text-sm font-semibold text-gray-300 mb-1">Fluxo Principal *</label>
                                            <textarea value={atorEditando.fluxoPrincipal} onChange={e => setAtorEditando({...atorEditando, fluxoPrincipal: e.target.value})} required rows="2" placeholder="O que transita nessa relação?" className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white resize-none text-sm" />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-5 border-t border-gray-700 bg-gray-900/50 flex justify-between items-center rounded-b-2xl shrink-0">
                            <button 
                                type="button" 
                                onClick={handleDelete}
                                className="text-red-400 hover:text-white hover:bg-red-500/80 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                Apagar Ator
                            </button>

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setAtorEditando(null)} className="px-5 py-2 text-gray-300 hover:text-white font-medium">Cancelar</button>
                                <button 
                                    type="submit" 
                                    form="form-edicao-ator"
                                    disabled={isSavingEdit}
                                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-8 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </div>
                        
                    </div>
                </div>
            )}

            {/* MODAL DE IDENTIDADE CENTRAL */}
            {isEditingCentral && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl border-2 border-yellow-500/50 w-full max-w-lg flex flex-col relative animate-fade-in-up">
                        
                        <div className="p-5 border-b border-gray-700 bg-gray-900/50 rounded-t-2xl flex justify-between items-center">
                            <h2 className="text-xl font-bold text-yellow-500 flex items-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                Identidade do Nó Central
                            </h2>
                            <button onClick={() => setIsEditingCentral(false)} className="text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 p-1.5 rounded-full transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="p-6">
                            <form id="form-central" onSubmit={handleSaveCentral} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">Nome Fictício da Sua Empresa *</label>
                                    <p className="text-xs text-gray-500 mb-2">Desvincule o nome do grupo escolar. Dê um nome à corporação que está no centro desta rede.</p>
                                    <input 
                                        type="text" 
                                        value={centralNome} 
                                        onChange={e => setCentralNome(e.target.value)} 
                                        required 
                                        placeholder="Ex: Tech Corp Solutions" 
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">Missão Corporativa ou Proposta de Valor</label>
                                    <p className="text-xs text-gray-500 mb-2">Qual é a principal atividade fim do seu negócio central?</p>
                                    <textarea 
                                        value={centralProposito} 
                                        onChange={e => setCentralProposito(e.target.value)} 
                                        rows="3" 
                                        placeholder="Ex: Fornecer energia limpa e conectada para condomínios urbanos." 
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 resize-none text-sm" 
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="p-5 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-3 rounded-b-2xl">
                            <button type="button" onClick={() => setIsEditingCentral(false)} className="px-5 py-2 text-gray-300 hover:text-white font-medium">Cancelar</button>
                            <button 
                                type="submit" 
                                form="form-central"
                                disabled={isSavingCentral}
                                className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-8 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                            >
                                {isSavingCentral ? 'Gravando...' : 'Assumir Identidade'}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default Parametrizacao;
