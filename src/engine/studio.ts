import * as THREE from "three";

function createSoftboxTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 256, 256);

  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.55, "rgba(235, 242, 255, 0.85)");
  grad.addColorStop(0.85, "rgba(180, 198, 225, 0.25)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createStripTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  const horiz = ctx.createLinearGradient(0, 0, 64, 0);
  horiz.addColorStop(0, "rgba(0, 0, 0, 0)");
  horiz.addColorStop(0.22, "rgba(240, 246, 255, 0.92)");
  horiz.addColorStop(0.5, "rgba(255, 255, 255, 1)");
  horiz.addColorStop(0.78, "rgba(240, 246, 255, 0.92)");
  horiz.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = horiz;
  ctx.fillRect(0, 0, 64, 256);

  // Subtle vertical taper at top & bottom ends.
  ctx.globalCompositeOperation = "destination-in";
  const vert = ctx.createLinearGradient(0, 0, 0, 256);
  vert.addColorStop(0, "rgba(255,255,255,0)");
  vert.addColorStop(0.1, "rgba(255,255,255,1)");
  vert.addColorStop(0.9, "rgba(255,255,255,1)");
  vert.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = vert;
  ctx.fillRect(0, 0, 64, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface StudioEnvironment {
  envMap: THREE.Texture;
  dispose: () => void;
}

/**
 * Builds a dark virtual photo studio containing 1 off-axis key softbox and
 * 2 tall vertical strip lights, then bakes it into a PMREM environment texture.
 */
export function buildStudioEnvironment(
  renderer: THREE.WebGLRenderer,
): StudioEnvironment {
  const studioScene = new THREE.Scene();
  studioScene.background = new THREE.Color(0x020204);

  const softboxTex = createSoftboxTexture();
  const stripTex = createStripTexture();

  const tempGeos: THREE.BufferGeometry[] = [];
  const tempMats: THREE.Material[] = [];

  const addPanel = (
    w: number,
    h: number,
    colorHex: number,
    intensity: number,
    map: THREE.Texture | null,
    pos: [number, number, number],
    lookAt: [number, number, number] = [0, 0, 0],
  ) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const c = new THREE.Color(colorHex).multiplyScalar(intensity);
    const mat = new THREE.MeshBasicMaterial({
      color: c,
      map,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.lookAt(...lookAt);
    studioScene.add(mesh);
    tempGeos.push(geo);
    tempMats.push(mat);
  };

  // 1. One off-axis key softbox panel (upper front-left overhead).
  addPanel(11.5, 8.2, 0xf2f5ff, 4.3, softboxTex, [-7.5, 9.2, 7.0]);

  // 2. Two tall vertical strip lights for razor-sharp edge-line reflections.
  addPanel(2.1, 17.0, 0xddeaff, 5.8, stripTex, [-10.5, 2.2, -3.6]);
  addPanel(1.9, 16.5, 0xfff1e4, 4.6, stripTex, [10.8, 1.8, 3.8]);

  // Subtle floor bounce card so underside milled heat-sink fins stay readable.
  addPanel(14.0, 14.0, 0x1a2233, 0.35, null, [0, -11.0, 0]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromScene(studioScene, 0.025);

  // Clean up temporary studio authoring scene immediately after baking.
  tempGeos.forEach((g) => g.dispose());
  tempMats.forEach((m) => m.dispose());
  softboxTex.dispose();
  stripTex.dispose();

  return {
    envMap: envRT.texture,
    dispose: () => {
      envRT.dispose();
      pmrem.dispose();
    },
  };
}

