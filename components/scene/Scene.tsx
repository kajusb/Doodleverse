"use client";

import { Canvas } from "@react-three/fiber";
import { Sky as DreiSky } from "@react-three/drei";
import * as THREE from "three";
import { Controls } from "./Controls";
import { SceneRenderer } from "./SceneRenderer";
import { GradientSky } from "./Sky";
import { Atmosphere } from "./Atmosphere";
import { classifyMood } from "@/lib/sceneAtmosphere";
import { CollisionProvider } from "@/lib/collisionRegistry";
import type { SceneJson, FogDensity } from "@/types/scene";

const DEFAULT_SUN: [number, number, number] = [0.3, 1, 0.3];

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
  const mood = classifyMood(scene);

  console.log("Scene mood:", mood);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.6, 12], fov: 70, near: 0.1, far: 500 }}
      style={{ width: "100vw", height: "100vh" }}
      gl={{
        toneMapping: THREE.NoToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
    >
      {/* Sky */}
      {useCustomSky ? (
        <GradientSky topColor={scene.skyColor!} />
      ) : (
        <DreiSky sunPosition={sunWorldPos} turbidity={8} rayleigh={2} />
      )}

      {/* Fog */}
      {fogDensity > 0 && (
        <fogExp2 attach="fog" args={[fogColor, fogDensity]} />
      )}

      {/* Atmospheric extras based on the scene's mood */}
      <Atmosphere mood={mood} />

      {/* Lighting */}
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