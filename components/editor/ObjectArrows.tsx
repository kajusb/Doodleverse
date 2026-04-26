"use client";

import { useEffect, useRef, useState } from "react";
import { useCursor } from "@react-three/drei";
import { ThreeEvent, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneState } from "@/lib/sceneState";

interface FitTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  worldSizeX: number;
  worldSizeY: number;
  worldSizeZ: number;
  localCenterX: number;
  localCenterY: number;
  localCenterZ: number;
}

interface Props {
  fit: FitTransform;
  index: number;
}

const ROTATE_STEP = Math.PI / 4;
const Y_DRAG_SENSITIVITY = 0.05;

type Axis = "x" | "y" | "z";

const AXIS_COLORS: Record<Axis, string> = {
  x: "#ff3344",
  y: "#33dd55",
  z: "#3388ff",
};

interface DragState {
  axis: Axis;
  // World-space direction the object should move when this axis is dragged
  // (this is the OBJECT's local axis, transformed to world space — accounts
  //  for the object's current rotation)
  worldAxisDir: THREE.Vector3;
  axisOrigin: THREE.Vector3;
  startProjection: number;
  startScreenY: number;
  startValueX: number;
  startValueY: number;
  startValueZ: number;
  hasMoved: boolean;
}

export function ObjectArrows({ fit, index }: Props) {
  const { camera, gl } = useThree();
  const { scene, updateObject, updateScene, setSelectedObjectIndex } = useSceneState();
  const isSingleHero = index === -1 && !!scene.heroAssetUrl;

  const dragState = useRef<DragState | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useCursor(hoveredKey !== null);

  // Refs that always point to the latest values, so window listeners
  // can read fresh state without being re-registered on every render
  const sceneRef = useRef(scene);
  const isSingleHeroRef = useRef(isSingleHero);
  const indexRef = useRef(index);
  const updateObjectRef = useRef(updateObject);
  const updateSceneRef = useRef(updateScene);
  const setSelectedObjectIndexRef = useRef(setSelectedObjectIndex);

  useEffect(() => {
    sceneRef.current = scene;
    isSingleHeroRef.current = isSingleHero;
    indexRef.current = index;
    updateObjectRef.current = updateObject;
    updateSceneRef.current = updateScene;
    setSelectedObjectIndexRef.current = setSelectedObjectIndex;
  });

  const getCurrent = () => {
    const s = sceneRef.current;
    if (isSingleHeroRef.current) {
      return {
        x: s.heroX ?? 0,
        z: s.heroZ ?? 0,
        y: s.heroY ?? 0,
        rotation: s.heroRotation ?? 0,
      };
    }
    const obj = s.objects[indexRef.current];
    return {
      x: obj?.x ?? 0,
      z: obj?.z ?? 0,
      y: obj?.y ?? 0,
      rotation: obj?.rotation ?? 0,
    };
  };

  const apply = (updates: Partial<{ x: number; y: number; z: number; rotation: number }>) => {
    if (isSingleHeroRef.current) {
      updateSceneRef.current({
        ...(updates.x !== undefined ? { heroX: updates.x } : {}),
        ...(updates.y !== undefined ? { heroY: updates.y } : {}),
        ...(updates.z !== undefined ? { heroZ: updates.z } : {}),
        ...(updates.rotation !== undefined ? { heroRotation: updates.rotation } : {}),
      });
    } else {
      updateObjectRef.current(indexRef.current, updates);
    }
  };

  // Project mouse onto a horizontal axis line (whose direction is `worldAxisDir`)
  // using a plane that contains the line and is most facing the camera.
  const projectMouseOntoAxisLine = (
    mouse: THREE.Vector2,
    axisOrigin: THREE.Vector3,
    worldAxisDir: THREE.Vector3,
  ): number => {
    const axisDir = worldAxisDir.clone().normalize();
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    let planeNormal = new THREE.Vector3()
      .crossVectors(axisDir, new THREE.Vector3().crossVectors(camDir, axisDir))
      .normalize();
    if (!isFinite(planeNormal.x) || planeNormal.lengthSq() < 0.001) {
      planeNormal = new THREE.Vector3(0, 1, 0);
    }
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, axisOrigin);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, hit)) return 0;

    const offset = new THREE.Vector3().subVectors(hit, axisOrigin);
    return offset.dot(axisDir);
  };

  const startDrag = (axis: Axis, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    const cur = getCurrent();
    const axisOrigin = new THREE.Vector3(cur.x, cur.y, cur.z);

    // Compute the WORLD direction the object should move when this axis arrow
    // is dragged. We rotate the local axis by the object's Y rotation so that
    // dragging the "X" arrow (red) moves along the OBJECT's right side, even
    // if the object is rotated.
    let worldAxisDir: THREE.Vector3;
    if (axis === "y") {
      worldAxisDir = new THREE.Vector3(0, 1, 0); // Y is always world-up
    } else if (axis === "x") {
      worldAxisDir = new THREE.Vector3(1, 0, 0).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        cur.rotation
      );
    } else {
      worldAxisDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        cur.rotation
      );
    }

    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const tempState: DragState = {
      axis,
      worldAxisDir,
      axisOrigin,
      startProjection: 0,
      startScreenY: e.clientY,
      startValueX: cur.x,
      startValueY: cur.y,
      startValueZ: cur.z,
      hasMoved: false,
    };

    if (axis !== "y") {
      tempState.startProjection = projectMouseOntoAxisLine(mouse, axisOrigin, worldAxisDir);
    }

    dragState.current = tempState;
    window.dispatchEvent(new CustomEvent("doodleverse:drag-start"));
  };

  // Register window listeners ONCE on mount.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragState.current) return;
      const state = dragState.current;

      let delta = 0;

      if (state.axis === "y") {
        const screenDeltaY = e.clientY - state.startScreenY;
        delta = -screenDeltaY * Y_DRAG_SENSITIVITY;
      } else {
        const rect = gl.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        const projection = projectMouseOntoAxisLine(mouse, state.axisOrigin, state.worldAxisDir);
        delta = projection - state.startProjection;
      }

      if (Math.abs(delta) > 0.01) state.hasMoved = true;

      // For Y axis, just clamp and apply.
      // For X/Z: move the object along its WORLD-space axis direction
      // (which already accounts for rotation), so dragging X arrow always
      // moves toward where that arrow is visually pointing.
      if (state.axis === "y") {
        const newY = Math.max(0, state.startValueY + delta);
        apply({ y: newY });
      } else {
        // Move startValue + (delta along worldAxisDir)
        const moveVec = state.worldAxisDir.clone().multiplyScalar(delta);
        const newX = state.startValueX + moveVec.x;
        const newZ = state.startValueZ + moveVec.z;
        apply({ x: newX, z: newZ });
      }
    };

    const onUp = () => {
      if (dragState.current?.hasMoved) {
        window.dispatchEvent(new CustomEvent("doodleverse:drag-end"));
      }
      dragState.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      if (e.code === "KeyR") {
        const cur = getCurrent();
        apply({ rotation: cur.rotation + ROTATE_STEP });
      } else if (e.code === "Escape") {
        setSelectedObjectIndexRef.current(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Half-extents in LOCAL units
  const halfX = fit.worldSizeX * 0.5 / fit.scale;
  const halfY = fit.worldSizeY * 0.5 / fit.scale;
  const halfZ = fit.worldSizeZ * 0.5 / fit.scale;

  const SHAFT_LEN = 3 / fit.scale;
  const SHAFT_RADIUS = 0.1 / fit.scale;
  const TIP_LEN = 1.0 / fit.scale;
  const TIP_RADIUS = 0.35 / fit.scale;
  const padding = 0.5 / fit.scale;

  return (
    <group position={[fit.localCenterX, fit.localCenterY, fit.localCenterZ]}>
      {/* X (red) — left and right */}
      <PositionedArrow
        color={AXIS_COLORS.x}
        basePos={[halfX + padding, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        shaftLen={SHAFT_LEN}
        shaftRadius={SHAFT_RADIUS}
        tipLen={TIP_LEN}
        tipRadius={TIP_RADIUS}
        hovered={hoveredKey === "x+"}
        onPointerDown={(e) => startDrag("x", e)}
        onPointerOver={() => setHoveredKey("x+")}
        onPointerOut={() => setHoveredKey(null)}
      />
      <PositionedArrow
        color={AXIS_COLORS.x}
        basePos={[-halfX - padding, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        shaftLen={SHAFT_LEN}
        shaftRadius={SHAFT_RADIUS}
        tipLen={TIP_LEN}
        tipRadius={TIP_RADIUS}
        hovered={hoveredKey === "x-"}
        onPointerDown={(e) => startDrag("x", e)}
        onPointerOver={() => setHoveredKey("x-")}
        onPointerOut={() => setHoveredKey(null)}
      />

      {/* Y (green) — up and down */}
      <PositionedArrow
        color={AXIS_COLORS.y}
        basePos={[0, halfY + padding, 0]}
        rotation={[0, 0, 0]}
        shaftLen={SHAFT_LEN}
        shaftRadius={SHAFT_RADIUS}
        tipLen={TIP_LEN}
        tipRadius={TIP_RADIUS}
        hovered={hoveredKey === "y+"}
        onPointerDown={(e) => startDrag("y", e)}
        onPointerOver={() => setHoveredKey("y+")}
        onPointerOut={() => setHoveredKey(null)}
      />
      <PositionedArrow
        color={AXIS_COLORS.y}
        basePos={[0, -halfY - padding, 0]}
        rotation={[Math.PI, 0, 0]}
        shaftLen={SHAFT_LEN}
        shaftRadius={SHAFT_RADIUS}
        tipLen={TIP_LEN}
        tipRadius={TIP_RADIUS}
        hovered={hoveredKey === "y-"}
        onPointerDown={(e) => startDrag("y", e)}
        onPointerOver={() => setHoveredKey("y-")}
        onPointerOut={() => setHoveredKey(null)}
      />

      {/* Z (blue) — forward and back */}
      <PositionedArrow
        color={AXIS_COLORS.z}
        basePos={[0, 0, halfZ + padding]}
        rotation={[Math.PI / 2, 0, 0]}
        shaftLen={SHAFT_LEN}
        shaftRadius={SHAFT_RADIUS}
        tipLen={TIP_LEN}
        tipRadius={TIP_RADIUS}
        hovered={hoveredKey === "z+"}
        onPointerDown={(e) => startDrag("z", e)}
        onPointerOver={() => setHoveredKey("z+")}
        onPointerOut={() => setHoveredKey(null)}
      />
      <PositionedArrow
        color={AXIS_COLORS.z}
        basePos={[0, 0, -halfZ - padding]}
        rotation={[-Math.PI / 2, 0, 0]}
        shaftLen={SHAFT_LEN}
        shaftRadius={SHAFT_RADIUS}
        tipLen={TIP_LEN}
        tipRadius={TIP_RADIUS}
        hovered={hoveredKey === "z-"}
        onPointerDown={(e) => startDrag("z", e)}
        onPointerOver={() => setHoveredKey("z-")}
        onPointerOut={() => setHoveredKey(null)}
      />
    </group>
  );
}

function PositionedArrow({
  color,
  basePos,
  rotation,
  shaftLen,
  shaftRadius,
  tipLen,
  tipRadius,
  hovered,
  onPointerDown,
  onPointerOver,
  onPointerOut,
}: {
  color: string;
  basePos: [number, number, number];
  rotation: [number, number, number];
  shaftLen: number;
  shaftRadius: number;
  tipLen: number;
  tipRadius: number;
  hovered: boolean;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) {
  const displayColor = hovered ? "#ffffff" : color;
  const emissiveIntensity = hovered ? 0.6 : 0.25;

  return (
    <group
      position={basePos}
      rotation={rotation}
      onPointerDown={onPointerDown}
      onPointerOver={(e) => { e.stopPropagation(); onPointerOver(); }}
      onPointerOut={(e) => { e.stopPropagation(); onPointerOut(); }}
    >
      <mesh position={[0, shaftLen / 2, 0]}>
        <cylinderGeometry args={[shaftRadius, shaftRadius, shaftLen, 16]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          metalness={0.3}
          roughness={0.4}
          depthTest={false}
        />
      </mesh>

      <mesh position={[0, shaftLen + tipLen / 2, 0]}>
        <coneGeometry args={[tipRadius, tipLen, 24]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          metalness={0.3}
          roughness={0.4}
          depthTest={false}
        />
      </mesh>

      <mesh position={[0, (shaftLen + tipLen) / 2, 0]}>
        <cylinderGeometry args={[tipRadius * 1.4, tipRadius * 1.4, shaftLen + tipLen, 12]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}