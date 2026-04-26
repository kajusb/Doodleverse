"use client";

import type { SceneJson } from "@/types/scene";
import { Terrain } from "@/components/scene/Terrain";
import { HeroAsset } from "@/components/objects/HeroAsset";

export const HERO_INDEX = -1;

export function SceneRenderer({ scene }: { scene: SceneJson }) {
  // Guard against old scenes that don't have an objects[] array
  const objects = scene.objects ?? [];

  return (
    <>
      <Terrain terrain={scene.terrain} size={1000} color={scene.groundColor} />

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
            scale: scene.heroScale ?? 1,
            glbUrl: scene.heroAssetUrl,
          }}
          index={HERO_INDEX}
        />
      )}

      {objects.map((obj, i) => {
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