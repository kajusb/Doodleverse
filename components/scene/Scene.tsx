"use client";

import { Canvas } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { Controls } from "./Controls";
import { SceneRenderer } from "./SceneRenderer";
import { CollisionProvider } from "@/lib/collisionRegistry";
import type { SceneJson } from "@/types/scene";

// Default sun position when the AI didn't provide one — overhead daytime.
const DEFAULT_SUN: [number, number, number] = [0.3, 1, 0.3];

export function Scene({ scene }: { scene: SceneJson }) {
  // Sun direction drives both Sky atmosphere and the directional light.
  const sun = scene.sunPosition ?? DEFAULT_SUN;
  const sunDistance = 100;
  const sunWorldPos: [number, number, number] = [
    sun[0] * sunDistance,
    sun[1] * sunDistance,
    sun[2] * sunDistance,
  ];

  // Fog: prefer the AI's color, fall back to a neutral light haze.
  // Use exponential fog (fogExp2) for natural-looking atmospheric falloff.
  // Density 0.012 = subtle haze far away, fully clear up close.
  const fogColor = scene.fogColor ?? "#b8d8f0";
  const fogDensity = 0.012;

  // If the AI gave us a skyColor, swap from procedural Sky to a solid background.
  // Solid color blends much better with custom fog and lets us match moody scenes.
  const useCustomSky = !!scene.skyColor;

  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.6, 12], fov: 70, near: 0.1, far: 500 }}
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* Sky and atmosphere */}
      {useCustomSky ? (
        <color attach="background" args={[scene.skyColor!]} />
      ) : (
        <Sky sunPosition={sunWorldPos} turbidity={8} rayleigh={2} />
      )}
      {/* Exponential fog — natural atmospheric falloff. Distant objects fade
          smoothly into the fog color, no sharp band, no aggressive close-up haze. */}
      <fogExp2 attach="fog" args={[fogColor, fogDensity]} />

      {/* Lighting — sun direction matches the sky */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={sunWorldPos}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Collision registry — every object inside reports its bounding box,
          Controls reads them every frame */}
      <CollisionProvider>
        {/* World content (terrain + every object from the JSON) */}
        <SceneRenderer scene={scene} />

        {/* WASD + mouse-look */}
        <Controls scene={scene} />
      </CollisionProvider>
    </Canvas>
  );
}