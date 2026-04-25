"use client";

import type { SceneObject } from "@/types/scene";

export function Path({ obj }: { obj: SceneObject }) {
  const width = obj.width ?? 1.2;
  const length = obj.length ?? 6;
  const color = obj.color ?? "#b8a074";

  return (
    <mesh
      position={[obj.x, (obj.y ?? 0) + 0.01, obj.z]}
      rotation={[-Math.PI / 2, 0, obj.rotation ?? 0]}
      receiveShadow
    >
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}