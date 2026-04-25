"use client";

import type { SceneObject } from "@/types/scene";

export function Tree({ obj }: { obj: SceneObject }) {
  const s = obj.scale ?? 1;
  const color = obj.color ?? "#3f8e3f";

  return (
    <group
      position={[obj.x, obj.y ?? 0, obj.z]}
      rotation={[0, obj.rotation ?? 0, 0]}
      scale={s}
    >
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 1, 8]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <coneGeometry args={[0.9, 1.2, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <coneGeometry args={[0.65, 1, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 2.7, 0]} castShadow>
        <coneGeometry args={[0.4, 0.8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}