import React from 'react';
import { FASES, PONTOS_INICIAIS, classificarPerfilRede, calcularImpactoOpcao, DESCRICAO_INDICADORES } from './constants';

export default function DiagnosticoFinal({
    pontuacoes,
    decisoes,
    justificativas,
    acoesMitigacao = {},
    grupoNome,
    onVoltarFase,
    onReiniciarSimulacao,
    onAtualizarAcaoMitigacao,
    onSalvarAcoesMitigacao,
    onExportarExcel,
    bloqueado = false,
    salvando = false
}) {
    const perfil = classificarPerfilRede(pontuacoes, decisoes);
    const cascatas = pontuacoes.cascatasAtivadas || [];

    const getStatusDimensao = (valor, key) => {
        const limiar = key === 'controle' ? 25 : 10;
        if (valor <= limiar) {
            return {
                texto: 'Alta Exposição',
                corBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
                corTexto: 'text-amber-400'
            };
        }
        if (valor < 40) {
            return {
                texto: 'Atenção Moderada',
                corBadge: 'bg-cyan-900/40 text-cyan-300 border-cyan-700',
                corTexto: 'text-cyan-400'
            };
        }
        return {
            texto: 'Sustentável',
            corBadge: 'bg-emerald-950/50 text-emerald-300 border-emerald-700',
            corTexto: 'text-emerald-400'
        };
    };

    const statusValor = getStatusDimensao(pontuacoes.caixa, 'caixa');
    const statusSoberania = getStatusDimensao(pontuacoes.controle, 'controle');
    const statusDinamica = getStatusDimensao(pontuacoes.agilidade, 'agilidade');

    return (
        <div className="space-y-6">
            {/* Banner Executivo Principal */}
            <div className={`p-6 rounded-3xl border-2 shadow-2xl ${perfil.cor} space-y-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs uppercase font-black tracking-widest px-3 py-1 rounded-full border border-current">
                        {perfil.badge}
                    </span>
                    <span className="text-xs text-gray-300 font-bold">
                        Grupo: <strong className="text-white">{grupoNome || 'Não selecionado'}</strong>
                    </span>
                </div>

                <div>
                    <h3 className="text-2xl md:text-3xl font-black text-white">
                        {perfil.titulo}
                    </h3>
                    <p className="text-sm text-gray-200 mt-2 leading-relaxed">
                        {perfil.resumo}
                    </p>
                </div>

                {perfil.recomendacao && (
                    <div className="bg-gray-900/80 p-4 rounded-2xl border border-gray-700/80 text-xs text-gray-300 leading-relaxed">
                        💡 <strong className="text-white">Parecer de Governança da Rede:</strong> {perfil.recomendacao}
                    </div>
                )}
            </div>

            {/* Dashboard dos 3 Indicadores Revelados */}
            <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-4">
                <h4 className="text-base font-bold text-white uppercase tracking-wider flex items-center justify-between">
                    <span>📊 Dashboard de Avaliação dos Vetores de Rede</span>
                    <span className="text-xs font-normal text-gray-400">Base Inicial de Referência: 60 pts</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Captura e Retenção de Valor */}
                    <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-750 flex flex-col justify-between space-y-3">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400 uppercase">💰 Captura de Valor</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${statusValor.corBadge}`}>
                                    {statusValor.texto}
                                </span>
                            </div>
                            <div className={`text-3xl font-black ${statusValor.corTexto} my-2`}>
                                {pontuacoes.caixa} <span className="text-xs text-gray-500 font-bold">pts</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.max(0, pontuacoes.caixa))}%` }}
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            {DESCRICAO_INDICADORES.caixa.descricao}
                        </p>
                    </div>

                    {/* 2. Soberania e Autonomia Relacional */}
                    <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-750 flex flex-col justify-between space-y-3">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400 uppercase">🛡️ Soberania Relacional</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${statusSoberania.corBadge}`}>
                                    {statusSoberania.texto}
                                </span>
                            </div>
                            <div className={`text-3xl font-black ${statusSoberania.corTexto} my-2`}>
                                {pontuacoes.controle} <span className="text-xs text-gray-500 font-bold">pts</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.max(0, pontuacoes.controle))}%` }}
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            {DESCRICAO_INDICADORES.controle.descricao}
                        </p>
                    </div>

                    {/* 3. Dinâmica e Tempo de Resposta */}
                    <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-750 flex flex-col justify-between space-y-3">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400 uppercase">⚡ Dinâmica de Resposta</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${statusDinamica.corBadge}`}>
                                    {statusDinamica.texto}
                                </span>
                            </div>
                            <div className={`text-3xl font-black ${statusDinamica.corTexto} my-2`}>
                                {pontuacoes.agilidade} <span className="text-xs text-gray-500 font-bold">pts</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.max(0, pontuacoes.agilidade))}%` }}
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            {DESCRICAO_INDICADORES.agilidade.descricao}
                        </p>
                    </div>
                </div>
            </div>

            {/* SEÇÃO PRINCIPAL: AÇÕES DE GOVERNANÇA MITIGADORA */}
            <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🛡️</span>
                        <h4 className="text-base font-black text-white uppercase tracking-wider">
                            Plano de Ações de Governança Mitigadora da Equipe
                        </h4>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                        Toda escolha estratégica consciente gera trade-offs. Registrem abaixo como a governança do grupo atuará para sustentar os riscos assumidos perante o Conselho de Administração e os parceiros:
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Campo de Mitigação: Valor / Financeiro */}
                    <div className={`p-4 rounded-xl border transition ${
                        pontuacoes.altaExposicaoCaixa ? 'bg-amber-950/20 border-amber-500/50' : 'bg-gray-900/60 border-gray-750'
                    }`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-white flex items-center gap-2">
                                <span>💰</span> Governança de Captura de Valor e Sustentação Financeira:
                            </label>
                            {pontuacoes.altaExposicaoCaixa && (
                                <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                                    Ação Obrigatória (Alta Exposição)
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-400 mb-2">
                            Ex: Estratégias de captação de investimento externo, rodadas de venture capital, subsídios de fomento, renegociação de prazos ou acordos de risco compartilhado.
                        </p>
                        <textarea
                            rows={2}
                            disabled={bloqueado}
                            value={acoesMitigacao.valor || ''}
                            onChange={(e) => onAtualizarAcaoMitigacao('valor', e.target.value)}
                            placeholder="Descreva a ação de governança financeira planejada pela equipe..."
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-xs sm:text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                        />
                    </div>

                    {/* Campo de Mitigação: Soberania / Dependência */}
                    <div className={`p-4 rounded-xl border transition ${
                        pontuacoes.altaExposicaoControle ? 'bg-amber-950/20 border-amber-500/50' : 'bg-gray-900/60 border-gray-750'
                    }`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-white flex items-center gap-2">
                                <span>🛡️</span> Governança de Soberania e Autonomia Relacional:
                            </label>
                            {pontuacoes.altaExposicaoControle && (
                                <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                                    Ação Obrigatória (Alta Exposição)
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-400 mb-2">
                            Ex: Cláusulas contratuais de não-exclusividade, multas de rescisão para fornecedores críticos, auditorias de nós de rede e salvaguardas de propriedade de dados.
                        </p>
                        <textarea
                            rows={2}
                            disabled={bloqueado}
                            value={acoesMitigacao.soberania || ''}
                            onChange={(e) => onAtualizarAcaoMitigacao('soberania', e.target.value)}
                            placeholder="Descreva a ação de governança contratual e salvaguardas relacionais..."
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-xs sm:text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                        />
                    </div>

                    {/* Campo de Mitigação: Dinâmica de Resposta / Rigidez */}
                    <div className={`p-4 rounded-xl border transition ${
                        pontuacoes.altaExposicaoAgilidade ? 'bg-amber-950/20 border-amber-500/50' : 'bg-gray-900/60 border-gray-750'
                    }`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-white flex items-center gap-2">
                                <span>⚡</span> Governança de Dinâmica e Tempo de Resposta:
                            </label>
                            {pontuacoes.altaExposicaoAgilidade && (
                                <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                                    Ação Obrigatória (Alta Exposição)
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-400 mb-2">
                            Ex: Comitês executivos ágeis, squads conjuntos de homologação fabril, fast-track contratual e pilotos rápidos de teste com early adopters.
                        </p>
                        <textarea
                            rows={2}
                            disabled={bloqueado}
                            value={acoesMitigacao.dinamica || ''}
                            onChange={(e) => onAtualizarAcaoMitigacao('dinamica', e.target.value)}
                            placeholder="Descreva a ação de governança operacional e aceleração de ecossistema..."
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-xs sm:text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                        />
                    </div>

                    {!bloqueado && (
                        <div className="text-right pt-1">
                            <button
                                type="button"
                                disabled={salvando}
                                onClick={onSalvarAcoesMitigacao}
                                className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs py-2 px-5 rounded-xl transition shadow"
                            >
                                {salvando ? 'Salvando Plano...' : '💾 Salvar Plano de Governança'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mapeamento de Efeitos Cascata */}
            {cascatas.length > 0 && (
                <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-3">
                    <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                        <span>⚡</span> Dependência de Trajetória: Efeitos Cascata Identificados ({cascatas.length})
                    </h4>
                    <p className="text-xs text-gray-300">
                        Como as escolhas de uma fase influenciaram os custos e vetores de governança nas etapas subsequentes:
                    </p>
                    <div className="space-y-2 pt-1">
                        {cascatas.map((c, i) => (
                            <div key={i} className="bg-gray-900/90 p-3.5 rounded-xl border border-gray-700 text-xs space-y-1">
                                <div className="flex items-center justify-between font-bold text-cyan-300">
                                    <span>{c.faseTitulo} (Decisão {c.opcaoId})</span>
                                </div>
                                <p className="text-gray-300 leading-relaxed">{c.descricao}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Matriz das Decisões e Justificativas da Equipe */}
            <div className="bg-gray-800/90 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-4">
                <h4 className="text-base font-bold text-white uppercase tracking-wider">
                    📋 Memória de Decisões e Justificativas Submetidas
                </h4>

                <div className="space-y-4">
                    {FASES.map((fase) => {
                        const opcaoEscolhidaId = decisoes[fase.chave];
                        const opcao = fase.opcoes.find(o => o.id === opcaoEscolhidaId);
                        const justificativa = justificativas[fase.chave] || 'Nenhuma justificativa informada.';

                        if (!opcao) return null;

                        return (
                            <div key={fase.faseId} className="bg-gray-900/80 rounded-xl border border-gray-700 p-4 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-cyan-400 text-gray-950 font-black text-xs flex items-center justify-center">
                                            {fase.faseId}
                                        </span>
                                        <h5 className="font-bold text-white text-sm">
                                            {fase.titulo}
                                        </h5>
                                        <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                                            {opcao.arquetipo}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400 font-medium">
                                        Opção Selecionada: <strong className="text-cyan-400">{opcao.letra}</strong>
                                    </span>
                                </div>

                                <div className="text-xs space-y-1 pt-1">
                                    <p className="text-gray-200">
                                        <strong className="text-white">Diretriz:</strong> {opcao.titulo}
                                    </p>
                                    <p className="text-gray-400">
                                        <strong className="text-gray-300">Parecer Técnico:</strong> {opcao.diagnostico}
                                    </p>
                                    <p className="text-gray-300 bg-gray-950 p-2.5 rounded-lg border border-gray-800 italic mt-2">
                                        <strong className="text-white not-italic">Justificativa do Grupo:</strong> "{justificativa}"
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Ações Finais: Rever, Reiniciar e Exportar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => onVoltarFase(0)}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition"
                    >
                        ← Rever Fases
                    </button>
                    {!bloqueado && (
                        <button
                            type="button"
                            onClick={onReiniciarSimulacao}
                            className="bg-gray-850 hover:bg-gray-800 text-gray-300 border border-gray-700 font-bold py-2.5 px-5 rounded-xl text-sm transition"
                        >
                            🔄 Reiniciar Simulação
                        </button>
                    )}
                </div>

                <div>
                    <button
                        type="button"
                        onClick={onExportarExcel}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-6 rounded-xl text-sm transition shadow-lg flex items-center gap-2"
                    >
                        <span>📥</span> Exportar Dossiê Executivo (Excel)
                    </button>
                </div>
            </div>
        </div>
    );
}
