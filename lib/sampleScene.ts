import type { SceneJson } from "@/types/scene";

/* Sample Scene */
export const sampleScene: SceneJson = {
  name: "Forest Cabin",
  theme: "forest",
  terrain: "grass",
  size: 40,
  objects: [
    { type: "house", x: 0, z: 0, scale: 1.5 },
    { type: "tree", x: -4, z: 2, scale: 1 },
    { type: "tree", x: 3, z: -2, scale: 1 },
    { type: "tree", x: -7, z: -5, scale: 1.2 },
    { type: "tree", x: 6, z: 5, scale: 0.9 },
    { type: "tree", x: -9, z: 6, scale: 1.1 },
    { type: "rock", x: 2, z: 3, scale: 0.8 },
    { type: "rock", x: -2, z: 4, scale: 0.5 },
    { type: "rock", x: 5, z: -6, scale: 1 },
    { type: "river", x: -1, z: -8, width: 3, length: 20 },
    { type: "bridge", x: -1, z: -8, scale: 1 },
    { type: "path", x: 0, z: 3, width: 1.5, length: 8 },
  ],
};