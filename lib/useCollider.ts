"use client";

import { useEffect, useId, useRef } from "react";
import * as THREE from "three";
import { useCollisionRegistry, ColliderBox } from "./collisionRegistry";

// `extraDeps` lets the caller force a re-measure when something other than
// the ref changes (e.g., a scale/offset/position/rotation that's applied via React state).
export function useCollider(
  ref: React.RefObject<THREE.Object3D | null>,
  mode: "block" | "step" | "wall" = "block",
  extraDeps: unknown[] = [],
) {
  const reg = useCollisionRegistry();
  const id = useId();
  const lastBox = useRef<ColliderBox | null>(null);

  useEffect(() => {
    const obj = ref.current;
    if (!obj) return;

    // Force ALL ancestor and child world matrices to update first.
    // Without this, setFromObject would use stale matrices and produce a
    // bounding box that doesn't reflect the object's CURRENT position/rotation.
    obj.updateMatrix();
    obj.updateMatrixWorld(true);

    // Use precise=true so setFromObject also updates each child's world matrix
    // before reading their geometry. This guarantees the AABB matches the
    // current rotation of the object (otherwise rotated objects come out wrong).
    const box3 = new THREE.Box3().setFromObject(obj, true);
    if (!isFinite(box3.min.x)) return;

    const collider: ColliderBox = {
      id,
      groupId: id,
      mode,
      aabb: {
        minX: box3.min.x, maxX: box3.max.x,
        minY: box3.min.y, maxY: box3.max.y,
        minZ: box3.min.z, maxZ: box3.max.z,
      },
    };
    lastBox.current = collider;
    reg.register(id, [collider]);

    return () => reg.unregister(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, mode, id, reg, ...extraDeps]);
}