import React, { useState, useEffect, useRef } from 'react';
import { LOTTERY_WHEEL_SLICES } from '../logic/gameEngine.js';

function polarToCartesian(cx, cy, r, angleInDegreesFromTop) {
  const angleInRadians = ((angleInDegreesFromTop - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians)
  };
}

function describeSliceArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    cx,
    cy,
    'L',
    start.x,
    start.y,
    'A',
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
    'Z'
  ].join(' ');
}

export default function LotteryWheelWidget({
  stage = 'ready_to_spin', // 'ready_to_spin' | 'spinning' | 'result'
  targetRotationDeg = 0,
  spinId = null,
  size = 250,
  highlightSliceIndex = null
}) {
  const [rotation, setRotation] = useState(() =>
    stage === 'result' ? targetRotationDeg : 0
  );
  const [enableTransition, setEnableTransition] = useState(false);
  const lastSpinIdRef = useRef(null);

  useEffect(() => {
    if (stage === 'ready_to_spin' || stage === 'decide') {
      lastSpinIdRef.current = null;
      setEnableTransition(false);
      setRotation(0);
      return;
    }

    if (stage === 'spinning' && targetRotationDeg > 0) {
      if (lastSpinIdRef.current === spinId && rotation === targetRotationDeg) return;
      lastSpinIdRef.current = spinId;
      // Garante partida do 0° antes de disparar a transição CSS de 3.8s
      setEnableTransition(false);
      setRotation(0);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setEnableTransition(true);
          setRotation(targetRotationDeg);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }

    if (stage === 'result' && targetRotationDeg > 0) {
      setRotation(targetRotationDeg);
    }
  }, [stage, targetRotationDeg, spinId]);

  const cx = 150;
  const cy = 150;
  const radius = 134;
  const sliceAngle = 360 / LOTTERY_WHEEL_SLICES.length;

  return (
    <div
      className="relative mx-auto select-none flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* PONTEIRO DOURADO FIXO NO TOPO (12 HORAS) */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
        aria-hidden="true"
      >
        <svg width="34" height="38" viewBox="0 0 34 38">
          <polygon
            points="17,36 3,6 31,6"
            fill="#fbbf24"
            stroke="#78350f"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="17" cy="10" r="4" fill="#fef3c7" />
        </svg>
      </div>

      {/* RODA GIRATÓRIA DE 8 FATIAS */}
      <div
        className="w-full h-full rounded-full shadow-[0_0_35px_rgba(245,158,11,0.28)]"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: enableTransition
            ? 'transform 3.8s cubic-bezier(0.12, 0.85, 0.18, 1)'
            : 'none'
        }}
      >
        <svg viewBox="0 0 300 300" className="w-full h-full">
          {/* Aro externo metálico dourado */}
          <circle
            cx={cx}
            cy={cy}
            r="146"
            fill="#0f172a"
            stroke="#f59e0b"
            strokeWidth="6"
          />

          {/* Fatias da Roleta */}
          {LOTTERY_WHEEL_SLICES.map((slice, i) => {
            const startAngle = i * sliceAngle;
            const endAngle = (i + 1) * sliceAngle;
            const midAngle = startAngle + sliceAngle / 2;
            const textPos = polarToCartesian(cx, cy, radius * 0.67, midAngle);
            const isWinnerHighlight =
              stage === 'result' && highlightSliceIndex === i;

            return (
              <g key={slice.index}>
                <path
                  d={describeSliceArc(cx, cy, radius, startAngle, endAngle)}
                  fill={slice.color}
                  stroke={isWinnerHighlight ? '#fde047' : '#0f172a'}
                  strokeWidth={isWinnerHighlight ? '4' : '2.2'}
                />
                <text
                  x={textPos.x}
                  y={textPos.y}
                  fill={slice.textColor}
                  fontSize={slice.prize >= 700 ? '21' : '18'}
                  fontWeight="900"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${midAngle}, ${textPos.x}, ${textPos.y})`}
                >
                  {slice.label}
                </text>
              </g>
            );
          })}

          {/* Pinos decorativos entre as fatias */}
          {LOTTERY_WHEEL_SLICES.map((slice, i) => {
            const pinPos = polarToCartesian(cx, cy, 139, i * sliceAngle);
            return (
              <circle
                key={`pin-${slice.index}`}
                cx={pinPos.x}
                cy={pinPos.y}
                r="4"
                fill="#fef08a"
                stroke="#78350f"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Miolo central da Roleta */}
          <circle
            cx={cx}
            cy={cy}
            r="28"
            fill="#0f172a"
            stroke="#fbbf24"
            strokeWidth="5"
          />
          <text
            x={cx}
            y={cy + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="20"
          >
            🍀
          </text>
        </svg>
      </div>
    </div>
  );
}
