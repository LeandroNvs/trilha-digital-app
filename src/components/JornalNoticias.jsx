import React from 'react';

// Ícones para ilustrar os tipos de notícias
const IconeMercado = () => <span className="text-2xl mr-2">📈</span>;
const IconeCrise = () => <span className="text-2xl mr-2">📉</span>;
const IconeAlerta = () => <span className="text-2xl mr-2">⚠️</span>;
const IconeInfo = () => <span className="text-2xl mr-2">📰</span>;

const JornalNoticias = ({ textoNoticia }) => {
    if (!textoNoticia) return null;

    // Separa o texto em linhas para processar cada uma
    const linhas = textoNoticia.split('\n').filter(l => l.trim() !== '');

    // Função para processar cada linha e determinar seu estilo
    const renderizarLinha = (linha, index) => {
        // Verifica se é um Evento Automático do Motor
        // Formato esperado: [EVENTO] Nome: Descrição -> Impacto
        const matchEvento = linha.match(/\[EVENTO\] (.*?): (.*?) -> (.*)/);

        if (matchEvento) {
            const [_, nome, descricao, impacto] = matchEvento;
            
            // Define cor baseada no nome do evento (exemplo simples)
            let corBorda = 'border-l-4 border-blue-500';
            let bgCor = 'bg-blue-900/20';
            let icone = <IconeMercado />;

            if (nome.toLowerCase().includes('crise') || nome.toLowerCase().includes('greve')) {
                corBorda = 'border-l-4 border-red-500';
                bgCor = 'bg-red-900/20';
                icone = <IconeCrise />;
            } else if (nome.toLowerCase().includes('boom')) {
                corBorda = 'border-l-4 border-green-500';
                bgCor = 'bg-green-900/20';
                icone = <IconeMercado />;
            } else if (nome.toLowerCase().includes('regulamentação') || nome.toLowerCase().includes('fiscalização')) {
                corBorda = 'border-l-4 border-yellow-500';
                bgCor = 'bg-yellow-900/20';
                icone = <IconeAlerta />;
            }

            return (
                <div key={index} className={`mb-4 p-4 rounded-r-lg ${bgCor} ${corBorda} shadow-sm animate-fade-in`}>
                    <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">{icone}</div>
                        <div className="ml-3 w-full">
                            <h4 className="text-lg font-bold text-white uppercase tracking-wide">{nome}</h4>
                            <p className="text-gray-300 mt-1 text-sm">{descricao}</p>
                            
                            {/* Área de Impacto - Ouro para a apresentação dos alunos */}
                            <div className="mt-3 bg-black/30 p-3 rounded border border-white/10">
                                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Impacto nos Resultados:</p>
                                <p className="text-sm font-medium text-yellow-300">{impacto}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Caso seja texto manual do MJ (sem a tag [EVENTO])
        return (
            <div key={index} className="mb-4 p-4 bg-gray-700 rounded-lg border border-gray-600 shadow-sm">
                <div className="flex items-start">
                    <IconeInfo />
                    <div>
                        <h4 className="text-md font-bold text-cyan-400 mb-1">Comunicado da Direção</h4>
                        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{linha}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
            {/* Cabeçalho do Jornal */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 border-b border-gray-600 flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🗞️</span> 
                        Jornal do Mercado
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Contexto para sua Tomada de Decisão</p>
                </div>
                <div className="hidden md:block">
                    <span className="bg-cyan-900 text-cyan-200 text-xs px-2 py-1 rounded border border-cyan-700 uppercase font-bold tracking-wider">Edição Atual</span>
                </div>
            </div>

            {/* Conteúdo das Notícias */}
            <div className="p-4 md:p-6 space-y-2">
                {linhas.length > 0 ? (
                    linhas.map((linha, index) => renderizarLinha(linha, index))
                ) : (
                    <p className="text-gray-500 text-center italic py-4">Nenhuma notícia relevante para esta rodada.</p>
                )}
            </div>
            
            {/* Rodapé com Dica Pedagógica */}
            <div className="bg-gray-900/50 p-3 text-center border-t border-gray-700">
                <p className="text-xs text-gray-500">💡 Dica: Use os impactos citados acima para justificar variações de lucro ou share em sua apresentação final.</p>
            </div>
        </div>
    );
};

export default JornalNoticias;