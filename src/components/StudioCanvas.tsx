"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { StudioEngine } from "@/engine/StudioEngine";
import type { EngineFrameSnapshot } from "@/engine/types";

interface StudioCanvasProps {
  engineRef: MutableRefObject<StudioEngine | null>;
  ready: boolean;
  onReady: () => void;
  onFrameUpdate: (snapshot: EngineFrameSnapshot) => void;
}

export function StudioCanvas({
  engineRef,
  ready,
  onReady,
  onFrameUpdate,
}: StudioCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onReadyRef = useRef(onReady);
  const onFrameRef = useRef(onFrameUpdate);

  useEffect(() => {
    onReadyRef.current = onReady;
    onFrameRef.current = onFrameUpdate;
  }, [onReady, onFrameUpdate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    let cancelled = false;

    const engine = new StudioEngine({
      canvas,
      onReady: () => {
        if (!cancelled) onReadyRef.current();
      },
      onFrameUpdate: (snapshot) => {
        if (!cancelled) onFrameRef.current(snapshot);
      },
      onError: () => {
        // Ensure foreground portfolio remains completely accessible if WebGL is unavailable.
        if (!cancelled) onReadyRef.current();
      },
    });

    engineRef.current = engine;
    void engine.init();

    return () => {
      cancelled = true;
      engine.dispose();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, [engineRef]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 h-full w-full pointer-events-none"
        aria-hidden="true"
      />

      <div
        aria-hidden={ready}
        className={`fixed inset-0 z-40 flex items-center justify-center bg-[#050507] transition-opacity duration-700 pointer-events-none ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border border-white/20 border-t-white/90" />
          <span className="font-mono-tech text-[11px] uppercase tracking-[0.22em] text-white/55">
            Compiling Procedural Studio
          </span>
        </div>
      </div>
    </>
  );
}

