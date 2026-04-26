"use client";

import { Canvas } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import * as THREE from "three";
import { Controls } from "./Controls";
import { SceneRenderer } from "./SceneRenderer";
import { CollisionProvider } from "@/lib/collisionRegistry";
import type { SceneJson, FogDensity } from "@/types/scene";

const DEFAULT_SUN: [number, number, number] = [0.3, 1, 0.3];

// Maps the AI's fog category to actual exponential density values.
const FOG_DENSITY_MAP: Record<FogDensity, number> = {
  none: 0,
  light: 0.004,
  medium: 0.010,
  heavy: 0.020,
};

export function Scene({ scene }: { scene: SceneJson }) {
  const sun = scene.sunPosition ?? DEFAULT_SUN;
  const sunDistance = 100;
  const sunWorldPos: [number, number, number] = [
    sun[0] * sunDistance,
    sun[1] * sunDistance,
    sun[2] * sunDistance,
  ];

  const fogColor = scene.fogColor ?? "#b8d8f0";
  const fogDensityKey: FogDensity = scene.fogDensity ?? "light";
  const fogDensity = FOG_DENSITY_MAP[fogDensityKey];

  const useCustomSky = !!scene.skyColor;

  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.6, 12], fov: 70, near: 0.1, far: 500 }}
      style={{ width: "100vw", height: "100vh" }}
      gl={{
        // Disable tone mapping- by default R3F applies ACES tone mapping
        // which compresses highlights and washes out vivid TRELLIS textures.
        toneMapping: THREE.NoToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
    >
      {/* Sky and atmosphere */}
      {useCustomSky ? (
        <color attach="background" args={[scene.skyColor!]} />
      ) : (
        <Sky sunPosition={sunWorldPos} turbidity={8} rayleigh={2} />
      )}
      {fogDensity > 0 && (
        <fogExp2 attach="fog" args={[fogColor, fogDensity]} />
      )}

      {/* Lighting — bright daylight setup tuned for TRELLIS materials.
          Sun does most of the work; ambient fills shadows so dark sides of
          the model are still visible; back-fill prevents pitch-black backs. */}
      <ambientLight intensity={0.8} />
      <directionalLight
        position={sunWorldPos}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0005}
      />
      {/* Soft fill from opposite the sun so the back of the model isn't black */}
      <directionalLight
        position={[-sunWorldPos[0], sunWorldPos[1] * 0.5, -sunWorldPos[2]]}
        intensity={0.5}
      />

      <CollisionProvider>
        <SceneRenderer scene={scene} />
        <Controls scene={scene} />
      </CollisionProvider>
    </Canvas>
  );
}