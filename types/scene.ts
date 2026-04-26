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
export type FogDensity = "none" | "light" | "medium" | "heavy";

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
  glbUrl?: string;
}

export interface SceneJson {
  name: string;
  theme: Theme;
  terrain: Terrain;
  objects: SceneObject[];
  size?: number;
  music?: string;
  // The legacy single hero asset
  heroAssetUrl?: string;
  heroX?: number;
  heroY?: number;
  heroZ?: number;
  heroRotation?: number;
  heroScale?: number;
  // Atmosphere
  skyColor?: string;
  groundColor?: string;
  fogColor?: string;
  fogDensity?: FogDensity;
  sunPosition?: [number, number, number];
}