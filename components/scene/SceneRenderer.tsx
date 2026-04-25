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

export function SceneRenderer({ scene }: { scene: SceneJson }) {
  return (
    <>
      <Terrain terrain={scene.terrain} size={scene.size ?? 40} />
      {scene.objects.map((obj, i) => renderObject(obj, i))}
    </>
  );
}