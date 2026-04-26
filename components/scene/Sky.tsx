"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface Props {
  topColor: string;
  bottomColor?: string;
}

export function GradientSky({ topColor, bottomColor }: Props) {
  const material = useMemo(() => {
    const top = new THREE.Color(topColor);
    // If no bottom color provided, derive a lighter horizon from the top
    const bottom = bottomColor
      ? new THREE.Color(bottomColor)
      : top.clone().lerp(new THREE.Color("#ffffff"), 0.4);

    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: top },
        bottomColor: { value: bottom },
        offset: { value: 33 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
    });
  }, [topColor, bottomColor]);

  return (
    <mesh>
      <sphereGeometry args={[400, 32, 15]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}