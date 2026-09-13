// Normaliza um valor entre 0 e 1 com base no mínimo e máximo do conjunto
export function normalizarValor(valor, todosValores, inverter = false) {
    const min = Math.min(...todosValores);
    const max = Math.max(...todosValores);
    if (min === max) return 1.0;
    
    const divisor = (max - min) === 0 ? 1 : (max - min);
    const nota = (valor - min) / divisor;
    return inverter ? (1 - nota) : nota;
}

// Aplica curva de retornos decrescentes (raiz quadrada)
export function aplicarRetornosDecrescentes(notaNormalizada) {
    return Math.sqrt(Math.max(0, notaNormalizada));
}

// Remove outliers de preços para não distorcer a média
export function higienizarPrecosOutliers(precos, multiplicadorCap = 5) {
    const precosValidos = precos.filter(p => p > 0 && isFinite(p));

    if (precosValidos.length === 0) return precos.map(() => 1);
    
    precosValidos.sort((a, b) => a - b);
    
    const mid = Math.floor(precosValidos.length / 2);
    const mediana = precosValidos.length % 2 !== 0 
        ? precosValidos[mid] 
        : (precosValidos[mid - 1] + precosValidos[mid]) / 2;

    const tetoSanidadeBase = mediana * multiplicadorCap;
    const tetoSanidade = Math.max(tetoSanidadeBase, precosValidos[precosValidos.length - 1]);

    return precos.map(p => {
        if (!isFinite(p) || p === 0) return Infinity; 
        if (p > tetoSanidade) return tetoSanidade; 
        return p; 
    });
}

// Aplica um fator de rejeição (0 a 1) para preços muito acima da mediana
export function calcularFatorRejeicaoPreco(preco, mediana, limiteInicio = 1.3, limiteFim = 1.6) {
    if (preco <= 0 || mediana <= 0) return 1.0;
    const ratio = preco / mediana;
    
    // Até limiteInicio (ex: 30%) acima da mediana, sem punição de encalhe
    if (ratio <= limiteInicio) return 1.0;
    
    // Acima de limiteFim (ex: 60%) da mediana, produto encalha totalmente
    if (ratio >= limiteFim) return 0.0;
    
    // Entre os limites, a atratividade decai linearmente
    return 1.0 - ((ratio - limiteInicio) / (limiteFim - limiteInicio));
}