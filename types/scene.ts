export type ObjectType =
  | "tree"
  | "house"
  | "rock"
  | "river"
  | "path"
  | "bridge"
  | "water";

export type Theme = "forest" | "desert" | "snow" | "meadow" | "fantasy";
export type Terrain = "grass" | "sand" | "snow" | "stone" | "dirt";

export interface SceneObject {
  type: ObjectType;
  x: number;
  z: number;
  y?: number;
  scale?: number;
  rotation?: number;
  width?: number;
  length?: number;
  description?: string;
  color?: string;
}

export interface SceneJson {
  name: string;
  theme: Theme;
  terrain: Terrain;
  objects: SceneObject[];
  size?: number;
}