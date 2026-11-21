import * as THREE from "three";
import type { CameraCue, CueId } from "./types";

export const CAMERA_CUES: CameraCue[] = [
  {
    id: "hero",
    label: "00 · MODULE OVERVIEW",
    fitWidthMm: 56,
    fitHeightMm: 52,
    azimuth: 0.58,
    elevation: 0.44,
    targetOffset: [-10.5, -1.0, 0],
    explode: 0.0,
    timeScale: 1.0,
  },
  {
    id: "close",
    label: "01 · SAPPHIRE MACRO",
    fitWidthMm: 24,
    fitHeightMm: 22,
    azimuth: -0.38,
    elevation: 0.62,
    targetOffset: [-8.5, 5.2, 0],
    explode: 0.0,
    timeScale: 1 / 12,
  },
  {
    id: "apart",
    label: "02 · EXPLODED ARCHITECTURE",
    fitWidthMm: 74,
    fitHeightMm: 86,
    azimuth: 0.36,
    elevation: 0.25,
    targetOffset: [0, 7.5, 0],
    explode: 1.0,
    timeScale: 0.65,
  },
  {
    id: "around",
    label: "03 · THERMAL & CHASSIS SWEEP",
    fitWidthMm: 62,
    fitHeightMm: 54,
    azimuth: -1.32,
    elevation: 0.34,
    targetOffset: [8.0, 1.5, 0],
    explode: 0.32,
    timeScale: 0.85,
  },
  {
    id: "rebuild",
    label: "04 · REASSEMBLED UNIT",
    fitWidthMm: 58,
    fitHeightMm: 52,
    azimuth: 0.48,
    elevation: 0.38,
    targetOffset: [-9.0, 0.5, 0],
    explode: 0.0,
    timeScale: 1.0,
  },
];

export interface InterpolatedCueState {
  activeCue: CueId;
  fitWidthMm: number;
  fitHeightMm: number;
  azimuth: number;
  elevation: number;
  targetOffset: THREE.Vector3;
  explode: number;
  timeScale: number;
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Evaluates cue interpolation along normalized page scroll [0..1] or measured
 * anchor cue positions.
 */
export function evaluateCueAtStops(
  cueStops: { cue: CameraCue; centerY: number }[],
  viewportCenterY: number,
  isNarrowViewport: boolean,
): InterpolatedCueState {
  if (cueStops.length === 0) {
    const fallback = CAMERA_CUES[0];
    return {
      activeCue: fallback.id,
      fitWidthMm: fallback.fitWidthMm,
      fitHeightMm: fallback.fitHeightMm,
      azimuth: fallback.azimuth,
      elevation: fallback.elevation,
      targetOffset: new THREE.Vector3(...fallback.targetOffset),
      explode: fallback.explode,
      timeScale: fallback.timeScale,
    };
  }

  let idxA = 0;
  let idxB = 0;
  let alpha = 0;

  if (viewportCenterY <= cueStops[0].centerY) {
    idxA = 0;
    idxB = 0;
    alpha = 0;
  } else if (viewportCenterY >= cueStops[cueStops.length - 1].centerY) {
    idxA = cueStops.length - 1;
    idxB = cueStops.length - 1;
    alpha = 0;
  } else {
    for (let i = 0; i < cueStops.length - 1; i++) {
      const curr = cueStops[i];
      const next = cueStops[i + 1];
      if (viewportCenterY >= curr.centerY && viewportCenterY <= next.centerY) {
        idxA = i;
        idxB = i + 1;
        const span = Math.max(1, next.centerY - curr.centerY);
        alpha = smoothstep((viewportCenterY - curr.centerY) / span);
        break;
      }
    }
  }

  const a = cueStops[idxA].cue;
  const b = cueStops[idxB].cue;
  const activeCue = alpha < 0.5 ? a.id : b.id;

  const offsetScaleX = isNarrowViewport ? 0.0 : 1.0;
  const targetOffset = new THREE.Vector3(
    THREE.MathUtils.lerp(a.targetOffset[0], b.targetOffset[0], alpha) *
      offsetScaleX,
    THREE.MathUtils.lerp(a.targetOffset[1], b.targetOffset[1], alpha),
    THREE.MathUtils.lerp(a.targetOffset[2], b.targetOffset[2], alpha),
  );

  return {
    activeCue,
    fitWidthMm: THREE.MathUtils.lerp(a.fitWidthMm, b.fitWidthMm, alpha),
    fitHeightMm: THREE.MathUtils.lerp(a.fitHeightMm, b.fitHeightMm, alpha),
    azimuth: THREE.MathUtils.lerp(a.azimuth, b.azimuth, alpha),
    elevation: THREE.MathUtils.lerp(a.elevation, b.elevation, alpha),
    targetOffset,
    explode: THREE.MathUtils.lerp(a.explode, b.explode, alpha),
    timeScale: THREE.MathUtils.lerp(a.timeScale, b.timeScale, alpha),
  };
}

/**
 * Solves exact camera distance in millimetres so the physical mm bounding box
 * fits cleanly inside any phone or ultrawide monitor viewport.
 */
export function solveDistanceForMm(
  camera: THREE.PerspectiveCamera,
  fitWidthMm: number,
  fitHeightMm: number,
): number {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const tanV = Math.tan(vFov * 0.5);
  const tanH = tanV * Math.max(0.35, camera.aspect);
  const distV = (fitHeightMm * 0.5) / tanV;
  const distH = (fitWidthMm * 0.5) / tanH;
  return Math.max(distV, distH);
}

