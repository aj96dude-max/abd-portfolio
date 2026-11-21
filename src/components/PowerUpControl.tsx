"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { EngineFrameSnapshot } from "@/engine/types";

interface PowerUpControlProps {
  onHoldStart: () => void;
  onHoldEnd: () => void;
  updaterRef: MutableRefObject<((snapshot: EngineFrameSnapshot) => void) | null>;
}

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function PowerUpControl({
  onHoldStart,
  onHoldEnd,
  updaterRef,
}: PowerUpControlProps) {
  const ringRef = useRef<SVGCircleElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const dotRef = useRef<HTMLSpanElement | null>(null);
  const holdingRef = useRef(false);

  useEffect(() => {
    updaterRef.current = (snapshot: EngineFrameSnapshot) => {
      const ring = ringRef.current;
      const label = labelRef.current;
      const dot = dotRef.current;

      if (ring) {
        const progress = Math.max(0, Math.min(1, snapshot.powerLevel));
        ring.style.strokeDashoffset = (CIRCUMFERENCE * (1 - progress)).toFixed(2);
      }

      if (label) {
        if (holdingRef.current && snapshot.powerLevel < 1) {
          label.textContent = `Charging ${Math.round(snapshot.powerLevel * 100)}%`;
        } else if (snapshot.powered) {
          label.textContent = "Powered · Hold to Idle";
        } else {
          label.textContent = "Hold to Power Up";
        }
      }

      if (dot) {
        dot.style.backgroundColor = snapshot.powered ? "#93c5fd" : "rgba(255,255,255,0.45)";
        dot.style.boxShadow = snapshot.powered
          ? "0 0 10px rgba(147, 197, 253, 0.9)"
          : "none";
      }
    };

    return () => {
      updaterRef.current = null;
    };
  }, [updaterRef]);

  const startHold = () => {
    if (holdingRef.current) return;
    holdingRef.current = true;
    onHoldStart();
  };

  const endHold = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    onHoldEnd();
  };

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        startHold();
      }}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onPointerCancel={endHold}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          startHold();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          endHold();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Hold to Power Up neural compute module"
      className="group touch-none select-none inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/70 px-3.5 py-1.5 backdrop-blur-md transition-colors hover:border-white/40 hover:bg-black/85 active:scale-[0.98] cursor-pointer"
    >
      <span className="relative flex h-9 w-9 items-center justify-center">
        <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1.75"
          />
          <circle
            ref={ringRef}
            cx="18"
            cy="18"
            r={RADIUS}
            fill="none"
            stroke="#f4f4f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE}
          />
        </svg>
        <span
          ref={dotRef}
          className="absolute h-2 w-2 rounded-full bg-white/45 transition-all"
        />
      </span>
      <span
        ref={labelRef}
        className="font-mono-tech text-[11px] font-medium uppercase tracking-[0.1em] text-white/85"
      >
        Hold to Power Up
      </span>
    </button>
  );
}

