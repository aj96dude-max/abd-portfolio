import type * as THREE from "three";

export type CueId = "hero" | "close" | "apart" | "around" | "rebuild";

export interface CameraCue {
  id: CueId;
  label: string;
  fitWidthMm: number;
  fitHeightMm: number;
  azimuth: number;
  elevation: number;
  targetOffset: [number, number, number];
  explode: number;
  timeScale: number;
}

export interface ModulePart {
  id: string;
  obj: THREE.Object3D;
  base: THREE.Vector3;
  lift: THREE.Vector3;
  order: number;
  anchorLocal?: THREE.Vector3;
  lastTickState?: number;
}

export interface ProjectedAnchor {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

export type QualityTier = 0 | 1 | 2;

export interface EngineFrameSnapshot {
  activeCue: CueId;
  scrollProgress: number;
  explode: number;
  timeScale: number;
  fitMm: number;
  powerLevel: number;
  powered: boolean;
  blueprint: boolean;
  audioUnlocked: boolean;
  muted: boolean;
  qualityTier: QualityTier;
  fps: number;
  anchors: ProjectedAnchor[];
}

