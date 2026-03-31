import React from 'react';

function MatrizPoderInteresse({ atores, grupoSelecionado }) {
    
    // O eixo Y (Poder) usa "influencia", o eixo X (Interesse) usa "nivelInteresse"
    // Valores: 'Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'
    const altos = ['Médio', 'Alto', 'Muito Alto'];

    const getQuadrante = (ator) => {
        const pAlto = altos.includes(ator.influencia);
        const iAlto = altos.includes(ator.nivelInteresse);

        if (pAlto && iAlto) return 'GerenciarAtivamente'; // Q2
        if (pAlto && !iAlto) return 'ManterSatisfeito';  // Q1
        if (!pAlto && iAlto) return 'ManterInformado';    // Q4
        return 'Monitorar';                               // Q3
    };

    const categorizados = {
        GerenciarAtivamente: atores.filter(a => getQuadrante(a) === 'GerenciarAtivamente'),
        ManterSatisfeito: atores.filter(a => getQuadrante(a) === 'ManterSatisfeito'),
        ManterInformado: atores.filter(a => getQuadrante(a) === 'ManterInformado'),
        Monitorar: atores.filter(a => getQuadrante(a) === 'Monitorar'),
    };

    const Quadrante = ({ titulo, descricao, tipo, atoresList, bgCorner }) => {
        let colors = '';
        if (tipo === 'GerenciarAtivamente') colors = 'border-emerald-500/50 bg-emerald-900/10';
        if (tipo === 'ManterSatisfeito') colors = 'border-indigo-500/50 bg-indigo-900/10';
        if (tipo === 'ManterInformado') colors = 'border-amber-500/50 bg-amber-900/10';
        if (tipo === 'Monitorar') colors = 'border-gray-600/50 bg-gray-800/30';

        return (
            <div className={`p-5 rounded-xl border-2 transition-all h-full min-h-[250px] relative overflow-visible flex flex-col ${colors}`}>
                <div className={`absolute top-0 ${bgCorner} w-32 h-32 blur-[60px] opacity-20 -z-10 bg-white`}></div>
                <h3 className="text-xl font-bold text-white mb-1">{titulo}</h3>
                <p className="text-xs text-gray-400 font-medium mb-4">{descricao}</p>
                
                <div className="flex flex-wrap gap-2 flex-1 content-start">
                    {atoresList.length === 0 && <span className="text-sm text-gray-500 italic block w-full text-center mt-8">Nenhum ator neste quadrante.</span>}
                    {atoresList.map(a => (
                        <div key={a.id} className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-200 shadow-sm flex items-center gap-2 cursor-help group relative">
                            {a.nome}
                            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-gray-700 rounded-lg p-3 text-xs w-48 font-normal z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 shadow-xl">
                                <strong className="block text-white mb-1">{a.categoria}</strong>
                                <span className="block text-gray-400 mb-1">Vínculo: {a.forcaVinculo}</span>
                                <span className="block text-gray-300">"{a.interesse || 'Sem interesse descrito'}"</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700 mt-6 animate-fade-in-up">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white flex flex-col md:flex-row md:items-center gap-2 mb-2">
                    Matriz de Mendelow (Poder x Interesse)
                    {grupoSelecionado && (
                        <span className="text-sm font-bold bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/30 w-max">
                            Âncora de Análise: {grupoSelecionado.nome}
                        </span>
                    )}
                </h2>
                <p className="text-gray-400">
                     A Matriz orienta como se relacionar com cada stakeholder com base no <strong className="text-gray-300">Poder de Influência</strong> que exercem no negócio versus o <strong className="text-gray-300">Nível de Interesse</strong> que possuem nos resultados <strong>da Entidade Central.</strong>
                </p>
            </div>

            <div className="relative pl-8 md:pl-12 pt-4">
                {/* Eixos Label Y */}
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between items-center text-gray-500 font-bold uppercase tracking-widest h-full" style={{ width: '30px' }}>
                    <span className="transform -rotate-90 origin-center absolute top-1/2 -translate-y-1/2 whitespace-nowrap">Baixo ← Poder → Alto</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Linha 1: Alto Poder */}
                    <Quadrante 
                        titulo="Manter Satisfeito" 
                        descricao="Alto Poder, Baixo Interesse. Atenda suas necessidades, mas sem exageros."
                        tipo="ManterSatisfeito" 
                        atoresList={categorizados.ManterSatisfeito} 
                        bgCorner="left-0"
                    />
                    <Quadrante 
                        titulo="Gerenciar Ativamente" 
                        descricao="Alto Poder, Alto Interesse. Seus 'Promotores'. Engaje-os fortemente em co-criação."
                        tipo="GerenciarAtivamente" 
                        atoresList={categorizados.GerenciarAtivamente}
                        bgCorner="right-0" 
                    />

                    {/* Linha 2: Baixo Poder */}
                    <Quadrante 
                        titulo="Monitorar" 
                        descricao="Baixo Poder, Baixo Interesse. Esforço mínimo. Acompanhe se eles mudam de quadrante."
                        tipo="Monitorar" 
                        atoresList={categorizados.Monitorar} 
                        bgCorner="left-0"
                    />
                    <Quadrante 
                        titulo="Manter Informado" 
                        descricao="Baixo Poder, Alto Interesse. Seus 'Defensores da Marca'. Comunique-se frequentemente."
                        tipo="ManterInformado" 
                        atoresList={categorizados.ManterInformado} 
                        bgCorner="right-0"
                    />
                </div>

                {/* Eixos Label X */}
                <div className="text-center mt-6 text-gray-500 font-bold uppercase tracking-widest pl-4">
                    <span>Baixo ← Interesse → Alto</span>
                </div>
            </div>
            
        </div>
    );
}

export default MatrizPoderInteresse;
