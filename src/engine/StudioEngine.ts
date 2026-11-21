import * as THREE from "three";
import { ProceduralAudio } from "./audio";
import {
  CAMERA_CUES,
  evaluateCueAtStops,
  solveDistanceForMm,
} from "./cues";
import { buildNeuralModuleAssembly, type NeuralModuleAssembly } from "./geometry/moduleAssembly";
import { createMaterialBank, type MaterialBank } from "./materials";
import { createPostProcessPipeline, type PostProcessPipeline } from "./postprocess";
import { buildStudioEnvironment, type StudioEnvironment } from "./studio";
import type {
  CameraCue,
  CueId,
  EngineFrameSnapshot,
  ProjectedAnchor,
  QualityTier,
} from "./types";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface StudioEngineOptions {
  canvas: HTMLCanvasElement;
  onReady?: () => void;
  onFrameUpdate?: (snapshot: EngineFrameSnapshot) => void;
  onError?: (err: unknown) => void;
}

export class StudioEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly onReady?: () => void;
  private readonly onFrameUpdate?: (snapshot: EngineFrameSnapshot) => void;
  private readonly onError?: (err: unknown) => void;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private studioEnv: StudioEnvironment | null = null;
  private materials: MaterialBank | null = null;
  private assembly: NeuralModuleAssembly | null = null;
  private pipeline: PostProcessPipeline | null = null;
  private readonly audio = new ProceduralAudio();

  private resizeObserver: ResizeObserver | null = null;
  private rafId: number | null = null;
  private idleHandle: number | null = null;
  private disposed = false;
  private initialized = false;
  private paused = false;

  // Viewport & DPR adaptive quality
  private width = 1280;
  private height = 720;
  private isMobile = false;
  private baseDpr = 1;
  private resolutionScale = 1.0;
  private qualityTier: QualityTier = 0;
  private fpsSamples: number[] = [];
  private currentFps = 60;
  private warmupElapsed = 0;

  // Unified simulation clock & cues
  private lastPerfMs = 0;
  private simTime = 0;
  private currentTimeScale = 1;
  private currentExplode = 0;
  private currentFitWidthMm = 56;
  private currentFitHeightMm = 52;
  private currentAzimuth = 0.58;
  private currentElevation = 0.44;
  private currentTargetOffset = new THREE.Vector3(-10.5, -1.0, 0);
  private activeCue: CueId = "hero";
  private scrollProgress = 0;
  private cueElements: { cue: CameraCue; el: HTMLElement }[] = [];

  // Pointer + Gyroscope environment rotation
  private targetPointerX = 0;
  private targetPointerY = 0;
  private smoothPointerX = 0;
  private smoothPointerY = 0;
  private gyroEnabled = false;
  private gyroBaselineBeta: number | null = null;
  private gyroBaselineGamma: number | null = null;

  // Hold-to-Power-Up & Blueprint states
  private holdingPower = false;
  private chargeProgress = 0;
  private powered = false;
  private smoothPowerLevel = 0;
  private blueprint = false;

  // Scratch vectors to avoid per-frame allocations
  private readonly tmpWorldPos = new THREE.Vector3();
  private readonly tmpCameraPos = new THREE.Vector3();
  private readonly tmpLookTarget = new THREE.Vector3();
  private readonly tmpProj = new THREE.Vector3();

  constructor(options: StudioEngineOptions) {
    this.canvas = options.canvas;
    this.onReady = options.onReady;
    this.onFrameUpdate = options.onFrameUpdate;
    this.onError = options.onError;
  }

  async init(): Promise<void> {
    if (typeof window === "undefined" || this.disposed) return;

    try {
      this.measureViewport();

      const renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setPixelRatio(this.getEffectiveDpr());
      renderer.setSize(this.width, this.height, false);
      this.renderer = renderer;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050507);
      this.scene = scene;

      const camera = new THREE.PerspectiveCamera(
        34,
        this.width / Math.max(1, this.height),
        0.5,
        800,
      );
      this.camera = camera;

      // Virtual dark photo studio -> PMREM environment (zero direct lights).
      const studioEnv = buildStudioEnvironment(renderer);
      this.studioEnv = studioEnv;
      scene.environment = studioEnv.envMap;

      // Procedural materials & 10-part AI Neural Compute Module in real mm.
      const materials = createMaterialBank();
      this.materials = materials;

      const assembly = buildNeuralModuleAssembly(materials);
      this.assembly = assembly;
      scene.add(assembly.root);

      // Post-processing: MSAA HDR -> high-threshold Bloom -> ACES Output -> Film Grain.
      const pipeline = createPostProcessPipeline(
        renderer,
        scene,
        camera,
        this.width,
        this.height,
        this.getEffectiveDpr(),
        this.isMobile,
      );
      this.pipeline = pipeline;

      this.refreshCueElements();
      this.applyCameraImmediate();

      // Compile shaders asynchronously behind loader before revealing canvas.
      await renderer.compileAsync(scene, camera);

      if (this.disposed) {
        this.dispose();
        return;
      }

      this.bindEvents();
      this.scheduleIdlePrewarm();
      this.initialized = true;
      this.lastPerfMs = performance.now();
      this.onReady?.();
      this.startLoop();
    } catch (err) {
      this.onError?.(err);
    }
  }

  refreshCueElements(): void {
    if (typeof document === "undefined") return;
    const found: { cue: CameraCue; el: HTMLElement }[] = [];
    for (const cue of CAMERA_CUES) {
      const el = document.querySelector<HTMLElement>(`[data-cue="${cue.id}"]`);
      if (el) {
        found.push({ cue, el });
      }
    }
    this.cueElements = found;
  }

  setHoldingPower(holding: boolean): void {
    if (holding) {
      this.audio.unlock();
      void this.requestGyroscopePermission();
    }
    if (!holding && this.chargeProgress < 1) {
      this.chargeProgress = 0;
    }
    this.holdingPower = holding;
  }

  toggleBlueprint(): boolean {
    this.blueprint = !this.blueprint;
    if (this.assembly && this.materials) {
      this.materials.setBlueprintMode(this.assembly.root, this.blueprint);
      this.audio.unlock();
      this.audio.playTick(this.blueprint ? 1480 : 960, 0.11);
    }
    return this.blueprint;
  }

  toggleMute(): boolean {
    const next = !this.audio.isMuted();
    this.audio.setMuted(next);
    return next;
  }

  private measureViewport(): void {
    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    this.isMobile =
      window.matchMedia("(max-width: 768px)").matches ||
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const maxDpr = this.isMobile ? 1.75 : 2.0;
    this.baseDpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  }

  private getEffectiveDpr(): number {
    return Math.max(0.75, this.baseDpr * this.resolutionScale);
  }

  private handleResize = (): void => {
    if (this.disposed || !this.renderer || !this.camera || !this.pipeline) return;
    this.measureViewport();
    this.camera.aspect = this.width / Math.max(1, this.height);
    this.camera.updateProjectionMatrix();
    const dpr = this.getEffectiveDpr();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.pipeline.setSize(this.width, this.height, dpr);
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.gyroEnabled) return;
    const nx = (e.clientX / Math.max(1, this.width)) * 2 - 1;
    const ny = (e.clientY / Math.max(1, this.height)) * 2 - 1;
    this.targetPointerX = Math.max(-1, Math.min(1, nx));
    this.targetPointerY = Math.max(-1, Math.min(1, ny));
  };

  private handleDeviceOrientation = (e: DeviceOrientationEvent): void => {
    if (e.beta == null || e.gamma == null) return;
    this.gyroEnabled = true;
    if (this.gyroBaselineBeta === null) this.gyroBaselineBeta = e.beta;
    if (this.gyroBaselineGamma === null) this.gyroBaselineGamma = e.gamma;

    const dGamma = (e.gamma - this.gyroBaselineGamma) / 30;
    const dBeta = (e.beta - this.gyroBaselineBeta) / 30;
    this.targetPointerX = Math.max(-1, Math.min(1, dGamma));
    this.targetPointerY = Math.max(-1, Math.min(1, dBeta));
  };

  private handleVisibilityChange = (): void => {
    this.paused = document.hidden;
    if (!this.paused) {
      this.lastPerfMs = performance.now();
    }
  };

  private async requestGyroscopePermission(): Promise<void> {
    if (typeof window === "undefined" || this.gyroEnabled) return;
    const DevOrient = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & {
          requestPermission?: () => Promise<"granted" | "denied">;
        })
      | undefined;

    if (!DevOrient) return;
    try {
      if (typeof DevOrient.requestPermission === "function") {
        const res = await DevOrient.requestPermission();
        if (res === "granted") {
          window.addEventListener("deviceorientation", this.handleDeviceOrientation);
        }
      } else if ("ondeviceorientation" in window) {
        window.addEventListener("deviceorientation", this.handleDeviceOrientation);
      }
    } catch {
      // Ignore permission decline silently; pointer tilt remains active.
    }
  }

  private bindEvents(): void {
    window.addEventListener("pointermove", this.handlePointerMove, {
      passive: true,
    });
    window.addEventListener("resize", this.handleResize, { passive: true });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(document.documentElement);
    }
  }

  private scheduleIdlePrewarm(): void {
    const prewarm = () => {
      if (this.disposed || !this.assembly || !this.materials) return;
      // Pre-build wireframe edge overlays during idle so Blueprint toggle never hitches.
      this.materials.setBlueprintMode(this.assembly.root, false);
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === "function") {
      this.idleHandle = w.requestIdleCallback(prewarm, { timeout: 1500 });
    } else {
      this.idleHandle = window.setTimeout(prewarm, 400);
    }
  }

  private applyCameraImmediate(): void {
    if (!this.camera) return;
    const dist = solveDistanceForMm(
      this.camera,
      this.currentFitWidthMm,
      this.currentFitHeightMm,
    );
    const cosEl = Math.cos(this.currentElevation);
    this.tmpCameraPos.set(
      Math.sin(this.currentAzimuth) * cosEl * dist,
      Math.sin(this.currentElevation) * dist,
      Math.cos(this.currentAzimuth) * cosEl * dist,
    );
    this.tmpLookTarget.copy(this.currentTargetOffset);
    this.camera.position.copy(this.tmpLookTarget).add(this.tmpCameraPos);
    this.camera.lookAt(this.tmpLookTarget);
  }

  private startLoop(): void {
    const tick = (nowMs: number) => {
      if (this.disposed) return;
      this.rafId = requestAnimationFrame(tick);
      if (this.paused) return;

      const rawDt = Math.min(0.05, Math.max(0.001, (nowMs - this.lastPerfMs) / 1000));
      this.lastPerfMs = nowMs;
      this.warmupElapsed += rawDt;

      this.updateAdaptiveQuality(rawDt);
      this.stepSimulation(rawDt);
      this.pipeline?.render(nowMs * 0.001);
      this.emitFrameSnapshot();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private updateAdaptiveQuality(rawDt: number): void {
    if (this.warmupElapsed < 2.0) return;
    const instFps = 1 / Math.max(0.001, rawDt);
    this.fpsSamples.push(instFps);
    if (this.fpsSamples.length > 60) {
      this.fpsSamples.shift();
    }
    if (this.fpsSamples.length < 45) return;

    const avg =
      this.fpsSamples.reduce((sum, v) => sum + v, 0) / this.fpsSamples.length;
    this.currentFps = Math.round(avg);

    if (avg < 40 && this.qualityTier === 0) {
      this.qualityTier = 1;
      this.resolutionScale = 0.76;
      this.handleResize();
      this.fpsSamples = [];
    } else if (avg < 40 && this.qualityTier === 1) {
      this.qualityTier = 2;
      this.resolutionScale = 0.68;
      this.pipeline?.setBloomEnabled(false);
      this.handleResize();
      this.fpsSamples = [];
    }
  }

  private stepSimulation(rawDt: number): void {
    if (!this.scene || !this.camera || !this.assembly) return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - this.height,
    );
    this.scrollProgress = clamp01(scrollY / maxScroll);

    const cueStops = this.cueElements.map(({ cue, el }) => {
      const rect = el.getBoundingClientRect();
      return {
        cue,
        centerY:
          scrollY +
          rect.top +
          Math.min(rect.height * 0.42, this.height * 0.48),
      };
    });

    const viewportCenterY = scrollY + this.height * 0.45;
    const targetCue = evaluateCueAtStops(
      cueStops,
      viewportCenterY,
      this.width < 880,
    );
    this.activeCue = targetCue.activeCue;

    // Exponential damping toward target camera cue & explode state.
    const damp = 1 - Math.exp(-rawDt * 6.5);
    this.currentFitWidthMm = THREE.MathUtils.lerp(
      this.currentFitWidthMm,
      targetCue.fitWidthMm,
      damp,
    );
    this.currentFitHeightMm = THREE.MathUtils.lerp(
      this.currentFitHeightMm,
      targetCue.fitHeightMm,
      damp,
    );
    this.currentAzimuth = THREE.MathUtils.lerp(
      this.currentAzimuth,
      targetCue.azimuth,
      damp,
    );
    this.currentElevation = THREE.MathUtils.lerp(
      this.currentElevation,
      targetCue.elevation,
      damp,
    );
    this.currentTargetOffset.lerp(targetCue.targetOffset, damp);
    this.currentExplode = THREE.MathUtils.lerp(
      this.currentExplode,
      targetCue.explode,
      damp,
    );
    this.currentTimeScale = THREE.MathUtils.lerp(
      this.currentTimeScale,
      targetCue.timeScale,
      damp,
    );

    // Hold-to-Power-Up interaction state machine.
    if (this.holdingPower) {
      this.chargeProgress = Math.min(1, this.chargeProgress + rawDt / 1.05);
      if (this.chargeProgress >= 1) {
        this.powered = !this.powered;
        this.holdingPower = false;
        this.chargeProgress = 0;
        this.audio.playPowerLock(this.powered);
      }
    } else if (this.chargeProgress > 0) {
      this.chargeProgress = Math.max(0, this.chargeProgress - rawDt * 2.4);
    }

    const desiredPower = Math.max(
      this.powered ? 1 : 0,
      this.chargeProgress * 0.95,
    );
    this.smoothPowerLevel = THREE.MathUtils.lerp(
      this.smoothPowerLevel,
      desiredPower,
      1 - Math.exp(-rawDt * 8.0),
    );
    this.audio.updateChargeHum(this.chargeProgress, this.powered);

    // Unified simulation clock.
    const speedMultiplier = 1 + this.smoothPowerLevel * 1.6;
    this.simTime += rawDt * this.currentTimeScale * speedMultiplier;
    this.assembly.updateClockPose(this.simTime, this.smoothPowerLevel);

    // Staggered Exploded View: top parts (higher order) lift first and return last.
    const e = this.currentExplode;
    for (const p of this.assembly.parts) {
      const delay = (1 - p.order) * 0.42;
      const t = easeInOutCubic(clamp01((e - delay) / 0.58));
      p.obj.position.copy(p.base).addScaledVector(p.lift, t);

      const tickBucket = t > 0.55 ? 2 : t > 0.12 ? 1 : 0;
      if (p.lastTickState !== undefined && tickBucket !== p.lastTickState) {
        if (tickBucket === 1 || tickBucket === 0) {
          this.audio.playTick(700 + p.order * 950, 0.06);
        }
      }
      p.lastTickState = tickBucket;
    }

    // Smooth cursor / gyroscope PMREM studio environment rotation.
    const envDamp = 1 - Math.exp(-rawDt * 5.0);
    this.smoothPointerX = THREE.MathUtils.lerp(
      this.smoothPointerX,
      this.targetPointerX,
      envDamp,
    );
    this.smoothPointerY = THREE.MathUtils.lerp(
      this.smoothPointerY,
      this.targetPointerY,
      envDamp,
    );
    this.scene.environmentRotation.set(
      this.smoothPointerY * 0.45,
      -this.smoothPointerX * 0.8,
      0,
    );

    // Frame camera by physical millimetres.
    const dist = solveDistanceForMm(
      this.camera,
      this.currentFitWidthMm,
      this.currentFitHeightMm,
    );
    const pointerAz = -this.smoothPointerX * 0.14;
    const pointerEl = this.smoothPointerY * 0.08;
    const az = this.currentAzimuth + pointerAz;
    const el = THREE.MathUtils.clamp(this.currentElevation + pointerEl, 0.08, 1.15);
    const cosEl = Math.cos(el);

    this.tmpCameraPos.set(
      Math.sin(az) * cosEl * dist,
      Math.sin(el) * dist,
      Math.cos(az) * cosEl * dist,
    );
    this.tmpLookTarget.copy(this.currentTargetOffset);
    this.camera.position.copy(this.tmpLookTarget).add(this.tmpCameraPos);
    this.camera.lookAt(this.tmpLookTarget);
  }

  private emitFrameSnapshot(): void {
    if (!this.onFrameUpdate || !this.camera || !this.assembly) return;

    this.assembly.root.updateMatrixWorld(true);
    this.camera.updateMatrixWorld();

    const anchors: ProjectedAnchor[] = [];
    for (const part of this.assembly.parts) {
      if (!part.anchorLocal) continue;
      this.tmpWorldPos.copy(part.anchorLocal);
      part.obj.localToWorld(this.tmpWorldPos);
      this.tmpProj.copy(this.tmpWorldPos).project(this.camera);

      const visible =
        this.tmpProj.z > -1 &&
        this.tmpProj.z < 1 &&
        Math.abs(this.tmpProj.x) <= 1.15 &&
        Math.abs(this.tmpProj.y) <= 1.15;

      anchors.push({
        id: part.id,
        x: (this.tmpProj.x * 0.5 + 0.5) * this.width,
        y: (-this.tmpProj.y * 0.5 + 0.5) * this.height,
        visible,
      });
    }

    this.onFrameUpdate({
      activeCue: this.activeCue,
      scrollProgress: this.scrollProgress,
      explode: this.currentExplode,
      timeScale: this.currentTimeScale,
      fitMm: Math.round(Math.max(this.currentFitWidthMm, this.currentFitHeightMm)),
      powerLevel: this.holdingPower ? this.chargeProgress : this.powered ? 1 : 0,
      powered: this.powered,
      blueprint: this.blueprint,
      audioUnlocked: this.audio.isUnlocked(),
      muted: this.audio.isMuted(),
      qualityTier: this.qualityTier,
      fps: this.currentFps,
      anchors,
    });
  }

  dispose(): void {
    this.disposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.idleHandle !== null) {
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(this.idleHandle);
      } else {
        clearTimeout(this.idleHandle);
      }
      this.idleHandle = null;
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("pointermove", this.handlePointerMove);
      window.removeEventListener("resize", this.handleResize);
      window.removeEventListener("deviceorientation", this.handleDeviceOrientation);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.audio.dispose();
    this.pipeline?.dispose();
    this.assembly?.dispose();
    this.materials?.dispose();
    this.studioEnv?.dispose();
    if (this.initialized && this.renderer) {
      this.renderer.dispose();
    } else {
      this.renderer?.dispose();
    }

    this.pipeline = null;
    this.assembly = null;
    this.materials = null;
    this.studioEnv = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }
}
