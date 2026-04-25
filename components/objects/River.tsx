"use client";

import type { SceneObject } from "@/types/scene";

export function River({ obj }: { obj: SceneObject }) {
  const width = obj.width ?? 2;
  const length = obj.length ?? 10;
  const color = obj.color ?? "#3a7ebf";

  return (
    <group
      position={[obj.x, (obj.y ?? 0) - 0.04, obj.z]}
      rotation={[0, obj.rotation ?? 0, 0]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.85}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 1.1, length * 1.02]} />
        <meshStandardMaterial color="#1e4d73" />
      </mesh>
    </group>
  );
}