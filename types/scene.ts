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
}

export interface SceneJson {
  name: string;
  theme: Theme;
  terrain: Terrain;
  objects: SceneObject[];
  size?: number;
  music?: string;
  // Atmosphere overrides — Gemma sets these based on the sketch's mood.
  // Hex colors (e.g. "#87ceeb"). If absent, defaults are used per theme.
  skyColor?: string;
  groundColor?: string;
  fogColor?: string;
  fogDensity?: FogDensity;
  // Sun direction — controls lighting mood. Gemma can pick high noon vs sunset.
  // Values roughly [-1..1, 0..1, -1..1]. Defaults to overhead if absent.
  sunPosition?: [number, number, number];
  // URL of an AI-generated 3D model that replaces the central object in the scene
  heroAssetUrl?: string;
}