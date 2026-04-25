"use client";

import type { SceneObject } from "@/types/scene";

export function Water({ obj }: { obj: SceneObject }) {
  const width = obj.width ?? 5;
  const length = obj.length ?? width;
  const color = obj.color ?? "#3a7ebf";

  return (
    <mesh
      position={[obj.x, (obj.y ?? 0) - 0.03, obj.z]}
      rotation={[-Math.PI / 2, 0, obj.rotation ?? 0]}
      receiveShadow
    >
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.85}
        roughness={0.2}
        metalness={0.1}
      />
    </mesh>
  );
}