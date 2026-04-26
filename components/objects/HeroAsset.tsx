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
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  // Real model dimensions in WORLD-SPACE meters (after fit.scale applied)
  worldSizeX: number;
  worldSizeY: number;
  worldSizeZ: number;
  // Center of the model in LOCAL coords (inside the inner scaled group),
  // relative to the inner group's origin.
  localCenterX: number;
  localCenterY: number;
  localCenterZ: number;
}

function HeroAssetInner({ obj, url, index }: Props) {
  const { scene: originalScene } = useGLTF(url);
  const { selectedObjectIndex, setSelectedObjectIndex } = useSceneState();

  const clonedScene = useMemo(() => {
    if (!originalScene) return null;
    return SkeletonUtils.clone(originalScene);
  }, [originalScene]);

  const objY = obj.y ?? 0;
  const objType = obj.type;

  const [fit, setFit] = useState<FitTransform | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  useEffect(() => {
    if (!clonedScene) return;

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

    const box = computeMeshOnlyBox(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0 || !isFinite(maxDim)) return;

    const scale = TARGET_SIZE / maxDim;

    const center = new THREE.Vector3();
    box.getCenter(center);
    const offsetX = -center.x * scale;
    const offsetZ = -center.z * scale;

    const isFloating = objY > 0;
    const offsetY = isFloating
      ? -center.y * scale
      : -box.min.y * scale - 0.05;

    setFit({
      scale,
      offsetX,
      offsetY,
      offsetZ,
      worldSizeX: size.x * scale,
      worldSizeY: size.y * scale,
      worldSizeZ: size.z * scale,
      localCenterX: center.x,
      localCenterY: center.y,
      localCenterZ: center.z,
    });
  }, [clonedScene, objType, objY]);

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
  // Re-measure collision box when fit OR position OR rotation changes,
  // so the collider always matches where the object currently is in the world.
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
      <group
        position={fit ? [fit.offsetX, fit.offsetY, fit.offsetZ] : [0, 0, 0]}
        scale={fit?.scale ?? 1}
      >
        <primitive object={clonedScene} />

        {fit && isSelected && <ObjectArrows fit={fit} index={index} />}
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