"use client";

import { Canvas } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { Controls } from "./Controls";
import { SceneRenderer } from "./SceneRenderer";
import { CollisionProvider } from "@/lib/collisionRegistry";
import type { SceneJson, FogDensity } from "@/types/scene";

const DEFAULT_SUN: [number, number, number] = [0.3, 1, 0.3];

// Maps the AI's fog category to actual exponential density values.
// Tuned for visible-but-not-overwhelming fog at our scene scale
const FOG_DENSITY_MAP: Record<FogDensity, number> = {
  none: 0,
  light: 0.012,    // subtle atmospheric haze, default
  medium: 0.025,   // visible mist in middle distance, moody
  heavy: 0.05,     // clearly fogged scene, mysterious / spooky
};

export function Scene({ scene }: { scene: SceneJson }) {
  const sun = scene.sunPosition ?? DEFAULT_SUN;
  const sunDistance = 100;
  const sunWorldPos: [number, number, number] = [
    sun[0] * sunDistance,
    sun[1] * sunDistance,
    sun[2] * sunDistance,
  ];

  // Pick fog values from AI hints
  const fogColor = scene.fogColor ?? "#b8d8f0";
  const fogDensityKey: FogDensity = scene.fogDensity ?? "light";
  const fogDensity = FOG_DENSITY_MAP[fogDensityKey];

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
      {/* Exponential fog. Density 0 means no fog at all (just don't render it). */}
      {fogDensity > 0 && (
        <fogExp2 attach="fog" args={[fogColor, fogDensity]} />
      )}

      {/* Lighting */}
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

      {/* Collision registry */}
      <CollisionProvider>
        <SceneRenderer scene={scene} />
        <Controls scene={scene} />
      </CollisionProvider>
    </Canvas>
  );
}