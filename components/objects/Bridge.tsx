"use client";

import { useRef } from "react";
import * as THREE from "three";
import type { SceneObject } from "@/types/scene";
import { useCollider } from "@/lib/useCollider";

export function Bridge({ obj }: { obj: SceneObject }) {
  const s = obj.scale ?? 1;
  const width = obj.width ?? 2;
  const length = obj.length ?? 4;
  const color = obj.color ?? "#8a5a3b";
  const ref = useRef<THREE.Group>(null);
  useCollider(ref, "step");

  return (
    <group
      ref={ref}
      position={[obj.x, obj.y ?? 0, obj.z]}
      rotation={[0, obj.rotation ?? 0, 0]}
      scale={s}
    >
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.15, length]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-width / 2 + 0.05, 0.55, 0]} castShadow>
        <boxGeometry args={[0.08, 0.5, length]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>
      <mesh position={[width / 2 - 0.05, 0.55, 0]} castShadow>
        <boxGeometry args={[0.08, 0.5, length]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>
    </group>
  );
}