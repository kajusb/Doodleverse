"use client";

import type { SceneJson } from "@/types/scene";
import { Terrain } from "@/components/scene/Terrain";
import { HeroAsset } from "@/components/objects/HeroAsset";

export function SceneRenderer({ scene }: { scene: SceneJson }) {
  if (scene.heroAssetUrl) {
    // Use heroX/heroZ/heroRotation from scene state, default to origin
    const heroObj = {
      type: "house" as const,
      x: scene.heroX ?? 0,
      z: scene.heroZ ?? 0,
      rotation: scene.heroRotation ?? 0,
      glbUrl: scene.heroAssetUrl,
    };
    return (
      <>
        <Terrain terrain={scene.terrain} size={1000} color={scene.groundColor} />
        <HeroAsset url={scene.heroAssetUrl} obj={heroObj} index={0} />
      </>
    );
  }

  return (
    <>
      <Terrain terrain={scene.terrain} size={1000} color={scene.groundColor} />
      {scene.objects.map((obj, i) => {
        if (!obj.glbUrl) return null;
        return <HeroAsset key={i} obj={obj} url={obj.glbUrl} index={i} />;
      })}
    </>
  );
}