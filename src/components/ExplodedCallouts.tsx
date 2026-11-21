"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { EXPLODED_CALLOUTS } from "@/data/portfolio";
import type { EngineFrameSnapshot } from "@/engine/types";

interface ExplodedCalloutsProps {
  updaterRef: MutableRefObject<((snapshot: EngineFrameSnapshot) => void) | null>;
}

export function ExplodedCallouts({ updaterRef }: ExplodedCalloutsProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);

  const leftCallouts = EXPLODED_CALLOUTS.filter((c) => c.side === "left");
  const rightCallouts = EXPLODED_CALLOUTS.filter((c) => c.side === "right");

  useEffect(() => {
    updaterRef.current = (snapshot: EngineFrameSnapshot) => {
      const overlay = overlayRef.current;
      if (!overlay) return;

      const raw = (snapshot.explode - 0.35) / 0.48;
      const opacity = Math.max(0, Math.min(1, raw));
      overlay.style.opacity = opacity.toFixed(3);

      if (opacity < 0.02 || window.innerWidth < 768) {
        return;
      }

      const anchorMap = new Map(snapshot.anchors.map((a) => [a.id, a]));

      EXPLODED_CALLOUTS.forEach((spec, idx) => {
        const card = cardRefs.current[idx];
        const path = pathRefs.current[idx];
        const dot = dotRefs.current[idx];
        const anchor = anchorMap.get(spec.partId);

        if (!card || !path || !dot || !anchor || !anchor.visible) {
          if (path) path.setAttribute("opacity", "0");
          if (dot) dot.setAttribute("opacity", "0");
          return;
        }

        const rect = card.getBoundingClientRect();
        const startX = spec.side === "left" ? rect.right + 6 : rect.left - 6;
        const startY = rect.top + rect.height * 0.5;
        const elbowX =
          spec.side === "left"
            ? startX + Math.max(18, (anchor.x - startX) * 0.42)
            : startX - Math.max(18, (startX - anchor.x) * 0.42);

        path.setAttribute(
          "d",
          `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${elbowX.toFixed(1)} ${startY.toFixed(1)} L ${anchor.x.toFixed(1)} ${anchor.y.toFixed(1)}`,
        );
        path.setAttribute("opacity", "0.75");
        dot.setAttribute("cx", anchor.x.toFixed(1));
        dot.setAttribute("cy", anchor.y.toFixed(1));
        dot.setAttribute("opacity", "1");
      });
    };

    return () => {
      updaterRef.current = null;
    };
  }, [updaterRef]);

  return (
    <div
      ref={overlayRef}
      style={{ opacity: 0 }}
      className="pointer-events-none relative h-full w-full transition-opacity duration-150"
      aria-hidden="true"
    >
      {/* Desktop SVG leader lines connecting cards to projected 3D part anchors */}
      <svg className="fixed inset-0 hidden h-full w-full md:block">
        {EXPLODED_CALLOUTS.map((spec, idx) => (
          <g key={spec.partId}>
            <path
              ref={(el) => {
                pathRefs.current[idx] = el;
              }}
              fill="none"
              stroke="rgba(218, 232, 255, 0.52)"
              strokeWidth="1"
              opacity="0"
            />
            <circle
              ref={(el) => {
                dotRefs.current[idx] = el;
              }}
              r="2.6"
              fill="#f4f4f6"
              stroke="#050507"
              strokeWidth="1"
              opacity="0"
            />
          </g>
        ))}
      </svg>

      {/* Top Beat Header inside sticky inspection stage */}
      <div className="mx-auto flex h-full max-w-6xl flex-col justify-between px-5 pt-24 pb-24 md:px-8">
        <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
          <div>
            <span className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-white/45">
              02 / Exploded Architecture
            </span>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-white/95 md:text-xl">
              internal neural stack ↔ engineering pillars
            </h2>
          </div>
          <span className="hidden font-mono-tech text-[11px] text-white/45 md:inline">
            10 MACHINED LAYERS · 46 × 46 × 14.8 MM
          </span>
        </div>

        {/* Desktop two-column left/right callout rails */}
        <div className="hidden items-center justify-between md:flex">
          <div className="flex w-64 flex-col gap-6 lg:w-72">
            {leftCallouts.map((spec) => {
              const globalIdx = EXPLODED_CALLOUTS.findIndex(
                (item) => item.partId === spec.partId,
              );
              return (
                <div
                  key={spec.partId}
                  ref={(el) => {
                    cardRefs.current[globalIdx] = el;
                  }}
                  className="rounded-lg border border-white/12 bg-black/60 px-4 py-3 backdrop-blur-md"
                >
                  <div className="font-mono-tech text-[10px] tracking-[0.14em] text-sky-200/75">
                    {spec.code}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white/95">
                    {spec.title}
                  </div>
                  <div className="mt-0.5 text-xs leading-relaxed text-white/60">
                    {spec.detail}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex w-64 flex-col gap-6 text-right lg:w-72">
            {rightCallouts.map((spec) => {
              const globalIdx = EXPLODED_CALLOUTS.findIndex(
                (item) => item.partId === spec.partId,
              );
              return (
                <div
                  key={spec.partId}
                  ref={(el) => {
                    cardRefs.current[globalIdx] = el;
                  }}
                  className="rounded-lg border border-white/12 bg-black/60 px-4 py-3 backdrop-blur-md"
                >
                  <div className="font-mono-tech text-[10px] tracking-[0.14em] text-amber-200/75">
                    {spec.code}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white/95">
                    {spec.title}
                  </div>
                  <div className="mt-0.5 text-xs leading-relaxed text-white/60">
                    {spec.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile compact two-column spec grid */}
        <div className="grid grid-cols-2 gap-2 md:hidden">
          {EXPLODED_CALLOUTS.map((spec) => (
            <div
              key={spec.partId}
              className="rounded-md border border-white/10 bg-black/70 px-2.5 py-2 backdrop-blur-md"
            >
              <div className="font-mono-tech text-[9px] tracking-[0.1em] text-white/50">
                {spec.code}
              </div>
              <div className="mt-0.5 text-xs font-medium text-white/90">
                {spec.title}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

