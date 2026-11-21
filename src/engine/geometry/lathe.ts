import * as THREE from "three";

export type LathePoint2D = [radiusMm: number, yMm: number];

function shoelaceArea2D(pts: LathePoint2D[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [r0, y0] = pts[i];
    const [r1, y1] = pts[(i + 1) % pts.length];
    area += r0 * y1 - r1 * y0;
  }
  return area * 0.5;
}

/**
 * Builds a LatheGeometry from a 2D (radius, y) profile guaranteed to wind
 * counter-clockwise in the (r, y) half-plane so normals always face outward.
 */
export function createCCWLathe(
  profile: LathePoint2D[],
  segments = 64,
): THREE.LatheGeometry {
  const working: LathePoint2D[] = profile.map(([r, y]) => [Math.max(0.001, r), y]);

  const first = working[0];
  const last = working[working.length - 1];
  const isClosed =
    Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.01;

  let signed = shoelaceArea2D(working);
  if (!isClosed) {
    // Virtually close along the Y centerline to verify CCW orientation of the solid cross-section.
    const closedTest: LathePoint2D[] = [
      ...working,
      [0, last[1]],
      [0, first[1]],
    ];
    signed = shoelaceArea2D(closedTest);
  }

  const ordered = signed >= 0 ? working : [...working].reverse();
  const vectors = ordered.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(vectors, segments);

  // Cylindrical UV normalization on top/bottom for brushed radial/circular maps.
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const maxR = Math.max(
    1e-4,
    Math.abs(bb.max.x),
    Math.abs(bb.min.x),
    Math.abs(bb.max.z),
    Math.abs(bb.min.z),
  );
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uv.setXY(i, 0.5 + x / (2 * maxR), 0.5 + z / (2 * maxR));
  }
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

