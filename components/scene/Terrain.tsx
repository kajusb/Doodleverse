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
  size = 40,
}: {
  terrain: TerrainType;
  size?: number;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size, 1, 1]} />
      <meshStandardMaterial color={TERRAIN_COLORS[terrain]} />
    </mesh>
  );
}