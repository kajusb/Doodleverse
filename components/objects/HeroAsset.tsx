"use client";

import { useRef, useEffect, useMemo, useState, Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { useCollider } from "@/lib/useCollider";

interface Props {
  url: string;
}

// Each model gets sized so its LARGEST dimension is this many meters.
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

    // Enable shadows AND tweak materials so TRELLIS's dark PBR surfaces
    // respond well to scene lights. Lower roughness = brighter highlights.
    // Kill metalness — it looks bad without an environment map and reads
    // as dark/black surfaces.
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mat = child.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.roughness = Math.min(mat.roughness, 0.7);
          mat.metalness = 0;
          mat.needsUpdate = true;
        }
      }
    });

    // Compute tight bounding box from VISIBLE meshes only.
    // TRELLIS sometimes outputs invisible helper geometry that throws off
    // the regular Box3 calculation, making the model appear to float.
    const box = computeMeshOnlyBox(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0 || !isFinite(maxDim)) {
      console.warn("HeroAsset: invalid bounding box");
      return;
    }

    // Scale so the largest dimension matches TARGET_SIZE
    const scale = TARGET_SIZE / maxDim;

    // Recenter horizontally so the model sits at world origin
    const center = new THREE.Vector3();
    box.getCenter(center);
    const offsetX = -center.x * scale;
    const offsetZ = -center.z * scale;

    // Snap base to y=0 so the model rests on the ground.
    // Tiny -0.05 nudge buries the base slightly to hide any seam.
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
  // Collider re-measures whenever fit changes so collisions match the
  // actual scaled/positioned model, not the raw GLB at origin.
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

// Compute a bounding box from VISIBLE meshes only, ignoring empty groups,
// helpers, lights, cameras. Gives a much tighter and more accurate fit
// than Box3.setFromObject() which includes everything in the hierarchy.
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