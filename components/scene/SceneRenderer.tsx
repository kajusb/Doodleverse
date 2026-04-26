"use client";

import type { SceneJson, SceneObject } from "@/types/scene";
import { Tree } from "@/components/objects/Tree";
import { House } from "@/components/objects/House";
import { Rock } from "@/components/objects/Rock";
import { River } from "@/components/objects/River";
import { Path } from "@/components/objects/Path";
import { Bridge } from "@/components/objects/Bridge";
import { Water } from "@/components/objects/Water";
import { Terrain } from "@/components/scene/Terrain";
import { HeroAsset } from "@/components/objects/HeroAsset";

// TEMP: while testing TRELLIS, set this to true to skip rendering primitives
// and only show the terrain + the AI-generated hero asset.
const HERO_ONLY_DEBUG = true;

function renderObject(obj: SceneObject, key: number) {
  switch (obj.type) {
    case "tree": return <Tree key={key} obj={obj} />;
    case "house": return <House key={key} obj={obj} />;
    case "rock": return <Rock key={key} obj={obj} />;
    case "river": return <River key={key} obj={obj} />;
    case "path": return <Path key={key} obj={obj} />;
    case "bridge": return <Bridge key={key} obj={obj} />;
    case "water": return <Water key={key} obj={obj} />;
    default:
      console.warn("Unknown object type:", obj);
      return null;
  }
}

function pickHeroIndex(objs: SceneObject[]): number {
  const isLinework = (t: SceneObject["type"]) =>
    t === "river" || t === "path";

  let best = -1;
  let bestDist = Infinity;
  objs.forEach((o, i) => {
    if (isLinework(o.type)) return;
    const d = Math.hypot(o.x, o.z);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  if (best !== -1) return best;

  bestDist = Infinity;
  objs.forEach((o, i) => {
    const d = Math.hypot(o.x, o.z);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

export function SceneRenderer({ scene }: { scene: SceneJson }) {
  const heroIdx = scene.heroAssetUrl ? pickHeroIndex(scene.objects) : -1;

  // === LOUD DEBUG LOGGING ===
  console.log("=== SceneRenderer ===");
  console.log("HERO_ONLY_DEBUG:", HERO_ONLY_DEBUG);
  console.log("scene.heroAssetUrl:", scene.heroAssetUrl);
  console.log("scene.objects.length:", scene.objects.length);
  console.log("heroIdx:", heroIdx);
  console.log("hero object:", heroIdx !== -1 ? scene.objects[heroIdx] : "NONE");
  console.log("scene.terrain:", scene.terrain);
  console.log("scene.groundColor:", scene.groundColor);
  // ==========================

  if (HERO_ONLY_DEBUG) {
    const heroObj = heroIdx !== -1 ? scene.objects[heroIdx] : null;
    return (
      <>
        <Terrain terrain={scene.terrain} size={1000} color={scene.groundColor} />
        {heroObj && scene.heroAssetUrl && (
          <HeroAsset obj={heroObj} url={scene.heroAssetUrl} />
        )}
      </>
    );
  }

  return (
    <>
      <Terrain terrain={scene.terrain} size={1000} color={scene.groundColor} />
      {scene.objects.map((obj, i) => {
        if (i === heroIdx && scene.heroAssetUrl) {
          return <HeroAsset key={i} obj={obj} url={scene.heroAssetUrl} />;
        }
        return renderObject(obj, i);
      })}
    </>
  );
}