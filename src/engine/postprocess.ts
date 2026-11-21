import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.017 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float n = hash12(vUv * vec2(1920.0, 1080.0) + fract(uTime * 17.3) * 100.0) - 0.5;
      vec2 centered = vUv - 0.5;
      float vig = 1.0 - dot(centered, centered) * 0.38;
      color.rgb = color.rgb * vig + vec3(n * uGrain);
      gl_FragColor = color;
    }
  `,
};

export interface PostProcessPipeline {
  setSize: (width: number, height: number, dpr: number) => void;
  setBloomEnabled: (enabled: boolean) => void;
  render: (timeSec: number) => void;
  dispose: () => void;
}

export function createPostProcessPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number,
  dpr: number,
  isMobile: boolean,
): PostProcessPipeline {
  const pw = Math.max(1, Math.floor(width * dpr));
  const ph = Math.max(1, Math.floor(height * dpr));

  const renderTarget = new THREE.WebGLRenderTarget(pw, ph, {
    type: THREE.HalfFloatType,
    samples: isMobile ? 2 : 4,
  });

  const composer = new EffectComposer(renderer, renderTarget);
  composer.setPixelRatio(1);
  composer.setSize(pw, ph);

  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(pw, ph),
    0.34,
    0.42,
    1.08,
  );
  const outputPass = new OutputPass();
  const grainPass = new ShaderPass(FilmGrainShader);

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);
  composer.addPass(grainPass);

  return {
    setSize: (w: number, h: number, nextDpr: number) => {
      const nw = Math.max(1, Math.floor(w * nextDpr));
      const nh = Math.max(1, Math.floor(h * nextDpr));
      composer.setSize(nw, nh);
      bloomPass.resolution.set(nw, nh);
    },
    setBloomEnabled: (enabled: boolean) => {
      bloomPass.enabled = enabled;
    },
    render: (timeSec: number) => {
      grainPass.uniforms.uTime.value = timeSec;
      composer.render();
    },
    dispose: () => {
      renderPass.dispose();
      bloomPass.dispose();
      outputPass.dispose();
      grainPass.dispose();
      renderTarget.dispose();
      composer.dispose();
    },
  };
}

