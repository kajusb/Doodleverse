"use client";

import { Canvas } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { Controls } from "./Controls";
import { SceneRenderer } from "./SceneRenderer";
import type { SceneJson } from "@/types/scene";

export function Scene({ scene }: { scene: SceneJson }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.6, 12], fov: 70, near: 0.1, far: 500 }}
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* Sky and atmosphere */}
      <Sky sunPosition={[100, 20, 100]} turbidity={8} rayleigh={2} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* World content (terrain + every object from the JSON) */}
      <SceneRenderer scene={scene} />

      {/* WASD + mouse-look */}
      <Controls />
    </Canvas>
  );
}