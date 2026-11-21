import * as THREE from "three";

export type BrushPattern = "circular" | "radial" | "linear";

function createBrushTextures(pattern: BrushPattern): {
  anisotropyMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;
  const anisoCanvas = document.createElement("canvas");
  anisoCanvas.width = size;
  anisoCanvas.height = size;
  const aCtx = anisoCanvas.getContext("2d")!;

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext("2d")!;

  const aImg = aCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);
  const aData = aImg.data;
  const rData = rImg.data;

  // Deterministic LCG PRNG for micro-streak variation without external assets.
  let seed = pattern === "circular" ? 1337 : pattern === "radial" ? 4242 : 9001;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const ringProfile = new Float32Array(size);
  const angleProfile = new Float32Array(360);
  for (let i = 0; i < size; i++) {
    ringProfile[i] = rand();
  }
  for (let i = 0; i < 360; i++) {
    angleProfile[i] = rand();
  }

  const half = size * 0.5;
  for (let y = 0; y < size; y++) {
    const dy = y - half;
    for (let x = 0; x < size; x++) {
      const dx = x - half;
      const idx = (y * size + x) * 4;

      let theta = 0;
      let streak = 0.5;

      if (pattern === "circular") {
        theta = Math.atan2(dy, dx) + Math.PI * 0.5;
        const dist = Math.min(size - 1, Math.floor(Math.hypot(dx, dy) * 1.4));
        streak = 0.78 + ringProfile[dist] * 0.22;
      } else if (pattern === "radial") {
        theta = Math.atan2(dy, dx);
        const deg =
          Math.floor((((theta + Math.PI) / (Math.PI * 2)) * 360) % 360);
        streak = 0.78 + angleProfile[deg] * 0.22;
      } else {
        const lineNoise = ringProfile[y];
        theta = (lineNoise - 0.5) * 0.08;
        streak = 0.76 + lineNoise * 0.24;
      }

      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      aData[idx] = Math.round((cosT * 0.5 + 0.5) * 255);
      aData[idx + 1] = Math.round((sinT * 0.5 + 0.5) * 255);
      aData[idx + 2] = 255;
      aData[idx + 3] = 255;

      const roughByte = Math.round(Math.max(0, Math.min(1, streak)) * 255);
      rData[idx] = roughByte;
      rData[idx + 1] = roughByte;
      rData[idx + 2] = roughByte;
      rData[idx + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  const anisotropyMap = new THREE.CanvasTexture(anisoCanvas);
  anisotropyMap.colorSpace = THREE.NoColorSpace;
  anisotropyMap.wrapS = THREE.RepeatWrapping;
  anisotropyMap.wrapT = THREE.RepeatWrapping;
  anisotropyMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.needsUpdate = true;

  return { anisotropyMap, roughnessMap };
}

export type MaterialPair = [THREE.MeshPhysicalMaterial, THREE.MeshPhysicalMaterial];

export interface MaterialBank {
  gunmetalPair: MaterialPair;
  heatsinkPair: MaterialPair;
  titaniumPair: MaterialPair;
  copperLinearPair: MaterialPair;
  copperRadialPair: MaterialPair;
  siliconPair: MaterialPair;
  backplanePair: MaterialPair;
  standoffBrass: THREE.MeshPhysicalMaterial;
  fastenerPair: MaterialPair;
  phaseRing: THREE.MeshPhysicalMaterial;
  emissiveTrace: THREE.MeshStandardMaterial;
  sapphireGlass: THREE.MeshPhysicalMaterial;
  sapphireBezel: THREE.MeshPhysicalMaterial;
  blueprintOcclusion: THREE.MeshBasicMaterial;
  blueprintLinesPrimary: THREE.LineBasicMaterial;
  blueprintLinesAccent: THREE.LineBasicMaterial;
  setBlueprintMode: (root: THREE.Object3D, enabled: boolean) => void;
  dispose: () => void;
}

function makeAnisotropicPair(
  faceColor: number,
  bevelColor: number,
  maps: { anisotropyMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture },
  faceRoughness = 0.3,
  bevelRoughness = 0.09,
  extra?: Partial<THREE.MeshPhysicalMaterialParameters>,
): MaterialPair {
  const face = new THREE.MeshPhysicalMaterial({
    color: faceColor,
    metalness: 1.0,
    roughness: faceRoughness,
    roughnessMap: maps.roughnessMap,
    anisotropy: 0.8,
    anisotropyMap: maps.anisotropyMap,
    envMapIntensity: 1.25,
    ...extra,
  });

  const bevel = new THREE.MeshPhysicalMaterial({
    color: bevelColor,
    metalness: 1.0,
    roughness: bevelRoughness,
    clearcoat: 0.24,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.5,
  });

  return [face, bevel];
}

export function createMaterialBank(): MaterialBank {
  const circular = createBrushTextures("circular");
  const radial = createBrushTextures("radial");
  const linear = createBrushTextures("linear");

  const gunmetalPair = makeAnisotropicPair(0x2a2f38, 0x626b7a, linear, 0.3, 0.09);
  const heatsinkPair = makeAnisotropicPair(0x232730, 0x828c9c, linear, 0.28, 0.08);
  const titaniumPair = makeAnisotropicPair(0x9ca4b0, 0xe4eaf2, circular, 0.3, 0.08);
  const copperLinearPair = makeAnisotropicPair(0xc97b53, 0xf2b591, linear, 0.29, 0.08);
  const copperRadialPair = makeAnisotropicPair(0xce825b, 0xf5be9b, radial, 0.28, 0.08);

  const siliconPair: MaterialPair = [
    new THREE.MeshPhysicalMaterial({
      color: 0x151b26,
      metalness: 0.94,
      roughness: 0.14,
      roughnessMap: linear.roughnessMap,
      anisotropy: 0.6,
      anisotropyMap: linear.anisotropyMap,
      iridescence: 0.7,
      iridescenceIOR: 1.85,
      iridescenceThicknessRange: [180, 480],
      envMapIntensity: 1.35,
    }),
    new THREE.MeshPhysicalMaterial({
      color: 0x5c6f8c,
      metalness: 1.0,
      roughness: 0.08,
      iridescence: 0.45,
      envMapIntensity: 1.5,
    }),
  ];

  const backplanePair: MaterialPair = [
    new THREE.MeshPhysicalMaterial({
      color: 0x14161b,
      metalness: 0.45,
      roughness: 0.52,
      envMapIntensity: 0.85,
    }),
    new THREE.MeshPhysicalMaterial({
      color: 0xc9a468,
      metalness: 1.0,
      roughness: 0.14,
      envMapIntensity: 1.4,
    }),
  ];

  const standoffBrass = new THREE.MeshPhysicalMaterial({
    color: 0xd4ad6a,
    metalness: 1.0,
    roughness: 0.16,
    anisotropy: 0.8,
    anisotropyMap: circular.anisotropyMap,
    envMapIntensity: 1.4,
  });

  const fastenerPair = makeAnisotropicPair(0xa5aeb9, 0xf0f4fa, radial, 0.26, 0.07);

  const phaseRing = new THREE.MeshPhysicalMaterial({
    color: 0xd48d66,
    metalness: 1.0,
    roughness: 0.2,
    anisotropy: 0.8,
    anisotropyMap: circular.anisotropyMap,
    envMapIntensity: 1.45,
  });

  const emissiveTrace = new THREE.MeshStandardMaterial({
    color: 0x1c2533,
    emissive: new THREE.Color(0x9ec5ff),
    emissiveIntensity: 0.45,
    metalness: 0.5,
    roughness: 0.25,
    toneMapped: false,
  });

  // Sapphire Glass Rule: reflect PMREM studio environment ONLY (additive), zero direct lights.
  const sapphireGlass = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    metalness: 0.0,
    roughness: 0.03,
    ior: 1.77,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.025,
    envMapIntensity: 1.55,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  sapphireGlass.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_fragment_begin>",
      `#include <lights_fragment_begin>
       reflectedLight.directDiffuse = vec3(0.0);
       reflectedLight.directSpecular = vec3(0.0);`,
    );
  };
  sapphireGlass.customProgramCacheKey = () => "sapphire-pmrem-only-v1";

  const sapphireBezel = new THREE.MeshPhysicalMaterial({
    color: 0x383f4a,
    metalness: 1.0,
    roughness: 0.12,
    anisotropy: 0.8,
    anisotropyMap: circular.anisotropyMap,
    envMapIntensity: 1.45,
  });

  const blueprintOcclusion = new THREE.MeshBasicMaterial({
    color: 0x06080c,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const blueprintLinesPrimary = new THREE.LineBasicMaterial({
    color: 0xcad9f0,
    transparent: true,
    opacity: 0.72,
  });

  const blueprintLinesAccent = new THREE.LineBasicMaterial({
    color: 0x7cb6ff,
    transparent: true,
    opacity: 0.9,
  });

  const originalMaterials = new WeakMap<
    THREE.Mesh,
    THREE.Material | THREE.Material[]
  >();
  const wireOverlays = new WeakMap<THREE.Mesh, THREE.LineSegments>();
  const edgeGeoCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
  const createdEdgeGeos: THREE.EdgesGeometry[] = [];

  const ensureWireOverlay = (mesh: THREE.Mesh) => {
    if (wireOverlays.has(mesh)) return wireOverlays.get(mesh)!;
    let edgeGeo = edgeGeoCache.get(mesh.geometry);
    if (!edgeGeo) {
      edgeGeo = new THREE.EdgesGeometry(mesh.geometry, 20);
      edgeGeoCache.set(mesh.geometry, edgeGeo);
      createdEdgeGeos.push(edgeGeo);
    }
    const isAccent = Boolean(mesh.userData.blueprintAccent);
    const lines = new THREE.LineSegments(
      edgeGeo,
      isAccent ? blueprintLinesAccent : blueprintLinesPrimary,
    );
    lines.name = `${mesh.name || "part"}_wire`;
    lines.raycast = () => {};
    lines.visible = false;
    mesh.add(lines);
    wireOverlays.set(mesh, lines);
    return lines;
  };

  const setBlueprintMode = (root: THREE.Object3D, enabled: boolean) => {
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      if (!originalMaterials.has(node)) {
        originalMaterials.set(node, node.material);
      }
      const wire = ensureWireOverlay(node);
      wire.visible = enabled;
      if (enabled) {
        node.material = blueprintOcclusion;
      } else {
        node.material = originalMaterials.get(node)!;
      }
    });
  };

  const allTextures = [
    circular.anisotropyMap,
    circular.roughnessMap,
    radial.anisotropyMap,
    radial.roughnessMap,
    linear.anisotropyMap,
    linear.roughnessMap,
  ];

  const allMaterials: THREE.Material[] = [
    ...gunmetalPair,
    ...heatsinkPair,
    ...titaniumPair,
    ...copperLinearPair,
    ...copperRadialPair,
    ...siliconPair,
    ...backplanePair,
    standoffBrass,
    ...fastenerPair,
    phaseRing,
    emissiveTrace,
    sapphireGlass,
    sapphireBezel,
    blueprintOcclusion,
    blueprintLinesPrimary,
    blueprintLinesAccent,
  ];

  const dispose = () => {
    allTextures.forEach((tex) => tex.dispose());
    allMaterials.forEach((mat) => mat.dispose());
    createdEdgeGeos.forEach((geo) => geo.dispose());
  };

  return {
    gunmetalPair,
    heatsinkPair,
    titaniumPair,
    copperLinearPair,
    copperRadialPair,
    siliconPair,
    backplanePair,
    standoffBrass,
    fastenerPair,
    phaseRing,
    emissiveTrace,
    sapphireGlass,
    sapphireBezel,
    blueprintOcclusion,
    blueprintLinesPrimary,
    blueprintLinesAccent,
    setBlueprintMode,
    dispose,
  };
}
