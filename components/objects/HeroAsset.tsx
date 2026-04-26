"use client";

import { useRef, useEffect, useMemo, useState, Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import type { SceneObject } from "@/types/scene";
import { useCollider } from "@/lib/useCollider";

interface Props {
  obj: SceneObject;
  url: string;
}

export function HeroAsset({ obj, url }: Props) {
  return (
    <Suspense fallback={null}>
      <HeroAssetInner obj={obj} url={url} />
    </Suspense>
  );
}

interface FitTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
}

function HeroAssetInner({ obj, url }: Props) {
  const { scene: originalScene } = useGLTF(url);

  // Clone the cached scene so we have our own instance.
  const clonedScene = useMemo(() => {
    if (!originalScene) return null;
    return SkeletonUtils.clone(originalScene);
  }, [originalScene]);

  // Compute auto-fit transform once when the clone is ready. We apply this to
  // a wrapper <group> rather than mutating the scene directly — this keeps
  // React Compiler happy and is a cleaner pattern anyway.
  const [fit, setFit] = useState<FitTransform | null>(null);

  useEffect(() => {
    if (!clonedScene) return;

    // Enable shadows on every mesh inside the GLB. This is OK to do here
    // because castShadow/receiveShadow are runtime-only flags, not part of
    // React's tracked state.
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material instanceof THREE.Material) {
          child.material.precision = "lowp";
        }
      }
    });

    // Measure to compute auto-fit
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0 || !isFinite(maxDim)) {
      console.warn("HeroAsset: invalid bounding box");
      return;
    }

    // Scale so model is ~2.5m tall (roughly the size of a primitive house)
    const targetHeight = 2.5;
    const scale = size.y > 0 ? targetHeight / size.y : 1;

    // After scaling, recenter horizontally and rest on the ground (y=0)
    const center = new THREE.Vector3();
    box.getCenter(center);
    const offsetX = -center.x * scale;
    const offsetZ = -center.z * scale;
    const offsetY = -box.min.y * scale;

    setFit({ scale, offsetX, offsetY, offsetZ });
  }, [clonedScene]);

  const groupRef = useRef<THREE.Group>(null);
  useCollider(groupRef, "wall");

  if (!clonedScene) return null;

  const userScale = obj.scale ?? 1;

  return (
    <group
      ref={groupRef}
      position={[obj.x, obj.y ?? 0, obj.z]}
      rotation={[0, obj.rotation ?? 0, 0]}
      scale={userScale}
    >
      {/* Inner group applies the auto-fit transform without touching the cached scene */}
      <group
        position={fit ? [fit.offsetX, fit.offsetY, fit.offsetZ] : [0, 0, 0]}
        scale={fit?.scale ?? 1}
      >
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}