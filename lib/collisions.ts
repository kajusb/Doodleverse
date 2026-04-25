import type { SceneJson, SceneObject } from "@/types/scene";

export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

// Build a bounding box for one object based on its type and scale
function buildBox(obj: SceneObject): AABB | null {
  const s = obj.scale ?? 1;
  const x = obj.x;
  const z = obj.z;

  switch (obj.type) {
    case "tree": {
      const r = 0.5 * s;
      const top = 3.5 * s;
      return {
        minX: x - r, maxX: x + r,
        minZ: z - r, maxZ: z + r,
        minY: 0, maxY: top,
      };
    }
    case "house": {
      const half = 1.25 * s;
      const top = 3.2 * s;
      return {
        minX: x - half, maxX: x + half,
        minZ: z - half, maxZ: z + half,
        minY: 0, maxY: top,
      };
    }
    case "rock": {
      const r = 0.6 * s;
      const top = 0.9 * s;
      return {
        minX: x - r, maxX: x + r,
        minZ: z - r, maxZ: z + r,
        minY: 0, maxY: top,
      };
    }
    case "bridge": {
      const w = (obj.width ?? 2) * s / 2;
      const l = (obj.length ?? 4) * s / 2;
      const top = 0.3 * s;
      return {
        minX: x - w, maxX: x + w,
        minZ: z - l, maxZ: z + l,
        minY: 0, maxY: top,
      };
    }
    default:
      return null;
  }
}

export function buildCollisionBoxes(scene: SceneJson): AABB[] {
  return scene.objects
    .map(buildBox)
    .filter((b): b is AABB => b !== null);
}

// Treat the camera as a point. Find the box (if any) the point is inside on
// the XZ plane, considering only boxes whose Y range overlaps the camera Y.
export function findBlockingBox(
  boxes: AABB[],
  x: number,
  y: number,
  z: number,
  radius = 0.3,
): AABB | null {
  for (const b of boxes) {
    if (
      x + radius > b.minX && x - radius < b.maxX &&
      z + radius > b.minZ && z - radius < b.maxZ &&
      y > b.minY && y < b.maxY
    ) {
      return b;
    }
  }
  return null;
}

// Find any box that overlaps the (x, z) point regardless of Y.
// Used for step-up: we need to know what's underfoot, not what's at body height.
export function findOverlappingBox(
  boxes: AABB[],
  x: number,
  z: number,
  radius = 0.3,
): AABB | null {
  for (const b of boxes) {
    if (
      x + radius > b.minX && x - radius < b.maxX &&
      z + radius > b.minZ && z - radius < b.maxZ
    ) {
      return b;
    }
  }
  return null;
}

// Check what's beneath the camera at (x, z): the highest box top that's at
// or below the camera's current Y. Used for landing on objects.
export function findGroundUnder(
  boxes: AABB[],
  x: number,
  z: number,
  y: number,
  radius = 0.3,
): number {
  let highest = 0; // ground plane is at y=0
  for (const b of boxes) {
    const overlapXZ =
      x + radius > b.minX && x - radius < b.maxX &&
      z + radius > b.minZ && z - radius < b.maxZ;
    if (!overlapXZ) continue;
    if (b.maxY <= y + 0.01 && b.maxY > highest) {
      highest = b.maxY;
    }
  }
  return highest;
}