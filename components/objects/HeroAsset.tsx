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
  worldSizeX: number;
  worldSizeY: number;
  worldSizeZ: number;
}

function HeroAssetInner({ obj, url, index }: Props) {
  const { scene: originalScene } = useGLTF(url);
  const { selectedObjectIndex, setSelectedObjectIndex } = useSceneState();

  // Clone scene + clone materials so this instance is independent.
  const { clonedScene, baseSize } = useMemo(() => {
    if (!originalScene) return { clonedScene: null, baseSize: null };

    const cloned = SkeletonUtils.clone(originalScene);

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => m.clone());
        } else if (child.material) {
          child.material = child.material.clone();
        }
      }
    });

    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    box.getCenter(center);

    cloned.children.forEach((child) => {
      child.position.x -= center.x;
      child.position.y -= box.min.y;
      child.position.z -= center.z;
    });
    cloned.updateMatrixWorld(true);

    const sizeBox = new THREE.Box3().setFromObject(cloned);
    const sz = new THREE.Vector3();
    sizeBox.getSize(sz);

    return { clonedScene: cloned, baseSize: sz };
  }, [originalScene]);

  const [fit, setFit] = useState<FitTransform | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  // One-time setup: shadows, material props
  useEffect(() => {
    if (!clonedScene || !baseSize) return;

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.roughness = Math.min(mat.roughness, 0.7);
            mat.metalness = 0;
            mat.needsUpdate = true;
          }
        }
      }
    });

    const maxDim = Math.max(baseSize.x, baseSize.y, baseSize.z);
    if (maxDim === 0 || !isFinite(maxDim)) return;

    const scale = TARGET_SIZE / maxDim;

    setFit({
      scale,
      worldSizeX: baseSize.x * scale,
      worldSizeY: baseSize.y * scale,
      worldSizeZ: baseSize.z * scale,
    });
  }, [clonedScene, baseSize]);

  // Apply hover/select tint by directly modifying emissive on each material.
  // No swapping, no cloning at runtime — just set/clear emissive in place.
  useEffect(() => {
    if (!clonedScene) return;
    const isSelected = selectedObjectIndex === index;
    const showTint = isHovering || isSelected;

    const tintColor = isSelected ? new THREE.Color("#22dd55") : new THREE.Color("#88ff99");
    const tintIntensity = isSelected ? 0.4 : 0.25;
    const blackColor = new THREE.Color(0, 0, 0);

    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (showTint) {
            mat.emissive.copy(tintColor);
            mat.emissiveIntensity = tintIntensity;
          } else {
            mat.emissive.copy(blackColor);
            mat.emissiveIntensity = 0;
          }
          mat.needsUpdate = true;
        }
      }
    });
  }, [clonedScene, isHovering, selectedObjectIndex, index]);

  const groupRef = useRef<THREE.Group>(null);
  useCollider(groupRef, "wall", [fit, obj.x, obj.y, obj.z, obj.rotation, obj.scale]);

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