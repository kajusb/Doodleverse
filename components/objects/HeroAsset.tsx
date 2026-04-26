"use client";

import { useRef, useEffect, useMemo, useState, Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import type { SceneObject } from "@/types/scene";
import { useCollider } from "@/lib/useCollider";
import { useSceneState } from "@/lib/sceneState";
import { ThreeEvent } from "@react-three/fiber";
import { ObjectArrows } from "@/components/editor/ObjectArrows";

interface Props {
  obj: SceneObject;
  url: string;
  index: number;
}

const TARGET_SIZE = 12;

export function HeroAsset({ obj, url, index }: Props) {
  return (
    <Suspense fallback={null}>
      <HeroAssetInner obj={obj} url={url} index={index} />
    </Suspense>
  );
}

interface FitTransform {
  scale: number;
  // World-meters dimensions of the model AFTER scaling
  worldSizeX: number;
  worldSizeY: number;
  worldSizeZ: number;
}

function HeroAssetInner({ obj, url, index }: Props) {
  const { scene: originalScene } = useGLTF(url);
  const { selectedObjectIndex, setSelectedObjectIndex } = useSceneState();

  // Clone AND immediately re-center the scene so its bounding box is at origin.
  // This eliminates any TRELLIS quirk where the model's geometry is offset
  // from its scene root (some models come back with center at (5.99, 0, 0)).
  const clonedScene = useMemo(() => {
    if (!originalScene) return null;
    const cloned = SkeletonUtils.clone(originalScene);
    // Compute the bounding box of the cloned scene's meshes
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    box.getCenter(center);
    // Shift each top-level child by -center so the whole model is centered at origin.
    // We shift CHILDREN (not the root) because the root needs to stay at (0,0,0)
    // for our outer group's position/scale to behave predictably.
    cloned.children.forEach((child) => {
      child.position.x -= center.x;
      // Move bottom of model to y=0 instead of centering Y (we want it on the ground)
      child.position.y -= box.min.y;
      child.position.z -= center.z;
    });
    cloned.updateMatrixWorld(true);
    return cloned;
  }, [originalScene]);

  const objY = obj.y ?? 0;
  const objType = obj.type;

  const [fit, setFit] = useState<FitTransform | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  useEffect(() => {
    if (!clonedScene) return;

    console.log("HeroAsset cloned scene (after recentering):", {
      url,
      childCount: clonedScene.children.length,
    });

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
        originalMaterials.current.set(child, child.material);
      }
    });

    // After re-centering, the bounding box is now centered horizontally and
    // sits on Y=0. Compute size for scaling.
    clonedScene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0 || !isFinite(maxDim)) return;

    const scale = TARGET_SIZE / maxDim;

    console.log("HeroAsset fit:", {
      url,
      size: size.toArray(),
      scale,
    });

    setFit({
      scale,
      worldSizeX: size.x * scale,
      worldSizeY: size.y * scale,
      worldSizeZ: size.z * scale,
    });
  }, [clonedScene, objType, objY, url]);

  // Apply green tint when hovering or selected
  useEffect(() => {
    if (!clonedScene) return;
    const isSelected = selectedObjectIndex === index;
    const showTint = isHovering || isSelected;

    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const original = originalMaterials.current.get(child);
      if (!original) return;

      if (showTint) {
        const orig = Array.isArray(original) ? original[0] : original;
        if (orig instanceof THREE.MeshStandardMaterial) {
          const tinted = orig.clone();
          tinted.emissive = new THREE.Color(isSelected ? "#22dd55" : "#88ff99");
          tinted.emissiveIntensity = isSelected ? 0.4 : 0.25;
          child.material = tinted;
        }
      } else {
        child.material = original;
      }
    });
  }, [clonedScene, isHovering, selectedObjectIndex, index]);

  const groupRef = useRef<THREE.Group>(null);
  useCollider(groupRef, "wall", [fit, obj.x, obj.y, obj.z, obj.rotation]);

  if (!clonedScene) return null;

  const userScale = obj.scale ?? 1;
  const isSelected = selectedObjectIndex === index;

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelectedObjectIndex(index);
    window.dispatchEvent(new CustomEvent("doodleverse:object-clicked"));
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovering(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = () => {
    setIsHovering(false);
    document.body.style.cursor = "";
  };

  // The arrows pivot around the model's center. Since we re-centered the
  // mesh at origin (and base at y=0), the center is at (0, halfHeight, 0)
  // in LOCAL units (inside the inner scaled group).
  const arrowsFit = fit ? {
    scale: fit.scale,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    worldSizeX: fit.worldSizeX,
    worldSizeY: fit.worldSizeY,
    worldSizeZ: fit.worldSizeZ,
    localCenterX: 0,
    localCenterY: (fit.worldSizeY * 0.5) / fit.scale,
    localCenterZ: 0,
  } : null;

  return (
    <group
      ref={groupRef}
      position={[obj.x, obj.y ?? 0, obj.z]}
      rotation={[0, obj.rotation ?? 0, 0]}
      scale={userScale}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <group scale={fit?.scale ?? 1}>
        <primitive object={clonedScene} />

        {arrowsFit && isSelected && <ObjectArrows fit={arrowsFit} index={index} />}
      </group>
    </group>
  );
}