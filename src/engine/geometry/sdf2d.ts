import * as THREE from "three";

export type SDF2D = (x: number, y: number) => number;

export function sdCircle(x: number, y: number, r: number): number {
  return Math.hypot(x, y) - r;
}

export function sdRoundedBox(
  x: number,
  y: number,
  hx: number,
  hy: number,
  r: number,
): number {
  const qx = Math.abs(x) - (hx - r);
  const qy = Math.abs(y) - (hy - r);
  const outX = Math.max(qx, 0);
  const outY = Math.max(qy, 0);
  return Math.hypot(outX, outY) + Math.min(Math.max(qx, qy), 0) - r;
}

export function sdChamferBox(
  x: number,
  y: number,
  hx: number,
  hy: number,
  chamfer: number,
): number {
  const box = Math.max(Math.abs(x) - hx, Math.abs(y) - hy);
  const diag = (Math.abs(x) + Math.abs(y) - (hx + hy - chamfer)) * Math.SQRT1_2;
  return Math.max(box, diag);
}

export function sdCapsule(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: number,
): number {
  const pax = x - ax;
  const pay = y - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const denom = bax * bax + bay * bay || 1e-6;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / denom));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
}

/** Polynomial smooth union with fillet radius k (mm). */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Polynomial smooth intersection with fillet radius k (mm). */
export function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}

/** Smooth subtraction: base minus cut with fillet radius k (mm). */
export function sdSmoothSubtract(base: number, cut: number, k: number): number {
  return smax(base, -cut, k);
}

interface Point2D {
  x: number;
  y: number;
}

function quantKey(p: Point2D): string {
  return `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)}`;
}

function interpZero(
  x0: number,
  y0: number,
  v0: number,
  x1: number,
  y1: number,
  v1: number,
): Point2D {
  const dv = v1 - v0;
  const t = Math.abs(dv) < 1e-9 ? 0.5 : Math.max(0.01, Math.min(0.99, -v0 / dv));
  return {
    x: x0 + (x1 - x0) * t,
    y: y0 + (y1 - y0) * t,
  };
}

function signedArea(pts: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area * 0.5;
}

function pointInPoly(pt: Point2D, poly: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function projectToZero(sdf: SDF2D, p: Point2D, eps: number): Point2D {
  let x = p.x;
  let y = p.y;
  for (let iter = 0; iter < 2; iter++) {
    const v = sdf(x, y);
    if (Math.abs(v) < 1e-4) break;
    const gx = (sdf(x + eps, y) - sdf(x - eps, y)) / (2 * eps);
    const gy = (sdf(x, y + eps) - sdf(x, y - eps)) / (2 * eps);
    const g2 = gx * gx + gy * gy;
    if (g2 < 1e-8) break;
    const step = Math.max(-0.25, Math.min(0.25, v / g2));
    x -= step * gx;
    y -= step * gy;
  }
  return { x, y };
}

function chaikinPass(pts: Point2D[]): Point2D[] {
  const out: Point2D[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
    out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
  }
  return out;
}

function perpDist(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function rdpOpen(pts: Point2D[], eps: number): Point2D[] {
  if (pts.length <= 2) return pts;
  let maxDist = 0;
  let index = 0;
  const end = pts.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpDist(pts[i], pts[0], pts[end]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > eps) {
    const left = rdpOpen(pts.slice(0, index + 1), eps);
    const right = rdpOpen(pts.slice(index), eps);
    return left.slice(0, -1).concat(right);
  }
  return [pts[0], pts[end]];
}

function simplifyClosedLoop(pts: Point2D[], eps: number, minSeg: number): Point2D[] {
  if (pts.length < 4) return pts;
  let farIdx = 0;
  let maxD = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[0].x, pts[i].y - pts[0].y);
    if (d > maxD) {
      maxD = d;
      farIdx = i;
    }
  }
  const h1 = rdpOpen(pts.slice(0, farIdx + 1), eps);
  const h2 = rdpOpen(pts.slice(farIdx).concat([pts[0]]), eps);
  const merged = h1.slice(0, -1).concat(h2.slice(0, -1));

  const pruned: Point2D[] = [];
  for (const p of merged) {
    const prev = pruned[pruned.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) >= minSeg) {
      pruned.push(p);
    }
  }
  if (
    pruned.length > 2 &&
    Math.hypot(
      pruned[0].x - pruned[pruned.length - 1].x,
      pruned[0].y - pruned[pruned.length - 1].y,
    ) < minSeg
  ) {
    pruned.pop();
  }
  return pruned;
}

/**
 * Extracts closed outer contours (CCW) and nested hole paths (CW) from a 2D SDF
 * via marching squares + Newton boundary projection + curvature simplification.
 */
export function extractShapesFromSDF(
  sdf: SDF2D,
  halfExtentX: number,
  halfExtentY: number,
  step = 0.25,
): THREE.Shape[] {
  const pad = step * 3;
  const minX = -halfExtentX - pad;
  const maxX = halfExtentX + pad;
  const minY = -halfExtentY - pad;
  const maxY = halfExtentY + pad;

  const nx = Math.ceil((maxX - minX) / step);
  const ny = Math.ceil((maxY - minY) / step);
  const dx = (maxX - minX) / nx;
  const dy = (maxY - minY) / ny;

  const grid = new Float32Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) {
    const y = minY + j * dy;
    const isBorderY = j === 0 || j === ny;
    for (let i = 0; i <= nx; i++) {
      const x = minX + i * dx;
      const isBorderX = i === 0 || i === nx;
      const raw = sdf(x, y);
      // Force outer grid boundary strictly positive so every loop closes cleanly.
      grid[j * (nx + 1) + i] = isBorderX || isBorderY ? Math.max(raw, step) : raw;
    }
  }

  const adj = new Map<string, { from: Point2D; to: Point2D; toKey: string }[]>();
  const addSeg = (a: Point2D, b: Point2D) => {
    const ka = quantKey(a);
    const kb = quantKey(b);
    if (ka === kb) return;
    let list = adj.get(ka);
    if (!list) {
      list = [];
      adj.set(ka, list);
    }
    list.push({ from: a, to: b, toKey: kb });
  };

  for (let j = 0; j < ny; j++) {
    const y0 = minY + j * dy;
    const y1 = y0 + dy;
    for (let i = 0; i < nx; i++) {
      const x0 = minX + i * dx;
      const x1 = x0 + dx;

      const v0 = grid[j * (nx + 1) + i];
      const v1 = grid[j * (nx + 1) + (i + 1)];
      const v2 = grid[(j + 1) * (nx + 1) + (i + 1)];
      const v3 = grid[(j + 1) * (nx + 1) + i];

      const mask =
        (v0 < 0 ? 1 : 0) |
        (v1 < 0 ? 2 : 0) |
        (v2 < 0 ? 4 : 0) |
        (v3 < 0 ? 8 : 0);

      if (mask === 0 || mask === 15) continue;

      const edgePt = (e: number): Point2D => {
        switch (e) {
          case 0:
            return interpZero(x0, y0, v0, x1, y0, v1);
          case 1:
            return interpZero(x1, y0, v1, x1, y1, v2);
          case 2:
            return interpZero(x1, y1, v2, x0, y1, v3);
          default:
            return interpZero(x0, y1, v3, x0, y0, v0);
        }
      };

      const emit = (eA: number, eB: number) => addSeg(edgePt(eA), edgePt(eB));

      switch (mask) {
        case 1:
          emit(0, 3);
          break;
        case 2:
          emit(1, 0);
          break;
        case 3:
          emit(1, 3);
          break;
        case 4:
          emit(2, 1);
          break;
        case 5: {
          const vc = sdf((x0 + x1) * 0.5, (y0 + y1) * 0.5);
          if (vc < 0) {
            emit(0, 1);
            emit(2, 3);
          } else {
            emit(0, 3);
            emit(2, 1);
          }
          break;
        }
        case 6:
          emit(2, 0);
          break;
        case 7:
          emit(2, 3);
          break;
        case 8:
          emit(3, 2);
          break;
        case 9:
          emit(0, 2);
          break;
        case 10: {
          const vc = sdf((x0 + x1) * 0.5, (y0 + y1) * 0.5);
          if (vc < 0) {
            emit(1, 2);
            emit(3, 0);
          } else {
            emit(1, 0);
            emit(3, 2);
          }
          break;
        }
        case 11:
          emit(1, 2);
          break;
        case 12:
          emit(3, 1);
          break;
        case 13:
          emit(0, 1);
          break;
        case 14:
          emit(3, 0);
          break;
      }
    }
  }

  // Stitch edge segments into closed loops.
  const rawLoops: Point2D[][] = [];
  for (const [startKey] of adj) {
    while ((adj.get(startKey)?.length ?? 0) > 0) {
      const loop: Point2D[] = [];
      let currKey = startKey;
      let guard = 0;
      while (guard++ < 50000) {
        const edges = adj.get(currKey);
        if (!edges || edges.length === 0) break;
        const edge = edges.pop()!;
        loop.push(edge.from);
        currKey = edge.toKey;
        if (currKey === startKey) break;
      }
      if (loop.length >= 6) {
        rawLoops.push(loop);
      }
    }
  }

  const gradEps = Math.min(0.05, step * 0.25);
  const refinedLoops = rawLoops
    .map((loop) => {
      const projected = loop.map((p) => projectToZero(sdf, p, gradEps));
      const smoothed = chaikinPass(projected).map((p) =>
        projectToZero(sdf, p, gradEps),
      );
      return simplifyClosedLoop(smoothed, 0.02, 0.08);
    })
    .filter((pts) => pts.length >= 3 && Math.abs(signedArea(pts)) > 0.2);

  // Classify nesting depth to separate outer shapes (even depth) from holes (odd depth).
  const depths = refinedLoops.map((loop, idx) => {
    const sample = loop[0];
    let depth = 0;
    for (let j = 0; j < refinedLoops.length; j++) {
      if (j === idx) continue;
      if (pointInPoly(sample, refinedLoops[j])) {
        depth++;
      }
    }
    return depth;
  });

  const outers = refinedLoops
    .map((pts, idx) => ({ pts, depth: depths[idx] }))
    .filter((entry) => entry.depth % 2 === 0);
  const holes = refinedLoops
    .map((pts, idx) => ({ pts, depth: depths[idx] }))
    .filter((entry) => entry.depth % 2 === 1);

  return outers.map((outer) => {
    const ccwOuter =
      signedArea(outer.pts) > 0 ? outer.pts : [...outer.pts].reverse();
    const shape = new THREE.Shape(
      ccwOuter.map((p) => new THREE.Vector2(p.x, p.y)),
    );

    for (const hole of holes) {
      if (hole.depth === outer.depth + 1 && pointInPoly(hole.pts[0], ccwOuter)) {
        const cwHole =
          signedArea(hole.pts) < 0 ? hole.pts : [...hole.pts].reverse();
        shape.holes.push(
          new THREE.Path(cwHole.map((p) => new THREE.Vector2(p.x, p.y))),
        );
      }
    }
    return shape;
  });
}

export interface ExtrudeSDFOptions {
  halfExtentX: number;
  halfExtentY: number;
  depth: number;
  step?: number;
  bevelSize?: number;
  bevelThickness?: number;
  bevelSegments?: number;
  curveSegments?: number;
}

/**
 * Extrudes a 2D SDF part in millimetres with 0.05 mm polished bevels,
 * planar normalized UVs for anisotropic brushed textures, and lies flat in XZ.
 */
export function extrudeSDFPart(
  sdf: SDF2D,
  opts: ExtrudeSDFOptions,
): THREE.BufferGeometry {
  const {
    halfExtentX,
    halfExtentY,
    depth,
    step = 0.25,
    bevelSize = 0.05,
    bevelThickness = 0.05,
    bevelSegments = 3,
    curveSegments = 24,
  } = opts;

  const shapes = extractShapesFromSDF(sdf, halfExtentX, halfExtentY, step);
  const effectiveDepth = Math.max(0.1, depth - bevelThickness * 2);

  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: effectiveDepth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments,
    curveSegments,
  });

  // Center extrusion along Z, then normalize planar UVs before rotating to XZ.
  geo.translate(0, 0, -effectiveDepth * 0.5);
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const spanX = Math.max(1e-4, bb.max.x - bb.min.x);
  const spanY = Math.max(1e-4, bb.max.y - bb.min.y);

  const posAttr = geo.attributes.position;
  const uvAttr = geo.attributes.uv;
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);
    uvAttr.setXY(i, (px - bb.min.x) / spanX, (py - bb.min.y) / spanY);
  }
  uvAttr.needsUpdate = true;

  // Rotate from XY extrusion into horizontal XZ plate orientation (thickness along +Y).
  geo.rotateX(-Math.PI * 0.5);
  geo.computeVertexNormals();
  return geo;
}

