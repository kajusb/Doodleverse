"use client";

import type { Terrain as TerrainType } from "@/types/scene";

const TERRAIN_COLORS: Record<TerrainType, string> = {
  grass: "#6aa84f",
  sand: "#e6c88a",
  snow: "#eaf4ff",
  stone: "#8a8a8a",
  dirt: "#8b6f47",
};

export function Terrain({
  terrain,
  size = 1000,
  color,
}: {
  terrain: TerrainType;
  size?: number;
  color?: string; // optional override from scene.groundColor
}) {
  // If the AI provided a specific ground color, use it. otherwise fall back
  // to the standard color for this terrain type.
  const finalColor = color ?? TERRAIN_COLORS[terrain];

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size, 1, 1]} />
      <meshStandardMaterial color={finalColor} />
    </mesh>
  );
}