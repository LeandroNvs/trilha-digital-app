import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { BOARD_TILES, BOARD_WIDTH, BOARD_HEIGHT, getTilePosition3D } from '../data/boardData.js';

// ============================================================================
// GERADOR PROCEDURAL DE TEXTURAS 2D DE ALTA DEFINIÇÃO
// - Delimitado 100% ao retângulo da mesa (Grama + Areia + Água da Praia)
// - Trilha em FITA CONTÍNUA CURVA (casas em trapézio curvo coladas lado a lado,
//   idênticas ao Anexo 1!)
// ============================================================================

// Desenha o símbolo oficial da Receita Federal num contexto Canvas 2D (fiel à logo oficial do tabuleiro!)
function drawReceitaSymbol(ctx, x, y, scale = 1, color = '#ffffff', showText = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;

  // Parte 1: Cabeça Superior Horizontal + Asa Esquerda (peça única oficial da Receita Federal)
  ctx.beginPath();
  ctx.moveTo(-28, -110); // Topo esquerdo da cabeça
  ctx.lineTo(105, -110); // Topo direito horizontal da cabeça
  ctx.lineTo(52, -55); // Ponta inferior do bico direito
  ctx.lineTo(-18, -55); // Recuo interno sob a cabeça
  ctx.lineTo(-82, 42); // Ponta interna da asa esquerda
  ctx.lineTo(-155, 18); // Ponta externa da asa esquerda
  ctx.lineTo(-52, -68); // Dobra superior da asa esquerda
  ctx.closePath();
  ctx.fill();

  // Parte 2: Losango / Asa Inferior Direita (encaixada no vão em 45° com espaçamento uniforme)
  ctx.beginPath();
  ctx.moveTo(18, -36); // Topo do losango
  ctx.lineTo(96, 22); // Ponta direita
  ctx.lineTo(28, 92); // Ponta inferior
  ctx.lineTo(-46, 30); // Ponta esquerda
  ctx.closePath();
  ctx.fill();

  if (showText) {
    ctx.font = '800 44px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Receita Federal', 0, 152);
  }
  ctx.restore();
}

// 1. Carrega a Imagem Oficial Exata da Logo da Receita Federal enviada pelo usuário (proporção 344x214 = 1.6075:1)
function useReceitaLogoTexture() {
  const tex = useTexture('/assets/logo_receita_federal.png');
  useMemo(() => {
    if (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
    }
  }, [tex]);
  return tex;
}

// 2. Gera o Tabuleiro Plano Delimitado à Mesa com Trilha em Fita Contínua Curva (Estilo Anexo 1!)
function useCurvedBoardTrailTexture() {
  return useMemo(() => {
    const W = 2800;
    const H = 1984;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const getTileXY = (id) => {
      const t = BOARD_TILES.find((x) => x.id === id) || BOARD_TILES[0];
      return new THREE.Vector2(t.u * W, t.v * H);
    };

    // ========================================================================
    // PASSO 1: FUNDO DE GRAMA DELIMITADO 100% AO RETÂNGULO DA MESA
    // ========================================================================
    ctx.fillStyle = '#4d7c2b';
    ctx.fillRect(0, 0, W, H);

    // Bioma de Bosque (Nordeste) contido dentro do retângulo do canvas
    ctx.save();
    ctx.beginPath();
    ctx.arc(W * 0.73, H * 0.24, 580, 0, Math.PI * 2);
    ctx.fillStyle = '#3f6212';
    ctx.fill();
    ctx.restore();

    // Textura orgânica sutil de grama em todo o campo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 4000; i++) {
      const gx = (Math.sin(i * 12.9898) * 0.5 + 0.5) * W;
      const gy = (Math.cos(i * 78.233) * 0.5 + 0.5) * H;
      ctx.fillRect(gx, gy, 5, 5);
    }

    // ========================================================================
    // PASSO 2: AREIA E ÁGUA DA PRAIA CONTORNANDO A TRILHA E DELIMITADAS À MESA!
    // (Idêntico ao Anexo 1: a areia começa exatamente na curva das casas #0 a #15
    // e termina na borda retangular da mesa, sem nunca vazar para fora!)
    // ========================================================================
    const beachBorderIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    const beachCurve = new THREE.SplineCurve(beachBorderIds.map(getTileXY));
    const beachPts = beachCurve.getPoints(120);

    // Polígono da Areia da Praia (da trilha até o canto inferior direito (W, H))
    ctx.save();
    ctx.beginPath();
    beachPts.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.lineTo(W, beachPts[beachPts.length - 1].y);
    ctx.lineTo(W, H);
    ctx.lineTo(beachPts[0].x, H);
    ctx.closePath();
    ctx.fillStyle = '#f3d078';
    ctx.fill();

    // Granulado de areia dentro da praia (recortado pela própria região da praia)
    ctx.clip();
    for (let i = 0; i < 3500; i++) {
      const sx = W * 0.52 + ((i * 97) % (W * 0.48));
      const sy = H * 0.40 + ((i * 53) % (H * 0.60));
      ctx.fillStyle = i % 2 === 0 ? 'rgba(180, 130, 50, 0.22)' : 'rgba(255, 245, 200, 0.28)';
      ctx.fillRect(sx, sy, 4, 4);
    }

    // Água do Mar na borda direita da praia (desenhada ANTES da trilha e do INÍCIO,
    // garantindo que a trilha e o INÍCIO fiquem 100% por cima da água e das ondas!)
    const seaGrad = ctx.createRadialGradient(W + 30, H * 0.63, 40, W + 30, H * 0.63, 430);
    seaGrad.addColorStop(0, '#0284c7');
    seaGrad.addColorStop(0.72, '#38bdf8');
    seaGrad.addColorStop(0.88, '#bae6fd');
    seaGrad.addColorStop(0.96, '#e0f2fe');
    seaGrad.addColorStop(1, 'rgba(224, 242, 254, 0)');

    ctx.beginPath();
    ctx.ellipse(W + 30, H * 0.63, 410, 340, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = seaGrad;
    ctx.fill();

    // Ondas de espuma desenhadas na própria água (ficam 100% SOB a trilha e SOB o INÍCIO!)
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(W + 30, H * 0.63, 330, 270, -0.15, Math.PI * 0.55, Math.PI * 1.45);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(186, 230, 253, 0.75)';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.ellipse(W + 30, H * 0.63, 255, 205, -0.15, Math.PI * 0.55, Math.PI * 1.45);
    ctx.stroke();
    ctx.restore();

    // ========================================================================
    // PASSO 3: FUNÇÃO QUE DESENHA CADA RAMO DA TRILHA COMO FITA CONTÍNUA CURVA
    // (Casas trapezoidais/curvas coladas lado a lado, sem espaços entre elas,
    // exatamente como no Anexo 1!)
    // ========================================================================
    const halfWidth = 54; // Metade da largura da fita da pista

    const drawRibbonChain = (chainIds, skipFirstTile = false, skipLastTile = false, customFirstPt = null) => {
      const pts = chainIds.map((id, idx) => (idx === 0 && customFirstPt ? customFirstPt : getTileXY(id)));
      const curve = new THREE.SplineCurve(pts);
      const M = chainIds.length;

      // Calcula os parâmetros u_k ao longo da curva para cada casa da cadeia
      const uParams = chainIds.map((_, idx) => idx / (M - 1));

      // Função auxiliar para obter ponto central, tangente suavizada e normal na curva
      const getFrame = (t) => {
        const clampedT = Math.max(0, Math.min(1, t));
        const p = curve.getPoint(clampedT);
        // Janela dt = 0.016 suaviza a rotação da normal nas curvas fechadas (#6->#7->#8),
        // garantindo curvas internas e externas 100% fluidas sem "beliscar" a borda!
        const dt = 0.016;
        const p1 = curve.getPoint(Math.max(0, clampedT - dt));
        const p2 = curve.getPoint(Math.min(1, clampedT + dt));
        const tx = p2.x - p1.x;
        const ty = p2.y - p1.y;
        const len = Math.hypot(tx, ty) || 1;
        const ux = tx / len;
        const uy = ty / len;
        // Normal à esquerda
        const nx = -uy;
        const ny = ux;
        return { p, ux, uy, nx, ny };
      };

      for (let k = 0; k < M; k++) {
        if (skipFirstTile && k === 0) continue;
        if (skipLastTile && k === M - 1) continue;

        const tileId = chainIds[k];
        if (tileId === 0 || tileId === 77) continue; // INÍCIO e FINAL têm arcos de pedra nos cantos

        const tile = BOARD_TILES.find((x) => x.id === tileId);
        if (!tile) continue;

        // Limites tStart e tEnd desta casa na fita contínua:
        // Quando a extremidade da cadeia é uma junção em T (skipFirstTile ou skipLastTile),
        // estendemos a geometria da casa até o centro da casa de junção (t=0 ou t=1).
        // Pela trigonometria (|cos(a)| <= 1), a ponta fica 100% oculta sob a pista principal
        // que é desenhada por cima, eliminando qualquer fresta triangular nos encontros!
        const normalStart = k === 0 ? 0 : (uParams[k - 1] + uParams[k]) / 2;
        const normalEnd = k === M - 1 ? 1 : (uParams[k] + uParams[k + 1]) / 2;

        const tStart = skipFirstTile && k === 1 ? 0 : normalStart;
        const tEnd = skipLastTile && k === M - 2 ? 1 : normalEnd;

        const steps = 16;
        const leftEdge = [];
        const rightEdge = [];

        for (let s = 0; s <= steps; s++) {
          const t = tStart + (s / steps) * (tEnd - tStart);
          const { p, nx, ny } = getFrame(t);
          leftEdge.push({ x: p.x + nx * halfWidth, y: p.y + ny * halfWidth });
          rightEdge.push({ x: p.x - nx * halfWidth, y: p.y - ny * halfWidth });
        }

        // Desenha o polígono curvo (trapézio curvo) da casa preenchendo 100% da pista
        ctx.save();
        ctx.beginPath();
        leftEdge.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        for (let i = rightEdge.length - 1; i >= 0; i--) {
          ctx.lineTo(rightEdge[i].x, rightEdge[i].y);
        }
        ctx.closePath();

        // Cor oficial da casa (seguindo a paleta pastel do tabuleiro original)
        ctx.fillStyle = tile.color || '#cbd5e1';
        ctx.fill();

        // Borda preta espessa entre as casas e nas laterais da fita (como no Anexo 1!)
        ctx.lineWidth = 6.5;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1e293b';
        ctx.stroke();

        // Texto centralizado na parte visível da casa (usando normalStart..normalEnd)
        const tMid = (normalStart + normalEnd) / 2;
        const { p: centerP, ux, uy } = getFrame(tMid);
        let angle = Math.atan2(uy, ux);
        if (angle > Math.PI / 2) angle -= Math.PI;
        if (angle < -Math.PI / 2) angle += Math.PI;

        ctx.translate(centerP.x, centerP.y);
        ctx.rotate(angle);

        const isDark = tile.type === 'denuncia';
        ctx.fillStyle = isDark ? '#ffffff' : '#1e293b';
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px Arial, sans-serif';

        // Quebra inteligente do título em 2 ou 3 linhas curtas como no tabuleiro físico
        const words = tile.title.toUpperCase().split(' ');
        const lines = [];
        let currentLine = '';
        for (const w of words) {
          const test = currentLine ? `${currentLine} ${w}` : w;
          if (test.length > 14 && currentLine) {
            lines.push(currentLine);
            currentLine = w;
          } else {
            currentLine = test;
          }
        }
        if (currentLine) lines.push(currentLine);

        const subText =
          tile.type === 'denuncia'
            ? ''
            : tile.type === 'caridade'
            ? 'DOE $300 PARA ROLAR'
            : tile.subtitle.toUpperCase();

        const maxW = 92;
        if (lines.length === 1) {
          ctx.fillText(lines[0], 0, subText ? -8 : 4, maxW);
        } else if (lines.length === 2) {
          ctx.fillText(lines[0], 0, subText ? -15 : -4, maxW);
          ctx.fillText(lines[1], 0, subText ? -1 : 10, maxW);
        } else {
          ctx.fillText(lines[0], 0, -20, maxW);
          ctx.fillText(lines[1], 0, -7, maxW);
          ctx.fillText(lines.slice(2).join(' '), 0, 6, maxW);
        }

        if (subText) {
          ctx.fillStyle = '#0f172a';
          ctx.font = '900 10.5px Arial, sans-serif';
          ctx.fillText(subText, 0, 21, maxW);
        }

        ctx.restore();
      }
    };

    // ORDEM DE PINTURA DAS 3 FITAS CONTÍNUAS (Algoritmo do Pintor para Junções em T Perfeitas):
    // 1º) Ramo Interno do Hospital (#13 <- #27..#21 -> #20):
    //     Ancoramos o início em (0.876*W, 0.566*H) para que a casa #27 ("Foi de ônibus ao trabalho!")
    //     fique 100% alinhada lado a lado com a casa #13 ("Fundos de Caridade!"), exatamente na linha
    //     divisória após #12 ("Pixaram sua casa!")!
    drawRibbonChain(
      [13, 27, 26, 25, 24, 23, 22, 21, 20],
      true,
      true,
      new THREE.Vector2(0.876 * W, 0.566 * H)
    );

    // 2º) Arco Leste + Topo da Estátua (#0 -> #1..#13..#20 -> #28..#34 -> #35):
    //     Passa por cima das pontas de #27 (em #13) e de #21 (em #20), e sua ponta final (#34) entra sob #35!
    drawRibbonChain(
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 28, 29, 30, 31, 32, 33, 34, 35],
      true,
      true
    );

    // 3º) Fita Contínua do Lago -> Bifurcação #35 -> Escola -> #63 -> Reta Final (#77):
    //     Começa em #63 -> #48..#36 -> #35 -> #49..#62 -> #63 -> #64..#77.
    //     A ponta inicial de #48 entra sob #63, e quando a fita passa por #35 e depois por #63,
    //     ela recorta #34 e #48 com perfeição absoluta sem nenhuma fresta!
    drawRibbonChain(
      [
        63, 48, 47, 46, 45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 35, 49, 50, 51, 52, 53, 54, 55,
        56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77
      ],
      true,
      true
    );

    // ========================================================================
    // PASSO 4: CANTOS DE PEDRA "INÍCIO" E "FINAL"
    // ========================================================================
    // 4.1 Canto "INÍCIO" (Inferior Direito)
    ctx.save();
    ctx.beginPath();
    ctx.arc(W, H, 345, Math.PI, Math.PI * 1.5);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = '#94a3b8';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    drawReceitaSymbol(ctx, W - 150, H - 145, 0.9, 'rgba(30, 58, 138, 0.32)', false);

    ctx.translate(W - 140, H - 130);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 62px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('INÍCIO', 0, 20);
    ctx.restore();

    // 4.2 Canto "FINAL" (Inferior Esquerdo - Raio 325px deixa a casa "DENÚNCIA!" #76
    //     com largura idêntica às demais casas e texto centralizado!)
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, H, 325, Math.PI * 1.5, Math.PI * 2);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = '#94a3b8';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    ctx.translate(132, H - 125);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 62px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FINAL', 0, 18);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  }, []);
}

// ============================================================================
// 1. ELEMENTOS 3D DA PRAIA (Ondas alinhadas com a água e 100% contidas na mesa!)
// ============================================================================
export function BeachBiome3D() {
  // Geometria real de Estrela-do-Mar de 5 pontas bem definidas
  const starGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const outerR = 0.22;
    const innerR = 0.075;
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 5;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2
    });
  }, []);

  // Guarda-sóis nas posições exatas do Anexo 1 (na areia seca, sem encostar nas casas #11/#12!)
  const umbrellas = [
    { pos: [6.85, 4.15], towelColor: '#a855f7', rot: 0.25 },
    { pos: [4.55, 5.75], towelColor: '#4ade80', rot: -0.45 },
    { pos: [7.65, 5.85], towelColor: '#38bdf8', rot: 0.65 }
  ];

  // 2 Estrelas-do-Mar de 5 pontas na areia próxima à beira da água (longe da trilha!)
  const starfishes = [
    { pos: [8.85, 2.75], rot: 0.35, color: '#f97316' },
    { pos: [8.95, 4.15], rot: 0.95, color: '#fb923c' }
  ];

  return (
    <group>
      {/* Guarda-Sóis 3D e Toalhas na Areia */}
      {umbrellas.map((u, idx) => (
        <group key={idx} position={[u.pos[0], 0.025, u.pos[1]]} rotation={[0, u.rot, 0]}>
          <RoundedBox args={[0.92, 0.025, 0.5]} position={[0.55, 0.012, 0]} radius={0.01} receiveShadow>
            <meshStandardMaterial color={u.towelColor} roughness={0.7} />
          </RoundedBox>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.9, 10]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.5} />
          </mesh>
          <group position={[0, 0.88, 0]} rotation={[0.12, 0, 0]}>
            {[0, 1, 2, 3, 4, 5].map((seg) => {
              const segColors = ['#ef4444', '#facc15', '#3b82f6', '#10b981', '#a855f7', '#f97316'];
              return (
                <mesh key={seg} rotation={[0, (seg * Math.PI) / 3, 0]} castShadow>
                  <coneGeometry args={[0.7, 0.34, 6, 1, false, 0, Math.PI / 3]} />
                  <meshStandardMaterial color={segColors[seg]} roughness={0.4} side={THREE.DoubleSide} />
                </mesh>
              );
            })}
          </group>
        </group>
      ))}

      {/* 2 Estrelas-do-Mar 3D com formato real de 5 pontas na beira da praia */}
      {starfishes.map((st, i) => (
        <mesh
          key={i}
          geometry={starGeo}
          position={[st.pos[0], 0.05, st.pos[1]]}
          rotation={[Math.PI / 2, 0, st.rot]}
          castShadow
        >
          <meshStandardMaterial color={st.color} roughness={0.5} />
        </mesh>
      ))}

      {/* 1 Caranguejo Vermelho 3D na areia (como no tabuleiro original!) */}
      <group position={[8.35, 0.04, 3.45]} rotation={[0, -0.5, 0]}>
        {/* Corpo oval vermelho */}
        <mesh position={[0, 0.04, 0]} scale={[1.35, 0.55, 1]} castShadow>
          <sphereGeometry args={[0.13, 14, 14]} />
          <meshStandardMaterial color="#dc2626" roughness={0.4} />
        </mesh>
        {/* 2 Olhinhos no topo */}
        {[-0.06, 0.06].map((ex, ei) => (
          <group key={ei} position={[ex, 0.11, 0.08]}>
            <mesh>
              <sphereGeometry args={[0.028, 10, 10]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0, 0.02]}>
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
          </group>
        ))}
        {/* 2 Pinças levantadas na frente */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.18, 0.06, 0.12]} rotation={[0, side * -0.35, 0]}>
            <mesh scale={[0.8, 0.5, 1.3]} castShadow>
              <sphereGeometry args={[0.065, 10, 10]} />
              <meshStandardMaterial color="#ef4444" roughness={0.4} />
            </mesh>
          </group>
        ))}
        {/* Patinhas laterais */}
        {[-1, 1].map((side) =>
          [-0.06, 0, 0.06].map((lz, li) => (
            <mesh key={`${side}-${li}`} position={[side * 0.19, 0.02, lz]} rotation={[0, 0, side * -0.4]}>
              <boxGeometry args={[0.12, 0.022, 0.025]} />
              <meshStandardMaterial color="#b91c1c" />
            </mesh>
          ))
        )}
      </group>
    </group>
  );
}

// ============================================================================
// 2. LAGO CENTRAL (Patos nadando para FRENTE!) + BANCOS AFASTADOS DA TRILHA
// ============================================================================
export function DuckPondAndPark3D() {
  const ducksRef = useRef([]);

  const stones = useMemo(() => {
    const arr = [];
    const count = 24;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const rx = 1.42 + Math.sin(i * 3) * 0.05;
      const rz = 1.15 + Math.cos(i * 2) * 0.05;
      arr.push({
        x: Math.cos(angle) * rx,
        z: Math.sin(angle) * rz,
        scale: 0.15 + (i % 3) * 0.035,
        color: i % 2 === 0 ? '#94a3b8' : '#64748b'
      });
    }
    return arr;
  }, []);

  // 4 Bancos organizados conforme solicitado:
  // - 2 voltados diretamente para o Lago dos Patos (centro [0.15, -1.85]), como no Anexo 5
  // - 1 voltado para a trilha próximo à casa #51 ("Foi Doar Sangue!" em [-2.40, -5.98])
  // - 1 voltado para a trilha próximo à casa #45 ("Passou no Sinal Vermelho!" em [-3.96, -2.38])
  const benches = [
    {
      // Voltado para o Lago (Margem Oeste, idêntico ao Anexo 5)
      pos: [-1.72, -1.85],
      rot: Math.atan2(0.15 - -1.72, -1.85 - -1.85)
    },
    {
      // Voltado para o Lago (Margem Noroeste)
      pos: [-1.25, -3.15],
      rot: Math.atan2(0.15 - -1.25, -1.85 - -3.15)
    },
    {
      // Voltado para a trilha junto à casa #51 ("Foi Doar Sangue!")
      pos: [-2.82, -5.12],
      rot: Math.atan2(-2.4 - -2.82, -5.98 - -5.12)
    },
    {
      // Voltado para a trilha junto à casa #45 ("Passou no Sinal Vermelho!")
      pos: [-3.58, -3.22],
      rot: Math.atan2(-3.96 - -3.58, -2.38 - -3.22)
    }
  ];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ducksRef.current.forEach((duck, idx) => {
      if (!duck) return;
      const speed = 0.45 + idx * 0.1;
      const angle = t * speed + idx * 1.6;
      const rx = 0.46 + (idx % 2) * 0.3;
      const rz = rx * 0.78;

      const nx = Math.cos(angle) * rx;
      const nz = Math.sin(angle) * rz;

      // Vetor velocidade tangente real -> bico (+X) aponta 100% para FRENTE!
      const vx = -Math.sin(angle) * rx;
      const vz = Math.cos(angle) * rz;

      duck.position.x = nx;
      duck.position.z = nz;
      duck.rotation.y = Math.atan2(-vz, vx);
    });
  });

  return (
    <group>
      {/* Lago Central (posicionado em [0.15, 0.02, -1.85] para não encostar na casa #36 nem em nenhuma outra) */}
      <group position={[0.15, 0.02, -1.85]}>
        <mesh rotation={[-Math.PI / 2, 0, 0.2]} receiveShadow>
          <circleGeometry args={[1.38, 32]} />
          <meshStandardMaterial color="#0ea5e9" roughness={0.15} metalness={0.35} />
        </mesh>

        {stones.map((st, idx) => (
          <mesh key={idx} position={[st.x, 0.06, st.z]} scale={[1.15, 0.6, 1]} castShadow receiveShadow>
            <dodecahedronGeometry args={[st.scale, 1]} />
            <meshStandardMaterial color={st.color} roughness={0.75} />
          </mesh>
        ))}

        {/* 4 Patinhos 3D Nadando para Frente */}
        {[0, 1, 2, 3].map((dIdx) => (
          <group key={dIdx} ref={(el) => (ducksRef.current[dIdx] = el)} position={[0, 0.08, 0]}>
            <mesh position={[0, 0.05, 0]} scale={[1.35, 0.85, 0.9]} castShadow>
              <sphereGeometry args={[0.13, 14, 14]} />
              <meshStandardMaterial color="#facc15" roughness={0.3} />
            </mesh>
            <mesh position={[0.12, 0.17, 0]} castShadow>
              <sphereGeometry args={[0.085, 12, 12]} />
              <meshStandardMaterial color="#fde047" roughness={0.3} />
            </mesh>
            <mesh position={[0.21, 0.16, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.038, 0.09, 8]} />
              <meshStandardMaterial color="#f97316" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Bancos de Madeira da Praça organizados no gramado */}
      {benches.map((b, i) => (
        <group key={i} position={[b.pos[0], 0.02, b.pos[1]]} rotation={[0, b.rot, 0]}>
          <RoundedBox args={[0.88, 0.07, 0.32]} position={[0, 0.2, 0]} radius={0.02} castShadow>
            <meshStandardMaterial color="#92400e" roughness={0.7} />
          </RoundedBox>
          <RoundedBox args={[0.88, 0.24, 0.06]} position={[0, 0.33, -0.13]} radius={0.02} castShadow>
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </RoundedBox>
          <mesh position={[-0.34, 0.1, 0]} castShadow>
            <boxGeometry args={[0.07, 0.2, 0.3]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
          <mesh position={[0.34, 0.1, 0]} castShadow>
            <boxGeometry args={[0.07, 0.2, 0.3]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// 3. OS 4 PRÉDIOS REFINADOS + PLACAS DE ÔNIBUS PRÓXIMAS ÀS CASAS
// ============================================================================
function BusSign3D({ position, rotationY = 0 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.76, 10]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.6} />
      </mesh>
      <RoundedBox args={[0.62, 0.44, 0.06]} position={[0, 0.76, 0]} radius={0.03} castShadow>
        <meshStandardMaterial color="#f8fafc" />
      </RoundedBox>
      <RoundedBox args={[0.56, 0.38, 0.065]} position={[0, 0.76, 0]} radius={0.02}>
        <meshStandardMaterial color="#0284c7" />
      </RoundedBox>

      {/* Desenho de Ônibus em Frente e Verso da Placa */}
      {[1, -1].map((side) => (
        <group key={side} position={[0, 0.76, side * 0.036]}>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.42, 0.18, 0.01]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
          {[-0.14, -0.05, 0.05, 0.14].map((wx, wi) => (
            <mesh key={wi} position={[wx, 0.04, side * 0.006]}>
              <boxGeometry args={[0.065, 0.075, 0.005]} />
              <meshStandardMaterial color="#bae6fd" />
            </mesh>
          ))}
          <mesh position={[-0.12, -0.08, side * 0.006]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.01, 12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.12, -0.08, side * 0.006]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.01, 12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function BuildingsAndMonuments3D({ stateHasResources }) {
  const receitaRoofTex = useReceitaLogoTexture();

  // Calcula posição colada à borda da trilha (como no Anexo 3 próximo à Escola) e ângulo paralelo à casa!
  const busSignsNearTiles = useMemo(() => {
    const placeSignNextToTile = (tileId, nextTileId, side = 1, distFromCenter = 0.66) => {
      const [x1, , z1] = getTilePosition3D(tileId);
      const [x2, , z2] = getTilePosition3D(nextTileId);
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len;
      const uz = dz / len;
      // Normal perpendicular à trilha no plano XZ
      const nx = -uz * side;
      const nz = ux * side;
      // Rotação Y para que a placa fique paralela à trilha
      const rot = Math.atan2(-dz, dx);
      return {
        pos: [x1 + nx * distFromCenter, 0.02, z1 + nz * distFromCenter],
        rot
      };
    };

    return [
      placeSignNextToTile(8, 9, -1, 0.66), // Em frente à Casa #8 ("Sua Visão Está Ruim! Saúde 2"), próximo à Polícia
      placeSignNextToTile(27, 26, -1, 0.66), // No gramado junto à Casa #27 ("Foi de ônibus ao trabalho! Transporte 6")
      placeSignNextToTile(30, 31, -1, 0.66), // No gramado junto à Casa #30 ("Reforma no Transporte! Transporte 3")
      placeSignNextToTile(49, 50, 1, 0.66), // No gramado externo junto à Bifurcação Superior (#35/#49)
      placeSignNextToTile(55, 56, 1, 0.66), // Na borda externa junto à Casa #55 ("Você vai a uma festa! Transporte 8" - Anexo 3!)
      placeSignNextToTile(73, 74, 1, 0.66) // No gramado interno junto à Casa #73 ("O ônibus quebrou! Transporte 10")
    ];
  }, []);

  return (
    <group>
      {/* 1. DELEGACIA DE POLÍCIA (Paralela à trilha entre as casas #10 e #12, sem invadir nenhuma pista!) */}
      <group position={[3.35, 0.02, 2.05]} rotation={[0, 0.46, 0]}>
        <RoundedBox args={[3.0, 0.06, 1.65]} position={[0.05, 0.03, 0]} radius={0.03} receiveShadow>
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </RoundedBox>
        <RoundedBox args={[1.35, 2.35, 1.25]} position={[-0.65, 1.2, 0]} radius={0.06} castShadow receiveShadow>
          <meshStandardMaterial color="#0284c7" roughness={0.25} metalness={0.25} />
        </RoundedBox>
        <RoundedBox args={[1.55, 1.45, 1.25]} position={[0.65, 0.75, 0]} radius={0.06} castShadow receiveShadow>
          <meshStandardMaterial color="#0369a1" roughness={0.3} />
        </RoundedBox>

        {[1, -1].map((dir) => (
          <group key={dir}>
            {[0.55, 1.05, 1.55, 2.0].map((wy, i) => (
              <mesh key={i} position={[-0.65, wy, dir * 0.63]}>
                <boxGeometry args={[1.15, 0.22, 0.02]} />
                <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
              </mesh>
            ))}
            <RoundedBox args={[1.35, 0.36, 0.06]} position={[0.65, 1.15, dir * 0.64]} radius={0.02}>
              <meshStandardMaterial color="#1e3a8a" />
            </RoundedBox>
            <Text
              position={[0.65, 1.15, dir * 0.68]}
              rotation={[0, dir === -1 ? Math.PI : 0, 0]}
              fontSize={0.2}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              ★ POLÍCIA
            </Text>
            <mesh position={[0.65, 0.35, dir * 0.63]}>
              <boxGeometry args={[0.52, 0.6, 0.03]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.6} />
            </mesh>
          </group>
        ))}

        <Html position={[0, 2.75, 0]} center distanceFactor={18}>
          <div className="px-2.5 py-0.5 rounded-full bg-blue-950/90 border border-blue-400 text-[10px] font-black text-blue-200 shadow-lg whitespace-nowrap">
            🚓 POLÍCIA {stateHasResources ? '✓ Ativa' : '⚠️ Sem Verba'}
          </div>
        </Html>
      </group>

      {/* 2. HOSPITAL CENTRAL (Janelas encaixadas nas alas Z = ±0.585 e Frente + Verso) */}
      <group position={[8.25, 0.02, -2.0]} rotation={[0, 0.1, 0]}>
        <RoundedBox args={[1.4, 2.65, 1.4]} position={[0, 1.32, 0]} radius={0.05} castShadow receiveShadow>
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </RoundedBox>
        <RoundedBox args={[2.55, 1.85, 1.16]} position={[0, 0.92, 0]} radius={0.05} castShadow receiveShadow>
          <meshStandardMaterial color="#e2e8f0" roughness={0.35} />
        </RoundedBox>

        {[1, -1].map((dir) => (
          <group key={dir}>
            {[-0.32, 0.32].map((wx, i) =>
              [0.95, 1.45].map((wy, j) => (
                <mesh key={`c-${i}-${j}`} position={[wx, wy, dir * 0.705]}>
                  <boxGeometry args={[0.32, 0.28, 0.02]} />
                  <meshStandardMaterial color="#38bdf8" roughness={0.15} metalness={0.5} />
                </mesh>
              ))
            )}
            {[-0.92, 0.92].map((wx, i) =>
              [0.5, 0.95, 1.4].map((wy, j) => (
                <mesh key={`w-${i}-${j}`} position={[wx, wy, dir * 0.585]}>
                  <boxGeometry args={[0.32, 0.28, 0.02]} />
                  <meshStandardMaterial color="#38bdf8" roughness={0.15} metalness={0.5} />
                </mesh>
              ))
            )}
            <mesh position={[0, 0.35, dir * 0.705]}>
              <boxGeometry args={[0.58, 0.62, 0.02]} />
              <meshStandardMaterial color="#0284c7" roughness={0.15} metalness={0.6} />
            </mesh>
            <mesh position={[0, 2.15, dir * 0.71]} castShadow>
              <boxGeometry args={[0.56, 0.18, 0.04]} />
              <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.4} />
            </mesh>
            <mesh position={[0, 2.15, dir * 0.71]} castShadow>
              <boxGeometry args={[0.18, 0.56, 0.04]} />
              <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.4} />
            </mesh>
          </group>
        ))}

        <Html position={[0, 3.05, 0]} center distanceFactor={18}>
          <div className="px-2.5 py-0.5 rounded-full bg-rose-950/90 border border-rose-400 text-[10px] font-black text-rose-200 shadow-lg whitespace-nowrap">
            🏥 HOSPITAL {stateHasResources ? '✓ Equipado' : '⚠️ Superlotado'}
          </div>
        </Html>
      </group>

      {/* 3. ESCOLA PÚBLICA (Telhado perfeitamente alinhado sem triângulo saltando!) */}
      <group position={[-7.1, 0.02, -4.15]} rotation={[0, 0.12, 0]}>
        {/* Paredes Creme */}
        <RoundedBox args={[3.1, 1.25, 1.75]} position={[0, 0.625, 0]} radius={0.04} castShadow receiveShadow>
          <meshStandardMaterial color="#fef3c7" roughness={0.45} />
        </RoundedBox>
        {/* Bloco Superior de Fechamento sob a Cumeeira (sem vazar pelas laterais!) */}
        <RoundedBox args={[3.06, 0.36, 0.85]} position={[0, 1.35, 0]} radius={0.03} castShadow receiveShadow>
          <meshStandardMaterial color="#fde68a" roughness={0.45} />
        </RoundedBox>

        {/* Telhado de Duas Águas Alinhado */}
        <group position={[0, 1.25, 0]}>
          <mesh position={[0, 0.24, 0.48]} rotation={[0.46, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.36, 0.12, 1.16]} />
            <meshStandardMaterial color="#9a3412" roughness={0.65} />
          </mesh>
          <mesh position={[0, 0.24, -0.48]} rotation={[-0.46, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.36, 0.12, 1.16]} />
            <meshStandardMaterial color="#9a3412" roughness={0.65} />
          </mesh>
          {/* Cumeeira Central */}
          <RoundedBox args={[3.38, 0.14, 0.22]} position={[0, 0.48, 0]} radius={0.04} castShadow>
            <meshStandardMaterial color="#7c2d12" roughness={0.6} />
          </RoundedBox>
        </group>

        {[1, -1].map((dir) => (
          <group key={dir}>
            {[-0.95, -0.25].map((wx, i) => (
              <mesh key={i} position={[wx, 0.68, dir * 0.88]}>
                <boxGeometry args={[0.48, 0.42, 0.03]} />
                <meshStandardMaterial color="#0284c7" />
              </mesh>
            ))}
            <mesh position={[0.75, 0.48, dir * 0.88]}>
              <boxGeometry args={[0.52, 0.82, 0.03]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
            <RoundedBox args={[0.92, 0.28, 0.05]} position={[0.75, 1.04, dir * 0.89]} radius={0.02}>
              <meshStandardMaterial color="#15803d" />
            </RoundedBox>
            <Text
              position={[0.75, 1.04, dir * 0.93]}
              rotation={[0, dir === -1 ? Math.PI : 0, 0]}
              fontSize={0.17}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              ESCOLA
            </Text>
          </group>
        ))}

        <Html position={[0, 2.25, 0]} center distanceFactor={18}>
          <div className="px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400 text-[10px] font-black text-emerald-200 shadow-lg whitespace-nowrap">
            🎓 ESCOLA {stateHasResources ? '✓ Ensino Forte' : '⚠️ Em Greve'}
          </div>
        </Html>
      </group>

      {/* 4. EDIFÍCIO DA RECEITA FEDERAL (Teto limpo + Placa Superior em Alta Definição sem distorção!) */}
      <group position={[-7.05, 0.02, 3.7]} rotation={[0, 0.16, 0]}>
        <RoundedBox args={[4.15, 0.06, 2.05]} position={[0, 0.03, 0]} radius={0.04} receiveShadow>
          <meshStandardMaterial color="#94a3b8" roughness={0.75} />
        </RoundedBox>
        <RoundedBox args={[3.7, 2.25, 1.65]} position={[0, 1.15, 0]} radius={0.06} castShadow receiveShadow>
          <meshStandardMaterial color="#1e3a8a" roughness={0.25} metalness={0.35} />
        </RoundedBox>

        {/* Acabamento Arquitetônico Limpo no Teto (sem impressão duplicada no chão do teto) */}
        <RoundedBox args={[3.45, 0.08, 1.4]} position={[0, 2.29, 0]} radius={0.02} receiveShadow>
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.3} />
        </RoundedBox>

        {/* Placa Oficial da Receita Federal no Topo (Proporção exata 1.6:1 = 2.40 x 1.50 para zero distorção!) */}
        <group position={[0, 3.16, 0]}>
          {/* Hastes metálicas de sustentação da placa no teto */}
          <mesh position={[-0.75, -0.78, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.3, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.2} />
          </mesh>
          <mesh position={[0.75, -0.78, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.3, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.2} />
          </mesh>

          {/* Estrutura da Placa (2.48 x 1.58) */}
          <RoundedBox args={[2.48, 1.58, 0.12]} radius={0.04} castShadow>
            <meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.3} />
          </RoundedBox>

          {/* Painel Frontal e Traseiro com a Imagem Oficial da Receita Federal (2.41 x 1.50 = 344:214 exato!) */}
          {[1, -1].map((dir) => (
            <mesh key={dir} position={[0, 0, dir * 0.064]} rotation={[0, dir === -1 ? Math.PI : 0, 0]}>
              <planeGeometry args={[2.41, 1.5]} />
              <meshBasicMaterial map={receitaRoofTex} toneMapped={false} />
            </mesh>
          ))}
        </group>

        {[1, -1].map((dir) => (
          <group key={dir}>
            {[-1.3, -0.65, 0, 0.65, 1.3].map((wx, cIdx) =>
              [0.48, 0.92, 1.36, 1.8].map((wy, rIdx) => (
                <mesh key={`${cIdx}-${rIdx}`} position={[wx, wy, dir * 0.83]}>
                  <boxGeometry args={[0.48, 0.3, 0.02]} />
                  <meshStandardMaterial color="#38bdf8" roughness={0.15} metalness={0.7} />
                </mesh>
              ))
            )}
          </group>
        ))}

        <Html position={[0, 4.18, 0]} center distanceFactor={18}>
          <div className="px-2.5 py-0.5 rounded-full bg-sky-950/95 border border-sky-400 text-[11px] font-black text-sky-200 shadow-lg whitespace-nowrap">
            🦁 RECEITA FEDERAL DO BRASIL
          </div>
        </Html>
      </group>

      {/* 5. MONUMENTO DA ESTÁTUA EQUESTRE (Cavalo/Unicórnio empinado + Cavaleiro com Chapéu, Pluma e Espada Erguida!) */}
      <group position={[5.25, 0.02, -5.0]} rotation={[0, -0.28, 0]} scale={[1.12, 1.12, 1.12]}>
        {/* Pedestal de Pedra em Rampa (como na arte original!) */}
        <RoundedBox args={[1.55, 0.34, 0.78]} position={[0, 0.17, 0]} radius={0.03} castShadow receiveShadow>
          <meshStandardMaterial color="#94a3b8" roughness={0.65} />
        </RoundedBox>
        <RoundedBox
          args={[1.48, 0.24, 0.72]}
          position={[-0.02, 0.36, 0]}
          rotation={[0, 0, -0.16]}
          radius={0.03}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#64748b" roughness={0.6} />
        </RoundedBox>

        {/* === CAVALO / UNICÓRNIO DE PEDRA PRATEADA (Frente para -X) === */}
        <group position={[0, 0.42, 0]}>
          {/* Tronco do Cavalo levemente empinado para a frente (-X) */}
          <RoundedBox
            args={[0.92, 0.36, 0.34]}
            position={[0.02, 0.56, 0]}
            rotation={[0, 0, -0.22]}
            radius={0.14}
            castShadow
          >
            <meshStandardMaterial color="#cbd5e1" metalness={0.35} roughness={0.35} />
          </RoundedBox>

          {/* 2 Patas Traseiras apoiadas na parte direita (+X) do pedestal */}
          {[-0.1, 0.1].map((pz, i) => (
            <group key={`hind-${i}`} position={[0.36, 0.24, pz]}>
              <RoundedBox args={[0.13, 0.52, 0.11]} rotation={[0, 0, -0.28]} radius={0.04} castShadow>
                <meshStandardMaterial color="#cbd5e1" metalness={0.35} roughness={0.35} />
              </RoundedBox>
            </group>
          ))}

          {/* Pata Dianteira Esquerda apoiada no pedestal */}
          <RoundedBox
            args={[0.12, 0.56, 0.1]}
            position={[-0.24, 0.34, -0.1]}
            rotation={[0, 0, -0.25]}
            radius={0.04}
            castShadow
          >
            <meshStandardMaterial color="#cbd5e1" metalness={0.35} roughness={0.35} />
          </RoundedBox>

          {/* Pata Dianteira Direita ERGUIDA / DOBRADA (igual ao desenho do tabuleiro!) */}
          <group position={[-0.32, 0.56, 0.1]}>
            {/* Coxa/Braço dianteiro levantado */}
            <RoundedBox
              args={[0.32, 0.11, 0.1]}
              position={[-0.12, 0.02, 0]}
              rotation={[0, 0, -0.25]}
              radius={0.04}
              castShadow
            >
              <meshStandardMaterial color="#cbd5e1" metalness={0.35} roughness={0.35} />
            </RoundedBox>
            {/* Canela/Casco dobrado para baixo */}
            <RoundedBox
              args={[0.1, 0.26, 0.09]}
              position={[-0.24, -0.08, 0]}
              rotation={[0, 0, 0.35]}
              radius={0.04}
              castShadow
            >
              <meshStandardMaterial color="#cbd5e1" metalness={0.35} roughness={0.35} />
            </RoundedBox>
          </group>

          {/* Cauda Longa Esvoaçante atrás (+X) */}
          <group position={[0.48, 0.46, 0]} rotation={[0, 0, -0.35]}>
            <RoundedBox args={[0.14, 0.48, 0.14]} position={[0.06, -0.16, 0]} radius={0.06} castShadow>
              <meshStandardMaterial color="#94a3b8" metalness={0.3} roughness={0.4} />
            </RoundedBox>
          </group>

          {/* Pescoço Erguido + Cabeça + Focinho + Orelhas + Chifre */}
          <group position={[-0.36, 0.82, 0]}>
            {/* Pescoço */}
            <RoundedBox args={[0.26, 0.52, 0.24]} rotation={[0, 0, -0.32]} radius={0.08} castShadow>
              <meshStandardMaterial color="#cbd5e1" metalness={0.35} roughness={0.35} />
            </RoundedBox>
            {/* Cabeça e Focinho apontando para -X */}
            <RoundedBox
              args={[0.34, 0.18, 0.2]}
              position={[-0.16, 0.24, 0]}
              rotation={[0, 0, 0.38]}
              radius={0.06}
              castShadow
            >
              <meshStandardMaterial color="#cbd5e1" metalness={0.35} roughness={0.35} />
            </RoundedBox>
            {/* Orelhas e Chifre de Unicórnio no topo da cabeça */}
            <mesh position={[-0.12, 0.42, 0]} rotation={[0, 0, 0.35]} castShadow>
              <coneGeometry args={[0.045, 0.22, 8]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.2} />
            </mesh>
            {/* Rédea escura ligando o focinho à mão do cavaleiro */}
            <mesh position={[-0.02, 0.08, 0.12]} rotation={[0, 0, -0.45]}>
              <boxGeometry args={[0.38, 0.025, 0.02]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>

          {/* Sela e Alforje Marrom no Dorso do Cavalo */}
          <RoundedBox
            args={[0.42, 0.14, 0.38]}
            position={[0.02, 0.72, 0]}
            rotation={[0, 0, -0.2]}
            radius={0.04}
            castShadow
          >
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </RoundedBox>
          <RoundedBox args={[0.18, 0.14, 0.41]} position={[0.2, 0.65, 0]} radius={0.05} castShadow>
            <meshStandardMaterial color="#92400e" roughness={0.7} />
          </RoundedBox>

          {/* === CAVALEIRO COM TÚNICA VERMELHA, CALÇA AZUL, CHAPÉU COM PLUMA E ESPADA ERGUIDA === */}
          <group position={[0.0, 0.78, 0]}>
            {/* Pernas e Botas Azuis nas duas laterais da sela */}
            {[-0.17, 0.17].map((lz, li) => (
              <group key={`leg-${li}`} position={[-0.02, -0.18, lz]}>
                <RoundedBox args={[0.13, 0.36, 0.09]} rotation={[0, 0, -0.18]} radius={0.03} castShadow>
                  <meshStandardMaterial color="#1d4ed8" roughness={0.5} />
                </RoundedBox>
                {/* Bota Azul */}
                <RoundedBox args={[0.16, 0.08, 0.09]} position={[-0.04, -0.16, 0]} radius={0.02}>
                  <meshStandardMaterial color="#1e40af" roughness={0.5} />
                </RoundedBox>
              </group>
            ))}

            {/* Tronco / Casaco Vermelho do Cavaleiro */}
            <mesh position={[0, 0.22, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.16, 0.44, 12]} />
              <meshStandardMaterial color="#b91c1c" roughness={0.45} />
            </mesh>

            {/* Cabeça Cinza de Estátua */}
            <mesh position={[0, 0.52, 0]} castShadow>
              <sphereGeometry args={[0.11, 14, 14]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.3} roughness={0.4} />
            </mesh>

            {/* Chapéu Preto de Aba Larga + Pluma Vermelha */}
            <group position={[0, 0.6, 0]} rotation={[0, 0, -0.12]}>
              {/* Aba do Chapéu */}
              <mesh scale={[1.25, 1, 1]} castShadow>
                <cylinderGeometry args={[0.19, 0.19, 0.03, 16]} />
                <meshStandardMaterial color="#0f172a" roughness={0.6} />
              </mesh>
              {/* Copa do Chapéu */}
              <mesh position={[0, 0.08, 0]} castShadow>
                <coneGeometry args={[0.12, 0.16, 14]} />
                <meshStandardMaterial color="#0f172a" roughness={0.6} />
              </mesh>
              {/* Pluma Vermelha atrás do Chapéu */}
              <RoundedBox
                args={[0.22, 0.07, 0.03]}
                position={[0.14, 0.12, 0]}
                rotation={[0, 0, 0.45]}
                radius={0.02}
                castShadow
              >
                <meshStandardMaterial color="#dc2626" roughness={0.4} />
              </RoundedBox>
            </group>

            {/* Braço Esquerdo segurando as rédeas */}
            <RoundedBox
              args={[0.28, 0.08, 0.08]}
              position={[-0.14, 0.18, 0.12]}
              rotation={[0, 0.25, 0.4]}
              radius={0.03}
              castShadow
            >
              <meshStandardMaterial color="#b91c1c" roughness={0.45} />
            </RoundedBox>

            {/* Braço Direito Erguido segurando a ESPADA PRATEADA para o alto! */}
            <group position={[-0.14, 0.34, -0.1]}>
              {/* Braço vermelho erguido */}
              <RoundedBox
                args={[0.24, 0.085, 0.085]}
                position={[-0.06, 0.04, 0]}
                rotation={[0, 0, -0.6]}
                radius={0.03}
                castShadow
              >
                <meshStandardMaterial color="#b91c1c" roughness={0.45} />
              </RoundedBox>

              {/* Espada Vertical (Punho + Guarda-Mão + Lâmina de Aço Brilhante) */}
              <group position={[-0.16, 0.16, 0]}>
                {/* Punho */}
                <mesh position={[0, 0.04, 0]}>
                  <cylinderGeometry args={[0.025, 0.025, 0.1, 8]} />
                  <meshStandardMaterial color="#334155" />
                </mesh>
                {/* Guarda-Mão Horizontal */}
                <mesh position={[0, 0.09, 0]}>
                  <boxGeometry args={[0.16, 0.03, 0.04]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.6} />
                </mesh>
                {/* Lâmina da Espada apontando para o céu */}
                <mesh position={[0, 0.34, 0]} castShadow>
                  <boxGeometry args={[0.055, 0.48, 0.018]} />
                  <meshStandardMaterial color="#f8fafc" metalness={0.85} roughness={0.15} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* 6. PLACAS DE ÔNIBUS PRÓXIMAS ÀS CASAS DA TRILHA */}
      {busSignsNearTiles.map((b, idx) => (
        <BusSign3D key={idx} position={b.pos} rotationY={b.rot} />
      ))}
    </group>
  );
}

// ============================================================================
// 4. FLORESTA 3D, JARDIM DE FLORES (Filtradas para NUNCA cair sobre as casas!) E PÁSSAROS
// ============================================================================
export function NatureAndBirds3D() {
  const birdsRef = useRef();

  const isTooCloseToTrail = (x, z, minDist = 1.25) => {
    for (const t of BOARD_TILES) {
      const [tx, , tz] = getTilePosition3D(t.id);
      if (Math.hypot(x - tx, z - tz) < minDist) return true;
    }
    return false;
  };

  const trees = useMemo(() => {
    const rawTrees = [
      [1.8, -7.5, '#3f6212', 1.1],
      [2.9, -7.7, '#4d7c0f', 1.25],
      [4.1, -7.6, '#365314', 1.0],
      [8.2, -7.6, '#3f6212', 1.2],
      [9.4, -7.4, '#4d7c0f', 1.15],
      [10.5, -7.2, '#365314', 1.3],
      [4.2, -4.2, '#4d7c0f', 1.1],
      [3.3, -3.5, '#365314', 0.95],
      [6.4, -4.6, '#3f6212', 1.05],
      [6.8, -3.4, '#4d7c0f', 1.15],
      [-8.3, 5.65, '#15803d', 0.72],
      [-6.85, 5.55, '#16a34a', 0.72],
      [-5.4, 5.45, '#15803d', 0.72],
      [-0.8, 6.8, '#166534', 1.25]
    ];
    return rawTrees.filter(([tx, tz]) => !isTooCloseToTrail(tx, tz, 1.15));
  }, []);

  const flowers = useMemo(() => {
    const list = [];
    const flowerColors = ['#f472b6', '#60a5fa', '#facc15', '#ffffff', '#fb923c', '#c084fc'];
    for (let i = 0; i < 42; i++) {
      const fx = -10.8 + (i % 6) * 1.4 + Math.sin(i * 2.3) * 0.35;
      const fz = -7.4 + Math.floor(i / 6) * 1.05 + Math.cos(i * 1.7) * 0.3;
      // Evita o prédio da Escola e evita 100% qualquer casa da trilha!
      if (fx > -9.2 && fx < -5.0 && fz > -5.5 && fz < -2.8) continue;
      if (isTooCloseToTrail(fx, fz, 1.28)) continue;
      list.push({
        x: fx,
        z: fz,
        color: flowerColors[i % flowerColors.length],
        rot: i * 0.7
      });
    }
    return list;
  }, []);

  useFrame(({ clock }) => {
    if (birdsRef.current) {
      const t = clock.getElapsedTime();
      birdsRef.current.position.y = 1.65 + Math.sin(t * 2.2) * 0.18;
      birdsRef.current.position.x = -9.8 + Math.cos(t * 0.8) * 0.35;
    }
  });

  return (
    <group>
      {trees.map(([tx, tz, col, sc], idx) => (
        <group key={idx} position={[tx, 0.02, tz]} scale={[sc, sc, sc]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.14, 0.5, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.65, 0]} castShadow>
            <dodecahedronGeometry args={[0.45, 1]} />
            <meshStandardMaterial color={col} roughness={0.65} />
          </mesh>
          <mesh position={[0.18, 0.85, 0.1]} castShadow>
            <dodecahedronGeometry args={[0.32, 1]} />
            <meshStandardMaterial color={col} roughness={0.65} />
          </mesh>
        </group>
      ))}

      {flowers.map((f, idx) => (
        <group key={idx} position={[f.x, 0.03, f.z]} rotation={[0, f.rot, 0]}>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.04, 8]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
          {[0, 1, 2, 3, 4].map((p) => (
            <mesh key={p} rotation={[0, (p * Math.PI * 2) / 5, 0]} position={[0, 0.01, 0]}>
              <boxGeometry args={[0.06, 0.02, 0.22]} />
              <meshStandardMaterial color={f.color} />
            </mesh>
          ))}
        </group>
      ))}

      <group ref={birdsRef} position={[-9.8, 1.65, 1.2]}>
        {[
          [0, 0, 0],
          [0.45, 0.1, -0.35],
          [-0.4, -0.05, -0.4],
          [0.85, 0.2, -0.7],
          [-0.8, 0.15, -0.75],
          [0.2, 0.25, -0.9],
          [-0.25, 0.1, -1.1]
        ].map(([bx, by, bz], bIdx) => (
          <group key={bIdx} position={[bx, by, bz]} rotation={[0, 0.4, 0]}>
            <mesh position={[-0.08, 0, 0]} rotation={[0, 0, 0.35]} castShadow>
              <boxGeometry args={[0.18, 0.02, 0.06]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.08, 0, 0]} rotation={[0, 0, -0.35]} castShadow>
              <boxGeometry args={[0.18, 0.02, 0.06]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// ============================================================================
// 5. SUPERFÍCIE DO TABULEIRO (100% delimitada ao retângulo da mesa e sem manchas nas casas!)
// ============================================================================
export function RoadAndTiles3D({ onSelectTile, currentPlayerPos, forkOptions }) {
  const boardGroundTex = useCurvedBoardTrailTexture();

  return (
    <group>
      {/* Plano Único do Tabuleiro (Grama + Areia + Água + Trilha em Fita Contínua Curva) */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[BOARD_WIDTH, BOARD_HEIGHT]} />
        <meshStandardMaterial map={boardGroundTex} roughness={0.82} metalness={0.05} />
      </mesh>

      {/* Áreas de clique nas casas (com depthWrite={false} e opacity={0} para NUNCA criar círculos verdes nas casas!) */}
      {BOARD_TILES.map((tile) => {
        const [tx, , tz] = getTilePosition3D(tile.id);
        const isCurrent = currentPlayerPos === tile.id;
        const isForkTarget = forkOptions?.some((o) => o.nextTileId === tile.id);

        return (
          <group key={tile.id} position={[tx, 0.03, tz]}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectTile(tile);
              }}
            >
              <ringGeometry args={[isForkTarget ? 0.32 : 0.25, isForkTarget ? 0.52 : 0.38, 24]} />
              <meshBasicMaterial
                color={isForkTarget ? '#10b981' : '#facc15'}
                transparent
                opacity={isForkTarget ? 0.85 : isCurrent ? 0.65 : 0}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
