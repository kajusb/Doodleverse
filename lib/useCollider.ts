"use client";

import { useEffect, useId, useRef } from "react";
import * as THREE from "three";
import { useCollisionRegistry, ColliderBox } from "./collisionRegistry";

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

    obj.updateWorldMatrix(true, true);
    const box3 = new THREE.Box3().setFromObject(obj);
    if (!isFinite(box3.min.x)) return;

    const collider: ColliderBox = {
      id,
      groupId: id, // each collider is its own group
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