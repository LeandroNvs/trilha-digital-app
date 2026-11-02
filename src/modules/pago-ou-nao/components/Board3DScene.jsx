import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Html,
  RoundedBox,
  useTexture,
  Line
} from '@react-three/drei';
import * as THREE from 'three';
import { BOARD_TILES, BOARD_WIDTH, BOARD_HEIGHT, getTilePosition3D } from '../data/boardData.js';
import {
  BeachBiome3D,
  DuckPondAndPark3D,
  BuildingsAndMonuments3D,
  NatureAndBirds3D,
  RoadAndTiles3D
} from './World3DElements.jsx';

// ============================================================================
// 1. DADO 3D FÍSICO ANIMADO (Salta, gira em X/Y/Z, rebate nos prédios e para no valor sorteado!)
// ============================================================================
const FACE_ROTATIONS = {
  1: new THREE.Euler(0, 0, 0),
  2: new THREE.Euler(-Math.PI / 2, 0, 0),
  3: new THREE.Euler(0, 0, Math.PI / 2),
  4: new THREE.Euler(0, 0, -Math.PI / 2),
  5: new THREE.Euler(Math.PI / 2, 0, 0),
  6: new THREE.Euler(Math.PI, 0, 0)
};

// Caixas de colisão orientadas (OBB) dos prédios e monumentos 3D do tabuleiro para o dado rebater nas paredes!
const BUILDING_COLLIDERS = [
  // 1. Delegacia de Polícia
  { x: 3.35, z: 2.05, rotY: 0.46, halfW: 1.62, halfD: 0.92, height: 2.5 },
  // 2. Hospital Central
  { x: 8.25, z: -2.0, rotY: 0.1, halfW: 1.4, halfD: 0.82, height: 2.8 },
  // 3. Escola Pública
  { x: -7.1, z: -4.15, rotY: 0.12, halfW: 1.75, halfD: 1.02, height: 1.9 },
  // 4. Receita Federal
  { x: -7.05, z: 3.7, rotY: 0.16, halfW: 2.15, halfD: 1.1, height: 3.9 },
  // 5. Monumento da Estátua Equestre
  { x: 5.25, z: -5.0, rotY: -0.28, halfW: 0.98, halfD: 0.58, height: 2.2 }
];

// Colisor elíptico do Lago Central dos Patos (incluindo a borda de pedras) para desviar o dado da água
const LAKE_COLLIDER = {
  x: 0.15,
  z: -1.85,
  rx: 1.58,
  rz: 1.32
};

function resolveDiceBuildingRebound(pos, vel, diceRadius = 0.36) {
  // 1. Desvio e rebote nas pedras do Lago Central (nunca deixa o dado cair ou atravessar o lago!)
  {
    const dx = pos.x - LAKE_COLLIDER.x;
    const dz = pos.z - LAKE_COLLIDER.z;
    const rx = LAKE_COLLIDER.rx + diceRadius;
    const rz = LAKE_COLLIDER.rz + diceRadius;
    const nx = dx / rx;
    const nz = dz / rz;
    const dist = Math.hypot(nx, nz);

    if (dist < 1.0) {
      const ux = dist > 0.0001 ? nx / dist : 0;
      const uz = dist > 0.0001 ? nz / dist : 1;

      // Posiciona o dado imediatamente fora da borda de pedras do lago
      pos.x = LAKE_COLLIDER.x + ux * rx;
      pos.z = LAKE_COLLIDER.z + uz * rz;

      // Normal unitária da elipse no ponto de contato
      const gradX = ux / rx;
      const gradZ = uz / rz;
      const gradLen = Math.hypot(gradX, gradZ) || 1;
      const normX = gradX / gradLen;
      const normZ = gradZ / gradLen;

      // Tangente para desviar suavemente contornando o lago
      const tangX = -normZ;
      const tangZ = normX;

      const vDotN = vel.x * normX + vel.z * normZ;
      const vDotT = vel.x * tangX + vel.z * tangZ;
      const tangSign = vDotT >= 0 ? 1 : -1;

      if (vDotN < 0) {
        const bounceN = Math.max(-vDotN * 0.8, 2.6);
        const slideT = Math.max(Math.abs(vDotT), 2.2) * tangSign;
        vel.x = normX * bounceN + tangX * slideT;
        vel.z = normZ * bounceN + tangZ * slideT;
      } else {
        vel.x += normX * 2.0;
        vel.z += normZ * 2.0;
      }
    }
  }

  // 2. Colisão com os prédios e monumentos 3D
  for (const b of BUILDING_COLLIDERS) {
    if (pos.y - 0.3 > b.height) continue;

    const dx = pos.x - b.x;
    const dz = pos.z - b.z;
    const cos = Math.cos(-b.rotY);
    const sin = Math.sin(-b.rotY);
    const lx = dx * cos - dz * sin;
    const lz = dx * sin + dz * cos;

    const ex = b.halfW + diceRadius;
    const ez = b.halfD + diceRadius;

    if (Math.abs(lx) < ex && Math.abs(lz) < ez) {
      const penX = ex - Math.abs(lx);
      const penZ = ez - Math.abs(lz);

      let lvx = vel.x * cos - vel.z * sin;
      let lvz = vel.x * sin + vel.z * cos;
      let newLx = lx;
      let newLz = lz;

      if (penX < penZ) {
        const signX = lx >= 0 ? 1 : -1;
        newLx = signX * ex;
        lvx = signX * Math.max(Math.abs(lvx) * 0.85, 3.2);
      } else {
        const signZ = lz >= 0 ? 1 : -1;
        newLz = signZ * ez;
        lvz = signZ * Math.max(Math.abs(lvz) * 0.85, 3.2);
      }

      const cosB = Math.cos(b.rotY);
      const sinB = Math.sin(b.rotY);
      pos.x = b.x + newLx * cosB - newLz * sinB;
      pos.z = b.z + newLx * sinB + newLz * cosB;
      vel.x = lvx * cosB - lvz * sinB;
      vel.z = lvx * sinB + lvz * cosB;
    }
  }

  // Limites da borda da mesa do tabuleiro
  const maxX = BOARD_WIDTH * 0.44;
  const maxZ = BOARD_HEIGHT * 0.44;
  if (pos.x > maxX) {
    pos.x = maxX;
    vel.x = -Math.abs(vel.x) * 0.75;
  } else if (pos.x < -maxX) {
    pos.x = -maxX;
    vel.x = Math.abs(vel.x) * 0.75;
  }
  if (pos.z > maxZ) {
    pos.z = maxZ;
    vel.z = -Math.abs(vel.z) * 0.75;
  } else if (pos.z < -maxZ) {
    pos.z = -maxZ;
    vel.z = Math.abs(vel.z) * 0.75;
  }
}

function Pip({ position, color = '#0f172a' }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.052, 12, 12]} />
      <meshStandardMaterial color={color} roughness={0.2} />
    </mesh>
  );
}

function Dice3D({ value, rollId, targetPosition }) {
  const diceGroupRef = useRef();
  const physRef = useRef({
    active: false,
    startTime: 0,
    lastRollId: 0,
    pos: new THREE.Vector3(0, 0.31, 2.2),
    vel: new THREE.Vector3(0, 0, 0)
  });

  useEffect(() => {
    const p = physRef.current;
    if (rollId > 0 && value && rollId !== p.lastRollId) {
      p.lastRollId = rollId;
      p.active = true;
      p.startTime = performance.now();

      let aimX = THREE.MathUtils.clamp((targetPosition?.[0] || 0) * 0.35, -6.5, 6.5);
      let aimZ = THREE.MathUtils.clamp((targetPosition?.[2] || 0) * 0.35 + 1.1, -4.8, 5.2);

      // Se a área de mira cair próxima ao Lago Central, desvia o alvo para a grama ao sul do lago
      const ldx = (aimX - LAKE_COLLIDER.x) / (LAKE_COLLIDER.rx + 0.85);
      const ldz = (aimZ - LAKE_COLLIDER.z) / (LAKE_COLLIDER.rz + 0.85);
      if (Math.hypot(ldx, ldz) < 1.0) {
        aimZ = Math.max(aimZ, LAKE_COLLIDER.z + LAKE_COLLIDER.rz + 0.9);
      }

      p.pos.set(aimX - 3.2, 1.55, aimZ + 2.8);
      p.vel.set(3.4, 3.8, -3.0);
      // Garante que nunca nasça dentro do lago ou de um prédio
      resolveDiceBuildingRebound(p.pos, p.vel, 0.42);
    }
  }, [rollId, value, targetPosition]);

  useFrame((_, delta) => {
    if (!diceGroupRef.current || !value) return;

    const p = physRef.current;
    const dt = Math.min(delta, 0.05);
    const elapsed = (performance.now() - p.startTime) / 1000;
    const duration = 1.15;
    const targetEuler = FACE_ROTATIONS[value] || FACE_ROTATIONS[1];

    if (p.active && elapsed < duration) {
      const progress = elapsed / duration;
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // Integração física horizontal + gravidade e quiques verticais
      p.pos.x += p.vel.x * dt;
      p.pos.z += p.vel.z * dt;
      p.pos.y += p.vel.y * dt;
      p.vel.y -= 24.0 * dt;

      if (p.pos.y <= 0.305) {
        p.pos.y = 0.305;
        if (p.vel.y < -1.0) {
          p.vel.y = -p.vel.y * 0.56;
        } else {
          p.vel.y = 0;
        }
        // Atrito na mesa
        p.vel.x *= Math.max(0, 1 - 2.4 * dt);
        p.vel.z *= Math.max(0, 1 - 2.4 * dt);
      }

      // Colisão física com desvio no Lago Central e rebote nas paredes dos prédios!
      resolveDiceBuildingRebound(p.pos, p.vel, 0.36);

      diceGroupRef.current.position.copy(p.pos);

      const extraSpins = (1 - easeOut) * Math.PI * 8;
      diceGroupRef.current.rotation.set(
        targetEuler.x + extraSpins,
        targetEuler.y + extraSpins * 0.8,
        targetEuler.z + extraSpins * 1.2
      );
    } else {
      p.active = false;
      p.pos.y = 0.305;
      resolveDiceBuildingRebound(p.pos, p.vel, 0.36);
      diceGroupRef.current.position.copy(p.pos);
      diceGroupRef.current.rotation.set(targetEuler.x, targetEuler.y, targetEuler.z);
    }
  });

  if (!value) return null;

  const d = 0.295;
  const o = 0.145;

  return (
    <group ref={diceGroupRef} position={[0, 0.31, 2.2]}>
      <RoundedBox args={[0.58, 0.58, 0.58]} radius={0.09} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
      </RoundedBox>

      {/* Face 1 (+Y Topo) */}
      <Pip position={[0, d, 0]} color="#ef4444" />

      {/* Face 6 (-Y Base) */}
      <Pip position={[-o, -d, -o]} />
      <Pip position={[-o, -d, 0]} />
      <Pip position={[-o, -d, o]} />
      <Pip position={[o, -d, -o]} />
      <Pip position={[o, -d, 0]} />
      <Pip position={[o, -d, o]} />

      {/* Face 2 (+Z Frente) */}
      <Pip position={[-o, o, d]} />
      <Pip position={[o, -o, d]} />

      {/* Face 5 (-Z Trás) */}
      <Pip position={[-o, -o, -d]} />
      <Pip position={[o, o, -d]} />
      <Pip position={[-o, o, -d]} />
      <Pip position={[o, -o, -d]} />
      <Pip position={[0, 0, -d]} />

      {/* Face 3 (+X Direita) */}
      <Pip position={[d, -o, -o]} />
      <Pip position={[d, 0, 0]} />
      <Pip position={[d, o, o]} />

      {/* Face 4 (-X Esquerda - 4 pontos nos cantos!) */}
      <Pip position={[-d, -o, -o]} />
      <Pip position={[-d, o, -o]} />
      <Pip position={[-d, -o, o]} />
      <Pip position={[-d, o, o]} />
    </group>
  );
}

// ============================================================================
// 2. TABULEIRO HÍBRIDO: MODO MUNDO 3D COMPLETO OU TABULEIRO 2D ORIGINAL
// ============================================================================
function BoardWorldContainer({
  stateHasResources,
  onSelectTile,
  currentPlayerPos,
  showPathOverlay,
  forkOptions,
  boardVisualMode
}) {
  const boardTexture = useTexture('/assets/board_official.jpg');
  useMemo(() => {
    if (boardTexture) {
      boardTexture.colorSpace = THREE.SRGBColorSpace;
      boardTexture.needsUpdate = true;
    }
  }, [boardTexture]);

  const graphEdges = useMemo(() => {
    const edges = [];
    for (const tile of BOARD_TILES) {
      if (!tile.next) continue;
      const [x1, , z1] = getTilePosition3D(tile.id);
      for (const nextId of tile.next) {
        const [x2, , z2] = getTilePosition3D(nextId);
        edges.push({
          from: tile.id,
          to: nextId,
          isFork: tile.next.length > 1,
          points: [
            [x1, 0.24, z1],
            [x2, 0.24, z2]
          ]
        });
      }
    }
    return edges;
  }, []);

  const isFull3D = boardVisualMode === '3d_world';

  return (
    <group>
      {/* Base / Moldura da Ilha 3D */}
      <RoundedBox
        args={[BOARD_WIDTH + 1.0, 0.35, BOARD_HEIGHT + 1.0]}
        position={[0, -0.18, 0]}
        radius={0.16}
        smoothness={4}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color={isFull3D ? '#14532d' : '#1e293b'} roughness={0.65} />
      </RoundedBox>

      {isFull3D ? (
        <>
          {/* Tabuleiro Plano com Grama, Areia e Água Delimitadas ao Retângulo da Mesa + Trilha Curva Contínua */}
          <RoadAndTiles3D
            onSelectTile={onSelectTile}
            currentPlayerPos={currentPlayerPos}
            forkOptions={forkOptions}
          />

          {/* Elementos 3D da Praia (Guarda-Sóis, Toalhas, Estrelas-do-Mar e Ondas contidas na mesa) */}
          <BeachBiome3D />

          {/* Lago Central com Pedras 3D, Patinhos Nadando e Bancos da Praça */}
          <DuckPondAndPark3D />

          {/* Os 4 Prédios Arquitetônicos 3D + Estátua + Placas de Ônibus + Natureza 3D */}
          <BuildingsAndMonuments3D stateHasResources={stateHasResources} />
          <NatureAndBirds3D />
        </>
      ) : (
        <>
          {/* Textura 2D Clássica Costurada dos 4 PDFs da Receita Federal (limpa, sem elementos 3D sobrepostos) */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[BOARD_WIDTH, BOARD_HEIGHT]} />
            <meshBasicMaterial map={boardTexture} toneMapped={false} />
          </mesh>

          {/* Marcadores de clique sobre a imagem 2D (sem depthWrite para nunca criar manchas nas casas) */}
          {BOARD_TILES.map((tile) => {
            const [tx, , tz] = getTilePosition3D(tile.id);
            const isCurrent = currentPlayerPos === tile.id;
            const isForkChoiceTarget = forkOptions?.some((o) => o.nextTileId === tile.id);
            const isHighlighted = isForkChoiceTarget || isCurrent;
            return (
              <group key={tile.id} position={[tx, 0.04, tz]}>
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTile(tile);
                  }}
                >
                  <circleGeometry args={[isForkChoiceTarget ? 0.48 : 0.34, 24]} />
                  <meshBasicMaterial
                    color={isForkChoiceTarget ? '#10b981' : '#facc15'}
                    transparent
                    opacity={isForkChoiceTarget ? 0.8 : isCurrent ? 0.5 : 0}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            );
          })}
        </>
      )}

      {/* Visualizador Opcional de Conexões da Trilha e Bifurcações */}
      {showPathOverlay &&
        graphEdges.map((edge, idx) => (
          <Line
            key={idx}
            points={edge.points}
            color={edge.isFork ? '#facc15' : '#38bdf8'}
            lineWidth={edge.isFork ? 3.5 : 2}
          />
        ))}
    </group>
  );
}

// ============================================================================
// 3. PINO 3D DO JOGADOR QUE CAMINHA PASSO A PASSO PELA TRILHA CURVA OFICIAL!
// ============================================================================
function SteppingPlayerPawn3D({ player, totalAtTile, offsetIndex, isCurrentTurn, diceRollId }) {
  const groupRef = useRef();
  const [badgeTileIndex, setBadgeTileIndex] = useState(player.position);

  const walkStateRef = useRef({
    currentTile: player.position,
    queue: [],
    stepping: false,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    toTile: player.position,
    stepProgress: 0,
    waitUntilTime: 0,
    lastMoveId: player.lastMoveId || 0,
    lastKnownPos: player.position,
    lastRollId: diceRollId || 0,
    idlePhase: 0,
    initialized: false
  });

  const computeTileVec = (tileId, applyOffset = true) => {
    const [tx, ty, tz] = getTilePosition3D(tileId);
    if (!applyOffset || totalAtTile <= 1) return new THREE.Vector3(tx, ty, tz);
    const angle = (offsetIndex / totalAtTile) * Math.PI * 2;
    const radius = 0.28;
    return new THREE.Vector3(tx + Math.cos(angle) * radius, ty, tz + Math.sin(angle) * radius);
  };

  // Altura da superfície do tabuleiro (0.02 apoia a base do pino diretamente no chão sem flutuar!)
  const PAWN_GROUND_Y = 0.02;

  useEffect(() => {
    const st = walkStateRef.current;
    if (groupRef.current && !st.initialized) {
      const initVec = computeTileVec(player.position, true);
      groupRef.current.position.set(initVec.x, PAWN_GROUND_Y, initVec.z);
      st.currentTile = player.position;
      st.initialized = true;
    }
  }, []);

  useEffect(() => {
    const st = walkStateRef.current;
    const currentMoveId = player.lastMoveId || 0;
    const moveChanged = currentMoveId !== st.lastMoveId;
    const posChanged = player.position !== st.lastKnownPos;
    const rollChanged = (diceRollId || 0) !== st.lastRollId;

    if (!moveChanged && !posChanged) {
      if (rollChanged) {
        st.lastRollId = diceRollId || 0;
      }
      return;
    }

    st.lastMoveId = currentMoveId;
    st.lastKnownPos = player.position;

    if (player.stepQueue && player.stepQueue.length > 0) {
      st.queue = [...player.stepQueue];
    } else if (st.currentTile !== player.position) {
      st.queue = [player.position];
    }

    if (rollChanged && diceRollId > 0) {
      st.lastRollId = diceRollId;
      st.waitUntilTime = performance.now() + 1150;
    } else {
      st.lastRollId = diceRollId || 0;
      st.waitUntilTime = 0;
    }
  }, [player.position, player.lastMoveId, player.stepQueue, diceRollId]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const st = walkStateRef.current;
    const dt = Math.min(delta, 0.1);
    const now = performance.now();

    // Frequência 4.5 idêntica para o pulo parado na espera e para cada passo entre casas!
    // Um pulo completo (de 0 a Math.PI) dura Math.PI / 4.5 ≈ 0.698s (~700ms).
    const HOP_FREQ = 4.5;
    const STEP_SPEED = HOP_FREQ / Math.PI;
    const HOP_HEIGHT = 0.22;

    // Enquanto aguarda o dado 3D terminar de quicar na mesa:
    if (now < st.waitUntilTime) {
      if (isCurrentTurn) {
        st.idlePhase += dt * HOP_FREQ;
        groupRef.current.position.y = PAWN_GROUND_Y + Math.abs(Math.sin(st.idlePhase)) * HOP_HEIGHT;
      } else {
        groupRef.current.position.y = PAWN_GROUND_Y;
      }
      return;
    }

    // Inicia o próximo passo da fila se não estiver no meio de um salto
    if (!st.stepping && st.queue.length > 0) {
      const nextTile = st.queue.shift();
      const isLastStep = st.queue.length === 0;
      st.stepping = true;
      st.stepProgress = 0;
      st.fromPos.copy(groupRef.current.position);
      st.toPos.copy(computeTileVec(nextTile, isLastStep));
      st.toTile = nextTile;
    }

    // Executa o salto suave de uma casa para a próxima exatamente na frequência 4.5
    if (st.stepping) {
      st.stepProgress += dt * STEP_SPEED;
      if (st.stepProgress >= 1) {
        groupRef.current.position.x = st.toPos.x;
        groupRef.current.position.z = st.toPos.z;
        groupRef.current.position.y = PAWN_GROUND_Y;
        st.currentTile = st.toTile;
        st.stepping = false;
        st.idlePhase = 0;
        setBadgeTileIndex(st.toTile);
      } else {
        const smooth = st.stepProgress * st.stepProgress * (3 - 2 * st.stepProgress);
        groupRef.current.position.x = THREE.MathUtils.lerp(st.fromPos.x, st.toPos.x, smooth);
        groupRef.current.position.z = THREE.MathUtils.lerp(st.fromPos.z, st.toPos.z, smooth);
        groupRef.current.position.y = PAWN_GROUND_Y + Math.sin(st.stepProgress * Math.PI) * HOP_HEIGHT;
      }
      return;
    }

    // Parado na casa: ajusta posição lateral suavemente e pula na mesma frequência 4.5 se for a sua vez
    const restVec = computeTileVec(st.currentTile, true);
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      restVec.x,
      Math.min(1, dt * 6)
    );
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      restVec.z,
      Math.min(1, dt * 6)
    );

    if (isCurrentTurn) {
      st.idlePhase += dt * HOP_FREQ;
      groupRef.current.position.y = PAWN_GROUND_Y + Math.abs(Math.sin(st.idlePhase)) * HOP_HEIGHT;
    } else {
      st.idlePhase = 0;
      groupRef.current.position.y = PAWN_GROUND_Y;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.28, 0.12, 20]} />
        <meshStandardMaterial color={player.color} roughness={0.2} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.34, 0]} castShadow>
        <coneGeometry args={[0.21, 0.55, 20]} />
        <meshStandardMaterial color={player.color} roughness={0.2} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow>
        <sphereGeometry args={[0.17, 20, 20]} />
        <meshStandardMaterial color={player.color} roughness={0.15} metalness={0.4} />
      </mesh>

      {isCurrentTurn && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.44, 24]} />
          <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} />
        </mesh>
      )}

      <Html position={[0, 1.12, 0]} center distanceFactor={16}>
        <div
          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap shadow-lg transition-transform ${
            isCurrentTurn
              ? 'bg-amber-400 text-slate-950 scale-110 ring-2 ring-white'
              : 'bg-slate-900/90 text-white border border-slate-700'
          }`}
        >
          {player.name} • #{badgeTileIndex}
        </div>
      </Html>
    </group>
  );
}

export default function Board3DScene({
  gameState,
  onSelectTile,
  showPathOverlay = false,
  boardVisualMode = '3d_world'
}) {
  const currentPlayer = gameState.players[gameState.turnIndex];
  const currentTilePos = useMemo(
    () => getTilePosition3D(currentPlayer?.position || 0),
    [currentPlayer?.position]
  );

  const playersByTile = useMemo(() => {
    const map = {};
    for (const p of gameState.players) {
      if (!map[p.position]) map[p.position] = [];
      map[p.position].push(p.id);
    }
    return map;
  }, [gameState.players]);

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{ position: [0, 16.5, 13.5], fov: 44 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#07111e']} />
        <fog attach="fog" args={['#07111e', 28, 52]} />

        <ambientLight intensity={0.85} />
        <directionalLight
          castShadow
          position={[12, 24, 14]}
          intensity={1.45}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />

        <Suspense fallback={null}>
          <BoardWorldContainer
            stateHasResources={gameState.stateHasResources}
            onSelectTile={onSelectTile}
            currentPlayerPos={currentPlayer?.position}
            showPathOverlay={showPathOverlay}
            boardVisualMode={boardVisualMode}
            forkOptions={
              gameState.pendingDecision?.type === 'fork_choice'
                ? gameState.pendingDecision.options
                : null
            }
          />
        </Suspense>

        {/* Dado 3D Físico que rola sobre o tabuleiro */}
        <Dice3D
          value={gameState.lastDice}
          rollId={gameState.diceRollId}
          targetPosition={currentTilePos}
        />

        {/* Pinos 3D dos Jogadores caminhando casa a casa */}
        {gameState.players.map((player) => {
          const sameTile = playersByTile[player.position] || [player.id];
          const offsetIdx = sameTile.indexOf(player.id);
          return (
            <SteppingPlayerPawn3D
              key={player.id}
              player={player}
              totalAtTile={sameTile.length}
              offsetIndex={offsetIdx}
              isCurrentTurn={
                gameState.phase === 'board_turns' && currentPlayer?.id === player.id
              }
              diceRollId={gameState.diceRollId}
            />
          );
        })}

        <OrbitControls
          enablePan={true}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={5}
          maxDistance={28}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
