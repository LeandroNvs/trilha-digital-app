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