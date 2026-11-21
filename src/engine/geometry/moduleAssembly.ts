import * as THREE from "three";
import {
  extrudeSDFPart,
  sdCapsule,
  sdChamferBox,
  sdCircle,
  sdRoundedBox,
  sdSmoothSubtract,
  smin,
} from "./sdf2d";
import { createCCWLathe } from "./lathe";
import type { MaterialBank } from "../materials";
import type { ModulePart } from "../types";

export interface NeuralModuleAssembly {
  root: THREE.Group;
  parts: ModulePart[];
  updateClockPose: (simTime: number, powerLevel: number) => void;
  dispose: () => void;
}

export function buildNeuralModuleAssembly(
  materials: MaterialBank,
): NeuralModuleAssembly {
  const root = new THREE.Group();
  root.name = "ai_neural_compute_module";

  const createdGeometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    createdGeometries.push(geo);
    return geo;
  };

  const parts: ModulePart[] = [];
  const registerPart = (
    id: string,
    obj: THREE.Object3D,
    baseY: number,
    liftY: number,
    order: number,
    anchorLocal?: [number, number, number],
  ) => {
    const base = new THREE.Vector3(0, baseY, 0);
    const lift = new THREE.Vector3(0, liftY, 0);
    obj.position.copy(base);
    root.add(obj);
    parts.push({
      id,
      obj,
      base,
      lift,
      order,
      anchorLocal: anchorLocal
        ? new THREE.Vector3(...anchorLocal)
        : undefined,
      lastTickState: 0,
    });
  };

  // 1. Anodized Gunmetal Lower Chassis (46.0 x 46.0 x 3.2 mm)
  const baseGeo = trackGeo(
    extrudeSDFPart(
      (x, y) => {
        const plate = sdRoundedBox(x, y, 23.0, 23.0, 5.0);
        const slotL = sdCapsule(x, y, -23.6, -7.5, -23.6, 7.5, 0.85);
        const slotR = sdCapsule(x, y, 23.6, -7.5, 23.6, 7.5, 0.85);
        const slotT = sdCapsule(x, y, -7.5, 23.6, 7.5, 23.6, 0.85);
        const slotB = sdCapsule(x, y, -7.5, -23.6, 7.5, -23.6, 0.85);
        const notches = Math.min(Math.min(slotL, slotR), Math.min(slotT, slotB));
        return sdSmoothSubtract(plate, notches, 0.65);
      },
      { halfExtentX: 23.5, halfExtentY: 23.5, depth: 3.2, step: 0.28 },
    ),
  );
  const baseMesh = new THREE.Mesh(baseGeo, materials.gunmetalPair);
  baseMesh.name = "baseChassis";
  registerPart("baseChassis", baseMesh, -5.8, -14.0, 0.1, [22.0, 0.2, 0]);

  // 2. Contact I/O Backplane & 4 Turned Standoffs (40.0 x 40.0 x 0.8 mm)
  const backplaneGroup = new THREE.Group();
  backplaneGroup.name = "ioBackplane";
  const backplaneGeo = trackGeo(
    extrudeSDFPart(
      (x, y) => {
        const core = sdChamferBox(x, y, 20.0, 20.0, 4.0);
        const hole = sdCircle(x, y, 3.6);
        return sdSmoothSubtract(core, hole, 0.5);
      },
      { halfExtentX: 20.5, halfExtentY: 20.5, depth: 0.8, step: 0.28 },
    ),
  );
  const backplaneMesh = new THREE.Mesh(backplaneGeo, materials.backplanePair);
  backplaneGroup.add(backplaneMesh);

  const standoffGeo = trackGeo(
    createCCWLathe(
      [
        [0.001, 0.3],
        [1.3, 0.3],
        [1.3, 5.1],
        [0.95, 5.1],
        [0.95, 5.6],
        [0.001, 5.6],
      ],
      40,
    ),
  );
  const corners: [number, number][] = [
    [-18.5, -18.5],
    [18.5, -18.5],
    [18.5, 18.5],
    [-18.5, 18.5],
  ];
  corners.forEach(([cx, cz], idx) => {
    const standoff = new THREE.Mesh(standoffGeo, materials.standoffBrass);
    standoff.name = `standoff_${idx}`;
    standoff.position.set(cx, 0, cz);
    backplaneGroup.add(standoff);
  });
  registerPart("ioBackplane", backplaneGroup, -3.8, -9.0, 0.2);

  // 3. CNC Heat-Sink Fin Stack (44.6 x 44.6 x 4.6 mm, 7 fins + central bore)
  const heatsinkGeo = trackGeo(
    extrudeSDFPart(
      (x, y) => {
        const plate = sdRoundedBox(x, y, 22.3, 22.3, 4.2);
        const c1 = sdCapsule(x, y, -25, -14.4, 25, -14.4, 1.05);
        const c2 = sdCapsule(x, y, -25, -8.8, 25, -8.8, 1.05);
        const c3 = sdCapsule(x, y, -25, -3.2, 25, -3.2, 1.05);
        const c4 = sdCapsule(x, y, -25, 3.2, 25, 3.2, 1.05);
        const c5 = sdCapsule(x, y, -25, 8.8, 25, 8.8, 1.05);
        const c6 = sdCapsule(x, y, -25, 14.4, 25, 14.4, 1.05);
        const channels = Math.min(
          Math.min(c1, c2),
          Math.min(Math.min(c3, c4), Math.min(c5, c6)),
        );

        // Preserve central core hub and corner standoff bosses cleanly.
        const hub = sdCircle(x, y, 11.8);
        const ax = Math.abs(x) - 18.5;
        const ay = Math.abs(y) - 18.5;
        const cornerBoss = Math.hypot(ax, ay) - 3.1;
        const keepMass = smin(hub, cornerBoss, 0.8);

        const effectiveCuts = sdSmoothSubtract(channels, keepMass, 0.55);
        const finned = sdSmoothSubtract(plate, effectiveCuts, 0.45);
        return sdSmoothSubtract(finned, sdCircle(x, y, 9.6), 0.5);
      },
      { halfExtentX: 23.0, halfExtentY: 23.0, depth: 4.6, step: 0.25 },
    ),
  );
  const heatsinkMesh = new THREE.Mesh(heatsinkGeo, materials.heatsinkPair);
  heatsinkMesh.name = "heatsinkFins";
  registerPart("heatsinkFins", heatsinkMesh, -1.1, -4.0, 0.32, [-21.5, 0.4, 0]);

  // 4. Lower Internal Copper Power & Thermal Bus (34.0 x 34.0 x 1.0 mm)
  const copperBusGeo = trackGeo(
    extrudeSDFPart(
      (x, y) => {
        const oct = sdChamferBox(x, y, 17.0, 17.0, 4.5);
        const s1 = sdCapsule(x, y, -10.5, -10.5, -6.0, -6.0, 1.15);
        const s2 = sdCapsule(x, y, 10.5, -10.5, 6.0, -6.0, 1.15);
        const s3 = sdCapsule(x, y, 10.5, 10.5, 6.0, 6.0, 1.15);
        const s4 = sdCapsule(x, y, -10.5, 10.5, -6.0, 6.0, 1.15);
        const slots = Math.min(Math.min(s1, s2), Math.min(s3, s4));
        const innerCut = Math.min(slots, sdCircle(x, y, 5.2));
        return sdSmoothSubtract(oct, innerCut, 0.6);
      },
      { halfExtentX: 17.5, halfExtentY: 17.5, depth: 1.0, step: 0.24 },
    ),
  );
  const copperBusMesh = new THREE.Mesh(copperBusGeo, materials.copperLinearPair);
  copperBusMesh.name = "copperBusPlate";
  registerPart("copperBusPlate", copperBusMesh, 1.7, 1.5, 0.45, [16.2, 0.2, 0]);

  // 5. Primary Silicon Compute Interposer Wafer (30.0 x 30.0 x 0.9 mm)
  const siliconGeo = trackGeo(
    extrudeSDFPart(
      (x, y) => {
        const wafer = sdChamferBox(x, y, 15.0, 15.0, 3.4);
        const keyNotch = sdCircle(x - 15.2, y, 1.6);
        const centerCut = sdCircle(x, y, 4.0);
        return sdSmoothSubtract(wafer, Math.min(keyNotch, centerCut), 0.45);
      },
      { halfExtentX: 15.6, halfExtentY: 15.6, depth: 0.9, step: 0.24 },
    ),
  );
  const siliconMesh = new THREE.Mesh(siliconGeo, materials.siliconPair);
  siliconMesh.name = "siliconInterposer";
  siliconMesh.userData.blueprintAccent = true;
  registerPart("siliconInterposer", siliconMesh, 2.65, 7.0, 0.56);

  // 6. Stacked Neural Tensor Die & Clock-Driven Phase Rotor (16.0 x 16.0 x 1.1 mm)
  const neuralGroup = new THREE.Group();
  neuralGroup.name = "neuralDieCore";

  const dieGeo = trackGeo(
    extrudeSDFPart(
      (x, y) => {
        const hArm = sdRoundedBox(x, y, 8.0, 4.6, 1.6);
        const vArm = sdRoundedBox(x, y, 4.6, 8.0, 1.6);
        return smin(hArm, vArm, 1.1);
      },
      { halfExtentX: 8.6, halfExtentY: 8.6, depth: 1.1, step: 0.2 },
    ),
  );
  const dieMesh = new THREE.Mesh(dieGeo, materials.siliconPair);
  dieMesh.name = "neuralTensorDie";
  dieMesh.userData.blueprintAccent = true;
  neuralGroup.add(dieMesh);

  const phaseRingGeo = trackGeo(
    createCCWLathe(
      [
        [8.4, -0.45],
        [9.6, -0.45],
        [9.6, 0.45],
        [8.4, 0.45],
        [8.4, -0.45],
      ],
      72,
    ),
  );
  const phaseRingMesh = new THREE.Mesh(phaseRingGeo, materials.phaseRing);
  phaseRingMesh.name = "phaseRotorRing";
  neuralGroup.add(phaseRingMesh);

  // 8 radial clock-driven emissive tensor traces + central reticle.
  const traceRotor = new THREE.Group();
  traceRotor.name = "tensorTraceRotor";
  const barGeo = trackGeo(new THREE.BoxGeometry(2.6, 0.24, 0.42));
  const traceMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const bar = new THREE.Mesh(barGeo, materials.emissiveTrace);
    bar.name = `tensorTrace_${i}`;
    bar.userData.blueprintAccent = true;
    bar.position.set(Math.cos(angle) * 5.8, 0.58, Math.sin(angle) * 5.8);
    bar.rotation.y = -angle;
    traceRotor.add(bar);
    traceMeshes.push(bar);
  }
  const coreRingGeo = trackGeo(
    createCCWLathe(
      [
        [1.9, -0.15],
        [2.55, -0.15],
        [2.55, 0.15],
        [1.9, 0.15],
        [1.9, -0.15],
      ],
      48,
    ),
  );
  const coreRing = new THREE.Mesh(coreRingGeo, materials.emissiveTrace);
  coreRing.name = "neuralCoreBeacon";
  coreRing.userData.blueprintAccent = true;
  coreRing.position.y = 0.62;
  traceRotor.add(coreRing);
  neuralGroup.add(traceRotor);

  registerPart("neuralDieCore", neuralGroup, 3.65, 12.5, 0.68, [-9.5, 0.2, 0]);

  // 7. Upper Copper Vapor-Chamber Bridge Plate (35.0 x 35.0 x 0.8 mm)
  const spreaderGeo = trackGeo(
    extrudeSDFPart(
      (x, y) => {
        const frame = sdRoundedBox(x, y, 17.5, 17.5, 4.0);
        const windowCut = sdCircle(x, y, 10.8);
        return sdSmoothSubtract(frame, windowCut, 0.55);
      },
      { halfExtentX: 18.0, halfExtentY: 18.0, depth: 0.8, step: 0.24 },
    ),
  );
  const spreaderMesh = new THREE.Mesh(spreaderGeo, materials.copperRadialPair);
  spreaderMesh.name = "copperHeatSpreader";
  registerPart("copperHeatSpreader", spreaderMesh, 4.6, 17.5, 0.78);

  // 8. Brushed Titanium CNC Top Plate (46.0 x 46.0 x 2.0 mm)
  const topPlateGeo = trackGeo(
    extrudeSDFPart(
      (x, y) => {
        const outer = sdRoundedBox(x, y, 23.0, 23.0, 5.0);
        const viewport = sdCircle(x, y, 12.2);
        const b1 = sdCircle(x - 18.5, y - 18.5, 1.15);
        const b2 = sdCircle(x + 18.5, y - 18.5, 1.15);
        const b3 = sdCircle(x + 18.5, y + 18.5, 1.15);
        const b4 = sdCircle(x - 18.5, y + 18.5, 1.15);
        const bores = Math.min(Math.min(b1, b2), Math.min(b3, b4));
        return sdSmoothSubtract(outer, Math.min(viewport, bores), 0.45);
      },
      { halfExtentX: 23.5, halfExtentY: 23.5, depth: 2.0, step: 0.25 },
    ),
  );
  const topPlateMesh = new THREE.Mesh(topPlateGeo, materials.titaniumPair);
  topPlateMesh.name = "titaniumTopPlate";
  registerPart("titaniumTopPlate", topPlateMesh, 6.0, 23.0, 0.88, [22.0, 0.4, 0]);

  // 9. Beveled Sapphire Glass Viewport & Retaining Ring (Glass Rule: PMREM-only)
  const viewportGroup = new THREE.Group();
  viewportGroup.name = "sapphireViewport";

  const sapphireGeo = trackGeo(
    createCCWLathe(
      [
        [0.001, -0.55],
        [12.0, -0.55],
        [12.0, 0.2],
        [11.65, 0.55],
        [0.001, 0.55],
      ],
      72,
    ),
  );
  const sapphireMesh = new THREE.Mesh(sapphireGeo, materials.sapphireGlass);
  sapphireMesh.name = "sapphireLens";
  sapphireMesh.renderOrder = 4;
  viewportGroup.add(sapphireMesh);

  const bezelGeo = trackGeo(
    createCCWLathe(
      [
        [11.8, -0.65],
        [12.6, -0.65],
        [12.6, 0.35],
        [12.3, 0.65],
        [11.95, 0.65],
        [11.8, 0.45],
        [11.8, -0.65],
      ],
      72,
    ),
  );
  const bezelMesh = new THREE.Mesh(bezelGeo, materials.sapphireBezel);
  bezelMesh.name = "sapphireBezelRing";
  viewportGroup.add(bezelMesh);

  registerPart("sapphireViewport", viewportGroup, 6.75, 29.5, 0.95, [-12.5, 0.4, 0]);

  // 10. 4x Corner M2 Micro-Fasteners (CCW turned cap screws)
  const fastenersGroup = new THREE.Group();
  fastenersGroup.name = "microFasteners";

  const screwGeo = trackGeo(
    createCCWLathe(
      [
        [0.001, -2.8],
        [0.9, -2.8],
        [0.9, 0.0],
        [1.6, 0.0],
        [1.6, 1.1],
        [1.32, 1.4],
        [0.55, 1.4],
        [0.55, 0.78],
        [0.001, 0.78],
      ],
      36,
    ),
  );

  corners.forEach(([cx, cz], idx) => {
    const screw = new THREE.Mesh(screwGeo, materials.fastenerPair[0]);
    screw.name = `microFastener_${idx}`;
    screw.position.set(cx, 0, cz);
    fastenersGroup.add(screw);
  });
  registerPart("microFasteners", fastenersGroup, 6.8, 35.0, 1.0);

  const tmpColor = new THREE.Color();
  const idleColor = new THREE.Color(0x88b4ff);
  const poweredColor = new THREE.Color(0xd8ecff);

  const updateClockPose = (simTime: number, powerLevel: number) => {
    // Unified simulation clock drives rotor rotation, subtle float, and HDR core glints.
    traceRotor.rotation.y = simTime * 0.48;
    phaseRingMesh.rotation.y = -simTime * 0.22;

    const pulse = 0.5 + 0.5 * Math.sin(simTime * 2.8);
    const hdrBoost = 0.55 + powerLevel * 1.55 + pulse * (0.28 + powerLevel * 0.55);
    tmpColor.copy(idleColor).lerp(poweredColor, powerLevel);
    materials.emissiveTrace.emissive.copy(tmpColor);
    materials.emissiveTrace.emissiveIntensity = hdrBoost;

    for (let i = 0; i < traceMeshes.length; i++) {
      const wave = 0.82 + 0.18 * Math.sin(simTime * 3.4 - i * 0.785);
      traceMeshes[i].scale.set(wave, 1, 1);
    }

    // Subtle breathing micro-tilt driven by unified simTime.
    root.rotation.y = Math.sin(simTime * 0.25) * 0.08;
    root.rotation.x = Math.cos(simTime * 0.19) * 0.03;
  };

  const dispose = () => {
    createdGeometries.forEach((geo) => geo.dispose());
  };

  return { root, parts, updateClockPose, dispose };
}

