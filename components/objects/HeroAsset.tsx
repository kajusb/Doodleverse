"use client";

import { useRef, useEffect, useMemo, useState, Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { useCollider } from "@/lib/useCollider";

interface Props {
  url: string;
}

const TARGET_SIZE = 12;

export function HeroAsset({ url }: Props) {
  return (
    <Suspense fallback={null}>
      <HeroAssetInner url={url} />
    </Suspense>
  );
}

interface FitTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
}

function HeroAssetInner({ url }: Props) {
  const { scene: originalScene } = useGLTF(url);

  const clonedScene = useMemo(() => {
    if (!originalScene) return null;
    return SkeletonUtils.clone(originalScene);
  }, [originalScene]);

  const [fit, setFit] = useState<FitTransform | null>(null);

  useEffect(() => {
    if (!clonedScene) return;

    // Tweak materials so TRELLIS's PBR surfaces respond well to scene lights.
    // Lower roughness = brighter highlights. Kill metalness (looks bad without
    // an environment map). NO emissive — that flattens colors.
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mat = child.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.roughness = Math.min(mat.roughness, 0.8);
          mat.metalness = 0;
          mat.needsUpdate = true;
        }
      }
    });

    // Compute tight bounding box from VISIBLE meshes only
    const box = computeMeshOnlyBox(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0 || !isFinite(maxDim)) {
      console.warn("HeroAsset: invalid bounding box");
      return;
    }

    const scale = TARGET_SIZE / maxDim;

    const center = new THREE.Vector3();
    box.getCenter(center);
    const offsetX = -center.x * scale;
    const offsetZ = -center.z * scale;
    const offsetY = -box.min.y * scale - 0.05;

    console.log("HeroAsset fit:", {
      originalSize: [size.x, size.y, size.z],
      maxDim,
      scale,
      offsetY,
    });

    setFit({ scale, offsetX, offsetY, offsetZ });
  }, [clonedScene]);

  const groupRef = useRef<THREE.Group>(null);
  useCollider(groupRef, "wall", [fit]);

  if (!clonedScene) return null;

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <group
        position={fit ? [fit.offsetX, fit.offsetY, fit.offsetZ] : [0, 0, 0]}
        scale={fit?.scale ?? 1}
      >
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

function computeMeshOnlyBox(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  let foundMesh = false;

  root.updateWorldMatrix(true, true);

  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const meshBox = new THREE.Box3().setFromObject(child);
      if (foundMesh) {
        box.union(meshBox);
      } else {
        box.copy(meshBox);
        foundMesh = true;
      }
    }
  });

  if (!foundMesh) {
    box.setFromObject(root);
  }

  return box;
}