"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Terrain as TerrainType } from "@/types/scene";

interface Props {
  terrain: TerrainType;
  size: number;
  color?: string;
}

// Default colors by terrain type (used when no custom color provided)
const TERRAIN_DEFAULTS: Record<TerrainType, string> = {
  grass: "#6aa84f",
  sand: "#d4a874",
  snow: "#f5f5f8",
  stone: "#888888",
  dirt: "#8a5a3a",
};

export function Terrain({ terrain, size, color }: Props) {
  const baseColor = color ?? TERRAIN_DEFAULTS[terrain];

  // Procedural shader gives the ground subtle color variation and texture
  // instead of a flat solid plane. Uses world-space noise so the pattern
  // doesn't repeat visibly.
  const material = useMemo(() => {
    const base = new THREE.Color(baseColor);
    // Slight darker variation for the noise dips
    const dark = base.clone().multiplyScalar(0.75);
    // Slight lighter variation for the noise peaks
    const light = base.clone().lerp(new THREE.Color("#ffffff"), 0.15);

    return new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: base },
        darkColor: { value: dark },
        lightColor: { value: light },
        scale: { value: 8.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 darkColor;
        uniform vec3 lightColor;
        uniform float scale;
        varying vec3 vWorldPosition;

        // Simple 2D noise function (hash-based, fast)
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        // Multi-octave noise for more natural variation
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = vWorldPosition.xz / scale;
          float n = fbm(uv);

          // Mix between dark/base/light based on noise value
          vec3 col;
          if (n < 0.4) {
            col = mix(darkColor, baseColor, n / 0.4);
          } else {
            col = mix(baseColor, lightColor, (n - 0.4) / 0.6);
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [baseColor]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}