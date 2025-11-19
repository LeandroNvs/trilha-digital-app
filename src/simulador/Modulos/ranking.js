import { normalizarValor } from '../utils';

export function calcularRankingIDG(todasEmpresas, simulacao, totalVendasSetor) {
    
    const metricasBrutas = todasEmpresas.map(e => {
        const en = e.estadoNovo;
        const vendasTotais = en.Vendas_Efetivas_Premium + en.Vendas_Efetivas_Massa;
        
        const ativoCirc = en.Caixa + en.Custo_Estoque_S1 + en.Custo_Estoque_S2;
        const parcelaLP = (en.Divida_LP_Saldo > 0 && en.Divida_LP_Rodadas_Restantes > 0) ? en.Divida_LP_Saldo / en.Divida_LP_Rodadas_Restantes : 0;
        const passivoCirc = en.Divida_CP + en.Divida_Emergencia + parcelaLP;
        const liquidez = passivoCirc === 0 ? (ativoCirc > 0 ? 5 : 1) : (ativoCirc / passivoCirc);

        return {
            id: e.id,
            lucro: en.Lucro_Acumulado,
            share: totalVendasSetor > 0 ? (vendasTotais / totalVendasSetor) : 0,
            pd: en.Nivel_PD_Camera + en.Nivel_PD_Bateria + en.Nivel_PD_Sist_Operacional_e_IA + en.Nivel_PD_Atualizacao_Geral,
            saude: liquidez,
            org: en.Nivel_Capacitacao + en.Nivel_Qualidade + en.Nivel_ESG
        };
    });

    const listLucro = metricasBrutas.map(m => m.lucro);
    const listShare = metricasBrutas.map(m => m.share);
    const listPD = metricasBrutas.map(m => m.pd);
    const listSaude = metricasBrutas.map(m => m.saude);
    const listOrg = metricasBrutas.map(m => m.org);

    const pesoBaseLucro = simulacao.Peso_IDG_Lucro || 0.30;
    const pesoBaseShare = simulacao.Peso_IDG_Share || 0.30;
    const pesoBasePD = simulacao.Peso_IDG_PD || 0.20;
    const pesoBaseSaude = simulacao.Peso_IDG_Saude_Financeira || 0.20;

    const getPesosEstrategicos = (estrategia) => {
        let mL = 1, mS = 1, mP = 1, mH = 1;
        switch(estrategia) {
            case 'rentabilidade': mL = 1.5; mH = 1.2; mS = 0.7; mP = 0.8; break;
            case 'mercado': mS = 1.5; mL = 0.8; mP = 0.8; mH = 0.9; break;
            case 'inovacao': mP = 1.5; mL = 0.8; mS = 0.8; mH = 1.0; break;
            default: break;
        }
        const total = (pesoBaseLucro * mL) + (pesoBaseShare * mS) + (pesoBasePD * mP) + (pesoBaseSaude * mH);
        return { l: (pesoBaseLucro * mL)/total, s: (pesoBaseShare * mS)/total, p: (pesoBasePD * mP)/total, h: (pesoBaseSaude * mH)/total };
    };

    todasEmpresas.forEach(empresa => {
        const metrica = metricasBrutas.find(m => m.id === empresa.id);
        const estrategia = empresa.dadosEmpresa.Estrategia || 'padrao';
        const pesos = getPesosEstrategicos(estrategia);

        const notaLucro = normalizarValor(metrica.lucro, listLucro);
        const notaShare = normalizarValor(metrica.share, listShare);
        const notaPD = normalizarValor(metrica.pd, listPD);
        const notaSaude = normalizarValor(metrica.saude, listSaude);
        
        const fatorBonus = (estrategia === 'inovacao') ? 1.5 : 1.0;
        const notaOrg = normalizarValor(metrica.org, listOrg) * 10 * fatorBonus; // Bônus de 0 a 15 pontos

        const scoreFinal = ((notaLucro * pesos.l) + (notaShare * pesos.s) + (notaPD * pesos.p) + (notaSaude * pesos.h)) * 100 + notaOrg;

        empresa.estadoNovo.IDG_Score = scoreFinal;
        empresa.estadoNovo.IDG_Metricas = {
            lucro: { valor: metrica.lucro, nota: notaLucro * 100 * pesos.l },
            share: { valor: metrica.share, nota: notaShare * 100 * pesos.s },
            pd: { valor: metrica.pd, nota: notaPD * 100 * pesos.p },
            saude: { valor: metrica.saude, nota: notaSaude * 100 * pesos.h },
            org: { valor: metrica.org, nota: notaOrg },
            estrategia: estrategia
        };
    });
}