"use client";

import type { SceneObject } from "@/types/scene";

export function Rock({ obj }: { obj: SceneObject }) {
  const s = obj.scale ?? 1;
  const color = obj.color ?? "#8a8a8a";
  const rx = (Math.sin(obj.x * 12.9898 + obj.z * 78.233) * 0.5) * Math.PI;
  const rz = (Math.sin(obj.x * 4.1 + obj.z * 7.7) * 0.5) * Math.PI;

  return (
    <group
      position={[obj.x, (obj.y ?? 0) + 0.3 * s, obj.z]}
      rotation={[rx, obj.rotation ?? 0, rz]}
      scale={s}
    >
      <mesh castShadow receiveShadow>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}