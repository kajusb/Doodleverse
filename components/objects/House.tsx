"use client";

import { useRef } from "react";
import * as THREE from "three";
import type { SceneObject } from "@/types/scene";
import { useCollider } from "@/lib/useCollider";

export function House({ obj }: { obj: SceneObject }) {
  const s = obj.scale ?? 1;
  const wallColor = obj.color ?? "#c98c5a";
  const ref = useRef<THREE.Group>(null);
  useCollider(ref, "block");

  return (
    <group
      ref={ref}
      position={[obj.x, obj.y ?? 0, obj.z]}
      rotation={[0, obj.rotation ?? 0, 0]}
      scale={s}
    >
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 2, 2.5]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[0, 2.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[2, 1.2, 4]} />
        <meshStandardMaterial color="#6b3b2a" />
      </mesh>
      <mesh position={[0, 0.6, 1.26]} castShadow>
        <boxGeometry args={[0.6, 1.2, 0.05]} />
        <meshStandardMaterial color="#3a2416" />
      </mesh>
      <mesh position={[0.8, 1.2, 1.26]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.05]} />
        <meshStandardMaterial color="#a8d8ff" emissive="#6fa8d6" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}