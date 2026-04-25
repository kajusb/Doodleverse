"use client";

import { useEffect, useId } from "react";
import * as THREE from "three";
import { useCollisionRegistry, ColliderBox } from "./collisionRegistry";

export function useCollider(
  ref: React.RefObject<THREE.Object3D | null>,
  mode: "block" | "step" | "wall" = "block",
) {
  const reg = useCollisionRegistry();
  const groupId = useId();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    root.updateWorldMatrix(true, true);

    const boxes: ColliderBox[] = [];
    let i = 0;

    // Walk every Mesh inside the object. One tight box per mesh.
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.computeBoundingBox();
      const local = child.geometry.boundingBox;
      if (!local) return;
      const world = local.clone().applyMatrix4(child.matrixWorld);

      boxes.push({
        id: `${groupId}:${i++}`,
        groupId,
        mode,
        aabb: {
          minX: world.min.x, maxX: world.max.x,
          minY: world.min.y, maxY: world.max.y,
          minZ: world.min.z, maxZ: world.max.z,
        },
      });
    });

    if (boxes.length > 0) {
      reg.register(groupId, boxes);
    }

    return () => reg.unregister(groupId);
  }, [ref, mode, groupId, reg]);
}