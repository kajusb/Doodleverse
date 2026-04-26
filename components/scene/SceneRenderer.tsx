"use client";

import type { SceneJson } from "@/types/scene";
import { Terrain } from "@/components/scene/Terrain";
import { HeroAsset } from "@/components/objects/HeroAsset";

// Special index for the legacy single hero asset (scene.heroAssetUrl).
// Use -1 so it doesn't collide with scene.objects[] indices (which start at 0).
export const HERO_INDEX = -1;

export function SceneRenderer({ scene }: { scene: SceneJson }) {
  return (
    <>
      <Terrain terrain={scene.terrain} size={1000} color={scene.groundColor} />

      {/* The original hero asset (if present) — uses index = -1 as a sentinel */}
      {scene.heroAssetUrl && (
        <HeroAsset
          key={scene.heroAssetUrl}
          url={scene.heroAssetUrl}
          obj={{
            type: "house",
            x: scene.heroX ?? 0,
            y: scene.heroY ?? 0,
            z: scene.heroZ ?? 0,
            rotation: scene.heroRotation ?? 0,
            glbUrl: scene.heroAssetUrl,
          }}
          index={HERO_INDEX}
        />
      )}

      {/* Additional objects added via "Add to world" flow */}
      {scene.objects.map((obj, i) => {
        if (!obj.glbUrl) return null;
        return (
          <HeroAsset
            key={`obj-${i}-${obj.glbUrl}`}
            obj={obj}
            url={obj.glbUrl}
            index={i}
          />
        );
      })}
    </>
  );
}