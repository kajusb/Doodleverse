"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import type { SceneJson } from "@/types/scene";
import {
  buildCollisionBoxes,
  findBlockingBox,
  findGroundUnder,
  findOverlappingBox,
} from "@/lib/collisions";

export function Controls({
  scene,
  speed = 5,
  eyeHeight = 1.6,
  jumpVelocity = 6,
  gravity = 18,
  stepUpHeight = 1.0,
}: {
  scene: SceneJson;
  speed?: number;
  eyeHeight?: number;
  jumpVelocity?: number;
  gravity?: number;
  stepUpHeight?: number;
}) {
  const keys = useRef<Record<string, boolean>>({});
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  // Separate from horizontal so movement still works while airborne
  const verticalVel = useRef(0);
  const onGround = useRef(true);

  // Build collision boxes once per scene
  const boxes = useMemo(() => buildCollisionBoxes(scene), [scene]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "Space" && onGround.current) {
        verticalVel.current = jumpVelocity;
        onGround.current = false;
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [jumpVelocity]);

  // Try to move along one axis. Returns true if the move succeeded.
  // If blocked by something tall, stops you. If blocked by something short,
  // gravity branch will lift up smoothly
  const tryMove = (
    camera: THREE.Camera,
    nx: number,
    nz: number,
    standingY: number,
  ): boolean => {
    const bodyY = camera.position.y - 0.5;

    // No obstacle at body height? Move freely.
    if (!findBlockingBox(boxes, nx, bodyY, nz)) {
      camera.position.x = nx;
      camera.position.z = nz;
      return true;
    }

    // Blocked at body height. Could we step up?
    const obstacle = findOverlappingBox(boxes, nx, nz);
    if (obstacle) {
      const stepHeight = obstacle.maxY - standingY;
      if (stepHeight > 0 && stepHeight <= stepUpHeight) {
        // Allow the move; gravity branch will ease the camera up.
        camera.position.x = nx;
        camera.position.z = nz;
        return true;
      }
    }

    return false;
  };

  useFrame((state, delta) => {
    const camera = state.camera;
    const k = keys.current;

    // Horizontal movement (axis-by-axis so we slide along walls)
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();

    let dx = 0;
    let dz = 0;
    if (k["KeyW"] || k["ArrowUp"])    { dx += forward.current.x; dz += forward.current.z; }
    if (k["KeyS"] || k["ArrowDown"])  { dx -= forward.current.x; dz -= forward.current.z; }
    if (k["KeyD"] || k["ArrowRight"]) { dx += right.current.x;   dz += right.current.z; }
    if (k["KeyA"] || k["ArrowLeft"])  { dx -= right.current.x;   dz -= right.current.z; }

    const len = Math.hypot(dx, dz);
    if (len > 0) {
      const boost = k["ShiftLeft"] || k["ShiftRight"] ? 2 : 1;
      const step = (speed * boost * delta) / len;
      dx *= step;
      dz *= step;

      const standingY = camera.position.y - eyeHeight;

      tryMove(camera, camera.position.x + dx, camera.position.z, standingY);
      tryMove(camera, camera.position.x, camera.position.z + dz, standingY);
    }

    // Vertical movement (jump + gravity, with smooth step-up onto objects)
    verticalVel.current -= gravity * delta;
    const newY = camera.position.y + verticalVel.current * delta;

    const support = findGroundUnder(
      boxes,
      camera.position.x,
      camera.position.z,
      camera.position.y,
    );
    const floor = support + eyeHeight;

    if (newY <= floor) {
      if (camera.position.y < floor && verticalVel.current <= 0) {
        // Stepping up onto a higher surface, ease the camera up
        const diff = floor - camera.position.y;
        // 0.12 = roughly 200ms to climb a small rock. Lower = slower.
        const t = 1 - Math.pow(1 - 0.12, delta * 60);
        if (diff < 0.02) {
          camera.position.y = floor;
        } else {
          camera.position.y += diff * t;
        }
        verticalVel.current = 0;
        onGround.current = true;
      } else {
        // Normal landing from above
        camera.position.y = floor;
        verticalVel.current = 0;
        onGround.current = true;
      }
    } else {
      camera.position.y = newY;
      onGround.current = false;
    }
  });

  return <PointerLockControls />;
}