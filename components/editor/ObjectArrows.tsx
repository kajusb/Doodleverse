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
}

interface Props {
  fit: FitTransform;
  index: number;
}

const ROTATE_STEP = Math.PI / 4;

type Axis = "x" | "y" | "z";

const AXIS_COLORS: Record<Axis, string> = {
  x: "#ff3344",
  y: "#33dd55",
  z: "#3388ff",
};

const AXIS_VECTORS: Record<Axis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

interface DragState {
  axis: Axis;
  axisOrigin: THREE.Vector3;
  startProjection: number;
  startValue: number;
  hasMoved: boolean;
}

export function ObjectArrows({ fit, index }: Props) {
  const { camera, gl } = useThree();
  const { scene, updateObject, updateScene, setSelectedObjectIndex } = useSceneState();
  const isSingleHero = !!scene.heroAssetUrl;

  const dragState = useRef<DragState | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useCursor(hoveredKey !== null);

  const getCurrent = () => {
    if (isSingleHero) {
      return {
        x: scene.heroX ?? 0,
        z: scene.heroZ ?? 0,
        y: 0,
        rotation: scene.heroRotation ?? 0,
      };
    }
    const obj = scene.objects[index];
    return {
      x: obj?.x ?? 0,
      z: obj?.z ?? 0,
      y: obj?.y ?? 0,
      rotation: obj?.rotation ?? 0,
    };
  };

  const apply = (updates: Partial<{ x: number; y: number; z: number; rotation: number }>) => {
    if (isSingleHero) {
      updateScene({
        ...(updates.x !== undefined ? { heroX: updates.x } : {}),
        ...(updates.z !== undefined ? { heroZ: updates.z } : {}),
        ...(updates.rotation !== undefined ? { heroRotation: updates.rotation } : {}),
      });
    } else {
      updateObject(index, updates);
    }
  };

  // Project mouse onto axis line. Specialized for Y axis: use a vertical
  // plane that faces the camera (perpendicular to camera-right vector).
  // For X/Z: use the standard cross-product plane.
  const projectMouseOntoAxis = (mouse: THREE.Vector2, state: DragState): number => {
    const axisDir = AXIS_VECTORS[state.axis].clone();

    // Build a plane that contains the axis line. The plane should face the
    // camera as much as possible (so the cursor's screen position maps clearly
    // onto the axis).
    let planeNormal: THREE.Vector3;

    if (state.axis === "y") {
      // For Y, plane is vertical. Use camera's RIGHT vector as plane normal,
      // so the plane contains the Y axis and is perpendicular to where the
      // camera is looking horizontally. This avoids the singularity at the
      // top/bottom of the screen.
      const camRight = new THREE.Vector3();
      camera.matrixWorld.extractBasis(camRight, new THREE.Vector3(), new THREE.Vector3());
      planeNormal = camRight.clone().normalize();
    } else {
      // For X/Z: plane is the one most facing the camera that contains the axis
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      planeNormal = new THREE.Vector3()
        .crossVectors(axisDir, new THREE.Vector3().crossVectors(camDir, axisDir))
        .normalize();
      // Fallback if axis is parallel to view: use up vector
      if (!isFinite(planeNormal.x) || planeNormal.lengthSq() < 0.001) {
        planeNormal = new THREE.Vector3(0, 1, 0);
      }
    }

    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, state.axisOrigin);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, hit)) return state.startProjection;

    const offset = new THREE.Vector3().subVectors(hit, state.axisOrigin);
    return offset.dot(axisDir);
  };

  const startDrag = (axis: Axis, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    const cur = getCurrent();
    const axisOrigin = new THREE.Vector3(cur.x, cur.y, cur.z);

    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const tempState: DragState = {
      axis,
      axisOrigin,
      startProjection: 0,
      startValue: cur[axis],
      hasMoved: false,
    };
    tempState.startProjection = projectMouseOntoAxis(mouse, tempState);

    dragState.current = tempState;
    window.dispatchEvent(new CustomEvent("doodleverse:drag-start"));
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragState.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const projection = projectMouseOntoAxis(mouse, dragState.current);
      const delta = projection - dragState.current.startProjection;

      if (Math.abs(delta) > 0.01) dragState.current.hasMoved = true;

      const newValue = dragState.current.startValue + delta;
      const axis = dragState.current.axis;
      const finalValue = axis === "y" ? Math.max(0, newValue) : newValue;
      apply({ [axis]: finalValue });
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
  }, [scene, isSingleHero, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      if (e.code === "KeyR") {
        const cur = getCurrent();
        apply({ rotation: cur.rotation + ROTATE_STEP });
      } else if (e.code === "Escape") {
        setSelectedObjectIndex(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, isSingleHero, index]);

  // === Arrow positions in LOCAL space (inside the inner scaled group) ===
  // The model's actual center is at LOCAL (0, fit.worldSizeY * 0.5 / fit.scale, 0)
  // because the inner group offsets are designed to put the BASE at y=0.
  //
  // We compute half-extents in local units:
  const halfX = fit.worldSizeX * 0.5 / fit.scale;
  const halfY = fit.worldSizeY * 0.5 / fit.scale;
  const halfZ = fit.worldSizeZ * 0.5 / fit.scale;
  // Center of the model in LOCAL Y (model rests on y=0 in world, so its
  // center is at half its height)
  const centerY = halfY;

  // Arrow geometry — visible size in WORLD meters
  const SHAFT_LEN = 3 / fit.scale;
  const SHAFT_RADIUS = 0.1 / fit.scale;
  const TIP_LEN = 1.0 / fit.scale;
  const TIP_RADIUS = 0.35 / fit.scale;

  // Padding between model and arrow (so arrows don't poke INTO the model)
  const padding = 0.5 / fit.scale;

  return (
    <group position={[0, centerY, 0]}>
      {/* X (red): two arrows on left and right faces */}
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

      {/* Y (green): top and bottom */}
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

      {/* Z (blue): front and back */}
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