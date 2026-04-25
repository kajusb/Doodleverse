"use client";

import { Canvas } from "@react-three/fiber";
import { Controls } from "./Controls";

export function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.6, 5], fov: 70 }}
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
      />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#6aa84f" />
      </mesh>

      {/* A cube */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
      <Controls />
    </Canvas>
  );
}